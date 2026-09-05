> **历史文档（2026-09-06 标注）**：本文写作于方案设计/计划阶段，正文中的执行指令、
> Agent 分工、版本号与“当前状态”均为**当时快照**，不是现行契约或待办；已被后续
> current-only / canonical 实现取代的方案不恢复。现行真值见 docs/phase2/READ-FIRST.md
> 与 capability-map.md。

# P2 · 素材加载改经 FileSource 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `assets.ts` 的全部 `fetch` 改成经工程的 `FileSource` 读——**零行为变化**(pal 仍用 `/extracted` 绝对路径,httpSource 透传 = 同一 fetch)。做完后素材读取有了统一收口,P3 的 `fsaSource` 才能让本地工程离线渲染。

**Architecture:** `AssetBase` 加一个可选 `source: FileSource`(`loadProjectFrom` 注入)。assets.ts 各 `load*` 内部改走两个 helper(`readAssetBytes`/`readAssetJson`):有 `base.source` → 经它读;无 → 裸 `fetch`(向后兼容,零行为变化)。**74 个调用点一个都不改**(它们照传 `base`,`base` 现在带 `source`)。

**Tech Stack:** TypeScript,vitest,`@type-pal/reforge`。

## Global Constraints

- **零行为变化**:P2 结束,编辑器(6010)+ 引擎(6051)载 pal 的渲染/表现与现在完全一致。pal 的 `manifest.assets` 不动(仍 `/extracted` 绝对),靠 httpSource 的 `/` 开头透传规则走同一 fetch。
- **最小 diff**:只动 `assets.ts`(内部读法)+ `loader.ts`(assetBase 注入 source)。**不改 74 个调用点**;不动 pal 数据/manifest(自包含重打包留 P3);不改公式/交互。
- **向后兼容**:`base.source` 缺省(如手搓 AssetBase 的测试)→ 走裸 fetch,行为不变。
- 每检查点跑 `pnpm --filter @type-pal/reforge run check` 全绿,末尾跑全仓 `pnpm check`。
- 提交信息中文,结尾 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`。

---

## Task 1: AssetBase 挂 source + 读取 helper + loader 注入

**Files:**
- Modify: `packages/reforge/src/assets.ts`(AssetBase 加 source;加 `readAssetBytes`/`readAssetJson`)
- Modify: `packages/reforge/src/loader.ts`(loadProjectFrom 给 assetBase 注入 source)
- Test: `packages/reforge/src/assets.test.ts`(新建:helper 经 mock source 读 / 缺 source 走 fetch)

**Interfaces:**
- Consumes: `FileSource`(P1,`./file-source.js`)
- Produces:
  - `AssetBase.source?: FileSource`
  - `readAssetBytes(base: AssetBase, path: string, label: string): Promise<Uint8Array>`(module 内部,不导出)
  - `readAssetJson<T>(base: AssetBase, path: string): Promise<T>`(module 内部)

- [ ] **Step 1: 写失败测试**

新建 `packages/reforge/src/assets.test.ts`:

```ts
import { describe, expect, test, vi } from 'vitest'
import type { FileSource } from './file-source.js'
import { loadPalette, loadTilemap } from './assets.js'
import type { AssetBase } from './assets.js'

const base = (source?: FileSource): AssetBase => ({
  root: '/extracted/data',
  maps: 'tilemap',
  tilesets: 'tileset',
  sprites: 'sprite',
  palettes: 'palette',
  sounds: '',
  music: '',
  portraits: '',
  faces: '',
  itemIcons: '',
  ...(source ? { source } : {}),
})

function memSource(json: unknown): FileSource {
  return {
    readText: async () => JSON.stringify(json),
    readJson: async <T>() => json as T,
    readBytes: async () => new ArrayBuffer(0),
    urlFor: async (rel: string) => rel,
  }
}

describe('assets.ts 经 FileSource 读', () => {
  test('有 base.source → loadTilemap/loadPalette 走 source(不碰 fetch)', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const src = memSource({ width: 2, height: 2, tiles: [] })
    expect(await loadTilemap(base(src), 7)).toEqual({ width: 2, height: 2, tiles: [] })
    expect(await loadPalette(base(src), 0)).toEqual({ width: 2, height: 2, tiles: [] })
    expect(fetchMock).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  test('缺 base.source → 走裸 fetch(向后兼容,零行为变化)', async () => {
    const fetchMock = vi.fn(
      async (url: string) => new Response(JSON.stringify({ url }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const r = await loadTilemap(base(), 7)
    expect(r).toEqual({ url: '/extracted/data/tilemap/7.json' })
    expect(fetchMock).toHaveBeenCalledWith('/extracted/data/tilemap/7.json')
    vi.restoreAllMocks()
  })
})
```

- [ ] **Step 2: 跑测试验证失败**

Run: `pnpm --filter @type-pal/reforge exec vitest run src/assets.test.ts`
Expected: FAIL(有 source 的用例:当前 loadTilemap 仍裸 fetch → `fetch` 被调用,断言 `not.toHaveBeenCalled` 失败)

- [ ] **Step 3a: AssetBase 加 source + import**

`packages/reforge/src/assets.ts` 顶部 import 补:

```ts
import type { FileSource } from './file-source.js'
```

`AssetBase` 接口末尾(`uiOverride?` 之后)加:

```ts
  /** 读取源(P2:素材经它读,本地工程离线可渲染;loadProjectFrom 注入)。缺省 = 裸 fetch(向后兼容)。 */
  source?: FileSource
```

- [ ] **Step 3b: 加两个读取 helper**

在 `assets.ts` 现有 `fetchAsset`/`fetchJson`(约 34-48 行)之后加:

```ts
/** 经 source 读素材字节(缺 source → 裸 fetch,向后兼容);404/HTML 按缺失报,附指路。 */
async function readAssetBytes(base: AssetBase, path: string, label: string): Promise<Uint8Array> {
  if (base.source) return new Uint8Array(await base.source.readBytes(path))
  return new Uint8Array(await (await fetchAsset(path, label)).arrayBuffer())
}

/** 经 source 读素材 JSON(缺 source → 裸 fetch)。 */
async function readAssetJson<T>(base: AssetBase, path: string): Promise<T> {
  if (base.source) return base.source.readJson<T>(path)
  return fetchJson<T>(path)
}
```

- [ ] **Step 3c: loadProjectFrom 注入 source 到 assetBase**

`packages/reforge/src/loader.ts` 的 `loadProjectFrom`,把末尾 `return { ...assembleProject(...), source }` 改为顺带把 source 注入 assetBase:

```ts
  const core = assembleProject(manifest, {
    actors, sceneIds, entryScene, skills, items, locale,
    sprites, enemies, enemyTeams, battleFields, poisons,
  })
  return { ...core, assetBase: { ...core.assetBase, source }, source }
```

(`assembleProject` 仍纯核、不动;source 只在 IO 壳注入。)

- [ ] **Step 4: 改 loadTilemap / loadPalette 走 helper(先让本测通过)**

`assets.ts`:

```ts
export function loadTilemap(base: AssetBase, mapNum: number): Promise<Tilemap> {
  return readAssetJson<Tilemap>(base, `${base.root}/${base.maps}/${mapNum}.json`)
}

export function loadPalette(base: AssetBase, palId: number): Promise<Palette> {
  return readAssetJson<Palette>(base, `${base.root}/${base.palettes}/${palId}.json`)
}
```

- [ ] **Step 5: 跑测试验证通过**

Run: `pnpm --filter @type-pal/reforge exec vitest run src/assets.test.ts`
Expected: PASS(2 passed)

- [ ] **Step 6: 提交**

```bash
git add packages/reforge/src/assets.ts packages/reforge/src/assets.test.ts packages/reforge/src/loader.ts
git commit -m "feat(reforge): AssetBase 挂 source + 读取 helper,loadTilemap/Palette 经 FileSource(P2)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 2: 其余 load 函数全部走 helper

**Files:**
- Modify: `packages/reforge/src/assets.ts`(loadTileset/loadSprite/loadBattleSprite/loadEffectSprite/loadFireSprite/loadBattleFields/loadBattleBgFull)

**规则**:每个函数把 `await fetchAsset(url, label).blob()` → `await readAssetBytes(base, url, label)`(返回 Uint8Array,`decompressGzip` 接收 Blob,故包 `new Blob([bytes])`);裸 `fetch(url).json()` → `readAssetJson(base, url)`;`createImageBitmap(await res.blob())` → `createImageBitmap(new Blob([await readAssetBytes(base, url, label)]))`。

- [ ] **Step 1: 改 gzip 类(tileset/sprite/battleSprite/effect/fire)**

这些现在都是 `const res = await fetchAsset(url, label); … parseSpriteChunk(await decompressGzip(await res.blob()))`。逐个改成从 `readAssetBytes` 取字节:

```ts
export async function loadTileset(base: AssetBase, mapNum: number): Promise<Map<number, RleFrame>> {
  const bytes = await readAssetBytes(base, `${base.root}/${base.tilesets}/${mapNum}.rle`, `tileset ${mapNum}`)
  const frames = parseSpriteChunk(await decompressGzip(new Blob([bytes])))
  const map = new Map<number, RleFrame>()
  frames.forEach((f, i) => {
    map.set(i, f)
  })
  return map
}

export async function loadSprite(base: AssetBase, spriteNum: number): Promise<LoadedSprite> {
  const bytes = await readAssetBytes(base, `${base.root}/${base.sprites}/${spriteNum}.rle`, `sprite ${spriteNum}`)
  const frames = parseSpriteChunk(await decompressGzip(new Blob([bytes])))
  const first = frames[0]
  return { frames, anchorX: first ? Math.floor(first.width / 2) : 0, anchorY: first ? first.height : 0 }
}

export async function loadBattleSprite(base: AssetBase, kind: 'enemy' | 'player', id: number): Promise<LoadedSprite> {
  const bytes = await readAssetBytes(base, `${base.root}/battle-sprite/${kind}/${id}.rle`, `battle sprite ${kind}/${id}`)
  const frames = parseSpriteChunk(await decompressGzip(new Blob([bytes])))
  const first = frames[0]
  return { frames, anchorX: first ? Math.floor(first.width / 2) : 0, anchorY: first ? first.height : 0 }
}

export async function loadEffectSprite(base: AssetBase): Promise<LoadedSprite> {
  const bytes = await readAssetBytes(base, `${base.root}/magic/effect.rle`, 'effect sprite')
  return { frames: parseSpriteChunk(await decompressGzip(new Blob([bytes]))), anchorX: 0, anchorY: 0 }
}

export async function loadFireSprite(base: AssetBase, chunk: number): Promise<LoadedSprite> {
  const bytes = await readAssetBytes(base, `${base.root}/magic/fire-${String(chunk).padStart(2, '0')}.rle`, `fire sprite ${chunk}`)
  return { frames: parseSpriteChunk(await decompressGzip(new Blob([bytes]))), anchorX: 0, anchorY: 0 }
}
```

- [ ] **Step 2: 改 loadBattleFields(JSON)**

```ts
export async function loadBattleFields(base: AssetBase): Promise<Map<number, BattleFieldEntry>> {
  const arr = await readAssetJson<Array<{ id: number; screenWave?: number; magicEffect?: BattleFieldEntry['magicEffect'] }>>(
    base, `${base.root}/battle-fields.json`,
  )
  return new Map(
    arr.map((f) => [f.id, { screenWave: f.screenWave ?? 0, ...(f.magicEffect ? { magicEffect: f.magicEffect } : {}) }]),
  )
}
```

- [ ] **Step 3: 改 loadBattleBgFull(图片,createImageBitmap)**

`imagesRoot` 的 `/data→/images` 硬编码保留(零行为变化;归正留 P3),只把 fetch 换 readAssetBytes:

```ts
  const imagesRoot = base.root.replace(/\/data$/, '/images')
  const path = `${imagesRoot}/${bgPath ?? `battle/bg/${String(id).padStart(3, '0')}.png`}`
  const bytes = await readAssetBytes(base, path, `battle bg ${id}`)
  const bitmap = await createImageBitmap(new Blob([bytes]))
```

(其余 canvas/索引/着色逻辑不动。)

- [ ] **Step 4: reforge check**

Run: `pnpm --filter @type-pal/reforge run check`
Expected: typecheck 通过 + 全部测试通过(225+ 原测 + assets 新测)。

- [ ] **Step 5: 提交**

```bash
git add packages/reforge/src/assets.ts
git commit -m "refactor(reforge): 其余 load 函数全部经 FileSource 读(assets 收口 P2)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 3: 零行为变化验收(浏览器实测)

**分工:** Claude(浏览器实测)。

- [ ] **Step 1: 全仓 check** — `pnpm check`,期望全绿(素材经 source 但 dev 走透传 = 原 fetch,不动 74 调用点故编辑器/game 不受影响)。
- [ ] **Step 2: 编辑器 6010** — 载 pal,切 guijie-minju + 一张迷宫(如 s040):地图/瓦片/精灵渲染如常(证素材经 source 后无回归)。
- [ ] **Step 3: 引擎 6051** — 游戏启动进场景,走动/切场景/战斗背景渲染如常。
- [ ] **Step 4: 记录验收** — 「P2 零行为变化:素材经 FileSource,6010+6051 渲染一致」。

---

## 后续(P2 落地后)

- **P3 · 自包含 pal 重打包 + 本地 IO**:把 pal 素材归入工程相对路径(manifest.assets 相对)→ 靠 P2 的 source 读机制,自包含 pal 经 httpSource(相对)渲染验证;再落 `fsaSource`、`writeProject` 增量+二进制、IndexedDB 句柄+手势重连、打开本地。`loadBattleBgFull` 的 `/data→/images` 硬编码此阶段归正(改 manifest 显式 images 目录)。
- **P4 · 新建 + 启动屏**:种子打包、克隆(整套/空白)、ProjectPicker。

## Self-Review(已过)

- **Spec 覆盖**:P2 对应 design §3(assets.ts 经 source)+ §9(素材加载器改吃 source)。✓
- **占位符**:无;每 load 函数给出确切改后代码。✓
- **类型一致**:`readAssetBytes`/`readAssetJson`/`AssetBase.source` 跨 Task 1↔2 一致;`decompressGzip(Blob)` 签名不变(传 `new Blob([bytes])`)。✓
- **零行为变化保证**:`base.source` 缺省走原 `fetchAsset`/`fetchJson`;dev 有 source 但 httpSource 对 `/extracted…` 透传 = 原 URL 同一 fetch。素材 404/HTML 指路仅在「无 source」分支保留;有 source 分支的错误由 httpSource 抛(带 url+状态码)——可接受(P3 fsaSource 会给本地缺失更精确报错)。
- **blob URL**:P2 用 `readBytes → new Blob([bytes]) → createImageBitmap`,**不产 objectURL**,故 P2 无 revoke 负担;design §3 的 blob 回收针对 P3 fsaSource.urlFor,P2 不涉。
