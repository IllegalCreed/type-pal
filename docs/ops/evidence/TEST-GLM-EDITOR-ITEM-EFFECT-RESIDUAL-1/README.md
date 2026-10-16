# TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1 证据

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: evidence-receipt-v1 / 1.0.0

本页把 ops evidence/review 接入 evidence-receipt-v1，并追加 archive-record 历史边界。原任务状态、合同、测试数字、失败、counter、consumer、机器证据和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 证据身份

- TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1 证据 的原始 receipt/review 身份、候选 SHA 和状态保留于 quote；本次迁移 source SHA 为 fb34f6d069b761ad8f8ea565ab07a4f5963749447b7c9fd3640d90ecd1ab920a。

## 来源与输入

- caller/source refs、合法输入、版本和执行环境以原始证据与对应 task card 为准；本次只做静态迁移，不重跑。

## 断言与业务 oracle

- 原始业务 oracle、逐合同/逐针排重和失败边界保持原时点语义；历史“通过”不升级为当前 verified。

## 结果

- 原始结果、退出码、产物、warnings、counter 和未决项由 quote 保留；本页不补造执行结论。

## 限制与复核

- 本批未执行 runtime、E2E、视觉或 coverage。若重新启用，需当前 task card、合法输入、真实 caller/oracle、fresh receipt 和独立验收。

## 历史范围

- 源 revision 4ce17faa06c6ce05f4a4868de380e25d4854e575；本轮 R64。历史 ops evidence 只作时点回执，不授权当前操作。

## 原始结论

- TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1 证据：原始正文完整保留于下方 quote。

## 当时证据

- 原始命令、测试、机器字段、SHA、counter 和链接保留于 quote。

## 当前有效性

historical。do not promote historical evidence receipt to current runtime/E2E/visual/coverage acceptance
- 当前事实由对应 task card、consumer、catalog 和 fresh receipt 决定。

## 继任文档

- 当前 canonical 文档：对应 task card、current consumer、paired machine evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、业务 oracle、独立 review 和静态零诊断。

## 原文保全

固定 source revision `4ce17faa06c6ce05f4a4868de380e25d4854e575`，source SHA `fb34f6d069b761ad8f8ea565ab07a4f5963749447b7c9fd3640d90ecd1ab920a`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1 证据
>
> 贡献者 GLM；源冻结 `9aa3bed892728f17c70d2f86d1fe07db10a718b8`（工作基 `38408cb82` + 本卡提交）。
> 候选测试：`packages/editor/src/ui/ItemUseEffectEditor.residual.glm.test.tsx`（R1/R3/R5 三合同）。
>
> ## 内容
>
> - [counterproof.mjs](counterproof.mjs)：三态反控驱动 + 判据 + 自证。运行：
>   `node docs/ops/evidence/TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1/counterproof.mjs`
>   （驱动内硬编码本 worktree 绝对路径，换树须改 `repoRoot`；运行期禁并发编辑。）
> - [receipts/](receipts)：每相位 vitest 原生 JSON（`*.json`）+ default reporter stdout 原样字节
>   （`*.raw`）、stderr、汇总回执 `counterproof-receipt.json`（含冻结/变异/还原 sha、相位判据、
>   判据自证 5 例、执行身份）。
>
> ## 相位结论
>
> | 相位 | exit | 判据 | 红 fullName |
> |---|---|---|---|
> | green0 原始绿 | 0 | VALID | — |
> | N1（R1 实体改选修复臂变异） | 1 | VALID | R1（恰一 AssertionError） |
> | N2（R3 默认场景跳空变异） | 1 | VALID | R3（恰一 AssertionError） |
> | N3（R5 失败通知捕获臂变异） | 1 | VALID | R5（恰一 AssertionError） |
> | green2 还原绿 | 0 | VALID | — |
> | replay-n1 末次首针重放 | 1 | VALID | R1（恰一 AssertionError） |
>
> 每针：产品锚点恰命中 1 处、运行后 `git checkout --` 精确还原、产品 sha 回到冻结值、被跟踪文件零脏；
> 测试文件 sha 反控前后一致。
>
<!-- original-source-quote:end -->
