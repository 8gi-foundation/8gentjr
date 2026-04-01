"use client";
import { useState, useEffect, useRef } from "react";

const COLORS = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#DDA0DD", "#FF9F43", "#87CEEB", "#FFB6C1", "#95E1D3"];

type Spark = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number };

export default function ParticleFireworks() {
  const [started, setStarted] = useState(false);
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const sparksRef = useRef<Spark[]>([]);
  const countRef = useRef(0);

  const explode = (nx: number, ny: number) => {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    for (let i = 0; i < 40; i++) {
      const angle = (Math.PI * 2 * i) / 40 + (Math.random() - 0.5) * 0.3;
      const speed = 0.004 + Math.random() * 0.008;
      sparksRef.current.push({
        x: nx, y: ny, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 1, color, size: 2 + Math.random() * 3,
      });
    }
    countRef.current++; setCount(countRef.current);
    if (countRef.current >= 10) setDone(true);
  };

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const tick = () => {
      const w = canvas.width, h = canvas.height;
      ctx.fillStyle = "rgba(5,5,20,0.12)"; ctx.fillRect(0, 0, w, h);
      sparksRef.current = sparksRef.current.filter((s) => s.life > 0);
      for (const s of sparksRef.current) {
        s.vy += 0.0001; // gravity
        s.x += s.vx; s.y += s.vy;
        s.life -= 0.012;
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.size * s.life, 0, Math.PI * 2);
        ctx.fillStyle = s.color; ctx.globalAlpha = s.life; ctx.fill(); ctx.globalAlpha = 1;
      }
      animRef.current = requestAnimationFrame(tick);
    };
    ctx.fillStyle = "#050514"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [started]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!started || done) return;
    const r = canvasRef.current!.getBoundingClientRect();
    explode((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl" style={{ background: "#050514" }}>
      {started && !done && <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/10 rounded-full px-5 py-2 text-white font-bold">{count}/10 fireworks</div>}
      {started && !done && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 text-white/50 text-sm">Tap anywhere to launch!</div>}
      <canvas ref={canvasRef} width={400} height={600} className="absolute inset-0 w-full h-full cursor-pointer" onClick={handleClick} />
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer" onClick={() => setStarted(true)}>
          <div className="text-center px-10 py-10 rounded-3xl border border-white/15" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="text-7xl mb-5">&#x1F386;</div>
            <p className="text-3xl font-bold text-yellow-300 mb-2">Particle Fireworks</p>
            <p className="text-lg text-white/60">Tap to create firework explosions!</p>
            <div className="mt-6 text-yellow-400 font-semibold text-lg">Tap to begin</div>
          </div>
        </div>
      )}
      {done && (
        <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "rgba(5,5,20,0.92)" }}>
          <div className="text-center"><div className="text-9xl mb-6">&#x1F386;</div><h3 className="text-4xl font-bold text-white">Beautiful Show!</h3></div>
        </div>
      )}
    </div>
  );
}
