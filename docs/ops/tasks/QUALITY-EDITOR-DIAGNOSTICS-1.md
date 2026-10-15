# QUALITY-EDITOR-DIAGNOSTICS-1 — editor 测试异步生命周期诊断清理

Status: build
Owner: Codex
Reviewer: Codex（后续实现自验证与独立验收分开记录）
Phase: phase2
Capability: editor test lifecycle correctness
Visual Verification Timing: N/A（拟只修测试调度与隔离，不改产品）

## 2026-10-15 首片准入（当前）

用户明确授权上述三文件继续，单一Coding Owner=Codex，premise verified / design agree，build allowed。
main=f98d0ddd8、隔离治理HEAD=e4656ae00、0behind；基线C01 70/70且604条未包act，环境/导航为0。
只改测试宿主、测试驱动与oracle，不改生产/资产/接口/规则；全仓未零诊断不得合main。

| 真值方向 | 直接证据与本片目标 |
|---|---|
| Primary | React官方act文档：渲染、交互与异步取数需作为更新单元等待；https://react.dev/reference/react/act 。 |
| 第一阶段 | N/A；本片只修二阶段React测试调度，无一阶段菜单或机制改变。 |
| 第二阶段 | SpriteResourceViewer.tsx:230-281真实Promise.all解码/色表完成→setSnapshot/onLoaded/onFramesLoaded；WorldSpriteLibrary.tsx:270-281用proof启用编辑；EditSession.ts:207-221/865-875同步通知订阅。 |
| 目标 | 宿主保留真实reader/cache/解码，等待实际资源promise；待就绪测试用可控IO证明pending→ready；点击只执行一次，undo/redo在操作act内；不静音。 |

已全文读取三白名单、WorldSpriteLibrary.tsx1457行、SpriteResourceViewer.tsx581行、editor-asset-reader.ts、
sprite-assets.ts、sprite-fixtures.ts；已读真实cache/色表与session订阅/undo调用段，未把这些caller段落冒称全文件治理闭合。
最强替代解释是其它交互/effect外泄占主因；先仅改挂载资源等待实测差分，再分别核点击/undo和剩余异步。
若等待真实解码不减少挂载告警，撤回该根因解释；不靠增加sleep/timeout/空act掩盖。

## 目标与范围

清除 CODE94 全仓质量门中的真实 React act / jsdom 导航诊断，不静音，不关闭检查开关，
不改变产品异步时序来迁就测试。当前按上方首片准入推进，统一门未清零前不合main。

本次独占白名单（Coding Owner=Codex）：

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

候选两个harness/kit及1201行WorldSpriteLibrary.c01现已分段全文读取；三份SHA与读取边界见
CODE94/codex-final-window.json。生产caller/资源生命周期、相邻oracle与排重尚未核完，仍pending。
selectAssetRow在vi.waitFor重试回调中点击，数处session.undo/redo位于act外，异步资源准备也需追踪；
这些为直接代码线索，尚未以定向执行隔离各诊断来源，不据此批量修改。
另登记oracle候选：G04-08标题要求stem与后缀但regex为OR；G05-10只断言就绪后enabled，未证等待期disabled；
G07-07标题要求计数下界，实际仅匹配任意数字。先核真实合同与相邻测试，不自动删除或修改产品。
最强替代解释：异步资源完成、effect cleanup或共享宿主任务外泄导致告警，并非单纯给每次click套act即可解决。
需要逐合同确定触发、等待与清理ownership，不能用空act、加sleep/timeout或console过滤伪造零诊断。

## 2026-10-15 当前完整窗口证据

最新check有3620条未包act、577条act环境未配置、2条导航；ratchet为3610/577/2，
protected为3523/577/2。此前3574仅为旧GLM原件的一种模式计数，不是全部诊断总数。
源码稳定、完整输出可见，三门数值通过但零诊断不通过，见
[最终窗口](../evidence/CODE-QUALITY-94/codex-final-window.md)。52文件头分组只是未包act定位口径；
导航输出无稳定stderr文件头且异步并行会交错，上述旧邻近文件名不能当根因或Owner定责证据。
未修改生产或测试实现，未关闭任何文件；本卡仍draft，无build allowed。

## 上下文与验收

先读AGENTS/agent-workflow测试质量合同、phase2 READ-FIRST、现有测试/真实被测组件与资源生命周期。
保持IS_REACT_ACT_ENVIRONMENT检查启用；合法typed数据与真实业务断言保留；不改生产UI。
先保存定向原件，再做最小测试调度修复；断言仍能区分业务错误，计时器/事件/资源均清理。
按文件记录修正前后诊断数与完整执行集合；分片定向后在完整模块窗口集中跑相邻及全部质量门。
所有error/warning/info为0才可称质量门通过；退出0带诊断继续rework。

## 推进与交接

2026-10-15 Codex：登记draft；首片全文读取完成；根因、caller/lifecycle/oracle与build准入pending，没有实现。
不以本卡代替CODE94统一门，不增加closed。无下一位Agent提示词，由Codex后续核前提后继续。

## 生命周期检查点

仅真实挂载解码等待使604→200；再修单次点击/历史act后70/70、三类诊断0，editor typecheck通过。
原件/当前源码SHA/读取边界见[首片证据](../evidence/QUALITY-EDITOR-DIAGNOSTICS-1/README.md)。
这只是作者自验的第一提交；接着单独补强3个oracle并执行相邻与完整门，保持build，0文件关闭。
