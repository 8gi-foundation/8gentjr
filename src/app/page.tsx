"use client";

import PhraseBoard from "../components/PhraseBoard";

const DEMO_CARDS = [
  { label: "I want", bgColor: "#E8F5E9" },
  { label: "More", bgColor: "#E3F2FD" },
  { label: "Help", bgColor: "#FFF3E0" },
  { label: "Yes", bgColor: "#E8F5E9" },
  { label: "No", bgColor: "#FFEBEE" },
  { label: "Drink", bgColor: "#E3F2FD" },
  { label: "Food", bgColor: "#FFF3E0" },
  { label: "Play", bgColor: "#F3E5F5" },
  { label: "Stop", bgColor: "#FFEBEE" },
  { label: "Bathroom", bgColor: "#E3F2FD" },
  { label: "Happy", bgColor: "#E8F5E9" },
  { label: "Sad", bgColor: "#FFEBEE" },
];

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(2rem, 5vw, 4rem)",
          fontWeight: 800,
          color: "#E8610A",
          marginBottom: "0.5rem",
        }}
      >
        8gent Jr
      </h1>
      <p
        style={{
          fontSize: "clamp(1rem, 2.5vw, 1.5rem)",
          color: "#555",
          maxWidth: 600,
          lineHeight: 1.6,
        }}
      >
        A personalised AI companion for neurodivergent children.
        <br />
        Free forever. Built with love.
      </p>

      <h2
        style={{
          fontSize: "1.25rem",
          color: "#333",
          marginTop: "2.5rem",
          marginBottom: "0.5rem",
        }}
      >
        AAC Phrase Board
      </h2>
      <p style={{ fontSize: "0.95rem", color: "#777", marginBottom: "1rem" }}>
        Card labels: 16px — readable at arm&apos;s length on tablet
      </p>

      <PhraseBoard
        cards={DEMO_CARDS}
        onCardTap={(label) => {
          /* future: append to sentence strip */
          console.log("tapped:", label);
        }}
      />

      <p style={{ marginTop: "2rem", fontSize: "0.9rem", color: "#999" }}>
        Coming soon from the{" "}
        <a href="https://8gent.world" style={{ color: "#E8610A" }}>
          8GI Foundation
        </a>
      </p>
    </main>
  );
}
