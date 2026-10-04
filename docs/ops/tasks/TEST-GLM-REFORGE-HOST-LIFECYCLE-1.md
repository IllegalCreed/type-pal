# TEST-GLM-REFORGE-HOST-LIFECYCLE-1 — Reforge host lifecycle contract wave

Status: build
Owner: GLM
Reviewer: Codex（独立验收）
Phase: phase2
Capability: reforge / host lifecycle
Visual Verification Timing: mixed
Base: `origin/main` `12247f7e3`（r1 初版基 `70a56f6bc` 的外来 e2e 混入按 Codex 返工令剔除）
Branch: `codex/glm-reforge-host-lifecycle-r2`

## Codex build allowed（dispatch 2026-10-04）

前卡 [TEST-COVERAGE85-GLM-REFORGE-1](TEST-COVERAGE85-GLM-REFORGE-1.md) 诚实收口于 80.49%，本卡为
后续专项窄波：只攻 host lifecycle 六轴，不做覆盖率百分比承诺。

独占范围（dispatch 指定重点核验）：

- `src/main.ts:477-600`（启动视频序列、标题菜单决策、AsyncIntentController、awaitRunner 单次结算）
- `src/main.ts:914-942`（commitSceneSwitch 场景 BGM 三态、switchScene 世界失效门）
- `src/main.ts:2090-2184`（host.wait/teleportParty/loadScene 事务、entry reveal、cleanup 恢复）
- `src/script-runner-core.ts`、`src/script-runner.ts`、`src/script-host-adapter.ts` 全文。

关注轴：启动/取消、promise 只结算一次、场景替换、存档入口、continuation cursor、signal、
host capability 缺席、后台错误恢复。

明确不在范围：battle-session private state、`__rf*`/`__tp*` debug 口、新增产品观察接口、
覆盖率百分比达标。

## 白名单

只允许新增本卡测试（`*.host-lifecycle-1.test.ts`）、合法 typed fixture、本卡证据脚本与
`docs/ops/evidence/TEST-GLM-REFORGE-HOST-LIFECYCLE-1/`。不得修改产品、旧测、配置、baseline、
真实 PAL 数据或共享文档；禁反射私有状态、业务核心 mock、强转、skip/ignore、扩大 timeout。

每条合同记录 source:line、公开 caller、合法输入、业务 oracle、唯一 fullName；反控按
原始绿→指定业务红→恢复绿 + 唯一 AssertionError + raw/JSON + exit + 四态 hash + clean-tree +
mkdtemp 清理交付。不标 done，等 Codex 独立验收。

## 排重与不可达账（build 期核验，2026-10-04）

- 既有覆盖（不重复）：H5/H6 存档与场景竞态（main.save-flows/main.scene-flows）、H1 标题入口选择
  （main.boot-flows）、H2 读档浏览器（opening-menu.flows，runOpeningMenu 直测）、auto-save 波的
  F5/F9 剧情取消（main.auto-save-flows / main.auto-pose-authority）、gate/settlement 门族
  （script-runner-core.gates.glm-q）、adapter 命令分发既有族（script-host-adapter.*）。
- 本卡新增不与之重叠：bootGame 级标题读档入口（bootLoadSlot 全链无测试）、视频启动/取消窗口、
  gameOver 读最近档/无档重开、场景 music null、ScriptRunner 12 个未分发命令 kind、
  续跑控制帧（confirm/startBattle/teleportOut）、autoMotionCheckpoint 公开合同、
  setCheckpointReady 空帧门、帧深 256、setEntityPos 显式 height、setSceneOnEnter 既有槽。
- 不可达臂登记（证据见证据目录 README U 节）：core L305/442/445/448/451（author 校验前置拒绝，
  content/src/author-script-core.ts:737-767）、L175/L595（compilerVersion 为 literal 3 类型，
  合法 typed 值无法过期）、L553/L573/575（validateScriptContinuation 前置拒绝）、L328/L366/L540
  （稠密编译产物/帧栈不变量防御）、L370 B43#1（叶子命令恒为带 kind 对象）、main L937/L2116
  （world 为 const + replaceWorld 原地变更，引用恒等）、L520（DEV 观察臂测试环境恒真）、
  L533（菜单只回传注入的 items id）、L535#1（shouldPlayEntryIntro('menu-entry') 字面量恒真）、
  L478 入口臂（派发前 await 窗口各自带 abort 检查）、L2092 ?? 臂（host.wait 调用方全部显式传
  signal）。

## GLM 交付回执（r2 返工，2026-10-04，待 Codex 独立验收）

- **r2（当前候选）**：按 Codex 返工令基于 `origin/main` `12247f7e3` 重建
  `codex/glm-reforge-host-lifecycle-r2`，剔除 r1 基线（`70a56f6bc`，属 e2e 在途分支）
  混入的 `scripts/e2e/*` 外来改动（四文件均不存在于 origin/main）。r1 的 12 提交经
  cherry-pick 重放，任务卡合并保留派发骨架字段（Phase/Visual），看板/索引沿用 main
  既有行。r1 分支（tip `371b40810`）保留不动，验收以 r2 为准。
- 产品文件零改动（`git diff origin/main..HEAD --stat` 仅本卡测试/脚本/证据/卡/证据索引）。
- **交付 29 条合同 / 4 个专属测试文件**（`*.host-lifecycle-1.test.ts`）：
  - `main.host-lifecycle-1.test.ts`(8)：标题**读档**入口全链（bootLoadSlot 此前零测试）、
    入口 intro 视频、启动视频序列（?menu 无 skip-startup 两段按角色顺序）、播放中/解析中
    取消窗口（auto 行为实体 + F9 + 存档游标重放，奖励单结算）、战败读最近档（savedAt 而非
    槽序）、无档重开安静收口、场景 BGM 显式 null 停曲 + 缺省延续。
  - `script-runner.host-lifecycle-1.test.ts`(7)：12 个全仓从未派发的 author 命令 kind
    （loadLastSave/gameOver/wait/setEntityFacing/setEntityFrame/moveEntity/moveParty/
    unmountParty/ride/cameraPan/cameraSnap/clearFrameAnimation）分组合同 + signal 身份、
    setEntityPos 宿主能力缺席、setSceneOnEnter 既有槽覆写、callScript 内 returnScript
    边界、jumpScript 取消窗口（AbortError + 零解析）。
  - `script-runner-core.host-lifecycle-1.test.ts`(8)：confirm/startBattle/teleportOut
    续跑控制帧（宿主不再询问/重开/传出）、自动单步检查点（settle 相位写入续跑游标帧、
    迟到回执静默、活发布 stop 吞没与真错误穿透、phase getter 两臂）、setCheckpointReady
    wait/stop 空帧门（对照基线判别）、帧深 256 精确熔断。
  - `script-host-adapter.host-lifecycle-1.test.ts`(6)：adapter 生存周期/全队增益/队伍镜头
    命令逐参 + signal、runEntityTrigger 直派 fail-loud、vanishEntity 目标三态。
- **四账**（均在 r2 基线重新生成，可由 `packages/reforge/scripts/hl1-*.mjs` 重建）：
  identity（29 条 file×fullName×status）、family ledger（name→源行→caller→oracle，与
  身份账双向唯一匹配，仓库 biome 定稿）、mutation counterproof（**4/4 PASS**：
  original/mutant/restored/rebuilt 四 sha256、console+json 原文全量、executed/failed/
  skipped 分账、clean-tree 前置、mkdtemp+finally、-t vacuous 硬防）、branch delta
  （全量 fast 基线 325/8687 vs 终态 329/8716，**净闭合 +49 臂、0 丢失**；r1 口径 +51 中
  的 L488/L500 已被 main 侧演进自行闭合）。
- **U 账 19 条**不可达臂（author 校验前置/literal 类型/validateScriptContinuation/const
  world 原地替换/环境恒真/调用方枚举/防御不变量），逐条一手锚点见
  [证据 README](../evidence/TEST-GLM-REFORGE-HOST-LIFECYCLE-1/README.md)。
- **排重裁决**：与 H1/H2/H5/H6/auto-save/glm-q gate 族不重叠；setEntityPos 显式 height
  合同与既有『0x13 缺省臂』（实际用显式 0/2）同 caller/输入形状/oracle，按纪律**删除**；
  `?? 0` 默认臂按 GridPos.height 必填登记 U18；BGM 有声资产臂既有证明；awaitRunner 单次
  结算面由 H5 delayed-read 既有证明。
- **验证**：定向 29/29 绿；相邻 unit 12 文件 181 绿 + main/menu 邻域 13 文件 87 绿；
  typecheck 0 错误；全仓 lint 零诊断；`pnpm check:docs` PASS；`git diff --check` 干净；
  全量 fast 双跑见 delta 账。
- **基线既有失败**：`src/pal-meal-author.test.ts` 在 r1 基线即红；origin/main 已修复
  （r2 双跑全绿 325/8687 与 329/8716，无需排除）。
- **r1 工作树事故与修复（历史披露）**：r1 期间同工作树有并行 Agent 活动，其
  `adaf3b51e`/`281094adc` 两提交与本卡提交先后叠上 `codex/e2e-clean-20261004`。当时已
  用临时 worktree cherry-pick 重建并归位对方分支。r1 候选 tip `371b40810`、测试交付
  `96b04fb0e`；独立复核确认 29/29、4/4 反控、typecheck 通过，根 lint 失败项全部来自
  r1 基线（e2e 在途分支）混入的 `scripts/e2e/*` 外来改动，即 r2 换基返工的动因。

## 下一位 Agent 提示词

Codex 独立验收：读本卡与
[证据 README](../evidence/TEST-GLM-REFORGE-HOST-LIFECYCLE-1/README.md)，复跑
`node packages/reforge/scripts/hl1-mutation-counterproof.mjs`（4 注入应全 PASS 且源恢复）、
`node packages/reforge/scripts/hl1-identity-status.mjs`、
`node packages/reforge/scripts/hl1-family-ledger.mjs`（再生成零 diff）、
`pnpm --filter @type-pal/reforge run typecheck`、定向 4 文件与全量 fast、`pnpm lint`、
`pnpm check:docs`。核对 identity/family/counterproof/delta 四账与 U 账锚点；重点抽查：
反控指定 AssertionError 是否唯一归因、U6/U12/U18 类型/常量论证是否成立、29 合同是否与
既有 fullName 重复状态轴、标题读档/视频取消两处 main 合同的观测面是否只用公开口。
裁决 accept/counter/rework；未验收前不合 main、不标 done。
