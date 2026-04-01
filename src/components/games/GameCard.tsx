"use client";

interface GameCardProps {
  emoji: string;
  title: string;
  description: string;
  color: string;
  onClick?: () => void;
}

export default function GameCard({ emoji, title, description, color, onClick }: GameCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-6 rounded-[20px] cursor-pointer w-full min-h-[160px] transition-transform duration-150 ease-out shadow-sm active:scale-95"
      style={{
        border: `2px solid ${color}30`,
        background: `${color}12`,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <span className="text-5xl">{emoji}</span>
      <span className="text-lg font-extrabold" style={{ color }}>{title}</span>
      <span className="text-[13px] text-gray-500 leading-snug text-center">
        {description}
      </span>
    </button>
  );
}
