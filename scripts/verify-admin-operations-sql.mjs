import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const { PGlite } = await import(
  pathToFileURL(
    path.resolve(
      process.argv[2] ?? 'node_modules/@electric-sql/pglite/dist/index.js',
    ),
  ).href
);
const db = new PGlite();
let checks = 0;
const admin = '10000000-0000-4000-8000-000000000001',
  user = '10000000-0000-4000-8000-000000000002',
  other = '10000000-0000-4000-8000-000000000003',
  instance = '20000000-0000-4000-8000-000000000001';
const check = (ok, label) => {
  assert.ok(ok, label);
  console.log('PASS', label);
  checks++;
};
const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
const identity = async (id, role = 'authenticated') => {
  await db.exec('reset role');
  await db.query(
    "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",
    [id ?? '', role],
  );
  await db.exec('set role ' + role);
};
const deny = async (sql, args, pattern, label) => {
  await assert.rejects(scalar(sql, args), pattern);
  check(true, label);
};
const snap = () => ({
  v: 1,
  savedAt: 5,
  mapId: 'dai_thua_vien',
  pos: null,
  quests: {},
  player: {
    name: 'Người Chơi',
    sex: 'male',
    heroId: 'wang_lam',
    admitted: true,
    level: 10,
    realmIndex: 0,
    hp: 100,
    mp: 100,
    exp: 0,
    linhKhi: 500,
    inventory: { linh_thach: 10, hoi_xuan_dan: 3 },
    equipment: {},
    dungeons: {
      day: '2026-10-28',
      runs: { tier_10_de: 4, tier_30_kho: 2 },
      clears: { tier_10_de: 1 },
    },
  },
});
const lease = () => scalar('select public.claim_game_session($1)', [instance]);
const read = async (id = user) => scalar('select public.admin_read_snapshot($1)', [id]);
const apply = async (kind, payload = {}, target = user, id = crypto.randomUUID(), token) =>
  scalar('select public.admin_apply_command($1,$2,$3,$4::jsonb,$5,$6,$7)', [
    id,
    kind,
    target,
    JSON.stringify(payload),
    'Kiểm tra admin',
    target ?? 'TOAN SERVER',
    token === undefined ? (target ? (await read(target)).token : null) : token,
  ]);
try {
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',created_at timestamptz default now(),is_anonymous boolean default false);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('session_id','test-session','role',current_setting('request.jwt.claim.role',true))$$;grant usage on schema auth to authenticated,anon,service_role;`);
  for (const file of [
    'schema',
    'combat-expansion',
    'single-session',
    'character-names',
    'admin-dashboard',
    'alphatest-mail',
    'admin-operations',
    'admin-catalog',
    'admin-delivery',
    'player-access',
  ])
    await db.exec(fs.readFileSync(`supabase/${file}.sql`, 'utf8'));
  for (const [id, name] of [
    [admin, 'admin'],
    [user, 'player'],
    [other, 'other'],
  ])
    await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3::jsonb)', [
      id,
      `${name}@players.tutien.invalid`,
      JSON.stringify({ username: name }),
    ]);
  await db.query('insert into public.game_admins(user_id) values($1)', [admin]);
  await db.query('insert into public.saves(user_id,data) values($1,$2::jsonb),($3,$4::jsonb)', [
    user,
    JSON.stringify(snap()),
    other,
    JSON.stringify({ ...snap(), player: { ...snap().player, name: 'Người Khác' } }),
  ]);
  await identity(user);
  await lease();
  await deny(
    'select public.admin_operations_status()',
    [],
    /ADMIN_REQUIRED/,
    'players cannot access server controls',
  );
  await deny(
    "select public.admin_apply_command($1,'maintenance',null,'{\"enabled\":true}','test','TOAN SERVER')",
    [crypto.randomUUID()],
    /ADMIN_REQUIRED/,
    'players cannot execute maintenance',
  );
  await deny(
    'select * from public.admin_commands',
    [],
    /permission denied/,
    'command receipts are private',
  );
  await identity(admin);
  const before = await read(),
    grantId = crypto.randomUUID();
  const delivery = await apply(
    'item_grant',
    { item: 'hoi_xuan_dan', quantity: 5 },
    user,
    grantId,
    before.token,
  );
  check(
    delivery.delivery === 'mail' && (await read()).snapshot.player.inventory.hoi_xuan_dan === 3,
    'grant creates a mail without changing inventory',
  );
  const retry = await apply(
    'item_grant',
    { item: 'hoi_xuan_dan', quantity: 5 },
    user,
    grantId,
    before.token,
  );
  check(
    retry.duplicate &&
      retry.mail === delivery.mail &&
      (await read()).snapshot.player.inventory.hoi_xuan_dan === 3,
    'same request sends only one letter and never credits the bag',
  );
  await deny(
    'select public.admin_apply_command($1,\'item_grant\',$2,\'{"item":"hoi_xuan_dan","quantity":9}\',\'Kiểm tra admin\',$2::uuid::text,$3)',
    [grantId, user, before.token],
    /REQUEST_CONFLICT/,
    'same id with changed content is rejected',
  );
  await identity(user);
  check(
    (await scalar('select public.check_game_session($1)', [instance])) === true,
    'sending a gift preserves the playing session',
  );
  await lease();
  const receipt = await scalar('select public.claim_game_mail($1,$2)', [delivery.mail, instance]);
  check(
    receipt.snapshot.player.inventory.hoi_xuan_dan === 8,
    'only claiming the letter credits inventory',
  );
  check(
    (await scalar('select public.claim_game_mail($1,$2)', [delivery.mail, instance]))
      .already_claimed,
    'claiming twice does not duplicate the gift',
  );
  await deny(
    'select public.save_game_snapshot($1,$2::jsonb)',
    [instance, JSON.stringify(snap())],
    /MAIL_REWARD_STALE/,
    'old cache cannot undo the claimed mail reward',
  );
  await identity(other);
  await lease();
  await deny(
    'select public.claim_game_mail($1,$2)',
    [delivery.mail, instance],
    /MAIL_NOT_FOUND/,
    'a player cannot claim another account gift',
  );
  await deny(
    'select public.admin_queue_item_mail($1,$2,$3,$4)',
    [crypto.randomUUID(), other, { item: 'hoi_xuan_dan', quantity: 5 }, 'not admin'],
    /permission denied/,
    'players cannot call the private gift queue directly',
  );
  await db.exec('reset role');
  await db.query(
    "update public.saves set data=jsonb_set(data,'{player,admitted}','false') where user_id=$1",
    [other],
  );
  await identity(admin);
  const childDelivery = await apply('item_grant', { item: 'linh_khi', quantity: 25 }, other);
  await identity(other);
  const childReceipt = await scalar('select public.claim_game_mail($1,$2)', [
    childDelivery.mail,
    instance,
  ]);
  check(
    !childReceipt.snapshot.player.admitted &&
      childReceipt.snapshot.player.linhKhi === 525 &&
      childReceipt.snapshot.player.level === 10,
    'admin mail can be received before admission without applying Alphatest levels or jade',
  );
  await identity(admin);
  let current = await read();
  await deny(
    'select public.admin_apply_command($1,\'item_remove\',$2,\'{"item":"hoi_xuan_dan","quantity":99}\',\'Kiểm tra admin\',$2::uuid::text,$3)',
    [crypto.randomUUID(), user, current.token],
    /INSUFFICIENT_ITEM/,
    'removing too much rolls back',
  );
  const gearDelivery = await apply('item_grant', { item: 'thanh_khe_kiem', quantity: 2 });
  await identity(user);
  await scalar('select public.claim_game_mail($1,$2)', [gearDelivery.mail, instance]);
  await identity(admin);
  current = await read();
  const swords = Object.keys(current.snapshot.player.inventory).filter((k) =>
    k.startsWith('thanh_khe_kiem~'),
  );
  check(
    swords.length === 2 && swords[0] !== swords[1],
    'grant creates separate physical equipment ids',
  );
  const worn = structuredClone(current.snapshot);
  worn.player.equipment.weapon = swords[0];
  worn.player.adventure = { enhancements: { [swords[0]]: 8 } };
  await apply('save_edit', { snapshot: worn });
  await apply('item_remove', { item: swords[0], quantity: 1 });
  current = await read();
  check(
    !current.snapshot.player.equipment.weapon &&
      !current.snapshot.player.adventure.enhancements[swords[0]] &&
      current.snapshot.player.inventory[swords[1]] === 1,
    'removal unequips only that instance and removes its enhancement',
  );
  const premiumDelivery = await apply('item_grant', { item: 'tien_phap_bao', quantity: 1 });
  await identity(user);
  check(
    !(await scalar('select public.premium_status()')).items.includes('tien_phap_bao'),
    'unclaimed premium mail grants no entitlement',
  );
  await lease();
  await scalar('select public.claim_game_mail($1,$2)', [premiumDelivery.mail, instance]);
  check(
    (await scalar('select public.premium_status()')).items.includes('tien_phap_bao'),
    'premium equipment grant records real server ownership',
  );
  await identity(admin);
  await apply('item_remove', { item: 'tien_phap_bao', quantity: 1 });
  await identity(user);
  check(
    !(await scalar('select public.premium_status()')).items.includes('tien_phap_bao'),
    'premium equipment removal revokes ownership',
  );
  await identity(admin);
  current = await read();
  const edited = structuredClone(current.snapshot);
  edited.player.level = 99;
  edited.player.realmIndex = 9;
  edited.player.linhKhi = 999999;
  await apply('save_edit', { snapshot: edited });
  check((await read()).snapshot.player.level === 99, 'save edit persists reviewed progress');
  await deny(
    "select public.admin_apply_command($1,'save_edit',$2,$3::jsonb,'Kiểm tra admin',$2::uuid::text,$4)",
    [crypto.randomUUID(), user, JSON.stringify({ snapshot: edited }), current.token],
    /SAVE_CONFLICT/,
    'save changes since preview are rejected',
  );
  const noVersion = structuredClone((await read()).snapshot);
  delete noVersion.v;
  await deny(
    "select public.admin_apply_command($1,'save_edit',$2,$3::jsonb,'Kiểm tra admin',$2::uuid::text,$4)",
    [crypto.randomUUID(), user, JSON.stringify({ snapshot: noVersion }), (await read()).token],
    /INVALID_ADMIN_SAVE/,
    'save editor rejects missing save version',
  );
  const badPremium = structuredClone((await read()).snapshot);
  badPremium.player.inventory.tien_phap_bao = 1;
  await deny(
    "select public.admin_apply_command($1,'save_edit',$2,$3::jsonb,'Kiểm tra admin',$2::uuid::text,$4)",
    [crypto.randomUUID(), user, JSON.stringify({ snapshot: badPremium }), (await read()).token],
    /PREMIUM_ENTITLEMENT_REQUIRED/,
    'save editor cannot forge premium ownership',
  );
  const backup = (await read()).backups[0];
  check(
    !!(await scalar('select public.admin_read_backup($1,$2)', [backup.command_id, user])).player,
    'admin can retrieve before-images through a checked RPC',
  );
  await identity(user);
  await deny(
    'select public.admin_read_backup($1,$2)',
    [backup.command_id, user],
    /ADMIN_REQUIRED/,
    'players cannot retrieve admin backups',
  );
  await identity(admin);
  const invalid = structuredClone((await read()).snapshot);
  invalid.player.name = 'Tên Khác';
  await deny(
    "select public.admin_apply_command($1,'save_edit',$2,$3::jsonb,'Kiểm tra admin',$2::uuid::text,$4)",
    [crypto.randomUUID(), user, JSON.stringify({ snapshot: invalid }), (await read()).token],
    /INVALID_ADMIN_SAVE/,
    'save editor cannot bypass unique character names',
  );
  await apply('dungeon_reset', { dungeon: 'tier_10_de' });
  current = await read();
  check(
    !current.snapshot.player.dungeons.runs.tier_10_de &&
      current.snapshot.player.dungeons.runs.tier_30_kho === 2 &&
      current.snapshot.player.dungeons.clears.tier_10_de === 1,
    'reset returns selected attempts without first-clear rewards',
  );
  await apply('dungeon_reset', { dungeon: 'all' }, null);
  check(
    Object.keys((await read(other)).snapshot.player.dungeons.runs).length === 0,
    'global dungeon reset updates every saved character',
  );
  await deny(
    'select public.admin_apply_command($1,\'boss_reset\',null,\'{"map":"missing","monster":"missing"}\',\'test\',\'TOAN SERVER\')',
    [crypto.randomUUID()],
    /INVALID_BOSS/,
    'boss reset accepts only deployed public-map bosses',
  );
  const status = await scalar('select public.admin_operations_status()');
  check(status.bosses.length > 0, 'server provides resettable boss catalog');
  const boss = status.bosses[0];
  await apply('boss_reset', { map: boss.map, monster: boss.monster }, null);
  await apply('boss_reset', { map: boss.map, monster: boss.monster }, null);
  await identity(user);
  check(
    (await scalar('select public.game_control_status($1)', [boss.map])).boss_resets[0].revision ===
      2,
    'boss resets publish monotonic durable revisions',
  );
  await lease();
  await identity(admin);
  await lease();
  await apply('maintenance', { enabled: true, message: 'Kiểm tra bảo trì' }, null);
  await identity(user);
  const notice = await scalar('select public.game_control_status()');
  check(
    notice.maintenance &&
      Date.parse(notice.maintenance_at) > Date.now() &&
      (await scalar('select public.check_game_session($1)', [instance])),
    'maintenance warns online players before closing access',
  );
  const waitMs = Date.parse(notice.maintenance_at) - Date.now();
  check(waitMs > 295000 && waitMs <= 301000, 'server schedules a real five-minute grace period');
  await db.exec('reset role');
  await db.exec(
    "update public.game_server_control set maintenance_at=clock_timestamp()-interval '1 second'",
  );
  await identity(user);
  check(
    (await scalar('select public.check_game_session($1)', [instance])) === false,
    'maintenance closes existing ordinary sessions',
  );
  await deny(
    'select public.claim_game_session($1)',
    [instance],
    /GAME_ACCESS_BLOCKED/,
    'maintenance blocks new ordinary logins',
  );
  check(
    (await scalar('select public.game_control_status()')).message === 'Kiểm tra bảo trì',
    'maintenance message is visible to authenticated players',
  );
  await identity(admin);
  check(
    (await scalar('select public.check_game_session($1)', [instance])) === false,
    'maintenance also revokes an already playing admin',
  );
  await deny(
    'select public.claim_game_session($1)',
    [crypto.randomUUID()],
    /GAME_ACCESS_BLOCKED/,
    'refreshing the game cannot give an admin a new session during maintenance',
  );
  await deny(
    'select public.save_game_snapshot($1,$2)',
    [instance, snap()],
    /SESSION_REPLACED/,
    'an admin cannot continue saving game progress after the deadline',
  );
  check(
    (await scalar('select public.admin_operations_status()')).maintenance === true,
    'the admin dashboard remains usable while its game session is blocked',
  );
  await apply('maintenance', { enabled: false, message: '' }, null);
  await identity(user);
  check(await lease(), 'players can log in again after maintenance');
  await identity(admin);
  const banId = crypto.randomUUID();
  const prep = (id, kind, target, payload = {}, confirm = target) =>
    scalar("select public.admin_prepare_auth($1,$2,$3,$4::jsonb,'Kiểm tra Auth',$5)", [
      id,
      kind,
      target,
      JSON.stringify(payload),
      confirm,
    ]);
  await deny(
    "select public.admin_prepare_auth($1,'auth_delete',$2,'{}','test',$2::uuid::text)",
    [crypto.randomUUID(), admin],
    /PROTECTED_ADMIN/,
    'cannot delete or lock an admin/self',
  );
  await prep(banId, 'auth_ban', user);
  await identity(user);
  check(
    (await scalar('select public.check_game_session($1)', [instance])) === false,
    'prepare ban immediately blocks a still-valid Auth token from playing',
  );
  await deny(
    'select public.admin_finish_auth($1)',
    [banId],
    /permission denied/,
    'browser clients cannot mark Auth work completed',
  );
  await identity(null, 'service_role');
  await scalar('select public.admin_finish_auth($1)', [banId]);
  await identity(admin);
  const unbanId = crypto.randomUUID();
  await prep(unbanId, 'auth_unban', user);
  await identity(null, 'service_role');
  await scalar('select public.admin_finish_auth($1)', [unbanId]);
  await identity(user);
  check(await lease(), 'successful Auth unban also releases game access');
  await identity(admin);
  const createId = crypto.randomUUID();
  const job = await prep(
    createId,
    'auth_create',
    null,
    { username: 'newuser', email: 'newuser@example.com' },
    '',
  );
  check(
    job.target === createId && job.status === 'pending',
    'Auth creation reserves a deterministic id for retries',
  );
  await db.exec('reset role');
  await db.query(
    'insert into auth.users(id,email,raw_user_meta_data) values($1,\'newuser@example.com\',\'{"username":"newuser"}\')',
    [createId],
  );
  await identity(null, 'service_role');
  await scalar('select public.admin_finish_auth($1)', [createId]);
  await identity(admin);
  check(
    (
      await prep(
        createId,
        'auth_create',
        null,
        { username: 'newuser', email: 'newuser@example.com' },
        '',
      )
    ).status === 'done',
    'completed Auth retries reuse the receipt',
  );
  const deleteId = crypto.randomUUID();
  await prep(deleteId, 'auth_delete', other);
  await db.exec('reset role');
  await db.query("insert into public.premium_ledger(user_id,delta,reason) values($1,7,'history')", [
    other,
  ]);
  await db.query('delete from auth.users where id=$1', [other]);
  check(
    Number(
      await scalar(
        "select count(*) from public.premium_ledger where user_id is null and reason='history'",
      ),
    ) === 1,
    'hard Auth deletion preserves financial audit and removes dependent game rows',
  );
  await identity(null, 'service_role');
  await scalar('select public.admin_finish_auth($1)', [deleteId]);
  await db.exec('reset role');
  check(
    Number(await scalar('select count(*) from public.admin_save_backups')) > 0,
    'mutations keep before-images for recovery',
  );
  await db.exec(fs.readFileSync('supabase/admin-operations.sql', 'utf8'));
  await db.exec(fs.readFileSync('supabase/admin-catalog.sql', 'utf8'));
  await identity(admin);
  check(
    (await read()).snapshot.player.level === 99,
    'rerunning migrations preserves edited saves and command receipts',
  );
  console.log(`Admin operations PostgreSQL checks: ${checks} passed.`);
} finally {
  await db.close();
}
