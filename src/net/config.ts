/** Supabase project settings. Both are public values (the anon key is meant for browsers). */
const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

export const SUPABASE_URL = url;
export const SUPABASE_ANON_KEY = anonKey;

/**
 * False when the project was built without Supabase credentials. The game then
 * stays fully offline and keeps saving to localStorage, exactly like before.
 */
export const onlineEnabled = url.length > 0 && anonKey.length > 0;
