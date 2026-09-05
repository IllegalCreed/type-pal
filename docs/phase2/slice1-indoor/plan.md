> **历史文档（2026-09-06 标注）**：本文是已完成的 TDD 计划/设计存档，正文中的执行
> 指令、Agent 分工与“当前状态”是当时快照，不是现行待办。实现结果以 capability-map 与
> 对应任务卡为准。

# 切片 1「室内场景跑通」实现计划（slice 1 plan）

> ⚠ **暂缓 / 勿照此执行（2026-06-25）**：本计划是「重新聚焦」**之前**的版本（WebGL2 渲染、MMO 留口、内容无关的通用房间）。第二阶段已改走 **Canvas 2D 起步 + 真实 DLC 内容 + 不留 MMO 口**（见 [decisions.md](../decisions.md)）。保留作参考；切片重启时会基于新范围重写——**别把它当成当前的实现任务**。

> **For agentic workers:** REQUIRED SUB-SKILL: 用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 按任务逐个实现。步骤用 `- [ ]` 复选框跟踪。
>
> 配套 spec：[spec.md](spec.md)（范围/红线/决策映射的真值）。本计划只负责"怎么一步步落地"。

**Goal：** 起 `@type-pal/content` + `@type-pal/reforge` 两个新包，让新引擎在浏览器跑通一个手写室内房：走路 + 撞墙 + NPC 对话翻页。

**Architecture：** content 是纯数据/解码库（GPU 无关、node 可测）：schema 类型 + 纯 `parseScene`/`validate` + 纯 `decodeIndexedPng`。reforge 是运行时：三层状态、轻量组件袋实体、`resolveMove` 纯函数移动、uniform-grid 空间索引、迷你声明式演出（action handler 注册表）、WebGL2 渲染 + Canvas2D 文字叠层。逻辑全部 headless 可测（`Renderer` 是接口，测试打桩）。

**Tech Stack：** TypeScript（strict / NodeNext）、pnpm workspace、vitest、pngjs（node 解码）、WebGL2、vite（dev 入口）。

## Global Constraints

> 每个任务的要求都隐含包含本节。值照抄自 spec / 仓库约定。

- **TS 严格**：`tsconfig.base.json` 已开 `strict` / `noUncheckedIndexedAccess` / `verbatimModuleSyntax` / `module: NodeNext`。→ 相对 import **必须带 `.js` 扩展**；纯类型 import 用 `import type`；下标访问要 guard（`?? 默认` 或 `!`）。
- **稳定 id，杜绝下标身份**（D2 铁律5）：实体/场景/演出/资产一律 branded string id，绝不用数组位置当身份。
- **零模块单例**（D2）：没有 module-level 可变单例；一切挂在 `createEngine()` 造出的 `EngineContext` 上。
- **content 与 GPU 无关**（spec §2）：content 只产出 RGBA 缓冲（`decodeIndexedPng`）；上传 GPU 是 reforge 的事。
- **面向玩家文本一律 text id 查表**（D9）：对话/名字不写字面量，写 `TextId` → `TextTable` 查。
- **reforge 瓦片 = 干净方格**（spec §9 决策）：用 `tileSize` 方格，**不移植** PAL 32×16 偏移拼贴几何。
- **移动 = 意图 → 纯函数 `resolveMove` → applier**（D2/D5）：只有 applier 写坐标；`resolveMove` 纯函数，不碰全局。
- **新包镜像 `packages/shared` 的形状**：`main`/`types` → `src/index.ts`、`exports`、scripts `typecheck`/`test`/`check`、tsconfig `extends ../../tsconfig.base.json`。
- TDD、频繁提交、YAGNI、DRY。

---

# 阶段 0 · workspace 接线

### Task 0：起两个空包并接进 workspace

**Files:**
- Create: `packages/content/package.json`、`packages/content/tsconfig.json`、`packages/content/src/index.ts`
- Create: `packages/reforge/package.json`、`packages/reforge/tsconfig.json`、`packages/reforge/src/index.ts`

**Interfaces:**
- Produces：两个可被 `pnpm -r` 识别的包；`@type-pal/content` 暴露 `src/index.ts`，`@type-pal/reforge` 依赖 `workspace:*` content。

- [ ] **Step 1：写 content/package.json**（镜像 shared）

```json
{
  "name": "@type-pal/content",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./scenes/*": "./scenes/*",
    "./assets/*": "./assets/*"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests",
    "check": "pnpm typecheck && pnpm test"
  },
  "dependencies": { "pngjs": "^7.0.0" },
  "devDependencies": { "@types/pngjs": "^6.0.5" }
}
```

- [ ] **Step 2：写 content/tsconfig.json**（node 库，无 DOM）

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "lib": ["ES2022"], "outDir": "dist", "rootDir": "src", "types": ["node"] },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3：写 content/src/index.ts 占位**

```ts
// @type-pal/content —— 内容数据模型 + 纯加载/解码（GPU 无关）。逐 Task 往这里 re-export。
export {}
```

- [ ] **Step 4：写 reforge/package.json**

```json
{
  "name": "@type-pal/reforge",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests",
    "check": "pnpm typecheck && pnpm test"
  },
  "dependencies": { "@type-pal/content": "workspace:*" },
  "devDependencies": { "@types/node": "^25.9.1", "vite": "^8.0.14" }
}
```

- [ ] **Step 5：写 reforge/tsconfig.json**（浏览器 + 测试用 node 类型）

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "lib": ["ES2022", "DOM", "DOM.Iterable"], "outDir": "dist", "rootDir": "src", "types": ["node"] },
  "include": ["src/**/*"]
}
```

- [ ] **Step 6：写 reforge/src/index.ts 占位**

```ts
// @type-pal/reforge —— 运行时引擎。逐 Task 往这里 re-export。
export {}
```

- [ ] **Step 7：装依赖 + 全量 check**

Run: `pnpm install && pnpm -r check`
Expected: content / reforge 均 `typecheck` 过、`test` 报 "no test files" 但 `--passWithNoTests` → PASS。

- [ ] **Step 8：Commit**

```bash
git add packages/content packages/reforge pnpm-lock.yaml
git commit -m "feat(reforge): 起 @type-pal/content + @type-pal/reforge 空包接进 workspace"
```

---

# 阶段 A · @type-pal/content（纯数据/解码，node 可测）

### Task A1：schema 类型

**Files:**
- Create: `packages/content/src/schema/ids.ts`、`map.ts`、`entity.ts`、`cutscene.ts`、`trigger.ts`、`text.ts`、`scene.ts`
- Modify: `packages/content/src/index.ts`
- Test: `packages/content/src/schema/schema.test.ts`

**Interfaces:**
- Produces：spec §3 全部类型。下游 Task 全靠这些名字，签名见下，**逐字一致**。

- [ ] **Step 1：写 ids.ts**

```ts
// branded 稳定 id（杜绝下标身份）。运行时就是 string，类型上不可混用。
export type SceneId = string & { readonly __b: 'SceneId' }
export type EntityId = string & { readonly __b: 'EntityId' }
export type CutsceneId = string & { readonly __b: 'CutsceneId' }
export type TextId = string & { readonly __b: 'TextId' }
export type TilesetRef = string & { readonly __b: 'TilesetRef' }
export type SpriteRef = string & { readonly __b: 'SpriteRef' }

export const asEntityId = (s: string): EntityId => s as EntityId
export const asCutsceneId = (s: string): CutsceneId => s as CutsceneId
export const asTextId = (s: string): TextId => s as TextId
```

- [ ] **Step 2：写 map.ts / entity.ts / cutscene.ts / trigger.ts / text.ts / scene.ts**

```ts
// map.ts
import type { TilesetRef } from './ids.js'
export interface VisualLayer { id: string; zOrder: number; occludesActors: boolean; tiles: Int16Array }
export interface CollisionLayer { width: number; height: number; blocked: Uint8Array }
export interface TileMap {
  width: number; height: number; tileSize: number
  tileset: TilesetRef; layers: VisualLayer[]; collision: CollisionLayer
}
```
```ts
// entity.ts
import type { CutsceneId, EntityId, SpriteRef } from './ids.js'
export type Facing = 'up' | 'down' | 'left' | 'right'
export interface TransformComponent { x: number; y: number; facing: Facing }
export interface SpriteComponent { sprite: SpriteRef }
export interface CollisionComponent { box: { w: number; h: number; offX: number; offY: number }; solid: boolean }
export interface InteractionComponent { cutscene: CutsceneId }
export interface EntityComponents {
  transform?: TransformComponent; sprite?: SpriteComponent
  collision?: CollisionComponent; interaction?: InteractionComponent
}
export interface EntityDef { id: EntityId; components: EntityComponents }
```
```ts
// cutscene.ts
import type { CutsceneId, TextId } from './ids.js'
export interface DialogAction { type: 'dialog'; speaker?: TextId; pages: TextId[] }
export type CutsceneAction = DialogAction // 留 union 长大
export interface Cutscene { id: CutsceneId; actions: CutsceneAction[] }
```
```ts
// trigger.ts
import type { CutsceneId, EntityId } from './ids.js'
export interface InteractCondition { type: 'interact'; target: EntityId }
export type TriggerCondition = InteractCondition // 留 union 长大
export interface Trigger { id: string; when: TriggerCondition; run: CutsceneId }
```
```ts
// text.ts
import type { TextId } from './ids.js'
export type TextTable = Record<TextId, { zh: string }> // 后续加 en/ja
```
```ts
// scene.ts
import type { Cutscene } from './cutscene.js'
import type { EntityDef, Facing } from './entity.js'
import type { TileMap } from './map.js'
import type { SceneId, TextId } from './ids.js'
import type { Trigger } from './trigger.js'
export interface Scene {
  id: SceneId; name: TextId; map: TileMap
  entities: EntityDef[]; cutscenes: Cutscene[]; triggers: Trigger[]
  entry: { x: number; y: number; facing: Facing }
}
```

- [ ] **Step 3：index.ts re-export schema**

```ts
export * from './schema/ids.js'
export * from './schema/map.js'
export * from './schema/entity.js'
export * from './schema/cutscene.js'
export * from './schema/trigger.js'
export * from './schema/text.js'
export * from './schema/scene.js'
```

- [ ] **Step 4：写 smoke 测试**（确认导出可构造）

```ts
import { describe, expect, it } from 'vitest'
import { asEntityId, type EntityDef } from '../index.js'
describe('schema', () => {
  it('构造一个 EntityDef', () => {
    const e: EntityDef = { id: asEntityId('npc-1'), components: { transform: { x: 0, y: 0, facing: 'down' } } }
    expect(e.id).toBe('npc-1')
  })
})
```

- [ ] **Step 5：跑 + Commit**

Run: `pnpm --filter @type-pal/content exec vitest run` → PASS
```bash
git add packages/content/src
git commit -m "feat(content): slice schema 类型(scene/map/entity/cutscene/trigger/text)"
```

---

### Task A2：indexed PNG → RGBA 解码（纯函数）

**Files:**
- Create: `packages/content/src/load/decode-indexed.ts`
- Modify: `packages/content/src/index.ts`
- Test: `packages/content/src/load/decode-indexed.test.ts`

**Interfaces:**
- Produces：`type Rgba = { width: number; height: number; data: Uint8Array }`（RGBA，长 w*h*4）；`type Palette = ReadonlyArray<readonly [number, number, number]>`；`decodeIndexedPng(pngBytes: Uint8Array, palette: Palette): Rgba`。
- 解码规则照搬 phase-1 `game/src/assets/png.ts`（铁律3 移植）：**R = palette index，A = opaque mask（>0 即不透明）**。

- [ ] **Step 1：写失败测试**（用 pngjs 现造一张已知 PNG）

```ts
import { PNG } from 'pngjs'
import { describe, expect, it } from 'vitest'
import { decodeIndexedPng, type Palette } from './decode-indexed.js'

function makeIndexedPng(w: number, h: number, idx: number[], alpha: number[]): Uint8Array {
  const png = new PNG({ width: w, height: h })
  for (let i = 0; i < w * h; i++) {
    png.data[i * 4] = idx[i]!       // R = index
    png.data[i * 4 + 1] = idx[i]!
    png.data[i * 4 + 2] = idx[i]!
    png.data[i * 4 + 3] = alpha[i]! // A = mask
  }
  return new Uint8Array(PNG.sync.write(png))
}

describe('decodeIndexedPng', () => {
  it('按 palette 上色,A=0 透明 / A>0 不透明', () => {
    const palette: Palette = [[0, 0, 0], [10, 20, 30], [99, 99, 99]]
    const bytes = makeIndexedPng(2, 1, [1, 2], [255, 0]) // px0=idx1 不透明, px1=idx2 透明
    const out = decodeIndexedPng(bytes, palette)
    expect(out.width).toBe(2)
    expect([...out.data.slice(0, 4)]).toEqual([10, 20, 30, 255])  // px0 上色 + 不透明
    expect(out.data[7]).toBe(0)                                    // px1 alpha=0
  })
})
```

- [ ] **Step 2：跑→失败**

Run: `pnpm --filter @type-pal/content exec vitest run src/load/decode-indexed.test.ts`
Expected: FAIL（`decodeIndexedPng` 未定义）

- [ ] **Step 3：写实现**

```ts
import { PNG } from 'pngjs'
export interface Rgba { width: number; height: number; data: Uint8Array }
export type Palette = ReadonlyArray<readonly [number, number, number]>

/** indexed PNG（R=palette index，A=opaque mask）+ palette → RGBA 缓冲。移植自 game/src/assets/png.ts。 */
export function decodeIndexedPng(pngBytes: Uint8Array, palette: Palette): Rgba {
  const png = PNG.sync.read(Buffer.from(pngBytes))
  const total = png.width * png.height
  const data = new Uint8Array(total * 4)
  for (let i = 0; i < total; i++) {
    const index = png.data[i * 4] ?? 0
    const mask = png.data[i * 4 + 3] ?? 0
    const rgb = palette[index] ?? ([0, 0, 0] as const)
    data[i * 4] = rgb[0]
    data[i * 4 + 1] = rgb[1]
    data[i * 4 + 2] = rgb[2]
    data[i * 4 + 3] = mask > 0 ? 255 : 0
  }
  return { width: png.width, height: png.height, data }
}
```

- [ ] **Step 4：跑→PASS** + index.ts 加 `export * from './load/decode-indexed.js'`

- [ ] **Step 5：Commit**

```bash
git add packages/content/src
git commit -m "feat(content): decodeIndexedPng —— indexed PNG+palette→RGBA(移植 png.ts)"
```

---

### Task A3：场景解析 + 校验（纯函数，number[]→typed array + fail-loud）

**Files:**
- Create: `packages/content/src/load/parse-scene.ts`
- Modify: `packages/content/src/index.ts`
- Test: `packages/content/src/load/parse-scene.test.ts`

**Interfaces:**
- Consumes：A1 全部 schema 类型。
- Produces：`parseScene(rawScene: unknown, rawText: unknown): { scene: Scene; texts: TextTable }`。磁盘 JSON 的 `tiles`/`blocked` 是 `number[]`，转 `Int16Array`/`Uint8Array`。坏引用/越界/缺字段 → `throw new Error(带 id)`，不静默回填。

- [ ] **Step 1：写失败测试**

```ts
import { describe, expect, it } from 'vitest'
import { parseScene } from './parse-scene.js'

const okScene = {
  id: 'inn', name: 'txt.inn', map: {
    width: 2, height: 1, tileSize: 32, tileset: 'ts.inn',
    layers: [{ id: 'floor', zOrder: 0, occludesActors: false, tiles: [0, 1] }],
    collision: { width: 2, height: 1, blocked: [0, 1] },
  },
  entities: [{ id: 'npc', components: { transform: { x: 0, y: 0, facing: 'down' }, interaction: { cutscene: 'cs.hi' } } }],
  cutscenes: [{ id: 'cs.hi', actions: [{ type: 'dialog', pages: ['txt.hi'] }] }],
  triggers: [{ id: 't1', when: { type: 'interact', target: 'npc' }, run: 'cs.hi' }],
  entry: { x: 0, y: 0, facing: 'down' },
}
const okText = { 'txt.inn': { zh: '客栈' }, 'txt.hi': { zh: '你好' } }

describe('parseScene', () => {
  it('合法场景 → Scene,tiles 转 typed array', () => {
    const { scene } = parseScene(structuredClone(okScene), okText)
    expect(scene.map.layers[0]!.tiles).toBeInstanceOf(Int16Array)
    expect(scene.map.collision.blocked).toBeInstanceOf(Uint8Array)
  })
  it('trigger 指向不存在的 cutscene → 抛错带 id', () => {
    const bad = structuredClone(okScene); bad.triggers[0]!.run = 'cs.nope'
    expect(() => parseScene(bad, okText)).toThrow(/cs\.nope/)
  })
  it('interaction 指向不存在的 entity → 抛错带 id', () => {
    const bad = structuredClone(okScene); bad.triggers[0]!.when.target = 'ghost'
    expect(() => parseScene(bad, okText)).toThrow(/ghost/)
  })
  it('tiles 长度 != width*height → 抛错', () => {
    const bad = structuredClone(okScene); bad.map.layers[0]!.tiles = [0]
    expect(() => parseScene(bad, okText)).toThrow(/tiles/)
  })
})
```

- [ ] **Step 2：跑→失败**

- [ ] **Step 3：写实现**

```ts
import type { Scene } from '../schema/scene.js'
import type { TextTable } from '../schema/text.js'
import type { CutsceneId, EntityId } from '../schema/ids.js'

// 轻量 narrowing：本切片手写内容，校验聚焦"引用完整 + 长度对",不做全字段 schema 引擎(YAGNI)。
function asRecord(v: unknown, what: string): Record<string, unknown> {
  if (typeof v !== 'object' || v === null) throw new Error(`parseScene: ${what} 不是对象`)
  return v as Record<string, unknown>
}

export function parseScene(rawScene: unknown, rawText: unknown): { scene: Scene; texts: TextTable } {
  const r = asRecord(rawScene, 'scene')
  const map = asRecord(r.map, 'scene.map')
  const w = map.width as number, h = map.height as number
  const layers = (map.layers as Array<Record<string, unknown>>).map((L) => {
    const tiles = L.tiles as number[]
    if (tiles.length !== w * h) throw new Error(`parseScene: layer ${String(L.id)} tiles 长度 ${tiles.length} != ${w * h}`)
    return { id: String(L.id), zOrder: L.zOrder as number, occludesActors: !!L.occludesActors, tiles: Int16Array.from(tiles) }
  })
  const col = asRecord(map.collision, 'collision')
  const blocked = col.blocked as number[]
  if (blocked.length !== w * h) throw new Error(`parseScene: collision.blocked 长度 ${blocked.length} != ${w * h}`)

  const entities = r.entities as Array<Record<string, unknown>>
  const entityIds = new Set(entities.map((e) => String(e.id)))
  const cutscenes = r.cutscenes as Array<Record<string, unknown>>
  const cutsceneIds = new Set(cutscenes.map((c) => String(c.id)))

  // fail-loud：interaction / trigger 引用完整性
  for (const e of entities) {
    const inter = (e.components as Record<string, unknown>)?.interaction as { cutscene?: string } | undefined
    if (inter && !cutsceneIds.has(inter.cutscene!)) throw new Error(`parseScene: entity ${String(e.id)} interaction 指向不存在的 cutscene "${inter.cutscene}"`)
  }
  for (const t of r.triggers as Array<Record<string, unknown>>) {
    const when = t.when as { target?: string }
    if (when.target && !entityIds.has(when.target)) throw new Error(`parseScene: trigger ${String(t.id)} target 不存在的 entity "${when.target}"`)
    if (!cutsceneIds.has(String(t.run))) throw new Error(`parseScene: trigger ${String(t.id)} run 不存在的 cutscene "${String(t.run)}"`)
  }

  const scene = {
    id: r.id, name: r.name,
    map: { width: w, height: h, tileSize: map.tileSize as number, tileset: map.tileset,
           layers, collision: { width: col.width as number, height: col.height as number, blocked: Uint8Array.from(blocked) } },
    entities, cutscenes, triggers: r.triggers, entry: r.entry,
  } as unknown as Scene
  return { scene, texts: rawText as TextTable }
}
```
> 注：本切片手写内容，故校验只钉"引用完整 + 长度对"这几条真会出错的（YAGNI，不引 zod 全 schema）。`as unknown as Scene` 仅在已校验后做一次窄化收口。

- [ ] **Step 4：跑→PASS** + index.ts 加 `export * from './load/parse-scene.js'`

- [ ] **Step 5：Commit**

```bash
git add packages/content/src
git commit -m "feat(content): parseScene —— number[]→typed array + 引用完整性 fail-loud 校验"
```

---

### Task A4：手写 slice1-inn 内容 + vendored 真实资产 + index.json

**Files:**
- Create: `packages/content/scenes/slice1-inn/scene.json`、`text.json`
- Create: `packages/content/assets/index.json`、`assets/tiles/*.png`、`assets/sprites/*.png`、`assets/palettes/*.json`（从 `data/extracted` 手动选/拷）
- Create: `packages/content/src/assets/asset-index.ts`（AssetIndex 类型 + parse）
- Test: `packages/content/src/assets/asset-index.test.ts`

**Interfaces:**
- Produces：`interface AssetEntry { id: string; png: string; palette: string }`；`interface AssetIndex { tilesets: AssetEntry[]; sprites: AssetEntry[] }`；`parseAssetIndex(raw: unknown): AssetIndex`。
- 手写场景 = spec §3 形状的真实 JSON 实例；资产 = 真实原版（spec §4「复用提取资产」）。

- [ ] **Step 1：选并 vendored 资产**（手动，标准见 spec §4）

从 `data/extracted/data/tileset/`、`data/extracted/data/sprite/`、`data/extracted/data/palette/` 选：
- 1 套室内瓦片 PNG（挑独立成块、方格摆放观感可接受的）→ `assets/tiles/inn.png`
- 李逍遥行走精灵帧 → `assets/sprites/player.png`（四向各一帧起步）
- 1 个 NPC 精灵 → `assets/sprites/npc.png`
- 1 件家具精灵（桌/瓶）→ `assets/sprites/table.png`
- 对应调色板（decodePalette 产出的 `{colors:[[r,g,b]×256]}` JSON）→ `assets/palettes/inn.json`

> 这些是 vendored 内容源（独立于 `data/extracted`，不被 `pnpm extract` 覆盖）。**手动拷贝，不写迁移器**（D2 排除）。

- [ ] **Step 2：写 assets/index.json**

```json
{
  "tilesets": [{ "id": "ts.inn", "png": "tiles/inn.png", "palette": "palettes/inn.json" }],
  "sprites": [
    { "id": "sp.player", "png": "sprites/player.png", "palette": "palettes/inn.json" },
    { "id": "sp.npc", "png": "sprites/npc.png", "palette": "palettes/inn.json" },
    { "id": "sp.table", "png": "sprites/table.png", "palette": "palettes/inn.json" }
  ]
}
```

- [ ] **Step 3：写 scene.json + text.json**（~20×15，几面墙 + NPC + 桌；blocked/tiles 用真实数组）

> 给一个**可缩小**起步：先 6×4 验证管线，再扩到 ~20×15。下例 6×4，墙在四周（blocked=1），NPC 在 (2,1)。tileSize=32 → 像素坐标 = 格×32。

```json
{
  "id": "inn", "name": "txt.inn.name",
  "map": {
    "width": 6, "height": 4, "tileSize": 32, "tileset": "ts.inn",
    "layers": [{ "id": "floor", "zOrder": 0, "occludesActors": false,
      "tiles": [0,0,0,0,0,0, 0,1,1,1,1,0, 0,1,1,1,1,0, 0,0,0,0,0,0] }],
    "collision": { "width": 6, "height": 4,
      "blocked": [1,1,1,1,1,1, 1,0,0,0,0,1, 1,0,0,0,0,1, 1,1,1,1,1,1] }
  },
  "entities": [
    { "id": "player", "components": {
      "transform": { "x": 48, "y": 48, "facing": "down" },
      "sprite": { "sprite": "sp.player" },
      "collision": { "box": { "w": 16, "h": 12, "offX": 8, "offY": 18 }, "solid": false } } },
    { "id": "npc-keeper", "components": {
      "transform": { "x": 80, "y": 40, "facing": "down" },
      "sprite": { "sprite": "sp.npc" },
      "collision": { "box": { "w": 24, "h": 16, "offX": 4, "offY": 14 }, "solid": true },
      "interaction": { "cutscene": "cs.keeper-hi" } } },
    { "id": "table", "components": {
      "transform": { "x": 112, "y": 48, "facing": "down" },
      "sprite": { "sprite": "sp.table" },
      "collision": { "box": { "w": 28, "h": 20, "offX": 2, "offY": 10 }, "solid": true } } }
  ],
  "cutscenes": [
    { "id": "cs.keeper-hi", "actions": [{ "type": "dialog", "speaker": "txt.keeper.name",
      "pages": ["txt.keeper.l1", "txt.keeper.l2"] }] }
  ],
  "triggers": [{ "id": "tr.keeper", "when": { "type": "interact", "target": "npc-keeper" }, "run": "cs.keeper-hi" }],
  "entry": { "x": 48, "y": 48, "facing": "down" }
}
```
```json
{
  "txt.inn.name": { "zh": "客栈" },
  "txt.keeper.name": { "zh": "店小二" },
  "txt.keeper.l1": { "zh": "客官，打尖还是住店？" },
  "txt.keeper.l2": { "zh": "楼上请！" }
}
```

- [ ] **Step 4：写 asset-index.ts + 测试**（parse + 字段存在）

```ts
export interface AssetEntry { id: string; png: string; palette: string }
export interface AssetIndex { tilesets: AssetEntry[]; sprites: AssetEntry[] }
export function parseAssetIndex(raw: unknown): AssetIndex {
  const r = raw as AssetIndex
  if (!Array.isArray(r.tilesets) || !Array.isArray(r.sprites)) throw new Error('parseAssetIndex: 缺 tilesets/sprites')
  return r
}
```
```ts
import { describe, expect, it } from 'vitest'
import index from '../../assets/index.json' with { type: 'json' }
import { parseAssetIndex } from './asset-index.js'
describe('asset-index', () => {
  it('vendored index.json 可解析且引用的 png 都登记', () => {
    const ai = parseAssetIndex(index)
    expect(ai.tilesets.find((t) => t.id === 'ts.inn')).toBeTruthy()
    expect(ai.sprites.map((s) => s.id)).toContain('sp.player')
  })
})
```

- [ ] **Step 5：集成测试**——`parseScene(scene.json, text.json)` 不抛错

```ts
import { describe, expect, it } from 'vitest'
import scene from '../../scenes/slice1-inn/scene.json' with { type: 'json' }
import text from '../../scenes/slice1-inn/text.json' with { type: 'json' }
import { parseScene } from './parse-scene.js'
describe('slice1-inn 内容', () => {
  it('parseScene 成功 + player 在 entry', () => {
    const { scene: s } = parseScene(scene, text)
    expect(s.entities.find((e) => e.id === ('player' as never))).toBeTruthy()
    expect(s.entry).toEqual({ x: 48, y: 48, facing: 'down' })
  })
})
```

- [ ] **Step 6：跑→PASS + Commit**

```bash
git add packages/content
git commit -m "feat(content): 手写 slice1-inn 场景 + vendored 真实资产 + asset-index"
```

---

# 阶段 B · @type-pal/reforge 逻辑（headless 可测）

### Task B1：运行时实体 + 组件

**Files:** Create `packages/reforge/src/entity/entity.ts`；Modify `src/index.ts`；Test `src/entity/entity.test.ts`

**Interfaces:**
- Consumes：content 的 `EntityComponents`、`Facing`。
- Produces：`interface Entity { id: string; components: EntityComponents }`；`makeEntity(def: EntityDef): Entity`（深拷贝 transform，避免 L2 只读定义被运行时 mutate）。

- [ ] **Step 1：测试**

```ts
import { describe, expect, it } from 'vitest'
import { asEntityId, type EntityDef } from '@type-pal/content'
import { makeEntity } from './entity.js'
describe('makeEntity', () => {
  it('从 def 造运行时实体,transform 是独立副本', () => {
    const def: EntityDef = { id: asEntityId('p'), components: { transform: { x: 1, y: 2, facing: 'up' } } }
    const e = makeEntity(def)
    e.components.transform!.x = 99
    expect(def.components.transform!.x).toBe(1) // def 未被改
  })
})
```

- [ ] **Step 2→4：实现 + 跑 PASS**

```ts
import type { EntityComponents, EntityDef } from '@type-pal/content'
export interface Entity { id: string; components: EntityComponents }
export function makeEntity(def: EntityDef): Entity {
  const c = def.components
  return { id: def.id, components: {
    ...c,
    transform: c.transform ? { ...c.transform } : undefined, // 运行时会 mutate → 拷贝
  } }
}
```

- [ ] **Step 5：Commit** `feat(reforge): 运行时 Entity + makeEntity(transform 独立副本)`

---

### Task B2：uniform-grid 空间索引

**Files:** Create `src/systems/spatial-index.ts`、`src/systems/aabb.ts`；Test `src/systems/spatial-index.test.ts`

**Interfaces:**
- Produces：`interface Aabb { x: number; y: number; w: number; h: number }`（x,y=左上角，世界 px）；`aabbOverlap(a, b): boolean`；`class SpatialIndex { constructor(cellSize: number); insert(id: string, box: Aabb): void; remove(id: string): void; move(id, box): void; queryAabb(box: Aabb): string[] }`。

- [ ] **Step 1：测试**

```ts
import { describe, expect, it } from 'vitest'
import { SpatialIndex } from './spatial-index.js'
describe('SpatialIndex', () => {
  it('queryAabb 命中重叠实体、漏掉不重叠', () => {
    const idx = new SpatialIndex(32)
    idx.insert('a', { x: 0, y: 0, w: 16, h: 16 })
    idx.insert('b', { x: 200, y: 200, w: 16, h: 16 })
    expect(idx.queryAabb({ x: 8, y: 8, w: 16, h: 16 })).toContain('a')
    expect(idx.queryAabb({ x: 8, y: 8, w: 16, h: 16 })).not.toContain('b')
  })
  it('move 后旧格查不到、新格查得到', () => {
    const idx = new SpatialIndex(32)
    idx.insert('a', { x: 0, y: 0, w: 16, h: 16 })
    idx.move('a', { x: 300, y: 0, w: 16, h: 16 })
    expect(idx.queryAabb({ x: 0, y: 0, w: 16, h: 16 })).not.toContain('a')
    expect(idx.queryAabb({ x: 300, y: 0, w: 16, h: 16 })).toContain('a')
  })
})
```

- [ ] **Step 2→4：实现**

```ts
// aabb.ts
export interface Aabb { x: number; y: number; w: number; h: number }
export function aabbOverlap(a: Aabb, b: Aabb): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}
```
```ts
// spatial-index.ts
import { type Aabb, aabbOverlap } from './aabb.js'
export class SpatialIndex {
  private cells = new Map<string, Set<string>>()
  private boxes = new Map<string, Aabb>()
  constructor(private readonly cellSize: number) {}
  private *keys(b: Aabb): Generator<string> {
    const x0 = Math.floor(b.x / this.cellSize), x1 = Math.floor((b.x + b.w) / this.cellSize)
    const y0 = Math.floor(b.y / this.cellSize), y1 = Math.floor((b.y + b.h) / this.cellSize)
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) yield `${cx},${cy}`
  }
  insert(id: string, box: Aabb): void {
    this.boxes.set(id, box)
    for (const k of this.keys(box)) (this.cells.get(k) ?? this.cells.set(k, new Set()).get(k)!).add(id)
  }
  remove(id: string): void {
    const box = this.boxes.get(id); if (!box) return
    for (const k of this.keys(box)) this.cells.get(k)?.delete(id)
    this.boxes.delete(id)
  }
  move(id: string, box: Aabb): void { this.remove(id); this.insert(id, box) }
  queryAabb(box: Aabb): string[] {
    const hit = new Set<string>()
    for (const k of this.keys(box)) for (const id of this.cells.get(k) ?? []) {
      if (aabbOverlap(box, this.boxes.get(id)!)) hit.add(id)
    }
    return [...hit]
  }
}
```

- [ ] **Step 5：Commit** `feat(reforge): uniform-grid SpatialIndex + aabbOverlap`

---

### Task B3：世界几何碰撞查询

**Files:** Create `src/systems/collision.ts`；Test `src/systems/collision.test.ts`

**Interfaces:**
- Consumes：content `CollisionLayer`；B2 `Aabb`。
- Produces：`isBlockedByLayer(layer: CollisionLayer, tileSize: number, box: Aabb): boolean`（任一覆盖格 blocked 或越界 → true）。

- [ ] **Step 1：测试**

```ts
import { describe, expect, it } from 'vitest'
import { isBlockedByLayer } from './collision.js'
const layer = { width: 3, height: 1, blocked: Uint8Array.from([0, 1, 0]) }
describe('isBlockedByLayer', () => {
  it('落在 blocked 格 → true', () => { expect(isBlockedByLayer(layer, 32, { x: 32, y: 0, w: 8, h: 8 })).toBe(true) })
  it('落在可走格 → false', () => { expect(isBlockedByLayer(layer, 32, { x: 0, y: 0, w: 8, h: 8 })).toBe(false) })
  it('越界 → true', () => { expect(isBlockedByLayer(layer, 32, { x: -8, y: 0, w: 8, h: 8 })).toBe(true) })
})
```

- [ ] **Step 2→4：实现**

```ts
import type { CollisionLayer } from '@type-pal/content'
import type { Aabb } from './aabb.js'
export function isBlockedByLayer(layer: CollisionLayer, tileSize: number, box: Aabb): boolean {
  const x0 = Math.floor(box.x / tileSize), x1 = Math.floor((box.x + box.w - 1) / tileSize)
  const y0 = Math.floor(box.y / tileSize), y1 = Math.floor((box.y + box.h - 1) / tileSize)
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
    if (cx < 0 || cy < 0 || cx >= layer.width || cy >= layer.height) return true
    if ((layer.blocked[cy * layer.width + cx] ?? 1) !== 0) return true
  }
  return false
}
```

- [ ] **Step 5：Commit** `feat(reforge): isBlockedByLayer 世界几何碰撞查询`

---

### Task B4：resolveMove（纯函数 · D2/D5 红线本体）

**Files:** Create `src/systems/movement.ts`；Test `src/systems/movement.test.ts`

**Interfaces:**
- Consumes：B2 `Aabb`。
- Produces：`interface MoveIntent { dx: number; dy: number }`；`interface MoveResult { x: number; y: number; blockedX: boolean; blockedY: boolean }`；`resolveMove(box: Aabb, intent: MoveIntent, isBlocked: (test: Aabb) => boolean): MoveResult`。**纯函数**：分轴尝试 → 贴墙滑行；`isBlocked` 由调用方组合（世界几何 ∪ solid 实体），故 resolveMove 不依赖碰撞表示。

- [ ] **Step 1：测试**（红线测：自由/撞墙/滑行）

```ts
import { describe, expect, it } from 'vitest'
import { resolveMove } from './movement.js'
const box = { x: 50, y: 50, w: 16, h: 16 }
describe('resolveMove', () => {
  it('无阻挡 → 全量位移', () => {
    const r = resolveMove(box, { dx: 4, dy: -3 }, () => false)
    expect(r).toMatchObject({ x: 54, y: 47, blockedX: false, blockedY: false })
  })
  it('X 撞墙 Y 通 → 贴墙竖滑(只 Y 动)', () => {
    const r = resolveMove(box, { dx: 4, dy: 4 }, (t) => t.x > box.x) // 任何向右移动被挡
    expect(r).toMatchObject({ x: 50, y: 54, blockedX: true, blockedY: false })
  })
  it('两轴全挡 → 不动', () => {
    const r = resolveMove(box, { dx: 4, dy: 4 }, () => true)
    expect(r).toMatchObject({ x: 50, y: 50, blockedX: true, blockedY: true })
  })
})
```

- [ ] **Step 2→4：实现**

```ts
import type { Aabb } from './aabb.js'
export interface MoveIntent { dx: number; dy: number }
export interface MoveResult { x: number; y: number; blockedX: boolean; blockedY: boolean }
export function resolveMove(box: Aabb, intent: MoveIntent, isBlocked: (test: Aabb) => boolean): MoveResult {
  let x = box.x, y = box.y
  let blockedX = false, blockedY = false
  if (intent.dx !== 0) {
    const test = { x: x + intent.dx, y, w: box.w, h: box.h }
    if (isBlocked(test)) blockedX = true; else x = test.x
  }
  if (intent.dy !== 0) {
    const test = { x, y: y + intent.dy, w: box.w, h: box.h }
    if (isBlocked(test)) blockedY = true; else y = test.y
  }
  return { x, y, blockedX, blockedY }
}
```

- [ ] **Step 5：Commit** `feat(reforge): resolveMove 纯函数(分轴滑行) —— D2/D5 移动红线`

---

### Task B5：三层状态 —— world-state(L1) + scene-runtime(L3)

**Files:** Create `src/engine/world-state.ts`、`src/engine/scene-runtime.ts`；Test `src/engine/scene-runtime.test.ts`

**Interfaces:**
- Consumes：content `Scene`；B1 `Entity`/`makeEntity`；B2 `SpatialIndex`。
- Produces：
  - `interface WorldState { controlledId: string; vars: Map<string, unknown> }`（L1，仅内存）。
  - `interface SceneRuntime { scene: Scene; entities: Map<string, Entity>; index: SpatialIndex; dialog: DialogState | null }`。
  - `createSceneRuntime(scene: Scene): SceneRuntime`（实例化实体、建空间索引、玩家置于 entry）。
  - 实体 AABB 工具：`entityAabb(e: Entity): Aabb | null`（transform + collision.box，无 collision 返回 null）。
- `DialogState` 由 B6 定义并 re-export（见 B6 Interfaces）。

- [ ] **Step 1：测试**

```ts
import { describe, expect, it } from 'vitest'
import scene from '@type-pal/content/scenes/slice1-inn/scene.json' with { type: 'json' }
import text from '@type-pal/content/scenes/slice1-inn/text.json' with { type: 'json' }
import { parseScene } from '@type-pal/content'
import { createSceneRuntime } from './scene-runtime.js'
describe('createSceneRuntime', () => {
  it('实例化全部实体 + 玩家在 entry + 空间索引含 solid 实体', () => {
    const { scene: s } = parseScene(scene, text)
    const rt = createSceneRuntime(s)
    expect(rt.entities.size).toBe(3)
    expect(rt.entities.get('player')!.components.transform).toMatchObject({ x: 48, y: 48 })
    // npc-keeper solid → 在索引里（按其 AABB 查得到）
    expect(rt.index.queryAabb({ x: 80, y: 40, w: 24, h: 16 })).toContain('npc-keeper')
  })
})
```
> 注：`@type-pal/content/scenes/...`、`/assets/...` 子路径 import 依赖 Task 0 已配的 content `exports`（`./scenes/*`、`./assets/*`）。

- [ ] **Step 2→4：实现**

```ts
// world-state.ts
export interface WorldState { controlledId: string; vars: Map<string, unknown> }
export function createWorldState(controlledId: string): WorldState { return { controlledId, vars: new Map() } }
```
```ts
// scene-runtime.ts
import type { Scene } from '@type-pal/content'
import { type Entity, makeEntity } from '../entity/entity.js'
import { type Aabb } from '../systems/aabb.js'
import { SpatialIndex } from '../systems/spatial-index.js'
import type { DialogState } from '../systems/cutscene-runner.js'

export interface SceneRuntime { scene: Scene; entities: Map<string, Entity>; index: SpatialIndex; dialog: DialogState | null }

export function entityAabb(e: Entity): Aabb | null {
  const t = e.components.transform, c = e.components.collision
  if (!t || !c) return null
  return { x: t.x + c.box.offX, y: t.y + c.box.offY, w: c.box.w, h: c.box.h }
}

export function createSceneRuntime(scene: Scene): SceneRuntime {
  const entities = new Map<string, Entity>()
  const index = new SpatialIndex(scene.map.tileSize)
  for (const def of scene.entities) {
    const e = makeEntity(def)
    entities.set(e.id, e)
    const box = entityAabb(e)
    if (box && e.components.collision?.solid) index.insert(e.id, box)
  }
  return { scene, entities, index, dialog: null }
}
```

- [ ] **Step 5：Commit** `feat(reforge): 三层状态 L1 world-state + L3 scene-runtime(实例化+空间索引)`

---

### Task B6：cutscene-runner —— action handler 注册表 + dialog

**Files:** Create `src/systems/cutscene-runner.ts`；Test `src/systems/cutscene-runner.test.ts`

**Interfaces:**
- Consumes：content `Cutscene`/`DialogAction`/`TextTable`。
- Produces：
  - `interface DialogState { speaker?: string; page: string; pageIndex: number; totalPages: number }`（page=已查表的 zh 文本）。
  - `class CutsceneRunner { constructor(texts: TextTable); start(cs: Cutscene): void; get active(): boolean; get dialog(): DialogState | null; advance(): void }`。
  - action handler 注册表：`type ActionHandler = (action, ctx) => ...`，`register('dialog', handler)`；本切片只注册 dialog。

- [ ] **Step 1：测试**

```ts
import { describe, expect, it } from 'vitest'
import { asCutsceneId, asTextId, type Cutscene, type TextTable } from '@type-pal/content'
import { CutsceneRunner } from './cutscene-runner.js'
const texts = { 'k.name': { zh: '店小二' }, 'k.l1': { zh: '你好' }, 'k.l2': { zh: '再会' } } as unknown as TextTable
const cs: Cutscene = { id: asCutsceneId('cs'), actions: [{ type: 'dialog', speaker: asTextId('k.name'), pages: [asTextId('k.l1'), asTextId('k.l2')] }] }
describe('CutsceneRunner', () => {
  it('start→显示首页查表文本；advance 翻页；末页后结束', () => {
    const r = new CutsceneRunner(texts)
    r.start(cs)
    expect(r.active).toBe(true)
    expect(r.dialog).toMatchObject({ speaker: '店小二', page: '你好', pageIndex: 0, totalPages: 2 })
    r.advance()
    expect(r.dialog!.page).toBe('再会')
    r.advance()
    expect(r.active).toBe(false)
    expect(r.dialog).toBeNull()
  })
})
```

- [ ] **Step 2→4：实现**

```ts
import type { Cutscene, CutsceneAction, DialogAction, TextTable } from '@type-pal/content'
export interface DialogState { speaker?: string; page: string; pageIndex: number; totalPages: number }

export class CutsceneRunner {
  private handlers = new Map<CutsceneAction['type'], (a: CutsceneAction) => void>()
  private queue: CutsceneAction[] = []
  private dialogAction: DialogAction | null = null
  private pageIndex = 0
  constructor(private readonly texts: TextTable) {
    // action handler 注册表（D2「OpcodeHandler 注册表」红线在切片的形态）
    this.register('dialog', (a) => { this.dialogAction = a as DialogAction; this.pageIndex = 0 })
  }
  register(type: CutsceneAction['type'], h: (a: CutsceneAction) => void): void { this.handlers.set(type, h) }
  private t(id: string): string { return this.texts[id as never]?.zh ?? `?${id}?` }
  start(cs: Cutscene): void { this.queue = [...cs.actions]; this.runNext() }
  private runNext(): void {
    const a = this.queue.shift()
    if (!a) { this.dialogAction = null; return }
    const h = this.handlers.get(a.type)
    if (!h) throw new Error(`CutsceneRunner: 未注册 action "${a.type}"`)
    h(a)
  }
  get active(): boolean { return this.dialogAction !== null || this.queue.length > 0 }
  get dialog(): DialogState | null {
    const a = this.dialogAction
    if (!a) return null
    return { speaker: a.speaker ? this.t(a.speaker) : undefined, page: this.t(a.pages[this.pageIndex]!),
             pageIndex: this.pageIndex, totalPages: a.pages.length }
  }
  advance(): void {
    const a = this.dialogAction; if (!a) return
    if (this.pageIndex < a.pages.length - 1) this.pageIndex++
    else { this.dialogAction = null; this.runNext() } // 当前 dialog 结束 → 下一个 action
  }
}
```

- [ ] **Step 5：Commit** `feat(reforge): CutsceneRunner —— action handler 注册表 + dialog 翻页`

---

### Task B7：interaction —— 面朝判定 → 起演出

**Files:** Create `src/systems/interaction.ts`；Test `src/systems/interaction.test.ts`

**Interfaces:**
- Consumes：B5 `SceneRuntime`/`entityAabb`；content `Facing`/`Trigger`。
- Produces：`findInteractTarget(rt: SceneRuntime, playerId: string, reach: number): string | null`（玩家面朝方向探一个 `reach` px 的探测框，命中**有 interaction 组件**的实体则返回其 id）；`triggerCutsceneFor(rt, entityId): CutsceneId | null`（查 triggers 里 `interact` 命中该 entity 的 run）。

- [ ] **Step 1：测试**

```ts
import { describe, expect, it } from 'vitest'
import scene from '@type-pal/content/scenes/slice1-inn/scene.json' with { type: 'json' }
import text from '@type-pal/content/scenes/slice1-inn/text.json' with { type: 'json' }
import { parseScene } from '@type-pal/content'
import { createSceneRuntime } from '../engine/scene-runtime.js'
import { findInteractTarget, triggerCutsceneFor } from './interaction.js'
describe('interaction', () => {
  it('玩家面朝 NPC → 命中并取到 cutscene；面朝空处 → null', () => {
    const { scene: s } = parseScene(scene, text)
    const rt = createSceneRuntime(s)
    // 玩家放到 NPC 左侧、朝右
    rt.entities.get('player')!.components.transform = { x: 56, y: 40, facing: 'right' }
    const hit = findInteractTarget(rt, 'player', 12)
    expect(hit).toBe('npc-keeper')
    expect(triggerCutsceneFor(rt, hit!)).toBe('cs.keeper-hi')
    rt.entities.get('player')!.components.transform = { x: 48, y: 48, facing: 'left' }
    expect(findInteractTarget(rt, 'player', 12)).toBeNull()
  })
})
```

- [ ] **Step 2→4：实现**

```ts
import type { CutsceneId } from '@type-pal/content'
import { type SceneRuntime, entityAabb } from '../engine/scene-runtime.js'
import type { Aabb } from './aabb.js'
const DIR: Record<string, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
export function findInteractTarget(rt: SceneRuntime, playerId: string, reach: number): string | null {
  const p = rt.entities.get(playerId); const box = p && entityAabb(p); const t = p?.components.transform
  if (!box || !t) return null
  const [dx, dy] = DIR[t.facing]!
  const probe: Aabb = { x: box.x + dx * reach, y: box.y + dy * reach, w: box.w, h: box.h }
  for (const id of rt.index.queryAabb(probe)) {
    if (id !== playerId && rt.entities.get(id)?.components.interaction) return id
  }
  return null
}
export function triggerCutsceneFor(rt: SceneRuntime, entityId: string): CutsceneId | null {
  for (const tr of rt.scene.triggers) if (tr.when.type === 'interact' && tr.when.target === entityId) return tr.run
  return null
}
```

- [ ] **Step 5：Commit** `feat(reforge): interaction 面朝探测 + trigger→cutscene 查询`

---

### Task B8：input —— 键态 → 高层意图（纯映射）

**Files:** Create `src/input/input.ts`；Test `src/input/input.test.ts`

**Interfaces:**
- Produces：`interface Intents { dx: number; dy: number; interact: boolean; advance: boolean }`；`type KeySet = ReadonlySet<string>`；`mapKeysToIntents(keys: KeySet, speed: number): Intents`（默认键位：方向键/WASD 动，Space/Enter 既 interact 又 advance —— 由调用方按是否在对话态二选一消费）。

- [ ] **Step 1：测试**

```ts
import { describe, expect, it } from 'vitest'
import { mapKeysToIntents } from './input.js'
describe('mapKeysToIntents', () => {
  it('右+下 → dx,dy 正；速度生效', () => {
    expect(mapKeysToIntents(new Set(['ArrowRight', 'ArrowDown']), 3)).toMatchObject({ dx: 3, dy: 3 })
  })
  it('Space → interact & advance 同 true', () => {
    expect(mapKeysToIntents(new Set([' ']), 3)).toMatchObject({ interact: true, advance: true })
  })
})
```

- [ ] **Step 2→4：实现**

```ts
export interface Intents { dx: number; dy: number; interact: boolean; advance: boolean }
export type KeySet = ReadonlySet<string>
export function mapKeysToIntents(keys: KeySet, speed: number): Intents {
  let dx = 0, dy = 0
  if (keys.has('ArrowLeft') || keys.has('a')) dx -= speed
  if (keys.has('ArrowRight') || keys.has('d')) dx += speed
  if (keys.has('ArrowUp') || keys.has('w')) dy -= speed
  if (keys.has('ArrowDown') || keys.has('s')) dy += speed
  const act = keys.has(' ') || keys.has('Enter')
  return { dx, dy, interact: act, advance: act }
}
```

- [ ] **Step 5：Commit** `feat(reforge): mapKeysToIntents 键态→意图(默认键位)`

---

### Task B9：engine-context + 固定步长 tick（headless 集成）

**Files:** Create `src/render/renderer.ts`（仅接口）、`src/engine/engine-context.ts`、`src/engine/tick.ts`；Test `src/engine/tick.test.ts`

**Interfaces:**
- Produces：
  - `interface Renderer { uploadAssets(assets: Map<string, import('@type-pal/content').Rgba>): void; render(rt: SceneRuntime, camera: Camera): void }`（阶段 C 实现 WebGL2 版；测试打桩）。
  - `interface Camera { x: number; y: number }`。
  - `interface EngineContext { world: WorldState; rt: SceneRuntime; runner: CutsceneRunner; renderer: Renderer; speed: number; reach: number; edgeInteract: boolean }`。
  - `createEngine(deps: { scene: Scene; texts: TextTable; renderer: Renderer; speed?: number; reach?: number }): EngineContext`。
  - `tick(ctx: EngineContext, keys: KeySet): void`（一个**逻辑步**：对话态 → 边沿 advance；否则 → resolveMove 应用 + 边沿 interact 起演出）。edgeInteract 由 ctx 内部记忆上一帧键态做边沿检测。

- [ ] **Step 1：集成测试**（headless：stub renderer，脚本化驱动）

```ts
import { describe, expect, it } from 'vitest'
import scene from '@type-pal/content/scenes/slice1-inn/scene.json' with { type: 'json' }
import text from '@type-pal/content/scenes/slice1-inn/text.json' with { type: 'json' }
import { parseScene } from '@type-pal/content'
import { createEngine } from './engine-context.js'
import { tick } from './tick.js'
const stubRenderer = { uploadAssets() {}, render() {} }
function setup() { const { scene: s, texts } = parseScene(scene, text); return createEngine({ scene: s, texts, renderer: stubRenderer, speed: 4, reach: 12 }) }

describe('tick 集成', () => {
  it('按右走若干帧 → 玩家向右移动', () => {
    const ctx = setup(); const x0 = ctx.rt.entities.get('player')!.components.transform!.x
    for (let i = 0; i < 3; i++) tick(ctx, new Set(['ArrowRight']))
    expect(ctx.rt.entities.get('player')!.components.transform!.x).toBeGreaterThan(x0)
  })
  it('撞左墙 → 贴墙停住', () => {
    const ctx = setup()
    for (let i = 0; i < 30; i++) tick(ctx, new Set(['ArrowLeft']))
    const t = ctx.rt.entities.get('player')!.components.transform!
    expect(t.x + 8).toBeGreaterThanOrEqual(32) // AABB 左边(offX=8)顶在 col1,进不了 col0 墙格
  })
  it('面朝 NPC 按交互(边沿) → 对话开;再按 → 翻页;末页再按 → 关', () => {
    const ctx = setup()
    ctx.rt.entities.get('player')!.components.transform = { x: 56, y: 40, facing: 'right' }
    tick(ctx, new Set([' ']))                 // 边沿:起对话
    expect(ctx.runner.dialog?.page).toBe('客官，打尖还是住店？')
    tick(ctx, new Set())                       // 松键
    tick(ctx, new Set([' ']))                 // 边沿:翻页
    expect(ctx.runner.dialog?.page).toBe('楼上请！')
    tick(ctx, new Set()); tick(ctx, new Set([' ']))
    expect(ctx.runner.active).toBe(false)
  })
})
```

- [ ] **Step 2→4：实现**

```ts
// renderer.ts
import type { Rgba } from '@type-pal/content'
import type { SceneRuntime } from '../engine/scene-runtime.js'
export interface Camera { x: number; y: number }
export interface Renderer { uploadAssets(assets: Map<string, Rgba>): void; render(rt: SceneRuntime, camera: Camera): void }
```
```ts
// engine-context.ts
import type { Scene, TextTable } from '@type-pal/content'
import { createWorldState, type WorldState } from './world-state.js'
import { createSceneRuntime, type SceneRuntime } from './scene-runtime.js'
import { CutsceneRunner } from '../systems/cutscene-runner.js'
import type { Renderer } from '../render/renderer.js'
export interface EngineContext {
  world: WorldState; rt: SceneRuntime; runner: CutsceneRunner; renderer: Renderer
  speed: number; reach: number; prevAct: boolean
}
export function createEngine(deps: { scene: Scene; texts: TextTable; renderer: Renderer; speed?: number; reach?: number }): EngineContext {
  const rt = createSceneRuntime(deps.scene)
  return { world: createWorldState('player'), rt, runner: new CutsceneRunner(deps.texts),
           renderer: deps.renderer, speed: deps.speed ?? 2, reach: deps.reach ?? 12, prevAct: false }
}
```
```ts
// tick.ts
import { type KeySet, mapKeysToIntents } from '../input/input.js'
import { entityAabb } from './scene-runtime.js'
import { isBlockedByLayer } from '../systems/collision.js'
import { aabbOverlap, type Aabb } from '../systems/aabb.js'
import { resolveMove } from '../systems/movement.js'
import { findInteractTarget, triggerCutsceneFor } from '../systems/interaction.js'
import type { EngineContext } from './engine-context.js'

export function tick(ctx: EngineContext, keys: KeySet): void {
  const intents = mapKeysToIntents(keys, ctx.speed)
  const edge = intents.advance && !ctx.prevAct // 边沿检测：按下瞬间才触发一次
  ctx.prevAct = intents.advance

  if (ctx.runner.active) { if (edge) ctx.runner.advance(); return } // 对话态：暂停移动

  const player = ctx.rt.entities.get(ctx.world.controlledId)!
  const t = player.components.transform!, c = player.components.collision!
  const box: Aabb = { x: t.x + c.box.offX, y: t.y + c.box.offY, w: c.box.w, h: c.box.h }
  const isBlocked = (test: Aabb): boolean => {
    if (isBlockedByLayer(ctx.rt.scene.map.collision, ctx.rt.scene.map.tileSize, test)) return true
    for (const id of ctx.rt.index.queryAabb(test)) {
      if (id === player.id) continue
      const other = entityAabb(ctx.rt.entities.get(id)!)
      if (other && aabbOverlap(test, other)) return true
    }
    return false
  }
  const r = resolveMove(box, { dx: intents.dx, dy: intents.dy }, isBlocked)
  t.x = r.x - c.box.offX; t.y = r.y - c.box.offY              // applier：唯一写坐标处
  if (intents.dx < 0) t.facing = 'left'; else if (intents.dx > 0) t.facing = 'right'
  else if (intents.dy < 0) t.facing = 'up'; else if (intents.dy > 0) t.facing = 'down'

  if (edge) { // 边沿交互：面朝有 interaction 的实体 → 起演出
    const target = findInteractTarget(ctx.rt, player.id, ctx.reach)
    if (target) { const cs = triggerCutsceneFor(ctx.rt, target)
      const def = cs && ctx.rt.scene.cutscenes.find((x) => x.id === cs)
      if (def) ctx.runner.start(def) }
  }
}
```

- [ ] **Step 5：跑全部 reforge 测试 → PASS + Commit**

Run: `pnpm --filter @type-pal/reforge exec vitest run`
```bash
git add packages/reforge/src
git commit -m "feat(reforge): engine-context + 固定步长 tick(移动/交互/对话) headless 集成测试"
```

---

# 阶段 C · @type-pal/reforge 渲染 + dev 入口（浏览器验收）

> **诚实说明**：像素输出无法单测（spec §13 验收 = 浏览器手测）。本阶段任务以"实现 + 浏览器目视确认"为节奏；可单测的纯逻辑（相机夹边界）仍走 TDD。GL/着色器给出真实代码，但最终对着 canvas 调。

### Task C1：相机（follow + clamp，clamp 可测）

**Files:** Create `src/render/camera.ts`；Test `src/render/camera.test.ts`

**Interfaces:**
- Produces：`computeCamera(focusX: number, focusY: number, viewW: number, viewH: number, mapW: number, mapH: number): Camera`（居中聚焦点，夹到 [0, mapPx-view]；地图小于视口时夹到 0）。

- [ ] **Step 1：测试**

```ts
import { describe, expect, it } from 'vitest'
import { computeCamera } from './camera.js'
describe('computeCamera', () => {
  it('居中且夹左上边界', () => { expect(computeCamera(0, 0, 320, 200, 1000, 1000)).toEqual({ x: 0, y: 0 }) })
  it('夹右下边界', () => { expect(computeCamera(9999, 9999, 320, 200, 1000, 1000)).toEqual({ x: 680, y: 800 }) })
  it('地图比视口小 → 夹 0', () => { expect(computeCamera(50, 50, 320, 200, 192, 128)).toEqual({ x: 0, y: 0 }) })
})
```

- [ ] **Step 2→4：实现**

```ts
import type { Camera } from './renderer.js'
export function computeCamera(fx: number, fy: number, vw: number, vh: number, mapW: number, mapH: number): Camera {
  const clamp = (v: number, max: number) => Math.max(0, Math.min(v, Math.max(0, max)))
  return { x: clamp(fx - vw / 2, mapW - vw), y: clamp(fy - vh / 2, mapH - vh) }
}
```

- [ ] **Step 5：Commit** `feat(reforge): computeCamera follow+clamp`

---

### Task C2：WebGL2 纹理上传 + textured-quad 批渲染器

**Files:** Create `src/render/gpu-texture.ts`、`src/render/webgl-renderer.ts`

**Interfaces:**
- Consumes：content `Rgba`；B9 `Renderer`/`Camera`；B5 `SceneRuntime`/`entityAabb`；C1 `computeCamera`。
- Produces：`class WebglRenderer implements Renderer`（构造接 `canvas` + content 资产元信息：每个 sprite/tileset 的 Rgba 已上传为纹理；瓦片从 tileset 纹理按 tileSize 切 UV；实体精灵整张画到 transform 锚点）。

- [ ] **Step 1：写着色器 + 纹理上传**（gpu-texture.ts）

```ts
import type { Rgba } from '@type-pal/content'
export function uploadTexture(gl: WebGL2RenderingContext, img: Rgba): WebGLTexture {
  const tex = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, img.width, img.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, img.data)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST) // 像素风：最近邻
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return tex
}
export const VERT = `#version 300 es
in vec2 aPos; in vec2 aUv; uniform vec2 uView; out vec2 vUv;
void main(){ vUv=aUv; vec2 p=(aPos/uView)*2.0-1.0; gl_Position=vec4(p.x,-p.y,0.0,1.0); }`
export const FRAG = `#version 300 es
precision mediump float; in vec2 vUv; uniform sampler2D uTex; out vec4 o;
void main(){ vec4 c=texture(uTex,vUv); if(c.a<0.5) discard; o=c; }`
```

- [ ] **Step 2：实现 WebglRenderer**（编译程序、按相机画瓦片层 → 实体按基线排序 → occludesActors 层）。绘制每个 quad：世界坐标 - camera → 屏幕像素，uView=画布像素尺寸。瓦片：`tiles[r*w+c]` ≥0 时从 tileset 纹理切第 idx 块 UV。实体：整张 sprite 画到 `transform` 锚点（脚部）。排序 key = 实体脚部 y。

> 完整 GL 装配代码（program 链接、VAO、逐 quad 顶点）在执行时落，对着 canvas 调；核心 = 上面着色器 + 每 quad 6 顶点 (pos,uv)。**不引第三方渲染库**（YAGNI，textured quad 手写即可）。

- [ ] **Step 3：目视确认**：dev 入口（C5）跑起来后，房间瓦片 + 玩家 + NPC + 桌子按位置画出、NPC/桌在玩家身后时被正确遮挡顺序。

- [ ] **Step 4：Commit** `feat(reforge): WebGL2 纹理上传 + textured-quad 批渲染(瓦片+实体基线排序)`

---

### Task C3：后处理 identity pass（D4 一等公民插入点）

**Files:** Create `src/render/post-process.ts`；Modify `webgl-renderer.ts`（渲到离屏 framebuffer → identity pass 上屏）

**Interfaces:**
- Produces：`class PostProcess { constructor(gl, w, h); begin(): void /* 绑离屏 FBO */; end(): void /* identity 着色器上屏 */ }`。本刀 fragment = 直采样（`o=texture(uTex,vUv)`），留作昼夜/天气接入点。

- [ ] **Step 1：实现**：创建 FBO + 颜色纹理；`begin` 绑 FBO，世界渲到纹理；`end` 解绑、用全屏三角 + identity frag 采样上屏。
- [ ] **Step 2：目视确认**：画面与无后处理时一致（identity 不改像素）。
- [ ] **Step 3：Commit** `feat(reforge): 后处理 pass(identity 占位) —— D4 渲染管线插入点`

---

### Task C4：Canvas2D 文字叠层（对话框 + 中文翻页）

**Files:** Create `src/render/text-overlay.ts`

**Interfaces:**
- Consumes：B6 `DialogState`。
- Produces：`class TextOverlay { constructor(canvas2d: CanvasRenderingContext2D); draw(dialog: DialogState | null): void }`（dialog 非空 → 画底部对话框 + speaker + 当前页文本 + "▼ 翻页"提示；空 → 清空叠层）。

- [ ] **Step 1：实现**：半透明圆角框 + `ctx.fillText`（中文走系统字体，本刀不做字形图集）。叠层 canvas 叠在 WebGL canvas 上（C5 在 HTML 里堆两层）。
- [ ] **Step 2：目视确认**：对话时框+文字出现，翻页文本切换，结束消失。
- [ ] **Step 3：Commit** `feat(reforge): Canvas2D 对话框文字叠层`

---

### Task C5：dev 入口 + 浏览器资产加载 + rAF 主循环

**Files:** Create `packages/reforge/vite.config.ts`、`dev/index.html`、`dev/main.ts`、`src/loop/main-loop.ts`、`src/boot/load-browser.ts`

**Interfaces:**
- Produces：
  - `load-browser.ts`：`async loadSliceInBrowser(): Promise<{ scene: Scene; texts: TextTable; assets: Map<string, Rgba> }>`（vite `import ... with {type:'json'}` 拿 scene/text/index；`fetch` PNG + palette → `decodeIndexedPng` → assets map）。
  - `main-loop.ts`：`startLoop(step: (dt: number) => void, now: () => number): () => void`（rAF + 固定步长累加器；返回 stop）。dev 用 `() => performance.now()` 注入时钟。
  - `dev/main.ts`：建 canvas(WebGL2)+canvas(2D 叠层)、`loadSliceInBrowser` → `createEngine`（renderer=WebglRenderer）→ 监听键盘维护 KeySet → `startLoop` 内每固定步 `tick(ctx, keys)` + `renderer.render` + `textOverlay.draw(runner.dialog)`。

- [ ] **Step 1：vite.config.ts**（dev 根指向 dev/，允许读 content 包）

```ts
import { defineConfig } from 'vite'
export default defineConfig({
  root: 'dev',
  server: { port: 5273, strictPort: true, fs: { allow: ['..', '../..'] } },
})
```

- [ ] **Step 2：index.html**（两层 canvas 叠放）

```html
<!doctype html><meta charset="utf-8"><title>reforge slice 1</title>
<style>body{margin:0;background:#111}#wrap{position:relative;width:640px;height:400px;margin:20px auto}
canvas{position:absolute;inset:0;width:640px;height:400px;image-rendering:pixelated}</style>
<div id="wrap"><canvas id="gl" width="320" height="200"></canvas><canvas id="ui" width="640" height="400"></canvas></div>
<script type="module" src="./main.ts"></script>
```

- [ ] **Step 3：main-loop.ts + load-browser.ts + main.ts** 实现（固定步长见下；其余按 Interfaces 落）

```ts
// main-loop.ts —— 固定步长累加器,注入时钟(议题13 地基)
export function startLoop(step: (dt: number) => void, now: () => number, hz = 60): () => void {
  const dt = 1000 / hz; let last = now(); let acc = 0; let raf = 0
  const frame = () => { const t = now(); acc += t - last; last = t
    while (acc >= dt) { step(dt); acc -= dt }
    raf = requestAnimationFrame(frame) }
  raf = requestAnimationFrame(frame)
  return () => cancelAnimationFrame(raf)
}
```

- [ ] **Step 4：浏览器验收**（spec §13）

Run: `pnpm --filter @type-pal/reforge dev` → 开 `http://localhost:5273`
确认：①方向键/WASD 走动 ②撞墙/撞桌/撞 NPC 过不去 ③走到 NPC 朝它按空格 → 对话框出 ④空格翻页 ⑤末页空格关闭、恢复走动。**亲自跑过再勾**（不拿用户当测试员）。

- [ ] **Step 5：Commit** `feat(reforge): dev 入口 + 浏览器资产加载 + rAF 主循环 —— 切片 1 跑通`

---

## 自查（writing-plans Self-Review，已过）

- **spec 覆盖**：§2 包/目录→Task0,A,B,C；§3 schema→A1；§4 资产/解码→A2,A4；§5 三层→B5,B9；§6 实体子系统→B1–B8；§7 移动→B3,B4,B9；§8 演出→B6,B7；§9 渲染→C1–C4；§10 主循环/输入/时钟→B8,C5；§11 错误处理→A3；§12 模块边界→各 Task Interfaces；§13 测试→各 Task + B9 集成 + C5 验收；§14 构建顺序=本计划阶段序。无缺口。
- **占位扫描**：无 TBD/TODO；C2/C3 的 GL 装配标注"执行时对着 canvas 落"是渲染本质（spec §13 像素手测），非逻辑占位——已给着色器/上传/主循环真实代码。
- **类型一致**：`Aabb`/`MoveIntent`/`MoveResult`/`Renderer`/`Camera`/`SceneRuntime`/`DialogState`/`Intents` 跨 Task 同名同签名；`resolveMove(box,intent,isBlocked)`、`createSceneRuntime(scene)`、`tick(ctx,keys)`、`computeCamera(...)` 各处一致。

## 执行交接

实现时二选一：①**subagent-driven**（每 Task 派新 subagent + Task 间复核，推荐）②**inline executing-plans**（本会话批量 + 检查点）。阶段 A/B 纯逻辑适合 TDD 严格走；阶段 C 渲染按"实现 + 浏览器目视"。
