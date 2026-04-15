"use client";

import { useState, useRef, useCallback, useEffect } from "react";

/* ── Notes — same color + shape system as ChladniVisualizer ── */

const ALL_NOTES = [
  { note: "C",  freq: 261.63, color: "#FF3333", shape: "Cross",   path: "M50,20 L50,80 M20,50 L80,50" },
  { note: "D",  freq: 293.66, color: "#FF8C00", shape: "Diamond", path: "M50,15 L80,50 L50,85 L20,50 Z" },
  { note: "E",  freq: 329.63, color: "#FFD700", shape: "Star",    path: "M50,10 L61,40 L92,40 L67,58 L77,89 L50,70 L23,89 L33,58 L8,40 L39,40 Z" },
  { note: "F",  freq: 349.23, color: "#00CC66", shape: "Lines",   path: "M20,30 L80,30 M20,50 L80,50 M20,70 L80,70" },
  { note: "G",  freq: 392.0,  color: "#00BFFF", shape: "Wave",    path: "M10,50 Q25,20 40,50 Q55,80 70,50 Q85,20 90,50" },
  { note: "A",  freq: 440.0,  color: "#4169E1", shape: "Flower",  path: "M50,50 m-20,0 a20,20 0 1,0 40,0 a20,20 0 1,0 -40,0 M50,50 m0,-25 a10,25 0 1,0 0,50 a10,25 0 1,0 0,-50 M50,50 m-25,0 a25,10 0 1,0 50,0 a25,10 0 1,0 -50,0" },
  { note: "B",  freq: 493.88, color: "#8B5CF6", shape: "Grid",    path: "M30,20 L30,80 M50,20 L50,80 M70,20 L70,80 M20,35 L80,35 M20,50 L80,50 M20,65 L80,65" },
  { note: "C²", freq: 523.25, color: "#E040FB", shape: "Jewel",   path: "M50,10 L75,35 L75,65 L50,90 L25,65 L25,35 Z M50,25 L65,40 L65,60 L50,75 L35,60 L35,40 Z" },
] as const;

type Note = (typeof ALL_NOTES)[number];

/* ── Web Audio synthesis — same approach as XylophoneKeys ── */

function playNote(ctx: AudioContext, freq: number, duration = 1.2) {
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.type = "triangle";
  osc1.frequency.setValueAtTime(freq, now);
  gain1.gain.setValueAtTime(0.35, now);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + duration);
  osc1.start(now);
  osc1.stop(now + duration);

  // Overtone for richness
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(freq * 2, now);
  gain2.gain.setValueAtTime(0.07, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.5);
  osc2.start(now);
  osc2.stop(now + duration * 0.5);
}

/* ── Pick 4 random choices including the answer ── */

function pickChoices(answer: Note): Note[] {
  const others = ALL_NOTES.filter((n) => n.note !== answer.note);
  const shuffled = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
  const all = [...shuffled, answer].sort(() => Math.random() - 0.5);
  return all;
}

/* ── Shape SVG ── */

function NoteShape({
  note,
  size = 100,
  animate = false,
  dim = false,
}: {
  note: Note;
  size?: number;
  animate?: boolean;
  dim?: boolean;
}) {
  return (
    <div
      className="relative flex items-center justify-center rounded-full transition-all duration-300"
      style={{
        width: size,
        height: size,
        background: dim
          ? `${note.color}22`
          : `radial-gradient(circle, ${note.color}55 0%, ${note.color}11 70%)`,
        boxShadow: animate ? `0 0 40px ${note.color}88` : "none",
        transform: animate ? "scale(1.05)" : "scale(1)",
      }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size * 0.6}
        height={size * 0.6}
        style={{ opacity: dim ? 0.3 : 1 }}
      >
        <path
          d={note.path}
          stroke={note.color}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/* ── Pulse ring animation (CSS) ── */

function PulseRing({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[0, 150, 300].map((delay) => (
        <div
          key={delay}
          className="absolute rounded-full border-2"
          style={{
            width: 160,
            height: 160,
            borderColor: color,
            animation: `pingOut 1.2s ease-out ${delay}ms infinite`,
            opacity: 0,
          }}
        />
      ))}
      <style>{`
        @keyframes pingOut {
          0%   { transform: scale(0.8); opacity: 0.7; }
          100% { transform: scale(2);   opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ── Game state ── */

type Phase = "idle" | "playing" | "guessing" | "correct" | "wrong";

const STREAK_WIN = 5;

export function SoundDetective() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [answer, setAnswer] = useState<Note>(ALL_NOTES[0]);
  const [choices, setChoices] = useState<Note[]>([]);
  const [streak, setStreak] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [wrongNote, setWrongNote] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const startRound = useCallback(() => {
    const picked = ALL_NOTES[Math.floor(Math.random() * ALL_NOTES.length)];
    const pickedChoices = pickChoices(picked);
    setAnswer(picked);
    setChoices(pickedChoices);
    setWrongNote(null);
    setPhase("playing");

    const ctx = getCtx();
    playNote(ctx, picked.freq, 1.5);

    // After note fades, show choices
    timerRef.current = setTimeout(() => setPhase("guessing"), 1600);
  }, [getCtx]);

  const handleGuess = useCallback(
    (guessed: Note) => {
      if (phase !== "guessing") return;
      if (guessed.note === answer.note) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        setTotalCorrect((t) => t + 1);
        setPhase("correct");
        // Play the note again as reward
        const ctx = getCtx();
        playNote(ctx, answer.freq, 0.8);
        // Brief pause then next round (or win screen)
        timerRef.current = setTimeout(() => {
          if (newStreak >= STREAK_WIN) {
            setPhase("idle"); // reset to win screen
          } else {
            startRound();
          }
        }, 900);
      } else {
        setWrongNote(guessed.note);
        setPhase("wrong");
        // Replay after short delay
        timerRef.current = setTimeout(() => {
          const ctx = getCtx();
          playNote(ctx, answer.freq, 1.2);
          setWrongNote(null);
          setPhase("guessing");
        }, 700);
      }
    },
    [phase, answer, streak, getCtx, startRound],
  );

  const handleReplay = useCallback(() => {
    if (phase !== "guessing") return;
    const ctx = getCtx();
    playNote(ctx, answer.freq, 1.2);
  }, [phase, answer, getCtx]);

  const handleReset = useCallback(() => {
    setStreak(0);
    setPhase("idle");
  }, []);

  /* ── Win screen ── */
  if (phase === "idle" && streak >= STREAK_WIN) {
    return (
      <div className="flex flex-col items-center gap-6 py-12 px-6 text-center">
        <div className="text-6xl animate-bounce">🏆</div>
        <p className="text-2xl font-bold text-[#1a1a2e]">Amazing!</p>
        <p className="text-[#8a7e70] text-base">
          {streak} in a row! Your ears are incredible.
        </p>
        <p className="text-sm text-[#8a7e70]">{totalCorrect} total correct</p>
        <button
          onClick={() => { setStreak(0); startRound(); }}
          className="mt-2 px-8 py-3 rounded-2xl text-white font-bold text-lg border-none cursor-pointer active:scale-95 transition-transform"
          style={{ background: "linear-gradient(135deg, #E8610A, #c44f08)" }}
        >
          Play again
        </button>
      </div>
    );
  }

  /* ── Idle / start screen ── */
  if (phase === "idle") {
    return (
      <div className="flex flex-col items-center gap-8 py-10 px-6 text-center">
        {/* Preview of all shapes */}
        <div className="flex flex-wrap justify-center gap-3 max-w-xs">
          {ALL_NOTES.map((n) => (
            <NoteShape key={n.note} note={n} size={52} dim />
          ))}
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-xl font-bold text-[#1a1a2e]">Sound Detective</p>
          <p className="text-sm text-[#8a7e70] max-w-[260px] leading-relaxed">
            Listen to a sound. Then find the shape that matches what you heard.
          </p>
        </div>
        {totalCorrect > 0 && (
          <p className="text-xs text-[#8a7e70]">{totalCorrect} found so far</p>
        )}
        <button
          onClick={startRound}
          className="px-10 py-4 rounded-3xl text-white font-bold text-lg border-none cursor-pointer active:scale-95 transition-transform shadow-lg"
          style={{ background: "linear-gradient(135deg, #E8610A, #c44f08)" }}
        >
          Start listening
        </button>
      </div>
    );
  }

  /* ── Playing phase — show visual + pulsing ── */
  if (phase === "playing") {
    return (
      <div className="flex flex-col items-center gap-8 py-10 px-6 text-center">
        <p className="text-sm font-semibold text-[#8a7e70] uppercase tracking-widest">
          Listen...
        </p>
        <div className="relative flex items-center justify-center">
          <PulseRing color={answer.color} />
          <NoteShape note={answer} size={160} animate />
        </div>
        <p className="text-sm text-[#8a7e70]">What shape does that sound make?</p>
      </div>
    );
  }

  /* ── Guessing phase — 4 choices ── */
  if (phase === "guessing" || phase === "wrong") {
    return (
      <div className="flex flex-col items-center gap-6 py-6 px-4 w-full max-w-sm">
        {/* Dimmed shape reminder */}
        <div className="flex flex-col items-center gap-2">
          <div className="opacity-40">
            <NoteShape note={answer} size={80} />
          </div>
          <p className="text-xs text-[#8a7e70]">What shape did you hear?</p>
        </div>

        {/* Replay button */}
        <button
          onClick={handleReplay}
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#f0e6d6] text-[#8a7e70] text-sm font-semibold border-none cursor-pointer active:scale-95 transition-transform"
        >
          <span>🔊</span> Hear it again
        </button>

        {/* 4 choice buttons */}
        <div className="grid grid-cols-2 gap-3 w-full">
          {choices.map((c) => {
            const isWrong = wrongNote === c.note;
            return (
              <button
                key={c.note}
                onClick={() => handleGuess(c)}
                className="flex flex-col items-center gap-2 p-4 rounded-3xl border-2 cursor-pointer active:scale-95 transition-all duration-100 border-none"
                style={{
                  background: isWrong ? "#FFE5E5" : "white",
                  borderColor: isWrong ? "#FF3333" : "#f0e6d6",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  animation: isWrong ? "shake 0.3s ease" : "none",
                }}
              >
                <NoteShape note={c} size={60} />
                <span className="text-xs font-bold text-[#1a1a2e]">{c.shape}</span>
                <span
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: c.color }}
                >
                  {c.note}
                </span>
              </button>
            );
          })}
        </div>

        {/* Streak badge */}
        {streak > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-[#E8610A] font-bold">
            <span>🔥</span> {streak} in a row
          </div>
        )}

        <style>{`
          @keyframes shake {
            0%,100% { transform: translateX(0); }
            25%      { transform: translateX(-6px); }
            75%      { transform: translateX(6px); }
          }
        `}</style>
      </div>
    );
  }

  /* ── Correct phase ── */
  if (phase === "correct") {
    return (
      <div className="flex flex-col items-center gap-6 py-10 px-6 text-center">
        <div className="text-5xl animate-bounce">⭐</div>
        <NoteShape note={answer} size={120} animate />
        <div className="flex flex-col items-center gap-1">
          <p className="text-xl font-bold text-[#1a1a2e]">
            That was {answer.shape}!
          </p>
          <p className="text-sm text-[#8a7e70]">The note {answer.note}</p>
        </div>
        {streak > 0 && (
          <p className="text-sm text-[#E8610A] font-bold">🔥 {streak} in a row!</p>
        )}
      </div>
    );
  }

  return null;
}
