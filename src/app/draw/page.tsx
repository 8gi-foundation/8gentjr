"use client";

import DrawCanvas from "@/components/DrawCanvas";

export default function DrawPage() {
  return (
    <main className="flex flex-col h-[100dvh] p-3 font-sans">
      <header className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-extrabold text-[#E8610A] m-0">
          Draw
        </h1>
        <a href="/" className="text-gray-500 no-underline text-sm">
          Back
        </a>
      </header>
      <DrawCanvas />
    </main>
  );
}
