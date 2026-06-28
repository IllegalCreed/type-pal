# @type-pal/editor — 第二阶段可视化内容编辑器

> 状态：**空壳占位**（2026-06-28 建）。P2 阶段（引擎吃通 schema 后）正式实现。

## 职责
读写 content 数据模型（`@type-pal/content` 的 schema），可视化编辑内容工程数据：地图笔刷 / 事件演出编排 / 数据表；嵌 `@type-pal/reforge` 做实时预览。产出内容工程数据（场景 / 对话 / 数据表的数据文件，供 reforge 运行时加载）。

## 依赖边界
- ✅ 依赖 `@type-pal/content`（数据模型 / schema）
- ✅ 将来嵌 `@type-pal/reforge` 做预览
- ❌ **不碰第一阶段包**（`shared` / `game` / `pal-extract`）

见 [decisions D18（包架构）](../../docs/phase2/decisions.md)、[roadmap §7](../../docs/phase2/roadmap.md)。
