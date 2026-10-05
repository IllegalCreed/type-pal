# TEST-GLM-REFORGE-BATTLE-CORE-SESSION-1 排重账（GLM r1）

排重域：卡面六文件（battle-core.ts / battle-session.ts / battle-command-selection.ts /
battle-turn-readiness.ts / battle-action-presentation-scheduler.ts / main.battle-host-flows.test.ts）
的全部旧测 fullName×caller×legal input×oracle，归档卡 TEST-GLM-REFORGE-BATTLE-FLOW-1、
HOST-LIFECYCLE、RUNTIME-SESSION、WORLD-LIFECYCLE 的 existing-proof，以及
docs/phase2/reference/phase1-knowledge-harvest.md B 段（毒系统/战场抗性）现状核对。

## 家族对账结论（卡面六文件）

- **battle-command-selection**：三族旧测 20 例（command-selection.test 8 + residual 6 +
  glm-next-wave 4 + host 级 selection-flows 14）覆盖菜单/杂项/技能/物品/投掷/目标/F-R-A
  快捷/零活敌 no-op；**饱和，不新增**（BATTLE-FLOW 卡同判）。
- **battle-turn-readiness**：8 例覆盖快照冻结/同步提交/token 单发/资源降级/fatal
  停留/invalidate 迟到失效/身份边界；**饱和，不新增**。
- **battle-action-presentation-scheduler**：5 例覆盖首帧同步/脚本标志分立/240ms 节拍
  截断/状态所有权；**饱和，不新增**。
- **main.battle-host-flows.test.ts**：6 例 H9 覆盖真结算+onDefeated/胜利续命令/败线
  onLose/投掷写回/缺敌队拒绝/延迟精灵跨场景 abort；异步 handoff、cancel/abort/latest
  session、done/error 清理三轴已被 H9-6 + battle-session cancel 族（双守卫/幂等/pending
  作废/迟到不推进）+ script-flows（屏障挂起/资源降级/公开 cancel）existing-proof，
  **不重复**。
- **battle-core**：数值与流程主干饱和（115 例 + glm-next-wave + c85-branches +
  enemy-confused + r13-six-b + casualty 族）。逐轴 grep 后残余未证轴见下表 BCS-1..5。
- **battle-session**：八族 95+ 例饱和；唯一未证会话轴 = AI 规则敌逃的 done 回执链
  （BCS-6；terminal-flows 的 enemyFled 走 choreography requestTerminal caller，不同
  caller 不同 oracle，非重复）。
- **终局排除**（卡面禁重复项）：BF-01..BF-10（奖励/音乐/结算/写回终局分配）与
  BF-11/BF-12（毒杀计奖/逃失败续战）由 BATTLE-FLOW 卡收口；私有 `state/visual/__rf*`
  不作 oracle（旧 session 测试存在 `as unknown as { state }` 反射，本卡不沿用）。

## 逐轴 grep 证据（未证轴的排除性核对）

| 候选轴 | grep/核对 | 结论 |
|---|---|---|
| 敌方施法回复（applyEnemySkill healHp 分支） | `healHp`×敌 在 battle/*.test.ts 仅命中 throw 物品测试与玩家侧；r13 敌侧 execution 覆写把 applyStatus 换成 resourceDelta | 零覆盖 → BCS-1 |
| 敌方 HP 阈值门（applyEnemySkill gate hpAtMostPercent 打玩家） | `hpAtMostPercent` 仅 battle-core.test:2912（玩家侧灵葫咒链） | 零覆盖 → BCS-2 |
| 敌方状态术（applyEnemySkill applyStatus → applyPlayerStatus） | `施加` 日志仅命中旧注释；session.test:304 鬼降是玩家施敌方（applyEnemyStatus 路径） | 零覆盖 → BCS-3 |
| 复活无保底（trunc 0 极端档） | 旧复活两例（0x22 全语义/还魂香）均常规档位 ≥1 | 零覆盖 → BCS-4 |
| 敌逃不计战果（reward sweep `if (!s.enemyFled)`） | fleeAll 旧例（core.test:458）只断 enemyFled/phase/log，无数值断言；BF-06 是偷钱非战果；choreo 敌逃路径不经 core sweep | 零覆盖 → BCS-5 |
| AI 规则敌逃的会话回执（observeCorePhase won+enemyFled） | terminal-flows enemyFled = hook fleeBattle → requestTerminal（recordResult 优先，绕过 observeCorePhase） | 零覆盖 → BCS-6 |
| summon/transform 状态门（眠/痹/乱/隐身） | enemy-confused「summon 的 hiding/sleep/paralyzed/confused 门均不产生 mutation」+ core.test:635 sleep→transform failed | existing-proof，不新增 |
| 敌自保 resourceDelta / increaseHpMp 单池 / revivePartyAll 混合存活 | resourceDelta 敌自侧 targets=[] 恒 no-op（防御性）；单池/混合轴与 'both'/全灭轴同 caller 弱变体 | 不建（判别力弱） |
| 隐身 turnStart 钩子跳过 / dualMove 二抽 / 偷钱 moneyDelta / enemySlotDefs | enemy-confused:310 / enemy-confused:233 / core.test:3092 / glm-next-wave:116 | existing-proof |

## 新增合同（6 条；源锚 / caller / 合法输入 / oracle / 排重结论）

| # | fullName（节选） | 源锚 | 公开 caller | 合法输入 | oracle | 排重结论 |
|---|---|---|---|---|---|---|
| BCS-1 | 敌方回复术：applyEnemySkill healHp 按量回复并钳满血上限 | battle-core.ts:2538-2541 | stepBattle（敌 AI cast 规则 → applyEnemySkill） | 敌 rules cast target:'self' 技能 healHp 5/50，玩家先手造成确定性伤害 | 受击后 hp+5 精确；+50 钳 def.stats.health；log「施展 … 回复 N」；玩家 hp/mp 不动 | healHp 分支全仓零敌侧测试 |
| BCS-2 | 敌方 HP 阈值门：门判玩家当前血，过门即死、超线截断 | battle-core.ts:2465-2471 | stepBattle（敌 AI cast） | gate hpAtMostPercent 25 + instantKill；玩家 100/100 与带伤 20/100 两场 | 超线：hp 不变+「无任何效果」+无魂飞魄散；过线：hp 0+魂飞魄散 log | 玩家侧同门已证（灵葫咒链），敌侧零覆盖 |
| BCS-3 | 敌方状态术：applyStatus 对玩家写入 sleep 回合并留痕 | battle-core.ts:2543-2555 | stepBattle（敌 AI cast） | applyStatus sleep 3，玩家健康 | status.sleep===3；log「对 … 施加 sleep 3 回合」；hp 不动 | applyPlayerStatus 语义本体在玩家侧已证；敌 caller 接线零覆盖 |
| BCS-4 | 复活无保底：极端小档复活到 0 依旧倒地 | battle-core.ts:610-620 | reviveBattlePlayer（公开导出；applyPlayerSkill/物品/choreo 三消费方共用） | 死者 maxHp 9 pct 5（→0）与 maxHp 10 pct 50（→5） | 返回 true 且 hp===0（仍倒地）/ hp===5（trunc 正常档） | 旧复活例均 ≥1 档；「无保底」忠实真值从未被断言 |
| BCS-5 | 先杀后逃的战果会计：先死照计、逃跑不计 | battle-core.ts:1177-1187 + 2631-2637 | runBattleToEnd（stepBattle 驱动） | 双敌：victim hp1 exp7 cash4；deserter AI flee 规则；玩家先手 | 终态 won+enemyFled；expGained 恰 7、cashGained 恰 4 | fleeAll 旧例无战果断言；choreo 敌逃不经 core sweep |
| BCS-6 | AI 规则敌逃终局：会话 done 精确兑现 enemyFled，零结算零战果 | battle-session.ts:1108-1130（observeCorePhase 映射） | BattleSession.tick → done（公开 Promise） | 真会话（生产 guard fixture）敌 AI flee 规则，'d' 防御直提驱动 | done==='enemyFled'；rewards {0,0}；buildSettlement 回调 0 次（辅助） | terminal-flows enemyFled 是 choreo requestTerminal caller；AI 规则路径零覆盖 |

## 判别力与隔离说明

- 六合同 oracle 全部是公开业务结果（HP/status/log/战果/done 回执），不读私有
  visual/state（旧 session 测试的 `state` 反射不沿用）。
- 敌参数确定性：敌 dex 上限 (1+6)×3+1=22×1.1 < 玩家 60×0.9，先手恒定；rng=() => 0.99
  排除暴击/格挡/主角彩蛋，伤害链确定性（BCS-1 实测 D=23）。
- BCS-6 敌 exp/cash 置 0：本合同判别轴是 done 映射与零结算；「逃跑不计战果」由 BCS-5
  core 级专证，避免反控针 N5 双红（同判别面不共用）。
