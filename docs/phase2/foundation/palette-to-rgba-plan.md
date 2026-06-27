# Palette → RGBA 改造计划(运行时去调色板)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development 或 executing-plans 逐 Task 实现。Steps 用 checkbox(`- [ ]`)跟踪。

**Goal:** 落地 [D15](../decisions.md)——reforge 运行时彻底去 palette。**本计划做阶段 A:对话系统(文本 / 姓名 / 光标 / 头像)去 palette**;精灵 / 瓦片 / palette 动画留后续阶段。

**Architecture:** UI/对话语义色 → 固定 RGBA 常量(取原版 pal0 的 UI index 快照,不绑场景 palette);头像(原版 indexed)→ 迁移期烘成 RGBA PNG,运行时直接 drawImage。`pal-extract`(一阶段)**不动**;烘 RGBA 是第二阶段迁移脚本的活(本计划起第一个迁移脚本:头像)。见 [D15](../decisions.md)、[content-schema §8](content-schema.md)。

**Tech Stack:** TypeScript(ESM)、Canvas 2D、vitest、Node 脚本(PNG 读写)。

## Global Constraints

- **运行时不碰场景 palette 做对话**:对话色 / 光标色 = 固定 RGBA 常量;头像 = 预烘 RGBA PNG。验收硬标准:**`?pal=2` 下对话色 / 姓名 / 头像与 `?pal=0` 完全一致**(证明已脱离场景 palette;旧实现 pal2 姓名色会变纯黑)。
- **新引擎零 lint/type**:`noNonNullAssertion` 是 error,不写 `!`;`pnpm --filter @type-pal/reforge run check` + biome 0/0 每 Task 末绿。
- **不动 pal-extract**(两阶段解耦);烘 RGBA 是第二阶段脚本。
- **固定色值取 pal0 快照**(下面 Task 1 给全),保持当前观感;**不是**新调色,是把「绑场景 palette」换成「固定值」。
- **本阶段不碰精灵 / 瓦片渲染**(render.ts 的 bakeFrame / Canvas2DRenderer 仍用 palette)——那是阶段 B。所以 main.ts 的 `loadPalette` 暂留(给 render),只是对话不再用它。

---

## File Structure(阶段 A)

| 文件 | 责任 | 动作 |
|---|---|---|
| `packages/reforge/src/text/palette-color.ts` | DialogColor / 姓名 / 光标 → **固定 RGBA 常量**(去 palette) | 重写 |
| `packages/reforge/src/text/palette-color.test.ts` | colorRgba 映射单测 | 改 |
| `packages/reforge/src/text/text-render.ts` | renderSpans 去 palette(用固定 RGBA) | 改 |
| `scripts/bake-portraits.mts` | 迁移脚本:头像 indexed PNG + palette → RGBA PNG | Create |
| `packages/reforge/src/dialog/dialog-assets.ts` | 头像 loadPortraits 去 palette(吃 RGBA PNG);光标色用固定常量 | 改 |
| `packages/reforge/src/dialog/dialog-box.ts` | 去 palette(文本 / 姓名 / 光标 / 头像) | 改 |
| `packages/reforge/src/main.ts` | DialogBox / loadPortraits 去 palette 参数 | 改 |

---

## Task 1: 对话色 → 固定 RGBA 常量(去 palette)

**Files:** 改 `palette-color.ts` + `palette-color.test.ts`

**Interfaces:**
- Produces: `colorRgba(c: DialogColor): readonly [number,number,number]`、`TITLE_RGBA`、`CURSOR_RGBA: readonly RGB[]`(6 色)、`CURSOR_COLOR_COUNT`。**移除** `colorIndex`/`resolveRgba`/`indexToRgba`(palette 版)。

- [ ] **Step 1: 写失败测试**

`palette-color.test.ts` 整体替换:
```ts
import { describe, expect, test } from 'vitest'
import { colorRgba, CURSOR_RGBA, TITLE_RGBA } from './palette-color.js'

describe('对话固定色(pal0 快照,不绑场景 palette)', () => {
  test('DialogColor → 固定 RGBA', () => {
    expect(colorRgba('default')).toEqual([199, 186, 174])
    expect(colorRgba('yellow')).toEqual([255, 223, 134])
    expect(colorRgba('cyan')).toEqual([121, 219, 186])
    expect(colorRgba('red')).toEqual([190, 73, 60])
    expect(colorRgba('redAlt')).toEqual([150, 32, 24])
  })
  test('姓名牌 + 光标 6 色', () => {
    expect(TITLE_RGBA).toEqual([101, 203, 170])
    expect(CURSOR_RGBA).toHaveLength(6)
    expect(CURSOR_RGBA[0]).toEqual([247, 231, 109])
  })
})
```

- [ ] **Step 2: 跑失败**

Run: `pnpm --filter @type-pal/reforge exec vitest run src/text/palette-color.test.ts`
Expected: FAIL(colorRgba 未定义)

- [ ] **Step 3: 重写 palette-color.ts**

```ts
import type { DialogColor } from '@type-pal/content'

/** 对话 UI 固定 RGBA(原版 pal0 的 UI index 快照;D15:不再绑场景 palette)。 */
const DIALOG_RGBA: Record<DialogColor, readonly [number, number, number]> = {
  default: [199, 186, 174], // 原 0x4F
  cyan: [121, 219, 186], // 原 0x8D
  red: [190, 73, 60], // 原 0x1A
  redAlt: [150, 32, 24], // 原 0x17
  yellow: [255, 223, 134], // 原 0x2D
}
/** 姓名牌 title 色(原 0x8C)。 */
export const TITLE_RGBA: readonly [number, number, number] = [101, 203, 170]
/** 光标闪烁 6 色轮转(原 palette 0xF9-0xFE 快照)。 */
export const CURSOR_RGBA: readonly (readonly [number, number, number])[] = [
  [247, 231, 109],
  [235, 211, 97],
  [227, 190, 89],
  [219, 174, 81],
  [231, 195, 93],
  [243, 219, 105],
]
export const CURSOR_COLOR_COUNT = 6

export function colorRgba(c: DialogColor): readonly [number, number, number] {
  return DIALOG_RGBA[c]
}
```
> ⚠ **暂保留**旧的 `colorIndex`/`resolveRgba`/`indexToRgba`/`COLOR_INDEX`/`TITLE_COLOR_INDEX`(palette 版)——dialog-box 仍引用它们。Task 1 纯**新增** colorRgba/TITLE_RGBA/CURSOR_RGBA,删旧 API 推迟到 Task 4(所有调用方改完),保证每个 commit 可编译(git bisect 友好)。

- [ ] **Step 4: 测试通过 + typecheck 绿 + commit**

Run: `pnpm --filter @type-pal/reforge exec vitest run src/text/palette-color.test.ts` → PASS
Run: `pnpm --filter @type-pal/reforge run typecheck` → 0 错(旧 API 未删,调用方仍编译通过)
```bash
git add packages/reforge/src/text/palette-color.ts packages/reforge/src/text/palette-color.test.ts
git commit -m "feat(reforge): 对话色 → 固定 RGBA 常量(去场景 palette 绑定,D15)"
```

---

## Task 2: renderSpans 签名 + dialog-box 文本/姓名调用(同步去 palette)

**Files:** 改 `text-render.ts`、`dialog-box.ts`(仅文本/姓名 renderSpans 调用)

**Interfaces:**
- `RenderSpansOpts` 去掉 `palette`,`forceColorIndex?: number` → `forceRgba?: readonly [number,number,number]`。
- Consumes: `colorRgba`/`TITLE_RGBA`(Task 1)。
- ⚠ **签名变与调用方强耦合,必须同 commit**:dialog-box line 228/249 是内联对象字面量传 `palette`/`forceColorIndex`,`RenderSpansOpts` 一改即触发 TS 多余属性报错。故文本/姓名调用并入本 Task;光标(line 292)仍走旧 `indexToRgba`+`this.palette`(Task 1 暂留)不动,`this.palette` 构造参数留 Task 4 删。

- [ ] **Step 1: 改 text-render.ts**

`text-render.ts`:
- import 改:`import { colorRgba } from './palette-color.js'`(去 Palette / resolveRgba / indexToRgba)。
- `RenderSpansOpts`:删 `palette: Palette`,`forceColorIndex?: number` 改 `forceRgba?: readonly [number, number, number]`。
- 着色行改:
```ts
    const rgba = opts.forceRgba ?? colorRgba(span.color ?? 'default')
```
(删 `indexToRgba(opts.forceColorIndex, opts.palette)` / `resolveRgba(..., opts.palette)` 分支)。其余(bakeGlyph / 三层阴影 / maxChars)不变。

- [ ] **Step 2: 同步改 dialog-box 文本/姓名调用**

`dialog-box.ts`:
- import(line 10):加 `TITLE_RGBA`;删 `TITLE_COLOR_INDEX`(姓名改用 TITLE_RGBA);`indexToRgba` **保留**(光标 line 292 还用)。
- 正文 renderSpans(line ~249):删 `palette: this.palette`,留 `glyphs`/`shadow`/`maxChars`。
- 姓名 renderSpans(line ~228):删 `palette: this.palette`,`forceColorIndex: TITLE_COLOR_INDEX` → `forceRgba: TITLE_RGBA`。
- 光标 / 头像 / `this.palette` 构造参数:**不动**(Task 4 收)。

- [ ] **Step 3: typecheck 绿 + commit**

Run: `pnpm --filter @type-pal/reforge run typecheck` → 0 错(renderSpans 签名 + 全部调用方同步改;光标走旧 API 仍编译)。
```bash
git add packages/reforge/src/text/text-render.ts packages/reforge/src/dialog/dialog-box.ts
git commit -m "feat(reforge): renderSpans + dialog-box 文本/姓名去 palette,用固定 RGBA"
```

---

## Task 3: 头像烘 RGBA(迁移脚本 + reforge 吃 RGBA PNG)

**Files:** Create `scripts/bake-portraits.mts`;改 `dialog-assets.ts`、`main.ts`(loadPortraits 调用同步去 palette)

**Interfaces:**
- 迁移脚本产出:`packages/reforge/public/portraits/<chunk>.png`(RGBA,运行时直接 drawImage)。
- `loadPortraits(chunkIndices, baseUrl?)`:**去 palette 参数**,fetch RGBA PNG → `createImageBitmap` → drawImage 到 canvas。
- ⚠ **签名变与调用方强耦合,必须同 commit**:main.ts 第 74 行 `loadPortraits([1, 2], palette)` 传了 palette 参数,删参数后此调用报"多 1 个参数"→ typecheck 红。故 main.ts 调用并入本 Task(同 commit),与 Task 2/4 的原则一致。

- [ ] **Step 1: 写头像烘脚本**

`scripts/bake-portraits.mts`(Node,一次性迁移)。PNG 库用 **`pngjs`**(`packages/pal-extract` 已用同一库读写 PNG,pnpm-workspace 能直接解析,无需新装;勿用 sharp/UPNG):

```ts
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { PNG } from 'pngjs'

const palette = JSON.parse(readFileSync('data/extracted/data/palette/0.json', 'utf8')).colors as [number, number, number][]
const CHUNKS = [1, 2] // 鬼话用的;后续可扩到全 88 个
mkdirSync('packages/reforge/public/portraits', { recursive: true })

for (const chunk of CHUNKS) {
  const src = PNG.sync.read(readFileSync(`data/extracted/images/portraits/${String(chunk).padStart(2, '0')}.png`))
  const out = new PNG({ width: src.width, height: src.height })
  for (let i = 0; i < src.width * src.height; i++) {
    const r = src.data[i * 4], g = src.data[i * 4 + 1], b = src.data[i * 4 + 2], a = src.data[i * 4 + 3]
    if (a > 0) { // 不透明像素:index(R=G=B)→ palette 真彩
      const c = palette[r] ?? [0, 0, 0]
      out.data[i * 4] = c[0]; out.data[i * 4 + 1] = c[1]; out.data[i * 4 + 2] = c[2]; out.data[i * 4 + 3] = 255
    }
    // 透明像素(A=0)保持透明(默认 0)
  }
  writeFileSync(`packages/reforge/public/portraits/${chunk}.png`, PNG.sync.write(out))
  console.log(`baked portrait ${chunk} → RGBA`)
}
```

- 读 `data/extracted/data/palette/0.json`(头像用 pal0 烘;人物头像色与场景无关,pal0 即对话/UI 盘)。
- 透明像素(A=0)保持透明。
- 鬼话用的 chunk 1/2 先烘(后续可扩到全 88 个)。
- 根 `package.json` 加 `"bake-portraits": "tsx scripts/bake-portraits.mts"`(`tsx` 已是根 devDep)。
> 关键:这是**第二阶段迁移脚本**(不在 pal-extract)。它读 pal-extract 的产物 `data/extracted`,烘成 reforge 吃的 RGBA。是迁移器的第一块。

- [ ] **Step 2: 跑脚本生成 RGBA 头像**

Run: `pnpm bake-portraits`(或 `pnpm tsx scripts/bake-portraits.mts`)
Expected: 生成 `packages/reforge/public/portraits/1.png`、`2.png`(RGBA)。人眼开图确认是彩色头像(非灰度)。

- [ ] **Step 3: loadPortraits 去 palette,吃 RGBA PNG**

`dialog-assets.ts`:
- `loadPortraits(chunkIndices, baseUrl='/portraits')` 去 `palette` 参数。
- 改成 fetch `${baseUrl}/${chunk}.png`(RGBA)→ `createImageBitmap(blob)` → 画到离屏 canvas(或直接存 ImageBitmap,drawImage 接受 ImageBitmap)→ Map。
- **删** `decodePngToIndices` / `bakeIndexedImage`(indexed+palette 解码,不再需要)。
- ⚠ 光标常量(`CURSOR_COLOR_START`/`CURSOR_COLOR_COUNT`)+ `bakeCursorTinted`:**本 Task 不碰**——dialog-box(line 292)仍 import `CURSOR_COLOR_START`,这里删了会让 dialog-box 编译红。光标统一到 Task 4(与 dialog-box 光标改同 commit)。

**`main.ts`(同步改,与 loadPortraits 签名变同 commit)**:
- 第 74 行 `loadPortraits([1, 2], palette)` → `loadPortraits([1, 2])`(去 palette 参数)。
- `portraits` 仍 await loadPortraits;palette 变量仍留(Canvas2DRenderer/Task 4 才删),只是不再传给 loadPortraits。

- [ ] **Step 4: typecheck 绿 + commit**

Run: `pnpm --filter @type-pal/reforge run typecheck` → 0 错(loadPortraits 签名 + main 调用同步改;dialog-box 构造参数仍带 palette,Task 4 删)。
```bash
git add scripts/bake-portraits.mts package.json packages/reforge/public/portraits packages/reforge/src/dialog/dialog-assets.ts packages/reforge/src/main.ts
git commit -m "feat(reforge): 头像烘 RGBA 迁移脚本 + loadPortraits 吃 RGBA(去 palette,main 调用同步)"
```

---

## Task 4: DialogBox + main 去 palette + 全特性验收

**Files:** 改 `dialog-box.ts`、`main.ts`

- [ ] **Step 1: dialog-box.ts 收尾(光标 + 构造参数)** — 文本/姓名已在 Task 2 改完

- 光标 `bakeCursorStep`:`indexToRgba(CURSOR_COLOR_START + step, this.palette)` → `CURSOR_RGBA[step]`(去 palette)。
- import:删 `indexToRgba`(光标改完不再用)、`Palette` 类型;`CURSOR_RGBA`/`CURSOR_COLOR_COUNT` 改从 `'../text/palette-color.js'` 取(原从 dialog-assets)。改完 dialog-box 不再 import 任何 palette 相关。
- 构造去 `palette` 参数(`DialogBox(ctx, glyphs, cursorFrames, portraits)`)。
- **dialog-assets.ts**:删 `CURSOR_COLOR_START` / `CURSOR_COLOR_COUNT`(光标色统一到 palette-color;此刻 dialog-box 已不 import 它们)。
- **删 palette-color 旧 API**(所有调用方已改完):`colorIndex`/`resolveRgba`/`indexToRgba`/`COLOR_INDEX`/`TITLE_COLOR_INDEX`。删完 `palette-color.ts` 只剩 `colorRgba`/`TITLE_RGBA`/`CURSOR_RGBA`/`CURSOR_COLOR_COUNT`,无死代码。

- [ ] **Step 2: main.ts 去 DialogBox palette(与 Step 1 同 commit)**

- `new DialogBox(ctx, glyphs, cursorFrames, portraits)`(去 palette;与 Step 1 构造签名变同 commit)。
- ~~`loadPortraits([1, 2])`~~ → 已在 Task 3 改完,此处不重复。
- `loadPalette` / `palette` **暂留**(render.ts 的 Canvas2DRenderer / renderSpriteGallery 还用,阶段 B 再去;本 Task 仅对话不再用)。

- [ ] **Step 3: 全量 check**

Run: `pnpm --filter @type-pal/reforge run check` → typecheck + test 全绿
Run: `pnpm exec biome check packages/reforge/src` → 0/0

- [ ] **Step 4: 浏览器验收(关键:换 palette 色不变)**

Run: `pnpm --filter @type-pal/reforge run dev`,走到鬼旁。
- [ ] `?pal=0`:对话色(黄 / 青 / 红)、姓名青、头像彩色、光标黄 —— 与之前一致
- [ ] **`?pal=2`:对话色 / 姓名 / 头像 / 光标和 pal=0 完全一样**(旧实现 pal2 姓名色会变纯黑 → 现在固定 RGBA,不受影响)。**这是 D15 去 palette 的核心验证**
- [ ] 双框共存 / 打字 / 翻页 / autoAdvance 不回归

- [ ] **Step 5: Commit**

```bash
git add packages/reforge/src/dialog/dialog-box.ts packages/reforge/src/dialog/dialog-assets.ts packages/reforge/src/text/palette-color.ts packages/reforge/src/main.ts
git commit -m "feat(reforge): 对话框光标去 palette + 删 palette 旧 API(D15 阶段A 完成)"
```

---

## 后续阶段(本计划不做,列方向)

### 阶段 B:精灵 / 地图瓦片去 palette
- 扩展迁移脚本:`data/extracted` 的 sprite(`.rle`)/ tileset(`.rle`)indexed + 各自 palette → RGBA(烘成 RGBA 资产)。
- `render.ts` 的 `bakeFrame(palette)` → 直接吃 RGBA;`Canvas2DRenderer` 去 palette 参数;`main.ts` 移除 `loadPalette`。
- 难点:sprite/tile 用**哪个 palette** 烘(场景 tile 用场景盘、角色 sprite 用角色盘、夜景另算)——迁移脚本要按素材定。这是「迁移器」的主体,值得单独 brainstorm + plan。

### 阶段 C:palette 运行时动画 → 后处理
- 原版用 palette 轮转 / 改盘做的:水波 / 火 cycle、受伤红屏、昼夜——[D4](../decisions.md) 已定用**后处理 / 整屏合成**重做(不靠换盘)。
- 这些 reforge 现在没做(demo 无),做到对应内容时再实现。「rng 之类」若指 palette cycle 动画的随机性,归此阶段。

---

## Self-Review(计划作者自查,已过)

1. **覆盖**(对话去 palette):色常量→T1;renderSpans→T2;头像烘+加载→T3;dialog-box/main→T4。验收含「换 pal 色不变」(D15 核心)。✅
2. **占位符**:固定 RGBA 值全给(pal0 实测快照);头像烘脚本**已点名 pngjs + 给完整骨架代码**(T3 Step 1),非含糊「参考」。✅
3. **类型一致**:`colorRgba`/`TITLE_RGBA`/`CURSOR_RGBA`(T1 定义→T2/T4 用)、`RenderSpansOpts.forceRgba`(T2 定义→T4 用)、`loadPortraits` 去 palette(T3 定义→**T3 main 调用同步改**,同 commit)。链路对齐。✅
4. **范围**:仅对话系统去 palette;精灵/瓦片(render.ts)+ loadPalette 暂留(阶段 B);palette 动画(阶段 C)。每 Task 末 commit。**每个 commit 可编译**(原则:签名/常量的删改与其调用方同 commit,强耦合不拆散):T1 旧 API 纯新增;T2 renderSpans 签名变 **与 dialog-box 文本/姓名调用同 commit**(内联字面量);T3 loadPortraits 签名变 **与 main 调用同 commit**,不碰光标常量(dialog-box 仍 import);T4 dialog-box 光标改 + 构造去 palette(与 main DialogBox 调用同 commit)+ 删 dialog-assets/palette-color 旧常量/API。git bisect 友好,无编译断点。✅

> 务实偏离:canvas 渲染靠浏览器验收(同 ②);头像烘脚本用 pngjs(pal-extract 同库,已给骨架)。
