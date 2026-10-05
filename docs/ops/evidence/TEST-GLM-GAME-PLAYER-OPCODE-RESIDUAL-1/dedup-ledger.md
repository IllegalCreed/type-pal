# TEST-GLM-GAME-PLAYER-OPCODE-RESIDUAL-1 — 逐 opcode 排重账

对照集：`event-opcode-player.test.ts`（旧测）、`event-opcode-player.cov85.test.ts`、
`event-opcode-player.glm-next-wave.test.ts`、`event-system.test.ts`、
`event-system.cov85.test.ts`、`event-system.glm-event-contracts.test.ts`、
`equip-effect.test.ts`、`equipment-state.glm-next-wave.test.ts`、
`menu/magic-script.test.ts`、`__tests__/stats/e2~e5`、`menu/menu-driver.test.ts`、
`menu/equip-menu.test.ts`、battle 侧（`battle-opcodes.*` 为 BattleState 快照接线，不同模块）。
判例：hex 字面量与 OP_* 常量名双 grep；同 caller + 同 oracle 只登记（REG），不写包装测试；
"换数字/换敌人/换包装不算新合同"。

## 本卡新增合同（NEW，6 条 / 1 文件）

| ID | opcode | source:line | 公开 caller | 合同轴 | 针 |
|---|---|---|---|---|---|
| C1 | 0x18 | event-opcode-player.ts:96 | applyPlayerOpcode | 换装入口先撤旧部位效果层（script.c:768-775）；0x17 合法种入 → 换装后清 0、有效攻击回落 base | MUT-01 |
| C2 | 0x23 | :227 | applyPlayerOpcode | 单槽卸下：有物槽撤效果层；空槽残留不动（`itemId!==0` 守卫两侧，script.c:1122-1131） | MUT-02 |
| C3 | 0x23 | :221 | applyPlayerOpcode | 全卸循环无条件清每个部位效果层，含无物槽残留（script.c:1112-1121；与单槽臂不对称） | MUT-03 |
| C4 | 0x1c | :161,346 | applyPlayerOpcode | applyAll 全队 MP：活人改动+钳制、死人跳过、fScriptSuccess 不写（script.c:896-919，与 0x1b applyAll=anyChanged 相异） | MUT-04/MUT-07 |
| C5 | 0x1d | :173 | applyPlayerOpcode | applyAll 全队 HP+MP 双轨：死人两轨跳、活人双加、fScriptSuccess 不写（script.c:923-947） | MUT-05 |
| C6 | 0x29 | :244 | applyPlayerOpcode | 抗性等值边界 `roll <= resist` inclusive：50 掷对 50 抗被挡、51 掷命中 | MUT-06 |

## 逐 opcode 排重账（REG = 旧证登记，不新增）

- **0x8d OP_INCREASE_PLAYER_LEVEL**：无 role 上下文/0xffff 警告跳过、未知 role、等级 99 封顶、
  stat 999 封顶、Exp 重置（cov85 r1）；单级随机采样计数+精确值（旧测）；多级固定字段+随机区间+
  Exp 行缺失（cov85 r3）。sdlpal global.c:2347-2400 对齐。→ 无残余。
- **0x17 OP_SET_PLAYER_EXTRA_ATTR**：无 role/0xffff 守卫、partIdx 直写、i16 负值、partIdx>0 第二槽
  （cov85 r1/r3）；writeEquipmentEffectField 行族/越界（equipment-state.glm-next-wave + equip-effect）。→ 无残余。
- **0x18 OP_EQUIP_ITEM**：装备行/背包四臂（原位顶替/全量交换/首装/同物重装）、wLastUnequippedItem、
  iCurEquipPart、无 role/0xffff/非法槽守卫（旧测 + cov85 r1/r3 + glm-next-wave + equip-effect
  runEquipScript 三测 + menu-driver:340 管线集成）——**均未断言效果层** → C1 为残余。
- **0x19 OP_INCREASE_PLAYER_ATTR**：op2 显式 role/上下文/无上下文守卫（cov85 r1/r3）；
  负向 delta 由 E3-01（helper）+ 0x17 共享 signExtendI16（caller 级）合成证明 → 不另包装。
- **0x1a OP_SET_PLAYER_STAT**：同上四臂（cov85 r1/r3）；iCurEquipPart 路由 E3-02 → 不另包装。
- **0x1b OP_INCREASE_HP**：applyAll fScriptSuccess=anyChanged、单体失败（cov85 r1）；单体管线（magic-script）。→ 无残余。
- **0x1c OP_INCREASE_MP**：单体钳制/失败语义（cov85 r1 + magic-script 两测）——**applyAll 臂零覆盖** → C4。
- **0x1d OP_INCREASE_HP_MP**：单体双向钳/死人不治（cov85 r1/r3 + 旧测 + magic-script）——**applyAll 臂零覆盖** → C5。
- **0x21/0x28/0x2a/0x2e 战斗保留族**：no-op 消费（旧测 0x2a + glm-next-wave 0x21/0x28/0x2e）。→ 无残余。
- **0x22 OP_REVIVE_PLAYER**：applyAll 全语义/单体活人/空目标/0xffff（cov85 r1/r3 + magic-script）。→ 无残余。
- **0x23 OP_REMOVE_EQUIPMENT**：全卸有物槽撤效果层（event-system.test.ts:3008，管线级 slot0 有物）；
  全卸回包/单槽回包/空槽零变异（cov85 r3 + glm-next-wave）——**单槽效果层（:227）与空槽残留/不对称
  （:214/221）零覆盖** → C2/C3。
- **0x29 OP_POISON_PLAYER**：单体 0 抗必中+runner 实参（旧测）、applyAll 0/100 抗（cov85 r1）、
  单体 100 抗（cov85 r3）、空目标（cov85 r1）——**`<=` 等值边界未证** → C6。
- **0x2b/0x2c 解毒**：单体/applyAll/等级 99 保留（glm-next-wave）。空目标臂经共享 playerTargets
  由 0x29 空目标证 → 不另包装。
- **0x2d OP_SET_PLAYER_STATUS**：越界/全队/坏状态两臂/傀儡死人活人/好状态三臂/0xffff（cov85 r1/r3 +
  event-system.test 0x2D 管线 + equip-effect 0x2D scriptOnEquip 三测）。→ 无残余。
- **0x2f OP_REMOVE_PLAYER_STATUS**：>999 保留/≤999 清/越界/全队（cov85 r1/r3 + event-system）。→ 无残余。
- **0x41 OP_MARK_SCRIPT_FAILED**：管线行为 event-system.test.ts 已证（glm-next-wave 头注登记）。→ REG。
- **0x55/0x56 学忘法术**：单占槽/重复/spell0/满 32 槽/显式 role/越界/空表/无上下文默认 role0
  （旧测 + cov85 r1/r3）。→ 无残余。
- **default 族外返 false**：cov85 r1（0x01）+ 旧测（0x43）。→ 无残余。

## 防御守卫登记（合法输入不可达，不伪造覆盖）

- :62/:75/:87/:120/:132 的 `roleId === undefined || 0xffff` 守卫中 undefined 臂：生产 caller
  applyRawOpcode 恒传 currentEventObjectId 数字或 0xffff；直接调 applyPlayerOpcode 的旧测已覆盖
  undefined 形态（cov85 r1 已测），本卡不重复。
- :98 `if (!eqRow) return true`：rgwEquipment 六行在 createInitialGameState 恒初始化（cov85 r1 账
  已登记为防御守卫）。
- :271/:292 `!row || statusId >= row.length`：rgPlayerStatus 恒初始化（M6 memset 真值）；
  statusId 越界臂 cov85 r1 已测。
- :341-342 `operands[i] ?? 0`：operands 类型为三元组，稀疏数组属非法输入。
