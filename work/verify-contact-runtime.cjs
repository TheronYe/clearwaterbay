'use strict';

/**
 * 33 Clear Water Bay — 联系脚本运行时验证（流程文档 §6.3）。
 *
 * 在隔离的 Node 环境中加载 assets/js/contact-consultation.js，
 * 读取实际生成的 WhatsApp 链接并输出：
 *   Base / Text / Target / Rel
 * 且 Text 解码后必须与流程文档 §6.3 的预期完全一致。
 *
 * 用法：node work/verify-contact-runtime.cjs
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'assets', 'js', 'contact-consultation.js');

const EXPECTED_BASE = 'https://wa.me/85253392749';
const EXPECTED_TEXT = 'NA您好，我想登記 33 Clear Water Bay 示範單位預約。 【來源：33clearwaterbay 官網】';
const EXPECTED_TARGET = '_blank';
const EXPECTED_REL = 'noopener noreferrer';

function main() {
  const code = fs.readFileSync(SCRIPT, 'utf8');

  const sandbox = {
    window: {},
    document: {
      readyState: 'complete',
      querySelectorAll: () => [],
      addEventListener: () => {},
      getElementById: () => null,
    },
  };
  sandbox.window.document = sandbox.document;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'contact-consultation.js' });

  const api = sandbox.window.__CWB_CONTACT__;
  if (!api || typeof api.getWhatsAppUrl !== 'function') {
    console.error('FAIL: window.__CWB_CONTACT__ 未导出 getWhatsAppUrl');
    process.exit(1);
  }

  const url = api.getWhatsAppUrl();
  const u = new URL(url);
  const base = 'https://wa.me/' + u.pathname.replace(/^\//, '');
  const text = u.searchParams.get('text') || '';

  console.log(`Base: ${base}`);
  console.log(`Text: ${text}`);
  console.log(`Target: ${api.target}`);
  console.log(`Rel: ${api.rel}`);

  const ok =
    base === EXPECTED_BASE &&
    text === EXPECTED_TEXT &&
    api.target === EXPECTED_TARGET &&
    api.rel === EXPECTED_REL;

  console.log(`\n${ok ? 'PASS: 输出与流程文档 §6.3 完全一致。' : 'FAIL: 与预期不一致，请检查 assets/js/contact-consultation.js。'}`);
  process.exit(ok ? 0 : 1);
}

main();
