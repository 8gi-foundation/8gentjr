#!/usr/bin/env node
/**
 * Guard — fail CI if any affect-detection / emotion-inference library is
 * imported anywhere in src/. These libraries are banned by EU AI Act
 * Article 5(1)(f): inferring emotions of natural persons in education
 * settings is a prohibited practice.
 *
 * See 8gi-governance/docs/legal/2026-04-24-8gentjr-eu-compliance-audit.md.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BANNED = [
  'face-api',
  'face-api.js',
  'morphcast',
  'affdex',
  '@affectiva',
  'hume',
  '@hume-ai',
  'clmtrackr',
  'expression-detector',
  'emotion-recognition',
];

const ROOT = new URL('../src', import.meta.url).pathname;
const EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (EXT.has(full.slice(full.lastIndexOf('.')))) out.push(full);
  }
  return out;
}

const offenders = [];
for (const file of walk(ROOT)) {
  const src = readFileSync(file, 'utf8');
  for (const pkg of BANNED) {
    const re = new RegExp(`(?:from|require\\()\\s*['"]${pkg.replace('.', '\\.')}(?:['"/])`);
    if (re.test(src)) offenders.push({ file, pkg });
  }
}

if (offenders.length > 0) {
  console.error('Affect-detection import detected (EU AI Act Art 5(1)(f) banned):');
  for (const o of offenders) console.error(`  ${o.file}  ->  ${o.pkg}`);
  process.exit(1);
}

console.log('guard-no-affect-detection: clean');
