import { Song } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const KEY = 'melodyscribe_songs';

export function getSongs(): Song[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Song[];
  } catch {
    return [];
  }
}

export function saveSong(song: Song): Song {
  const songs = getSongs();
  const now = new Date().toISOString();
  const saved: Song = {
    ...song,
    id: song.id ?? uuidv4(),
    created_at: song.created_at ?? now,
    updated_at: now,
  };
  const idx = songs.findIndex(s => s.id === saved.id);
  if (idx >= 0) songs[idx] = saved;
  else songs.unshift(saved);
  localStorage.setItem(KEY, JSON.stringify(songs));
  return saved;
}

export function deleteSong(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(getSongs().filter(s => s.id !== id)));
}

export function renameSong(id: string, name: string): void {
  localStorage.setItem(
    KEY,
    JSON.stringify(
      getSongs().map(s => s.id === id ? { ...s, name, updated_at: new Date().toISOString() } : s),
    ),
  );
}
