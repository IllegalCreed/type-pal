# TEST-GLM-GAME-DIALOGUE-PAGINATION-1 — dialogue pagination contracts

Status: build
Owner: GLM
Reviewer: Codex（独立验收）
Phase: phase1
Capability: game / dialogue pagination
Branch: `codex/glm-game-dialogue-pagination-r1`
Visual Verification Timing: e2e-deferred

## 目标与范围

补齐 Game 对话分页、等待输入和边界文本的真实合同；不以覆盖率或例数作为本卡指标。
只允许新增 `packages/game/src/core/` 测试、合法 typed fixture 和证据，重点核验
`event-dialogue-pagination.ts`、`event-system.ts` 的公开分页/推进 caller，以及长文本、空页、末页、取消/继续。
先对照 `event-dialogue-pagination.test.ts`、旧 event-system 测试、已归档 Game 卡和 fullName 排重。

## 硬约束与交付

每条合同记录 source:line、公开 caller、合法输入、业务 oracle、唯一 fullName；不得改产品/旧测/配置/baseline/真实数据，不得私有 state、强转、skip、ignore、扩大 timeout 或业务核心 mock。反控须原始绿→指定业务红→恢复绿，保存 raw/JSON/exit/执行集/三态 hash/清理证明。交付定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check；覆盖率只记录到整体 main。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-GAME-DIALOGUE-PAGINATION-1 的 Coding Owner（GLM）。先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡和已归档 Game 卡；只在 codex/glm-game-dialogue-pagination-r1 工作。先对 event-dialogue-pagination.ts、event-system.ts 的旧 fullName/caller/input/oracle 排重，再补未证明的分页、空页、末页、等待输入和恢复合同。只写本卡测试/fixture/证据，禁止产品、旧测、配置、baseline、真实数据、私有 state、强转、skip、ignore、扩大 timeout、业务核心 mock。反控必须三态绿红绿并保存完整证据。交付定向/相邻测试、typecheck、lint 0/0/0、docs、diff 和完整 SHA；不得把覆盖率或例数当完成条件，不得标 done。
```
