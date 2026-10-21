import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, onlineEnabled } from './config';

/**
 * Null in offline builds. Everything that talks to the network must handle that,
 * so the game still boots with no Supabase project configured.
 */
export const supabase: SupabaseClient | null = onlineEnabled
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // No OAuth redirect flow: everything happens in-app.
        detectSessionInUrl: false,
      },
    })
  : null;
