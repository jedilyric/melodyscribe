import Link from 'next/link';
import { Music, Upload, Library, Zap, FileMusic, Mic2, Download } from 'lucide-react';

const FEATURES = [
  { icon: Mic2, text: 'Real-time MIDI transcription via USB' },
  { icon: FileMusic, text: 'Audio file → sheet music (MP3/MP4/WAV)' },
  { icon: Download, text: 'PDF export in any key' },
  { icon: Library, text: 'Personal library with Google sign-in' },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <div className="relative w-full max-w-4xl text-center py-20">
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm text-accent-light mb-6">
            <Zap size={14} />
            Sheet music in real time
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-5">
            <span className="text-text-primary">Play it.</span>{' '}
            <span className="text-gradient">We'll write it.</span>
          </h1>
          <p className="text-lg text-text-secondary max-w-xl mx-auto mb-10">
            Connect your MIDI keyboard or upload an audio file — MelodyScribe transcribes your music into beautiful, downloadable sheet music instantly.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/keyboard"
              className="flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white hover:bg-accent-hover transition-all hover:scale-105 shadow-lg shadow-accent/25"
            >
              <Music size={16} />
              Start with Keyboard
            </Link>
            <Link
              href="/upload"
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-semibold text-text-primary hover:bg-surface hover:border-accent/50 transition-all"
            >
              <Upload size={16} />
              Upload Audio File
            </Link>
          </div>
        </div>
      </div>

      {/* Features row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl mb-16">
        {FEATURES.map(({ icon: Icon, text }) => (
          <div key={text} className="flex flex-col items-center gap-2.5 rounded-xl border border-border bg-card p-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15">
              <Icon size={18} className="text-accent-light" />
            </div>
            <p className="text-xs text-text-secondary leading-snug">{text}</p>
          </div>
        ))}
      </div>

      {/* Two feature cards */}
      <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl mb-16">
        <Link href="/keyboard" className="group rounded-2xl border border-border bg-card p-6 hover:border-accent/50 transition-all hover:shadow-xl hover:shadow-accent/10">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20 mb-4 group-hover:bg-accent/30 transition-colors">
            <Music size={22} className="text-accent-light" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Keyboard → Sheet Music</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Connect a MIDI keyboard via USB. Choose your key, tempo, and time signature. Play — and watch your music appear note-by-note on treble and bass clef staves.
          </p>
          <ul className="mt-4 space-y-1.5 text-xs text-text-secondary">
            {['Real-time note detection', 'Measure-by-measure recording', 'Playback with count-in', 'Edit or delete any measure'].map(f => (
              <li key={f} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-light flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </Link>

        <Link href="/upload" className="group rounded-2xl border border-border bg-card p-6 hover:border-emerald-500/50 transition-all hover:shadow-xl hover:shadow-emerald-500/10">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 mb-4 group-hover:bg-emerald-500/25 transition-colors">
            <Upload size={22} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Audio → Sheet Music</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Drop in an MP3, MP4, or WAV file. MelodyScribe analyzes the pitch, transcribes the melody, and creates a complete score — with lyrics if present.
          </p>
          <ul className="mt-4 space-y-1.5 text-xs text-text-secondary">
            {['Drag & drop or browse', 'Pitch detection & transcription', 'Lyric annotation support', 'PDF download in any key'].map(f => (
              <li key={f} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </Link>
      </div>
    </div>
  );
}
