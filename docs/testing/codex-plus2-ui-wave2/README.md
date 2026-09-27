# Codex 自有覆盖率第二轮 · 脚本树与当前属性弹窗

范围：仅新增三份 editor 测试，薄扩展现有
`ui/__tests__/command-form-current-fixture.ts` 的可选合法实体/共享脚本输入，
加三针隔离负控与本回执。生产实现、旧测试断言、测试选择/排除配置、
用户正在编辑的 FrameAnimationEditor WIP 均零改。

## 合同与证据

| 组 | 新用例 | 业务入口/核验 |
|---|---:|---|
| `ScriptTree.coverage-batch-2.test.ts` | 4 | 现行 `describeScriptCommand` 的世界/角色/动作/脚本绑定摘要；`checkCommands` 先证结构，每行精确 icon、label、detail 和输入不变 |
| `ScriptTree.workflow-coverage.test.tsx` | 5 | 真实 React 树的两臂行路径、段跳转/增删、场景入场显式化与揭示控件；`checkStages` 区分普通与 onEnter 准入；回调精确、原输入未改 |
| `ScriptEditor.coverage-workflows-2.test.tsx` | 14 | 正式 `CanonicalScriptBodyEditor` 双击弹窗：镜头/追逐/资源、共享脚本 self、实体位置/行为/页面/触发、确认结果；完成前零父提交，完成后一次精确作者命令提交 |

fixture 使用当前 `battleTrialProjectFiles` → 正式 loader，并区分 runtime `SceneDef` 与
author `AuthorSceneDef` 的页面模型；二者各自通过 `validateScenes`/
`validateAuthorScenes`。命令由 `checkAuthorCommands` 进入，输出再过同门。
开发中曾误把 author page 的字符串 trigger 喂给 runtime 场景门、误把普通
stage entry 当成任意 stage；均被生产 guard 拒绝并在封版前修正，未通过
`as unknown as`、跳过门或改产品放行。护体说明按当前 `ACTOR_STATUS_DEFINITIONS`
的实际文字核对，不使用第一阶段猜测。

`node docs/testing/codex-plus2-ui-wave2/mutants.mjs` 的三针
`wave-label`、`nested-insert`、`camera-height` 均为同一精确新测试的
绿对照/业务 AssertionError 红；每针只在 Vite load 阶段替换唯一源码片段，
生产文件 SHA-256 前后不变。定向及相邻 12 文件/115 项通过，editor typecheck 0，
6 个改动代码文件 Biome 0 error/warning/info。

## 官方统一门与贡献归属

串行 `pnpm check` exit0：全仓 9,989 项，严格 lint 扫描 2,314 文件、
0 error / 0 warning / 0 info。随后 `pnpm coverage:ratchet` exit0，
`TYPE_PAL_COVERAGE_BASE_REF=8254ce64 pnpm coverage:fast` 受保护单次 exit0；
两次 fast 都是 9,528 项/730 源码文件、分支 **46,797/63,323=73.90%**。
相对接收前 46,615/63,323，本批 Codex 自有测试净增 **182 已覆盖分支**，
分母/源码清单不变。其它六包指标/选择身份不因本批测试回退。

用户本轮 +2 绝对百分点目标以 46,201/63,315=72.9701% 起算；当前同口径
提升约 0.9320 个百分点。按现分母达 74.9701% 需 47,474/63,323，尚差
**677** 个已覆盖分支。本批不冒称总目标完成，也不把 GLM/Cursor 测试记成 Codex 自有贡献。
