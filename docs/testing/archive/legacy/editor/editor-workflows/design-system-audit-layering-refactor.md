# F1 设计系统审计分层候选

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 F1 设计系统审计工具分层候选（Owner Codex；结构 `5d4fca38`、性能 `09196d3a`、测试 `559388d2`、反控 `93b7211b`；基点 `fd09c15c`，共同 main 基点 `origin/main@9fe9ea11`）的分项验证快照：AST/CSS/rules/report 四层边界拆分与等价性能修正；后续统一门与集成状态见[统一回执](../../ops/testing-records/architecture-continuation-integration.md)。

## Scope

- 对象=design-system-audit 工具分层（主文件 6428→4669 行；AST/CSS/rules/report 1215/463/68/110 行）；所属 ARCH-CONTINUATION-1；机账 design-system-audit-layering-refactor-evidence.json。

## Execution and assertions

| step | legal input | caller | machine assertion | business oracle |
|---|---|---|---|---|
| 分层所有权 | TSX 字面/class/style 事实缓存/作用域绑定/静态求值/可达 render flow | design-system-audit-ast.mjs | 不读 registry/CSS、不输出报告；未知 switch 连续空 case 归并同一 fall-through 入口（等价路径去重，default 后终端空 case 独立） | CSS/rules/report 各自独占 CSSOM+specificity/纯 allowlist 判定/JSON 读盘+exit；四层不反向 import facade，无运行期环 |
| 性能根因 | 未知 switch 重复展开同一返回分支、嵌套命令表单把相同 Row 路径扩到约 2.5 万次 | 三文件并发 15 秒性能测试 | 拆层前 15.13/16.75 秒超时；归并后冷 validateAdoption 2.407 秒、缓存复跑 0.240 秒、原三文件并发 29/29 | 未放宽 timeout、未减测试、未跳规则 |
| 回归与反控 | 新增 6 项（facade 身份/AST 条件 class/CSS scroll 合同/switch fall-through/终端空 case/report ports）；正式 gate 仍 100 生产文件+2 evidence-bound exceptions | Editor check + 六针反控 | TypeScript 无错、335 文件/2885 项全绿（maxWorkers=2）；control 10/10、六针全检出（精确 absolute file/fullName、唯一 loader marker、恰一 AssertionError、exit 1、五产品文件前后 hash 不变） | 工具结构与等价性能修正，未改 UI/schema/SAVE8/content20/registry/allowlist/adoption matrix/规则文案/违规身份/CSS/产品运行时 |

## Results

- 未证项：未运行全仓 check、官方 coverage ratchet、受保护 strict、Editor build、浏览器视觉或远端 CI；分层工具无用户可见 UI，视觉 N/A；性能数字是本机见证。
- F1 只报候选四层边界齐；须原接收对话在当前 main 合并并执行统一门后才可正式完成。

## Evidence

- 证据路径：本回执正文（quote 保全）；[六针反控工具](../../../../domains/editor/editor-workflows/tools/design-system-audit-layering-mutants.mjs)；临时摘要 /var/folders/…/summary.json（历史时点）。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| F1 候选 | 原文时点 | 四层拆分+等价性能修正 | 候选快照（未合 main） | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy editor/editor-workflows 的 F1 分层候选回执；固定来源与 source SHA 见下方保全节。

## 原始结论

四层边界齐+性能 15s 超时→2.4s（等价归并未删分支）；六针反控全检出；统一门留后续。

## 当时证据

分层行数、性能数字、反控判据与未证项清单在 quote 保全。

## 当前有效性

historical。候选未合 main；当前集成状态见统一回执与现行工具树。

## 继任文档

当前状态见 architecture-continuation-integration.md 与现行 design-system-audit 工具。

## 原文保全

固定源 revision `3dc90ad8f6dde5a7ddcafc6b749b61dd53152751`，source SHA `4b0f8c9615a24dff37b656fce79bcee648f4c4d6d6f2f30d5d3c99602b861db1`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # F1 设计系统审计分层候选
>
> 后续统一门与当前集成状态见[统一回执](../../ops/testing-records/architecture-continuation-integration.md)；下文为分项候选时的验证快照，
> 其中“不合 main/未跑统一门”不代表后续集成状态。
>
> Owner：Codex；基点 `fd09c15c`（分支共同 main 基点 `origin/main@9fe9ea11`）；结构实现
> `5d4fca38`，性能实现 `09196d3a`，测试 `559388d2`，反控 `93b7211b`；所属
> [连续治理卡](../../../../../ops/archive/tasks/done/ARCH-CONTINUATION-1-remaining-queue.md)。本候选不合 main、不运行共享全仓
> coverage 门；待原接收对话同步当前 main 后统一集成。结构化计数与未证项见
> [机账](design-system-audit-layering-refactor-evidence.json)。
>
> ## 分层与所有权
>
> - `design-system-audit-ast.mjs` 拥有可复用的 TSX 字面事实、class/attribute/style 事实缓存、作用域绑定、
>   静态求值和可达 render flow。它不读 registry、不读 CSS、不输出报告。未知 `switch` 现在把连续空 `case`
>   归并为同一 fall-through 入口，同时保留 default 后终端空 case 的独立继续路径；这是等价路径去重，不删分支。
> - `design-system-audit-css.mjs` 独占 CSSOM、specificity、条件场景、cascade、虚拟 DOM selector 与滚动合同缓存。
>   主编排只按 `{source, css}` 和 element metadata 调用，不再直接依赖 JSDOM/Specificity。
> - `design-system-audit-rules.mjs` 独占纯 allowlist schema/identity/active/stale/unapproved 判定；
>   `design-system-audit-report.mjs` 独占 JSON 读盘、stdout/stderr 与 exit code。报告通过窄 ports 消费规则和验证器。
> - `design-system-audit.mjs` 保留原公共出口及 route/adoption 编排；`validateAllowlist`/`evaluateAllowlist` 为原函数
>   身份 re-export，三个 CLI 出口仍由同一 facade 提供。新四层均不反向 import facade，不形成运行期环。
>   主文件 6428→4669 行；AST/CSS/rules/report 分别 1215/463/68/110 行。总行数增加只来自显式边界、注释与缓存，
>   不是删规则换缩表。
>
> ## 性能、回归与反控
>
> - 拆层前按三文件并发执行时，现有 15 秒性能测试曾分别在约 15.13/16.75 秒超时；隔离执行可通过，直接冷
>   `validateAdoption` 约 5.6 秒。根因是未知 `switch` 对连续空 case 重复展开同一返回分支，嵌套命令表单把相同
>   `Row` 路径扩到约 2.5 万次。没有放宽 timeout、减少测试或跳过规则。
> - 等价入口归并后，同机冷 `validateAdoption` 为 2.407 秒、同进程缓存复跑 0.240 秒；原三文件并发 29/29
>   通过。新增 6 项固定 facade 身份、AST 条件 class、CSS `scroll` 合同、switch fall-through、终端空 case 与
>   report ports/exit；正式 design-system gate 仍为 100 个生产文件、2 个 evidence-bound exceptions。
> - Editor `check` 通过：TypeScript 无错，335 文件/2885 项全绿（`maxWorkers=2`）。候选实现、测试与反控文件
>   Biome 通过。
> - [六针反控](../../../../domains/editor/editor-workflows/tools/design-system-audit-layering-mutants.mjs)覆盖 AST 条件 class、switch 去重、终端空 case、CSS
>   `scroll`、allowlist 三轴身份和报告 adoption exit。control 10/10、六针全检出；精确 absolute file/fullName、
>   唯一 loader marker、恰一个 `AssertionError`、exit 1、无环境/timeout 异常，五个产品文件前后 hash 不变。
>   临时摘要：
>   `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-design-audit-layering-mutants-3vS4vw/summary.json`。
>
> ## 保持项与未证项
>
> 本批只有工具结构和等价性能修正，没有改变 UI、schema、SAVE8/content20、registry、allowlist、adoption matrix、
> 规则文案、违规身份、CSS 或产品运行时代码；没有启动 6010、读写正常存档、改生成资产或官方覆盖率基线。
>
> 未运行全仓 check、官方 coverage ratchet、受保护 strict、Editor build、浏览器视觉验证或远端 CI。分层工具没有
> 用户可见 UI，视觉验证 N/A；性能数字是本机见证，不冒充跨机器基准。F1 只报候选四层边界齐；须原接收对话在
> 当前 main 上合并并执行统一门后才可正式完成。
>
<!-- original-source-quote:end -->
