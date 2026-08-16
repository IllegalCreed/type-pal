# 三贤人系统任务看板

这张看板只记录当前进行中和阻塞任务。候选任务看 `docs/phase2/capability-map.md`（任务卡 `Capability` 字段对应地图格号；议题型卡 D6/D12/D13/D14/D15 落点见地图 §3.1「议题→格映射」），完成记录看 git log 和任务卡。

> **2026-08-15 额度状态：Kimi、GLM 均可用。** ED-DS-2 恢复完整三贤人流程：Kimi 主审架构/视觉，
> GLM 主审覆盖/测试；两席对最新版重签后才可 build，不再走额度豁免。

工作流: [`agent-workflow.md`](agent-workflow.md)
任务卡模板: [`tasks/TASK-template.md`](tasks/TASK-template.md)
轻量模板: [`tasks/TASK-lite-template.md`](tasks/TASK-lite-template.md)

## 进行中

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| ED-DS-2 | 编辑器设计系统代码基础与 Design Lab | done | 三方 accept + 用户验收齐，整卡收口 | 四入口同源、WK2 与 sash 边界复审通过；全量 118/872 独立复跑全绿 |
| ED-AUDIT-2 | 编辑器全页面视觉、闭环与代码质量审计 | draft | 首轮巡检完成；连续迁移批次已冻结，补全矩阵并交 Kimi/GLM 抽审 | 8 模块/24 二级页主动审查，不再等待用户逐页指出 |
| ED-BATTLE-UI-1 | 战斗数据工作台族与共享对象 Hero | review | Kimi/GLM done 前复审 + 用户实机验收 | 五页共享工作台、引用阻断与七环已实现；Codex 自验 accept |
| ED-ENEMY-1 | 敌人、敌队预制与结算/偷取编辑闭环 | draft | Codex 已完成前提核对；交 Kimi/GLM build 前独立签字 | 敌人拥有奖励/偷取，敌队只编组，场景只引用预制敌队 |
| ED-SCENE-UX-1 | 场景画布直接操作与取消选择 | draft | Codex 已核实现状；交 Kimi/GLM build 前独立签字 | 删除“选择/移动”伪模式；补空白/Esc 取消与临时放置态 |
| ED-INSPECTOR-TABS-1 | 属性面板共享 Tab 全局统一 | done | 三方 accept 齐，整卡收口 | 24 页审计无漏项；GT1-GT5+IK1、共享计数徽标、浏览器矩阵与 885 项全测通过 |
| ED-CATALOG-CONTROLS-1 | 编辑器全局目录筛选区统一 | draft | Codex 已完成 24 页 inventory；交 Kimi/GLM build 前独立签字 | 新建唯一 DsCatalogControls，迁 17 个 canonical 目录；签字前不得改实现 |
| OPS-TST-PERF-B | shared/fresh 隔离并行 runner | draft | Codex 起草 runner；真实 Kimi/GLM 设计签字后实现 | manifest→canary→unit/preflight 串行；shared/fresh 并行；RSS、路径隔离及三次串行对照为硬门禁 |
| OPS-TST-PERF-C | P2/P3/P4 consolidated determinism proof | draft | Codex 起草逐标题 coverage map；真实 Kimi/GLM 设计签字后实现 | 保留每阶段独立 live default/reversed 双建；不得用 pinned bundle 或删 source-backed 双建冒充证明 |

## 看板规则

- 看板只写当前可行动状态,不维护候选池和完成历史。
- `负责人/下一步` 是用户拍板保留的唯一责任列。
- 细节、证据、讨论、验证结果放任务卡。
- 任务阻塞时,在阻塞区写清楚缺哪个决定或输入。
