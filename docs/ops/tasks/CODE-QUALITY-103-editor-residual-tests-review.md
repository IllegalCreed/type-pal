# CODE-QUALITY-103 — editor 残余测试逐文件复核（ControlCommandForm / ItemUseEffectEditor）

Status: review
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

保留原卡「CODE-QUALITY-103 — editor 残余测试逐文件复核（ControlCommandForm / ItemUseEffectEditor）」的任务归属与历史边界。原目标见原文(摘录:Reviewer: Codex（独立验收） Capability: editor / test-contract-precision Visual Verification Timing: N/A（本);本页治理不重开已终态任务。

## 范围

原卡含章节[CODE-QUALITY-103 — editor 残余测试逐文件复核（ControlCommandForm / ItemUseEffectEditor）、2026-10-17 Codex 当前复核、ControlCommandForm 残余合同、ItemUseEffectEditor 残余合同、验证与未闭合项、下一步],共0个原文链接。治理范围仅限文档角色、保全与链接处置,不改产品/测试/coverage。

## 前提与证据

固定main源3646B(SHA f1fde0819ea9);原卡前提按原时点保留。当前存活入口:无当前仓库内存活链接。

## 验收

本页治理验收=模板符合+原文逐字节保全+链接处置如实;原卡验收结论保持原时点(原Status:review),治理不改写。

## 状态与交接

review保持原语义;本治理候选为作者稿(partial/needs),交Owner非作者接收;无新执行授权。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3646B / SHA-256 f1fde0819ea966595cd425ac854cab8eedf0be23094369decbce9ca8bffb47e8；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
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
```
<!-- incremental-original-source:end -->
