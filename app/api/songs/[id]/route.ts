import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabase';

function getUserId(session: Session | null) {
  if (!session?.user) return '';
  return (session.user as { id?: string }).id ?? session.user.email ?? '';
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = getServerSupabase();
  const { data, error } = await sb.from('songs').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const userId = await getUserId(session);
  if (data.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return NextResponse.json({ song: data });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = await getUserId(session);
  const body = await req.json();

  const sb = getServerSupabase();
  const { data: existing } = await sb.from('songs').select('user_id').eq('id', id).single();
  if (!existing || existing.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.measures !== undefined) updates.measures = body.measures;
  if (body.lyrics !== undefined) updates.lyrics = body.lyrics;

  const { data, error } = await sb.from('songs').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ song: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = await getUserId(session);
  const sb = getServerSupabase();

  const { data: existing } = await sb.from('songs').select('user_id').eq('id', id).single();
  if (!existing || existing.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await sb.from('songs').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
