# TEST-GEMINI-PHASE1-STATS-1 候选回归与反控回执

## 1. 任务背景与边界
- 任务卡: `docs/ops/tasks/TEST-GEMINI-PHASE1-STATS-1-effective-readouts.md`
- 状态: `draft` (仅隔离候选测试交付，不修改产品代码，不修改旧测试，不合并 main，不代签或标 done)
- 独立分支: `codex/gemini-phase1-stats-r1`
- 隔离目录: `docs/testing/gemini-phase1-stats/**`
- 源码冻结 SHA-256 核验:
  - `packages/game/src/core/equip-effect.ts`: `7daa55fa6951af329a38691842fe241d2c623390823d2d69a8a8d20fddec26ea`
  - `packages/game/src/core/inspect/battle-inspect.ts`: `c8f76c397fd62af1f1bdbfefebeec781413cd29d5fcaa89ba51bfac8a7bf0bd3`

---

## 2. 逐族去重证据与合同覆盖分析 (E1–E6, I1–I2)

| 族 | 模块主入口 | 旧测试标题 (去重已排除) | 现行 Caller / 合同 | 本候选新增独立合同 |
|---|---|---|---|---|
| **E1** | 六 `getPlayer*` | `equip-effect.test.ts:153-193` 已测 base + 两格与 200/-50 粗粒度截断 | 菜单 UI (`draw-equip`, `draw-player-status`), 战斗 `projectRuntimeToBattleRoles` | 1. Extra 格索引 6 参与全部 6 个 getter 计算<br>2. 多角色间装备效果严格隔离无泄漏<br>3. 毒抗 100/101 与 0/-1 精确临界值截断 |
| **E2** | `writeEquipmentEffectField` / `removeEquipmentEffect` | `equip-effect.test.ts:43-151` 仅测 Atk, Dex, Elem0, 1/4/65 行与 Hand/Wear 特殊卸装 | 装备脚本 0x17/0x18 执行层 | 1. 覆盖生命/真气/防御/闪避/五行(1..4)与守护行<br>2. Extra 格 6 的写入与卸下清空<br>3. 越界部位 (-1, 7) 与未知行忽略且保真无关域 |
| **E3** | `addPlayerStatRow` / `setPlayerStatRow` | `equip-effect.test.ts:300,409` 仅测造型行与 Atk 进行中覆盖层 | 脚本 0x19 属性提升与 0x1A 变身/属性设置 | 1. addPlayerStatRow 独立测试及负 delta 减益支持<br>2. setPlayerStatRow 在进行中时多属性覆盖层写入<br>3. 常规态写入基础属性与角色隔离 |
| **E4** | `runEquipScript` | `equip-effect.test.ts:215-258` 仅测 0x18 换装换包逻辑 | 装备脚本驱动器 (`scriptOnEquip`) | 1. goto 跳转正确跳过中间指令至目标 label<br>2. end 早停截断后续指令<br>3. 0 或未注册 label 安全退出<br>4. signExtendI16 负数操作数还原<br>5. 循环跳转触发 SCRIPT_TICK_LIMIT 256 保护且重置 iCurEquipPart |
| **E5** | `updateAllEquipments` | 旧单测完全无用例 (`equip-effect.test.ts:9` 标依赖 runtime 留 e2e) | 读档 / 开战 / 换装后全员效果层重建 | 1. 清除旧有全部残留脏数据并按现存装备完全重算<br>2. 多角色多部位并行重建与归属隔离 |
| **E6** | `resyncBattleRoleStatsFromRuntime` | 旧单测完全无直接单元测试 (仅 `event-system.test.ts:1020` 测了 MaxHP/Atk) | 战斗中 0x19/0x1A 触发后全队战斗快照刷新 | 1. **核心不变量**: 战内 live 当前生命与真气 (hp/mp) 绝不被覆盖<br>2. 完整同步等级、最大生命/真气与有效装备属性 |
| **I1** | `collectPartyStatusReadouts` | `battle-inspect.test.ts:178` 仅测单人 slot0=role0 在战斗态下的字段 | dev-panel 与生产工具面板队伍检查器 | 1. 槽位 slot 与 roleId 严格分离 (partyMembers [2,0])<br>2. persistent 来源正确读取大世界 rgPlayerStatus<br>3. 完整解析五属性隐藏经验池与各自等级阈值<br>4. 结构化中毒 entries 与 statuses 标签解析 |
| **I2** | `collectEnemyStatusReadouts` / `collectFieldInfoReadout` | `battle-inspect.test.ts:83-177` 已测 attackEquivPoison, collectValue, 空战斗 | dev-panel 与生产工具面板敌人及场地检查器 | 1. defeated 标记与 maxHp (maxHealth ?? prevHp ?? health) 回退链<br>2. 敌方偷物品与偷金钱的区分展示<br>3. 敌方状态计数器与自带中毒解析<br>4. 战场 isBoss、screenWave 与有符号正负五行场效 |

---

## 3. 测试套件执行结果

### 3.1 候选测试 (`docs/testing/gemini-phase1-stats/tests/*.test.ts`)
```text
 ✓ tests/e1-effective-stats.test.ts (3 tests)
 ✓ tests/e2-equipment-effects.test.ts (3 tests)
 ✓ tests/e3-player-stat-rows.test.ts (3 tests)
 ✓ tests/e4-run-equip-script.test.ts (5 tests)
 ✓ tests/e5-update-all-equipments.test.ts (2 tests)
 ✓ tests/e6-resync-battle-role-stats.test.ts (2 tests)
 ✓ tests/i1-party-status-readouts.test.ts (4 tests)
 ✓ tests/i2-enemy-field-readouts.test.ts (4 tests)

 Test Files  8 passed (8)
      Tests  26 passed (26)
```

### 3.2 相邻原测试验证
```text
 ✓ packages/game/src/core/inspect/battle-inspect.test.ts (5 tests)
 ✓ packages/game/src/core/equip-effect.test.ts (36 tests)

 Test Files  2 passed (2)
      Tests  41 passed (41)
```

---

## 4. 单点业务反控报告 (4 组单点 Mutation)

执行脚本: `node docs/testing/gemini-phase1-stats/mutants.mjs`
反控机制: vitest transform 内存注入，保证源码磁盘哈希严格不变 (前后一致)。

1. **M1_E4_PART_OFFSET** (族 E4: runEquipScriptSync opcode 0x17)
   - 变异点: `const partIdx = (a ?? 0) - 0x0b` -> `const partIdx = (a ?? 0)`
   - 反控红因: 破坏部位基准偏移 0x0B，导致手持 (part 3, 操作数 14) 被误写入部位 14，未能命中测试断言 `gs.rgEquipmentEffect[3]`。
   - 结果: 抛出 `AssertionError: expected 0 to be 15`，单点业务红。

2. **M2_E6_EFFECTIVE_ATK** (族 E6: resyncBattleRoleStatsFromRuntime 装备有效攻回灌)
   - 变异点: `role.attackStrength = getPlayerAttackStrength(gs, roleId)` -> `role.attackStrength = rt.rgwAttackStrength[roleId] ?? role.attackStrength`
   - 反控红因: 忽略装备加成，仅回灌基础值，未能体现武器 +30 攻击力。
   - 结果: 抛出 `AssertionError: expected 80 to be 110`，单点业务红。

3. **M3_E6_PRESERVE_LIVE_HP** (族 E6: resync 误覆盖 live hp/mp 核心不变量)
   - 变异点: 在更新 maxHP 时附带将 `role.hp = rt.rgwHP[roleId]` 回灌
   - 反控红因: 抹杀了战内扣血后的实时残血状态 (15点)，被基础满血 100 点覆盖。
   - 结果: 抛出 `AssertionError: expected 100 to be 15`，单点业务红。

4. **M4_I1_SLOT_ROLE_CONFUSION** (族 I1: collectPartyStatusReadouts 槽位与角色混淆)
   - 变异点: `const roleId = battlePlayer?.roleId ?? partyRoleId` -> `const roleId = slot`
   - 反控红因: 混淆了 partyMembers 槽位下标与真实 roleId，导致 slot 0 (林月如) 被错认为 role 0 (李逍遥)。
   - 结果: 抛出 `AssertionError: expected '李逍遥' to be '林月如'`，单点业务红。

---

## 5. 待证清单与结论
- **未定真值与不可达分支**:
  - `equip-effect.ts` 中 0x2D / 0x29 在部分罕见饰品上的特定触发未在原版全量提取数据中确认，已保留现行合同而不臆造额外机制。
  - `battle-inspect.ts` 中 `slow` (迟) 在 persistent 大世界中无存储下标，按现行合同忽略，待未来有大世界减速需求时评估。
- **产品代码无修改**: 本次任务严格遵循隔离原则，仅产出 `docs/testing/gemini-phase1-stats/**`，未修改任何产品代码与正式基线。
- **移交审核**: 隔离测试与反控报告交付 Codex 独立复核及后续正式集成。
