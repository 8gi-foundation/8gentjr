"use client";

import { useState, useCallback, useRef } from "react";

// =============================================================================
// Types
// =============================================================================

type PhonemeCategory = "vowels" | "consonants" | "blends";

interface Phoneme {
  id: string;
  symbol: string;
  example: string;
  mouthDescription: string;
  category: PhonemeCategory;
  /** SVG instructions for mouth visualization */
  lips: "open" | "round" | "wide" | "closed" | "biting" | "pressed";
  tongue: "low" | "high" | "tip-up" | "back" | "between-teeth" | "curled" | "flat" | "neutral";
}

// =============================================================================
// 20 Phonemes — vowels, consonants, blends
// =============================================================================

const PHONEMES: Phoneme[] = [
  // Vowels (5)
  { id: "ah", symbol: "AH", example: "Father", mouthDescription: "Mouth wide open, tongue low and flat", category: "vowels", lips: "open", tongue: "low" },
  { id: "ee", symbol: "EE", example: "Tree", mouthDescription: "Lips pulled wide like a smile, tongue high", category: "vowels", lips: "wide", tongue: "high" },
  { id: "oo", symbol: "OO", example: "Moon", mouthDescription: "Lips round and small like a circle", category: "vowels", lips: "round", tongue: "back" },
  { id: "eh", symbol: "EH", example: "Red", mouthDescription: "Mouth slightly open, tongue in the middle", category: "vowels", lips: "open", tongue: "neutral" },
  { id: "ih", symbol: "IH", example: "Sit", mouthDescription: "Lips relaxed, tongue slightly raised", category: "vowels", lips: "open", tongue: "high" },

  // Consonants (10)
  { id: "b", symbol: "B", example: "Ball", mouthDescription: "Press lips together, then pop them open", category: "consonants", lips: "pressed", tongue: "neutral" },
  { id: "m", symbol: "M", example: "Mom", mouthDescription: "Close your lips and hum like a bee", category: "consonants", lips: "closed", tongue: "neutral" },
  { id: "p", symbol: "P", example: "Pop", mouthDescription: "Push air out between pressed lips", category: "consonants", lips: "pressed", tongue: "neutral" },
  { id: "f", symbol: "F", example: "Fish", mouthDescription: "Top teeth gently bite your bottom lip, blow air", category: "consonants", lips: "biting", tongue: "neutral" },
  { id: "s", symbol: "S", example: "Snake", mouthDescription: "Teeth close together, tongue behind teeth, blow air", category: "consonants", lips: "wide", tongue: "tip-up" },
  { id: "t", symbol: "T", example: "Top", mouthDescription: "Tap tongue tip on the bumpy spot behind top teeth", category: "consonants", lips: "open", tongue: "tip-up" },
  { id: "d", symbol: "D", example: "Dog", mouthDescription: "Same as T but with your voice buzzing", category: "consonants", lips: "open", tongue: "tip-up" },
  { id: "k", symbol: "K", example: "Cat", mouthDescription: "Back of tongue pushes up, burst of air", category: "consonants", lips: "open", tongue: "back" },
  { id: "n", symbol: "N", example: "Nose", mouthDescription: "Tongue tip up, air comes out through your nose", category: "consonants", lips: "open", tongue: "tip-up" },
  { id: "r", symbol: "R", example: "Red", mouthDescription: "Curl your tongue back like a wave", category: "consonants", lips: "open", tongue: "curled" },

  // Blends (5)
  { id: "th", symbol: "TH", example: "Thank", mouthDescription: "Tongue peeks out between your teeth, blow gently", category: "blends", lips: "open", tongue: "between-teeth" },
  { id: "sh", symbol: "SH", example: "Shoe", mouthDescription: "Lips push forward, tongue flat, quiet air", category: "blends", lips: "round", tongue: "flat" },
  { id: "ch", symbol: "CH", example: "Cheese", mouthDescription: "Start with T then slide to SH quickly", category: "blends", lips: "round", tongue: "tip-up" },
  { id: "ng", symbol: "NG", example: "Ring", mouthDescription: "Back of tongue up, air goes through nose", category: "blends", lips: "open", tongue: "back" },
  { id: "bl", symbol: "BL", example: "Blue", mouthDescription: "Press lips for B, then tongue up for L", category: "blends", lips: "pressed", tongue: "tip-up" },
];

const CATEGORY_LABELS: Record<PhonemeCategory, string> = {
  vowels: "Vowels",
  consonants: "Consonants",
  blends: "Blends",
};

const CATEGORY_COLORS: Record<PhonemeCategory, { bg: string; active: string; text: string }> = {
  vowels: { bg: "#FFF3E0", active: "#FF9800", text: "#E65100" },
  consonants: { bg: "#E3F2FD", active: "#2196F3", text: "#0D47A1" },
  blends: { bg: "#F3E5F5", active: "#9C27B0", text: "#4A148C" },
};

// =============================================================================
// SVG Mouth Visualization
// =============================================================================

function MouthSVG({ lips, tongue }: { lips: Phoneme["lips"]; tongue: Phoneme["tongue"] }) {
  // Lip path varies by position
  const lipPaths: Record<Phoneme["lips"], { upper: string; lower: string }> = {
    open: {
      upper: "M 20,50 Q 50,35 80,50",
      lower: "M 20,50 Q 50,75 80,50",
    },
    round: {
      upper: "M 30,48 Q 50,38 70,48",
      lower: "M 30,48 Q 50,62 70,48",
    },
    wide: {
      upper: "M 15,50 Q 50,42 85,50",
      lower: "M 15,50 Q 50,60 85,50",
    },
    closed: {
      upper: "M 20,50 Q 50,47 80,50",
      lower: "M 20,50 Q 50,53 80,50",
    },
    biting: {
      upper: "M 20,48 Q 50,42 80,48",
      lower: "M 20,52 Q 50,55 80,52",
    },
    pressed: {
      upper: "M 20,50 Q 50,48 80,50",
      lower: "M 20,50 Q 50,52 80,50",
    },
  };

  // Tongue shapes
  const tongueEl = (() => {
    switch (tongue) {
      case "high":
        return <ellipse cx="50" cy="58" rx="18" ry="6" fill="#E57373" opacity="0.8" />;
      case "tip-up":
        return <path d="M 35,65 Q 50,48 65,65" fill="#E57373" opacity="0.8" />;
      case "back":
        return <path d="M 35,65 Q 42,60 50,62 Q 58,65 65,58" fill="#E57373" opacity="0.8" />;
      case "between-teeth":
        return <ellipse cx="50" cy="50" rx="10" ry="5" fill="#E57373" opacity="0.9" />;
      case "curled":
        return <path d="M 35,65 Q 45,50 50,55 Q 55,60 65,65" fill="#E57373" opacity="0.8" />;
      case "flat":
        return <ellipse cx="50" cy="62" rx="20" ry="4" fill="#E57373" opacity="0.8" />;
      case "low":
        return <ellipse cx="50" cy="66" rx="18" ry="4" fill="#E57373" opacity="0.7" />;
      case "neutral":
      default:
        return null;
    }
  })();

  const { upper, lower } = lipPaths[lips];

  // Teeth row for biting position
  const teeth = lips === "biting" ? (
    <g>
      {[24, 32, 40, 48, 56, 64, 72].map((x) => (
        <rect key={x} x={x - 3} y={44} width={6} height={6} rx={1} fill="white" stroke="#ccc" strokeWidth={0.5} />
      ))}
    </g>
  ) : null;

  return (
    <svg viewBox="0 0 100 100" width="120" height="120" style={{ display: "block", margin: "0 auto" }}>
      {/* Face circle */}
      <circle cx="50" cy="50" r="48" fill="#FDEBD0" stroke="#F5CBA7" strokeWidth="2" />
      {/* Mouth opening fill */}
      <path d={`${upper} L 80,50 ${lower.replace("M 20,50", "").replace("M 15,50", "").replace("M 30,48", "")} Z`}
        fill={lips === "closed" || lips === "pressed" ? "#FDEBD0" : "#8B0000"} opacity={lips === "closed" || lips === "pressed" ? 1 : 0.6} />
      {/* Tongue */}
      {tongueEl}
      {/* Teeth */}
      {teeth}
      {/* Upper lip */}
      <path d={upper} fill="none" stroke="#C0392B" strokeWidth="3" strokeLinecap="round" />
      {/* Lower lip */}
      <path d={lower} fill="none" stroke="#C0392B" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function SpeechTherapy() {
  const [activePhoneme, setActivePhoneme] = useState<string | null>(null);
  const [practiced, setPracticed] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<PhonemeCategory | "all">("all");
  const [speaking, setSpeaking] = useState(false);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const filtered = filter === "all" ? PHONEMES : PHONEMES.filter((p) => p.category === filter);
  const selected = PHONEMES.find((p) => p.id === activePhoneme) ?? null;

  const speak = useCallback((text: string, phonemeId: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.7;
    utterance.pitch = 1.0;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => {
      setSpeaking(false);
      setPracticed((prev) => new Set(prev).add(phonemeId));
    };
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const handleTap = useCallback((phoneme: Phoneme) => {
    setActivePhoneme(phoneme.id);
    speak(phoneme.example, phoneme.id);
  }, [speak]);

  const progress = practiced.size;
  const total = PHONEMES.length;

  return (
    <div style={{ minHeight: "100vh", background: "#FFF8F0", padding: "20px 16px 100px" }}>
      {/* Header */}
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <a href="/" style={{ color: "#888", textDecoration: "none", fontSize: 14, display: "inline-block", marginBottom: 12 }}>
          &larr; Home
        </a>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 4px", color: "#1a1a2e" }}>Speech Therapy</h1>
        <p style={{ fontSize: 14, color: "#666", margin: "0 0 16px" }}>
          Tap a sound to hear it and see how your mouth should look
        </p>

        {/* Progress bar */}
        <div style={{ background: "#eee", borderRadius: 8, height: 8, marginBottom: 20, overflow: "hidden" }}>
          <div
            style={{
              width: `${(progress / total) * 100}%`,
              height: "100%",
              background: progress === total ? "#4CAF50" : "#FF9800",
              borderRadius: 8,
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <p style={{ fontSize: 12, color: "#999", margin: "-12px 0 16px", textAlign: "right" }}>
          {progress}/{total} practiced
        </p>

        {/* Category filter */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {(["all", "vowels", "consonants", "blends"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: filter === cat ? 700 : 500,
                background: filter === cat ? "#FF9800" : "#f0f0f0",
                color: filter === cat ? "white" : "#555",
                transition: "all 0.2s",
              }}
            >
              {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Phoneme grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 10, marginBottom: 24 }}>
          {filtered.map((phoneme) => {
            const isActive = activePhoneme === phoneme.id;
            const isPracticed = practiced.has(phoneme.id);
            const colors = CATEGORY_COLORS[phoneme.category];
            return (
              <button
                key={phoneme.id}
                onClick={() => handleTap(phoneme)}
                style={{
                  width: "100%",
                  aspectRatio: "1",
                  borderRadius: 16,
                  border: isActive ? `3px solid ${colors.active}` : "2px solid transparent",
                  background: isActive ? colors.active : colors.bg,
                  color: isActive ? "white" : colors.text,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  transition: "all 0.15s ease",
                  position: "relative",
                  boxShadow: isActive ? "0 4px 12px rgba(0,0,0,0.15)" : "0 1px 3px rgba(0,0,0,0.08)",
                  transform: isActive ? "scale(1.08)" : "scale(1)",
                }}
              >
                {isPracticed && (
                  <span style={{ position: "absolute", top: 4, right: 6, fontSize: 10, color: isActive ? "white" : "#4CAF50" }}>
                    done
                  </span>
                )}
                <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{phoneme.symbol}</span>
                <span style={{ fontSize: 11, opacity: 0.8 }}>{phoneme.example}</span>
              </button>
            );
          })}
        </div>

        {/* Selected phoneme detail */}
        {selected && (
          <div
            style={{
              background: "white",
              borderRadius: 20,
              padding: 24,
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: CATEGORY_COLORS[selected.category].active,
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  fontWeight: 700,
                }}
              >
                {selected.symbol}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>
                  {selected.symbol} &mdash; &ldquo;{selected.example}&rdquo;
                </h2>
                <span
                  style={{
                    display: "inline-block",
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 10,
                    background: CATEGORY_COLORS[selected.category].bg,
                    color: CATEGORY_COLORS[selected.category].text,
                    fontWeight: 600,
                    marginTop: 4,
                  }}
                >
                  {CATEGORY_LABELS[selected.category]}
                </span>
              </div>
            </div>

            {/* Mouth SVG */}
            <div style={{ margin: "0 auto 16px", textAlign: "center" }}>
              <MouthSVG lips={selected.lips} tongue={selected.tongue} />
              <p style={{ fontSize: 12, color: "#999", marginTop: 6 }}>Mouth position guide</p>
            </div>

            {/* Description */}
            <p style={{ fontSize: 16, color: "#333", lineHeight: 1.5, margin: "0 0 16px", textAlign: "center" }}>
              {selected.mouthDescription}
            </p>

            {/* Play button */}
            <button
              onClick={() => speak(selected.example, selected.id)}
              disabled={speaking}
              style={{
                display: "block",
                width: "100%",
                padding: "14px",
                borderRadius: 14,
                border: "none",
                background: speaking ? "#ccc" : CATEGORY_COLORS[selected.category].active,
                color: "white",
                fontSize: 16,
                fontWeight: 700,
                cursor: speaking ? "default" : "pointer",
                transition: "background 0.2s",
              }}
            >
              {speaking ? "Listening..." : `Hear "${selected.example}"`}
            </button>
          </div>
        )}

        {/* Completion message */}
        {progress === total && (
          <div
            style={{
              background: "#E8F5E9",
              borderRadius: 16,
              padding: 20,
              textAlign: "center",
              border: "2px solid #4CAF50",
            }}
          >
            <p style={{ fontSize: 20, fontWeight: 700, color: "#2E7D32", margin: "0 0 4px" }}>
              All sounds practiced!
            </p>
            <p style={{ fontSize: 14, color: "#388E3C", margin: 0 }}>
              Great job! You went through all {total} sounds this session.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
