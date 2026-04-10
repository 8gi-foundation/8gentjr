import type { Metadata, Viewport } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { OfflineBanner } from '../components/OfflineBanner';
import Dock from '../components/Dock';
import { LockScreenGate } from '../components/LockScreenGate';
import { InstallPrompt } from '../components/InstallPrompt';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['400', '700', '800'],
});

export const metadata: Metadata = {
  title: {
    default: '8gent Jr - No more gatekeeping. A voice for every kid.',
    template: '%s | 8gent Jr',
  },
  description:
    'Personalised AI OS for neurodivergent children. AAC communication, AI-generated symbols, personalized voice. Free forever.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '8gent Jr',
  },
  category: 'Education',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFDF9' },
    { media: '(prefers-color-scheme: dark)', color: '#1A1612' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`} data-theme="light">
      <body className="antialiased">
        <Providers>
          <LockScreenGate>
            <OfflineBanner />
            <InstallPrompt />
            <main className="pb-safe-dock">{children}</main>
            <Dock />
          </LockScreenGate>
        </Providers>
      </body>
    </html>
  );
}
