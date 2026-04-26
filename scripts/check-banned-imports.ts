#!/usr/bin/env bun
/**
 * Banned-imports check (EU AI Act guard).
 *
 * Fails the build if any source file imports an emotion / affect-detection
 * library. The product must remain out of EU AI Act Art 5(1)(f) territory:
 * we do not infer emotion from biometric signals (face, voice, keystroke).
 * Self-report games (FeelingsExplorer) are explicitly NOT in scope of the
 * prohibition because the user taps the feeling rather than us inferring it
 * from a biometric.
 *
 * Standing guard reference:
 *   8gi-governance/docs/legal/eu-ai-act-classification.md §5 + §9
 *   8gi-governance/docs/legal/uk-aadc-mapping.md Standard 13
 *
 * To allow a new package, do NOT edit this list silently. File an
 * 8gi-governance issue first; the guard exists so a future contributor
 * cannot accidentally introduce affect detection.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const REPO_ROOT = new URL('..', import.meta.url).pathname;

// Exact-match package names (most common offenders).
const BANNED_PACKAGES: ReadonlySet<string> = new Set([
  'face-api.js',
  '@vladmandic/face-api',
  '@tensorflow-models/face-detection',
  '@tensorflow-models/face-landmarks-detection',
  '@tensorflow-models/blazeface',
  '@teachable-machine/image',
  'morphcast',
  '@morphcast/sdk',
  'affectiva',
  '@affectiva/sdk',
  'emotion-recognition',
  'face-emotion-detector',
  'hume-ai',
  '@hume/voice-react',
  '@hume/empathic-voice-interface',
]);

// Substring patterns: any import path containing these is rejected.
// Belt-and-braces against unknown future packages.
const BANNED_PATTERNS: ReadonlyArray<RegExp> = [
  /emotion-recognition/i,
  /affect-detection/i,
  /face-emotion/i,
  /voice-emotion/i,
  /empathic-voice/i,
];

// Scan these directories.
const SCAN_DIRS = ['src', 'app', 'lib', 'components'];
// File extensions we care about.
const SCAN_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
// Don't recurse into these.
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  'build',
  '.turbo',
  'coverage',
  '.git',
]);

// Match a string literal for the import source.
const IMPORT_SOURCE_RE = /(?:from|import|require)\s*\(?\s*['"]([^'"]+)['"]/g;

type Hit = {
  file: string;
  line: number;
  source: string;
  reason: string;
};

function walk(dir: string, out: string[]) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e)) continue;
    const full = join(dir, e);
    const s = statSync(full);
    if (s.isDirectory()) {
      walk(full, out);
    } else if (s.isFile()) {
      const dotIdx = e.lastIndexOf('.');
      if (dotIdx === -1) continue;
      if (SCAN_EXT.has(e.slice(dotIdx))) out.push(full);
    }
  }
}

function checkFile(file: string): Hit[] {
  const hits: Hit[] = [];
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    IMPORT_SOURCE_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = IMPORT_SOURCE_RE.exec(line)) !== null) {
      const source = m[1];
      // Ignore relative imports.
      if (source.startsWith('.') || source.startsWith('/')) continue;
      // Strip subpath: pkg/foo/bar -> pkg or @scope/pkg/foo -> @scope/pkg
      const pkgName = source.startsWith('@')
        ? source.split('/').slice(0, 2).join('/')
        : source.split('/')[0];
      if (BANNED_PACKAGES.has(pkgName) || BANNED_PACKAGES.has(source)) {
        hits.push({
          file: relative(REPO_ROOT, file),
          line: i + 1,
          source,
          reason: `exact-match banned package "${pkgName}"`,
        });
        continue;
      }
      for (const re of BANNED_PATTERNS) {
        if (re.test(source)) {
          hits.push({
            file: relative(REPO_ROOT, file),
            line: i + 1,
            source,
            reason: `matches banned pattern ${re}`,
          });
          break;
        }
      }
    }
  }
  return hits;
}

function main() {
  const files: string[] = [];
  for (const d of SCAN_DIRS) walk(join(REPO_ROOT, d), files);

  const allHits: Hit[] = [];
  for (const f of files) {
    allHits.push(...checkFile(f));
  }

  if (allHits.length === 0) {
    console.log(
      `[banned-imports] OK. Scanned ${files.length} files. No emotion/affect-detection imports found.`,
    );
    return;
  }

  console.error(
    '\n[banned-imports] FAIL. EU AI Act Art 5(1)(f) guard tripped.\n',
  );
  console.error(
    'Banned: emotion / affect / facial-affect / voice-affect / empathic-voice detection libraries.',
  );
  console.error(
    'Reference: 8gi-governance/docs/legal/eu-ai-act-classification.md §5 + §9 standing guards.\n',
  );
  for (const h of allHits) {
    console.error(`  ${h.file}:${h.line}  imports "${h.source}"  (${h.reason})`);
  }
  console.error(
    '\nRemove the import. If a new use-case truly requires affect detection, file an 8gi-governance issue first; do NOT edit this guard list silently.\n',
  );
  process.exit(1);
}

main();
