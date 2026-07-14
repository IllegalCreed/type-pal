# 三贤人系统任务看板

这张看板只记录当前进行中和阻塞任务。候选任务看 `docs/phase2/capability-map.md`,完成记录看 git log 和任务卡。

工作流: [`agent-workflow.md`](agent-workflow.md)
任务卡模板: [`tasks/TASK-template.md`](tasks/TASK-template.md)
轻量模板: [`tasks/TASK-lite-template.md`](tasks/TASK-lite-template.md)

## 进行中

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| N6 | 共享脚本/子程序创作闭环 | review | User 最终验收/收口 | Codex、Opus、GLM 三方 review 均 accept；任务卡仍待用户结论后转 done |
| ED-1 | 编辑器一级模块与创作闭环审查 | review | Opus 文档收口复验 | 设计三签齐；Codex 已同步 capability/roadmap、拆三张子卡并签 accept，待 Opus/GLM review |
| W7E-0 | 空白工程新场景地图引用止血 | review | Opus 实现复验 | Codex 已完成完整 SceneMap 传递、144 tests 与全仓门禁；待补浏览器原生 prompt 动作验证 |
| ED-2 | 编辑器八个一级模块与稳定深链 | draft | Codex（W7E-0 收口后 build） | 八模块、唯一权威页、typed URL 深链与三档布局；设计三签齐 |
| W7E | 独立地图库与场景地图绑定 | draft | Codex（ED-2 收口后 build） | MapIndexV1 + ownMapId + v1 显式升级；设计三签齐，M1/M2 已落卡 |

## 阻塞

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|

## 看板规则

- 看板只写当前可行动状态,不维护候选池和完成历史。
- `负责人/下一步` 是用户拍板保留的唯一责任列。
- 细节、证据、讨论、验证结果放任务卡。
- 任务阻塞时,在阻塞区写清楚缺哪个决定或输入。
