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
  metadataBase: new URL('https://8gentjr.com'),
  title: {
    default: '8gent Jr - No more gatekeeping. A voice for every kid.',
    template: '%s | 8gent Jr',
  },
  description:
    'Personalised AI OS for neurodivergent children. AAC communication, AI-generated symbols, personalized voice. Free forever. No gatekeeping.',
  keywords: [
    'AAC app for kids',
    'neurodivergent children AI',
    'augmentative communication app',
    'free AAC app',
    'AI symbols for kids',
    'autism communication app',
    '8gent Jr',
    'personalized voice AI',
  ],
  alternates: { canonical: 'https://8gentjr.com' },
  openGraph: {
    title: '8gent Jr - A Voice for Every Kid. Free Forever.',
    description:
      'Personalised AI OS for neurodivergent children. AAC communication, AI-generated symbols, personalized voice. No gatekeeping.',
    url: 'https://8gentjr.com',
    siteName: '8gent Jr',
    type: 'website',
    locale: 'en_US',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: '8gent Jr - AI OS for neurodivergent children' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '8gent Jr - A Voice for Every Kid. Free Forever.',
    description:
      'AAC communication, AI symbols, personalized voice for neurodivergent children. Free forever.',
    creator: '@8gentapp',
    images: ['/og.png'],
  },
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

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "MobileApplication",
      name: "8gent Jr",
      applicationCategory: "EducationApplication",
      operatingSystem: "iOS, Android, Web",
      url: "https://8gentjr.com",
      description:
        "Personalised AI operating system for neurodivergent children. AAC communication, AI-generated symbols, personalized voice. Free forever.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      audience: { "@type": "EducationalAudience", educationalRole: "student" },
    },
    {
      "@type": "Organization",
      name: "8gent",
      url: "https://8gent.world",
      logo: "https://8gentjr.com/logo.png",
      sameAs: [
        "https://8gent.world",
        "https://8gentos.com",
        "https://8gent.dev",
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`} data-theme="light">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">
        <Providers>
          <AppChrome>{children}</AppChrome>
        </Providers>
      </body>
    </html>
  );
}
