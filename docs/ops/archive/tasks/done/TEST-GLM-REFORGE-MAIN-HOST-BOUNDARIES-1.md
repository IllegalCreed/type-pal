# TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1 — main host orchestration boundary audit

Status: done
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: task-card-v1 / 1.0.0

本页把已关闭 ops archive task card 接入 `task-card-v1`，并追加 `archive-record-v1` 历史边界。原始目标、范围、状态、owner、证据、counter、日期、链接和交接在 quote 中保全；历史 done 不自动授权当前 build、runtime、E2E、视觉或 coverage。

## 目标

- 保留原卡目标、用户可见范围、实现/测试边界和关闭时点结论；当前是否需要重新启用由 successor task card 与 fresh evidence 决定。

## 范围

- 当前包含：原卡声明的实现、测试、证据、owner、状态和历史限制。
- 明确不包含：本次迁移不修改产品源码、旧测试、真实数据、机器证据或历史状态。

## 前提与证据

- 行为/工程前提：原卡的 source:line、primary source、合法输入、caller、oracle 与 counter 由 quote 保留。
- 一手证据：固定 source revision `b3c24c04ddb534b9e8195a074590bea8a233fc93`、原卡全文和原卡链接；本次不重跑原执行。
- 最强替代解释与可证伪观察：若需要重新启用，必须用当前代码/数据、合法输入、业务 oracle、反例和独立 review 重新核验；不能以历史 done 或数量补齐。
- 当前状态：done（历史快照）；本页治理检查口径要求 contentVersion=22 / SAVE12，源卡中的较早版本只属于其日期范围。

## 验收

- 功能/文档：原卡的历史验收、失败、blocked、rework、未执行边界和交接保持原样。
- 测试与证据：本次验收只包括 source/after SHA、模板章节、链接、history overlay 和 quote inverse。
- 视觉或 E2E（如适用）：本次未执行 runtime、E2E、视觉或 coverage，信用为 0。

## 状态与交接

- 当前 Owner：原任务 Owner/贡献者与历史 reviewer 保留于 quote；当前文档治理 owner 为 Codex。
- 阻塞/决策：历史卡不可单独授权当前工作；重新启用必须创建/更新当前 task card。
- 下一步：由对应 successor、当前 consumer 和 fresh receipt 重新核验；本次不推进状态。

## 历史范围

- 原始日期、版本、阶段：源文档固定于 `b3c24c04ddb534b9e8195a074590bea8a233fc93`；本轮为 R59。
- 归档原因：已关闭任务只作为时点事实保留，避免历史状态冒充当前事实。

## 原始结论

- TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1 — main host orchestration boundary audit：原始顶部状态为 done；完整原始语义保留于下方 quote。

## 当时证据

- 原始命令、产物、SHA、签字、counter、链接和未决项保留于 quote。

## 当前有效性

historical。do not promote historical task card to current build/runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：当前 task card、代码/consumer 和 fresh receipt 是事实权。

## 继任文档

- 当前 canonical 文档：当前任务卡、当前代码/consumer 和 fresh receipt。
- supersedes / superseded-by：替代 governed-legacy 的未分层呈现；原卡内容不删除。
- 若重新启用的复核条件：合法输入重跑、业务 oracle 可证伪、独立 review 和全量静态门通过。

## 原文保全

固定 source revision `b3c24c04ddb534b9e8195a074590bea8a233fc93`，source SHA `cf2cf58b16533a43aa580c15c543f2c1316e8190b019f247f642e6de90b911d2`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1 — main host orchestration boundary audit
>
> Status: done
> Phase: phase2
> Capability: reforge / main host orchestration and public flow boundaries
> Coding Owner: GLM
> Reviewer: Codex（独立验收）
> Contributor: GLM
> Branch: `codex/glm-reforge-main-host-boundaries-r1`
> Visual Verification Timing: dev-functional
>
> ## 目标
>
> 审计 Reforge `main.ts` 仍未证明的公开宿主编排分支，覆盖场景进入/离开、script runner、save/readback、world mutation、battle trial 入口、错误恢复与资源清理。只测试 public host orchestration，不把 main 文件的私有状态或视觉分支当业务 oracle。
>
> ## 范围
>
> - `packages/reforge/src/main.ts` 及其公开 host caller；相邻 `runtime-frame-session.ts`、`runtime-input-router.ts`、`scene-entry-session.ts`、`world-async-commit.ts` 仅在 main 的真实组合流缺口处纳入。
> - 先排重 HOST-LIFECYCLE、RUNTIME-SESSION、WORLD-LIFECYCLE、MOTION-TRANSITION、BATTLE-CORE/SESSION、scene/main 旧测与所有 `main.*.test.ts`。
> - 重点审计：host 初始化/重入、场景切换成功失败、script continuation/abort、save/readback 完成与失败、world mutation 所有权、battle trial 公开 done/error、清理与 stale async 回执。
> - 不重复已收口 battle finalization/motion/asset/audio 合同，不改产品/schema/API/旧测/config/baseline/真实数据，禁止 `__rf*`、私有 state/visual、核心 mock、强转、skip/ignore/扩 timeout。
>
> ## 验收条件
>
> - 建立 main orchestration family ledger，逐合同 source/caller/legal input/oracle/fullName，existing-proof/unreachable/blocked 分列。
> - 新合同必须观察公开 host result、world/session/资源所有权、done/error/cancel 或清理结果；调用次数仅辅助。
> - 反控严格绿→业务红→恢复绿，完整 file×fullName identity、恰一 AssertionError、exit/signal/spawn、三态 hash、mkdtemp 清理。
> - 定向/相邻/Reforge 全量、typecheck、lint 0/0/0、docs、diff 通过；不设覆盖率/例数门槛。
>
> ## GLM 交付回执（r1，2026-10-06，待 Codex 独立验收）
>
> - 分支/基线：`codex/glm-reforge-main-host-boundaries-r1`，基 `origin/main` `cb12a63e2`；
>   产品/schema/API/旧测/config/baseline/真实数据零改动（diff 仅本卡测试/脚本/证据/卡面/证据导航行）。
> - **排重结论**（[dedup-ledger.md](../../../evidence/TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1/dedup-ledger.md)）：
>   main orchestration 全域逐轴对账——host 初始化/重入、场景切换成功失败（debug 键族）、
>   存档成功链、world mutation 所有权、stale async 主轴均 existing-proof（HOST-LIFECYCLE/H5/H6/
>   H9 族、world-async-commit、motion-transition 等）；四相邻模块 module 级饱和不重开。仅补 5 条
>   真实未证合同（`main.host-boundaries-1.test.ts`）：
>   - **MHB-ENTRY-REVEAL-1**：loadScene 进入带 fade entry 契约的目标——入场事务持有旧帧 fade-out
>     至全黑（fade 峰值 ≥0.999）、`s:<target>` onEnter 经 runSceneEntry 显式 fade-in 收口（终态 0）、
>     揭幕后正文才入账（50→59）。
>   - **MHB-SCRIPT-ERR-1**：实体触发脚本运行期 IO 失败——公开 `脚本错误: Error: content/maps/b.json…`
>     回执、runner 槽同步释放、世界/场景/幕布零残留（world 深比较）、修复外部源后同一公开交互入口
>     重试成功（main.ts:4501-4536 catch/finally 全链零覆盖的残余臂）。
>   - **MHB-TRIAL-DONE-1**：`?battle=` 试打开场——跳过入口 onEnter（money=50 非 55）、真实战斗经
>     公开宿主启动并打完、终局 `试打结束:victory` 回执、结算 cash 7 恰一次入账（=57）。
>   - **MHB-TRIAL-ERROR-1**：`?battle=` 非法敌队——`试打失败:…敌队没有有效敌人` 公开回执、零战斗
>     会话、宿主保持可操作（Escape 开菜单）、世界不变。
>   - **MHB-SAVE-FAIL-1**：F5 缩略图外部 canvas IO 失败——`存档失败` 回执、失败不消费 wSavedTimes
>     （槽未写）、写队列不毒化（修复后重试成功且 savedTimes=1 非 2）。
> - **产品缺陷披露 D-1（不修产品，交裁决）**：`?battle-scene=` 遭遇演出接线死路——试打 walk
>   （main.ts:5862）消费 `getSceneDef` 投影，而 `projectRuntimeHookBinding`（runtime-project-view.ts:97-111）
>   把 onEnter 段 body 无条件投影为 `[]`，walk 永远找不到 startBattle 命令；调试靴实证遭遇台词零呈现。
>   本卡白名单不含 main.ts，未越界修复。
> - **反控 5/5 PASS**（mt1 r2 严格口径，counterproof.json + counterproof-raw/ identity TSV）：
>   全量执行集（8778 测试/778 文件，identity 集合 sha256 `fb7c2a9a…`）逐相位落盘；每针红相位
>   exit 1、恰 1 指定业务 AssertionError、fullName 精确相等、零 pending/todo/collection-error；
>   恢复绿与 final-replay identity 集合 sha256 与 baseline 一致；四态源 hash/argv/env/mkdtemp
>   finally 全记；runner 自测 11 例先行；尾步 biome format 回执。再生：
>   `node packages/reforge/scripts/mhb1-mutation-counterproof.mjs`。换针披露：MHB-SAVE-FAIL 首选
>   「写队列毒化」变异会连带打红 checkpoint-export.chain 两条既有合同（共享写序/计数面，3 failed
>   不满足恰一红），预核本卡测试同变异下业务红后，正式针换为独占的 `存档失败` 回执移除。
> - **门**：定向 5/5；相邻 49 文件 300/300；Reforge 全量 8778/8778；typecheck exit 0；全仓 lint
>   3462 文件 0/0/0；`git diff --check` 干净；docs check PASS（0 issues）。raw 见
>   [gates/](../../../evidence/TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1/gates/)。
>   覆盖率/例数未设门槛；不标 done，等待 Codex 独立验收。
>
> ## 下一位 Agent 提示词（Codex 独立验收）
>
> ```text
> 你是 TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1 的独立验收方（Codex）。先读本卡「GLM 交付回执
> （r1）」节与 docs/ops/evidence/TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1/（README/dedup-ledger/
> counterproof.json + counterproof-raw/ + gates/）。候选分支 codex/glm-reforge-main-host-boundaries-r1
> （基 origin/main cb12a63e2，产品零 diff）。重点复核：
> 1) 排重裁决抽查：MHB-ENTRY-REVEAL-1 与 frame-animation-owner「scene commit 清 cinematic」的
>    caller/oracle 区分是否成立（本卡是 entry 契约链：sceneEntrySession.begin→fade-out→提交→
>    runSceneEntry 揭幕→正文）；MHB-TRIAL 族与 H9（__reforge.startBattle dev 口）的边界；
>    MHB-SAVE-FAIL-1 与 H5 成功臂计数、checkpoint-export.chain 写序面的非重叠。
> 2) D-1 产品缺陷裁决：?battle-scene= walk 消费 getSceneDef 投影而投影 body 恒空
>    （main.ts:5862 + runtime-project-view.ts:97-111/163-173），choreography 永不接线——
>    确认缺陷归属并决定修复卡（测试卡未越界修产品）。
> 3) 反控复跑：node packages/reforge/scripts/mhb1-mutation-counterproof.mjs（应 5/5 PASS、
>    回执再生后 biome 尾步格式化与落盘一致）；核对 identity TSV 执行集、四态 hash、自测 11 例、
>    mkdtemp 清理；换针披露（写队列毒化针 3 红连带既有合同）是否可接受。
> 4) 门禁复跑：定向 1 文件 5/5、相邻 49 文件 300/300、全量 reforge 8778/8778、
>    pnpm --filter @type-pal/reforge run typecheck、pnpm lint、node scripts/docs/check.mjs、
>    git diff --check。
> 裁决 accept/counter/rework；未验收前不合 main、不标 done。
> ```
>
> ## Codex 独立验收与收口（2026-10-06）
>
> - 独立复跑：定向 5/5；strict MHB counterproof 5/5 PASS，11 个 selftest 反例全部通过。
> - 独立质量门：Reforge typecheck、docs、git diff --check 通过；集成全仓 lint 3469 files、0/0/0。
> - D-1 `?battle-scene=` 投影死路缺陷保持披露，未夹带产品修复；结论：合入 main，任务归档为 done。
>
<!-- original-source-quote:end -->
