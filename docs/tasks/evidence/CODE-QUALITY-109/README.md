# CODE-QUALITY-109 evidence — analytics installation lifecycle

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本批复核 analytics 安装器与唯一 main caller,只修测试安装实例的 teardown ownership;生产实现、隐私策略、GA URL/consent 行为保持不变（Status current review,Owner Codex,2026-10-17）。

## 来源与输入

[codex-current-review.md](codex-current-review.md) 为完整读取范围、caller/oracle、缺口和修复边界正文;[before.txt](before.txt) 为修复前按 game 包 jsdom runner 的 6/23 回归;[targeted.txt](targeted.txt) 为修复后相同 runner 的 6/23 回归;[typecheck.txt](typecheck.txt) 为 game typecheck。

## 断言与业务 oracle

teardown oracle=保存 installation 并 afterEach 统一 destroy;DNT/GPC、disposer 组装等业务断言保持。

## 结果

[incorrect-root-runner.txt](incorrect-root-runner.txt) 为错误从仓库根调用 Vitest 的失败记录,仅说明 runner scope,不计产品失败。全仓 `pnpm check` exit 0（editor 631/4943,lint 4962 零诊断）;check:docs、ledger、git diff --check 通过;official coverage ratchet/protected fast 仍因 shared/pal-extract/total baseline 回退失败,未降低规则或刷新无关 baseline。

## 限制与复核

文件保持 review,不因局部全绿直接关闭。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1167B / SHA-256 c46c9b1c47b1eff964031eba0c0ea887015540eb46b9e6417540c5e0d0261ebd；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
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
```
<!-- incremental-original-source:end -->
