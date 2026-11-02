# TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1 — 交付证据

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-20
Template: evidence-receipt-v1 / 1.0.0

本页是 TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1 的交付证据：基线 origin/main `cb12a63e2`、分支 `codex/glm-reforge-main-host-boundaries-r1`；产品/schema/API/旧测/config/baseline/真实数据零改动（diff 仅本卡测试/脚本/证据/卡面/导航行）。

## 证据身份

- 交付物：main.host-boundaries-1.test.ts（5 条公开宿主编排合同，bootGame 级经 runtime-shell 真实 IDB/fixture 项目+外部 IO 边界失败注入；无产品 mock/强转/skip）；mhb1-mutation-counterproof.mjs（mt1 r2 口径）；counterproof.json+counterproof-raw（全量执行集 identity 与原文）；gates/（五门原始输出）。

## 来源与输入

- 反控 5/5 PASS：baseline 全量 8778 测试/778 文件（identity 集合 sha256 fb7c2a9a…）；每针红相位 exit1、全量恰 1 failed 且 fullName 精确等于目标、唯一指定 AssertionError；恢复绿与 final-replay identity 与 baseline 一致；runner 自测 11 例先行。
- 针选择披露：MHB-SAVE-FAIL 首选写队列毒化变异会把 checkpoint-export.chain 两条既有合同一并打红（3 failed 不满足恰一红），预核确认本卡测试同样业务红后正式针换为独占的存档失败回执移除（main.ts:4906）；首轮 raw 已被二轮重生成覆盖，换针理由以 runner 内注释为准。

## 断言与业务 oracle

- 5 合同：MHB-ENTRY-REVEAL-1 场景入场事务（fade-out 至全黑/onEnter runner fade-in 收口/揭幕后入账/槽释放）；MHB-SCRIPT-ERR-1 脚本错误回执（40 字符截断/槽同步释放/世界保持/重试成功）；MHB-TRIAL-DONE-1 ?battle= 试打全链（跳过入口 onEnter/真实战斗/试打结束:victory/结算恰一次）；MHB-TRIAL-ERROR-1 试打失败回执（敌队没有有效敌人/零战斗/宿主可操作）；MHB-SAVE-FAIL-1 存档失败回执（main.ts:4850-4901 doSave）。

## 结果

- 环境清理：每测试 afterEach 收口真实战斗会话 host.close()；反控 try/finally 字节恢复+mkdtemp 删除+clean-tree 断言。

## 限制与复核

- 产品缺陷披露 D-1（不修产品交裁决）：?battle-scene= 遭遇演出接线在投影视图上永找不到 startBattle 命令（一手锚点+实证靴记录见 ledger 第三节）。memory 补充：r1 已推 b0a458809/c48b4a4bd 待 Codex 验收。

## 历史范围

- TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1 r1 交付（5 合同+5 针）；固定源 revision 9e72e90307af…。

## 原始结论

- 五宿主编排合同；针选择换针披露；D-1 遭遇演出接线缺陷登记。

## 当时证据

- 反控结果与环境清理在 quote 保全。

## 当前有效性

historical。r1 时点待验收。

## 继任文档

当前结论归任务卡与 Codex 接收记录。

## 原文保全

固定 source revision `9e72e90307af540a28efaed4c235d3aef8672e6a`，source SHA `99643333e77f17ca4080daf38d73280c4ec80d94fa20d0fdc82ce2383caad4e5`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与固定原源逐字节相等（不 trim、不替换）。
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
