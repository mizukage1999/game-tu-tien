import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const vite = await createServer({
  configFile: false,
  envFile: false,
  server: { middlewareMode: true, watch: null, hmr: false },
});
let checks = 0;
const check = (condition, label) => {
  assert.ok(condition, label);
  checks++;
  console.log('PASS', label);
};
const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
const owner = '30000000-0000-4000-8000-000000000001',
  other = '30000000-0000-4000-8000-000000000002',
  third = '30000000-0000-4000-8000-000000000003';
const instance = '40000000-0000-4000-8000-000000000001';
const identity = async (id, role = 'authenticated') => {
  await db.exec('reset role');
  await scalar("select set_config('request.jwt.claim.sub',$1,false)", [id ?? '']);
  await db.exec('set role ' + role);
};
const board = (category = 'power', query = '', offset = 0, limit = 8) =>
  scalar('select public.game_leaderboard($1,$2,$3,$4,$5)', [
    instance,
    category,
    query,
    offset,
    limit,
  ]);
const put = (id, p) =>
  db.query(
    'insert into public.saves(user_id,data) values($1,$2::jsonb) on conflict(user_id) do update set data=excluded.data,updated_at=clock_timestamp()',
    [
      id,
      JSON.stringify({
        v: 1,
        savedAt: 1,
        player: p,
        quests: {},
        mapId: 'dai_thua_vien',
        pos: null,
      }),
    ],
  );
try {
  const { HEROES } = await vite.ssrLoadModule('/src/data/heroes.ts');
  const { heroDefaultLoadout } = await vite.ssrLoadModule('/src/data/heroSkills.ts');
  const { playerStats } = await vite.ssrLoadModule('/src/game/systems/progression.ts');
  const { buildInspection, parseInspection } = await vite.ssrLoadModule('/src/net/inspection.ts');
  const { adventure } = await vite.ssrLoadModule('/src/game/systems/adventure.ts');
  const { lifeProgress } = await vite.ssrLoadModule('/src/game/systems/life.ts');
  await vite.close();
  await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;create table auth.users(id uuid primary key,email text,banned_until timestamptz,raw_user_meta_data jsonb default '{}',created_at timestamptz default now(),is_anonymous boolean default false);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('session_id','test-session')$$;
 grant usage on schema auth to authenticated,anon,service_role;`);
  for (const f of ['schema', 'combat-expansion', 'single-session'])
    await db.exec(fs.readFileSync(`supabase/${f}.sql`, 'utf8'));
  await db.exec('grant select on public.saves to authenticated');
  await db.exec(
    'create table public.game_account_blocks(user_id uuid primary key references auth.users(id) on delete cascade,reason text)',
  );
  for (let i = 1; i <= 64; i++)
    await db.query('insert into auth.users(id,email) values($1,$2)', [
      `30000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      `private-${i}@not-public.invalid`,
    ]);
  const base = (name = 'Đạo Hữu', level = 30) => ({
    name,
    heroId: 'wang_lam',
    sex: 'male',
    admitted: true,
    level,
    realmIndex: Math.floor((level - 1) / 10),
    exp: 0,
    hp: 200,
    mp: 100,
    linhKhi: 123456,
    inventory: { SECRET_BAG: 7 },
    equipment: {},
    achievements: { bossKills: 0 },
  });
  await put(owner, base('Lục Trần', 99));
  await db.exec(fs.readFileSync('supabase/leaderboard.sql', 'utf8'));
  check(
    (await scalar('select count(*) from game_rank_private.entries')) === 1,
    'migration backfills saved offline characters',
  );
  let parity = 0;
  for (let i = 0; i < 64; i++) {
    const hero = HEROES[i % 8],
      level = [1, 10, 11, 30, 61, 99, 110, 120][Math.floor(i / 8)],
      uid = `30000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`;
    const p = {
      ...base(`Nhân Vật ${i}`, level),
      heroId: hero.id,
      sex: hero.sex,
      skillLoadout: heroDefaultLoadout(hero.id),
      equipment: {
        weapon: `weapon_orange${Math.floor(i / 8) % 2 ? `_${hero.id}` : ''}~fixture-${i}`,
        armor: 'armor_purple',
        helmet: 'helmet_blue',
        amulet: 'amulet_green',
      },
      origin: 'vuong_gia_thon',
      admitted: i >= 8,
    };
    p.adventure = {
      ...adventure(p),
      boundSect: i % 2 ? 'linh_son_tong' : 'dai_thua_vien',
      contribution: i * 27,
      reputation: i * 45,
      enhancements: { [p.equipment.weapon]: i % 13, armor_purple: (i + 3) % 13 },
      evolution: { snow_fox: i % 3 },
    };
    p.life = {
      ...lifeProgress(p),
      companion: 'snow_fox',
      companions: { snow_fox: { rank: 1 + (i % 5), bond: 30 } },
      artifact: i % 4 === 0 ? 'phap_bao_ngoc' : null,
    };
    const expected = buildInspection(p, playerStats(p), {}, 'dai_thua_vien', uid);
    await put(uid, p);
    const actual = await scalar('select entry from game_rank_private.entries where user_id=$1', [
      uid,
    ]);
    assert.deepEqual(
      actual.inspection.stats,
      expected.stats,
      `stats match ${hero.id} level ${level}`,
    );
    assert.equal(
      actual.inspection.power,
      expected.power,
      `power matches ${hero.id} level ${level}`,
    );
    assert.ok(
      parseInspection(actual.inspection),
      `valid public inspection ${hero.id} level ${level}`,
    );
    assert.deepEqual(
      actual.inspection.skills.map((s) => s.id).sort(),
      expected.skills.map((s) => s.id).sort(),
      `allowed skill ids match ${hero.id} level ${level}`,
    );
    assert.deepEqual(
      actual.inspection.skills
        .filter((s) => s.equipped)
        .map((s) => s.id)
        .sort(),
      expected.skills
        .filter((s) => s.equipped)
        .map((s) => s.id)
        .sort(),
      `loadout matches ${hero.id} level ${level}`,
    );
    assert.equal(JSON.stringify(actual).includes('SECRET_BAG'), false);
    parity++;
  }
  check(
    parity === 64,
    'SQL stats, power, skills and inspection validation match the game across all 8 heroes and 8 level milestones',
  );
  await db.exec('delete from public.saves');
  check(
    (await scalar('select count(*) from game_rank_private.entries')) === 0,
    'deleting saves removes obsolete ranking entries',
  );
  await put(owner, {
    ...base('Lục Trần', 99),
    achievements: { bossKills: 2 },
    dungeons: { clears: { tier_30_de: 4 } },
    life: { companions: { snow_fox: { rank: 2 } }, companion: 'snow_fox' },
  });
  await put(other, {
    ...base('Bạch Nguyệt', 80),
    achievements: { bossKills: 5 },
    dungeons: { clears: { tier_30_de: 8 } },
  });
  await put(third, base('Thanh Trúc', 70));
  await identity(owner);
  await scalar('select public.claim_game_session($1)', [instance]);
  let b = await board('level');
  check(
    b.total === 3 && b.top.length === 3 && b.rows.length === 3,
    'one bounded request includes online and offline players',
  );
  check(
    b.rows[0].entry.id === owner && b.self.rank === 1,
    'global rank and the caller position are returned',
  );
  b = await board('level', 'thanh truc');
  check(
    b.total === 1 && b.rows[0].rank === 3 && b.top[0].rank === 1 && b.self.rank === 1,
    'search preserves global ranks, top three, and own position',
  );
  b = await board('level', '', 1, 1);
  check(b.rows.length === 1 && b.rows[0].rank === 2, 'server pagination preserves global rank');
  b = await board('boss');
  check(
    b.rows[0].entry.id === other && b.rows[0].entry.bossKills === 5 && b.total === 2,
    'boss board orders recorded victories and excludes unrecorded zero achievements',
  );
  b = await board('dungeons');
  check(b.rows[0].entry.id === other, 'dungeon board ranks saved clears');
  check((await board('pets')).total === 1, 'spirit beast board uses saved owned companions');
  check(
    (await board('elements')).supported === false,
    'unimplemented five-elements statistics remain explicitly unavailable',
  );
  check(
    (await board('power', "%' or 1=1 --")).total === 0,
    'search text cannot inject SQL or expand wildcard matches',
  );
  check(
    (await board('level', '', -2, 999)).rows.length === 3 &&
      (await board('level', '', 0, 999)).limit === 20,
    'pagination inputs are bounded',
  );
  const leaked = JSON.stringify(await board());
  check(
    !/SECRET_BAG|private-\d+@|inventory|linhKhi|wallet|password|auth_session|instance_id/.test(
      leaked,
    ),
    'public payload contains no bag, currency, email, auth tokens or raw save',
  );
  await assert.rejects(scalar('select * from game_rank_private.entries'), /permission denied/);
  check(true, 'client cannot read private leaderboard cache directly');
  await assert.rejects(scalar('select * from game_rank_private.balance'), /permission denied/);
  check(true, 'client cannot alter or inspect the private balance catalog');
  await assert.rejects(
    scalar("select public.game_leaderboard($1,'power')", [crypto.randomUUID()]),
    /SESSION_REPLACED/,
  );
  check(true, 'replaced sessions cannot query the board');
  await assert.rejects(board('power; drop table public.saves'), /INVALID_RANKING_CATEGORY/);
  check(true, 'sort column is selected only from the server whitelist');
  await identity(null, 'anon');
  await assert.rejects(board(), /permission denied/);
  check(true, 'anonymous role has no leaderboard RPC access');
  await identity(owner);
  check(
    (await scalar('select count(*) from public.saves')) === 1,
    'original owner-only save access remains intact',
  );
  await db.exec('reset role');
  await db.query('insert into public.game_account_blocks values($1,$2)', [other, 'test block']);
  await identity(owner);
  check(
    (await board()).population === 2,
    'blocked accounts are hidden without requiring another login',
  );
  await db.exec('reset role');
  await db.query('delete from public.game_account_blocks where user_id=$1', [other]);
  await db.query(
    "update auth.users set banned_until=current_timestamp+interval '1 day' where id=$1",
    [other],
  );
  await identity(owner);
  check((await board()).population === 2, 'Auth-banned accounts are hidden');
  await db.exec('reset role');
  await db.query('update auth.users set banned_until=null where id=$1', [other]);
  await put(third, base('Thanh Trúc', 120));
  await identity(owner);
  check(
    (await board('level')).top[0].entry.id === third,
    'saved progression changes the ranking immediately',
  );
  await db.exec('reset role');
  await db.query('delete from auth.users where id=$1', [third]);
  await identity(owner);
  check((await board('level')).population === 2, 'deleting an Auth account removes its rank');
  await db.exec('reset role');
  await put(other, {
    ...base('Malformed', 30),
    life: { companions: 'bad' },
    equipment: [],
    skills: [],
    dungeons: { clears: 'bad' },
  });
  check(
    !!parseInspection(
      (await scalar('select entry from game_rank_private.entries where user_id=$1', [other]))
        .inspection,
    ),
    'legacy or malformed optional fields do not break saving or public profiles',
  );
  const premium = { ...base('Premium', 80), equipment: { amulet: 'tien_phap_bao' } };
  await put(other, premium);
  const beforePremium = await scalar(
    'select power from game_rank_private.entries where user_id=$1',
    [other],
  );
  await db.query(
    "insert into public.premium_entitlements(user_id,item_id) values($1,'tien_phap_bao')",
    [other],
  );
  const withPremium = await scalar('select power from game_rank_private.entries where user_id=$1', [
    other,
  ]);
  check(
    withPremium > beforePremium,
    'granting a real premium entitlement refreshes an offline player without changing the save',
  );
  await db.query('delete from public.premium_entitlements where user_id=$1', [other]);
  check(
    (await scalar('select power from game_rank_private.entries where user_id=$1', [other])) ===
      beforePremium,
    'revoking a premium entitlement removes unowned equipment stats immediately',
  );
  await put(other, { ...base('Tie', 99) });
  await put(owner, { ...base('Tie owner', 99) });
  await identity(owner);
  check(
    (await board('level')).rows.map((v) => v.entry.id).join(',') === [owner, other].join(','),
    'equal scores use level then stable player identity as the tie breaker',
  );
  await scalar('select public.save_game_snapshot($1,$2)', [
    instance,
    {
      v: 1,
      savedAt: 1,
      player: base('Snapshot', 120),
      quests: {},
      mapId: 'dai_thua_vien',
      pos: null,
    },
  ]);
  check(
    (await board('level')).self.entry.inspection.level === 120,
    'the existing authenticated save RPC updates the leaderboard through its private trigger',
  );
  await db.exec('reset role');
  await db.exec(fs.readFileSync('supabase/leaderboard.sql', 'utf8'));
  check(
    (await scalar('select count(*) from game_rank_private.entries')) === 2,
    'migration is repeatable without duplicating players or changing saves',
  );
  console.log(`${checks} leaderboard SQL checks passed.`);
} catch (error) {
  console.error(
    error.message,
    error.detail ?? '',
    error.where ?? '',
    error.stack
      ?.split('\n')
      .filter((line) => line.includes('verify-leaderboard'))
      .join('\n') ?? '',
  );
  process.exitCode = 1;
} finally {
  await vite.close();
  await db.close();
}
