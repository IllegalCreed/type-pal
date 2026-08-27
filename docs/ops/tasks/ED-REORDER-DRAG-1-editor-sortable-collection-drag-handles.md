# ED-REORDER-DRAG-1 - 编辑器有序集合拖拽手柄统一

Status: done（2026-08-27 三方增量 accept + 用户库存行复验通过，整卡收口）
Phase: phase2
Capability: Editor cross-cutting（不改变 capability-map）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: `codex/ed-project-startup-ia-1`（按用户要求在当前串行工作分支持续分卡提交，不另建并行分支）

## 目标

所有已经允许作者调整顺序、或 canonical contract 明确由作者维护顺序的编辑器集合，都在每个可移动项最前方
提供同一套可识别的拖拽手柄；拖拽、键盘和原有精确移动动作共享同一个排序 owner，一次完整手势最多产生一条
可撤销命令。新页面不能再各写一套上下箭头、原生 `draggable` 或页面私有拖拽 CSS。

## 范围

- 范围内:
  - 从生产 UI 与 canonical 作者顺序语义生成全量采用矩阵，按普通线性列表、固定槽位交换、嵌套同级列表、
    图层堆栈、临时导入清单和帧 / 动作时间线分类；每项登记数据 owner、排序语义、撤销 owner、handle /
    alternative 与例外。已有上下移 / drag 的表面和“顺序明确但当前只能靠增删形成顺序”的作者数据均须登记。
  - 在设计系统新增唯一 reorder interaction owner 与 `grip` 语义图标。领域页面只提供当前顺序、可移动状态、
    显示名和一次性 `onReorder`，不得复制 pointer / keyboard / ARIA / drop indicator 状态机。
  - 普通行的手柄是第一个交互槽，位于序号、媒体、名称、字段和尾部动作之前；手柄拥有稳定命中区与
    `grab / grabbing` 状态。不能复用 `DsCatalogRow.leading` 冒充媒体，也不能让整行可拖而破坏输入、选择或点选。
  - Pointer Events + pointer capture 驱动拖拽；超过统一屏幕像素阈值才进入 dragging。hover / pointermove 只更新
    本地投影与插入指示，不 dispatch；pointerup 的有效 drop 才调用一次领域 `onReorder`。
  - 键盘支持聚焦手柄后进入 / 退出排序模式、方向键与 Home / End 选择目标、Enter / Space 落位、Escape 取消，
    并通过共享 live region 宣布“已移动到第 N 项，共 M 项”。焦点在提交后跟随同一逻辑项。
  - 拖拽不是唯一操作入口：现有上移 / 下移按钮在本卡保留；高密度时间线允许由同一公共 owner 提供等价移动菜单。
    pointer、touch、键盘和点击替代路径必须落到同一领域排序函数。
  - 一次拖拽或一次键盘“拿起 -> 移动 -> 放下”只产生一条 command / draft-history entry；无效 drop、原位 drop、
    Escape、pointercancel、对象切换、undo/redo、外部 revision 变化和 unmount 都取消且不污染 history / dirty。
  - 滚动时只允许实际列表 scroll owner 自动滚动；禁止滚动 document 或穿过 modal / drawer。窄宽、150% 缩放、
    长名称、输入聚焦、嵌套列表和 popup 打开时都不能误触拖拽或裁切 drop indicator。
  - 将现有 `SpriteActionEditor` 页面私有手柄和 `FrameAnimationEditor` 整项原生拖拽迁到公共合同；保留其动作步
    插入、帧多选和 draft-history 语义，不把资源拖入与顺序拖拽混成同一 payload。
  - 建立静态 / registry 门禁：新增上下移动动作但没有公共手柄、排序手势逐 move dispatch、领域私有排序 handle、
    或把原生 `draggable` 用于排序而未登记时失败；空间移动 / 资源拖入等合法例外必须有证据型 allowlist。
- 范围外:
  - 不改变任何 schema、runtime、save、migration、PAL 内容、数组顺序语义或既有排序结果。
  - 不给只读排序、搜索结果排序、按 ID / 名称临时排序的目录增加拖拽；这类顺序不属于作者数据。
  - 不把场景实体移动、地图框选、曲线数值拖动、面板 resize、媒体拖入槽位等空间 / 参数 / transfer 手势误判为
    集合排序。
  - 不允许跨列表、跨脚本 block、跨资源或跨对象拖放；本卡只在原本允许的同级作用域内重排。
  - 不重开已完成的 `ED-DS-3` / `ED-FIELD-COMMIT-1`，不把 Startup 资源选择、角色状态或 Catalog 行信息层级
    偷塞进本卡。
- 明确不做:
  - 不以“整行都能拖”代替明确手柄，不用 emoji / 文本 `≡` 作为生产图标。
  - 不在 pointermove 中持续写 canonical state，不用逐像素 undo 或页面级 debounce 掩盖命令风暴。
  - 不直接采用现有 HTML5 `draggable` 作为新公共合同；它保留为待迁移现状证据。
  - 不因为底层字段是数组就自动开放排序；只有当前 UI 已有正式顺序调整能力，或一手 schema / runtime / UI 文案
    明确证明顺序是作者可见语义的表面才纳入。集合 / 多重集、派生排序和 stable-id graph 不纳入。

## 前提真值门

### 一句话行为 / 工程前提

当前编辑器已经在大量有序集合中正式提供上移 / 下移，另有少量 canonical contract 明确规定作者顺序但尚无
重排入口；本任务只把这些既有业务顺序统一暴露为前置手柄和拖拽 / 键盘事务，不发明新的领域顺序含义。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：这是二阶段作者工具交互，不改变原版游戏内排序或玩法语义。 | `docs/phase2/READ-FIRST.md:1-8` |
| 第一阶段 | N/A：一阶段没有 Reforge 编辑器设计系统或这些作者工作台；本卡不改变运行时读取数组顺序的方式。 | `docs/phase2/READ-FIRST.md:32-37` |
| 当前二阶段 | `DsRepeatRow` 只持有 density / 边框 / 节奏，没有 reorder handle、pointer、keyboard、ARIA 或事务合同。独立 census 得到 32 个有序数据路径 / 17 个交互家族 / 19 个可能触达的 production UI 文件：其中 22 路径 / 13 家族 / 14 文件已有上移、交换或 drag，另有 10 路径 / 4 新家族 / 5 新文件的顺序已被 schema、runtime 或 UI 文案明确但没有重排入口。 | `packages/editor/src/ui/design-system/recipes.tsx:246-258`；`packages/editor/src/ui/SpriteActionEditor.tsx:383-464`；`packages/editor/src/ui/FrameAnimationEditor.tsx:109-144,865-879`；本卡 census |
| 本任务目标 | 所有已有重排入口、或 canonical contract 已明确由作者维护顺序的表面前置共享 grip；拖拽 / 键盘 / 精确按钮共享一次性提交 owner，并由采用矩阵与静态门禁防回流。 | 用户 2026-08-26 裁决；本卡范围 / 验收条件 |

### 反证与替代解释

- 最强替代解释: 上移 / 下移按钮比拖拽精确且天然可访问；统一增加手柄会挤压窄列表，并让固定槽位、嵌套脚本和
  时间线被错误地当成同一种数组排序。
- 设计回应: 本卡保留按钮 / 等价菜单，将拖拽作为额外直接操作；公共合同只统一输入、反馈和事务边界，领域 adapter
  仍明确区分 insert、swap、same-sibling 与 draft-history。handle 使用独立交互 rail，不占用身份 / 媒体槽。
- 什么观察会推翻当前前提: 某候选的上下动作实际改变空间位置、z-index 以外的业务状态、固定语义槽所有权或跨块
  控制流，而不是调整同级作者顺序；该项必须从通用 adoption 移出并留下证据，不得强套 reorder primitive。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: 不改 runtime；每个 adapter 必须复用既有领域重排函数 / command owner。
  - 原版 / 第一阶段理解: 无对应作者 UI，不从游戏菜单列表推断编辑器交互。
  - extractor / 地图 / 数据解码: N/A；不改生成数据或 PAL 内容。
  - audit / test model: 不能只 grep “上移”；必须区分 ordered data、空间移动、focus navigation、fixed slot 与 transfer drag。

### 用户可见偏离

- 是否主动偏离已核真值: yes。
- `before -> after` 一句话: 可调整顺序的行依赖分散的上下箭头，少数页面整项可拖或有私有手柄 -> 每个正式
  可移动项都在最前方显示统一 grip，并支持一次性、可撤销的拖拽；按钮 / 键盘替代仍可用。
- 代表场景: PAL 入口队伍中拖动“李逍遥”到第 2 位；在技能效果链、脚本同级命令和帧时间线中重排后各 undo 一次。
- 用户裁决: 2026-08-26 用户明确要求“所有这种可以调整顺序的，前面都加一个手柄支持拖拽调整顺序”。

## 当前可排序表面 census（开卡基线）

独立只读 census 的当前口径是 **32 个数据路径 / 17 个交互家族 / 19 个可能触达的 UI 文件**。build 前由 GLM
以机器 census 复核并落成采用 registry，不能只实现截图中的队伍行，也不能把数字写死成未来真值。

### A. 已有重排能力：22 路径 / 13 家族 / 14 UI 文件

| 家族 | 当前 owner / 证据 | 现状 | 本卡 adapter |
|---|---|---|---|
| 项目入口、开局队伍 | `ProjectWorkbenchTab.tsx:635-640,731-779,1251-1259,1277-1292,1314-1323` | 队伍行双箭头；入口排序藏在 Header overflow | 线性 insert；Catalog 行用独立 handle rail，不占 `leading` |
| 敌人 AI 规则 | `EnemyTab.tsx:500-537` | 每行私有上下 / 删除 | 线性 insert |
| 敌队五槽 | `EnemyTeamTab.tsx:301-349` | 固定 5 槽，相邻交换且保留空槽 | fixed-slot swap，不压缩空槽 |
| 物品装备效果 | `ItemTab.tsx:1694-1739` | 卡片尾部双箭头 | 线性 insert |
| 物品数量清单 / 配方 / 使用效果 / 投掷效果 | `ItemUseEffectEditor.tsx:320-440,1210-1255,1680-1726` | 多套重复交换代码 | 线性 insert；exclusive / minimum 限制保持 |
| 技能效果链 | `SkillTab.tsx:710-754` | 卡片尾部双箭头 | 线性 insert |
| 毒回合序列（玩家 / 敌人） | `PoisonTab.tsx:90-169,180-220` | 共享 Tick 行但私有双箭头 | 线性 insert |
| 商店货单 | `ShopTab.tsx:126-179` | 行尾文字箭头 | 线性 insert，重复 ItemId 仍按位置移动 |
| canonical / legacy 脚本命令 | `ScriptEditor.tsx:900-950,3099-3112`；`ScriptTree.tsx:475-511` | 两套同级命令动作 | same-sibling insert；禁止跨 block / stage |
| 地图 / 组合图层堆栈 | `LayerStackControls.tsx:110-160`；`StampContentEditor.tsx:469-470` | 只对活动层显示双箭头 | stack insert；locked layer 禁止拖动 |
| 过场帧导入清单 | `CutsceneTab.tsx:598-617,1055-1100` | modal 内本地数组双箭头 | local-draft insert，不写全局 history |
| 精灵动作步骤 | `SpriteActionEditor.tsx:206-223,383-464` | 已有私有 `≡` 原生 drag + 双箭头 | 迁移为公共 handle；保留 frame transfer payload |
| 帧动画时间线 | `FrameAnimationEditor.tsx:109-144,180,865-879` | 整个帧按钮 draggable，排序无显式 handle | timeline insert；帧选择与拖拽命中区分离 |

### B. 顺序明确但当前只有增删 / `order`：10 路径 / 4 新家族 / 5 新 UI 文件

这些不是“看到数组就加排序”，而是一手证据已经证明顺序影响作者或运行时结果；按用户“所有这种”的全量口径纳入。

| 家族 | 当前 owner / 证据 | 已核顺序语义 | 本卡 adapter |
|---|---|---|---|
| 入口初始背包 | `ProjectWorkbenchTab.tsx:863-973`；`packages/content/src/item.ts:568-583` | `startWorld.inventory` 顺序进入运行时菜单；当前只能按添加先后形成顺序 | 线性 insert；同 `SetStartupEntriesCommand` |
| Actor 初始魔法与伤亡脚本 gates / lines / effects（4 路径） | `ActorMode.tsx:1511-1587`；`CasualtyEditor.tsx:95-133,197-260,337-550`；`packages/content/src/actor.ts:53-64`；`packages/reforge/src/magic-menu-state.ts:27-39` | initialMagic 的 learned order 与 casualty schema ordered 均为显式语义 | 同父级线性 insert；复用 `UpdateActorCommand` |
| 命令内部 dialogue cue rows / `setParty.members`（2 路径） | `CommandForm.tsx:305-318,414-458,1230-1276` | cue 时序明确；members 文案明确“顺序 = 站位” | 命令内部同字段 insert；仍由 enclosing script snapshot command 提交 |
| entity behavior schemes / scene hook variants（2 路径） | `packages/content/src/author-script-core.ts:329-360`；`ScriptBehaviorInspector.tsx:118-204`；`ScriptSceneHookInspector.tsx:81-161` | 显式 `order` 字段决定读取顺序 | stable order adapter；分别复用 entity / scene hook command owner |
| sprite action definitions | `packages/content/src/sprite.ts:39-45`；`SpriteActionEditor.tsx:49-54,165-183,270-288` | `poses.*.order` 是编辑器排序字段 | 复用 Sprite 家族 owner；不与 action step 混 scope |

### C. 暂缓且不得伪装成遗漏

- canonical / legacy script **stage** 顺序不是普通 sibling command：legacy stage 还伴随 index / advance 重映射，
  证据为 `packages/editor/src/core/script-edit.ts:166-190`。本卡只纳入各 stage / block 内的同级 body；stage reorder
  另开语义卡后才能做，不能套用基础 handle。

### 明确排除的相邻手势

- `SceneCanvas` 实体 / 入口点空间移动、`MapMode` 框选 / 组合移动、`LevelCurveEditor` 数值曲线拖动。
- `PanelResizeHandle` 分栏尺寸、`DsTabs` 方向键焦点导航。
- `BattleSpriteLibrary` / `SpriteFrameWorkbench` 把源帧拖入目标槽；这是资源 transfer，不是集合排序。
- `MapSelectionInspector` “移到图层”是成员归属变更，不是图层顺序。
- recipe ingredients / products、skill cost items、equip / status / tag 等是集合 / 多重集；`LevelingEditor` 按 level
  派生排序；普通 catalog / storage 数组与 stable-id graph 不因底层数组形状纳入。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `ED-DS-3` 已 done；同一交互语义必须共享公共 owner，不能逐页补 CSS。
  - `ED-FIELD-COMMIT-1` 已 done；拖拽完成是离散提交，一次手势不能制造逐像素命令。
  - 拖拽不能成为唯一操作路径；手柄必须有可见 focus、键盘处理和非手势替代。
  - 同一时间只有 Codex 一个 Coding Owner 修改实现文件；与当前 Startup / Actor Condition / Catalog 卡串行。
- 代码锚点(`file:line`):
  - `packages/editor/src/ui/design-system/recipes.tsx:246-258`
  - `packages/editor/src/ui/design-system/icons.tsx:3-35`
  - `packages/editor/src/ui/PanelResizeHandle.tsx:72-172`（pointer capture / keyboard 现有参考，不复用逐 move 写入）
  - `packages/editor/src/ui/SpriteActionEditor.tsx:383-464`
  - `packages/editor/src/ui/FrameAnimationEditor.tsx:109-144,865-879`
- 已知坑 / 审计文档:
  - `docs/phase2/editor/editor-design-system-v1.md:181-190,450-463`
  - `docs/phase2/editor/editor-ui-audit-2026-08-15.md:155`
  - `docs/ops/tasks/ED-DS-3-editor-design-system-adoption-gate.md`
  - `docs/ops/tasks/ED-PROJECT-STARTUP-IA-1-project-entry-startup-workbench.md`
  - `docs/ops/tasks/ED-CATALOG-ROW-IA-1-editor-catalog-row-information-hierarchy.md`
  - `docs/ops/tasks/ARCH-ACTOR-CONDITION-SEED-1-entry-and-story-actor-conditions.md`
- 不得重新引入:
  - 页面私有 drag state / grip CSS、`≡` 文本图标、整行 draggable、逐 move dispatch、无证据的 native DnD allowlist。
  - 用数组 value 当唯一拖拽身份；重复物品、重复效果或 index key 必须用稳定 item key，或在手势 snapshot 内持有
    editor-local token，并在 revision 变化时取消；不得新增持久化 schema ID。
- 相关测试:
  - `packages/editor/src/ui/design-system/recipes.test.tsx`
  - `packages/editor/src/ui/design-system/boundary.test.ts`
  - 上表各 production consumer 的既有 `.test.tsx`。

## 验收条件

- 功能:
  - 机器 census 中每个 included surface 都有前置公共手柄；普通行位于序号 / 媒体 / 名称之前，时间线有固定的
    handle overlay。没有把手柄塞进 `DsCatalogRow.leading`，也没有把整行 / 输入框设为 draggable。
  - pointer 拖拽具有统一 `6 CSS px` 阈值、pointer capture、目标指示与 `grab/grabbing`；只允许同一 collection
    scope 内的有效目标。fixed-slot 用 swap、普通列表用 insert、嵌套脚本限同级、timeline 保留多选 / transfer 行为。
  - pointermove / hover 不调用领域 `onReorder`；有效 drop 恰调用一次。原位、越界、disabled、Escape、cancel、
    revision / 对象切换和 unmount 均 0 次；新 canonical 到达后旧 drop 不得落到新对象。
  - pointerdown 导致字段 blur / IME 收口时，先完成或取消既有字段意图再捕获排序 baseline；不能把旧 draft 串给
    重排后的另一项。真正 dragging 后 revision 变化必须取消，Ctrl/Cmd+Z 继续交给全局 undo。
  - keyboard 排序、点击 / 菜单替代和上下按钮读取同一 canMove / reorder owner。焦点跟随逻辑项，边界 disabled
    正确，live region 宣布新位置；删除、输入、选择、行选择和 popup 操作不触发拖拽。
  - 一次 drop = 一条 command / draft-history；undo 一次恢复完整旧顺序，redo 一次恢复新顺序。拖动多个位置仍不得
    生成多条命令；临时 import draft 只产生一次本地 state/history 更新。
  - handle 仅自身使用 `touch-action:none`，至少 `32×32px`；列表其余区域仍可滚动。最近同轴 scroll owner 负责
    requestAnimationFrame 边缘自动滚动，到边界后才允许外层滚动；overlay 进入 modal-aware portal host，
    `aria-hidden`、不可聚焦且不受 `contain/overflow` 裁切。
  - 720px、150% / 200% zoom、长名称、空列表、单项列表、50+ 项与锁定 / readonly 状态均无裁切、误拖或卡顿；
    reduced-motion 下取消位移动画和平滑滚动，只保留瞬时 drop indicator。
  - 现有 arrows 默认保留；若具体高密度表面改为公共移动菜单，必须证明 click / tap / keyboard 等价且由用户或
    三方设计签字允许，不能只因“有手柄”删除替代路径。
- 测试:
  - 公共状态机：mouse / touch / pen、pointer threshold / capture / lostcapture / over / drop / Escape / cancel /
    window blur / document hidden / revision change / unmount；keyboard pick / move / Home / End / drop、live、focus。
  - 命令边界：20 次 hover / auto-scroll 后 0 command；drop 1、no-op 0、undo/redo 对称；脏字段 focus、无效 draft、
    IME composition 和 popup 打开时不误提交。
  - 每个 census 家族至少一个集成断言，且 Startup party、重复 shop item、EnemyTeam 空槽、nested script、反向
    LayerStack、SpriteAction `loopFrom` + transfer、FrameAnimation selection + 单次 draft history 为强制代表场景。
  - 静态门禁从生产 registry 证明：included surface 有公共 owner；新增 reorder 双箭头 / 原生 sortable drag 未登记即
    失败；空间移动 / resize / asset transfer allowlist 含 owner、理由、验证和删除条件。
  - 每个切片先跑相关 focused tests；最终只跑一次 `pnpm --filter @type-pal/editor check`、一次 DS gate 与 build。
- 文档:
  - 更新 `editor-design-system-v1.md`，冻结 handle placement、pointer / keyboard / announcement、事务与替代路径；
    公共 recipe 使规范 / index / token / Design Lab 同步升下一 minor（当前预期 v2.12.0）。
  - 更新 `editor-design.md` 的有序队伍、效果链、帧动画与图层说明；写入机器采用矩阵和 evidence allowlist。
- 视觉 / 手工验证:
  - Design Lab 验证 default / compact、普通行 / catalog / fixed-slot / nested / timeline、disabled / dragging /
    drop-target / keyboard-picked、长名称、empty / single / many。
  - PAL 真实工程在 1280、900、720px 与 100% / 125% / 150% / 200% zoom 做最小功能验证：手柄位置一致、scroll
    owner 正确、输入与 popup 可用、拖拽后顺序和单步撤销正确、console error / warning 为 0。
- E2E 用例登记: N/A（功能性编辑器界面在 build 期最小浏览器验证）。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: **verified（2026-08-26）**。独立 census 得到 32 路径 / 17 家族 / 19 个可能触达 UI 文件；其中
    22 路径已有重排能力，另 10 路径有 schema/runtime/UI 一手顺序证据。公共 `DsRepeatRow` 没有 reorder 合同，
    `SpriteActionEditor` 与 `FrameAnimationEditor` 又有两套页面私有 native DnD，证明问题是公共 owner / adoption
    缺口，不是 Startup 单页布局问题。直接证据见真值矩阵与 census。
  - design: **agree（2026-08-26）**。建立 Pointer Events 公共排序 owner + 前置 grip；hover 只做本地投影，drop
    单次调用领域 owner；保留上下移动 / 等价菜单，补 keyboard / live / focus；用 insert / swap / same-sibling /
    timeline adapter 保持领域语义，并以机器 census / allowlist 防回流。不新增 schema/runtime 或第三方 DnD 依赖。
- Kimi:
  - premise: **verified（2026-08-26 独立直读公共层与八家族锚点，非代理）**。公共缺口属实：
    `DsRepeatRow`（recipes.tsx:246-257）只持 density/边框/节奏，无 reorder/pointer/keyboard/ARIA/事务
    合同；两套私有现状实锤——SpriteActionEditor.tsx:405-417 的 `≡` 文本手柄 + 原生 draggable +
    dataTransfer（且与同列表的帧插入 drop 区共享容器，payload 混居），FrameAnimationEditor.tsx:133-144
    整帧按钮原生 draggable 且无显式手柄、点击选择与拖拽同区。领域家族抽样逐类直读：普通线性
    （ProjectWorkbenchTab 队伍双箭头）、固定槽（EnemyTeamTab.tsx:301-349 五槽相邻交换保留空槽）、
    嵌套同级（ScriptEditor.tsx:910-948 的 path 域 onMove ±1）、反向图层（MapMode.tsx:2903-2913
    显示“上移”映射数组 +1 的反向语义 + 锁定层禁动）、临时 draft（CutsceneTab.tsx:598-617 modal
    本地数组移动不写全局 history）、effect chain（ItemTab/SkillTab 卡片尾部箭头）。排除项抽查属实：
    PanelResizeHandle 是 resize、SpriteFrameWorkbench 是资源 transfer、MapSelectionInspector 是归属
    变更——均非同级作者顺序。身份证据：SpriteActionEditor.tsx:433 的 draftKey 已含 step index +
    frame + cues，重排改变 index 即换键丢弃旧草稿（不串对象的现有形状）；revision 取消语义需由公共
    手势 snapshot 显式提供。
  - design: **agree（2026-08-26，附 KR1-KR4，build 必落钉）**：
    - **KR1（身份/revision）**：手势开始冻结 {scope、sourceKey、当时有序键列、revision}；drop 前对当前
      revision 再校验；重复值（同 ItemId 货单/重复效果）使用手势期 editor-local token，不以数组 index
      作唯一身份；revision 变化、对象切换、unmount 均取消且零命令。
    - **KR2（不破坏行合同）**：手柄为独立 rail，不占 `DsCatalogRow.leading`（与 CATALOG-ROW 卡 KC2 /
      DS-C.4b 同族媒体策略一致）、不改 68/46 行高；若必须改 DsCatalogRow 公共 props，按卡面规则使
      CATALOG 签字失效重签，不暗改前提。
    - **KR3（一次事务权威）**：drop intent 一次性交给领域 command owner；draft 家族只进 draft-history；
      原位/无效/Escape/pointercancel/外部 revision 全零命令；20 次 hover/auto-scroll 0 命令的门禁
      断言属于公共状态机测试。
    - **KR4（串行依赖）**：实现开工以 ED-PROJECT-STARTUP-IA-1 资源返工收口为前置（共享
      ProjectWorkbenchTab）；与 ARCH-ACTOR-CONDITION-SEED-1 串行；stage reorder 仍属另卡（卡面 C 节
      已排除，不得在本卡夹带）。
- GLM:
  - premise: **verified（2026-08-26，机器 census 全扫 + 逐类锚点直读，非代理）**：
    1. **机器 census 复核（非手抄卡表）**：全 editor UI 扫 `上移/下移/交换/移到/置顶/置底` +
       `draggable` + content 包 `order` schema 字段。命中全部落位：重排按钮族 14 文件与卡表 A 一致
       （按“承载重排 affordance 的文件”口径精确复现 14——LayerStackControls 持按钮，MapMode/
       StampContentEditor 只接线）；`draggable` 恰 3 处（SpriteActionEditor:407 私有 `≡` 手柄、
       FrameAnimationEditor:137 整帧按钮、SpriteFrameWorkbench:169/196/339 资源 transfer）；`order`
       字段恰 author-script-core:331/:351（behaviors/hook variants，validator exactKeys 含 order）+
       sprite.ts:44（poses）。**未发现卡表遗漏表面；未发现误纳入**。
    2. **排除项逐类证据**：MapMode:3283-3292 “沿倾斜地图坐标向上/下移动”= 空间位移；
       StampPlacementSelectionInspector:393 “移出组内碰撞成员”= 成员归属；ImageTab/PreviewCanvas
       拖拽 = pan/zoom 视口；SceneCanvas/App 实体拖动 = 空间；BattleSpriteLibrary `RAW_FRAME_MIME`
       dataTransfer + copy = 资源 transfer；MapSelectionInspector 图层 = 归属；LevelCurveEditor
       pointer 曲线 = 数值（且 pointerup 才提交——库内一次性事务先例）；navigation.tsx 方向键 =
       焦点导航；PanelResizeHandle = resize；LevelingEditor levelUpRows = 按 level 派生。全部与卡表
       “明确排除”一致。
    3. **代表锚点逐类直读**：普通线性（ProjectWorkbenchTab 队伍 :757-765 双箭头 + 入口排序藏于
       Header overflowActions :1281-1287——卡文“藏在 overflow”属实）；固定槽（EnemyTeamTab:306-349
       五槽相邻交换保留空槽，帮助文案明示“交换槽位、空槽不挤压”）；嵌套同级（ScriptEditor legacy
       :3099-3112 `moveAuthorCommandAt` path 域 ±1 + 选择路径跟随；ScriptTree:499-502 行动作）；
       反向图层（MapMode:2913 `direction === 'up' ? 1 : -1` 数组反向映射 + locked 禁动 + 仅活动层
       显示箭头）；时间线（FrameAnimationEditor:133-144 整帧 draggable 与选择/多选共区，:865-879
       drop 恰一次 commit、原位 return 零提交、frames 有稳定 id）；私有 drag 迁移面
       （SpriteActionEditor:403-417 `≡` 文本手柄 + ACTION_STEP_DRAG_MIME transfer payload + 双箭头，
       :433 draftKey 含 index+frame+cues）。
    4. **B 类顺序语义一手证据**：usableItems（item.ts:568-583）按 inventory 数组序进运行时使用菜单；
       initialMagic（actor.ts:82）有序数组 + resolveOutdoorSkills（magic-menu-state.ts:28-33）按
       learnedSkills 数组序消费；casualty “台词有序 + 效果有序”+ 顺序概率门（actor.ts:53-64）；
       behaviors/hook variants `order` 校验字段；poses order。五文件（ActorMode/CasualtyEditor/
       CommandForm/ScriptBehaviorInspector/ScriptSceneHookInspector）grep 无重排按钮——与“顺序明确
       但只能增删”一致。
    5. **C 类排除证据**：script stage 的 `next` 数字引用在 insert/delete 时整体 ±1 重映射
       （script-edit.ts:166-192）——stage 重排是引用重映射语义，非同级交换，暂缓正确。
    6. **公共缺口**：DsRepeatRow（recipes.tsx:246-258）仅 density/className，assertRecipeOwnsDensity，
       无 reorder/pointer/keyboard/ARIA/事务合同——公共 owner 缺口属实。
  - design: **agree（2026-08-26，附 RD1-RD4 必落钉；与 KR1-KR4 互补不冲突）**：
    - **RD1（census→registry 机器派生 + 口径冻结）**：采用 registry 必须由机器 census 生成（信号族 =
       移动按钮 aria-label/title、原生 draggable、validator `order` 字段、排除类人工复核），卡面
       32/17/19 手写表只是基线；registry 每条登记 adapter 类（linear / fixed-swap / same-sibling /
       stack-reverse / timeline / local-draft / stable-order）、数据 owner、command owner、替代动作与
       例外证据锚点。计数口径须在 registry 冻结（如 LayerStack=1 affordance 文件 + 2 consumer
       路径），保证 22/13/14 类数字可复现；生产代码新增未登记移动按钮或排序 draggable 即门禁失败。
    - **RD2（每家族命令次数门禁）**：每个家族集成测试必须挂领域 owner dispatch 计数 spy（command
       构造器或 draft-commit），断言：20 次 hover/auto-scroll = 0；有效 drop = 恰 1；原位/越界/
       Escape/pointercancel/对象切换/revision 变化/unmount = 0；undo 一次恢复完整旧序、redo 对称。
       卡面强制代表场景（Startup party、重复 shop item、EnemyTeam 空槽、nested script、反向
       LayerStack、SpriteAction loopFrom+transfer、FrameAnimation selection+单次 draft history）
       逐个配计数断言，不得只断言最终顺序。
    - **RD3（重复值稳定身份 + 草稿不串项）**：重复值表面（shop 重复 itemId、重复效果、同帧）必须用
       既有 schema id（如 FrameAnimation frame id）或手势期 editor-local token，不得以数组值或裸
       index 作唯一身份；测试含“两个相同值项拖动其一 → 移动的是正确一项”与“项 A 聚焦脏草稿时
       A 被重排 → 草稿随 A 逻辑项移动或取消，绝不落到占据 A 旧 index 的新项”（SpriteAction
       StepDurationInput :433 的 index-in-key 形状是必测 fixture）。
    - **RD4（allowlist 证据化 + 防漏网）**：静态门禁同时失败于：未登记的移动按钮对、未登记的排序
       draggable、页面私有 grip CSS/`≡` 文本图标、未消费公共 owner 的新重排 affordance。例外
       allowlist（空间移动/resize/transfer/归属/派生排序/pan-zoom）每条带 owner 文件、手势性质、
       证据锚点与删除条件；文件消失的陈旧条目必须同样失败（沿用 design-system-adoption 三态门禁
       纪律）。ImageTab/PreviewCanvas pan-zoom 与 SceneCanvas/MapMode 空间位移属该 allowlist。
  - 独立反证 / 可证伪观察: ①若任一 included 表面的移动实际改变同级顺序以外的东西（本次逐类直读
    未发现；若 LayerStack 上下移另触发显隐/实体位移即移出 adoption）；②若重复值表面离开持久
    schema id 就无法正确重排（editor-local token 在 build 证伪），即推翻“不新增持久化 ID”约束，
    须 counter 另开 schema 卡；③若 fixed-slot/嵌套/时间线 adapter 必须逐 move dispatch 才能保语义
    （现有按钮均为一次性 swap/insert/commit，未见中间态依赖——FrameAnimation 现状 drop 恰一次
    commit 是活证据），KR3/RD2 一次事务前提失效须重审。
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: Kimi（2026-08-26）；GLM（2026-08-26，独立机器 census + 逐类锚点，见 GLM 签节 RD1-RD4
    与可证伪观察①-③——两席反证独立完成，证据集合互补不重叠）
  - 独立证据锚点: `recipes.tsx:246-257`（DsRepeatRow 无 reorder 合同）；`SpriteActionEditor.tsx:405-417,433`
    （私有 ≡ + native drag + 含 index 的 draftKey）；`FrameAnimationEditor.tsx:133-144`（整帧 draggable）；
    `EnemyTeamTab.tsx:301-349`（固定槽交换）；`ScriptEditor.tsx:910-948`（同级 path 移动）；
    `MapMode.tsx:2903-2913`（反向 LayerStack）；`CutsceneTab.tsx:598-617`（本地 draft 清单）；
    排除项 `PanelResizeHandle.tsx:72-172`、`MapSelectionInspector`、SpriteFrameWorkbench transfer。
  - 可证伪观察: 若某 included surface 的移动实际改变空间坐标/归属/槽位语义而非同级顺序，应移出并留证据——
    抽查的 eight 家族均为同级顺序语义；若公共 state machine 必须逐 move dispatch 才能保持语义（如
    fixed-slot 交换需中间态可见），KR3 一次事务前提失败——现有按钮均一次性 swap/insert，未见中间态
    依赖；若 handle rail 必须占用 leading 或改变行高，与 CATALOG/DS-3 合同冲突须停线重签——公共
    wrapper/rail 方案不触碰二者。
- counter / 分歧处理: 无（KR1-KR4 与 RD1-RD4 互补：KR1↔RD3 身份/revision、KR3↔RD2 一次事务、KR2 行合同、KR4 串行）
- 缺签豁免: N/A
- build 准入结论: **allowed（签字面）（2026-08-26，Codex + Kimi（KR1-KR4）+ GLM（RD1-RD4）三签齐、
  无 counter，两席非 Owner 独立反证完成）。实现开工仍以 ED-PROJECT-STARTUP-IA-1 资源返工收口为串行
  前置（KR4 / 卡面 Branch 与上下文锚点）：Startup 单 Owner build 完成并转 review/done 前，Codex 不得
  动本卡实现文件；开工时状态转 build。**

### 进入 done 前:审查签字

- Codex: **accept（2026-08-27）**。直接证据：公共 22 项状态机测试覆盖 insert/swap 实时投影、唯一插入缝、
  scroll 补偿、成功交接无回跳、canonical no-op、repeat key 与 cancel；27 个受影响测试文件 / 373 tests passed；
  Chromium RF-21 的提交前后 rect 连续，PAL 状态播报节点为 1×1 visual-hidden；用户追加指出移动按钮无常驻
  边框后，公共 `DsReorderMoveButton` 已冻结为 secondary，default `DsRepeatRow` 三枚动作实测均为 36×36px；
  追加聚焦 4 files / 101 tests、typecheck 与 87-file DS gate 通过。
- Kimi: **accept（2026-08-27，只读终审 c799cb35 + 工作树视觉修正；独立直读公共状态机与 adapter
  调用域 + 聚焦复跑，非代理）**。按 KR1-KR4 逐项核验：
  - **KR1（身份/revision）✓**：手势开始冻结 {scopeKey、sourceKey、有序键列、revision} 快照
    （reorder.tsx:547-583），drop 前 `sameSnapshot` 再校验（:585-596,643-645）；重复值由
    editor-local occurrence token 追踪（`useDsReorderKeys`，:1302+），StrictMode 克隆/插入删除/
    显式去重/歧义 reset 均有专项测试（reorder.test.tsx:963-1040）；revision/scope 变化、lost
    capture、blur、hidden、unmount 全部取消且零命令（:654,:558 测试）。
  - **KR2（行合同不破）✓**：手柄是 item 边界内首个 DOM 槽，`DsCatalogRow.leading` 与 68/46
    行高未被触碰（adoption 测试 :430 机检 grip 不占媒体槽）；`DsReorderMoveButton` 固定
    secondary 常驻边框，默认档 repeat row 同组动作 36×36（工作树 recipes.css 直读）。
  - **KR3（一次事务权威）✓**：commit 构造唯一 intent 后恰一次 `onReorder`（:641-696）；
    原位/无目标/禁用/canReorder 拒绝/域级 no-op 全部零命令且焦点还原；hover/auto-scroll 只更新
    本地投影（:745+ projectPointer 无 dispatch）；20 次 hover 零命令类断言在状态机测试内。
  - **KR4（串行依赖）✓**：Startup 卡先于本卡收口（c7018f6a + 返工链在 c799cb35 之前）；
    ARCH-ACTOR-CONDITION-SEED-1 未被夹带；stage reorder 未混入（卡面 C 节排除保持）。
  - adapter 抽检：固定槽 swap（EnemyTeamTab `strategy="swap"`）、反向 LayerStack（visual↔storage
    反向映射 + 测试）、嵌套 same-sibling、Cutscene/FrameAnimation draft-history、timeline 多选与
    frame transfer payload 分离（SpriteActionEditor/FrameAnimationEditor 原生 draggable 已清零，
    本人 grep 复核）。
  - 聚焦复跑：reorder/reorder-adoption/boundary/ShopTab/EnemyTeamTab/SpriteActionEditor/
    FrameAnimationEditor.reorder/CasualtyEditor/ScriptEditor 9 文件 113/113 全绿；全量采纳卡内
    161/1246 记录未重复。
- GLM: **accept（2026-08-27，只读终审，本人一手直读实现 + 独立复跑聚焦测试）**：
  1. **公共 owner 合同（KR1/KR3）**：`reorder.tsx:214` `POINTER_THRESHOLD_PX=6`；pointer
     capture 释放 try/custody（:504-511）；`cancel`（:513-528）fail-closed 清 session/autoscroll/
     view/indicator；`currentBaseline/sameBaseline`（:530-548）冻结 scope+revision+有序键列并在
     drop 前再校验；提交路径（:662-693）构建唯一 `DsReorderIntent` 后**恰一次**
     `onReorderRef.current(intent)`，`false` 返回 = 域级 no-op（零 history + “顺序未改变”播报 +
     焦点还原）。22 项状态机测试逐条覆盖：:654 阈值/no-op/disabled/cancel/revision 零命令、
     :558 lostcapture/blur/hidden/unmount 零命令、:254 键盘至多一次提交、:506 swap 单次提交、
     :847 IME composition 阻断捕获、:759 最近 modal owner 自动滚动。
  2. **registry/allowlist（RD1/RD4）**：`reorder-adoption.json` 基线 **17 家族/29 adoption/
     32 数据路径/19 owner 文件**与本席设计审查期独立 census 口径一致；每家族带
     `integrationVerification.marker`（如 `[reorder-family:layer-stack]`）绑定真实测试。
     `reorder-adoption.test.ts` 六断言：:179 机器 census 绑定全部公共 collection 调用点、
     :286 transfer/spatial 例外证据化且**陈旧即失败**、:356 生产 draggable/onDrag*/onDrop 扫描、
     :373 私有移动按钮/手柄/`≡` glyph/手搓 intent 拒绝、:430 grip 在 item 边界内且不占 catalog
     媒体槽、:448 别名/展开 props 藏证据 fail-closed。11 条 allowlist 例外与本席设计期排除类
     一一对应（transfer×4/spatial/resize/归属/level 派生/pan-zoom/精灵绑定）。
  3. **adapter 抽检**：EnemyTeam `strategy="swap"` 固定槽交换保留空槽（EnemyTeamTab:231/:355）；
     反向图层测试（MapMode.test:877-905）断言 visual `['objects','floor']` vs storage
     `['floor','objects']` 反向映射 + `spyOn(dispatch)` 计数 + 键盘 Space/End/Enter（无位移
     pick+Enter = dispatch 零调用）；Shop 重复货物 occurrence 测试（ShopTab.test:140 “重复货物
     按 occurrence handle 重排，一次命令可 undo/redo，同值为零命令”）落实 RD3；occurrence
     token 套件 :963-1040 覆盖 StrictMode 克隆、插入删除不串 token、歧义 reset。
  4. **替代路径统一**：全库 18 个生产文件消费 `DsReorderMoveButton`（ShopTab:172-181、
     PoisonTab:151-160 抽检确认上移/下移均为公共 owner，无私有箭头残留）；排序用原生
     draggable 归零（仅 SpriteFrameWorkbench transfer 在 allowlist）；未提交视觉修正
     （variant="secondary" 常驻边框 + `.ds-repeat-row[data-density=default] .ds-icon-button`
     36×36 同组同高）与 boundary.test 新增规则断言一致钉死。
  5. **验证复跑**：`vitest run reorder.test.tsx reorder-adoption.test.ts` → **2 files /
     28 tests passed**（本席独立执行）；`git show c799cb35 -- packages/content|reforge|migrate|
     projects` 为空——schema/runtime/migration/PAL 未动；Startup 队伍/库存 reorder adapter
     （reorderDsItems + useDsReorderKeys，ProjectWorkbenchTab:715-734）与该卡命令域无冲突。
  - 无返工项。未修改实现文件，未代签 Kimi。
- Kimi 增量补审 accept（2026-08-27，只读，仅限用户验收增量四点，不重审旧范围；与 Startup 卡共享同一
  增量证据）：库存行三动作封入唯一 `.project-inventory-actions` 槽且为行 direct child（四子项），宽屏
  不再拆行；`DsReorderMoveButton` 固定 secondary + 默认档 repeat row 同组 36×36（reorder.tsx:1277+
  与 recipes.css:801-807 工作树直读）；editor.css 三档断点结构直读一致（:1752/:2183/:2233）；
  两个 catalog 指纹刷新后 `catalog-row-content-adoption.test.ts` 复跑 4/4（recorded==actual 双向匹配）。
  复跑 reorder/ProjectWorkbenchTab/boundary/catalog-adoption 共 83+43+4 全绿。无返工项；未修改实现，
  未代签 GLM。
- GLM 增量补审 accept（2026-08-27，只读，仅限用户验收增量四点，不重审旧范围）：
  1. **库存 adapter 三动作原子槽**：inventory 行 direct child 恰 4（序号/选择器/数量/动作槽），
     前移/后移/删除封入唯一 `.project-inventory-actions` nowrap 槽（ProjectWorkbenchTab:1055-1073，
     test :666-669 断言 3 按钮 + 4 child）——adapter 不再把动作拆成独立 grid child，宽屏不拆行。
  2. **三档响应**：基础 4 列同排（editor.css:1752）、中档组列不拆（:2183-2196）、窄档整组降行
     （:2233-2243）；组内 `flex-wrap:nowrap`（:1759-1766）；36×36 由公共 default-density
     icon-button 规则钉住——adapter 层零私有 CSS 补丁。
  3. **DsRepeatRow census**：全库恰 5 处消费（本席 grep 复核），inventory 封组后无剩余未封组多动作
     表面；修复未扩大公共 API（页面级槽位 span + 既有 DsFieldMeasure），符合本卡“adapter 持列语义、
     公共层持交互”的分层。
  4. **两个 Catalog Row evidence fingerprint**：`catalog-row-content-adoption.json` 的
     `cutscene/asset-catalog`（`907e826c897c45ff`）与 `sprite-action/preset-catalog`
     （`77c7bcbc4e7252cd`）条目 decision 均为 `compliant` 且带理由——非 allowlist 绕过；gate 测试
     （catalog-row-content-adoption.test.ts:221-249）由生产 JSX 重算 identity 并**双向精确匹配**
     （recorded == actual、每条必须绑定真实 callsite、slot presence 逐项断言），本席复跑通过即证明
     两 fingerprint 绑定的是当前 CutsceneTab / SpriteActionEditor 调用点（Reorder 改动后的漂移已修复）。
  - 本席独立复跑 `reorder.test.tsx + ProjectWorkbenchTab.test.tsx +
    catalog-row-content-adoption.test.ts` → **3 files / 66 tests passed**。无返工项；未修改实现，
    未代签 Kimi。
- counter / 返工处理: 2026-08-26 value no-op、undo identity、registry marker 假绿三项已逐项闭环；2026-08-27
  用户指出的双命中线 / item 边缘落点已改为 Sortable 式实时让位，fixed-slot swap 与逻辑焦点一并闭环；同日
  追加指出上下移动 glyph 无常驻按钮边界，已由公共 owner 改为 secondary 并按行 density 同组同高；最终验收
  又发现 Startup inventory adapter 把三动作作为独立 grid child 导致宽屏拆行，已封为一个 nowrap 动作槽
  （GLM 增量补审 accept 已写回，含 Reorder 引起的两个 Catalog fingerprint 漂移修复核验）。
- 缺签豁免: N/A
- done 准入结论: **allowed / complete（2026-08-27）**——Codex rework accept + Kimi 增量补审
  accept + GLM 增量补审 accept 齐，用户随后复验库存行并明确“通过”。

## Draft: 设计与风险

### 设计结论

- 公共层分为“collection interaction state machine + handle / drop indicator UI + domain adapter”。state machine 只持有
  手势 snapshot、source / projected target、scope、revision 与 focus restore，不拥有业务数组或 command。
- 新排序合同基于 Pointer Events / pointer capture，不继续扩散 HTML5 DnD；现有 Chromium-only 目标不能成为缺失
  touch / keyboard / cancel 语义的理由。现有上下按钮继续作为精确动作和非手势 fallback。
- 手势开始时冻结 collection scope、source position 与 revision；drop 时再次校验。领域 adapter 只收到一次
  `{sourceKey,targetKey,placement,fromIndex,toIndex,input}` intent，由现有 patch / command owner 决定数组和 undo。
- 普通列表使用 insertion index；fixed-slot 只交换两个槽；nested script 只能在相同 parent path；timeline 处理
  水平 / 虚拟命中且不吞掉 frame selection / asset transfer。重复值使用 editor-local stable token 或手势 snapshot，
  不新增 schema ID；外部 revision 变化即取消。
- `DsRepeatRow` / Catalog / timeline 通过专用 reorder slot / wrapper 消费公共 handle；handle rail 与 `leading` 媒体槽、
  sequence index 和动作区分离。API 具体命名由 build 前审查冻结，业务页不得直接组合 pointer props。

### 已知风险

- 风险: 本卡可能触达 19 个 production UI 文件 / 32 个数据路径，若 census 靠手写会漏掉隐藏 / nested / 临时
  modal 表面，或把集合字段误当顺序。
- 缓解: GLM 独立 machine census + adoption registry + AST / boundary gate，手写表只作开卡基线。
- 风险: `ProjectWorkbenchTab.tsx`、`ScriptEditor.tsx` 与当前 Startup / Actor Condition 卡重叠，Catalog 卡假设不改
  `DsCatalogRow` API。
- 缓解: 只先审签；实现严格串行。建议 Startup resource -> Catalog -> 本卡 -> Actor Condition；若本卡必须改
  `DsCatalogRow` 公共 props，Catalog 的旧签字立即失效并重签，不能暗改前提。
- 风险: 自动滚动、nested scroll、pointer capture 与 popup / text selection 竞争，可能产生误拖或 drop 到错误对象。
- 缓解: handle-only hit target、统一阈值、scope + revision 校验、pointercancel / Escape、真实滚动容器视觉验证。
- 风险: 为统一视觉错误改变 fixed slot / reverse LayerStack / nested / timeline 领域语义。
- 缓解: 多 adapter、代表 fixture 与一次 undo 断言；公共层不得直接修改业务数组。

### 主审立场

- Reviewer: Kimi + GLM
- 结论: agree（2026-08-26，Kimi KR1-KR4 + GLM RD1-RD4 均已写回）。
- 必改项: KR1-KR4 与 RD1-RD4 均为 build 必落钉。
- 是否建议进入 build: 是；2026-08-26 Startup build 已转 review、Catalog 已独立提交，串行前置满足。

## Build: 实现与自测

- Coding Owner: Codex（2026-08-26；唯一实现修改者）
- 修改文件:
  - 公共 owner: `packages/editor/src/ui/design-system/reorder.tsx`、`reorder.css`、`icons.tsx`、`index.ts`、
    `index.css`、`tokens.css`、`floating-layer.tsx`。
  - 机器门禁: `reorder-adoption.json`（17 家族 / 29 adoption / 32 路径 / 19 owner 文件）、
    `reorder-allowlist.json`（11 条、7 类证据例外）、`reorder-adoption.test.ts`、`boundary.test.ts`。
  - 领域采用: Project 入口/队伍/库存、Enemy AI/五槽、Item/Skill/Poison 效果链、Shop、canonical/legacy
    Script、Map/Stamp LayerStack、Cutscene 临时导入、Sprite Action/Step、FrameAnimation、Actor initialMagic/
    casualty、CommandForm cue/setParty、Behavior/Hook，共 19 个 owner 文件。
  - 验证与规范: 公共状态机及各领域专项测试、Design Lab `RF-21`、设计系统 v2.12.0、
    `editor-design.md` 与本任务卡。
- 实现摘要:
  - 新增 `DsReorderCollection + DsReorderItem + DsReorderMoveButton` 唯一交互 owner；Pointer Events、capture、
    6px 阈值、本地投影、同 scope/revision 校验、最近滚动 owner、modal-aware indicator、键盘 Home/End/
    方向键、live announcement 与提交后同逻辑项 focus/scroll 统一收口。pointermove / auto-scroll 零 dispatch，
    drop 最多一次领域 intent；Escape/cancel/lost capture/blur/hidden/unmount/revision/disabled 全部 fail-closed。
  - 用户 2026-08-27 以 VueUse / SortableJS 为交互参照要求“拖动时所有 item 直接动画让位，松手落在最终位置”。
    公共层现冻结一次几何 snapshot，来源项跟随 pointer，其他项只用 transform 实时腾出来源尺寸的占位；insert
    始终只有一个居中缝，swap 只交换来源与目标槽。scroll 同步补偿来源/同伴/indicator，成功提交用两帧 settling
    关闭 DOM handoff transition，0/40/220ms 均不回跳；reduced-motion 下改为瞬时让位。
  - 用户 2026-08-26 视觉纠偏“手柄应该在 item 里面”已作为公共硬合同落实：rail 是 item 的首个 DOM 槽，
    item 自身 `position: relative`，普通行使用内嵌 inset、timeline 使用 item 内 overlay；Catalog media leading、
    整行点击目标、输入与按钮均不持有 grip。纯文本、单项、disabled、nested 与长列表也保留 32×32 命中区。
  - adapter 保留既有领域语义：普通 insert、EnemyTeam fixed-slot swap、Map 反向 visual→storage、同父 script、
    本地 import/frame draft history、stable `order` 归一化；资源 frame transfer 与集合排序仍是两个 payload owner。
  - 无持久化 schema ID；重复值由 editor-local occurrence token 追踪，并提供显式 remove hint，已覆盖重复 Shop
    ItemId 与重复 casualty gate。删除位于选中项之前且内容完全相同的 casualty gate 时，occurrence 身份已不可判定，
    编辑器主动回退到 fallback；undo/redo 保持该安全选择，不会把后续编辑写入错误分支。相邻同值/空槽 swap 按
    canonical 值级 no-op 处理为零 history。
  - Frame 重排后 active/anchor 跟随来源 frame ID，多选集合仅在来源原本未选中时折叠；Sprite step 的
    `loopFrom` 跟随逻辑 step，Cutscene functional updater 不再包含 ref mutation。
  - EnemyTeam fixed-slot 不再以槽号冒充逻辑项身份；occurrence token 与 occupant 同步 swap，提交后焦点跟随来源
    occupant。外部 undo/redo 或槽内容替换无法证明 occurrence 时统一 reset token，避免重复敌人/空槽静默串位。
  - 排序结果和 Startup 队伍结果继续通过 live region 提供无障碍播报，但节点统一视觉隐藏；不再把
    “已移到初始队伍第 N 位”作为普通正文显示或占据布局。
  - 精确前移/后移 fallback 不再继承 `DsIconButton` 的 quiet 默认：公共 `DsReorderMoveButton` 固定使用
    `secondary` 常驻 control border；`DsRepeatRow` 的 default density 统一同组图标动作至 36×36px，避免
    移动按钮 30px、删除按钮 36px 的第二层回归。danger 删除继续保留红色边框，领域页不补私有 CSS。
  - Startup inventory adapter 将前移 / 后移 / 删除封装为一个不可拆分的 trailing action slot；`DsRepeatRow`
    五个生产消费点 census 证明库存是唯一遗漏，未为单一反例扩大公共 API。Reorder 提交影响的 Cutscene / Sprite
    Catalog Row 调用点同时刷新 evidence fingerprint，恢复采用矩阵与当前源码双向闭合。
- 运行命令:
  - `pnpm --dir packages/editor exec vitest run src/ui/design-system/reorder.test.tsx` → 22 passed。
  - `pnpm --filter @type-pal/editor exec vitest run src/ui/design-system/reorder-adoption.test.ts` → 6 passed。
  - 最终受影响聚焦组（公共/registry/boundary/core + 19 owner family）→ 27 files / 373 passed。
  - 审查期间一次 editor 全量实际执行 → 161 files / 1246 passed；此后只增补上述聚焦回归，不重复耗时全量。
  - `pnpm --filter @type-pal/editor typecheck` → passed（首次测试 spy 类型错误修正后复跑绿色）。
  - `pnpm --filter @type-pal/editor audit:design-system` → 87 files / 3 evidence-bound exceptions，passed。
  - `pnpm --filter @type-pal/editor build` → 471 modules，passed；仅既有 chunk-size 提示，无 build error。
  - 移动按钮视觉返工聚焦组：`reorder.test.tsx + controls.test.tsx + reorder-adoption.test.ts + boundary.test.ts`
    → 4 files / 101 passed；随后 typecheck、87-file DS gate 与 `git diff --check` 再次通过，未重复全量。
  - 用户验收增量：`ProjectWorkbenchTab.test.tsx + boundary.test.ts` → 2 files / 83 passed；加入
    `catalog-row-content-adoption.test.ts` 后 3 files / 87 passed。`check` typecheck 通过、DS gate 通过；全量阶段唯一
    红项是上述两处旧 fingerprint 漂移，聚焦修复闭环后未重复耗时全量。
- 浏览器 / 手工检查: Chromium 真实 PAL + Design Lab；详见下一节。
- 跳过的检查及原因: 未再次运行 editor 全量；审查期间已执行一次 161 files / 1246 tests，全量之后的新增改动均由
  最终 27 files / 373 tests 聚焦组、typecheck、DS gate 与 build 覆盖，避免无价值重复全量。

## 视觉验证记录

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式:
  - Chromium 打开 `design-lab.html?fixture=RF-21`，1280×900 全量几何扫描 78 个 item：handle 命中框全部在
    item 边界内；default/fixed/catalog/timeline/disabled/single/empty/52 项/nested 均可见。键盘把 `a` 从首位
    移到末位后顺序为 `b,c,a`，焦点仍在 `a` handle；console 0 error / 0 warning。
  - Sortable 式实时投影复验：拿起 `a` 移到末位但尚未提交时，`a/b/c` top 分别为
    `244.546875 / 132.546875 / 188.546875`，页面只有一个 indicator；提交后 0ms、40ms、220ms 三次量取均为
    `b=132.546875 / c=188.546875 / a=244.546875` 且 transform=`none`，无“先跳回再重播”。fixed-slot 的
    swap 预览只交换来源/目标，中央槽不动，提交同样连续。
  - Chromium 打开 PAL `?module=project&page=entrypoint`，1280 与 720 宽均逐像素量取入口目录与 Startup party：
    32×32 handle 同时落在 reorder item 和首个可见行背景内，720 无 document 横向溢出，HP/MP、序号、动作区
    和加入控件均可用。900 宽按 100%/125%/150%/200% 的等效 CSS viewport 检查，handle 始终在 item 内；
    有效 viewport 低于应用既有 720px shell 下限时由 shell 横向滚动承接，不裁切 item 或浮层。
  - PAL Startup 的排序状态节点实测 class=`ds-visually-hidden`、`position:absolute`、`clip-path:inset(50%)`、
    rect=`1×1`；无障碍树仍保留 status，视觉页面不再出现用户截图中的独立正文行。
  - PAL Startup 真实动作组追加实测：上移/下移均为 `ds-icon-button--secondary`、常驻 `1px solid
    rgb(102,114,138)` control border、36×36px；删除为 `danger`、`1px solid rgb(242,125,132)`、36×36px。
    三者同组同高，首尾 disabled 仍保留按钮轮廓，默认态不依赖 hover 才能识别。
  - 用户验收反例修复后，PAL 初始库存临时添加“观音符”并量测 1280 / 900 / 720px：三动作每档均
    `top spread = 0`、36×36px、完整落在 row rect 内且无横向溢出；900 / 720 只允许整组响应式降行，组内不拆散。
- 集中 E2E 用例 / 批次: N/A
- 截图 / 像素检查路径:
  - `docs/ops/evidence/ED-REORDER-DRAG-1/design-lab-rf21-1280.png`
  - `docs/ops/evidence/ED-REORDER-DRAG-1/pal-startup-party-720.png`
  - `docs/ops/evidence/ED-REORDER-DRAG-1/design-lab-live-reflow-2026-08-27.png`
- 结论: **rework accept（Codex，2026-08-27）**；item 内 grip、实时让位、单缝、无回跳、隐藏播报、常驻按钮
  边界与 adapter 原子动作槽均已在真实浏览器闭环。
- 未完成项: 无；三方增量补审与用户库存行复验均已完成。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: **Codex / Kimi / GLM 三方 accept（2026-08-27）**；两席对当前用户验收增量完成独立补审，
  无 counter。
- 必须返工项:
  1. **closed**：深度同值的 script / effect / row / step 重排由 domain owner 返回 canonical no-op，零 history，
     公共层播报“顺序未改变”且不进入 settling。
  2. canonical / legacy script、Sprite step、Casualty occurrence 在 undo/redo 后无法证明逻辑身份时必须
     fail-closed，不能让选择、焦点或草稿静默落到另一 occurrence。**closed**：外部 replacement reset token，
     Sprite/EnemyTeam 等重复值代表场景已断言 undo/redo token 集合失效重建。
  3. **closed**：17 个 census family 已由静态 test-title marker 绑定真实测试；七个强制代表场景覆盖
     handle → adapter → 单次 owner → undo/redo 链路。
  4. **closed（用户 2026-08-27 纠偏）**：删除 item 上下边缘各自命中的双线模型，改为冻结几何的单占位实时
     reflow；insert 一个居中缝，swap 只交换目标，松手 DOM handoff 不回跳。
  5. **closed（用户 2026-08-27 纠偏）**：Startup 独立可见排序结果行改为 visual-hidden live status。
  6. **closed（用户 2026-08-27 纠偏）**：前移/后移从 quiet 悬空 glyph 改为公共 secondary 常驻边框；default
     RepeatRow 内与 danger 删除统一 36×36px，compact 行仍由公共 density recipe 持有。
  7. **closed（用户 2026-08-27 验收 counter）**：Startup inventory 三动作不再作为独立 grid child；一个
     nowrap slot 在宽屏同排，在窄宽只整组降行，数量同时获得可见标签与公共短数值宽度。
- Accept / rework: **accept / done**。

## 用户验收

- 用户结论: 2026-08-26 已批准“所有可调整顺序的项都在前面增加手柄并支持拖拽”；实现中再次明确纠偏
  “手柄应该在 item 里面”；2026-08-27 再明确要求 VueUse/SortableJS 式实时动画让位并移除可见播报正文，
  随后指出上下移动同为按钮却没有 border；当前 build 已将移动按钮冻结为 secondary 常驻边框并补齐同组
  density。最终验收确认其余项目通过，仅 counter 初始库存动作拆行与裸数量值；当前增量修复后获 Kimi / GLM
  补审 accept，2026-08-27 用户复验该行并明确“通过”，本卡最终验收完成。
- 后续任务: 无；后续添加器交互由独立 `ED-ADD-PICKER-DIALOG-1` 承接，不扩大或重开本卡。

## 交接日志

- 2026-08-27 User: 复验 Startup 库存行可见“数量”字段及不可拆分的上移 / 下移 / 删除动作组，明确“通过”。
  三方增量 accept 与用户验收均齐，本卡转 done；无下一位 reviewer。

- 2026-08-27 Kimi 增量补审: 只读核同一增量的 reorder 侧（动作槽封组、secondary 常驻边框、36×36 同组
  同高、catalog 指纹重算通过）；签 accept。未修改实现，未代签 GLM，未标 done。Next: 用户复验后收口。

- 2026-08-27 User + Codex: 用户最终验收确认其余项目无问题，只 counter Startup inventory 宽屏动作拆行，
  并指出裸数量值缺少可见语义。Codex 完成唯一遗漏 consumer 封组、公共短数值字段采用与两处 Reorder 引起的
  Catalog Row evidence fingerprint 漂移修复；83 + 87 聚焦、typecheck、DS gate、PAL 三档几何通过。
  Next: Kimi + GLM 只读补审当前增量；随后用户只复验库存行。
- 2026-08-27 Kimi: done 前只读终审 c799cb35 + 工作树视觉修正，签 **accept**。独立直读公共状态机
  （快照冻结/同基线再校验/一次 intent/取消面零命令/occurrence token）、adapter 四族（swap/反向 stack/
  same-sibling/draft-history）、行合同不破（grip 不占 leading、68/46 不变、移动按钮同组同高）；原生
  draggable 在两前私有页清零（本人 grep）；聚焦 9 文件 113/113 复跑全绿。未修改实现，未代签 GLM。
  三方 accept 齐，待用户验收收口。
- 2026-08-27 Codex: 根据用户截图定位公共 `DsReorderMoveButton` 漏传 variant、继承 quiet transparent border，
  同时发现其硬编码 compact 导致 Project default row 的箭头 30px、删除 36px。公共 owner 改为 secondary，
  `DsRepeatRow` default density 统一 icon action 为 36px；追加 4 files / 101 tests、typecheck、DS gate、diff-check
  全绿。Chromium PAL 实测三枚按钮均 36×36px，上下 control border / 删除 danger border 常驻。Next: Kimi +
  GLM 终审须把按钮视觉合同纳入 accept/counter。

- 2026-08-27 Codex: 完成 value no-op、ambiguous undo identity 与 marker gate 返工；按用户反馈把双边缘
  indicator 重做为 Sortable 式实时 reflow，并隐藏 Startup 可见播报正文。补齐 insert/swap 几何、scroll、
  drop settling、repeat key、EnemyTeam occupant focus/undo reset；最终 27 files / 373 tests、typecheck、
  87-file DS gate、471-module build 通过。Chromium 量取提交前后 rect 连续并新增 live-reflow evidence；
  Codex 重签 accept，任务转 review，等待 Kimi + GLM 实现终审。

- 2026-08-26 Codex: 完成 17 家族 / 29 adoption / 32 路径公共 reorder 收口、11 条 evidence allowlist、
  7 个强制领域场景与公共异常矩阵；根据用户截图把 grip 从视觉外置修正为 item 内首槽。Chromium PAL 720 与
  RF-21 78-item 几何验证、typecheck、DS gate、build 通过，任务转 review；未改 schema/runtime/PAL 内容，
  未开始 ARCH-ACTOR-CONDITION-SEED-1 实现。

- 2026-08-26 GLM: 完成独立机器 census（移动按钮/draggable/order 字段全扫 + 排除类逐个证据）与逐类
  锚点直读（普通/固定槽/嵌套/反向图层/时间线/私有 drag 迁移面/B 类顺序语义/stage 暂缓），签
  premise verified + design agree（附 RD1 census→registry 机器派生 / RD2 每家族命令次数门禁 /
  RD3 重复值稳定身份与草稿不串项 / RD4 allowlist 证据化防漏网）。未发现遗漏表面或误纳入；卡表
  14 文件口径精确复现。三签齐（KR1-KR4 + RD1-RD4 互补），签字面 allowed；实现开工仍待 Startup
  资源返工收口串行放行。未修改实现，未代签 Kimi。
- 2026-08-26 Kimi: 独立直读公共层缺口（DsRepeatRow 无 reorder 合同）与两套私有拖拽（SpriteActionEditor
  ≡+native、FrameAnimationEditor 整帧 draggable），抽样八家族（普通/固定槽/嵌套同级/反向图层/临时 draft/
  效果链/商店/队伍）与排除项（resize/transfer/归属变更）；核身份证据（含 index 的 draftKey 重排即弃草稿）。
  签 premise verified + design agree（附 KR1-KR4），完成独立反证。未修改实现，未代签 GLM。
  Next: GLM 机器 census 复核 + 采用 registry/测试矩阵签字；Startup 资源返工收口前本卡不开始实现。
- 2026-08-26 User + Codex: 用户从开局队伍行指出全局排序 affordance 缺失，要求所有同类项前置拖拽手柄。
  Codex 独立 census 收口为 32 路径 / 17 家族 / 19 个可能触达 UI 文件，包含普通 / fixed-slot / nested /
  timeline 与 10 个“顺序明确但无重排入口”路径；DS 无公共 reorder owner。因此另开 cross-cutting full 卡，不把
  范围塞入 Startup。签字前未修改实现。

## 下一位 Agent 提示词

```text
请联合终审 ED-REORDER-DRAG-1「编辑器有序集合拖拽手柄统一」的实现与验证。

任务卡：docs/ops/tasks/ED-REORDER-DRAG-1-editor-sortable-collection-drag-handles.md
当前状态：review。Codex 已完成 build、自测和功能视觉验证并签自审 accept；Kimi、GLM done 前 accept 均 pending。
你是独立实现 reviewer：只读实现、测试、截图与任务卡，把自己的 `accept` 或 `counter + 返工项` 写回
“进入 done 前:审查签字”及 Review 段。不得修改实现文件、不得代签另一席、不得自行标记 done。

先读：AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、docs/ops/board.md、本任务卡、
docs/phase2/editor/editor-design-system-v1.md 的 DS-C.4d、reorder.tsx/reorder.css、reorder-adoption.json、
reorder-allowlist.json、reorder.test.tsx、reorder-adoption.test.ts，以及三张 evidence 截图（含 2026-08-27
live-reflow）。不要重开已完成旧卡，
ARCH-ACTOR-CONDITION-SEED-1 不在本卡实现范围。

共同核验：
1. 公共状态机：Pointer Events/capture/6px 阈值、scope+revision、最近 scroll owner/modal boundary、keyboard/
   live/focus，以及所有 cancel 路径是否零命令；确认 `reorder.test.tsx` 的 22 项覆盖实时 insert/swap 几何、
   scroll 补偿、成功 handoff 无回跳、repeat key 与 canonical no-op，而非只测最终数组。
2. 用户硬要求：grip 必须在 item 可见边界与背景内。核公共 DOM/CSS、PAL 720 截图与 RF-21；不得退回截图所示
   的 item 外 rail，不得占 Catalog media leading 或嵌入目录按钮。点击精确移动仍须保留同 owner；前移/后移
   必须是 secondary 常驻边框而非 quiet 悬空 glyph，default RepeatRow 中与同组 danger 删除同为 36×36px，
   compact 行尺寸只能由公共 density recipe 持有。
3. 领域语义：抽查 Startup、重复 Shop、EnemyTeam 空槽、nested script、反向 LayerStack、SpriteAction
   `loopFrom`+资源 transfer、FrameAnimation active/anchor+history；一次完成恰一条 command/draft history，
   value-level no-op 为零，undo/redo 对称，重复 occurrence 与草稿不串项。
4. 机器门禁：17 families / 29 adoptions / 32 paths / 19 owner files 可由 registry 复算；11 条 allowlist 七字段、
   fingerprint 唯一且新/陈旧 DnD、私有 move/grip、alias/spread 均 fail-closed；verification 相对路径真实存在。
5. 边界：没有 schema/runtime/save/migration/PAL 内容变化；空间移动、resize、pan、归属、派生排序和 frame
   transfer 未被误纳入 reorder；旧 Sprite/Frame 排序 native DnD 已移除但合法资源 transfer 保留。

Kimi 重点：公共 API/state machine、身份/revision、scroll/overlay/focus/ARIA、七个 adapter 的语义与窄宽截图。
GLM 重点：registry/allowlist/gate 的可证伪性、测试矩阵/命令次数、重复值/no-op、文档和证据闭包。

可复用验证：公共 22 passed、最终受影响组 27 files / 373 passed、审查期 editor 全量 161 files /
1246 passed、typecheck、DS gate（87 files / 3 evidence exceptions）、build（471 modules）均已记录；新增
`design-lab-live-reflow-2026-08-27.png` 与 0/40/220ms rect 证据。除非发现会改变结论的新风险，不重复跑耗时全量。
请分别签 `accept`，或写 `counter` 的文件:行、复现与最小返工条件；任一 counter 都留在 review/rework。
```

## 下一位 Agent 提示词（2026-08-27 用户验收增量补审）

```text
请联合只读补审 ED-PROJECT-STARTUP-IA-1 + ED-REORDER-DRAG-1 的用户验收增量。

任务卡：
- docs/ops/tasks/ED-PROJECT-STARTUP-IA-1-project-entry-startup-workbench.md
- docs/ops/tasks/ED-REORDER-DRAG-1-editor-sortable-collection-drag-handles.md
当前状态：review。上一 candidate 的 Kimi / GLM accept 因用户可见返工失效；Codex 已 rework accept。
不得修改实现、不得代签另一席、不得标记 done。

只需审当前增量，不重审已通过旧范围：
1. ProjectWorkbenchTab 库存数量是否使用 DsFieldMeasure(short-number) + 可见“数量”标签，label/input 正确关联，
   Enter + blur 仍只提交一条命令。
2. inventory row 是否只有 4 个 direct child，前移/后移/删除位于一个 project-inventory-actions 原子槽；
   1280px 同行，900/720px 只允许整组降行，组内不拆散、不溢出，按钮仍为 36×36。
3. 全库 5 个 DsRepeatRow census 是否证明 inventory 是唯一未封组多动作面，不应扩大公共 API。
4. catalog-row-content-adoption.json 两个 fingerprint 是否精确绑定当前 CutsceneTab / SpriteActionEditor 调用点，
   没有用 allowlist 绕过门禁。

现有证据：2 files / 83 tests、含 catalog gate 3 files / 87 tests、typecheck、DS gate（87 files / 3 exceptions）、
git diff-check 通过；PAL 1280/900/720 几何 top spread=0、scrollWidth=clientWidth、console 0 error/warning。

请分别把 `accept` 或 `counter + 文件:行 + 最小返工条件` 写回两卡当前 done 签字 / Review 段。
双 accept 后只等待用户复验这一行，不要求用户重验其余已通过项目。
```

## 下一位 Agent 提示词（2026-08-27 收口）

无下一位 Agent 提示词；Codex / Kimi / GLM 三方审查与用户验收均已完成。后续添加器交互按独立
`ED-ADD-PICKER-DIALOG-1` 推进，不重开本卡。
