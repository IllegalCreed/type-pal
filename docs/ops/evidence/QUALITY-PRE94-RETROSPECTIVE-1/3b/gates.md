# CODE3b 当前质量门

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 CODE3b 切片当前质量门的摘要页：定向相邻 42 例、完整 extract 435、shared 126、双方 typecheck 与 coverage-tools 71 通过，0 stderr 块——恢复面数字与边界原件在 [regressions.json](regressions.json)；六针（旧 16 全绿→新各 19 绿 1 指定 AssertionError、恢复 20 绿）另进程核验在 [verification.json](verification.json)。

## 来源与输入

命令在 worktree quality-3y-closeout/type-pal 执行，历史时点原件；本页为摘要页，逐命令 exit/秒/raw SHA 均以下游 JSON 为准。

## 断言与业务 oracle

本页的实质断言是门禁边界而非数字本身：全仓 check、official ratchet、protected fast 本片未执行（等待 editor 诊断稳定窗口），不合 main、不关闭文件或整卡；docs、ledger、diff-check 与 lint-zero 须按 [static-gates.json](static-gates.json) 核完整结果，不能只看 exit0。恢复面「0 stderr」是本片实测口径，不可外推为统一门通过。

## 结果

本片恢复面六命令全过且零 stderr 块；静态五命令（docs/verify.py/ledger/diff-check/lint-zero）另在 static-gates.json 全 exit0。0 新增关闭；两 boundary 旧关闭撤回 review、两 raw sanity pending→review 的状态变化记录在 README。

## 限制与复核

未重跑任何命令；完整 check/ratchet/protected 未执行，editor 运行时诊断未清。后续片（raw-tests/closeout）的门不回写本页。候选待 Owner 非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 489B / SHA-256 668d6ff4b4c8c68637231fb38ffaa1d9b08a73b0cbfccb84b387bda32b395b17；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3b 当前质量门

定向相邻42例、完整extract435、shared126、双方typecheck与coverage-tools71通过，0stderr；原件见[regressions](regressions.json)。六针及恢复见[verification](verification.json)。

全仓check、official ratchet、protected fast本片未执行，等待editor诊断稳定窗口；不合main，不关闭文件或整卡。docs、ledger、diff-check与lint-zero须按[当前静态回执](static-gates.json)核完整结果，不能只看exit0。
```
<!-- incremental-original-source:end -->
