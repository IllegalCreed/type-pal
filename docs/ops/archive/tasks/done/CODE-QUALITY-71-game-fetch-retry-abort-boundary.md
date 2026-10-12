# CODE-QUALITY-71 — game fetch retry abort boundary

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 game/shell
Visual Verification Timing: N/A（网络生命周期）

## 目标

逐文件核验 GET retry wrapper 的错误分类、AbortSignal 取消传播、backoff、HTTP 状态与 uninstall 生命周期；先写失败反例，修复后确保取消不被重试层吞掉。

## 范围

- `packages/game/src/shell/fetch-retry.ts`
- `packages/game/src/shell/fetch-retry.test.ts`
- `packages/game/src/shell/fetch-retry.glm-phase1-leaves.test.ts`

只读相邻 boundary oracle：`packages/game/src/shell/fetch-retry.boundaries.test.ts`（已闭合合同，不改本卡）；caller：`packages/game/src/main.ts`、bootstrap resource loaders；`CLAUDE.md` 网络资源纪律。

## 前提真值门

- 一句话行为 / 工程前提：仅 GET 的瞬时网络失败/502/503/504 可重试；AbortError 或已取消的 AbortSignal 必须立即向 caller 传播，不能继续发请求或等待 backoff。
- 原版/primary source：SDLPal 无 fetch retry；type-pal 网络层新增能力，N/A；当前实现注释与主测试定义状态码/方法 retry 合同。
- 当前实现：`fetch-retry.ts:35-66` catch 所有错误并进入 retry loop，未区分 AbortError/signal.aborted；现有 tests覆盖网络 reject、HTTP、POST、backoff、uninstall，但无 abort 反例。
- `before -> after`：取消错误可能被重试；after 仅对可重试网络失败继续，对 abort 立即抛出原错误。
- 最强替代解释 / 可证伪观察：若所有生产 caller永不传 signal、底层永不抛 AbortError，当前行为不可达；fetch 标准允许 RequestInit.signal，caller/未来资源取消路径必须保留取消语义。

## 验证

- 先写失败反例到 `fetch-retry.test.ts`：底层抛 `AbortError`，预期一次调用后直接拒绝；旧实现会调用 3 次。
- 失败反例先行并修复：AbortError 旧实现调用 3 次，修复后立即传播且调用 1 次。
- 3 个范围文件 18 tests、game 全包 3526、`pnpm check`、ratchet、protected fast、lint-zero、docs/content/ledger 全部通过；HTTP/method/backoff/uninstall 既有合同保持。
- 当前结论：accept/done；不改变 retry 次数、状态码白名单、公共 API 或非 GET 行为。

## 交接

- 2026-10-13 Codex：`fetch-retry.ts` catch 分类加入 AbortError/signal.aborted fail-fast；boundary test 既有 CODE-QUALITY-3h 记录保持；本卡 3 文件收口。账本收口为 `3266 / 319 closed / 8 review / 2937 pending`。
- 不改变 retry 次数、状态码白名单、公共 API 或非 GET 行为。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-71 game fetch retry abort boundary
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-71-game-fetch-retry-abort-boundary.md
当前状态：done，已归档；不得直接重用本卡作为新 build 授权
先读：本卡、AGENTS.md、CLAUDE.md、fetch-retry.ts/三份测试、main/bootstrap fetch callers
请做：若重开审计，复核 AbortError 失败反例与取消传播修复
输出：失败反例、修复 diff、caller/oracle 证据、测试结果；当前结论为 accept/done
```
