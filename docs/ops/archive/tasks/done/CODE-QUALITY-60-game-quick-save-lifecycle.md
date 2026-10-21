# CODE-QUALITY-60 — game quick-save lifecycle

> 2026-10-21当前复审仍partial：[八维与完整原件](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/save-tools-local.json)。快存主测强化未完成IO不得报成功、失败不得留成功提示及F6放行，MSIO三条重复迁入其canonical合同。18条定向/相邻、game typecheck和scoped Biome零诊断；故意提前成功提示时旧8条全绿、新两条业务断言红，已恢复正文。统一门留存档模块收尾，未新增accept或关闭文件；下文done为历史时点。

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

2026-10-21 Codex：唯一Owner，治理树3y，基点92e901806926c0fb08b9787877eed9ed45147d8d。完整核当前两文件、相邻parser/MSIO/toast及真实bootstrap/Save边界；A–H逐文件写入回执。纯测试合同迁移与注释修正，无产品执行变化、用户槽位或schema修改。旧MSIO的D1移入save-io主测，E1/E2/E3并入强化后的quick-save主测；20→18包含toast相邻，不以数量或包绿授验收。覆盖率、protected和全仓check未运行，本中间片未推送/合并，CODE60保持partial，待完整模块门后正式裁定。

- 2026-10-13 Codex：F5/F9 准入、preventDefault、解绑函数、Save/loader 异常 toast 与 bootstrap caller 均核验；save wave 全门通过。账本收口为 `3266 / 292 closed / 8 review / 2966 pending`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-60 game quick-save lifecycle
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-60-game-quick-save-lifecycle.md
当前状态：done，已归档
若重开审计：复核 quick-save.ts/test、bootstrap caller 与 save version boundary；不得直接重用本卡作为新 build 授权
当前结论：accept/done，无实现改动
```
