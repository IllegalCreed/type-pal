# Codex 覆盖率 +2pp 首批：脚本展示与条件编辑

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision 3dc90ad8f6dde5a7ddcafc6b749b61dd53152751；本轮 R78。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- Codex 覆盖率 +2pp 首批：脚本展示与条件编辑：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

## 当时证据

- 原始命令、输入、caller/oracle、结果、机器字段、SHA、counter、链接和未执行项保留于 quote。

## 当前有效性

historical。历史测试结论必须带日期和 source revision，并由当前 catalog、contract、fresh receipt 重新核定。

## 继任文档

- 当前入口：对应 testing catalog/domain report、contract、paired evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、真实 caller/oracle、排重、独立 review 和静态零诊断。

## 停止线

- 本页不证明 runtime、E2E、视觉、coverage 或当前产品行为；不得以 archive wrapper 替代执行回执。

## 原文保全

固定 source revision `3dc90ad8f6dde5a7ddcafc6b749b61dd53152751`，source SHA `5d5e569034836b9152d4f560518ee9149eaa8c64e493ecf051d481cd1181eb7d`；下方 quote 可逆回原始 UTF-8 字节。
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
