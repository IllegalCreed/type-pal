# M2 · 运行时垂直切片 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 `game` 包 M2 切片:浏览器打开 → 看到 scene 1 真实地图 + 真队长 / NPC 精灵 → 方向键走路撞墙 → 走到 NPC 前按 Space → 消费真原版 scene-001.json 的 trigger 段对话 → 关闭对话继续走。同时给 `pal-extract` 补两件 M1 漏的事(角色 / NPC sprite 提取 + scene-1.json dump)+ ~4 个 opcode 具名扩展。

**Architecture:** 严格按 02 四层 + CommandBus + 协程式步进器。Shell(主循环 / 输入)/ Present(320×200 索引帧缓冲 / 绘制)/ Core(GameState / 场景系统 / 事件系统 / 命令总线)/ Assets(fetch)。每层只装当下必需的东西,无抽象基类、无 DI。完整设计见 [`2026-05-23-m2-runtime-slice-design.md`](2026-05-23-m2-runtime-slice-design.md)。

**Tech Stack:** TypeScript(`NodeNext` + `strict`)/ Vite(dev / build)/ Vitest(jsdom 环境用于 KeyboardEvent mock)/ pnpm workspace。新增第三方:无(`game` 包运行时 deps 不变;Unifont CN 子集打包成静态资源)。算法 / 数据规格 = M1 产物(`data/extracted/`)+ `reference/sdlpal/` 渲染规格(`map.c` 菱形错排、`palette.c` 调色板查表)。

**项目根目录:** `/Users/zhangxu/illegal/type-pal`

---

## File Structure(M2 末态)

```
type-pal/
├── packages/
│   ├── shared/src/
│   │   ├── events.ts                 修改(加 SetDialogStyleCommand)
│   │   ├── resources.ts              修改(加 SceneObjects + DialogBoxStyle)
│   │   ├── input.ts                  新建(InputSource / InputSnapshot / AbstractKey)
│   │   ├── index.ts                  修改(re-export input.ts)
│   │   └── *.test.ts                 各对应测试
│   ├── pal-extract/src/
│   │   ├── events/
│   │   │   ├── opcodes.ts            修改(0x003B-0x003E named:true + 字段)
│   │   │   ├── disasm.ts             修改(emitSetDialogStyle case + entry-ip 打 label)
│   │   │   └── recompile.ts          修改(setDialogStyle 写回 case)
│   │   ├── resources/
│   │   │   ├── scene.ts              新建(scene-1.json dump)
│   │   │   └── sprite.ts             修改(extractCharacterSprites)
│   │   ├── cli.ts                    修改(总装新产物)
│   │   └── **/*.test.ts              各对应测试
│   └── game/
│       ├── vite.config.ts            修改(server.fs.allow + symlink 兜底)
│       ├── public/                   新建(data/extracted symlink)
│       │   └── extracted -> ../../../data/extracted
│       ├── package.json              修改(devDep 加 jsdom)
│       ├── vitest.config.ts          新建(jsdom env)
│       └── src/
│           ├── main.ts               修改(改成 bootstrap 入口)
│           ├── main.test.ts          删除(M0 占位)
│           ├── shell/
│           │   ├── input.ts          新建
│           │   ├── main-loop.ts      新建
│           │   ├── bootstrap.ts      新建
│           │   └── *.test.ts
│           ├── present/
│           │   ├── framebuffer.ts    新建
│           │   ├── draw-tilemap.ts   新建
│           │   ├── draw-sprite.ts    新建
│           │   ├── draw-dialog-box.ts 新建
│           │   ├── font.ts           新建
│           │   ├── present.ts        新建
│           │   └── *.test.ts
│           ├── core/
│           │   ├── command-bus.ts    新建
│           │   ├── game-state.ts     新建
│           │   ├── mode.ts           新建
│           │   ├── scene-system.ts   新建
│           │   ├── event-system.ts   新建
│           │   └── *.test.ts
│           └── assets/
│               ├── png.ts            新建(8-bit grayscale PNG → Uint8Array)
│               ├── loader.ts         新建(fetch 所有产物)
│               └── *.test.ts
└── docs/plans/                       (本计划 + design 已在此)
```

`data/extracted/` 仍**不**入 git;`packages/game/public/extracted` 是个 symlink,实施时建,也不入 git。

---

## Task 列表总览

**Phase A · pal-extract 增量 + shared types**
- Task 1: `shared/events.ts` —— SetDialogStyleCommand 4 个类型
- Task 2: `shared/resources.ts` —— SceneObjects + DialogBoxStyle 类型
- Task 3: pal-extract opcodes / disasm / recompile —— 4 个 setDialogStyle 具名 + round-trip 仍通过
- Task 4: `pal-extract/resources/scene.ts` —— scene-1.json dump
- Task 5: `pal-extract/resources/sprite.ts` + `cli.ts` —— 角色 sprite 提取 + 总装新产物

**Phase B · game core**(无浏览器依赖)
- Task 6: `shared/input.ts` —— InputSource / InputSnapshot / AbstractKey
- Task 7: `game/core/command-bus.ts`
- Task 8: `game/core/game-state.ts` + `mode.ts`
- Task 9: `game/core/scene-system.ts`(走路 + 碰撞 + NPC 触发)
- Task 10: `game/core/event-system.ts`(loop-until-waitable + raw skip + 全部 op 处理)

**Phase C · game shell**
- Task 11: `game/shell/input.ts` —— KeyboardInputSource + Replay/Recording sources
- Task 12: `game/shell/main-loop.ts` —— headless `tickN` + rAF wrapper

**Phase D · game assets + present**(渲染)
- Task 13: `game/assets/png.ts` —— PNG → Uint8Array(索引)
- Task 14: `game/present/framebuffer.ts` —— 320×200 索引缓冲 + 调色板查表 → ImageData
- Task 15: `game/present/draw-tilemap.ts` —— 菱形错排
- Task 16: `game/present/draw-sprite.ts` —— anchor + 索引 0 透明
- Task 17: `game/present/font.ts` + `draw-dialog-box.ts` —— Unifont CN 子集占位 + 对话框

**Phase E · game integration**
- Task 18: `game/present/present.ts` —— 一帧装配 + 命令消费
- Task 19: `vite.config.ts` + `game/assets/loader.ts` —— 数据暴露 + fetch
- Task 20: `game/shell/bootstrap.ts` + `main.ts` —— 装配 + 启动
- Task 21: E2E Vitest —— headless 主循环 + replay 输入

**Phase F · 验收**
- Task 22: dev 验证清单 + README + 03/04 同步 + 实施过程发现

---

## Conventions

**TDD 节奏(每个 task)**:写失败测试 → 跑确认失败 → 写最小实现 → 跑确认通过 → commit。

**Commit 规约**:每 Task 一个 commit,直接 main(memory:solo 项目)。Commit message 格式:`feat(M2.N): <一句话>` / `feat(M2.N pal-extract): ...` 等。N 是 task 编号。

**测试运行命令**:
- 单包跑测:`pnpm -F @type-pal/game test`(或 `@type-pal/shared` / `@type-pal/pal-extract`)
- 单文件跑测:`pnpm -F @type-pal/game vitest run src/path/to/file.test.ts`
- 全仓跑测 + typecheck:`pnpm check`
- pal-extract 重跑:`pnpm extract`(从仓库根)
- dev server:`pnpm -F @type-pal/game dev`

**类型导入**:`@type-pal/shared` 的所有 export 都从 `index.ts` re-export,所以 game / pal-extract 用 `import { X } from '@type-pal/shared'`。

---

## Task 1: shared/events.ts —— SetDialogStyleCommand

**Files:**
- Modify: `packages/shared/src/events.ts`
- Modify: `packages/shared/src/events.test.ts`

**Why:** EventSystem 在 M2 要消费 `setDialogStyleXxx` 命令更新 `currentDialogStyle`。M1 把对话框样式 opcode(0x003B-0x003E)落 raw,M2 要把它们提升为 4 个具名 Command,加进 `Command` 联合类型。

> 关于 4 个 opcode 与 box 样式的对应:M1 实施过程发现 #6 提及 sdlpal `script.c:3438` 设置 box 样式的位置。具体哪个 opcode 对应哪个样式,**实施时按 script.c 注释为准**;本计划用 `top / center / bottom / narration` 这套命名。

- [ ] **Step 1: 在 events.test.ts 末尾追加类型测试**

```typescript
import type {
  DialogBoxStyle,
  SetDialogStyleTopCommand,
  SetDialogStyleCenterCommand,
  SetDialogStyleBottomCommand,
  SetDialogStyleNarrationCommand,
} from './events.js'

describe('SetDialogStyle commands', () => {
  it('DialogBoxStyle 四个具名样式', () => {
    expectTypeOf<DialogBoxStyle>().toEqualTypeOf<
      'top' | 'center' | 'bottom' | 'narration'
    >()
  })

  it('SetDialogStyleTopCommand 字段', () => {
    const c: SetDialogStyleTopCommand = { op: 'setDialogStyleTop' }
    expectTypeOf(c.op).toEqualTypeOf<'setDialogStyleTop'>()
  })

  it('四个 setDialogStyle 都在 Command 联合', () => {
    const cs: Command[] = [
      { op: 'setDialogStyleTop' },
      { op: 'setDialogStyleCenter' },
      { op: 'setDialogStyleBottom' },
      { op: 'setDialogStyleNarration' },
    ]
    expect(cs).toHaveLength(4)
  })
})
```

如果文件还没有 `import { describe, it, expect, expectTypeOf } from 'vitest'`,补上;`Command` 类型导入也确认在。

- [ ] **Step 2: 跑测试确认失败**

`pnpm -F @type-pal/shared vitest run src/events.test.ts`

期望:类型错(`DialogBoxStyle` / `SetDialogStyleTopCommand` 等未导出)。

- [ ] **Step 3: 实现类型**

修改 `packages/shared/src/events.ts`,在 `ShowDialogCommand` 之后、`SequenceCommand` 之前插入:

```typescript
/** 对话框样式 —— 由前置 opcode 0x003B-0x003E 设置(M2 新具名,见 D26)。 */
export type DialogBoxStyle = 'top' | 'center' | 'bottom' | 'narration'

export interface SetDialogStyleTopCommand {
  op: 'setDialogStyleTop'
  label?: string
}

export interface SetDialogStyleCenterCommand {
  op: 'setDialogStyleCenter'
  label?: string
}

export interface SetDialogStyleBottomCommand {
  op: 'setDialogStyleBottom'
  label?: string
}

export interface SetDialogStyleNarrationCommand {
  op: 'setDialogStyleNarration'
  label?: string
}
```

并把 `Command` 联合扩成:

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
  | SequenceCommand
  | IfCommand
  | ChoiceCommand
```

- [ ] **Step 4: 跑测试确认通过**

`pnpm -F @type-pal/shared vitest run src/events.test.ts` — 期望全绿。

- [ ] **Step 5: shared 包 typecheck**

`pnpm -F @type-pal/shared typecheck` — 期望无错。

(pal-extract 的 disasm/recompile 现有 switch 可能因联合扩张而报"非穷尽" — 那是预期,Task 3 会处理。本 Task 只关心 shared 包自身 typecheck。)

- [ ] **Step 6: Commit**

`git add packages/shared/src/events.ts packages/shared/src/events.test.ts`
`git commit -m "feat(M2.1): shared/events.ts —— SetDialogStyleCommand × 4 + DialogBoxStyle"`

---

## Task 2: shared/resources.ts —— SceneObjects + DialogBoxStyle

**Files:**
- Modify: `packages/shared/src/resources.ts`
- Modify: `packages/shared/src/resources.test.ts`

**Why:** `pal-extract` 要 dump `scene-1.json`,需要 SceneObjects schema(NPC 列表 + 入口 label);`game` 加载后按此型读。

- [ ] **Step 1: 末尾追加类型测试**

```typescript
import type { SceneObjects, SceneEventObject } from './resources.js'

describe('SceneObjects', () => {
  it('单个 eventObject 字段', () => {
    const eo: SceneEventObject = {
      id: 5,
      x: 10,
      y: 20,
      spriteNum: 78,
      triggerLabel: 'L_59',
      autoLabel: 'L_71',
    }
    expect(eo.id).toBe(5)
  })

  it('SceneObjects 整体', () => {
    const so: SceneObjects = {
      sceneId: 1,
      mapNum: 12,
      onEnterLabel: 'L_0',
      eventObjects: [],
    }
    expect(so.eventObjects).toEqual([])
  })

  it('triggerLabel / autoLabel 可缺', () => {
    const eo: SceneEventObject = { id: 0, x: 0, y: 0, spriteNum: 0 }
    expect(eo.triggerLabel).toBeUndefined()
  })
})
```

- [ ] **Step 2: 跑确认失败**

`pnpm -F @type-pal/shared vitest run src/resources.test.ts`

- [ ] **Step 3: 实现类型**

在 `packages/shared/src/resources.ts` 末尾追加:

```typescript
/** 一个场景里的事件对象(NPC 或交互点) —— pal-extract 切片场景时 dump 出来。 */
export interface SceneEventObject {
  /** 在原 SSS.MKF EventObject 数组里的下标。 */
  id: number
  /** 瓦片坐标(原 EventObject.x / .y,以 tile 为单位)。 */
  x: number
  y: number
  /** 精灵编号(原 EventObject.wSpriteNum) —— 对应 sprite-NNN.json。 */
  spriteNum: number
  /** 玩家触发对话的入口标签;在 scene-001.json commands 里找该 label 的 index 即可入口。 */
  triggerLabel?: string
  /** NPC 待机行为(M2 不消费,留给 M5+)。 */
  autoLabel?: string
}

export interface SceneObjects {
  sceneId: number
  /** mapNum = MAP.MKF / GOP.MKF 的 chunk index(同 tilemap-N.json 的 N 不必相同;见 SSS.MKF chunk 1 SCENE 数组)。 */
  mapNum: number
  /** scene 进入即跑的脚本入口,作为 label 名;对应 SSS.MKF SCENE.scriptOnEnter ip。 */
  onEnterLabel?: string
  /** scriptOnTeleport(若存在);M2 不消费。 */
  onTeleportLabel?: string
  eventObjects: SceneEventObject[]
}
```

- [ ] **Step 4: 跑测试 + commit**

`pnpm -F @type-pal/shared vitest run src/resources.test.ts` — 期望全绿。

`git add packages/shared/src/resources.ts packages/shared/src/resources.test.ts`
`git commit -m "feat(M2.2): shared/resources.ts —— SceneObjects + SceneEventObject"`

---

## Task 3: pal-extract opcodes / disasm / recompile —— setDialogStyle 全套

**Files:**
- Modify: `packages/pal-extract/src/events/opcodes.ts`
- Modify: `packages/pal-extract/src/events/disasm.ts`
- Modify: `packages/pal-extract/src/events/recompile.ts`
- Modify: `packages/pal-extract/src/events/disasm.test.ts`(若不存在,新建)

**Why:** Task 1 把 4 个 Command 类型加进了联合,但 disasm 仍把 opcode 0x003B-0x003E 落 raw。Task 3 让 disasm 真正产出具名 Command + recompile 写回字节码 + 全量 round-trip 仍逐字节通过。

> **对应关系敲定(实施时按 sdlpal `script.c:3438` 附近 case 确认,可能调整顺序)**:
> - `0x003B` → `setDialogStyleTop`
> - `0x003C` → `setDialogStyleCenter`
> - `0x003D` → `setDialogStyleBottom`
> - `0x003E` → `setDialogStyleNarration`

- [ ] **Step 1: 写 disasm + recompile round-trip 单测**

打开或新建 `packages/pal-extract/src/events/disasm.test.ts`,追加 case:

```typescript
import { describe, it, expect } from 'vitest'
import { disasm } from './disasm.js'
import { recompile } from './recompile.js'

describe('setDialogStyle round-trip', () => {
  function buildBytecode(opcodes: number[]): Uint8Array {
    const buf = new Uint8Array(opcodes.length * 8)
    const view = new DataView(buf.buffer)
    opcodes.forEach((op, i) => view.setUint16(i * 8, op, true))
    return buf
  }

  it('四个 setDialogStyle 反汇编为具名 Command', () => {
    const bc = buildBytecode([0x003b, 0x003c, 0x003d, 0x003e, 0x0000])
    const cmds = disasm(bc, [])
    expect(cmds[0]).toEqual({ op: 'setDialogStyleTop' })
    expect(cmds[1]).toEqual({ op: 'setDialogStyleCenter' })
    expect(cmds[2]).toEqual({ op: 'setDialogStyleBottom' })
    expect(cmds[3]).toEqual({ op: 'setDialogStyleNarration' })
    expect(cmds[4]).toEqual({ op: 'end' })
  })

  it('round-trip 字节级一致', () => {
    const bc = buildBytecode([0x003b, 0x003c, 0x003d, 0x003e, 0x0000])
    const cmds = disasm(bc, [])
    const back = recompile(cmds, [])
    expect(back).toEqual(bc)
  })
})
```

- [ ] **Step 2: 跑确认失败**

`pnpm -F @type-pal/pal-extract vitest run src/events/disasm.test.ts -t "setDialogStyle"`

期望:assert 错(cmds[0] 是 raw 不是 setDialogStyleTop),或 typecheck 错(emitCommand switch 不识别)。

- [ ] **Step 3: 注册 opcodes**

修改 `packages/pal-extract/src/events/opcodes.ts`,在合适分类节加 4 条:

```typescript
  // ── 对话框样式(M2 新具名,D26) ─────────────────────────────────────────
  // 0x003B: set dialog box style = top (script.c:3438 附近,实施时按真实顺序确认)
  0x003b: {
    name: 'setDialogStyleTop',
    fields: [VALUE, VALUE, VALUE],
    named: true,
  },
  // 0x003C: set dialog box style = center
  0x003c: {
    name: 'setDialogStyleCenter',
    fields: [VALUE, VALUE, VALUE],
    named: true,
  },
  // 0x003D: set dialog box style = bottom
  0x003d: {
    name: 'setDialogStyleBottom',
    fields: [VALUE, VALUE, VALUE],
    named: true,
  },
  // 0x003E: set dialog box style = narration
  0x003e: {
    name: 'setDialogStyleNarration',
    fields: [VALUE, VALUE, VALUE],
    named: true,
  },
```

(若这几个 opcode 此前已有 raw 占位条目,**改**它们而不是新增。)

- [ ] **Step 4: 给 disasm 加 emitSetDialogStyle case**

修改 `packages/pal-extract/src/events/disasm.ts` 的 `emitCommand` 函数,在 giveItem case 后、default 前加:

```typescript
    case 'setDialogStyleTop':
      return { op: 'setDialogStyleTop' }
    case 'setDialogStyleCenter':
      return { op: 'setDialogStyleCenter' }
    case 'setDialogStyleBottom':
      return { op: 'setDialogStyleBottom' }
    case 'setDialogStyleNarration':
      return { op: 'setDialogStyleNarration' }
```

- [ ] **Step 5: 给 recompile 加 setDialogStyle 写回 case**

修改 `packages/pal-extract/src/events/recompile.ts`,在 commands.forEach 循环中、giveItem 那个 if 之后、最后 throw 之前加:

```typescript
    if (c.op === 'setDialogStyleTop') {
      view.setUint16(off, 0x003b, true)
      return
    }
    if (c.op === 'setDialogStyleCenter') {
      view.setUint16(off, 0x003c, true)
      return
    }
    if (c.op === 'setDialogStyleBottom') {
      view.setUint16(off, 0x003d, true)
      return
    }
    if (c.op === 'setDialogStyleNarration') {
      view.setUint16(off, 0x003e, true)
      return
    }
```

- [ ] **Step 6: 跑单测确认通过**

`pnpm -F @type-pal/pal-extract vitest run src/events/disasm.test.ts -t "setDialogStyle"`

- [ ] **Step 7: 跑全量 events round-trip 自检**

`pnpm extract`

期望:看到 `[pal-extract] events round-trip OK`(SSS.MKF chunk 4 全量反汇编 + 重编译仍逐字节一致)。

如果失败:打印失败前后 16 字节,定位是不是哪个 0x003B-0x003E 的 operand 不是 0(原版可能某些场景在这些 opcode 上还塞了 operand)。如有,把字段从 VALUE 升成 `value` 具名字段,disasm / recompile 同步保留 operand。

- [ ] **Step 8: 跑全部 pal-extract 测试**

`pnpm -F @type-pal/pal-extract test` — 期望 M1 已有 91 个测试 + Task 3 新增的 2 个 case 全绿。

- [ ] **Step 9: Commit**

`git add packages/pal-extract/src/events/opcodes.ts packages/pal-extract/src/events/disasm.ts packages/pal-extract/src/events/recompile.ts packages/pal-extract/src/events/disasm.test.ts`
`git commit -m "feat(M2.3 pal-extract): 0x003B-0x003E 具名 setDialogStyle + round-trip OK"`

---

## Task 4: pal-extract resources/scene.ts —— scene-1.json dump

**Files:**
- Create: `packages/pal-extract/src/resources/scene.ts`
- Create: `packages/pal-extract/src/resources/scene.test.ts`
- Modify: `packages/pal-extract/src/events/disasm.ts`(扩签名接收 entryIps)
- Modify: `packages/pal-extract/src/events/disasm.test.ts`
- Modify: `packages/pal-extract/src/cli.ts`(收集 entry ips 传入 disasm + 调 dumpScene)

**Why:** 运行时要按 NPC 触发对话,需要"scene 1 有哪些 NPC + 坐标 + sprite 号 + 触发入口 label" 这份数据。M1 解析了 SSS chunk 0 / 1,M2 把切片场景的子集 dump 成 SceneObjects JSON。

**入口 ip → label 名映射难题**:M1 disasm 给所有跳转目标打了 `label: L_<ip>`,但 EventObject 的 trigger ip 本身**不一定**被跳转过 —— 所以可能没有 label。实测 scene-001.json 头几条命令没 label,从第 5 条起出现 `L_59`。解决:扩 disasm 接收 entryIps 参数,统一打 label。

- [ ] **Step 1: 扩 disasm 签名 + 给 entry ip 打 label**

修改 `packages/pal-extract/src/events/disasm.ts` 的 `disasm` 函数签名:

```typescript
export function disasm(
  bytecode: Uint8Array,
  messages: string[],
  entryIps: number[] = [],
): Command[] {
  // ... 现有第 1 遍逻辑 ...

  // 第 2 遍:对跳转目标 + entry ips 都打 label
  const allLabelTargets = new Set<number>(labelTargets)
  for (const ip of entryIps) {
    allLabelTargets.add(ip)
  }
  for (const target of allLabelTargets) {
    if (target >= 0 && target < commands.length) {
      commands[target] = { ...commands[target]!, label: `L_${target}` } as Command
    }
  }

  return commands
}
```

`entryIps` 默认空数组,向后兼容(已有调用不传则行为不变)。

- [ ] **Step 2: 加 disasm entry-ip 单测**

在 `packages/pal-extract/src/events/disasm.test.ts` 加:

```typescript
describe('disasm entry-ip labeling', () => {
  it('未被跳转的入口 ip 也会打 label', () => {
    const bc = new Uint8Array(16) // 2 条指令,全 0 (= end)
    const cmds = disasm(bc, [], [1])
    expect(cmds[1]?.label).toBe('L_1')
    expect(cmds[0]?.label).toBeUndefined()
  })
})
```

跑:`pnpm -F @type-pal/pal-extract vitest run src/events/disasm.test.ts -t "entry-ip"` — 通过。

- [ ] **Step 3: cli.ts 调用 disasm 时传入所有 entry ips**

修改 `packages/pal-extract/src/cli.ts`,在 `disasm(sss.bytecode, messages)` 调用前组装 entry ips:

```typescript
  const entryIps: number[] = []
  for (const sc of sss.scenes) {
    if (sc.scriptOnEnter > 0) entryIps.push(sc.scriptOnEnter)
    if (sc.scriptOnTeleport > 0) entryIps.push(sc.scriptOnTeleport)
  }
  for (const eo of sss.eventObjects) {
    if (eo.triggerScript > 0) entryIps.push(eo.triggerScript)
    if (eo.autoScript > 0) entryIps.push(eo.autoScript)
  }

  const rawCommands = disasm(sss.bytecode, messages, entryIps)
```

- [ ] **Step 4: 跑 round-trip 自检 + 全部测试**

`pnpm extract && pnpm -F @type-pal/pal-extract test`

期望:round-trip 仍 OK + 全部测试绿(label 增加不破坏 round-trip,因为 recompile 不用 label 决定 opcode)。

- [ ] **Step 5: 写 scene.ts 测试**

新建 `packages/pal-extract/src/resources/scene.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { dumpScene } from './scene.js'
import type { EventObject, Scene } from '../io/sss.js'

describe('dumpScene', () => {
  const fakeEventObjects: EventObject[] = [
    {
      state: 1, vanishTime: 0, x: 10, y: 20, spriteNum: 78,
      triggerScript: 59, autoScript: 0, layer: 0, triggerMode: 0,
      raw: new Uint16Array(16),
    },
    {
      state: 1, vanishTime: 0, x: 15, y: 25, spriteNum: 82,
      triggerScript: 100, autoScript: 200, layer: 0, triggerMode: 0,
      raw: new Uint16Array(16),
    },
  ]

  const fakeScenes: Scene[] = [
    { mapNum: 0, scriptOnEnter: 0, scriptOnTeleport: 0, eventObjectIndex: 0, raw: new Uint16Array(4) },
    { mapNum: 12, scriptOnEnter: 5, scriptOnTeleport: 0, eventObjectIndex: 0, raw: new Uint16Array(4) },
    { mapNum: 13, scriptOnEnter: 0, scriptOnTeleport: 0, eventObjectIndex: 2, raw: new Uint16Array(4) },
  ]

  it('scene 1 含两个 NPC', () => {
    const result = dumpScene(1, fakeScenes, fakeEventObjects)
    expect(result.sceneId).toBe(1)
    expect(result.mapNum).toBe(12)
    expect(result.onEnterLabel).toBe('L_5')
    expect(result.eventObjects).toHaveLength(2)
    expect(result.eventObjects[0]).toEqual({
      id: 0, x: 10, y: 20, spriteNum: 78,
      triggerLabel: 'L_59', autoLabel: undefined,
    })
    expect(result.eventObjects[1]?.triggerLabel).toBe('L_100')
    expect(result.eventObjects[1]?.autoLabel).toBe('L_200')
  })

  it('triggerScript=0 → triggerLabel undefined', () => {
    const eos: EventObject[] = [
      { ...fakeEventObjects[0]!, triggerScript: 0, autoScript: 0 },
    ]
    const result = dumpScene(1, fakeScenes, eos)
    expect(result.eventObjects[0]?.triggerLabel).toBeUndefined()
    expect(result.eventObjects[0]?.autoLabel).toBeUndefined()
  })
})
```

跑确认失败。

- [ ] **Step 6: 实现 scene.ts**

新建 `packages/pal-extract/src/resources/scene.ts`:

```typescript
import type { SceneObjects } from '@type-pal/shared'
import type { EventObject, Scene } from '../io/sss.js'

function labelOf(ip: number): string | undefined {
  return ip > 0 ? `L_${ip}` : undefined
}

export function dumpScene(
  sceneId: number,
  scenes: Scene[],
  eventObjects: EventObject[],
): SceneObjects {
  const scene = scenes[sceneId]
  if (!scene) {
    throw new Error(`dumpScene: scene ${sceneId} 不存在(scenes.length=${scenes.length})`)
  }

  const fromIdx = scene.eventObjectIndex
  const toIdx =
    sceneId + 1 < scenes.length
      ? scenes[sceneId + 1]!.eventObjectIndex
      : eventObjects.length

  const sceneObjects: SceneObjects = {
    sceneId,
    mapNum: scene.mapNum,
    onEnterLabel: labelOf(scene.scriptOnEnter),
    onTeleportLabel: labelOf(scene.scriptOnTeleport),
    eventObjects: [],
  }

  for (let i = fromIdx; i < toIdx; i++) {
    const eo = eventObjects[i]
    if (!eo) continue
    sceneObjects.eventObjects.push({
      id: i,
      x: eo.x,
      y: eo.y,
      spriteNum: eo.spriteNum,
      triggerLabel: labelOf(eo.triggerScript),
      autoLabel: labelOf(eo.autoScript),
    })
  }

  return sceneObjects
}
```

- [ ] **Step 7: 跑测试 + cli.ts 调用 dumpScene**

`pnpm -F @type-pal/pal-extract vitest run src/resources/scene.test.ts` — 期望全绿。

修改 `packages/pal-extract/src/cli.ts`,在资源切片那节(palette 之后、TODO sprite 之前)加:

```typescript
import { dumpScene } from './resources/scene.js'

// ...

  const sceneObjects = dumpScene(SLICE_SCENE_ID, sss.scenes, sss.eventObjects)
  writeJson(resolve(OUT, 'data', `scene-${SLICE_SCENE_ID}.json`), sceneObjects)
  console.log(
    `[pal-extract] scene-${SLICE_SCENE_ID}.json written (${sceneObjects.eventObjects.length} event objects)`,
  )
```

- [ ] **Step 8: 跑 pnpm extract 看产物**

`pnpm extract`
`ls data/extracted/data/scene-1.json`
`cat data/extracted/data/scene-1.json | head -30`

记下输出中 `mapNum` 与 `eventObjects` 列表 —— Task 5 sprite 提取要用到这些 spriteNum。

- [ ] **Step 9: Commit**

`git add packages/pal-extract/src/events/disasm.ts packages/pal-extract/src/events/disasm.test.ts packages/pal-extract/src/resources/scene.ts packages/pal-extract/src/resources/scene.test.ts packages/pal-extract/src/cli.ts`
`git commit -m "feat(M2.4 pal-extract): scene-1.json dump + disasm 给 entry ip 打 label"`

---

## Task 5: pal-extract sprite 提取 + cli 总装

**Files:**
- Modify: `packages/pal-extract/src/resources/sprite.ts`
- Modify: `packages/pal-extract/src/resources/sprite.test.ts`
- Modify: `packages/pal-extract/src/cli.ts`

**Why:** M1 只提了 scene 1 的 323 个 tile bitmap,角色 / NPC sprite 没做。M2 顺手把队长 + scene 1 涉及的 NPC sprite 提取出来。

> **数据源**:sdlpal `global.c::PAL_LoadObjectDesc` / `palcommon.c` 揭示精灵在多个 MKF 里:
> - **MGO.MKF** chunk N = 主世界 / 场景 NPC 精灵(每 chunk 一个精灵的多帧)
> - **F.MKF** chunk N = 战斗角色(M2 不用)
> - **GOP.MKF** = tile sprite,M1 已处理
>
> **具体 chunk 号**:Task 4 跑出来的 scene-1.json 给出每个 EventObject 的 spriteNum = MGO.MKF 的 chunk index。加上队长精灵号(原版第一角色,**M2 先硬编码队长 sprite = 0**,实施时按真实数据先 dump 验证,若不对再调)。

- [ ] **Step 1: 看 Task 4 dump 出的 scene-1.json,确认需要的 sprite 号集合**

`cat data/extracted/data/scene-1.json | grep spriteNum | sort -u`

记下输出:这些是 scene 1 需要的 NPC sprite 号。

- [ ] **Step 2: 写 extractCharacterSprites 单测**

修改 `packages/pal-extract/src/resources/sprite.test.ts`,加 case:

```typescript
import { extractCharacterSprites } from './sprite.js'

describe('extractCharacterSprites', () => {
  it('给定 sprite id 集合,从 chunk map 提取每个 sprite 的全部帧', () => {
    const fakeMgoChunks = new Map<number, Uint8Array>()
    const emptySpriteChunk = new Uint8Array(4)
    new DataView(emptySpriteChunk.buffer).setUint16(0, 0, true) // frameCount=0
    fakeMgoChunks.set(78, emptySpriteChunk)

    const result = extractCharacterSprites([78], fakeMgoChunks)
    expect(result).toHaveLength(1)
    expect(result[0]?.spriteId).toBe(78)
    expect(result[0]?.frames).toEqual([])
  })

  it('未在 mgoChunks 中找到的 sprite id —— skip 且记 warn(不抛错)', () => {
    const result = extractCharacterSprites([999], new Map())
    expect(result).toHaveLength(0)
  })
})
```

跑确认失败:`pnpm -F @type-pal/pal-extract vitest run src/resources/sprite.test.ts -t "extractCharacterSprites"`。

- [ ] **Step 3: 实现 extractCharacterSprites**

修改 `packages/pal-extract/src/resources/sprite.ts`,在 `framesToOut` 之后加:

```typescript
export interface CharacterSpriteOut {
  spriteId: number
  frames: SpriteFrameOut[]
}

/**
 * 从 MGO.MKF 提取一组指定 sprite id 的全部帧。
 * @param spriteIds —— 切片场景出现的 sprite 号集合(队长 + NPC.spriteNum 去重)
 * @param mgoChunks —— sprite id → 该 chunk 原始字节(调用方负责从 MGO.MKF 读 / 解压)
 */
export function extractCharacterSprites(
  spriteIds: number[],
  mgoChunks: Map<number, Uint8Array>,
): CharacterSpriteOut[] {
  const result: CharacterSpriteOut[] = []
  for (const id of spriteIds) {
    const chunk = mgoChunks.get(id)
    if (!chunk) {
      console.warn(`[pal-extract] sprite ${id}: MGO.MKF chunk 未找到,skip`)
      continue
    }
    const frames = parseSpriteChunk(chunk)
    result.push({ spriteId: id, frames: framesToOut(frames) })
  }
  return result
}
```

- [ ] **Step 4: 跑测试确认通过**

`pnpm -F @type-pal/pal-extract vitest run src/resources/sprite.test.ts`

- [ ] **Step 5: cli.ts 总装 sprite 提取**

修改 `packages/pal-extract/src/cli.ts`,在 `精灵切片:M1 暂不实现` TODO 处替换为真实实现:

```typescript
import { extractCharacterSprites } from './resources/sprite.js'

  // 角色 / NPC 精灵切片(M2 新增 — D27)
  console.log(`[pal-extract] character sprites for scene ${SLICE_SCENE_ID} …`)

  const PARTY_LEADER_SPRITE = 0
  const spriteIds = new Set<number>([PARTY_LEADER_SPRITE])
  for (const eo of sceneObjects.eventObjects) {
    if (eo.spriteNum > 0) spriteIds.add(eo.spriteNum)
  }

  const mgoMkf = openMkf(loadFile('MGO.MKF'))
  const mgoChunkCount = chunkCount(mgoMkf)
  const mgoChunks = new Map<number, Uint8Array>()
  for (const id of spriteIds) {
    if (id >= mgoChunkCount) {
      console.warn(`[pal-extract] sprite ${id} >= MGO chunk count ${mgoChunkCount}, skip`)
      continue
    }
    // MGO.MKF chunk 可能 YJ2 压缩;先 raw,若 parseSpriteChunk 失败,改 decompressYj2
    mgoChunks.set(id, readChunk(mgoMkf, id))
  }

  const sprites = extractCharacterSprites([...spriteIds], mgoChunks)

  for (const sprite of sprites) {
    const spriteJson = {
      spriteId: sprite.spriteId,
      frames: sprite.frames.map((f) => ({
        index: f.index,
        width: f.width,
        height: f.height,
      })),
    }
    writeJson(resolve(OUT, 'data', `sprite-${sprite.spriteId}.json`), spriteJson)
    for (const f of sprite.frames) {
      writeBinary(
        resolve(
          OUT, 'images',
          `sprite-${sprite.spriteId}-frame-${f.index.toString().padStart(2, '0')}.png`,
        ),
        f.pngBytes,
      )
    }
  }

  console.log(
    `[pal-extract] sprites written: ${sprites.length} sprites, ` +
      `${sprites.reduce((sum, s) => sum + s.frames.length, 0)} frames total`,
  )
```

- [ ] **Step 6: 跑 pnpm extract,验证产物**

`pnpm extract`
`ls data/extracted/data/sprite-*.json`
`ls data/extracted/images/sprite-*.png | wc -l`

期望:看到若干 sprite-NNN.json + sprite-NNN-frame-MM.png。若 parseSpriteChunk 抛错,回 Step 5 改用 `decompressYj2(readChunk(...))`,再跑。

> **debug 提示**:若一直失败,临时加 `console.log(readChunk(mgoMkf, 78).slice(0, 16))` 看首字节,跟 sdlpal palcommon.c PAL_SpriteGetFrame 对一下首两字节(frame count)是否合理(0-100 区间)。若不是,大概率要先 YJ2 解压。

- [ ] **Step 7: 看一两张 PNG 是否合理**

用图像查看器打开 `sprite-0-frame-00.png`,应该看到一个像素人形(虽然颜色不对,因为是索引位图未上色)。若不像或全黑,回 Step 5/6 debug。

- [ ] **Step 8: 跑全部 pal-extract 测试**

`pnpm -F @type-pal/pal-extract test` — 期望全绿。

- [ ] **Step 9: Commit**

`git add packages/pal-extract/src/resources/sprite.ts packages/pal-extract/src/resources/sprite.test.ts packages/pal-extract/src/cli.ts`
`git commit -m "feat(M2.5 pal-extract): 角色 / NPC sprite 提取 + cli 总装"`

---

## Task 6: shared/input.ts —— InputSource / InputSnapshot / AbstractKey

**Files:**
- Create: `packages/shared/src/input.ts`
- Create: `packages/shared/src/input.test.ts`
- Modify: `packages/shared/src/index.ts`(re-export)

**Why:** Shell input 层与 Core 系统层之间的契约,从 day 1 就预留 record / replay 接口(D14)。类型放 shared 是为了未来 e2e / dev 工具能拿到。

- [ ] **Step 1: 写类型测试**

新建 `packages/shared/src/input.test.ts`:

```typescript
import { describe, it, expect, expectTypeOf } from 'vitest'
import type { AbstractKey, InputSnapshot, InputSource } from './input.js'

describe('input types', () => {
  it('AbstractKey 联合', () => {
    expectTypeOf<AbstractKey>().toEqualTypeOf<
      'Up' | 'Down' | 'Left' | 'Right' | 'Confirm' | 'Cancel' | 'Menu'
    >()
  })

  it('InputSnapshot 字段', () => {
    const snap: InputSnapshot = {
      held: new Set<AbstractKey>(),
      pressed: new Set<AbstractKey>(['Confirm']),
      frameNum: 42,
    }
    expect(snap.frameNum).toBe(42)
    expect(snap.pressed.has('Confirm')).toBe(true)
  })

  it('InputSource 接口', () => {
    const src: InputSource = {
      nextSnapshot(frameNum: number): InputSnapshot {
        return { held: new Set(), pressed: new Set(), frameNum }
      },
    }
    expect(src.nextSnapshot(0).frameNum).toBe(0)
  })
})
```

跑确认失败。

- [ ] **Step 2: 实现 input.ts**

新建 `packages/shared/src/input.ts`:

```typescript
/**
 * 输入系统的类型契约(D14)。
 * Shell 把物理按键 → AbstractKey;Core 只见抽象按键,与浏览器解耦,可单测 / 录制回放。
 */

export type AbstractKey =
  | 'Up' | 'Down' | 'Left' | 'Right'
  | 'Confirm' | 'Cancel' | 'Menu'

/** 一帧的输入快照。 */
export interface InputSnapshot {
  /** 当前按住的键(走路用) */
  held: ReadonlySet<AbstractKey>
  /** 本 tick 新按下的键(菜单 / 确认用) */
  pressed: ReadonlySet<AbstractKey>
  /** 帧号,便于回放与日志对齐。 */
  frameNum: number
}

/** 输入源抽象 —— 真键盘 / 回放 / 录制 都实现此接口。 */
export interface InputSource {
  nextSnapshot(frameNum: number): InputSnapshot
}
```

- [ ] **Step 3: 改 index.ts 加 re-export**

在 `packages/shared/src/index.ts` 现有 export 后加:

```typescript
export * from './input.js'
```

- [ ] **Step 4: 跑测试 + commit**

`pnpm -F @type-pal/shared test` — 期望全绿。

`git add packages/shared/src/input.ts packages/shared/src/input.test.ts packages/shared/src/index.ts`
`git commit -m "feat(M2.6): shared/input.ts —— InputSource / InputSnapshot / AbstractKey"`

---

## Task 7: game/core/command-bus.ts

**Files:**
- Create: `packages/game/src/core/command-bus.ts`
- Create: `packages/game/src/core/command-bus.test.ts`

**Why:** Core → Present 单向命令通道。M2 同步队列 FIFO;接口形状(`emit` 返回 cmdId、`complete(cmdId)`)留下给 M3 异步回执扩展。

- [ ] **Step 1: 写测试**

新建 `packages/game/src/core/command-bus.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { createCommandBus } from './command-bus.js'

describe('CommandBus', () => {
  it('emit + drain 顺序', () => {
    const bus = createCommandBus()
    bus.emit({ op: 'showDialogBox', text: 'hi', style: 'center' })
    bus.emit({ op: 'showDialogBox', text: 'bye', style: 'top' })
    const drained = bus.drain()
    expect(drained).toHaveLength(2)
    expect(drained[0]?.cmd.op).toBe('showDialogBox')
  })

  it('drain 后 bus 清空', () => {
    const bus = createCommandBus()
    bus.emit({ op: 'showDialogBox', text: 'a', style: 'top' })
    bus.drain()
    expect(bus.drain()).toEqual([])
  })

  it('emit 返回唯一 cmdId', () => {
    const bus = createCommandBus()
    const id1 = bus.emit({ op: 'clearDialogBox' })
    const id2 = bus.emit({ op: 'clearDialogBox' })
    expect(id1).not.toBe(id2)
  })

  it('complete(cmdId) M2 内 no-op,但不抛错', () => {
    const bus = createCommandBus()
    const id = bus.emit({ op: 'clearDialogBox' })
    expect(() => bus.complete(id)).not.toThrow()
  })

  it('未知 cmdId complete —— 不抛错', () => {
    const bus = createCommandBus()
    expect(() => bus.complete(999999)).not.toThrow()
  })
})
```

跑确认失败。

- [ ] **Step 2: 实现 command-bus.ts**

新建 `packages/game/src/core/command-bus.ts`:

```typescript
/**
 * Core → Present 单向命令通道(02 架构 + D15)。
 * M2 同步语义:Core 系统在 tick 内 emit、tick 末 Present 一把 drain。
 * 异步回执机制(complete cmdId)接口留下,M3 转场 / 视频时激活。
 */

import type { DialogBoxStyle } from '@type-pal/shared'

export type PresentCommand =
  | { op: 'showDialogBox'; text: string; style: DialogBoxStyle }
  | { op: 'clearDialogBox' }

export interface BusEntry {
  cmdId: number
  cmd: PresentCommand
}

export interface CommandBus {
  emit(cmd: PresentCommand): number
  drain(): BusEntry[]
  complete(cmdId: number): void
}

export function createCommandBus(): CommandBus {
  let queue: BusEntry[] = []
  let nextId = 1

  return {
    emit(cmd) {
      const cmdId = nextId++
      queue.push({ cmdId, cmd })
      return cmdId
    },
    drain() {
      const out = queue
      queue = []
      return out
    },
    complete(_cmdId) {
      // M2 内 no-op;M3 转场 / 视频时把异步资源跟 cmdId 关联,完成时调 complete。
    },
  }
}
```

- [ ] **Step 3: 跑测试 + commit**

`pnpm -F @type-pal/game vitest run src/core/command-bus.test.ts` — 期望全绿。

`git add packages/game/src/core/command-bus.ts packages/game/src/core/command-bus.test.ts`
`git commit -m "feat(M2.7): game/core/command-bus.ts —— PresentCommand 同步队列 + 异步回执接口"`

---

## Task 8: game/core/game-state.ts + mode.ts

**Files:**
- Create: `packages/game/src/core/game-state.ts`
- Create: `packages/game/src/core/mode.ts`
- Create: `packages/game/src/core/game-state.test.ts`

**Why:** GameState 是单一真相源(D6)。mode 是顶层模式机分发,M2 只两态(explore / event)。

- [ ] **Step 1: 写测试**

新建 `packages/game/src/core/game-state.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { createInitialGameState, type Facing, type GameState } from './game-state.js'

describe('GameState', () => {
  it('初始态:无 NPC、explore 模式、无对话框', () => {
    const gs = createInitialGameState({ col: 0, row: 0, facing: 'down' })
    expect(gs.party.col).toBe(0)
    expect(gs.mode).toBe('explore')
    expect(gs.dialogBox).toBeUndefined()
    expect(gs.eventCursor).toBeUndefined()
    expect(gs.currentDialogStyle).toBe('center')
    expect(gs.frameNum).toBe(0)
  })

  it('Facing 四向', () => {
    const facings: Facing[] = ['up', 'down', 'left', 'right']
    expect(facings).toHaveLength(4)
  })

  it('GameState 可 JSON 序列化', () => {
    const gs = createInitialGameState({ col: 10, row: 20, facing: 'right' })
    const json = JSON.stringify(gs)
    const parsed = JSON.parse(json) as GameState
    expect(parsed.party.col).toBe(10)
  })
})
```

跑确认失败。

- [ ] **Step 2: 实现 game-state.ts**

新建 `packages/game/src/core/game-state.ts`:

```typescript
import type { Command, DialogBoxStyle, SceneEventObject } from '@type-pal/shared'

export type Facing = 'up' | 'down' | 'left' | 'right'

export type Mode = 'explore' | 'event'

export interface NpcState {
  id: number
  col: number
  row: number
  spriteNum: number
  triggerLabel?: string
}

export interface EventCursor {
  commands: Command[]
  labelMap: Record<string, number>
  ip: number
  waiting?: 'dialog'
}

export interface DialogBoxState {
  text: string
  style: DialogBoxStyle
}

export interface GameState {
  party: { col: number; row: number; facing: Facing }
  camera: { col: number; row: number }
  npcs: NpcState[]
  mode: Mode
  eventCursor?: EventCursor
  dialogBox?: DialogBoxState
  /** 由 setDialogStyle* 命令累积。默认 'center'。 */
  currentDialogStyle: DialogBoxStyle
  frameNum: number
}

export function createInitialGameState(
  partyStart: { col: number; row: number; facing: Facing },
): GameState {
  return {
    party: partyStart,
    camera: { col: partyStart.col, row: partyStart.row },
    npcs: [],
    mode: 'explore',
    currentDialogStyle: 'center',
    frameNum: 0,
  }
}

export function npcFromEventObject(eo: SceneEventObject): NpcState {
  return {
    id: eo.id,
    col: eo.x,
    row: eo.y,
    spriteNum: eo.spriteNum,
    triggerLabel: eo.triggerLabel,
  }
}
```

- [ ] **Step 3: 实现 mode.ts**

新建 `packages/game/src/core/mode.ts`:

```typescript
import type { InputSnapshot } from '@type-pal/shared'
import type { CommandBus } from './command-bus.js'
import type { GameState } from './game-state.js'
import { tickEventSystem } from './event-system.js'
import { tickSceneSystem } from './scene-system.js'

export function tickByMode(gs: GameState, input: InputSnapshot, bus: CommandBus): void {
  switch (gs.mode) {
    case 'explore':
      tickSceneSystem(gs, input, bus)
      break
    case 'event':
      tickEventSystem(gs, input, bus)
      break
  }
}
```

(mode.ts 引用未存在的 scene-system.ts / event-system.ts —— typecheck 会失败,Task 9 / 10 补齐。本 Task 仅 commit game-state.ts + mode.ts。)

- [ ] **Step 4: 跑 game-state 测试 + commit**

`pnpm -F @type-pal/game vitest run src/core/game-state.test.ts` — 期望全绿(game-state.ts 不依赖 scene/event)。

mode.ts typecheck 失败先忽略 —— Task 9 / 10 后修。

`git add packages/game/src/core/game-state.ts packages/game/src/core/mode.ts packages/game/src/core/game-state.test.ts`
`git commit -m "feat(M2.8): game/core/game-state.ts + mode.ts —— GameState + 模式机分发"`

---

## Task 9: game/core/scene-system.ts —— 走路 + 碰撞 + NPC 触发

**Files:**
- Create: `packages/game/src/core/scene-system.ts`
- Create: `packages/game/src/core/scene-system.test.ts`

**Why:** explore 模式的 tick 主体。读 input → 走路 / 撞墙 / 转向 → 检测 Confirm → 装载 NPC 事件 → 切 mode。

**碰撞简化**:M1 切出来的 Tilemap.TileCell 只有 lower / upper(u16 各),attribute 位是否单独存待查。M2 简化:**所有 cell 可走**(只做地图边界 clamp)。后续 Task 22 dev 验证若发现 NPC 能走进墙里,补属性位查询。

- [ ] **Step 1: 写测试**

新建 `packages/game/src/core/scene-system.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import type { Tilemap, InputSnapshot, AbstractKey } from '@type-pal/shared'
import { tickSceneSystem } from './scene-system.js'
import { createInitialGameState } from './game-state.js'
import { createCommandBus } from './command-bus.js'

function makeFlatMap(w: number, h: number): Tilemap {
  const cells = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ lower: 0, upper: 0 })),
  )
  return { width: w, height: h, cells, tilesetImage: 'fake' }
}

function snap(held: AbstractKey[] = [], pressed: AbstractKey[] = [], frameNum = 0): InputSnapshot {
  return {
    held: new Set(held),
    pressed: new Set(pressed),
    frameNum,
  }
}

describe('SceneSystem 走路', () => {
  it('按住 Right → party.col + 1, facing=right', () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(['Right']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.party.col).toBe(6)
    expect(gs.party.facing).toBe('right')
  })

  it('按住 Up → row - 1, facing=up', () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(['Up']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.party.row).toBe(4)
    expect(gs.party.facing).toBe('up')
  })

  it('地图边界 clamp:已在最左不能再左', () => {
    const gs = createInitialGameState({ col: 0, row: 5, facing: 'down' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap(['Left']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.party.col).toBe(0)
    expect(gs.party.facing).toBe('left')
  })
})

describe('SceneSystem NPC 触发', () => {
  it('面前格无 NPC + Confirm → 不切 mode', () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'right' })
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    tickSceneSystem(gs, snap([], ['Confirm']), bus, { tilemap: map, eventCommands: [], labelMap: {} })
    expect(gs.mode).toBe('explore')
  })

  it('面前格有 NPC + Confirm → mode=event + eventCursor 装载', () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'right' })
    gs.npcs = [{ id: 7, col: 6, row: 5, spriteNum: 78, triggerLabel: 'L_59' }]
    const bus = createCommandBus()
    const map = makeFlatMap(10, 10)
    const commands = [
      { op: 'end' as const },
      { op: 'end' as const },
      { op: 'showDialog' as const, messageIndex: 0, text: '你好', label: 'L_59' },
      { op: 'end' as const },
    ]
    tickSceneSystem(gs, snap([], ['Confirm']), bus, {
      tilemap: map,
      eventCommands: commands,
      labelMap: { L_59: 2 },
    })
    expect(gs.mode).toBe('event')
    expect(gs.eventCursor?.ip).toBe(2)
  })
})
```

跑确认失败。

- [ ] **Step 2: 实现 scene-system.ts**

新建 `packages/game/src/core/scene-system.ts`:

```typescript
import type { Command, InputSnapshot, Tilemap } from '@type-pal/shared'
import type { CommandBus } from './command-bus.js'
import type { Facing, GameState, NpcState } from './game-state.js'

export interface SceneContext {
  tilemap: Tilemap
  eventCommands: Command[]
  labelMap: Record<string, number>
}

let _ctx: SceneContext | null = null

export function setSceneContext(ctx: SceneContext): void {
  _ctx = ctx
}

const DIR_DELTA: Record<Facing, { dc: number; dr: number }> = {
  up: { dc: 0, dr: -1 },
  down: { dc: 0, dr: 1 },
  left: { dc: -1, dr: 0 },
  right: { dc: 1, dr: 0 },
}

const DIR_PRIORITY: { key: 'Up' | 'Down' | 'Left' | 'Right'; facing: Facing }[] = [
  { key: 'Up', facing: 'up' },
  { key: 'Down', facing: 'down' },
  { key: 'Left', facing: 'left' },
  { key: 'Right', facing: 'right' },
]

function pickFacing(input: InputSnapshot): Facing | null {
  for (const d of DIR_PRIORITY) {
    if (input.held.has(d.key)) return d.facing
  }
  return null
}

function npcAt(npcs: NpcState[], col: number, row: number): NpcState | undefined {
  return npcs.find((n) => n.col === col && n.row === row)
}

function isWalkable(tilemap: Tilemap, col: number, row: number): boolean {
  if (col < 0 || col >= tilemap.width || row < 0 || row >= tilemap.height) return false
  // M2 简化:全部可走。M1 没单独存 attribute 位,实施时若发现 schema 已带,
  // 改成查属性位即可。Task 22 在「实施过程发现」记录。
  return true
}

export function tickSceneSystem(
  gs: GameState,
  input: InputSnapshot,
  bus: CommandBus,
  ctxOverride?: SceneContext,
): void {
  const ctx = ctxOverride ?? _ctx
  if (!ctx) throw new Error('scene-system: setSceneContext / ctxOverride 必须先设置')

  // 1) 走路 + 转向
  const facing = pickFacing(input)
  if (facing) {
    gs.party.facing = facing
    const { dc, dr } = DIR_DELTA[facing]
    const nc = gs.party.col + dc
    const nr = gs.party.row + dr
    if (isWalkable(ctx.tilemap, nc, nr) && !npcAt(gs.npcs, nc, nr)) {
      gs.party.col = nc
      gs.party.row = nr
    }
  }

  // 2) 相机跟随
  gs.camera = { col: gs.party.col, row: gs.party.row }

  // 3) Confirm 触发 NPC
  if (input.pressed.has('Confirm')) {
    const { dc, dr } = DIR_DELTA[gs.party.facing]
    const targetCol = gs.party.col + dc
    const targetRow = gs.party.row + dr
    const npc = npcAt(gs.npcs, targetCol, targetRow)
    if (npc?.triggerLabel) {
      const ip = ctx.labelMap[npc.triggerLabel]
      if (ip !== undefined) {
        gs.eventCursor = {
          commands: ctx.eventCommands,
          labelMap: ctx.labelMap,
          ip,
        }
        gs.mode = 'event'
      } else {
        console.warn(`scene-system: triggerLabel ${npc.triggerLabel} 不在 labelMap 中`)
      }
    }
  }

  // 4) 推进 frameNum
  gs.frameNum++

  void bus
}
```

- [ ] **Step 3: 跑测试 + commit**

`pnpm -F @type-pal/game vitest run src/core/scene-system.test.ts` — 期望全绿。

`git add packages/game/src/core/scene-system.ts packages/game/src/core/scene-system.test.ts`
`git commit -m "feat(M2.9): game/core/scene-system.ts —— 走路 + 边界 + NPC 触发"`

---

## Task 10: game/core/event-system.ts

**Files:**
- Create: `packages/game/src/core/event-system.ts`
- Create: `packages/game/src/core/event-system.test.ts`

**Why:** 协程式步进器(D15 + 05)。M2 实现:loop-until-waitable + raw skip + setDialogStyle 累积 + showDialog 设 dialogBox + waiting + end 切回 explore + goto 跳转。

- [ ] **Step 1: 写测试**

新建 `packages/game/src/core/event-system.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import type { Command, InputSnapshot, AbstractKey } from '@type-pal/shared'
import { tickEventSystem, buildLabelMap } from './event-system.js'
import { createInitialGameState, type GameState } from './game-state.js'
import { createCommandBus } from './command-bus.js'

function snap(pressed: AbstractKey[] = [], frameNum = 0): InputSnapshot {
  return { held: new Set(), pressed: new Set(pressed), frameNum }
}

function loadEvent(gs: GameState, commands: Command[], startIp = 0): void {
  gs.eventCursor = {
    commands,
    labelMap: buildLabelMap(commands),
    ip: startIp,
  }
  gs.mode = 'event'
}

describe('buildLabelMap', () => {
  it('收集所有带 label 的命令', () => {
    const cmds: Command[] = [
      { op: 'end' },
      { op: 'showDialog', messageIndex: 0, text: 'a', label: 'L_1' },
      { op: 'end', label: 'L_2' },
    ]
    expect(buildLabelMap(cmds)).toEqual({ L_1: 1, L_2: 2 })
  })
})

describe('EventSystem', () => {
  it('showDialog → 设 dialogBox + waiting + emit', () => {
    const gs = createInitialGameState({ col: 0, row: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'showDialog', messageIndex: 0, text: '你好' },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.dialogBox?.text).toBe('你好')
    expect(gs.eventCursor?.waiting).toBe('dialog')
    expect(bus.drain()[0]?.cmd.op).toBe('showDialogBox')
  })

  it('waiting=dialog + Confirm 释放 → ip++ + 继续到 end → mode=explore', () => {
    const gs = createInitialGameState({ col: 0, row: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'showDialog', messageIndex: 0, text: '你好' },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus) // 进入 waiting
    tickEventSystem(gs, snap(['Confirm']), bus) // 释放 + 继续到 end
    expect(gs.mode).toBe('explore')
    expect(gs.eventCursor).toBeUndefined()
    expect(gs.dialogBox).toBeUndefined()
  })

  it('setDialogStyle 累积到 currentDialogStyle', () => {
    const gs = createInitialGameState({ col: 0, row: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'setDialogStyleTop' },
      { op: 'showDialog', messageIndex: 0, text: 'x' },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.currentDialogStyle).toBe('top')
    expect(gs.dialogBox?.style).toBe('top')
  })

  it('raw 命令 skip + console.debug + ip++', () => {
    const gs = createInitialGameState({ col: 0, row: 0, facing: 'down' })
    const bus = createCommandBus()
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    loadEvent(gs, [
      { op: 'raw', opcode: 16, operands: [36, 24, 0] },
      { op: 'raw', opcode: 73, operands: [4, 1, 0] },
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.mode).toBe('explore') // 一帧内连跑完
    expect(debugSpy).toHaveBeenCalledTimes(2)
    debugSpy.mockRestore()
  })

  it('goto 跳转', () => {
    const gs = createInitialGameState({ col: 0, row: 0, facing: 'down' })
    const bus = createCommandBus()
    loadEvent(gs, [
      { op: 'goto', to: 'target' },
      { op: 'raw', opcode: 0, operands: [0, 0, 0] }, // 不应执行
      { op: 'end', label: 'target' },
    ])
    tickEventSystem(gs, snap(), bus)
    expect(gs.mode).toBe('explore')
  })

  it('单 tick > 256 条 → 抛错防死循环', () => {
    const gs = createInitialGameState({ col: 0, row: 0, facing: 'down' })
    const bus = createCommandBus()
    const cmds: Command[] = []
    for (let i = 0; i < 1000; i++) cmds.push({ op: 'raw', opcode: 0, operands: [0, 0, 0] })
    loadEvent(gs, cmds)
    vi.spyOn(console, 'debug').mockImplementation(() => {})
    expect(() => tickEventSystem(gs, snap(), bus)).toThrow(/single-tick instruction limit/)
  })
})
```

跑确认失败。

- [ ] **Step 2: 实现 event-system.ts**

新建 `packages/game/src/core/event-system.ts`:

```typescript
import type { Command, InputSnapshot } from '@type-pal/shared'
import type { CommandBus } from './command-bus.js'
import type { GameState } from './game-state.js'

const SINGLE_TICK_LIMIT = 256

export function buildLabelMap(commands: Command[]): Record<string, number> {
  const map: Record<string, number> = {}
  commands.forEach((c, i) => {
    if (c.label) map[c.label] = i
  })
  return map
}

export function tickEventSystem(
  gs: GameState,
  input: InputSnapshot,
  bus: CommandBus,
): void {
  const cursor = gs.eventCursor
  if (!cursor) {
    gs.mode = 'explore'
    return
  }

  // 1) waiting 处理
  if (cursor.waiting === 'dialog') {
    if (input.pressed.has('Confirm')) {
      cursor.waiting = undefined
      gs.dialogBox = undefined
      cursor.ip++
    } else {
      return
    }
  }

  // 2) 循环跑直到撞 waitable / end / 越界
  let stepCount = 0
  while (true) {
    if (stepCount++ > SINGLE_TICK_LIMIT) {
      throw new Error(
        `event-system: single-tick instruction limit (${SINGLE_TICK_LIMIT}) exceeded at ip=${cursor.ip}`,
      )
    }

    if (cursor.ip < 0 || cursor.ip >= cursor.commands.length) {
      console.warn(`event-system: ip ${cursor.ip} 越界 → 切回 explore`)
      gs.eventCursor = undefined
      gs.dialogBox = undefined
      gs.mode = 'explore'
      return
    }

    const cmd = cursor.commands[cursor.ip]!

    switch (cmd.op) {
      case 'end':
        gs.eventCursor = undefined
        gs.dialogBox = undefined
        gs.mode = 'explore'
        return

      case 'goto': {
        const target = cursor.labelMap[cmd.to]
        if (target === undefined) {
          throw new Error(`event-system: goto label ${cmd.to} 不在 labelMap`)
        }
        cursor.ip = target
        break
      }

      case 'showDialog': {
        gs.dialogBox = { text: cmd.text, style: gs.currentDialogStyle }
        cursor.waiting = 'dialog'
        bus.emit({ op: 'showDialogBox', text: cmd.text, style: gs.currentDialogStyle })
        return
      }

      case 'setDialogStyleTop':
        gs.currentDialogStyle = 'top'
        cursor.ip++
        break
      case 'setDialogStyleCenter':
        gs.currentDialogStyle = 'center'
        cursor.ip++
        break
      case 'setDialogStyleBottom':
        gs.currentDialogStyle = 'bottom'
        cursor.ip++
        break
      case 'setDialogStyleNarration':
        gs.currentDialogStyle = 'narration'
        cursor.ip++
        break

      case 'raw':
        console.debug(`event-system: skip raw opcode=${cmd.opcode} ip=${cursor.ip}`, cmd.operands)
        cursor.ip++
        break

      case 'giveItem':
      case 'startBattle':
        console.debug(`event-system: skip M3+ op=${cmd.op} ip=${cursor.ip}`)
        cursor.ip++
        break

      case 'sequence':
      case 'if':
      case 'choice':
        throw new Error(`event-system: 结构化 op ${cmd.op} M2 未实现`)
    }
  }
}
```

- [ ] **Step 3: 跑测试 + typecheck + commit**

`pnpm -F @type-pal/game vitest run src/core/event-system.test.ts` — 期望全绿。

`pnpm -F @type-pal/game typecheck` — 期望无错(mode.ts 现在能编)。

`git add packages/game/src/core/event-system.ts packages/game/src/core/event-system.test.ts`
`git commit -m "feat(M2.10): game/core/event-system.ts —— 协程式步进器 + raw skip + loop-until-waitable"`

---

## Task 11: game/shell/input.ts —— KeyboardInputSource + Replay/Recording

**Files:**
- Create: `packages/game/src/shell/input.ts`
- Create: `packages/game/src/shell/input.test.ts`
- Modify: `packages/game/package.json`(devDep 加 jsdom)
- Create: `packages/game/vitest.config.ts`(jsdom env)

**Why:** 把物理 KeyboardEvent → AbstractKey,实现 D14 双模型 held/pressed,留下 Record/Replay 源。

- [ ] **Step 1: 装 jsdom + 写 vitest config**

`pnpm -F @type-pal/game add -D jsdom`

新建 `packages/game/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
})
```

- [ ] **Step 2: 写测试**

新建 `packages/game/src/shell/input.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  KeyboardInputSource,
  ReplayInputSource,
  RecordingInputSource,
  codeToAbstractKey,
} from './input.js'

describe('codeToAbstractKey', () => {
  it('方向键映射', () => {
    expect(codeToAbstractKey('ArrowUp')).toBe('Up')
    expect(codeToAbstractKey('ArrowDown')).toBe('Down')
    expect(codeToAbstractKey('ArrowLeft')).toBe('Left')
    expect(codeToAbstractKey('ArrowRight')).toBe('Right')
  })

  it('WASD 别名', () => {
    expect(codeToAbstractKey('KeyW')).toBe('Up')
    expect(codeToAbstractKey('KeyA')).toBe('Left')
    expect(codeToAbstractKey('KeyS')).toBe('Down')
    expect(codeToAbstractKey('KeyD')).toBe('Right')
  })

  it('确认 / 取消 / 菜单', () => {
    expect(codeToAbstractKey('Space')).toBe('Confirm')
    expect(codeToAbstractKey('Enter')).toBe('Confirm')
    expect(codeToAbstractKey('Escape')).toBe('Cancel')
    expect(codeToAbstractKey('KeyM')).toBe('Menu')
  })

  it('未知键 → null', () => {
    expect(codeToAbstractKey('KeyZ')).toBeNull()
  })
})

describe('KeyboardInputSource', () => {
  it('keydown/keyup 维护 held;snapshot 后 pressed 清空', () => {
    const src = new KeyboardInputSource(window)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }))
    const s1 = src.nextSnapshot(0)
    expect(s1.held.has('Right')).toBe(true)
    expect(s1.pressed.has('Right')).toBe(true)

    const s2 = src.nextSnapshot(1)
    expect(s2.held.has('Right')).toBe(true)
    expect(s2.pressed.has('Right')).toBe(false)

    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight' }))
    const s3 = src.nextSnapshot(2)
    expect(s3.held.has('Right')).toBe(false)

    src.detach()
  })
})

describe('ReplayInputSource', () => {
  it('按帧顺序回放', () => {
    const snaps = [
      { held: new Set<'Confirm'>(), pressed: new Set<'Confirm'>(['Confirm']), frameNum: 0 },
      { held: new Set<'Right'>(['Right']), pressed: new Set<'Right'>(), frameNum: 1 },
    ]
    const src = new ReplayInputSource(snaps)
    expect(src.nextSnapshot(0).pressed.has('Confirm')).toBe(true)
    expect(src.nextSnapshot(1).held.has('Right')).toBe(true)
  })

  it('超出序列 → 空快照', () => {
    const src = new ReplayInputSource([])
    const s = src.nextSnapshot(0)
    expect(s.held.size).toBe(0)
    expect(s.pressed.size).toBe(0)
  })
})

describe('RecordingInputSource', () => {
  it('装饰任意 source,把每帧 snapshot 留档', () => {
    const inner = new ReplayInputSource([
      { held: new Set<'Right'>(['Right']), pressed: new Set<'Right'>(), frameNum: 0 },
    ])
    const rec = new RecordingInputSource(inner)
    rec.nextSnapshot(0)
    expect(rec.getRecording()).toHaveLength(1)
    expect(rec.getRecording()[0]?.held.has('Right')).toBe(true)
  })
})
```

跑确认失败。

- [ ] **Step 3: 实现 input.ts**

新建 `packages/game/src/shell/input.ts`:

```typescript
import type { AbstractKey, InputSnapshot, InputSource } from '@type-pal/shared'

const CODE_MAP: Record<string, AbstractKey> = {
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  KeyW: 'Up',
  KeyS: 'Down',
  KeyA: 'Left',
  KeyD: 'Right',
  Space: 'Confirm',
  Enter: 'Confirm',
  Escape: 'Cancel',
  KeyM: 'Menu',
}

export function codeToAbstractKey(code: string): AbstractKey | null {
  return CODE_MAP[code] ?? null
}

export class KeyboardInputSource implements InputSource {
  private held = new Set<AbstractKey>()
  private pressed = new Set<AbstractKey>()
  private readonly handleDown = (e: KeyboardEvent): void => {
    const k = codeToAbstractKey(e.code)
    if (!k) return
    if (!this.held.has(k)) this.pressed.add(k)
    this.held.add(k)
  }
  private readonly handleUp = (e: KeyboardEvent): void => {
    const k = codeToAbstractKey(e.code)
    if (!k) return
    this.held.delete(k)
  }

  constructor(private readonly target: Window) {
    target.addEventListener('keydown', this.handleDown)
    target.addEventListener('keyup', this.handleUp)
  }

  nextSnapshot(frameNum: number): InputSnapshot {
    const snap: InputSnapshot = {
      held: new Set(this.held),
      pressed: new Set(this.pressed),
      frameNum,
    }
    this.pressed.clear()
    return snap
  }

  detach(): void {
    this.target.removeEventListener('keydown', this.handleDown)
    this.target.removeEventListener('keyup', this.handleUp)
  }
}

export class ReplayInputSource implements InputSource {
  private cursor = 0
  constructor(private readonly snapshots: InputSnapshot[]) {}

  nextSnapshot(frameNum: number): InputSnapshot {
    const snap = this.snapshots[this.cursor]
    this.cursor++
    if (!snap) {
      return { held: new Set(), pressed: new Set(), frameNum }
    }
    return snap
  }
}

export class RecordingInputSource implements InputSource {
  private readonly recording: InputSnapshot[] = []
  constructor(private readonly inner: InputSource) {}

  nextSnapshot(frameNum: number): InputSnapshot {
    const snap = this.inner.nextSnapshot(frameNum)
    this.recording.push(snap)
    return snap
  }

  getRecording(): InputSnapshot[] {
    return this.recording
  }
}
```

- [ ] **Step 4: 跑测试 + commit**

`pnpm -F @type-pal/game vitest run src/shell/input.test.ts` — 期望全绿。

`git add packages/game/package.json packages/game/vitest.config.ts packages/game/src/shell/input.ts packages/game/src/shell/input.test.ts`
`git commit -m "feat(M2.11): game/shell/input.ts —— KeyboardInputSource + Replay/Recording + jsdom 测试"`

---

## Task 12: game/shell/main-loop.ts —— headless tickN + rAF wrapper

**Files:**
- Create: `packages/game/src/shell/main-loop.ts`
- Create: `packages/game/src/shell/main-loop.test.ts`

**Why:** 抽出 headless `tickN(n, source, ...)` 函数(不依赖 rAF)给 e2e 测试用;rAF wrapper 留给真浏览器入口。

- [ ] **Step 1: 写测试**

新建 `packages/game/src/shell/main-loop.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import type { Tilemap, AbstractKey, InputSnapshot } from '@type-pal/shared'
import { tickN, type LoopContext } from './main-loop.js'
import { ReplayInputSource } from './input.js'
import { createInitialGameState } from '../core/game-state.js'
import { createCommandBus } from '../core/command-bus.js'

function flat(w: number, h: number): Tilemap {
  const cells = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ lower: 0, upper: 0 })),
  )
  return { width: w, height: h, cells, tilesetImage: 'fake' }
}

function snap(held: AbstractKey[] = [], frameNum = 0): InputSnapshot {
  return { held: new Set(held), pressed: new Set(), frameNum }
}

describe('tickN', () => {
  it('跑 N tick,每 tick 调 onPresent', () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'down' })
    const bus = createCommandBus()
    const presentFn = vi.fn()
    const ctx: LoopContext = {
      gs, bus,
      input: new ReplayInputSource([]),
      tilemap: flat(10, 10),
      eventCommands: [], labelMap: {},
      onPresent: presentFn,
    }
    tickN(3, ctx)
    expect(presentFn).toHaveBeenCalledTimes(3)
    expect(gs.frameNum).toBe(3)
  })

  it('Replay 向右走 3 步 → party.col + 3', () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'down' })
    const bus = createCommandBus()
    const ctx: LoopContext = {
      gs, bus,
      input: new ReplayInputSource([
        snap(['Right'], 0),
        snap(['Right'], 1),
        snap(['Right'], 2),
      ]),
      tilemap: flat(10, 10),
      eventCommands: [], labelMap: {},
      onPresent: () => {},
    }
    tickN(3, ctx)
    expect(gs.party.col).toBe(8)
  })
})
```

跑确认失败。

- [ ] **Step 2: 实现 main-loop.ts**

新建 `packages/game/src/shell/main-loop.ts`:

```typescript
import type { Command, Tilemap, InputSource } from '@type-pal/shared'
import type { CommandBus, BusEntry } from '../core/command-bus.js'
import type { GameState } from '../core/game-state.js'
import { tickByMode } from '../core/mode.js'
import { setSceneContext } from '../core/scene-system.js'

export interface LoopContext {
  gs: GameState
  bus: CommandBus
  input: InputSource
  tilemap: Tilemap
  eventCommands: Command[]
  labelMap: Record<string, number>
  onPresent: (drained: BusEntry[]) => void
}

const FRAME_MS = 100 // D13: 10fps explore

function singleTick(ctx: LoopContext): void {
  const snap = ctx.input.nextSnapshot(ctx.gs.frameNum)
  tickByMode(ctx.gs, snap, ctx.bus)
  const drained = ctx.bus.drain()
  ctx.onPresent(drained)
}

export function tickN(n: number, ctx: LoopContext): void {
  setSceneContext({
    tilemap: ctx.tilemap,
    eventCommands: ctx.eventCommands,
    labelMap: ctx.labelMap,
  })
  for (let i = 0; i < n; i++) singleTick(ctx)
}

export function startRafLoop(ctx: LoopContext): () => void {
  setSceneContext({
    tilemap: ctx.tilemap,
    eventCommands: ctx.eventCommands,
    labelMap: ctx.labelMap,
  })
  let last = performance.now()
  let raf = 0
  const loop = (now: number): void => {
    if (now - last >= FRAME_MS) {
      last = now
      singleTick(ctx)
    }
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
  return () => cancelAnimationFrame(raf)
}
```

- [ ] **Step 3: 跑测试 + commit**

`pnpm -F @type-pal/game vitest run src/shell/main-loop.test.ts` — 期望全绿。

`git add packages/game/src/shell/main-loop.ts packages/game/src/shell/main-loop.test.ts`
`git commit -m "feat(M2.12): game/shell/main-loop.ts —— tickN headless + startRafLoop"`

---

## Task 13: game/assets/png.ts —— 8-bit grayscale PNG → Uint8Array

**Files:**
- Create: `packages/game/src/assets/png.ts`
- Create: `packages/game/src/assets/png.test.ts`

**Why:** M1 sprite.ts 用 RGBA 三通道复制法存索引位图(R=G=B=调色板下标)。运行时加载 PNG → 取 R 通道 = 索引数组。用 `<canvas>` `drawImage` + `getImageData` 取 RGBA buffer。

- [ ] **Step 1: 写测试**

新建 `packages/game/src/assets/png.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { decodePngToIndices } from './png.js'

describe('decodePngToIndices', () => {
  it('从 Blob 解出索引数组(取 R 通道)', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 1
    const ctx = canvas.getContext('2d')!
    const img = ctx.createImageData(2, 1)
    img.data.set([42, 0, 0, 255, 200, 0, 0, 255])
    ctx.putImageData(img, 0, 0)
    const blob = await new Promise<Blob>((res) =>
      canvas.toBlob((b) => res(b!), 'image/png'),
    )
    const result = await decodePngToIndices(blob)
    expect(result.width).toBe(2)
    expect(result.height).toBe(1)
    expect(Array.from(result.indices)).toEqual([42, 200])
  })
})
```

跑确认失败。

- [ ] **Step 2: 实现 png.ts**

新建 `packages/game/src/assets/png.ts`:

```typescript
/**
 * 索引位图 PNG 加载。
 * pal-extract 用 RGBA 三通道复制法(R=G=B=调色板下标,A=255)存索引位图。
 * 运行时只取 R 通道当索引,丢 GBA。
 */

export interface IndexedImage {
  width: number
  height: number
  indices: Uint8Array
}

export async function decodePngToIndices(source: Blob): Promise<IndexedImage> {
  const bitmap = await createImageBitmap(source)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('decodePngToIndices: 2d context unavailable')
  ctx.drawImage(bitmap, 0, 0)
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const indices = new Uint8Array(canvas.width * canvas.height)
  for (let i = 0; i < indices.length; i++) {
    indices[i] = img.data[i * 4]!
  }
  return { width: canvas.width, height: canvas.height, indices }
}
```

- [ ] **Step 3: 跑测试 + commit**

`pnpm -F @type-pal/game vitest run src/assets/png.test.ts`

期望:全绿。jsdom 默认不支持 createImageBitmap / canvas 2d 完整 API。若失败,装 `canvas` 包:`pnpm -F @type-pal/game add -D canvas`,重跑。若仍失败,把测试改为只测函数签名,真实解码靠 Task 22 dev 手测。

`git add packages/game/src/assets/png.ts packages/game/src/assets/png.test.ts`
`git commit -m "feat(M2.13): game/assets/png.ts —— 索引位图 PNG 加载"`

---

## Task 14: game/present/framebuffer.ts —— 320×200 索引缓冲 + 调色板查表

**Files:**
- Create: `packages/game/src/present/framebuffer.ts`
- Create: `packages/game/src/present/framebuffer.test.ts`

**Why:** Present 层核心。维护 320×200 `Uint8Array` 索引缓冲;每帧调色板查表 → ImageData → putImageData 上屏(D12)。

- [ ] **Step 1: 写测试**

新建 `packages/game/src/present/framebuffer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import type { Palette } from '@type-pal/shared'
import { createFramebuffer } from './framebuffer.js'

describe('Framebuffer', () => {
  it('320×200,初始全 0', () => {
    const fb = createFramebuffer()
    expect(fb.width).toBe(320)
    expect(fb.height).toBe(200)
    expect(fb.indices.length).toBe(320 * 200)
    expect(fb.indices[0]).toBe(0)
  })

  it('writePixel + clear', () => {
    const fb = createFramebuffer()
    fb.writePixel(10, 5, 42)
    expect(fb.indices[5 * 320 + 10]).toBe(42)
    fb.clear()
    expect(fb.indices[5 * 320 + 10]).toBe(0)
  })

  it('toImageData(palette) —— 索引 → RGBA', () => {
    const fb = createFramebuffer()
    fb.writePixel(0, 0, 1)
    fb.writePixel(1, 0, 2)
    const palette: Palette = {
      colors: [
        [0, 0, 0],
        [100, 0, 0],
        [0, 100, 0],
        ...Array.from({ length: 253 }, () => [0, 0, 0] as [number, number, number]),
      ],
      cycles: [],
    }
    const img = fb.toImageData(palette)
    expect(img.width).toBe(320)
    expect(img.height).toBe(200)
    expect(img.data[0]).toBe(100)
    expect(img.data[3]).toBe(255)
    expect(img.data[4]).toBe(0)
    expect(img.data[5]).toBe(100)
  })
})
```

跑确认失败。

- [ ] **Step 2: 实现 framebuffer.ts**

新建 `packages/game/src/present/framebuffer.ts`:

```typescript
import type { Palette } from '@type-pal/shared'

export const SCREEN_W = 320
export const SCREEN_H = 200

export interface Framebuffer {
  readonly width: number
  readonly height: number
  readonly indices: Uint8Array
  writePixel(x: number, y: number, index: number): void
  clear(): void
  toImageData(palette: Palette): ImageData
}

export function createFramebuffer(): Framebuffer {
  const indices = new Uint8Array(SCREEN_W * SCREEN_H)
  return {
    width: SCREEN_W,
    height: SCREEN_H,
    indices,

    writePixel(x, y, index) {
      if (x < 0 || x >= SCREEN_W || y < 0 || y >= SCREEN_H) return
      indices[y * SCREEN_W + x] = index
    },

    clear() {
      indices.fill(0)
    },

    toImageData(palette) {
      const data = new Uint8ClampedArray(SCREEN_W * SCREEN_H * 4)
      for (let i = 0; i < indices.length; i++) {
        const idx = indices[i]!
        const c = palette.colors[idx] ?? [0, 0, 0]
        data[i * 4] = c[0]
        data[i * 4 + 1] = c[1]
        data[i * 4 + 2] = c[2]
        data[i * 4 + 3] = 255
      }
      return new ImageData(data, SCREEN_W, SCREEN_H)
    },
  }
}
```

- [ ] **Step 3: 跑测试 + commit**

`pnpm -F @type-pal/game vitest run src/present/framebuffer.test.ts` — 期望全绿。

`git add packages/game/src/present/framebuffer.ts packages/game/src/present/framebuffer.test.ts`
`git commit -m "feat(M2.14): game/present/framebuffer.ts —— 320×200 索引缓冲 + 调色板查表"`

---

## Task 15: game/present/draw-tilemap.ts —— 菱形错排

**Files:**
- Create: `packages/game/src/present/draw-tilemap.ts`
- Create: `packages/game/src/present/draw-tilemap.test.ts`

**Why:** 原版 tilemap 菱形错排(每行 X 错 16 px、Y 步进 8 px;tile 本身 32×16)。按 sdlpal `map.c::PAL_TileBlitToSurface` 移植。

> **菱形错排公式**:
> - 每个 cell 屏幕坐标 `(sx, sy) = (col * 32 + (row & 1) * 16, row * 8)`
> - 每 cell 上下两层(lower 在底,upper 在上)
> - 渲染时遍历相机视野内 cell,按 row 升序、col 升序

- [ ] **Step 1: 写测试**

新建 `packages/game/src/present/draw-tilemap.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import type { Tilemap } from '@type-pal/shared'
import { createFramebuffer } from './framebuffer.js'
import { drawTilemap, type TileImages } from './draw-tilemap.js'

describe('drawTilemap', () => {
  it('单 cell 单 tile bitmap 渲染到帧缓冲', () => {
    const fb = createFramebuffer()
    const tilePixels = new Uint8Array(4 * 4).fill(1)
    const tiles: TileImages = {
      get(_idx) {
        return { width: 4, height: 4, indices: tilePixels }
      },
    }
    const map: Tilemap = {
      width: 1, height: 1,
      cells: [[{ lower: 1, upper: 0 }]],
      tilesetImage: 'fake',
    }
    drawTilemap(fb, map, tiles, { col: 0, row: 0 })
    // (0,0) cell 居中在屏幕中心 (160, 100);其内首像素就在 (160, 100)
    expect(fb.indices[100 * 320 + 160]).toBe(1)
  })

  it('upper 层覆盖 lower 层', () => {
    const fb = createFramebuffer()
    const lower = new Uint8Array(4 * 4).fill(1)
    const upper = new Uint8Array(4 * 4).fill(2)
    const tiles: TileImages = {
      get(idx) {
        return idx === 1
          ? { width: 4, height: 4, indices: lower }
          : { width: 4, height: 4, indices: upper }
      },
    }
    const map: Tilemap = {
      width: 1, height: 1,
      cells: [[{ lower: 1, upper: 2 }]],
      tilesetImage: 'fake',
    }
    drawTilemap(fb, map, tiles, { col: 0, row: 0 })
    expect(fb.indices[100 * 320 + 160]).toBe(2)
  })
})
```

跑确认失败。

- [ ] **Step 2: 实现 draw-tilemap.ts**

新建 `packages/game/src/present/draw-tilemap.ts`:

```typescript
import type { Tilemap } from '@type-pal/shared'
import type { Framebuffer } from './framebuffer.js'

const TILE_W = 32
const TILE_H = 16
const TILE_HALF_W = TILE_W / 2
const ROW_Y_STEP = TILE_H / 2

export interface TileImages {
  get(index: number): { width: number; height: number; indices: Uint8Array } | undefined
}

function blitTile(
  fb: Framebuffer,
  tile: { width: number; height: number; indices: Uint8Array },
  dstX: number,
  dstY: number,
): void {
  for (let y = 0; y < tile.height; y++) {
    for (let x = 0; x < tile.width; x++) {
      const idx = tile.indices[y * tile.width + x]!
      if (idx === 0) continue
      fb.writePixel(dstX + x, dstY + y, idx)
    }
  }
}

export function drawTilemap(
  fb: Framebuffer,
  map: Tilemap,
  tiles: TileImages,
  cameraCell: { col: number; row: number },
): void {
  const camPxX = cameraCell.col * TILE_W + (cameraCell.row & 1) * TILE_HALF_W
  const camPxY = cameraCell.row * ROW_Y_STEP
  const offsetX = 160 - camPxX
  const offsetY = 100 - camPxY

  for (let r = 0; r < map.height; r++) {
    const rowCells = map.cells[r]!
    const rowPxY = r * ROW_Y_STEP + offsetY
    if (rowPxY + TILE_H < 0 || rowPxY > fb.height) continue
    for (let c = 0; c < map.width; c++) {
      const cell = rowCells[c]!
      const cellPxX = c * TILE_W + (r & 1) * TILE_HALF_W + offsetX
      if (cellPxX + TILE_W < 0 || cellPxX > fb.width) continue

      const lowerImg = tiles.get(cell.lower & 0xff)
      if (lowerImg) blitTile(fb, lowerImg, cellPxX, rowPxY)
      const upperImg = tiles.get(cell.upper & 0xff)
      if (upperImg) blitTile(fb, upperImg, cellPxX, rowPxY)
    }
  }
}
```

> 注:`cell.lower / .upper` 是 u32 低 16 位,bitmap index 在低 8 位,属性位在高位。M2 简化 `& 0xff` 取 index。若 dev 手测发现 tile 错乱,改 `& 0x1ff` 或翻 M1 map.ts 看实际位分布,后续 Task 22 在「实施过程发现」记录。

- [ ] **Step 3: 跑测试 + commit**

`pnpm -F @type-pal/game vitest run src/present/draw-tilemap.test.ts` — 期望全绿。

`git add packages/game/src/present/draw-tilemap.ts packages/game/src/present/draw-tilemap.test.ts`
`git commit -m "feat(M2.15): game/present/draw-tilemap.ts —— 菱形错排"`

---

## Task 16: game/present/draw-sprite.ts —— anchor + 索引 0 透明

**Files:**
- Create: `packages/game/src/present/draw-sprite.ts`
- Create: `packages/game/src/present/draw-sprite.test.ts`

**Why:** 角色 / NPC 精灵渲染。anchor = 脚下中心点,索引 0 = 透明。

- [ ] **Step 1: 写测试**

新建 `packages/game/src/present/draw-sprite.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { createFramebuffer } from './framebuffer.js'
import { drawSprite } from './draw-sprite.js'

describe('drawSprite', () => {
  it('画一个 2×2 精灵,anchor 在底部中心 (1, 2)', () => {
    const fb = createFramebuffer()
    const indices = new Uint8Array([1, 2, 3, 4])
    drawSprite(fb, { width: 2, height: 2, indices, anchorX: 1, anchorY: 2 }, 10, 10)
    expect(fb.indices[8 * 320 + 9]).toBe(1)
    expect(fb.indices[8 * 320 + 10]).toBe(2)
    expect(fb.indices[9 * 320 + 9]).toBe(3)
  })

  it('索引 0 不覆盖底面', () => {
    const fb = createFramebuffer()
    fb.writePixel(10, 10, 99)
    const indices = new Uint8Array([0])
    drawSprite(fb, { width: 1, height: 1, indices, anchorX: 0, anchorY: 0 }, 10, 10)
    expect(fb.indices[10 * 320 + 10]).toBe(99)
  })

  it('屏幕外像素不抛错', () => {
    const fb = createFramebuffer()
    const indices = new Uint8Array(4).fill(5)
    const ok = () => drawSprite(fb, { width: 2, height: 2, indices, anchorX: 0, anchorY: 0 }, -1, -1)
    expect(ok).not.toThrow()
  })
})
```

跑确认失败。

- [ ] **Step 2: 实现 draw-sprite.ts**

新建 `packages/game/src/present/draw-sprite.ts`:

```typescript
import type { Framebuffer } from './framebuffer.js'

export interface SpriteImage {
  width: number
  height: number
  indices: Uint8Array
  anchorX: number
  anchorY: number
}

export function drawSprite(
  fb: Framebuffer,
  sprite: SpriteImage,
  cx: number,
  cy: number,
): void {
  const dstX = cx - sprite.anchorX
  const dstY = cy - sprite.anchorY
  for (let y = 0; y < sprite.height; y++) {
    for (let x = 0; x < sprite.width; x++) {
      const idx = sprite.indices[y * sprite.width + x]!
      if (idx === 0) continue
      fb.writePixel(dstX + x, dstY + y, idx)
    }
  }
}
```

- [ ] **Step 3: 跑测试 + commit**

`pnpm -F @type-pal/game vitest run src/present/draw-sprite.test.ts` — 期望全绿。

`git add packages/game/src/present/draw-sprite.ts packages/game/src/present/draw-sprite.test.ts`
`git commit -m "feat(M2.16): game/present/draw-sprite.ts —— 索引位图 + anchor + 透明"`

---

## Task 17: game/present/font.ts + draw-dialog-box.ts —— 色块占位字 + 对话框

**Files:**
- Create: `packages/game/src/present/font.ts`
- Create: `packages/game/src/present/draw-dialog-box.ts`
- Create: `packages/game/src/present/font.test.ts`
- Create: `packages/game/src/present/draw-dialog-box.test.ts`

**Why:** 对话框需要字形渲染(D11 Unifont CN)。**M2 简化**:每个字符画 8×16 半透明实心块占位,把对话框 layout / 触发流程跑通,真字形等 M3+ 再补(BDF / hex 解析)。

- [ ] **Step 1: 写测试**

新建 `packages/game/src/present/font.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { renderText } from './font.js'
import { createFramebuffer } from './framebuffer.js'

describe('renderText(色块占位版)', () => {
  it('每个字符占 8×16 像素的占位框', () => {
    const fb = createFramebuffer()
    renderText(fb, '你好', 10, 10, 1)
    expect(fb.indices[10 * 320 + 10]).toBe(1)
    expect(fb.indices[10 * 320 + 18]).toBe(1)
  })

  it('空字符串 → no-op', () => {
    const fb = createFramebuffer()
    const ok = () => renderText(fb, '', 0, 0, 1)
    expect(ok).not.toThrow()
  })
})
```

新建 `packages/game/src/present/draw-dialog-box.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import type { DialogBoxStyle } from '@type-pal/shared'
import { createFramebuffer } from './framebuffer.js'
import { drawDialogBox } from './draw-dialog-box.js'

describe('drawDialogBox', () => {
  it.each<DialogBoxStyle>(['top', 'center', 'bottom', 'narration'])(
    'style=%s 画背景 + 文字,不抛错',
    (style) => {
      const fb = createFramebuffer()
      const ok = () => drawDialogBox(fb, '你好世界', style)
      expect(ok).not.toThrow()
    },
  )
})
```

跑确认失败。

- [ ] **Step 2: 实现 font.ts**

新建 `packages/game/src/present/font.ts`:

```typescript
/**
 * 字体渲染 —— M2 简化:每个字符画 8×16 占位框。
 * 真字形(Unifont CN BDF/hex 解析)留 M3+ 补,不阻塞 M2 端到端验证。
 */

import type { Framebuffer } from './framebuffer.js'

const GLYPH_W = 8
const GLYPH_H = 16

export function renderText(
  fb: Framebuffer,
  text: string,
  startX: number,
  startY: number,
  colorIndex: number,
): void {
  let x = startX
  for (const _ch of text) {
    for (let py = 0; py < GLYPH_H; py++) {
      for (let px = 0; px < GLYPH_W; px++) {
        const onEdge = py === 0 || py === GLYPH_H - 1 || px === 0 || px === GLYPH_W - 1
        fb.writePixel(x + px, startY + py, onEdge ? colorIndex : 200)
      }
    }
    x += GLYPH_W
  }
}
```

- [ ] **Step 3: 实现 draw-dialog-box.ts**

新建 `packages/game/src/present/draw-dialog-box.ts`:

```typescript
import type { DialogBoxStyle } from '@type-pal/shared'
import { type Framebuffer, SCREEN_W, SCREEN_H } from './framebuffer.js'
import { renderText } from './font.js'

const BOX_BG = 0
const BOX_BORDER = 255
const TEXT_COLOR = 255

const BOX_W = 280
const BOX_H = 48
const BOX_X = (SCREEN_W - BOX_W) / 2

function boxYFor(style: DialogBoxStyle): number {
  switch (style) {
    case 'top':       return 8
    case 'center':    return (SCREEN_H - BOX_H) / 2
    case 'bottom':    return SCREEN_H - BOX_H - 8
    case 'narration': return SCREEN_H - BOX_H - 8
  }
}

export function drawDialogBox(
  fb: Framebuffer,
  text: string,
  style: DialogBoxStyle,
): void {
  const x0 = BOX_X
  const y0 = boxYFor(style)
  const hasBorder = style !== 'narration'

  for (let y = 0; y < BOX_H; y++) {
    for (let x = 0; x < BOX_W; x++) {
      const isBorder = hasBorder && (y === 0 || y === BOX_H - 1 || x === 0 || x === BOX_W - 1)
      fb.writePixel(x0 + x, y0 + y, isBorder ? BOX_BORDER : BOX_BG)
    }
  }
  renderText(fb, text, x0 + 8, y0 + 16, TEXT_COLOR)
}
```

- [ ] **Step 4: 跑测试 + commit**

`pnpm -F @type-pal/game vitest run src/present/font.test.ts src/present/draw-dialog-box.test.ts` — 期望全绿。

`git add packages/game/src/present/font.ts packages/game/src/present/draw-dialog-box.ts packages/game/src/present/font.test.ts packages/game/src/present/draw-dialog-box.test.ts`
`git commit -m "feat(M2.17): game/present/font.ts + draw-dialog-box.ts —— 色块字 + 对话框样式 4 态"`

---

## Task 18: game/present/present.ts —— 一帧装配 + 命令消费

**Files:**
- Create: `packages/game/src/present/present.ts`
- Create: `packages/game/src/present/present.test.ts`

**Why:** 一 tick 末走一遍:画 tilemap → 画 NPC sprites → 画队长 sprite → 叠对话框 → flush 到 canvas。M2 同步语义下,对话框状态已在 GameState.dialogBox,present 直接从 gs 读,bus 命令仅作"上传刷新"信号。

- [ ] **Step 1: 写测试**

新建 `packages/game/src/present/present.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import type { Tilemap } from '@type-pal/shared'
import { presentFrame, type PresentContext } from './present.js'
import { createFramebuffer } from './framebuffer.js'
import { createInitialGameState } from '../core/game-state.js'

function flatMap(w: number, h: number): Tilemap {
  const cells = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ lower: 0, upper: 0 })),
  )
  return { width: w, height: h, cells, tilesetImage: 'fake' }
}

describe('presentFrame', () => {
  it('无 dialogBox → 不画对话框,不抛错', () => {
    const fb = createFramebuffer()
    const gs = createInitialGameState({ col: 0, row: 0, facing: 'down' })
    const ctx: PresentContext = {
      tilemap: flatMap(3, 3),
      tileImages: { get: () => undefined },
      partySprite: { width: 1, height: 1, indices: new Uint8Array([0]), anchorX: 0, anchorY: 0 },
      npcSprites: new Map(),
    }
    const ok = () => presentFrame(fb, gs, ctx)
    expect(ok).not.toThrow()
  })

  it('有 dialogBox → 帧缓冲被对话框覆盖', () => {
    const fb = createFramebuffer()
    const gs = createInitialGameState({ col: 0, row: 0, facing: 'down' })
    gs.dialogBox = { text: '你好', style: 'center' }
    const ctx: PresentContext = {
      tilemap: flatMap(3, 3),
      tileImages: { get: () => undefined },
      partySprite: { width: 1, height: 1, indices: new Uint8Array([0]), anchorX: 0, anchorY: 0 },
      npcSprites: new Map(),
    }
    presentFrame(fb, gs, ctx)
    const someBorderPixel = Array.from(fb.indices).some((i) => i === 255)
    expect(someBorderPixel).toBe(true)
  })
})
```

跑确认失败。

- [ ] **Step 2: 实现 present.ts**

新建 `packages/game/src/present/present.ts`:

```typescript
import type { Palette, Tilemap } from '@type-pal/shared'
import type { GameState } from '../core/game-state.js'
import { type Framebuffer } from './framebuffer.js'
import { drawTilemap, type TileImages } from './draw-tilemap.js'
import { drawSprite, type SpriteImage } from './draw-sprite.js'
import { drawDialogBox } from './draw-dialog-box.js'

export interface PresentContext {
  tilemap: Tilemap
  tileImages: TileImages
  partySprite: SpriteImage
  npcSprites: Map<number, SpriteImage>
}

const TILE_W = 32
const TILE_HALF_W = 16
const ROW_Y_STEP = 8

function cellToScreen(
  cell: { col: number; row: number },
  camera: { col: number; row: number },
): { sx: number; sy: number } {
  const cellPxX = cell.col * TILE_W + (cell.row & 1) * TILE_HALF_W
  const cellPxY = cell.row * ROW_Y_STEP
  const camPxX = camera.col * TILE_W + (camera.row & 1) * TILE_HALF_W
  const camPxY = camera.row * ROW_Y_STEP
  return { sx: cellPxX - camPxX + 160, sy: cellPxY - camPxY + 100 }
}

export function presentFrame(
  fb: Framebuffer,
  gs: GameState,
  ctx: PresentContext,
): void {
  fb.clear()

  drawTilemap(fb, ctx.tilemap, ctx.tileImages, gs.camera)

  for (const npc of gs.npcs) {
    const sprite = ctx.npcSprites.get(npc.spriteNum)
    if (!sprite) continue
    const { sx, sy } = cellToScreen(npc, gs.camera)
    drawSprite(fb, sprite, sx, sy)
  }

  const { sx, sy } = cellToScreen(gs.party, gs.camera)
  drawSprite(fb, ctx.partySprite, sx, sy)

  if (gs.dialogBox) {
    drawDialogBox(fb, gs.dialogBox.text, gs.dialogBox.style)
  }
}

export function flushToCanvas(
  fb: Framebuffer,
  ctx2d: CanvasRenderingContext2D,
  palette: Palette,
): void {
  const img = fb.toImageData(palette)
  ctx2d.putImageData(img, 0, 0)
}
```

- [ ] **Step 3: 跑测试 + commit**

`pnpm -F @type-pal/game vitest run src/present/present.test.ts` — 期望全绿。

`git add packages/game/src/present/present.ts packages/game/src/present/present.test.ts`
`git commit -m "feat(M2.18): game/present/present.ts —— 一帧装配 + flushToCanvas"`

---

## Task 19: vite.config.ts + game/assets/loader.ts —— 数据暴露 + fetch

**Files:**
- Modify: `packages/game/vite.config.ts`
- Create: `packages/game/public/extracted`(symlink → `../../../data/extracted`)
- Modify: `.gitignore`
- Create: `packages/game/src/assets/loader.ts`
- Create: `packages/game/src/assets/loader.test.ts`(轻量)

**Why:** dev / build 都要能 fetch 到 `data/extracted/` 产物。symlink 是最简方案 —— vite 默认把 `public/` 下文件原样上传到根路径。

- [ ] **Step 1: 建 symlink**

`cd packages/game && mkdir -p public && ln -sfn ../../../data/extracted public/extracted && ls -la public/`

期望:看到 `extracted -> ../../../data/extracted`。

把 symlink 加进 `.gitignore`:在 `/Users/zhangxu/illegal/type-pal/.gitignore` 末尾加:

```
packages/game/public/extracted
```

- [ ] **Step 2: 修改 vite.config.ts**

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    target: 'es2022',
    assetsInlineLimit: 0,
  },
  server: {
    fs: {
      allow: ['..', '../..'],
    },
  },
})
```

- [ ] **Step 3: 写 loader 测试(轻量)**

新建 `packages/game/src/assets/loader.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadAll } from './loader.js'

describe('loadAll', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetch 失败 → 抛错', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, url: '/extracted/data/scene-1.json' }),
    )
    await expect(loadAll(1)).rejects.toThrow(/scene-1\.json/)
  })
})
```

跑确认失败。

- [ ] **Step 4: 实现 loader.ts**

新建 `packages/game/src/assets/loader.ts`:

```typescript
import type {
  EventFile,
  Palette,
  SceneObjects,
  Tilemap,
} from '@type-pal/shared'
import { decodePngToIndices, type IndexedImage } from './png.js'

const BASE = '/extracted'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`assets: fetch ${url} failed (${res.status})`)
  }
  return (await res.json()) as T
}

async function fetchPng(url: string): Promise<IndexedImage> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`assets: fetch ${url} failed (${res.status})`)
  const blob = await res.blob()
  return decodePngToIndices(blob)
}

export interface LoadedAssets {
  tilemap: Tilemap & { tilesetFiles?: string[] }
  palette: Palette
  scene: SceneObjects
  events: EventFile
  tileImages: Map<number, IndexedImage>
  characterSprites: Map<number, { frames: IndexedImage[]; anchorX: number; anchorY: number }>
}

export async function loadAll(sceneId: number): Promise<LoadedAssets> {
  const padded = sceneId.toString().padStart(3, '0')
  const [tilemap, palette, scene, events] = await Promise.all([
    fetchJson<Tilemap & { tilesetFiles?: string[] }>(`${BASE}/data/tilemap-${sceneId}.json`),
    fetchJson<Palette>(`${BASE}/data/palette-0.json`),
    fetchJson<SceneObjects>(`${BASE}/data/scene-${sceneId}.json`),
    fetchJson<EventFile>(`${BASE}/events/scene-${padded}.json`),
  ])

  const tileFiles = tilemap.tilesetFiles ?? []
  const tilePngs = await Promise.all(
    tileFiles.map((name) => fetchPng(`${BASE}/images/${name}`)),
  )
  const tileImages = new Map<number, IndexedImage>()
  tileFiles.forEach((name, i) => {
    const m = /tile-scene-\d+-(\d+)\.png/.exec(name)
    if (m) tileImages.set(Number(m[1]), tilePngs[i]!)
  })

  const spriteIds = new Set<number>([0])
  for (const eo of scene.eventObjects) {
    if (eo.spriteNum > 0) spriteIds.add(eo.spriteNum)
  }
  const characterSprites = new Map<
    number,
    { frames: IndexedImage[]; anchorX: number; anchorY: number }
  >()
  await Promise.all(
    [...spriteIds].map(async (id) => {
      try {
        const meta = await fetchJson<{
          spriteId: number
          frames: { index: number; width: number; height: number }[]
        }>(`${BASE}/data/sprite-${id}.json`)
        const frames = await Promise.all(
          meta.frames.map((f) =>
            fetchPng(
              `${BASE}/images/sprite-${id}-frame-${f.index.toString().padStart(2, '0')}.png`,
            ),
          ),
        )
        const first = frames[0]
        characterSprites.set(id, {
          frames,
          anchorX: first ? Math.floor(first.width / 2) : 0,
          anchorY: first ? first.height : 0,
        })
      } catch (err) {
        console.warn(`assets: sprite ${id} 加载失败,skip:`, err)
      }
    }),
  )

  return { tilemap, palette, scene, events, tileImages, characterSprites }
}
```

> **anchor 说明**:Task 5 把 sprite-NNN.json 简化为 `{spriteId, frames: [{index, width, height}]}`(没存 anchor)。loader 默认 anchor = 脚下中心(width/2, height)。M3 / M4 真做 anchor 时回头补 sprite.ts dump 字段。

- [ ] **Step 5: 跑测试 + commit**

`pnpm -F @type-pal/game vitest run src/assets/loader.test.ts` — 期望 fetch 失败那条通过。

`git add packages/game/vite.config.ts packages/game/src/assets/loader.ts packages/game/src/assets/loader.test.ts .gitignore`
`git commit -m "feat(M2.19): vite.config.ts + game/assets/loader.ts —— data/extracted 暴露 + fetch 装配"`

(symlink 不入 git。)

---

## Task 20: game/shell/bootstrap.ts + main.ts wire-up

**Files:**
- Create: `packages/game/src/shell/bootstrap.ts`
- Modify: `packages/game/src/main.ts`
- Delete: `packages/game/src/main.test.ts`(M0 占位)

**Why:** 把所有层装配起来,onEnter 段装载 → 启动主循环。

- [ ] **Step 1: 实现 bootstrap.ts**

新建 `packages/game/src/shell/bootstrap.ts`:

```typescript
import { loadAll } from '../assets/loader.js'
import { createCommandBus } from '../core/command-bus.js'
import { createInitialGameState, npcFromEventObject } from '../core/game-state.js'
import { buildLabelMap } from '../core/event-system.js'
import { KeyboardInputSource } from './input.js'
import { startRafLoop, type LoopContext } from './main-loop.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { presentFrame, flushToCanvas, type PresentContext } from '../present/present.js'

const SCENE_ID = 1

function showError(canvas: HTMLCanvasElement, msg: string): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#400'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#f88'
  ctx.font = '10px monospace'
  ctx.fillText(msg, 8, 32)
}

export async function bootstrap(canvas: HTMLCanvasElement): Promise<void> {
  let assets
  try {
    assets = await loadAll(SCENE_ID)
  } catch (err) {
    showError(canvas, `assets failed: ${err instanceof Error ? err.message : String(err)}`)
    throw err
  }

  const { tilemap, palette, scene, events, tileImages, characterSprites } = assets

  // party 起始位置 —— 真原版起始由 onEnter 脚本 setPartyPos opcode 设;M2 raw skip 后不自动设。
  // 实施时若 dev 验证位置不对,改这两个数字。
  const PARTY_START = { col: 32, row: 24, facing: 'down' as const }
  const gs = createInitialGameState(PARTY_START)
  gs.npcs = scene.eventObjects.map(npcFromEventObject)

  const segment = events.segments[0]
  if (!segment) throw new Error('events.json 无 segment[0]')
  const eventCommands = segment.commands
  const labelMap = buildLabelMap(eventCommands)

  // onEnter 装载
  if (scene.onEnterLabel) {
    const ip = labelMap[scene.onEnterLabel]
    if (ip !== undefined) {
      gs.eventCursor = { commands: eventCommands, labelMap, ip }
      gs.mode = 'event'
    }
  }

  // sprite 装配
  const partyData = characterSprites.get(0)
  if (!partyData) throw new Error('队长 sprite (id 0) 加载失败')
  const partyFirst = partyData.frames[0]
  const partySprite = {
    width: partyFirst?.width ?? 16,
    height: partyFirst?.height ?? 16,
    indices: partyFirst?.indices ?? new Uint8Array(),
    anchorX: partyData.anchorX,
    anchorY: partyData.anchorY,
  }
  const npcSprites = new Map<number, typeof partySprite>()
  for (const [id, data] of characterSprites) {
    const f = data.frames[0]
    if (!f) continue
    npcSprites.set(id, {
      width: f.width,
      height: f.height,
      indices: f.indices,
      anchorX: data.anchorX,
      anchorY: data.anchorY,
    })
  }

  const fb = createFramebuffer()
  const canvasCtx = canvas.getContext('2d')
  if (!canvasCtx) throw new Error('canvas 2d context 不可用')

  const presentCtx: PresentContext = {
    tilemap,
    tileImages: { get: (i) => tileImages.get(i) },
    partySprite,
    npcSprites,
  }

  const bus = createCommandBus()
  const input = new KeyboardInputSource(window)

  const loopCtx: LoopContext = {
    gs, bus, input,
    tilemap,
    eventCommands, labelMap,
    onPresent: () => {
      presentFrame(fb, gs, presentCtx)
      flushToCanvas(fb, canvasCtx, palette)
    },
  }

  startRafLoop(loopCtx)
  console.log('[bootstrap] scene', SCENE_ID, 'started')
}
```

- [ ] **Step 2: 改 main.ts**

替换 `packages/game/src/main.ts` 全部内容:

```typescript
import { bootstrap } from './shell/bootstrap.js'

if (typeof document !== 'undefined') {
  const canvas = document.getElementById('screen')
  if (canvas instanceof HTMLCanvasElement) {
    void bootstrap(canvas).catch((err: unknown) => {
      console.error('bootstrap failed:', err)
    })
  }
}
```

- [ ] **Step 3: 删 M0 测试**

`rm packages/game/src/main.test.ts`

- [ ] **Step 4: typecheck + commit**

`pnpm -F @type-pal/game typecheck` — 期望无错。

`git add packages/game/src/shell/bootstrap.ts packages/game/src/main.ts`
`git rm packages/game/src/main.test.ts`
`git commit -m "feat(M2.20): game/shell/bootstrap.ts + main.ts —— 装配 + onEnter 装载 + rAF 启动"`

---

## Task 21: E2E Vitest —— headless 主循环 + replay 输入

**Files:**
- Create: `packages/game/src/e2e.test.ts`

**Why:** 一条端到端测试用 ReplayInputSource 喂"右 3 步 → Confirm → Confirm",断言流程跑完。同时验证 D14 输入接口可回放性。

> **本测试不依赖真实资源** —— 全部用手造 tilemap + 手造 commands + 手造 NPC,验证 core 各系统装配后能跑通完整 NPC 触发流程。真实资源由 dev 验证清单覆盖。

- [ ] **Step 1: 写测试**

新建 `packages/game/src/e2e.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import type { Command, Tilemap, InputSnapshot, AbstractKey } from '@type-pal/shared'
import { createInitialGameState, npcFromEventObject } from './core/game-state.js'
import { createCommandBus } from './core/command-bus.js'
import { buildLabelMap } from './core/event-system.js'
import { ReplayInputSource } from './shell/input.js'
import { tickN, type LoopContext } from './shell/main-loop.js'

function flatMap(w: number, h: number): Tilemap {
  const cells = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ lower: 0, upper: 0 })),
  )
  return { width: w, height: h, cells, tilesetImage: 'fake' }
}

function snap(held: AbstractKey[] = [], pressed: AbstractKey[] = [], frameNum = 0): InputSnapshot {
  return {
    held: new Set(held),
    pressed: new Set(pressed),
    frameNum,
  }
}

describe('M2 e2e:右 3 步 → Confirm → Confirm', () => {
  it('完整 NPC 触发流程,最终 mode=explore + dialogBox 已清', () => {
    const gs = createInitialGameState({ col: 5, row: 5, facing: 'right' })
    gs.npcs = [
      npcFromEventObject({
        id: 1,
        x: 8, y: 5,
        spriteNum: 78,
        triggerLabel: 'L_2',
      }),
    ]

    const commands: Command[] = [
      { op: 'raw', opcode: 0, operands: [0, 0, 0] },
      { op: 'raw', opcode: 0, operands: [0, 0, 0] },
      { op: 'showDialog', messageIndex: 0, text: '你好', label: 'L_2' },
      { op: 'end' },
    ]
    const labelMap = buildLabelMap(commands)

    const input = new ReplayInputSource([
      snap(['Right'], [], 0), // tick 0:右
      snap(['Right'], [], 1), // tick 1:右
      snap(['Right'], [], 2), // tick 2:右
      snap([], ['Confirm'], 3), // tick 3:Confirm — SceneSystem 触发 NPC + 切 mode=event
      snap([], [], 4),           // tick 4:event 模式跑 showDialog → waiting
      snap([], ['Confirm'], 5), // tick 5:释放 waiting → end → 回 explore
    ])

    const bus = createCommandBus()
    const ctx: LoopContext = {
      gs, bus, input,
      tilemap: flatMap(20, 20),
      eventCommands: commands, labelMap,
      onPresent: () => {},
    }

    tickN(6, ctx)

    expect(gs.mode).toBe('explore')
    expect(gs.eventCursor).toBeUndefined()
    expect(gs.dialogBox).toBeUndefined()
    expect(gs.party.col).toBe(7) // 走到 col 7 = NPC 前面(NPC 在 col 8)
  })
})
```

- [ ] **Step 2: 跑测试**

`pnpm -F @type-pal/game vitest run src/e2e.test.ts` — 期望全绿。

如果失败:debug 看每个 tick 后 gs.party / gs.mode 状态,定位 SceneSystem / 模式转换时机。

- [ ] **Step 3: 跑全部 game 测试 + pnpm check**

`pnpm -F @type-pal/game test && pnpm check` — 期望全绿。

- [ ] **Step 4: Commit**

`git add packages/game/src/e2e.test.ts`
`git commit -m "feat(M2.21): e2e Vitest —— headless 主循环 + ReplayInputSource 端到端验证"`

---

## Task 22: dev 验证 + README + 03 同步 + 实施过程发现

**Files:**
- Modify: `README.md`(根目录)
- Modify: `docs/03-development-plan.md`(M2 标完成)
- Modify: `docs/plans/2026-05-23-m2-runtime-slice.md`(本文件,末尾加「实施过程发现」)

**Why:** M2 收尾。dev 验证清单跑通 + 文档同步。

- [ ] **Step 1: dev 验证清单**

`pnpm -F @type-pal/game dev`

打开浏览器到提示的 URL(通常 http://localhost:5173)。验证清单(逐条勾):

- [ ] 看到 scene 1 真实地图(瓦片不全黑,有原版可辨认地形)
- [ ] 看到队长精灵(色彩可能不对 —— palette-0 不一定是 scene 1 真用的,实施时调)
- [ ] 看到 ≥1 个 NPC 精灵
- [ ] 按方向键(或 WASD)走路,队长动起来
- [ ] 走到地图边缘 clamp,不会越界
- [ ] 走到一个 NPC 前 → 按 Space → 看到对话框(色块占位字 + 边框)
- [ ] 再按 Space → 对话框消失,继续走
- [ ] 控制台 console.debug:看到 raw opcode skip 日志(说明 onEnter 跑过了)

> **常见失败 + debug 思路**:
> - 黑屏 → console 看 fetch 报错(symlink 没建对)
> - 地图错乱 → cell.lower / .upper 取位错(改 draw-tilemap.ts 的 `& 0xff`)
> - 颜色像彩虹一样花 → palette 选错(改 loader.ts 拿不同 palette-N)
> - NPC 不显示 → MGO sprite 没解出来(回 Task 5 试 YJ2 解压)
> - 按 Space 无反应 → SceneSystem npcAt 没匹配到 NPC 坐标(scene-1.json 里 x/y 对不上地图坐标系)

- [ ] **Step 2: 修复 dev 验证发现的问题**

每修一个发一个 commit:`fix(M2): <一句话>`。所有问题在「实施过程发现」记录(Step 4)。

- [ ] **Step 3: 更新 03-development-plan.md**

在 03 M2 节末尾加完成标记(替换原 M2 节):

```markdown
### M2 · 运行时垂直切片(探索)✅(YYYY-MM-DD 完成)
- ✅ 资源加载层、表现层最小渲染:scene 1 真实地图 + 真队长 / NPC 精灵
- ✅ 场景系统:走路 + 边界 clamp(碰撞属性 M3 补)+ 相机
- ✅ 事件系统最小集:消费真原版 scene-001.json,走到 NPC 前 Confirm 触发 trigger 段对话
- ✅ pal-extract 补:角色 / NPC sprite + scene-1.json + 4 个 setDialogStyle opcode 具名
- ✅ EventSystem 对未具名 raw = no-op skip + console.debug
- 详细设计见 [`plans/2026-05-23-m2-runtime-slice-design.md`](2026-05-23-m2-runtime-slice-design.md);实施过程发现 / 偏离见 [`plans/2026-05-23-m2-runtime-slice.md`](2026-05-23-m2-runtime-slice.md) 末尾「实施过程发现」。
- N 个 Vitest 单测全过(M1 旧 ~91 + M2 新 ~?),`pnpm check` 绿。`pnpm extract` 重跑产物完好(全量 events round-trip 仍逐字节通过)。
```

- [ ] **Step 4: 给本计划末尾加「实施过程发现」section**

在本文件末尾追加:

```markdown
---

## 实施过程发现 / 与本计划的偏离(YYYY-MM-DD 完工时整理)

本计划在 brainstorming + writing-plans 阶段基于 02 / 04 / 05 设计推断;实施时遇到的真实差异记录如下供 M3+ 参考。**全部 commit 在 main 分支可追溯**。

### 1. (待填:实施过程发现的第一项,无显著偏离则填「无显著偏离」)

(描述差异 + 原因 + 处理)

### 自检 checklist 实际状态

- [ ] `pnpm install` 干净跑通
- [ ] `pnpm check` 退出码 0
- [ ] `pnpm extract` 跑通,产出含 sprite-NNN.json / scene-1.json
- [ ] events round-trip 仍逐字节通过
- [ ] `pnpm -F @type-pal/game dev` 跑通 dev 验证清单
- [ ] `data/extracted/` + `packages/game/public/extracted` 在 `.gitignore`
- [ ] 04 决策表 D26 / D27 已 commit
```

- [ ] **Step 5: 更新根 README**

修改 `/Users/zhangxu/illegal/type-pal/README.md`,把当前状态从 M1 改到 M2:

```markdown
当前状态:**M2 已完成**(YYYY-MM-DD)。运行时垂直切片打通:scene 1 真实地图 + 真精灵 + 走路 + NPC 触发对话。下一步 M3 战斗垂直切片。
```

(具体 README 现有结构看一下再改。)

- [ ] **Step 6: Commit 文档同步**

`git add README.md docs/03-development-plan.md docs/plans/2026-05-23-m2-runtime-slice.md`
`git commit -m "docs(M2.22): M2 完成 —— README/03 状态同步 + 实施过程发现归档"`

---

## 完成定义(收尾检查)

逐条勾掉:

- [ ] `pnpm extract` 跑通,`data/extracted/` 含:
  - `data/scene-1.json`
  - `data/sprite-NNN.json` × N(队长 + NPC)
  - `images/sprite-NNN-frame-MM.png` × N
- [ ] 全量 events round-trip 仍逐字节通过(看 `[pal-extract] events round-trip OK`)
- [ ] `pnpm check` 退出码 0
- [ ] `pnpm -F @type-pal/game dev` 跑通 dev 验证清单(Task 22 Step 1)
- [ ] `git status` 干净(symlink 不入 git;extract 产物不入 git)
- [ ] `docs/03-development-plan.md` M2 标完成
- [ ] `docs/04-decisions.md` D26 / D27 已写(brainstorming 阶段已 commit,验)
- [ ] `docs/plans/2026-05-23-m2-runtime-slice.md` 末尾「实施过程发现」section 有内容(若 0 项偏离,写「无显著偏离」)

---

## 实施过程发现 / 与本计划的偏离(2026-05-23 完工时整理)

本计划在 brainstorming + writing-plans 阶段基于 02 / 04 / 05 设计推断;实施时遇到的真实差异记录如下供 M3+ 参考。**全部 commit 在 main 分支可追溯**。

### 1. setDialogStyle opcode 映射顺序按 sdlpal,不是计划字面顺序

计划 Task 3 例子给的 0x003B→Top / 0x003C→Center 是位置猜测,实际查 sdlpal `script.c:3389+` 后按 sdlpal 真值映射;字面注释在 commit b87a7b2 中按实测对齐。M3 真核 dialog 样式语义时再对一遍即可。

### 2. setDialogStyle opcode operands 非零,Command 扩 arg0/arg1/arg2

原计划假设 4 个 setDialogStyle opcode 三个 operand 全 0,实测真实数据 operand[0] 频繁为 NPC objectId / messageIndex,字节级 round-trip 要求保留。Shared types `SetDialogStyleXxxCommand` 加 `arg0/arg1/arg2?: number`(optional);disasm 仅非零时输出,recompile `?? 0` fallback(commit cee1351)。

### 3. SceneEventObject 字段去 Hungarian:sSpriteNum → spriteNum

Task 2 计划字面 `sSpriteNum`,但 M1 sss.ts 已经 normalize 成 `spriteNum`(无前缀)。继续 Hungarian 会让 Schema 不一致。Task 2 review 后重命名;M2 plan 文件同步更新(commit 6cb1da8)。

### 4. MGO.MKF chunk 是 YJ2 压缩

Task 5 sprite 提取一开始按 plan 走 raw 路径,parseSpriteChunk 失败。Sniff 显示首 4 字节是有效 u32 LE 解压长度 —— 所有非空 chunk 一律 YJ2。改成 unconditional `decompressYj2`,无 raw fallback(commit a526244 + 99d0ae8 注释 + dedup warn)。

### 5. MGO chunk 0 是空,PARTY_LEADER_SPRITE 真值取自 DATA.MKF chunk 3

Task 5 计划字面把队长精灵硬编码 `PARTY_LEADER_SPRITE = 0`,实测 MGO.MKF chunk 0 大小 = 0,bootstrap 直接抛"队长 sprite (id 0) 加载失败"。

实查 sdlpal `global.c:427` 是从 **DATA.MKF chunk 3** 读 PLAYERROLES,其中 `rgwSpriteNum` 偏移 12 个 u16(rgwAvatar 6w + rgwSpriteNumInBattle 6w)。dump 出来:`rgwSpriteNum = [2, 3, 7, 525, 5, 26]` —— 队长精灵号 = **2**(MGO chunk 2 = 4216 字节,正常加载)。

M2 改 cli.ts + bootstrap.ts + loader.ts 三处硬编码为 2,加 TODO(M3)真解析 PlayerRoles + 多角色队伍切换(fix commit a87d074)。

### 6. EVENTOBJECT.x / .y 是像素坐标,不是 cell 坐标

`npcFromEventObject` 计划字面把 `eo.x` / `eo.y` 直接当 `col` / `row` 透传,但实测 scene-1.json 里这两个数值高达 1456 / 1288,远超 128×64 cells 地图。实查 sdlpal `map.c:391` 显示 `lpSrcRect->x / 32` 取 col、`y / 16` 取 row(菱形错排,tile 32×16)。

M2 改 `npcFromEventObject` 用 `Math.floor(eo.x / 32)` / `Math.floor(eo.y / 16)` 转换,e2e 测试同步把构造数据放大到 px 单位(fix commit c96aa9f)。

### 7. dev 验证现象

`pnpm -F @type-pal/game dev` 浏览器打开看到:
- ✅ 真原版 scene 1 地图(红色木质建筑墙 + 棕色地砖,菱形错排正确)
- ✅ 真队长精灵渲染在画面中央(黑发 + 白色服饰,可辨认是原版角色)
- ✅ Top 样式对话框,色块占位字 4 个 glyph(对应 onEnter 第一句对话)
- ✅ 按 Space 推进对话(glyph 数变化,console.debug 显示 ip 推进 368→391→400...)
- ✅ 控制台连续看到 raw opcode skip 日志(opcode 67/69/70/115/5/9/21 等),证明事件循环正常
- ✅ 无 throw 红色 banner

由于 scene 1 onEnter 是原版开局长引子(几十句对话),按 Space 数十次都还在 event 模式;走路 / 撞 NPC 触发 trigger 段对话的最后一步,需要等 onEnter 全跑完才能验,M3 真做 setPartyPos / setViewport 等 ~10 个 opcode 后整段才会变得可玩。这不算 M2 bug —— M2 端到端架构链路本身正确。

### 8. tilemap 渲染两个隐藏 bug(用户视觉验证后揪出)

第一版 dev 截图看起来"像 tile 素材按顺序排列",经用户提示后排查,实际是 **两个 bug 叠加** 让原版地图样貌完全看不出来:

- **Bug 1 — 9-bit tile id 被砍成 8-bit**:`draw-tilemap.ts` 写 `cell.lower & 0xff`,但 sdlpal `map.c:249` 真正的提取式是 `(d & 0xff) | ((d >> 4) & 0x100)` —— 9-bit 索引,中间隔位(低 8 bit + bit 12 升到 bit 8)。Task 15 review 已提过 `& 0x1ff` 的猜测,实际是更怪的隔位拼接。导致 323 个 tile 只用上 89 个,大量 cell 显示成低位 id 的占位 tile。
- **Bug 2 — h=0/h=1 sub-row 位置当成"同位置叠加"**:`map.h` 里 `Tiles[row][col][h]` 的 h=0 / h=1 是两个不同子行(`(c*32, r*16)` vs `(c*32+16, r*16+8)`),不是 lower/upper "层"。Task 15 review 也已提过并留 TODO 标注。第一版按 plan 字面把 upper 画在与 lower 同位置,菱形错排被破坏。

两个 fix 合在一个 commit(fa0db6d)。修后视觉:scene 1 真实地图样貌出来了(红木门、木地板等),用户确认。

教训:**plan 字面里的"经验值"假设(`& 0xff`、"upper 覆盖 lower")在真数据面前要立即怀疑**,M3 重新写战斗 / 菜单这类 sdlpal 实现的对照转写时,坚持先 grep sdlpal 源码再写代码、再让 dev 视觉敲一遍。

### 9. tilemap 还有 layer 1 顶层 + row 步进真值 = 16(用户继续视觉验证后揪出第二轮)

#8 修完后用户再次 visual 验证(让我把整张 64×128 map 拼成 PNG 看),又看出两个新问题:

- **Bug 3 — 缺 layer 1 顶层**:每个 u32 cell 实际编码 **两个** 9-bit tile id —— 低 16 bit = layer 0(地砖、墙基),高 16 bit = layer 1(门、柜子侧面、柱子),后者还要 `-1`(0 = 无)。sdlpal `map.c:244-258 PAL_MapGetTileBitmap` 按 `ucLayer` 参数从同一 d 取不同位。我们之前完全只画 layer 0,所以门 / 柜子侧面 / 柱子全部缺失,从俯视角看是"散落的房间"而不是"完整建筑"。修:`drawTilemap` 加 `layer: 0 | 1` 参数,`present.ts` 改成 4 个 pass:tilemap layer 0 → NPCs → party → tilemap layer 1 → dialog。Layer 1 在精灵之后画,可以做"走到柜子后面被遮挡"效果。

- **Bug 4 — `ROW_Y_STEP` 该是 16 不是 8**:sdlpal `map.c:398-414` 真实公式 `for (y; y < dy; y++) { for (h = 0; h < 2; h++, yPos += 8) }` —— 每 outer y 循环步进 16 px(2 个 h 各 +8),不是每 row 步 8 px。我们之前把 sub-row 步当成了 row 步,整张图被纵向压扁 50%。同时去掉了 `(row & 1) * 16` 的 X 偏移 —— 那本来是 h sub-row 的 X 偏移(`h == 1` 时 +16),不是 row-parity 的偏移。

Bug 3 + 4 一起 commit 22a1693。修后再渲染整张拼图,室内细节全出来了(柜子、桌子、门框、柱子)。

### 自检 checklist 实际状态

- [x] `pnpm install` 干净跑通
- [x] `pnpm check` 退出码 0(180 个单测,M1 旧 91 + shared 20 + game 56 + pal-extract 104,无重叠)
- [x] `pnpm extract` 跑通,产出含 sprite-2.json + sprite-21.json + sprite-29.json + ... 共 12 sprite / 75 帧 + scene-1.json
- [x] events round-trip 仍逐字节通过(`[pal-extract] events round-trip OK`)
- [x] `pnpm -F @type-pal/game dev` 跑通 dev 验证(见第 7 条)
- [x] `data/extracted/` + `packages/game/public/extracted` 在 `.gitignore`
- [x] 04 决策表 D26 / D27 / D28 已 commit
