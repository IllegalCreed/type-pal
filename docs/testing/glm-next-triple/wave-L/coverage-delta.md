# Wave-L 隔离覆盖对照（2026-09-30）

口径：同分母隔离对照，不接官方基线、不改 ratchet。分母 = 冻结表 24 源的
v8 branch 总数（5381）。测试集 = 引用 24 源的 231 个既有测试文件 + 本卡 15 个新
`*.glm-l.test.ts(x)`；前后两次运行均 `env -u NODE_COMPILE_CACHE vitest run
--maxWorkers=2 --coverage --coverage.include=<24 源>`（相关测试子集），
after 集 1870/1870 通过（= 1803 既有 + 67 新增）。

| 源 | before | after | Δ |
|---|---|---|---|
| MapSelectionInspector.tsx | 97/122 | 110/122 | +13 |
| map-selection.ts | 211/228 | 213/228 | +2 |
| scene-stage.ts | 88/131 | 113/131 | +25 |
| scene-commands.ts | 79/104 | 96/104 | +17 |
| map-edit-commands.ts | 86/114 | 95/114 | +9 |
| map-asset-commands.ts | 56/78 | 62/78 | +6 |
| map-transform.ts | 115/131 | 121/131 | +6 |
| map-patch.ts | 147/161 | 153/161 | +6 |
| SpriteActionEditorDialog.tsx | 109/135 | 113/135 | +4 |
| stamp-draft.ts | 140/169 | 152/169 | +12 |
| StampTemplateDialog.tsx | 98/124 | 102/124 | +4 |
| stamp-group-command.ts | 58/79 | 75/79 | +17 |
| stamp-group-transform.ts | 119/138 | 126/138 | +7 |
| stamp-placement.ts | 82/95 | 84/95 | +2 |
| stamp-ownership.ts | 55/66 | 58/66 | +3 |
| **24 源合计** | **4249/5381（78.963%）** | **4382/5381（81.435%）** | **+133** |

分组：L01 +15、L02 +42、L03 +27、L04 +4、L05 +16、L06 +29。

零增益源的定性（与 README 排重账一致）：

- MapMode.tsx / SceneCanvas.tsx / TilesetTab.tsx / WorldSpriteLibrary.tsx /
  SpriteActionEditor.tsx / StampContentEditor.tsx /
  StampPlacementSelectionInspector.tsx / StampPlacementInspector.tsx：
  旧测密度高，本轮登记的剩余缺口均为多步竞态/上传向导/孤儿组件（见 README 未写项）。
- world-sprite-behavior.ts：深度守卫项停组上报（defect-report.md），
  「分支保守回退」为 existing-proof。

备注：定向覆盖运行（run5）之后，四个 core 测试文件的 EditorState 夹具重构为共享
typed fixture（`src/__tests__/glm-l/editor-state.ts`）以满足 typecheck；夹具不触碰
24 个被测生产源，运行行为与断言不变（重构后 5 文件 30/30 复跑通过、tsc 0 错误），
故生产分支数字不受影响。
