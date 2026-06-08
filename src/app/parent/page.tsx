"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";

// ── Static data (v1 hardcoded) ────────────────────────────────────────────────

const CHILD = {
  name: "Nicholas",
  level: 14,
  streak: 12,
  todayXP: 340,
};

const SUBJECTS = [
  {
    id: "maths",
    label: "Maths",
    icon: "🔢",
    xpToday: 90,
    xpGoal: 120,
    color: "bg-amber-400",
    lightBg: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-700",
  },
  {
    id: "reading",
    label: "Reading",
    icon: "📖",
    xpToday: 80,
    xpGoal: 100,
    color: "bg-blue-400",
    lightBg: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
  },
  {
    id: "world",
    label: "World",
    icon: "🌍",
    xpToday: 110,
    xpGoal: 120,
    color: "bg-green-400",
    lightBg: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
  },
  {
    id: "create",
    label: "Create",
    icon: "🎨",
    xpToday: 60,
    xpGoal: 100,
    color: "bg-rose-300",
    lightBg: "bg-rose-50",
    borderColor: "border-rose-200",
    textColor: "text-rose-700",
  },
] as const;

// 12-day streak grid: true = active day, false = missed
// Newest day is index 11
const STREAK_DAYS: boolean[] = [
  true, false, true, true, true, false, true,
  true,  true, true, true,  true,
];

const MILESTONES = [
  { label: "First 100 XP in Maths", unlocked: true, date: "Jun 5" },
  { label: "5-day reading streak", unlocked: true, date: "Jun 6" },
  { label: "Completed World: Animals", unlocked: true, date: "Jun 7" },
  { label: "Reach Level 15", unlocked: false, date: null },
];

const TRANSCRIPT = [
  {
    speaker: "Eight",
    text: "Good morning, Nicholas! Ready to count to 100 together?",
  },
  {
    speaker: "Nicholas",
    text: "Yes! One, two, three...",
  },
  {
    speaker: "Eight",
    text: "Amazing counting! You got all the way to 47 before needing a hint. That is your best yet.",
  },
  {
    speaker: "Nicholas",
    text: "Can we do the animal quiz now?",
  },
];

const NEXT_STEPS = [
  {
    subject: "Maths",
    icon: "🔢",
    task: "Counting to 100 - Part 2",
    priority: "high",
    color: "text-amber-600",
  },
  {
    subject: "Reading",
    icon: "📖",
    task: "Phonics: short-vowel blends",
    priority: "medium",
    color: "text-blue-600",
  },
  {
    subject: "World",
    icon: "🌍",
    task: "Explore: Rainforest Animals",
    priority: "high",
    color: "text-green-600",
  },
  {
    subject: "Create",
    icon: "🎨",
    task: "Draw your favourite animal",
    priority: "low",
    color: "text-rose-500",
  },
];

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-[#E8610A]",
  medium: "bg-amber-400",
  low: "bg-gray-300",
};

// ── Component ─────────────────────────────────────────────────────────────────

function ParentReport() {
  return (
    <main className="flex flex-col min-h-[100dvh] p-4 pb-28 font-sans bg-[#FFF8F0]">

      {/* Header */}
      <header className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-extrabold text-[#E8610A] m-0">
          Parent Report
        </h1>
        <a href="/" className="text-gray-500 no-underline text-sm">
          Back
        </a>
      </header>

      {/* Child summary bar */}
      <section className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 flex items-center justify-between shadow-sm">
        <div>
          <p className="text-base font-bold text-gray-800 m-0">{CHILD.name}</p>
          <p className="text-xs text-gray-500 m-0 mt-0.5">
            Level {CHILD.level} learner
          </p>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-lg font-extrabold text-[#E8610A] m-0 leading-none">
              +{CHILD.todayXP}
            </p>
            <p className="text-[10px] text-gray-400 m-0 mt-0.5">XP today</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-extrabold text-[#E8610A] m-0 leading-none">
              {CHILD.streak}
            </p>
            <p className="text-[10px] text-gray-400 m-0 mt-0.5">day streak</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-extrabold text-[#E8610A] m-0 leading-none">
              {CHILD.level}
            </p>
            <p className="text-[10px] text-gray-400 m-0 mt-0.5">level</p>
          </div>
        </div>
      </section>

      {/* Today's subjects */}
      <section className="mb-4">
        <h2 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
          Today&apos;s Subjects
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {SUBJECTS.map((s) => {
            const pct = Math.round((s.xpToday / s.xpGoal) * 100);
            return (
              <div
                key={s.id}
                className={`${s.lightBg} border ${s.borderColor} rounded-2xl p-3`}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-lg leading-none">{s.icon}</span>
                  <span className={`text-xs font-bold ${s.textColor}`}>
                    {s.label}
                  </span>
                </div>
                <p className={`text-xl font-extrabold ${s.textColor} m-0 leading-none`}>
                  +{s.xpToday} XP
                </p>
                <p className="text-[10px] text-gray-400 m-0 mt-0.5 mb-2">
                  Goal: {s.xpGoal} XP
                </p>
                {/* Progress bar */}
                <div className="h-1.5 bg-white rounded-full overflow-hidden">
                  <div
                    className={`h-full ${s.color} rounded-full transition-all`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 12-day streak calendar */}
      <section className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 shadow-sm">
        <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
          12-Day Streak
        </h2>
        <div className="grid grid-cols-6 gap-1.5">
          {STREAK_DAYS.map((active, i) => (
            <div
              key={i}
              className={`h-8 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                active
                  ? "bg-[#E8610A] text-white"
                  : "bg-gray-100 text-gray-300"
              }`}
            >
              {active ? "★" : "·"}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2 m-0">
          Oldest on left, today on right. Orange = learning day.
        </p>
      </section>

      {/* Milestones */}
      <section className="mb-4">
        <h2 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
          Milestones
        </h2>
        <div className="flex flex-col gap-2">
          {MILESTONES.map((m, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${
                m.unlocked
                  ? "bg-white border-gray-100 shadow-sm"
                  : "bg-gray-50 border-dashed border-gray-200"
              }`}
            >
              <span className="text-xl leading-none">
                {m.unlocked ? "🏅" : "🔒"}
              </span>
              <div className="flex-1">
                <p
                  className={`text-sm font-semibold m-0 ${
                    m.unlocked ? "text-gray-800" : "text-gray-400"
                  }`}
                >
                  {m.label}
                </p>
                {m.date && (
                  <p className="text-[10px] text-gray-400 m-0 mt-0.5">
                    Unlocked {m.date}
                  </p>
                )}
              </div>
              {m.unlocked && (
                <span className="text-[10px] font-bold text-[#E8610A] bg-orange-50 px-2 py-0.5 rounded-full">
                  Done
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Talk to Eight transcript */}
      <section className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 shadow-sm">
        <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
          Talk to Eight - Today&apos;s Session
        </h2>
        <div className="flex flex-col gap-2">
          {TRANSCRIPT.map((line, i) => {
            const isEight = line.speaker === "Eight";
            return (
              <div
                key={i}
                className={`flex gap-2 ${isEight ? "" : "flex-row-reverse"}`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                    isEight
                      ? "bg-[#E8610A] text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {isEight ? "8" : "N"}
                </div>
                <div
                  className={`rounded-2xl px-3 py-2 text-sm max-w-[80%] ${
                    isEight
                      ? "bg-orange-50 text-gray-700 rounded-tl-sm"
                      : "bg-gray-100 text-gray-700 rounded-tr-sm"
                  }`}
                >
                  {line.text}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-400 mt-3 m-0">
          Showing last 4 exchanges from today&apos;s session.
        </p>
      </section>

      {/* Recommended next steps */}
      <section className="mb-4">
        <h2 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
          Recommended Next Steps
        </h2>
        <div className="flex flex-col gap-2">
          {NEXT_STEPS.map((step, i) => (
            <div
              key={i}
              className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3"
            >
              <span className="text-xl leading-none">{step.icon}</span>
              <div className="flex-1">
                <p className={`text-xs font-bold m-0 ${step.color}`}>
                  {step.subject}
                </p>
                <p className="text-sm text-gray-700 m-0 mt-0.5">{step.task}</p>
              </div>
              <div
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  PRIORITY_COLORS[step.priority]
                }`}
                title={`Priority: ${step.priority}`}
              />
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-2">
          Orange dot = high priority, amber = medium, grey = low.
        </p>
      </section>

    </main>
  );
}

// ── Page (Clerk guard) ────────────────────────────────────────────────────────

export default function ParentPage() {
  return (
    <>
      <SignedIn>
        <ParentReport />
      </SignedIn>
      <SignedOut>
        <main className="flex flex-col min-h-[100dvh] items-center justify-center p-8 font-sans bg-[#FFF8F0]">
          <div className="text-center max-w-xs">
            <p className="text-5xl mb-4">🔒</p>
            <h1 className="text-xl font-extrabold text-[#E8610A] mb-2">
              Parent Report
            </h1>
            <p className="text-sm text-gray-600 mb-6">
              This report is only visible to signed-in parents and carers.
            </p>
            <Link
              href="/sign-in"
              className="inline-block bg-[#E8610A] text-white font-bold text-sm px-6 py-3 rounded-full no-underline hover:opacity-90 transition-opacity"
            >
              Sign in to view report
            </Link>
          </div>
        </main>
      </SignedOut>
    </>
  );
}
