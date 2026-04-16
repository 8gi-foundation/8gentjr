"use client";

import Link from "next/link";

const activities = [
  {
    id: "shapes",
    href: "/science/shapes",
    title: "Shape World",
    desc: "Paint isometric worlds. Every color plays a tone.",
    icon: "\uD83E\uDDCA",
  },
  {
    id: "physics",
    href: "/science/physics",
    title: "Physics Lab",
    desc: "Launch particles, swing pendulums, splash colors.",
    icon: "\u2728",
  },
];

export default function SciencePage() {
  return (
    <div
      style={{
        minHeight: "calc(100dvh - 80px)",
        background: "#FFF8F0",
        padding: "24px 16px 40px",
      }}
    >
      <h1
        style={{
          margin: "0 0 24px",
          fontSize: 24,
          fontWeight: 800,
          color: "#1a1a2e",
          fontFamily: "var(--font-fraunces), serif",
          textAlign: "center",
        }}
      >
        Science
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 16,
          maxWidth: 420,
          margin: "0 auto",
        }}
      >
        {activities.map((a) => (
          <Link
            key={a.id}
            href={a.href}
            style={{
              textDecoration: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: "28px 16px 24px",
              borderRadius: 16,
              background: "white",
              border: "1px solid #F0DECA",
              boxShadow: "0 2px 12px rgba(232, 97, 10, 0.08)",
            }}
          >
            <span style={{ fontSize: 48 }}>{a.icon}</span>
            <span
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "#1a1a2e",
                fontFamily: "var(--font-fraunces), serif",
              }}
            >
              {a.title}
            </span>
            <span
              style={{
                fontSize: 13,
                color: "#6B7280",
                textAlign: "center",
                lineHeight: 1.4,
              }}
            >
              {a.desc}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
