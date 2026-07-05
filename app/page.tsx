import Link from 'next/link';
import {
  Music, Upload, Library, Zap, FileMusic, Mic2,
  Download, HardDrive, ChevronRight, Waves, Guitar,
  Piano, SlidersHorizontal, ListMusic,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="relative flex flex-col items-center overflow-hidden">

      {/* Background grid decoration */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px] opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(rgba(124,111,205,1) 1px, transparent 1px), linear-gradient(90deg, rgba(124,111,205,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />

      {/* Hero */}
      <section className="relative w-full max-w-5xl text-center pt-20 pb-16 px-4">
        {/* Glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-hero-glow" />

        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent-light mb-7 animate-fade-in">
          <Zap size={12} className="text-accent-light" />
          Real-time transcription · No account required
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-5 leading-[1.05] animate-slide-up">
          <span className="text-text-primary">Play it.</span>
          <br />
          <span className="text-gradient">We'll write it.</span>
        </h1>

        <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
          Connect a MIDI keyboard or upload any audio file — MelodyScribe transcribes your music
          into professional sheet music instantly, with support for full orchestral scores.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
          <Link
            href="/keyboard"
            className="group inline-flex items-center justify-center gap-2.5 rounded-2xl bg-accent px-7 py-3.5 text-sm font-semibold text-white hover:bg-accent-hover transition-all hover:scale-[1.02] shadow-accent-lg"
          >
            <Music size={16} />
            Start with Keyboard
            <ChevronRight size={14} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          </Link>
          <Link
            href="/upload"
            className="inline-flex items-center justify-center gap-2.5 rounded-2xl border border-border bg-card px-7 py-3.5 text-sm font-semibold text-text-primary hover:bg-card-hover hover:border-accent/40 transition-all hover:scale-[1.02]"
          >
            <Waves size={16} className="text-emerald-400" />
            Upload Audio
          </Link>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
          {[
            { label: 'Instruments supported', value: '20+' },
            { label: 'Audio formats', value: 'MP3 · WAV · M4A' },
            { label: 'Keys for PDF export', value: '20 keys' },
            { label: 'Storage', value: 'Local · Private' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-lg font-bold text-text-primary">{s.value}</div>
              <div className="text-xs text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature cards */}
      <section className="w-full max-w-5xl px-4 mb-16">
        <div className="grid md:grid-cols-2 gap-5">

          {/* Keyboard card */}
          <Link href="/keyboard" className="group relative rounded-2xl border border-border bg-card overflow-hidden hover:border-accent/50 hover:shadow-card-hover transition-all duration-200">
            <div className="absolute inset-0 bg-accent-fade opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-7">
              <div className="flex items-start justify-between mb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 group-hover:bg-accent/30 transition-colors">
                  <Music size={22} className="text-accent-light" />
                </div>
                <span className="text-xs font-medium text-accent-light/60 bg-accent/10 rounded-full px-2.5 py-1">MIDI</span>
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">Keyboard → Sheet Music</h2>
              <p className="text-sm text-text-secondary leading-relaxed mb-5">
                Connect any USB MIDI keyboard. Choose key, tempo, and time signature — then play as notes appear measure-by-measure on a grand staff in real time.
              </p>
              <ul className="space-y-2">
                {[
                  'Real-time USB MIDI input',
                  'Treble + bass grand staff',
                  'Record, re-record, or delete measures',
                  'Playback with metronome count-in',
                  'PDF export in any key',
                ].map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-text-secondary">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-light flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-center gap-1 text-xs font-medium text-accent-light opacity-60 group-hover:opacity-100 transition-opacity">
                Open keyboard studio <ChevronRight size={12} />
              </div>
            </div>
          </Link>

          {/* Upload card */}
          <Link href="/upload" className="group relative rounded-2xl border border-border bg-card overflow-hidden hover:border-emerald-500/50 hover:shadow-card-hover transition-all duration-200">
            <div className="absolute inset-0 bg-emerald-fade opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-7">
              <div className="flex items-start justify-between mb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 group-hover:bg-emerald-500/25 transition-colors">
                  <Waves size={22} className="text-emerald-400" />
                </div>
                <span className="text-xs font-medium text-emerald-400/60 bg-emerald-500/10 rounded-full px-2.5 py-1">AI Transcription</span>
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">Audio → Full Score</h2>
              <p className="text-sm text-text-secondary leading-relaxed mb-5">
                Drop in any audio file. Select the instruments you want transcribed — violin, trumpet, piano, vocals, and more — and get a complete multi-staff orchestral score.
              </p>
              <ul className="space-y-2">
                {[
                  'Drag & drop MP3, WAV, M4A, MP4',
                  'Choose from 20+ instruments',
                  'Multi-staff orchestral layout',
                  'Per-instrument frequency detection',
                  'Lyrics support + PDF download',
                ].map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-text-secondary">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-center gap-1 text-xs font-medium text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity">
                Open transcription studio <ChevronRight size={12} />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Tools row — inspired by Flat.io / MuseScore feature strips */}
      <section className="w-full max-w-5xl px-4 mb-16">
        <div className="text-center mb-8">
          <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-2">Everything you need</p>
          <h2 className="text-2xl font-bold text-text-primary">Professional-grade tools</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: SlidersHorizontal, title: 'Key & Tempo',   desc: 'Set BPM, time signature, and key before you record', color: 'text-accent-light', bg: 'bg-accent/15' },
            { icon: ListMusic,         title: 'Instrument Picker', desc: 'Choose exactly which parts to detect from audio',   color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
            { icon: Download,          title: 'PDF in Any Key', desc: 'Export & transpose to any of 20 keys instantly',     color: 'text-sky-400',     bg: 'bg-sky-500/15' },
            { icon: HardDrive,         title: 'Local Library',  desc: 'Songs saved privately on your device — no sign-in', color: 'text-amber-400',   bg: 'bg-amber-500/15' },
          ].map(({ icon: Icon, title, desc, color, bg }) => (
            <div key={title} className="flex flex-col rounded-2xl border border-border bg-card p-5 hover:border-border-light transition-colors">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} mb-3`}>
                <Icon size={18} className={color} />
              </div>
              <h3 className="text-sm font-semibold text-text-primary mb-1">{title}</h3>
              <p className="text-xs text-text-secondary leading-snug">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Instrument showcase */}
      <section className="w-full max-w-5xl px-4 mb-20">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <div className="flex justify-center gap-3 mb-5 flex-wrap">
            {['🎻 Violin', '🎺 Trumpet', '🎷 Alto Sax', '🎹 Piano', '🎸 Guitar', '🎤 Soprano', '🪈 Flute', '🎻 Cello'].map(i => (
              <span key={i} className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-secondary">{i}</span>
            ))}
            <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs text-accent-light">+14 more</span>
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-2">Full orchestral transcription</h3>
          <p className="text-sm text-text-secondary max-w-xl mx-auto">
            Select any combination of strings, woodwinds, brass, keyboard, and voice parts. Each instrument gets its own staff with the correct clef, key signature, and detected notes.
          </p>
          <Link href="/upload" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-all hover:scale-105 shadow-accent">
            Try it now <ChevronRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
