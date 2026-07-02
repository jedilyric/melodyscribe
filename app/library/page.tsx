'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Music, Upload, Download, Trash2, Pencil, Check, X,
  ChevronDown, Library, Calendar, Clock, Key,
} from 'lucide-react';
import SheetMusic, { SheetMusicHandle } from '@/components/SheetMusic';
import { Song } from '@/types';
import { transposeMeasures } from '@/lib/noteUtils';
import { generatePDF } from '@/lib/pdfGenerator';
import { getSongs, deleteSong, renameSong } from '@/lib/storage';

const DOWNLOAD_KEYS = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab', 'Db'];

interface SongCardProps {
  song: Song;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

function SongCard({ song, onDelete, onRename }: SongCardProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(song.name);
  const [showPreview, setShowPreview] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const sheetRef = useRef<SheetMusicHandle>(null);
  const isKeyboard = song.type === 'keyboard';

  function saveRename() {
    if (editName.trim() && editName !== song.name) onRename(song.id!, editName.trim());
    setEditing(false);
  }

  async function downloadPdf(targetKey: string) {
    setShowDownloadMenu(false);
    // Ensure the hidden SheetMusic has rendered
    await new Promise(r => setTimeout(r, 100));
    const svgEl = sheetRef.current?.getSvgElement();
    if (!svgEl) return;
    const transposed = targetKey !== song.key ? transposeMeasures(song.measures, song.key, targetKey) : song.measures;
    await generatePDF({ title: song.name, key: song.key, targetKey, tempo: song.tempo, timeSignature: song.time_signature, measures: transposed, lyrics: song.lyrics, svgElement: svgEl });
  }

  return (
    <div className={`rounded-2xl border ${confirmDelete ? 'border-rose-500/50' : 'border-border'} bg-card overflow-hidden transition-all`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-4 pb-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${isKeyboard ? 'bg-accent/20' : 'bg-emerald-500/20'}`}>
            {isKeyboard ? <Music size={14} className="text-accent-light" /> : <Upload size={14} className="text-emerald-400" />}
          </div>
          {editing ? (
            <div className="flex items-center gap-1.5 flex-1">
              <input
                autoFocus
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setEditing(false); }}
                className="flex-1 rounded-md border border-border bg-surface px-2 py-1 text-sm text-text-primary focus:border-accent focus:outline-none"
              />
              <button onClick={saveRename} className="text-emerald-400 hover:text-emerald-300"><Check size={14} /></button>
              <button onClick={() => setEditing(false)} className="text-muted hover:text-text-secondary"><X size={14} /></button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="group flex items-center gap-1.5 min-w-0 text-left">
              <span className="text-sm font-semibold text-text-primary truncate">{song.name}</span>
              <Pencil size={12} className="text-muted opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="relative">
            <button onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:border-accent/50 transition-colors">
              <Download size={12} />PDF<ChevronDown size={10} />
            </button>
            {showDownloadMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 rounded-xl border border-border bg-surface shadow-xl py-1.5 z-50">
                <div className="px-3 py-1 text-xs text-muted">Choose key</div>
                {DOWNLOAD_KEYS.map(k => (
                  <button key={k} onClick={() => downloadPdf(k)}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-card transition-colors ${k === song.key ? (isKeyboard ? 'text-accent-light' : 'text-emerald-400') : 'text-text-secondary'}`}>
                    {k}{k === song.key ? ' (original)' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => confirmDelete ? onDelete(song.id!) : setConfirmDelete(true)}
            className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${confirmDelete ? 'border-rose-500/50 bg-rose-500/15 text-rose-400' : 'border-border text-muted hover:text-rose-400 hover:border-rose-500/30'}`}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-3 px-4 pb-3">
        <span className="flex items-center gap-1 text-xs text-muted"><Key size={10} />{song.key}</span>
        <span className="flex items-center gap-1 text-xs text-muted"><Clock size={10} />{song.tempo} BPM · {song.time_signature}</span>
        <span className="flex items-center gap-1 text-xs text-muted"><Calendar size={10} />{new Date(song.created_at!).toLocaleDateString()}</span>
        <span className="text-xs text-muted">{song.measures.length} measure{song.measures.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Preview toggle */}
      <button onClick={() => setShowPreview(!showPreview)}
        className="w-full px-4 py-2 text-xs text-muted hover:text-text-secondary border-t border-border/50 hover:bg-surface/50 transition-colors text-left flex items-center justify-between">
        {showPreview ? 'Hide preview' : 'Show sheet music'}
        <ChevronDown size={12} className={`transition-transform ${showPreview ? 'rotate-180' : ''}`} />
      </button>

      {showPreview && song.measures.length > 0 && (
        <div className="px-3 pb-3">
          <SheetMusic ref={sheetRef} measures={song.measures} timeSignature={song.time_signature}
            keySignature={song.key} selectedMeasure={null} onSelectMeasure={() => {}} />
        </div>
      )}

      {/* Hidden renderer for PDF export when preview is closed */}
      {!showPreview && song.measures.length > 0 && (
        <div className="sr-only" aria-hidden>
          <SheetMusic ref={sheetRef} measures={song.measures} timeSignature={song.time_signature}
            keySignature={song.key} selectedMeasure={null} onSelectMeasure={() => {}} />
        </div>
      )}

      {confirmDelete && (
        <div className="border-t border-rose-500/30 bg-rose-500/10 px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs text-rose-400">Delete permanently?</span>
          <button onClick={() => setConfirmDelete(false)} className="text-xs text-muted hover:text-text-secondary">Cancel</button>
        </div>
      )}
    </div>
  );
}

export default function LibraryPage() {
  const router = useRouter();
  const [songs, setSongs] = useState<Song[]>([]);

  useEffect(() => { setSongs(getSongs()); }, []);

  function handleDelete(id: string) {
    deleteSong(id);
    setSongs(prev => prev.filter(s => s.id !== id));
  }

  function handleRename(id: string, name: string) {
    renameSong(id, name);
    setSongs(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  }

  const keyboardSongs = songs.filter(s => s.type === 'keyboard');
  const uploadSongs = songs.filter(s => s.type === 'upload');

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Library size={22} className="text-accent-light" />
          My Library
        </h1>
        <p className="text-sm text-text-secondary mt-0.5">
          {songs.length} song{songs.length !== 1 ? 's' : ''} saved on this device
        </p>
      </div>

      {/* Keyboard recordings */}
      <section>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/20">
            <Music size={14} className="text-accent-light" />
          </div>
          <h2 className="text-base font-semibold text-text-primary">Keyboard Recordings</h2>
          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent-light">{keyboardSongs.length}</span>
        </div>
        {keyboardSongs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted mb-3">No keyboard recordings yet.</p>
            <button onClick={() => router.push('/keyboard')}
              className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:border-accent/50 transition-colors">
              Start recording
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {keyboardSongs.map(s => <SongCard key={s.id} song={s} onDelete={handleDelete} onRename={handleRename} />)}
          </div>
        )}
      </section>

      {/* Upload transcriptions */}
      <section>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20">
            <Upload size={14} className="text-emerald-400" />
          </div>
          <h2 className="text-base font-semibold text-text-primary">Audio Transcriptions</h2>
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">{uploadSongs.length}</span>
        </div>
        {uploadSongs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted mb-3">No audio transcriptions yet.</p>
            <button onClick={() => router.push('/upload')}
              className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:border-emerald-500/50 transition-colors">
              Upload audio
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {uploadSongs.map(s => <SongCard key={s.id} song={s} onDelete={handleDelete} onRename={handleRename} />)}
          </div>
        )}
      </section>
    </div>
  );
}
