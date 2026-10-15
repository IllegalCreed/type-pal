# CODE-QUALITY-3g - pal-extract CLI IO 与失败边界

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
Base: `abb759ceb`
Last reviewed: 2026-10-16
Governance Owner: Codex（历史卡包 D 文档治理候选，待根线程独立接收）
Template: task-card-v1 / 1.0.0

## 目标

保存2026-10-05CLI总装IO/失败策略的只读审计结论：原卡未发现新增直接缺陷，没有实现改动。把边界登记清楚，不能改写成已修复生产问题或因行数完成全仓治理。

## 范围

原审计覆盖CLI raw输入、OUT清理、写盘、可选资源降级、round-trip及manifest；已收codec/事件/PNG/symbols子批不重复领，raw和extracted格式不变。当前文档治理不执行CLI、不接手其实现。

## 前提与证据

原最强替代解释是try/catch可能承载PAL空槽/未压缩合法降级，须有真实caller/oracle才改。原卡声称73–896行分段读取：OUT有固定suffix guard且保留videos，round-trip fail-loud、manifest最后写；本包未全文重读CLI，不能把原审计陈述变为本轮源码验收。

## 验收

原卡选择纯审计路径，只登记直接证据与当时包级/full check/support-mode ratchet/protected/lint通过；没有独立新增缺陷修复数或定向测试数可补造。未知候选不得凭静态行数删除，生成物不手工补丁。

## 状态与交接

原Status done及Codex身份保持。末尾“未获build准入前不得修改实现/标done”是旧提示残留；以10-05完整审计且归档done的后继日志解释，不重发prompt，也不把旧build allowed扩成今天实现授权。文档候选待根独立接收。

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

2026-10-05、基点abb759ceb；先已有symbols子批，其余CLI留review，后73–896审计归档。原卡没有新产品代码commit或独立raw执行SHA，不由本次补造。

## 当时证据

原卡44–51行是总装审计及无缺陷结论；[账本](../../../audits/code-quality-file-ledger.md)111行保留同一73–896历史范围。两份文档一致不构成本轮重新执行或第二份独立runtime证据；本包只全文读任务卡，未全文读CLI。

## 当前有效性

historical。只读审计完成不等于有生产问题被修复；原CLI降级/caller结论不在本轮重新认证，旧全绿不授当前测试质量或覆盖率。尾部旧pending提示不改变历史done，也不恢复新build。

## 继任文档

[Q3h](CODE-QUALITY-3h-game-assets-shell.md)接续game窄域；未来CLI变化按[现行工作流](../../../agent-workflow.md)重新核caller与反证。无可执行的旧下一位Agent提示词。

## 原始结论

保存2026-10-05CLI总装IO/失败策略的只读审计结论：原卡未发现新增直接缺陷，没有实现改动。把边界登记清楚，不能改写成已修复生产问题或因行数完成全仓治理。

当轮验收范围：原卡选择纯审计路径，只登记直接证据与当时包级/full check/support-mode ratchet/protected/lint通过；没有独立新增缺陷修复数或定向测试数可补造。未知候选不得凭静态行数删除，生成物不手工补丁。

完整原卡来自 Git blob `681d9715acecacd14ebbb5622479270a886180c5`，source revision `bb90428668808368e816bd8e2ddeb5da57e4b166`；预审 `40bce2fb7fb8d19ff99b228063e337e1b3050fa2` 对应blob完全相同。引用每行仅增加 `> `，空行只增加 `>`，可逐字节逆回读。旧prompt、命令、临时路径与历史accept/done不构成本轮产品执行、当前测试质量或独立签收。

<!-- original-source-quote:start -->

> # CODE-QUALITY-3g - pal-extract CLI IO 与失败边界
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
> Base: `abb759ceb`
>
> ## 目标与范围
>
> 逐段核验 `packages/pal-extract/src/cli.ts` 的 raw 输入、输出清理、写盘、异常降级和 round-trip 失败策略；只有有直接 caller/oracle 证据的问题才修复，保持 data/raw、data/extracted 生成物格式和事件数字真值。
>
> - 范围内：CLI 总装入口、文件/目录安全 guard、写盘原子性/失败传播、可选资源降级、全量 round-trip 自检。
> - 范围外：已收 Q1–Q3f 的 codec/事件/PNG/symbols 子批、迁移器、runtime/UI、E2E。
> - 明确不做：不在 `data/extracted` 或 `projects/pal` 手工补丁；不把覆盖率缺口直接当生产缺陷；不改变资源格式。
>
> ## 前提真值门
>
> - Primary/第一阶段：`CLAUDE.md:31-38` 提取物可重生成、原始数据为真；`reference/sdlpal` 只解释读取方式。
> - 当前入口证据：`cli.ts:188-206` 清理 guard/共享输入；`:260-290` round-trip/事件写盘；`:299-890` 表、图像、音频、地图、sprite、manifest 全量写盘。
> - before → after：`CLI 失败/清理/降级语义分散且候选未核 -> 每个边界有直接 caller、反例和保留理由`
> - 最强替代解释：现有 try/catch 是 PAL 原始资源的合法未压缩/空槽降级；若真实 raw 或现有测试证明依赖，保留并登记，不擅改。
>
> ## 上下文锚点
>
> - `AGENTS.md` 单 Owner、生成物上游、零诊断和测试质量规则。
> - `packages/pal-extract/src/cli.ts` 全量生产 caller；`resources/*` 与 shared codec ledger 条目。
> - 不得重新引入：无 guard 的递归删除、输出目录越界、异常吞掉后写伪造 manifest、旧版本 fallback。
>
> ## 验收条件
>
> - 逐段文件清点写入账本；未知候选留 review/blocked，不凭静态行数删除。
> - 若修代码：定向/相邻、pal-extract 全包、全仓 check、support-mode ratchet、protected fast、lint；若纯审计：记录直接证据与已跑全包/全仓门，不标生产问题已修。
> - 视觉/E2E：N/A（纯 CLI/IO；剧情视觉延后）。
>
> ## 当前模式推进记录
>
> - Codex 前提核验：verified（范围明确；symbols 子批已收，其余 CLI 仍待证）。
> - build 准入：Codex build allowed（本批为只读审计，无实现改动）。
> - 独立验收：accept；完整 CLI 分段 caller/清理/写盘/降级/manifest 直接复核，pal-extract/full check、support-mode ratchet、protected fast、lint 均通过；未发现需修的直接证据问题。
>
> ## 交接日志
>
> - 2026-10-05 Codex：CLI 已直接读过并完成 symbols 子批；账本将其余总装 IO/失败策略保留 review。Next: 分段核验清理、写盘、降级与 manifest 的真实调用域。
> - 2026-10-05 Codex：完成 73-896 行全量分段审计：OUT 清理有固定 suffix guard 且保留 videos，round-trip fail-loud，资源异常降级均有 caller 注释，manifest 最后写入；未发现新增直接缺陷。全包/full check、ratchet/protected/lint 通过，归档 done。
>
> ## 下一位 Agent 提示词
>
> 无；当前由 Codex 继续诊断，未获 build 准入前不得修改实现文件或标记 done。
