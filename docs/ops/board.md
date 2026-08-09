# 三贤人系统任务看板

这张看板只记录当前进行中和阻塞任务。候选任务看 `docs/phase2/capability-map.md`（任务卡 `Capability` 字段对应地图格号；议题型卡 D6/D12/D13/D14/D15 落点见地图 §3.1「议题→格映射」），完成记录看 git log 和任务卡。

> **✅ 2026-08-07 额度状态：GLM 与 Kimi 均已恢复**——补审队列：D14-2（GLM 覆盖矩阵
> 实现期复审 + 补签）、D14-1（双审设计复核 + build 复核 + Kimi 视觉抽验）、W9/B10-1
> （双审设计压测签字）、D14-3（GLM 覆盖矩阵 + Kimi 视觉/UX 抽审）。

工作流: [`agent-workflow.md`](agent-workflow.md)
任务卡模板: [`tasks/TASK-template.md`](tasks/TASK-template.md)
轻量模板: [`tasks/TASK-lite-template.md`](tasks/TASK-lite-template.md)

## 进行中

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| W9 | 实体暂离、重现与明雷逃跑冷却 | draft | 历史三方 design agree；等 B10 v12 先完成后重锁 content/save epoch，再由 Codex build | 四态状态机 + 320×320 边界 + 0x52 toggle 前态 + BattleResult 四分类；828+193 源账本待复审 |
| B10-1 | 混乱敌人攻击同伴 | draft | v12 设计增补：Codex agree，Kimi / GLM pending；签字前不得改实现 | v11 immutable → v12 append-only；固定 5 槽、动态 wMaxEnemyIndex、380 队 + 20 队召唤交叉账本 |
| D14-1 | 对话系统外观继承（版式/头像/光标/字体/自动播放） | done | 三方 accept 齐（Kimi/GLM 补审闭环），待用户验收 | maxRight=320 全宽语义；11102 行 0 意外折行仅 6 合法超限；audit 脚本可挂 CI |
| D15-1 | NPC 移动补全：动态碰撞 + 互相让路 + 转向（议题 15） | draft | 待设计冻结，三方签字 | auto 巡逻已有；缺不穿墙/不互穿/让路滑步/转向动画 |

## 看板规则

- 看板只写当前可行动状态,不维护候选池和完成历史。
- `负责人/下一步` 是用户拍板保留的唯一责任列。
- 细节、证据、讨论、验证结果放任务卡。
- 任务阻塞时,在阻塞区写清楚缺哪个决定或输入。
