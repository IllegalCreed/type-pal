# ARCH-REGRESSION-LAB-GLM-1 · Codex 六轮独立接收

2026-09-25；候选 `33df93783accee4c6250eb27394758b008e824dd`。结论：**counter；不转正式测试、不计覆盖率、不标 done**。本轮承认机账 G04-04 标题与 V04 结构化备注的勘误，但用户转述的“逐条修正测试断言并补 entered/业务状态/真实 tick”与提交树不符：`git diff 494f9b5d..33df9378 -- candidates/ fixtures/` **零 diff**，同范围对上轮 `b403efd3` 亦零 diff。三轮[逐组反证](architecture-regression-lab-codex-r3-review.md)及[五轮审查](architecture-regression-lab-codex-r5-review.md)中的业务缺口不会因改账本而消失。

## 复跑事实与新阻断

- 候选分支/远端 tip 一致、工作树干净；`b403efd3..33df9378` 仅改实验目录内 README、typecheck 配置、receipt、results、verify，产品/scripts 零 diff。
- 新鲜执行 `/tmp/codex-glm-r6-candidates.json`：9 文件 32/32 绿；`verify.mjs` 对该 JSON 报 39 条、32 passed、PASS；`red-control.mjs` detected（exit1、一项执行/失败、AssertionError、产品 hash 不变）；六张既有截图重新计算完整 SHA 6/6 精确匹配。`node scripts/docs/check.mjs`、实验目录 Biome、diff 检查通过。本席将 red-control 产生的 `.tmp-red-*` 移出工作树至 `/tmp`，未改候选文件。
- **独立类型门失败**：`pnpm exec tsc --project docs/testing/glm-architecture-regression-lab/configs/tsconfig.json --noEmit` exit2，`tsconfig.json:15` 的 `baseUrl` 在仓库 TypeScript 6 下报 TS5101（须消除或按本仓政策处理弃用，不靠跳过类型门）。故“所有门通过”不成立。
- `results.json` 的 G04-04 `fullName` 现指向真实同名测试，消除了五轮的标题重复；但该测试 `g04-script-draft.test.tsx:113-125` 仍只数两行，没有提交旧草稿验证“不写回新对象”。`receipt.md:16,20,37,45,53` 仍写 G04 三项、G08 四项、V04 因已撤回的故障受阻及旧 verify SHA 命令；`results.json:808` 仍写“36 项”。`verify.mjs` 仍把主线合入后的白名单差异降成 INFO，不核命令/cwd/exit及候选执行总数的硬一致性；机械 PASS 仅为当前有限核验器的结果。

## 十二组裁决（相对三轮/五轮没有测试变更）

| 组 | 本次决定与直接锚点 |
|---|---|
| G01 | 窄笔划取消例可留；选区实际状态与平移 view 取消结果仍未证（`g01-map-gesture.test.tsx:257-280`）。完整组 counter。 |
| G02 | 双地图瓦片保真可留；选区换会话仍查通知/DOM而非新会话业务选区（`g02-map-scope.test.tsx:97-118`）。counter。 |
| G03 | 挂载/重挂载窄例可留；Cmd+S 只发键后直接验证旧 session 改名抛错，未观察保存 IO（`g03-app-lifecycle.test.tsx:198-213`）。counter。 |
| G04 | 弹层确认/关闭局部例可留；外部 body 替换后不确认旧草稿，`G04-04` 标题仍超出断言（`g04-script-draft.test.tsx:113-125`）。counter。 |
| G05 | 单 Playback stop/tick 冻结可留；新源立刻再次 stop，手工解绑不等于工作区 unmount（`g05-playback-scope.test.tsx:58-99`）。counter。 |
| G06 | enemy→author 的部分叶/错误 path 可留；仍用 `as unknown as`/`as never`，author→enemy 合法 caller 未证（`g06-validation-crosscalls.test.ts:16-17,32,48,81`）。counter。 |
| G07 | 背包隔离与装备写/getter 可留；地图读写都在 scene-system，装备未进 battle opcode（`g07-core-boundaries.test.ts:19-43`）。counter。 |
| G08 | 重复转换可留；sound 回调未被见证调用，非法 opcode 只是 gap 不抛（`g08-conversion-isolation.test.ts:49-71`）。counter。 |
| V01 | 角色名三张截图可留；六类表单键盘/焦点矩阵未证。counter。 |
| V02 | 720px 角色页和旧 PanelResizeHandle 测试分列保留；非空三工作区/实际分隔条未证。counter。 |
| V03 | 无效 objectId 回退窄事实可留；读取失败→重试/A-B乱序未证。counter。 |
| V04 | beforeunload 预期中止、资源缺席阻断分类可留；媒体 fit/1:1/替换与引用刷新未执行。counter。 |

本轮不要求重拍未变的六张截图，也不重做通过的窄正控。下一步应先让回执/账本/类型门与最终树一致，并在不能补实际调用链时把对应条目降为窄证据；不得再次以仅改文案宣称测试断言已修。GLM 贡献者不作自审终审，Kimi 本队列豁免。
