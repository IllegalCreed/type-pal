# ED-PROJECT-STARTUP-IA-1 - 入口与开局 / 全局资源与启动工作台收口

Status: review（2026-08-26 Codex 验收返工 build、自测与 PAL/Design Lab 视觉验证完成；待 Kimi + GLM 正式 review accept）
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
  - “加入队伍 / 添加道具 / 添加资源”三类 composer 迁入公共 `DsInlineComposer` recipe；选择/输入与尾部动作
    由一个 density owner 决定，同行必须同尺寸同高，禁止业务页给其中一个按钮单独使用 `compact`。
    静态/recipe 门禁必须含 mixed-density 负例。
  - 库存、资源值复用标准重复行与标准新增/删除动作，窄宽度不折断动作。
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
  - 不把自由世界资源键伪装成预制枚举；若功能价值不足，须以证据删除而非继续堆说明。

## 前提真值门

### 一句话行为 / 工程前提

- 当前 `entryPoints` 已是唯一完整入口表，`defaultEntryId` 只选择默认入口；本卡只改作者交互与信息层级，不改变这条
  数据真值，也不把项目设置页做成第二套运行时流程编辑器。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：这是二阶段项目作者工具；原版只提供内容参考，不定义本工作台 IA。 | `docs/phase2/READ-FIRST.md:1` |
| 第一阶段 | N/A：一阶段没有该 manifest 作者工作台；本卡不改变游戏内标题菜单形态。 | `docs/phase2/READ-FIRST.md:32` |
| 当前二阶段 | `EntryPoint.startWorld` 必填且完整，`defaultEntryId` 只选择；角色初始技能已归 `ActorDef.initialMagic`，入口只持有队伍、当前 HP/MP 稀疏覆盖、物品、资源和金钱。当前概览仍直接显示 `s000`、`assets.roles`、写死“编辑 8 项设置”，并用“启动分支”重复前两行。 | `packages/content/src/character.ts:52-77,89-96`；`packages/editor/src/ui/ProjectWorkbenchTab.tsx:1587-1631`；`docs/ops/tasks/ARCH-ENTRY-ACTOR-SEED-1-entry-actor-initial-state.md:163-167` |
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
  每个队员只出现一次并在成员行内编辑紧凑的当前 HP/MP，移出时原子清理该角色覆盖。
- 代表场景: 编辑默认入口队伍与初始库存；在全局资源中试听默认战斗音乐；项目概览跳到对应唯一作者页。
- 用户裁决: 2026-08-24 用户要求将入口、开局、全局资源与启动缺陷系统收口；2026-08-25 用户明确指出
  `s000`、`assets.roles` 等普通人无法理解，要求重做摘要并展示重要、直观的信息；2026-08-26 用户确认
  队伍与当前 HP/MP 应合并，并批准按成员行方案开始返工。

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
  `docs/phase2/editor/editor-design-system-v1.md:181-183`；`packages/editor/src/ui/design-system/tokens.css:47-48`；
  `packages/editor/src/ui/design-system/boundary.test.ts:34-56`。
- 最强替代解释: 保留孤立覆盖可让作者稍后重新加入同一角色时恢复值；schema/validator 也尚未要求
  `seedStats` key 必须属于 party，因此已有外部 canonical 输入不能被新 IA 静默隐藏。新“移出成员”动作按用户裁决
  清理本角色覆盖，并由 undo 提供恢复；对打开时已经存在的孤立覆盖，界面必须显示警告/清理行并保留明确修复路径。
- 可证伪观察: 若存在正式入口流程需要为未入队角色预设当前 HP/MP，或 runtime/reserve 会消费这些覆盖，则必须
  停线并另开 schema/ownership 设计；当前源码未发现该消费链。

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
  - `docs/ops/tasks/ARCH-ENTRYPOINT-CANONICAL-1-canonical-entry-model.md`
  - `docs/phase2/editor/editor-design.md:210`
  - `docs/phase2/editor/editor-design-system-v1.md:340`
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
  - 加入队伍、添加道具、添加资源的同行选择/输入与按钮在 default/compact 任一合法 density 下必须同高；本卡
    采用公共 `DsInlineComposer`，不能通过三个页面局部 size 补丁达成。自动测试必须证明 mixed-density fixture
    会失败；新增 recipe 按 DS-G.4 升 minor，并同步文档、代码常量与 CSS token 版本。
  - 库存、资源使用同一重复行合同；删除动作不换行，空态与新增路径清楚。角色初始技能只由
    `ActorDef.initialMagic` 持有，入口页不显示或保存技能快照。
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
  - 连续字段命令次数遵守 `ED-FIELD-COMMIT-1`。
  - 概览专项测试覆盖正常/缺损默认入口、单/多入口、资源全齐/缺失、长名称；断言机器 token 和写死数量不出现，
    三张卡及两个导航动作读取 live manifest，入口/资源变化后摘要同步刷新。
- 文档:
  - 更新 `docs/phase2/editor/editor-design.md:210`，删除“八项/四组”等过期描述并记录实际数据驱动合同。
- 视觉 / 手工验证:
  - PAL 真实工程下 1280、900、720px 检查两页与概览；无横向溢出、按钮折行、行高不齐、不可滚动或 popup 裁切。
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

### 进入 done 前:审查签字

- Codex: **accept（2026-08-26，本轮返工 candidate）**。直接核对实现与运行证据：canonical schema/runtime
  未改；成员行合并当前 HP/MP，移出通过同一次 `patch({party,seedStats})` 落为一条
  `SetStartupEntriesCommand`，pointerdown 阻止 dirty draft blur 幽灵提交；已有 orphan 按未入队/不可参战/
  角色缺失三态显式呈现并逐项可撤销清理。`DsInlineComposer` 父级注入单一 density 并拒绝 control/action
  显式 `size`，成员/库存/资源/orphan 重复行统一消费 `DsRepeatRow`；规范、代码常量、CSS token 与 Design Lab
  均为 v2.11.0。聚焦 3 files / 108 tests、Editor 全量 158 files / 1209 tests、typecheck、DS gate、build、
  PAL 1280/900/720 与 Design Lab default/compact 几何均通过；无 console error。
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
- 结论: agree（2026-08-25 按刷新后合同重签，KI1-KI2 已写回；GLM GPS1-GPS2 互补）
- 必改项: 无新增；KI1（资源角色 label 单一来源）、KI2（起始位置健康态不显示裸 scene id）、
  KP1（试听单通道）、GPS1（场景损坏判定单一真值源）、GPS2（待配置≠错误）为 build 必落钉。
- 是否建议进入 build: 是（三签齐，前置合同已全部落地）

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件:
  - `packages/editor/src/ui/ProjectWorkbenchTab.tsx` / `.test.tsx`、`editor.css`、
    `design-system/primitives.css`、`design-system/field-commit-adoption.json`。
  - `packages/editor/src/ui/project-asset-roles.ts` / `.test.ts`、`project-role-groups.test.ts`。
  - `packages/editor/src/core/project-diagnostics.ts` / `.test.ts`。
  - `packages/editor/src/core/audio-preview-session.ts` / `.test.ts`、
    `ProjectAudioPreviewButton.tsx` / `.test.tsx`、`MusicPicker.tsx` / `.test.tsx`、
    `SoundPicker.tsx` / `.test.ts`、`AudioAssetWorkbench.tsx` / `.test.tsx`。
  - `packages/editor/src/ui/design-system/adoption.test.ts`、`docs/phase2/editor/editor-design.md`。
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
- 聚焦测试:
  - `pnpm --filter @type-pal/editor exec vitest run src/ui/design-system/recipes.test.tsx
    src/ui/design-system/boundary.test.ts src/ui/ProjectWorkbenchTab.test.tsx`
  - **3 files / 108 tests passed**（红测先证明缺口，实施后两轮全绿）。
- 最终验证（各只运行一次）:
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
  - 实机字段：Escape 后值恢复空且 undo 仍 disabled；Enter 提交 `149` 后 undo/redo 为 `空 → 149 → 空`，
    未执行保存；PAL 与 Design Lab console error 均为 0。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: Codex 本轮返工自验 accept；等待 Kimi + GLM 对 K-R1-K-R4 / GM1-GM3 正式复审。
- 必须返工项: pending reviewer findings。
- Accept / rework: pending Kimi + GLM。

## 用户验收

- 用户结论: 2026-08-26 上一 candidate 的角色初始状态语义验收通过；入口工作台视觉验收提出本轮返工并批准
  按 Codex 推荐方案推进，整卡尚未验收。
- 后续任务: 2026-08-26 返工 build 已完成并转 review；Kimi + GLM 分别 accept 后交用户验收并收口。

## 交接日志

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

## 下一位 Agent 提示词

```text
请联合复审 ED-PROJECT-STARTUP-IA-1 的 2026-08-26 验收返工实现。
任务卡：docs/ops/tasks/ED-PROJECT-STARTUP-IA-1-project-entry-startup-workbench.md
当前状态：review；分支 codex/ed-project-startup-ia-1；实现 Owner Codex。你是只读 reviewer，不得修改实现文件、
不得代签另一席、不得标记 done。

先读：AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、docs/ops/board.md、本任务卡的“验收返工前提补充”
“验收返工 build 准入签字”“2026-08-26 验收返工增量”，以及 editor-design-system-v1.md 的
DS-F.4 / DS-L.7 / DS-G.4。以当前分支实际 diff 与一手测试为准，不复述 Codex 结论。

重点独立核查：
1) K-R1/K-R4：focused dirty draft 后移出只产生一条 SetStartupEntriesCommand，party + 本 actor seed 同删，
   空 map→undefined；undo 恢复旧 seed，redo 同删，再加入是 seed 缺席/继承而非 undo 状态。
2) K-R2/K-R3：DsInlineComposer 父级唯一 density，control/action 任一显式 size 均失败；桌面 intrinsic、<480px
   单列；DS 文档/index/token/Design Lab 版本均为 2.11.0。
3) GM1：census 必须含三 composer、成员、库存、资源、orphan 重复行，不能只查截图点名处；不存在
   project-repeat-composer/project-repeat-row/project-seed-row 回流。
4) GM2/GM3：未入队 battler、无 battler、缺失 actor 三态都可见且逐项单命令清理；其他 seed key 保持，
   remove/undo/redo/re-add 各步形状合法。
5) schema/runtime/ActorDef ownership 未漂移，项目页没有技能/装备/属性/最大值快照通道。

现有证据：聚焦 3 files/108；Editor check 158 files/1209 + typecheck；DS gate 87 files/3 allowlist；build；
PAL 1280/900/720 与 Design Lab v2.11.0 两档几何、Escape/Enter/undo/redo、console 0 error。

请各自把独立结论写回任务卡“进入 done 前:审查签字”：accept，或 counter + file:line / 可复现测试 / 视觉
证据与明确返工项。Kimi + GLM 两席未全部 accept 前不得标 done；不得开始下一张实现卡。
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
