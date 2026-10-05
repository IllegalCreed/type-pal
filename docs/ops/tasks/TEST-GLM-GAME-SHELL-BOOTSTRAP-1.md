# TEST-GLM-GAME-SHELL-BOOTSTRAP-1 — shell bootstrap and resource boundary audit

Status: build
Phase: phase1
Capability: game / shell bootstrap, loading and resource failure boundaries
Coding Owner: GLM
Reviewer: Codex（独立验收）
Contributor: GLM
Branch: `codex/glm-game-shell-bootstrap-r1`
Visual Verification Timing: dev-functional

## 目标

审计 Game shell 启动与资源加载仍未证明的公开业务边界：bootstrap 装配、资源缺失/重试、loading gate、precache UI、输入与主循环启动/停止。只证明公开启动结果、错误恢复和清理，不用浏览器剧情或私有全局状态堆覆盖。

## 范围

- `packages/game/src/shell/bootstrap.ts`、`bootstrap-resources.ts`、`boot-loading.ts`、`fetch-retry.ts`、`precache-client.ts`、`precache-ui.ts`、`main-loop.ts`、`input.ts` 的公开 caller/host flow。
- 先排重 `bootstrap*.test.ts`、`boot-loading*.test.ts`、`fetch-retry*.test.ts`、`precache*.test.ts`、`main-loop*.test.ts`、`input*.test.ts` 和已归档 shell 卡。
- 重点审计：资源成功/缺失/重试耗尽、loading 状态锁、启动失败清理、precache 取消/恢复、主循环 start/stop 与输入 listener 生命周期。
- 不重复 event/battle/menu-save 卡，不跑剧情 E2E，不改产品/旧测/config/baseline/真实资源，禁止私有 globals、核心 mock、强转、skip/ignore/扩 timeout。

## 验收条件

- source:line × public caller × legal input × business oracle × fullName ledger，明确 existing-proof/unreachable/blocked/product-counter。
- 新合同必须断言公开 loading/error/retry/cleanup/loop/input 结果，不只断言函数被调用。
- 反控严格绿→指定业务红→恢复绿，恰一 AssertionError，完整 JSON/raw/exit/signal/spawn、identity、hash、临时树清理。
- 定向/相邻/Game shell 全量、typecheck、lint 0/0/0、docs、diff 通过；覆盖率/数量不是单卡门槛。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-GAME-SHELL-BOOTSTRAP-1 的 Coding Owner（GLM）。先读 AGENTS.md、CLAUDE.md、docs/phase1/engineering-notes.md、本卡、所有 bootstrap/boot-loading/fetch-retry/precache/main-loop/input 旧测和归档 shell 卡。
只在 codex/glm-game-shell-bootstrap-r1 工作；先做 shell source:line×公开caller×合法输入×业务oracle×fullName 排重，重点审计 bootstrap 装配、资源失败/重试、loading gate、precache 取消恢复、主循环和输入 listener 生命周期。
不得重复 event/battle/menu-save 合同，不跑剧情 E2E，不改产品/旧测/config/baseline/真实数据，不用私有 globals、核心 mock、强转、skip、ignore、扩 timeout。无合法新合同就交 existing-proof/unreachable 饱和档案。
新增反控必须严格三态、恰一业务 AssertionError、完整执行集/hash/清理证明；交付 test、typecheck、lint 0/0/0、docs、diff 和完整 SHA。覆盖率/例数不是完成条件，不得标 done。
```
