'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useApp, type AppSettings } from '@/context/AppContext';
import { VOICES, DEFAULT_VOICE_ID, VOICE_SAMPLE_TEXT } from '@/lib/voices';
import { speak } from '@/lib/tts';
import { GLP_STAGES, getStage } from '@/lib/glp/stages';
import SmartSuggestionsToggle from '@/components/SmartSuggestionsToggle';
import { estimateStage, type StageEstimate } from '@/lib/stage-estimator';
import {
  initPwaInstall,
  subscribePwaInstall,
  hasInstallPrompt,
  promptInstall,
  isStandalone,
  detectPlatform,
  type InstallPlatform,
} from '@/lib/pwa-install';
import { LAYOUT_PRESETS, type LayoutPreset } from '@/lib/layout-presets';
import { LAYOUT_PRIMITIVES, type LayoutPrimitive } from '@/lib/layout-primitives';
import { isLayoutPrimitivesEnabled } from '@/lib/feature-flags';

/**
 * 8gent Jr Settings Page
 *
 * Child name, GLP stage, TTS rate, grid columns, primary color.
 * All settings persist via AppContext (localStorage).
 *
 * Issue: #68
 */

const COLOR_PRESETS = [
  { name: 'Orange',  color: '#E8610A' },
  { name: 'Green',   color: '#4CAF50' },
  { name: 'Blue',    color: '#2196F3' },
  { name: 'Purple',  color: '#9C27B0' },
  { name: 'Pink',    color: '#E91E63' },
  { name: 'Teal',    color: '#009688' },
  { name: 'Red',     color: '#F44336' },
  { name: 'Indigo',  color: '#3F51B5' },
];

const GRID_OPTIONS = [4, 6, 8, 10] as const;

const DEFAULTS: Partial<AppSettings> = {
  childName: '',
  primaryColor: '#4CAF50',
  ttsRate: 1.0,
  gridColumns: 3,
  glpStage: 3,
  // Restore the default layout (matches the "Big & Simple" preset).
  cardSize: 'large',
  showPredictions: false,
  showPersonalVocab: true,
  density: 'relaxed',
  activeLayoutPreset: 'big-simple',
};

export default function SettingsPage() {
  const router = useRouter();
  const { settings, updateSettings } = useApp();

  const accent = settings.primaryColor || '#4CAF50';

  // Layout primitives are gated behind a build-time feature flag (default off).
  // When off, this section never renders and Settings looks exactly as today.
  const primitivesEnabled = isLayoutPrimitivesEnabled();

  // Read-only stage estimate from on-device session-logger events (T3.7).
  // Computed client-side after mount so SSR stays deterministic.
  const [estimate, setEstimate] = useState<StageEstimate | null>(null);
  useEffect(() => {
    setEstimate(estimateStage());
  }, []);

  const resetDefaults = () => {
    updateSettings(DEFAULTS);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--brand-bg-warm, #FFF8F0)' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-3 relative"
        style={{ backgroundColor: accent }}
      >
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-white font-semibold text-lg active:opacity-80"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-bold text-xl">
          My Stuff
        </span>
        <div className="w-14" />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-28 space-y-5">

        {/* ── Child Name ── */}
        <Section title="What's your name?" icon={<IconUser />}>
          <input
            type="text"
            value={settings.childName}
            onChange={(e) => updateSettings({ childName: e.target.value })}
            placeholder="Type your name here"
            className="w-full px-4 py-3 rounded-xl border-2 text-lg font-medium focus:outline-none transition-colors"
            style={{
              borderColor: settings.childName ? accent : 'var(--warm-border, #E8E0D6)',
              backgroundColor: 'white',
            }}
          />
        </Section>

        {/* ── Stage estimate banner (read-only, T3.7) ── */}
        <StageEstimateBanner estimate={estimate} />

        {/* ── GLP Stage ── */}
        <Section title="Language Stage" icon={<IconStage />}>
          <p className="text-sm mb-3" style={{ color: 'var(--warm-text-secondary, #5C544A)' }}>
            Choose the right stage for communication skills
          </p>
          <div className="space-y-2">
            {GLP_STAGES.map((stage) => {
              const active = settings.glpStage === stage.id;
              return (
                <button
                  key={stage.id}
                  onClick={() => updateSettings({ glpStage: stage.id })}
                  className="w-full text-left px-4 py-3 rounded-xl border-2 transition-all active:scale-[0.98]"
                  style={{
                    borderColor: active ? accent : 'var(--warm-border, #E8E0D6)',
                    backgroundColor: active ? `${accent}12` : 'white',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold" style={{ color: active ? accent : 'var(--warm-text, #1A1614)' }}>
                      Stage {stage.id}: {stage.name}
                    </span>
                    {active && (
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: accent }}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-1" style={{ color: 'var(--warm-text-muted, #9A9088)' }}>
                    {stage.description}
                  </p>
                </button>
              );
            })}
          </div>
        </Section>

        {/* ── Voice ── */}
        <Section title="Voice" icon={<IconVoice />}>
          <p className="text-sm mb-3" style={{ color: 'var(--warm-text-secondary, #5C544A)' }}>
            Pick the voice that speaks for your child. Tap a voice to choose it, or press Play to hear a sample.
          </p>
          <VoicePicker accent={accent} />
        </Section>

        {/* ── TTS Rate ── */}
        <Section title="Voice Speed" icon={<IconVoice />}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: 'var(--warm-text-secondary, #5C544A)' }}>
              {settings.ttsRate < 0.8 ? 'Slow' : settings.ttsRate > 1.2 ? 'Fast' : 'Normal'}
            </span>
            <span
              className="text-sm font-bold px-2 py-0.5 rounded-lg"
              style={{ backgroundColor: `${accent}18`, color: accent }}
            >
              {settings.ttsRate.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            value={settings.ttsRate}
            onChange={(e) => updateSettings({ ttsRate: parseFloat(e.target.value) })}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: accent }}
          />
          <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--warm-text-muted, #9A9088)' }}>
            <span>0.5x</span>
            <span>1.0x</span>
            <span>1.5x</span>
          </div>
        </Section>

        {/* ── Layout Presets ── */}
        <Section title="Layout" icon={<IconLayout />}>
          <p className="text-sm mb-3" style={{ color: 'var(--warm-text-secondary, #5C544A)' }}>
            Pick a ready-made layout for the Talk screen. Choosing one sets the
            grid size, card size and helper rows together. Tweak any of those
            below and the layout becomes &ldquo;Custom&rdquo;.
          </p>
          <LayoutPresetPicker accent={accent} />
        </Section>

        {/* ── Layout Primitives (feature-flagged, structural surfaces) ── */}
        {primitivesEnabled && (
          <Section title="Layout shape" icon={<IconLayout />}>
            <p className="text-sm mb-3" style={{ color: 'var(--warm-text-secondary, #5C544A)' }}>
              Choose the shape of the Talk screen. Each shape arranges the same
              words a different way. Steady Grid is the classic board.
            </p>
            <LayoutPrimitivePicker accent={accent} />
          </Section>
        )}

        {/* ── Grid Columns ── */}
        <Section title="Grid Size" icon={<IconGrid />}>
          <p className="text-sm mb-3" style={{ color: 'var(--warm-text-secondary, #5C544A)' }}>
            How many cards across the screen
          </p>
          <div className="flex gap-2">
            {GRID_OPTIONS.map((cols) => {
              const active = settings.gridColumns === cols;
              return (
                <button
                  key={cols}
                  onClick={() => updateSettings({ gridColumns: cols, activeLayoutPreset: 'custom' })}
                  className="flex-1 py-3 rounded-xl font-bold text-lg transition-all active:scale-95"
                  style={{
                    backgroundColor: active ? accent : 'white',
                    color: active ? 'white' : 'var(--warm-text, #1A1614)',
                    border: `2px solid ${active ? accent : 'var(--warm-border, #E8E0D6)'}`,
                  }}
                >
                  {cols}
                </button>
              );
            })}
          </div>
        </Section>

        {/* ── Primary Color ── */}
        <Section title="Favourite Colour" icon={<IconPalette />}>
          <div className="grid grid-cols-4 gap-3">
            {COLOR_PRESETS.map((preset) => {
              const active = accent === preset.color;
              return (
                <button
                  key={preset.color}
                  onClick={() => updateSettings({ primaryColor: preset.color })}
                  className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-transform active:scale-90"
                  style={{
                    backgroundColor: preset.color,
                    boxShadow: active ? `0 0 0 3px white, 0 0 0 5px ${preset.color}` : 'none',
                    transform: active ? 'scale(1.08)' : undefined,
                  }}
                >
                  {active && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-2">
            {COLOR_PRESETS.map((p) => accent === p.color ? (
              <span key={p.color} className="text-sm font-medium" style={{ color: accent }}>{p.name}</span>
            ) : null)}
          </div>
        </Section>

        {/* ── Smart Suggestions (on-device AI) ── */}
        <Section title="Smart Suggestions" icon={<IconSpark />}>
          <SmartSuggestionsToggle accent={accent} />
        </Section>

        {/* ── Your Words row (GLP T2.5 personal vocab promotion) ── */}
        <Section title="Your Words row" icon={<IconStar />}>
          <p className="text-sm mb-3" style={{ color: 'var(--warm-text-secondary, #5C544A)' }}>
            Pin the child&apos;s most-tapped words at the top of Talk. Hidden
            automatically until a word has been tapped 5+ times in the last 7 days.
          </p>
          <button
            type="button"
            role="switch"
            aria-checked={settings.showPersonalVocab !== false}
            onClick={() => updateSettings({ showPersonalVocab: !(settings.showPersonalVocab !== false), activeLayoutPreset: 'custom' })}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-colors active:scale-[0.98]"
            style={{
              borderColor: settings.showPersonalVocab !== false ? accent : 'var(--warm-border, #E8E0D6)',
              backgroundColor: settings.showPersonalVocab !== false ? `${accent}12` : 'white',
            }}
          >
            <span className="font-semibold" style={{ color: 'var(--warm-text, #1A1614)' }}>
              {settings.showPersonalVocab !== false ? 'Showing Your Words' : 'Hidden'}
            </span>
            <span
              className="relative inline-block w-11 h-6 rounded-full transition-colors"
              style={{ backgroundColor: settings.showPersonalVocab !== false ? accent : '#CBC5BC' }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                style={{
                  transform: settings.showPersonalVocab !== false ? 'translateX(20px)' : 'translateX(0)',
                }}
              />
            </span>
          </button>
        </Section>

        {/* ── Install app / Add to Home Screen ── */}
        <Section title="Install app" icon={<IconDownload />}>
          <InstallSection accent={accent} />
        </Section>

        {/* ── Privacy & Consent ── */}
        <Section title="Privacy & Consent" icon={<IconShield />}>
          <p className="text-sm mb-3" style={{ color: 'var(--warm-text-secondary, #5C544A)' }}>
            Withdraw consent or delete everything. One tap, no friction.
          </p>
          <Link
            href="/settings/privacy"
            className="inline-flex items-center justify-center w-full py-3 rounded-xl border-2 font-semibold text-base active:scale-[0.98]"
            style={{ borderColor: accent, color: accent, backgroundColor: 'white' }}
          >
            Open Privacy &amp; Consent
          </Link>
        </Section>

        {/* ── Reset ── */}
        <button
          onClick={resetDefaults}
          className="w-full py-3 rounded-xl border-2 font-semibold text-base transition-all active:scale-[0.98]"
          style={{
            borderColor: '#F44336',
            color: '#F44336',
            backgroundColor: 'white',
          }}
        >
          Reset to Defaults
        </button>

        {/* Version footer */}
        <p className="text-center text-xs pb-4" style={{ color: 'var(--warm-text-muted, #9A9088)' }}>
          8gent Jr v1.0. Made with care.
        </p>
      </div>
    </div>
  );
}

/* ── Stage estimate banner (T3.7) ── */
function StageEstimateBanner({ estimate }: { estimate: StageEstimate | null }) {
  // Pre-mount or zero-confidence: show "not enough data yet" copy.
  const notEnough = !estimate || estimate.confidence === 0;

  const stageMeta = estimate ? getStage(estimate.stage) : null;

  return (
    <div
      className="rounded-2xl px-4 py-3 border"
      style={{
        backgroundColor: '#F0F9FF', // sky-50
        borderColor: '#BAE6FD',     // sky-200
      }}
      aria-live="polite"
    >
      <div className="flex items-center gap-2 mb-1">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0369A1"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#0369A1' }}>
          Suggested stage
        </span>
      </div>
      {notEnough || !stageMeta ? (
        <p className="text-sm" style={{ color: '#0C4A6E' }}>
          Not enough activity yet to estimate a stage. Keep using Talk and we will
          suggest one once we have more data.
        </p>
      ) : (
        <p className="text-sm" style={{ color: '#0C4A6E' }}>
          Based on recent activity, your child appears to be at Stage {stageMeta.id}: {stageMeta.name}.
          You can override this with the slider below.
        </p>
      )}
    </div>
  );
}

/* ── Voice picker ── */
function VoicePicker({ accent }: { accent: string }) {
  const { settings, updateSettings } = useApp();
  const activeId = settings.selectedVoiceId ?? DEFAULT_VOICE_ID;
  const [previewing, setPreviewing] = useState<string | null>(null);

  const playSample = async (id: string) => {
    setPreviewing(id);
    try {
      await speak({ text: VOICE_SAMPLE_TEXT, voiceId: id, rate: settings.ttsRate });
    } catch {
      /* preview is best-effort */
    } finally {
      setPreviewing(null);
    }
  };

  return (
    <div className="space-y-2" role="radiogroup" aria-label="Speaking voice">
      {VOICES.map((voice) => {
        const active = activeId === voice.id;
        return (
          <div
            key={voice.id}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all"
            style={{
              borderColor: active ? accent : 'var(--warm-border, #E8E0D6)',
              backgroundColor: active ? `${accent}12` : 'white',
            }}
          >
            <button
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => updateSettings({ selectedVoiceId: voice.id })}
              className="flex-1 text-left active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold" style={{ color: active ? accent : 'var(--warm-text, #1A1614)' }}>
                  {voice.name}
                </span>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                  style={{ backgroundColor: 'var(--warm-border-light, #F0EAE3)', color: 'var(--warm-text-muted, #9A9088)' }}
                >
                  {voice.accent}
                </span>
              </div>
              <p className="text-sm mt-0.5" style={{ color: 'var(--warm-text-muted, #9A9088)' }}>
                {voice.blurb}
              </p>
            </button>
            <button
              type="button"
              onClick={() => playSample(voice.id)}
              disabled={previewing !== null}
              aria-label={`Play a sample of ${voice.name}`}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
              style={{ backgroundColor: `${accent}18`, color: accent }}
            >
              {previewing === voice.id ? (
                <span className="block w-3 h-3 rounded-sm" style={{ backgroundColor: accent }} aria-hidden="true" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            {active && (
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: accent }}
                aria-hidden="true"
              >
                ✓
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Install app / Add to Home Screen (PWA) ── */
function InstallSection({ accent }: { accent: string }) {
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>('other');
  const [canPrompt, setCanPrompt] = useState(false);

  useEffect(() => {
    initPwaInstall();
    setInstalled(isStandalone());
    setPlatform(detectPlatform());
    setCanPrompt(hasInstallPrompt());
    const unsub = subscribePwaInstall(() => setCanPrompt(hasInstallPrompt()));
    return unsub;
  }, []);

  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === 'accepted') setInstalled(true);
  };

  // Already installed → confirmation, nothing else to do.
  if (installed) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl px-4 py-3 border-2"
        style={{ borderColor: accent, backgroundColor: `${accent}12` }}
        aria-live="polite"
      >
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: accent }}
          aria-hidden="true"
        >
          ✓
        </span>
        <p className="font-semibold" style={{ color: 'var(--warm-text, #1A1614)' }}>
          Installed - running as an app
        </p>
      </div>
    );
  }

  // iOS / Safari: no beforeinstallprompt - show manual steps.
  if (platform === 'ios' || (!canPrompt && platform === 'other')) {
    return (
      <div>
        <p className="text-sm mb-3" style={{ color: 'var(--warm-text-secondary, #5C544A)' }}>
          Add 8gent Jr to your Home Screen so it opens full screen, like a real app -
          no browser bar.
        </p>
        <div
          className="rounded-xl px-4 py-3 border-2 space-y-2"
          style={{ borderColor: 'var(--warm-border, #E8E0D6)', backgroundColor: 'white' }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: accent }}
              aria-hidden="true"
            >
              1
            </span>
            <p className="text-sm" style={{ color: 'var(--warm-text, #1A1614)' }}>
              Tap the{' '}
              <span className="font-bold" style={{ color: accent }}>Share</span> button
              in your browser&apos;s toolbar.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: accent }}
              aria-hidden="true"
            >
              2
            </span>
            <p className="text-sm" style={{ color: 'var(--warm-text, #1A1614)' }}>
              Choose{' '}
              <span className="font-bold" style={{ color: accent }}>Add to Home Screen</span>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Android / Chromium: one-tap native install when a deferred prompt exists.
  return (
    <div>
      <p className="text-sm mb-3" style={{ color: 'var(--warm-text-secondary, #5C544A)' }}>
        Install 8gent Jr as an app - opens full screen, no browser bar, works offline.
        This is the app; there is no separate download.
      </p>
      <button
        type="button"
        onClick={handleInstall}
        disabled={!canPrompt}
        aria-label="Install 8gent Jr as an app"
        className="w-full min-h-[44px] py-3 rounded-xl font-bold text-base transition-all active:scale-[0.98] disabled:opacity-60"
        style={{
          backgroundColor: canPrompt ? accent : 'white',
          color: canPrompt ? 'white' : 'var(--warm-text-muted, #9A9088)',
          border: `2px solid ${canPrompt ? accent : 'var(--warm-border, #E8E0D6)'}`,
        }}
      >
        {canPrompt ? 'Add to Home Screen' : 'Install not available yet'}
      </button>
      {!canPrompt && (
        <p className="text-xs mt-2" style={{ color: 'var(--warm-text-muted, #9A9088)' }}>
          Open this page in Chrome on Android to install. If you already installed it,
          open it from your Home Screen.
        </p>
      )}
    </div>
  );
}

/* ── Layout preset picker (radiogroup) ── */
function LayoutPresetPicker({ accent }: { accent: string }) {
  const { settings, updateSettings } = useApp();
  const activeId = settings.activeLayoutPreset ?? 'custom';

  const applyPreset = (preset: LayoutPreset) => {
    updateSettings({
      gridColumns: preset.gridColumns,
      cardSize: preset.cardSize,
      showPredictions: preset.showPredictions,
      showPersonalVocab: preset.showPersonalVocab,
      density: preset.density,
      activeLayoutPreset: preset.id,
    });
  };

  return (
    <div className="space-y-2" role="radiogroup" aria-label="Talk screen layout">
      {LAYOUT_PRESETS.map((preset) => {
        const active = activeId === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => applyPreset(preset)}
            className="w-full flex items-center gap-3 text-left px-3 py-3 rounded-xl border-2 transition-all active:scale-[0.98]"
            style={{
              borderColor: active ? accent : 'var(--warm-border, #E8E0D6)',
              backgroundColor: active ? `${accent}12` : 'white',
            }}
          >
            <PresetHint preset={preset} />
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-2">
                <span className="font-bold" style={{ color: active ? accent : 'var(--warm-text, #1A1614)' }}>
                  {preset.name}
                </span>
                {active && (
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: accent }}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                )}
              </span>
              <span className="block text-sm mt-0.5" style={{ color: 'var(--warm-text-muted, #9A9088)' }}>
                {preset.description}
              </span>
            </span>
          </button>
        );
      })}

      {/* Custom state row: not selectable, only reflects hand-tuned settings. */}
      {activeId === 'custom' && (
        <div
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border-2"
          style={{ borderColor: accent, backgroundColor: `${accent}12` }}
          aria-live="polite"
        >
          <span
            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 border-2 border-dashed"
            style={{ borderColor: accent, color: accent }}
            aria-hidden="true"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </span>
          <span className="flex-1 min-w-0">
            <span className="flex items-center gap-2">
              <span className="font-bold" style={{ color: accent }}>Custom</span>
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: accent }}
                aria-hidden="true"
              >
                ✓
              </span>
            </span>
            <span className="block text-sm mt-0.5" style={{ color: 'var(--warm-text-muted, #9A9088)' }}>
              Your own mix. Pick a layout above to start over.
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

/* Tiny visual hint: a mini grid preview mirroring the preset's columns/density. */
function PresetHint({ preset }: { preset: LayoutPreset }) {
  const cells = Array.from({ length: preset.hint.cells });
  return (
    <span
      className="grid gap-0.5 w-12 h-12 p-1 rounded-lg flex-shrink-0 self-start"
      style={{
        gridTemplateColumns: `repeat(${preset.hint.cols}, 1fr)`,
        backgroundColor: 'var(--warm-border-light, #F0EAE3)',
      }}
      aria-hidden="true"
    >
      {cells.map((_, i) => (
        <span
          key={i}
          className="rounded-[2px]"
          style={{ backgroundColor: preset.hint.color, opacity: 0.85 }}
        />
      ))}
    </span>
  );
}

/* ── Layout primitive picker (radiogroup, feature-flagged) ── */
function LayoutPrimitivePicker({ accent }: { accent: string }) {
  const { settings, updateSettings } = useApp();
  const activeId = settings.activeLayoutPrimitive ?? 'alpha';

  const applyPrimitive = (primitive: LayoutPrimitive) => {
    // Presentation-only: apply the primitive's layout bundle and record the
    // selection. Vocabulary, categories, personal words and phrase folders
    // live in their own storage keys and are never touched here.
    updateSettings({
      gridColumns: primitive.bundle.gridColumns,
      cardSize: primitive.bundle.cardSize,
      showPredictions: primitive.bundle.showPredictions,
      showPersonalVocab: primitive.bundle.showPersonalVocab,
      density: primitive.bundle.density,
      activeLayoutPrimitive: primitive.id,
    });
  };

  return (
    <div className="space-y-2" role="radiogroup" aria-label="Talk screen shape">
      {LAYOUT_PRIMITIVES.map((primitive) => {
        const active = activeId === primitive.id;
        return (
          <button
            key={primitive.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => applyPrimitive(primitive)}
            className="w-full flex items-center gap-3 text-left px-3 py-3 rounded-xl border-2 transition-all active:scale-[0.98]"
            style={{
              borderColor: active ? accent : 'var(--warm-border, #E8E0D6)',
              backgroundColor: active ? `${accent}12` : 'white',
            }}
          >
            <PrimitiveHint primitive={primitive} />
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-2">
                <span
                  className="text-lg font-bold leading-none"
                  style={{ color: primitive.hint.color }}
                  aria-hidden="true"
                >
                  {primitive.glyph}
                </span>
                <span className="font-bold" style={{ color: active ? accent : 'var(--warm-text, #1A1614)' }}>
                  {primitive.name}
                </span>
                {active && (
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: accent }}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                )}
              </span>
              <span className="block text-sm mt-0.5" style={{ color: 'var(--warm-text-muted, #9A9088)' }}>
                {primitive.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* Tiny visual hint for a primitive: a mini grid preview mirroring its shape. */
function PrimitiveHint({ primitive }: { primitive: LayoutPrimitive }) {
  const cells = Array.from({ length: primitive.hint.cells });
  return (
    <span
      className="grid gap-0.5 w-12 h-12 p-1 rounded-lg flex-shrink-0 self-start"
      style={{
        gridTemplateColumns: `repeat(${primitive.hint.cols}, 1fr)`,
        backgroundColor: 'var(--warm-border-light, #F0EAE3)',
      }}
      aria-hidden="true"
    >
      {cells.map((_, i) => (
        <span
          key={i}
          className="rounded-[2px]"
          style={{ backgroundColor: primitive.hint.color, opacity: 0.85 }}
        />
      ))}
    </span>
  );
}

/* ── Section wrapper ── */
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-sm"
      style={{ backgroundColor: 'white' }}
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--warm-border-light, #F0EAE3)' }}>
        <span style={{ color: 'var(--warm-text-muted, #9A9088)' }}>{icon}</span>
        <h2 className="font-bold text-base" style={{ color: 'var(--warm-text, #1A1614)' }}>{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/* ── SVG Icons ── */
function IconUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconStage() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h20M5 20V10l7-7 7 7v10" />
      <rect x="9" y="14" width="6" height="6" />
    </svg>
  );
}

function IconVoice() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconLayout() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 4v6c0 5-3.5 9.4-8 10-4.5-.6-8-5-8-10V6l8-4z" />
    </svg>
  );
}

function IconSpark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17l-1.9-5.1L4.5 10l5.6-1.4z" />
      <path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.1 8.6 22 9.3 16.7 14 18.2 21 12 17.3 5.8 21 7.3 14 2 9.3 8.9 8.6 12 2" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconPalette() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="2" />
      <circle cx="17.5" cy="10.5" r="2" />
      <circle cx="8.5" cy="7.5" r="2" />
      <circle cx="6.5" cy="12" r="2" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}
