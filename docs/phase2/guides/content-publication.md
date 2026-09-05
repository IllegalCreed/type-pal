# PAL 内容导入与发布

类型：使用指南。PAL 原始素材先由 pal-extract 提取，再由 migrate 转换成当前内容工程。
产品格式和操作细节以 [迁移包说明](../../../packages/migrate/README.md) 为唯一维护入口。

常用入口：

- 提取原始数据：[pal-extract](../../../packages/pal-extract/README.md)。生成的提取目录可重建。
- 检查发布计划：从仓库根运行 `pnpm --filter @type-pal/migrate migrate:content`。
- 发布当前工程：确认计划后运行 `pnpm --filter @type-pal/migrate migrate:content --write`；
  执行前让编辑器停止保存，发布后重载已打开的工程。
- 校验输入格式：[当前内容规范](../specs/content-schema.md) 与 [工作区边界](../specs/project-lifecycle.md)。

迁移缺陷修生成真源并重生成，遵守 [READ-FIRST](../READ-FIRST.md)；不把对生成 JSON 的单点修改作为完成。
早期资产烘焙方案保留在 [历史资产管线](../archive/designs/asset-pipeline.md)，其中的旧版本与旧路径不作为当前输入。
