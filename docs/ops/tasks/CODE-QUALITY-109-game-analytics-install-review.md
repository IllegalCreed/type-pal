# CODE-QUALITY-109 — game analytics 安装器生命周期复核

Status: review
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1
Capability: game / analytics / installation lifecycle
Visual Verification Timing: N/A（本批只修测试 teardown，不改 UI 形态）

## 目标与白名单

逐文件复核并补齐：

- `packages/game/src/analytics/install-analytics.ts`
- `packages/game/src/analytics/install-analytics.test.ts`

相邻 consent/UI/GA 文件和 `packages/game/src/main.ts` 仅作 caller、oracle 和生命周期读取，
不在本批修改。

## 完整读取与事实

已完整读取安装器、测试、consent storage/event、隐私信号、consent UI、Google Analytics
runner 及相邻测试；唯一生产 caller 是 `packages/game/src/main.ts` 的浏览器 `isProd`
入口，初始化异常被隔离，返回的 installation 由调用方目前不持有（页面生命周期结束时无需
额外产品动作）。SDLPal 不提供本功能 primary；隐私/网络合同由当前项目设计与相邻测试
作为 oracle，禁止将 GA 事件扩展到游戏状态、战斗、存档或输入。

## 发现与修复

原 `install-analytics.test.ts` 第二个用例丢弃 `installTypePalAnalytics()` 返回值，导致
consent listener 跨用例存活；这是测试隔离/资源 ownership 缺口，不是 analytics 生产行为
缺陷。修复将 installation 存入局部测试变量，`afterEach` 统一 `destroy()` 并清空引用，
保留原有合法 Measurement ID、DNT/GPC、无 script 请求和 UI 可见性断言。

## 当前验证

- 正确 game runner：6 files / 23 tests PASS，0 stderr。
- game typecheck：PASS。
- 从仓库根直接调用 Vitest 会绕过 game jsdom 配置并报 `window/document` 不存在；该错误
  已记录为 runner scope，不修改测试配置来掩盖。

## 收口要求与边界

批次收口必须运行全仓 `pnpm check`、official coverage ratchet、protected fast、lint-zero、
`pnpm check:docs`、ledger 和 `git diff --check`。coverage baseline 回退保持原样，不降低
阈值或增加排除。任何 GA 网络、隐私 UI、公共入口、schema/save 或用户可感知行为变化都要
另开高风险卡并暂停实现。

## 2026-10-17 批次收口回执

- 正确 game runner 定向：analytics 6 files / 23 tests PASS、0 stderr；game typecheck PASS。
- 全仓 `pnpm check` exit 0：content 149/149、shared 16/16、game 321/3613、
  pal-extract 72/434、reforge 359/8964、editor 631/4943、migrate 96/739；各包
  typecheck/test 完成，lint 4962 files 为 0 errors / 0 warnings / 0 infos。
- `pnpm check:docs`、`node scripts/quality/code-quality-ledger.mjs`、`git diff --check`
  通过；当前账本 3307 tracked / 231 closed / 32 review / 3044 pending。
- official `pnpm coverage:ratchet` 和 protected fast 仍因既有 shared 447/466 statements、
  203/218 branches，pal-extract 1068/1546 statements、461/593 branches、111/140
  functions、943/1367 lines 以及总量回退失败；本批未改 baseline。
- 仅测试 teardown ownership 发生变化；生产安装器、`main.ts` caller、GA 网络/隐私策略、
  schema/save、公共接口和生成物均未修改。两个文件保持 `review`，不标 `done`。
