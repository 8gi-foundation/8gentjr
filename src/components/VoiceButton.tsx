"use client";

import React from "react";
import { useVoiceInput } from "@/hooks/useVoiceInput";

// ---------------------------------------------------------------------------
// Mic SVG Icon (no external deps)
// ---------------------------------------------------------------------------

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "#fff" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Mic body */}
      <rect x="9" y="1" width="6" height="12" rx="3" />
      {/* Mic arc */}
      <path d="M19 10a7 7 0 0 1-14 0" />
      {/* Stand */}
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="8" y1="21" x2="16" y2="21" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const buttonBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 48,
  minHeight: 48,
  borderRadius: "50%",
  border: "none",
  cursor: "pointer",
  transition: "background-color 0.2s, box-shadow 0.2s, transform 0.15s",
  position: "relative",
};

const buttonIdle: React.CSSProperties = {
  ...buttonBase,
  backgroundColor: "#e5e7eb",
  color: "#374151",
};

const buttonActive: React.CSSProperties = {
  ...buttonBase,
  backgroundColor: "#ef4444",
  color: "#fff",
  boxShadow: "0 0 0 0 rgba(239,68,68,0.5)",
  animation: "voice-pulse 1.4s ease-in-out infinite",
};

const transcriptStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 14,
  color: "#374151",
  maxWidth: 280,
  wordBreak: "break-word",
  minHeight: 20,
};

const errorStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 12,
  color: "#dc2626",
};

// Keyframes injected once via <style> tag
const pulseKeyframes = `
@keyframes voice-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
  70%  { box-shadow: 0 0 0 12px rgba(239,68,68,0); }
  100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
}
`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface VoiceButtonProps {
  /** Language for recognition (default: "en-US") */
  lang?: string;
  /** Called whenever transcript changes */
  onTranscript?: (text: string) => void;
  /** Additional className on the wrapper */
  className?: string;
}

export function VoiceButton({
  lang = "en-US",
  onTranscript,
  className,
}: VoiceButtonProps) {
  const { isSupported, isListening, transcript, error, start, stop, reset } =
    useVoiceInput(lang);

  // Notify parent of transcript changes
  React.useEffect(() => {
    if (transcript && onTranscript) {
      onTranscript(transcript);
    }
  }, [transcript, onTranscript]);

  if (!isSupported) {
    return null; // Graceful degradation — hide if unsupported
  }

  const toggle = () => {
    if (isListening) {
      stop();
    } else {
      reset();
      start();
    }
  };

  return (
    <div
      className={className}
      style={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}
    >
      {/* Inject pulse keyframes */}
      <style>{pulseKeyframes}</style>

      <button
        type="button"
        onClick={toggle}
        aria-label={isListening ? "Stop listening" : "Start voice input"}
        aria-pressed={isListening}
        style={isListening ? buttonActive : buttonIdle}
      >
        <MicIcon active={isListening} />
      </button>

      {transcript && <div style={transcriptStyle}>{transcript}</div>}
      {error && <div role="alert" style={errorStyle}>{error}</div>}
    </div>
  );
}
