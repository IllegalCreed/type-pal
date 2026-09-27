# TEST-GLM-EDITOR-UI-WAVE-1 · GLM 作者交付回执

2026-09-27，Owner：GLM。基线 origin/main `8254ce64`，Product Freeze `31945f4e`；
分支 `codex/glm-editor-ui-wave-r1`（worktree `~/.codex/worktrees/glm-ui-wave/type-pal`）。
新增 12 个 `*.glm-ui-wave.test.tsx` 叶文件 + 1 个通用 fixture（`ui/__tests__/glm-ui-wave-kit.ts`）
+ 本目录回执/负控工具；产品、旧测试、配置、coverage baseline 零 diff。

## 十二行去重/分类账

| # | 模块（公开入口） | 旧测试精确标题（去重锚） | 本文件新增断言（新证业务交互） | 分类 |
|---|---|---|---|---|
| 1 | SkillTab.tsx（`patch`→UpdateSkillCommand 等） | 「可新建、编辑，并由 object 深链精确定位」「使用共享 Hero 与方角目录行，无引用时可删除并撤销」 | ①删除 confirm 取消→零提交；②添加效果→缺省 damage 提交+undo；③效果类型切换→applyStatus 提交，召唤缺精灵→error notice 零提交；④gate 概率 50→80 提交+undo；⑤目录行点击→onObjectFocus('353') | 新增 |
| 2 | EnemyTab.tsx（patchStats/setRules/setSound→UpdateEnemyCommand） | 「可新建、编辑，并由 object 深链精确定位」「无引用敌人可删除且保留撤销入口」「物品交互与击败后奖励使用结构化字段」 | ①删除 confirm 取消→零提交（未引用敌）；②加规则→attack 缺省提交+undo；③删末条规则→ai.rules 消失；④偷取 无→删键/物品→首个物品；⑤启用附带效果开→{item,rate:1}、关→删键；⑥击败奖励从无到有→giveItem 追加；⑦二动提交；⑧敌队行→onOpenEnemyTeam('team-7') | 新增 |
| 3 | ItemUseEffectEditor.tsx（onChange(next UseSpec)） | 「消耗型工具创建配方时不会把自身设为材料」「效果链支持排序、删除并允许保留空效果链」 | ①使用目标→allAllies 提交；②成功后菜单→close；③仅战斗可用开→true/关→键删除；④自材料+成功后消耗→精确 onError 零提交（负控针）；⑤链切场景钩子→target:scene，退回→oneAlly，全队隐身→allAllies+battleOnly；⑥解除状态末项 no-op 零提交 | 新增 |
| 4 | BattleSpriteLibrary.tsx（applyDefinitionDraft/deleteDefinition） | 「引用结果未知时修改共享动作 ABI 必须显式确认」「当前用途被撤销或删除后回落到同一资源仍存在的第一项」 | ①仅改名→UpdateBattleSpriteDefinitionCommand 稳定 id、无 confirm、undo 还原；②删除用途→RemoveBattleSpriteDefinitionCommand 提交，回落 fighter-b，undo 还原 | 新增 |
| 5 | WorldSpriteLibrary.tsx（deleteDefinition/deleteAsset/dispatchLayout） | 「未配置源文件直接显示全部原始帧，并能基于解码证明新增用途」「布局提交失败会回灌 canonical…」 | ①删除用途→RemoveSpriteDefinitionCommand 提交+回落 hero-walk+undo；②删除未使用源资源→catalog 记录+孤立 blob 清理，undo 连 bytes 恢复；③布局类型 directional↔static 提交 | 新增 |
| 6 | TilesetTab.tsx（commitMetadataField→UpdateTilesetMetadataCommand） | 「名称与分类失焦提交到会话并只使用全局保存」 | ①重命名+改分类→id 与 asset 绑定稳定（负控针：id 漂移→零提交即红）；undo 两次精确还原；②focusObjectId 深链→hero/readonly 显示 tiles-b | 新增 |
| 7 | CutsceneTab.tsx（importVideo→UpsertAssetCommand） | 「fails closed when the live shared script still references…」「does not commit deletion when the live oracle changes…」 | ①视频导入→`video.authored.<hash16>` record/path 64hex.mp4/blob 32B/选择与 onObjectFocus；②非法容器→「只支持有效的 MP4 或 WebM」零提交（负控针）；③帧导入弹窗取消→零提交 | 新增 |
| 8 | ImageTab.tsx（importFile→prepareAuthoredImage+UpsertAssetCommand） | 「keeps delete on the selected object hero and restores the record and bytes on undo」「shows an unknown reference count…」 | ①立绘 PNG 导入→`portrait.authored.*` record/path/label「新立绘」/blob/选择；②非 PNG→「只允许导入 PNG 文件」零提交；③删除弹窗取消→零 readBytes 零提交 | 新增 |
| 9 | AudioAssetWorkbench.tsx（importFile→strategy.prepareImport+UpsertAssetCommand；真实 authoredWaveRecord） | 「recovers when A→B→A reuses an inflight A…」「rechecks live references after the asynchronous delete byte read」 | ①WAV 导入→`sound.authored.<hash16>` path 64hex.wav/label boom/blob 32B/选择；②非法 WAV→「不是有效 WAV 文件」零提交；③替换→同 id sound.hit、label 命中音效保留、新 blob 40B、undo 还原 | 新增 |
| 10 | PreviewCanvas.tsx（toolbar→playback.play/pause/resume/stop；openEngineTrial→window.open；dialog→confirmDialog） | 「预览控制使用单行共享工具栏…」（startPlayback 代理路径）「默认聚焦否，方向/提交/Escape…」 | ①无 startPlayback：播放→play(sourceKey,stages,{ownerId})、单步→paused、暂停/继续/重置→pause/stop/resume；②引擎试玩 URL 含 pos=3,5&facing=up（focus 实体 3,4→row+1）；③对话行 speaker 解析（李逍遥）+继续 ▾→confirmDialog | 新增 |
| 11 | SceneCanvas.tsx（onPointerDown/Move/Up→onSelectEntity/onMoveEntity/onAddAt） | 「空白 click 清选择一次，越过阈值的空白 drag 只平移」「cursor 覆盖放置、空白、平移和实体命中四态…」 | ①点击实体→onSelectEntity('zone-a') 恰 1 次（负控针：空白清选择拆除即红）；②抓取拖动→onMoveEntity('zone-a',{col:2,row:1})；③放置→onAddAt({col:6,row:2}) | 新增 |
| 12 | DataMode.tsx（tab 路由 switch→各 Tab props 整形） | 「crafting 与 spirit-gourd 分别挂载独立机制页」（本文件唯一 DataMode 行为测） | ①scripts 无会话→`[role=alert]` 无法加载可复用脚本；②events 页最小挂载仅消费 tabBar；③敌人试打→onBattleTrial({kind:'enemy',id})；④sprite 页战斗域深链→BattleSpriteLibrary 挂载 | 新增 |

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

## 视觉证据（隔离环境，未占用用户 6010）

Vite 隔离实例 `VITE_PROJECT_ID=pal vite --port 6177 --strictPort`（worktree 检出）+ IAB 浏览器：
①U4 场景工作区（SceneCanvas 画布/图层显隐/缩放 400%/右侧摘要 Inspector）；
②U2 精灵库路由 `?module=asset&page=sprite&domain=world&view=definition`（636 项目录、
用途定义 李逍遥(大世界)、布局类型/每向帧数表单、加载失败横幅）。截图
`/tmp/ui-wave-u4-scene-canvas.png`、`/tmp/ui-wave-u2-sprite-library.png`。

## 边界与观察

- 环境基线：fresh worktree 缺 gitignored `projects/pal/assets/{migrated,runtime}` 生成内容，
  从主检出复制后 `world-sprite-behavior.pal.test.ts` 2 项转绿（未改动任何 tracked 文件）。
- 隔离页面上观察到两条**内容基线诊断**（非本包缺陷，单列交 Codex）：场景渲染失败
  `tileset AssetId "tileset.pal.020": bytes 登记 1437，实际 917`；精灵加载失败
  `sprite AssetId "sprite.pal.002": bytes 登记 4031，实际 917`——同一 917 字节实际值暗示
  开发服务器对缺失资产返回了同一 fallback（约 917B），指向隔离环境资产服务缺口而非产品 bug。
- 门禁：定向 39/39；相邻旧测 125/125；editor 全测 **3221/3221 exit 0**（串行）；
  editor typecheck 零诊断；白名单 14 文件 Biome 0/0/0；`check:docs` PASS；`git diff --check` 干净。
- 白名单说明：docs 门禁要求新子目录进入导航，本包在 `docs/testing/README.md` 追加一行
  glm-editor-ui-wave 索引（与既往目录登记同形），是否保留交 Codex 裁定。
- 视觉 N/A 部分无；作者自验不替代 Codex 独立验收；不合 main、不标 done。
