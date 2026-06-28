# 金钱横卷轴 实现计划

> **For agentic workers:** 交 GLM 执行,Claude 逐 Task 审。第二阶段 Reforge,先读 [READ-FIRST](../READ-FIRST.md)。
> 接续主菜单(已对齐原版 `a29b0de`/`6ea83b8`),补原版主菜单最后一块:金钱卷轴。

**Goal:** 主菜单顶部画原版金钱横卷轴(「金钱 0」),凑齐完整主菜单。

**Architecture:** money 入 content 的 WorldState;横卷轴/数字素材走 migrate bake 成 RGBA(palette 0);reforge 加横卷轴 + 数字渲染,主菜单打开时画在 (0,0)。

**Tech Stack:** TS / Canvas2D / pngjs(bake) / vitest。

## 真值规格(已查证 sdlpal,勿改)

- **横卷轴** `PAL_CreateSingleLineBox`(ui.c:278-349):`gpSpriteUI` frame **44(左) / 45(中) / 46(右)**;
  画法 = 左头 + 中段×nLen 重复 + 右头。金钱框 `PAL_CreateSingleLineBox(PAL_XY(0,0), nLen=5)`。
- **数字** `PAL_DrawNumber`(ui.c:677-681):也是 `gpSpriteUI`,黄色 = frame **19-28**(数字 0-9,19=「0」…28=「9」)。
- **布局** `PAL_ShowCash`(uigame.c:474-488):卷轴 (0,0)、「金钱」label (10,10)、数字 (49,14) 黄 6 位**右对齐**。
- 全部 palette 0([asset-pipeline D-a](../migrate/asset-pipeline.md))。

## Global Constraints

- **阶段隔离**(D18):`money` 在 `@type-pal/content`;渲染在 reforge。资产走 `@type-pal/migrate` bake(**不在 reforge 运行时烤**)。
- **零 lint/type**:不写 `!`;`noUncheckedIndexedAccess` 下标用 `?? 兜底`。每 Task 末 `tsc` + `biome` 0/0。
- canvas 渲染靠**浏览器验**(dev: `pnpm --filter @type-pal/reforge run dev`,Esc 开菜单)。

---

## Task 1: WorldState.money + 资产 bake 扩(横卷轴 + 数字)

**Files:**
- Modify: `packages/content/src/character.ts`(WorldState 加 money;initialWorld 填 0)
- Modify: `packages/content/src/character.test.ts`(断言 money)
- Modify: `packages/migrate/scripts/bake-assets.mts`(扩烤数字 19-28 + 横卷轴 44-46)

**Interfaces:**
- Produces:`WorldState.money: number`;烤出 `/ui/num/0.png`..`9.png` + `/ui/cashbox/{left,mid,right}.png`。

- [ ] **Step 1: WorldState.money 字段 + 测**

`character.ts` 的 `WorldState` 接口加字段(注释「跟存档走」那块):
```ts
export interface WorldState {
  party: CharacterInstance[]
  money: number // 金钱(跟存档走;demo 内存构造 = 0)
}
```
`initialWorld()` 返回里加 `money: 0`。

`character.test.ts` 加:
```ts
it('initialWorld 含金钱字段(demo=0)', () => {
  expect(initialWorld().money).toBe(0)
})
```

- [ ] **Step 2: 跑测试**

Run: `pnpm --filter @type-pal/content exec vitest run src/character.test.ts`
Expected: PASS。

- [ ] **Step 3: bake-assets.mts 扩烤数字 + 横卷轴**

在 `bake-assets.mts` 末尾(UI box 之后)加:
```ts
// 3) 数字(黄,gpSpriteUI frame 19-28 = 数字 0-9;PAL_DrawNumber kNumColorYellow)
mkdirSync(resolve(PUBLIC, 'ui/num'), { recursive: true })
for (let d = 0; d <= 9; d++) {
  bakeFile(
    resolve(EXTRACTED, `images/ui/frame-${String(19 + d).padStart(2, '0')}.png`),
    resolve(PUBLIC, `ui/num/${d}.png`),
  )
  console.log(`baked num ${d}`)
}

// 4) 金钱横卷轴(gpSpriteUI frame 44/45/46 = 左/中/右;PAL_CreateSingleLineBox)
mkdirSync(resolve(PUBLIC, 'ui/cashbox'), { recursive: true })
const cashFrames: [number, string][] = [
  [44, 'left'],
  [45, 'mid'],
  [46, 'right'],
]
for (const [frame, name] of cashFrames) {
  bakeFile(
    resolve(EXTRACTED, `images/ui/frame-${String(frame).padStart(2, '0')}.png`),
    resolve(PUBLIC, `ui/cashbox/${name}.png`),
  )
  console.log(`baked cashbox ${name}`)
}
```

- [ ] **Step 4: 跑 bake 产出资产**

Run: `pnpm --filter @type-pal/migrate run bake`
Expected: 打印 baked num 0..9 + cashbox left/mid/right;`packages/reforge/public/ui/num/` 有 0-9.png、`ui/cashbox/` 有 left/mid/right.png。

- [ ] **Step 5: commit**

```bash
git add packages/content/src/character.ts packages/content/src/character.test.ts packages/migrate/scripts/bake-assets.mts packages/reforge/public/ui/num packages/reforge/public/ui/cashbox
git commit -m "feat(content/migrate): WorldState.money + bake 金钱横卷轴/数字素材"
```

---

## Task 2: 横卷轴 + 数字渲染 + 主菜单集成

**Files:**
- Modify: `packages/reforge/src/menu/menu-box.ts`(加载 + 渲染 cash;MenuAssets 扩)

**Interfaces:**
- Consumes: Task 1 的 `/ui/num/*` `/ui/cashbox/*` + `WorldState.money`。

- [ ] **Step 1: MenuAssets 扩 + 加载**

`MenuAssets` 接口加:
```ts
  /** 金钱横卷轴 3 帧(左/中/右,frame 44/45/46)。 */
  cashBox: { left: ImageBitmap | undefined; mid: ImageBitmap | undefined; right: ImageBitmap | undefined }
  /** 数字 0-9 预烘(索引=数字值)。 */
  nums: (ImageBitmap | undefined)[]
```
`loadMenuAssets` 里加载(与现有 loadPng 同):
```ts
  const [left, mid, right] = await Promise.all([
    loadPng('/ui/cashbox/left.png'),
    loadPng('/ui/cashbox/mid.png'),
    loadPng('/ui/cashbox/right.png'),
  ])
  const nums = await Promise.all(
    Array.from({ length: 10 }, (_, d) => loadPng(`/ui/num/${d}.png`)),
  )
```
返回对象加 `cashBox: { left, mid, right }, nums`。

- [ ] **Step 2: drawNumber(数字右对齐)**

menu-box.ts 加(module 级函数):
```ts
/** 画数字(右对齐:个位右边缘固定在 rightX,往左排)。原版 PAL_DrawNumber 黄色右对齐。 */
function drawNumber(
  ctx: CanvasRenderingContext2D,
  value: number,
  rightX: number,
  y: number,
  nums: (ImageBitmap | undefined)[],
): void {
  const s = String(Math.max(0, Math.floor(value)))
  let x = rightX
  for (let i = s.length - 1; i >= 0; i--) {
    const d = s.charCodeAt(i) - 48 // '0'=48
    const img = nums[d]
    if (img) {
      x -= img.width
      ctx.drawImage(img, x, y)
    }
  }
}
```

- [ ] **Step 3: drawCashBox(横卷轴)**

menu-box.ts 加:
```ts
/** 金钱横卷轴(原版 PAL_CreateSingleLineBox):左头 + 中段×nLen + 右头。frame 44/45/46。 */
function drawCashBox(
  ctx: CanvasRenderingContext2D,
  box: { left?: ImageBitmap; mid?: ImageBitmap; right?: ImageBitmap },
  x: number,
  y: number,
  nLen: number,
): void {
  let cx = x
  if (box.left) {
    ctx.drawImage(box.left, cx, y)
    cx += box.left.width
  }
  if (box.mid) {
    for (let i = 0; i < nLen; i++) {
      ctx.drawImage(box.mid, cx, y)
      cx += box.mid.width
    }
  }
  if (box.right) ctx.drawImage(box.right, cx, y)
}
```

- [ ] **Step 4: renderMain 顶部画金钱卷轴**

`render` 签名加 `world`(已有)。`renderMain` 改成接 `world.money`,在画主菜单框**之前**画金钱卷轴(原版布局 (0,0) / label (10,10) / 数字 (49,14)):
```ts
private renderMain(ctx, state, world, now): void {
  // 金钱横卷轴(原版主菜单顶部 PAL_ShowCash)
  drawCashBox(ctx, this.assets.cashBox, 0, 0, 5)
  renderSpans(ctx, [{ text: lookupText('menu.cash', this.locale) }], 10, 10, {
    glyphs: this.glyphs, shadow: true, forceRgba: COLOR_NORMAL,
  })
  drawNumber(ctx, world.money, 90, 14, this.assets.nums) // rightX 浏览器调到贴合卷轴
  // …原有主菜单框 + 项渲染…
}
```
> `render` 调用处把 `world` 传进 `renderMain`(目前 renderMain 只收 state/now,补 world)。
> locale 加 `'menu.cash': '金钱'`(content/src/locale.ts)。

- [ ] **Step 5: typecheck + biome**

Run: `pnpm --filter @type-pal/reforge run typecheck && pnpm exec biome check packages/reforge/src/menu/menu-box.ts packages/content/src/locale.ts`
Expected: 0 error 0 warning。

- [ ] **Step 6: 浏览器验**

`pnpm --filter @type-pal/reforge run dev` → Esc 开菜单。核对:左上金钱横卷轴(棕黄卷轴)+「金钱」+ 数字 0(黄色)、卷轴在主菜单框上方、×4 高清。数字位置/卷轴 nLen 不贴合就调 `drawNumber` 的 rightX 和布局常量(浏览器看)。截图自查,跑完删验收图。

- [ ] **Step 7: commit**

```bash
git add packages/reforge/src/menu/menu-box.ts packages/content/src/locale.ts
git commit -m "feat(reforge): 主菜单金钱横卷轴 + 数字渲染(对齐原版 PAL_ShowCash)"
```

---

## Self-Review

1. **覆盖**:money 字段(T1)→ 素材 bake(T1)→ 横卷轴/数字渲染(T2)→ 集成(T2)。✅
2. **真值**:横卷轴 44/45/46、数字黄 19-28、布局 (0,0)/(10,10)/(49,14) 均查证 sdlpal 标注行号。✅
3. **阶段隔离**:money 在 content、资产走 migrate bake、渲染在 reforge。✅
4. **类型一致**:`drawNumber`/`drawCashBox` 签名与调用一致;`nums` 索引=数字值(bake 时 19+d→d.png 对应)。✅
5. **务实**:数字 rightX / 卷轴位置浏览器调(canvas 同主菜单);阴影(原版 SingleLineBox 有 shadow)本次先不做,留 polish(横卷轴细、阴影不明显)。⚠ 已在 T2 Step6 标注。
