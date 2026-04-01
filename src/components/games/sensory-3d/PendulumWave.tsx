"use client";
import { useState, useEffect, useRef } from "react";

const COUNT = 15;
const DURATION = 50;
const COLORS = ["#FF6B6B", "#FF9F43", "#FFE66D", "#4ECDC4", "#3B82F6", "#8B5CF6", "#EC4899"];

export default function PendulumWave() {
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [done, setDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => { if (!started || done) return; const t = setInterval(() => setTimeLeft((p) => { if (p <= 1) { clearInterval(t); setDone(true); return 0; } return p - 1; }), 1000); return () => clearInterval(t); }, [started, done]);

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let t = 0;
    const tick = () => {
      t += 0.025;
      const w = canvas.width, h = canvas.height;
      ctx.fillStyle = "#1a1a2e"; ctx.fillRect(0, 0, w, h);
      // Top bar
      ctx.fillStyle = "#333"; ctx.fillRect(w * 0.05, h * 0.08, w * 0.9, 6);
      for (let i = 0; i < COUNT; i++) {
        const freq = 0.8 + i * 0.06;
        const angle = Math.sin(t * freq) * 0.8;
        const pivotX = w * 0.1 + (i / (COUNT - 1)) * w * 0.8;
        const pivotY = h * 0.1;
        const length = h * 0.45;
        const bobX = pivotX + Math.sin(angle) * length;
        const bobY = pivotY + Math.cos(angle) * length;
        const color = COLORS[i % COLORS.length];
        // String
        ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pivotX, pivotY); ctx.lineTo(bobX, bobY); ctx.stroke();
        // Bob
        const r = 10;
        const grad = ctx.createRadialGradient(bobX - 2, bobY - 2, 1, bobX, bobY, r);
        grad.addColorStop(0, "rgba(255,255,255,0.5)"); grad.addColorStop(1, color);
        ctx.beginPath(); ctx.arc(bobX, bobY, r, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
        // Trail
        ctx.beginPath(); ctx.arc(bobX, bobY, r + 4, 0, Math.PI * 2);
        ctx.fillStyle = color + "22"; ctx.fill();
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [started]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl" style={{ background: "#1a1a2e" }}>
      {started && !done && <div className="absolute top-4 right-4 z-20 rounded-full px-4 py-2 text-white font-bold" style={{ background: "rgba(255,255,255,0.1)" }}>{timeLeft}s</div>}
      <canvas ref={canvasRef} width={400} height={600} className="absolute inset-0 w-full h-full" />
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer" onClick={() => setStarted(true)}>
          <div className="text-center px-10 py-10 rounded-3xl border border-white/15" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="text-7xl mb-5">&#x1F4A0;</div>
            <p className="text-3xl font-bold text-purple-300 mb-2">Pendulum Wave</p>
            <p className="text-lg text-white/60">Watch the mesmerizing pattern</p>
            <div className="mt-6 text-purple-400 font-semibold text-lg">Tap to begin</div>
          </div>
        </div>
      )}
      {done && (
        <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "rgba(26,26,46,0.92)" }}>
          <div className="text-center"><div className="text-9xl mb-6">&#x1F31F;</div><h3 className="text-4xl font-bold text-white">Hypnotic!</h3></div>
        </div>
      )}
    </div>
  );
}
