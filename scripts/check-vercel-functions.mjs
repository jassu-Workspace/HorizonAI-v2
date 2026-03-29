import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const apiDir = join(root, 'api');
const allowedExt = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx']);

function walk(dir) {
  const items = readdirSync(dir);
  const files = [];
  for (const item of items) {
    const full = join(dir, item);
    const st = statSync(full);
    if (st.isDirectory()) {
      files.push(...walk(full));
      continue;
    }
    const ext = item.slice(item.lastIndexOf('.'));
    if (allowedExt.has(ext)) {
      files.push(full);
    }
  }
  return files;
}

let files = [];
try {
  files = walk(apiDir);
} catch {
  console.error('No api directory found.');
  process.exit(1);
}

const count = files.length;
const limit = 12;

console.log(`Detected ${count} Vercel function source files under api/.`);
for (const file of files) {
  console.log(` - ${relative(root, file).replace(/\\/g, '/')}`);
}

if (count > limit) {
  console.error(`\nVercel Hobby limit exceeded: ${count}/${limit}. Move non-handler modules out of api/.`);
  process.exit(1);
}

console.log(`\nOK: ${count}/${limit} functions.`);
