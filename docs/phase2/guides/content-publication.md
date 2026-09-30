# PAL 内容导入与发布

类型：使用指南。日常作者维护与PAL原始源重导分开：作者内容以当前工程为真源，通过编辑器
保存；PAL原始素材由pal-extract提取，migrate只负责明确原始源分区的重建和安全重导。
作者入口见[编辑器说明](../../../packages/editor/README.md)，重导细节见
[迁移包说明](../../../packages/migrate/README.md)。

常用入口：

- 提取原始数据：[pal-extract](../../../packages/pal-extract/README.md)。生成的提取目录可重建。
- 检查作者工程：从仓库根运行`pnpm check:content [工程目录]`，默认检查仓库PAL工程；
  不需要原版源，不写盘或恢复事务。坏引用、地图或资源字节会失败。
- 保存作者修改：使用编辑器现有保存入口；检查命令不会代为保存。
- 检查PAL重导计划：从仓库根运行`pnpm --filter @type-pal/migrate migrate:content`。
  该命令会先恢复中断事务，即使不带`--write`也不能视为绝对只读检查。
- 重导原始源分区：确认计划后运行`pnpm --filter @type-pal/migrate migrate:content --write`；
  执行前让编辑器停止保存，发布后重载已打开的工程。
- 校验输入格式：[当前内容规范](../specs/content-schema.md) 与 [工作区边界](../specs/project-lifecycle.md)。

重导仅刷新catalog、地图/瓦片集、商店、六角色及明确的窄提示源；保留作者场景/共享/技能/敌AI正文
与自定义角色/精灵。完整原版脚本转换和原版动作审计按用户裁决退役，历史由Git保存。
后续脚本合理化直接审查canonical作者编排，通过E2E核时序和演出，不维护新的原版转换规则。

资源供应缺陷修生成真源并安全重导，遵守 [READ-FIRST](../READ-FIRST.md)；不把对生成 JSON 的
单点修改作为完成。作者脚本本身则在当前工程改进，不从原版重新覆盖。
早期资产烘焙方案保留在 [历史资产管线](../archive/designs/asset-pipeline.md)，其中的旧版本与旧路径不作为当前输入。
