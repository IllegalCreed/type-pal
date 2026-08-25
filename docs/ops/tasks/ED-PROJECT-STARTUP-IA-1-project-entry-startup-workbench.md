# ED-PROJECT-STARTUP-IA-1 - 入口与开局 / 全局资源与启动工作台收口

Status: build（2026-08-26 三签与 ARCH-ENTRY-ACTOR-SEED-1 用户验收齐；Codex 单 Owner 实现）
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
可撤销的作者工作流：有序队伍用列表管理，库存/技能/世界资源使用标准重复行，全局音乐与音效都可原位试听，所有
增删、输入、帮助、响应式与滚动行为遵守统一设计系统。

## 范围

- 范围内:
  - “入口与开局”：默认入口标识、入口列表操作、队伍顺序、库存、初始技能、世界资源和现有 HP/MP 覆盖的 IA/控件收口。
  - 队伍改为“有序成员列表 + 可搜索添加器”，不再铺满候选 checkbox；上移/下移/移除保持稳定顺序。
  - 库存、技能、资源值复用标准重复行与标准新增/删除动作，窄宽度不折断动作。
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
  有序添加/重复行/原位试听，以及“默认开局/标题菜单/启动资源”三张可读摘要卡。
- 代表场景: 编辑默认入口队伍与初始技能；在全局资源中试听默认战斗音乐；项目概览跳到对应唯一作者页。
- 用户裁决: 2026-08-24 用户要求将入口、开局、全局资源与启动缺陷系统收口；2026-08-25 用户明确指出
  `s000`、`assets.roles` 等普通人无法理解，要求重做摘要并展示重要、直观的信息。

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
  - 库存、技能、资源使用同一重复行合同；删除动作不换行，空态与新增路径清楚。
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

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理:
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

- 页面仍采用左侧真实对象/分组、中央标题与主编辑、必要时右侧 Inspector 的统一壳；启动链退为紧凑摘要和帮助。
- 队伍采用 ordered collection；候选角色通过搜索/选择添加，选中成员行动作复用标准 reorder/remove 控件。
- 库存/技能/资源使用同一 `repeatable row` recipe；选择/值/动作保持单行，窄容器按规范降为明确的上下块。
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
- 修改文件: pending
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: pending

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: 角色完整初始状态由 `ARCH-ENTRY-ACTOR-SEED-1` 独立决定。

## 交接日志

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
接手任务: ED-PROJECT-STARTUP-IA-1 入口与开局 / 全局资源与启动工作台收口
任务卡: docs/ops/tasks/ED-PROJECT-STARTUP-IA-1-project-entry-startup-workbench.md
当前状态: build；刷新合同三签与 ARCH-ENTRY-ACTOR-SEED-1 用户验收均已完成
你的角色: Codex（唯一 Coding Owner）
先读: AGENTS.md、docs/phase2/READ-FIRST.md、ARCH-ENTRYPOINT-CANONICAL-1、ARCH-ENTRY-ACTOR-SEED-1、
      ED-DS-3、ED-FIELD-COMMIT-1、本任务卡、ProjectWorkbenchTab.tsx:1332-1631
已完成: DS/FIELD 公共合同已 done；ARCH actor ownership 已获三方 review accept；用户新增裁决要求概览删除
        s000/assets.roles/写死数量/重复启动分支，改为默认开局、标题菜单、启动资源三张直观摘要卡；
        Kimi（KI1-KI2）与 GLM（GPS1-GPS2）已按刷新合同独立重签
请你做: 实现队伍/库存/资源/试听工作流和三张摘要卡，确保所有字段由 live
        canonical state 派生，并覆盖角色/物品显示名、资源三态、长名称/窄宽、焦点、撤销和两个唯一导航闭环
不要做: 不得恢复入口继承/伪入口/fallback；不得增加 schema；不得用机器
        token、写死数量或页面局部保存
输出要求: 独立提交；聚焦测试、最小功能界面验证与 Build / Review 证据；实现后转 review，等待三方 accept
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
