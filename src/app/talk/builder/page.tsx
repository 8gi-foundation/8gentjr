'use client';

/**
 * Sentence Builder Page
 *
 * Route: /talk/builder
 * AI-powered sentence builder with local autocomplete.
 *
 * Issue: #22
 */

import SentenceBuilder from '@/components/SentenceBuilder';

export default function SentenceBuilderPage() {
  return (
    <div className="min-h-screen bg-[var(--brand-bg-warm)]">
      <SentenceBuilder />
    </div>
  );
}
