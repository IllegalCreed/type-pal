# CODE3b raw测试当前质量门

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 CODE3b 原盘补证片质量门摘要页：恢复面 35 定向相邻、完整 extract 428、shared 126、双方 typecheck 与 coverage-tools 71 通过且 0 stderr，逐命令原件在 [regressions.json](regressions.json)；当前 16 轮反控与父候选 3a9 的 7 轮证据重建见 [verification.json](verification.json)。

## 来源与输入

命令在 worktree quality-3y-closeout/type-pal 执行，历史时点原件；本页为摘要页，逐命令 exit/秒/raw SHA 以下游 JSON 为准。

## 断言与业务 oracle

本页实质断言是门禁边界：docs、ledger、diff-check 与 lint-zero 须按 [static-gates.json](static-gates.json) 核完整诊断，不能只看 exit0；完整 check、official ratchet、protected fast 本片未执行（等待 editor 诊断稳定窗口），不合 main、不关闭文件/整卡。恢复面 0 stderr 是本片实测口径，不外推统一门通过。

## 结果

静态五命令（docs/verify.py/ledger/diff-check/lint-zero）全 exit0；恢复面六命令 0 stderr 块。两 raw 测试仍 review、0 新关闭（身份状态见同目录 identity-change.json）。

## 限制与复核

未重跑任何命令；后续片静态门不回写本页。候选待 Owner 非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 486B / SHA-256 d38283fffaf148d758da36410a7e634e77f3ae68ff6ebff6f9412c75e2b66438；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3b raw测试当前质量门

35定向相邻、extract428、shared126、双方typecheck和coverage-tools71通过，0stderr；原件见[regressions](regressions.json)。当前16轮/父候选7轮证据重建见[verification](verification.json)。

docs、ledger、diff-check与lint-zero按[当前静态回执](static-gates.json)核完整诊断。完整check、official ratchet、protected fast本片未执行，等待editor诊断稳定窗口；不合main，不关闭文件/整卡。
```
<!-- incremental-original-source:end -->
