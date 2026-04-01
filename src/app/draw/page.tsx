"use client";

import DrawCanvas from "@/components/DrawCanvas";

export default function DrawPage() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        padding: "12px",
        boxSizing: "border-box",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
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
          Draw
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
      <DrawCanvas />
    </main>
  );
}
