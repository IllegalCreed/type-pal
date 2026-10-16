# TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1 — runtime audio lifecycle contracts

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

- TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1 — runtime audio lifecycle contracts：原始顶部状态为 done；完整原始语义保留于下方 quote。

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

固定 source revision `b3c24c04ddb534b9e8195a074590bea8a233fc93`，source SHA `d5c591bb2ec888efc04bce888f8c30047eedf4a2ea2f7a3b0aa09dae51049cc2`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1 — runtime audio lifecycle contracts
>
> Status: done
> Owner: GLM
> Reviewer: Codex（独立验收）
> Phase: phase2
> Capability: reforge / audio lifecycle
> Branch: `codex/glm-reforge-audio-lifecycle-r1`
> Visual Verification Timing: dev-functional
>
> ## 目标与范围
>
> 核验 Reforge runtime 音频生命周期的公开合同；不与 Editor audio-ownership 卡重叠，也不以覆盖率/例数作为指标。范围限定于 `packages/reforge/src/audio/bgm.ts`、`audio/midi-preview.ts`、`audio/sfx.ts` 及其公开 runtime caller：播放接管、停止/替换、load/play 失败、AbortSignal、dispose、重复调用和资源清理。
>
> 先对照现有 audio/bgm、midi-preview、sfx、spessa runtime 测试和已归档 Reforge 卡排重；private audio state 只通过公开 observer/host oracle 验证。
>
> ## 硬约束与交付
>
> 只写本卡测试、合法 typed fixture 和证据；不得改产品、旧测、配置、baseline、真实 PAL 数据、私有反射、业务核心 mock、强转、skip、ignore、扩大 timeout。每条合同记录 source/caller/input/oracle/fullName；反控提供三态绿红绿、四态 hash、执行集、raw/JSON、clean-tree 和 mkdtemp 清理证明。交付 identity/family ledger、定向/相邻/typecheck/lint/docs/diff；覆盖率只记录到整体 main。
>
> ## r1 交付（GLM，2026-10-05，基 053ae5bb4）
>
> 排重结论：`bgm.test.ts`（stop 清账/fade 接管/K2a/K2b/K5/G2/G3c/K3/开关续播）、`bgm.runtime-boundaries.test.ts`（resume 并发去重+被拒重试、懒初始化/读取乱序串行门、读失败重试）、`bgm.dispose.test.ts`（dispose 幂等+迟到后端/读取不播）、`bgm.glm-n.test.ts`（静音工厂/init 失败降级/dispose 悬置）、`midi-preview.test.ts`（单曲 load/play/pause/stop/seek/自然完成/缓存复用）、`midi-preview.lifecycle-boundaries.test.ts`（A/B 逆序/同 key 去重/读失败与 init 失败重试/挂起 play 失效组合）、`midi-preview.play-guards.glm-n.test.ts`（读未完成 play 拒绝/dispose 后 load AbortError）、`sfx*.test.ts`、`audio-spessa-runtime.glm-q.test.ts` 之后，音频家族残留以下六条未覆盖合同，全部以公开注入 seam（`createBgmPlayerWithRuntime`/`createMidiPreviewTransport`/`collectScriptSoundAssets`）与合法输入驱动：
>
> identity/family ledger（source/caller/input/oracle/fullName）：
>
> | ID | source | 公开 caller | 合法输入 | 业务 oracle | fullName（文件 > 用例） |
> |---|---|---|---|---|---|
> | L1a | bgm.ts:266-278 resume 补播 | main.ts:305-312 每手势 resumeAudio | suspended ctx、autoplay 拒后手势解锁 | 解锁成功后重读+二次提交记账曲（loadNewSongList/play×2、ctx.resume 恰 2、字节身份一致） | bgm.glm-audio-lifecycle.test.ts > L1 autoplay 解锁补播 > 挂起 ctx 上 autoplay 被拒仍完成一次静默提交；手势 resume 成功 → 补播记账曲 |
> | L1b | 同上（负臂） | 同上 | stop 清账后解锁 | 无记账曲则零补播（play/load 不增） | 同文件 > L1 … > 负臂：stop 清账后手势解锁不补播 |
> | L2 | bgm.ts:214-229 play 同曲守卫 | battle-trial-host.ts:229-232/256-257 playMusic | running 且 playing 命中时重复 play 同曲 | 零重读/零重载/零重启，cancelFade+fadeTo(1,0)；stop 后再 play 真重载 | 同文件 > L2 同曲 steady-state 重复调用 > 运行中重复 play 同曲 |
> | L3 | bgm.ts:250-265 setEnabled 幂等 | main.ts:325-326 偏好回放 | 同值 setEnabled 连调 | 重复开不重启；重复关 pause/cancelFade 恰 1；重开补播 | 同文件 > L3 setEnabled 同值幂等 > 重复开不重启；重复关只停一次 |
> | L4 | midi-preview.ts:240-268 load 替换路径 | 编辑器试听换选（同 transport 合同） | 旧曲播放中 load 新曲（cachedActivity 合法参数） | 旧曲被停（两处 pause 防护整体）、b 字节真入 sequencer、快照归零换时长、play 从头 | midi-preview.glm-audio-lifecycle.test.ts > L4 播放中替换选择 > 旧曲播放中 load 新曲 |
> | L5 | midi-preview.ts:243-251 替换状态重置 | 同上 | 替换读取失败（failOnce 合法失败注入） | 精确拒绝、新曲未入 sequencer、旧曲已停、旧 activity/bytes 不顶替新选择（duration 回退 sequencer 兜底 99、play 拒'请等待'）；修复后重载开播 | 同文件 > L5 播放中替换读取失败 > 替换读取失败 |
> | L6 | sfx-readiness.ts:131-132 visit 入口 throwIfAborted | main.ts:669-676 prepareSceneSounds（经 collectScriptSoundAssets seam） | 双 root（root[0] 合法 playSound，root[1] 合法 playEntityAction 判别器） | 首 root 访问后同步 abort → AbortError 收场、后续 root 不访问（同输入不 abort 正控证 root[1] 可达且会 fail-loud） | sfx-readiness.glm-audio-lifecycle.test.ts > L6 收集中途 abort > 首 root 访问完成后同步 abort |
>
> 产品真值修正记录：L5 初版预期“失败后 duration=0”，实测红 → 核源码 `duration() = activity?.duration ?? sequencer?.duration ?? 0`，产品真值为回退 sequencer 兜底；按真值改断言（harness 兜底时长取 99 与旧 activity 10 区分，使残留可判别），非放宽测试。
>
> 反控（docs/ops/evidence/TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1/counterproof.json，run-counterproof.mjs 可再生）：
> - 基线绿（第一态）sha256 b89b30f4…：定向 3 文件 9/9。
> - 六针红（第二态，每针恰 1 指定业务 AssertionError）/还原绿（第三态）：N1 resume 补播移除（ad3746e2/ffda7749）、N2 同曲守卫失效（2aa2e93b/4d0b6d24）、N3 setEnabled 幂等早退移除（4a29c806/316c87b0）、N4 替换路径两处旧曲停止一并移除（6dfe1981/42baaf3e，单删一处会被互补吸收）、N5 替换不清旧 bytes/activity（3566f560/2b0b2e51）、N6 visit 移除 throwIfAborted（c90a805e/1ef54bc1）。
> - 末次全套重放（第四态）sha256 573d0be2…：9/9。
> - clean-tree：全仓 porcelain 无 M/D 残留；脚本无 mkdtemp/临时目录（清理证明 = clean-tree 检查本身）。
>
> 其它门：定向 3 文件 9/9（green-baseline/final-replay.raw）；相邻 audio 家族 + spessa/video-sfx ports 18 文件 98/98（adjacent.raw sha256 f187d543…）；reforge typecheck 0 错（typecheck.raw）；全仓 `pnpm lint` PASS 0/0/0（lint.raw）；`git diff --check` 过。覆盖率/例数不作完成条件；未改产品、旧测、配置、baseline 与真实数据（diff 仅新增 3 测试文件 + 本卡/evidence/board 文档）。
>
> ## 下一位 Agent 提示词
>
> 无下一位 Agent 提示词，等待 Codex 独立验收 r1（候选提交见 branch codex/glm-reforge-audio-lifecycle-r1；验收入口：docs/ops/evidence/TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1/counterproof.json 与 run-counterproof.mjs 重放）。
> ---
>
> ## Codex quality closure (2026-10-05)
>
> 候选 `6f6b5ceab6933dec82b57ce3c2fb657f618e0f96` 已独立验收：9/9 测试、6/6 反控、typecheck、lint 0/0/0、docs、phase/lore、content review、diff 全通过。本卡已集成 main，原候选分支进入退休清理。
>
<!-- original-source-quote:end -->
