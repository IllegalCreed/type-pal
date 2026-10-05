# CODE-QUALITY-3v - game battle actions attack/attack-mate/defend/flee 逐文件治理

Status: draft
Phase: phase1 game
Capability: ops / code-quality / phase1-mechanics
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: e2e-deferred（战斗演出视觉集中 E2E；本卡只验 action/state 合同）
Contributor: Codex
Branch: codex/code-quality-governance

## 目标

逐文件审计 `packages/game/src/core/battle/actions/attack.ts`（614 行）、`attack-mate.ts`（111 行）、`defend.ts`（20 行）和
`flee.ts`（81 行）的公开 action executor、目标/状态写入、伤害/动画委托、混乱攻友、自动防御与逃跑边界；以
SDLPal `fight.c`/`battle.c`/`battle.h` primary source、真实 `battle-system.performBattleAction` caller、battle action/anim/settlement tests 核真值，只有直接反例才修复。

## 范围

- 范围内：上述 4 个实现文件、直接 `battle-system.ts` action caller、`attack-mate.test.ts`、`actions.test.ts` 相关段、`attack.glm-next-wave.test.ts` 与必要 anim/formula oracle。
- 范围外：`battle-system.ts` 全文件（CODE-QUALITY-3s 已关闭）、`battle-opcodes.ts`（CODE-QUALITY-3t 已关闭）、magic/item/throw/coop actions、公式/magic/status/queue、save/schema/migration、生成物、剧情 E2E、UI 形态和 coverage runner。
- 明确不做：不改变 action union、目标形态、伤害公式、动画视觉或战斗容量；证据要求产品行为变化时停线交用户裁决。

## 前提真值门

### 一句话行为 / 工程前提

每个基础玩家 action executor 只能通过公开 caller 修改其拥有的 BattleState/PlayerRoles/CommandBus，目标选择、伤害/状态副作用、动画时序和 `consumed/phase` 结果必须与 SDLPal action contract 一致；无效目标或缺少资源不得静默改变另一方状态。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | 玩家普通攻击、混乱攻友、Defend、Flee 的 action 分支、目标/防御/逃跑动画与结算 | `reference/sdlpal/fight.c:3680-3853,4000-4185,4500-4660,4940-5160`、`battle.c:1390-1528`、`battle.h:49-68`；待逐段补精确行号 |
| 第一阶段 | actions 由 `battle-system.performBattleAction` 调用，写 BattleState/PlayerRoles 并委托 timeline/CommandBus；attack-mate 只在混乱时走随机活队员目标，defend/flee 不越界写敌方 | `actions/attack.ts:1-614`、`attack-mate.ts:1-111`、`defend.ts:1-20`、`flee.ts:1-81`、`battle-system.ts:2769-3065`；tests 待读取 |
| 当前二阶段 | N/A（仅 packages/game phase1） | `CLAUDE.md` 阶段规则 |
| 本任务目标 | 4 个 action 文件逐段登记 caller/owner/目标/公式/时序/风险/结论；未知项保留 review/blocked | 本卡、file ledger、定向/相邻测试和全仓门禁 |

### 反证与替代解释

- 最强替代解释：部分动画/数字委托是 battle-system/timeline 的 owner，不应在 action 文件重复断言；混乱攻友可能共享普通攻击函数但目标域不同，不应凭重复代码判 bug。
- 什么观察会推翻前提：真实 action caller 在合法 action/目标下修改错误阵营、重复扣血/扣资源、跳过防御/逃跑 gate、动画前后顺序错误或返回结果不能推进 phase；或删除 guard 后真实 oracle 仍全绿。
- 审计红项替代根因：action 语义、battle-system caller、公式/随机模型、timeline/CommandBus 时序、测试 fixture 五类必须分别排查；大 coverage census 不直接授权改玩法。

## 上下文锚点

- 已拍板决策 / 铁律：`AGENTS.md` 前提真值门、第一阶段忠实还原、action/timeline 逻辑与呈现分离、硬零诊断、测试少而精。
- 先读：`CLAUDE.md`、`docs/phase1/engineering-notes.md`、`docs/phase1/game-mechanics.md`、本卡、4 个实现文件全文、battle-system action caller、相关 tests、`fight.c/battle.c/battle.h` 对应段。
- 不得重新引入：action 文件直接调用 UI 形态、数组位置当角色身份、重复实现 battle-opcode/公式、动画副作用早于逻辑完成、旧兼容 fallback。
- 相关测试：`packages/game/src/core/battle/__tests__/actions.test.ts`、`attack-mate.test.ts`、`actions/attack.glm-next-wave.test.ts`、`battle-anim-driver.test.ts`、`battle-anim-integration.test.ts`、`formulas.test.ts`。

## 验收条件

- 功能：4 个实现文件全文按 action family/owner/caller/primary source/risk/conclusion 登记；关键未知不标已验证。
- 测试：定向/相邻 action/anim/formula tests、game typecheck；若改代码再跑全仓 `pnpm check`、official ratchet、protected fast、Biome 零诊断。
- 文档：更新 file ledger/治理正文/卡/board/index；每个闭合批次 commit+push+archive。
- 视觉 / 手工验证：N/A；战斗演出视觉集中 E2E。

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Coding Owner / 隔离工作树 / 修改白名单：Codex / `codex/code-quality-governance` / 仅本卡 4 个 action 文件与专属回归（若 direct evidence）。
- 前提核验：pending（先完成逐文件 primary/caller/oracle 读取）
- 范围、设计和验收条件：pending
- 高风险用户产品裁决：N/A（保持已核真值；证据冲突才暂停）
- build 准入结论：blocked（允许继续只读审计；不得开始实现/不得标记 done）。

## 交接日志

- 2026-10-05 Codex：Q3t/Q3u 已收口；建立 battle actions basic 窄卡，先完成 614/111/20/81 行实现、真实 action caller、专属 tests 与 fight.c/battle.c primary source 逐段核验；未获 build 准入前不得修改实现。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-3v game battle actions attack/attack-mate/defend/flee 逐文件治理
任务卡：docs/ops/tasks/CODE-QUALITY-3v-game-battle-actions-basic.md
当前状态：draft；前提真值门未完成，允许只读取证，**不得开始实现/不得标记 done**。
你的角色：Codex 先完成前提真值与独立证据核验。
先读：AGENTS.md、CLAUDE.md、docs/phase1/engineering-notes.md、docs/phase1/game-mechanics.md、本卡、4 个 action 实现全文、battle-system action caller、actions/attack.glm-next-wave.test.ts、actions.test.ts 相关段、attack-mate.test.ts、battle-anim/formulas tests、fight.c/battle.c/battle.h primary source。
请你做：写完四向真值矩阵、替代解释和可证伪观察；逐段记录 action family/owner/target/phase/timeline caller/风险；若发现 direct bug，先更新前提与 build 准入再改。
不要做：不得改变 action union/目标形态/伤害公式/动画视觉，不得修改 battle-system/opcodes 全文件、magic/item/throw/coop actions、生成物/E2E/coverage runner。
输出要求：Codex `premise verified/counter`、`design agree/counter`、build allowed 或 blocked；若准入，运行定向/相邻与全部质量门；把证据写入卡和 file ledger。
```
