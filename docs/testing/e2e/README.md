# E2E 专项总览

Status: current
Owner: Codex（E2E 导航维护）
Last reviewed: 2026-10-18
Template: governance-index-v1 / 1.0.0

## 目的

帮助人和 Agent 从稳定阶段 ID 找到两阶段 E2E 的阶段页、正式报告与共同合同，再沿报告读取前驱、检查点和执行证据。按状态、引擎、Owner 或主题反查时，进入[多维索引](../indexes/README.md)。

## 范围

本页导航覆盖 001–006、共用验收与编辑器预览起点、路线 proposal、横向问题和 PAL 检查点目录。阶段正文、执行工具和原始回执分别在各自入口维护；本页不汇总全部剧情的完成度。

## 当前状态

`current` 表示本导航入口有效。阶段的发布状态、`lastVerified`、`reviewBy` 和 `dependsOn` 以 [catalog.json](../catalog.json) 为唯一索引事实源；[按阶段视图](../indexes/by-stage.md)由 catalog 生成，本页不再手工维护另一张状态表。

`verified` 只在对应报告声明的候选、版本、输入和 verify 合同内有效，不能当作今天已重跑、已完成编辑器预览核对或已达 `capture-ready`。`rework` 不能作为下游正式前驱；执行前仍须回读报告的候选 SHA、版本与真实检查点链。源码核读或 `source-backed` 证据不等于实跑，`draft` 和路线 `proposal` 也不授予 build 准入。

## 入口与责任

### 阶段页与正式报告

| 稳定 ID / 阶段 | 阶段页 | 正式报告 |
|---|---|---|
| e2e-001 · 开场 | [阶段页](stages/001-opening/README.md) | [正式报告](stages/001-opening/report.md) |
| e2e-002 · 客栈住客与赏银 | [阶段页](stages/002-inn-guests-and-reward/README.md) | [正式报告](stages/002-inn-guests-and-reward/report.md) |
| e2e-003 · 下楼、道士与厨房交代 | [阶段页](stages/003-kitchen/README.md) | [正式报告](stages/003-kitchen/report.md) |
| e2e-004 · 端菜、赠酒与道士离场 | [阶段页](stages/004-meal/README.md) | [正式报告](stages/004-meal/report.md) |
| e2e-005 · 买虾、报信与返程 | [阶段页](stages/005-shrimp/README.md) | [正式报告](stages/005-shrimp/report.md) |
| e2e-006 · 求药、出海与仙灵岛入口 | [阶段页](stages/006-doctor-boat/README.md) | [正式报告](stages/006-doctor-boat/report.md) |

### 共用合同与工作入口

- [两阶段 E2E 与录像合同](contract.md)：共同验收、检查点链与录像准入；演出差异按其中的[意图优先标准](contract.md#演出验收标准意图优先差异不等于缺陷用户2026-10-07)归因。
- [每段必查：编辑器预览初始状态](contract.md#每段核对编辑器预览初始状态用户2026-10-12)：按脚本入口前的真实现场检查相关 NPC，保存方案/步骤关联并复验；历史游戏 runner 的 passed 不代替此项回执。
- [路线方案](route-proposal.md)：读取候选路线；实施范围和准入仍须核当前任务卡。
- [001–005 共性问题族](cross-stage/common-issues.md)与[横向材料索引](cross-stage/README.md)：查跨阶段问题、来源与未闭合项。
- [检查点目录](../../../projects/pal/e2e-checkpoints/README.md)：查剧情边界、各轨检查点与历次版本记录；旧档或旧报告不能改号后充当前前驱。
- [当前任务看板](../../ops/board.md)与[任务索引](../../ops/tasks/index.md)：确认活动分工，再读原卡顶部状态、范围、counter 和准入。路线与检查点接 [E2E-R4-1](../../ops/tasks/E2E-R4-1-route-and-checkpoint-foundation.md)，005 接 [E2E-005-1](../../ops/tasks/E2E-005-1-shrimp-errand-and-xianglan-news.md)，006 接 [E2E-006-1](../../ops/tasks/E2E-006-1-inn-doctor-and-boat-to-island.md)，预览能力接[实体状态方案任务](../../ops/tasks/ED-ENTITY-STATE-PLAN-1.md)。

Codex 维护本页导航。Agent 先按 catalog 的稳定 `id` 找 `index`，再读 `canonical` 和 `evidence`；不能从路径或标题猜状态。报告作者维护合法输入、caller、oracle、候选/版本及执行边界，Codex 按[测试治理](../governance.md)核配对与独立验收。任务状态取原卡，执行结果取原回执，导航日期不为下游续期。

## 证据与下一步

本次核对了固定原文、现行入口、catalog 中合同/路线/共性问题及六个阶段的导航字段、完整 by-stage 投影，以及共同合同的演出、预览和收口边界；没有全文重审六篇报告，也没有运行产品、E2E、视觉或 coverage。

接手某段时先核当前任务准入，再按 catalog 找阶段页、报告和配对 evidence，核当前候选/版本、合格前驱与真实检查点，按共同合同补齐两阶段证据和逐入口预览回执。缺来源、版本不合、旧 counter 未闭合或存在视觉反例时停止该项，回原卡记录 rework/blocked；不能用本页或历史 verified 补证。报告、证据或发布状态变化时，按测试治理同提交写回并重生成索引。

## 历史与原文保全

下方是固定 revision `dc478db11c6b52c4e50a1d1135f8a4740796418c` 的 33 行原文快照，source SHA `310f5031be8e76964cbd1cf2d4e704c5bbfbd2cf4f6451d64a7109d93e67ca6f`。整个 quote 块字节保持不变；剥离每行引用前缀后，须剔除结束标记前既有分隔空行产生的恰一个 LF，再按固定 source SHA 验证原始 UTF-8 字节。这不是无条件 trim，也不表示直接 inverse 与源字节相等。旧表状态只属于该时点，旧看板链接用于追溯，今天的任务准入从上方当前看板和原卡读取。
<!-- original-source-quote:start -->
> # E2E 专项总览
>
> 这里是两阶段 E2E 的唯一导航入口。先按阶段找报告，再按[多维索引](../indexes/README.md)按状态、引擎、Owner 或主题反查。
>
> ## 阶段报告
>
> | 阶段 | 状态 | 报告 | 依赖 |
> |---|---|---|---|
> | 001 开场 | verified | [阶段页](stages/001-opening/README.md) · [正式报告](stages/001-opening/report.md) | 新游戏 |
> | 002 客栈住客与赏银 | verified | [阶段页](stages/002-inn-guests-and-reward/README.md) · [正式报告](stages/002-inn-guests-and-reward/report.md) | E2E-001 |
> | 003 下楼/厨房 | verified | [阶段页](stages/003-kitchen/README.md) · [正式报告](stages/003-kitchen/report.md) | E2E-002 |
> | 004 端菜/赠酒 | verified | [阶段页](stages/004-meal/README.md) · [正式报告](stages/004-meal/report.md) | E2E-003 |
> | 005 买虾/报信 | verified | [阶段页](stages/005-shrimp/README.md) · [正式报告](stages/005-shrimp/report.md) | E2E-004 |
> | 006 求药/出海 | rework | [阶段页](stages/006-doctor-boat/README.md) · [正式报告](stages/006-doctor-boat/report.md) | E2E-005 |
>
> `verified` 只表示该阶段当前报告满足它自己的 verify 合同，不表示完整主线或 capture-ready。
> `rework` 阶段不能作为下游正式前驱；阶段页中的 `dependsOn` 和报告中的候选 SHA/检查点链是唯一判据。
>
> ## 共用合同与横向材料
>
> - [两阶段 E2E 与录像合同](contract.md)
> - [每段必查：编辑器预览初始状态](contract.md#每段核对编辑器预览初始状态用户2026-10-12)
> - [路线方案](route-proposal.md)
> - [001–005 共性问题族](cross-stage/common-issues.md)
> - [横向材料索引](cross-stage/README.md)
> - [检查点目录](../../../projects/pal/e2e-checkpoints/README.md)
> - [E2E 任务卡看板](../../ops/archive/board-history/board-20261004.md)
>
> ## Agent 快速检索
>
> 机器优先读 [`../catalog.json`](../catalog.json)，不要从文件名推断状态。每个条目包含稳定 `id`、
> `status`、`phase`、`engines`、`canonical`、`dependsOn`、`tags`、`owner`、`lastVerified` 和 `reviewBy`。
> 修改阶段报告必须同时更新 catalog、阶段 README 和对应证据；CI 会拒绝缺字段、过期或索引漂移。
>
<!-- original-source-quote:end -->
