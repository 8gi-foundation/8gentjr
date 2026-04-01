import type { Metadata } from "next";
import SymbolSearch from "@/components/SymbolSearch";

export const metadata: Metadata = {
  title: "Symbol Search - 8gent Jr",
  description:
    "Browse and search 46,000+ ARASAAC pictographic symbols for AAC communication boards.",
};

export default function SymbolsPage() {
  return (
    <main style={{ minHeight: "100vh" }}>
      <header
        style={{
          padding: "24px 16px 0",
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 4px" }}>
          Symbol Search
        </h1>
        <p style={{ color: "#666", fontSize: 15, margin: "0 0 8px" }}>
          Browse 46,000+ ARASAAC pictographic symbols for communication boards.
        </p>
      </header>
      <SymbolSearch />
    </main>
  );
}
