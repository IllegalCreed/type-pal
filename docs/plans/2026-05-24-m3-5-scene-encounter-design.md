# M3.5 · scene 切换 + 明雷怪 + dev 跳仙灵岛 + L2 一次性补齐 Design

> 这是 M3.5 的**设计文档**(brainstorming 产出),只讲"做什么 / 怎么组织 / 怎么验证"。
> 配套的 step-by-step 实施计划由 writing-plans 阶段产出,落在 `docs/plans/2026-05-24-m3-5-scene-encounter.md`。

## 与全局文档的关系

- 实现 `../03-development-plan.md` 的 **M3.5 Phase 2** 节(scene 切换 + 明雷怪 + dev 跳仙灵岛端到端 + L2 一次性补齐)。
- M3 Phase 1 完成定义留下的 8 项 follow-up(见 [`2026-05-23-m3-battle-vertical-slice.md`](2026-05-23-m3-battle-vertical-slice.md) 末尾「M3.5 准备清单」),M3.5 范围:
  - 6 项功能改动(主体)
  - **L2 视觉端到端 23 个 case 一次性补齐**(M1 → M3.5 累积所有功能点)
- **关键简化(D34)**:不走真剧情链;**dev shortcut 直接跳到仙灵岛码头 / 入口**,然后真实走 1-2 scene + 撞草妖 + 真战斗。
- **关键测试分层(D35)**:六层分类(L1a/b/c/d + L2 + L3),L2 / L3 是**用户视觉关注**的两层,L3 推 M7。
- 架构 / 决策依据来自 `../02-architecture.md`、`../04-decisions.md`(D26 raw skip / D29 双基准 / D30 PAL_CLASSIC build / D32-D35)、`../05-events-schema.md`(EventObject `triggerMode` 字段已在 M1 parse)。
- 消费 M3 Phase 1 产物:战斗骨架 + D29 双基准 + 数据 schema 完整版。
- 参考资料:
  - `reference/sdlpal/play.c`(`PAL_PartyWalk` / scene 切换 / 明雷触发真行为)
  - `reference/sdlpal/script.c`(opcode 实施)
  - `reference/sdlpal/uibattle.c`(战斗菜单 UX 真行为,B5 input wire 参考)
  - `reference/walkthrough/flow.md`(玩家视角剧情顺序,§2 仙灵岛章节)

---

## 1. 范围

### 1.1 关键简化:dev shortcut 跳 scene,不走真剧情(D34)

走真剧情链(scene 1 onEnter → 出客栈 → 盛漁村大地图 → 码头 → 上船 → 仙灵岛)需补 ~30 个 onEnter opcode 真具名 + 大段 showDialog/showFace/setBGM 链,工作量爆,**M3.5 做不到**。改方向:dev panel 加 "跳 scene" 快捷键,真实走 1-2 scene + 撞草妖 + 真战斗。

### 1.2 M3.5 主体 6 项功能(缩范围 B')

| 项 | 描述 |
|---|---|
| **F1 战斗 UI input wire** | tickSelectAction 真处理 Up/Down/Confirm/Cancel + uiState 子状态机(mainMenu → magicMenu / itemMenu / targetSelect)。修 M3 phase 1 接受的 limitation。 |
| **F2 scene 切换链路** | `core/scene-system.ts` 扩 `loadScene(sceneId)` + `assets/loader.ts` 加 `SceneAssetsCache` lazy(D33)。 |
| **F3 明雷怪机制** | `EventObject.triggerMode=contact` 自动 runScript(D32),对照 sdlpal `play.c::PAL_PartyWalk`。 |
| **F4 scene 切换 opcode** | 只具名 `loadScene` 1 个;其他 onEnter opcode 继续 raw skip(D26)。 |
| **F5 仙灵岛资源 dump** | pal-extract 加 2 个 scene(仙灵岛码头 + 仙灵岛入口)tilemap / palette / sprite + scene-NN.json(含 triggerMode 字段)。 |
| **F6 dev panel "跳 scene"** | B 键 picker 加新 entries 跳到任意 scene + 写 party 位置。 |

### 1.3 M3.5 L2 视觉端到端 23 case 一次性补齐(用户关注核心)

用户在 M3.5 之前**视觉看到的只有"一个场景六个房间"**(scene 1 客栈)。M3.5 一次填全 M1-M3.5 所有功能点的 L2 case,后续 milestone 不补历史。

见 §5 测试策略 详细 case 列表。

### 1.4 不在 M3.5 范围(推 M5 / M6 / M7)

- D29 战斗 baseline 5/5 全亮(spell/item OBJECT→id 翻译 + D4 物理公式 trace):**推 M5**
- runtime draw-tilemap.ts Bug A/C 残留修:**推 M5**
- 真剧情链(出客栈 → 盛漁村大地图 → 码头 → 仙灵岛 + 仙灵岛剧情破阵 / 桃林 / 水月宫):**推 M5**
- 状态效果完整集 / scripted enemy AI / battlefield 元素 buff / 合体技能 / 觉醒 / 装备:**推 M5**
- 主菜单 / 大世界菜单(暂停 / inventory / 装备 / 状态 / 商店):**推 M5/M6**
- 视频(AVI 过场):**推 M6**
- 音频(BGM / 音效 / 战斗声音):**推 M6**
- M3 历史 `e2e-battle.test.ts` 改造成 Playwright:**推 M7**
- 完整游戏流程 E2E(Layer 3):**推 M7 通关验证**

### 1.5 完成定义

见 §7 完成定义。

---

## 2. 关键不变量

- **D30 PAL_CLASSIC build 仍是战斗对照源**
- **不开 branch,直接 commit main**(memory:solo)
- **README / 公开文件 / 源码注释 不写原游戏名**(版权)
- **L2 baseline PNG 不入 git**(版权,本机生成存 `packages/game/e2e/baselines/`,加进 `.gitignore`)
- 不破坏 M3 phase 1 测试(`pnpm check` 407 + 2 skip 至少不退,只增)
- M2 探索功能不破坏
- events round-trip 仍逐字节通过(`loadScene` 新具名 opcode 严格 disasm/recompile 对偶)

---

## 3. 组件设计

### 3.1 数据 schema 改动

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

### 3.2 pal-extract 增量(`packages/pal-extract/src/`)

- **`resources/parsers/scenes.ts`** (或 M2 实际位置):scene-N.json dump 时加 `triggerMode` 字段
- **scene chain dump**:cli 加 2 个 scene(仙灵岛码头 + 仙灵岛入口)— 实施时按攻略 + scene-list 真值定 id
- **`events/opcodes.ts`**:只具名 1 个 opcode — `loadScene`
- **`events/disasm.ts` + `recompile.ts`**:对应 case
- **其他 onEnter opcode 继续 raw skip**(D26)

### 3.3 game runtime 扩展(`packages/game/src/`)

#### `core/scene-system.ts` 加 `loadScene` 函数

```typescript
export interface SceneSwitchInput {
  gs: GameState
  sceneId: number
  assets: SceneAssetsCache
  partyStart?: { col: number; row: number; facing?: Facing }
}

export async function loadScene(input: SceneSwitchInput): Promise<void> {
  // 1. SceneAssetsCache lazy fetch 新 scene 资源
  const newSceneAssets = await input.assets.loadScene(input.sceneId)
  // 2. 重置 GameState scene 字段
  input.gs.scene.id = input.sceneId
  input.gs.scene.tilemap = newSceneAssets.tilemap
  input.gs.npcs = newSceneAssets.eventObjects.map(npcFromEventObject)
  // 3. 写 party 起点
  if (input.partyStart) {
    input.gs.party.col = input.partyStart.col
    input.gs.party.row = input.partyStart.row
    if (input.partyStart.facing) input.gs.party.facing = input.partyStart.facing
  }
  // 4. 不自动跑 onEnter(M3.5 dev shortcut 模式不需要;真剧情链 M5 才做)
}
```

#### `core/scene-system.ts` 加明雷机制

```typescript
export function tickSceneSystem(gs: GameState, input: InputSnapshot, bus: CommandBus): void {
  // M2 已有:走路 / 边界 clamp / NPC Confirm 触发 / NPC 阻挡 / 相机 follow
  // M3.5 加:每 tick 走路后,检测 party 当前 cell 上 EventObject:
  //   if triggerMode === CONTACT_TRIGGER_VALUE(sdlpal 真值实施时定):
  //     自动 runScript(EventObject.triggerScript),不需要 Confirm
}
```

`CONTACT_TRIGGER_VALUE` 实施时按 sdlpal `play.c::PAL_PartyWalk` 真值定;可能多种 triggerMode 值各有语义(明雷 / 传送 / Confirm)。M3.5 简版按 binary 区分。

#### `core/event-system.ts` `loadScene` opcode handler

M3.5 选 **B 路线简单方案**:dev panel 直接调 `loadScene()` 函数;events.json 里 `loadScene` opcode 仍 raw skip(D26)。M5 真做剧情链时升级到 EventSystem 通过可等待命令 emit + Shell 处理(A 路线)。

#### `core/battle/battle-system.ts` 扩 `tickSelectAction`(F1 input wire)

```typescript
function tickSelectAction(state, gs, input, bus, res): void {
  const playerIdx = state.selectingPlayerIdx
  if (playerIdx === undefined) {
    return advanceOrSubmit(state, gs, res)  // 推进下一队员或全填好 → performAction
  }
  
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

// 各 handler:
// - Up/Down: state.uiCursor 切
// - Confirm: 推进 uiState 或填 pendingActions[playerIdx]
// - Cancel: 退回上一级 uiState
```

`uiCursor` 在不同 uiState 下含义不同,需要存上一级 uiCursor 以便 Cancel 还原(实施时考虑加 `cursorStack: number[]` 或 multiple cursor 字段)。

### 3.4 `assets/loader.ts` 加 `SceneAssetsCache`

```typescript
export class SceneAssetsCache {
  private cache: Map<number, SceneAssets> = new Map()
  
  async loadScene(sceneId: number): Promise<SceneAssets> {
    if (!this.cache.has(sceneId)) {
      this.cache.set(sceneId, await this.fetchSceneAssets(sceneId))
    }
    return this.cache.get(sceneId)!
  }
  // M3.5 不做 LRU eviction(scope 小,< 10MB);M5 加
}

export interface SceneAssets {
  tilemap: Tilemap
  palette: Palette
  eventObjects: SceneEventObject[]
  npcSprites: Map<number, SpriteAsset>
}
```

### 3.5 `shell/dev-panel.ts` 加 "跳 scene" 选项

```typescript
const SCENE_JUMPS = [
  { id: 'scene-1', label: '跳 scene 1(客栈)', sceneId: 1, partyStart: { col: ???, row: ???, facing: 'down' } },
  { id: 'scene-xiaoling-port', label: '跳仙灵岛码头', sceneId: ???, partyStart: { ... } },
  { id: 'scene-xiaoling-entry', label: '跳仙灵岛入口(撞草妖)', sceneId: ???, partyStart: { ... } },
]
// 实施时按攻略 + cat scene-NN.json 真值定 sceneId / partyStart

async function applySceneJump(deps, jump) {
  await loadScene({
    gs: deps.gs,
    sceneId: jump.sceneId,
    assets: deps.sceneAssetsCache,
    partyStart: jump.partyStart,
  })
}
```

---

## 4. 数据流

### 4.1 典型 — Dev shortcut 跳到仙灵岛入口 + 撞草妖 + 真战斗

```
[起点:M3 phase 1 已建,scene 1 explore mode]

[玩家按 B → dev picker → 选「跳仙灵岛入口」]
  → applySceneJump:await loadScene({ gs, sceneId: N, assets, partyStart })
  → SceneAssetsCache.loadScene(N) fetch
  → gs.scene.id = N + npcs reset + party 写入
  → mode 仍 'explore',玩家在仙灵岛入口 scene

[玩家按 Down 多次]
  → SceneSystem.tick → party.row++,撞到 cell
  → 检测 party 当前 cell 上 EventObject:
      若 triggerMode = CONTACT(明雷)→ 自动 runScript(triggerScript)
  → triggerScript 是 startBattle 脚本 → mode='battle'

[战斗 mainMenu:M3.5 真 input wire]
  → 按 Up/Down 切 uiCursor
  → 按 Confirm 选 "攻击" → uiState='targetSelect' + pendingActionDraft={type:'attack'}
  → 按 Left/Right 切 target enemy
  → 按 Confirm → pendingActions[0] = { type:'attack', target } + advanceSelectingPlayer
  → 全队员填好 → phase='performAction'
  → tickPerformAction 跑 enemy AI + 队员 action → damage 数字
  → 多回合 → won → finalizeBattle → mode='explore',仍在仙灵岛入口
```

---

## 5. 测试策略

### 5.0 六层测试分类(D35)

| 层 | 名字 | 描述 | 工具 | 用户关注 |
|---|---|---|---|---|
| **L1a** | 纯单元测试 | 单函数 / 单 class,无依赖、纯算法 | Vitest(`pnpm check`)| ❌ |
| **L1b** | 模块集成测试 | 多 module 联动跑某个功能模块,可能 mock 外部依赖 | Vitest | ❌ |
| **L1c** | Headless 集成 / 流程 | 启动主循环但程序化喂 input,无真渲染 | Vitest | ❌ |
| **L1d** | 数据 round-trip / 字节对拍 | 数据 / 资源 / 字节级 baseline,不跑 game | Vitest | ❌ |
| **L2** | 独立功能点端到端 | dev server + Playwright 真浏览器 + 真 canvas 渲染。dev shortcut 跳进单一功能点 → 截图验证视觉 + 模拟 input 验证交互 | Playwright(`pnpm e2e`)| **✅ 关注** |
| **L3** | 游戏完整流程端到端 | scene 1 onEnter 真开始 → 跑真剧情链 → 全程到结局 | Playwright + 长 ReplayInputSource | **✅ 关注,推 M7** |

**M3.5 内做 L1a/b/c/d + L2;不做 L3**。M3 历史 `e2e-battle.test.ts` 归 L1c(M3.5 不改造,推 M7 一起改 Playwright)。

### 5.1 L1a 纯单元测试(M3.5 增量)

- `loadScene` 函数 mock 测试(纯调用 + 状态修改)
- 明雷机制 helper 函数(triggerMode 解读 / 触发判定)
- (M3 已有 50+ 测,保留)

### 5.2 L1b 模块集成测试(M3.5 增量)

- `scene-system.test.ts` 加:`loadScene` 切换(mock SceneAssetsCache + verify 资源切换 + GameState reset)
- `scene-system.test.ts` 加:`SceneAssetsCache` lazy 行为(第一次 fetch,第二次 cache hit)
- `scene-system.test.ts` 加:明雷机制(party 走进 contact cell → 自动 runScript)+ 反例(triggerMode 非 contact / state=hidden 跳过)
- `battle-system.test.ts` 加:input wire ~10 测(mainMenu Up/Down/Confirm/Cancel + magicMenu / itemMenu / targetSelect + 多队员推进)
- `event-system.test.ts` 加:`loadScene` opcode 单测(handler 行为)

### 5.3 L1c Headless 集成(M3.5 不动)

- M3 `e2e-battle.test.ts`(attack-to-won / flee-to-fleed,headless tick + 程序化喂 input):保留,不改造
- 改造成 Playwright 推 M7 通关验证一起做

### 5.4 L1d 数据 round-trip / 字节对拍(M3.5 增量)

- `parsers/scenes.test.ts` 加:`triggerMode` 字段 dump 测试
- `events/disasm.test.ts` 加:`loadScene` opcode round-trip 测试
- baseline.test.ts shim 清理(M3 phase 1 `startBattleWithObjectIdMap` 启发式 → test 直接用 startBattle,enemy id 翻译已 done)
- D29 视觉 baseline 多场景扩展:`scripts/extract-tilemap-baseline.sh` MAPS 数组加仙灵岛码头 + 仙灵岛入口 mapNum;`tilemap-baseline.test.ts` 多场景 pixel diff

### 5.5 L2 独立功能点 Playwright E2E(用户关注 — 23 case 一次性补)

**总览**:23 个 case,按用户视角分大类。每个 case 一个 spec 文件(或 spec 内多 test),都用 Playwright + dev server + canvas pixel diff(`pixelmatch`)。

**baseline PNG 存储**:`packages/game/e2e/baselines/` —— **不入 git**(`packages/game/e2e/baselines/` 加进 `.gitignore`),本机首次跑 `pnpm e2e --update-baselines` 生成,后续 `pnpm e2e` pixel diff vs 本机 baseline。

#### a 组 · 场景渲染 / 探索(9 case)

| id | case | 验证 |
|---|---|---|
| **L2-a1** | tilemap 渲染像素一致 | scene 1 / 仙灵岛码头 / 仙灵岛入口 各跳进后截图,跟本机 baseline pixel diff;**只覆盖整图(camera-clipped viewport),不涉及 sdlpal classic baseline 那种全图 4096×2056** |
| **L2-a2** | 队长 sprite 渲染 | bootstrap 完成后,party 在期望 cell + sprite 在期望像素区域;按 ArrowRight 后 facing='right' + 在新 cell |
| **L2-a3** | NPC sprite 渲染 | scene 1 所有 NPC 都画出来(snapshot 列出 NPC 位置) |
| **L2-a4** | 走路移动 | ArrowDown × 5 → party.row +5;ArrowUp × 5 → 回到原位 |
| **L2-a5** | 边界 clamp | party 在地图边走 → 不动(snapshot 位置不变) |
| **L2-a6** | 撞 NPC 阻挡 | party 走向 NPC 占的 cell → 不动(NPC cell 仍是 NPC,party 停在前一格) |
| **L2-a7** | 相机 follow | party 走到地图右侧 → camera.col 增加,visual 看到 tilemap 滚 |
| **L2-a8** | scene 切换(M3.5 新) | 跳 scene 1 vs 跳仙灵岛入口 → 截图 visual diff(预期不同 tilemap) |
| **L2-a9** | 明雷遇怪(M3.5 新) | 跳仙灵岛入口 → 走到 contact cell → snapshot mode='battle'(画面是战斗界面) |

#### b 组 · 战斗(7 case)

| id | case | 验证 |
|---|---|---|
| **L2-b1** | 战斗背景渲染 | 跳 fixture → 截图战斗背景(FBP chunk),visual sanity |
| **L2-b2** | 双方 sprite 渲染 | 截图含队员 + enemy sprite 位置 |
| **L2-b3** | HP/MP 状态栏 | 截图含 HP / MP 数字(可 OCR 或 visual diff) |
| **L2-b4** | 攻击数字弹幕 | perform attack → 截图含黄 / 蓝色数字飘上去 |
| **L2-b5** | won 切回 explore | 战斗结束 → 截图变成 explore 界面 |
| **L2-b6** | lost / fleed 切回 explore | 同上,fleed / lost 路径 |
| **L2-b7** | dev panel 触发战斗 | B → picker visible → 选 fixture → 进战斗界面 |

#### c 组 · 菜单(6 case)

| id | case | 验证 |
|---|---|---|
| **L2-c1** | 对话框 4 style 区分 | M2 对话框 4 种 style(top / center / bottom / narration)各跳到对应 trigger,截图 visual diff |
| **L2-c2** | 战斗主菜单 | 跳进战斗 → 截图主菜单 5 项可见 + Up/Down cursor 移动截图差异 |
| **L2-c3** | 战斗法术二级菜单 | 主菜单选法术 → 截图法术列表 + Up/Down 切 + Cancel 回主菜单 |
| **L2-c4** | 战斗物品二级菜单 | 同上,物品 |
| **L2-c5** | 战斗目标选择光标 | magicMenu / itemMenu / attack → targetSelect → Left/Right 切 + 光标变化 |
| **L2-c6** | dev panel picker DOM 浮层 | B → DOM 浮层弹出 + 3 fixture 项目可见 + Cancel 关闭 |

#### f 组 · dev 工具(1 case)

| id | case | 验证 |
|---|---|---|
| **L2-f1** | F1 dump GameState | 按 F1 → console message 含 GameState JSON dump |

**M3.5 L2 合计:a(9) + b(7) + c(6) + f(1) = 23 case**

### 5.6 未来 L2 大类(M5 / M6,M3.5 不做但 design 标)

| 大类 | 描述 | 推到 |
|---|---|---|
| **菜单扩展** | 标题画面 / 大世界菜单 / inventory / 装备 / 状态 / 商店 | M5 |
| **视频** | AVI 过场 / 片头 / 片尾 / 剧情过场 | M6 |
| **音频** | BGM(MIDI 合成)/ 音效 / 战斗声音 | M6 |
| **探索 sub-genre** | 拾取道具 / 开箱 / 触发机关 / 等 | M5 |

### 5.7 测试跑法

- `pnpm check` — Vitest(L1a/b/c/d 全跑,快)
- `pnpm e2e` — Playwright(L2 全跑,慢,需 launch chromium + dev server)
- 两者各自工作流;CI 跑 e2e 是未来 milestone 的事(本 milestone 主要本地用)
- Baseline PNG 首次跑 `pnpm e2e --update-baselines` 生成,后续 pixel diff vs 本机 baseline。版权:**baseline 不入 git**,每个 dev 本机自己生成。

### 5.8 dev manual smoke(可选)

`pnpm dev` 手测 → B picker → 跳仙灵岛入口 → 自动 L2 覆盖外的手测。M3.5 L2 全覆盖后 manual smoke 主要做 sanity 用。

---

## 6. 模块组织

### `packages/game/src/`(M3.5 增量)

```
packages/game/src/
├── core/
│   ├── scene-system.ts                  # 改:加 loadScene 函数 + 明雷机制
│   ├── scene-system.test.ts             # 改:L1b 加 loadScene + 明雷机制单测
│   ├── event-system.ts                  # 改:加 loadScene opcode handler(stub,M3.5 不主用)
│   └── battle/
│       ├── battle-system.ts             # 改:tickSelectAction 真 input wire
│       └── __tests__/
│           └── battle-system.test.ts    # 改:L1b 加 input wire ~10 测
├── assets/
│   └── loader.ts                        # 改:加 SceneAssetsCache lazy 加载
├── shell/
│   └── dev-panel.ts                     # 改:加 "跳 scene" picker entries
└── data/
    └── scene-jumps.json                 # 新:dev panel 跳 scene 预设(sceneId + partyStart)
```

### Playwright E2E(M3.5 新,L2)

```
packages/game/
├── playwright.config.ts                 # 新
├── e2e/
│   ├── helpers/
│   │   ├── bootstrap.ts                 # 新:复用 setup(启 server / 等 onEnter / dev panel hook)
│   │   ├── pixel-diff.ts                # 新:pixelmatch wrapper
│   │   └── snapshot.ts                  # 新:canvas → PNG → diff vs baseline
│   ├── scene/                           # a 组 9 case
│   │   ├── a1-tilemap-render.spec.ts
│   │   ├── a2-leader-sprite.spec.ts
│   │   ├── a3-npc-sprite.spec.ts
│   │   ├── a4-walk.spec.ts
│   │   ├── a5-boundary-clamp.spec.ts
│   │   ├── a6-npc-block.spec.ts
│   │   ├── a7-camera-follow.spec.ts
│   │   ├── a8-scene-switch.spec.ts
│   │   └── a9-encounter.spec.ts
│   ├── battle/                          # b 组 7 case
│   │   ├── b1-bg-render.spec.ts
│   │   ├── b2-sprites.spec.ts
│   │   ├── b3-hpmp-status.spec.ts
│   │   ├── b4-damage-num.spec.ts
│   │   ├── b5-won-to-explore.spec.ts
│   │   ├── b6-lost-or-fleed.spec.ts
│   │   └── b7-dev-trigger.spec.ts
│   ├── menu/                            # c 组 6 case
│   │   ├── c1-dialog-styles.spec.ts
│   │   ├── c2-battle-main-menu.spec.ts
│   │   ├── c3-battle-magic-menu.spec.ts
│   │   ├── c4-battle-item-menu.spec.ts
│   │   ├── c5-battle-target-select.spec.ts
│   │   └── c6-dev-picker.spec.ts
│   ├── dev/                             # f 组 1 case
│   │   └── f1-dump-state.spec.ts
│   └── baselines/                       # 本机生成,不入 git
│       └── (baseline PNGs)
└── package.json                         # 改:加 e2e script + @playwright/test + pixelmatch devDep
```

### `packages/pal-extract/src/`(M3.5 增量)

```
packages/pal-extract/src/
├── resources/
│   └── parsers/scenes.ts                # 改:SceneEventObject 加 triggerMode + scene chain dump 加 2 个 scene
├── events/
│   ├── opcodes.ts                       # 改:加 loadScene 1 个 opcode 具名
│   ├── disasm.ts                        # 改:对应 case
│   └── recompile.ts                     # 改:对应 case
└── cli.ts                               # 改:总装 scene chain
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

build/sdlpal-baseline/maps/              # M3.5 新增:仙灵岛 2 个 scene baseline
```

### `.gitignore`(M3.5 增量)

```
# Playwright L2 baseline PNG(版权:含原版游戏画面,本机生成不入库)
packages/game/e2e/baselines/
```

---

## 7. 完成定义

### Layer 1(`pnpm check`)— 我做,用户不关注具体 case

1. ✅ L1a 纯单元单测(`loadScene` / 明雷 helper / 等)绿
2. ✅ L1b 模块集成单测(scene-system loadScene + SceneAssetsCache + 明雷 / battle-system input wire ~10)绿
3. ✅ L1c headless 集成(M3 `e2e-battle.test.ts` 不动)仍绿
4. ✅ L1d 数据 round-trip(scenes triggerMode + loadScene opcode round-trip + tilemap baseline 多场景 + shim 清理)绿
5. ✅ `pnpm extract` 跑通,scene chain 产出齐 + SceneEventObject 含 triggerMode
6. ✅ `pnpm check` 全过(M3 phase 1 = 407 + 2 skip;M3.5 ≥ 430 + 2 skip)
7. ✅ events round-trip 仍逐字节通过(loadScene 新具名 opcode 严格对偶)
8. ✅ D29 视觉 baseline 3 场景全过(scene 1 + 仙灵岛码头 + 仙灵岛入口 像素一致)

### Layer 2(`pnpm e2e`)— 用户关注

9. ✅ Playwright + dev server setup 跑通
10. ✅ a 组 9 case 全绿(scene 渲染 / sprite / 走路 / 边界 / 阻挡 / 相机 / scene 切换 / 明雷遇怪)
11. ✅ b 组 7 case 全绿(战斗背景 / sprite / HP-MP / 数字弹幕 / won / lost-fleed / dev 触发)
12. ✅ c 组 6 case 全绿(对话框 4 style / 战斗 4 菜单 / dev picker)
13. ✅ f 组 1 case 全绿(F1 dump)

### Layer 3 — 推 M7,本 milestone 不做

### 其他

14. ✅ M3 phase 1 input wire limitation 修(L1b 战斗 input wire 测 + L2 c2-c5 战斗菜单 E2E 覆盖)
15. ✅ Dev manual smoke(`pnpm dev` 手测烟雾)
16. ✅ `../03-development-plan.md` 的 M3.5 状态更新到"已完成"
17. ✅ M3.5 实施过程发现写在本 plan 末尾

---

## 8. 第三方依赖

新增(M3.5):

- `@playwright/test`(`packages/game` devDep,L2 Playwright runner)
- `pixelmatch`(`packages/game` devDep,L2 pixel diff)

不变:Vite / Vitest / TypeScript。

---

## 9. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 仙灵岛码头 / 入口 scene id 错(攻略 + scene-list 真值需 verify)| 实施时 cat data/extracted/data/scene-N.json + grep 攻略章节 verify |
| 仙灵岛 tilemap / palette 解析与 scene 1 不同导致 D29 测试失败 | sdlpal headless dump 加新 mapNum baseline 对照 |
| 明雷机制 sdlpal `play.c::PAL_PartyWalk` 真行为复杂(triggerMode 多种值)| 实施时 grep 真值 + 简化为 binary `isContact` + 实施过程发现记录 |
| input wire 子状态机比预想复杂 | design §3.3 已给 sketch + state 转换表;实施时按 sdlpal `uibattle.c` 真菜单 UX 对齐 |
| 23 个 L2 case Playwright 工作量大(~25-30 task)| 大量 case 之间 helper 复用(bootstrap / pixel-diff / snapshot)— 实际 incremental 写每个 spec ~30 min;前 3 个 setup 重,后面快 |
| baseline PNG 本机生成不入 git → 不同 dev / CI 看不到对方截图 | 接受 — 个人项目,本机为主;若未来要协作,改成截图入 git(版权由项目转 fair-use 范围处理) |
| Playwright + dev server 跑很慢(每次起 chromium + vite)| `pnpm e2e` 不进 `pnpm check`;dev workflow 跑 vitest 快;e2e 只在 commit 大块或 milestone 验收时跑 |
| 仙灵岛 enemyTeam(草妖)真值不一致 | 实施时按 walkthrough §2 仙灵岛章节定真 enemyTeamId + cat enemy-teams.json verify |
| SceneAssetsCache 内存累积(多 scene 切换)| M3.5 简版不做 eviction(只 3 scene,< 10MB);M5 加 LRU |

---

## 10. 决策同步进 04(已 commit:D32 / D33 / D34;D35 重写)

- **D32** · 明雷怪机制 = `EventObject.triggerMode` 自动 runScript
- **D33** · scene chain 资源加载 lazy(SceneAssetsCache)
- **D34** · M3.5 dev shortcut 跳 scene,不走真剧情链
- **D35**(重写) · 测试六层分类:L1a/b/c/d + L2 Playwright + L3 完整流程
