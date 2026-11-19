# MIGRATION-SPRITE-DEFINITION-OBJECT-ORDER-1 — PAL 视觉定义按内容比对

Status: blocked
Phase: phase2
Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-20
Template: task-card-v1 / 1.0.0
Visual Verification Timing: N/A

## 目标

确认布局及动作容器等价判定对合法 JSON 的要求。

## 范围

PAL current 发布将既有作者精灵定义和原盘投影作严格等价比较。`pal-world-sprite-semantic-alias.ts` 将布局和动作序列化后逐字符串比较，作者只交换布局 JSON 对象键顺序就被挡在发布前。此项涉及资产管线接受域，等待用户裁决后才准入产品修改。

## 前提与证据

冻结基点是 `dc745c12704370975645c0992cf477c4bc8d1da3`。正式 Vitest 从实际 PAL 基线与提取源调用 `buildPalCurrentPublication`。对照通过；第二例只把李逍遥的 `layout.kind`、`layout.framesPerDir` 键移位，两版都通过 `validateSprites`，随后正式发布入口在 `assertEquivalentDefinition` 报 `li-xiaoyao: current/generated: 资源、布局或动作容器不严格等价`。一红一绿，未写项目或资源。失败原件和候选测试由本轮质量治理证据归档。

## 验收

如果获准，按现有精灵 schema 做确定的结构比较，对象键顺序不影响等价，资源、布局字段、动作及有序播放步骤仍必须严格一致。保留差异负例和真实发布入口，验证作者动作、数据格式与生成素材所有权。现行 [PAL 发布入口](../../../packages/migrate/src/pal-current-publication.ts) 和 [内容规格](../../phase2/specs/content-schema.md) 为验收边界。

## 状态与交接

发布布局等价反例保留为 review。本卡等待资产管线接受域裁决，再安排产品修复与回归。
