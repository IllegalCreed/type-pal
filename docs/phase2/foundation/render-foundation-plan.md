# D16 渲染地基改造计划（格坐标 + 物理 1280 + UI 高清化）

> **For agentic workers:** REQUIRED SUB-SKILL `superpowers:subagent-driven-development` 或 `executing-plans` 逐 Task 实现。Steps 用 checkbox（`- [ ]`）跟踪。
>
> 决策依据：[D16](../decisions.md)。本计划只**实施**已拍板的内容，不重新议。范围铁律见 [READ-FIRST.md](../READ-FIRST.md)。

**Goal:** 把 reforge 渲染从「实体存像素、渲染绑死素材像素、UI 锁死 320」改造为 [D16](../decisions.md) 的地基：① 世界实体坐标改逻辑格 `GridPos={col,row,height}`（实体位置回归格语义）；② 物理分辨率 320→1280；③ UI 真高清化（信息密度驱动）。改造后菜单及一切 UI / 美术 / 编辑器都长在此地基上。

**范围（硬边界）：**
- ✅ 做：世界坐标格化（`render.ts` / `movement.ts` / `collision.ts` / `main.ts` / `content` 的实体 pos）+ 物理 1280 + UI 高清化。
- ✅ `h`/lower-upper **不动**（旧格式兼容层，D16 已定其归属，迁移器翻新图后才退役）。
- ✅ **点阵字模沿用**（整数倍放大 = 锐利，不换源）。
- ❌ 不做：菜单（[D17](../decisions.md)，待本计划落地）；世界资产 HD（远期，×4 整数倍、提取器放大版，本计划只做渲染时整体 ×4 缩放）；logical-size manifest（当前无需）；移动 NPC / 动态碰撞（[backlog 议题 15](../design-backlog.md)）；对话框 UI 布局重设计（本计划只做坐标机制高清化，不重设计版面）；高清字模源（不换源）。

**关键设计决策（plan 内不再议，照此实现）：**

### iso 移动的几何真相（务必先理解，否则会写错）

仙剑是**等距(isometric)菱形**地图:tile 32×16(2:1),走一格屏幕斜移 `(±16,±8)`。**关键认知:菱形网格 = 旋转 45° 的正交网格。** 沿菱形的两条斜边各设一个轴(col / row),则:

- **每个落脚点 = 一个唯一整数 `(col,row)`**;走一格 = **单轴 ±1**(只动 col 或只动 row,**绝不同时变**)。
- 四方向 ↔ 单轴(已逐一验算):右下 `col+1`、左上 `col−1`、左下 `row+1`、右上 `row−1`。
- **任意整数 `(col,row)` 都是合法落脚点**——无「一半坐标非法」问题、无需校验。
- 「撞墙半格」是旧 movement 撞墙单轴回退 bug,已由 `resolveMove` 撞墙停修掉(commit `e7253ad`),与坐标无关。

> ⚠ **不要**拿「屏幕像素轴 `(x/16, y/8)`」当坐标——那是把斜网格硬塞进正交屏幕轴,会得两个毛病:① 走一格 col/row **同时** ±1(对角,违背"走一格只动一轴");② `col+row` 必偶、**半数坐标非法**。正解是**用菱形自己的斜边当轴**(下面 `gridToPixel` 的线性组合),逻辑层就是干净的正交网格、走一格单轴 ±1。

### GridPos 定义

```ts
export interface GridPos {
  col: number   // iso 菱形轴1(沿"右下"斜边);每个落脚点唯一整数,走一格单轴 ±1
  row: number   // iso 菱形轴2(沿"左下"斜边)
  height: number // 垂直离地轴(与平面 col/row 正交);地面 = 0,飞行/楼层/高台 > 0。
                 // 对接渲染遮挡(render.ts baseY 含 iTileHeight 的同类投影)
}
```

`GridPos` = **实体位置的真值类型**。玩家、NPC、entry、编辑器摆点都存它。精灵是三维空间里的东西（平面格子 + 离地高度），`height` 让飞行 / 楼层位置可表达。地面实体一律 `height: 0`。

### 渲染换算

- **格 → 像素（菱形轴）**：`gridToPixel(col,row) = ( 16×(col−row), 8×(col+row) )`；`pixelToGrid` 唯一反解（站位像素必得整数）。`height` 不进平面投影。
- **height 显示（垂直高度的视觉）**：实体逻辑 / 碰撞 / **影子**都在地面 `(col,row)`；`height` 只把 **sprite 画的位置沿屏幕正上方移** —— 每级 = 16px（= 「正上方相邻站位」的距离，即菱形轴对角格 `(col−h, row−h)` 的屏幕位置）。公式：`sprite 屏幕 y = gridToPixel(col,row).y − height×16`，影子画在 `gridToPixel(col,row)`。**纯显示层、不进逻辑 / 碰撞**（height 仍是正交独立轴；遮挡排序 baseY 另含 height，render Task 处理）。
- **物理分辨率**：canvas 内部 1280×800（4x）；逻辑仍按 320×200 算，渲染整体 ×4。
- **UI 高清化**：UI（对话/菜单）**不**走「画到 320 离屏再 ×4」低清路线；UI 逻辑坐标（如对话框 POS 常量）×4 落物理像素。**字模不换源**：16px 点阵 ×4 = 64px 锐利点阵字（nearest-neighbor）。
- **移动显示**：保持 ~10fps 步进卡顿感（[main.ts:29](../../../packages/reforge/src/main.ts) `STEP_MS=100`），不做平滑插帧。

---

## Task 1: 定义 GridPos + 格↔像素换算纯函数（TDD）

**Files:** 新建 `packages/reforge/src/grid.ts`、`grid.test.ts`

**Why first:** 所有下游（movement / collision / render / main / content）都依赖这个原语。先立纯函数 + 单测，下游改动有锚。

- [ ] **Step 1: 写失败测试**（`grid.test.ts`）

```ts
import { describe, expect, test } from 'vitest'
import { gridToPixel, pixelToGrid, type GridPos } from './grid.js'

describe('grid 坐标(菱形轴)', () => {
  test('格 → 像素 = (16(col−row), 8(col+row))', () => {
    expect(gridToPixel({ col: 90, row: 14, height: 0 })).toEqual({ x: 1216, y: 832 }) // ●
    expect(gridToPixel({ col: 91, row: 14, height: 0 })).toEqual({ x: 1232, y: 840 }) // ○(仅 col+1)
  })
  test('像素 → 格(唯一反解,站位必得整数)', () => {
    expect(pixelToGrid(1216, 832)).toEqual({ col: 90, row: 14 })
    expect(pixelToGrid(1232, 840)).toEqual({ col: 91, row: 14 })
  })
  test('height 不影响平面投影(独立轴)', () => {
    expect(gridToPixel({ col: 90, row: 14, height: 5 })).toEqual(gridToPixel({ col: 90, row: 14, height: 0 }))
  })
  test('走一格 = 单轴 ±1(四方向各一个轴,绝不对角)', () => {
    // ● (1216,832) 四方向各走一步,只动一个轴:
    expect(pixelToGrid(1216 + 16, 832 + 8)).toEqual({ col: 91, row: 14 }) // 右下 col+1
    expect(pixelToGrid(1216 - 16, 832 - 8)).toEqual({ col: 89, row: 14 }) // 左上 col−1
    expect(pixelToGrid(1216 - 16, 832 + 8)).toEqual({ col: 90, row: 15 }) // 左下 row+1
    expect(pixelToGrid(1216 + 16, 832 - 8)).toEqual({ col: 90, row: 13 }) // 右上 row−1
  })
})
```

- [ ] **Step 2: 跑失败** → `pnpm --filter @type-pal/reforge exec vitest run src/grid.test.ts` → FAIL（`grid.ts` 不存在）

- [ ] **Step 3: 实现 `grid.ts`**
```ts
export interface GridPos { col: number; row: number; height: number }
export const HALF_W = 16 // iso 一步 x 分量(半个 tile 宽)
export const HALF_H = 8  // iso 一步 y 分量(半个 tile 高)
/** 菱形轴格 → 像素:x = 16(col−row), y = 8(col+row)。height 不投影(独立轴)。 */
export function gridToPixel(p: GridPos): { x: number; y: number } {
  return { x: HALF_W * (p.col - p.row), y: HALF_H * (p.col + p.row) }
}
/** 像素 → 菱形轴格:唯一反解(a=col−row, b=col+row)。站位像素必得整数。 */
export function pixelToGrid(x: number, y: number): { col: number; row: number } {
  const a = x / HALF_W // col − row
  const b = y / HALF_H // col + row
  return { col: Math.round((b + a) / 2), row: Math.round((b - a) / 2) }
}
```

- [ ] **Step 4: 测试通过 + check 绿 + commit**
  - `pnpm --filter @type-pal/reforge exec vitest run src/grid.test.ts` → PASS
  - `pnpm --filter @type-pal/reforge run check` → 绿
  - `git add packages/reforge/src/grid.ts packages/reforge/src/grid.test.ts`
  - `git commit -m "feat(reforge): grid.ts — GridPos 菱形轴(col,row,height)+格↔像素纯函数(D16 地基)"`

---

## Task 2: movement.ts 改用 GridPos（保持 D2 红线）

**Files:** `movement.ts`、`movement.test.ts`

**Architecture:** 保持 D2 红线「意图 → 纯函数碰撞判定 → 结果」。`resolveMove` 输入输出从 `Vec2(像素)` 改 `GridPos`；`isBlocked` 注入签名改按格。**撞墙原地停的语义不动**（既有红线，commit `e7253ad` 修的就是这个——撞墙不单轴滑行）。

- [ ] **Step 1: 改 movement.ts 签名为 GridPos**
  - `MoveIntent` 改菱形轴**单轴**步进:`down={dcol:0,drow:+1}` / `up={dcol:0,drow:-1}` / `left={dcol:-1,drow:0}` / `right={dcol:+1,drow:0}`（走一格只动一个轴,与四方向一一对应）；`resolveMove(pos: GridPos, intent, isBlocked: (p: GridPos)=>boolean): GridPos`。
  - 撞墙逻辑不变：目标 `isBlocked` → 返回原 `pos`（不单轴滑行）。注释更新：删掉像素时代「奇偶守恒」解释，换成「菱形轴下走一格单轴 ±1、落点恒整数，撞墙停步保持站位」。
  - `height` 移动时一般不变（地面行走 height 恒 0；飞行机制留后续），但签名带上以便将来扩展。

- [ ] **Step 2: 改 movement.test.ts**
  - 现有测试改用 GridPos（如 `{col:2,row:2,height:0}` 代替 `{x:32,y:16}`）。
  - 「撞墙原地停 / 不滑行」回归测试**保留**（commit `e7253ad` 的核心语义，不能退化）。

- [ ] **Step 3: 跑测试 + check 绿**
  - `pnpm --filter @type-pal/reforge exec vitest run src/movement.test.ts` → PASS
  - `pnpm --filter @type-pal/reforge run check` → 绿

- [ ] **Step 4: commit**
  - `git commit -m "refactor(reforge): movement 改 GridPos(菱形轴) — 保持 D2 纯函数红线 + 撞墙停步语义(D16)"`

---

## Task 3: collision.ts —— 旧兼容层不动，加 GridPos 入口

**Files:** `collision.ts`、`collision.test.ts`

**Architecture:** D16 已定：`pixelToTile` + `h`/lower-upper 是**旧格式兼容层**，不动。上游改 GridPos 后加一个**格入口**：内部 `gridToPixel` → 复用现有 `buildIsBlocked`（像素→菱形→查障碍），零行为变化。

- [ ] **Step 1: 加 `isBlockedAt(map, pos: GridPos): boolean`**
  - 内部 `const {x,y} = gridToPixel(pos); return buildIsBlocked(map)(x,y)` —— 复用旧像素判定。
  - `sameTile` 同理加格入口 `sameGrid(a: GridPos, b: GridPos)`（实体碰撞用）。
  - 文件头注释明确：`pixelToTile`/`h` = 旧格式兼容层（D16），迁移器翻新图后退役。

- [ ] **Step 2: 改 collision.test.ts**
  - 新增 `isBlockedAt` / `sameGrid` 的格坐标测试（用鬼格 `{col:4,row:5,height:0}` 等，按实际数据反算）。
  - 旧像素测试保留（兼容层还在用），不删。

- [ ] **Step 3: 测试 + check 绿 + commit**
  - `git commit -m "feat(reforge): collision 加 GridPos 入口(isBlockedAt/sameGrid);旧 h/像素层不动(D16 兼容层)"`

---

## Task 4: content 实体 pos 改 GridPos + main 串起来

**Files:** `packages/content/src/index.ts`（`EntityDef.pos` / `SceneDef.entry.pos`）、`packages/reforge/src/main.ts`

**Why:** 实体坐标是内容的真值，要从像素改格（D16 铁律「实体位置存格语义」）。

- [ ] **Step 1: content schema —— `Vec2` 像素 pos 改 `GridPos`**
  - `EntityDef.pos: GridPos`、`SceneDef.entry.pos: GridPos`。
  - `guijieMinjuScene` 数据改（**菱形轴**，用 `pixelToGrid` 反算核对）：鬼 `{x:1280,y:832}` → `{col:92,row:12,height:0}`（col−row=1280/16=80、col+row=832/8=104 → col=92,row=12）；entry `{x:1216,y:832}` → `{col:90,row:14,height:0}`（col−row=76、col+row=104 → col=90,row=14）。
  - content 的测试如有断言像素的，改格。

- [ ] **Step 2: main.ts —— 实体存 GridPos、渲染时 gridToPixel**
  - `player.pos` 从 `{x,y}` 改 `GridPos`；移动循环用 Task 2 的 `resolveMove(GridPos)`；`isBlocked` 用 Task 3 的 `isBlockedAt`。
  - `render()` 构造 `SpriteDraw` 时 `const p = gridToPixel(pos); worldX: p.x`（渲染层才回像素）。
  - 相机 / room 包围盒：现状按像素算（`roomMinX` 等），可保留像素（相机是显示层概念），相机跟随用 `gridToPixel(player.pos)`。
  - `nearbyInteractable` 距离判：改用格距离或 `gridToPixel` 后算像素差。
  - `WALK_STEP` 从像素 `{dx,dy}` 改菱形轴**单轴**步进 `{dcol,drow}`：down=`{0,+1}` / up=`{0,-1}` / left=`{-1,0}` / right=`{+1,0}`。

- [ ] **Step 3: check 绿 + 浏览器冒烟（移动 + 碰撞 + 对话不回归）**
  - `pnpm --filter @type-pal/reforge run check` → 绿
  - `pnpm --filter @type-pal/reforge run dev`：方向键走、撞墙停、靠近鬼按空格对话、`?collision` debug 层红绿格正常。
  - 验收点：撞墙多次后落脚仍正常（commit `e7253ad` 的修复不退化）、对话触发不回归。

- [ ] **Step 4: commit**
  - `git commit -m "refactor(reforge): content/main 实体坐标改 GridPos(菱形轴) — 实体位置回归格语义(D16)"`

> 阶段性 milestone：**至此世界坐标格化完成（D16 核心）**。Task 5–6 是物理分辨率 + UI 高清化，可在此 milestone 后单独做。

---

## Task 5: 物理 320→1280 + 世界渲染 ×4（整数倍放大，观感一致）

**Files:** `packages/reforge/index.html`、`render.ts`、`main.ts`

**Why:** D16 物理 1280 = 世界 ×4 整数倍放大，感官一致、零逻辑改动（世界资产 HD 真正落地属远期提取器放大版，本 Task 先靠渲染时整体 ×4 缩放）。

- [ ] **Step 1: index.html canvas 改 1280×800**
  - `<canvas width="1280" height="800">`；CSS 显示尺寸对应调整；`image-rendering: pixelated`（保整数倍放大锐利、点阵字不糊）。

- [ ] **Step 2: render.ts —— 世界渲染整体 ×4**
  - `Canvas2DRenderer` 渲染入口 `ctx.save(); ctx.scale(4,4); ...世界绘制...; ctx.restore()`。世界坐标仍按 320×200 逻辑画，×4 放大到物理。
  - 遮挡排序（baseY）不受影响（都在逻辑坐标算，最后统一 ×4）。
  - `imageSmoothingEnabled = false`（最近邻，点阵锐利）。

- [ ] **Step 3: main.ts —— 视口/相机按新物理尺寸**
  - `VIEW_W/VIEW_H` 仍是逻辑 320/200（相机逻辑），canvas 物理 1280/800，渲染 ×4。
  - `?collision` debug 层坐标相应 ×4（或在 scale 内画）。

- [ ] **Step 4: 浏览器验 + commit**
  - 世界画面 ×4 放大、感官与原 320 一致（无变形）、点阵锐利不糊、移动/碰撞不回归。
  - `git commit -m "feat(reforge): 物理 1280×800 + 世界渲染 ×4 整数倍(D16);image-rendering:pixelated 保锐利"`

---

## Task 6: UI 坐标高清化（对话框 POS ×4 + UI 不走低清放大）

**Files:** `dialog-box.ts`、`text-render.ts`、相关 layout

**Why:** D16「UI-HD 近期」= UI 元素按物理 1280 精度真高清渲染，**不**走「320 离屏 ×4 放大」低清路线。机制：UI 逻辑坐标（如 `POS.bottom.text`）×4 落物理像素。**字模不换源**（16px 点阵 ×4 = 64px 锐利）。**版面不重设计**（只做坐标机制高清化；版面是 D17 菜单的事）。

- [ ] **Step 1: dialog-box.ts POS 常量机制化**
  - 现状 `POS` 写死 320 系数字（如 `text:{x:44,y:126}`）。改为「逻辑常量 × UI_SCALE」：定义 `UI_SCALE = 4`，POS 值逻辑常量、渲染时 `× UI_SCALE`。
  - `LINE_HEIGHT`、`MAX_RIGHT`、`CURSOR_RESERVE` 同理 ×4。

- [ ] **Step 2: text-render.ts 字模 blit 位置 ×4**
  - `renderSpans` 的 `cursorX += w`（字宽）按 ×4 后字宽；`x`/`y` 落点 ×4。
  - **关键：`imageSmoothingEnabled=false` + ×4 整数放大**，16px 点阵 → 64px 锐利（每个原像素变 4×4 实色块），**不糊、不需换源**。
  - 阴影偏移按物理像素调。

- [ ] **Step 3: 浏览器验对话框不回归 + commit**
  - 对话框位置/折行/打字/光标/头像正常，整体 ×4 清晰、点阵字锐利。
  - `git commit -m "feat(reforge): UI 坐标高清化 — 对话框/字模 ×4 物理精度;点阵字整数倍放大(不换源)(D16)"`

> 注：因为 ×4 整数倍 + nearest-neighbor，字模必然锐利，不存在「放大糊」问题。原计划 Task 7（换高清字模源）已删除——整数倍放大点阵字天然清晰，符合 D16「观感一致 + 字模沿用」。

---

## Task 7: 收口 + 文档同步

**Files:** `docs/phase2/decisions.md`（D16 影响栏标「已落地」）、`roadmap.md`、`.remember`

- [ ] **Step 1: roadmap「进展」更新**（D16 落地 → 下一步菜单 D17 解锁）
- [ ] **Step 2: D16 影响栏标完成 + 删「待写 spec」改为「见 render-foundation-plan.md，已落地」**
- [ ] **Step 3: `.remember/today-*.md` 记录**
- [ ] **Step 4: 最终全量验收**
  - `pnpm --filter @type-pal/reforge run check` → 绿
  - `pnpm exec biome check packages/reforge/src packages/content/src` → 0/0
  - 浏览器：世界移动/碰撞/对话/物理 1280/UI 高清，全过。
  - `git commit -m "docs(phase2): D16 渲染地基落地收口 — roadmap/remember 同步"`

---

## Self-Review（计划作者自查）

1. **覆盖 D16 全部要点**：格坐标（T1–T4）+ 物理 1280 + UI-HD（T5–T6）+ h/旧兼容层不动（T3 注释明确）+ 字模沿用（T6 明确不换源）+ 范围拆两半（T4 milestone 后 T5–6 可单独做）。✅
2. **iso 几何正确**：T1 明确「菱形轴」（走一格单轴 ±1、任意整数坐标合法），落脚恒整数。**不存在「半格 bug」**——撞墙处理 bug 已由 movement 现状（撞墙停）修掉，与坐标无关。✅
3. **范围不蔓延**：菜单（D17）/ 世界 HD 提取器版 / manifest / 移动 NPC / 对话框版面重设计 / 高清字模源，全部明确划出不做。✅
4. **不破既有**：D2 红线（resolveMove 纯函数 + isBlocked 注入）保持；撞墙停语义不动（commit `e7253ad`）；旧碰撞兼容层（pixelToTile/h）不删只加入口；打字 wall-clock 不动。✅
5. **可测**：grid/movement/collision 纯函数单测；实体坐标 + 物理分辨率 + UI 高清靠浏览器验收（同 npc-collision / palette 切片的务实偏离）。✅

## 待议（plan 不阻塞，实现时遇到再问作者）

- **相机/room 是否一并改格**（T4 Step 2）：显示层概念，倾向留像素，但若与 GridPos player 跟踪摩擦大则统一。
- **height 移动语义**：地面行走 height 恒 0；飞行/上下楼的 height 变化机制留后续（D16 只定数据结构，不实现飞行）。
