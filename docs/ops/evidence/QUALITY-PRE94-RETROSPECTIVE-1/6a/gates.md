# 6a检查点静态门

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 6a 工程切片的检查点静态门回执:cwd 为 worktree quality-3y-closeout;定向/相邻与反控见同目录 test-proof.json,本检查点不等于统一全仓门。原件逐字节保全于下方保全块。

## 来源与输入

四个静态门命令在该检查点各执行一次,原件为同名 raw.gz;本页只汇总 exit、耗时与 raw SHA256。

## 断言与业务 oracle

docs(pnpm check:docs)exit 0/2.01s;lint(pnpm lint)exit 0/2.55s——对应本片 4376 文件 error/warning/info 均 0 的 lint-zero 口径;ledger(node scripts/quality/code-quality-ledger.mjs)exit 0/2.16s;diff(git diff --check)exit 0/0.03s(raw SHA 为空输出哈希 e3b0c442…)。四门在该时点全部通过。

## 结果

检查点静态面通过;0 新增关闭、未合 main。全仓 check、官方 ratchet、protected fast 未重新执行,editor 运行时诊断未清——本页通过不得外推为统一门或集成收口。

## 限制与复核

本页不含任何测试运行细节(见 test-proof.json 的 6 个 run);未重跑任何命令;历史结论保持原时点;候选待 Owner 非作者接收。

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
