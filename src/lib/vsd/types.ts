/**
 * Visual Scene Display (VSD) Types
 *
 * Photo-based AAC where real photos have interactive hotspots
 * that speak whole language chunks. For GLP Stage 1-2 learners.
 */

export interface VisualScene {
  id: string;
  title: string;
  imageUrl: string;
  hotspots: Hotspot[];
  glpStage: 1 | 2;
  category: string;
}

export interface Hotspot {
  id: string;
  x: number;      // percentage 0-100
  y: number;      // percentage 0-100
  width: number;   // percentage of scene width
  height: number;  // percentage of scene height
  phrase: string;
  symbolId?: number;
  audioUrl?: string;
}
