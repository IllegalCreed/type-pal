# CODE-QUALITY-83 evidence — game menu mode / stack

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「CODE-QUALITY-83 evidence — game menu mode / stack」的治理候选页;证据原件即下方逐字节保全的固定main源(808B,SHA 2d8d39399280)。

## 来源与输入

来源为固定Git载体,非本次运行;原0个链接处置见作者review的linkDisposition。当前存活入口:无当前仓库内存活链接。

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 808B / SHA-256 2d8d393992800627d771d8222dadf4a422ccd92f92d662ff0eb3fe567dbcad81；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-83 evidence — game menu mode / stack

本批只核验 `menu-mode.ts`、`menu-stack.ts`、`menu-mode.test.ts`，没有实现改动。

- `targeted.txt`：定向与相邻 5 个测试文件、342 tests 通过；包含真实 `createInitialGameState`、`dispatchMenuInput`、scene/battle/menu caller。
- `typecheck-biome.txt`：game typecheck 通过，三条白名单文件 Biome 通过且无修改。
- `source-callers.txt`：实现、真实 caller、`GameState` 类型和 SDLPal `uigame.c`/`script.c`/`uibattle.c` 证据索引。

已完成：定向/相邻 5 个测试文件共 342 tests、game typecheck、Biome、全仓 `pnpm check`、官方 coverage ratchet、protected fast、lint-zero、docs/content-review、ledger；无实现改动，三条账本记录已验证，任务卡已归档。
```
<!-- incremental-original-source:end -->
