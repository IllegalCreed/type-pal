# TEST-GLM-GAME-SHELL-BOOTSTRAP-1 — shell bootstrap and resource boundary audit

Status: done
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

## GLM r1 交付回执（2026-10-06）

- 候选提交：`acb1f6d607d8a41efb8cfde8aef17d34597a27cd`（分支 `codex/glm-game-shell-bootstrap-r1`，
  基 origin/main `cb12a63e2`；工作树 `/private/tmp/type-pal-shell-bootstrap`）。
- 交付：`packages/game/src/shell/shell-bootstrap.glm-shell.test.ts`（6 合同：SB1 胜利结算曲覆盖
  bootstrap.ts:191-198 / SB2 揭场 introFade 静默+战斗曲循环 :192-199 / SB3 战斗帧 bus SFX
  drain+explore 不消费 :202-213 / SB4 SW 消息路由 precache-client.ts:67-72 / SB5 storage.persist
  失败容忍 :74-79 / SB6 startRafLoop 帧链自续订+cancel 停链 main-loop.ts:173-180）。
  证据：[ops/evidence/TEST-GLM-GAME-SHELL-BOOTSTRAP-1/](../../../evidence/TEST-GLM-GAME-SHELL-BOOTSTRAP-1/README.md)
  （排重账含逐文件 existing-proof 饱和/unreachable/U 账；identity 6/6；反控 6/6 VALID，
  每针红相位 failed 恰 1 且为业务 AssertionError、恢复逐字节、恢复绿 identity 等于原始绿）。
- 排重结论：fetch-retry / boot-loading / bootstrap-resources / precache-ui / input 五文件 existing-proof
  饱和零新增；main-loop 除 SB6 外饱和；bootstrap() 本体 unreachable-in-vitest（Wave I 同结论）。
- U 账：U-1 `swc.ready` 拒绝悬空 rejection（precache-client.ts:83 + main.ts:49 `void` 未 catch，
  register 失败走 onUnavailable 而.ready 拒绝不走——不对称），留 Codex 裁决是否开产品卡；本卡不改产品。
- 质量门：定向 6/6；相邻 shell 全目录 39 文件 258/258；game 全量 309 文件 3512/3512；
  game typecheck 0 错；根 lint 0/0/0（3463 文件）；`pnpm check:docs` 全链过（含 content-review
  pin 机械刷新：evidence/README 为本卡编辑，board.md/tasks/index.md 两处为 main 既有 drift 一并
  按 8494b465c 判例外科刷新，语义结论未动）；`git diff <base>..HEAD --check` 零 whitespace 问题。
- 工作树：`/private/tmp/type-pal-shell-bootstrap`（分支 codex/glm-game-shell-bootstrap-r1，
  基 origin/main cb12a63e2）；产品/旧测/config/真实数据零改动（git status 仅新测试+证据+索引行）。
  worktree 环境注记：根 `data/extracted`、`data/raw/*`、`packages/game/public/extracted` 三处软链
  补齐后全量方绿（dev-panel.test 直读 data/extracted）。
- Status 维持 `build`→`review` 转换由 Codex 独立验收决定；覆盖率/例数未作门槛。

## Codex 独立验收与收口（2026-10-06）

- 独立复跑：定向 6/6；strict shell counterproof 6/6 VALID，MUT-01~06 均精确命中业务合同。
- 独立质量门：Game typecheck、docs、git diff --check 通过；集成全仓 lint 3469 files、0/0/0。
- U-1 `swc.ready` reject 未处理登记为产品观察，未夹带修复；结论：合入 main，任务归档为 done。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-GAME-SHELL-BOOTSTRAP-1 的 Coding Owner（GLM）。先读 AGENTS.md、CLAUDE.md、docs/phase1/engineering-notes.md、本卡、所有 bootstrap/boot-loading/fetch-retry/precache/main-loop/input 旧测和归档 shell 卡。
只在 codex/glm-game-shell-bootstrap-r1 工作；先做 shell source:line×公开caller×合法输入×业务oracle×fullName 排重，重点审计 bootstrap 装配、资源失败/重试、loading gate、precache 取消恢复、主循环和输入 listener 生命周期。
不得重复 event/battle/menu-save 合同，不跑剧情 E2E，不改产品/旧测/config/baseline/真实数据，不用私有 globals、核心 mock、强转、skip、ignore、扩 timeout。无合法新合同就交 existing-proof/unreachable 饱和档案。
新增反控必须严格三态、恰一业务 AssertionError、完整执行集/hash/清理证明；交付 test、typecheck、lint 0/0/0、docs、diff 和完整 SHA。覆盖率/例数不是完成条件，不得标 done。
```
