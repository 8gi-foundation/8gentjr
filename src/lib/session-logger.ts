/**
 * Session Logger — Usage tracking via localStorage
 *
 * Logs word usage events and computes stats for the analytics dashboard.
 * All data stays on-device — zero network calls.
 *
 * @see https://github.com/8gi-foundation/8gentjr/issues/24
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionEvent {
  type: "word_used" | "session_start" | "session_end";
  timestamp: number;
  data: Record<string, unknown>;
}

export interface SessionStats {
  totalWords: number;
  uniqueWords: number;
  sessionsThisWeek: number;
  streakDays: number;
  topWords: { word: string; count: number }[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "8gentjr_session_events";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEvents(): SessionEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionEvent[]) : [];
  } catch {
    return [];
  }
}

function saveEvents(events: SessionEvent[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Append an event to the log */
export function logEvent(
  type: SessionEvent["type"],
  data: Record<string, unknown> = {},
): void {
  const events = getEvents();
  events.push({ type, timestamp: Date.now(), data });
  saveEvents(events);
}

/** Convenience: log a word usage event */
export function logWord(word: string): void {
  logEvent("word_used", { word: word.toLowerCase().trim() });
}

/** Remove events older than `daysToKeep` */
export function clearOldLogs(daysToKeep = 30): void {
  const cutoff = Date.now() - daysToKeep * 86_400_000;
  const events = getEvents().filter((e) => e.timestamp >= cutoff);
  saveEvents(events);
}

/** Compute aggregate stats from stored events */
export function getSessionStats(): SessionStats {
  const events = getEvents();
  const now = Date.now();

  // --- words today ---
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();

  const wordsToday = events.filter(
    (e) => e.type === "word_used" && e.timestamp >= todayMs,
  );

  const totalWords = wordsToday.length;

  // --- unique words (all time) ---
  const allWords = events
    .filter((e) => e.type === "word_used" && typeof e.data.word === "string")
    .map((e) => e.data.word as string);

  const wordFreq = new Map<string, number>();
  for (const w of allWords) {
    wordFreq.set(w, (wordFreq.get(w) ?? 0) + 1);
  }
  const uniqueWords = wordFreq.size;

  // --- top 5 words ---
  const topWords = [...wordFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word, count]) => ({ word, count }));

  // --- sessions this week ---
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
  weekStart.setHours(0, 0, 0, 0);
  const weekMs = weekStart.getTime();

  const sessionsThisWeek = events.filter(
    (e) => e.type === "session_start" && e.timestamp >= weekMs,
  ).length;

  // --- streak days (consecutive days with at least one word event) ---
  const daySet = new Set<string>();
  for (const e of events) {
    if (e.type === "word_used") {
      const d = new Date(e.timestamp);
      daySet.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
  }

  let streakDays = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (true) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
    if (daySet.has(key)) {
      streakDays++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return { totalWords, uniqueWords, sessionsThisWeek, streakDays, topWords };
}
