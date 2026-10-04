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

---

## GLM r1 交付回执（2026-10-04，分支 codex/glm-game-event-contracts-r1，base a55862e12）

**结论：22 条未重复语义合同全绿（1 个新测试文件），反控 8/8 VALID，全门通过；不请求 done，
等待 Codex 独立验收。** 逐合同排重账见
[evidence/TEST-GLM-GAME-EVENT-CONTRACTS-1/dedup-ledger.md](../evidence/TEST-GLM-GAME-EVENT-CONTRACTS-1/dedup-ledger.md)
（判例：排重必须 hex 字面量与 OP_* 常量名双 grep——0x62/0x63/0x4C/0x4B 仅以常量名出现在旧测
「B 类移动 opcode」describe，单查 hex 会误判未证而写重复包装）。

### 交付物（全部本卡白名单新增，零产品/旧测/配置/baseline/真实 PAL 数据改动）

`packages/game/src/core/event-system.glm-event-contracts.test.ts`（22 it，公开 caller：导出函数
runPlayerPoisonEntrySync / runScript / tickAutoScripts / tickEventSystem 直调或 battle ctx）：

| 组 | it | 主要合同轴（源锚 / oracle） |
|---|---|---|
| runPlayerPoisonEntrySync(3156-3225) | 8 | 全部旧测只注入 stub runner，真入口合同全新：入口解析 L_<n> 标签 vs 恒等 ip 回退(3163)；raw 真执行 + end 三态四臂返回(3180-3182)；0x04 call 弹帧回 caller(3174-3179)；goto 两臂(3184-3188)；阻塞 op 返回 startIp(3205-3207)；ip 越界返回(3169-3170)；curEventObjectId=roleId 角色目标链（入口内 0x29 单体毒命中该 role,3165）；世界侧 trigger raw 0x29 集成——施毒当下同步跑入口、wPoisonScript=advance 返回值(global.c:1515 真值,3488 注入) |
| applyRawOpcode 长尾(3729-3745,4288-4347,4583-4601) | 6 | 0x5D jumpIfNotPoisonKind 两臂；0x74 jumpIfNotAllFullHp 两臂；0x79 jumpIfPlayerInParty（rgwName 判队）两臂；0x94 jumpIfObjState 两臂；0x20 removeItem 装备槽补足臂（清槽 + 撤 rgEquipmentEffect 效果层）；0x78 FIXME no-op + default 未实现 opcode 诊断 skip（零状态变化续跑 + 精确 debug 消息一次）。现金标记判别（跳=222/不跳=333） |
| runScript 防御(2968-3146) | 5 | goto label 缺失 throw；showDialog explore throw（零副作用）；结构化 op sequence/if/choice throw；startBattle/loadScene/setPalette 诊断 skip（零状态变化续跑 + 2 次精确 debug）；explore setDialogStyle*/giveItem 防御 no-op |
| battle runScript 0x04(2952-2957,4414-4438) | 2 | raw 0x04 call 子脚本同步跑完弹帧回 caller（子 +33→caller +77 现金序）；0x04 op1 覆盖 curEventObjId=op1-1 持久到子脚本 raw（0x5D 按 role=4 判毒判别——0x29/0x61 会被 battle dispatch 拦截不可用作观察点） |
| autoScript 0x04 多帧 callee(1391-1413) | 1 | callee 内 0x09 wait 退化逐帧推进（t1 卡住防御 break→t2 计满→t3 弹帧→t4 caller 标记→t5 park），DL15 只证过 instant callee |

### 反控三态（mutation-results.json 8/8 VALID；48 份规整日志）

| 针 | 源行 | 变异 | 唯一指定业务 AssertionError（节选） |
|---|---|---|---|
| MUT-01 | 3163 | `?? playerScriptIp`→`?? 0` | `expected 111 to be +0`（恒等回退被吞） |
| MUT-02 | 3180 | `return ip + 1`→`return ip` | `expected 1 to be 2`（advance 少一行） |
| MUT-03 | 3207 | `return startIp`→`return 0` | `expected +0 to be 2`（阻塞 op 返回值失真） |
| MUT-04 | 4313 | `<`→`>` | `expected 333 to be 222`（满血门翻转） |
| MUT-05 | 3740 | `= 0`→`= itemId` | `expected 42 to be +0`（装备槽不清） |
| MUT-06 | 4436 | `- 1` 删 | `expected 222 to be 333`（op1 覆盖 off-by-one） |
| MUT-07 | 1410 | `cursor.ip === beforeIp`→`false` | `expected 1 to be 3`（卡住防御失效同帧吞帧） |
| MUT-08 | 3101 | `ip = cursor.ip + 1`→`ip = cursor.ip` | `expected +0 to be 333`（D2 指定断言；D1 同针以 step-limit Error 红，已记入执行集） |

每相位保留 command(argv)/cwd/env 快照/stdout/stderr（trimEof + 恰一换行 + bytes/sha256 按落盘字节）/
exitCode/signal/spawnError/JSON 摘要/逐套件 status/全量 identitySet（22 条 file×fullName×status）；
判据含零执行/red-json-unparsable/red-pending>0/red-runtime-error/red-no-business-assertion/
restored-not-green/restore-sha-mismatch/green-identity-drift。恢复后 event-system.ts sha 与原始一致
（cleanupRestored=true），git diff 产品文件为空。

### 排重登记要点（REG，不新增包装测试）

- 1208-1469：cov85 前提门/end 三态/goto/0x06（含鱼漂移 label 回退回归）/0x10/0x11 + 旧测
  DL15 instant callee/B 类移动（0x4B/0x52/0x62/0x63/0x4C 三臂/0x7C stagger）。0x82=0x10 语义等价
  （仅速度常量差），按「换数字不算新合同」登记。
- 2903-3154：旧测 runScript describe 全覆盖入队/0x69 defer/0x35 缓冲/守卫 throw/step limit/
  0x19 resync/未打 label 回退 + runscript-rearm end 三态 + k06 giveItem battle。
- 3464-4600：见 dedup-ledger.md 逐 opcode REG 锚点表（0x46 trail/0x15/0x7F/0x1E 三臂/0x20 主臂/
  0x61/0x86/0x83/0x84/0x95/0xA2/0x04 trigger/0x75/0x90/0x6D/0x98/0x34/0x38 等全部旧证）。
- battle 侧 0x29 毒入口走 battleCtx.runScript（battle-opcodes.ts:602-627），与本卡世界侧
  runPlayerPoisonEntrySync 链不同，无重复。

### 质量门

- 定向 22/22；相邻 13 文件 485/485（event-system 全家 + cov85 3 文件 + k01/k02/k04/k06 +
  runscript-rearm + battle-dialog + mode）；game 全量 299 文件 3439/3439（worktree 补 data/raw
  MKF 软链后全绿；缺链时 sprite-blob 快照 5 例 ENOENT 属环境缺失非代码失败）。
- typecheck 0 error；`pnpm lint` 全仓 0/0/0（3227 files）；`pnpm check:docs` PASS；
  `git diff --check` 0。diff 仅新增：1 测试文件 + evidence 目录 + 2 个 README 索引。

### 环境备注

隔离 worktree 缺 gitignored data/extracted 与 data/raw 原始 MKF，均以软链指向主仓修复；
不改任何 tracked 文件。此为 worktree 环境处置，非仓库改动。

## 下一位 Agent 提示词（Codex 独立验收）

```text
你是 Codex，负责独立验收 TEST-GLM-GAME-EVENT-CONTRACTS-1 的 r1 交付（分支
codex/glm-game-event-contracts-r1，回执在本卡上方）。
先读本卡、AGENTS.md、CLAUDE.md 测试质量验收节、
docs/ops/evidence/TEST-GLM-GAME-EVENT-CONTRACTS-1/（README/dedup-ledger/mutation-*），再核：
1) packages/game/src/core/event-system.glm-event-contracts.test.ts 22 合同的原子性、合法 typed
   输入、真实公开 caller、oracle 判别力与 fullName 排重（对照 dedup-ledger 的 REG 锚点是否
   属实，尤其 0x62/0x63/0x4C/0x4B 旧测「B 类移动」覆盖与 0x82 语义等价登记）；
2) 反控 8 针三态证据（identitySet/hash/清理）与判据（red-no-business-assertion 为
   「至少一个指定业务 AssertionError」口径，MUT-08 记录了 D2 断言 + D1 step-limit 红的并存）；
3) 门禁复算（定向/相邻/typecheck/lint 0-0-0/docs/diff --check）。
输出 accept（r1 范围收口）或 counter（逐项返工）；不得由本回执直接推 done。
```

**r1 提交 SHA**：`5a8df6d25a94708a8ae605cfc22bb68b98d3e0d5`（工作提交，单一 commit 含 22 合同 +
证据目录 + 回执；本行为 SHA 登记追加笔）。
