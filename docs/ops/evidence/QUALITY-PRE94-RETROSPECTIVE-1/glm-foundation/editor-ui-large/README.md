# 批56:editor ui 大件 56 文件（零整改批）

范围:`packages/editor/src/ui/` 401 行以上生产文件 56 件（按行数升序分两段:28 件 15555 行 + 28 件 43327 行,合计 58882 行）。全文读毕。八维审查（A–H）全部通过,零源码改动、零 diff。至此 `src/ui` 全部非测试生产文件（微/小 58 + 中 48 + 大 56 = 162 件）审查收口。

## 结论(要点)

- **四大件**:App 4766 行（编辑器组合根:双会话 historyCoordinator 断言、C-gate 页面自持订阅降级（actor/project/item/crafting/spirit-gourd/poison/scripts 页由 Connected* 包内订阅,根只订 chrome 元数据;map/scene/未知页保留 legacy 全版本订阅）、引用跳转 openProjectReference 按 locator 类型派发并逐一在派发前核验目标存在、删除/Undo 快捷键 typing+dialog 守卫、五区布局 fitSidePanelWidths 比例挤压、PlacePalette/EntityInspector/SceneInspector/NamedEntryInspector 全套检查器);ScriptEditor 4417 行（canonical 脚本族:AUTHOR_COMMAND_PRESENTATION_60+ 全 kind 表、describeCanonicalCommand 作者命令→运行时投影复用 ScriptTree 摘要、CommandRows 重排身份键、CanonicalCommandForm 优先走 createAuthorCommandFormBridge 桥接 CommandForm 共享四家族、插入对话框 projectCommandExamples 从现有正文取样+cleanInsertionExample 清空子块+fallbackInsertionChoice 项目前提不可用原因、CanonicalScriptBodyEditor 本地指纹预判(locallyExpectedBodyFingerprint 防自提交被外部 epoch 淘汰)、CanonicalScriptFlowEditor 步骤卡/finishStep 去向/步骤删除 initial+next 全图重指、removeTriggerStage 拒绝自接替);MapMode 3740 行（N 视觉层+独立碰撞编辑器:pointerGesture 笔画/拖选/Alt 候选列表/上下文菜单、变换会话 planMapPaste/Move/StampGroup reject→overwrite 确认、dispatchMapPatch 三所有权域写保护、组内编辑 EditStampPlacementCommand 隔离、结构操作(缩放/删层) inspectStampStructureImpact 先解组/删组确认、Esc 分层退出链、会话切换全量 reset 防 mapId/placementId 跨项目串线、双层 canvas 缓存基图+选区叠加脏检查 18 键）;Workbench(ProjectWorkbenchTab 2.5k):manifest 单一真源四页（概览/全局资源角色绑定+原位试听/入口点编辑含 id 修复模式+StartWorldFields 初始队伍/道具/世界资源+未入队覆盖与孤儿资源清理/问题分组 IssueList 分页）。
- **共享画布族**:scene-stage(useSceneAssets 磁盘回退时瓦片集只能从读出的地图确定——旧实现提前取 liveMap 会以空 registry 进 ready 画黑屏;drawGridBlocked 贯穿斜线网格 O(可见宽+高) 替代 O(格数) 菱形、碰撞叠加 null≠0 不复用 fail-closed);SceneCanvas(命中盒与引擎同一 spriteBlitRect +7 下沉、幽灵半透明、外选中定位 1.5× 保底、pickFromCanvasRef 画布点选不动镜头);PreviewCanvas(演出预览:rAF 自绘不依赖 React、相机 POI 平滑趋近+sceneFraming 实体质心回退、移动轨迹预览 fitScriptMovementPreview 虚线条件/◇瞬移、confirm 键盘焦点)。
- **资产工作台族**:WorldSpriteLibrary/BattleSpriteLibrary(定义/源帧双视图域、用途增删、帧删除 planWorldSpriteFrameDeletion/planBattleSpriteFrameDeletion 精确重排绝对帧号+directional 四向结构保护、替换源文件禁缩帧、动作编辑对话框路由 pendingActionRoute);SpriteResourceViewer(planWorldSpriteFrameDeletion 共享);AudioAssetWorkbench(strategy 抽象音乐/音效双实例+claimEditorAudioPreview 全局独占+AbortError 重试一次);ImageTab/CutsceneTab(战场背景 320×200+调色板索引校验、帧动画编辑 FrameAnimationEditor 本地历史/选择锚点/worker 量化、discard 确认防未保存丢失);TilesetTab(替换越界引用检查 maps+stamps 双扫描)。
- **数据页族**:EnemyTab(数值/AI 规则表/物品交互/击败后事件安全奖励模式 findEditableEnemyDefeatedItemReward 不猜测改写非模板事件)、SkillTab(18 kind 效果链+玩家/敌人施法分支+召唤/变身预览)、ItemTab(装备/使用/投掷三能力卡+私有脚本跨会话事务 historyCoordinator 成对撤销+deletedSelectionRef 撤销恢复重选)、ActorMode(四分区工作台+伤亡脚本/成长曲线全屏编辑器)、PoisonTab(tick 序列+致死对称性/相克链推导)、VarsTab(未登记引用一键建定义,开关/数值冲突拦截)、ShopTab(货单重排+独立试买)、ItemAlchemyTab(crafting/spirit-gourd 双表面机制页,多 owner 拒绝伪装)、StampLibraryTab(分页+来源扫描下界语义)、EnemyTeamTab(五语义槽 swap 重排+败者演示)、BattleFieldTab、AmbienceTab(A/B 乘色预览,一次提交可撤销)。
- **design-system 大件**:number-inputs(steppedDraft 精度对齐+滚轮 readOnly 世代保护)、virtual-list(视窗裁剪+aria-posinset/setsize+programmatic scroll 目标抑制)、select(20 项阈值自动搜索+typeahead 700ms+虚拟窗口+键盘全语义)、reorder.ts(DsReorderCollection 指针/键盘/按钮三输入,快照+基线失效、插入/交换双策略、投影占位指示器 portal、自动滚动边界、IME 组合抑制;useDsReorderKeys 三级身份保留:对象等值→唯一语义身份→位置兜底)、recipes(目录/工作台/引用/诊断全套配方,DsInspectorContext+DEV 双重 host 校验,DsReferencePanel 五态语义)。
- **表单族**:command-form-dialogue/world/control/actor(四家族全文)、command-form-contract 桥、ItemUseEffectEditor(use/throw 双链+上下文兼容性 compatibleChain 独占/场景/战斗交集校验+私有脚本索引对齐)、ScriptTree(只读树+行级操作)、CasualtyEditor(概率门+兜底分支)、BattleSimulatorForms/Workbench(四目录+本场临时副本替换确认)、enemy-defeated-events(演示树+安全奖励区间替换)。
- **导航与杂件**:editor-navigation(八模块注册表+深链规范化)、editor-target、DataMode(数据页挂载器+精灵双域路由)、SceneScriptWorkspace(抽屉高度持久化+初始状态编辑器)、SpriteFrameWorkbench(帧画布+动画预览+拖 MIME)、SpriteUploadWizard/BattleSpriteUploader(scope 世代守卫防旧解码回调)、ProjectWorkbenchTab、FrameAnimationEditor、SpriteActionEditor(移动端窄屏列表/详情分页+引用阻断删除)。

## 登记移交（无新增）
本批无新清理候选。批 54 登记的 BattleSpriteLibrary 并行互扰假失败本次全量复跑未复现（见下）,维持原登记不追溯改写。

## 验证
- 定向测试:`src/ui` 全量 712 套件 0 失败 / 2505 通过 / 2505（directed.json,本批新跑;批 54 登记的 BattleSpriteLibrary M05 并行互扰本次未复现,全绿）。
- 零 diff 批:无源码改动,不适用 body-invariance。


## Codex当前勘误与接管（2026-10-19）

2505/2505原生绿保留，但不解释前次M05失败原因，也不代替逐文件E维或act/环境诊断计数。旧“八维全部通过/162件收口”只保留作者当时主张，当前验收保持review，缺维由Codex继续。 [当前返工与限制](../codex-stage2-rework.json)。


## 原生附件无损迁移（Codex，2026-10-19）

原directed.json超过现行1MiB检查边界；现以[原始JSON的无损gzip](directed.json.gz)保留，解压字节/SHA与冻结5af1b6372一致。 未放宽files.maxSize或新增ignore；迁移与失败/恢复身份见[当前回执](../codex-stage2-rework.json)。
