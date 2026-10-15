# CODE-QUALITY-2b - shared YJ2 位流与回引边界

Status: done
Phase: phase1 shared
Capability: ops / code-quality
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Contributor: Codex
Branch: codex/code-quality-governance
Base: `e295d9804`
Worktree: `/Users/zhangxu/illegal/type-pal-code-quality`
Last reviewed: 2026-10-16
Governance Owner: Codex（文档治理；非作者独立复核后根接收）
Template: task-card-v1 / 1.0.0

## 目标

保存2026-10-04至05日YJ2位流/回引边界修复：截断位流、负回引窗口和超目标写入明确失败，合法raw、重叠回引及early-EOS零填充不变。不能把早停零尾一概改成伪成功。

## 范围

仅yj2.ts、同域边界测试与历史账本；YJ1/MKF/RNG、资源类型、其它包和生成物不纳入实现。resources/tables等纯类型核验是后继账本分列，不算本卡修改；不增加任意尺寸上限。

## 前提与证据

原primary yj1.c的YJ2输出Length/位流/LZSS合同，现有fixture保留三字面、overlap、early-EOS。若合法PAL chunk需要尾部读零或空窗口回引、raw digest或合法fixture改变，应rework；本次只保存该历史可证伪边界。

## 验收

原bt byte boundary、preStart<0与回引超剩余长度三类guard；原反控移除guard后4条malformed测试失败并恢复。2626段/34,367,608B逐字节旧新对照及a66fbc5b55f324edba34e3c8b3304af64e412f07e3425d0cfd699ead160b9631保留。shared全包131与全仓记录129同时保留，原卡未解释差异，不能挑数合并。

## 状态与交接

原done/Owner身份保持。支持并行editor的official ratchet与protected fast在原记录通过；默认串行曾因editor单分支差额失败，独立归Q3c，不以本卡归档吞并。2026-10-16文档迁移经非作者history_cards_c_tail复核、根Codex独立接收，无旧build重启。

以下保留原标题入口。导航指向本卡历史原文或归纳；原命令、build/验收提示及分支操作只按其日期读取，不恢复执行。

### 前提真值门

历史内容见[前提与证据](#前提与证据)；按原时点读取。

### 反证与替代解释

历史内容见[前提与证据](#前提与证据)；按原时点读取。

### 上下文锚点

历史内容见[前提与证据](#前提与证据)；按原时点读取。

### 验收条件

历史内容见[验收](#验收)；按原时点读取。

### 当前模式推进记录

历史内容见[原始结论](#原始结论)；按原时点读取。

### Build / Review

历史内容见[原始结论](#原始结论)；按原时点读取。

### 交接日志

历史内容见[原始结论](#原始结论)；按原时点读取。

### 下一位 Agent 提示词

历史内容见[原始结论](#原始结论)；按原时点读取。

## 历史范围

10-04定位，10-05收口；原基点e295d9804。原shared test count127→131与同卡全仓shared129并列不同记录；未有足够run SHA/log解释其对应轮次，标guarded而非伪造统一口径。

## 当时证据

原卡69–75行保留shared16files/131、全仓shared129、support-mode门和默认runner失败；[账本](../../../audits/code-quality-file-ledger.md)63/76行登记raw与9cases，不解释131/129。本轮未读原raw压缩段或运行日志，也未执行反控。

## 当前有效性

historical；131/129计数差异guarded，历史正式门通过不升级为本轮通过。合法early-EOS尾零和overlap继续按原文保留，不因current-only政策删去仍合法的codec输入；不授任意fallback。

## 继任文档

[Q3c确定性卡](CODE-QUALITY-3c-editor-coverage-determinism.md)接续editor差额；[治理总纲](../../../audits/code-quality-governance.md)84行约束Q2仅codec/type子批。131/129由根后继治理保留出处，不要求用户替Agent选择数。

## 原始结论

保存2026-10-04至05日YJ2位流/回引边界修复：截断位流、负回引窗口和超目标写入明确失败，合法raw、重叠回引及early-EOS零填充不变。不能把早停零尾一概改成伪成功。

当轮验收范围：原bt byte boundary、preStart<0与回引超剩余长度三类guard；原反控移除guard后4条malformed测试失败并恢复。2626段/34,367,608B逐字节旧新对照及a66fbc5b55f324edba34e3c8b3304af64e412f07e3425d0cfd699ead160b9631保留。shared全包131与全仓记录129同时保留，原卡未解释差异，不能挑数合并。

完整原卡来自 Git blob `4df2fb09fc0e6ee2e7ab50c9935f4fbfba02f6d8`，source revision `bb90428668808368e816bd8e2ddeb5da57e4b166`；预审 `40bce2fb7fb8d19ff99b228063e337e1b3050fa2` 对应blob完全相同。引用每行仅增加 `> `，空行只增加 `>`，可逐字节逆回读。旧prompt、命令、临时路径与历史accept/done不构成本轮产品执行、当前测试质量或独立签收。

<!-- original-source-quote:start -->

> # CODE-QUALITY-2b - shared YJ2 位流与回引边界
>
> Status: done
> Phase: phase1 shared
> Capability: ops / code-quality
> Coding Owner: Codex
> Generation Owner: N/A
> Reviewer: Codex（独立验收）
> Visual Verification Owner: N/A
> Visual Verification Timing: N/A
> Contributor: Codex
> Branch: codex/code-quality-governance
> Base: `e295d9804`
> Worktree: `/Users/zhangxu/illegal/type-pal-code-quality`
>
> > Q2 的 MKF/RNG 子批已收。本卡只收 `packages/shared/src/yj2.ts` 的 malformed 输入边界；
> > `resources.ts` 与 `tables.ts` 是纯类型合同，已在逐文件账本登记为待核→本批核验，不改 schema 或生成物。
>
> ## 目标
>
> 让 YJ2 解压在位流截断、回引窗口落到输出之前或回引长度超过目标时显式失败；合法 raw、重叠回引和已有
> early-EOS 零填充合同保持不变。
>
> ## 范围
>
> - 范围内：`packages/shared/src/yj2.ts`、同域边界测试、shared/Q2 文档账本。
> - 范围外：YJ1、MKF/RNG、资源类型、extract/game/reforge/editor、原始数据和生成产物。
> - 明确不做：不把合法 early-EOS 改成必须填满；不增加任意尺寸上限；不降低 coverage/lint/typecheck 门。
>
> ## 前提真值门
>
> - 一句话工程前提：YJ2 文件头给出输出长度，位流和回引参数必须在输入/输出边界内；当前 `bt` 对位流越界静默读 `undefined`，回引负窗口/超目标也可能静默写入零。
> - 原版/primary：`reference/sdlpal/yj1.c:357-452` 的 YJ2 位读取、LZSS 回引与 `Length` 输出合同；C caller 只给真实压缩 chunk。
> - 第一阶段：`packages/shared/src/yj2.ts:116-206` 被 pal-extract/game/migrate 共用；现有 fixture 钉住三字面、重叠回引、early-EOS。
> - 当前二阶段：N/A；Reforge 仅消费已提取资源，不改变 codec 合同。
> - 目标：坏位流/坏回引 fail-loud，合法输出逐字节不变。
>
> ### 反证与替代解释
>
> - 最强替代解释：某些合法 PAL chunk 依赖源尾部读零或空窗口回引；直接跑 raw YJ2 census 与冻结向量验证，发现反例立即 rework/blocked。
> - 可证伪观察：任一真实 raw digest、合法 fixture、early-EOS 输出改变，或生产 caller 依赖坏输入静默成功。
> - 已排查：不改命令分类、地图/资源映射、生成物或测试 runner；只增加输入/目标边界失败 oracle。
>
> ## 上下文锚点
>
> - `CLAUDE.md:31-38`：第一阶段 raw/SDLPal 参考和修根因边界。
> - `reference/sdlpal/yj1.c:357-452`：YJ2 primary algorithm。
> - `packages/shared/src/yj2.ts:116-206`：当前生产解码器与静默越界点。
> - `packages/shared/src/yj2.boundaries.test.ts`、`rle.glm-o.test.ts`：合法/early-EOS/overlap 合同。
> - 不得重新引入：未定义字节读取、任意 compatibility fallback、输出零填充冒充成功（early-EOS 是明确保留例外）。
>
> ## 验收条件
>
> - 功能：位流读取越界、回引 `preStart < 0`、回引写出目标长度显式失败；合法真实 raw 与所有冻结向量不变。
> - 测试：YJ2 定向、shared 全包、相邻 caller、全仓 check、ratchet、受保护 fast、lint；受保护 fast 若仍受 CODE-QUALITY-3c 阻塞，保留为独立未决，不降门。
> - 文档：逐文件账本与治理路线同步；不改 `docs/testing/**`。
> - 视觉/E2E：N/A。
>
> ## 当前模式推进记录
>
> - Codex 范围/前提核验：verified（primary/raw/frozen oracle 已读，合法 early-EOS 明确保留）。
> - Coding Owner / 白名单：Codex；仅 YJ2、同域测试、本卡/账本/治理/看板/索引。
> - build 准入：Codex build allowed。
> - 独立验收：accept（真实 raw 逐字节、targeted/shared/full check、official ratchet、protected fast、lint 均有证据；editor 默认 runner 的时序差异单列 CODE-QUALITY-3c）。
>
> ## Build / Review
>
> - 实现：`bt` 对位流 byte boundary 显式失败；回引起点为负或长度超过输出剩余空间显式失败；合法 early-EOS 仍保留零初始化尾部。
> - 定向验证：YJ2/RNG/RLE 相邻 36/36；shared 全包 16 files / 131 tests；typecheck 通过。
> - 真实 raw 对照：用旧实现 `e295d9804` 与当前实现逐字节比较 ABC/F/FBP/FIRE/MAP/MGO 及 RNG 内层共 2,626 段、34,367,608 字节；失败 0；SHA-256 `a66fbc5b55f324edba34e3c8b3304af64e412f07e3425d0cfd699ead160b9631`。
> - 反控：临时移除三类 guard 后新增 malformed 测试有 4 条失败；生产文件已恢复，未把反控改动保留。
> - 全仓 `pnpm check`：docs/tools、content 149/149、shared 129/129、game 3391/3391、pal-extract 417/417、reforge 8682/8682、editor 605/4844、migrate 95/723、lint 3196 文件零诊断通过。
> - Official ratchet：支持的 `TYPE_PAL_COVERAGE_PARALLEL_EDITOR=1 pnpm coverage:ratchet` 通过并更新 baseline；shared 合法提升到 448/466 statements、204/218 branches、400/412 lines，test count 127→131，未降低其它包/总量。
> - Protected fast：`TYPE_PAL_COVERAGE_BASE_REF=b9ba7e0fa pnpm coverage:fast` 通过；七包范围、origin/main 保护线和零诊断均通过。默认串行 runner 曾因 editor 单分支抖动失败，已独立登记 CODE-QUALITY-3c，未放宽门槛。
> - 独立审查结论：accept；Q2b done allowed。Q3c 的 runner 确定性调查不阻止本批归档，但未被本卡吞并。
>
> ## 交接日志
>
> - 2026-10-04 Codex：shared 逐文件复核后定位 YJ2 `bt` 与回引边界为剩余可执行风险；resources/tables/events/input/index/rle-encode 先按直接类型/合同证据核验，不扩大实现范围。Next: 增加坏位流与坏回引反例，保持合法 raw。
> - 2026-10-05 Codex：YJ2 实现与反控完成；真实 raw 2,626 段/34,367,608B 逐字节一致。全仓 check/lint、支持并行 editor 的 official ratchet、protected fast 通过；shared baseline 合法上升。Next: 归档 Q2b，继续 Q3c/Q3 phase1 文件治理。
>
> ## 下一位 Agent 提示词
>
> 无；本批由 Codex 继续实现与独立验收。
