(function () {
  'use strict';

  /**
   * 33 Clear Water Bay — 全站共享联系脚本（单一数据源，流程文档 §3.1）。
   *
   * 规则：
   * 1. WhatsApp 电话与预填消息只在此处定义一次，全站按钮仅使用 [data-ps-whatsapp] 标记；
   *    禁止在任何 HTML 中硬编码 https://wa.me/ 链接或复制消息文案。
   * 2. 中文必须经 encodeURIComponent() 编码后拼入 URL。
   * 3. 已存在的按钮一律复用（含悬浮按钮），绝不重复注入第二个 WhatsApp 按钮（§11.5）。
   * 4. 电话按钮由生成器从 work/data/site-config.cjs 直接渲染 tel: 链接，本脚本不改动其号码。
   *
   * 运行时验收：node work/verify-contact-runtime.cjs
   * 预期输出（流程文档 §6.3）：
   *   Base: https://wa.me/85253392749
   *   Text: NA您好，我想登記 33 Clear Water Bay 示範單位預約。 【來源：33clearwaterbay 官網】
   *   Target: _blank
   *   Rel: noopener noreferrer
   */

  var WHATSAPP_PHONE = '85253392749';
  var WHATSAPP_MESSAGE = 'NA您好，我想登記 33 Clear Water Bay 示範單位預約。 【來源：33clearwaterbay 官網】';
  var WHATSAPP_TARGET = '_blank';
  var WHATSAPP_REL = 'noopener noreferrer';

  function getWhatsAppUrl() {
    return 'https://wa.me/' + WHATSAPP_PHONE + '?text=' + encodeURIComponent(WHATSAPP_MESSAGE);
  }

  function init() {
    if (typeof document === 'undefined') return;
    var buttons = document.querySelectorAll('[data-ps-whatsapp]');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      btn.setAttribute('href', getWhatsAppUrl());
      btn.setAttribute('target', WHATSAPP_TARGET);
      btn.setAttribute('rel', WHATSAPP_REL);
    }
  }

  var api = {
    getWhatsAppUrl: getWhatsAppUrl,
    whatsappPhone: WHATSAPP_PHONE,
    message: WHATSAPP_MESSAGE,
    target: WHATSAPP_TARGET,
    rel: WHATSAPP_REL,
  };

  // 供运行时验证脚本读取（Node 环境无 window 时挂到 module.exports）。
  if (typeof window !== 'undefined') {
    window.__CWB_CONTACT__ = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})();
