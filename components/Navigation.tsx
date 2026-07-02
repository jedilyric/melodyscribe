'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Music, Upload, Library } from 'lucide-react';

const NAV_LINKS = [
  { href: '/keyboard', label: 'Keyboard', icon: Music },
  { href: '/upload', label: 'Upload Audio', icon: Upload },
  { href: '/library', label: 'Library', icon: Library },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 group-hover:bg-accent/30 transition-colors">
              <Music size={18} className="text-accent-light" />
            </div>
            <span className="text-lg font-semibold text-text-primary tracking-tight">
              Melody<span className="text-accent-light">Scribe</span>
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  pathname === href
                    ? 'bg-accent/20 text-accent-light'
                    : 'text-text-secondary hover:bg-card hover:text-text-primary'
                }`}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
