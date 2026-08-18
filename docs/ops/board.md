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
| ED-WORLD-VARIABLES-1 | 世界变量定义表与作者工作台 | review | Kimi + GLM 独立 review 并分别 accept/counter | Codex 自验 accept；Content/Reforge/Editor/Migrate 3113 tests、两项 build、三档布局通过 |
| ED-SHARED-SCRIPT-UI-1 | 可复用脚本工作台与通用脚本控件收敛 | review | Kimi + GLM 独立审查并分别 accept/counter | build/自测/三档视觉验证完成；真实 callScript caller 往返留给 review 补验 |
| ED-STAMP-EDITOR-1 | 组合模板内容编辑闭环 | review | Kimi/GLM 独立 review | Codex accept；editor 948 + content 484 全绿，三档浏览器矩阵与保存/undo/redo 通过 |
| ED-MAP-PALETTE-CONTROLS-1 | 地图组合 Palette 控件统一 | review | Kimi/GLM 独立 review | `5dccf549` 已推送；focused 83 + full 942、三档零横滚、Console 0 |
| OPS-TST-PERF-B | shared/fresh 隔离并行 runner | build | 候选已实现并推过 strict/canary/fast；Codex 重跑完整 serial→parallel→三组 proof | 首轮 control 正确 fail-closed 并修复三项 release 前置回归；默认串行不变，PB2 证据未齐不得 review |
| OPS-TST-PERF-C | P2/P3/P4 consolidated determinism proof | build | 三签齐；Codex 先生成 build-start 全量 coverage map 再做 probe | PC1 已由 N3-1 的 20 tests / 755.07s 闭合；当前 shared 24/138，PC2/PC3 为硬门 |

## 看板规则

- 看板只写当前可行动状态,不维护候选池和完成历史。
- `负责人/下一步` 是用户拍板保留的唯一责任列。
- 细节、证据、讨论、验证结果放任务卡。
- 任务阻塞时,在阻塞区写清楚缺哪个决定或输入。
