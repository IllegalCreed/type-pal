# CODE3检查点静态门

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「CODE3检查点静态门」的治理候选页;证据原件即下方逐字节保全的固定main源(1415B,SHA 2aca85cb487f)。

## 来源与输入

来源为固定Git载体,非本次运行;原0个链接处置见作者review的linkDisposition。当前存活入口:无当前仓库内存活链接。

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1415B / SHA-256 2aca85cb487fdd46eb17bbd4ece35e29f97fd1cd184e3dd2d35df71bdc5b3726；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3检查点静态门

cwd: /Users/zhangxu/.codex/worktrees/quality-3y-closeout/type-pal

| 初检原命令 | exit | 秒 | raw SHA256 |
|---|---|---|---|
| `pnpm check:docs` | 0 | 2.146 | 87668b61d60ee0332a2d5535f360888d666040e3e593d33a7313847d436200ea |
| `pnpm lint` | 1 | 2.658 | f421ecbf1986bbf300ec6633c29e7f0a0759c7d4b8da149a8e72d146be4a7258 |
| `node scripts/quality/code-quality-ledger.mjs` | 0 | 2.371 | b26dcfc2e33441d4dec76a8ae3a3b815b817547271c5ba20c72c918d5e70d9bd |
| `git diff --check` | 0 | 0.024 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |

同名raw.gz保留初检原件。初检lint仅新增probe的import排序1 error，已按现行规则修正，不把该记录改成零诊断；最终重跑另记。docs为1353 Markdown/7273 links/442cards、0 issues，phase184/content570通过。ledger为3287 inventory /211closed /214review /2862pending，0新增关闭。

定向45、extract72文件434/typecheck、shared16文件126/typecheck通过，无act/环境/navigation；额外probe按现行严格规则typecheck与实际执行重新通过。全仓check/official ratchet/protected fast未新跑，editor诊断未清，不合main。

最终归档后重跑`pnpm lint`：exit0；4419 files; 0 errors / 0 warnings / 0 infos; complete report。raw SHA256 f2e1f1b340a529288ae4e8ba69a22d0bfb624266972371da6ff40d6e9ac680ef，见final-lint-zero.raw.gz；初检诊断已修复。
```
<!-- incremental-original-source:end -->
