# M1 · 数据表批量迁移器 实现计划

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: plan-status-v1 / 1.0.0

本页把历史实施计划接入 `plan-status-v1`，并追加 `archive-record-v1` 历史 overlay。原计划的日期、checkbox、执行分工、数字、结果词、未知和链接均在 quote 中保全；本页不授予当前待办、runtime、E2E、视觉或 coverage 信用。

## 目标与时间范围

- 历史目标：M1 数据表批量迁移器：按普查数字拆 M1a 表格、M1b 物品/装备、M1c 技能脚本译码；记录 103 技能 57/18/28 分布、pending 概率/阈值门，设浏览器/迁移 gate。
- 原始时间范围：2026-07-02；固定 source revision `45d890e4ce3862aeac9c54eef2d7d18a32032cee`，source SHA `4d6091e341b811228d040f05ce54e6b6b9751630b342cbee39910928a9387b3b`。
- 当前时间状态：历史归档；本页只说明当时计划的目的和边界，不续写执行期限。

## 里程碑

- 原始章节/里程碑：0. 投查关键结论(决定分期的数字)；1. 拍板；2. 分期；3. M1a 验收 gate。
- 计划步骤、Task 编号、分工和 checkbox 的原始含义均保留在下方 quote；它们不构成今天的 build 准入。
- 本次治理里程碑：完成具体语义分栏、历史 overlay、源/after SHA 和继任入口登记。

## 当前状态

- 当前文档状态：`historical` / `archive`；正文状态信号：3:> **历史设计/计划**：本页保存当时的接口、分工和实施步骤，不作为今天的待办或准入。；4:> 当前能力见 [能力地图](../../capability-map.md)，实际工作从 [看板](../../../ops/archive/board-history/board-20261004.md) 进入。；7:> 执行:Claude(延续 C0 直做模式)。状态:M1a 实施中。；15:- **opcode 语义金矿**:别从 script.c 重考证——`battle-opcodes.ts`(全战斗词汇+sdlpal 行号)/ `magic-script.ts`(场外技能实测)/ `equip-effect.ts`(装备 5-opcode)三处**已做对过三遍**,迁移器要的是它们的"静态表亲"(链入 → effects[] 出,非状态突变)。
- 历史结论：M1 · 数据表批量迁移器 实现计划：这是 plan-status，当前文档状态为 historical。全文 44 行、5 个标题；摘要/首段为「> **历史设计/计划**：本页保存当时的接口、分工和实施步骤，不作为今天的待办或准入。」。属于历史/归档材料，不能单独证明当前实现。
- 当前能力、实现结果和任务排序必须从继任规范、代码、看板/任务卡和新的独立证据读取。

## 阻塞与决策

- 历史冲突/未决：
- 数字取自当时 M1c 输入，pending 门类明确未完成；不能据此宣称全量 migration。
- 脚本 effects 表达力、summon/onUse/概率门和 current migration pipeline 需另核。
- 停止线：不得把历史计划、checkbox、Self-Review、done/待审标签或浏览器验收步骤提升为 current contract、runtime/E2E/visual/coverage 证据；数字取自当时 M1c 输入，pending 门类明确未完成；不能据此宣称全量 migration。
- 旧计划中的 done/open/待审/浏览器验收词只保留为日期化证据，不能改写为 current。

## 下一步

- 继任入口：当前 packages/migrate README/code；phase1 source audits；docs/phase2/READ-FIRST.md。
- 若需重新执行：先建立新的 task card，核对当前 primary source、合法输入、版本范围、business oracle、可证伪观察和独立验收；不得直接沿用本页步骤。
- 本次迁移完成后仍需候选独立接收；全量 1838 目标保持 active/build。

## 历史范围

- 原始范围：phase2 archive plan；日期/版本：2026-07-02；固定来源 `45d890e4ce3862aeac9c54eef2d7d18a32032cee`，原文 43 行 / 5717 bytes。
- 归档原因：计划包含当时的执行分工、接口、checkbox 和验收步骤，当前合同已经由后继规范/代码承接。

## 原始结论

- M1 · 数据表批量迁移器 实现计划：这是 plan-status，当前文档状态为 historical。全文 44 行、5 个标题；摘要/首段为「> **历史设计/计划**：本页保存当时的接口、分工和实施步骤，不作为今天的待办或准入。」。属于历史/归档材料，不能单独证明当前实现。
- 保留原始结论的历史适用范围；新增章节不把计划结果提升为当前实现。

## 当时证据

- source revision `45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA `4d6091e341b811228d040f05ce54e6b6b9751630b342cbee39910928a9387b3b`；标题锚点：1:M1 · 数据表批量迁移器 实现计划, 9:0. 投查关键结论(决定分期的数字), 19:1. 拍板, 30:2. 分期, 38:3. M1a 验收 gate。
- 原始链接、代码、表格、checkbox 与状态词在下方逐行 quote 保留；本轮未运行计划中的 runtime/E2E/视觉/coverage。

## 当前有效性

historical。当前不把计划步骤、Self-Review、done/open 标签、浏览器 gate 或历史数字视为现行契约或执行证据。
- 当前不得外推：不得把历史计划、checkbox、Self-Review、done/待审标签或浏览器验收步骤提升为 current contract、runtime/E2E/visual/coverage 证据；数字取自当时 M1c 输入，pending 门类明确未完成；不能据此宣称全量 migration。

## 继任文档

- current canonical / 复核入口：当前 packages/migrate README/code；phase1 source audits；docs/phase2/READ-FIRST.md。
- supersedes / superseded-by：本页替换旧的 governed-legacy 结构展示，但不替换原始历史语义；当前事实由继任规范/代码和独立 review 决定。
- 重新启用条件：新的源版本、适用范围、合法输入、oracle、可证伪观察和独立接收。

## 原文保全

固定源 SHA `4d6091e341b811228d040f05ce54e6b6b9751630b342cbee39910928a9387b3b`；以下只增加 quote 前缀，逆回读必须得到相同 UTF-8 字节。
<!-- original-source-quote:start -->
> # M1 · 数据表批量迁移器 实现计划
>
> > **历史设计/计划**：本页保存当时的接口、分工和实施步骤，不作为今天的待办或准入。
> > 当前能力见 [能力地图](../../capability-map.md)，实际工作从 [看板](../../../ops/archive/board-history/board-20261004.md) 进入。
>
> > 依据 [roadmap §8 硬验收](../../roadmap.md)(M1 = 迁移器首战:数据表全量)+ 2026-07-02 投查(全量核过 spells/items/player-roles 源数据与三处运行时 opcode 语义)。
> > 执行:Claude(延续 C0 直做模式)。状态:M1a 实施中。
>
> ## 0. 投查关键结论(决定分期的数字)
>
> - **目标契约已活**:`assembleProject` + `validate*` 就是验收器;`projects/demo/content/*.json` 是小规模样板。M1 = 把同一套文件从 2 角色/9 物品/3 技能长到 **6/234/103**。
> - **技能 103 个的难度分布(M1c 跑完实测,逐条核过 spells.json + magic.json)**:**纯表 57 个**(scriptOnSuccess=0 且 scriptOnUse=0 且非 summon,伤害/目标全从 magic.json 推)· **线性脚本可译 18 个**(heal/revive/status/poison/steal/trance/buff 等封闭 opcode)· **pending 28 个**(summon 9 + scriptOnUse 动态公式 14 + 概率/阈值门类 5)。投查时(M1a 前)曾估「64 纯表 + 12 onUse + 27 onSuccess」,M1c 用解析器取代了部分纯表后实测为 57;**以此实测为准**。门类 5 个(回梦/鬼降/夺魂/灵葫咒/灵血咒)线性 effects[] 表达不了(概率门 0x6/HP 阈值门 0x64/goto 循环),连设计文档的灵葫咒示例都默默丢了两道门 → M1c-2/战斗期。
> - **物品 234**:表字段全直取;**106 件装备效果 = 封闭 6-opcode 集**(equip-effect.ts 已全考证,机械翻译);**100 件使用效果最难**——现 `ItemUseEffect` 缺 ~8 个 kind(giveItems/giveMoney/learnSkill/scenePlace/transform/levelUp/craft/permanentStatBoost),**schema 扩展是前置**。
> - **描述文本**:scriptDesc → all.json 的 `L_<ip>` 标签起 walk 连续 `showDialog` 收 `.text`(M.MSG 已内联)。物品 desc=string\[](逐行),技能 desc=string(join)——形状不对称要显式处理。
> - **opcode 语义金矿**:别从 script.c 重考证——`battle-opcodes.ts`(全战斗词汇+sdlpal 行号)/ `magic-script.ts`(场外技能实测)/ `equip-effect.ts`(装备 5-opcode)三处**已做对过三遍**,迁移器要的是它们的"静态表亲"(链入 → effects[] 出,非状态突变)。
> - **两个真雷(已核实)**:① `player-roles.ts:130` 的装备槽注释**是错的**——真序 = `[head, cloak, body, weapon, feet, accessory]`(role0 `[196,225,208,166,235,249]` 对 demo 已核物品名逐位验证);② `walkFrames:0` 语义 = 默认 3,非字面 0。roleId 3/4 名字对调 parser 已修,勿再从 words.json 天真重取。
> - `level-up-magic.json` **列主序**(某角色=一列)且仅 5 列对 6 角色;李逍遥列可拿 demo 已核 9 条当 oracle。
>
> ## 1. 拍板
>
> | 决策 | 选择 | 理由 |
> |---|---|---|
> | **输出目标** | **新工程 `projects/pal/`**(复刻载体),demo 保持小样板不动 | M 阶梯(M2 三百场景/M4 通关)的容器就是它;demo 的"验证"定位不被 234 物品淹没。可启动性:manifest+guijie 场景+assets 从 demo 复制种入 |
> | 迁移器落点 | `packages/migrate`(唯一被允许碰一阶段产物的二阶段包):`src/` 纯函数核(vitest)+ `scripts/migrate-content.mts`(tsx IO 壳),照 bake-assets 惯例 | README 本就写着"B. 数据迁移" |
> | 幂等性 | 纯函数核 + 全量重写输出文件(可重复跑) | 迁移器 = 可再生管线,非一次性脚本 |
> | 曲线/表 | `leveling.expTable` 各 battler 各带一份(6 份重复,schema 即此形) | 简单直给;将来嫌重再提共享表 |
> | 已核数据优先 | demo 手作三技能(296/298/299)以 **curated 覆盖表**(带出处注释)并入,不让迁移器"重新发明"已验证真值 | M1c 逐步取代 curated |
> | 分支技能的表达 | M1c 时**小幅扩 schema**:效果级 `chance?: number` + 技能级门(HP 阈值);表达不了的按仓规「有损须注释+回归钉住」 | 投查证明线性模型有真缺口,躲不掉 |
>
> ## 2. 分期
>
> - **M1a · 表格域(无脚本解析)**←当前:6 角色(含 expTable/levelUp/battleSpriteNum/portrait)+ 6 精灵表 + locale(demo 底座 + 5 新名)+ 234 物品表字段(equip/use 留空)+ **57 纯伤害技能**(M1c 后实测;投查时估 64,解析器取代部分纯表后为 57)+ curated 三技能 + 全量 desc(showDialog-walk,含护栏:链中出现非 showDialog/end → 记入待手修清单)。产出 `projects/pal/` 可启动(场景/assets 种自 demo)。
> - **M1b · 装备效果**:106 件 scriptOnEquip → `EquipSpec.effects[]`(6-opcode 封闭集,语义抄 equip-effect.ts)。
> - **M1c · 技能脚本**:12 scriptOnUse(6 脚本体)+ 27 scriptOnSuccess(先 ~10 简单单 op,后 ~8-12 分支类;前置:effects 门字段小扩)。
> - **M1d · 物品使用效果**(最难,schema 扩展前置):healHp/healMp 批量 + 叙事类逐件手修。
> - 不在 M1:敌人表(战斗期)、throw 效果、636 精灵全量标注(C1 编辑器)。
>
> ## 3. M1a 验收 gate
>
> 1. migrate 单测绿,含 **golden oracle**:`mapActor(role0)` 的 battler 与 demo 手作 li-xiaoyao 深等(**装备槽雷的自动哨兵**);levelUp 李逍遥列 = demo 已核 9 条;观音符 desc = `['以观音圣水书写的灵符。','HP+150']`;木剑 166 = {买50/卖25/icon56};纯伤害技能数 === 57(M1c 实测,非投查时的 64)。
> 2. `pnpm check` 全绿(pal 工程 assemble 级测试:load 不 throw + 抽查值)。
> 3. **浏览器**:`VITE_PROJECT_ID=pal` 启动,进场/状态板(显 base 值,装备加成待 M1b——已知且注明)/仙术菜单(curated 三技能可见)/物品菜单正常,0 报错。
> 4. 顺手修 `player-roles.ts:130` 错误注释(phase-1 包,仅注释)。
<!-- original-source-quote:end -->
