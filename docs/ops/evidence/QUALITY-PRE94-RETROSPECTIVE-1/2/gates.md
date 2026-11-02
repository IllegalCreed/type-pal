# CODE2检查点静态门

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「CODE2检查点静态门」的治理候选页;证据原件即下方逐字节保全的固定main源(776B,SHA 842d239ccd29)。

## 来源与输入
本页是 CODE2 复审检查点的静态门回执原件(776B，SHA 842d239ccd29)：四门 `pnpm check:docs`(2.27s)/`pnpm lint`(3.04s)/`node scripts/quality/code-quality-ledger.mjs`(2.58s)/`git diff --check`(0.05s) 全部 exit 0，各附 raw SHA256 与同名 raw.gz；cwd 为 quality-3y-closeout worktree。本页无正文链接。

来源为固定Git载体,非本次运行;原0个链接处置见作者review的linkDisposition。当前存活入口:无当前仓库内存活链接。

## 断言与业务 oracle

原件承载的门事实：四静态门 exit0 且逐门给出 raw SHA256(如 check:docs=658dae0e…、lint=6f6a87e4…、ledger=ce81129f…、diff=e3b0c442…空输出)；33定向/shared130+typecheck/相邻30/coverage-tools68 另见各报告原件，不在本页。明示边界：完整check/official ratchet/protected fast未重跑、editor诊断未清、禁止合main、0新增关闭——exit0的四门只是检查点静态门，不是全仓质量门。

## 结果

本页结果是 CODE2 检查点的静态门通过记录(四门exit0)，不产生新执行结果；全仓门与集成按原文时点仍延后。

## 限制与复核

未重跑四门;秒数与SHA按原件见证。本页为纯门回执,审计语义在同目录README.md,两页分工不重复。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 776B / SHA-256 842d239ccd2940867e63270f9f6f85ee2d4a0fe47a3faeb73202548e6ed011f0；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE2检查点静态门

cwd: /Users/zhangxu/.codex/worktrees/quality-3y-closeout/type-pal

| 原命令 | exit | 秒 | raw SHA256 |
|---|---|---|---|
| `pnpm check:docs` | 0 | 2.27 | 658dae0e4b409a828b06f8b3bac5aa3792e49c69d15e9a1d7d48ea4d83b2fae9 |
| `pnpm lint` | 0 | 3.04 | 6f7a87e437762331f96721458c550ecfe9c9c64ff46067a429bc94ca985ba7f7 |
| `node scripts/quality/code-quality-ledger.mjs` | 0 | 2.58 | ce81129f4e3eed16bd0c9be81af17faa7a881022c3e1d3d43138e9b5a58b09af |
| `git diff --check` | 0 | 0.05 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |

对应同名raw.gz。33定向/shared130+typecheck/相邻30/coverage-tools68另见报告；完整check/official ratchet/protected fast未重跑，editor诊断未清，禁止合main。0新增关闭。
```
<!-- incremental-original-source:end -->
