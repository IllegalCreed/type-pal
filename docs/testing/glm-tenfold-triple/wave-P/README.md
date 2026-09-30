# Wave P：Editor全域残余工作流十倍包

Owner GLM P；[任务卡](../../../ops/tasks/TEST-GLM-WAVE-P-1-editor-residual-tenfold.md)、
[共同协议](../README.md)、[冻结表](../targets.json)。分支 `codex/glm-wave-p-editor-residual-r1`
（自派发提交 `8b3ca062953b17a12178f8d1a9e36657971234b1` 新建独立 worktree）。
当前 build allowed（仅白名单新测试/专属证据），交付 pending；不合 main、不标 done。

目标：70合同工作组/700新用例/50有效反控/20条实际自有工程功能流程。
最终计数、dispatch/候选完整SHA、反控、私有同分母对照与未证项由Owner从树生成后填写。
L/M及更早Editor断言只读排重；不能将产品缺陷修复或UI取舍夹进测试。

## 当前候选（从树生成，2026-10-01）

| 项 | 数量 | 说明 |
|---|---:|---|
| 合法新用例 | **70 / 700** | 全部绿；逐条见 [contracts.json](contracts.json)、最终实跑 [directed-vitest.json](directed-vitest.json) |
| 合同工作组 | **14 / 70** | P01-G01…G11（11 组）+ P02-G01…G03（3 组）；合同文件 6 个 + 专属 fixture 1 个 |
| 有效反控 | **10 / 50** | P01-C01…C05、P02-C06…C10；三态证据在 [counters/](counters/)，索引 [counters.json](counters.json) |
| 浏览器真实流程 | **0 / 20** | 未执行，见下「未完成项」 |
| 私有同分母 coverage | 见 [coverage-delta.json](coverage-delta.json) | before/after 同命令同排除项，v8，私有目录，不写官方 baseline |

- 候选 HEAD：见 [receipt.json](receipt.json)；production freeze `3ac9a2e2f6aba8a5cc97640c18fef8549d199380`。
- 末次门禁：Editor 定向 70/70 绿；Editor 全包（含新文件）与 typecheck、根 lint、
  `git diff --check`、verify-targets 结果记录于 receipt.json。

## 已完成范围

### P01 项目打开/恢复/只读作者检查/保存preflight与真实受控IO（52 例 + 5 反控）

- `core/project-io.glm-p.test.ts`（G01–G05）：serializeProject 守卫残余、toEditorState
  投影别名/隔离、diffFiles 纯核、preflight battle-simulator/identity 臂、writeProject
  真实受控 IO（copy 让位、非 firstSave 拒绝、增量 prevSnapshot 精确写集、进度不提早
  100%、目录创建、成功后无本页恢复意图、manifest 引用表最后 close）。
- `core/project-diagnostics.glm-p.test.ts`（G06–G07）：保存门尚未断言过的分段前缀
  （世界变量缺注册表路径/场景/敌人/共享脚本/对话身份/实体引用/开局资源键/资源注册表/
  内容引用 mapId 臂）与聚合诊断残余（missing-scene objectId 与 #序号、resources issue
  形状、catalog 非法跳过资产闭包、#24 在场静默、状态收集器身份快路径）。
- `core/editor-asset-io.glm-p.test.ts`（G08–G11）：editor-asset-reader 直读合同、
  classifyDirectoryPicker 四臂、seed 克隆清单归一化/重复拒绝、另存为缺源基线证据拒绝。

### P02 MapMode选区/图层/资产/变换/SceneCanvas 残余（18 例 + 5 反控，部分完成）

- `ui/MapSelectionInspector.glm-p.test.tsx`（G01）：警告文案四臂、层计数语义（按层不按
  槽）、跨层摘要与范围、纯格点「无视觉层」、Enter 直提高度、tileId 负数校验。
- `ui/LayerStackControls.glm-p.test.tsx`（G02）：聚焦切换 aria-pressed/文案互斥、显示
  高度滑杆回调、add/delete 禁用原因段与最小层规则、同因共享单段。
- `ui/IsometricEditorToolbar.glm-p.test.tsx`（G03）：工具选项托盘键盘合同（开盘、
  Home/End/Arrows、Escape 回焦、disabled 臂、绘制高度枚举提交），含 portal 焦点
  时序的有界等待固定。

## 未完成项（如实登记，不灌水）

- **P02 剩余**：MapMode.tsx 主体交互（313 暗区分支，catalog/kimi 套件已证目录与
  选区工作流主干）、SceneCanvas（35）、PreviewCanvas（86）暗区臂未动。
- **P03–P10 十分之八未开工**：ScriptEditor/canonical、actor、battle field、sprite、
  item/shop、skill/poison、locale/stamp/tileset、App 生命周期域各无新文件。
- **20 条浏览器流程未执行**：需要 dev server + 浏览器会话的自有小工程实操证据
  （截图 SHA、console 分类、前后相位差分）；本轮未启动，不以上述 vitest 冒充。
- **反控 10/50**：每已完成批各 5 枚（P01/P02），后续批未产出。
- 反控计数口径：P01-C03 单针使同一守卫的两条契约测试同红（该守卫的正/负控两合同），
  无无关红、无超时红、恢复后全绿；receipt 原始 JSON 可复核。
- `open-actions.ts:293`「另存为缺少源项目读取证据」在 typed 公开入口不可达
  （sourceDir 或 evidence.source 二者必有其一使 observed 就绪），登记 unreachable；
  实际断言了其前置守卫「另存为缺少源项目基线」的拒绝合同（P01-G11）。
- L/M 及更早 Editor 断言已逐组在文件头去重说明；重复的 undo 换值/DOM 快照未计入。

## 环境事实（复现注意）

- worktree 需复制 gitignored `projects/pal/assets/{migrated,runtime}`，否则 2 个
  既有 world-sprite 测试因缺 `.rle` 失败（候选树非产品回归）。
- Editor 全包 coverage 需排除四个静态 adoption 门
  （`src/ui/design-system/*adoption*.test.ts`、`field-commit-boundary.test.ts`）：
  插桩下这些门源码扫描超时（与 Wave L 记录的负载漂移同型），且 vitest 在任何
  测试失败时不落 coverage 报告。排除项在 before/after 两次测量中一致，分母可比。
- `vi.mock` 工厂引用的 fixture 一律工厂内动态 import：`../__tests__/glm-p/kit.js`
  按字母序排在 `./__tests__/*` 之前，会在提升期先行传递触发被 mock 模块（TDZ，
  Wave F 同型陷阱）。
- `IsometricEditorToolbar` 托盘开盘聚焦 effect 与 portal 二次挂载存在时序漂移：
  测试先有界等待焦点落入托盘再自设焦点驱动键盘（10/10 连跑稳定）。
