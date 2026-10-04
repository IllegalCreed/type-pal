# TEST-GLM-GAME-TURN-BOUNDARIES-1 — battle turn and finalization contracts

Status: build
Owner: GLM
Reviewer: Codex（独立验收）
Phase: phase1
Capability: game / battle turn boundaries
Branch: `codex/glm-game-turn-boundaries-r1`
Visual Verification Timing: e2e-deferred

## 目标

补齐战斗回合队列与结算边界的真实业务合同，重点核验等待、拒绝、终局和恢复语义；不以覆盖率或新增例数作为本卡指标。

## 独占范围

只允许新增 `packages/game/src/core/battle/` 本卡测试、合法 typed fixture 和本卡证据：

- `turn-queue.ts`：空队列、同速排序、死亡/逃跑成员移除、阻塞动作完成后继续取队列；
- `battle-finalization.ts`：胜负/逃跑/全员阵亡结算、奖励与脚本恢复只发生一次；
- `battle-system.ts` / `battle-state.ts` 的公开回合 caller：输入锁、阶段拒绝、目标选择结束后的唯一提交。

先逐项对照 `turn-queue.test.ts`、`battle-finalization.test.ts`、`battle-system.test.ts`、已归档 Game 合同卡和全量 fullName 排重；已有同 caller/同状态 oracle 的测试只登记，不包装重复。

## 硬约束与交付

- 每条合同写 source:line、公开 caller、合法 typed 输入、业务 oracle、唯一 fullName。
- 不改产品、旧测、配置、baseline、真实 PAL 数据；禁止私有函数/world state、业务核心 mock、强转、skip、ignore、扩大 timeout。
- 反控必须原始绿→指定业务红→恢复绿，保留唯一业务 AssertionError、执行集、raw/JSON、exit、三态 hash、清理证明。
- 交付 fresh identity/排重账、定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check；覆盖率只记录到整体 main。

## 当前模式推进记录

- Codex 范围/前提核验: verified
- Coding Owner / 隔离分支: GLM / `codex/glm-game-turn-boundaries-r1`
- build 准入: Codex build allowed
- Codex 独立验收: pending
- done 准入: blocked

## 下一位 Agent 提示词

```text
你是 TEST-GLM-GAME-TURN-BOUNDARIES-1 的 Coding Owner（GLM）。
先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡，及已归档 GLM Game 卡。
在 codex/glm-game-turn-boundaries-r1 隔离工作树中，先对 turn-queue.ts、battle-finalization.ts、battle-system.ts、battle-state.ts 的旧 fullName、caller、输入和 oracle 排重，再实现尚未证明的回合/结算合同。
不得改产品、旧测、配置、baseline、真实 PAL 数据或其它任务；不得用私有 state、业务核心 mock、强转、skip、ignore、扩大 timeout。
每条测试必须有 source/caller/input/oracle/fullName 账；反控必须原始绿→指定业务红→恢复绿并保存完整证据。
交付定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check 和完整 SHA。
覆盖率和测试数量只做整体记录，不是本卡完成条件；不得标 done，等待 Codex 独立验收。
```
