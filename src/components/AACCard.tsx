"use client";

/**
 * AAC (Augmentative and Alternative Communication) Card
 *
 * Label sizing rationale (from UX-AUDIT P0 #2):
 * - Previous: 9px — illegible at arm's length
 * - Fixed:   16px minimum — meets WCAG + AAC guidelines for tablet use at ~50cm
 *
 * @see https://github.com/8gi-foundation/8gentjr/issues/2
 */

export interface AACCardProps {
  /** Symbol image URL (e.g. ARASAAC pictogram) */
  symbolUrl?: string;
  /** Alt text for the symbol image */
  symbolAlt?: string;
  /** Label text displayed below the symbol */
  label: string;
  /** Card background colour — defaults to white */
  bgColor?: string;
  /** Optional click handler for phrase board interaction */
  onClick?: () => void;
}

export default function AACCard({
  symbolUrl,
  symbolAlt,
  label,
  bgColor = "#ffffff",
  onClick,
}: AACCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="
        aac-card flex flex-col items-center justify-center
        rounded-xl border-2 border-[--brand-border]
        py-3 px-2 cursor-pointer min-w-[80px] min-h-[100px]
        transition-transform duration-150 ease-out
        active:scale-95 hover:shadow-md
      "
      style={{ background: bgColor }}
    >
      {symbolUrl ? (
        <img
          src={symbolUrl}
          alt={symbolAlt ?? label}
          className="w-16 h-16 object-contain mb-2"
        />
      ) : (
        <div
          className="
            w-16 h-16 flex items-center justify-center
            bg-[--warm-bg-page] rounded-lg text-[28px] mb-2
          "
          role="img"
          aria-label={symbolAlt ?? label}
        >
          {label.charAt(0).toUpperCase()}
        </div>
      )}
      <span
        className="
          text-base font-semibold leading-tight text-center text-[--brand-text]
          overflow-hidden text-ellipsis max-w-full
          line-clamp-2 break-words
        "
      >
        {label}
      </span>
    </button>
  );
}
