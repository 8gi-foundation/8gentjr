"use client";

/**
 * Analytics — Usage stats and progress dashboard
 *
 * Pure CSS visuals (no charting library). Uses theme tokens for
 * the child-friendly warm aesthetic.
 *
 * @see https://github.com/8gi-foundation/8gentjr/issues/24
 */

import React, { useEffect, useState } from "react";
import { getSessionStats, clearOldLogs, type SessionStats } from "@/lib/session-logger";
import { colors, borderRadius, shadows, fonts, spacing } from "@/styles/theme";

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
    trend === "up" ? colors.success : trend === "down" ? colors.danger : colors.textMuted;

  return (
    <div
      style={{
        flex: "1 1 140px",
        minWidth: 140,
        background: colors.surface,
        borderRadius: borderRadius.default,
        boxShadow: shadows.card,
        padding: spacing.lg,
        display: "flex",
        flexDirection: "column",
        gap: spacing.xs,
      }}
    >
      <span
        style={{
          fontSize: fonts.sizeSmall,
          fontWeight: fonts.weightMedium,
          color: colors.textMuted,
          textTransform: "uppercase" as const,
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "baseline", gap: spacing.sm }}>
        <span
          style={{
            fontSize: 32,
            fontWeight: fonts.weightExtrabold,
            color,
          }}
        >
          {value}
        </span>
        {arrow && (
          <span style={{ fontSize: fonts.sizeSmall, color: arrowColor }}>{arrow}</span>
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
      <p style={{ color: colors.textMuted, fontSize: fonts.sizeBody }}>
        No word data yet. Start using the AAC board to see stats here.
      </p>
    );
  }

  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
      {items.map((item) => (
        <div
          key={item.word}
          style={{
            display: "flex",
            alignItems: "center",
            gap: spacing.md,
          }}
        >
          <span
            style={{
              width: 80,
              fontSize: fonts.sizeBody,
              fontWeight: fonts.weightSemibold,
              color: colors.text,
              textAlign: "right",
              flexShrink: 0,
            }}
          >
            {item.word}
          </span>
          <div
            style={{
              flex: 1,
              height: 28,
              background: colors.border,
              borderRadius: borderRadius.small,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(item.count / max) * 100}%`,
                height: "100%",
                background: colors.primary,
                borderRadius: borderRadius.small,
                transition: "width 400ms cubic-bezier(0.4, 0, 0.2, 1)",
                minWidth: 4,
              }}
            />
          </div>
          <span
            style={{
              width: 36,
              fontSize: fonts.sizeSmall,
              color: colors.textMuted,
              textAlign: "left",
              flexShrink: 0,
            }}
          >
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
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: spacing.xl,
        fontFamily: fonts.family,
      }}
    >
      {/* Header */}
      <h1
        style={{
          fontSize: 28,
          fontWeight: fonts.weightExtrabold,
          color: colors.text,
          marginBottom: spacing.xs,
        }}
      >
        Progress
      </h1>
      <p
        style={{
          fontSize: fonts.sizeBody,
          color: colors.textMuted,
          marginBottom: spacing.xl,
        }}
      >
        See how much you have been communicating. Keep it up!
      </p>

      {/* Stat Cards */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: spacing.md,
          marginBottom: spacing.xl,
        }}
      >
        <StatCard
          label="Words Today"
          value={stats.totalWords}
          trend={stats.totalWords > 0 ? "up" : "flat"}
          color={colors.primary}
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
          color={colors.success}
        />
        <StatCard
          label="Streak"
          value={stats.streakDays}
          trend={stats.streakDays > 1 ? "up" : "flat"}
          color="#F59E0B"
        />
      </div>

      {/* Top Words */}
      <h2
        style={{
          fontSize: fonts.sizeHeading,
          fontWeight: fonts.weightBold,
          color: colors.text,
          marginBottom: spacing.md,
        }}
      >
        Top 5 Words
      </h2>
      <div
        style={{
          background: colors.surface,
          borderRadius: borderRadius.default,
          boxShadow: shadows.card,
          padding: spacing.lg,
        }}
      >
        <BarChart items={stats.topWords} />
      </div>
    </div>
  );
}
