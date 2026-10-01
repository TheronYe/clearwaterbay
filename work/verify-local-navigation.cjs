'use strict';

/**
 * 33 Clear Water Bay — 全页面静态检查（流程文档 §6.2）。
 *
 * 对正式源（根目录 + en/ + sc/）的每个生成页面检查：
 *   1. 恰好 1 个 WhatsApp 按钮（[data-ps-whatsapp]）
 *   2. 恰好 1 个电话按钮（[data-ps-phone]，且为 tel:83000221）
 *   3. 0 个微信按钮 / 微信入口（含 "wechat" 字样）
 *   4. 0 处硬编码 https://wa.me/
 *   5. 共享联系脚本与交互脚本各恰好引用 1 次
 *   6. 0 处原站域名 / 第三方追踪域名
 *   7. 所有本地 href/src/poster/content 资源真实存在（含 %20 编码的视频路径）
 *
 * 用法：node work/verify-local-navigation.cjs [--site-root=.]
 * 结果：控制台摘要 + work/verification-output/static-check.json
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(__dirname, 'verification-output');

const EXPECTED_PAGE_COUNT = 30;
const FORBIDDEN_STRINGS = [
  '33clearwaterbay.com.hk',
  'hk.centanet.com',
  'centanet.com',
  'googletagmanager',
  'google-analytics',
  'gtag(',
  'wa.me',
];
const FORBIDDEN_CASE_INSENSITIVE = ['wechat'];
const CONTACT_SCRIPT = 'contact-consultation.js';
const SITE_SCRIPT = 'site.js';
const ASSET_EXT = /\.(css|js|png|jpe?g|svg|webp|mp4|ico|woff2?)$/i;

let rootDir = ROOT;
const argIdx = process.argv.indexOf('--site-root');
if (argIdx !== -1 && process.argv[argIdx + 1]) {
  rootDir = path.resolve(ROOT, process.argv[argIdx + 1]);
}

/** 递归收集 HTML（跳过工作与归档目录） */
function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['work', 'original-site', 'assets', 'node_modules', '.git'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function count(haystack, needle) {
  let n = 0;
  let i = 0;
  for (;;) {
    i = haystack.indexOf(needle, i);
    if (i === -1) break;
    n++;
    i += needle.length;
  }
  return n;
}

function extractAttrs(html) {
  const re = /(?:href|src|poster|content|data-video-desktop|data-video-tablet|data-video-mobile)="([^"]+)"/g;
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

function checkFile(absFile) {
  const rel = path.relative(rootDir, absFile).replace(/\\/g, '/');
  const html = fs.readFileSync(absFile, 'utf8');
  const lower = html.toLowerCase();
  const errors = [];
  const warnings = [];

  // 1 & 2：联系按钮数量
  const waCount = count(html, 'data-ps-whatsapp');
  const phoneCount = count(html, 'data-ps-phone');
  if (waCount !== 1) errors.push(`WhatsApp 按钮应为 1 个，实际 ${waCount}`);
  if (phoneCount !== 1) errors.push(`电话按钮应为 1 个，实际 ${phoneCount}`);
  if (count(html, 'tel:83000221') !== 1) errors.push(`tel:83000221 应恰好出现 1 次`);

  // 3：微信
  for (const w of FORBIDDEN_CASE_INSENSITIVE) {
    const c = count(lower, w);
    if (c > 0) errors.push(`出现 ${c} 处 "${w}"（要求为 0）`);
  }

  // 4 & 5：脚本引用
  if (count(html, 'https://wa.me/') > 0) errors.push('页面硬编码了 https://wa.me/（要求为 0）');
  const contactRef = count(html, CONTACT_SCRIPT);
  const siteRef = count(html, SITE_SCRIPT);
  if (contactRef !== 1) errors.push(`${CONTACT_SCRIPT} 引用应为 1 次，实际 ${contactRef}`);
  if (siteRef !== 1) errors.push(`${SITE_SCRIPT} 引用应为 1 次，实际 ${siteRef}`);

  // 6：禁止域名（wa.me 单列避免误报脚本常量之外的内容）
  for (const f of FORBIDDEN_STRINGS) {
    if (f === 'wa.me') continue; // 上面已单独检查 https://wa.me/
    if (html.includes(f)) errors.push(`包含禁止字符串 "${f}"`);
  }

  // 7：本地资源存在性
  const attrs = extractAttrs(html);
  for (const attr of attrs) {
    if (/^(https?:|tel:|mailto:|#|data:)/i.test(attr)) continue;
    const cleaned = attr.split('#')[0];
    if (!cleaned) continue;
    const decoded = decodeURIComponent(cleaned);
    if (!ASSET_EXT.test(cleaned) && !/\.html?$/i.test(cleaned) && !cleaned.endsWith('/')) continue;
    const target = path.resolve(path.dirname(absFile), decoded);
    if (!fs.existsSync(target)) errors.push(`引用的资源不存在：${attr}`);
  }

  return { file: rel, errors, warnings };
}

function main() {
  const files = walk(rootDir, []).sort();
  const results = [];
  let failed = 0;

  if (files.length !== EXPECTED_PAGE_COUNT) {
    results.push({
      file: '(page count)',
      errors: [`页面数量应为 ${EXPECTED_PAGE_COUNT}，实际 ${files.length}`],
      warnings: [],
    });
    failed++;
  }

  for (const f of files) {
    const r = checkFile(f);
    results.push(r);
    if (r.errors.length) failed++;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const reportPath = path.join(OUT_DIR, 'static-check.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify({ root: path.relative(ROOT, rootDir) || '.', checked: files.length, failed, results }, null, 2),
    'utf8'
  );

  for (const r of results) {
    if (r.errors.length) {
      console.log(`FAIL ${r.file}`);
      for (const e of r.errors) console.log(`     - ${e}`);
    }
  }
  console.log(`\nChecked ${files.length} pages, ${failed} failed. Report: ${path.relative(ROOT, reportPath)}`);
  process.exit(failed ? 1 : 0);
}

main();
