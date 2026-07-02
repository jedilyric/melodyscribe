import { createClient } from '@supabase/supabase-js';

// Server-side client with service role key — only use in API routes
export function getServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-key',
    { auth: { persistSession: false } },
  );
}
