"use client";
import { useState, useEffect, useRef } from "react";

const COUNT = 300;
const DURATION = 60;
const COLORS = ["#4ecdc4", "#ff6b6b", "#ffd93d", "#a78bfa", "#fb923c", "#34d399"];

export default function MagneticParticles() {
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [done, setDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5, down: false });
  const particlesRef = useRef(Array.from({ length: COUNT }, () => ({
    x: Math.random(), y: Math.random(), vx: 0, vy: 0, homeX: Math.random(), homeY: Math.random(),
    color: COLORS[Math.floor(Math.random() * COLORS.length)], size: 2 + Math.random() * 3,
  })));

  useEffect(() => { if (!started || done) return; const t = setInterval(() => setTimeLeft((p) => { if (p <= 1) { clearInterval(t); setDone(true); return 0; } return p - 1; }), 1000); return () => clearInterval(t); }, [started, done]);

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const tick = () => {
      const w = canvas.width, h = canvas.height;
      ctx.fillStyle = "rgba(10,10,25,0.12)"; ctx.fillRect(0, 0, w, h);
      for (const p of particlesRef.current) {
        if (mouseRef.current.down) {
          const dx = mouseRef.current.x - p.x, dy = mouseRef.current.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0.01) { const f = Math.min(0.0015 / dist, 0.005); p.vx += dx * f; p.vy += dy * f; }
        } else {
          p.vx += (p.homeX - p.x) * 0.0003; p.vy += (p.homeY - p.y) * 0.0003;
        }
        p.vx *= 0.97; p.vy *= 0.97;
        p.vx += (Math.random() - 0.5) * 0.0002; p.vy += (Math.random() - 0.5) * 0.0002;
        p.x += p.vx; p.y += p.vy;
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.globalAlpha = 0.8; ctx.fill(); ctx.globalAlpha = 1;
      }
      animRef.current = requestAnimationFrame(tick);
    };
    ctx.fillStyle = "#0a0a19"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [started]);

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    const r = canvasRef.current?.getBoundingClientRect(); if (!r) return;
    const [cx, cy] = "touches" in e ? [e.touches[0].clientX, e.touches[0].clientY] : [e.clientX, e.clientY];
    mouseRef.current.x = (cx - r.left) / r.width; mouseRef.current.y = (cy - r.top) / r.height;
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl" style={{ background: "#0a0a19" }}>
      {started && !done && <div className="absolute top-4 right-4 z-20 rounded-full px-4 py-2 text-white font-bold" style={{ background: "rgba(255,255,255,0.1)" }}>{timeLeft}s</div>}
      {started && !done && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 text-white/60 text-sm">Hold to attract particles</div>}
      <canvas ref={canvasRef} width={400} height={600} className="absolute inset-0 w-full h-full cursor-pointer"
        onMouseMove={handleMove} onTouchMove={handleMove}
        onMouseDown={() => { mouseRef.current.down = true; }} onMouseUp={() => { mouseRef.current.down = false; }}
        onTouchStart={(e) => { mouseRef.current.down = true; handleMove(e); }} onTouchEnd={() => { mouseRef.current.down = false; }} />
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer" onClick={() => setStarted(true)}>
          <div className="text-center px-10 py-10 rounded-3xl border border-white/15" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="text-7xl mb-5">&#x1F9F2;</div>
            <p className="text-3xl font-bold text-cyan-300 mb-2">Magnetic Particles</p>
            <p className="text-lg text-white/60">Touch and hold to attract</p>
            <div className="mt-6 text-cyan-400 font-semibold text-lg">Tap to begin</div>
          </div>
        </div>
      )}
      {done && (
        <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "rgba(10,10,25,0.92)" }}>
          <div className="text-center"><div className="text-9xl mb-6">&#x1F9F2;</div><h3 className="text-4xl font-bold text-white">Magnetic!</h3></div>
        </div>
      )}
    </div>
  );
}
