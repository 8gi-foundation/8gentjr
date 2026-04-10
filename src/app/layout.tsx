import type { Metadata, Viewport } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { AppChrome } from '../components/AppChrome';

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
  other: {
    'apple-mobile-web-app-capable': 'yes',
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
  themeColor: '#FFFDF9',
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
          <AppChrome>{children}</AppChrome>
        </Providers>
      </body>
    </html>
  );
}
