"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Crystal = { id: number; x: number; y: number; color: string; name: string; touched: boolean; angle: number; scale: number };

const CRYSTALS: Omit<Crystal, "touched" | "angle" | "scale">[] = [
  { id: 0, x: 0.15, y: 0.3, color: "#9333ea", name: "Amethyst" },
  { id: 1, x: 0.82, y: 0.3, color: "#10b981", name: "Emerald" },
  { id: 2, x: 0.35, y: 0.15, color: "#3b82f6", name: "Sapphire" },
  { id: 3, x: 0.65, y: 0.15, color: "#ef4444", name: "Ruby" },
  { id: 4, x: 0.5, y: 0.5, color: "#f59e0b", name: "Topaz" },
  { id: 5, x: 0.3, y: 0.65, color: "#ec4899", name: "Rose Quartz" },
  { id: 6, x: 0.7, y: 0.65, color: "#06b6d4", name: "Aquamarine" },
  { id: 7, x: 0.15, y: 0.8, color: "#84cc16", name: "Peridot" },
];

export default function CrystalGarden() {
  const [started, setStarted] = useState(false);
  const [crystals, setCrystals] = useState<Crystal[]>(() =>
    CRYSTALS.map((c) => ({ ...c, touched: false, angle: Math.random() * Math.PI * 2, scale: 0.8 + Math.random() * 0.4 }))
  );
  const [done, setDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const crystalsRef = useRef(crystals);
  const dustRef = useRef<{ x: number; y: number; speed: number }[]>(
    Array.from({ length: 100 }, () => ({ x: Math.random(), y: Math.random(), speed: 0.0002 + Math.random() * 0.0005 }))
  );

  useEffect(() => { crystalsRef.current = crystals; }, [crystals]);

  const touchedCount = crystals.filter((c) => c.touched).length;

  useEffect(() => {
    if (touchedCount === CRYSTALS.length && started && !done) setDone(true);
  }, [touchedCount, started, done]);

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let t = 0;

    const tick = () => {
      t += 0.016;
      const w = canvas.width, h = canvas.height;
      ctx.fillStyle = "#0d0520";
      ctx.fillRect(0, 0, w, h);

      // Dust particles
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      for (const d of dustRef.current) {
        d.y += d.speed; if (d.y > 1) d.y = 0;
        ctx.beginPath(); ctx.arc(d.x * w, d.y * h, 1, 0, Math.PI * 2); ctx.fill();
      }

      // Crystals
      for (const c of crystalsRef.current) {
        const cx = c.x * w, cy = c.y * h + Math.sin(t * 0.8 + c.id) * 5;
        const s = (c.touched ? 28 : 22) * c.scale;

        // Glow
        if (c.touched) {
          const grad = ctx.createRadialGradient(cx, cy, s * 0.5, cx, cy, s * 2);
          grad.addColorStop(0, c.color + "44"); grad.addColorStop(1, "transparent");
          ctx.fillStyle = grad; ctx.fillRect(cx - s * 2, cy - s * 2, s * 4, s * 4);
        }

        // Diamond shape
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(c.angle + t * (c.touched ? 0.02 : 0.01));
        ctx.beginPath();
        ctx.moveTo(0, -s); ctx.lineTo(s * 0.7, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.7, 0);
        ctx.closePath();
        ctx.fillStyle = c.touched ? c.color : c.color + "88";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1; ctx.stroke();
        // Highlight
        ctx.beginPath(); ctx.moveTo(0, -s * 0.5); ctx.lineTo(s * 0.2, -s * 0.1); ctx.lineTo(-s * 0.1, s * 0.2);
        ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fill();
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [started]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    setCrystals((prev) => prev.map((c) => {
      if (c.touched) return c;
      const dx = c.x - nx, dy = c.y - ny;
      if (Math.sqrt(dx * dx + dy * dy) < 0.08) return { ...c, touched: true };
      return c;
    }));
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl" style={{ background: "#0d0520" }}>
      {started && !done && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          <div className="rounded-full px-5 py-2 border border-white/20 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.08)" }}>
            <span className="text-xl">&#x1F48E;</span>
            <span className="text-xl font-bold text-purple-300">{touchedCount} / {CRYSTALS.length}</span>
          </div>
        </div>
      )}
      {started && !done && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-wrap gap-2 justify-center max-w-xs">
          {crystals.map((c) => (
            <div key={c.id} className="px-3 py-1 rounded-full text-xs font-bold border"
              style={{ color: c.color, borderColor: c.touched ? c.color : "rgba(255,255,255,0.15)", background: c.touched ? `${c.color}22` : "rgba(255,255,255,0.05)", opacity: c.touched ? 1 : 0.35 }}>
              {c.touched ? "\u2713 " : ""}{c.name}
            </div>
          ))}
        </div>
      )}
      <canvas ref={canvasRef} width={400} height={600} className="absolute inset-0 w-full h-full cursor-pointer" onClick={handleClick} />
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer" style={{ background: "rgba(13,5,32,0.88)" }} onClick={() => setStarted(true)}>
          <div className="text-center px-10 py-10 rounded-3xl border border-white/15" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div className="text-7xl mb-5">&#x1F48E;</div>
            <p className="text-3xl font-bold text-purple-300 mb-2">Crystal Garden</p>
            <p className="text-lg text-white/60 mb-1">Touch every magical crystal</p>
            <p className="text-sm text-white/40">{CRYSTALS.length} crystals hidden in the garden</p>
            <div className="mt-6 text-purple-400 font-semibold text-lg">Tap to begin</div>
          </div>
        </div>
      )}
      {done && (
        <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "rgba(13,5,32,0.92)" }}>
          <div className="text-center">
            <div className="text-9xl mb-6">&#x1F48E;</div>
            <h3 className="text-4xl font-bold text-purple-300">All Crystals Found!</h3>
            <p className="text-xl text-white/60 mt-3">You discovered all {CRYSTALS.length} gems!</p>
          </div>
        </div>
      )}
    </div>
  );
}
