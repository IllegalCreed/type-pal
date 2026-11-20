# MIGRATION-SPRITE-DEFINITION-OBJECT-ORDER-1 — PAL 视觉定义按内容比对

Status: done
Phase: phase2
Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-20
Template: task-card-v1 / 1.0.0
Visual Verification Timing: N/A

## 目标

确认布局及动作容器等价判定对合法 JSON 的要求。

## 范围

PAL current 发布将既有作者精灵定义和原盘投影作严格等价比较。基点的 `pal-world-sprite-semantic-alias.ts` 将布局和动作序列化后逐字符串比较，作者只交换布局 JSON 对象键顺序就被挡在发布前。

## 前提与证据

冻结基点是 `dc745c12704370975645c0992cf477c4bc8d1da3`。正式 Vitest 从实际 PAL 基线与提取源调用 `buildPalCurrentPublication`。对照通过；第二例只把李逍遥的 `layout.kind`、`layout.framesPerDir` 键移位，两版都通过 `validateSprites`，随后正式发布入口在 `assertEquivalentDefinition` 报 `li-xiaoyao: current/generated: 资源、布局或动作容器不严格等价`。一红一绿，未写项目或资源。失败原件和候选测试由本轮质量治理证据归档。

## 验收

按现有精灵 schema 做确定的结构比较，对象键顺序不影响等价，资源、布局字段、动作及有序播放步骤仍必须严格一致。现行 [PAL 发布入口](../../../packages/migrate/src/pal-current-publication.ts) 和 [内容规格](../../phase2/specs/content-schema.md) 为验收边界。

## 状态与交接

用户于 2026-11-20 批准按已有等价含义修复。候选比较 JSON 值结构，数组步骤顺序参与比较。正式 PAL 发布的固定基线与仅调换布局键的候选各自通过，错资源、错布局和动作差异原专测继续通过。原件、候选身份与全仓门状态见[现行窗口](QUALITY-REFORGE-PRESENTATION-1.md#上一窗口的-review)。本卡局部验收完成，集中门与合并取窗口卡的执行回执。
