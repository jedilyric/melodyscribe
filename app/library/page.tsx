'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Music, AudioWaveform, Download, Trash2, Pencil, Check, X,
  ChevronDown, Library, Calendar, Clock, Key, Layers,
} from 'lucide-react';
import SheetMusic, { SheetMusicHandle } from '@/components/SheetMusic';
import MultiStaffSheet, { MultiStaffSheetHandle, InstrumentPart } from '@/components/MultiStaffSheet';
import { Song } from '@/types';
import { transposeMeasures } from '@/lib/noteUtils';
import { generatePDF } from '@/lib/pdfGenerator';
import { getSongs, deleteSong, renameSong } from '@/lib/storage';
import { getInstrument } from '@/lib/instruments';

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
  const multiRef = useRef<MultiStaffSheetHandle>(null);
  const isKeyboard = song.type === 'keyboard';
  const hasMultiParts = !!song.instrumentParts && song.instrumentParts.length > 0;

  const multiParts: InstrumentPart[] = hasMultiParts
    ? song.instrumentParts!.map(p => {
        const inst = getInstrument(p.instrumentId);
        return inst ? { instrument: inst, measures: p.measures } : null;
      }).filter(Boolean) as InstrumentPart[]
    : [];

  function saveRename() {
    if (editName.trim() && editName !== song.name) onRename(song.id!, editName.trim());
    setEditing(false);
  }

  async function downloadPdf(targetKey: string) {
    setShowDownloadMenu(false);
    await new Promise(r => setTimeout(r, 100));
    const svgEl = hasMultiParts
      ? multiRef.current?.getSvgElement()
      : sheetRef.current?.getSvgElement();
    if (!svgEl) return;
    const transposed = targetKey !== song.key ? transposeMeasures(song.measures, song.key, targetKey) : song.measures;
    await generatePDF({
      title: song.name,
      key: song.key,
      targetKey,
      tempo: song.tempo,
      timeSignature: song.time_signature,
      measures: transposed,
      lyrics: song.lyrics,
      svgElement: svgEl,
    });
  }

  const accentColor = isKeyboard ? 'text-accent-light' : 'text-emerald-400';
  const accentBg    = isKeyboard ? 'bg-accent/15'     : 'bg-emerald-500/15';
  const borderColor = confirmDelete
    ? 'border-rose-500/40 bg-rose-500/5'
    : isKeyboard
      ? 'border-border hover:border-accent/30'
      : 'border-border hover:border-emerald-500/30';

  return (
    <div className={`rounded-2xl border ${borderColor} bg-card overflow-hidden transition-all group`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-4 pb-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${accentBg}`}>
            {isKeyboard
              ? <Music size={14} className={accentColor} />
              : <AudioWaveform size={14} className={accentColor} />}
          </div>
          {editing ? (
            <div className="flex items-center gap-1.5 flex-1">
              <input
                autoFocus
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setEditing(false); }}
                className="flex-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-sm text-text-primary focus:border-accent focus:outline-none"
              />
              <button onClick={saveRename} className="text-emerald-400 hover:text-emerald-300 transition-colors"><Check size={14} /></button>
              <button onClick={() => setEditing(false)} className="text-muted hover:text-text-secondary transition-colors"><X size={14} /></button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="group/name flex items-center gap-1.5 min-w-0 text-left">
              <span className="text-sm font-semibold text-text-primary truncate">{song.name}</span>
              <Pencil size={11} className="text-muted opacity-0 group-hover/name:opacity-100 flex-shrink-0 transition-opacity" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="relative">
            <button onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:border-border-light transition-colors">
              <Download size={11} />
              PDF
              <ChevronDown size={9} />
            </button>
            {showDownloadMenu && (
              <div className="absolute right-0 top-full mt-1 w-42 rounded-xl border border-border bg-surface shadow-xl py-1.5 z-50 animate-slide-up">
                <div className="px-3 py-1 text-xs text-muted font-medium">Choose key</div>
                {DOWNLOAD_KEYS.map(k => (
                  <button key={k} onClick={() => downloadPdf(k)}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-card transition-colors ${k === song.key ? accentColor : 'text-text-secondary'}`}>
                    {k}{k === song.key ? ' (original)' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => confirmDelete ? onDelete(song.id!) : setConfirmDelete(true)}
            className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${
              confirmDelete
                ? 'border-rose-500/50 bg-rose-500/15 text-rose-400'
                : 'border-border text-muted hover:text-rose-400 hover:border-rose-500/25'
            }`}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-3 px-4 pb-3">
        <span className="flex items-center gap-1 text-xs text-muted"><Key size={9} />{song.key}</span>
        <span className="flex items-center gap-1 text-xs text-muted"><Clock size={9} />{song.tempo} BPM · {song.time_signature}</span>
        {song.created_at && (
          <span className="flex items-center gap-1 text-xs text-muted"><Calendar size={9} />{new Date(song.created_at).toLocaleDateString()}</span>
        )}
        <span className="text-xs text-muted">{song.measures.length} measure{song.measures.length !== 1 ? 's' : ''}</span>
        {hasMultiParts && (
          <span className="flex items-center gap-1 text-xs text-muted"><Layers size={9} />{multiParts.length} parts</span>
        )}
      </div>

      {/* Preview toggle */}
      <button onClick={() => setShowPreview(!showPreview)}
        className="w-full px-4 py-2 text-xs text-muted hover:text-text-secondary border-t border-border/40 hover:bg-surface/40 transition-colors text-left flex items-center justify-between">
        <span>{showPreview ? 'Hide preview' : 'Show sheet music'}</span>
        <ChevronDown size={11} className={`transition-transform ${showPreview ? 'rotate-180' : ''}`} />
      </button>

      {showPreview && (
        <div className="px-3 pb-3">
          {hasMultiParts && multiParts.length > 0 ? (
            <MultiStaffSheet
              ref={multiRef}
              parts={multiParts}
              timeSignature={song.time_signature}
              keySignature={song.key}
              selectedMeasure={null}
              onSelectMeasure={() => {}}
            />
          ) : song.measures.length > 0 ? (
            <SheetMusic
              ref={sheetRef}
              measures={song.measures}
              timeSignature={song.time_signature}
              keySignature={song.key}
              selectedMeasure={null}
              onSelectMeasure={() => {}}
            />
          ) : (
            <div className="py-6 text-center text-xs text-muted">No measures recorded</div>
          )}
        </div>
      )}

      {/* Hidden renderers for PDF export */}
      {!showPreview && (
        <div className="sr-only" aria-hidden>
          {hasMultiParts && multiParts.length > 0 ? (
            <MultiStaffSheet
              ref={multiRef}
              parts={multiParts}
              timeSignature={song.time_signature}
              keySignature={song.key}
              selectedMeasure={null}
              onSelectMeasure={() => {}}
            />
          ) : song.measures.length > 0 ? (
            <SheetMusic
              ref={sheetRef}
              measures={song.measures}
              timeSignature={song.time_signature}
              keySignature={song.key}
              selectedMeasure={null}
              onSelectMeasure={() => {}}
            />
          ) : null}
        </div>
      )}

      {confirmDelete && (
        <div className="border-t border-rose-500/25 bg-rose-500/8 px-4 py-2.5 flex items-center justify-between">
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
  const uploadSongs   = songs.filter(s => s.type === 'upload');

  return (
    <div className="space-y-10 pb-12">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-dim border border-gold/25">
              <Library size={18} className="text-gold" />
            </div>
            My Library
          </h1>
          <p className="text-sm text-text-secondary mt-1 ml-11">
            {songs.length} song{songs.length !== 1 ? 's' : ''} saved on this device
          </p>
        </div>
      </div>

      {songs.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-border mx-auto mb-4">
            <Library size={24} className="text-muted" />
          </div>
          <h3 className="text-base font-semibold text-text-secondary mb-1">Your library is empty</h3>
          <p className="text-sm text-muted mb-6">Record from a MIDI keyboard or transcribe an audio file to get started.</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => router.push('/keyboard')}
              className="rounded-xl border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:border-accent/40 transition-colors">
              Keyboard Studio
            </button>
            <button onClick={() => router.push('/upload')}
              className="rounded-xl border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:border-emerald-500/40 transition-colors">
              Transcribe Audio
            </button>
          </div>
        </div>
      )}

      {/* Keyboard recordings */}
      {(keyboardSongs.length > 0 || songs.length > 0) && (
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/20">
              <Music size={14} className="text-accent-light" />
            </div>
            <h2 className="text-sm font-semibold text-text-primary">Keyboard Recordings</h2>
            <span className="rounded-full bg-accent/12 px-2 py-0.5 text-xs text-accent-light font-medium">{keyboardSongs.length}</span>
          </div>
          {keyboardSongs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
              <p className="text-sm text-muted mb-3">No keyboard recordings yet.</p>
              <button onClick={() => router.push('/keyboard')}
                className="rounded-xl border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:border-accent/40 transition-colors">
                Open Keyboard Studio
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {keyboardSongs.map(s => (
                <SongCard key={s.id} song={s} onDelete={handleDelete} onRename={handleRename} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Audio transcriptions */}
      {(uploadSongs.length > 0 || songs.length > 0) && (
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15">
              <AudioWaveform size={14} className="text-emerald-400" />
            </div>
            <h2 className="text-sm font-semibold text-text-primary">Audio Transcriptions</h2>
            <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-xs text-emerald-400 font-medium">{uploadSongs.length}</span>
          </div>
          {uploadSongs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
              <p className="text-sm text-muted mb-3">No audio transcriptions yet.</p>
              <button onClick={() => router.push('/upload')}
                className="rounded-xl border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:border-emerald-500/40 transition-colors">
                Transcribe Audio
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {uploadSongs.map(s => (
                <SongCard key={s.id} song={s} onDelete={handleDelete} onRename={handleRename} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
