# PAL 内容导入与发布

Status: current
Owner: history_cards_a（文档候选编写）；Codex（治理与独立接收）
Last reviewed: 2026-10-16
Template: guide-runbook-v1 / 1.0.0

## 目的

本指南供作者与维护供应链的 Agent 区分两种工作：日常作者内容在当前工程中编辑、保存；PAL 原始素材由 pal-extract 提取，migrate 只重建明确归原始源维护的分区。作者入口见[编辑器说明](../../../packages/editor/README.md)，重导细节见[迁移包说明](../../../packages/migrate/README.md)。

判断维护权要看具体字段和来源，不能仅因文件位于 `projects/pal` 就把它当成可重新覆盖的生成产物。资源供应缺陷修供应真源；场景、共享脚本、技能和敌 AI 正文则直接审查 canonical 作者编排。完整原版脚本转换和原版动作审计已按用户裁决退役，历史从 Git 查，不恢复成当前工作流。

## 前置条件

- 使用当前 canonical 工程与格式。先区分作者工程、可重建提取目录、PAL baseline 和编辑器当前打开的工程；旧版本、旧路径或历史烘焙方案不作为当前输入。
- 检查作者工程只需工程目录，不需要原版源。独立检查不会保存编辑器中尚未保存的修改，也不恢复迁移事务。
- PAL 重导需要对应原始供应输入与 current baseline。确认本次允许触碰的源分区；缺 baseline 或出现冲突时先停止，不能从历史工程 bootstrap 或恢复退役转换器。
- 计划命令也可能恢复中断事务并写盘；执行计划前同样要按可能写盘的维护操作安排。明确重导前让编辑器停止保存，完成发布后重载已打开的工程。

## 步骤

1. **选择供应输入。** 需要重建 PAL 提取目录时查[pal-extract](../../../packages/pal-extract/README.md)。提取结果可重建，不把对输出的单点修改当成上游修复；日常作者保存不要求先重做提取。
2. **核对当前输入合同。** 先按[当前内容规范](../specs/content-schema.md)与[工作区边界](../specs/project-lifecycle.md)识别工程、资源和维护范围；不要把作者正文划回原版生成分区。
3. **只读检查作者工程。** 在仓库根运行 `pnpm check:content [工程目录]`；省略目录时检查仓库 PAL 工程。坏引用、地图或资源字节会失败。这个入口不写盘、不恢复事务；它不会代替编辑器保存。
4. **保存作者修改。** 使用编辑器现有保存入口。作者脚本合理化在当前工程完成，后续由对应 E2E 批次核时序和演出，不维护新的原版脚本转换规则。
5. **检查 PAL 重导计划。** 在仓库根运行 `pnpm --filter @type-pal/migrate migrate:content`。即使不带 `--write`，migrate 也先恢复中断事务，可能应用 journal 并清理事务文件；它不是绝对只读的计划检查。先核恢复与计划结果，遇冲突不继续发布。
6. **发布明确的源分区。** 确认计划与停止编辑器保存的前提后，运行 `pnpm --filter @type-pal/migrate migrate:content --write`。重导只刷新 catalog、地图/瓦片集、商店、六角色及明确的窄提示源；保留作者场景/共享/技能/敌 AI 正文和自定义角色/精灵。发布后重载已打开的工程，避免继续使用旧内存快照。

## 失败处理

- **检查失败与重导失败分开归因。** `check:content` 失败先核报出的作者引用、地图或资源字节；它没有替用户保存或恢复。migrate 失败则还要核 baseline、源供应、三方计划冲突和 journal 所处阶段，不能根据没有 `--write` 推断磁盘未变。
- **供应缺陷回到上游。** 已确认资源供应缺陷时，按 [READ-FIRST](../READ-FIRST.md)修真实生成源并安全重导、验证白名单及幂等；不把直接改生成 JSON 作为完成。已经转为作者所有的脚本正文不从原版重新覆盖。
- **事务边界不手工绕过。** 当前事务实现检查 manifest 为最后一项，并在发布前核资源闭包；恢复也走同一应用路径。遇到 staging/hash/目标快照或闭包错误，停止并保留实际错误和事务证据，再交对应维护任务核因。本指南不提供删 journal、强行发布或回滚旧版本的捷径。
- **停止线。** 维护权不清、缺 current baseline、恢复/计划存在未解释冲突、编辑器仍在并发保存或需要扩大分区时，停止受影响操作，先核具体来源与任务准入。本次文档治理不授权执行重导或修改产品来迎合指南。

## 完成定义

实际维护完成须能说明：用了哪个作者工程或 PAL 源分区、检查/保存/恢复/发布各自的结果、是否有冲突，以及发布后是否重载；供应修复还须有上游修复、重导白名单与幂等证据。检查通过不等于已保存，计划产出不等于只读，静态文档绿也不等于运行时或演出验收。

早期方案查[历史资产管线](../archive/designs/asset-pipeline.md)，其旧版本与旧路径仅保历史。当前作者/供应分工不因该入口恢复旧转换链。

本轮只整理指南并静态核对必要源码，没有执行上述操作命令、原始数据、产品、旧测试、E2E、视觉或 coverage。新增 Owner/date 只指文档治理，原文无作者或日期字段，不倒填。候选须由非作者核全文、来源和回执；中央记录接入与最终零诊断门由 Codex 另行完成。

### 本次核读来源与完整原文

- 独立检查入口：`packages/editor/scripts/check-project.mts:1–20`；只读文件源 `author-project-source.ts:1–59`，`project-io.ts:187–230`为必要窄读，未认证整个保存/发布管线。
- 重导入口：`packages/migrate/scripts/migrate-content.mts:36–96`，恢复调用在54行；`migration-transaction.ts:193–281`核 manifest 顺序、应用/清理和恢复，未执行事务。
- 完整原文固定 Git：`aa5a62f85d76233b2db37fc570d7bf97ae2b4054`，与设计源 `d5641eef5238d711b8df3c6cda235eecbb7122b0` 同 blob。
- 原 blob：`3e492d3ebe6afcd946ab2af56f18917ce302ca97`；原 SHA256：`e81d14ed387d6ba4f3a08a005093b4eb492139725ecfa77ede37c74c737d6af5`。下方 text 围栏仅作不可交互来源，含末 LF 的全部26行须可严格逆回读；旧命令不在本轮执行。

````text
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
````
