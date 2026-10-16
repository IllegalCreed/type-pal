# OPS-MAP-3 - 能力地图、议题池与看板当前真值对账

Status: done
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: task-card-v1 / 1.0.0

本页把已关闭 ops 任务卡接入 `task-card-v1`，并追加 `archive-record-v1` 历史边界。原始状态、日期、证据、counter、链接和未决项在 quote 中保全；历史 done 不自动授权当前 build、runtime、E2E、视觉或 coverage。

## 目标
- 保留原任务的目标、完成边界、历史结论和用户可见适用范围。

## 范围
- 当前包含：原卡声明的实现/测试/证据范围及其历史限制。
- 明确不包含：本次迁移不修改产品源码、旧测试、真实数据或历史结论。

## 前提与证据
- primary source：固定 source revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b` 与原卡全文。
- 合法输入、caller、证据和 counter：按原文 quote 解释；本次不重跑原执行。
- 事实权：当前 task card、代码、consumer 和新 receipt；历史卡不单独证明当前行为。

## 验收
- 原卡历史验收、失败、blocked、rework 和未执行边界保持原样。
- 本次迁移验收：source/after SHA、quote inverse、模板章节、链接和历史 overlay 通过。
- runtime/E2E/视觉/coverage：本次均未执行，信用为 0。

## 状态与交接
- `status`: done（历史快照）；当前工作不得从 quote 中自动获得 build 授权。
- Owner/provenance：原卡保留于 quote；当前文档治理 owner 为 Codex。
- 下一步：若需重新启用，创建当前 task card，重新核 primary source、合法输入、business oracle 和独立验收。

## 历史范围
- 原始日期、版本、阶段：源文档固定于 `bb7b1d24e9e517e09730282b104ce51b4204cb0b`；本轮为 2026-10-17 R42。
- 归档原因：已关闭任务记录只作为时点事实保留，避免历史状态冒充当前事实。

## 原始结论
- `Status: done`；原始任务语义完整保留于下方 quote。

## 当时证据
- 原始命令、产物、SHA、签字、counter、链接和状态保留于 quote。

## 当前有效性
historical。do not promote historical task card to current runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：需由当前 task card、consumer 和新证据重新复核。

## 继任文档
- 当前 canonical 文档：当前任务卡、当前代码/consumer 和 fresh receipt。
- supersedes / superseded-by：替代 governed-legacy 的未分层呈现；原卡内容不删除。
- 若重新启用的复核条件：合法输入重跑、业务 oracle 可证伪、独立 review 和全量静态门通过。

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
