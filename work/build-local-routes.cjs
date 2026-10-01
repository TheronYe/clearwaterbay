'use strict';

/**
 * 33 Clear Water Bay — 页面生成器（流程文档 §4）。
 *
 * 从 work/data/site-config.cjs 与 work/data/i18n.cjs 读取单一数据源，
 * 生成繁中（根目录）、英文（en/）、简中（sc/）共 30 个静态页面。
 *
 * 规则：
 * - 全站相对路径，禁止出现任何外部域名跳转；
 * - 每页恰好 1 个 WhatsApp 按钮（[data-ps-whatsapp]，URL 由共享脚本生成）
 *   与 1 个电话按钮（tel: 由 site-config 渲染）；
 * - 共享联系脚本与交互脚本各只引用一次；
 * - 修改共享文案时只改数据模块，然后重新运行本脚本，禁止手改生成页。
 *
 * 用法：node work/build-local-routes.cjs
 */

const fs = require('node:fs');
const path = require('node:path');

const config = require('./data/site-config.cjs');
const i18n = require('./data/i18n.cjs');

const ROOT = path.join(__dirname, '..');
const LANGS = ['tc', 'en', 'sc'];
const OG_LOCALE = { tc: 'zh_HK', en: 'en_US', sc: 'zh_CN' };

/* ---------------- 内联图标（功能图标，非品牌标志） ---------------- */
const ICONS = {
  whatsapp:
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
  phone:
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>',
  close:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>',
  arrow:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7"/></svg>',
  arrowDown:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7l10 10M17 8v9H8"/></svg>',
  doc:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 12h6M10 16h6"/></svg>',
  plan:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M9 3.5v17M15 3.5v17M3.5 9h17"/></svg>',
  train:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="14" rx="3.5"/><path d="M5 10h14"/><circle cx="9" cy="13.2" r="0.7" fill="currentColor"/><circle cx="15" cy="13.2" r="0.7" fill="currentColor"/><path d="M8 21l2-3M16 21l-2-3"/></svg>',
  transit:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5c-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5 4.5-2 4.5-4.5"/><path d="M16.5 12l-2.2-2.2M16.5 12l-2.2 2.2"/></svg>',
  school:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4L2.5 9l9.5 5 7.5-3.95"/><path d="M6 11.6V17c0 1.2 2.7 2.6 6 2.6s6-1.4 6-2.6v-5.4"/><path d="M21.5 9v5"/></svg>',
  mall:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 7h11l1.2 13H5.3z"/><path d="M9 7a3 3 0 016 0"/></svg>',
};

/* ---------------- 工具函数 ---------------- */

function esc(s) {
  return String(s)
    .replace(/&/g, '&' + 'amp;')
    .replace(/</g, '&' + 'lt;')
    .replace(/>/g, '&' + 'gt;')
    .replace(/"/g, '&' + 'quot;');
}

/** 官方视频文件名含空格，URL 属性中必须编码 */
function urlEnc(p) {
  return String(p).replace(/ /g, '%20');
}

/** 各语言的官方 Logo 动画视频路径（语言相对站点根） */
function videoPaths(lang) {
  const suffix = lang === 'tc' ? '' : '_' + lang.toUpperCase();
  return {
    desktop: `assets/video/${lang}/CWB33_Logo animation_1920x1080${suffix}.mp4`,
    tablet: `assets/video/${lang}/CWB33_Logo animation_1080x1440${suffix}.mp4`,
    mobile: `assets/video/${lang}/CWB33_Logo animation_1080x1920${suffix}.mp4`,
  };
}

/* ---------------- 路由 ---------------- */

const routes = [
  { id: 'home', file: 'index.html', depth: 0, navSection: 'overview', bodyId: 'home' },
  { id: 'floorplan', file: 'floorplan/index.html', depth: 1, navSection: 'floorplan', bodyId: 'floorplan' },
  { id: 'unit-p2', file: 'floorplan/2p.html', depth: 1, navSection: 'floorplan', bodyId: 'unit-p2' },
  { id: 'unit-p3', file: 'floorplan/3p.html', depth: 1, navSection: 'floorplan', bodyId: 'unit-p3' },
  { id: 'unit-p4', file: 'floorplan/4p.html', depth: 1, navSection: 'floorplan', bodyId: 'unit-p4' },
  { id: 'unit-special', file: 'floorplan/special.html', depth: 1, navSection: 'floorplan', bodyId: 'unit-special' },
  { id: 'sales', file: 'sales-info/index.html', depth: 1, navSection: 'sales', bodyId: 'sales' },
  { id: 'location', file: 'location/index.html', depth: 1, navSection: 'location', bodyId: 'location' },
  { id: 'vip', file: 'vipform/index.html', depth: 1, navSection: 'vip', bodyId: 'vip' },
  { id: 'privacy', file: 'privacy-policy.html', depth: 0, navSection: null, bodyId: 'privacy' },
];

const routeById = Object.fromEntries(routes.map((r) => [r.id, r]));

function makeCtx(lang, route) {
  const linkPrefix = '../'.repeat(route.depth);
  const sitePrefix = '../'.repeat(route.depth + (lang === 'tc' ? 0 : 1));
  return {
    lang,
    t: i18n[lang],
    route,
    linkPrefix,
    assetPrefix: sitePrefix,
    link: (routeId) => linkPrefix + routeById[routeId].file,
    langLink: (toLang) => sitePrefix + (toLang === 'tc' ? '' : toLang + '/') + route.file,
  };
}

/* ---------------- 页面骨架 ---------------- */

function langSwitchHtml(ctx, inMenu) {
  const items = LANGS.map((L) => {
    const icon = `<img src="${ctx.assetPrefix}assets/images/cwb-lang-${L}.svg" alt="" aria-hidden="true">`;
    const label = esc(i18n[L].langLabel);
    if (L === ctx.lang) {
      return `<span class="lang-item is-current" title="${label}">${icon}<span class="sr-only">${label}</span></span>`;
    }
    return `<a class="lang-item" href="${ctx.langLink(L)}" hreflang="${i18n[L].htmlLang}" title="${label}" aria-label="${label}">${icon}<span class="sr-only">${label}</span></a>`;
  }).join('\n          ');
  const cls = inMenu ? 'lang-switch mobile-menu__lang' : 'lang-switch';
  const role = inMenu ? '' : ' role="group" aria-label="' + esc(ctx.t.common.langRegion) + '"';
  return `<div class="${cls}"${role}>\n          ${items}\n        </div>`;
}

function headerHtml(ctx) {
  const t = ctx.t;
  const active = ctx.route.navSection;
  const navItems = [
    { key: 'overview', label: t.nav.overview, href: ctx.link('home') + '#overview' },
    { key: 'floorplan', label: t.nav.floorplan, href: ctx.link('floorplan') },
    { key: 'location', label: t.nav.location, href: ctx.link('location') },
    { key: 'sales', label: t.nav.sales, href: ctx.link('sales') },
  ]
    .map(
      (n) =>
        `<a href="${n.href}"${active === n.key ? ' class="is-active" aria-current="page"' : ''}>${esc(n.label)}</a>`
    )
    .join('\n        ');

  return `<header class="site-header" data-header>
  <div class="site-header__inner">
    <a class="brand" href="${ctx.link('home')}" aria-label="33 Clear Water Bay — ${esc(t.nav.home)}">
      <span class="brand__en">33 CLEAR WATER BAY</span>
      <span class="brand__zh">${esc(t.hero.subtitle)}</span>
    </a>
    <nav class="site-nav" aria-label="${esc(t.nav.home)}">
        ${navItems}
        <a class="nav-cta${active === 'vip' ? ' is-active' : ''}" href="${ctx.link('vip')}">${esc(t.nav.vip)}</a>
    </nav>
    <div class="header-tools">
      ${langSwitchHtml(ctx, false)}
      <button class="menu-toggle" type="button" data-menu-toggle aria-expanded="false" aria-controls="mobile-menu" data-label-open="${esc(t.common.menuToggle)}" data-label-close="${esc(t.common.menuClose)}" aria-label="${esc(t.common.menuToggle)}">
        <span></span><span></span>
        <span class="sr-only">${esc(t.common.menuToggle)}</span>
      </button>
    </div>
  </div>
  <nav class="mobile-menu" id="mobile-menu" aria-label="${esc(t.nav.home)}" hidden>
    <a href="${ctx.link('home')}#overview"><i>01</i>${esc(t.nav.overview)}</a>
    <a href="${ctx.link('floorplan')}"><i>02</i>${esc(t.nav.floorplan)}</a>
    <a href="${ctx.link('location')}"><i>03</i>${esc(t.nav.location)}</a>
    <a href="${ctx.link('sales')}"><i>04</i>${esc(t.nav.sales)}</a>
    <a href="${ctx.link('vip')}"><i>05</i>${esc(t.nav.vip)}</a>
      ${langSwitchHtml(ctx, true)}
  </nav>
</header>`;
}

function dockHtml(ctx) {
  const t = ctx.t;
  // 客户要求：不显示电话号码数字与 WhatsApp 字样，只保留可跳转图标（aria-label 保留无障碍提示）。
  return `<div class="contact-dock" role="group" aria-label="${esc(t.common.contactRegion)}">
  <a class="contact-link contact-link--whatsapp" data-ps-whatsapp href="#" target="_blank" rel="noopener noreferrer" aria-label="${esc(t.common.whatsappAria)}">
    <span class="contact-link__icon">${ICONS.whatsapp}</span>
  </a>
  <a class="contact-link contact-link--phone" data-ps-phone href="tel:${esc(config.contactPhone)}" aria-label="${esc(t.common.phoneAria)}">
    <span class="contact-link__icon">${ICONS.phone}</span>
  </a>
</div>`;
}

function modalHtml(ctx, id, title, blocks) {
  const body = blocks
    .map((b) => {
      if (typeof b === 'string') return `      <p>${esc(b)}</p>`;
      return (
        `      <h3>${esc(b.h)}</h3>\n` +
        b.ps.map((p) => `      <p>${esc(p)}</p>`).join('\n')
      );
    })
    .join('\n');
  return `<div class="modal" id="modal-${id}" role="dialog" aria-modal="true" aria-labelledby="modal-${id}-title" hidden>
  <div class="modal__panel">
    <div class="modal__head">
      <h2 id="modal-${id}-title">${esc(title)}</h2>
      <button class="modal__close" type="button" data-modal-close aria-label="${esc(ctx.t.modals.closeLabel)}">${ICONS.close}</button>
    </div>
    <div class="modal__body">
${body}
    </div>
  </div>
</div>`;
}

function modalsHtml(ctx) {
  const t = ctx.t;
  // 免責聲明：完整條款；私隱政策：直接載入政策全文，保證彈窗內容可真實滾動（§11.4）。
  const privacyBlocks = [t.privacyPolicy.intro, ...t.privacyPolicy.sections];
  return (
    modalHtml(ctx, 'disclaimer', t.modals.disclaimerTitle, t.modals.disclaimerBody) +
    '\n' +
    modalHtml(ctx, 'privacy', t.modals.privacyTitle, privacyBlocks)
  );
}

function footerHtml(ctx) {
  const t = ctx.t;
  return `<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <p class="footer-brand__name">33 CLEAR WATER BAY</p>
        <p class="footer-brand__sub">${esc(t.common.siteLabel)}</p>
        <p class="footer-brand__tag">${esc(t.hero.tagline)}</p>
        <div class="footer-legal">
          <span class="k">${esc(t.footer.sellerLabel)}</span>
          <span class="v">${esc(t.footer.seller)}</span>
          <span class="k">${esc(t.footer.controllerLabel)}</span>
          <span class="v v--long">${esc(t.footer.controller)}</span>
          <span class="k">${esc(t.footer.developerLabel)}</span>
          <span class="v">${esc(t.footer.developer)}</span>
        </div>
      </div>
      <div>
        <h4>${esc(t.footer.siteNavLabel)}</h4>
        <nav class="footer-links">
          <a href="${ctx.link('home')}">${esc(t.nav.home)}</a>
          <a href="${ctx.link('home')}#overview">${esc(t.nav.overview)}</a>
          <a href="${ctx.link('floorplan')}">${esc(t.nav.floorplan)}</a>
          <a href="${ctx.link('location')}">${esc(t.nav.location)}</a>
          <a href="${ctx.link('sales')}">${esc(t.nav.sales)}</a>
          <a href="${ctx.link('vip')}">${esc(t.nav.vip)}</a>
        </nav>
      </div>
      <div>
        <h4>${esc(t.footer.legalLabel)}</h4>
        <div class="footer-links">
          <button type="button" data-modal-open="disclaimer">${esc(t.footer.disclaimerLink)}</button>
          <button type="button" data-modal-open="privacy">${esc(t.footer.privacyLink)}</button>
          <a href="${ctx.link('privacy')}">${esc(t.footer.privacyPageLink)}</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <span class="updated">${esc(t.footer.updatedLabel)}：${esc(config.lastUpdated)}</span>
      <span>${esc(t.footer.copyright)}</span>
    </div>
  </div>
</footer>`;
}

function shell(ctx, opts) {
  const t = ctx.t;
  return `<!DOCTYPE html>
<html lang="${t.htmlLang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(opts.title)}</title>
  <meta name="description" content="${esc(opts.desc)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(opts.title)}">
  <meta property="og:description" content="${esc(opts.desc)}">
  <meta property="og:image" content="${ctx.assetPrefix}assets/images/cwb-og-image.png">
  <meta property="og:locale" content="${OG_LOCALE[ctx.lang]}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(opts.title)}">
  <meta name="twitter:description" content="${esc(opts.desc)}">
  <meta name="twitter:image" content="${ctx.assetPrefix}assets/images/cwb-og-image.png">
  <link rel="stylesheet" href="${ctx.assetPrefix}assets/css/site.css">
</head>
<body class="page-${opts.bodyId}${opts.bodyId === 'home' ? '' : ' page-sub'} lang-${ctx.lang}">
  <a class="skip-link" href="#main">${esc(t.common.skipToMain)}</a>
  ${headerHtml(ctx)}
  <main id="main">
${opts.main}
  </main>
  ${footerHtml(ctx)}
  ${dockHtml(ctx)}
  ${modalsHtml(ctx)}
  <script src="${ctx.assetPrefix}assets/js/contact-consultation.js"></script>
  <script src="${ctx.assetPrefix}assets/js/site.js"></script>
</body>
</html>
`;
}

/* ---------------- 首页区块 ---------------- */

function heroHtml(ctx) {
  const t = ctx.t;
  const v = videoPaths(ctx.lang);
  const poster = ctx.assetPrefix + 'assets/images/cwb-og-image.png';
  return `<section class="hero">
    <video class="hero-video" autoplay muted loop playsinline preload="metadata" poster="${poster}" aria-hidden="true" tabindex="-1"
      data-video-desktop="${urlEnc(ctx.assetPrefix + v.desktop)}"
      data-video-tablet="${urlEnc(ctx.assetPrefix + v.tablet)}"
      data-video-mobile="${urlEnc(ctx.assetPrefix + v.mobile)}"></video>
    <div class="hero__content">
      <div class="hero__text">
        <p class="hero__eyebrow" data-reveal style="--ri:0">
          <span>${esc(t.hero.eyebrow)}</span>
          <span class="chip chip--paper">${esc(t.hero.status)}</span>
        </p>
        <h1 class="hero__name" data-reveal style="--ri:1">
          <span class="hero__name-num">33</span>
          <span class="hero__name-text">CLEAR WATER BAY</span>
        </h1>
        <p class="hero__sub" data-reveal style="--ri:2">${esc(t.hero.subtitle)}</p>
        <p class="hero__tagline" data-reveal style="--ri:3">${esc(t.hero.tagline)}</p>
        <div class="hero__cta" data-reveal style="--ri:4">
          <a class="btn btn--solid" href="${ctx.link('vip')}">${esc(t.hero.ctaVip)} ${ICONS.arrow}</a>
          <a class="btn btn--outline" href="${ctx.link('floorplan')}">${esc(t.hero.ctaFloorplan)}</a>
        </div>
      </div>
    </div>
    <div class="hero__scroll"><span>${esc(t.hero.scroll)}</span><i></i></div>
  </section>`;
}

function statsHtml(ctx) {
  const t = ctx.t;
  return `<section class="stats-bar" aria-label="${esc(t.overview.eyebrow)}">
    <div class="container">
      <div class="stats-grid">
${t.stats
  .map(
    (s, i) => `        <div class="stat" data-reveal="step" style="--ri:${i}">
          <div class="stat__value">${esc(s.value)}${s.unit ? `<span class="stat__unit">${esc(s.unit)}</span>` : ''}</div>
          <div class="stat__label">${esc(s.label)}</div>
        </div>`
  )
  .join('\n')}
      </div>
    </div>
  </section>`;
}

function overviewHtml(ctx) {
  const t = ctx.t;
  return `<section class="section" id="overview">
    <div class="container overview-grid">
      <div class="overview-copy" data-reveal>
        <p class="eyebrow">${esc(t.overview.eyebrow)}</p>
        <h2 class="section-title">${esc(t.overview.title)}</h2>
        <p class="lead">${esc(t.overview.body)}</p>
      </div>
      <div class="overview-highlights">
${t.overview.highlights
  .map(
    (h, i) => `        <article class="highlight-card" data-reveal="step" style="--ri:${i}">
          <span class="highlight-card__no">0${i + 1}</span>
          <h3>${esc(h.h)}</h3>
          <p>${esc(h.p)}</p>
        </article>`
  )
  .join('\n')}
      </div>
    </div>
  </section>`;
}

const UNIT_KEYS = ['p2', 'p3', 'p4', 'special'];

function unitRouteId(key) {
  return key === 'special' ? 'unit-special' : 'unit-' + key;
}

function unitCardHtml(ctx, key, idx, fullFeatures) {
  const t = ctx.t;
  const u = t.floorplan.types[key];
  const features = fullFeatures ? u.features : u.features.slice(0, 3);
  return `<article class="unit-card" data-reveal="side" style="--ri:${idx}">
          <span class="unit-card__no">0${idx + 1}</span>
          <h3>${esc(u.name)}</h3>
          <p class="unit-card__tag">${esc(u.tagline)}</p>
          <ul>
${features.map((f) => `            <li>${esc(f)}</li>`).join('\n')}
          </ul>
          <a class="unit-card__link" href="${ctx.link(unitRouteId(key))}">${esc(t.floorplan.eyebrowDetail)}<em>→</em></a>
        </article>`;
}

function unitsSectionHtml(ctx) {
  const t = ctx.t;
  return `<section class="section section--tint">
    <div class="container">
      <div data-reveal>
        <p class="eyebrow">${esc(t.floorplan.eyebrow)}</p>
        <h2 class="section-title">${esc(t.floorplan.title)}</h2>
        <p class="lead">${esc(t.floorplan.intro)}</p>
      </div>
      <div class="units-grid">
${UNIT_KEYS.map((k, i) => unitCardHtml(ctx, k, i, false)).join('\n')}
      </div>
      <div class="section-foot" data-reveal style="--ri:4">
        <a class="btn btn--ink" href="${ctx.link('floorplan')}">${esc(t.floorplan.link)} ${ICONS.arrow}</a>
      </div>
    </div>
  </section>`;
}

function promoSectionHtml(ctx) {
  const t = ctx.t;
  return `<section class="section">
    <div class="container">
      <div class="split-grid">
        <article class="promo-card" data-reveal style="--ri:0">
          <p class="eyebrow">${esc(t.sales.eyebrow)}</p>
          <h3>${esc(t.sales.title)}</h3>
          <span class="chip">${esc(t.sales.status)}</span>
          <p>${esc(t.sales.intro)}</p>
          <a class="link-more" href="${ctx.link('sales')}">${esc(t.common.more)} →</a>
        </article>
        <article class="promo-card" data-reveal style="--ri:1">
          <p class="eyebrow">${esc(t.location.eyebrow)}</p>
          <h3>${esc(t.location.title)}</h3>
          <p>${esc(t.location.address)}</p>
          <p>${esc(t.location.items[0].p)}</p>
          <a class="link-more" href="${ctx.link('location')}">${esc(t.common.more)} →</a>
        </article>
      </div>
    </div>
  </section>`;
}

function ctaBandHtml(ctx) {
  const t = ctx.t;
  return `<section class="cta-band section--dark">
    <div class="container" data-reveal>
      <h2>${esc(t.vip.title)}</h2>
      <a class="btn btn--solid" href="${ctx.link('vip')}">${esc(t.hero.ctaVip)} ${ICONS.arrow}</a>
    </div>
  </section>`;
}

function renderHome(ctx) {
  return [
    heroHtml(ctx),
    statsHtml(ctx),
    overviewHtml(ctx),
    unitsSectionHtml(ctx),
    promoSectionHtml(ctx),
    ctaBandHtml(ctx),
  ].join('\n');
}

/* ---------------- 户型页 ---------------- */

function pageHeroHtml(ctx, { eyebrow, title, lead, back }) {
  const backHtml = back
    ? `<a class="back-link" href="${ctx.link(back.to)}">← ${esc(back.label)}</a>\n    `
    : '';
  return `<section class="page-hero">
    <div class="container">
    ${backHtml}<p class="eyebrow">${esc(eyebrow)}</p>
      <h1 class="section-title" style="max-width:none">${esc(title)}</h1>
${lead ? `      <p class="lead">${esc(lead)}</p>` : ''}
    </div>
  </section>`;
}

function renderFloorplanIndex(ctx) {
  const t = ctx.t;
  const main = pageHeroHtml(ctx, {
    eyebrow: t.floorplan.eyebrow,
    title: t.floorplan.title,
    lead: t.floorplan.intro,
  }) + `
  <section class="section page-body" style="padding-top:0">
    <div class="container">
      <div class="units-grid">
${UNIT_KEYS.map((k, i) => unitCardHtml(ctx, k, i, true)).join('\n')}
      </div>
      <p class="official-note" data-reveal>${esc(t.floorplan.officialNote)}</p>
    </div>
  </section>`;
  return { main, title: t.meta.floorplanTitle, desc: t.floorplan.intro };
}

function renderUnit(ctx, key) {
  const t = ctx.t;
  const u = t.floorplan.types[key];
  const specs = u.features
    .map((f) => {
      const m = f.match(/^(.+?)[：:]\s*(.+)$/);
      if (!m) return null;
      return { k: m[1], v: m[2] };
    })
    .filter(Boolean);

  const main = pageHeroHtml(ctx, {
    eyebrow: t.floorplan.eyebrowDetail,
    title: u.name,
    lead: u.desc,
    back: { to: 'floorplan', label: t.floorplan.backLabel },
  }) + `
  <section class="section page-body" style="padding-top:0">
    <div class="container">
      <div class="unit-hero">
        <div>
          <p class="unit-hero__tag" data-reveal>${esc(u.tagline)}</p>
          <dl class="spec-list" data-reveal="step">
${specs.map((s) => `            <div><dt class="k">${esc(s.k)}</dt><dd class="v">${esc(s.v)}</dd></div>`).join('\n')}
          </dl>
          <p class="official-note">${esc(t.floorplan.officialNote)}</p>
          <div style="margin-top:30px" data-reveal>
            <a class="btn btn--ink" href="${ctx.link('vip')}">${esc(t.floorplan.cta)} ${ICONS.arrow}</a>
          </div>
        </div>
        <div class="pending-frame" data-reveal style="--ri:1">
          <div class="pending-frame__icon">${ICONS.plan}</div>
          <h3>${esc(t.floorplan.planPendingTitle)}</h3>
          <p>${esc(t.floorplan.planPending)}</p>
        </div>
      </div>
    </div>
  </section>`;
  return { main, title: t.meta.unitTitles[key], desc: u.desc };
}

/* ---------------- 销售资料页 ---------------- */

function renderSales(ctx) {
  const t = ctx.t;
  const main = pageHeroHtml(ctx, {
    eyebrow: t.sales.eyebrow,
    title: t.sales.title,
    lead: t.sales.intro,
  }) + `
  <section class="section page-body" style="padding-top:0">
    <div class="container">
      <div class="doc-list">
${t.sales.docs
  .map(
    (d, i) => `        <article class="doc-item" data-reveal="step" style="--ri:${i}">
          <div class="doc-item__icon">${ICONS.doc}</div>
          <div>
            <h3>${esc(d.name)}</h3>
            <p>${esc(d.desc)}</p>
          </div>
          <span class="chip">${esc(d.status)}</span>
        </article>`
  )
  .join('\n')}
      </div>
      <div class="hotline-panel" data-reveal>
        <p class="hotline-panel__text">${esc(t.sales.contactHint)}</p>
        <a class="btn btn--solid" href="${ctx.link('vip')}">${esc(t.hero.ctaVip)} ${ICONS.arrow}</a>
      </div>
      <p class="sales-note">${esc(t.sales.note)}</p>
    </div>
  </section>`;
  return { main, title: t.meta.salesTitle, desc: t.sales.intro };
}

/* ---------------- 位置页 ---------------- */

const LOC_ICONS = ['train', 'transit', 'school', 'mall'];

function renderLocation(ctx) {
  const t = ctx.t;
  const main = pageHeroHtml(ctx, {
    eyebrow: t.location.eyebrow,
    title: t.location.title,
    lead: t.location.address,
  }) + `
  <section class="section page-body" style="padding-top:0">
    <div class="container">
      <div class="loc-address" data-reveal>
        <span class="loc-address__label">${esc(t.location.addressLabel)}</span>
        <span class="loc-address__value">${esc(t.location.address)}</span>
      </div>
      <div class="loc-grid">
${t.location.items
  .map(
    (it, i) => `        <article class="loc-card" data-reveal="step" style="--ri:${i}">
          <div class="loc-card__icon">${ICONS[LOC_ICONS[i]]}</div>
          <div>
            <h3>${esc(it.h)}</h3>
            <p>${esc(it.p)}</p>
          </div>
        </article>`
  )
  .join('\n')}
      </div>
    </div>
  </section>`;
  return { main, title: t.meta.locationTitle, desc: t.location.address + '。' + t.location.items[0].p };
}

/* ---------------- VIP 登记页 ---------------- */

function renderVip(ctx) {
  const t = ctx.t;
  const main = pageHeroHtml(ctx, {
    eyebrow: t.vip.eyebrow,
    title: t.vip.title,
    lead: t.vip.intro,
  }) + `
  <section class="section page-body" style="padding-top:0">
    <div class="container">
      <div class="vip-steps">
${t.vip.steps
  .map(
    (s, i) => `        <article class="vip-step" data-reveal="step" style="--ri:${i}">
          <div class="vip-step__no">0${i + 1}</div>
          <h3>${esc(s.h)}</h3>
          <p>${esc(s.p)}</p>
        </article>`
  )
  .join('\n')}
      </div>
      <div class="vip-guide" data-reveal>
        <div class="vip-guide__icon">${ICONS.arrowDown}</div>
        <p>${esc(t.vip.guide)}</p>
      </div>
      <p class="vip-privacy">${esc(t.vip.privacyNote)} <a href="${ctx.link('privacy')}">${esc(t.footer.privacyPageLink)}</a></p>
    </div>
  </section>`;
  return { main, title: t.meta.vipTitle, desc: t.vip.intro };
}

/* ---------------- 私隐政策页 ---------------- */

function renderPrivacy(ctx) {
  const t = ctx.t;
  const p = t.privacyPolicy;
  const main = pageHeroHtml(ctx, {
    eyebrow: t.footer.privacyPageLink,
    title: p.title,
    lead: null,
  }) + `
  <section class="section page-body" style="padding-top:0">
    <div class="container">
      <article class="policy-article">
        <p class="policy-updated">${esc(p.updated)}</p>
        <p class="lead">${esc(p.intro)}</p>
${p.sections
  .map(
    (s) => `        <h2 data-reveal>${esc(s.h)}</h2>
${s.ps.map((x) => `        <p data-reveal="step">${esc(x)}</p>`).join('\n')}`
  )
  .join('\n')}
        <div class="policy-note">${esc(p.note)}</div>
      </article>
    </div>
  </section>`;
  return { main, title: t.meta.privacyTitle, desc: p.intro };
}

/* ---------------- 主流程 ---------------- */

const RENDERERS = {
  home: renderHome,
  floorplan: renderFloorplanIndex,
  'unit-p2': (ctx) => renderUnit(ctx, 'p2'),
  'unit-p3': (ctx) => renderUnit(ctx, 'p3'),
  'unit-p4': (ctx) => renderUnit(ctx, 'p4'),
  'unit-special': (ctx) => renderUnit(ctx, 'special'),
  sales: renderSales,
  location: renderLocation,
  vip: renderVip,
  privacy: renderPrivacy,
};

function main() {
  let count = 0;
  const written = [];
  for (const lang of LANGS) {
    for (const route of routes) {
      const ctx = makeCtx(lang, route);
      const out = RENDERERS[route.id](ctx);
      const opts =
        route.id === 'home'
          ? { title: ctx.t.meta.homeTitle, desc: ctx.t.meta.homeDesc }
          : { title: out.title, desc: out.desc };
      const mainHtml = typeof out === 'string' ? out : out.main;
      const html = shell(ctx, {
        ...opts,
        bodyId: route.bodyId,
        main: mainHtml,
      });
      const file = lang === 'tc' ? route.file : lang + '/' + route.file;
      const abs = path.join(ROOT, file);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, html, 'utf8');
      written.push(file);
      count++;
    }
  }
  console.log(`Generated ${count} pages (tc root + en/ + sc/).`);
  console.log(written.map((f) => '  ' + f).join('\n'));
}

main();
