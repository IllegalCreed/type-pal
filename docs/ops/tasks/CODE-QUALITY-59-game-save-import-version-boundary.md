# CODE-QUALITY-59 — game save import version boundary

Status: blocked
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

## 前提真值门（blocked）

- 一句话工程前提：工具导入必须只接受当前 canonical save version；未知/未来/旧版本是否拒绝、迁移或允许，必须与当前 Save API 和开发期 current-only 纪律一致。
- 直接证据：`save-io.ts:4-23` 定义 `VERSION = 1` 并在 serialize 写出，但 parse 只检查 `format`/字段，不比较 `obj.version`；`tools-panel.ts:651-656` 直接把 parse 结果交给 `saveSlot`；现有 `save-io.test.ts` 与 MSIO 测试没有 wrong-version 反例。
- 替代解释：version 可能只是导出元数据、Save API 可能会自行 normalize；必须直接读取 `Save.saveSlot`/current-save codec 与现行开发期版本纪律确认，不能凭命名推断。
- 可证伪观察：若 `Save.saveSlot` 明确接受任意导入 DTO 并在唯一入口做 canonical migration，parse 层不校验可成立；若 Save API 直接持久化当前结构，则 unknown version 进入是边界缺陷。

## 硬停止线

- 这是 schema/save 边界：不得直接修改 `save-io.ts`、补断言、恢复旧 upgrader 或改变 Save API，直到完成四向真值矩阵并取得用户/工程裁决。
- 不得用新增弱测试把未知 version 当合法；可先添加失败反例到隔离草稿，但本卡当前只做只读证据，未经裁决不得改测试 oracle。

## 验证

- 已完整读取范围实现/测试、tools-panel/quick-save/bootstrap callers；定向 `save-io.test.ts`、`quick-save.test.ts`、`save-import-quicksave.glm-msio.test.ts` 共 11 tests 全绿，只证明现有合同，不覆盖 wrong-version。
- 当前状态 blocked：等待 canonical version/save ownership 裁决；本卡不进入 build，不运行产品修复质量门。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-59 game save import version boundary
任务卡：docs/ops/tasks/CODE-QUALITY-59-game-save-import-version-boundary.md
当前状态：blocked；不得开始实现、不得标记 done
先读：本卡、AGENTS.md、CLAUDE.md、save-io.ts、save-io.test.ts、save-import-quicksave.glm-msio.test.ts、tools-panel.ts:625-663、core/save/api.ts、reforge current-save 与 canonical save docs
请做：独立核对 canonical version、Save.saveSlot ownership、current-only 纪律，给出 premise verified/counter 或用户待裁决 before→after；不得直接修 parse version
输出：primary/caller/schema 证据与裁决需求
```
