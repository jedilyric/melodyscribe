'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Upload, FileMusic, Play, Pause, Square, Loader2,
  Download, Save, ChevronDown, X, AlertCircle, AudioWaveform,
} from 'lucide-react';
import SheetMusic, { SheetMusicHandle } from '@/components/SheetMusic';
import SaveSongDialog from '@/components/SaveSongDialog';
import { Measure, NoteEvent, KEYS, TIME_SIGNATURES } from '@/types';
import { midiToVexKey, frequencyToMidi, fillWithRests, transposeMeasures } from '@/lib/noteUtils';
import { generatePDF } from '@/lib/pdfGenerator';
import { v4 as uuidv4 } from 'uuid';

const DOWNLOAD_KEYS = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab', 'Db'];
const WINDOW_SIZE = 2048;
const HOP_SIZE = 512;

async function analyzePitch(audioBuffer: AudioBuffer, tempo: number, timeSig: string): Promise<Measure[]> {
  const { PitchDetector } = await import('pitchy');
  const [beatsPerMeasure] = timeSig.split('/').map(Number);
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);
  const beatSamples = Math.round((60 / tempo) * sampleRate);
  const measureSamples = beatSamples * beatsPerMeasure;

  const detector = PitchDetector.forFloat32Array(WINDOW_SIZE);
  const measures: Measure[] = [];

  const totalSamples = channelData.length;
  let measureStart = 0;

  while (measureStart < totalSamples) {
    const measureEnd = Math.min(measureStart + measureSamples, totalSamples);
    const trebleEvents: NoteEvent[] = [];
    const bassEvents: NoteEvent[] = [];
    let pos = measureStart;
    const eventBeats = beatSamples / 4; // 16th-note resolution

    while (pos + WINDOW_SIZE <= measureEnd) {
      const window = channelData.slice(pos, pos + WINDOW_SIZE);
      const [pitch, clarity] = detector.findPitch(window, sampleRate);
      const durationBeats = Math.round((WINDOW_SIZE / beatSamples) * 4) / 4;
      const dur = durationBeats >= 4 ? 'w' : durationBeats >= 2 ? 'h' : durationBeats >= 1 ? 'q' : durationBeats >= 0.5 ? '8' : '16';

      if (pitch > 50 && clarity > 0.85) {
        const midi = frequencyToMidi(pitch);
        if (midi >= 21 && midi <= 108) {
          const { key: vexKey, accidental } = midiToVexKey(midi);
          const clef = midi >= 60 ? 'treble' : 'bass';
          const evt: NoteEvent = {
            id: uuidv4(),
            midiNotes: [midi],
            keys: [vexKey],
            accidentals: [accidental],
            duration: dur,
            isRest: false,
            clef,
          };
          if (clef === 'treble') trebleEvents.push(evt);
          else bassEvents.push(evt);
        }
      } else {
        const restEvt: NoteEvent = {
          id: uuidv4(),
          midiNotes: [],
          keys: ['b/4'],
          accidentals: [null],
          duration: dur,
          isRest: true,
          clef: 'treble',
        };
        trebleEvents.push(restEvt);
      }

      pos += HOP_SIZE;
    }

    const filledTreble = fillWithRests(trebleEvents.slice(0, beatsPerMeasure * 4), timeSig, 'treble');
    const filledBass = fillWithRests(bassEvents.slice(0, beatsPerMeasure * 4), timeSig, 'bass');

    measures.push({ id: uuidv4(), trebleEvents: filledTreble, bassEvents: filledBass, isComplete: true });
    measureStart += measureSamples;
  }

  return measures;
}

export default function UploadPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [key, setKey] = useState('C');
  const [tempo, setTempo] = useState(120);
  const [timeSig, setTimeSig] = useState('4/4');
  const [lyrics, setLyrics] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState('');
  const [measures, setMeasures] = useState<Measure[]>([]);
  const [progress, setProgress] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [selectedMeasure, setSelectedMeasure] = useState<number | null>(null);
  const [showSave, setShowSave] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const sheetMusicRef = useRef<SheetMusicHandle>(null);

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setMeasures([]);
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
    setMeasures([]);
    setProcessError('');
  }

  async function processAudio() {
    if (!file) return;
    setIsProcessing(true);
    setProcessError('');
    setProgress(5);

    try {
      const arrayBuffer = await file.arrayBuffer();
      setProgress(20);

      const audioCtx = new AudioContext();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      setProgress(40);

      const detectedMeasures = await analyzePitch(audioBuffer, tempo, timeSig);
      setProgress(90);

      setMeasures(detectedMeasures.slice(0, 32)); // cap at 32 measures
      setProgress(100);
    } catch (err) {
      setProcessError('Could not process audio. Please try a different file or adjust tempo/key settings.');
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

  async function handleSave(name: string) {
    const body = { name, type: 'upload', key, tempo, time_signature: timeSig, measures, lyrics };
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
    await generatePDF({ title: file?.name?.replace(/\.[^.]+$/, '') ?? 'Transcription', key, targetKey, tempo, timeSignature: timeSig, measures: transposed, lyrics, svgElement: svgEl });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Upload size={22} className="text-emerald-400" />
            Audio Transcription
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Upload an audio file and we'll transcribe it to sheet music.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {measures.length > 0 && session && (
            <button onClick={() => setShowSave(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
              <Save size={14} />
              Save
            </button>
          )}
          {measures.length > 0 && (
            <div className="relative">
              <button onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-sm text-white hover:bg-emerald-400 transition-colors">
                <Download size={14} />
                Download PDF
                <ChevronDown size={12} />
              </button>
              {showDownloadMenu && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-border bg-card shadow-xl py-1.5 z-50">
                  <div className="px-3 py-1 text-xs text-muted font-medium">Choose key</div>
                  {DOWNLOAD_KEYS.map(k => (
                    <button key={k} onClick={() => downloadPdf(k)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-surface transition-colors ${k === key ? 'text-emerald-400' : 'text-text-secondary'}`}>
                      {k}{k === key ? ' (original)' : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Drop zone */}
      {!file ? (
        <div {...getRootProps()}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16 px-8 cursor-pointer transition-all ${isDragActive ? 'border-emerald-400 bg-emerald-500/10' : 'border-border bg-card hover:border-emerald-500/50 hover:bg-card'}`}>
          <input {...getInputProps()} />
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 mb-4">
            <Upload size={28} className="text-emerald-400" />
          </div>
          <p className="text-lg font-semibold text-text-primary mb-1">
            {isDragActive ? 'Drop it here!' : 'Drop your audio file'}
          </p>
          <p className="text-sm text-text-secondary text-center">
            MP3, MP4, WAV, M4A, AAC supported — or <span className="text-emerald-400 underline">browse files</span>
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 flex-shrink-0">
              <FileMusic size={18} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
              <p className="text-xs text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <div className="flex items-center gap-2">
              {audioUrl && (
                <button onClick={togglePlayback}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-surface transition-colors">
                  {isPlaying ? <Pause size={15} className="text-text-secondary" /> : <Play size={15} className="text-text-secondary" />}
                </button>
              )}
              <button onClick={clearFile}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-surface text-muted hover:text-rose-400 transition-colors">
                <X size={15} />
              </button>
            </div>
          </div>
          {audioUrl && (
            <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="w-full h-10" controls />
          )}
        </div>
      )}

      {/* Settings */}
      <div className="flex flex-wrap gap-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-1.5 min-w-[100px]">
          <label className="text-xs font-medium text-text-secondary">Key</label>
          <select value={key} onChange={e => setKey(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-emerald-400 focus:outline-none">
            {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 min-w-[100px]">
          <label className="text-xs font-medium text-text-secondary">Time Signature</label>
          <select value={timeSig} onChange={e => setTimeSig(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-emerald-400 focus:outline-none">
            {TIME_SIGNATURES.map(ts => <option key={ts} value={ts}>{ts}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
          <label className="text-xs font-medium text-text-secondary">Tempo: {tempo} BPM</label>
          <input type="range" min={40} max={240} value={tempo} onChange={e => setTempo(Number(e.target.value))} className="w-full accent-emerald-400" />
        </div>
        <div className="flex items-end">
          <button onClick={processAudio} disabled={!file || isProcessing}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <AudioWaveform size={15} />}
            {isProcessing ? `Analyzing… ${progress}%` : 'Transcribe'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {isProcessing && (
        <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
          <div className="h-full bg-emerald-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Error */}
      {processError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          <div>
            <p>{processError}</p>
            <p className="text-xs text-rose-400/70 mt-1">Tip: Monophonic recordings (single instrument playing one note at a time) work best.</p>
          </div>
        </div>
      )}

      {/* Sheet music */}
      {measures.length > 0 && (
        <>
          <div className="sheet-music-wrap">
            <SheetMusic
              ref={sheetMusicRef}
              measures={measures}
              timeSignature={timeSig}
              keySignature={key}
              selectedMeasure={selectedMeasure}
              onSelectMeasure={setSelectedMeasure}
            />
          </div>

          {/* Lyrics editor */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Lyrics <span className="text-muted text-xs">(optional — will be included in PDF)</span>
            </label>
            <textarea
              value={lyrics}
              onChange={e => setLyrics(e.target.value)}
              placeholder="Type or paste lyrics here…"
              rows={5}
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-muted focus:border-emerald-400 focus:outline-none resize-y"
            />
          </div>
        </>
      )}

      {!session && measures.length > 0 && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-400 text-center">
          <button onClick={() => router.push('/login')} className="underline underline-offset-2 hover:text-amber-300">Sign in</button> to save this transcription to your library.
        </div>
      )}

      {showSave && <SaveSongDialog onSave={handleSave} onClose={() => setShowSave(false)} />}
    </div>
  );
}
