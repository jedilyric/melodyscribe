export type Clef = 'treble' | 'bass';
export type NoteDuration = 'w' | 'h' | 'q' | '8' | '16';
export type SongType = 'keyboard' | 'upload';

export interface NoteEvent {
  id: string;
  midiNotes: number[];
  keys: string[];
  accidentals: (string | null)[];
  duration: NoteDuration;
  isRest: boolean;
  clef: Clef;
}

export interface Measure {
  id: string;
  trebleEvents: NoteEvent[];
  bassEvents: NoteEvent[];
  isComplete: boolean;
}

export interface InstrumentPart {
  instrumentId: string;
  measures: Measure[];
}

export interface Song {
  id?: string;
  user_id?: string;
  name: string;
  type: SongType;
  key: string;
  tempo: number;
  time_signature: string;
  measures: Measure[];
  lyrics: string;
  instrumentParts?: InstrumentPart[];
  created_at?: string;
  updated_at?: string;
}

export interface MidiNoteActive {
  midiNote: number;
  startTime: number;
  velocity: number;
}

export const KEYS = [
  'C', 'G', 'D', 'A', 'E', 'B', 'F#',
  'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
  'Am', 'Em', 'Bm', 'Dm', 'Gm', 'Cm', 'Fm',
] as const;

export const TIME_SIGNATURES = ['4/4', '3/4', '2/4', '6/8', '12/8'] as const;

export type KeySignature = typeof KEYS[number];
