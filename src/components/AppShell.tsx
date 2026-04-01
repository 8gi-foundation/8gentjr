"use client";

/**
 * AppShell — Root layout wrapper that applies the child-first warm theme.
 *
 * Responsibilities:
 * - Warm background (never pure white)
 * - Consistent padding
 * - Safe area insets for mobile (notch, home indicator)
 * - Provides theme context to children
 *
 * @see https://github.com/8gi-foundation/8gentjr/issues/11
 */

import React, { createContext, useContext } from "react";
import theme from "@/styles/theme";

// ---------------------------------------------------------------------------
// Theme Context
// ---------------------------------------------------------------------------

const ThemeContext = createContext(theme);

/** Hook to access design tokens from any child component */
export function useTheme() {
  return useContext(ThemeContext);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface AppShellProps {
  children: React.ReactNode;
  /** Override padding (default: theme.spacing.md) */
  padding?: number;
  /** Disable the warm background (e.g. for full-bleed pages like Draw) */
  transparentBg?: boolean;
}

export default function AppShell({
  children,
  padding = theme.spacing.md,
  transparentBg = false,
}: AppShellProps) {
  return (
    <ThemeContext.Provider value={theme}>
      <div
        style={{
          minHeight: "100dvh",
          background: transparentBg ? "transparent" : theme.colors.background,
          color: theme.colors.text,
          fontFamily: theme.fonts.family,
          fontSize: theme.fonts.sizeBody,
          lineHeight: 1.5,
          padding,
          paddingTop: `calc(${padding}px + env(safe-area-inset-top))`,
          paddingRight: `calc(${padding}px + env(safe-area-inset-right))`,
          paddingBottom: `calc(${padding}px + env(safe-area-inset-bottom))`,
          paddingLeft: `calc(${padding}px + env(safe-area-inset-left))`,
          boxSizing: "border-box",
          // Prevent horizontal overflow on mobile
          overflowX: "hidden",
        }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
