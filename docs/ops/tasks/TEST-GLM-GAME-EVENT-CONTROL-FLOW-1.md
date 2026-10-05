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

---

## GLM r1 交付回执（2026-10-05，分支 codex/glm-game-event-control-flow-r1，base 7a9157ac5）

**结论：排重后仅 2 条未证明控制流合同全绿（1 个新测试文件），反控 2/2 VALID，全门通过；
不请求 done，等待 Codex 独立验收。** 逐分支排重账（NEW/REG/unreachable + 数据面证据 + 判例）见
[evidence/TEST-GLM-GAME-EVENT-CONTROL-FLOW-1/dedup-ledger.md](../evidence/TEST-GLM-GAME-EVENT-CONTROL-FLOW-1/dedup-ledger.md)。

### 交付物（全部本卡白名单新增，零产品/旧测/配置/baseline/真实 PAL 数据改动）

`packages/game/src/core/event-system.glm-event-control-flow.test.ts`（2 it，公开 caller `tickEventSystem`
+ 真实对话链 fixture，不读私有 cursor）：

| it | 合同轴（源锚 / oracle） |
|---|---|
| resolveConfirmGoto fail-closed | 3442-3452：0x0A 否/Cancel 提交时 operand[0] 目标不在 labelMap → 清问句 + consumePendingItem/iCurEquipPart/restoreMode 全链终止回 explore，不落是分支；coverage 实证全仓 0 旧证 |
| 0x7F[0,0,0xFFFF] 回正豁免 | 2388-2391（sdlpal script.c:2314 唯一跳过 PAL_MakeScene 的组合；真数据锚 all.json idx 9001 全库唯一实例）：五行翻页空 body 残留 box 存活到 0x7F 开火 → 豁免臂后续对话 append 继承 portrait 90、清空臂（[0,0,0]）新建无立绘；两臂 camera 均回正 (140,88) |

### 反控三态（mutation-results.json 2/2 VALID；12 份规整日志）

| 针 | 源行 | 变异 | 唯一指定业务 AssertionError（首行） |
|---|---|---|---|
| MUT-01 | 3444 | 删 fail-closed 块内 `gs.eventCursor = undefined`（唯一 warn 行锚定） | `AssertionError: expected { commands: [ { …(3) }, …(3) ], …(5) } to be undefined` |
| MUT-02 | 2388 | 豁免常量 `flag === 0xffff` → `0xfffe` | `AssertionError: expected undefined to be 90` |

每相位 command(argv)/cwd/env 快照/stdout/stderr（trimEof + 恰一换行 + bytes/sha256 按落盘字节）/
exitCode/JSON 摘要/identitySet（红相位 failed 恰 1 且在集合内、绿前绿后零漂移）；恢复后 event-system.ts
sha 与原始 byte-identical（cleanupRestored=true）。

### 排重登记要点（REG/unreachable，不新增包装测试）

- runOneAutoOp end/callStack/goto/reset/random-rate/wait 全族 REG（cov85 + 旧测 + event-contracts 卡 §1 账）。
- 0x7F 主路径（回正/绝对/单帧/多帧/负数/0x6E 对/MakeScene 分类/waiting 推进）REG（旧测 5723-5821 + cov85:397）。
- OP_PLACE_USED_ITEM 四臂 REG（旧测 3754-3838）；facing 换数字同形登记。
- 0x0A confirm 主流程 REG（旧测 1599-1708）；goto 缺失终止/ip 越界终止/DL17 idleFrames 臂 REG（旧测 1432 + mode.test.ts 单 op fixture + coverage 实证）。
- event-opcode-player 全族 REG（opcode-residual 卡 2026-10-05 归档 + glm-next-wave + event-contracts §3）。
- **unreachable(数据)**：autoScript 侧 0x7F 全库零可达（2165 auto 入口 + 250 个 0x24 装载目标，按 disasm
  JUMP_TARGET_OPERAND 精确跳转语义 BFS；脚本 `data-reachability.py` 可复现）；其单步移动 vs sdlpal
  do-while 的潜在语义差登记待 Codex 裁决，不钉现行为。
- **观察（非合同）**：event-system.ts:1933 注释称 trigger 侧 end{reset}+idleFrames "现版 0 实例"，
  同法扫描得 3 处 trigger 可达（idx 542/379/33436）；该臂已证，注释计数疑陈旧，留 Codex 处置。

### 质量门

- 定向 2/2；相邻 16 文件 539/539（event-system 全家 8 + dialogue-pagination 2 + event-opcode-player 4 +
  mode + game-state）；game 全量 346 文件 **3486/3486**（worktree 补 data/raw MKF 与 data/extracted 软链后全绿）。
- typecheck 0 error；`pnpm lint` 全仓 0/0/0（3419 files）；`pnpm check:docs` PASS
  （evidence 目录 README/导航登记；semantic-current-batch.json 的 evidence/README.md 条目按 8494b465c
  判例 3 处 sha 外科刷新 + history 头插 content-review-sha-refresh）；
  `git diff --check` 0。diff 仅新增：1 测试文件 + evidence 目录（mutation-logs 已 `git add -f`）+
  evidence/README.md 一行 + review JSON 外科刷新 + 本回执。

### 环境备注

隔离 worktree 缺 gitignored data/extracted 与 data/raw 原始 MKF，均以软链指向主仓修复；tracked 的
data/raw/README.md、unifont-cn.bdf 保持原文件（曾误软链已 `git checkout --` 还原），不改任何 tracked 内容。
此为 worktree 环境处置，非仓库改动。

## 下一位 Agent 提示词（Codex 独立验收）

```text
你是 Codex，负责独立验收 TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 的 r1 交付（分支
codex/glm-game-event-control-flow-r1，回执在本卡上方）。
先读本卡、AGENTS.md、CLAUDE.md 测试质量验收节、
docs/ops/evidence/TEST-GLM-GAME-EVENT-CONTROL-FLOW-1/（README/dedup-ledger/coverage-probe/
data-reachability*/mutation-points/mutation-results/mutation-logs），再核：
1) event-system.glm-event-control-flow.test.ts 2 合同的原子性、合法 typed 输入、真实公开 caller、
   oracle 判别力与 fullName 排重（对照 dedup-ledger 的 REG 锚点与 coverage-probe 命中数是否属实，
   尤其 runOneAutoOp/0x7F 主路径/PLACE_USED_ITEM/confirm 主流程零新增的判断、
   auto 0x7F 零可达的数据面脚本可复现性）；
2) 反控 2 针三态证据（每针红相位恰 1 指定业务 AssertionError、identitySet/清理）与判据口径；
3) 门禁复算（定向/相邻/全量/typecheck/lint 0-0-0/docs/diff --check；worktree 需 data 软链）与
   semantic-current-batch.json 三处 sha 外科刷新 + history 头插是否符合 8494b465c 判例。
输出 accept（r1 范围收口）或 counter（逐项返工）；不得由本回执直接推 done。
```

**r1 工作提交 SHA**：`105b20c29ba060c25b530b9032835630fbf41133`（单一 commit 含 2 合同测试 + 证据目录 +
evidence 导航行 + review JSON 外科刷新 + 回执；本行为 SHA 登记追加笔，base `7a9157ac5`）。

---

## Codex 一审结论（2026-10-05，rework）

2 条业务合同及 typecheck/docs/lint 通过；但 mutation-runner 判据存在误收（不查 exit/signal/spawn、
不要求恰一失败、不核失败落点是否目标合同、不比对红/原始执行集），禁止标 done。只修反控 runner/证据，
不改产品/旧测/config/baseline，不新增弱测试。

## GLM r2 交付回执（2026-10-05，同分支返工）

**结论：反控判据按一审 8 项要求重写并自测，2 针按 r2 判据重跑 2/2 VALID，全门复跑通过；
业务合同、测试文件、产品、旧测、配置、baseline 零改动。不请求 done，等待 Codex 二审。**

### 判据返工（全部在 evidence 目录内）

- **`mutation-lib.mjs`（新）**——判据库化：reporter 解析/执行集（file×fullName×status 全量）/
  套件-断言两级 digest/runtime-collection 推导 + `validateNeedleR2`（r2 门）与
  `validateNeedleR1`（r1 旧判据原样转录，只作误收对照与并排记录，不再是门）。
- **`mutation-runner.mjs`（重写）**——每针 3 相位保留 argv/cwd/env 快照、原始 stdout/stderr 全文
  （trimEof+恰一换行+bytes/sha256 按落盘字节）、exitCode/signal/spawnError/spawnTimedOut、
  per-phase `identitySet` 与 `executionSet`、三态目标源 sha、清理证明；结论只取 r2 判据。
- **`mutation-points.json`**——每针新增 `targetContract`（目标合同精确 fullName，取自 fresh 定向
  reporter，非手写推断）。
- r2 判据（对照一审 8 项）：① 三相位进程层门：绿相位 exit===0、红相位 exit 为数字且 ≠0、
  signal===null、spawnError===null、无 timeout；② 解析完整 file×fullName×status 执行集，
  三相位 identitySet+executionSet 全落盘；③ 红相位恰一 failed（reporter 数与断言级计数双核对）、
  零 pending、零 todo/skipped（断言级状态，不依赖汇总字段口径）、零 runtime/collection error
  （reporter 字段与推导双核对）；④ 唯一失败 fullName 必须精确 === `targetContract` 且
  failureMessages 含 AssertionError；⑤ 红相位 executionSet 与原始相位逐集合相等，状态差异必须
  恰为目标合同 passed→failed 一处；⑥ 恢复相位 identitySet 与原始完全一致 + 产品源恢复 sha 与原始
  相同；⑦ 自测（下）；⑧ 原始日志/快照/三态 hash/清理全保留，selftest 纯内存零临时树（产品源前后
  sha 相等落盘证明）。

### 判据自测（`mutation-selftest.mjs` / `selftest-results.json`，10/10 符合预期）

10 个合成三相位反例（与 runPhase 产出同构）：sanity-valid（合法针形，r2 通过=不过严）、
two-failures、wrong-contract（唯一失败是非目标合同）、exit-zero、signal-kill（SIGKILL）、
spawn-error（ENOENT）、pending-plus-fail、runtime-collection-error、todo-status
（断言 todo 而汇总 pending=0，r1 口径盲区）、execution-set-drift（红相位多出用例）。
**误收证明**：其中 7 类（two-failures/wrong-contract/exit-zero/signal-kill/spawn-error/
todo-status/execution-set-drift）满足 r1 旧判据判 VALID、被 r2 全部拒绝；pending/runtime 两类
r1 本就拒绝（登记为双拒）。selftest 零 spawn、零临时树、产品源前后 sha 相等。

### 2 针重跑（r2 判据，mutation-results.json 2/2 VALID；12 份规整日志重出）

| 针 | r2 判定 | 红相位 | 唯一失败=目标合同 |
|---|---|---|---|
| MUT-01（3444 删 `gs.eventCursor = undefined`） | VALID（0 reasons） | exit1/signal null/spawn null、total2 failed1 pending0 | ✓ resolveConfirmGoto fail-closed 合同，AssertionError |
| MUT-02（2388 `0xffff`→`0xfffe`） | VALID（0 reasons） | 同上 | ✓ 0x7F[0,0,0xFFFF] 豁免合同，`expected undefined to be 90` |

每针 r1 旧判据并排记录为 VALID（干净针两套判据都过；r1 的缺陷在"会放行什么"，由 selftest 证明）。
恢复后 event-system.ts sha 与原始 byte-identical（cleanupRestored=true）。

### 质量门（复跑）

- 定向 2/2（directed-vitest.json 重出）；相邻 16 文件 539/539；game 全量 **307 文件 3486/3486**
  （r1 回执"346 文件"系笔误更正：测试数 3486 与 r1 实测一致，文件数以本次 307 为准）；typecheck 0 error；
  `pnpm lint` 全仓 0/0/0；`pnpm check:docs` PASS；`git diff --check` 0。
- diff 范围：仅 evidence 目录（lib/selftest/points/runner/results/logs/README + directed JSON 重出）、
  review JSON pin 再刷新、本回执；产品/旧测/config/baseline/真实数据零改动。

## 下一位 Agent 提示词（Codex 二审）

```text
你是 Codex，负责二审 TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 的 r2 返工（分支
codex/glm-game-event-control-flow-r1，r2 回执在本卡上方）。
先读本卡 r2 回执与一审结论、docs/ops/evidence/TEST-GLM-GAME-EVENT-CONTROL-FLOW-1/
（README/mutation-lib.mjs/mutation-runner.mjs/mutation-points.json/mutation-results.json/
mutation-selftest.mjs/selftest-results.json/mutation-logs/），再核：
1) 判据 8 项逐条对照一审要求：进程层门、完整执行集解析与三相位落盘、恰一失败+零
   pending/todo/skip/runtime/collection、唯一失败精确命中 targetContract、红/原始执行集
   集合核对与状态漂移拒绝、恢复 identity 全等+sha 一致、selftest 反例覆盖与 r1 误收证明
   （7 类旧判据 VALID）、原始日志/快照/清理保留；
2) 2 针 r2 三态证据复算（可独立重跑 mutation-selftest.mjs 与 mutation-runner.mjs）；
3) 业务合同与测试文件相对 r1 零改动（105b20c29 之后仅 evidence/卡面/review pin 变化）；
4) 门禁复算（定向/相邻/全量/typecheck/lint 0-0-0/docs/diff --check）。
输出 accept（r2 范围收口）或 counter（逐项返工）；不得由本回执直接推 done。
```

**r2 工作提交 SHA**：`c765dde8604d903d061a203ae4553ffdfeb1f6c9`（单一 commit：判据库 + runner 重写 +
selftest + points targetContract + 2 针重跑证据 + evidence README/pin 刷新 + r2 回执；本行为 SHA 登记追加笔）。
