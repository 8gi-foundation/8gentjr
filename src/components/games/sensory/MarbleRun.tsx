"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const COLORS = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#DDA0DD", "#FFB347", "#87CEEB"];
const TARGET = 15;

type Marble = { id: number; color: string; x: number; y: number; vy: number; vx: number; size: number; collected: boolean };

function randInt(a: number, b: number) { return a + Math.floor(Math.random() * (b - a + 1)); }

export default function MarbleRun() {
  const [started, setStarted] = useState(false);
  const [collected, setCollected] = useState(0);
  const [done, setDone] = useState(false);
  const marblesRef = useRef<Marble[]>([]);
  const [, forceUpdate] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const idRef = useRef(0);
  const collectedRef = useRef(0);
  const animRef = useRef<number>(0);

  const spawnMarble = useCallback(() => {
    const lane = randInt(0, 2);
    const laneX = [0.2, 0.5, 0.8][lane];
    marblesRef.current.push({
      id: idRef.current++, color: COLORS[randInt(0, COLORS.length - 1)],
      x: laneX, y: -0.05, vy: 0.003 + Math.random() * 0.002,
      vx: (Math.random() - 0.5) * 0.002, size: randInt(16, 24), collected: false,
    });
  }, []);

  const collectMarble = useCallback((id: number) => {
    const m = marblesRef.current.find((m) => m.id === id);
    if (!m || m.collected) return;
    m.collected = true;
    collectedRef.current += 1;
    setCollected(collectedRef.current);
    if (collectedRef.current >= TARGET) setDone(true);
  }, []);

  useEffect(() => {
    if (!started || done) return;
    const spawnInterval = setInterval(() => {
      if (marblesRef.current.filter((m) => !m.collected).length < 5) spawnMarble();
    }, 1000);
    return () => clearInterval(spawnInterval);
  }, [started, done, spawnMarble]);

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const tick = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Draw tracks
      ctx.strokeStyle = "#dce8f8"; ctx.lineWidth = 20;
      for (const lx of [0.2, 0.5, 0.8]) {
        ctx.beginPath();
        ctx.moveTo(lx * w, 0);
        ctx.bezierCurveTo(lx * w + 30, h * 0.3, lx * w - 30, h * 0.6, lx * w, h);
        ctx.stroke();
      }

      // Draw & update marbles
      for (const m of marblesRef.current) {
        if (m.collected) continue;
        m.y += m.vy;
        m.x += m.vx;
        m.vx += (Math.random() - 0.5) * 0.0003;
        if (m.x < 0.05) m.vx = Math.abs(m.vx);
        if (m.x > 0.95) m.vx = -Math.abs(m.vx);

        if (m.y > 1.05) { m.collected = true; collectedRef.current += 1; setCollected(collectedRef.current); if (collectedRef.current >= TARGET) setDone(true); continue; }

        const mx = m.x * w, my = m.y * h;
        const grad = ctx.createRadialGradient(mx - m.size * 0.2, my - m.size * 0.2, 1, mx, my, m.size);
        grad.addColorStop(0, "rgba(255,255,255,0.7)");
        grad.addColorStop(1, m.color);
        ctx.beginPath();
        ctx.arc(mx, my, m.size, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.shadowColor = m.color; ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Collection tray
      ctx.fillStyle = "#D97706";
      ctx.fillRect(0, h - 20, w, 20);
      ctx.fillStyle = "white"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Tap marbles to catch them!", w / 2, h - 7);

      marblesRef.current = marblesRef.current.filter((m) => !m.collected || m.y <= 1.05);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [started, done]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    for (const m of marblesRef.current) {
      if (m.collected) continue;
      const dx = m.x - nx, dy = m.y - ny;
      if (Math.sqrt(dx * dx + dy * dy) < 0.06) { collectMarble(m.id); break; }
    }
  };

  const progress = Math.min((collected / TARGET) * 100, 100);

  if (done) return (
    <div className="h-full flex flex-col items-center justify-center gap-4 p-6">
      <div className="text-8xl">&#x1F52E;</div>
      <h2 className="text-3xl font-bold text-sky-600">All Marbles Collected!</h2>
      <p className="text-gray-500">{collected} marbles caught!</p>
    </div>
  );

  return (
    <div className="h-full flex flex-col gap-3 relative">
      <div className="h-2.5 bg-amber-100 rounded-full overflow-hidden mx-1">
        <div className="h-full rounded-full" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #FBBF24, #F97316)", transition: "width 0.3s" }} />
      </div>
      <div className="flex justify-between items-center px-1">
        <div className="bg-amber-50 rounded-full px-3 py-1 shadow"><span className="text-lg font-bold text-amber-700">{collected}/{TARGET}</span></div>
        <button onClick={spawnMarble} disabled={!started} className="px-4 py-1.5 text-white rounded-full font-bold shadow text-sm border-none cursor-pointer disabled:opacity-40" style={{ background: "linear-gradient(90deg, #FBBF24, #F97316)" }}>Drop!</button>
      </div>
      <div className="flex-1 relative rounded-2xl overflow-hidden" style={{ background: "linear-gradient(180deg, #E0F2FE, #BAE6FD)" }}>
        <canvas ref={canvasRef} width={400} height={500} className="absolute inset-0 w-full h-full cursor-pointer" onClick={handleCanvasClick} />
      </div>
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center bg-sky-100/90 rounded-2xl">
          <div className="bg-white rounded-3xl p-8 shadow-2xl text-center mx-4">
            <div className="text-6xl mb-4">&#x1F52E;</div>
            <p className="text-2xl font-bold text-sky-600 mb-2">Marble Run!</p>
            <p className="text-sky-400 mb-5">Tap marbles to collect {TARGET}!</p>
            <button onClick={() => { setStarted(true); setTimeout(spawnMarble, 300); }}
              className="text-white px-8 py-3 rounded-full text-lg font-bold shadow-lg border-none cursor-pointer" style={{ background: "linear-gradient(90deg, #38BDF8, #3B82F6)" }}>
              Start Run!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
