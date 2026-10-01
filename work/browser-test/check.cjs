'use strict';

/**
 * 33 Clear Water Bay — 浏览器双视口检查（流程文档 §6.4 / §11.4）。
 *
 * 视口：桌面 1440×900、手机 390×844。
 * 检查：无横向溢出、图片全部加载、每页恰 1 个 WhatsApp + 1 个电话按钮且 href 正确生成、
 *       首页主视觉视频 src 已设置、控制台无错误、移动菜单可开合滚动、
 *       私隐弹窗保留 DOM 且内容可真实滚动（scrollHeight > clientHeight、scrollTop > 0）、可关闭可重开。
 *
 * 用法：node work/browser-test/check.cjs
 * 产物：work/verification-output/browser/（截图 + JSON，仅留在 work/，不入交付）
 */

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(__dirname, '..', 'verification-output', 'browser');

const VIEWPORTS = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'mobile-390x844', width: 390, height: 844 },
];

const PAGES = [
  'index.html',
  'floorplan/index.html',
  'floorplan/2p.html',
  'sales-info/index.html',
  'location/index.html',
  'vipform/index.html',
  'privacy-policy.html',
  'en/index.html',
  'sc/floorplan/special.html',
];

function fileUrl(rel) {
  return 'file:///' + path.join(ROOT, rel).replace(/\\/g, '/');
}

async function main() {
  // 支持两种模式：默认由 Playwright 启动 Chrome；若设置了 CWB_CDP，
  // 则连接外部已启动的 Chrome（--remote-debugging-port），以规避受限环境下命名管道的限制。
  const cdpEndpoint = process.env.CWB_CDP || '';
  const browser = cdpEndpoint
    ? await chromium.connectOverCDP(cdpEndpoint)
    : await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  let failed = 0;
  fs.mkdirSync(OUT, { recursive: true });

  const baseCtx = browser.contexts()[0] || (await browser.newContext());

  /* ---------- 1. 每视口 × 每页面静态渲染检查 ---------- */
  for (const vp of VIEWPORTS) {
    const page = await baseCtx.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });

    for (const file of PAGES) {
      const consoleErrors = [];
      const failedRequests = [];
      const onConsole = (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      };
      const onReqFail = (req) => failedRequests.push(req.url());
      const onPageErr = (e) => consoleErrors.push('pageerror: ' + e.message);
      page.on('console', onConsole);
      page.on('requestfailed', onReqFail);
      page.on('pageerror', onPageErr);

      await page.goto(fileUrl(file), { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(500);

      const c = await page.evaluate(() => {
        const r = {};
        r.hOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        r.imgTotal = document.querySelectorAll('img').length;
        r.imgBroken = [...document.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth === 0).length;
        r.waCount = document.querySelectorAll('[data-ps-whatsapp]').length;
        r.phoneCount = document.querySelectorAll('[data-ps-phone]').length;
        const wa = document.querySelector('[data-ps-whatsapp]');
        r.waHref = wa ? wa.getAttribute('href') : null;
        r.waTarget = wa ? wa.getAttribute('target') : null;
        r.waRel = wa ? wa.getAttribute('rel') : null;
        const video = document.querySelector('.hero-video');
        r.videoSrc = video ? video.currentSrc || video.getAttribute('src') : null;
        // 可见文本中不得出现电话号码数字或 WhatsApp 字样
        const text = document.body.innerText;
        r.visiblePhone = /8300\s?022|8300\s?0224|8300\s?0565/.test(text);
        r.visibleWhatsApp = text.includes('WhatsApp');
        return r;
      });

      const errors = [];
      if (c.hOverflow > 1) errors.push(`横向溢出 ${c.hOverflow}px`);
      if (c.imgBroken > 0) errors.push(`${c.imgBroken}/${c.imgTotal} 张图片加载失败`);
      if (c.waCount !== 1) errors.push(`WhatsApp 按钮 ${c.waCount} 个（应为 1）`);
      if (c.phoneCount !== 1) errors.push(`电话按钮 ${c.phoneCount} 个（应为 1）`);
      if (!c.waHref || !c.waHref.startsWith('https://wa.me/85253392749?text=')) errors.push('WhatsApp href 未正确生成');
      if (c.waTarget !== '_blank') errors.push('WhatsApp target 不是 _blank');
      if (!c.waRel || !/noopener/.test(c.waRel)) errors.push('WhatsApp rel 缺少 noopener');
      if (file === 'index.html' && !c.videoSrc) errors.push('首页主视觉视频 src 未设置');
      if (c.visiblePhone) errors.push('可见文本中出现电话号码数字');
      if (c.visibleWhatsApp) errors.push('可见文本中出现 WhatsApp 字样');
      for (const ce of consoleErrors) errors.push('console: ' + ce.slice(0, 160));
      for (const fr of failedRequests) errors.push('request-failed: ' + fr.replace('file:///', '').slice(0, 120));

      const shot = path.join(OUT, `${vp.name}-${file.replace(/[\\/]/g, '__').replace(/\.html$/, '')}.png`);
      await page.screenshot({ path: shot });

      results.push({ viewport: vp.name, file, errors, shot: path.relative(ROOT, shot) });
      if (errors.length) failed++;

      page.off('console', onConsole);
      page.off('requestfailed', onReqFail);
      page.off('pageerror', onPageErr);
    }
    await page.close();
  }

  /* ---------- 2. 交互检查：移动菜单 + 弹窗真实滚动/重开 ---------- */
  for (const vp of VIEWPORTS) {
    const page = await baseCtx.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(fileUrl('index.html'), { waitUntil: 'load' });

    // 移动菜单（仅手机视口）
    if (vp.width < 768) {
      await page.click('[data-menu-toggle]');
      await page.waitForTimeout(400);
      const menu = await page.evaluate(() => {
        const el = document.getElementById('mobile-menu');
        el.scrollTop = 60;
        const scrolled = el.scrollTop > 0 || el.scrollHeight <= el.clientHeight;
        return { visible: !el.hidden, scrolled };
      });
      const mErr = [];
      if (!menu.visible) mErr.push('移动菜单无法打开');
      if (!menu.scrolled) mErr.push('移动菜单面板无法滚动');
      await page.screenshot({ path: path.join(OUT, `${vp.name}-menu-open.png`) });
      await page.click('[data-menu-toggle]');
      await page.waitForTimeout(300);
      const menuClosed = await page.evaluate(() => document.getElementById('mobile-menu').hidden);
      if (!menuClosed) mErr.push('移动菜单无法关闭');
      if (mErr.length) {
        results.push({ viewport: vp.name, file: 'index.html#menu', errors: mErr });
        failed++;
      }
    }

    // 私隐弹窗：打开 → 真实滚动 → Escape 关闭 → 重开（§11.4）
    await page.evaluate(() => document.querySelector('[data-modal-open="privacy"]').click());
    await page.waitForTimeout(400);
    const modal = await page.evaluate(() => {
      const m = document.getElementById('modal-privacy');
      const body = m.querySelector('.modal__body');
      const style = getComputedStyle(body);
      body.scrollTop = 80;
      const scrolled = body.scrollTop > 0;
      return {
        visible: !m.hidden && m.classList.contains('is-open'),
        keptDom: !!m,
        scrollable: body.scrollHeight > body.clientHeight,
        overflowY: style.overflowY,
        scrolled,
      };
    });
    const mErr = [];
    if (!modal.keptDom) mErr.push('弹窗 DOM 被移除');
    if (!modal.visible) mErr.push('弹窗未正确打开');
    if (!['auto', 'scroll'].includes(modal.overflowY)) mErr.push('overflow-y 不是 auto/scroll');
    if (!modal.scrollable) mErr.push('弹窗内容未溢出（scrollHeight <= clientHeight）');
    if (!modal.scrolled) mErr.push('滚动后 scrollTop 无变化（不可真实滚动）');

    await page.screenshot({ path: path.join(OUT, `${vp.name}-modal-privacy.png`) });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const closedOk = await page.evaluate(() => document.getElementById('modal-privacy').hidden);
    await page.evaluate(() => document.querySelector('[data-modal-open="privacy"]').click());
    await page.waitForTimeout(350);
    const reopenedOk = await page.evaluate(() => !document.getElementById('modal-privacy').hidden);
    if (!closedOk) mErr.push('Escape 未能关闭弹窗');
    if (!reopenedOk) mErr.push('弹窗关闭后无法重开');
    if (mErr.length) {
      results.push({ viewport: vp.name, file: 'index.html#modal', errors: mErr });
      failed++;
    }

    await page.close();
  }

  if (!cdpEndpoint) await browser.close();

  fs.writeFileSync(path.join(OUT, 'browser-check.json'), JSON.stringify({ failed, results }, null, 2), 'utf8');
  for (const r of results) {
    const flag = r.errors && r.errors.length ? 'FAIL' : 'PASS';
    console.log(`${flag}  [${r.viewport}]  ${r.file}`);
    if (r.errors && r.errors.length) {
      for (const e of r.errors) console.log(`        - ${e}`);
    }
  }
  console.log(`\nBrowser check finished: ${failed} failed. Artifacts: work/verification-output/browser/`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error('Browser check crashed: ' + (err && err.message ? err.message : err));
  process.exit(1);
});
