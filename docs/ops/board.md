# 三贤人系统任务看板

这张看板只记录当前进行中和阻塞任务。候选任务看 `docs/phase2/capability-map.md`（任务卡 `Capability` 字段对应地图格号；议题型卡 D6/D12/D13/D14/D15 落点见地图 §3.1「议题→格映射」），完成记录看 git log 和任务卡。

> **✅ 2026-08-10 额度状态：GLM 与 Kimi 均已恢复**——当前补审队列：D14-2、D14-1、W9。

工作流: [`agent-workflow.md`](agent-workflow.md)
任务卡模板: [`tasks/TASK-template.md`](tasks/TASK-template.md)
轻量模板: [`tasks/TASK-lite-template.md`](tasks/TASK-lite-template.md)

## 进行中

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| W9 | 实体生命周期、重现与明雷逃跑冷却 | review | 三方 implementation accept 已齐；等待 OPS release A/FRESH 闭环与用户验收，Codex 不得标 done | content13 runtime/save/editor 与 PAL W9 发布已冻结；fast/oracle/canary/current replay 绿，release A/FRESH 外部门禁仍 blocked |
| B10-1 | 混乱敌人攻击同伴 | blocked | GLM implementation accept 已齐；等待真实 Kimi implementation accept，Codex 不得代签或标 done | W9 R1 已修复并重录 current13/oracle；B10 本身无侧未决项，review→done 门禁仍缺 Kimi |
| OPS-TST-PERF-RW | release worker 墙钟优化 | build | Codex 实现 A 阶段 profiler；B 并行/C 集中 determinism 另开卡，期间不改 release 证明路由 | profiler 已钉住 shared 主瓶颈（本次 2625s/3.22GiB）；fresh 出现 hook/test 超时路径，待单独返工复现，默认 `test:release` 保持串行 |
| OPS-TST-PERF-FRESH | release fresh hook/test 超时根因 | draft | Codex 先做只读复现；真实 Kimi/GLM 设计签字后再实现 | 区分 beforeAll hook 与 test body；不调大 timeout、不改 skip、不复用预构建 authority |
| OPS-TST-PERF-B | shared/fresh 隔离并行 runner | draft | Codex 起草 runner；真实 Kimi/GLM 设计签字后实现 | manifest→canary→unit/preflight 串行；shared/fresh 并行；RSS、路径隔离及三次串行对照为硬门禁 |
| OPS-TST-PERF-C | P2/P3/P4 consolidated determinism proof | draft | Codex 起草逐标题 coverage map；真实 Kimi/GLM 设计签字后实现 | 保留每阶段独立 live default/reversed 双建；不得用 pinned bundle 或删 source-backed 双建冒充证明 |
| D14-1 | 对话系统外观继承（版式/头像/光标/字体/自动播放） | done | 三方 accept 齐（Kimi/GLM 补审闭环），待用户验收 | maxRight=320 全宽语义；11102 行 0 意外折行仅 6 合法超限；audit 脚本可挂 CI |
| D15-1 | NPC 移动补全：动态碰撞 + 互相让路 + 转向（议题 15） | draft | 待设计冻结，三方签字 | auto 巡逻已有；缺不穿墙/不互穿/让路滑步/转向动画 |

## 看板规则

- 看板只写当前可行动状态,不维护候选池和完成历史。
- `负责人/下一步` 是用户拍板保留的唯一责任列。
- 细节、证据、讨论、验证结果放任务卡。
- 任务阻塞时,在阻塞区写清楚缺哪个决定或输入。
