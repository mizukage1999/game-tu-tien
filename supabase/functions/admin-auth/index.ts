import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { authHandler, type AuthGateway } from './handler.ts';
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};
const url = Deno.env.get('SUPABASE_URL')!,
  key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  anon = Deno.env.get('SUPABASE_ANON_KEY')!;
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const caller = (token: string) =>
  createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
const gateway: AuthGateway = {
  async authorize(token) {
    const client = caller(token);
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return false;
    const role = await client.rpc('is_game_admin');
    return !role.error && role.data === true;
  },
  async prepare(token, args) {
    const { data, error } = await caller(token).rpc('admin_prepare_auth', args);
    if (error) throw error;
    return data;
  },
  async getUser(id) {
    const { data, error } = await admin.auth.admin.getUserById(id);
    if (error) {
      if (error.status === 404) return null;
      throw new Error('AUTH_API_FAILED');
    }
    return data.user
      ? {
          email: data.user.email,
          username: data.user.user_metadata.username,
          command: data.user.app_metadata.admin_command,
        }
      : null;
  },
  async create(id, username, email, password, command) {
    const { error } = await admin.auth.admin.createUser({
      id,
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
      app_metadata: { admin_command: command },
    });
    if (error) throw new Error('AUTH_API_FAILED');
  },
  async ban(id, blocked) {
    const { error } = await admin.auth.admin.updateUserById(id, {
      ban_duration: blocked ? '876000h' : 'none',
    });
    if (error) throw new Error('AUTH_API_FAILED');
  },
  async remove(id) {
    const { error } = await admin.auth.admin.deleteUser(id, false);
    if (error && error.status !== 404) throw new Error('AUTH_API_FAILED');
  },
  async finish(id) {
    const { data, error } = await admin.rpc('admin_finish_auth', { p_id: id });
    if (error) throw error;
    return data;
  },
};
Deno.serve(authHandler(gateway));
