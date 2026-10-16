# TEST-GLM-REFORGE-MOTION-TRANSITION-1 — motion, scene transition and input lifecycle audit

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

- TEST-GLM-REFORGE-MOTION-TRANSITION-1 — motion, scene transition and input lifecycle audit：原始顶部状态为 done；完整原始语义保留于下方 quote。

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

固定 source revision `b3c24c04ddb534b9e8195a074590bea8a233fc93`，source SHA `56dd1ff113d4e381eaf9412c71eca20d18e5a00432e9b772fb50f4d716990b2a`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-REFORGE-MOTION-TRANSITION-1 — motion, scene transition and input lifecycle audit
>
> Status: done
> Phase: phase2
> Capability: reforge / motion, scene transition and runtime input lifecycle
> Coding Owner: GLM
> Reviewer: Codex（独立验收）
> Contributor: GLM
> Branch: `codex/glm-reforge-motion-transition-r1`
> Visual Verification Timing: dev-functional
>
> ## 目标
>
> 审计 Reforge 世界运行时剩余的公开 motion/scene/input 生命周期分支，重点核验多实体 reservation 冲突、公平排序、地形扫描、动态绕行、scene transition commit/abort、输入锁/取消与公开恢复结果。只补真实新业务合同；已由 world-lifecycle、host/runtime-session、battle、asset/audio 卡证明的轴只登记。
>
> ## 范围
>
> - 范围内：`packages/reforge/src/entity-motion.ts`、`world-motion-runtime.ts`、`collision.ts`、`scene-transition.ts`、`scene-switch-transaction.ts`、`scene-entry-session.ts`、`runtime-input-router.ts`、`async-intent.ts` 的公开 caller/host flow；必要时使用 `main.scene-flows.test.ts`、`main.entity-host-flows.test.ts` 的真实 fixture。
> - 优先审计分支：motion candidate/terrain sweep/reservation conflict/side-stick/fairness、scene transition 的 success/failure/abort/old-world isolation、input router 的 lock/release/latest intent；具体新增以 fullName ledger 为准。
> - 范围外：已归档 `TEST-GLM-REFORGE-WORLD-LIFECYCLE-1` 的 DeferredTouchTrigger/AsyncIntent capture/GameplayClock 四针、battle-flow、asset resolver、audio lifecycle、UI/视觉与剧情 E2E。
> - 不改产品/schema/API/旧测/config/baseline/真实 projects/pal；禁止私有 state、`__rf*`、核心 mock、强转、skip、ignore、扩 timeout、非法 entity/world backdoor。
>
> ## 验收条件
>
> - 先建立 motion/transition/input 的 source:line×公开 caller×合法 typed 输入×业务 oracle×fullName ledger；重复、无业务 oracle、非法输入分别登记 existing-proof/unreachable/blocked。
> - 新合同必须断言公开 plan/commit/abort、实体最终位置/owner、场景切换后的可继续运行、输入锁释放或取消结果；不能只断言坐标数组/调用次数/私有可视状态。
> - 反控为绿→指定业务红→恢复绿，恰一业务 AssertionError，保留 JSON/raw/exit/执行集/源/变异/恢复 hash 与 mkdtemp/finally 清理证明。
> - 定向/相邻 Reforge 测试、typecheck、lint 0/0/0、docs、`git diff --check` 通过；不设例数或覆盖率门槛。审计后若无合法新合同，提交饱和档案，不堆弱测。
>
> ## GLM r2 返工回执（2026-10-05，反控 runner 按 Codex 一审令重铸，待二审）
>
> - 返工范围：仅 `packages/reforge/scripts/mt1-mutation-counterproof.mjs` 与证据；3 条业务合同、
>   排重账、产品/旧测/config/baseline 零改动（测试文件字节与 r1 相同）。
> - r1 缺陷（一审认定）：回执只存计数摘要、failed 用 includes 前缀匹配、绿相位无执行集比较。
> - r2 重铸后的反控证据口径（[counterproof.json](../../../evidence/TEST-GLM-REFORGE-MOTION-TRANSITION-1/counterproof.json)）：
>   - **完整执行集**：每个 phase（baseline / 每针 mutant / 每针 restored / final-replay，全量
>     8767 测试、`--reporter=json`、无 `-t`）解析完整 file×fullName×status 执行集，按 (file,
>     fullName) 排序落盘 `counterproof-raw/*.identity.tsv`（8 个 artifact，字节流即
>     identitySha256，回执记录路径/字节/文件 sha256 并逐一复核）。
>   - **红相位硬门**：exitCode≠0、signal===null、spawnError===null、numFailedTests===1、
>     numPendingTests===0、numTodoTests===0、success===false、无「失败且零断言行」的 suite
>     （collection/runtime error 形态）；identity 中 failed 行恰 1 且 fullName 与目标合同**精确
>     相等**（目标全名取自 baseline 执行集恰一匹配）；failureMessages 含指定 AssertionError
>     片段，console 原文旁证同查。
>   - **绿相位硬门**：exit 0、signal/spawnError null、全 passed、零 pending/todo，且
>     identitySha256 与 baseline **集合级一致**（restored ×3 与 final-replay 全部相等，
>     identitySha 90a5ade2…）。
>   - **可复算**：完整 argv（`pnpm exec vitest run --reporter=json`）/cwd/env 摘要
>     （NODE_COMPILE_CACHE deleted）、JSON 计数、exit/signal/spawnError、源文件四态 sha256
>     （orig==restored==rebuilt==当前源 d32aa7d4…）、mkdtemp finally 移除入账。
>   - **runner 自测**：11 例（9 拒收反例：两失败/错 fullName/exit 0/pending/collection error/
>     非断言错误/signal SIGKILL/spawn ENOENT/绿相位集合漂移；2 放行正例）全部由同一判据函数
>     正确裁决，自测不过即不运行真针。
> - 结果：3/3 PASS（每针红相位全包恰 1 failed=指定合同 AssertionError；恢复绿、final-replay
>   identity 与 baseline 一致）。
> - 门禁（raw 见 [gates/](../../../evidence/TEST-GLM-REFORGE-MOTION-TRANSITION-1/)）：定向 3/3、
>   相邻 21 文件 192/192、Reforge 全包 8767/8767（另由反控 baseline+final 双证）、typecheck
>   exit 0、全仓 lint 3416 文件 0/0/0（identity artifact 用 TSV 避开 biome JSON 1MiB 上限，
>   回执 biome format 后 8 个 artifact sha256 复核不变）、`check:docs` PASS、
>   `check-content-review --strict` PASS、`git diff --check` 干净。
> - 提交：见分支 `codex/glm-reforge-motion-transition-r1`（r2 提交在本回执之后）。
> - 不标 done，等待 Codex 二审。
>
> ## GLM 交付回执（r1，2026-10-05，历史保留；反控证据已被 r2 取代）
>
> - 分支/基线：`codex/glm-reforge-motion-transition-r1`，基于 `origin/main` `7a9157ac5`；产品/schema/API/旧测/config/baseline/真实数据零改动（diff 仅本卡测试、反控脚本、证据、导航行与 stamp 机械刷新）。
> - 排重结论：8 文件逐轴账见 [dedup-ledger.md](../../../evidence/TEST-GLM-REFORGE-MOTION-TRANSITION-1/dedup-ledger.md)。
>   7 文件全轴 existing-proof 饱和（collision 6 轴、scene-transition 4 轴、scene-entry-session 6 轴、
>   scene-switch-transaction 6 轴、runtime-input-router 9 轴、async-intent 5 轴、entity-motion 全域——
>   卡面重点轴 reservation/terrain/fairness、scene commit-abort-old-world isolation、input lock/latest
>   intent 均旧测已证，与归档 world-lifecycle 卡同判一致）；`world-motion-runtime.ts` 存在 3 条真残余
>   合同，为本卡唯一新增测试文件 `packages/reforge/src/world-motion-runtime.motion-transition-1.test.ts`：
>   - MT-CADENCE-CLAMP-1: 停顿帧（dt≥2×stepMs）真积压被钳掉——一帧至多一拍、丢弃余数不结转成下一帧
>     提前拍（main.ts 走位环「DM31 永不补帧」注释锚；旧测最大非冻结 dt=stepMs 未触达钳行）；
>   - MT-PARTY-COMPLETE-STALE-1: 被替换旧 party 走位槽迟到完成不唤醒新等待者（身份守卫），当前槽
>     照常兑现（可达性注记：宿主同步窗现不产生陈旧引用，按 DT-FIRE-DROP-1 先例钉模块公开 API
>     所有权承诺，见 ledger）；
>   - MT-PARTY-RESOLVE-RELEASE-1: abortScript（main.ts:4568 读档/dev 强停）收口以 fulfilled 兑现
>     在途走位并清槽、迟到 abort 不二次结算（全仓旧测对该行为零覆盖，仅 chain 测试 empty mock）。
> - U 账 4 条：四注册入口尾部 `if (signal.aborted) abort()` 防御臂（同步构造窗内 throwIfAborted
>   已先行拒绝，合法输入不可达），不为过门伪造输入。
> - 反控：3/3 针 VALID（[counterproof.json](../../../evidence/TEST-GLM-REFORGE-MOTION-TRANSITION-1/counterproof.json)，
>   `node packages/reforge/scripts/mt1-mutation-counterproof.mjs` 可再生）。执行集 = reforge 全量套件
>   （无 `-t` 过滤，免疫零匹配假绿）：baseline 8767/8767 绿；每针红相位 exit 1、全包恰 1 failed 且为
>   指定业务 AssertionError；字节恢复后全量 8767/8767 复绿；四态 sha256（orig/mut/restored/rebuilt）
>   逐针入账，orig==restored==rebuilt 且等于当前源；红相位 try/finally 强制恢复 + 脚本内 mkdtemp
>   finally 清理。
> - 门禁（raw 见 [gates/](../../../evidence/TEST-GLM-REFORGE-MOTION-TRANSITION-1/)）：定向 3/3；相邻 21 文件
>   192/192（motion/scene/input 家族 + main.scene-flows/main.entity-host-flows）；typecheck exit 0；
>   全仓 lint 3416 文件 0/0/0；`check:docs` PASS 0 issues；`check-content-review --strict` PASS
>   （board/index/evidence-README 三处基线自带 after-SHA drift 按 8494b465c 先例机械刷新：仅
>   afterSha256/implementationSha 对齐 + append-only history，无评审结论改动）；`git diff --check` 干净。
> - 判例：`pnpm --filter` 递归形态在红相位（exit≠0）会把 ERR_PNPM banner 追加进 stdout 污染 json
>   reporter，反控驱动必须用 cwd=pkgRoot 裸 `pnpm exec`；反控驱动运行期间不得并发编辑任何 tracked
>   交付文件（clean 前置检查会拦截自己的交付改动）。（r1 反控证据口径已被上方 r2 取代。）
> - 覆盖率/例数未设门槛、未计量；不标 done，等待 Codex 验收。
>
> ## 下一位 Agent 提示词（Codex 独立验收）
>
> ```text
> 你是 TEST-GLM-REFORGE-MOTION-TRANSITION-1 的独立验收方（Codex）。先读本卡「GLM 交付回执（r1）」与
> docs/ops/evidence/TEST-GLM-REFORGE-MOTION-TRANSITION-1/（README/dedup-ledger/counterproof.json +
> counterproof-raw/ + gates/），在 codex/glm-reforge-motion-transition-r1（基 7a9157ac5）上复核：
> 1) 抽查 dedup-ledger 的 7 文件 existing-proof 锚与 U 账论证（重点：entity-motion reservation/fairness
>    饱和判定、async-intent 与 world-lifecycle AI-CAPTURE-1 的边界、U-1~U-4 同步窗论证）；
> 2) 核 3 条新合同的 caller/oracle 与可达性注记（MT-PARTY-COMPLETE-STALE-1 的模块级交付是否按
>    DT-FIRE-DROP-1 先例成立）；
> 3) 复跑 node packages/reforge/scripts/mt1-mutation-counterproof.mjs（应 3/3 PASS 且源恢复）、
>    定向与相邻 21 文件、pnpm --filter @type-pal/reforge run typecheck、pnpm lint、
>    node scripts/docs/check.mjs、node scripts/docs/check-content-review.mjs --strict、git diff --check；
> 4) 核 stamp 机械刷新 diff 仅 afterSha256/implementationSha + append-only history。
> 裁决 accept/counter/rework；未验收前不合 main、不标 done。
> ```
>
> ## 下一位 Agent 提示词（dispatch 原文，历史保留）
>
> ```text
> 你是 TEST-GLM-REFORGE-MOTION-TRANSITION-1 的 Coding Owner（GLM）。先读 AGENTS.md、docs/phase2/READ-FIRST.md、docs/phase2/reference/phase1-knowledge-harvest.md、本卡，以及已归档 TEST-GLM-REFORGE-WORLD-LIFECYCLE-1、HOST-LIFECYCLE、RUNTIME-SESSION、BATTLE-FLOW、ASSET-RESOLVER、AUDIO-LIFECYCLE 卡。
> 只在 codex/glm-reforge-motion-transition-r1 工作。先对 entity-motion.ts、world-motion-runtime.ts、collision.ts、scene-transition.ts、scene-switch-transaction.ts、scene-entry-session.ts、runtime-input-router.ts、async-intent.ts 的公开 caller/合法输入/business oracle/fullName 排重。
> 重点审计 reservation/terrain/fairness、scene commit-abort-old-world isolation、input lock/latest intent；不要重复 world-lifecycle 已闭合的四针，也不要写 battle/asset/audio/UI/剧情合同。
> 只写本卡测试、合法 typed fixture、证据和回执；禁止改产品/schema/API/旧测/config/baseline/真实数据、私有 state/__rf*、核心 mock、强转、skip、ignore、扩 timeout 或非法 backdoor。新增反控必须绿→指定业务红→恢复绿、恰一 AssertionError、完整执行集/hash/清理证明；无新合同就交 existing-proof/unreachable 饱和档案。
> 交付定向/相邻 test、typecheck、lint 0/0/0、docs、git diff --check 和完整 SHA。覆盖率/例数不是完成条件，不得标 done，等待 Codex 独立验收。
> ```
>
> ## Codex 独立验收与收口（2026-10-06）
>
> - 独立复跑：定向 3/3；r2 strict counterproof 3/3 PASS，identity artifact/红绿 phase gate/9 自测反例全部通过。
> - 独立质量门：Reforge typecheck、docs、git diff --check 通过；集成全仓 lint 3441 files、0/0/0。
> - 结论：motion transition 三条残余合同及 existing-proof/U 账满足门禁，合入 main，任务归档为 done。
>
<!-- original-source-quote:end -->
