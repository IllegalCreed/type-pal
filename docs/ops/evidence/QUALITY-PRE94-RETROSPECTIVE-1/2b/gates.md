# CODE2b检查点静态门

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 CODE2b 切片检查点的静态门回执（原表在保全块）：`pnpm check:docs` exit 0（2.36s）、`pnpm lint` exit 0（2.89s）、`node scripts/quality/code-quality-ledger.mjs` exit 0（2.63s）、`git diff --check` exit 0（0.04s），各带 raw SHA256，同名 raw.gz 为原件。本片静态门没有初检失败记录，与姊妹片 3/gates.md「lint 初检 exit 1 后重跑 exit 0」的两段轨迹不同。

## 来源与输入

命令在 worktree quality-3y-closeout/type-pal 执行，属 CODE2b 交付当日的历史时点原件；本页 0 链接，无导航入口需要处置。

## 断言与业务 oracle

四条命令退出码按原值见证（全 0）。边界：这是切片级静态门，不是统一门——全仓 check、官方 ratchet、protected fast 当时未重跑，editor 诊断未清，明确不合 main，0 新增关闭；exit 0 只覆盖所列四命令自身，不外推为仓库零诊断或产品通过。

## 结果

本片静态门四条全过且无返工记录；运行面另有定向 34/shared 126+typecheck/相邻 18+typecheck/coverage-tools 69 回执（tests.json）。治理页只保全与说明，不产生新执行结果。

## 限制与复核

未重跑任何命令；后继统一门以 shared-codecs 片（20386 check、ratchet/protected 各 19988 零诊断）为准，不以本页替代。候选待 Owner 非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 794B / SHA-256 dfb6645526e86091fa70f3c858876c9c01d5bd97afa1d0101ef270290d7922ff；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE2b检查点静态门

cwd: /Users/zhangxu/.codex/worktrees/quality-3y-closeout/type-pal

| 原命令 | exit | 秒 | raw SHA256 |
|---|---|---|---|
| `pnpm check:docs` | 0 | 2.36 | ac4ff2dbd4f726844ad804b882aa5c8a9b616a829a1884f898d5d1d30241cea4 |
| `pnpm lint` | 0 | 2.89 | ba282fe273eb25d349f9665ad8abab8d11a2e018728830fad6b2feb158632fd4 |
| `node scripts/quality/code-quality-ledger.mjs` | 0 | 2.63 | ae60c336e8b8bdbdc969e4ada9a323f7b5559b2c39323f8eb35ce607861c111f |
| `git diff --check` | 0 | 0.04 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |

对应同名raw.gz。34定向/shared126+typecheck/extract相邻18+typecheck/coverage-tools69另见报告；全仓check/official ratchet/protected fast未重跑，editor诊断未清，禁止合main。0新增关闭。
```
<!-- incremental-original-source:end -->
