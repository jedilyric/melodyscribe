import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as { id?: string }).id ?? session.user.email!;
  const type = req.nextUrl.searchParams.get('type');

  const sb = getServerSupabase();
  let query = sb.from('songs').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (type) query = query.eq('type', type);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ songs: data });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as { id?: string }).id ?? session.user.email!;
  const body = await req.json();

  const sb = getServerSupabase();
  const { data, error } = await sb
    .from('songs')
    .insert({
      user_id: userId,
      name: body.name,
      type: body.type,
      key: body.key,
      tempo: body.tempo,
      time_signature: body.time_signature,
      measures: body.measures,
      lyrics: body.lyrics ?? '',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ song: data }, { status: 201 });
}
