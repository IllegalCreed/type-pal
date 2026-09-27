# TEST-GLM-EDITOR-UI-WAVE-1 · GLM 作者交付回执

2026-09-27，Owner：GLM。基线 origin/main `8254ce64`，Product Freeze `31945f4e`；
分支 `codex/glm-editor-ui-wave-r1`（worktree `~/.codex/worktrees/glm-ui-wave/type-pal`），
本回执为 R1–G3 返工后版本（合入 origin/main 至 `3ce5f48f`）。
新增 12 个 `*.glm-ui-wave.test.tsx` 叶文件 + 1 个通用 fixture（`ui/__tests__/glm-ui-wave-kit.ts`，
含正式 blank 项目装载器 loadLegalUiProject：seed→loader→toEditorState→assertProjectSaveValid）
+ 本目录回执/负控工具；产品、旧测试、配置、coverage baseline 零 diff。

## G1–G3 整改说明

- **G1 合法正控**：U1/U2/U3 的正控项目一律改为 `buildBlankProject`→loader→`toEditorState`
  正式链路（kit `loadLegalUiProject` / `legal*State`），构造后 `assertProjectSaveValid` 自证；
  资源记录用真实 gzip 字节与真实 sha256（buildSeedAssets / authoredWaveRecord），
  assetReader 为正式 `createEditorAssetReader`（source+session）。ItemUseEffectEditor 为
  受控组件，其 items/scenes 种子经 `validateAuthorItems`/`validateAuthorScenes` 等现行守卫
  可证为合法输入。不再使用空 manifest/catalog、假 hash 或 `as unknown as EditorState`
  冒充可保存项目。
- **G2 U4 闭包**：SceneCanvas 改为正式项目场景（真实 scenes/mapIndex/maps/tilesets/catalog
  互相闭合并过保存门），被编排 zone 实体经真实 `AddEntityCommand` 加入并复核保存门；
  stage 几何仅由 scene-stage 视图 hook mock 固定（地图正文为真实数据）。
  PreviewCanvas 明确改题为「委派与防御」：回放控制器为显式手写桩、阶段为经
  `checkAuthorDialogueCue` 正控的真实对话舞台、场景为正式项目场景；不再宣称完整工作流正控。
- **G3 视觉**：两张截图在完整隔离资产（含 gitignored `projects/pal/assets/{migrated,runtime}`）
  下重拍：U2 精灵库渲染真实 PAL 精灵 12 源帧网格与活体预览、无加载失败横幅；U4 场景画布
  渲染真实地图与李逍遥立绘、无场景渲染失败错误。撤回前版「视觉 N/A 部分无」表述。
- **G2-R2（本轮，2026-09-27）**：①PreviewCanvas 的 `legalStages` 现为实际 `stages` 实参并被
  `playback.play` 断言消费；`playIdentity.projectId`、scene.id、catalog/maps/tilesets/
  assetBase/reader 全部来自同一 `loadLegalUiProject` 工程。②SceneCanvas 给组件传入同一工程的
  真实 catalog/tilesets/maps/reader/assetBase，并移除 useSceneAssets mock——真实资产准备边界
  （loadTilesetAsset/loadStandardPalette 解码真实 gzip）在测试内运行，新增就绪等待；
  仅几何 hook（useStageSize/mapBoxOf/useViewZoomPan）与画布绘制（renderSceneFrame）隔离
  以保持指针确定性。资产闭包声称现基于真实输入+真实解码边界。

## 十二行去重/分类账

| # | 模块（公开入口） | 旧测试精确标题（去重锚） | 本文件新增断言（新证业务交互） | 分类 |
|---|---|---|---|---|
| 1 | SkillTab.tsx（`patch`→UpdateSkillCommand 等）；正控=blank 项目+mkSkill+真实 ITEMS 过保存门 | 「可新建、编辑，并由 object 深链精确定位」「使用共享 Hero 与方角目录行，无引用时可删除并撤销」 | ①删除 confirm 取消→零提交；②添加效果→缺省 damage 提交+undo；③效果类型切换→applyStatus 提交，召唤缺精灵→error notice 零提交；④gate 概率 50→80 提交+undo；⑤目录行点击→onObjectFocus('353') | 新增 |
| 2 | EnemyTab.tsx（patchStats/setRules/setSound→UpdateEnemyCommand）；正控=blank 项目+withSharedEnemyBattleSprite 注册真实敌方帧源+真实 items 过保存门 | 「可新建、编辑，并由 object 深链精确定位」「无引用敌人可删除且保留撤销入口」「物品交互与击败后奖励使用结构化字段」 | ①删除 confirm 取消→零提交（未引用敌）；②加规则→attack 缺省提交+undo；③删末条规则→ai.rules 消失；④偷取 无→删键/物品→首个物品；⑤启用附带效果开→{item,rate:1}、关→删键；⑥击败奖励从无到有→giveItem 追加；⑦二动提交；⑧敌队行→onOpenEnemyTeam('team-7') | 新增 |
| 3 | ItemUseEffectEditor.tsx（受控组件，onChange(next UseSpec)）；items/scenes 种子经现行 validateAuthorItems/validateAuthorScenes 可证合法 | 「消耗型工具创建配方时不会把自身设为材料」「效果链支持排序、删除并允许保留空效果链」 | ①使用目标→allAllies 提交；②成功后菜单→close；③仅战斗可用开→true/关→键删除；④自材料+成功后消耗→精确 onError 零提交（负控针）；⑤链切场景钩子→target:scene，退回→oneAlly，全队隐身→allAllies+battleOnly；⑥解除状态末项 no-op 零提交 | 新增 |
| 4 | BattleSpriteLibrary.tsx（applyDefinitionDraft/deleteDefinition）；正控=blank 项目+保留 starter-fighter 引用闭包+共享帧源真实字节/sha 过保存门（preview 证明 sha 与 catalog 一致） | 「引用结果未知时修改共享动作 ABI 必须显式确认」「当前用途被撤销或删除后回落到同一资源仍存在的第一项」 | ①仅改名→UpdateBattleSpriteDefinitionCommand 稳定 id、无 confirm、undo 还原；②删除用途→RemoveBattleSpriteDefinitionCommand 提交，回落 fighter-b，undo 还原 | 新增 |
| 5 | WorldSpriteLibrary.tsx（deleteDefinition/deleteAsset/dispatchLayout）；正控=blank 项目保留 hero 用途闭包+未配置源资源真实字节，reader 为正式 EditorAssetReader，过保存门 | 「未配置源文件直接显示全部原始帧，并能基于解码证明新增用途」「布局提交失败会回灌 canonical…」 | ①删除用途→RemoveSpriteDefinitionCommand 提交+回落 hero-walk+undo；②删除未使用源资源→catalog 记录+孤立 blob 清理，undo 连 bytes 恢复；③布局类型 directional↔static 提交 | 新增 |
| 6 | TilesetTab.tsx（commitMetadataField→UpdateTilesetMetadataCommand）；正控=blank 项目（保留 starter 供地图闭包）+追加真实字节瓦片集过保存门，reader 读真实 blob | 「名称与分类失焦提交到会话并只使用全局保存」 | ①重命名+改分类→id 与 asset 绑定稳定（负控针：id 漂移→零提交即红）；undo 两次精确还原；②focusObjectId 深链→hero/readonly 显示 tiles-b | 新增 |
| 7 | CutsceneTab.tsx（importVideo→UpsertAssetCommand）；正控=blank 项目+正式 EditorAssetReader，过保存门 | 「fails closed when the live shared script still references…」「does not commit deletion when the live oracle changes…」 | ①视频导入→`video.authored.<hash16>` record/path 64hex.mp4/blob 32B/选择与 onObjectFocus；②非法容器→「只支持有效的 MP4 或 WebM」零提交（负控针）；③帧导入弹窗取消→零提交 | 新增 |
| 8 | ImageTab.tsx（importFile→prepareAuthoredImage+UpsertAssetCommand）；正控=blank 项目+正式 EditorAssetReader，过保存门 | 「keeps delete on the selected object hero and restores the record and bytes on undo」「shows an unknown reference count…」 | ①立绘 PNG 导入→`portrait.authored.*` record/path/label「新立绘」/blob/选择；②非 PNG→「只允许导入 PNG 文件」零提交；③删除弹窗取消→零 readBytes 零提交 | 新增 |
| 9 | AudioAssetWorkbench.tsx（importFile→真实 authoredWaveRecord+UpsertAssetCommand）；正控=blank 项目+真实命令入库的替换目标，reader 正式，过保存门 | 「recovers when A→B→A reuses an inflight A…」「rechecks live references after the asynchronous delete byte read」 | ①WAV 导入→`sound.authored.<hash16>` path 64hex.wav/label boom/blob 32B/选择；②非法 WAV→「不是有效 WAV 文件」零提交；③替换→同 id sound.hit、label 命中音效保留、新 blob 40B、undo 还原 | 新增 |
| 10 | PreviewCanvas.tsx（toolbar→playback API；openEngineTrial→window.open；dialog→confirmDialog）。**委派与防御**：legalStages（checkAuthorDialogueCue 正控）为实际 stages 实参并被 play() 断言消费；catalog/maps/tilesets/assetBase/reader 与 playIdentity.projectId 均来自同一正式工程；回放控制器仍是显式手写桩 | 「预览控制使用单行共享工具栏…」（startPlayback 代理路径）「默认聚焦否，方向/提交/Escape…」 | ①无 startPlayback：播放→play(sourceKey,stages,{ownerId})、单步→paused、暂停/继续/重置→pause/stop/resume；②引擎试玩 URL 含 pos=3,5&facing=up（focus 实体 3,4→row+1）；③对话行 speaker 解析（李逍遥）+继续 ▾→confirmDialog | 新增 |
| 11 | SceneCanvas.tsx（onPointerDown/Move/Up→onSelectEntity/onMoveEntity/onAddAt）；正控=同一正式工程的场景/地图索引/地图正文/瓦片集/catalog/reader/assetBase 全部真实传入，真实 useSceneAssets 解码 gzip 就绪后（fit 96%）执行指针断言；仅几何 hook 与画布绘制隔离 | 「空白 click 清选择一次，越过阈值的空白 drag 只平移」「cursor 覆盖放置、空白、平移和实体命中四态…」 | ①点击实体→onSelectEntity('zone-a') 恰 1 次（负控针：空白清选择拆除即红）；②抓取拖动→onMoveEntity('zone-a',{col:2,row:1})；③放置→onAddAt({col:6,row:2}) | 新增 |
| 12 | DataMode.tsx（tab 路由 switch→各 Tab props 整形）；正控=blank 项目会话与真实数据数组过保存门 | 「crafting 与 spirit-gourd 分别挂载独立机制页」（本文件唯一 DataMode 行为测） | ①scripts 无会话→`[role=alert]` 无法加载可复用脚本；②events 页最小挂载仅消费 tabBar；③敌人试打→onBattleTrial({kind:'enemy',id})；④sprite 页战斗域深链→BattleSpriteLibrary 挂载 | 新增 |

定向合计 **39 项 39/39 exit 0**（JSON /tmp/ui-wave-directed.json）。相邻 12 个同名旧测 **125/125**。

## 四组单点反控（共用判据 `ui-wave-mutants.mjs`，`node … wave`）

判据沿用已接收 state-commands 严判据：恰 exit（对照 0/变异 1）、恰一红、绝对文件+实际 fullName、
AssertionError-only、拒混错/timeout、load 命中 entered.json、生产 4 源 sha256 不变；自测 10 例。

| 针 | 组 | 生产注入（字节唯一） | 恰红用例 |
|---|---|---|---|
| item-consume-self-guard-drop | U1 | ItemUseEffectEditor `if (selfIsIngredient) {`→`if (false) {` | U1c 成功后消耗自材料守卫 |
| tileset-metadata-id-drift | U2 | TilesetTab `new UpdateTilesetMetadataCommand(selected.id`→`…+ 'x'` | U2c 重命名与分类只动元数据 |
| cutscene-video-magic-guard-drop | U3 | CutsceneTab videoExtension throw→return mp4 | U3a 非 MP4/WebM 内容失败零提交 |
| scene-blank-clear-drop | U4 | SceneCanvas `if (!panDrag.moved) onClearSelection()`→`if (false)` | U4a 点击命中实体…空白点击仍清选择 |

最终实跑：对照 39 项全绿 exit0；四针各恰 exit1、恰一红、fullName 逐字命中、entered.json 见证、
生产 hash 不变。机账 `/var/folders/…/type-pal-ui-wave-mutants-*`（summary.json）。

## 视觉证据（隔离环境，未占用用户 6010；G3 重拍版）

在完整隔离资产（含 gitignored `projects/pal/assets/{migrated,runtime}`）下重拍：
①U4 场景工作区 `?module=scene&page=workspace`——真实地图渲染（箱柜物件与李逍遥立绘可见，
缩放 28%），无「场景渲染失败」，无 tileset.pal.020 报错；②U2 精灵库
`?module=asset&page=sprite&domain=world&view=definition`——PAL 大世界精灵 002 真实 12 源帧
网格与活体预览（22×50 帧），用途定义/布局类型/每向帧数表单可见，无加载失败横幅。
截图 `/tmp/ui-wave-u4-scene-canvas.png`、`/tmp/ui-wave-u2-sprite-library.png`。
撤回前版「视觉 N/A 部分无」与基于加载失败现场的验收表述。

## 边界与观察

- 环境基线：fresh worktree 缺 gitignored `projects/pal/assets/{migrated,runtime}` 生成内容，
  从主检出复制后 `world-sprite-behavior.pal.test.ts` 2 项转绿、视觉重拍成功（未动 tracked 文件）。
- 前轮两处「bytes 实际 917」加载失败在补齐生成内容后消失，确认为隔离环境资产服务缺口
  （开发服务器对缺失资产返回同一 fallback），非产品数据缺陷；画面已可正常渲染。
- 门禁：定向 39/39；相邻旧测 125/125；editor 全测 **3221/3221 exit 0**（串行）；
  editor typecheck 零诊断；白名单 14 文件 Biome 0/0/0；`check:docs` PASS；`git diff --check` 干净。
- 白名单说明：docs 门禁要求新子目录进入导航，本包在 `docs/testing/README.md` 追加一行
  glm-editor-ui-wave 索引（与既往目录登记同形），是否保留交 Codex 裁定。
- 视觉 N/A 部分无；作者自验不替代 Codex 独立验收；不合 main、不标 done。
