#!/usr/bin/env node
/**
 * list-feedback - admin CLI to print recent feedback submissions.
 *
 * Usage: node scripts/list-feedback.mjs [limit]
 *
 * Reads data/feedback/submissions.jsonl (append-only store).
 * TODO: Gate behind admin auth once an admin layer lands. Until then,
 * access is controlled by shell access to the server/disk.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const LIMIT = Number.parseInt(process.argv[2] ?? '20', 10) || 20;
const file = path.join(process.cwd(), 'data', 'feedback', 'submissions.jsonl');

try {
  const raw = await fs.readFile(file, 'utf8');
  const entries = raw
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  const recent = entries.slice(-LIMIT).reverse();

  if (recent.length === 0) {
    console.log('No feedback submissions yet.');
    process.exit(0);
  }

  console.log(`Showing ${recent.length} of ${entries.length} submissions:\n`);
  for (const e of recent) {
    const email = e.contact_email ?? '(anonymous)';
    console.log(`[${e.createdAt}] ${e.role} - ${email}`);
    if (e.relationship) console.log(`  relationship: ${e.relationship}`);
    if (e.works_well) console.log(`  works_well: ${e.works_well}`);
    if (e.should_change) console.log(`  should_change: ${e.should_change}`);
    console.log(`  id: ${e.id}  ip_hash: ${e.ip_hash.slice(0, 8)}...\n`);
  }
} catch (err) {
  if (err.code === 'ENOENT') {
    console.log('No feedback submissions yet (file does not exist).');
    process.exit(0);
  }
  console.error('Error reading feedback:', err.message);
  process.exit(1);
}
