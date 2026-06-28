# migrate 资产管线 — UI box 首切片（design + plan）

> 状态：设计 + 计划（2026-06-28）。方向已定（作者选 A：正式启动 migrate、UI box 作首个资产迁移切片）。
> 依据：[roadmap](../roadmap.md) P0 迁移器、[D15](../decisions.md)（资产 RGBA 化）、[D18](../decisions.md)（migrate 包职责 + 阶段隔离）。

## 1. 背景

D17 菜单的 UI 黄框暴露了架构问题：reforge 直接 fetch 第一阶段的 indexed PNG（`/extracted/images/ui/frame-XX.png`，R = palette index），想自己运行时烤色——违背 de-palette 方针 + 阶段隔离。

正道（roadmap P0）：**migrate 把 indexed + palette 资产烤成 RGBA 内容工程，reforge 只吃 RGBA**。头像已先行（`scripts/bake-portraits.mts` 散装脚本）。本切片把这条管线正式收编进 migrate 包，UI box 作首个迁移资源。

## 2. 范围

- ✅ **资产迁移**（indexed + palette → RGBA）：核心 bake 函数 + 头像收编 + UI box `frame-00..08`。
- ❌ **数据迁移**（脚本 / 对话 / 数据表 → content schema 实例）：③ 阶段、schema 稳定后（roadmap），本切片不碰。
- ❌ 世界 sprite / tiles 烤色：reforge 现仍运行时 `bakeFrame`，本切片不动（后续同管线扩 RleFrame 版）。

> 资产迁移与数据 schema **正交** → 现在做不违 roadmap「schema 稳定后」的约束（那针对数据迁移）。

## 3. 地基决策（后续 sprite / tiles 复用同管线）

| # | 决策 | 理由 |
|---|---|---|
| D-a | **palette 0 = 资产标准 palette** | UI index 在 pal0 = 标准棕黄框；pal1/2 = 乱色（场景 palette，烤图验证为证）。`bake-portraits` 也用 pal0，一致。第二阶段 clean rewrite 不逐场景还原 UI 色。 |
| D-b | **pngjs 读写 PNG**（node 侧） | bake-portraits 既有路线，已是依赖。 |
| D-c | **核心 = 纯转换函数** `bakeIndexedRgba(src, palette)` | index → 真彩逐像素，无 PNG IO → 可单测。PNG 编解码留在 CLI 层。 |
| D-d | **输出 `reforge/public/`**（权宜） | 同 portraits；内容工程独立目录等**数据迁移**切片时正经建（那时「内容工程」概念才真正落地）。bake 脚本里路径集中常量，迁目录时只改一处。 |
| D-e | **reforge 零运行时烤 UI box** | 对齐头像（预烘 RGBA、`drawImage` 直接用）；撤掉 GLM 的 fetch-indexed + 运行时烤设想。 |
| D-f | **收编 `scripts/bake-portraits.mts`** 进 migrate 包 | 散装脚本归位；头像 + UI 共用核心 bake 函数。 |

## 4. 包结构 + 核心接口

```
packages/migrate/
  src/
    index.ts                  # 导出 bakeIndexedRgba
    bake-indexed-rgba.ts      # 核心纯函数
    bake-indexed-rgba.test.ts
  scripts/bake-assets.mts     # CLI:头像 + UI box(pngjs IO + 调核心 + 写 public)
  package.json                # + pngjs 依赖, script "bake"
```

```ts
/** indexed RGBA(R=G=B=palette index, A=opaque mask)→ 真彩 RGBA。无 PNG IO,纯转换,可测。 */
export function bakeIndexedRgba(
  src: Uint8Array,   // 源 RGBA, length = w*h*4
  palette: readonly (readonly [number, number, number])[],
): Uint8Array        // 真彩 RGBA, length = w*h*4(透明像素 A=0)
```

## 5. TDD Plan

- **Task 1 · 核心 `bakeIndexedRgba` + 单测**：纯函数（opaque 像素 R=index → `palette[index]`，A=0 透明保留）。测：构造 src（含不透明 index + 透明像素）+ 小 palette → 验输出 RGBA。
- **Task 2 · CLI `bake-assets.mts` + 收编**：pngjs 读源 → `bakeIndexedRgba` → pngjs 写 RGBA 到 `reforge/public/`。跑头像（chunk 1/2，收编 bake-portraits）+ UI box（`frame-00..08` → `public/ui/box/`）。删 `scripts/bake-portraits.mts`。package.json 加 pngjs + `"bake"` script。跑一次产出资产。
- **Task 3 · reforge `menu-box` 改吃 RGBA**：`loadMenuAssets` 的黄框从 `/extracted/images/ui/frame-XX.png` 改 `/ui/box/frame-XX.png`（预烘 RGBA），`drawImage` 直接用、零烤色。
- **Task 4 · 修 `drawSlicedBox` 3 bug**：
  1. **平铺**：中心 + 四边用 `createPattern` 重复填充（原版 RLEBlit 平铺），不 `drawImage` 拉伸。
  2. **阴影形状**：先把九宫格画到离屏 canvas，再以它为 alpha 源、`+6px` 偏移画半透明黑（框的镂空形状），替掉实心 `fillRect`。
  3. **不规则尺寸**：右列锚右（`x = boxRight - frame.width`）、底行锚下，各块用**自身 width/height**，不用统一 cornerW/H（frame TR=33 / R=23 / BR=31 ≠ 左列 22）。
- **Task 5 · 浏览器验收**：Esc 开菜单 → 黄框棕黄正确、四边/中心纹理不变形、阴影是框形状不是方块、右列不错位、×4 高清。截图自查。

## 6. 后续

- 世界 sprite / tiles RGBA 化（RleFrame 版 bake，撤 reforge 运行时 `bakeFrame`）。
- 内容工程独立目录（数据迁移切片时落地，D-d 路径迁移）。
- migrate 数据迁移（脚本 / 对话 / 数据表 → content schema，③ 阶段）。
