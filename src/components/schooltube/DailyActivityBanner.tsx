"use client";

/**
 * DailyActivityBanner — shows the day's suggested learning activity.
 * Ported from NickOS, simplified to work without external daily-routine lib.
 */

const DAILY_ACTIVITIES = [
  {
    day: "Monday",
    theme: "Number Fun",
    activity: "Counting & number games",
    icon: "\uD83D\uDD22",
    color: "#FF6B6B",
    duration: 15,
    gameTypes: ["counting", "bubblePop", "numberOrder", "numberBonds"],
  },
  {
    day: "Tuesday",
    theme: "Letter Land",
    activity: "ABC tracing & sounds",
    icon: "\uD83D\uDD24",
    color: "#4ECDC4",
    duration: 15,
    gameTypes: ["letterTrace", "wordRepeat"],
  },
  {
    day: "Wednesday",
    theme: "Color Day",
    activity: "Color sorting & mixing",
    icon: "\uD83C\uDFA8",
    color: "#FFE66D",
    duration: 15,
    gameTypes: ["colorSort", "colorMix"],
  },
  {
    day: "Thursday",
    theme: "Shape World",
    activity: "Shape matching & patterns",
    icon: "\u2B1B",
    color: "#95E1D3",
    duration: 15,
    gameTypes: ["matching", "pattern", "sizeSort", "memory"],
  },
  {
    day: "Friday",
    theme: "Sensory Play",
    activity: "Relaxing sensory experiences",
    icon: "\uD83C\uDF08",
    color: "#FF69B4",
    duration: 20,
    gameTypes: [
      "ballRain",
      "iceCream",
      "bottleFill",
      "fireworks",
      "bubbleWrap",
    ],
  },
  {
    day: "Saturday",
    theme: "Speech & Language",
    activity: "Animal sounds & feelings",
    icon: "\uD83D\uDDE3\uFE0F",
    color: "#686DE0",
    duration: 15,
    gameTypes: ["animalSounds", "feelings", "rhymeTime", "sentenceBuilder"],
  },
  {
    day: "Sunday",
    theme: "Free Play",
    activity: "Choose your own adventure!",
    icon: "\u2B50",
    color: "#F8B500",
    duration: 20,
    gameTypes: [],
  },
];

function getTodayActivity() {
  const day = new Date().getDay(); // 0=Sun..6=Sat
  const idx = day === 0 ? 6 : day - 1; // remap so Monday=0
  return DAILY_ACTIVITIES[idx];
}

interface DailyActivityBannerProps {
  onStartActivity: (gameTypes: string[]) => void;
}

export default function DailyActivityBanner({
  onStartActivity,
}: DailyActivityBannerProps) {
  const activity = getTodayActivity();

  return (
    <div
      className="mx-4 mb-4 rounded-3xl p-4 shadow-lg overflow-hidden relative"
      style={{ backgroundColor: activity.color }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/30 animate-[spin_20s_linear_infinite]" />
        <div className="absolute -left-5 -bottom-5 w-32 h-32 rounded-full bg-white/20 animate-[spin_25s_linear_infinite_reverse]" />
      </div>

      <div className="relative z-10 flex items-center gap-4">
        {/* Icon */}
        <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center text-4xl backdrop-blur-sm shrink-0">
          {activity.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-white/80 text-sm font-medium">
            {activity.day}&apos;s Activity
          </p>
          <h3 className="text-white font-bold text-lg truncate">
            {activity.theme}
          </h3>
          <p className="text-white/90 text-sm">{activity.activity}</p>
          <div className="flex items-center gap-1 mt-1 text-white/70 text-xs">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{activity.duration} min</span>
          </div>
        </div>

        {/* Play button */}
        <button
          onClick={() => onStartActivity(activity.gameTypes)}
          className="h-14 w-14 rounded-2xl bg-white hover:bg-white/90 shadow-lg flex items-center justify-center shrink-0 active:scale-95 transition-transform"
        >
          <svg
            className="w-6 h-6 text-gray-800"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
