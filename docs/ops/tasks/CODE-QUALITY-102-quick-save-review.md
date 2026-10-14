# CODE-QUALITY-102 — 快存快读工具审核（quick-save）

Status: draft（review-only 交付，无实现改动；quick-save.test.ts 带 fixture 登记）
Owner: GLM（2026-10-15 按总 goal 自主推进）
Reviewer: Codex（独立验收）
Phase: phase1
Capability: Q3 tools governance
Visual Verification Timing: N/A（工具层，无产品/UI行为修改）

## 目标与范围

工具域切片（1 生产 + 1 测试 + 1 相邻），不碰 CODE94/95 白名单与 97-101 批文件：

- `packages/game/src/tools/quick-save.ts`（61 行，product）
- `packages/game/src/tools/quick-save.test.ts`（52 行，test）
- 相邻：`tools/toast.test.ts`

零代码改动；交付物=逐文件结论 + E-13 登记。

## 前提真值门

一句话工程前提：快存快读是纯快捷键工具，存/读机制经 QuickSaveDeps 注入（bootstrap 接线 Save/loadGameFromSlot），本文件只做键绑定 + 时机门 + toast 反馈。

| 方向 | 直接证据 |
|---|---|
| Primary source | quick-save.ts:1-4 注释：F5/F9 固定槽 1、快存限 explore 防战斗/剧情脏档（读回会乱）、F5 preventDefault 拦浏览器刷新；快读复用整套读档恢复链。属第一阶段工程自有工具（sdlpal 无对应浏览器快捷键语义），不冒充原版机制。 |
| 第一阶段 | 真实 caller：`shell/bootstrap.ts:98` setupQuickSave（deps 注入 getGs/Save.saveSlot/loadGameFromSlot）；canQuickSave 读 gs.mode/dialogBox/menuStack 与 mode.ts 的 mode 语义一致。 |
| 第二阶段 | N/A。 |
| 目标 | 逐文件四维结论 + E-13 登记；不改行为。 |

最强替代解释：测试绿可能掩盖 toast 反馈路径。复核：toast 路径确实无测试（观察项，非缺陷——工具层反馈文本属 UI 观感域，按分层验证纪律留 E2E 批）；核心判别（guard 拒绝不调 saveSlot）有反例测试。

## 逐文件结论（四维）

### quick-save.ts — 通过

- 正确性与边界：canQuickSave 三条件门（explore+无对话+无菜单，注释写明"防脏档读回乱"的 why）；SSR 守卫（window undefined 返空解绑）；返回解绑函数（测试/重绑）；save/load 全路径 try/catch + toast（成功/失败/被拒/空槽四种反馈齐全）；F5/F9 均 preventDefault。
- 注释质量：头注释 4 行讲清职责边界/设计原因/浏览器拦截——准确无过时。
- 内聚/耦合：纯工具层，机制全注入（deps 接口 3 字段最小面）；不触碰 Save 实现（CODE-101 已核）。
- 复用：toast 复用 tools/toast.js；无死面（canQuickSave/setupQuickSave 均有 caller/测试）。

### quick-save.test.ts — review 持保留（1 项登记）

- 合同主干真实：真 KeyboardEvent 分发、vi.waitFor 异步同步、dispose afterEach 隔离、"不可存态不调 saveSlot"反例判别力好。
- **发现 E-13（fixture 合法性，同 E-7/CODE95 类）**：`exploreGs` 用 `({mode,dialogBox,menuStack,...over}) as never` 部分对象伪装完整 GameState（合法工厂 `createInitialGameState` 存在且全仓惯用）。并入 E-批统一修复（同批 ratchet）。

## 验证

- 定向：quick-save + 相邻 toast = 2 files / 8 tests PASS（VITEST_MAX_WORKERS=1，2026-10-15 01:05）。
- 全门：零代码改动，共用 `5cb6b9d22` 树完整门禁 + 97-101 批后复验；本批追加文档后复验见证据目录。
- 账本：新增 1 行 review。

## 下一步

Codex 独立验收；E-13 并入 E-批。后续候选：tools 剩余（display-scale/fps-overlay/map-names 已 3j 闭合、speedrun 已闭合、analytics 待核）或 game present 剩余 pending。无用户裁决需求。
