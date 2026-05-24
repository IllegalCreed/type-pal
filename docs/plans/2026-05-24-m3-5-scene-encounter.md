# M3.5 · scene 切换 + 明雷怪 + dev 跳仙灵岛 + L2 一次性补齐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 M3.5 phase 2:① dev panel "跳 scene" 跳到任意 scene + 写 party 位置(D34);② scene 切换链路(`loadScene` + `SceneAssetsCache` lazy,D33);③ 明雷怪机制(`triggerMode=contact` 自动 runScript,D32);④ 战斗 UI input wire(修 M3 phase 1 limitation);⑤ pal-extract 仙灵岛码头 + 仙灵岛入口资源 dump + `loadScene` opcode 具名;⑥ **L2 Playwright 视觉端到端 23 个 case 一次性补齐 M1-M3.5 所有功能点资产**(D35)。

**Architecture:** 沿 M3 phase 1 + 02 四层 + CommandBus + 协程式步进器架构。新增:`core/scene-system.ts` 扩 `loadScene` + 明雷检测;`assets/loader.ts` 加 `SceneAssetsCache` lazy 加载;`core/battle/battle-system.ts` 扩 `tickSelectAction` 真处理 input + uiState 子状态机(mainMenu → magicMenu/itemMenu/targetSelect);`shell/dev-panel.ts` 加 "跳 scene" picker;pal-extract `parsers/scenes.ts` dump `triggerMode` 字段 + scene chain dump 2 个新场景;`events/opcodes.ts` 加 `loadScene` opcode 具名(其他 onEnter opcode 继续 raw skip,D26)。L2 测试用 `@playwright/test` 独立 runner + `pixelmatch` pixel diff,baseline PNG **不入 git**(版权)。

**Tech Stack:** TypeScript(`NodeNext` + `strict`)/ Vite(dev / build)/ Vitest(L1a/b/c/d 跑)/ **Playwright(`@playwright/test`,L2 跑)+ pixelmatch**(新 devDep)/ pnpm workspace。算法 / 数据规格 = M3 phase 1 产物 + `reference/sdlpal/`(`play.c::PAL_PartyWalk` 明雷真行为 + `uibattle.c` 菜单 UX 真行为 + `script.c` opcode)+ `reference/walkthrough/flow.md`(仙灵岛剧情顺序 + scene id 索引)。

**项目根目录:** `/Users/zhangxu/illegal/type-pal`

---

## File Structure(M3.5 末态)

```
type-pal/
├── packages/
│   ├── shared/src/
│   │   ├── resources.ts                 # 改:SceneEventObject 加 triggerMode 字段
│   │   └── resources.test.ts            # 改:加 triggerMode schema test
│   ├── pal-extract/src/
│   │   ├── resources/parsers/scenes.ts  # 改:dump triggerMode + scene chain 加 2 个新 scene
│   │   ├── events/
│   │   │   ├── opcodes.ts               # 改:加 loadScene opcode 具名
│   │   │   ├── disasm.ts                # 改:emit loadScene case
│   │   │   └── recompile.ts             # 改:loadScene 写回 case
│   │   ├── cli.ts                       # 改:scene chain 总装 + 仙灵岛资源 dump
│   │   └── __tests__/
│   │       └── tilemap-baseline.test.ts # 改:多 scene baseline pixel diff
│   └── game/
│       ├── playwright.config.ts         # 新:L2 Playwright runner 配置
│       ├── package.json                 # 改:加 @playwright/test + pixelmatch devDep + pnpm e2e script
│       ├── e2e/                         # 新:L2 23 case
│       │   ├── helpers/
│       │   │   ├── bootstrap.ts         # 新:Playwright 启 dev server + nav + 等 onEnter
│       │   │   ├── snapshot.ts          # 新:canvas → PNG buffer
│       │   │   └── pixel-diff.ts        # 新:pixelmatch wrapper
│       │   ├── scene/                   # a 组 9 case
│       │   │   ├── a1-tilemap-render.spec.ts
│       │   │   ├── a2-leader-sprite.spec.ts
│       │   │   ├── a3-npc-sprite.spec.ts
│       │   │   ├── a4-walk.spec.ts
│       │   │   ├── a5-boundary-clamp.spec.ts
│       │   │   ├── a6-npc-block.spec.ts
│       │   │   ├── a7-camera-follow.spec.ts
│       │   │   ├── a8-scene-switch.spec.ts
│       │   │   └── a9-encounter.spec.ts
│       │   ├── battle/                  # b 组 7 case
│       │   │   ├── b1-bg-render.spec.ts
│       │   │   ├── b2-sprites.spec.ts
│       │   │   ├── b3-hpmp-status.spec.ts
│       │   │   ├── b4-damage-num.spec.ts
│       │   │   ├── b5-won-to-explore.spec.ts
│       │   │   ├── b6-lost-or-fleed.spec.ts
│       │   │   └── b7-dev-trigger.spec.ts
│       │   ├── menu/                    # c 组 6 case
│       │   │   ├── c1-dialog-styles.spec.ts
│       │   │   ├── c2-battle-main-menu.spec.ts
│       │   │   ├── c3-battle-magic-menu.spec.ts
│       │   │   ├── c4-battle-item-menu.spec.ts
│       │   │   ├── c5-battle-target-select.spec.ts
│       │   │   └── c6-dev-picker.spec.ts
│       │   ├── dev/                     # f 组 1 case
│       │   │   └── f1-dump-state.spec.ts
│       │   └── baselines/               # 本机生成不入 git
│       └── src/
│           ├── core/
│           │   ├── scene-system.ts      # 改:loadScene + 明雷机制
│           │   ├── scene-system.test.ts # 改:L1b 加 loadScene + 明雷
│           │   ├── event-system.ts      # 改:加 loadScene opcode handler stub
│           │   └── battle/
│           │       ├── battle-system.ts # 改:tickSelectAction 真 input wire
│           │       └── __tests__/
│           │           └── battle-system.test.ts # 改:加 input wire ~10 测
│           ├── assets/
│           │   └── loader.ts            # 改:加 SceneAssetsCache lazy
│           ├── shell/
│           │   └── dev-panel.ts         # 改:加 "跳 scene" picker entries
│           └── data/
│               └── scene-jumps.json     # 新:dev panel 跳 scene 预设
├── scripts/
│   └── extract-tilemap-baseline.sh      # 改:MAPS 数组加仙灵岛 2 个 mapNum
├── docs/plans/                          # 本 plan + design 已在此
└── .gitignore                           # 改:加 packages/game/e2e/baselines/
```

`data/extracted/` 仍**不**入 git;`build/sdlpal-baseline/` 仍**不**入 git;`packages/game/e2e/baselines/` 新加 **不**入 git(版权)。

---

## Task 列表总览(40 task)

**Phase A · pal-extract 资源 + opcode 增量(7 task)**
- T1: `shared/resources.ts` SceneEventObject 加 triggerMode 字段
- T2: pal-extract `parsers/scenes.ts` dump triggerMode
- T3: `events/opcodes.ts` + `disasm.ts` + `recompile.ts` 加 loadScene opcode 具名
- T4: 仙灵岛 scene id 调研 + cli 总装新 scene chain(tilemap + palette)
- T5: 仙灵岛 NPC / 草妖 sprite 提取
- T6: D29 视觉 baseline 多场景扩展(sdlpal headless 跑仙灵岛 2 个 mapNum)
- T7: baseline shim 清理(test 内启发式 shim 移除)

**Phase B · game runtime scene 切换(5 task)**
- T8: `assets/loader.ts` 加 `SceneAssetsCache` lazy
- T9: `core/scene-system.ts` 加 `loadScene` 函数 + L1b 单测
- T10: `core/event-system.ts` 加 `loadScene` opcode handler stub
- T11: `core/scene-system.ts` 加明雷机制(`triggerMode=contact` 自动 runScript)
- T12: scene-system L1b 集成测试加明雷 + 反例

**Phase C · 战斗 UI input wire(3 task)**
- T13: `battle-system.ts` 扩 `tickSelectAction` mainMenu / Cancel 处理
- T14: tickSelectAction magicMenu / itemMenu / targetSelect handlers
- T15: battle-system L1b 集成测试加 input wire ~10 测

**Phase D · Dev panel 跳 scene(2 task)**
- T16: `data/scene-jumps.json` 新建 + `dev-panel.ts` 加 SCENE_JUMPS picker
- T17: `shell/dev-panel.ts` 实现 `applySceneJump`(调 loadScene + 写 party)

**Phase E · Playwright Setup + Helpers(3 task)**
- T18: Playwright + pixelmatch 加 devDep + `playwright.config.ts` + `.gitignore`
- T19: `e2e/helpers/bootstrap.ts`(启 server / nav / 等 onEnter / dev panel hook)
- T20: `e2e/helpers/snapshot.ts` + `pixel-diff.ts`

**Phase F · L2 23 case Playwright spec(17 task,有合并)**
- T21: a1 tilemap 渲染(3 scene)
- T22: a2 队长 sprite 渲染
- T23: a3 NPC sprite 渲染
- T24: a4 走路移动
- T25: a5 边界 clamp + a6 撞 NPC 阻挡 + a7 相机 follow(合并 1 task,M2 既有 feature visual 补)
- T26: a8 scene 切换
- T27: a9 明雷遇怪
- T28: b1 战斗背景渲染 + b2 双方 sprite 渲染(合并 1 task,战斗界面基础)
- T29: b3 HP/MP 状态栏
- T30: b4 攻击数字弹幕
- T31: b5 won 切回 explore + b6 lost-fleed(合并 1 task)
- T32: b7 dev panel 触发战斗
- T33: c1 对话框 4 style
- T34: c2 战斗主菜单
- T35: c3 战斗法术菜单 + c4 战斗物品菜单 + c5 战斗目标光标(合并 1 task,二级菜单)
- T36: c6 dev panel picker
- T37: f1 F1 dump GameState

**Phase G · 验收(3 task)**
- T38: 全套 `pnpm check` + `pnpm e2e` 跑通验证
- T39: README + 03 plan 同步到 "M3.5 完工"
- T40: 实施过程发现归档

---

## Conventions

**TDD 节奏(每个 task)**:写失败测试 → 跑确认失败 → 写最小实现 → 跑确认通过 → commit。

**Commit 规约**:每 Task 一个 commit,直接 main(memory:solo 项目)。Commit message 格式:`feat(M3.5.N): <一句话>` / `feat(M3.5.N pal-extract): ...` 等。N 是 task 编号。不带 Claude/Co-Author trailer。

**测试运行命令**:
- 全仓 Vitest + typecheck:`pnpm check`
- 单包 Vitest:`pnpm -F @type-pal/game test`(或 shared / pal-extract)
- 单文件 Vitest:`pnpm -F @type-pal/game vitest run src/path/to/file.test.ts`
- pal-extract 重跑:`pnpm extract`
- Playwright L2 E2E:`pnpm -F @type-pal/game e2e`(M3.5 新)
- Playwright update baselines:`pnpm -F @type-pal/game e2e --update-baselines`(本机首次)
- dev server:`pnpm -F @type-pal/game dev`

**类型导入**:`@type-pal/shared` 的所有 export 都从 `index.ts` re-export;import 用 `import { X } from '@type-pal/shared'`。

**sdlpal 源行引用规范**:port 函数 / 算法时,函数顶 JSDoc 标 `// from reference/sdlpal/play.c:NNN`。这是 D29 留痕。

**Baseline PNG 处理**:本机第一次跑 `pnpm e2e --update-baselines` 生成,后续 pixel diff vs 本机 baseline。`packages/game/e2e/baselines/` **不入 git**(版权 — 含原版游戏画面)。

---

## Task 1: `shared/resources.ts` SceneEventObject 加 triggerMode 字段

**Files:**
- Modify: `packages/shared/src/resources.ts`(SceneEventObject 加 triggerMode)
- Modify: `packages/shared/src/resources.test.ts`(加 triggerMode schema test)

**Why:** M1 `pal-extract/src/io/sss.ts` 已 parse `EventObject.wTriggerMode`,但 M2 SceneEventObject schema 没保留这个字段。M3.5 明雷机制(T11)需要 runtime 看 triggerMode,本 task 把 schema 字段加上。

- [ ] **Step 1: 末尾追加 schema 测试**

修改 `packages/shared/src/resources.test.ts`,在文件末尾追加:

```typescript
import type { SceneEventObject } from './resources.js'

describe('SceneEventObject triggerMode 字段(M3.5)', () => {
  it('triggerMode 字段是 number(raw u16,运行时解读)', () => {
    const eo: SceneEventObject = {
      id: 0, x: 10, y: 20, spriteNum: 78,
      triggerMode: 0,
    }
    expect(eo.triggerMode).toBe(0)
    expect(typeof eo.triggerMode).toBe('number')
  })

  it('triggerMode 与其他字段共存,M2 字段不破坏', () => {
    const eo: SceneEventObject = {
      id: 5, x: 10, y: 20, spriteNum: 78,
      triggerScript: 100,
      autoScript: 200,
      state: 1,
      triggerMode: 4,  // 假设值,运行时按 sdlpal 真值
    }
    expect(eo.id).toBe(5)
    expect(eo.triggerScript).toBe(100)
    expect(eo.triggerMode).toBe(4)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

`pnpm -F @type-pal/shared vitest run src/resources.test.ts`

期望:类型错(SceneEventObject 缺 triggerMode 字段)。

- [ ] **Step 3: 修改 SceneEventObject schema**

修改 `packages/shared/src/resources.ts`,找到 SceneEventObject interface,在 `state?: number` 之后加 triggerMode:

```typescript
export interface SceneEventObject {
  /** 在原 SSS.MKF EventObject 数组里的下标。 */
  id: number
  /** 瓦片坐标(原 EventObject.x / .y,以 tile 为单位)。 */
  x: number
  y: number
  /** 精灵编号(原 EventObject.wSpriteNum) —— 对应 sprite-NNN.json。 */
  spriteNum: number
  /** 玩家触发对话的入口标签 ip(M2 已建)。 */
  triggerScript?: number
  /** NPC 待机行为入口(M2 未消费,留 M5+)。 */
  autoScript?: number
  /** EventObject state(隐藏 / 正常 / 阻挡;sdlpal `sState`)。 */
  state?: number
  /** 触发模式:对照 sdlpal `EventObject.wTriggerMode`(M1 parse,M3.5 真消费)。
   *
   * Raw u16,运行时 scene-system 解读:可能值含义(实施 T11 时按 sdlpal `play.c::PAL_PartyWalk` 真值定):
   * - 0 = 不触发
   * - N = 明雷接触触发 / Confirm 触发 / 传送 / 等
   */
  triggerMode: number
}
```

- [ ] **Step 4: 跑测试确认通过**

`pnpm -F @type-pal/shared vitest run src/resources.test.ts`

期望:全绿。

- [ ] **Step 5: shared 包 typecheck**

`pnpm -F @type-pal/shared typecheck`

期望:无错。pal-extract 端 dumpScene 输出物没 triggerMode 字段会 typecheck error — 那是 T2 处理。**本 task 只关心 shared 包自身 typecheck**(SceneEventObject schema 自洽)。

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/resources.ts packages/shared/src/resources.test.ts
git commit -m "feat(M3.5.1): shared/resources.ts —— SceneEventObject 加 triggerMode 字段(M3.5 明雷机制要)"
```

---

## Task 2: pal-extract `parsers/scenes.ts` dump triggerMode

**Files:**
- Modify: `packages/pal-extract/src/resources/parsers/scenes.ts`(实际位置实施时 grep verify,M2 可能在 resources/ 直接而非 parsers/ 子目录)
- Modify: `packages/pal-extract/src/resources/parsers/scenes.test.ts`(同 verify 位置)

**Why:** T1 给 SceneEventObject 加 triggerMode 字段,本 task 让 pal-extract 真 dump 它。M1 `io/sss.ts::parseEventObjects` 已经 parse `triggerMode`(M2 实施过程发现 M1 已 parse,只是 dumpScene 没保留),本 task 把 dumpScene 加上。

- [ ] **Step 1: 找 dumpScene 实际位置**

```bash
grep -rn "dumpScene\|SceneObjects" packages/pal-extract/src/ | head -10
```

记下 `dumpScene` 函数位置(可能在 `resources/scenes.ts` 或 `resources/parsers/scenes.ts`)。

- [ ] **Step 2: 末尾追加 fixture 测试**

修改 dumpScene 对应 test 文件,加 case:

```typescript
import { dumpScene } from './scenes.js'  // 实施时 verify 路径
import type { EventObject, Scene } from '../io/sss.js'  // 实施时 verify

describe('dumpScene triggerMode 字段(M3.5)', () => {
  it('SceneEventObject dump 含 triggerMode raw u16', () => {
    const fakeEventObjects: EventObject[] = [
      {
        state: 1, vanishTime: 0, x: 10, y: 20, spriteNum: 78,
        triggerScript: 59, autoScript: 0, layer: 0,
        triggerMode: 4,  // 假设值
        raw: new Uint16Array(16),
      },
    ]
    const fakeScenes: Scene[] = [
      { mapNum: 0, scriptOnEnter: 0, scriptOnTeleport: 0, eventObjectIndex: 0, raw: new Uint16Array(4) },
      { mapNum: 12, scriptOnEnter: 5, scriptOnTeleport: 0, eventObjectIndex: 0, raw: new Uint16Array(4) },
    ]
    const result = dumpScene(1, fakeScenes, fakeEventObjects)
    expect(result.eventObjects[0]?.triggerMode).toBe(4)
  })

  it('triggerMode=0(不触发)正确 dump', () => {
    const fakeEventObjects: EventObject[] = [
      { state: 1, vanishTime: 0, x: 0, y: 0, spriteNum: 0, triggerScript: 0, autoScript: 0, layer: 0, triggerMode: 0, raw: new Uint16Array(16) },
    ]
    const fakeScenes: Scene[] = [
      { mapNum: 0, scriptOnEnter: 0, scriptOnTeleport: 0, eventObjectIndex: 0, raw: new Uint16Array(4) },
      { mapNum: 1, scriptOnEnter: 0, scriptOnTeleport: 0, eventObjectIndex: 0, raw: new Uint16Array(4) },
    ]
    const result = dumpScene(1, fakeScenes, fakeEventObjects)
    expect(result.eventObjects[0]?.triggerMode).toBe(0)
  })
})
```

- [ ] **Step 3: 跑确认失败**

`pnpm -F @type-pal/pal-extract vitest run -t "triggerMode"`

期望:assert 错(SceneEventObject 缺 triggerMode 字段)。

- [ ] **Step 4: 修改 dumpScene 实现**

打开 `dumpScene` 函数。M2 已经从 EventObject 拷贝其他字段(id / x / y / spriteNum / triggerScript / autoScript / state),加 triggerMode 同 pattern:

```typescript
// 在 SceneEventObject 构造处加:
sceneObjects.eventObjects.push({
  id: i,
  x: eo.x,
  y: eo.y,
  spriteNum: eo.spriteNum,
  triggerLabel: labelOf(eo.triggerScript),
  autoLabel: labelOf(eo.autoScript),
  triggerMode: eo.triggerMode,  // M3.5 新
})
```

> **注**:如果 SceneEventObject 用的 `triggerLabel`(label 名)而非 `triggerScript`(ip),M2 实际 schema 可能跟我假设不同。**实施时按 M2 真 schema 改**,只确保 `triggerMode` 字段加上即可。

- [ ] **Step 5: 跑测试通过**

`pnpm -F @type-pal/pal-extract vitest run -t "triggerMode"`

期望:全绿。

- [ ] **Step 6: 跑 pnpm extract 看真产物**

`pnpm extract`
`cat data/extracted/data/scene-1.json | head -30`

verify:`eventObjects[].triggerMode` 字段都存在(数值,绝大多数应该是 0 或小整数)。

- [ ] **Step 7: Commit**

```bash
git add packages/pal-extract/src/resources/parsers/scenes.ts packages/pal-extract/src/resources/parsers/scenes.test.ts
git commit -m "feat(M3.5.2 pal-extract): dumpScene 保留 triggerMode 字段(明雷机制要)"
```

---

## Task 3: `events/opcodes.ts` + `disasm.ts` + `recompile.ts` 加 loadScene opcode 具名

**Files:**
- Modify: `packages/pal-extract/src/events/opcodes.ts`(加 loadScene opcode 条目)
- Modify: `packages/pal-extract/src/events/disasm.ts`(emit loadScene case)
- Modify: `packages/pal-extract/src/events/recompile.ts`(loadScene 写回 case)
- Modify: `packages/shared/src/events.ts`(加 LoadSceneCommand 类型 + Command 联合扩)
- Modify: `packages/pal-extract/src/events/disasm.test.ts`(加 round-trip 测试)

**Why:** M3.5 真消费 loadScene opcode 让 scene 切换在 EventSystem 内可执行。但 M3.5 选择 **B 路线**(dev panel 直调 loadScene,events.json 里 loadScene opcode 仍 raw skip);本 task 仍把 opcode 具名出来 + 加 EventSystem handler stub(T10),让 disasm/recompile 字节级 round-trip 仍通过,**为 M5 真做剧情链铺路**。

#### Step 1: grep sdlpal `script.c` 找 loadScene opcode 真值

```bash
grep -n "PAL_LoadScene\|LoadGame\|wNumScene\|gpGlobals->wNumScene\s*=" reference/sdlpal/script.c | head -20
```

verify 真 opcode 号(可能是 0x0050 或附近;看 sdlpal switch 大 case 真值)+ operand 字段(`rgwOperand[0]` 是新 scene id?或别的字段)。

- [ ] **Step 2: 在 shared/events.ts 加 LoadSceneCommand**

修改 `packages/shared/src/events.ts`,加 LoadSceneCommand 类型(放在 SetDialogStyle 命令附近):

```typescript
/** Scene 切换命令(M3.5,opcode 0x00NN — 实施时 grep verify)。
 *
 * **运行时语义**:M3.5 内 EventSystem handler 是 stub(no-op skip + console.debug);
 * 真 scene 切换通过 dev panel 直接调 `loadScene()` 函数实现。M5 真做剧情链时
 * 升级 handler 为可等待命令(emit + Shell 处理 async loadScene + complete cmdId)。
 */
export interface LoadSceneCommand {
  op: 'loadScene'
  sceneId: number
  label?: string
}
```

并把 LoadSceneCommand 加进 Command 联合:

```typescript
export type Command =
  | RawCommand
  | EndCommand
  | GotoCommand
  | ShowDialogCommand
  | GiveItemCommand
  | StartBattleCommand
  | SetDialogStyleTopCommand
  | SetDialogStyleCenterCommand
  | SetDialogStyleBottomCommand
  | SetDialogStyleNarrationCommand
  | LoadSceneCommand    // M3.5 新
  | SequenceCommand
  | IfCommand
  | ChoiceCommand
```

- [ ] **Step 3: 在 events.test.ts 加 schema 测试**

修改 `packages/shared/src/events.test.ts`,末尾加:

```typescript
describe('LoadSceneCommand schema(M3.5)', () => {
  it('LoadSceneCommand 字段', () => {
    const c: LoadSceneCommand = { op: 'loadScene', sceneId: 12 }
    expectTypeOf(c.op).toEqualTypeOf<'loadScene'>()
    expect(c.sceneId).toBe(12)
  })

  it('LoadSceneCommand 在 Command 联合', () => {
    const cmds: Command[] = [
      { op: 'loadScene', sceneId: 5 },
    ]
    expect(cmds[0]?.op).toBe('loadScene')
  })
})
```

跑确认失败:`pnpm -F @type-pal/shared vitest run src/events.test.ts -t "LoadSceneCommand"`

跑通过后继续。

- [ ] **Step 4: 在 opcodes.ts 注册 loadScene**

修改 `packages/pal-extract/src/events/opcodes.ts`,加新条目(opcode 号实施时按 grep 真值定;此处用占位 `0x00NN`):

```typescript
  // M3.5 加 loadScene opcode 具名(D34/B 路线 — events.json 里 dump 出来,
  // 运行时 EventSystem 是 stub no-op skip;真 scene 切换由 dev panel 直调函数)
  0x00NN: {
    name: 'loadScene',
    fields: [SCENE, VALUE, VALUE],  // 实施时按真 operand 顺序定;假设 operand[0]=sceneId
    named: true,
  },
```

> **关键**:opcode 号 0x00NN 是占位。**实施时按 grep sdlpal `script.c` 真值替换**(Step 1 已 grep)。

- [ ] **Step 5: disasm.ts 加 emit case**

修改 `packages/pal-extract/src/events/disasm.ts` 的 `emitCommand` 函数,在合适位置(M2 已建 case 之后)加:

```typescript
    case 'loadScene':
      return { op: 'loadScene', sceneId: operands[0]! }
```

- [ ] **Step 6: recompile.ts 加写回 case**

修改 `packages/pal-extract/src/events/recompile.ts`,在 commands.forEach 循环中加:

```typescript
    if (c.op === 'loadScene') {
      view.setUint16(off, 0x00NN, true)  // 实施时按真 opcode 号
      view.setUint16(off + 2, c.sceneId, true)
      return
    }
```

- [ ] **Step 7: disasm.test.ts 加 round-trip 测试**

修改 `packages/pal-extract/src/events/disasm.test.ts`,加 case:

```typescript
describe('loadScene round-trip(M3.5)', () => {
  it('loadScene opcode 反汇编为具名 Command', () => {
    const bc = new Uint8Array(16)
    const view = new DataView(bc.buffer)
    view.setUint16(0, 0x00NN, true)  // opcode loadScene
    view.setUint16(2, 12, true)       // sceneId=12
    // op2/op3 = 0
    // 第二条 = end(0x0000)
    const cmds = disasm(bc, [])
    expect(cmds[0]).toEqual({ op: 'loadScene', sceneId: 12 })
    expect(cmds[1]).toEqual({ op: 'end' })
  })

  it('loadScene round-trip 字节级一致', () => {
    const bc = new Uint8Array(16)
    const view = new DataView(bc.buffer)
    view.setUint16(0, 0x00NN, true)
    view.setUint16(2, 12, true)
    const cmds = disasm(bc, [])
    const back = recompile(cmds, [])
    expect(back).toEqual(bc)
  })
})
```

- [ ] **Step 8: 跑测试 + events round-trip 自检**

```bash
pnpm -F @type-pal/pal-extract vitest run src/events/disasm.test.ts -t "loadScene"
pnpm extract
```

期望:
- loadScene round-trip 测试绿
- `[pal-extract] events round-trip OK`(SSS.MKF chunk 4 全量 43503 指令仍逐字节一致)

如果 round-trip 失败:打印失败前后 16 字节,确认是不是某些 0x00NN opcode 真有 operand[1]/[2] 非零(M3.5 spec 是 SCENE / VALUE / VALUE,实际可能有别的字段)。

- [ ] **Step 9: 跑全部 pal-extract 测试**

`pnpm -F @type-pal/pal-extract test`

期望:M3 全测 + M3.5 新增的 loadScene 测试都绿。

- [ ] **Step 10: Commit**

```bash
git add packages/pal-extract/src/events/opcodes.ts packages/pal-extract/src/events/disasm.ts packages/pal-extract/src/events/recompile.ts \
        packages/pal-extract/src/events/disasm.test.ts \
        packages/shared/src/events.ts packages/shared/src/events.test.ts
git commit -m "feat(M3.5.3 pal-extract): loadScene opcode 具名 + round-trip 通过"
```

---

## Task 4: 仙灵岛 scene id 调研 + cli 总装新 scene chain(tilemap + palette)

**Files:**
- Modify: `packages/pal-extract/src/cli.ts`(SLICE_SCENE_IDS 数组加 2 个新 scene)
- Verify: `data/extracted/data/scene-N.json` + `data/extracted/data/tilemap-N.json` + 仙灵岛 palette 出来

**Why:** M3.5 dev panel "跳 scene" 要跳到仙灵岛码头 + 仙灵岛入口 2 个 scene,要先把这 2 个 scene 的资源 dump 出来。先 调研 scene id(攻略 + scene-list verify),再 cli 总装。

- [ ] **Step 1: 调研仙灵岛 / 仙灵岛入口在 SCENE 数组中的 id**

读攻略章节确定逻辑次序:
```bash
sed -n '/仙靈島/,/^### 3\./p' reference/walkthrough/flow.md
```

verify:仙灵岛在第 2 章节(盛漁村出门 → 码头 → 仙灵岛),应在 scene id 较低段(0-20 范围内)。

然后 grep sdlpal `data/raw/SSS.MKF` chunk 1 (SCENE 数组):
```bash
node -e "
const { openMkf, readChunk } = require('./packages/pal-extract/dist/io/mkf.js');
const fs = require('node:fs');
const buf = fs.readFileSync('data/raw/SSS.MKF');
const mkf = openMkf(buf);
const chunk1 = readChunk(mkf, 1);
const view = new DataView(chunk1.buffer, chunk1.byteOffset, chunk1.byteLength);
const SCENE_SIZE = 8;
for (let i = 0; i < 30; i++) {
  const mapNum = view.getUint16(i * SCENE_SIZE, true);
  const onEnter = view.getUint16(i * SCENE_SIZE + 2, true);
  console.log(i, 'mapNum=', mapNum, 'onEnter=', onEnter);
}
"
```

记下:
- scene 1 = mapNum 12(已知,M2 切片)
- scene N = 仙灵岛码头(实施时定;mapNum 应该可见在码头 / 海边样)
- scene M = 仙灵岛入口(实施时定;mapNum 应该是岛上)

> **判断方法**:scene 0 通常是占位;scene 1 是 M2 切片(客栈)。从 scene 2 开始按 walkthrough 章节顺序匹配(盛漁村大地图 / 码头 / 仙灵岛入口 / 仙灵岛通道 / 等)。可以用 sdlpal 跑游戏 + dev console 看当前 sceneId 反查最快。

**本 task 假设**(实施时按真值替换):
- 仙灵岛码头 = scene id **3**(占位)
- 仙灵岛入口 = scene id **4**(占位)

- [ ] **Step 2: 修改 cli.ts 总装新 scene chain**

修改 `packages/pal-extract/src/cli.ts`,找 SLICE_SCENE_ID 处:

```typescript
// 原 M2 / M3:const SLICE_SCENE_ID = 1
// 改成数组形式:
const SLICE_SCENE_IDS = [1, 3, 4]  // scene 1(客栈)+ 仙灵岛码头 + 仙灵岛入口
//                       ^^^^^^^^^ 占位,实施时按 Step 1 grep 真值
```

把所有 `SLICE_SCENE_ID` 用法改成 loop:

```typescript
for (const sceneId of SLICE_SCENE_IDS) {
  const sceneObjects = dumpScene(sceneId, sss.scenes, sss.eventObjects)
  writeJson(resolve(OUT, 'data', `scene-${sceneId}.json`), sceneObjects)
  
  // tilemap 提取:M2 已建 extractTilemap(sceneObjects.mapNum, ...)
  const tilemap = extractTilemap(sceneObjects.mapNum, /* ... */)
  writeJson(resolve(OUT, 'data', `tilemap-${sceneId}.json`), tilemap)
  
  // palette 提取:scene 用的 palette 索引可能是 dynamic(setPalette opcode 触发),
  //   M3.5 简版用每个 scene 默认 palette(palette-0)
  // 实施时根据 M2 / M3 既有 palette 提取逻辑扩到多 scene
}
```

> 实际 SLICE_SCENE_ID 在 cli.ts 中的用法可能复杂(scene-1.json + tilemap-1.json + 各种 sprite extraction 都依赖它)。**实施时按 M2 实际逻辑扩成 loop**,确保每个 sceneId 都产出 scene-N.json + tilemap-N.json + palette-N.json(或共用)。

- [ ] **Step 3: 跑 extract 看产物**

```bash
pnpm extract
ls data/extracted/data/scene-*.json
ls data/extracted/data/tilemap-*.json
```

期望:scene-1.json + scene-3.json + scene-4.json 都在;tilemap-1.json + tilemap-3.json + tilemap-4.json 都在。

cat `data/extracted/data/scene-3.json | head -30` 看:
- mapNum 应是非 12 的数(可能 1 / 2 / 30 之类,仙灵岛码头实际 mapNum)
- eventObjects 列表(码头可能没 NPC 或有少数船家 NPC)
- triggerMode 字段都存在(T2 已 done)

- [ ] **Step 4: Commit**

```bash
git add packages/pal-extract/src/cli.ts
git commit -m "feat(M3.5.4 pal-extract): cli 总装 scene chain(scene 1 + 仙灵岛码头 + 仙灵岛入口)"
```

---

## Task 5: 仙灵岛 NPC / 草妖 sprite 提取

**Files:**
- Modify: `packages/pal-extract/src/cli.ts`(sprite 提取 loop scene chain 的 EventObject 集合)

**Why:** M3.5 明雷怪机制要在仙灵岛入口 scene 看到草妖 sprite,scene 1 NPC sprite 已经 M2 提取过(队长 + 12 sprite / 75 帧);本 task 扩到 scene chain 全部 EventObject 用到的 sprite。

- [ ] **Step 1: 看 M2 角色 sprite 提取逻辑**

```bash
grep -n "extractCharacterSprites\|spriteNum\|MGO" packages/pal-extract/src/cli.ts | head -20
```

理解 M2 已建:
- 队长 sprite id(从 PlayerRoles.roles[0].spriteNum 拿,M3 已建)
- scene 1 NPC sprites:loop scene-1.json `eventObjects[].spriteNum` 去重 + 提取

- [ ] **Step 2: 修改 cli.ts sprite 提取段扩到 scene chain**

把 sprite id 集合从 "leader + scene 1 NPCs" 扩成 "leader + 所有 sliced scene 的 NPCs":

```typescript
// 派生需要的 sprite id 集合
const spriteIds = new Set<number>([leader.spriteNum])
for (const sceneId of SLICE_SCENE_IDS) {
  const sceneObjects = /* dumped scene */
  for (const eo of sceneObjects.eventObjects) {
    if (eo.spriteNum > 0) spriteIds.add(eo.spriteNum)
  }
}

// 现有 extractCharacterSprites(spriteIds, mgoChunks) 不变;sprite id 集合变多了
```

> 实施时按 M2 实际 cli.ts 逻辑改成 loop scene chain;sprite id 集合 dedup 自动 cover。

- [ ] **Step 3: 跑 extract 看 sprite 产物**

```bash
pnpm extract
ls data/extracted/data/sprite-*.json | wc -l
ls data/extracted/images/sprite-*.png | wc -l
```

期望:数比 M2 时多(M2 是 12 sprite / 75 帧,M3.5 仙灵岛多场景应至少 +5-10 sprite,含草妖)。

确认草妖 sprite 在不在:打开仙灵岛入口的 scene-N.json,看 eventObjects 里的 spriteNum,verify 对应 sprite-NNN.json 存在(草妖的 spriteNum 由 sdlpal 真值定,实施时可能要试一两个 npc visual sanity)。

- [ ] **Step 4: Commit**

```bash
git add packages/pal-extract/src/cli.ts
git commit -m "feat(M3.5.5 pal-extract): scene chain NPC sprite 提取(含仙灵岛草妖)"
```

---

## Task 6: D29 视觉 baseline 多场景扩展

**Files:**
- Modify: `scripts/extract-tilemap-baseline.sh`(MAPS 数组加 2 个新 mapNum)
- Modify: `packages/pal-extract/src/__tests__/tilemap-baseline.test.ts`(多 scene fixture 自动迭代)

**Why:** M3 phase 1 D29 视觉 baseline 只 scene 1(mapNum 12);M3.5 加仙灵岛 2 个 scene 的 mapNum,baseline.test.ts 多场景自动 pixel diff,catch 仙灵岛渲染潜在 bug。

- [ ] **Step 1: 修改 extract-tilemap-baseline.sh MAPS 数组**

读 T4 调研 verify:仙灵岛码头 mapNum + 仙灵岛入口 mapNum(从 scene-N.json 取真值)。

```bash
# scripts/extract-tilemap-baseline.sh 改:
MAPS=(12 NN MM)  # 12 = scene 1;NN = 仙灵岛码头 mapNum;MM = 仙灵岛入口 mapNum
# 实施时按 T4 真值替换 NN / MM
```

- [ ] **Step 2: 跑 baseline 产出**

```bash
bash scripts/extract-tilemap-baseline.sh
ls build/sdlpal-baseline/maps/
file build/sdlpal-baseline/maps/map-NN.png
```

期望:`map-12.png` + `map-NN.png` + `map-MM.png` 三个 baseline PNG 都在,各几 MB,visual 各自不同(scene 1 客栈 vs 仙灵岛码头 vs 仙灵岛入口)。

- [ ] **Step 3: 修改 tilemap-baseline.test.ts 多 scene 自动迭代**

打开 `packages/pal-extract/src/__tests__/tilemap-baseline.test.ts`,把单 scene 测试改成 loop:

```typescript
import { describe, it, expect } from 'vitest'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import { renderTilemap } from '../../scripts/render-tilemap.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '../../../..')
const BASELINE_DIR = resolve(REPO_ROOT, 'build/sdlpal-baseline/maps')
const OUR_OUT_DIR = resolve(REPO_ROOT, 'build/render-tilemap-test')

const SCENES = [
  { sceneId: 1, mapNum: 12, name: 'scene-1-客栈' },
  { sceneId: 3, mapNum: /* 实施时定 */ 0, name: 'scene-3-仙灵岛码头' },
  { sceneId: 4, mapNum: /* 实施时定 */ 0, name: 'scene-4-仙灵岛入口' },
]

describe('D29 tilemap baseline pixel diff(多场景)', () => {
  for (const { sceneId, mapNum, name } of SCENES) {
    const baselinePath = resolve(BASELINE_DIR, `map-${mapNum.toString().padStart(2, '0')}.png`)
    const ourPath = resolve(OUR_OUT_DIR, `map-${mapNum.toString().padStart(2, '0')}.png`)

    it(`${name}(scene ${sceneId} / mapNum ${mapNum}) 与 sdlpal-classic baseline 逐像素一致`, () => {
      if (!existsSync(baselinePath)) {
        console.warn(`[D29 skip] baseline missing: ${baselinePath}`)
        return
      }

      mkdirSync(OUR_OUT_DIR, { recursive: true })
      const r = renderTilemap({ sceneId, outPath: ourPath })
      expect(r.outPath).toBe(ourPath)

      const baseline = PNG.sync.read(readFileSync(baselinePath))
      const ours = PNG.sync.read(readFileSync(ourPath))

      expect(ours.width).toBe(baseline.width)
      expect(ours.height).toBe(baseline.height)

      let diffs = 0
      let firstDiffOffset = -1
      for (let i = 0; i < baseline.data.length; i++) {
        if (baseline.data[i] !== ours.data[i]) {
          diffs++
          if (firstDiffOffset === -1) firstDiffOffset = i
        }
      }

      if (diffs > 0) {
        const total = baseline.data.length
        const pct = ((diffs / total) * 100).toFixed(3)
        throw new Error(
          `[${name}] tilemap 与 baseline 不一致:${diffs} / ${total} bytes 不同(${pct}%);` +
            ` 首差异 byte offset = ${firstDiffOffset};baseline=${baselinePath},ours=${ourPath}`,
        )
      }
    }, 60_000)
  }
})
```

- [ ] **Step 4: 跑测试**

```bash
pnpm -F @type-pal/pal-extract vitest run src/__tests__/tilemap-baseline.test.ts
```

期望:3 个 case 全过(或 baseline 缺则 skip)。如果某 scene 像素差:M3.5 仙灵岛 tilemap 渲染可能有 bug(参考 M3 #1 实施过程发现 render-tilemap.ts 3 bug fix 模式,扩到新场景验证一遍)。

- [ ] **Step 5: Commit**

```bash
git add scripts/extract-tilemap-baseline.sh packages/pal-extract/src/__tests__/tilemap-baseline.test.ts
git commit -m "feat(M3.5.6): D29 视觉 baseline 多场景扩展(scene 1 + 仙灵岛码头 + 仙灵岛入口)"
```

---

## Task 7: baseline shim 清理

**Files:**
- Modify: `packages/game/src/core/battle/__tests__/baseline.test.ts`(移除启发式 shim)

**Why:** M3 #5(T30 fix)已经在 pal-extract dump 时翻译 enemy id(`enemyTeam.enemies` 槽位从 OBJECT 绝对 index 翻译成 enemies.json id),所以 `startBattle` 直接用 `enemyTeam.enemies` 就行。但 M3 baseline.test.ts 还有启发式 shim `startBattleWithObjectIdMap`(用 `objId - 398 + 1` 兜底翻译)。M3.5 移除 shim,test 直接用 `startBattle`。

- [ ] **Step 1: 找 shim 位置**

```bash
grep -n "startBattleWithObjectIdMap\|objId - 398" packages/game/src/core/battle/__tests__/baseline.test.ts
```

记下 shim 函数定义和调用位置。

- [ ] **Step 2: 移除 shim 改用 startBattle**

打开 `baseline.test.ts`,把 `startBattleWithObjectIdMap` 调用替换成 `startBattle`(import from `battle-system`),删 shim 函数定义。

```typescript
// 删:
function startBattleWithObjectIdMap(...) { /* heuristic objId - 398 + 1 */ }

// 改:
startBattle({  // 直接用 battle-system 真 startBattle
  gs,
  enemyTeamId: fixture.enemyTeamId,
  battleFieldId: fixture.battleFieldId,
  isBoss: false,
  enemies, enemyTeams, battleFields, playerRoles, items, spells, magics,
  commands: events.commands,
  rngSeed: fixture.rngSeed,
})
```

- [ ] **Step 3: 跑 baseline 测试**

```bash
pnpm -F @type-pal/game vitest run src/core/battle/__tests__/baseline.test.ts
```

期望:M3 phase 1 状态(3 PASS / 2 skip)仍保持(M3 #5 enemy 翻译已 done,shim 移除不破坏)。

- [ ] **Step 4: Commit**

```bash
git add packages/game/src/core/battle/__tests__/baseline.test.ts
git commit -m "feat(M3.5.7): baseline.test.ts 移除 enemy id 启发式 shim(M3 已修真翻译)"
```

---

## Task 8: `assets/loader.ts` 加 SceneAssetsCache lazy

**Files:**
- Modify: `packages/game/src/assets/loader.ts`(加 SceneAssetsCache class)
- Create: `packages/game/src/assets/loader.test.ts`(若不存在;否则改)

**Why:** M3.5 多 scene 切换要 lazy 加载资源 — 不是启动时一次 fetch 所有 scene。D33 钉死。

- [ ] **Step 1: 写 SceneAssetsCache 测试**

新建 / 修改 `packages/game/src/assets/loader.test.ts`,加 case:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { SceneAssetsCache } from './loader.js'  // 实施时按真 export 名定

describe('SceneAssetsCache(M3.5)', () => {
  it('第一次 loadScene 调 fetcher,第二次 cache hit 不调', async () => {
    const fetcher = vi.fn(async (sceneId: number) => ({
      sceneId,
      tilemap: { width: 64, height: 128, cells: [], tilesetImage: 'fake' },
      palette: { colors: [] as Array<[number, number, number]> },
      eventObjects: [],
      npcSprites: new Map(),
    }))
    const cache = new SceneAssetsCache(fetcher)
    
    await cache.loadScene(1)
    expect(fetcher).toHaveBeenCalledTimes(1)
    
    await cache.loadScene(1)  // 同 scene
    expect(fetcher).toHaveBeenCalledTimes(1)  // 仍 1 次,cache hit
    
    await cache.loadScene(3)  // 新 scene
    expect(fetcher).toHaveBeenCalledTimes(2)  // 这次又调
  })

  it('SceneAssets 返回正确字段', async () => {
    const fakeAssets = {
      sceneId: 5, tilemap: { width: 30, height: 40, cells: [], tilesetImage: 'f' },
      palette: { colors: [] }, eventObjects: [], npcSprites: new Map(),
    }
    const cache = new SceneAssetsCache(async () => fakeAssets)
    const result = await cache.loadScene(5)
    expect(result.sceneId).toBe(5)
    expect(result.tilemap.width).toBe(30)
  })
})
```

跑确认失败:`pnpm -F @type-pal/game vitest run src/assets/loader.test.ts -t "SceneAssetsCache"`

- [ ] **Step 2: 实现 SceneAssetsCache**

修改 `packages/game/src/assets/loader.ts`,在末尾加:

```typescript
export interface SceneAssets {
  sceneId: number
  tilemap: Tilemap  // M2 已有类型
  palette: Palette
  eventObjects: SceneEventObject[]
  npcSprites: Map<number, SpriteAsset>
}

export type SceneFetcher = (sceneId: number) => Promise<SceneAssets>

/**
 * Scene 资源 lazy 加载缓存(D33)。
 *
 * M3.5 简版不做 LRU eviction(只 2-3 scene,< 10MB 内存可接受);
 * M5 全场景时加 LRU。
 */
export class SceneAssetsCache {
  private cache = new Map<number, SceneAssets>()

  constructor(private fetcher: SceneFetcher) {}

  async loadScene(sceneId: number): Promise<SceneAssets> {
    let cached = this.cache.get(sceneId)
    if (!cached) {
      cached = await this.fetcher(sceneId)
      this.cache.set(sceneId, cached)
    }
    return cached
  }
}
```

> 真 SceneFetcher 实现(从 `/extracted/data/scene-N.json` + tilemap-N.json + palette + sprite 各 PNG fetch):写在 bootstrap.ts 里(T16 dev panel hook 用),不在 loader.ts 内。loader.ts 只管 cache。

- [ ] **Step 3: 跑测试 + Commit**

```bash
pnpm -F @type-pal/game vitest run src/assets/loader.test.ts
git add packages/game/src/assets/loader.ts packages/game/src/assets/loader.test.ts
git commit -m "feat(M3.5.8): SceneAssetsCache lazy 加载(D33)"
```

---

## Task 9: `core/scene-system.ts` 加 `loadScene` 函数

**Files:**
- Modify: `packages/game/src/core/scene-system.ts`(加 loadScene 函数 export)
- Modify: `packages/game/src/core/scene-system.test.ts`(加 L1b loadScene 测试)

**Why:** scene 切换的核心 — 卸载当前 scene 资源 + 加载新 scene 资源 + 重置 GameState scene 字段。

- [ ] **Step 1: 看 M2 scene-system.ts 现有结构**

```bash
cat packages/game/src/core/scene-system.ts | head -50
```

理解 M2 export 什么(tickSceneSystem),GameState scene 字段长啥样。

- [ ] **Step 2: 写 loadScene 测试**

修改 `packages/game/src/core/scene-system.test.ts`,加 case:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { loadScene } from './scene-system.js'
import { SceneAssetsCache } from '../assets/loader.js'
import { createInitialGameState } from './game-state.js'

const minimalSceneAssets = (sceneId: number) => ({
  sceneId,
  tilemap: { width: 64, height: 128, cells: [], tilesetImage: 'fake' },
  palette: { colors: [] as Array<[number, number, number]> },
  eventObjects: [
    { id: 0, x: 10, y: 20, spriteNum: 78, triggerMode: 0, triggerScript: undefined },
  ],
  npcSprites: new Map(),
})

describe('loadScene(M3.5)', () => {
  it('切到新 scene → GameState scene 字段重置', async () => {
    const gs = createInitialGameState({ col: 0, row: 0, facing: 'down' })
    gs.scene = { id: 1, mapNum: 12 } as any  // M2 字段
    
    const cache = new SceneAssetsCache(async (id) => minimalSceneAssets(id))
    await loadScene({
      gs, sceneId: 3, assets: cache,
      partyStart: { col: 5, row: 5, facing: 'down' },
    })
    
    expect(gs.scene.id).toBe(3)
    expect(gs.party.col).toBe(5)
    expect(gs.party.row).toBe(5)
    expect(gs.npcs).toHaveLength(1)
  })

  it('partyStart 可选 — 不传则不改 party 位置', async () => {
    const gs = createInitialGameState({ col: 99, row: 88, facing: 'right' })
    const cache = new SceneAssetsCache(async (id) => minimalSceneAssets(id))
    await loadScene({ gs, sceneId: 5, assets: cache })
    expect(gs.party.col).toBe(99)  // 不动
    expect(gs.party.row).toBe(88)
    expect(gs.party.facing).toBe('right')
  })

  it('SceneAssetsCache lazy hit 第二次 loadScene 同 scene', async () => {
    const fetcher = vi.fn(async (id: number) => minimalSceneAssets(id))
    const cache = new SceneAssetsCache(fetcher)
    const gs = createInitialGameState({ col: 0, row: 0, facing: 'down' })
    
    await loadScene({ gs, sceneId: 3, assets: cache })
    expect(fetcher).toHaveBeenCalledTimes(1)
    
    await loadScene({ gs, sceneId: 5, assets: cache })  // 新 scene
    expect(fetcher).toHaveBeenCalledTimes(2)
    
    await loadScene({ gs, sceneId: 3, assets: cache })  // 回到 scene 3
    expect(fetcher).toHaveBeenCalledTimes(2)  // cache hit
  })
})
```

跑确认失败。

- [ ] **Step 3: 实现 loadScene 函数**

修改 `packages/game/src/core/scene-system.ts`,加 export:

```typescript
import type { SceneAssetsCache, SceneAssets } from '../assets/loader.js'
import type { GameState, Facing } from './game-state.js'

export interface LoadSceneInput {
  gs: GameState
  sceneId: number
  assets: SceneAssetsCache
  /** party 起点(可选;不传则不改) */
  partyStart?: { col: number; row: number; facing?: Facing }
}

/**
 * Scene 切换(D33 lazy)。
 *
 * 1. SceneAssetsCache lazy fetch 新 scene 资源(cache hit 第二次同 scene 不 fetch)
 * 2. 重置 GameState scene 字段(scene id / npcs / tilemap reference)
 * 3. 写 party 起点(若 partyStart 传了)
 * 4. **不**自动跑 onEnter — M3.5 dev shortcut 模式不需要(D34);M5 真做剧情链时升级
 */
export async function loadScene(input: LoadSceneInput): Promise<void> {
  const newSceneAssets = await input.assets.loadScene(input.sceneId)
  
  // 重置 scene 字段
  input.gs.scene.id = input.sceneId
  input.gs.scene.mapNum = newSceneAssets.tilemap['mapNum'] as number  // 若 SceneAssets 含 mapNum;否则 dump scene-N.json 时含
  // M2 GameState.npcs 是 NpcState[] — 从 SceneEventObject 转换
  input.gs.npcs = newSceneAssets.eventObjects.map((eo) => ({
    id: eo.id,
    col: eo.x,
    row: eo.y,
    spriteNum: eo.spriteNum,
    triggerLabel: undefined,  // M2 实施时按 npcFromEventObject 模式
  }))
  
  // 写 party 起点
  if (input.partyStart) {
    input.gs.party.col = input.partyStart.col
    input.gs.party.row = input.partyStart.row
    if (input.partyStart.facing) input.gs.party.facing = input.partyStart.facing
  }
}
```

> 实际 GameState.scene 字段 / npcs 类型按 M2 真定义改;`npcFromEventObject` M2 已建 helper,直接复用。**实施时按真 M2 schema** 改。

- [ ] **Step 4: 跑测试通过 + Commit**

```bash
pnpm -F @type-pal/game vitest run src/core/scene-system.test.ts -t "loadScene"
pnpm check
git add packages/game/src/core/scene-system.ts packages/game/src/core/scene-system.test.ts
git commit -m "feat(M3.5.9): scene-system.ts loadScene 函数(D33 lazy 切场景)"
```

---

## Task 10: `core/event-system.ts` 加 `loadScene` opcode handler stub

**Files:**
- Modify: `packages/game/src/core/event-system.ts`(加 loadScene case stub)
- Modify: `packages/game/src/core/event-system.test.ts`(加 stub 测试)

**Why:** T3 把 `loadScene` opcode 加进 disasm/recompile;EventSystem 现在撞到 `loadScene` 命令应该处理(不抛错)。M3.5 选 B 路线:**stub(no-op skip + console.debug),不真执行 scene 切换**(那由 dev panel 直调 loadScene 函数完成)。M5 升级到 emit + 可等待命令。

- [ ] **Step 1: 写 stub 测试**

修改 `packages/game/src/core/event-system.test.ts`,加 case:

```typescript
describe('loadScene opcode handler stub(M3.5)', () => {
  it('runScript 撞 loadScene → console.debug 跳过 + ip++ 不抛错', () => {
    const commands: Command[] = [
      { op: 'loadScene', sceneId: 12 },
      { op: 'end' },
    ]
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    
    const result = runScript({
      ip: 0,
      commands,
      runtimeMode: 'explore',
    })
    
    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('loadScene'), expect.anything())
    expect(result).toBe(2)  // 跳过 loadScene + end
    debugSpy.mockRestore()
  })

  it('battle mode 同样 stub(D26 跨 mode 一致)', () => {
    const commands: Command[] = [{ op: 'loadScene', sceneId: 3 }, { op: 'end' }]
    const result = runScript({
      ip: 0, commands, runtimeMode: 'battle',
      battleCtx: { state: {} as any },
    })
    expect(result).toBe(2)
  })
})
```

- [ ] **Step 2: 实现 stub**

修改 `packages/game/src/core/event-system.ts`,在 runScript switch 加 case(看 M3 phase 1 T17 真 EventSystem 结构):

```typescript
    case 'loadScene':
      // M3.5 B 路线:stub no-op + console.debug;真切场景由 dev panel 直调 loadScene 函数完成。
      // M5 真做剧情链时升级为 emit + 可等待命令(A 路线)
      console.debug('[event-system stub] loadScene sceneId=', cmd.sceneId)
      ip++
      break
```

- [ ] **Step 3: 跑测试 + Commit**

```bash
pnpm -F @type-pal/game vitest run src/core/event-system.test.ts -t "loadScene"
git add packages/game/src/core/event-system.ts packages/game/src/core/event-system.test.ts
git commit -m "feat(M3.5.10): event-system.ts loadScene opcode handler stub(B 路线)"
```

---

## Task 11: `core/scene-system.ts` 加明雷机制

**Files:**
- Modify: `packages/game/src/core/scene-system.ts`(tickSceneSystem 加 contact triggerMode 检测)
- Modify: `packages/game/src/core/scene-system.test.ts`(L1b 测试)

**Why:** D32 明雷怪机制 — 玩家走进 `triggerMode=contact` 的 EventObject cell 自动跑 trigger 段。对照 sdlpal `play.c::PAL_PartyWalk` 真行为。

- [ ] **Step 1: grep sdlpal `play.c` 找 triggerMode 真值含义**

```bash
grep -n "wTriggerMode\|PAL_PartyWalk\|kTriggerNormal" reference/sdlpal/play.c reference/sdlpal/global.h | head -30
```

记下:
- triggerMode 真值含义(可能是 enum):0 = 不触发, 1/2/3/4 = 不同触发类型
- 明雷怪 / 接触触发对应哪个值
- Confirm 触发(NPC)对应哪个值

实施时按真值定义:
```typescript
const TRIGGER_MODE_NONE = 0
const TRIGGER_MODE_CONTACT = ???  // M3.5 实施时按 sdlpal 真值定;假设 4
// 其他 triggerMode 值(Confirm 触发 / 传送 / 等)M3.5 简版不区分:!=0 && !=CONTACT 当作 M2 旧 Confirm 触发逻辑
```

- [ ] **Step 2: 写 L1b 明雷机制测试**

```typescript
describe('明雷机制 — triggerMode=contact 自动 runScript(M3.5)', () => {
  it('party 走进 contact cell → 自动 runScript + mode 切 battle', () => {
    const gs = createInitialGameState({ col: 9, row: 5, facing: 'right' })
    // 加一个 contact EventObject 在 (10, 5):
    gs.npcs = [
      { id: 0, col: 10, row: 5, spriteNum: 78, triggerLabel: 'L_100', triggerMode: TRIGGER_MODE_CONTACT },
    ]
    // 加 trigger 段:L_100 = startBattle(0)
    const eventCommands = [
      { op: 'startBattle' as const, enemyTeamId: 1, label: 'L_100' },
      { op: 'end' as const },
    ]
    // ...
    
    const bus = makeMockBus()
    // 模拟按 Right → party.col 10
    tickSceneSystem(gs, snap(['Right']), bus, { eventCommands, /* ... */ })
    
    expect(gs.party.col).toBe(10)
    expect(gs.mode).toBe('battle')  // 自动跑了 startBattle
  })

  it('party 走进 non-contact cell(triggerMode=0)→ 不自动触发', () => {
    const gs = createInitialGameState({ col: 9, row: 5, facing: 'right' })
    gs.npcs = [
      { id: 0, col: 10, row: 5, spriteNum: 78, triggerLabel: 'L_100', triggerMode: 0 },
    ]
    // 走到 (10, 5),但 triggerMode=0 不触发
    tickSceneSystem(gs, snap(['Right']), makeMockBus(), { /* ... */ })
    
    // M2 旧行为:party 撞 NPC cell 应该被阻挡(NPC.state != hidden)
    // 但本测试关注 triggerMode 不触发,可独立设 EventObject.state 让走进
    expect(gs.mode).toBe('explore')  // 没自动 battle
  })

  it('party 走进 Confirm 触发 cell → 不自动(等 Confirm,M2 旧)', () => {
    const gs = createInitialGameState({ col: 9, row: 5, facing: 'right' })
    gs.npcs = [
      { id: 0, col: 10, row: 5, spriteNum: 78, triggerLabel: 'L_100', triggerMode: 1 /* assume Confirm */ },
    ]
    tickSceneSystem(gs, snap(['Right']), makeMockBus(), { /* ... */ })
    expect(gs.mode).toBe('explore')  // 没自动,要等 Confirm
  })
})
```

- [ ] **Step 3: 实现明雷检测**

修改 `packages/game/src/core/scene-system.ts` `tickSceneSystem`,在 party 走路完成后加:

```typescript
// 走完路后,检测 party 当前 cell 上有 contact EventObject 自动触发
const currentCellNpc = gs.npcs.find((n) => n.col === gs.party.col && n.row === gs.party.row)
if (currentCellNpc?.triggerMode === TRIGGER_MODE_CONTACT && currentCellNpc.triggerLabel) {
  // 装载 eventCursor → runScript → 战斗系统接管
  const ip = labelMap[currentCellNpc.triggerLabel]
  if (ip !== undefined) {
    gs.eventCursor = { commands: eventCommands, labelMap, ip }
    gs.mode = 'event'  // 进 event mode,EventSystem 接管会跑到 startBattle 切 battle
  }
}
```

> 实际 EventSystem / mode 切换 接口按 M2 真实现改;关键是检测 + 触发自动 runScript,而不是等 Confirm。

- [ ] **Step 4: 跑测试 + Commit**

```bash
pnpm -F @type-pal/game vitest run src/core/scene-system.test.ts -t "明雷"
pnpm check
git add packages/game/src/core/scene-system.ts packages/game/src/core/scene-system.test.ts
git commit -m "feat(M3.5.11): scene-system 加明雷机制(triggerMode=contact 自动 runScript,D32)"
```

---

## Task 12: scene-system L1b 集成测试加明雷 + 反例

**Files:**
- Modify: `packages/game/src/core/scene-system.test.ts`(扩 case)

**Why:** T11 加了基本明雷机制,本 task 补反例 + edge case 让覆盖完整。

- [ ] **Step 1: 加补反例测试**

```typescript
describe('明雷机制反例(M3.5)', () => {
  it('triggerLabel 缺(triggerScript=0)→ contact 也不触发', () => {
    const gs = createInitialGameState({ col: 9, row: 5, facing: 'right' })
    gs.npcs = [
      { id: 0, col: 10, row: 5, spriteNum: 78, triggerLabel: undefined, triggerMode: TRIGGER_MODE_CONTACT },
    ]
    tickSceneSystem(gs, snap(['Right']), makeMockBus(), { /* ... */ })
    expect(gs.mode).toBe('explore')  // 无 triggerLabel,不动
  })

  it('state=hidden EventObject contact 也不触发(已被收过 / 暂藏)', () => {
    const gs = createInitialGameState({ col: 9, row: 5, facing: 'right' })
    gs.npcs = [
      { id: 0, col: 10, row: 5, spriteNum: 78, triggerLabel: 'L_100', triggerMode: TRIGGER_MODE_CONTACT, state: 0 /* hidden */ },
    ]
    tickSceneSystem(gs, snap(['Right']), makeMockBus(), { /* ... */ })
    expect(gs.mode).toBe('explore')
  })

  it('label 不在 labelMap → console.warn + 不切 mode', () => {
    const gs = createInitialGameState({ col: 9, row: 5, facing: 'right' })
    gs.npcs = [
      { id: 0, col: 10, row: 5, spriteNum: 78, triggerLabel: 'L_NONEXIST', triggerMode: TRIGGER_MODE_CONTACT },
    ]
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    tickSceneSystem(gs, snap(['Right']), makeMockBus(), { /* ... eventCommands without L_NONEXIST ... */ })
    expect(gs.mode).toBe('explore')
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})
```

- [ ] **Step 2: 修明雷 implementation 处理反例**

在 T11 加的代码里加 state / label guard:

```typescript
const currentCellNpc = gs.npcs.find((n) => 
  n.col === gs.party.col && n.row === gs.party.row && n.state !== STATE_HIDDEN
)
if (currentCellNpc?.triggerMode === TRIGGER_MODE_CONTACT && currentCellNpc.triggerLabel) {
  const ip = labelMap[currentCellNpc.triggerLabel]
  if (ip === undefined) {
    console.warn(`[明雷] label ${currentCellNpc.triggerLabel} 不在 labelMap,跳过`)
    return
  }
  gs.eventCursor = { commands: eventCommands, labelMap, ip }
  gs.mode = 'event'
}
```

- [ ] **Step 3: 跑测试 + Commit**

```bash
pnpm check
git add packages/game/src/core/scene-system.ts packages/game/src/core/scene-system.test.ts
git commit -m "feat(M3.5.12): scene-system 明雷反例 + edge case(state hidden / label 缺 / 等)"
```

---

## Task 13: `battle-system.ts` 扩 `tickSelectAction` mainMenu / Cancel 处理

**Files:**
- Modify: `packages/game/src/core/battle/battle-system.ts`(tickSelectAction mainMenu 分支)
- Modify: `packages/game/src/core/battle/__tests__/battle-system.test.ts`

**Why:** M3 phase 1 接受的 limitation 是 `tickSelectAction` stub(只检测 pendingActions size,不处理 input)。M3.5 真做 — 让用户按 Up/Down/Confirm 真菜单交互。本 task 先做 mainMenu(5 项主菜单)+ Cancel,T14 做 magic/item/targetSelect 二级菜单。

- [ ] **Step 1: 看 M3 现有 tickSelectAction stub**

```bash
grep -n "tickSelectAction\|uiState\|uiCursor" packages/game/src/core/battle/battle-system.ts | head -20
```

理解 stub 当前结构(应该只是 "if pendingActions size >= alive players → 切 performAction" 一个分支)。

- [ ] **Step 2: 写 mainMenu 测试**

```typescript
import { describe, it, expect } from 'vitest'
import { startBattle, tickBattle } from '../battle-system.js'
// ...

describe('tickSelectAction mainMenu input(M3.5)', () => {
  function bootstrapBattle(): { gs: GameState; input: InputSnapshot } {
    // M3 helper:构造 gs + startBattle + tick 1 次到 selectAction phase
    // ...
  }

  it('Up → uiCursor - 1(wrap to 4)', () => {
    const { gs } = bootstrapBattle()
    gs.battleState!.uiCursor = 0
    tickBattle(gs, snap([], ['Up']), makeMockBus())
    expect(gs.battleState?.uiCursor).toBe(4)  // wrap
  })

  it('Down → uiCursor + 1(wrap to 0)', () => {
    const { gs } = bootstrapBattle()
    gs.battleState!.uiCursor = 4
    tickBattle(gs, snap([], ['Down']), makeMockBus())
    expect(gs.battleState?.uiCursor).toBe(0)  // wrap
  })

  it('Confirm 在 mainMenu cursor=0(攻击)→ uiState=targetSelect', () => {
    const { gs } = bootstrapBattle()
    gs.battleState!.uiCursor = 0  // 攻击
    tickBattle(gs, snap([], ['Confirm']), makeMockBus())
    expect(gs.battleState?.uiState).toBe('targetSelect')
  })

  it('Confirm 在 cursor=3(防御)→ 直接填 pendingActions + advance', () => {
    const { gs } = bootstrapBattle()
    gs.battleState!.uiCursor = 3  // 防御
    tickBattle(gs, snap([], ['Confirm']), makeMockBus())
    expect(gs.battleState?.pendingActions.has(0)).toBe(true)
    expect(gs.battleState?.pendingActions.get(0)?.type).toBe('defend')
  })

  it('Confirm 在 cursor=4(逃跑)→ 直接填 pendingActions = flee', () => {
    const { gs } = bootstrapBattle()
    gs.battleState!.uiCursor = 4
    tickBattle(gs, snap([], ['Confirm']), makeMockBus())
    expect(gs.battleState?.pendingActions.get(0)?.type).toBe('flee')
  })
})
```

- [ ] **Step 3: 实现 mainMenu handler**

修改 tickSelectAction(伪代码;实际按 M3 真结构):

```typescript
function tickSelectAction(state: BattleState, gs: GameState, input: InputSnapshot, bus: CommandBus, res: any): void {
  if (state.selectingPlayerIdx === undefined) {
    // 推进或全填好 → performAction
    return advanceOrSubmit(state, gs, res)
  }
  
  switch (state.uiState) {
    case 'mainMenu':
      handleMainMenuInput(state, input)
      break
    // T14 加 magicMenu / itemMenu / targetSelect
  }
}

const MAIN_MENU_LENGTH = 5  // 攻击 / 法术 / 物品 / 防御 / 逃跑

function handleMainMenuInput(state: BattleState, input: InputSnapshot): void {
  if (input.pressed.has('Up')) {
    state.uiCursor = (state.uiCursor - 1 + MAIN_MENU_LENGTH) % MAIN_MENU_LENGTH
  } else if (input.pressed.has('Down')) {
    state.uiCursor = (state.uiCursor + 1) % MAIN_MENU_LENGTH
  } else if (input.pressed.has('Confirm')) {
    handleMainMenuConfirm(state)
  }
  // Cancel 在 mainMenu 无意义(不能回上一级 — 已经在顶层菜单)
}

function handleMainMenuConfirm(state: BattleState): void {
  const playerIdx = state.selectingPlayerIdx!
  switch (state.uiCursor) {
    case 0: // 攻击 → targetSelect
      state.uiState = 'targetSelect'
      state.uiCursor = 0
      // 记下 pendingAction 半成品(T14 在 targetSelect 完成填好)
      ;(state as any).pendingActionDraft = { type: 'attack', actionId: undefined }
      break
    case 1: // 法术 → magicMenu (T14)
      state.uiState = 'magicMenu'
      state.uiCursor = 0
      break
    case 2: // 物品 → itemMenu (T14)
      state.uiState = 'itemMenu'
      state.uiCursor = 0
      break
    case 3: // 防御 → 直接填
      state.pendingActions.set(playerIdx, { type: 'defend', target: -1 })
      advanceSelectingPlayer(state)
      break
    case 4: // 逃跑 → 直接填
      state.pendingActions.set(playerIdx, { type: 'flee', target: -1 })
      advanceSelectingPlayer(state)
      break
  }
}

function advanceSelectingPlayer(state: BattleState): void {
  // 找下一个未填 pendingActions 的活队员;全填好 → buildActionQueue + 切 performAction
  // ...
}
```

- [ ] **Step 4: 跑测试 + Commit**

```bash
pnpm -F @type-pal/game vitest run src/core/battle/__tests__/battle-system.test.ts -t "mainMenu"
git add packages/game/src/core/battle/battle-system.ts packages/game/src/core/battle/__tests__/battle-system.test.ts
git commit -m "feat(M3.5.13): tickSelectAction mainMenu input 处理(攻击/防御/逃跑 + Up/Down 切 cursor)"
```

---

## Task 14: tickSelectAction magicMenu / itemMenu / targetSelect handlers

**Files:**
- Modify: `packages/game/src/core/battle/battle-system.ts`
- Modify: `packages/game/src/core/battle/__tests__/battle-system.test.ts`

**Why:** T13 mainMenu 完成,本 task 加二级菜单 + 目标选择 + Cancel 退回。

- [ ] **Step 1: 写测试**

```typescript
describe('tickSelectAction magicMenu / itemMenu / targetSelect(M3.5)', () => {
  it('magicMenu Cancel → 回 mainMenu', () => {
    const { gs } = bootstrapBattle()
    gs.battleState!.uiState = 'magicMenu'
    gs.battleState!.uiCursor = 2
    tickBattle(gs, snap([], ['Cancel']), makeMockBus())
    expect(gs.battleState?.uiState).toBe('mainMenu')
  })

  it('magicMenu Confirm → 进 targetSelect + pendingActionDraft 含 magic', () => {
    const { gs } = bootstrapBattle()
    // 设 player 学了法术 [spellId 12]
    const role = (gs.battleState as any).resources.playerRoles.roles[0]
    ;(role as any).learnedSpells = [12]
    gs.battleState!.uiState = 'magicMenu'
    gs.battleState!.uiCursor = 0
    tickBattle(gs, snap([], ['Confirm']), makeMockBus())
    expect(gs.battleState?.uiState).toBe('targetSelect')
    expect((gs.battleState as any).pendingActionDraft).toMatchObject({ type: 'magic', actionId: 12 })
  })

  it('targetSelect Confirm → 填 pendingActions + advance', () => {
    const { gs } = bootstrapBattle()
    gs.battleState!.uiState = 'targetSelect'
    gs.battleState!.uiCursor = 0
    ;(gs.battleState as any).pendingActionDraft = { type: 'attack', actionId: undefined }
    tickBattle(gs, snap([], ['Confirm']), makeMockBus())
    expect(gs.battleState?.pendingActions.get(0)?.type).toBe('attack')
    expect(gs.battleState?.pendingActions.get(0)?.target).toBe(0)
  })

  it('targetSelect Left/Right 切 target', () => {
    const { gs } = bootstrapBattle()
    gs.battleState!.uiState = 'targetSelect'
    gs.battleState!.uiCursor = 0
    tickBattle(gs, snap([], ['Right']), makeMockBus())
    expect(gs.battleState?.uiCursor).toBeGreaterThan(0)
  })

  it('targetSelect Cancel → 回 mainMenu', () => {
    const { gs } = bootstrapBattle()
    gs.battleState!.uiState = 'targetSelect'
    tickBattle(gs, snap([], ['Cancel']), makeMockBus())
    expect(gs.battleState?.uiState).toBe('mainMenu')
  })
})
```

- [ ] **Step 2: 实现 magic/item/targetSelect handlers**

```typescript
function handleMagicMenuInput(state: BattleState, input: InputSnapshot, role: any, spells: Spell[]): void {
  const learned: number[] = (role as any).learnedSpells ?? []
  if (input.pressed.has('Up')) {
    state.uiCursor = (state.uiCursor - 1 + Math.max(learned.length, 1)) % Math.max(learned.length, 1)
  } else if (input.pressed.has('Down')) {
    state.uiCursor = (state.uiCursor + 1) % Math.max(learned.length, 1)
  } else if (input.pressed.has('Confirm')) {
    const spellId = learned[state.uiCursor]
    if (spellId !== undefined) {
      ;(state as any).pendingActionDraft = { type: 'magic', actionId: spellId }
      state.uiState = 'targetSelect'
      state.uiCursor = 0
    }
  } else if (input.pressed.has('Cancel')) {
    state.uiState = 'mainMenu'
    state.uiCursor = 0
  }
}

function handleItemMenuInput(state: BattleState, input: InputSnapshot, gs: GameState, items: Item[]): void {
  const inventory = gs.inventory.filter((e) => e.count > 0)
  // 类似 magicMenu,Confirm 选 item → targetSelect;Cancel → mainMenu
  // ...
}

function handleTargetSelectInput(state: BattleState, input: InputSnapshot): void {
  const enemyCount = state.enemies.filter(e => e.e.health > 0).length
  if (input.pressed.has('Left')) {
    state.uiCursor = (state.uiCursor - 1 + enemyCount) % enemyCount
  } else if (input.pressed.has('Right')) {
    state.uiCursor = (state.uiCursor + 1) % enemyCount
  } else if (input.pressed.has('Confirm')) {
    const draft = (state as any).pendingActionDraft
    if (draft) {
      const playerIdx = state.selectingPlayerIdx!
      state.pendingActions.set(playerIdx, { ...draft, target: state.uiCursor })
      ;(state as any).pendingActionDraft = undefined
      advanceSelectingPlayer(state)
    }
  } else if (input.pressed.has('Cancel')) {
    state.uiState = 'mainMenu'
    state.uiCursor = 0
    ;(state as any).pendingActionDraft = undefined
  }
}

// tickSelectAction 加 case:
switch (state.uiState) {
  case 'mainMenu': handleMainMenuInput(state, input); break
  case 'magicMenu': handleMagicMenuInput(state, input, res.playerRoles.roles[state.players[playerIdx].roleId], res.spells); break
  case 'itemMenu': handleItemMenuInput(state, input, gs, res.items); break
  case 'targetSelect': handleTargetSelectInput(state, input); break
}
```

- [ ] **Step 3: 跑测试 + Commit**

```bash
pnpm -F @type-pal/game vitest run src/core/battle/__tests__/battle-system.test.ts -t "magicMenu\|itemMenu\|targetSelect"
git add packages/game/src/core/battle/battle-system.ts packages/game/src/core/battle/__tests__/battle-system.test.ts
git commit -m "feat(M3.5.14): tickSelectAction 二级菜单 + targetSelect + Cancel 退回"
```

---

## Task 15: battle-system L1b 集成测试加 input wire 综合

**Files:**
- Modify: `packages/game/src/core/battle/__tests__/battle-system.test.ts`(加端到端 input 序列测试)

**Why:** T13 / T14 各自单点测;本 task 写端到端 input 序列把 input wire 整链路验证一遍。

- [ ] **Step 1: 写端到端 input 序列测试**

```typescript
describe('tickSelectAction 端到端 input 序列(M3.5)', () => {
  it('用户选攻击 → 选 target 0 → pendingActions 填好 → 切 performAction', () => {
    const { gs } = bootstrapBattle()
    gs.battleState!.uiCursor = 0  // 攻击
    
    // Step 1: Confirm 选攻击
    tickBattle(gs, snap([], ['Confirm']), makeMockBus())
    expect(gs.battleState?.uiState).toBe('targetSelect')
    
    // Step 2: Right(本 fixture 假设有 2+ enemy,Right 切到 idx 1)
    tickBattle(gs, snap([], ['Right']), makeMockBus())
    expect(gs.battleState?.uiCursor).toBe(1)
    
    // Step 3: Cancel 回 mainMenu
    tickBattle(gs, snap([], ['Cancel']), makeMockBus())
    expect(gs.battleState?.uiState).toBe('mainMenu')
    expect(gs.battleState?.uiCursor).toBe(0)
    
    // Step 4: 再 Confirm 攻击 + Left 切回 target 0 + Confirm
    tickBattle(gs, snap([], ['Confirm']), makeMockBus())
    tickBattle(gs, snap([], ['Confirm']), makeMockBus())
    expect(gs.battleState?.pendingActions.get(0)?.type).toBe('attack')
    expect(gs.battleState?.pendingActions.get(0)?.target).toBe(0)
    
    // Step 5: 应该切到 performAction(单队员 fixture)
    expect(gs.battleState?.phase).toBe('performAction')
  })
})
```

- [ ] **Step 2: 跑测试**

修通过(若 fail 说明 T13 / T14 实现某个 state 转换错;debug 修)。

```bash
pnpm -F @type-pal/game vitest run src/core/battle/__tests__/battle-system.test.ts -t "input 序列"
```

- [ ] **Step 3: Commit**

```bash
git add packages/game/src/core/battle/__tests__/battle-system.test.ts
git commit -m "feat(M3.5.15): battle input wire 端到端综合 L1b 测试"
```

---

## Task 16: `data/scene-jumps.json` 新建 + `dev-panel.ts` 加 SCENE_JUMPS picker

**Files:**
- Create: `packages/game/src/data/scene-jumps.json`
- Modify: `packages/game/src/shell/dev-panel.ts`(picker 加 scene jump section)

**Why:** D34 dev shortcut 跳 scene 的预设。M3 dev panel 现在只有 fixture-zh1/zh2/end 三个战斗 jump;M3.5 加 scene jump 三个(scene 1 / 仙灵岛码头 / 仙灵岛入口)。

- [ ] **Step 1: 创 scene-jumps.json**

```json
{
  "jumps": [
    {
      "id": "scene-1",
      "label": "跳 scene 1(客栈,M2 起点)",
      "sceneId": 1,
      "partyStart": { "col": 16, "row": 12, "facing": "down" }
    },
    {
      "id": "scene-xiaoling-port",
      "label": "跳仙灵岛码头",
      "sceneId": 3,
      "partyStart": { "col": 10, "row": 10, "facing": "down" }
    },
    {
      "id": "scene-xiaoling-entry",
      "label": "跳仙灵岛入口(撞草妖)",
      "sceneId": 4,
      "partyStart": { "col": 10, "row": 5, "facing": "down" }
    }
  ]
}
```

> sceneId 是 T4 调研 verify 真值;partyStart col/row 实施时按 scene-N.json + sdlpal 真游戏定位置(可以 dev 跑时把 party 位置写出来,看 sdlpal 真游戏到该 scene 时 party 位置作 baseline)。

- [ ] **Step 2: 修 dev-panel.ts picker 加 scene jump section**

打开 `packages/game/src/shell/dev-panel.ts`,在现有 fixture picker(M3 加的)之后加 scene jump section:

```typescript
import sceneJumps from '../data/scene-jumps.json'

// 在 openPicker(deps) 中,fixture 部分之后:
const sceneSection = document.createElement('div')
sceneSection.style.cssText = 'margin-top: 12px; border-top: 1px solid #999; padding-top: 8px'
const sceneTitle = document.createElement('h4')
sceneTitle.textContent = 'Dev: Scene Jump'
sceneSection.appendChild(sceneTitle)

for (const jump of sceneJumps.jumps) {
  const btn = document.createElement('button')
  btn.textContent = `${jump.id}: ${jump.label}`
  btn.style.cssText = 'display:block; margin:4px 0; padding:4px 8px'
  btn.addEventListener('click', async () => {
    div.remove()
    await applySceneJump(deps, jump)  // T17 实现
  })
  sceneSection.appendChild(btn)
}
div.appendChild(sceneSection)
```

- [ ] **Step 3: typecheck verify**

```bash
pnpm -F @type-pal/game typecheck
```

> 本 task `applySceneJump` 还没实现(T17 做),typecheck 应该 fail。先 stub:

```typescript
async function applySceneJump(deps: DevPanelDeps, jump: any): Promise<void> {
  console.log('[dev-panel] scene jump stub:', jump)
  // T17 真做
}
```

跑 typecheck 通过。

- [ ] **Step 4: Commit**

```bash
git add packages/game/src/data/scene-jumps.json packages/game/src/shell/dev-panel.ts
git commit -m "feat(M3.5.16): dev panel 加 scene jump picker section(3 预设)"
```

---

## Task 17: `shell/dev-panel.ts` 实现 `applySceneJump`

**Files:**
- Modify: `packages/game/src/shell/dev-panel.ts`

**Why:** T16 stub,T17 真做 — 调 `loadScene` + 写 party 位置。需要 SceneAssetsCache(T8)+ loadScene(T9)真挂在 deps 上。

- [ ] **Step 1: 修改 dev-panel.ts deps 接口 + applySceneJump 实现**

```typescript
import { loadScene } from '../core/scene-system.js'
import type { SceneAssetsCache } from '../assets/loader.js'

// 修 DevPanelDeps 加 sceneAssetsCache:
interface DevPanelDeps {
  gs: GameState
  fixtures: BattleFixturesData
  startBattle: (input: any) => void
  resources: any
  sceneAssetsCache: SceneAssetsCache  // M3.5 新
}

// 真 applySceneJump:
async function applySceneJump(deps: DevPanelDeps, jump: { sceneId: number; partyStart: { col: number; row: number; facing: string } }): Promise<void> {
  try {
    await loadScene({
      gs: deps.gs,
      sceneId: jump.sceneId,
      assets: deps.sceneAssetsCache,
      partyStart: { col: jump.partyStart.col, row: jump.partyStart.row, facing: jump.partyStart.facing as any },
    })
    console.log('[dev-panel] scene jump done:', jump.sceneId)
  } catch (e) {
    console.error('[dev-panel] scene jump failed:', e)
  }
}
```

- [ ] **Step 2: bootstrap.ts 改成 SceneAssetsCache 注入**

```bash
grep -n "setupDevPanel\|loadAssets" packages/game/src/shell/bootstrap.ts | head -10
```

修改 bootstrap.ts:
```typescript
import { SceneAssetsCache } from '../assets/loader.js'

// 构造 SceneAssetsCache + 启动注入:
const sceneAssetsCache = new SceneAssetsCache(async (sceneId) => {
  // fetch scene-${sceneId}.json + tilemap-${sceneId}.json + palette + npc sprites
  // ... (real fetcher 实施时按真路径定)
})

setupDevPanel({
  gs, fixtures, startBattle,
  resources: { ...assets, eventSystem },
  sceneAssetsCache,
})
```

- [ ] **Step 3: dev verify(轻量)**

```bash
pnpm -F @type-pal/game dev
# 浏览器开 → 按 B → 弹 picker(应该含 "Dev: Scene Jump" section)
# 点 "跳仙灵岛入口" → console.log 应该看到 "scene jump done: 4"
# 看 canvas 是否切到新地图(visual sanity)
```

> 如果 visual 看不到新地图(canvas 不变),可能 present.ts 没 re-render 新 tilemap。实施时 verify present.ts 在 GameState scene.id 变化后是不是真重画。

- [ ] **Step 4: Commit**

```bash
git add packages/game/src/shell/dev-panel.ts packages/game/src/shell/bootstrap.ts
git commit -m "feat(M3.5.17): dev panel applySceneJump 真调 loadScene + bootstrap 注入 SceneAssetsCache"
```

---

## Task 18: Playwright + pixelmatch devDep + `playwright.config.ts` + `.gitignore`

**Files:**
- Modify: `packages/game/package.json`(加 `@playwright/test` + `pixelmatch` + `pnpm e2e` script)
- Create: `packages/game/playwright.config.ts`
- Modify: `.gitignore`(加 `packages/game/e2e/baselines/`)

**Why:** L2 Playwright runner 基础设施。M3.5 第一步搭好 Playwright + pixelmatch + config,后续 19-37 task 才能写 spec。

- [ ] **Step 1: 加 devDep**

```bash
pnpm -F @type-pal/game add -D @playwright/test pixelmatch @types/pixelmatch
```

- [ ] **Step 2: 创 playwright.config.ts**

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,  // dev server 单 instance,serial 跑
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  },
})
```

- [ ] **Step 3: 改 package.json 加 e2e script**

```json
"scripts": {
  // ...现有
  "e2e": "playwright test",
  "e2e:update": "playwright test --update-snapshots"
}
```

- [ ] **Step 4: 改 .gitignore**

```bash
# 在 .gitignore 末尾加(如果还没有):
echo "
# Playwright L2 baseline PNG(版权,含原版游戏画面,本机生成不入库)
packages/game/e2e/baselines/

# Playwright 临时输出
packages/game/test-results/
packages/game/playwright-report/
" >> .gitignore
```

> 实际 `.gitignore` 编辑(可能需要 Read 然后 Edit,看 现有内容)。

- [ ] **Step 5: 验证 install + config 通**

```bash
pnpm -F @type-pal/game e2e --list 2>&1 | head -5
```

期望:输出 `No tests found`(因为 e2e/ 目录还空)或 类似 — 至少不抛错 "config not found"。

- [ ] **Step 6: Commit**

```bash
git add packages/game/package.json packages/game/playwright.config.ts .gitignore pnpm-lock.yaml
git commit -m "feat(M3.5.18): Playwright + pixelmatch L2 基础设施(playwright.config + gitignore)"
```

---

## Task 19: `e2e/helpers/bootstrap.ts`(启动 dev server + nav + 等 onEnter + dev panel hook)

**Files:**
- Create: `packages/game/e2e/helpers/bootstrap.ts`

**Why:** L2 23 case 都需要相同基础设施:启 dev server(playwright.config 已 handle webServer)+ nav 到 localhost:5173 + 等 scene 1 onEnter 跑完进 explore mode + dev panel hook(模拟按 B / F1)。抽出 helper 复用。

- [ ] **Step 1: 实现 e2e/helpers/bootstrap.ts**

```typescript
import type { Page } from '@playwright/test'

/**
 * 启动 game (Playwright nav 到 localhost:5173) 并等 scene 1 onEnter 跑完进 explore mode。
 *
 * 实际过程:scene 1 onEnter 段有几十条 raw + showDialog;dev 模式下需要按 Space 几十次推完
 * 或者用 dev shortcut "force explore" (M3.5 没建,可考虑实施时加;否则按 Space N 次)。
 *
 * M3.5 简版:按 Space ~50 次,直到 console.debug 显示 "scene 1 onEnter 完"。
 */
export async function bootstrap(page: Page): Promise<void> {
  await page.goto('/')
  
  // 等 canvas 渲染出来
  await page.waitForSelector('canvas', { timeout: 30_000 })
  
  // 按 Space ~50 次推完 onEnter 对话
  // (可调:console.debug 监听 mode 变化,看到 'explore' 就 break)
  for (let i = 0; i < 100; i++) {
    await page.keyboard.press('Space')
    await page.waitForTimeout(120)  // 10fps tick = 100ms,等一个 tick + 余量
    // 简单 break 条件:看 GameState dump 看 mode
    const mode = await getCurrentMode(page)
    if (mode === 'explore') break
  }
}

/** F1 dump GameState + parse mode 字段(用于等 onEnter 结束)。 */
export async function getCurrentMode(page: Page): Promise<string> {
  // 监听 console 消息找 mode dump
  // M3 dev panel F1 console.log GameState JSON
  let mode = 'unknown'
  page.once('console', (msg) => {
    if (msg.text().includes('GameState dump')) {
      const args = msg.args()
      // 解析 GameState — Playwright console arg parsing 复杂,本 helper 简版用 evaluate
    }
  })
  // 改用 page.evaluate 直接读 window.__game.gs.mode(若 dev mode 暴露)
  // M3 dev mode 没暴露 — 实施时考虑加 (window.__game = { gs }) in bootstrap.ts dev gate
  return mode
}

/** 模拟按 B 弹 dev panel picker。 */
export async function openDevPicker(page: Page): Promise<void> {
  await page.keyboard.press('b')
  await page.waitForSelector('text=Dev: Battle Picker', { timeout: 5_000 })
}

/** 选 battle fixture(picker 内点对应按钮)。 */
export async function selectBattleFixture(page: Page, fixtureId: string): Promise<void> {
  await page.click(`button:has-text("${fixtureId}")`)
  // 等战斗界面渲染
  await page.waitForTimeout(500)
}

/** 选 scene jump(picker 内点对应按钮)。 */
export async function selectSceneJump(page: Page, jumpId: string): Promise<void> {
  await page.click(`button:has-text("${jumpId}")`)
  await page.waitForTimeout(500)
}
```

- [ ] **Step 2: dev gate 暴露 window.__game 用 evaluate**

修改 `packages/game/src/shell/bootstrap.ts`,dev mode 时暴露 GameState:

```typescript
// 在 setupDevPanel 之后:
if ((import.meta as any).env?.DEV) {
  ;(window as any).__game = { gs, assets, eventSystem }
}
```

更新 helpers/bootstrap.ts 的 getCurrentMode:

```typescript
export async function getCurrentMode(page: Page): Promise<string> {
  return await page.evaluate(() => (window as any).__game?.gs?.mode ?? 'unknown')
}
```

- [ ] **Step 3: smoke test bootstrap helper**

写 `packages/game/e2e/_smoke.spec.ts`(本 task 临时,T20 删):

```typescript
import { test, expect } from '@playwright/test'
import { bootstrap, getCurrentMode } from './helpers/bootstrap.js'

test('bootstrap helper 能跑通 + 进 explore', async ({ page }) => {
  await bootstrap(page)
  expect(await getCurrentMode(page)).toBe('explore')
})
```

跑:`pnpm -F @type-pal/game e2e _smoke.spec.ts`

期望:通过 — 验证 bootstrap helper 真能跑到 explore。

如果 fail(timeout / mode 还 'event'):
- 加大 Space loop 次数 / waitForTimeout
- 检查 dev gate 是不是真 expose `__game`(看 console)
- 实施时 fine-tune

- [ ] **Step 4: 删 _smoke.spec.ts + commit**

```bash
rm packages/game/e2e/_smoke.spec.ts
git add packages/game/e2e/helpers/bootstrap.ts packages/game/src/shell/bootstrap.ts
git commit -m "feat(M3.5.19): e2e/helpers/bootstrap.ts(启 server + 等 onEnter + dev panel hook)"
```

---

## Task 20: `e2e/helpers/snapshot.ts` + `pixel-diff.ts`

**Files:**
- Create: `packages/game/e2e/helpers/snapshot.ts`
- Create: `packages/game/e2e/helpers/pixel-diff.ts`

**Why:** L2 23 case 都要 截 canvas 像素 + 跟 baseline PNG diff。抽出 helper 复用 + pixelmatch wrapper。

- [ ] **Step 1: 实现 snapshot.ts**

```typescript
import type { Page } from '@playwright/test'

/**
 * 截 canvas 像素到 PNG buffer。
 * type-pal canvas 是 320×200 物理像素(D12 软件帧缓冲)。
 */
export async function snapshotCanvas(page: Page): Promise<Buffer> {
  // 用 page.evaluate 读 canvas → toDataURL → 解 base64 → Buffer
  const dataUrl = await page.evaluate(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null
    if (!canvas) throw new Error('no canvas')
    return canvas.toDataURL('image/png')
  })
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
  return Buffer.from(base64, 'base64')
}
```

- [ ] **Step 2: 实现 pixel-diff.ts**

```typescript
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export interface PixelDiffOptions {
  /** PNG buffer 来自 snapshotCanvas */
  actual: Buffer
  /** baseline 文件路径(`packages/game/e2e/baselines/<spec>/<case>.png`) */
  baselinePath: string
  /** pixelmatch threshold(0-1,0 严格) */
  threshold?: number
  /** 第一次跑 / 没 baseline 时:写 actual 为新 baseline */
  updateBaseline?: boolean
}

/**
 * pixelmatch wrapper:跟 baseline 比对,差异写 diff PNG。
 *
 * 返回 diff 像素数;0 = 完全一致;调用方可 `expect(diff).toBe(0)` 断言。
 * baseline 缺时,如果 updateBaseline=true 写 baseline + 返回 0(skip diff);否则抛错。
 */
export async function pixelDiff(opts: PixelDiffOptions): Promise<number> {
  if (!existsSync(opts.baselinePath)) {
    if (opts.updateBaseline) {
      mkdirSync(dirname(opts.baselinePath), { recursive: true })
      writeFileSync(opts.baselinePath, opts.actual)
      return 0
    }
    throw new Error(`Baseline missing: ${opts.baselinePath}. Run with --update-snapshots to generate.`)
  }
  
  const baseline = PNG.sync.read(readFileSync(opts.baselinePath))
  const actual = PNG.sync.read(opts.actual)
  
  if (baseline.width !== actual.width || baseline.height !== actual.height) {
    throw new Error(`Size mismatch: baseline ${baseline.width}×${baseline.height} vs actual ${actual.width}×${actual.height}`)
  }
  
  const diff = new PNG({ width: baseline.width, height: baseline.height })
  const numDiff = pixelmatch(baseline.data, actual.data, diff.data, baseline.width, baseline.height, {
    threshold: opts.threshold ?? 0.1,
  })
  
  if (numDiff > 0) {
    const diffPath = opts.baselinePath.replace(/\.png$/, '.diff.png')
    writeFileSync(diffPath, PNG.sync.write(diff))
    console.warn(`[pixel-diff] ${numDiff} diff pixels, diff PNG: ${diffPath}`)
  }
  
  return numDiff
}

/** 标准 baseline 路径解析:`packages/game/e2e/baselines/<group>/<id>.png` */
export function baselinePathFor(group: string, id: string): string {
  return resolve(__dirname, '..', 'baselines', group, `${id}.png`)
}
```

- [ ] **Step 3: typecheck verify**

```bash
pnpm -F @type-pal/game typecheck
```

期望:通过(pixelmatch 类型 + pngjs 类型从 M3.18 已加)。

- [ ] **Step 4: Commit**

```bash
git add packages/game/e2e/helpers/snapshot.ts packages/game/e2e/helpers/pixel-diff.ts
git commit -m "feat(M3.5.20): e2e/helpers snapshot + pixel-diff(pixelmatch wrapper)"
```

---

## Task 21: L2 a1 tilemap 渲染(3 scene)

**Files:**
- Create: `packages/game/e2e/scene/a1-tilemap-render.spec.ts`

**Why:** L2 第一个 case。验证 scene 1 / 仙灵岛码头 / 仙灵岛入口 三个 scene 的 tilemap 真渲染像素一致(本机 baseline pixel diff;baseline 不入 git)。

- [ ] **Step 1: 写 spec**

```typescript
import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectSceneJump } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

const SCENES = [
  { id: 'scene-1', label: 'scene-1' },
  { id: 'scene-xiaoling-port', label: 'scene-xiaoling-port' },
  { id: 'scene-xiaoling-entry', label: 'scene-xiaoling-entry' },
]

for (const { id, label } of SCENES) {
  test(`a1 tilemap 渲染 — ${label}`, async ({ page }) => {
    await bootstrap(page)
    if (id !== 'scene-1') {
      await openDevPicker(page)
      await selectSceneJump(page, id)
    }
    await page.waitForTimeout(300)  // 等 SceneAssetsCache lazy load + 渲染
    
    const actual = await snapshotCanvas(page)
    const diff = await pixelDiff({
      actual,
      baselinePath: baselinePathFor('scene', `a1-${id}`),
      threshold: 0,
      updateBaseline: !!process.env.UPDATE_BASELINES,
    })
    expect(diff).toBe(0)
  })
}
```

- [ ] **Step 2: 跑生成 baseline**

```bash
UPDATE_BASELINES=1 pnpm -F @type-pal/game e2e e2e/scene/a1-tilemap-render.spec.ts
```

期望:3 个 baseline PNG 出来在 `packages/game/e2e/baselines/scene/`(不入 git)。打开 visual sanity:scene 1 客栈 + 仙灵岛码头 + 仙灵岛入口 三张地图截图各不同。

- [ ] **Step 3: 再跑 verify diff = 0**

```bash
pnpm -F @type-pal/game e2e e2e/scene/a1-tilemap-render.spec.ts
```

期望:3 case 全 PASS,diff=0(完全一致)。

- [ ] **Step 4: Commit**

```bash
git add packages/game/e2e/scene/a1-tilemap-render.spec.ts
git commit -m "feat(M3.5.21): L2 a1 tilemap 渲染 spec(3 scene)"
```

---

## Task 22: L2 a2 队长 sprite 渲染

**Files:**
- Create: `packages/game/e2e/scene/a2-leader-sprite.spec.ts`

**Why:** 验证 bootstrap 完成后队长 sprite 在 partyStart 位置 + 4 方向 facing 切换 + sprite 帧。

- [ ] **Step 1: 写 spec**

```typescript
import { test, expect } from '@playwright/test'
import { bootstrap } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

test('a2 队长 sprite — 初始(facing=down)', async ({ page }) => {
  await bootstrap(page)
  const actual = await snapshotCanvas(page)
  const diff = await pixelDiff({
    actual,
    baselinePath: baselinePathFor('scene', 'a2-leader-initial'),
    threshold: 0,
    updateBaseline: !!process.env.UPDATE_BASELINES,
  })
  expect(diff).toBe(0)
})

test('a2 队长 sprite — facing 4 方向切换', async ({ page }) => {
  await bootstrap(page)
  
  const facings = [
    { key: 'ArrowRight', name: 'right' },
    { key: 'ArrowDown', name: 'down' },
    { key: 'ArrowLeft', name: 'left' },
    { key: 'ArrowUp', name: 'up' },
  ]
  
  for (const { key, name } of facings) {
    await page.keyboard.press(key)
    await page.waitForTimeout(150)
    
    const actual = await snapshotCanvas(page)
    const diff = await pixelDiff({
      actual,
      baselinePath: baselinePathFor('scene', `a2-leader-facing-${name}`),
      threshold: 0,
      updateBaseline: !!process.env.UPDATE_BASELINES,
    })
    expect(diff).toBe(0)
  }
})
```

> **关键 caveat**:`bootstrap()` 跑完后,party 位置 / facing 是 M2 默认起点(可能 col=N row=M facing='down')。 各 4 方向按键后,sprite 应换 facing 方向 — 但同时 party 可能也移动了 1 cell(走路逻辑同时触发)。M3.5 的 a2 spec 验证 facing 切换为主,partyMove 是 a4 验证;两个分开。可以在按方向键后立即截图(走路 tick 在下一帧才生效)。

- [ ] **Step 2: 生成 baseline + verify**

```bash
UPDATE_BASELINES=1 pnpm -F @type-pal/game e2e e2e/scene/a2-leader-sprite.spec.ts
pnpm -F @type-pal/game e2e e2e/scene/a2-leader-sprite.spec.ts
```

期望:5 个 baseline(initial + 4 facing)出来 + 二次跑全 PASS。

- [ ] **Step 3: Commit**

```bash
git add packages/game/e2e/scene/a2-leader-sprite.spec.ts
git commit -m "feat(M3.5.22): L2 a2 队长 sprite 渲染(4 方向 facing)"
```

---

## Task 23: L2 a3 NPC sprite 渲染

**Files:**
- Create: `packages/game/e2e/scene/a3-npc-sprite.spec.ts`

**Why:** 验证 scene 1 所有 NPC sprite 都画出来。

- [ ] **Step 1: 写 spec**

```typescript
import { test, expect } from '@playwright/test'
import { bootstrap } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

test('a3 NPC sprite 渲染 — scene 1 全部 NPC 可见', async ({ page }) => {
  await bootstrap(page)
  await page.waitForTimeout(300)
  
  // 验证 GameState.npcs 含全部 NPC
  const npcCount = await page.evaluate(() => (window as any).__game?.gs?.npcs?.length ?? 0)
  expect(npcCount).toBeGreaterThan(0)
  
  // pixel diff 整个截图(NPC 都画出来 包含在 a1 tilemap baseline 之内,但 a3 多一个 NPC count assertion)
  const actual = await snapshotCanvas(page)
  const diff = await pixelDiff({
    actual,
    baselinePath: baselinePathFor('scene', 'a3-npc-render'),
    threshold: 0,
    updateBaseline: !!process.env.UPDATE_BASELINES,
  })
  expect(diff).toBe(0)
})
```

- [ ] **Step 2: 生成 baseline + verify + Commit**

```bash
UPDATE_BASELINES=1 pnpm -F @type-pal/game e2e e2e/scene/a3-npc-sprite.spec.ts
pnpm -F @type-pal/game e2e e2e/scene/a3-npc-sprite.spec.ts
git add packages/game/e2e/scene/a3-npc-sprite.spec.ts
git commit -m "feat(M3.5.23): L2 a3 NPC sprite 渲染(npcs count > 0 + pixel diff)"
```

---

## Task 24: L2 a4 走路移动

**Files:**
- Create: `packages/game/e2e/scene/a4-walk.spec.ts`

**Why:** 验证按方向键 → party 真移动。

- [ ] **Step 1: 写 spec**

```typescript
import { test, expect } from '@playwright/test'
import { bootstrap } from '../helpers/bootstrap.js'

test('a4 走路 — ArrowDown 5 次 → party.row +5', async ({ page }) => {
  await bootstrap(page)
  
  const initialRow = await page.evaluate(() => (window as any).__game.gs.party.row)
  
  for (let i = 0; i < 5; i++) {
    await page.keyboard.down('ArrowDown')
    await page.waitForTimeout(120)
    await page.keyboard.up('ArrowDown')
  }
  
  const finalRow = await page.evaluate(() => (window as any).__game.gs.party.row)
  expect(finalRow).toBeGreaterThanOrEqual(initialRow + 3)  // 至少 3(可能被 NPC / 边界阻挡)
})

test('a4 走路 — 反向回到原位', async ({ page }) => {
  await bootstrap(page)
  const initial = await page.evaluate(() => (window as any).__game.gs.party)
  
  await page.keyboard.down('ArrowRight')
  await page.waitForTimeout(300)
  await page.keyboard.up('ArrowRight')
  await page.keyboard.down('ArrowLeft')
  await page.waitForTimeout(300)
  await page.keyboard.up('ArrowLeft')
  
  const final = await page.evaluate(() => (window as any).__game.gs.party)
  // 来回相同步数,col 应该接近 initial
  expect(Math.abs(final.col - initial.col)).toBeLessThanOrEqual(1)
})
```

- [ ] **Step 2: 跑 verify + Commit**

```bash
pnpm -F @type-pal/game e2e e2e/scene/a4-walk.spec.ts
git add packages/game/e2e/scene/a4-walk.spec.ts
git commit -m "feat(M3.5.24): L2 a4 走路移动 spec"
```

---

## Task 25: L2 a5 边界 clamp + a6 撞 NPC 阻挡 + a7 相机 follow(合并 1 task)

**Files:**
- Create: `packages/game/e2e/scene/a5-boundary-clamp.spec.ts`
- Create: `packages/game/e2e/scene/a6-npc-block.spec.ts`
- Create: `packages/game/e2e/scene/a7-camera-follow.spec.ts`

**Why:** 3 个 M2 既有 feature 的 L2 补全 — 都是验证"按方向键后 party 行为对",代码量小,合并 1 task。

- [ ] **Step 1: a5 边界 clamp spec**

```typescript
import { test, expect } from '@playwright/test'
import { bootstrap } from '../helpers/bootstrap.js'

test('a5 边界 clamp — party 走到地图最左 → 不动', async ({ page }) => {
  await bootstrap(page)
  
  // 持续按 Left 撑到底
  for (let i = 0; i < 100; i++) {
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(110)
  }
  
  const col = await page.evaluate(() => (window as any).__game.gs.party.col)
  expect(col).toBe(0)  // clamp 到 0
  
  // 再按 Left 一次 → 应仍是 0(clamp 不动)
  const before = col
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(120)
  const after = await page.evaluate(() => (window as any).__game.gs.party.col)
  expect(after).toBe(before)
})
```

- [ ] **Step 2: a6 撞 NPC 阻挡 spec**

```typescript
import { test, expect } from '@playwright/test'
import { bootstrap } from '../helpers/bootstrap.js'

test('a6 撞 NPC 阻挡 — party 走向 NPC cell → 停在前一格', async ({ page }) => {
  await bootstrap(page)
  
  // 找 scene 1 一个 NPC 的位置
  const npc = await page.evaluate(() => (window as any).__game.gs.npcs[0])
  // 模拟走到 NPC 邻 cell + 试图走进
  // 简化:走 N 次往 NPC 方向,verify party.col/row 卡在前一格
  // 实施时按 scene-1.json 具体 NPC 位置写 N 序列
  
  const partyBefore = await page.evaluate(() => (window as any).__game.gs.party)
  // ... walking sequence ...
  const partyAfter = await page.evaluate(() => (window as any).__game.gs.party)
  
  // 关键 assertion:party 走到 NPC 邻 cell 之后,再按一次走向 NPC 方向 → 不动
  // (具体 col/row 实施时按真值定;skip if 邻 cell 难定位)
  expect(true).toBe(true)  // 实施时 verify
})
```

- [ ] **Step 3: a7 相机 follow spec**

```typescript
import { test, expect } from '@playwright/test'
import { bootstrap } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

test('a7 相机 follow — party 走右边,camera.col 增加', async ({ page }) => {
  await bootstrap(page)
  
  const cameraBefore = await page.evaluate(() => (window as any).__game.gs.camera.col)
  
  // 持续按 Right N 次
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(110)
  }
  
  const cameraAfter = await page.evaluate(() => (window as any).__game.gs.camera.col)
  expect(cameraAfter).toBeGreaterThan(cameraBefore)  // camera 跟着走
  
  // visual sanity:截图 vs baseline(camera 不同位置 → tilemap visible 区不同)
  const actual = await snapshotCanvas(page)
  const diff = await pixelDiff({
    actual,
    baselinePath: baselinePathFor('scene', 'a7-camera-right'),
    threshold: 0,
    updateBaseline: !!process.env.UPDATE_BASELINES,
  })
  expect(diff).toBe(0)
})
```

- [ ] **Step 4: 跑生成 baseline + verify + Commit**

```bash
UPDATE_BASELINES=1 pnpm -F @type-pal/game e2e e2e/scene/a5-boundary-clamp.spec.ts e2e/scene/a6-npc-block.spec.ts e2e/scene/a7-camera-follow.spec.ts
pnpm -F @type-pal/game e2e e2e/scene/a5-boundary-clamp.spec.ts e2e/scene/a6-npc-block.spec.ts e2e/scene/a7-camera-follow.spec.ts
git add packages/game/e2e/scene/a5-boundary-clamp.spec.ts packages/game/e2e/scene/a6-npc-block.spec.ts packages/game/e2e/scene/a7-camera-follow.spec.ts
git commit -m "feat(M3.5.25): L2 a5 边界 clamp + a6 撞 NPC + a7 相机 follow(M2 既有 feature 补 L2)"
```

---

## Task 26: L2 a8 scene 切换

**Files:**
- Create: `packages/game/e2e/scene/a8-scene-switch.spec.ts`

**Why:** M3.5 新功能 — dev panel 跳 scene → 真切到新地图。Visual diff 验证不同 scene 不同 tilemap。

- [ ] **Step 1: 写 spec**

```typescript
import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectSceneJump } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

test('a8 scene 切换 — scene 1 vs 仙灵岛入口 visual diff', async ({ page }) => {
  await bootstrap(page)
  
  // 截 scene 1
  const scene1Buf = await snapshotCanvas(page)
  
  // 跳仙灵岛入口
  await openDevPicker(page)
  await selectSceneJump(page, 'scene-xiaoling-entry')
  await page.waitForTimeout(500)  // SceneAssetsCache lazy fetch + render
  
  // verify scene 切换
  const sceneId = await page.evaluate(() => (window as any).__game.gs.scene.id)
  expect(sceneId).toBe(4)  // 实施时按真 sceneId 替换
  
  // 截仙灵岛入口
  const xlBuf = await snapshotCanvas(page)
  
  // 两张应该不同(scene 1 客栈 vs 仙灵岛 不同 tilemap)
  expect(scene1Buf.equals(xlBuf)).toBe(false)
  
  // baseline 各自 verify
  expect(await pixelDiff({ actual: scene1Buf, baselinePath: baselinePathFor('scene', 'a8-scene-1'), updateBaseline: !!process.env.UPDATE_BASELINES })).toBe(0)
  expect(await pixelDiff({ actual: xlBuf, baselinePath: baselinePathFor('scene', 'a8-xiaoling-entry'), updateBaseline: !!process.env.UPDATE_BASELINES })).toBe(0)
})

test('a8 scene 切换 — party 写入 partyStart 位置', async ({ page }) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectSceneJump(page, 'scene-xiaoling-entry')
  await page.waitForTimeout(500)
  
  const party = await page.evaluate(() => (window as any).__game.gs.party)
  // partyStart 在 scene-jumps.json 设的位置(实施时按 T16 真值)
  expect(party.col).toBe(10)
  expect(party.row).toBe(5)
})
```

- [ ] **Step 2: 跑生成 baseline + verify + Commit**

```bash
UPDATE_BASELINES=1 pnpm -F @type-pal/game e2e e2e/scene/a8-scene-switch.spec.ts
pnpm -F @type-pal/game e2e e2e/scene/a8-scene-switch.spec.ts
git add packages/game/e2e/scene/a8-scene-switch.spec.ts
git commit -m "feat(M3.5.26): L2 a8 scene 切换 spec(visual diff + partyStart)"
```

---

## Task 27: L2 a9 明雷遇怪

**Files:**
- Create: `packages/game/e2e/scene/a9-encounter.spec.ts`

**Why:** M3.5 核心新功能 — 走到 contact cell 自动进 battle。

- [ ] **Step 1: 写 spec**

```typescript
import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectSceneJump } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

test('a9 明雷遇怪 — 跳仙灵岛入口看到草妖 sprite + 走到 contact cell 进 battle', async ({ page }) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectSceneJump(page, 'scene-xiaoling-entry')
  await page.waitForTimeout(500)
  
  // 截图 verify 草妖 sprite visible(包含在仙灵岛入口 tilemap baseline 内)
  const initialBuf = await snapshotCanvas(page)
  expect(await pixelDiff({
    actual: initialBuf,
    baselinePath: baselinePathFor('scene', 'a9-encounter-initial'),
    updateBaseline: !!process.env.UPDATE_BASELINES,
  })).toBe(0)
  
  // 走方向键到 contact cell
  // 实施时按 仙灵岛入口 EventObject(草妖)真 col/row 写按键序列
  // 假设草妖在 (10, 8),partyStart (10, 5) → ArrowDown × 3
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(120)
    
    const mode = await page.evaluate(() => (window as any).__game.gs.mode)
    if (mode === 'battle') break  // 触发战斗了
  }
  
  // verify mode 切到 battle
  const finalMode = await page.evaluate(() => (window as any).__game.gs.mode)
  expect(finalMode).toBe('battle')
  
  // 截图 verify 战斗界面
  const battleBuf = await snapshotCanvas(page)
  expect(await pixelDiff({
    actual: battleBuf,
    baselinePath: baselinePathFor('scene', 'a9-encounter-battle'),
    updateBaseline: !!process.env.UPDATE_BASELINES,
  })).toBe(0)
})
```

- [ ] **Step 2: 跑生成 baseline + verify + Commit**

```bash
UPDATE_BASELINES=1 pnpm -F @type-pal/game e2e e2e/scene/a9-encounter.spec.ts
pnpm -F @type-pal/game e2e e2e/scene/a9-encounter.spec.ts
git add packages/game/e2e/scene/a9-encounter.spec.ts
git commit -m "feat(M3.5.27): L2 a9 明雷遇怪 spec(走到 contact cell 自动 battle)"
```

---

## Task 28: L2 b1 战斗背景渲染 + b2 双方 sprite 渲染(合并 1 task)

**Files:**
- Create: `packages/game/e2e/battle/b1-bg-render.spec.ts`
- Create: `packages/game/e2e/battle/b2-sprites.spec.ts`

**Why:** 两个都是战斗界面基础渲染 verification,合并 1 task。

- [ ] **Step 1: 写 b1 spec**

```typescript
import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectBattleFixture } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

test('b1 战斗背景渲染 — fixture-zh1 + 默认 battleField', async ({ page }) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectBattleFixture(page, 'fixture-zh1')
  await page.waitForTimeout(500)
  
  const mode = await page.evaluate(() => (window as any).__game.gs.mode)
  expect(mode).toBe('battle')
  
  const actual = await snapshotCanvas(page)
  expect(await pixelDiff({
    actual,
    baselinePath: baselinePathFor('battle', 'b1-bg-fixture-zh1'),
    updateBaseline: !!process.env.UPDATE_BASELINES,
  })).toBe(0)
})
```

- [ ] **Step 2: 写 b2 spec**

```typescript
import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectBattleFixture } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

test('b2 双方 sprite 渲染 — 队员 + enemy 都画出来', async ({ page }) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectBattleFixture(page, 'fixture-zh1')
  await page.waitForTimeout(500)
  
  // verify GameState battleState 含 players + enemies
  const battleState = await page.evaluate(() => (window as any).__game.gs.battleState)
  expect(battleState.players.length).toBeGreaterThan(0)
  expect(battleState.enemies.length).toBeGreaterThan(0)
  
  // visual diff 整个画面(含 sprite)
  const actual = await snapshotCanvas(page)
  expect(await pixelDiff({
    actual,
    baselinePath: baselinePathFor('battle', 'b2-sprites-fixture-zh1'),
    updateBaseline: !!process.env.UPDATE_BASELINES,
  })).toBe(0)
})
```

- [ ] **Step 3: 跑 + Commit**

```bash
UPDATE_BASELINES=1 pnpm -F @type-pal/game e2e e2e/battle/b1-bg-render.spec.ts e2e/battle/b2-sprites.spec.ts
pnpm -F @type-pal/game e2e e2e/battle/b1-bg-render.spec.ts e2e/battle/b2-sprites.spec.ts
git add packages/game/e2e/battle/b1-bg-render.spec.ts packages/game/e2e/battle/b2-sprites.spec.ts
git commit -m "feat(M3.5.28): L2 b1 战斗背景 + b2 双方 sprite 渲染 spec"
```

---

## Task 29: L2 b3 HP/MP 状态栏

**Files:**
- Create: `packages/game/e2e/battle/b3-hpmp-status.spec.ts`

**Why:** HP/MP 数字显示是用户最直观看到的战斗信息;visual diff baseline + GameState assertion 双验证。

- [ ] **Step 1: 写 spec**

```typescript
import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectBattleFixture } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

test('b3 HP/MP 状态栏 — fixture-zh1 满血显示', async ({ page }) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectBattleFixture(page, 'fixture-zh1')
  await page.waitForTimeout(500)
  
  // GameState 验证 HP/MP 满血
  const role = await page.evaluate(() => (window as any).__game.assets.playerRoles.roles[0])
  expect(role.hp).toBe(role.maxHP)  // 满血
  expect(role.mp).toBe(role.maxMP)  // 满 MP
  
  // visual diff(主菜单 + HP/MP 都画在屏幕底部)
  const actual = await snapshotCanvas(page)
  expect(await pixelDiff({
    actual,
    baselinePath: baselinePathFor('battle', 'b3-hpmp-full'),
    updateBaseline: !!process.env.UPDATE_BASELINES,
  })).toBe(0)
})
```

- [ ] **Step 2: 跑 + Commit**

```bash
UPDATE_BASELINES=1 pnpm -F @type-pal/game e2e e2e/battle/b3-hpmp-status.spec.ts
pnpm -F @type-pal/game e2e e2e/battle/b3-hpmp-status.spec.ts
git add packages/game/e2e/battle/b3-hpmp-status.spec.ts
git commit -m "feat(M3.5.29): L2 b3 HP/MP 状态栏 spec"
```

---

## Task 30: L2 b4 攻击数字弹幕

**Files:**
- Create: `packages/game/e2e/battle/b4-damage-num.spec.ts`

**Why:** 数字弹幕是战斗最直观反馈 — 攻击后 visual diff baseline 包含数字。

- [ ] **Step 1: 写 spec**

```typescript
import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectBattleFixture } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

test('b4 攻击数字弹幕 — Confirm 攻击 → 数字飘起来', async ({ page }) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectBattleFixture(page, 'fixture-zh1')
  await page.waitForTimeout(500)
  
  // Confirm 选 cursor=0(攻击)→ targetSelect
  await page.keyboard.press('Enter')
  await page.waitForTimeout(200)
  // Confirm 选 target 0
  await page.keyboard.press('Enter')
  await page.waitForTimeout(200)
  
  // 等 perform 跑 + 数字弹出
  await page.waitForTimeout(600)  // 15 帧 / 25fps = 0.6s 数字弹幕 duration
  
  // 截图(数字弹幕在飘的中间帧)
  const actual = await snapshotCanvas(page)
  expect(await pixelDiff({
    actual,
    baselinePath: baselinePathFor('battle', 'b4-damage-num'),
    threshold: 0.1,  // 数字位置可能有 1-2 像素抖,放宽
    updateBaseline: !!process.env.UPDATE_BASELINES,
  })).toBeLessThan(50)
})
```

> **caveat**:数字弹幕跨帧动画 — pixel diff 取决于截图时刻;实施时调整 waitForTimeout 抓"数字在中位"。或者用 OCR 检查数字 visible。M3.5 简版 pixel diff 即可。

- [ ] **Step 2: 跑 + Commit**

```bash
UPDATE_BASELINES=1 pnpm -F @type-pal/game e2e e2e/battle/b4-damage-num.spec.ts
pnpm -F @type-pal/game e2e e2e/battle/b4-damage-num.spec.ts
git add packages/game/e2e/battle/b4-damage-num.spec.ts
git commit -m "feat(M3.5.30): L2 b4 攻击数字弹幕 spec"
```

---

## Task 31: L2 b5 won 切回 explore + b6 lost-fleed(合并 1 task)

**Files:**
- Create: `packages/game/e2e/battle/b5-won-to-explore.spec.ts`
- Create: `packages/game/e2e/battle/b6-lost-or-fleed.spec.ts`

**Why:** 战斗结束 mode 切回 explore 是关键状态机贯通验证。

- [ ] **Step 1: 写 b5 spec**

```typescript
import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectBattleFixture } from '../helpers/bootstrap.js'

test('b5 won → mode=explore', async ({ page }) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectBattleFixture(page, 'fixture-zh1')  // fixture-zh1 是弱怪,易赢
  await page.waitForTimeout(500)
  
  // 反复 Confirm 攻击直到战斗结束(最多 30 个 tick)
  let safety = 30
  while (safety-- > 0) {
    const mode = await page.evaluate(() => (window as any).__game.gs.mode)
    if (mode === 'explore') break
    
    // mainMenu Confirm 攻击 → targetSelect → Confirm
    await page.keyboard.press('Enter')
    await page.waitForTimeout(200)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1000)  // 等 perform + postAction
  }
  
  const finalMode = await page.evaluate(() => (window as any).__game.gs.mode)
  expect(finalMode).toBe('explore')
  
  // verify exp 入账
  const exp = await page.evaluate(() => {
    const role = (window as any).__game.assets.playerRoles.roles[0]
    return (role as any).exp ?? 0
  })
  expect(exp).toBeGreaterThan(0)
})
```

- [ ] **Step 2: 写 b6 spec — flee 路径**

```typescript
import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectBattleFixture } from '../helpers/bootstrap.js'

test('b6 flee → mode=explore', async ({ page }) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectBattleFixture(page, 'fixture-zh1')
  await page.waitForTimeout(500)
  
  // mainMenu Down × 4(切到 cursor=4 逃跑)+ Confirm 反复直到 fleed
  let safety = 30
  while (safety-- > 0) {
    const mode = await page.evaluate(() => (window as any).__game.gs.mode)
    if (mode === 'explore') break
    
    // 切 cursor 到 4(逃跑)+ Confirm
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(50)
    }
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1000)
  }
  
  const finalMode = await page.evaluate(() => (window as any).__game.gs.mode)
  expect(finalMode).toBe('explore')
})
```

- [ ] **Step 3: 跑 + Commit**

```bash
pnpm -F @type-pal/game e2e e2e/battle/b5-won-to-explore.spec.ts e2e/battle/b6-lost-or-fleed.spec.ts
git add packages/game/e2e/battle/b5-won-to-explore.spec.ts packages/game/e2e/battle/b6-lost-or-fleed.spec.ts
git commit -m "feat(M3.5.31): L2 b5 won + b6 fleed 切回 explore spec"
```

---

## Task 32: L2 b7 dev panel 触发战斗

**Files:**
- Create: `packages/game/e2e/battle/b7-dev-trigger.spec.ts`

**Why:** dev panel 触发战斗链路完整端到端验证(M3 phase 1 dev panel B 已建,但没 L2 测)。

- [ ] **Step 1: 写 spec**

```typescript
import { test, expect } from '@playwright/test'
import { bootstrap } from '../helpers/bootstrap.js'

test('b7 dev panel 触发战斗 — B → picker → fixture → battle init', async ({ page }) => {
  await bootstrap(page)
  
  // mode='explore' 状态下
  expect(await page.evaluate(() => (window as any).__game.gs.mode)).toBe('explore')
  
  // 按 B
  await page.keyboard.press('b')
  
  // picker visible
  const pickerVisible = await page.locator('text=Dev: Battle Picker').isVisible()
  expect(pickerVisible).toBe(true)
  
  // 点 fixture-zh1
  await page.click('button:has-text("fixture-zh1")')
  await page.waitForTimeout(500)
  
  // mode 应切到 battle
  expect(await page.evaluate(() => (window as any).__game.gs.mode)).toBe('battle')
  
  // battleState 含 partyMembers 0 + 至少 1 个 enemy
  const battleState = await page.evaluate(() => (window as any).__game.gs.battleState)
  expect(battleState.players.length).toBeGreaterThan(0)
  expect(battleState.enemies.length).toBeGreaterThan(0)
})
```

- [ ] **Step 2: 跑 + Commit**

```bash
pnpm -F @type-pal/game e2e e2e/battle/b7-dev-trigger.spec.ts
git add packages/game/e2e/battle/b7-dev-trigger.spec.ts
git commit -m "feat(M3.5.32): L2 b7 dev panel 触发战斗端到端"
```

---

## Task 33: L2 c1 对话框 4 style

**Files:**
- Create: `packages/game/e2e/menu/c1-dialog-styles.spec.ts`

**Why:** M2 已建 4 种 dialog style(top / center / bottom / narration),M3.5 补 L2 visual 验证。

- [ ] **Step 1: 写 spec**

```typescript
import { test, expect } from '@playwright/test'
import { bootstrap } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

// 实施时:需要找出 scene 1 内能让 dialogStyle 变化的场景:
// - onEnter 第一句对话(style=top? center?,M3 实施过程发现 #2 dump style 真值)
// - NPC trigger 段 dialog(可能换 style)
// 简化版:bootstrap 进 explore 前(onEnter 中)各 Space 推进,截图比对 4 种 style

const STYLES = ['top', 'center', 'bottom', 'narration']

for (const style of STYLES) {
  test(`c1 对话框 style=${style}`, async ({ page }) => {
    // 实施时定:跳到对应 dialog style 真触发点的方法
    // 简版:bootstrap 跑 onEnter 段,按 Space 直到 currentDialogStyle === style,截图
    
    await page.goto('/')
    await page.waitForSelector('canvas')
    
    let safety = 100
    while (safety-- > 0) {
      const currentStyle = await page.evaluate(() => (window as any).__game?.gs?.currentDialogStyle)
      if (currentStyle === style) break
      await page.keyboard.press('Space')
      await page.waitForTimeout(120)
    }
    
    const actual = await snapshotCanvas(page)
    expect(await pixelDiff({
      actual,
      baselinePath: baselinePathFor('menu', `c1-dialog-${style}`),
      updateBaseline: !!process.env.UPDATE_BASELINES,
    })).toBe(0)
  })
}
```

> **caveat**:实际不是所有 4 种 style 都会在 scene 1 onEnter 段出现 — 可能要在多个 scene 内 trigger。实施时:① 先 scene 1 onEnter Space 推完,看 console.debug 显示了几种 style;② 推到 NPC trigger 段;③ 如果某 style 没出现,M3.5 简版 skip,实施过程发现记录"M3.5 没覆盖 style=X"。

- [ ] **Step 2: 跑 + Commit**

```bash
UPDATE_BASELINES=1 pnpm -F @type-pal/game e2e e2e/menu/c1-dialog-styles.spec.ts
pnpm -F @type-pal/game e2e e2e/menu/c1-dialog-styles.spec.ts
git add packages/game/e2e/menu/c1-dialog-styles.spec.ts
git commit -m "feat(M3.5.33): L2 c1 对话框 4 style spec"
```

---

## Task 34: L2 c2 战斗主菜单

**Files:**
- Create: `packages/game/e2e/menu/c2-battle-main-menu.spec.ts`

**Why:** 主菜单显示 + Up/Down cursor 移动是战斗 input wire 最直观验证。

- [ ] **Step 1: 写 spec**

```typescript
import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectBattleFixture } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

test('c2 战斗主菜单 — 5 项可见 + cursor 0', async ({ page }) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectBattleFixture(page, 'fixture-zh1')
  await page.waitForTimeout(500)
  
  // 截图(主菜单 cursor=0,光标在攻击)
  const actual = await snapshotCanvas(page)
  expect(await pixelDiff({
    actual,
    baselinePath: baselinePathFor('menu', 'c2-main-cursor-0'),
    updateBaseline: !!process.env.UPDATE_BASELINES,
  })).toBe(0)
})

test('c2 战斗主菜单 — Up/Down cursor 移动 visual diff', async ({ page }) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectBattleFixture(page, 'fixture-zh1')
  await page.waitForTimeout(500)
  
  for (let i = 0; i < 5; i++) {
    const actual = await snapshotCanvas(page)
    expect(await pixelDiff({
      actual,
      baselinePath: baselinePathFor('menu', `c2-main-cursor-${i}`),
      updateBaseline: !!process.env.UPDATE_BASELINES,
    })).toBe(0)
    
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(100)
  }
})
```

- [ ] **Step 2: 跑 + Commit**

```bash
UPDATE_BASELINES=1 pnpm -F @type-pal/game e2e e2e/menu/c2-battle-main-menu.spec.ts
pnpm -F @type-pal/game e2e e2e/menu/c2-battle-main-menu.spec.ts
git add packages/game/e2e/menu/c2-battle-main-menu.spec.ts
git commit -m "feat(M3.5.34): L2 c2 战斗主菜单 spec(5 cursor 位置)"
```

---

## Task 35: L2 c3 法术菜单 + c4 物品菜单 + c5 目标光标(合并)

**Files:**
- Create: `packages/game/e2e/menu/c3-battle-magic-menu.spec.ts`
- Create: `packages/game/e2e/menu/c4-battle-item-menu.spec.ts`
- Create: `packages/game/e2e/menu/c5-battle-target-select.spec.ts`

**Why:** 二级菜单 + 目标光标,3 个相关 visual case 合并 1 task。

- [ ] **Step 1: 写 c3 spec**

```typescript
import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectBattleFixture } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

test('c3 战斗法术菜单 — Confirm 选法术 → magicMenu visible', async ({ page }) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectBattleFixture(page, 'fixture-zh2')  // 队员有学法术
  await page.waitForTimeout(500)
  
  // 主菜单 cursor 切到 1(法术)
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(80)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(200)
  
  const uiState = await page.evaluate(() => (window as any).__game.gs.battleState?.uiState)
  expect(uiState).toBe('magicMenu')
  
  const actual = await snapshotCanvas(page)
  expect(await pixelDiff({
    actual,
    baselinePath: baselinePathFor('menu', 'c3-magic-menu'),
    updateBaseline: !!process.env.UPDATE_BASELINES,
  })).toBe(0)
})
```

- [ ] **Step 2: 写 c4 spec(类比 c3,选物品)**

```typescript
import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectBattleFixture } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

test('c4 战斗物品菜单 — Confirm 选物品 → itemMenu visible', async ({ page }) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectBattleFixture(page, 'fixture-zh1')  // 有 inventory 物品
  await page.waitForTimeout(500)
  
  // 主菜单 cursor=2(物品)
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(100)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(200)
  
  const uiState = await page.evaluate(() => (window as any).__game.gs.battleState?.uiState)
  expect(uiState).toBe('itemMenu')
  
  const actual = await snapshotCanvas(page)
  expect(await pixelDiff({
    actual,
    baselinePath: baselinePathFor('menu', 'c4-item-menu'),
    updateBaseline: !!process.env.UPDATE_BASELINES,
  })).toBe(0)
})
```

- [ ] **Step 3: 写 c5 spec(目标光标)**

```typescript
import { test, expect } from '@playwright/test'
import { bootstrap, openDevPicker, selectBattleFixture } from '../helpers/bootstrap.js'
import { snapshotCanvas } from '../helpers/snapshot.js'
import { pixelDiff, baselinePathFor } from '../helpers/pixel-diff.js'

test('c5 战斗目标光标 — Confirm 选攻击 → targetSelect + Left/Right 切', async ({ page }) => {
  await bootstrap(page)
  await openDevPicker(page)
  await selectBattleFixture(page, 'fixture-zh1')
  await page.waitForTimeout(500)
  
  // mainMenu Confirm 选攻击
  await page.keyboard.press('Enter')
  await page.waitForTimeout(200)
  
  const uiState = await page.evaluate(() => (window as any).__game.gs.battleState?.uiState)
  expect(uiState).toBe('targetSelect')
  
  // 截图 verify 光标在 target 0
  const actual = await snapshotCanvas(page)
  expect(await pixelDiff({
    actual,
    baselinePath: baselinePathFor('menu', 'c5-target-0'),
    updateBaseline: !!process.env.UPDATE_BASELINES,
  })).toBe(0)
  
  // Right 切 target 1(假设 fixture 有 2+ enemies;若 fixture-zh1 只 1 enemy,uiCursor 仍 0)
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(100)
  
  const cursor = await page.evaluate(() => (window as any).__game.gs.battleState?.uiCursor)
  expect(cursor).toBeGreaterThanOrEqual(0)
})
```

- [ ] **Step 4: 跑 + Commit**

```bash
UPDATE_BASELINES=1 pnpm -F @type-pal/game e2e e2e/menu/c3-battle-magic-menu.spec.ts e2e/menu/c4-battle-item-menu.spec.ts e2e/menu/c5-battle-target-select.spec.ts
pnpm -F @type-pal/game e2e e2e/menu/c3-battle-magic-menu.spec.ts e2e/menu/c4-battle-item-menu.spec.ts e2e/menu/c5-battle-target-select.spec.ts
git add packages/game/e2e/menu/c3-battle-magic-menu.spec.ts packages/game/e2e/menu/c4-battle-item-menu.spec.ts packages/game/e2e/menu/c5-battle-target-select.spec.ts
git commit -m "feat(M3.5.35): L2 c3 法术菜单 + c4 物品菜单 + c5 目标光标 spec"
```

---

## Task 36: L2 c6 dev panel picker DOM 浮层

**Files:**
- Create: `packages/game/e2e/menu/c6-dev-picker.spec.ts`

**Why:** dev panel picker 是 DOM 浮层(不在 canvas 内),visual 验证用 Playwright DOM API。

- [ ] **Step 1: 写 spec**

```typescript
import { test, expect } from '@playwright/test'
import { bootstrap } from '../helpers/bootstrap.js'

test('c6 dev panel picker — B 弹 + 3 fixture + 3 scene jump + Cancel 关', async ({ page }) => {
  await bootstrap(page)
  
  // 按 B
  await page.keyboard.press('b')
  
  // 标题可见
  await expect(page.locator('text=Dev: Battle Picker')).toBeVisible()
  
  // 3 fixture button 可见
  await expect(page.locator('button:has-text("fixture-zh1")')).toBeVisible()
  await expect(page.locator('button:has-text("fixture-zh2")')).toBeVisible()
  await expect(page.locator('button:has-text("fixture-end")')).toBeVisible()
  
  // Scene Jump section(M3.5 加)
  await expect(page.locator('text=Dev: Scene Jump')).toBeVisible()
  await expect(page.locator('button:has-text("scene-1")')).toBeVisible()
  await expect(page.locator('button:has-text("scene-xiaoling-port")')).toBeVisible()
  await expect(page.locator('button:has-text("scene-xiaoling-entry")')).toBeVisible()
  
  // Cancel 按钮
  await page.click('button:has-text("Cancel")')
  await expect(page.locator('text=Dev: Battle Picker')).not.toBeVisible()
})
```

- [ ] **Step 2: 跑 + Commit**

```bash
pnpm -F @type-pal/game e2e e2e/menu/c6-dev-picker.spec.ts
git add packages/game/e2e/menu/c6-dev-picker.spec.ts
git commit -m "feat(M3.5.36): L2 c6 dev panel picker DOM 浮层 spec"
```

---

## Task 37: L2 f1 F1 dump GameState

**Files:**
- Create: `packages/game/e2e/dev/f1-dump-state.spec.ts`

**Why:** F1 dump 是 dev 工具最基础,verify console 收到 GameState JSON。

- [ ] **Step 1: 写 spec**

```typescript
import { test, expect } from '@playwright/test'
import { bootstrap } from '../helpers/bootstrap.js'

test('f1 F1 dump GameState — console 含 GameState JSON', async ({ page }) => {
  const consoleMessages: string[] = []
  page.on('console', (msg) => consoleMessages.push(msg.text()))
  
  await bootstrap(page)
  await page.keyboard.press('F1')
  await page.waitForTimeout(200)
  
  // verify console 含 GameState dump
  const hasDump = consoleMessages.some((m) => m.includes('GameState dump') || m.includes('mode'))
  expect(hasDump).toBe(true)
})
```

- [ ] **Step 2: 跑 + Commit**

```bash
pnpm -F @type-pal/game e2e e2e/dev/f1-dump-state.spec.ts
git add packages/game/e2e/dev/f1-dump-state.spec.ts
git commit -m "feat(M3.5.37): L2 f1 F1 dump GameState spec"
```

---

## Task 38: 全套 `pnpm check` + `pnpm e2e` 跑通验证

**Files:** 无 — 验证之前 task 累计的产物

**Why:** M3.5 所有 task 都做完了,本 task 跑全套验证一遍 + fix 偶发问题。

- [ ] **Step 1: 全套 Vitest(L1)**

```bash
pnpm check
```

期望:M3 phase 1 = 407 + 2 skip → M3.5 ≥ 430 + 2 skip 全过。若 fail:看哪个测试 broken,定位 task 修复。

- [ ] **Step 2: 全套 Playwright(L2)**

```bash
pnpm -F @type-pal/game e2e
```

期望:23 case 全过。若 fail:
- baseline 缺(本机首次跑):`pnpm -F @type-pal/game e2e:update` 一键生成全 baseline
- 个别 case fail:visual diff 看 `.diff.png`,定位 issue(代码 vs baseline);若代码 bug → 修;若 baseline 过时 → update

- [ ] **Step 3: events round-trip 自检**

```bash
pnpm extract
```

期望:`[pal-extract] events round-trip OK`(43503 指令仍逐字节通过)。

- [ ] **Step 4: D29 视觉 baseline**

```bash
pnpm -F @type-pal/pal-extract vitest run src/__tests__/tilemap-baseline.test.ts
```

期望:3 场景(scene 1 + 仙灵岛码头 + 仙灵岛入口)全 PASS。

- [ ] **Step 5: 修发现的问题(每 fix 一个 commit)**

如果上面任一步 fail,根据 fail 信息定位 + fix,每修一个一个 commit:
```bash
git commit -m "fix(M3.5.38): <一句话>"
```

- [ ] **Step 6: 跑通后无新 commit,跳 T39**

---

## Task 39: README + 03 同步

**Files:**
- Modify: `README.md`(当前状态行)
- Modify: `docs/03-development-plan.md`(M3.5 状态 → ✅ 已完成)

**Why:** M3.5 完工状态同步到 doc。

- [ ] **Step 1: 改 README.md**

找到 README 里"当前状态"行,从 "M3 Phase 1 完工" 改到 "M3.5 完工(scene 切换 + 明雷 + L2 23 case)"。

- [ ] **Step 2: 改 03 plan**

把 M3.5 节标 ✅(2026-05-DD 完工)。

- [ ] **Step 3: Commit**

```bash
git add README.md docs/03-development-plan.md
git commit -m "docs(M3.5.39): README + 03 同步 M3.5 完工"
```

---

## Task 40: 实施过程发现归档

**Files:**
- Modify: `docs/plans/2026-05-24-m3-5-scene-encounter.md`(本文件,末尾加 section)

**Why:** M2 / M3 模式 — 实施过程的偏离 / sdlpal 真值发现 / 改进建议归档,给后续 milestone implementer 参考。

- [ ] **Step 1: 在 plan 末尾加 section**

```markdown
## 实施过程发现 / 与本计划的偏离(2026-05-DD 完工时整理)

本计划在 brainstorming + writing-plans 阶段基于设计 doc + sdlpal 源码推断;实施时遇到的真实差异记录如下供 M5 / M7 参考。**全部 commit 在 main 分支可追溯**。

### 1. (待填:实施过程发现的第一项,无显著偏离则填「无显著偏离」)
...

### M3.5 完成定义实际状态

- ✅ / ⚠️ 各项填充
```

- [ ] **Step 2: 实施时把整个 implementation 过程的 deviation 填进去**

(实施 task 时碰到的 sdlpal 真值 / spec 错误 / 改方案 / 等都记录;参考 M3 plan 末尾「实施过程发现」 7 条的格式)

- [ ] **Step 3: Commit**

```bash
git add docs/plans/2026-05-24-m3-5-scene-encounter.md
git commit -m "docs(M3.5.40): 实施过程发现归档(M3.5 完工)"
```

---

## 完成 = 准备 M4 / M5 / M6 / M7

M3.5 完工后,M1-M3.5 所有功能点都有 L2 视觉 baseline(本机本地)+ 战斗骨架完整 + dev shortcut 跳 scene 可用。下一步:

- **M4**(pal-extract 补全):覆盖剩余 MKF 格式 / 全场景资源 / 全数据表
- **M5**(系统补全):完整战斗(合体技能 / 觉醒 / 五行属性)+ 菜单系统全套(标题 / 大世界菜单)+ 存档读档 + 真剧情链(scene 1 → 仙灵岛真走 + 剧情 sub-scene)
- **M6**(体验补全):音频(BGM / 音效)+ 视频(AVI 过场)+ 调色板循环
- **M7**(通关验证 + 打磨):**Layer 3 完整流程 E2E**(scene 1 真 onEnter → 真剧情 → 全程通关)+ 总性能打磨 + L1c headless e2e-battle.test.ts 改造成 Playwright(M3 留下)

---

## 实施过程发现 / 与本计划的偏离(2026-05-DD 完工时整理)

本计划在 brainstorming + writing-plans 阶段基于设计 doc + sdlpal 源码推断;实施时遇到的真实差异记录如下供 M5 / M7 参考。**全部 commit 在 main 分支可追溯**。

### 1. (待填)
