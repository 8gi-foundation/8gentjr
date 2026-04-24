'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { onLoadProgress, preloadModel, type LoadProgress } from '@/lib/browser-llm/client';

/**
 * Settings toggle for on-device AI (SmolLM2-135M, ~80 MB).
 *
 * Off by default. Flipping it ON triggers a one-time weight download; the
 * model lives in the browser's Cache API thereafter. All inference runs
 * on-device — no API calls, no data leaves the tab.
 */
export default function SmartSuggestionsToggle({ accent }: { accent: string }) {
  const { settings, updateSettings } = useApp();
  const enabled = settings.smartSuggestionsEnabled;

  const [phase, setPhase] = useState<LoadProgress['phase'] | 'idle' | 'error'>(
    settings.smollmDownloaded ? 'ready' : 'idle'
  );
  const [pct, setPct] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const off = onLoadProgress((p) => {
      setPhase(p.phase);
      if (p.phase === 'download' && p.total && p.loaded != null) {
        setPct(Math.min(100, Math.round((p.loaded / p.total) * 100)));
      }
      if (p.phase === 'ready') {
        setPct(100);
        updateSettings({ smollmDownloaded: true });
      }
    });
    preloadModel().catch((err: unknown) => {
      setPhase('error');
      setErrorMsg(err instanceof Error ? err.message : String(err));
    });
    return () => {
      off();
    };
  }, [enabled, updateSettings]);

  const handleToggle = () => {
    const next = !enabled;
    updateSettings({ smartSuggestionsEnabled: next });
    if (next) {
      setPhase('download');
      setPct(0);
      setErrorMsg(null);
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium" style={{ color: 'var(--warm-text, #1A1614)' }}>
            On-device smart suggestions
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--warm-text-muted, #9A9088)' }}>
            One-time ~80&nbsp;MB download. Runs entirely on this device. No data leaves the app.
          </p>
        </div>
        <button
          onClick={handleToggle}
          aria-pressed={enabled}
          className="relative w-12 h-7 rounded-full transition-colors shrink-0"
          style={{ backgroundColor: enabled ? accent : '#D6CEC3' }}
        >
          <span
            className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform"
            style={{ transform: enabled ? 'translateX(20px)' : 'translateX(0)' }}
          />
        </button>
      </div>

      {enabled && (
        <div className="mt-3">
          {phase === 'download' && (
            <>
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--warm-text-muted, #9A9088)' }}>
                <span>Downloading model…</span>
                <span>{pct}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#EFE7DC' }}>
                <div
                  className="h-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: accent }}
                />
              </div>
            </>
          )}
          {phase === 'init' && (
            <p className="text-xs" style={{ color: 'var(--warm-text-muted, #9A9088)' }}>
              Preparing model…
            </p>
          )}
          {phase === 'ready' && (
            <p className="text-xs font-medium" style={{ color: accent }}>
              Ready. Suggestions run on this device.
            </p>
          )}
          {phase === 'error' && (
            <p className="text-xs" style={{ color: '#C62828' }}>
              Couldn&apos;t load model: {errorMsg ?? 'unknown error'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
