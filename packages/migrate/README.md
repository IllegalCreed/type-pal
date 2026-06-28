# @type-pal/migrate — 第二阶段迁移器

> 状态:资产迁移已起(2026-06-28,UI box 首切片);数据迁移 ③ 阶段。
> 完整设计:[asset-pipeline.md](../../docs/phase2/migrate/asset-pipeline.md)、[decisions D18/D15](../../docs/phase2/decisions.md)。

把第一阶段产物(`data/extracted`)→ 第二阶段内容工程的**总迁移器**。两大类职责:

## A. 资产迁移(indexed/原格式 → RGBA/可直接用)

和数据 schema **正交**,现在就能做。核心 = `bakeIndexedRgba(src, palette)`(index → 真彩)。

| 资产 | 状态 | 备注 |
|---|---|---|
| 头像 portraits | ✅ | chunk 1/2(鬼话);可扩 88 |
| 菜单 UI box | ✅ | 黄框 frame-00..08 |
| 地块 tiles | ⬜ | 同 `bakeIndexedRgba`,换源 |
| 精灵 sprites(角色/NPC/敌人/法术) | ⬜ | 同上 |
| 其他 UI(卷轴/光标/战斗) | ⬜ | 同上 |
| 字体 font | ⬜ | 略特殊(点阵 1-bit mask,非 palette 烤色) |

- palette 标准 = **palette 0**([asset-pipeline D-a](../../docs/phase2/migrate/asset-pipeline.md):UI/头像在 pal0 正确,pal1/2 乱色)。
- 产物 → `packages/reforge/public/`(权宜;内容工程独立目录待数据迁移落地)。
- 跑:`pnpm bake`(根)或 `pnpm --filter @type-pal/migrate run bake`。

## B. 数据迁移(原版数据结构 → content schema 实例)

依赖 content schema 稳定 → **③ 阶段**(schema 切片验证后)。

- 脚本/事件 bytecode → 事件演出 schema
- 对话 → DialogueLine schema
- 数据表(角色/道具/法术/敌人)→ schema 实例
- 全局下标 → 稳定 id;tilemap → 场景包

## 边界(免得变垃圾桶)

1. 只做**转换**,是**离线一次性工具**(构建期跑)、**不在运行时** —— reforge 只消费产物、绝不调 migrate。
2. 运行时逻辑 → reforge;数据模型 → content;编辑器 → editor。migrate 只是"extracted → 内容工程"管线。
3. 迁移本质一次性:内容工程初始化后独立演进,migrate 是"启动器"不是核心运行时,长期不膨胀成主体。

## 依赖边界

- ✅ `@type-pal/content`(目标 schema)
- ✅ `@type-pal/shared`(读原版解码)—— **唯一**合法碰第一阶段的第二阶段包(两阶段桥)
- ❌ 不依赖 `reforge` / `editor`
