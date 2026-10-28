export interface AuthJob {
  id: string;
  kind: string;
  target: string;
  status: string;
  payload: { username?: string; email?: string };
  result?: unknown;
}
export interface AuthAccount {
  email?: string;
  username?: string;
  command?: string;
}
export interface AuthGateway {
  authorize(token: string): Promise<boolean>;
  prepare(token: string, args: Record<string, unknown>): Promise<AuthJob>;
  getUser(id: string): Promise<AuthAccount | null>;
  create(
    id: string,
    username: string,
    email: string,
    password: string,
    command: string,
  ): Promise<void>;
  ban(id: string, blocked: boolean): Promise<void>;
  remove(id: string): Promise<void>;
  finish(id: string): Promise<unknown>;
}
const uuid = (s: unknown): s is string =>
  typeof s === 'string' && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(s);
/** Dependency-injected so auth, ownership and retry paths can be tested without production users. */
export function authHandler(gateway: AuthGateway) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
  const reply = (status: number, data: unknown) =>
    new Response(JSON.stringify(data), { status, headers });
  return async (request: Request) => {
    if (request.method === 'OPTIONS') return reply(200, { ok: true });
    if (request.method !== 'POST') return reply(405, { error: 'METHOD_NOT_ALLOWED' });
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    try {
      if (!token || !(await gateway.authorize(token)))
        return reply(403, { error: 'ADMIN_REQUIRED' });
      const raw = await request.text();
      if (raw.length > 12000) return reply(400, { error: 'INVALID_AUTH_COMMAND' });
      const body = JSON.parse(raw) as Record<string, unknown>;
      const { id, kind, target, reason, confirm, password } = body;
      if (
        !uuid(id) ||
        typeof kind !== 'string' ||
        !['auth_create', 'auth_delete', 'auth_ban', 'auth_unban'].includes(kind) ||
        typeof reason !== 'string' ||
        reason.trim().length < 3 ||
        reason.length > 500
      )
        return reply(400, { error: 'INVALID_AUTH_COMMAND' });
      let safe: Record<string, string> = {};
      if (kind === 'auth_create') {
        const username = typeof body.username === 'string' ? body.username.trim() : '';
        const email =
          typeof body.email === 'string' && body.email.trim()
            ? body.email.trim().toLowerCase()
            : `${username.toLowerCase()}@players.tutien.invalid`;
        if (
          !/^[\p{L}\p{N}_.]{3,16}$/u.test(username) ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
          typeof password !== 'string' ||
          password.length < 8 ||
          password.length > 128
        )
          return reply(400, { error: 'INVALID_AUTH_INPUT' });
        safe = { username, email };
      } else if (!uuid(target) || confirm !== target)
        return reply(400, { error: 'CONFIRMATION_REQUIRED' });
      const job = await gateway.prepare(token, {
        p_id: id,
        p_kind: kind,
        p_user: kind === 'auth_create' ? null : target,
        p_payload: safe,
        p_reason: reason,
        p_confirm: confirm ?? '',
      });
      if (job.status === 'done') return reply(200, job.result);
      const existing = await gateway.getUser(job.target);
      if (kind === 'auth_create') {
        if (existing) {
          if (
            existing.command !== id ||
            existing.email !== safe.email ||
            existing.username !== safe.username
          )
            throw new Error('REQUEST_CONFLICT');
        } else {
          try {
            await gateway.create(job.target, safe.username, safe.email, password as string, id);
          } catch {
            // Two retries may race the same deterministic Auth id. Reconcile the result.
            const created = await gateway.getUser(job.target);
            if (created?.command !== id || created.email !== safe.email)
              throw new Error('AUTH_API_FAILED');
          }
        }
      } else if (kind === 'auth_delete') {
        if (existing) await gateway.remove(job.target);
      } else {
        if (!existing) throw new Error('ACCOUNT_NOT_FOUND');
        await gateway.ban(job.target, kind === 'auth_ban');
      }
      return reply(200, await gateway.finish(id));
    } catch (error) {
      const message = String((error as { message?: string })?.message ?? '');
      const code =
        [
          'ADMIN_REQUIRED',
          'PROTECTED_ADMIN',
          'CONFIRMATION_REQUIRED',
          'REQUEST_CONFLICT',
          'USERNAME_UNAVAILABLE',
          'ACCOUNT_NOT_FOUND',
          'INVALID_AUTH_COMMAND',
        ].find((c) => message.includes(c)) ?? 'AUTH_OPERATION_PENDING';
      return reply(code === 'ADMIN_REQUIRED' ? 403 : 409, { error: code });
    }
  };
}
