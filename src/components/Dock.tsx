'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useCallback, type ReactNode } from 'react';

/**
 * Bottom Dock — iOS-style navigation with SVG icons and Link routing.
 *
 * Routes:
 *   Talk     → /talk/core
 *   Music    → /music
 *   Games    → /games
 *   Speech   → /speech
 *   More     → overlay with remaining routes
 */

interface DockItem {
  id: string;
  label: string;
  icon: (props: { color: string }) => ReactNode;
  href: string;
}

// -- SVG Icon Components (24x24, stroke-based) --

function IconSpeechBubble({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconMusic({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function IconGamepad({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="12" x2="10" y2="12" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <line x1="15" y1="13" x2="15.01" y2="13" />
      <line x1="18" y1="11" x2="18.01" y2="11" />
      <rect x="2" y="6" width="20" height="12" rx="2" />
    </svg>
  );
}

function IconWaveform({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M8 6v12M4 9v6M16 6v12M20 9v6" />
    </svg>
  );
}

function IconGrid({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

// -- More overlay items --

interface MoreItem {
  id: string;
  label: string;
  icon: (props: { color: string }) => ReactNode;
  href: string;
}

function IconPalette({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="2" />
      <circle cx="17.5" cy="10.5" r="2" />
      <circle cx="8.5" cy="7.5" r="2" />
      <circle cx="6.5" cy="12" r="2" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}

function IconClock({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconBook({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function IconFlask({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6M12 3v7l-5 8h10l-5-8V3" />
    </svg>
  );
}

function IconTimer({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2" />
      <path d="M5 3L2 6" />
      <path d="M22 6l-3-3" />
      <path d="M12 5V3" />
      <path d="M10 3h4" />
    </svg>
  );
}

function IconToolshed({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function IconBrain({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a7 7 0 0 0-7 7c0 3 2 5.5 5 7v4h4v-4c3-1.5 5-4 5-7a7 7 0 0 0-7-7z" />
    </svg>
  );
}

function IconImage({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function IconPlus({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

const MORE_ITEMS: MoreItem[] = [
  { id: 'draw', label: 'Draw', icon: IconPalette, href: '/draw' },
  { id: 'schedule', label: 'Schedule', icon: IconClock, href: '/schedule' },
  { id: 'stories', label: 'Stories', icon: IconBook, href: '/stories' },
  { id: 'science', label: 'Science', icon: IconFlask, href: '/science' },
  { id: 'timer', label: 'Timer', icon: IconTimer, href: '/timer' },
  { id: 'toolshed', label: 'Toolshed', icon: IconToolshed, href: '/toolshed' },
  { id: 'intuition', label: 'Intuition', icon: IconBrain, href: '/intuition' },
  { id: 'vsd', label: 'Scenes', icon: IconImage, href: '/vsd' },
  { id: 'add', label: 'Add Card', icon: IconPlus, href: '/add' },
];

const DOCK_ITEMS: DockItem[] = [
  { id: 'talk', label: 'Talk', icon: IconSpeechBubble, href: '/talk/core' },
  { id: 'music', label: 'Music', icon: IconMusic, href: '/music' },
  { id: 'games', label: 'Games', icon: IconGamepad, href: '/games' },
  { id: 'speech', label: 'Speech', icon: IconWaveform, href: '/speech' },
];

interface DockProps {
  primaryColor?: string;
}

export default function Dock({ primaryColor = '#E8610A' }: DockProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isItemActive = useCallback(
    (href: string) => pathname === href || pathname?.startsWith(href + '/'),
    [pathname],
  );

  return (
    <>
      {/* More overlay + panel */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 animate-[fadeIn_0.15s_ease]"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed bottom-[80px] right-3 z-50 min-w-[160px] rounded-2xl bg-[var(--brand-bg-warm)] shadow-xl p-2 flex flex-col gap-1 animate-[slideUp_0.15s_ease]">
            {MORE_ITEMS.map((item) => {
              const active = isItemActive(item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl min-h-[48px] transition-colors hover:bg-[var(--brand-bg-accent)]"
                >
                  <item.icon color={active ? primaryColor : '#9A9088'} />
                  <span
                    className="text-sm font-medium"
                    style={{ color: active ? primaryColor : 'var(--warm-text)' }}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* CSS keyframes */}
      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(12px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>

      {/* Dock bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl border-t safe-bottom"
        style={{ backgroundColor: 'rgba(253,252,250,0.9)', borderColor: 'var(--warm-border, #E8E0D6)' }}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-around px-2 py-2">
          {DOCK_ITEMS.map((item) => {
            const active = isItemActive(item.href);
            const iconColor = active ? primaryColor : '#9A9088';
            return (
              <Link
                key={item.id}
                href={item.href}
                className="flex flex-col items-center justify-center min-w-[72px] min-h-[48px] py-1.5 transition-transform active:scale-90"
                aria-current={active ? 'page' : undefined}
              >
                <span className={`mb-0.5 transition-transform ${active ? 'scale-110' : ''}`}>
                  <item.icon color={iconColor} />
                </span>
                <span
                  className="text-[11px] font-medium"
                  style={{ color: active ? primaryColor : '#9A9088' }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className="flex flex-col items-center justify-center min-w-[72px] min-h-[48px] py-1.5 transition-transform active:scale-90 bg-transparent border-none cursor-pointer"
            aria-label="More options"
            aria-expanded={moreOpen}
          >
            <span className={`mb-0.5 transition-transform ${moreOpen ? 'scale-110' : ''}`}>
              <IconGrid color={moreOpen ? primaryColor : '#9A9088'} />
            </span>
            <span
              className="text-[11px] font-medium"
              style={{ color: moreOpen ? primaryColor : '#9A9088' }}
            >
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
