# QUALITY-OPQ-RETIREMENT-1 - 历史测试退役保护账窄维护

Status: done
Closed Evidence: main d8a81d4c21a32efa3c140fb5858c83465b01bc5e; GitHub Documentation 37145486289 + Coverage 37145486286 success (2026-10-04); finite regression admission after audit, not historical quota fulfillment.
Owner: Codex
Reviewer: Codex（证据复核与反例验证，不冒称外部独立签字）
Phase: ops
Capability: ops
Visual Verification Timing: N/A

## 目标与准入

2026-10-03 用户明确允许仅修正已核五个旧文件净减少16例的历史退役保护账，保留覆盖率、生产范围和其它测试保护，再收口O/P/Q。Codex build allowed；唯一写入者在 `codex/opq-frozen-integration-r1`，作者三树只读，不续派GLM。

## 前提与边界

- 纯内部质量工具维护，产品/玩法/格式/UI不变；原版及两阶段机制真值不适用。
- 保护参照仍 `1b3bffb7977455ce579cc1e66ea0a39fb400b151`，不换参照、不降低任何覆盖率指标、不恢复废弃测试凑数。
- [原始门禁与五处差异](../../../../testing/archive/legacy/batches/finite-test-intake-20261003/README.md)：`903f833da2acbeead33565f969c26928a00a4706` 退役转换核四文件9→7、8→1、3→1、12→11；`04eb93318379339c301b28272ddb16224ee90436` 用真实party像素回归替代旧整瓦片alpha/latch，render旧文件5→1。净计数下降16，不把改名/重写后的身份差集谎称恰16个fullName。
- 五文件未被O/P/Q改动。唯一例外必须精确匹配旧/新计数、旧/新身份摘要及当前测试文件SHA256。第六文件、额外删除、换名换身份、文件变动或不匹配旧基线均拒绝。
- 最强替代解释：作者借历史退役隐藏新删除。任一指定摘要/hash/count不匹配即推翻并拒收；全包真实执行及原保护比例/生产范围检查继续成立。
- 白名单：`scripts/coverage/protected-baseline.mjs`、新增专属退役判据/测试、`scripts/coverage/run.mjs`的保护判据接线及本卡/索引/看板/收口证据。不改coverage配置、依赖、产品、旧测试或作者证据。

## 验收

五条正例与真实文件hash、未知文件/额外删除/旧身份或新身份漂移/同数换身份/文件字节变动等拒收反例；原工具回归全绿。串行全仓check→官方ratchet→原main受保护strict-fast，静态error/warning/info全零。通过才合main、关闭O/P/Q并按精确SHA与可恢复备份退休三作者树/分支；失败保留blocked原件。

## 记录

- 2026-10-03 Codex：前提verified，用户窄授权已记录；实现/验收pending，无其它Coding Owner。
- 2026-10-03 Codex：`5c29b73be5441beb4adf94b63d0f14353d91d602` 精确五条实现accept，20新判据/原30工具均绿；全仓11875+345/typecheck/static零诊断，官方ratchet通过，protected逐条批准五个历史快照，原16 counter关闭。新strict仅game分支8280→8279拒收；定位旧I06随机屏外透明仙鹤，另GitHub现有5例缺ignored头像红，见[另行窄准入draft](QUALITY-TEST-INPUTS-1.md)。不降低任何比例、未推main/done/退休；用户的16项授权未外推为修改这两旧测试。

## 下一位 Agent 提示词

无下一位 Agent 提示词；Codex连续执行有限收口，不转交作者新任务。

本轮验证固定1b3bffb7/21/10；并行主线8efe0486已升级22/11，最新main接入仍待核。原16精确账闭合不追溯撤回，也不把旧pool门冒充新版本门或覆盖并行main。
