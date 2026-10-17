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
