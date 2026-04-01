"use client";

import { useState, useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChangeDetail {
  /** Human-readable description of what changed */
  description: string;
  /** What the state was before (e.g. "Grid: 4 columns") */
  before: string;
  /** What the state will be after (e.g. "Grid: 6 columns") */
  after: string;
}

export interface ChangePreviewProps {
  change: ChangeDetail;
  /** Called when the user confirms the change */
  onConfirm: () => void;
  /** Called when the user undoes/rejects the change */
  onUndo: () => void;
  /** Auto-accept timeout in ms. Default 30000 (30s). */
  autoAcceptMs?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChangePreview({
  change,
  onConfirm,
  onUndo,
  autoAcceptMs = 30_000,
}: ChangePreviewProps) {
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(autoAcceptMs / 1000));
  const confirmedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!confirmedRef.current) {
            confirmedRef.current = true;
            onConfirm();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onConfirm]);

  const handleConfirm = () => {
    if (confirmedRef.current) return;
    confirmedRef.current = true;
    onConfirm();
  };

  const handleUndo = () => {
    if (confirmedRef.current) return;
    confirmedRef.current = true;
    onUndo();
  };

  return (
    <div className="bg-[#FFF8F0] border-2 border-orange-300 rounded-2xl px-4 py-3 mt-2 flex flex-col gap-2">
      <div className="text-sm font-semibold text-amber-800">{change.description}</div>
      <div className="flex gap-3 text-sm items-center flex-wrap">
        <span className="bg-red-100 text-red-900 rounded-lg px-2.5 py-1 font-semibold text-xs line-through">
          {change.before}
        </span>
        <span className="text-base text-gray-400">&rarr;</span>
        <span className="bg-emerald-100 text-emerald-800 rounded-lg px-2.5 py-1 font-semibold text-xs">
          {change.after}
        </span>
      </div>
      <div className="flex gap-2.5 items-center">
        <button
          onClick={handleConfirm}
          className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-[14px] border-[3px] border-emerald-500 bg-emerald-100 text-emerald-800 text-2xl font-bold cursor-pointer flex items-center justify-center transition-transform active:scale-95"
          aria-label="Confirm change"
        >
          &#10003;
        </button>
        <button
          onClick={handleUndo}
          className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-[14px] border-[3px] border-red-500 bg-red-100 text-red-900 text-2xl font-bold cursor-pointer flex items-center justify-center transition-transform active:scale-95"
          aria-label="Undo change"
        >
          &#10005;
        </button>
        <span className="text-xs text-gray-400 ml-1">
          Auto-accepts in {secondsLeft}s
        </span>
      </div>
    </div>
  );
}
