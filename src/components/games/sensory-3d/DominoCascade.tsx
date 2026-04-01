"use client";
import { useState, useEffect, useRef } from "react";

const DOMINO_COUNT = 20;
const COLORS = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#DDA0DD", "#95E1D3", "#FFB347"];

type Domino = { x: number; y: number; angle: number; targetAngle: number; color: string; fallen: boolean };

export default function DominoCascade() {
  const [started, setStarted] = useState(false);
  const [tapped, setTapped] = useState(false);
  const [done, setDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const dominoesRef = useRef<Domino[]>(
    Array.from({ length: DOMINO_COUNT }, (_, i) => ({
      x: 0.08 + (i / DOMINO_COUNT) * 0.84, y: 0.7, angle: 0, targetAngle: 0,
      color: COLORS[i % COLORS.length], fallen: false,
    }))
  );

  const triggerFall = () => {
    if (tapped) return;
    setTapped(true);
    let delay = 0;
    for (let i = 0; i < dominoesRef.current.length; i++) {
      setTimeout(() => {
        dominoesRef.current[i].targetAngle = Math.PI / 2.5;
        dominoesRef.current[i].fallen = true;
        if (i === dominoesRef.current.length - 1) setTimeout(() => setDone(true), 800);
      }, delay);
      delay += 120;
    }
  };

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const tick = () => {
      const w = canvas.width, h = canvas.height;
      ctx.fillStyle = "#f0f4f8"; ctx.fillRect(0, 0, w, h);
      // Ground
      ctx.fillStyle = "#8B4513"; ctx.fillRect(0, h * 0.82, w, h * 0.18);
      ctx.fillStyle = "#A0522D"; ctx.fillRect(0, h * 0.82, w, 4);
      for (const d of dominoesRef.current) {
        d.angle += (d.targetAngle - d.angle) * 0.08;
        const dx = d.x * w, dy = d.y * h;
        ctx.save(); ctx.translate(dx, dy); ctx.rotate(d.angle);
        const dw = 14, dh = 50;
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.roundRect(-dw / 2, -dh, dw, dh, 3);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 1; ctx.stroke();
        // Dots
        ctx.fillStyle = "white";
        ctx.beginPath(); ctx.arc(0, -dh * 0.3, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(0, -dh * 0.7, 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [started]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl" style={{ background: "#f0f4f8" }}>
      <canvas ref={canvasRef} width={400} height={600} className="absolute inset-0 w-full h-full cursor-pointer"
        onClick={() => { if (started && !tapped) triggerFall(); }} />
      {started && !tapped && <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/90 rounded-full px-5 py-2 shadow font-bold text-gray-700">Tap to push the first domino!</div>}
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer bg-gray-100/90" onClick={() => setStarted(true)}>
          <div className="text-center bg-white rounded-3xl p-8 shadow-2xl mx-4">
            <div className="text-7xl mb-4">&#x1F3B2;</div>
            <p className="text-2xl font-bold text-gray-700 mb-2">Domino Cascade</p>
            <p className="text-gray-400 mb-4">Watch them all fall!</p>
            <div className="text-blue-500 font-semibold text-lg">Tap to start</div>
          </div>
        </div>
      )}
      {done && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/80">
          <div className="text-center"><div className="text-9xl mb-6">&#x1F389;</div><h3 className="text-4xl font-bold text-gray-700">Cascade Complete!</h3></div>
        </div>
      )}
    </div>
  );
}
