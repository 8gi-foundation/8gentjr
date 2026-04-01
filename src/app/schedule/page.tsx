"use client";

import VisualSchedule from "@/components/VisualSchedule";

export default function SchedulePage() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
        padding: "16px",
        paddingBottom: "6rem",
        boxSizing: "border-box",
        fontFamily: "Inter, system-ui, sans-serif",
        background: "#FFF8F0",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <h1
          style={{
            fontSize: "1.3rem",
            fontWeight: 800,
            color: "#E8610A",
            margin: 0,
          }}
        >
          My Day
        </h1>
        <a
          href="/"
          style={{
            color: "#666",
            textDecoration: "none",
            fontSize: "0.9rem",
          }}
        >
          Back
        </a>
      </header>

      <p
        style={{
          fontSize: "0.95rem",
          color: "#6B7280",
          margin: "0 0 16px",
          textAlign: "center",
        }}
      >
        Here is your schedule for today
      </p>

      <VisualSchedule />
    </main>
  );
}
