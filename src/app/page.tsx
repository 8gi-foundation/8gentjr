import type { Metadata, Viewport } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Footer, Header, type WkLink } from '@/warm-kernel';
import '@/warm-kernel/tokens.css';
import '@/warm-kernel/warm-kernel.css';
import '@/components/home/home.css';
import { ReturningRedirect } from '@/components/home/ReturningRedirect';

/**
 * 8gentjr.com home. A parent reads what Jr is before any account question.
 * The consent gate starts at /onboarding, one tap away.
 * Built on the Warm Kernel tokens, header and footer (#251).
 */

export const metadata: Metadata = {
  title: { absolute: '8gent Jr - A voice for every kid. Free forever.' },
};

// The app shell locks zoom for the AAC board. A parent page must let people
// zoom (WCAG 1.4.4), so this route overrides it.
export const viewport: Viewport = {
  maximumScale: 5,
  userScalable: true,
};

const START = '/onboarding';

const headerLinks: WkLink[] = [
  { label: 'How it works', href: '#how' },
  { label: 'Before you start', href: '#before' },
  { label: 'Parent guides', href: '/guides/intro' },
];

const footerFirst: WkLink[] = [
  { label: 'Privacy policy', href: '/privacy' },
  { label: 'Help', href: '/help' },
  { label: 'Feedback', href: '/feedback' },
];

const family: WkLink[] = [
  { label: '8gent World', href: 'https://8gent.world' },
  { label: '8gent Code', href: 'https://8gent.dev' },
  { label: '8gent OS', href: 'https://8gentos.com' },
  { label: 'Constitution', href: 'https://8gent.world/constitution' },
];

const how = [
  {
    title: 'Talk with pictures',
    body: 'Your child taps picture cards to build a sentence. Jr says it out loud, using the voice already on your device.',
  },
  {
    title: 'Words stay where hands expect them',
    body: 'Core words never move on the board and are coloured by the Fitzgerald Key, so your child builds motor memory for where each word lives.',
  },
  {
    title: 'Free forever',
    body: 'Communication is never behind a paywall. Jr runs in the web browser on a phone, tablet or computer.',
  },
];

export default function Home() {
  return (
    <div className="wk-page" data-wk-motion="none">
      <ReturningRedirect />
      <Header
        product="8gent Jr"
        links={headerLinks}
        action={{ label: 'Get started', href: START }}
      />

      <main id="main" tabIndex={-1}>
        <section className="wk-section" aria-labelledby="hero-title">
          <div className="wk-container jr-hero">
            <div className="jr-hero__text">
              <h1 id="hero-title" className="wk-h1">
                A voice for every kid.
              </h1>
              <p className="wk-lede">
                8gent Jr is a free communication app for neurodivergent children. Your child taps
                picture cards to build a sentence, and Jr says it out loud.
              </p>
              <p className="jr-hero__action">
                <Link className="wk-button" href={START}>
                  Set up 8gent Jr
                </Link>
              </p>
              <p className="wk-meta">
                Setting up takes a parent or guardian a few questions. See{' '}
                <a className="wk-link" href="#before">
                  what we ask
                </a>
                .
              </p>
            </div>
            <figure className="jr-proof">
              <Image
                src="/home/talk-board.png"
                alt="The 8gent Jr Talk board on a phone: a sentence bar at the top, and below it a grid of picture cards for core words such as I, you, want, more and stop, in Fitzgerald Key colours."
                width={724}
                height={1178}
                priority
                sizes="(max-width: 720px) 80vw, 360px"
                className="jr-proof__img"
              />
              <figcaption className="wk-meta jr-proof__caption">
                The Talk board, as your child sees it. Pictograms by ARASAAC.
              </figcaption>
            </figure>
          </div>
        </section>

        <section id="how" className="wk-section wk-section--tint" aria-labelledby="how-title">
          <div className="wk-container">
            <h2 id="how-title" className="wk-h2">
              How it works
            </h2>
            <ul className="jr-how">
              {how.map((item) => (
                <li key={item.title} className="jr-how__item">
                  <h3 className="wk-h3">{item.title}</h3>
                  <p>{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="before" className="wk-section" aria-labelledby="before-title">
          <div className="wk-container wk-prose">
            <h2 id="before-title" className="wk-h2">
              Before you start
            </h2>
            <p>
              When you tap Set up, we ask who the account is for and the year they were born. We
              store a birth year only, never a full date of birth.
            </p>
            <p>
              If the account is for a child under 13, a parent or legal guardian sets it up and
              confirms by email before it activates.
            </p>
            <p>
              <Link className="wk-link" href="/privacy">
                Read the privacy policy
              </Link>
            </p>
          </div>
        </section>
      </main>

      <Footer
        first={footerFirst}
        family={family}
        sourceHref="https://github.com/8gi-foundation/8gentjr"
      />
    </div>
  );
}
