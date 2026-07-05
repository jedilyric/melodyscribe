'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Music, Upload, Library, Waves } from 'lucide-react';

const NAV_LINKS = [
  { href: '/keyboard', label: 'Keyboard',    icon: Music,   color: 'text-accent-light', activeBg: 'bg-accent/20' },
  { href: '/upload',   label: 'Transcribe',  icon: Waves,   color: 'text-emerald-400',  activeBg: 'bg-emerald-500/15' },
  { href: '/library',  label: 'Library',     icon: Library, color: 'text-sky-400',       activeBg: 'bg-sky-500/15' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-surface/85 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-15 items-center justify-between" style={{ height: '60px' }}>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-hover shadow-md shadow-accent/30 group-hover:shadow-accent/50 transition-shadow">
              <Music size={16} className="text-white" />
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-base font-bold text-text-primary tracking-tight leading-none">Melody</span>
              <span className="text-base font-bold text-accent-light tracking-tight leading-none">Scribe</span>
            </div>
          </Link>

          {/* Center nav links */}
          <div className="flex items-center gap-0.5">
            {NAV_LINKS.map(({ href, label, icon: Icon, color, activeBg }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? `${activeBg} ${color}`
                      : 'text-text-secondary hover:bg-card hover:text-text-primary'
                  }`}
                >
                  <Icon size={15} className={isActive ? color : ''} />
                  <span className="hidden sm:inline">{label}</span>
                  {isActive && (
                    <span className="hidden sm:block h-1 w-1 rounded-full bg-current opacity-70" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side badge */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border/60 bg-card/50 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-text-muted">Local · No account needed</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
