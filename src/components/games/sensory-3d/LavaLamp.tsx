"use client";
import { useState, useEffect, useRef } from "react";

const DURATION = 60;
const WARM = ["#ff6b6b", "#f97316", "#eab308", "#fb7185"];
const COOL = ["#8b5cf6", "#3b82f6", "#06b6d4", "#10b981"];

type Blob = { x: number; y: number; vx: number; vy: number; r: number; color: string; phase: number };

export default function LavaLamp() {
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [done, setDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const blobsRef = useRef<Blob[]>(Array.from({ length: 12 }, () => ({
    x: 0.2 + Math.random() * 0.6, y: Math.random(), vx: 0, vy: (Math.random() - 0.5) * 0.002,
    r: 20 + Math.random() * 25, color: (Math.random() > 0.5 ? WARM : COOL)[Math.floor(Math.random() * 4)],
    phase: Math.random() * Math.PI * 2,
  })));

  useEffect(() => { if (!started || done) return; const t = setInterval(() => setTimeLeft((p) => { if (p <= 1) { clearInterval(t); setDone(true); return 0; } return p - 1; }), 1000); return () => clearInterval(t); }, [started, done]);

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let t = 0;
    const tick = () => {
      t += 0.016;
      const w = canvas.width, h = canvas.height;
      ctx.fillStyle = "rgba(20,10,30,0.06)"; ctx.fillRect(0, 0, w, h);
      for (const b of blobsRef.current) {
        b.vy += Math.sin(t * 0.5 + b.phase) * 0.00005;
        b.vx += Math.sin(t * 0.3 + b.phase * 2) * 0.00003;
        b.vy *= 0.998; b.vx *= 0.998;
        b.y += b.vy; b.x += b.vx;
        if (b.y < 0 || b.y > 1) b.vy *= -0.8;
        if (b.x < 0.1 || b.x > 0.9) b.vx *= -0.8;
        b.y = Math.max(0, Math.min(1, b.y));
        b.x = Math.max(0.1, Math.min(0.9, b.x));
        const br = b.r + Math.sin(t + b.phase) * 5;
        const grad = ctx.createRadialGradient(b.x * w, b.y * h, br * 0.2, b.x * w, b.y * h, br);
        grad.addColorStop(0, b.color + "cc"); grad.addColorStop(1, b.color + "00");
        ctx.beginPath(); ctx.arc(b.x * w, b.y * h, br, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
      }
      // Lamp outline
      ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.05, w * 0.25, 15, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.95, w * 0.3, 15, 0, 0, Math.PI * 2); ctx.stroke();
      animRef.current = requestAnimationFrame(tick);
    };
    ctx.fillStyle = "#140a1e"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [started]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl" style={{ background: "#140a1e" }}>
      {started && !done && <div className="absolute top-4 right-4 z-20 rounded-full px-4 py-2 text-white font-bold" style={{ background: "rgba(255,255,255,0.1)" }}>{timeLeft}s</div>}
      <canvas ref={canvasRef} width={400} height={600} className="absolute inset-0 w-full h-full" />
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer" onClick={() => setStarted(true)}>
          <div className="text-center px-10 py-10 rounded-3xl border border-white/15" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="text-7xl mb-5">&#x1F6CB;\uFE0F</div>
            <p className="text-3xl font-bold text-orange-300 mb-2">Lava Lamp</p>
            <p className="text-lg text-white/60">Watch the soothing blobs float</p>
            <div className="mt-6 text-orange-400 font-semibold text-lg">Tap to begin</div>
          </div>
        </div>
      )}
      {done && (
        <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "rgba(20,10,30,0.92)" }}>
          <div className="text-center"><div className="text-9xl mb-6">&#x1F31F;</div><h3 className="text-4xl font-bold text-white">So Relaxing!</h3></div>
        </div>
      )}
    </div>
  );
}
