# CODE-QUALITY-3o - game core mode/history/poison/search 逐文件治理

Status: done
Phase: phase1 game
Capability: ops / code-quality
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: N/A（纯状态/搜索 helper）
Contributor: Codex
Branch: codex/code-quality-governance
Base: `f9daa6a29`
Last reviewed: 2026-10-16
Governance Owner: Codex（历史卡包 F 文档治理候选，待根线程独立接收）
Template: task-card-v1 / 1.0.0

## 目标

保存2026-10-05 history/mode/player poison/Confirm Search四helper审计：历史缓冲、顶层调度、毒槽/寿命和搜索cell/trigger按原caller保留，未改实现、未发现直接缺陷。

## 范围

原四core helper；不接event-opcode-player、scene/battle主流程、save/schema、生成物或runner。反直觉mode门、Search阈值、level>=99装备伪毒不能凭记忆重判。

## 前提与证据

原play/scene/global及bootstrap/event/scene caller核history session、mode门、poison slot与13-cell Search顺序。若跨实例串扰或真实primary/caller反证出现才升级；本包未全文重读四生产/测试或raw，不冒称当下全部状态合同已证。

## 验收

原5files/42tests、game3403、typecheck与check/official ratchet/protected/Biome全过；未改实现。保留原no-defect范围，不将测试绿或文件少改写成所有潜在边界都关闭。

## 状态与交接

原done、Codex身份及b9b078e1f已推送记录保持；旧fenced build/push prompt仅历史。2026-10-16文档候选待根非作者独立接收，不授产品修改或重新判断Search阈值。

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

2026-10-05，原基点f9daa6a29；186已闭合/5review/2773待核属于接手快照，42定向/3403全包不相加，也不当今天docs或代码治理进度。

## 当时证据

[总纲](../../../audits/code-quality-governance.md)133–136与[账本](../../../audits/code-quality-file-ledger.md)230–233保留四文件无缺陷及原合同；原卡46–54给42/3403与提交。没有本轮独立raw/session运行日志，不伪造历史环节重验。

## 当前有效性

historical。原fallback与搜索阈值按其阶段/caller读取，未核前不删；旧包级全门不能推广成event-system/battle/save全文通过，更不等本次视觉或coverage执行。

## 继任文档

[Q3p](CODE-QUALITY-3p-event-opcode-player.md)接续玩家opcode，[Q3q](CODE-QUALITY-3q-game-scene-system.md)接续移动/触发；新变更依[现行工作流](../../../agent-workflow.md)另准入。

## 原始结论

保存2026-10-05 history/mode/player poison/Confirm Search四helper审计：历史缓冲、顶层调度、毒槽/寿命和搜索cell/trigger按原caller保留，未改实现、未发现直接缺陷。

当轮验收范围：原5files/42tests、game3403、typecheck与check/official ratchet/protected/Biome全过；未改实现。保留原no-defect范围，不将测试绿或文件少改写成所有潜在边界都关闭。

完整原卡来自 Git blob `80c29e75c93b4eca74d87696646cdaac9794d80d`，source revision `83750d8425709257a609c1b9f62b8c6686d53987`；预审 `bb90428668808368e816bd8e2ddeb5da57e4b166` 对应blob完全相同。引用每行仅增加 `> `，空行只增加 `>`，可逐字节逆回读。旧prompt、命令、临时路径与历史accept/done不构成本轮产品执行、当前测试质量或独立签收。

<!-- original-source-quote:start -->

> # CODE-QUALITY-3o - game core mode/history/poison/search 逐文件治理
>
> Status: done
> Phase: phase1 game
> Capability: ops / code-quality
> Coding Owner: Codex
> Generation Owner: N/A
> Reviewer: Codex（独立验收）
> Visual Verification Owner: N/A
> Visual Verification Timing: N/A（纯状态/搜索 helper）
> Contributor: Codex
> Branch: codex/code-quality-governance
> Base: `f9daa6a29`
>
> ## 目标与范围
>
> 逐文件核验 `dialog-history.ts`、`mode.ts`、`player-poison-state.ts`、`scene-system-search.ts` 及真实 callers/tests；保持历史环形缓冲、顶层 mode 调度、毒状态寿命/槽位和 Confirm Search 的原版 cell/trigger 语义。
>
> - 白名单生产文件：上述 4 个 `packages/game/src/core` 文件。
> - 范围外：event-opcode-player、scene-system、battle-system、save/schema、生成物、E2E、coverage runner。
>
> ## 前提真值门
>
> - 一句话前提：四个 helper 的输入 ownership、状态生命周期、搜索网格与 mode 门控和现行 caller/第一阶段真值一致，异常输入不产生跨 session 污染。
> - 真值来源：`reference/sdlpal/play.c`/`scene.c`/`global.c`；`packages/game/src/core/mode.ts` caller ordering；bootstrap/event-system/scene-system callers；对应 tests。
> - 当前 before -> 目标 after：`小型 core helper 的职责和边界分散 -> 四文件逐项记录 caller、状态、反例和验证结论`。
> - 最强替代解释 / 推翻观察：mode 门控和 Search trigger 的反直觉阈值可能是 sdlpal 真值；若现有测试/primary source证明，保留不改；若 session history、poison slot 或 search hit 会跨实例串扰，则前提被推翻并修复。
> - 是否主动偏离已核真值：N/A。
>
> ## 上下文锚点
>
> - `AGENTS.md`：逐文件 ledger、硬零诊断、少而精测试和第一阶段真值门。
> - `CLAUDE.md`：原版 play/scene/global 行为与状态边界。
> - `docs/ops/audits/code-quality-file-ledger.md`：Q3n 后 186 个已闭合、5 个 review、2,773 个尚未核验。
> - 不得重新引入：history buffer 跨读档残留、mode tick 在阻塞等待中错误推进、level>=99 伪毒误判、Search trigger mode 阈值/格子顺序被凭直觉改写。
>
> ## 验证
>
> - 逐文件完整读取生产源码、真实 caller、primary source 和 tests；未知项留 review。
> - 若修代码：定向/相邻 game tests、game typecheck、全仓 `pnpm check`、support ratchet、protected fast、Biome 零诊断。
>
> ## 当前模式推进记录
>
> - Codex 前提核验：verified（四文件小域、primary source/caller 已列）。
> - build 准入：Codex build allowed；仅 direct evidence 窄修。
> - 贡献者交付/自验：Codex；定向 5 files/42 tests、game 全包 3403、typecheck 通过；四个生产文件审计保留，未改实现。
> - Codex 独立验收：accept（mode/history/poison/search primary source、真实 callers、边界合同逐段核对；全仓 `pnpm check`、official ratchet、protected fast、Biome 零诊断通过）。
> - 用户产品裁决/体验验收：N/A。
> - done 准入：Codex done allowed；提交 `b9b078e1f` 已推送，独立 diff/status 核对通过；本卡只关闭四个 core helper，不代表 event-opcode/scene-system/battle-system/save 或全仓治理完成。
>
> ## 交接日志
>
> - 2026-10-05 Codex：Q3n 已归档；开始 mode/history/poison/search 小批，先核 session ownership 和原版阈值，再决定是否修实现。
> - 2026-10-05 Codex：四个 core helper 逐文件核验；history/mode/poison/search 均保持既有 caller/primary 合同，未发现直接缺陷。定向 42、game 全包 3403、全仓 check/ratchet/protected/lint 全通过。Next: 提交后归档，继续 event-opcode/scene-system/battle-system 未核文件。
>
> ## 下一位 Agent 提示词
>
> ```text
> 接手任务：CODE-QUALITY-3o game core mode/history/poison/search 逐文件治理
> 任务卡：docs/ops/tasks/CODE-QUALITY-3o-game-core-mode-history-poison-search.md
> 当前状态：build；只能在四个白名单生产文件及对应 tests/callers 内工作。
> 你的角色：Codex Coding Owner / 独立验收。
> 先读：AGENTS.md、CLAUDE.md、本卡、code-quality-file-ledger.md、play.c/scene.c/global.c 锚点和四文件真实 callers/tests。
> 请你做：逐文件核 history/session、mode gates、poison slots/levels、search cells/thresholds；只有直接证据问题才修。
> 不要做：不得修改 event-opcode-player/scene-system/battle-system/save/schema/E2E/coverage runner，不得凭直觉改 trigger 阈值。
> 输出要求：每文件 verified/review/blocked；定向、game typecheck、pnpm check、support ratchet、protected fast、lint 全通过后更新账本、提交推送并标 done。
> ```
