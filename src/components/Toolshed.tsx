'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  TOOLS,
  TOOL_CATEGORIES,
  TOOLSHED_NAME,
  getToolsByCategory,
  getTotalStars,
  type Tool,
  type ToolCategory,
} from '@/lib/toolshed';

/**
 * Toolshed — visual grid of tools with categories, star counts,
 * and unlock states. CSS-only animations (no Framer Motion).
 */

export function Toolshed() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | null>(null);
  const totalStars = getTotalStars();

  const handleToolTap = useCallback(
    (tool: Tool) => {
      if (!tool.unlocked) return;
      router.push(tool.route);
    },
    [router],
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="w-12">
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl active:scale-90 transition-transform"
            >
              ←
            </button>
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-800">
          {selectedCategory
            ? TOOL_CATEGORIES.find((c) => c.id === selectedCategory)?.name ?? selectedCategory
            : TOOLSHED_NAME}
        </h1>
        <div className="flex items-center gap-2 bg-yellow-100 px-3 py-2 rounded-full">
          <span className="text-2xl">⭐</span>
          <span className="text-xl font-bold text-yellow-700">{totalStars}</span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-4 overflow-hidden">
        {selectedCategory ? (
          <ToolGrid
            tools={getToolsByCategory(selectedCategory)}
            onToolTap={handleToolTap}
          />
        ) : (
          <CategoryGrid
            onCategoryTap={setSelectedCategory}
          />
        )}
      </div>
    </div>
  );
}

/* ---- Category Grid ---- */

function CategoryGrid({ onCategoryTap }: { onCategoryTap: (c: ToolCategory) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
      {TOOL_CATEGORIES.map((cat) => {
        const tools = getToolsByCategory(cat.id);
        const unlocked = tools.filter((t) => t.unlocked).length;
        return (
          <button
            key={cat.id}
            onClick={() => onCategoryTap(cat.id)}
            className="aspect-square rounded-3xl shadow-lg flex flex-col items-center justify-center gap-3 p-4 active:scale-95 transition-transform"
            style={{ backgroundColor: cat.color }}
          >
            <span className="text-5xl">{cat.icon}</span>
            <span className="text-xl font-bold text-white drop-shadow-sm">{cat.name}</span>
            <span className="text-sm text-white/80">
              {unlocked} / {tools.length}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---- Tool Grid ---- */

function ToolGrid({ tools, onToolTap }: { tools: Tool[]; onToolTap: (t: Tool) => void }) {
  return (
    <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onToolTap(tool)}
          disabled={!tool.unlocked}
          className={`
            aspect-square rounded-2xl shadow-lg flex flex-col items-center justify-center gap-2 p-3
            relative overflow-hidden active:scale-90 transition-transform
            ${!tool.unlocked ? 'opacity-50 grayscale' : ''}
          `}
          style={{ backgroundColor: tool.color }}
        >
          <span className="text-4xl">{tool.icon}</span>
          <span className="text-sm font-bold text-white drop-shadow-sm text-center">{tool.name}</span>

          {tool.stars > 0 && (
            <div className="absolute top-1 right-1 bg-yellow-400 rounded-full px-2 py-0.5 flex items-center gap-1">
              <span className="text-xs">⭐</span>
              <span className="text-xs font-bold">{tool.stars}</span>
            </div>
          )}

          {!tool.unlocked && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <span className="text-3xl">🔒</span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

export default Toolshed;
