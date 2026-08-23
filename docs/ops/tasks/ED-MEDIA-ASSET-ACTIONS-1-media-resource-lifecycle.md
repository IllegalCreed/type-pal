# ED-MEDIA-ASSET-ACTIONS-1 - 媒体资源对象操作与生命周期统一

Status: done
Phase: phase2
Capability: X2
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: codex/ed-media-asset-actions-1

## 目标

统一图像与过场资源的对象身份、改名、替换、删除和确认交互：集合级导入留在左侧目录，当前资源的替换与删除进入
中央媒体对象标题区，改名进入有标签的“属性 / 基本信息”，右侧引用与诊断只负责展示影响、阻断和定位。修复实时
`sharedScripts` 未进入资源引用快照、从而可能误删仍被共享脚本引用资源的正确性缺口。音频工作台
`ED-AUDIO-WORKBENCH-1` 后续复用本卡的资源生命周期合同，不再创建第四套资源操作。

## 范围

- 范围内:
  - `ImageTab`、`CutsceneTab` 的集合动作、当前资源动作、改名、属性、引用 / 诊断布局归属。
  - 中央预览上方使用紧凑 `DsObjectHero` 展示当前资源名称、AssetId、类型 / 来源与替换、删除动作。
  - 图像 / 过场改名使用带可见标签的 `DsField + DsTextInput`；Enter / blur 提交，Escape 恢复，等值不提交。
  - 删除与未保存帧动画切换使用共享 `DsDialog`；显示对象、影响、引用数，关闭后焦点返回触发点。
  - Cutscene 私有分组列表迁为 `DsCatalogGroupHeader + DsCatalogRow`；真实空库与筛选空态分离。
  - 资源引用适配器接入实时 canonical `sharedScripts`；展示、删除 preflight 与保存诊断消费同一 typed snapshot。
  - 更新错误的 boundary 例外：目录 overflow 只允许集合动作，不再要求 Image / Cutscene 把对象操作放在 `...`。
- 范围外:
  - 不改 AssetId、catalog、content schema、manifest、资源文件格式、迁移器或 capability 状态。
  - 不改视频播放器、帧动画编码 / 量化 / 时间线或 PNG 导入算法。
  - 不把 Tileset、WorldSprite、BattleSprite 的领域扫描 / repair plan 抽平成通用资产流程。
  - 不处理音乐 / 音效页面整体布局；由 `ED-AUDIO-WORKBENCH-1` 消费本卡合同。
- 明确不做:
  - 不在列表行放改名、替换或删除；右键 / overflow 如未来存在只能镜像 Hero，不得成为唯一入口。
  - 不使用 `window.confirm`、自制 modal backdrop、裸 `.in/.btn/.mini-icon` 承载本卡生命周期操作。
  - 不自动级联清理引用；引用存在或扫描失败时删除 fail closed。

## 前提真值门

### 一句话行为 / 工程前提

图像与过场都已经使用稳定 AssetId 和通用资源命令，但当前 UI 把“集合动作”和“当前对象动作”混在左侧目录，且资源引用
快照遗漏实时共享脚本；应只统一作者交互与引用输入，不改变资源数据或运行时播放语义。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：原版没有本项目资源编辑器；本任务不改变视频、帧动画、图片内容与播放语义。 | `docs/phase2/READ-FIRST.md:1-35`；用户 2026-08-21 指出当前资源改名 / 删除不符合统一规范。 |
| 第一阶段 | 第一阶段提供资源读取 / 播放经验，不提供当前作者工作台操作归属。 | `docs/phase2/READ-FIRST.md:68-90`; `docs/ops/tasks/A7-3-cutscene-asset-workbench.md` 记录二阶段新建的过场作者工作台。 |
| 当前二阶段 | Image / Cutscene 的替换、删除位于 `DsCatalogControls.overflowActions`；改名位于右 Inspector，Cutscene 仍为裸输入；删除 / dirty 切换使用 `window.confirm`。引用适配器已读取主 EditSession 的 `sharedScripts`，但作者编辑期间的实时脚本只在保存边界合并，页面展示与删除 preflight 因而消费 stale 副本；删除命令又要求调用方保护。 | `ImageTab.tsx:406-407,532-578,659-707`; `CutsceneTab.tsx:274-291,376-380,410,418,570-615,703-711`; `editor-asset-references.ts:8-27`; `script-editor-projection.ts:10-14,152-171`; `App.tsx:313,322,1485-1496`; `commands.ts:3003-3013`。 |
| 本任务目标 | 左侧只保留集合级导入；中央媒体 Hero 承载当前资源身份和替换 / 删除；属性区承载改名；右 Inspector 保留引用 / 诊断；所有删除使用包含 live sharedScripts 的同一引用快照。 | `editor-design-system-v1.md:304-327,451-479`; `editor-ui-audit-2026-08-15.md:85`; 用户本轮要求按通用规范复核。 |

### 反证与替代解释

- 最强替代解释: 媒体型工作台中央应只保留画布，所以对象操作放左侧 `...` 可以节省空间。
  - 否决原因: `...` 属集合标题且在资源被筛选隐藏时仍作用于后台选中对象，目标不清晰；紧凑 Hero 可固定在预览上方，
    不把媒体压成缩略图，并与对象删除统一位置合同一致。
- 什么观察会推翻当前前提:
  - 若用户明确裁定媒体资源不需要可见对象标题区、且所有对象操作必须只在右 Inspector，则需要更新 DS-C.2 / DS-R.2
    冲突并重新签字；当前用户反馈正指向“现状不符合通用规范”。
  - 若 live ScriptEditSession 已在调用 `collectEditorAssetReferences` 前被可靠合并进主 EditSession，则 sharedScripts 缺口不成立；
    当前 `DataMode` 与保存边界代码证明它们在作者会话中仍是双 session，故反证未出现。
- 已排查替代根因:
  - runtime / 命令分类: 通用 Update / Upsert / DeleteAssetCommand 已存在，本卡不改其数据语义。
  - 原版 / 第一阶段理解: 无作者 UI 真值可照抄。
  - extractor / 数据解码: 不涉及资源内容解码错误。
  - audit / test model: JSX、boundary 断言、collector 输入和 command 注释交叉证明，不仅依据截图。

### 用户可见偏离

- 是否主动偏离已核真值: yes（用户要求修正当前资源操作规范）
- `before -> after` 一句话: 改名藏在右侧标题、替换 / 删除藏在左侧 `...`、浏览器原生确认 -> 当前资源标题明确显示目标与替换 / 删除，属性字段负责改名，共享对话框负责确认与引用阻断。
- 代表场景: 选择 `video.pal.001` 后，中央标题显示“PAL 视频 001 / video.pal.001”，可直接替换或删除；右侧属性可改显示名称，引用页解释为何不能删除。
- 用户裁决: 2026-08-21 用户指出该页资源重命名 / 删除未按通用规范，授权按统一合同审查；2026-08-23
  三方设计签字齐后，用户明确“推进”，批准进入 build。

## 上下文锚点

- `docs/phase2/READ-FIRST.md`。
- `docs/phase2/editor/editor-design-system-v1.md:304-327,451-479`：按钮、危险操作、对象 / 媒体工作台合同。
- `docs/phase2/editor/editor-ui-audit-2026-08-15.md:75-85,100-108`：U-12 对象级删除与媒体 / 资源长尾。
- `packages/editor/src/ui/design-system/recipes.tsx:43-194,723-809`：Hero、CatalogRow、CatalogControls、Workbench / Inspector recipes。
- `packages/editor/src/ui/ImageTab.tsx:532-707`、`CutsceneTab.tsx:140-196,274-291,376-380,570-711,893-1004`。
- `packages/editor/src/core/editor-asset-references.ts:8-27`、`packages/content/src/asset.ts:305-312,535-541`。
- `packages/editor/src/core/commands.ts:2905-3039`：已有通用资源命令及调用方删除保护边界。
- 不得重新引入: 目录行内资源生命周期动作、目录 `...` 作为当前对象唯一入口、Inspector 标题裸输入、
  `window.confirm`、自制确认弹窗、重复资源引用 collector。

## 验收条件

- 功能:
  1. Image / Cutscene 左侧目录只承载筛选、类型 / 分组和导入；不存在当前资源替换 / 删除 overflow action。
  2. 当前资源始终有中央紧凑 Hero；名称、AssetId 与操作目标一致，筛选隐藏当前项时不产生含糊操作。
  3. 替换保留 AssetId 与现有格式校验；删除有引用或扫描失败时阻断，无引用时 `DsDialog` 确认，undo 恢复 record 和二进制。
  4. 改名有可见 label，Enter / blur 单次提交，Escape / 无变化零提交；全局保存仍是唯一磁盘保存入口。
  5. shared script 顶层及嵌套 `playVideo` / `playFrameAnimation` / 图像类引用（若内容合同支持）进入展示、删除门禁与保存诊断。
  6. Cutscene 目录和属性使用共享 recipes；原视频播放器、帧动画编辑器和引用 / 诊断组件保持行为。
  7. 删除后选择与 URL object 同步；真实空库、筛选空、busy/error 均有可访问恢复状态。
- 测试:
  - collector：live sharedScripts 顶层 / 嵌套资源引用命中，非目标 ID 不误中，扫描失败删除零 mutation。
  - Image / Cutscene：Hero 操作位置、改名提交 / 取消、替换、删除 Dialog、引用阻断、undo/redo、deep link / 过滤。
  - Cutscene dirty 帧动画切换、替换、删除统一 Dialog；关闭返回焦点。
  - boundary：禁止 Image / Cutscene 对象动作进入 `DsCatalogControls.overflowActions`、`window.confirm`、裸重命名 input、自制 lifecycle modal；要求 Hero / shared rows / dialog。
  - 定向 Vitest + editor typecheck + `git diff --check`；只运行一次必要长套件。
- 文档:
  - 消解 DS-R.2“右侧资产操作”与 DS-C.2“完整对象删除进 Hero”的歧义：右侧承载属性 / 元数据、引用、诊断；
    当前完整资源替换 / 删除固定在媒体 Hero。
  - 在 `ED-AUDIO-WORKBENCH-1` 记录复用本卡生命周期合同与依赖顺序。
- 视觉 / 手工验证:
  - 1280×720 与窄中央列各验证 Image、Video、FrameAnimation：Hero 不挤压媒体为缩略图，长名称 / ID 不横向溢出。
  - 替换、引用阻断删除、可删除确认、dirty 切换 Dialog 的目标和焦点明确；浏览器 console 无错误。
- E2E 用例登记:
  - N/A：功能性编辑器界面，开发期做一次最小浏览器 smoke。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: verified（Image / Cutscene JSX、reference adapter、content collector 与 DeleteAssetCommand 一手证据）
  - design: agree（集合动作左栏；当前资源身份 / 替换 / 删除进紧凑媒体 Hero；属性区改名；统一 Dialog 与 live reference snapshot）
- Kimi:
  - premise: verified（2026-08-23 独立直读一手代码，与 GLM 非同源复核）。已核：`ImageTab.tsx:532-578`
    替换/删除在 `overflowActions` 且 `window.confirm`（:534）；`CutsceneTab.tsx:274-291,570-615,703-711`
    裸 `.in` 改名 input、overflow 删除、`window.confirm`；`commands.ts:3003` 引用保护在调用方。
    独立确认 GLM GM1 措辞修正成立且可再收紧：`editor-asset-references.ts:9-25` 现传的是主会话
    `state.sharedScripts`；`script-editor-projection.ts:10-14,152-171` 证明 ScriptEditSession 是唯一脚本
    作者真值、shell 仅在 `App.tsx:1485-1496` 序列化边界合并；本人另核 `editor-history-coordinator.ts`
    全文无 sharedScripts/sync/merge 路径（零命中），即编辑期不存在任何 shell 侧 live 同步。保存门因先
    merge 而安全，真实缺口锁定在页面展示与删除 preflight（`ImageTab.tsx:406-407`、`CutsceneTab.tsx:410,418`
    均只消费 shell state）。
  - design: agree（Hero/左栏集合动作/属性区改名/共享 DsDialog 与 DS-C.2、DS-R.1/DS-R.2 合同一致；
    `DsObjectHero`（recipes.tsx:46）与 `DsDialog`（overlays.tsx:46）均已存在，无新造 primitive；
    设计结论 7 限制 Image/Cutscene 只共享生命周期外壳，防止巨型领域组件；GM1-GM3 落钉方向正确，
    其中 GM1 的修复必须复用 `projectActiveScriptEditorState` 同源输出，不得在资源页另写合并逻辑）
- GLM:
  - premise: **verified（2026-08-23，本人一手读码 + git 考古，非代理）——附一处真值矩阵
    事实修正（GM1，不推翻前提）**：
    1. **UI 现状属实**：Image/Cutscene 的对象动作在 `DsCatalogControls.overflowActions`
       （卡文锚点复核）；`window.confirm` 删除/dirty 切换属实；Cutscene 裸输入改名属实。
    2. **sharedScripts 缺口成立但描述过时（→GM1）**：卡文称"引用适配器未传
       sharedScripts"——git 考古证实该措辞基于 ecbb6259 时点（当时
       editorAssetReferenceSource 确实无 sharedScripts）；**0ee277ab 已把它加入**
       （当前 :8-27 有 `sharedScripts: state.sharedScripts`）。**真正的缺口仍在**：
       主 EditSession 的 sharedScripts 只在保存时经
       `mergeEditorProjectionWithCurrentAuthorState`（App.tsx:1492 serialize 路径）从
       script session 合并——**编辑期间 Image/CutsceneTab 消费的引用快照读的是 stale
       主态副本**，未保存的共享脚本新增 playVideo/图像引用仍可能被误删。修复方向
       （接实时 canonical sharedScripts）正确，但真值矩阵该行应改为"传了 stale 副本"
       而非"未传"。
    3. **删除命令边界属实**：`DeleteAssetCommand` 注释"引用保护由调用方在 dispatch 前
       执行"（commands.ts:3003-3013）——调用方快照不完整即真实风险。
  - design: **agree（2026-08-23，附必落钉 GM1-GM3，不阻塞准入）**。Hero 承载当前对象
    动作 / 属性区改名 / DsDialog 确认 / 引用-诊断-删除同源 typed snapshot——方向正确。
  - **必落钉 GM1-GM3：**
    - **GM1（真值矩阵行修正）**：build 前把"适配器未传 sharedScripts"改为"主态
      sharedScripts 为 stale 副本（仅保存时合并）"；修复应让 Image/Cutscene 消费
      `projectActiveScriptEditorState` 产出的 live sharedScripts（与 App:322 的
      scriptState 同源），而非复制第二份合并逻辑。
    - **GM2（typed snapshot 单源断言）**：展示、删除 preflight、保存诊断三处消费的
      引用集合必须出自同一次 `collectEditorAssetReferences` 调用（或同一 memo）——
      加一条测试断言三者在同一 state 下结果全等；扫描失败 fail-closed（删除零 mutation）。
    - **GM3（undo 恢复二进制）**：删除 undo 必须同时恢复 catalog record 与 blob 字节
      （DeleteAssetCommand 已有 previousBytes 预读）；测试覆盖"删除→保存→undo→保存"
       后文件与 record 均在。与 ED-AUDIO-WORKBENCH-1 的复用边界写明：本卡交付合同，
       音频卡不得第四套实现。
- 独立反证审查:
  - 审查者: Kimi
  - 独立证据锚点: `script-editor-projection.ts:10-14,152-171`（双 session 与唯一合并点）；
    `App.tsx:313,322,1485-1496`（页面消费 shell；scriptState 经 projectActiveScriptEditorState；
    保存才 merge）；`editor-history-coordinator.ts`（grep sharedScripts/sync/merge 零命中，无 live 回写）；
    `ImageTab.tsx:406-407,532-578`；`CutsceneTab.tsx:410,418,570-615`；`commands.ts:3003-3039`。
  - 可证伪观察: 若 shell.sharedScripts 存在编辑期 live 同步路径，sharedScripts 缺口不成立——直读
    coordinator 与投影层未见；若 DS-R.2 禁止媒体页中央对象标题区，Hero 方案须重签——
    `editor-design-system-v1.md:528-533` 只禁“默认塞 Inspector”，未禁 Hero；若 DeleteAssetCommand 已内建
    引用检查，调用方 fail-closed 前提过时——`commands.ts:3003` 注释证伪。
- counter / 分歧处理: N/A
- 缺签豁免: N/A
- build 准入结论: allowed（2026-08-23；三方 premise/design 齐，用户批准推进）

### 进入 done 前:审查签字

- Codex: **accept（2026-08-23）**。Image / Cutscene 已统一为左侧集合动作、中央 `DsObjectHero`
  当前资源动作、右侧属性 / 引用 / 诊断；共享改名与确认对话框行为测试通过。实时 canonical
  scene / item / sharedScript 引用进入同一 typed snapshot，扫描失败 fail closed；删除→保存→undo→保存
  的 record 与二进制恢复测试通过。内容包全量 424 项通过；编辑器长套件一次运行中除 3 条旧 Inspector
  DOM 契约外 1058 项通过，更新契约后该文件 6 项及受影响 UI 55 项通过；typecheck、production build、
  `git diff --check`、1280×720 / 1024×720 浏览器 smoke 与 console 均通过。收口复审发现并修复
  “取消原生文件选择器误清 dirty”“多个 sharedScript 引用站点合并”“扫描失败显示 0 处”三项 P1；
  4 个相关文件 13 项回归、content / editor typecheck 与二次独立复审均通过。
- Kimi: accept（2026-08-23，独立直读 c8ace71e diff 与现行实现 + 聚焦复跑，非代理）。按委托三项重点：
  - **布局统一 ✓**：Image/Cutscene 左栏只剩搜索/分组/导入（`overflowActions` 在两页零命中，
    boundary.test.ts:508-530 静态门禁锁定）；中央 `DsObjectHero` 承载身份与替换/删除
    （ImageTab.tsx:682-723、CutsceneTab.tsx:742-796）；右侧 `resource`/`references`/`diagnostics`
    三 tab；改名复用共享 `MediaAssetNameField`（`DsField` 可见标签 + Enter/blur 提交、Escape 恢复、
    等值零 dispatch，MediaAssetLifecycle.tsx:15-60）。
  - **生命周期交互 ✓**：替换走 Hero + 隐藏 file input，原生选择器取消为无操作且重置 value、
    replace target ref 即清（ImageTab.tsx:627-639、CutsceneTab.tsx:713-737）；删除 fail-closed——
    扫描失败显示“未知（扫描失败）”且 confirm disabled、有引用 disabled；删除前经
    `getCurrentAuthor?.() ?? currentAuthor` 复扫 live 态（ImageTab.tsx:544-547）。Cutscene 的删除与
    dirty 切换共用单一 `lifecycleRequest` 状态机，`requestTransition` 把选择/导入/替换统一路由进同一
    Dialog（CutsceneTab.tsx:396-437,1007-1028），无并发弹窗。DsDialog 焦点生命周期完整：open 时捕获
    `document.activeElement`、autofocus 落点、close 后 rAF 焦点返回触发点（overlays.tsx:5-43）。
  - **窄宽布局与 DS 复用 ✓**：Hero 用 DS 既有网格 `minmax(0,1fr) auto` + `min-width:0`、meta/actions
    flex-wrap、窄断点回左（recipes.css:77-166,890-893）；`media-asset-hero` 仅为无规则扩展钩子，
    无定制溢出风险；`MediaAssetConfirmDialog`/`MediaAssetNameField` 只用 Ds* 组件（boundary 测试
    断言无裸 input/label/button）；旧 `cutscene-asset-row/group-header` CSS 类已被 boundary 禁回。
  - 另核 GLM 域交叉点：`projectCurrentAuthorReferenceSlices` 与保存边界 merge 共用同一切片函数
    （script-editor-projection.ts:146-182），满足 GM1“不得在页面内再拼一套合并”。
  - 聚焦复跑：MediaAssetLifecycle/ImageTab/CutsceneTab/editor-asset-references/script-editor-projection/
    workspace-persistence/boundary/AssetInspectorTabs 8 文件 93/93 通过；content asset 27/27 通过
    （全量长套件按纪律采纳 Codex 记录，未重复）。
  - 非阻塞观察：`media-asset-hero` className 当前无对应 CSS 规则，是纯扩展钩子；无害，记录在案。
- GLM: **accept（2026-08-23 done 前覆盖/测试终审，本人一手读码 + focused 独立复跑，非代理；
  基于实现提交 c8ace71e，23 文件 +1978/-683）**。按委托四项重点逐一验证：
  - **① 同源引用 ✓（GM1 的正确落地）**：`editorAssetReferenceSource(state, currentAuthor)`
    新增第二参——scene/items/sharedScripts 三切片经
    `projectCurrentAuthorReferenceSlices`（script-editor-projection:153）从 **live
    ScriptEditorState** 投影（与保存边界 mergeEditorProjectionWithCurrentAuthorState
    **共用同一切片函数**，非第二套合并逻辑）；DataMode:456/:485 把 `script?.state`
    显式传给 Image/Cutscene——正是我 GM1 钉的"消费 App 已投影 current author state，
    不在页面内再拼"的实现形态。**stale 副本缺口闭合**：未保存共享脚本的
    playVideo/playFrameAnimation 引用在编辑期间即进入快照。
  - **② 多 sharedScript 独立站点 ✓（Codex 收口复审修复的 P1）**：content 侧
    `sharedScripts[JSON.stringify(scriptId)].body` 逐脚本站点（asset.ts:549-555）；
    测试断言两个脚本各引用同一资源时产出 `sharedScript:shared/test` 与
    `sharedScript:shared/other` **两个独立 site**（editor-asset-references.test:88-95）
    ——无站点合并。
  - **③ fail-closed + 零 mutation ✓（GM2 落地）**：`tryCollectEditorAssetReferenceSnapshot`
    返回 `{status:'error', message}` 而非空数组；ImageTab 删除路径双重使用——
    首扫 error 即 `setError('引用扫描失败，未删除')` 并 return（**零 mutation**），
    读字节后 finalScan 复扫防 TOCTOU（"读取资源期间新增了引用"二次守卫）；
    CutsceneTab:446 同构。**这比我的 GM2 钉更强**——不仅同源还防了读-删间隙。
  - **④ delete→save→undo→save 双恢复 ✓（GM3 落地）**：
    workspace-persistence.test 专项测试完整链路：dispatch 删除（携 previousBytes
    预读）→ writeProject 落盘（removePaths 生效，断言文件与 index.json record 均消失）
    → undo（断言 catalog record **与 assetBlobs 字节逐字节相等**——DeleteAssetCommand
    invert 用 `previousBytes.slice(0)` 恢复二进制）→ 再 writeProject（断言 record 与
    文件均回来）。
  - **focused 独立复跑 ✓**：editor-asset-references + workspace-persistence +
    MediaAssetLifecycle 3 files/36 tests；ImageTab+CutsceneTab 7 tests；typecheck
    全绿（全量长跑按纪律未重复，Codex 记录 content 424 + editor 1058+61 采纳）。
  - 备注：Codex 收口复审自查修复的三项 P1（取消文件选择器误清 dirty / 多 sharedScript
    站点合并 / 扫描失败显示 0 处）均与我 GM1-GM3 钉直接对应——钉的预判价值得到验证。
- counter / 返工处理: 无（GLM 侧）。
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: **done allowed（2026-08-23）——Codex + Kimi + GLM 三方 review accept 已齐，用户验收通过。**

## Draft: 设计与风险

### 设计结论

1. Collection action（导入 / 新建）进入 `DsCatalogControls.actions` 或对应 `DsCatalogGroupHeader`。
2. Current resource action（替换 / 删除）进入中央 `DsObjectHero.actions`；危险按钮保持 danger，引用原因不塞进按钮文案。
3. Rename 进入右侧 `属性` / `资源`的 `DsField + DsTextInput`，Hero 只显示已提交名称；AssetId/path/origin/mediaType/size 只读。
4. Inspector 保持“属性 / 引用 / 诊断”语义；引用页拥有阻断原因与 locator，不复制删除按钮。
5. `collectCurrentAuthorAssetReferences(mainState, liveScriptState)`（最终命名由实现决定）是 UI、删除 preflight、保存诊断的单一输入适配器。
6. Cutscene 的视频 / 帧动画分组结构保留，但行壳与分组标题共享；18 项无需为本卡引入虚拟化。
7. Image / Cutscene 只共享外壳和生命周期，不共享各自预览 / 导入算法；避免抽成巨型 `ResourceWorkbench`。

### 已知风险

- 新增 Hero 会压缩媒体预览高度：使用 compact actions / tag 合同，Hero 固定在预览滚动层之外，窄布局允许 meta / actions 换行。
- sharedScripts 引用修复可能增加真实引用与阻断：这是正确性修复，必须以 occurrence 数和 locator 测试证明，不兼容漏扫。
- dirty 帧动画 Dialog 与删除 Dialog 状态可能交叉：使用单一明确 dialog state / request，切换或删除结束前不得并发打开。
- Image 与 Cutscene 的 Inspector 历史合同不同：不强行统一媒体元数据字段，只统一 Section / PropertyRow / lifecycle 位置。

### 主审立场

- Reviewer: Kimi 主审 UI 架构 / dialog / dirty lifecycle；GLM 主审 live reference 输入、删除原子性与测试矩阵。
- 结论: Kimi agree（2026-08-23）+ GLM agree（2026-08-23，GM1-GM3）；Codex 已 agree
- 必改项: 无新增；GLM GM1-GM3 为 build 必落钉。
- Kimi build 期关注项（非门禁）: ①GM1 修复的消费口必须与 `App.tsx:322` 的 `scriptState` 同源，禁止资源页
  私写 session 合并；②dirty 帧动画切换 Dialog 与删除 Dialog 共用单一 dialog state，关闭后焦点回触发点；
  ③Hero 固定在预览滚动层外，窄布局允许 meta/actions 换行，不把媒体压成缩略图；④卡面 `Branch:` 仍写
  codex/ed-pal-workspace-modes-1，该工作树已收口（0ee277ab 入 main），build 分支由 Coding Owner 另开。
- 是否建议进入 build: 是（三方 premise/design 已齐，待用户确认或按规程开放；本卡是
  ED-AUDIO-WORKBENCH-1 的生命周期前置合同，应先构建）

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件:
  - `packages/content/src/asset.ts` / `asset.test.ts`
  - `packages/editor/src/core/{script-editor-projection,editor-asset-references,project-diagnostics}.ts`
    及对应测试、`workspace-persistence.test.ts`
  - `packages/editor/src/ui/{ImageTab,CutsceneTab,MediaAssetLifecycle,DataMode,ProjectWorkbenchTab,App}.tsx`
    及 UI / boundary / Inspector 契约测试、`editor.css`
- 实现摘要:
  - 抽出 `projectCurrentAuthorReferenceSlices`，让页面引用、删除 preflight、保存诊断复用同一份
    “shell 元数据 + 当前 canonical 脚本正文”投影，不在资源页复制 session 合并逻辑。
  - 资源引用快照改为 typed safe result；live scene hooks、items、sharedScripts 均进入引用源，扫描异常时
    删除零 mutation。content collector 补齐 canonical scene hook variant 路径与稳定 site。
  - Image / Cutscene 左侧只保留搜索、分组与导入；当前对象替换 / 删除进入中央 `DsObjectHero`；属性页
    复用 `MediaAssetNameField`，删除与 dirty 切换复用 `MediaAssetConfirmDialog`。
  - Cutscene 私有列表壳迁为 `DsCatalogGroupHeader + DsCatalogRow`，真实空库与筛选空分别表达；删除后
    选择与 URL 目标按确定顺序同步。
  - GM3 真实 workspace 测试覆盖删除→保存→markSaved→undo→保存，断言 catalog record 与原始文件字节恢复。
- 运行命令:
  - `pnpm --filter @type-pal/content check`：33 files / 424 tests passed。
  - `pnpm --filter @type-pal/editor check`：typecheck passed；长套件一次执行，138/139 files、1058/1061
    tests passed；唯一失败为本卡有意移除 Inspector 重复标题并新增独立诊断 tab 后的 3 条旧 DOM 断言。
  - 更新该契约后 `vitest run src/ui/AssetInspectorTabs.test.tsx`：6/6 passed。
  - 最终受影响 UI：5 files / 55 tests passed；此前 core 定向 27、workspace persistence 30 项通过。
  - 收口 P1 定向回归：`editor-asset-references`、`MediaAssetLifecycle`、`ImageTab`、`CutsceneTab`
    共 4 files / 13 tests passed；content asset collector 27/27 passed。
  - `pnpm --filter @type-pal/editor typecheck`、`pnpm --filter @type-pal/editor build`、新增文件 Biome、
    `git diff --check` 均通过。
- 浏览器 / 手工检查:
  - `?ui_samples=1&module=asset&page=image|cutscene`，1280×720 与 1024×720：中央 Hero 名称 / ID /
    类型 / 来源 / 操作目标一致，Hero `scrollWidth === clientWidth`，正文未被压成缩略图。
  - 过场引用阻断删除 Dialog 显示目标、影响和 1 处引用，危险确认 disabled；取消后焦点返回 Hero 删除按钮。
  - 两页浏览器 console 无 error。
- 跳过的检查及原因: 未第二次运行完整 editor 长套件；遵守用户“长套件不要重复跑”的明确要求。
  已对唯一失败文件定向修复并通过 6/6，再以受影响 UI 55 项、typecheck、build 与浏览器 smoke 收口。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: Codex self-review accept；内部并行 diff / UI / 引用压力审查提出的 3 项 P1 已修复，
  三路复审均 accept；Kimi accept（2026-08-23，布局/生命周期交互/窄宽布局与 DS 复用直读核验 +
  聚焦 8 文件 93/93 + content asset 27/27 复跑，逐条证据见“进入 done 前:审查签字” Kimi 段）；
  GLM accept（2026-08-23，同源引用/独立站点/fail-closed/双恢复链路，见同节 GLM 段）。
- 必须返工项: 无
- Accept / rework: 三方 accept、用户验收通过；任务收口为 done。

## 用户验收

- 用户结论: **accept（2026-08-23）**。用户按图片 / 过场资源页的布局、改名、替换、删除阻断、
  dirty 保护与窄宽表现口径完成产品验收，并明确回复“验收通过”。
- 后续任务: Tileset / Sprite 专业资源页继续保留领域流程，仅共享确认 primitive 的迁移另行排期。

## 交接日志

- 2026-08-23 User: 产品验收通过。Codex / Kimi / GLM 三方 review accept 已齐，done 门禁满足，
  本卡正式收口。
- 2026-08-23 Kimi（布局/交互主审）: implementation review 完成并签 **accept**。独立直读
  c8ace71e：左栏集合动作/中央 DsObjectHero/右侧三 tab 布局统一；MediaAssetNameField（Enter/blur/
  Escape/等值短路）与 MediaAssetConfirmDialog（fail-closed、未知引用数禁用）共享合同；
  DsDialog 焦点捕获/落点/返回完整；Cutscene 删除与 dirty 切换共用单一 lifecycleRequest 状态机；
  原生文件选择器取消无操作且 target ref 即清；DS Hero 网格 + flex-wrap + 窄断点静态确认；
  boundary 测试锁定无 overflowActions/window.confirm/裸控件/旧 CSS 类；GM1 的切片函数与保存边界
  共用同源落实。聚焦复跑 8 文件 93/93 + content asset 27/27 全绿；全量长套件采纳 Codex 记录未重复。
  非阻塞观察：`media-asset-hero` 为无规则扩展钩子。未改实现文件，未代签 GLM，未标 done。
  Next: 三方 accept 已齐，待用户验收收口。
- 2026-08-23 Codex（收口复审）: 内部并行审查发现 dirty file-picker、sharedScript site 粒度、
  扫描失败计数三项 P1；全部修复并补回归。定向 13 项、collector 27 项、两包 typecheck 与 diff check
  通过，三路复审均 accept。内部子审查不代替 Kimi / GLM 正式签字，本卡保持 review。
- 2026-08-23 Codex（Coding Owner）: build 完成并转 `review`。实现媒体 Hero / 共享名称与确认合同、
  Cutscene DS 目录、live canonical 引用投影与 fail-closed 删除；GM1-GM3 均落地。内容全量 424、
  受影响 UI 55、Inspector 契约 6、core 定向 27、workspace persistence 30 项通过；editor typecheck / build、
  diff 与两档浏览器 smoke 通过。Codex 签 `accept`；等待 Kimi / GLM review，未标记 done。
- 2026-08-23 GLM（live reference 输入/删除原子性/测试矩阵）: 审查完成，签 **premise verified
  + design agree（附 GM1-GM3）**。UI 现状与删除命令边界属实；**sharedScripts 缺口成立但措辞
  过时——0ee277ab 已把主态 sharedScripts 传入 source，真缺口是编辑期间 stale 副本（仅保存时
  merge）**，修复方向正确（GM1 修正矩阵行）；GM2 钉三处消费同一次 snapshot；GM3 钉 undo 恢复
  二进制与音频卡复用边界。未改实现，未代签 Kimi，未改准入结论。
- 2026-08-23 Kimi（UI 架构/dialog/dirty lifecycle）: 审查完成，签 **premise verified + design agree**。
  独立直读 Image/Cutscene JSX、DeleteAssetCommand、DsObjectHero/DsDialog 与 DS 合同；独立确认 GM1 并
  补证 `editor-history-coordinator.ts` 无任何 sharedScripts live 回写路径，缺口精确锁定在页面展示与删除
  preflight 消费 shell stale 副本。补四条 build 期关注项（scriptState 同源、单一 dialog state、Hero 不压
  预览、卡面 Branch 字段已过时）。三签已齐，但按本轮用户指令保持 draft 与 build 准入 blocked，开放
  决定留给用户。未修改实现文件。
- 2026-08-23 User: 三签齐后明确“推进”，开放 build；Codex 更新分支与 GM1 真值措辞并接手实现。
- 2026-08-21 Codex: 完成 Image / Cutscene / Music / Sound / Tileset / Sprite 资源动作全量只读审计；创建本卡并签
  premise / design。Evidence: 本卡真值矩阵与 inventory。Next: Kimi / GLM 独立设计审查；三签齐前不得改实现。
- 2026-08-23 GLM（覆盖/删除原子性/测试矩阵）: done 终审完成并签 **accept**。四项委托
  全过：①GM1 stale 副本缺口正确闭合（投影切片与保存边界共用、DataMode 显式传 live state）；
  ②多 sharedScript 独立站点（逐脚本 site + 双脚本测试）；③fail-closed 双重扫描 + TOCTOU
  守卫（强于 GM2 原钉）；④delete→save→undo→save 双恢复完整链路测试（record + 二进制逐字节）。
  focused 36+7+typecheck 复跑全绿。Codex 三项 P1 自查修复与 GM1-GM3 钉一一对应。未改实现
  文件，未代签 Kimi。Next: Kimi 布局/交互主审 + 用户验收。

## 下一位 Agent 提示词

无下一位 Agent 提示词：Codex、Kimi、GLM 三方 review accept 均已齐（2026-08-23），等待用户验收/收口。
