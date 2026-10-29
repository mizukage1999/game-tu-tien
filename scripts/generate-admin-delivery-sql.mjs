import fs from 'node:fs';
const source = fs.readFileSync('supabase/admin-operations.sql', 'utf8');
const names = [
  'game_access_allowed',
  'claim_game_session',
  'check_game_session',
  'save_game_snapshot',
  'delete_game_snapshot',
  'game_control_status',
  'admin_operations_status',
  'admin_apply_command',
];
const functions = names
  .map((name) => {
    const start = source.indexOf(`create or replace function public.${name}(`);
    const end = source.indexOf('$$;', start);
    if (start < 0 || end < 0) throw Error(`Missing function ${name}`);
    return source.slice(start, end + 3);
  })
  .join('\n\n');
const template = fs.readFileSync('scripts/sql/admin-delivery.template.sql', 'utf8');
fs.writeFileSync(
  'supabase/admin-delivery.sql',
  template.replace('-- @CONTROL_FUNCTIONS@', () => functions),
);
console.log('Generated supabase/admin-delivery.sql');
