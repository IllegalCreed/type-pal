# M1 · 数据表批量迁移器 实现计划

> 依据 [roadmap §8 硬验收](../roadmap.md)(M1 = 迁移器首战:数据表全量)+ 2026-07-02 投查(全量核过 spells/items/player-roles 源数据与三处运行时 opcode 语义)。
> 执行:Claude(延续 C0 直做模式)。状态:M1a 实施中。

## 0. 投查关键结论(决定分期的数字)

- **目标契约已活**:`assembleProject` + `validate*` 就是验收器;`projects/demo/content/*.json` 是小规模样板。M1 = 把同一套文件从 2 角色/9 物品/3 技能长到 **6/234/103**。
- **技能 103 个的难度分布(逐条核过 spells.json)**:**64 个纯表驱动**(scriptOnSuccess=0 且 scriptOnUse=0,伤害/目标全从 magic.json 推)· 12 个 scriptOnUse(仅 ~6 个不同脚本体,多技能共用)· 27 个 scriptOnSuccess(其中 ~10 个单 op 简单,**~8-12 个真分支**——概率门/HP 阈值门/敌回合分派,线性 effects[] 表达不了,连设计文档的灵葫咒示例都默默丢了两道门)。
- **物品 234**:表字段全直取;**106 件装备效果 = 封闭 6-opcode 集**(equip-effect.ts 已全考证,机械翻译);**100 件使用效果最难**——现 `ItemUseEffect` 缺 ~8 个 kind(giveItems/giveMoney/learnSkill/scenePlace/transform/levelUp/craft/permanentStatBoost),**schema 扩展是前置**。
- **描述文本**:scriptDesc → all.json 的 `L_<ip>` 标签起 walk 连续 `showDialog` 收 `.text`(M.MSG 已内联)。物品 desc=string[](逐行),技能 desc=string(join)——形状不对称要显式处理。
- **opcode 语义金矿**:别从 script.c 重考证——`battle-opcodes.ts`(全战斗词汇+sdlpal 行号)/ `magic-script.ts`(场外技能实测)/ `equip-effect.ts`(装备 5-opcode)三处**已做对过三遍**,迁移器要的是它们的"静态表亲"(链入 → effects[] 出,非状态突变)。
- **两个真雷(已核实)**:① `player-roles.ts:130` 的装备槽注释**是错的**——真序 = `[head, cloak, body, weapon, feet, accessory]`(role0 `[196,225,208,166,235,249]` 对 demo 已核物品名逐位验证);② `walkFrames:0` 语义 = 默认 3,非字面 0。roleId 3/4 名字对调 parser 已修,勿再从 words.json 天真重取。
- `level-up-magic.json` **列主序**(某角色=一列)且仅 5 列对 6 角色;李逍遥列可拿 demo 已核 9 条当 oracle。

## 1. 拍板

| 决策 | 选择 | 理由 |
|---|---|---|
| **输出目标** | **新工程 `projects/pal/`**(复刻载体),demo 保持小样板不动 | M 阶梯(M2 三百场景/M4 通关)的容器就是它;demo 的"验证"定位不被 234 物品淹没。可启动性:manifest+guijie 场景+assets 从 demo 复制种入 |
| 迁移器落点 | `packages/migrate`(唯一被允许碰一阶段产物的二阶段包):`src/` 纯函数核(vitest)+ `scripts/migrate-content.mts`(tsx IO 壳),照 bake-assets 惯例 | README 本就写着"B. 数据迁移" |
| 幂等性 | 纯函数核 + 全量重写输出文件(可重复跑) | 迁移器 = 可再生管线,非一次性脚本 |
| 曲线/表 | `leveling.expTable` 各 battler 各带一份(6 份重复,schema 即此形) | 简单直给;将来嫌重再提共享表 |
| 已核数据优先 | demo 手作三技能(296/298/299)以 **curated 覆盖表**(带出处注释)并入,不让迁移器"重新发明"已验证真值 | M1c 逐步取代 curated |
| 分支技能的表达 | M1c 时**小幅扩 schema**:效果级 `chance?: number` + 技能级门(HP 阈值);表达不了的按仓规「有损须注释+回归钉住」 | 投查证明线性模型有真缺口,躲不掉 |

## 2. 分期

- **M1a · 表格域(无脚本解析)**←当前:6 角色(含 expTable/levelUp/battleSpriteNum/portrait)+ 6 精灵表 + locale(demo 底座 + 5 新名)+ 234 物品表字段(equip/use 留空)+ **64 纯伤害技能** + curated 三技能 + 全量 desc(showDialog-walk,含护栏:链中出现非 showDialog/end → 记入待手修清单)。产出 `projects/pal/` 可启动(场景/assets 种自 demo)。
- **M1b · 装备效果**:106 件 scriptOnEquip → `EquipSpec.effects[]`(6-opcode 封闭集,语义抄 equip-effect.ts)。
- **M1c · 技能脚本**:12 scriptOnUse(6 脚本体)+ 27 scriptOnSuccess(先 ~10 简单单 op,后 ~8-12 分支类;前置:effects 门字段小扩)。
- **M1d · 物品使用效果**(最难,schema 扩展前置):healHp/healMp 批量 + 叙事类逐件手修。
- 不在 M1:敌人表(战斗期)、throw 效果、636 精灵全量标注(C1 编辑器)。

## 3. M1a 验收 gate

1. migrate 单测绿,含 **golden oracle**:`mapActor(role0)` 的 battler 与 demo 手作 li-xiaoyao 深等(**装备槽雷的自动哨兵**);levelUp 李逍遥列 = demo 已核 9 条;观音符 desc = `['以观音圣水书写的灵符。','HP+150']`;木剑 166 = {买50/卖25/icon56};纯伤害技能数 === 64。
2. `pnpm check` 全绿(pal 工程 assemble 级测试:load 不 throw + 抽查值)。
3. **浏览器**:`VITE_PROJECT_ID=pal` 启动,进场/状态板(显 base 值,装备加成待 M1b——已知且注明)/仙术菜单(curated 三技能可见)/物品菜单正常,0 报错。
4. 顺手修 `player-roles.ts:130` 错误注释(phase-1 包,仅注释)。
