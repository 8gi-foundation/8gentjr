"use client";

/**
 * VisualSchedule — Vertical list of daily activity cards.
 *
 * - Current activity: glowing border, slightly larger
 * - Past activities: dimmed
 * - Future activities: normal
 * - Auto-scrolls to current activity on mount
 *
 * @see https://github.com/8gi-foundation/8gentjr/issues/9
 */

import React, { useEffect, useRef, useState } from "react";
import { DEFAULT_SCHEDULE, getCurrentActivity, type ScheduleItem } from "@/lib/schedule";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ActivityState = "past" | "current" | "future";

function getActivityState(item: ScheduleItem, currentItem: ScheduleItem | null): ActivityState {
  if (!currentItem) {
    // If no current activity, compare against now
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    return hour >= item.endHour ? "past" : "future";
  }
  if (item.startHour === currentItem.startHour) return "current";
  return item.endHour <= currentItem.startHour ? "past" : "future";
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function cardStyle(state: ActivityState): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "16px 20px",
    borderRadius: 16,
    border: "2px solid transparent",
    transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: "default",
  };

  if (state === "current") {
    return {
      ...base,
      border: "2px solid #E8610A",
      boxShadow: "0 0 16px rgba(232, 97, 10, 0.3)",
      transform: "scale(1.03)",
    };
  }

  if (state === "past") {
    return {
      ...base,
      opacity: 0.45,
      filter: "grayscale(0.3)",
    };
  }

  return base; // future — normal
}

const emojiStyle = (state: ActivityState): React.CSSProperties => ({
  fontSize: state === "current" ? 40 : 32,
  lineHeight: 1,
  flexShrink: 0,
  transition: "font-size 200ms cubic-bezier(0.4, 0, 0.2, 1)",
});

const nameStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: "#1a1a2e",
  margin: 0,
};

const timeStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#6B7280",
  margin: 0,
  fontWeight: 500,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface VisualScheduleProps {
  schedule?: ScheduleItem[];
}

export default function VisualSchedule({ schedule = DEFAULT_SCHEDULE }: VisualScheduleProps) {
  const currentRef = useRef<HTMLDivElement>(null);
  const [currentItem, setCurrentItem] = useState<ScheduleItem | null>(null);

  // Determine current activity on mount
  useEffect(() => {
    setCurrentItem(getCurrentActivity(schedule));
  }, [schedule]);

  // Auto-scroll to current activity once it's identified
  useEffect(() => {
    if (currentRef.current) {
      currentRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentItem]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        width: "100%",
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      {schedule.map((item) => {
        const state = getActivityState(item, currentItem);
        return (
          <div
            key={item.name}
            ref={state === "current" ? currentRef : undefined}
            style={{
              ...cardStyle(state),
              background: item.color,
            }}
            aria-current={state === "current" ? "true" : undefined}
            role="listitem"
          >
            <span style={emojiStyle(state)} aria-hidden="true">
              {item.emoji}
            </span>
            <div>
              <p style={nameStyle}>{item.name}</p>
              <p style={timeStyle}>{item.timeRange}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
