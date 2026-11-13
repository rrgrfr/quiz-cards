import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const LIMIT_BYTES = 120 * 1024;

function collect(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collect(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

const files = collect(DIST).filter((path) => path.endsWith('.js'));
if (files.length === 0) {
  console.error('check-budget: no JS files in dist; run the build first');
  process.exit(1);
}

let total = 0;
for (const file of files) {
  const gzip = gzipSync(readFileSync(file)).length;
  total += gzip;
  const name = relative(DIST, file).split(sep).join('/');
  console.log(`  ${name.padEnd(42)} ${(gzip / 1024).toFixed(1)} KB gzip`);
}

const kb = (total / 1024).toFixed(1);
console.log(`JS total: ${kb} KB gzip (limit ${(LIMIT_BYTES / 1024).toFixed(0)} KB)`);

if (total > LIMIT_BYTES) {
  console.error('check-budget: budget exceeded');
  process.exit(1);
}
