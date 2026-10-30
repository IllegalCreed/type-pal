# CODE-QUALITY-92 — protected-fast command correction

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「CODE-QUALITY-92 — protected-fast command correction」的治理候选页;证据原件即下方逐字节保全的固定main源(2172B,SHA 0c6d3ca612cd)。

## 来源与输入

来源为固定Git载体,非本次运行;原0个链接处置见作者review的linkDisposition。当前存活入口:无当前仓库内存活链接。

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


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
