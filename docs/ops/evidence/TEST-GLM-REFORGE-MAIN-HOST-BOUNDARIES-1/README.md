# TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1 — 交付证据

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: evidence-receipt-v1 / 1.0.0

本页把 ops evidence/review 接入 evidence-receipt-v1，并追加 archive-record 历史边界。原任务状态、合同、测试数字、失败、counter、consumer、机器证据和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 证据身份

- TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1 — 交付证据 的原始 receipt/review 身份、候选 SHA 和状态保留于 quote；本次迁移 source SHA 为 99643333e77f17ca4080daf38d73280c4ec80d94fa20d0fdc82ce2383caad4e5。

## 来源与输入

- caller/source refs、合法输入、版本和执行环境以原始证据与对应 task card 为准；本次只做静态迁移，不重跑。

## 断言与业务 oracle

- 原始业务 oracle、逐合同/逐针排重和失败边界保持原时点语义；历史“通过”不升级为当前 verified。

## 结果

- 原始结果、退出码、产物、warnings、counter 和未决项由 quote 保留；本页不补造执行结论。

## 限制与复核

- 本批未执行 runtime、E2E、视觉或 coverage。若重新启用，需当前 task card、合法输入、真实 caller/oracle、fresh receipt 和独立验收。

## 历史范围

- 源 revision 9e72e90307af540a28efaed4c235d3aef8672e6a；本轮 R68。历史 ops evidence 只作时点回执，不授权当前操作。

## 原始结论

- TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1 — 交付证据：原始正文完整保留于下方 quote。

## 当时证据

- 原始命令、测试、机器字段、SHA、counter 和链接保留于 quote。

## 当前有效性

historical。do not promote historical evidence receipt to current runtime/E2E/visual/coverage acceptance
- 当前事实由对应 task card、consumer、catalog 和 fresh receipt 决定。

## 继任文档

- 当前 canonical 文档：对应 task card、current consumer、paired machine evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、业务 oracle、独立 review 和静态零诊断。

## 原文保全

固定 source revision `9e72e90307af540a28efaed4c235d3aef8672e6a`，source SHA `99643333e77f17ca4080daf38d73280c4ec80d94fa20d0fdc82ce2383caad4e5`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1 — 交付证据
>
> - 基线：`origin/main` `cb12a63e2`；分支 `codex/glm-reforge-main-host-boundaries-r1`。
> - 产品/schema/API/旧测/config/baseline/真实数据零改动（`git diff origin/main..HEAD --stat` 仅本卡测试/脚本/证据/卡面/导航行）。
> - 合同与排重：[dedup-ledger.md](dedup-ledger.md)（5 新合同 + existing-proof + unreachable/缺陷登记）。
>
> ## 交付物
>
> - `packages/reforge/src/main.host-boundaries-1.test.ts`：5 条公开宿主编排合同（bootGame 级，
>   经 runtime-shell 真实 IDB/fixture 项目 + 外部 IO 边界失败注入；无产品 mock、无强转、无 skip）。
> - `packages/reforge/scripts/mhb1-mutation-counterproof.mjs`：严格三态反控驱动（mt1 r2 口径）。
> - `counterproof.json` + `counterproof-raw/*.identity.tsv|*.console`：全量执行集 identity 与原文。
> - `gates/`：定向/相邻/typecheck/lint/docs 门原始输出。
>
> ## 反控结果
>
> 见 [counterproof.json](counterproof.json)（再生：`node packages/reforge/scripts/mhb1-mutation-counterproof.mjs`，
> 尾步自动 biome format 回执）。**5/5 PASS**：baseline 全量 8778 测试/778 文件（identity 集合
> sha256 `fb7c2a9a…`）；每针红相位 exit 1、全量恰 1 failed 且 fullName 精确等于目标合同、唯一
> 指定 AssertionError（console 原文旁证）；恢复绿与 final-replay 的 identity 集合 sha256 与
> baseline 一致；四态源 hash/argv/env/mkdtemp finally 全记；runner 自测 11 例先行。
>
> 针选择披露（首轮 → 二轮）：MHB-SAVE-FAIL 首选「写队列毒化」变异（`saveWriteQueue = scheduled`）
> 会把 checkpoint-export.chain 的两条既有合同（写序/计数面）一并打红（3 failed），不满足恰一红口径；
> 预核（工作树手工变异，已字节还原）确认本卡测试在毒化变异下同样业务红后，正式针换为独占的
> `存档失败` 回执移除（`main.ts:4906`）。首轮 raw 已被二轮重生成覆盖，换针理由以 runner 内注释为准。
>
> ## 环境清理
>
> - 每测试 `afterEach` 收口真实战斗会话并 `host.close()`（监听器/位图/全局 stub 全还原）。
> - 反控脚本 try/finally 字节恢复 `main.ts` 并删除 mkdtemp 临时树；clean-tree 前置/逐针后置断言。
>
> ## 产品缺陷披露（不修产品，交裁决）
>
> - **D-1**：`?battle-scene=` 遭遇演出接线在投影视图上永找不到 startBattle 命令——
>   详见 [dedup-ledger.md](dedup-ledger.md) 第三节（一手锚点 + 实证靴记录）。
>
<!-- original-source-quote:end -->
