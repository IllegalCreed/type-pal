# CODE-QUALITY-109 evidence — analytics installation lifecycle

Status: current review
Owner: Codex
Last reviewed: 2026-10-17

本批复核 analytics 安装器与唯一 main caller，只修测试安装实例的 teardown ownership。
生产实现、隐私策略、GA URL/consent 行为保持不变。

- [codex-current-review.md](codex-current-review.md)：完整读取范围、caller/oracle、缺口和修复边界。
- [before.txt](before.txt)：修复前按 game 包 jsdom runner 的 6/23 回归。
- [targeted.txt](targeted.txt)：修复后按相同 runner 的 6/23 回归。
- [typecheck.txt](typecheck.txt)：game typecheck。
- [incorrect-root-runner.txt](incorrect-root-runner.txt)：错误从仓库根调用 Vitest 的失败记录，仅用于说明 runner scope，不计产品失败。

全仓 `pnpm check` exit 0（各包 typecheck/test、editor 631/4943、lint 4962 files 零
error/warning/info）；`pnpm check:docs`、ledger、`git diff --check` 通过。official
coverage ratchet/protected fast 仍因 shared/pal-extract/total baseline 回退失败，未降低规则
或刷新无关 baseline。文件保持 `review`，不因局部全绿直接关闭。
