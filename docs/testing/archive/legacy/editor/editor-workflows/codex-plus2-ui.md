# Codex 覆盖率 +2pp 首批：脚本展示与条件编辑

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是覆盖率 +2pp 持续任务首批（脚本展示/条件弹窗/敌人事件展示，基点 `76c6f5be`）的 Codex 交付回执：全仓官方 fast 46,201/63,315 → 46,393/63,321（72.9701% → 73.2664%，+0.2963pp）。Cursor 十二模块与 GLM 十六模块候选均未集成进此统计。

## Scope

- 基点 76c6f5be；对象=当前编辑器 ScriptTree/ScriptEditor/enemy-defeated-events 覆盖增量；持续任务卡 TEST-COVERAGE-PLUS5-1。

## Execution and assertions

| step | legal input | caller | machine assertion | business oracle |
|---|---|---|---|---|
| 三源增量 | 四个新增测试文件 | 官方 fast | ScriptTree 135/370→224/370(+89)、ScriptEditor 631/1,138→711/1,144(+80，产品修复增 6 分母)、enemy-defeated-events 218/304→241/304(+23) | 增量全部来自新测试+一处队伍成员条件控件修复 |
| 新回归约 40 项 | 现有有效场景/当前作者命令/现行 project fixture | 定向/相邻 | 72/72 绿（首遍因复合选择器助手找错按钮而红，修正后全绿） | 测试输入前后深比较；真实作者脚本列表/条件切换/敌人击败事件条件/选择器红→绿 |
| 统一门 | 完整 check+ratchet+保护基点单次 strict | pnpm | 9,833 项 typecheck 零诊断、lint 2,276 文件 0/0/0、strict fast 9,341 项/728 生产文件均 exit0 | 同分母政策未缩范围；其它六包 baseline 未变 |

## Results

- 本批只完成 +0.2963pp；从 72.9701% 到 +2pp 按当前分母还需 1,079 个已覆盖分支臂。
- 缺失角色选择的失败证据 `/tmp/codex-plus2-inparty-red.log` 与首遍失败/最终全绿/官方 ratchet/strict 日志（/tmp，历史时点未随归档保全=unknown）。

## Evidence

- 证据路径：本回执正文（quote 保全）；持续任务卡链接在原文。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| 首批交付 | 原文时点 | 四个新增测试文件+一处控件修复 | +0.2963pp，三门 exit0 | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy editor/editor-workflows 的覆盖率 +2pp 首批 Codex 回执；固定来源与 source SHA 见下方保全节。

## 原始结论

首批 +0.2963pp（46,393/63,321=73.2664%）；后续另选当前有消费者且未被领取的大缺口，不重复跑本批相同命令或缩减测试范围。

## 当时证据

三源覆盖数字、校准记录（首遍红→修正绿）与门数字在 quote 保全；/tmp 日志按原文时点。

## 当前有效性

historical。覆盖率与门结果按当时基点；当前覆盖以官方 ratchet/fast 实测为准。

## 继任文档

当前覆盖结论归官方覆盖账与持续任务卡。

## 原文保全

固定源 revision `3dc90ad8f6dde5a7ddcafc6b749b61dd53152751`，source SHA `5d5e569034836b9152d4f560518ee9149eaa8c64e493ecf051d481cd1181eb7d`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # Codex 覆盖率 +2pp 首批：脚本展示与条件编辑
>
> [持续任务](../../../../../ops/archive/tasks/done/TEST-COVERAGE-PLUS5-1-continuous-batches.md)；
> 基点 `76c6f5be`，本批仅贡献当前编辑器的脚本展示/条件弹窗/敌人事件展示。
> Cursor 十二模块与 GLM 十六模块候选均未集成进此统计。
>
> ## 已核结果
>
> | 目标源码 | 旧 fast 已覆盖分支 | 本批已覆盖分支 | 增量 |
> |---|---:|---:|---:|
> | `packages/editor/src/ui/ScriptTree.tsx` | 135/370 | 224/370 | +89 |
> | `packages/editor/src/ui/ScriptEditor.tsx` | 631/1,138 | 711/1,144 | +80（产品修复增6分母） |
> | `packages/editor/src/ui/enemy-defeated-events.ts` | 218/304 | 241/304 | +23 |
>
> 全仓官方 fast：46,201/63,315 → **46,393/63,321，72.9701% → 73.2664%**，
> 即 +0.2963 个百分点。同分母政策未缩范围；增量全部来自四个新增测试文件，
> `ScriptEditor.tsx` 另有独立的队伍成员条件控件修复。其它六包 baseline 业务来源未变。
>
> 新回归覆盖约40项：真实作者脚本列表及命令/条件摘要、真实工程弹窗中条件切换与提交、
> 敌人击败事件条件显示及引用风险、队伍成员条件从红到绿的选择器回归。
> 测试输入前后深比较，必须由现有有效场景、当前作者命令及现行 project fixture 提供。
> 旧测试曾覆盖的基本命令表单不复制；缺失角色选择的失败证据保留
> `/tmp/codex-plus2-inparty-red.log`。
>
> 校准记录：首遍新数值条件测试因复合选择器测试助手找错按钮而红；修正后最终72/72定向/相邻绿。
> 原完整检查失败日志 `/tmp/codex-plus2-first-batch-check.log` 保留，修正后的
> `/tmp/codex-plus2-first-batch-check-final.log` 首次全绿：**9,833项，typecheck零诊断，
> lint 2,276文件0 error/0 warning/0 info**。官方
> `/tmp/codex-plus2-first-batch-ratchet.log` 与保护基点的单次
> `/tmp/codex-plus2-first-batch-strict.log` 均 exit0；严格 fast 9,341项/728生产文件。
>
> 本批只完成 +0.2963pp；要从原 72.9701% 达到 +2pp，按当前分母还需 1,079 个已覆盖分支臂。
> 后续另选当前有消费者且未被 Cursor/GLM 领取的大缺口；不重复跑本批相同命令或缩减测试范围。
>
<!-- original-source-quote:end -->
