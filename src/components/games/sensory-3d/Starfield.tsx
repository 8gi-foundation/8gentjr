"use client";

import { useState, useEffect, useRef } from "react";

const PARTICLE_COUNT = 800;
const DURATION = 50;

export default function Starfield() {
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [done, setDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const starsRef = useRef<{ x: number; y: number; z: number; speed: number; color: string }[]>([]);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const colors = ["#ffffff", "#fff8dc", "#add8e6", "#ffd700", "#ffb6c1"];
    starsRef.current = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: Math.random() * 2,
      speed: 0.002 + Math.random() * 0.006, color: colors[Math.floor(Math.random() * colors.length)],
    }));
  }, []);

  useEffect(() => {
    if (!started || done) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => { if (prev <= 1) { clearInterval(timer); setDone(true); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, [started, done]);

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const tick = () => {
      const w = canvas.width, h = canvas.height;
      ctx.fillStyle = "rgba(0,0,20,0.15)";
      ctx.fillRect(0, 0, w, h);

      const mx = (mouseRef.current.x - 0.5) * 0.01;
      const my = (mouseRef.current.y - 0.5) * 0.01;

      for (const s of starsRef.current) {
        s.z -= s.speed;
        s.x += mx;
        s.y += my;
        if (s.z <= 0) { s.z = 2; s.x = (Math.random() - 0.5) * 2; s.y = (Math.random() - 0.5) * 2; }
        const sx = (s.x / s.z) * w * 0.5 + w * 0.5;
        const sy = (s.y / s.z) * h * 0.5 + h * 0.5;
        const size = Math.max(0.5, (1 - s.z / 2) * 3);
        const alpha = Math.max(0.2, 1 - s.z / 2);
        if (sx < 0 || sx > w || sy < 0 || sy > h) continue;
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      animRef.current = requestAnimationFrame(tick);
    };
    ctx.fillStyle = "#000014"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [started]);

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    let cx: number, cy: number;
    if ("touches" in e) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
    else { cx = e.clientX; cy = e.clientY; }
    mouseRef.current = { x: (cx - rect.left) / rect.width, y: (cy - rect.top) / rect.height };
  };

  const progressPct = ((DURATION - timeLeft) / DURATION) * 100;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl" style={{ background: "#000014" }}>
      {started && !done && (
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center gap-3">
          <div className="rounded-full px-4 py-2 border border-white/20 text-white font-bold text-xl" style={{ background: "rgba(255,255,255,0.08)" }}>
            {timeLeft}s
          </div>
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div className="h-full rounded-full" style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #818CF8, #E879F9)", transition: "width 1s" }} />
          </div>
        </div>
      )}
      <canvas ref={canvasRef} width={400} height={600} className="absolute inset-0 w-full h-full"
        onMouseMove={handleMove} onTouchMove={handleMove} />
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer" onClick={() => setStarted(true)}>
          <div className="text-center px-10 py-10 rounded-3xl border border-white/15" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="text-7xl mb-5">&#x2B50;</div>
            <p className="text-3xl font-bold text-white mb-2">Starfield</p>
            <p className="text-lg text-white/60 mb-1">Drift through the galaxy</p>
            <p className="text-sm text-white/40">Move to steer your path</p>
            <div className="mt-6 text-indigo-400 font-semibold text-lg">Tap to begin</div>
          </div>
        </div>
      )}
      {done && (
        <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "rgba(0,0,20,0.92)" }}>
          <div className="text-center">
            <div className="text-9xl mb-6">&#x1F31F;</div>
            <h3 className="text-4xl font-bold text-white">Beautiful!</h3>
            <p className="text-xl text-white/60 mt-3">What a peaceful journey!</p>
          </div>
        </div>
      )}
    </div>
  );
}
