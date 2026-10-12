# CODE-QUALITY-76 — game main loop contract

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 game/shell
Visual Verification Timing: N/A（帧调度与逻辑合同；剧情画面集中到 E2E）

## 目标

逐文件核验主循环 wrapper 及其直接测试，确认 fixed logic cadence、rAF accumulator、mode 切换、冻结、present 门控、scene-context ownership 和取消生命周期与 SDLPal/第一阶段约束一致。

## 范围

- `packages/game/src/shell/main-loop.ts`
- `packages/game/src/shell/main-loop.test.ts`
- `packages/game/src/shell/main-loop-gates.grok-r1.test.ts`
- 只读 caller/oracle：`shell-bootstrap.glm-shell.test.ts`、`menu-input-lock.glm-msio.test.ts`、`bootstrap.ts`、`core/mode.ts`、`tools/speedrun/index.ts`、SDLPal `game.c/play.c`。
- 不修改 `CODE-QUALITY-57` bootstrap thumbnail review，也不改产品时序、输入模型、存档或公共接口。

## 前提真值门

- 一句话工程前提：逻辑 tick 按 SDLPal 的 10/25 FPS cadence 推进，rAF 只负责 wall-clock 采样与 present，手动暂停冻结世界但不改变恢复后的逻辑 ownership。
- 真值来源：`reference/sdlpal/game.c:43-86`、`reference/sdlpal/play.c:513-565`、`reference/sdlpal/game.h:28`、`reference/sdlpal/battle.h:29`、`packages/game/src/shell/main-loop.ts:1-181`。
- 当前 `before` -> 目标 `after`：现有主循环实现 -> 逐段核验并保留已核实行为；本卡无实现改动。
- 最强替代解释 / 推翻观察：若真实 bootstrap RAF caller、mode dispatcher 或 scene input caller 显示 tick 被重复消费、恢复后补帧或 present 在无效窗口发生，则需另开行为修复卡；当前 33 定向合同和 caller 证据未显示直接缺陷。
- 是否主动偏离已核真值：N/A（纯治理核验，无行为改动）。

## 上下文锚点

- `CLAUDE.md` 忠实还原规则；`docs/phase1/engineering-notes.md` 帧调度/演出时序；`docs/phase1/game-mechanics.md` 无数值改动。
- `main-loop.ts:49-181` interval、accumulator、tickN、startRafLoop；`core/mode.ts:17-112` tickByMode dispatcher；`bootstrap.ts:481-520,1916` caller；`shell-bootstrap.glm-shell.test.ts:279-326` 真实 RAF chain。
- 已知坑：`fadeState`/`paletteFadeState`/`battleFade`/`battleAnim` 的 present 不是逻辑 tick；`scene-fade` 才抑制 held input；`suspendRaf` 由 bootstrap onPresent owner 处理。
- 不得重新引入：每 rAF 多 tick catch-up、fade 提速逻辑、手动暂停消费输入、menu modal 穿透、取消后 RAF 自续订。

## 验证

- 完整读取实现 181 行、主测试 217 行、G09 测试 247 行、menu input lock caller、真实 bootstrap RAF caller、mode dispatcher、speedrun pause caller 与 SDLPal primary source。
- 定向 33 tests 全绿：`main-loop.test.ts` 12、`main-loop-gates.grok-r1.test.ts` 13、`menu-input-lock.glm-msio.test.ts` 2、`shell-bootstrap.glm-shell.test.ts` 6。
- 合同覆盖：tickN/scene context、10/25 FPS、巨大 dt 单 tick、余量结转、mode 切换、fade/battle animation present、scene-fade input suppression、manual pause、bus drain、nowMs/dump、菜单 modal freeze/release、真实 RAF cancel。
- 无实现改动；未以 game 包全绿单独关闭文件，三个范围文件均有直接 caller/oracle 证据。

## 当前模式推进记录

- Codex 范围/前提核验: verified（实现、caller、primary source 和测试合同直接读取）。
- Coding Owner / 隔离分支: Codex / `/Users/zhangxu/illegal/type-pal-quality-3x` / `codex/code-quality-3y`。
- build 准入: Codex build allowed（只读治理与账本更新；实现白名单为空）。
- Codex 独立验收: accept（定向、相邻、全仓质量门与 ledger 通过）。
- 用户产品裁决: N/A（无行为改动）。
- done 准入: Codex done allowed。

## 交接

- 2026-10-13 Codex：完成逐文件核验；无实现改动。定向 33 tests、game 全包 3528、全仓 `pnpm check`、coverage ratchet/protected fast、lint-zero、docs/content review、ledger 通过；未发现直接缺陷。账本收口为 `3267 / 334 closed / 8 review / 2925 pending`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-76 game main loop contract
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-76-game-main-loop-contract.md
当前状态：done，已归档；无实现改动。下一批请从新的 pending 文件开始，不要把 CODE-QUALITY-57 thumbnail review 当作已关闭。
```
