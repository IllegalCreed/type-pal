# CODE-QUALITY-92 — protected-fast command correction

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 CODE-QUALITY-92（protected-fast 命令纠正）证据目录的索引页,对应归档任务卡 docs/ops/archive/tasks/done/CODE-QUALITY-92-protected-fast-command-correction.md（done）。核心事实: 历史 CODE83–89/CODE91 日志执行的是 pnpm check:fast,该命令不是所要求的基线保护覆盖率门;真实门是 TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast。本纠正不改任何生产代码、测试、阈值、排除或断言;primary source 为 scripts/coverage/run.mjs:403-462,526-558 与更早 CODE48 任务的显式命令。证据原件即下方逐字节保全的固定main源(2172B,SHA 0c6d3ca612cd)。

## 来源与输入

来源为固定Git载体,非本次运行;本页正文无 markdown 链接(原0个链接,处置见作者review的linkDisposition)。真实内容:

- affected-files.txt 列出30条当前账本记录临时重开 review。它们此前的语义读取与真实历史日志保持不变。当前源快照必须与各自关闭时源一致,一次通过的 protected-coverage 运行才能恢复关闭;单独的包绿运行不能关闭这些文件。
- 最新 protected fast 回执(protected-fast-current.raw.json): TYPE_PAL_COVERAGE_BASE_REF=origin/main VITEST_MAX_WORKERS=1 pnpm coverage:fast 完成全部七包(731 production files / 19,864 tests,各包原生测试全绿),随后在保护范围检查上 fail closed: test-file packages/game/src/core/event-rng-scene-restore.test.ts 在 origin/main 存在但候选 baseline 缺失。同一运行报 game 13805/15602 statements、total 70847/78780 statements——即使 RNG 范围对账后,精确覆盖底线回退仍在。30条先前关闭保持 review。
- 基线 ratchet 后的 protected fast(protected-fast-after-ratchet.raw.json): 边界合同抬升并 ratchet 候选 baseline(edbcad970)后,同一精确命令 exit 0 通过: 731 production files / 19,870 tests,七包无回退;game 13812/15602 statements、9064/11373 branches、12336/13685 lines;total 70854/78780、51557/61618、63306/68945。先前的范围失败保留为历史证据。

## 断言与业务 oracle

文档事实核对(currentExecution=false):各记录按其自身字段成立。本轮核读两份 raw JSON 确认: current 运行七包测试计数 131/1498/280/671/8964/3531/4789 合计 19864,尾行 FAIL 与 ELIFECYCLE exit1;after-ratchet 运行 game 3537 tests、尾行『覆盖率门禁通过；相对 fast 基线未下降，提升 0 项』。两份 raw 均只做行尾空白/末尾空行归一化(rawSha256 f7fda245…/93142fc1… 锚定原始字节)。source-snapshot-comparison.json 30条全部 byteIdentical=true(CQ83×3,CQ84–89×4,CQ91×3),是恢复关闭前提的直接证据。空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;本轮语义整改把命令纠正语义、两次 protected 运行的失败/通过身份与30条重开记录的前提写回可见正文,不重开任务、不重跑执行。不产生新执行结果。

## 限制与复核

未重跑原命令;历史结论保持原时点。affected-files.txt 与 protected-fast-*.txt/.exit 不在本轮1916候选集合内,数字按本页与 raw JSON 交叉见证。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2172B / SHA-256 0c6d3ca612cdfca70b4c27135ec8d94fffe847344d189955bedc05d14f7ceba3；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-92 — protected-fast command correction

The historical CODE83–89/CODE91 logs execute `pnpm check:fast`; that command is not the required baseline-protected coverage gate. The actual gate is `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`.

`affected-files.txt` lists 30 current ledger records temporarily reopened review. Their prior semantic reads and actual historical logs remain unchanged. Current source snapshots must match the individual closure source before a passing protected-coverage run can restore closure. A package-green run alone cannot close these files.

Primary source: `scripts/coverage/run.mjs:403-462,526-558` and the earlier CODE48 task's explicit command. No production code, tests, thresholds, exclusions or assertions are changed by this correction.


## Latest protected fast receipt

`TYPE_PAL_COVERAGE_BASE_REF=origin/main VITEST_MAX_WORKERS=1 pnpm coverage:fast` completed all seven packages (731 production files / 19,864 tests), with native package tests green, then failed closed on the protected scope check: `test-file: packages/game/src/core/event-rng-scene-restore.test.ts` is present on origin/main but absent from the candidate baseline. The same run reports game `13805/15602` statements and total `70847/78780` statements, so after the RNG scope is reconciled the exact coverage-floor regressions remain. Receipt: `protected-fast-current.txt`, `protected-fast-current.exit`. Thirty prior closures remain review.


## Protected fast after baseline ratchet

After the boundary contracts raised and ratcheted the candidate baseline (`edbcad970`), the exact protected command `TYPE_PAL_COVERAGE_BASE_REF=origin/main VITEST_MAX_WORKERS=1 pnpm coverage:fast` passed at exit 0. It completed 731 production files / 19,870 tests across seven packages and reported no regressions against the new baseline. Game is `13812/15602` statements, `9064/11373` branches, `12336/13685` lines; total is `70854/78780`, `51557/61618`, `63306/68945`. The prior scope failure is preserved as historical evidence; the current receipt is `protected-fast-after-ratchet.txt` with exit file `protected-fast-after-ratchet.exit`.
```
<!-- incremental-original-source:end -->
