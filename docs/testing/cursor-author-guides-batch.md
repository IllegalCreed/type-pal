# DOC-CURSOR-6 — 第二阶段作者指南八组只读事实回执

状态：Cursor 只读取证；待 Codex 独立接收后自行窄修指南。未改五份正式指南、产品、测试或基线。
任务：[DOC-CURSOR-6](../ops/archive/tasks/done/DOC-CURSOR-6-author-guide-fact-batch.md)。
工作树起点 / 源码 SHA：`b95f218a9929328108a94b737c967e572b4cd860`（`origin/main`；卡面 freeze `4594f0a5` 之后、含本卡排队提交）。
未开 6010/6051、未访问用户工程、未跑提取/迁移/烘焙/E2E/覆盖率。无隔离浏览器，凡需肉眼确认像素的项标 `pending-ui`。
源码字符串或未挂到 `App.tsx` 的组件不能单独证明当前 UI。

## 去重（不重领）

| 已核事实 | 本回执处理 |
|---|---|
| DOC-CURSOR-1 H2/T1 旧 `?skill=` URL、H6 `runDetachedScriptChain` | D1 只核战斗构建器/帧步进；不把已修符号再计新发现 |
| DOC-CURSOR-1 N1 / DOC-CURSOR-2 CLI argv | D2 不重审多余 `--` |
| DOC-CURSOR-4 H7 入场三区 / 默认淡变 / 恢复默认 / prepare 安全表 | C1 不重写这些结论；场景抽屉页签名是另一句 |
| DOC-CURSOR-5 migrate README 烘焙错链 | 本 SHA 仍见该错链，记「另卡已修」，不计入本批 |

## 现行生产入口（八组共用）

1. 一级模块：`packages/editor/src/ui/editor-navigation.ts:74-245` `EDITOR_MODULES`（场景 / 地图 / 剧情 / 角色 / 物品 / 战斗 / …）。
2. 壳：`App.tsx:2681-2713` `ConnectedActorMode`；`:2713+` `ConnectedDataMode`（`tab` = 当前 `dataPage`）。
3. 数据页接线：`DataMode.tsx:569-585` → `BattleFieldTab`；`:608-629` → `CanonicalSharedScriptTab`。
4. 场景放置：`App.tsx:1578` 脚本抽屉仅 `module=scene`+`subpage=workspace`；`:2976-2978`「添加实体」；`:3240-3257` 放置时渲染 `PlacePalette`。

## A1 — 三种放置 / 共享身份

源：[`actor-presets.md`](../phase2/guides/actor-presets.md)。

| ID | 原句 | 分类 | 当前可达调用链与一手锚点 | 最窄替换或不改 |
|---|---|---|---|---|
| A1-1 | 「**预制人物**：先在“角色”模块建立人物，再在场景中放置。」（`:7-8`） | **confirmed** | 建人物：`EDITOR_MODULES` `actor`/`角色编辑` → `App.tsx:2681` → `ActorMode.tsx:416`「新建人物」。放置：场景编排 →「添加实体」(`App.tsx:2976`) → `PlacePalette`「预制人物」(`App.tsx:3795-3801`) → 点画布 `AddSceneEntityDefinitionCommand`+`AddEntityCommand`(`App.tsx:2134-2139`)，`createCanonicalPlacedEntity` 写 `actor`(`entity-placement.ts:87-108`)。 | 不改。入口是「角色 → 角色编辑」再建，「场景 → 场景编排 → 添加实体」，不是单独“预制模块”。 |
| A1-2 | 「**自定义实体**：直接选一个大世界精灵放置。」「**触发区**：没有视觉资源…」（`:9-11`） | **confirmed** | 同 `PlacePalette` 三段按钮（`App.tsx:3803-3817`）。`placeMode==='sprite'` 写 `sprite`；`touch-zone`/`interact-zone` 写 `zone`+页/行为（`entity-placement.ts:110-124`）。目录分组用 `entityShapeLabel`（`:127-129`）。检查器：actor 行 / 精灵下拉 / 「无外观」（`App.tsx:4265-4320`）。 | 不改。触发区另有「触碰 / 交互」与范围格（`App.tsx:3832-3870`），指南未写细节，不算错。 |
| A1-3 | 「人物定义共享：显示名称与稳定人物 id；默认大世界精灵；…场景实例独占：实体 id、位置、朝向、碰撞…」（`:18-29`） | **confirmed**（数据/检查器文案） / **pending-ui**（改默认精灵是否所有实例一起换） | 检查器 help：`App.tsx:4269`「共享人物身份与资源；位置、朝向、碰撞、显隐、页面脚本和敌对配置只属于当前场景实例。」`UpdateActorCommand` 改 `spriteId`（`commands.ts:1982-2005`），实例只存 `actor` 引用。未开编辑器看换形象。 | 数据句保留。不要写成已肉眼验过多场景同步换装。 |

本组无「类存在但页面挂不上」的放置入口。

## A2 — 解除关联 / 创建复制删除

| ID | 原句 | 分类 | 当前可达调用链与一手锚点 | 最窄替换或不改 |
|---|---|---|---|---|
| A2-1 | 「选中 actor 实例后，检查器提供“解除人物关联，保留当前精灵”。…单一可撤销操作」（`:36-41`） | **confirmed** | 选中预制人物实体 → `SceneEntityInspector` 按钮原文（`App.tsx:4283-4291`）→ `session.dispatch(new DetachActorEntityCommand)`。命令：解 `actor` 为人物当前 `spriteId`，其余字段原样（`commands.ts:1939-1978`）。撤销走 `EditSession`/`historyCoordinator`（`App.tsx:6,1699-1714`）。测试：`actor-commands.test.ts:270`。 | 不改。可撤销的是该条命令，不是另开一条“解除专用历史栈”。 |
| A2-2 | 「新建人物至少需要无首尾空格的稳定 id、显示名称和已存在的默认精灵。」「创建时名称 locale 与人物定义在同一个撤销事务」（`:48-49`） | **confirmed** | UI：`ActorMode.tsx:416,426-475` 草稿 id/名称/精灵。提交：`CompositeCommand('创建人物',[UpdateLocaleCommand, AddActorCommand])`（`:307-316`）。守卫：`assertActorCanBeAdded`（`commands.ts:1713-1727`）。复制：`CompositeCommand('复制人物',[locale, CopyActorCommand])`（`ActorMode.tsx:309-312`）；`CopyActorCommand` 深拷贝定义+`levelUp`，资产只留 id（`commands.ts:1820-1853`）。 | 不改。复制面板不再选手动精灵，沿用源 `spriteId`（`ActorMode.tsx:285-294,455-470`）。 |
| A2-3 | 「删除前会列出所有外部引用并阻止留下悬空 id。引用按钮可跳到…」「显式加载的运行态队伍/后备成员属于只读存档数据，也会阻止删除」（`:51-53`） | **confirmed**（命令/检查器） / **pending-ui**（各跳转是否都有「打开」） | 删除：`ActorDeleteButton`（`ActorMode.tsx:1088-1138`）→ `DeleteActorCommand`+`collectCurrentProjectDeletionImpact`（`commands.ts:1884-1903`）。引用页：`DsReferenceRow`「打开」（`ActorMode.tsx:1244-1272`）。运行态：`collectWorldActorReferences` 标「运行态/存档」且 `unavailableReason` 不可跳转（`actor-references.ts:214-218`）；`world-party-template`/`world-reserve-template` 来源 `runtimeWorldSource()`（`project-reference-adapters.ts:533-539`）。 | 删除门保留。运行态行应写「只读、阻断删除、不可打开」，不要承诺跳到存档槽。 |
| A2-4 | 「“把当前自定义实体保存为人物”尚未实现」（`:64`） | **confirmed** | 全仓无 `保存为人物` / `promoteEntity` 产品入口；仅本指南与归档 C1-1 卡提到。 | 不改。 |

撤销/重做归属：人物 CRUD 与解除关联都进编辑器主 `historyCoordinator`/`EditSession.dispatch`，不是脚本会话单栈。

## B1 — 战场创建复制删除与三层选择

源：[`battlefield-authoring.md`](../phase2/guides/battlefield-authoring.md)。

| ID | 原句 | 分类 | 当前可达调用链与一手锚点 | 最窄替换或不改 |
|---|---|---|---|---|
| B1-1 | 「空工程第一次创建会在同一个可撤销操作中登记 `manifest.content.battleFields = "content/battle-fields.json"`」「第一个建议编号是 `24`；已有列表建议 `max(id)+1`。」「复制会分配新编号并共享原背景 `AssetId`。」「系统默认战场 `#24` 或任何仍被内容引用的战场都不能删除」（`:22-27`） | **confirmed** | 模块：`EDITOR_MODULES` `battle`/`battlefield`「战场」→ `DataMode.tsx:569` → `BattleFieldTab`。创建：`AddBattleFieldCommand`+`appendBattleField` 首次写入 `BATTLE_FIELDS_PATH`（`commands.ts:2197-2262`）；UI 建议 id `nextBattleFieldId`（空表 24，否则 max+1）（`:2198-2202`，`BattleFieldTab.tsx:140,209-223`）。复制：`CopyBattleFieldCommand` 新 id、深拷贝字段含背景引用（`:2270-2290`，`BattleFieldTab.tsx:232-236`）。删除：`DeleteBattleFieldCommand` 读 live 引用（`:2310-2335`）；`#24` 恒有 `project-default` 边且 locator 不可编辑（`project-reference-adapters.ts:1758-1768`）；测试 `commands.test.ts:800-803`。空表保留 manifest 路径（`:797`）。 | 不改。右侧引用栏标签是「系统默认 / 场景默认 / 敌对实体 / 剧情开战」（`BattleFieldTab.tsx:514-527`），不是指南里的「入口、人物…」。 |
| B1-2 | 「一场战斗按下列优先级解析战场：`startBattle.fieldId` → `HostileBehavior.battleFieldId` → `SceneDef.battleFieldId` → 隐式 `#24`。」「场景、明雷怪和 `startBattle` 编辑器都使用同一战场选择器。」（`:31-38`） | **confirmed**（解析与共用选择器） | 运行时：`script-runner.ts:726-732` 传 `cmd.fieldId`；明雷 `main.ts:4397` 传 `h.battleFieldId`；落地 `battle-launch-preparation.ts:208` `options?.fieldId ?? scene.battleFieldId ?? 24`。UI 三处同一 `BattleFieldPicker`：场景默认（`App.tsx:4946-4956`）、敌对实体（`:4470-4478`）、`startBattle` 表单（`ScriptEditor.tsx:2501-2508`）。清除空值 = `undefined`，不把继承结果写回。 | 不改优先级句。 |
| B1-3 | 「选择器若遇到悬空 id 会显示“缺数据”，保存门会拒绝该工程。」（`:38`） | **wrong**（可见文案） / **confirmed**（保存门） | 选择器悬空项是 `战场 #N（缺失）`（`BattleFieldPicker.tsx:21-22`），全组件不用「缺数据」。`App.tsx:4457` 的「缺数据」是敌队缺失，不是战场。「保存门」：`assertProjectSaveValid` → `validateReferences`（`project-diagnostics.ts:822-906`）对场景/明雷/命令目标跑 `validate-refs.ts:978-984,1210-1221`。未开浏览器。 | 把「缺数据」改成「（缺失）」。保存拒绝句可留。 |
| B1-4 | 「当前 `#24` 是运行时合同…工程未提供 `#24` 时，编辑器会明确警告战斗将回落为黑底」（`:40`） | **confirmed** | `DEFAULT_BATTLE_FIELD_ID = 24`（`battle-field-reference.ts:8`）。缺省警告：`project-diagnostics.ts:581-588`；战场页按钮「缺少项目默认战场 #024」（`BattleFieldTab.tsx:289-292`）。 | 不改。PAL `6..57` 共 52 条见 B2，不是通用 UI 下限。 |

## B2 — 背景资产 / 验收示例

| ID | 原句 | 分类 | 当前可达调用链与一手锚点 | 最窄替换或不改 |
|---|---|---|---|---|
| B2-1 | 「背景选择复用图像资源工作台。」「战场只引用 `battle-background` 类型的 `AssetId`。」「不设置背景时运行时明确显示黑底。」（`:43-48`） | **confirmed**（选择器/类型） / **pending-ui**（工作台像素） | `BattleFieldTab.tsx:412-423` `ImageAssetPicker kind="battle-background"`；目录过滤 `imageAssets(catalog, kind)`（`ImageAssetPicker.tsx:14-18`）。预览：`FieldPreview` → `loadStandardPalette`+`loadBattleBg`（`BattleFieldTab.tsx:61-102`）；无背景文案「黑底战场」。导入尺寸 320×200（`image-import.ts:110-113`）。 | 不改类型句。预览消费者是战场页 canvas，不是另开「图像工作台」才能改引用。 |
| B2-2 | 「能看到」背景 / 验收里「背景资产仍在资源库」（隐含已物化字节） | **blocked-input** | catalog 已跟踪：`projects/pal/assets/index.json` 有 52 条 `battle-background.pal.00N`，path=`assets/migrated/battle-backgrounds/NNN.png`。`.gitignore:65` 忽略 `projects/pal/assets/migrated/`；本树 `006.png` **不存在**。未跑 `migrate:content --write`。 | 写清：入库的是 catalog id；看见像素要先有 gitignored migrated 字节。不要用 index.json 的 `bytes` 字段冒充工作区里有文件。 |
| B2-3 | 验收示例：建 `#24/#25`、三层选择、删 `#25` 从引用跳到明雷怪…（`:50-56`） | **pending-ui** / 未执行 | 命令与引用跳转源码具备（B1）。未在隔离浏览器走保存重开。PAL 现成表已是 `id 6..57` 共 52（`projects/pal/content/battle-fields.json`），不是空工程从 24 起。 | 保留为手工验收清单，不要写成当前 PAL 工程已按该顺序做过。 |

PAL 专用 `6..57`（`:14-18`）与跟踪 JSON 一致；编辑器未写死 `id>=6`（创建允许任意非负安全整数，`BattleFieldTab.tsx:210-213`）。

## C1 — 脚本库创建 / 统一工作台

源：[`shared-script-author-guide.md`](../phase2/guides/shared-script-author-guide.md)。不重领 DOC-CURSOR-4 入场三区/恢复默认。

| ID | 原句 | 分类 | 当前可达调用链与一手锚点 | 最窄替换或不改 |
|---|---|---|---|---|
| C1-1 | 「在编辑器“剧情 → 脚本库”点击 `＋`。填写显示名、说明和 `self` 契约。创建后稳定 `shared/user/...` id 不随显示名变化。」（`:30-31`） | **wrong**（创建表单字段） / **confirmed**（入口与 id） | 入口：`EDITOR_MODULES` `story`/`scripts`「脚本库」（`editor-navigation.ts:118-130`）→ `CanonicalSharedScriptTab`。创建按钮 label 是「新建可复用脚本」icon `add`（`SharedScriptTab.tsx:232-239`）；空态写「点击左侧加号」（`:322-326`）。对话框只有「脚本名称」+「稳定 ID」（`:435-503`）；`self` 固定 `'none'`（`:194-198`）。说明与 self 在创建后右侧「作者元数据」（`:330-379`）。id：`nextScriptId` → `shared/user/${slug}`（`:43-54`）；hint「创建后保持不变」（`:381-382`）。`AUTHORED_SCRIPT_PREFIX`（`script-library.ts:4`）。 | 改为：「剧情 → 脚本库 → 新建可复用脚本。创建时填名称和稳定 id（默认为 `shared/user/…`，self=不使用）；说明与 self 在创建后改。」不要写创建对话框已填说明/self。`＋` 是否可见标 pending-ui。 |
| C1-2 | 「“复制”会生成新的稳定 id 和独立正文，不是原脚本的别名。」（`:34`） | **wrong** | `SharedScriptTab` 目录 actions 只有新建，无复制。仓内无 `CopySharedScriptCommand`。`AddSharedScriptCommand` 只接受全新 id（`script-editor.ts:2135-2152`）。 | 删掉当前脚本库“复制”操作。不要建议新产品按钮。 |
| C1-3 | 「共享脚本、物品私有脚本、实体 Behavior、场景 Hook 使用同一个 canonical 指令树。」「下半区…在“场景 Hook / 实体行为”间切换。」（`:57-65`） | **confirmed**（共用编辑器） / **wrong**（抽屉页签名） | 共享正文：`CanonicalScriptBodyEditor`（`SharedScriptTab.tsx:309-312`）。物品私有：`ItemUseEffectEditor.tsx:172` 同一 body 编辑器。场景：`SceneScriptWorkspace` → hook/behavior inspector → `CanonicalScriptFlowEditor`（DOC-CURSOR-4 链，不重述三区）。抽屉页签实际是「进场脚本 / 传送出口」，选中实体时加「交互脚本 / 自动行为」（`SceneScriptWorkspace.tsx:202-212,298-311`），不是两个总称「场景 Hook / 实体行为」。上半 `PreviewCanvas` 有播放/暂停/继续/单步/重置/引擎试玩（`PreviewCanvas.tsx:452-485`）。 | 共用编辑器句保留。抽屉句改成四个实页签名。入场准备页签事实见 DOC-CURSOR-4，不在此另开。 |
| C1-4 | 「没有作者可编辑的脚本索引、分片或 chunk 归属。」「contentVersion 20 作者界面不显示“迁移内部实现”页签」（`:52-53,92`） | **confirmed** | `EDITOR_MODULES` 无迁移/分片页。canonical `callScript` 只存 `script` id（`author-script-core.ts:239,728-730`）。`CONTENT_VERSION=20`（`character.ts:168`）。 | 不改。旧 `CommandForm` 仍有 `cmd.ref.chunk` 分支（`CommandForm.tsx:2006-2032`），生产共享库不走该表单，不当当前 UI。 |

## C2 — self / 跳转 / 物品私有 / 删除

| ID | 原句 | 分类 | 当前可达调用链与一手锚点 | 最窄替换或不改 |
|---|---|---|---|---|
| C2-1 | 「`不使用` / `可选` / `必须提供`」及继承规则（`:72-74`） | **confirmed**（元数据+运行时） / **pending**（保存是否 fail-loud 缺 self） | 检查器三选项原文（`SharedScriptTab.tsx:364-377`）。运行时：`script-runner-core.ts:437-446` `none` 禁显式 self、`required` 且无继承则抛。保存：`checkBaseScriptLibrary` 只验枚举（`author-script-core.ts:1116-1131`）；`collectScriptReferenceIssuesFromVisits` 只查目标是否在库（`script-editor.ts:611-626`），不查调用点缺 self。 | 契约定义与运行时句可留。保存句不要写“缺 self 必挡保存”，除非另证。 |
| C2-2 | 「插入“调用可复用脚本”…当前作者命令没有 `jumpScript`。」「“打开脚本”会进入目标…“扫描调用位置”会列出直接调用方。」（`:81-91`） | **confirmed**（call/jump/打开） / **wrong**（扫描按钮名） | 插入：`insertionGroups`「↪ 调用共享脚本」（`ScriptEditor.tsx:2992-2997`）。`jumpScript: false` 且列入 `RETIRED_CONTROL_KINDS`（`author-script-core.ts:259,525-526`）；`ScriptEditor.tsx` 无 jump 菜单项。打开：canonical 按钮「打开共享脚本」（`ScriptEditor.tsx:1822-1828`）；物品 `runScript` 为「打开脚本」（`ItemUseEffectEditor.tsx:639`）。调用方列表是右侧 `DsReferencePanel` 自动引用，无「扫描调用位置」按钮（`SharedScriptTab.tsx:384-427`）。 | 写成「打开共享脚本」+「右侧引用列表」。删“扫描调用位置”这个独立动作。 |
| C2-3 | 「物品私有脚本…在用途效果卡内展开正文；不进入共享脚本库；复制物品时随物品正文深拷贝」（`:95-104`） | **confirmed** | 入口：物品工作台「添加当前物品脚本」（`ItemUseEffectEditor.tsx:1199`，`ItemTab.tsx:1147-1183` `AddItemPrivateScriptCommand`+shell `runScript` 成对 `historyCoordinator.dispatch`）。正文 `CanonicalScriptBodyEditor`。每件至多一条（`ItemTab.tsx:1172-1176`）。不进 `sharedScripts`。 | 界面用「当前物品脚本」，不是指南标题「物品私有脚本」。 |
| C2-4 | 「有任何直接调用方的共享脚本不能删除。」「共享脚本之间禁止形成 `callScript` 环。」「`self: required` 缺调用实体…保存和发布均 fail-loud。」（`:119-123`） | **confirmed**（删除门） / **wrong**（当前保存查环） | 删除：`DeleteSharedScriptCommand` 有 blocker 即抛（`script-editor.ts:2241-2259`）；按钮在引用未就绪或有引用时禁用（`SharedScriptTab.tsx:287-301`）。调用环：旧 `buildScriptReferenceIndex` 对 `scriptChunks`/`scriptIndex` 走 `callEdges`（`script-references.ts:110-333`），**保存门不再调用** `assertScriptProjectValid`（全仓仅定义处）。现行 `assertProjectSaveValid` 用 canonical 引用缺失检查，无 call 图 DFS。 | 删除保护保留。环与“保存 fail-loud”改为：「当前保存不跑作者 `callScript` 环检查；旧 chunk 扫描器已离线。」 |

## D1 — 调试工具战斗构建器 / 帧步进

源：[`debug-tools.md`](../phase2/guides/debug-tools.md)。旧 `?skill` / `runDetached` 符号已由 DOC-CURSOR-1/指南修订处理，不重计。未启动用户 6051。

| ID | 原句 | 分类 | 当前可达调用链与一手锚点 | 最窄替换或不改 |
|---|---|---|---|---|
| D1-1 | 「reforge dev 页: `http://localhost:6051/?debug`」「编辑器「引擎试玩」: `play.html?project=pal&debug`（同源试玩页参数原样生效）」（`:13-15`） | **confirmed**（dev `?debug` 安装） / **wrong**（试玩按钮不带 debug） | DEV 动态装：`main.ts:6068-6081` `import.meta.env.DEV && params.has('debug')` → `installDebugTools`。端口：`reforge/package.json:22` `dev:pal` `--port 6051`。编辑器「引擎试玩」：`PreviewCanvas.tsx:431-440` 与 `App.tsx:1822-1833` 只拼 `playProjectQuery`+`scene`/`pos`，**不加 `debug`**（`play-url.ts:14-25`）。面板 Esc 隐藏、反引号再显示（`debug-tools.ts:411-419`）；宽 `min(420px,…)`，`480px` 媒体查询（`:191,334`）。五 tab 文案「状态 / 指令 / 触发 / 战斗 / 图层」（`:168-174`）。 | 试玩句改为：「引擎试玩打开同源 `play.html?project=…`（及 workspace）；要面板须自行在试玩 URL 加 `?debug`，按钮不会代加。」6051 未在本机点开，入口存在标 pending-ui。 |
| D1-2 | 战斗态构建器：战场任选、敌队或 enemies 多选、我方多选、等级/HP/MP/装备/异常/毒、道具预设；开战 `startBattle`+`enemyOverride`/`partyPreset`；`withWorldPreset` 战后恢复（`:59-64`） | **confirmed**（源码表单） / **pending-ui** | `debug-tools.ts:881-1107` 组参；开战 `ctx.startBattleDev`（`:1049-1061`）。回滚：`main.ts:2968` `withWorldPreset`（`dev-preset.ts:16-36` 深克隆/finally 恢复）。未跑战斗。 | 不改能力句。不要写成已在 6051 亲眼开过。 |
| D1-3 | 「帧步进…单位 = 一个 gameplay tick（100ms）」「作用域 v1 = 大世界 gameplay…任意战斗启动自动退出步进」（`:68-71`） | **confirmed**（源码） / **pending-ui** | UI 在「图层」页，不是第六 tab（`debug-tools.ts:1118-1164`）。时钟：`GameplayClock.advance(..., stepMs)`（`gameplay-clock.ts:19-29`）。开战退步进：`BattleHost` `exitFrameStep: () => frames.resetStep()`（`main.ts:1173`）。 | 可补一句「控件在图层 tab」。作用域句保留。 |

`?skill=` 启动拒绝与面板 `skill` 命令已在 DOC-CURSOR-1 H2/T1 核过；本批不记新发现。

## D2 — PAL 导入发布入口

源：[`content-publication.md`](../phase2/guides/content-publication.md)。不重领 N1 argv，不把 DOC-CURSOR-5 的 migrate README 错链算本卡。

| ID | 原句 | 分类 | 当前可达调用链与一手锚点 | 最窄替换或不改 |
|---|---|---|---|---|
| D2-1 | 「检查发布计划：`pnpm --filter @type-pal/migrate migrate:content`。」「发布：`… migrate:content --write`」（`:9-11`） | **confirmed** | `packages/migrate/package.json:16` → `scripts/migrate-content.mts`。argv 只认 `--write`/`--help`（`migrate-content.mts:37-51`）；无 `--write` 打印 `dry-run 完成`（`:103-104`）。未执行。 | 不改短写。与 DOC-CURSOR-1 已核短写一致。 |
| D2-2 | 「提取原始数据：pal-extract README。」「早期资产烘焙方案保留在历史资产管线 archive/designs/asset-pipeline.md」（`:8,15`） | **confirmed** | `packages/pal-extract/README.md` 存在且写 `data/raw`→`data/extracted`。`docs/phase2/archive/designs/asset-pipeline.md` 存在。本指南不把 bake 写成 PAL 发布步骤。 | 不改。 |
| D2-3 | 「产品格式和操作细节以迁移包说明为唯一维护入口。」（`:4`） | **confirmed**（指针） / 错链另卡 | 指针本身成立。本 SHA 的 `packages/migrate/README.md:61` 仍把「资产烘焙」链到本指南（DOC-CURSOR-2 W2-C07-1 / DOC-CURSOR-5 已排队）。 | 本卡不改 migrate README。 |

本组指南正文相对现行 CLI **已核无确定错误**。

## 分类小计

| 分类 | ID |
|---|---|
| confirmed | A1-1、A1-2、A2-1、A2-2、A2-4、B1-1、B1-2、B1-4、B2-1（类型）、C1-4、C2-3、D2-1、D2-2、D2-3 指针 |
| wrong | B1-3 文案「缺数据」；C1-1 创建表单；C1-2 复制；C1-3 抽屉总称；C2-2「扫描调用位置」；C2-4 保存查环；D1-1 试玩自动 `?debug` |
| pending / pending-ui | A1-3 换装同步；A2-3 跳转像素；B1-3 选择器观感；B2-1/B2-3 工作台与验收步骤；C1-1 加号字形；C2-1 保存缺 self；D1 面板/战斗/步进肉眼 |
| blocked-input | B2-2 PAL `assets/migrated/**` 战场背景字节 |
| historical / 另卡 | D1 `?skill`；D2-3 migrate README 烘焙链（DOC-CURSOR-5） |

未猜产品应长成什么样。未建议恢复复制脚本按钮或给试玩按钮强加 `?debug`。

## 交付验证

- 相对 `b95f218a`：本回执 + `docs/testing/README.md` 一条索引（`check.mjs` 目录清单要求；未改五份指南）。
- 分支：`codex/cursor-author-guides-audit-r1`（`/Users/zhangxu/illegal/type-pal-cursor-author-guides`）。
- 每两组一提交后统一推送；文档检查与 `git diff --check` 见各提交。
