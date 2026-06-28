# UI 黄框渲染修复方案（D17 待审）

> 状态：方案（2026-06-28），待 Claude 审核。两个问题：黑白 + 拉伸纹理。
> 范围：D17 菜单的黄框（主菜单小框）。状态背景/装备格是作者 AI 彩色 PNG，无此问题。

## 1. 两个问题（已用代码核实根因）

### 问题 A：黄框是黑白，不是黄

- `frame-00..08.png` 是 RGBA，像素 R=G=B（视觉灰度）。
- **但这不是 bug，是设计**：提取器 `encodeIndexedPng`（`pal-extract/src/resources/sprite.ts:25-42`）注释明说——**"R=G=B=调色板下标(palette index)，A=opaque mask。不烤色；运行时查调色板填色"**。
- 即 frame PNG 存的是 **palette index**（不是真彩），颜色要**运行时**用 palette 填。这和世界 sprite 的 RLE + palette 烘焙（`render.ts:25 bakeFrame`）完全同构，只是素材格式不同（PNG vs RLE）。
- **我的 T4 错在哪**：`loadMenuAssets` 直接 `createImageBitmap(PNG)` 画了原始 R=index 图 → 黑白。**漏了"查 palette 填色"这一步**。

### 问题 B：九宫格中心块拉伸纹理变形

- frame-04（中心块）背景带纹理，`drawSlicedBox` 中段 `drawImage(... midW, midH)` 拉伸时纹理变形。
- 原版 `PAL_CreateBoxInternal`（sdlpal `ui.c`）用 `PAL_RLEBlitToSurface` **重复 blit** 中心块（平铺），不拉伸。

## 2. 已排除的假设

### ~~"灰度 R = palette index，渲染层 re-tint 即可"~~ ❌ 决定性地排除

- `encodeIndexedPng` 注释确实说"R=palette index"（sprite.ts:13-14）。
- **但 frame-00 的非透明 R 值 = {16,17,18,19,48,50,51,52,53,54,180,181,182,183,184,185,225,228,229,230,231,232}**。
- **决定性验证**：这 22 个 index 在 **palette 0-8 全部都不命中黄色**（暴力扫：每个 palette 下"落黄区"的 index 数 = 0/22）。palette 0 给暗红/棕，palette 1 给灰绿，palette 2 给杂色——**没有任何 extracted palette 让 frame index 变黄**。
- 黄框边线该是黄色系（palette 0 的 index 44-47 = rgb 255,203/223/243/251），但 **frame 像素里根本没有 index 44-47**。
- **唯一解释**：extracted 的 palette.json **不是 UI sprite 实际使用的 palette**（原版 UI 可能用了专门的 palette，或 index 重映射），或者提取器导出 UI frame 的 index 与 expected palette 不匹配。**这是第一阶段提取的数据问题，不是渲染层填色能修复的。**

## 3. 待 Claude 诊断的关键问题（阻塞性）

**问题**：frame-00 的 index（16-232）在所有 extracted palette 下都不是黄色。原版黄框（sdlpal）用 `gPalette`（运行时屏幕 palette）给 `gpSpriteUI` 上色，理应得到黄色。为什么 extracted 的 palette + spriteUI index 对不上？

可能原因（需 Claude 核实原版/提取逻辑）：
- (a) extracted palette.json 存的不是运行时 palette（解码方式不同）？
- (b) UI sprite 的 index 在导出时被改变了？
- (c) 原版 UI 用的是某个特定 palette（不是通用屏幕 palette），extracted 没导出那个？
- (d) frame-00..08 根本不是黄框（黄框在 frame 的别的编号）？

**这个诊断不弄清，方案 1/2/3 都无法保证上色正确**（不知道该用哪个 palette + index 映射）。

## 4. 方案选项（依 §3 诊断结果定）

### 方案 1：渲染层 palette 填色（仅当 §3 确认 palette+index 映射正确时）

reforge 加 `bakeIndexedPng(bitmap, palette)`：读 R=index + A=opaque → palette.colors[index] → 彩色 canvas。同 bakeFrame 思路。但**前提是确认 frame index 该配哪个 palette 得黄**。

### 方案 2：提取器补导出 UI raw RLE bytes（碰第一阶段）

pal-extract 补 `ui-sprite/spriteui-raw.json`（base64 原始 chunk），reforge/migrate 用 parseSpriteChunk + 正确 palette 烘。颜色最准。但碰第一阶段包。

### 方案 3：migrate 实现 UI 上色（作者倾向，但空壳）

长期正解，但 migrate 是空壳，且同样卡在 §3 的 palette+index 诊断。

### 方案 4：代码画占位纯色黄框（先跑通 D17 逻辑）⭐ 推荐

drawSlicedBox 暂不用原版 sprite，代码画矩形边框（黄色描边 + 黑阴影）。**D17 核心价值（菜单状态机 + 数据驱动状态面板 + 三态集成）与框的美术无关**，先跑通逻辑，美术等 §3 诊断清楚 + migrate 实现后回头接。

## 5. 推荐

**方案 4 先跑通**，同时让 Claude 诊断 §3（palette + index 为什么对不上）。理由：
- D17 验证目标（design §1）是数据 schema + 状态机 + 数据驱动 UI，不是黄框美术还原。
- 黑白/纹理是素材管线问题（D15 资产管线范畴），不该卡 D17 功能验证。
- 框的原语 `drawSlicedBox` 接口不变，美术解法（方案 1/2/3）就绪后只换 `box.tiles` 数据源。
- center 平铺（修问题 B）在任何方案里都要做（原版就平铺），方案 4 顺带把 drawSlicedBox 的 center 改成平铺。


## 4. 备选（若方案 1 上色不对）

若 frame index 在当前 palette 下不是黄色（palette 不匹配），备选：
- **方案 2**：提取器补导出 UI raw RLE bytes（base64），reforge/migrate 用 parseSpriteChunk + 正确 palette 烘。颜色最准，但碰第一阶段包。
- **方案 3**：migrate 实现（长期正解，但空壳、工作量大）。
- **方案 4**：代码画占位纯色黄框（先跑通 D17 逻辑）。

但优先验证方案 1——它最轻、不破架构，且 index+palette 烘焙是 reforge 已有的成熟模式（bakeFrame）。

## 5. 不变的接口

无论选哪个方案，`drawSlicedBox(ctx, box, x, y, w, h)` 接口不变——`box.tiles` 从"灰度 ImageBitmap"换成"彩色 canvas"即可。menu-box.ts 其余逻辑（主菜单遍历、状态面板数据驱动）完全不动。
