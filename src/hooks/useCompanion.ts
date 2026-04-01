"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CompanionState =
  | "idle"
  | "active"
  | "celebrating"
  | "sleeping"
  | "pointing";

export type PointDirection = "left" | "right" | "up" | "down" | null;

export interface CompanionConfig {
  /** Companion display name — stored in localStorage */
  name: string;
  /** Hue rotation for companion colour — stored in localStorage */
  colorHue: number;
  /** Milliseconds of inactivity before idle state (default: 30000) */
  idleTimeout?: number;
  /** Milliseconds of inactivity before sleeping state (default: 120000) */
  sleepTimeout?: number;
  /** Duration of celebration in ms (default: 3000) */
  celebrationDuration?: number;
}

export interface CompanionActions {
  /** Call when user taps a card or interacts */
  recordActivity: () => void;
  /** Trigger celebration with an optional message */
  celebrate: (message?: string) => void;
  /** Point the companion in a direction */
  point: (direction: PointDirection) => void;
  /** Update companion name */
  setName: (name: string) => void;
  /** Update companion colour hue (0–360) */
  setColorHue: (hue: number) => void;
  /** Toggle minimized state */
  toggleMinimized: () => void;
}

export interface CompanionHookResult {
  state: CompanionState;
  direction: PointDirection;
  name: string;
  colorHue: number;
  minimized: boolean;
  celebrationMessage: string | null;
  actions: CompanionActions;
}

// ---------------------------------------------------------------------------
// LocalStorage helpers
// ---------------------------------------------------------------------------

const LS_NAME_KEY = "8gentjr-companion-name";
const LS_HUE_KEY = "8gentjr-companion-hue";

function loadString(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function loadNumber(key: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota or private mode — not critical */
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCompanion(
  config?: Partial<CompanionConfig>,
): CompanionHookResult {
  const idleTimeout = config?.idleTimeout ?? 30_000;
  const sleepTimeout = config?.sleepTimeout ?? 120_000;
  const celebrationDuration = config?.celebrationDuration ?? 3_000;

  const [state, setState] = useState<CompanionState>("idle");
  const [direction, setDirection] = useState<PointDirection>(null);
  const [minimized, setMinimized] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(
    null,
  );
  const [name, setNameState] = useState(() =>
    loadString(LS_NAME_KEY, config?.name ?? "Buddy"),
  );
  const [colorHue, setColorHueState] = useState(() =>
    loadNumber(LS_HUE_KEY, config?.colorHue ?? 160),
  );

  const lastActivity = useRef(Date.now());
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sleepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Timer management ────────────────────────────────────────

  const clearTimers = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (sleepTimer.current) clearTimeout(sleepTimer.current);
  }, []);

  const startTimers = useCallback(() => {
    clearTimers();
    idleTimer.current = setTimeout(() => {
      setState((prev) => (prev === "celebrating" ? prev : "idle"));
      sleepTimer.current = setTimeout(() => {
        setState((prev) =>
          prev === "celebrating" ? prev : "sleeping",
        );
      }, sleepTimeout - idleTimeout);
    }, idleTimeout);
  }, [clearTimers, idleTimeout, sleepTimeout]);

  // ── Actions ─────────────────────────────────────────────────

  const recordActivity = useCallback(() => {
    lastActivity.current = Date.now();
    setState((prev) => (prev === "celebrating" ? prev : "active"));
    startTimers();
  }, [startTimers]);

  const celebrate = useCallback(
    (message?: string) => {
      setState("celebrating");
      setCelebrationMessage(message ?? null);
      clearTimers();
      if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
      celebrationTimer.current = setTimeout(() => {
        setState("active");
        setCelebrationMessage(null);
        startTimers();
      }, celebrationDuration);
    },
    [clearTimers, startTimers, celebrationDuration],
  );

  const point = useCallback(
    (dir: PointDirection) => {
      setDirection(dir);
      if (dir) {
        setState("pointing");
        // Return to active after 2s
        setTimeout(() => {
          setDirection(null);
          setState("active");
          startTimers();
        }, 2000);
      }
    },
    [startTimers],
  );

  const setName = useCallback((n: string) => {
    setNameState(n);
    save(LS_NAME_KEY, n);
  }, []);

  const setColorHue = useCallback((h: number) => {
    const clamped = Math.max(0, Math.min(360, h));
    setColorHueState(clamped);
    save(LS_HUE_KEY, String(clamped));
  }, []);

  const toggleMinimized = useCallback(() => {
    setMinimized((v) => !v);
  }, []);

  // ── Start timers on mount ───────────────────────────────────

  useEffect(() => {
    startTimers();
    return () => {
      clearTimers();
      if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
    };
  }, [startTimers, clearTimers]);

  return {
    state,
    direction,
    name,
    colorHue,
    minimized,
    celebrationMessage,
    actions: {
      recordActivity,
      celebrate,
      point,
      setName,
      setColorHue,
      toggleMinimized,
    },
  };
}
