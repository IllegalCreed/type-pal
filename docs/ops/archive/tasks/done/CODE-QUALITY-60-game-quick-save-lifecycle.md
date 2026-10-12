# CODE-QUALITY-60 — game quick-save lifecycle

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 game/tools / save wave
Visual Verification Timing: N/A（快捷键与 toast 生命周期）

## 目标

逐文件核验快速存档/读档快捷键、准入状态、取消解绑、异常传播与 bootstrap caller，确认 F5/F9 不越过战斗/对话/菜单门，不吞错误，不残留 window listener。

## 范围

- `packages/game/src/tools/quick-save.ts`
- `packages/game/src/tools/quick-save.test.ts`

只读相邻 caller/oracle：`packages/game/src/shell/bootstrap.ts:1110-1118`、`packages/game/src/tools/save-io.ts`、`packages/game/src/core/save/api.ts`、`packages/game/src/tools/save-import-quicksave.glm-msio.test.ts`、phase1 save plan 快捷键准入。

## 前提真值门

- 一句话行为 / 工程前提：F5 只在 explore、无 dialog、无 menu 时保存固定 slot 1；F9 委托 bootstrap 完整读档恢复；两键都 preventDefault 并将失败转为 toast。
- 原版/primary source：SDLPal 快速键是 type-pal 工具便利能力，N/A；phase1 save plan 与当前 bootstrap 注入 caller 定义准入和 slot 1 委托。
- 当前实现：`quick-save.ts:1-61`；bootstrap 注入 `Save.saveSlot` / `loadGameFromSlot`；MSIO 测试覆盖异常 toast/空槽。
- 当前 `before -> after`：文件仍待逐文件核验 -> 以真实 caller、测试 oracle 和 save wave 全门登记已验证；不改变快捷键或 slot 形态。

## 验证

- 完整读取实现、测试、bootstrap caller、Save API 与 save-io 边界。
- 定向 quick-save 4 tests；与 tools-panel/save-io/MSIO 合计 29 tests 全绿；game 全包 3522 tests。
- 同一 save wave 的 `pnpm check`、官方 ratchet、origin/main protected fast、lint-zero、docs/content review、ledger 全部通过；无实现改动。

## 当前模式推进记录

- Codex 范围/前提核验: verified
- Codex 独立验收: accept（2 文件逐段核验、真实 bootstrap caller、定向/相邻与全门通过）
- done 准入: Codex done allowed；本批无代码修改。

## 交接

- 2026-10-13 Codex：F5/F9 准入、preventDefault、解绑函数、Save/loader 异常 toast 与 bootstrap caller 均核验；save wave 全门通过。账本收口为 `3266 / 292 closed / 8 review / 2966 pending`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-60 game quick-save lifecycle
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-60-game-quick-save-lifecycle.md
当前状态：done，已归档
若重开审计：复核 quick-save.ts/test、bootstrap caller 与 save version boundary；不得直接重用本卡作为新 build 授权
当前结论：accept/done，无实现改动
```
