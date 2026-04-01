"use client";

import { useState, useCallback, useMemo } from "react";

/* ──────────────────────────────────────────────
   Phoneme Data — 20 phonemes: 5 vowels, 10 consonants, 5 blends
   ────────────────────────────────────────────── */

type Category = "vowel" | "consonant" | "blend";

interface Phoneme {
  id: string;
  symbol: string;
  example: string;
  mouth: string;
  category: Category;
  /** SVG path data for a simplified mouth shape */
  mouthPath: string;
}

const PHONEMES: Phoneme[] = [
  // ── Vowels ──
  { id: "aa", symbol: "aa", example: "cat", mouth: "Open wide, tongue flat and low", category: "vowel", mouthPath: "M 20,50 Q 50,85 80,50 Q 50,65 20,50 Z" },
  { id: "ee", symbol: "ee", example: "tree", mouth: "Lips spread wide, tongue high and forward", category: "vowel", mouthPath: "M 15,48 Q 50,58 85,48 Q 50,52 15,48 Z" },
  { id: "oo", symbol: "oo", example: "moon", mouth: "Lips rounded into a small circle", category: "vowel", mouthPath: "M 35,35 Q 35,65 50,65 Q 65,65 65,35 Q 65,20 50,20 Q 35,20 35,35 Z" },
  { id: "ah", symbol: "ah", example: "car", mouth: "Mouth open wide, jaw dropped, tongue low", category: "vowel", mouthPath: "M 20,40 Q 50,90 80,40 Q 50,55 20,40 Z" },
  { id: "eh", symbol: "eh", example: "bed", mouth: "Mouth half open, tongue mid-height", category: "vowel", mouthPath: "M 18,48 Q 50,70 82,48 Q 50,55 18,48 Z" },

  // ── Consonants ──
  { id: "b", symbol: "b", example: "ball", mouth: "Lips pressed together then released with voice", category: "consonant", mouthPath: "M 20,48 Q 50,50 80,48 Q 50,52 20,48 Z" },
  { id: "d", symbol: "d", example: "dog", mouth: "Tongue tip taps the ridge behind upper teeth", category: "consonant", mouthPath: "M 22,45 Q 50,60 78,45 Q 50,50 22,45 Z" },
  { id: "f", symbol: "f", example: "fish", mouth: "Upper teeth rest gently on lower lip", category: "consonant", mouthPath: "M 20,46 L 80,46 Q 50,58 20,46 Z" },
  { id: "k", symbol: "k", example: "kite", mouth: "Back of tongue touches soft palate, then releases", category: "consonant", mouthPath: "M 25,44 Q 50,62 75,44 Q 50,50 25,44 Z" },
  { id: "l", symbol: "l", example: "lion", mouth: "Tongue tip behind upper teeth, air flows around sides", category: "consonant", mouthPath: "M 22,46 Q 50,58 78,46 Q 50,50 22,46 Z" },
  { id: "m", symbol: "m", example: "mum", mouth: "Lips together, sound comes through nose", category: "consonant", mouthPath: "M 20,49 Q 50,51 80,49 Q 50,51 20,49 Z" },
  { id: "n", symbol: "n", example: "nose", mouth: "Tongue tip on ridge, sound through nose", category: "consonant", mouthPath: "M 20,48 Q 50,54 80,48 Q 50,50 20,48 Z" },
  { id: "p", symbol: "p", example: "pig", mouth: "Lips pressed together then popped open (no voice)", category: "consonant", mouthPath: "M 20,48 Q 50,50 80,48 Q 50,52 20,48 Z" },
  { id: "s", symbol: "s", example: "sun", mouth: "Teeth close together, tongue behind teeth, hissing air", category: "consonant", mouthPath: "M 22,47 Q 50,53 78,47 Q 50,50 22,47 Z" },
  { id: "t", symbol: "t", example: "top", mouth: "Tongue tip taps ridge behind teeth quickly", category: "consonant", mouthPath: "M 22,45 Q 50,58 78,45 Q 50,50 22,45 Z" },

  // ── Blends ──
  { id: "sh", symbol: "sh", example: "ship", mouth: "Lips pushed forward, tongue pulled back, gentle air", category: "blend", mouthPath: "M 28,40 Q 28,60 50,60 Q 72,60 72,40 Q 72,30 50,30 Q 28,30 28,40 Z" },
  { id: "ch", symbol: "ch", example: "chip", mouth: "Tongue touches roof then releases with a burst of air", category: "blend", mouthPath: "M 30,42 Q 50,62 70,42 Q 50,48 30,42 Z" },
  { id: "th", symbol: "th", example: "this", mouth: "Tongue tip between upper and lower teeth", category: "blend", mouthPath: "M 20,46 Q 50,56 80,46 L 50,48 Z" },
  { id: "bl", symbol: "bl", example: "blue", mouth: "Lips press then release while tongue lifts for L", category: "blend", mouthPath: "M 22,45 Q 50,62 78,45 Q 50,52 22,45 Z" },
  { id: "tr", symbol: "tr", example: "tree", mouth: "Tongue taps ridge then curls back for R", category: "blend", mouthPath: "M 24,44 Q 50,64 76,44 Q 50,52 24,44 Z" },
];

type TabFilter = "all" | Category;

const TAB_LABELS: { key: TabFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "vowel", label: "Vowels" },
  { key: "consonant", label: "Consonants" },
  { key: "blend", label: "Blends" },
];

const CATEGORY_COLORS: Record<Category, string> = {
  vowel: "#FCE4EC",
  consonant: "#E3F2FD",
  blend: "#F3E5F5",
};

const CATEGORY_ACCENT: Record<Category, string> = {
  vowel: "#E91E63",
  consonant: "#1976D2",
  blend: "#7B1FA2",
};

/* ──────────────────────────────────────────────
   Mouth SVG Component
   ────────────────────────────────────────────── */

function MouthVisual({ phoneme }: { phoneme: Phoneme }) {
  const accent = CATEGORY_ACCENT[phoneme.category];

  return (
    <svg
      viewBox="0 0 100 100"
      width={80}
      height={80}
      aria-label={`Mouth position for ${phoneme.symbol}`}
      className="block mx-auto"
    >
      {/* Face circle */}
      <circle cx={50} cy={50} r={46} fill="#FFE0B2" stroke="#FFAB91" strokeWidth={2} />
      {/* Eyes */}
      <circle cx={35} cy={35} r={4} fill="#5D4037" />
      <circle cx={65} cy={35} r={4} fill="#5D4037" />
      {/* Nose */}
      <ellipse cx={50} cy={44} rx={3} ry={2} fill="#FFAB91" />
      {/* Mouth shape */}
      <path d={phoneme.mouthPath} fill={accent} opacity={0.7} stroke={accent} strokeWidth={1.5} />
    </svg>
  );
}

/* ──────────────────────────────────────────────
   Main Component
   ────────────────────────────────────────────── */

export default function SpeechTherapy() {
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [practiced, setPracticed] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);

  const filtered = useMemo(
    () => (activeTab === "all" ? PHONEMES : PHONEMES.filter((p) => p.category === activeTab)),
    [activeTab],
  );

  const totalCount = filtered.length;
  const practicedCount = filtered.filter((p) => practiced.has(p.id)).length;
  const progress = totalCount > 0 ? practicedCount / totalCount : 0;

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.7;
    window.speechSynthesis.speak(utterance);
  }, []);

  const handleTap = useCallback(
    (phoneme: Phoneme) => {
      setActiveId(phoneme.id);
      speak(phoneme.example);
      setPracticed((prev) => {
        const next = new Set(prev);
        next.add(phoneme.id);
        return next;
      });
      setTimeout(() => setActiveId(null), 600);
    },
    [speak],
  );

  return (
    <div className="max-w-[800px] mx-auto p-6 font-sans text-[#1a1a2e]">
      <h1 className="text-[28px] font-extrabold text-center mb-2">Speech Therapy</h1>
      <p className="text-base text-gray-500 text-center mb-6">Tap a sound to hear it and see the mouth position</p>

      {/* ── Category Tabs ── */}
      <div className="flex gap-2 justify-center mb-6 flex-wrap">
        {TAB_LABELS.map((tab) => (
          <button
            key={tab.key}
            className={`px-4 py-2 rounded-full border-none cursor-pointer text-base min-h-[48px] min-w-[48px] transition-colors ${
              activeTab === tab.key
                ? "bg-[#E8610A] text-white font-semibold"
                : "bg-[#FFF1E6] text-[#1a1a2e] font-normal"
            }`}
            onClick={() => setActiveTab(tab.key)}
            aria-pressed={activeTab === tab.key}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Progress Bar ── */}
      <div className="mb-6 text-center">
        <div className="text-[13px] text-gray-500 mb-1">
          {practicedCount} / {totalCount} practiced
        </div>
        <div className="w-full h-3 rounded-full bg-[#FFF1E6] overflow-hidden border border-[#F0DECA]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#E8610A] to-[#F59E0B] transition-[width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* ── Phoneme Cards ── */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
        {filtered.map((phoneme) => {
          const isActive = activeId === phoneme.id;
          return (
            <button
              key={phoneme.id}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl cursor-pointer min-h-[56px] select-none transition-all duration-200 ${
                isActive ? "scale-95 shadow-[0_0_0_3px_rgba(232,97,10,0.2)]" : "scale-100 shadow-[0_2px_12px_rgba(232,97,10,0.08)]"
              }`}
              style={{
                background: practiced.has(phoneme.id) ? CATEGORY_COLORS[phoneme.category] : "#FFF1E6",
                border: `2px solid ${isActive ? CATEGORY_ACCENT[phoneme.category] : "#F0DECA"}`,
                WebkitTapHighlightColor: "transparent",
              }}
              onClick={() => handleTap(phoneme)}
              aria-label={`${phoneme.symbol} as in ${phoneme.example}`}
            >
              <span
                className="text-2xl font-bold bg-white rounded-full px-3 py-1 tracking-wide lowercase shadow-sm"
                style={{ color: CATEGORY_ACCENT[phoneme.category] }}
              >
                /{phoneme.symbol}/
              </span>
              <MouthVisual phoneme={phoneme} />
              <span className="text-base font-semibold text-[#1a1a2e]">&ldquo;{phoneme.example}&rdquo;</span>
              <span className="text-[13px] text-gray-500 text-center leading-tight">{phoneme.mouth}</span>
              {practiced.has(phoneme.id) && <span className="text-lg text-emerald-600 font-bold">&#10003;</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
