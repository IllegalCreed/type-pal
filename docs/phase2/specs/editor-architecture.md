# 编辑器架构与工作台合同

Status: current
Validity: current
Owner: Codex（设计职责与文档维护；不代签历史执行）
Last reviewed: 2026-11-04
Template: design-spec-v1 / 1.0.0

## 问题与目标

编辑器同时承载场景、地图、脚本、资源和项目设置，必须让每个字段只有一个作者、每个业务页只有一个权威入口。模式处理画布手势，模块组织业务导航，两者职责分开；不能把旧 DataMode 再变成可见的“数据”总容器。当前适用内容为 contentVersion 22 / SAVE12，格式轴以[内容合同](content-schema.md)与[存档合同](save-system.md)为准。

本页维护这些已存在的设计约束。旧R33封套把原稿开头的“现行规范”整体改成historical，本次纠正适用性；不因此恢复其已撤回的深审声明，也不证明所有工作台已实现或验收通过。

## 真值与约束

- 第二阶段按[READ-FIRST](../READ-FIRST.md)采用干净架构与当前canonical；原始设计及其历次补充在下方固定quote保全。[历史编辑器设计](../archive/designs/editor-design.md)解释来历，不作为新实现入口。
- [editor-navigation.ts](../../../packages/editor/src/ui/editor-navigation.ts)集中维护九个一级模块、子页、默认页和位置编码。`EditorLocation`区分module/subpage/objectId；精灵库另有domain/view，资源动作或角色工作区可有actionId。显示名、数组位置和文件path均不替代对象身份。
- 对象作者态与持久修改归领域会话/Command；视口、活动层、地图选区和面板偏好不混入内容或存档。SAVE12的sceneRuntime是游戏现场，不回写作者工程，不自行新增作者状态方案或预览能力。
- typed引用由content语义、editor定位与删除策略、统一builder、公共Reference UI分层承担。[同步collector](../../../packages/editor/src/core/project-reference-adapters.ts)构造current-author索引；[ProjectReferenceIndex](../../../packages/editor/src/core/project-reference.ts)按target与删除scope计算blocker/warning。`where`是可读说明，不是解析身份的协议。

## 方案

### 模块、深链与字段维护权

| 模块id | 唯一职责与入口 |
|---|---|
| scene / map | 场景编排与氛围；地图编辑、瓦片集和组合库 |
| story / actor | 脚本库、变量、指令手册；角色编辑 |
| item / battle / simulator | 物品与商店等作者数据；技能、敌人及战斗定义；独立试打预设 |
| asset | 精灵、图像、音乐、音效、过场素材及其二进制生命周期 |
| project | 概览、全局资源与启动、入口与开局、问题四页 |

URL使用`module/page/object`，统一decoder归一化非法模块/子页到安全默认页；合法object是否存在由对象消费者给出空态，不能由URL解析器证明。对象仅在同一子页间保留，不能把音乐AssetId带到过场素材页；精灵域/视图及角色子视图按注册的条件保留。浏览器历史由统一导航会话维护，页面不并行保存第二套路由。

项目页维护manifest的name/defaultEntryId/entryPoints/assets.roles；资源页维护catalog与二进制，场景/脚本维护演出编排。入口的startWorld完整自含，没有从默认入口继承或隐式跟随。默认入口仅选择一个真实入口，不增加伪入口；概览只汇总并引导到字段的唯一作者，不另建编辑表单。

### 地图、资源与可撤销编辑

地图按稳定mapId组织、正文懒加载；脏文档及撤销栈引用文档保留，未加载文件保存/clone/ZIP按原始字节copy-through。场景绑定MapId而非复制地图。已有选区、待盖模板、素材选择、活动层四轴独立；图层/source/tile/height/collision修改先完整校验，一动作一Command，no-op不置脏、不入history、不清redo。

地图和组合共用IsometricEditorCanvas与工具栏，组合以草稿保存形成一笔命令；相对H与地图绝对H在ghost与提交时用同一解析。作者有序集合复用公共grip、键盘与精确移动，重复值用occurrence token，不能因底层是数组就新增排序能力。

音乐替换保持AssetId，试听共用单一owner；过场帧序列按draft-history组织完整RGBA编辑与惰性来源；战斗精灵定义与二进制资源是两条生命周期。替换/删除需复核消费者、字节/SHA、定义与profile边界，不能用过期索引或partial地图facts授权破坏动作。原文各专项保留完整领域细节和任务入口。

### 工作台布局与诊断

顶栏负责工程、撤销/重做和保存；模块导航、对象目录、画布、Inspector、底栏分工不重叠。尺寸、组件和交互形态归[设计系统与交互规范](editor-design-system.md)，本页维护领域合同及[开工验收流程](#编辑器ui开工与验收)，不另建尺寸或图标标准。底栏/问题页消费同revision的统一diagnostics；partial/failed不能显示成“零引用”，也不能另建页面扫描器绕过统一索引。

共享控件浮层按DS-P.6使用popover语义层，位于应用顶栏之上、drawer/modal之下；原生modal内继续portal到所属dialog的top layer。遮挡应修公共层级关系，不借toast层或业务私有z-index补丁，也不改变原本有效的viewport避碰和内部列表限高。

公共DsTabs允许调用方为单项提供可选`remove`动作（可访问名称、回调和可选禁用状态）；移除按钮与Tab按钮为兄弟节点，不嵌套，不触发选择；视觉上同属于一个Tab容器，活动背景和下划线覆盖组合，删除采用公共danger红色。调用方负责数据删除与活动项；移除后焦点回到存活活动Tab，无剩余项时由调用方定位添加入口。未传移除动作的调用方保持原DOM、外观与方向键/Home/End合同。初态属性用公共InspectorSection分开属性与配置操作，不加私有滚动壳；实体名称优先别名、关联人物名，无名称时显示“未命名对象 · 实体ID”，坐标保留在次级摘要。

### 编辑器UI开工与验收

开发或调整编辑器UI前，必须先读[设计系统与交互规范](editor-design-system.md)的DS-0及命中条款，再读本页相关领域合同，核受影响共享recipe、尺寸token及已验收同类页面的实际caller。明确字段、动作、滚动及状态的Owner，并检查同一区域的相邻控件，不能只替换被点名的单个组件。

按DS-F.4、DS-F.5、DS-C.2与DS-C.2a确定整行尺寸和动作表达：同一字段与尾部动作统一density，不得保留默认输入却单独将按钮compact。初态名称编辑行使用default共享字段与default DsActionGroup，不用业务私有height补丁；复制和删除为同组公共图标按钮，保留具体可访问名称、tooltip及disabled原因，复制使用有边框的secondary，删除使用danger。窄宽时由父布局移动完整动作组，不拆散或裁切按钮。

实页验收检查受影响整行的高度、对齐、间距、溢出及窄宽表现，并核操作与禁用原因；不能仅截取单个组件，也不能以静态门或jsdom全绿替代可见布局验收。现行源码、实际执行原件与用户反馈分别记其证据范围。

### 脚本步骤与预览初态

工程初态库属于编辑器辅助资料；每份具名初态是独立、可复用的人物与物件布置，可包含多个场景的位置、朝向、显隐、碰撞与画序覆盖。绑定地址包含来源场景、角色（场景hook无角色）、通道、脚本方案和步骤；包含某场景不代表引用来自该场景。一次激活只执行所选步骤，next用于下次激活，因此预览入口采用步骤粒度；这不能证明任何步骤的确切前态。方案默认与步骤覆盖只是预览便利选择，同一步骤在不同E2E context可使用不同现场，正确性必须以真实入口采集核对。

侧车 `editor/script-preview.json` 只消费当前version 3：`states`项为`{id,name,scenes:[{sceneId,entities}]}`，场景ID在同一状态内唯一，实体ID只在对应场景切片内唯一。`schemeDefaults`按完整脚本方案地址引用默认状态，`bindings`按完整步骤入口保存覆盖。无步骤记录时继承方案默认，无方案默认时沿用场景；步骤`stateId: null`明确沿用场景并阻断继承，字符串指定一份状态。失效状态身份明确报错，不回落到上层；状态缺少入口场景切片合法，该场景沿用作者摆放，其他切片和状态身份保持。v2资料一次性将原`sceneId/entities`包入单项`scenes`，保留状态ID、名称、覆盖值及全部方案/步骤引用，不猜默认归属、不保留双读。

场景菜单的“初态编排”是独立工作区，替代原场景/NPC的初始状态Tab。左侧按涉及场景分组并按名称搜索，同一跨场景状态可在多个组找到，各行指向同一ID；总数去重，空状态列入“未添加场景”。从某场景组进入就选对应场景Tab。中间上方为画布，下方为场景Tab、添加场景及当前场景参与者，二者高度可调且各区独立滚动；切场景同步画布与右侧初始属性。角色与物件按DS-L.7使用随容器宽度自动增减列的卡片网格，单列最小280px，窄于280px时适配容器；少量卡片保留列轨不拉满整行，同排等高，长名称自然换行，顺序和键盘选择不变。本区添加场景动作与角色/物件选择均使用default常规尺寸，不单独启用compact；添加场景复用DsAddPickerDialog并显式选择default触发按钮尺寸，按完整场景名称或ID搜索，确认才给同一状态增加切片；取消、候选选择与外部revision变化不提交。每个场景Tab内的移除动作在选中、悬浮或键盘focus-within时显示，闲置非选中时隐藏但保留占位与键盘可达性；显露时仍保留disabled语义。移除动作只删除该切片，一次撤销恢复；删除非活动Tab保留当前场景与实体，最后一片可删成空状态。选择、属性草稿、拖拽、移除和恢复默认都按场景与实体定位，不写正式作者场景。画布复用SceneCanvas资产加载与失败展示，场景切换使旧画面及异步结果失效。

新建、复制、命名与删除统一在初态编排中进行。顶部名称与复制/删除操作遵守上面的[UI开工与验收合同](#编辑器ui开工与验收)。新建为空状态，复制所有场景切片，均不自动修改任何引用。选择另一份状态也不改变引用。右侧DsInspectorTabs固定为“属性 / 引用 N”；引用数量与内容始终属于整份初态，独立于当前场景或选中实体。引用Tab复用DsReferencePanel、DsReferenceList、DsReferenceRow，按当前工程自动推导反向索引，区分方案默认、直接步骤及实际继承步骤；显式null和其他状态覆盖抑制继承。每行分开显示脚本名称、场景/角色或场景事件/通道来源路径与引用类型，稳定key由类型和完整方案/步骤地址组成，可打开准确详情。方案默认即便暂时被全部步骤覆盖仍保护状态删除；失效引用保留计数和删除保护，用静态行说明不可定位原因并展示完整稳定来源地址，便于区分与修复，不渲染disabled button。初态编排中的切片删除保留全部脚本引用。从工程删除场景Owner时移除其切片，并清理该场景Owner下全部来源引用（包括原已失效的子地址）；从工程删除实体Owner时同样只清理该实体Owner的引用，保留其它Owner的既有孤儿记录，其他场景、状态ID与有效引用不变，空状态可保留；配对删除与撤销同一历史事务完成。

“此步骤的预览初始状态”位于步骤详情，选择立即生效，区分继承、显式场景默认与指定状态。“此方案的默认预览初始状态”位于方案详情，与方案名称、运行时默认选择一起形成草稿；保存才提交，取消、关闭和Esc均不修改引用。同时改变正式脚本与预览引用时，沿用配对历史事务，一次撤销同时恢复。详情按被打开的完整目标读取和写入，即使该方案或步骤当前未选中也不串用活动入口。场景默认表示沿用场景摆放，不表示已核对真实剧情前态。

详情只选择引用并提供跳转初态编排入口；跳转关闭弹窗、定位所选状态，存在来源场景/已参与实体时优先定位，并分别保留原活动入口与被打开的详情目标。方案整份未提交草稿一并暂存。显式返回恢复原NPC、通道、方案、步骤及对应详情，继续保存或取消；编排中的选择不覆盖引用草稿。主动切换作者对象/场景、删除返回入口使返回目标失效；重开请求一次性消费，切回或重挂不复活已关闭详情。撤销移除选中的新状态时明确显示身份失效，不回落到别人的状态。通用FlowEditor仅接收可选详情展示回调，领域引用与命令由Workspace承担；item/shared等其他caller没有预览初态UI。

脚本预览开始时按整份初态一次投影相关作者场景，给本次预览独立定义，不修改工程。当前Playback的loadScene仍停止并标示预览到此为止；多场景静态编辑不表示连续跨场景脚本播放已完成，后者需要单独的活动场景、资源就绪与分场景运行状态宿主。状态集合也不保证多脚本完整编排或世界变量一致，不包含完整游戏现场、自动行为续跑或前台调用栈。实现与有限验证边界见[初态任务卡](../../tasks/cards/ED-ENTITY-STATE-PLAN-1.md)；E2E采集及逐步骤保存/重开/播放验证按[E2E合同](../../testing/e2e/contract.md)另行记录。脚本进度工具与编辑器共用v3严格解析器，完整状态任一场景变化都会使已有指纹需复核，迁移不自动提升旧事件信用。

## 边界与风险

当前核读仅覆盖下方原稿全文、导航注册与decoder切片、同步引用collector入口及索引删除策略、版本常量。地图缓存、各资源命令、保存/ZIP、Worker覆盖、实际焦点/滚动/浏览器历史没有在本轮逐实现审计或实跑；上面的职责是规范要求，不是本轮已验证的实现清单。

quote中音乐工作台的“v2升级v3”、W7G“另开三签”和旧UI验收数字保留当时语境；当前开发期兼容与协作规则分别由READ-FIRST及AGENTS决定，不恢复旧upgrader或固定三签。发现新格式、删除安全或用户可见形态取舍，停受影响项交Owner/用户，不以文档改写替代产品授权。

## 验收

文档oracle是九模块/统一位置、字段唯一作者、作者态与游戏现场分轴、current-author删除证据和非持久UI态可明确追溯。结构、实链、quote逆回、source/after及catalog/review依赖须一致；作者自验不等于非作者接收。

实现验收另按原领域任务运行：过期引用不得授权删除；取消/no-op零命令；一次修改可一次undo/redo；保存重开保留字节/引用。原文的86首音乐、27%/103%浏览器和历史done只属于当时记录，本轮未复跑，不授runtime/E2E/视觉/coverage信用。

## 历史范围

固定来源为0d5311075b4f5e67362d1953a138d678c0a4aa42的完整原稿，含2026-07至10月补充。R33旧封套及其撤信保留于Git和唯一review历史，不作为当前职责判断依据。

## 原始结论

原稿以模式插件外壳与九模块分层组织工作台；后续补入地图选择/共享编辑面、音乐与过场/战斗精灵生命周期、manifest入口、公共排序、ED-3引用和场景/商店安全删除。其规范约束与当时各专项完成声明分轴使用，不能把任一done推成整个编辑器已验收。

## 当时证据

原始任务、源码路径、日期和浏览器数字仍在quote；本轮的源切片、逆回规则、before→after与未跑域记录在现有R33本篇行。catalog旧reviewed为旧库存登记，不充当新的非作者接受。

## 当前有效性

现行设计合同，适用contentVersion 22 / SAVE12；本轮正文重写与有限静态核对待非作者接收，partial/needs不自动晋升。现行约束可用于审查，但不能证明各领域实现、旧测试或UI已经符合。

## 继任文档

版本归[内容合同](content-schema.md)/[存档合同](save-system.md)，脚本归[脚本系统](script-system.md)，工程I/O归[工程生命周期](project-lifecycle.md)，视觉组件归[设计系统](editor-design-system.md)。新的字段或行为变更须在相应唯一事实源和任务闭环；本页只同步受影响的职责边界。

## 原文保全

固定原源`0d5311075b4f5e67362d1953a138d678c0a4aa42`，Git blob `06a7672fc8c17d0b30dee9aa136b02b8fa8890e5`，SHA-256 `e17805c77f9b2425ae2178886f4411a733d37c0749624ac896146a124643d91a`，26639B。marker至EOF与S40基点逐字节相同；剥每行引用前缀后，精确排除end marker前恰一个未引用分隔LF再等原源，不trim、不替换字符。

<!-- original-source-quote:start -->
> # 编辑器架构与工作台合同
>
> 类型：现行规范（current）。当前产品为 contentVersion 22 / SAVE12；格式与实现以源码常量和校验器为准。
> 本页维护已确认合同，已知实现缺陷继续由 [代码审计](../../ops/audits/pre-e2e/summary.md) 跟踪。
> 原设计、旧版本与当时审查完整保留在 [历史快照](../archive/designs/editor-design.md)，不作为当前执行入口。
>
> SAVE12的`sceneRuntime`仅是游戏存档与离场现场：保存NPC姿势、动作时间轴和自动续跑进度，
> 不回写作者工程，也不在编辑器新增状态方案、剧情阶段或第二套脚本模型。作者Page/Behavior/Hook与场景预览
> 仍沿用现有合同；这次现场恢复不宣称提供“选择状态方案预览”的新能力。版本与恢复边界见[当前存档合同](save-system.md)。
>
> ## 模式即插件的外壳(第三根)
>
> ```ts
> interface EditorMode {
>   id: string; label: string; icon?: ...
>   onCanvasPointer(ev, ctx): void      // 画布手势 → dispatch command(仅当前模式生效 → 无歧义)
>   renderOverlay(ctx, view): void       // 模式专属画布叠加(选中框/手柄/网格)
>   Panel: React.FC                      // 侧面板(该模式的 Inspector/工具)
>   Toolbar?: React.FC
> }
> ```
>
> - **外壳**管:画布视口(平移/缩放 + 复用渲染器画底图)、当前模式、选中态、command 派发、模式切换 UI、校验面板、保存。
> - **模式**只贡献:画布手势含义 + 叠加层 + 侧面板。加模式 = 往注册表加一个,**不动壳**。
> - 这正面回答用户的顾虑:要「工具列表」= 模式切换;拖动只在「布置模式」里生效,切到别的模式含义就变,彼此不打架。
>
> ### 一级模块与稳定深链(ED-2,2026-07-14)
>
> “模式”只描述画布内工具行为,不再承担整个产品的信息架构。编辑器顶层固定为九个业务模块:
>
> | 模块 | 稳定 id | 当前权威子页 |
> |---|---|---|
> | 场景 | `scene` | 场景编排、氛围 |
> | 地图 | `map` | 地图编辑、瓦片集、组合库 |
> | 剧情 | `story` | 脚本库、变量、指令手册 |
> | 角色 | `actor` | 角色编辑 |
> | 物品 | `item` | 物品、炼蛊皿、紫金葫芦、商店 |
> | 战斗 | `battle` | 技能、敌人、敌队、毒、战场 |
> | 战斗模拟器 | `simulator` | 试打方案、我方预设、敌方预设、背包预设 |
> | 资源 | `asset` | 精灵库、图像、音乐、音效、过场素材 |
> | 项目设置 | `project` | 概览、全局资源与启动、入口与开局、问题 |
>
> - 唯一注册表位于 `packages/editor/src/ui/editor-navigation.ts`;一级导航、二级导航、URL 解析和覆盖测试均由它派生。旧 `DataMode` 仅保留为内部页面适配器,不再是可见一级模块。
> - 统一位置类型为 `EditorLocation { module, subpage, objectId? }`,URL 形式为 `?module=<id>&page=<id>&object=<encoded-id>`。业务入口只能通过统一导航函数跳转,不得自行维护第二套路由状态。
> - 普通跳转写入浏览器历史,初始化和归一化使用 replace,`popstate` 经同一 decoder 恢复。非法 module/subpage 回安全默认页;合法页面中的失效 `objectId` 显示明确空态,不得偷选数组第 0 项。
> - 每个模块记忆最后子页、对象和合理的滚动位置;导航展开/折叠与现有分栏尺寸属于本地 UI 偏好。内容数据和选中对象的业务真值仍归 `EditSession`,不写入 localStorage。
> - 每个业务页面只能在一个模块中登记一次,每模块可见子页不超过 5 个。引用处只深链到权威页,不得复制表单形成双真值。
>
> ### 单一新版地图库与场景绑定（W7F，2026-07-14）
>
> - `EditorState.mapIndex` 保存完整 `MapIndexV1`，`state.maps` 以稳定 map id 为键；文件 path 只在
>   序列化和磁盘回退时由 index 解析。
> - 地图模块不再依赖“当前场景地图”才能工作：左栏列出全部地图，支持搜索、新建、深复制、改显示名、
>   删除和按使用场景跳转；零引用地图也能编辑并保存重开。
> - 场景检查器通过 `SceneDef.mapId` 选择已有地图，并提供创建并绑定、复制并绑定和打开地图。不存在
>   “原版复用图”或只读分支；迁移图与作者图是同一种可编辑文档。多场景可共享一图。
> - 创建、复制、改名、绑定、删除均走不可变 Command；删除命令同时维护 index、内存地图和文件 diff，
>   被场景引用时先列出引用并阻止。ED-3 已由 current-author `ProjectReferenceIndex` 接管该判断，包含
>   `scene.mapId` 与 canonical `setSceneMapOverride`；原 `mapAssetSceneReferences` 窄反查已删除。
> - 编辑器启动只加载 map index；选择地图时异步 hydrate 正文。干净文档受 LRU 管理，脏文档和仍被
>   undo/redo 栈引用的文档固定驻留；hydrate 不进入撤销历史。
> - 保存、clone 与 ZIP 对未加载地图按原始字节 copy-through，不为输出而全量解析；修改过的地图使用
>   content 公共包的确定性格式化器。运行时同样只按当前 `mapId` 懒加载。
> - 图层列表与图层尺共享一个 currentLayerId；高度尺的值既是聚焦条件，也是下一笔的实例高度。图层作者顺序由
>   公共排序手柄、键盘与精确移动按钮共同维护；领域 adapter 保留顶部优先的显示语义，锁定层不可移动，一次落位
>   只产生一条地图 command 或一条组合 draft-history 更新。
>   当前层/高度正常显示，其余瓦片变暗；吸管同时读取 tileId 与实例高度，聚焦状态不写入内容文件。
>
> ### 地图内容选择、Inspector 与可逆变换（W8，2026-07-18）
>
> - 地图工作区的四条状态轴必须正交：瓦片面板素材、待盖图章模板、地图已有内容选区、活动图层不可复用同一状态。`MapSelection` 以稳定 `VisualSlotRef {layerId,row,col}` 和去重 `GridPointRef {row,col}` 分别表示视觉槽/独立碰撞格，按 mapId 存于临时 `MapWorkspaceState`，不进 `EditorState`、JSON、URL 或 undo 栈。
> - 专用 select 工具支持 replace/Shift-add/Ctrl-or-Cmd-toggle/Esc/`Ctrl|Cmd+A`。`Ctrl|Cmd`
>   命中的内容尚未全部入选时整批追加，已全部入选时整批移除；因此既能逐次组出不规则集合，又不会在框选部分重叠时意外反选旧成员。默认只命中活动层，“跨层选择”是显式 scope 开关且不改已有选区。全选只收集活动层非空视觉槽和非零碰撞格，不枚举无内容空格。
> - 单击命中与渲染共用 `projectMapTileBlitRect` 和 `RleFrame.opaque`：活动层内高大 tile 的不透明像素源格优先于光标逻辑格；跨层像素只进 Alt 候选。候选固定按面板层自上而下，同层按 row/col；键盘可导航，Esc 返回 canvas。选区叠加同时画源格菱形与实际图像边界。
> - 隐藏层不可见/不可命中/不可写，锁定层可见但普通命中和所有写入均禁止；聚焦/淡化和碰撞叠加显隐仅影响显示，不影响 hit policy 或“变换含碰撞”开关。活动层隐藏/锁定时不偷换层，而是显式进入只读并给出原因。
> - Inspector 把 tileset 来源、tileId、实例 height 和 collision 分通道呈现/写入，多值显示“混合”。所有非空
>   图层实例均可编辑高度；null 格没有来源且高度必须为 0。字段旁与全局底栏都有精确反馈，但只由底栏承担
>   live region，避免辅助技术重复播报。
> - 所有 Inspector/变换持久修改都走 channel-aware `ApplyProjectMapPatchCommand`：先完整校验坐标、图层、
>   tile/source lockstep、隐藏/锁定权限和重复写入，再一次应用；失败零写入，invert 同时恢复视觉、来源、高度与
>   碰撞 prev。no-op Command 不入 history、不置脏、不清 redo；undo/redo 执行失败不丢栈顶。
> - 结构化地图剪贴板保留相对错排坐标、稳定图层映射、tilesetId/tileId/height 和显式 included/excluded
>   collision；移动、复制、剪切、粘贴、重复、删除均先生成完整预览/冲突计划，取消/覆盖不静默，每个用户动作
>   只一笔 undo。变换预览期间 Inspector 与破坏性快捷键被锁定。
> - W8 只在 selection 代数类型中预留 `stamp-placement`。W7G 若要实现“保存重开后仍能整章选中”，必须另开三签 schema 任务持久化非链接 placement group；不得从相邻普通格猜组，不得让模板暗中回写已有放置。
>
> 实现、测试矩阵和 27%/103% 浏览器证据统一记录在 [W8 任务卡](../../ops/archive/tasks/done/W8-map-content-selection-inspector.md)。
>
> ### 地图/组合共享编辑面与来源面板（2026-08-19）
>
> - 地图与组合的中央区域直接渲染同一个 `IsometricEditorCanvas`，共享 base cache、裁剪、网格、图层显隐、
>   pointer lattice 与 `IsometricEditorToolbar`；组合只提供锚点/局部选择 overlay，不准再建 adapter 或私有 renderer。
> - 组合没有“查看/编辑”双状态：选中模板即进入同一编辑面，属性承载名称/分类/稳定 id/尺寸/锚点，引用独立成 Tab；
>   图层控件复用地图版本。所有草稿只在“保存组合”时提交一笔 command，取消/离开先确认。
> - 右栏“绘制”Tab 上下排列瓦片与组合。瓦片区先选择来源瓦片集，再从共享 `TilePickerGrid` 选 tile；默认侧栏宽度
>   一行五项。地图和组合都能在同一次编辑中使用多个来源，来源切换只影响下一笔。
> - 组合高度是相对 H，地图高度是绝对 H；共享工具栏仍只展示一个绘制高度选项。放置 ghost 与提交必须共用
>   `base + relative` 解析，避免预览和落图漂移。
>
> ### 音乐资源工作台(A7-0,2026-07-15)
>
> “资源 -> 音乐”是音乐的唯一权威编辑页，数据源是 `EditorState.assetCatalog`，不再维护
> `content/music.json` 或数字别名表。
>
> - 列表明确分开显示可编辑名称、稳定 AssetId、工程相对路径和操作；名称不充当 id，id 也不推导路径。
> - 导入只接受有效 MIDI，使用浏览器 SHA-256 生成 `music.authored.<hash>` 和
>   `assets/authored/<hash>.mid`；替换保留原 AssetId，只更新记录/字节，因此所有场景和脚本引用保持稳定。
> - 改名、导入、替换、删除全部是不可变 Command，可 undo/redo。删除前复用 typed 引用 walker；有引用时
>   禁止删除并展示引用数量，未引用条目才可删除。
> - 场景检查器、脚本命令表单和共享脚本抽屉都复用同一 `MusicPicker`；“延续上一曲”“停止音乐”和具体
>   AssetId 是三种不同语义，不能再用 `0` 或空字符串混写。
> - 编辑器试听与游戏 BGM 共用 reforge 的 BGM player 和当前工程 `AssetResolver`，MIDI 与 soundfont 均从
>   当前 `FileSource` 读取。全局只保留一条试听通道，切曲会停止前一首。
> - serialize/save 同时写 `assets/index.json` 与 pending blob；本地 v2 工程先单向升级为 v3 再进入工作态。
>
> 浏览器验收以 6010 的 PAL 工程为准：86 首均显示 label/id/path；至少两首可切换试听；改名可撤销；
> 引用保护与未引用删除状态正确。完整闭包数据见
> [`a7-0-music-resource-closure-report.md`](../archive/audits/a7-0-music-resource-closure-report.md)。
>
> ### 过场资源工作台(A7-3,2026-07-16)
>
> “资源 -> 过场素材”由统一 catalog 派生，不再是 `/extracted` 浏览器：
>
> - 左侧是可独立滚动、可搜索和导入的视频/帧动画双列表；中间按类型显示黑底原生视频播放器或完整帧时间轴；
>   右侧显示名称、AssetId、来源、文件、媒体信息、typed 引用、替换、删除和诊断。
> - 视频支持 MP4/WebM 导入、改名、保持 AssetId 替换与引用安全删除。编辑器播放器留在中间面板；游戏运行时
>   仍使用 Cinematic Layer。
> - 帧动画导入 PNG/JPEG/WebP 序列，初始自然排序，导入前可逐张上移、下移或排除；时间轴支持播放、帧率/
>   单帧时长、插入、替换、多选、复制、删除、公共手柄重排和局部撤销/重做。手柄位于帧卡片内左上角，选择区与
>   排序命中区分离；拖动、键盘和前后移动按钮共用一次 draft-history commit，并按稳定 frame id 保持多选与活动帧。
> - 作者始终编辑完整 RGBA8 画布；时间轴只渲染可见缩略图。批量量化与 TPFS 重编码在 Worker 中完成，
>   未修改旧帧保持惰性来源引用，保存时才恢复完整帧并自动压缩。
> - “保留原色 / 工程标准色彩”只决定完整帧像素；不显示 palette 编号。标准色彩来自
>   `visual.standardColorTable` 角色。
> - 有未保存帧编辑时切换资源必须确认；有 typed 引用的资源禁删，无引用资源确认删除。首次修改迁移资产后
>   AssetId 不变，路径转 `assets/authored/**`、来源转 authored，受 MG2 所有权保护。
>
> 完整格式、边界与验证矩阵见
> [`cutscene-asset-workbench-design.md`](../archive/designs/cutscene-asset-workbench-design.md)。
>
> ### 战斗精灵资源库(A7-3B,2026-07-21，done)
>
> “资源 -> 精灵库”先按“大世界 / 战斗”切资源域；战斗域内再按“语义定义 / 二进制资源”切生命周期，
> URL 使用 `domain=battle&view=definition|asset&object=<id>`，诊断和消费者跳转必须落到具体域、视图和对象。
>
> - 左侧列表提供搜索、profile 过滤、共享/未引用状态和稳定选择回退；定义切到资源视图时聚焦当前定义实际引用的
>   AssetId，不能回落到排序首项。中间面板复用运行时 indexed-RLE 解码，展示动画、逐帧尺寸与 profile 命名动作；
>   右侧编辑标签、动作 ABI、来源/SHA、typed 引用与独立删除动作。
> - Actor、Enemy、召唤、梦蛇、脚本 appearance 和装备 effect 使用 profile-aware picker；就地上传是
>   `import asset + create definition + assign consumer` 的单一可撤销命令，不暴露 number/path 输入。
> - 替换共享二进制前显示全部消费者，默认 no-shrink；stale SHA、路径冲突、消费者变化和越界 profile 均
>   fail-closed。删除定义与删除未使用二进制是两个命令，save/undo/save/redo 保持 record、bytes 和引用一致。
> - 长 AssetId/path 使用可换行或省略布局；窄面板不允许按钮文字溢出。输入框、视图切换和命名动作均提供
>   accessible name/pressed state，键盘焦点与现有蓝色控件风格一致。
>
> 完整实现与验证见
> [`A7-3B 任务卡`](../../ops/archive/tasks/done/A7-3B-battle-sprite-asset-closure.md)。
>
> ### manifest 项目工作台（X7-1；ARCH-ENTRYPOINT-CANONICAL-1 于 2026-08-22 更新）
>
> “项目”模块固定为四个权威子页：概览、全局资源与启动、入口与开局、问题。不得再把
> `startWorld` 暴露成与入口点并列的独立作者模块。
>
> - “入口与开局”只列 `manifest.entryPoints` 中的真实入口，按稳定 `EntryPoint.id` 选择和深链接；每项在同一
>   详情中编辑 `label`、`scene`、`introVideo` 与完整 `startWorld`。`manifest.defaultEntryId` 仅用徽标和
>   “设为直接启动项”动作指出无 `menu` / `entry` 参数时使用哪一个真实入口，不产生额外的伪入口。
> - `entryPoints` 必填且非空，每个入口的 `startWorld` 都必填、完整、自包含。入口之间没有继承、跟随、覆盖或
>   隐式同步；新建 / 复制时可以一次性深拷贝当前入口作为起点，保存后两项完全独立。若未来需要持续共享，应另建
>   有名字、有引用和解绑闭环的显式 preset，不能把 `defaultEntryId` 当父入口。
> - `manifest` 字段只有一个作者：项目页拥有 `name`、`defaultEntryId`、`entryPoints` 和 `assets.roles`；资源页
>   拥有 catalog 与二进制；场景/脚本页拥有 hooks 内的视频、RNG、BGM 和剧情编排。当前 manifest 不含顶层
>   `entryScene` 或顶层 `startWorld`。
> - “全局资源与启动”页由唯一的 typed role registry 生成角色、分组、中文名、类型、必选条件和帮助文案；角色
>   数量与分组数量不得写死。已配置数量只是摘要，必选性和健康状态由同一 registry 与 validator 决定，不能
>   要求可选角色全部存在。music / sound 在 AssetId 存在且 kind 正确时提供原位试听，并与音乐库、音效库共用
>   一个编辑器试听 owner；video 提供资源页直达，SoundFont 和 color-table 明确标注当前只能绑定 catalog 已有项。
> - “全局资源与启动”页只负责资源角色，不重复入口表或运行时启动链。概览固定用“默认开局”“标题菜单”“启动资源”
>   三张人话卡说明队伍、金钱、库存、入口、视频与资源健康，并只提供“入口与开局”“全局资源与启动”两个编辑
>   目的地；不得常驻显示 scene / role / query 等机器路径。默认入口的场景健康必须消费统一 diagnostics，不能在
>   卡片里另写一套场景存在性判断。
> - 开局队伍是有序列表，通过标题右侧的公共添加按钮打开搜索弹窗，选择角色并明确确认；正式 item 可用公共手柄、
>   键盘或精确按钮调整顺序并原位移出。初始库存和初始世界资源使用同一“按钮 → 搜索选择 → 确认”合同，不得常驻
>   宽下拉框、使用 checkbox 墙或默认添加第一项。集合为空时在面板正文居中说明，并根据 live 候选区分“可从右上角
>   添加”与“当前没有可添加对象”，不重复标题区数量。队伍、库存、世界资源和当前 HP/MP 每个离散动作只提交一条
>   `SetStartupEntriesCommand`。候选行必须帮助作者在确认前辨认对象：队员显示真实 face / portrait、稳定 ID、等级
>   与当前/最大 HP/MP；道具显示真实 item icon、稳定 ID、简短用途和能力；世界资源没有独立资产模型，只显示真实
>   使用方与抽取语义，禁止用物品图或装饰图标冒充资源图片。所有候选行保持固定两行，ID 不能被长说明先截掉。
>   字段草稿继续服从共享 draft / validate / commit / cancel / resync 合同。角色
>   初始技能仍由 `ActorDef.initialMagic` 唯一持有，入口页不得恢复技能快照。
> - 每名开局队员在同一行显示“当前状态”摘要，并由一个共享弹层编辑中毒、可携带定时状态和临时毒抗。
>   弹层使用中文名称与效果说明，不显示 `tickIndex`、`extraPoisonRes` 或裸状态枚举；“傀儡”不得出现在
>   大世界携带选项。草稿取消/对象切换产生零命令，最终保存最多一条命令；移出队员时 HP/MP seed 与
>   condition seed 必须在同一条命令中原子清除并可一次 undo 恢复。
> - 剧情脚本对后续入队角色使用独立的“施加/清除角色当前状态”结构化表单；典型流程是先 `setParty`，再按
>   稳定 ActorId 施加。该表单与入口弹层消费同一 condition registry 和毒引用目录，不建立页面私有词表。
> - `?module=project&page=entrypoint` 无 object 时定位 `defaultEntryId` 命中的入口；附
>   `object=<EntryPoint.id>` 定位指定真实入口。历史
>   `page=startworld` 只做 URL 兼容归一化到 `entrypoint`，不保留旧页面。
> - 保存前统一校验入口表非空、id 唯一、`defaultEntryId` 命中、入口 scene、每套 StartWorld 引用、资源角色与
>   typed 资产闭包，错误按稳定入口 id 跳回字段的唯一作者。contentVersion 22 不合成入口、不接受旧顶层字段，
>   也不保留任何 contentVersion 1..18 upgrader 或 fallback。
> - “问题”页只消费统一 diagnostics，并按严重度、问题类型与资源类型分组；项目身份和版本信息归“概览”，
>   不在问题页重复。locale 编辑与状态归未来独立本地化工作台，问题页不建立第二个入口。
>
> ### 有序作者集合与效果链（ED-REORDER-DRAG-1，2026-08-26）
>
> - 物品使用/投掷/装备效果、技能基础/执行效果、毒回合、敌人 AI、商店货单与角色伤亡分支都是作者有序数据；
>   它们统一使用 item 内公共 grip、键盘排序和公共精确移动按钮。领域页面只能适配 insert/swap/反向 stack/同父级
>   等既有语义，不能再写私有上下箭头、`≡`、整行 native draggable 或 pointer 状态机。
> - 普通效果链按 occurrence token 区分重复值，固定敌队槽使用 swap 且保留空槽，脚本命令只在同父级移动，
>   behavior/hook/action 的显式 `order` 每次重排归一化为 `0..n-1`。一次落位只产生一条领域 command；原位、取消、
>   revision/对象变化产生零命令，undo/redo 对称。
> - 资源帧拖入动作槽仍是 copy transfer，不属于排序；地图实体坐标、面板 resize、视口 pan/zoom、成员归属和按等级
>   派生顺序同样排除。生产采用矩阵与证据型 allowlist 是边界真源，不能从“底层恰好是数组”推导新交互能力。
>
> ### 统一工程引用边与安全删除地基（ED-3，2026-09-05 done）
>
> - 引用能力固定为四层：content typed leaf rule 只识别 schema 语义；editor adapter 补稳定 target/source、
>   relation、结构化 locator 和 delete policy；同一 builder 同时供 revision Worker 与破坏动作的同步
>   current-author oracle；页面只用既有 Reference UI 呈现和跳转。`where` 是可读路径，不是身份或导航协议。
> - 同步索引覆盖 scene/map/shop、asset、actor/item/skill/enemy/poison、battle field/team/ambience、
>   entity address、world variable、behavior/hook/shared script 及 world/battle sprite；旧领域 Worker DTO、
>   页面私有 scanner、媒体 `where/site` 解析与 App 专用 handler 已退役。
> - 地图正文保持懒加载，不塞回 Worker。session 级 map/stamp facts 生成带 path/revision/generation/coverage 的
>   edge batch；partial、failure、迟到读取和在途 hydrate 均不能授权删除。Tileset/Stamp 的领域 proof 继续
>   额外约束 bytes/SHA/definition/frame/placement，并在 apply/redo 同步复核。
> - 引用索引是当前 revision 的非持久化派生物，不写 graph 文件、不改变内容或存档格式轴，也不保留旧版本 fallback。
>   场景生命周期已由 ED-SCENE-LIFECYCLE-1 收口，商店 ED-SHOP-LIFECYCLE-1 三方终审、720宽补验与用户验收通过并收口；页面继续共用
>   collector/locator/policy。
> - 场景生命周期使用 `SceneIndexV1`：目录和所有场景选择器显示 `name + SceneId`，Scene Inspector 复用
>   `DsInspectorTabs + DsReferencePanel`；新建/复制/危险删除使用 `DsListHeader` 与 `DsDialog`。名称只改目录
>   元数据；复制共享地图/资产并通过 content typed transformer 改写复制体内部显式自引用；删除在 UI 与
>   command apply/redo 两层消费 ED-3 current exact proof。列表内容区无额外面板内边距，表单仍使用标准
>   Inspector 属性间距。
>
> ### 商店生命周期（ED-SHOP-LIFECYCLE-1，2026-09-05 done）
>
> - 保持现有货单派生目录标题和列表样式；Hero是复制、独立试买、删除的唯一动作owner。商店只存稳定数值id与
>   有序items，复制保留重复项，新增id取max+1（空目录为0），redo固定首次捕获的id/货单。统计“种类”按去重数，
>   不对真实货单去重。首店登记manifest路径，删空仍保存空表，undo恢复原位。
> - 引用页复用ED-3与公共Inspector/Reference组件；只有current+index且无buy引用才允许确认，Command每次apply/redo
>   冷复核current main+script作者态。sell的历史shop值不形成引用；不级联修改脚本或物品。
> - PAL重迁沿用原有按id三方合并和纯theirs baseline。固定1..20/29buy/6sell/源Store0边界校验只约束生成种子；
>   作者target按当前ShopDef结构和真实buy/货单物品引用校验，合法id0、增删店/指令与空表不再被固定census拒绝。
>   item268/270原保护保持独立；商店操作不改变当前内容或存档格式。
> - 独立试买沿同源play页加载已保存项目；有任何未保存作者改动时禁止开始并显示原因。公共弹窗用
>   `DsFieldGroup + DsReadoutList + DsNumberField` 配置一次性金钱；正式`openShopUi/shopInput/shopBuy/drawShop`
>   处理菜单、确认与结算，启动早分支不建立世界/SaveStore、不跑剧情。320×200菜单按可用窗口取1..4整数倍率；
>   Escape退出清理输入/绘制，所有本次金钱与背包丢弃。它不是通用X5前置状态配置，也不改变旧试打/试放策略。
>
> ## UI 布局(React 外壳)—— 当前约束
>
> 现行布局、组件尺寸、响应式和操作层级统一遵守 [编辑器设计系统](editor-design-system.md)。
> 早期 HTML 草案只作为归档背景，不承担当前像素规范。
>
> - **顶栏**(应用级):工程名 · 撤销/重做 · 保存(脏标记)。
> - **左·模块导航**:场景/地图/剧情/角色/物品/战斗/战斗模拟器/资源/项目设置九个一级入口;展开时显示图标+中文名,折叠时只显示固定尺寸图标和 tooltip。窄窗口可强制折叠,不得覆盖画布或检查器。
> - **模块子导航**:只显示当前模块已登记的权威子页;不为凑数创建空页,也不恢复“数据”总容器。
> - **左·Outliner(对象树)**:「场景里有什么」= 场景根 → 进场点 → 各实体;`＋` 加实体在此;下接图层/显隐。
> - **中·工具栏 + 画布**:工具栏放**动作/工具**(选择·移动 / 添加实体 / 删除)+ 视图开关(网格 / 禁入 / 选中置顶 / 亮度);画布复用渲染器画场景 + 模式叠加层。
> - **右·Inspector**：承载当前选中对象的属性、行为与引用，按通用 Inspector 合同呈现；不恢复旧调色板字段或早期 B2 占位。
> - **底·状态条**:统一汇总内容跨表引用、manifest/入口不变式和资产闭包诊断；有待处理项时显示数量与摘要，只有零项时显示“引用与工程诊断无问题”。这里消费同 revision 的 diagnostics snapshot 与统一 `ProjectReferenceIndex`，不在状态条另建扫描器；异步地图正文引用另由带完整 coverage/revision 的 proof batch 提供，partial/failed 不得冒充零引用。
>
> 对象列表负责目录选择，Inspector 跟随当前对象；项目、目录与对象操作按设计系统分配。
> 作者数据修改继续通过领域命令与对应会话进入撤销历史，布局或视图临时状态不混入内容数据。

<!-- original-source-quote:end -->
