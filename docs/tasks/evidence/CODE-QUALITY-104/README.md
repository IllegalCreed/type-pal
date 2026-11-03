# CODE-QUALITY-104 evidence — editor act lifecycle diagnostics

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本目录是 CODE-QUALITY-104（editor act 生命周期诊断）的证据索引:本批只修改两个测试文件中的事件包裹,保持业务断言与产品代码不变。逐文件根因、修改边界和全门结论见 [codex-current-review.md](codex-current-review.md)。

## 来源与输入

[before.txt](before.txt) 为修复前两个 M02 测试 4/4 但 22 条 React act 诊断;[targeted-after.txt](targeted-after.txt) 为修复后定向 2 files/4 tests 零诊断;[adjacent-after.txt](adjacent-after.txt) 为修复后相邻 24 files/228 tests 零诊断。

## 断言与业务 oracle

诊断修复可判别:修复前 22 条 stderr 保留,修复后定向与相邻均零诊断,无过滤或 silent 掩盖。

## 结果

[check.txt](https://github.com/IllegalCreed/type-pal/blob/eb223e8ae7b9f0062cbbaaf9869e890b6a974c91/docs/tasks/evidence/CODE-QUALITY-104/check.txt.gz) 为全仓 `pnpm check` exit 0;[protected-fast.txt](protected-fast.txt)、[ratchet.txt](ratchet.txt) 为覆盖率门——均因既有 shared/pal-extract baseline 回退失败,未由本批引入;[typecheck.txt](typecheck.txt)、[lint.txt](lint.txt)、[docs.txt](docs.txt)、[ledger.txt](ledger.txt) 为 typecheck/lint/docs/ledger 硬门回执。

## 限制与复核

统一 coverage 门未清前本批保持 review;exit 0 但带诊断不计硬门通过。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 910B / SHA-256 e013d89fca46055101e4ff62c79320ca357c8bdcf68f01b49457a654bfaa86da；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-104 evidence — editor act lifecycle diagnostics

本批只修改两个测试文件中的事件包裹，保持业务断言与产品代码不变。

- [`codex-current-review.md`](codex-current-review.md)：逐文件根因、修改边界和全门结论。

- [`before.txt`](before.txt)：修复前两个 M02 测试 4/4 但 22 条 React `act` 诊断。
- [`targeted-after.txt`](targeted-after.txt)：修复后定向 2 files / 4 tests，零诊断。
- [`adjacent-after.txt`](adjacent-after.txt)：24 files / 228 tests，零诊断。
- [`check.txt`](check.txt)：全仓 `pnpm check` exit 0。
- [`ratchet.txt`](ratchet.txt)、[`protected-fast.txt`](protected-fast.txt)：覆盖率门均因既有 shared/pal-extract baseline 回退失败，未由本批引入。
- [`typecheck.txt`](typecheck.txt)、[`lint.txt`](lint.txt)、[`docs.txt`](docs.txt)、[`ledger.txt`](ledger.txt)：相应硬门回执。
```
<!-- incremental-original-source:end -->
