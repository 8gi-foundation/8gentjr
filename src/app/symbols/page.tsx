import type { Metadata } from "next";
import SymbolSearch from "@/components/SymbolSearch";

export const metadata: Metadata = {
  title: "Symbol Search - 8gent Jr",
  description:
    "Browse and search 46,000+ ARASAAC pictographic symbols for AAC communication boards.",
};

export default function SymbolsPage() {
  return (
    <main className="min-h-screen">
      <header className="pt-6 px-4 max-w-[960px] mx-auto">
        <h1 className="text-[28px] font-bold m-0 mb-1">
          Symbol Search
        </h1>
        <p className="text-gray-500 text-[15px] m-0 mb-2">
          Browse 46,000+ ARASAAC pictographic symbols for communication boards.
        </p>
      </header>
      <SymbolSearch />
    </main>
  );
}
