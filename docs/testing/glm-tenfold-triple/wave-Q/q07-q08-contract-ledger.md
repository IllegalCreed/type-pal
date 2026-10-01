# Q07/Q08 残余合同逐项账（existing-proof / 不可达 / 停线）

回应 Codex COMMON-01：「函数名命中很多旧测试不是逐合同 existing-proof」。本账对 Q07/Q08
两个域的公开入口合同逐条给出旧断言锚（`file :: fullName`，从派发基点语料
`vitest list --json` 精确摘出）或不可合法构造/停线理由。r1 的 dupcheck 检索证据保留为
辅助（`README.md` 700 缺口节），以本账为准。

## Q07 · game 事件/opcode 生命周期（event-system.ts 540 / event-opcode-player.ts 119 未命中臂）

| # | 公开合同（入口 → 可观察结果） | 旧断言锚（file :: fullName 摘引） | 判定 |
|---|---|---|---|
| 1 | 0x29 apply-player：毒表注入 + 抗性 gate + 去重 | `core/event-system.test.ts :: A3 opcode… > 0x29 apply-player applyAll:抗性=0 → 全队中毒,存真 wPlayerScript`；`> 0x29 apply-player:去重 — 已有同毒不加第二槽` | existing-proof |
| 2 | 0x75 setParty：队伍重建 + 装备效果联动 | `core/event-system.test.ts :: 0x75 setParty:operand[0..2]=roleId+1 → partyMembers,清 poison`；`:: OP_SET_PARTY(0x75)队伍变动 → 触发装备效果重建` | existing-proof |
| 3 | 0x99 changeMap 双形态（换图 / 同图换层） | `core/event-system.test.ts :: 0x99 changeMap:op0!=0xFFFF → sceneMapNumOverride[op0]=op1`；`core/event-system.glm-event-k04.test.ts :: 0x99[0xFFFF,99] → sceneMapNumOverride[wNumScene]=99 + mapReloader(99) 一次` | existing-proof |
| 4 | 宝箱族（0x23 卸装 / 开箱 / 物品入包） | `core/event-system.test.ts :: 0x23 removeEquipment:卸装备撤销属性加成`；chest 族 20 例（`I-w1.a chest opcodes` 群） | existing-proof |
| 5 | 0x60/0x61 中毒判定类 opcode（含未中毒秒杀臂） | `core/event-system.test.ts :: curePlayerPoisonByLevel:maxLevel=1 只清 level≤1,留 level3`；0x60×4 / 0x61×2 锚 | existing-proof |
| 6 | addItemToInventory id0 守卫 + qty=0→1 真值 | `core/event-system.test.ts :: itemId=0(空槽 giveItem)→ 库存不变,不造幽灵「?0」`；`:: 正常 itemId 照常入库(count=0 → 1)` | existing-proof |
| 7 | setObjectScript / 对象脚本指针族 | setObjectScript 17 例（`A3 opcode:0x75 setParty / 0x90 setObjectScript` 群） | existing-proof |
| 8 | cross-module 边界（scene mapNum 写 → 对话历史读） | `core/cross-module-boundaries.test.ts :: G07-01 scene 写 mapNum → event-system 对话历史按当前图号入账`；`G07-02 addItemToInventory 真实入账 + id0 拒收 + 两独立 GameState 互不串扰` | existing-proof |
| 9 | 剧情演出 opcode 群（dialog/walkNPC/演出编排分支） | 残余臂的调用域 = 场景 onEnter/trigger 长剧本（PAL001/002 路线）；walkNPC 等演出语义与 E2E-002 卡占用同一批场景脚本 | blocked-story（禁启动 PAL001/002、E2E-002 只读） |
| 10 | 事件新真值轴（未在 game-mechanics.md 核过的 opcode 语义） | — | stop-line（任务卡：新机制真值先交 primary 证据） |

## Q08 · game 战斗已证状态/回调/呈现/释放（battle-opcodes 239 / battle-system 238 / battle-core ~200 / battle-session 等未命中臂）

| # | 公开合同（入口 → 可观察结果） | 旧断言锚（file :: fullName 摘引） | 判定 |
|---|---|---|---|
| 1 | 0x2D/0x2E/0x2F 状态 opcode 全轴（命中/抵抗/首次持续） | `core/battle/__tests__/battle-opcodes.test.ts :: 0x2E set enemy status:RandomLong(0,9)>resist → 设状态`；`> 0x2E:抵抗(RandomLong<=resist)→ jump op2`；`> 0x2D set player status:坏状态 sleep 首次设 dur` | existing-proof |
| 2 | 0x1B/0x1C/0x1D 治疗 HP/MP（clamp/死人/over-treatment） | `core/battle/__tests__/battle-opcodes.test.ts :: 0x1B 单体回血`；`> 0x1B clamp 到 maxHP`；`> 0x1B 仅活人:死人(hp=0)不被治疗+ g_fScriptSuccess=FALSE` | existing-proof |
| 3 | performMagic 全轴（夺魂 0x2E 阈值 / 五灵 / 消耗） | `core/battle/__tests__/actions.test.ts :: performMagic > 夺魂成功:巫抗 0、掷 0 也命中(0x2E 用 >= 跟进原版后期修复)`；magic.ts 64 缺臂中公开入口群已有 actions 矩阵 | existing-proof |
| 4 | 合击 coopMagic（双方出手 / 其余作废） | `core/battle/__tests__/actions.test.ts` coop 群（game 域锚）。r2 误引的 reforge `battle-anim.coop.residual.test.ts` 属 reforge 域呈现层，不作为 game 证明 | existing-proof（范围限 game 结算层；reforge 呈现层归 reforge 域另行对待） |
| 5 | dualAttack / attackAll 装备授予与结算 | `core/battle/battle-core.test.ts :: P2 连击双打(装备授 dualAttack;仙女剑170)` 三例；`:: P2 长鞭攻全体(attackAll;fight.c:3683-3730)` 两例 | existing-proof |
| 6 | 召唤/变身（summon 槽位 / transform 属性转移） | `core/battle/__tests__/battle-opcodes.test.ts :: 0x9E enemy summon (script.c:009E) > w!=0 召唤指定敌人(obj→enemyId→enemies)+ 满血 + 脚本/抗性`；`> 有 bus 时召唤建敌施法/高亮动画`；`:: 0x9F enemy transform (script.c:009F) > 变身成 op0 对象(保留当前 health + 保留原形态脚本)+ M6 变身音 47`；`> 变身后按新 enemy.yPosOffset 刷新自身底锚`；`core/battle/__tests__/battle-system.test.ts :: throw-item action 派发(E2) > 0x9E summon:敌人 scriptOnReady 只复用 wMaxEnemyIndex 内死亡空槽,不扩容单敌队伍` | existing-proof（**范围注记（二审）：该末例构造单敌无空槽并断言不扩容，不扩为「正向死亡空槽复用」全轴证明**；正向复用轴列继续展开项） |
| 7 | 开战重建装备效果（PAL_UpdateEquipments 等价） | `core/battle/__tests__/battle-system.test.ts :: 开战重建装备效果… > 复活的装双攻武器队员开战重获双攻状态`；`> 未装双攻武器的队员开战不会凭空获得双攻` | existing-proof |
| 8 | 行动队列 buildActionQueue（performAction/selectAction 不在本行范围） | `core/battle/__tests__/turn-queue.test.ts :: buildActionQueue (PAL_CLASSIC) > 按 dexterity 降序`；`> dualMove enemy 进队列两次(第二次 fIsSecond=true)`；`> 同 dex 排序稳定(敌人先于队员,fight.c 先填敌人且只在严格小于时交换)`；`> 空队伍`；`> 空敌方` | existing-proof（**范围注记（二审）：仅证 buildActionQueue**；performAction/selectAction 两入口拆出为独立行，见第 8b 行） |
| 8b | performAction / selectAction（行动执行与玩家指令选择） | selectAutoTargetFrom 六臂已证（`turn-queue.test.ts`/`battle-system.test.ts` 六例，r3 已核）；**r5 新证**：`battle-action-error-arms.glm-q.test.ts` 七例（performMagic caster 索引越界/role 缺失两臂、performItem+performThrowItem 无 inventory 三臂、selectAutoTargetFrom begin<0 与 prevTarget 越界两臂），39→44 反控含其中五轴。performMagic 主链（MP 扣减/起手音/脚本）与 pickAutoMagic 学习法术系仍见下「展开中」 | **部分已证 + 展开** |
| 9 | 战后成长（CHECK_HIDDEN_EXP / battleWonLevelUp） | `core/battle/battle-progression.glm-next-wave.test.ts :: applyHiddenExpGrowth —— CHECK_HIDDEN_EXP 宏边角(battle.c:1238-1293) > wLevel=120 先钳 99` 等 6 例 | existing-proof |
| 10 | 逃跑推进（enemyEscapeAnim 相位）/ 玩家逃跑判定（performFlee）/ 捕获（capture） | 逃跑推进：`core/battle/__tests__/battle-system.test.ts :: applyHiddenExpGrowth… > D13:enemyEscapeAnim → 全活敌往左挪到出屏 → phase=fleed;health 不变(fled 无 exp)`；`> L11:敌逃出屏后进入 ~13 帧停顿阶段再 fleed(battle.c:1433 UTIL_Delay(500))`；`:: tickBattle finalize > flee 成功 → fleed → finalize 切 explore(无 hp 改动)`。玩家逃跑判定：`core/battle/__tests__/actions.test.ts :: performFlee > fleeRate 远大于 rng 上限(roll 必小)→ 触发逃跑动画(fleeAnim)`；`> fleeRate=0 + 多个高吉运敌人(roll 必大)→ phase 不变`；`> 修复版:逃跑抵抗 def 用敌吉运 fleeRate,身法 dexterity 不参与`；`> isBoss=true → 无论 fleeRate 多高都不可逃`；`> 无 enemy 时 def=0 → roll∈[0,0]=0,fleeRate>=0 → 命中` | existing-proof（**范围注记（二审）：上锚证逃跑推进与玩家逃跑判定**；敌逃停顿终态/HP 不变由 battle-system 行覆盖；captureEnemy 全族 r2 未落锚 → 拆出第 10b 行） |
| 10b | 捕获（captureEnemy 全族） | **r5 源条件核实（展开前置要求）**：`grep -ri capture packages/game/src`（排除测试）零公开符号命中——本引擎战斗公开面**不存在捕获机制入口**，r2 建行时未核源条件 | **N/A（误设行关闭）**——非停线轴；若 Codex 另有捕获机制出处（如 sdlpal reference 对应表），请给 primary 锚点再行开组 |
| 11 | reforge battle-session 集成相位（**reforge 域**，非 game 证明） | `reforge src/battle/battle-session.glm-next-wave.test.ts` / `round-flows.test.ts` 使用 typed session-driver + 公开按键/tick（三审确认并非必须 `__rfBattle`/剧情长路线） | reforge 域既有锚；game 域无此文件。后续按 typed session-driver 同思路对 game 战斗集成相位逐合同展开（不作为不可达依据） |
| 12 | 新原版数值/公式轴（伤害/五灵/身法未核分支） | — | stop-line（新机制真值先交 primary 证据，不冻疑似 bug） |

## r5 补充（Codex 直接派发批）

`packages/game/src/battle-action-error-arms.glm-q.test.ts`（7 例，typed driver 零强转）：
performMagic caster 索引越界与 role 缺失两臂（warn+不扣 MP+不 emit+不跑脚本——资源所有权
负面合同）、performItem/performThrowItem 无 inventory 三臂（count 缺失与 count=0 保留
entry 两形态——不跑脚本、inventory 原样）、selectAutoTargetFrom begin<0 规范化与
prevTarget 越界回扫两臂。反控五轴（Q08-8b-RC1～RC5）三态全 VALID。

**blocked-input 登记（逐项举证）**：`pickAutoMagic` 的学习法术系臂（MP 不足门/costMP=1
哨兵/resolve 失败跳过/ rng 选择）——`getLearnedSpells`（battle-system.ts:1033-1037）经
内部 unknown 反射读 `role.magic`/`role.learnedSpells`，而共享 `PlayerRole` 接口
（shared/src/tables.ts:482）未声明该字段：typed 公开输入无法合法设置学习法术表
（旧测同位置用了双强转，本卡禁用）。需产品侧补 typed 字段或公开 seed 路径后方可开测，
不夹产品修改。

## r4 补充（2026-10-01 三审后）

按三审裁决同步：①第 6/8/10 行的 existing-proof 范围逐条收窄并加范围注记（单例空槽/
仅 buildActionQueue/仅逃跑推进），被拆出的正向空槽复用、performAction/selectAction、
captureEnemy 全族列为「展开中（下一批首项）」；②第 4/11 行 reforge 证据不再作为 game
证明；③删除「headless 无法合法构造/集成成本高＝不可达」的泛化结论——game battle
集成相位改列「待 typed game driver 逐合同展开」，与 r3 展开方向一致；④整体缩围申请
撤回，仅保留 blocked-story（禁启动 PAL001/002、E2E-002 占用）与 stop-line（新机制
真值待 primary 证据）两类停线，及逐项举证的局部展开申请。

## r3 补充（2026-10-01 二审后）

按二审意见收敛措辞：上表第 6/8/10 行已替换为逐条件完整 old fullName 锚；第 1–5/7/9 行
维持 r2 锚（二审已抽验 `event-system.test.ts:4476-4484/4531-4542/4586-4609/4671-4677`、
`battle-opcodes.test.ts:722-744/1093-1111`、`battle-progression.glm-next-wave.test.ts:26-40`
确认成立）。Q08 引用 reforge 证据的两行（r2 第 4/11 行）已更正口径：合击归 reforge
`battle-anim.coop.residual.test.ts`（其自身域），game 域合击锚以
`core/battle/__tests__/actions.test.ts` coop 群为准；battle-session 集成相位不再引为
game 不可达依据，改列「integration-heavy（待 typed session-driver 逐合同展开）」并
在后续批次继续展开，不作为缩围依据。

## 结论（r4 修订）

- 已证部分：第 1–10 行各**具体锚点**（二审/三审已抽验成立）作为对应具体轴的
  existing-proof，不重复制造同形用例；范围以各行「范围注记」为准，不扩族。
- 展开中：8b（performAction/selectAction 逐条件）、10b（captureEnemy 全族）、
  11（game 战斗集成相位，typed game driver）、以及 dialog/walkNPC 演出族——
  按逐未命中条件/caller/合法输入/完整 old fullName/断言行/精确 oracle 逐条补账。
- 停线：剧情集成（禁启动 PAL001/002、E2E-002 占用）与未核机制真值（stop-line）。
- 不再申请整体缩围；缺口由后续批次逐合同展开继续补足，700/50 目标保留。
