# CODE-QUALITY-3v - game battle actions attack/attack-mate/defend/flee 逐文件治理

Status: done
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
| 原版 / primary source | 玩家普通攻击、混乱攻友、Defend、Flee 的 action 分支、目标/防御/逃跑动画与结算 | `reference/sdlpal/fight.c:3618-3853,4110-4172,4591-4654,4910-5175`、`battle.c:1397-1528`、`battle.h:49-68` |
| 第一阶段 | actions 由 `battle-system.performBattleAction` 调用，写 BattleState/PlayerRoles 并委托 timeline/CommandBus；attack-mate 只在混乱时走随机活队员目标，defend/flee 不越界写敌方 | `actions/attack.ts:1-614`、`attack-mate.ts:1-111`、`defend.ts:1-20`、`flee.ts:1-81`、`battle-system.ts:2769-3065`；action/anim/formula tests 已读取 |
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

## 逐段证据与结论（2026-10-05 Codex）

已读取 4 个实现文件共 826 行、真实 `performBattleAction` caller、primary source 对应段，以及基础 action/animation/formula 测试相关段；未改实现。

| 实现段 | action family / owner | primary source 与真实 caller | 定向 oracle / 结论 |
|---|---|---|---|
| `attack.ts:1-190` | attack 公式、player/enemy str/def/res、SHORT 与 player modifier RNG | `fight.c:3618-3665,4910-4934`；`battle-system.ts:2769-2812` | `actions.test.ts` P0/D3/B2；玩家不加 level、敌方加 level、暴击/jitter/SHORT/最低 1 合同闭合，无直接反例 |
| `attack.ts:191-390` | player single/group attack、DualAttack、hit order/division、damage numbers、timeline owner | `fight.c:3623-3754`；`anim-timeline.ts`/`battle-anim-driver.ts` callers | `actions.test.ts` group/dual/overkill/timeline、attack GLM；群攻 `{2,1,0,4,3}`、dead slot/division、每 sweep 声音/数字均闭合 |
| `attack.ts:391-614` | enemy physical attack、auto-defend、cover、protect、equiv poison、confused enemy attack、legacy fallback | `fight.c:4915-5148,4591-4654`；`battle-system.ts:2800-2825` | `actions.test.ts` B2/cover/equiv/poison、anim integration；闪避/替挡/坏状态 gate、玩家 HP clamp、毒 RNG 短路、混乱友敌动画均有反例 |
| `attack-mate.ts:1-111` | 混乱玩家随机活友军攻击、目标防御/protect、HP clamp、动画/武器声 | `fight.c:3760-3853`；battle-system `attack-mate` dispatch | `attack-mate.test.ts` 全文 7 tests + actions confused-enemy tests；无活友军 Pass、随机跳过 self/dead、公式/动画边界闭合 |
| `defend.ts:1-20` | 只写 `BattlePlayer.defending`；减伤由 enemy attack owner 消费 | `fight.c:4110-4117,4924-4929`；battle-system dispatch | `actions.test.ts` defend + B2 defending；有效/越界 idx 合同闭合，无直接反例 |
| `flee.ts:1-81` | flee rate + enemy resistance、boss gate、RNG 消费、flee fail animation/exp | `fight.c:4119-4172`、`battle.c:1455-1528`；battle-system dispatch | `actions.test.ts` flee 全段；有意采用 game-mechanics 已批准的敌吉运修复而非 SDL dexterity bug；装备加成、空敌/溢出、boss RNG、失败 exp/动画均闭合 |

定向/相邻实测：6 个 test files、154 tests 全绿（actions、attack-mate、attack GLM、battle anim driver/integration、formulas）。测试包含合法输入、边界/无效索引、随机序列、空槽/死亡/坏状态、动画资源缺失、cover/auto-defend、boss/装备/失败反例；不以数量或覆盖率单独验收。

本批只读核验未发现直接缺陷；`performFlee` 使用敌吉运而非 SDL 旧 bug 的身法字段，是 `docs/phase1/game-mechanics.md` 已记录的用户批准修复，不回改。

## 验收条件

- 功能：4 个实现文件全文按 action family/owner/caller/primary source/risk/conclusion 登记；关键未知不标已验证。
- 测试：定向/相邻 action/anim/formula tests、game typecheck；若改代码再跑全仓 `pnpm check`、official ratchet、protected fast、Biome 零诊断。
- 文档：更新 file ledger/治理正文/卡/board/index；每个闭合批次 commit+push+archive。
- 视觉 / 手工验证：N/A；战斗演出视觉集中 E2E。

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Coding Owner / 隔离工作树 / 修改白名单：Codex / `codex/code-quality-governance` / 仅本卡 4 个 action 文件与专属回归（若 direct evidence）。
- 前提核验：`premise verified`（已直接读取 fight.c/battle.c/battle.h、action caller 与相关 tests）
- 范围、设计和验收条件：`design agree`（只读审计无实现变更；发现行为反例才回到 rework/blocked）
- 高风险用户产品裁决：N/A（保持已核真值；证据冲突才暂停）
- build 准入结论：`build allowed`（本批无实现改动；仅允许验证和文档/账本收口）。

### 进入 done 前：独立验收

- 贡献者交付与自验：`accept`（4 个实现文件逐段读证、attack-mate/attack GLM 测试全文核验、154 个定向/相邻 tests）。
- Codex 独立复核：`accept`（全仓 check、official ratchet、protected fast、Biome 零诊断及账本/治理正文均已完成；actions.test.ts 仅相关段读取，不计入本批关闭）。
- 用户体验/产品验收：N/A（纯 action/state 合同）。
- done 准入结论：`accept`。

## 收口证据

- 定向/相邻：6 个 test files、154 tests 全绿；覆盖普通/群攻/DualAttack、敌攻/格挡/替挡、混乱攻友、Defend、Flee、equiv poison、动画时序和命中特效。
- 全仓 `pnpm check`：docs 911 Markdown / 4705 links / 310 tasks；content 149/1490；shared 16/131；game 298/3403；pal-extract 69/421；reforge 325/8682；editor 606/4845；migrate 95/723；Biome 3198 files，0 errors / 0 warnings / 0 infos。
- `pnpm coverage:ratchet`：consolidated 726 files / 19,285 tests；statements 88.89% (68812/77410)，branches 82.67% (49777/60209)，functions 88.59% (13032/14710)，lines 90.80% (61540/67775)；baseline unchanged。
- `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`：同一 consolidated metrics；coverage gate passed，0 improvements，未下降。
- 文档/静态：`node scripts/docs/check.mjs --json` 0 issues，`git diff --check` 通过；未修改实现文件、schema/save、生成物或 UI。
- 结论：4 个 action 实现文件和 2 个专属测试文件逐文件核验，未发现直接缺陷；`actions.test.ts` 相关段只作相邻 oracle，不计入本批关闭。

## 交接日志

- 2026-10-05 Codex：Q3t/Q3u 已收口；建立 battle actions basic 窄卡，先完成 614/111/20/81 行实现、真实 action caller、专属 tests 与 fight.c/battle.c primary source 逐段核验；未获 build 准入前不得修改实现。
- 2026-10-05 Codex：完成 4 个实现文件与 2 个专属测试全文核验，154 个定向/相邻测试通过；无直接缺陷。全仓 check、official ratchet、protected fast、Biome 零诊断通过，关闭 6 条账本记录并归档。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-3v game battle actions attack/attack-mate/defend/flee 逐文件治理
任务卡：docs/ops/tasks/CODE-QUALITY-3v-game-battle-actions-basic.md
当前状态：done；本卡已由 Codex 独立验收并归档。
你的角色：Codex 先完成前提真值与独立证据核验。
先读：AGENTS.md、CLAUDE.md、docs/phase1/engineering-notes.md、docs/phase1/game-mechanics.md、本卡、4 个 action 实现全文、battle-system action caller、actions/attack.glm-next-wave.test.ts、actions.test.ts 相关段、attack-mate.test.ts、battle-anim/formulas tests、fight.c/battle.c/battle.h primary source。
请你做：复核四向真值矩阵、逐段 action family/owner/target/phase/timeline caller/风险与收口门证据。
不要做：不得改变 action union/目标形态/伤害公式/动画视觉，不得修改 battle-system/opcodes 全文件、magic/item/throw/coop actions、生成物/E2E/coverage runner。
输出要求：无下一位 Agent 提示词；若发现新反例，另开不重叠返工卡，不回写已核验行为。
```
