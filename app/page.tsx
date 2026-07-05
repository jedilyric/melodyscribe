import Link from 'next/link';
import {
  Music, Waves, Library, FileMusic, Download,
  HardDrive, ChevronRight, Sliders, ListMusic,
} from 'lucide-react';

// Decorative staff component (5 horizontal lines, like a music staff)
function StaffLines({ opacity = 0.07 }: { opacity?: number }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col gap-[10px]" style={{ opacity }}>
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="h-px bg-accent w-full" />
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="flex flex-col items-center">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative w-full max-w-5xl text-center pt-20 pb-16 px-4 overflow-hidden">
        {/* Background staff lines */}
        <div className="pointer-events-none absolute inset-0 staff-decoration opacity-40" />
        {/* Warm glow */}
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />

        <div className="relative z-10">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold-dim px-4 py-1.5 text-xs font-semibold text-gold mb-7">
            <Music size={11} />
            Real-time music notation — no account required
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-[70px] font-extrabold tracking-tight leading-[1.04] mb-5 text-text-primary">
            Turn sound into
            <br />
            <span className="text-gradient">sheet music.</span>
          </h1>

          <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            Connect a MIDI keyboard or drop any audio file. MelodyScribe auto-detects tempo
            and key, then transcribes your music into a professional, downloadable score.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-14">
            <Link href="/keyboard"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-7 py-3.5 text-sm font-semibold text-white hover:bg-accent-hover transition-all hover:shadow-accent-lg shadow-accent">
              <Music size={15} />
              Keyboard Studio
              <ChevronRight size={13} className="opacity-50 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link href="/upload"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-7 py-3.5 text-sm font-semibold text-text-primary hover:bg-card-hover hover:border-border-dark transition-all shadow-sm">
              <Waves size={15} className="text-emerald-500" />
              Transcribe Audio
            </Link>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-3">
            {[
              { v: '20+', l: 'Instruments' },
              { v: 'Auto', l: 'Tempo & key detection' },
              { v: 'MP3 · WAV · M4A', l: 'Audio formats' },
              { v: '20 keys', l: 'PDF export' },
            ].map(s => (
              <div key={s.l} className="text-center">
                <div className="text-base font-bold text-accent">{s.v}</div>
                <div className="text-xs text-muted">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature cards ────────────────────────────────────────────────── */}
      <section className="w-full max-w-5xl px-4 mb-14">
        <div className="grid md:grid-cols-2 gap-5">

          {/* Keyboard card */}
          <Link href="/keyboard" className="group relative rounded-2xl border border-border bg-card overflow-hidden hover:border-accent/60 hover:shadow-lg transition-all duration-200 shadow-sm">
            <div className="absolute inset-0 bg-accent-fade opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-7">
              <div className="flex items-start justify-between mb-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent shadow-accent">
                  <Music size={19} className="text-white" />
                </div>
                <span className="text-xs font-semibold text-accent bg-accent-dim rounded-full px-2.5 py-1">MIDI</span>
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">Keyboard → Sheet Music</h2>
              <p className="text-sm text-text-secondary leading-relaxed mb-5">
                Connect any USB MIDI keyboard. Set key, tempo, and time signature, then play as notes appear on a grand staff in real time.
              </p>
              <ul className="space-y-1.5">
                {['Real-time MIDI detection', 'Treble + bass grand staff', 'Record, re-record, or delete measures', 'Playback with count-in metronome', 'PDF export in any key'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-text-secondary">
                    <span className="h-1 w-1 rounded-full bg-accent flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-accent opacity-60 group-hover:opacity-100 transition-opacity">
                Open studio <ChevronRight size={11} />
              </div>
            </div>
          </Link>

          {/* Upload card */}
          <Link href="/upload" className="group relative rounded-2xl border border-border bg-card overflow-hidden hover:border-emerald-400/60 hover:shadow-lg transition-all duration-200 shadow-sm">
            <div className="absolute inset-0 bg-emerald-fade opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-7">
              <div className="flex items-start justify-between mb-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 shadow-md shadow-emerald-500/30">
                  <Waves size={19} className="text-white" />
                </div>
                <span className="text-xs font-semibold text-emerald-500 bg-emerald-400/10 border border-emerald-400/30 rounded-full px-2.5 py-1">AI Transcription</span>
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">Audio → Full Score</h2>
              <p className="text-sm text-text-secondary leading-relaxed mb-5">
                Drop any audio file. The app auto-detects tempo and key, then you choose which instruments to transcribe — getting a complete multi-staff orchestral score.
              </p>
              <ul className="space-y-1.5">
                {['Auto-detects tempo & key', 'Choose from 20+ instruments', 'Multi-staff orchestral layout', 'Lyrics support', 'PDF download in any key'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-text-secondary">
                    <span className="h-1 w-1 rounded-full bg-emerald-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-emerald-500 opacity-60 group-hover:opacity-100 transition-opacity">
                Transcribe audio <ChevronRight size={11} />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ── Tools strip ───────────────────────────────────────────────────── */}
      <section className="w-full max-w-5xl px-4 mb-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Sliders, title: 'Auto Key & Tempo',  desc: 'Detected automatically from the audio — edit if needed',      color: 'text-gold', bg: 'bg-gold-dim border-gold/25' },
            { icon: ListMusic, title: 'Instrument Picker', desc: 'Strings, woodwinds, brass, keyboard, voice — 20+ instruments', color: 'text-accent', bg: 'bg-accent-dim border-accent/20' },
            { icon: Download, title: 'PDF in Any Key',    desc: 'Transpose and export to all 20 major and minor keys',          color: 'text-emerald-500', bg: 'bg-emerald-400/10 border-emerald-400/25' },
            { icon: HardDrive, title: 'Local Library',   desc: 'Songs saved privately in your browser — no sign-in needed',    color: 'text-text-secondary', bg: 'bg-surface border-border' },
          ].map(({ icon: Icon, title, desc, color, bg }) => (
            <div key={title} className={`flex flex-col rounded-2xl border ${bg} p-5`}>
              <Icon size={17} className={`${color} mb-3`} />
              <h3 className="text-sm font-semibold text-text-primary mb-1">{title}</h3>
              <p className="text-xs text-text-secondary leading-snug">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Instrument showcase ────────────────────────────────────────────── */}
      <section className="w-full max-w-5xl px-4 mb-20">
        <div className="relative rounded-2xl border border-border bg-card px-8 py-10 text-center overflow-hidden shadow-sm">
          {/* Staff decoration inside card */}
          <div className="pointer-events-none absolute inset-0 staff-decoration opacity-30" />
          <div className="relative z-10">
            <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-4">Supported instruments</p>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {['🎻 Violin', '🎻 Viola', '🎻 Cello', '🎺 Trumpet', '🎷 Alto Sax', '🎹 Piano', '🎸 Guitar', '🎤 Soprano', '🪈 Flute', '🎵 Oboe'].map(i => (
                <span key={i} className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-secondary font-medium">{i}</span>
              ))}
              <span className="rounded-full border border-gold/40 bg-gold-dim px-3 py-1.5 text-xs text-gold font-semibold">+12 more</span>
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-2">Full orchestral transcription</h3>
            <p className="text-sm text-text-secondary max-w-xl mx-auto mb-6">
              Select any combination of instrument families. Each gets its own staff with the correct clef and key signature — ready to print or save as PDF.
            </p>
            <Link href="/upload"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-all shadow-accent">
              Try it now <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
