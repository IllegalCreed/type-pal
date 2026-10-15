# QUALITY-EDITOR-DIAGNOSTICS-1 — editor 测试异步生命周期诊断清理

Status: draft
Owner: Codex
Reviewer: Codex（后续实现自验证与独立验收分开记录）
Phase: phase2
Capability: editor test lifecycle correctness
Visual Verification Timing: N/A（拟只修测试调度与隔离，不改产品）

## 目标与范围

清除 CODE94 全仓质量门中的真实 React act / jsdom 导航诊断，不静音，不关闭检查开关，
不改变产品异步时序来迁就测试。当前仅登记，尚未 build allowed。

第一候选切片（待完整核前提与独占Owner）：

- `packages/editor/src/__tests__/cursor-asset-r1/world-sprite-harness.tsx`
- `packages/editor/src/__tests__/cursor-asset-r1/kit.ts`
- `packages/editor/src/ui/WorldSpriteLibrary.c01.cursor-r1.test.tsx`

未授权改这三份以外的实现；不触 ED-ENTITY-STATE-PLAN-1、资产管线、schema/save、预览产品行为。
后续每次扩白名单仍按2–4文件/清晰模块切片，不能批量正则套act后宣称逐文件治理。

## 直接证据与未知

`docs/ops/evidence/CODE-QUALITY-94/glm-c5-check.txt` 原件3574条act诊断；按stderr文件头归属52个文件，
不是139个文件（旧报告将段/用例与文件口径混淆）。最高文件WorldSpriteLibrary.c01为604条，
BattleSpriteLibrary.c02-g04为404条、kimi-workflows为398条；具体分布见同目录Codex接手诊断清单。
两条导航诊断归属 `src/main.host-lifecycle-1.test.ts`、`src/ui/design-system/list-header.glm-leaf-wave.test.tsx`。
这些只是定位线索，不等于根因、逐文件accept或删除授权。

已经全文读取两个候选harness/kit；WorldSpriteLibrary.c01长文件读取被输出截断，完整语义复核未完成，
保持pending。候选测试存在act外click/undo与异步资源准备，但尚未以定向执行隔离各来源。
最强替代解释：异步资源完成、effect cleanup或共享宿主任务外泄导致告警，并非单纯给每次click套act即可解决。
需要逐合同确定触发、等待与清理ownership，不能用空act、加sleep/timeout或console过滤伪造零诊断。

## 上下文与验收

先读AGENTS/agent-workflow测试质量合同、phase2 READ-FIRST、现有测试/真实被测组件与资源生命周期。
保持IS_REACT_ACT_ENVIRONMENT检查启用；合法typed数据与真实业务断言保留；不改生产UI。
先保存定向原件，再做最小测试调度修复；断言仍能区分业务错误，计时器/事件/资源均清理。
按文件记录修正前后诊断数与完整执行集合；分片定向后在完整模块窗口集中跑相邻及全部质量门。
所有error/warning/info为0才可称质量门通过；退出0带诊断继续rework。

## 推进与交接

2026-10-15 Codex：登记draft；根因、完整首片读取与build准入pending，没有实现。
不以本卡代替CODE94统一门，不增加closed。无下一位Agent提示词，由Codex后续核前提后继续。
