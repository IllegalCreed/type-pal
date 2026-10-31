# CODE-QUALITY-46 — game draw confirm menu 窄批

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

保留原卡「CODE-QUALITY-46 — game draw confirm menu 窄批」的任务归属与历史边界。原目标见原文(摘录:Scope: `packages/game/src/present/menu/draw-confirm.ts`、`draw-confirm.glm-phase1-leaves.test.ts`、`op);本页治理不重开已终态任务。

## 范围

原卡含章节[CODE-QUALITY-46 — game draw confirm menu 窄批、前提与范围、逐文件核验计划、当前证据、收口验证、下一位 Agent 提示词],共2个原文链接。治理范围仅限文档角色、保全与链接处置,不改产品/测试/coverage。

## 前提与证据

固定main源2551B(SHA 5a7ee51c86e9);原卡前提按原时点保留。当前存活入口:[present-leaves-gates.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json) [present-leaves-local.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-local.json)。

## 验收

本页治理验收=模板符合+原文逐字节保全+链接处置如实;原卡验收结论保持原时点(原Status:done),治理不改写。

## 状态与交接

done保持原语义;本治理候选为作者稿(partial/needs),交Owner非作者接收;无新执行授权。

## 历史范围

原卡属固定main时点;CODE-QUALITY-46 — game draw confirm menu 窄批的原始范围与日期在保全块内逐字保留。

## 原始结论

原卡结论按其Status(done)原样;治理不撤销/不恢复旧信用。

## 当时证据

原文2个链接与当时回执属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;不凭旧基点认定当前实现或授权新产品取舍。

## 继任文档

接替/关联入口见原文链接;当前任务导航以看板为准。 关联:[present-leaves-gates.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json) [present-leaves-local.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-local.json)。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2551B / SHA-256 5a7ee51c86e93e120212e79f311fdd8efd7aed1746d194e351d94dae5069e8f4；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-46 — game draw confirm menu 窄批

Status: done
Phase: phase1 game
Coding Owner: Codex
Scope: `packages/game/src/present/menu/draw-confirm.ts`、`draw-confirm.glm-phase1-leaves.test.ts`、`opening-confirm-pixels.grok-r1.test.ts`
Visual Verification Timing: e2e-deferred（菜单观感留集中 E2E；本批核像素/状态合同）

## 前提与范围

确认/开关两项框复用 SDLPal `uigame.c:242-365,368-388` 的 SelectionMenu 布局；生产 caller 是
`present.ts`、`draw-menu.ts`、`draw-shop.ts`。本批只核框体坐标、标签、选中闪烁、阴影、空标签和 framebuffer
ownership；不改变菜单形态、输入状态、脚本或公共接口。

## 逐文件核验计划

- `draw-confirm.ts`：全文读取 selectedColor 时间依赖、双框布局、labels 复用、renderText shadow 和 callers。
- 两份测试：全文核 fixture glyph/UI frame、像素 oracle、时间冻结、空/多字标签与输入状态隔离，排重已有 menu tests。

## 当前证据

已读取实现、两份直接测试、present/menu/shop callers 与 `uigame.c` 锚点；未发现直接缺陷。

## 收口验证

- 定向 Vitest：10/10 通过；game typecheck：通过。
- game 全包：311 test files，3519/3519 通过。
- `pnpm check`：docs/content、shared、game、pal-extract、reforge 通过；editor 既有 `number-field-adoption.test.ts` 失败（`command-form-controls.tsx@Num` 实际 37、期望 39），未改 editor 或 coverage 配置。
- `pnpm coverage:ratchet`：通过，基线不变（19,798 tests）。
- protected `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`：通过，0 项下降。
- docs/content review、lint-zero、ledger、`git diff --check`：归档后复核通过。

## 下一位 Agent 提示词

无下一位 Agent；Codex继续完成本批审计，未完成准入前不得扩大范围或标记 done。

## 2026-10-21 基础绘制与同版本只读补证收口

原三文件：确认框委托既有纯menu-colors，条件中的Date读取次数保持；固定双框不冒称SDL任意长标签布局。固定F9反控旧10绿→新1时序红；空标签改精确底色，原开关、三影及框坐标合同保留。

[A-H, callers, native evidence and limits](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-local.json); [complete current gates](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json). Original failures/counts remain historical; no broad/adjacent file or deferred visual credit. Git integration is recorded separately.
```
<!-- incremental-original-source:end -->
