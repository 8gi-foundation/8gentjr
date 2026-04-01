// ---------------------------------------------------------------------------
// Smart Grid Suggestions — rules-based v1 (no LLM)
// ---------------------------------------------------------------------------

export interface Suggestion {
  /** The word or phrase being suggested */
  text: string;
  /** Why this suggestion is being made */
  reason: string;
  /** Category grouping: usage | stage | grid */
  category: "usage" | "stage" | "grid";
}

// ---------------------------------------------------------------------------
// suggestByUsage — recommend alternatives when a child over-uses certain words
// ---------------------------------------------------------------------------

const USAGE_ALTERNATIVES: Record<string, string[]> = {
  want: ["need", "like", "wish", "choose"],
  more: ["again", "another", "extra", "lots"],
  no: ["stop", "not", "don't like", "finished"],
  yes: ["okay", "please", "sure", "right"],
  go: ["move", "walk", "run", "leave"],
  help: ["assist", "fix", "support", "show me"],
  eat: ["hungry", "snack", "meal", "bite"],
  drink: ["thirsty", "water", "juice", "sip"],
  play: ["fun", "game", "toy", "outside"],
  big: ["large", "huge", "tall", "giant"],
  small: ["little", "tiny", "short", "mini"],
  happy: ["glad", "excited", "cheerful", "joyful"],
  sad: ["upset", "unhappy", "cry", "down"],
  good: ["great", "nice", "awesome", "well done"],
  bad: ["yucky", "wrong", "broken", "not nice"],
};

/**
 * Suggest alternative vocabulary when a child over-relies on certain words.
 *
 * @param usedWords - Array of words the child has been selecting frequently
 * @returns Suggestions for diversifying vocabulary
 */
export function suggestByUsage(usedWords: string[]): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const lowerUsed = usedWords.map((w) => w.toLowerCase());

  // Count occurrences
  const counts: Record<string, number> = {};
  for (const word of lowerUsed) {
    counts[word] = (counts[word] || 0) + 1;
  }

  for (const [word, count] of Object.entries(counts)) {
    if (count < 3) continue; // only flag words used 3+ times
    const alternatives = USAGE_ALTERNATIVES[word];
    if (!alternatives) continue;

    // Only suggest alternatives the child hasn't already used
    const unused = alternatives.filter((alt) => !lowerUsed.includes(alt));
    for (const alt of unused.slice(0, 2)) {
      suggestions.push({
        text: alt,
        reason: `You use "${word}" a lot — try "${alt}" instead`,
        category: "usage",
      });
    }
  }

  return suggestions;
}

// ---------------------------------------------------------------------------
// suggestByStage — common words appropriate for GLP stages 1-6
// ---------------------------------------------------------------------------

/** GLP (Gestalt Language Processing) stage word banks */
const GLP_STAGE_WORDS: Record<number, string[]> = {
  1: [
    // Stage 1: Echolalia / scripted chunks
    "let's go",
    "all done",
    "oh no",
    "uh oh",
    "ready set go",
    "my turn",
    "bye bye",
    "come here",
    "look at that",
    "I want that",
  ],
  2: [
    // Stage 2: Mitigated gestalts — partial scripts mixed/trimmed
    "want more",
    "go there",
    "not that",
    "this one",
    "help me",
    "open it",
    "give me",
    "I see",
    "come on",
    "all gone",
  ],
  3: [
    // Stage 3: Single words + early combinations
    "more",
    "stop",
    "yes",
    "no",
    "go",
    "help",
    "want",
    "like",
    "big",
    "happy",
    "sad",
    "eat",
    "drink",
    "play",
    "done",
  ],
  4: [
    // Stage 4: Early sentences
    "I want",
    "I need",
    "I like",
    "I see",
    "I feel",
    "can I",
    "give me",
    "where is",
    "what is",
    "I don't want",
  ],
  5: [
    // Stage 5: Complex sentences
    "I want to go",
    "can I have",
    "I don't like",
    "where is the",
    "I feel happy",
    "I feel sad",
    "I need help with",
    "can we play",
    "I am hungry",
    "I am tired",
  ],
  6: [
    // Stage 6: Advanced grammar
    "because",
    "but",
    "if",
    "when",
    "before",
    "after",
    "maybe",
    "probably",
    "I think",
    "I wonder",
  ],
};

/**
 * Suggest vocabulary appropriate for a child's GLP (Gestalt Language Processing) stage.
 *
 * @param glpStage - The child's current GLP stage (1-6)
 * @returns Stage-appropriate word/phrase suggestions
 */
export function suggestByStage(glpStage: number): Suggestion[] {
  const clamped = Math.max(1, Math.min(6, Math.round(glpStage)));
  const words = GLP_STAGE_WORDS[clamped] || [];

  return words.map((word) => ({
    text: word,
    reason: `Common for GLP Stage ${clamped}`,
    category: "stage" as const,
  }));
}

// ---------------------------------------------------------------------------
// suggestByGrid — recommend missing essentials for known grid contexts
// ---------------------------------------------------------------------------

/** Essential words that belong in common grid categories */
const GRID_ESSENTIALS: Record<string, string[]> = {
  kitchen: [
    "spoon",
    "cup",
    "hot",
    "cold",
    "plate",
    "fork",
    "bowl",
    "water",
    "hungry",
    "drink",
    "eat",
    "more",
    "all done",
    "yummy",
    "yucky",
  ],
  bathroom: [
    "toilet",
    "wash",
    "brush teeth",
    "soap",
    "towel",
    "bath",
    "shower",
    "clean",
    "dry",
    "flush",
    "help",
    "all done",
  ],
  feelings: [
    "happy",
    "sad",
    "angry",
    "scared",
    "tired",
    "hungry",
    "thirsty",
    "excited",
    "calm",
    "hurt",
    "sick",
    "love",
  ],
  school: [
    "teacher",
    "friend",
    "read",
    "write",
    "draw",
    "play",
    "sit",
    "listen",
    "help",
    "break",
    "lunch",
    "toilet",
    "finished",
  ],
  play: [
    "my turn",
    "your turn",
    "share",
    "fun",
    "again",
    "stop",
    "more",
    "build",
    "catch",
    "throw",
    "push",
    "pull",
    "swing",
  ],
  food: [
    "banana",
    "apple",
    "bread",
    "milk",
    "juice",
    "water",
    "snack",
    "lunch",
    "dinner",
    "more",
    "all done",
    "yummy",
    "yucky",
    "hot",
    "cold",
  ],
  core: [
    "I",
    "you",
    "want",
    "need",
    "like",
    "go",
    "stop",
    "help",
    "more",
    "not",
    "yes",
    "no",
    "that",
    "here",
    "there",
    "what",
    "where",
  ],
};

/**
 * Suggest missing essential words for a specific grid context.
 *
 * @param gridName - Name of the grid (e.g. "kitchen", "feelings")
 * @param existingCards - Words already present on the grid
 * @returns Suggestions for missing essential words
 */
export function suggestByGrid(
  gridName: string,
  existingCards: string[]
): Suggestion[] {
  const key = gridName.toLowerCase().trim();
  const essentials = GRID_ESSENTIALS[key];

  if (!essentials) {
    return [];
  }

  const lowerExisting = new Set(existingCards.map((c) => c.toLowerCase()));
  const missing = essentials.filter((word) => !lowerExisting.has(word));

  return missing.map((word) => ({
    text: word,
    reason: `Your ${gridName} grid is missing: ${word}`,
    category: "grid" as const,
  }));
}
