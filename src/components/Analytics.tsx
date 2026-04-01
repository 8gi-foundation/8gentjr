"use client";

/**
 * Analytics — Usage stats and progress dashboard
 *
 * Tailwind CSS visuals (no charting library).
 *
 * @see https://github.com/8gi-foundation/8gentjr/issues/24
 */

import React, { useEffect, useState } from "react";
import { getSessionStats, clearOldLogs, type SessionStats } from "@/lib/session-logger";

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: number;
  trend?: "up" | "down" | "flat";
  color: string;
}

function StatCard({ label, value, trend = "flat", color }: StatCardProps) {
  const arrow = trend === "up" ? "\u25B2" : trend === "down" ? "\u25BC" : "";
  const arrowColor =
    trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-600" : "text-gray-400";

  return (
    <div className="flex-[1_1_140px] min-w-[140px] bg-[#FFF1E6] rounded-2xl shadow-[0_2px_12px_rgba(232,97,10,0.08)] p-6 flex flex-col gap-1">
      <span className="text-[13px] font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span className="text-[32px] font-extrabold" style={{ color }}>
          {value}
        </span>
        {arrow && (
          <span className={`text-[13px] ${arrowColor}`}>{arrow}</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bar Chart (CSS-only)
// ---------------------------------------------------------------------------

function BarChart({ items }: { items: { word: string; count: number }[] }) {
  if (items.length === 0) {
    return (
      <p className="text-gray-500 text-base">
        No word data yet. Start using the AAC board to see stats here.
      </p>
    );
  }

  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div key={item.word} className="flex items-center gap-4">
          <span className="w-20 text-base font-semibold text-[#1a1a2e] text-right shrink-0">
            {item.word}
          </span>
          <div className="flex-1 h-7 bg-[#F0DECA] rounded-xl overflow-hidden">
            <div
              className="h-full bg-[#E8610A] rounded-xl transition-[width] duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-w-1"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
          <span className="w-9 text-[13px] text-gray-500 text-left shrink-0">
            {item.count}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analytics Dashboard
// ---------------------------------------------------------------------------

export default function Analytics() {
  const [stats, setStats] = useState<SessionStats | null>(null);

  useEffect(() => {
    clearOldLogs(30);
    setStats(getSessionStats());
  }, []);

  if (!stats) return null;

  return (
    <div className="max-w-[720px] mx-auto p-8 font-sans">
      {/* Header */}
      <h1 className="text-[28px] font-extrabold text-[#1a1a2e] mb-1">
        Progress
      </h1>
      <p className="text-base text-gray-500 mb-8">
        See how much you have been communicating. Keep it up!
      </p>

      {/* Stat Cards */}
      <div className="flex flex-wrap gap-4 mb-8">
        <StatCard
          label="Words Today"
          value={stats.totalWords}
          trend={stats.totalWords > 0 ? "up" : "flat"}
          color="#E8610A"
        />
        <StatCard
          label="Unique Words"
          value={stats.uniqueWords}
          trend={stats.uniqueWords > 10 ? "up" : "flat"}
          color="#6366F1"
        />
        <StatCard
          label="Sessions This Week"
          value={stats.sessionsThisWeek}
          trend={stats.sessionsThisWeek > 0 ? "up" : "flat"}
          color="#059669"
        />
        <StatCard
          label="Streak"
          value={stats.streakDays}
          trend={stats.streakDays > 1 ? "up" : "flat"}
          color="#F59E0B"
        />
      </div>

      {/* Top Words */}
      <h2 className="text-xl font-bold text-[#1a1a2e] mb-4">
        Top 5 Words
      </h2>
      <div className="bg-[#FFF1E6] rounded-2xl shadow-[0_2px_12px_rgba(232,97,10,0.08)] p-6">
        <BarChart items={stats.topWords} />
      </div>
    </div>
  );
}
