# CODE-QUALITY-109 — game analytics 安装器生命周期复核

Status: review
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

保留原卡「CODE-QUALITY-109 — game analytics 安装器生命周期复核」的任务归属与历史边界。原目标见原文(摘录:Reviewer: Codex（独立验收） Capability: game / analytics / installation lifecycle Visual Verification Timi);本页治理不重开已终态任务。

## 范围

原卡含章节[CODE-QUALITY-109 — game analytics 安装器生命周期复核、目标与白名单、完整读取与事实、发现与修复、当前验证、收口要求与边界],共0个原文链接。治理范围仅限文档角色、保全与链接处置,不改产品/测试/coverage。

## 前提与证据

固定main源3250B(SHA 211dc07a1b79);原卡前提按原时点保留。当前存活入口:无当前仓库内存活链接。

## 验收

本页治理验收=模板符合+原文逐字节保全+链接处置如实;原卡验收结论保持原时点(原Status:review),治理不改写。

## 状态与交接

review保持原语义;本治理候选为作者稿(partial/needs),交Owner非作者接收;无新执行授权。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3250B / SHA-256 211dc07a1b79b7c03efc3e0ea6e84ffaf8deb53fb1a15c85ac2d75ebe2d9cec4；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
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
```
<!-- incremental-original-source:end -->
