/**
 * Default Visual Scene Displays
 *
 * 5 seed scenes for GLP Stage 1-2 learners.
 * Gradient placeholders until real photos are uploaded.
 */

import type { VisualScene } from './types';

export const DEFAULT_SCENES: VisualScene[] = [
  {
    id: 'kitchen',
    title: 'Kitchen',
    imageUrl: '/vsd/kitchen.jpg',
    glpStage: 1,
    category: 'home',
    hotspots: [
      { id: 'kitchen-juice', x: 10, y: 30, width: 20, height: 25, phrase: 'I want juice' },
      { id: 'kitchen-more', x: 40, y: 50, width: 20, height: 20, phrase: 'More please' },
      { id: 'kitchen-done', x: 70, y: 40, width: 20, height: 20, phrase: 'All done' },
      { id: 'kitchen-help', x: 35, y: 10, width: 25, height: 20, phrase: 'Help me' },
    ],
  },
  {
    id: 'playground',
    title: 'Playground',
    imageUrl: '/vsd/playground.jpg',
    glpStage: 1,
    category: 'park',
    hotspots: [
      { id: 'playground-go', x: 5, y: 60, width: 22, height: 20, phrase: "Let's go" },
      { id: 'playground-turn', x: 30, y: 30, width: 20, height: 25, phrase: 'My turn' },
      { id: 'playground-push', x: 55, y: 25, width: 22, height: 25, phrase: 'Push me' },
      { id: 'playground-swing', x: 70, y: 60, width: 25, height: 25, phrase: 'I want to swing' },
    ],
  },
  {
    id: 'bedroom',
    title: 'Bedroom',
    imageUrl: '/vsd/bedroom.jpg',
    glpStage: 1,
    category: 'home',
    hotspots: [
      { id: 'bedroom-book', x: 10, y: 20, width: 22, height: 25, phrase: 'Read a book' },
      { id: 'bedroom-night', x: 40, y: 40, width: 25, height: 25, phrase: 'Night night' },
      { id: 'bedroom-tired', x: 65, y: 20, width: 22, height: 25, phrase: "I'm tired" },
      { id: 'bedroom-light', x: 70, y: 60, width: 25, height: 20, phrase: 'Turn off light' },
    ],
  },
  {
    id: 'school',
    title: 'School',
    imageUrl: '/vsd/school.jpg',
    glpStage: 2,
    category: 'school',
    hotspots: [
      { id: 'school-hello', x: 5, y: 15, width: 22, height: 22, phrase: 'Hello teacher' },
      { id: 'school-help', x: 35, y: 35, width: 25, height: 25, phrase: 'I need help' },
      { id: 'school-go', x: 65, y: 15, width: 22, height: 22, phrase: 'Can I go' },
      { id: 'school-done', x: 35, y: 65, width: 28, height: 22, phrase: 'Finished work' },
    ],
  },
  {
    id: 'park',
    title: 'Park',
    imageUrl: '/vsd/park.jpg',
    glpStage: 1,
    category: 'park',
    hotspots: [
      { id: 'park-look', x: 10, y: 15, width: 22, height: 22, phrase: 'Look at that' },
      { id: 'park-play', x: 40, y: 40, width: 22, height: 25, phrase: "Let's play" },
      { id: 'park-icecream', x: 68, y: 50, width: 25, height: 22, phrase: 'I want ice cream' },
      { id: 'park-home', x: 10, y: 65, width: 22, height: 22, phrase: 'Go home' },
    ],
  },
];
