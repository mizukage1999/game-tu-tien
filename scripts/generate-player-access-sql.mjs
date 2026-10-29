import fs from 'node:fs';
const readFunction = (source, name) => {
  const start = source.indexOf(`create or replace function public.${name}(`),
    end = source.indexOf('$$;', start);
  if (start < 0 || end < 0) throw Error(`Missing ${name}`);
  return source.slice(start, end + 3);
};
const admin = fs.readFileSync('supabase/admin-operations.sql', 'utf8');
const names = fs.readFileSync('supabase/character-names.sql', 'utf8');
const sql = `-- Upgrade existing servers: five-minute maintenance blocks all game accounts, plus six-character minimum for new names.
-- Requires admin-delivery.sql and character-names.sql. No save/name backfill or automatic maintenance toggle.
begin;
alter table public.game_server_control add column if not exists maintenance_at timestamptz;
${['game_access_allowed', 'claim_game_session', 'check_game_session', 'save_game_snapshot', 'delete_game_snapshot', 'game_control_status', 'admin_operations_status', 'admin_apply_command'].map((n) => readFunction(admin, n)).join('\n\n')}

${['claim_character_name', 'guard_character_save_name'].map((n) => readFunction(names, n)).join('\n\n')}

revoke all on function public.game_access_allowed(uuid),public.guard_character_save_name() from public,anon,authenticated;
revoke all on function public.claim_game_session(uuid),public.check_game_session(uuid),public.save_game_snapshot(uuid,jsonb),public.delete_game_snapshot(uuid),public.claim_character_name(text,uuid) from public,anon;
grant execute on function public.claim_game_session(uuid),public.check_game_session(uuid),public.save_game_snapshot(uuid,jsonb),public.delete_game_snapshot(uuid),public.claim_character_name(text,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
`;
fs.writeFileSync('supabase/player-access.sql', sql);
console.log('Generated supabase/player-access.sql');
