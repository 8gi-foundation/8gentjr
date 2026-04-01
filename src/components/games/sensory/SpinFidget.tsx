"use client";

import { useState, useRef, useCallback, useEffect } from "react";

/* ── Constants ───────────────────────────────────────────── */

const ARMS = 3;
const ARM_COLORS = ["#FF7043", "#42A5F5", "#66BB6A"];
const FRICTION = 0.995;
const MIN_VELOCITY = 0.05;

/* ── Component ───────────────────────────────────────────── */

export default function SpinFidget() {
  const [angle, setAngle] = useState(0);
  const velocityRef = useRef(0);
  const animRef = useRef<number>(0);
  const dragging = useRef(false);
  const lastAngle = useRef(0);
  const lastTime = useRef(0);
  const centerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  /* ── Momentum loop ── */
  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      if (!dragging.current && Math.abs(velocityRef.current) > MIN_VELOCITY) {
        velocityRef.current *= FRICTION;
        setAngle((a) => a + velocityRef.current);
      } else if (!dragging.current) {
        velocityRef.current = 0;
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  const getAngleFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      const dx = clientX - centerRef.current.x;
      const dy = clientY - centerRef.current.y;
      return Math.atan2(dy, dx) * (180 / Math.PI);
    },
    []
  );

  const onStart = useCallback(
    (clientX: number, clientY: number) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        centerRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }
      dragging.current = true;
      velocityRef.current = 0;
      lastAngle.current = getAngleFromEvent(clientX, clientY);
      lastTime.current = performance.now();
    },
    [getAngleFromEvent]
  );

  const onMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!dragging.current) return;
      const now = performance.now();
      const curr = getAngleFromEvent(clientX, clientY);
      let delta = curr - lastAngle.current;
      // Handle wrap-around
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      const dt = now - lastTime.current || 1;
      velocityRef.current = delta / dt * 16; // normalize to ~60fps
      setAngle((a) => a + delta);
      lastAngle.current = curr;
      lastTime.current = now;
    },
    [getAngleFromEvent]
  );

  const onEnd = useCallback(() => {
    dragging.current = false;
  }, []);

  /* ── Mouse handlers ── */
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => onStart(e.clientX, e.clientY),
    [onStart]
  );
  const onMouseMove = useCallback(
    (e: React.MouseEvent) => onMove(e.clientX, e.clientY),
    [onMove]
  );
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      onStart(t.clientX, t.clientY);
    },
    [onStart]
  );
  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      onMove(t.clientX, t.clientY);
    },
    [onMove]
  );

  /* ── Render arms ── */
  const arms = Array.from({ length: ARMS }, (_, i) => {
    const rot = (360 / ARMS) * i;
    return (
      <div
        key={i}
        className="absolute top-1/2 left-1/2 w-[60px] h-5 -mt-2.5 ml-0 rounded-[10px]"
        style={{
          background: ARM_COLORS[i],
          transformOrigin: "0% 50%",
          transform: `rotate(${rot}deg)`,
        }}
      />
    );
  });

  return (
    <div className="flex flex-col items-center gap-5 p-6">
      <h2 className="m-0 text-[22px] text-gray-600">Spin Fidget</h2>
      <p className="m-0 text-sm text-gray-400">Drag to spin!</p>

      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onEnd}
        role="img"
        aria-label="Fidget spinner"
        className="w-[200px] h-[200px] relative cursor-grab touch-none select-none"
        style={{ transform: `rotate(${angle}deg)` }}
      >
        {arms}
        {/* Center circle */}
        <div className="absolute top-1/2 left-1/2 w-9 h-9 -mt-[18px] -ml-[18px] rounded-full bg-white border-4 border-gray-400 shadow-md" />
      </div>

      <p className="m-0 text-[13px] text-gray-400">
        {Math.abs(velocityRef.current) > 1 ? "Wheeee!" : "Give it a spin"}
      </p>
    </div>
  );
}
