# CONTENT-SCENE-REFERENCE-OWN-KEY-1 — 命名落点与入口方案存在性

Status: done
Phase: phase2
Owner: Codex
Coding Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-18
Template: task-card-v1 / 1.0.0
Visual Verification Timing: N/A

## 目标

保存校验应指出未登记的命名落点或入口脚本方案。合法定义的同名目标应被识别。

## 范围

候选范围为内容引用校验的两个查表入口和正式回归。由引用治理批读取真实消费层时发现，内容判定规则的修复准入单独裁定。

## 前提与证据

| 维度 | 当前真值 | 直接证据 |
| --- | --- | --- |
| 原版 / primary source | 当前作者工程的落点和 HookId 来自实际登记的对象键。 | [二阶段脚本合同](../../phase2/specs/script-system.md#真值与约束) |
| 第一阶段 | 不适用。第一阶段不消费当前作者方案或命名落点合同。 | [阶段规则](../../phase2/READ-FIRST.md) |
| 当前第二阶段 | 基点结构校验接受测试工程。旧引用校验对普通缺名报两处 error，对缺少的内置同名值返空。正式回归对两种缺名要求相同错误，实际登记同名应零诊断。 | [两条诊断分支](../../../packages/content/src/validate-refs.ts#L671) |
| 本任务目标 | 内容校验只用工程实际登记的键确认存在。 | 普通缺名与真实同名定义的原件对照。 |

反证条件为结构校验拒绝测试工程、普通缺名同样不报，或场景真实登记了测试要求缺失的目标。三例隔离探针分别排除三项。尚未核普通剧情可达性或运行时执行效果。

修复后，保存前检查会指出缺失的 `hall/constructor` 落点及 `hall/onEnter/constructor` 方案。用户在 2026-11-18 批准只按实际登记内容校验。

### 上下文锚点

- `validateReferences` 从统一指令目标扫描得到场景加局部 ID。观察中两条引用都被识别，漏报发生在随后的存在性查表。
- `packages/editor/src/core/project-diagnostics.ts` 调用该校验。当前最小合法输入先走 `validateAuthorScenes` 和 `validateAuthorSharedScripts`。
- [引用治理原卡](QUALITY-CONTENT-REFERENCES-1.md)和[唯一执行原件](../evidence/QUALITY-CONTENT-REFERENCES-1-execution.tar.gz)。`source-ownership-observation` 是前置探针，`closeout/scene-target-red` 是正式实现修改前的失败原件。

## 验收

[正式专测](../../../packages/content/src/scene-target-validation.test.ts)经作者结构校验使用同一最小工程。普通缺名与 `constructor` 缺名均检查确切诊断位置和文案。真实同名定义检查零诊断。实现修改前指定失败 1 项，对照 2 项通过，失败是缺少预期的两个业务诊断。实现修改后 3/3，并随内容 151 项、编辑器 42 项通过。命令、完整 stdout/stderr 和运行 JSON 见原件。现有 HookSlot 的共享诊断分支适用于 `onEnter` 和 `onTeleport`，本例实际触发 `onEnter`。

测试逐文件核对 A–H。A 覆盖合法缺失及合法同名，B 以测试标题和字面错误说明合同，C 独立于扫描单测，D 共用一份合法工程夹具，E 以标准诊断列表为 oracle 并先红后绿，F 命名指向场景目标存在性，G 合并普通缺失与内置同名缺失的同一预期，H 内容层入口无存储写入和运行时依赖。此卡结论限该分支。后续全文八维与精灵模块迁移记录在引用治理原卡。

## 状态与交接

2026-11-18 Codex 用隔离探针观察真实公开校验，获用户裁决后将失败例写入正式测试，再在两个现有诊断分支用自有键判断。错误文案、位置和场景读取的 owner 延用现行路径。

本卡获准的两条存在性判断随同一治理窗口通过全仓 check、官方 ratchet 和 protected fast。完整执行见引用治理原卡的唯一归档。普通作者工程或运行时的新分歧按相应 Owner 另核。

2026-11-18 Codex build allowed。范围为两条存在性判断与正式失败回归，保持现行引用路径和错误文案。
