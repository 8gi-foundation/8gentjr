"use client";

import { useState } from "react";
import GameCard from "@/components/games/GameCard";

// Speech games
import AnimalSounds from "@/components/games/speech/AnimalSounds";
import WordRepeat from "@/components/games/speech/WordRepeat";
import RhymeTime from "@/components/games/speech/RhymeTime";
import FeelingsExplorer from "@/components/games/speech/FeelingsExplorer";
import CopyMove from "@/components/games/speech/CopyMove";
import NatureExplore from "@/components/games/speech/NatureExplore";
import JumpCount from "@/components/games/speech/JumpCount";
import SentenceBuilder from "@/components/games/speech/SentenceBuilder";

// Maths / Academic games
import ColorSort from "@/components/games/academic/ColorSort";
import CountingBalls from "@/components/games/academic/CountingBalls";
import PatternComplete from "@/components/games/academic/PatternComplete";
import ShapeMatch from "@/components/games/academic/ShapeMatch";
import LetterTrace from "@/components/games/academic/LetterTrace";
import NumberOrder from "@/components/games/academic/NumberOrder";
import SizeSort from "@/components/games/academic/SizeSort";
import NumberBonds from "@/components/games/academic/NumberBonds";
import ColorMix from "@/components/games/academic/ColorMix";
import BubblePopNumbers from "@/components/games/academic/BubblePopNumbers";

// Sensory games
import BreathingSphere from "@/components/games/sensory/BreathingSphere";
import BubbleWrap from "@/components/games/sensory/BubbleWrap";
import RainbowPaint from "@/components/games/sensory/RainbowPaint";
import SpinFidget from "@/components/games/sensory/SpinFidget";
import MarbleRun from "@/components/games/sensory/MarbleRun";
import IceCreamBuilder from "@/components/games/sensory/IceCreamBuilder";
import ShapeTower from "@/components/games/sensory/ShapeTower";
import BallRain from "@/components/games/sensory/BallRain";

// Sensory 3D games
import Starfield from "@/components/games/sensory-3d/Starfield";
import CrystalGarden from "@/components/games/sensory-3d/CrystalGarden";
import CalmingParticles from "@/components/games/sensory-3d/CalmingParticles";
import LavaLamp from "@/components/games/sensory-3d/LavaLamp";
import MagneticParticles from "@/components/games/sensory-3d/MagneticParticles";
import DominoCascade from "@/components/games/sensory-3d/DominoCascade";
import BallRun3D from "@/components/games/sensory-3d/BallRun3D";
import PendulumWave from "@/components/games/sensory-3d/PendulumWave";
import ChainReaction from "@/components/games/sensory-3d/ChainReaction";
import ParticleFireworks from "@/components/games/sensory-3d/ParticleFireworks";
import MusicalBalls from "@/components/games/sensory-3d/MusicalBalls";

// Memory games
import MemoryMatch from "@/components/games/memory/MemoryMatch";

type Category = "speech" | "maths" | "sensory" | "sensory-3d" | "memory";

type GameDef = {
  id: string;
  category: Category;
  emoji: string;
  title: string;
  description: string;
  color: string;
  component: React.ComponentType;
};

const categories: { id: Category; label: string; emoji: string }[] = [
  { id: "speech", label: "Speech", emoji: "\u{1F5E3}\uFE0F" },
  { id: "maths", label: "Maths", emoji: "\u{1F522}" },
  { id: "sensory", label: "Sensory", emoji: "\u{1F308}" },
  { id: "sensory-3d", label: "Sensory 3D", emoji: "\u{1F30C}" },
  { id: "memory", label: "Memory", emoji: "\u{1F9E0}" },
];

const games: GameDef[] = [
  // Speech (8)
  { id: "animal-sounds", category: "speech", emoji: "\u{1F43E}", title: "Animal Sounds", description: "Match animals to their sounds!", color: "#E8A87C", component: AnimalSounds },
  { id: "word-repeat", category: "speech", emoji: "\u{1F3A4}", title: "Word Repeat", description: "Hear a word and say it 3 times!", color: "#9B59B6", component: WordRepeat },
  { id: "rhyme-time", category: "speech", emoji: "\u{1F3B5}", title: "Rhyme Time", description: "Find the words that rhyme!", color: "#6C5CE7", component: RhymeTime },
  { id: "feelings", category: "speech", emoji: "\u{1F60A}", title: "Feelings Explorer", description: "Learn about emotions!", color: "#FFD93D", component: FeelingsExplorer },
  { id: "copy-move", category: "speech", emoji: "\u{1F57A}", title: "Copy Move", description: "Watch and copy the moves!", color: "#4ECDC4", component: CopyMove },
  { id: "nature-explore", category: "speech", emoji: "\u{1F33F}", title: "Nature Explore", description: "Discover amazing nature facts!", color: "#2ECC71", component: NatureExplore },
  { id: "jump-count", category: "speech", emoji: "\u{1F998}", title: "Jump & Count", description: "Move and count at the same time!", color: "#FF6B6B", component: JumpCount },
  { id: "sentence-builder", category: "speech", emoji: "\u{1F4D6}", title: "Sentence Builder", description: "Complete the sentences!", color: "#F59E0B", component: SentenceBuilder },

  // Maths (10)
  { id: "color-sort", category: "maths", emoji: "\u{1F3A8}", title: "Color Sort", description: "Sort the colors correctly!", color: "#FF6B6B", component: ColorSort },
  { id: "counting-balls", category: "maths", emoji: "\u26BD", title: "Counting Balls", description: "Count the bouncing balls!", color: "#4ECDC4", component: CountingBalls },
  { id: "pattern-complete", category: "maths", emoji: "\u{1F9E9}", title: "Pattern Complete", description: "Complete the pattern!", color: "#FFE66D", component: PatternComplete },
  { id: "shape-match", category: "maths", emoji: "\u{1F7E3}", title: "Shape Match", description: "Match the shapes!", color: "#DDA0DD", component: ShapeMatch },
  { id: "letter-trace", category: "maths", emoji: "\u270F\uFE0F", title: "Letter Trace", description: "Trace and identify letters!", color: "#4ECDC4", component: LetterTrace },
  { id: "number-order", category: "maths", emoji: "\u{1F522}", title: "Number Order", description: "Put numbers in the right order!", color: "#FFE66D", component: NumberOrder },
  { id: "size-sort", category: "maths", emoji: "\u{1F4CF}", title: "Size Sort", description: "Sort shapes by size!", color: "#FFB347", component: SizeSort },
  { id: "number-bonds", category: "maths", emoji: "\u{1F9EE}", title: "Number Bonds", description: "Find the missing number!", color: "#4ECDC4", component: NumberBonds },
  { id: "color-mix", category: "maths", emoji: "\u{1F3A8}", title: "Color Mix", description: "Guess what color you get!", color: "#FFB347", component: ColorMix },
  { id: "bubble-pop-numbers", category: "maths", emoji: "\u{1FAE7}", title: "Bubble Pop", description: "Pop bubbles in order!", color: "#4ECDC4", component: BubblePopNumbers },

  // Sensory (8)
  { id: "breathing-sphere", category: "sensory", emoji: "\u{1F4AB}", title: "Breathing Sphere", description: "Breathe in and out slowly!", color: "#87CEEB", component: BreathingSphere },
  { id: "bubble-wrap", category: "sensory", emoji: "\u{1FAE7}", title: "Bubble Wrap", description: "Pop all the bubbles!", color: "#95E1D3", component: BubbleWrap },
  { id: "rainbow-paint", category: "sensory", emoji: "\u{1F308}", title: "Rainbow Paint", description: "Paint with rainbow colors!", color: "#FF6B6B", component: RainbowPaint },
  { id: "spin-fidget", category: "sensory", emoji: "\u{1F300}", title: "Spin Fidget", description: "Spin the fidget spinner!", color: "#DDA0DD", component: SpinFidget },
  { id: "marble-run", category: "sensory", emoji: "\u{1F52E}", title: "Marble Run", description: "Catch rolling marbles!", color: "#38BDF8", component: MarbleRun },
  { id: "ice-cream-builder", category: "sensory", emoji: "\u{1F366}", title: "Ice Cream Builder", description: "Build a delicious ice cream!", color: "#FFB6C1", component: IceCreamBuilder },
  { id: "shape-tower", category: "sensory", emoji: "\u{1F3D7}\uFE0F", title: "Shape Tower", description: "Stack shapes to the sky!", color: "#A855F7", component: ShapeTower },
  { id: "ball-rain", category: "sensory", emoji: "\u{1F327}\uFE0F", title: "Ball Rain", description: "Collect colorful raining balls!", color: "#38BDF8", component: BallRain },

  // Sensory 3D (11)
  { id: "starfield", category: "sensory-3d", emoji: "\u2B50", title: "Starfield", description: "Drift through the galaxy!", color: "#818CF8", component: Starfield },
  { id: "crystal-garden", category: "sensory-3d", emoji: "\u{1F48E}", title: "Crystal Garden", description: "Find all magical crystals!", color: "#A855F7", component: CrystalGarden },
  { id: "calming-particles", category: "sensory-3d", emoji: "\u2728", title: "Calming Particles", description: "Guide floating particles!", color: "#4ECDC4", component: CalmingParticles },
  { id: "lava-lamp", category: "sensory-3d", emoji: "\u{1F6CB}\uFE0F", title: "Lava Lamp", description: "Watch soothing blobs float!", color: "#F97316", component: LavaLamp },
  { id: "magnetic-particles", category: "sensory-3d", emoji: "\u{1F9F2}", title: "Magnetic Particles", description: "Attract particles with touch!", color: "#06B6D4", component: MagneticParticles },
  { id: "domino-cascade", category: "sensory-3d", emoji: "\u{1F3B2}", title: "Domino Cascade", description: "Watch dominoes fall!", color: "#64748B", component: DominoCascade },
  { id: "ball-run-3d", category: "sensory-3d", emoji: "\u{1F3B3}", title: "Ball Run", description: "Balls bounce down ramps!", color: "#38BDF8", component: BallRun3D },
  { id: "pendulum-wave", category: "sensory-3d", emoji: "\u{1F4A0}", title: "Pendulum Wave", description: "Mesmerizing pendulum pattern!", color: "#8B5CF6", component: PendulumWave },
  { id: "chain-reaction", category: "sensory-3d", emoji: "\u{1F4A5}", title: "Chain Reaction", description: "Trigger a particle cascade!", color: "#F97316", component: ChainReaction },
  { id: "particle-fireworks", category: "sensory-3d", emoji: "\u{1F386}", title: "Fireworks", description: "Create firework explosions!", color: "#EAB308", component: ParticleFireworks },
  { id: "musical-balls", category: "sensory-3d", emoji: "\u{1F3B5}", title: "Musical Balls", description: "Bouncing balls make music!", color: "#EC4899", component: MusicalBalls },

  // Memory (1)
  { id: "memory-match", category: "memory", emoji: "\u{1F0CF}", title: "Memory Match", description: "Find all matching pairs!", color: "#4ECDC4", component: MemoryMatch },
];

export default function GamesPlayPage() {
  const [tab, setTab] = useState<Category>("speech");
  const [activeGame, setActiveGame] = useState<string | null>(null);

  if (activeGame) {
    const game = games.find((g) => g.id === activeGame);
    if (!game) return null;
    const GameComponent = game.component;
    return (
      <div className="min-h-screen bg-[#FFF8F0]">
        <div className="flex items-center px-4 py-3 border-b border-[#F0DECA]">
          <button onClick={() => setActiveGame(null)}
            className="border-none bg-transparent text-xl cursor-pointer px-2 py-1 text-[#E8610A] font-bold">
            &larr; Back
          </button>
          <span className="font-bold text-base text-gray-800 ml-2">{game.title}</span>
        </div>
        <div className="h-[calc(100vh-60px)]">
          <GameComponent />
        </div>
      </div>
    );
  }

  const filtered = games.filter((g) => g.category === tab);

  return (
    <div className="min-h-screen bg-[#FFF8F0] px-4 pt-6 pb-24">
      <h1 className="text-[32px] font-extrabold text-[#E8610A] text-center mb-1">
        Game Hub
      </h1>
      <p className="text-center text-gray-400 text-sm mb-5">
        {games.length} games across {categories.length} categories
      </p>

      {/* Category tabs */}
      <div className="flex justify-center gap-2 mb-6 flex-wrap">
        {categories.map((c) => (
          <button key={c.id} onClick={() => setTab(c.id)}
            className={`px-4 py-2 rounded-[20px] border-none font-bold text-sm cursor-pointer transition-all duration-150 ${
              tab === c.id
                ? "bg-[#E8610A] text-white"
                : "bg-[#F0DECA] text-gray-400"
            }`}>
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {/* Game grid */}
      <div className="grid grid-cols-2 gap-3.5 max-w-[400px] mx-auto">
        {filtered.map((g) => (
          <GameCard key={g.id} emoji={g.emoji} title={g.title} description={g.description} color={g.color}
            onClick={() => setActiveGame(g.id)} />
        ))}
      </div>
    </div>
  );
}
