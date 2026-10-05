# CODE-QUALITY-3o - game core mode/history/poison/search 逐文件治理

Status: review
Phase: phase1 game
Capability: ops / code-quality
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: N/A（纯状态/搜索 helper）
Contributor: Codex
Branch: codex/code-quality-governance
Base: `f9daa6a29`

## 目标与范围

逐文件核验 `dialog-history.ts`、`mode.ts`、`player-poison-state.ts`、`scene-system-search.ts` 及真实 callers/tests；保持历史环形缓冲、顶层 mode 调度、毒状态寿命/槽位和 Confirm Search 的原版 cell/trigger 语义。

- 白名单生产文件：上述 4 个 `packages/game/src/core` 文件。
- 范围外：event-opcode-player、scene-system、battle-system、save/schema、生成物、E2E、coverage runner。

## 前提真值门

- 一句话前提：四个 helper 的输入 ownership、状态生命周期、搜索网格与 mode 门控和现行 caller/第一阶段真值一致，异常输入不产生跨 session 污染。
- 真值来源：`reference/sdlpal/play.c`/`scene.c`/`global.c`；`packages/game/src/core/mode.ts` caller ordering；bootstrap/event-system/scene-system callers；对应 tests。
- 当前 before -> 目标 after：`小型 core helper 的职责和边界分散 -> 四文件逐项记录 caller、状态、反例和验证结论`。
- 最强替代解释 / 推翻观察：mode 门控和 Search trigger 的反直觉阈值可能是 sdlpal 真值；若现有测试/primary source证明，保留不改；若 session history、poison slot 或 search hit 会跨实例串扰，则前提被推翻并修复。
- 是否主动偏离已核真值：N/A。

## 上下文锚点

- `AGENTS.md`：逐文件 ledger、硬零诊断、少而精测试和第一阶段真值门。
- `CLAUDE.md`：原版 play/scene/global 行为与状态边界。
- `docs/ops/audits/code-quality-file-ledger.md`：Q3n 后 186 个已闭合、5 个 review、2,773 个尚未核验。
- 不得重新引入：history buffer 跨读档残留、mode tick 在阻塞等待中错误推进、level>=99 伪毒误判、Search trigger mode 阈值/格子顺序被凭直觉改写。

## 验证

- 逐文件完整读取生产源码、真实 caller、primary source 和 tests；未知项留 review。
- 若修代码：定向/相邻 game tests、game typecheck、全仓 `pnpm check`、support ratchet、protected fast、Biome 零诊断。

## 当前模式推进记录

- Codex 前提核验：verified（四文件小域、primary source/caller 已列）。
- build 准入：Codex build allowed；仅 direct evidence 窄修。
- 贡献者交付/自验：Codex；定向 5 files/42 tests、game 全包 3403、typecheck 通过；四个生产文件审计保留，未改实现。
- Codex 独立验收：accept（mode/history/poison/search primary source、真实 callers、边界合同逐段核对；全仓 `pnpm check`、official ratchet、protected fast、Biome 零诊断通过）。
- 用户产品裁决/体验验收：N/A。
- done 准入：blocked，待提交推送和独立工作树核对；本卡只关闭四个 core helper，不代表 event-opcode/scene-system/battle-system/save 或全仓治理完成。

## 交接日志

- 2026-10-05 Codex：Q3n 已归档；开始 mode/history/poison/search 小批，先核 session ownership 和原版阈值，再决定是否修实现。
- 2026-10-05 Codex：四个 core helper 逐文件核验；history/mode/poison/search 均保持既有 caller/primary 合同，未发现直接缺陷。定向 42、game 全包 3403、全仓 check/ratchet/protected/lint 全通过。Next: 提交后归档，继续 event-opcode/scene-system/battle-system 未核文件。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-3o game core mode/history/poison/search 逐文件治理
任务卡：docs/ops/tasks/CODE-QUALITY-3o-game-core-mode-history-poison-search.md
当前状态：build；只能在四个白名单生产文件及对应 tests/callers 内工作。
你的角色：Codex Coding Owner / 独立验收。
先读：AGENTS.md、CLAUDE.md、本卡、code-quality-file-ledger.md、play.c/scene.c/global.c 锚点和四文件真实 callers/tests。
请你做：逐文件核 history/session、mode gates、poison slots/levels、search cells/thresholds；只有直接证据问题才修。
不要做：不得修改 event-opcode-player/scene-system/battle-system/save/schema/E2E/coverage runner，不得凭直觉改 trigger 阈值。
输出要求：每文件 verified/review/blocked；定向、game typecheck、pnpm check、support ratchet、protected fast、lint 全通过后更新账本、提交推送并标 done。
```
