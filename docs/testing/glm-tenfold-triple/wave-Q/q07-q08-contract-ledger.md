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
| 4 | 合击 coopMagic（双方出手 / 其余作废） | `core/battle/__tests__/actions.test.ts` coop 群 + `reforge battle/battle-anim.coop.residual.test.ts`（r1 已核） | existing-proof |
| 5 | dualAttack / attackAll 装备授予与结算 | `core/battle/battle-core.test.ts :: P2 连击双打(装备授 dualAttack;仙女剑170)` 三例；`:: P2 长鞭攻全体(attackAll;fight.c:3683-3730)` 两例 | existing-proof |
| 6 | 召唤/变身（summon 槽位 / transform 属性转移） | summon 31 例 / transform 14 例锚（`core/battle/__tests__/battle-system.test.ts` 群） | existing-proof |
| 7 | 开战重建装备效果（PAL_UpdateEquipments 等价） | `core/battle/__tests__/battle-system.test.ts :: 开战重建装备效果… > 复活的装双攻武器队员开战重获双攻状态`；`> 未装双攻武器的队员开战不会凭空获得双攻` | existing-proof |
| 8 | 行动队列 / performAction / selectAction | buildActionQueue 10 例、performAction 11 例、selectAction 13 例锚 | existing-proof |
| 9 | 战后成长（CHECK_HIDDEN_EXP / battleWonLevelUp） | `core/battle/battle-progression.glm-next-wave.test.ts :: applyHiddenExpGrowth —— CHECK_HIDDEN_EXP 宏边角(battle.c:1238-1293) > wLevel=120 先钳 99` 等 6 例 | existing-proof |
| 10 | 逃跑/捕获（flee 判定 / captureEnemy） | flee/capture 锚各 1+（`core/battle/__tests__/` 群；boss 不可逃 `fight.c:4143` 锚） | existing-proof |
| 11 | battle-session 集成相位（readiness/回合推进/结算呈现） | 集成相位链由 `battle-session.glm-next-wave.test.ts`/`round-flows.test.ts` 承接（session() 经 `__rfBattle` 真实 host）；残余臂需真实战斗长流程或整帧呈现 | integration-heavy（headless 无法合法构造的呈现/回调相位；r1 已登记） |
| 12 | 新原版数值/公式轴（伤害/五灵/身法未核分支） | — | stop-line（新机制真值先交 primary 证据，不冻疑似 bug） |

## 结论

- Q07/Q08 的**公开入口合同**在上述锚点下已由既有测试逐条覆盖（existing-proof），
  本轮不重复制造同形用例。
- 剩余未命中臂归属三类：剧情集成（blocked-story / E2E-002 占用）、战斗长流程与整帧呈现
  （headless 合法输入不可达）、未核机制真值（stop-line 待 Codex 补四向真值矩阵）。
- 据此申请 Codex 对 Q07/Q08 按「existing-proof + blocked/integration-heavy + stop-line」
  缩围裁决；不自行缩减 700 总目标——其缺口由 Q10 CLI 后续分段（DATA 表/图像管线）
  与其它组残余继续补足或另行裁决。
