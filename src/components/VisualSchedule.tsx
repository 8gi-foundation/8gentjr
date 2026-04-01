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
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    return hour >= item.endHour ? "past" : "future";
  }
  if (item.startHour === currentItem.startHour) return "current";
  return item.endHour <= currentItem.startHour ? "past" : "future";
}

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
    <div className="flex flex-col gap-3 w-full max-w-[480px] mx-auto">
      {schedule.map((item) => {
        const state = getActivityState(item, currentItem);
        return (
          <div
            key={item.name}
            ref={state === "current" ? currentRef : undefined}
            className={`flex items-center gap-4 py-4 px-5 rounded-2xl border-2 transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              state === "current"
                ? "border-[#E8610A] shadow-[0_0_16px_rgba(232,97,10,0.3)] scale-[1.03]"
                : state === "past"
                  ? "border-transparent opacity-[0.45] grayscale-[0.3]"
                  : "border-transparent"
            }`}
            style={{ background: item.color }}
            aria-current={state === "current" ? "true" : undefined}
            role="listitem"
          >
            <span
              className={`leading-none shrink-0 transition-[font-size] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                state === "current" ? "text-[40px]" : "text-[32px]"
              }`}
              aria-hidden="true"
            >
              {item.emoji}
            </span>
            <div>
              <p className="text-lg font-bold text-[#1a1a2e] m-0">{item.name}</p>
              <p className="text-sm text-gray-500 m-0 font-medium">{item.timeRange}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
