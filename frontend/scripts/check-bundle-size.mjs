// Bundle-size budget enforcer. Run after `vite build`. Fails the CI step if
// dist/assets ships more bytes than the budget — a cheap regression guard
// against accidental fat dependencies or un-tree-shakable imports.
//
// Numbers tuned to the current baseline with ~50% headroom; bump when a real
// new feature pushes us over (and explain why in the PR).

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist', 'assets');

const BUDGETS = {
  js: { gzip: 100 * 1024, raw: 300 * 1024 },
  css: { gzip: 12 * 1024, raw: 60 * 1024 },
};

function fmt(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

function categorize(filename) {
  if (filename.endsWith('.js')) return 'js';
  if (filename.endsWith('.css')) return 'css';
  return null;
}

function main() {
  let files;
  try {
    files = readdirSync(DIST);
  } catch (e) {
    console.error(`Cannot read ${DIST} — did vite build run?`);
    throw e;
  }

  const totals = { js: { gzip: 0, raw: 0 }, css: { gzip: 0, raw: 0 } };
  const breakdown = [];

  for (const name of files) {
    const cat = categorize(name);
    if (!cat) continue;
    const buf = readFileSync(join(DIST, name));
    const gz = gzipSync(buf).byteLength;
    totals[cat].raw += buf.byteLength;
    totals[cat].gzip += gz;
    breakdown.push({ name, cat, raw: buf.byteLength, gzip: gz });
  }

  console.log('Bundle size report:');
  for (const b of breakdown) {
    console.log(`  ${b.name.padEnd(40)} ${fmt(b.raw).padStart(10)} (gzip ${fmt(b.gzip)})`);
  }
  console.log('');

  let failed = false;
  for (const cat of /** @type {const} */ (['js', 'css'])) {
    const t = totals[cat];
    const b = BUDGETS[cat];
    const verdict = (label, used, budget) => {
      const pct = (used / budget) * 100;
      const ok = used <= budget;
      console.log(
        `  ${cat.toUpperCase()} ${label.padEnd(8)} ${fmt(used).padStart(10)} / ${fmt(budget)} (${pct.toFixed(1)}%) ${ok ? 'OK' : 'FAIL'}`,
      );
      if (!ok) failed = true;
    };
    verdict('raw', t.raw, b.raw);
    verdict('gzip', t.gzip, b.gzip);
  }

  if (failed) {
    console.error('\nBundle size budget exceeded. See above; raise the budget intentionally if justified.');
    process.exit(1);
  }
}

const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('check-bundle-size.mjs');
if (isMain) {
  try {
    main();
  } catch (err) {
    console.error('Bundle-size check failed:', err);
    process.exit(1);
  }
}

export { BUDGETS };
