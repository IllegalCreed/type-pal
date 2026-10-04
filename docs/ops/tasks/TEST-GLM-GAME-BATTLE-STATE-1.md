# TEST-GLM-GAME-BATTLE-STATE-1 — battle action, AI and settlement contracts

Status: build
Owner: GLM
Reviewer: Codex（独立验收）
Phase: phase1
Capability: game / battle state machine
Branch: `codex/glm-game-battle-state-r1`
Visual Verification Timing: e2e-deferred

## 目标

对 Game 战斗状态机做一轮大范围但可审计的合同补测，覆盖行动选择、敌方 AI、状态结算、动画/行动队列、胜负/逃跑和奖励恢复的真实公开路径。每条合同必须是独立业务轴；不通过堆重复场景或换数字扩大数量。

## 独占范围

只允许写 `packages/game/src/core/battle/` 下本卡专属测试、合法 typed fixture 和证据。重点包括：

- `battle-system.ts`：主菜单/目标选择/输入锁/阶段拒绝/行动提交；
- `battle-state.ts`、`battle-runtime-context.ts`：阶段、角色/敌人存活、队伍目标和恢复状态；
- `battle/actions/*.ts`：attack、magic、item、throw-item、defend、flee 的合法/拒绝/完成路径；
- `enemy-ai.ts`、`turn-queue.ts`：行动排序、无合法目标、状态影响和延迟回合；
- `battle-settlement.ts`、`battle-finalization.ts`、`battle-progression.ts`：奖励、经验、逃跑、失败和终局只结算一次；
- `battle-anim-driver.ts` / `anim-timeline.ts`：公开行动完成回调与队列恢复，不断言纯渲染调用序列。

先读取并排重 `battle-system.test.ts`、`battle-system.glm-next-wave.test.ts`、`battle-opcodes*.test.ts`、`actions.test.ts`、`enemy-ai.test.ts`、`turn-queue.test.ts`、`battle-finalization.test.ts`、`battle-settlement*.test.ts` 以及已归档 Game 卡。已有同 caller/同状态 oracle 的合同只登记。

## 质量与安全约束

- 每条合同记录 source:line、公开 caller、合法 typed 输入、业务 oracle、唯一 fullName、最近旧测差异。
- 不改产品、旧测、共享配置、baseline、真实 PAL 数据；不调用私有函数/私有 world state，不使用业务核心 mock、强转、skip、ignore 或扩大 timeout。
- 状态合同必须断言业务状态、事件、奖励、队列或恢复结果；单纯 `toHaveBeenCalled`、渲染存在、任意 count 不算。
- 反控必须原始绿→指定业务红→恢复绿，唯一业务 AssertionError、执行集、raw/JSON/exit、三态 hash、清理证明齐全；CLI/fixture 用 mkdtemp 隔离。

## 验证与交付

交付 fresh identity、逐合同排重账、source hash、existing-proof/blocked 账、反控证据、定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check。覆盖率只作为整体 main 的观察数据，不作为本卡完成条件。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-GAME-BATTLE-STATE-1 的 Coding Owner（GLM）。先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡和已归档 Game 测试卡；只在 codex/glm-game-battle-state-r1 工作。
先逐合同排重 battle-system、battle-state、battle-runtime-context、battle/actions、enemy-ai、turn-queue、battle-settlement、battle-finalization、battle-progression、battle-anim-driver 的旧 fullName/caller/input/oracle，再实现未证明的行动、AI、状态、结算和恢复合同。
不得改产品、旧测、配置、baseline、真实数据或其它卡；禁止私有 state、业务核心 mock、强转、skip、ignore、扩大 timeout。每条合同写 source/caller/input/oracle/fullName 差异账；反控必须三态绿红绿和完整证据。
交付定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check 和完整 SHA。不得把覆盖率或测试数量当完成条件，不得标 done，等待 Codex 独立验收。
```
