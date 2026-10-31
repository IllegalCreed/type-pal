# 6a检查点静态门

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「6a检查点静态门」的治理候选页;证据原件即下方逐字节保全的固定main源(838B,SHA 85d8be91d785)。

## 来源与输入

来源为固定Git载体,非本次运行;原0个链接处置见作者review的linkDisposition。当前存活入口:无当前仓库内存活链接。

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 838B / SHA-256 85d8be91d78547306357e9751bd428d1e7b71caa8f2cdb3708db6e40469780e5；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# 6a检查点静态门

cwd: /Users/zhangxu/.codex/worktrees/quality-3y-closeout/type-pal

定向/相邻与反控见test-proof.json；本检查点不等于统一全仓门。

| 门/原命令 | exit | 秒 | raw SHA256 |
|---|---|---|---|
| docs：`pnpm check:docs` | 0 | 2.01 | a8468ed93b8bb3353b1b1ed4451dded8614a93acba8d7994bda08af3c37b8c83 |
| lint：`pnpm lint` | 0 | 2.55 | f9b1f4e128b0b95c736a5cab7b8d4ddc2f765bc0c0ae162c39c61f1475583991 |
| ledger：`node scripts/quality/code-quality-ledger.mjs` | 0 | 2.16 | d6f20931eba3478b400f14f156a3a030fba17369bcb1c5a68f65ab2667099e3c |
| diff：`git diff --check` | 0 | 0.03 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |

原件为同名raw.gz。全仓check、官方ratchet、protected fast未重新执行，editor运行时诊断未清；0新增关闭、未合main。
```
<!-- incremental-original-source:end -->
