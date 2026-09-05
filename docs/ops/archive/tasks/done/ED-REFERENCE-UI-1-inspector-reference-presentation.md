# ED-REFERENCE-UI-1 - 属性面板引用呈现全局统一

Status: done
Phase: phase2
Capability: Editor cross-cutting（本卡不改变 capability-map 状态）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: codex/ed-reference-ui-1

## 目标

把编辑器所有右侧属性面板中的“引用 / 使用位置”收敛到唯一共享呈现合同：统一计数与影响摘要、空/加载/
部分/错误状态、可选分组、引用行层级、长文本、展开收起、定位动作与不可定位说明。领域页面只提供 typed
引用数据、业务文案和跳转命令，不再分别维护卡片、按钮、静态 div 和私有 CSS；引用收集、删除阻断、资源替换、
扫描失败和跳转落点等业务真值保持不变。

用户可见结果：无论从敌人、物品、地图、资源还是精灵页打开“引用”，都先看到同一套“影响摘要 → 分组（按需）
→ 引用行”层级。同一种状态使用同一种颜色、文案位置和交互反馈，领域差异通过明确标签表达，不靠换一套组件暗示。

## 范围

- 范围内：
  - 扩充现有 `DsReferenceList` / `DsReferenceRow`，新增最少必要的 `DsReferencePanel`、
    `DsReferenceGroup`（最终命名由 build 前审查确认）；只保留一套 canonical API 和样式。
  - 统一右侧 Inspector 中 16 个真实引用面：场景命名落点、地图、瓦片集、组合模板、人物、物品、技能、敌人、
    毒、战场、大世界精灵、战斗精灵、图片、音乐、音效、过场。
  - 统一精确/部分/未知计数，blocking / informational 影响，loading / partial / error / empty 状态，
    jumpable / read-only / unavailable 行，以及重复引用的 occurrence 聚合。
  - 保留 Item 的来源分组和读写/配置语义、WorldSprite 的动作/用途/兼容脚本分组、Tileset/Stamp 的异步扫描，
    但统一它们的壳、行、状态和动作语法。
  - 更新 `editor-design-system-v1.md` 的引用卡规范、Design Lab reference fixture、组件契约测试、领域回归、
    static boundary 和私有 CSS 清理。
- 范围外：
  - ED-3 `ProjectReferenceIndex`、跨域引用图、扫描器合并、删除策略重新定义、schema/content/save/migration 变化。
  - 为当前没有 locator 的媒体引用新增业务定位能力；本卡只把“不可定位”如实呈现。
  - `VarsTab` 主工作区读写引用表、脚本编辑器内部调用树、Project `IssueList`、picker 中的正向引用选择器。
  - 重排对象级删除入口、改变级联/阻断规则、修改资源替换或图章已放置快照的业务语义。
- 明确不做：
  - 不新增 `legacyReferenceCard`、领域 `variant="item|sprite|asset"`、旧 class alias 或第二套 reference skin。
  - 不把所有引用强行拍平成一列；只有来源/影响确实不同才分组，同组内共享同一种行。
  - 不把不可定位引用渲染成可点击假链接，也不把静态信息塞进 disabled button。
  - 不与 `ED-INSPECTOR-TABS-1` 或 `ED-CATALOG-CONTROLS-1` 并行修改重叠文件；三卡必须串行。

## 前提真值门

### 一句话行为 / 工程前提

当前右侧属性面板至少有 16 个引用面，其中只有 Actor / Skill / Enemy / Poison 使用共享
`DsReferenceList` / `DsReferenceRow`，其余仍使用十余组私有结构和样式；问题位于呈现层重复，不等同于引用数据或
删除策略错误，因此应统一共享 UI 合同并保留领域数据 owner。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | 用户直接指出“每个页面属性面板里面的引用部分的组件都千差万别”，要求综合统一并参考编辑器其余统一设计；随附截图显示 Enemy 引用 Tab 下的摘要、说明和两张引用卡。此为全新编辑器产品要求，不是原版游戏机制。 | 2026-08-16 用户本轮请求与随附截图；`docs/phase2/READ-FIRST.md:8-21` |
| 第一阶段 | N/A：第一阶段交付的是游戏运行时，不存在 Reforge 编辑器右侧属性面板或反向引用 UI，可复用 UX 真值为空。 | `CLAUDE.md:23-30`；`docs/phase2/READ-FIRST.md:21-22` |
| 当前二阶段 | 规范要求引用卡按来源类型、名称、位置、状态组织并复用 typed reference 数据；代码已有 shared Row/List，但只被 4 个领域消费，Item、BattleField、媒体、地图/图章/瓦片集、精灵、命名落点仍各自渲染。 | `docs/phase2/specs/editor-design-system.md:24-39,53-78,315-331,364-377,400-423,449-454,520-577`；`packages/editor/src/ui/design-system/recipes.tsx:145-173`；下方 16 面审计表 |
| 本任务目标 | 所有 Inspector 反向引用使用唯一“Panel → Group/List → Row”合同；状态、计数、定位和长文本一致，业务收集器/locator/删除政策不变；未来 ED-3 可直接消费同一呈现层。 | 用户本轮裁决；本卡设计合同、迁移矩阵和验收条件 |

### 当前 before -> 目标 after

- before：共享按钮卡、article + mini button、静态媒体 div、战场按钮、地图 pill、异步扫描块和精灵多级 link
  同时存在；同是“不可定位”时有 disabled button、纯文本或无提示；空态、计数、路径和“打开”动作位置不一致。
- after：所有 Inspector 引用先进入统一影响/扫描状态，再按需分组，最终落到同一种引用行；可定位行有一致的
  “打开” affordance 与 focus，静态行有明确“只读 / 暂不可定位”及原因；长 id/path、空态和部分结果一致。
- 代表场景：从截图中的 Enemy 切到 Item、Image、Tileset 和 WorldSprite 的“引用” Tab，五页保持相同
  字体层级、卡面、间距、状态条和打开动作；Item 仍显示来源/读写，Tileset 仍显示扫描进度与失败，WorldSprite
  仍能先选动作，但引用行本身不再换皮肤。

### 反证与替代解释

- 最强替代解释 1：现有 `DsReferenceRow/List` 已足够，只需逐页替换 JSX。反证：现 API 只有 title/detail/path
  和 button attrs，不能表达静态行、不可定位原因、blocking/informational、exact/partial count、异步扫描状态、
  分组和共享展开收起；若领域自己包壳，差异会继续存在。证据：`recipes.tsx:145-173` 与 16 面审计表。
- 最强替代解释 2：应等待 ED-3 统一引用图后再统一 UI。反证：16 面已各自拥有可显示的引用数据和删除真值，本卡
  只统一 view contract，不新造扫描器；ED-3 后续替换数据源即可复用本组件。
- 最强替代解释 3：媒体静态引用、Stamp 非阻断快照和 Sprite 多级引用差异过大。反证：它们共享
  “状态 → 可选分组 → owner/detail/path/status/action”信息结构；差异可以由 impact、state、group、action 明示。
- 什么观察会推翻当前前提：
  - 若逐页直接读码发现某 Inspector 引用面不在本表，先补 inventory 与验收，不得宣称“全局完成”。
  - 若适配某领域必须让 design-system 读取 EditorState、识别业务 id 或执行删除/扫描命令，说明 primitive 边界错误。
  - 若重叠卡完成后引用 DOM/业务 owner 已实质变化，必须刷新行号、迁移清单和相关签字。
  - 若准确计数会迫使本卡新增全工程扫描器，计数保持当前来源并显示 partial/unknown，不借 UI 卡抢跑 ED-3。
- audit 红项替代根因排查：
  - runtime 语义 / 命令分类：N/A，当前证据是 React DOM/CSS 呈现分裂。
  - 原版 / 第一阶段理解：N/A，第一阶段没有对应编辑器 UI。
  - extractor / 地图 / 数据解码：未发现证据；Tileset/Stamp 读取失败是现有 UI 必须表达的状态，不是本卡归因。
  - audit / test model：已用生产导航与实际 Inspector JSX 逐面核对；不能只以 class 名数量代替业务语义审查。

### 用户可见偏离

- 是否主动偏离已核真值：yes（用户 2026-08-16 已明确要求把当前多套形态统一）
- `before -> after` 一句话：每页各自定义引用卡与状态 → 全编辑器唯一引用呈现合同，业务含义不变。
- 代表场景：Enemy / Item / Image / Tileset / WorldSprite 五类 Inspector。
- 用户裁决：2026-08-16 用户已批准统一方向并要求先开任务卡；实现仍须三方设计签字后进入 build。

## 当前 Inspector 引用面全量审计（2026-08-16 工作树）

下表只列右侧属性面板中的反向引用/使用位置。`ED-INSPECTOR-TABS-1` 已进入 review 且仍与本卡重叠，build 前
必须复核最终 DOM/行号。`共享`表示已经使用基础 Row/List，不表示已满足本卡完整状态合同。

| 页面 / 引用面 | 当前结构 | 必须保留的领域语义 | 证据 |
|---|---|---|---|
| scene / 命名落点 | 私有 `entry-reference-list` + `ref-row` button | 场景/共享脚本可定位，全局调用只读；引用阻断删除 | `packages/editor/src/ui/App.tsx:3745-3884` |
| map / 地图 | 私有 `map-reference-list` button | 使用此地图的场景，点击打开场景；无引用地图仍可保存 | `packages/editor/src/ui/MapMode.tsx:3729-3747` |
| map / tileset | 私有 scan/status + 两组 `tileset-removal-refs` | 地图/组合两组；扫描中、失败、partial/unknown；移除门禁 | `packages/editor/src/ui/TilesetTab.tsx:911-1005` |
| map / stamp | 私有 scan/status + `stamp-usage-maps` | 已放置组是快照来源引用，修改模板不联动；扫描失败显示下界并可重试 | `packages/editor/src/ui/StampLibraryTab.tsx:656-700` |
| actor / 人物 | 共享 Row/List，但私有 section/hint 且静默 `slice(0, 12)` | 外部引用阻断删除；locator 缺失时只读；共享资产不随人物删除 | `packages/editor/src/ui/ActorMode.tsx:1164-1192` |
| item / 物品 | 私有来源 group + article card + mini button | 来源分组、read/write/config、不可用原因、locator、删除阻断 | `packages/editor/src/ui/ItemTab.tsx:1938-1983` |
| battle / skill | 共享 Row/List | Actor/Item/Enemy/开局引用，detail/path/locator，阻断删除 | `packages/editor/src/ui/SkillTab.tsx:1288-1321` |
| battle / enemy | 共享 Row/List；用户截图所示形态 | 敌队槽位、变身、召唤目标引用，阻断删除 | `packages/editor/src/ui/EnemyTab.tsx:1277-1305` |
| battle / poison | 共享 Row/List | Skill/Item/毒关系边，阻断删除 | `packages/editor/src/ui/PoisonTab.tsx:543-577` |
| battle / battlefield | 私有整行 button + 空态/footnote | project/scene/hostile/script 来源；locator 缺失；阻断删除 | `packages/editor/src/ui/BattleFieldTab.tsx:439-473` |
| asset / sprite (world) | action filter + usage switch + 私有 links | 动作级引用、用途、PAL 兼容脚本、不同打开命令、12 条展开 | `packages/editor/src/ui/WorldSpriteLibrary.tsx:809-1010` |
| asset / sprite (battle) | 私有 link + 手写 12 条展开 | 用途引用、locator 跳转、删除用途门禁 | `packages/editor/src/ui/BattleSpriteLibrary.tsx:1640-1685` |
| asset / image | 私有静态 `music-reference-item` | site 分组、occurrences、where；无 locator；诊断不混成引用 | `packages/editor/src/ui/ImageTab.tsx:704-731` |
| asset / music | 私有静态 `music-reference-item` | 由 where 解释 kind/owner；无 locator | `packages/editor/src/ui/MusicTab.tsx:355-378` |
| asset / sound | 私有静态 `music-reference-item` | site/occurrences/where；无 locator；诊断独立 | `packages/editor/src/ui/SoundTab.tsx:351-379` |
| asset / cutscene | 私有静态 `music-reference-item` | site/owner/occurrences/where；无 locator | `packages/editor/src/ui/CutsceneTab.tsx:805-836` |

明确排除但用于防误伤：`VarsTab.tsx:13-38` 的主工作区读写表、Project `IssueList`、脚本编辑器内部引用树。

## Canonical 设计合同

### 1. 三层 anatomy

1. **`DsReferencePanel`（状态与影响）**
   - 位于 `DsInspectorTabs` 的引用 panel 内；单一引用 Inspector 可由 `DsInspectorSection title="引用"` 包裹。
   - 顶部只显示一条影响摘要，不重复 Tab 已表达的裸“引用 · n 处”标题。摘要回答：结果是否完整、多少处、
     是否阻断删除/移除、作者下一步是什么。
   - 统一承载 `ready / empty / loading / partial / error`；复用 `DsStatus`、`DsTag` 和 design tokens。
2. **`DsReferenceGroup` + `DsReferenceList`（组织与数量）**
   - 只有来源、影响或操作确实不同才分组；group header 固定“名称 + 计数”，不套第三层 card。
   - list 统一 gap、初始 12 条、`显示其余 N 条 / 收起`、DOM 顺序和 stable key；页面不手写 slice。
3. **`DsReferenceRow`（单条引用）**
   - 固定顺序：来源/访问/影响 tag → 可读对象名称 → detail/occurrences → 等宽 path → 尾部状态/打开动作。
   - 名称是主信息，稳定 id/path 是次级 L4；不只显示裸 path，不用数组下标作身份。
   - 可定位：整行使用 canonical navigation/action 语义并显示 `打开 ↗`；不可定位：静态 article，显示
     `只读` 或 `暂不可定位` + 原因，不用 disabled button 假装操作。

### 2. 状态与计数合同

| 状态 | 摘要与计数 | 列表 | 危险动作关系 |
|---|---|---|---|
| ready + blocking | `n 处引用会阻断删除`；Tab count 为 exact total occurrences | 正常行/分组 | 保持领域守卫；Panel 不执行删除 |
| ready + informational | `n 处使用位置，仅供定位` 或领域具体说明 | 正常行/分组 | 不误写“解除后才能删除” |
| empty | `未发现引用` + 领域后果 | 不渲染空卡壳 | 只描述当前真值，不擅自启用动作 |
| loading | `正在检查 x/y…`，exact count 不进入 Tab | 可显示已发现结果但标未完成 | 按现有规则继续禁用危险动作 |
| partial | `至少 n 处；m 个来源读取失败`，Tab 不冒充 exact | 已知结果 + retry | 保守阻断 |
| error | 具体错误与修复/重试，`role=alert` | 不把异常转成空数组 | 不显示“无引用/可安全删除” |

- exact total 表示 occurrence 数；完全相同引用先按稳定语义键聚合，row 显示 `N 次`，避免 key 使用数组 index。
- 扫描未完成/失败时用 `≥n / 未知`，不向只接收 number 的 `DsTabs.count` 传伪精确值；完成后才显示 count。
- 影响标签至少区分 `阻断删除`、`仅信息`、`只读`、`暂不可定位`；颜色之外必须有文字。

### 3. 建议 API 形状（设计意图，不替代 build 前签字）

~~~tsx
<DsReferencePanel
  state={{ kind: 'ready', count: { kind: 'exact', value: 2 } }}
  impact={{ tone: 'warning', label: '阻断删除', description: '解除引用后才能删除。' }}
  empty={{ title: '未发现引用', description: '可以安全删除。' }}
>
  <DsReferenceGroup title="敌队槽位" count={2}>
    <DsReferenceList initialVisibleCount={12}>
      <DsReferenceRow
        key="enemy-team:team-0:slot-0"
        kind="敌队"
        title="team-0"
        detail="敌队槽位 1"
        path="enemyTeams[0](team-0).slots[0]"
        occurrenceCount={1}
        action={{ label: '打开', onActivate: () => onOpen(reference) }}
      />
    </DsReferenceList>
  </DsReferenceGroup>
</DsReferencePanel>
~~~

- 最终 API 可用 children/slots，不强迫所有领域构造同一业务 interface；但 Panel/List/Row 必须拥有状态、展开、
  语义根元素和样式，领域不能重新实现。
- `DsReferenceRow` 能生成真实 `href` 时用 `<a>`；精确定位还需 callback 且无可分享 URL 时用 `<button>`；
  无动作时用静态 `<article>`。三种根元素视觉一致，语义不靠 `role` 伪造。
- design-system 只接收展示值、状态和 callback/href，不 import `EditorLocation`、EditorState、collector 或 Command。
- 诊断、删除按钮、filter 和重试命令不是 reference row；放在 Panel status/action 或领域 section。

### 4. 视觉、内容与领域适配

- 延续当前 shared Row 的 `surface-raised + border-subtle + radius-control + space-5` 基线；hover/focus/open 由
  recipe CSS 拥有。业务 CSS 可布局领域 filter，不能覆写卡面、字体、border、radius、padding、hover/focus。
- Tab 已显示 `引用 n` 时不重复同名大标题；首屏是影响/状态摘要。单一引用 Inspector 才显示 `引用` section 标题。
- title 单行省略但完整值可达；detail/path `min-width:0`、`overflow-wrap:anywhere`，120 字符 path 无横滚且可复制。
- `打开 ↗` 固定在尾部；只读/不可定位状态占同一位置。ReferencePanel/List 不建立第二层无边界滚动。
- async progress/完成用 `aria-live="polite"`，错误用 alert；focus-visible 清晰；32px 最小目标；不使用 emoji-only。
- 简单 blocking：Actor/Skill/Enemy/Poison/BattleField/Map/NamedEntry 直接映射。
- 分组/access：Item 保留来源 group 与 read/write/config tag；不可定位原因进入 row status。
- 静态资产：Image/Music/Sound/Cutscene 用静态 row；occurrences 聚合；issues 留在 diagnostics/status。
- 异步/部分：Tileset/Stamp 的 progress/failure/retry 进入 Panel status；Stamp 明确 informational 快照语义。
- 多级精灵：WorldSprite 的动作/用途选择保留为领域 filter，三类引用分别成 group；BattleSprite 用 shared collapse。

## 依赖与实施顺序

1. `ED-INSPECTOR-TABS-1` 先完成 review 并稳定重叠 TSX/test/shared recipe；本卡 build 前刷新 inventory。
2. `ED-CATALOG-CONTROLS-1` 与本卡也重叠多数页面；两卡 build 前明确串行顺序，禁止并行改同文件。
3. 本卡顺序：规范/Design Lab fixture → shared component + tests → 领域 A-D → CSS/boundary → 全量验证。
4. ED-3 未来替换/补全引用数据源，必须复用本卡 UI；ED-3 不是前置，也不得在本卡抢跑。

领域批次：A 简单合同（Actor/Skill/Enemy/Poison/BattleField/Map/NamedEntry）；B 资产静态（Image/Music/Sound/
Cutscene）；C 复杂状态（Item/Tileset/Stamp）；D 多级引用（WorldSprite/BattleSprite）。每批后删除对应私有 skin，
不先套 wrapper 后长期双轨。

## CSS / static boundary 清理

- 迁移后 Inspector 内不得再使用以下私有 reference skin：
  - `item-reference-group/card/title/access`、`bf-reference-*`、`music-reference-*`；
  - `map-reference-list`、`tileset-removal-refs` 的行皮肤、`stamp-usage-maps` 的行皮肤；
  - `sprite-reference-link` / `world-sprite-reference-link` 的卡面皮肤、`actor-reference-list` /
    `battle-data-reference-list` 的同义 gap 覆写、`entry-reference-list` 的行皮肤。
- 可保留领域 filter/layout class（sprite action switch、scan progress grid），但不能覆写 shared row skin。
- `ref-row` 仍被 `VarsTab` 主工作区使用，不能全仓禁；boundary 限定 Inspector 生产组件和表中 16 个消费点。
- 正向门禁：16 面消费 canonical Panel/List/Row（按适用层级）；反向门禁：禁止新建私有 row/card/list 复制皮肤。
- 不新增 legacy/compat 组件、旧 class alias、双写或 fallback；旧版本兼容审查在 done 前单列。

## 验收条件

### 功能与测试

- 16 个 Inspector 引用面全部消费唯一共享合同；引用数量、删除/移除门禁、locator 参数、重试、展开收起和
  selection/deep-link 与迁移前领域测试一致。同一 reference 数据驱动列表与危险动作判断，不新增第二套统计。
- 可定位行进入正确权威页面并保留精确 focus；不可定位行静态呈现原因；无 dead button/假链接。
- exact/partial/unknown、blocking/informational、empty/loading/error 五类状态在对应真实领域可达。
- Actor 静默 12 条截断消失；World/BattleSprite 的展开迁到 shared；重复 occurrence 聚合后总数不丢。
- shared tests 覆盖状态矩阵、group/count、12 条展开、stable key、link/button/static、打开/不可定位、键盘/focus、
  20 汉字/40 英文/64 id/120 path。
- 16 个消费面各至少一条领域测试；Item/Tileset/Stamp/WorldSprite/BattleSprite/媒体/NamedEntry 覆盖各自复杂语义。
- boundary 精准限制 Inspector，不误伤 Vars/Script/Issue；私有 skin 反向清单与 canonical consumer 正向清单双门禁。
- build 后运行 editor typecheck、focused Vitest、全量 editor test；按工作树状态决定是否补全包 `pnpm check`。

### 文档与视觉

- `editor-design-system-v1.md` 固化 anatomy、状态矩阵、计数/动作语义；Design Lab 新增 simple/grouped/static/
  loading/partial/long-content fixtures；本卡 Build 记录最终文件:行号、CSS 删除和 ED-3 边界。
- 浏览器至少实测六类：Enemy、Item、Image、Tileset 或 Stamp、WorldSprite、BattleField 或 NamedEntry；全局收口
  做 16 面快速巡检。覆盖 1280/900/720、100%/150%/200% zoom、长值、空态、12+、partial/error、focus、
  `scrollWidth <= clientWidth`、单滚动 owner、console error 0。
- E2E 用例：N/A；这是功能性编辑器界面，开发期最小视觉验证，不属于剧情/演出集中 E2E。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: **verified（2026-08-16）**。一手核对生产导航、16 个 Inspector JSX、shared recipe API/CSS/test 和
    设计规范；只有 Actor/Skill/Enemy/Poison 消费 shared Row/List，其余私有结构与语义见审计表。
  - design: **agree（2026-08-16）**。采用 Panel → optional Group/List → Row；统一状态/计数/动作，领域
    collector/command 保持 owner；重叠卡串行，ED-3 非前置。
- Kimi:
  - premise: **verified（2026-08-16，本人一手读码，非复述）**。16 面中本人直接读码 11 面
    （命名落点/地图/瓦片集/组合/人物/物品/技能/敌人/毒/战场/图片/双精灵），含全部四个重点反证面；
    只有 Actor/Skill/Enemy/Poison 消费 shared Row/List 属实（ActorMode.tsx:1175、SkillTab.tsx:1284、
    EnemyTab.tsx、PoisonTab.tsx），其余私有结构逐字属实；shared Row 确实只有 title/detail/path +
    button attrs（recipes.tsx:149-174），无法表达静态行/分组/扫描状态/展开——「只换 JSX」反证不成立。
  - design: **agree（2026-08-16，附必落钉 RK1-RK2，不阻塞准入）**。三层 anatomy 能承载四个复杂面的
    语义而不丢（见下方独立反证审查）；API 不读业务 store/collector/Command；串行与 CSS/boundary
    双门禁边界正确。
- GLM:
  - premise: **verified（2026-08-16，本人一手读码，非代理）**。16 面独立复核无漏页：直接读 Kimi 未
    覆盖的四面 Music（MusicTab.tsx:355-378）/Sound（:351-379）/Cutscene（:805-836）/Image
    （:704-731），私有静态 `music-reference-item` + occurrences + 无 locator 逐字属实；主动狩猎第
    17 面——Shop「剧情调用」是静态教学卡（ShopTab.tsx:266-276，非反查列表）、Scene 实体 Inspector
    是编辑面板（App.tsx:2808-2847，命名落点引用面已单列）、PortraitEditor 仅提示文案——无漏页。
    shared API 现状属实（recipes.tsx:146-173 仅 button 根 + title/detail/path，无法表达 article/a 根、
    分组、状态、计数、展开）；「已共享」4 面消费点属实（ActorMode:1175/SkillTab:1303/PoisonTab:557/
    EnemyTab:1286）。
  - design: **agree（2026-08-16，附必落钉 GN1-GN4，不阻塞准入）**。三层 anatomy、状态/计数/动作
    合同、业务边界（design-system 不 import EditorState/collector/Command）、串行与 ED-3 解耦均可
    承载 16 面语义。详见下方「GLM 独立覆盖审查」。
- 独立反证审查：Kimi（2026-08-16，架构/视觉，见下方）；GLM（2026-08-16，覆盖/测试，见下方）。
- counter / 分歧处理: 无。
- 缺签豁免: N/A
- build 准入结论: **allowed（2026-08-16）——Codex + Kimi（RK1-RK2）+ GLM（GN1-GN4）三方签字齐。
  前置：ED-INSPECTOR-TABS-1 关卡、ED-CATALOG-CONTROLS-1 串行顺序由用户/Codex 明确后按序 build；
  build 前刷新 inventory 行号。**

#### Kimi 独立反证审查（2026-08-16，架构/视觉主审；本人一手读码）

**问题 1 — 16 面 inventory 与四重点面共享 anatomy 可行性 ✓：**
- Item（ItemTab.tsx:1946-1987）：来源分组 + article 卡 + access 标签 + mini 打开按钮 +
  unavailableReason——映射为 Group（来源）+ Row 的 access/impact tag + 尾部动作/静态原因，
  语义不丢。✓
- WorldSprite（WorldSpriteLibrary.tsx:809-878）：动作级引用 + 动作 switcher + 用途分组——
  switcher 保留为领域 filter slot（卡文 §4 明确），三类引用成 group；现行 disabled button
  「只读引用」（:858-870）正是要消灭的假操作。✓
- Tileset（TilesetTab.tsx:911-1005）：异步扫描 progress/failures/partial + 双分组 + 移除门禁——
  映射为 Panel loading/partial/error + 两 Group；门禁按钮留领域 section（卡文 §3「诊断、删除
  按钮、filter 和重试命令不是 reference row」边界正确）。✓
- Stamp（StampLibraryTab.tsx:656-700）：扫描状态 + `≥n` 保守计数 + 重试 + 快照不联动说明——
  informational impact + partial count 合同可表达。✓
- 其余抽查：Map（MapMode.tsx:3729-3747 私有 button list）、BattleField（B2-1 引用卡）、
  Image（ImageTab.tsx:704-731 静态 music-reference-item + occurrences）、Actor
  （共享 Row 但静默 `slice(0,12)` + disabled button 假操作，ActorMode.tsx:1176-1181）——
  卡文描述全部属实。

**问题 2 — 三根语义 / 标题去重 / 状态计数 ✓：**
- `<a>`（真实 href）/`<button>`（callback 精确定位）/`<article>`（静态）三根与 DS-A.1 一致，
  直接消灭 Actor/WorldSprite 现行 disabled-button 假操作（RK1 钉为门禁）。
- Tab 徽标已承担计数（ED-INSPECTOR-TABS-1 已落 `DsTabItem.count`），Panel 摘要不重复裸标题——
  与「引用 n」徽标互补，无重复层级。✓
- partial/loading 不向只收 number 的 `DsTabs.count` 传伪精确值（卡文 §2），方向正确（RK2 钉为
  契约测试）。长文本：`overflow-wrap:anywhere` + min-width:0 已在 shared CSS 基线
  （recipes.css:334-339）✓；200% zoom 由卡文浏览器矩阵覆盖。

**问题 3 — shared API 业务边界 ✓：**
- §3 明确禁止 design-system import EditorLocation/EditorState/collector/Command；Panel/List/Row
  只收展示值 + callback/href。无业务泄漏。
- 第二套 wrapper 风险由「三层 owner + 正/反 boundary + 私有 skin 删除清单」三重防住；
  「children/slots 不强迫同一业务 interface」是务实边界——行仍是同一组件，视觉统一不破。
- 最强反例自检：Tileset 的移除门禁流（扫描→确认→移除）不是引用行语义——卡文已把它划在
  Panel status/领域 section，没有硬塞进 Row，反例被预先化解。

**问题 4 — 串行与删除清单 ✓：**
- 与 ED-INSPECTOR-TABS-1（已三方 accept）/ED-CATALOG-CONTROLS-1（已 allowed 未 build）串行；
  本卡 build 前刷新 inventory 的条款正确（当前工作树已是 post-TABS 结构，引用面本身未变）。
- 删除清单与本人实证一一对应；`ref-row` 因 VarsTab 主工作区保留、boundary 限定 Inspector
  上下文的划界正确（与 ED-INSPECTOR-TABS-1 GT3 同款防误伤）。

**必落钉（build 时落实，不阻塞准入）：**
- **RK1（静态行语义门禁）**：Actor（ActorMode.tsx:1181）与 WorldSprite（:858-870）现行用
  disabled button 表达「只读/不可定位」——迁移后必须为静态 article；boundary/契约测试加一条
  「reference row 不以 disabled button 表达只读/不可定位」断言，并删除 `.ds-reference-row:disabled`
  皮肤被如此复用的可能（recipes.css:320-323）。
- **RK2（partial/loading 计数契约测试）**：扫描未完成/失败时 Tab 徽标不得显示伪精确 number
  （卡文 §2 规则）落为 shared 契约测试 + Tileset/Stamp 领域测试各一条。

**可证伪观察：**
1. 若某面适配迫使 design-system 读取 EditorState/collector/Command（本人读码未见需求——
   各面现有数据已是 typed reference + callback），边界即破 → 停线。
2. 若 16 面之外还存在 Inspector 引用面（本人直读 11 面 + 卡文称 Codex 全量；GLM 将独立复算），
   inventory 漏页 → 回 draft 补清单。
3. 若 Stamp 快照 informational 语义被 blocking 摘要吞掉（StampLibraryTab.tsx:699 的不联动说明），
   impact 合同失败 → 领域测试拦截。
4. 若 200% zoom 下「摘要 + group header + 行尾动作」产生横滚，浏览器矩阵抓住；届时只调
   minmax/换行，不加私有皮肤。

Evidence: recipes.tsx:145-174 / recipes.css:291-339 / ItemTab.tsx:1946-1987 /
WorldSpriteLibrary.tsx:809-878 / TilesetTab.tsx:911-1005 / StampLibraryTab.tsx:656-700 /
ActorMode.tsx:1164-1192 / ImageTab.tsx:704-731 / MapMode.tsx:3729-3747 / App.tsx:3745-3799 /
BattleFieldTab.tsx:439-473（此前会话直读）。只读审查，未改实现文件，未代签 GLM。

#### GLM 独立覆盖审查（2026-08-16，覆盖/测试；本人一手读码，非代理）

**premise verified — Kimi 缺口四面 + 漏页狩猎一手核实：**

| 面 | 本人实测 | 核对 |
|---|---|---|
| Music | :355-378 私有静态 `music-reference-item`，kind/owner/where；count=`selectedReferences.length`；**key 用数组下标** `${where}-${index}` | ✓（key 缺陷佐证合同） |
| Sound | :351-379 同私有结构；行内已显示 `{occurrences} 次`；issues 以 `cf-err` 独立渲染 | ✓ |
| Cutscene | :805-836 同私有结构；`本处调用 N 次`；**key 用数组下标** `${site}-${index}` | ✓ |
| Image | :704-731 同私有结构；occurrences 行 + issues 独立 | ✓ |
| 命名落点 | App.tsx:3745 NamedEntryInspector + :3845 `entry-reference-list` 私有类 | ✓ |
| 第 17 面狩猎 | Shop「剧情调用」= 静态教学卡（ShopTab:266-276）非反查列表；Scene 实体 Inspector = 编辑面板；PortraitEditor 仅 hint 文案；Ambience 无 Inspector | 无漏页 ✓ |

**RK1/RK2 独立复核（均属实，且各有一个扩面发现）：**

- **RK1 属实但范围偏窄**：Actor `slice(0,12)` + `disabled={!locator||…}`（ActorMode:1176-1181）、
  WorldSprite disabled「只读引用」假按钮（:856-870）逐字属实；**但同一 disabled 假操作模式经 shared
  `DsReferenceRow.disabled` 存在于 Skill（:1310）/Poison（:564）/Enemy（:1293）三个「已共享」页**
  ——rg 实测另有 Skill:948/Poison:415/Enemy:750/WorldSprite:1005 四处 `disabled={references.length>0}`
  是合法删除守卫、不在本钉范围。→ GN1 扩面。
- **RK2 属实且是现实缺陷**：Stamp **现在就**无条件向 Tab 徽标传 `placementCount`（
  StampLibraryTab:658），即使 `!scanComplete`（摘要文字 :283 有「至少 N 处」但徽标冒充精确）；
  Tileset 引用 Tab 现无 count（:913）。RK2 不是预防性钉，是修活缺陷。
- **boundary 清单实存核对**：editor.css 中 item-reference-group 3/item-reference-card 7/
  bf-reference 17/music-reference 7/map-reference-list 1/tileset-removal-refs 8/stamp-usage-maps 5/
  sprite-reference-link 8/world-sprite-reference-link 1/actor-reference-list 1/entry-reference-list 1/
  ref-row 8 全部实存；**事实修正：`battle-data-reference-list` 在 editor.css 0 处**——它只是
  Enemy/Skill/Poison 传给 DsReferenceList 的修饰 className（无 CSS 规则），删除项是去 class 名
  而非删规则。`ref-row` 由 VarsTab 主工作区使用（:13-38，自身也有 disabled 模式）——排除正确，
  boundary 不得全仓禁。
- **测试落点**：16 面中 12 面有独立测试文件；Image/Music/Sound/Cutscene 4 面由
  AssetInspectorTabs.test.tsx（ED-INSPECTOR-TABS-1 所建）承载 Inspector 合同，本卡在此扩展引用
  合同断言即可，不另起新文件避免双份；命名落点由 App.reference-navigation.test.tsx 承载。

**必落钉 GN1-GN4（build 时落实，不阻塞准入）：**

- **GN1（RK1 扩面到全部 16 面）**：新 `DsReferenceRow` 合同必须**移除 disabled-button 表达不可用/
  只读的路径**（不只是 Actor/WorldSprite 两页改 article）——Skill/Poison/Enemy/Actor 四个 shared
  消费点的 `disabled={!reference.locator…}` 用法随迁移一并消灭；契约测试断言：16 面内不可定位/
  只读行渲染为静态根（article）且**全 UI 生产码中不存在以 `disabled` button 表达只读引用的行**。
- **GN2（Tab 徽标计数语义切换显式化）**：§2 把徽标从现行 site/行数（Sound/Image/Cutscene/Music 的
  `selectedReferences.length`）改为 occurrence 总数——这是用户可见变化。验收条款「引用数量…与迁移前
  领域测试一致」必须读作**引用数据与守卫真值一致**，不含徽标数字形态；受影响 4 面的领域断言按新语义
  重写，且每面至少一个多 occurrence 用例（badge=Σoccurrences）。若用户实际期望徽标保持 site 数，
  须 build 前改 §2 并重签，不得边做边换。
- **GN3（group header 计数语义钉死 + 加和一致性）**：合同只定义了 Panel 徽标（occurrence 总数）和
  行内「N 次」，未定义 group header 计数。build 必须钉死一种并落测试——建议 group 计数 = 该组
  occurrence 总和，shared + Item 领域测试断言 Σgroup = Panel 徽标，杜绝「徽标 6 / 分组 2+2」的
  视觉不自洽。
- **GN4（稳定键与聚合键）**：Music（`${where}-${index}`）与 Cutscene（`${site}-${index}`）现行
  key 含数组下标，正是合同「不用数组下标作身份」要消灭的活缺陷；occurrence 聚合键必须用稳定语义键
  （site:where），迁移后领域测试断言聚合行「N 次」且重排不换身份。

**可证伪观察：**
1. build 中发现第 17 个 Inspector 引用面 → 回 draft 补 inventory 与验收，不得宣称全局完成。
2. 任一面适配迫使 design-system import EditorState/collector/Command → 停线（沿用卡文与 Kimi 观察）。
3. occurrence 徽标让媒体页摘要语义失真（如 2 处位置 ×3 次显示「6 处使用位置」）→ 用户裁决改 §2，
   属 GN2 逃生口。
4. GN1 门禁落地时若 rg 发现第六处 disabled 引用行消费点（本人实测 5 处 + VarsTab 排除 1 处），
   随迁移一并清理，不算范围扩张。

**最强替代解释自检**：现有 Row/List 足够只换 JSX——反证成立（API 无 article/a 根、分组、状态、
展开、计数，本人读 recipes.tsx:146-173 证实）；等待 ED-3——反证成立（16 面已有可显示数据与删除
真值，本卡只统一 view）；媒体差异过大——反证成立（四面信息结构 site/owner/occurrences/where 同构，
本人直读四面证实）。

Evidence: MusicTab.tsx:355-378 / SoundTab.tsx:351-379 / CutsceneTab.tsx:805-836 / ImageTab.tsx:704-731 /
recipes.tsx:146-173 / ActorMode.tsx:1175-1181 / SkillTab.tsx:1303-1310 / PoisonTab.tsx:557-564 /
EnemyTab.tsx:1286-1293 / WorldSpriteLibrary.tsx:856-870 / StampLibraryTab.tsx:283,657-658 /
TilesetTab.tsx:913 / App.tsx:2808-2847,3745,3845 / ShopTab.tsx:266-276 / VarsTab.tsx:13-38 /
ItemTab.tsx:1946-1997 / editor.css 私有类逐数 grep。只读审查，未改实现文件，未代签 Kimi，未标
build/done。

### 进入 done 前:审查签字

- Codex: **accept（2026-08-16）**。自审确认 16 面均消费 canonical Panel/List/Row，RK1-RK2 与
  GN1-GN4 全部落地；`@type-pal/editor` typecheck + 119 文件 / 891 测试通过，Design Lab 与实际工程
  快速巡检无横滚动、console error 0。原生 browser zoom 快捷键在当前内置浏览器与 Chrome
  扩展控制面都不改变 zoom，已以 9 格等效 CSS 视口补验并明记，请 Kimi 在 done 前判断是否
  需人工补看原生 zoom。
- Kimi: **accept（2026-08-16 done 前架构/视觉复审，本人一手读码 + 浏览器实测，非代理）**。
  - **纯呈现边界 ✓**：recipes.tsx:159-393 的 Panel/Group/List/Row 只消费展示值、状态与
    callback/href；唯一 import 为设计系统内部 DsStatus/DsTag/DsButton；无 EditorState/collector/
    Command 泄漏。Row 的 action union 在类型层强制 href ⊕ onActivate（:255-271），从 API 上
    不可能再构造 disabled 假操作。
  - **三根语义与假操作清零 ✓**：href→`<a>`、onActivate→`<button>`、无动作→`<article>`
    （recipes.tsx:338-363）；本人 rg 确认 16 面引用区无 disabled 行（唯一命中是 boundary 测试的
    反向断言）；6010 实测 Enemy 引用 Tab：state=ready、摘要「2 处引用会阻断删除」、两行根均为
    ARTICLE 且带「暂不可定位 + 原因」、disabledRows=0、无横向溢出。
  - **复杂领域抽查 ✓**：Item（来源分组 + access 标签 + blocking/informational impact，
    ItemTab.tsx:1963-2032）；Tileset（exact/at-least/unknown 三态 count + 保守阻断文案 + 危险动作在
    Panel 外领域区，TilesetTab.tsx:960-1056）；Stamp（scan 状态机 ready/empty/partial/loading +
    「来源快照」informational + 下界语义，StampLibraryTab.tsx:672-694）；WorldSprite（动作 switcher
    保留为组内领域 filter，动作/用途分 group，WorldSpriteLibrary.tsx:845-916）；Image（静态行 +
    occurrenceCount + `site:where` 稳定 key + 诊断独立，ImageTab.tsx:717-747）。locator、删除门禁、
    partial 语义均未丢失。
  - **16 面消费 ✓**：rg 消费清单恰为 16 个目标文件，无多无少；私有引用行皮肤零残留；唯一保留的
    `.bf-reference-panel`（editor.css:9229-9334）是 BattleField Inspector 壳布局（padding/border/
    surface），非引用行皮肤——符合卡文「可保留领域 layout class」条款，在此显式记录该解释，
    避免后续审计按 `bf-reference-*` 字面误判。
  - **zoom 等效判断**：接受 9 格等效 CSS 视口作为本卡合同级断言的替代——全部验收合同
    （overflow/滚动 owner/focus ring/徽标分离/单列降级）都是 CSS px 语义，代码无 DPR 分支，
    DS-L.1 自己也只把 zoom 当作有效 CSS 宽度的来源。等效宽度**不能**覆盖字体栅格化/次像素舍入的
    观感差异——那属于用户实机审美验收，不是本卡功能性 done 门。**补验项：无阻塞项**；建议（非阻塞）
    用户验收时在可原生 zoom 的浏览器过一眼 RF-16 长文本/窄栏观感。
  - 观察（不阻塞）：DsReferenceRow 的组内 labels 用数组下标 key（recipes.tsx:303-306）——
    DS-C.6a 的禁下标规则针对行身份（行已用稳定 site/where/id），labels 是行内叶子短列表，
    不构成违规；若未来 labels 变动态可再收紧。
  - 剩余风险：GLM 的 GN1-GN4 与测试矩阵待其独立复审；绊线门禁的结构性强化沿用
    ED-INSPECTOR-TABS-1 的既有备注。
- GLM: **accept（2026-08-16 done 前覆盖/测试复审，本人一手读码 + 独立复跑，非代理；基于当前
  工作树未提交实现 diff，39 文件）**。RK1-RK2 + GN1-GN4 逐钉独立验证：
  - **RK1/GN1（disabled 假操作清零）**：生产码 rg 复跑——16 面引用行零 `disabled=`（仅存
    `disabled={references.length > 0}` 类删除守卫，合法且明确不在钉范围）；新 `DsReferenceRowAction`
    union 以 `never` 字段在类型层强制 href ⊕ onActivate 互斥（recipes.tsx:255-271），API 上不可能
    再构造 disabled 假操作；三根渲染 `<a>`/`<button>`/`<article>`（:338-363）；boundary 对 16 面内
    每个 `<DsReferenceRow/>` 逐一断言无 `disabled=`。Actor slice(0,12) 静默截断已删（现为 shared
    DsReferenceList :1182，展开由 shared 拥有）。
  - **RK2（伪精确计数修复）**：**Stamp 活缺陷已修**——:667 `count: scanComplete ? … : undefined`
    （修复前无条件传 placementCount）；Tileset :957 同构 + exact/at-least/unknown 三态；shared 契约
    测试 `reference panels … without inventing exact counts`（recipes.test:228）；领域测试 Stamp
    `至少 0 处` 下界（:203）+ Tileset partial 扫描删除禁用（:202）/重试（:216,244）/完整零引用
    门禁（:225）/磁盘失败路径（:231）/空态（:248）。
  - **GN2（occurrence 徽标语义）**：媒体四面 fixture 恰为**判别用例**——每面 1 site × 2 occurrences，
    断言徽标"引用 2"（AssetInspectorTabs :165/:183/:200/:219）；旧 site 语义会显示 1，判别力成立；
    MusicTab :152 `total + reference.occurrences` 求和逐字核实。
  - **GN3（分组计数加和）**：shared 测试 :290 断言 group 计数渲染 + 12 条展开 + 「2 次」+收起；
    Item 徽标 = `itemReferences.length`（:1960，entries 与 occurrence 1:1），分组 =
    `group.entries.length`（:1984），Σgroup = 徽标自洽。
  - **GN4（稳定键）**：Music/Cutscene 引用行 key 均为 `${site}:${where}`（MusicTab:393 /
    CutsceneTab:839），数组下标 key 从四面消失（Cutscene:900 的 index key 属导入文件列表，范围外）。
  - **boundary（读码复核）**：16 面正向双断言（Panel+Row 必须存在）；11 个私有 skin 在 16 文件源码
    与 editor.css 双场所零残留；**VarsTab 双向保护**（必须保留 ref-row、不得引入 DsReferencePanel）；
    recipes.tsx 禁 import `../core/` 与 EditorState/collector/Command——纯呈现边界落地为门禁。
    VarsTab.tsx 不在本次 diff 中，无误伤实据。
  - **规范与 Design Lab**：DS-C.6a v2.3.0（editor-design-system-v1.md:379）、RF-16 fixture
    （DesignLab.tsx:604）均已固化。
  - **回归独立复跑**：typecheck PASS；focused（recipes/boundary/AssetInspectorTabs）40/40；全量
    editor 891/891（与 Codex 声明一致）。`pnpm lint` 全仓基线 227 errors 为存量且卡外，如实登记
    不阻塞。
  - 同意 Kimi 两条非阻塞观察（Row 组内 labels 下标 key 不构成行身份违规；等效 CSS 视口对 CSS px
    语义合同的充分性），用户实机原生 zoom 观感属用户验收环节。
- counter / 返工处理: none as of Codex self-review
- 缺签豁免: N/A
- done 准入结论: **allowed（2026-08-16）——Codex + Kimi + GLM 三方 accept 齐。由 Codex/用户关卡；
  用户实机视觉验收（含原生 zoom 观感）建议随关卡一并完成。**

## Draft: 设计与风险

### 设计结论

- 扩充现有 `DsReferenceRow/List`，不另造“新版引用卡”。Panel 拥有完整性/影响，Group/List 拥有组织/展开，
  Row 拥有视觉和根元素语义；领域只做 adapter 和命令。
- 统一表现合同，不统一业务引用图。复杂 Sprite/Item 保留 filter/group/access；Media 无 locator 时静态呈现。
- 计数以 occurrence 为用户语义；partial/unknown 不进入数值 Tab badge。对象级危险动作 owner 不改变。
- 规范、Design Lab、组件契约、领域测试、boundary 与 CSS 清理同批完成，不长期双轨。

### 已知风险

- 重叠卡/脏树冲突：build 前重读 current diff/inventory；禁止 reset/checkout/整文件重写用户改动；三卡串行。
- 过度统一抹掉 Stamp/Tileset/WorldSprite 语义：impact/state/group 硬合同 + 复杂领域专项测试 + Kimi 主审。
- 只扩 slots 导致领域继续私有壳：三层 owner + 正反 boundary + 私有 skin 删除清单。
- exact count/href 反向扩张 ED-3：只消费现有 count/locator，partial 诚实呈现，不能定位则静态。

### 主审立场

- Reviewer: Kimi + GLM
- 结论: Kimi premise verified + design agree（2026-08-16，附 RK1-RK2）；GLM premise verified +
  design agree（2026-08-16，附 GN1-GN4）
- 必改项: RK1（静态行语义门禁：reference row 不以 disabled button 表达只读/不可定位）、
  RK2（partial/loading 不向 Tab 徽标传伪精确 count 的契约测试）；
  GN1（RK1 扩面至全部 16 面，含 Skill/Poison/Enemy/Actor 四个 shared 消费点）、GN2（occurrence
  徽标语义切换显式化 + 受影响面领域断言重写）、GN3（group 计数语义钉死 + Σgroup=徽标加和测试）、
  GN4（消灭 Music/Cutscene 数组下标 key，聚合键用 site:where）
- 是否建议进入 build: 是——三签已齐；但须先满足串行前置（ED-INSPECTOR-TABS-1 关卡 +
  ED-CATALOG-CONTROLS-1 顺序明确），build 前刷新 inventory 行号。

### 三方争议记录

- Codex: 支持三层合同、16 面迁移、串行 build、ED-3 解耦。
- Kimi: 同意；无产品形态分歧（整行可点击 vs 尾部动作按卡文三根语义：可定位=整行 canonical
  action，静态=article，无需用户再裁）。
- GLM: 同意三层合同与 ED-3 解耦；唯一提请用户留意项见 GN2——occurrence 总数徽标是用户可见的
  计数语义变化，若期望保持 site 数须在 build 前改 §2 重签，否则按合同执行。
- 用户拍板: 已拍板统一方向；若整行可点击 vs 尾部独立动作产生产品形态分歧，再交用户裁决。

## 额度 / 代班记录

- 缺席 Agent: none
- 其余: N/A

## Build: 实现与自测

- Coding Owner: Codex（2026-08-16 开始 build）
- 串行裁决: Codex 按用户“自行判断顺序”授权，确定先完成 `ED-REFERENCE-UI-1`，再开始
  `ED-CATALOG-CONTROLS-1`；两卡不并行修改重叠实现文件。
- 共享合同: `packages/editor/src/ui/design-system/recipes.tsx:159-390` 新增/ 扩充
  `DsReferencePanel` / `DsReferenceGroup` / `DsReferenceList` / `DsReferenceRow`；原生根元素为
  `<a>` / `<button>` / `<article>`，不再接收 disabled 假操作；List 拥有初始 12 条与稳定身份变更后
  收起。`recipes.css:291-480` 拥有唯一卡面、长文本、hover/focus 与窄宽布局。
- 16 面迁移: `App.tsx` 命名落点、Map/Tileset/Stamp、Actor/Item/Skill/Enemy/Poison/BattleField、
  World/Battle Sprite、Image/Music/Sound/Cutscene 全部消费同一合同。保留各领域 collector、
  locator、删除/移除门禁、重试和 deep-link owner。Stamp/Tileset partial/loading 不再向 Tab 传
  伪精确 count；媒体 badge/group 以 occurrence 总和计数，Music/Cutscene key 不再用数组下标。
- 规范与门禁: design-system 版本升至 2.3.0；`editor-design-system-v1.md:379`固化 DS-C.6a；
  `DesignLab.tsx:456` 新增 RF-16；`boundary.test.ts:239` 正向约束 16 面且反向禁止私有 skin/
  disabled 引用行，明确排除 VarsTab。`editor.css` 删除任务卡列出的旧引用皮肤，未留
  alias/fallback。浏览器发现并修复 Design Lab 隐式网格列在窄宽下超出视口的问题。
- 验证:
  - `pnpm --filter @type-pal/editor run typecheck` 通过。
  - 13 个聚焦文件 / 113 测试通过。
  - `pnpm --filter @type-pal/editor run check` 通过：119 文件 / 891 测试。
  - `git diff --check` 通过；本卡涉及的 TypeScript / TSX / CSS 经 Biome format。
  - 根目录 `pnpm lint` 未通过：当前全仓基线有 227 errors / 9 warnings / 28 infos，
    主要是本卡外 `packages/content` 格式/旧 walker lint 及已有 editor a11y 规则；本卡未扩大
    范围修理这些存量问题。
- 跳过检查: 无功能/单测跳过；原生 150%/200% browser zoom 受工具限制，见视觉记录。
- 旧版本兼容审查: **pass（2026-08-16）**。本卡只改当前 canonical UI，未新增旧版
  upgrader、类型、fixture、版本分支、产品升级入口、compat variant、旧 class alias 或 fallback。

## 资源生成记录

N/A：本卡使用 React/CSS/code-native 组件，不生成位图资源。

## 视觉验证记录

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: 复用 `localhost:6010` dev server，用内置浏览器检查 RF-16 与 PAL 实际工程。
  重点实测 Enemy / Item / Image / Tileset / WorldSprite / BattleField，并对 16 面快速巡检；
  PAL 当前 Stamp 库为 0 项，该面由 Stamp 领域测试 + RF-16 partial/error 补验。
- 实测结果: 实际 Inspector 宽度约 289px 时长 path 无横滚动；Image 279 occurrences 聚合为
  79 行，首屏 12 行与“显示其余 67 条”正常；Item group `1 + 7 = 8`；静态媒体根为
  `ARTICLE`，可定位行为 `BUTTON`；Tileset 未完整扫描时为 partial + unknown 且 Tab 无假 count。
- 尺寸/缩放: 1280 / 900 / 720 在 100% 通过。内置浏览器与已连接 Chrome 的快捷键都未改变
  browser zoom，因此不伪称原生 zoom 已跑；改用等效 CSS 宽度补验 9 格：
  `1280/100=1280`、`1280/150=853`、`1280/200=640`、`900/100=900`、`900/150=600`、
  `900/200=450`、`720/100=720`、`720/150=480`、`720/200=360`。全部为
  `document/grid/stage/row overflow = 0`，动作行最小高 90px，360px 时为单列。
- focus / console: Tab 键定位到第二个引用行时 `:focus-visible=true`，2px 蓝色 outline；
  Design Lab 和实际工程 console error 均为 0。截图为会话内临时视觉证据，未写入仓库。
- 未完成项: 无阻塞项。Kimi 已接受 9 格等效 CSS 视口作为合同级断言；原生 zoom 的字体栅格化观感仅作为
  非阻塞用户实机建议，不再阻止 done。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- Codex 自审: accept；证据见 Build、视觉记录和 done 前签字。
- Kimi 架构/视觉复审: **accept（2026-08-16）**；逐项证据见 done 前签字 Kimi 条目；zoom 等效
  CSS 视口替代被明确接受为合同级断言，原生 zoom 观感留用户实机验收（非阻塞）。
- GLM 覆盖/测试复审: **accept（2026-08-16）**；RK1-RK2 + GN1-GN4 逐钉通过，typecheck、focused
  40/40、全量 editor 891/891 独立复跑通过；证据见 done 前签字 GLM 条目。
- 必须返工项: 无。
- Accept / rework: **accept**。

## 用户验收

- 用户结论: **2026-08-16 用户确认 `ED-REFERENCE-UI-1` 签字完成**；Codex、Kimi、GLM 三方 accept 与
  done 准入均已满足，本卡收口为 done。原生 zoom 字体栅格化观感保留为非阻塞实机建议。
- 后续任务: 可按既定串行顺序推进 `ED-CATALOG-CONTROLS-1`；`ED-DIAGNOSTIC-UI-1` 复用中性 locator
  视觉骨架但保持独立诊断语义；ED-3 未来必须复用本呈现层。

## 交接日志

- 2026-08-16 Codex: 读取强制文档、设计规范、最新 Web Interface Guidelines 与当前脏工作树；逐面核对
  16 个 Inspector 引用实现，形成三层 anatomy、状态/计数/动作合同、迁移矩阵、CSS/boundary 和测试/视觉门禁。
  只新增本卡并更新看板，未改实现、未运行测试/浏览器。Evidence: 本卡真值矩阵、审计与 Codex 签字。
  Next: Kimi 独立架构/视觉审查，再交 GLM 覆盖/测试签字；签字不齐不得开始实现。
- 2026-08-16 Kimi: 架构/视觉主审完成，签 premise verified + design agree（附 RK1-RK2）。一手直读
  16 面中 11 面（含 Item/WorldSprite/Tileset/Stamp 四个重点反证面），确认共享 anatomy 不丢语义；
  发现 Actor/WorldSprite 现行用 disabled button 表达只读（RK1 钉为静态 article + 门禁）、
  partial 计数不得进 Tab 徽标（RK2 钉为契约测试）；shared API 无业务泄漏，串行与 CSS/boundary
  边界正确。未改实现文件，未代签 GLM。Next: GLM 覆盖/测试 build 前审查。
- 2026-08-16 GLM: 覆盖/测试审查完成，签 premise verified + design agree（附 GN1-GN4）。一手直读
  Kimi 未覆盖的 Music/Sound/Cutscene/Image 四面 + 命名落点面，第 17 面狩猎无漏页（Shop 剧情调用
  是教学卡、Scene 实体 Inspector 是编辑面板、PortraitEditor 仅文案）；RK1 证据属实但扩面——
  Skill/Poison/Enemy 经 shared DsReferenceRow.disabled 同案（GN1）；RK2 是活缺陷——Stamp 现在
  就向徽标传伪精确数（:658）；boundary 清单实存（battle-data-reference-list 修正为 JSX 修饰类
  0 CSS 规则）；ref-row/VarsTab 排除正确。GN2 显式化 occurrence 徽标语义切换（提请用户留意的
  唯一项）。未改实现文件，未代签 Kimi，未标 build/done。三签齐，build allowed（串行前置待满足）。
  Next: 用户/Codex 明确与 ED-CATALOG-CONTROLS-1 串行顺序后 Codex 进 build。
- 2026-08-16 Codex: 用户授权自行判断串行顺序并开工。Codex 选择先做本卡、后做
  `ED-CATALOG-CONTROLS-1`，确认三签与 Inspector Tabs 前置均已满足；任务转 `build`，分支为
  `codex/ed-reference-ui-1`。Next: 刷新 post-TABS 代码 inventory，先落 shared reference contract 与测试。
- 2026-08-16 Codex: build 完成并转 `review`。落地 DS 2.3.0 的 Panel/Group/List/Row，迁移 16 面、
  删除私有 reference skin、新增 RF-16 / DS-C.6a / boundary 及领域回归，RK1-RK2/GN1-GN4 均已落实。
  Evidence: focused 13/113 pass；editor 119/891 pass；16 面快巡；9 格等效缩放宽度无溢出；console error 0。
  已明记原生 browser zoom 工具限制与全仓 lint 存量红项，未伪装通过。Codex 自审 accept，
  未代签 Kimi/GLM，未标 done。Next: Kimi 架构/视觉复审，再交 GLM 覆盖/测试复审。
- 2026-08-16 Kimi（架构/视觉）: done 前复审完成并签 **accept**。一手读码 shared 四层
  （recipes.tsx:159-393 纯呈现、action union 类型层强制 href ⊕ onActivate、API 无法构造 disabled
  假操作）+ rg 门禁复跑（16 面消费清单恰好、私有行皮肤零残留、disabled 引用行零命中）+
  6010 实测 Enemy 引用 Tab（ready/阻断摘要/两行 ARTICLE 带暂不可定位原因/零溢出）。
  四复杂领域（Item/Tileset/Stamp/WorldSprite）与静态媒体领域语义逐点未丢；`.bf-reference-panel`
  壳布局保留已显式记录解释。原生 zoom 限制：接受 9 格等效 CSS 视口替代合同级断言（全部合同均为
  CSS px 语义、无 DPR 分支），字体栅格化观感差异留用户实机验收，无阻塞补验项。
  未改实现文件，未代签 GLM。Next: GLM done 前覆盖/测试复审；签齐后由 Codex/用户关卡。
- 2026-08-16 GLM（覆盖/测试）: done 前复审完成并签 **accept**（基于工作树 39 文件未提交 diff）。
  RK1-RK2 + GN1-GN4 逐钉独立验证：disabled 假操作生产码清零 + action union 类型层互斥 + boundary
  逐 Row 禁断；**Stamp 伪精确徽标活缺陷已修**（:667 scanComplete 门控）；媒体四面 fixture 为
  1 site × 2 occurrences 判别用例（旧语义显 1、新语义断言"引用 2"）；分组计数加和自洽（shared
  :290 + Item 逐字）；Music/Cutscene 数组下标 key 消灭（site:where）；boundary 正反门禁含 VarsTab
  双向保护与 recipes 纯度；DS-C.6a/RF-16 固化。typecheck + focused 40/40 + 全量 891/891 本人独立
  复跑通过。同意 Kimi 两条非阻塞观察。未改实现文件，未代签 Kimi，未标 done。
  Next: 三签齐——由 Codex/用户关卡；用户实机视觉验收（含原生 zoom 观感）建议随关卡一并完成。
- 2026-08-16 User + Codex: 用户确认本卡签字完成；Codex 核对 Codex/Kimi/GLM 三方 done 前 accept、
  `done 准入结论: allowed`、Review 与验证证据均齐，任务由 `review` 收口为 `done`。当前工作树新增的
  Project 资源绑定行小改后，editor 全量仍为 119 文件 / 892 测试通过，未发现引用合同回归。Next: 无下一位
  Agent；按既定顺序推进后续编辑器任务。

## 下一位 Agent 提示词

无下一位 Agent 提示词；三方 accept 与用户关卡均已完成，`ED-REFERENCE-UI-1` 已收口为 done。下方仅保留
历史交接提示词作为审计记录，不再授权新的 build/review 动作。

### 给 Kimi（架构 / 视觉 build 前审查——已完成）

Kimi 已于 2026-08-16 完成 build 前审查并签字（premise verified + design agree，附 RK1-RK2，
见「Kimi 独立反证审查」），本节提示词不再适用。

### 给 GLM（覆盖 / 测试 build 前审查——已完成）

GLM 已于 2026-08-16 完成 build 前审查并签字（premise verified + design agree，附 GN1-GN4，
见「GLM 独立覆盖审查」），本节提示词不再适用。

### 给 Codex（三签齐，串行前置满足后进 build，可直接复制）

```text
接手任务: ED-REFERENCE-UI-1 属性面板引用呈现全局统一——build 实现
任务卡: docs/ops/archive/tasks/done/ED-REFERENCE-UI-1-inspector-reference-presentation.md
当前状态: draft→build 就绪；Codex + Kimi（RK1-RK2）+ GLM（GN1-GN4）三签齐。
前置: ED-INSPECTOR-TABS-1 已关卡（Codex/GLM accept，Kimi 待签时不阻塞本卡准备但关卡前不得合流）；
与 ED-CATALOG-CONTROLS-1 的串行顺序由用户/Codex 明确——两卡禁止并行改同一批文件。
开工动作: 逐文件重读当前工作树（post-TABS 结构），刷新 16 面 inventory 行号后再改实现。
你的角色: Coding Owner——规范/Design Lab fixture → shared Panel/Group/List/Row + 契约测试 →
领域批 A（简单）/B（媒体静态）/C（Tileset/Stamp/Item 复杂状态）/D（双精灵多级）→ CSS/boundary
收口 → 全量验证。
必落钉:
  Kimi RK1: Actor/WorldSprite 只读/不可定位引用改静态 article，禁 disabled button 假操作。
  Kimi RK2: partial/loading 不向 DsTabs.count 传伪精确 number——shared 契约测试 + Tileset/Stamp
    领域测试各一条（注意：Stamp 现状 :658 无条件传 placementCount，是活缺陷必须修）。
  GLM GN1: RK1 扩面到全部 16 面——新 Row 合同移除 disabled-button 不可用路径，Skill/Poison/Enemy/
    Actor 四个 shared 消费点（:1310/:564/:1293/:1181）随迁移消灭；契约测试断言 16 面内不存在
    disabled button 表达只读引用的行。
  GLM GN2: 徽标计数从 site/行数切换为 occurrence 总数（§2）；Sound/Image/Cutscene/Music 领域
    断言按新语义重写，每面至少一个多 occurrence 用例；验收条款"数量一致"读作数据/守卫真值一致。
  GLM GN3: group header 计数钉死为 occurrence 总和（建议），shared + Item 测试断言 Σgroup=徽标。
  GLM GN4: 消灭 Music（`${where}-${index}`）与 Cutscene（`${site}-${index}`）数组下标 key；
    聚合键用 site:where。
验收红线: 引用数据/删除守卫/locator 参数/重试/深链与迁移前一致；16 面各至少一条领域测试
（媒体四面扩展 AssetInspectorTabs.test.tsx，不另起新文件）；boundary 正反双门禁不误伤
VarsTab ref-row；battle-data-reference-list 是 JSX 修饰类（editor.css 0 规则），删除项是去
class 名；typecheck + focused + 全量 editor test + 1280/900/720 × 100/150/200% 浏览器矩阵。
不要做: 不 reset/checkout 用户脏树；不并行 ED-CATALOG-CONTROLS-1 同批文件；不抢跑 ED-3 扫描器；
不新增 legacy variant/旧 class alias。
完成后: 写 Build 记录并自验，交 Kimi/GLM done 前复审；旧版本兼容审查 done 前单列 pass/counter。
```

Codex 已于 2026-08-16 完成上述 build，本节历史提示词不再适用。

### 给 Kimi（架构 / 视觉 done 前复审——已完成）

Kimi 已于 2026-08-16 完成 done 前架构/视觉复审并签 accept（含 zoom 等效判断：接受 9 格等效
CSS 视口替代合同级断言，原生 zoom 观感留用户实机验收）。本节提示词不再适用。

### 给 GLM（覆盖 / 测试 done 前复审，Kimi 完成后可复制）

```text
复审任务: ED-REFERENCE-UI-1 属性面板引用呈现全局统一——done 前覆盖/测试审查
任务卡: docs/ops/archive/tasks/done/ED-REFERENCE-UI-1-inspector-reference-presentation.md
分支: codex/ed-reference-ui-1
当前状态: review；你的职责是独立复核 GN1-GN4 与 16 面覆盖，不得复述 Codex/Kimi 代签。
必读: AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、任务卡全文及
  docs/phase2/specs/editor-design-system.md 的 DS-C.6a。
审查重点:
1. 核对 boundary 正向清单确有 16 面的 Panel/Row，反向清单不误伤 VarsTab `ref-row`；狩猎第 17 面。
2. 独立复核 RK1/RK2 + GN1-GN4：不可定位行为 article；partial/loading Tab 无伪 exact count；
   媒体 badge=Σoccurrences；Item Σgroup=panel count；Music/Cutscene 无 index key，site:where 聚合不丢次数。
3. 抽查命名落点、媒体四面、Item/Tileset/Stamp/双 Sprite 的领域测试和 locator/门禁真值。
4. 运行 `pnpm --filter @type-pal/editor run check`；将全仓 lint 存量红项与本卡新回归分开，
   不因基线红项伪改范围，也不得隐瞒新红项。
允许改动: 默认只读审查；发现问题写 counter/返工项。
输出: 在任务卡“进入 done 前”的 GLM 行签 `accept` 或 `counter`，附直接证据、检查命令与剩余
风险；更新 Review/交接日志。只有 Codex/Kimi/GLM 三方全为 accept 才可建议 done；不得独自标 done。
```
