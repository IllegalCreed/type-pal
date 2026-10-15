# TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1 证据

贡献者 GLM；源冻结 `9aa3bed892728f17c70d2f86d1fe07db10a718b8`（工作基 `38408cb82` + 本卡提交）。
候选测试：`packages/editor/src/ui/ItemUseEffectEditor.residual.glm.test.tsx`（R1/R3/R5 三合同）。

## 内容

- [counterproof.mjs](counterproof.mjs)：三态反控驱动 + 判据 + 自证。运行：
  `node docs/ops/evidence/TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1/counterproof.mjs`
  （驱动内硬编码本 worktree 绝对路径，换树须改 `repoRoot`；运行期禁并发编辑。）
- [receipts/](receipts)：每相位 vitest 原生 JSON（`*.json`）+ default reporter stdout 原样字节
  （`*.raw`）、stderr、汇总回执 `counterproof-receipt.json`（含冻结/变异/还原 sha、相位判据、
  判据自证 5 例、执行身份）。

## 相位结论

| 相位 | exit | 判据 | 红 fullName |
|---|---|---|---|
| green0 原始绿 | 0 | VALID | — |
| N1（R1 实体改选修复臂变异） | 1 | VALID | R1（恰一 AssertionError） |
| N2（R3 默认场景跳空变异） | 1 | VALID | R3（恰一 AssertionError） |
| N3（R5 失败通知捕获臂变异） | 1 | VALID | R5（恰一 AssertionError） |
| green2 还原绿 | 0 | VALID | — |
| replay-n1 末次首针重放 | 1 | VALID | R1（恰一 AssertionError） |

每针：产品锚点恰命中 1 处、运行后 `git checkout --` 精确还原、产品 sha 回到冻结值、被跟踪文件零脏；
测试文件 sha 反控前后一致。
