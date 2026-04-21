#!/usr/bin/env node
/**
 * Privacy admin CLI.
 *
 *   node scripts/privacy-admin.mjs pending   # list accounts in grace period
 *   node scripts/privacy-admin.mjs ledger    # dump full ledger
 *
 * Reads data/privacy/ledger.jsonl in the current working directory. Safe:
 * ledger contains only email hashes, never plaintext.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const LEDGER = path.join(process.cwd(), 'data', 'privacy', 'ledger.jsonl');

async function readLedger() {
  try {
    const raw = await fs.readFile(LEDGER, 'utf8');
    return raw.split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

function pending(entries, now = new Date()) {
  const latest = new Map();
  for (const e of entries) latest.set(e.emailHash, e);
  const out = [];
  for (const e of latest.values()) {
    if (e.kind !== 'withdraw' || !e.purgeAfter) continue;
    const days = Math.max(0, Math.ceil((new Date(e.purgeAfter).getTime() - now.getTime()) / 86_400_000));
    out.push({ emailHash: e.emailHash, withdrawnAt: e.at, purgeAfter: e.purgeAfter, daysRemaining: days });
  }
  return out.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

const cmd = process.argv[2] ?? 'pending';
const entries = await readLedger();

if (cmd === 'pending') {
  const list = pending(entries);
  if (list.length === 0) {
    console.log('No pending deletions.');
  } else {
    console.log(`Pending deletions: ${list.length}`);
    console.table(list.map((p) => ({
      emailHash: p.emailHash.slice(0, 16) + '...',
      daysRemaining: p.daysRemaining,
      purgeAfter: p.purgeAfter,
    })));
  }
} else if (cmd === 'ledger') {
  console.log(JSON.stringify(entries, null, 2));
} else {
  console.error(`Unknown command: ${cmd}`);
  process.exit(1);
}
