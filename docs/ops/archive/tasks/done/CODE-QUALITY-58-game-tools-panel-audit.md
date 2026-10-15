# CODE-QUALITY-58 — game tools panel audit

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 game/tools
Visual Verification Timing: functional-ui（DOM/委托/生命周期；不做剧情 E2E）

## 目标

逐文件核验生产工具面板及两份专属测试，确认 tab/DOM ownership、键盘传播、battle/scene/dialog/timer 只读投影、音量/缩放/FPS 委托、minimap 生命周期和导入导出 caller 合同；不改变 UI 形态或公共接口。

## 范围

- `packages/game/src/tools/tools-panel.ts`
- `packages/game/src/tools/tools-panel.test.ts`
- `packages/game/src/tools/tools-panel.glm-phase1-leaves.test.ts`

只读相邻 caller/oracle：`packages/game/src/shell/bootstrap.ts:1030-1120`、`packages/game/src/tools/minimap.ts`、`packages/game/src/tools/save-io.ts`、`packages/game/src/tools/quick-save.ts`、`packages/game/src/core/inspect/battle-inspect.ts`、`CLAUDE.md:129`。

## 前提真值门

- 一句话行为 / 工程前提：工具面板是 canvas 外的只读/便利 UI，状态读取来自 `GameState`，玩家动作只委托到 bootstrap 注入的保存、音量、缩放与 minimap controller。
- 原版/primary source：工具面板属于 type-pal 新增工具能力，SDLPal 无对应 UI；`N/A`。第一阶段真值仅约束其不改变核心战斗/移动/存档语义。
- 当前实现：`tools-panel.ts:1-1014`、bootstrap `setupToolsPanel` caller；测试覆盖 DOM、键盘、委托、战斗签名、对话搜索、计时器和 minimap 装配。
- 当前 `before -> after`：仍待逐文件核验 -> 保持现有 DOM/状态委托，登记 caller/oracle/生命周期证据；不扩大产品形态。
- 最强替代解释：工具面板的导入存档按钮可能把 save-io 的版本合同暴露给用户；该风险已单独开 CODE-QUALITY-59，不能由本卡关闭。

## 风险与边界

- `tools-panel.ts` 自身不拥有存档 schema，但 `serializeSave/parseImportedSave` 是用户可触发的 save/import 边界；CODE-QUALITY-59 发现版本字段未校验，故本卡保持 review，不改实现。
- 生产工具面板不是 DEV-only；DOM 生命周期、键盘 stopPropagation、定时器和文件下载/导入副作用必须保持可追踪。

## 验证

- 完整读取 1014 行实现、383 行主测试、107 行 leaves 测试和 bootstrap/minimap/save caller。
- 定向范围与相邻：`tools-panel.test.ts`、`tools-panel.glm-phase1-leaves.test.ts`，18 tests；minimap/dev-panel caller 已在 CODE-QUALITY-56 与本轮读取中核验。
- 当前结论：CODE-QUALITY-59 的 phase1 VERSION=1 guard 已完成并通过；tools-panel 及两份测试共 18 定向 tests、全仓质量门通过，未发现本卡直接缺陷。

## 交接

- 2026-10-13 Codex：完整读取 tools-panel 1014 行、两份测试及 bootstrap/minimap/save caller；定向 18 tests、全仓 check/ratchet/protected fast/lint-zero/docs/content/ledger 全部通过。导入存档 version 合同由 CODE-QUALITY-59 独立收口；本卡无产品形态或公共接口变更。账本收口为 `3266 / 290 closed / 8 review / 2968 pending`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-58 game tools panel audit
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-58-game-tools-panel-audit.md
当前状态：done，已归档；不得修改 save/schema
先读：本卡、AGENTS.md、CLAUDE.md、tools-panel.ts 及两份测试、bootstrap.ts setupToolsPanel caller、save-io.ts、quick-save.ts
请做：若重开审计，重新复核 DOM/键盘/委托/定时器/输入隔离；不得直接重用本卡作为新 build 授权
输出：caller/oracle 证据；当前结论为 accept/done
```
