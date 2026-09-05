# @type-pal/editor — 第二阶段可视化内容编辑器

> 状态：**主力产品面**（2026-09-06 更新）。编辑器已实现各业务模块作者工作台：
> 场景/实体/脚本/物品/商店/敌人/战斗数据/资源/项目设置等，内建设计系统（Design Lab）与
> 引用索引；共享 `@type-pal/reforge` 的渲染与运行时做画布预览和正式试玩。历史“空壳占位”
> 表述见 Git（2026-06-28 建包时）。已知工作流缺陷见 [编辑器审计](../../docs/ops/audits/pre-e2e/editor-workflows.md)。

## 职责

读写 content 数据模型（`@type-pal/content` 的 schema），可视化编辑内容工程：地图笔刷 /
事件与脚本编排 / 数据表 / 资源与引用管理；产出并保存内容工程数据（场景 / 对话 / 数据表
的数据文件，供 reforge 运行时加载）。作者数据通过领域命令接入会话的 undo/redo；表单和专用编辑器
的临时草稿在确认时提交，文件写入还需经过工作区授权与保存边界。

## 依赖边界

- ✅ 依赖 `@type-pal/content`（数据模型 / schema）
- ✅ 复用 `@type-pal/reforge` 渲染做画布预览 / 试打 / 试买 / 试玩
- ❌ **不碰第一阶段包**（`shared` / `game` / `pal-extract`）

## 常用命令

```bash
pnpm --filter @type-pal/editor dev          # 编辑器 dev server（端口 6010）
pnpm --filter @type-pal/editor test         # 全量测试（脚本已固定 maxWorkers=2）
pnpm --filter @type-pal/editor typecheck
pnpm --filter @type-pal/editor audit:design-system   # 设计系统采用门禁
```

见 [decisions D18（包架构）](../../docs/phase2/decisions.md)、[editor 设计](../../docs/phase2/specs/editor-architecture.md)。
