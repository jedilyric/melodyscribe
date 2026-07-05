import { Measure, NoteEvent } from '@/types';
import { midiToVexKey, frequencyToMidi, fillWithRests } from './noteUtils';
import { v4 as uuidv4 } from 'uuid';
import type { NoteDuration } from '@/types';

// Krumhansl-Schmuckler tonal hierarchy profiles
const KK_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KK_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

const MAJOR_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MINOR_NAMES = ['Cm', 'Dbm', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'Abm', 'Am', 'Bbm', 'Bm'];
const SUPPORTED_MINOR = new Set(['Am', 'Em', 'Bm', 'Dm', 'Gm', 'Cm', 'Fm']);
// For unsupported minor keys, fall back to relative major
const MINOR_REL_MAJOR: Record<string, string> = {
  Dbm: 'E', Ebm: 'Gb', 'F#m': 'A', Abm: 'B', Bbm: 'Db',
};

function pearsonR(a: number[], b: number[]): number {
  const n = a.length;
  const ma = a.reduce((s, x) => s + x, 0) / n;
  const mb = b.reduce((s, x) => s + x, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da  += (a[i] - ma) ** 2;
    db  += (b[i] - mb) ** 2;
  }
  return num / (Math.sqrt(da * db) + 1e-10);
}

export function detectKeyFromMidi(midiNotes: number[]): string {
  if (midiNotes.length < 8) return 'C';

  const hist = new Array(12).fill(0);
  midiNotes.forEach(m => hist[((m % 12) + 12) % 12]++);
  const total = hist.reduce((a, b) => a + b, 0);
  const norm = hist.map(h => h / total);

  let bestKey = 'C';
  let bestCorr = -2;

  for (let root = 0; root < 12; root++) {
    // Rotate the histogram so root becomes index 0
    const shifted = [...Array(12)].map((_, i) => norm[(i + root) % 12]);

    const majorCorr = pearsonR(shifted, KK_MAJOR);
    if (majorCorr > bestCorr) { bestCorr = majorCorr; bestKey = MAJOR_NAMES[root]; }

    const minorCorr = pearsonR(shifted, KK_MINOR);
    if (minorCorr > bestCorr) {
      bestCorr = minorCorr;
      const candidate = MINOR_NAMES[root];
      bestKey = SUPPORTED_MINOR.has(candidate)
        ? candidate
        : (MINOR_REL_MAJOR[candidate] ?? MAJOR_NAMES[root]);
    }
  }

  return bestKey;
}

export function detectTempo(channelData: Float32Array, sampleRate: number): number {
  const FRAME = 512;
  const HOP   = 256;

  // Compute RMS energy per frame
  const energies: number[] = [];
  for (let i = 0; i + FRAME <= channelData.length; i += HOP) {
    let sum = 0;
    for (let j = i; j < i + FRAME; j++) sum += channelData[j] ** 2;
    energies.push(Math.sqrt(sum / FRAME));
  }

  if (energies.length < 20) return 120; // too short to analyze

  // Half-wave rectified first difference (onset strength)
  const odf: number[] = [0];
  for (let i = 1; i < energies.length; i++) {
    odf.push(Math.max(0, energies[i] - energies[i - 1]));
  }

  const fps = sampleRate / HOP;
  const minLag = Math.max(1, Math.round(fps * 60 / 220));
  const maxLag = Math.min(odf.length - 1, Math.round(fps * 60 / 50));

  let bestLag = Math.round(fps * 60 / 120);
  let bestCorr = -1;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    const n = odf.length - lag;
    for (let i = 0; i < n; i++) corr += odf[i] * odf[i + lag];
    if (corr > bestCorr) { bestCorr = corr; bestLag = lag; }
  }

  const rawBpm = (fps * 60) / bestLag;

  // Resolve tempo ambiguity: prefer double/half if very far from common tempos
  let bpm = rawBpm;
  if (bpm < 55) bpm *= 2;
  if (bpm > 185) bpm /= 2;

  // Round to nearest common tempo (multiples of 2 or 5)
  const rounded = Math.round(bpm / 2) * 2;
  return Math.min(200, Math.max(50, rounded));
}

// Quick analysis of the whole file for tempo + key (runs before instrument selection)
export async function analyzeAudioFile(
  channelData: Float32Array,
  sampleRate: number,
): Promise<{ tempo: number; key: string }> {
  const tempo = detectTempo(channelData, sampleRate);

  // Pitch detection pass with wide frequency range for key analysis
  const { PitchDetector } = await import('pitchy');
  const WINDOW = 2048;
  const HOP    = 1024; // larger hop for speed

  const detector = PitchDetector.forFloat32Array(WINDOW);
  const allMidi: number[] = [];

  for (let pos = 0; pos + WINDOW <= channelData.length; pos += HOP) {
    const win = channelData.slice(pos, pos + WINDOW);
    const [pitch, clarity] = detector.findPitch(win, sampleRate);
    if (clarity > 0.75 && pitch > 60 && pitch < 4200) {
      const midi = Math.round(frequencyToMidi(pitch));
      if (midi >= 21 && midi <= 108) allMidi.push(midi);
    }
  }

  const key = detectKeyFromMidi(allMidi);
  return { tempo, key };
}

// Improved per-instrument transcription using note segmentation
export async function transcribeInstrumentPart(
  channelData: Float32Array,
  sampleRate: number,
  tempo: number,
  timeSig: string,
  lowFreq: number,
  highFreq: number,
  clef: 'treble' | 'bass' | 'alto',
): Promise<{ measures: Measure[]; detectedMidi: number[] }> {
  const { PitchDetector } = await import('pitchy');

  const WINDOW = 2048;
  const HOP    = 256; // smaller hop = better time resolution

  const detector = PitchDetector.forFloat32Array(WINDOW);
  const staveClef = clef === 'alto' ? 'treble' : (clef as 'treble' | 'bass');
  const restKey   = staveClef === 'bass' ? 'd/3' : 'b/4';

  // ── Step 1: Detect pitch at every HOP ───────────────────────────────────
  const rawMidi: (number | null)[] = [];

  for (let pos = 0; pos + WINDOW <= channelData.length; pos += HOP) {
    const win = channelData.slice(pos, pos + WINDOW);
    const [pitch, clarity] = detector.findPitch(win, sampleRate);

    if (clarity > 0.78 && pitch >= lowFreq && pitch <= highFreq) {
      const midi = Math.round(frequencyToMidi(pitch));
      rawMidi.push(midi >= 21 && midi <= 108 ? midi : null);
    } else {
      rawMidi.push(null);
    }
  }

  // ── Step 2: Median filter (window=7) to suppress jitter ────────────────
  const R = 3; // half-window
  const smoothed: (number | null)[] = rawMidi.map((_, i) => {
    const nbrs = rawMidi
      .slice(Math.max(0, i - R), i + R + 1)
      .filter((m): m is number => m !== null)
      .sort((a, b) => a - b);
    if (nbrs.length === 0) return null;
    return nbrs[Math.floor(nbrs.length / 2)];
  });

  // ── Step 3: Group consecutive frames into note segments ────────────────
  type Seg = { midi: number | null; count: number };
  const segs: Seg[] = [];
  if (smoothed.length === 0) return { measures: [], detectedMidi: [] };

  let cur: Seg = { midi: smoothed[0] ?? null, count: 1 };
  for (let i = 1; i < smoothed.length; i++) {
    const m = smoothed[i];
    const same =
      m === null
        ? cur.midi === null
        : cur.midi !== null && Math.abs(m - cur.midi) <= 1;

    if (same) {
      if (m !== null && cur.midi !== null) cur.midi = Math.round((cur.midi * cur.count + m) / (cur.count + 1));
      cur.count++;
    } else {
      segs.push({ ...cur });
      cur = { midi: m ?? null, count: 1 };
    }
  }
  segs.push(cur);

  const detectedMidi = segs
    .filter(s => s.midi !== null && s.count >= 4)
    .map(s => s.midi as number);

  // ── Step 4: Convert segments → measure layout ───────────────────────────
  const beatSec = 60 / tempo;
  const hopSec  = HOP / sampleRate;
  const [beatsPerMeasure] = timeSig.split('/').map(Number);

  const DUR_TABLE: { dur: NoteDuration; beats: number }[] = [
    { dur: 'w',  beats: 4    },
    { dur: 'h',  beats: 2    },
    { dur: 'q',  beats: 1    },
    { dur: '8',  beats: 0.5  },
    { dur: '16', beats: 0.25 },
  ];

  function snapToDuration(rawBeats: number): { dur: NoteDuration; beats: number } {
    let best = DUR_TABLE[2]; // default: quarter
    let minErr = Infinity;
    for (const d of DUR_TABLE) {
      const err = Math.abs(d.beats - rawBeats);
      if (err < minErr) { minErr = err; best = d; }
    }
    return best;
  }

  const allMeasures: Measure[] = [];
  let curEvents: NoteEvent[] = [];
  let beatsUsed = 0;

  function flushMeasure() {
    const filled = fillWithRests(curEvents, timeSig, staveClef);
    allMeasures.push(
      staveClef === 'bass'
        ? { id: uuidv4(), trebleEvents: [],     bassEvents: filled, isComplete: true }
        : { id: uuidv4(), trebleEvents: filled, bassEvents: [],     isComplete: true }
    );
    curEvents  = [];
    beatsUsed  = 0;
  }

  for (const seg of segs) {
    // Skip very short segments (< 2 hops = likely noise)
    if (seg.count < 3) continue;

    const rawBeats = (seg.count * hopSec) / beatSec;
    if (rawBeats < 0.2) continue;

    // A single long segment may span multiple measures — split it
    let remaining = rawBeats;

    while (remaining >= 0.2) {
      const space = beatsPerMeasure - beatsUsed;

      if (space < 0.15) {
        flushMeasure();
        continue;
      }

      const toPlace = Math.min(remaining, space);
      const snapped = snapToDuration(toPlace);

      // If the snapped value doesn't fit, try the next smaller
      const fits = snapped.beats <= space + 0.05;
      const placed = fits ? snapped : snapToDuration(space * 0.9);

      if (placed.beats < 0.2 || placed.beats > space + 0.05) {
        flushMeasure();
        continue;
      }

      if (seg.midi !== null) {
        const { key: vexKey, accidental } = midiToVexKey(seg.midi);
        curEvents.push({
          id:          uuidv4(),
          midiNotes:   [seg.midi],
          keys:        [vexKey],
          accidentals: [accidental],
          duration:    placed.dur,
          isRest:      false,
          clef:        staveClef,
        });
      } else {
        curEvents.push({
          id:          uuidv4(),
          midiNotes:   [],
          keys:        [restKey],
          accidentals: [null],
          duration:    placed.dur,
          isRest:      true,
          clef:        staveClef,
        });
      }

      beatsUsed += placed.beats;
      remaining -= toPlace;

      if (beatsUsed >= beatsPerMeasure - 0.05) flushMeasure();
    }
  }

  if (curEvents.length > 0) flushMeasure();

  // Guarantee at least one measure
  if (allMeasures.length === 0) {
    const filled = fillWithRests([], timeSig, staveClef);
    allMeasures.push(
      staveClef === 'bass'
        ? { id: uuidv4(), trebleEvents: [],     bassEvents: filled, isComplete: true }
        : { id: uuidv4(), trebleEvents: filled, bassEvents: [],     isComplete: true }
    );
  }

  return { measures: allMeasures.slice(0, 64), detectedMidi };
}
