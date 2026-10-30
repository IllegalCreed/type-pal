# CODE-QUALITY-103 — editor 残余测试逐文件复核（ControlCommandForm / ItemUseEffectEditor）

Status: review
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase2
Capability: editor / test-contract-precision
Visual Verification Timing: N/A（本批只审测试，不改 UI 或产品行为）

## 2026-10-17 Codex 当前复核

本批只包含两个此前账本 `待核` 的测试文件：

- `packages/editor/src/ui/command-form-control.residual.glm.test.tsx`
- `packages/editor/src/ui/ItemUseEffectEditor.residual.glm.test.tsx`

完整读取了两个测试文件及真实生产 caller、公共出口和相邻 oracle：
`CommandForm.tsx`、`command-form-control.tsx`、`ScriptEditor.tsx` 的
`CanonicalScriptBodyEditor`/`CanonicalCommandForm`/`EntityAddressEditor`，
`command-form-current-fixture.ts`，`ItemTab.tsx`、`ItemUseEffectEditor.tsx`，
`EditSession`/`project-diagnostics`/实体引用 collector，以及归档卡列出的
`ItemUseEffectEditor.test.tsx`、K10/U1c/M02 相邻合同。

### ControlCommandForm 残余合同

唯一测试通过 `checkAuthorCommands` 的合法 `callScript` 输入，使用真实
`CanonicalScriptBodyEditor` 双击→聚合编辑弹窗→`EntityAddressEditor` caller。
它验证悬空场景显示专属“引用失效”禁用项、实体保留为原始文本且不伪装成
可选 combobox，重选合法场景后自动绑定首个实体，并只在“完成”时提交完整地址。
`command-form-control.tsx` 的 `callScript`/`jumpScript` self 分支仍由作者
bridge 的实际分流排除；测试没有重复不可达分支，也没有 mock 私有 state。

### ItemUseEffectEditor 残余合同

三个测试均经真实 `ItemTab`、loader、`EditSession` 和公开 `onStatusNotice`
接线：R1 验证场景有效但实体失效时的 warning、sceneIndex 名称、实体修复、
保存门红→绿及单步 undo；R3 验证跳过首个无实体场景、`placeEntityInFront`
完整 schema、scene target 联动、保存门和 undo；R5 验证项目没有可放置实体
时选项仍可达、精确错误通知、零 history 漂移和状态不变。现有基础测试只
覆盖回调层的失效地址/切场景，不含真实 loader、sceneIndex、保存门或无实体
失败臂，因此这三项不是重复测试。归档卡登记的 P1（选择 `puppet` 未自动
补 `battleOnly`）仍是产品裁决项，本批不夹修、不用测试固化现状。

## 验证与未闭合项

- 定向：2 files / 4 tests PASS，0 stderr、0 React act 诊断。
- 相邻：22 files / 224 tests PASS，退出码 0，但有 22 条 React `act(...)`
  诊断，来源是相邻 M02/ItemTab 表单测试的异步状态更新未包在 `act`；该结果
  不能算硬质量门通过，已保留原始输出，不静音、不新增 ignore。
- editor typecheck：`tsc --noEmit` 与 author-check 均通过。
- 最近同一源码树的全仓 lint-zero、docs、ledger 通过；本批无源代码改动，未重复
 运行昂贵的全仓 coverage/check。全仓 coverage ratchet 的既有 shared/pal-extract
  回退和 editor 运行时诊断仍按 CODE-QUALITY-100/101 证据记录。
- 因相邻诊断和未决 P1，本批两个文件由 `待核` 转为 `review`，不是 `已验证`；
  账本预期为 `3307 / 231 closed / 17 review / 3059 pending`。

## 下一步

先单独开相邻 React act 诊断清理小批，逐文件核定真实异步 caller 和合法事件；
清理后重新跑这两个残余测试的定向/相邻回归。P1 `puppet`/`battleOnly`
若需产品行为改变，另开高风险卡并请求用户裁决。本卡不改产品、schema、旧测试
或覆盖率规则。
