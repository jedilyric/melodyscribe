'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Usb, Play, Pause, Square, SkipBack, Trash2, RotateCcw,
  Download, Save, Music2, AlertCircle, ChevronDown, Timer,
} from 'lucide-react';
import SheetMusic, { SheetMusicHandle } from '@/components/SheetMusic';
import SaveSongDialog from '@/components/SaveSongDialog';
import { Measure, NoteEvent, KEYS, TIME_SIGNATURES } from '@/types';
import {
  midiToVexKey, quantizeDuration, fillWithRests, makeRestEvent, BEAT_VALUES, transposeMeasures,
} from '@/lib/noteUtils';
import { generatePDF } from '@/lib/pdfGenerator';
import { v4 as uuidv4 } from 'uuid';

type RecordingStatus = 'idle' | 'recording' | 'paused';
type PlaybackStatus = 'stopped' | 'playing' | 'countIn';

interface ActiveNote { midiNote: number; startTime: number }

const DOWNLOAD_KEYS = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab', 'Db'];

export default function KeyboardPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Settings
  const [key, setKey] = useState('C');
  const [tempo, setTempo] = useState(120);
  const [timeSig, setTimeSig] = useState('4/4');

  // Recording
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  const [measures, setMeasures] = useState<Measure[]>([]);
  const [currentMeasureEvents, setCurrentMeasureEvents] = useState<{ treble: NoteEvent[]; bass: NoteEvent[] }>({ treble: [], bass: [] });
  const activeNotesRef = useRef<Map<number, ActiveNote>>(new Map());
  const measureTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentMeasureRef = useRef<{ treble: NoteEvent[]; bass: NoteEvent[] }>({ treble: [], bass: [] });

  // MIDI
  const [midiConnected, setMidiConnected] = useState(false);
  const [midiError, setMidiError] = useState('');
  const midiAccessRef = useRef<MIDIAccess | null>(null);

  // Playback
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('stopped');
  const [currentPlayingMeasure, setCurrentPlayingMeasure] = useState<number | null>(null);
  const [countIn, setCountIn] = useState(false);
  const playbackRef = useRef<{ timeout: NodeJS.Timeout | null; audioCtx: AudioContext | null }>({ timeout: null, audioCtx: null });

  // Selection
  const [selectedMeasure, setSelectedMeasure] = useState<number | null>(null);
  const [deletedMeasureNotes, setDeletedMeasureNotes] = useState<Set<number>>(new Set());

  // PDF / Save
  const [showSave, setShowSave] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const sheetMusicRef = useRef<SheetMusicHandle>(null);

  const [beatsPerMeasure, beatValue] = timeSig.split('/').map(Number);
  const measureDurationMs = (beatsPerMeasure * 60000) / tempo;

  // ── MIDI ──────────────────────────────────────────────────────────────────
  async function connectMidi() {
    if (!navigator.requestMIDIAccess) {
      setMidiError('Web MIDI API not supported. Please use Google Chrome.');
      return;
    }
    try {
      const access = await navigator.requestMIDIAccess();
      midiAccessRef.current = access;
      if (access.inputs.size === 0) {
        setMidiError('No MIDI devices found. Plug in your keyboard and try again.');
        return;
      }
      access.inputs.forEach(input => { input.onmidimessage = handleMidiMessage; });
      access.onstatechange = (e) => {
        if (e.port && e.port.type === 'input') {
          if (e.port.state === 'connected') {
            (e.port as MIDIInput).onmidimessage = handleMidiMessage;
            setMidiConnected(true);
          }
        }
      };
      setMidiConnected(true);
      setMidiError('');
    } catch (e) {
      setMidiError('MIDI access denied. Please allow MIDI access in your browser.');
    }
  }

  function handleMidiMessage(event: MIDIMessageEvent) {
    if (!event.data) return;
    const [status, note, velocity] = Array.from(event.data);
    const isNoteOn = (status & 0xf0) === 0x90 && velocity > 0;
    const isNoteOff = (status & 0xf0) === 0x80 || ((status & 0xf0) === 0x90 && velocity === 0);

    if (isNoteOn) {
      activeNotesRef.current.set(note, { midiNote: note, startTime: Date.now() });
    } else if (isNoteOff) {
      const active = activeNotesRef.current.get(note);
      if (active && recordingStatus === 'recording') {
        const durMs = Date.now() - active.startTime;
        const dur = quantizeDuration(durMs, tempo);
        const { key: vexKey, accidental } = midiToVexKey(note);
        const clef = note >= 60 ? 'treble' : 'bass';
        const evt: NoteEvent = {
          id: uuidv4(),
          midiNotes: [note],
          keys: [vexKey],
          accidentals: [accidental],
          duration: dur,
          isRest: false,
          clef,
        };
        addEventToCurrentMeasure(evt, clef);
      }
      activeNotesRef.current.delete(note);
    }
  }

  function addEventToCurrentMeasure(evt: NoteEvent, clef: 'treble' | 'bass') {
    const cur = currentMeasureRef.current;
    const existingBeats = (clef === 'treble' ? cur.treble : cur.bass)
      .reduce((s, e) => s + BEAT_VALUES[e.duration], 0);
    const newBeats = existingBeats + BEAT_VALUES[evt.duration];

    if (newBeats > beatsPerMeasure) return; // overflow — drop note (will start next measure)

    const updated = {
      treble: clef === 'treble' ? [...cur.treble, evt] : cur.treble,
      bass: clef === 'bass' ? [...cur.bass, evt] : cur.bass,
    };
    currentMeasureRef.current = updated;
    setCurrentMeasureEvents({ ...updated });
  }

  function closeMeasure() {
    const cur = currentMeasureRef.current;
    const treble = fillWithRests(cur.treble, timeSig, 'treble');
    const bass = fillWithRests(cur.bass, timeSig, 'bass');
    const newMeasure: Measure = { id: uuidv4(), trebleEvents: treble, bassEvents: bass, isComplete: true };
    setMeasures(prev => [...prev, newMeasure]);
    currentMeasureRef.current = { treble: [], bass: [] };
    setCurrentMeasureEvents({ treble: [], bass: [] });
  }

  // ── RECORDING CONTROLS ───────────────────────────────────────────────────
  function startRecording() {
    setRecordingStatus('recording');
    currentMeasureRef.current = { treble: [], bass: [] };
    const interval = setInterval(closeMeasure, measureDurationMs);
    measureTimerRef.current = interval;
  }

  function pauseRecording() {
    if (measureTimerRef.current) clearInterval(measureTimerRef.current);
    closeMeasure();
    setRecordingStatus('paused');
  }

  function resumeRecording() {
    setRecordingStatus('recording');
    const interval = setInterval(closeMeasure, measureDurationMs);
    measureTimerRef.current = interval;
  }

  function stopRecording() {
    if (measureTimerRef.current) clearInterval(measureTimerRef.current);
    closeMeasure();
    setRecordingStatus('idle');
  }

  // ── PLAYBACK ─────────────────────────────────────────────────────────────
  async function startPlayback() {
    if (measures.length === 0) return;
    const Tone = await import('tone');
    await Tone.start();
    const synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.5 } }).toDestination();
    const beatSec = 60 / tempo;
    playbackRef.current.audioCtx = Tone.getContext().rawContext as AudioContext;

    let startDelay = 0;

    if (countIn) {
      setPlaybackStatus('countIn');
      const clickSynth = new Tone.MetalSynth({ volume: -15 }).toDestination();
      for (let i = 0; i < beatsPerMeasure; i++) {
        clickSynth.triggerAttackRelease('32n', `+${i * beatSec}`);
      }
      startDelay = beatsPerMeasure * beatSec;
    }

    setPlaybackStatus('playing');
    let time = startDelay;
    const measureSec = (beatsPerMeasure * 60) / tempo;

    measures.forEach((measure, mIdx) => {
      const t = time;
      const to = setTimeout(() => setCurrentPlayingMeasure(mIdx), t * 1000);
      playbackRef.current.timeout = to;

      measure.trebleEvents.forEach(evt => {
        if (!evt.isRest && evt.midiNotes.length > 0) {
          const notes = evt.midiNotes.map(m => Tone.Frequency(m, 'midi').toNote());
          const durSec = BEAT_VALUES[evt.duration] * beatSec;
          synth.triggerAttackRelease(notes, durSec - 0.02, `+${time}`);
        }
        time += BEAT_VALUES[evt.duration] * beatSec;
      });

      // Reset time to start of next measure if treble was shorter
      const expectedEnd = t + measureSec;
      if (time < expectedEnd) time = expectedEnd;
    });

    const totalTime = measures.length * measureSec + startDelay;
    const finishTimeout = setTimeout(() => {
      setPlaybackStatus('stopped');
      setCurrentPlayingMeasure(null);
    }, totalTime * 1000 + 500);
    playbackRef.current.timeout = finishTimeout;
  }

  function stopPlayback() {
    if (playbackRef.current.timeout) clearTimeout(playbackRef.current.timeout);
    setPlaybackStatus('stopped');
    setCurrentPlayingMeasure(null);
  }

  // ── MEASURE ACTIONS ───────────────────────────────────────────────────────
  function replayMeasure() {
    if (selectedMeasure === null) return;
    const target = measures[selectedMeasure];
    if (!target) return;

    // Re-open the selected measure index for re-recording
    const cleared = measures.map((m, i) =>
      i === selectedMeasure
        ? { ...m, trebleEvents: [], bassEvents: [], isComplete: false }
        : m
    );
    setMeasures(cleared);
    setSelectedMeasure(null);
    currentMeasureRef.current = { treble: [], bass: [] };
    setRecordingStatus('recording');
    // After one measure duration, write it
    const t = setTimeout(() => {
      const cur = currentMeasureRef.current;
      const treble = fillWithRests(cur.treble, timeSig, 'treble');
      const bass = fillWithRests(cur.bass, timeSig, 'bass');
      setMeasures(prev => prev.map((m, i) => i === selectedMeasure ? { ...m, trebleEvents: treble, bassEvents: bass, isComplete: true } : m));
      currentMeasureRef.current = { treble: [], bass: [] };
      setRecordingStatus('idle');
    }, measureDurationMs);
    measureTimerRef.current = t as unknown as NodeJS.Timeout;
  }

  function deleteMeasureNotes() {
    if (selectedMeasure === null) return;
    if (deletedMeasureNotes.has(selectedMeasure)) {
      // Second press — delete entire measure
      setMeasures(prev => prev.filter((_, i) => i !== selectedMeasure));
      setDeletedMeasureNotes(prev => { const n = new Set(prev); n.delete(selectedMeasure); return n; });
      setSelectedMeasure(null);
    } else {
      // First press — clear notes but keep measure (fill with rests)
      setMeasures(prev => prev.map((m, i) => i === selectedMeasure ? {
        ...m,
        trebleEvents: [makeRestEvent('w', 'treble')],
        bassEvents: [makeRestEvent('w', 'bass')],
      } : m));
      setDeletedMeasureNotes(prev => new Set([...prev, selectedMeasure]));
    }
  }

  // ── SAVE & PDF ────────────────────────────────────────────────────────────
  async function handleSave(name: string) {
    const body = { name, type: 'keyboard', key, tempo, time_signature: timeSig, measures, lyrics: '' };
    const url = savedId ? `/api/songs/${savedId}` : '/api/songs';
    const method = savedId ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.song?.id) setSavedId(data.song.id);
  }

  async function downloadPdf(targetKey: string) {
    const svgEl = sheetMusicRef.current?.getSvgElement();
    if (!svgEl || measures.length === 0) return;
    setShowDownloadMenu(false);
    const transposed = targetKey !== key ? transposeMeasures(measures, key, targetKey) : measures;
    await generatePDF({ title: 'MelodyScribe Recording', key, targetKey, tempo, timeSignature: timeSig, measures: transposed, svgElement: svgEl });
  }

  // Cleanup on unmount
  useEffect(() => () => {
    if (measureTimerRef.current) clearInterval(measureTimerRef.current);
    if (playbackRef.current.timeout) clearTimeout(playbackRef.current.timeout);
  }, []);

  const allMeasures: Measure[] = currentMeasureEvents.treble.length > 0 || currentMeasureEvents.bass.length > 0
    ? [...measures, { id: 'current', trebleEvents: currentMeasureEvents.treble, bassEvents: currentMeasureEvents.bass, isComplete: false }]
    : measures;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Music2 size={22} className="text-accent-light" />
            Keyboard Recording
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Connect your MIDI keyboard, set your options, and start playing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {measures.length > 0 && session && (
            <button
              onClick={() => setShowSave(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <Save size={14} />
              Save
            </button>
          )}
          {measures.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm text-white hover:bg-accent-hover transition-colors"
              >
                <Download size={14} />
                Download PDF
                <ChevronDown size={12} />
              </button>
              {showDownloadMenu && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-border bg-card shadow-xl py-1.5 z-50">
                  <div className="px-3 py-1 text-xs text-muted font-medium">Choose key</div>
                  {DOWNLOAD_KEYS.map(k => (
                    <button key={k} onClick={() => downloadPdf(k)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-surface transition-colors ${k === key ? 'text-accent-light' : 'text-text-secondary'}`}>
                      {k}{k === key ? ' (original)' : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Settings + MIDI row */}
      <div className="flex flex-wrap gap-4 rounded-2xl border border-border bg-card p-5">
        {/* Key */}
        <div className="flex flex-col gap-1.5 min-w-[100px]">
          <label className="text-xs font-medium text-text-secondary">Key</label>
          <select value={key} onChange={e => setKey(e.target.value)} disabled={recordingStatus !== 'idle'}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none disabled:opacity-50">
            {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>

        {/* Time Signature */}
        <div className="flex flex-col gap-1.5 min-w-[100px]">
          <label className="text-xs font-medium text-text-secondary">Time Signature</label>
          <select value={timeSig} onChange={e => setTimeSig(e.target.value)} disabled={recordingStatus !== 'idle'}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none disabled:opacity-50">
            {TIME_SIGNATURES.map(ts => <option key={ts} value={ts}>{ts}</option>)}
          </select>
        </div>

        {/* Tempo */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
          <label className="text-xs font-medium text-text-secondary">Tempo: {tempo} BPM</label>
          <input type="range" min={40} max={240} value={tempo} disabled={recordingStatus !== 'idle'}
            onChange={e => setTempo(Number(e.target.value))}
            className="w-full accent-accent disabled:opacity-50" />
        </div>

        {/* Count-in toggle */}
        <div className="flex flex-col gap-1.5 justify-center">
          <label className="text-xs font-medium text-text-secondary">Playback Count-in</label>
          <button onClick={() => setCountIn(!countIn)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${countIn ? 'border-accent bg-accent/15 text-accent-light' : 'border-border bg-surface text-text-secondary hover:border-accent/50'}`}>
            <Timer size={14} />
            {countIn ? 'On' : 'Off'}
          </button>
        </div>

        {/* MIDI connect */}
        <div className="flex flex-col gap-1.5 justify-center">
          <label className="text-xs font-medium text-text-secondary">MIDI Device</label>
          <button onClick={connectMidi}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${midiConnected ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' : 'border-border bg-surface text-text-secondary hover:border-accent/50 hover:text-text-primary'}`}>
            <Usb size={14} />
            {midiConnected ? 'Connected' : 'Connect MIDI'}
          </button>
        </div>
      </div>

      {/* MIDI error */}
      {midiError && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          <AlertCircle size={15} />
          {midiError}
        </div>
      )}

      {/* Transport */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4">
        <span className={`inline-flex h-2.5 w-2.5 rounded-full ${recordingStatus === 'recording' ? 'bg-rose-500 animate-pulse' : recordingStatus === 'paused' ? 'bg-amber-400' : 'bg-muted'}`} />
        <span className="text-sm text-text-secondary min-w-[80px]">
          {recordingStatus === 'recording' ? 'Recording…' : recordingStatus === 'paused' ? 'Paused' : 'Ready'}
        </span>

        {recordingStatus === 'idle' && (
          <button onClick={startRecording}
            className="flex items-center gap-1.5 rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-400 transition-colors">
            <span className="h-3 w-3 rounded-full bg-white" />
            Record
          </button>
        )}
        {recordingStatus === 'recording' && (
          <button onClick={pauseRecording}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400 transition-colors">
            <Pause size={14} />
            Pause
          </button>
        )}
        {recordingStatus === 'paused' && (
          <button onClick={resumeRecording}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400 transition-colors">
            <Play size={14} />
            Resume
          </button>
        )}
        {recordingStatus !== 'idle' && (
          <button onClick={stopRecording}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
            <Square size={14} />
            Stop
          </button>
        )}

        <div className="h-6 w-px bg-border mx-1" />

        {/* Playback */}
        {playbackStatus === 'stopped' ? (
          <button onClick={startPlayback} disabled={measures.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary disabled:opacity-40 transition-colors">
            <Play size={14} className="text-emerald-400" />
            Play{countIn ? ' (with count-in)' : ''}
          </button>
        ) : (
          <button onClick={stopPlayback}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-500/20 transition-colors">
            <Square size={14} />
            {playbackStatus === 'countIn' ? 'Count-in…' : 'Stop Playback'}
          </button>
        )}

        <span className="ml-auto text-xs text-muted font-mono">
          {measures.length} measure{measures.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Sheet music */}
      <div className="sheet-music-wrap">
        <SheetMusic
          ref={sheetMusicRef}
          measures={allMeasures}
          timeSignature={timeSig}
          keySignature={key}
          selectedMeasure={selectedMeasure}
          onSelectMeasure={setSelectedMeasure}
          currentPlayingMeasure={currentPlayingMeasure}
        />
      </div>

      {/* Measure action bar */}
      {selectedMeasure !== null && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-accent/30 bg-accent/10 px-5 py-4 animate-slide-up">
          <span className="text-sm font-medium text-accent-light">
            Measure {selectedMeasure + 1} selected
          </span>
          <div className="flex gap-2 ml-auto">
            <button onClick={replayMeasure}
              className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/15 px-3 py-2 text-sm text-accent-light hover:bg-accent/25 transition-colors">
              <RotateCcw size={13} />
              Re-record
            </button>
            <button onClick={deleteMeasureNotes}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors ${deletedMeasureNotes.has(selectedMeasure) ? 'border border-rose-500/50 bg-rose-500/15 text-rose-400 hover:bg-rose-500/25' : 'border border-border bg-card text-text-secondary hover:text-rose-400 hover:border-rose-500/40'}`}>
              <Trash2 size={13} />
              {deletedMeasureNotes.has(selectedMeasure) ? 'Delete Measure' : 'Clear Notes'}
            </button>
            <button onClick={() => setSelectedMeasure(null)}
              className="rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-text-secondary transition-colors">
              ✕
            </button>
          </div>
        </div>
      )}

      {!session && measures.length > 0 && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-400 text-center">
          <button onClick={() => router.push('/login')} className="underline underline-offset-2 hover:text-amber-300">Sign in</button> to save your recording to your library.
        </div>
      )}

      {showSave && (
        <SaveSongDialog
          defaultName=""
          onSave={handleSave}
          onClose={() => setShowSave(false)}
        />
      )}
    </div>
  );
}
