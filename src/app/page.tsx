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
      <main className="min-h-screen flex flex-col items-center justify-center p-8 pb-24 text-center">
        <h1 className="text-[clamp(2rem,5vw,4rem)] font-extrabold text-[--brand-accent] mb-2">
          8gent Jr
        </h1>
        <p className="text-[clamp(1rem,2.5vw,1.5rem)] text-[--brand-text-soft] max-w-[600px] leading-relaxed">
          A personalised AI companion for neurodivergent children.
          <br />
          Free forever. Built with love.
        </p>

        <h2 className="text-xl text-[--brand-text] mt-10 mb-2">
          AAC Phrase Board
        </h2>
        <p className="text-[0.95rem] text-[--brand-text-muted] mb-4">
          Card labels: 16px — readable at arm&apos;s length on tablet
        </p>

        <PhraseBoard
          cards={PHRASE_CARDS}
          onCardTap={(label) => {
            console.log("tapped:", label);
          }}
        />

        <h2 className="text-xl text-[--brand-text] mt-10 mb-2">
          AAC Board
        </h2>
        <p className="text-[0.95rem] text-[--brand-text-muted] mb-4">
          Grid density selector — default 4 columns for motor targeting
        </p>

        <AACBoard columns={4} showDensitySelector />

        <p className="mt-8 text-sm text-[--brand-text-muted]">
          Coming soon from the{" "}
          <a href="https://8gent.world" className="text-[--brand-accent] hover:underline">
            8GI Foundation
          </a>
        </p>
      </main>
      <Dock />
    </>
  );
}
