import { NoteDuration, NoteEvent, Measure, KeySignature } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const NOTE_BASES = ['c', 'c', 'd', 'd', 'e', 'f', 'f', 'g', 'g', 'a', 'a', 'b'] as const;
const NOTE_ACCS = [null, '#', null, '#', null, null, '#', null, '#', null, '#', null] as const;
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export const BEAT_VALUES: Record<NoteDuration | string, number> = {
  w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25,
};

// Key signature → semitones above C for each sharp/flat key
const KEY_ROOT_SEMITONE: Record<string, number> = {
  C: 0, G: 7, D: 2, A: 9, E: 4, B: 11, 'F#': 6, 'Gb': 6,
  F: 5, Bb: 10, Eb: 3, Ab: 8, Db: 1, Cb: 11,
  Am: 0, Em: 7, Bm: 2, 'F#m': 9, 'C#m': 4, 'G#m': 11, 'D#m': 6,
  Dm: 5, Gm: 10, Cm: 3, Fm: 8, Bbm: 3, Ebm: 8, Abm: 1,
};

// Which notes are altered by the key signature (as semitone indices 0-11)
const KEY_SIGNATURE_NOTES: Record<string, number[]> = {
  C: [], Am: [],
  G: [6], Em: [6],
  D: [6, 1], Bm: [6, 1],
  A: [6, 1, 8], 'F#m': [6, 1, 8],
  E: [6, 1, 8, 3], 'C#m': [6, 1, 8, 3],
  B: [6, 1, 8, 3, 10], 'G#m': [6, 1, 8, 3, 10],
  'F#': [6, 1, 8, 3, 10, 5], 'D#m': [6, 1, 8, 3, 10, 5],
  F: [10], Dm: [10],
  Bb: [10, 3], Gm: [10, 3],
  Eb: [10, 3, 8], Cm: [10, 3, 8],
  Ab: [10, 3, 8, 1], Fm: [10, 3, 8, 1],
  Db: [10, 3, 8, 1, 6], Bbm: [10, 3, 8, 1, 6],
  Gb: [10, 3, 8, 1, 6, 11], Ebm: [10, 3, 8, 1, 6, 11],
};

export function midiToVexKey(midi: number): { key: string; accidental: string | null } {
  const octave = Math.floor(midi / 12) - 1;
  const semitone = midi % 12;
  const base = NOTE_BASES[semitone];
  const acc = NOTE_ACCS[semitone];
  const key = acc ? `${base}${acc}/${octave}` : `${base}/${octave}`;
  return { key, accidental: acc };
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function frequencyToMidi(freq: number): number {
  return Math.round(69 + 12 * Math.log2(freq / 440));
}

export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]}${octave}`;
}

export function quantizeDuration(durationMs: number, tempo: number): NoteDuration {
  const beatMs = 60000 / tempo;
  const durations: [NoteDuration, number][] = [
    ['w', beatMs * 4],
    ['h', beatMs * 2],
    ['q', beatMs],
    ['8', beatMs / 2],
    ['16', beatMs / 4],
  ];
  let best: NoteDuration = 'q';
  let minDiff = Infinity;
  for (const [name, ms] of durations) {
    const diff = Math.abs(durationMs - ms);
    if (diff < minDiff) { minDiff = diff; best = name; }
  }
  return best;
}

export function beatsForDuration(dur: NoteDuration, beatValue: number): number {
  const whole = beatValue;
  const map: Record<NoteDuration, number> = {
    w: whole, h: whole / 2, q: whole / 4, '8': whole / 8, '16': whole / 16,
  };
  return map[dur] ?? 1;
}

export function measureBeats(events: NoteEvent[], timeSignature: string): number {
  const [beatsPerMeasure] = timeSignature.split('/').map(Number);
  return events.reduce((sum, e) => sum + BEAT_VALUES[e.duration], 0);
}

export function makeRestEvent(duration: NoteDuration, clef: 'treble' | 'bass'): NoteEvent {
  return {
    id: uuidv4(),
    midiNotes: [],
    keys: [clef === 'treble' ? 'b/4' : 'd/3'],
    accidentals: [null],
    duration,
    isRest: true,
    clef,
  };
}

export function fillWithRests(events: NoteEvent[], timeSignature: string, clef: 'treble' | 'bass'): NoteEvent[] {
  const [beatsPerMeasure] = timeSignature.split('/').map(Number);
  const totalBeats = events.reduce((s, e) => s + BEAT_VALUES[e.duration], 0);
  const remaining = beatsPerMeasure - totalBeats;

  if (remaining <= 0) return events;
  const result = [...events];

  const restDurations: NoteDuration[] = ['w', 'h', 'q', '8', '16'];
  let rem = remaining;
  for (const dur of restDurations) {
    const beats = BEAT_VALUES[dur];
    while (rem >= beats - 0.001) {
      result.push(makeRestEvent(dur, clef));
      rem -= beats;
    }
  }
  return result;
}

export function transposeNote(midi: number, fromKey: string, toKey: string): number {
  const from = KEY_ROOT_SEMITONE[fromKey] ?? 0;
  const to = KEY_ROOT_SEMITONE[toKey] ?? 0;
  return midi + (to - from);
}

export function transposeMeasures(measures: Measure[], fromKey: string, toKey: string): Measure[] {
  if (fromKey === toKey) return measures;
  const transposeEvents = (events: NoteEvent[]): NoteEvent[] =>
    events.map(event => {
      if (event.isRest || event.midiNotes.length === 0) return event;
      const newMidis = event.midiNotes.map(m => transposeNote(m, fromKey, toKey));
      const vexKeys = newMidis.map(m => midiToVexKey(m));
      return {
        ...event,
        id: uuidv4(),
        midiNotes: newMidis,
        keys: vexKeys.map(v => v.key),
        accidentals: vexKeys.map(v => v.accidental),
      };
    });

  return measures.map(m => ({
    ...m,
    id: uuidv4(),
    trebleEvents: transposeEvents(m.trebleEvents),
    bassEvents: transposeEvents(m.bassEvents),
  }));
}

export function vexKeySignature(key: string): string {
  const map: Record<string, string> = {
    C: 'C', G: 'G', D: 'D', A: 'A', E: 'E', B: 'B', 'F#': 'F#',
    F: 'F', Bb: 'Bb', Eb: 'Eb', Ab: 'Ab', Db: 'Db', Gb: 'Gb',
    Am: 'C', Em: 'G', Bm: 'D', 'F#m': 'A', 'C#m': 'E', 'G#m': 'B',
    Dm: 'F', Gm: 'Bb', Cm: 'Eb', Fm: 'Ab', Bbm: 'Db', Ebm: 'Gb',
  };
  return map[key] ?? 'C';
}

export function needsAccidental(semitone: number, keySignature: string): boolean {
  const keyNotes = KEY_SIGNATURE_NOTES[keySignature] ?? [];
  const hasAcc = NOTE_ACCS[semitone] !== null;
  return hasAcc && !keyNotes.includes(semitone);
}
