import fs from 'node:fs';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
let checks = 0;
const admin = '50000000-0000-4000-8000-000000000001',
  first = '50000000-0000-4000-8000-000000000002',
  second = '50000000-0000-4000-8000-000000000003',
  legacy = '50000000-0000-4000-8000-000000000004',
  instance = '60000000-0000-4000-8000-000000000001';
const check = (ok, label) => {
  assert.ok(ok, label);
  checks++;
  console.log('PASS', label);
};
const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
const identity = async (id) => {
  await db.exec('reset role');
  await scalar(
    "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role','authenticated',false)",
    [id],
  );
  await db.exec('set role authenticated');
};
const lease = () => scalar('select public.claim_game_session($1)', [instance]);
const snapshot = (name) => ({
  v: 1,
  savedAt: 1,
  mapId: 'vuong_gia_thon',
  pos: null,
  quests: {},
  player: {
    name,
    level: 1,
    realmIndex: 0,
    exp: 0,
    hp: 342,
    mp: 132,
    linhKhi: 0,
    inventory: {},
    equipment: {},
  },
});
const save = (name) =>
  scalar('select public.save_game_snapshot($1,$2)', [instance, snapshot(name)]);
const claim = (name) => scalar('select public.claim_character_name($1,$2)', [name, instance]);
const apply = (enabled) =>
  scalar('select public.admin_apply_command($1,$2,$3,$4,$5,$6,$7)', [
    crypto.randomUUID(),
    'maintenance',
    null,
    { enabled, message: 'Bảo trì sau 5 phút' },
    'Kiểm tra bảo trì',
    'TOAN SERVER',
    null,
  ]);
try {
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',created_at timestamptz default now(),is_anonymous boolean default false);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('session_id','test-session','role',current_setting('request.jwt.claim.role',true))$$;
 grant usage on schema auth to authenticated,anon,service_role;`);
  for (const file of ['schema', 'combat-expansion', 'single-session'])
    await db.exec(fs.readFileSync(`supabase/${file}.sql`, 'utf8'));
  for (const id of [admin, first, second, legacy])
    await db.query('insert into auth.users(id) values($1)', [id]);
  // A short name legitimately saved before the new creation policy must survive this upgrade.
  await db.query('insert into public.saves(user_id,data) values($1,$2)', [legacy, snapshot('An')]);
  for (const file of [
    'character-names',
    'admin-dashboard',
    'alphatest-mail',
    'admin-operations',
    'admin-catalog',
    'admin-delivery',
  ])
    await db.exec(fs.readFileSync(`supabase/${file}.sql`, 'utf8'));
  await db.query('insert into public.game_admins(user_id) values($1)', [admin]);
  // Reproduce a stale session migration having overwritten the access-aware RPCs.
  await db.exec(fs.readFileSync('supabase/single-session.sql', 'utf8'));
  await db.exec(fs.readFileSync('supabase/player-access.sql', 'utf8'));
  await identity(first);
  await lease();
  await assert.rejects(claim('12345'), /INVALID_CHARACTER_NAME/);
  check(true, 'new reservations reject fewer than six characters on the server');
  await assert.rejects(claim('   Thanh   '), /INVALID_CHARACTER_NAME/);
  check(true, 'name length is checked after trimming whitespace');
  check(
    (await claim('  Thiên   Hà  ')) === 'Thiên Hà',
    'a custom Vietnamese name is normalized and reserved',
  );
  check(await save('Thiên Hà'), 'a player can create a character with the chosen name');
  await identity(second);
  await lease();
  await assert.rejects(claim('thiên hà'), /CHARACTER_NAME_TAKEN/);
  check(true, 'custom names remain unique across accounts ignoring case');
  await assert.rejects(save('Short'), /INVALID_CHARACTER_NAME/);
  check(true, 'an older client cannot bypass the minimum through the save RPC');
  check((await claim('123456')) === '123456', 'exactly six characters are accepted');
  check(await save('123456'), 'a valid second player can be saved');
  await identity(legacy);
  await lease();
  check(await save('An'), 'legacy short names keep their progress and can still save');
  await identity(admin);
  await lease();
  await apply(true);
  const status = await scalar('select public.game_control_status()');
  const remaining = Date.parse(status.maintenance_at) - Date.now();
  check(
    status.maintenance && remaining > 295000 && remaining <= 301000,
    'the actual server deadline is five minutes after enabling maintenance',
  );
  check(
    await scalar('select public.check_game_session($1)', [instance]),
    'an admin game session remains playable during the warning period',
  );
  await identity(first);
  check(await lease(), 'players can still enter before the deadline');
  await db.exec('reset role');
  await db.exec(
    "update public.game_server_control set maintenance_at=clock_timestamp()-interval '1 second'",
  );
  for (const [id, label] of [
    [first, 'player'],
    [admin, 'admin'],
  ]) {
    await identity(id);
    check(
      (await scalar('select public.check_game_session($1)', [instance])) === false,
      `${label} loses its existing game lease after the deadline`,
    );
    await assert.rejects(lease(), /GAME_ACCESS_BLOCKED/);
    check(true, `${label} cannot reclaim a session on refresh during maintenance`);
    await assert.rejects(save('123456'), /SESSION_REPLACED/);
    check(true, `${label} cannot keep writing game saves during maintenance`);
  }
  await identity(admin);
  check(
    (await scalar('select public.admin_operations_status()')).maintenance,
    'the admin dashboard stays available without an active game lease',
  );
  await apply(false);
  check(await lease(), 'an admin can reopen the server and then enter the game');
  await identity(first);
  check(await lease(), 'ordinary players can reconnect after the server reopens');
  await db.exec('reset role');
  const before = await scalar('select data from public.saves where user_id=$1', [legacy]);
  await db.exec(fs.readFileSync('supabase/player-access.sql', 'utf8'));
  assert.deepEqual(
    await scalar('select data from public.saves where user_id=$1', [legacy]),
    before,
  );
  check(true, 'repeating the upgrade does not rename or rewrite existing characters');
  console.log(`${checks} player access SQL checks passed.`);
} catch (error) {
  console.error(error.message, error.detail ?? '', error.where ?? '');
  process.exitCode = 1;
} finally {
  await db.close();
}
