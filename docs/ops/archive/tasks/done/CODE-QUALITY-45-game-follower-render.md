# CODE-QUALITY-45 — game follower render 窄批

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

保留原卡「CODE-QUALITY-45 — game follower render 窄批」的任务归属与历史边界。原目标见原文(摘录:Scope: `packages/game/src/present/follower-render.ts`、`follower-render.test.ts`、`follower-render-gap);本页治理不重开已终态任务。

## 范围

原卡含章节[CODE-QUALITY-45 — game follower render 窄批、前提与范围、逐文件核验计划、当前证据、收口验证、下一位 Agent 提示词],共2个原文链接。治理范围仅限文档角色、保全与链接处置,不改产品/测试/coverage。

## 前提与证据

固定main源2581B(SHA 4c20b25e4384);原卡前提按原时点保留。当前存活入口:[present-leaves-gates.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json)、[present-leaves-local.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-local.json)

## 验收

本页治理验收=模板符合+原文逐字节保全+链接处置如实;原卡验收结论保持原时点(原Status:done),治理不改写。

## 状态与交接

done保持原语义;本治理候选为作者稿(partial/needs),交Owner非作者接收;无新执行授权。

## 历史范围

原卡属固定main时点;CODE-QUALITY-45 — game follower render 窄批的原始范围与日期在保全块内逐字保留。

## 原始结论

原卡结论按其Status(done)原样;治理不撤销/不恢复旧信用。

## 当时证据

原文2个链接与当时回执属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;不凭旧基点认定当前实现或授权新产品取舍。

## 继任文档

接替/关联入口见原文链接;当前任务导航以看板为准。 关联:[present-leaves-gates.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json)、[present-leaves-local.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-local.json)


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2581B / SHA-256 4c20b25e4384cf4c53c06e142570ac8a88483957b4833bf49090810af42b5ad8；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-45 — game follower render 窄批

Status: done
Phase: phase1 game
Coding Owner: Codex
Scope: `packages/game/src/present/follower-render.ts`、`follower-render.test.ts`、`follower-render-gap.grok-r1.test.ts`
Visual Verification Timing: e2e-deferred（跟随者演出观感留集中 E2E；本批核位置/帧索引纯函数合同）

## 前提与范围

0x98 额外跟随者渲染来自 SDLPal `scene.c:210-226,732-743,767-771`、`res.c:335-348`，真实 caller 是
`present.ts`。本批只核 trail ownership、sprite chunk 身份、方向/步帧、站立/行走和缺槽边界；不改变
移动、碰撞、脚本或资源 schema。

## 逐文件核验计划

- `follower-render.ts`：全文读取 follower 数组、trail 索引、方向映射、步帧和缺槽跳过，核 `present.ts` caller。
- 两份测试：全文核合法 trail/typed 输入、缺 follower/缺槽/越界 step、多 follower 与直接 render-item oracle；
  对照 `scene.c`/`res.c`，排除与 `follower-pos` 已有合同的重复。

## 当前证据

已读取三个范围文件、`present.ts`、`follower-pos` 相邻实现与 SDLPal 锚点；未发现直接缺陷。

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

原三文件：明确trail写Owner、稠密前缀和MGO chunk；测试去死_step与无效null工厂分支，四步预期独立列值。仅撤稀疏fixture的生产覆盖信用，正常缺尾与公开number参数防御保留；实现体不变。

[A-H, callers, native evidence and limits](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-local.json); [complete current gates](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json). Original failures/counts remain historical; no broad/adjacent file or deferred visual credit. Git integration is recorded separately.
```
<!-- incremental-original-source:end -->
