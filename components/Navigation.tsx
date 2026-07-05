'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Music, Waves, Library } from 'lucide-react';

const NAV_LINKS = [
  { href: '/keyboard', label: 'Keyboard',   icon: Music,    activeClass: 'text-accent border-accent' },
  { href: '/upload',   label: 'Transcribe', icon: Waves,    activeClass: 'text-emerald-500 border-emerald-400' },
  { href: '/library',  label: 'Library',    icon: Library,  activeClass: 'text-gold border-gold' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between" style={{ height: '60px' }}>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shadow-sm">
              <Music size={15} className="text-white" />
            </div>
            <span className="text-base font-bold text-text-primary tracking-tight">
              Melody<span className="text-accent">Scribe</span>
            </span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-0.5">
            {NAV_LINKS.map(({ href, label, icon: Icon, activeClass }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg transition-all border-b-2 ${
                    isActive
                      ? `${activeClass} bg-transparent`
                      : 'text-text-secondary border-transparent hover:text-text-primary hover:bg-surface'
                  }`}
                >
                  <Icon size={14} />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </div>

          {/* Status */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            No account needed
          </div>
        </div>
      </div>
    </nav>
  );
}
