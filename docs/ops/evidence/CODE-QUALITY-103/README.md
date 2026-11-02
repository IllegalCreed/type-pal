# CODE-QUALITY-103 evidence — editor residual tests

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本目录是 CODE-QUALITY-103（editor 残余测试复核）的证据索引:复核两个历史"待核"测试文件,未修改产品代码或测试。完整 caller/oracle 和逐文件结论见 [codex-current-review.md](codex-current-review.md)。

## 来源与输入

[targeted.txt](targeted.txt) 为两个残余测试定向回归 4/4 通过且无诊断;[adjacent.txt](adjacent.txt) 为 22 文件 224/224 相邻回归——通过但保留 22 条 React act(...) 诊断,exit 0 不等于硬门通过;[typecheck.txt](typecheck.txt) 为 editor typecheck 与 author-check 通过回执。

## 断言与业务 oracle

残余用例以真实 commandForm/buildBlankProject/作者文件 loader/EditSession/EditorHistoryCoordinator 为 oracle,"引用失效"禁用、保存门失败、undo 恢复红态等断言直接观察业务结果。

## 结果

两文件状态从"待核"提升到 review;相邻 act 诊断未过滤未改写,相邻门 FAIL(diagnostics non-zero)。

## 限制与复核

exit 0 但带诊断不计硬门通过;后续 CODE-QUALITY-104 处理 act 生命周期诊断后须复验本批。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 536B / SHA-256 3d9b5eb80023c376b1daf2e1247c32cdc74ce69edb64d590781c2da4fc5006fb；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-103 evidence — editor residual tests

本批复核两个历史 `待核` 测试文件，未修改产品代码或测试。完整 caller/oracle 和逐文件结论见 [`codex-current-review.md`](codex-current-review.md)。

- [`targeted.txt`](targeted.txt)：两个残余测试 4/4，通过且无诊断。
- [`adjacent.txt`](adjacent.txt)：22 文件 224/224，通过但保留 22 条 React `act(...)` 诊断；exit 0 不等于硬门通过。
- [`typecheck.txt`](typecheck.txt)：editor typecheck 与 author-check 通过。
```
<!-- incremental-original-source:end -->
