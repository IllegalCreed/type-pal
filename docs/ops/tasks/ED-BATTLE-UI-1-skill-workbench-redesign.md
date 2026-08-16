# ED-BATTLE-UI-1 - 战斗数据工作台族与共享对象 Hero

Status: review
Phase: phase2
Capability: Editor / Actor shell / Battle data（不改变能力状态）
Coding Owner: Codex
Reviewer: Kimi（架构/视觉）+ GLM（覆盖/测试）
Visual Verification Owner: Codex + User
Blocked by: Kimi / GLM done 前独立复审 + 用户实机验收

## 用户裁决与目标

用户于 2026-08-15 明确否决“只完成底部面板纠错就停下”的范围理解，要求 Agent 主动把角色标题、技能、
敌人等页面一起按同一设计系统重构，不再等待逐页截图点名。本卡因此从单独 Skill 页面扩为第一批连续迁移：

1. 在 editor 内建立唯一共享的对象 Hero、对象目录行、中央 section/card、Inspector section 组合合同；
2. 用用户更认可的 BattleField 主次层级统一 Actor 与 BattleField 对象标题，而不是继续保留 Actor 的紧凑
   “头像 + 小标题条”私有样式；
3. 同批迁移 Skill / Enemy / Poison 三个 Battle data 页面，证明共享合同可承载不同领域，而不是复制某页 JSX；
4. 完成后不等待用户继续点名，按 ED-AUDIT-2 矩阵连续推进 Item/Shop、Assets、Map、Story/Project/Scene 批次。

一句话 `before -> after`：Actor、Skill、Enemy、Poison 当前分别使用紧凑标题条或直接裸表单开始，右侧职责、
section、列表和媒体层级不一致；改后统一为“对象 Hero → 任务分区/结构化 section → 摘要/引用/危险操作
Inspector”，保留各领域内容与交互差异。

代表对象：`li-xiaoyao`、Skill `295` 梦蛇、Enemy `enemy-398` 史莱姆、Poison 首项；上述对象在同一
1280×720 浏览器会并排体现统一层级，且原字段值、深链和试玩入口不变。

## 范围

### 范围内

- `design-system` 新增/补齐可组合的 `DsObjectHero`、`DsObjectCatalog` / selected row、
  `DsWorkbenchSection`、`DsInspectorSection`（最终命名由实现决定，但生产只能有一套语义权威）。
- Object Hero 固定槽位：eyebrow/type、主标题、stable id、1 行职责摘要、状态/meta、主/次动作；可选 avatar/media
  只能作为辅助，不得把标题缩成 Actor 当前 60px 宽的小块。
- Actor：只迁 title/hero、tabs 衔接、列表与中央 surface/spacing；保留四个任务分区和现有领域编辑器。
- BattleField：把现有 `bf-editor-heading` 抽到同一 Hero recipe，保持当前信息层级、字段和引用行为。
- Skill：建立对象 Hero（含战斗中试放）、基础/消耗、效果链、媒体、施法分支 sections；效果摘要与选中效果
  编辑分离；右侧改为摘要、引用、当前效果上下文、删除阻断。
- Enemy：建立对象 Hero（名称/id/战斗精灵/试打）、基础/外观/数值/音效/AI/掉落演出 sections；敌队与引用
  进入有 padding 的 Inspector；移除贴边长说明。
- Poison：建立对象 Hero、逐回合与关系 sections、关系/引用 Inspector；不继续借 Skill 私有 `.skill-form`。
- 四页统一全宽方角 selected row、搜索/计数密度、focus-visible、空错加载状态、Wide/Medium/Narrow panel 行为。
- ED-1 七环：创建、编辑、保存、重开、深链、引用、删除/阻断；另验 undo/redo 与 Skill/Enemy 试玩链接。
- 删除本批页面私有 inline layout 与被共享 recipe 替代的 CSS；领域 editor 可保留独立类，但不得再拥有页面壳。

### 范围外

- 不改 content schema、save/migration、Skill/Enemy/Poison runtime 语义、原版数值或试玩协议。
- 不在本卡重写 Actor 战斗数据、伤亡脚本、升级曲线等领域编辑器。
- 不把 Item/Shop/Assets/Map/Story/Project/Scene 实现塞进同一巨大 diff；它们已经登记为随后连续批次，
  不再等待用户逐页提出。
- 不把 BattleField JSX 或 Actor JSX复制给其他页面；共享只发生在 recipe/primitive 与稳定的数据适配层。

## 前提真值门

| 维度 | 当前真值 | 一手证据 |
|---|---|---|
| 原版 / primary source | N/A：1995 游戏没有现代作者编辑器对象工作台，不能决定本任务信息架构。 | `docs/phase2/READ-FIRST.md:20-22` |
| 第一阶段 | N/A：第一阶段没有此编辑器；运行时对象语义只作为内容字段参考，本卡不改运行时。 | `docs/phase2/READ-FIRST.md:8-22` |
| 当前二阶段 | 生产同时存在三代语言：Actor 私有 88.75px 紧凑 hero + tabs；Skill 从 `基础` section 直接开始且 Inspector 只有说明；Enemy 同样从 `基础` 裸表单开始且右侧混敌队/试打/长帮助；Poison 复用 Skill 私有 class。 | `ActorMode.tsx:390-444`; `SkillTab.tsx:693-760`; `EnemyTab.tsx:460-540`; `PoisonTab.tsx:308-370`; Chromium 1280×720 实测 |
| 本任务目标 | 以 BattleField 已获用户认可的主次层级为视觉输入，但代码落为共享 recipe；同批迁 Actor title 与 Skill/Enemy/Poison，字段/引用/试玩语义不变。 | 用户 2026-08-15 本轮裁决；`BattleFieldTab.tsx:280-306`; `editor-ui-audit-2026-08-15.md:20-67` |

最强替代解释：只把 Actor 标题放大、给 Skill/Enemy 加 padding 会更快。反证是当前问题同时包含 hero 缺失、
section 平铺、Inspector 职责、列表 active、媒体位置和响应式；继续逐页补 CSS 会产生第四套页面语言。

可证伪观察：如果 Actor/Skill/Enemy/Poison 已经使用同一 Hero/section/Inspector recipe，且页面只剩领域字段差异，
则无需本批重构。当前组件与浏览器 DOM 均不满足。

## 冻结设计

### 1. 统一对象 Hero

- Wide 高度由内容自然决定，目标 `104–144px`；padding 使用 design-system space token。
- 视觉顺序：eyebrow → `h1/h2` 主标题 → stable id / 摘要；状态与动作在右侧，Narrow 自动下沉而不挤压标题。
- Actor avatar 可保留为 lead；Skill 可用类型 icon；Enemy 可用 battle-sprite thumbnail；Poison 可用状态色标。
- 删除动作不得成为 Hero 唯一强动作；必须有确认/引用阻断，危险操作也在 Inspector 可发现。

### 2. 页面骨架

- 左：共享 ListHeader + filter + full-width square selected row + footer create action；数量使用统一 count badge。
- 中：最深 canvas；Hero 与内容之间有明确留白；sections 使用 raised card 或分组行，不允许连续裸字段铺满整页。
- 右：至少 `16px` 内边距；固定为摘要、引用、当前 selection、危险操作；大段教程改 callout/help。
- tab 只在确有任务分区时存在（Actor 保留）；Skill/Enemy/Poison 不为了统一而虚构 tab。

### 3. 领域结构

- Skill：Hero / 基础与消耗 / 效果链目录+编辑 / 媒体 / 施法分支；战斗中试放在 Hero actions。
- Enemy：Hero / 外观 / 核心数值 / 音效 / AI / 掉落演出；敌队与试打在 Inspector。
- Poison：Hero / 玩家 ticks / 敌人 ticks / 关系；关系图与引用在 Inspector。
- Actor：共享 Hero + 既有四 tabs；BattleField：共享 Hero + 现有 cards。

### 4. 响应式

- Wide：list/main/inspector 三栏。
- Medium：list + main；Inspector 由 Header `Inspector` 控制为既有 panel/drawer 权威。
- Narrow：main 为主；对象列表与 Inspector 由全局布局命令恢复，不横向滚动隐藏入口。
- 200% zoom 不把 Hero 标题、tab 或 action 挤成纵排单字。

## 实现顺序

1. 共享 Hero/section/Inspector/list recipes + fixture/tests；不要先复制页面 CSS。
2. Actor + BattleField 迁入共享 Hero，做并排视觉基准。
3. Skill 完整迁移并闭合创建/编辑/保存重开/深链/引用/删除/试放。
4. Enemy + Poison 迁移，同步拆出领域 subcomponent，避免继续增长 823/479 行页面组件。
5. 1280/900/720 + 125/150/200% 浏览器巡检；空态、长名、500+ options、键盘、console 零 error。
6. Kimi/GLM done 前复审 + 用户实机验收；随后直接开始 ED-AUDIT-2 下一批，不再等逐页点名。

## 验收矩阵

- Shared contract：四页 Hero DOM/heading/actions 语义一致，页内无第二套 hero recipe；selected row 同一 class/token。
- Actor：四 tabs、reference jump、NPC/battler 两类、long id/name、Medium/Narrow 不回归。
- Skill：effect reorder/delete、media preview、cost items、execution override、trial href、创建/删除引用阻断。
- Enemy：battle sprite preview、stats/sounds/AI/team、trial link、create/delete/ref；长队伍/规则不撑破 Inspector。
- Poison：ticks reorder、关系编辑/导航、创建、保存重开、空关系态。
- Accessibility：heading hierarchy、label、icon aria-label、focus-visible、keyboard list/tab、错误 `aria-live/alert`。
- Performance：103 Skill / 153 Enemy 列表不阻塞输入；长选项使用可搜索 picker，不新增巨型原生 select。
- Regression：`pnpm --filter @type-pal/editor typecheck/test/build`；相关 target tests；浏览器 console error 0。

## 推进签字

### draft -> build

- Codex: **premise verified + design agree（2026-08-15）**。一手读取四个生产组件并在 Chromium 1280×720
  复核 Actor/Skill/Enemy；确认是共享页面壳问题，不是字段/schema 问题。允许在三签齐后实现。
- Kimi: **premise verified + design agree（2026-08-15，附必落钉 BK1-BK3，不阻塞准入）**。三代页面语言、
  共享 recipe 边界、三页 IA、响应式降级均一手核实；详见下方「Kimi 独立反证审查（build 前）」。
- GLM: **premise verified + design agree（2026-08-15，本人一手读码，非代理；附必落钉 N1-N6）**。
  五页调用域全枚举核实；三代页面语言属实（Actor 1090/Skill 1109/Enemy 823/Poison 479 行、Poison
  复用 skill-form:361）。**关键工作增量 N1**：ED-1"删除/阻断"环对 Skill/Enemy/Poison 不是"保留"
  而是**新建**——Skill 无对象删除命令/入口（只有行级删除）、Enemy 删除只有 confirm() 无引用阻断
  （contrast Actor 的 blockingActorReferences :2082）、Poison 只有 tick 行删除无对象删除。验收矩阵
  已含此项，但 build 不得按"已有"估算。详见下方「GLM 独立覆盖审查（build 前）」。
- build 准入: **allowed（2026-08-15）——Codex + Kimi（BK1-BK3）+ GLM（N1-N6）三方 build 前签字
  齐；各钉为 build 必落。由 Codex 转 build。**

#### GLM 独立覆盖审查（build 前，2026-08-15，本人一手读码；非代理）

**五页调用域独立枚举（创建/编辑/保存/深链/引用/删除/undo/试玩）：**

| 页 | 路由/深链 | 创建 | 编辑 | 删除 | 引用阻断 | undo/redo | 试玩 |
|---|---|---|---|---|---|---|---|
| Actor | editor-navigation:127 acceptsObject | AddActorCommand :1994 | UpdateActor 系 | DeleteActorCommand :2070 | **blockingActorReferences :2082**（typed collector） | EditSession apply/invert | N/A |
| BattleField | :189 acceptsObject | Add/Copy（B2-1） | Update | Delete（B2-1） | **battle-field-reference.ts**（形状递归） | 同上 | N/A |
| Skill | :161-166 acceptsObject | AddSkillCommand :3094 | UpdateSkillCommand :3026 | **无 DeleteSkillCommand；UI 无对象删除**（:585/:895/:996 均行级） | **无编辑器级 collector**（content validate-refs skillId×22 仅加载期） | Add/Update 有 invert | **trial** `play.html?project&scene=s001&battle=0&skill=<id>`（:750-756） |
| Enemy | :169-174 acceptsObject | AddEnemyCommand :2619 | UpdateEnemyCommand :2585 | DeleteEnemyCommand :2634 **仅 confirm() 无阻断**（EnemyTab:670-679） | **无**（enemyId×8 加载期） | 同上 | **trial** `play.html?battle=<team>`（:50+按钮） |
| Poison | :177-182 acceptsObject | AddPoisonCommand :4230 | UpdatePoisonCommand :3317 | **无对象删除**（:117 onRemove 是 tick 行） | **无**（poisonId×5 加载期） | 同上 | N/A |

**premise verified**：
1. 三代页面语言属实——Actor 紧凑 hero（:390-444）、Skill/Enemy 裸表单起手、Poison 借
   `.skill-form/.sk-grid`（:358-361 注释自认）。
2. 文件规模属实：1090/335/1109/823/479 行。
3. BattleField hero recipe（:280-306）已获用户认可,作为视觉输入正确。
4. 可证伪观察成立：五页无共享 Hero/section/Inspector recipe。

**design agree**：共享 recipe + 四页同批迁移 + BattleField 视觉输入不复制 JSX + 领域 editor 保留 +
零 schema/runtime——与用户裁决和 ED-DS-2 边界一致。

**必落钉 N1-N6（build 必落；N1 是工作量级澄清）：**

- **N1（关键——ED-1 删除/阻断环须新建,非保留）**：
  - Skill：新建 `DeleteSkillCommand` + typed skill 引用 collector（enemy AI cast skillId×22、
    levelUp 行 skillId、learnedSkills 值、item 装备 effects 等）；collector 与 content validate-refs
    同源逻辑（C1-1/B2-1 单一定义两消费者模式）。
  - Enemy：`DeleteEnemyCommand` **补引用阻断**——transform enemyId（×8）、**敌队 380 队
    members/slots**、choreography；confirm() 不得作唯一防线。
  - Poison：新建对象删除 + applyPoison.poisonId（×5）阻断；tick 行删除与对象删除分离。
  - 三者删除均须引用清单可跳转 + undo/redo 对称 + 删除后保存重开无悬空。
- **N2（测试文件从零）**：**EnemyTab/PoisonTab 当前无任何测试文件**；SkillTab.test 289 行部分覆盖。
  build 须新建 EnemyTab.test.tsx / PoisonTab.test.tsx,每页至少：创建/编辑/保存重开/深链定位/
  引用清单/删除阻断/undo-redo/试玩 href（Skill/Enemy）。
- **N3（深链回归）**：五页均 acceptsObject——迁移后 `?object=<id>` 仍精确落对象；Actor reference
  jump 与 Skill/Enemy 引用跳转全绿。
- **N4（试玩协议字节保留）**：Skill trial `play.html?project=<id>&scene=s001&battle=0&skill=<id>` 与
  Enemy trial `?battle=<team>` href 格式**不得改变**（play.html 消费端不在本卡）；契约测试钉模板。
- **N5（Poison 私有类零残留）**：迁移后 rg `skill-form|sk-grid` 在 PoisonTab 零命中。
- **N6（零 schema/runtime 变化门）**：build diff 不触碰 `packages/content/src` 与
  `packages/reforge/src`；收口跑两包 check 全绿作证据。

**可证伪观察：**
① 若 Skill/Enemy/Poison 已有带阻断的对象删除（本人未发现 DeleteSkill/DeletePoison,Enemy Delete
  无 blocking）,N1 工作量假设错误——build 前复核一次即可。
② 迁移后五页 Hero DOM 不一致（第二套 hero recipe）→ 验收矩阵第一行拦截。
③ trial href 参数改变或丢 `?project=` → play.html 试放/试打失效——N4 拦截。
④ Enemy 删除阻断漏敌队 slots → 删除后保存重开悬空——N1 覆盖面拦截。

Evidence: editor-navigation.ts:127,161-189 / commands.ts:1994,2070-2082,2585,2619,2634,3026,3094,
3317,4230 / actor-references.ts:258 / battle-field-reference.ts / validate-refs.ts:757-847（skillId×22/
enemyId×8/poisonId×5）/ SkillTab.tsx:750-756 / EnemyTab.tsx:50,670-679 / PoisonTab.tsx:117,358-361 /
wc -l 1090/335/1109/823/479 / ls 测试（Enemy/Poison 无）。只读审查,未改实现文件,未代签 Kimi,
未标 build/done。

### Kimi 独立反证审查（build 前，2026-08-15；本人一手读码）

**前提核实（三代语言并存，逐项属实）：**
- Actor 私有紧凑 hero：`ActorMode.tsx:410-427`（avatar 块 + kicker + h2 + code + badges）+
  `editor.css:2424-2457`——44px avatar 带 gradient+shadow+硬编码 hex #66718a、kicker 10px 全大写
  （违 DS-F.3 12px 下限与 DS-F.2a 无阴影/纹理）。
- BattleField 参考层级：`BattleFieldTab.tsx:280-283` eyebrow/h2/职责摘要/删除按钮结构属实，是用户
  认可的视觉输入；但注意其 h2 为 25px（`editor.css:9600-9606`），不在 DS-F.3 阶梯内（见 BK1）。
- Skill 裸表单开局 + 说明型 Inspector：`SkillTab.tsx:743-758` 中央直接从「基础」section 开始、
  试放链接嵌在 section h4；`:1097-1101` 右侧只有 insp-hint。
- Enemy 裸表单 + 右侧混合职责：`EnemyTab.tsx:516-541` 从「基础」开始；`:692-699` 敌队·试打、
  `:816-817` 贴边长说明。823 行与卡文一致。
- Poison 借 Skill 私有 class：`PoisonTab.tsx:358-364` 直接使用 `et-scroll skill-form` + `sk-grid`，
  479 行与卡文一致。卡文「复用 Skill 私有 class」逐字属实。
- 列表行三页已共用 `.arow/.sel` 旧 class（SkillTab:713、EnemyTab:494、PoisonTab:329），但非
  design-system 合同，无统一 selected row 语义。

**共享抽象边界核对：**
- `design-system/recipes.tsx:5-18` 当前只有 19 行 `DsWorkbench` slot 壳（list/main/inspector），
  响应式/drawer 语义在 app-shell——DsObjectHero/DsWorkbenchSection/DsInspectorSection 是纯新增，
  不与既有 primitive 冲突；editor 包内闭环，不扩跨包接口。✓
- Hero 固定槽位（eyebrow/title/id/summary/meta/actions/avatar lead）能覆盖四页差异：Actor avatar、
  Skill 类型 icon、Enemy sprite 缩略、Poison 色标均走 slot 而非布尔变体，符合 DS-IMP.3。
- 页内动作（试放/试打 href、删除阻断）是页面 adapter 回调，不进 app command registry——依赖方向正确。

**IA 与响应式核对：**
- Skill「Hero/基础与消耗/效果链目录+编辑/媒体/施法分支」、Enemy「Hero/外观/核心数值/音效/AI/掉落
  演出」、Poison「Hero/ticks/关系」与现有字段全集可映射，无字段增减；tab 只留 Actor 四分区
  （ActorMode.tsx:429-442 既有 tablist 保留），三页不虚构 tab。✓
- 响应式：Medium Inspector 由 Header 布局命令控制（v2.1/v2.2 已交付的 app-shell 权威）、Narrow 由
  全局布局命令恢复——与本卡 §4 一致，不产生第二套降级逻辑。✓
- schema/runtime 零改动：四页只 dispatch 既有 command；试玩 href（SkillTab:752、EnemyTab:699/726）
  保持不变。✓

**必落钉（build 时落实，不阻塞准入）：**
- **BK1（Hero 归一冻结 token，不复制视觉参考的偏差）**：BattleField `bf-editor-heading` h2 是 25px
  （editor.css:9600-9606）、Actor kicker 10px（:2449-2457）、avatar gradient+shadow（:2434-2444）——
  共享 DsObjectHero 必须用 DS-F.3 title 阶梯（20/16/14）与 DS-F.2a surface/border token；BattleField
  迁入共享 Hero 时把 25px 一并归一（用户认可的是层级结构，不是 25px 这个数值；若实机验收认为 20px
  标题偏小，须按 DS-G.4 升版而非页面级偷改）。
- **BK2（recipe 防 mega-props）**：DsObjectHero 的 domain 差异只走 slot（avatar/icon/chip）与
  actions ReactNode，禁止布尔 props 堆变体；公共 props 变更按 DS-IMP.3 配契约测试；四页不得在页内
  用私有选择器覆写 hero 结构。
- **BK3（死 plumbing 顺手清，范围受控）**：`App.tsx:1822` 已传 `tabBar={null}`，本批四页迁移时删除
  其 `tabBar` prop 与 DataMode 对应分支的传参（DataMode.tsx 中 Skill/Enemy/Poison/BattleField 分支）；
  其余页面的 plumbing 全量清理仍归 ED-DS-2 收口，本卡不越界。

**附记（非必落钉）**：Skill/Poison 新建仍用 `window.prompt`（SkillTab.tsx:731、PoisonTab.tsx:346）
——属既有行为保留，不算回归；但创建后选中/深链/undo 必须闭环（验收矩阵已含）。改 dialog 是加分项，
不强制。

**可证伪观察：**
1. 若四页已存在共享 hero recipe（实测无：四种结构各异、Poison 直接借 class），本卡前提不成立——
   实测三代语言并存，前提成立。
2. 若迁移后任何创建/更新/删除 command 或试玩 href 语义变化（对比迁移前后 dispatch 与 href 字符串），
   即越界——验收矩阵的七环与试玩链接断言会抓住。
3. 若 DsObjectHero 被任一页面以私有 CSS 覆写结构而非 slot/variant（review 时 grep 页内 hero 覆写
   选择器），共享合同失败，done 前拦截。
4. 若 BK1 的 20px 标题在用户实机验收中被判偏小，按 DS-G.4 走升版裁决，不回退到页面级 25px。

Evidence: ActorMode.tsx:410-442 / SkillTab.tsx:693-760,1097-1101 / EnemyTab.tsx:457-541,692-699,
816-817 / PoisonTab.tsx:305-364 / BattleFieldTab.tsx:280-315 / editor.css:2424-2457,9600-9606 /
design-system/recipes.tsx:5-18 / App.tsx:1822。只读审查，未改实现文件，未开 build/done。

### review -> done

- Codex: **accept（2026-08-15）**。共享 recipe、五页迁移、Skill/Enemy/Poison typed 引用阻断与可逆删除、
  深链一次性消费、试玩 href、保存重开均已实现并验证；完整证据见下方「build 实现与自验证证据」。
- Kimi: pending
- GLM: pending
- done 准入: blocked

## build 实现与自验证证据（Codex，2026-08-15）

### 实现

- 新增唯一共享 recipe：`DsObjectHero`、`DsCatalogRow`、`DsWorkbenchSection`、
  `DsInspectorSection`；样式只使用 design-system token，Hero 标题统一 20px，列表选中为全宽方角，
  领域差异通过 lead/meta/actions slot 注入。
- Actor / BattleField 已迁入共享 Hero、列表与 section 语言；Actor 保留四个任务 tab，BattleField 保留
  原引用 Inspector 与 B2-1 领域行为。
- Skill / Enemy / Poison 已迁入同一对象工作台；三页均有 Hero、结构化中央 section、有 padding 的
  摘要/引用/危险操作 Inspector；Poison 对 `.skill-form|.sk-grid` 零依赖。
- 新增 `battle-data-references.ts` typed collector：只递归已知 command arm；覆盖 Skill 的 actor/level-up/
  manifest/item/enemy cast，Enemy 的 enemy-team/transform/summon，Poison 的 skill/item/poison relation。
  新增 Skill/Enemy/Poison 引用阻断删除命令与 exact invert；UI 引用可跳转，引用存在时删除 disabled。
- 修复 Skill/Enemy/Poison 深链与本地创建竞争：外部 `focusObjectId` 每个值只消费一次，首次目标未加载时
  可重试；本地创建后不再被旧 query object 拉回原对象。
- App 新增 battle-data typed reference navigation；Skill/Enemy 试玩 href 保持原协议字节不变。
- 本卡未修改 `packages/content/src` 或 `packages/reforge/src`；工作树中两目录的既有改动属于其他任务。

### 自动化验证

- 共享 recipe + typed collector/delete + 三页 UI 定向：**6 files / 22 tests passed**。
- Editor 全量：`pnpm --filter @type-pal/editor test` → **114 files / 815 tests passed**。
- Editor typecheck：`pnpm --filter @type-pal/editor typecheck` → passed。
- Editor production build：`pnpm --filter @type-pal/editor build` → passed（仅既有 large-chunk warning）。
- Content 回归：`pnpm --filter @type-pal/content check` → **41 files / 481 tests passed**。
- Reforge 回归：`pnpm --filter @type-pal/reforge check` → **100 files / 1023 tests passed**。
- Project IO 定向保存重开：Skill/Enemy/Poison 创建、序列化、重载后 stable id/对象值一致 → passed。
- `git diff --check` → passed；Poison 禁用类与五页旧 Hero/row 私有选择器定向 `rg` → 零命中。

### 浏览器最小视觉验证

- Chromium 实测 Actor / BattleField / Skill / Enemy / Poison 五页，1280×720、900×720、720×720：
  页面非空、每页恰一个共享 Hero、恰一个 selected row、无 body 横向溢出、console warning/error 为 0。
- 125% / 150% 等效宽度下 Actor 与 Skill 无横向溢出；200% 等效 640px 下 Hero 标题、tab、action
  仍保持横排可读，不出现单字纵排。全局既有 `html, body { min-width: 720px; }` 在 640px 产生页面级
  横向滚动，记录为 app-shell 后续边界，不是本卡页面 recipe 回归。
- Inspector 实际内容内边距为 16px；Skill/Enemy 试玩入口可达；浏览器已恢复 1280×720 Skill 页面。

## 交接日志

- 2026-08-15 Codex: 初稿仅覆盖 Skill，等待 ED-DS-2 foundation。
- 2026-08-15 User: 明确要求角色标题、技能、敌人等页面一起主动重构，不接受仅完成底部面板纠错后停下。
- 2026-08-15 Codex: 实机/读码确认三代页面语言并存；扩卡为共享对象 Hero + Actor/BattleField 参考迁移 +
  Skill/Enemy/Poison 第一批连续迁移。未改生产实现，等待 Kimi/GLM build 前独立签字。
- 2026-08-15 Kimi（架构/视觉主审）: 一手读码完成 build 前复审，签 premise verified + design agree，
  附必落钉 BK1-BK3。三代语言逐项核实（Actor 私有紧凑 hero 含 10px kicker/gradient avatar、Skill/Enemy
  裸「基础」开局、Poison 直借 skill-form、BattleField heading 为用户认可参考但其 h2=25px 不在冻结
  阶梯内——BK1 要求共享 Hero 归一 DS-F.3 token 而非复制偏差）；DsWorkbench 当前仅 19 行 slot 壳，
  共享 Hero/section/Inspector 为纯新增不冲突；响应式复用 v2.1/v2.2 app-shell 布局权威；tabBar 死
  plumbing（App 已传 null）本批四页顺手清（BK3）。未改实现文件，未开 build。
  Next: GLM 覆盖/测试重签后由 Codex 进 build。
- 2026-08-15 GLM: build 前覆盖审查签 premise verified + design agree（N1-N6）。五页调用域全枚举：
  Actor/BattleField 有完整删除阻断;**Skill 无对象删除、Enemy 删除仅 confirm 无阻断、Poison 无对象
  删除**——N1 钉死"删除/阻断环须新建";EnemyTab/PoisonTab 无测试文件——N2 新建;trial href 协议
  N4 字节保留。三方签字齐,build allowed。
- 2026-08-15 Codex: build 完成并自验 accept。共享 Hero/row/section/Inspector 已迁入五页；N1-N6 与
  BK1-BK3 均落地；Editor 815、Content 481、Reforge 1023 tests 全绿，typecheck/build/浏览器巡检通过。
  任务转 review，等待 Kimi/GLM done 前独立复审与用户实机验收，不得标 done。


## 下一位 Agent 提示词

### 给 Kimi（done 前架构/视觉复审，可直接复制）

```text
接手任务: ED-BATTLE-UI-1 战斗数据工作台族与共享对象 Hero done 前复审
任务卡: docs/ops/tasks/ED-BATTLE-UI-1-skill-workbench-redesign.md
状态: review；Codex build 与自验已完成，Kimi/GLM accept 未齐，不得标 done
角色: Kimi，架构/视觉主审。只读审实现与浏览器，不修改生产实现。
先读: 本卡冻结设计、Kimi build 前 BK1-BK3、build 实现与自验证证据；
  docs/phase2/editor/editor-design-system-v1.md；packages/editor/src/ui/design-system/recipes.tsx/.css。
重点核验:
1. DsObjectHero/DsCatalogRow/DsWorkbenchSection/DsInspectorSection 是唯一共享合同，领域差异走 slot，
   五页无私有 hero/selected-row 结构覆写；BK1 20px/token、BK2 无 mega-props、BK3 四分支死 tabBar 清理。
2. Actor/BattleField/Skill/Enemy/Poison 的主次层级、中央深色 canvas、Inspector 16px、Medium/Narrow 降级；
   200% 下标题/tab/action 不纵排。全局 min-width:720 的既有 640px 横滚请区分为 app-shell 后续项。
3. Skill/Enemy/Poison 领域字段、试玩入口与引用/危险操作没有因视觉迁移降级；console 零 error。
输出: 在本卡 review -> done 的 Kimi 行签 accept（附一手 file:line/浏览器证据），或 counter + 精确返工项；
不得代签 GLM，不得在三签和用户验收前标 done。
```

### 给 GLM（done 前覆盖/测试复审，可直接复制）

```text
接手任务: ED-BATTLE-UI-1 战斗数据工作台族与共享对象 Hero done 前复审
任务卡: docs/ops/tasks/ED-BATTLE-UI-1-skill-workbench-redesign.md
状态: review；Codex build 与自验已完成，Kimi/GLM accept 未齐，不得标 done
角色: GLM，覆盖/数据/测试主审。只读审实现与测试，不修改生产实现。
先读: 本卡 GLM build 前 N1-N6 与 build 实现/证据；
  packages/editor/src/core/battle-data-references.ts；commands.ts 的 DeleteSkill/Enemy/Poison；
  battle-data-references.test.ts、battle-data-delete-commands.test.ts、SkillTab/EnemyTab/PoisonTab tests、project-io.test.ts。
重点核验:
1. typed collector 覆盖 canonical Skill/Enemy/Poison consumer，显式 command arm、无假阳性 owner self-ref；
   引用阻断、可跳转、exact invert、删除/undo/save-reopen 无悬空。
2. 五页 ?object 深链；Skill/Enemy trial href 字节；Poison skill-form|sk-grid 零残留；Enemy/Poison 新测试存在。
3. ED-1 创建/编辑/保存/重开/深链/引用/删除或阻断七环及 undo/redo；Editor 815、Content 481、
   Reforge 1023 tests、typecheck/build 证据可复跑。
4. 本卡 diff 不引入 content/reforge 变更；工作树内两目录已有改动必须按任务边界区分，不把它们误归本卡。
输出: 在本卡 review -> done 的 GLM 行签 accept（附一手 file:line/测试证据），或 counter + 精确返工项；
不得代签 Kimi，不得在三签和用户验收前标 done。
```
