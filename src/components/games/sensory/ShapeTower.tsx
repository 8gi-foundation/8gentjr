"use client";

import { useState, useCallback, useRef } from "react";

const SHAPES = ["circle", "square", "triangle", "star", "hexagon", "diamond"];
const SHAPE_COLORS = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#DDA0DD", "#95E1D3", "#FFB347", "#87CEEB"];
const TARGET = 12;

type StackedShape = { id: number; shape: string; color: string; size: number };

function renderShapeSVG(shape: string, color: string, size: number) {
  const h = size, w = size, cx = w / 2, cy = h / 2, r = Math.min(cx, cy) - 2;
  switch (shape) {
    case "circle": return <circle cx={cx} cy={cy} r={r} fill={color} />;
    case "square": return <rect x={3} y={3} width={w - 6} height={h - 6} fill={color} rx={6} />;
    case "triangle": return <polygon points={`${cx},3 ${w - 3},${h - 3} 3,${h - 3}`} fill={color} />;
    case "star": {
      const pts = []; for (let i = 0; i < 10; i++) { const rad = i % 2 === 0 ? r : r * 0.42; const ang = (Math.PI / 5) * i - Math.PI / 2; pts.push(`${cx + rad * Math.cos(ang)},${cy + rad * Math.sin(ang)}`); }
      return <polygon points={pts.join(" ")} fill={color} />;
    }
    case "hexagon": {
      const pts = []; for (let i = 0; i < 6; i++) { const ang = (Math.PI / 3) * i - Math.PI / 2; pts.push(`${cx + r * Math.cos(ang)},${cy + r * Math.sin(ang)}`); }
      return <polygon points={pts.join(" ")} fill={color} />;
    }
    case "diamond": return <polygon points={`${cx},3 ${w - 3},${cy} ${cx},${h - 3} 3,${cy}`} fill={color} />;
    default: return null;
  }
}

export default function ShapeTower() {
  const [started, setStarted] = useState(false);
  const [stack, setStack] = useState<StackedShape[]>([]);
  const [currentShape, setCurrentShape] = useState(SHAPES[0]);
  const [currentColor, setCurrentColor] = useState(SHAPE_COLORS[0]);
  const [done, setDone] = useState(false);
  const countRef = useRef(0);

  const addShape = useCallback(() => {
    if (!started || countRef.current >= TARGET) return;
    const newShape: StackedShape = { id: Date.now() + Math.random(), shape: currentShape, color: currentColor, size: 60 - countRef.current * 2.5 };
    setStack((prev) => [...prev, newShape]);
    countRef.current += 1;
    if (countRef.current >= TARGET) setDone(true);
  }, [started, currentShape, currentColor]);

  const progress = Math.min((stack.length / TARGET) * 100, 100);

  if (done) return (
    <div className="h-full flex flex-col items-center justify-center gap-4 p-6">
      <div className="text-8xl">&#x1F3D7;\uFE0F</div>
      <h2 className="text-3xl font-bold text-purple-700">Amazing Tower!</h2>
      <p className="text-purple-400">{stack.length} blocks stacked!</p>
    </div>
  );

  return (
    <div className="h-full flex flex-col gap-3 relative">
      <div className="h-2.5 bg-purple-100 rounded-full overflow-hidden mx-1">
        <div className="h-full rounded-full" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #A855F7, #EC4899)", transition: "width 0.3s" }} />
      </div>
      <div className="flex justify-center"><div className="bg-purple-50 rounded-full px-4 py-1.5 shadow"><span className="text-base font-bold text-purple-700">{stack.length}/{TARGET} blocks</span></div></div>
      <div className="flex justify-center gap-2 flex-wrap px-1">
        {SHAPES.map((s) => (
          <button key={s} onClick={() => setCurrentShape(s)} className="w-11 h-11 rounded-xl bg-white shadow-md flex items-center justify-center border-none cursor-pointer"
            style={{ border: currentShape === s ? `3px solid ${currentColor}` : "3px solid transparent" }}>
            <svg width="28" height="28" viewBox="0 0 28 28">{renderShapeSVG(s, currentShape === s ? currentColor : "#ccc", 28)}</svg>
          </button>
        ))}
      </div>
      <div className="flex justify-center gap-2">
        {SHAPE_COLORS.map((c) => (
          <button key={c} onClick={() => setCurrentColor(c)} className="w-8 h-8 rounded-full shadow-md border-none cursor-pointer"
            style={{ backgroundColor: c, border: currentColor === c ? "3px solid white" : "3px solid transparent", boxShadow: currentColor === c ? `0 0 10px ${c}` : undefined }} />
        ))}
      </div>
      <div className="flex-1 relative rounded-2xl overflow-hidden cursor-pointer" style={{ background: "linear-gradient(180deg, #E0F2FE, #BAE6FD)" }} onClick={addShape}>
        <div className="absolute top-3 left-6 w-8 h-4 bg-white/60 rounded-full" />
        <div className="absolute top-5 left-12 w-12 h-5 bg-white/60 rounded-full" />
        <div className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none" style={{ background: "linear-gradient(0deg, #16A34A, #22C55E)" }} />
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-36 h-5 bg-amber-700 rounded-t-lg shadow-lg pointer-events-none" />
        <div className="absolute bottom-11 left-1/2 -translate-x-1/2 flex flex-col-reverse items-center pointer-events-none">
          {stack.map((item, i) => (
            <div key={item.id} style={{ marginTop: i > 0 ? -10 : 0 }}>
              <svg width={item.size} height={item.size} viewBox={`0 0 ${item.size} ${item.size}`} style={{ filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.22))" }}>
                {renderShapeSVG(item.shape, item.color, item.size)}
              </svg>
            </div>
          ))}
        </div>
        {started && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
            <svg width={52} height={52} viewBox="0 0 52 52" style={{ filter: "drop-shadow(0 5px 10px rgba(0,0,0,0.3))" }}>
              {renderShapeSVG(currentShape, currentColor, 52)}
            </svg>
            <p className="text-sm font-bold text-white" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>Tap to drop!</p>
          </div>
        )}
      </div>
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center bg-sky-100/90 rounded-2xl">
          <div className="bg-white rounded-3xl p-8 shadow-2xl text-center mx-4">
            <div className="text-6xl mb-4">&#x1F3D7;\uFE0F</div>
            <p className="text-2xl font-bold text-purple-700 mb-2">Shape Tower!</p>
            <p className="text-purple-400 mb-5">Stack {TARGET} blocks to the sky!</p>
            <button onClick={() => setStarted(true)} className="text-white px-8 py-3 rounded-full text-lg font-bold shadow-lg border-none cursor-pointer" style={{ background: "linear-gradient(90deg, #A855F7, #EC4899)" }}>Build!</button>
          </div>
        </div>
      )}
    </div>
  );
}
