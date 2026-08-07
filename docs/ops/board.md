# 三贤人系统任务看板

这张看板只记录当前进行中和阻塞任务。候选任务看 `docs/phase2/capability-map.md`（任务卡 `Capability` 字段对应地图格号；议题型卡 D6/D12/D13/D14/D15 落点见地图 §3.1「议题→格映射」），完成记录看 git log 和任务卡。

工作流: [`agent-workflow.md`](agent-workflow.md)
任务卡模板: [`tasks/TASK-template.md`](tasks/TASK-template.md)
轻量模板: [`tasks/TASK-lite-template.md`](tasks/TASK-lite-template.md)

## 进行中

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| W9 | 实体暂离、重现与明雷逃跑冷却 | draft | 设计冻结完成（Codex agree），待 Kimi / GLM 设计压测签字 | 四态状态机 + 320×320 边界 + 0x52 toggle 前态 + BattleResult 四分类；828+193 源账本待 GLM 冻结 |
| B10-1 | 混乱敌人攻击同伴 | draft | 语义空槽 schema 冻结完成（Codex agree），待 Kimi / GLM 设计压测签字 | slots 保序保空（0 占位/65535 不占位）、wMaxEnemyIndex=slots.length-1；380 队源账本待 GLM 冻结 |
| D14-1 | 对话系统外观继承（版式/头像/光标/字体/自动播放） | draft | 首批版式对齐设计冻结（Codex agree），待 Kimi / GLM 设计压测签字 | maxRight=320 原版全宽语义；11102 行中 1074 行误折行归零，仅 6 行超限继续折行 |
| D14-3 | 奖励/事件总线统一收尾（议题 14 剩余③） | draft | 待设计冻结，三方签字 | giveItem 无呈现 + 提示两套 UI（narration vs item-use-result）统一 |
| D15-1 | NPC 移动补全：动态碰撞 + 互相让路 + 转向（议题 15） | draft | 待设计冻结，三方签字 | auto 巡逻已有；缺不穿墙/不互穿/让路滑步/转向动画 |

## 看板规则

- 看板只写当前可行动状态,不维护候选池和完成历史。
- `负责人/下一步` 是用户拍板保留的唯一责任列。
- 细节、证据、讨论、验证结果放任务卡。
- 任务阻塞时,在阻塞区写清楚缺哪个决定或输入。
