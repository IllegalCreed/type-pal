# QUALITY-OPQ-RETIREMENT-1 - 历史测试退役保护账窄维护

Status: done
Closed Evidence: main d8a81d4c21a32efa3c140fb5858c83465b01bc5e; GitHub Documentation 37145486289 + Coverage 37145486286 success (2026-10-04); finite regression admission after audit, not historical quota fulfillment.
Owner: Codex
Reviewer: Codex（证据复核与反例验证，不冒称外部独立签字）
Phase: ops
Capability: ops
Visual Verification Timing: N/A
Last reviewed: 2026-10-18
Governance Owner: Codex（历史卡文档治理；不代签原执行）
Template: task-card-v1 / 1.0.0

本卡是用户 2026-10-03 窄授权的历史测试退役保护账维护历史记录：仅修正已核五个旧文件净减少 16 例的退役账，保留覆盖率与生产范围保护，为 O/P/Q 收口解锁；下述数字与门禁均为原卡时点陈述，本次文档治理未重跑。

## 目标

按精确账目维护历史测试退役保护：五旧文件的净减 16 例以真实退役/替换实现，拒绝同数换身份、额外删除或借退役隐藏新删除，并以此为 O/P/Q 三卡 main/done/可恢复退休的前提。

## 范围

- 范围内：scripts/coverage/protected-baseline.mjs、新增专属退役判据/测试、scripts/coverage/run.mjs 的保护判据接线及本卡/索引/看板/收口证据；903f833da2acbeead33565f969c26928a00a4706 退役转换核四文件计数 9→7、8→1、3→1、12→11；04eb93318379339c301b28272ddb16224ee90436 用真实 party 像素回归替代旧整瓦片 alpha/latch，render 旧文件 5→1。
- 范围外：更换保护参照 1b3bffb7977455ce579cc1e66ea0a39fb400b151、降低任何覆盖率指标、恢复废弃测试凑数；第六文件、额外删除、换名换身份；coverage 配置、依赖、产品、旧测试或作者证据。

## 前提与证据

五文件未被 O/P/Q 改动；净计数下降 16 不把改名/重写后的身份差集谎称恰 16 个 fullName；唯一例外必须精确匹配旧/新计数、旧/新身份摘要及当前测试文件 SHA256。最强替代解释：作者借历史退役隐藏新删除——任一指定摘要/hash/count 不匹配即推翻并拒收。原始门禁与五处差异见[finite-test-intake 机账](../../../../testing/archive/legacy/batches/finite-test-intake-20261003/README.md)。
- 当前状态：done（历史终态）

## 验收

原卡记录：5c29b73be5441beb4adf94b63d0f14353d91d602 精确五条实现 accept，20 新判据/原 30 工具均绿；全仓 11875+345/typecheck/static 零诊断、官方 ratchet 通过、protected 逐条批准五个历史快照、原 16 counter 关闭；新 strict 仅 game 分支 8280→8279 拒收（定位旧 I06 随机屏外透明仙鹤），GitHub 另有缺 ignored 头像 5 例红，两处转[QUALITY-TEST-INPUTS-1](QUALITY-TEST-INPUTS-1.md)；用户的 16 项授权未外推为修改这两旧测试，未推 main/done/退休。以上均为原卡时点结果，本页未复跑。本页迁移验收：source/after SHA、quote 逆回读、模板与历史 overlay 章节、链接通过。

## 状态与交接

原卡明确无下一位 Agent 提示词：Codex 连续执行有限收口，不转交作者新任务；本轮验证固定 1b3bffb7/21/10，并行主线 8efe0486 已升级 22/11，最新 main 接入仍待核。原 16 精确账闭合不追溯撤回，也不把旧 pool 门冒充新版本门。S14 本页治理只改写泛化封套。

## 历史范围

2026-10-03 用户窄授权、Codex build allowed 与同日实现记录；唯一写入者在 codex/opq-frozen-integration-r1，作者三树只读。2026-10-17 R41 泛化封套，2026-10-18 S14 逐篇改写。

## 原始结论

`Status: done`：五文件净减 16 例退役账按精确判据收口、原 16 counter 关闭；遗留 I06 与 ignored 头像输入转 QUALITY-TEST-INPUTS-1。原卡全文在下方 quote 保全。

## 当时证据

两笔退役/替换提交 903f833da 与 04eb93318；实现 5c29b73be；[原始门禁与五处差异](../../../../testing/archive/legacy/batches/finite-test-intake-20261003/README.md)。本页治理未新增任何执行。

## 当前有效性

historical。保护参照与判据的当前版本以现行 scripts/coverage 与最新机账为准；原 16 账闭合不追溯撤回，但也不外推为后续版本门的通过。

## 继任文档

[QUALITY-TEST-INPUTS-1](QUALITY-TEST-INPUTS-1.md) 承接两旧输入；O/P/Q 三卡见[TEST-GLM-WAVE-O-1](TEST-GLM-WAVE-O-1-supply-validation-tenfold.md)、[TEST-GLM-WAVE-P-1](TEST-GLM-WAVE-P-1-editor-residual-tenfold.md)、[TEST-GLM-WAVE-Q-1](TEST-GLM-WAVE-Q-1-runtime-residual-tenfold.md)。

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
