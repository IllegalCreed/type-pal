# DOC-CURSOR-6 — 第二阶段作者指南八组只读事实回执

状态：Cursor 只读取证；待 Codex 独立接收后自行窄修指南。未改五份正式指南、产品、测试或基线。
任务：[DOC-CURSOR-6](../ops/tasks/DOC-CURSOR-6-author-guide-fact-batch.md)。
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
