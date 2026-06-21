"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { speak } from "@/lib/tts";
import { useApp } from "@/context/AppContext";
import {
  loadFolders,
  persistFolders,
  addFolder,
  removeFolder,
  normaliseFolder,
  isAutoFolder,
} from "@/lib/phrase-folders";

/* ── Types ───────────────────────────────────────────────── */

interface SavedPhrase {
  id: string;
  text: string;
  category: string;
  createdAt: number;
  // Explicit display order (lower = earlier). Optional for backward
  // compatibility: phrases saved before reorder shipped have no `order`
  // and fall back to insertion order / createdAt.
  order?: number;
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

/**
 * Normalise an array so every phrase has an explicit `order`.
 * Phrases saved before reorder shipped have no `order`; we keep their stored
 * sequence (newest-first array order) and assign indices, so old data renders
 * exactly as before and reordering sticks from here on.
 */
function withOrder(phrases: SavedPhrase[]): SavedPhrase[] {
  return phrases.map((p, i) => (typeof p.order === "number" ? p : { ...p, order: i }));
}

/** Stable display order: by `order` ascending, createdAt as the tie-breaker. */
function byOrder(a: SavedPhrase, b: SavedPhrase): number {
  const ao = a.order ?? a.createdAt;
  const bo = b.order ?? b.createdAt;
  if (ao !== bo) return ao - bo;
  return a.createdAt - b.createdAt;
}

function loadPhrases(): SavedPhrase[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(raw) ? withOrder(raw) : [];
  } catch { return []; }
}

function persistPhrases(phrases: SavedPhrase[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(phrases)); } catch {}
}

/* ── Component ───────────────────────────────────────────── */

export function QuickPhrases({ currentSentence }: { currentSentence?: string }) {
  const { settings } = useApp();
  const [phrases,     setPhrases]     = useState<SavedPhrase[]>([]);
  const [folders,     setFolders]     = useState<string[]>([]);
  const [sheetOpen,   setSheetOpen]   = useState(false);
  const [inputMode,   setInputMode]   = useState<InputMode>("choose");
  const [draft,       setDraft]       = useState("");
  const [activeCat,   setActiveCat]   = useState("All");
  // Folder chosen in the add/edit sheet. "" = auto-categorise (default fallback).
  const [folderChoice, setFolderChoice] = useState("");
  // Draft text for the "New folder…" input inside the sheet.
  const [newFolder,    setNewFolder]    = useState("");
  const [speakingId,  setSpeakingId]  = useState<string | null>(null);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  // Id of the phrase currently being edited (vs created). null = creating.
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const inputRef                      = useRef<HTMLInputElement>(null);
  const voice                         = useVoiceInput();
  const longPressTimer                = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setPhrases(loadPhrases()); setFolders(loadFolders()); }, []);
  useEffect(() => { if (voice.transcript) setDraft(voice.transcript); }, [voice.transcript]);

  /* ── Sheet open/close ──────────────────────────────────── */

  const openSheet = useCallback((mode: InputMode = "choose") => {
    setInputMode(mode);
    setDraft("");
    setFolderChoice("");
    setNewFolder("");
    setSheetOpen(true);
    if (mode === "text") setTimeout(() => inputRef.current?.focus(), 320);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setDraft("");
    setEditingId(null);
    setFolderChoice("");
    setNewFolder("");
    voice.stop();
    voice.reset();
    setTimeout(() => setInputMode("choose"), 300);
  }, [voice]);

  /* ── Save (create OR edit) ─────────────────────────────── */

  /**
   * Resolve the folder for the phrase being saved.
   * Commits a typed "New folder…" name (persisting it) when present, otherwise
   * uses the picked folder. Falls back to autoCategory when nothing is chosen.
   */
  const resolveFolder = useCallback((text: string): string => {
    const typed = normaliseFolder(newFolder);
    if (typed) {
      const { folders: next, name } = addFolder(folders, typed);
      if (next !== folders) { setFolders(next); persistFolders(next); }
      return name;
    }
    if (folderChoice) return folderChoice;
    return autoCategory(text);
  }, [folders, folderChoice, newFolder]);

  const savePhrase = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const category = resolveFolder(trimmed);
    if (editingId) {
      // Editing an existing phrase: keep its id/createdAt, update text + folder.
      const updated = phrases.map(p =>
        p.id === editingId ? { ...p, text: trimmed, category } : p,
      );
      setPhrases(updated);
      persistPhrases(updated);
      closeSheet();
      return;
    }
    // New phrases appear first, matching the prior prepend behaviour: give
    // them an order below the current minimum.
    const minOrder = phrases.reduce(
      (m, q) => Math.min(m, q.order ?? q.createdAt),
      0,
    );
    const p: SavedPhrase = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text: trimmed,
      category,
      createdAt: Date.now(),
      order: minOrder - 1,
    };
    const updated = [p, ...phrases];
    setPhrases(updated);
    persistPhrases(updated);
    closeSheet();
  }, [phrases, closeSheet, editingId, resolveFolder]);

  /* ── Edit ──────────────────────────────────────────────── */

  const editPhrase = useCallback((p: SavedPhrase) => {
    setDeletingId(null);
    setEditingId(p.id);
    setInputMode("text");
    setDraft(p.text);
    setFolderChoice(p.category);
    setNewFolder("");
    setSheetOpen(true);
    setTimeout(() => inputRef.current?.focus(), 320);
  }, []);

  /* ── Delete ────────────────────────────────────────────── */

  const deletePhrase = useCallback((id: string) => {
    const updated = phrases.filter(p => p.id !== id);
    setPhrases(updated);
    persistPhrases(updated);
    setDeletingId(null);
  }, [phrases]);

  /* ── Reorder (accessible: Move up / Move down) ─────────── */

  /**
   * Move a phrase up or down within the list the user is currently looking at.
   * Swaps `order` with the previous/next visible phrase in the same category
   * group, so reordering works for switch, keyboard and screen-reader users
   * without any drag gesture. No-op at the ends of a group.
   */
  const movePhrase = useCallback((id: string, dir: "up" | "down") => {
    setPhrases(prev => {
      const target = prev.find(p => p.id === id);
      if (!target) return prev;
      // The visible neighbours are the phrases in the same category group,
      // in display order. Reordering only ever swaps within that group.
      const group = prev
        .filter(p => p.category === target.category)
        .sort(byOrder);
      const idx = group.findIndex(p => p.id === id);
      const swapWith = dir === "up" ? group[idx - 1] : group[idx + 1];
      if (!swapWith) return prev; // at an end: nothing to do
      const aOrder = target.order ?? target.createdAt;
      const bOrder = swapWith.order ?? swapWith.createdAt;
      const updated = prev.map(p => {
        if (p.id === target.id)   return { ...p, order: bOrder };
        if (p.id === swapWith.id) return { ...p, order: aOrder };
        return p;
      });
      persistPhrases(updated);
      return updated;
    });
  }, []);

  /* ── Remove an empty custom folder ─────────────────────── */

  const deleteFolder = useCallback((name: string) => {
    const next = removeFolder(folders, name);
    setFolders(next);
    persistFolders(next);
    if (activeCat === name) setActiveCat("All");
  }, [folders, activeCat]);

  /* ── Speak ─────────────────────────────────────────────── */

  const speakPhrase = useCallback(async (text: string, id: string) => {
    if (speakingId) return;
    setSpeakingId(id);
    try { await speak({ text, voiceId: settings.selectedVoiceId ?? undefined, rate: settings.ttsRate }); } catch {}
    setSpeakingId(null);
  }, [speakingId, settings.selectedVoiceId, settings.ttsRate]);

  /* ── Long press → reveal edit / delete actions ─────────── */

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

  // Folders that exist on phrases (auto or custom) merged with persisted
  // custom folders, so an empty custom folder still appears as a chip.
  const phraseCats = Array.from(new Set(phrases.map(p => p.category)));
  const allFolders = Array.from(new Set([...phraseCats, ...folders])).sort();
  const allCats = ["All", ...allFolders];
  const filtered = activeCat === "All" ? phrases : phrases.filter(p => p.category === activeCat);
  const grouped = filtered.reduce<Record<string, SavedPhrase[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});
  // Each group renders in explicit display order; Move up/down swaps neighbours
  // inside it.
  for (const cat of Object.keys(grouped)) grouped[cat].sort(byOrder);

  const isEmpty = phrases.length === 0;

  /* ── Render ────────────────────────────────────────────── */

  return (
    <div className="relative flex flex-col h-full bg-[#F7F5F2] overflow-hidden">

      {/* ── Category filter ───────────────────────────────── */}
      {!isEmpty && (
        <div className="flex gap-2 px-4 pt-3 pb-2 overflow-x-auto no-scrollbar shrink-0">
          {allCats.map(cat => {
            const active = activeCat === cat;
            // A custom folder with no phrases can be removed inline.
            const isEmptyCustom =
              cat !== "All" &&
              !isAutoFolder(cat) &&
              !phraseCats.includes(cat);
            return (
              <div
                key={cat}
                className={`shrink-0 flex items-center gap-1 rounded-full border transition-all duration-150 min-h-[44px] ${
                  active
                    ? "bg-[#1a1a2e] text-white border-[#1a1a2e]"
                    : "bg-white text-[#6b6460] border-[#E8E2DA]"
                }`}
              >
                <button
                  onClick={() => setActiveCat(cat)}
                  aria-pressed={active}
                  className={`px-3.5 py-1.5 text-[13px] font-semibold ${isEmptyCustom && active ? "pr-1" : ""}`}
                >
                  {cat}
                </button>
                {isEmptyCustom && active && (
                  <button
                    onClick={() => deleteFolder(cat)}
                    aria-label={`Remove empty folder: ${cat}`}
                    className="w-9 h-9 mr-1 rounded-full flex items-center justify-center text-[15px] font-bold active:scale-90 transition-transform"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
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
      <div className="flex-1 overflow-y-auto min-h-0 px-4 pt-3 pb-24 touch-pan-y">
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
                {items.map((phrase, idx) => {
                  const isPlaying  = speakingId  === phrase.id;
                  const isDeleting = deletingId  === phrase.id;
                  const isFirst    = idx === 0;
                  const isLast     = idx === items.length - 1;
                  return (
                    <div
                      key={phrase.id}
                      className={`flex items-center gap-3 px-4 py-4 bg-white rounded-2xl transition-all duration-200 ${
                        isDeleting
                          ? "border-2 border-[#E8610A]/50 bg-[#FFF7F0]"
                          : isPlaying
                          ? "border-2 border-[#E8610A]/40 shadow-[0_0_0_4px_rgba(232,97,10,0.08)]"
                          : "border border-[#EDE8E2] shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
                      }`}
                      onPointerDown={() => onPressStart(phrase.id)}
                      onPointerUp={onPressEnd}
                      onPointerLeave={onPressEnd}
                      onPointerCancel={onPressEnd}
                      style={{ touchAction: "pan-y" }}
                    >
                      {/* Play button */}
                      <button
                        onClick={() => {
                          if (isDeleting) { setDeletingId(null); return; }
                          speakPhrase(phrase.text, phrase.id);
                        }}
                        className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 ${
                          isDeleting
                            ? "bg-[#F0EAE3] text-[#6B6256]"
                            : isPlaying
                            ? "bg-[#E8610A] text-white"
                            : "bg-[#FFF3EA] text-[#E8610A]"
                        }`}
                        aria-label={isDeleting ? "Close menu" : `Speak: ${phrase.text}`}
                      >
                        <span className={`text-xl ${isPlaying ? "animate-pulse" : ""}`}>
                          {isDeleting ? "↩" : isPlaying ? "🔊" : "▶"}
                        </span>
                      </button>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[16px] leading-snug text-[#1a1a2e] truncate">
                          {phrase.text}
                        </p>
                        <p
                          className="text-[12px] font-medium mt-0.5"
                          style={{ color: isDeleting ? "#9A9088" : catColor(phrase.category) }}
                        >
                          {isDeleting ? "Edit or delete" : phrase.category}
                        </p>
                      </div>

                      {/* Move / edit / delete actions (revealed on long-press).
                          Move up/down are real buttons with aria-labels and are
                          disabled at the ends of the list, so switch, keyboard
                          and screen-reader users can reorder without dragging. */}
                      {isDeleting && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => movePhrase(phrase.id, "up")}
                            disabled={isFirst}
                            className="w-11 h-11 rounded-full bg-[#F0EDE9] text-[#1a1a2e] flex items-center justify-center text-lg active:scale-90 transition-transform disabled:opacity-35 disabled:active:scale-100"
                            aria-label="Move up"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => movePhrase(phrase.id, "down")}
                            disabled={isLast}
                            className="w-11 h-11 rounded-full bg-[#F0EDE9] text-[#1a1a2e] flex items-center justify-center text-lg active:scale-90 transition-transform disabled:opacity-35 disabled:active:scale-100"
                            aria-label="Move down"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => editPhrase(phrase)}
                            className="w-11 h-11 rounded-full bg-[#FFF3EA] text-[#E8610A] flex items-center justify-center text-lg active:scale-90 transition-transform"
                            aria-label={`Edit phrase: ${phrase.text}`}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deletePhrase(phrase.id)}
                            className="w-11 h-11 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-lg shadow active:scale-90 transition-transform"
                            aria-label={`Delete phrase: ${phrase.text}`}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── FAB — opens straight to the keyboard (the common path);
              the sheet's back arrow still reaches voice / word-build. ── */}
      <button
        onClick={() => openSheet("text")}
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
                  {editingId ? "Edit phrase" : inputMode === "text" ? "Type your phrase" : inputMode === "voice" ? "Speak your phrase" : "Build with words"}
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

              {/* ── Folder picker ───────────────────────────── */}
              <div className="mb-3">
                <p className="text-[11px] font-bold text-[#8a7e70] uppercase tracking-widest mb-2">
                  Folder
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {/* Auto (default) */}
                  <button
                    onClick={() => { setFolderChoice(""); setNewFolder(""); }}
                    aria-pressed={folderChoice === "" && !newFolder.trim()}
                    className={`px-3.5 py-2 rounded-full text-[13px] font-semibold border min-h-[44px] active:scale-95 transition-all ${
                      folderChoice === "" && !newFolder.trim()
                        ? "bg-[#1a1a2e] text-white border-[#1a1a2e]"
                        : "bg-white text-[#6b6460] border-[#E8E2DA]"
                    }`}
                  >
                    Auto
                  </button>
                  {allFolders.map(f => {
                    const active = folderChoice === f && !newFolder.trim();
                    return (
                      <button
                        key={f}
                        onClick={() => { setFolderChoice(f); setNewFolder(""); }}
                        aria-pressed={active}
                        className={`px-3.5 py-2 rounded-full text-[13px] font-semibold border min-h-[44px] active:scale-95 transition-all ${
                          active
                            ? "bg-[#1a1a2e] text-white border-[#1a1a2e]"
                            : "bg-white text-[#6b6460] border-[#E8E2DA]"
                        }`}
                      >
                        {f}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={newFolder}
                  onChange={e => { setNewFolder(e.target.value); if (e.target.value.trim()) setFolderChoice(""); }}
                  placeholder="New folder…"
                  aria-label="Create a new folder"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-[#EDE8E2] focus:border-[#E8610A] text-[15px] font-medium text-[#1a1a2e] min-h-[48px] outline-none transition-colors bg-white"
                  autoCapitalize="words"
                  autoComplete="off"
                />
              </div>

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
                  {editingId ? "Save changes" : "Save phrase"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
