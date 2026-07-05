'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload, FileMusic, Play, Pause, Loader2, Download, Save,
  ChevronDown, X, AlertCircle, AudioWaveform, ListMusic,
  ChevronRight, Layers, Sparkles, Music, RefreshCw,
} from 'lucide-react';
import MultiStaffSheet, { MultiStaffSheetHandle, InstrumentPart } from '@/components/MultiStaffSheet';
import SaveSongDialog from '@/components/SaveSongDialog';
import InstrumentPicker from '@/components/InstrumentPicker';
import { KEYS, TIME_SIGNATURES } from '@/types';
import { transposeMeasures } from '@/lib/noteUtils';
import { generatePDF } from '@/lib/pdfGenerator';
import { saveSong } from '@/lib/storage';
import { getInstrument } from '@/lib/instruments';
import { analyzeAudioFile, transcribeInstrumentPart, detectKeyFromMidi } from '@/lib/audioAnalysis';
import { v4 as uuidv4 } from 'uuid';

const DOWNLOAD_KEYS = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab', 'Db'];

export default function UploadPage() {
  // Score settings (auto-detected or user-overridden)
  const [key, setKey]       = useState('C');
  const [tempo, setTempo]   = useState(120);
  const [timeSig, setTimeSig] = useState('4/4');
  const [lyrics, setLyrics] = useState('');

  // File state
  const [file, setFile]     = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

  // Auto-detection state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedTempo, setDetectedTempo] = useState<number | null>(null);
  const [detectedKey, setDetectedKey] = useState<string | null>(null);
  const [tempoOverridden, setTempoOverridden] = useState(false);
  const [keyOverridden, setKeyOverridden] = useState(false);

  // Instrument selection
  const [selectedIds, setSelectedIds] = useState<string[]>(['violin']);
  const [showPicker, setShowPicker]   = useState(false);

  // Transcription results
  const [parts, setParts] = useState<InstrumentPart[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');

  // Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // UI state
  const [selectedMeasure, setSelectedMeasure] = useState<number | null>(null);
  const [showSave, setShowSave]               = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [savedId, setSavedId]                 = useState<string | undefined>();
  const multiSheetRef = useRef<MultiStaffSheetHandle>(null);

  // ── File drop ──────────────────────────────────────────────────────────
  const onDrop = useCallback(async (accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;

    setFile(f);
    setParts([]);
    setProcessError('');
    setProgress(0);
    setDetectedTempo(null);
    setDetectedKey(null);
    setTempoOverridden(false);
    setKeyOverridden(false);

    const url = URL.createObjectURL(f);
    setAudioUrl(url);

    // Auto-analyze tempo & key immediately
    setIsAnalyzing(true);
    try {
      const arrayBuffer = await f.arrayBuffer();
      const ctx = new AudioContext();
      const buf = await ctx.decodeAudioData(arrayBuffer);
      setAudioBuffer(buf);

      const channelData = buf.getChannelData(0);
      const { tempo: t, key: k } = await analyzeAudioFile(channelData, buf.sampleRate);

      setDetectedTempo(t);
      setDetectedKey(k);
      setTempo(t);
      setKey(k);
      await ctx.close();
    } catch {
      // Silently fall back to defaults if analysis fails
    } finally {
      setIsAnalyzing(false);
    }
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
    setAudioBuffer(null);
    setParts([]);
    setProcessError('');
    setDetectedTempo(null);
    setDetectedKey(null);
  }

  function revertTempo() { if (detectedTempo) { setTempo(detectedTempo); setTempoOverridden(false); } }
  function revertKey()   { if (detectedKey)   { setKey(detectedKey);     setKeyOverridden(false); } }

  // ── Transcription ──────────────────────────────────────────────────────
  async function processAudio() {
    if (!file || selectedIds.length === 0) return;

    setIsProcessing(true);
    setProcessError('');
    setProgress(5);
    setProgressLabel('Preparing…');

    try {
      let buf = audioBuffer;
      if (!buf) {
        const arrayBuffer = await file.arrayBuffer();
        const ctx = new AudioContext();
        buf = await ctx.decodeAudioData(arrayBuffer);
        setAudioBuffer(buf);
        await ctx.close();
      }

      const channelData = buf.getChannelData(0);
      const sampleRate  = buf.sampleRate;
      const step = 88 / selectedIds.length;
      const resultParts: InstrumentPart[] = [];
      const allDetectedMidi: number[] = [];

      for (let i = 0; i < selectedIds.length; i++) {
        const inst = getInstrument(selectedIds[i]);
        if (!inst) continue;
        setProgressLabel(`Analyzing ${inst.name}…`);
        setProgress(8 + Math.round(i * step));

        const { measures, detectedMidi } = await transcribeInstrumentPart(
          channelData,
          sampleRate,
          tempo,
          timeSig,
          inst.lowFreq,
          inst.highFreq,
          inst.clef,
        );

        resultParts.push({ instrument: inst, measures });
        allDetectedMidi.push(...detectedMidi);
      }

      // Refine key detection if not already overridden
      if (!keyOverridden && allDetectedMidi.length >= 8) {
        const refinedKey = detectKeyFromMidi(allDetectedMidi);
        setKey(refinedKey);
        setDetectedKey(refinedKey);
      }

      setParts(resultParts);
      setProgress(100);
      setProgressLabel('Done!');
    } catch (err) {
      setProcessError('Could not process the audio. Try a cleaner mono recording, or reduce the number of instruments.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  }

  function togglePlayback() {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else           { audioRef.current.play();  setIsPlaying(true); }
  }

  function handleSave(name: string) {
    const saved = saveSong({
      id: savedId,
      name,
      type: 'upload',
      key,
      tempo,
      time_signature: timeSig,
      measures: parts[0]?.measures ?? [],
      lyrics,
      instrumentParts: parts.map(p => ({ instrumentId: p.instrument.id, measures: p.measures })),
    });
    setSavedId(saved.id);
    return Promise.resolve();
  }

  async function downloadPdf(targetKey: string) {
    setShowDownloadMenu(false);
    const svgEl = multiSheetRef.current?.getSvgElement();
    if (!svgEl || parts.length === 0) return;
    const first = parts[0]?.measures ?? [];
    const transposed = targetKey !== key ? transposeMeasures(first, key, targetKey) : first;
    await generatePDF({
      title: file?.name?.replace(/\.[^.]+$/, '') ?? 'Transcription',
      key, targetKey, tempo, timeSignature: timeSig,
      measures: transposed, lyrics, svgElement: svgEl,
    });
  }

  const hasResults = parts.length > 0;

  return (
    <div className="space-y-5 pb-12">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 shadow-md shadow-emerald-500/30">
              <AudioWaveform size={18} className="text-white" />
            </div>
            Audio Transcription
          </h1>
          <p className="text-sm text-text-secondary mt-1 ml-11">
            Drop an audio file — tempo and key are detected automatically.
          </p>
        </div>
        {hasResults && (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSave(true)}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors shadow-sm">
              <Save size={14} />Save
            </button>
            <div className="relative">
              <button onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors shadow-accent">
                <Download size={14} />PDF<ChevronDown size={11} />
              </button>
              {showDownloadMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-border bg-card shadow-lg py-1.5 z-50 animate-slide-up">
                  <div className="px-3 py-1.5 text-xs text-muted font-semibold border-b border-border mb-1">Transpose to key</div>
                  {DOWNLOAD_KEYS.map(k => (
                    <button key={k} onClick={() => downloadPdf(k)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-surface transition-colors ${k === key ? 'text-accent font-semibold' : 'text-text-secondary'}`}>
                      {k}{k === key ? ' (current)' : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Drop zone ───────────────────────────────────────────────────── */}
      {!file ? (
        <div {...getRootProps()}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16 px-8 cursor-pointer transition-all ${
            isDragActive
              ? 'border-emerald-400 bg-emerald-500/6'
              : 'border-border bg-card hover:border-emerald-400/50 hover:bg-card-hover'
          }`}>
          <input {...getInputProps()} />
          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl mb-4 transition-all ${isDragActive ? 'bg-emerald-500/15 scale-110' : 'bg-surface border border-border'}`}>
            <Upload size={26} className={isDragActive ? 'text-emerald-500' : 'text-muted'} />
          </div>
          <p className="text-base font-semibold text-text-primary mb-1.5">
            {isDragActive ? 'Release to upload' : 'Drop your audio file here'}
          </p>
          <p className="text-sm text-text-secondary">MP3 · WAV · M4A · AAC · MP4</p>
          <p className="mt-1.5 text-xs text-muted">or <span className="text-accent underline underline-offset-2 cursor-pointer">browse files</span></p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-400/25 flex-shrink-0">
              <FileMusic size={18} className="text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">{file.name}</p>
              <p className="text-xs text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <div className="flex items-center gap-1.5">
              {audioUrl && (
                <button onClick={togglePlayback}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-surface transition-colors">
                  {isPlaying ? <Pause size={14} className="text-text-secondary" /> : <Play size={14} className="text-text-secondary" />}
                </button>
              )}
              <button onClick={clearFile}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:text-rose-500 hover:border-rose-400/40 transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>
          {audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="w-full h-9" controls />}
        </div>
      )}

      {/* ── Auto-detected settings ──────────────────────────────────────── */}
      {file && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-5">

          {/* Detection status banner */}
          {isAnalyzing ? (
            <div className="flex items-center gap-2.5 rounded-xl bg-gold-dim border border-gold/25 px-4 py-3">
              <Loader2 size={15} className="text-gold animate-spin flex-shrink-0" />
              <p className="text-sm text-gold font-medium">Detecting tempo and key…</p>
            </div>
          ) : detectedTempo !== null ? (
            <div className="flex items-start gap-2.5 rounded-xl bg-accent-dim border border-accent/20 px-4 py-3">
              <Sparkles size={15} className="text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-accent">Auto-detected</p>
                <p className="text-xs text-accent/70 mt-0.5">
                  Tempo <strong>{detectedTempo} BPM</strong> and key <strong>{detectedKey}</strong> were detected from the audio.
                  You can override them below.
                </p>
              </div>
            </div>
          ) : null}

          {/* Key + Time Sig + Tempo row */}
          <div className="flex flex-wrap gap-4 items-end">
            {/* Key */}
            <div className="flex flex-col gap-1.5 min-w-[95px]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text-secondary">Key</label>
                {keyOverridden && detectedKey && (
                  <button onClick={revertKey} className="text-xs text-accent hover:underline flex items-center gap-0.5">
                    <RefreshCw size={9} />reset
                  </button>
                )}
              </div>
              <select value={key}
                onChange={e => { setKey(e.target.value); setKeyOverridden(e.target.value !== detectedKey); }}
                className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none cursor-pointer">
                {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              {detectedKey && !keyOverridden && (
                <span className="text-xs text-accent flex items-center gap-1"><Sparkles size={9} />auto</span>
              )}
            </div>

            {/* Time Sig */}
            <div className="flex flex-col gap-1.5 min-w-[110px]">
              <label className="text-xs font-semibold text-text-secondary">Time Signature</label>
              <select value={timeSig} onChange={e => setTimeSig(e.target.value)}
                className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none cursor-pointer">
                {TIME_SIGNATURES.map(ts => <option key={ts} value={ts}>{ts}</option>)}
              </select>
            </div>

            {/* Tempo */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[170px]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text-secondary">
                  Tempo: <span className="text-text-primary font-bold">{tempo} BPM</span>
                </label>
                {tempoOverridden && detectedTempo && (
                  <button onClick={revertTempo} className="text-xs text-accent hover:underline flex items-center gap-0.5">
                    <RefreshCw size={9} />reset
                  </button>
                )}
              </div>
              <input type="range" min={40} max={220} value={tempo}
                onChange={e => { setTempo(Number(e.target.value)); setTempoOverridden(Number(e.target.value) !== detectedTempo); }}
                className="w-full" />
              {detectedTempo && !tempoOverridden && (
                <span className="text-xs text-accent flex items-center gap-1"><Sparkles size={9} />auto</span>
              )}
            </div>
          </div>

          {/* Instrument selector */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-accent" />
                <span className="text-sm font-semibold text-text-primary">Instruments</span>
                {selectedIds.length > 0 && (
                  <span className="rounded-full bg-accent-dim border border-accent/20 px-2 py-0.5 text-xs text-accent font-semibold">{selectedIds.length}</span>
                )}
              </div>
              <button onClick={() => setShowPicker(true)}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:border-border-dark transition-colors">
                <ListMusic size={11} />Edit <ChevronRight size={9} />
              </button>
            </div>
            {selectedIds.length === 0 ? (
              <button onClick={() => setShowPicker(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-4 text-sm text-muted hover:border-accent/40 hover:text-text-secondary transition-colors">
                <ListMusic size={15} />Choose instruments to transcribe
              </button>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {selectedIds.map(id => {
                  const inst = getInstrument(id);
                  if (!inst) return null;
                  return (
                    <div key={id} className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-text-secondary font-medium">
                      <span>{inst.icon}</span>
                      <span>{inst.name}</span>
                      <button onClick={() => setSelectedIds(ids => ids.filter(i => i !== id))}
                        className="text-muted hover:text-rose-500 transition-colors ml-0.5">
                        <X size={9} />
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
            disabled={!file || isProcessing || isAnalyzing || selectedIds.length === 0}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-accent"
          >
            {isProcessing
              ? <><Loader2 size={15} className="animate-spin" />{progressLabel} {progress > 0 ? `${progress}%` : ''}</>
              : <><Music size={15} />Transcribe to Sheet Music</>
            }
          </button>
        </div>
      )}

      {/* ── Progress bar ─────────────────────────────────────────────────── */}
      {isProcessing && (
        <div className="h-0.5 w-full rounded-full bg-border overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {processError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-400/30 bg-rose-400/8 px-4 py-3">
          <AlertCircle size={15} className="text-rose-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-rose-500 font-medium">{processError}</p>
            <p className="text-xs text-rose-400/70 mt-1">Best results come from clear, well-recorded monophonic audio. Try reducing the number of instruments selected.</p>
          </div>
        </div>
      )}

      {/* ── Multi-staff result ───────────────────────────────────────────── */}
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

          {/* Lyrics */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <label className="block text-sm font-semibold text-text-primary mb-0.5">Lyrics</label>
            <p className="text-xs text-text-secondary mb-3">Optional — included in the PDF export</p>
            <textarea
              value={lyrics}
              onChange={e => setLyrics(e.target.value)}
              placeholder="Type or paste lyrics here…"
              rows={5}
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-text-primary placeholder:text-muted focus:border-accent focus:outline-none resize-y font-mono"
            />
          </div>
        </>
      )}

      {/* Instrument picker modal */}
      {showPicker && (
        <InstrumentPicker
          selected={selectedIds}
          onChange={setSelectedIds}
          onClose={() => setShowPicker(false)}
          onConfirm={() => setShowPicker(false)}
        />
      )}

      {showSave && <SaveSongDialog onSave={handleSave} onClose={() => setShowSave(false)} />}
    </div>
  );
}
