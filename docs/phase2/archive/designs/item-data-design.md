# 物品 / 装备数据架构设计(item & equipment data)

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: design-spec-v1 / 1.0.0

本页把历史设计正文接入 `design-spec-v1`，并保留 archive overlay。原始日期、方案语义、版本数字、冲突、未知项和链接均通过下方逐行引用保全；本页不授予当前产品、runtime、E2E、视觉或 coverage 信用。

## 问题与目标

- 历史设计问题/目标：ItemData 能力块拆分；EquipSpec/EquipEffect、装备槽、持有/穿戴/有效属性；本期只实现 statBonus，use/throw 为扩展口；demo 与 phase3 边界。
- 文档身份：phase2 / archive；原始状态为 `archived`，当前有效性固定为 `historical`。
- 本次目标：让历史设计具备可检索的设计章节和历史边界，不把当时方案改写成当前合同。

## 真值与约束

- 固定源 revision：`45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA：`06bdceb34b817576aefaca1ff06a63e724680ce6526260b01c9c72554f0d4920`；原文 146 行、8944 bytes。
- 一手来源/正文锚点：docs/phase2/archive/designs/item-data-design.md:1-1；标题锚点：1:物品 / 装备数据架构设计(item & equipment data), 7:0. 核心认识(已一手核验 items.json + item-status.md), 15:1. 设计原则:一物多能力,拆分在菜单层, 27:2. ItemData 基类(content/src/item.ts), 45:3. 装备能力 EquipSpec + EquipEffect(本期重点), 71:4. 装备槽对齐(要动状态板), 86:5. 持有 / 穿戴 / 有效属性, 98:6. use? / throw?(本期留口,不细化)。
- 当前阶段证据：本批只做文档全文读取、语义分层和字节保全；current contract 必须回读继任规范、当前代码和真实调用域。
- 不可违反的约束：历史状态词只描述原文时点；旧 schema、迁移计划、done/待审标签和演出设想不得单独证明今天的实现。
- 未知与冲突：
- use/throw、抗性/授状态/授技能、商店和战斗引擎被明确留后；`statBonus` 仅是当时切片。
- 旧 item IDs/字段和状态 registry 可能已由 current content/AssetId 取代。

## 方案

- 原始方案语义：ItemData 能力块拆分；EquipSpec/EquipEffect、装备槽、持有/穿戴/有效属性；本期只实现 statBonus，use/throw 为扩展口；demo 与 phase3 边界。
- 本次治理方案：将上述语义拆入问题、真值、方案、边界、验收五个可定位章节；原文不删节，以 quote 作为唯一完整正文保全层。
- 继任关系：
- docs/phase2/specs/content-schema.md
- 当前 packages/content item/status registry
- 当前 reforge menu/battle item callers
- 明确不做：不执行原文迁移/实现步骤，不恢复 legacy fallback，不把历史计划、Self-Review 或静态审计当作 runtime/E2E/视觉/coverage 结果。

## 边界与风险

- 历史边界：本文可以说明当时为什么设计、如何计划和哪些问题已被识别，不能替代当前 canonical 文档、源码、测试或用户裁决。
- 主要冲突/风险：
- use/throw、抗性/授状态/授技能、商店和战斗引擎被明确留后；`statBonus` 仅是当时切片。
- 旧 item IDs/字段和状态 registry 可能已由 current content/AssetId 取代。
- 停止线：不得把 use/throw 留口或 demo 数据当作当前 item contract/完整战斗能力；先核 current content types 和 caller。
- 若重新启用：必须以当前一手来源重新核对 schema、版本、调用方、合法输入和业务 oracle，并建立新的 review record；不得沿用本页日期作准入。

## 验收

- 可执行验证：模板章节完整；原文 quote 去除 `> ` 前缀后与 source UTF-8 字节逐字节相等；source/after SHA 写入 central review、registry、catalog 和 evidence receipt。
- 业务 oracle：历史结论、日期、状态、数字、链接、未知和冲突可定位；任何当前性主张都有继任入口或明确停止线。
- 本次执行范围：只读源、模板迁移、账本同步和静态治理门；runtime、E2E、视觉、coverage 均未运行。
- 复核 Owner 与截止条件：Codex 独立复核本页及三账本；非作者候选验收通过前保持 build/review，不标全量完成。

## 历史范围

- 原始范围：phase2 archive design；固定来源 `45d890e4ce3862aeac9c54eef2d7d18a32032cee`，原始正文 SHA `06bdceb34b817576aefaca1ff06a63e724680ce6526260b01c9c72554f0d4920`，原文日期和版本轴以 quote 为准。
- 归档原因：正文混合历史设计、阶段计划和后来附录；继任规范/代码已经承担当前合同，故本页只保留历史证据。

## 原始结论

- 物品 / 装备数据架构设计(item & equipment data)：这是 design-spec，当前文档状态为 historical。全文 147 行、11 个标题；摘要/首段为「> 状态:设计(2026-06-29)。物品(装备 / 使用 / 投掷)的数据地基 —— 物品菜单(装备 / 使用拆分)、战斗投掷、装备属性计算都长在它上。」。属于历史/归档材料，不能单独证明当前实现。
- 上述结论只属于其原始日期和适用范围；本页新增的结构化表述不改变原始结论。

## 当时证据

- source revision `45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA `06bdceb34b817576aefaca1ff06a63e724680ce6526260b01c9c72554f0d4920`；全文 146 行 / 8944 bytes。
- 原文标题/章节锚点：1:物品 / 装备数据架构设计(item & equipment data), 7:0. 核心认识(已一手核验 items.json + item-status.md), 15:1. 设计原则:一物多能力,拆分在菜单层, 27:2. ItemData 基类(content/src/item.ts), 45:3. 装备能力 EquipSpec + EquipEffect(本期重点), 71:4. 装备槽对齐(要动状态板), 86:5. 持有 / 穿戴 / 有效属性, 98:6. use? / throw?(本期留口,不细化)。完整正文与链接、表格、代码、历史状态词在下方 quote 保留。

## 当前有效性

historical。不得将历史设计字段、迁移步骤、旧版本号、done/待审标签或静态审计结果外推为当前事实。
- 当前不得外推的部分：不得把 use/throw 留口或 demo 数据当作当前 item contract/完整战斗能力；先核 current content types 和 caller。

## 继任文档

- 当前 canonical / 复核入口：docs/phase2/specs/content-schema.md, 当前 packages/content item/status registry, 当前 reforge menu/battle item callers。
- supersedes / superseded-by：本页保留旧结构化记录作为历史；当前合同由继任规范、代码和新的独立审查记录决定。
- 重新启用条件：新的 primary source、版本/适用范围、合法输入、business oracle、可证伪观察和独立验收齐备。

## 原文保全

固定源 SHA `06bdceb34b817576aefaca1ff06a63e724680ce6526260b01c9c72554f0d4920`；以下 quote 只增加 Markdown blockquote 前缀，逆回读必须得到相同 UTF-8 字节。
<!-- original-source-quote:start -->
> # 物品 / 装备数据架构设计(item & equipment data)
>
> > 状态:设计(2026-06-29)。物品(装备 / 使用 / 投掷)的数据地基 —— 物品菜单(装备 / 使用拆分)、战斗投掷、装备属性计算都长在它上。
> > 依据:roadmap §3(稳定 id / schema 留扩展口)、[D18](../../decisions.md);镜像 [skill-data-design](skill-data-design.md) 的三层做法。
> > 本期**聚焦装备**;`use`/`throw` 只定基类口、细化留后。
>
> ## 0. 核心认识(已一手核验 items.json + item-status.md)
>
> - 原版物品 = 一条定义 + **独立能力位** `flags{usable, equipable, throwable, …}`(不是互斥类型)。菜单**按能力过滤**:用 / 装 / 掷。
> - **双重身份天然支持**:6 颗灵珠(圣/风/雷/水/火/土,`usable && equipable`)既能用又能装 —— 一条物品挂多个能力块即可,零特判。
> - 234 件:可装 106 / 可用 100 / 可掷 83(装+掷重叠 32,多数武器能掷)。
> - **槽位不在物品数据里**(原版靠 scriptOnEquip 的 0x18 运行时定槽)→ clean-rewrite **提成显式字段**。
> - 装备效果来自 scriptOnEquip 的 opcode:`0x17` 属性加成 / `0x1A` 最大HP·MP·授法术·全体攻 / `0x2D` 永久状态。
>
> ## 1. 设计原则:一物多能力,拆分在菜单层
>
> **"彻底拆分"发生在菜单过滤,不在数据层。** 一条 `ItemData` 挂可选能力块,菜单按能力块存在与否过滤:
>
> | 能力块 | 进哪个菜单 | 触发 |
> |---|---|---|
> | `equip?` | 【装备】菜单(大世界) | 装备 → 跑 EquipEffect |
> | `use?` | 【使用】菜单(大世界 + 战斗) | 使用 → 跑 ItemUseEffect |
> | `throw?` | 【投掷】菜单(**战斗内**) | 投掷 → 战斗效果(phase3) |
>
> 灵珠同时有 `equip` + `use` → 两菜单都出现,自然。
>
> ## 2. ItemData 基类(content/src/item.ts)
>
> ```ts
> interface ItemData {
>   id: string          // demo=原版 oid 字符串;当不透明 string
>   name: string
>   desc: string        // 原版 scriptDesc → 直接文字
>   icon: number        // 图标 bitmap(BALL.MKF chunk;渲染用)
>   buyPrice: number    // 买价(原版 wPrice)
>   sellPrice: number   // 卖价(原版=买价/2,但 clean-rewrite 显式存,可独立定)
>   sellable: boolean   // 可卖(原版 flag)
>   // —— 能力块(可叠加;有则进对应菜单)——
>   equip?: EquipSpec   // 本期重点
>   use?:   UseSpec     // 本期留口,使用菜单时细化
>   throw?: ThrowSpec   // phase3 战斗投掷
> }
> ```
>
> ## 3. 装备能力 EquipSpec + EquipEffect(本期重点)
>
> ```ts
> // 6 装备槽,对齐原版 body part(kBodyPartHand/Head/Body/Shoulder/Feet/Wear)
> type EquipSlot = 'weapon' | 'head' | 'body' | 'cloak' | 'feet' | 'accessory'
> //                手(武器)   头      身      披风       足      手饰
>
> interface EquipSpec {
>   slot: EquipSlot
>   equipableBy: string[]   // 角色模板 id(原 equipableBy[6] bitfield → 稳定 id 列表)
>   effects: EquipEffect[]  // 穿戴时生效(有序)
> }
>
> // clean-rewrite scriptOnEquip 的 opcode 链;复用技能地基的 StatusId / skillId
> type EquipEffect =
>   | { kind: 'statBonus'; stat: CombatStat; delta: number } // 0x17(可负,如铁锁衣防御-10);CombatStat=attack/magicAttack/defense/speed/luck(对齐 CharacterInstance)
>   | { kind: 'resistance'; element: 'poison'|'wind'|'thunder'|'water'|'fire'|'earth'; percent: number } // 0x17[22-27]
>   | { kind: 'maxPool'; pool: 'hp'|'mp'; delta: number }   // 0x1A
>   | { kind: 'grantStatus'; status: StatusId }             // 0x2D 永久(仙女剑→连击/dualAttack)
>   | { kind: 'grantSkill'; skillId: string }              // 0x1A 授合击/召唤(圣灵珠→武神;土灵珠→山神)
>   | { kind: 'attackAll' }                                // 0x1A(长鞭:全体攻击)
> ```
>
> - **`statBonus` 本期就算**(见 §5 有效属性);`resistance/maxPool/grantStatus/grantSkill/attackAll` 本期**定形状、不跑引擎**(角色 resist 字段、授法术/状态的运行时 = phase3,同技能 effects 的引擎留后)。
> - ✅ **已核实 row→属性**(equip-effect.ts 真值):row17=attack / 18=magicAttack / 19=**defense** / 20=dexterity(→speed)/ 21=fleeRate(运气)/ 22=毒抗 / 23-27=风雷水火土抗 / 65=授合击。**⚠ item-status.md 把 row19 误标"运气",实为 defense** —— demo 已据此(各防具是 defense+N)。
>
> ## 4. 装备槽对齐(要动状态板)
>
> | 新 slot | 原版 body part | 状态板现状 | 动作 |
> |---|---|---|---|
> | `weapon` | part 3 Hand | weapon | 不变 |
> | `head` | part 0 Head | head | 不变 |
> | `body` | **part 2**(sdlpal 名 Shoulder,实装防具:布袍/铠甲) | body | 不变 |
> | `cloak` | **part 1**(sdlpal 名 Body,实装身饰:披风/护肩) | (无,旧 accessory≈) | **新增披风槽** |
> | `feet` | part 4 Feet | feet | 不变 |
> | `accessory` | part 5 Wear(手饰) | amulet | **旧 amulet 改名 accessory** |
>
> > ⚠ sdlpal 枚举名 `Body(1)`/`Shoulder(2)` 与中文类目相反(part1 实装身饰/披风、part2 实装防具)——按「实际装什么」命名 `cloak`/`body`;槽↔part 解码自 `0x18` operand(`EQUIPMENT_n` row 11-16 → part)已核验。
>
> → 改 `reforge/menu/menu-box.ts` 的 `EQUIP_SLOTS` + `content/locale.ts` 的 `equip.*` 标签 + `bake-assets` 的 equip-demo slot 名,统一到这 6 个。
>
> ## 5. 持有 / 穿戴 / 有效属性
>
> ```ts
> // 持有(WorldState,跟存档)
> WorldState.inventory: { itemId: string; count: number }[]   // 镜像 phase-1 InventoryEntry
> // 穿戴(CharacterInstance,已存在)
> CharacterInstance.equipment: Record<EquipSlot, string>      // slot → itemId
> ```
>
> - **有效属性 = 基础 + Σ 已穿戴 statBonus**(纯函数,镜像 phase-1 equip-effect)。本期实现 `statBonus`,让状态板穿装即变数字 —— 装备才"有意义"。resist/grant 计算 phase3。
> - 装备动作:从 inventory 取可装物(该角色 `equipableBy`)→ 放进对应 `slot`(原物退回 inventory)。
>
> ## 6. use? / throw?(本期留口,不细化)
>
> ```ts
> interface UseSpec {
>   target: 'oneAlly'|'allAllies'|'self'|'scene'    // 场景用途显式使用 scene
>   consuming: boolean                               // 用后消耗(原 consuming flag)
>   effects: ItemUseEffect[]
> }
> ```
>
> **`ItemUseEffect` 是独立联合,不等同 SkillEffect**(作者点明:用物品大量是脚本/剧情/场景):
> - 回复重叠类(概念同 SkillEffect):`healHp / healMp / revive / curePoison / removeStatus / applyStatus`
> - 物品独有:`permanentStatBoost`(0x19 舍利子防御+3)、`triggerScript`(桂花酒/玉佩等剧情)、`teleport`(引路蜂回迷宫口 0x38)、`giveItems`/`giveMoney`(包袱 0x1E)、`learnSkill`(手卷授技 0x55)、`scenePlace`(捕兽夹/芦苇漂 0x84 放置场景物)、`transform`(梦蛇变身)、`levelUp`(金蚕王)、`craft`(紫金葫芦炼丹)…
> - **细化留到做使用菜单时**(本期只定 `use?` 口的形状,不实现)。
>
> ```ts
> interface ThrowSpec { /* phase3 战斗投掷:对敌 damage/施毒/秒杀…,届时细化 */ }
> ```
>
> ## 7. demo 数据(本期)
>
> 李逍遥可装的 6 件(slot/delta 已解码 scriptOnEquip 字节码 + equip-effect.ts row 表;⚠ row19=defense,item-status 的"运气"是误标):
>
> | oid | name | slot | icon/买/卖 | 效果(已核验) |
> |---|---|---|---|---|
> | 166 | 木剑 | weapon | 56 / 50 / 25 | attack+2, speed+3 |
> | 196 | 头巾 | head | 176 / 40 / 20 | defense+1 |
> | 208 | 布袍 | body | 78 / 100 / 50 | defense+3 |
> | 225 | 披风 | cloak | 95 / 160 / 80 | defense+2 |
> | 235 | 草鞋 | feet | 97 / 30 / 15 | defense+1 |
> | 249 | 护腕 | accessory | 224 / 70 / 35 | defense+2 |
>
> (全部 equipableBy 含李逍遥;demo equipableBy 仅填 `['li-xiaoyao']`,全量 6 角色映射留 migrate。)
>
> + **1 颗灵珠验证双重身份**:土灵珠(267)`equip{slot:accessory, effects:[resistance earth+50, grantSkill 山神(336)]}` + `use{triggerScript 剧情 stub}` —— 能力块模型 + grantSkill/resistance 形状(不跑引擎)。
>
> ## 8. 边界(现在 vs 后)
>
> - ✅ **现在**:`ItemData` 基类 + `EquipSpec`/`EquipEffect` 全形 + 6 槽(改状态板)+ `inventory` + **statBonus 有效属性**(状态板反映)+ 装备菜单(单人:选装→穿/卸)+ 李逍遥 demo + 1 灵珠样例。
> - ⏸ **后**:使用菜单(`ItemUseEffect` 细化)、战斗投掷、resist/grant/attackAll 计算引擎、买卖商店、物品分类 tab、migrate 全量 234 件。
>
> ## 9. Self-Review
>
> 1. **能力块覆盖**:equip/use/throw 三能力对三菜单;双重身份(灵珠)零特判。✅
> 2. **真值无臆测**:能力位/6 灵珠/6 槽/效果 opcode 均一手核验;delta 与 row 映射标注 plan 时核。✅
> 3. **镜像技能地基**:ItemData(=SkillData)/ EquipEffect(=SkillEffect 判别联合)/ DEMO_ITEMS(=DEMO_SKILLS Record)/ inventory(=learnedSkills 关系表)。一致。✅
> 4. **use ≠ skill**:ItemUseEffect 独立联合(含脚本/剧情/场景类),不强等同 SkillEffect。✅
> 5. **稳定 id / 扩展口**:id 不透明 string;能力块可选;effects 数组可加 kind;6 槽可扩。✅
> 6. **范围克制**:本期只 equip + statBonus 计算;use/throw/引擎/商店/分类留后。✅
<!-- original-source-quote:end -->
