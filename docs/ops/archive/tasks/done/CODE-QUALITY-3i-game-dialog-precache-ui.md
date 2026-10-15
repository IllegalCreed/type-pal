# CODE-QUALITY-3i - game 对话资源与预缓存 UI 逐文件治理

Status: done
Phase: phase1 game
Capability: ops / code-quality
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: dev-functional（仅 DOM 状态，不做剧情 E2E）
Contributor: Codex
Branch: codex/code-quality-governance
Base: `9c9b4b973`
Last reviewed: 2026-10-16
Governance Owner: Codex（历史卡包 D 文档治理候选，待根线程独立接收）
Template: task-card-v1 / 1.0.0

## 目标

保存2026-10-05对话资源、precache client/UI、音量与DOS商标五文件窄批：只有音量NaN进入sink/localStorage有直接缺陷，按0修复；trademark只纠正skipKeys过时注释，dialog/precache未发现直接缺陷。

## 范围

原dialog-assets与shell precache-client/precache-ui/audio-volume/trademark-fallback及对应合同；不扩sw.ts、audio backend、生成资源、剧情E2E或schema。DOM状态核验不改变UI形态，不等于看图。

## 前提与证据

原真实caller分别为manifest/PNG/icon、SW ready/onPlayable、两阶段进度、三通道音量与sdlpal main商标时序；可疑NaN/Infinity/进度输入先核实再修。最终只证音量NaN→0，不把其它候选写成已证缺陷或一概拒绝所有外部数值。

## 验收

原定向10files/68tests、game298/3398、typecheck；NaN guard negative control变红，过时注释与playRng真值同步；全仓第二轮check/support-mode ratchet/protected/lint通过仅属当轮。onPlayable前不启动precache的既有协议保留，未重跑SW/DOM或剧情。

## 状态与交接

原done及17f2c6dab已推送记录保留，原Visual Timing dev-functional只指DOM状态；旧fenced build prompt不恢复运行/实现。本次文档候选待根独立接收，不以作者自验代替。

以下保留原标题入口。导航指向本卡历史原文或归纳；原命令、build/验收提示及分支操作只按其日期读取，不恢复执行。

### 目标与范围

历史内容见[原始结论](#原始结论)；按原时点读取。

### 前提真值门

历史内容见[前提与证据](#前提与证据)；按原时点读取。

### 上下文锚点

历史内容见[前提与证据](#前提与证据)；按原时点读取。

### 验证

历史内容见[验收](#验收)；按原时点读取。

### 当前模式推进记录

历史内容见[原始结论](#原始结论)；按原时点读取。

### 交接日志

历史内容见[原始结论](#原始结论)；按原时点读取。

### 下一位 Agent 提示词

历史内容见[原始结论](#原始结论)；按原时点读取。

## 历史范围

10-05、基点9c9b4b973；原ledger113闭合/2846尚未核验属于接手时点，不与今日清单混写。商标DOS chunk6/1000ms/600ms行为未改，注释纠正不算新产品时序设计。

## 当时证据

[总纲](../../../audits/code-quality-governance.md)96–100与[账本](../../../audits/code-quality-file-ledger.md)157–162提供五文件逐项结果；原卡48–56行保留68/3398和唯一窄修。本包未全文重读五生产文件或旧测试，不赋予当代测试质量accept。

## 当前有效性

historical。DOM功能状态、typed合同与原NaN修复不等于新浏览器视觉、商标演出或E2E通过；不把修正skipKeys注释写成行为改变。原已验证只按当时范围，guard候选不得扩张。

## 继任文档

[Q3j](CODE-QUALITY-3j-game-tools-speedrun.md)接续工具小域；当前剧情视觉与新实现按[现行工作流](../../../agent-workflow.md)准入，无可执行旧prompt。

## 原始结论

保存2026-10-05对话资源、precache client/UI、音量与DOS商标五文件窄批：只有音量NaN进入sink/localStorage有直接缺陷，按0修复；trademark只纠正skipKeys过时注释，dialog/precache未发现直接缺陷。

当轮验收范围：原定向10files/68tests、game298/3398、typecheck；NaN guard negative control变红，过时注释与playRng真值同步；全仓第二轮check/support-mode ratchet/protected/lint通过仅属当轮。onPlayable前不启动precache的既有协议保留，未重跑SW/DOM或剧情。

完整原卡来自 Git blob `b7dbc731f4063e28e68bcd6d981d3c7a26be66c1`，source revision `bb90428668808368e816bd8e2ddeb5da57e4b166`；预审 `40bce2fb7fb8d19ff99b228063e337e1b3050fa2` 对应blob完全相同。引用每行仅增加 `> `，空行只增加 `>`，可逐字节逆回读。旧prompt、命令、临时路径与历史accept/done不构成本轮产品执行、当前测试质量或独立签收。

<!-- original-source-quote:start -->

> # CODE-QUALITY-3i - game 对话资源与预缓存 UI 逐文件治理
>
> Status: done
> Phase: phase1 game
> Capability: ops / code-quality
> Coding Owner: Codex
> Generation Owner: N/A
> Reviewer: Codex（独立验收）
> Visual Verification Owner: N/A
> Visual Verification Timing: dev-functional（仅 DOM 状态，不做剧情 E2E）
> Contributor: Codex
> Branch: codex/code-quality-governance
> Base: `9c9b4b973`
>
> ## 目标与范围
>
> 逐文件核验 game 的对话资产、Service Worker precache 客户端/UI、音量 controller 和 DOS 商标 fallback；以真实 caller、第一阶段合同和现有测试为证据，只修直接可证伪的输入/失败问题。
>
> - 白名单生产文件：`packages/game/src/assets/dialog-assets.ts`、`packages/game/src/shell/{precache-client,precache-ui,audio-volume,trademark-fallback}.ts`
> - 直接测试：对应 `.test.ts`、边界测试、precache host / trademark-splash 合同；不扩张到 `sw.ts`、audio backend、剧情 E2E。
> - 范围外：生成资源、save/schema/migration、公共数据格式、覆盖率 runner 和剧情视觉路线。
>
> ## 前提真值门
>
> - 一句话前提：对话/预缓存/音量/商标 fallback 只在合法输入上保持现行资源和可玩门语义；无效外部数值不能进入 DOM/音频 sink 形成 NaN 或永不收敛状态。
> - 真值来源：`packages/game/src/assets/dialog-assets.ts:39-117`（manifest/PNG/icon caller）；`packages/game/src/shell/precache-client.ts:34-90`（SW 消息与 ready 屏障）；`packages/game/src/shell/precache-ui.ts:61-163`（进度 clamp/阶段机）；`packages/game/src/shell/audio-volume.ts:17-52`（0..1 持久音量）；`reference/sdlpal/main.c:197-203` 与 `packages/game/src/shell/trademark-fallback.ts:92-112`（DOS 商标时序）。
> - 当前 before -> 目标 after：`5 个文件的失败/输入行为分散 -> 每个文件有 caller、输入域、合法/非法反例和验证结论`。
> - 最强替代解释 / 推翻观察：SW 的进度消息和 localStorage 可能只产生合法有限数；若一手 caller 保证该前提且边界测试证明降级，则保留；若 NaN/Infinity/负进度能到 DOM 或 applyVolume，或 SW ready rejection 无法触发既定 fallback，则前提被推翻并修复。
> - 是否主动偏离已核真值：N/A（不改变用户可见形态、资源格式或 fallback 时序）。
>
> ## 上下文锚点
>
> - `AGENTS.md`：单一 Coding Owner、逐文件账本、硬零诊断、少而精测试和视觉/E2E 延后规则。
> - `CLAUDE.md`：第一阶段原版行为与 raw/extracted 资源边界；商标 fallback 只对齐已核实的 sdlpal/资源合同。
> - `docs/ops/audits/code-quality-file-ledger.md`：Q3h 后已闭合 113 条，仍有 2,846 条机器记录未逐文件核验；本卡不把包级全绿冒充清单完成。
> - 不得重新引入：对话资源静默伪造帧、precache 在 onPlayable 前抢带宽、音量 NaN 持久化、商标 fallback 以测试替代原始时序。
>
> ## 验证
>
> - 每个白名单生产文件先完整读取并记录 caller/输入域/失败语义；只把有直接证据的问题修复，未知候选留 `review`。
> - 若修代码：定向/相邻 game tests、game typecheck、全仓 `pnpm check`、support-mode ratchet、protected fast、Biome 零诊断；DOM 只做功能性状态最小验证，不替代剧情 E2E。
> - 测试合同逐条核对原子性、合法 typed input、真实 caller/oracle、排重和有效 negative control。
>
> ## 当前模式推进记录
>
> - Codex 前提核验：verified（五文件职责和一手锚点已列；无 schema/save 取舍）。
> - build 准入：Codex build allowed；只允许白名单内窄修与专属测试。
> - 贡献者交付/自验：Codex；定向 10 files/68 tests、game 全包 298/3398、game typecheck 通过。
> - Codex 独立验收：accept（五个生产文件逐个重读；NaN guard negative control 变红；过时 skipKeys 注释已纠正；全仓第二轮 `pnpm check`、support-mode ratchet、protected fast、Biome 零诊断均通过）。
> - 用户产品裁决/体验验收：N/A（不改变 UI 形态；只验证 DOM 状态合同）。
> - done 准入：Codex done allowed；提交 `17f2c6dab` 已推送，独立 diff/status 核对通过；本卡不代表 game 或全仓治理完成。
>
> ## 交接日志
>
> - 2026-10-05 Codex：Q3h 已归档；继续开启本窄批，先读五个生产文件及直接测试，优先验证音量 NaN 与 precache 数值输入，未证实前不改实现。
> - 2026-10-05 Codex：五个生产文件逐个核验；`audio-volume.ts` 发现 NaN 可进入 sink/localStorage，已按 0 修复并由负控验证；`trademark-fallback.ts` 仅修正与 playRng 真值冲突的过时注释；dialog/precache UI/client 未发现直接缺陷。定向 68、game 全包 3398、全仓 check/ratchet/protected/lint 全通过。Next: 提交后归档并继续 game 未核模块。
>
> ## 下一位 Agent 提示词
>
> ```text
> 接手任务：CODE-QUALITY-3i game 对话资源与预缓存 UI 逐文件治理
> 任务卡：docs/ops/tasks/CODE-QUALITY-3i-game-dialog-precache-ui.md
> 当前状态：build；只能在五个白名单生产文件与对应测试内工作。
> 你的角色：Codex Coding Owner / 独立验收。
> 先读：AGENTS.md、CLAUDE.md、本卡、code-quality-file-ledger.md、五个生产文件及其真实 caller/测试。
> 请你做：逐文件记录职责、合法输入、失败/降级与现有反例；只修直接可证伪问题；测试必须少而精并保留有效负控。
> 不要做：不得修改 sw.ts、audio backend、剧情 E2E、生成资源、schema/save/migration 或 coverage runner。
> 输出要求：每个文件给 verified/review/blocked 结论；运行定向、game typecheck、pnpm check、support-mode ratchet、protected fast、lint；更新账本和卡，提交推送后才能标记 done。
> ```
