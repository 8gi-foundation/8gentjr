"use client";
import { useState, useEffect, useRef } from "react";

const COLORS = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#DDA0DD", "#95E1D3", "#FFB347", "#87CEEB", "#FFB6C1"];
const NOTES = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25]; // C4 to C5

type MusicalBall = { x: number; y: number; vx: number; vy: number; r: number; color: string; noteIdx: number; bounceGlow: number };

export default function MusicalBalls() {
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ballsRef = useRef<MusicalBall[]>(
    Array.from({ length: 8 }, (_, i) => ({
      x: 0.15 + Math.random() * 0.7, y: 0.15 + Math.random() * 0.5, vx: (Math.random() - 0.5) * 0.006,
      vy: (Math.random() - 0.5) * 0.006, r: 18 + Math.random() * 8, color: COLORS[i],
      noteIdx: i, bounceGlow: 0,
    }))
  );

  const playNote = (freq: number) => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = "sine"; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  };

  useEffect(() => { if (!started || done) return; const t = setInterval(() => setTimeLeft((p) => { if (p <= 1) { clearInterval(t); setDone(true); return 0; } return p - 1; }), 1000); return () => clearInterval(t); }, [started, done]);

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const tick = () => {
      const w = canvas.width, h = canvas.height;
      ctx.fillStyle = "rgba(15,15,35,0.1)"; ctx.fillRect(0, 0, w, h);
      for (const b of ballsRef.current) {
        b.x += b.vx; b.y += b.vy;
        b.bounceGlow = Math.max(0, b.bounceGlow - 0.02);
        // Wall bounces with sound
        if (b.x - b.r / w < 0 || b.x + b.r / w > 1) { b.vx *= -1; b.bounceGlow = 1; playNote(NOTES[b.noteIdx]); }
        if (b.y - b.r / h < 0 || b.y + b.r / h > 1) { b.vy *= -1; b.bounceGlow = 1; playNote(NOTES[b.noteIdx]); }
        b.x = Math.max(b.r / w, Math.min(1 - b.r / w, b.x));
        b.y = Math.max(b.r / h, Math.min(1 - b.r / h, b.y));
        // Ball-ball collision
        for (const other of ballsRef.current) {
          if (other === b) continue;
          const dx = other.x - b.x, dy = other.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = (b.r + other.r) / Math.min(w, h);
          if (dist < minDist && dist > 0) {
            const nx = dx / dist, ny = dy / dist;
            b.vx -= nx * 0.002; b.vy -= ny * 0.002;
            other.vx += nx * 0.002; other.vy += ny * 0.002;
            b.bounceGlow = 1; other.bounceGlow = 1;
            playNote(NOTES[b.noteIdx]);
          }
        }
        const glowR = b.r + b.bounceGlow * 12;
        if (b.bounceGlow > 0) {
          const glow = ctx.createRadialGradient(b.x * w, b.y * h, b.r, b.x * w, b.y * h, glowR);
          glow.addColorStop(0, b.color + "44"); glow.addColorStop(1, "transparent");
          ctx.beginPath(); ctx.arc(b.x * w, b.y * h, glowR, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill();
        }
        const grad = ctx.createRadialGradient(b.x * w - 3, b.y * h - 3, 2, b.x * w, b.y * h, b.r);
        grad.addColorStop(0, "rgba(255,255,255,0.5)"); grad.addColorStop(1, b.color);
        ctx.beginPath(); ctx.arc(b.x * w, b.y * h, b.r, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
      }
      animRef.current = requestAnimationFrame(tick);
    };
    ctx.fillStyle = "#0f0f23"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [started]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl" style={{ background: "#0f0f23" }}>
      {started && !done && <div className="absolute top-4 right-4 z-20 rounded-full px-4 py-2 text-white font-bold" style={{ background: "rgba(255,255,255,0.1)" }}>{timeLeft}s</div>}
      <canvas ref={canvasRef} width={400} height={600} className="absolute inset-0 w-full h-full" />
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer" onClick={() => setStarted(true)}>
          <div className="text-center px-10 py-10 rounded-3xl border border-white/15" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="text-7xl mb-5">&#x1F3B5;</div>
            <p className="text-3xl font-bold text-pink-300 mb-2">Musical Balls</p>
            <p className="text-lg text-white/60">Watch and listen as balls create music</p>
            <div className="mt-6 text-pink-400 font-semibold text-lg">Tap to begin</div>
          </div>
        </div>
      )}
      {done && (
        <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "rgba(15,15,35,0.92)" }}>
          <div className="text-center"><div className="text-9xl mb-6">&#x1F3B5;</div><h3 className="text-4xl font-bold text-white">Beautiful Music!</h3></div>
        </div>
      )}
    </div>
  );
}
