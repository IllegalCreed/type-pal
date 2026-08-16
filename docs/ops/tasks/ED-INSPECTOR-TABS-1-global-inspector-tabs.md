# ED-INSPECTOR-TABS-1 - 属性面板共享 Tab 全局统一

Status: done
Owner: Codex
Reviewer: Kimi（架构 / 视觉）+ GLM（覆盖 / 测试）
Phase: phase2
Capability: Editor cross-cutting（不改变 capability-map）
Visual Verification Timing: dev-functional

## 目标

把第二阶段编辑器中“标题随正文滚动、多个语义模块纵向堆叠、业务页私有实现 Tab”的 Inspector 收敛为一个
canonical 结构：固定对象类型与对象名称、固定共享 Tab、仅当前 Tab 正文纵向滚动。保留全部业务命令、引用跳转、
删除阻断、资源替换、撤销重做、深链与选择状态；全局收口完成前不得把首批页面称为“属性面板 Tab 已统一”。

## 范围

- 采用唯一共享结构 DsInspectorTabs（内部复用 DsTabs variant="inspector"）；业务页不再手写
  tablist/tab/tabpanel、roving focus、hover/focus/active 皮肤或 Tab ref 数组。
- 固定骨架：inspector inspector--tabbed → .insp-head（对象类型 + 对象名称）→ DsInspectorTabs → 当前
  panel 正文。标题与 Tab 不滚动，panel 是 Inspector 顶层唯一纵向滚动 owner；地图瓦片/组合等明确有边界的
  大列表可保留其内部列表滚动，但不得再包第二层无边界的同向滚动。
- 引用/问题数量允许进入 Tab 标签，如“引用 8”“问题 3”；计数不得改变引用收集或删除守卫真值。
- 实现分三批，但同属本卡完成条件：
  1. A（用户指定首批）：Item、Map、WorldSprite、BattleSprite 私有 Tab 迁移；Skill、Poison、Image 新增
     shared Inspector Tabs。
  2. B（同族补齐）：Music、Sound、Cutscene、Actor、Shop。
  3. C（全局收口）：Tileset、Stamp、Project overview/startup/entrypoint/advanced。
- 保持不 Tab 化的页面也必须留在审计表并写明理由；若 build 时当前 DOM 已变化，先更新本卡证据与分类，再改实现。
- 清理 editor.css 中 .item-inspector-tabs、.map-inspector-tabs、.battle-inspector-tabs 及其旧
  button/hover/focus/active 规则；删除或改写不再拥有滚动权的 .item-inspector-scroll、
  .map-inspector-panel 规则和测试中的旧私有 selector。
- 新增设计系统边界门禁：上述三种私有 class 在业务 TSX/CSS 中为零；迁移清单内不得手写 Inspector
  role="tab"；每个目标文件必须消费 DsInspectorTabs。
- 不改 schema、save/migration/asset pipeline、Reforge runtime、工程内容或试玩协议；不新增兼容 API，
  不保留 shared/private 两套 Inspector Tab。
- 当前工作树所有既有改动均属用户。相关目标文件目前也已修改；Coding Owner build 前必须逐文件重读，
  只做最小增量 patch，不覆盖、回滚、格式化或整理无关 diff。

## 前提真值门

### 一句话行为 / 工程前提

当前二阶段已有一套可表达固定标题、固定 Tab、独立滚动 panel 和完整键盘语义的共享组件，但生产 Inspector 仍并存
共享、私有和纵向堆叠三种结构；全局迁到现有 canonical 组件即可统一用户可见行为，无需引入第二套 API。

### 四向真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：原版游戏没有现代作者编辑器或 Inspector Tab 交互，不能提供本任务 UI 真值。 | docs/phase2/READ-FIRST.md:8-11,20-22 |
| 第一阶段 | N/A：第一阶段约束游戏忠实还原，不定义第二阶段作者工具的信息架构；本任务不改变游戏机制。 | CLAUDE.md:5-17；docs/phase2/READ-FIRST.md:20-22,33-35 |
| 当前二阶段 | DsTabs 已集中 ArrowLeft/Right、Home、End、roving tabindex 与 ARIA id；DsInspectorTabs 已集中 linked panel 和 hidden 状态；shared CSS 已提供 flex/min-size/单 panel scroll。Enemy 与 Scene entity 已消费它。与此同时 Item/Map/WorldSprite/BattleSprite 手写同类交互，Skill/Poison/Image 等仍堆叠。 | packages/editor/src/ui/design-system/controls.tsx:1211-1288；recipes.tsx:253-295；recipes.css:47-75；EnemyTab.tsx:1135-1146；App.tsx:2808-2847；ItemTab.tsx:1849-2024；MapMode.tsx:1302-1327,3312-3831；WorldSpriteLibrary.tsx:471-483,645-675；BattleSpriteLibrary.tsx:1135-1149,1389-1417；SkillTab.tsx:1278-1306；PoisonTab.tsx:531-560；ImageTab.tsx:616-713 |
| 本任务目标 | 长且包含多个语义模块的 Inspector 全部使用同一 shared Tab 骨架；单一、短 Inspector 和没有 Inspector 的页面明确留在审计表。对象标题与 Tab 固定，只有当前 panel 滚动，无横向滚动/宽度溢出/高度坍塌；业务闭环不变。 | 用户 2026-08-16 本轮确认的 10 条统一规则与测试/交付要求；docs/phase2/editor/editor-design-system-v1.md:53-70,212-224,520-544,564-578,660-679 |

### 当前 before -> 目标 after

三套 Tab/堆叠结构 + 有的标题随内容滚动 + 私有键盘/CSS -> 固定对象标题 + 唯一 shared Tab + 当前 panel 独立滚动。

代表场景：在 1280px 三栏的 Poison 右栏，从“引用”切到“关系”再到“说明”，标题“毒 / 当前名称”和 Tab 始终
留在顶部；滚动只影响当前正文；键盘 ArrowLeft/Right、Home、End 可完整切换，引用跳转和删除阻断不变。

### 最强替代解释 / 可证伪观察

- 最强替代解释 1：只迁用户点名的 7 个实现即可，其他 Inspector 都足够短。反证：Music/Sound 同时堆叠资源与
  引用；Cutscene 堆叠资源、媒体、内容动作、引用与诊断；Actor、Tileset、Stamp、Project Inspector 也存在长列表
  和第二语义模块，见下方 24 页矩阵。若 build 前逐页复核证明这些模块在最窄 Inspector 和 150% zoom 下无需
  滚动且只有一个语义任务，可更新本卡降级为“无需 Tab”，否则必须迁移。
- 最强替代解释 2：保留各页私有 DOM，仅把 class 改成共享外观风险更小。反证：私有实现仍各自拥有键盘、ARIA、
  focus ref 和滚动权，无法由一处契约测试防回归；用户明确禁止每模块维护自己的交互和样式。
- 最强替代解释 3：给 DsInspectorTabs 再加 legacy/private 兼容入口能减少改动。反证：项目尚未上线且只支持
  canonical 版本；双 API 会把本次清理永久化。若现有 DsInspectorTabs 无法承载某页，应先以真实 DOM 证明
  缺口，再只扩展唯一 canonical API 并同步全部契约测试，不能保留第二入口。
- 推翻当前前提的观察：当前生产路由不再调用列出的业务组件，或 shared 组件无法在不改变业务挂载/命令语义的
  情况下表达其中一个 Inspector。出现任一情况即回到 draft/blocked，更新调用域和设计签字，不在 build 中猜。

### 是否主动偏离已核真值

yes，且用户已于 2026-08-16 明确裁决。ED-BATTLE-UI-1:85 的旧结论是“不要为 Skill/Enemy/Poison 的
主工作区视觉统一虚构 Tab”；本任务的新规则只对长、多语义的 Inspector 做渐进披露，不把中央字段任意
Tab 化。新行为以上述 before -> after 为准，旧结论保留为历史记录但不阻断本卡。

## Inspector 全量审计清单（build 前工作树，2026-08-16）

判定口径：按 editor-navigation.ts:67-268 的 8 模块 / 24 二级页逐项核对；同一 asset/sprite 页的 world / battle
两个真实实现分别列出。“Tab 化”表示本卡 done 前必须落地，不代表当前已实现。

| 模块 / 页面 | 当前 Inspector | 判定与 canonical Tab | 当前证据 |
|---|---|---|---|
| scene / workspace | 实体已使用 shared；放置态是单一放置流程 | 已 Tab 化，防回归：实体“属性 / 生命周期 / 行为”；放置态不强行 Tab | App.tsx:2253-2274,2808-2847 |
| scene / ambience | 页面只有列表 + 主表，无 Inspector | 无需 Tab：没有右栏 | AmbienceTab.tsx:41-129 |
| map / workspace | 私有 3 Tab、私有键盘/ref；无固定地图标题 | Tab 化：“属性 / 瓦片 / 组合”；补固定“地图 / 名称”，保留 activateInspectorTab 副作用 | MapMode.tsx:221-227,1302-1327,3312-3831 |
| map / tileset | 上传/选中状态纵向堆叠；选中态含登记、说明、资源动作、全工程引用扫描 | Tab 化：选中态“资源 / 引用”；上传态是单一导入工作流，不虚构 Tab | TilesetTab.tsx:633-797,798-985 |
| map / stamp | 登记、来源引用、复制/删除确认纵向堆叠 | Tab 化：“属性 / 引用 n / 动作” | StampLibraryTab.tsx:521-715 |
| story / scripts | canonical 右栏仅作者元数据/删除；legacy fallback 另有调用位置 | 无需 Tab：canonical 是单一元数据任务；SharedScriptTab 是非 canonical fallback，不在本卡新增能力，另列旧版本清理风险 | CanonicalSharedScriptTabV5.tsx:435-507；DataMode.tsx:475-568；SharedScriptTab.tsx:857-995 |
| story / vars | 页面只有目录 + 主引用表 | 无需 Tab：没有右栏 | VarsTab.tsx:85-140 |
| story / events | 页面只有目录 + 指令手册 | 无需 Tab：没有右栏 | EventLibTab.tsx:12-78 |
| actor / workspace | 身份资源、分区导航、当前摘要、引用纵向堆叠 | Tab 化：“摘要 / 引用 n”；主工作区已有任务 Tab 不与 Inspector Tab 混用 | ActorMode.tsx:1060-1169 |
| item / item | 私有“概览 / 引用 / 资源”与私有键盘/CSS | Tab 化：保持三分区，迁到 shared | ItemTab.tsx:335-345,1849-2024 |
| item / shop | 当前店铺、定价规则、剧情调用、撤销说明纵向堆叠 | Tab 化：“摘要 / 说明”；固定“商店 / 当前店铺”标题 | ShopTab.tsx:208-248 |
| battle / skill | 引用与编辑说明纵向堆叠，无固定对象标题 | Tab 化：“引用 n / 说明” | SkillTab.tsx:1278-1306 |
| battle / enemy | 已使用 shared，固定标题 | 已 Tab 化，防回归：“敌队 / 引用 n / 说明” | EnemyTab.tsx:1135-1146；EnemyTab.test.tsx:248-254 |
| battle / poison | 引用、说明、全局关系纵向堆叠，无固定对象标题 | Tab 化：“引用 n / 关系 / 说明” | PoisonTab.tsx:203-270,531-560 |
| battle / battlefield | 仅引用列表、删除说明，一个语义任务 | 无需 Tab：单一引用 Inspector；保留引用跳转/删除阻断 | BattleFieldTab.tsx:439-473 |
| asset / sprite (world) | 私有“动作 / 引用 / 源资源”，标题随 active Tab 改变 | Tab 化：保持三分区；标题改为固定“大世界精灵 / 当前定义或资源名” | WorldSpriteLibrary.tsx:44,68-72,471-492,645-675 |
| asset / sprite (battle) | 私有“动作 / 引用 / 源文件” | Tab 化：保持三分区，迁到 shared | BattleSpriteLibrary.tsx:61,126-130,1135-1149,1389-1417 |
| asset / image | 资源/替换删除与引用/诊断纵向堆叠 | Tab 化：“资源 / 引用 n” | ImageTab.tsx:616-713 |
| asset / music | 资源元数据与引用纵向堆叠 | Tab 化：“资源 / 引用 n” | MusicTab.tsx:313-364 |
| asset / sound | 资源元数据与引用/诊断纵向堆叠 | Tab 化：“资源 / 引用 n” | SoundTab.tsx:309-365 |
| asset / cutscene | 资源、媒体/动画、替换删除、引用、诊断纵向堆叠 | Tab 化：“资源 / 引用 n / 诊断 n” | CutsceneTab.tsx:643-827 |
| project / overview | 最多 30 条工程问题 + 下一步动作纵向堆叠 | Tab 化：“问题 n / 下一步” | ProjectWorkbenchTab.tsx:150-168,817-847,1666-1682 |
| project / startup | 最多 30 条工程问题 + 编辑边界纵向堆叠 | Tab 化：“问题 n / 边界” | ProjectWorkbenchTab.tsx:817-847,1442-1458 |
| project / entrypoint | 最多 30 条工程问题 + 字段归属纵向堆叠 | Tab 化：“问题 n / 字段” | ProjectWorkbenchTab.tsx:817-847,1243-1252 |
| project / advanced | 最多 30 条工程问题 + 保存契约纵向堆叠 | Tab 化：“问题 n / 契约” | ProjectWorkbenchTab.tsx:817-847,1666-1692 |

补充边界：MissingEditorTarget、DataMode 未实现占位和 Scene 放置 palette 是短暂状态/单一工作流，不强行 Tab；
ScriptV5BehaviorInspector、ScriptV5SceneHookInspector、SpriteFrameWorkbench、CanonicalFlowBodyTabsV5 是主工作区
内部编辑器，不是 shell 右栏 Inspector，不纳入本卡，也不得误删其业务 Tab。

## 设计与覆盖方案

### Canonical DOM / 状态

~~~tsx
<aside className="inspector inspector--tabbed domain-inspector">
  <div className="insp-head">
    <div className="what">对象类型</div>
    <div className="who">对象名称</div>
  </div>
  <DsInspectorTabs
    id="generated-domain-inspector-id"
    label="对象属性分区"
    activeId={inspectorTab}
    onChange={setInspectorTab}
    items={items}
  />
</aside>
~~~

- activeId 仍由领域组件持有；跨 Tab 业务跳转继续调用同一个 setter/领域 wrapper。
- Map 的 onChange 必须继续走 activateInspectorTab，保留首次访问组合、清候选菜单、请求打开 Inspector；只删除
  键盘 handler 和 ref 数组。World/Battle/Item 的选择、深链默认 Tab 与跨 Tab 动作保持现状。
- 非活动 panel 使用 shared 组件现有 hidden 合同；不得复制第二棵响应式 DOM。若某页因 hidden-but-mounted 触发
  可观察副作用，先补回归测试，再在唯一 canonical 组件内解决，不恢复私有 panel 实现。
- 所有 panel 内容根 min-width: 0；长 ID/路径使用现有 ellipsis/title 或语义换行。不得以整个 Inspector
  overflow-x: hidden 掩盖真实 width 溢出；浏览器验收必须同时检查 scrollWidth <= clientWidth。

### 预计实现文件

- 共享/门禁：packages/editor/src/ui/design-system/recipes.test.tsx、controls.test.tsx、
  boundary.test.ts；仅在真实缺口成立时才改 recipes.tsx、recipes.css、controls.tsx、primitives.css。
- 批 A：ItemTab.tsx/test、MapMode.tsx/test、WorldSpriteLibrary.tsx/test、
  BattleSpriteLibrary.tsx/test、SkillTab.tsx/test、PoisonTab.tsx/test、ImageTab.tsx 及新增/对应测试。
- 批 B：MusicTab.tsx、SoundTab.tsx、CutsceneTab.tsx、ActorMode.tsx/test、ShopTab.tsx/test
  及资产页新增/对应测试。
- 批 C：TilesetTab.tsx/test、StampLibraryTab.tsx/test、ProjectWorkbenchTab.tsx/test。
- 样式：packages/editor/src/ui/editor.css 只保留领域内容布局，删除私有 Tab 皮肤和重复滚动 owner。

### CSS / API 清理清单

- 删除 .item-inspector-tabs 全组、.map-inspector-tabs 全组、.battle-inspector-tabs 全组。
- 删除旧 .item-inspector-scroll { overflow: auto }；内容 section class 可保留，但滚动归 shared panel。
- .map-inspector-panel 不再承担 ARIA/hidden/外层滚动；tiles/stamps 的明确子列表滚动需保留可见边界并验证无
  双滚动。旧 [hidden] 规则由 shared recipe 单点拥有。
- 测试不再通过三种私有 class 找 Tab；统一从相应 Inspector 的 labelled tablist / role="tab" 查询。
- 不新增 legacyInspectorTabs、privateTabs、兼容 prop、旧 class alias 或一页一份的 Tab CSS。

## 验证

### 自动测试

1. Shared contract：tablist/tab/tabpanel、双向 aria-controls / aria-labelledby、唯一可见 panel、点击、
   ArrowLeft、ArrowRight、Home、End、roving tabindex、focus-visible class/style contract。
2. 每个迁移实现至少一条领域级切换测试：正确标签/计数、点击与键盘、非活动 hidden、固定标题位于
   DsInspectorTabs 之前；不得只依赖 shared unit test。
3. 业务回归：
   - Item/Skill/Poison/Enemy/Actor/Shop：引用跳转、删除阻断、创建/删除、undo/redo、选择恢复。
   - Map/Stamp/Tileset：Tab 副作用、选择/工具状态、引用扫描、替换/移除、undo/redo。
   - Image/Music/Sound/Cutscene/Sprite：资源替换、引用禁删、未引用删除、深链默认 Tab、动作引用跳转。
   - Project：问题跳转、各 page contextual 动作、对象深链与选择不变。
4. Static boundary：三种私有 class 为零；15 个迁移组件均消费 DsInspectorTabs；除 App 内非 Inspector
   业务 Tab 外，迁移组件不得手写 role="tab"。
5. 命令：
   - pnpm --filter @type-pal/editor typecheck
   - 聚焦 Vitest（shared + 每批目标文件）
   - pnpm --filter @type-pal/editor test

### 浏览器最小验收

- 本地编辑器真实工程；Wide、1280px 三栏、Inspector 最窄可调宽度、125% 和 150% zoom。
- 每批至少一页；全局收口时覆盖 24 页矩阵中所有“Tab 化”页，asset/sprite 的 world/battle 两域都验。
- 对每页滚动 active panel 到中/底部，记录 .insp-head 与 tablist bounding rect 不变，panel scrollTop > 0；
  Inspector 与 document 均无横向滚动，Tab/正文高度非 0。
- 检查长名称、64 字符 id、120 字符路径、引用计数、空/错/加载态；检查 keyboard focus ring 与当前 Tab。
- 浏览器证据写入本卡（viewport、zoom、页面、步骤、截图路径/数值）；功能性界面允许开发期最小验证。

### 本轮 draft 自检

- 已按当前工作树静态复核 8 模块 / 24 二级页和两个 sprite domain；未启动实现、typecheck、Vitest 或浏览器。
- 文档改动后运行 git diff --check -- docs/ops/board.md
  docs/ops/tasks/ED-INSPECTOR-TABS-1-global-inspector-tabs.md。

### Build 实现结果（2026-08-16，Codex）

**全量收口结果：**

| 分类 | 页面 / 实际表面 | 结果 |
|---|---|---|
| 本卡迁移 | Map workspace、Tileset、Stamp、Actor、Item、Shop、Skill、Poison、WorldSprite、BattleSprite、Image、Music、Sound、Cutscene、Project overview/startup/entrypoint/advanced | 15 个业务组件、18 个实际 Inspector 表面全部消费唯一 `DsInspectorTabs`；标题固定在 Tab 前，正文由 shared panel 单独滚动。Tileset 上传态和 Stamp 空态仍保持单一流程，不虚构 Tab。 |
| 已有 shared、防回归 | Scene entity、Enemy | 保留原 shared 结构；本卡没有拆出第二 API。 |
| 无需 Tab | Scene ambience、Story scripts/vars/events、Battle battlefield，以及临时 Missing/DataMode/Scene 放置态 | Ambience/vars/events 无右栏；canonical scripts 与 battlefield 是单一短任务；临时态是单一流程。理由与上方 24 页逐项清单一致。 |
| 非 Inspector 业务 Tab | Actor 主工作区、ScriptV5 工作区、Scene canvas 工具条 | 明确排除；boundary 只禁止迁移 Inspector 的私有实现，不误伤合法业务 Tab。 |

**三批实现与行为保持：**

- A：Item、Map、WorldSprite、BattleSprite 删除手写 tablist/ref/键盘处理并迁 shared；Skill、Poison、Image
  新增 shared 分区。Map `onChange` 仍走 `activateInspectorTab`，保留组合首次访问、候选菜单清理和
  `onRequestInspectorOpen`；现有业务测试继续通过。
- B：Music、Sound、Cutscene、Actor、Shop 迁 shared。IK1 显式决策为**在 Actor「摘要」Tab 内保留
  「编辑分区」入口**，没有静默删除用户可见导航。
- C：Tileset 选中态、Stamp 选中态、Project 四页迁 shared；上传/空态不强制 Tab。
- GT5：沿用 shared 的 hidden-but-mounted 合同；Item 等既有引用、删除、撤销/恢复、资源动作测试全绿，
  未发现需要恢复条件卸载的可观察副作用。

**用户追加视觉裁决（2026-08-16）：** Tab 数量不得继续拼在标题字符串内。唯一 canonical API 新增
`DsTabItem.count?: number`，由 shared `DsTabs` 渲染 `.ds-tab__label` + 独立
`.ds-tab__count` 圆角徽标；Item/Skill/Poison/Actor/Image/Music/Sound/Cutscene/Stamp/Project 全部改传
`label` 与 `count`，业务页不维护徽标皮肤。boundary 禁止把“引用/问题/诊断”重新拼回 label；shared 与领域
测试分别断言标题和数字处于两个元素。该裁决只细化既定计数展示，不改变前提、信息架构或业务行为。

**实际改动面：**

- shared / 门禁：`design-system/controls.tsx`、`primitives.css`、`controls.test.tsx`、
  `recipes.test.tsx`、`boundary.test.ts`、新增 `inspector-tabs-test-utils.ts`。
- 业务与测试：上表 15 个业务 TSX；新增 `AssetInspectorTabs.test.tsx`，补齐/更新 Actor、BattleSprite、Item、
  Map、Poison、Project、Shop、Skill、Stamp、Tileset、WorldSprite 测试。
- CSS：`editor.css` 删除 `.item-inspector-tabs`、`.map-inspector-tabs`、
  `.battle-inspector-tabs` 全组及旧 hover/focus/active；取消 Item/Map/Shop 等重复外层纵向滚动 owner；
  视觉巡检发现 Actor tooltip 把 289px panel 撑到 344px，改为向左对齐后复测 289px = 289px。
- 未新增 legacy/private 兼容 API；`recipes.tsx` / `recipes.css` 原 canonical Inspector 骨架无需修改。

### Build 验证证据（2026-08-16，Codex）

- focused：15 files / 182 tests passed（shared controls/recipes、boundary、15 个迁移组件、资产四页）。
- `pnpm --filter @type-pal/editor typecheck`：passed。
- `pnpm --filter @type-pal/editor test`：119 files / 884 tests passed。
- 静态门禁：三种私有 class 零命中；15 个目标组件均含 `DsInspectorTabs`；迁移组件无私有 Inspector
  key handler/ref/manual id；计数 label 拼接零命中；`git diff --check` passed。
- 浏览器真实工程（应用内 Chromium，console warning/error 0）：
  - Wide 1920×1080：逐一覆盖 18 个实际 Tab 化表面；除 Stamp 当前工程 0 项、只能验空态外，所有选中态
    `scrollWidth <= clientWidth`，标题/Tab/panel 高度非零。Stamp 选中态由领域测试覆盖，不虚构数据污染工程。
  - 1280×800 三栏：Poison panel 从 `scrollTop 0 -> 620`，标题 `y=41`、Tab `y=120` 前后不变；
    document/body 无横向滚动。
  - Inspector 最窄 220px：Image panel/tablist 均 219px，`scrollWidth = clientWidth = 219`；“引用”与
    `79` 徽标仍分离，无 focus ring 裁切。
  - 125% / 150% 等效 CSS 视口 1024×640 / 853×533（应用内浏览器不暴露 zoom 控制）：Cutscene
    220px Inspector 三 Tab、双计数徽标无溢出；150% 等效下 panel `scrollTop 0 -> 106.5`，标题/Tab
    bounding rect 不变。键盘 End 切到“诊断 0”，active panel 正确，focus outline 为 2px solid。
  - 视觉证据：`/tmp/type-pal-ed-inspector-tabs-count-badge.png`（1280、Inspector 220px）。验收后已把
    Inspector 宽度恢复 290px，并清除 viewport override。

## 上下文锚点

- 决策/纪律：AGENTS.md（跨会话非小改开卡、前提门、三签、单 Coding Owner、当前 canonical）、
  CLAUDE.md、docs/phase2/READ-FIRST.md、docs/ops/agent-workflow.md、docs/ops/board.md。
- 设计系统：docs/phase2/editor/editor-design-system-v1.md:53-70,200-224,520-578,660-679；
  docs/ops/tasks/ED-DS-1-editor-design-system-spec.md；
  docs/ops/tasks/ED-DS-2-editor-design-system-foundation.md:14-69；
  docs/ops/tasks/ED-AUDIT-2-editor-systematic-audit.md:10-23,51-64。
- 历史边界：docs/ops/tasks/ED-BATTLE-UI-1-skill-workbench-redesign.md:19-26,50-85,260-298；新用户
  裁决只改变长、多语义 Inspector 的分组，不把中央主编辑区任意 Tab 化。
- Shared 真值：packages/editor/src/ui/design-system/controls.tsx:1211-1288；
  recipes.tsx:253-295；primitives.css:1018-1092；recipes.css:47-75；
  recipes.test.tsx:132-151；controls.test.tsx:422-445；boundary.test.ts:1-476。
- 当前私有 CSS：packages/editor/src/ui/editor.css:5972-6003,11389-11417,13213-13255。
- 外部 UI 审计尺：Vercel Web Interface Guidelines（2026-08-16 fresh fetch）：语义交互元素、可见 focus、
  长文本/min-width、修正而非遮蔽溢出、滚动边界。它只补充审计，不覆盖仓库冻结条款和用户裁决。
- 脏树风险：上述所有主要 TSX/test、editor.css、design-system 目录和多份规范当前已有用户改动；禁止以
  git checkout/reset/restore、整文件重写或全库 formatter 清理。

## 推进签字

- build 准入:
  - Codex: premise verified（2026-08-16）。证据：24 页路由 editor-navigation.ts:67-268、shared
    contract controls.tsx:1211-1288 / recipes.tsx:253-295、逐页 Inspector 行号见审计表；三套结构并存且
    首批之外仍有同类长 Inspector。design agree：按 A/B/C 小批迁移到唯一 DsInspectorTabs，每批保持业务
    测试，最后做全矩阵浏览器收口；未完成 C 不签“全局完成”。
  - Kimi: **premise verified + design agree（2026-08-16，附必落钉 IK1，不阻塞准入）**。本人一手直读
    shared 合同（controls.tsx:1211-1289 DsTabs 键盘/roving/ARIA；recipes.tsx:253-297
    DsInspectorTabs linked panel + hidden；recipes.css:47-75 单 panel 滚动 owner）、批 A 私有 Tab
    （ItemTab.tsx:1849-1890）、批 A 堆叠（SkillTab.tsx:1278-1306）、批外长 Inspector
    （CutsceneTab.tsx:643-700）、无需 Tab 页（AmbienceTab.tsx:41-80）、Project/Shop/Actor
    （ProjectWorkbenchTab.tsx:817-847；ShopTab.tsx:208-248；ActorMode.tsx:1060-1114）与 Map 私有
    tablist/ref/副作用（MapMode.tsx:3312-3338）。结论与 GLM 独立互证；新增 Actor「编辑分区」导航
    去向钉（IK1）。详见下方「Kimi 独立反证审查」。
  - GLM: **premise verified + design agree（2026-08-16，本人一手读码，非代理；附必落钉 GT1-GT5）**。
    Shared 组件独立确认（DsTabs controls:1217 + DsInspectorTabs recipes:260,variant=inspector:277）;
    Enemy(:1141)/Scene(App:2841) 已消费;三种私有 class 逐处属实（battle:5972/item:11389/map:13213
    + WorldSprite:652 复用 battle class）;私有键盘 roving 属实（Map:1313-1325,Item:1866-1875）;
    **测试缺口实测：Image/Music/Cutscene 三个迁移页无测试文件**（与 ED-CATALOG-CONTROLS-1 的
    GC1 缺口同源,须跨卡协调）。boundary 误伤面识别：App:2428 有一个非 Inspector 业务 tab。
    详见下方「GLM 独立覆盖审查」。
  - 独立反证（至少一位非 Owner）: GLM（覆盖/测试）+ Kimi（架构/视觉）均已完成，见各自审查节。
  - 用户豁免: N/A
  - 结论: **allowed（2026-08-16）——Codex + GLM（GT1-GT5）+ Kimi（IK1）三方签字齐。
    由 Codex 按 GT1-GT5 + IK1 进 build；与 ED-CATALOG-CONTROLS-1 串行（顺序由用户/Codex 定）。**

#### GLM 独立覆盖审查（2026-08-16，本人一手读码；非代理）

**premise verified — 关键事实一手核实：**

| 卡文声称 | 本人实测 | 核对 |
|---|---|---|
| DsTabs/DsInspectorTabs shared 存在 | `controls.tsx:1217 DsTabs` + `recipes.tsx:260 DsInspectorTabs`（:277 `variant="inspector"`） | ✓ |
| Enemy/Scene 已消费 | `EnemyTab.tsx:58,1141` + `App.tsx:148,2841` | ✓ |
| Item 私有 Tab | `ItemTab.tsx:1853` `.item-inspector-tabs role="tablist"` + 私有键盘 :1866-1875 | ✓ |
| Map 私有 Tab + roving | `MapMode.tsx:3313` + :1313-1325 ArrowLeft/Home handler + :3325 手写 tabIndex 条件 | ✓ |
| WorldSprite 复用 battle class | `WorldSpriteLibrary.tsx:652` 用 `.battle-inspector-tabs`（跨页复用同一私有 class） | ✓ |
| BattleSprite 私有 | `BattleSpriteLibrary.tsx:1394` `.battle-inspector-tabs role="tablist"` | ✓ |
| 三种私有 CSS | editor.css :5972(battle)/:11389(item)/:13213(map) 各有 grid+skin 段 | ✓ |
| 堆叠 Inspector | Skill/Poison/Shop **零** role="tab/insp-section；Image/Music/Sound/Cutscene/Actor/Tileset/Stamp/Project 各 1-2 处 insp-head/section 纵向堆叠 | ✓ |
| 滚动 owner 现状 | ItemTab :1896/:1975/:2020 `.item-inspector-scroll` 三处 + MapMode :3335/:3787/:3826 `.map-inspector-panel` | ✓ |

**24 页覆盖独立复核**：与 ED-CATALOG-CONTROLS-1 同法 node 解析 8 模块/24 页一致;
DataMode dispatch 逐页核对。审计表分类（已 Tab 化 2 / Tab 化 15 / 无需 7）与路由吻合,无漏页。

**15 个迁移组件测试现状（本人 ls 实测）：**

| 有测试（12） | **无测试（3）** |
|---|---|
| Item/Map/WorldSprite/BattleSprite/Skill/Poison/Sound/Actor/Shop/Tileset/Stamp/ProjectWorkbench | **Image、Music、Cutscene** |

（Sound 仅 38 行薄测试——与 ED-CATALOG-CONTROLS-1 GC1 判定一致。）

**boundary 误伤面识别（关键）：**
- 卡文 static gate 写"迁移组件不得手写 role='tab'"——须限定为**Inspector 上下文**:
  `App.tsx:2428` 有一个非 Inspector 业务 tab（场景 canvas 工具条）,ActorMode 主工作区任务 Tab、
  CanonicalSceneScriptWorkspaceV5 内部 Tab 均合法。boundary 断言必须按"迁移文件内
  `.xxx-inspector-tabs` class 或 inspector aside 内 role='tab'"划界,不能全文件禁 role="tab"。
- 测试中旧私有 selector（ItemTab.test :384/:566/:1083/:1116、MapMode.test :231/:451）须同步改
  accessible query——CSS/API 清理清单已列,补充测试文件清单。

**必落钉 GT1-GT5（build 必落）：**
- **GT1（3 缺 1 薄测试 + 跨卡协调）**：Image/Music/Cutscene 三测试从零新建,Sound 补齐;与
  ED-CATALOG-CONTROLS-1 GC1 **同一缺口**——两卡 build 须协调分工（建议：目录测试归
  CATALOG 卡,Inspector Tab 测试归本卡,共享一个文件避免双份）或明确顺序避免互相假设。
- **GT2（每页领域级切换测试）**：卡文已要求"每个迁移实现至少一条"——build 逐页落,含固定
  标题位于 DsInspectorTabs 之前、非活动 panel hidden、计数标签（引用 n）。
- **GT3（boundary 划界）**：私有 class 三种全仓 rg 零残留 + **inspector aside 上下文内**
  role="tab" 禁令（不全文件禁,防 App:2428/ActorMode/SceneScript 误伤）+ 迁移文件必须消费
  DsInspectorTabs 正向断言。
- **GT4（Map 副作用保持）**：activateInspectorTab 副作用（首次访问组合/清候选/请求打开
  Inspector）迁入 shared onChange 后必须逐条回归——这是本卡最大的行为风险点,需要专项测试
  而非仅浏览器抽查。
- **GT5（hidden-but-mounted 副作用）**：shared 组件非活动 panel hidden 合同下,各页
  useEffect/ResizeObserver/资源加载等是否依赖可见性——build 时若发现可观察副作用先补回归
  测试再在 canonical 组件内解决（卡文已列,GT5 钉为必检而非可选）。

**可证伪观察：**
① 若某迁移页 Inspector 无法由 DsInspectorTabs 表达而不改业务挂载（如 Map tiles panel 内
  大列表需要嵌套滚动）,须先以 DOM 证明缺口再扩 canonical API——停线重估。
② 若 activateInspectorTab 副作用迁移后丢失（组合首次访问不触发）,GT4 拦截。
③ 若 hidden panel 内 ResizeObserver/contentRect 变化破坏布局测量,GT5 拦截。
④ 若 boundary 全文件禁 role="tab" 误伤 App:2428,GT3 划界修正。
⑤ 若 Image/Music/Cutscene 测试与 ED-CATALOG-CONTROLS-1 重复建设或互相漏掉,GT1 协调钉拦截。

**跨卡依赖提示**：本卡与 ED-CATALOG-CONTROLS-1 高度同批（同 17 文件中的 15 个、同 3 缺测试、
同 dirty tree）。若两卡并行 build,冲突风险高;建议用户/Codex 明确先后顺序（如 CATALOG 先收目录区、
本卡后收 Inspector）或合并实现批次,签字各自保留。

Evidence: controls.tsx:1217 / recipes.tsx:260,277 / EnemyTab:58,1141 / App:148,2841,2428 /
ItemTab:1853,1866-1875,1896,1975,2020 / MapMode:1313-1325,3313,3325,3335,3787,3826 /
WorldSpriteLibrary:652 / BattleSpriteLibrary:1394 / editor.css:5972,11389,11417,13213,13249 /
Skill/Poison/Shop role="tab" 零命中 / ls 15 测试（3 无 + Sound 38 行）/ ItemTab.test:384,566,
1083,1116 / MapMode.test:231,451。只读审查,未改实现文件,未代签 Kimi,未标 build/done。

#### Kimi 独立反证审查（2026-08-16，架构/视觉主审；本人一手读码）

**shared 合同核对 ✓：**
- `DsTabs`（controls.tsx:1217-1289）集中 ArrowLeft/Right/Home/End、roving tabindex(:1271)、
  aria-selected/aria-controls;`DsInspectorTabs`（recipes.tsx:260-296）集中 linked panel、
  `hidden`(:289)、`aria-labelledby`;CSS(recipes.css:47-75）单 panel 纵向滚动 owner +
  `[hidden]{display:none}` 单点拥有。合同完整，无需第二 API。✓
- 注意：panel 自带 `overflow-x:hidden`（recipes.css:68）——卡文禁止的是页面级用它掩盖溢出；
  `scrollWidth` 在 overflow:hidden 下仍报告真实内容宽度，浏览器逐页 `scrollWidth<=clientWidth`
  断言保持有效，若失败只修内容 min-width/换行，不放宽门禁。

**逐类抽查 ✓：**
- 批 A 私有 Tab：ItemTab.tsx:1849-1890 手写 tablist/roving/focus-by-id——与 shared 合同逐点重复，
  私有实现删除有依据；计数标签（`引用 n`）已由 label 函数承载，shared items label 可表达。✓
- 批 A 堆叠：SkillTab.tsx:1278-1306 两个 DsInspectorSection 纵向堆叠、无固定对象标题——
  「引用 n / 说明」Tab 化成立（多语义、标题固定化正是本卡目标）。✓
- 批外长 Inspector：CutsceneTab.tsx:643-700 资源/媒体/动作/引用/诊断五模块堆叠——批 B 判定正确。
- 无需 Tab：AmbienceTab.tsx:41-80 无右栏；BattleField 单一引用任务（B2-1 已建）——排除正确。✓
- Map：私有 tablist + ref 数组 + activateInspectorTab 副作用（MapMode.tsx:3312-3338）属实；
  panel 现行已是 hidden 模式（:3338),hidden-but-mounted 与 shared 合同一致；tiles/stamps 子列表
  为明确边界大列表，保留内部滚动即可，**不需要 canonical API 扩展**（回答 GLM 可证伪观察①:
  现状未发现缺口）。✓
- Project/Shop/Actor「长+多语义」判断：Project 四页（30 条问题 + 页属 section,ProjectWorkbenchTab
  :817-847）✓；Actor 四模块（身份/分区导航/摘要/引用，ActorMode.tsx:1060-1114）✓;Shop 三模块
  但两个是纯静态说明（ShopTab.tsx:230-246）——borderline，按卡文「摘要 / 说明」Tab 化可接受；
  若 build 期以最窄 Inspector + 150% zoom 证据证明单语义无需滚动，可按卡文最强替代解释 1 的条款
  降级并更新审计表。

**增量必落钉（GT1-GT5 之外）：**
- **IK1（Actor「编辑分区」导航去向必须显式决策）**：ActorMode.tsx:1091-1114 的 Inspector 内
  分区导航与主工作区四任务 Tab（ActorMode.tsx:429-442）是同一组分区的重复入口；审计表 Actor 目标
  只有「摘要 / 引用 n」两 Tab，未写该导航的处置。build 必须显式选择——摘要 Tab 内保留，或判定与主
  工作区重复而删除——并写进 Build 节实现摘要；不得在迁移中静默丢弃这个用户可见入口。

**可证伪观察：**
1. 若某迁移页 Inspector 无法由 DsInspectorTabs 表达而不改业务挂载（本人抽查未发现；Map 子列表
   滚动已有边界答案），停线重估。
2. 若 Item 等现行条件渲染页（ItemTab.tsx:1891-1893 只挂载活动 panel）存在依赖「未挂载即不算」的
   副作用，hidden-but-mounted 迁移会改变可观察行为——GT5 已钉为必检，本人补一条实证：Item 现行
   是条件渲染，属于 GT5 的重点检查对象。
3. 若 Shop 等 borderline 页在最窄 Inspector + 150% zoom 下证明单语义无滚动，按卡文条款降级——
   不构成本卡失败。

**跨卡协调意见**：同意 GLM——本卡与 ED-CATALOG-CONTROLS-1 共享 15 文件与同一 dirty tree,
串行 build（顺序由用户/Codex 定），签字各自保留。

Evidence: 上述全部 file:line + controls.tsx:1211-1289 / recipes.tsx:253-297 / recipes.css:47-75 /
ItemTab.tsx:1849-1900 / SkillTab.tsx:1278-1306 / CutsceneTab.tsx:643-700 / ShopTab.tsx:208-248 /
ProjectWorkbenchTab.tsx:817-847 / ActorMode.tsx:429-442,1060-1114 / MapMode.tsx:3312-3338 /
AmbienceTab.tsx:41-80。只读审查，未改实现文件，未代签 GLM，未标 build/done。

- done 准入:
  - Codex: **accept（2026-08-16）**。A/B/C 全批、计数徽标追加裁决、GT1-GT5、IK1、静态门禁、
    typecheck、focused 15/182、全量 editor 119/884 与最小浏览器矩阵均完成；Stamp 真实工程无数据限制
    已如实登记，不代签 Kimi/GLM。
  - Kimi: **accept（2026-08-16 done 前架构/视觉复审，本人一手读码 + 浏览器实测，非代理；基于
    22666ab0）**。五项核对逐项通过：
    - **count 唯一 canonical 入口 ✓**：`DsTabItem.count?: number`（controls.tsx:1215）由 shared
      DsTabs 渲染 `.ds-tab__label` + 独立 `.ds-tab__count`（:1285-1289），徽标皮肤全 token 化
      （primitives.css:1044-1050,1115）；业务 TSX 无「引用/问题/诊断 ${n}」拼回 tab label
      （本人 rg；ItemTab.tsx:1127 为目录行 meta，合法）。
    - **15 组件固定结构 ✓**：DsInspectorTabs 消费清单恰好 = 15 迁移目标 + Enemy + Scene（App），
      无多无少；抽查 Item（:1848-1864）、Map（:3285-3293，已补固定「地图/名称」标题）、Actor
      （:1071+）均为固定 insp-head 在 Tabs 前、shared panel 唯一纵向滚动 owner
      （recipes.css:63-71）。
    - **窄栏/三 Tab/tooltip 本人浏览器实测（6010 真实工程，非复述 Codex 证据）**：Cutscene
      Inspector 收窄 220px——三 Tab（资源/引用+1/诊断+0）徽标两元素分离、tablist 219≤220、
      inspector/panel/document 四级 `scrollWidth<=clientWidth` 全过；Skill 290px 固定标题
      「技能 / 梦蛇」前置、无溢出；Actor 290px 全部后代不越界、tooltip 触发后不裁切；
      console 零 error/warning。与 Codex 留证一致。
    - **Map 副作用 / Item hidden-mounted / IK1 ✓**：activateInspectorTab 三副作用完整
      （MapMode.tsx:1294-1299）且 shared onChange 接回（:3293）；Item 条件渲染迁
      hidden-but-mounted 后既有业务测试全绿（GLM 复跑），无需恢复条件卸载；Actor「编辑分区」
      入口保留在摘要 Tab（ActorMode.tsx:1105-1129），IK1 显式决策已落。
    - **私有清零 ✓**：三种私有 class 业务 TSX/CSS 零命中（唯一命中为 boundary 自禁正则）；
      `onInspectorTabKeyDown`/`inspectorTabRefs` 零命中；`.item-inspector-scroll` 仅剩
      min-width/min-height（editor.css:11359-11362），滚动权已收归 shared panel，符合卡文
      「内容 class 可保留」边界。
    - 范围纪律：只审本卡；并行 ED-CATALOG-CONTROLS-1 改动不计入结论。
  - GLM: **accept（2026-08-16 done 前覆盖/测试复审，本人一手读码 + 独立复跑，非代理；基于实现提交
    22666ab0，36 文件 +3284/-2614）**。GT1-GT5 + IK1 逐钉独立验证：
    - **24 页无漏项（独立复算）**：node 解析 editor-navigation.ts 得 8 模块/24 二级页，与卡内审计表
      分类吻合——2 页已有 shared（Scene 实体/Enemy，现仍各 2 处 DsInspectorTabs 未回归）+ 17 页迁移
      （18 实际表面：sprite 双实现 + Project×4）+ 5 页无需 Tab（ambience/scripts/vars/events/
      battlefield）；DataMode 生产分发逐页核对无第 25 页。
    - **GT1**：Image/Music/Sound/Cutscene 由新增 AssetInspectorTabs.test.tsx（4 test）挂真实组件 +
      真实 EditSession 补齐；跨卡协调以"本卡先建 Inspector 断言、CATALOG 卡后补目录断言"解决，
      AssetInspectorTabs 与 ED-CATALOG-CONTROLS-1 GC1 无重复建设。
    - **GT2**：inspector-tabs-test-utils.ts 的 verifyInspectorTabs 一次调用即断言固定标题前置
      （.insp-head 的 nextElementSibling 含 tablist）、标签/计数、双向 aria-controls/aria-labelledby、
      单可见 panel + 其余 hidden、点击 + ArrowRight/ArrowLeft/Home/End roving 全键；12 个测试文件
      覆盖全部 15 组件（含 Project 四页循环 overview/startup/entrypoint/advanced）。
    - **GT4**：activateInspectorTab（MapMode.tsx:1294-1299）三条副作用俱在——setStampPanelVisited
      （首次访问组合）/setCandidateMenu(undefined)（清候选）/onRequestInspectorOpen；:3293 shared
      onChange 接回该函数。专项测试 :450 断言 onRequestInspectorOpen 调用 + 组合面板按需物化；:457
      断言切换不改地图（session state 引用相等）、revision 0、not dirty、选区/筛选值保持；清候选由
      既有 :650/:1143 候选链测试覆盖。
    - **GT5**：shared DsInspectorTabs 渲染全部 panel（hidden={id!==activeId}）；Item 从条件渲染迁
      hidden-but-mounted 后全量既有引用/删除/undo/资源测试通过即实证；旧条件渲染断言
      （WorldSprite panel-layout toBeNull）正确替换为"单可见 + rest hidden"新合同，无断言放松
      （删除的均为私有 id/tabIndex 断言，被等价更强断言替代）。
    - **GT3**：boundary 正向断言 15 文件含 <DsInspectorTabs；反向禁私有 handler 名
      （onInspectorTabKeyDown|inspectorTabRefs）、inspector 语义 tablist（按 aria-label"检查器/右侧
      面板"划界，App:2428 场景工具条/ActorMode 任务 Tab/SceneScript 内部 Tab 不误伤）、
      inspector-tab- id、label 拼计数模板串；三种私有 class 全 UI 源零残留（本人 rg 复跑唯一命中是
      boundary 自身禁止正则）。旧滚动 owner CSS 正确收权（.item-inspector-scroll/.map-inspector-panel
      仅剩 min-width/min-height，overflow 归 shared panel）。
    - **计数徽标（用户追加裁决）**：DsTabItem.count 渲染 .ds-tab__label + .ds-tab__count 两个独立
      元素（controls.tsx:1285-1291）；controls.test/recipes.test 断言两元素文本分离；verifyInspectorTabs
      对计过数 label 强制查两元素；ItemTab.test:1090 精确计数"引用 2"与领域数据挂钩；徽标 CSS 全
      token 化 + selected 态。
    - **IK1**：ActorMode.tsx:1106"编辑分区"保留在摘要 Tab 内，显式决策已写进 Build 摘要。
    - **回归独立复跑**：typecheck PASS；全量 editor 884/884；focused（controls/recipes/boundary/
      AssetInspectorTabs）50 tests PASS；工作树干净（实现全部收进 22666ab0）；git diff --check clean。
  - 备注（不阻塞 accept）：① boundary 手写 tablist 禁令按 aria-label 关键词划界而非"inspector aside
    内 role=tab"结构划界——本仓 15 处 Inspector aria-label 均含"检查器"（领域测试逐页证实），现实
    回归向量已覆盖，属绊线门禁而非穷尽证明；② label 拼计数禁令只匹配模板串形态，字符串拼接可绕——
    正向 DsInspectorTabs 消费断言兜底。两者如未来出现回流再升级为结构化断言。
  - 用户豁免: N/A
  - 结论: **done（2026-08-16）——Codex + GLM + Kimi 三方 accept 齐，无 counter、无用户豁免；
    Codex 已完成状态收口。**

## 交接

- 2026-08-16 Codex: 已读取强制文档与 fresh web-design-guidelines，复核当前脏树，完成 24 页 / 双 sprite
  domain 审计、A/B/C 迁移设计、CSS/API 清理与测试/浏览器矩阵；只新增本卡并更新看板，未改实现。
  Evidence: 本卡前提矩阵、逐页审计与签字。Next: Kimi、GLM 独立 build 前审查。


- 2026-08-16 GLM: 覆盖/测试审查签 premise verified + design agree（GT1-GT5）。Shared 组件/私有
  Tab/堆叠/滚动 owner 逐处一手核实;Image/Music/Cutscene 三测试缺口（与 ED-CATALOG-CONTROLS-1
  同源,须跨卡协调）;boundary 须按 inspector 上下文划界防 App:2428 业务 tab 误伤;Map
  activateInspectorTab 副作用是最大行为风险点（GT4 专项测试）。等待 Kimi 签字。

- 2026-08-16 Kimi: 架构/视觉审查签 premise verified + design agree（IK1）。一手直读 shared 合同
  （DsTabs/DsInspectorTabs/recipes.css 单 panel 滚动 owner）、批 A 私有（Item）与堆叠（Skill）、
  批外长 Inspector（Cutscene）、无需 Tab 页（Ambience/BattleField）、Project/Shop/Actor 与 Map
  副作用链;确认 Project/Actor「长+多语义」成立、Shop borderline 但可按卡文条款降级、Map 子列表
  无需 canonical API 扩展、hidden-but-mounted 与 Map 现行为一致（Item 条件渲染页为 GT5 重点）。
  新增钉 IK1：Actor Inspector「编辑分区」导航（与主工作区四 Tab 重复）去向必须显式决策并写进
  Build 摘要。三方签字齐,build allowed。Next: Codex 按 GT1-GT5 + IK1 进 build（与
  ED-CATALOG-CONTROLS-1 串行）。

- 2026-08-16 Codex: A/B/C 全批实现、自验与浏览器验收完成，Status 进入 review；IK1 选择在 Actor
  摘要内保留编辑分区。用户追加的 Tab 数量改为 shared count 徽标，已落 API、CSS、领域断言与 boundary。
  focused 15/182、typecheck、全量 editor 119/884 全绿；Wide/1280/220px/125%-150% 等效视口通过，
  巡检抓到并修复 Actor tooltip 横溢出。Codex 签 accept；Next: Kimi/GLM done 前独立复审。

- 2026-08-16 GLM（覆盖/测试）: done 前复审完成并签 **accept**（基于实现提交 22666ab0）。GT1-GT5 +
  IK1 逐钉独立验证：24 页 node 复算无漏项；verifyInspectorTabs 12 文件覆盖全部 15 组件 + Project
  四页循环；GT4 三条副作用在 activateInspectorTab:1294-1299 俱在且 onChange:3293 接回、两条专项
  测试断言副作用与状态不变；GT5 hidden-but-mounted 由 Item 全量业务测试通过实证；GT3 boundary 正反
  断言划界正确无私有 class 残留；计数徽标 shared/领域双层分离断言 + ItemTab.test:1090 精确计数与数据
  挂钩。typecheck + 全量 884/884 + focused 50 全部本人独立复跑通过。两条绊线门禁备注已登记（不阻塞）。
  未修改实现文件，未代签 Kimi。Next: Kimi done 前 accept；签齐即关卡。
- 2026-08-16 Kimi（架构/视觉）: done 前复审完成并签 **accept**（基于 22666ab0）。一手读码 +
  6010 真实工程浏览器实测：count 唯一 canonical 入口（label/count 两元素分离，业务零拼回）；
  15 组件消费清单恰好且无多；固定标题前置与单 panel 滚动 owner 抽查（Item/Map/Actor）通过；
  Cutscene 220px 三 Tab 徽标分离 + 四级 scrollWidth 断言全过、Actor tooltip 不裁切、console 零
  error；Map 三副作用俱在、IK1 编辑分区保留在摘要 Tab、私有 class/键盘/ref 清零（残留
  .item-inspector-scroll 仅剩 min-size，符合卡文边界）。未修改实现文件，未代签 GLM。
  三方 accept 齐；Status 变更交 Codex/用户。无下一位 Agent 提示词——本卡审查侧收口，
  后续为 ED-CATALOG-CONTROLS-1 build 与 ED-AUDIT-2。
- 2026-08-16 Codex: 三方 done 前签字核对完成，本卡正式转 `done`。Kimi/GLM 审查的 Tab 主实现为
  `22666ab0`；随后 `73a910bf`、`bdcc745b` 仅迁移物品资源/效果动作按钮，未改变 DsTabs /
  DsInspectorTabs API、Inspector 标题/Tab/panel 结构、键盘语义、hidden-mounted 合同或滚动 owner。
  Codex 已在最新分支复跑 editor typecheck、focused 42/42、全量 119/885，并完成 1280px 与 150% 等效
  窄视口复验。无下一位 Agent 提示词；等待用户验收或进入下一张已签字任务卡。

## 下一位 Agent 提示词

本卡已 `done`，无下一位 Agent 提示词。以下内容仅保留为历史交接记录，不再授权新的实现或审查。

### Kimi（架构 / 视觉 done 前复审——已完成）

Kimi 已于 2026-08-16 完成 done 前复审并签 accept（一手读码 + 6010 浏览器实测，见 done 准入
Kimi 条目）。三方 accept 齐；Status 变更交 Codex/用户。本节提示词不再适用。

### GLM（覆盖 / 测试 done 前复审——已完成）

```text
接手任务: ED-INSPECTOR-TABS-1 属性面板共享 Tab 全局统一——done 前覆盖/测试复审
任务卡: docs/ops/tasks/ED-INSPECTOR-TABS-1-global-inspector-tabs.md
当前状态: review；Codex 已实现并自验 accept，Kimi/GLM accept 未齐，不得标 done
你的角色: GLM，独立复核 24 页 inventory、GT1-GT5、测试矩阵与静态边界
先读: AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、docs/ops/agent-workflow.md、本任务卡；
重点读 design-system controls/recipes/boundary tests、inspector-tabs-test-utils.ts、AssetInspectorTabs.test.tsx，
以及 15 个迁移组件和对应测试的本分支 diff。
已完成: build 前 24 页审计已全部落类；15 个业务组件/18 个实际表面迁 shared；Image/Music/Sound/
Cutscene 测试补齐；Map 副作用、领域切换、ARIA/键盘/hidden、计数徽标、私有 class/manual handler 门禁已落。
Codex 证据为 focused 15/182、typecheck、全量 editor 119/884、git diff-check 与浏览器矩阵。
请独立核对:
1. 24 页无漏项，迁移/已有 shared/无需 Tab 的理由与生产路由一致；
2. 每个迁移页领域测试、引用/删除/资源/undo/选择行为覆盖是否足够，尤其 GT4/GT5；
3. boundary 是否精准禁止三私有 class、手写 Inspector Tab 和字符串计数，不误伤合法业务 Tab；
4. 新 DsTabItem.count 的 shared/领域测试是否证明标题与数字分离、ARIA/键盘不回归。
若通过，在任务卡 GLM done 准入签 accept；否则签 counter 并列缺页/缺测/误伤证据。不得修改实现文件，
不得代签 Kimi；签字未齐不得标 done。
```

### Kimi（架构 / 视觉——已完成）

Kimi 已于 2026-08-16 完成 build 前审查并签字（premise verified + design agree，附 IK1，
见「Kimi 独立反证审查」），本节提示词不再适用。

### GLM（覆盖 / 测试）

~~~text
接手任务: ED-INSPECTOR-TABS-1 属性面板共享 Tab 全局统一
任务卡: docs/ops/tasks/ED-INSPECTOR-TABS-1-global-inspector-tabs.md
当前状态: draft；Codex premise verified + design agree；Kimi/GLM build 前签字均 pending，因此不得开始实现。
你的角色: GLM，独立审查 24 页覆盖、业务回归与自动/浏览器测试矩阵并签 build 前结论。
先读: AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、docs/ops/agent-workflow.md、
docs/phase2/editor/editor-design-system-v1.md、ED-DS-1、ED-DS-2、ED-AUDIT-2、ED-BATTLE-UI-1、本任务卡；
再直接读 editor-navigation.ts:23-268、DataMode.tsx 的页面分发、design-system recipes/controls/boundary tests，
以及本卡逐页列出的 TSX/test。工作树很脏，所有既有修改属用户。
已完成: Codex 已给出 24 页 + 双 sprite domain 清单、15 个目标组件、三批实现、三类 static gate、领域回归和
viewport/zoom 验收矩阵；未改实现、未运行测试。
请你做: 独立用生产路由证明无漏页；核对每个迁移页是否已有测试，特别补审当前无 Image/Music/Sound/Cutscene
组件测试的缺口；逐页确认引用跳转、删除阻断、资源替换、undo/redo、选择/深链状态的 owner；检查 static
boundary 能否精准禁止私有 Inspector Tab 而不误伤 App/脚本内业务 Tab。给出直接 file:line、最强反证和可证伪
观察。若同意，在任务卡签 premise verified + design agree；若不同意签 counter 并列缺页/缺测试/误判。
不要做: 不修改 packages/editor 实现、CSS、测试或用户既有 diff；不运行破坏性命令；签字不齐不得开始实现
或标记 build/done。
输出要求: 签字 agree/counter、独立覆盖证据、缺失测试/页面、门禁误伤风险与返工项；把结果写回任务卡。
~~~


### 给 Codex（三方签齐，进 build，可直接复制）

```text
接手任务: ED-INSPECTOR-TABS-1 属性面板共享 Tab 全局统一——build 实现
任务卡: docs/ops/tasks/ED-INSPECTOR-TABS-1-global-inspector-tabs.md
当前状态: draft;三方签字齐（Codex + GLM GT1-GT5 + Kimi IK1）;build allowed
你的角色: Coding Owner——A/B/C 三批迁移到唯一 DsInspectorTabs + CSS/boundary/测试收口
必落钉:
  GLM GT1: Image/Music/Cutscene 三测试新建 + Sound 补齐;与 ED-CATALOG-CONTROLS-1 GC1 协调——
    建议共享测试文件或明确先后（CATALOG 目录断言 / 本卡 Inspector Tab 断言各自追加）,不双份不漏。
  GLM GT2: 每个迁移页至少一条领域级切换测试（标签/计数/键盘/hidden/固定标题前置）。
  GLM GT3: boundary 按 inspector 上下文划界——三种私有 class 全仓 rg 零残留 + 迁移文件 inspector
    aside 内 role="tab" 为零（不全文件禁,App:2428/ActorMode/SceneScript 合法 tab 不误伤）+
    迁移文件必须消费 DsInspectorTabs 正向断言;测试旧私有 selector 同步改 accessible query。
  GLM GT4: Map activateInspectorTab 三条副作用（首次访问组合/清候选/请求打开 Inspector）迁入
    shared onChange 后逐条专项回归——最大行为风险点。
  GLM GT5: hidden-but-mounted 副作用检查——各页 useEffect/ResizeObserver/资源加载不依赖可见性;
    发现可观察副作用先补回归测试再在 canonical 组件内解决。Kimi 补充实证重点:Item 现行是条件渲染
    （ItemTab.tsx:1891-1893 只挂载活动 panel）,迁 hidden-but-mounted 是行为变化,列为 GT5 首查对象。
  Kimi IK1: Actor Inspector「编辑分区」导航（ActorMode.tsx:1091-1114,与主工作区四任务 Tab 重复）
    的去向必须显式决策（摘要 Tab 内保留,或判重删除）并写进 Build 节实现摘要;不得静默丢弃。
顺序: shared contract 补测 → 批 A（7 页,含 GT4 Map 副作用专项）→ 批 B（5 页）→ 批 C（3 页 +
  Project×4）→ CSS 清理 + boundary 收紧 → typecheck/test → 浏览器全矩阵（含滚动 bounding rect）。
跨卡: 与 ED-CATALOG-CONTROLS-1 同 15 文件重叠——串行（CATALOG 先或本卡先,由用户/Codex 定）,
  避免并行 build 冲突;签字各自保留。
验收红线: 引用跳转/删除阻断/资源替换/undo/选择深链逐页不变;标题+Tab 固定 bounding rect;
  scrollWidth<=clientWidth;console 0;不 reset 用户脏树。
```
