> **历史文档（2026-09-06 标注）**：本文是已完成的 TDD 计划/设计存档，正文中的执行
> 指令、Agent 分工与“当前状态”是当时快照，不是现行待办。实现结果以 capability-map 与
> 对应任务卡为准。

# 对话外观 ② 实现计划(Canvas2D 适配 + 完整技术点仪表盘)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development(推荐)或 superpowers:executing-plans 逐 Task 实现。Steps 用 checkbox(`- [ ]`)跟踪。

**Goal:** 把对话框外观适配到 reforge 的 Canvas2D(字模 / 颜色 / 阴影 / 打字 / 光标 / 头像 / slot 共存),并把鬼话做成「对话系统全部技术点的完成度仪表盘」——跑一遍直观看到完成度。

**Architecture:** 两层(../decisions.md)):`text/` 通用文本渲染原语(不绑对话)+ `dialog/` 对话渲染(消费 text-render),从 main.ts 闭包拎出。设计全文见 [visual-design.md](visual-design.md);外观真值(坐标 / 色值)见 [GLM spec §3](visual-spec.md);本计划是「三刀」第②刀(① 数据地基已完成、③ 迁移器留后)。

**Tech Stack:** TypeScript(ESM,`.js` 扩展)、Canvas 2D、vitest、pnpm。

## Global Constraints

- **两层纪律(D13)**:`text/` 不知道「对话」存在(物品框 / 旁白 / 菜单将来都复用它);对话特有的(姓名 / 翻页 / 头像 / slot)只在 `dialog/`。
- **新引擎零 lint/type(已立)**:`noNonNullAssertion` 在 reforge 是 **error**;不写 `!`,用显式判空(`const ctx = cvs.getContext('2d'); if (!ctx) throw …`,与 `render.ts:30` bakeFrame 一致)。颜色用 `palette.colors[index]`,不写魔法数字面。
- **打字时钟与逻辑解耦(design §6)**:打字进度走 `performance.now`,不挂 ① 的 10fps 逻辑状态机;① 的 `dialogue.ts`(pageLines/advancePage)**不改**。
- **slot 运行时只渲染显式数据(D14)**:不在运行时猜「说话人→位置」。
- **字模 = Unifont**(非 FONT.MKF):端口 `packages/game/src/present/font.ts` 的 glyph 结构 + `glyphs.json`。
- **测试**:纯逻辑(decodeGlyph / typewriter / palette-color / slot)TDD 单测;**canvas 渲染无法单测**(reforge vitest 是纯 node,happy-dom `getContext` 返 null、node-canvas 未装——见 Task 1 实测注),走 `pnpm --filter @type-pal/reforge run check`(typecheck)+ 浏览器截图验收。
- **gating**:每 Task 末 `pnpm --filter @type-pal/reforge run check` 绿 + biome 0/0。
- 端口源:第一阶段 `present/dialog-box.ts`(渲染 / 常量)、`present/font.ts`(glyph)、`assets/dialog-assets.ts`(头像 / 光标);reforge `assets.ts`(fetch+parseSpriteChunk 模式)、`render.ts`(bakeFrame 离屏 canvas 模式)。

---

## File Structure

| 文件 | 责任 | 动作 |
|---|---|---|
| `packages/reforge/src/text/glyph.ts` | `loadGlyphs`(端口)+ `GlyphTable` + `decodeGlyph`(纯函数:glyph→RGBA)+ `bakeGlyph`(RGBA→离屏 canvas 缓存) | Create |
| `packages/reforge/src/text/glyph.test.ts` | decodeGlyph bit 解析单测(纯逻辑,不碰 canvas) | Create |
| `packages/reforge/src/text/text-render.ts` | `renderSpans`(spans→ctx,三层阴影 + 逐段着色)+ `measureSpans` | Create |
| `packages/reforge/src/text/typewriter.ts` | `charsShown(elapsedMs, speedMs)` 纯函数 + 打字进度逻辑 | Create |
| `packages/reforge/src/text/typewriter.test.ts` | 打字进度单测 | Create |
| `packages/reforge/src/text/palette-color.ts` | `DialogColor`→`palette index`→RGBA 映射 | Create |
| `packages/reforge/src/text/palette-color.test.ts` | 色名→index 映射单测 | Create |
| `packages/reforge/src/dialog/dialog-assets.ts` | 加载光标(DATA chunk12)+ 头像(RGM 占位),端口 | Create |
| `packages/reforge/src/dialog/dialog-box.ts` | `DialogBox`:多 slot 状态 + 渲染(框/姓名/正文/头像/光标) | Create |
| `packages/reforge/src/dialog/slot.ts` | slot 状态机(活跃/留显/推进)纯函数 | Create |
| `packages/reforge/src/dialog/slot.test.ts` | slot 状态机单测 | Create |
| `packages/content/src/index.ts` | `DialogueLine` 加 `slot?`/`portrait?` | Modify |
| `packages/content/src/locale.ts` | 鬼话仪表盘文本(加「远处的鬼」+ 颜色标记) | Modify |
| `packages/reforge/src/assets.ts` | 加 `loadGlyphs`/`loadDialogIcons`/`loadPortrait` fetch | Modify |
| `packages/reforge/src/main.ts` | 删旧 `drawDialogueBox`,改用 `DialogBox` | Modify |

---

## Task 1: glyph 加载 + bake 到离屏 canvas

**Files:**
- Create: `packages/reforge/src/text/glyph.ts`、`glyph.test.ts`
- Modify: `packages/reforge/src/assets.ts`

**Interfaces:**
- Produces:
  - `interface Glyph { width: number; height: number; bitmap: Uint8Array }`(端口 font.ts,MSB-first 按行)
  - `interface GlyphTable { has(cp: number): boolean; get(cp: number): Glyph | undefined }`
  - `loadGlyphs(baseUrl?: string): Promise<GlyphTable>`(端口 `present/font.ts:loadGlyphs`,fetch `/extracted/data/font/glyphs.json`)
  - `decodeGlyph(glyph: Glyph, rgba: readonly [number, number, number]): Uint8Array` — **纯函数**,glyph bitmap(MSB-first 按行)→ RGBA `Uint8Array`(`width*height*4`,亮像素填 rgba+alpha255,暗像素 alpha0)。**核心 bit 解码逻辑可单测**(不碰 DOM/canvas)。
  - `bakeGlyph(cp: number, glyph: Glyph, rgba: readonly [number, number, number]): HTMLCanvasElement` — 把 `decodeGlyph` 结果涂到离屏 canvas(透明背景),按 `(codepoint,rgba)` 缓存。**canvas 涂绘部分留浏览器验**(测试环境无 canvas,见下注)。

> **⚠ 测试环境真相(2026-06-27 实测)**:reforge 的 vitest 是**纯 node 环境**(无 happy-dom/jsdom,且实测 happy-dom 的 `getContext('2d')` 返回 null,node-canvas 未装)。**canvas 操作无法单测**。故 Task 1 把 bit 解码抽成纯函数 `decodeGlyph` 单测;`bakeGlyph` 的 canvas 涂绘(putImageData/drawImage)靠浏览器验收。这覆盖了"bit 解析正确性"这一真风险(MSB-first、跨字节、padding),canvas 涂绘只是把算好的 RGBA 贴上去。

- [ ] **Step 1: 端口 Glyph 类型 + loadGlyphs + decodeGlyph**

`glyph.ts`:从 `packages/game/src/present/font.ts` 端口 `Glyph` 接口 + `loadGlyphs`(逻辑相同——fetch glyphs.json、base64→Uint8Array)。`GlyphTable` 同 font.ts。**不端口** `renderText`/`blitGlyph`(那是 framebuffer 版,Canvas2D 版在 Task 2)。

同时实现纯函数 `decodeGlyph`(bit 解码,可立即单测):
```ts
/** glyph bitmap(MSB-first 按行)→ RGBA Uint8Array;纯函数,不碰 DOM。亮像素=rgba+α255,暗像素=α0。 */
export function decodeGlyph(glyph: Glyph, rgba: readonly [number, number, number]): Uint8Array {
  const out = new Uint8Array(glyph.width * glyph.height * 4)
  const bytesPerRow = Math.ceil(glyph.width / 8)
  for (let row = 0; row < glyph.height; row++) {
    for (let col = 0; col < glyph.width; col++) {
      const byteIdx = row * bytesPerRow + Math.floor(col / 8)
      const bit = ((glyph.bitmap[byteIdx] ?? 0) >> (7 - (col % 8))) & 1
      if (bit) {
        const o = (row * glyph.width + col) * 4
        out[o] = rgba[0]
        out[o + 1] = rgba[1]
        out[o + 2] = rgba[2]
        out[o + 3] = 255
      }
    }
  }
  return out
}
```

- [ ] **Step 2: 写 decodeGlyph 失败测试(纯逻辑,不依赖 canvas)**

`glyph.test.ts`:
```ts
import { describe, expect, test } from 'vitest'
import { decodeGlyph, type Glyph } from './glyph.js'

// 2×2 glyph:左上 + 右下 亮(MSB-first,每行 1 byte)
const g: Glyph = { width: 2, height: 2, bitmap: new Uint8Array([0b10000000, 0b01000000]) }

describe('decodeGlyph', () => {
  test('输出尺寸 = width*height*4', () => {
    expect(decodeGlyph(g, [255, 0, 0]).length).toBe(2 * 2 * 4)
  })

  test('亮像素填 rgba + α255,暗像素 α0', () => {
    const px = decodeGlyph(g, [10, 20, 30])
    // (0,0)亮 → rgba+255
    expect(px.slice(0, 4)).toEqual([10, 20, 30, 255])
    // (1,0)暗 → α0(decodeGlyph 不主动写 RGB,暗像素全 0)
    expect(px.slice(4, 8)).toEqual([0, 0, 0, 0])
    // (0,1)暗
    expect(px.slice(8, 12)).toEqual([0, 0, 0, 0])
    // (1,1)亮
    expect(px.slice(12, 16)).toEqual([10, 20, 30, 255])
  })

  test('跨字节:width=10 → bytesPerRow=2,row1 col9 在第 4 字节(byte[3])', () => {
    // row1 占 byte[2](col0-7) + byte[3](col8-9);col9 → byteIdx=1*2+floor(9/8)=3,bit=(7-9%8)=6
    const wide: Glyph = {
      width: 10,
      height: 2,
      bitmap: new Uint8Array([0, 0, 0, 0b01000000]), // byte[3] bit6 = row1 col9
    }
    const px = decodeGlyph(wide, [1, 1, 1])
    const idx = (1 * 10 + 9) * 4 // row1 col9
    expect(px[idx + 3]).toBe(255) // α255 = 亮
  })
})
```

- [ ] **Step 3: 跑测试确认失败**

Run: `pnpm --filter @type-pal/reforge exec vitest run src/text/glyph.test.ts`
Expected: FAIL(`decodeGlyph` 未定义)

- [ ] **Step 4: 测试通过 + 实现 bakeGlyph(留浏览器验)**

Step 1 已写 decodeGlyph,跑测试应 PASS(3 passed)。再实现 `bakeGlyph`(canvas 涂绘 + 缓存,复用 `decodeGlyph` 算 RGBA):
```ts
const cache = new Map<string, HTMLCanvasElement>()

function glyphCacheKey(cp: number, rgba: readonly [number, number, number]): string {
  return `${cp}:${rgba[0]},${rgba[1]},${rgba[2]}`
}

/** decodeGlyph 结果涂到离屏 canvas;按 (cp,色) 缓存。canvas 部分浏览器验。 */
export function bakeGlyph(
  cp: number,
  glyph: Glyph,
  rgba: readonly [number, number, number],
): HTMLCanvasElement {
  const key = glyphCacheKey(cp, rgba)
  const hit = cache.get(key)
  if (hit) return hit
  const cvs = document.createElement('canvas')
  cvs.width = glyph.width
  cvs.height = glyph.height
  const ctx = cvs.getContext('2d')
  if (!ctx) throw new Error('reforge: glyph 2d context 不可用')
  const img = ctx.createImageData(glyph.width, glyph.height)
  img.data.set(decodeGlyph(glyph, rgba))
  ctx.putImageData(img, 0, 0)
  cache.set(key, cvs)
  return cvs
}
```
> 判空 `if (!ctx) throw` 与 `render.ts:30` 的 `bakeFrame` 现有惯例一致(非 noNonNullAssertion 违例)。

- [ ] **Step 5: 测试通过 + assets loadGlyphs**

Run: `pnpm --filter @type-pal/reforge exec vitest run src/text/glyph.test.ts` → PASS(3 passed)
Run: `pnpm --filter @type-pal/reforge run check` → 绿
`assets.ts` 加 `export { loadGlyphs } from './text/glyph.js'`(或直接在 assets 加 fetch,与现有 loadTilemap 风格一致)。

- [ ] **Step 6: Commit**

```bash
git add packages/reforge/src/text/glyph.ts packages/reforge/src/text/glyph.test.ts packages/reforge/src/assets.ts
git commit -m "feat(reforge): 字模加载 + decodeGlyph(bit→RGBA 纯函数,单测)+ bakeGlyph(离屏 canvas 缓存)"
```

---

## Task 2: 颜色映射 + renderSpans(三层阴影 + 逐段着色)

**Files:**
- Create: `packages/reforge/src/text/palette-color.ts`、`palette-color.test.ts`、`text-render.ts`

**Interfaces:**
- Consumes: `Glyph`/`GlyphTable`/`bakeGlyph`(Task 1)、`TextSpan`/`DialogColor`(@type-pal/content)、`Palette`(@type-pal/shared)
- Produces:
  - `colorIndex(c: DialogColor): number` — 色名→palette index(`default→0x4F / cyan→0x8D / red→0x1A / redAlt→0x17 / yellow→0x2D`,见 GLM spec §3)
  - `resolveRgba(c: DialogColor, palette: Palette): [number,number,number]` — = `palette.colors[colorIndex(c)]`
  - `renderSpans(ctx, spans: TextSpan[], x, y, opts: { glyphs, palette, shadow?, maxChars? }): number` — 逐字符 bakeGlyph + drawImage,三层阴影,返回画到的宽度;`maxChars` = 打字时只画前 N 字

- [ ] **Step 1: 颜色映射失败测试**

`palette-color.test.ts`:
```ts
import { describe, expect, test } from 'vitest'
import { colorIndex } from './palette-color.js'

describe('colorIndex', () => {
  test('色名 → palette index(GLM spec §3 真值)', () => {
    expect(colorIndex('default')).toBe(0x4f)
    expect(colorIndex('cyan')).toBe(0x8d)
    expect(colorIndex('red')).toBe(0x1a)
    expect(colorIndex('redAlt')).toBe(0x17)
    expect(colorIndex('yellow')).toBe(0x2d)
  })
})
```

- [ ] **Step 2: 跑失败**

Run: `pnpm --filter @type-pal/reforge exec vitest run src/text/palette-color.test.ts` → FAIL

- [ ] **Step 3: 实现 palette-color.ts**

```ts
import type { DialogColor } from '@type-pal/content'
import type { Palette } from '@type-pal/shared'

const COLOR_INDEX: Record<DialogColor, number> = {
  default: 0x4f,
  cyan: 0x8d,
  red: 0x1a,
  redAlt: 0x17,
  yellow: 0x2d,
}
/** 姓名牌 title 色(CYAN_ALT) */
export const TITLE_COLOR_INDEX = 0x8c

export function colorIndex(c: DialogColor): number {
  return COLOR_INDEX[c]
}

export function resolveRgba(c: DialogColor, palette: Palette): [number, number, number] {
  return palette.colors[colorIndex(c)] ?? [255, 255, 255]
}

export function indexToRgba(index: number, palette: Palette): [number, number, number] {
  return palette.colors[index] ?? [255, 255, 255]
}
```

- [ ] **Step 4: 测试通过**

Run: `pnpm --filter @type-pal/reforge exec vitest run src/text/palette-color.test.ts` → PASS

- [ ] **Step 5: 实现 renderSpans(无单测,渲染靠后续浏览器验)**

`text-render.ts`:
```ts
import type { TextSpan } from '@type-pal/content'
import type { Palette } from '@type-pal/shared'
import { bakeGlyph, type GlyphTable } from './glyph.js'
import { indexToRgba, resolveRgba } from './palette-color.js'

const SHADOW_RGBA: [number, number, number] = [0, 0, 0] // color 0 = 黑(sdlpal text.c:1144)

export interface RenderSpansOpts {
  glyphs: GlyphTable
  palette: Palette
  shadow?: boolean
  maxChars?: number // 打字:只画前 N 个字符(跨 span 计数);省略 = 全画
  forceColorIndex?: number // 传则全字用该 palette index 色(覆盖 span.color);姓名牌固定 CYAN_ALT 用
}

/** 逐字符 bake+drawImage;三层阴影(+1,0)/(0,+1)/(+1,+1) 黑 + 主色。返回画到的总宽度(px)。 */
export function renderSpans(
  ctx: CanvasRenderingContext2D,
  spans: readonly TextSpan[],
  x: number,
  y: number,
  opts: RenderSpansOpts,
): number {
  let cursorX = x
  let shown = 0
  const limit = opts.maxChars ?? Number.POSITIVE_INFINITY
  for (const span of spans) {
    const rgba =
      opts.forceColorIndex != null
        ? indexToRgba(opts.forceColorIndex, opts.palette)
        : resolveRgba(span.color ?? 'default', opts.palette)
    for (const ch of span.text) {
      if (shown >= limit) return cursorX - x
      const cp = ch.codePointAt(0) ?? 0
      const g = opts.glyphs.get(cp)
      const w = g?.width ?? 16
      if (g) {
        if (opts.shadow) {
          const s = bakeGlyph(cp, g, SHADOW_RGBA)
          ctx.drawImage(s, cursorX + 1, y)
          ctx.drawImage(s, cursorX, y + 1)
          ctx.drawImage(s, cursorX + 1, y + 1)
        }
        ctx.drawImage(bakeGlyph(cp, g, rgba), cursorX, y)
      }
      cursorX += w
      shown++
    }
  }
  return cursorX - x
}

/** 不画,只算宽度(布局用)。 */
export function measureSpans(spans: readonly TextSpan[], glyphs: GlyphTable): number {
  let w = 0
  for (const span of spans) for (const ch of span.text) w += glyphs.get(ch.codePointAt(0) ?? 0)?.width ?? 16
  return w
}
```
> `indexToRgba` 用于 `forceColorIndex` 分支(姓名牌)+ Task 5 光标轮转。

- [ ] **Step 6: typecheck + commit**

Run: `pnpm --filter @type-pal/reforge run check` → 绿(biome 0/0)
```bash
git add packages/reforge/src/text/palette-color.ts packages/reforge/src/text/palette-color.test.ts packages/reforge/src/text/text-render.ts
git commit -m "feat(reforge): 颜色 palette 映射 + renderSpans(三层阴影/逐段着色/maxChars 打字)"
```

---

## Task 3: 打字进度(performance.now 驱动)

**Files:**
- Create: `packages/reforge/src/text/typewriter.ts`、`typewriter.test.ts`

**Interfaces:**
- Produces:
  - `DEFAULT_SPEED_MS = 24`(默认 24ms/字,GLM spec §3)
  - `charsShown(elapsedMs: number, speedMs: number): number` — `= Math.floor(elapsedMs / speedMs)`
  - `isLineDone(elapsedMs, speedMs, totalChars, autoAdvanceMs?): boolean` — 全字显示 + (有 autoAdvance 则再等 autoAdvanceMs)

- [ ] **Step 1: 失败测试**

`typewriter.test.ts`:
```ts
import { describe, expect, test } from 'vitest'
import { charsShown, DEFAULT_SPEED_MS, isLineDone } from './typewriter.js'

describe('charsShown', () => {
  test('默认 24ms/字', () => {
    expect(charsShown(0, DEFAULT_SPEED_MS)).toBe(0)
    expect(charsShown(24, DEFAULT_SPEED_MS)).toBe(1)
    expect(charsShown(100, DEFAULT_SPEED_MS)).toBe(4)
  })
  test('慢速 48ms/字', () => {
    expect(charsShown(96, 48)).toBe(2)
  })
})

describe('isLineDone', () => {
  test('全字显示前 = 未完成', () => {
    expect(isLineDone(24, 24, 5)).toBe(false) // 才 1/5 字
  })
  test('全字显示后(无 autoAdvance)= 完成', () => {
    expect(isLineDone(5 * 24, 24, 5)).toBe(true)
  })
  test('有 autoAdvance:全字后还要再等', () => {
    expect(isLineDone(5 * 24, 24, 5, 300)).toBe(false) // 字打完但没过尾停顿
    expect(isLineDone(5 * 24 + 300, 24, 5, 300)).toBe(true)
  })
})
```

- [ ] **Step 2: 跑失败**

Run: `pnpm --filter @type-pal/reforge exec vitest run src/text/typewriter.test.ts` → FAIL

- [ ] **Step 3: 实现**

```ts
export const DEFAULT_SPEED_MS = 24

export function charsShown(elapsedMs: number, speedMs: number): number {
  return Math.floor(elapsedMs / speedMs)
}

export function isLineDone(
  elapsedMs: number,
  speedMs: number,
  totalChars: number,
  autoAdvanceMs?: number,
): boolean {
  const typeDoneMs = totalChars * speedMs
  if (elapsedMs < typeDoneMs) return false
  if (autoAdvanceMs == null) return true
  return elapsedMs >= typeDoneMs + autoAdvanceMs
}
```

- [ ] **Step 4: 测试通过 + commit**

Run: `pnpm --filter @type-pal/reforge exec vitest run src/text/typewriter.test.ts` → PASS(7 passed)
```bash
git add packages/reforge/src/text/typewriter.ts packages/reforge/src/text/typewriter.test.ts
git commit -m "feat(reforge): 打字进度纯函数 charsShown/isLineDone(performance.now 驱动)"
```

---

## Task 4: DialogBox 骨架 — 框 / 姓名牌 / 正文(bottom 单 slot)+ 从 main 拎出

> ⚠ **本 Task 的单 `state` 设计是临时的,Task 6 会重构**:Task 4 用 `private state: DialogueState | null`(单 slot、按页翻),目的是先把"字模/姓名牌/打字"渲染链路跑通。Task 6(slot 共存)会把核心数据结构改成 `Map<slot, SlotState>` + 句指针推进——`open/advance/render` 的大部分会重写。**故本 Task 勿过度打磨单 state 结构**,专注把渲染原语接对。

**Files:**
- Create: `packages/reforge/src/dialog/dialog-box.ts`
- Modify: `packages/reforge/src/main.ts`、`packages/content/src/locale.ts`

**Interfaces:**
- Consumes: `renderSpans`(Task 2)、`parseRichText`/`lookupText`/`zhLocale`(@type-pal/content ①)、`charsShown`(Task 3)、`pageLines`(① dialogue.ts)
- Produces:
  - `class DialogBox { constructor(ctx, glyphs, palette); open(state: DialogueState, nowMs); advance(nowMs); render(nowMs); get active(): boolean }`
  - 本 Task 只做 **bottom 单 slot + 姓名牌 + 正文 + 打字**(透明框);分页 / 光标 / slot / 头像后续 Task

- [ ] **Step 1: 端口位置常量**

`dialog-box.ts` 顶部,从 [GLM spec §3](visual-spec.md) + `present/dialog-box.ts` 端口 bottom style 常量(本 Task 只需 bottom):
```ts
const LINE_HEIGHT = 18
const TEXT_POS_BOTTOM = { x: 44, y: 126 }   // 无头像;有头像 x=20(Task 6)
const TITLE_POS_BOTTOM = { x: 12, y: 108 }  // 无头像;有头像 x=4
const FONT_DEFAULT_INDEX = 0x4f
```

- [ ] **Step 2: 实现 DialogBox(bottom 单 slot + 打字)**

```ts
import { lookupText, parseRichText, type TextSpan, zhLocale } from '@type-pal/content'
import type { Palette } from '@type-pal/shared'
import { advancePage, type DialogueState, pageLines } from '../dialogue.js'
import { renderSpans } from '../text/text-render.js'
import { TITLE_COLOR_INDEX } from '../text/palette-color.js'
import { charsShown, DEFAULT_SPEED_MS } from '../text/typewriter.js'
import type { GlyphTable } from '../text/glyph.js'

// 常量同 Step 1

export class DialogBox {
  private state: DialogueState | null = null
  private lineStartMs = 0
  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly glyphs: GlyphTable,
    private readonly palette: Palette,
  ) {}

  get active(): boolean {
    return this.state !== null
  }

  open(state: DialogueState, nowMs: number): void {
    this.state = state
    this.lineStartMs = nowMs
  }

  /** 翻页;翻完关闭。本 Task 单行/页(linesPerPage=1),Task 5 接分页。 */
  advance(nowMs: number): void {
    if (!this.state) return
    this.state = advancePage(this.state)
    this.lineStartMs = nowMs
  }

  render(nowMs: number): void {
    if (!this.state) return
    const lines = pageLines(this.state)
    let ty = TEXT_POS_BOTTOM.y
    for (const line of lines) {
      if (line.speaker) {
        const nameSpans: TextSpan[] = [{ text: `${lookupText(line.speaker, zhLocale)}：` }]
        renderSpans(this.ctx, nameSpans, TITLE_POS_BOTTOM.x, TITLE_POS_BOTTOM.y, {
          glyphs: this.glyphs,
          palette: this.palette,
          shadow: true,
          forceColorIndex: TITLE_COLOR_INDEX, // 姓名牌固定 CYAN_ALT(0x8C)
        })
      }
      const spans = parseRichText(lookupText(line.text, zhLocale))
      const elapsed = nowMs - this.lineStartMs
      const limit = charsShown(elapsed, DEFAULT_SPEED_MS)
      renderSpans(this.ctx, spans, TEXT_POS_BOTTOM.x, ty, {
        glyphs: this.glyphs,
        palette: this.palette,
        shadow: true,
        maxChars: limit,
      })
      ty += LINE_HEIGHT
    }
  }
}
```
> ⚠ 姓名牌固定 CYAN_ALT(0x8C),不是 span 色。**改进 `renderSpans` opts 加 `forceColorIndex?: number`**(传则全字用该 index 色,覆盖 span.color)——回 Task 2 的 `text-render.ts` 加这个可选项:`const rgba = opts.forceColorIndex != null ? indexToRgba(opts.forceColorIndex, opts.palette) : resolveRgba(span.color ?? 'default', opts.palette)`。姓名调用传 `forceColorIndex: TITLE_COLOR_INDEX`。

- [ ] **Step 3: main.ts 接入(删旧 drawDialogueBox)**

`main.ts`:删 `drawDialogueBox` 函数 + 其调用;`main()` 里加载 glyphs、new DialogBox:
```ts
// import 加:import { DialogBox } from './dialog/dialog-box.js'; import { loadGlyphs } from './assets.js'
const glyphs = await loadGlyphs()
const dialogBox = new DialogBox(ctx, glyphs, palette)
// tick 内对话分支:
if (dialogBox.active) {
  if (interact) dialogBox.advance(t)
} else if (interact) {
  const ent = nearbyInteractable()
  const dlg = ent?.interact ? dialogueById(ent.interact) : undefined
  if (dlg) dialogBox.open(startDialogue(dlg), t)  // linesPerPage 默认 1
}
// render() 内:if (dialogBox.active) dialogBox.render(t)
```
移除旧的 `activeDialogue`/`advancePage`/`pageLines`/`lookupText`/`zhLocale` 在 main 的直接使用(搬进 DialogBox)。`__reforge.dialogue` getter 改成 `dialogBox.active`(调试验证用)。

- [ ] **Step 4: typecheck + 浏览器验收**

Run: `pnpm --filter @type-pal/reforge run check` → 绿
Run: `pnpm --filter @type-pal/reforge run dev`,走到鬼旁按空格。
Expected:对话框出现,**用 Unifont 点阵字模**(不是系统宋体)显示「游魂：」(青色姓名牌)+ 正文**逐字打出**(带三层阴影);按空格翻页。**与 ① 的系统字体对比应明显变成点阵 + 阴影。**

- [ ] **Step 5: Commit**

```bash
git add packages/reforge/src/dialog/dialog-box.ts packages/reforge/src/main.ts packages/reforge/src/text/text-render.ts
git commit -m "feat(reforge): DialogBox 骨架 — Unifont 字模 + 姓名牌 + 逐字打字(bottom),从 main 拎出"
```

---

## Task 5: 分页(4 行/页)+ 光标(加载/画行末/6 色轮转)+ 自动播放

**Files:**
- Create: `packages/reforge/src/dialog/dialog-assets.ts`
- Modify: `packages/reforge/src/dialog/dialog-box.ts`、`packages/reforge/src/assets.ts`、`packages/content/src/index.ts`(若 ① 未含 autoAdvance 消费,此处接)、`main.ts`(startDialogue linesPerPage=4)

**Interfaces:**
- Consumes: `isLineDone`(Task 3)、`measureSpans`(Task 2)、`indexToRgba`(Task 2)、`parseSpriteChunk`(@type-pal/shared)
- Produces:
  - `loadDialogIcons(): Promise<HTMLCanvasElement[]>` — DATA chunk12 → frame 0/1/2 bake(端口 `assets/dialog-assets.ts` 光标加载 + reforge bakeFrame)
  - DialogBox 支持:4 行/页分页、行末光标(frame 按 cursorHint,默认 f0)、光标 6 色轮转闪烁、autoAdvance 自动推进

- [ ] **Step 1: 端口光标加载**

`dialog-assets.ts`:端口 `packages/game/src/assets/dialog-assets.ts` 的光标加载——fetch `/extracted/data/dialog-icons-raw.json`(`{source,size,base64}`)→ base64→bytes→`parseSpriteChunk` → RleFrame[];每 frame 用 reforge `render.ts` 的 bakeFrame 思路(或复用)bake 成 canvas。返回 `HTMLCanvasElement[]`(index 0/1/2)。`assets.ts` 加 `loadDialogIcons` fetch wrapper。

- [ ] **Step 2: 分页(linesPerPage=4)**

`main.ts`:`dialogBox.open(startDialogue(dlg, 4), t)`。DialogBox.render 已遍历 pageLines(Task 4),多行自然画(行高 18,4 行)。验证翻页:第 1 页 4 行、第 2 页剩余。

- [ ] **Step 3: 光标(画当前页末行末尾 + 6 色轮转)**

DialogBox 加光标渲染:等键时(当前页全字打完且非 autoAdvance),在**末行文字末尾**(`measureSpans` 算 x)画光标 frame。

**闪烁实现(定死一种,2026-06-27)**:spec §3 真值是"palette 0xF9-0xFE 轮转改色",所以用 **tint 重 bake + by-step 缓存**——把光标 frame 的不透明像素,每 100ms 用 `palette.colors[0xF9+step]` 重染一次 bake 成新 canvas,6 步循环,6 个 canvas 缓存(缓存的 canvas 直接 drawImage,不每帧重算)。
```ts
// cursorBaked:缓存 6 步的 tinted canvas(by step)。DialogBox 构造/open 时用光标 frame 0 预 bake。
// render 末尾:
const lines = pageLines(this.state)
const lastSpans = parseRichText(lookupText(lines[lines.length - 1]?.text ?? '', zhLocale))
const elapsed = nowMs - this.lineStartMs
if (isLineDone(elapsed, DEFAULT_SPEED_MS, /*末行字数*/ countChars(lastSpans))) {
  const cursorX = TEXT_POS_BOTTOM.x + measureSpans(lastSpans, this.glyphs)
  const cursorY = TEXT_POS_BOTTOM.y + (lines.length - 1) * LINE_HEIGHT
  const step = Math.floor(nowMs / 100) % 6
  const icon = this.cursorBaked[step]  // 6 步 tinted canvas 之一(frame0 + palette[0xF9+step] 色)
  if (icon) this.ctx.drawImage(icon, cursorX, cursorY)
}
```
> **tint 重 bake 的具体做法**:光标 RleFrame 的不透明像素,用 `palette.colors[0xF9+step]`(6 色)逐像素染色 bake 成 canvas,缓存 key = step(0..5)。6 个 canvas 预 bake 一次,渲染时按 nowMs 选 step 对应的 canvas drawImage。`countChars(spans)` = Σ span.text 的 codepoint 数(加个小工具)。此实现忠实 spec §3"色轮转",不用 globalAlpha 脉动。

- [ ] **Step 4: 自动播放(autoAdvance)**

DialogBox.render 每帧检查:当前行有 `autoAdvance` 且 `isLineDone(elapsed, speed, chars, autoAdvanceMs)` → 自动 `this.advance(nowMs)`(不等键、不画光标)。speed 取 `line.speed ?? DEFAULT_SPEED_MS`。

- [ ] **Step 5: typecheck + 浏览器验收**

Run: `pnpm --filter @type-pal/reforge run check` → 绿
Run: dev,走到鬼旁。Expected:4 行/页;每页打完**行末出现光标 + 闪烁**;含 `autoAdvance` 的句不等键自动过。

- [ ] **Step 6: Commit**

```bash
git add packages/reforge/src/dialog/dialog-assets.ts packages/reforge/src/dialog/dialog-box.ts packages/reforge/src/assets.ts packages/reforge/src/main.ts
git commit -m "feat(reforge): 对话分页 + 光标(行末/6色轮转闪烁)+ 自动播放"
```

---

## Task 6: slot 共存 + top 布局 + 头像 + DialogueLine 扩字段

**Files:**
- Create: `packages/reforge/src/dialog/slot.ts`、`slot.test.ts`
- Modify: `packages/content/src/index.ts`、`packages/reforge/src/dialog/dialog-box.ts`、`dialog-assets.ts`、`assets.ts`

**Interfaces:**
- Produces:
  - `DialogueLine` 加 `slot?: 'top'|'bottom'`、`portrait?: { icon: number; side: 'left'|'right' }`(① 模型扩展)
  - `slot.ts`:`SlotState`(每 slot 当前句 + lineStartMs)+ 推进逻辑纯函数(同 slot 覆盖 / 不同 slot 留显 / 活跃 slot 判定)
  - DialogBox 管理 `Map<'top'|'bottom', SlotState>`;top 布局常量;头像加载 + 左/右位置渲染
  - `loadPortrait(chunk): Promise<HTMLCanvasElement>`(端口 RGM 加载,占位)

- [ ] **Step 1: DialogueLine 扩字段(content)**

`packages/content/src/index.ts` `DialogueLine` 加:
```ts
  slot?: 'top' | 'bottom'
  portrait?: { icon: number; side: 'left' | 'right' }
```
(见 design §4。可选,缺省 bottom / 无头像。)Run content check 确认不破坏 ① 测试。

- [ ] **Step 2: slot 状态机失败测试**

`slot.test.ts`——把「lines 序列 → 每步哪些 slot 有内容、谁活跃」做成纯函数 `advanceSlots(slots, line, nowMs)` 测:
```ts
import { describe, expect, test } from 'vitest'
import { advanceSlots, emptySlots } from './slot.js'

describe('slot 状态机', () => {
  test('不同 slot → 共存(前一留显)', () => {
    let s = emptySlots()
    s = advanceSlots(s, { text: 'a', slot: 'bottom' }, 0)
    s = advanceSlots(s, { text: 'b', slot: 'top' }, 10)
    expect(s.bottom?.line.text).toBe('a') // bottom 留显
    expect(s.top?.line.text).toBe('b')    // top 活跃
    expect(s.activeSlot).toBe('top')
  })
  test('同 slot → 覆盖', () => {
    let s = emptySlots()
    s = advanceSlots(s, { text: 'a', slot: 'bottom' }, 0)
    s = advanceSlots(s, { text: 'c', slot: 'bottom' }, 10)
    expect(s.bottom?.line.text).toBe('c') // 覆盖
  })
})
```

- [ ] **Step 3: 跑失败 + 实现 slot.ts**

```ts
import type { DialogueLine } from '@type-pal/content'

export type SlotId = 'top' | 'bottom'
export interface SlotEntry { line: DialogueLine; startMs: number }
export interface SlotState {
  top?: SlotEntry
  bottom?: SlotEntry
  activeSlot: SlotId
}
export function emptySlots(): SlotState {
  return { activeSlot: 'bottom' }
}
/** 放一句到它的 slot(默认 bottom);同 slot 覆盖、不同 slot 留显;该 slot 成活跃。 */
export function advanceSlots(s: SlotState, line: DialogueLine, nowMs: number): SlotState {
  const slot: SlotId = line.slot ?? 'bottom'
  return { ...s, [slot]: { line, startMs: nowMs }, activeSlot: slot }
}
```

Run: `pnpm --filter @type-pal/reforge exec vitest run src/dialog/slot.test.ts` → FAIL 然后 PASS

- [ ] **Step 4: DialogBox 接 slot + top 布局 + 头像**

- DialogBox 用 `SlotState` 替代单 `state`:`open` 时按 lines 逐句 `advanceSlots`?**注意**:打字 / 翻页是按句推进的,slot 共存意味着「推进活跃 slot 的句」。重构 DialogBox 内部:维护「当前句指针 + SlotState」,`advance` 把下一句 `advanceSlots` 进对应 slot(同 slot 覆盖=翻页、不同 slot=共存留显)。render 时**两个 slot 都画**(留显的画全字、活跃的按打字进度)。
- top 布局常量(GLM spec §3):`TEXT_POS_TOP={x:44,y:26}`(有头像 x=96)、`TITLE_POS_TOP={x:12,y:8}`(有头像 x=80)。render 按 `line.slot` 选 top/bottom 坐标。
- 头像:`loadPortrait`(端口 `assets/dialog-assets.ts` RGM 加载,占位用某 chunk)→ 画在 GLM spec §3 头像位置(top `(48-w/2,55-h/2)` / bottom `(270-w/2,144-h/2)`);`portrait.side` left/right 决定 x(左/右),正文 x 相应缩进(有头像列)。

- [ ] **Step 5: typecheck + 浏览器验收**

Run: `pnpm --filter @type-pal/reforge run check` → 绿
Expected(临时给鬼话句配 slot/portrait 测):一句 bottom + 一句 top **同屏共存**;头像在左 / 右显示;top 布局正文在上方。

- [ ] **Step 6: Commit**

```bash
git add packages/reforge/src/dialog/slot.ts packages/reforge/src/dialog/slot.test.ts packages/content/src/index.ts packages/reforge/src/dialog/dialog-box.ts packages/reforge/src/dialog/dialog-assets.ts packages/reforge/src/assets.ts
git commit -m "feat(reforge): slot 共存 + top 布局 + 头像(占位)+ DialogueLine 加 slot/portrait"
```

---

## Task 7: 鬼话仪表盘落地 + 全特性浏览器验收

**Files:**
- Modify: `packages/content/src/index.ts`(鬼话 dialogues 配参数)、`packages/content/src/locale.ts`(加「远处的鬼」+ 颜色标记)

**Interfaces:**
- Consumes: 全部前序 Task

- [ ] **Step 1: 鬼话仪表盘内容(content + locale)**

按 [design §5 分配表](visual-design.md) 落地:`locale.ts` `zhLocale` 改/加文本(句2 换成「远处的鬼」台词,某些句加 `<yellow>`/`<cyan>`/`<red>` 标记 + 加 `name.distant-ghost`);`index.ts` 鬼话 `lines` 每句配 `slot`/`portrait`/`speed`/`autoAdvance`:
```ts
lines: [
  { speaker: 'name.youhun', text: 'dlg.ghost-hearsay.0', slot: 'bottom', portrait: { icon: PLACEHOLDER, side: 'right' } },
  { speaker: 'name.youhun', text: 'dlg.ghost-hearsay.1', slot: 'bottom', portrait: { icon: PLACEHOLDER, side: 'right' }, speed: 48 },
  { speaker: 'name.distant-ghost', text: 'dlg.ghost-hearsay.2', slot: 'top', portrait: { icon: PLACEHOLDER2, side: 'left' } },
  { speaker: 'name.youhun', text: 'dlg.ghost-hearsay.3', slot: 'bottom', portrait: { icon: PLACEHOLDER, side: 'right' }, speed: 12, autoAdvance: 0 },
  { text: 'dlg.ghost-hearsay.4', slot: 'bottom' },
]
```
locale 加颜色标记示例:`'dlg.ghost-hearsay.0': '……<yellow>活人气味</yellow>……这地方，可不该有活人啊……'` 等(按 §5)。`name.distant-ghost: '远处的鬼'`。`PLACEHOLDER` = 实际 RGM chunk 号(看 portraits.json 选一个)。content.test.ts(① 完整性守护)会自动校验新 textId 都在 zhLocale。

- [ ] **Step 2: content check(完整性守护 + 类型)**

Run: `pnpm --filter @type-pal/content run check` → 绿(textId 完整性测试覆盖新增 `name.distant-ghost`)

- [ ] **Step 3: 全特性浏览器验收(人工,对照 design §5)**

Run: `pnpm --filter @type-pal/reforge run dev`,走到鬼旁按空格,逐句核对:
- [ ] 句0:bottom + 头像右 + 默认速 + 「活人气味」黄 + 翻页箭头光标
- [ ] 句1:bottom + 头像右 + **慢速** + 「使刀的侠客」青 + 光标 f1
- [ ] 句2:**top + 头像左** + 「煞气冲天」红 + 光标 f2 + **此时 bottom 游魂句1 留显 = 双框共存**
- [ ] 句3:bottom + 头像右 + **快速** + **自动播放**(不等键)+ top 远处鬼留显(继续共存)
- [ ] 句4:bottom + 无头像(旁白)+ 结束清所有
- [ ] 全程:Unifont 点阵字模 + 三层阴影

- [ ] **Step 4: 全量 gating + Commit**

Run: `pnpm check` → 全包绿;`pnpm exec biome check packages/reforge/src packages/content/src` → 0/0
```bash
git add packages/content/src/index.ts packages/content/src/locale.ts
git commit -m "feat(content): 鬼话对话系统完整仪表盘 — 覆盖全部技术点(颜色/速度/自动/光标/共存/头像/布局)"
```

---

## Self-Review(计划作者自查,已过)

1. **Spec 覆盖**(对 design §1 技术点):字模→T1/2/4;颜色着色→T2;打字→T2/3;速度→T3/7;自动播放→T5/7;翻页→T5;姓名牌→T4;头像→T6;光标 3 形+轮转→T5;slot 共存→T6;上下布局→T6;仪表盘→T7。两层架构(D13)→ text/ 在 T1-3、dialog/ 在 T4-6。✅
2. **占位符**:`PLACEHOLDER`(头像 chunk 号)在 T7 标明「看 portraits.json 选」——是创作期选值非代码占位,可接受。光标闪烁实现已定死(tint 重 bake + by-step 缓存,T5)。其余无 TBD。✅
3. **类型一致**:`decodeGlyph(glyph,rgba)`(T1 纯函数)+ `bakeGlyph(cp,glyph,rgba)`(T1 canvas 涂绘,T2 调用对齐)、`renderSpans(…opts)` 加 `forceColorIndex`(T2 定义 / T4 用)、`charsShown`/`isLineDone`(T3→T5)、`advanceSlots`/`SlotState`(T6)、`DialogueLine.slot/portrait`(T6 content → T7 用)。链路对齐。✅
4. **范围**:单切片(对话外观),text/ 与 dialog/ 虽分层但紧耦合于本切片、一个 plan 合理;每 Task 末 commit + check 绿(canvas 渲染 Task 靠浏览器验收)。✅
5. **实测决策(2026-06-27)**:(a) canvas 测试环境——happy-dom `getContext` 返 null、node-canvas 未装,故 Task 1 抽 `decodeGlyph` 纯函数单测,bakeGlyph canvas 涂绘留浏览器验;(b) Task 4 单 state 设计标注为"Task 6 会重构",勿过度打磨;(c) Task 5 光标闪烁定 tint 重 bake + by-step 缓存一种(spec §3 色轮转)。✅

> 已知务实偏离:canvas 渲染无法单测(reforge vitest 纯 node),T4/5/6/7 渲染部分靠 typecheck + 浏览器截图验收(Global Constraints 已声明);T1 的 bit 解码抽纯函数 `decodeGlyph` 可单测;端口部分(glyph 结构 / 光标加载 / 头像加载 / 位置常量)给「端口自 X + 改动点」而非重抄第一阶段(GLM 可读 codebase)。
