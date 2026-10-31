# CODE-QUALITY-109 — Codex 当前验收（2026-10-17）

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

原审计「CODE-QUALITY-109 — Codex 当前验收（2026-10-17）」的主题按原文时点保留(摘录:完整读取： - `packages/game/src/analytics/install-analytics.ts`（57 行） - `packages/game/src/anal)。

## 范围与证据

原报告含章节[CODE-QUALITY-109 — Codex 当前验收（2026-10-17）、读取范围、当前结论、修复、验证]、0个链接;固定main源2330B(SHA 21f2cf15ca1d)。当前存活入口:无当前仓库内存活链接。

## 发现

原文发现/计数/日期按原时点保留在保全块;本页不重算审计结论。

## 结论

原结论保持原时点;治理不改写审计判定,不撤销旧撤信,不恢复旧完成声明。

## 整改与复核

本治理候选仅覆盖文档角色与保全;整改事实以原文与后继卡为准;候选待Owner接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2330B / SHA-256 21f2cf15ca1d0b502ef91d921c49bd6789b0b08ad86a48ecafeb8d4e14dc52b8；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-109 — Codex 当前验收（2026-10-17）

## 读取范围

完整读取：

- `packages/game/src/analytics/install-analytics.ts`（57 行）
- `packages/game/src/analytics/install-analytics.test.ts`（38 行）
- `packages/game/src/analytics/analytics-consent.ts`、`analytics-consent-ui.ts`、
  `google-analytics.ts`
- 三组相邻主/边界测试：`analytics-consent*.test.ts`、`analytics-consent-ui.test.ts`、
  `google-analytics*.test.ts`
- 唯一生产 caller：`packages/game/src/main.ts`，包括 `isProd` gate、try/catch 启动边界和
  首屏 bootstrap 生命周期。

primary/caller/oracle：`main.ts` 的生产安装入口；consent storage/event、DNT/GPC 默认拒绝、
GA measurement ID/URL sanitize/page-view 去重、UI destroy 和 `startGoogleAnalytics` 的
unsubscribe/disable-key 逻辑；测试 oracle 是 DOM、dataLayer、script tag、storage 和 listener
ownership。

## 当前结论

`installTypePalAnalytics` 只组装 consent UI 与 Google Analytics 两个 disposer，不改产品
游戏状态、存档、输入或脚本；main 只在浏览器环境调用，并将初始化异常隔离在 analytics
try/catch。测量 ID 是合法常量，生产 gate 与相邻模块的隐私/URL 合同一致。

发现一项测试生命周期缺口：第二个 install 用例原来丢弃返回的 installation，未销毁 consent
listener 和 UI root；当前测试数量与当前两例通过不能证明隔离。没有生产行为反例，不改变
analytics 实现。

## 修复

`install-analytics.test.ts` 现在保存 `TypePalAnalyticsInstallation`，在 `afterEach` 统一
调用 `destroy()` 并清空引用；第一例不再重复手动销毁。业务断言、合法输入、DNT/GPC oracle
保持不变。

## 验证

- 修复前正确 game runner：analytics 6 files / 23 tests PASS，0 stderr；错误的仓库根 Vitest
  命令曾因绕过 game jsdom 配置产生 `window/document is not defined`，该结果不计入通过，已
  单独记录为 runner-scope evidence。
- 修复后正确 game runner：6 files / 23 tests PASS，0 stderr。
- game typecheck：PASS。

本批不改产品行为、GA 网络策略、schema/save、公共接口或生成物；收口前仍需全仓
`pnpm check`、official coverage ratchet、protected fast、lint-zero、docs、ledger、diff check。
```
<!-- incremental-original-source:end -->
