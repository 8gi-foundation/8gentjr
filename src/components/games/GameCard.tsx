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
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "24px 16px",
        borderRadius: 20,
        border: `2px solid ${color}30`,
        background: `${color}12`,
        cursor: "pointer",
        width: "100%",
        minHeight: 160,
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        WebkitTapHighlightColor: "transparent",
      }}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "scale(0.95)";
      }}
      onPointerUp={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "scale(1)";
      }}
      onPointerCancel={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "scale(1)";
      }}
    >
      <span style={{ fontSize: 48 }}>{emoji}</span>
      <span style={{ fontSize: 18, fontWeight: 800, color }}>{title}</span>
      <span style={{ fontSize: 13, color: "#777", lineHeight: 1.3, textAlign: "center" }}>
        {description}
      </span>
    </button>
  );
}
