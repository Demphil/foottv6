// The anon key is safe to expose in frontend code for read-only access when Supabase RLS is enabled.
// Inject SUPABASE_PUBLIC_URL and SUPABASE_ANON_KEY at deploy time; never use the service-role key here.
window.__SUPABASE_CONFIG__ = window.__SUPABASE_CONFIG__ || {
  url: window.SUPABASE_PUBLIC_URL || 'https://vzgldruuinbwslrfwjkb.supabase.co',
  anonKey: window.SUPABASE_ANON_KEY || ''
};
