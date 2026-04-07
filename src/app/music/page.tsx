'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import SongCreator from '@/components/SongCreator';

const TABS = [
  { id: 'songs',       label: 'My Songs',   icon: '🎵' },
  { id: 'create',      label: 'Create',     icon: '✨' },
  { id: 'instruments', label: 'Instruments', icon: '🎹' },
] as const;

type TabId = (typeof TABS)[number]['id'];

interface SavedSong {
  id: string;
  title: string;
  audioUrl: string;
  createdAt: number;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function MySongsTab() {
  const [songs, setSongs] = useState<SavedSong[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('8gentjr_songs') || '[]');
      setSongs(saved);
    } catch { /* noop */ }
  }, []);

  const handlePlay = (song: SavedSong) => {
    if (playingId === song.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(song.audioUrl);
    audio.play();
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    setPlayingId(song.id);
  };

  const handleDelete = (id: string) => {
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
    }
    const updated = songs.filter(s => s.id !== id);
    setSongs(updated);
    try { localStorage.setItem('8gentjr_songs', JSON.stringify(updated)); } catch { /* noop */ }
  };

  if (songs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 px-6 text-center">
        <div className="text-5xl">🎤</div>
        <p className="font-bold text-[#1a1a2e] text-lg">No songs yet</p>
        <p className="text-[#8a7e70] text-sm leading-relaxed max-w-[280px]">
          Head to the Create tab to make your first AI-generated song — it&apos;ll show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md px-4 flex flex-col gap-2">
      <p className="text-xs text-[#8a7e70] font-medium mb-1">{songs.length} song{songs.length !== 1 ? 's' : ''}</p>
      {songs.map((song) => {
        const isPlaying = playingId === song.id;
        return (
          <div
            key={song.id}
            className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
              isPlaying
                ? 'border-[#E8610A] bg-[#FFF3EA]'
                : 'border-[#f0e6d6] bg-white'
            }`}
          >
            {/* Play/pause button */}
            <button
              onClick={() => handlePlay(song)}
              className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-lg shadow transition-transform active:scale-90 border-none cursor-pointer ${
                isPlaying
                  ? 'bg-gradient-to-br from-[#E8610A] to-[#c44f08]'
                  : 'bg-gradient-to-br from-[#10B981] to-[#059669]'
              }`}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>

            {/* Song info */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#1a1a2e] text-sm truncate">{song.title}</p>
              <p className="text-[#8a7e70] text-xs">{formatDate(song.createdAt)}</p>
            </div>

            {/* Delete */}
            <button
              onClick={() => handleDelete(song.id)}
              className="w-8 h-8 shrink-0 rounded-full bg-[#f0e6d6] text-[#8a7e70] flex items-center justify-center text-xs border-none cursor-pointer hover:bg-red-100 hover:text-red-500 transition-colors"
              aria-label="Delete song"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default function MusicHubPage() {
  const [tab, setTab] = useState<TabId>('songs');

  return (
    <div className="min-h-dvh flex flex-col items-center bg-[#FFF8F0] pb-24">
      {/* Header */}
      <h1 className="text-[22px] font-extrabold mt-5 mb-1 text-[#1a1a2e]">Music</h1>

      {/* Tab bar */}
      <div className="flex gap-1.5 my-3 mb-5 p-1 rounded-[14px] bg-[#f0e6d6]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 border-none rounded-[10px] font-bold text-[13px] cursor-pointer transition-all duration-150 whitespace-nowrap ${
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
      {tab === 'songs' && <MySongsTab />}
      {tab === 'create' && <SongCreator />}
      {tab === 'instruments' && (
        <div className="flex flex-col items-center gap-4 w-full max-w-md px-4">
          <p className="text-[#8a7e70] text-center text-[15px]">Play drums, xylophone, and more!</p>
          <Link
            href="/music/instruments"
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#E8610A] text-white font-bold text-lg shadow-lg active:scale-95 transition-transform no-underline"
          >
            🎹 Open Instruments
          </Link>
        </div>
      )}
    </div>
  );
}
