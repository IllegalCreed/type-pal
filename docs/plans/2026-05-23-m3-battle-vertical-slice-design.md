# M3 · 战斗垂直切片 Design

> 这是 M3 的**设计文档**(brainstorming 产出),只讲"做什么 / 怎么组织 / 怎么验证"。
> 配套的 step-by-step 实施计划由 writing-plans 阶段产出,落在 `docs/plans/2026-05-23-m3-battle-vertical-slice.md`。

## 与全局文档的关系

- 实现 `../03-development-plan.md` 的 **M3** 节(战斗垂直切片),但**只覆盖 Phase 1**(战斗骨架 + D29 双基准 + 5 actions 全集 + dev 入口)。03 plan 字面里的"事件能触发一场战斗"延后到 **M3.5**(scene 切换 + 明雷怪机制 + 仙灵岛端到端)。
- 所有架构 / 决策依据来自 `../02-architecture.md`(战斗系统 / 命令总线 / 模式机)、`../04-decisions.md`(D3 / D12 / D13 / D15 / D21 / D26 / D28 / D29)、`../05-events-schema.md`(脚本 = `wScriptOnUse` 复用)、`../06-testing.md`(差分对拍)。
- 消费 M2 产物 `data/extracted/`(共享 schema 全在 `@type-pal/shared`);**扩 enemies.json / items.json / spells.json schema**(M1 简化版 → 战斗完整版),不破坏 events round-trip。
- 复用 M2 已有的 `core/event-system.ts` 跑 item / magic 的 `wScriptOnUse` 脚本(架构发现:item / magic 效果不是写死的 type,而是脚本)—— **M3 只按需具名"战斗用" opcode**,其余继续走 raw skip(D26 跨里程碑生效)。
- 参考资料:
  - `../../reference/sdlpal/fight.c`(战斗公式 + 调度,PAL_CLASSIC 分支为准)
  - `../../reference/sdlpal/battle.c`(battle main loop,PAL_StartBattle 入口)
  - `../../reference/sdlpal/global.h`(ENEMY / OBJECT_ITEM / OBJECT_MAGIC / MAGIC / PLAYERROLES struct,M3 schema 1:1 对照)
  - `../../reference/walkthrough/flow.md`(玩家视角流程,辅助选 dev fixture)

## 对里程碑划分的调整

`../03-development-plan.md` 的 M3 节字面包含:
1. sdlpal headless map dumper(D29 流程纪律)
2. 补 ~10 个 onEnter opcode 让 scene 1 真跑完
3. 最小回合制战斗 + 战斗 UI 最小版
4. Enemy schema 大改(D28)

brainstorm 阶段定型(2026-05-23):

| 工作项 | 原 03 安排 | 本设计 |
|---|---|---|
| sdlpal headless map dumper(视觉基准)| M3 第一个 task | **M3 第一个 task**(D29) |
| sdlpal classic build + headless battle harness(数值基准)| 未明示 | **M3 新增**(D29 数值类基准,直接 derive 自 D29 原则 + M3 新发现:见下) |
| Enemy schema 大改(D28)| M3 | **M3** |
| Items / Spells schema 大改(同样 sdlpal 1:1)| 未明示(原 M5 全战斗一起做)| **M3 提前**(理由:dev 入口 + 5 actions 全集要选物品 / 法术,schema 不全无从选;M2 enemies 走过同一条路) |
| `wScriptOnUse` 复用 EventSystem 走 item / magic 效果 | 未明示 | **M3 架构**(M1 OBJECT_ITEM/MAGIC 字段已揭示 wScriptOnUse;符合 D17 富模型 + D26 raw skip) |
| PARTY_LEADER 真查(M2 遗债)| 隐式 | **M3 第一刀解决**(顺手 dump 完整 PLAYERROLES) |
| ~10 onEnter opcode + scene 切换 + 仙灵岛端到端 | M3 | **M3.5**(单独里程碑,scope 控制) |
| 五行属性场地加成 / scripted enemy AI(`wScriptOnTurnStart` / `wScriptOnReady`)/ 协力法术 / 升级时 8 类属性 EXP / status effects / Summon / Trance | M5 全战斗 | **M5**(不变) |

**新 D29 推论**:M2 教训"sdlpal 即规格类模块实施前必须先建基准"对**战斗公式 / turn order**同样适用 —— 不仅是视觉。M3 数值基准 = **headless battle harness**(sdlpal PAL_CLASSIC build + 固定 RNG seed + fixture(队伍 / 敌队)→ dump 每回合伤害 / 命中 / 状态 JSON),M3 战斗系统单测 fixture 直接对这份 JSON 逐回合 diff。这是 D21 "战斗差分对拍" 的具体落地形式。

**新洞察:`sdlpal default build ≠ 忠实原版`**:sdlpal 默认 unix build 是 sdlpal 团队的"修订版"(更难、ATB 时间槽);忠实原版是 `common.h` 加 `#define PAL_CLASSIC 1` 重编后的 classic build(纯回合制 select-action → perform-action + 按 dexterity 排 ActionQueue 每轮重排)。M3 战斗对照、headless harness、视觉基准 dumper **全部用 classic build**。这也写进 D30(下方决策建议)。

## 范围

### 1 D29 双基准基建(M3 第一刀)

- **`scripts/build-sdlpal-classic.sh`** —— patch `common.h` 加 `#define PAL_CLASSIC 1` 后跑 `build-sdlpal.sh`,产出 `build/sdlpal-classic/unix/sdlpal`(可与已有 default build 并存)。M1 的 `scripts/sdlpal-extern-c.patch` 仍套用。
- **`reference/sdlpal/patches/`**(新)—— 集中存放 patches:
  - `headless-map-dump.patch` —— 给 sdlpal 加 `--dump-map N --out FILE` CLI:跳 SDL 窗口、`PAL_LoadMap(N)` 后用 `PAL_TileBlitToSurface` 跑全图到 2048×2048 内存 surface,stb_image_write 出 PNG,exit。
  - `headless-battle-harness.patch` —— 给 sdlpal classic build 加 `--battle-harness FIXTURE.json --out RESULT.json` CLI:跳 SDL 窗口、从 fixture 读队伍 + 敌队 + RNG seed + 玩家 action 序列,跑 `PAL_StartBattle` 每回合 dump JSON(turn order / 伤害 / 命中 / HP / MP / status / BattleResult),exit。
- **`build/sdlpal-baseline/maps/`**(新约定目录)—— headless map dumper 产物:`map-12.png` 等。`build/` 整体不入 git。
- **`build/sdlpal-baseline/battles/`**(新约定目录)—— harness 产物:`battle-fixture-N.json` + `battle-result-N.json`。
- **`scripts/render-tilemap.ts`**(M2 已存)—— 增强:输出 PNG 跟 `build/sdlpal-baseline/maps/map-N.png` 比对(`pnpm -F @type-pal/pal-extract test` 里加一条 fixture 测试,逐像素 diff)。M2 末尾 commit dc28d04 已 dump 全图工具,M3 增加比对。
- **`packages/pal-extract/src/__tests__/tilemap-baseline.test.ts`**(新,自动化的 D29)—— 测试 ENV 读 baseline PNG,跟我们渲染产物比对;baseline 缺失则 skip + warn,不 fail。

### 2 数据 schema 大改(M3 第二刀)

M2 的 enemies.json / items.json / spells.json 简化版战斗根本不够用。M3 一次性扩到战斗完整版(忠实 sdlpal 字段)。原始字节解析 M1 已做,只扩 schema + parser 提取的字段。

- **`@type-pal/shared/src/resources.ts`** 增 / 改 schema(对照 sdlpal global.h):
  - `Enemy`(对应 `tagENEMY`,30+ 字段):` wIdleFrames / wMagicFrames / wAttackFrames / wIdleAnimSpeed / wActWaitFrames / wYPosOffset / wAttackSound / wActionSound / wMagicSound / wDeathSound / wCallSound / wHealth / wExp / wCash / wLevel / wMagic / wMagicRate / wAttackEquivItem / wAttackEquivItemRate / wStealItem / nStealItem / wAttackStrength / wMagicStrength / wDefense / wDexterity / wFleeRate / wPoisonResistance / wElemResistance[5] / wPhysicalResistance / wDualMove / wCollectValue`。**字段名去 Hungarian**(`spriteNum` 那种风格)。**signed 语义**:`attack / defense / dexterity / magicStrength` 用 `getInt16` 读(或保留 unsigned + JSDoc 标 "as SHORT")—— 对照 sdlpal `fight.c:4634`:`int str = (SHORT)g_Battle.rgEnemy[i].e.wAttackStrength` —— 这些字段是 stat **modifier**(加在玩家等级算出的基础值上),不是直接值。`elemResistance[5]` 改成具名:`{ wind, thunder, water, fire, earth }`(对应 sdlpal `NUM_MAGIC_ELEMENTAL=5`)。
  - `Item`(对应 `tagOBJECT_ITEM` 7 字段 + DATA.MKF 物品 stats):`bitmap / price / scriptOnUse / scriptOnEquip / scriptOnThrow / scriptDesc / flags`。**flags 按 ITEMFLAG bitmask 拆成 bool**(`usable / equipable / throwable / consuable / applyToAll / sellable / equipableBy[5]`)。
  - `Spell`(对应 `tagOBJECT_MAGIC` 7 字段 + DATA.MKF Magic struct):`magicNumber / scriptOnSuccess / scriptOnUse / scriptDesc / flags` + 详细 stats `effect / type / xOffset / yOffset / speed / keepEffect / fireDelay / effectTimes / shake / wave / costMP / baseDamage / elemental / sound`。`type` 用 enum:`'normal' | 'attackAll' | 'attackWhole' | 'attackField' | 'applyToPlayer' | 'applyToParty' | 'trance' | 'summon'`。flags 同样拆 bool。
  - `EnemyTeam`(新,对应 `tagENEMYTEAM`):`{ id, enemies: number[] /* OBJECT enemy 索引,最多 5,0xFFFF 留空 */, _names?: string[] }`。
  - `BattleField`(新,对应 `tagBATTLEFIELD`):`{ id, screenWave, magicEffect: { wind, thunder, water, fire, earth } /* signed */, _bg?: string /* FBP.MKF chunk index hint */ }`。
  - `PlayerRoles`(新,对应 `tagPLAYERROLES` 部分):**只 dump M3 需要的字段** —— `roles[5]: { avatar, spriteNumInBattle, spriteNum, name, level, maxHP, maxMP, hp, mp, attackStrength, magicStrength, defense, dexterity, fleeRate, poisonResistance, elemResistance: {…}, walkFrames, attackSound, weaponSound, criticalSound, magicSound, deathSound }`。**equipment / magic learned / coveredBy / cooperativeMagic 推 M5**(M3 不消费)。
- **`packages/pal-extract/src/resources/`** 改 / 新:
  - `enemy.ts`(已存)—— 全字段扩(对照 sdlpal `PAL_LoadEnemies` 或直接读 OBJECT chunk + DATA chunk)
  - `item.ts`(新,从 OBJECT chunk 索引 61-295 + DATA chunk 提取)
  - `spell.ts`(新,从 OBJECT chunk 296-397 + DATA chunk 提取)
  - `enemy-team.ts`(新,从 DATA.MKF EnemyTeams chunk)
  - `battle-field.ts`(新,从 DATA.MKF BattleField chunk)
  - `player-roles.ts`(新,从 DATA.MKF chunk 3,M2 已半解;扩到 dump 全 PLAYERROLES 子集)

不变量:**events.json 字节级 round-trip 仍逐字节通过**(schema 改的是数据表 JSON,不动 events 反汇编路径)。

### 3 战斗系统骨架(M3 主战场)

新建 `packages/game/src/core/battle/`(子目录):

- **`battle-state.ts`** —— 战斗局部状态(进战斗时从 GameState 派生 + 战斗结束时回写):
  ```ts
  interface BattleState {
    players: BattlePlayer[]   // 队员战斗态:hp/mp 引用 GameState、prevHp/prevMp、defending、currentFrame
    enemies: BattleEnemy[]    // 当前敌方:e(完整 ENEMY 字段)、status[]、prevHp、currentFrame、scriptOnTurnStart/Ready/BattleEnd
    field: BattleField
    isBoss: boolean
    phase: 'preBattle' | 'selectAction' | 'performAction' | 'postAction' | 'won' | 'lost' | 'fleed'
    actionQueue: ActionQueueItem[]      // 当前轮按 dexterity 排序的行动队列
    currentActionIndex: number          // actionQueue 内推进游标
    pendingAction?: BattleAction        // 队员当前选的 action(等 perform)
    selectingPlayerIdx?: number         // selectAction 阶段当前选谁
    targetingMode?: 'enemy' | 'player' | 'all'
    expGained: number
    cashGained: number
    rng: SeedableRng                    // 战斗内确定性,差分对拍基础
  }
  ```
  **不变量**:`BattleState` 与 `GameState` 解耦 —— `players[i].hp` 是 GameState `playerRoles.hp[role]` 的引用,以 GameState 为真相源(D6)。

- **`turn-queue.ts`** —— PAL_CLASSIC turn 调度(对照 `fight.c` ACTIONQUEUE):
  - `buildActionQueue(state)` —— 每轮重排:全部活的队员 + 全部活的敌人,按 dexterity 降序;dualMove enemy 进队列两次(fIsSecond=true 的项)。
  - `nextActor(state)` —— 推进 currentActionIndex,返回下一个行动者。
  - 对照 sdlpal `fight.c:1900` 附近 `#ifdef PAL_CLASSIC` 的 ACTIONQUEUE 构建逻辑。

- **`formulas.ts`** —— 战斗公式(纯函数,从 `fight.c` 1:1 port,SHORT 语义保持):
  - `calcBaseDamage(atk, def): number` —— 三段公式(`>def` / `>def*0.6` / else=0,SHORT cast)
  - `calcPhysicalAttackDamage(atk, def, resist): number` —— = base / resist
  - `calcMagicDamage(magStr, def, elemRes, poisonRes, resistMultiplier, magicId, magicData, fieldEffect): number` —— 含元素 resistance、battle field effect、base damage
  - `getEnemyDexterity(enemy): number` —— `(level+6)*3 + (SHORT)dexterity`
  - `getPlayerActualDexterity(role, status): number` —— PAL_CLASSIC 路径:含 haste status × 3 / 999 上限
  - 全部 fixture 单测对 headless battle harness JSON 逐项 diff。

- **`battle-system.ts`** —— 模式机入口:
  - `startBattle(gs, enemyTeamId, fieldId, isBoss)` —— 构 BattleState,切 `mode='battle'`,phase=`preBattle`,跑每个 enemy 的 `wScriptOnReady` 脚本(若非 0)。
  - `tickBattle(gs, input, bus)` —— battle 模式 tick 路由:按 phase 分发到子函数。
  - `tickSelectAction(gs, input, bus)` —— 等玩家从 UI 选 action,确定下一队员 / 进 `performAction` phase。
  - `tickPerformAction(gs, input, bus)` —— 取 actionQueue[currentIdx] 行动:
    - 队员 action:跑 `performPlayerAction(state, action)`
    - 敌人 action:跑 `performEnemyAction(state, enemyIdx)`(基础逻辑:wMagic + wMagicRate 决策魔法 or 物理 + 选 target,不跑 `wScriptOnTurnStart`,后者 M5;`wScriptOnReady` 改 M5 真做)
  - `tickPostAction(state)` —— 死亡判定 / 状态 tick / 经验累计 / 胜负判定 → 切下一 phase 或 `won` / `lost`。

- **`actions/`** —— 5 个 action 各一个文件,**全部走"emit 命令 → 等命令完成"协程节奏**(对话框模式):
  - `attack.ts` —— 物理攻击:动画 → calc damage → 写回 enemy.health → 弹伤害数字命令
  - `defend.ts` —— 标 `defending=true`,本轮受伤减半(对照 sdlpal 防御常量)
  - `magic.ts` —— 法术使用:跑 `OBJECT_MAGIC.wScriptOnUse` 脚本(复用 EventSystem,见下"事件系统复用"),扣 mp、播放法术动画命令、calcMagicDamage 写回敌方 hp
  - `item.ts` —— 物品使用:跑 `OBJECT_ITEM.wScriptOnUse` 脚本,扣 inventory 数量
  - `flee.ts` —— 逃跑:按 `wFleeRate` 随机判定;成功 → `phase='fleed'`,失败 → 跳过本轮

- **`enemy-ai.ts`** —— 极简 enemy AI(M3 范围):
  - 若 `wMagic != 0` 且 `Random(0,9) < wMagicRate` → 选 magic(target 选玩家随机活的一个 / 全体取决于 magic.type)
  - 否则 → 物理攻击(target 选玩家随机活的一个)
  - **不**跑 wScriptOnTurnStart / wScriptOnReady(M5);**不**做 confused / sleep / paralyzed 等 status 的 AI 行为(M5)。

### 4 事件系统复用(架构亮点)

OBJECT_ITEM / OBJECT_MAGIC 的 `wScriptOnUse` 是脚本指针 —— 道具 / 法术效果通过跑 events.json 实现,不写死在 C 类型 enum 里。M3 复用 M2 已有的 EventSystem:

- 战斗 mode 下,`actions/magic.ts` / `actions/item.ts` 调用 `runScript(scriptIp, ctx)`,ctx 包含 `currentTargetEnemy / currentTargetPlayer / currentMagicId / currentItemId` 上下文。
- EventSystem **不直接画对话框 / 不切场景**(战斗内的脚本撞到 `showDialog` 应 emit 一个 battleMessage 命令 → 战斗 UI 在屏顶显示一条信息);**emit 战斗命令**(`dealDamage` / `heal` / `setStatus` 等)由战斗系统消费写回 BattleState。
- **opcode 具名按需增量**(D26 跨里程碑):跑 spell/item 脚本时 console.debug 哪些 opcode 是 raw,**M3 phase 1 fixture 用到的法术 / 物品**对应的 opcode 优先具名(预计 10-20 个,如 `dealMagicDamage` / `healHp` / `healMp` / `setBattleStatus` / `unsetBattleStatus` 等);其他 spell/item 的 raw 仍 skip,M5 增量补。
- **EventSystem 扩 mode 感知**:加 `runtimeMode: 'explore' | 'battle'` 字段,某些 opcode 在 battle 内行为不同(如 showDialog 在 battle 内不入对话框)。**M3 实施时具体哪些 opcode 行为分裂按 sdlpal `script.c` 实际分支判断**。

### 5 战斗 UI(`packages/game/src/present/battle/`)

新建子目录:

- `draw-battle-bg.ts` —— FBP.MKF 中战场背景渲染(M3 fixture 用一张默认背景,资源 M1/M2 未提取的话顺手提)
- `draw-battle-sprites.ts` —— 队员 / 敌方 sprite(从 F.MKF chunks 取战斗 sprite,新增 pal-extract `battle-sprite.ts`)
- `draw-battle-ui.ts` —— 命令菜单(Attack/Magic/Item/Defend/Flee 五项) + Magic / Item 二级菜单 + 目标光标 + HP/MP 数字 + 状态 icon
- `draw-battle-num.ts` —— 伤害 / 治疗数字弹幕(蓝 = 治疗 / 黄 = 伤害,对照 sdlpal `PAL_BattleUIShowNum`)
- `present-battle.ts` —— 一帧装配 + drain 战斗命令(`showBattleMessage` / `flashEnemy` / 等)

**`BATTLE_FPS = 25`** —— 主循环按 `gs.mode` 切帧率:`explore` / `event` = 10fps,`battle` = 25fps。`shell/main-loop.ts` 改成读 GameState 决定 tick 间隔。

### 6 Dev panel(`packages/game/src/shell/dev-panel.ts`,新)

仅 dev build 启用(`import.meta.env.DEV` gate),与战斗忠实实现物理隔离。M3 范围:

- **快捷键 `B`** —— 探索模式按 B → 弹出 enemy team picker(DOM 浮层,不进 320×200 canvas):
  - 选 enemyTeam id(从 enemyTeams.json 列表)
  - 选 battle field id
  - 选队伍配置(快速预设:`fixture-zh1` = 第一章开局 / `fixture-zh2` = 第二章 / `fixture-end` = 通关前;每个预设硬编码 level / hp / mp / spells / items;真"自定义编辑"留 M5+)
  - 确认 → 调 `startBattle(gs, enemyTeamId, fieldId, false)`
- **快捷键 `F1`** —— dump 当前 GameState + BattleState 到浏览器 console.json,便于 brainstorm 阶段查值。
- **不做**:跳场景 / 加载存档 / 编辑 inventory(`.RPG` 解析 + dev 完整面板留 M5;M3 只做"调战斗" + console dump 这两个最小项)。

### 7 测试策略

按 06-testing.md 的"重档"路线(D21),M3 落实四类:

#### 7.1 D29 双基准对拍(M3 测试基建主战场)

- **tilemap baseline**(自动化):`pnpm extract-tilemap-baseline` 跑 `build/sdlpal-classic/unix/sdlpal --dump-map 12 --out build/sdlpal-baseline/maps/map-12.png` + 其他切片场景。`packages/pal-extract/src/__tests__/tilemap-baseline.test.ts` 跑我们的渲染产物对比,逐像素 diff。
- **battle baseline**(自动化):`pnpm extract-battle-baseline` 跑 `--battle-harness fixture-N.json --out result-N.json`。`packages/game/src/core/battle/__tests__/baseline.test.ts` 喂同 fixture 给我们的引擎,逐回合对比 result.json。**fixture 集合**:
  - `b1-easy.json` —— 1 队员 lv10,vs 1 弱怪(从 enemies.json 选 wHealth < 100),纯物理攻击直至 KO
  - `b2-magic.json` —— 1 队员 lv20,vs 1 中怪,使用 1 个法术(spell magicNumber 已知)
  - `b3-item.json` —— 同上,使用 1 个回血物品
  - `b4-flee.json` —— 1 队员 lv5,vs 1 强怪,逃跑 5 次直至成功
  - `b5-defend.json` —— 1 队员 lv10,vs 1 中怪,使用防御挡 1 回合
- **基准 fixture & result 不入 git**(`build/` 已 ignore);要协作时单独 `build/sdlpal-baseline-shared/` 入 git。M3 个人自用,本地存。

#### 7.2 核心层 Vitest 单测(主战场)

- **`formulas.ts`** —— 全部 5 个公式喂已知输入断言输出(参 sdlpal fight.c 测试值)。SHORT 边界值(-1 = 0xFFFF)必测。
- **`turn-queue.ts`** —— 给定队伍 + 敌队 dexterity 数组,断言 ActionQueue 顺序;dualMove 进两次断言。
- **`battle-system.ts`** —— 喂 fixture 战斗 + 录好的 action 序列 → 断言每回合 HP / phase 转换 / BattleResult。
- **`enemy-ai.ts`** —— 固定 RNG → 断言决策(物理 vs magic)+ 目标选择。
- **`event-system.ts`** —— battle mode 下跑 magic.wScriptOnUse → 断言 BattleState 变化 + 命令序列。
- **`battle-state.ts`** —— 战斗结束 GameState 回写正确性(hp 不被 ghost-revive、mp 扣对、经验入账、cash 入账)。

#### 7.3 集成 / E2E Vitest

- **headless 主循环**:走探索 → dev 入口模拟按 B → ReplayInputSource 喂战斗 action 序列 → 跑 N tick → 断言 BattleResult = won + GameState exp 入账。
- 多场战斗串联(用 fixture loop)验证多场战斗后 GameState 不爆。

#### 7.4 dev 验证清单(手测)

- `pnpm dev` → 浏览器 → scene 1 onEnter 跑完(M2 流程)→ explore mode 走路 → 按 B → 选 fixture-zh1 + 一队弱怪 + 默认 field → 战斗界面出来。
- 选攻击 → 选目标 → 命中数字弹出 → 敌方 turn 攻回来 → 死敌 enemy → BattleResult won → 经验入账 GameState 显示 levelUp 文字(若达到)。
- 试齐 5 个 actions:attack / magic / item / defend / flee 都跑通。
- 控制台:战斗中 raw skip 时 console.debug 输出 opcode + ip,验证 D26 跨模式生效。

#### 7.5 pal-extract 增量回归

- M1 / M2 全部 180 个单测继续过。
- 全量 events round-trip 仍逐字节通过(M3 大改 schema 是 enemies / items / spells / playerRoles **数据表 JSON 形状**,events.json 形态不变)。
- 新加的 7 个 resources 提取(enemy 扩 / item / spell / enemyTeam / battleField / playerRoles + battle sprite)各加 fixture 单测,与 sdlpal struct 1:1 字段验证。

### 8 D30 决策建议(新增,待 04 决策表追加)

设计阶段拍下,M3 实施时落 04 决策表:

- **D30 · sdlpal 默认 build 不是忠实原版,M3+ 战斗对照必须用 PAL_CLASSIC build**。sdlpal `unix/Makefile` 默认编译不带 `-DPAL_CLASSIC`,产生"修订版"战斗(ATB 时间槽);忠实原版要 `common.h` 加 `#define PAL_CLASSIC 1` 重编。M3 加 `scripts/build-sdlpal-classic.sh` 独立产出 `build/sdlpal-classic/unix/sdlpal`,所有战斗 / 数值类基准(D29)用此 binary。视觉类基准(tilemap dumper)两个 build 等价(PAL_CLASSIC 不影响渲染路径),为简单**统一用 classic build**。

### 9 不在 M3 范围(推 M3.5 / M5 / M6)

**推 M3.5**:
- 补 ~10 onEnter / scene 切换 opcode(setPartyPos / setViewport / showFace / 场景切换 / startBattle 等)
- scene 切换执行(`scene-system.ts` 扩展卸 / 载场景资源)
- 仙灵岛 + 中间场景 tilemap / palette / sprite 提取(`pal-extract` 增量)
- 明雷怪机制(`EventObject.triggerMode` 区分接触触发 vs 按键触发)
- 端到端:scene 1 出客栈 → 仙灵岛 → 撞草妖 → 真战斗(数据走 M3 已建管线)
- 仙灵岛 / 盛渔村大地图的草妖 / 苗人拳 / 其他明雷怪真 enemy 数据

**推 M5**:
- scripted enemy AI(`wScriptOnTurnStart` / `wScriptOnReady` / `wScriptOnBattleEnd`)
- 协力法术 / 觉醒 / 八卦
- 五行属性 battle field 加成(`battleField.magicEffect` 全套对照)
- 升级时 8 类属性 EXP 子项(rgHealthExp / rgMagicExp / rgAttackExp …)的完整算法(M3 简化:只累 `wExp` + 简单 `level` up 阈值)
- status effects 完整集(中毒 / 麻痹 / 沉默 / 混乱 / 困 / 隐藏 / 慢 / 急 …):M3 只识别 sleep / paralyzed / confused 三种最简(影响 turn skip),其余 status M5
- Summon / Trance(MAGIC_TYPE)
- 装备系统(`OBJECT_ITEM.scriptOnEquip` / PLAYERROLES.rgwEquipment)
- 物品投掷(`OBJECT_ITEM.scriptOnThrow`)
- 商店

**推 M6**:战斗音效 / BGM / 转场动画 / 调色板循环动画在战斗内的应用

### 10 模块组织

#### `packages/game/src/`(M3 增量大头)

```
packages/game/src/
├── core/
│   ├── battle/
│   │   ├── battle-state.ts                # 新建
│   │   ├── turn-queue.ts                  # 新建
│   │   ├── formulas.ts                    # 新建(从 fight.c port)
│   │   ├── battle-system.ts               # 新建
│   │   ├── enemy-ai.ts                    # 新建
│   │   ├── actions/
│   │   │   ├── attack.ts                  # 新建
│   │   │   ├── defend.ts                  # 新建
│   │   │   ├── magic.ts                   # 新建(跑 wScriptOnUse)
│   │   │   ├── item.ts                    # 新建(跑 wScriptOnUse)
│   │   │   └── flee.ts                    # 新建
│   │   └── __tests__/
│   │       ├── *.test.ts                  # 各对应单测
│   │       └── baseline.test.ts           # D29 数值基准对拍
│   ├── event-system.ts                    # 改:加 runtimeMode + 战斗专用 opcode 具名 + ctx
│   ├── command-bus.ts                     # 改:加战斗命令类型(showBattleMessage / flashEnemy / showDamageNum / playEnemyAttack 等)
│   ├── game-state.ts                      # 改:加 mode='battle' + party 多角色(已为多角色留口子)
│   ├── mode.ts                            # 改:加 battle case
│   └── rng.ts                             # 新建,seedable RNG(战斗 + 暗雷 future-proof)
├── present/
│   ├── battle/
│   │   ├── draw-battle-bg.ts              # 新建
│   │   ├── draw-battle-sprites.ts         # 新建
│   │   ├── draw-battle-ui.ts              # 新建
│   │   ├── draw-battle-num.ts             # 新建
│   │   ├── present-battle.ts              # 新建
│   │   └── __tests__/*.test.ts
│   └── present.ts                         # 改:mode === 'battle' 时调 present-battle
├── shell/
│   ├── main-loop.ts                       # 改:按 mode 切 100ms / 40ms 步长
│   └── dev-panel.ts                       # 新建(dev-only DOM 浮层)
├── assets/
│   └── loader.ts                          # 改:加载 enemies/items/spells/enemyTeams/battleFields/playerRoles/battleSprite/battleBg
└── data/
    └── battle-fixtures.json               # 新建(几个预设队伍配置)
```

#### `packages/pal-extract/src/`(M3 增量)

```
packages/pal-extract/src/
├── resources/
│   ├── enemy.ts                           # 改:扩 30+ 字段(D28)
│   ├── item.ts                            # 新建(OBJECT 索引 61-295 + DATA.MKF 物品 stats)
│   ├── spell.ts                           # 新建(OBJECT 索引 296-397 + DATA.MKF Magic table)
│   ├── enemy-team.ts                      # 新建(DATA.MKF EnemyTeams chunk)
│   ├── battle-field.ts                    # 新建(DATA.MKF BattleField chunk)
│   ├── player-roles.ts                    # 新建(DATA.MKF chunk 3,M3 dump M3 需要的字段子集)
│   ├── battle-sprite.ts                   # 新建(F.MKF 战斗 sprite chunks)
│   └── __tests__/*.test.ts
├── events/
│   └── opcodes.ts                         # 改:具名 10-20 个战斗用 opcode(实施时按 spell/item fixture 撞到的具名)
└── cli.ts                                 # 改:总装新产物
```

#### `packages/shared/src/`(M3 增量)

```
packages/shared/src/
├── resources.ts                           # 改:扩 Enemy / Item / Spell / EnemyTeam / BattleField / PlayerRoles schema
└── events.ts                              # 改:加战斗专用 Command 类型(同时是 EventSystem opcode handler 的契约)
```

#### `reference/sdlpal/patches/`(新)

```
reference/sdlpal/patches/
├── headless-map-dump.patch                # 新
└── headless-battle-harness.patch          # 新(可能拆成多个 patch,实施时定)
```

#### `scripts/`(M3 增量)

```
scripts/
├── build-sdlpal.sh                        # 不动(M1)
├── build-sdlpal-classic.sh                # 新建(apply patches + #define PAL_CLASSIC + build)
├── run-sdlpal-baseline.sh                 # 不动(M2 的玩家视角截图工具,保留)
├── extract-tilemap-baseline.sh            # 新建(批量 dump 切片场景 map)
└── extract-battle-baseline.sh             # 新建(批量跑 fixture battle)
```

### 关键不变量

- **核心层无浏览器依赖**(M2 已建,M3 继续):battle/ 下所有文件不 import `document` / `window` / `requestAnimationFrame`。dev-panel.ts 是 shell 层 DOM 浮层,与 core 隔离。
- **GameState 是唯一真相源** —— BattleState 派生自 GameState,战斗结束写回 GameState。
- **战斗内 RNG 确定性** —— 所有 RNG 调用走 `state.rng`,seed 可注入。差分对拍 / 录制回放 / 单测都依赖此。
- **EventSystem 仍是单一执行器** —— 探索 trigger / 战斗 magic 用同一 protocol,只是 ctx 不同。D17 富模型在此体现。
- **PAL_CLASSIC 是战斗的唯一真相** —— 默认 sdlpal 不准当数值对照源,所有公式 / turn order 引用必须标 `// classic` 或注释里写明依据。
- **opcode 注册表仍单一数据源**(M1/M2 不变)—— M3 新增的战斗用具名 opcode 也走 `events/opcodes.ts` 注册表,disasm / recompile 双向对偶,round-trip 仍逐字节通过。

### 数据流(典型战斗一回合)

```
[Dev 按 B 后 startBattle 已调]
  → mode='battle', phase='preBattle'
  → 跑所有 enemy 的 wScriptOnReady(若非 0)→ EventSystem 跑这段,完成后 phase='selectAction'

[Frame T(25fps,40ms tick)]
  → tickByMode → tickBattle
  → phase=selectAction:
      若当前 selectingPlayerIdx 没设 → 找 actionQueue 中下一个队员 → setSelectingPlayerIdx
      若 selectingPlayerIdx 设 → 渲染主菜单(由 Present 消费 showBattleUI 命令)
      input.pressed=Down → 主菜单游标下移
      input.pressed=Confirm 选 Magic → 进二级菜单(法术列表)
      二级菜单选具体法术 → 进目标选择 → targetingMode='enemy'
      选好目标 → pendingAction = { type:'magic', magicId, target } → 推进 selectingPlayerIdx
      所有活队员都选完 → phase='performAction', currentActionIndex=0

[Frame T+1, performAction phase]
  → actionQueue[currentIdx] = 队员 P 的 magic action
  → actions/magic.ts:
      扣 P.mp(数值类,瞬时)
      emit playMagicAnim 命令 + waiting='magicAnim'  ← 可等待命令
      ↓ break 出 tick

[Frame T+2 .. T+N, present 层播法术动画]
  → Present 拿 playMagicAnim 命令,按 magic.wEffectTimes / wFireDelay 等绘几帧
  → 动画完成 → bus.complete(animCmdId)

[Frame T+N+1, magic.ts 接 complete]
  → 跑 magic.wScriptOnUse(EventSystem,ctx={ caster:P, target:E, magic })
  → 脚本里调 dealMagicDamage opcode → 战斗系统 calcMagicDamage(...) → 写 E.health
  → emit showDamageNum 命令 (waitable)
  → 等数字弹完
  → 状态死亡 / hp<=0 判定 → emit playEnemyDeathAnim 命令 (waitable)
  → 等放完 → currentActionIndex++ → 下一个 actor

[本轮所有 actor 行动完 / 所有敌人死]
  → phase='postAction':
      累计 expGained / cashGained(死的 enemy 的 wExp / wCash 加进来)
      若 enemyAlive=0 → phase='won' → 跑奖励结算 + 经验入账 → 切回 explore
      若 所有队员 dead → phase='lost' → 处理 game-over(M3 简版:回 explore,hp=1)
      若 phase='fleed' → 切回 explore
      否则:phase='selectAction',下一轮(buildActionQueue 重排)
```

### 错误处理

- **fixture 缺数据**(enemy id 不存在 / spell id 不存在 / 数据表加载失败):dev panel 画红 banner,不进战斗。
- **未具名战斗 opcode 撞到**:D26 默认 no-op skip + console.debug + ip++,**不抛错**。M3 实施期靠 console 日志增量补具名。
- **死循环保护**:战斗内 EventSystem `runScript` 单次调用最多跑 256 条命令(M2 已有,M3 继承)+ 战斗内单 phase 卡 60 秒报错跳出(防 enemy AI 死循环)。
- **GameState 不一致**(战斗结束后 hp 越界 / mp 负数):战斗收尾 `clampPlayerStats(gs)`,只警告 console,不抛错。
- **headless harness 失败**(sdlpal classic build 未编 / patch 应用失败):baseline 测试 skip + warn,不 fail。

### 测试策略小结

按 D21 重档路线 + D29 双基准:

| 类别 | 工具 / 形态 | M3 落地 |
|---|---|---|
| 单测 | Vitest core/ | formulas / turn-queue / battle-system / enemy-ai / event-system / actions × 5 |
| 差分对拍(数值)| sdlpal classic headless battle harness + Vitest baseline.test.ts | 5 个 fixture 战斗逐回合 JSON diff |
| 差分对拍(视觉)| sdlpal headless map dumper + Vitest tilemap-baseline.test.ts | scene 1 + M3.5 仙灵岛(若做)逐像素 diff |
| 集成 | headless 主循环 + ReplayInputSource | 1 条 E2E(走探索 → 按 B → 选 fixture → 打 → won → 回 explore) |
| 手测 | dev 验证清单 | 7.4 列出全套 |
| 回归 | events round-trip | M1/M2 全量字节级仍通过 |

## 完成定义

1. `pnpm dev` 走完 dev 验证清单(7.4):scene 1 onEnter → 按 B → 战斗 → 5 actions 都能调 → won / lost / fleed 全跑通 → exp 入账
2. `pnpm extract` 跑通,产出 7 个新 schema(enemies / items / spells / enemyTeams / battleFields / playerRoles / battle sprites);M1 / M2 已有产物字节级不变
3. `pnpm check` 全部包 typecheck + 单测绿(M1 / M2 全部测 + M3 新增,约 +50 单测)
4. 全量 events round-trip 仍逐字节通过
5. D29 双基准对拍:
   - `pnpm test:tilemap-baseline` 绿(scene 1 像素一致)
   - `pnpm test:battle-baseline` 绿(5 个 fixture 战斗逐回合一致)
6. `scripts/build-sdlpal-classic.sh` 产出 `build/sdlpal-classic/unix/sdlpal`,patch 干净 apply
7. `../03-development-plan.md` 的 M3 节状态更新到"Phase 1 已完成,Phase 2 = M3.5"
8. `../04-decisions.md` 加 D30(sdlpal classic build)和必要的 D31+(若实施过程发现新的)
9. README 当前状态更新到 M3 phase 1 已完成

## 第三方依赖

`game` 包目前 deps:`@type-pal/shared` + devDep `vite` + `jsdom` + `vitest`。M3:

- **运行时**:不加新 deps。RNG 实现自己写(8 行 mulberry32 等)。
- **构建工具**:`scripts/build-sdlpal-classic.sh` 直接复用 `build-sdlpal.sh` 的工具链。
- **sdlpal patches**:`stb_image_write.h` 已在 sdlpal 源码内(M1 verify),不需新加 dep。
- **测试**:Vitest 已有。

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| sdlpal classic build 编不出来(`#define PAL_CLASSIC 1` 触发的代码路径有 #if 1//def 之类 hack)| `build-sdlpal-classic.sh` 跑通后立即 smoke-test 启动一下,失败回到默认 build 做基准 + 列入实施过程发现;视觉基准用默认 build(等价),数值基准用 classic build,M3 先做视觉再做数值,先卡数值再回头修 classic build 也来得及 |
| sdlpal `--dump-map` patch 写起来比想象复杂(SDL surface 直 blit 到 PNG 的内存路径)| 备用方案:用 `--dump-map` 跑出 BMP 然后 `convert` 转 PNG(双工具组合);再不行用 stb_image_write 写 PPM,Node 端用 sharp 转 PNG(加 sharp dep 仅限测试) |
| 战斗公式 SHORT cast 哪里要 / 哪里不要,翻译 C → TS 时容易错 | 公式逐行 port + JSDoc 标 sdlpal 源行 + headless harness 5 个 fixture 兜底逐回合差分,任何 cast 错都立即暴露 |
| Item / Magic 的 wScriptOnUse 撞到大量未具名 opcode,具名工作量爆 | M3 fixture 用最简 fixture(只 1-2 个法术 / 物品),撞到的 opcode 数控量在 10-20 个;具名按需,raw skip 兜底(D26) |
| dev panel DOM 浮层与 core 隔离不彻底(`document.querySelector` 偷偷渗进 core) | code-review 显式查 grep;dev-panel.ts 是 shell 层,与 core 隔一道 import 边界 |
| BattleState 与 GameState 数据所有权混乱(hp 到底改哪边)| BattleState 不存 hp/mp 拷贝,只存指向 GameState 的引用(`{ playerRoleIdx: number, ... }`)或访问器函数;hp/mp 永远从 GameState 读;prevHp 拷贝拍战斗动画用 |
| 战斗 25fps 与探索 10fps 切换时主循环 tick 累计错乱 | `main-loop.ts` 每 frame 算 nextTickTime;切 mode 时清 accumulator |
| 队伍多角色(M3 内 dev fixture 可能要 1-3 个队员)与 M2 单角色硬编码硬切 | M2 GameState.party 已设计成 `{ col, row, facing }`(只队长位置)+ NPC 列表;M3 加 `partyMembers: number[](最多 5)` 含 playerRoleIds;Present 渲染只画队长(M3.5 才做尾随);战斗内全部队员都出现 |
| scripted enemy AI 完全不做,某些 fixture 敌人因为 wScriptOnReady 非 0 但 M3 跳过 → 行为不对 | fixture 挑选时避开有非零 script 的 enemy;M3 测试集中在数值类对拍(单回合普攻),M5 再覆 scripted |
| Phase 2(M3.5)被无限期推后,真"事件触发战斗"端到端永远没人做 | 03 plan 同步追加 M3.5 节,定义明确;commit 历史里 M3.5 不开始就不能宣称 M3 完整 |
