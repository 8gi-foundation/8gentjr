/**
 * SchoolTube Reels Data
 *
 * Game and video content catalog for the SchoolTube reels feed.
 * Ported from NickOS and adapted for 8gent Jr.
 */

export type ReelType = "video" | "game";

export type ReelTopic =
  | "numbers"
  | "letters"
  | "colors"
  | "shapes"
  | "patterns"
  | "sensory"
  | "speech"
  | "feelings"
  | "animals"
  | "nature"
  | "movement"
  | "music";

export interface Reel {
  id: number;
  type: ReelType;
  title: string;
  thumbnail: string;
  duration?: string;
  topics: ReelTopic[];
  videoUrl?: string;
  gameType?: string;
}

// =============================================================================
// Full reels catalog
// =============================================================================

export const REELS_DATA: Reel[] = [
  // VIDEOS - Numbers
  {
    id: 1,
    type: "video",
    title: "Learn Numbers with Colorful Balls",
    thumbnail: "/placeholder.svg?height=300&width=200&text=Numbers",
    duration: "21:40",
    topics: ["numbers", "colors"],
    videoUrl: "https://www.youtube.com/watch?v=jJ1oH59faX4",
  },
  {
    id: 5,
    type: "video",
    title: "Counting 1 to 10 with Colorful Objects",
    thumbnail: "/placeholder.svg?height=300&width=200&text=Counting",
    duration: "8:32",
    topics: ["numbers"],
    videoUrl: "https://www.youtube.com/watch?v=IIiet2JJVcA",
  },

  // VIDEOS - Letters/ABC
  {
    id: 2,
    type: "video",
    title: "ABC Song with Dancing Letters",
    thumbnail: "/placeholder.svg?height=300&width=200&text=ABC",
    duration: "3:45",
    topics: ["letters"],
    videoUrl: "https://www.youtube.com/watch?v=Kp0bTDOnkzgrQ",
  },
  {
    id: 6,
    type: "video",
    title: "Alphabet Dance Party",
    thumbnail: "/placeholder.svg?height=300&width=200&text=Alphabet",
    duration: "4:20",
    topics: ["letters", "movement"],
    videoUrl: "https://www.youtube.com/watch?v=c3m0-6K1bY0",
  },

  // VIDEOS - Colors
  {
    id: 3,
    type: "video",
    title: "Colors of the Rainbow",
    thumbnail: "/placeholder.svg?height=300&width=200&text=Colors",
    duration: "5:20",
    topics: ["colors"],
    videoUrl: "https://www.youtube.com/watch?v=PN0u1hqfZXw",
  },
  {
    id: 7,
    type: "video",
    title: "Rainbow Song - Learn All Colors",
    thumbnail: "/placeholder.svg?height=300&width=200&text=Rainbow",
    duration: "3:15",
    topics: ["colors", "music"],
    videoUrl: "https://www.youtube.com/watch?v=wW1iKYKhLyY",
  },

  // VIDEOS - Shapes
  {
    id: 4,
    type: "video",
    title: "Shapes All Around Us",
    thumbnail: "/placeholder.svg?height=300&width=200&text=Shapes",
    duration: "8:15",
    topics: ["shapes"],
    videoUrl: "https://www.youtube.com/watch?v=jlzX8jt0Now",
  },
  {
    id: 9,
    type: "video",
    title: "Squares, Circles & Triangles Song",
    thumbnail: "/placeholder.svg?height=300&width=200&text=ShapeSong",
    duration: "3:50",
    topics: ["shapes", "music"],
    videoUrl: "https://www.youtube.com/watch?v=BwFmDGOAS6s",
  },

  // COUNTING & NUMBERS GAMES
  {
    id: 10,
    type: "game",
    title: "Count the Balls",
    thumbnail: "/placeholder.svg?height=300&width=200&text=Count",
    topics: ["numbers"],
    gameType: "counting",
  },
  {
    id: 11,
    type: "game",
    title: "Pop Numbers in Order",
    thumbnail: "/placeholder.svg?height=300&width=200&text=BubblePop",
    topics: ["numbers"],
    gameType: "bubblePop",
  },
  {
    id: 12,
    type: "game",
    title: "Put Numbers in Order",
    thumbnail: "/placeholder.svg?height=300&width=200&text=NumberOrder",
    topics: ["numbers", "patterns"],
    gameType: "numberOrder",
  },
  {
    id: 13,
    type: "game",
    title: "Number Bonds",
    thumbnail: "/placeholder.svg?height=300&width=200&text=Bonds",
    topics: ["numbers"],
    gameType: "numberBonds",
  },

  // SHAPES GAMES
  {
    id: 20,
    type: "game",
    title: "Match the Shapes",
    thumbnail: "/placeholder.svg?height=300&width=200&text=ShapeMatch",
    topics: ["shapes"],
    gameType: "matching",
  },
  {
    id: 21,
    type: "game",
    title: "Shape Memory",
    thumbnail: "/placeholder.svg?height=300&width=200&text=Memory",
    topics: ["shapes"],
    gameType: "memory",
  },
  {
    id: 22,
    type: "game",
    title: "Sort by Size",
    thumbnail: "/placeholder.svg?height=300&width=200&text=SizeSort",
    topics: ["shapes", "patterns"],
    gameType: "sizeSort",
  },

  // COLORS GAMES
  {
    id: 30,
    type: "game",
    title: "Sort by Color",
    thumbnail: "/placeholder.svg?height=300&width=200&text=ColorSort",
    topics: ["colors"],
    gameType: "colorSort",
  },
  {
    id: 31,
    type: "game",
    title: "Mix Colors Together",
    thumbnail: "/placeholder.svg?height=300&width=200&text=ColorMix",
    topics: ["colors"],
    gameType: "colorMix",
  },

  // LETTERS GAMES
  {
    id: 40,
    type: "game",
    title: "Trace the Letters",
    thumbnail: "/placeholder.svg?height=300&width=200&text=LetterTrace",
    topics: ["letters"],
    gameType: "letterTrace",
  },

  // PATTERNS GAMES
  {
    id: 50,
    type: "game",
    title: "Complete the Pattern",
    thumbnail: "/placeholder.svg?height=300&width=200&text=Pattern",
    topics: ["patterns", "shapes"],
    gameType: "pattern",
  },

  // SENSORY GAMES
  {
    id: 100,
    type: "game",
    title: "Ball Rain",
    thumbnail: "/placeholder.svg?height=300&width=200&text=BallRain",
    topics: ["sensory", "numbers"],
    gameType: "ballRain",
  },
  {
    id: 101,
    type: "game",
    title: "Ice Cream Builder",
    thumbnail: "/placeholder.svg?height=300&width=200&text=IceCream",
    topics: ["sensory", "colors"],
    gameType: "iceCream",
  },
  {
    id: 102,
    type: "game",
    title: "Fill the Bottles",
    thumbnail: "/placeholder.svg?height=300&width=200&text=Bottles",
    topics: ["sensory", "colors"],
    gameType: "bottleFill",
  },
  {
    id: 103,
    type: "game",
    title: "Shape Tower",
    thumbnail: "/placeholder.svg?height=300&width=200&text=Tower",
    topics: ["sensory", "shapes"],
    gameType: "shapeTower",
  },
  {
    id: 104,
    type: "game",
    title: "Fireworks Show",
    thumbnail: "/placeholder.svg?height=300&width=200&text=Fireworks",
    topics: ["sensory", "colors"],
    gameType: "fireworks",
  },
  {
    id: 105,
    type: "game",
    title: "Musical Balls",
    thumbnail: "/placeholder.svg?height=300&width=200&text=Musical",
    topics: ["sensory", "numbers"],
    gameType: "musical",
  },
  {
    id: 106,
    type: "game",
    title: "Rainbow Painting",
    thumbnail: "/placeholder.svg?height=300&width=200&text=RainbowPaint",
    topics: ["sensory", "colors"],
    gameType: "rainbowPaint",
  },
  {
    id: 107,
    type: "game",
    title: "Bubble Wrap Pop",
    thumbnail: "/placeholder.svg?height=300&width=200&text=BubbleWrap",
    topics: ["sensory"],
    gameType: "bubbleWrap",
  },
  {
    id: 108,
    type: "game",
    title: "Pour the Water",
    thumbnail: "/placeholder.svg?height=300&width=200&text=WaterPour",
    topics: ["sensory", "colors"],
    gameType: "waterPour",
  },
  {
    id: 109,
    type: "game",
    title: "Fidget Spinner",
    thumbnail: "/placeholder.svg?height=300&width=200&text=Fidget",
    topics: ["sensory"],
    gameType: "fidget",
  },
  {
    id: 110,
    type: "game",
    title: "Marble Run",
    thumbnail: "/placeholder.svg?height=300&width=200&text=MarbleRun",
    topics: ["sensory", "colors"],
    gameType: "marbleRun",
  },

  // SPEECH & LANGUAGE GAMES
  {
    id: 200,
    type: "game",
    title: "Animal Names & Sounds",
    thumbnail: "/placeholder.svg?height=300&width=200&text=Animals",
    topics: ["speech", "animals"],
    gameType: "animalSounds",
  },
  {
    id: 201,
    type: "game",
    title: "Explore Feelings",
    thumbnail: "/placeholder.svg?height=300&width=200&text=Feelings",
    topics: ["speech", "feelings"],
    gameType: "feelings",
  },
  {
    id: 202,
    type: "game",
    title: "Word Repetition",
    thumbnail: "/placeholder.svg?height=300&width=200&text=WordRepeat",
    topics: ["speech", "letters"],
    gameType: "wordRepeat",
  },
  {
    id: 203,
    type: "game",
    title: "Copy the Move",
    thumbnail: "/placeholder.svg?height=300&width=200&text=CopyMove",
    topics: ["speech", "movement"],
    gameType: "copyMove",
  },
  {
    id: 204,
    type: "game",
    title: "Build Sentences",
    thumbnail: "/placeholder.svg?height=300&width=200&text=Sentences",
    topics: ["speech", "letters"],
    gameType: "sentenceBuilder",
  },
  {
    id: 205,
    type: "game",
    title: "Rhyme Time",
    thumbnail: "/placeholder.svg?height=300&width=200&text=RhymeTime",
    topics: ["speech", "music"],
    gameType: "rhymeTime",
  },
  {
    id: 206,
    type: "game",
    title: "Nature Explorer",
    thumbnail: "/placeholder.svg?height=300&width=200&text=Nature",
    topics: ["speech", "nature"],
    gameType: "natureExplore",
  },
  {
    id: 207,
    type: "game",
    title: "Jump & Count",
    thumbnail: "/placeholder.svg?height=300&width=200&text=JumpCount",
    topics: ["speech", "movement", "numbers"],
    gameType: "jumpCount",
  },
];

// =============================================================================
// Helpers
// =============================================================================

export function getReelsByTopic(topic: string): Reel[] {
  if (topic === "all") return REELS_DATA;
  return REELS_DATA.filter((r) => r.topics.includes(topic as ReelTopic));
}

export function getReelsByType(type: ReelType): Reel[] {
  return REELS_DATA.filter((r) => r.type === type);
}

export function getTopics(): string[] {
  return [
    "all",
    "numbers",
    "letters",
    "colors",
    "shapes",
    "patterns",
    "sensory",
    "speech",
    "feelings",
    "animals",
    "nature",
    "movement",
    "music",
  ];
}
