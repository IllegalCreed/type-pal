# QUALITY-OPQ-RETIREMENT-1 - 历史测试退役保护账窄维护

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
- primary source：固定 source revision `b9901f97a3a09359cbeaed9dde126e6f44b7f229` 与原卡全文。
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
- 原始日期、版本、阶段：源文档固定于 `b9901f97a3a09359cbeaed9dde126e6f44b7f229`；本轮为 2026-10-17 R41。
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
固定源 revision `b9901f97a3a09359cbeaed9dde126e6f44b7f229`，source SHA `c582ed6065cd167e52ad0d85d9949452c47b5c142407d1665f80a384beaf5504`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # QUALITY-OPQ-RETIREMENT-1 - 历史测试退役保护账窄维护
>
> Status: done
> Closed Evidence: main d8a81d4c21a32efa3c140fb5858c83465b01bc5e; GitHub Documentation 37145486289 + Coverage 37145486286 success (2026-10-04); finite regression admission after audit, not historical quota fulfillment.
> Owner: Codex
> Reviewer: Codex（证据复核与反例验证，不冒称外部独立签字）
> Phase: ops
> Capability: ops
> Visual Verification Timing: N/A
>
> ## 目标与准入
>
> 2026-10-03 用户明确允许仅修正已核五个旧文件净减少16例的历史退役保护账，保留覆盖率、生产范围和其它测试保护，再收口O/P/Q。Codex build allowed；唯一写入者在 `codex/opq-frozen-integration-r1`，作者三树只读，不续派GLM。
>
> ## 前提与边界
>
> - 纯内部质量工具维护，产品/玩法/格式/UI不变；原版及两阶段机制真值不适用。
> - 保护参照仍 `1b3bffb7977455ce579cc1e66ea0a39fb400b151`，不换参照、不降低任何覆盖率指标、不恢复废弃测试凑数。
> - [原始门禁与五处差异](../../../../testing/archive/legacy/batches/finite-test-intake-20261003/README.md)：`903f833da2acbeead33565f969c26928a00a4706` 退役转换核四文件9→7、8→1、3→1、12→11；`04eb93318379339c301b28272ddb16224ee90436` 用真实party像素回归替代旧整瓦片alpha/latch，render旧文件5→1。净计数下降16，不把改名/重写后的身份差集谎称恰16个fullName。
> - 五文件未被O/P/Q改动。唯一例外必须精确匹配旧/新计数、旧/新身份摘要及当前测试文件SHA256。第六文件、额外删除、换名换身份、文件变动或不匹配旧基线均拒绝。
> - 最强替代解释：作者借历史退役隐藏新删除。任一指定摘要/hash/count不匹配即推翻并拒收；全包真实执行及原保护比例/生产范围检查继续成立。
> - 白名单：`scripts/coverage/protected-baseline.mjs`、新增专属退役判据/测试、`scripts/coverage/run.mjs`的保护判据接线及本卡/索引/看板/收口证据。不改coverage配置、依赖、产品、旧测试或作者证据。
>
> ## 验收
>
> 五条正例与真实文件hash、未知文件/额外删除/旧身份或新身份漂移/同数换身份/文件字节变动等拒收反例；原工具回归全绿。串行全仓check→官方ratchet→原main受保护strict-fast，静态error/warning/info全零。通过才合main、关闭O/P/Q并按精确SHA与可恢复备份退休三作者树/分支；失败保留blocked原件。
>
> ## 记录
>
> - 2026-10-03 Codex：前提verified，用户窄授权已记录；实现/验收pending，无其它Coding Owner。
> - 2026-10-03 Codex：`5c29b73be5441beb4adf94b63d0f14353d91d602` 精确五条实现accept，20新判据/原30工具均绿；全仓11875+345/typecheck/static零诊断，官方ratchet通过，protected逐条批准五个历史快照，原16 counter关闭。新strict仅game分支8280→8279拒收；定位旧I06随机屏外透明仙鹤，另GitHub现有5例缺ignored头像红，见[另行窄准入draft](QUALITY-TEST-INPUTS-1.md)。不降低任何比例、未推main/done/退休；用户的16项授权未外推为修改这两旧测试。
>
> ## 下一位 Agent 提示词
>
> 无下一位 Agent 提示词；Codex连续执行有限收口，不转交作者新任务。
>
> 本轮验证固定1b3bffb7/21/10；并行主线8efe0486已升级22/11，最新main接入仍待核。原16精确账闭合不追溯撤回，也不把旧pool门冒充新版本门或覆盖并行main。
<!-- original-source-quote:end -->
