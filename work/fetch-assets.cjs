'use strict';

/**
 * 官方站公开品牌资产批量本地化。
 * 来源：https://33clearwaterbay.com.hk（tc/en/sc 三语的 Logo 动画视频、关于按钮 SVG、语言切换 SVG、OG 图片）
 * 输出：assets/...（作为站点受控品牌资产，保持官方路径结构），来源清单写入 original-site/ASSET-SOURCES.md。
 */
const fs = require('node:fs');
const path = require('node:path');

const BASE = 'https://33clearwaterbay.com.hk';
const OUT_ROOT = path.join(__dirname, '..', 'assets');
const SOURCES_MD = path.join(__dirname, '..', 'original-site', 'ASSET-SOURCES.md');

const MANIFEST = [
  // 图片（受控品牌资产）
  { url: '/assets/images/cwb-about-tc.svg', file: 'images/cwb-about-tc.svg' },
  { url: '/assets/images/cwb-about-tc-hover.svg', file: 'images/cwb-about-tc-hover.svg' },
  { url: '/assets/images/cwb-about-en.svg', file: 'images/cwb-about-en.svg' },
  { url: '/assets/images/cwb-about-en-hover.svg', file: 'images/cwb-about-en-hover.svg' },
  { url: '/assets/images/cwb-about-sc.svg', file: 'images/cwb-about-sc.svg' },
  { url: '/assets/images/cwb-about-sc-hover.svg', file: 'images/cwb-about-sc-hover.svg' },
  { url: '/assets/images/cwb-lang-tc.svg', file: 'images/cwb-lang-tc.svg' },
  { url: '/assets/images/cwb-lang-sc.svg', file: 'images/cwb-lang-sc.svg' },
  { url: '/assets/images/cwb-lang-en.svg', file: 'images/cwb-lang-en.svg' },
  { url: '/assets/images/cwb-og-image.png', file: 'images/cwb-og-image.png' },
  // Logo 动画视频（繁中无后缀；en/sc 有 _EN/_SC 后缀）
  { url: '/assets/video/tc/CWB33_Logo animation_1920x1080.mp4', file: 'video/tc/CWB33_Logo animation_1920x1080.mp4' },
  { url: '/assets/video/tc/CWB33_Logo animation_1080x1440.mp4', file: 'video/tc/CWB33_Logo animation_1080x1440.mp4' },
  { url: '/assets/video/tc/CWB33_Logo animation_1080x1920.mp4', file: 'video/tc/CWB33_Logo animation_1080x1920.mp4' },
  { url: '/assets/video/en/CWB33_Logo animation_1920x1080_EN.mp4', file: 'video/en/CWB33_Logo animation_1920x1080_EN.mp4' },
  { url: '/assets/video/en/CWB33_Logo animation_1080x1440_EN.mp4', file: 'video/en/CWB33_Logo animation_1080x1440_EN.mp4' },
  { url: '/assets/video/en/CWB33_Logo animation_1080x1920_EN.mp4', file: 'video/en/CWB33_Logo animation_1080x1920_EN.mp4' },
  { url: '/assets/video/sc/CWB33_Logo animation_1920x1080_SC.mp4', file: 'video/sc/CWB33_Logo animation_1920x1080_SC.mp4' },
  { url: '/assets/video/sc/CWB33_Logo animation_1080x1440_SC.mp4', file: 'video/sc/CWB33_Logo animation_1080x1440_SC.mp4' },
  { url: '/assets/video/sc/CWB33_Logo animation_1080x1920_SC.mp4', file: 'video/sc/CWB33_Logo animation_1080x1920_SC.mp4' },
];

function sniff(buf, file) {
  if (/\.svg$/i.test(file)) return buf.length > 16 && buf[0] === 0x3c; // '<'
  if (/\.png$/i.test(file)) return buf.length > 8 && buf.subarray(0, 4).toString('hex') === '89504e47';
  if (/\.mp4$/i.test(file)) {
    // ftyp box: 长度(4) + "ftyp" at offset 4
    return buf.length > 12 && buf.subarray(4, 8).toString('ascii') === 'ftyp';
  }
  return buf.length > 0;
}

async function fetchOne(item, attempt = 1) {
  const out = path.join(OUT_ROOT, item.file);
  // 已存在且校验通过则跳过（可重复执行）
  if (fs.existsSync(out)) {
    const existing = fs.readFileSync(out);
    if (sniff(existing, item.file)) return { ...item, ok: true, size: existing.length, skipped: true };
  }
  const url = BASE + item.url.split('?')[0].replace(/ /g, '%20');
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (!sniff(buf, item.file)) throw new Error('content sniff failed');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buf);
    return { ...item, ok: true, size: buf.length };
  } catch (err) {
    if (attempt < 3) return fetchOne(item, attempt + 1);
    return { ...item, ok: false, error: err.message };
  }
}

async function main() {
  const results = [];
  const queue = [...MANIFEST];
  const workers = Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const item = queue.shift();
      results.push(await fetchOne(item));
    }
  });
  await Promise.all(workers);

  const lines = [
    '# 官方站资产来源清单',
    '',
    '来源站点：https://33clearwaterbay.com.hk',
    '抓取范围：仅公开引用的品牌资产（Logo 动画视频、关于按钮 SVG、语言切换 SVG、OG 图片）。',
    '用途：本项目受控品牌资产，原样本地化使用，不修改、不重绘。',
    '',
    '| 状态 | 字节 | 官方 URL | 本地路径 |',
    '| --- | --- | --- | --- |',
  ];
  for (const r of results) {
    lines.push(
      `| ${r.ok ? 'OK' : 'FAILED'} | ${r.ok ? r.size : '-'} | ${BASE}${r.url} | assets/${r.file} |`,
    );
  }
  fs.mkdirSync(path.dirname(SOURCES_MD), { recursive: true });
  fs.writeFileSync(SOURCES_MD, lines.join('\n') + '\n', 'utf8');

  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${(r.size || 0).toString().padStart(9)}  assets/${r.file}${r.ok ? '' : '  ->  ' + r.error}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} downloaded. Manifest: ${SOURCES_MD}`);
  if (failed.length) process.exitCode = 1;
}

main();
