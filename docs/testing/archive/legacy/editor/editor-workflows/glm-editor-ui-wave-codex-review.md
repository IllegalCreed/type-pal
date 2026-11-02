# GLM 编辑器 UI 十二模块 · Codex 首轮独立接收

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 GLM 编辑器 UI 十二模块首轮接收（候选 `codex/glm-editor-ui-wave-r1@a767c43f`，起点 `8254ce64`）的 Codex 回执：**counter / rework**——作者绿色与反控鉴别力（12 文件 39/39、typecheck 0、14 文件 Biome 0/0/0、判据自测 10 类+四针红）不替代合法前提。

## Scope

- 候选 a767c43f（相对起点仅新增白名单测试/fixture/工具/回执+必要 docs 导航，无产品/旧测试/官方统计改动）；对象=G1 正控项目/G2 场景链/G3 视觉证据。

## Execution and assertions

| step | legal input | caller | machine assertion | business oracle |
|---|---|---|---|---|
| G1 | SkillTab.glm-ui-wave.test.tsx:55-93（manifest.content={}、scenes=[]、as unknown as 强转）等 | project-diagnostics.ts:823-842 assertProjectSaveValid | 入口场景+worldVariables 检查拒该输入 | 「提交成功/撤销/清理」只在不可保存内存对象上运行，不满足「当前合法项目、先过现行 guard」准入 |
| G2 | SceneCanvas:68,141-146 场景强转 SceneDef、mapIndex.maps=[]、空 assetBase；PreviewCanvas:20,63,74,85-89 强制 loading、伪 Playback、stages as never | 源码核 | 可测局部委派 | 不能宣称正式工作区/试玩正控；须在当前 guard 下形成闭包或明列局部防御/委派测试 |
| G3 | /tmp/ui-wave-u4-scene-canvas.png、/tmp/ui-wave-u2-sprite-library.png | 直看截图 | 中央显示 tileset.pal.020/sprite.pal.002 bytes 登记与实际 917 不符，无可核画面 | 两图是加载失败现场；回执「视觉 N/A 部分无」与现场矛盾，须补画面或标未证并撤回表述 |

## Results

- 返工不机械增加测试数/branch 比例：逐一保留合法正控断言，撤回/改造不过 guard 用例，更新十二行账、测试数、四针、退出码与截图证据；R1/R2/R3 同批整改后交最终 SHA。
- Codex 未跑全仓 check/ratchet/strict-fast；候选不合 main、不标 done。

## Evidence

- 证据路径：本回执正文（quote 保全）。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| 首轮接收 | 原文时点 | G1/G2/G3 反证 | counter / rework | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy editor/editor-workflows 的 ui-wave 首轮接收回执；固定来源与 source SHA 见下方保全节。

## 原始结论

counter：正控项目在保存门前被拒（G1）、正式场景链不成立（G2）、截图为加载失败现场（G3）。

## 当时证据

锚点行号与判别事实在 quote 保全。

## 当前有效性

historical。counter 仅指当时候选；r2/r3 后续见同目录。

## 继任文档

当前结论归 TEST 卡与 canonical 测试。

## 原文保全

固定源 revision `85c462ffd5a6d8514604d346abd96212340c5dfa`，source SHA `fc1cdae71158e714fa7f3cc812c7b503562ec15098f924e0f25afe49414c4a3c`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # GLM 编辑器 UI 十二模块 · Codex 首轮独立接收
>
> 候选 `codex/glm-editor-ui-wave-r1@a767c43f`，起点 `8254ce64`。
> 结论：**counter / rework**。候选相对起点仅新增白名单测试/fixture/工具/回执
> 与必要 docs 导航，无产品、旧测试或官方统计配置改动。本人复跑12文件39/39、
> editor typecheck exit0、14代码文件 Biome 0 error/warning/info；
> `ui-wave-mutants.mjs wave` 判据自测10类、39项绿对照与四针目标新例
> `AssertionError` 红均通过。作者绿色与反控鉴别力不替代合法前提。
>
> ## 业务输入反证
>
> 1. **G1 — 正控项目在正式保存门前被拒，不是可完成的编辑工作流。**
>    `packages/editor/src/ui/SkillTab.glm-ui-wave.test.tsx:55-93` 构造
>    `manifest.content={}`、入口场景 `s001` 却 `scenes=[]`，再用
>    `as unknown as EditorState` 强转。当前
>    `packages/editor/src/core/project-diagnostics.ts:823-842` 的
>    `assertProjectSaveValid` 首先检查入口场景，随后明确要求
>    `manifest.content.worldVariables`；该输入不能保存。
>    `WorldSpriteLibrary.glm-ui-wave.test.tsx:104-151` 同样用不完整
>    manifest 与虚构的资源字节/hash，还用空 `assetBase`；
>    `CutsceneTab.glm-ui-wave.test.tsx:35-49` 复用
>    `catalog-controls-test-utils.ts:105-138` 的空 content/缺场景状态。
>    U1/U2/U3 的“提交成功/撤销/资源清理”只证明组件在不可保存的
>    内存对象上运行，不满足卡面「当前合法项目、先过现行 guard」准入。
>    请逐文件核四组正控：从正式 blank seed→loader→`toEditorState`
>    建立项目及相应真实资源记录/字节，或先过当前结构与引用/保存门；
>    确属防御 UI 的非法输入单独分类，不能作为当前工程业务收益。
>    不要通过降低 guard、`as unknown as`、空 catalog/假 hash 或改产品迁就。
>
> 2. **G2 — U4 所谓当前场景链与可见证据不成立。**
>    `SceneCanvas.glm-ui-wave.test.tsx:68,141-146` 把场景强转成
>    `SceneDef`，`scene.mapId='map-a'` 有 `projectMaps['map-a']`
>    却 `mapIndex.maps=[]`，并给空 `assetBase`/catalog；
>    `PreviewCanvas.glm-ui-wave.test.tsx:20,63,74,85-89`
>    强制 `status='loading'`、伪 `Playback`、`stages as never` 与空地图索引。
>    这些可测组件局部委派，但不能宣称正式工作区/试玩正控。
>    至少让 U4a 的场景、mapIndex、地图、资产在当前 guard 下形成闭包；
>    U4b 使用当前合法阶段和真实可解释的 playback 状态，或明列为
>    局部防御/委派测试，不计正式工作流。U4 单点针须在修后的真入口重跑。
>
> 3. **G3 — 两张截图是加载失败现场，不是画布/精灵验收。**
>    本人查看 `/tmp/ui-wave-u4-scene-canvas.png` 与
>    `/tmp/ui-wave-u2-sprite-library.png`：中央分别显示
>    `tileset.pal.020`、`sprite.pal.002` bytes 登记与实际917不符，
>    无可核地图或精灵画面。回执又写「视觉 N/A 部分无」，与现场矛盾。
>    请在完整隔离资产环境补两处代表画面；若环境仍阻断，就明确标记
>    U2/U4 视觉未证及重跑条件，撤回已视觉验收的表述，不用源码推断
>    替代看图。既有产品 UI 错误提示是否还需改进另归产品卡，非本测试
>    包可私改范围。
>
> ## 收窄返工与下一步
>
> 不要机械增加测试数或 branch 比例；逐一保留已能通过合法正控的断言，
> 撤回/改造不能通过项目 guard 的用例，更新十二行账、测试数、四针、命令退出码
> 与截图证据。R1/R2/R3 同批整改后再交一个最终候选 SHA。
> Codex 未跑全仓 `check`、ratchet 或 strict-fast，本候选不合 main、不标 done。
>
<!-- original-source-quote:end -->
