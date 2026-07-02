import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export async function getUserFromRequest(req: NextRequest) {
  const token = req.headers.get('Authorization')?.split(' ')[1];
  if (!token) return null;

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key',
  );

  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return null;
  return user;
}
