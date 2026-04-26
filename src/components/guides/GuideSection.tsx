/**
 * GuideSection - reusable section wrapper for /guides/* pages.
 *
 * Renders an optional step-number bubble, a large bold title, and the body.
 * Single component shared by /guides/intro and /guides/talk so the parent-
 * facing voice stays consistent across pages.
 */

import { type ReactNode } from 'react';

export interface GuideSectionProps {
  /** Optional step-number bubble shown to the left of the title. */
  num?: number;
  title: string;
  children: ReactNode;
  /** Optional anchor id for in-page navigation (e.g. table of contents). */
  id?: string;
}

export function GuideSection({ num, title, children, id }: GuideSectionProps) {
  return (
    <section
      id={id}
      className="mt-10 first:mt-0 scroll-mt-24"
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      <div className="flex items-baseline gap-3">
        {typeof num === 'number' && (
          <span
            aria-hidden="true"
            className="inline-flex shrink-0 items-center justify-center w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-base shadow-sm"
          >
            {num}
          </span>
        )}
        <h2
          id={id ? `${id}-title` : undefined}
          className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight"
        >
          {title}
        </h2>
      </div>
      <div className="mt-4 text-gray-700 leading-relaxed text-base sm:text-lg space-y-4">
        {children}
      </div>
    </section>
  );
}

export default GuideSection;
