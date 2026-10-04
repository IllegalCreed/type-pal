# TEST-GLM-REFORGE-RUNTIME-SESSION-1 — runtime input and frame-session contracts

Status: build
Owner: GLM
Reviewer: Codex（独立验收）
Phase: phase2
Capability: reforge / runtime session
Branch: `codex/glm-reforge-runtime-session-r1`
Visual Verification Timing: dev-functional

## 目标

核验 Reforge runtime input、frame session 和 project-view 边界的真实公开合同，覆盖输入仲裁、帧推进、取消和 world-view 替换；不以覆盖率或例数作为本卡指标。

## 独占范围

只允许新增 `packages/reforge` 本卡测试、typed fixture 和证据：

- `runtime-input-router.ts`：忙时输入锁、重复/迟到输入、取消后输入丢弃、合法输入的唯一提交；
- `runtime-frame-session.ts`：frame tick、暂停/恢复、完成/取消、迟到回执和重入不重复执行；
- `runtime-project-view.ts` / `world-motion-runtime.ts`：公开 view snapshot、实体离场、scene token 失效和恢复；
- 只走现有公开 coordinator/runner caller，不触碰 private state 或 debug 观察口。

先对照现有 `runtime-input-router.test.ts`、`runtime-frame-session.test.ts`、`runtime-project-view*.test.ts`、`world-motion-runtime*.test.ts` 和已归档 Reforge host-lifecycle 卡排重。

## 硬约束与交付

- 每条合同记录 source:line、公开 caller、合法 typed 输入、业务 oracle、唯一 fullName。
- 禁止修改产品、旧测、配置、baseline、真实数据；禁止私有反射、业务核心 mock、强转、skip、ignore、扩大 timeout。
- 反控必须原始绿→指定业务红→恢复绿，保存 raw/JSON/exit/执行集/四态 hash、clean-tree 和 mkdtemp 清理证明。
- 交付 identity/family ledger、existing-proof/blocked 账、定向/相邻/typecheck/lint/docs/diff 结果；覆盖率只进入整体 main 账。

## 当前模式推进记录

- Codex 范围/前提核验: verified
- Coding Owner / 隔离分支: GLM / `codex/glm-reforge-runtime-session-r1`
- build 准入: Codex build allowed
- Codex 独立验收: pending
- done 准入: blocked

## 下一位 Agent 提示词

```text
你是 TEST-GLM-REFORGE-RUNTIME-SESSION-1 的 Coding Owner（GLM）。
先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡及已归档 Reforge host-lifecycle 卡。
在 codex/glm-reforge-runtime-session-r1 隔离工作树中，对 runtime-input-router.ts、runtime-frame-session.ts、runtime-project-view.ts、world-motion-runtime.ts 逐合同排重旧测试和 caller，再实现未证明的输入/帧/取消/替换合同。
只写本卡白名单测试、合法 fixture、证据；不得改产品、旧测、配置、baseline、真实 PAL 数据、private state 或 __rf* debug 口。
反控必须原始绿→指定业务红→恢复绿，保存完整 raw/JSON/exit/执行集/四态 hash/清理证明。
交付定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check 和完整 SHA。
覆盖率与测试数量不是本卡完成条件；不得标 done，等待 Codex 独立验收。
```
