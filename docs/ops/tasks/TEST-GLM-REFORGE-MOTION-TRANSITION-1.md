# TEST-GLM-REFORGE-MOTION-TRANSITION-1 — motion, scene transition and input lifecycle audit

Status: build
Phase: phase2
Capability: reforge / motion, scene transition and runtime input lifecycle
Coding Owner: GLM
Reviewer: Codex（独立验收）
Contributor: GLM
Branch: `codex/glm-reforge-motion-transition-r1`
Visual Verification Timing: dev-functional

## 目标

审计 Reforge 世界运行时剩余的公开 motion/scene/input 生命周期分支，重点核验多实体 reservation 冲突、公平排序、地形扫描、动态绕行、scene transition commit/abort、输入锁/取消与公开恢复结果。只补真实新业务合同；已由 world-lifecycle、host/runtime-session、battle、asset/audio 卡证明的轴只登记。

## 范围

- 范围内：`packages/reforge/src/entity-motion.ts`、`world-motion-runtime.ts`、`collision.ts`、`scene-transition.ts`、`scene-switch-transaction.ts`、`scene-entry-session.ts`、`runtime-input-router.ts`、`async-intent.ts` 的公开 caller/host flow；必要时使用 `main.scene-flows.test.ts`、`main.entity-host-flows.test.ts` 的真实 fixture。
- 优先审计分支：motion candidate/terrain sweep/reservation conflict/side-stick/fairness、scene transition 的 success/failure/abort/old-world isolation、input router 的 lock/release/latest intent；具体新增以 fullName ledger 为准。
- 范围外：已归档 `TEST-GLM-REFORGE-WORLD-LIFECYCLE-1` 的 DeferredTouchTrigger/AsyncIntent capture/GameplayClock 四针、battle-flow、asset resolver、audio lifecycle、UI/视觉与剧情 E2E。
- 不改产品/schema/API/旧测/config/baseline/真实 projects/pal；禁止私有 state、`__rf*`、核心 mock、强转、skip、ignore、扩 timeout、非法 entity/world backdoor。

## 验收条件

- 先建立 motion/transition/input 的 source:line×公开 caller×合法 typed 输入×业务 oracle×fullName ledger；重复、无业务 oracle、非法输入分别登记 existing-proof/unreachable/blocked。
- 新合同必须断言公开 plan/commit/abort、实体最终位置/owner、场景切换后的可继续运行、输入锁释放或取消结果；不能只断言坐标数组/调用次数/私有可视状态。
- 反控为绿→指定业务红→恢复绿，恰一业务 AssertionError，保留 JSON/raw/exit/执行集/源/变异/恢复 hash 与 mkdtemp/finally 清理证明。
- 定向/相邻 Reforge 测试、typecheck、lint 0/0/0、docs、`git diff --check` 通过；不设例数或覆盖率门槛。审计后若无合法新合同，提交饱和档案，不堆弱测。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-REFORGE-MOTION-TRANSITION-1 的 Coding Owner（GLM）。先读 AGENTS.md、docs/phase2/READ-FIRST.md、docs/phase2/reference/phase1-knowledge-harvest.md、本卡，以及已归档 TEST-GLM-REFORGE-WORLD-LIFECYCLE-1、HOST-LIFECYCLE、RUNTIME-SESSION、BATTLE-FLOW、ASSET-RESOLVER、AUDIO-LIFECYCLE 卡。
只在 codex/glm-reforge-motion-transition-r1 工作。先对 entity-motion.ts、world-motion-runtime.ts、collision.ts、scene-transition.ts、scene-switch-transaction.ts、scene-entry-session.ts、runtime-input-router.ts、async-intent.ts 的公开 caller/合法输入/business oracle/fullName 排重。
重点审计 reservation/terrain/fairness、scene commit-abort-old-world isolation、input lock/latest intent；不要重复 world-lifecycle 已闭合的四针，也不要写 battle/asset/audio/UI/剧情合同。
只写本卡测试、合法 typed fixture、证据和回执；禁止改产品/schema/API/旧测/config/baseline/真实数据、私有 state/__rf*、核心 mock、强转、skip、ignore、扩 timeout 或非法 backdoor。新增反控必须绿→指定业务红→恢复绿、恰一 AssertionError、完整执行集/hash/清理证明；无新合同就交 existing-proof/unreachable 饱和档案。
交付定向/相邻 test、typecheck、lint 0/0/0、docs、git diff --check 和完整 SHA。覆盖率/例数不是完成条件，不得标 done，等待 Codex 独立验收。
```
