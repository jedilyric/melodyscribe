import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import Navigation from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'MelodyScribe — Real-time Sheet Music',
  description: 'Transcribe MIDI keyboard and audio recordings to beautiful sheet music.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-text-primary">
        <Providers>
          <Navigation />
          <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
