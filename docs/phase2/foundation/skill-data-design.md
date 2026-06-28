# 技能数据架构设计(skill data)

> 状态:设计(2026-06-28)。技能(仙术 / 武技 / 辅助…)的数据地基 —— 仙术菜单、战斗、phase3 技能系统都长在它上。
> 依据:roadmap §3(稳定 id / schema 留 MMO 口)、[D18](../decisions.md)、议题 [16/17](../../phase3/future-gameplay-and-mmo-backlog.md)。

## 1. 范围

技能数据分**三层**,原版三层都有数据 —— 本设计定**三层 schema 形状**(现在该定对、长期稳定),demo 填李逍遥仙术验证;**完整内容 + 灵活加点/技能树(议题16)/熟练度(议题17)/特殊效果引擎留 phase3**(在本架构上扩,不推翻)。

| 层 | 是什么 | 原版数据源 |
|---|---|---|
| ① 技能定义 `SkillData` | 技能本身(名/MP/效果/动画…) | `object-magics` + `magic.json` + `words` |
| ② 习得关系 `learnedSkills` | 谁当前会哪些技能 | `player-roles` 的 magic 数组 |
| ③ 习得规则 `levelUpSkills` | 谁升到几级学什么 | `level-up-magic.json` |

## 2. 三层 schema

### ① SkillData(技能定义,content 静态)

```ts
interface SkillCost {             // 消耗。原版 MP 在 Magic.costMP;酒/蛊/金钱在 scriptOnUse 脚本硬编 → 第二阶段提到 schema(数据驱动 > 硬编)
  mp?: number
  stamina?: number                // 体力(合体技)
  money?: number                  // 乾坤一掷耗金钱
  items?: { itemId: string; amount: number }[]  // 酒神耗酒 / 巫术耗蛊(依赖 item 系统)
}
interface SkillData {
  id: string                      // demo = 原版 oid 字符串('296');phase3 换规则编号。**当不透明 string,勿 hardcode 语义/算偏移**
  name: string
  desc: string                    // 描述。原版 scriptDesc 是脚本 entry(getScriptDescLines 解析成「我方单人HP+75」);第二阶段 clean rewrite 直接存文字
  cost: SkillCost                 // 消耗(见上)
  usableOutsideBattle: boolean
  targets: 'one' | 'all'          // 作用人数(原版 Spell.flags.applyToAll)
  // —— 以下议题16 扩展口,现 demo 不填(留形状,phase3 填) ——
  // category?: string            // 类型:剑法/刀法/仙术/符术…
  // series?: string              // 体系:御剑术→万剑诀→天剑→剑神 一脉
  // elemental?/damage?/heal?/effects?  // 五行/伤害/恢复/特殊效果(挂标签相性=议题7)
  // animId?: string              // 招式动画(原版 Magic.effect 特效精灵)
}
```

- **核心字段**(原版就有、菜单/战斗就用):id / name / **desc** / **cost** / usableOutsideBattle / targets。
  - `desc`:原版 `Spell.scriptDesc`(脚本 entry,`getScriptDescLines` 解析文字);第二阶段直接存文字,不跑脚本。
  - `cost`:原版 MP 在 `Magic.costMP`;**酒/蛊/金钱原版是 `scriptOnUse` 脚本硬编、不在数据** → 第二阶段提到 `SkillCost`(显式、数据驱动)。demo 仙术只填 `mp`,`items`(消耗品)依赖 item 系统、留后。
- **扩展口**(议题16 类型/体系/效果引擎)以注释留形状,phase3 填(同 §9 角色 schema)。
- **自包含**:存值,不存 `magicNumber`(原版子表下标)。

### ② learnedSkills(习得关系表,WorldState 跟存档)

```ts
// 人物 ↔ 技能(谁会哪些)。独立关系表,**不内嵌进 CharacterInstance** —— 解耦 + MMO 玩家私有留口。
WorldState.learnedSkills: Record<string, string[]>   // characterInstanceId → skillId[]
```

- 原版对应 `player-roles.magic`。**`CharacterInstance.magic` 字段移除,迁到这张表。**
- 演进口(议题17 熟练度/重数):`string[]` → `{ skillId: string; proficiency: number }[]` 是平滑加字段,不推翻。

### ③ levelUpSkills(习得规则,content 静态)

```ts
interface LevelUpSkill { level: number; skillId: string }
// 角色模板 → 升级习得表(原版 level-up-magic.json:角色升到 level 自动学 skill)
LEVEL_UP_SKILLS: Record<string, LevelUpSkill[]>      // characterTemplateId → LevelUpSkill[]
```

- 原版 `level-up-magic.json`(list[20],每角色 `[{level, magicOid}]`)。
- 用途:升级时按表把新 skillId 加进 ② `learnedSkills`(现 demo 不做升级逻辑,只定 schema + 填李逍遥表)。
- phase3 议题 16(灵活加点/技能树/门派限定)= 在这张**固定习得表之上**加玩家选择,不改本表结构。

## 3. 数据来源

- **现在 demo**:content 硬编 —— `DEMO_SKILLS`(李逍遥用的几个仙术,oid id + 查得的 name/costMP)+ 李逍遥 `learnedSkills` + `levelUpSkills`(从 `level-up-magic.json` 抄李逍遥那条)。
- **phase3 / 工程化**:migrate 把 `object-magics`/`magic.json`/`words`/`level-up-magic` 全量转 content(`oid → 规则 id` 映射在此)。现不做。

## 4. 边界(现在定 vs 留后)

- ✅ **现在**:三层 schema 形状 + 李逍遥 demo 数据;`CharacterInstance.magic` 迁到 `learnedSkills`。仙术菜单查 ①②。
- ⏸ **phase3**:议题 16(灵活加点/技能树/门派)、议题 17(熟练度/重数 → ② 扩字段)、SkillData 扩展字段(category/series/effects/伤害/动画)、特殊效果 + 伤害计算引擎、migrate 全量、升级自动习得逻辑。

## 5. 仙术菜单怎么用本架构

`learnedSkills[李逍遥实例 id]` → `skillId[]` → 查 `DEMO_SKILLS` 拿 `SkillData` → 网格显示(name)+ MP box(`cost.mp`)+ 描述区(`desc`)。`usableOutsideBattle` 过滤大世界可用。

## 6. Self-Review

1. **三层覆盖**:定义①/关系②/习得规则③,原版数据源齐。✅
2. **现在 vs phase3 分清**:形状现在定(长期稳定)、内容/灵活加点 phase3,理由(需求未定 vs 原版已有)写明。✅
3. **稳定 id / MMO 口**:id 不透明 string(可换编号);learnedSkills 独立表(玩家私有留口);熟练度平滑演进。✅
4. **不内嵌**:技能关系独立表,人物 schema 不胖、解耦。✅
5. **务实**:demo 硬编(oid 反查),migrate 全量留后 —— 不为 demo 上全套迁移管线。✅
