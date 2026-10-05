# TEST-GLM-GAME-EVENT-STATE-OPCODES-1 — event state and opcode business contracts

Status: build
Phase: phase1
Capability: game / event state mutations and opcode business effects
Coding Owner: GLM
Reviewer: Codex（独立验收）
Contributor: GLM
Branch: `codex/glm-game-event-state-opcodes-r1`
Visual Verification Timing: e2e-deferred

## 目标

审计 Game 事件解释器中仍未证明的业务状态 opcode：物件/角色状态、场景对象、队伍/背包/装备、镜头与脚本结果写回。控制流 end/goto/reset/0x7F/0x0A 已由 `TEST-GLM-GAME-EVENT-CONTROL-FLOW-1` 收口，本卡只补不同业务 oracle 的状态效果。

## 范围

- `packages/game/src/core/event-system.ts` 的 `applyRawOpcode` 业务分支与公开 `tickEventSystem` caller；`event-opcode-player.ts` 仅限尚未由 opcode residual/event contracts 证明的状态写回。
- 重点审计对象状态/位置/方向、party/scene/camera、inventory/equipment/poison、script success/failure、pending item 与清理；每个候选必须有真实 typed event object/party/input。
- 先对 `event-system.test.ts`、`event-system.cov85.test.ts`、`event-system.glm-event-contracts.test.ts`、K01-K06、opcode residual、event-opcode-player 全量 fullName 排重。
- 不重复 `TEST-GLM-GAME-EVENT-CONTROL-FLOW-1`、`TEST-GLM-GAME-TURN-BOUNDARIES-1`，不跑剧情 E2E，不读私有 cursor/`__tpgs`，不改产品/旧测/config/baseline/真实 PAL 数据。

## 验收条件

- 逐 source:line × public caller × legal input × business oracle × fullName 分类 `NEW / existing-proof / unreachable / product-counter`。
- 新合同必须断言公开业务结果：状态/位置/资源/scene mode/清理/脚本返回，不只断言内部 ip 或调用次数。
- 反控严格绿→指定业务红→恢复绿，恰一 AssertionError，完整 JSON/raw/exit/signal/spawn、file×fullName identity、三态 hash 与清理证明。
- 定向/相邻/Game 全量、typecheck、lint 0/0/0、docs、diff 全过；覆盖率与新增数量不是单卡门槛。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-GAME-EVENT-STATE-OPCODES-1 的 Coding Owner（GLM）。先读 AGENTS.md、CLAUDE.md、docs/phase1/engineering-notes.md、docs/phase1/game-mechanics.md、本卡、TEST-GLM-GAME-EVENT-CONTROL-FLOW-1、GAME-TURN-BOUNDARIES-1 及所有 event/opcode 归档卡。
只在 codex/glm-game-event-state-opcodes-r1 工作。先对 event-system.ts applyRawOpcode 业务分支与 event-opcode-player.ts 状态写回做 fullName×caller×合法输入×oracle 排重；排除刚收口的控制流合同和战斗回合合同。
重点审计对象/party/scene/camera/inventory/equipment/poison/script-result/清理业务轴；无合法 public caller 或已有真实证明就登记 existing-proof/unreachable/product-counter，不凑数。
只写本卡测试、合法 fixture、证据与回执；禁止产品/旧测/config/baseline/真实数据、私有 cursor/__tpgs、核心 mock、强转、skip、ignore、扩 timeout 和剧情后门。反控必须严格三态、恰一业务 AssertionError、完整执行集/hash/清理证明。
交付定向/相邻 test、typecheck、lint 0/0/0、docs、git diff --check 和完整 SHA。覆盖率/例数不是完成条件，不得标 done，等待 Codex 独立验收。
```
