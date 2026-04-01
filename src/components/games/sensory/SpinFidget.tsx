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
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 60,
          height: 20,
          marginTop: -10,
          marginLeft: 0,
          borderRadius: 10,
          background: ARM_COLORS[i],
          transformOrigin: "0% 50%",
          transform: `rotate(${rot}deg)`,
        }}
      />
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: 24 }}>
      <h2 style={{ margin: 0, fontSize: 22, color: "#555" }}>Spin Fidget</h2>
      <p style={{ margin: 0, fontSize: 14, color: "#888" }}>Drag to spin!</p>

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
        style={{
          width: 200,
          height: 200,
          position: "relative",
          cursor: "grab",
          touchAction: "none",
          transform: `rotate(${angle}deg)`,
          userSelect: "none",
        }}
      >
        {arms}
        {/* Center circle */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 36,
            height: 36,
            marginTop: -18,
            marginLeft: -18,
            borderRadius: "50%",
            background: "#fff",
            border: "4px solid #bdbdbd",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        />
      </div>

      <p style={{ margin: 0, fontSize: 13, color: "#aaa" }}>
        {Math.abs(velocityRef.current) > 1 ? "Wheeee!" : "Give it a spin"}
      </p>
    </div>
  );
}
