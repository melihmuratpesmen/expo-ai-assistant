#!/usr/bin/env node
/**
 * Verifies @gorhom/bottom-sheet is only imported from the bottom-sheet entry.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'src');
const offenders = [];
const importRe =
  /(?:from|require\()\s*['"]@gorhom\/bottom-sheet['"]/;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    const rel = path.relative(root, full);
    if (rel.startsWith(`bottom-sheet${path.sep}`)) continue;
    const text = fs.readFileSync(full, 'utf8');
    if (importRe.test(text)) {
      offenders.push(rel);
    }
  }
}

walk(root);

if (offenders.length) {
  console.error('gorhom imported outside bottom-sheet entry:');
  offenders.forEach(f => console.error(' -', f));
  process.exit(1);
}

console.log('OK: @gorhom/bottom-sheet only imported under src/bottom-sheet/');
