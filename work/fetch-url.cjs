'use strict';

/**
 * 下载单个 URL 到指定路径。
 * 用法：node work/fetch-url.cjs <url> <outPath>
 */
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const [url, out] = process.argv.slice(2);
  if (!url || !out) {
    console.error('usage: node work/fetch-url.cjs <url> <outPath>');
    process.exit(1);
  }
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    console.error(`HTTP ${res.status} for ${url}`);
    process.exit(1);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, buf);
  console.log(`saved ${buf.length} bytes -> ${out} (from ${res.url})`);
}

main().catch((err) => {
  console.error(err && err.message ? err.message : String(err));
  process.exit(1);
});
