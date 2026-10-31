import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { PGlite } from '@electric-sql/pglite';
const vite = await createServer({
    configFile: false,
    envFile: false,
    server: { middlewareMode: true, watch: null, hmr: false },
  }),
  db = new PGlite();
let checks = 0;
const check = (condition, label) => {
  assert.ok(condition, label);
  checks++;
  console.log('PASS', label);
};
const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
const a = 'a1000000-0000-4000-8000-000000000001',
  b = 'a1000000-0000-4000-8000-000000000002',
  instance = 'b1000000-0000-4000-8000-000000000001';
const identity = async (id) => {
  await db.exec('reset role');
  await scalar("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec('set role authenticated');
};
const rpc = (action = 'status', payload = {}) =>
  scalar('select public.game_sky_race($1,$2,$3::jsonb)', [
    instance,
    action,
    JSON.stringify(payload),
  ]);
const fail = async (fn, pattern) => {
  await assert.rejects(fn, pattern);
  checks++;
};
try {
  const { SkyRaceEngine, skyWeek } = await vite.ssrLoadModule('/src/game/systems/skyRace.ts');
  const { newPlayer } = await vite.ssrLoadModule('/src/store/gameStore.ts');
  await vite.close();
  const fly = (seed, slow = false) => {
    const r = new SkyRaceEngine(seed);
    while (r.phase === 'flying') {
      const g = r.gates[r.gate];
      const target = slow && r.gate === 0 && r.misses < 2 ? (g.x >= 0 ? -1 : 1) : (g?.x ?? r.x);
      r.step(Math.max(-1, Math.min(1, (target - r.x) / 0.022)), !slow && r.elapsed % 7000 === 0);
    }
    return r;
  };
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,email text,banned_until timestamptz,raw_user_meta_data jsonb default '{}',created_at timestamptz default now(),is_anonymous boolean default false);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('session_id','sky-test')$$;
 grant usage on schema auth to authenticated,anon,service_role;`);
  for (const name of ['schema', 'combat-expansion', 'single-session', 'leaderboard'])
    await db.exec(fs.readFileSync(`supabase/${name}.sql`, 'utf8'));
  const sql = fs.readFileSync('supabase/sky-race.sql', 'utf8');
  await db.exec(sql);
  await db.exec(sql);
  for (let i = 0; i < 16; i++) {
    const r = fly(skyWeek().seed + i * 604800, i % 3 === 0);
    assert.equal(r.phase, 'finished');
    const p = await scalar('select game_competitive.sky_replay($1,$2::jsonb)', [
      r.seed,
      JSON.stringify(r.inputs),
    ]);
    assert.deepEqual(p, {
      score: r.score,
      elapsed: r.elapsed,
      penalty: r.penalty,
      energy: r.energy,
      hits: r.hits,
    });
  }
  check(
    true,
    'Postgres replay exactly matches game physics, gates, boosts, shields, pickups and penalties over 16 weekly tracks',
  );
  await fail(
    () => scalar('select game_competitive.sky_replay(1,$1::jsonb)', ['[]']),
    /REPLAY_INVALID/,
  );
  await fail(
    () => scalar('select game_competitive.sky_replay(1,$1::jsonb)', ['[[1001,0,1]]']),
    /REPLAY_INVALID/,
  );
  await fail(
    () => scalar('select game_competitive.sky_replay(1,$1::jsonb)', ['[[0,0,120]]']),
    /REPLAY_INCOMPLETE/,
  );
  for (const id of [a, b]) {
    await db.query('insert into auth.users(id,email) values($1,$2)', [id, `${id}@example.invalid`]);
    await db.query('insert into public.saves(user_id,data) values($1,$2::jsonb)', [
      id,
      JSON.stringify({
        v: 1,
        player: {
          ...newPlayer({ name: id === a ? 'Thiên Quan A' : 'Thiên Quan B' }),
          admitted: true,
          level: 30,
        },
        quests: {},
        mapId: 'dai_thua_vien',
      }),
    ]);
    await identity(id);
    await scalar('select public.claim_game_session($1)', [instance]);
    await db.exec('reset role');
  }
  await identity(a);
  let page = await rpc();
  check(
    page.rows.length === 0 && page.seed === skyWeek().seed,
    'weekly board has real server week and no fake entries',
  );
  page = await rpc('start');
  const run = page.run,
    r = fly(run.seed);
  await fail(() => rpc('finish', { id: run.id, inputs: r.inputs, score: 1 }), /RUN_TOO_FAST/);
  await db.exec('reset role');
  await db.query(
    "update game_competitive.sky_runs set started_at=now()-interval '2 minutes' where user_id=$1",
    [a],
  );
  await identity(a);
  page = await rpc('finish', { id: run.id, inputs: r.inputs, score: 1 });
  check(
    page.result.score === r.score && page.self.score === r.score,
    'server ignores a claimed score and computes the valid replay result',
  );
  const again = await rpc('finish', { id: run.id, inputs: [] });
  check(
    again.rows.length === 1 && again.self.score === r.score,
    'retries do not duplicate the record or overwrite the accepted result',
  );
  page = await rpc('start');
  const slow = fly(page.run.seed, true),
    slowId = page.run.id;
  assert.ok(slow.score > r.score);
  await db.exec('reset role');
  await db.query(
    "update game_competitive.sky_runs set started_at=now()-interval '2 minutes' where user_id=$1",
    [a],
  );
  await identity(a);
  page = await rpc('finish', { id: slowId, inputs: slow.inputs });
  check(
    page.self.score === r.score && page.result.score === slow.score,
    'a slower finish preserves the best weekly run',
  );
  await identity(b);
  await fail(() => rpc('finish', { id: slowId, inputs: slow.inputs }), /RUN_EXPIRED/);
  await fail(() => scalar('select * from game_competitive.sky_best'), /permission denied/);
  await fail(() => scalar("select game_competitive.sky_replay(1,'[]')"), /permission denied/);
  await fail(
    () =>
      scalar("select public.game_sky_race('00000000-0000-4000-8000-000000000000','start','{}')"),
    /SESSION_REPLACED/,
  );
  page = await rpc('start');
  const expired = page.run.id;
  await db.exec('reset role');
  await db.query(
    "update game_competitive.sky_runs set started_at=now()-interval '6 minutes' where user_id=$1",
    [b],
  );
  await identity(b);
  await fail(() => rpc('finish', { id: expired, inputs: r.inputs }), /RUN_EXPIRED/);
  page = await rpc('start');
  await rpc('cancel', { id: page.run.id });
  await fail(() => rpc('finish', { id: page.run.id, inputs: r.inputs }), /RUN_EXPIRED/);
  await db.exec('reset role');
  await db.query("update auth.users set banned_until=now()+interval '1 day' where id=$1", [a]);
  await identity(b);
  check((await rpc()).rows.length === 0, 'Auth-banned racers disappear from the public board');
  await db.exec('reset role');
  await db.query(
    "update public.saves set data=jsonb_set(data,'{player,admitted}','false') where user_id=$1",
    [b],
  );
  await identity(b);
  await fail(() => rpc('start'), /RUN_ADMISSION_REQUIRED/);
  console.log(`Sky race SQL: ${checks} checks passed.`);
} catch (e) {
  console.error(e.message, e.where ?? '');
  process.exitCode = 1;
} finally {
  await vite.close();
  await db.close();
}
