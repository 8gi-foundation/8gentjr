'use client';

import { useRouter } from 'next/navigation';
import { useApp, type AppSettings } from '@/context/AppContext';
import { GLP_STAGES } from '@/lib/glp/stages';

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
};

export default function SettingsPage() {
  const router = useRouter();
  const { settings, updateSettings } = useApp();

  const accent = settings.primaryColor || '#4CAF50';

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
                  onClick={() => updateSettings({ gridColumns: cols })}
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
