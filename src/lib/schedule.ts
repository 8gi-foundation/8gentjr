/**
 * schedule.ts — Daily visual schedule data and helpers for 8gent Jr.
 *
 * Provides a default day schedule with time ranges, emojis, and colors.
 * getCurrentActivity() returns the activity matching the current hour.
 *
 * @see https://github.com/8gi-foundation/8gentjr/issues/9
 */

export interface ScheduleItem {
  name: string;
  emoji: string;
  timeRange: string;
  startHour: number;
  endHour: number;
  color: string;
}

/**
 * Default schedule — covers 7 AM through 8 PM.
 * Colors use warm, child-friendly tints from the design system.
 */
export const DEFAULT_SCHEDULE: ScheduleItem[] = [
  { name: "Morning Routine", emoji: "\u{1F31E}", timeRange: "7:00 - 8:00",  startHour: 7,  endHour: 8,  color: "#FFF3E0" },
  { name: "School",          emoji: "\u{1F4DA}", timeRange: "8:00 - 12:00", startHour: 8,  endHour: 12, color: "#E3F2FD" },
  { name: "Lunch",           emoji: "\u{1F96A}", timeRange: "12:00 - 13:00",startHour: 12, endHour: 13, color: "#E8F5E9" },
  { name: "Play Time",       emoji: "\u{1F3C0}", timeRange: "13:00 - 15:00",startHour: 13, endHour: 15, color: "#F3E5F5" },
  { name: "Snack",           emoji: "\u{1F34E}", timeRange: "15:00 - 15:30",startHour: 15, endHour: 15.5, color: "#FFF3E0" },
  { name: "Dinner",          emoji: "\u{1F35D}", timeRange: "17:00 - 18:00",startHour: 17, endHour: 18, color: "#E8F5E9" },
  { name: "Bath",            emoji: "\u{1F6C1}", timeRange: "18:00 - 18:30",startHour: 18, endHour: 18.5, color: "#E3F2FD" },
  { name: "Bedtime",         emoji: "\u{1F319}", timeRange: "19:00 - 20:00",startHour: 19, endHour: 20, color: "#FCE4EC" },
];

/**
 * Returns the schedule item that matches the current time, or null if
 * the current time falls outside any scheduled activity.
 */
export function getCurrentActivity(
  schedule: ScheduleItem[] = DEFAULT_SCHEDULE,
  now: Date = new Date(),
): ScheduleItem | null {
  const currentHour = now.getHours() + now.getMinutes() / 60;
  return schedule.find((item) => currentHour >= item.startHour && currentHour < item.endHour) ?? null;
}
