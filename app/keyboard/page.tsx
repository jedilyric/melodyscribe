'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Usb, Play, Pause, Square, Trash2, RotateCcw,
  Download, Save, Music, AlertCircle, ChevronDown, Timer,
  Circle,
} from 'lucide-react';
import SheetMusic, { SheetMusicHandle } from '@/components/SheetMusic';
import SaveSongDialog from '@/components/SaveSongDialog';
import { Measure, NoteEvent, KEYS, TIME_SIGNATURES } from '@/types';
import {
  midiToVexKey, quantizeDuration, fillWithRests, makeRestEvent, BEAT_VALUES, transposeMeasures,
} from '@/lib/noteUtils';
import { generatePDF } from '@/lib/pdfGenerator';
import { saveSong } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';

type RecordingStatus = 'idle' | 'recording' | 'paused';
type PlaybackStatus  = 'stopped' | 'playing' | 'countIn';

const DOWNLOAD_KEYS = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab', 'Db'];

export default function KeyboardPage() {
  const [key, setKey]       = useState('C');
  const [tempo, setTempo]   = useState(120);
  const [timeSig, setTimeSig] = useState('4/4');

  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  const [measures, setMeasures] = useState<Measure[]>([]);
  const [currentMeasureEvents, setCurrentMeasureEvents] = useState<{ treble: NoteEvent[]; bass: NoteEvent[] }>({ treble: [], bass: [] });
  const activeNotesRef      = useRef<Map<number, number>>(new Map());
  const measureTimerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentMeasureRef   = useRef<{ treble: NoteEvent[]; bass: NoteEvent[] }>({ treble: [], bass: [] });

  const [midiConnected, setMidiConnected] = useState(false);
  const [midiError, setMidiError]         = useState('');

  const [playbackStatus, setPlaybackStatus]             = useState<PlaybackStatus>('stopped');
  const [currentPlayingMeasure, setCurrentPlayingMeasure] = useState<number | null>(null);
  const [countIn, setCountIn] = useState(false);
  const playbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedMeasure, setSelectedMeasure] = useState<number | null>(null);
  const [deletedMeasures, setDeletedMeasures] = useState<Set<number>>(new Set());

  const [showSave, setShowSave]               = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [savedId, setSavedId]                 = useState<string | undefined>(undefined);
  const sheetMusicRef = useRef<SheetMusicHandle>(null);

  const [beatsPerMeasure] = timeSig.split('/').map(Number);
  const measureDurationMs  = (beatsPerMeasure * 60000) / tempo;

  // ── MIDI ──────────────────────────────────────────────────────────────────
  async function connectMidi() {
    if (!navigator.requestMIDIAccess) {
      setMidiError('Web MIDI is not supported in this browser. Please use Google Chrome.');
      return;
    }
    try {
      const access = await navigator.requestMIDIAccess();
      if (access.inputs.size === 0) {
        setMidiError('No MIDI device found. Plug in your keyboard and try again.');
        return;
      }
      access.inputs.forEach(input => { input.onmidimessage = handleMidiMessage; });
      access.onstatechange = e => {
        if (e.port && e.port.type === 'input' && e.port.state === 'connected') {
          (e.port as MIDIInput).onmidimessage = handleMidiMessage;
          setMidiConnected(true);
        }
      };
      setMidiConnected(true);
      setMidiError('');
    } catch {
      setMidiError('MIDI access denied. Please allow MIDI in your browser settings.');
    }
  }

  function handleMidiMessage(event: MIDIMessageEvent) {
    if (!event.data) return;
    const [status, note, velocity] = Array.from(event.data);
    const isOn  = (status & 0xf0) === 0x90 && velocity > 0;
    const isOff = (status & 0xf0) === 0x80 || ((status & 0xf0) === 0x90 && velocity === 0);
    if (isOn) activeNotesRef.current.set(note, Date.now());
    if (isOff) {
      const startTime = activeNotesRef.current.get(note);
      if (startTime !== undefined) {
        if (recordingRef.current === 'recording') {
          const dur = quantizeDuration(Date.now() - startTime, tempo);
          const { key: vexKey, accidental } = midiToVexKey(note);
          const clef = note >= 60 ? 'treble' : 'bass';
          addEvent({ id: uuidv4(), midiNotes: [note], keys: [vexKey], accidentals: [accidental], duration: dur, isRest: false, clef }, clef);
        }
        activeNotesRef.current.delete(note);
      }
    }
  }

  const recordingRef = useRef<RecordingStatus>('idle');
  useEffect(() => { recordingRef.current = recordingStatus; }, [recordingStatus]);

  function addEvent(evt: NoteEvent, clef: 'treble' | 'bass') {
    const cur  = currentMeasureRef.current;
    const used = (clef === 'treble' ? cur.treble : cur.bass).reduce((s, e) => s + BEAT_VALUES[e.duration], 0);
    if (used + BEAT_VALUES[evt.duration] > beatsPerMeasure) return;
    const updated = {
      treble: clef === 'treble' ? [...cur.treble, evt] : cur.treble,
      bass:   clef === 'bass'   ? [...cur.bass,   evt] : cur.bass,
    };
    currentMeasureRef.current = updated;
    setCurrentMeasureEvents({ ...updated });
  }

  function closeMeasure() {
    const cur = currentMeasureRef.current;
    setMeasures(prev => [...prev, {
      id: uuidv4(),
      trebleEvents: fillWithRests(cur.treble, timeSig, 'treble'),
      bassEvents:   fillWithRests(cur.bass,   timeSig, 'bass'),
      isComplete: true,
    }]);
    currentMeasureRef.current = { treble: [], bass: [] };
    setCurrentMeasureEvents({ treble: [], bass: [] });
  }

  // ── RECORDING ─────────────────────────────────────────────────────────────
  function startRecording() {
    currentMeasureRef.current = { treble: [], bass: [] };
    setRecordingStatus('recording');
    measureTimerRef.current = setInterval(closeMeasure, measureDurationMs);
  }

  function pauseRecording() {
    if (measureTimerRef.current) clearInterval(measureTimerRef.current);
    closeMeasure();
    setRecordingStatus('paused');
  }

  function resumeRecording() {
    setRecordingStatus('recording');
    measureTimerRef.current = setInterval(closeMeasure, measureDurationMs);
  }

  function stopRecording() {
    if (measureTimerRef.current) clearInterval(measureTimerRef.current);
    closeMeasure();
    setRecordingStatus('idle');
  }

  // ── PLAYBACK ──────────────────────────────────────────────────────────────
  async function startPlayback() {
    if (measures.length === 0) return;
    const Tone = await import('tone');
    await Tone.start();
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.5 },
    }).toDestination();

    const beatSec    = 60 / tempo;
    const measureSec = beatsPerMeasure * beatSec;
    let startDelay   = 0;

    if (countIn) {
      setPlaybackStatus('countIn');
      const click = new Tone.MetalSynth({ volume: -15 }).toDestination();
      for (let i = 0; i < beatsPerMeasure; i++) click.triggerAttackRelease('32n', `+${i * beatSec}`);
      startDelay = beatsPerMeasure * beatSec;
    }
    setPlaybackStatus('playing');

    let time = startDelay;
    measures.forEach((measure, mIdx) => {
      const t = time;
      playbackTimeoutRef.current = setTimeout(() => setCurrentPlayingMeasure(mIdx), t * 1000);
      measure.trebleEvents.forEach(evt => {
        if (!evt.isRest && evt.midiNotes.length > 0) {
          const notes = evt.midiNotes.map(m => Tone.Frequency(m, 'midi').toNote());
          synth.triggerAttackRelease(notes, BEAT_VALUES[evt.duration] * beatSec - 0.02, `+${time}`);
        }
        time += BEAT_VALUES[evt.duration] * beatSec;
      });
      const expectedEnd = t + measureSec;
      if (time < expectedEnd) time = expectedEnd;
    });

    playbackTimeoutRef.current = setTimeout(() => {
      setPlaybackStatus('stopped');
      setCurrentPlayingMeasure(null);
    }, time * 1000 + 500);
  }

  function stopPlayback() {
    if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
    setPlaybackStatus('stopped');
    setCurrentPlayingMeasure(null);
  }

  // ── MEASURE ACTIONS ───────────────────────────────────────────────────────
  function replayMeasure() {
    if (selectedMeasure === null) return;
    setMeasures(prev => prev.map((m, i) =>
      i === selectedMeasure ? { ...m, trebleEvents: [], bassEvents: [], isComplete: false } : m
    ));
    setSelectedMeasure(null);
    currentMeasureRef.current = { treble: [], bass: [] };
    setRecordingStatus('recording');
    const t = setTimeout(() => {
      const cur = currentMeasureRef.current;
      setMeasures(prev => prev.map((m, i) => i === selectedMeasure ? {
        ...m,
        trebleEvents: fillWithRests(cur.treble, timeSig, 'treble'),
        bassEvents:   fillWithRests(cur.bass,   timeSig, 'bass'),
        isComplete: true,
      } : m));
      currentMeasureRef.current = { treble: [], bass: [] };
      setRecordingStatus('idle');
    }, measureDurationMs);
    measureTimerRef.current = t as unknown as ReturnType<typeof setInterval>;
  }

  function deleteMeasureNotes() {
    if (selectedMeasure === null) return;
    if (deletedMeasures.has(selectedMeasure)) {
      setMeasures(prev => prev.filter((_, i) => i !== selectedMeasure));
      setDeletedMeasures(prev => { const n = new Set(prev); n.delete(selectedMeasure); return n; });
      setSelectedMeasure(null);
    } else {
      setMeasures(prev => prev.map((m, i) => i === selectedMeasure ? {
        ...m,
        trebleEvents: [makeRestEvent('w', 'treble')],
        bassEvents:   [makeRestEvent('w', 'bass')],
      } : m));
      setDeletedMeasures(prev => new Set([...prev, selectedMeasure]));
    }
  }

  // ── SAVE & DOWNLOAD ───────────────────────────────────────────────────────
  function handleSave(name: string) {
    const saved = saveSong({ id: savedId, name, type: 'keyboard', key, tempo, time_signature: timeSig, measures, lyrics: '' });
    setSavedId(saved.id);
    return Promise.resolve();
  }

  async function downloadPdf(targetKey: string) {
    const svgEl = sheetMusicRef.current?.getSvgElement();
    if (!svgEl || measures.length === 0) return;
    setShowDownloadMenu(false);
    const transposed = targetKey !== key ? transposeMeasures(measures, key, targetKey) : measures;
    await generatePDF({ title: 'MelodyScribe Recording', key, targetKey, tempo, timeSignature: timeSig, measures: transposed, svgElement: svgEl });
  }

  useEffect(() => () => {
    if (measureTimerRef.current)  clearInterval(measureTimerRef.current);
    if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
  }, []);

  const allMeasures: Measure[] = currentMeasureEvents.treble.length > 0 || currentMeasureEvents.bass.length > 0
    ? [...measures, { id: 'current', trebleEvents: currentMeasureEvents.treble, bassEvents: currentMeasureEvents.bass, isComplete: false }]
    : measures;

  const recordingLabel = recordingStatus === 'recording' ? 'Recording' : recordingStatus === 'paused' ? 'Paused' : 'Ready';

  return (
    <div className="space-y-5 pb-10">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/20">
              <Music size={19} className="text-accent-light" />
            </div>
            Keyboard Studio
          </h1>
          <p className="text-sm text-text-secondary mt-1 ml-11">Connect your MIDI keyboard and start playing.</p>
        </div>
        <div className="flex items-center gap-2">
          {measures.length > 0 && (
            <button onClick={() => setShowSave(true)}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-text-secondary hover:text-text-primary hover:border-border-light transition-colors">
              <Save size={14} />
              Save
            </button>
          )}
          {measures.length > 0 && (
            <div className="relative">
              <button onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors shadow-sm">
                <Download size={14} />
                PDF
                <ChevronDown size={12} />
              </button>
              {showDownloadMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-border bg-card shadow-xl py-1.5 z-50 animate-slide-up">
                  <div className="px-3 py-1.5 text-xs text-muted font-medium">Transpose to key</div>
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

      {/* Settings panel */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Score settings</p>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Key</label>
            <select value={key} onChange={e => setKey(e.target.value)} disabled={recordingStatus !== 'idle'}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none disabled:opacity-50 cursor-pointer">
              {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Time Signature</label>
            <select value={timeSig} onChange={e => setTimeSig(e.target.value)} disabled={recordingStatus !== 'idle'}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none disabled:opacity-50 cursor-pointer">
              {TIME_SIGNATURES.map(ts => <option key={ts} value={ts}>{ts}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
            <label className="text-xs font-medium text-text-secondary">
              Tempo: <span className="text-text-primary font-semibold">{tempo} BPM</span>
            </label>
            <input type="range" min={40} max={240} value={tempo} disabled={recordingStatus !== 'idle'}
              onChange={e => setTempo(Number(e.target.value))} className="w-full disabled:opacity-50" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Count-in</label>
            <button onClick={() => setCountIn(!countIn)}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition-colors ${
                countIn ? 'border-accent/50 bg-accent/15 text-accent-light' : 'border-border bg-surface text-text-secondary hover:border-accent/30 hover:text-text-primary'
              }`}>
              <Timer size={14} />
              {countIn ? 'On' : 'Off'}
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">MIDI</label>
            <button onClick={connectMidi}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition-colors ${
                midiConnected
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-border bg-surface text-text-secondary hover:border-accent/30 hover:text-text-primary'
              }`}>
              <Usb size={14} />
              {midiConnected ? 'Connected' : 'Connect'}
            </button>
          </div>
        </div>
      </div>

      {midiError && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3 text-sm text-rose-400">
          <AlertCircle size={15} className="flex-shrink-0" />{midiError}
        </div>
      )}

      {/* Transport bar — prominent like Flat.io / MuseScore */}
      <div className={`rounded-2xl border px-5 py-4 transition-colors ${
        recordingStatus === 'recording'
          ? 'border-rose-500/40 bg-rose-500/5'
          : recordingStatus === 'paused'
          ? 'border-amber-500/30 bg-amber-500/5'
          : playbackStatus !== 'stopped'
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-border bg-card'
      }`}>
        <div className="flex flex-wrap items-center gap-3">
          {/* Status indicator */}
          <div className="flex items-center gap-2 min-w-[110px]">
            {recordingStatus === 'recording' && (
              <Circle size={10} className="fill-rose-500 text-rose-500 record-dot" />
            )}
            {recordingStatus === 'paused' && (
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />
            )}
            {recordingStatus === 'idle' && playbackStatus === 'stopped' && (
              <span className="h-2 w-2 rounded-full bg-muted" />
            )}
            {playbackStatus !== 'stopped' && recordingStatus === 'idle' && (
              <Play size={10} className="text-emerald-400 fill-emerald-400" />
            )}
            <span className={`text-sm font-medium ${
              recordingStatus === 'recording' ? 'text-rose-400'
              : recordingStatus === 'paused' ? 'text-amber-400'
              : playbackStatus !== 'stopped' ? 'text-emerald-400'
              : 'text-text-secondary'
            }`}>
              {playbackStatus === 'countIn' ? 'Count-in…'
                : playbackStatus === 'playing' ? 'Playing'
                : recordingLabel}
            </span>
          </div>

          <div className="h-5 w-px bg-border" />

          {/* Record controls */}
          {recordingStatus === 'idle' && (
            <button onClick={startRecording}
              className="flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400 transition-all hover:scale-[1.02] shadow-sm">
              <Circle size={12} className="fill-white" />
              Record
            </button>
          )}
          {recordingStatus === 'recording' && (
            <button onClick={pauseRecording}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-400 transition-colors">
              <Pause size={14} />
              Pause
            </button>
          )}
          {recordingStatus === 'paused' && (
            <button onClick={resumeRecording}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors">
              <Play size={14} />
              Resume
            </button>
          )}
          {recordingStatus !== 'idle' && (
            <button onClick={stopRecording}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:border-border-light transition-colors">
              <Square size={13} />
              Stop
            </button>
          )}

          <div className="h-5 w-px bg-border" />

          {/* Playback */}
          {playbackStatus === 'stopped' ? (
            <button onClick={startPlayback} disabled={measures.length === 0}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:border-emerald-500/30 disabled:opacity-35 transition-colors">
              <Play size={14} className="text-emerald-400" />
              {countIn ? 'Play (count-in)' : 'Play'}
            </button>
          ) : (
            <button onClick={stopPlayback}
              className="flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-500/20 transition-colors">
              <Square size={13} />
              Stop
            </button>
          )}

          <span className="ml-auto text-xs font-mono text-muted">
            {measures.length} measure{measures.length !== 1 ? 's' : ''}
          </span>
        </div>
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
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-accent/30 bg-accent/8 px-5 py-4 animate-slide-up">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-light" />
            <span className="text-sm font-semibold text-accent-light">Measure {selectedMeasure + 1}</span>
          </div>
          <div className="flex gap-2 ml-auto flex-wrap">
            <button onClick={replayMeasure}
              className="flex items-center gap-1.5 rounded-xl border border-accent/35 bg-accent/12 px-3.5 py-2 text-sm text-accent-light hover:bg-accent/22 transition-colors">
              <RotateCcw size={13} />
              Re-record
            </button>
            <button onClick={deleteMeasureNotes}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm transition-colors ${
                deletedMeasures.has(selectedMeasure)
                  ? 'border border-rose-500/45 bg-rose-500/12 text-rose-400 hover:bg-rose-500/22'
                  : 'border border-border bg-card text-text-secondary hover:text-rose-400 hover:border-rose-500/35'
              }`}>
              <Trash2 size={13} />
              {deletedMeasures.has(selectedMeasure) ? 'Remove Measure' : 'Clear Notes'}
            </button>
            <button onClick={() => setSelectedMeasure(null)}
              className="rounded-xl border border-border px-3.5 py-2 text-sm text-muted hover:text-text-secondary transition-colors">
              Deselect
            </button>
          </div>
        </div>
      )}

      {showSave && <SaveSongDialog defaultName="" onSave={handleSave} onClose={() => setShowSave(false)} />}
    </div>
  );
}
