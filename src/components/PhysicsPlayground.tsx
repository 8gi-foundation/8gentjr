'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

type Mode = 'particles' | 'projectile' | 'pendulum';
interface Particle { x: number; y: number; vx: number; vy: number; color: string; trail: { x: number; y: number }[] }

const COLORS = ['#FF4444', '#FF8800', '#FFDD00', '#44DD44', '#00CCCC', '#4488FF', '#DD44FF'];

const pop = () => {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 400 + Math.random() * 600;
    o.type = 'sine';
    g.gain.value = 0.08;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    o.stop(ctx.currentTime + 0.1);
  } catch { /* silent */ }
};

const MODES: { id: Mode; emoji: string; label: string }[] = [
  { id: 'particles', emoji: '\u2728', label: 'Particles' },
  { id: 'projectile', emoji: '\uD83D\uDE80', label: 'Launch' },
  { id: 'pendulum', emoji: '\uD83D\uDD34', label: 'Swing' },
];

export default function PhysicsPlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>('particles');
  const [gravity, setGravity] = useState(0.5);
  const [power, setPower] = useState(0.6);
  const [pendLen, setPendLen] = useState(0.5);

  const state = useRef<{
    particles: Particle[];
    aiming: boolean;
    aimStart: { x: number; y: number } | null;
    aimEnd: { x: number; y: number } | null;
    ball: { x: number; y: number; vx: number; vy: number; trail: { x: number; y: number }[]; active: boolean };
    pend: { angle: number; angVel: number; dragging: boolean; trail: { x: number; y: number; t: number }[] };
  }>({
    particles: [],
    aiming: false,
    aimStart: null,
    aimEnd: null,
    ball: { x: 0, y: 0, vx: 0, vy: 0, trail: [], active: false },
    pend: { angle: Math.PI / 4, angVel: 0, dragging: false, trail: [] },
  });

  const modeRef = useRef(mode);
  const gravRef = useRef(gravity);
  const powRef = useRef(power);
  const lenRef = useRef(pendLen);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { gravRef.current = gravity; }, [gravity]);
  useEffect(() => { powRef.current = power; }, [power]);
  useEffect(() => { lenRef.current = pendLen; }, [pendLen]);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    const t = 'touches' in e ? e.touches[0] || (e as React.TouchEvent).changedTouches[0] : e;
    return { x: ((t as unknown as { clientX: number }).clientX - r.left) * 2, y: ((t as unknown as { clientY: number }).clientY - r.top) * 2 };
  }, []);

  const handleDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const p = getPos(e);
    const s = state.current;
    if (modeRef.current === 'particles') {
      const col = COLORS[Math.floor(Math.random() * COLORS.length)];
      s.particles.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 8, vy: -Math.random() * 10 - 2, color: col, trail: [] });
      if (s.particles.length > 100) s.particles.shift();
      pop();
    } else if (modeRef.current === 'projectile') {
      s.aiming = true; s.aimStart = p; s.aimEnd = p;
    } else {
      const c = canvasRef.current!;
      const cx = c.width / 2, cy = c.height * 0.2;
      const L = lenRef.current * c.height * 0.5 + 80;
      const bx = cx + Math.sin(s.pend.angle) * L;
      const by = cy + Math.cos(s.pend.angle) * L;
      if (Math.hypot(p.x - bx, p.y - by) < 60) {
        s.pend.dragging = true;
        s.pend.angVel = 0;
      }
    }
  }, [getPos]);

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const p = getPos(e);
    const s = state.current;
    if (modeRef.current === 'projectile' && s.aiming) s.aimEnd = p;
    if (modeRef.current === 'pendulum' && s.pend.dragging) {
      const c = canvasRef.current!;
      const cx = c.width / 2, cy = c.height * 0.2;
      s.pend.angle = Math.atan2(p.x - cx, p.y - cy);
    }
  }, [getPos]);

  const handleUp = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const s = state.current;
    if (modeRef.current === 'projectile' && s.aiming && s.aimStart && s.aimEnd) {
      const dx = s.aimStart.x - s.aimEnd.x, dy = s.aimStart.y - s.aimEnd.y;
      const pw = powRef.current * 0.03;
      s.ball = { x: s.aimStart.x, y: s.aimStart.y, vx: dx * pw, vy: dy * pw, trail: [], active: true };
      s.aiming = false; s.aimStart = null; s.aimEnd = null;
      pop();
    }
    if (modeRef.current === 'pendulum') s.pend.dragging = false;
  }, []);

  const shake = useCallback(() => {
    state.current.particles.forEach(p => {
      p.vx += (Math.random() - 0.5) * 20;
      p.vy += (Math.random() - 0.5) * 20;
    });
  }, []);

  const clear = useCallback(() => { state.current.particles = []; }, []);

  useEffect(() => {
    const c = canvasRef.current!;
    const ctx = c.getContext('2d')!;
    let raf: number;

    const resize = () => {
      c.width = c.clientWidth * 2;
      c.height = c.clientHeight * 2;
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = () => {
      const W = c.width, H = c.height;
      const s = state.current;
      const g = gravRef.current * 9.8;

      ctx.fillStyle = 'rgba(20,20,30,0.15)';
      ctx.fillRect(0, 0, W, H);

      if (modeRef.current === 'particles') {
        for (const p of s.particles) {
          p.vy += g * 0.03;
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 8) { p.x = 8; p.vx *= -0.8; }
          if (p.x > W - 8) { p.x = W - 8; p.vx *= -0.8; }
          if (p.y > H - 8) { p.y = H - 8; p.vy *= -0.8; }
          if (p.y < 8) { p.y = 8; p.vy *= -0.8; }
          p.trail.push({ x: p.x, y: p.y });
          if (p.trail.length > 12) p.trail.shift();
          for (let i = 1; i < p.trail.length; i++) {
            ctx.beginPath();
            ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y);
            ctx.lineTo(p.trail[i].x, p.trail[i].y);
            ctx.strokeStyle = p.color + Math.floor((i / p.trail.length) * 200).toString(16).padStart(2, '0');
            ctx.lineWidth = (i / p.trail.length) * 6;
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 12;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      } else if (modeRef.current === 'projectile') {
        ctx.fillStyle = 'rgba(20,20,30,1)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#334433';
        ctx.fillRect(0, H - 30, W, 30);

        const b = s.ball;
        if (b.active) {
          b.vy += g * 0.03;
          b.x += b.vx;
          b.y += b.vy;
          if (b.y > H - 40) { b.y = H - 40; b.vy *= -0.6; b.vx *= 0.95; if (Math.abs(b.vy) < 0.5) b.vy = 0; }
          if (b.x < 10 || b.x > W - 10) b.vx *= -0.8;
          b.trail.push({ x: b.x, y: b.y });
          if (b.trail.length > 80) b.trail.shift();
          for (let i = 1; i < b.trail.length; i++) {
            ctx.beginPath();
            ctx.moveTo(b.trail[i - 1].x, b.trail[i - 1].y);
            ctx.lineTo(b.trail[i].x, b.trail[i].y);
            const a = i / b.trail.length;
            ctx.strokeStyle = `rgba(255,${100 + i * 2},50,${a})`;
            ctx.lineWidth = a * 5;
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.arc(b.x, b.y, 14, 0, Math.PI * 2);
          ctx.fillStyle = '#FF6622';
          ctx.shadowColor = '#FF6622';
          ctx.shadowBlur = 16;
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Cannon
        ctx.fillStyle = '#666';
        ctx.fillRect(20, H - 70, 50, 40);
        ctx.beginPath();
        ctx.arc(45, H - 70, 25, 0, Math.PI * 2);
        ctx.fillStyle = '#888';
        ctx.fill();

        // Aim line
        if (s.aiming && s.aimStart && s.aimEnd) {
          const dx = s.aimStart.x - s.aimEnd.x, dy = s.aimStart.y - s.aimEnd.y;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.moveTo(s.aimStart.x, s.aimStart.y);
          const pw = powRef.current * 0.03;
          let px = s.aimStart.x, py = s.aimStart.y, pvx = dx * pw, pvy = dy * pw;
          for (let i = 0; i < 40; i++) {
            pvy += g * 0.03;
            px += pvx;
            py += pvy;
            if (py > H - 40) break;
            ctx.lineTo(px, py);
          }
          ctx.strokeStyle = 'rgba(255,255,100,0.6)';
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else {
        // Pendulum
        ctx.fillStyle = 'rgba(20,20,30,1)';
        ctx.fillRect(0, 0, W, H);
        const cx = W / 2, cy = H * 0.2, L = lenRef.current * H * 0.5 + 80;
        const pnd = s.pend;
        if (!pnd.dragging) {
          const acc = -g / L * Math.sin(pnd.angle) * 0.5;
          pnd.angVel += acc;
          pnd.angVel *= 0.999;
          pnd.angle += pnd.angVel;
        }
        const bx = cx + Math.sin(pnd.angle) * L;
        const by = cy + Math.cos(pnd.angle) * L;
        pnd.trail.push({ x: bx, y: by, t: Date.now() });
        if (pnd.trail.length > 60) pnd.trail.shift();
        for (let i = 1; i < pnd.trail.length; i++) {
          const a = i / pnd.trail.length;
          ctx.beginPath();
          ctx.moveTo(pnd.trail[i - 1].x, pnd.trail[i - 1].y);
          ctx.lineTo(pnd.trail[i].x, pnd.trail[i].y);
          const hue = (i * 6) % 360;
          ctx.strokeStyle = `hsla(${hue},80%,60%,${a * 0.5})`;
          ctx.lineWidth = a * 4;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(bx, by);
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 3;
        ctx.stroke();
        const speed = Math.abs(pnd.angVel);
        const brightness = 50 + speed * 200;
        ctx.beginPath();
        ctx.arc(bx, by, 24, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(160,80%,${Math.min(brightness, 90)}%)`;
        ctx.shadowColor = `hsl(160,80%,${Math.min(brightness, 90)}%)`;
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#666';
        ctx.fill();
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#14141e', userSelect: 'none', touchAction: 'none' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 16px', background: '#E8610A', flexShrink: 0 }}>
        <a href="/" style={{ position: 'absolute', left: 16, color: '#fff', fontWeight: 700, fontSize: 18, textDecoration: 'none', cursor: 'pointer' }}>
          &larr; Home
        </a>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 20 }}>
          Science Lab
        </span>
      </div>

      {/* Mode Selector */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: '#1e1e2e', flexShrink: 0, justifyContent: 'center' }}>
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 20px', borderRadius: 20, border: 'none',
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
              background: mode === m.id ? '#E8610A' : '#333',
              color: mode === m.id ? '#fff' : '#999',
              transition: 'all 0.15s',
            }}
          >
            {m.emoji} {m.label}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{ flex: 1, width: '100%', cursor: 'crosshair' }}
        onMouseDown={handleDown}
        onMouseMove={handleMove}
        onMouseUp={handleUp}
        onTouchStart={handleDown}
        onTouchMove={handleMove}
        onTouchEnd={handleUp}
      />

      {/* Controls */}
      <div style={{ padding: '12px 16px', background: 'rgba(30,30,46,0.9)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        {mode === 'particles' && (
          <>
            <span style={{ fontSize: 12, color: '#999', width: 48 }}>Gravity</span>
            <input type="range" min="0" max="1" step="0.01" value={gravity}
              onChange={e => setGravity(+e.target.value)}
              style={{ flex: 1, height: 8, accentColor: '#E8610A' }} />
            <button onClick={shake}
              style={{ padding: '8px 14px', background: '#FFB300', borderRadius: 12, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Shake!
            </button>
            <button onClick={clear}
              style={{ padding: '8px 14px', background: '#E53935', borderRadius: 12, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Clear
            </button>
          </>
        )}
        {mode === 'projectile' && (
          <>
            <span style={{ fontSize: 12, color: '#999', width: 48 }}>Power</span>
            <input type="range" min="0.1" max="1" step="0.01" value={power}
              onChange={e => setPower(+e.target.value)}
              style={{ flex: 1, height: 8, accentColor: '#FF6622' }} />
            <span style={{ fontSize: 12, color: '#999', width: 48 }}>Gravity</span>
            <input type="range" min="0" max="1" step="0.01" value={gravity}
              onChange={e => setGravity(+e.target.value)}
              style={{ flex: 1, height: 8, accentColor: '#FF6622' }} />
          </>
        )}
        {mode === 'pendulum' && (
          <>
            <span style={{ fontSize: 12, color: '#999', width: 48 }}>String</span>
            <input type="range" min="0.2" max="1" step="0.01" value={pendLen}
              onChange={e => setPendLen(+e.target.value)}
              style={{ flex: 1, height: 8, accentColor: '#26A69A' }} />
            <span style={{ fontSize: 12, color: '#999', width: 48 }}>Gravity</span>
            <input type="range" min="0.1" max="1" step="0.01" value={gravity}
              onChange={e => setGravity(+e.target.value)}
              style={{ flex: 1, height: 8, accentColor: '#26A69A' }} />
          </>
        )}
      </div>
    </div>
  );
}
