"use client";

import { useState, useRef, useCallback } from "react";

const FLAVORS = [
  { name: "Strawberry", color: "#FFB6C1", emoji: "\u{1F353}" },
  { name: "Blueberry", color: "#87CEEB", emoji: "\u{1FAD0}" },
  { name: "Lemon", color: "#FFE66D", emoji: "\u{1F34B}" },
  { name: "Mint", color: "#95E1D3", emoji: "\u{1F33F}" },
  { name: "Watermelon", color: "#FF6B6B", emoji: "\u{1F349}" },
  { name: "Grape", color: "#DDA0DD", emoji: "\u{1F347}" },
];
const TARGET = 12;

type Scoop = { id: number; color: string; x: number; y: number };

export default function IceCreamBuilder() {
  const [started, setStarted] = useState(false);
  const [scoops, setScoops] = useState<Scoop[]>([]);
  const [currentFlavor, setCurrentFlavor] = useState(FLAVORS[0]);
  const [showComplete, setShowComplete] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);

  const addScoop = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!started || scoops.length >= TARGET) return;
    e.preventDefault();
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return;
    let cx: number, cy: number;
    if ("touches" in e) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
    else { cx = e.clientX; cy = e.clientY; }
    const x = ((cx - rect.left) / rect.width) * 100;
    const y = ((cy - rect.top) / rect.height) * 100;
    if (y > 82) return;
    const newScoop: Scoop = { id: Date.now() + Math.random(), color: currentFlavor.color, x: Math.max(20, Math.min(80, x)), y: Math.max(10, Math.min(80, y)) };
    const next = [...scoops, newScoop];
    setScoops(next);
    if (next.length >= TARGET) setShowComplete(true);
  }, [started, scoops, currentFlavor]);

  const progress = Math.min((scoops.length / TARGET) * 100, 100);

  if (showComplete) return (
    <div className="h-full flex flex-col items-center justify-center gap-4 p-6">
      <div className="text-8xl">&#x1F366;</div>
      <p className="text-3xl font-bold text-pink-600">Delicious!</p>
      <p className="text-pink-400">{scoops.length} scoops!</p>
    </div>
  );

  return (
    <div className="relative h-full w-full flex flex-col gap-3">
      <div className="h-2.5 bg-pink-100 rounded-full overflow-hidden mx-1">
        <div className="h-full rounded-full" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #F472B6, #FB7185)", transition: "width 0.3s" }} />
      </div>
      <div className="flex items-center justify-between px-1">
        <div className="bg-pink-50 rounded-full px-3 py-1 shadow"><span className="text-base font-bold text-pink-600">{scoops.length}/{TARGET} scoops</span></div>
        <span className="text-sm text-gray-400 font-medium">Tap to add!</span>
      </div>
      <div className="flex justify-center gap-2 flex-wrap px-1">
        {FLAVORS.map((f) => (
          <button key={f.name} onClick={() => setCurrentFlavor(f)} className="flex flex-col items-center border-none bg-transparent cursor-pointer">
            <div className="w-10 h-10 rounded-full shadow-lg" style={{
              backgroundColor: f.color,
              border: currentFlavor.color === f.color ? "3px solid white" : "3px solid transparent",
              boxShadow: currentFlavor.color === f.color ? `0 0 15px ${f.color}88` : "0 2px 8px rgba(0,0,0,0.2)",
            }} />
            <span className="text-xs text-gray-400 mt-0.5">{f.emoji}</span>
          </button>
        ))}
      </div>
      <div ref={areaRef} className="flex-1 relative rounded-2xl overflow-hidden cursor-pointer" style={{ touchAction: "none", background: "linear-gradient(180deg, #FFF8E1, #FFECB3)" }}
        onClick={addScoop} onTouchStart={addScoop}>
        {/* Cone */}
        <svg className="absolute bottom-0 left-1/2 -translate-x-1/2 w-44 h-44 pointer-events-none" viewBox="0 0 100 100">
          <polygon points="50,98 18,33 82,33" fill="#D2691E" />
          <polygon points="50,97 22,37 78,37" fill="#CD853F" opacity="0.5" />
          <line x1="18" y1="33" x2="82" y2="33" stroke="#8B4513" strokeWidth="2" opacity="0.5" />
        </svg>
        {scoops.map((s, i) => (
          <div key={s.id} className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${s.x}%`, top: `${s.y}%`, zIndex: i + 5 }}>
            <div className="w-10 h-10 rounded-full" style={{
              backgroundColor: s.color,
              boxShadow: `inset 0 -4px 8px rgba(0,0,0,0.2), inset 0 4px 8px rgba(255,255,255,0.4), 0 4px 10px ${s.color}55`,
            }}>
              <div className="w-3 h-3 rounded-full bg-white/40 absolute top-1.5 left-2" />
            </div>
          </div>
        ))}
        {scoops.length === 0 && started && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center pointer-events-none">
            <div className="text-4xl mb-2">&#x1F447;</div>
            <p className="text-lg font-bold text-amber-700">Tap to add scoops!</p>
          </div>
        )}
      </div>
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center bg-amber-50/90 rounded-2xl">
          <div className="bg-white rounded-3xl p-8 shadow-2xl text-center mx-4">
            <div className="text-7xl mb-4">&#x1F366;</div>
            <p className="text-2xl font-bold text-pink-600 mb-2">Ice Cream Builder!</p>
            <p className="text-pink-400 mb-5">Add {TARGET} scoops to finish!</p>
            <button onClick={() => setStarted(true)} className="text-white px-8 py-3 rounded-full text-lg font-bold shadow-lg border-none cursor-pointer" style={{ background: "linear-gradient(90deg, #F472B6, #FB7185)" }}>Build It!</button>
          </div>
        </div>
      )}
    </div>
  );
}
