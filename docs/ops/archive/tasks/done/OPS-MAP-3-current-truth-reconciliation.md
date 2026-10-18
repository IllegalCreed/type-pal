# OPS-MAP-3 - 能力地图、议题池与看板当前真值对账

Status: done
Phase: phase2
Capability: Ops / documentation truth（不改产品能力状态的实现，只校准已完成事实）
Owner: Codex
Risk: 小型纯文档对账
Last reviewed: 2026-10-18
Governance Owner: Codex（历史卡文档治理；不代签原执行）
Template: task-card-v1 / 1.0.0

本卡是能力地图/议题池/看板三处文档真值对账的历史记录：按各任务卡首行 Status 与 Git 收口记录校准已完成事实，不碰任何实现；下述对账结果为原卡时点陈述，本次文档治理未重跑。

## 目标

消除 capability-map、design-backlog 与历史看板快照中相对任务卡事实的陈旧状态说明，恢复看板“只显示进行中和阻塞任务”的自身合同。

## 范围

- 范围内：仅修改 docs/phase2/capability-map.md、docs/phase2/design-backlog.md、docs/ops/archive/board-history/board-20261004.md 并新增本卡作回执；直接证据为 D6-1、D12-1、D13-1、D14-2、D14-3、D15-1、W9、B2-1、E18-1、ARCH-CURRENT-ONLY-1、ARCH-ACTOR-CONDITION-SEED-1、W4-1 各卡首行 Status 与 Git 收口记录。
- 范围外：任何代码、schema、runtime、editor、迁移器或项目内容；重写历史任务卡事实。

## 前提与证据

用户 2026-09-03 批准开始并明确“对账你自己做就行了，用不到三签；小的需求无需三签”——单人豁免仅限本次已有证据的文档状态校准，不授权后续 B5 实现免签。对账结果：修正 X4/A7、B2、W4、W5、B10、X7 及议题 4/5/6/12/13/14/15/18b/18e 陈旧说明；看板删除全部历史 done/cancelled 行；真实半完成能力只剩 W6（时间/天气，等内容需求）、E6（authority 调试可视化，低优先）、B5（战斗表现，旧审计需重算）；真实未实现 A1、A6（A6 明确非 MVP）；下一候选 B5 gap census 未形成任务承诺。
- 当前状态：done（历史终态）

## 验收

原卡记录：陈旧短语定向检索归零（D14-2/3、D12-1、D6-1、D13-1 draft，W4-1 build，W9/E18 review/draft，X4/A7 等待 ARCH-CURRENT-ONLY-1）；capability map 剩余 ⚠️/❌ 精确为 W6、E6、B5、A1、A6；Markdown 相对链接存在性检查与 git diff --check 通过。以上均为原卡时点结果，本页未复跑。本页迁移验收：source/after SHA、quote 逆回读、模板与历史 overlay 章节、链接通过。

## 状态与交接

原卡按用户小需求免三签裁决由 Codex 单人收口，无下一位 Agent 提示词。S14 本页治理只改写泛化封套；对账后的能力事实由后续 capability-map 演化与现行看板承接。

## 历史范围

2026-09-03 用户批准与单人裁决；对账对象为当时三文档。2026-10-17 R42 泛化封套，2026-10-18 S14 逐篇改写。

## 原始结论

`Status: done`：三文档与任务卡/ Git 记录对账一致；B5 census 是候选承诺而非任务。原卡全文在下方 quote 保全。

## 当时证据

十二张任务卡首行 Status 与 Git 收口记录；定向检索与链接检查结果为原卡陈述。本页治理未新增任何执行。

## 当前有效性

historical。W6/E6/B5/A1/A6 的能力状态是 2026-09 时点结论；当前能力事实以现行 capability-map、看板与任务卡为准，后续任务完成不回写本卡。

## 继任文档

现行能力入口为[能力地图](../../../../phase2/capability-map.md)与[看板](../../../board.md)；后续对账按现行工作流开新卡。

## 原文保全

固定源 revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b`，source SHA `70965ef8e1fd749481b402a5b833a2f75b5eafc57c3706bca4265fcbeb98587c`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # OPS-MAP-3 - 能力地图、议题池与看板当前真值对账
>
> Status: done
> Phase: phase2
> Capability: Ops / documentation truth（不改产品能力状态的实现，只校准已完成事实）
> Owner: Codex
> Risk: 小型纯文档对账
>
> ## 用户裁决
>
> - 2026-09-03 用户批准开始，并明确：“对账你自己做就行了，用不到三签；小的需求无需三签。”
> - 本卡据此由 Codex 单人完成，不请求 Kimi / GLM 签字；该豁免只适用于本次已有证据的文档状态校准，
>   不授权后续 B5 实现免签。
>
> ## 范围与证据
>
> - 只修改：`docs/phase2/capability-map.md`、`docs/phase2/design-backlog.md`、`docs/ops/archive/board-history/board-20261004.md`，
>   并新增本卡作为本次对账回执。
> - 直接证据：对应任务卡首行 `Status` 与 Git 收口记录，包括 D6-1、D12-1、D13-1、D14-2、D14-3、
>   D15-1、W9、B2-1、E18-1、ARCH-CURRENT-ONLY-1、ARCH-ACTOR-CONDITION-SEED-1、W4-1。
> - 不修改任何代码、schema、runtime、editor、迁移器或项目内容；不重写历史任务卡事实。
>
> ## 对账结果
>
> - 修正 X4/A7、B2、W4、W5、B10、X7 及议题 4/5/6/12/13/14/15/18b/18e 的陈旧说明。
> - 议题映射同步为：D6-1、D12-1、D14-2/3、D15-1、W9、E18 均按已完成任务卡记账；D13-1
>   首批 done，时间旅行仍为独立按需增强。
> - 看板删除全部历史 `done/cancelled` 行，恢复“只显示进行中和阻塞任务”的自身合同；当前为空。
> - 当前真实半完成能力只剩：W6（时间/天气，等待内容需求）、E6（authority 调试可视化，低优先）、
>   B5（战斗表现，旧审计需重算）。真实未实现为 A1、A6，其中 A6 明确非 MVP。
> - 下一候选是 B5 gap census，但尚未形成任务承诺；必须先剔除后续任务已关闭的旧缺口，再开有界实现卡。
>
> ## 验证
>
> - 陈旧短语定向检索归零：D14-2/3、D12-1、D6-1、D13-1 draft，W4-1 build，W9/E18 review/draft，
>   X4/A7 等待 ARCH-CURRENT-ONLY-1。
> - capability map 剩余 `⚠️/❌` 精确为 W6、E6、B5、A1、A6。
> - Markdown 相对链接存在性检查通过；`git diff --check` 通过。
>
> ## 下一位 Agent 提示词
>
> 无下一位 Agent 提示词；本卡按用户明确的小需求免三签裁决由 Codex 单人收口。
<!-- original-source-quote:end -->
