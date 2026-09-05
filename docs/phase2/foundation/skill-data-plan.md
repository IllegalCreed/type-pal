> **历史文档（2026-09-06 标注）**：本文是已完成的 TDD 计划/设计存档，正文中的执行
> 指令、Agent 分工与“当前状态”是当时快照，不是现行待办。实现结果以 capability-map 与
> 对应任务卡为准。

# 技能数据地基 实现计划

> **For agentic workers:** 交 GLM 执行,Claude 审 + 深验。第二阶段 Reforge,先读 [READ-FIRST](../READ-FIRST.md)。
> 依据设计:[skill-data-design.md](skill-data-design.md)(三层 schema,**先读**)。本计划只做**地基数据**,不碰仙术菜单 UI(那是下一份计划)。

**Goal:** 在 `@type-pal/content` 落地技能数据三层地基 —— ① `SkillData`(含 `effects[]` 全形)+ demo 技能、② `learnedSkills` 关系表(替 `CharacterInstance.magic`)、③ `levelUpSkills`(李逍遥真实等级表),让后续仙术菜单查得到数据。

**Architecture:** 纯 content 数据 + 类型,**零引擎/reforge 依赖**。`SkillEffect` 是判别联合(discriminated union),**现在就定全形状**(demo 只用到 `healHp`,但联合一次定全)。`learnedSkills` 是 `WorldState` 上的独立关系表(`Record<charInstanceId, skillId[]>`),取代内嵌的 `CharacterInstance.magic`。`levelUpSkills` 是 content 静态常量,值来自原版 `level-up-magic.json`。

**Tech Stack:** TypeScript;vitest;包 `@type-pal/content`。

## Global Constraints

- **阶段隔离(D18):** 技能数据只在 `@type-pal/content`,不 import reforge/引擎;reforge 将来把 `id` 当**不透明 string**(不 hardcode oid 语义、不靠它算数组偏移)。
- **杜绝下标式身份:** 用 `Record<id, …>` / 带 `id` 字段的对象,**不**用数组下标当身份;`id` = 原版 oid 字符串(demo;phase3 换规则编号)。
- **真值锚(不许改成猜测值):** `DEMO_SKILLS` / `LEVEL_UP_SKILLS` 的每个值都已核验自原版数据(`spells.json._name` / `magic.json` / `level-up-magic.json`),见各 Task 注。
- **每 Task 收尾:** `pnpm --filter @type-pal/content run check`(typecheck + test)全绿;`pnpm --filter @type-pal/content exec biome check src/` **0 error / 0 warning**。
- **自包含:** `SkillData` 存值,**不**存原版 `magicNumber`(子表下标)。

---

## Task 1: SkillData 类型 + SkillEffect 联合 + DEMO_SKILLS

**Files:**
- Create: `packages/content/src/skill.ts`
- Modify: `packages/content/src/index.ts:154`(追加 re-export)
- Test: `packages/content/src/skill.test.ts`

**Interfaces:**
- Produces: `SkillCost`, `SkillTarget`, `StatusId`, `SkillEffect`, `SkillAnimation`, `SkillData`, `DEMO_SKILLS`(供 Task 3 与后续仙术菜单消费)。

- [ ] **Step 1: 写失败测试** —— `packages/content/src/skill.test.ts`

```ts
import { describe, expect, test } from 'vitest'
import { DEMO_SKILLS } from './skill.js'

describe('SkillData 技能定义', () => {
  test('气疗术(296)字段正确', () => {
    const s = DEMO_SKILLS['296']
    expect(s?.name).toBe('气疗术')
    expect(s?.cost.mp).toBe(6)
    expect(s?.usableOutsideBattle).toBe(true)
    expect(s?.target).toBe('oneAlly')
    expect(s?.effects).toEqual([{ kind: 'healHp', amount: 75 }])
    expect(s?.animation.effectSprite).toBe(27)
  })
  test('三个 demo 技能全是 outdoor 治疗(供大世界菜单)', () => {
    const ids = Object.keys(DEMO_SKILLS)
    expect(ids).toEqual(['296', '298', '299'])
    for (const id of ids) {
      const s = DEMO_SKILLS[id]
      expect(s?.usableOutsideBattle).toBe(true)
      expect(s?.effects[0]?.kind).toBe('healHp')
    }
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @type-pal/content exec vitest run src/skill.test.ts`
Expected: FAIL（`Cannot find module './skill.js'`）

- [ ] **Step 3: 写 `packages/content/src/skill.ts`**

```ts
// 技能数据 ① 层:技能定义。见 docs/phase2/foundation/skill-data-design.md。
// 阶段隔离(D18):纯 content 数据 + 类型,无 reforge/引擎依赖。

/** 消耗。原版 MP 在 magic.costMP;酒/蛊/金钱原版 scriptOnUse 脚本硬编 → 这里显式数据化。 */
export interface SkillCost {
  mp?: number
  stamina?: number // 体力(合体技)
  money?: number // 乾坤一掷耗金钱
  items?: { itemId: string; amount: number }[] // 酒神耗酒 / 巫术耗蛊(依赖 item 系统)
}

/** 作用目标(谁)。从原版 MagicType 拆出的 gameplay 维度(渲染样式归 animation)。 */
export type SkillTarget = 'oneEnemy' | 'allEnemies' | 'oneAlly' | 'allAllies' | 'self'

/** 状态 id(原版 9 种;毒是独立系统 → applyPoison/curePoison)。 */
export type StatusId =
  | 'confused' // 混乱
  | 'paralyzed' // 定身
  | 'sleep' // 睡眠
  | 'silence' // 沉默
  | 'puppet' // 傀儡
  | 'bravery' // 狂暴/神勇
  | 'protect' // 护体
  | 'haste' // 加速
  | 'dualAttack' // 连击/双攻

/** 技能效果 = clean-rewrite 版的原版 scriptOnSuccess opcode 链。每个 variant ≈ 一条效果 opcode。 */
export type SkillEffect =
  | { kind: 'damage'; power: number; elemental: number } // 伤害;elemental 0无/1-5风雷水火土/>5毒,抗性=此×角色 elemResistance
  | { kind: 'healHp'; amount: number } // 0x1B 回 HP
  | { kind: 'healMp'; amount: number } // 0x1C 回 MP
  | { kind: 'revive'; hpPercent: number } // 0x22 复活(回 max×%)
  | { kind: 'applyStatus'; status: StatusId; turns: number } // 0x2D/0x2E(命中由引擎按目标抗性判)
  | { kind: 'removeStatus'; statuses: StatusId[] } // 0x2F 解状态
  | { kind: 'applyPoison'; poisonId: string } // 0x28/0x29 下毒/下蛊
  | { kind: 'curePoison'; maxLevel?: number; poisonId?: string } // 0x2A-0x2C 解毒
  | {
      kind: 'buffStat'
      stat: 'attack' | 'defense' | 'magic' | 'dexterity'
      percent: number
      duration: 'battle' | number // 0x30 临时%增益;寿命=整场战斗 → 'battle'
    }
  | { kind: 'instantKill' } // 0x60 即死(灵葫咒)
  | { kind: 'steal'; rate: number } // 0x6A 偷金钱/道具(飞龙探云手)
  | { kind: 'collectTreasure' } // 0x33 收集敌方宝物(灵葫咒二次)
  | { kind: 'summon'; godId: number } // type=summon 召唤
  | { kind: 'trance'; sprite: number } // type=trance 変身:换战斗精灵(梦蛇);属性提升另走 buffStat

/** 招式动画(presentation,与 gameplay 解耦)。 */
export interface SkillAnimation {
  effectSprite: number // 原 magic.effect(FIRE.MKF 招式精灵)
}

/** 技能定义。自包含:存值,不存原版 magicNumber 子表下标。 */
export interface SkillData {
  id: string // demo = 原版 oid 字符串;当不透明 string(勿 hardcode 语义/算偏移)
  name: string
  desc: string // 原版 scriptDesc(脚本)→ 第二阶段直接存文字
  cost: SkillCost
  usableOutsideBattle: boolean
  target: SkillTarget
  effects: SkillEffect[] // 做什么(有序;核心)。元素属于 damage 效果,不放顶层
  animation: SkillAnimation
  // 扩展口 phase3(注释留形):category/series(议题16 门派分类/体系,技能树 UI)
}

/**
 * demo 技能 —— 李逍遥大世界仙术菜单用的 3 个 outdoor 治疗。
 * 真值核验:name = spells.json._name;costMP/effect = magic.json[spells.json[oid].magicNumber];
 *           usableOutsideBattle = spells.json[oid].flags.usableOutsideBattle;target = magic.type(applyToPlayer→oneAlly)。
 *   oid 296 气疗术  magic#33 type=applyToPlayer costMP=6  effect=27 baseDamage=0
 *   oid 298 凝神归元 magic#34 type=applyToPlayer costMP=18 effect=29 baseDamage=0
 *   oid 299 元灵归心术 magic#51 type=applyToPlayer costMP=40 effect=29 baseDamage=0
 * desc/healHp.amount = 原版 scriptDesc 显示值(docs/phase1/status/magic-status.md);demo 不跑战斗引擎,phase3 验算。
 * 完整 102 技能 migrate 全量 → phase3。
 */
export const DEMO_SKILLS: Record<string, SkillData> = {
  '296': {
    id: '296',
    name: '气疗术',
    desc: '我方单人HP+75',
    cost: { mp: 6 },
    usableOutsideBattle: true,
    target: 'oneAlly',
    effects: [{ kind: 'healHp', amount: 75 }],
    animation: { effectSprite: 27 },
  },
  '298': {
    id: '298',
    name: '凝神归元',
    desc: '我方单人HP+220',
    cost: { mp: 18 },
    usableOutsideBattle: true,
    target: 'oneAlly',
    effects: [{ kind: 'healHp', amount: 220 }],
    animation: { effectSprite: 29 },
  },
  '299': {
    id: '299',
    name: '元灵归心术',
    desc: '我方单人HP+500',
    cost: { mp: 40 },
    usableOutsideBattle: true,
    target: 'oneAlly',
    effects: [{ kind: 'healHp', amount: 500 }],
    animation: { effectSprite: 29 },
  },
}
```

- [ ] **Step 4: 追加 re-export** —— `packages/content/src/index.ts` 末尾(现 154 行后)加一行,与现有 `export * from './character.js'` 等风格一致:

```ts
export * from './skill.js'
```

- [ ] **Step 5: 跑测试确认通过 + check + biome**

Run: `pnpm --filter @type-pal/content exec vitest run src/skill.test.ts`
Expected: PASS（2 测试）
Run: `pnpm --filter @type-pal/content run check`
Expected: typecheck + 全部 test 绿
Run: `pnpm --filter @type-pal/content exec biome check src/skill.ts src/skill.test.ts`
Expected: 0 error / 0 warning

- [ ] **Step 6: commit**

```bash
git add packages/content/src/skill.ts packages/content/src/skill.test.ts packages/content/src/index.ts
git commit -m "feat(content): 技能定义 SkillData + effects[] 联合 + 李逍遥 demo 治疗(气疗术等)"
```

---

## Task 2: levelUpSkills 习得规则(李逍遥真实等级表)

**Files:**
- Modify: `packages/content/src/skill.ts`(追加)
- Test: `packages/content/src/skill.test.ts`(追加用例)

**Interfaces:**
- Consumes: 无(纯加常量)。
- Produces: `LevelUpSkill`, `LEVEL_UP_SKILLS`。

- [ ] **Step 1: 追加失败测试** —— `skill.test.ts` 末尾(`describe` 内或新加 describe):

```ts
import { LEVEL_UP_SKILLS } from './skill.js' // 与顶部 import 合并

describe('levelUpSkills 习得规则', () => {
  test('李逍遥等级表 = 原版 level-up-magic 的 role0 【列】(非某一行)', () => {
    expect(LEVEL_UP_SKILLS['li-xiaoyao']).toEqual([
      { level: 7, skillId: '349' }, // 天师符法
      { level: 8, skillId: '311' }, // 天罡战气
      { level: 10, skillId: '298' }, // 凝神归元
      { level: 12, skillId: '346' }, // 万剑诀
      { level: 17, skillId: '299' }, // 元灵归心术
      { level: 20, skillId: '310' }, // 真元护体
      { level: 22, skillId: '348' }, // 天剑
      { level: 26, skillId: '392' }, // 金蝉脱壳
      { level: 34, skillId: '363' }, // 剑神
    ])
  })
  test('不含原版空槽 {level:0}', () => {
    for (const e of LEVEL_UP_SKILLS['li-xiaoyao'] ?? []) {
      expect(e.level).toBeGreaterThan(0)
      expect(e.skillId).not.toBe('0')
    }
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @type-pal/content exec vitest run src/skill.test.ts`
Expected: FAIL（`LEVEL_UP_SKILLS` 未导出）

- [ ] **Step 3: 在 `skill.ts` 末尾追加**

```ts
/** ③ 习得规则:角色模板升到 level 自动习得 skillId(原版 level-up-magic.json)。 */
export interface LevelUpSkill {
  level: number
  skillId: string
}

/**
 * 升级习得表(content 静态)。真值 = 原版 level-up-magic.json。
 * ⚠ 原版结构 = ln[ROW][ROLE](20 行 × 5 角色;sdlpal lprgln[j].m[role])。
 *   **某角色习得 = 取该角色那一【列】、遍历所有行**(不是取某一行!按行读会把 5 个角色的技能混在一起)。
 * 李逍遥 = 列 0(role0):lv7 天师符法(349) / lv8 天罡战气(311) / lv10 凝神归元(298) / lv12 万剑诀(346) /
 *   lv17 元灵归心术(299) / lv20 真元护体(310) / lv22 天剑(348) / lv26 金蝉脱壳(392) / lv34 剑神(363)。
 *   (名 = spells.json._name;298/299 是 outdoor,正是 demo learnedSkills 那两个。)
 * 这些技能完整 SkillData 待 phase3 migrate 全量;demo 不跑升级逻辑,本表只验 ③ 层 schema + 钉真值。
 */
export const LEVEL_UP_SKILLS: Record<string, LevelUpSkill[]> = {
  'li-xiaoyao': [
    { level: 7, skillId: '349' }, // 天师符法
    { level: 8, skillId: '311' }, // 天罡战气
    { level: 10, skillId: '298' }, // 凝神归元
    { level: 12, skillId: '346' }, // 万剑诀
    { level: 17, skillId: '299' }, // 元灵归心术
    { level: 20, skillId: '310' }, // 真元护体
    { level: 22, skillId: '348' }, // 天剑
    { level: 26, skillId: '392' }, // 金蝉脱壳
    { level: 34, skillId: '363' }, // 剑神
  ],
}
```

- [ ] **Step 4: 跑测试 + check + biome**

Run: `pnpm --filter @type-pal/content exec vitest run src/skill.test.ts`
Expected: PASS（4 测试)
Run: `pnpm --filter @type-pal/content run check` → 绿
Run: `pnpm --filter @type-pal/content exec biome check src/skill.ts src/skill.test.ts` → 0/0

- [ ] **Step 5: commit**

```bash
git add packages/content/src/skill.ts packages/content/src/skill.test.ts
git commit -m "feat(content): levelUpSkills 习得规则(李逍遥真实等级表 level-up-magic.json[0])"
```

---

## Task 3: learnedSkills 关系表(迁移 CharacterInstance.magic → WorldState)

**Files:**
- Modify: `packages/content/src/character.ts`(WorldState +`learnedSkills`;删 `CharacterInstance.magic`;`LI_XIAOYAO.initialMagic` 填 demo;`instantiate` 删 magic;`initialWorld` 播种)
- Test: `packages/content/src/character.test.ts`(改 magic 断言)

**Interfaces:**
- Consumes: `DEMO_SKILLS`(Task 1,做一致性断言)。
- Produces: `WorldState.learnedSkills: Record<string, string[]>`。

**背景(已 grep 核实):`CharacterInstance.magic` 当前仅被 `character.ts` 自身(定义/instantiate)与 `character.test.ts:19` 引用,reforge/其他生产代码无读取 → 迁移零悬空引用。**

- [ ] **Step 1: 改测试(先让它表达新行为)** —— `packages/content/src/character.test.ts`

把 19 行 `expect(inst.magic).toEqual([])` **删除**(instance 不再有 magic 字段)。在 `initialWorld` 那个 test(22-26 行)里追加 learnedSkills 断言,改成:

```ts
  test('initialWorld = 单人队伍(李逍遥实例)+ 习得仙术关系表', () => {
    const w = initialWorld()
    expect(w.party).toHaveLength(1)
    expect(w.party[0]?.id).toBe('li-xiaoyao')
    // learnedSkills:独立关系表(charInstanceId → skillId[]),取代内嵌 magic
    expect(w.learnedSkills['li-xiaoyao']).toEqual(['296', '298', '299'])
    // demo 习得的都在 DEMO_SKILLS 且 outdoor(大世界菜单可显)
    for (const id of w.learnedSkills['li-xiaoyao'] ?? []) {
      expect(DEMO_SKILLS[id]?.usableOutsideBattle).toBe(true)
    }
  })
```

并把顶部 import 补上 `DEMO_SKILLS`:

```ts
import { DEMO_SKILLS } from './skill.js'
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @type-pal/content exec vitest run src/character.test.ts`
Expected: FAIL（`learnedSkills` 不存在 / `inst.magic` 类型错）

- [ ] **Step 3: 改 `packages/content/src/character.ts`**

**3a.** `WorldState`(4-7 行)加 `learnedSkills`:

```ts
/** L1 世界态(跟存档走;现 demo 内存构造)。 */
export interface WorldState {
  party: CharacterInstance[]
  money: number // 金钱(跟存档走;demo 内存构造 = 0)
  /** 习得仙术关系表:charInstanceId → skillId[]。独立表(非内嵌 CharacterInstance),解耦 + MMO 玩家私有留口。 */
  learnedSkills: Record<string, string[]>
}
```

**3b.** `CharacterInstance`(25 行)**删除** `magic: string[]` 这一行(关系迁到 learnedSkills):

```ts
  equipment: Record<string, string> // slotId → itemId(可扩展槽)
  tags: string[] // 留口:种族/门派(phase3),现空
```

**3c.** `LI_XIAOYAO.initialMagic`(66 行)`[]` → demo 3 个 outdoor 治疗(起手 296 + 298/299 充实网格;均 usableOutsideBattle):

```ts
  initialEquipment: {},
  initialMagic: ['296', '298', '299'],
```

**3d.** `instantiate`(70-80 行)**删除** `magic: [...t.initialMagic],` 这一行(实例不再带 magic):

```ts
export function instantiate(t: CharacterTemplate): CharacterInstance {
  return {
    id: t.id,
    template: t.id,
    ...t.baseStats,
    exp: 0,
    equipment: { ...t.initialEquipment },
    tags: [],
  }
}
```

**3e.** `initialWorld`(83-85 行)播种 learnedSkills(从模板 initialMagic,数据驱动):

```ts
/** demo 世界态:单人李逍遥 + 习得仙术关系表(从模板 initialMagic 播种)。 */
export function initialWorld(): WorldState {
  const li = instantiate(LI_XIAOYAO)
  return {
    party: [li],
    money: 0,
    learnedSkills: { [li.id]: [...LI_XIAOYAO.initialMagic] },
  }
}
```

- [ ] **Step 4: 跑测试 + check + biome**

Run: `pnpm --filter @type-pal/content exec vitest run src/character.test.ts`
Expected: PASS
Run: `pnpm --filter @type-pal/content run check`
Expected: typecheck + **全包 test** 绿(确认删 `magic` 没拖垮别处)
Run: `pnpm --filter @type-pal/content exec biome check src/character.ts src/character.test.ts`
Expected: 0 error / 0 warning

- [ ] **Step 5: 全仓 check(确认 reforge 等不依赖被删的 magic)**

Run: `pnpm check`
Expected: 全绿（若 reforge 有处引用 `.magic` 而报错 → 停下报告 Claude,勿擅自改 reforge）

- [ ] **Step 6: commit**

```bash
git add packages/content/src/character.ts packages/content/src/character.test.ts
git commit -m "refactor(content): CharacterInstance.magic → WorldState.learnedSkills 关系表 + 李逍遥 demo 习得"
```

---

## Self-Review

1. **三层覆盖:** ① SkillData+DEMO_SKILLS(T1)、③ levelUpSkills(T2)、② learnedSkills(T3)。✅
2. **真值无占位:** DEMO_SKILLS(spells._name/magic.json 一手核验;healHp 量经 scriptOnSuccess 字节码确认)、LEVEL_UP_SKILLS(level-up-magic 的 **role0 列** 直读)。⚠ 复核纠错:初稿把 `ln` 当 `[角色][行]` 误取「行 0」(把 5 个角色的 row0 技能混给李逍遥),实为 `[行][角色]`、应取「列 0」—— 已改正(见 skill.ts 注释)。
3. **类型一致:** `SkillEffect` 全联合一次定全;`DEMO_SKILLS: Record<string,SkillData>`、`LEVEL_UP_SKILLS: Record<string,LevelUpSkill[]>`、`WorldState.learnedSkills: Record<string,string[]>` 命名贯穿 T1-T3。✅
4. **迁移安全:** `.magic` 仅 character.ts + 其测试引用(已 grep);T3 Step5 全仓 check 兜底,reforge 报错则停。✅
5. **阶段隔离/稳定 id:** 数据全在 content;id 不透明 string;learnedSkills 独立表(MMO 留口);无下标式身份。✅
6. **范围克制:** demo 只填菜单要的 3 技能 + 真实等级表;不全量迁 102 技能、不写战斗引擎、不写升级逻辑(phase3)。✅
