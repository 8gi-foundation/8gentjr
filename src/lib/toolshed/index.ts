/**
 * 8gent Jr Toolshed
 *
 * Kid-friendly tool system. Visual grid with categories,
 * gamified star progress, unlock states.
 */

export interface Tool {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: ToolCategory;
  route: string;
  unlocked: boolean;
  stars: number;
  description: string;
}

export type ToolCategory =
  | 'communicate'
  | 'create'
  | 'learn'
  | 'feel'
  | 'routine'
  | 'reward';

export const TOOL_CATEGORIES: Array<{
  id: ToolCategory;
  name: string;
  icon: string;
  color: string;
}> = [
  { id: 'communicate', name: 'Talk', icon: '\uD83D\uDCAC', color: '#8BC34A' },
  { id: 'create', name: 'Create', icon: '\uD83C\uDFA8', color: '#FF9800' },
  { id: 'learn', name: 'Learn', icon: '\uD83D\uDCDA', color: '#4ECDC4' },
  { id: 'feel', name: 'Feel', icon: '\uD83D\uDE0A', color: '#FFEB3B' },
  { id: 'routine', name: 'My Day', icon: '\uD83D\uDCC5', color: '#607D8B' },
  { id: 'reward', name: 'Prizes', icon: '\uD83C\uDFC6', color: '#FFC107' },
];

export const TOOLS: Tool[] = [
  // Communicate
  { id: 'aac-home', name: 'Talk', icon: '\uD83D\uDCAC', color: '#8BC34A', category: 'communicate', route: '/talk/core', unlocked: true, stars: 0, description: 'AAC communication board' },
  { id: 'stories', name: 'Stories', icon: '\uD83D\uDCD6', color: '#9C27B0', category: 'communicate', route: '/stories', unlocked: true, stars: 0, description: 'Social stories' },
  // Create
  { id: 'draw', name: 'Draw', icon: '\uD83C\uDFA8', color: '#FF9800', category: 'create', route: '/draw', unlocked: true, stars: 0, description: 'Drawing canvas' },
  { id: 'music', name: 'Music', icon: '\uD83C\uDFB5', color: '#E91E63', category: 'create', route: '/music', unlocked: true, stars: 0, description: 'Music & beats' },
  // Learn
  { id: 'speech', name: 'Speech', icon: '\uD83D\uDC44', color: '#FF5722', category: 'learn', route: '/speech', unlocked: true, stars: 0, description: 'Speech therapy' },
  { id: 'intuition', name: 'Game', icon: '\uD83C\uDFAE', color: '#9C27B0', category: 'learn', route: '/intuition', unlocked: true, stars: 0, description: 'Intuition game' },
  { id: 'vsd', name: 'Scenes', icon: '\uD83D\uDDBC\uFE0F', color: '#2196F3', category: 'learn', route: '/vsd', unlocked: true, stars: 0, description: 'Visual scene displays' },
  { id: 'science', name: 'Science', icon: '\uD83E\uDDEA', color: '#4ECDC4', category: 'learn', route: '/science', unlocked: true, stars: 0, description: 'Science experiments' },
  // Feel
  { id: 'games', name: 'Games', icon: '\uD83C\uDFB2', color: '#FFEB3B', category: 'feel', route: '/games', unlocked: true, stars: 0, description: 'Fun games' },
  // Routine
  { id: 'timer', name: 'Timer', icon: '\u23F0', color: '#00BCD4', category: 'routine', route: '/timer', unlocked: true, stars: 0, description: 'Visual countdown timer' },
  { id: 'schedule', name: 'My Day', icon: '\uD83D\uDCC5', color: '#607D8B', category: 'routine', route: '/schedule', unlocked: true, stars: 0, description: 'Visual schedule' },
  // Reward
  { id: 'add', name: 'Add Card', icon: '\u2795', color: '#4CAF50', category: 'reward', route: '/add', unlocked: true, stars: 0, description: 'Create new cards' },
];

export function getToolsByCategory(category: ToolCategory): Tool[] {
  return TOOLS.filter((t) => t.category === category);
}

export function getTotalStars(): number {
  return TOOLS.reduce((sum, t) => sum + t.stars, 0);
}

export const TOOLSHED_NAME = '8gent Jr';
