# ED-PROJECT-STARTUP-IA-1 - 入口与开局 / 全局资源与启动工作台收口

Status: done（2026-08-27 三方增量 accept + 用户库存行复验通过，整卡收口）
Phase: phase2
Capability: X7
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: `codex/ed-project-startup-ia-1`

## 目标

在不重开 canonical 入口模型的前提下，把“入口与开局”“全局资源与启动”和项目概览中的入口摘要整理成清晰、紧凑、
可撤销的作者工作流：有序队伍用列表管理，库存/世界资源使用标准重复行，全局音乐与音效都可原位试听，所有
增删、输入、帮助、响应式与滚动行为遵守统一设计系统。

## 范围

- 范围内:
  - “入口与开局”：默认入口标识、入口列表操作、队伍顺序、库存、世界资源和现有 HP/MP 覆盖的 IA/控件收口。
  - 队伍改为“有序成员列表 + 可搜索添加器”，不再铺满候选 checkbox；上移/下移/移除保持稳定顺序。
  - 队伍成员与该入口的当前 HP/MP 稀疏覆盖在同一成员行编辑；桌面数值字段保持紧凑，窄容器再分行。
    移出成员时在同一可撤销命令中删除其已失效的 `seedStats` 覆盖，不保留运行时不会消费的孤立入口数据。
  - “加入队伍 / 添加道具”composer 迁入公共 `DsInlineComposer` recipe；选择与尾部动作由一个 density owner
    决定，同行必须同尺寸同高，禁止业务页给其中一个按钮单独使用 `compact`。静态/recipe 门禁必须含
    mixed-density 负例。
  - “初始世界资源”普通流不再让作者发明内部 key；从项目内真实
    `items[].use.effects[].drawFromResourcePool.resource` 引用动态派生候选，主信息显示消费该资源的物品名称，
    稳定 key 只作次级信息。排除保留键和当前入口已配置项；无候选时只显示可理解的空态，不显示无意义输入框。
  - 库存、资源值复用标准重复行与标准新增/删除动作，窄宽度不折断动作。载入时已有但当前无消费者的资源 key
    仍作为 repair 行显式保留、可清理，不静默删除。
  - “全局资源与启动”：按 `ASSET_ROLES` 与分组源动态渲染，音乐/音效原位试听与“打开资源页”分离。
  - 项目概览删除写死数量和重复流程编辑入口；启动链改为三张直观摘要卡：默认开局、标题菜单、启动资源。
    默认开局直接展示入口名称、队员姓名、金钱、初始物品与开场视频状态；标题菜单展示可选故事数量/名称；
    启动资源展示已配置/待配置/配置错误以及对应的可读角色名称。`s000`、`assets.roles`、`?entry` 等机器标识
    不常驻概览。
  - 所有连续输入复用 `ED-FIELD-COMMIT-1` 的字段提交合同。
- 范围外:
  - 不修改 `StartWorld`、`EntryPoint`、`AssetRole` schema；角色等级/装备/属性来源由 `ARCH-ENTRY-ACTOR-SEED-1` 决策。
  - 不改变标题菜单、introVideo、`?entry`、`?menu`、`?scene` 或运行时启动顺序。
  - 不重做音乐/音效工作台；仅复用现有项目资源解析器和单一试听通道。
- 明确不做:
  - 不恢复入口继承、默认开局模板、synthetic entry 或任何 fallback。
  - 不新增页面局部保存按钮，不让试听写入 `WorldState.audio.currentMusic`。
  - 不新增静态资源枚举，也不把自由世界资源键伪装成预制项；普通流的选项必须来自项目实际消费引用。
  - 不在本卡新增 `ResourceDef` / 资源显示名 registry，不允许设置专用保留键 `collectValue`；若未来需要正式资源
    定义表、单位或跨系统显示名，另开高风险 ARCH 卡。

## 前提真值门

### 一句话行为 / 工程前提

- 当前 `entryPoints` 已是唯一完整入口表，`defaultEntryId` 只选择默认入口；本卡只改作者交互与信息层级，不改变这条
  数据真值，也不把项目设置页做成第二套运行时流程编辑器。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：这是二阶段项目作者工具；原版只提供内容参考，不定义本工作台 IA。 | `docs/phase2/READ-FIRST.md:1` |
| 第一阶段 | N/A：一阶段没有该 manifest 作者工作台；本卡不改变游戏内标题菜单形态。 | `docs/phase2/READ-FIRST.md:32` |
| 当前二阶段 | `EntryPoint.startWorld` 必填且完整，`defaultEntryId` 只选择；角色初始技能已归 `ActorDef.initialMagic`，入口只持有队伍、当前 HP/MP 稀疏覆盖、物品、资源和金钱。当前概览仍直接显示 `s000`、`assets.roles`、写死“编辑 8 项设置”，并用“启动分支”重复前两行。 | `packages/content/src/character.ts:52-77,89-96`；`packages/editor/src/ui/ProjectWorkbenchTab.tsx:1587-1631`；`docs/ops/archive/tasks/done/ARCH-ENTRY-ACTOR-SEED-1-entry-actor-initial-state.md:163-167` |
| 本任务目标 | 不改 schema/启动语义，只把现有字段与资源角色组织成统一、可理解、可试听、可撤销的工作台；项目概览只显示普通作者能直接判断的启动信息。 | 用户 2026-08-24、2026-08-25 拍板；本卡验收条件 |

### 反证与替代解释

- 最强替代解释: 当前大块启动链能帮助新作者理解运行时分支，删除会降低可发现性；候选 checkbox 对少量角色更快。
- 什么观察会推翻当前前提: 用户测试显示结构化摘要/帮助无法回答启动路径，或搜索添加器对小项目明显增加操作步数。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: canonical 启动语义已由 `ARCH-ENTRYPOINT-CANONICAL-1` 收口，不在本卡重判。
  - 原版 / 第一阶段理解: 无对应作者 UI，不以原版数据布局替代产品设计。
  - extractor / 地图 / 数据解码: 不适用；本卡不改 PAL 生成数据。
  - audit / test model: 必须以真实 12 个资源角色、角色/技能/物品数据和窄宽度浏览器验证，不能只用空 fixture。

### 用户可见偏离

- 是否主动偏离已核真值: yes
- `before -> after` 一句话: 分散 checkbox、raw 按钮、重复流程说明、跳转预览和 `s000/assets.roles` 机器摘要 ->
  有序添加/重复行/原位试听，以及“默认开局/标题菜单/启动资源”三张可读摘要卡；验收返工补充为
  “队伍顺序”与“开局当前状态”重复展示同一角色、宽数值框占据整行且移出队伍后可能遗留无效覆盖 ->
  每个队员只出现一次并在成员行内编辑紧凑的当前 HP/MP，移出时原子清理该角色覆盖；资源交互返工补充为
  “作者输入 `alchemyEnergy` 一类内部 key 才能添加初始世界资源” -> “从项目内真实消费引用选择可读资源；无
  候选时显示明确空态，既有未知 key 只进入 repair 流”；库存空态验收返工补充为“无动作的‘无初始道具’文案
  出现在新增器下方，空态与有数据态的信息区域发生跳变” -> “标题右侧始终显示库存种类数，条目固定在新增器
  上方，0 项时不再重复说明空库存”。
- 代表场景: 编辑默认入口队伍与初始库存；在全局资源中试听默认战斗音乐；项目概览跳到对应唯一作者页。
- 用户裁决: 2026-08-24 用户要求将入口、开局、全局资源与启动缺陷系统收口；2026-08-25 用户明确指出
  `s000`、`assets.roles` 等普通人无法理解，要求重做摘要并展示重要、直观的信息；2026-08-26 用户确认
  队伍与当前 HP/MP 应合并，并批准按成员行方案开始返工；同日用户再次指出“初始世界资源”的内部 key 输入
  没有用户能理解，要求改成选项或其他更简单的交互。

### 2026-08-26 验收返工前提补充

- `StartWorld.party` 持有开局成员顺序，`seedStats` 只持有同一入口下角色当前 HP/MP 的稀疏覆盖；二者数据
  ownership 不合并，但同属“开局成员”作者任务，可以在一个成员行中编辑。
- `buildWorld()` 只在遍历 `startWorld.party` 时读取同 id 的 `seedStats`；非队伍角色的覆盖不会进入运行时世界。
- 当前编辑器用 `party + Object.keys(seedStats)` 的并集生成独立“开局当前状态”面板，而 `removeParty()` 只改
  `party`，因此移出成员后会留下可见但运行时不消费的孤立覆盖。
- 现有 DS-F.4 已明确要求同行 input/select/尾部文字动作使用同一尺寸档；token 也明确 default `36px`、compact
  `30px`。但三个 composer 都是 default `DsSelectField`/`DsTextInput` 搭配 `size="compact"` 的 `DsButton`，
  直接形成 36px/30px 混用。当前 boundary 只分别检查两档 primitive 存在，adoption matrix 只登记 owner，均未
  检查组合行的一致 density，因此“adopted”状态没有拦住这次违规。
- 直接证据: `packages/content/src/character.ts:53-60,226-245`；
  `packages/editor/src/ui/ProjectWorkbenchTab.tsx:598-647,681-765,731-757,835-869,915-951,955-1010`；
  `docs/phase2/specs/editor-design-system.md:181-183`；`packages/editor/src/ui/design-system/tokens.css:47-48`；
  `packages/editor/src/ui/design-system/boundary.test.ts:34-56`。
- 最强替代解释: 保留孤立覆盖可让作者稍后重新加入同一角色时恢复值；schema/validator 也尚未要求
  `seedStats` key 必须属于 party，因此已有外部 canonical 输入不能被新 IA 静默隐藏。新“移出成员”动作按用户裁决
  清理本角色覆盖，并由 undo 提供恢复；对打开时已经存在的孤立覆盖，界面必须显示警告/清理行并保留明确修复路径。
- 可证伪观察: 若存在正式入口流程需要为未入队角色预设当前 HP/MP，或 runtime/reserve 会消费这些覆盖，则必须
  停线并另开 schema/ownership 设计；当前源码未发现该消费链。

### 2026-08-26 初始世界资源交互返工前提补充

- `StartWorld.resources` / `WorldState.resources` 当前只是没有显示名、单位或定义 registry 的
  `Record<string, number>`；validator 仅校验 key 非空、非保留键和 value 为非负安全整数，无法据此生成普通用户
  可理解的静态选项。
- 当前唯一通用消费入口是物品效果 `drawFromResourcePool.resource`，其资源字段同样是字符串；因此本卡可在不改
  schema/runtime 的前提下，从项目实际物品效果反向派生“哪些资源需要入口初值”。主标签使用消费物品的可读名称，
  多个物品共用同一 key 时合并成一个候选，稳定 key 降为次级信息。
- 当前 `demo`、`e2e-own`、`pal` 三个 manifest 的 `startWorld.resources` 均为空；PAL 唯一已用资源键是
  `collectValue`，由专用 `WorldState.collectValue` 持有，且已被 `StartWorld.resources` validator 明确排除。
  因此把现有 key 集合直接做成下拉框会得到空的伪枚举，也不能把 `collectValue` 错当成普通世界资源。
- 普通流取消任意 key 新建：候选来自项目内实际 `drawFromResourcePool` 引用，排除 `collectValue` 与当前入口已配置
  key；有候选时使用可搜索选项并以 `0` 创建初值，无候选时显示“本项目没有需要为入口设置初值的自定义资源”。
  载入时已有但当前无消费者的 key 保留为“未被使用的资源”repair 行，可修改数值或清理，不静默丢失。
- 直接证据: `packages/content/src/character.ts:36-40,52-60`；`packages/content/src/item.ts:153-160,797-812`；
  `packages/content/src/validate.ts:70-84,882-899`；
  `packages/editor/src/ui/ProjectWorkbenchTab.tsx:574,668-673,975-1051`；
  `packages/editor/src/ui/ItemUseEffectEditor.tsx:789-829`；`projects/pal/content/items.json:9407-9424`。
- 最强替代解释: 开放 key 是高级作者扩展能力，保留自由输入最灵活。该能力的“定义 owner”实际不在入口初值页；
  入口页只应为已经被系统消费的资源赋初值。继续让普通流发明裸 key 会产生没有消费者、名称和单位的悬空数据。
  若未来确需先定义后消费，应另开 `ResourceDef` registry 卡，而不是在入口页保留隐式定义入口。
- 可证伪观察: 若发现除 `drawFromResourcePool` 外已有 canonical 的世界资源定义/消费 registry，或真实工程需要在
  尚无消费者时先定义资源且该入口由 runtime/tooling 正式消费，则本派生候选不完整，必须停线扩展 census 或另开
  schema 卡；当前全库一手证据未发现该 owner。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `ARCH-ENTRYPOINT-CANONICAL-1` 已完成且不重开：入口完整独立，无继承/伪入口/fallback。
  - 完整对象动作只有一个 owner；全局保存是唯一写盘入口；业务页必须消费设计系统。
  - 依赖 `ED-FIELD-COMMIT-1` 的连续字段合同和 `ED-DS-3` 冻结的重复行/动作 primitive。
- 代码锚点(`file:line`):
  - `packages/content/src/character.ts:52`
  - `packages/content/src/asset.ts:33`
  - `packages/editor/src/ui/ProjectWorkbenchTab.tsx:446`（资源角色绑定）
  - `packages/editor/src/ui/ProjectWorkbenchTab.tsx:693`（队伍）
  - `packages/editor/src/ui/ProjectWorkbenchTab.tsx:756`（库存/技能/资源/HP-MP）
  - `packages/editor/src/ui/ProjectWorkbenchTab.tsx:1083`（入口单一 commit）
  - `packages/editor/src/ui/ProjectWorkbenchTab.tsx:1430`（全局资源与启动）
  - `packages/editor/src/ui/ProjectWorkbenchTab.tsx:1639`（项目概览）
- 已知坑 / 审计文档:
  - `docs/ops/archive/tasks/done/ARCH-ENTRYPOINT-CANONICAL-1-explicit-startup-entry-model.md`
  - `docs/phase2/archive/designs/editor-design.md:210`
  - `docs/phase2/specs/editor-design-system.md:340`
- 不得重新引入:
  - 写死资源角色数量、raw `btn/tool`、页面私有试听器、入口继承、第二套保存、逐字符全局命令。
- 相关测试:
  - `packages/editor/src/ui/ProjectWorkbenchTab.test.tsx`
  - 入口 command/project IO/validator 既有测试；音频工作台单通道测试。

## 验收条件

- 功能:
  - 默认入口只是入口列表中的真实项和明确徽标；重排后仍由稳定 ID 指向同一入口。
  - 新建、复制、设默认、删除保护、undo/redo、保存重开保持 canonical 入口语义。
  - 队伍为有序列表 + 可搜索添加器；上移、下移、移除和键盘操作闭环，不显示候选 checkbox 墙。
  - 每个已入队角色只在一个成员行出现；当前 HP/MP 的留空继承、`0`、单字段覆盖均保持稀疏语义，桌面数值列
    不随卡片无限拉伸，窄容器按成员信息/数值/动作的稳定顺序分行。
  - 移出带覆盖的成员只产生一条历史命令，同时删除 party 项和该 actor 的 seed；undo 一次同时恢复二者，redo
    同时清除，再加入时继承 ActorDef 基线。其他成员和既有 orphan seed 不受影响，空 seed map 归一为 undefined。
  - 已有非队伍 seed 只在存在时显示“未入队状态覆盖”及单项清理动作；缺失 actor 仍可见、可清理，不静默隐藏。
  - 加入队伍、添加道具，以及存在真实资源候选时的添加资源 composer，其同行选择与按钮在 default/compact
    任一合法 density 下必须同高；统一采用公共 `DsInlineComposer`，不能通过页面局部 size 补丁达成。自动测试
    必须证明 mixed-density fixture 会失败；新增 recipe 按 DS-G.4 升 minor，并同步文档、代码常量与 CSS token 版本。
  - 初始世界资源不得出现任意 key 文本框或 `alchemyEnergy` 一类示例。候选按实际
    `drawFromResourcePool.resource` 引用动态派生、按 key 去重，排除 `collectValue` 和已配置项；选项主标签必须让
    作者看见消费物品名称，内部 key 只作次级说明。零候选显示明确空态且不渲染 disabled composer；已有 orphan /
    unknown key round-trip 不丢失，显示“未被使用”并可单步清理。
  - 库存、资源使用同一重复行合同；删除动作不换行，空态与新增路径清楚。角色初始技能只由
    `ActorDef.initialMagic` 持有，入口页不显示或保存技能快照。初始道具标题右侧显示动态种类数标签；已有条目
    始终位于新增器上方，0 项时不在新增器下方渲染重复的无动作占位文案。
  - 音乐和音效都能原位试听；试听与打开资源页是两个明确动作；切曲停止前一资源。
  - 全局资源角色及分组由源码常量动态生成，界面无“编辑 8 项”等陈旧数字。
  - 项目概览只保留三张摘要卡与两个唯一导航 owner：
    - 默认开局：入口显示名为主标题；队伍显示解析后的角色姓名，并展示金钱、初始物品种类/总数、起始位置和
      开场视频是否已配置；场景引用损坏时显示可操作的“起始位置需要修复”，而不是裸 scene ID。
    - 标题菜单：显示可选故事数量；少量入口直接列显示名，长列表给数量与首项摘要，不显示入口稳定 ID。
    - 启动资源：显示已配置/待配置数量；类型错误或悬空绑定单列“需要处理”，并显示可读资源角色名称。未配置的
      可选角色不得伪装成错误；详情进入资源设置页。
  - 概览不得常驻 `s000`、`assets.roles`、`manifest.*`、`?entry/?menu/?scene`、写死“8 项”或重复“启动分支”。
    技术 ID 只在详情/帮助中按需披露。
- 测试:
  - schema closure 测试证明 `ASSET_ROLES` 每项恰好进入一个可见分组，数量变化无需改文案。
  - 入口全操作、队伍顺序、重复行、原位试听、焦点与单步 undo 覆盖。
  - 成员行专项覆盖继承/`0`/单字段 seed、移出原子清理、其他 key 保留、undo/redo、再加入继承、orphan repair、
    聚焦草稿后移出、Enter + blur 单提交、对象切换与 command resync。
  - DS 专项覆盖公共 composer density 正例、default/compact 两档几何，以及“default control + compact action”
    负例；ProjectWorkbench 三个 composer 只消费公共 owner，采用矩阵不得只凭 primitive 名称判为 adopted。
  - 资源选择专项覆盖 0 / 1 / 多候选、多个物品共用同一 key 去重、跨入口复用、`collectValue` 排除、当前入口已配置
    项排除、选择后以 `0` 新建、改值/删除单步 undo/redo、已有 orphan/unknown key round-trip 与清理、长物品名和
    稳定 key、键盘选择；旧的任意 key 输入与 IME 新建用例必须删除或改写，不能继续保护已废弃交互。
  - 连续字段命令次数遵守 `ED-FIELD-COMMIT-1`。
  - 概览专项测试覆盖正常/缺损默认入口、单/多入口、资源全齐/缺失、长名称；断言机器 token 和写死数量不出现，
    三张卡及两个导航动作读取 live manifest，入口/资源变化后摘要同步刷新。
- 文档:
  - 更新 `docs/phase2/archive/designs/editor-design.md:210`，删除“八项/四组”等过期描述并记录实际数据驱动合同。
- 视觉 / 手工验证:
  - PAL 真实工程下 1280、900、720px 检查两页与概览；无横向溢出、按钮折行、行高不齐、不可滚动或 popup 裁切。
  - 以至少一个含自定义 `drawFromResourcePool` 的本地 fixture 验证资源选项可读标签、长名称、搜索/键盘、popup 与
    单步撤销；PAL 零候选态不得残留不可用输入框或让用户猜内部 key。
- E2E 用例登记: N/A（功能性界面在 build 期最小浏览器验证）。

## 推进签字

### 当前进入 build 前签字（2026-08-25 设计刷新）

- Codex:
  - premise: **verified（2026-08-25）**。`character.ts:52-77,89-96` 与 ARCH 卡三方 review accept 证明入口
    ownership 已冻结；`ProjectWorkbenchTab.tsx:1587-1631` 直接证明裸 `s000`、`assets.roles`、写死数量和重复启动分支。
  - design: **agree（2026-08-25）**。概览改为默认开局/标题菜单/启动资源三张摘要卡；只消费现有 manifest、
    actor/item/asset 数据，不增加 schema，不复制入口或资源编辑器。
- Kimi:
  - premise: **verified（2026-08-25 按刷新后合同独立重签，非沿用 08-24 旧签）**。当前概览直读
    `ProjectWorkbenchTab.tsx:1586-1631`：四行 project-flow-mini 常驻 `<code>` 场景 id 与
    `assets.roles`、写死“编辑 8 项设置”（实际 `ASSET_ROLES` 12 项，asset.ts:33-47）、重复
    “启动分支”行——用户指认全部属实。三张摘要卡的可派生性逐字段核过 live 来源：入口名/队伍/
    金钱/物品/开场视频 ← manifest entryPoints（canonical 模型 ARCH 卡已收口）；角色/物品显示名
    ← actors/items + locale `lookupText`（既有先例 :703）；资源已配置/待配置/类型错误 ←
    validateManifestAssetConfig + 既有 project diagnostics；起始位置损坏 ← validateManifestEntryPoints
    的 missing-entry-point-scene。单/多入口、损坏入口、长名称、窄宽度均可用现有 DS primitive 表达。
    ARCH-ENTRY-ACTOR-SEED-1 ownership 已冻结并实现（0558819e 本人已 accept），DS-3/FIELD-COMMIT-1
    公共合同均已 done——KP3 的排期前置已满足。
  - design: **agree（2026-08-25，附 KI1-KI2；KP1 与 GLM GP1-GP2 继续有效）**：
    - **KI1（资源角色展示名单一来源）**：启动资源卡的可读角色名必须由 typed registry 从
      `ASSET_ROLES` 派生（label/kind/分组/必需性同源），页面不得另写 12 项文案表——否则数量
      变化又要手改文案（GP1 的结构派生延伸到 label 层）。
    - **KI2（起始位置的健康态表达）**：当前 schema 场景无人类可读名；健康态不得常驻裸
      `s000`——建议只显示“已就绪/需修复”状态与配置状态，scene id 只进详情/DsHelpTip；
      损坏态显示可操作的“起始位置需要修复”并带唯一导航（卡面验收同向，此处把健康态也锁死）。
- GLM:
  - premise: **verified（2026-08-25，本人一手读码 + 派生性逐项核验，非代理）**：
    1. **现状实锤**：`ProjectWorkbenchTab:1587-1631` 直读确认——`:1587` "启动摘要"标题
       下 `:1620` 裸 `<code>assets.roles</code>`、`:1622` 写死"编辑 8 项设置"（ASSET_ROLES
       实为 12 项，我 08-24 已独立枚举）、`:1626-1627` "启动分支 / 直接启动入口 / 标题
       菜单入口"重复描述——卡文 before 全部属实。
    2. **三卡字段 live canonical 可派生性逐项核验**：
       - **默认开局卡**：入口显示名=entryPoint.label（manifest 现有）；角色姓名=
         `lookupText(actor.name, locale)`（locale.ts 现有导出）；金钱/物品=StartWorld
         现有；起始位置=entry.scene 可解析为场景名（scenes 表现有）——**全部可从
         live state 派生，零新增 schema**；scene 损坏检测依据 validate.ts:206-207
         已有 scene 存在性校验（编辑器侧需引用同一 scenes 集合做 live 判定）。
       - **标题菜单卡**：可选故事数=entryPoints.length（live）；少量入口直接列/
         长列表摘要=纯派生逻辑。
       - **启动资源卡**：已配置/待配置=遍历 ASSET_ROLES 对照 manifest.assets.roles
         （live）；可读角色名=ProjectWorkbenchTab 已有 role→中文 label 映射
         （'默认战斗音乐'等，非新增）；类型错误/悬空=validate-refs 现有域。
    3. **ARCH-SEED 冻结消费确认**：卡文"入口与开局"节只编辑 party/money/inventory/
       resources/seedStats——**全部在冻结合同允许域**；无等级/装备/属性/技能入口字段。
  - design: **agree（2026-08-25，附 GPS1-GPS2，不阻塞准入；KP1-KP3/GP1-GP2 历史钉
    中未失效者继续携带）**：
    - **GPS1（scene 损坏判定的单一真值源）**：概览"起始位置需要修复"的判定必须消费
      与 validate.ts:206-207 同一 scenes 集合（live manifest 的 scenes/index 或
      project-diagnostics 现有 issue collector），不得在概览组件里自写第二份场景
      存在性检查——两份判定会漂移。
    - **GPS2（资源"待配置"与"类型错误"不得混淆）**：启动资源卡的三态（已配置/待配置/
      需要处理）中，**未配置的可选角色是中性状态不是错误**（卡文已含）；测试须含
      "可选角色空 + 必选角色类型错"的组合用例，断言只有后者进"需要处理"。
  - 独立反证审查:
    - 审查者: GLM（2026-08-25，见上）。
    - 独立证据锚点: ProjectWorkbenchTab:1587-1631 / locale.ts lookupText /
      validate.ts:206-207 / asset.ts ASSET_ROLES:33-46 / ProjectWorkbenchTab
      role→label 映射 / ARCH-SEED 冻结合同条款 2-3。
    - 可证伪观察: ①若概览组件自写场景存在性判定与 validator 漂移（GPS1 断言同一
      输入源）；②若可选空角色被标为错误（GPS2 组合用例拦截）；③若任一摘要字段
      实现时发现需要新增 manifest/entry 字段才能派生——推翻"零 schema"承诺即停线。
- counter / 分歧处理: N/A
- 缺签豁免: N/A
- build 准入结论: **allowed（2026-08-25，Codex + Kimi（KI1-KI2）+ GLM（GPS1-GPS2）按刷新后合同
  三签齐；KP1/GP1-GP2 中未失效钉继续携带；ED-DS-3 与 ED-FIELD-COMMIT-1 公共合同已 done，
  ARCH-ENTRY-ACTOR-SEED-1 ownership 已冻结并实现）。**

### 历史 build 前设计签字（2026-08-24；已因本次设计刷新失效）

- Codex:
  - premise: verified（`character.ts:73-96` 证明 canonical 入口模型；`ProjectWorkbenchTab.tsx:693-1017` 与 `:1430-1694` 证明现有交互/旧控件/写死摘要）
  - design: agree（业务 IA 与 schema 扩展拆卡，复用字段提交和设计系统 primitive）
- Kimi:
  - premise: verified（2026-08-24 独立直读，非代理）。canonical 入口模型现状属实：
    `character.ts:89-100` 必填非空 entryPoints + defaultEntryId 纯选择器（ARCH-ENTRYPOINT-CANONICAL-1
    已收口，本卡不重开）；当前页遗留属实——`ProjectWorkbenchTab.tsx:697-752` 队伍区 raw
    `<button className="btn">` 上移/下移/移出 + 原生 checkbox 候选墙；`:1643-1647` 项目名 raw
    `<input className="in">` 逐字符 dispatch；`:1686` 写死“编辑 8 项设置”而 `asset.ts:33`
    `ASSET_ROLES` 实为 12 项（本人枚举）；`:581` 音乐“前往预览”跳转代替原位试听。
    前提“只改作者 IA、不改数据真值”成立。
  - design: agree（2026-08-24，附 KP1-KP3，不阻塞准入）:
    - **KP1（试听复用 AUDIO 卡通道）**：原位试听必须消费 ED-AUDIO-WORKBENCH-1 交付的
      preview transport/factory（midi-preview.ts/audio-preview.ts），不得在项目页新写第三套
      音频播放路径；“切曲停止前一资源”由单一 preview owner 保证。
    - **KP2（有序队伍 + 可搜索添加器的键盘闭环）**：上移/下移/移除/添加全部键盘可达且有
      aria 状态反馈；重复行的删除动作窄容器换行规则遵循 DS 合同，不页面自定。
    - **KP3（构建顺序）**：本卡消费 `ED-FIELD-COMMIT-1` 字段合同与 `ED-DS-3` 的重复行/
      动作 primitive；在那两卡公共合同落地前，本卡 build 不得先写私有替代控件（依赖
      顺序即卡内“建议实施顺序”的延伸）。
  - 边界确认：卡面“明确不做”已覆盖入口继承/伪入口/fallback/写死数量/页面保存/逐字符命令；
    角色 seed schema（等级/装备/属性/初始技能所有权）完整留在 ARCH-ENTRY-ACTOR-SEED-1，
    本卡仅做现有 HP/MP 覆盖的 IA 收口，未偷塞 schema 扩展。
- GLM:
  - premise: **verified（2026-08-24，本人一手读码 + 独立枚举，非代理；与 Kimi 互证）**：
    1. **canonical 入口模型**：character.ts:89-100 必填非空 entryPoints + defaultEntryId
       纯选择器——ARCH-ENTRYPOINT-CANONICAL-1 产物完好，本卡不重开（独立确认）。
    2. **ASSET_ROLES 独立枚举 = 12 项**（asset.ts:33-46 本人数出：audio 9 + video 2 +
       visual 1）；`:1686` 写死"编辑 8 项设置"与 12 不符——陈旧数字实锤。
    3. **raw 控件残留**：ProjectWorkbenchTab :806/:818/:878 三处 `className="btn"`
       （队伍上移/下移/移出区）；项目名 raw input 逐字符 dispatch（FIELD-COMMIT 卡
       已核）；:581 音乐"前往预览"跳转代替原位试听。
    4. **试听通道可复用**：midi-preview.ts 的 MidiPreviewTransport 接口 +
       editor audio-preview.ts 在位（AUDIO 卡产物）——KP1 复用方案可行。
    5. **入口单一 commit**：:1083-1085 SetStartupEntriesCommand 原子提交在位
       （ARCH 卡产物），本卡 IA 改造不改此边界。
  - design: **agree（2026-08-24，附 GP1-GP2，不阻塞准入；KP1-KP3 全部同意并互补）**：
    - **GP1（动态分组闭合测试的数据面）**：schema closure 测试除"每项恰好一个分组"外，
      须断言 **分组定义由 ASSET_ROLES 结构派生（kind 前缀）而非第二份手写分组表**——
      12 项当前恰好 audio.*/video.*/visual.* 三前缀，若未来新增第四类前缀分组测试
      应自动红，而不是静默落入"其他"。
    - **GP2（试听单通道断言）**：原位试听与"打开资源页"的分离须有测试证明项目页
      preview 与资源页 preview **不共存**（项目页试听中切到资源页则前者停止）——
      单一 preview owner 的机检形态；另试听不写 WorldState.audio.currentMusic 的
      断言（卡文"明确不做"的测试化）。
  - 独立反证：若 ASSET_ROLES 出现无法归 kind 的角色名（当前 12 项均有 audio/video/
    visual 前缀），GP1 分组测试红即停线重估分组规则。
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: Kimi（2026-08-24）
  - 独立证据锚点: `packages/content/src/character.ts:89-100`（canonical 入口模型）；
    `packages/content/src/asset.ts:33-47`（ASSET_ROLES 12 项枚举）；
    `packages/editor/src/ui/ProjectWorkbenchTab.tsx:581,697-752,1643-1647,1686`
    （跳转预览/原始控件/逐字符命令/写死数量）；`packages/editor/src/ui/AudioAssetWorkbench.tsx:600-697`
    与 `packages/reforge/src/audio/midi-preview.ts:20-32`（可复用的试听通道与 transport 接口）。
  - 可证伪观察: 若 `ASSET_ROLES` 存在无法按 kind 分组的异常角色，动态分组前提动摇——12 项枚举
    全部落在 audio/video/visual 三类；若 ED-FIELD-COMMIT-1/ED-DS-3 冻结的 primitive 无法表达
    有序队伍或重复行，本卡须退回重签——两卡设计均已含对应合同且三签齐；若某启动链说明被删后
    作者无法理解 `?entry`/`?menu`/`?scene` 优先级，摘要+DsHelpTip 方案不足——用户裁决条款已覆盖。
- counter / 分歧处理: N/A
- 缺签豁免: N/A
- build 准入结论: blocked——Kimi（KP1-KP3）+ GLM（GP1-GP2）签字齐；**build 排期硬前置：ED-DS-3 与 ED-FIELD-COMMIT-1 公共合同实际落地后**（两卡本席已签 premise/design，见各自任务卡）

### 2026-08-26 验收返工 build 准入签字

- Codex:
  - premise: **verified（2026-08-26）**。`character.ts:237-245` 直接证明 `buildWorld()` 只为 party 实例读取
    同 id 的 `seedStats`；`ProjectWorkbenchTab.tsx:601,618-647,681-765,955-1010` 证明当前独立面板使用
    party/seed key 并集，移出队伍只改 party，确会留下 runtime 不消费的孤立覆盖。
  - design: **agree（2026-08-26）**。不改 schema/运行时/最大值 ownership；每个队员行内编辑当前 HP/MP，
    留空继续继承；移出时同一 command 清理该 actor seed，undo/redo 同步恢复；桌面 composer 动作 intrinsic、
    数值列有界，窄容器才堆叠/full-width；三个 composer 迁入公共 `DsInlineComposer`，由 recipe 同时决定
    control/action density，并以 mixed-density 负例补齐采用门禁，不能只修当前三个 `size` 属性。
- Kimi:
  - premise: **verified（2026-08-26 独立直读 runtime/validator/UI/DS 一手证据，非代理）**。
    ① 数据前提：`character.ts:237-245` buildWorld 只在 `startWorld.party.map` 内按同 id 读取
    `seedStats?.[id]`，非队伍 seed 不进运行时；`validate.ts:87-128` 对 seedStats 只要求非空 actorId +
    hp/mp 非负整数，**不要求 party 成员资格**——已有非队伍 seed 是 canonical 合法数据，新 IA 不得静默
    隐藏；ownership 分离（party=顺序、seedStats=当前值覆盖）与 ARCH-SEED 冻结合同不冲突，本卡不移动
    maxHP/maxMP/技能/装备/属性。② 移出现状：`ProjectWorkbenchTab.tsx:601` 用 party∪seedKeys 并集生成
    面板，`:618-627` removeParty 只 patch party——孤立覆盖确实遗留；继承路径现成（seed 缺席时
    instantiate 保留 baseStats，character.ts:240-243）。③ 稀疏语义现状：`patchSeed`(:640-648) 已实现
    留空删键、floor+clamp、空 stats 删 actor、空 map 归 undefined——返工合同延续既有形状。
    ④ DS 违规实锤：`ProjectWorkbenchTab.tsx:835-868`（添加道具）与同构的加入队伍/添加资源 composer
    均为 36px `DsSelectField` + `size="compact"` 30px `DsButton` 混排；`tokens.css:47-48` 两档值
    36/30；`boundary.test.ts:41-56` 只分别断言两档 primitive 存在，不检查同行混用——门禁缺口属实。
    DS-F.4(:181-183) 同行同档规则原文、DS-L.7 的 480px 断点、DS-G.4 新 recipe 升 minor 与版本
    必须 Design Lab 显示均与本卡设计一致；版本漂移属实（index.ts `2.10.3` vs tokens.css
    `--ds-version: "2.10.0"`）。
  - design: **agree（2026-08-26，附 K-R1-K-R4，build 必落钉）**：
    - **K-R1（原子命令边界在命令层，不在 UI）**：移出必须是一个命令同时删除 party 项与该 actor
      seed（沿用 `SetStartupEntriesCommand` 原子域），且归一 `seedStats: {}` 与空 stats 对象为
      undefined；undo/redo 对称由 apply/invert 保证；focused draft 未提交时移出不得顺带提交草稿
      （与 FIELD-COMMIT 的 resync 合同对齐）。
    - **K-R2（density 父级统一）**：`DsInlineComposer` 的 control/action density 由 recipe 父级
      统一下发，业务页只选行级 default/compact；mixed-density 负例直接断言“同 composer 内
      control 与 action 高度不一致即失败”，不是只测两档各存在。
    - **K-R3（版本三处一致）**：DS 文档版本、`index.ts EDITOR_DESIGN_SYSTEM_VERSION`、
      `tokens.css --ds-version` 随新 recipe 同步升 minor 并在 Design Lab 显示；顺带消除
      2.10.3/2.10.0 漂移。
    - **K-R4（继承 vs 恢复可区分测试）**：“undo 恢复旧 seed”与“重新加入后 seed 缺席、继承
      ActorDef 基线”是两种不同状态，测试必须分别断言，不得用 undo 冒充继承路径。
- GLM:
  - premise: **verified（2026-08-26，本人一手读码 + 独立 census，非代理）**：
    1. **ownership 分离与运行时消费域**：`character.ts:53-61` StartWorld 五键封闭，`validate.ts:91`
       requireOnlyKeys 无等级/装备/属性/技能/最大值通道；`buildWorld`（`character.ts:237-246`）只遍历
       `party`、按成员 id 读 `seedStats?.[id]`、只覆盖 `hp/mp`（`:242-243`）。全库 grep 证实运行时唯一
       seedStats 消费点就是 buildWorld（reforge `main.ts:6957` buildPresetParty、`debug-tools.ts:716-735`
       均只按 party ids 构造）——非队伍 seed 是运行时死数据，premise 成立。
    2. **validator 允许既有 orphan**：`validate.ts:112-124` 只做逐键形状校验（非空 id、仅 hp/mp、非负
       安全整数），不要求键 ∈ party；`validate-refs.ts:793-799` 只把「键不在 actors 表」判 error。即
       “存在但未入队的 actor seed”是合法 canonical 数据、“缺失 actor seed”是既有悬空诊断——“显示
       未入队覆盖 + 单项清理、不静默隐藏/批量删”与既有诊断层一致。
    3. **当前 UI 实锤**：`ProjectWorkbenchTab:601` 用 party ∪ seed keys 生成“开局当前状态”独立面板
       （`:955-1010` 成员与 orphan 无差别混排）；`removeParty`（`:618-627`）只 patch party，移出后
       遗留可见但运行时不消费的覆盖。before 描述全部属实。
    4. **原子性与继承**：`SetStartupEntriesCommand`（`commands.ts:3529-3568`）整体 clone/替换
       {defaultEntryId, entryPoints}（startWorld 内嵌），apply/invert 同源捕获——party+seed 同一次
       dispatch 即单条 undo/redo 单元，无需新命令类；seed 删除后 buildWorld 无覆盖 → 继承
       baseStats，运行时首次入队 `applySetParty`（`character.ts:217-219`）从模板 instantiate。空 map
       归一为 undefined 是 `patchSeed`（`:640-647`）既有语义，合并后必须保持。
    5. **DS 违规与门禁缺口实锤**：`tokens.css:47-48` = 36/30 两档；三个 composer = 默认档
       DsSelectField（`:732`/`:836`）/DsTextInput（`:916`）+ `size="compact"` DsButton
       （`:748-756`/`:852-868`/`:937-950`），primitives.css 默认 36、--compact 30（select
       `:589-594`）→ 36/30 混排成立；`boundary.test.ts:34-56` 只断言两档常量存在于样式表，
       adoption.json `project/startup` 只登记 owner primitive 名，均无组合行 density 检查——“adopted
       未拦住”属实。版本漂移 `index.ts:10` 2.10.3 vs `tokens.css:4` 2.10.0 属实；全库无
       DsInlineComposer → 新 recipe 按 DS-G.4 升 minor 成立。
    6. **独立新发现（同类违规不止三处）**：库存重复行 DsSelect compact（`:776`）+ DsDraftNumberInput
       默认 36（`:804-820`）；资源重复行 DsDraftNumberInput 默认 36（`:893-903`）+ DsIconButton
       compact（`:905`）。同属 DS-F.4 同行混档，且就在本卡范围表面（库存/资源重复行）。
  - design: **agree（2026-08-26，附 GM1-GM3 必落钉；与 K-R1-K-R4 互补不冲突）**：
    - **GM1（mixed-density census 闭包，不钉死三个 composer）**：density 负例门禁必须由受影响表面的
      全部“同行 control+action 组合”census 派生（composer、库存/资源重复行、新成员行），不能硬编码
      三个 composer——否则 `:776/:804` 与 `:893/:905` 的同类混档在门禁绿灯下继续存活，重蹈“只修截图
      点名处”（本仓 MIG-PAL-ROLE-SPRITE-ALIAS-CLOSURE-1、ED-CATALOG-ROW-IA-1 两次教训）。若实施中
      确需把重复行排除在本轮收口外，必须在卡内显式记录 deferred+后续卡，不得静默留给门禁盲区。
    - **GM2（orphan 数据矩阵三态）**：orphan 测试须覆盖三种键——a) actor 存在但未入队（合法数据，
      只显示“未入队状态覆盖”+单项清理，不新增 error）；b) actor id 缺失（validate-refs 既有悬空
      error，repair 行与既有诊断对齐，清理后 error 消失）；c) actor 存在但无 battler（schema 合法、
      在 adder 的 `partyActors` 过滤之外 `:599`，repair 行必须可渲染、可清理、不崩）。修复动作本身
      一条命令、可撤销。
    - **GM3（原子清理与既有合同保持）**：移出测试断言一次 undo 同时恢复 party 顺序与该 seed、redo
      同时清二者、其他成员 seed 与既有 orphan 逐键不变，且每步后 manifest 通过 validateStartWorld
      （空 map 归一为 undefined 而非 {}）；“聚焦草稿后移出”不得产生幽灵提交（未提交草稿随成员行
      unmount 取消，不写入命令）。
  - 独立反证 / 可证伪观察: ①若发现任何运行时/存档路径消费非队伍 seedStats（本次全库 grep 为零），
    “orphan=运行时死数据”前提失效，须停线重开 ownership 审查；②若 density owner 无法在不新增底层
    primitive 前提下机械拦截 mixed fixture——已证实 DsDraftTextInput 透传 size（controls.tsx:466/
    :488）、DsIconButton 有 size prop，可由 recipe 层统一控制，该风险只剩实现层；③若三态 orphan 任一
    态使 repair 行崩溃，或为合法 orphan 新增第二份诊断真值（与 project-diagnostics/validate-refs
    漂移），GM2 失败即返工。
- counter / 分歧处理: N/A（与 Kimi K-R1-K-R4 互证互补：K-R1/K-R4 ↔ GM3，K-R2 ↔ GM1 机制面，K-R3 ↔ 版本漂移实锤）
- 缺签豁免: N/A
- build 准入结论: **allowed（2026-08-26，Codex + Kimi（K-R1-K-R4）+ GLM（GM1-GM3）三签齐、无
  counter；必落钉 K-R1-K-R4 / GM1-GM3 与未失效历史钉 KI1-KI2/KP1/GP1-GP2/GPS1-GPS2 一并携带。
  转 `build`，Coding Owner 保持 Codex，本轮签字仅授权返工范围，不得超出卡面范围改 schema/运行时。）**

### 2026-08-26 初始世界资源交互返工 build 准入签字（当前）

> 本节是当前唯一 build 准入表。用户可见 `before -> after` 已刷新，上方所有 build / review 签字只保留为历史
> 证据，不授权本轮实现或 `done`。

- Codex:
  - premise: **verified（2026-08-26）**。`StartWorld.resources` 是无 registry/label 的开放 Record，validator
    仅校验 key/value 形状；当前 UI 直接要求填写 raw key 并以 `alchemyEnergy` 举例。全库 census 显示三个当前
    manifest 均无自定义入口资源，唯一实际业务 key `collectValue` 是专用保留键；通用资源消费点为
    `drawFromResourcePool.resource`。这证明“把已有 key 做静态下拉”与“继续补帮助文案”都不能形成可理解工作流。
  - design: **agree（2026-08-26）**。普通流从项目实际 `drawFromResourcePool` 引用动态派生候选，按 key 去重、
    排除 `collectValue` 与已配置项；用消费物品名称作主标签、key 作次级信息。零候选只显示空态；已有无消费者 key
    保留 repair 行。不新增 schema/runtime/DS primitive，不把 `WorldVariableRegistry` 错当资源 registry。
- Kimi:
  - premise: **verified（2026-08-26 独立直读 schema/runtime/产物/构造 fixture，非代理）**。
    ① 无 registry：`StartWorld.resources`/`WorldState.resources` 为裸 `Record<string, number>`
    （character.ts:36-40,52-60）；`validateStartWorldResources`（validate.ts:70-84）仅校验 key 非空/
    无首尾空格/非 `collectValue`（保留键抛错）与 value 非负安全整数——确实没有名称/单位/定义表可派生
    静态选项。② 消费 owner 唯一：通用世界资源的唯一访问点是 `worldResourceValue/setWorldResourceValue`
    （item.ts:797-812），唯一执行消费者是物品效果 `drawFromResourcePool`（item.ts:155,951-983）；
    全仓 production grep（content/reforge/editor，排除测试）未见第二消费域或 canonical registry。
    ③ `collectValue` 专用保留实锤：专用字段 `WorldState.collectValue`（character.ts:35），战斗收妖
    直写该字段（battle-core.ts:1385-1387、main.ts:2611），访问器把 'collectValue' 映射到专用字段而非
    resources 池（item.ts:800,810），validator 拒绝其进入 resources。④ 三 manifest census（本人复跑）：
    pal/demo/e2e-own 全部 entryPoints 的 `startWorld.resources` 均缺席；PAL 唯一
    drawFromResourcePool 物品紫金葫芦（items.json id=270）消费的正是保留键 `collectValue`——
    普通池当前真实候选为零，空态是诚实当前态而非伪枚举。⑤ 非 collectValue fixture（本人构造）：
    两物品共享 `alchemyEnergy` + 一物品独占 `starDust`，派生逻辑产出两个去重候选，主标签为消费物品
    可读名拼接、key 次级——可读、去重、纯函数可测，方向成立。
  - design: **agree（2026-08-26，附 K-W1-K-W3，build 必落钉）**：
    - **K-W1（候选派生的确定性与排序）**：派生必须是只依赖 items 的纯函数；同 key 多消费者时主标签
      按 item id 稳定排序拼接，key 以等宽次级信息展示；排除集 = `collectValue` + 当前入口已配置 key。
    - **K-W2（repair 与零候选互斥边界）**：“未被使用的资源”repair 区只在已有无消费者 key 存在时
      渲染，可与“无新候选”空态共存但不得合并；repair 单项清理 = 一条可撤销命令，与成员移出同一原子
      纪律；repair 内修改数值继续走 FIELD 草稿合同。
    - **K-W3（跨入口排除语义）**：“已配置”按当前正在编辑的入口计算；其他入口已配置的 key 不得
      过滤出本入口候选（入口间 startWorld 独立，GLM 跨入口矩阵的同边界）。
  - 边界确认：本设计不新增 `ResourceDef`、不复用 `WorldVariableRegistry`、不新增 DS primitive、
    不改 schema/runtime；`alchemyEnergy` 类示例文案同步从 UI 删除。
- GLM:
  - premise: **verified（2026-08-26，本人一手读码 + 独立三工程 census + 构造 fixture 实跑，非代理）**：
    1. **无 registry 实锤**：`character.ts:36-40` WorldState.resources 与 `:52-60` StartWorld.resources
       均为无显示名/单位/定义的纯 `Record<string, number>`；`validate.ts:70-85` 仅形状校验（key 非空、
       无首尾空格、值非负安全整数）；`world-variable.ts:1-19` 的 `WorldVariableRegistryV1` 是脚本变量
       定义域（运行值在 WorldScriptState），与资源池不同域——资源确无任何定义表。
    2. **消费 owner 唯一**：`item.ts:797-812` `worldResourceValue`/`setWorldResourceValue` 自注
       “世界资源访问唯一入口”，全库 grep 证实 world.resources 生产读写仅此一处（`:733` 序列化 clone
       除外）；执行点 `item.ts:951-952`（世界用物品效果）；战斗侧显式拒绝
       （`battle-core.ts:2012-2024`“不能在战斗中执行”）；craftRecipe 材料是 itemId 不是世界资源
       （`item.ts:152`）；migrate 不生成任何自定义资源键；reforge 的 collectValue 走专用字段
       （`battle-core.ts:1385-1387` → `main.ts:2611`）。通用消费入口确为
       `items[].use.effects[].drawFromResourcePool.resource`——未发现第二消费域，无需 counter。
    3. **三 manifest census（本人复跑）**：demo / e2e-own / pal 全部 entry 的
       `startWorld.resources` 均为 undefined；drawFromResourcePool census：demo NONE、e2e-own NONE、
       pal 恰一条——item 270 紫金葫芦（`projects/pal/content/items.json:9407-9424`），
       resource='collectValue'。“把已有 key 做静态下拉 = 空伪枚举”与“PAL 唯一业务键是保留键”
       两条卡文结论均独立复现。
    4. **collectValue 专用保留**：`character.ts:35` 专用字段；`validate.ts:80-81` schema 层拒绝
       `resources.collectValue`（“保留资源必须使用专用世界字段”）；compat 访问器
       `item.ts:800/:810` 双向映射——不得进普通候选，属实。
    5. **非 collectValue fixture 实跑（本席满足反证要求）**：以真实 PAL items.json + 3 个注入消费者
       （两件共用 `spiritWater`、一件独占 `treasurePoints`）按卡面派生规则实跑，得到 2 个候选：
       `spiritWater` 去重为一条 label=“灵泉水、炼丹炉·水纹”（key 降为次级）、`treasurePoints`
       独立一条——多物品共用 key 去重、物品名主标签、key 次级全部成立；label 源 `item.name` 是
       纯字符串，且正是现有“添加道具”composer 已用的 label 字段——派生有库内先例，零新增
       schema/primitive。
  - design: **agree（2026-08-26，附 GR1-GR3 必落钉）**：
    - **GR1（候选 census 单源 + 2×2 矩阵闭包）**：候选派生必须消费 StartWorldEditor 已持有的同一
      live items 集合（与“添加道具”同源），不得二次快照；ItemUseEffectEditor 新增/删除
      drawFromResourcePool 后入口页候选必须同步（live 派生断言）。测试以 2×2 全矩阵钉死——消费+
      已配置=正常行、消费+未配置=候选、未消费+已配置=repair 行、未消费+未配置=不存在，外加
      collectValue 永不出现、当前入口已配置项从候选排除且**其他入口候选不受影响**（跨入口复用
      断言）。同一物品多个 effect 用同一 key 时 label 不得重复该物品名；多物品共用 key 的 label
      合并顺序必须确定（按 items 表序或 id 排序），不得依赖遍历偶然。
    - **GR2（命令边界矩阵）**：新增候选=一条 `SetStartupEntriesCommand` 以 0 建键（undo 删键并恢复
      composer 选择、redo 复建）；改值沿用 FIELD-COMMIT Enter+blur 单命令；删除单命令可撤销；三项
      互不粘连，其他既有键逐键不变。
    - **GR3（零候选与长文案/窄宽）**：PAL 真实形态（零非 collectValue 消费）即真实零候选态——
      空态文案出现且不渲染任何 composer（含 disabled）；有候选态长 label（多物品合并名可达 20+
      字）在选项列表与选中回显两处都要有界/省略并保完整 tooltip（DS-F.4 截断合同）；720px 下
      空态、repair 行、可搜索 popup（含键盘选择与 Escape 焦点恢复）不横向溢出。
  - 独立反证 / 可证伪观察: ①若真实工程需要在物品效果尚未 authored 时先为入口预置资源键（“先配
    初值后建消费者”的作者序），“候选=实际消费引用”前提失效——须停线另开 ResourceDef registry 卡
    （卡面“明确不做”已预留该出口，不得偷塞本卡）；②若发现任何绕过 worldResourceValue 的
    world.resources 读写或脚本/战斗命令写资源（本次 census 为零），消费 owner 唯一性失效须
    counter；③若入口页候选与 ItemUseEffectEditor 的 resource 键不同步（live 派生断裂），GR1
    失败即返工。
- 独立 primary-source / 反证要求: 至少一位非 Owner 必须给出一个非 `collectValue` 的代表 fixture，证明同一
  resource key 可由实际消费物品派生并在 UI 中得到可读且去重的选项；若发现 canonical registry 或其他消费 owner，
  必须 `counter` 并列出遗漏域。**已满足**：GLM（2026-08-26，真实 PAL items + 注入消费者实跑）与
  Kimi（2026-08-26，构造共享 key + 独占 key fixture 派生去重）分别独立完成，均未发现第二消费域。
- counter / 分歧处理: N/A（三方结论一致且互补）
- 缺签豁免: N/A
- build 准入结论: **allowed（2026-08-26，Codex + Kimi（K-W1-K-W3）+ GLM（GR1-GR3）三签齐）。**

### 进入 done 前:审查签字（当前资源交互与库存空态返工 candidate）

- Codex: **accept（2026-08-27）**。实现与验证直接覆盖 K-W1-K-W3 / GR1-GR3：候选仅由 live items 纯派生，
  按 item id 稳定聚合并去重同物品重复 effect；`collectValue` 永久排除，已配置排除只看当前入口。消费+已配置、
  消费+未配置、未消费+已配置、未消费+未配置四态分别落为正常行、可搜索候选、repair 行和不存在；新增以 0
  建键，新增/改值/删除/清理各一条命令，undo/redo 与 composer 选择恢复通过。可读物品名是主信息，稳定 key
  是等宽次级信息，长文案仅按需 opt-in 完整 title。新增/删除/清理已有焦点接力和 aria-live，搜索框继承
  “添加世界资源”上下文，Escape 归还触发器焦点，reduced-motion 禁用 popup 入场动画。聚焦 2 files / 69 tests、
  typecheck、DS gate（87 files / 3 evidence-bound exceptions）与 `git diff --check` 通过。PAL 真实零候选及临时
  demo 条件 fixture 在 1280/900/720px 均无 document/card/popup 横向溢出；720px 动作按 recipe 单列，长标签、
  repair、搜索和 Escape 均实机闭环。临时 fixture 已恢复，未修改 `projects/pal`，未改 schema/runtime。
  2026-08-27 库存验收返工在同一已签 IA 范围内补充：标题右侧 neutral `DsTag` 显示 live
  `inventory.length`，删除新增器下方的重复空态，列表/新增器 DOM 顺序由测试钉住；聚焦
  `ProjectWorkbenchTab.test.tsx` **1 file / 40 tests**、typecheck、DS gate 通过。真实 PAL 浏览器验证 0 项无占位、
  临时添加后 1 项且条目位于新增器前；随后重载丢弃临时内存数据，未保存工程。
- Kimi: **accept（2026-08-27，只读终审当前 candidate = HEAD c799cb35 + 工作树库存空态返工；独立直读 +
  聚焦复跑，非代理）**。按我历次设计钉子逐项核验：
  - **K-R1/K-R4（移出原子 + 继承/恢复可区分）✓**：`removeParty` 单次 `patch({party, seedStats})` 同删
    （ProjectWorkbenchTab.tsx:703-713），空 map 归 undefined；`addParty` 只补 party 不恢复旧 seed
    （:695-702）——再加入继承 ActorDef 基线与 undo 恢复旧 seed 是两种可区分状态；onChange 经
    `patchEntry` 落入单个 `SetStartupEntriesCommand`（:1675-1683 + 既有 commit 路径）。
  - **orphan 三态 ✓**：未入队/不可参战/角色缺失分态显示 + 逐项可撤销清理（:943-963），不静默隐藏。
  - **K-W1/K-W3（资源派生）✓**：`deriveStartWorldResourceCandidates`（:121-142）为纯函数——item id
    copy-sort、按 key 聚合、同物品同 key 去重、排除空白/首尾空格/`collectValue`；2×2 矩阵与
    “已配置只看当前入口”（:676-683）落地。
  - **KI1/KI2（概览三卡）✓**：默认开局/标题菜单/启动资源三卡（:1949,:1997,:2029）全部 live 派生；
    起始位置为健康态文案（不常驻裸 scene id）；全文件显示层无 `s000`/`assets.roles`/“编辑 N 项”/
    “启动分支”残留（grep 零命中）；资源 label 由 `project-asset-roles.ts` typed registry 从
    ASSET_ROLES 派生（:7）。
  - **K-R2/K-R3（density owner 与版本）✓**：DsInlineComposer/DsRepeatRow 父级持 density；规范/代码
    常量/CSS token/Design Lab 均 v2.11.0；工作树 recipes.css 对默认档图标按钮同高补强。
  - **KP1（试听单通道）✓**：`audio-preview-session.ts` + `ProjectAudioPreviewButton` + MusicPicker/
    SoundPicker 共用单一 owner，测试通过。
  - **2026-08-27 库存空态 ✓**：标题右侧 neutral DsTag live 数量、重复空态删除、条目在新增器前的 DOM
    顺序由测试钉住（工作树 diff 直读）。
  - 聚焦复跑：ProjectWorkbenchTab/controls/adoption/boundary/project-asset-roles/project-role-groups/
    audio-preview-session 7 文件 122/122 全绿（含真实门禁脚本执行）；全量采纳卡内记录未重复。
- GLM: **accept（2026-08-27，只读终审，本人一手直读实现 + 独立复跑聚焦测试）**：
  1. **K-W1/GR1 候选派生**：`deriveStartWorldResourceCandidates`（ProjectWorkbenchTab.tsx:121-142）
     纯函数消费 live items、item id 排序聚合、同物品多 effect 同 key 不重名（consumers Map 按
     item.id 去重 :131）、collectValue/空白键排除 :129、候选按 key 排序 :136——单元测试 :951-967
     用 spiritWater 双物品 + collectValue 混合 fixture 断言 label="灵泉水、炼丹炉·水纹" 与
     consumerItemIds 顺序，与我设计审查期实跑的派生 fixture 一致。消费侧 :671-683 与“添加道具”
     同一 items 集合（live 单源），active/orphan/addable 三分即 2×2 矩阵实现（:679-682）。
  2. **K-W2 repair 与空态**：repair 区仅在有 orphan key 时渲染（:1212+，aria-label“未被使用的
     资源”），与零候选空态共存不合并；composer 仅在 addable>0 时渲染（:1173），零候选/
     全配置两种 PageHint 文案区分（:1206-1210）——“本项目没有需要为入口设置初值的自定义资源”
     空态不渲染任何 composer（含 disabled），GR3 落实。测试 :969+ 断言无自由键输入、repair
     可见、collectValue 不出现、搜索过滤与 Escape。
  3. **K-W3/GR2 命令边界**：addResource :756-764 对最新 addable 候选重校验 stale selection、
     恰一次 patchResource(key, 0)；remove/clearOrphan 各一次 patch（:765-780）+ 焦点接力 +
     pointerdown 阻止脏草稿 blur；undo/redo 由 SetStartupEntriesCommand 既有原子域承担——本席
     设计期已验证该命令 apply/invert 同源捕获。跨入口排除按当前 entry 的 value.resources
     计算（:682），不污染其他入口。
  4. **库存空态返工附记**：工作区当前 diff 为 live `DsTag` 数量徽标（:985-987，aria-label）+
     删除新增器下方重复空态，列表 DOM 在新增器之前——与 Codex accept 描述一致。
  5. **历史钉仍完好**：removeParty :703-714 原子清 party+seed 且空 map 归一 undefined；
     patchSeed/clearSeed 稀疏语义；orphan seed 三态（未入队/不可参战/角色缺失 :950）+
     单项清理；播报节点 ds-visually-hidden :977。
  6. **验证复跑**：`vitest run ProjectWorkbenchTab.test.tsx` → **1 file / 40 tests passed**
     （本席独立执行）；`git show 1ebb8e8d/c799cb35 -- packages/content|reforge|migrate|projects`
     均为空——schema/runtime/migration/PAL 未动。
  - 无返工项。未修改实现文件，未代签 Kimi。
- Kimi 增量补审 accept（2026-08-27，只读，仅限用户验收增量四点，不重审旧范围；独立直读 + 聚焦复跑，
  非代理）：
  1. **可见“数量”字段 ✓**：库存行 count 为 `DsFieldMeasure measure="short-number"` 包
     `DsDraftNumberField label="数量"`（ProjectWorkbenchTab.tsx:1043-1046，diff 直读）；label/input
     关联、0/1/0 live 数量徽标、Enter+blur 单命令均由测试钉住（ProjectWorkbenchTab.test.tsx:648-697）。
     数值字段有界（short-number measure），不占整行。
  2. **三动作原子槽 ✓**：`.project-inventory-actions` 为行内唯一动作槽（前移/后移公共
     `DsReorderMoveButton` + danger 删除），是行的 direct child 且整行恰 4 子项（:1060-1076 + 测试
     :666-669）；boundary.test.ts 新增断言把动作槽结构与 CSS（inline-flex/nowrap/max-content）机检钉死。
  3. **三档响应布局 ✓（CSS 直读）**：editor.css 基础档 `30px 1fr max-content max-content` 四列同排
     （:1752-1754）；中档 count/actions 各占独立列（:2183-2196）；窄档三项整组降第二列、动作
     `justify-self:start`（:2233-2243）；组内 `flex-wrap:nowrap + min-width:max-content` 保证三动作
     永不拆行；默认档 36×36 由 `.ds-repeat-row[data-density="default"] .ds-icon-button` 公共规则 +
     boundary 断言锁定。与 Codex 三档浏览器证据（top spread=0、scrollWidth=clientWidth）结构一致。
  4. **两个 Catalog Row evidence 指纹 ✓**：`catalog-row-content-adoption.json` 的
     cutscene/asset-catalog 与 sprite-action/preset-catalog 指纹刷新；本人复跑
     `catalog-row-content-adoption.test.ts` 4/4 通过——测试按当前 JSX 重算指纹，二者一致即防漂移。
  - 复跑：ProjectWorkbenchTab 40 + boundary 43 + catalog-row-content-adoption 4，本席独立执行全绿。
    无返工项；未修改实现，未代签 GLM。
- GLM 增量补审 accept（2026-08-27，只读，仅限用户验收增量四点，不重审旧范围）：
  1. **可见“数量”字段**：库存行 count 为 `DsFieldMeasure measure="short-number"` 包
     `DsDraftNumberField label="数量"`（ProjectWorkbenchTab.tsx:1043-1046），label/input 关联由测试
     断言 `countLabel.htmlFor === count.id`（test :663-664）；Enter 后 historyVersion +1、随后 blur
     仍为 +1（:676-681）——Enter + blur 单命令合同成立。  2. **三动作原子槽**：`.project-inventory-actions` 为行内唯一动作槽，含前移/后移
     `DsReorderMoveButton` + 删除共 3 按钮（:1055-1073）；测试断言 actions 是 direct child、
     `querySelectorAll('button')` 恰 3、整行 direct child 恰 4（:666-669）。
  3. **响应布局**：editor.css 三档——基础 4 列 `30px 1fr max-content max-content`（:1752-1754，
     宽屏同排）；中档 count/actions 各占独立 grid 列（:2183-2196，组不拆）；窄档三项整组降至
     第二列（:2233-2243，仅整组换行）。动作槽 `flex-wrap:nowrap + white-space:nowrap +
     min-width:max-content`（:1759-1766）保证组内永不拆散；36×36 由
     `.ds-repeat-row[data-density="default"] .ds-icon-button` 公共规则 + boundary 断言钉住。
     Codex PAL 三档 top spread=0 / scrollWidth=clientWidth 证据与上述 CSS 结构一致。
  4. **DsRepeatRow census**：全库恰 5 处（party :834 / orphan-seed :953 / inventory :1006 /
     resource :1145 / resource-repair :1232），inventory 是唯一曾有未封组多动作的表面，现以页面级
     槽位 span 封组——未扩大公共 API，符合“不为此扩 DsRepeatRow 合同”的边界。
  - 本席独立复跑 `ProjectWorkbenchTab.test.tsx + catalog-row-content-adoption.test.ts +
    reorder.test.tsx` → **3 files / 66 tests passed**。无返工项；未修改实现，未代签 Kimi。
- counter / 返工处理: 2026-08-27 用户验收明确拒绝宽屏库存行把下移 / 删除拆到第二行，并指出裸数值 `1`
  缺少可见“数量”语义；其余 Startup / Reorder 验收项通过。Codex 已完成增量返工，旧 Kimi / GLM accept
  作为上一 candidate 历史保留；当前 Kimi / GLM 增量补审 accept 均已写回并授权最终 done（见上）。
- 缺签豁免: N/A
- done 准入结论: **allowed / complete（2026-08-27）**——Codex rework accept + Kimi 增量补审
  accept + GLM 增量补审 accept 齐，用户随后复验库存行并明确“通过”。

### 进入 done 前:审查签字（历史候选；当前审查已停止）

- Codex: **历史 accept（2026-08-26，上一轮返工 candidate，含 720px 条件态复核修正；因资源 UX 合同刷新而失效）**。直接核对实现与运行证据：canonical schema/runtime
  未改；成员行合并当前 HP/MP，移出通过同一次 `patch({party,seedStats})` 落为一条
  `SetStartupEntriesCommand`，pointerdown 阻止 dirty draft blur 幽灵提交；已有 orphan 按未入队/不可参战/
  角色缺失三态显式呈现并逐项可撤销清理。`DsInlineComposer` 父级注入单一 density 并拒绝 control/action
  显式 `size`，成员/库存/资源/orphan 重复行统一消费 `DsRepeatRow`；规范、代码常量、CSS token 与 Design Lab
  均为 v2.11.0。聚焦 3 files / 108 tests、Editor 全量 158 files / 1209 tests、typecheck、DS gate、build、
  PAL 1280/900/720 与 Design Lab default/compact 几何均通过。随后用不改 `projects/pal` 的临时本地评审副本
  载入真实“未入队/不可参战”两态，在 720px 复现 row `scrollWidth 451/461 > clientWidth 408`；将响应 owner
  从外层 center 收到实际 `.project-card`、撤销 orphan `nowrap`，并把 child shrink-safe 合同放入
  `DsRepeatRow` 后，两行均为 `408/408`，所有子项矩形在行内。响应式修正后聚焦 2 files / 81 tests、Editor
  全量 158 files / 1209 tests、typecheck、DS gate、build 均通过；门禁 rule-body 收口后 boundary
  **1 file / 43 tests** 复跑通过；PAL/条件态 console error 为 0。
- Codex 历史签字: **历史 accept（2026-08-26，candidate `95b81c60`）**。canonical schema/runtime 未改；入口动作仍由单个
  `SetStartupEntriesCommand` 原子提交，typed role registry、结构化 diagnostic role、全局单一音频试听 owner、
  三张 live 摘要卡、有序队伍/库存/资源重复行与 FIELD 合同均已落地。Editor 全量 158 files / 1203 tests、
  最终聚焦 9 files / 77 tests、typecheck、build、DS gate 与 PAL 1280/900/720 功能界面验证通过。该 accept 因
  2026-08-26 用户新增可见返工要求失效，只保留为上一 candidate 历史证据。
- Kimi: pending
- GLM: pending
- counter / 返工处理:
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

- 页面仍采用左侧真实对象/分组、中央标题与主编辑、必要时右侧 Inspector 的统一壳；启动链退为紧凑摘要和帮助。
- 队伍采用 ordered collection；候选角色通过搜索/选择添加，选中成员行动作复用标准 reorder/remove 控件。
- 队伍和当前 HP/MP 不再分成两个对象面板；每个成员行同时呈现顺序、可读名称、稳定 ID、当前 HP/MP 稀疏
  覆盖及 reorder/remove 动作。HP/MP 留空仍表示继承 `ActorDef.battler.baseStats`，不改最大值 ownership。
- 移出队伍时同步删除该角色的 `seedStats` 项，party 与 seed 清理作为一次 `SetStartupEntriesCommand` 提交；
  undo/redo 必须同时恢复/重放成员与覆盖，禁止 Enter/blur 等连续字段边界产生额外命令。
- 对载入时已经存在、但 actor id 不在 party 的 canonical-valid `seedStats`，只在有数据时显示“未入队状态覆盖”
  警告/清理区；不得静默隐藏、自动批量删除或混入正常成员顺序。清理单项同样只提交一条可撤销命令。
- 库存/资源使用同一 `repeatable row` recipe；选择/值/动作保持单行，窄容器按规范降为明确的上下块。
- 初始世界资源不是资源“定义”页：从物品 `drawFromResourcePool` 的实际引用反向生成可搜索候选，显示消费物品
  名称并将 key 降为次级信息；零候选为空态，已有无消费者 key 进入 repair 行。普通流不保留“高级自定义 key”
  后门，避免同一页面既赋初值又隐式定义资源；正式定义能力若有需求另开 registry 卡。
- 标准宽度下 repeat composer 的文字动作按内容宽度放在选择器尾部，成员 HP/MP 使用有界数值列；仅在窄容器
  堆叠布局下允许动作占满一行。该规则进入公共 DS 文档/recipe 测试，不以页面零散宽度补丁维持。
- DS-F.4 的现有同行同高规则升级为可执行合同：compound/composer 由父级 density owner 统一控制 control/action，
  业务页不得分别挑 size；公共测试包含 default/compact 正例与 mixed-density 负例，采用矩阵只有该合同通过才可
  标记 `project/startup` adopted。
- 不新增底层 control primitive：公共层组合既有 `DsField` / `DsSelectField` / `DsControlGroup` / `DsButton` 为
  `DsInlineComposer`，桌面 `minmax(0,1fr) auto`、动作 intrinsic；容器 `<480px` 才单列并 full-width。
  HP/MP 通过公开 short-number measure recipe 有界，不覆写全局 NumberInput。按 DS-G.4 将规范/代码/CSS 版本
  同步升至下一 minor，消除当前 `index.ts 2.10.3` 与 `tokens.css 2.10.0` 漂移。
- 资源角色列表由 typed registry 派生 label/kind/group/required/preview capability，杜绝 UI 单独维护数量与分组。
- 音乐/音效试听共用现有 resolver/player；资源页导航使用真实 action link，不拿“前往预览”代替播放。
- 项目概览使用三张自适应摘要卡，不再使用横向“标签/值/代码/动作”技术巡检表：
  - 默认开局：入口显示名 + 角色姓名 + 金钱 + 初始物品 + 起始位置/开场视频状态；动作“编辑开局”。
  - 标题菜单：可选故事数量和显示名摘要；动作“管理入口”。
  - 启动资源：已配置/待配置/需要处理状态和人类可读资源角色名称；动作“配置资源”。
  - 入口/scene/asset 技术 ID 不常驻；必要概念放 `DsHelpTip`，同名歧义在详情页以稳定 ID 消解。
- Wide 三卡横排，窄容器自然降为单列；每卡只保留一个动作，不重复“启动分支/查看链路”。

### 已知风险

- 风险: 与 `ED-FIELD-COMMIT-1`、`ED-DS-3` 同时修改公共控件和 `ProjectWorkbenchTab` 容易冲突。
- 缓解: 先冻结两张基础卡公共合同，本卡只在随后采用；同一时刻只允许一个 Coding Owner 改实现。
- 风险: 启动链说明删得过多会失去运行时分支解释。
- 缓解: 保留一句摘要 + 有价值的 `DsHelpTip`，不保留第二套大型流程面板。

### 主审立场

- Reviewer: Kimi
- 结论: pending（2026-08-26 初始世界资源用户可见合同刷新；既有 agree 仅作历史记录）
- 必改项: 待 Kimi / GLM 独立核验动态候选 owner、无候选空态、orphan repair、`collectValue` 排除和测试矩阵。
- 是否建议进入 build: 是（2026-08-26 资源交互返工三签齐：K-W1-K-W3 + GR1-GR3 为 build 必落钉）。

## Build: 实现与自测（历史候选）

> 下列内容记录资源交互返工之前的 candidate；当前资源交互增量另记于本节末尾。

- Coding Owner: Codex
- 修改文件:
  - `packages/editor/src/ui/ProjectWorkbenchTab.tsx` / `.test.tsx`、`editor.css`、
    `design-system/primitives.css`、`design-system/field-commit-adoption.json`。
  - `packages/editor/src/ui/project-asset-roles.ts` / `.test.ts`、`project-role-groups.test.ts`。
  - `packages/editor/src/core/project-diagnostics.ts` / `.test.ts`。
  - `packages/editor/src/core/audio-preview-session.ts` / `.test.ts`、
    `ProjectAudioPreviewButton.tsx` / `.test.tsx`、`MusicPicker.tsx` / `.test.tsx`、
    `SoundPicker.tsx` / `.test.ts`、`AudioAssetWorkbench.tsx` / `.test.tsx`。
  - `packages/editor/src/ui/design-system/adoption.test.ts`、`docs/phase2/archive/designs/editor-design.md`。
- 实现摘要:
  - `ASSET_ROLES` 现在经唯一 typed registry 派生中文名、kind、分组、前缀和 canonical 必需性；概览与启动页
    共用该 registry，diagnostics 以结构化 `assetRole` 关联，不解析 message/path。
  - 概览删除重复启动链，固定为“默认开局 / 标题菜单 / 启动资源”三张 live 自适应卡；缺损默认入口、场景、
    intro、stale/failed diagnostics 与资源悬空/错型全部 fail-closed，摘要不常驻机器 token。
  - 入口页补齐复制、重排、删除保护、有序队伍、可搜索队员/道具添加器、资源重复行、HP/MP 稀疏覆盖；
    add/remove 后焦点接力与 aria-live 完整，IME 组合态 Enter 不误新增，一动作只写一条命令。
  - 项目页、MusicPicker、SoundPicker、AudioAssetWorkbench 共用一个试听 owner；快速音效 A→B 隔离迟到
    prepare，项目页播放自然结束释放 owner，任何“打开资源/前往预览”先停止试听且不写 history/world。
  - 顶栏窄导航断点统一到 1199px；400/520 容器下资源试听与打开动作、重复行均无覆盖或横向溢出。
- 运行命令:
  - `pnpm --filter @type-pal/editor check`：**158 files / 1203 tests passed**，typecheck passed。
  - 最终审查修正后：`pnpm --filter @type-pal/editor typecheck` + 9 个聚焦文件：
    **9 files / 77 tests passed**。
  - `pnpm --filter @type-pal/editor audit:design-system`：**87 files，3 个 evidence-bound exceptions，passed**。
  - `pnpm --filter @type-pal/editor build`：passed；仅保留既有 chunk-size warning。
  - 本卡 18 个改动 TS/TSX 文件 `biome check`：passed；`git diff --check`：passed。
- 浏览器 / 手工检查（真实 PAL，`?module=project`）:
  - 1280×900：概览三卡同排；启动角色行、中央滚动层、资源动作均无 overflow；真实 MIDI/WAV 互切会停止
    前一项，无 alert / console error。
  - 900×900、720×900：概览自然单列；启动与入口页只有 `.project-scroll` 一个纵向 scroll owner；队伍、
    库存、资源 composer、DsSelect portal、Escape 焦点恢复与试听/打开动作不重叠。
  - 1024×900：顶栏收为“导航”；1200×900、1280×900 恢复完整菜单；三档菜单与 toolbar overlap 均为 0，
    document horizontal overflow 均为 0。
  - 金钱字段实机 Enter 提交后 undo 恢复、redo 可用；未执行保存。
- 跳过的检查及原因:
  - 无跳过。仓库级 `pnpm lint` 已实际运行但失败：当前 HEAD 中本卡未修改的 `packages/content` 等文件存在
  370 errors / 43 warnings 的既有全仓 Biome 债；本卡没有越界批量改写这些文件，改动 TS/TSX 已单独检查全绿。

### 2026-08-26 验收返工增量

- 修改文件:
  - `ProjectWorkbenchTab.tsx` / `.test.tsx`、`editor.css`：成员行合并当前 HP/MP、移出原子清 seed、orphan
    三态 repair、三 composer 与成员/库存/资源重复行统一 density。
  - `design-system/recipes.tsx` / `.css` / `.test.tsx`、`boundary.test.ts`、`tokens.css`、`index.ts`、
    `design-system-adoption.json`：新增 `DsInlineComposer`、`DsRepeatRow`、`short-number` measure 与静态防回流门禁。
  - `design-lab/DesignLab.tsx`、`editor-design-system-v1.md`：v2.11.0 同步并在 RF-08 展示两档 composer。
- K-R1 / K-R4:
  - 移出成员一次 patch 同时删除 party 项与该 actor seed，空 map 归 `undefined`；focused dirty HP 草稿在
    pointerdown 被取消，不因 blur 先写一条命令。undo 一次恢复旧 party + seed，redo 同时清除；其他成员与
    既有 orphan 逐键保持，再加入后 seed 缺席并继承 ActorDef 基线。
  - 当前 HP/MP 测试区分留空继承、`0` 与单字段 `{mp:0}`；Enter + blur 只写一条命令，undo/redo 后字段从
    canonical resync。
- K-R2 / K-R3 / GM1:
  - `DsInlineComposer` 要求父级显式选择 `default | compact`，向 control/action 同时下发尺寸；任何槽位显式
    `size`（即使值相同）均抛错。桌面为 `minmax(0,1fr) auto`，自身容器 `<480px` 才转单列/full-width。
  - `DsRepeatRow` 持有重复行表面与 density；成员、库存、资源与 orphan 全部采用 default 36px，消除原有
    36/30 混档。真实页面 census 断言 3 个 composer 及所有受影响重复行不出现 child compact 回流。
  - DS 文档、`EDITOR_DESIGN_SYSTEM_VERSION`、`--ds-version` 与 Design Lab 同步至 `2.11.0`；Design Lab
    量测 default `36/36`、compact `30/30`，short-number `160px`。
- GM2 / GM3:
  - orphan repair 覆盖 actor+battler 未入队、actor 无 battler、actor 缺失三态；全部显式呈现、单项清理、
    一条命令可撤销。原子移出测试逐键断言其他成员/orphan 不变，并在 remove/undo/redo/re-add 后分别通过
    `validateStartWorld`。
- 条件态响应式复核:
  - 内部 review 发现既有 PAL 正常数据没有 orphan，原 720px 截图只证明常态无 overflow；用临时本地项目载入
    真实未入队 battler 与不可参战 actor 后，直接量到 `.project-center=526px`、内层 orphan row `408px`，旧
    `@container (max-width:520px)` 因错误命中外层 center 而未降栏，且 orphan values 的 `nowrap` 与
    `.project-scroll { overflow-x:hidden }` 会把溢出裁掉，document overflow=0 因而是假绿。
  - `.project-card` 现在建立 inline-size container，使重复行按实际卡片 content box 降栏；
    `DsRepeatRow > *` 公共持有 `min-width:0 / max-width:100% / overflow-wrap:anywhere`，业务层删除 orphan
    `nowrap`。静态门禁同时钉住 container owner、公共 shrink-safe 合同和禁止 nowrap 回流，没有新增页面断点。
- 聚焦测试:
  - `pnpm --filter @type-pal/editor exec vitest run src/ui/design-system/recipes.test.tsx
    src/ui/design-system/boundary.test.ts src/ui/ProjectWorkbenchTab.test.tsx`
  - **3 files / 108 tests passed**（红测先证明缺口，实施后两轮全绿）。
- 响应式 review 修正后聚焦：`boundary.test.ts` + `ProjectWorkbenchTab.test.tsx`，**2 files / 81 tests passed**。
- 审查指出首版正向 regex 可跨 CSS block 假绿后，改为先提取目标 rule body 再逐属性断言；
  `boundary.test.ts` **1 file / 43 tests passed**。
- 当前 candidate 最终验证:
  - `pnpm --filter @type-pal/editor check`：typecheck passed；**158 files / 1209 tests passed**。
  - `pnpm --filter @type-pal/editor audit:design-system`：**87 files / 3 evidence-bound exceptions，passed**。
  - `pnpm --filter @type-pal/editor build`：passed；仅既有 chunk-size warning。
  - `git diff --check`：passed。
- PAL / Design Lab 功能界面证据:
  - 1280×900：三个 composer control/action 均为 `36/36px`，动作固有宽 `108px`；成员 HP/MP 与三个图标
    动作均为 `36px`，document/main 横向 overflow 为 0。
  - 900×900：实际 composer 容器 `414px`，选择器与动作稳定单列；成员信息、双数值列、动作分两行，HP/MP
    各 `160px`，overflow 为 0。
  - 720×900：实际 composer 容器 `250px`，动作 full-width；HP/MP 再降为单列，名称/ID/动作保持可见，
    document/main overflow 为 0。
  - 720×900 orphan 条件态：修正前两行分别为 `scroll/client 451/408`、`461/408`；修正后均为
    `408/408`，卡片、行、values、tag 与清理按钮全部在边界内，未入队/不可参战状态和长 HP/MP 文本完整可读。
  - 实机字段：Escape 后值恢复空且 undo 仍 disabled；Enter 提交 `149` 后 undo/redo 为 `空 → 149 → 空`，
    未执行保存；PAL 与 Design Lab console error 均为 0。

### 2026-08-26 初始世界资源交互返工增量（当前 candidate）

- 修改文件:
  - `packages/editor/src/ui/ProjectWorkbenchTab.tsx` / `.test.tsx`、`editor.css`。
  - `packages/editor/src/ui/design-system/controls.tsx` / `.test.tsx`、`primitives.css`。
- 实现摘要:
  - `deriveStartWorldResourceCandidates(items)` 是唯一 live 派生入口：copy-sort item id、按 key 聚合、同物品同 key
    去重、跳过空白/首尾空格与 `collectValue`，输出稳定消费物品名和 item id 证据。
  - 当前入口资源按 2×2 矩阵渲染；普通作者只从可搜索的真实消费者候选新增，初值固定为 0；orphan 单独进入
    “未被使用的资源”repair 区，零候选空态与 repair 可共存但不混为一项。其他入口同 key 不参与过滤。
  - `DsSelect` 只增加可选的次级等宽标识和 option title，不对全编辑器无条件生成原生 tooltip；可搜索输入使用
    所属控件上下文命名，popup 遵守 reduced-motion。资源新增后聚焦新值字段，删除后聚焦新增器，清理后聚焦
    相邻资源/新增器/资源区稳定回退，并通过 live region 宣告结果。
- 聚焦验证:
  - `ProjectWorkbenchTab.test.tsx` + `design-system/controls.test.tsx`：**2 files / 69 tests passed**；覆盖纯派生、
    2×2、live items、跨入口、长名称、搜索/Escape、焦点接力、单命令与 undo/redo。
  - `pnpm --filter @type-pal/editor typecheck`：passed。
  - `pnpm --filter @type-pal/editor audit:design-system`：**87 files / 3 evidence-bound exceptions，passed**。
  - `git diff --check`：passed。受影响包耗时全量按批次纪律留到三张已签实现卡全部完成后只跑一次。
- 功能界面证据:
  - PAL 真实工程 1280/900/720px 均为真实零候选空态，无 raw key 输入/composer；document 与资源卡
    `scrollWidth === clientWidth`。
  - 不改 canonical 工程的临时 demo 条件 fixture 覆盖长合并名称、两个候选与 orphan repair；1280/900/720px
    下 composer、repair、popup 均无横向溢出，720px 动作为单列 full-width；搜索“灵泉”只得一个聚合候选，
    Escape 关闭 popup 并把焦点还给“添加世界资源”。fixture 与临时 dev server 均已清理。

### 2026-08-27 初始库存空态与数量返工增量（当前 candidate）

- 修改文件: `packages/editor/src/ui/ProjectWorkbenchTab.tsx` / `.test.tsx`。
- 实现摘要:
  - “初始道具”标题右侧复用 neutral `DsTag`，动态显示 `inventory.length`（库存种类数，不是总件数）。
  - 删除新增器下方的“无初始道具。”；添加器本身已提供恢复路径，`0 项` 标签已表达空状态，不再重复无动作说明。
  - 现有条目原本已在 `DsInlineComposer` 上方，本轮补 DOM 顺序回归断言，防止空态/有数据态再次交换信息区域。
- 聚焦验证:
  - `pnpm --filter @type-pal/editor exec vitest run src/ui/ProjectWorkbenchTab.test.tsx`：**1 file / 40 tests passed**；
    覆盖 0 -> 1 -> 0 动态数量、空态文案缺席、条目在新增器前，以及原有命令/撤销合同。
  - `pnpm --filter @type-pal/editor typecheck`：passed。
  - `pnpm --filter @type-pal/editor audit:design-system`：**87 files / 3 evidence-bound exceptions，passed**。
- 功能界面证据:
  - PAL 真实工程空库存显示标题右侧“0 项”，下方直接是添加器，无“无初始道具。”；临时添加“观音符”后显示
    “1 项”，条目在添加器上方。验收后重载页面丢弃临时内存改动，未保存工程。

### 2026-08-27 库存行数量语义与动作槽验收返工（当前 candidate）

- 用户反例与根因:
  - 宽屏库存行只声明 4 个 grid 列，却把序号、选择器、数量和上移 / 下移 / 删除共 6 个 direct child 交给
    auto-placement；因此上移留在第一行，下移 / 删除进入隐式第二行。
  - 数量输入只有 item-specific `aria-label`，视觉上只显示裸数值，普通用户无法直观看出字段语义。
- 实现摘要:
  - 数量改为 `DsFieldMeasure(measure="short-number") + DsDraftNumberField(label="数量", layout="inline")`；
    可见标签与输入正确关联，宽度继续由公共短数值 measure 持有，不保留页面私有像素宽度。
  - 三枚动作封装为唯一 `.project-inventory-actions` direct child，组内 `inline-flex + nowrap`；宽容器不拆行，
    `<=520px` 与 `<=400px` 只允许整个动作组按既有容器合同降行。
  - 全库 5 个生产 `DsRepeatRow` census：队伍三动作已有封组，库存是唯一遗漏；其余三处各只有一个动作，
    因此不扩大公共 API。
- 验证:
  - 失败测试先证实旧 DOM 无数量字段 / 动作槽；修复后 `ProjectWorkbenchTab + boundary` **2 files / 83 tests**，
    加 Catalog Row 指纹门禁复跑共 **3 files / 87 tests** 通过。
  - `pnpm --filter @type-pal/editor check` 的 typecheck 通过；全量阶段仅发现 Reorder 旧提交留下的两处 catalog
    fingerprint 漂移，绑定当前真实调用点后聚焦门禁通过；未重复运行耗时全量。
  - DS gate：**87 files / 3 evidence-bound exceptions，passed**；`git diff --check` passed。
  - Chromium 真实 PAL 临时添加“观音符”：1280 / 900 / 720px 三档三按钮均 36×36、`top spread = 0`、
    全在 row 边界内且 `scrollWidth === clientWidth`；数量标签均可见。900px 选择器整行、数量与动作同一响应行；
    720px 三块依次整组降行。console 0 error / 0 warning；未保存临时工程状态。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: **Codex / Kimi / GLM 三方 accept（2026-08-27）**；两席均已独立补审“数量字段 +
  原子动作槽 + catalog 指纹绑定”增量，无 counter。
- 必须返工项: 无；用户验收提出的库存动作拆行与裸数量语义两项均已闭环。
- Accept / rework: **accept / done**。

## 用户验收

- 用户结论: 2026-08-26 上一 candidate 的角色初始状态语义验收通过；入口工作台视觉验收提出本轮返工并批准
  按 Codex 推荐方案推进；随后再次明确指出“初始世界资源”的内部 key 输入不可理解，要求改成选项或更简单的
  交互。2026-08-27 用户指出库存空态说明位于新增器下方既重复又与有数据态结构不一致，建议改为标题右侧数量
  tag；Codex 已按该方案完成。2026-08-27 用户验收确认其余项目无问题，但拒绝初始道具宽屏动作拆行，并指出
  裸数量值缺少可见语义；Codex 完成 acceptance rework，Kimi / GLM 增量补审均 accept；2026-08-27 用户刷新
  复验后明确“通过”，本卡最终验收完成。
- 后续任务: 本卡无剩余返工或审查；用户要求的“候选添加改为按钮打开选择弹窗”继续由独立 successor
  `ED-ADD-PICKER-DIALOG-1` 承接，不回填或重开本卡。

## 交接日志

- 2026-08-27 User: 复验库存行可见“数量”字段及不可拆分的上移 / 下移 / 删除动作组，明确“通过”。三方
  增量 accept 与用户验收均齐，本卡转 done；无下一位 reviewer，successor 按独立任务卡串行推进。

- 2026-08-27 Kimi 增量补审: 只读核用户验收增量四点（数量可见 label+有界、三动作原子槽、三档响应 CSS、
  两个 catalog 指纹漂移修复），独立直读 diff + 复跑 ProjectWorkbenchTab 40/boundary 43/
  catalog-adoption 4 全绿；签 accept。未修改实现，未代签 GLM，未标 done。Next: 用户复验库存行后收口。

- 2026-08-27 User + Codex: 用户验收确认其余 Startup / Reorder 项无问题，只 counter 初始库存宽屏动作拆行，
  并补充指出裸 `1` 无法直观表达数量。Codex 实锤 4 列 / 6 direct child 的 auto-placement 根因，改为公共
  short-number measure 的可见“数量”字段和一个不可拆分动作槽；83 + 87 聚焦测试、typecheck、DS gate、
  1280/900/720px 几何与 console 均通过。旧两席 accept 降为历史。Next: Kimi + GLM 只读补审增量；随后用户
  只复验库存行，不重验已通过项目。
- 2026-08-27 Kimi: done 前只读终审当前 candidate（HEAD c799cb35 + 工作树库存空态返工），签
  **accept**。逐项核验历次钉子：移出单命令同删 party+seed 且空 map 归一、再加入继承与 undo 恢复
  可区分、orphan 三态逐项清理、资源候选纯派生 + 2×2 矩阵 + 跨入口排除、概览三卡 live 且无机器
  token、registry 单一来源、density 父级 owner + v2.11.0 三处一致、试听单通道、库存数量 tag 与 DOM
  顺序钉。聚焦 7 文件 122/122 复跑全绿（含真实门禁脚本）。未修改实现，未代签 GLM。三方 accept 齐，
  待用户验收收口；本卡收口后 ED-ADD-PICKER-DIALOG-1 方可按序开工。
- 2026-08-27 User + Codex: 用户把“按钮 -> 弹窗选择 -> 明确确认”的候选添加重设计拆成独立 successor
  `ED-ADD-PICKER-DIALOG-1`。本卡保留当前 inline candidate 的历史 / review 真值，不因 successor 退回 build；
  新卡三签齐前不得修改实现。
- 2026-08-27 User + Codex: 用户指出“无初始道具。”位于新增器下方既重复又与有数据态列表位置不一致，建议
  标题右侧直接显示数量 tag。Codex 在原卡验收范围内改为 live 种类数 neutral tag、删除重复空态，并用测试钉住
  列表始终在新增器前；聚焦 40、typecheck、DS gate 与 PAL 0/1 项浏览器验证通过，临时验收数据未保存。
  Next: Kimi + GLM 对资源交互与本轮库存空态增量一起只读复审，分别写回 accept/counter。
- 2026-08-26 GLM: 状态同步——核验发现 Kimi 席已在本席写回的同窗口独立签字（K-W1-K-W3）并把
  “初始世界资源交互返工 build 准入签字（当前）”的准入结论改为 allowed；本席仅同步 Status/看板/
  主审立场/Review 结论/下一位提示词与门禁一致，未改动 Kimi 签字与其结论文本。K-W1（id 排序拼接）
  与 GR1（live 单源+2×2 矩阵）互补钉死派生确定性；K-W3 与 GR1 跨入口断言同边界。
- 2026-08-26 Kimi: 完成“初始世界资源”交互返工独立审查并签 premise verified + design agree
  （附 K-W1 派生纯函数与稳定排序 / K-W2 repair 与零候选互斥且单项清理一条命令 / K-W3 跨入口
  “已配置”按当前入口计算）。一手核验：schema 无 registry、唯一消费 owner drawFromResourcePool、
  collectValue 专用保留、三 manifest resources 全空、PAL 唯一业务键为保留键、构造非 collectValue
  fixture 证明派生可读去重；未发现第二消费域或 canonical registry，未触发 counter。未修改实现。
  三签齐，准入开放。
- 2026-08-26 GLM: 完成“初始世界资源”交互返工独立审查并重签 premise verified + design agree
  （附 GR1 候选 census 单源+2×2 矩阵 / GR2 命令边界矩阵 / GR3 零候选与长文案窄宽）。一手核验：
  resources 无 registry、worldResourceValue 唯一消费入口（战斗拒绝/craftRecipe 不沾/migrate 零生成）、
  collectValue schema 级保留（validate.ts:80-81）、三 manifest startWorld.resources 全空 + 全库仅
  紫金葫芦 collectValue 一条消费；构造 spiritWater/treasurePoints fixture 实跑派生得到去重可读候选
  （item.name 主标签有“添加道具”composer 库内先例）。未发现第二消费域或 canonical registry，无
  counter。Codex + GLM 已签，待 Kimi；未修改实现，未代签。
- 2026-08-26 User + Codex: 用户再次指出“初始世界资源”要求输入 `alchemyEnergy` 一类内部 key，普通用户无法
  理解，要求改用选项或更简单交互。Codex census 发现没有 canonical 资源 registry，三个当前 manifest 均无
  自定义入口资源，PAL 唯一资源用法 `collectValue` 又是专用保留键；因此不做静态假枚举，改从真实
  `drawFromResourcePool` 消费引用动态派生可读候选，无候选为空态，已有 unknown key 进入 repair。任务退回
  `rework`，上一轮 build/review 签字失效；签字刷新前未修改实现。
- 2026-08-26 Codex: Kimi/GLM review 签字表仍为 pending 时，内部 GM1 条件态复核发现 orphan 行在 720px
  被横向裁切。真实本地评审副本前后量测确认根因是 outer-center container owner + orphan nowrap；改为
  card-local container 与 `DsRepeatRow` 公共 shrink-safe 合同后，row 从 451/461 over 408 收到 408/408。
  响应式修正后 focused 81、门禁复跑 43、Editor 1209、typecheck、DS gate、build、console 均通过。Next: Kimi + GLM
  必须复审当前 HEAD 并把 accept/counter 实际写回本节上方签字表；聊天“签了”不替代任务卡记录。
- 2026-08-26 Codex: 验收返工单 Owner build 完成并转 review。成员行合并 HP/MP、移出原子清 seed、orphan
  三态 repair、`DsInlineComposer` / `DsRepeatRow` 与 DS v2.11.0 防回流门禁全部落地。聚焦 108、Editor
  全量 1209、typecheck、DS gate、build 与 PAL 1280/900/720、Design Lab 两档几何均通过；Codex accept。
  Next: Kimi + GLM 只读正式复审并分别写回 accept/counter，双签前不得标 done。
- 2026-08-26 GLM: 按 2026-08-26 验收返工合同完成独立审查并重签 premise verified + design agree
  （附 GM1 density census 闭包 / GM2 orphan 三态矩阵 / GM3 原子清理断言）。一手核验：buildWorld
  消费域全库 grep 唯一、validator 允许合法 orphan、removeParty 遗留 orphan、SetStartupEntriesCommand
  单命令原子性、三 composer 36/30 混排 + boundary/adoption 门禁缺口、版本漂移；新发现库存/资源重复行
  两处同类混档（:776/:804、:893/:905）→ GM1。三签齐（Codex + Kimi K-R1-K-R4 + GLM GM1-GM3），
  准入 allowed，状态转 build。未修改实现文件，未代签 Kimi。
- 2026-08-26 Kimi: 独立直读 buildWorld 消费域（仅 party 成员读 seed）、validator 非队伍 seed 合法、
  当前 UI 并集面板与 removeParty 只改 party 的孤儿成因、三个 composer 的 36/30 混档与 boundary 缺口、
  DS-F.4/L.7/G.4 原文与 2.10.3/2.10.0 版本漂移；签 premise verified + design agree（附 K-R1 命令层
  原子边界 / K-R2 density 父级统一 / K-R3 版本三处一致 / K-R4 继承 vs 恢复可区分测试）。
  未修改实现文件，未代签 GLM；GLM 未写回前保持 blocked。
- 2026-08-26 User + Codex: 用户指出队伍与当前 HP/MP 分成两面板增加对照成本，宽数值框/全宽低频按钮缺少
  约束；批准按“同一成员行 + 紧凑字段 + 桌面 intrinsic/narrow full-width”方案开始。Codex 直读确认 runtime
  只消费 party 成员 seed、当前移出操作会遗留孤立覆盖；同时确认 validator 允许已有孤立 seed，因此设计补充
  条件 repair 区而非静默隐藏。任务退回 `rework`，旧 build/review 签字不授权新实现。
  Next: Kimi / GLM 按本轮补充直接证据重签 premise/design，签字前不得修改实现。
- 2026-08-26 Codex: 单 Owner build 完成并转 `review`。Editor 全量 1203、最终聚焦 77、typecheck、build、
  DS gate 与真实 PAL 1280/900/720 验证通过；内部合同/测试/UI 压力审查 accept。Next: Kimi + GLM 对当前
  commit candidate 正式 code/test/visual review，未双签前不得标记 done。
- 2026-08-26 User + Codex: 用户确认 `ARCH-ENTRY-ACTOR-SEED-1` 最终验收通过；该卡已收口 `done`。
  本卡所有前置与三方 build 签字齐，转入 `build`，由 Codex 作为唯一 Coding Owner 开始实现。
- 2026-08-25 Kimi: 按 2026-08-25 刷新合同重签。直读当前概览四行摘要（裸 s000/assets.roles/写死
  “编辑 8 项”/重复启动分支）与三张摘要卡的 live 派生来源（manifest entryPoints、lookupText、
  validateManifestAssetConfig、validateManifestEntryPoints）；确认 ARCH-SEED ownership 已冻结实现、
  DS-3/FIELD-COMMIT-1 合同已 done；签 premise verified + design agree（附 KI1 资源 label 单一来源、
  KI2 起始位置健康态不显示裸 scene id）。未修改实现。三签齐，准入开放。
- 2026-08-25 User + Codex: 用户指出概览中的 `s000`、`assets.roles` 和重复链路普通人无法理解；Codex 直读
  当前实现与冻结后的 actor ownership，刷新为三张直观摘要卡合同。旧 2026-08-24 设计签字按规则失效；
  Next: Kimi / GLM 按最新版联合重签，签字前不得改实现。
- 2026-08-24 Kimi: 独立核 canonical 入口模型不变前提（character.ts:89-100）、ASSET_ROLES 12 项枚举、
  当前页遗留（raw btn/checkbox 墙/写死“编辑 8 项”/“前往预览”/逐字符命令）；确认边界完整（不恢复继承/
  伪入口/fallback、seed schema 留在 ARCH-ENTRY-ACTOR-SEED-1）；签 premise verified + design agree
  （附 KP1-KP3）。待 GLM 签字；build 排期在 ED-DS-3/ED-FIELD-COMMIT-1 公共合同之后。未修改实现文件。
- 2026-08-24 Codex: 核对 canonical 入口、12 项资源角色和当前页面遗留，开独立 IA 卡。Next: Kimi/GLM 设计签字。
- 2026-08-26 Codex: 初始世界资源交互返工单 Owner build 完成并转 review。live items 纯派生、2×2、
  `collectValue` 排除、跨入口、repair、单命令、焦点/aria-live 与按需完整 title 均落地；聚焦 69、typecheck、
  DS gate、PAL 真空态及条件 fixture 1280/900/720 通过，临时 fixture 已清理。Next: Kimi + GLM 只读复审
  当前 candidate，分别写回 accept/counter；未三签不得标 done。

## 下一位 Agent 提示词（当前 review）

```text
接手任务：ED-PROJECT-STARTUP-IA-1 初始世界资源交互 + 初始库存空态返工只读复审。
任务卡：docs/ops/archive/tasks/done/ED-PROJECT-STARTUP-IA-1-project-entry-startup-workbench.md
当前状态：review；Codex 已 accept，Kimi / GLM 当前 done 签字 pending。
你的角色：Reviewer（Kimi 核架构/无障碍/视觉边界；GLM 核 census/2×2/命令与测试矩阵）。

先读：AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、任务卡当前 build 准入 K-W1-K-W3 / GR1-GR3、
“初始世界资源交互返工增量（当前 candidate）”与当前 done 签字表。审查当前工作区 diff/commit，不复用历史 accept。

重点核对：候选是否只消费 live items 并稳定去重；collectValue/当前入口/跨入口边界；2×2 与 orphan repair；
新增/改值/删除/清理是否各一条命令并可撤销；长名称/技术 key 层级；搜索、Escape、add/delete/repair 焦点；
1280/900/720 popup 与横向溢出；库存标题数量是否取 live 行数、0 项是否没有重复占位、已有条目是否始终位于
新增器上方。不得改实现文件，不得代签另一席。

输出：在任务卡“进入 done 前:审查签字（当前资源交互与库存空态返工 candidate）”写入 accept，或写 counter + 直接证据
和返工项；同步 Review/交接日志。Kimi + GLM 都 accept 前不得标 done。
```

## 下一位 Agent 提示词（历史 build）

```text
接手任务：ED-PROJECT-STARTUP-IA-1 入口与开局 / 全局资源与启动工作台收口——初始世界资源交互返工 build。
任务卡：docs/ops/archive/tasks/done/ED-PROJECT-STARTUP-IA-1-project-entry-startup-workbench.md
当前状态：build（2026-08-26 Codex + Kimi（K-W1-K-W3）+ GLM（GR1-GR3）三签齐，准入 allowed）。
你的角色：Coding Owner（唯一实现者；分支 codex/ed-project-startup-ia-1；本轮仅授权资源交互返工范围）。

先读：任务卡“初始世界资源交互返工前提补充”“验收条件”“初始世界资源交互返工 build 准入签字（当前）”
三席全文与必落钉（K-W1-K-W3 / GR1-GR3，另携带未失效历史钉 K-R1-K-R4 / GM1-GM3）、
ED-FIELD-COMMIT-1 合同、DS v2.11.0 recipe（DsInlineComposer / DsRepeatRow 已在位）。

必落钉（build 期完成，缺一即返工）：
- K-W1 候选派生为只依赖 items 的纯函数；同 key 多消费者主标签按 item id 稳定排序拼接、key 等宽次级；
  排除集 = collectValue + 当前入口已配置 key。
- K-W2 “未被使用的资源”repair 区仅在有 orphan key 时渲染，可与零候选空态共存但不合并；单项清理一条
  可撤销命令；repair 内改值走 FIELD 草稿合同。
- K-W3 “已配置”按当前编辑入口计算，其他入口已配置 key 不过滤本入口候选。
- GR1 派生消费 StartWorldEditor 同一 live items 集合，不得二次快照；2×2 全矩阵测试（消费+已配置/
  消费+未配置/未消费+已配置/未消费+未配置）+ collectValue 永不出现 + 跨入口断言 + 同物品多 effect
  同 key 不重复 label；ItemUseEffectEditor 增删 drawFromResourcePool 后入口候选同步（live 断言）。
- GR2 新增候选=一条 SetStartupEntriesCommand 以 0 建键（undo 删键恢复 composer、redo 复建）；改值
  Enter+blur 单命令；删除单命令；互不粘连、其他键逐键不变。
- GR3 PAL 真实零候选态只显示空态不渲染 composer（含 disabled）；长合并 label（多物品名拼接）在选项
  列表与选中回显两处有界/省略+完整 tooltip；720px 空态/repair/可搜索 popup（键盘+Escape）不横向溢出。

输出：聚焦测试先行 → editor 全量/typecheck/DS gate 各一次 → PAL 真实工程（零候选态）+ 含
drawFromResourcePool 的本地 fixture（多候选/长名称/搜索键盘/undo-redo）验证 → build 摘要写回任务卡，
转 review。未获三方 accept 前不得标 done。
```
- 2026-08-24 GLM（覆盖/数据/测试矩阵）: 审查完成，签 **premise verified + design agree
  （附 GP1-GP2）**。ASSET_ROLES 12 项独立枚举（audio 9+video 2+visual 1）vs :1686 写死
  "8 项"实锤；raw btn 三处/跳转预览/逐字符 dispatch 独立确认；midi/audio preview 通道
  可复用（KP1 可行）；入口原子 commit 边界完好。GP1 钉分组由结构派生+第四类前缀自动红；
  GP2 钉试听单通道与不写 WorldState 断言。**build 硬前置：ED-DS-3/FIELD-COMMIT 公共
  合同落地**。未改实现，未代签 Kimi。
- 2026-08-25 GLM（设计刷新重签）: 按 2026-08-25 三摘要卡新设计完成独立审查并重签
  **premise verified + design agree（附 GPS1-GPS2）**。现状裸 token/写死 8 项/重复分支
  实锤；三卡字段逐项核验全部可从 live canonical state 派生（lookupText/ASSET_ROLES 对照/
  role→label 现有映射/validate.ts:206 scene 校验），零新增 schema；ARCH-SEED 冻结域消费
  确认。GPS1 钉 scene 损坏判定单源；GPS2 钉可选待配置与类型错误不混淆。未改实现，未代签
  Kimi。
- 2026-08-26 GLM（验收返工重签）: 按 2026-08-26 返工合同完成独立审查并重签 **premise verified +
  design agree（附 GM1-GM3）**。buildWorld 消费域全库 grep 唯一（非队伍 seed=运行时死数据）、
  validator 允许合法 orphan、removeParty 遗留 orphan 实锤、SetStartupEntriesCommand 单命令原子性、
  三 composer 36/30 混排 + boundary/adoption 门禁缺口 + 版本漂移全部一手核验；**新发现库存/资源
  重复行两处同类混档（:776/:804、:893/:905）** → GM1 钉 density census 闭包、GM2 钉 orphan 三态
  矩阵、GM3 钉原子清理断言。三签齐（Codex + Kimi K-R1-K-R4 + GLM），准入 **allowed**，状态转
  build。未改实现，未代签 Kimi。
- 2026-08-26 GLM（资源交互返工重签）: 完成“初始世界资源”交互返工独立审查并重签 **premise verified +
  design agree（附 GR1-GR3）**。resources 无 registry、worldResourceValue 唯一消费入口（战斗拒绝/
  craftRecipe 不沾/migrate 零生成）、collectValue schema 级保留、三 manifest resources 全空、全库仅
  紫金葫芦 collectValue 一条消费——全部一手复现；构造 spiritWater/treasurePoints fixture 实跑派生
  得到去重可读候选（item.name 主标签有库内先例）。未发现第二消费域，无 counter。Codex + GLM 已签，
  待 Kimi；未修改实现，未代签。

## 下一位 Agent 提示词（2026-08-27 用户验收增量补审）

```text
请联合只读补审 ED-PROJECT-STARTUP-IA-1 + ED-REORDER-DRAG-1 的用户验收增量。

任务卡：
- docs/ops/archive/tasks/done/ED-PROJECT-STARTUP-IA-1-project-entry-startup-workbench.md
- docs/ops/archive/tasks/done/ED-REORDER-DRAG-1-editor-sortable-collection-drag-handles.md
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

无下一位 Agent 提示词；Codex / Kimi / GLM 三方审查与用户验收均已完成。后续工作按独立 successor
`ED-ADD-PICKER-DIALOG-1` 的签字、范围与证据推进，不重开本卡。
