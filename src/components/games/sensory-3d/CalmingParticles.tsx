"use client";
import { useState, useEffect, useRef } from "react";

const COUNT = 80;
const DURATION = 60;
const PALETTE = ["#4ecdc4", "#81c9e8", "#a8e6cf", "#ffd93d", "#ff9a9e", "#c3a6ff"];

export default function CalmingParticles() {
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [done, setDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5, active: false });
  const particlesRef = useRef(Array.from({ length: COUNT }, () => ({
    x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.002, vy: (Math.random() - 0.5) * 0.002,
    size: 4 + Math.random() * 8, color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
  })));

  useEffect(() => { if (!started || done) return; const t = setInterval(() => setTimeLeft((p) => { if (p <= 1) { clearInterval(t); setDone(true); return 0; } return p - 1; }), 1000); return () => clearInterval(t); }, [started, done]);

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const tick = () => {
      const w = canvas.width, h = canvas.height;
      ctx.fillStyle = "rgba(15,20,40,0.08)"; ctx.fillRect(0, 0, w, h);
      for (const p of particlesRef.current) {
        if (mouseRef.current.active) {
          const dx = mouseRef.current.x - p.x, dy = mouseRef.current.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 0.2 && dist > 0.01) { p.vx += dx * 0.0008; p.vy += dy * 0.0008; }
        }
        p.vx *= 0.995; p.vy *= 0.995;
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
        p.x = Math.max(0, Math.min(1, p.x));
        p.y = Math.max(0, Math.min(1, p.y));
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + "aa"; ctx.fill();
        ctx.shadowColor = p.color; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
      }
      animRef.current = requestAnimationFrame(tick);
    };
    ctx.fillStyle = "#0f1428"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [started]);

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    const r = canvasRef.current?.getBoundingClientRect(); if (!r) return;
    const [cx, cy] = "touches" in e ? [e.touches[0].clientX, e.touches[0].clientY] : [e.clientX, e.clientY];
    mouseRef.current = { x: (cx - r.left) / r.width, y: (cy - r.top) / r.height, active: true };
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl" style={{ background: "#0f1428" }}>
      {started && !done && <div className="absolute top-4 right-4 z-20 rounded-full px-4 py-2 text-white font-bold" style={{ background: "rgba(255,255,255,0.1)" }}>{timeLeft}s</div>}
      <canvas ref={canvasRef} width={400} height={600} className="absolute inset-0 w-full h-full"
        onMouseMove={handleMove} onTouchMove={handleMove} onMouseLeave={() => { mouseRef.current.active = false; }} />
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer" onClick={() => setStarted(true)}>
          <div className="text-center px-10 py-10 rounded-3xl border border-white/15" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="text-7xl mb-5">&#x2728;</div>
            <p className="text-3xl font-bold text-cyan-300 mb-2">Calming Particles</p>
            <p className="text-lg text-white/60">Move your finger to guide the particles</p>
            <div className="mt-6 text-cyan-400 font-semibold text-lg">Tap to begin</div>
          </div>
        </div>
      )}
      {done && (
        <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "rgba(15,20,40,0.92)" }}>
          <div className="text-center"><div className="text-9xl mb-6">&#x1F31F;</div><h3 className="text-4xl font-bold text-white">So Peaceful!</h3></div>
        </div>
      )}
    </div>
  );
}
