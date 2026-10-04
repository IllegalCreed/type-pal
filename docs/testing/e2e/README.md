# E2E 专项总览

这里是两阶段 E2E 的唯一导航入口。先按阶段找报告，再按[多维索引](../indexes/README.md)按状态、引擎、Owner 或主题反查。

## 阶段报告

| 阶段 | 状态 | 报告 | 依赖 |
|---|---|---|---|
| 001 开场 | verified | [阶段页](stages/001-opening/README.md) · [正式报告](stages/001-opening/report.md) | 新游戏 |
| 002 客栈住客与赏银 | verified | [阶段页](stages/002-inn-guests-and-reward/README.md) · [正式报告](stages/002-inn-guests-and-reward/report.md) | E2E-001 |
| 003 下楼/厨房 | verified | [阶段页](stages/003-kitchen/README.md) · [正式报告](stages/003-kitchen/report.md) | E2E-002 |
| 004 端菜/赠酒 | verified | [阶段页](stages/004-meal/README.md) · [正式报告](stages/004-meal/report.md) | E2E-003 |
| 005 买虾/报信 | verified | [阶段页](stages/005-shrimp/README.md) · [正式报告](stages/005-shrimp/report.md) | E2E-004 |
| 006 求药/出海 | rework | [阶段页](stages/006-doctor-boat/README.md) · [正式报告](stages/006-doctor-boat/report.md) | E2E-005 |

`verified` 只表示该阶段当前报告满足它自己的 verify 合同，不表示完整主线或 capture-ready。
`rework` 阶段不能作为下游正式前驱；阶段页中的 `dependsOn` 和报告中的候选 SHA/检查点链是唯一判据。

## 共用合同与横向材料

- [两阶段 E2E 与录像合同](contract.md)
- [路线方案](route-proposal.md)
- [001–005 共性问题族](cross-stage/common-issues.md)
- [横向材料索引](cross-stage/README.md)
- [检查点目录](../../../projects/pal/e2e-checkpoints/README.md)
- [E2E 任务卡看板](../../ops/board.md)

## Agent 快速检索

机器优先读 [`../catalog.json`](../catalog.json)，不要从文件名推断状态。每个条目包含稳定 `id`、
`status`、`phase`、`engines`、`canonical`、`dependsOn`、`tags`、`owner`、`lastVerified` 和 `reviewBy`。
修改阶段报告必须同时更新 catalog、阶段 README 和对应证据；CI 会拒绝缺字段、过期或索引漂移。
