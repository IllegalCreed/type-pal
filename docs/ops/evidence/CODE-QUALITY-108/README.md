# CODE-QUALITY-108 evidence — magic-script warning ownership

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本目录处理 `magic-script.test.ts` 中两个预期缺失 label 的 stderr 诊断（Status current review,Owner Codex,2026-10-17）。生产 `runMagicScriptSync` 的 fail-closed warning 保留;测试改为断言并恢复 `console.warn` spy。

## 来源与输入

[codex-current-review.md](codex-current-review.md) 为完整读取范围、primary/caller/oracle、根因与修复边界正文;[before.txt](before.txt) 为修复前 1/37 定向测试及两条 stderr;[targeted.txt](targeted.txt) 为修复后 1/37 定向 0 stderr;[adjacent.txt](adjacent.txt) 为相邻 40/377 0 stderr;[typecheck.txt](typecheck.txt) 为 game typecheck。

## 断言与业务 oracle

warning oracle=精确文本断言+finally 恢复;原有返回值、HP 不变、scriptOnSuccess 不执行断言保留。

## 结果

全仓 `pnpm check` exit 0（editor 631/4943,lint 4962 files 零 error/warning/info）;check:docs、ledger、git diff --check 通过;official coverage ratchet/protected fast 仍因 shared/pal-extract 及总量 baseline 回退失败,未降低阈值或改无关 baseline。

## 限制与复核

本批不修改产品行为或公共接口;文件和任务卡继续保持 review,不因定向绿灯直接关闭。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1170B / SHA-256 9b4c101c96d06ca8dd6a3c29834f823f8ccfc4d6b757dd56335a8fd47c3f5403；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-108 evidence — magic-script warning ownership

Status: current review
Owner: Codex
Last reviewed: 2026-10-17

本批只处理 `magic-script.test.ts` 中两个预期缺失 label 的 stderr 诊断。生产
`runMagicScriptSync` 的 fail-closed warning 保留；测试改为断言并恢复 `console.warn` spy。

- [codex-current-review.md](codex-current-review.md)：完整读取范围、primary/caller/oracle、根因与修复边界。
- [before.txt](before.txt)：修复前 1/37 定向测试及两条 stderr。
- [targeted.txt](targeted.txt)：修复后 1/37 定向测试，0 stderr。
- [adjacent.txt](adjacent.txt)：game menu 相邻 40/377，0 stderr。
- [typecheck.txt](typecheck.txt)：game typecheck。

本批不修改产品行为或公共接口。全仓 `pnpm check` exit 0（各包 typecheck/test、editor
631/4943、lint 4962 files 零 error/warning/info）；`pnpm check:docs`、ledger 和
`git diff --check` 通过。official coverage ratchet/protected fast 仍因 shared 与
pal-extract 以及总量 baseline 回退失败，未降低阈值或改无关 baseline。文件和任务卡继续
保持 `review`，不因定向绿灯直接关闭。
```
<!-- incremental-original-source:end -->
