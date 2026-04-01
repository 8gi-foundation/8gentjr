"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VoiceInputResult {
  /** Whether the browser supports SpeechRecognition */
  isSupported: boolean;
  /** Whether recognition is currently active */
  isListening: boolean;
  /** The current / most recent transcript */
  transcript: string;
  /** Last error message, if any */
  error: string | null;
  /** Start listening */
  start: () => void;
  /** Stop listening */
  stop: () => void;
  /** Clear the transcript and error */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// SpeechRecognition compat (standard + webkit prefix for Safari)
// ---------------------------------------------------------------------------

// Web Speech API types — not in all TS DOM libs, so we define a minimal shape.
interface SpeechRecognitionResult {
  readonly transcript: string;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: { readonly [index: number]: SpeechRecognitionResult };
}
interface SpeechRecognitionEventCompat extends Event {
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEventCompat extends Event {
  readonly error: string;
}
interface SpeechRecognitionCompat extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventCompat) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventCompat) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

function getSpeechRecognitionCtor():
  | (new () => SpeechRecognitionCompat)
  | null {
  if (typeof window === "undefined") return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useVoiceInput(lang = "en-US"): VoiceInputResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionCompat | null>(null);
  const isSupported = typeof window !== "undefined" && !!getSpeechRecognitionCtor();

  // Tear down on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    // If already running, bail
    if (recognitionRef.current) return;

    setError(null);

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event: SpeechRecognitionEventCompat) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventCompat) => {
      if (event.error === "not-allowed") {
        setError("Microphone permission was denied.");
      } else if (event.error === "no-speech") {
        // Ignore — just means silence, not a real error
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }, [lang]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setTranscript("");
    setError(null);
  }, [stop]);

  return { isSupported, isListening, transcript, error, start, stop, reset };
}
