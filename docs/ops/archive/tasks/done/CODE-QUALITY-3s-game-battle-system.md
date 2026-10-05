# CODE-QUALITY-3s - game battle-system 战斗生命周期/phase 路由逐文件治理

Status: done
Phase: phase1 game
Capability: ops / code-quality / phase1-mechanics
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: e2e-deferred（战斗演出视觉集中 E2E；本卡只验生命周期/phase 合同）
Contributor: Codex
Branch: codex/code-quality-governance

## 目标

逐文件审计 `packages/game/src/core/battle/battle-system.ts`（3139 行）的 `startBattle` 资源/状态播种、`tickBattle`
phase 路由、round/action/animation/dialog/settlement/fade/flee/escape 生命周期、战后 cleanup/resume caller；以 SDLPal
`battle.c`/`fight.c`/`script.c` primary source、真实 bootstrap/mode/finalization/actions callers 和分散的 battle tests
核真值，只有直接反例才修复。

## 范围

- 范围内：`battle-system.ts` 全文件、`startBattle`/`tickBattle`/cleanup 直接 callers 与已有 battle-system/cov85/settlement/finalization/runtime-context tests。
- 范围外：`battle-opcodes.ts` 全文件、battle formula/magic/status/queue/positions（Q3m 已关闭）、save/schema/migration、生成物、剧情 E2E、UI 形态和 coverage runner。
- 明确不做：不重写战斗 phase，不改变原版胜/败/逃产品取舍，不把战斗测试数量或覆盖率当作单独证据，不修改 `data/extracted`。

## 前提真值门

### 一句话行为 / 工程前提

战斗必须按 SDLPal 的 start→preBattle→round/action→animation/dialog→won/lost/fled→cleanup 顺序推进；任何 phase guard、资源缺失、战后写回或脚本 resume 错配都不得重复结算、吞输入、丢奖励、永久卡住或污染下一场战斗。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | `PAL_StartBattle`/`PAL_BattleMain`/`PAL_BattleWon`/`PAL_BattleLost`/`PAL_BattleFleed`、battle fade/settlement、script-on-turn-start/ready 调度 | `reference/sdlpal/battle.c:565-682,685-988,991-1372,1390-1528,1531-1838`、`fight.c:740-885,1080-1190,1390-1710,1770-1860`、`script.c:3318-3331`、`global.h` |
| 第一阶段 | TS `startBattle`/`tickBattle` 与 bootstrap handler、mode dispatch、battle actions/opcodes/settlement/finalization/dialog/anim callers | `battle-system.ts:120-346,348-533,540-770,1974-2400,2403-3139`、`shell/bootstrap.ts:1178-1225`、`mode.ts:65-67`、`battle-finalization.ts`、actions/settlement/anim callers；battle-system 主测试 4182 行及 lifecycle tests 已读取 |
| 当前二阶段 | N/A（仅 packages/game phase1） | `CLAUDE.md` 阶段规则 |
| 本任务目标 | 每个 phase/cleanup/资源生命周期段有 caller、primary source、可证伪反例和验证结果；未知项保留 review/blocked | 本卡、file ledger、定向/相邻测试和全仓门禁 |

### 反证与替代解释

- 最强替代解释：某些 hold/fade/dialog/settlement guard 是已批准的时间线或资源缺失降级，不因 phase 数量多或局部 early return 删除。
- 什么观察会推翻前提：真实 battle state + 合法输入在同一 phase 下与 C 的 mode/phase/奖励/cleanup/resume 不一致；或删除 guard 后唯一业务 assertion 仍全绿。
- audit 红项替代根因：battle runtime 语义、原版/第一阶段理解、资源/数据解码、测试模型四类必须分别排查；大失败 census 不直接授权迁移。

### 用户可见偏离

- 是否主动偏离已核真值：no
- `before -> after`：从“battle-system 尚未逐文件治理”到“生命周期/phase/资源/收尾逐段证据化；仅根因修复，不改战斗玩法与演出取舍”。
- 代表场景：合法 startBattle 后按真实 tick/输入完成一场胜利、失败或逃跑，并准确接回 event script/清理状态。
- 用户裁决：N/A（保持已核真值；证据冲突才停线请示）。

## 上下文锚点

- 已拍板决策 / 铁律：`AGENTS.md` 前提真值门、第一阶段忠实还原、battle animation wall-clock/logic 分离、战后状态收尾、硬零诊断、测试少而精。
- 代码锚点：`battle-system.ts:120-346` startBattle、`:348-650` tickBattle/phase 路由、`:1996-2185` fade/flee/escape、`:2167-2718` dialog/round/action、`:3000-3139` cleanup/exports；`mode.ts:65-67`、bootstrap startBattle injection、battle-finalization/settlement/actions callers。
- 已知坑 / 审计文档：`docs/phase1/engineering-notes.md:107-114` 战斗动画拍频与逻辑/render 分离；`docs/phase1/game-mechanics.md:123-179,653-668,804-849,1408-1498` 结算/隐藏经验/逃跑/战后三件套；Q3m battle core card 的公式/queue/status ownership 证据。
- 不得重新引入：battle state 与 GameState 双写无收尾、死亡 fade 只在某 phase 生效、dialog/settlement 越过 animation、战败/逃跑误发胜利奖励、`startBattle` 缺资源静默半初始化、旧版本兼容 fallback。
- 相关测试：`battle-system.cov85.test.ts`、`battle-system.glm-next-wave.test.ts`、`battle-runtime-context.test.ts`、battle actions/settlement/finalization/animation/dialog tests、mode/main-loop/cross-module ownership tests。

## 验收条件

- 功能：battle-system 全 3139 行按 phase/owner/caller/primary source/risk/conclusion 登记；关键未知不标已验证。
- 测试：定向/相邻 battle lifecycle tests、game typecheck；若改代码再跑全仓 `pnpm check`、official ratchet、protected fast、Biome 零诊断。
- 文档：更新 file ledger/治理正文/卡/board/index；每个闭合批次 commit+push+archive。
- 视觉 / 手工验证：N/A（战斗视觉集中 E2E；本卡纯生命周期/phase 合同）。
- E2E 用例登记：N/A；若发现无法靠纯合同推进的实际视觉缺陷，另开 E2E 卡。

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Coding Owner / 隔离工作树 / 修改白名单：Codex / `codex/code-quality-governance` / 仅 `battle-system.ts` 与专属回归（若 direct evidence）。
- 前提核验：verified（已逐段读取 primary source、当前实现、生产 callers、battle lifecycle tests；见下方审计日志）
- 范围、设计和验收条件：agree（audit-first；不主动改变战斗玩法、phase 产品取舍或资源格式）
- 高风险用户产品裁决：N/A（保持已核真值；证据冲突才暂停）
- build 准入结论：build allowed（本批无实现变更白名单需求；若直接反例出现，先补证据再作最小修复）

### 进入 done 前：独立验收

- 贡献者交付与自验：battle-system lifecycle 定向 9 files/242 tests、game typecheck 通过；无实现修改。
- Codex 独立复核：accept（完整 `pnpm check`、official `pnpm coverage:ratchet`、`TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`、Biome 零诊断均通过；726 files / 19,285 tests，逐包及全仓无回退，提升 0）。
- 用户体验/产品验收：N/A（纯机制；战斗视觉延后）。
- done 准入结论：done allowed；本卡只关闭 battle-system 与直接 lifecycle oracle，不代表 battle-opcodes、actions 全域、save 或剩余待核记录已完成。

## 交接日志

- 2026-10-05 Codex：Q3r 已归档；建立 battle-system 高风险卡，先完成 3139 行实现、分散 battle lifecycle tests、primary source 与真实 callers 的逐段核验；未获 build 准入前不得修改实现。
- 2026-10-05 Codex：完成 battle-system 3139 行源码与 4182 行主测试全文核验；对照 `battle.c`/`fight.c`/`script.c`、bootstrap/mode/actions/settlement/finalization callers。定向 9 files/242 tests 全绿，未发现直接缺陷。
- 2026-10-05 Codex：完整 check、official ratchet、protected fast、Biome 零诊断全通过；ratchet 基线未变化，protected fast 逐包/全仓 0 回退。归档本卡，继续下一个未核文件。
- 2026-10-05 Codex：完成 battle-system 3139 行源码、battle-system 主测试 4182 行、cov85/GLM/runtime-context/finalization/settlement/dialog/death-fade/anim integration tests 的职责入口读取；对照 `battle.c`/`fight.c`/`script.c`、bootstrap/mode/actions callers。定向 9 files/242 tests 与 game typecheck 通过，未发现 primary-source + caller 可证实的 direct defect，准入 audit-only build。

## 逐段审计证据（2026-10-05）

| 实现段 | 当前行 | 真实 caller / oracle | primary source | 结论 |
|---|---:|---|---|---|
| startBattle 资源/敌槽/玩家/波场播种 | `120-346` | `bootstrap.ts:1178-1225`、mode startBattle handler、cov85/main battle tests、runtime-context | `battle.c:1531-1838`、`global.h` | 0xFFFF 跳过、0 空槽保留、OBJECT overlay 优先、倒地复活/傀儡清除、装备重建、wave snapshot/field、资源 context 安装均有直接合同；资源缺失由 tick 顶层 fail-closed |
| tickBattle 顶层 guards 与 phase 路由 | `348-533` | `mode.ts:65-67`、main-loop、cov85 phase/guard tests | `battle.c:685-988`、`fight.c:1080-1150` | intro fade、palette/death fade、dialog/settlement/flee/escape hold、stall 兜底、preBattle→select→perform→post→won/lost/fleed 顺序与 C 调度直接核对 |
| selectAction/UI/action queue | `540-770,1001-1960` | battle-system 主测试、cov85、menu/actions/turn-queue callers | `fight.c:1390-1609`、`uibattle.c` menu/target sections | 失能占位、Force/Repeat/Flee、coop 消耗、target picker、enemy/player dex multiplier、dualMove、RNG 次序和 live target 重选合同有 caller/oracle |
| casualty/idle/fade/flee/escape | `806-970,1974-2221` | casualty-sounds/death-fade/anim integration/GLM lifecycle tests | `fight.c:740-885`、`battle.c:1390-1528`、`battle.c:608-682` | 守护者健康门、毒杀 death sound 门、72-step death fade、16-step flee、enemy escape + 500ms hold、turn-start 终态 break 均有直接反例 |
| battle dialog hold | `2240-2400` | `battle-dialog.test.ts`、runScript battle queue、battle-system turn-start callers | `text.c:1660-1772`、`fight.c:1184-1191,1719-1724` | queue→dialogBox、typing cadence、page/end key、narration auto-dismiss、effect ordering、Confirm 消费和 phase stall reset 合同完整 |
| performAction/animation/actions | `2403-2987` | actions/anim-driver/magic/throw/item/attack callers、anim integration/death-fade/main tests | `fight.c` action/animation/delay sections、`script.c:2655-2990` | timeline hold、damage-number timing、item afterComplete、casualty scripts、player action validation、dead target reselect、hidden exp RNG gate、coop/flee/pass/throw dispatch均逐段读过 |
| postAction/poison/status/settlement boundary | `2989-3135` | battle-settlement/finalization/game-state/poison/status callers、settlement tests | `fight.c:1611-1710`、`battle.c:991-1372,1822-1830` | combat-decided 时跳过末回合毒、毒脚本推进回写、status/hiding decrement、death rewards、won/lost 转态与 settlement/cleanup 边界符合 C；结算 owner 仍在 settlement/finalization 文件外部，不越界重写 |

### 反证排查记录

- 运行时语义/命令分类：`tickBattle` 只负责宿主 phase/hold，battle-opcode/action/settlement/finalization 各自保留 owner；event-system 仅通过注入 `runScript`/resources 连接。
- 原版/第一阶段理解：敌槽空位、dualMove、dex/RNG 顺序、失能/傀儡、turn-start/ready、毒/status/cleanup、胜败逃分支均回到 C 行号，不由 phase 数量推断。
- 资源/数据解码：本卡只消费已注入 canonical resources；未发现 extractor/map/data decoder 反例，不改生成物或迁移层。
- 审计/测试模型：主测试与 lifecycle tests 使用公开 `startBattle`/`tickBattle`/`tickBattleDialog`、typed BattleState 和真实 action/settlement/finalization callers；定向 242 仅作必要证据，不把全绿或 coverage 单独当成 correctness。

### build / review 结论

- `premise verified`：Codex；primary source、真实 callers、主测试和分散 lifecycle tests 已直接读取。
- `design agree`：Codex；audit-only，保持行为/接口/schema/save/生成物/UI 边界。
- `accept` 前置条件：定向 battle lifecycle tests、game typecheck、全仓 `pnpm check`、official ratchet、protected fast、Biome 零诊断全部通过；否则保留 review，不归档。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-3s game battle-system 战斗生命周期/phase 路由逐文件治理
任务卡：docs/ops/tasks/CODE-QUALITY-3s-game-battle-system.md
当前状态：draft；前提真值门未完成，允许只读取证，**不得开始实现/不得标记 done**。
你的角色：Codex 先完成前提真值与独立证据核验。
先读：AGENTS.md、CLAUDE.md、docs/phase1/engineering-notes.md、docs/phase1/game-mechanics.md、本卡、battle-system.ts 全文、battle-system.cov85.test.ts、battle-system.glm-next-wave.test.ts、battle-runtime-context.test.ts、battle.c/fight.c/script.c、bootstrap/mode/finalization/settlement/actions callers。
请你做：写完四向真值矩阵、替代解释和可证伪观察；逐段记录 phase/owner/caller/风险；若发现 direct bug，先更新前提与 build 准入再改。
不要做：不得凭 phase 数量改玩法，不得改 battle-opcodes 全文件、save/schema/迁移/生成物/E2E/coverage runner，不得把 Reforge 结构带回第一阶段。
输出要求：历史交接已收口；无下一位 Agent 提示词，继续治理必须新开不重叠卡并重新过前提真值门。
```
