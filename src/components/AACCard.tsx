"use client";

import { CSSProperties } from "react";

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

/** Minimum label size per WCAG + AAC guidelines for arm's-length readability */
const MIN_LABEL_FONT_SIZE = 16;

const cardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 12,
  border: "2px solid #e0e0e0",
  padding: "12px 8px",
  cursor: "pointer",
  transition: "transform 0.15s ease, box-shadow 0.15s ease",
  userSelect: "none",
  WebkitTapHighlightColor: "transparent",
  minWidth: 80,
  minHeight: 100,
};

const symbolStyle: CSSProperties = {
  width: 64,
  height: 64,
  objectFit: "contain",
  marginBottom: 8,
};

const labelStyle: CSSProperties = {
  /**
   * FIXED: was 9px, now 16px.
   * Minimum 14px per AAC standards; we use 16px for comfortable arm's-length reading.
   */
  fontSize: `${MIN_LABEL_FONT_SIZE}px`,
  fontWeight: 600,
  lineHeight: 1.2,
  textAlign: "center",
  color: "#1a1a2e",
  /* Prevent truncation on standard grid sizes; ellipsis as safety net */
  overflow: "hidden",
  textOverflow: "ellipsis",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  wordBreak: "break-word",
  maxWidth: "100%",
};

const placeholderSymbolStyle: CSSProperties = {
  ...symbolStyle,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f0f0f0",
  borderRadius: 8,
  fontSize: 28,
};

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
      style={{ ...cardStyle, background: bgColor }}
      onMouseDown={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "scale(0.95)";
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "scale(1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "scale(1)";
      }}
    >
      {symbolUrl ? (
        <img src={symbolUrl} alt={symbolAlt ?? label} style={symbolStyle} />
      ) : (
        <div style={placeholderSymbolStyle} role="img" aria-label={symbolAlt ?? label}>
          {label.charAt(0).toUpperCase()}
        </div>
      )}
      <span style={labelStyle}>{label}</span>
    </button>
  );
}
