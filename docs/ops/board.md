# 三贤人系统任务看板

这张看板只记录当前进行中和阻塞任务。候选任务看 `docs/phase2/capability-map.md`,完成记录看 git log 和任务卡。

工作流: [`agent-workflow.md`](agent-workflow.md)
任务卡模板: [`tasks/TASK-template.md`](tasks/TASK-template.md)
轻量模板: [`tasks/TASK-lite-template.md`](tasks/TASK-lite-template.md)

## 进行中

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| X3/M3 | 通用 0x73 dither + 开场/opcode 迁移修复 | **done(用户验收通过)** | 归档 | 四版 target-only 异色帧**用户验收 accept**("完美实现了效果")。实现 a9333fdb+bfaaf2ae(Codex);工作区全量白名单分组提交 c059e4b1..f8768cc7(Opus,pnpm check 全绿):content 控制码/对话三修/e2e 调试口/migrate 根治/pal 产物×295/e2e README。任务卡:[X3-opening-dither-speaker-inheritance.md](tasks/X3-opening-dither-speaker-inheritance.md) |

## 阻塞

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| M3 | 迁移脚本去内联、按场景分片与体积门禁 | draft / 设计重签 | Opus 重审分片版 | 用户新增硬约束：进场不得加载全游戏脚本。方案改为 `{chunk,id}` + scene/shared/global-domain SCC 分片 + 按需 resolver/LRU + 存档只存 ref；第一阶段切片实测仅 all.json 0.89x。Codex agree；Opus 旧版 agree 因加载边界变化恢复 pending(R1-R3 保留)，GLM 后续复核。任务卡:[M3-wander-arm-explosion.md](tasks/M3-wander-arm-explosion.md) |

## 看板规则

- 看板只写当前可行动状态,不维护候选池和完成历史。
- `负责人/下一步` 是用户拍板保留的唯一责任列。
- 细节、证据、讨论、验证结果放任务卡。
- 任务阻塞时,在阻塞区写清楚缺哪个决定或输入。
