'use client';

import { useAuth } from '@/context/auth';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Music, Upload, Library, LogOut, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '/keyboard', label: 'Keyboard', icon: Music },
  { href: '/upload', label: 'Upload Audio', icon: Upload },
  { href: '/library', label: 'Library', icon: Library },
];

export default function Navigation() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
    router.push('/');
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 group-hover:bg-accent/30 transition-colors">
              <Music size={18} className="text-accent-light" />
            </div>
            <span className="text-lg font-semibold text-text-primary tracking-tight">
              Melody<span className="text-accent-light">Scribe</span>
            </span>
          </Link>

          {/* Nav links */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
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
                  {label}
                </Link>
              ))}
            </div>
          )}

          {/* User area */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-card transition-colors"
                >
                  <div className="h-7 w-7 rounded-full bg-accent/30 flex items-center justify-center text-xs font-bold text-accent-light">
                    {user.email?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <span className="hidden sm:block text-sm text-text-secondary max-w-[160px] truncate">
                    {user.email}
                  </span>
                  <ChevronDown size={14} className="text-muted" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-border bg-card shadow-xl py-1 z-50">
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <LogOut size={14} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        {user && (
          <div className="flex gap-1 pb-2 md:hidden overflow-x-auto">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  pathname === href
                    ? 'bg-accent/20 text-accent-light'
                    : 'text-text-secondary hover:bg-card'
                }`}
              >
                <Icon size={13} />
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
