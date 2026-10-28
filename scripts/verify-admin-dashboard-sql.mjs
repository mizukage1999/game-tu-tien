import { pathToFileURL } from 'node:url';
import path from 'node:path';
const { PGlite } = await import(
  pathToFileURL(
    path.resolve(
      process.argv[2] ?? '.preview/admin-db-test/node_modules/@electric-sql/pglite/dist/index.js',
    ),
  ).href
);
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db = new PGlite();
let count = 0;
const admin = '10000000-0000-4000-8000-000000000001',
  player = '10000000-0000-4000-8000-000000000002',
  guest = '10000000-0000-4000-8000-000000000003';
const check = (condition, label) => {
  assert.ok(condition, label);
  console.log('PASS', label);
  count++;
};
const scalar = async (sql, args = []) => {
  const r = await db.query(sql, args);
  return Object.values(r.rows[0])[0];
};
const identity = async (id, role = 'authenticated') => {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? '']);
  await db.exec('set role ' + role);
};
try {
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',created_at timestamptz default now(),is_anonymous boolean default false);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`,
  );
  for (const file of [
    'supabase/schema.sql',
    'supabase/combat-expansion.sql',
    'supabase/admin-dashboard.sql',
  ])
    await db.exec(fs.readFileSync(file, 'utf8'));
  await db.query(
    `insert into auth.users(id,email,raw_user_meta_data,is_anonymous) values($1,'admin@players.tutien.invalid','{"username":"admin"}',false),($2,'player@example.com','{"username":"player"}',false),($3,null,'{}',true)`,
    [admin, player, guest],
  );
  await db.query('insert into public.game_admins(user_id) values($1)', [admin]);
  await db.query(`insert into public.saves(user_id,data) values($1,$2::jsonb),($3,$4::jsonb)`, [
    player,
    JSON.stringify({
      player: {
        name: 'Đạo Hữu',
        heroId: 'hong_lien',
        level: 20,
        realmIndex: 1,
        inventory: { linh_chi: 5 },
        equipment: {},
      },
      quests: { main_0: { status: 'done', progress: [1] } },
      mapId: 'vuong_gia_thon',
    }),
    guest,
    JSON.stringify({
      player: { name: 'Khách nhỏ', level: 'bad', realmIndex: -99, inventory: {} },
      quests: {},
    }),
  ]);
  await db.query("update public.saves set updated_at=now()-interval '1 hour' where user_id=$1", [
    guest,
  ]);
  await identity(player);
  check(
    (await scalar('select public.is_game_admin()')) === false,
    'ordinary account has no admin role',
  );
  for (const sql of [
    'select public.admin_dashboard_overview()',
    'select public.admin_dashboard_accounts()',
    'select public.admin_dashboard_logs()',
    'select public.admin_dashboard_plans()',
    `select public.admin_dashboard_account('${admin}')`,
    `select public.admin_save_event_plan(gen_random_uuid(),0,'bad event','',null,null,null,'draft')`,
  ]) {
    await assert.rejects(() => db.query(sql), /ADMIN_REQUIRED/);
    check(true, 'non-admin blocked: ' + sql.slice(7, 49));
  }
  for (const table of [
    'admin_account_directory',
    'admin_log_directory',
    'admin_event_plans',
    'admin_audit_logs',
  ]) {
    await assert.rejects(() => db.query('select * from public.' + table), /permission denied/);
    check(true, 'direct access denied: ' + table);
  }
  await identity(null, 'anon');
  await assert.rejects(
    () => db.query('select public.admin_dashboard_overview()'),
    /permission denied/,
  );
  check(true, 'anonymous cannot execute admin RPC');
  await identity(admin);
  const overview = await scalar('select public.admin_dashboard_overview()');
  check(
    overview.accounts === 3 && overview.characters === 2 && overview.recent === 1,
    'overview uses real account/save counts',
  );
  const accounts = await scalar('select public.admin_dashboard_accounts($1,$2,$3,$4)', [
    'Đạo Hữu',
    'all',
    0,
    8,
  ]);
  check(
    accounts.total === 1 && accounts.rows[0].id === player,
    'search finds real character owner',
  );
  const malformed = await scalar('select public.admin_dashboard_account($1)', [guest]);
  check(
    malformed.account.level === 1 && malformed.account.realm_index === 0,
    'malformed saved progression does not break dashboard',
  );
  const detail = await scalar('select public.admin_dashboard_account($1)', [player]);
  check(
    detail.inventory.linh_chi === 5 && detail.quests.main_0.status === 'done',
    'account inspection reads inventory and quest snapshot',
  );
  const empty = await scalar('select public.admin_dashboard_accounts($1,$2,$3,$4)', [
    '%',
    'all',
    0,
    8,
  ]);
  check(empty.total === 0, 'search text does not act as wildcard SQL');
  const beyond = await scalar('select public.admin_dashboard_accounts($1,$2,$3,$4)', [
    '',
    'all',
    100,
    8,
  ]);
  check(beyond.total === 3 && beyond.rows.length === 0, 'empty page retains exact total');
  const request = '20000000-0000-4000-8000-000000000001';
  await scalar('select public.admin_grant_tien_ngoc($1,$2,$3,$4)', [
    'player',
    200,
    'QA grant',
    request,
  ]);
  await scalar('select public.admin_grant_tien_ngoc($1,$2,$3,$4)', [
    'player',
    200,
    'QA grant',
    request,
  ]);
  const wallet = await scalar('select public.admin_dashboard_account($1)', [player]);
  check(wallet.account.balance === 200, 'same request key cannot credit wallet twice');
  const logs = await scalar('select public.admin_dashboard_logs()');
  check(
    logs.rows.length === 1 &&
      logs.rows[0].delta === 200 &&
      logs.rows[0].target === 'player' &&
      logs.rows[0].actor === 'admin',
    'logs reflect actual grant actor, target and amount',
  );
  const planId = '30000000-0000-4000-8000-000000000001';
  const args = [
    planId,
    0,
    'Kế hoạch săn boss',
    'Nội dung thử nghiệm',
    null,
    null,
    'linh_thu_lam',
    'draft',
  ];
  const created = await scalar(
    'select public.admin_save_event_plan($1,$2,$3,$4,$5,$6,$7,$8)',
    args,
  );
  check(
    created.version === 1 && created.status === 'draft',
    'event planner saves a draft with no gameplay activation',
  );
  args[1] = 1;
  args[2] = 'Kế hoạch đã sửa';
  await scalar('select public.admin_save_event_plan($1,$2,$3,$4,$5,$6,$7,$8)', args);
  await assert.rejects(
    () => scalar('select public.admin_save_event_plan($1,$2,$3,$4,$5,$6,$7,$8)', args),
    /PLAN_CONFLICT/,
  );
  check(true, 'stale editor cannot overwrite a newer event plan');
  args[1] = 2;
  args[7] = 'archived';
  const archived = await scalar(
    'select public.admin_save_event_plan($1,$2,$3,$4,$5,$6,$7,$8)',
    args,
  );
  check(
    archived.version === 3 && archived.status === 'archived',
    'archiving preserves the plan and audit history',
  );
  const audit = await scalar('select public.admin_dashboard_logs($1,$2)', ['', 'event_plan']);
  check(audit.total === 3, 'every successful plan mutation has an audit row');
  await db.exec('reset role');
  await db.exec(
    `insert into auth.users(id,email) select gen_random_uuid(),'extra'||n||'@example.com' from generate_series(1,70) n`,
  );
  await identity(admin);
  const capped = await scalar('select public.admin_dashboard_accounts($1,$2,$3,$4)', [
    '',
    'all',
    0,
    99999,
  ]);
  check(capped.rows.length === 50 && capped.total === 73, 'server enforces bounded pagination');
  console.log('SQL QA COMPLETE', count);
} finally {
  await db.close();
}
