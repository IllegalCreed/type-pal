# CODE-QUALITY-107 evidence — Game menu primitives / item-select

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「CODE-QUALITY-107 evidence — Game menu primitives / item-select」的治理候选页;证据原件即下方逐字节保全的固定main源(1679B,SHA 88f8b68555d1)。

## 来源与输入

来源为固定Git载体,非本次运行;原4个链接处置见作者review的linkDisposition。当前存活入口:[adjacent.txt](adjacent.txt) [codex-current-review.md](codex-current-review.md) [targeted.txt](targeted.txt) [typecheck.txt](typecheck.txt)。

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1679B / SHA-256 88f8b68555d1435a281d54c561fe71cbb07a0167551797de5b6764295d387336；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-107 evidence — Game menu primitives / item-select

Status: current review
Owner: Codex
Last reviewed: 2026-10-17

本目录记录 CODE-QUALITY-97/98 menu 基础切片的当前逐文件复核，包含 SDLPal primary、真实
caller、测试排重和边界 oracle。没有生产或测试源文件改动。

- [codex-current-review.md](codex-current-review.md)：逐文件结论与 E-4/E-5 未决边界。
- [targeted.txt](targeted.txt)：7 文件 / 78 tests 定向回归。
- [adjacent.txt](adjacent.txt)：game menu 相邻回归。
- [typecheck.txt](typecheck.txt)：game typecheck。

相邻回归为 40 files / 377 tests PASS，但 `magic-script.test.ts` 保留 2 条预期缺失
labelMap stderr；本批不静音该诊断，也不把相邻包全绿当作全仓通过。

全仓 `pnpm check` 已完成并 exit 0：各包 typecheck/test 完成，editor 为 631 files / 4943
tests，lint 在该命令末尾报告 4962 files、0 errors / 0 warnings / 0 infos。`pnpm check:docs`
和 `node scripts/quality/code-quality-ledger.mjs` 也在本批收口复核中通过。

官方 `pnpm coverage:ratchet` 与
`TYPE_PAL_COVERAGE_BASE_REF=origin/main node scripts/coverage/run.mjs fast` 均按真实回退
失败，未改阈值或 baseline：shared 为 447/466 statements、203/218 branches，pal-extract
为 1068/1546 statements、461/593 branches、111/140 functions、943/1367 lines；全仓为
71203/79117 statements、51712/61793 branches、13489/15050 functions、63612/69233 lines。
相邻 menu 回归仍保留 `magic-script.test.ts` 的 2 条预期缺失 labelMap stderr，未静音。
因此本批 7 个文件和任务卡均保持 `review`，不能标 `done`。
```
<!-- incremental-original-source:end -->
