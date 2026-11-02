# CODE-QUALITY-107 evidence — Game menu primitives / item-select

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本目录记录 CODE-QUALITY-97/98 menu 基础切片的当前逐文件复核（Status current review,Owner Codex,2026-10-17）,包含 SDLPal primary、真实 caller、测试排重和边界 oracle;没有生产或测试源文件改动。

## 来源与输入

[codex-current-review.md](codex-current-review.md) 为逐文件结论与 E-4/E-5 未决边界正文;[targeted.txt](targeted.txt) 为 7 文件/78 tests 定向回归;[adjacent.txt](adjacent.txt) 为 game menu 相邻回归;[typecheck.txt](typecheck.txt) 为 game typecheck。

## 断言与业务 oracle

primitives 的 cursor/page/confirm/triple/switch 合同与 SDLPal 逐项移动一致;item-select 的 filter 真值表与 usable/sellable primary 入口一致,important 为显式工程近似;公开 caller 只消费纯 state/过滤结果。

## 结果

相邻 40 files/377 tests PASS 但 `magic-script.test.ts` 保留 2 条预期缺失 labelMap stderr（本批不静音,也不把相邻包全绿当全仓通过——该诊断由 CODE-QUALITY-108 后续修复）。全仓 `pnpm check` exit 0（editor 631/4943,lint 4962 零诊断）;check:docs 与 ledger 通过。官方 ratchet 与 protected fast 均按真实回退失败:shared 447/466 statements、203/218 branches,pal-extract 1068/1546 statements 等,全仓 71203/79117 statements。

## 限制与复核

7 个文件和任务卡均保持 review,不能标 done;未改阈值或 baseline。

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
