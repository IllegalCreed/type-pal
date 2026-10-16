# ARCH-F2-DS-LABELS-1 — DsTag / DsReadonlyValue 窄拆

Status: done
Phase: phase2 editor / 架构治理 F2
Coding Owner: Cursor
Review / Integration Owner: Codex
Branch: `codex/cursor-arch-ds-labels-r1`（独立 worktree）
Base / production freeze: `95af9ed5`（开工先同步并记录实际 main SHA）
Last reviewed: 2026-10-15
Governance Owner: Codex（历史卡包 B 文档治理）
Template: task-card-v1 / 1.0.0

## 目标

保留DsTag/DsReadonlyValue展示组件窄拆的历史接收：相同DOM、class、属性透传、SSR与同一出口身份，只迁实现归属，不代表F2全部完成。

## 范围

原controls.tsx两组件与DsTagTone→status-values.tsx，旧controls/根出口保持，index/CSS/其它控件和产品业务不变。Cursor为Coding Owner，Codex集成/独立接收；Grok overflow和Cursor wave前置仅按原日期。

## 前提与证据

基点95af9ed5；原controls/recipes/boundary及primitives.css为直接依据。新模块不得runtime回引controls形成环。反证为同输入DOM、tone/span/div/monospace、透传或函数identity漂移，而非净行数。已核[原独立接收](../../../../testing/archive/legacy/ops/testing-records/cursor-arch-ds-labels-review.md)。

## 验收

原9593b06f候选、27f61a4e接入、138定向与真实生产模块tone负控保留。Design Lab RF-22为neutral Tag最小目视，截图不宣称逐像素相等，ReadonlyValue未在该页呈现。初次adoption producer登记失败与ratchet未改game子进程SIGABRT经隔离/原范围复跑后收口，8122/643为历史最终strict；旧warning没有因exit0消失。

## 状态与交接

保留原顶部状态、Owner或Coding Owner及原审查身份。2026-10-16根线程已独立接收本次文档迁移并写中央review/SHA；接收范围仅文档，旧产品build不重新准入。原交接提示词与旧“待门禁/待签字”按下述历史时点读取，不作为可执行授权。无下一位产品贡献者提示词；原未决验证按本卡历史范围保留。

## 历史范围

2026-09-26窄拆接收；原“done未开放”属于开工前中间态，后文Codex独立接收已闭合。旧2026-09-26 warning口径不符合2026-09-27后当前零诊断门，原报告不追溯改零。

## 当时证据

完整原卡及13行独立回执已读；回执给生产SHA、单AssertionError、6013/6014目视范围、adoption修正与SIGABRT复跑。临时截图/log未在本轮恢复或重验。

## 当前有效性

historical。保留当时accept/done与已披露环境失败；不授予当前组件、所有tone的视觉、ReadonlyValue目视或全仓静态零诊断通过。

## 继任文档

历史事实权仍取[独立接收回执](../../../../testing/archive/legacy/ops/testing-records/cursor-arch-ds-labels-review.md)；当前新切片按[现行工作流](../../../agent-workflow.md)，原Cursor提示词不得重新执行。

## 原始结论

完整原卡按原始时点保留；原字节可从 Git blob `bd8f6c90b5cd0415003de778dfb0ce9436f36d27` 回读。引用中的旧授权、命令、提示词与分支清理不能因本次迁移重新执行。

> # ARCH-F2-DS-LABELS-1 — DsTag / DsReadonlyValue 窄拆
>
> Status: done
> Phase: phase2 editor / 架构治理 F2
> Coding Owner: Cursor
> Review / Integration Owner: Codex
> Branch: `codex/cursor-arch-ds-labels-r1`（独立 worktree）
> Base / production freeze: `95af9ed5`（开工先同步并记录实际 main SHA）
>
> `controls.tsx:112-148` 的 `DsTag`、`DsReadonlyValue` 是两块相对独立的展示组件，只共用本文件的 `classes` 拼接。Grok 的同文件 `ARCH-F2-DS-OVERFLOW-1` 和 Cursor 的 `CURSOR-WAVE-2-1` 均已由 Codex 接收并 done，两个前置依赖齐。Codex 在 `95af9ed5` 直接核 `controls.test.tsx:806-807` 的 Tag 正控、`recipes.test.tsx:87` 的使用者、`boundary.test.ts:2024` 的静态门、`primitives.css:43-60,128-158` 的只读值/tag class，以及旧 `design-system/index.ts` 出口；本批仅整理实现归属。**before → after = 同样 DOM、class、语义、属性透传与旧导出，只换组件所在文件。** 若需要回引 `controls` 造成 runtime 环、改变 CSS/焦点/布局或发现真实调用者不止这两块，先停线报告，不硬拆。
>
> ## 白名单与验收
>
> - 可改 `packages/editor/src/ui/design-system/controls.tsx` 的 `DsTagTone`、`DsTag`、`DsReadonlyValue` 定义；新建 `status-values.tsx` 承接三者，在 `controls.tsx` 直接 re-export **同一函数/类型**。`index.ts` 和既有消费导入路径不改；`status-values.tsx` 可局部等价实现 `classes`，不得从新文件 runtime import `controls`。
> - 必要时只改 `controls.test.tsx`、`recipes.test.tsx`、`boundary.test.ts` 以补旧路径/根路径/新模块 identity 与默认/neutral/warning/danger tone、monospace、span/div、透传属性的非空业务断言；不得删除旧断言或弱化静态门。可新增 `docs/testing/archive/legacy/ops/testing-records/cursor-arch-ds-labels.md` 回执及测试索引一行。**不改 CSS、其它控件、产品业务组件、schema/save/资源/覆盖基线。**
> - 先记录既有测试名和旧组件/根出口 DOM/SSR，拆后跑 `controls.test.tsx`、`recipes.test.tsx`、`boundary.test.ts` 与 editor typecheck、改动文件 Biome、check:docs/diff。至少一条隔离单点**生产模块加载变异**应使新增 tone/class/element 断言业务红；不接受测试内仿写逻辑再抓自己的 AssertionError。临时证据放唯一目录，默认清理，源 hash 不变。无需每小例跑全仓覆盖；Codex 接收后统一 check→ratchet→单次严格 fast，并做最小隔离 UI 对照。
>
> Cursor 自验不是独立证明，只在隔离分支提交推送，不合 main、不标 done。Grok 原卡已关闭，其 `DsOverflowText` 文件/行为和 `text-overflow-adoption.json` 本批只读。发现旧 UI 设计问题另列，不夹带改样式。
>
> ## 阶段门与交接
>
> Codex：**premise verified / build allowed**，仅本卡白名单；新用户分工允许 Cursor 做低风险结构切片，Codex 独立验收与集成，固定三签暂停。done 未开放。
>
> ## Codex 独立接收与 done 准入（2026-09-26）
>
> - **accept / done，仅两个展示组件窄拆**。Cursor 候选 `9593b06f` 的源、旧导出、138 定向测试、独立 Vite 单点负控与隔离 Design Lab 已由 Codex 直接核验；[完整记录](../../../../testing/archive/legacy/ops/testing-records/cursor-arch-ds-labels-review.md)。Grok `DsOverflowText` 与其它控件未重开。
> - main 接入 `27f61a4e`，Codex 另补两条 text-overflow adoption owner 登记；根 check、ratchet、单次严格 fast 均 exit0，8,122/643、分支分母不缩。ratchet 首次遇到未改 game 资源子进程 SIGABRT，日志、隔离绿与原范围复跑一并在回执披露，不以多数通过掩盖。
> - 本卡最初“done 未开放”与 Cursor 提示词仅为历史状态。当前 Codex 独立验收模式下准入已齐；整批 F2 尚未完成。无下一位 Cursor 返工提示词。
>
> ### 下一位 Cursor 提示词
>
> ```text
> 在 /Users/zhangxu/illegal/type-pal 接手 ARCH-F2-DS-LABELS-1。先读 AGENTS.md、CLAUDE.md、
> docs/phase2/READ-FIRST.md、本卡及最新 controls.tsx:112-148、controls/recipes/boundary 测试、
> primitives.css 的 tag/readonly 样式。从最新 origin/main 建独立 worktree、
> 分支 codex/cursor-arch-ds-labels-r1。只把 DsTagTone、DsTag、DsReadonlyValue 移到
> status-values.tsx，并从 controls.tsx 维持旧出口，禁止新文件 runtime 回引 controls。
> DOM/class/ARIA/默认与各 tone/monospace/span-div 及根出口同一函数必须保真；按卡面白名单
> 补真实断言与隔离生产模块单点负控，跑定向、editor typecheck、Biome、docs/diff。
> 提交推送候选 SHA 和前后证据；不合 main、不标 done、不跑官方覆盖率。Codex独立复核。
> ```
