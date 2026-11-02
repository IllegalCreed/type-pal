# TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1 证据

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-20
Template: evidence-receipt-v1 / 1.0.0

本页是 TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1 的证据：贡献者 GLM，源冻结 `9aa3bed89`（工作基 `38408cb82`+本卡提交）；候选测试 `ItemUseEffectEditor.residual.glm.test.tsx`（R1/R3/R5 三合同）。

## 证据身份

- 候选：R1 实体失效保留、R3 转入放置实体跳空场景、R5 无实体失败通知零提交三合同（详见同卡 memory 历史：r1 已推 codex/glm-editor-item-effect-residual-r1）。

## 来源与输入

- counterproof.mjs 三态反控驱动+判据+自证（驱动内硬编码本 worktree 绝对路径，换树须改 repoRoot；运行期禁并发编辑）。

## 断言与业务 oracle

- 相位结论（每针产品锚点恰命中 1 处、运行后 git checkout -- 精确还原、产品 sha 回到冻结值、被跟踪文件零脏、测试文件 sha 反控前后一致）：green0 原始绿 exit0 VALID；N1（R1 实体改选修复臂变异）恰一 AssertionError；N2（R3 默认场景跳空变异）恰一 AssertionError；N3（R5 失败通知捕获臂变异）恰一 AssertionError；green2 还原绿；replay-n1 末次首针重放恰一红。

## 结果

- 三合同三针三态全 VALID；回执含冻结/变异/还原 sha、判据自证 5 例、执行身份（receipts/ 每相位 vitest 原生 JSON+default reporter stdout 原样字节）。

## 限制与复核

- 本页为 r1 时点证据；后续接收状态见中央记录（memory：保存门极性翻转/R3 转入跳空/R5 零提交三针三态全 VALID 待 Codex 验收）。

## 历史范围

- TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1 r1 三合同证据；固定源 revision 4ce17faa06c6…。

## 原始结论

- R1/R3/R5 三针三态全 VALID（恰一业务红）。

## 当时证据

- 相位表与回执结构在 quote 保全。

## 当前有效性

historical。r1 时点待验收；终态以 Codex 接收为准。

## 继任文档

当前结论归任务卡与 Codex 接收记录。

## 原文保全

固定 source revision `4ce17faa06c6ce05f4a4868de380e25d4854e575`，source SHA `fb34f6d069b761ad8f8ea565ab07a4f5963749447b7c9fd3640d90ecd1ab920a`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与固定原源逐字节相等（不 trim、不替换）。
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
