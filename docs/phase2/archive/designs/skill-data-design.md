# 技能数据架构设计(skill data)

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: design-spec-v1 / 1.0.0

本页把历史设计正文接入 `design-spec-v1`，并保留 archive overlay。原始日期、方案语义、版本数字、冲突、未知项和链接均通过下方逐行引用保全；本页不授予当前产品、runtime、E2E、视觉或 coverage 信用。

## 问题与目标

- 历史设计问题/目标：三层技能 schema：SkillData（typed effects、target/animation、cost）、WorldState.learnedSkills 关系表、levelUpSkills 规则；Status registry 归一；用气疗/飞龙/灵葫/状态/召唤/变身验证表达力；完整引擎与全量迁移留 phase3。
- 文档身份：phase2 / archive；原始状态为 `archived`，当前有效性固定为 `historical`。
- 本次目标：让历史设计具备可检索的设计章节和历史边界，不把当时方案改写成当前合同。

## 真值与约束

- 固定源 revision：`45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA：`efaf146d031628b152721d771e9e61d482aed1dc4e077f9e822db1720d54e1ce`；原文 145 行、12908 bytes。
- 一手来源/正文锚点：docs/phase2/archive/designs/skill-data-design.md:1-1；标题锚点：1:技能数据架构设计(skill data), 6:1. 范围, 16:2. 三层 schema, 18:# ① SkillData(技能定义,content 静态), 73:# 当前状态 registry（content20）, 88:## 2.1 worked examples(证明 shape 能表达特殊技能,非全量), 102:# ② learnedSkills(习得关系表,WorldState 跟存档), 112:# ③ levelUpSkills(习得规则,content 静态)。
- 当前阶段证据：本批只做文档全文读取、语义分层和字节保全；current contract 必须回读继任规范、当前代码和真实调用域。
- 不可违反的约束：历史状态词只描述原文时点；旧 schema、迁移计划、done/待审标签和演出设想不得单独证明今天的实现。
- 未知与冲突：
- skill id、demo 数据和 content20 registry 是历史快照；效果引擎/抗性/命中、102 技能全量迁移、升级逻辑明确未做。
- poison 独立、永久属性/phase3 扩展等边界需与当前 item/status/battle canonical 对齐。

## 方案

- 原始方案语义：三层技能 schema：SkillData（typed effects、target/animation、cost）、WorldState.learnedSkills 关系表、levelUpSkills 规则；Status registry 归一；用气疗/飞龙/灵葫/状态/召唤/变身验证表达力；完整引擎与全量迁移留 phase3。
- 本次治理方案：将上述语义拆入问题、真值、方案、边界、验收五个可定位章节；原文不删节，以 quote 作为唯一完整正文保全层。
- 继任关系：
- docs/phase2/specs/content-schema.md
- 当前 packages/content skill/status data
- 当前 battle/menu callers；phase3 backlog only for deferred work
- 明确不做：不执行原文迁移/实现步骤，不恢复 legacy fallback，不把历史计划、Self-Review 或静态审计当作 runtime/E2E/视觉/coverage 结果。

## 边界与风险

- 历史边界：本文可以说明当时为什么设计、如何计划和哪些问题已被识别，不能替代当前 canonical 文档、源码、测试或用户裁决。
- 主要冲突/风险：
- skill id、demo 数据和 content20 registry 是历史快照；效果引擎/抗性/命中、102 技能全量迁移、升级逻辑明确未做。
- poison 独立、永久属性/phase3 扩展等边界需与当前 item/status/battle canonical 对齐。
- 停止线：不得把 typed effect examples 当作战斗实现或全量技能覆盖；先核 current content/battle data and source oracle。
- 若重新启用：必须以当前一手来源重新核对 schema、版本、调用方、合法输入和业务 oracle，并建立新的 review record；不得沿用本页日期作准入。

## 验收

- 可执行验证：模板章节完整；原文 quote 去除 `> ` 前缀后与 source UTF-8 字节逐字节相等；source/after SHA 写入 central review、registry、catalog 和 evidence receipt。
- 业务 oracle：历史结论、日期、状态、数字、链接、未知和冲突可定位；任何当前性主张都有继任入口或明确停止线。
- 本次执行范围：只读源、模板迁移、账本同步和静态治理门；runtime、E2E、视觉、coverage 均未运行。
- 复核 Owner 与截止条件：Codex 独立复核本页及三账本；非作者候选验收通过前保持 build/review，不标全量完成。

## 历史范围

- 原始范围：phase2 archive design；固定来源 `45d890e4ce3862aeac9c54eef2d7d18a32032cee`，原始正文 SHA `efaf146d031628b152721d771e9e61d482aed1dc4e077f9e822db1720d54e1ce`，原文日期和版本轴以 quote 为准。
- 归档原因：正文混合历史设计、阶段计划和后来附录；继任规范/代码已经承担当前合同，故本页只保留历史证据。

## 原始结论

- 技能数据架构设计(skill data)：这是 design-spec，当前文档状态为 historical。全文 146 行、12 个标题；摘要/首段为「> 状态:设计(2026-06-28)。技能(仙术 / 武技 / 辅助…)的数据地基 —— 仙术菜单、战斗、phase3 技能系统都长在它上。」。属于历史/归档材料，不能单独证明当前实现。
- 上述结论只属于其原始日期和适用范围；本页新增的结构化表述不改变原始结论。

## 当时证据

- source revision `45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA `efaf146d031628b152721d771e9e61d482aed1dc4e077f9e822db1720d54e1ce`；全文 145 行 / 12908 bytes。
- 原文标题/章节锚点：1:技能数据架构设计(skill data), 6:1. 范围, 16:2. 三层 schema, 18:# ① SkillData(技能定义,content 静态), 73:# 当前状态 registry（content20）, 88:## 2.1 worked examples(证明 shape 能表达特殊技能,非全量), 102:# ② learnedSkills(习得关系表,WorldState 跟存档), 112:# ③ levelUpSkills(习得规则,content 静态)。完整正文与链接、表格、代码、历史状态词在下方 quote 保留。

## 当前有效性

historical。不得将历史设计字段、迁移步骤、旧版本号、done/待审标签或静态审计结果外推为当前事实。
- 当前不得外推的部分：不得把 typed effect examples 当作战斗实现或全量技能覆盖；先核 current content/battle data and source oracle。

## 继任文档

- 当前 canonical / 复核入口：docs/phase2/specs/content-schema.md, 当前 packages/content skill/status data, 当前 battle/menu callers；phase3 backlog only for deferred work。
- supersedes / superseded-by：本页保留旧结构化记录作为历史；当前合同由继任规范、代码和新的独立审查记录决定。
- 重新启用条件：新的 primary source、版本/适用范围、合法输入、business oracle、可证伪观察和独立验收齐备。

## 原文保全

固定源 SHA `efaf146d031628b152721d771e9e61d482aed1dc4e077f9e822db1720d54e1ce`；以下 quote 只增加 Markdown blockquote 前缀，逆回读必须得到相同 UTF-8 字节。
<!-- original-source-quote:start -->
> # 技能数据架构设计(skill data)
>
> > 状态:设计(2026-06-28)。技能(仙术 / 武技 / 辅助…)的数据地基 —— 仙术菜单、战斗、phase3 技能系统都长在它上。
> > 依据:roadmap §3(稳定 id / schema 留 MMO 口)、[D18](../../decisions.md)、议题 [16/17](../../../phase3/backlog.md)。
>
> ## 1. 范围
>
> 技能数据分**三层**,原版三层都有数据 —— 本设计定**三层 schema 形状**(现在该定对、长期稳定),demo 填李逍遥仙术验证;**完整内容 + 灵活加点/技能树(议题16)/熟练度(议题17)/特殊效果引擎留 phase3**(在本架构上扩,不推翻)。
>
> | 层 | 是什么 | 原版数据源 |
> |---|---|---|
> | ① 技能定义 `SkillData` | 技能本身(名/消耗/效果列表/动画) | `magic.json`(伤害/元素/动画)+ `spells`(scriptOnSuccess → effects)+ `words`(名) |
> | ② 习得关系 `learnedSkills` | 谁当前会哪些技能 | `player-roles` 的 magic 数组 |
> | ③ 习得规则 `levelUpSkills` | 谁升到几级学什么 | `level-up-magic.json` |
>
> ## 2. 三层 schema
>
> ### ① SkillData(技能定义,content 静态)
>
> > **关键认识(投石问路 game/sdlpal 得来)**:原版「技能做什么」**根本不是单个数据字段**,而是 `scriptOnSuccess` 跑的一串 opcode —— `0x1B` 回 HP / `0x2D·0x2E` 加状态 / `0x2F` 解状态 / `0x28` 下毒 / `0x60` 即死 / `0x6A` 偷取 / `0x33` 收宝 ……(`type`/`baseDamage`/`elemental` 只是数据侧的伤害/渲染参数)。所以 `baseDamage`+`type` 永远表达不了飞龙探云手、灵葫咒、加/解状态 —— 这些**本就是脚本**。clean-rewrite 的对应物 = **把那串 opcode 翻成一份 typed「效果列表」`effects[]`**。一个技能 = 有序多效果(灵葫咒 = 收宝 + 即死两步,正对应原版两条 opcode)。
>
> ```ts
> interface SkillCost {             // 消耗。原版 MP 在 Magic.costMP;酒/蛊/金钱在 scriptOnUse 脚本硬编 → 第二阶段提到 schema(数据驱动 > 硬编)
>   mp?: number
>   stamina?: number                // 体力(合体技)
>   money?: number                  // 乾坤一掷耗金钱
>   items?: { itemId: string; amount: number }[]  // 酒神耗酒 / 巫术耗蛊(依赖 item 系统)
> }
>
> // 作用目标(谁)—— 原版 MagicType 把「目标」和「渲染样式」混在一起,这里只取 gameplay 的「目标」
> type SkillTarget = 'oneEnemy' | 'allEnemies' | 'oneAlly' | 'allAllies' | 'self'
>
> // 状态 id(原版 9 种;毒是独立系统 → 见 applyPoison/curePoison)
> type StatusId =
>   | 'confused' | 'paralyzed' | 'sleep' | 'silence' | 'puppet'    // 异常:混乱/定身/睡眠/沉默/傀儡
>   | 'bravery' | 'protect' | 'haste' | 'dualAttack'               // 增益:狂暴/护体/加速/连击
>
> // 技能效果 = clean-rewrite 版的 scriptOnSuccess opcode 链。每个 variant ≈ 原版一条效果 opcode。
> type SkillEffect =
>   | { kind: 'damage'; power: number; elemental: number }          // 伤害(原 baseDamage);elemental 0无/1-5风雷水火土/>5毒,抗性=此×角色 elemResistance
>   | { kind: 'healHp'; amount: number }                           // 0x1B 回 HP
>   | { kind: 'healMp'; amount: number }                           // 0x1C 回 MP
>   | { kind: 'revive'; hpPercent: number }                        // 0x22 复活(回 max×%)
>   | { kind: 'applyStatus'; status: StatusId; turns: number }     // 0x2D/0x2E 加状态(命中由引擎按目标抗性判,见下)
>   | { kind: 'removeStatus'; statuses: StatusId[] }               // 0x2F 解状态(冰心诀)
>   | { kind: 'applyPoison'; poisonId: string }                    // 0x28/0x29 下毒 / 下蛊
>   | { kind: 'curePoison'; maxLevel?: number; poisonId?: string } // 0x2A-0x2C 解毒(按级 / 按种)
>   | { kind: 'buffStat'; stat: 'attack'|'defense'|'magic'|'dexterity'; percent: number; duration: 'battle' | number } // 0x30 临时增益
>   | { kind: 'instantKill' }                                      // 0x60 即死(灵葫咒)
>   | { kind: 'steal'; rate: number }                              // 0x6A 偷金钱/道具(飞龙探云手,rate=偷取率)
>   | { kind: 'collectTreasure' }                                  // 0x33 收集敌方宝物(灵葫咒二次)
>   | { kind: 'summon'; godId: number }                            // 召唤(原 type=summon)
>   | { kind: 'trance'; sprite: number }                                           // 変身(原 type=trance)
>   // phase3 加新 kind(吸血 0x39 / 模拟投射 0x42 …)= 加 variant,不破坏旧 skill
>
> interface SkillAnimation {        // presentation,与 gameplay 解耦。原 effect/speed/shake/wave/effectTimes/fireDelay/keepEffect
>   effectSprite: number            // 招式精灵(原 effect,FIRE.MKF);demo 先只填这个,时序 phase3 接战斗动画
> }
>
> interface SkillData {
>   id: string                      // demo = 原版 oid 字符串('296');phase3 换规则编号。**当不透明 string,勿 hardcode 语义/算偏移**
>   name: string
>   desc: string                    // 原版 scriptDesc 是脚本 entry(解析成「我方单人HP+75」)→ 第二阶段直接存文字
>   cost: SkillCost
>   usableOutsideBattle: boolean
>   target: SkillTarget             // 谁(从原 MagicType 拆出的 gameplay 目标)
>   effects: SkillEffect[]          // 做什么(有序;核心。元素属于 damage 效果、不放顶层)
>   animation: SkillAnimation       // 怎么演(presentation)
>   // 扩展口 phase3(注释留形):category/series(议题16 门派分类/体系,技能树 UI)
> }
> ```
>
> ### 当前状态 registry（content20）
>
> `StatusId` 的作者元数据不再由技能、物品、入口和脚本页面各复制一份。content 的
> `ACTOR_STATUS_DEFINITIONS` 是唯一 registry，集中提供中文名、好/坏/死人专用分类、效果说明、可携带性与
> 回合范围；validator、runtime 与 editor 共用。九种状态中只有八种可作为大世界当前状态：混乱、定身、睡眠、
> 沉默、神勇、护体、加速、连击；`puppet` 只适用于倒下角色，明确排除。大世界可携带状态的回合范围为
> 1..999，坏状态已有时不刷新，好状态只取更长回合且不施加给倒下角色。毒继续是独立系统，不进入该 registry。
>
> - **`effects[]` 是核心修正**(回应「太粗糙」):技能 = 有序效果列表(原版 `scriptOnSuccess` opcode 链的 typed 版),不再是单 `baseDamage`。伤害/回血回蓝/复活/加解状态/下解毒/即死/偷取/收宝/召唤/変身 全覆盖 —— 点名的**飞龙探云手(steal)、灵葫咒(collectTreasure+instantKill)、给敌加状态(applyStatus)、解状态(removeStatus)全可表达**(见 §2.1)。
> - **命中/抗性是引擎按「目标」算,不存技能上**:原版 status/poison 命不命中靠**目标的** `resistanceToSorcery`(`RandomLong(0,9) ≥ 抗性`)/ `poisonResistance`,不是技能字段;伤害抗性靠 damage 效果的 `elemental`(0无/1-5风雷水火土/>5毒)× 角色 `elemResistance`。所以 `applyStatus` 只声明「加什么、几回合」,落不落由引擎判。**只有技能自带几率的**(偷取 `rate`)才进 effect。这也回答「怎么算抗性/巫术成功率」:**抗性在目标身上,技能只声明意图**。
> - **target 从原 MagicType 拆出**:原版 `type` 混了「目标」(单/全)和「渲染样式」(attackAll 逐个 / attackWhole 整团 / attackField 全场)。拆:`target` = gameplay 目标;渲染样式归 `animation`;summon/trance 不再是 type,而是 effect kind。
> - **临时增益 vs 永久成长**:自身增益(加速/连击是 `applyStatus`;梦蛇是 `trance`+`buffStat`)都是**战斗内临时** —— `buffStat`(0x30)寿命=整场战斗,故 `duration:'battle'`。而**永久属性提升**(舍利子 +3 防、女娲石 +3 吉运,opcode 0x19)是**道具效果、不是技能**;phase3 若让道具复用本 `effects` 联合,再加 `permanentStatBoost` kind(现无技能用,YAGNI 不加,留此 seam)。
> - **cost**:MP 在原 `Magic.costMP`;酒/蛊/金钱原版 `scriptOnUse` 硬编、不在数据 → 第二阶段 `SkillCost` 显式(数据驱动 > 脚本)。demo 只填 `mp`。
> - **自包含**:存值,不存 `magicNumber`(原版子表下标)。
>
> #### 2.1 worked examples(证明 shape 能表达特殊技能,非全量)
>
> | 技能 | 原版 opcode/字段 | SkillData(节选) |
> |---|---|---|
> | 气疗术(demo) | `0x1B` | `target:'oneAlly', effects:[{kind:'healHp',amount:75}]` |
> | **飞龙探云手** | `0x6A` | `target:'oneEnemy', effects:[{kind:'steal',rate:6}]`(原 baseDamage=−999 哨兵=不伤,纯偷) |
> | **灵葫咒** | `0x33`+`0x60` | `target:'oneEnemy', effects:[{kind:'collectTreasure'},{kind:'instantKill'}]`(两步 = 原两条 opcode) |
> | 回梦(给敌睡眠) | `0x2E` | `target:'oneEnemy', effects:[{kind:'applyStatus',status:'sleep',turns:4}]`(命中引擎按敌 `resistanceToSorcery` 判) |
> | 冰心诀(解状态) | `0x2F` | `target:'oneAlly', effects:[{kind:'removeStatus',statuses:['confused','paralyzed','sleep']}]` |
> | 火神(召唤) | `type=summon` | `target:'allEnemies', effects:[{kind:'summon',godId:0},{kind:'damage',power:…,elemental:4}]` |
> | 仙风云体术(自身增益) | `0x2D`(haste) | `target:'oneAlly', effects:[{kind:'applyStatus',status:'haste',turns:9}]` |
> | 醉仙望月步(自身增益) | `0x2D`(dualAttack) | `target:'oneAlly', effects:[{kind:'applyStatus',status:'dualAttack',turns:5}]` |
> | **梦蛇**(変身+增益) | `type=trance`+`0x30`×2 | `target:'self', effects:[{kind:'trance',sprite:N},{kind:'buffStat',stat:'attack',percent:100,duration:'battle'},{kind:'buffStat',stat:'dexterity',percent:100,duration:'battle'}]`(変身 + 两条增益 = 三效果) |
>
> ### ② learnedSkills(习得关系表,WorldState 跟存档)
>
> ```ts
> // 人物 ↔ 技能(谁会哪些)。独立关系表,**不内嵌进 CharacterInstance** —— 解耦 + MMO 玩家私有留口。
> WorldState.learnedSkills: Record<string, string[]>   // characterInstanceId → skillId[]
> ```
>
> - 原版对应 `player-roles.magic`。**`CharacterInstance.magic` 字段移除,迁到这张表。**
> - 演进口(议题17 熟练度/重数):`string[]` → `{ skillId: string; proficiency: number }[]` 是平滑加字段,不推翻。
>
> ### ③ levelUpSkills(习得规则,content 静态)
>
> ```ts
> interface LevelUpSkill { level: number; skillId: string }
> // 角色模板 → 升级习得表(原版 level-up-magic.json:角色升到 level 自动学 skill)
> LEVEL_UP_SKILLS: Record<string, LevelUpSkill[]>      // characterTemplateId → LevelUpSkill[]
> ```
>
> - 原版 `level-up-magic.json` = `ln[20 行][5 角色]`(sdlpal `lprgln[j].m[role]`)。**某角色习得 = 取该角色那一【列】、遍历所有行**(⚠ 不是取某一行!按行读会把 5 个角色的技能混在一起)。我们转置成 `charTemplateId → LevelUpSkill[]`。
> - 用途:升级时按表把新 skillId 加进 ② `learnedSkills`(现 demo 不做升级逻辑,只定 schema + 填李逍遥表)。
> - phase3 议题 16(灵活加点/技能树/门派限定)= 在这张**固定习得表之上**加玩家选择,不改本表结构。
>
> ## 3. 数据来源
>
> - **现在 demo**:content 硬编 —— `DEMO_SKILLS`(李逍遥用的几个仙术,oid id + 查得的 name/costMP)+ 李逍遥 `learnedSkills` + `levelUpSkills`(从 `level-up-magic.json` 抄李逍遥那条)。
> - **phase3 / 工程化**:migrate 把 `object-magics`/`magic.json`/`words`/`level-up-magic` 全量转 content(`oid → 规则 id` 映射在此)。现不做。
>
> ## 4. 边界(现在定 vs 留后)
>
> - ✅ **现在**:三层 schema 形状(含 `effects[]` 全形)+ 李逍遥 demo 数据 + 几个特殊技能样例(§2.1)验证 shape;`CharacterInstance.magic` 迁到 `learnedSkills`。仙术菜单查 ①②。
> - ⏸ **phase3**:**跑 effects 的战斗引擎**(命中/抗性/伤害计算 —— 第二阶段不重做战斗系统,只先把数据 shape 定全)、议题 16(门派分类 category/series / 灵活加点 / 技能树)、议题 17(熟练度/重数 → ② 扩字段)、migrate 全量 102 技能、升级自动习得逻辑。
>
> ## 5. 仙术菜单怎么用本架构
>
> `learnedSkills[李逍遥实例 id]` → `skillId[]` → 查 `DEMO_SKILLS` 拿 `SkillData` → 网格显示(name)+ MP box(`cost.mp`)+ 描述区(`desc`)。`usableOutsideBattle` 过滤大世界可用。
>
> ## 6. Self-Review
>
> 1. **三层覆盖**:定义①/关系②/习得规则③,原版数据源齐。✅
> 1b. **效果表达力**:`effects[]` = 原版 scriptOnSuccess opcode 链的 typed 版,飞龙探云手/灵葫咒/加敌状态/解状态/下解毒/即死/召唤全可表达(§2.1 逐一验);命中/抗性归引擎(目标身上),不污染技能数据。✅
> 2. **现在 vs phase3 分清**:形状现在定(长期稳定)、内容/灵活加点 phase3,理由(需求未定 vs 原版已有)写明。✅
> 3. **稳定 id / MMO 口**:id 不透明 string(可换编号);learnedSkills 独立表(玩家私有留口);熟练度平滑演进。✅
> 4. **不内嵌**:技能关系独立表,人物 schema 不胖、解耦。✅
> 5. **务实**:demo 硬编(oid 反查),migrate 全量留后 —— 不为 demo 上全套迁移管线。✅
<!-- original-source-quote:end -->
