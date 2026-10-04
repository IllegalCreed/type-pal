# TEST-GLM-REFORGE-HOST-LIFECYCLE-1 — startup and continuation lifecycle contracts

Status: build
Owner: GLM
Reviewer: Codex（独立验收）
Phase: phase2
Capability: reforge / host lifecycle
Branch: `codex/glm-reforge-host-lifecycle-r1`
Visual Verification Timing: mixed

## 目标

核验 Reforge 真实公开启动与异步宿主生命周期中的取消、替换、恢复和错误边界；不新增产品观察口，不把分支数量或覆盖率作为本卡指标。

## 独占范围

只允许新增 `packages/reforge` 本卡专属测试、必要 typed fixture 和本卡证据。候选合同集中在：

- `src/main.ts:477-600`：视频/过场 promise 的 signal 取消、完成/错误只结算一次、取消不向宿主泄漏；
- `src/main.ts:914-942`：切场景期间 world replacement、音乐计划和失败/取消清理；
- `src/main.ts:2090-2184`：存档入口选择、缺失槽/未知入口、reveal/fade 失败与恢复路径；
- `src/script-runner-core.ts` 的 continuation cursor 与 `src/script-runner.ts` 的公开 `run` caller：已完成叶、取消、后台错误和重新进入不得重复执行；
- `src/script-host-adapter.ts` 的 signal/能力缺席分支：只用公开 `executeScriptHostEffect` 和真实 `ScriptHost` 扩展点。

先对照已归档 `TEST-COVERAGE85-GLM-REFORGE-1` 及全量旧 fullName 排重；battle-session private state 和任何 `__rf*` debug 口不在本卡范围。

## 硬约束

- 仅公开 boot/runner/adapter caller；不得反射 private state、注入产品接口、伪造世界后门或用业务核心 mock。
- 每条合同必须有合法 typed 输入、精确业务 oracle、唯一 fullName、错误/取消后的可观察状态；单纯 `toHaveBeenCalled` 不算。
- 反控必须保留原始/变异/恢复三态、唯一业务 AssertionError、执行集、四态 hash、clean-tree 和 mkdtemp 清理证明。
- 禁止 `as unknown as`、`as never`、`@ts-expect-error`、skip、ignore 和扩大 timeout。

## 验证与交付

交付逐合同 ledger、fresh identity JSON、源 hash、反控 raw/JSON/exit/执行集、existing-proof/blocked 说明和定向/相邻/typecheck/lint/docs/diff 结果。测试质量和独立性是通过条件；覆盖率只进入整体 main 的汇总记录。

## 当前模式推进记录

- Codex 范围/前提核验: verified（基于当前 main 与已归档 Reforge 卡排重）
- Coding Owner / 隔离分支: GLM / `codex/glm-reforge-host-lifecycle-r1`
- build 准入: Codex build allowed（仅上述 lifecycle 合同）
- Codex 独立验收: pending
- done 准入: blocked，须先完成独立验收

## 下一位 Agent 提示词

```text
你是 TEST-GLM-REFORGE-HOST-LIFECYCLE-1 的 Coding Owner（GLM）。
先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡，以及已归档
docs/ops/archive/tasks/done/TEST-COVERAGE85-GLM-REFORGE-1.md。
只在分支 codex/glm-reforge-host-lifecycle-r1 的隔离工作树中工作。
先对 packages/reforge/src/main.ts:477-600、914-942、2090-2184、script-runner-core.ts、script-runner.ts、script-host-adapter.ts
做旧 fullName/公开 caller/合法输入/业务 oracle 排重，再只实现仍未证明的生命周期合同。
不得改产品、旧测、配置、baseline、真实 PAL 数据、battle-session private state 或共享文档；不得使用 __rf*、强转、skip、ignore、扩大 timeout 或业务核心 mock。
反控必须是原始绿→指定业务红→恢复绿，保存完整 raw/JSON/exit/执行集/三态或四态 hash/清理证明；取消、signal、spawn、runtime/collection 错误要单独判定。
交付时跑定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check，提交完整 SHA。
输出 accept 或 counter；不得把覆盖率百分比或测试数量当完成条件，不得标 done，等待 Codex 独立验收。
```
