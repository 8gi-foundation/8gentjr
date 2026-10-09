/** Writes tokens.css from tokens.ts. Run with `bun run wk:css`. */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokensToCss } from './tokens';

const out = join(dirname(fileURLToPath(import.meta.url)), 'tokens.css');
writeFileSync(out, tokensToCss());
console.log(`wrote ${out}`);
