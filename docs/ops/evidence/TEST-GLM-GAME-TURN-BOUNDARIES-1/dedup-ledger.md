# TEST-GLM-GAME-TURN-BOUNDARIES-1 排重账（GLM r1）

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: evidence-receipt-v1 / 1.0.0

本页把测试合同排重账接入 `evidence-receipt-v1`，并追加 `archive-record-v1` 历史边界。原始合同、NEW/REG 分类、source:line、caller、合法输入、oracle、排重结论、计数和判例在 quote 中保全；本页不授当前 runtime、E2E、视觉或 coverage 信用。

## 证据身份

- `id`：TEST-GLM-GAME-TURN-BOUNDARIES-1 排重账（原始身份与 r1/r2 标记保留于 quote）。
- `schemaVersion`：原文未声明机器 schema；本页不补造执行 schema。
- `status`：historical receipt；不把排重账的 NEW/REG 或“全绿”文字改写为当前 verified。
- candidate/source SHA：source `aea05aa37c1fed9e041a1ee264bccf71641498e664e70014e9f71875549b932b`；after 见本批 review record。

## 来源与输入

- caller/source refs（file:line）：turn-queue.ts、battle-finalization.ts、battle-system.ts、battle-state.ts 及旧测/cov85/glm-next-wave/fullName census（以 quote 为准）；其余一手锚点和旧测路径由 quote 逐条保留。
- 合法输入与版本：以原 ledger 记载的 typed 输入、公开 caller、源码版本、旧测/cov85/fullName census 为准；本次迁移不重跑测试。
- 执行时间和环境：原始任务卡、identity、mutation 和 raw 证据目录；本次只做静态内容迁移。

## 断言与业务 oracle

- 业务 oracle：每条合同必须保持 source:line × caller × 合法输入 × 可观察业务结果 × fullName 的对应关系。
- 原子断言：原文 NEW 合同、REG 已证锚点、未证项、unreachable/defensive 边界和判例保持原样。
- 排重对象：对应 task card、旧测/cov85、同任务 evidence、fullName identity 与后续 fresh receipt。

## 结果

- 逐步结果、退出码、产物：本页只记录原始排重账内容；不把历史“全绿”、计数或 mutation 摘要升格为当前通过。
- 失败：原始未证、rework、blocked、空转反例和合法输入缺口继续保留于 quote。

## 限制与复核

- 未执行/未覆盖：本次不执行 runtime、E2E、视觉或 coverage，也不重新认证原始测试合同。
- 不得外推的结论：排重账不能单独证明产品行为、完整 caller 可达性、全包覆盖或当前任务 done。
- 复核条件：当前 task card 状态、真实合法输入、business oracle、反控三态 raw/JSON、执行集和独立验收重新齐全。

## 历史范围

- 原始日期、版本、阶段：源文档固定于 `7ea529ab5a3f2be583ae02909066824913eee66a`；其具体 r1/r2 时间、状态和候选分支保留于 quote；本轮为 R55。
- 归档原因：排重账是任务时点证据，保留原合同边界，避免把历史合同清单变成当前验收授权。

## 原始结论

- 原始 battle turn/finalization 排重账：15 个未证合同、登记未测项、真实 caller/oracle、空转绿反例与死亡队列双词 grep 判例。

## 当时证据

- 原始测试文件、旧测/cov85、source:line、caller、oracle、fullName、反控与判例保留于 quote。

## 当前有效性

historical。do not promote historical test ledger, NEW/REG labels, counts or mutation summaries to current runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：当前 task card、fresh evidence 和独立验收仍是事实权；TEST-GLM-GAME-TURN-BOUNDARIES-1 当前 rework 状态不因本页迁移改变。

## 继任文档

- 当前 canonical 文档：对应 task card、当前 evidence README、identity/mutation consumer 与重新生成的 receipt。
- supersedes / superseded-by：替代 governed-legacy 的未分层呈现；原始 ledger 不删除。
- 若重新启用的复核条件：合法输入重跑、排重账与实际执行集一致、业务反控可证伪、SHA/清理证据和 Codex 独立验收齐全。

## 原文保全

固定源 revision `7ea529ab5a3f2be583ae02909066824913eee66a`，source SHA `aea05aa37c1fed9e041a1ee264bccf71641498e664e70014e9f71875549b932b`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-GAME-TURN-BOUNDARIES-1 排重账(GLM r1)
>
> 排重域:`packages/game/src/core/battle/` 下 `turn-queue.ts`、`battle-finalization.ts`、
> `battle-system.ts`、`battle-state.ts` 的旧测(`__tests__/turn-queue.test.ts`、
> `__tests__/battle-system.test.ts`、`__tests__/battle-state.test.ts`、`battle-finalization.test.ts`)、
> cov85(`battle-system.cov85.test.ts`)、glm-next-wave(`battle-system/battle-state/
> battle-settlement/battle-progression.glm-next-wave.test.ts`)、battle 全目录其余旧测
> (actions/battle-dialog/death-fade/coop-magic/casualty-sounds/runscript-rearm/status/
> battle-anim-integration 等)与全量 fullName grep。
>
> ## 新增合同(15,全部未证轴;源锚 / caller / oracle)
>
> | # | fullName(节选) | 源锚 | 公开 caller | oracle | 排重结论 |
> |---|---|---|---|---|---|
> | C1 | finalizeBattle lost 归类 | battle-finalization.ts:14-34 | tickBattle lost case | resume ip=lostIp + rgwMP 回写 | 旧测仅 fled→fledIp(battle-finalization.test.ts:65-79)、terminated→wonIp(battle-system.test.ts:182)与 won→wonIp(:3723);lost 臂与 finalizeBattle:23 回写(won 路径走 settlement owner)未证 |
> | C2 | finalizeBattle forced 归类 won | battle-finalization.ts:26-27 | tickBattle stall 兜底 | resume ip=wonIp | cov85(battle-system.cov85.test.ts:198)只证 explore+console.error,无 postBattleResume → forced→'won' 归类未证 |
> | C3 | flee ×0.5 floor(L10) | battle-system.ts:620,755 | tickSelectAction 建 queue(tickBattle) | actionQueue 全序 [attack21, 敌18, flee10] | 倍率臂旧测只证 defend ×5(battle-system.test.ts:1849);flee/奇数 floor 无证 |
> | C4 | item ×3 | battle-system.ts:617-618 | 同上 | [item24, attack20, 敌18] | 同上,item 臂无证;support-magic ×3 / coop ×10 同函数未测臂见「登记未测」 |
> | C5 | 濒死 ÷2 | battle-system.ts:757-758 | 同上 | [attack20, 敌18, dying15] | battle-anim-integration.test.ts:258 仅借濒死态证动画,非出手序;÷2 无证 |
> | C6 | 行动项死亡敌人跳过 | battle-system.ts:2505-2507 | tickPerformAction(tickBattle) | 死敌不行动(我方 0 伤)+回合照常收 | 旧测只证死亡**队员**跳过(battle-system.test.ts:978)与全敌死早退(:1732);单敌死留队列的消费臂无证 |
> | C7 | flee 成功即中止剩余队列 | battle-system.ts:430,2099-2124 | tickBattleFleeAnim hold(tickBattle) | 逃跑音 45 恰一次 | 旧逃跑测均单人队(:1549/:1717);多人队列中止无证 |
> | C8 | fleeAnim 只挪活队员 | battle-system.ts:2105-2114 | tickBattleFleeAnim | 死者 pos 原位、活者 +5/+4 | :1549 只观察活者右移;hp<=0 守卫无证 |
> | C9 | enemyEscapeAnim 死敌槽不位移 | battle-system.ts:2152-2157 | tickBattleEnemyEscapeAnim | 死敌 x 原位、活敌 -20 | D13/L11 旧测(:145/:160)均单活敌;defeated 跳过臂无证 |
> | C10 | 玩家毒 tick + 回写 | battle-system.ts:3029-3049 | tickPostAction(tickBattle) | hp 100→90、wPoisonScript 1→3 | 敌侧毒 tick已证(battle-system.test.ts:3549/3576);玩家侧 rgPoisonStatus 槽循环旧测中 wPoisonScript 恒 0(:1786),从未驱动 |
> | C11 | DM12 毒改 HP → 8 tick 停顿 | battle-system.ts:3122-3128 | tickPostAction | roundEndDelayTicks===8 | cov85(battle-system.cov85.test.ts:215)只证 >0 递减臂,置 8 臂无证 |
> | C12 | 已分胜负跳过回合末毒 | battle-system.ts:3010-3032 | tickPostAction | won 转换时毒未扣血、入口未消费 | 回合末毒正常臂已证(:3549);combat-decided 门控无证 |
> | C13 | DL3 fThisTurnCoop 吞并 | battle-system.ts:2585-2587 | tickPerformAction | pass 化:敌 0 伤 + rgAttackExp 0 | coop-magic.test.ts 只证合击本身;吞并臂无证(设置点 :2983 的消费侧) |
> | C14 | DL1 prevPlayerAutoAtk 粘性 | battle-system.ts:2588-2595 | tickPerformAction | 防御被改普攻:敌掉血 + rgDefenseExp 0/rgAttackExp 1 | 旧围攻测只证 fAutoAttack 开关(杂项盒 :2510/:2446);执行期粘性改写无证 |
> | C15 | 隐身期 turnStart 跳过 | battle-system.ts:2175-2183 | runEnemyTurnStartScripts(tickBattle) | 对话队列空 + 轮次标记照常 | 隐身旧测(battle-system.test.ts:3685)只证敌方**行动**跳过;turnStart 脚本门无证 |
>
> ## 登记未证但不新增(同 caller/同 oracle 或换数字,按「少而精」登记)
>
> - **turn-queue.ts 全部**:空队伍/空敌方/降序/同 dex 敌先队员/dualMove 二抽两臂
>   (dex2<=dex / dex2>dex)/无 dex2 回退 dex-1 —— `__tests__/turn-queue.test.ts` 9 例全覆盖,
>   本卡零新增。dualMove 入队次数经 `battle-system.test.ts:1007/1020`(dualMove>=2 / =0)证。
> - **battle-state.ts createBattleState 全部**:>3 抛错/未知 roleId 抛错/prevHp/prevMp 快照/
>   D14 seed 状态/fAutoBattle seed/DH1 空槽(fallback/objectId/e 全零)—— `__tests__/battle-state.test.ts`
>   + `battle-state.glm-next-wave.test.ts` 全覆盖,本卡零新增。
> - **finalizeBattleCleanup 资源释放序**:battle-finalization.test.ts:28-79 已证(状态 ≤999 清/
>   >999 留、fAutoBattle 清、波快照恢复、resume 在释放后)。
> - **battle-finalization.ts:20 `state.battleDialogQueue = undefined`**:cleanup 随后销毁
>   gs.battleState,该行无可观察外部 oracle(防御性),不写空转测试。
> - **actionDexMultiplier 其余臂**:support-magic ×3(spells.find !usableToEnemy 分支)与
>   coop ×10 与 C3/C4 同 caller 同 oracle 形态(仅常数差),按「换数字不算新合同」登记。
> - **输入锁**:对话键不漏进菜单(battle-system.test.ts:3022)、roundEndDelay 期不起菜单
>   (cov85 :215)、菜单延后到 turnStart 后(:884/:224/:243)已证;performAction 期按键零副作用
>   是 phase 路由的结构性结果(唯一可变异点 `case 'selectAction'` 分派位置无单点可证),
>   不为它造结构性弱断言。
> - **胜负奖励只发生一次**:settlement 不重入(cov85 :254)、scriptOnBattleEnd 仅一次
>   (battle-settlement.glm-next-wave.test.ts:201)已证。
> - **iBlow 每动作 reset(battle-system.ts:2500)**:anim-timeline.test.ts:1098-1152 已证 iBlow
>   渲染消费;reset 点的独立合同与 anim 测试同 caller 同状态,不重复包装。
>
> ## 判例
>
> - **空转绿陷阱(C7 初版)**:敌 50 级先手攻击含等级伤害项,一击打死了拟作为首个掷骰者的
>   p0(hp 200)——那声 45 其实出自幸存的 p1,「恰一次」在原始与变异下都恒真。修法:两队员
>   hp 拉满扛住先手,使 p0 真正成为首个成功掷骰者,变异放行队列后 p1 的第二声才可判别。
>   教训:以副作用计数(pendingSounds)为 oracle 时,必须先确认计数来源是预期主体。
> - **grep 排重双词**:「死亡队列项跳过」旧测只覆盖队员侧(`死亡队员动作会被跳过`);
>   敌侧同型语义在 2505-2507 是独立分支,不能按"跳过已测"合并。
>
<!-- original-source-quote:end -->
