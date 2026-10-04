# TEST-GLM-GAME-PLAYER-OPCODE-RESIDUAL-1 — player opcode residual contracts

Status: build
Owner: GLM
Reviewer: Codex（独立验收）
Phase: phase1
Capability: game / player opcode semantics
Branch: `codex/glm-game-player-opcode-residual-r1`
Visual Verification Timing: e2e-deferred

## 目标与范围

补齐 `packages/game/src/core/event-opcode-player.ts` 中仍未被旧测、GLM event contracts、已归档 Game 卡证明的玩家 opcode 合同；不以覆盖率或例数作为本卡指标。重点核对合法 role/equipment/magic/status 输入、HP/MP 钳制、装备/魔法/状态写回、升级随机字段和失败返回。

先对照 `event-opcode-player.test.ts`、`event-opcode-player.cov85.test.ts`、`event-opcode-player.glm-next-wave.test.ts` 和全量 fullName 排重；已证同 caller/同 oracle 只登记，不包装测试。

## 硬约束与交付

只写本卡专属测试、合法 typed fixture 和证据；不得改产品、旧测、配置、baseline、真实 PAL 数据、私有 state 或后门。不得强转、skip、ignore、扩大 timeout、业务核心 mock。每条合同记录 source/caller/input/oracle/fullName；反控必须原始绿→指定业务红→恢复绿并保存 raw/JSON/exit/执行集/三态 hash/清理证明。交付定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check；覆盖率只记录到整体 main。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-GAME-PLAYER-OPCODE-RESIDUAL-1 的 Coding Owner（GLM）。先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡及已归档 Game 卡；只在 codex/glm-game-player-opcode-residual-r1 工作。先对 event-opcode-player.ts 与三套旧测做 fullName/caller/input/oracle 排重，再补合法 role/equipment/magic/status/level-up 合同。不得改产品、旧测、配置、baseline、真实数据、私有 state、强转、skip、ignore、扩大 timeout 或业务核心 mock。反控须三态绿红绿、唯一业务 AssertionError、执行集、raw/JSON、三态 hash 和清理证明。交付定向/相邻测试、typecheck、lint 0/0/0、docs、diff 和完整 SHA；不得把覆盖率或例数当完成条件，不得标 done。
```
