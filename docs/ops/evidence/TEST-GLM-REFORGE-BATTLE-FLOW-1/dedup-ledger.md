# TEST-GLM-REFORGE-BATTLE-FLOW-1 排重账（GLM r1）

排重域：`packages/reforge/src/battle/` 全部 45 个旧测文件 495 个 fullName（`vitest list` 全量对账，
重点 battle-core.test 115 例、battle-session 八族 95 例、battle-command-selection 三族 20 例、
battle-settlement 两族 15 例、battle-turn-readiness 8 例、battle-action-presentation-scheduler 5 例、
battle-host 16 例、battle-result 2 例）、settle/finish 间接消费侧（battle-host.test 的 victory 单景、
battle-trial-* 五文件、save-lineage.chain），归档卡 TEST-BATTLE-WORKFLOWS-1（W1-W6）、
TEST-GLM-REFORGE-HOST-LIFECYCLE-1（host lifecycle 六轴）、ARCH-REFORGE-BATTLE-1-host-lifecycle。

## 家族对账结论（卡面九文件）

- `battle-finalization.ts` **不存在** —— 终局家族真源 = `battle-world-result.ts`
  （settleBattleVictory / finishBattleWorldState；公开 caller `main.ts:1172-1174` 与
  `battle-trial-session.ts:58-61`）。**全仓零直接测试**（battle-host.test 仅经固定 victory 场景
  间接消费），是本卡主缺口 → BF-01..BF-07。
- battle-command-selection / battle-turn-readiness / battle-action-presentation-scheduler /
  battle-settlement-presentation / battle-result：既有测试已饱和（见上计数），无新增。
- battle-core / battle-session：数值与流程主干饱和；仅两条会话级组合流未证 → BF-11/BF-12。
- battle-host：16 例覆盖 victory 单景/取消/四种失效/恢复竞态；defeat 与 playerFled 的**终局分配**
  （settle/runDefeated/restoreMusic 三端口取舍）与胜利曲经验门/boss 旗未证 → BF-08..BF-10。

## 新增合同（12 条；源锚 / caller / 合法输入 / oracle / 排重结论）

| # | fullName（节选） | 源锚 | 公开 caller | 合法输入 | oracle | 排重结论 |
|---|---|---|---|---|---|---|
| BF-01 | 胜利结算：经验门开… | battle-world-result.ts:15-27 | main.ts:1172 settleVictory 端口；battle-trial-session.ts:60 buildSettlement | 真工程真会话击杀（exp15/cash7）→ over 相位真 settle | money+7 恰入账；onExpReward 恰 1；首屏 exp-cash 精确值；party.exp +15；HP=writeBack+半恢复（不越界） | host 旧测只断 money/hp 终值，从未断经验回调/屏内容/经验直加；settlement.residual 喂合成 report 不走 settle |
| BF-02 | 零经验胜利… | battle-world-result.ts:18 | 同上 | 默认敌 exp0/cash7 | onExpReward 0 次；money 照 +7；screens=[] | 旧 host victory 场景即 exp=0 但从未断言回调零触发与空屏 |
| BF-03 | 升级链结算… | battle-world-result.ts:28-36 | 同上 | actor leveling.expTable[0,10] + levelUp{2:'bf-earn'} + exp15 | level 2；learnedSkills 含 bf-earn；屏序 exp-cash→level-up(name 经 locale 'Hero')→learn-magic(技能名取 SkillData.name 原文)；hp 回满证明升级 refill 在 writeBackHp 之后 | grantBattleRewards 在 content 有专项；settle 对真工程 locale/levelUp 的 wiring 未证 |
| BF-04 | 胜利后 finish… | battle-world-result.ts:46-52 | main.ts:1174 finishWorld 端口 | settle 后直调 finish（victory） | HP 不被 finish 二次改写；消耗清项（count 0 移除）；≤severe 毒清、incurable 留；money 不重复加 | W6 直测 writeBack* 方法本体；finish 组合（尤其 victory 跳过 writeBackHp、clearPostBattleActorConditions 接线）未证 |
| BF-05 | 战败后 finish… | battle-world-result.ts:47,52 | 同上 | 真会话被击杀 → finish(defeat) | hp===0（lost 允许 0）；零结算（screens null）；毒三件套照清；money 不动 | host 无 defeat 流；W6 的败=0 走 session 方法非 finish |
| BF-06 | 偷得金钱逃跑保留… | battle-world-result.ts:49 | 同上 | 偷窃技(rate10)+偷钱敌(count60) 真施放 → 逃跑 | session.moneyDelta()===30（首个非零公开读数）；finish 前世界不动；finish(playerFled) 后 money=50+30（逃跑保留真值） | c85 偷钱臂只证 core state.moneyDelta；合并与 playerFled 保留语义未证 |
| BF-07 | 收妖值战后并入… | battle-world-result.ts:50-51 | 同上 | collectTreasure 技+collectValue9 敌 真施放 | collectGained()===9；finish 前 5 不动；finish 后 14 | G01 只证 defeat 恒 0；灵葫链 core 侧收累计未证 world 合并 |
| BF-08 | 宿主战败终局… | battle-host.ts:170-179 | main.ts 战斗宿主装配 | 真宿主 start → 敌击杀全队 | 事件序恰 [exitFrame,music:stop,publish,clear,write:defeat,restore]（无 settlement/defeated/尾音乐）；world.hp=0 | battle-host.test 16 例无 defeat 终局 |
| BF-09 | 胜利曲经验门与 boss 旗… | battle-host.ts:103-113 + world-result:18 | 同上 | exp15 敌 + options.boss=true；对照 exp0 | victory(boss) 恰一次收 true、bgm.play('victory-boss',false,300) 恰一次、尾态 stop；对照臂零奏 | 旧 victory 测试固定 exp=0，从未断言胜利曲触发门与 boss 旗传递 |
| BF-10 | 宿主逃跑终局… | battle-host.ts:152-157,170,179 | 同上 | luck100 演员 q 逃跑 | playerFled；无结算/战后脚本；事件序含 write:playerFled+restore+music:stop；money 零变化 | W5/B9 是 session 级 done；宿主终局分配未证 |
| BF-11 | 敌毒回合末致死… | battle-core.ts:1142 + battle-core.ts:1177-1187 | session.done/tick 公开驱动 | 合法投掷毒品（applyPoison '601'）+enemyTicks 数列；巫抗 0 敌 | done=victory（非攻击致死路径）；毒发作行恰 2（即刻 tick0+回合末 tick1）；rewards 计奖 {5,3} | c85 敌毒 tick 是 core 级数值；毒杀→victory→计奖的会话组合流未证 |
| BF-12 | 逃跑失败后会话续战… | battle-core.ts:1961-1968 | 同上 | fleeRate20 + rng0.999999（roll28>20 必败） | log 'p1 逃跑失败'；同会话续战到 victory；rewards 照常 | B9/W5 只证逃跑成功；boss 不可逃是 core headless；失败后续战未证 |

## 登记未证但不新增（同 caller/同 oracle 或弱判别，按「少而精」）

- **battle-command-selection 全部菜单轴**：三族 20 例（含 G02 残差、residual 四态）已覆盖卡面
  「菜单阶段、输入锁、目标选择、合法/非法 Confirm」全轴；重复即弱判别，不新增。
- **battle-turn-readiness / battle-action-presentation-scheduler / battle-settlement-presentation /
  battle-result**：各自专项已饱和（8/5/12/2 例），卡内无新轴。
- **enemySlotDefs 战后槽序**：glm-next-wave 已证单敌读出；divide/summon 增员后的槽序在 core
  R13-5 有状态断言，宿主侧仅透传，弱判别不设针。
- **money floor（Math.max(0,…)）负向越界**：战内可用金恒 ≥0（moneyDamage spend≤battleMoney、
  cost.money 不足即降级），合法输入无法使 moneyDelta 负越 world.money；防御臂不伪造非法输入。
- **BF-10 不单设针**：与 BF-08 共享 runDefeated/restoreMusic 同一终局分配保护（N8/N9 已覆盖），
  单独针只能重复同一变异面。

## U 账（产品发现，登记待 Codex/用户裁决，本卡不改产品）

- **U-1 零活敌 target 相位输入死区**：`battle-command-selection.ts:353`
  `const alive = context.aliveEnemyIndices; if (alive.length === 0) return` 位于 Escape 处理
  **之前**——回合末毒杀/敌自伤等全灭后进入 selectAction，玩家在菜单确认攻击落入敌方目标相位
  即被锁死（confirm/Escape 均 no-op，G02 已把「不崩溃」钉成合同但无退出路径）。本卡 BF-11 以
  防御直提（'d' 菜单键）绕开完成 victory 断言；真实玩家按默认攻击路径会软锁。修复方向（供
  裁决）：零活敌时菜单确认直提防御，或 target 相位允许 Escape 退回。
- **判例**：G02 的「confirm 与 Escape 均 no-op」合同与 U-1 是同一行为的两面；若裁决修复，
  G02 断言需随 before→after 一并更新（用户产品裁决项）。

## 判例（本卡新增）

- **同步 tick 循环不跑 done 的 then 回调**：W5 判例在本卡复现——驱动循环必须逐轮微任务冲刷
  （`for 6 × await Promise.resolve()`），否则 done 已兑现但观察值恒 undefined。
- **granted 技能不能走 initialMagic 注入**：scenarioProject 的 actor 校验先于本卡 skills 文件
  注入执行，initialMagic 引用后注入技能会 fail-loud；合法路径 = 战前写
  `world.learnedSkills[instanceId]`（createBattlePlayers 真派生路径）。
- **expTable 按「等级 i→i+1 = expTable[i]」索引**：升级阈值取 `expTable[c.level]`；
  `[10]` 对 level 1 角色是 undefined（不升级），须 `[0, 10]`。
- **投掷毒 id 作者面是字符串**：`throw.effects[].poisonId` 合法值是稳定字符串 id
  （validateThrowEffect），运行时 core 以 `Number()` 对齐数值毒表。
- **settle 技能名不走 locale**：`skillNameOf = project.skills[id]?.name`（原文）；角色名走
  `lookupText('name.'+template, locale)`——断言须按此真值，不臆造「全部 locale 化」。
- **BATTLE_MUSIC_TRANSITION_MS = 300**（非 3000）；victory 曲 play 断言 fadeMs=300。
- **Map 构造器吃 [k,v] 对**：`new Map([obj, obj])` 不报错但 get 恒 undefined——精灵表必须
  逐项 `.set(definition.id, loaded)`。
