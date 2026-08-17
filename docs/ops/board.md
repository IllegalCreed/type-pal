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
| ED-AUDIT-2 | 编辑器全页面视觉、闭环与代码质量审计 | done | 三方 accept + 用户验收齐，整卡收口 | GA1/GA2 闭环（门禁 18/17/17/6）；census 脚本可复现、boundary 23/23 |
| ED-BATTLE-UI-1 | 战斗数据工作台族与共享对象 Hero | done | 三方 accept + 用户验收齐，整卡收口 | N1-N6/BK1-BK3 + RK1 全闭环；editor 124 files / 912 tests + typecheck、1280×720 实机通过 |
| ED-ENEMY-1 | 敌人、敌队预制与结算/偷取编辑闭环 | done | 三方 accept + 用户验收齐，整卡收口 | content15 稳定 enemyTeamId、敌队七环、奖励/偷取单权威；380/828/174/0 与四包全测通过 |
| ED-SCENE-UX-1 | 场景画布直接操作与取消选择 | done | 三方 accept + 用户验收齐，整卡收口 | SK1+G1-G3 逐钉通过；focused 10 + 全量 930 独立复跑全绿 |
| ED-INSPECTOR-TABS-1 | 属性面板共享 Tab 全局统一 | done | 三方 accept 齐，整卡收口 | 24 页审计无漏项；GT1-GT5+IK1、共享计数徽标、浏览器矩阵与 885 项全测通过 |
| ED-REFERENCE-UI-1 | 属性面板引用呈现全局统一 | done | 三方 accept + 用户确认齐，整卡收口 | 16 面统一；RK1-RK2/GN1-GN4 逐钉通过；当前 editor 892/892 全绿 |
| ED-DIAGNOSTIC-UI-1 | 属性面板问题与诊断呈现统一 | done | 三方 accept + 用户验收齐，整卡收口 | DK1 数值门禁单一 frame、DK2 六面内联无新 Tab、cf-err 正向保护；focused 82 + 全量 927 独立复跑全绿 |
| ED-CATALOG-CONTROLS-1 | 编辑器全局目录筛选区统一 | done | 三方 accept + 用户验收齐，整卡收口 | GC1-GC5/CK1-CK2/RK-A 全闭环；editor 912 复跑全绿；palette debt 见 ED-MAP-PALETTE-CONTROLS-1 |
| ED-SHARED-SCRIPT-UI-1 | 可复用脚本工作台与通用脚本控件收敛 | draft | 三签齐（GS1-GS3+KSS1-KSS2）；Codex 转 build | GLM 复算 census 逐字吻合 + 7 宿主矩阵；script-library-catalog 级联删除与 state 字段保留红线 |
| ED-MAP-PALETTE-CONTROLS-1 | 地图组合 Palette 控件统一 | draft | 待排期；开卡后三签再实现 | MapStampPalette 的 raw search/select 迁入共享控件；不得混入带 DsListHeader 的目录 recipe |
| OPS-TST-PERF-B | shared/fresh 隔离并行 runner | draft | Codex 起草 runner；真实 Kimi/GLM 设计签字后实现 | manifest→canary→unit/preflight 串行；shared/fresh 并行；RSS、路径隔离及三次串行对照为硬门禁 |
| OPS-TST-PERF-C | P2/P3/P4 consolidated determinism proof | draft | Codex 起草逐标题 coverage map；真实 Kimi/GLM 设计签字后实现 | 保留每阶段独立 live default/reversed 双建；不得用 pinned bundle 或删 source-backed 双建冒充证明 |

## 看板规则

- 看板只写当前可行动状态,不维护候选池和完成历史。
- `负责人/下一步` 是用户拍板保留的唯一责任列。
- 细节、证据、讨论、验证结果放任务卡。
- 任务阻塞时,在阻塞区写清楚缺哪个决定或输入。
