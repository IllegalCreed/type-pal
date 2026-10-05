# TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 — event interpreter control-flow contracts

Status: build
Phase: phase1
Capability: game / event interpreter and opcode control flow
Coding Owner: GLM
Reviewer: Codex（独立验收）
Contributor: GLM
Branch: `codex/glm-game-event-control-flow-r1`
Visual Verification Timing: e2e-deferred

## 目标

审计 Game 事件解释器仍未证明的公开控制流合同，覆盖 trigger/auto 两种公开 caller 的 end、call-script、goto/reset、随机跳、等待/镜头演出、物品放置与确认跳转边界。目标是证明真实脚本状态迁移、失败收口和可继续执行，不把私有 cursor 数值或剧情数量当 oracle。

## 范围

- 范围内：`packages/game/src/core/event-system.ts`、`event-opcode-player.ts` 的公开事件 tick/dispatch caller，以及相邻的 event-system/event-opcode-player 既有测试所使用的真实 fixture。
- 优先审计分支：`runOneAutoOp` 的 end/callStack/goto/reset/random-rate/wait、0x7F camera-pan 的 yield/完成/非法参数、`resolveConfirmGoto` fail-closed、`OP_PLACE_USED_ITEM` 合法实体/障碍/跳转、event-opcode-player 的公开等待/终止/返回链；具体是否新增以 ledger 为准。
- 范围外：战斗回合/结算（`TEST-GLM-GAME-TURN-BOUNDARIES-1`）、已归档 event K01–K06/opcode residual 已证明合同、视觉像素与剧情 E2E、私有 `__tpgs`/cursor 反射。
- 不改产品、旧测、配置、baseline、真实 PAL 数据；禁止强转、skip、ignore、扩 timeout、业务核心 mock、伪造事件入口。

## 验收条件

- 先逐 line/fullName/caller/input/oracle 对照已归档 event contracts、opcode residual、event-system.test、event-opcode-player.test；每个分支明确 `NEW / existing-proof / unreachable / product-counter`。
- 新测试必须通过真实公开 event caller 和合法 typed `Command`/event object 输入，断言 mode/eventCursor 公共结果、实体位置/状态、等待完成、脚本返回或明确失败清理；不得只断言内部 ip 或调用次数。
- 每个反控针只破坏一个业务条件，绿→指定业务红→恢复绿，红相位恰一指定业务 AssertionError，保留 JSON/raw/exit/执行集/三态 hash/清理证明。
- 定向/相邻 Game 测试、typecheck、lint 0/0/0、docs、`git diff --check` 通过；覆盖率和测试数量不作为单卡 accept 条件。真实不可达分支要留证，不为覆盖率删代码或降规则。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 的 Coding Owner（GLM）。先读 AGENTS.md、CLAUDE.md、docs/phase1/engineering-notes.md、docs/phase1/game-mechanics.md、本卡、已归档 event K01-K06/opcode residual 卡，以及 TEST-GLM-GAME-TURN-BOUNDARIES-1（只作范围排除）。
只在 codex/glm-game-event-control-flow-r1 工作。先对 event-system.ts、event-opcode-player.ts 的公开 trigger/auto caller 做 source:line×合法输入×业务oracle×fullName 排重；重点审计 end/callStack/goto/reset/random-rate/wait、0x7F camera-pan、resolveConfirmGoto、OP_PLACE_USED_ITEM 和返回/清理链。
不得重复已有 event/opcode/battle 合同，不得读私有 cursor/__tpgs，不得改产品/旧测/config/baseline/真实数据，不得用强转、skip、ignore、扩 timeout、业务核心 mock 或剧情后门。只有真实新合同才新增测试；否则交 existing-proof/unreachable/product-counter 饱和档案。
新增反控必须绿→指定业务红→恢复绿、恰一业务 AssertionError、完整执行集/hash/清理证明；交付定向/相邻 test、typecheck、lint 0/0/0、docs、git diff --check 和完整 SHA。覆盖率/例数不是完成条件，不得标 done，等待 Codex 独立验收。
```
