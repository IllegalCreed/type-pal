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
| M3 | 迁移脚本去内联、按场景分片与体积门禁 | draft / 设计签字 | GLM 复核 | 分片版(ScriptRef{chunk,id}+scene/shared/global SCC 分片+执行/绑定边分离+lease-LRU+存档只存 ref):**Codex+Opus agree(重签),待 GLM**。Opus 核实 D18 0.89x+6b58f9e8 回退三动因逐条对症;R1-R3 保留+N1-N3 新增(0x08 恢复点边/ref 重推导/lease 全栈)。三签未齐不得 build。任务卡:[M3-wander-arm-explosion.md](tasks/M3-wander-arm-explosion.md) |

## 看板规则

- 看板只写当前可行动状态,不维护候选池和完成历史。
- `负责人/下一步` 是用户拍板保留的唯一责任列。
- 细节、证据、讨论、验证结果放任务卡。
- 任务阻塞时,在阻塞区写清楚缺哪个决定或输入。
