# D16 渲染地基改造计划（格坐标 + 物理 1280 + UI 高清化）

> **For agentic workers:** REQUIRED SUB-SKILL `superpowers:subagent-driven-development` 或 `executing-plans` 逐 Task 实现。Steps 用 checkbox（`- [ ]`）跟踪。
>
> 决策依据：[D16](../decisions.md)。本计划只**实施**已拍板的内容，不重新议。范围铁律见 [READ-FIRST.md](../READ-FIRST.md)。

**Goal:** 把 reforge 渲染从「实体存像素、渲染绑死素材像素、UI 锁死 320」改造为 [D16](../decisions.md) 的地基：① 世界实体坐标改逻辑格 `GridPos={col,row,height?}`（根治半格 bug）；② 物理分辨率 320→1280；③ UI / 字模真高清化（信息密度驱动）；④ `h`/lower-upper 维持旧兼容层不动。改造后菜单及一切 UI / 美术 / 编辑器都长在此地基上。

**范围（硬边界）：**
- ✅ 做：世界坐标格化（`render.ts` / `movement.ts` / `collision.ts` / `main.ts` / `content` 的实体 pos）+ 物理 1280 + UI/字模高清化 + 新字模源。
- ✅ `h`/lower-upper **不动**（旧格式兼容层，D16 已定其归属，迁移器翻新图后才退役）。
- ❌ 不做：菜单（[D17](../decisions.md)，待本计划落地）；世界资产 HD（远期，×4 整数倍、提取器放大版，本计划不碰）；logical-size manifest（当前无需）；移动 NPC / 动态碰撞（[backlog 议题 15](../design-backlog.md)）；对话框 UI 布局重设计（本计划只做坐标机制高清化，不重设计版面）。

**关键设计决策（plan 内不再议，照此实现）：**
- **逻辑坐标** `GridPos = { col: number; row: number; height?: number }`。落脚点 = cell 中心、一格一点。`height` 默认无值（地面），留飞行/楼层/遮挡投影扩展口。
- **格 → 像素换算**：iso cell 中心像素 = `(col*TILE_W, row*TILE_H)`（`TILE_W=32, TILE_H=16`，世界逻辑常量，与素材实际像素解耦）。实体的 `worldX/worldY`（渲染用）由 `GridPos` 经此换算导出，**实体不再存像素**。
- **物理分辨率**：canvas 内部缓冲 1280×800（4x）；世界逻辑仍按 320×200 坐标系运算，渲染时整体 ×4。世界整数倍放大 → 感官一致、零逻辑改动（D16「世界-HD 远期」）。
- **UI 高清化机制**：UI（对话/菜单）**不**走「画到 320 离屏再 ×4 放大」低清路线；UI 元素按物理 1280 精度直接画。UI 逻辑坐标（如对话框 POS 常量）×4 落到物理像素。
- **字模**：原 16px Unifont 点阵在高密度下糊 → 引入高清字模源（Task 5 单独处理，源材料待定时留口）。字模渲染走 wall-clock（[typewriter.ts](../../../packages/reforge/src/text/typewriter.ts) 不动），与移动 10fps tick 解耦。

---

## Task 1: 定义 GridPos + 格↔像素换算纯函数（TDD）

**Files:** 新建 `packages/reforge/src/grid.ts`、`grid.test.ts`

**Why first:** 所有下游（movement / collision / render / main / content）都依赖这个原语。先立纯函数 + 单测，下游改动有锚。

**Interfaces:**
```ts
export interface GridPos {
  col: number
  row: number
  height?: number // 垂直高度轴;地面站立无值。飞行/楼层/遮挡投影扩展(D16)
}
export const TILE_W = 32 // iso 世界逻辑格宽(逻辑常量,与素材实际像素解耦)
export const TILE_H = 16
/** 格中心 → 世界像素(逻辑层;渲染前用)。 */
export function gridToPixel(pos: GridPos): { x: number; y: number }
/** 世界像素 → 格(col,row,落点按 cell 中心取整)。注:不返回 h —— h 是碰撞兼容层内部量,不进坐标。 */
export function pixelToGrid(x: number, y: number): { col: number; row: number }
/** 一步 IsoOffset:四方向各 (±16,±8)。逻辑层用(移动 intent)。 */
export const STEP: Record<Facing, GridPos> // down={col:0,row:0}? → 见下说明
```

> ⚠ iso 步长 `(±16,±8)` 在格坐标下的表达需要 plan 实现时厘清：一步 `(16,8)` = 半个 tile 宽 + 半个 tile 高。选项：(a) `GridPos` 用**半格**单位（col/row 以半步为 1），一步 ±1；(b) 保持整格 col/row，步进用**像素偏移**驱动碰撞、落脚取整回格。**Task 1 Step 0 先验证哪个保住「落脚点恒在 cell 中心」不变量**（半格 bug 的根治就在这步——不能让一步落在两格之间）。这步结论直接决定 movement / collision 的签名，是整个 plan 的命门。

- [ ] **Step 0: 厘清 iso 步进在格坐标下的表达（设计验证，先于写码）**
  - 读 `movement.ts` 注释 + `collision.ts` `pixelToTile`，确认「一步 = (±16,±8)、两步跨一格、落脚恒在 cell 中心」的现状不变量。
  - 决定 `GridPos` 单位（半格 vs 整格 + 像素步进）。**判定标准**：改完后，玩家从 `entry` 出发走任意步数，落脚点像素经 `gridToPixel` 回算必须恒等于 cell 中心（即 `col*TILE_W, row*TILE_H`），不出现「两格之间」。
  - 把结论写进 `grid.ts` 文件头注释 + 本 plan 的「Architecture」回填。

- [ ] **Step 1: 写失败测试**（`grid.test.ts`）

```ts
import { describe, expect, test } from 'vitest'
import { TILE_W, TILE_H, gridToPixel, pixelToGrid } from './grid.js'

describe('grid 坐标', () => {
  test('格中心 → 像素', () => {
    expect(gridToPixel({ col: 40, row: 52 })).toEqual({ x: 40 * 32, y: 52 * 16 }) // 1280, 832
  })
  test('像素 → 格(cell 中心取整)', () => {
    expect(pixelToGrid(1280, 832)).toEqual({ col: 40, row: 52 })
  })
  test('height 不影响 col/row(独立轴)', () => {
    expect(gridToPixel({ col: 1, row: 1, height: 5 })).toEqual(gridToPixel({ col: 1, row: 1 }))
  })
  // 半格不变量回归(命门):相邻可达格的像素差必为 cell 中心
  test('相邻格像素差 = 整格(TILE_W/TILE_H 的组合),不出现半格', () => {
    // 按 Step 0 结论填:从一格走 N 步,落脚像素恒在 (col*TILE_W, row*TILE_H)
  })
})
```

- [ ] **Step 2: 跑失败** → `pnpm --filter @type-pal/reforge exec vitest run src/grid.test.ts` → FAIL（`grid.ts` 不存在）

- [ ] **Step 3: 实现 `grid.ts`**（按 Step 0 结论）

- [ ] **Step 4: 测试通过 + check 绿 + commit**
  - `pnpm --filter @type-pal/reforge exec vitest run src/grid.test.ts` → PASS
  - `pnpm --filter @type-pal/reforge run check` → 绿
  - `git add packages/reforge/src/grid.ts packages/reforge/src/grid.test.ts`
  - `git commit -m "feat(reforge): grid.ts — GridPos + 格↔像素换算纯函数(D16 地基)"`

---

## Task 2: movement.ts 改用 GridPos（intent → 纯函数 → 结果）

**Files:** `movement.ts`、`movement.test.ts`

**Architecture:** 保持 D2 红线「意图 → 纯函数碰撞判定 → 结果」。`resolveMove` 的输入输出从 `Vec2(像素)` 改 `GridPos`；`isBlocked` 注入签名改按格（或按 Task 1 Step 0 决定的步进模型）。**撞墙原地停的语义不动**（既有红线）。

- [ ] **Step 1: 改 resolveMove 签名为 GridPos**
  - `MoveIntent` 改为格步进（按 Task 1 结论）；`IsBlocked` 改为 `(pos: GridPos) => boolean` 或保持像素但内部用 `gridToPixel`。
  - 半格 bug 在这里根治：用格单位后，单步不可能落在两格之间，撞墙回退天然保不变量。
  - 注释更新：删掉「iso 奇偶守恒」那段像素时代解释，换成「格坐标下落脚恒在 cell 中心」。

- [ ] **Step 2: 改 movement.test.ts**
  - 现有 3 个测试改用 GridPos 坐标（如 `{col:38,row:52}` 代替 `{x:1216,y:832}`）。
  - 「撞墙原地停 / 不滑行」「半格不变量」两个回归测试**保留并强化**（这是 D16 要根治的 bug，测试钉死）。

- [ ] **Step 3: 跑测试 + check 绿**
  - `pnpm --filter @type-pal/reforge exec vitest run src/movement.test.ts` → PASS
  - `pnpm --filter @type-pal/reforge run check` → 绿

- [ ] **Step 4: commit**
  - `git commit -m "refactor(reforge): movement 改 GridPos — 意图→纯函数判定→结果(D16);半格 bug 从单位层根治"`

---

## Task 3: collision.ts —— 旧兼容层不动，加 GridPos 入口

**Files:** `collision.ts`、`collision.test.ts`

**Architecture:** D16 已定：`pixelToTile` + `h`/lower-upper 是**旧格式兼容层**，不动。但上游（main 的 isBlocked）改用 GridPos 后需要一个**格入口**。做法：加 `isBlockedAt(map, pos: GridPos)`，内部 `gridToPixel(pos)` → 复用现有 `buildIsBlocked`（像素→菱形→查障碍）。旧 `buildIsBlocked`/`sameTile` 签名可保留兼容，或包一层。

- [ ] **Step 1: 加 `isBlockedAt(map, pos: GridPos): boolean`**
  - 内部 `const {x,y} = gridToPixel(pos); return buildIsBlocked(map)(x,y)` —— 复用旧像素判定，零行为变化。
  - `sameTile` 同理加格入口 `sameGrid(a: GridPos, b: GridPos)`（实体碰撞用）。
  - 文件头注释明确：`pixelToTile`/`h` = 旧格式兼容层（D16），迁移器翻新图后退役。

- [ ] **Step 2: 改 collision.test.ts**
  - 新增 `isBlockedAt` / `sameGrid` 的格坐标测试（用鬼格 `{col:40,row:52}`）。
  - 旧像素测试保留（兼容层还在用），不删。

- [ ] **Step 3: 测试 + check 绿 + commit**
  - `git commit -m "feat(reforge): collision 加 GridPos 入口(isBlockedAt/sameGrid);旧 h/像素层不动(D16 兼容层)"`

---

## Task 4: content 实体 pos 改 GridPos + main 串起来

**Files:** `packages/content/src/index.ts`（`EntityDef.pos` / `SceneDef.entry.pos`）、`packages/reforge/src/main.ts`

**Why:** 实体坐标是内容的真值，要从像素改格（D16 铁律「杜绝像素坐标身份」）。

- [ ] **Step 1: content schema —— `Vec2` 像素 pos 改 `GridPos`**
  - `EntityDef.pos: GridPos`、`SceneDef.entry.pos: GridPos`。
  - `guijieMinjuScene` 数据改：鬼 `{x:1280,y:832}` → `{col:40,row:52}`；entry `{x:1216,y:832}` → `{col:38,row:52}`（按 gridToPixel 反算核对：1216/32=38, 832/16=52 ✓；1280/32=40 ✓）。
  - content 的测试（`content.test.ts`）如有断言像素的，改格。

- [ ] **Step 2: main.ts —— 实体存 GridPos、渲染时 gridToPixel**
  - `player.pos` 从 `{x,y}` 改 `GridPos`；移动循环用 Task 2 的 `resolveMove(GridPos)`；`isBlocked` 用 Task 3 的 `isBlockedAt`。
  - `render()` 里构造 `SpriteDraw` 时 `worldX = gridToPixel(pos).x`（渲染层才回像素）。
  - 相机 / room 包围盒：现状按像素算（`roomMinX` 等），可保留像素（相机是显示层概念），或一并改格——**显示层概念允许留像素**，但 player 跟踪改 GridPos 后，相机跟随用 `gridToPixel(player.pos)`。按 Task 1 Step 0 结论统一。
  - `nearbyInteractable` 的距离判：现状像素差 `ex*ex+ey*ey <= 48*48`，改用格距离或 gridToPixel 后算像素差。

- [ ] **Step 3: check 绿 + 浏览器冒烟（移动 + 碰撞 + 对话不回归）**
  - `pnpm --filter @type-pal/reforge run check` → 绿
  - `pnpm --filter @type-pal/reforge run dev`：方向键走、撞墙停、靠近鬼按空格对话、`?collision` debug 层红绿格正常。
  - **重点验半格 bug 根治**：故意撞墙多次、绕障碍，落脚点不出现「两格之间」（debug 层黄点恒落 cell 中心）。

- [ ] **Step 4: commit**
  - `git commit -m "refactor(reforge): content/main 实体坐标改 GridPos — 落脚恒在 cell 中心(D16);半格 bug 根治验收"`

> 阶段性 milestone：**至此世界坐标格化完成（D16 核心）**。Task 5–7 是物理分辨率 + UI 高清化，可在此 milestone 后单独做。

---

## Task 5: 物理 320→1280 + 世界渲染 ×4（世界-HD 整数倍放大）

**Files:** `packages/reforge/index.html`、`render.ts`、`main.ts`

**Why:** D16「世界-HD 远期」= ×4 整数倍、提取器放大版或渲染时整体 ×4。当前用「渲染时整体 ×4」最快（提取器放大版属 P3 资产管线，本计划先靠 ×4 缩放）。

- [ ] **Step 1: index.html canvas 改 1280×800**
  - `<canvas width="1280" height="800">`；CSS `width/height` 调成对应显示尺寸（保持像素观感：`image-rendering: pixelated` 对世界层保留，UI 层按 Task 6 单独处理）。
  - 删注释「视口 320×200 放大 3×」，改「物理 1280×800（4x），逻辑 320×200」。

- [ ] **Step 2: render.ts —— 世界渲染整体 ×4**
  - `Canvas2DRenderer` 构造或渲染入口加 `scale = 4`（D16「整数倍放大」）。
  - 简单做法：`ctx.save(); ctx.scale(4,4); ...世界绘制...; ctx.restore()`。世界坐标仍按 320×200 逻辑画，×4 放大到物理。
  - 遮挡排序（baseY）不受影响（都在逻辑坐标算，最后统一 ×4）。

- [ ] **Step 3: main.ts —— 视口/相机按新物理尺寸**
  - `VIEW_W/VIEW_H` 仍是逻辑 320/200（相机逻辑），但 canvas 物理是 1280/800；渲染时 ×4。
  - `?collision` debug 层坐标相应 ×4（或在 scale 内画）。

- [ ] **Step 4: 浏览器验 + commit**
  - 世界画面 ×4 放大、感官与原 320 一致（无变形）、移动/碰撞不回归。
  - `git commit -m "feat(reforge): 物理 1280×800 + 世界渲染 ×4 整数倍(D16 世界-HD 整数倍放大)"`

---

## Task 6: UI 坐标高清化（对话框 POS ×4 + UI 不走低清放大）

**Files:** `dialog-box.ts`、`text-render.ts`、相关 layout

**Why:** D16「UI-HD 近期」= UI 元素按物理 1280 精度真高清渲染，**不**走「320 离屏 ×4 放大」低清路线。机制：UI 逻辑坐标（如 `POS.bottom.text`）×4 落到物理像素。**版面不重设计**（只做坐标机制高清化；版面是 D17 菜单的事）。

- [ ] **Step 1: dialog-box.ts POS 常量机制化**
  - 现状 `POS` 是写死 320 系数字（如 `text:{x:44,y:126}`）。改为「逻辑常量 × SCALE」：定义 `UI_SCALE = 4`，POS 值逻辑常量、渲染时 `× UI_SCALE`。
  - `LINE_HEIGHT`、`MAX_RIGHT`、`CURSOR_RESERVE` 同理 ×4。

- [ ] **Step 2: text-render.ts 字模 blit 位置 ×4**
  - `renderSpans` 的 `cursorX += w`（字宽）按高清字模宽度；`x`/`y` 落点 ×4。
  - 阴影偏移（现 `+1,+1`）按物理像素调（可能 `+4,+4` 或保持 1px 细阴影，审美待验）。

- [ ] **Step 3: 浏览器验对话框不回归 + commit**
  - 对话框位置/折行/打字/光标/头像正常，仅整体 ×4 清晰。
  - `git commit -m "feat(reforge): UI 坐标高清化 — 对话框/字模 ×4 物理精度(D16 UI-HD 近期)"`

> ⚠ 若 16px 字模 ×4 后糊得不可接受，说明 Task 7（高清字模源）必须同步做——Task 6/7 可能要合并，视验收。

---

## Task 7: 高清字模源（如 Task 6 验收发现 16px 放大糊）

**Files:** `glyph.ts`、`text/glyph.ts`、字模数据源

**Why:** D16「字模高清化必做」。原 16px Unifont 点阵 ×4 会糊（更大点阵放大不更密、只更大）。需更高分辨率字模源。**源材料待定**（更大点阵 Unifont / 矢量 / 作者自备），本 Task 先留接入口。

- [ ] **Step 0: 确认字模源**（问作者）
  - 选项：(a) Unifont 更高分辨率变体；(b) 矢量字体（如开源宋体）离线渲染点阵；(c) 作者自备高清点阵；(d) 暂用 16px 放大（若 Task 6 验收可接受）。
  - 是否保留像素字观感（D16「由 spec 定」）—— 本 plan 定：**先保留像素观感**（与原版一致），矢量留后续。

- [ ] **Step 1: glyph.ts 支持高清字模尺寸**
  - 现 `Glyph.width/height` 写死 8/16；改为支持任意尺寸（高清字模 width 可能 32/64）。
  - `decodeGlyph` 纯函数已尺寸无关（按 width/height 算），主要改数据加载 + `bakeGlyph` canvas 尺寸。

- [ ] **Step 2: 替换 glyphs.json 数据源**（按 Step 0 决定）

- [ ] **Step 3: 浏览器验字模清晰度 + check 绿 + commit**
  - `git commit -m "feat(reforge): 高清字模源(D16 必做) — <源说明>"`

---

## Task 8: 收口 + 文档同步

**Files:** `docs/phase2/decisions.md`（D16 影响栏标「已落地」）、`roadmap.md`、`.remember`

- [ ] **Step 1: roadmap「进展」更新**（D16 落地 → 下一步菜单 D17 解锁）
- [ ] **Step 2: D16 影响栏标完成 + 删「待写 spec」改为「见 render-foundation-plan.md，已落地」**
- [ ] **Step 3: `.remember/today-*.md` 记录**
- [ ] **Step 4: 最终全量验收**
  - `pnpm --filter @type-pal/reforge run check` → 绿
  - `pnpm exec biome check packages/reforge/src packages/content/src` → 0/0
  - 浏览器：世界移动/碰撞/对话/半格根治/物理 1280/UI 高清，全过。
  - `git commit -m "docs(phase2): D16 渲染地基落地收口 — roadmap/remember 同步"`

---

## Self-Review（计划作者自查）

1. **覆盖 D16 全部要点**：格坐标（T1–T4）+ 物理 1280 + UI-HD（T5–T7）+ h/旧兼容层不动（T3 注释明确）+ 范围拆两半（T4 milestone 后 T5–7 可单独做）。✅
2. **半格 bug 根治有钉子**：T1 Step 0（命门设计验证）+ T2 强化回归测试 + T4 浏览器重点验。✅
3. **范围不蔓延**：菜单（D17）/ 世界 HD / manifest / 移动 NPC / 对话框版面重设计，全部明确划出不做。✅
4. **不破既有**：D2 红线（resolveMove 纯函数 + isBlocked 注入）保持；撞墙停语义不动；旧碰撞兼容层（pixelToTile/h）不删只加入口；打字 wall-clock 不动。✅
5. **可测**：grid/movement/collision 纯函数单测；实体坐标 + 物理分辨率 + UI 高清靠浏览器验收（同 npc-collision / palette 切片的务实偏离）。✅
6. **风险点标注**：T1 Step 0（iso 步进表达，命门）、T6/T7（字模清晰度，可能合并）。✅

## 待议（plan 不阻塞，实现时遇到再问作者）

- **iso 步进在格坐标下的确切表达**（T1 Step 0）：半格单位 vs 整格 + 像素步进。这是唯一可能在实现时卡住的设计点，需实测不变量后定。
- **字模源**（T7 Step 0）：作者定。
- **相机/room 是否一并改格**（T4 Step 2）：显示层概念，倾向留像素，但若与 GridPos player 跟踪摩擦大则统一。
