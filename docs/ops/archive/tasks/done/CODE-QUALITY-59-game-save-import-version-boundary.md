# CODE-QUALITY-59 — game save import version boundary

> 2026-10-21当前复审accept：[CODE59/60逐文件A–H与完整原件](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/save-v1-local.json)。获准结构/历史非空/角色域修复先红后绿，52相邻、20386全仓check、19988 official ratchet/protected全部零诊断；5次原生文件/IDB入口验证。60复用有效九例及反控；不扩大到Save/IDB/面板整文件或94–102。下文保留历史时点。

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 game/tools / save boundary
Visual Verification Timing: N/A（存档合同，不做视觉验收）

## 目标

核定工具层导入存档的 version ownership 与 canonical schema，先停止实现。当前 `parseImportedSave` 检查 `format`、`partyMembers`、`wNumScene`，但忽略 payload `version`；这可能让未来/错误版本 JSON 进入当前 `Save.saveSlot`，属于 save 边界高风险问题。

## 范围

- `packages/game/src/tools/save-io.ts`
- `packages/game/src/tools/save-io.test.ts`
- `packages/game/src/tools/save-import-quicksave.glm-msio.test.ts`

只读相邻 caller/oracle：`packages/game/src/tools/tools-panel.ts:625-663`、`packages/game/src/tools/quick-save.ts:1-61`、`packages/game/src/shell/bootstrap.ts:1104-1118`、`packages/game/src/core/save/api.ts`、`packages/reforge/src/save/current-save.ts`、当前 canonical save docs 与 `reference/sdlpal/global.c` save/load anchors。

## 前提真值门

- 一句话工程前提：phase1 工具导入格式只接受本工具当前 `VERSION=1`，未知/未来/旧版本在 parse 层拒绝；它不消费 phase2 reforge 的 SAVE12 payload。
- 原版/primary source：SDLPal 原生不提供这个 JSON 导入格式，N/A；phase1 工具设计明确要求“导入需基本校验(版本/必要字段)”（`docs/phase1/plans/2026-06-13-prod-tools-panel.md:80,279-323`）。
- 第一阶段当前实现：`save-io.ts:4-23` 定义 `VERSION=1` 并写出 header，但 parse 未比较 `obj.version`；`tools-panel.ts:651-656` 直接把 parse 结果交给 `Save.saveSlot`；`core/save/api.ts:52-67` 只做 slot/deepClone，不做导入 envelope 校验；phase1 save plan 的 v1 JSON 合同与当前实现同源。
- 当前二阶段设计边界：`docs/phase2/specs/save-system.md:1-18,95-120` 的 SAVE12/content22 是 reforge current codec；不应把它强行嫁接到 phase1 `GameState` 工具导入，也不应恢复旧 upgrader。
- 本任务目标：在不改变导入 JSON schema、Save API 或用户 UI 的前提下，补齐现有 VERSION=1 envelope 的 fail-closed 校验。
- `before -> after`：未知/未来/旧 `version` 当前被当作合法并送入 Save API；after 仅接受 `version===1`，其他版本抛出稳定格式错误。
- 最强替代解释 / 可证伪观察：若 phase1 Save API 明确把 version 视为无语义元数据，或存在唯一上游 migration caller，则 parse 层拒绝会改变既定合同；已直接读取 API/工具计划，未发现此类 caller，且计划明确要求版本校验。

## 硬停止线

- 这是 schema/save 边界：只允许在本卡白名单内补现有 VERSION=1 fail-closed guard；不得恢复旧 upgrader、改变 Save API 或增加兼容 fallback。
- 行为修复必须先写 wrong-version 失败反例，再做最小实现并跑相邻 save/quick-save 回归。

## 验证

- 已完整读取范围实现/测试、tools-panel/quick-save/bootstrap callers、phase1 工具计划、core Save API 与 phase2 current codec。
- 失败反例先行：`version=2` 的 phase1 envelope 在旧实现中被 `parseImportedSave` 接受，Vitest 退出 1；修复后 parse 在 format 后拒绝 `version !== 1`。
- 定向 save/tools-panel/quick-save/MSIO 共 29 tests 全绿，game typecheck 通过；不改变 JSON schema、Save API 或用户 UI。

## 交接

- 2026-10-13 Codex：旧实现对 `version=2` envelope 不拒绝；先写失败反例再补 `version !== 1` fail-closed guard。phase1 工具 SAVE1 与 phase2 reforge SAVE12 明确分界，不改 Save API、不恢复旧 upgrader。全仓 `pnpm check`、官方 ratchet、protected fast、lint-zero、docs/content review、ledger 全部通过；账本收口为 `3266 / 290 closed / 8 review / 2968 pending`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-59 game save import version boundary
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-59-game-save-import-version-boundary.md
当前状态：done，已归档
先读：本卡、AGENTS.md、CLAUDE.md、save-io.ts、save-io.test.ts、save-import-quicksave.glm-msio.test.ts、tools-panel.ts:625-663、core/save/api.ts、reforge current-save 与 canonical save docs
请做：若重开审计，复核 wrong-version 失败反例与 VERSION=1 guard；不得直接重用本卡作为新 build 授权
输出：失败反例、修复 diff、primary/caller/schema 证据、测试结果；当前结论为 accept/done
```
