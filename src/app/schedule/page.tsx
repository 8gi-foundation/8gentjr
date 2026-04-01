"use client";

import VisualSchedule from "@/components/VisualSchedule";

export default function SchedulePage() {
  return (
    <main className="flex flex-col min-h-[100dvh] p-4 pb-24 font-sans bg-[#FFF8F0]">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-extrabold text-[#E8610A] m-0">
          My Day
        </h1>
        <a href="/" className="text-gray-500 no-underline text-sm">
          Back
        </a>
      </header>

      <p className="text-[0.95rem] text-gray-500 m-0 mb-4 text-center">
        Here is your schedule for today
      </p>

      <VisualSchedule />
    </main>
  );
}
