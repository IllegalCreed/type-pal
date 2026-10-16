# 毒系统设计（P2·2026-07-06）

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: design-spec-v1 / 1.0.0

本页把历史设计正文接入 `design-spec-v1`，并保留 archive overlay。原始日期、方案语义、版本数字、冲突、未知项和链接均通过下方逐行引用保全；本页不授予当前产品、runtime、E2E、视觉或 coverage 信用。

## 问题与目标

- 历史设计问题/目标：PoisonDef 数据化 DoT 序列；毒槽独立于 BattleStatus；content20 脚本/剧情入口；入战携带、战后/读档清理、tick/抗性、相生相克和分片迁移。
- 文档身份：phase2 / archive；原始状态为 `archived`，当前有效性固定为 `historical`。
- 本次目标：让历史设计具备可检索的设计章节和历史边界，不把当时方案改写成当前合同。

## 真值与约束

- 固定源 revision：`45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA：`3066dffd6bde158322b053bc35b5d0b299671cecf698b51cfdf392a2b5117757`；原文 122 行、9658 bytes。
- 一手来源/正文锚点：docs/phase2/archive/designs/poison-system-design.md:1-1；标题锚点：1:毒系统设计（P2·2026-07-06）, 5:作者架构复审(2026-07-06,三点纠偏 —— 清洁重写去下标式身份), 17:架构决策:毒 = 数据化 DoT 序列,不是字节码脚本(2026-07-06 定,待作者确认), 30:数据模型, 32:# PoisonDef(content schema;来自 object-poisons.json + 一阶段实测值), 64:# 战斗单位毒槽(不是 BattleStatus 字段!), 72:# 入口与剧情作者入口（content20，2026-09-05）, 82:核心机制。
- 当前阶段证据：本批只做文档全文读取、语义分层和字节保全；current contract 必须回读继任规范、当前代码和真实调用域。
- 不可违反的约束：历史状态词只描述原文时点；旧 schema、迁移计划、done/待审标签和演出设想不得单独证明今天的实现。
- 未知与冲突：
- 设计把具体 content20、等级/数值、world↔battle 边界和迁移切片混在一起；当前 content22/SAVE12 和 runtime owner 可能已变。
- 致死/抗性/99 或 173 等历史数字只能由一阶段真值和当前 engine 共同证明。

## 方案

- 原始方案语义：PoisonDef 数据化 DoT 序列；毒槽独立于 BattleStatus；content20 脚本/剧情入口；入战携带、战后/读档清理、tick/抗性、相生相克和分片迁移。
- 本次治理方案：将上述语义拆入问题、真值、方案、边界、验收五个可定位章节；原文不删节，以 quote 作为唯一完整正文保全层。
- 继任关系：
- docs/phase1/game-mechanics.md
- docs/phase2/specs/content-schema.md
- 当前 poison/content/battle code 与 tests
- 明确不做：不执行原文迁移/实现步骤，不恢复 legacy fallback，不把历史计划、Self-Review 或静态审计当作 runtime/E2E/视觉/coverage 结果。

## 边界与风险

- 历史边界：本文可以说明当时为什么设计、如何计划和哪些问题已被识别，不能替代当前 canonical 文档、源码、测试或用户裁决。
- 主要冲突/风险：
- 设计把具体 content20、等级/数值、world↔battle 边界和迁移切片混在一起；当前 content22/SAVE12 和 runtime owner 可能已变。
- 致死/抗性/99 或 173 等历史数字只能由一阶段真值和当前 engine 共同证明。
- 停止线：不得按 archive poison 数值、迁移段或“已接”文字修改 runtime；先核 game mechanics、当前 content registry、battle/world owner。
- 若重新启用：必须以当前一手来源重新核对 schema、版本、调用方、合法输入和业务 oracle，并建立新的 review record；不得沿用本页日期作准入。

## 验收

- 可执行验证：模板章节完整；原文 quote 去除 `> ` 前缀后与 source UTF-8 字节逐字节相等；source/after SHA 写入 central review、registry、catalog 和 evidence receipt。
- 业务 oracle：历史结论、日期、状态、数字、链接、未知和冲突可定位；任何当前性主张都有继任入口或明确停止线。
- 本次执行范围：只读源、模板迁移、账本同步和静态治理门；runtime、E2E、视觉、coverage 均未运行。
- 复核 Owner 与截止条件：Codex 独立复核本页及三账本；非作者候选验收通过前保持 build/review，不标全量完成。

## 历史范围

- 原始范围：phase2 archive design；固定来源 `45d890e4ce3862aeac9c54eef2d7d18a32032cee`，原始正文 SHA `3066dffd6bde158322b053bc35b5d0b299671cecf698b51cfdf392a2b5117757`，原文日期和版本轴以 quote 为准。
- 归档原因：正文混合历史设计、阶段计划和后来附录；继任规范/代码已经承担当前合同，故本页只保留历史证据。

## 原始结论

- 毒系统设计（P2·2026-07-06）：这是 design-spec，当前文档状态为 historical。全文 123 行、11 个标题；摘要/首段为「> 真值锚:[game-mechanics.md §885-994](../../../phase1/game-mechanics.md)(毒 DoT/七大毒/相生相克/解毒)+ §1115-1218(大世界→战斗携带边界)+ [B-Poison 缺口清单](../../reference/phase1-knowledge-harvest.md)。一阶段 102 commit 打磨过。」。属于历史/归档材料，不能单独证明当前实现。
- 上述结论只属于其原始日期和适用范围；本页新增的结构化表述不改变原始结论。

## 当时证据

- source revision `45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA `3066dffd6bde158322b053bc35b5d0b299671cecf698b51cfdf392a2b5117757`；全文 122 行 / 9658 bytes。
- 原文标题/章节锚点：1:毒系统设计（P2·2026-07-06）, 5:作者架构复审(2026-07-06,三点纠偏 —— 清洁重写去下标式身份), 17:架构决策:毒 = 数据化 DoT 序列,不是字节码脚本(2026-07-06 定,待作者确认), 30:数据模型, 32:# PoisonDef(content schema;来自 object-poisons.json + 一阶段实测值), 64:# 战斗单位毒槽(不是 BattleStatus 字段!), 72:# 入口与剧情作者入口（content20，2026-09-05）, 82:核心机制。完整正文与链接、表格、代码、历史状态词在下方 quote 保留。

## 当前有效性

historical。不得将历史设计字段、迁移步骤、旧版本号、done/待审标签或静态审计结果外推为当前事实。
- 当前不得外推的部分：不得按 archive poison 数值、迁移段或“已接”文字修改 runtime；先核 game mechanics、当前 content registry、battle/world owner。

## 继任文档

- 当前 canonical / 复核入口：docs/phase1/game-mechanics.md, docs/phase2/specs/content-schema.md, 当前 poison/content/battle code 与 tests。
- supersedes / superseded-by：本页保留旧结构化记录作为历史；当前合同由继任规范、代码和新的独立审查记录决定。
- 重新启用条件：新的 primary source、版本/适用范围、合法输入、business oracle、可证伪观察和独立验收齐备。

## 原文保全

固定源 SHA `3066dffd6bde158322b053bc35b5d0b299671cecf698b51cfdf392a2b5117757`；以下 quote 只增加 Markdown blockquote 前缀，逆回读必须得到相同 UTF-8 字节。
<!-- original-source-quote:start -->
> # 毒系统设计（P2·2026-07-06）
>
> > 真值锚:[game-mechanics.md §885-994](../../../phase1/game-mechanics.md)(毒 DoT/七大毒/相生相克/解毒)+ §1115-1218(大世界→战斗携带边界)+ [B-Poison 缺口清单](../../reference/phase1-knowledge-harvest.md)。一阶段 102 commit 打磨过。
>
> ## 作者架构复审(2026-07-06,三点纠偏 —— 清洁重写去下标式身份)
>
> 1. **寿葫芦回血回蓝 ≠ 毒** —— 原版借 level99「伪毒」(563 HP/564 MP 回补)实现每回合 regen,是省空间拖鞋。
>    clean 版正名为独立装备词条 `{kind:'regenHp'|'regenMp', amount}`(值取原版毒脚本 0x1B/0x1C[_,20]),
>    走装备 live 派生(effectiveRegen,红线卸装即失效),回合末结算,**不碰毒系统**。563/564 从毒表删除。
> 2. **毒的 level → 语义可解度** —— level 从不代表毒的威力,只被解毒判定当分级键用(魔数下标身份)。
>    改 `curability: 'common' | 'severe' | 'incurable'`:common=常规毒(灵血咒解)/severe=六大毒(复活类解)/
>    incurable=无影毒+寄生毒(谁都不解,只自解)。cure 力也语义化(curesTier);`poisonCurableBy` 按秩比较。
> 3. **mpDelta 保留 + 递进/养蛊可表达** —— PoisonTick.mpDelta 留作未来扣蓝毒能力(现无实例);
>    **递进毒**天然可表达(ticks 是序列+指针推进,三尸蛊 [0,−1,−2,−3,−200] 即证);**养蛊**加 `grantItem`
>    (寄生到期产道具入队伍背包):561 食妖虫附→灵蛊145、562 碧血蚕附→赤血蚕149,递进 −1..−8 + 末回合 selfCure+grantItem。
>
> ## 架构决策:毒 = 数据化 DoT 序列,不是字节码脚本(2026-07-06 定,待作者确认)
>
> **分叉**:原版毒 DoT 是事件字节码(`OBJECT_POISON.wPlayerScript/wEnemyScript`,每回合跑一段、指针推进)。二阶段两条路:
> - **(a) 翻译字节码** —— 把毒脚本翻成 `ScriptStage[]`,战斗内跑 ScriptRunner。
> - **(b) 数据化 DoT** —— 毒 = `PoisonDef` 数据(逐回合伤害序列 + 终结动作),战斗核直接消费。✅ **选 (b)**。
>
> **理由**:
> 1. 清洁重写铁律 —— 不把字节码解释器带进新引擎的战斗核(毒脚本本就没进 all.json 反汇编,走 SSS object 空间)。
> 2. DoT 值是简单已知数据 —— 一阶段文档全表实测(赤毒 −7、三尸蛊 0→−1→−2→−3→−200…),手写数据不需动提取器。
> 3. 可编辑 —— 毒进编辑器数据 Tab(同战场页),作者能调/新增毒。
> 4. 相生相克也数据化 —— 作者已拍板「不硬码」,毒药关系 = 数据表(相克环 + 致死对),不是脚本 opcode。
> 5. 「脚本指针推进」= tick 序列的索引推进,天然映射。
>
> ## 数据模型
>
> ### PoisonDef(content schema;来自 object-poisons.json + 一阶段实测值)
>
> ```ts
> interface PoisonDef {
>   id: number            // 毒 object id(551 赤毒…560 金蚕蛊 / 137 无影毒 / 563-564 伪毒)
>   name: string          // WORD.DAT object 名(状态页显示当前所中毒名)
>   level: number         // 解毒分级键:0-2 常规 / 3 六大毒 / 173 无影毒(无解)/ 99 伪毒(不算中毒)
>   color: number         // 状态页头像染色(wColor)
>   // 逐回合 DoT(指针每回合推进;敌我两套,同毒效果不同)。到序列尾:重复末项 or selfCure。
>   playerTicks?: PoisonTick[]
>   enemyTicks?: PoisonTick[]
> }
> interface PoisonTick {
>   hpDelta?: number      // 每回合血变(负=扣,正=回补伪毒);玩家 0x1B / 敌 0x21
>   halveHp?: number      // 无影毒 0x5B:扣 = min(halveHp, 当前HP/2+1)一次性
>   selfCure?: boolean     // 末回合自解(0x2A/0x2B);三尸蛊暴扣后自除
> }
> ```
>
> **关键毒表**(id/level/逐回合,一阶段实测):
>
> | id | 名 | level | 玩家/回合 | 敌/回合 |
> |---|---|---|---|---|
> | 551 | 赤毒 | 0 | −7 循环 | −7 循环 |
> | 552 | 尸毒 | 1 | −12 | −12 |
> | 553 | 瘴毒 | 1 | −20 | −20 |
> | 554 | 毒丝 | 2 | −32 | −32 |
> | 555 | 三尸蛊 | 3 | [0,−1,−2,−3,−200+selfCure] | [−111,−222,−333+selfCure] |
> | 556-560 | 鹤顶红/孔雀胆/血海棠/断肠草/金蚕蛊 | 3 | −50 循环 | −100 循环 |
> | 137 | 无影毒 | 173 | (爆发) | halveHp 1000 一次 |
> | 563/564 | HP/MP 回补 | 99 | +N 循环(伪毒) | — |
>
> ### 战斗单位毒槽(不是 BattleStatus 字段!)
>
> ```ts
> // BattlePlayerState / EnemyState 各加:
> poisons: ActivePoison[]              // 独立列表,非 status
> interface ActivePoison { poisonId: number; tickIndex: number }  // 指针 = tickIndex
> ```
>
> ### 入口与剧情作者入口（content20，2026-09-05）
>
> - 入口 `StartWorld.seedConditions[actorId].poisonIds` 只保存稳定 `PoisonDef.id`，并只允许开局队员。
>   `buildWorld` 新建世界时一次性物化为 `ActivePoison { tickIndex: 0 }`；这是确定性当前快照，不执行相克、
>   致死或抗性门，读档也不重新播种。
> - 剧情使用 `applyActorCondition` / `clearActorCondition` 指向稳定 ActorId。显式施毒必中，不投玩家毒抗概率骰；
>   施加动作复用 `applyPoisonSelf`，因此相克、致死与重复毒仍只有一份 content 规则。
> - 世界中毒不自行推进 tick。进入战斗后复制现有槽并按战斗回合推进；战后只解到 `severe`，不可解毒保留；
>   从存档恢复时 party 与 reserve 的毒全部清除，包含不可解毒。这两条清理边界不得合并。
>
> ## 核心机制
>
> 1. **逐回合 DoT**(fight.c:4454):每单位**行动后**遍历自身 poisons,跑当前 tick(hpDelta/mpDelta/halveHp/grantItem)→ tickIndex++(钳到末项 or selfCure 则移除该毒)。敌我各取 enemyTicks/playerTicks。
>    对敌 `0x28` 还有一条容易漏掉的源语义:新毒通过巫抗门并首次落槽时,必须**当场执行一次**
>    `enemyTicks[0]`,把推进后的 `tickIndex` 写回毒槽;随后行动后 DoT 从该游标继续。抵抗或重复施加
>    已存在的同一种毒都不得重放首 tick。即时执行与逐回合执行共用同一个 tick 执行器,因此
>    `hpDelta`、`mpDelta`、`halveHp`、`grantItem`、`selfCure` 的效果和游标推进只有一份语义。
> 2. **上毒命中门 = 巫抗**(不是毒抗!fight.c 0x28):对敌下毒 `RandomLong(0,9) >= enemy.resistanceToSorcery` 才中;巫抗满(≥10)的 boss 不中毒。玩家被附带毒另看毒抗(`毒抗 < RandomLong(1,100)` 才中,fight.c:5141)。
> 3. **毒抗**(已接一半):`calcMagicDamage` 毒系伤害缩放已对;缺**中毒概率门**(玩家侧)+ 玩家毒抗装备派生(随装备系,M4b-3)。
> 4. **解毒分级**:cureByLevel(maxLevel) 移除 level≤maxLevel 的毒。灵血咒/九节菖蒲=2、复活类=3、无影毒(173)无解。
> 5. **携带边界**(§1115):大世界护体/毒/毒抗 = 同一份全局数据带进战斗;战斗结束**三件套**清(ClearAllStatus + CurePoisonByLevel(3) + RemoveEquipExtra)→ 都只保一场。reforge:createBattleState 从 world 注入;战后清理。
> 6. **毒龙胆/九阴散**(§976):0x61「没中毒就秒杀自己」。**✅ 已接**:`dieIfNotPoisoned` use 效果
>    (没中毒 → hp 0 + 截断后效;中毒 → 续跑)—— 毒龙胆 = [dieIfNotPoisoned, curePoison severe]、
>    九阴散 = [dieIfNotPoisoned, healHp 999](bytecode 实证)。寿葫芦已正名 regen 词条(非毒),
>    「level99 伪毒不算中毒」的坑随之消失(毒表里只有真毒,p.poisons 空 = 没中毒,判定天然干净)。
> 7. **装备诅咒 99 级毒**:装备附毒 = level 99,卸对应部位时清(global.c kBodyPartWear)。
>
> ## 相生相克(数据化,不硬码)—— 从 bytecode 反汇编,PoisonDef 承载
>
> **已落(2026-07-06)**:关系全从 6 毒药 throw/use 脚本反汇编,存 `PoisonDef.lethalWith`(致死对)+
> `PoisonDef.counters`(相克环),不硬码。毒 id:三尸蛊555/鹤顶红556/孔雀胆557/血海棠558/断肠草559/金蚕蛊560。
> - **致死(lethalWith,对称,仅投掷)**:555↔558 / 556↔557 / 559↔560。投掷本毒到已中配对毒的敌 →
>   当场暴毙(performThrow 判 lethalWith)。巫术下毒不触发(原版 0x5E/0x60 只在道具 throw 脚本)。✅ 已接
> - **相克(counters,单向 6 环,use-on-self)**:555→557/556→558/557→560/558→559/559→555/560→556。
>   use 毒药(对己)三段链 = applyPoison(本毒):① 身中被克毒 → 以毒攻毒解掉、不下本毒;② 身中致死配对
>   → 暴毙;③ 否则下本毒。**✅ 已接**(applyPoisonToPlayer + 物品 use applyPoison 消费;6 毒药 use.effects
>   整链化 = applyPoison(本毒),相克/致死靠 PoisonDef 数据不硬码)。
>
> ### 旧记录(设计初稿,已被上面 bytecode 实证取代)
>
> - **相克单向 6 元环**:鹤顶红→血海棠→断肠草→三尸蛊→孔雀胆→金蚕蛊→鹤顶红(use 毒药 A 解身上被 A 克的毒)。
> - **三对致死**(双向同身暴毙):孔雀胆↔鹤顶红 / 血海棠↔三尸蛊 / 金蚕蛊↔断肠草。
> - 全在 6 件毒药道具的 use/throw 脚本(0x5D/5E 查毒 + 0x2B 解 + 0x5F/60 秒)。**数据表**:`PoisonDef.counters?: number`(此毒 use 时解哪个毒)+ `lethalPairs`(致死对)。
> - **依赖**:道具大世界使用执行链(未接,同引路蜂 0x38)→ 归**毒药道具簇**,与本切片解耦。
>
> ## 切片划分
>
> - **本切片(地基)**:PoisonDef schema + 战斗单位 poisons 槽 + 逐回合 DoT tick + 巫抗上毒门 + 携带注入 + 战后三件套清理 + level99/173 豁免判定。证:赤毒(循环)+ 三尸蛊(递增+自解)+ 无影毒(爆发)端到端。
> - **后续(归毒药道具簇,依赖大世界道具使用)**:相生相克/致死对(数据表 + 道具 use/throw 脚本)、毒蛇卵/尸腐肉自毒、毒龙胆/九阴散、大蒜毒抗。
> - **随装备系**:玩家毒抗装备派生、装备诅咒 99 级毒。
> - **随状态字切片**:状态页毒名 + wColor 头像染色。
<!-- original-source-quote:end -->
