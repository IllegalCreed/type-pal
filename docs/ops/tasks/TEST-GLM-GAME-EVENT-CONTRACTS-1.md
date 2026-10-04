# TEST-GLM-GAME-EVENT-CONTRACTS-1 — event script semantic contracts

Status: build
Owner: GLM
Reviewer: Codex（独立验收）
Phase: phase1
Capability: game / event-script semantics
Branch: `codex/glm-game-event-contracts-r1`
Visual Verification Timing: e2e-deferred

## 目标

为 Game 的事件脚本执行器补齐一组真实、互不重复的语义合同，重点覆盖现有公开脚本入口中尚未被旧测或已归档 GLM Game 卡证明的分支。覆盖率只作为最终 main 并集的记录，不是本卡指标。

## 独占范围

只允许新增 `packages/game/src/core/` 下本卡专属测试、必要 typed fixture 和本卡证据；优先核对：

- `event-system.ts:2903-3154`：`runScript` 的分支跳转、调用脚本返回、失败恢复与阻塞/继续语义；
- `event-system.ts:3156-3225`：`runPlayerPoisonEntrySync` 的角色/敌人目标与脚本失败返回；
- `event-system.ts:3464-4600`：`applyRawOpcode` 的状态/物品/地图/队伍类 opcode 合法输入与业务状态结果；
- `event-system.ts:1208-1469`：auto-script 的单步、深度保护和目标离场分支，仅收真实 `tickAutoScripts` caller。

先从旧测试、已归档 `TEST-COVERAGE85-GLM-GAME-1`、Game 全量 `file×fullName` 做排重；若某分支已由旧测证明，只登记锚点，不新增包装测试。

## 硬约束

- 每条合同必须写 `source:line`、公开 caller、合法 typed 输入、可观察业务 oracle、唯一 fullName；不以执行数量代替合同。
- 不调用私有函数，不伪造 world state，不改产品/旧测/共享配置/baseline/真实 PAL 数据。
- 反控只选能由精确业务 AssertionError 判别的真实注入点；提供原始绿、指定业务红、恢复绿、执行身份、三态 hash、清理证明。
- 不得使用 `as unknown as`、`as never`、`@ts-expect-error`、skip、ignore、扩大 timeout 或业务核心 mock。

## 验证与交付

交付 fresh `file×fullName×status`、合同排重账、源 hash、反控三态 raw/JSON/exit/执行集、existing-proof/unreachable 说明，以及定向/相邻/typecheck/lint/docs/diff 结果。全绿和覆盖率数字不能单独代表通过；精简后以质量合同闭合为准。

## 当前模式推进记录

- Codex 范围/前提核验: verified（基于当前 main 与已归档 Game 卡排重）
- Coding Owner / 隔离分支: GLM / `codex/glm-game-event-contracts-r1`
- build 准入: Codex build allowed（仅上述事件脚本合同）
- Codex 独立验收: pending
- done 准入: blocked，须先完成独立验收

## 下一位 Agent 提示词

```text
你是 TEST-GLM-GAME-EVENT-CONTRACTS-1 的 Coding Owner（GLM）。
先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡，以及已归档
docs/ops/archive/tasks/done/TEST-COVERAGE85-GLM-GAME-1.md。
只在分支 codex/glm-game-event-contracts-r1 的隔离工作树中工作。
先对 packages/game/src/core/event-system.ts:1208-1469、2903-3154、3156-3225、3464-4600
逐合同核对旧 fullName、公开 caller、合法 typed 输入和业务 oracle，再实现未重复合同。
不得修改产品、旧测、共享配置、baseline、真实 PAL 数据或其它任务目录；不得使用强转、skip、ignore、扩大 timeout、私有 state 或业务核心 mock。
每条测试必须留下 source:line/caller/input/oracle/fullName 排重账；反控必须是原始绿→指定业务红→恢复绿，保存 raw/JSON/exit/执行集/三态 hash/清理证明。
交付时运行定向与相邻测试、typecheck、lint 0/0/0、docs、git diff --check，并提交完整 SHA。
输出 accept 或 counter；不得把覆盖率百分比或测试数量当作完成条件，不得标 done，等待 Codex 独立验收。
```
