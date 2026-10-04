# Codex 覆盖率 +2pp 首批：脚本展示与条件编辑

[持续任务](../../../../../ops/archive/tasks/done/TEST-COVERAGE-PLUS5-1-continuous-batches.md)；
基点 `76c6f5be`，本批仅贡献当前编辑器的脚本展示/条件弹窗/敌人事件展示。
Cursor 十二模块与 GLM 十六模块候选均未集成进此统计。

## 已核结果

| 目标源码 | 旧 fast 已覆盖分支 | 本批已覆盖分支 | 增量 |
|---|---:|---:|---:|
| `packages/editor/src/ui/ScriptTree.tsx` | 135/370 | 224/370 | +89 |
| `packages/editor/src/ui/ScriptEditor.tsx` | 631/1,138 | 711/1,144 | +80（产品修复增6分母） |
| `packages/editor/src/ui/enemy-defeated-events.ts` | 218/304 | 241/304 | +23 |

全仓官方 fast：46,201/63,315 → **46,393/63,321，72.9701% → 73.2664%**，
即 +0.2963 个百分点。同分母政策未缩范围；增量全部来自四个新增测试文件，
`ScriptEditor.tsx` 另有独立的队伍成员条件控件修复。其它六包 baseline 业务来源未变。

新回归覆盖约40项：真实作者脚本列表及命令/条件摘要、真实工程弹窗中条件切换与提交、
敌人击败事件条件显示及引用风险、队伍成员条件从红到绿的选择器回归。
测试输入前后深比较，必须由现有有效场景、当前作者命令及现行 project fixture 提供。
旧测试曾覆盖的基本命令表单不复制；缺失角色选择的失败证据保留
`/tmp/codex-plus2-inparty-red.log`。

校准记录：首遍新数值条件测试因复合选择器测试助手找错按钮而红；修正后最终72/72定向/相邻绿。
原完整检查失败日志 `/tmp/codex-plus2-first-batch-check.log` 保留，修正后的
`/tmp/codex-plus2-first-batch-check-final.log` 首次全绿：**9,833项，typecheck零诊断，
lint 2,276文件0 error/0 warning/0 info**。官方
`/tmp/codex-plus2-first-batch-ratchet.log` 与保护基点的单次
`/tmp/codex-plus2-first-batch-strict.log` 均 exit0；严格 fast 9,341项/728生产文件。

本批只完成 +0.2963pp；要从原 72.9701% 达到 +2pp，按当前分母还需 1,079 个已覆盖分支臂。
后续另选当前有消费者且未被 Cursor/GLM 领取的大缺口；不重复跑本批相同命令或缩减测试范围。
