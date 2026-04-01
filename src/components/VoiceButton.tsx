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
    <div className={`inline-flex flex-col items-center ${className ?? ""}`}>
      <button
        type="button"
        onClick={toggle}
        aria-label={isListening ? "Stop listening" : "Start voice input"}
        aria-pressed={isListening}
        className={
          isListening
            ? "inline-flex items-center justify-center min-w-[48px] min-h-[48px] rounded-full border-none cursor-pointer bg-red-500 text-white shadow-[0_0_0_0_rgba(239,68,68,0.5)] animate-pulse transition-colors"
            : "inline-flex items-center justify-center min-w-[48px] min-h-[48px] rounded-full border-none cursor-pointer bg-gray-200 text-gray-700 transition-colors"
        }
      >
        <MicIcon active={isListening} />
      </button>

      {transcript && (
        <div className="mt-2 text-sm text-gray-700 max-w-[280px] break-words min-h-[20px]">
          {transcript}
        </div>
      )}
      {error && (
        <div role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
