# M3.5 · scene 切换 + 明雷怪 + dev 跳仙灵岛端到端 Design

> 这是 M3.5 的**设计文档**(brainstorming 产出),只讲"做什么 / 怎么组织 / 怎么验证"。
> 配套的 step-by-step 实施计划由 writing-plans 阶段产出,落在 `docs/plans/2026-05-24-m3-5-scene-encounter.md`。

## 与全局文档的关系

- 实现 `../03-development-plan.md` 的 **M3.5 Phase 2** 节(scene 切换 + 明雷怪 + dev 跳仙灵岛端到端)。
- M3 Phase 1 完成定义留下的 8 项 follow-up(见 [`2026-05-23-m3-battle-vertical-slice.md`](2026-05-23-m3-battle-vertical-slice.md) 末尾「M3.5 准备清单」),M3.5 范围选 **缩范围 B'**:覆盖 6 项,推 2 项到 M5。
- **关键简化(用户提议)**:不走真剧情链(scene 1 onEnter 真跑完 / 多 scene 间剧情 / 仙灵岛破阵 / 桃林 / 水月宫 全部不做);**dev shortcut 直接跳到仙灵岛码头 / 入口**,然后真实走 1-2 scene + 撞草妖 + 真战斗。
- 架构 / 决策依据来自 `../02-architecture.md`(scene-system + EventSystem 协程式步进器)、`../04-decisions.md`(D26 raw skip / D29 双基准 / D30 PAL_CLASSIC build)、`../05-events-schema.md`(EventObject `triggerMode` 字段已在 M1 parse)。
- 消费 M3 Phase 1 产物:战斗骨架(battle-system + 5 actions + UI)+ D29 双基准基建 + 数据 schema 完整版。
- 参考资料:
  - `reference/sdlpal/play.c`(`PAL_PartyWalk` / scene 切换 / 明雷触发真行为)
  - `reference/sdlpal/script.c`(opcode 实施)
  - `reference/sdlpal/uibattle.c`(战斗菜单 UX 真行为,B5 input wire 参考)
  - `reference/walkthrough/flow.md`(玩家视角剧情顺序,§2 仙灵岛章节)

## 1. 范围

### 1.1 关键简化:dev shortcut 跳 scene,不走真剧情

**用户提议(2026-05-24)**:走真剧情(scene 1 → 出客栈 → 盛漁村大地图 → 码头 → 上船 → 仙灵岛)需要补大量 onEnter opcode 具名 + 多 scene 间剧情 showDialog 链 + 上船过场,工作量爆,**M3.5 做不到**。

**改方向**:用 dev panel 加 "跳 scene" 快捷键 — 直接 jump 到仙灵岛码头 / 入口 scene,程序化写 party 位置;然后**真实走 1-2 scene + 撞草妖**(明雷)→ 真战斗。

### 1.2 M3.5 做的 6 项(缩范围 B')

| 项 | 描述 | 工作量 |
|---|---|---|
| **#1 战斗 UI input wire** | tickSelectAction 真处理 Up/Down/Confirm/Cancel + uiState 子状态机(mainMenu → magicMenu / itemMenu / targetSelect)。M3 phase 1 接受的 limitation 在 M3.5 修。 | ~1 day |
| **#3 scene 切换 opcode**(精简到 1-2 个)| 只具名 `loadScene` 一个 — 让 scene 切换链路在 EventSystem 里可执行。其他 onEnter opcode(setPartyPos / setViewport / setBGM 等)继续 raw skip(D26)。 | ~0.5 day |
| **#4 明雷怪机制** | `EventObject.triggerMode` 区分接触触发(明雷 / 传送)vs Confirm 触发(NPC,M2 已建)。玩家走进 trigger cell 自动 runScript。对照 sdlpal `play.c::PAL_PartyWalk`。 | ~0.5 day |
| **#5 scene 切换链路** | `core/scene-system.ts` 扩 `loadScene(sceneId)` 卸 / 载场景资源 + 重置 GameState scene 字段;`assets/loader.ts` 加 SceneAssetsCache lazy 加载。 | ~1 day |
| **#6 仙灵岛 + 仙灵岛入口 scene 资源 dump** | pal-extract 加 2 个 scene(仙灵岛码头 + 仙灵岛入口,实施时按攻略 + scene-list 真值定 id)的 tilemap / palette / sprite + scene-NN.json(含 triggerMode 字段)。 | ~0.5 day |
| **#7 dev panel "跳 scene" shortcut** | 在 B 键 picker 加新 entry "跳仙灵岛码头" + "跳仙灵岛入口" — 程序化写 GameState.party.col/row + sceneId + 调 loadScene。 | ~0.5 day |
| **#8 baseline shim 清理** | T23 内启发式 shim 移除(M3 #5 enemy id 翻译已 done);test 直接用 startBattle。 | ~0.5 hour |

**总:~12-15 task,~4 day。**

### 1.3 不在 M3.5 范围(推 M5)

**M3 准备清单里的 #2 / #8**(D29 战斗 5/5 全亮 + draw-tilemap 残留)不做,理由跟原 design 一致。

**新增推 M5 的**:
- scene 1 onEnter 真跑完(继续硬编码起点 — M3 phase 1 已经这样)
- 真剧情多 scene 间走完(出客栈 → 盛漁村大地图 → 码头 → 仙灵岛 — 各段 showDialog / showFace / setPartyPos / setBGM 等 ~30 个 opcode 真具名)
- 仙灵岛剧情(破阵 / 桃林 / 水月宫)

### 1.4 完成定义

`pnpm dev` 浏览器:
- scene 1 onEnter 跑完 → explore(M3 现状不动)
- 按 B → picker 多了「跳仙灵岛入口」→ 程序化 loadScene + 写 party 位置
- 玩家在仙灵岛入口 scene → 方向键走几步 → 撞草妖(明雷自动触发)
- 真战斗界面打开 → 用户按 Up/Down/Confirm 真菜单
- 5 actions(攻击 / 法术 / 物品 / 防御 / 逃跑)都能调
- won / lost / fleed 全跑通 → 切回 explore(仍在仙灵岛入口)

**关键不变量**:
- D30 PAL_CLASSIC build 仍是战斗对照源
- 不开 branch,直接 commit main
- README / 公开文件 / 源码注释 不写原游戏名
- 不破坏 M3 phase 1 测试(407 + 2 skip 至少不退,只增)
- M2 探索不破坏
- events round-trip 仍逐字节通过(新具名 `loadScene` opcode 必须严格 disasm/recompile 对偶)

## 2. 组件设计

### 2.1 数据 schema 改动

#### `@type-pal/shared` `resources.ts`

**`SceneEventObject` 加 `triggerMode` 字段**:

```typescript
export interface SceneEventObject {
  id: number
  x: number
  y: number
  spriteNum: number
  triggerScript?: number
  autoScript?: number
  state?: number
  /** 触发模式:对照 sdlpal `EventObject.wTriggerMode`(M1 parse,M3.5 真消费)。
   * 实施时 grep sdlpal `play.c` 真值含义,枚举可能是:
   * - 0 = 不触发
   * - N = 明雷触发 / Confirm 触发 / 传送 / 等
   * 本字段保留 raw u16,scene-system 解读。 */
  triggerMode: number
}
```

> `EventObject.triggerMode` 已经在 M1 `pal-extract/src/io/sss.ts` parse(M2 已 verify);M3.5 修补 dump SceneEventObject 时把这个字段也 dump,运行时 scene-system 用。

### 2.2 pal-extract 增量(`packages/pal-extract/src/`)

- **`resources/scenes.ts`**(M2 已建):scene-N.json dump 时加 `triggerMode` 字段
- **scene chain dump**:cli 加 2 个 scene(仙灵岛码头 + 仙灵岛入口)— 实施时按攻略 / scene-list 真值定 id;复用 M1/M2 tilemap / palette / sprite 提取管线
- **`events/opcodes.ts`**:只具名 1 个 opcode — `loadScene`(实施时 grep sdlpal `script.c` 真 opcode 号 + operand 字段)
- **`events/disasm.ts` + `recompile.ts`**:对应 case
- **其他 onEnter opcode 继续 raw skip**(D26 兼容,EventSystem 撞到 console.debug + ip++)

### 2.3 game runtime 扩展(`packages/game/src/`)

#### `core/scene-system.ts` 加 `loadScene` 函数

```typescript
export interface SceneSwitchInput {
  gs: GameState
  sceneId: number
  assets: SceneAssetsCache
  /** party 起点位置(loadScene 后写 GameState.party)。 */
  partyStart?: { col: number; row: number; facing?: Facing }
}

/**
 * 切场景:卸载当前 scene 资源 + 加载新 scene 资源 + 重置 GameState scene 字段。
 * @returns Promise (async fetch 资源)
 */
export async function loadScene(input: SceneSwitchInput): Promise<void> {
  // 1. 加载新 scene 资源(SceneAssetsCache lazy fetch)
  const newSceneAssets = await input.assets.loadScene(input.sceneId)
  // 2. 重置 GameState scene 字段(sceneId / npcs / tilemap reference)
  input.gs.scene.id = input.sceneId
  input.gs.scene.tilemap = newSceneAssets.tilemap
  input.gs.npcs = newSceneAssets.eventObjects.map(npcFromEventObject)
  // 3. 写 party 起点
  if (input.partyStart) {
    input.gs.party.col = input.partyStart.col
    input.gs.party.row = input.partyStart.row
    if (input.partyStart.facing) input.gs.party.facing = input.partyStart.facing
  }
  // 4. 不自动跑 onEnter(M3.5 dev shortcut 跳 scene 模式不需要;真剧情走完 M5 才做)
}
```

#### `core/scene-system.ts` 加明雷机制

`tickSceneSystem` 在走路后检测 party 当前 cell 是否有 `triggerMode=contact` 的 EventObject:

```typescript
export function tickSceneSystem(gs: GameState, input: InputSnapshot, bus: CommandBus): void {
  // M2 已有:走路 / 边界 clamp / Confirm 触发 NPC
  // M3.5 加:每 tick 走路后,检测 party 当前 cell 上的 EventObject
  //   if triggerMode === CONTACT_TRIGGER_VALUE(sdlpal 真值实施时定):
  //     自动 runScript(EventObject.triggerScript),不需要 Confirm
  //     EventSystem 撞 startBattle opcode → 进战斗
}
```

> `CONTACT_TRIGGER_VALUE` 实施时按 sdlpal `play.c::PAL_PartyWalk` 真值定。可能多种 triggerMode 值各有语义(明雷 / 传送 / Confirm)— design 阶段不定死,implementer 看真值。

#### `core/event-system.ts` 加 `loadScene` opcode handler

```typescript
// 在 runScript switch 加:
case 'loadScene': {
  // EventSystem 跑到这个 opcode,emit "loadScene" 命令 → Shell / 主循环处理
  // 因为 loadScene 是 async fetch,EventSystem 不直接 await — emit + waitable 命令
  bus.emit({ op: 'loadScene', sceneId: cmd.sceneId })
  // 设 waiting='loadScene' — Shell 处理完 loadScene 后 complete cmdId,EventSystem 才 ip++
  state.waiting = 'loadScene'
  break
}
```

> 实施细节:loadScene 是 async,跨 EventSystem / Shell。M2 已建可等待命令机制(showDialog 用)— 复用同款 protocol。
> 或更简单做法:M3.5 简版 loadScene 不走 EventSystem,直接由 dev panel 的"跳 scene"按钮调用 — scene 切换 opcode 在 events.json 里仍 raw skip(不影响 dev shortcut 路线)。
> **实施时挑**:若想让 EventSystem 真消费 loadScene(为 M5 真剧情链做准备),走可等待命令机制;若只支持 dev shortcut,直接 dev panel 调 `loadScene()` 函数。**design 推荐后者(简单)**,M5 真做剧情链时再升级。

#### `core/battle/battle-system.ts` 扩 tickSelectAction(B5 input wire)

现 stub(等 pendingActions size 满)→ 真做按 uiState 处理 input:

```typescript
function tickSelectAction(state, gs, input, bus, res): void {
  const playerIdx = state.selectingPlayerIdx
  if (playerIdx === undefined) {
    // 找下一个未填 pendingAction 的活队员;若全填好 → buildActionQueue + 切 performAction
    return advanceOrSubmit(state, gs, res)
  }
  
  // 按 uiState 子状态机分支处理 input
  switch (state.uiState) {
    case 'mainMenu':
      handleMainMenuInput(state, input)
      break
    case 'magicMenu':
      handleMagicMenuInput(state, input, res.playerRoles, res.spells)
      break
    case 'itemMenu':
      handleItemMenuInput(state, input, gs.inventory, res.items)
      break
    case 'targetSelect':
      handleTargetSelectInput(state, gs, input, res.playerRoles)
      break
  }
}

// 各 handler 处理:
// - Up/Down: state.uiCursor 切
// - Confirm: 推进 uiState 或填 pendingActions[playerIdx]
// - Cancel: 退回上一级 uiState

// 关键:uiCursor 在不同 uiState 下含义不同,需要存上一级 uiCursor 以便 Cancel 还原
// 实施时考虑加 cursorStack: number[] 或 multiple cursor 字段
```

> sdlpal `uibattle.c` 真菜单 UX(grep 实施时定):mainMenu 5 项 / magicMenu 列表 / itemMenu 列表 / targetSelect 左右切 — 整体 UX 跟原版对齐,但 M3.5 简版可有偏差,后续 M5 调优

### 2.4 `assets/loader.ts` 加 SceneAssetsCache

```typescript
export class SceneAssetsCache {
  private cache: Map<number, SceneAssets> = new Map()
  
  async loadScene(sceneId: number): Promise<SceneAssets> {
    if (!this.cache.has(sceneId)) {
      // fetch /extracted/data/scene-N.json + tilemap-N.json + palette-N.json + tile bitmaps + NPC sprites
      this.cache.set(sceneId, await this.fetchSceneAssets(sceneId))
    }
    return this.cache.get(sceneId)!
  }
  
  // 不做 LRU eviction(M3.5 简版只 2-3 scene,几 MB 可接受);M5 加
}

export interface SceneAssets {
  tilemap: Tilemap
  palette: Palette
  eventObjects: SceneEventObject[]
  npcSprites: Map<number, SpriteAsset>
}
```

### 2.5 `shell/dev-panel.ts` 加 "跳 scene" 选项

参考 M3 现有 battle picker 模式,加新选项:

```typescript
// dev-panel.ts 现有 fixture picker 加 sceneJump section
const SCENE_JUMPS = [
  { id: 'scene-xiaoling-port', label: '跳仙灵岛码头', sceneId: ???, partyStart: { col: ?, row: ?, facing: 'down' } },
  { id: 'scene-xiaoling-entry', label: '跳仙灵岛入口(撞草妖)', sceneId: ???, partyStart: { col: ?, row: ? } },
]
// 实施时按攻略 + cat scene-NN.json 真值定 sceneId / partyStart

// 选 jump → 调 loadScene + 写 party
async function applySceneJump(deps, jump) {
  await loadScene({
    gs: deps.gs,
    sceneId: jump.sceneId,
    assets: deps.sceneAssetsCache,
    partyStart: jump.partyStart,
  })
}
```

## 3. 数据流

### 3.1 典型 — Dev shortcut 跳到仙灵岛入口 + 撞草妖

```
[起点:M3 phase 1 已建,scene 1 explore mode]

[玩家按 B → dev picker → 选「跳仙灵岛入口」]
  → applySceneJump(jump):
      await loadScene({ gs, sceneId: N, assets, partyStart: { col, row } })
      → SceneAssetsCache.loadScene(N) fetch (tilemap + palette + sprite + scene-NN.json)
      → gs.scene.id = N + npcs reset + party 写入
  → mode 仍 'explore',玩家在仙灵岛入口 scene

[Frame T, 玩家按 Down 多次]
  → SceneSystem.tick → party.row++,撞到 cell
  → 检测 party 当前 cell 上 EventObject:
      若 triggerMode = CONTACT(明雷)→ 自动 runScript(EventObject.triggerScript)
  → 假设 trigger 段是 `startBattle(enemyTeamId=N)` opcode
      → battle-system.startBattle 切 mode='battle'
      → 战斗界面打开

[战斗 mainMenu:M3.5 真 input wire]
  → 玩家按 Up/Down 切 uiCursor
  → 按 Confirm 选 "攻击" → state.uiState='targetSelect' + uiCursor=0 + pendingActionDraft={type:'attack'}
  → 按 Left/Right 切 target enemy(uiCursor)
  → 按 Confirm → pendingActions[0] = { type:'attack', target: 0 } + advanceSelectingPlayer
  → 全队员填好 → phase='performAction'
  → tickPerformAction 跑 enemy AI + 队员 action → damage 数字
  → tickPostAction 判 won → finalizeBattle
  → mode='explore',仍在仙灵岛入口 scene
```

### 3.2 关于 loadScene 是否走 EventSystem

**两种实现选择(implementer 决策)**:

| 方式 | 优点 | 缺点 |
|---|---|---|
| **A. EventSystem 通过 emit 命令 + 可等待**(loadScene 作为可等待命令)| 与 M5 真剧情链铺路一致 | 复杂(async 跨 EventSystem / Shell + 协程挂起恢复)|
| **B. dev panel 直接调 loadScene 函数,events.json 里 loadScene opcode 继续 raw skip** | 简单(M3.5 范围 dev shortcut 模式不需要 EventSystem 知道 loadScene)| M5 真剧情链时仍需要扩,本 M3.5 不算彻底 |

**M3.5 推荐 B**(更简,scope 缩),M5 升级到 A。

## 4. 错误处理

- **scene 资源 fetch 失败**:loadScene 抛错,Shell 画红字 `scene N failed: <path>`,fallback 回原 scene
- **EventObject.triggerMode 值未知**:`console.debug` 跳过,M3.5 不抛错(D26 类比)
- **opcode 撞到未具名**:D26 raw skip(已建)
- **input wire 跨 uiState 卡死**:phaseStallTicks 兜底(T22 已有)+ Cancel 总是回到合理 fallback uiState
- **战斗结束 finalize**:不变(M3 phase 1)

## 5. 测试策略

### 5.0 测试组划分原则(用户 2026-05-24 关键澄清)

测试**按功能域分组,各自独立维护**。每个功能域有自己的测试文件,验证该功能本身,**不验证跨功能域的整链路流程**。整链路流程测试(真实游戏跑完关卡)推**全工程都完工的最后阶段**做。

M3.5 之内 / 历史已建 / 后续里程碑会有的功能域测试组(按完成顺序):

| 测试组 | 关注点 | 状态 |
|---|---|---|
| **场景** | tilemap 加载 / 角色移动 / 边界 clamp / **loadScene 切换 / SceneAssetsCache** | M2 已建,M3.5 扩 |
| **战斗** | 直接构造 BattleState 跑战斗,测 input wire / 5 actions / phase 状态机 / 公式 / **未来合体技能等** | M3 已建,M3.5 加 input wire |
| **明雷遇怪机制** | party 走进 `triggerMode=contact` cell → 自动 runScript 触发 startBattle | **M3.5 新** |
| **探索对话** | NPC.triggerScript Confirm 触发 + 协程式 showDialog | M2 已建 |
| **拾取道具 / 开箱 / 触发机关 / 等** | EventObject 触发各种 sub-genre | 未来里程碑 |

**禁忌**:M3.5 **不做**真实游戏流程的 E2E 测试(`scene jump → 走入草妖 → 进战斗 → 任意打 → won → 回 explore` 这种端到端)— 那是所有功能域都完工之后的总验收。M3.5 只做各功能域**独立**测试。

### 5.1 场景功能域测试组(M3.5 扩,`scene-system.test.ts`)

M2 已有走路 / 边界 clamp / NPC Confirm 触发 等。M3.5 加:

- `loadScene` 切换:mock SceneAssetsCache + 调 loadScene → 验证旧 scene 资源卸载、新 scene 资源装入 GameState、party 起点正确写入
- `SceneAssetsCache` lazy 行为:第一次 loadScene(N) fetch,第二次 cache hit(verify mock fetch 只被调用 1 次)
- M3.5 不破坏 M2 走路 / 边界 clamp / Confirm NPC 触发(M2 测试集成回归)

### 5.2 战斗功能域测试组(M3 已建 + M3.5 加 input wire,`battle-system.test.ts` + `actions.test.ts` + 等)

M3 已有 50+ 个单测覆盖 phase 状态机 + 5 actions + 公式。M3.5 加 input wire:

- mainMenu Up/Down 切 uiCursor 行为
- mainMenu Confirm 选攻击 → uiState 切 targetSelect
- mainMenu Confirm 选法术 → uiState 切 magicMenu
- mainMenu Confirm 选物品 → uiState 切 itemMenu
- mainMenu Confirm 选防御 / 逃跑 → 直接填 pendingActions + advanceSelectingPlayer
- magicMenu Up/Down 切 + Confirm → 进 targetSelect
- itemMenu Up/Down 切 + Confirm → 进 targetSelect
- targetSelect Left/Right 切 target + Confirm → 填 pendingActions
- **Cancel 退回**:targetSelect → 上一菜单;magicMenu / itemMenu → mainMenu
- 多队员 select 推进:全填好 → buildActionQueue + 切 performAction

测试方式:**直接构造 BattleState** 喂 InputSnapshot 序列 → 断言 state.uiState / state.uiCursor / state.pendingActions 转换。不跑真渲染、不跨 scene。

**M3.5 不做(推 M5)**:合体技能(co-op magic)/ 觉醒 / Trance / Summon / 五行属性 / 状态效果。这些都在战斗功能域内,但实现工作量超 M3.5。

### 5.3 明雷遇怪机制功能域测试组(M3.5 新,`scene-encounter.test.ts`)

**只测机制**:party 走进 `triggerMode=contact` 的 EventObject cell → scene-system 自动调 runScript → mode 切到 battle。

- fixture:scene 含 1 个 triggerMode=contact 的 EventObject 在 (col, row) + triggerScript = N
- 喂 ReplayInputSource 移动 party 到 (col, row) → 自动 runScript(N) → 假设 N 对应 startBattle 脚本 → mode='battle'
- 反例 1:triggerMode 不是 contact → 走进不触发(等 Confirm 才行,M2 旧行为)
- 反例 2:已经被 collide(state=hidden 等)的 EventObject → 走进不触发

**不测**(那是其他功能域的事):
- 战斗本身怎么打(战斗组测)
- 战斗结束后回 explore(战斗组的 finalizeBattle 测)
- 完整 dev panel jump scene 跑通整链路(真实流程,推全工程完工)

### 5.4 pal-extract 其他单测

- `scenes.test.ts` 加 triggerMode 字段 dump 测试
- `events/disasm.test.ts` 加 loadScene opcode round-trip 测试
- 现有 baseline.test.ts shim 清理(M3 #5 enemy id 翻译已 done):test 直接用 startBattle,移除 startBattleWithObjectIdMap 启发式

### 5.5 D29 视觉 baseline 扩展

- 仙灵岛码头 + 仙灵岛入口 mapNum 加入 `scripts/extract-tilemap-baseline.sh` MAPS 数组
- `tilemap-baseline.test.ts` 多场景 pixel diff(M3 单 scene → M3.5 3 scene 自动迭代)

### 5.6 dev manual smoke(可选,不作自动 E2E,只本人手测)

跑 dev server 看视觉:`pnpm dev` → scene 1 onEnter → B picker → 跳仙灵岛入口 → 方向键走几步 → 自动进战斗 → 菜单 / 数字弹 visible → won → 回 explore。不写自动测试(D35 禁忌)。

## 6. 模块组织

### `packages/game/src/`(M3.5 增量)

```
packages/game/src/
├── core/
│   ├── scene-system.ts                  # 改:加 loadScene 函数 + 明雷机制
│   └── battle/
│       └── battle-system.ts             # 改:tickSelectAction 真 input wire
├── assets/
│   └── loader.ts                        # 改:加 SceneAssetsCache lazy 加载
├── shell/
│   └── dev-panel.ts                     # 改:加 "跳 scene" picker entries
├── data/
│   └── scene-jumps.json                 # 新:dev panel 跳 scene 预设(sceneId + partyStart)
└── __tests__/
    └── e2e-scene-encounter.test.ts      # 新:E2E
```

### `packages/pal-extract/src/`(M3.5 增量)

```
packages/pal-extract/src/
├── resources/
│   └── scenes.ts                        # 改:SceneEventObject 加 triggerMode + scene chain dump 加 2 个 scene
├── events/
│   ├── opcodes.ts                       # 改:加 loadScene 1 个 opcode 具名
│   ├── disasm.ts                        # 改:对应 case
│   └── recompile.ts                     # 改:对应 case
└── cli.ts                               # 改:总装 scene chain(scene 1 + 仙灵岛码头 + 仙灵岛入口)
```

### `packages/shared/src/`(M3.5 增量)

```
packages/shared/src/
└── resources.ts                         # 改:SceneEventObject 加 triggerMode
```

### `scripts/` + `build/`(M3.5 增量)

```
scripts/
└── extract-tilemap-baseline.sh          # 改:MAPS 数组加仙灵岛码头 + 仙灵岛入口 mapNum

build/sdlpal-baseline/
└── maps/
    ├── map-12.png                       # M3 已有
    └── map-NN.png                       # M3.5 新:2 个 scene 各 baseline
```

## 7. 完成定义

1. ✅ 场景功能域测试组绿(§5.1:loadScene + SceneAssetsCache + M2 走路 / 边界 / Confirm NPC 回归)
2. ✅ 战斗功能域测试组绿(§5.2:M3 已建 50+ 测 + M3.5 加 ~10 input wire 测)
3. ✅ 明雷机制功能域测试组绿(§5.3:走进 contact cell 自动 runScript + 反例验证 triggerMode 区分 + state 区分)
4. ✅ pal-extract 单测绿(§5.4:triggerMode 字段 + loadScene round-trip + baseline shim 清理)
5. ✅ `pnpm extract` 跑通,产出含 scene chain(scene 1 + 仙灵岛码头 + 仙灵岛入口)+ SceneEventObject 含 triggerMode
6. ✅ `pnpm check` 全过(M3 phase 1 = 407 + 2 skip;M3.5 ≥ 420 + 2 skip)
7. ✅ events round-trip 仍逐字节通过(loadScene 新具名 opcode 必须严格对偶)
8. ✅ D29 视觉 baseline 3 场景全过(scene 1 + 仙灵岛码头 + 仙灵岛入口 像素一致)
9. ✅ M3 phase 1 input wire limitation 修(战斗功能域测试组验证)
10. ✅ Dev 手测烟雾:`pnpm dev` → B 跳仙灵岛入口 → 走几步撞草妖 → 战斗界面 / 主菜单 / 数字弹幕 visible(visual smoke;**不是 automated E2E**)
11. ✅ `../03-development-plan.md` 的 M3.5 状态更新到"已完成"
12. ✅ M3.5 实施过程发现写在本 plan 末尾(implementation gap / sdlpal 真值偏差 / 改进建议)

> **注**:用户 2026-05-24 明确:真实游戏流程的 automated E2E(从 scene jump 到回 explore 全链路) **不做**,推全工程都完工的最后阶段。M3.5 只做各功能域独立单测 + dev manual smoke。

## 8. 第三方依赖

无新增。Vite / Vitest / TypeScript 已有。

## 9. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 仙灵岛码头 / 入口 scene id 错(攻略 + scene-list 真值需 verify)| 实施时 cat data/extracted/data/scene-list / scene-N.json + grep 攻略章节 verify 对应 sceneId,失误就改 |
| 仙灵岛 tilemap / palette 解析与 scene 1 不同导致 D29 测试失败 | sdlpal headless dump 加新 mapNum baseline 对照,失败立即 visual diff |
| 明雷机制 sdlpal `play.c::PAL_PartyWalk` 真行为复杂(triggerMode 多种值)| 实施时 grep 真值 + 简化为 binary `isContact`(M3.5 simplification) + 实施过程发现记录 |
| input wire 子状态机比预想复杂(magic 二级菜单 + targetSelect 协调)| 本 design §2.3 已给 sketch + state 转换表;实施时按 sdlpal `uibattle.c` 真菜单 UX 对齐 |
| loadScene async 跨 EventSystem(若选 A)| 推荐 B 路线 — dev panel 直接调 loadScene 函数,events 中 loadScene opcode 仍 raw skip,M5 真做剧情链时升级 |
| 仙灵岛 enemyTeam(草妖)在 sdlpal 真值与我们能找到的不一致 | 实施时按 walkthrough §2 仙灵岛章节定真 enemyTeamId + cat enemy-teams.json verify(对照 _names 中"草妖" / "妖") |
| 跨 scene 切换累计 SceneAssetsCache 内存爆 | M3.5 简版不做 eviction(只 3 scene,< 10MB);M5 加 LRU |

## 10. 决策同步进 04(已 commit:D32 / D33 / D34 / D35)

brainstorm 期间钉的决策已写进 `../04-decisions.md`:

- **D32 · 明雷怪机制 = `EventObject.triggerMode` 自动 runScript**
- **D33 · scene chain 资源加载 lazy(SceneAssetsCache)**
- **D34 · M3.5 dev shortcut 跳 scene,不走真剧情链**
- **D35 · 测试按功能域独立分组,不做真实游戏流程 E2E(推全工程完工最后)**
