# CODE-QUALITY-103 — Codex 当前逐文件复核（2026-10-17）

## 实际读取清单

- `packages/editor/src/ui/command-form-control.residual.glm.test.tsx`
- `packages/editor/src/ui/ItemUseEffectEditor.residual.glm.test.tsx`
- `packages/editor/src/ui/command-form-control.tsx`
- `packages/editor/src/ui/CommandForm.tsx`
- `packages/editor/src/ui/ScriptEditor.tsx`
- `packages/editor/src/ui/__tests__/command-form-current-fixture.ts`
- `packages/editor/src/ui/ItemTab.tsx`
- `packages/editor/src/ui/ItemUseEffectEditor.tsx`
- `packages/editor/src/core/edit-session.ts`
- `packages/editor/src/core/project-diagnostics.ts`
- `packages/editor/src/core/entity-address-references.test.ts`
- 相邻测试：`CommandForm.author-control-contracts.test.tsx`、`CommandForm.current-*.test.tsx`、`ScriptEditor.test.tsx`、`ScriptEditor.coverage-workflows-2.test.tsx`、`command-form-control.glm-large-wave.test.tsx`、`ItemUseEffectEditor.test.tsx`、`ItemUseEffectEditor.glm-m.test.tsx`、`ItemUseEffectEditor.kimi-workflows.test.tsx`、`ItemUseEffectEditor.glm-ui-wave.test.tsx`、`ItemTab.test.tsx`、`ItemTab.cov85.test.tsx`、`ItemTab.kimi-workflows.test.tsx`、`ItemTab.glm-m.test.tsx`。

## 逐文件结论

### `command-form-control.residual.glm.test.tsx` — review

测试使用真实 `commandForm` fixture。fixture 先用 `checkAuthorCommands`、真实
battle-trial loader、`CanonicalScriptBodyEditor` 和 DOM 双击打开表单；`finish`
再次验证输出 command 合同并确认只在完成时调用 `onChange`。唯一用例输入
`callScript` 的 `EntityAddress` 形状合法但 scene `gone` 不存在，精准检查
禁用的“引用失效”、实体原文输入框和重选 `start` 后的首个实体 `npc`，最终
断言完整提交。它与 `ControlCommandForm` 的不可达 `self` 臂分离，caller
是 `ScriptEditor` 的作者桥接路径，不是测试私有 state。

直接测试 0 stderr；相邻控制/ScriptEditor 运行虽全绿，但产生 act 诊断，故不
把本文件标成已验证。不存在重复实现或弱恒真断言；自动改绑和零伪造下拉是
对行为有判别力的两个反控轴。

### `ItemUseEffectEditor.residual.glm.test.tsx` — review

测试通过真实 `buildBlankProject`、作者文件 loader、`ItemTab`、`EditSession`、
`EditorHistoryCoordinator`、`assertProjectSaveValid` 和公开 status notice。
R1 断言无效实体保留与 sceneIndex 名称、保存门失败，改选 `e2` 后 schema
落库并通过，再 undo 恢复红态；R3 用 `start` 空实体场景和 `scene-res/e1,e2`
证明默认选择跳过空场景、完整字段落库、目标联动、history +1 和 undo；R5
用无实体项目证明类型选项仍可达、公开错误消息精确、history/spec/保存门不变。
这三轴补的是既有回调层测试未覆盖的 loader/sceneIndex/save-gate/failure
路径，和 K10/U1c/M02 的效果链、独占联动、默认值合同排重。

直接测试 0 stderr；P1 `puppet` 未自动补 `battleOnly` 是生产行为取舍，保留为
未决 product-counter，不在测试批修复。

## 质量结果

- 定向：2 files / 4 tests PASS，0 stderr / 0 diagnostics。
- 相邻：22 files / 224 tests PASS，exit 0；原始日志含 22 条 React `act(...)`
  诊断，主要来自 Harness、DsDraftNumberControl、DsDraftTextInput 和
  DsDraftTextArea 的未包裹异步更新。诊断没有被过滤或改写，因此相邻门为
  **FAIL（diagnostics non-zero）**。
- editor typecheck：PASS（`tsc --noEmit` + `scripts/tsconfig.author-check.json`）。
- 全仓 lint/docs/ledger：最近同一源码树已通过，分别为 lint 4962 文件 0/0/0、
  docs 0 issues、ledger 3307 / 231 / 15 / 3061；本批无源代码变更，覆盖率与
  full check 的既有失败/诊断不因本批文档复核而重写。

## 结论

两个文件已完整读取并有直接 caller/oracle 证据，状态从 `待核` 提升到 `review`；
不关闭文件，不声称全门通过。下一批应处理相邻 act 生命周期诊断，并在清零后
重新验收本批。
