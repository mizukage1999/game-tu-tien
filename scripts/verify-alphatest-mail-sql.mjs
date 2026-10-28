// Optional isolated PostgreSQL check: pass the path to @electric-sql/pglite/dist/index.js.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const { PGlite } = await import(
  pathToFileURL(
    path.resolve(
      process.argv[2] ?? '.preview/admin-db-test/node_modules/@electric-sql/pglite/dist/index.js',
    ),
  ).href
);
const db = new PGlite();
const admin = '10000000-0000-4000-8000-000000000001',
  a = '10000000-0000-4000-8000-000000000002',
  b = '10000000-0000-4000-8000-000000000003',
  c = '10000000-0000-4000-8000-000000000004';
const instance = '20000000-0000-4000-8000-000000000001',
  other = '20000000-0000-4000-8000-000000000002';
let count = 0;
const check = (ok, label) => {
  assert.ok(ok, label);
  console.log('PASS', label);
  count++;
};
const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
const identity = async (id, role = 'authenticated', session = 'session-a') => {
  await db.exec('reset role');
  await db.query(
    "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.session_id',$2,false)",
    [id ?? '', session],
  );
  await db.exec('set role ' + role);
};
const denied = async (sql, args, pattern, label) => {
  await assert.rejects(scalar(sql, args), pattern);
  check(true, label);
};
const snapshot = (admitted = false, level = 10) => ({
  v: 1,
  savedAt: 10,
  mapId: 'thanh_khe_tran',
  pos: { x: 22, y: 44 },
  quests: { village_9: { status: admitted ? 'done' : 'active', progress: [1] } },
  player: {
    name: 'Đạo Hữu',
    sex: 'male',
    heroId: 'vuong_lam',
    origin: 'vuong_gia_thon',
    admitted,
    level,
    realmIndex: level > 99 ? 10 : 0,
    exp: 123,
    hp: 100,
    mp: 50,
    linhKhi: 70,
    inventory: { linh_thach: 25, linh_chi: 3 },
    equipment: {},
  },
});
const save = async (s) =>
  scalar('select public.save_game_snapshot($1,$2::jsonb)', [instance, JSON.stringify(s)]);
const inbox = async (rev = 0) => scalar('select public.game_mail_inbox($1)', [rev]);
const claim = async (id, inst = instance) =>
  scalar('select public.claim_alphatest_mail($1,$2)', [id, inst]);
try {
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',created_at timestamptz default now(),is_anonymous boolean default false);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('session_id',nullif(current_setting('request.jwt.claim.session_id',true),''))$$;
 grant usage on schema auth to authenticated,anon;grant execute on function auth.uid(),auth.jwt() to authenticated,anon;`);
  for (const file of [
    'schema',
    'combat-expansion',
    'single-session',
    'admin-dashboard',
    'alphatest-mail',
  ])
    await db.exec(fs.readFileSync(`supabase/${file}.sql`, 'utf8'));
  for (const id of [admin, a, b, c]) await db.query('insert into auth.users(id) values($1)', [id]);
  await db.query('insert into public.game_admins(user_id) values($1)', [admin]);
  await identity(null, 'anon');
  await denied(
    'select public.game_mail_inbox()',
    [],
    /permission denied/,
    'anonymous visitors cannot issue mail',
  );
  await identity(a);
  let box = await inbox(),
    mail = box.mails[0];
  check(
    box.mails.length === 1 && !box.admitted,
    'login issues one letter before a character exists',
  );
  check((await inbox()).mails[0].id === mail.id, 'repeat login never issues a second package');
  await scalar('select public.claim_game_session($1)', [instance]);
  await save(snapshot());
  await denied(
    'select public.claim_alphatest_mail($1,$2)',
    [mail.id, instance],
    /ADMISSION_REQUIRED/,
    'claim is locked until admission',
  );
  await denied(
    'select public.admin_alphatest_status()',
    [],
    /ADMIN_REQUIRED/,
    'ordinary players cannot manage campaign',
  );
  await denied(
    'select * from public.game_mail',
    [],
    /permission denied/,
    'mail table cannot be modified or browsed directly',
  );
  await save(snapshot(true));
  await denied(
    'select public.claim_alphatest_mail($1,$2)',
    [mail.id, other],
    /SESSION_REPLACED/,
    'old browser instance cannot claim',
  );
  await identity(a, 'authenticated', 'session-b');
  await denied(
    'select public.claim_alphatest_mail($1,$2)',
    [mail.id, instance],
    /SESSION_REPLACED/,
    'another auth session cannot reuse an instance',
  );
  await identity(a);
  const result = await claim(mail.id),
    p = result.snapshot.player;
  check(
    p.level === 99 && p.realmIndex === 9 && p.exp === 0,
    'claim promotes to level 99 with no extra EXP overshoot',
  );
  check(
    p.linhKhi === 1000069 && p.inventory.linh_thach === 100024 && p.inventory.linh_chi === 3,
    'resources are added and other inventory survives',
  );
  check(
    result.premium.balance === 99999 && p.mailRevision === 1 && !!result.mail.claimed_at,
    'wallet, snapshot and claim receipt commit together',
  );
  let needed = 0;
  for (let n = 10; n < 99; n++) needed += Math.round(300 + 120 * n ** 1.65 + 15 * n * n);
  await db.exec('reset role');
  check(
    Number(
      await scalar("select (receipt->>'exp_applied')::bigint from public.game_mail where id=$1", [
        mail.id,
      ]),
    ) ===
      needed - 123,
    'EXP receipt matches the game progression formula',
  );
  await identity(a);
  const repeated = await claim(mail.id);
  check(
    repeated.already_claimed &&
      repeated.premium.balance === 99999 &&
      repeated.snapshot.player.inventory.linh_thach === 100024,
    'retry never credits any part of the package twice',
  );
  await denied(
    'select public.save_game_snapshot($1,$2::jsonb)',
    [instance, JSON.stringify(snapshot(true))],
    /MAIL_REWARD_STALE/,
    'delayed pre-reward autosave cannot erase rewards',
  );
  const after = structuredClone(result.snapshot);
  after.player.inventory.linh_chi = 5;
  await save(after);
  check(
    (await claim(mail.id)).snapshot.player.inventory.linh_chi === 5,
    'ordinary post-reward UPSERT saves still work',
  );
  box = await inbox(0);
  check(
    box.snapshot.player.mailRevision === 1 && box.premium.balance === 99999,
    'lost claim response can recover committed save and wallet',
  );
  check(
    (await inbox(1)).snapshot === null,
    'current clients do not rehydrate old progress on every inbox refresh',
  );
  await identity(b);
  await scalar('select public.claim_game_session($1)', [instance]);
  await denied(
    'select public.claim_alphatest_mail($1,$2)',
    [mail.id, instance],
    /MAIL_NOT_FOUND/,
    'another account cannot claim someone else’s letter',
  );
  const bmail = (await inbox()).mails[0];
  await save(snapshot(true, 110));
  await identity(admin);
  let campaign = await scalar('select public.admin_alphatest_status()');
  check(
    campaign.delivered === 2 && campaign.claimed === 1,
    'admin sees real delivered and claimed counts',
  );
  await scalar('select public.admin_set_alphatest_delivery(false,$1)', [campaign.version]);
  await denied(
    'select public.admin_set_alphatest_delivery(true,$1)',
    [campaign.version],
    /CAMPAIGN_CONFLICT/,
    'stale admin toggle is rejected',
  );
  await identity(c);
  check((await inbox()).mails.length === 0, 'closed campaign stops new delivery');
  await identity(b);
  const high = await claim(bmail.id);
  check(
    high.snapshot.player.level === 110 &&
      high.snapshot.player.exp === 123 &&
      high.snapshot.player.realmIndex === 10,
    'issued mail stays claimable while closed and never downgrades high levels',
  );
  await db.exec('reset role');
  await db.exec(fs.readFileSync('supabase/alphatest-mail.sql', 'utf8'));
  await identity(c);
  check((await inbox()).mails.length === 0, 'rerunning migration preserves disabled campaign');
  await identity(admin);
  campaign = await scalar('select public.admin_alphatest_status()');
  await scalar('select public.admin_set_alphatest_delivery(true,$1)', [campaign.version]);
  await identity(c);
  const cmail = (await inbox()).mails[0];
  await scalar('select public.claim_game_session($1)', [instance]);
  await save(snapshot(true));
  // Force the ledger insert to fail; the whole reward transaction must roll back.
  await db.exec('reset role');
  await db.query(
    "insert into public.premium_ledger(user_id,delta,reason,request_id) values($1,0,'test conflict',$2)",
    [c, cmail.id],
  );
  await identity(c);
  await denied(
    'select public.claim_alphatest_mail($1,$2)',
    [cmail.id, instance],
    /duplicate key/,
    'partial reward failures are atomic',
  );
  check(
    (await scalar('select public.premium_status()')).balance === 0 &&
      !(await inbox()).mails[0].claimed_at,
    'failed claim leaves wallet and letter unchanged',
  );
  await db.exec('reset role');
  check(
    (await scalar('select data from public.saves where user_id=$1', [c])).player.level === 10,
    'failed claim also restores EXP, inventory and level',
  );
  await identity(a);
  await scalar('select public.delete_game_snapshot($1)', [instance]);
  await save(snapshot(true));
  check(
    (await inbox()).mails.length === 1 &&
      !!(await inbox()).mails[0].claimed_at &&
      (await claim(mail.id)).premium.balance === 99999,
    'character reset does not reset account gift eligibility',
  );
  console.log(`Alphatest PostgreSQL checks: ${count} passed.`);
} finally {
  await db.close();
}
