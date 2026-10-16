# CODE-QUALITY-3l - game battle present 逐文件治理

Status: done
Phase: phase1 game
Capability: ops / code-quality
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: dev-functional（战斗 canvas primitive；剧情视觉集中 E2E）
Contributor: Codex
Branch: codex/code-quality-governance
Base: `c740b4a48`
Last reviewed: 2026-10-16
Governance Owner: Codex（文档治理；非作者独立复核后根接收）
Template: task-card-v1 / 1.0.0

## 目标

保存2026-10-05 battle present七文件审计：背景、effect、数字、结算、精灵、UI与一帧装配的顺序/坐标/mask/寿命依原caller和primary核对；原批未改实现、未发现直接缺陷，不写成七处生产修复。

## 范围

原七个present/battle生产文件与直接测试/caller；不接battle core、公式、opcode、save/schema、剧情E2E或runner。背景index0不透明、mask及UI early-return等具体合同保留，不凭静态分支数量删除缺资源降级。

## 前提与证据

原真值源battle.c/uibattle.c/fight.c及present-battle装配caller；替代解释是空资源分支可能为启动降级或fixture合同。若合法BattleState/资源下层顺序、过期数字、opaque或跨帧状态有直接反例才修，未知坐标不凭截图或记忆重判。

## 验收

原14files/179tests、game3400、typecheck与check/official ratchet/protected fast/Biome通过，未改实现。原Visual Timing仅canvas primitive合同、剧情集中E2E，不从像素单测推成本轮浏览器或用户观感通过。

## 状态与交接

原Status done、Coding Owner/Reviewer等字段和b0c171c28已推送记录保持；旧fenced build/push提示只属当时交接。2026-10-16文档迁移经非作者history_cards_c_tail复核、根Codex独立接收，不重启原产品白名单。

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

2026-10-05，原基点c740b4a48；原接手ledger146/5review/2813待核是旧清单快照，不能与当前docs分母或今天代码总量混写。

## 当时证据

原卡46–54行保留179/3400、无实现变更与提交记录；[总纲](../../../audits/code-quality-governance.md)117–120及[账本](../../../audits/code-quality-file-ledger.md)190–210是历史后继登记。本包未全文重读七生产文件、C primary或旧测试，不继承原代码深审信用。

## 当前有效性

historical。原七文件审计不等于battle core/menu/dialog或全仓完成；缺资源降级、坐标/opaque边界仍需其当时caller解释，不能以文档模板认证当前产品行为、测试质量或视觉。

## 继任文档

[Q3m](CODE-QUALITY-3m-game-battle-core-contracts.md)接续core helpers；当前新工作按[现行工作流](../../../agent-workflow.md)重新准入，无可执行旧Agent提示词。

## 原始结论

保存2026-10-05 battle present七文件审计：背景、effect、数字、结算、精灵、UI与一帧装配的顺序/坐标/mask/寿命依原caller和primary核对；原批未改实现、未发现直接缺陷，不写成七处生产修复。

当轮验收范围：原14files/179tests、game3400、typecheck与check/official ratchet/protected fast/Biome通过，未改实现。原Visual Timing仅canvas primitive合同、剧情集中E2E，不从像素单测推成本轮浏览器或用户观感通过。

完整原卡来自 Git blob `e5c3c6c3f6a159abf4b13cd6a3bb4dbc43095053`，source revision `83750d8425709257a609c1b9f62b8c6686d53987`；预审 `bb90428668808368e816bd8e2ddeb5da57e4b166` 对应blob完全相同。引用每行仅增加 `> `，空行只增加 `>`，可逐字节逆回读。旧prompt、命令、临时路径与历史accept/done不构成本轮产品执行、当前测试质量或独立签收。

<!-- original-source-quote:start -->

> # CODE-QUALITY-3l - game battle present 逐文件治理
>
> Status: done
> Phase: phase1 game
> Capability: ops / code-quality
> Coding Owner: Codex
> Generation Owner: N/A
> Reviewer: Codex（独立验收）
> Visual Verification Owner: N/A
> Visual Verification Timing: dev-functional（战斗 canvas primitive；剧情视觉集中 E2E）
> Contributor: Codex
> Branch: codex/code-quality-governance
> Base: `c740b4a48`
>
> ## 目标与范围
>
> 逐文件核验 game battle present 的背景、特效、数字弹幕、结算屏、战斗精灵、战斗 UI 和一帧装配器，保持 `reference/sdlpal/battle.c`、`uibattle.c`、`fight.c` 的绘制顺序、坐标、mask、寿命和 UI 形态；只修有直接 caller/primary-source/反例证据的问题。
>
> - 白名单生产文件：`packages/game/src/present/battle/{draw-battle-bg,draw-battle-effect,draw-battle-num,draw-battle-settlement,draw-battle-sprites,draw-battle-ui,present-battle}.ts`
> - 对应测试与 caller 只读核对；不改 battle core state/formulas/opcodes、schema/save、剧情 E2E、coverage runner。
>
> ## 前提真值门
>
> - 一句话前提：battle present 的每层输出在合法资源和 BattleState 下与已核实 sdlpal 绘制顺序/坐标一致，缺失资源只走明确降级，不污染下一帧或下一场战斗。
> - 真值来源：各文件内 `reference/sdlpal/battle.c`/`uibattle.c`/`fight.c` 锚点；`packages/game/src/present/battle/present-battle.ts` 的真实装配 caller；对应 battle tests。
> - 当前 before -> 目标 after：`battle present 7 文件仅有分散测试/注释证据 -> 每个文件完成职责、caller、输入域、失败语义和反例记录`。
> - 最强替代解释 / 推翻观察：某些空资源分支可能是启动降级或单测 fixture 合同；若 primary source/caller 证明依赖则保留；若 battle overlay/数字/背景在非法尺寸、过期寿命、透明 mask 或跨帧状态上污染输出，则前提被推翻并修复。
> - 是否主动偏离已核真值：N/A（不改变战斗 UI 形态、坐标或玩法公式）。
>
> ## 上下文锚点
>
> - `AGENTS.md`：逐文件 ledger、硬零诊断、少而精测试、原版真值门。
> - `CLAUDE.md`：第一阶段忠实还原、indexed framebuffer/opaque mask、战斗 present 与 core 分层。
> - `docs/ops/audits/code-quality-file-ledger.md`：Q3k 后 146 个已闭合、5 个 review、2,813 个尚未核验；本卡不把 game 全包绿灯当逐文件完成。
> - 不得重新引入：battle 背景索引 0 被当透明、数字/精灵 mask 丢失、floating number 过期泄漏、战斗 UI 对话期/逃跑期错误显示、present 装配顺序漂移。
>
> ## 验证
>
> - 逐文件完整读源码、`present-battle.ts` caller 和 primary source/tests；未知项保留 review。
> - 若修代码：定向/相邻 battle present tests、game typecheck、全仓 `pnpm check`、support-mode ratchet、protected fast、Biome 零诊断；不以剧情截图替代战斗合同。
>
> ## 当前模式推进记录
>
> - Codex 前提核验：verified（battle present 小域；不触碰 core/save/schema）。
> - build 准入：Codex build allowed；只允许白名单窄修。
> - 贡献者交付/自验：Codex；定向 14 files/179 tests、game 全包 3400、typecheck 通过；未改实现。
> - Codex 独立验收：accept（七个生产文件逐段读取、primary source/caller/测试证据完整；未发现直接缺陷；全仓 `pnpm check`、official ratchet、protected fast、Biome 零诊断通过）。
> - 用户产品裁决/体验验收：N/A（不改 UI 形态/玩法）。
> - done 准入：Codex done allowed；提交 `b0c171c28` 已推送，独立 diff/status 核对通过；本卡只关闭七个 battle-present 文件，不代表 battle core/menu/dialog 或全仓治理完成。
>
> ## 交接日志
>
> - 2026-10-05 Codex：Q3k 已归档；开始 battle present 七文件窄批，先核 primary source、装配顺序和真实测试，再决定是否修实现。
> - 2026-10-05 Codex：七个 battle-present 生产文件与 `present-battle.ts` 真实 caller 逐段核验；未发现需修的直接证据问题。定向 179、game 全包 3400、全仓 check/ratchet/protected/lint 全通过。Next: 提交后归档，继续 battle/menu/dialog/core 未核文件。
>
> ## 下一位 Agent 提示词
>
> ```text
> 接手任务：CODE-QUALITY-3l game battle present 逐文件治理
> 任务卡：docs/ops/tasks/CODE-QUALITY-3l-game-battle-present.md
> 当前状态：build；只能在七个 battle-present 生产文件及对应测试内工作。
> 你的角色：Codex Coding Owner / 独立验收。
> 先读：AGENTS.md、CLAUDE.md、本卡、code-quality-file-ledger.md、battle.c/uibattle.c/fight.c 相关锚点、七个生产文件和真实 caller/tests。
> 请你做：逐文件核输入域/绘制顺序/坐标/mask/寿命/降级；只有直接证据问题才修，不改 battle core/schema/save/UI 形态。
> 输出要求：每文件 verified/review/blocked；定向、game typecheck、pnpm check、support ratchet、protected fast、lint 全通过后更新账本、提交推送并标 done。
> ```
