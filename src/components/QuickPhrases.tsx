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

type InputMode = "idle" | "text" | "voice" | "fitzgerald";

/* ── Auto-categorisation ─────────────────────────────────── */

function autoCategory(text: string): string {
  const t = text.toLowerCase();
  if (/\b(feel|feeling|happy|sad|angry|tired|scared|hurt|sick|love|excited|upset|worried)\b/.test(t))
    return "Feelings";
  if (/\b(want|need|can i|may i|please give|i would like|can you|could you)\b/.test(t))
    return "Requests";
  if (/\b(what|where|who|why|when|how|which)\b/.test(t))
    return "Questions";
  if (/\b(hello|hi|bye|goodbye|thank|sorry|please|excuse|morning|night)\b/.test(t))
    return "Social";
  if (/\b(eat|drink|hungry|thirsty|food|water|snack|lunch|dinner|breakfast|cookie|juice)\b/.test(t))
    return "Food";
  if (/\b(school|teacher|class|homework|read|write|learn|study|lesson|book)\b/.test(t))
    return "School";
  if (/\b(toilet|bathroom|wash|tired|sleep|rest|pain|ow|ouch|hurt)\b/.test(t))
    return "Body";
  return "Common";
}

/* ── Fitzgerald word bank ────────────────────────────────── */

const WORD_BANK = [
  // People — yellow
  { word: "I",         bg: "#F6D860", fg: "#5A4A00", cat: "People" },
  { word: "you",       bg: "#F6D860", fg: "#5A4A00", cat: "People" },
  { word: "we",        bg: "#F6D860", fg: "#5A4A00", cat: "People" },
  { word: "they",      bg: "#F6D860", fg: "#5A4A00", cat: "People" },
  { word: "he",        bg: "#F6D860", fg: "#5A4A00", cat: "People" },
  { word: "she",       bg: "#F6D860", fg: "#5A4A00", cat: "People" },
  { word: "my",        bg: "#F6D860", fg: "#5A4A00", cat: "People" },
  // Verbs — green
  { word: "want",      bg: "#4CAF7D", fg: "#fff", cat: "Verbs" },
  { word: "need",      bg: "#4CAF7D", fg: "#fff", cat: "Verbs" },
  { word: "like",      bg: "#4CAF7D", fg: "#fff", cat: "Verbs" },
  { word: "go",        bg: "#4CAF7D", fg: "#fff", cat: "Verbs" },
  { word: "come",      bg: "#4CAF7D", fg: "#fff", cat: "Verbs" },
  { word: "eat",       bg: "#4CAF7D", fg: "#fff", cat: "Verbs" },
  { word: "drink",     bg: "#4CAF7D", fg: "#fff", cat: "Verbs" },
  { word: "play",      bg: "#4CAF7D", fg: "#fff", cat: "Verbs" },
  { word: "help",      bg: "#4CAF7D", fg: "#fff", cat: "Verbs" },
  { word: "feel",      bg: "#4CAF7D", fg: "#fff", cat: "Verbs" },
  { word: "have",      bg: "#4CAF7D", fg: "#fff", cat: "Verbs" },
  // Descriptors — blue
  { word: "happy",     bg: "#5BC0DE", fg: "#fff", cat: "Feelings" },
  { word: "sad",       bg: "#5BC0DE", fg: "#fff", cat: "Feelings" },
  { word: "angry",     bg: "#5BC0DE", fg: "#fff", cat: "Feelings" },
  { word: "tired",     bg: "#5BC0DE", fg: "#fff", cat: "Feelings" },
  { word: "scared",    bg: "#5BC0DE", fg: "#fff", cat: "Feelings" },
  { word: "good",      bg: "#5BC0DE", fg: "#fff", cat: "Feelings" },
  { word: "hurt",      bg: "#5BC0DE", fg: "#fff", cat: "Feelings" },
  { word: "big",       bg: "#5BC0DE", fg: "#fff", cat: "Feelings" },
  { word: "little",    bg: "#5BC0DE", fg: "#fff", cat: "Feelings" },
  // Social — pink
  { word: "please",    bg: "#F4A0C0", fg: "#5A0020", cat: "Social" },
  { word: "thank you", bg: "#F4A0C0", fg: "#5A0020", cat: "Social" },
  { word: "sorry",     bg: "#F4A0C0", fg: "#5A0020", cat: "Social" },
  { word: "hello",     bg: "#F4A0C0", fg: "#5A0020", cat: "Social" },
  { word: "bye",       bg: "#F4A0C0", fg: "#5A0020", cat: "Social" },
  { word: "yes",       bg: "#F4A0C0", fg: "#5A0020", cat: "Social" },
  { word: "okay",      bg: "#F4A0C0", fg: "#5A0020", cat: "Social" },
  // Questions — orange
  { word: "what",      bg: "#E8610A", fg: "#fff", cat: "Questions" },
  { word: "where",     bg: "#E8610A", fg: "#fff", cat: "Questions" },
  { word: "when",      bg: "#E8610A", fg: "#fff", cat: "Questions" },
  { word: "who",       bg: "#E8610A", fg: "#fff", cat: "Questions" },
  { word: "why",       bg: "#E8610A", fg: "#fff", cat: "Questions" },
  { word: "how",       bg: "#E8610A", fg: "#fff", cat: "Questions" },
  // Negation — red
  { word: "no",        bg: "#D9534F", fg: "#fff", cat: "No" },
  { word: "don't",     bg: "#D9534F", fg: "#fff", cat: "No" },
  { word: "stop",      bg: "#D9534F", fg: "#fff", cat: "No" },
  // Misc
  { word: "more",      bg: "#9B9B9B", fg: "#fff", cat: "More" },
  { word: "the",       bg: "#9B9B9B", fg: "#fff", cat: "More" },
  { word: "a",         bg: "#9B9B9B", fg: "#fff", cat: "More" },
  { word: "is",        bg: "#9B9B9B", fg: "#fff", cat: "More" },
  { word: "in",        bg: "#9B9B9B", fg: "#fff", cat: "More" },
  { word: "at",        bg: "#9B9B9B", fg: "#fff", cat: "More" },
] as const;

const FITZ_CATEGORIES = ["People", "Verbs", "Feelings", "Social", "Questions", "No", "More"] as const;

/* ── Storage ─────────────────────────────────────────────── */

const STORAGE_KEY = "8gentjr_phrases";

function loadPhrases(): SavedPhrase[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch { return []; }
}

function persistPhrases(phrases: SavedPhrase[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(phrases)); } catch {}
}

/* ── Component ───────────────────────────────────────────── */

export function QuickPhrases({ currentSentence }: { currentSentence?: string }) {
  const [phrases, setPhrases]           = useState<SavedPhrase[]>([]);
  const [inputMode, setInputMode]       = useState<InputMode>("idle");
  const [draft, setDraft]               = useState("");
  const [activeCat, setActiveCat]       = useState("All");
  const [speakingId, setSpeakingId]     = useState<string | null>(null);
  const [longPressId, setLongPressId]   = useState<string | null>(null);
  const inputRef                        = useRef<HTMLInputElement>(null);
  const voice                           = useVoiceInput();
  const longPressTimer                  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setPhrases(loadPhrases()); }, []);

  // Mirror STT transcript into draft
  useEffect(() => { if (voice.transcript) setDraft(voice.transcript); }, [voice.transcript]);

  /* ── Phrase management ─────────────────────────────────── */

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
    setDraft("");
    setInputMode("idle");
    voice.reset();
  }, [phrases, voice]);

  const deletePhrase = useCallback((id: string) => {
    const updated = phrases.filter(p => p.id !== id);
    setPhrases(updated);
    persistPhrases(updated);
    setLongPressId(null);
  }, [phrases]);

  const speakPhrase = useCallback(async (text: string, id: string) => {
    if (speakingId) return;
    setSpeakingId(id);
    try { await speak({ text }); } catch {}
    setSpeakingId(null);
  }, [speakingId]);

  /* ── Long press to reveal delete ──────────────────────── */

  const onPressStart = (id: string) => {
    longPressTimer.current = setTimeout(() => setLongPressId(id), 500);
  };

  const onPressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  /* ── Fitzgerald word append ────────────────────────────── */

  const appendWord = (word: string) => {
    setDraft(prev => (prev.trim() ? `${prev.trim()} ${word}` : word));
  };

  /* ── Filtered / grouped display ───────────────────────── */

  const allCats = ["All", ...Array.from(new Set(phrases.map(p => p.category))).sort()];
  const filtered = activeCat === "All" ? phrases : phrases.filter(p => p.category === activeCat);

  const grouped = filtered.reduce<Record<string, SavedPhrase[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  /* ── Cancel add ────────────────────────────────────────── */

  const cancelAdd = () => {
    setInputMode("idle");
    setDraft("");
    voice.stop();
    voice.reset();
  };

  /* ── Render ────────────────────────────────────────────── */

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">

      {/* ── Category filter strip ─────────────────────────── */}
      {phrases.length > 0 && (
        <div className="flex gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar shrink-0 bg-white border-b border-[#f0e6d6]">
          {allCats.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all min-h-[36px] ${
                activeCat === cat
                  ? "bg-[#E8610A] text-white border-[#E8610A]"
                  : "bg-white text-[#8a7e70] border-[#e0d5c8]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* ── Phrases list ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-4 min-h-0">
        {phrases.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-5 px-6 text-center">
            <p className="font-bold text-[#1a1a2e] text-xl leading-snug">
              Save your favourite sayings here
            </p>
            <p className="text-[#8a7e70] text-sm max-w-[240px] leading-relaxed">
              One tap to speak — no building needed
            </p>
            <button
              onClick={() => {
                setInputMode("text");
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
              className="w-24 h-24 rounded-full bg-[#E8610A] text-white flex items-center justify-center shadow-xl active:scale-90 transition-transform mt-2"
              aria-label="Add a phrase"
              style={{ fontSize: 56, lineHeight: 1 }}
            >
              +
            </button>
            <p className="text-xs text-[#8a7e70] font-medium">Tap to add a phrase</p>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="mb-5">
              <p className="text-[10px] font-bold text-[#8a7e70] uppercase tracking-widest mb-2">
                {cat}
              </p>
              <div className="flex flex-col gap-2">
                {items.map(phrase => {
                  const isPlaying = speakingId === phrase.id;
                  const showDelete = longPressId === phrase.id;
                  return (
                    <div key={phrase.id} className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (showDelete) { setLongPressId(null); return; }
                          speakPhrase(phrase.text, phrase.id);
                        }}
                        onPointerDown={() => onPressStart(phrase.id)}
                        onPointerUp={onPressEnd}
                        onPointerLeave={onPressEnd}
                        className={`flex-1 flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all active:scale-[0.98] min-h-[56px] ${
                          isPlaying
                            ? "border-[#E8610A] bg-[#FFF3EA]"
                            : showDelete
                            ? "border-red-300 bg-red-50"
                            : "border-[#f0e6d6] bg-white shadow-sm"
                        }`}
                        aria-label={`Speak: ${phrase.text}`}
                      >
                        <span className={`text-xl shrink-0 ${isPlaying ? "animate-pulse" : ""}`}>
                          {isPlaying ? "🔊" : showDelete ? "⚠️" : "▶"}
                        </span>
                        <span className={`font-semibold text-sm leading-snug ${showDelete ? "text-red-600" : "text-[#1a1a2e]"}`}>
                          {showDelete ? "Hold to delete, tap to keep" : phrase.text}
                        </span>
                      </button>
                      {showDelete && (
                        <button
                          onClick={() => deletePhrase(phrase.id)}
                          className="w-11 h-11 shrink-0 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold shadow transition-transform active:scale-90"
                          aria-label="Delete phrase"
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

      {/* ── Bottom: input area ───────────────────────────── */}
      <div className="shrink-0 bg-white border-t border-[#f0e6d6] px-3 pt-3 pb-4">

        {inputMode === "idle" ? (
          <>
            {/* Save from current sentence bar */}
            {currentSentence && (
              <button
                onClick={() => savePhrase(currentSentence)}
                className="w-full mb-2 py-3 px-4 rounded-2xl border-2 border-[#E8610A] bg-[#FFF3EA] text-[#E8610A] font-bold text-sm text-left active:scale-[0.98] transition-transform"
                aria-label={`Save current sentence: ${currentSentence}`}
              >
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#E8610A]/70 mb-0.5">Save current sentence</span>
                <span className="truncate block">&ldquo;{currentSentence}&rdquo;</span>
              </button>
            )}

            {/* Input method buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setInputMode("text");
                  setTimeout(() => inputRef.current?.focus(), 100);
                }}
                className="flex-1 flex flex-col items-center gap-1 py-3.5 rounded-2xl bg-[#f0e6d6] font-bold text-xs min-h-[60px] active:scale-95 transition-transform"
                aria-label="Type a phrase"
              >
                <span className="text-2xl leading-none">⌨</span>
                <span className="text-[#1a1a2e]">Type</span>
              </button>
              <button
                onClick={() => { setInputMode("voice"); voice.start(); }}
                disabled={!voice.isSupported}
                className={`flex-1 flex flex-col items-center gap-1 py-3.5 rounded-2xl font-bold text-xs min-h-[60px] active:scale-95 transition-transform ${
                  voice.isSupported ? "bg-[#f0e6d6]" : "bg-gray-100 opacity-50 cursor-not-allowed"
                }`}
                aria-label="Speak a phrase"
              >
                <span className="text-2xl leading-none">🎤</span>
                <span className="text-[#1a1a2e]">Voice</span>
              </button>
              <button
                onClick={() => setInputMode("fitzgerald")}
                className="flex-1 flex flex-col items-center gap-1 py-3.5 rounded-2xl bg-[#f0e6d6] font-bold text-xs min-h-[60px] active:scale-95 transition-transform"
                aria-label="Use Fitzgerald key word bank"
              >
                <span className="text-2xl leading-none">🎨</span>
                <span className="text-[#1a1a2e]">Keys</span>
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Draft preview bar */}
            <div className="flex items-center gap-2 mb-2">
              <div
                className="flex-1 min-h-[44px] px-3 py-2.5 rounded-xl bg-[#f0e6d6] text-[#1a1a2e] font-medium text-sm leading-relaxed"
                aria-live="polite"
              >
                {draft || <span className="text-[#8a7e70]">Building phrase...</span>}
              </div>
              {draft && (
                <button
                  onClick={() => setDraft("")}
                  className="w-9 h-9 shrink-0 rounded-full bg-[#f0e6d6] text-[#8a7e70] flex items-center justify-center text-xs border-none cursor-pointer active:scale-90"
                  aria-label="Clear draft"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Text input */}
            {inputMode === "text" && (
              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && draft.trim()) savePhrase(draft); }}
                placeholder="Type your phrase here..."
                className="w-full px-3 py-3 rounded-xl border-2 border-[#e0d5c8] focus:border-[#E8610A] text-[#1a1a2e] font-medium text-sm mb-2 outline-none transition-colors"
                autoComplete="off"
                autoCapitalize="sentences"
              />
            )}

            {/* Voice input */}
            {inputMode === "voice" && (
              <button
                onClick={() => (voice.isListening ? voice.stop() : voice.start())}
                className={`w-full py-3.5 mb-2 rounded-xl font-bold text-sm min-h-[52px] transition-all ${
                  voice.isListening
                    ? "bg-red-500 text-white"
                    : "bg-[#E8610A] text-white"
                }`}
              >
                {voice.isListening ? "🔴  Listening...  tap to stop" : "🎤  Tap to speak"}
              </button>
            )}

            {/* Fitzgerald key word bank */}
            {inputMode === "fitzgerald" && (
              <div className="max-h-[160px] overflow-y-auto mb-2 pr-1">
                {FITZ_CATEGORIES.map(cat => {
                  const words = WORD_BANK.filter(w => w.cat === cat);
                  return (
                    <div key={cat} className="mb-2">
                      <p className="text-[10px] text-[#8a7e70] font-semibold mb-1">{cat}</p>
                      <div className="flex flex-wrap gap-1">
                        {words.map(w => (
                          <button
                            key={w.word}
                            onClick={() => appendWord(w.word)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold min-h-[36px] min-w-[36px] active:scale-95 transition-transform"
                            style={{ backgroundColor: w.bg, color: w.fg }}
                            aria-label={`Add word: ${w.word}`}
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

            {/* Save / Cancel */}
            <div className="flex gap-2">
              <button
                onClick={cancelAdd}
                className="flex-1 py-3 rounded-xl bg-[#f0e6d6] text-[#8a7e70] font-bold text-sm min-h-[48px] active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button
                onClick={() => savePhrase(draft)}
                disabled={!draft.trim()}
                className={`flex-1 py-3 rounded-xl font-bold text-sm min-h-[48px] active:scale-95 transition-transform ${
                  draft.trim()
                    ? "bg-[#E8610A] text-white"
                    : "bg-[#f0e6d6] text-[#8a7e70] cursor-not-allowed"
                }`}
              >
                Save phrase
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
