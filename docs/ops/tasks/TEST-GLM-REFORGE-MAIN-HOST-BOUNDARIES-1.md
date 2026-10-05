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

## GLM 交付回执（r1，2026-10-06，待 Codex 独立验收）

- 分支/基线：`codex/glm-reforge-main-host-boundaries-r1`，基 `origin/main` `cb12a63e2`；
  产品/schema/API/旧测/config/baseline/真实数据零改动（diff 仅本卡测试/脚本/证据/卡面/证据导航行）。
- **排重结论**（[dedup-ledger.md](../evidence/TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1/dedup-ledger.md)）：
  main orchestration 全域逐轴对账——host 初始化/重入、场景切换成功失败（debug 键族）、
  存档成功链、world mutation 所有权、stale async 主轴均 existing-proof（HOST-LIFECYCLE/H5/H6/
  H9 族、world-async-commit、motion-transition 等）；四相邻模块 module 级饱和不重开。仅补 5 条
  真实未证合同（`main.host-boundaries-1.test.ts`）：
  - **MHB-ENTRY-REVEAL-1**：loadScene 进入带 fade entry 契约的目标——入场事务持有旧帧 fade-out
    至全黑（fade 峰值 ≥0.999）、`s:<target>` onEnter 经 runSceneEntry 显式 fade-in 收口（终态 0）、
    揭幕后正文才入账（50→59）。
  - **MHB-SCRIPT-ERR-1**：实体触发脚本运行期 IO 失败——公开 `脚本错误: Error: content/maps/b.json…`
    回执、runner 槽同步释放、世界/场景/幕布零残留（world 深比较）、修复外部源后同一公开交互入口
    重试成功（main.ts:4501-4536 catch/finally 全链零覆盖的残余臂）。
  - **MHB-TRIAL-DONE-1**：`?battle=` 试打开场——跳过入口 onEnter（money=50 非 55）、真实战斗经
    公开宿主启动并打完、终局 `试打结束:victory` 回执、结算 cash 7 恰一次入账（=57）。
  - **MHB-TRIAL-ERROR-1**：`?battle=` 非法敌队——`试打失败:…敌队没有有效敌人` 公开回执、零战斗
    会话、宿主保持可操作（Escape 开菜单）、世界不变。
  - **MHB-SAVE-FAIL-1**：F5 缩略图外部 canvas IO 失败——`存档失败` 回执、失败不消费 wSavedTimes
    （槽未写）、写队列不毒化（修复后重试成功且 savedTimes=1 非 2）。
- **产品缺陷披露 D-1（不修产品，交裁决）**：`?battle-scene=` 遭遇演出接线死路——试打 walk
  （main.ts:5862）消费 `getSceneDef` 投影，而 `projectRuntimeHookBinding`（runtime-project-view.ts:97-111）
  把 onEnter 段 body 无条件投影为 `[]`，walk 永远找不到 startBattle 命令；调试靴实证遭遇台词零呈现。
  本卡白名单不含 main.ts，未越界修复。
- **反控 5/5 PASS**（mt1 r2 严格口径，counterproof.json + counterproof-raw/ identity TSV）：
  全量执行集（8778 测试）逐相位落盘；每针红相位 exit 1、恰 1 指定业务 AssertionError、fullName
  精确相等、零 pending/todo/collection-error；恢复绿与 final-replay identity 集合 sha256 与
  baseline 一致；四态源 hash/argv/env/mkdtemp finally 全记；runner 自测 11 例先行。再生：
  `node packages/reforge/scripts/mhb1-mutation-counterproof.mjs`。
- **门**：定向 5/5；相邻 49 文件 300/300；Reforge 全量 8778/8778；typecheck exit 0；全仓 lint
  3461 文件 0/0/0；`git diff --check` 干净；docs check 于 counterproof.json 落盘后复跑 PASS。
  覆盖率/例数未设门槛；不标 done，等待 Codex 独立验收。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1 的 Coding Owner（GLM）。先读 AGENTS.md、docs/phase2/READ-FIRST.md、phase1-knowledge-harvest、本卡和 HOST-LIFECYCLE、RUNTIME-SESSION、WORLD-LIFECYCLE、MOTION-TRANSITION、BATTLE-CORE/SESSION 归档卡。
只在 codex/glm-reforge-main-host-boundaries-r1 工作；先对 main.ts 及 runtime-frame-session/runtime-input-router/scene-entry-session/world-async-commit 的真实组合 caller 做 fullName×legal input×oracle 排重。
重点审计 scene enter/leave、script continuation/abort、save/readback、world mutation、battle trial public done/error、stale async 与 cleanup；不得重复已收口合同或读取私有 state/visual/__rf*。
只写本卡测试、合法 fixture、证据和回执；禁止产品/schema/API/旧测/config/baseline/真实数据、核心 mock、强转、skip、ignore、扩 timeout。反控必须严格三态、完整 identity/hash/清理证明；无新合同就交饱和档案。
交付定向/相邻 test、typecheck、lint 0/0/0、docs、diff 和完整 SHA。覆盖率/例数不是完成条件，不得标 done。
```
