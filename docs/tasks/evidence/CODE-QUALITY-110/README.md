# CODE-QUALITY-110 evidence — present draw-sprite review

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本批复核 indexed sprite 的逐帧 anchor、opaque mask、Framebuffer clipping 和真实 present/FBP/ending caller,没有源码修复（Status current review,Owner Codex,2026-10-17）。

## 来源与输入

[codex-current-review.md](codex-current-review.md) 为完整读取、primary/caller/oracle 与逐文件结论正文;[targeted.txt](targeted.txt) 为 game present 3 files/17 tests;[typecheck.txt](typecheck.txt) 为 game typecheck。

## 断言与业务 oracle

anchor/opaque mask/palette-0/writePixel 裁剪合同以真实 caller 与 SDLPal RLE/scene 锚点为 oracle;三测试覆盖帧高宽/透明孔/裁剪/identity/PNG 解码。

## 结果

全仓 `pnpm check` exit 0（editor 631/4943,lint 4962 零 error/warning/info）;check:docs、ledger、git diff --check 通过;official coverage ratchet/protected fast 仍因 shared/pal-extract/total baseline 回退失败,未改规则。

## 限制与复核

三个文件保持 review,不以局部全绿标记已验证。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 854B / SHA-256 272b31e26804e36d565fefe0f2ae79099a813bec088da1691460c8f59e19189d；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-110 evidence — present draw-sprite review

Status: current review
Owner: Codex
Last reviewed: 2026-10-17

本批复核 indexed sprite 的逐帧 anchor、opaque mask、Framebuffer clipping 和真实 present/FBP/ending
caller，没有源码修复。

- [codex-current-review.md](codex-current-review.md)：完整读取、primary/caller/oracle 与逐文件结论。
- [targeted.txt](targeted.txt)：game present 3 files / 17 tests。
- [typecheck.txt](typecheck.txt)：game typecheck。

全仓 `pnpm check` exit 0（各包 typecheck/test、editor 631/4943、lint 4962 files 零
error/warning/info）；`pnpm check:docs`、ledger、`git diff --check` 通过。official
coverage ratchet/protected fast 仍因 shared/pal-extract/total baseline 回退失败，未改规则。
三个文件保持 `review`，不以局部全绿标记已验证。
```
<!-- incremental-original-source:end -->
