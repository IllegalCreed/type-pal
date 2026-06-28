# @type-pal/migrate — 第二阶段迁移器

> 状态：**空壳占位**（2026-06-28 建）。③ 阶段（schema 被切片验证稳定后）正式实现。

## 职责
一次性把第一阶段产物（`data/extracted`）转成 content 数据模型的内容数据：
- 原版脚本 / 对话 / 数据表 → content schema 的内容实例
- 原版 indexed 素材 + palette → 烘 RGBA 资产（[D15](../../docs/phase2/decisions.md)）
- 原版全局下标 → 稳定 id

## 依赖边界
- ✅ 依赖 `@type-pal/content`（目标 schema）
- ✅ 依赖 `@type-pal/shared`（读原版解码）—— **唯一**合法碰第一阶段的第二阶段包（两阶段桥）
- ❌ 不依赖 `reforge` / `editor`

见 [content-schema §8](../../docs/phase2/foundation/content-schema.md)、[decisions D18 / D15](../../docs/phase2/decisions.md)。
