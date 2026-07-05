export type InstrumentFamily = 'strings' | 'woodwinds' | 'brass' | 'keyboard' | 'voice';
export type StaveClef = 'treble' | 'bass' | 'alto';

export interface Instrument {
  id: string;
  name: string;
  shortName: string;
  family: InstrumentFamily;
  clef: StaveClef;
  lowFreq: number;   // Hz — lowest fundamental
  highFreq: number;  // Hz — highest fundamental
  transposition: number; // semitones (0 = concert pitch)
  icon: string;
}

export const INSTRUMENT_FAMILIES: { id: InstrumentFamily; label: string; icon: string }[] = [
  { id: 'strings',    label: 'Strings',    icon: '🎻' },
  { id: 'woodwinds',  label: 'Woodwinds',  icon: '🎷' },
  { id: 'brass',      label: 'Brass',      icon: '🎺' },
  { id: 'keyboard',   label: 'Keyboard',   icon: '🎹' },
  { id: 'voice',      label: 'Voice',      icon: '🎤' },
];

export const ALL_INSTRUMENTS: Instrument[] = [
  // Strings
  { id: 'violin',     name: 'Violin',           shortName: 'Vln.',  family: 'strings',   clef: 'treble', lowFreq: 196,  highFreq: 3520, transposition: 0,   icon: '🎻' },
  { id: 'viola',      name: 'Viola',            shortName: 'Vla.',  family: 'strings',   clef: 'alto',   lowFreq: 131,  highFreq: 1046, transposition: 0,   icon: '🎻' },
  { id: 'cello',      name: 'Cello',            shortName: 'Vc.',   family: 'strings',   clef: 'bass',   lowFreq: 65,   highFreq: 988,  transposition: 0,   icon: '🎻' },
  { id: 'dbass',      name: 'Double Bass',      shortName: 'Cb.',   family: 'strings',   clef: 'bass',   lowFreq: 41,   highFreq: 300,  transposition: -12, icon: '🎻' },
  { id: 'guitar',     name: 'Guitar',           shortName: 'Gtr.',  family: 'strings',   clef: 'treble', lowFreq: 82,   highFreq: 1175, transposition: -12, icon: '🎸' },
  { id: 'bass_gtr',   name: 'Bass Guitar',      shortName: 'B.Gtr', family: 'strings',   clef: 'bass',   lowFreq: 41,   highFreq: 300,  transposition: -12, icon: '🎸' },
  // Woodwinds
  { id: 'flute',      name: 'Flute',            shortName: 'Fl.',   family: 'woodwinds', clef: 'treble', lowFreq: 262,  highFreq: 4186, transposition: 0,   icon: '🪈' },
  { id: 'oboe',       name: 'Oboe',             shortName: 'Ob.',   family: 'woodwinds', clef: 'treble', lowFreq: 247,  highFreq: 1397, transposition: 0,   icon: '🎵' },
  { id: 'clarinet',   name: 'Clarinet (Bb)',    shortName: 'Cl.',   family: 'woodwinds', clef: 'treble', lowFreq: 147,  highFreq: 1975, transposition: 2,   icon: '🎵' },
  { id: 'bassoon',    name: 'Bassoon',          shortName: 'Bsn.',  family: 'woodwinds', clef: 'bass',   lowFreq: 58,   highFreq: 622,  transposition: 0,   icon: '🎵' },
  { id: 'alto_sax',   name: 'Alto Sax',         shortName: 'A.Sx.', family: 'woodwinds', clef: 'treble', lowFreq: 138,  highFreq: 830,  transposition: 9,   icon: '🎷' },
  { id: 'tenor_sax',  name: 'Tenor Sax',        shortName: 'T.Sx.', family: 'woodwinds', clef: 'treble', lowFreq: 103,  highFreq: 622,  transposition: 2,   icon: '🎷' },
  // Brass
  { id: 'trumpet',    name: 'Trumpet (Bb)',     shortName: 'Tpt.',  family: 'brass',     clef: 'treble', lowFreq: 165,  highFreq: 988,  transposition: 2,   icon: '🎺' },
  { id: 'horn',       name: 'French Horn (F)',  shortName: 'Hn.',   family: 'brass',     clef: 'treble', lowFreq: 87,   highFreq: 698,  transposition: 7,   icon: '🎺' },
  { id: 'trombone',   name: 'Trombone',         shortName: 'Tbn.',  family: 'brass',     clef: 'bass',   lowFreq: 73,   highFreq: 554,  transposition: 0,   icon: '🎺' },
  { id: 'tuba',       name: 'Tuba',             shortName: 'Tba.',  family: 'brass',     clef: 'bass',   lowFreq: 43,   highFreq: 349,  transposition: 0,   icon: '🎺' },
  // Keyboard
  { id: 'piano_rh',  name: 'Piano (R.H.)',      shortName: 'Pno.',  family: 'keyboard',  clef: 'treble', lowFreq: 262,  highFreq: 4186, transposition: 0,   icon: '🎹' },
  { id: 'piano_lh',  name: 'Piano (L.H.)',      shortName: 'Pno.',  family: 'keyboard',  clef: 'bass',   lowFreq: 27,   highFreq: 262,  transposition: 0,   icon: '🎹' },
  { id: 'organ',     name: 'Organ',             shortName: 'Org.',  family: 'keyboard',  clef: 'treble', lowFreq: 65,   highFreq: 4186, transposition: 0,   icon: '🎹' },
  // Voice
  { id: 'soprano',   name: 'Soprano',           shortName: 'S.',    family: 'voice',     clef: 'treble', lowFreq: 261,  highFreq: 1046, transposition: 0,   icon: '🎤' },
  { id: 'alto_v',    name: 'Alto',              shortName: 'A.',    family: 'voice',     clef: 'treble', lowFreq: 196,  highFreq: 698,  transposition: 0,   icon: '🎤' },
  { id: 'tenor_v',   name: 'Tenor',             shortName: 'T.',    family: 'voice',     clef: 'treble', lowFreq: 130,  highFreq: 523,  transposition: 0,   icon: '🎤' },
  { id: 'bass_v',    name: 'Bass',              shortName: 'B.',    family: 'voice',     clef: 'bass',   lowFreq: 82,   highFreq: 349,  transposition: 0,   icon: '🎤' },
];

export const PRESETS: { label: string; ids: string[] }[] = [
  { label: 'String Quartet', ids: ['violin', 'viola', 'cello', 'dbass'] },
  { label: 'SATB Choir',     ids: ['soprano', 'alto_v', 'tenor_v', 'bass_v'] },
  { label: 'Piano',          ids: ['piano_rh', 'piano_lh'] },
  { label: 'Jazz Band',      ids: ['trumpet', 'alto_sax', 'tenor_sax', 'piano_rh', 'bass_gtr'] },
  { label: 'Rock Band',      ids: ['guitar', 'bass_gtr', 'piano_rh'] },
  { label: 'Full Orchestra', ids: ['violin', 'viola', 'cello', 'flute', 'oboe', 'clarinet', 'trumpet', 'horn', 'trombone'] },
];

export function getInstrument(id: string): Instrument | undefined {
  return ALL_INSTRUMENTS.find(i => i.id === id);
}
