/**
 * Motor Lock — Accessibility Controls for Motor-Impaired Users
 *
 * Provides dwell-to-select, guard spacing, and tap debounce to prevent
 * accidental activations on AAC grids. Essential for users with limited
 * fine motor control.
 *
 * Reference: Issue #25
 */

import { useState, useCallback, useRef } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface MotorLockConfig {
  /** Hold duration (ms) before a tap registers. Range: 200–2000. */
  dwellMs: number;
  /** Minimum pixel distance between sequential taps. Range: 8–30. */
  guardPx: number;
  /** Cooldown (ms) between accepted taps. Range: 100–1000. */
  debounceMs: number;
}

export type SensitivityLevel = 'low' | 'medium' | 'high';

export interface TapEvent {
  x: number;
  y: number;
  timestamp: number;
}

export interface MotorLockState {
  config: MotorLockConfig;
  sensitivity: SensitivityLevel;
  /** Whether a dwell is currently in progress. */
  dwelling: boolean;
  /** Number of taps rejected since last accepted tap. */
  rejectedCount: number;
}

export interface MotorLockActions {
  /** Test whether a tap should be accepted given current config. */
  shouldAcceptTap: (tap: TapEvent) => boolean;
  /** Switch to a named sensitivity profile. */
  setSensitivity: (level: SensitivityLevel) => void;
  /** Override individual config values. */
  setConfig: (partial: Partial<MotorLockConfig>) => void;
  /** Start a dwell timer; resolves true if held long enough, false if released early. */
  startDwell: () => Promise<boolean>;
  /** Cancel an in-progress dwell. */
  cancelDwell: () => void;
  /** Reset rejected count. */
  resetStats: () => void;
}

// =============================================================================
// Sensitivity Profiles
// =============================================================================

export const SENSITIVITY_PROFILES: Record<SensitivityLevel, MotorLockConfig> = {
  low:    { dwellMs: 800, guardPx: 30, debounceMs: 500 },
  medium: { dwellMs: 400, guardPx: 15, debounceMs: 200 },
  high:   { dwellMs: 200, guardPx: 8,  debounceMs: 100 },
} as const;

// =============================================================================
// Validation
// =============================================================================

const LIMITS = {
  dwellMs:    { min: 200, max: 2000 },
  guardPx:    { min: 8,   max: 30 },   // kept as spec range bounds
  debounceMs: { min: 100, max: 1000 },
} as const;

function clampConfig(cfg: MotorLockConfig): MotorLockConfig {
  return {
    dwellMs:    Math.max(LIMITS.dwellMs.min,    Math.min(LIMITS.dwellMs.max,    cfg.dwellMs)),
    guardPx:    Math.max(LIMITS.guardPx.min,     Math.min(LIMITS.guardPx.max,    cfg.guardPx)),
    debounceMs: Math.max(LIMITS.debounceMs.min,  Math.min(LIMITS.debounceMs.max, cfg.debounceMs)),
  };
}

// =============================================================================
// Pure helpers (exported for testing)
// =============================================================================

/** Euclidean distance between two points. */
export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Check guard spacing: tap must be far enough from the previous tap. */
export function passesGuard(prev: TapEvent | null, next: TapEvent, guardPx: number): boolean {
  if (!prev) return true;
  return distance(prev, next) >= guardPx;
}

/** Check debounce: enough time must have elapsed since last accepted tap. */
export function passesDebounce(prev: TapEvent | null, next: TapEvent, debounceMs: number): boolean {
  if (!prev) return true;
  return (next.timestamp - prev.timestamp) >= debounceMs;
}

// =============================================================================
// React Hook
// =============================================================================

export function useMotorLock(
  initialSensitivity: SensitivityLevel = 'medium',
): [MotorLockState, MotorLockActions] {
  const [sensitivity, setSensitivityState] = useState<SensitivityLevel>(initialSensitivity);
  const [config, setConfigState] = useState<MotorLockConfig>(
    () => ({ ...SENSITIVITY_PROFILES[initialSensitivity] }),
  );
  const [dwelling, setDwelling] = useState(false);
  const [rejectedCount, setRejectedCount] = useState(0);

  const lastAccepted = useRef<TapEvent | null>(null);
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dwellResolve = useRef<((accepted: boolean) => void) | null>(null);

  // ---- actions ----

  const shouldAcceptTap = useCallback(
    (tap: TapEvent): boolean => {
      if (!passesDebounce(lastAccepted.current, tap, config.debounceMs)) {
        setRejectedCount((c) => c + 1);
        return false;
      }
      if (!passesGuard(lastAccepted.current, tap, config.guardPx)) {
        setRejectedCount((c) => c + 1);
        return false;
      }
      lastAccepted.current = tap;
      return true;
    },
    [config.debounceMs, config.guardPx],
  );

  const startDwell = useCallback((): Promise<boolean> => {
    // Cancel any existing dwell
    if (dwellTimer.current) {
      clearTimeout(dwellTimer.current);
      dwellResolve.current?.(false);
    }

    setDwelling(true);

    return new Promise<boolean>((resolve) => {
      dwellResolve.current = resolve;
      dwellTimer.current = setTimeout(() => {
        setDwelling(false);
        dwellTimer.current = null;
        dwellResolve.current = null;
        resolve(true);
      }, config.dwellMs);
    });
  }, [config.dwellMs]);

  const cancelDwell = useCallback(() => {
    if (dwellTimer.current) {
      clearTimeout(dwellTimer.current);
      dwellTimer.current = null;
    }
    setDwelling(false);
    dwellResolve.current?.(false);
    dwellResolve.current = null;
  }, []);

  const setSensitivity = useCallback((level: SensitivityLevel) => {
    setSensitivityState(level);
    setConfigState({ ...SENSITIVITY_PROFILES[level] });
  }, []);

  const setConfig = useCallback((partial: Partial<MotorLockConfig>) => {
    setConfigState((prev) => clampConfig({ ...prev, ...partial }));
  }, []);

  const resetStats = useCallback(() => {
    setRejectedCount(0);
    lastAccepted.current = null;
  }, []);

  // ---- state + actions ----

  const state: MotorLockState = { config, sensitivity, dwelling, rejectedCount };
  const actions: MotorLockActions = {
    shouldAcceptTap,
    setSensitivity,
    setConfig,
    startDwell,
    cancelDwell,
    resetStats,
  };

  return [state, actions];
}
