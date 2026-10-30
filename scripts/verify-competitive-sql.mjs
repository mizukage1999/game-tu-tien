import fs from 'node:fs';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { createServer } from 'vite';
const db = new PGlite(),
  vite = await createServer({
    configFile: false,
    envFile: false,
    server: { middlewareMode: true, watch: null, hmr: false },
  });
let checks = 0;
const check = (value, label) => {
  assert.ok(value, label);
  checks++;
  console.log('PASS', label);
};
const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
const ids = [
  'a0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000003',
];
const instance = 'b0000000-0000-4000-8000-000000000001';
const identity = async (id) => {
  await db.exec('reset role');
  await scalar("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec('set role authenticated');
};
const ranked = (action = 'status', payload = {}) =>
  scalar('select public.game_ranked($1,$2,$3::jsonb)', [instance, action, JSON.stringify(payload)]);
const ready = async (id) => {
  await identity(ids[0]);
  await ranked('ready', { id });
  await identity(ids[1]);
  await ranked('ready', { id });
};
const expectFailure = async (fn, pattern) => {
  await assert.rejects(fn, pattern);
  checks++;
};
try {
  const { newPlayer } = await vite.ssrLoadModule('/src/store/gameStore.ts');
  await vite.close();
  await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;create table auth.users(id uuid primary key,email text,banned_until timestamptz,raw_user_meta_data jsonb default '{}',created_at timestamptz default now(),is_anonymous boolean default false);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('session_id','qa-session')$$;
 grant usage on schema auth to authenticated,anon,service_role;`);
  for (const f of ['schema', 'combat-expansion', 'single-session', 'alphatest-mail'])
    await db.exec(fs.readFileSync(`supabase/${f}.sql`, 'utf8'));
  await db.exec(`create table public.game_account_blocks(user_id uuid primary key references auth.users(id),reason text);
 create table public.game_admin_catalog(kind text,id text,data jsonb,primary key(kind,id));
 create function public.game_access_allowed(u uuid) returns boolean language sql as $$select u is not null$$;`);
  await db.exec(fs.readFileSync('supabase/admin-catalog.sql', 'utf8'));
  await db.exec(fs.readFileSync('supabase/leaderboard.sql', 'utf8'));
  const delivery = fs.readFileSync('supabase/admin-delivery.sql', 'utf8');
  await db.exec(
    delivery.slice(
      delivery.indexOf('create or replace function public.claim_game_mail('),
      delivery.indexOf('create or replace function public.game_access_allowed('),
    ),
  );
  const rankedSQL = fs.readFileSync('supabase/competitive-play.sql', 'utf8');
  await db.exec(rankedSQL);
  await db.exec(rankedSQL);
  const accessDefinition = await scalar(
    "select pg_get_functiondef('public.game_access_allowed(uuid)'::regprocedure)",
  );
  const upgrade = fs.readFileSync('supabase/competition-upgrade.sql', 'utf8');
  await db.exec(upgrade);
  await db.exec(upgrade);
  check(
    accessDefinition ===
      (await scalar("select pg_get_functiondef('public.game_access_allowed(uuid)'::regprocedure)")),
    'combined upgrade is repeatable and preserves installed maintenance/access rules',
  );
  for (const [i, id] of ids.entries()) {
    await db.exec('reset role');
    await db.query('insert into auth.users(id,email) values($1,$2)', [
      id,
      `qa${i}@example.invalid`,
    ]);
    const player = {
      ...newPlayer({ name: `Player${i}Hero` }),
      admitted: true,
      level: i === 2 ? 100 : 30,
      realmIndex: i === 2 ? 9 : 2,
      heroId: 'wang_lam',
      achievements: { bossKills: 0 },
    };
    await db.query('insert into public.saves(user_id,data) values($1,$2::jsonb)', [
      id,
      JSON.stringify({ v: 1, player, quests: {}, mapId: 'dai_thua_vien', pos: null, savedAt: 1 }),
    ]);
    await identity(id);
    check(await scalar('select public.claim_game_session($1)', [instance]), 'active session');
  }
  await identity(ids[0]);
  check((await ranked('join')).queue, 'first fighter queues');
  await identity(ids[2]);
  check((await ranked('join')).queue, 'distant realm does not steal a match');
  await ranked('leave');
  await identity(ids[1]);
  let page = await ranked('join'),
    mid = page.match.id;
  check(
    page.match.a.userId === ids[0] && page.match.b.userId === ids[1] && page.match.a.atk > 0,
    'pairing uses saved stats and distinct participants',
  );
  await expectFailure(() => ranked('report', { id: mid, winner: ids[0] }), /MATCH_NOT_STARTED/);
  await ready(mid);
  await ranked('report', { id: mid, winner: ids[0] });
  check((await ranked()).rating === 1000, 'one report does not award points');
  await identity(ids[0]);
  page = await ranked('report', { id: mid, winner: ids[0] });
  check(
    page.rating === 1020 &&
      page.wins === 1 &&
      !page.match &&
      page.result?.id === mid &&
      page.result?.winner === ids[0] &&
      page.result?.scored,
    'two matching reports settle once and return the authoritative result',
  );
  page = await ranked('report', { id: mid, winner: ids[0] });
  check(page.rating === 1020 && page.wins === 1, 'replayed report cannot double award');
  await identity(ids[1]);
  check((await ranked()).rating === 980, 'loser has matching deduction');
  for (let repeat = 0; repeat < 2; repeat++) {
    await identity(ids[0]);
    await ranked('join');
    await identity(ids[1]);
    page = await ranked('join');
    mid = page.match.id;
    await ready(mid);
    await ranked('report', { id: mid, winner: ids[0] });
    await identity(ids[0]);
    page = await ranked('report', { id: mid, winner: ids[0] });
  }
  check(page.rating === 1040 && page.wins === 2, 'third meeting has no score benefit');
  await ranked('join');
  await identity(ids[1]);
  page = await ranked('join');
  mid = page.match.id;
  await ready(mid);
  await ranked('report', { id: mid, winner: ids[1] });
  await identity(ids[0]);
  page = await ranked('report', { id: mid, winner: ids[0] });
  check(
    page.status === 'disputed' && page.rating === 1040,
    'conflicting reports do not change standings',
  );
  await ranked('join');
  await identity(ids[2]);
  check(
    (await ranked('report', { id: mid, winner: ids[2] })).rating === 1000,
    'nonparticipants cannot report another match',
  );
  await identity(ids[0]);
  await ranked('leave');
  await ranked('join');
  await identity(ids[1]);
  page = await ranked('join');
  mid = page.match.id;
  await ranked('leave');
  check(
    (await ranked()).status === 'cancelled',
    'leaving before both players enter does not count a loss',
  );
  await identity(ids[0]);
  await ranked('join');
  await identity(ids[1]);
  page = await ranked('join');
  mid = page.match.id;
  await ready(mid);
  await expectFailure(() => ranked('report', { id: mid, winner: ids[2] }), /INVALID_WINNER/);
  await ranked('leave');
  check((await ranked()).status === 'finished', 'leaving after both enter settles a forfeit');
  await identity(ids[0]);
  await ranked('join');
  await identity(ids[1]);
  page = await ranked('join');
  mid = page.match.id;
  await ready(mid);
  await db.exec('reset role');
  await db.query(
    'update game_competitive.matches set ready=jsonb_set(ready,array[$1],to_jsonb(extract(epoch from now())-31)) where id=$2',
    [ids[1], mid],
  );
  await identity(ids[0]);
  check(
    (await ranked('poll')).status === 'finished',
    'one active player can settle a disconnected opponent after 30 seconds',
  );
  await expectFailure(() => scalar('select * from game_competitive.ratings'), /permission denied/);
  await expectFailure(
    () => scalar("select public.game_ranked('00000000-0000-4000-8000-000000000000','join','{}')"),
    /SESSION_REPLACED/,
  );
  // Deterministic test clock at the beginning of a treasure window. All locks/timestamps remain real SQL.
  const epoch = Math.floor(Date.now() / 1000),
    seed = Math.floor((epoch + 25200) / 10800) * 10800 - 25200;
  const activitySQL = fs
    .readFileSync('supabase/world-activities.sql', 'utf8')
    .replace('epoch bigint:=floor(extract(epoch from now()))', `epoch bigint:=${seed + 60}`);
  await db.exec('reset role');
  await db.exec(activitySQL);
  await db.exec(activitySQL);
  const activity = (kind, action, slot = seed) =>
    scalar('select public.game_activity($1,$2,$3,$4)', [instance, kind, action, slot]);
  await identity(ids[0]);
  check(
    (await activity('treasure', 'status')).now === (seed + 60) * 1000,
    'event time comes from server',
  );
  await expectFailure(() => activity('treasure', 'start', seed - 10800), /ACTIVITY_CLOSED/);
  await activity('treasure', 'start');
  await expectFailure(() => activity('treasure', 'claim'), /GUARDIAN_REQUIRED/);
  await db.exec('reset role');
  await db.query(
    "update game_competitive.activity_entries set started_at=now()-interval '20 seconds' where user_id=$1",
    [ids[0]],
  );
  await db.query(
    "update public.saves set data=jsonb_set(jsonb_set(data,'{player,achievements,bossKills}','1'),'{player,activityVictories}',to_jsonb(array['treasure:'||$2::text])) where user_id=$1",
    [ids[0], seed],
  );
  await identity(ids[0]);
  await activity('treasure', 'capture');
  await expectFailure(() => activity('treasure', 'claim'), /CAPTURE_REQUIRED/);
  await db.exec('reset role');
  await db.query(
    "update game_competitive.activity_entries set capture_at=now()-interval '6 seconds' where user_id=$1",
    [ids[0]],
  );
  await identity(ids[0]);
  const prize = await activity('treasure', 'claim'),
    retry = await activity('treasure', 'claim');
  check(
    prize.mail === retry.mail && prize.winner === ids[0],
    'one global treasure winner and idempotent reward letter',
  );
  let claim = await scalar('select public.claim_game_mail($1,$2)', [prize.mail, instance]);
  check(
    claim.snapshot.player.inventory.linh_thach >= 150,
    'activity letter uses actual revision-safe inventory claim',
  );
  claim = await scalar('select public.claim_game_mail($1,$2)', [prize.mail, instance]);
  check(claim.already_claimed, 'mail cannot pay twice');
  await identity(ids[1]);
  await activity('treasure', 'start');
  await db.exec('reset role');
  await db.query(
    "update game_competitive.activity_entries set started_at=now()-interval '20 seconds',capture_at=now()-interval '6 seconds' where user_id=$1",
    [ids[1]],
  );
  await db.query(
    "update public.saves set data=jsonb_set(jsonb_set(data,'{player,achievements,bossKills}','1'),'{player,activityVictories}',to_jsonb(array['treasure:'||$2::text])) where user_id=$1",
    [ids[1], seed],
  );
  await identity(ids[1]);
  await expectFailure(() => activity('treasure', 'claim'), /TREASURE_TAKEN/);
  await expectFailure(
    () => scalar('select public.claim_game_mail($1,$2)', [prize.mail, instance]),
    /MAIL_NOT_FOUND/,
  );
  await db.exec('reset role');
  const ruinsSeed = seed + 3600;
  await db.exec(
    fs
      .readFileSync('supabase/world-activities.sql', 'utf8')
      .replace('epoch bigint:=floor(extract(epoch from now()))', `epoch bigint:=${ruinsSeed + 60}`),
  );
  await identity(ids[0]);
  await activity('ruins', 'start', ruinsSeed);
  await expectFailure(() => activity('ruins', 'cache0', ruinsSeed), /EXPLORATION_REQUIRED/);
  await db.exec('reset role');
  await db.query(
    "update game_competitive.activity_entries set started_at=now()-interval '20 seconds' where user_id=$1 and kind='ruins'",
    [ids[0]],
  );
  await identity(ids[0]);
  const firstCache = await activity('ruins', 'cache0', ruinsSeed),
    again = await activity('ruins', 'cache0', ruinsSeed),
    secondCache = await activity('ruins', 'cache1', ruinsSeed);
  check(
    firstCache.mail === again.mail && firstCache.mail !== secondCache.mail,
    'each ancient chest has its own idempotent mail receipt',
  );
  await db.exec('reset role');
  await db.query(
    "update public.saves set data=jsonb_set(data,'{player,achievements,bossKills}','2') where user_id=$1",
    [ids[0]],
  );
  await identity(ids[0]);
  await expectFailure(() => activity('ruins', 'claim', ruinsSeed), /GUARDIAN_REQUIRED/);
  await db.exec('reset role');
  await db.query(
    "update public.saves set data=jsonb_set(data,'{player,activityVictories}',to_jsonb(array['ruins:'||$2::text])) where user_id=$1",
    [ids[0], ruinsSeed],
  );
  await identity(ids[0]);
  const ancient = await activity('ruins', 'claim', ruinsSeed);
  check(
    ancient.mail !== firstCache.mail &&
      ancient.mail === (await activity('ruins', 'claim', ruinsSeed)).mail,
    'correct ancient guardian unlocks a distinct one-time final reward',
  );
  console.log(`Competitive SQL: ${checks} checks passed.`);
} catch (error) {
  console.error(error.message, error.where ?? '', error.query?.slice(0, 350) ?? '');
  process.exitCode = 1;
} finally {
  await vite.close();
  await db.close();
}
