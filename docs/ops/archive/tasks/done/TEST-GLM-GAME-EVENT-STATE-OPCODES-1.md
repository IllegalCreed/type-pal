# TEST-GLM-GAME-EVENT-STATE-OPCODES-1 — event state and opcode business contracts

Status: done
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

---

## GLM r1 交付回执（2026-10-05，分支 codex/glm-game-event-state-opcodes-r1，base f4dbd0e3d）

**结论：臂级排重后 8 条未证状态业务合同全绿（1 个新测试文件），反控 8/8 VALID（复用已验收 r2 判据库），全门通过；event-opcode-player.ts 经全量 coverage 并集确认零残余、零新增。不请求 done，等待 Codex 独立验收。** 逐臂排重账（NEW/REG/unreachable/defensive + 两轮 coverage 数据 + 判例）见
[evidence/TEST-GLM-GAME-EVENT-STATE-OPCODES-1/dedup-ledger.md](../../../evidence/TEST-GLM-GAME-EVENT-STATE-OPCODES-1/dedup-ledger.md)。

### 方法（排重为何落到臂级）

归档卡（contracts §4 / control-flow §2-§6 / opcode-residual）已把 applyRawOpcode **opcode 级** dispatch
全部登记 REG；本卡以两轮 v8 statement 级 coverage 并集（event/opcode 21 文件 574 tests + game 全量
3498 tests）定位**臂级**零命中：event-system.ts 100 条零命中语句、event-opcode-player.ts 仅 :98 防御
守卫（residual 卡已登记）→ 状态写回支零新增；event-system 侧逐段定性出 8 条真缺口，其余登记
REG/unreachable/defensive（含 3612-3613 battle 相对 pan、no-self 走位臂数据下界 0 等数据面证据）。

### 交付物（全部本卡白名单新增，零产品/旧测/配置/baseline/真实 PAL 数据改动）

`packages/game/src/core/event-system.glm-event-state-opcodes.test.ts`（8 it，公开 caller
tickEventSystem / runEnterScript 导出直调；typed Command + createInitialGameState 合法 fixture）：

| it | 合同轴（源锚 / oracle） |
|---|---|
| 0x7A 多步走位**到达** | 4829-4834+2673-2675+4809：snap 到目标 + walking=false + DL26 `&2^2` 相位复位 + 满 5 trail 收口 + 到达同 tick 续跑下条 opcode（dwCash 生效） |
| 0x7A 首步**清 0x15 pose** | 4789-4791：UpdatePartyGestures(TRUE) 覆写，partyScriptedFrame 清空（残留会让静止后复活旧姿势） |
| 0x70 **零距离走位** | 4779-4783：立即到达零副作用（不重算 facing/不污染 trail/不清 pose），DL26 复位照常 |
| loadScene **同场景 guard** | 2821-2825（script.c:1870-1885）：不置 pendingSceneLoad/sceneLoading、不触发 loader、仅推进续跑 |
| runEnterScript goto **命中** | 5089-5090：跳 label 续跑，跳过段 opcode 不执行（旧测只证 0x08/0x01 收尾与 raw 条件跳转） |
| runEnterScript goto **缺失** | 5084-5087：warn + fail-stop，后续 opcode 不执行（不抛不自旋） |
| 0x4C **菱形回弹基准** | 4948-4951（script.c:356-388）：i+j*2≥48 子格双 tile 进位，全阻挡回弹落 (352,336) |
| 0x90 **稀疏写回扩展** | 4488：idx 越界零填充扩展（槽 7/8 为 0，C rgwData 定长零初始化语义）后落值 |

数据面佐证（走位合同现实可达）：onEnter 段直接可见 0x70×6 / 0x7a×5 / 0x7b×10
（onenter-walk-reachability.md，160 入口线性下界扫描）。

### 反控三态（mutation-results.json 8/8 VALID；48 份规整日志 = 8 针 × 3 相位 × 2 流）

判据库/runner/自测**逐字节复用** TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 r2 已验收资产（Codex 二审+
quality closure），仅换卡名/测试文件；selftest 10/10（7 类 r1 误收反例全拒、sanity 不过严、零临时树）。

| 针 | 源行 | 变异 | 唯一失败 = 目标合同首条 AssertionError |
|---|---|---|---|
| MUT-01 | 4833 | 删到达臂 DL26 复位赋值 | `expected +0 to be 2` |
| MUT-02 | 4779 | `dx === 0 && dy === 0` → `dx === 999` | `expected 'right' to be 'down'` |
| MUT-03 | 4789 | `length > 0` → `length < 0` | `expected { '1': 7 } to deeply equal {}` |
| MUT-04 | 2805 | 首分支 `!==` → `===` | `expected true to be undefined`（pendingSceneLoad 被 end 链消费后 sceneLoading 仍 true） |
| MUT-05 | 5089 | `cursor.ip = target` → `target + 1` | `expected +0 to be 64` |
| MUT-06 | 5084 | resolveLabelIp `?? cursor.ip + 1` | `expected 64 to be +0` |
| MUT-07 | 4949 | 删 ≥48 子臂 prevx++/prevy++ | `expected 320 to be 352` |
| MUT-08 | 4488 | 删 while 零填充扩展 | `expected undefined to be +0` |

每针三相位保留 argv/cwd/env/stdout/stderr（trimEof+恰一换行+bytes/sha256 按落盘字节）/exit/signal/
spawnError/JSON 摘要/identitySet+executionSet（红相位 failed 恰 1 且精确命中 targetContract、状态漂移
恰 passed→failed 一处、执行集与原始逐集合相等）；恢复后 event-system.ts sha 与原始 byte-identical
（cleanupRestored=true）。

### 排重登记要点（REG/unreachable，不新增包装测试）

- 走位族起步/步长/隔帧/骑乘重叠全 REG（旧测 2058/2069/2074/2151 + cov85:286-317）；**NPC 走位/骑乘
  trigger 侧到达推进臂（2723-24/2756-57）与 W1 同 caller 同拦截模式同 oracle 形**，同形登记。
- loadScene 主臂、runEnterScript 0x08/0x01/越界臂、0x4C 已证三臂、0x90 主臂+播种、0x75/0x8F/0xA1
  等全 REG（锚点见 ledger §2）。
- unreachable/defensive：applyRawOpcode 相对 pan（3612-13，trigger 全拦截+auto 零可达+战斗数据零实例）、
  no-self 走位/骑乘臂（onEnter 数据下界 0）、0x4C 随机轴/象限换向、0x7F 非豁免清屏臂与
  tickEventSystem 结构化 throw（control-flow 卡 scope 遗留，登记待裁不越界补）等 13 组，见 ledger §3。

### 质量门

- 定向 8/8（directed-vitest.json 重出于 format 后终版）；相邻 23 文件 692/692（event-system 全家 ×15 +
  dialogue-pagination ×2 + event-opcode-player ×4 + event-opcodes.cov85 + mode + game-state ×2 +
  runscript-rearm + scene-system）；game 全量 308 文件 **3506/3506**（3498 + 本卡 8）。
- typecheck 0 error；`pnpm lint` 全仓 0/0/0（证据/测试经 biome format 后反控整体重出，判例沿用）；
  `pnpm check:docs` PASS；`git diff --check` 0。diff 仅新增：1 测试文件 + evidence 目录
  （mutation-logs 已 `git add -f`）+ evidence/README.md 一行 + 本回执。

### 环境备注

隔离 worktree 缺 gitignored data/extracted 与 data/raw 原始 MKF，均以软链指向主仓修复（tracked 的
data/raw/README.md、unifont-cn.bdf 保持原文件）；worktree 环境处置，非仓库改动。

## 下一位 Agent 提示词（Codex 独立验收）

```text
你是 Codex，负责独立验收 TEST-GLM-GAME-EVENT-STATE-OPCODES-1 的 r1 交付（分支
codex/glm-game-event-state-opcodes-r1，回执在本卡上方）。
先读本卡、AGENTS.md、CLAUDE.md 测试质量验收节、
docs/ops/evidence/TEST-GLM-GAME-EVENT-STATE-OPCODES-1/（README/dedup-ledger/coverage-probe/
onenter-walk-reachability/mutation-lib/runner/selftest/points/results/logs/directed-vitest.json），再核：
1) 8 合同的臂级排重是否属实：coverage-probe 两轮并集零命中读数、event-opcode-player.ts 零新增判断、
   NPC 走位/骑乘到达推进臂"同形登记"与 0x4C 随机轴/象限换向"换数字登记"是否符合"同 caller 同 oracle
   不包装"口径；onenter-walk-reachability 线性下界扫描可独立复现；
2) 反控 8 针三态证据（每针红相位恰 1 失败精确命中 targetContract、执行集/状态零漂移、identity/sha
   复原）与判据资产复用（mutation-lib.mjs 与 CONTROL-FLOW 卡逐字节一致、selftest 10/10）；
   MUT-04 首红断言落在 sceneLoading（pendingSceneLoad 被 end 链消费）是否接受为合同内判别；
3) fixture 合法性（loader mock 返回 Promise 符合 SceneLoaderFn 契约、setObstacleChecker 注入为旧测
   同法）与门禁复算（定向/相邻/全量 3506/typecheck/lint 0-0-0/docs/diff --check；worktree 需 data 软链）。
输出 accept（r1 范围收口）或 counter（逐项返工）；不得由本回执直接推 done。
```

**r1 工作提交 SHA**：`57bea1d502df8a9768e446e7a958b15b68f69940`（单一 commit 含 8 合同测试 + 证据目录 + evidence 导航行 + review JSON 三 pin 外科刷新 + 回执；本行为 SHA 登记追加笔，base `f4dbd0e3d`）。

## Codex 独立验收与收口（2026-10-06）

- 独立复跑：定向 8/8；strict event-state mutation runner 8/8 VALID，10 个 selftest 反例全部通过。
- 独立质量门：Game typecheck、docs、git diff --check 通过；集成全仓 lint 3459 files、0/0/0。
- 结论：8 条业务状态 opcode 合同及 existing-proof/unreachable 账满足门禁，合入 main，任务归档为 done。
