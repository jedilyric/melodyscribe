'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload, FileMusic, Play, Pause, Loader2,
  Download, Save, ChevronDown, X, AlertCircle,
  AudioWaveform, ListMusic, ChevronRight, Layers,
} from 'lucide-react';
import MultiStaffSheet, { MultiStaffSheetHandle, InstrumentPart } from '@/components/MultiStaffSheet';
import SheetMusic, { SheetMusicHandle } from '@/components/SheetMusic';
import SaveSongDialog from '@/components/SaveSongDialog';
import InstrumentPicker from '@/components/InstrumentPicker';
import { Measure, NoteEvent, KEYS, TIME_SIGNATURES } from '@/types';
import { midiToVexKey, frequencyToMidi, fillWithRests, transposeMeasures } from '@/lib/noteUtils';
import { generatePDF } from '@/lib/pdfGenerator';
import { saveSong } from '@/lib/storage';
import { ALL_INSTRUMENTS, getInstrument } from '@/lib/instruments';
import { v4 as uuidv4 } from 'uuid';

const DOWNLOAD_KEYS = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab', 'Db'];
const WINDOW_SIZE = 2048;
const HOP_SIZE = 512;

async function analyzePitchForInstrument(
  channelData: Float32Array,
  sampleRate: number,
  tempo: number,
  timeSig: string,
  lowFreq: number,
  highFreq: number,
  clef: 'treble' | 'bass' | 'alto',
): Promise<Measure[]> {
  const { PitchDetector } = await import('pitchy');
  const [beatsPerMeasure] = timeSig.split('/').map(Number);
  const beatSamples = Math.round((60 / tempo) * sampleRate);
  const measureSamples = beatSamples * beatsPerMeasure;

  // Apply a simple bandpass: zero out samples that aren't in the instrument's range
  // We do this by detecting pitch and only keeping notes in range
  const detector = PitchDetector.forFloat32Array(WINDOW_SIZE);
  const measures: Measure[] = [];
  const staveClef = clef === 'alto' ? 'treble' : clef;
  const restKey = staveClef === 'bass' ? 'd/3' : 'b/4';

  let measureStart = 0;
  const totalSamples = channelData.length;

  while (measureStart < totalSamples) {
    const measureEnd = Math.min(measureStart + measureSamples, totalSamples);
    const events: NoteEvent[] = [];
    let pos = measureStart;

    while (pos + WINDOW_SIZE <= measureEnd) {
      const window = channelData.slice(pos, pos + WINDOW_SIZE);
      const [pitch, clarity] = detector.findPitch(window, sampleRate);
      const beatFraction = WINDOW_SIZE / beatSamples;
      const beatRounded = Math.round(beatFraction * 4) / 4;
      const dur = beatRounded >= 4 ? 'w' : beatRounded >= 2 ? 'h' : beatRounded >= 1 ? 'q' : beatRounded >= 0.5 ? '8' : '16';

      if (pitch >= lowFreq && pitch <= highFreq && clarity > 0.82) {
        const midi = frequencyToMidi(pitch);
        if (midi >= 21 && midi <= 108) {
          const { key: vexKey, accidental } = midiToVexKey(midi);
          events.push({
            id: uuidv4(),
            midiNotes: [midi],
            keys: [vexKey],
            accidentals: [accidental],
            duration: dur,
            isRest: false,
            clef: staveClef as 'treble' | 'bass',
          });
        } else {
          events.push({ id: uuidv4(), midiNotes: [], keys: [restKey], accidentals: [null], duration: dur, isRest: true, clef: staveClef as 'treble' | 'bass' });
        }
      } else {
        events.push({ id: uuidv4(), midiNotes: [], keys: [restKey], accidentals: [null], duration: dur, isRest: true, clef: staveClef as 'treble' | 'bass' });
      }
      pos += HOP_SIZE;
    }

    const capped = events.slice(0, beatsPerMeasure * 4);
    const filled = fillWithRests(capped, timeSig, staveClef as 'treble' | 'bass');

    if (staveClef === 'bass') {
      measures.push({ id: uuidv4(), trebleEvents: [], bassEvents: filled, isComplete: true });
    } else {
      measures.push({ id: uuidv4(), trebleEvents: filled, bassEvents: [], isComplete: true });
    }

    measureStart += measureSamples;
  }

  return measures;
}

export default function UploadPage() {
  const [key, setKey] = useState('C');
  const [tempo, setTempo] = useState(120);
  const [timeSig, setTimeSig] = useState('4/4');
  const [lyrics, setLyrics] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');

  // Instrument selection
  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState<string[]>(['violin']);
  const [showPicker, setShowPicker] = useState(false);

  // Results
  const [parts, setParts] = useState<InstrumentPart[]>([]);

  // Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [selectedMeasure, setSelectedMeasure] = useState<number | null>(null);
  const [showSave, setShowSave] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [savedId, setSavedId] = useState<string | undefined>(undefined);
  const multiSheetRef = useRef<MultiStaffSheetHandle>(null);

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setParts([]);
    setProcessError('');
    setProgress(0);
    const url = URL.createObjectURL(f);
    setAudioUrl(url);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/*': ['.mp3', '.wav', '.m4a', '.aac'], 'video/*': ['.mp4'] },
    maxFiles: 1,
  });

  function clearFile() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setFile(null);
    setAudioUrl(null);
    setParts([]);
    setProcessError('');
  }

  async function processAudio() {
    if (!file || selectedInstrumentIds.length === 0) return;
    setIsProcessing(true);
    setProcessError('');
    setProgress(5);
    setProgressLabel('Loading audio…');

    try {
      const arrayBuffer = await file.arrayBuffer();
      setProgress(15);

      const audioCtx = new AudioContext();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      setProgress(25);

      const resultParts: InstrumentPart[] = [];
      const step = 70 / selectedInstrumentIds.length;

      for (let i = 0; i < selectedInstrumentIds.length; i++) {
        const inst = getInstrument(selectedInstrumentIds[i]);
        if (!inst) continue;
        setProgressLabel(`Analyzing ${inst.name}…`);
        const measures = await analyzePitchForInstrument(
          channelData,
          sampleRate,
          tempo,
          timeSig,
          inst.lowFreq,
          inst.highFreq,
          inst.clef,
        );
        resultParts.push({ instrument: inst, measures: measures.slice(0, 32) });
        setProgress(25 + Math.round((i + 1) * step));
      }

      setParts(resultParts);
      setProgress(100);
      setProgressLabel('Done!');
      await audioCtx.close();
    } catch (err) {
      setProcessError('Could not process audio. Try a cleaner recording or adjust the tempo setting.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  }

  function togglePlayback() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }

  function handleSave(name: string) {
    const fallbackMeasures = parts[0]?.measures ?? [];
    const saved = saveSong({
      id: savedId,
      name,
      type: 'upload',
      key,
      tempo,
      time_signature: timeSig,
      measures: fallbackMeasures,
      lyrics,
      instrumentParts: parts.map(p => ({ instrumentId: p.instrument.id, measures: p.measures })),
    });
    setSavedId(saved.id);
    return Promise.resolve();
  }

  async function downloadPdf(targetKey: string) {
    setShowDownloadMenu(false);
    // For multi-staff PDF we use the first instrument's treble measures as a fallback
    // Full multi-staff PDF is complex; we export the visible SVG
    const svgEl = multiSheetRef.current?.getSvgElement();
    if (!svgEl || parts.length === 0) return;
    const firstMeasures = parts[0]?.measures ?? [];
    const transposed = targetKey !== key ? transposeMeasures(firstMeasures, key, targetKey) : firstMeasures;
    await generatePDF({
      title: file?.name?.replace(/\.[^.]+$/, '') ?? 'Transcription',
      key,
      targetKey,
      tempo,
      timeSignature: timeSig,
      measures: transposed,
      lyrics,
      svgElement: svgEl,
    });
  }

  const hasResults = parts.length > 0;

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15">
              <AudioWaveform size={19} className="text-emerald-400" />
            </div>
            Audio Transcription
          </h1>
          <p className="text-sm text-text-secondary mt-1 ml-11">
            Upload audio and transcribe it to a full orchestral score.
          </p>
        </div>
        {hasResults && (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSave(true)}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-text-secondary hover:text-text-primary hover:border-border-light transition-colors">
              <Save size={14} />
              Save
            </button>
            <div className="relative">
              <button onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors shadow-sm">
                <Download size={14} />
                PDF
                <ChevronDown size={12} />
              </button>
              {showDownloadMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-border bg-card shadow-xl py-1.5 z-50 animate-slide-up">
                  <div className="px-3 py-1.5 text-xs text-muted font-medium">Transpose to key</div>
                  {DOWNLOAD_KEYS.map(k => (
                    <button key={k} onClick={() => downloadPdf(k)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-surface transition-colors ${k === key ? 'text-emerald-400' : 'text-text-secondary'}`}>
                      {k}{k === key ? ' (original)' : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Drop zone */}
      {!file ? (
        <div {...getRootProps()}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16 px-8 cursor-pointer transition-all ${
            isDragActive
              ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
              : 'border-border bg-card hover:border-emerald-500/40 hover:bg-card-hover'
          }`}>
          <input {...getInputProps()} />
          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl mb-4 transition-all ${isDragActive ? 'bg-emerald-400/20 scale-110' : 'bg-emerald-500/12'}`}>
            <Upload size={28} className="text-emerald-400" />
          </div>
          <p className="text-lg font-semibold text-text-primary mb-1.5">
            {isDragActive ? 'Release to upload' : 'Drop your audio file here'}
          </p>
          <p className="text-sm text-text-secondary text-center">
            MP3 · WAV · M4A · AAC · MP4 supported
          </p>
          <p className="mt-2 text-xs text-muted">or <span className="text-emerald-400 underline underline-offset-2">click to browse</span></p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 flex-shrink-0">
              <FileMusic size={18} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">{file.name}</p>
              <p className="text-xs text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <div className="flex items-center gap-2">
              {audioUrl && (
                <button onClick={togglePlayback}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-surface transition-colors">
                  {isPlaying ? <Pause size={15} className="text-text-secondary" /> : <Play size={15} className="text-text-secondary" />}
                </button>
              )}
              <button onClick={clearFile}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted hover:text-rose-400 hover:border-rose-500/30 transition-colors">
                <X size={15} />
              </button>
            </div>
          </div>
          {audioUrl && (
            <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="w-full h-10" controls />
          )}
        </div>
      )}

      {/* Settings + Instrument picker */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
        {/* Music settings row */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1.5 min-w-[90px]">
            <label className="text-xs font-medium text-text-secondary">Key</label>
            <select value={key} onChange={e => setKey(e.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-emerald-400 focus:outline-none">
              {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-[105px]">
            <label className="text-xs font-medium text-text-secondary">Time Sig.</label>
            <select value={timeSig} onChange={e => setTimeSig(e.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-emerald-400 focus:outline-none">
              {TIME_SIGNATURES.map(ts => <option key={ts} value={ts}>{ts}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
            <label className="text-xs font-medium text-text-secondary">Tempo: <span className="text-text-primary font-semibold">{tempo} BPM</span></label>
            <input type="range" min={40} max={240} value={tempo} onChange={e => setTempo(Number(e.target.value))} className="w-full" />
          </div>
        </div>

        {/* Instrument selector */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers size={15} className="text-accent-light" />
              <span className="text-sm font-semibold text-text-primary">Instruments</span>
              {selectedInstrumentIds.length > 0 && (
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent-light font-medium">
                  {selectedInstrumentIds.length}
                </span>
              )}
            </div>
            <button onClick={() => setShowPicker(true)}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:border-accent/40 transition-colors">
              <ListMusic size={12} />
              Edit selection
              <ChevronRight size={10} />
            </button>
          </div>

          {selectedInstrumentIds.length === 0 ? (
            <button onClick={() => setShowPicker(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-4 text-sm text-muted hover:border-accent/40 hover:text-text-secondary transition-colors">
              <ListMusic size={16} />
              Click to choose instruments
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedInstrumentIds.map(id => {
                const inst = getInstrument(id);
                if (!inst) return null;
                return (
                  <div key={id} className="flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-xs text-accent-light">
                    <span>{inst.icon}</span>
                    <span>{inst.name}</span>
                    <button onClick={() => setSelectedInstrumentIds(ids => ids.filter(i => i !== id))}
                      className="text-accent-light/40 hover:text-accent-light/80 transition-colors">
                      <X size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Transcribe button */}
        <button
          onClick={processAudio}
          disabled={!file || isProcessing || selectedInstrumentIds.length === 0}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {isProcessing
            ? <><Loader2 size={16} className="animate-spin" />Analyzing… {progressLabel} {progress}%</>
            : <><AudioWaveform size={16} />Transcribe Audio</>
          }
        </button>
      </div>

      {/* Progress bar */}
      {isProcessing && (
        <div className="h-1 w-full rounded-full bg-border overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Error */}
      {processError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3">
          <AlertCircle size={15} className="text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-rose-400">{processError}</p>
            <p className="text-xs text-rose-400/60 mt-1">Tip: Works best with clear, isolated recordings. Try reducing the number of instruments.</p>
          </div>
        </div>
      )}

      {/* Multi-staff sheet music result */}
      {hasResults && (
        <>
          <div className="sheet-music-wrap">
            <MultiStaffSheet
              ref={multiSheetRef}
              parts={parts}
              timeSignature={timeSig}
              keySignature={key}
              selectedMeasure={selectedMeasure}
              onSelectMeasure={setSelectedMeasure}
            />
          </div>

          {/* Lyrics editor */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <label className="block text-sm font-semibold text-text-primary mb-0.5">
              Lyrics
            </label>
            <p className="text-xs text-text-secondary mb-3">Optional — will be included in the PDF export</p>
            <textarea
              value={lyrics}
              onChange={e => setLyrics(e.target.value)}
              placeholder="Type or paste lyrics here…"
              rows={5}
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-text-primary placeholder:text-muted focus:border-emerald-400 focus:outline-none resize-y font-mono"
            />
          </div>
        </>
      )}

      {/* Instrument picker modal */}
      {showPicker && (
        <InstrumentPicker
          selected={selectedInstrumentIds}
          onChange={setSelectedInstrumentIds}
          onClose={() => setShowPicker(false)}
          onConfirm={() => setShowPicker(false)}
        />
      )}

      {showSave && <SaveSongDialog onSave={handleSave} onClose={() => setShowSave(false)} />}
    </div>
  );
}
