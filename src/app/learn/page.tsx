"use client";

/**
 * /learn — Nick's Learning OS
 *
 * Four subject cards with XP levels, today's plan with checkable tasks,
 * Talk to Eight chat interface, achievements grid, and focus mode.
 *
 * Light theme, child-friendly, App Store screenshot quality.
 * Amber/blue/green/teal palette — no purple/pink/violet (hues 270-350 banned).
 */

import { useState } from "react";
import Link from "next/link";

// ─── Data ────────────────────────────────────────────────────────────────────

const SUBJECTS = [
  {
    id: "maths",
    icon: "🔢",
    name: "Maths",
    level: 4,
    rank: "Explorer",
    xp: 650,
    xpMax: 1000,
    color: "#2563EB",       // blue-600
    bgColor: "#EFF6FF",     // blue-50
    borderColor: "#BFDBFE", // blue-200
  },
  {
    id: "reading",
    icon: "📖",
    name: "Reading",
    level: 5,
    rank: "Champion",
    xp: 800,
    xpMax: 1000,
    color: "#059669",       // emerald-600
    bgColor: "#ECFDF5",     // emerald-50
    borderColor: "#A7F3D0", // emerald-200
  },
  {
    id: "world",
    icon: "🌍",
    name: "World",
    level: 3,
    rank: "Discoverer",
    xp: 400,
    xpMax: 1000,
    color: "#0891B2",       // cyan-600
    bgColor: "#ECFEFF",     // cyan-50
    borderColor: "#A5F3FC", // cyan-200
  },
  {
    id: "create",
    icon: "🎨",
    name: "Create",
    level: 6,
    rank: "Master",
    xp: 900,
    xpMax: 1000,
    color: "#D97706",       // amber-600
    bgColor: "#FFFBEB",     // amber-50
    borderColor: "#FDE68A", // amber-200
  },
];

type Subject = {
  id: string;
  icon: string;
  name: string;
  level: number;
  rank: string;
  xp: number;
  xpMax: number;
  color: string;
  bgColor: string;
  borderColor: string;
};

interface Task {
  id: string;
  label: string;
  xp: number;
  done: boolean;
}

const INITIAL_BRAIN_TASKS: Task[] = [
  { id: "b1", label: "Number patterns - skip counting by 5s", xp: 50, done: true },
  { id: "b2", label: "Word builder - 5-letter words", xp: 40, done: false },
  { id: "b3", label: "Map explorer - Find 3 countries", xp: 60, done: false },
];

const INITIAL_FOCUS_TASKS: Task[] = [
  { id: "f1", label: "Build a story with 3 characters", xp: 80, done: false },
  { id: "f2", label: "Draw what you dreamed last night", xp: 30, done: true },
  { id: "f3", label: "Read 5 pages of your book", xp: 50, done: false },
];

interface Achievement {
  id: string;
  icon: string;
  name: string;
  unlocked: boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: "a1", icon: "🔥", name: "7-Day Streak", unlocked: true },
  { id: "a2", icon: "🧠", name: "Deep Thinker", unlocked: true },
  { id: "a3", icon: "📚", name: "Bookworm", unlocked: true },
  { id: "a4", icon: "⚡", name: "Speed Run", unlocked: false },
  { id: "a5", icon: "🌟", name: "Star Learner", unlocked: false },
  { id: "a6", icon: "🏆", name: "All Complete", unlocked: false },
  { id: "a7", icon: "🦁", name: "Brave Solver", unlocked: false },
  { id: "a8", icon: "🌈", name: "Creative Mind", unlocked: false },
];

interface ChatMessage {
  role: "eight" | "nick";
  text: string;
}

const INITIAL_CHAT: ChatMessage[] = [
  {
    role: "eight",
    text: "Hey Nick! I noticed you're really good at patterns. Want to try something that will make your brain feel like a supercomputer? 🚀",
  },
  {
    role: "nick",
    text: "yes!! what is it",
  },
  {
    role: "eight",
    text: "It's called the Fibonacci sequence - each number is the sum of the two before it: 1, 1, 2, 3, 5, 8... try to figure out the next 3! Take your time, there's no rush. 🌟",
  },
];

const QUICK_REPLIES: Record<string, string> = {
  "I think I got it! 🎉":
    "Amazing!! 🎉 So the answer is 13, 21, 34! You're already thinking like a mathematician. Your brain is seriously powerful.",
  "Can you give me a hint?":
    "Of course! Look at the last two numbers: 5 and 8. What do you get when you add them together? That's your next number! 💡",
  "Show me step by step":
    "Let's go slow - no rush! 1+1=2, then 1+2=3, then 2+3=5, then 3+5=8... see the pattern? Each pair adds up to the next one. You've got this! ⭐",
  "I need a break first":
    "Totally fine! Take all the time you need. Your brain works best when it's rested. Want to play a quick calm game first? 🌿",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SubjectCard({ subject }: { subject: Subject }) {
  const [active, setActive] = useState(false);
  const pct = Math.round((subject.xp / subject.xpMax) * 100);

  return (
    <button
      onClick={() => setActive((v) => !v)}
      aria-pressed={active}
      aria-label={`${subject.name} - Level ${subject.level} ${subject.rank}, ${subject.xp} of ${subject.xpMax} XP`}
      className="rounded-2xl border-2 p-4 text-center ios-press cursor-pointer transition-all duration-150 w-full"
      style={{
        backgroundColor: active ? subject.bgColor : "#FFFFFF",
        borderColor: active ? subject.color : "var(--warm-border)",
        boxShadow: active ? `0 4px 14px ${subject.color}22` : undefined,
      }}
    >
      <div className="text-3xl mb-2" aria-hidden="true">
        {subject.icon}
      </div>
      <div className="text-sm font-bold text-[var(--warm-text)] mb-0.5">
        {subject.name}
      </div>
      <div className="text-xs text-[var(--warm-text-muted)] mb-2">
        Level {subject.level} · {subject.rank}
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={subject.xp}
        aria-valuemin={0}
        aria-valuemax={subject.xpMax}
        aria-label={`${subject.xp} of ${subject.xpMax} XP`}
        style={{ backgroundColor: "#F3F4F6" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: subject.color }}
        />
      </div>
      <div className="text-xs text-[var(--warm-text-muted)] mt-1.5">
        {subject.xp} / {subject.xpMax} XP
      </div>
    </button>
  );
}

function TaskItem({
  task,
  onToggle,
}: {
  task: Task;
  onToggle: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onToggle(task.id)}
      aria-pressed={task.done}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 w-full text-left ios-press-light transition-all duration-100"
      style={{
        backgroundColor: task.done ? "#F0FDF4" : "#FFFFFF",
        borderColor: task.done ? "#BBF7D0" : "var(--warm-border)",
      }}
    >
      <span
        className="flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center text-xs font-bold"
        aria-hidden="true"
        style={{
          backgroundColor: task.done ? "#10B981" : "transparent",
          borderColor: task.done ? "#10B981" : "var(--warm-border)",
          color: "#FFFFFF",
        }}
      >
        {task.done ? "✓" : ""}
      </span>
      <span
        className="flex-1 text-xs leading-snug"
        style={{
          color: task.done ? "#059669" : "var(--warm-text)",
          textDecoration: task.done ? "line-through" : "none",
        }}
      >
        {task.label}
      </span>
      <span
        className="text-xs font-bold flex-shrink-0"
        style={{ color: "#D97706" }}
        aria-label={`${task.xp} XP reward`}
      >
        +{task.xp} XP
      </span>
    </button>
  );
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isEight = msg.role === "eight";
  return (
    <div className={`flex ${isEight ? "justify-start" : "justify-end"}`}>
      <p
        className="max-w-[80%] px-4 py-2.5 text-sm leading-relaxed rounded-2xl"
        style={
          isEight
            ? {
                backgroundColor: "#EFF6FF",
                color: "var(--warm-text)",
                borderRadius: "14px 14px 14px 4px",
              }
            : {
                backgroundColor: "#2563EB",
                color: "#FFFFFF",
                borderRadius: "14px 14px 4px 14px",
              }
        }
      >
        {msg.text}
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LearnPage() {
  const [started, setStarted] = useState(false);
  const [brainTasks, setBrainTasks] = useState(INITIAL_BRAIN_TASKS);
  const [focusTasks, setFocusTasks] = useState(INITIAL_FOCUS_TASKS);
  const [chat, setChat] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [focusOn, setFocusOn] = useState(false);
  const [activeNav, setActiveNav] = useState("Learn");

  const navItems = ["Home", "Learn", "Games", "Talk", "My World"];
  const navRoutes: Record<string, string> = {
    Home: "/talk",
    Learn: "/learn",
    Games: "/games",
    Talk: "/talk",
    "My World": "/",
  };

  function toggleBrainTask(id: string) {
    setBrainTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }

  function toggleFocusTask(id: string) {
    setFocusTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }

  function sendQuickReply(text: string) {
    const reply = QUICK_REPLIES[text];
    if (!reply) return;
    setChat((prev) => [
      ...prev,
      { role: "nick", text },
      { role: "eight", text: reply },
    ]);
  }

  const brainDone = brainTasks.filter((t) => t.done).length;
  const focusDone = focusTasks.filter((t) => t.done).length;

  return (
    <div
      className="min-h-dvh pb-safe-dock"
      style={{ backgroundColor: "var(--brand-bg-warm)" }}
    >
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-4 h-14 border-b-2"
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: "var(--warm-border)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2" aria-label="8gent Jr">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
            style={{
              background: "linear-gradient(135deg, #2563EB, #0891B2)",
            }}
            aria-hidden="true"
          >
            🤖
          </div>
          <span className="text-base font-extrabold tracking-tight">
            <span style={{ color: "var(--warm-text)" }}>8gent </span>
            <span style={{ color: "#2563EB" }}>Jr</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="hidden sm:flex gap-1" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item}
              href={navRoutes[item] ?? "/"}
              onClick={() => setActiveNav(item)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-100"
              style={{
                backgroundColor:
                  activeNav === item ? "#EFF6FF" : "transparent",
                color:
                  activeNav === item ? "#2563EB" : "var(--warm-text-muted)",
              }}
              aria-current={activeNav === item ? "page" : undefined}
            >
              {item}
            </Link>
          ))}
        </nav>

        {/* Streak + avatar */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border"
            style={{
              backgroundColor: "#FFFBEB",
              borderColor: "#FCD34D",
              color: "#B45309",
            }}
            aria-label="7-day streak"
          >
            🔥 7 days
          </div>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{
              background: "linear-gradient(135deg, #2563EB, #0891B2)",
            }}
            aria-label="Nick's avatar"
          >
            N
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section
        className="px-4 py-7 flex items-center justify-between gap-4"
        style={{
          background: "linear-gradient(135deg, #EFF6FF 0%, #ECFEFF 50%, #ECFDF5 100%)",
        }}
        aria-labelledby="hero-greeting"
      >
        <div className="flex-1">
          <h1
            id="hero-greeting"
            className="text-2xl font-extrabold leading-tight"
            style={{ color: "var(--warm-text)" }}
          >
            Good morning,{" "}
            <span style={{ color: "#2563EB" }}>Nick</span>! 👋
          </h1>
          <p className="text-sm mt-1.5" style={{ color: "var(--warm-text-muted)" }}>
            You have 3 fun things to do today. Your brain is going to love this.
          </p>
          <div className="mt-4 flex gap-2 flex-wrap">
            <button
              onClick={() => setStarted(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white ios-press transition-all duration-150"
              style={{
                backgroundColor: started ? "#059669" : "#2563EB",
              }}
              aria-label={started ? "Day started" : "Start your learning day"}
            >
              {started ? "⭐ You started!" : "Let's go! 🚀"}
            </button>
            <button
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border-2 ios-press"
              style={{
                backgroundColor: "#FFFFFF",
                borderColor: "var(--warm-border)",
                color: "var(--warm-text)",
              }}
            >
              What's new?
            </button>
          </div>
        </div>
        <div
          className="text-7xl select-none"
          aria-hidden="true"
          style={{ animation: "float 3s ease-in-out infinite" }}
        >
          🧠
        </div>
      </section>

      {/* ── Main content ────────────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-4 py-5 flex flex-col gap-6">

        {/* Subjects */}
        <section aria-labelledby="subjects-heading">
          <h2
            id="subjects-heading"
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "var(--warm-text-muted)" }}
          >
            Your subjects
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SUBJECTS.map((subject) => (
              <SubjectCard key={subject.id} subject={subject} />
            ))}
          </div>
        </section>

        {/* Today's Plan */}
        <section aria-labelledby="plan-heading">
          <h2
            id="plan-heading"
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "var(--warm-text-muted)" }}
          >
            Today's plan
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Brain Challenges */}
            <div
              className="rounded-2xl border-2 p-4"
              style={{
                backgroundColor: "#FFFFFF",
                borderColor: "var(--warm-border)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl" aria-hidden="true">🧩</span>
                <div>
                  <div className="text-sm font-bold" style={{ color: "var(--warm-text)" }}>
                    Brain Challenges
                  </div>
                  <div className="text-xs" style={{ color: "var(--warm-text-muted)" }}>
                    {brainDone}/{brainTasks.length} done · ~20 min
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {brainTasks.map((task) => (
                  <TaskItem key={task.id} task={task} onToggle={toggleBrainTask} />
                ))}
              </div>
            </div>

            {/* Focus Time */}
            <div
              className="rounded-2xl border-2 p-4"
              style={{
                backgroundColor: "#FFFFFF",
                borderColor: "var(--warm-border)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl" aria-hidden="true">🎯</span>
                <div>
                  <div className="text-sm font-bold" style={{ color: "var(--warm-text)" }}>
                    Focus Time
                  </div>
                  <div className="text-xs" style={{ color: "var(--warm-text-muted)" }}>
                    {focusDone}/{focusTasks.length} done · ~15 min
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {focusTasks.map((task) => (
                  <TaskItem key={task.id} task={task} onToggle={toggleFocusTask} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Talk to Eight */}
        <section aria-labelledby="chat-heading">
          <h2
            id="chat-heading"
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "var(--warm-text-muted)" }}
          >
            Talk to Eight
          </h2>
          <div
            className="rounded-2xl border-2 p-4"
            style={{
              backgroundColor: "#FFFFFF",
              borderColor: "var(--warm-border)",
            }}
          >
            {/* Eight header */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #2563EB, #0891B2)" }}
                aria-hidden="true"
              >
                8
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: "var(--warm-text)" }}>
                  Eight - your learning friend
                </div>
                <div
                  className="text-xs flex items-center gap-1.5"
                  style={{ color: "#10B981" }}
                  aria-label="Eight is ready to help"
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: "#10B981" }}
                    aria-hidden="true"
                  />
                  Ready to help
                </div>
              </div>
            </div>

            {/* Chat bubbles */}
            <div
              className="flex flex-col gap-3 mb-4 max-h-64 overflow-y-auto no-scrollbar"
              role="log"
              aria-live="polite"
              aria-label="Chat with Eight"
            >
              {chat.map((msg, i) => (
                <ChatBubble key={i} msg={msg} />
              ))}
            </div>

            {/* Quick replies */}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Quick replies">
              {Object.keys(QUICK_REPLIES).map((label) => (
                <button
                  key={label}
                  onClick={() => sendQuickReply(label)}
                  className="px-3 py-1.5 rounded-full text-xs border-2 ios-press-light transition-all duration-100"
                  style={{
                    backgroundColor: "#F0F7FF",
                    borderColor: "var(--warm-border)",
                    color: "var(--warm-text)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Achievements */}
        <section aria-labelledby="achievements-heading">
          <h2
            id="achievements-heading"
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "var(--warm-text-muted)" }}
          >
            Achievements
          </h2>
          <div
            className="flex gap-3 overflow-x-auto no-scrollbar pb-1"
            role="list"
          >
            {ACHIEVEMENTS.map((ach) => (
              <div
                key={ach.id}
                role="listitem"
                className="flex-shrink-0 rounded-2xl border-2 p-3 text-center min-w-[80px]"
                style={{
                  backgroundColor: ach.unlocked ? "#FFFBEB" : "#FFFFFF",
                  borderColor: ach.unlocked ? "#FCD34D" : "var(--warm-border)",
                  opacity: ach.unlocked ? 1 : 0.4,
                  filter: ach.unlocked ? "none" : "grayscale(1)",
                }}
                aria-label={`${ach.name}${ach.unlocked ? " - unlocked" : " - locked"}`}
              >
                <div className="text-2xl mb-1" aria-hidden="true">
                  {ach.icon}
                </div>
                <div
                  className="text-xs font-bold leading-tight"
                  style={{ color: "var(--warm-text)" }}
                >
                  {ach.name}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Focus Mode */}
        <section aria-labelledby="focus-heading">
          <div
            className="rounded-2xl border-2 p-4 flex items-center gap-4"
            style={{
              background: "linear-gradient(135deg, #EFF6FF, #ECFEFF)",
              borderColor: "#BFDBFE",
            }}
          >
            <div className="text-4xl flex-shrink-0" aria-hidden="true">
              🎧
            </div>
            <div className="flex-1 min-w-0">
              <h2
                id="focus-heading"
                className="text-sm font-bold"
                style={{ color: "var(--warm-text)" }}
              >
                Focus Mode - block distractions
              </h2>
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--warm-text-muted)" }}
              >
                Calm music, no notifications, just you and your brain. Nick's favourite: lo-fi beats.
              </p>
            </div>
            <button
              onClick={() => setFocusOn((v) => !v)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-white ios-press transition-all duration-150"
              style={{
                backgroundColor: focusOn ? "#059669" : "#2563EB",
              }}
              aria-pressed={focusOn}
              aria-label={focusOn ? "Focus mode active" : "Start focus mode"}
            >
              {focusOn ? "✓ Focus on!" : "Start focus"}
            </button>
          </div>
        </section>

      </main>

      {/* ── Float animation keyframes ─────────────────────── */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
