/**
 * Emotional Regulation Playlists for 8gent Jr
 *
 * 7 mood-based playlists with curated tracks to support
 * emotional regulation in neurodivergent children.
 *
 * Inspired by GLP (Gestalt Language Processing) research:
 * music preserves prosody and rhythm, which are primary language pathways.
 */

// =============================================================================
// Types
// =============================================================================

export interface Track {
  title: string;
  artist: string;
  /** Duration in "M:SS" format */
  duration: string;
}

export interface MoodPlaylist {
  name: string;
  emoji: string;
  color: string;
  description: string;
  tracks: Track[];
}

export type MoodKey = "calm" | "happy" | "focus" | "energize" | "sleepy" | "brave" | "silly";

// =============================================================================
// Playlists
// =============================================================================

export const MOOD_PLAYLISTS: Record<MoodKey, MoodPlaylist> = {
  calm: {
    name: "Calm",
    emoji: "\u2601\uFE0F",
    color: "#81D4FA",
    description: "Breathe and relax",
    tracks: [
      { title: "Weightless", artist: "Marconi Union", duration: "8:09" },
      { title: "Clair de Lune", artist: "Claude Debussy", duration: "5:00" },
      { title: "Spiegel im Spiegel", artist: "Arvo Part", duration: "7:40" },
      { title: "Aqueous Transmission", artist: "Incubus", duration: "7:50" },
      { title: "Pure Shores", artist: "All Saints", duration: "4:24" },
    ],
  },
  happy: {
    name: "Happy",
    emoji: "\u2600\uFE0F",
    color: "#FFD54F",
    description: "Smile and celebrate",
    tracks: [
      { title: "Happy", artist: "Pharrell Williams", duration: "3:53" },
      { title: "Walking on Sunshine", artist: "Katrina and the Waves", duration: "3:58" },
      { title: "Can't Stop the Feeling!", artist: "Justin Timberlake", duration: "3:56" },
      { title: "Best Day of My Life", artist: "American Authors", duration: "3:14" },
      { title: "Three Little Birds", artist: "Bob Marley", duration: "3:00" },
    ],
  },
  focus: {
    name: "Focus",
    emoji: "\uD83C\uDF3F",
    color: "#81C784",
    description: "Concentrate and learn",
    tracks: [
      { title: "Experience", artist: "Ludovico Einaudi", duration: "5:15" },
      { title: "Gymnopedies No.1", artist: "Erik Satie", duration: "3:24" },
      { title: "Nuvole Bianche", artist: "Ludovico Einaudi", duration: "5:57" },
      { title: "Divenire", artist: "Ludovico Einaudi", duration: "6:42" },
      { title: "River Flows in You", artist: "Yiruma", duration: "3:10" },
    ],
  },
  energize: {
    name: "Energize",
    emoji: "\u26A1",
    color: "#FF7043",
    description: "Move and dance",
    tracks: [
      { title: "Shake It Off", artist: "Taylor Swift", duration: "3:39" },
      { title: "Uptown Funk", artist: "Bruno Mars", duration: "4:30" },
      { title: "Dance Monkey", artist: "Tones and I", duration: "3:29" },
      { title: "Dynamite", artist: "BTS", duration: "3:19" },
      { title: "Roar", artist: "Katy Perry", duration: "3:43" },
    ],
  },
  sleepy: {
    name: "Sleepy",
    emoji: "\uD83C\uDF19",
    color: "#CE93D8",
    description: "Wind down and rest",
    tracks: [
      { title: "Twinkle Twinkle Little Star", artist: "Traditional", duration: "2:30" },
      { title: "Brahms' Lullaby", artist: "Johannes Brahms", duration: "3:45" },
      { title: "Golden Slumbers", artist: "The Beatles", duration: "1:31" },
      { title: "Dream a Little Dream of Me", artist: "The Mamas & the Papas", duration: "2:57" },
      { title: "Somewhere Over the Rainbow", artist: "Israel Kamakawiwo'ole", duration: "3:48" },
    ],
  },
  brave: {
    name: "Brave",
    emoji: "\uD83D\uDEE1\uFE0F",
    color: "#42A5F5",
    description: "Be strong and courageous",
    tracks: [
      { title: "Brave", artist: "Sara Bareilles", duration: "3:40" },
      { title: "Fight Song", artist: "Rachel Platten", duration: "3:22" },
      { title: "Stronger", artist: "Kelly Clarkson", duration: "3:42" },
      { title: "Eye of the Tiger", artist: "Survivor", duration: "4:05" },
      { title: "Hall of Fame", artist: "The Script ft. will.i.am", duration: "3:22" },
    ],
  },
  silly: {
    name: "Silly",
    emoji: "\uD83E\uDD2A",
    color: "#F48FB1",
    description: "Laugh and be goofy",
    tracks: [
      { title: "Baby Shark", artist: "Pinkfong", duration: "1:36" },
      { title: "The Chicken Dance", artist: "Werner Thomas", duration: "2:45" },
      { title: "Banana Phone", artist: "Raffi", duration: "3:02" },
      { title: "I Am a Gummy Bear", artist: "Gummibar", duration: "2:30" },
      { title: "Crazy Frog", artist: "Axel F", duration: "2:52" },
    ],
  },
};

// =============================================================================
// Helpers
// =============================================================================

export const MOOD_KEYS: MoodKey[] = ["calm", "happy", "focus", "energize", "sleepy", "brave", "silly"];

export function getPlaylist(mood: MoodKey): MoodPlaylist {
  return MOOD_PLAYLISTS[mood];
}

export function getAllPlaylists(): Array<MoodPlaylist & { key: MoodKey }> {
  return MOOD_KEYS.map((key) => ({ key, ...MOOD_PLAYLISTS[key] }));
}
