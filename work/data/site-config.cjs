'use strict';

/**
 * 33 Clear Water Bay — 全站唯一配置源（单一数据源原则，见《网站开发与交付流程.md》§3.1）。
 *
 * 联系常量、卖方资料、项目关键事实都在此定义一次；页面由 work/build-local-routes.cjs
 * 生成时引用，绝不在 HTML 中硬编码。修改本文件后必须重新运行：
 *   node work/build-local-routes.cjs
 */

module.exports = {
  projectName: '33 Clear Water Bay',
  lastUpdated: '2026-10-01',

  // —— 联系功能（§3.1：全站只定义一次）——
  // WhatsApp 的电话与预填消息只在 assets/js/contact-consultation.js 中定义（浏览器运行时统一生成）；
  // 本配置仅定义静态电话按钮数据（生成器据此渲染 tel: 链接，保证无 JS 时仍可拨打）。
  // 按客户要求：页面不显示任何电话号码数字，联系按钮只保留图标。
  contactPhone: '83000221',

  // —— 项目关键事实（语言无关的数字与编号）——
  facts: {
    addressNumber: '33',
    phaseOneUnits: '361',
    areaFrom: '492',
    areaTo: '1,039',
    keyDate: '30/11/2026',
    primarySchoolNet: '45',
    totalUnits: '2,000+',
    towerCount: '5',
    nonResidentialGfaSf: '675,600',   // 67.56萬平方呎（住宅以外樓面，來源：批則報道）
    commercialSf: '約65萬',            // 商場規模（來源：報道標題）
  },

  // —— 追踪与隐私 ——
  // 本站默认不加载任何第三方追踪像素；如日后加入，必须先实现 Cookie 接受/拒绝（§11.6）。
  trackingEnabled: false,
};
