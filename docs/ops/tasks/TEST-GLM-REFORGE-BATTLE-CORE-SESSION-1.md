# TEST-GLM-REFORGE-BATTLE-CORE-SESSION-1 — battle core and session business contracts

Status: build
Phase: phase2
Capability: reforge / battle core and session
Coding Owner: GLM
Reviewer: Codex（独立验收）
Contributor: GLM
Branch: `codex/glm-reforge-battle-core-session-r1`
Visual Verification Timing: mixed

## 目标

审计 Reforge 当前 Branch 瓶颈中的 battle core/session 公开业务合同：行动执行、目标选择、状态效果、物品/魔法/逃跑、异步交接、取消与 done 回执。终局奖励/音乐/结算已由 battle-flow 卡收口，本卡不得重复终局合同或只测私有 visual state。

## 范围

- `packages/reforge/src/battle/battle-core.ts`、`battle-session.ts`、`battle-command-selection.ts`、`battle-turn-readiness.ts`、`battle-action-presentation-scheduler.ts` 与真实 `main.battle-host-flows.test.ts` public caller。
- 重点审计 action input/target legality、damage/status/poison/steal/item/magic、player/enemy action handoff、cancel/abort/latest session、done/error cleanup 与公开 settlement input。
- 先读并排除 `TEST-GLM-REFORGE-BATTLE-FLOW-1`、HOST-LIFECYCLE、RUNTIME-SESSION、WORLD-LIFECYCLE 的 existing-proof；不碰 asset/audio/UI/剧情 E2E。
- 不改产品/schema/API/旧测/config/baseline/真实内容，禁止私有 `state/visual/__rf*`、核心 mock、强转、skip、ignore、扩 timeout。

## 验收条件

- 建立 battle-core/session family ledger，逐合同写 source/caller/legal input/oracle/fullName；不能合法构造的轴必须登记 blocked/unreachable。
- 新合同必须观察公开结果、事件、资源/状态、目标拒绝、session done/error/cancel 或可继续运行；调用次数仅作辅助。
- 反控必须全量或完整定向执行集，红相位恰一业务 AssertionError，严格核 exit/signal/spawn、pending/todo/runtime/collection、完整 identity、hash 与清理。
- 定向/相邻/Reforge 全包、typecheck、lint 0/0/0、docs、diff 通过；不以覆盖率或用例数量 accept。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-REFORGE-BATTLE-CORE-SESSION-1 的 Coding Owner（GLM）。先读 AGENTS.md、docs/phase2/READ-FIRST.md、docs/phase2/reference/phase1-knowledge-harvest.md、本卡及已归档 BATTLE-FLOW、HOST-LIFECYCLE、RUNTIME-SESSION、WORLD-LIFECYCLE 卡。
只在 codex/glm-reforge-battle-core-session-r1 工作。先对 battle-core.ts、battle-session.ts、battle-command-selection.ts、battle-turn-readiness.ts、battle-action-presentation-scheduler.ts、main.battle-host-flows.test.ts 做 fullName×caller×legal input×oracle 排重。
重点审计行动/目标/状态/毒/物品/魔法/逃跑业务、异步 handoff、cancel/abort/latest session、done/error 清理；终局奖励/音乐/结算与私有 visual 不得重复。
只写本卡测试、合法 typed fixture、证据和回执；禁止产品/schema/API/旧测/config/baseline/真实数据、私有 state/visual/__rf*、核心 mock、强转、skip、ignore、扩 timeout。反控必须严格三态、完整 file×fullName identity、恰一业务红和清理证明。
交付定向/相邻 test、typecheck、lint 0/0/0、docs、git diff --check 和完整 SHA。覆盖率/例数不是完成条件，不得标 done，等待 Codex 独立验收。
```
