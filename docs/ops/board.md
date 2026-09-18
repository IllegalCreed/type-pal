# 三贤人系统任务看板

这张看板只记录当前进行中和阻塞任务。候选任务看 `docs/phase2/capability-map.md`（任务卡 `Capability` 字段对应地图格号；议题型卡 D6/D12/D13/D14/D15 落点见地图 §3.1「议题→格映射」），完成记录看 git log 和任务卡。

额度按接手时实际状态确认；历史额度快照不作为当前准入依据。

工作流: [`agent-workflow.md`](agent-workflow.md)
任务卡模板: [`tasks/TASK-template.md`](templates/TASK-template.md)
轻量模板: [`tasks/TASK-lite-template.md`](templates/TASK-lite-template.md)

## 进行中

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| TEST-REFORGE-RUNTIME-CONTRACTS-1 | [运行时基础功能五组补测](tasks/TEST-REFORGE-RUNTIME-CONTRACTS-1-runtime-boundaries.md) | rework | GLM收窄返工完成 / Codex复核 | D1实际输入保真已钉（input见证detected）、原四见证保持、60项/1190、check:docs绿；看板回退已撤回；候选codex/glm-reforge-runtime-contracts-r1 |

2026-09-19 Codex完成[E-03/E-04预览缓存常规修复](../testing/editor-preview-cache.md)：仅两个组件私有缓存，15项回归/7负控/原生绘制及check7457/严格fast6969通过；同Owner连续迭代不开新签字卡，不涉及资源格式或公共加载器。

场景引用保护候选83598cc4已三席accept，用户要求本人继续，2026-09-19由Codex[核定done归档](../testing/scene-reference-guard.md)；22新回归、check7442/strict fast6954及功能验证通过，其它审计缺陷不借此关闭。
内容合同补测候选adbabb84已三席accept、用户确认签字，2026-09-18由Codex[核定done归档](../testing/content-contracts-review.md)；新增118项，check7420/strict fast6932通过，43族剩余覆盖及其它审计修复保持原归属。
D-01已完成；B-06/B-07[保存子链修复](../testing/save-barrier-lineage.md)已三席accept、用户要求收口，2026-09-17已done归档。
精灵上传选图修复候选a88ab18d已三席accept、用户验收通过，2026-09-18由Codex[收口归档](../testing/sprite-selection.md)；check7302/strict fast6814通过，G-I04与R4后续边界保持。
编辑器逻辑补测候选5ca9dad2已三席accept、用户授权收口，2026-09-18由Codex[核定done归档](../testing/editor-logic-coverage-review.md)；47项新增、check7282与strict fast6794通过，后续缺口按台账另推。
四包基础测试候选48d3b8e3也已三席accept、用户确认，2026-09-17由Codex[收口归档](../testing/glm-foundation-coverage-review.md)；139项新增、check7218与strict fast6730通过。
世界异步提交候选e13216e7已三席accept、用户确认，2026-09-17由Codex核定done归档；WA-E1～3仍待R4集中执行，不互相借用签字。
检查点导出候选27e605ef也已三席accept、无返工，2026-09-18由Codex核零漂移并done归档；[接口回执](../testing/checkpoint-export.md)的跨页/视觉闭环仍归R4。

准备工作：[六组72检查点工作包（二）](../testing/glm-pre-e2e-boundary-batch-2.md)已由Codex接手完成取证返工与集成（GLM额度耗尽）；[最终回执](../testing/glm-pre-e2e-boundary-batch-2-report.md)记录34覆盖/23复现/15待证及13项隔离鉴别力验证。
这是卡前非视觉诊断准备，不是23个独立bug或已完成修复；该历史取证产品冻结70e3f627。B-05/08/09后续[实现与验证](../testing/world-async-commit.md)已三席accept收口，不代表其余诊断条目已修。

## 阻塞

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|

商店生命周期已完成，全仓五批首轮审计亦已取证收口；不代表问题已修复或E2E验收。
全仓文档纠错与结构整理均已收口，日常检查与 CI 已接入。[E-06 质量门禁](audits/pre-e2e/quality-gate-remediation.md)
已修复，完整 `pnpm check` 通过；[B-04 存档预检修复](audits/pre-e2e/save-preflight-remediation.md)已三签收口。
[编辑器覆盖率确定性修复](audits/pre-e2e/coverage-determinism.md)亦已三签收口；D-01整卡实现后当前fast为6,493项，覆盖率未下调；废弃源码和旧模型测试退役/迁移已单列记录，计数不代表完整E2E已通过。
A-01 存档隔离已三席 accept、用户免复验通过并收口；证据入口见下方总收口。
A-02 作者保存冲突保护亦已三席及用户验收通过并收口；A-03 [保存中断恢复](../testing/editor-save-recovery-closeout.md)候选cd3de679已三席accept，用户免手动复审通过，已归档。已测大克隆成本与完整E2E待办仍保留；A-07[离开保护](../testing/editor-leave-guard.md)三席终审通过，用户授权继续，已收口；D-01全局撤销顺序候选70e3f627已三席accept，用户明确验收通过，已done归档。
接下来按总收口处理其余审计缺陷并补回归/覆盖率，
然后进入 R4 content20 薄基线 → N6b content21 → 完整 E2E。
修复分组见[总收口](audits/pre-e2e/summary.md)；U-02 待证，第一阶段缺陷与可后置优化分别保留。
GLM的[44项并行只读工作包](../testing/glm-pre-e2e-prep.md)收尾11fb8148已由Codex复核accept并接收（见[接收结论与转正节奏](../testing/glm-pre-e2e-prep-report.md)）：19复现/14覆盖/11待证，非缺陷修复数。先随D-01实施转正式回归，其余随对应卡；D-01设计不重签，本次未改产品/正式测试/覆盖率。

## 看板规则

- 看板只写当前可行动状态,不维护候选池和完成历史。
- `负责人/下一步` 是用户拍板保留的唯一责任列。
- 细节、证据、讨论、验证结果放任务卡。
- 任务阻塞时,在阻塞区写清楚缺哪个决定或输入。
