# TEST-GLM-REFORGE-BATTLE-FLOW-1 — public battle flow contracts

Status: build
Owner: GLM
Reviewer: Codex（独立验收）
Phase: phase2
Capability: reforge / battle public flow
Branch: `codex/glm-reforge-battle-flow-r1`
Visual Verification Timing: mixed

## 目标

对 Reforge 的公开战斗流程做一轮大范围质量补测，覆盖命令选择、目标锁定、行动提交、状态效果、胜负/逃跑、终局演出和写回恢复；避开已完成的 host lifecycle/runtime-session 卡，也不因私有表现层状态制造伪合同。

## 独占范围

只允许写 `packages/reforge/src/battle/` 本卡测试、合法 typed fixture 和证据。重点包括：

- `battle-command-selection.ts`：菜单阶段、输入锁、目标选择、合法/非法 Confirm；
- `battle-core.ts`：攻击/魔法/物品/状态效果/偷窃/逃跑的业务结果；
- `battle-session.ts`：公开 `done`、opts 回调、cancel、enemy/player action 交接和清理；
- `battle-result.ts`、`battle-settlement-presentation.ts`、`battle-finalization.ts`：胜负、奖励、逃跑和终局回执；
- `battle-turn-readiness.ts`、`battle-action-presentation-scheduler.ts`：行动准备与演出完成后继续流程；
- `battle-host.ts`、公开 launch/preparation caller：缺失输入、拒绝和恢复路径。

先对照所有 `battle/*.test.ts`、`*.residual.test.ts`、`*.glm-next-wave.test.ts`、已归档 Reforge host/runtime 卡和全量 fullName 做排重；`battle-session` private `state/visual` 不得反射，表现层只收有公开业务 oracle 的合同。

## 质量与安全约束

- 每条合同必须有 source:line、公开 caller、合法 typed 输入、可观察业务 oracle、唯一 fullName 和最近旧测差异。
- 不改产品、旧测、配置、baseline、真实 PAL 数据；禁止私有反射、业务核心 mock、强转、skip、ignore、扩大 timeout。
- 断言业务状态、事件、队列、奖励、清理或公开结果；调用次数只能作为辅助断言。
- 反控提供原始绿→指定业务红→恢复绿、唯一 AssertionError、执行集、raw/JSON/exit、四态 hash、clean-tree/mkdtemp 清理证明。

## 验证与交付

交付 identity/family ledger、existing-proof/blocked 账、反控证据、定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check。覆盖率只记录为整体 main 数据，不是本卡门槛。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-REFORGE-BATTLE-FLOW-1 的 Coding Owner（GLM）。先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡和已归档 Reforge host/runtime 卡；只在 codex/glm-reforge-battle-flow-r1 工作。
先对 battle-command-selection、battle-core、battle-session、battle-result、battle-settlement-presentation、battle-finalization、battle-turn-readiness、battle-action-presentation-scheduler、battle-host 的旧 fullName/caller/input/oracle 排重，再补公开战斗流程合同。
不得改产品、旧测、配置、baseline、真实数据、私有 state/visual、__rf*、强转、skip、ignore、扩大 timeout 或业务核心 mock。每条合同必须有业务 oracle；反控必须三态绿红绿、四态 hash、执行集和清理证明。
交付定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check 和完整 SHA。不得把覆盖率或测试数量当完成条件，不得标 done。
```
