'use client';

import Link from 'next/link';
import { useState } from 'react';
import SongCreator from '@/components/SongCreator';

/* ── Music Hub Tabs ──────────────────────────────────────── */

const TABS = [
  { id: 'instruments', label: 'Instruments', icon: '🎹' },
  { id: 'moods',       label: 'Moods',       icon: '🎭' },
  { id: 'create',      label: 'Create Song',  icon: '🎤' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/* ── Page ─────────────────────────────────────────────────── */

export default function MusicHubPage() {
  const [tab, setTab] = useState<TabId>('instruments');

  return (
    <div className="min-h-dvh flex flex-col items-center bg-[#FFF8F0] pb-24">
      {/* Header */}
      <h1 className="text-[22px] font-extrabold mt-5 mb-1 text-[#1a1a2e]">
        Music
      </h1>

      {/* Tab bar */}
      <div className="flex gap-2 my-3 mb-5 p-1 rounded-[14px] bg-[#f0e6d6]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 border-none rounded-[10px] font-bold text-[14px] cursor-pointer transition-all duration-150 ${
              tab === t.id
                ? 'bg-white text-[#1a1a2e] shadow-md'
                : 'bg-transparent text-[#8a7e70]'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'instruments' && (
        <div className="flex flex-col items-center gap-4 w-full max-w-md px-4">
          <p className="text-[#8a7e70] text-center text-[15px]">
            Play drums, xylophone, and more!
          </p>
          <Link
            href="/music/instruments"
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#E8610A] text-white font-bold text-lg shadow-lg active:scale-95 transition-transform no-underline"
          >
            🎹 Open Instruments
          </Link>
        </div>
      )}

      {tab === 'moods' && (
        <div className="flex flex-col items-center gap-4 w-full max-w-md px-4">
          <p className="text-[#8a7e70] text-center text-[15px]">
            Pick a mood and listen to matching music!
          </p>
          <Link
            href="/music/moods"
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white font-bold text-lg shadow-lg active:scale-95 transition-transform no-underline"
          >
            🎭 Browse Moods
          </Link>
        </div>
      )}

      {tab === 'create' && <SongCreator />}
    </div>
  );
}
