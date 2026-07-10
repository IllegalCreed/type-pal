# 三贤人系统任务看板

这张看板只记录当前进行中和阻塞任务。候选任务看 `docs/phase2/capability-map.md`,完成记录看 git log 和任务卡。

工作流: [`agent-workflow.md`](agent-workflow.md)
任务卡模板: [`tasks/TASK-template.md`](tasks/TASK-template.md)
轻量模板: [`tasks/TASK-lite-template.md`](tasks/TASK-lite-template.md)

## 进行中

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| [`W7C-3`](tasks/W7C-3-dual-layer-collision-brush.md) | 地图绘制:双层 + 碰撞笔刷 | review | User / 最终验收收口 | 三方均 accept,done allowed;仅作为旧 Tilemap 兼容切片。 |
| [`W7D`](tasks/W7D-nlayer-map-schema.md) | 自有地图 N 层新格式(schema 返工) | review | GLM done 审查签字(提示词在卡尾) | Codex 实现 cd1ab67a + Opus 主审 accept;仅剩 GLM 签字后用户验收。 |

## 阻塞

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| - | - | - | - | 当前无阻塞任务。 |

## 看板规则

- 看板只写当前可行动状态,不维护候选池和完成历史。
- `负责人/下一步` 是用户拍板保留的唯一责任列。
- 细节、证据、讨论、验证结果放任务卡。
- 任务阻塞时,在阻塞区写清楚缺哪个决定或输入。
