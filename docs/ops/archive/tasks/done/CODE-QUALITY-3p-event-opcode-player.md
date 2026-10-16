# CODE-QUALITY-3p - event player/equipment/poison opcode 逐文件治理

Status: done
Phase: phase1 game
Capability: ops / code-quality / phase1-mechanics
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Contributor: Codex
Branch: codex/code-quality-governance
Last reviewed: 2026-10-16
Governance Owner: Codex（文档治理；非作者独立复核后根接收）
Template: task-card-v1 / 1.0.0

## 目标

保存2026-10-05玩家属性/装备/HPMP/复活/毒/状态/魔法opcode单文件审计：按原role/slot/owner及C primary保留行为，原批无实现修改、无direct defect。

## 范围

仅event-opcode-player helper与公开/相邻测试caller；不接完整event-system、battle-opcodes、save/schema、raw/生成物或runner。不得把helper状态双写回event-system，也不重写opcode抽象。

## 前提与证据

原真值矩阵区分event dispatch和equipment/inventory/poison owner，保留role context、0xFFFF、SHORT/WORD、fScriptSuccess与合法no-op。若真实raw+caller证明改错role/slot/状态才修；本包未重读整份生产/测试或C，不能赋予当前机制深审信用。

## 验收

原7files/99tests、game3403、typecheck及全仓check/official ratchet/protected/Biome通过。原3专属测试与equipment/ownership相邻合同不能按7files重复算七新增记录；纯opcode合同不等剧情视觉。

## 状态与交接

原done和dfec903b3已推送记录保持；下半Build/Review的pending由80–85/117行最终无实现修改/accept/归档记录解释。保留旧pending原字节，不造新实现或执行旧build prompt；2026-10-16文档迁移经非作者history_cards_c_tail复核、根Codex独立接收。

以下保留原标题入口。导航指向本卡历史原文或归纳；原命令、build/验收提示及分支操作只按其日期读取，不恢复执行。

### 前提真值门

历史内容见[前提与证据](#前提与证据)；按原时点读取。

### 一句话行为 / 工程前提

历史内容见[前提与证据](#前提与证据)；按原时点读取。

### 真值矩阵

历史内容见[前提与证据](#前提与证据)；按原时点读取。

### 反证与替代解释

历史内容见[前提与证据](#前提与证据)；按原时点读取。

### 用户可见偏离

历史内容见[原始结论](#原始结论)；按原时点读取。

### 上下文锚点

历史内容见[前提与证据](#前提与证据)；按原时点读取。

### 验收条件

历史内容见[验收](#验收)；按原时点读取。

### 当前模式推进记录

历史内容见[原始结论](#原始结论)；按原时点读取。

### 进入 build 前：Codex 核定

历史内容见[原始结论](#原始结论)；按原时点读取。

### 进入 done 前：独立验收

历史内容见[原始结论](#原始结论)；按原时点读取。

### Draft: 设计与风险

历史内容见[原始结论](#原始结论)；按原时点读取。

### 设计结论

历史内容见[原始结论](#原始结论)；按原时点读取。

### 已知风险

历史内容见[原始结论](#原始结论)；按原时点读取。

### Build: 实现与自测

历史内容见[原始结论](#原始结论)；按原时点读取。

### Review: 审查与返工

历史内容见[原始结论](#原始结论)；按原时点读取。

### 交接日志

历史内容见[原始结论](#原始结论)；按原时点读取。

### 下一位 Agent 提示词

历史内容见[原始结论](#原始结论)；按原时点读取。

## 历史范围

2026-10-05高风险卡；原头未给Base字段，不补造历史Base。保留原“不要求固定三贤人”前言为当时模式记录，本次不追签或重开产品门。

## 当时证据

[总纲](../../../audits/code-quality-governance.md)138–141与[账本](../../../audits/code-quality-file-ledger.md)264–267列单实现/3测试历史登记；原卡82–85及117行给收口，101–112仍pending。两层均可回读，本包无新的parser/场景或旧测试执行。

## 当前有效性

historical。旧pending不把原done改为今天build，原accept也不能成为本次独立接受。合法slot fallback/no-op依原caller，不因复杂度或原模板空段改变行为。

## 继任文档

[Q3q](CODE-QUALITY-3q-game-scene-system.md)与[Q3r](CODE-QUALITY-3r-game-event-system.md)接续主流程；新反例按[现行工作流](../../../agent-workflow.md)更新前提后另准入。

## 原始结论

保存2026-10-05玩家属性/装备/HPMP/复活/毒/状态/魔法opcode单文件审计：按原role/slot/owner及C primary保留行为，原批无实现修改、无direct defect。

当轮验收范围：原7files/99tests、game3403、typecheck及全仓check/official ratchet/protected/Biome通过。原3专属测试与equipment/ownership相邻合同不能按7files重复算七新增记录；纯opcode合同不等剧情视觉。

完整原卡来自 Git blob `a8f70d603f4d95790f2f4e3f3e8f27d6ebd6ed41`，source revision `83750d8425709257a609c1b9f62b8c6686d53987`；预审 `bb90428668808368e816bd8e2ddeb5da57e4b166` 对应blob完全相同。引用每行仅增加 `> `，空行只增加 `>`，可逐字节逆回读。旧prompt、命令、临时路径与历史accept/done不构成本轮产品执行、当前测试质量或独立签收。

<!-- original-source-quote:start -->

> # CODE-QUALITY-3p - event player/equipment/poison opcode 逐文件治理
>
> Status: done
> Phase: phase1 game
> Capability: ops / code-quality / phase1-mechanics
> Coding Owner: Codex
> Generation Owner: N/A
> Reviewer: Codex（独立验收）
> Visual Verification Owner: N/A
> Visual Verification Timing: N/A
> Contributor: Codex
> Branch: codex/code-quality-governance
>
> > 本卡按高风险/第一阶段机制任务模板建立；当前临时模式由 Codex 独立核准与验收，不要求固定三贤人签字。
>
> ## 目标
>
> 逐文件核验 `event-opcode-player.ts` 的玩家属性、装备、HP/MP、复活、毒、状态、魔法 opcode 边界及其真实 `event-system`/equipment/inventory/poison callers；只修有 primary source + caller + 可证伪反例的问题，不改变事件格式或脚本产品取舍。
>
> ## 范围
>
> - 范围内：`packages/game/src/core/event-opcode-player.ts` 与其公开测试/相邻 caller 证据；`reference/sdlpal/script.c/global.c` 对应 opcode。
> - 范围外：完整 `event-system.ts`、battle-opcodes、save/schema/migration、生成物、剧情 E2E、覆盖率 runner。
> - 明确不做：不把 event opcode 全面重写为新抽象，不改原始 SSS/数据，不凭测试数量补覆盖。
>
> ## 前提真值门
>
> ### 一句话行为 / 工程前提
>
> 玩家 opcode 家族必须只修改其拥有的 GameState/equipment/inventory/poison 字段，并保持 C 端 role context、0xFFFF、SHORT/WORD、fScriptSuccess 和失败/空操作语义。
>
> ### 真值矩阵
>
> | 维度 | 当前真值 | 直接证据 |
> |---|---|---|
> | 原版 / primary source | `script.c` opcode 0x17–0x2F/0x41/0x55–0x56/0x8D，`global.c` poison/equipment/player fields | `reference/sdlpal/script.c`、`reference/sdlpal/global.c` 对应函数；逐项在审计日志记录行号 |
> | 第一阶段 | `event-system` 将玩家 opcode 委派给 `applyPlayerOpcode`，equipment/inventory/poison 为独立 owner | `packages/game/src/core/event-system.ts` dispatch caller；`equipment-state.ts`、`inventory-state.ts`、`player-poison-state.ts` |
> | 当前二阶段 | N/A（本卡只涉及 packages/game phase1） | `CLAUDE.md` 阶段规则 |
> | 本任务目标 | 六类输入/目标/失败语义每项有 caller、primary source、回归合同；未核项保持 review | 本卡验收记录与 file ledger |
>
> ### 反证与替代解释
>
> - 最强替代解释：某些 `return true` no-op、slot fallback、装备 inventory swap 是已核的原版容错/调用层职责，不应仅因静态复杂度改写。
> - 什么观察会推翻当前前提：真实 raw opcode + caller 证明 role 0xFFFF 被错误修改、装备 slot 越界污染、复活/毒/状态未按原版更新、或 `fScriptSuccess` 与 C 分支相反。
> - audit 红项替代根因：runtime 语义/命令分类先核；原版/第一阶段理解查 `script.c/global.c`；extractor/地图/数据解码若不涉及则 N/A；test model 必须使用公开 applyPlayerOpcode/event-system caller。
>
> ### 用户可见偏离
>
> - 是否主动偏离已核真值：no
> - `before -> after`：保持现行 opcode 行为，补齐直接证据与边界结论；如发现 bug，只修根因并不扩张玩法。
> - 代表场景：装备/中毒/复活脚本通过真实 event-system caller 作用于独立 GameState。
> - 用户裁决：N/A（不主动改变产品行为）。
>
> ## 上下文锚点
>
> - 已拍板决策 / 铁律：`AGENTS.md` 单一 owner、第一阶段 primary source、生成物上游、硬零诊断、测试少而精。
> - 代码锚点：`event-opcode-player.ts:57-317` dispatcher；`:334-427` HP/MP/level/magic helpers；`event-system.ts` player opcode caller；`dependency-ownership.test.ts` 跨模块 ownership。
> - 已知坑 / 审计文档：0xFFFF role context、0x0B equipment part base、id0 inventory guard、level99 equipment poison、原版 script success gates。
> - 不得重新引入：event-system 与 helper 双写状态、旧 shared command slice、无上游证据的 schema/save 兼容层。
> - 相关测试：`event-opcode-player.test.ts`、`.cov85.test.ts`、`.glm-next-wave.test.ts`、equip-effect tests、cross-module ownership tests。
>
> ## 验收条件
>
> - 功能：逐段核对所有 opcode 分支、owner、role/slot validation、C source 和 real caller；未发现问题也要登记 verified evidence。
> - 测试：定向/相邻 event-opcode/equip/poison/ownership tests；若改代码还要 game check、全仓 check、ratchet、protected fast、lint。
> - 文档：更新 ledger、卡、治理正文；review/done 归档必须和 board/index 同步。
> - 视觉 / 手工验证：N/A。
> - E2E：N/A；纯事件 opcode 合同，不做剧情视觉走线。
>
> ## 当前模式推进记录
>
> ### 进入 build 前：Codex 核定
>
> - Coding Owner / 隔离工作树 / 修改白名单：Codex / `codex/code-quality-governance` / 仅 event-opcode-player + 专属测试（若直接缺陷）。
> - 前提核验：verified（`script.c/global.c`、event-system caller、公开测试；可证伪观察已列）。
> - 范围、设计和验收条件：agree（audit-first；不主动改行为）。
> - 高风险用户产品裁决：N/A（不主动改玩法/存档/格式）。
> - build 准入结论：Codex build allowed。
>
> ### 进入 done 前：独立验收
>
> - 贡献者交付与自验：Codex；定向 7 files/99 tests、game 全包 3403、typecheck 通过；未改实现。
> - Codex 独立复核：accept（script/global primary source、event/equipment/inventory/poison callers、role/slot/SHORT/WORD/fScriptSuccess 合同逐段核对；全仓 check、official ratchet、protected fast、Biome 零诊断通过）。
> - 用户体验/产品验收：N/A（纯 opcode 合同）。
> - done 准入结论：Codex done allowed；提交 `dfec903b3` 已推送，独立 diff/status 核对通过；本卡只关闭 event-opcode-player，不代表 event-system/save/schema 或全仓治理完成。
>
> ## Draft: 设计与风险
>
> ### 设计结论
>
> 先完成逐段证据目录和公开 caller 合同；只在直接反例成立时追加最小回归/修复。保持 equipment/inventory/poison 的既有 owner，不把 helper 逻辑复制回 event-system。
>
> ### 已知风险
>
> - 风险：玩家 opcode 直接改变存档字段，误改会产生用户可见状态漂移。
> - 缓解：不做迁移/生成物修改；每条高风险分支对照 C 与真实 event-system 调用域；若 primary source 未定则留 review/blocked。
>
> ## Build: 实现与自测
>
> - Coding Owner: Codex
> - 修改文件: pending（审计优先）
> - 实现摘要: pending
> - 运行命令: 定向 event-opcode/equip/poison/ownership tests；随后全仓质量门
> - 浏览器 / 手工检查: N/A
> - 跳过的检查及原因: pending
>
> ## Review: 审查与返工
>
> - Reviewer: Codex
> - 审查结论: pending
> - 必须返工项: pending
> - Accept / rework: pending
>
> ## 交接日志
>
> - 2026-10-05 Codex：Q3o 已归档；本卡建立用于高风险 event player opcode 逐段 primary-source/caller 核验，不得越界改 event-system/save/schema。
> - 2026-10-05 Codex：event-opcode-player 全段核验；3 个专属测试/相邻 equipment/ownership 合同 99 tests 通过，未发现直接缺陷。全仓 check/ratchet/protected/lint 全通过。Next: 提交后归档，继续 event-system/scene-system 未核文件。
>
> ## 下一位 Agent 提示词
>
> ```text
> 接手任务：CODE-QUALITY-3p event player/equipment/poison opcode 逐文件治理
> 任务卡：docs/ops/tasks/CODE-QUALITY-3p-event-opcode-player.md
> 当前状态：build；只能在 event-opcode-player.ts 与白名单测试内工作。
> 你的角色：Codex Coding Owner / 独立验收。
> 先读：AGENTS.md、CLAUDE.md、本卡、script.c/global.c primary source、event-system/equipment/inventory/poison callers。
> 请你做：逐段核 role/slot/SHORT/WORD/fScriptSuccess/owner contracts；有直接反例才修。
> 不要做：不得修改 event-system 全文件、battle/save/schema/生成物/E2E/coverage runner，不得凭猜测改玩法。
> 输出要求：每个 opcode 分支 evidence + verified/review/blocked；运行定向、game typecheck、pnpm check、ratchet、protected fast、lint；通过后更新 ledger/卡、提交推送并标 done。
> ```
