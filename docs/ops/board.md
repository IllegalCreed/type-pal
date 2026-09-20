# 三贤人系统任务看板

这张看板只记录当前进行中和阻塞任务。候选任务看 `docs/phase2/capability-map.md`（任务卡 `Capability` 字段对应地图格号；议题型卡 D6/D12/D13/D14/D15 落点见地图 §3.1「议题→格映射」），完成记录看 git log 和任务卡。

额度按接手时实际状态确认；历史额度快照不作为当前准入依据。

GLM后续补测候选见[十批长队列](../testing/glm-coverage-work-queue.md)（78模块、617文件全量路由台账）。这里只链接候选池，不把已规划项列成build；现有卡与E2E排期不变。

工作流: [`agent-workflow.md`](agent-workflow.md)
任务卡模板: [`tasks/TASK-template.md`](templates/TASK-template.md)
轻量模板: [`tasks/TASK-lite-template.md`](templates/TASK-lite-template.md)

前两轮[九批返工复核](../testing/glm-nine-rework-review.md)保留历史证据；最新结论以下方当前接收为准。Mimosa不参与；TB00/TB01另排。

八批（TB02/TB04～TB10）候选256116ee已三席accept齐，2026-09-20用户授权后由Codex[核定done归档](../testing/glm-nine-final-review.md)。当时只核签字与既有证据、不重跑测试；TB03随后单独收口，见下。

2026-09-20 TB03候选4894719e三席accept齐，用户授权后由Codex[核定done归档](../testing/import-codec-acceptance.md)。本次无测试/基线改动；PNG编码失败close缺陷仍保留在[Codex隔离修复队列](../testing/glm-coverage-queue-design-review.md)，不随补测关闭。

## 进行中

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| EDITOR-SKILL-TRIAL-1 | [共享战斗模拟器首批](tasks/EDITOR-SKILL-TRIAL-1-isolated-battle.md) | build | Codex按r2+r2a已批准范围继续 | r2a三席齐已核准入；我方1～3/敌方五槽；入口UI待用户确认项不因本次人数签字开放 |
| TEST-RUNTIME-STATE-BOUNDARIES-1 | [运行时状态与元数据六组补测](tasks/TEST-RUNTIME-STATE-BOUNDARIES-1-state-and-metadata.md) | rework | GLM仅返工D6 sequence收尾 | 6d34ad5a的F1/E4及原7针闭环；第8针迟到提交MISSED；55/双包/tc/Biome/22跑绿，未集成，不重签 |
| TEST-CONTENT-RESIDUAL-1 | [内容合同残项补测](tasks/TEST-CONTENT-RESIDUAL-1-registered-gaps.md) | rework | GLM返工CR-R1～R4 | 0e49db91实际23项/原15跑；三见证MISSED、判据误收、Biome1error/回执不符；r2不重签，本轮未释放实施槽 |

2026-09-19 [运行时基础功能补测](../testing/reforge-runtime-contracts-review.md)候选62a18137三席accept齐、无返工，用户确认签字；Codex核零漂移后done归档。60项新增、check7538/严格fast7049通过；后续BGM initP政策与完整E2E仍按原归属推进。

2026-09-19 Codex完成[E-01资源测试输入合同](../testing/phase1-resource-test-inputs.md)：20项无PAL依赖输入回归及真实资源对拍通过，check7478/严格fast6989绿；不改GLM目标面或游戏运行逻辑，不新增三签卡。用户已选D-05独立临时试玩，下一项联合D-04设计，裁决见[审计台账](audits/pre-e2e/editor-workflows.md#d-05--临时试放不改存档的告知与保存行为不一致)。

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
[编辑器覆盖率确定性修复](audits/pre-e2e/coverage-determinism.md)亦已三签收口；D-01整卡实现时fast为6,493项，最新数量见[覆盖率记录](../testing/coverage.md)，覆盖率未下调；废弃源码和旧模型测试退役/迁移已单列记录，计数不代表完整E2E已通过。
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
