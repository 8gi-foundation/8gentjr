"use client";
import { useState, useEffect, useRef } from "react";

const COUNT = 40;
const COLORS = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#DDA0DD", "#95E1D3", "#FFB347", "#87CEEB"];

type Particle = { x: number; y: number; r: number; color: string; active: boolean; exploding: boolean; explodeTimer: number };

export default function ChainReaction() {
  const [started, setStarted] = useState(false);
  const [activated, setActivated] = useState(0);
  const [done, setDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>(
    Array.from({ length: COUNT }, () => ({
      x: 0.1 + Math.random() * 0.8, y: 0.1 + Math.random() * 0.8,
      r: 8 + Math.random() * 6, color: COLORS[Math.floor(Math.random() * COLORS.length)],
      active: false, exploding: false, explodeTimer: 0,
    }))
  );
  const activatedRef = useRef(0);

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const tick = () => {
      const w = canvas.width, h = canvas.height;
      ctx.fillStyle = "rgba(10,10,30,0.15)"; ctx.fillRect(0, 0, w, h);
      let newActivations = 0;
      for (const p of particlesRef.current) {
        if (p.exploding) {
          p.explodeTimer += 0.016;
          const er = p.r + p.explodeTimer * 80;
          // Check chain reaction
          for (const other of particlesRef.current) {
            if (other === p || other.active) continue;
            const dx = other.x - p.x, dy = other.y - p.y;
            if (Math.sqrt(dx * dx + dy * dy) * w < er) {
              other.active = true; other.exploding = true; newActivations++;
            }
          }
          ctx.beginPath(); ctx.arc(p.x * w, p.y * h, er, 0, Math.PI * 2);
          ctx.fillStyle = p.color + Math.max(0, Math.floor((1 - p.explodeTimer) * 60)).toString(16).padStart(2, "0");
          ctx.fill();
          if (p.explodeTimer > 1) p.exploding = false;
        }
        // Draw particle
        const grad = ctx.createRadialGradient(p.x * w - 1, p.y * h - 1, 1, p.x * w, p.y * h, p.r);
        grad.addColorStop(0, p.active ? "white" : "rgba(255,255,255,0.5)");
        grad.addColorStop(1, p.active ? p.color : p.color + "66");
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
      }
      if (newActivations > 0) { activatedRef.current += newActivations; setActivated(activatedRef.current); }
      if (activatedRef.current >= COUNT && !done) setDone(true);
      animRef.current = requestAnimationFrame(tick);
    };
    ctx.fillStyle = "#0a0a1e"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [started, done]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!started || done) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width, ny = (e.clientY - rect.top) / rect.height;
    for (const p of particlesRef.current) {
      if (p.active) continue;
      const dx = p.x - nx, dy = p.y - ny;
      if (Math.sqrt(dx * dx + dy * dy) < 0.06) {
        p.active = true; p.exploding = true; activatedRef.current++; setActivated(activatedRef.current); break;
      }
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl" style={{ background: "#0a0a1e" }}>
      {started && !done && <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/10 rounded-full px-5 py-2 text-white font-bold">{activated}/{COUNT} activated</div>}
      {started && !done && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 text-white/50 text-sm">Tap a particle to start the chain!</div>}
      <canvas ref={canvasRef} width={400} height={600} className="absolute inset-0 w-full h-full cursor-pointer" onClick={handleClick} />
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer" onClick={() => setStarted(true)}>
          <div className="text-center px-10 py-10 rounded-3xl border border-white/15" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="text-7xl mb-5">&#x1F4A5;</div>
            <p className="text-3xl font-bold text-orange-300 mb-2">Chain Reaction</p>
            <p className="text-lg text-white/60">Tap to trigger a cascade</p>
            <div className="mt-6 text-orange-400 font-semibold text-lg">Tap to begin</div>
          </div>
        </div>
      )}
      {done && (
        <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "rgba(10,10,30,0.92)" }}>
          <div className="text-center"><div className="text-9xl mb-6">&#x1F4A5;</div><h3 className="text-4xl font-bold text-white">Chain Complete!</h3></div>
        </div>
      )}
    </div>
  );
}
