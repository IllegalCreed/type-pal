# TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1 — main host orchestration boundary audit

Status: build
Phase: phase2
Capability: reforge / main host orchestration and public flow boundaries
Coding Owner: GLM
Reviewer: Codex（独立验收）
Contributor: GLM
Branch: `codex/glm-reforge-main-host-boundaries-r1`
Visual Verification Timing: dev-functional

## 目标

审计 Reforge `main.ts` 仍未证明的公开宿主编排分支，覆盖场景进入/离开、script runner、save/readback、world mutation、battle trial 入口、错误恢复与资源清理。只测试 public host orchestration，不把 main 文件的私有状态或视觉分支当业务 oracle。

## 范围

- `packages/reforge/src/main.ts` 及其公开 host caller；相邻 `runtime-frame-session.ts`、`runtime-input-router.ts`、`scene-entry-session.ts`、`world-async-commit.ts` 仅在 main 的真实组合流缺口处纳入。
- 先排重 HOST-LIFECYCLE、RUNTIME-SESSION、WORLD-LIFECYCLE、MOTION-TRANSITION、BATTLE-CORE/SESSION、scene/main 旧测与所有 `main.*.test.ts`。
- 重点审计：host 初始化/重入、场景切换成功失败、script continuation/abort、save/readback 完成与失败、world mutation 所有权、battle trial 公开 done/error、清理与 stale async 回执。
- 不重复已收口 battle finalization/motion/asset/audio 合同，不改产品/schema/API/旧测/config/baseline/真实数据，禁止 `__rf*`、私有 state/visual、核心 mock、强转、skip/ignore/扩 timeout。

## 验收条件

- 建立 main orchestration family ledger，逐合同 source/caller/legal input/oracle/fullName，existing-proof/unreachable/blocked 分列。
- 新合同必须观察公开 host result、world/session/资源所有权、done/error/cancel 或清理结果；调用次数仅辅助。
- 反控严格绿→业务红→恢复绿，完整 file×fullName identity、恰一 AssertionError、exit/signal/spawn、三态 hash、mkdtemp 清理。
- 定向/相邻/Reforge 全量、typecheck、lint 0/0/0、docs、diff 通过；不设覆盖率/例数门槛。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1 的 Coding Owner（GLM）。先读 AGENTS.md、docs/phase2/READ-FIRST.md、phase1-knowledge-harvest、本卡和 HOST-LIFECYCLE、RUNTIME-SESSION、WORLD-LIFECYCLE、MOTION-TRANSITION、BATTLE-CORE/SESSION 归档卡。
只在 codex/glm-reforge-main-host-boundaries-r1 工作；先对 main.ts 及 runtime-frame-session/runtime-input-router/scene-entry-session/world-async-commit 的真实组合 caller 做 fullName×legal input×oracle 排重。
重点审计 scene enter/leave、script continuation/abort、save/readback、world mutation、battle trial public done/error、stale async 与 cleanup；不得重复已收口合同或读取私有 state/visual/__rf*。
只写本卡测试、合法 fixture、证据和回执；禁止产品/schema/API/旧测/config/baseline/真实数据、核心 mock、强转、skip、ignore、扩 timeout。反控必须严格三态、完整 identity/hash/清理证明；无新合同就交饱和档案。
交付定向/相邻 test、typecheck、lint 0/0/0、docs、diff 和完整 SHA。覆盖率/例数不是完成条件，不得标 done。
```
