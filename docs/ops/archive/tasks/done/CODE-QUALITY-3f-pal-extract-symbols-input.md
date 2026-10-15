# CODE-QUALITY-3f - pal-extract symbols 输入合同

Status: done
Phase: phase1 pal-extract
Capability: ops / code-quality
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Contributor: Codex
Branch: codex/code-quality-governance
Base: `5e1213f60`
Last reviewed: 2026-10-16
Governance Owner: Codex（文档治理；非作者独立复核后根接收）
Template: task-card-v1 / 1.0.0

## 目标

保存2026-10-05可选symbols.json的结构入口治理：坏JSON带路径失败，合法sidecar与缺文件{}保持；名字只是人读注释，不把注释写成事件数字真值。

## 范围

仅annotate的parseSymbols、CLI读取入口与专属回归/账本；不改opcode、数字ID、WORD fallback、raw或生成物。五种可选映射为item/spell/person/enemy/scene，不能扩大未知字段或额外要求Record键必须为数字。

## 前提与证据

直接读[事件schema](../../../../phase1/05-events-schema.md)121–145行，134–136说明可选增量名字、引擎不读且round-trip忽略。窄读annotate.ts1–80，parseSymbols20–35接受对象与可选字符串映射、拒绝null/数组/未知字段/非字符串值，再clone；本包未重读CLI全文。

## 验收

原缺文件{}、合法map annotate输出保持；17/17定向、pal-extract69files/421tests与typecheck/full check/support-mode ratchet/protected/lint为旧轮结果。不能将full绿数当本次sidecar实跑或补造raw日志。

## 状态与交接

原done、Coding Owner/Reviewer保持；原build准入只授权当轮输入校验。2026-10-16文档迁移经非作者history_cards_c_tail复核、根Codex独立接收，旧“继续逐文件治理”不授权本贡献者改产品。

以下保留原标题入口。导航指向本卡历史原文或归纳；原命令、build/验收提示及分支操作只按其日期读取，不恢复执行。

### 目标与范围

历史内容见[原始结论](#原始结论)；按原时点读取。

### 前提真值门

历史内容见[前提与证据](#前提与证据)；按原时点读取。

### 上下文锚点

历史内容见[前提与证据](#前提与证据)；按原时点读取。

### 验收条件

历史内容见[验收](#验收)；按原时点读取。

### 当前模式推进记录

历史内容见[原始结论](#原始结论)；按原时点读取。

### 交接日志

历史内容见[原始结论](#原始结论)；按原时点读取。

### 下一位 Agent 提示词

历史内容见[原始结论](#原始结论)；按原时点读取。

## 历史范围

2026-10-05，基点5e1213f60；前轮PNG419到本轮421是历史不同树，不相加、不回填今天基准。原Symbols cast风险和结构验证替换按时点保留。

## 当时证据

原卡24–26、37、48–50行提供schema/入口/输出与17/421；固定源parseSymbols和schema窄源已直接读。[账本](../../../audits/code-quality-file-ledger.md)43–45、111行登记Q3f/Q3g，不把同一annotate/CLI文件重复计新全文代码审查。

## 当前有效性

historical。数字ID真值与五map结构保留，不把名字当runtime输入或为模板扩schema；未重新执行annotate或核完全部caller/旧测试质量。结构强转不是本包继续删cast的授权。

## 继任文档

[Q3g](CODE-QUALITY-3g-pal-extract-cli-io.md)接续CLI总装审计；当前新工作按[现行工作流](../../../agent-workflow.md)另准入，无可执行旧Agent提示词。

## 原始结论

保存2026-10-05可选symbols.json的结构入口治理：坏JSON带路径失败，合法sidecar与缺文件{}保持；名字只是人读注释，不把注释写成事件数字真值。

当轮验收范围：原缺文件{}、合法map annotate输出保持；17/17定向、pal-extract69files/421tests与typecheck/full check/support-mode ratchet/protected/lint为旧轮结果。不能将full绿数当本次sidecar实跑或补造raw日志。

完整原卡来自 Git blob `40b42cf5ec9c5e077ff518c29ff362b59ee91325`，source revision `bb90428668808368e816bd8e2ddeb5da57e4b166`；预审 `40bce2fb7fb8d19ff99b228063e337e1b3050fa2` 对应blob完全相同。引用每行仅增加 `> `，空行只增加 `>`，可逐字节逆回读。旧prompt、命令、临时路径与历史accept/done不构成本轮产品执行、当前测试质量或独立签收。

<!-- original-source-quote:start -->

> # CODE-QUALITY-3f - pal-extract symbols 输入合同
>
> Status: done
> Phase: phase1 pal-extract
> Capability: ops / code-quality
> Coding Owner: Codex
> Generation Owner: N/A
> Reviewer: Codex（独立验收）
> Visual Verification Owner: N/A
> Visual Verification Timing: N/A
> Contributor: Codex
> Branch: codex/code-quality-governance
> Base: `5e1213f60`
>
> ## 目标与范围
>
> 为可选 `data/symbols.json` 建立 fail-loud 的纯结构校验，避免 CLI 把任意 JSON 强制 cast 成 `Symbols` 后在注释阶段深处崩溃；合法 symbols 和无文件 `{}` 行为保持。
>
> - 范围内：`packages/pal-extract/src/events/annotate.ts`、CLI 读取入口与专属边界测试、任务账本。
> - 范围外：事件数字 ID/opcode、WORD fallback、生成物、原始数据、运行时/UI。
>
> ## 前提真值门
>
> - Primary/第一阶段：`docs/phase1/05-events-schema.md:134-136` 明确 symbols 可选、只为 `_` 人读注释；`annotate.ts:9-87` 是当前类型和消费者；`cli.ts:204-206` 是无验证 JSON cast。
> - before → after：`任意 JSON cast 成 Symbols -> 入口只接受对象及可选 Record<string,string>，坏输入带路径显式失败`
> - 反证：合法 `{}`、合法 item/spell/person/enemy/scene map 的 annotate 输出改变即 rework；不修改数字命令。
> - 二阶段：N/A，仅第一阶段提取器输入边界。
>
> ## 上下文锚点
>
> - `CLAUDE.md:31-38`：提取器上游边界、生成物禁止单点改。
> - `packages/pal-extract/src/events/annotate.ts`、`cli.ts`：生产 caller。
> - 不得重新引入：`as Symbols` 绕过验证、未知字段静默吞掉、把 symbols 名字写成事件真值。
>
> ## 验收条件
>
> - 功能：缺失文件仍 `{}`；合法映射保真；null/数组/非字符串 map value/未知字段显式失败。
> - 测试：symbols parser/annotate 定向、pal-extract 全包、全仓 check、support-mode ratchet、protected fast、lint。
> - 视觉/E2E：N/A。
>
> ## 当前模式推进记录
>
> - Codex 前提核验：verified；build allowed；白名单只含 annotate/CLI 入口与专属测试/文档。
> - 独立验收：accept；定向/包级、全仓 check、support-mode ratchet、protected fast、lint 均通过，事件数字真值与生成物边界不变。
>
> ## 交接日志
>
> - 2026-10-05 Codex：CLI 对可选 symbols JSON 直接 cast，primary 文档确认它只是可选人读注释；开卡实现最小结构合同。Next: 先补 parser 反例与合法映射回归。
> - 2026-10-05 Codex：新增 `parseSymbols` 结构验证并接入 CLI；annotate 定向 17/17、pal-extract 69/421、typecheck 通过。Next: 跑全仓 check/ratchet/protected/lint。
> - 2026-10-05 Codex：全仓 check、support-mode ratchet、protected fast、lint 通过；symbols 合同闭合，归档 done。Next: 继续逐文件 CLI/game/content/migrate 治理。
>
> ## 下一位 Agent 提示词
>
> 无；本批由 Codex 继续实现与独立验收。
