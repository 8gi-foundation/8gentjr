/**
 * Core vocabulary - the SINGLE source of truth for the Supercore 50 word set.
 *
 * Before the Layout Primitives surfaces existed, this data lived privately
 * inside `SupercoreGrid.tsx`. Every alternative surface (Scene, Word Rail,
 * Flow Board, Orbit Core) must render the EXACT SAME vocabulary and route
 * through the EXACT SAME speech + sentence-strip pipeline as the grid. To make
 * that guarantee real (and testable) the word list, the Fitzgerald Key colour
 * classes, the pictogram URL helper and the "tap a core word" action are all
 * defined here, once, and imported by the grid and every surface.
 *
 * NON-DESTRUCTIVE CONTRACT: nothing in this module mutates vocabulary,
 * categories, personal words or phrase folders. `SUPERCORE_50` is frozen. The
 * tap helper only speaks, appends a chip to the shared sentence store, and logs
 * the tap for analytics - identical to a grid tap.
 *
 * CRITICAL AAC RULES (unchanged from the grid):
 *   1. Words NEVER move once positioned (motor-planning consistency).
 *   2. This order is PERMANENT. Never reorder SUPERCORE_50.
 *   3. Each word has: text label + Fitzgerald Key colour category.
 *   4. Tapping a word speaks it and adds it to the sentence strip.
 *
 * Colour coding: Modified Fitzgerald Key. The category colours on word cards
 * are the industry-standard AAC key and are exempt from the app-wide banned-hue
 * rule; surface CHROME (backdrops, rails, rings) must stay clear of hues
 * 270-350.
 */

import type { WordCategory } from '@/lib/fitzgerald-key';
import { FITZGERALD_COLORS } from '@/lib/fitzgerald-key';
import type { SentenceWord } from '@/lib/sentence-store';

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export type FitzgeraldCategory =
  | 'people'
  | 'verbs'
  | 'descriptors'
  | 'prepositions'
  | 'social'
  | 'questions'
  | 'determiners'
  | 'negation';

/** Map grid categories to canonical Fitzgerald Key word categories. */
export const CATEGORY_TO_WORD_TYPE: Record<FitzgeraldCategory, WordCategory> = {
  people: 'pronoun',
  verbs: 'verb',
  descriptors: 'adjective',
  prepositions: 'preposition',
  social: 'social',
  questions: 'question',
  determiners: 'determiner',
  negation: 'negation',
};

/**
 * Tailwind class strings (backed by CSS variables) for each Fitzgerald
 * category. bg = background, text = text colour, border = border colour.
 * Shared by the grid and every surface so a chip built anywhere looks the same
 * in the sentence strip.
 */
export const FITZGERALD_CLASSES: Record<
  FitzgeraldCategory,
  { bg: string; text: string; border: string }
> = {
  people:       { bg: 'bg-fitzgerald-yellow', text: 'text-fitzgerald-yellow-text', border: 'border-fitzgerald-yellow-border' },
  verbs:        { bg: 'bg-fitzgerald-green',  text: 'text-fitzgerald-green-text',  border: 'border-fitzgerald-green-border' },
  descriptors:  { bg: 'bg-fitzgerald-blue',   text: 'text-fitzgerald-blue-text',   border: 'border-fitzgerald-blue-border' },
  prepositions: { bg: 'bg-fitzgerald-purple', text: 'text-fitzgerald-purple-text', border: 'border-fitzgerald-purple-border' },
  social:       { bg: 'bg-fitzgerald-pink',   text: 'text-fitzgerald-pink-text',   border: 'border-fitzgerald-pink-border' },
  questions:    { bg: 'bg-fitzgerald-orange', text: 'text-fitzgerald-orange-text', border: 'border-fitzgerald-orange-border' },
  determiners:  { bg: 'bg-fitzgerald-white',  text: 'text-fitzgerald-white-text',  border: 'border-fitzgerald-white-border' },
  negation:     { bg: 'bg-fitzgerald-red',    text: 'text-fitzgerald-red-text',    border: 'border-fitzgerald-red-border' },
};

/** Display order + friendly labels for category-organised surfaces. */
export const CORE_CATEGORY_ORDER: { category: FitzgeraldCategory; label: string }[] = [
  { category: 'people',       label: 'People' },
  { category: 'verbs',        label: 'Doing' },
  { category: 'descriptors',  label: 'Feelings' },
  { category: 'social',       label: 'Social' },
  { category: 'questions',    label: 'Questions' },
  { category: 'prepositions', label: 'Places' },
  { category: 'determiners',  label: 'Little words' },
  { category: 'negation',     label: 'No & stop' },
];

/** Inline Fitzgerald Key colour object for a grid category. */
export function getGridCategoryColor(category: FitzgeraldCategory) {
  return FITZGERALD_COLORS[CATEGORY_TO_WORD_TYPE[category]];
}

// ---------------------------------------------------------------------------
// Word data
// ---------------------------------------------------------------------------

export interface SupercoreWord {
  id: string;
  label: string;
  category: FitzgeraldCategory;
  arasaacId?: number;
}

/** ARASAAC pictogram URL for a numeric pictogram id. */
export const ARASAAC_IMG = (id: number) =>
  `https://static.arasaac.org/pictograms/${id}/${id}_500.png`;

/**
 * THE SUPERCORE 50 GRID
 *
 * Layout: 10 columns x 5 rows = 50 cells, left-to-right, top-to-bottom.
 * THIS ORDER IS PERMANENT. NEVER CHANGE IT. Frozen to make the
 * non-destructive contract enforceable at runtime.
 */
export const SUPERCORE_50: readonly SupercoreWord[] = Object.freeze([
  // Row 1
  { id: 'w01', label: 'I',         category: 'people',      arasaacId: 6632 },
  { id: 'w02', label: 'you',       category: 'people',      arasaacId: 6625 },
  { id: 'w03', label: 'want',      category: 'verbs',       arasaacId: 5441 },
  { id: 'w04', label: 'need',      category: 'verbs',       arasaacId: 37160 },
  { id: 'w05', label: 'like',      category: 'verbs',       arasaacId: 37826 },
  { id: 'w06', label: "don't",     category: 'negation',    arasaacId: 5525 },
  { id: 'w07', label: 'help',      category: 'social',      arasaacId: 32648 },
  { id: 'w08', label: 'more',      category: 'determiners', arasaacId: 5508 },
  { id: 'w09', label: 'stop',      category: 'negation',    arasaacId: 7196 },
  { id: 'w10', label: 'go',        category: 'verbs',       arasaacId: 8142 },

  // Row 2
  { id: 'w11', label: 'come',      category: 'verbs',       arasaacId: 32669 },
  { id: 'w12', label: 'look',      category: 'verbs',       arasaacId: 6564 },
  { id: 'w13', label: 'eat',       category: 'verbs',       arasaacId: 6456 },
  { id: 'w14', label: 'drink',     category: 'verbs',       arasaacId: 6061 },
  { id: 'w15', label: 'play',      category: 'verbs',       arasaacId: 23392 },
  { id: 'w16', label: 'yes',       category: 'social',      arasaacId: 5584 },
  { id: 'w17', label: 'no',        category: 'negation',    arasaacId: 5526 },
  { id: 'w18', label: 'please',    category: 'social',      arasaacId: 8195 },
  { id: 'w19', label: 'thank you', category: 'social',      arasaacId: 8129 },
  { id: 'w20', label: 'sorry',     category: 'social',      arasaacId: 11625 },

  // Row 3
  { id: 'w21', label: 'happy',     category: 'descriptors', arasaacId: 35533 },
  { id: 'w22', label: 'sad',       category: 'descriptors', arasaacId: 35545 },
  { id: 'w23', label: 'angry',     category: 'descriptors', arasaacId: 35539 },
  { id: 'w24', label: 'tired',     category: 'descriptors', arasaacId: 35537 },
  { id: 'w25', label: 'hot',       category: 'descriptors', arasaacId: 2300 },
  { id: 'w26', label: 'cold',      category: 'descriptors', arasaacId: 4652 },
  { id: 'w27', label: 'big',       category: 'descriptors', arasaacId: 4658 },
  { id: 'w28', label: 'small',     category: 'descriptors', arasaacId: 4716 },
  { id: 'w29', label: 'up',        category: 'prepositions', arasaacId: 5388 },
  { id: 'w30', label: 'down',      category: 'prepositions', arasaacId: 37428 },

  // Row 4
  { id: 'w31', label: 'in',        category: 'prepositions', arasaacId: 7034 },
  { id: 'w32', label: 'out',       category: 'prepositions', arasaacId: 6606 },
  { id: 'w33', label: 'on',        category: 'prepositions', arasaacId: 7814 },
  { id: 'w34', label: 'off',       category: 'prepositions', arasaacId: 27518 },
  { id: 'w35', label: 'open',      category: 'verbs',       arasaacId: 24825 },
  { id: 'w36', label: 'close',     category: 'verbs',       arasaacId: 30383 },
  { id: 'w37', label: 'give',      category: 'verbs',       arasaacId: 28431 },
  { id: 'w38', label: 'take',      category: 'verbs',       arasaacId: 10148 },
  { id: 'w39', label: 'put',       category: 'verbs',       arasaacId: 32757 },
  { id: 'w40', label: 'make',      category: 'verbs',       arasaacId: 32751 },

  // Row 5
  { id: 'w41', label: 'do',        category: 'verbs',       arasaacId: 6624 },
  { id: 'w42', label: 'have',      category: 'verbs',       arasaacId: 32761 },
  { id: 'w43', label: 'is',        category: 'verbs',       arasaacId: 8115 },
  { id: 'w44', label: 'it',        category: 'determiners', arasaacId: 31670 },
  { id: 'w45', label: 'that',      category: 'determiners', arasaacId: 6906 },
  { id: 'w46', label: 'this',      category: 'determiners', arasaacId: 7095 },
  { id: 'w47', label: 'what',      category: 'questions',   arasaacId: 22620 },
  { id: 'w48', label: 'where',     category: 'questions',   arasaacId: 7764 },
  { id: 'w49', label: 'who',       category: 'questions',   arasaacId: 9853 },
  { id: 'w50', label: 'why',       category: 'questions',   arasaacId: 36719 },
] as const);

/** Lowercase label -> Supercore word, built once. */
export const SUPERCORE_BY_LABEL: ReadonlyMap<string, SupercoreWord> = (() => {
  const map = new Map<string, SupercoreWord>();
  for (const w of SUPERCORE_50) map.set(w.label.toLowerCase(), w);
  return map;
})();

/** All words in a category, in their permanent grid order. */
export function wordsInCategory(category: FitzgeraldCategory): SupercoreWord[] {
  return SUPERCORE_50.filter((w) => w.category === category);
}

// ---------------------------------------------------------------------------
// Scene hotspots (Gamma / SceneField)
// ---------------------------------------------------------------------------

/**
 * A curated set of large, high-value core words positioned over the Scene
 * backdrop as percentages (x/y are the hotspot CENTRE, 0-100). Few, big
 * targets - the whole point of the Scene surface. Every entry is a real
 * Supercore word (looked up by id) so the Scene never invents vocabulary.
 */
export interface SceneHotspot {
  id: string;
  /** Centre X as a percentage of the scene width. */
  x: number;
  /** Centre Y as a percentage of the scene height. */
  y: number;
}

export const SCENE_HOTSPOTS: readonly SceneHotspot[] = Object.freeze([
  { id: 'w01', x: 16, y: 22 }, // I
  { id: 'w02', x: 50, y: 16 }, // you
  { id: 'w03', x: 82, y: 24 }, // want
  { id: 'w13', x: 24, y: 46 }, // eat
  { id: 'w14', x: 50, y: 42 }, // drink
  { id: 'w15', x: 76, y: 48 }, // play
  { id: 'w07', x: 14, y: 70 }, // help
  { id: 'w08', x: 38, y: 74 }, // more
  { id: 'w16', x: 62, y: 72 }, // yes
  { id: 'w09', x: 86, y: 70 }, // stop
  { id: 'w21', x: 32, y: 90 }, // happy
  { id: 'w10', x: 68, y: 90 }, // go
]);

/** Resolve the curated Scene hotspots to their Supercore words + positions. */
export function sceneHotspotWords(): { word: SupercoreWord; x: number; y: number }[] {
  return SCENE_HOTSPOTS.map((h) => {
    const word = SUPERCORE_50.find((w) => w.id === h.id);
    if (!word) throw new Error(`Scene hotspot references unknown word id: ${h.id}`);
    return { word, x: h.x, y: h.y };
  });
}

// ---------------------------------------------------------------------------
// Shared tap action (the ONE way any surface writes a core word)
// ---------------------------------------------------------------------------

/** Build the sentence-strip chip for a core word (Fitzgerald-coloured). */
export function coreWordChip(word: SupercoreWord): SentenceWord {
  const cls = FITZGERALD_CLASSES[word.category];
  return {
    label: word.label,
    imageUrl: word.arasaacId ? ARASAAC_IMG(word.arasaacId) : undefined,
    className: `${cls.bg} ${cls.text} ${cls.border}`,
  };
}

/** Callback bundle for {@link performCoreTap}. Pure and injectable for tests. */
export interface CoreTapHandlers {
  /** Speak the word (shared TTS pipeline). */
  speak: (text: string) => void;
  /** Append a chip to the shared sentence store. */
  add: (chip: SentenceWord) => void;
  /** Log the tap for analytics/personalisation. */
  log: (word: string) => void;
}

/**
 * The single "tap a core word" action, shared by the grid and every surface.
 * Speaks the word, appends its chip to the shared sentence strip, and logs the
 * tap - in that order, exactly as the grid does. Purely delegates to the
 * injected handlers so it is trivially testable and provably non-destructive
 * (it never touches vocabulary, personal words or phrase folders).
 */
export function performCoreTap(word: SupercoreWord, handlers: CoreTapHandlers): void {
  handlers.speak(word.label);
  handlers.add(coreWordChip(word));
  handlers.log(word.label);
}
