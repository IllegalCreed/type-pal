# F1 设计系统审计分层候选

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision 3dc90ad8f6dde5a7ddcafc6b749b61dd53152751；本轮 R78。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- F1 设计系统审计分层候选：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

## 当时证据

- 原始命令、输入、caller/oracle、结果、机器字段、SHA、counter、链接和未执行项保留于 quote。

## 当前有效性

historical。历史测试结论必须带日期和 source revision，并由当前 catalog、contract、fresh receipt 重新核定。

## 继任文档

- 当前入口：对应 testing catalog/domain report、contract、paired evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、真实 caller/oracle、排重、独立 review 和静态零诊断。

## 停止线

- 本页不证明 runtime、E2E、视觉、coverage 或当前产品行为；不得以 archive wrapper 替代执行回执。

## 原文保全

固定 source revision `3dc90ad8f6dde5a7ddcafc6b749b61dd53152751`，source SHA `4b0f8c9615a24dff37b656fce79bcee648f4c4d6d6f2f30d5d3c99602b861db1`；下方 quote 可逆回原始 UTF-8 字节。
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
