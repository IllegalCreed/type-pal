# CODE-QUALITY-3m - game battle core 合同逐文件治理

Status: done
Phase: phase1 game
Capability: ops / code-quality
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: N/A（纯公式/状态/坐标 helper）
Contributor: Codex
Branch: codex/code-quality-governance
Base: `07e2c1c39`
Last reviewed: 2026-10-16
Governance Owner: Codex（文档治理；非作者独立复核后根接收）
Template: task-card-v1 / 1.0.0

## 目标

保存2026-10-05六个battle core helper审计：公式、magic damage、status、queue、positions及seeded RNG按原primary/caller/反例保留，原批无实现修改或直接缺陷。

## 范围

仅formulas/magic-damage/status/turn-queue/battle-positions与core/rng；不改battle-system/progression/actions/save/schema、玩法或runner。现有dualMove缺dex2 fallback与RNG选择不能因C文本不同就改。

## 前提与证据

原SHORT/WORD、status寿命、队列与layout来自fight/battle/global/util及真实caller；本包窄读固定源rng.ts1–45/48，注释明确mulberry32不同于SDL LCG，D29比战斗结果而非RNG内部state。该读取不构成完整RNG测试/caller验收。

## 验收

原定向7files/128tests、game3400、typecheck及完整check/official ratchet/protected/Biome通过；六生产文件审计保留、未改实现。合法typed输入公式/排序/状态有争议应留review，不为模板重跑或更换随机模型。

## 状态与交接

原done、Codex身份及6c48c1390已推送记录保持，旧build prompt历史化。2026-10-16文档迁移经非作者history_cards_c_tail复核、根Codex独立接收；原纯helper结论不扩成battle-system/menu/save全域已审。

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

2026-10-05，原基点07e2c1c39；原ledger167/5review/2792待核是当时快照，128定向与3400全包不同分母，不能相加。

## 当时证据

[总纲](../../../audits/code-quality-governance.md)122–125与[账本](../../../audits/code-quality-file-ledger.md)211–221保留六文件范围和已有RNG差异。除rng窄段外，本包未全文重读六生产/原C公式/测试，不赋予当前数值正确性或测试质量签字。

## 当前有效性

historical。保留mulberry32及现行fallback是本卡旧合同，不由本次宣告新产品决定；同seed TS序列确定性不等于与SDL内部state相同。旧绿数不代表本轮coverage或机制认证。

## 继任文档

[Q3n](CODE-QUALITY-3n-game-core-fade-identity-catalog.md)接续identity/catalog；[Q3u](CODE-QUALITY-3u-game-battle-state-runtime.md)只相邻复核positions、不重复关闭。新反例按[现行工作流](../../../agent-workflow.md)另立卡。

## 原始结论

保存2026-10-05六个battle core helper审计：公式、magic damage、status、queue、positions及seeded RNG按原primary/caller/反例保留，原批无实现修改或直接缺陷。

当轮验收范围：原定向7files/128tests、game3400、typecheck及完整check/official ratchet/protected/Biome通过；六生产文件审计保留、未改实现。合法typed输入公式/排序/状态有争议应留review，不为模板重跑或更换随机模型。

完整原卡来自 Git blob `ce4a92a29c4e26cbfc9ff4bcd0a0914affcb3733`，source revision `83750d8425709257a609c1b9f62b8c6686d53987`；预审 `bb90428668808368e816bd8e2ddeb5da57e4b166` 对应blob完全相同。引用每行仅增加 `> `，空行只增加 `>`，可逐字节逆回读。旧prompt、命令、临时路径与历史accept/done不构成本轮产品执行、当前测试质量或独立签收。

<!-- original-source-quote:start -->

> # CODE-QUALITY-3m - game battle core 合同逐文件治理
>
> Status: done
> Phase: phase1 game
> Capability: ops / code-quality
> Coding Owner: Codex
> Generation Owner: N/A
> Reviewer: Codex（独立验收）
> Visual Verification Owner: N/A
> Visual Verification Timing: N/A（纯公式/状态/坐标 helper）
> Contributor: Codex
> Branch: codex/code-quality-governance
> Base: `07e2c1c39`
>
> ## 目标与范围
>
> 逐文件核验 battle core 的公式、magic damage、status tick、action queue、battle positions 和 seeded RNG，保持 `fight.c`/`battle.c` 公式、SHORT/WORD 语义、状态寿命、排序和坐标边界；只修有一手证据与可证伪反例的问题。
>
> - 白名单生产文件：`packages/game/src/core/battle/{formulas,magic-damage,status,turn-queue,battle-positions}.ts`、`packages/game/src/core/rng.ts`
> - 对应纯函数/战斗合同测试与真实 battle caller 只读核对。
> - 范围外：battle-system/progression/actions、save/schema、runtime 玩法取舍、E2E、覆盖率 runner。
>
> ## 前提真值门
>
> - 一句话前提：battle core helper 的数值、状态、队列和坐标输出在合法 typed 输入下保持已核实的第一阶段真值，坏输入不形成静默状态污染。
> - 真值来源：`reference/sdlpal/fight.c`、`battle.c`、`global.h`、`util.c` 对应行；各文件注释；battle-system/magic caller；既有公式/边界测试。
> - 当前 before -> 目标 after：`公式/状态 helper 的 caller 与 primary-source 证据分散 -> 六文件逐一登记公式、输入域、边界、反例和保留理由`。
> - 最强替代解释 / 推翻观察：某些 JS 近似（如 dualMove 缺 dex2 fallback、mulberry32 与 sdlpal LCG 不同）可能是明确产品/测试合同；若 primary source 或真实 caller 证明实际语义漂移才修，不用记忆替换现行实现。
> - 是否主动偏离已核真值：N/A（本批不主动改公式/战斗行为）。
>
> ## 上下文锚点
>
> - `AGENTS.md`：高风险公式/第一阶段机制需一手证据、可证伪反例、单一 owner、硬零诊断。
> - `CLAUDE.md`：sdlpal/原始数据真值边界；不要把 coverage 或大 census 当公式证据。
> - `docs/ops/audits/code-quality-file-ledger.md`：Q3l 后 167 个已闭合、5 个 review、2,792 个尚未核验；本卡不能把 game 全包绿灯当逐文件验收。
> - 不得重新引入：JS number 取代 SHORT/WORD 时的溢出/符号漂移、status 永久化、dualMove 顺序漂移、battle layout 重复来源、seed state 非确定性。
>
> ## 验证
>
> - 每个文件完整读取生产代码、primary source、真实 caller 和测试；未知公式争议保留 review/blocked，不擅自修行为。
> - 若修代码或改变合同：定向/相邻 battle tests、game typecheck、全仓 `pnpm check`、support-mode ratchet、protected fast、Biome 零诊断；纯审计也需记录实际验证范围。
>
> ## 当前模式推进记录
>
> - Codex 前提核验：verified（六文件纯 helper；公式 primary source 已列，暂不做产品取舍）。
> - build 准入：Codex build allowed；只有直接证据窄修可改实现。
> - 贡献者交付/自验：Codex；定向 7 files/128 tests、game 全包 3400、typecheck 通过；六个生产文件审计保留，未改实现。
> - Codex 独立验收：accept（formula/magic/status/queue/positions/RNG 的 primary source、真实 caller、反例合同逐段核对；全仓 `pnpm check`、official ratchet、protected fast、Biome 零诊断通过）。
> - 用户产品裁决/体验验收：N/A（不主动改变数值/战斗行为）。
> - done 准入：Codex done allowed；提交 `6c48c1390` 已推送，独立 diff/status 核对通过；本卡只关闭六个 core helper，不代表 battle core/system/menu/save 或全仓治理完成。
>
> ## 交接日志
>
> - 2026-10-05 Codex：Q3l 已归档；开始 battle core 合同窄批，先核公式/SHORT/WORD/状态/队列/坐标/RNG，未证实前不改实现。
> - 2026-10-05 Codex：六个 battle core helper 逐文件核验；SHORT/WORD、formula、status、dualMove、layout、seed state 合同均有 primary source/caller/tests，未发现直接缺陷。定向 128、game 全包 3400、全仓 check/ratchet/protected/lint 全通过。Next: 提交后归档，继续 battle core/system/menu/scene 未核文件。
>
> ## 下一位 Agent 提示词
>
> ```text
> 接手任务：CODE-QUALITY-3m game battle core 合同逐文件治理
> 任务卡：docs/ops/tasks/CODE-QUALITY-3m-game-battle-core-contracts.md
> 当前状态：build；只能在六个白名单生产文件及对应测试内工作。
> 你的角色：Codex Coding Owner / 独立验收。
> 先读：AGENTS.md、CLAUDE.md、本卡、code-quality-file-ledger.md、fight.c/battle.c/global.h/util.c 锚点、六个生产文件和真实 callers/tests。
> 请你做：逐文件核公式/SHORT/WORD/状态寿命/队列/坐标/RNG 输入域；只有 primary-source + caller + 反例直接证明问题才修。
> 不要做：不得修改 battle-system/actions/save/schema/E2E/coverage runner，不得凭记忆改公式或把 sdlpal LCG 偏好强行替换现行 RNG。
> 输出要求：每文件 verified/review/blocked；定向、game typecheck、pnpm check、support ratchet、protected fast、lint 全通过后更新账本、提交推送并标 done。
> ```
