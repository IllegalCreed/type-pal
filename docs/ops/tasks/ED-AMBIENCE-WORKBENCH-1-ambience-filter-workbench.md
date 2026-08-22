# ED-AMBIENCE-WORKBENCH-1 - 氛围滤镜工作台与真实场景预览

Status: draft
Phase: phase2
Capability: W6
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: codex/ed-pal-workspace-modes-1

## 目标

把氛围页从“左侧只有说明、中央全量旧表格、没有当前对象与真实预览”的数据表，重构为完整的氛围滤镜工作台：
左侧显示可选择的氛围目录；中央显示当前氛围标题、基本信息、乘色编辑和基于真实场景渲染链的滤镜预览；右侧只
承载引用与生效规则，不重复中央字段。作者应能在不进入引擎试玩、也不污染工程数据的前提下，选择一个场景作为
临时预览上下文，直接比较原图与当前滤镜效果。

## 范围

- 范围内:
  - 氛围页改为现行 App 三栏工作台：左目录、中主编辑、右 Inspector。
  - 左栏使用共享目录行显示色块、名称、稳定 ID 与引用数；新建仍是集合动作。
  - 中央使用 `DsObjectHero` 显示当前氛围身份；名称、稳定 ID、乘色/十六进制/RGB 编辑进入结构化基本信息区。
  - 中央提供静态场景滤镜预览：作者选择场景、平移/缩放，并在“滤镜 / 原图”间比较；预览上下文不写入
    `AmbienceDef`。
  - 场景底图、地图、精灵和投影继续复用 `scene-stage` / `renderSceneFrame`；全帧 multiply 合成从 runtime
    私有闭包提取为唯一共享 helper，runtime 与 editor preview 同时消费。
  - 右栏固定为 `引用 n / 说明`：引用展示、删除门禁与引用计数消费同一 current-author collector；说明只解释
    生效范围、跨场景/存档与预览边界。
  - preview loading / empty / error、引用数据不可用、无可预览场景、失效 deep link、undo/redo、全局保存闭环。
  - 名称与颜色编辑使用统一字段布局；拾色器拖动可实时预览，但一次连续编辑只形成一个可撤销事务。
- 范围外:
  - 不改 `AmbienceDef { id, name, tint }`、manifest、存档、迁移器、PAL 生成数据或 capability 状态。
  - 不新增 per-scene 默认氛围、时间流逝、天气、粒子、LUT、后处理栈或多滤镜叠加。
  - 不让预览执行场景脚本、战斗、菜单、对话或 300ms 切换演出；这些仍由引擎试玩 / E2E 验证。
  - 不新增模块内保存；右上角全局保存是唯一落盘入口。
- 明确不做:
  - 不保留当前 CSS 渐变样例条作为“所见即所得”证据。
  - 不复制 `SceneCanvas` 的命中、拖动、实体选择、触发区或编辑 overlay。
  - 不把预览场景 ID、相机、缩放、A/B 模式写进 content schema。
  - 不为每个目录行渲染场景缩略图，也不按氛围逐项重复扫描全工程引用。

## 前提真值门

### 一句话行为 / 工程前提

氛围定义当前只有稳定 ID、显示名与一个全帧乘色；运行时在最终画面上做 multiply，而现有编辑器只用 CSS 样例条近似，
所以工作台可以不改数据模型，但真实预览必须复用 runtime 的合成 helper 与既有场景渲染地基。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | 原版脚本 `0x53/0x54` 只切全局昼/夜调色板 flag；该 flag 被存档并被整屏 palette 消费。原版没有本项目作者 UI。 | `reference/sdlpal/script.c:1802-1814`; `reference/sdlpal/global.c:605,750`; `reference/sdlpal/text.c:1382,1442`。 |
| 第一阶段 | 第一阶段按 palette/nightColors 在最终呈现链选择夜色，证明氛围不是单张地图或单个精灵属性；仍不存在可复用的二阶段作者工作台。 | `packages/game/src/core/event-system.ts:4005-4012`; `packages/game/src/core/palette-fade.ts:91-99`; `docs/phase2/ambience-design.md:12-34`。 |
| 当前二阶段 | canonical 数据只有 `id/name/tint`；runtime 在所有普通画面/UI完成后做一次 Canvas multiply，恒等白跳过。编辑器氛围页中央全量表格，预览只是 CSS 样例条；编辑器 playback 明确不染。 | `packages/content/src/ambience.ts:9-35`; `packages/reforge/src/main.ts:1243-1270,6152-6156,6426`; `packages/editor/src/ui/AmbienceTab.tsx:156-243`; `packages/editor/src/core/playback.ts:715`。 |
| 本任务目标 | 不改 schema/runtime 语义；左目录、中 Hero + 字段 + 真实场景滤镜预览、右引用 / 说明。预览底图走现有场景 renderer，multiply 走 runtime/editor 唯一共享 helper。 | 用户 2026-08-22 明确要求“列表位置应该放列表，中间才是标题、基本信息，还有一个氛围滤镜预览的场景效果，右侧属性面板……你设计”；`docs/phase2/editor/editor-design-system-v1.md:458-479`。 |

### 反证与替代解释

- 最强替代解释 1: 保留表格，只把 CSS 渐变条放大并换成场景截图，改动最小。
  - 否决原因: 静态截图与 CSS `mix-blend-mode` 不消费当前地图/精灵，也不钉住 runtime 的恒等跳过与合成顺序；
    将来 runtime 改动后会再次形成两套颜色真相。
- 最强替代解释 2: 直接嵌入完整 `SceneCanvas`，再在外层盖一层 CSS multiply。
  - 否决原因: `SceneCanvas` 同时拥有选择、拖动、触发区与编辑 overlay；氛围预览只需要 read-only frame。外层 CSS 还会
    把 DOM chrome 一起染色，与 Canvas 最终帧语义不同。
- 最强替代解释 3: 把预览场景写进 `AmbienceDef`，下次打开自动恢复。
  - 否决原因: 场景只是作者观察上下文，不参与 runtime 解析；持久化会把 UI 偏好伪装成内容语义并引发 schema 迁移。
- 什么观察会推翻当前前提:
  - 若产品要求在本页同时验证战斗、对话、菜单或脚本过渡，则静态 `renderSceneFrame` 不足，本卡必须转 blocked，
    另设计受控 runtime preview，而不是在 editor canvas 上伪造这些层。
  - 若核验发现 runtime 的 ambience 合成不再是单次 Canvas multiply，或 cinematic/battle 出帧有不同合同，则共享
    helper 的调用域必须重新盘点并重签，不能只抽 `main.ts:1255-1270`。
  - 若当前 canonical 工程存在 `tint` 之外的真实氛围字段，本卡“无 schema 变化”前提失效。
  - 若场景资源不能经现有 `EditSession.loadMap` / `useSceneAssets` 懒加载，预览方案必须先补资产读取边界，不能全量载入
    223 张地图兜底。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: `setAmbience` 与全帧合成已经闭环，本卡不改变命令语义。
  - 原版 / 第一阶段理解: 只用于确认全局整帧语义；作者 UI 形态由二阶段设计系统决定。
  - extractor / 地图 / 数据解码: 当前问题来自作者界面与预览缺口，不是迁移红项。
  - audit / test model: 当前 CSS 条只证明颜色近似，不证明真实场景效果；因此验收改用共享 renderer/compositor 与实机截图。

### 用户可见偏离

- 是否主动偏离已核真值: yes（用户明确要求重构当前页面形态）
- `before -> after` 一句话: 左栏只有说明、中央全量表格和 CSS 色条、无 Inspector -> 左栏对象目录、中央当前对象编辑与
  真实场景 A/B 预览、右栏引用和生效说明。
- 代表场景: 在“场景 → 氛围”选择 `night`，中央选择 `s042`，在“原图 / 滤镜”间切换；修改 RGB 后场景即时更新，
  返回地图/脚本页面再撤销可恢复，只有右上角全局保存会落盘。
- 用户裁决: 2026-08-22 用户已批准目标布局并授权 Coding Owner 设计右侧 Inspector。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `docs/phase2/READ-FIRST.md:1-40`: 第二阶段作者 UI 由新架构设计，但渲染知识必须读取一阶段经验。
  - `docs/phase2/editor/editor-design-system-v1.md:458-479`: 对象型列表/主编辑/Inspector 与媒体型大预览合同。
  - `docs/phase2/editor/editor-design-system-v1.md:440-455`: 引用/诊断共享行骨架，危险删除展示影响并阻断被引用对象。
  - `docs/ops/tasks/ED-REFERENCE-UI-1*`、`ED-DIAGNOSTIC-UI-1*`: 引用与诊断消费共享组件；普通诊断内联，不为零问题虚构新 Tab。
  - `docs/ops/tasks/ED-AUDIO-WORKBENCH-1-audio-resource-workbench.md`: 同族“左目录、中当前对象+真实预览、右次级信息”工作台，
    但氛围预览是场景帧，不复用音频 transport。
- 代码锚点(`file:line`):
  - `packages/editor/src/ui/AmbienceTab.tsx:40-57,156-243`: raw 名称输入、全量表格、CSS 样例条与行内删除。
  - `packages/content/src/ambience.ts:9-48`: canonical 模型、恒等判断、解析与插值。
  - `packages/reforge/src/main.ts:1243-1270,6152-6156,6426`: 当前私有 runtime 合成与大世界 / 战斗两个实际出帧调用点；
    cinematic 分支有显式跳过条件。
  - `packages/editor/src/ui/SceneCanvas.tsx:136-198,343-367`: 共享 scene-stage 资产/视图地基与真实 `renderSceneFrame`。
  - `packages/editor/src/ui/PreviewCanvas.tsx:340-386`: 预览画布也复用 renderer，但拥有脚本 playback overlay；不得整组件搬入氛围页。
  - `packages/editor/src/core/edit-session.ts:29-54,157-180`: 当前地图工作副本、全局命令/undo/save 真值。
  - `packages/editor/src/core/ambience-references.ts:59-107`: canonical script/chunk/world current state 的删除引用真值。
  - `packages/editor/src/ui/DataMode.tsx:62-156,371-380`: 当前氛围页缺少 preview 所需 maps/map loader 与 focus-object props。
- 已知坑 / 历史:
  - `docs/phase2/ambience-design.md:59-67`: 氛围在最终帧、战斗也生效；编辑器场景画布此前故意恒白天。
  - `docs/ops/tasks/ED-CATALOG-CONTROLS-1-global-catalog-controls.md:94-100`: 旧审计因氛围只有短表而排除搜索；本卡改变的是页面 IA，
    不以强塞搜索为“统一”。
  - `docs/ops/tasks/ED-INSPECTOR-TABS-1-global-inspector-tabs.md:88-97`: 旧页无 Inspector 的历史判断；本卡新增真实三栏后以新裁决为准。
- 不得重新引入:
  - `.music-table.amb-table`、raw `.in`、行内对象操作、CSS `mix-blend-mode` 假预览、局部保存按钮。
  - 预览 context 写 schema、全量地图预载、每行一份引用扫描、右栏重复名称/ID/tint 字段。
  - 氛围页私有场景投影/资产加载/缩放手势或第二套 multiply 公式。
- 相关测试:
  - `packages/content/src/ambience.test.ts`、`packages/editor/src/core/ambience-references.test.ts`、
    `packages/editor/src/ui/AmbienceTab.test.tsx`、`packages/reforge/src/render-scene.test.ts`。
  - `packages/editor/src/ui/SceneCanvas.test.tsx`、`design-system/recipes.test.tsx`、`boundary.test.ts`。

## 验收条件

- 功能:
  1. 左栏实际渲染氛围目录；每行只含色块、名称、稳定 ID 和引用数，选中态使用 `DsCatalogRow`。新建位于列表头；
     不因当前只有 3 条就保留空白 outliner，也不无依据强加搜索。
  2. 当前对象由 URL/focus object 驱动；有效 deep link 打开对应氛围，无效 ID 显示明确失效态，不静默编辑第一条。
  3. 中央固定 `DsObjectHero` 显示“氛围滤镜 / 名称 / 稳定 ID / 引用数”；删除是对象级动作，位于 Hero，
     行内与 Inspector 不再重复删除。
  4. 中央基本信息只编辑现有 `name/tint`；ID 只读。RGB 均限制 0-255，hex/RGB/拾色器同步，白色明确标注“不染”。
     一次连续拾色只生成一个 undo step；等值 blur 不提交命令。
  5. 场景预览按作者选择懒加载单一场景，使用当前内存地图/精灵/资源与 `renderSceneFrame`；未着色底帧缓存在独立
     surface，改 tint / A/B 只重新复制并合成，不重新组装场景。滤镜应用调用 runtime 同一共享 compositor；切换
     “原图 / 滤镜”不修改工程，平移/缩放与“适应画布”遵循 scene-stage。
  6. 预览明确标注为“静态场景快照”：不跑脚本/战斗/菜单/对话。切换氛围、场景或工程时过期异步结果不得回写；
     无场景、地图加载中和加载失败均有可访问状态。
  7. 右栏固定对象标题与 `引用 n / 说明` 两个 shared Inspector tab。引用支持定位，world/chunk 无定位时解释原因；
     说明只写全帧 multiply、跨场景/存档、恒等白与静态预览边界，不重复中央字段。
  8. 字段错误在字段内联，预览错误在预览区；current-author 引用数据不可用时在引用面显示明确错误，删除继续
     fail-closed；不新增常驻“诊断 0”空 Tab。
  9. 页面展示计数、删除预检与 `DeleteAmbienceCommand` 使用同一 current-author collector；所有氛围的引用索引一次构建，
     不得按行 O(氛围数 × 全工程脚本)重复扫描。删除有引用时阻断，无引用时共享 dialog 确认，可撤销恢复。
  10. 只有右上角全局保存落盘；本页没有“应用/保存氛围”按钮。新建、改名、调色、删除均进入统一 undo/redo。
- 测试:
  - compositor：恒等白零合成；非恒等使用 `multiply`、覆盖完整 canvas、save/restore 成对；runtime 与 editor import
    同一符号，禁止复制公式。
  - preview：只加载当前场景；当前内存 map 优先；场景/工程快速切换丢弃旧结果；A/B 切换不 dispatch；pan/zoom/fit
    不改 content；无场景/loading/error 状态；连续 tint input 只重合成缓存底帧，不重复调用 `renderSceneFrame`。
  - editor：选择/deep link、名称提交/等值短路、RGB/hex 同步、单次连续编辑 undo、引用计数/跳转、删除阻断/确认/恢复、
    新建后选择与全局 dirty/save。
  - reference：setAmbience、toggleDayNight、chunk、shared script、world state 进入同一 index；非目标 ID 不误命中；
    一次 collect 供目录/Inspector，删除时从 live state fail-closed 重检。
  - shared boundary：生产氛围页无旧 table/raw `.in`/行内 delete/CSS 假预览/局部保存；消费 `DsCatalogRow`、
    `DsObjectHero`、`DsWorkbenchSection`、`DsInspectorTabs`、共享 Reference 组件。
  - 定向 Vitest + editor/reforge typecheck + `git diff --check`；只跑一次必要的 editor 全量测试，不重复执行同一长套件。
- 文档:
  - 更新 `editor-design-system-v1.md`，补“滤镜/效果型工作台”的真实预览、临时 preview context 与右 Inspector 边界。
  - 更新 `ambience-design.md:67` 的“编辑器画布不染”表述：普通场景编辑仍恒白天，只有氛围工作台的显式预览 surface 染色。
  - 本卡 Build/Review/视觉记录完整；不改 capability-map 状态。
- 视觉 / 手工验证:
  - localhost 6010，PAL 开发基线或评审沙盒均可；Wide 与 1280×720 三栏验证目录、Hero、字段、预览和 Inspector。
  - `s042` 对 `day/night` A/B；确认相同 camera 下只有最终滤镜不同，白色恒等与 runtime screenshot 肉眼一致。
  - 修改 tint 后预览即时更新、列表色块同步、无整页重载；快速切换场景/氛围无旧帧闪回或加载风暴。
  - 最窄 Inspector、125%/150% 等效视口无横向溢出；标题/Tab 固定，只有当前 panel 滚动。
- E2E 用例登记（剧情 / 演出 / 内容观感必填：入口、准备数据、步骤、预期画面/时序、证据路径）:
  - N/A：功能性编辑器界面，开发期做一次最小浏览器 smoke；runtime 过渡/战斗/UI 视觉仍沿用 W6 与后续集中 E2E。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: verified（`AmbienceDef` 只有 id/name/tint；`main.ts:1243-1270` 是当前唯一最终帧 multiply；
    `AmbienceTab.tsx:156-243` 证明旧表格/CSS 预览；`SceneCanvas.tsx:136-198,343-367` 证明可复用渲染地基）
  - design: agree（左目录、中 Hero+字段+静态真实场景 A/B、右引用/说明；共享 compositor；preview context 不持久化）
- Kimi:
  - premise: verified（2026-08-23 独立直读一手代码 + 全包 census）。已核：`ambience.ts:9-35`
    AmbienceDef 恰为 id/name/tint + 恒等白（≥254）与 day 覆写语义；runtime 氛围出帧全量 census——
    全包 grep `applyAmbienceTint`/multiply 仅三处真实命中：定义 `main.ts:1264-1280`（fade 推进
    :1265-1273 与纯 multiply :1274-1279 同居一个闭包）、大世界出帧尾 `:6163`
    （`!cinematicLayerDrawn` 显式跳过条件）、战斗分支 `:6435`；`dither-transition.ts:61` 只是注释。
    另注意 `:6164-6165` 注释明确 0x73 dither 必须在氛围滤镜之后且 target 取本帧最终 canvas——
    合成顺序约束真实存在。`AmbienceTab.tsx:156-243` 旧表格 + CSS 假预览（:218-222）+ 行内删除 +
    颜色 onChange 逐次 dispatch（:207-211，undo 刷屏实锤）；`SceneCanvas.tsx:136-198` 的
    useStageSize/useViewZoomPan/useSceneAssets 与 `renderSceneFrame`（SceneCanvas:343 /
    PreviewCanvas:354 / isometric-map-render.ts:114 三处复用）证明预览地基可复用；
    `ambience-references.ts:59-107` 删除门禁 collector 已支持 canonicalState 入参；
    `playback.ts:715` 编辑器 playback 明确不染。
  - design: agree（共享 compositor 只封装 multiply 绘制、不接管 fade/world state——当前闭包里
    fade 推进与纯合成是可分离的两段，抽取面正确；预览复用 scene-stage primitives 而非整个
    SceneCanvas；preview context session-local 不入 schema/save；颜色单事务 undo 修复了现存
    onChange 逐次 dispatch 的真实问题。GN1-GN3 落钉可执行）
- GLM:
  - premise: **verified（2026-08-23，本人一手读码 + census，非代理）**：
    1. **schema 纯度实测**：`AmbienceDef = {id, name, tint}`（ambience.ts:10-14 接口
       仅三字段）；PAL ambiences.json 3 项、字段去重恰为 id/name/tint——"无 schema
       变化"前提成立，preview context 不进 schema 可行。
    2. **runtime 合成链 census**：`main.ts:1276 globalCompositeOperation='multiply'`
       全帧单次合成；调用点 :6161（一切画完后）与卡文锚点一致；`setAmbience` 消费域
       = main/script-runner/script-host-adapter 三处——共享 helper 抽取面与卡文
       一致，无第四处隐藏 multiply。
    3. **引用 collector**：ambience-references.ts:19-23 从 EditorState 组装
       ScriptEditorState 且**已含 sharedScripts**（:23）——但同 MEDIA 卡 GM1 的
       stale 副本问题：编辑期间共享脚本 setAmbience 新引用在保存前不可见。卡文
       未列此输入域问题（→GN1，不推翻前提：本卡主要修预览与布局，引用面照
       current 合同走即可，但删除门禁的正确性与 MEDIA 卡同源修复后自动受益）。
    4. **现状 UI 属实**：AmbienceTab 全量表格 + CSS 样例条近似（卡文 :156-243）；
       编辑器 playback 不染（playback.ts:715）。
  - design: **agree（2026-08-23，附必落钉 GN1-GN3，不阻塞准入）**。左目录/中 Hero+
    字段+真实场景 A/B/右引用说明；共享 compositor 单一真值；preview 上下文为纯 UI
    态不持久化——与现有渲染地基和 DS 合同相容。
  - **必落钉 GN1-GN3：**
    - **GN1（引用输入域登记）**：本卡引用 Tab/删除门禁消费
      ambience-references 的输入域；与 MEDIA 卡 GM1 的 live sharedScripts 修复
      **同源受益**（不自行再修，但在卡内登记依赖，MEDIA 落地后本卡删除门禁
      自动完整）。若 MEDIA 未先行，本卡引用面照 current 合同实现并注明。
    - **GN2（合成单次 + 恒等跳过）**：共享 helper 提取后 runtime 与 editor preview
      消费同一函数的断言；恒等白 tint 跳过合成的行为在两侧一致（测试各一条）；
      **底帧只渲染一次**（换 tint/A-B 切换只重合成、不重跑 renderSceneFrame）
      的缓存测试。
    - **GN3（undo 粒度 + 过期丢弃）**：连续 tint 拖动形成单次 undo 事务（等值
      提交短路）；换场景/换工程时过期预览结果丢弃（最后一次生效）；懒加载
      单场景不得全量载入 223 图。
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: Kimi
  - 独立证据锚点: `packages/reforge/src/main.ts:1264-1280`（闭包内 fade+multiply 两段）、`:6163`
    （大世界出口 + cinematic 跳过条件）、`:6435`（战斗出口）、`:6164-6165`（dither 顺序约束注释）；
    `packages/content/src/ambience.ts:9-35`；`packages/editor/src/ui/AmbienceTab.tsx:185-243`；
    `packages/editor/src/ui/SceneCanvas.tsx:136-198,343`；`packages/editor/src/ui/isometric-map-render.ts:114`；
    `packages/editor/src/core/ambience-references.ts:59-107`；`packages/editor/src/core/playback.ts:715`。
  - 可证伪观察: 若存在第三个 ambience multiply 出帧出口（cinematic 层自染、RNG 层、菜单壳层），共享
    helper 调用域盘点即漏——全包 grep 仅 :6163/:6435 两调用点，cinematic 显式跳过、RNG 烘 RGBA 不染
    （:6162 注释）；若 fade/lerp 与 multiply 不可分（互享闭包状态），窄 helper 抽取会改 runtime 行为——
    直读 :1264-1280，multiply 段只依赖 ambienceShown 终值与 ctx，可分；若当前 AmbienceTab 颜色编辑已是
    单事务，`undo 刷屏`论据失效——:207-211 onChange 逐次 dispatch 证伪；若 preview 场景资产不能懒加载
    单场景，方案须先补读取边界——useSceneAssets(:188-198）按 mapId+spriteAssets 单项加载，证伪未出现。
- counter / 分歧处理: N/A
- 缺签豁免: N/A
- build 准入结论: blocked

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

#### 1. 页面信息架构

- 页面输出 App 现行三个根列，不在中间再嵌套第二个 `DsWorkbench`。
- 左栏：`DsListHeader` + `DsCatalogRow`。短目录不强加筛选器；行内色块只作识别，不可编辑。新建在 header。
- 中栏：固定 `DsObjectHero`；其下滚动内容分三块：
  1. `基本信息`：名称输入 + 只读稳定 ID。
  2. `滤镜参数`：颜色井、hex、R/G/B、通道乘数摘要和“恢复不染”；Wide 时与基本信息并排，窄时顺序堆叠。
  3. `场景预览`：占主要剩余面积，工具条含预览场景、原图/滤镜、适应画布；画布支持 pan/zoom。
- 右栏：固定“氛围滤镜 / 当前名称”标题 + `引用 n / 说明`。不放预览设置、不放可编辑字段、不放删除。

#### 2. 右侧 Inspector 设计

- `引用 n`：精确 occurrence 总数，按剧情脚本 / 昼夜切换 / 运行态分组；可定位项使用统一“打开”动作，不可定位项
  显示明确原因。current-author 引用数据不可用时显示错误，删除保持 fail-closed。
- `说明`：解释稳定规则——multiply 作用于最终帧、白色/未知 ID 的恒等兜底、世界状态跨场景并随存档、中央只预览
  静态场景快照且不覆盖 UI / 战斗 / cinematic / 过渡。说明不展示当前 hex/RGB/ID，避免与主编辑重复。
- 不设独立 `诊断` Tab：当前字段与加载错误均有明确 owner，按 ED-DIAGNOSTIC-UI-1 就近内联；将来出现第二类长诊断集合时
  再以真实数据开卡，不预支空面板。

#### 3. 真实预览与共享边界

- 新增 editor 内部 `AmbienceScenePreview`（命名可调整），只组合现有 `useSceneAssets`、`useStageSize`、
  `useViewZoomPan` 与 `renderSceneFrame`；不复制命中、拖动、触发区和 playback 状态机。
- 从 `main.ts` 提取窄纯函数 `compositeAmbienceTint(ctx, tint, width, height)`（命名可调整）到 reforge 可导出模块；
  runtime 大世界 / 战斗两个实际出帧调用点和 editor preview 都调用该函数。`resolveAmbienceTint/isIdentityTint` 继续属于 content。
- 渲染顺序固定：把 `renderSceneFrame` 结果写入未着色底帧 surface → 复制到底层可见 canvas → 对可见场景 canvas 调共享
  compositor；editor preview chrome/状态不进 canvas。原图模式只复制底帧，UI chrome 永远不染。tint 连续变化只重做最后
  两步，不重复执行场景资产组装与 `renderSceneFrame`。
- 预览场景是 session-local UI 状态。默认优先 manifest 默认 / 首个入口场景；没有时取第一个可读场景。
  明确选择后只在当前页面会话保留，不加入 undo/history/save。
- 预览是 authored initial scene 的静态帧，不执行 onEnter。这样作者可以隔离观察滤镜；需要验证脚本切换、过渡、战斗和 UI
  时仍进入引擎试玩。

#### 4. 编辑事务与引用单真值

- 名称保持 blur/Enter 提交与等值短路；颜色编辑维护 local draft，预览与列表色块读 draft，`change`/pointer session 结束时
  dispatch 一次 `UpdateAmbienceCommand`。Esc 恢复 committed 值。
- 将单 ID 扫描器整理为一次 current-author `collectAmbienceReferences` index（命名可调整）；目录计数、Inspector 与删除 dialog
  都读它。`DeleteAmbienceCommand` apply 时仍从 live state 重建/校验，不能信 UI 缓存。
- 有引用删除只打开阻断 dialog/引用清单；无引用才出现确认；操作可全局 undo。选择删除后移动到邻近对象或明确空态。

#### 5. 性能、响应式与可访问性

- 只加载当前预览场景；map/asset 请求以 project + scene/map identity 绑定 generation，过期 promise 丢弃；组件卸载清理。
- 氛围目录通常很短，不虚拟化、不画场景缩略图；引用只构建一次 index。若未来真实条目达到大列表阈值，再复用
  `DsVirtualList`，不在本卡预优化。
- 颜色控件有程序化 label、文本值与键盘可达的 RGB/hex 输入；连续 input 以 `requestAnimationFrame` 合并可见画布合成；
  canvas 提供文字状态、场景名和 A/B 当前模式，不能只靠颜色传达。
- Wide 中基本信息/滤镜参数双列且预览占主位；Medium/Narrow Inspector 进入现有 drawer，中央优先保留预览。
- 新建/删除 dialog 保持焦点陷阱与返回触发点；危险操作遵循共享 confirm/undo 合同，参照 Web Interface Guidelines 的
  可访问焦点与破坏性操作原则。

### 已知风险

- 风险: 抽 compositor 时漏掉 battle/cinematic 的特殊出口，导致 runtime 顺序变化。
  - 缓解: 先 census `applyAmbienceTint` 全调用域并以 static boundary 锁定；helper 只封装 multiply 绘制，不接管 fade/world state。
- 风险: 直接复用 `SceneCanvas` 造成编辑交互、overlay 或选择态误入预览。
  - 缓解: 共享 render/asset/view primitives，不复用有编辑职责的整个组件；组件测试禁止编辑 callbacks/overlay。
- 风险: 颜色 input 连续派发命令导致 undo 栈和全页渲染抖动。
  - 缓解: local draft + 单事务 commit + 缓存未着色底帧 + rAF 合并合成；测试模拟多次 input 只产生一次 command，且不
    重跑 `renderSceneFrame`。
- 风险: 全量引用计数让短页面反而变卡。
  - 缓解: 一次 index、revision memo、删除 live 重检；禁止在 `.map()` 中调用单 ID scanner。
- 风险: 静态场景预览被误认为覆盖所有游戏出帧。
  - 缓解: 预览标题与说明明确“静态场景快照”；验收不宣称覆盖 UI/战斗/脚本过渡。

### 主审立场

- Reviewer: Kimi 主审共享 compositor / scene preview 架构与 runtime 出口；GLM 主审引用 index、事务、状态矩阵与测试覆盖。
- 结论: Kimi agree（2026-08-23）+ GLM agree（2026-08-23，GN1-GN3）；Codex 已 agree
- 必改项: 无新增；GN1-GN3 为 build 必落钉。
- Kimi build 期关注项（非门禁）: ①共享 helper 必须把恒等跳过（`isIdentityTint`）包进函数内部，
  两侧消费行为一致；fade/lerp 留在 runtime 闭包，不进 helper；②`main.ts:6164-6165` 的 dither 顺序
  约束（0x73 在氛围滤镜之后、target 取本帧最终 canvas）抽取后不得改变调用顺序；③卡内“预览默认
  manifest 默认 / 首个入口场景”写于入口卡合并前，build 时应经 `requireDefaultEntry(manifest)` 取
  直接启动入口场景（ARCH-ENTRYPOINT-CANONICAL-1 已并入 main）；④预览底帧缓存键须含 scene identity
  + 工程身份，防止换工程后旧底帧复用。
- 是否建议进入 build: 是（三签已齐；按本轮用户指令保持 draft 与准入 blocked，开放决定留给用户）

### 三方争议记录(按需)

- Codex: 右栏采用 `引用 n / 说明`，诊断就近内联；中央 preview context 临时化；共享 renderer primitives 与唯一 compositor，
  不嵌完整 SceneCanvas，也不增加 schema。
- Kimi: 同意。补充：compositor census 的实际抽取面比卡文锚点更窄——fade 推进（:1265-1273）与纯
  multiply（:1274-1279）同居一闭包，helper 只应抽后者；两调用点 + cinematic 显式跳过已全包确认无第四处；
  AmbienceTab 现存 onChange 逐次 dispatch 是本卡单事务设计要消灭的真实缺陷，不是想象风险。
- GLM: premise verified + design agree（2026-08-23，附 GN1-GN3；schema/合成链 census 属实）
- 用户拍板: 2026-08-22 已拍板三栏方向并授权右 Inspector 设计；共享 compositor / preview 边界待三方审查。

## 额度 / 代班记录(如适用)

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: pending
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: pending

## 资源生成记录(如适用)

- Generation Owner: N/A
- 生成目的 / 替换对象: N/A
- 提示词要点 / 风格约束: N/A
- 输出路径: N/A
- 尺寸 / 格式 / 透明背景 / 调色约束: N/A
- 资源登记位置: N/A
- 验证方式: N/A

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: pending
- 集中 E2E 用例 / 批次: N/A
- 截图 / 像素检查路径: pending
- 结论: pending
- 未完成项: pending

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: 如果需要验证战斗/UI/脚本过渡的完整动态氛围效果，另开受控 runtime preview 任务，不扩本卡静态画布。

## 交接日志

- 2026-08-23 GLM（数据/渲染链/测试矩阵）: 审查完成，签 **premise verified + design agree
  （附 GN1-GN3）**。schema 纯度（3 字段/3 项实测）、单次 multiply 合成链（:1276/:6161）、
  setAmbience 三消费域 census 属实；GN1 登记引用输入域与 MEDIA 卡同源依赖；GN2 钉合成
  单次/恒等跳过/底帧一次渲染；GN3 钉 undo 粒度/过期丢弃/懒加载。未改实现，未代签 Kimi，
  未改准入结论。
- 2026-08-23 Kimi（共享 compositor/scene preview/runtime 出口）: 审查完成，签 **premise verified +
  design agree**。全包 grep 确认 multiply 仅定义 :1264-1280 + 调用 :6163（cinematic 显式跳过）/
  :6435（战斗）三处命中，无第四出口；指出 fade 推进与纯 multiply 同居一闭包、helper 只抽后者，
  dither 顺序约束（:6164-6165）不得改变；核 AmbienceTab 旧表格/CSS 假预览/onChange 逐次 dispatch、
  scene-stage primitives 与 renderSceneFrame 三处复用、playback.ts:715 不染。补四条 build 期关注项
  （恒等跳进 helper、顺序保持、默认预览场景改走 requireDefaultEntry、底帧缓存键含工程身份）。
  三签已齐；按本轮用户指令保持 draft 与准入 blocked，开放决定留给用户。未修改实现文件。
- 2026-08-22 Codex: 完成 schema、runtime compositor、当前旧页、scene-stage 与引用 collector 只读审计；创建 draft 并签
  premise/design。Evidence: 本卡真值矩阵与上下文锚点。Next: Kimi / GLM 独立设计审查；三签齐前不得改实现文件。
- 2026-08-22 Codex 并行只读预审: 确认右栏不重复字段、静态 preview context 不入 schema、共享 renderer primitives 而非
  整个 `SceneCanvas`；补充未着色底帧缓存、rAF 合成与“不覆盖 UI / 战斗 / cinematic / 过渡”的预览边界。该预审不代替
  Kimi / GLM 推进签字。

## 下一位 Agent 提示词

```text
接手任务: ED-AMBIENCE-WORKBENCH-1 氛围滤镜工作台与真实场景预览
任务卡: docs/ops/tasks/ED-AMBIENCE-WORKBENCH-1-ambience-filter-workbench.md
当前状态: draft，Codex 已签 premise verified + design agree；build 准入仍 blocked
你的角色: Kimi 负责共享 compositor / scene preview / runtime 出口与 UI 架构审查；GLM 负责引用 index、编辑事务、状态与测试矩阵审查
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本任务卡、docs/phase2/ambience-design.md、editor-design-system-v1.md，以及卡内代码锚点
已完成: 冻结左目录、中 Hero+基本信息+滤镜参数+静态真实场景 A/B、右引用/说明；preview context 不持久化；诊断就近内联
请你做: 直接读取一手代码独立核 premise；给出可证伪观察；核对 runtime 所有 ambience 出口、共享 helper 边界、scene-stage 复用、
颜色单事务 undo、一次引用 index、删除 live 重检、loading/error/empty 和响应式验收；在任务卡签 premise verified + design agree，或 counter
不要做: 不得修改实现文件；不得改 schema/migration/runtime 语义；不得把 CSS/screenshot 近似当真实预览；不得新增局部保存或标记 build/done
输出要求: 更新任务卡对应签字、独立反证审查和主审立场；明确 agree/counter 与 build 是否可准入
```
