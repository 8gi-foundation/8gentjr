"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { speak } from "@/lib/tts";

/* ── Types ───────────────────────────────────────────────── */

interface SavedPhrase {
  id: string;
  text: string;
  category: string;
  createdAt: number;
}

type InputMode = "choose" | "text" | "voice" | "fitzgerald";

/* ── Auto-categorisation ─────────────────────────────────── */

function autoCategory(text: string): string {
  const t = text.toLowerCase();
  if (/\b(feel|feeling|happy|sad|angry|tired|scared|hurt|sick|love|excited|upset|worried)\b/.test(t)) return "Feelings";
  if (/\b(want|need|can i|may i|please give|i would like|can you|could you)\b/.test(t)) return "Requests";
  if (/\b(what|where|who|why|when|how|which)\b/.test(t)) return "Questions";
  if (/\b(hello|hi|bye|goodbye|thank|sorry|please|excuse|morning|night)\b/.test(t)) return "Social";
  if (/\b(eat|drink|hungry|thirsty|food|water|snack|lunch|dinner|breakfast|juice)\b/.test(t)) return "Food";
  if (/\b(school|teacher|class|homework|read|write|learn|study|lesson|book)\b/.test(t)) return "School";
  if (/\b(toilet|bathroom|wash|sleep|rest|pain|ow|ouch)\b/.test(t)) return "Body";
  return "Common";
}

/* ── Fitzgerald word bank ────────────────────────────────── */

const WORD_BANK = [
  { word: "I",         bg: "#F6D860", fg: "#5A4A00", cat: "People" },
  { word: "you",       bg: "#F6D860", fg: "#5A4A00", cat: "People" },
  { word: "we",        bg: "#F6D860", fg: "#5A4A00", cat: "People" },
  { word: "they",      bg: "#F6D860", fg: "#5A4A00", cat: "People" },
  { word: "he",        bg: "#F6D860", fg: "#5A4A00", cat: "People" },
  { word: "she",       bg: "#F6D860", fg: "#5A4A00", cat: "People" },
  { word: "my",        bg: "#F6D860", fg: "#5A4A00", cat: "People" },
  { word: "want",      bg: "#4CAF7D", fg: "#fff", cat: "Verbs" },
  { word: "need",      bg: "#4CAF7D", fg: "#fff", cat: "Verbs" },
  { word: "like",      bg: "#4CAF7D", fg: "#fff", cat: "Verbs" },
  { word: "go",        bg: "#4CAF7D", fg: "#fff", cat: "Verbs" },
  { word: "eat",       bg: "#4CAF7D", fg: "#fff", cat: "Verbs" },
  { word: "drink",     bg: "#4CAF7D", fg: "#fff", cat: "Verbs" },
  { word: "play",      bg: "#4CAF7D", fg: "#fff", cat: "Verbs" },
  { word: "help",      bg: "#4CAF7D", fg: "#fff", cat: "Verbs" },
  { word: "feel",      bg: "#4CAF7D", fg: "#fff", cat: "Verbs" },
  { word: "have",      bg: "#4CAF7D", fg: "#fff", cat: "Verbs" },
  { word: "happy",     bg: "#5BC0DE", fg: "#fff", cat: "Feelings" },
  { word: "sad",       bg: "#5BC0DE", fg: "#fff", cat: "Feelings" },
  { word: "angry",     bg: "#5BC0DE", fg: "#fff", cat: "Feelings" },
  { word: "tired",     bg: "#5BC0DE", fg: "#fff", cat: "Feelings" },
  { word: "scared",    bg: "#5BC0DE", fg: "#fff", cat: "Feelings" },
  { word: "good",      bg: "#5BC0DE", fg: "#fff", cat: "Feelings" },
  { word: "hurt",      bg: "#5BC0DE", fg: "#fff", cat: "Feelings" },
  { word: "big",       bg: "#5BC0DE", fg: "#fff", cat: "Feelings" },
  { word: "little",    bg: "#5BC0DE", fg: "#fff", cat: "Feelings" },
  { word: "please",    bg: "#F4A0C0", fg: "#5A0020", cat: "Social" },
  { word: "thank you", bg: "#F4A0C0", fg: "#5A0020", cat: "Social" },
  { word: "sorry",     bg: "#F4A0C0", fg: "#5A0020", cat: "Social" },
  { word: "hello",     bg: "#F4A0C0", fg: "#5A0020", cat: "Social" },
  { word: "bye",       bg: "#F4A0C0", fg: "#5A0020", cat: "Social" },
  { word: "yes",       bg: "#F4A0C0", fg: "#5A0020", cat: "Social" },
  { word: "okay",      bg: "#F4A0C0", fg: "#5A0020", cat: "Social" },
  { word: "what",      bg: "#E8610A", fg: "#fff", cat: "Questions" },
  { word: "where",     bg: "#E8610A", fg: "#fff", cat: "Questions" },
  { word: "when",      bg: "#E8610A", fg: "#fff", cat: "Questions" },
  { word: "who",       bg: "#E8610A", fg: "#fff", cat: "Questions" },
  { word: "why",       bg: "#E8610A", fg: "#fff", cat: "Questions" },
  { word: "how",       bg: "#E8610A", fg: "#fff", cat: "Questions" },
  { word: "no",        bg: "#D9534F", fg: "#fff", cat: "No" },
  { word: "don't",     bg: "#D9534F", fg: "#fff", cat: "No" },
  { word: "stop",      bg: "#D9534F", fg: "#fff", cat: "No" },
  { word: "more",      bg: "#9B9B9B", fg: "#fff", cat: "More" },
  { word: "the",       bg: "#9B9B9B", fg: "#fff", cat: "More" },
  { word: "a",         bg: "#9B9B9B", fg: "#fff", cat: "More" },
  { word: "is",        bg: "#9B9B9B", fg: "#fff", cat: "More" },
  { word: "in",        bg: "#9B9B9B", fg: "#fff", cat: "More" },
] as const;

const FITZ_CATEGORIES = ["People", "Verbs", "Feelings", "Social", "Questions", "No", "More"] as const;

/* ── Category accent colours ─────────────────────────────── */

const CAT_COLORS: Record<string, string> = {
  Feelings: "#5BC0DE",
  Requests: "#4CAF7D",
  Questions: "#E8610A",
  Social:   "#F4A0C0",
  Food:     "#FF8C00",
  School:   "#9B59B6",
  Body:     "#E74C3C",
  Common:   "#8a7e70",
};

function catColor(cat: string) {
  return CAT_COLORS[cat] ?? "#8a7e70";
}

/* ── Storage ─────────────────────────────────────────────── */

const STORAGE_KEY = "8gentjr_phrases";

function loadPhrases(): SavedPhrase[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); }
  catch { return []; }
}

function persistPhrases(phrases: SavedPhrase[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(phrases)); } catch {}
}

/* ── Component ───────────────────────────────────────────── */

export function QuickPhrases({ currentSentence }: { currentSentence?: string }) {
  const [phrases,     setPhrases]     = useState<SavedPhrase[]>([]);
  const [sheetOpen,   setSheetOpen]   = useState(false);
  const [inputMode,   setInputMode]   = useState<InputMode>("choose");
  const [draft,       setDraft]       = useState("");
  const [activeCat,   setActiveCat]   = useState("All");
  const [speakingId,  setSpeakingId]  = useState<string | null>(null);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const inputRef                      = useRef<HTMLInputElement>(null);
  const voice                         = useVoiceInput();
  const longPressTimer                = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setPhrases(loadPhrases()); }, []);
  useEffect(() => { if (voice.transcript) setDraft(voice.transcript); }, [voice.transcript]);

  /* ── Sheet open/close ──────────────────────────────────── */

  const openSheet = useCallback((mode: InputMode = "choose") => {
    setInputMode(mode);
    setDraft("");
    setSheetOpen(true);
    if (mode === "text") setTimeout(() => inputRef.current?.focus(), 320);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setDraft("");
    voice.stop();
    voice.reset();
    setTimeout(() => setInputMode("choose"), 300);
  }, [voice]);

  /* ── Save ──────────────────────────────────────────────── */

  const savePhrase = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const p: SavedPhrase = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text: trimmed,
      category: autoCategory(trimmed),
      createdAt: Date.now(),
    };
    const updated = [p, ...phrases];
    setPhrases(updated);
    persistPhrases(updated);
    closeSheet();
  }, [phrases, closeSheet]);

  /* ── Delete ────────────────────────────────────────────── */

  const deletePhrase = useCallback((id: string) => {
    const updated = phrases.filter(p => p.id !== id);
    setPhrases(updated);
    persistPhrases(updated);
    setDeletingId(null);
  }, [phrases]);

  /* ── Speak ─────────────────────────────────────────────── */

  const speakPhrase = useCallback(async (text: string, id: string) => {
    if (speakingId) return;
    setSpeakingId(id);
    try { await speak({ text }); } catch {}
    setSpeakingId(null);
  }, [speakingId]);

  /* ── Long press → delete ───────────────────────────────── */

  const onPressStart = (id: string) => {
    longPressTimer.current = setTimeout(() => setDeletingId(id), 550);
  };
  const onPressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  /* ── Fitzgerald word append ────────────────────────────── */

  const appendWord = (word: string) => {
    setDraft(prev => prev.trim() ? `${prev.trim()} ${word}` : word);
  };

  /* ── Filter / group ────────────────────────────────────── */

  const allCats = ["All", ...Array.from(new Set(phrases.map(p => p.category))).sort()];
  const filtered = activeCat === "All" ? phrases : phrases.filter(p => p.category === activeCat);
  const grouped = filtered.reduce<Record<string, SavedPhrase[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  const isEmpty = phrases.length === 0;

  /* ── Render ────────────────────────────────────────────── */

  return (
    <div className="relative flex flex-col h-full bg-[#F7F5F2] overflow-hidden">

      {/* ── Category filter ───────────────────────────────── */}
      {!isEmpty && (
        <div className="flex gap-2 px-4 pt-3 pb-2 overflow-x-auto no-scrollbar shrink-0">
          {allCats.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-semibold border transition-all duration-150 min-h-[36px] ${
                activeCat === cat
                  ? "bg-[#1a1a2e] text-white border-[#1a1a2e]"
                  : "bg-white text-[#6b6460] border-[#E8E2DA]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* ── Save from sentence bar ────────────────────────── */}
      {currentSentence && !sheetOpen && (
        <div className="px-4 pt-2 shrink-0">
          <button
            onClick={() => savePhrase(currentSentence)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-[#E8610A]/30 shadow-sm active:scale-[0.98] transition-transform"
          >
            <span className="text-xl">📌</span>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[11px] font-semibold text-[#E8610A] uppercase tracking-wide mb-0.5">Save current sentence</p>
              <p className="text-sm font-medium text-[#1a1a2e] truncate">&ldquo;{currentSentence}&rdquo;</p>
            </div>
          </button>
        </div>
      )}

      {/* ── Phrase list ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 pt-3 pb-24">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center pb-16">
            <p className="text-[22px] font-semibold text-[#1a1a2e] leading-snug max-w-[260px]">
              Your phrases will live here
            </p>
            <p className="text-[15px] text-[#8a7e70] max-w-[220px] leading-relaxed">
              Tap the orange button to add your first one
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="mb-6">
              <p className="text-[11px] font-bold text-[#8a7e70] uppercase tracking-widest mb-2.5 px-1">
                {cat}
              </p>
              <div className="flex flex-col gap-2">
                {items.map(phrase => {
                  const isPlaying  = speakingId  === phrase.id;
                  const isDeleting = deletingId  === phrase.id;
                  return (
                    <div
                      key={phrase.id}
                      className={`flex items-center gap-3 px-4 py-4 bg-white rounded-2xl transition-all duration-200 ${
                        isDeleting
                          ? "border-2 border-red-400 bg-red-50"
                          : isPlaying
                          ? "border-2 border-[#E8610A]/40 shadow-[0_0_0_4px_rgba(232,97,10,0.08)]"
                          : "border border-[#EDE8E2] shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
                      }`}
                      onPointerDown={() => onPressStart(phrase.id)}
                      onPointerUp={onPressEnd}
                      onPointerLeave={onPressEnd}
                    >
                      {/* Play button */}
                      <button
                        onClick={() => {
                          if (isDeleting) { setDeletingId(null); return; }
                          speakPhrase(phrase.text, phrase.id);
                        }}
                        className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 ${
                          isDeleting
                            ? "bg-red-100 text-red-500"
                            : isPlaying
                            ? "bg-[#E8610A] text-white"
                            : "bg-[#FFF3EA] text-[#E8610A]"
                        }`}
                        aria-label={isDeleting ? "Tap to cancel delete" : `Speak: ${phrase.text}`}
                      >
                        <span className={`text-xl ${isPlaying ? "animate-pulse" : ""}`}>
                          {isDeleting ? "↩" : isPlaying ? "🔊" : "▶"}
                        </span>
                      </button>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-[16px] leading-snug ${isDeleting ? "text-red-600" : "text-[#1a1a2e]"}`}>
                          {isDeleting ? "Hold to delete" : phrase.text}
                        </p>
                        {!isDeleting && (
                          <p className="text-[12px] font-medium mt-0.5" style={{ color: catColor(phrase.category) }}>
                            {phrase.category}
                          </p>
                        )}
                      </div>

                      {/* Delete confirm */}
                      {isDeleting && (
                        <button
                          onClick={() => deletePhrase(phrase.id)}
                          className="shrink-0 w-11 h-11 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-lg shadow active:scale-90 transition-transform"
                          aria-label="Confirm delete"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── FAB ───────────────────────────────────────────── */}
      <button
        onClick={() => openSheet("choose")}
        className="absolute bottom-6 right-5 w-16 h-16 rounded-full bg-[#E8610A] text-white flex items-center justify-center shadow-[0_4px_20px_rgba(232,97,10,0.45)] active:scale-90 transition-transform z-10"
        style={{ fontSize: 36, lineHeight: 1 }}
        aria-label="Add a phrase"
      >
        +
      </button>

      {/* ── Sheet backdrop ────────────────────────────────── */}
      <div
        className={`absolute inset-0 bg-black/40 z-20 transition-opacity duration-300 ${sheetOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={closeSheet}
        aria-hidden="true"
      />

      {/* ── Bottom sheet ──────────────────────────────────── */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${sheetOpen ? "translate-y-0" : "translate-y-full"}`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-[5px] rounded-full bg-[#DDD8D0]" />
        </div>

        <div className="px-5 pt-2 pb-safe-dock pb-8">

          {/* ── Choose input method ─────────────────────────── */}
          {inputMode === "choose" && (
            <>
              <h2 className="text-[20px] font-semibold text-[#1a1a2e] mb-5">Add a phrase</h2>

              {/* Save from sentence strip */}
              {currentSentence && (
                <button
                  onClick={() => savePhrase(currentSentence)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 mb-4 rounded-2xl bg-[#FFF3EA] border border-[#E8610A]/25 active:scale-[0.98] transition-transform text-left"
                >
                  <span className="text-2xl">📌</span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[#E8610A] uppercase tracking-wide">From sentence bar</p>
                    <p className="text-[15px] font-semibold text-[#1a1a2e] truncate">&ldquo;{currentSentence}&rdquo;</p>
                  </div>
                </button>
              )}

              <div className="grid grid-cols-3 gap-3">
                {[
                  { mode: "text"        as InputMode, icon: "⌨",  label: "Type",  sub: "Keyboard" },
                  { mode: "voice"       as InputMode, icon: "🎤", label: "Voice", sub: "Speak it" },
                  { mode: "fitzgerald"  as InputMode, icon: "🎨", label: "Keys",  sub: "Word bank" },
                ].map(({ mode, icon, label, sub }) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setInputMode(mode);
                      if (mode === "text")   setTimeout(() => inputRef.current?.focus(), 50);
                      if (mode === "voice")  voice.start();
                    }}
                    disabled={mode === "voice" && !voice.isSupported}
                    className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-[#F7F5F2] border border-[#EDE8E2] active:scale-95 transition-transform disabled:opacity-40"
                  >
                    <span className="text-3xl leading-none">{icon}</span>
                    <div className="text-center">
                      <p className="text-[14px] font-semibold text-[#1a1a2e]">{label}</p>
                      <p className="text-[11px] text-[#8a7e70]">{sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── Text / Voice / Fitzgerald input ─────────────── */}
          {inputMode !== "choose" && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => { setInputMode("choose"); setDraft(""); voice.stop(); voice.reset(); }}
                  className="w-9 h-9 rounded-full bg-[#F0EDE9] flex items-center justify-center text-[#8a7e70] font-bold active:scale-90 transition-transform"
                  aria-label="Back"
                >
                  ‹
                </button>
                <h2 className="text-[18px] font-semibold text-[#1a1a2e]">
                  {inputMode === "text" ? "Type your phrase" : inputMode === "voice" ? "Speak your phrase" : "Build with words"}
                </h2>
              </div>

              {/* Draft display */}
              <div
                className={`min-h-[52px] px-4 py-3 rounded-2xl border-2 mb-3 transition-colors ${
                  draft ? "bg-white border-[#E8610A]/40" : "bg-[#F7F5F2] border-[#EDE8E2]"
                }`}
                aria-live="polite"
              >
                {draft
                  ? <p className="text-[16px] font-semibold text-[#1a1a2e] leading-relaxed">{draft}</p>
                  : <p className="text-[15px] text-[#B0A898]">Your phrase will appear here...</p>
                }
              </div>

              {/* Text keyboard */}
              {inputMode === "text" && (
                <input
                  ref={inputRef}
                  type="text"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && draft.trim()) savePhrase(draft); }}
                  placeholder="Type here..."
                  className="w-full px-4 py-3.5 rounded-2xl border-2 border-[#EDE8E2] focus:border-[#E8610A] text-[16px] font-medium text-[#1a1a2e] mb-3 outline-none transition-colors bg-white"
                  autoCapitalize="sentences"
                  autoComplete="off"
                />
              )}

              {/* Voice */}
              {inputMode === "voice" && (
                <button
                  onClick={() => voice.isListening ? voice.stop() : voice.start()}
                  className={`w-full py-4 mb-3 rounded-2xl font-semibold text-[16px] transition-all ${
                    voice.isListening
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-[#1a1a2e] text-white"
                  }`}
                >
                  {voice.isListening ? "🔴  Listening  —  tap to stop" : "🎤  Tap to speak"}
                </button>
              )}

              {/* Fitzgerald word bank */}
              {inputMode === "fitzgerald" && (
                <div className="max-h-[160px] overflow-y-auto mb-3 -mx-1 px-1">
                  {FITZ_CATEGORIES.map(cat => {
                    const words = WORD_BANK.filter(w => w.cat === cat);
                    return (
                      <div key={cat} className="mb-3">
                        <p className="text-[10px] font-bold text-[#8a7e70] uppercase tracking-widest mb-1.5">{cat}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {words.map(w => (
                            <button
                              key={w.word}
                              onClick={() => appendWord(w.word)}
                              className="px-3 py-1.5 rounded-xl text-[13px] font-semibold min-h-[36px] active:scale-90 transition-transform shadow-sm"
                              style={{ backgroundColor: w.bg, color: w.fg }}
                            >
                              {w.word}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Clear + Save */}
              <div className="flex gap-2">
                {draft && (
                  <button
                    onClick={() => { setDraft(""); voice.reset(); }}
                    className="px-5 py-3.5 rounded-2xl bg-[#F0EDE9] text-[#6b6460] font-semibold text-[15px] min-h-[52px] active:scale-95 transition-transform"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => savePhrase(draft)}
                  disabled={!draft.trim()}
                  className={`flex-1 py-3.5 rounded-2xl font-semibold text-[16px] min-h-[52px] transition-all active:scale-[0.98] ${
                    draft.trim()
                      ? "bg-[#E8610A] text-white shadow-[0_4px_12px_rgba(232,97,10,0.35)]"
                      : "bg-[#F0EDE9] text-[#B0A898]"
                  }`}
                >
                  Save phrase
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
