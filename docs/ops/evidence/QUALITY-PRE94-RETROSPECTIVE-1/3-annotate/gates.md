# CODE3/3f检查点静态门

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 CODE3/3f 切片检查点的静态门回执（原表在保全块）：`pnpm check:docs` exit 0（docs 为 1356 Markdown/7297 local links/443 cards、0 issues；48 docs-tool tests、phase184/content570 通过）、`pnpm lint` exit 0（lint-zero 检查 4428 文件 error/warning/info 全 0）、`node scripts/quality/code-quality-ledger.mjs` exit 0（3287 inventory/209closed/216review/2862pending）、`git diff --check` exit 0。同名 raw.gz 保留原件。

## 来源与输入

命令在 worktree quality-3y-closeout/type-pal 执行，历史时点原件；本页 0 链接。归档后另跑最终 check:docs（exit0，1.263s，final-docs.raw.gz）与最终 lint（exit0，2.155s，4429 文件 0/0/0，final-lint-zero.raw.gz）。

## 断言与业务 oracle

退出码与计数按原值见证；本片显式声明「静态原命令回执将在实际执行后追加，不能把本检查点标成完整治理批次关闭」。运行面边界同样如实：定向 52、shared 126/typecheck、extract typecheck、coverage 工具 70 通过，但完整 extract 433 原生绿含 10 stderr 块/六条早退假绿，包验收未过——机器绿不代表语义复审完成，两条历史关闭转 review、0 新增关闭。

## 结果

静态四命令全过（初检与归档后重跑双份记录），lint 零诊断口径为 4428/4429 文件；全仓 check/official ratchet/protected fast 未新跑，editor 诊断未清，不合 main。

## 限制与复核

未重跑任何命令；raw.gz/final-*.raw.gz 为原件。后续片的静态门不回写本页。候选待 Owner 非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1696B / SHA-256 2b650744f35fecc88f8f3140422ba41a8ced2cc7df395f81a0914352f79a50f9；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3/3f检查点静态门

cwd: /Users/zhangxu/.codex/worktrees/quality-3y-closeout/type-pal

定向52、shared126/typecheck、extract typecheck与coverage工具70通过；完整extract433原生绿含10 stderr块/六早退，包验收未过。全仓check/official ratchet/protected fast未新跑，editor诊断未清，不合main。

静态原命令回执将在实际执行后追加，不能把本检查点标成完整治理批次关闭。

| 原命令 | exit | 秒 | raw SHA256 |
|---|---|---|---|
| `pnpm check:docs` | 0 | 1.267 | 7ebdc606516308e00cdd10f8690dc78a054d0f858d017303a13d1453629e24cd |
| `pnpm lint` | 0 | 2.306 | a667d4b6570f39ec4b96359580a26e4a8b8339e28a5bc184ebc242284265afbf |
| `node scripts/quality/code-quality-ledger.mjs` | 0 | 1.12 | 1c6ce34c7d3251ffb0a4213a498cc6c15112ad797f1952057659554ac7e605ff |
| `git diff --check` | 0 | 0.033 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |

同名raw.gz保留原件。docs为1356 Markdown /7297 local links /443 cards，0 issues；48 docs-tool tests、phase184/content570通过。lint-zero检查4428文件，error/warning/info全部0；ledger实际3287 inventory /209 closed /216 review /2862 pending。两条历史关闭转review，0新增关闭；机器绿不代表语义复审完成。

最终归档后 `pnpm check:docs`：exit0，1.263秒；raw SHA256 9d1f463f881a66926e0b198cf349777356aec35c2da9bcd9a57b6d4e33a1ed2a，见final-docs.raw.gz。

最终归档后 `pnpm lint`：exit0，2.155秒；raw SHA256 20931e7c2e4b4e60fb23fd1ba3f9ca0a0ae433efea8d9ce263ac48f18e7e966f，见final-lint-zero.raw.gz。

最终lint检查4429文件，0 errors /0 warnings /0 infos；完整报告见final-lint-zero.raw.gz。
```
<!-- incremental-original-source:end -->
