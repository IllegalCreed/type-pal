# TEST-GLM-GAME-TURN-BOUNDARIES-1 — battle turn and finalization contracts

Status: build
Owner: GLM
Reviewer: Codex（独立验收）
Phase: phase1
Capability: game / battle turn boundaries
Branch: `codex/glm-game-turn-boundaries-r1`
Visual Verification Timing: e2e-deferred

## 目标

补齐战斗回合队列与结算边界的真实业务合同，重点核验等待、拒绝、终局和恢复语义；不以覆盖率或新增例数作为本卡指标。

## 独占范围

只允许新增 `packages/game/src/core/battle/` 本卡测试、合法 typed fixture 和本卡证据：

- `turn-queue.ts`：空队列、同速排序、死亡/逃跑成员移除、阻塞动作完成后继续取队列；
- `battle-finalization.ts`：胜负/逃跑/全员阵亡结算、奖励与脚本恢复只发生一次；
- `battle-system.ts` / `battle-state.ts` 的公开回合 caller：输入锁、阶段拒绝、目标选择结束后的唯一提交。

先逐项对照 `turn-queue.test.ts`、`battle-finalization.test.ts`、`battle-system.test.ts`、已归档 Game 合同卡和全量 fullName 排重；已有同 caller/同状态 oracle 的测试只登记，不包装重复。

## 硬约束与交付

- 每条合同写 source:line、公开 caller、合法 typed 输入、业务 oracle、唯一 fullName。
- 不改产品、旧测、配置、baseline、真实 PAL 数据；禁止私有函数/world state、业务核心 mock、强转、skip、ignore、扩大 timeout。
- 反控必须原始绿→指定业务红→恢复绿，保留唯一业务 AssertionError、执行集、raw/JSON、exit、三态 hash、清理证明。
- 交付 fresh identity/排重账、定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check；覆盖率只记录到整体 main。

## 当前模式推进记录

- Codex 范围/前提核验: verified
- Coding Owner / 隔离分支: GLM / `codex/glm-game-turn-boundaries-r1`
- build 准入: Codex build allowed
- Codex 独立验收: pending
- done 准入: blocked

## 下一位 Agent 提示词

```text
你是 TEST-GLM-GAME-TURN-BOUNDARIES-1 的 Coding Owner（GLM）。
先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡，及已归档 GLM Game 卡。
在 codex/glm-game-turn-boundaries-r1 隔离工作树中，先对 turn-queue.ts、battle-finalization.ts、battle-system.ts、battle-state.ts 的旧 fullName、caller、输入和 oracle 排重，再实现尚未证明的回合/结算合同。
不得改产品、旧测、配置、baseline、真实 PAL 数据或其它任务；不得用私有 state、业务核心 mock、强转、skip、ignore、扩大 timeout。
每条测试必须有 source/caller/input/oracle/fullName 账；反控必须原始绿→指定业务红→恢复绿并保存完整证据。
交付定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check 和完整 SHA。
覆盖率和测试数量只做整体记录，不是本卡完成条件；不得标 done，等待 Codex 独立验收。
```

---

## GLM r1 交付回执（2026-10-04，分支 codex/glm-game-turn-boundaries-r1，base a2857c123）

**结论：15 条未证明回合/结算边界合同全绿（1 个新测试文件），反控 15/15 VALID（每针红相位
仅目标合同失败），全门通过；不请求 done，等待 Codex 独立验收。** 逐合同排重账见
[evidence/TEST-GLM-GAME-TURN-BOUNDARIES-1/dedup-ledger.md](../evidence/TEST-GLM-GAME-TURN-BOUNDARIES-1/dedup-ledger.md)。

### 交付物（全部本卡白名单新增，零产品/旧测/配置/baseline/真实 PAL 数据改动）

`packages/game/src/core/battle/battle-turn-boundaries.glm-turn.test.ts`（15 it，公开 caller：
tickBattle / startBattle 真流 + 既有测试认可的 pendingActions 直填注入）：

| 组 | it | 主要合同轴（源锚 / oracle） |
|---|---|---|
| finalizeBattle 归类（battle-finalization.ts:14-34） | 2 | lost → resume lostIp + HP/MP 回写 runtime（战败不伪复活）；forced 看门狗（非终态 phase）→ 归类 won 接回 wonIp |
| 行动倍率/濒死（battle-system.ts:598-624,755-758） | 3 | flee ×0.5 floor 奇数 dex（L10）；item ×3；濒死 ÷2 —— 三臂均以 actionQueue 全序为 oracle，jitter 钉 1.0 |
| 队列消费边界 | 2 | 死亡敌人行动项跳过（诈尸变异可判别）；flee 成功即中止剩余队列（逃跑音 45 恰一次，多人队） |
| 逃跑/敌逃动画 | 2 | fleeAnim 逐步位移只挪活队员；enemyEscapeAnim 死敌槽不位移 |
| 回合末毒结算（battle-system.ts:3010-3128） | 3 | 玩家毒 tick（0x1B 负 delta 扣血）+ wPoisonScript 返回值回写推进毒链；毒改 HP → roundEndDelayTicks=8（DM12 置 8 臂）；已分胜负回合跳过毒结算 |
| 执行期吞并/粘滞（DL3/DL1） | 2 | fThisTurnCoop 后续玩家动作吞为 pass（rgAttackExp 0）；prevPlayerAutoAtk 粘性把手动防御强改普攻（rgDefenseExp 0/rgAttackExp 1） |
| turnStart 边界 | 1 | 隐身期（iHidingTime>0）敌整轮跳过含 turnStart 脚本（嘲讽对话不入队） |

### 反控三态（mutation-results.json 15/15 VALID；63 份规整日志 = 共享原始绿 3 + 每针红/恢复 4）

每针源码单点变异（find 恰命中 1 次）→ 全文件跑：红相位 exit≠0 + 目标合同业务 AssertionError
+ **failed-total 恰 1（只杀目标）**；恢复 sha 与原始一致（cleanupRestored 全 true），恢复绿
15/15。变异点/首条业务断言/identitySha 逐针落
[evidence/TEST-GLM-GAME-TURN-BOUNDARIES-1/](../evidence/TEST-GLM-GAME-TURN-BOUNDARIES-1/)（mutation-logs
受 .gitignore `*.log` 约束，已 `git add -f`）。

**判例（空转绿陷阱）**：flee 队列中止合同初版夹具中，50 级先手敌的等级伤害项一击打死
拟作首个掷骰者的 p0（hp 200），那声 45 实出自幸存 p1 —— 原始/变异双绿恒真。以副作用计数为
oracle 时必须先确认计数来源是预期主体；修法见 dedup-ledger 判例节。

### 排重登记要点（REG，不新增包装测试）

- turn-queue.ts 9 例旧测全覆盖（空队/同 dex/dualMove 二抽两臂/回退）—— 零新增。
- battle-state.ts createBattleState 全臂（>3 抛错/roleId/快照/D14 seed/DH1 空槽/fAutoBattle）—— 零新增。
- actionDexMultiplier 的 support-magic ×3 / coop ×10 与已测臂同 caller 同 oracle 形态，登记不包装。
- 输入锁：对话键不漏（battle-system.test.ts:3022）/延迟期不起菜单（cov85:215）/菜单延后（:884）
  已证；battle-finalization.ts:20 队列清行无可观察 oracle（state 随即销毁），不写空转测试。
- 胜负奖励只发生一次：settlement 不重入（cov85:254）/scriptOnBattleEnd 一次（settlement glm-next-wave:201）已证。

### 质量门

- 定向 15/15；相邻 battle 全目录 35 文件 906/906；game 全量 300 文件 **3454/3454**
  （worktree 补 data/raw MKF 软链后 sprite-blob 快照 5 例转绿，属环境缺失非代码失败）。
- typecheck 0 error；`pnpm lint` 全仓 0/0/0（3272 files）；`pnpm check:docs` PASS；
  `git diff --check` 0。diff 仅新增：1 测试文件 + evidence 目录 + 1 行 evidence README 索引。

### 环境备注

隔离 worktree 缺 gitignored data/extracted、data/raw 原始 MKF 与 node_modules，均以软链/安装
修复；不改任何 tracked 文件。此为 worktree 环境处置，非仓库改动。

## 下一位 Agent 提示词（Codex 独立验收）

```text
你是 Codex，负责独立验收 TEST-GLM-GAME-TURN-BOUNDARIES-1 的 r1 交付（分支
codex/glm-game-turn-boundaries-r1，回执在本卡上方）。
先读本卡、AGENTS.md、CLAUDE.md 测试质量验收节、
docs/ops/evidence/TEST-GLM-GAME-TURN-BOUNDARIES-1/（README/dedup-ledger/mutation-results/
mutation-logs），再核：
1) battle-turn-boundaries.glm-turn.test.ts 15 合同的原子性、合法 typed 输入、真实公开 caller、
   oracle 判别力与 fullName 排重（对照 dedup-ledger 的 REG 锚点是否属实，尤其 turn-queue/
   battle-state 零新增的判断与 support-magic ×3 / coop ×10 的同形登记）；
2) 反控 15 针三态证据（每针 failed-total 恰 1 的精确命中、identitySet/hash/清理）与
   MUT-15 空转绿返工判例（pendingSounds 计数主体核对）；
3) 门禁复算（定向/相邻/game 全量/typecheck/lint 0-0-0/docs/diff --check；worktree 需
   data/raw MKF 软链才能全绿）。
输出 accept（r1 范围收口）或 counter（逐项返工）；不得由本回执直接推 done。
```
