"use client";

import PhraseBoard from "../components/PhraseBoard";
import Dock from "../components/Dock";
import AACBoard from "@/components/AACBoard";
import { GENERAL_PHRASES } from "@/lib/vocabulary";
import { FITZGERALD_COLORS } from "@/lib/fitzgerald-key";

/** PhraseBoard cards built from the vocabulary system's General phrases */
const PHRASE_CARDS = GENERAL_PHRASES.map((phrase) => ({
  label: phrase.text,
  symbolUrl: phrase.imageUrl,
  bgColor: FITZGERALD_COLORS.verb.bg,
}));

export default function Home() {
  return (
    <>
      <main className="min-h-screen flex flex-col items-center p-4 pb-24">
        {/* Hero */}
        <div className="text-center mt-8 mb-6">
          <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-extrabold text-[--brand-accent]">
            8gent Jr
          </h1>
          <p className="text-[--brand-text-soft] mt-1">
            Tap a card to speak
          </p>
        </div>

        {/* Main AAC Board */}
        <div className="w-full max-w-3xl">
          <AACBoard columns={4} showDensitySelector />
        </div>
      </main>
      <Dock />
    </>
  );
}
