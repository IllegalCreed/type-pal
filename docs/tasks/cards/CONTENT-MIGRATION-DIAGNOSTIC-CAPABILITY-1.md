# CONTENT-MIGRATION-DIAGNOSTIC-CAPABILITY-1 — 迁移诊断能力应为字符串

Status: done
Phase: phase2
Owner: Codex
Coding Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-19
Template: task-card-v1 / 1.0.0
Visual Verification Timing: N/A

## 目标

使诊断 sidecar 的能力字段按已声明的字符串枚举验证，避免将数组纳入 Editor 和发布检查的诊断表。

## 范围

`packages/content/src/migration-diagnostic.ts` 的 `validateMigrationDiagnostics`，真实加载与发布调用 `packages/reforge/src/project-loader.ts`、`packages/migrate/src/pal-current-publication.ts`，Editor 的诊断展示 `ItemTab` 与保存前关联检查 `project-io.ts`。不改变 sidecar 格式、迁移来源产物或存档。初次仅取证，产品未获本卡 build 准入。

## 前提与证据

从符合现行 `MigrationDiagnosticsV1` 结构的合成正控只改变能力字段：字符串 `"use"` 改成 JSON 数组 `["use"]`，再由实际 guard 校验。字符串正控通过；数组未经类型检查即通过并原样保留。发现在 `String(target.capability)` 判断层，可用同一单字段反例推翻。实际 PAL 项目当前侧车表为空，未证明正常项目会出现此非法字段，亦未改项目文件。

## 验收

[资产窗口单一证据包](../evidence/QUALITY-CONTENT-ASSET-CONTRACTS-1.tar.gz) 的 `content-migration-capability-synthetic-review/` 含实际值、首次失败与命令；另有 `content-migration-capability-review/` 记录 PAL 表为空的第一次尝试。获准后先补正式单红；字符串正控、原格式及相邻加载检查继续通过。

## 状态与交接

本轮 Codex build allowed。按现行 `MigrationDiagnosticsV1` 字符串联合收口。先验证合法字符串与单字段 JSON 数组的反例，再在守卫拒绝处保留原错误。真实加载、发布和编辑器相邻验证。作者格式、生产输入和出版数据沿用现行合同。

2026-11-19，已确认只在输入校验边界有分歧，产品与生成物未改。曾关闭的实现转 review，待资产管线边界裁定再进 build。

### 本轮验收

能力字段使用字符串的原值做枚举比较。同一条合法诊断把字符串改成数组时，按原诊断路径拒绝。相邻内容、公开加载及真实 PAL 发布继续通过。当前侧车格式、发布资源和存档由现有规范持有。 逐文件复核、反例及实际命令见[本轮统一原件](../evidence/QUALITY-CONTENT-ASSET-REVIEW-CLOSEOUT.tar.gz)。发布结果取受保护 PR 的实际作业。
