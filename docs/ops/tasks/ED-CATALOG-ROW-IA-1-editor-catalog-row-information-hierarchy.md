# ED-CATALOG-ROW-IA-1 - 编辑器对象目录行信息层级收口

Status: done（2026-08-29 Codex / Kimi / GLM 三方 accept 与用户复验均通过）
Phase: phase2
Capability: Editor cross-cutting（不改变 capability-map）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: `main`

## 目标

统一编辑器对象目录行的内容语义，而不重开已经完成的 `DsCatalogRow` 结构合同：名称始终是主身份，稳定 ID 默认是
次级信息；`leading` 只承载真实预览或有明确选择价值的语义媒体，`trailing` 只承载关键分类或需要立即处理的异常
状态。普通状态、重复引用统计和机器字段不得继续挤成一串，也不得为了视觉对齐给没有媒体的对象伪造图标。

## 范围

- 范围内：
  - 从当前生产代码的全部 `DsCatalogRow` 消费点生成内容采用矩阵，逐列表记录 `leading / title / meta / trailing`
    的实际语义、是否帮助选择对象、是否与 Hero / Inspector / 筛选器重复。
  - 战场目录：名称为 `title`，`#006` 一类稳定 ID 为 `meta`，省略 `leading`；仅默认战场状态留在
    `trailing`。
  - 物品目录：保留真实物品图标、名称和稳定 ID；删除普通能力文字与 `引用 N` 的常驻拼接；能力继续由筛选器和
    对象详情表达，只有 `待迁移`、错误等需要处理的状态进入 `trailing`。
  - 毒目录保持为正向基线：全体省略 `leading`，名称为 `title`、ID 为 `meta`、可解度为关键分类
    `trailing`；不补骷髅、毒物道具图标或其他假媒体。
  - 对矩阵发现的同类语义错位一次性收口；不能只修用户截图中的三个页面。
  - 2026-08-27 增量：删除入口、场景根、战斗精灵、过场资源、敌队、已登记变量、未登记变量和大世界精灵目录中
    无法区分具体对象、或已被分组/状态重复表达的固定符号；保留真实头像、色样、播放语义、图片缩略图和物品图标。
  - 2026-08-28 用户验收增量：音乐 / 音效目录中的固定三角形只随整行执行“选择对象”，不播放、不暂停、
    不表达当前播放状态，也不区分具体资源；从共享音频目录删除该 `leading`，真实播放继续由中央工作区唯一负责。
  - 2026-08-28 用户继续裁决：敌人目录使用其绑定 enemy `BattleSpriteDef` 的 `profile.idle.start` 静态帧作为
    真实缩略图 `leading`；名称、EnemyId 与非空 AI 规则数保持。缩略图只加载一帧，不播放动画、不回退通用 emoji。
  - 2026-08-28 用户验收返工：普通对象目录第一行显示作者可读名称或由真实内容派生的可读标签，第二行原样显示
    该对象真实、可复制、可搜索和可深链的稳定 ID。敌队以成员构成派生标题、`team.id` 回到 `meta`，删除“语义槽”
    技术摘要；无 label 资源不得让 title / meta 重复同一个 AssetId。
  - 2026-08-28 用户继续返工：Shop 左侧目录必须保留固定标题，并由共享目录滚动壳持有唯一纵向 scroll owner；
    adoption registry 必须登记实际可达的 `DsListHeader / DsCatalogRow / scroll viewport`，门禁不得再只检查 owner
    字符串非空而放过组件不可达、CSS 无滚动 owner 的假 adopted。
  - 2026-08-29 用户最终验收返工：Enemy 对象 Hero 必须复用目录同源的 `idle.start` 真实帧与缓存，EnemyTeam
    对象 Hero 删除无识别价值的固定剑；生产 `DsObjectHero.media` 做完整 census 和双向门禁，避免只修截图两处。
- 范围外：
  - 不改 `DsCatalogRow` 公共 props、固定行高、选中态或 focus 合同；滚动 owner 原冻结范围已被用户本轮明确覆盖，
    仅允许按新重签合同修 Shop 与明确同构目录族的共享 catalog workspace，不借机重排无关页面。
  - 不改 schema、migration、引用收集真值、筛选结果、对象选择、删除守卫或运行时行为。
  - 不把裸数字或横线 ID 在 UI 中伪装成并不存在的 `.pal.` 点分 ID；若未来要把 `295`、`enemy-468`、`team-0`
    真正迁成新 canonical ID，必须另开 schema / migration / 全引用高风险卡。
  - 不重开已完成的 `ED-DS-3`、`ED-CATALOG-CONTROLS-1`、`ED-5I`、`B2-1` 或 `B10`。
  - 不处理项目“启动摘要”；它归 `ED-PROJECT-STARTUP-IA-1`。
- 明确不做：
  - 不要求不同业务列表拥有相同图标；一致性按同一列表族判断。
  - 不为没有真实媒体的领域新增 emoji、装饰图标或无业务含义占位图。
  - 不用逐页面 CSS 调整正文位置；内容必须进入共享组件已有的正确槽位。

## 前提真值门

### 一句话行为 / 工程前提

`DsCatalogRow` 已统一结构和密度，但没有替业务页面决定四个槽位应放什么；当前至少存在“ID 冒充媒体”和“普通状态、
引用统计挤入 meta”的语义漂移，本卡只收口内容层级，不修改底层数据或公共组件接口。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：二阶段编辑器对象目录没有原版作者 UI 可对照。 | `docs/phase2/READ-FIRST.md:1-8` |
| 第一阶段 | N/A：一阶段没有 Reforge 数据工作台或 `DsCatalogRow`。 | `docs/phase2/READ-FIRST.md:32-37` |
| 当前二阶段 | `DsCatalogRow` 已区分 `leading/title/meta/trailing`，且同一列表可全体省略媒体槽；BattleField 把 ID 放入 `leading`，Item 把 ID、能力、引用数和异常拼进 `meta`，Poison 则已按名称/ID/分类正确分槽。 | `packages/editor/src/ui/design-system/recipes.tsx:101-143`；`docs/phase2/editor/editor-design-system-v1.md:404-411`；`packages/editor/src/ui/BattleFieldTab.tsx:260-273`；`packages/editor/src/ui/ItemTab.tsx:1147-1175`；`packages/editor/src/ui/PoisonTab.tsx:393-403` |
| 本任务目标 | 默认目录行只保留帮助识别和选择对象的信息；真实媒体、主名称、稳定 ID 与关键分类/异常各归正确槽位。 | 用户 2026-08-25 对战场、毒、物品三次截图裁决；本卡验收条件 |

### 反证与替代解释

- 最强替代解释：能力和引用数能帮助作者快速扫描物品，战场 ID 放在最前也能提高按编号查找速度。
- 什么观察会推翻当前前提：在名称/ID 搜索、能力/引用筛选和中央详情均存在时，去掉常驻重复信息仍显著增加作者
  找对象或判断对象能力的步骤；或某领域没有额外信息便无法区分同名对象。
- audit 红项如适用，已排查的替代根因：
  - runtime 语义 / 命令分类：不适用；不改变运行时或命令。
  - 原版 / 第一阶段理解：无对应作者 UI，不以原版菜单布局推断。
  - extractor / 地图 / 数据解码：不适用；全部证据来自当前 UI 绑定。
  - audit / test model：不能只看共享组件是否采用，必须检查真实业务值以及 Hero、Inspector、筛选器是否重复。

### 用户可见偏离

- 是否主动偏离已核真值：yes。
- `before -> after` 一句话：技术 ID 可占媒体槽，普通能力和引用数挤成一串 -> 名称优先、ID 固定作为
  `meta`，媒体只放真实预览，`trailing` 只保留关键分类或异常状态。
- 2026-08-27 增量 `before -> after`：固定 emoji / 字符图标只要“看起来像一种类型”即可常驻 -> 只有移除后会
  降低对象识别或选择准确性的媒体才保留；已被标题、`meta`、分组或 `trailing` 表达的类型/状态不重复占槽。
- 2026-08-28 合并增量 `before -> after`：音频目录保留无行为的固定三角形、敌人目录没有真实媒体 -> 音频
  整族省略 `leading`，敌人整族显示绑定战斗精灵的待机首帧；最终按“是否真实帮助辨认对象”而非符号一致性分类。
- 2026-08-28 Shop 滚动返工 `before -> after`：标题与行组件虽已统一，但父层 `overflow:hidden`、子列表无
  scroll owner，21 行在小窗口被直接裁掉且 registry 仍假报 adopted -> 标题固定、共享 catalog viewport 唯一滚动，
  registry / gate 对真实 JSX 可达性和 CSS 滚动合同 fail-loud。
- 代表场景：PAL 战场 `#006`、物品 `61 观音符`、毒 `551 赤毒` 在默认宽度与窄侧栏中的目录行。
- 用户裁决：2026-08-25 用户明确要求战场 ID 回归普通层级、物品目录降噪，并要求把结论正式落成任务卡防遗忘；
  2026-08-27 又明确裁决“没用、没意义的 item 图标都应去掉，占地方”，授权按选择价值而不是装饰一致性判断；
  2026-08-28 进一步确认敌人目录应使用绑定战斗精灵的待机首帧，作为真实、逐对象变化的识别媒体。

## 上下文锚点

- 已拍板决策 / 铁律：
  - `ED-DS-3` 已完成，只冻结结构、行高、采用矩阵与防回流门禁；已完成旧卡不得重开。
  - `ED-CATALOG-CONTROLS-1` 只持有目录标题、搜索与筛选，不决定对象行内容。
  - `ED-5I:97-100` 曾要求能力徽标；本卡仅以用户 2026-08-25 最新裁决覆盖“目录行常驻密度”，不重开物品
    CRUD、引用闭包或图标资产合同。
- 代码锚点（`file:line`）：
  - `packages/editor/src/ui/design-system/recipes.tsx:101-143`
  - `packages/editor/src/ui/BattleFieldTab.tsx:260-273`
  - `packages/editor/src/ui/ItemTab.tsx:389-399,1147-1175,1225-1233`
  - `packages/editor/src/ui/PoisonTab.tsx:393-403`
  - `packages/editor/src/ui/EnemyTab.tsx:540-552,727-741`
  - `packages/content/src/enemy.ts:85-93`
  - `packages/content/src/battle-sprite.ts:129-145`
  - `packages/content/src/validate-refs.ts:256-262,1268-1283`
  - `packages/reforge/src/assets.ts:339-419`
  - `packages/editor/src/ui/SpriteThumb.tsx:1-42,74-108`
  - `packages/editor/src/ui/ActorMode.tsx:416-433`
  - `packages/editor/src/ui/SkillTab.tsx:1060-1069`
- 已知坑 / 审计文档：
  - `docs/phase2/editor/editor-design-system-v1.md:53-91,404-411`
  - `docs/ops/tasks/ED-DS-3-editor-design-system-adoption-gate.md`
  - `docs/ops/tasks/ED-CATALOG-CONTROLS-1-global-catalog-controls.md`
  - `docs/ops/tasks/ED-5I-item-workbench.md:95-100`
- 不得重新引入：ID 冒充媒体、普通统计常驻、同族有的有媒体槽有的无、假图标、私有 padding/行高补丁。
- 相关测试：`BattleFieldTab.test.tsx`、`ItemTab.test.tsx`、`PoisonTab.test.tsx`、
  `design-system/recipes.test.tsx`、`design-system-adoption.test.ts`。

## 验收条件

- 功能：
  - 由真实生产消费点生成目录行内容矩阵；每个附加常驻信息都说明选择价值及为何不能只放详情/筛选/Inspector。
  - BattleField 使用 `title=名称`、`meta=#ID`、无 `leading`，默认状态留在 `trailing`。
  - Item 使用真实图标、名称、稳定 ID；普通能力和总引用数不再常驻，异常状态进入 `trailing`。
  - Poison 保持全体无媒体槽，不生成假图标；可解度继续作为选择时有价值的分类。
  - AudioAsset 全族移除静态播放三角形，中央播放 / 暂停 / 停止和非零引用数不变。
  - Enemy 全族使用绑定 enemy profile 的 `idle.start` 静态首帧；不得硬编码裸 `0`、复用动画预览、全量 eager
    解码或创建逐行 timer。缺定义 / 错 profile / 缺资源不得串用其他敌人帧或通用 emoji。
  - EnemyTeam 使用真实成员名称与重复数派生可读 title（空集合显示“空敌队”），第二行精确显示 `team.id`；
    “N 个语义槽”不再常驻。搜索、选择、试玩、深链和命令继续使用原始 `team.id`。
  - `SkillData.id` 等裸数字稳定 ID 原样显示，不制造 `skill.pal.*` 展示别名；EnemyId 与 AssetId 也保持各自真实语法。
  - Audio、BattleSprite、Cutscene、Image、WorldSprite 五个资源目录在合法的缺 label 分支仍保持“可读类型标题 +
    精确 AssetId meta”，不得让两行重复同一个 ID；矩阵与 DOM 测试覆盖该分支。
  - Shop、Item、Skill、Enemy、Poison、Ambience、SharedScript 七个同构普通目录统一消费共享非虚拟
    `DsCatalogWorkspace`：标题 / controls 固定，内部 catalog viewport 是该 region 唯一纵向 scroll owner；Shop
    21 行在短窗口可滚到最后一行，且中央正文改用真实 `DsObjectWorkspace`，不再借用保留 CSS class 冒充组件。
  - Tileset（fieldset）、Stamp（固定分页 footer）、Audio / WorldSprite / BattleSprite（`DsVirtualList`）与 Cutscene
    （分区嵌套目录）保持各自已核 owner，不被套入新的非虚拟 viewport；不得形成同轴嵌套滚动。
  - 其他消费点若与同一规则冲突，同一切片收口并记录；无冲突页面不做机械改写。
- 测试：
  - 三个代表页断言 `data-leading`、title/meta/trailing 的 DOM 语义，不只断言整行 `textContent`。
  - Item 测试证明“有引用”筛选和右侧引用数仍工作，目录行移除引用数不改变引用真值。
  - Enemy 缩略图测试证明按 AssetId + revision + `idle.start` 取帧、进入视口前零读取、同资源同 revision
    合并读取、revision 变化失效、仅 bake 一帧且不创建动画 timer；目录 DOM 全族 `data-leading=present`。
  - Audio 的 music / sound 两种 strategy 均断言 `data-leading=none`，且生产源码不再把 play glyph 放进目录行。
  - adoption registry 对全部 25 个注册页使用结构化、可定位的 catalog / scroll owner 证据；每个 scroll owner
    至少登记 `region + axis + source + component + callsite`，canonical DS owner 必须能从真实 routed root 的 live render
    到达，custom owner / N/A 必须有可验证例外。假 token、dead JSX、local shadow、保留 class 冒充、漏登记和同一
    `region+axis` 双 owner 均须使门禁失败；不同 region 的 catalog / main / inspector 各自有 owner仍合法。
  - 七个首批页面的 DOM 合同断言固定 header、唯一 visible catalog owner、无同轴嵌套 owner；公共组件 CSS boundary
    锁定 `min-width/min-height:0`、`overflow:hidden` root 与 `overflow:auto` viewport，业务 TSX 不得输出保留
    `ds-catalog-* / ds-object-workspace* / data-ds-scroll-*` 标记。
  - 运行目录矩阵/设计系统门禁和受影响页面聚焦测试；最终只跑一次 editor 全量。
- 文档：把内容槽位选择门写入 `editor-design-system-v1.md`，采用矩阵保留证据锚点和合理例外原因。
- 视觉 / 手工验证：PAL 项目在默认宽度与 720px 检查 `#006`、`61`、`551`，覆盖选中态、对齐、长名称
  截断、滚动与缩放；另抽查史莱姆、灯笼、黑毛球、烂香菇的目录缩略图与中央待机首帧一致。缩略图固定
  36×36 等比、底部居中、关闭像素平滑；加载前后正文不跳、行高仍 68px，快速滚动不得串图。Shop 另在
  1280×720 与短高 / 125% 缩放验证最后一行可达、标题留在原位、滚轮与键盘只改变 catalog viewport 的
  `scrollTop`，focus outline / 选中态不裁切，页面或祖先不跟滚且无第二条同轴滚动条。
- E2E 用例登记：N/A（功能性编辑器界面在 build 期做最小浏览器验证）。

## 推进签字

### 2026-08-28 Shop 目录滚动 owner 与 adoption truth 返工重签（当前）

- 核心前提变化：本卡原范围明确“不改滚动 owner”，但用户实机发现 Shop 目录无法滚动，并要求把“半统一组件 +
  adoption gate 假绿”作为本卡验收失败处理。该 before -> after 扩张会改变用户可见行为和设计系统公共滚动合同，
  因此下方稳定身份 candidate 的 design / done accept 全部降为历史；三方必须针对本增量重新签字。
- 四向真值：

  | 维度 | 当前真值 | 直接证据 |
  |---|---|---|
  | 原版 / primary source | N/A：原版无二阶段编辑器目录滚动 UI。 | `docs/phase2/READ-FIRST.md:1-8` |
  | 第一阶段 | N/A：第一阶段无 `DsCatalogRow` / design-system adoption registry。 | `docs/phase2/READ-FIRST.md:32-37` |
  | 当前二阶段 | Shop 标题用 `DsListHeader`、行用 `DsCatalogRow`，列表仍是 raw `div.sprite-list.shop-catalog`；`.shop-outliner { overflow:hidden }` 覆盖基础 outliner 滚动，而 `.shop-catalog` 只有 padding。`git log -S'.sprite-list {'` 进一步确认 `9dd4e4a3` 删除旧 `.sprite-list { flex:1; overflow-y:auto }` 后，Shop 的唯一 owner 被确定性移除。720px 实测父层 `clientHeight=653 / scrollHeight=1484 / overflowY=hidden`，子层 `scrollHeight=1444 / overflowY=visible`，无 scroll owner。registry 却登记未实际使用的 `DsCatalogControls`，并声称 scroll owner 为 `DsObjectWorkspace + DsInspectorTabs`；audit 只验证 owner 字符串非空。 | `ShopTab.tsx:108-138`；`editor.css:654-663,3609-3614`；`9dd4e4a3`；`design-system-adoption.json:253-261`；`design-system-audit.mjs:2752-2782`；2026-08-28 浏览器 computed-style 证据 |
  | 本任务目标 | Shop 标题保持固定，目录内容由共享、可达、可机检的 catalog workspace 内部 viewport 持有唯一纵向滚动；registry 写真实 owner，静态 / DOM / 小窗口浏览器门禁能在 owner 缺失、不可达或 CSS 合同漂移时失败。 | 2026-08-28 用户截图、追问与“ED-CATALOG-ROW-IA-1 返工”裁决 |

- 最强替代解释：21 家商店无需滚动，截图只是窗口未加载完整；或删除父层 `overflow:hidden` 让整栏连标题一起滚即可。
  - 反证：实测 21 行内容高 1444px、父层仅 653px 且 `overflowY=hidden`；最后一行远在 viewport 外，滚轮没有
    owner。删除父层裁剪会让标题随内容滚走，违反“标题固定、内容区滚动”的既有 Ambience/Tileset 正向模式。
  - 可证伪观察：若修复后目录内容未溢出、滚轮/键盘不能改变唯一 viewport 的 `scrollTop`、标题随滚动离开、出现
    两个纵向滚动条、focus outline 被裁切，或 registry owner 仍不可达，则 premise/design 失败。
- Codex:
  - premise: **verified（2026-08-28）** — 直读 Shop DOM/CSS、正常 Item outliner 与 Ambience/Tileset 对照，且
    720px computed style 证明父层裁剪 + 子层 visible 的“零 scroll owner”组合；registry 与生产 JSX 不一致。
  - design: **agree（2026-08-28，待 reviewer 压测）** — 新增共享非虚拟 `DsCatalogWorkspace`，由 root 同时冻结
    `flex-column + min-width/min-height:0 + overflow:hidden`，固定 `header` slot，并由内部 viewport 唯一持有
    `flex:1 1 auto + min-width/min-height:0 + overflow:auto + overscroll-behavior:contain + scrollbar-gutter:stable`；
    Shop 不再使用 raw scroll div，也把同文件 raw `ds-object-workspace*` class 冒充改成真实 `DsObjectWorkspace`。
    首批候选闭包为 Shop / Item / Skill / Enemy / Poison 五个 `sprite-list` 页面，加精确同构的 Ambience 与
    SharedScript，共七页，使 fixed controls / single catalog scroll 成为同一合同并把生产 `sprite-list` 清零；
    Tileset（fieldset + DsPressable）、Stamp（分页 footer）、
    Audio/World/BattleSprite（DsVirtualList）和 Cutscene（分区嵌套滚）明确排除，避免 API 膨胀或嵌套 scroll。
    registry 不再把 `"A + B"` prose 当真值：全部 25 页 catalog / scroll owner 以
    `{region, axis, owner, source, component, callsite}` 或有证据的 custom / N/A 记录，canonical DS token 必须通过
    route-derived live-call reachability，live owner 也必须反向登记；禁止业务 TSX 伪造保留
    `ds-catalog-* / ds-object-workspace* / data-ds-scroll-*` class/marker，并对首批 catalog region 以 data marker +
    DOM/browser 证明唯一 owner。21 家 Shop 不引入虚拟列表。
- Kimi:
  - premise: **verified（2026-08-28，本人独立直读 Shop DOM/CSS、git 历史、registry/audit 脚本与
    Ambience 正向先例，非复述 Codex / GLM）**:
    1. **Shop 零 scroll owner 根因三段闭合**: ①`ShopTab.tsx:106-139`——`div.outliner.shop-outliner`
       内 tabBar + `DsListHeader`(:110-127)+ raw `div.sprite-list.shop-catalog`(:128-138),无
       DsCatalogControls、无滚动容器组件;②`editor.css:654-663` 基础 `.outliner { overflow-y: auto }`
       被 `:3609-3611 .shop-outliner { overflow: hidden }` 确定性覆盖,`:3612-3614 .shop-catalog`
       仅有 padding——父裁剪 + 子无 owner;③`git log -S'.sprite-list {'` 首个命中 `9dd4e4a3`,
       本人 `git show` 实锤其删除 `.sprite-list { flex: 1; overflow-y: auto; }`——旧唯一 owner 被
       移除且 Shop 未迁移。与 Codex 720px computed-style(父 653/1484 hidden、子 1444 visible)
       结构一致。
    2. **registry 假绿机制实锤**: `design-system-adoption.json:253-258` item/shop 登记
       `catalog: "DsCatalogControls + DsCatalogRow"`、`scroll: "DsObjectWorkspace + DsInspectorTabs"`,
       但 ShopTab 实际用 DsListHeader + raw div;`design-system-audit.mjs:2773-2781` owners 校验
       只验五 key 齐全 + 字符串非空,**不验组件在真实 JSX 可达**——"字符串即真值"假绿成立。
    3. **七页范围与排除面**: 生产 `sprite-list` 恰 5 处(ShopTab:128 / SkillTab:1085 /
       ItemTab:1270 / EnemyTab:743 / PoisonTab:483,本人 grep);Ambience(:424-443 outliner +
       DsListHeader + section list)与 SharedScript(:198-227 outliner + DsCatalogControls)精确
       同构,共七页;Audio/World/BattleSprite 已是 DsVirtualList(本席此前直读 Audio:600 虚拟
       列表),Tileset/Stamp/Cutscene 结构排除合理。
    4. **正向先例在位**: `editor.css:10314-10320 .ambience-library-outliner__list { min-height:0;
       flex:1 1 auto; overflow-y:auto; overscroll-behavior:contain; scrollbar-gutter:stable }`——
       标题固定 + 内容唯一滚动,与设计 viewport 冻结属性逐条一致;`DsCatalogWorkspace` 当前不
       存在(本人 grep),新建无命名冲突。
  - design: **agree(2026-08-28，附 K-R1-K-R5 必落钉)**:
    - **K-R1(防嵌套滚动钉)**: 基础 `.outliner { overflow-y: auto }`(:662 整栏兜底)与 workspace
      viewport 同页共存即成双 owner——七页接入时必须由 workspace root 的 `overflow: hidden` 接管
      (移除或覆盖该页 outliner 的 overflow-y:auto);DOM 测试断言内容溢出时**仅 viewport 的
      scrollTop 可变、祖先链 scrollTop 恒 0、页面无第二条纵向滚动条**。
    - **K-R2(标题固定钉)**: header slot 必须在 viewport 之外(root flex 列内);短窗口测试断言
      滚动后 header `getBoundingClientRect().top` 不变。
    - **K-R3(adoption truth 机检钉)**: 25 页 owner 组件字符串必须通过 route-derived live-call
      reachability(从 App route root 可达,有 adoption.test "live route graph" 先例);live owner
      反向登记;静态负断言禁止业务 TSX 伪造 `ds-catalog-* / ds-object-workspace* / data-ds-scroll-*`
      class/marker;custom / N/A 必须附证据。
    - **K-R4(短窗口测试矩阵)**: 七页 × (溢出/不溢出)× (滚轮/键盘)断言唯一 viewport scrollTop
      可变 + focus outline / 选中态不裁切 + 无嵌套滚动;PAL 浏览器 720px 短窗口 Shop 21 家复测
      登记为 build 期最小视觉证据。
    - **K-R5(范围冻结)**: 七页之外(Tileset / Stamp / Audio / World / BattleSprite / Cutscene)
      本卡不动;21 家 Shop 不引入虚拟列表; Enemy 缩略图 / Ambience 色样等 leading 媒体布局不得
      因容器替换回归(36px 槽 DOM 复断)。
- GLM:
  - premise: **verified（2026-08-28，本人一手直读 CSS/JSX/git 历史/registry/audit 脚本，非代理）**：
    1. **Shop 零 scroll owner 根因实锤（三层证据闭合）**：①ShopTab.tsx:122 列表容器是 raw
       `<div className="sprite-list shop-catalog">`（DsListHeader + DsCatalogRow 各自采用、容器裸）；
       ②editor.css 基础 `.outliner { overflow-y:auto }`（:661-662）被 `.shop-outliner
       { overflow:hidden }` 确定性覆盖，`.shop-catalog` 仅有 padding——父裁剪 + 子 visible =
       无 owner；③`git log -S'.sprite-list {'` 命中 `9dd4e4a3`，diff 显示删除
       `.sprite-list { flex:1; overflow-y:auto; }`——唯一滚动 owner 被移除且 Shop 从未迁移。
       Codex 720px computed-style（653/1484 hidden + 1444 visible）与该结构完全一致。
    2. **七页范围 census 复核一致**：生产 `sprite-list` 恰 5 文件（Item/Enemy/Skill/Shop/Poison，
       本席 grep）；Ambience（:424 outliner + DsListHeader）与 SharedScript（:198 outliner）同构
       纳入使“固定控件 + 单目录滚动”成同一合同；排除面核实——Audio/WorldSprite/BattleSprite 均
       消费 DsVirtualList（3 文件确认，自带虚拟滚动），Tileset/Stamp/Cutscene 各有登记的独立
       滚动结构，排除合理且避免 API 膨胀/嵌套滚动。
    3. **adoption 假绿实锤**：registry `item/shop` 声称 `catalog: "DsCatalogControls +
       DsCatalogRow"`——ShopTab JSX **无 DsCatalogControls**（伪 owner）；`scroll:
       "DsObjectWorkspace + DsInspectorTabs"`——:143 只是 `className="shop-main
       ds-object-workspace"` 类借用非组件、且是主区非目录列；`ownerEvidence` 只覆盖 field。
       audit 脚本（design-system-audit.mjs:2780-2781）对 owners 仅查**非空字符串**——prose
       "A + B" 恒过，无可达性/使用验证。25 页计数本席复算一致。
  - design: **agree（2026-08-28，附 GC-W1-GC-W3 必落钉）**：
    - **GC-W1（registry truth 结构化 + 红先行）**：25 页 catalog/scroll owner 全部落
      `{region, axis, owner, source, component, callsite}` 结构（或有证据 custom/N/A）；
      canonical DS token 必须从真实 route root 的 live-call 可达性证明，live owner 反向登记；
      业务 TSX 禁止伪造 `ds-catalog-* / ds-object-workspace* / data-ds-scroll-*` class/marker；
      **新门禁必须先对当前假绿状态红**（shop 假 owner / sprite-list 裸容器 / 类借用三例为
      最小反例集），修复后转绿——不接受只在理想态绿的门禁。
    - **GC-W2（七页迁移闭包 + 滚动 DOM/浏览器矩阵）**：生产 `sprite-list` 类计数清零（5 文件
      全迁）+ Ambience/SharedScript 同步采用 DsCatalogWorkspace；每页断言——目录区恰一个纵向
      scroll owner（viewport），header 在 scrollTop>0 时 rect 不变（固定），页面无嵌套纵向滚动，
      focus outline 不被裁切；短窗口（≤400px）滚轮/键盘可改变 viewport scrollTop 且标题仍在。
      Shop 21 家不引入虚拟列表（与非虚拟 workspace 合同一致）。
    - **GC-W3（排除面证据化）**：Tileset/Stamp/Audio/WorldSprite/BattleSprite/Cutscene 六类
      排除逐条带 owner/理由/验证锚点（DsVirtualList 三页以真实消费为准）；排除集变更（如未来
      Cutscene 重构）须重新裁决而非默认沿用。
  - 可证伪观察：①修复后若目录内容未溢出页、滚轮/键盘不能改变唯一 viewport 的 scrollTop、标题
    随滚动离开、出现双纵向滚动条、focus outline 被裁，或 registry owner 仍不可达——premise/
    design 失败；②若 DsCatalogWorkspace 在七页外造成大范围回归或嵌套滚动——按卡面收窄设计；
    ③若 audit 不能从真实 route root 证明 owner 可达（仍可被 prose 满足）——GC-W1 失败返工。
- 独立反证审查：GLM（2026-08-28，见上——DOM/CSS/git/registry/audit 五路一手证据 + 红先行
  反例集）；**Kimi（2026-08-28，独立复核完成）**: 回答"什么证据会推翻本增量"——①若修复后
  Shop 目录内容未溢出 / 滚轮键盘不能改变唯一 viewport 的 scrollTop / 标题随滚动离开 / 出现两条
  纵向滚动条 / focus outline 被裁切 -> premise/design 失败,七页 × 溢出 × 滚轮键盘矩阵(K-R4)
  逐格可证伪;②若 `.outliner { overflow-y: auto }` 基础兜底(:662)与 workspace viewport 同页
  共存 -> 双 owner 嵌套滚动,K-R1 要求接入页由 workspace root 的 overflow:hidden 接管并以
  "祖先链 scrollTop 恒 0"机检;③若 audit 仍能被 prose 满足(owner 字符串不验 route 可达)->
  假绿复发,K-R3 要求 reachability + 反向登记 + 禁伪造 class/marker 三件套;④若七页接入导致
  Enemy 缩略图 / Ambience 色样 36px leading 槽布局回归 -> 停线(K-R5)。最强替代解释"21 家无需
  滚动 / 删父层裁剪整栏滚"均不成立:实测内容 1444px 远超父层 653px;整栏滚会让标题随内容滚走,
  违反 Ambience 正向模式(:10314-10320)。
- counter / 分歧处理：任一 reviewer 发现共享 viewport 会造成嵌套滚动、标题滚走、跨页大范围回归或 audit 不能
  从真实 route root 证明 owner 可达，保持 blocked 并收窄设计。
- 缺签豁免：N/A
- build 准入结论：**allowed（三方签字齐：Codex / GLM / Kimi 均 2026-08-28 verified + agree，无
  counter）**。实现期落实 GLM GC-W1 与 Kimi K-R1-K-R5 钉子（重点：接入页 overflow 接管防嵌套滚动、
  header 固定、reachability 真值机检、七页短窗口矩阵、范围冻结）;新 candidate 的三方 done accept
  重新计算,历史 candidate accept 不授权本增量。Status 流转由 Coding Owner 开工时更新。
- 2026-08-28 build-time counter（Codex）：实现 route-live owner gate 时确认签字钉子存在不可同时满足的范围冲突：
  - K-R3 / GC-W1 要求业务 TSX 全局禁止伪造 `ds-object-workspace*`；
  - K-R5 又明确 Tileset / Stamp / Audio / World / BattleSprite / Cutscene 等七页外页面本卡不动；
  - 当前生产仍有 BattleSpriteLibrary、SpriteResourceViewer、BattleField、EnemyTeam、Vars、ProjectWorkbench 等
    既存 raw `ds-object-workspace*` 调用。若全局门禁立即生效，排除页必红；若直接 allowlist，则违反“禁止伪造”
    的字面签字并让 25 页 adoption truth 继续含未裁决例外。
  - 当前停线点：`DsCatalogWorkspace`、七页目录接入、Shop 真实 `DsObjectWorkspace` 与聚焦 DOM/CSS 门禁 WIP 已落；
    结构化 25 页 registry / route-live gate 尚未继续，当前 adoption 红测保持 1 项预期红。
  - Codex 推荐裁决：本卡只对七页与 Shop 新 owner 零容忍；七页外既存 raw workspace 必须逐条登记
    `source + selector + reason + verification + removalCondition` 的精确 legacy exception，静态门禁锁定精确集合并
    禁止新增。后续另开 workspace adoption debt 卡清零；不得把 exception 继续写成 adopted DS owner。
  - 该裁决改变 K-R3 / GC-W1 字面范围；Kimi / GLM 必须分别补签 agree/counter，或由用户明确批准本次范围修订。
- GLM 补签裁决（2026-08-28，GC-W1 作者席；一手复算后 **agree 本次范围修订**，附 4 条强化条件）：
  - **冲突属实、意图不冲突**：本席 grep 复算生产 raw `ds-object-workspace*` 共 10 文件——其中
    Item/Skill/Enemy/Poison/Shop 属本卡七页迁移域（随迁移自然清零，Shop WIP 已换真实
    `DsObjectWorkspace` 组件，ShopTab.tsx:27/:153/:271）；**真正落在“七页外 + 既存 raw”的是
    6 文件**：ProjectWorkbenchTab、BattleSpriteLibrary、VarsTab、SpriteResourceViewer、
    EnemyTeamTab、BattleFieldTab——与 Codex counter 清单一致。GC-W1 的意图是“registry 真值
    不得假绿”（登记 owner 必须真实可达、不得类借用冒充），不是“本卡必须迁移全部 legacy 类
    借用页”；后者会撑爆 K-R5 冻结范围。两条钉的字面冲突真实存在，按意图裁决可以两全。
  - **同意 Codex 推荐裁决**（七页 + Shop 零容忍；legacy 6 文件精确例外 + 禁新增 + 另卡清零），
    附强化条件：
    1. **例外集机检锁定**：6 文件的 legacy exception 必须机器枚举（file + selector 精确集），
       **任何文件新增 raw `ds-object-workspace*` 即门禁红**——“禁止新增”必须是机械规则而非
       prose 自律。
    2. **registry 状态真值**：该 6 页的 registry 条目必须落 `status: exception`（或对应 owner
       显式标 legacy-exception）并交叉链接例外条目——**不得保留 `adopted` + prose owner 的
       原假绿形态**（本卡要修的原罪正是“类借用登记为 adopted”，不是类借用本身）。
    3. **debt 卡先行登记**：workspace adoption debt 后续卡必须在**本卡 done 前**开卡并上看板
       （例外 removalCondition 需要 owner；本卡 done 门禁引用该卡 ID）。
    4. **GC-W1 红先行按新范围适配**：门禁仍须先对“原假绿形态”红测（adopted+prose+类借用三
       反例，shop registry 为代表）——转绿条件 = 七页真实组件 + Shop 真实 DsObjectWorkspace +
       6 例外 exception 状态化，而不是例外集存在即绿。
  - 可证伪观察：①若例外集外出现任何新 raw workspace 用法而门禁未红——条件 1 失效返工；②若
    任一例外页在 registry 仍呈 adopted——条件 2 失效（假绿复发）；③若 debt 卡未开而本卡先
    done——条件 3 失效；④若七页迁移引入嵌套滚动/标题滚走——回到 K-R1/R2 停线，与本次裁决无关。
- Kimi 补签裁决（2026-08-28，K-R3 / K-R5 作者席；一手 grep 复算后 **agree 本次范围修订**，附
  K-R6 精确化一条）：
  - **冲突确认与意图解释**: K-R3 的"禁伪造"意图是 adoption truth——类借用不得登记为 adopted DS
    owner、不得伪造 `ds-catalog-* / ds-object-workspace* / data-ds-scroll-*` 骗过 reachability
    机检;K-R5 的意图是排除页**实现**不动。既存 raw class 是历史类借用而非为骗门禁伪造,但
    route-live gate 无法区分二者,故字面冲突属实、按意图可两全;GLM 的解读与本席签字本意一致。
  - **事实复核(本人 grep 当前工作树)**: 生产 raw `ds-object-workspace*` 命中 10 文件——七页
    迁移域 5 文件(Item:1315,1385 / Skill:1104,1145 / Enemy:783,823 / Poison:502,529 /
    Shop WIP 已换真实组件,不在命中);七页外 6 文件(BattleSpriteLibrary:1258,1307 /
    SpriteResourceViewer:520-605 六处 / ProjectWorkbenchTab:290,298 / VarsTab:360-496 四处 /
    EnemyTeamTab:310-464 四处 / BattleFieldTab:277-430 四处),与 Codex / GLM 清单一致。
  - **同意 Codex 推荐裁决**: 本卡新 owner 域(七页目录 DsCatalogWorkspace + Shop 真实
    DsObjectWorkspace)零容忍;七页外 6 文件逐条登记 `source+selector+reason+verification+
    removalCondition` 精确 legacy exception,静态门禁机检锁定精确集合、**任何新增 raw 即红**;
    exception 页 registry 必须落 `status: exception` 交叉链接,不得保留 adopted+prose 假绿形态;
    debt 卡先于本卡 done 开卡上看板;清零另卡。背书 GLM 四条强化条件全部。
  - **K-R6(七页内中央 raw 归属钉,裁决精确化)**: GLM 称 Item / Skill / Enemy / Poison 中央
    `ds-object-workspace*` "随迁移自然清零"与当前 WIP 不符——本席 grep 确认七页接入(目录滚动壳)
    **未替换**该四页中央工作区 raw(:502/:1104/:783/:1315 仍在)。其归属必须显式二选一:
    (a) 本卡随七页接入一并换真实 `DsObjectWorkspace`(同页同类一次收口,"七页零容忍"字面
    成立);(b) 与 6 文件同标准登记进 legacy exception 集(removalCondition 归 debt 卡)。
    **不得静默遗留**——否则 done 终审时"七页零容忍"名不副实,又成假绿。Codex 开工前在任务卡
    写明选 (a) 或 (b);选 (b) 时 exception 集从 6 文件扩为 10 文件并同锁禁新增。
  - 可证伪观察: ①若例外集(无论 6 或 10 文件)外出现新 raw 用法而门禁未红——返工;②若七页
    中央 raw 既未替换也未登记而 done——K-R6 失效、假绿复发;③若 debt 卡未开而本卡先 done——
    GLM 条件 3 失效;④若接入页出现嵌套滚动 / 标题滚走 / 36px leading 回归——回 K-R1/R2/R5
    停线。
  - 三方对范围修订收敛(Codex 推荐 / GLM agree+4 条件 / Kimi agree+K-R6),无用户裁决必要;
    **build 准入恢复 allowed**,待 Codex 写明 K-R6 二选一后继续。
- Codex K-R6 实施裁决（2026-08-28）：选择 **(a)**。Item / Skill / Enemy / Poison 均属于本卡七页
  `DsCatalogWorkspace` 接入域，其中央列在同一页面改为真实 `DsObjectWorkspace`，不把本轮正在收口的
  raw `ds-object-workspace*` 再登记成技术债。这样“七页 + Shop 新 owner 零容忍”字面与实现一致，
  legacy exception 精确保持 ProjectWorkbenchTab / BattleSpriteLibrary / VarsTab /
  SpriteResourceViewer / EnemyTeamTab / BattleFieldTab 六个既存文件；清零 owner 为
  `ED-WORKSPACE-ADOPTION-DEBT-1`。该选择只替换滚动壳组件，不改页面字段、命令、schema 或用户数据。
- 历史效力：下方稳定身份、音频 + Enemy 与更早 candidate 的 design / done accept 只证明各自旧边界；不得用于
  本次 scroll owner / adoption truth build 或 done 准入。

### 2026-08-28 稳定身份落槽与真实 ID 呈现增量重签

- 用户裁决（before -> after）：**已批准（2026-08-28）**。`team-0` 占 title、成员 / 语义槽摘要占第二行，
  合法无 label 资源可能 title / meta 重复 AssetId -> 普通对象目录以可读名称或真实内容派生标签作 title，
  精确 canonical ID 固定进入 meta；EnemyTeam 以成员构成作 title、`team.id` 作 meta，并删除“语义槽”技术摘要；
  五类资源缺 label 时使用本地化类型标题且保留精确 AssetId meta。`295`、`enemy-468`、`sprite.pal.001` 等真实
  ID 原样保留，不制造 `skill.pal.295` 等展示别名。
- 增量四向真值：

  | 维度 | 当前真值 | 直接证据 |
  |---|---|---|
  | 原版 / primary source | N/A：原版没有二阶段作者目录 UI 或本项目的 `DsCatalogRow` 信息层级。 | `docs/phase2/READ-FIRST.md:1-8` |
  | 第一阶段 | N/A：第一阶段没有 Reforge 数据工作台与当前稳定 ID 展示合同。 | `docs/phase2/READ-FIRST.md:32-37` |
  | 当前二阶段 | 生产代码共有 20 文件 / 28 个 `DsCatalogRow`；EnemyTeam schema 只有 `id/slots`，当前以 `team.id` 作 title、成员 / 槽数作 meta。Skill 的 `295`、Enemy 的 `enemy-468`、资源的 `sprite.pal.001` 分别是真实 SkillId、EnemyId、AssetId，点分语法不是通用 ID 合同。5 个资源目录在合法无 label 分支会把同一 AssetId 同时放进 title 与 meta。 | `packages/content/src/enemy.ts:107-115`；`packages/editor/src/ui/EnemyTeamTab.tsx:266-274`；`packages/content/src/skill.ts:142-145`；`packages/migrate/src/migrate-content.ts:739-741`；`packages/content/src/enemy.ts:85-91`；`packages/migrate/src/migrate-enemies.ts:85-88,227-230`；`packages/content/src/asset.ts:269-273`；`AudioAssetWorkbench.tsx:612-618`；`BattleSpriteLibrary.tsx:1235-1246`；`CutsceneTab.tsx:208-213`；`ImageTab.tsx:650-663`；`WorldSpriteLibrary.tsx:577-587` |
  | 本任务目标 | 统一“名称 / 派生标签在第一行、精确真实 ID 在第二行”的普通对象身份层级；摘要不得挤掉 ID，也不得以展示别名冒充 canonical ID。 | 2026-08-28 用户截图与“按这个来”裁决；本增量验收条件 |

- build 前置三面裁决（落实 GLM GC-S1，2026-08-28）：

  | registry surface | 裁决 | 目标 / 理由 |
  |---|---|---|
  | `shop/catalog` | **纳入** | 与 EnemyTeam 同构。由真实货单派生 title：空货单显示“空货单”，非空显示首件物品名称，超过一件时追加“等 N 种货品”；`meta=String(shop.id)`，选择 / 命令 / 深链仍消费数值 id。 |
  | `scene/current-outline-root` | **显式排除，保留 bounded exception** | 它是当前场景树唯一根节点，不是多个 SceneDef 的对象目录；SceneDef 无独立名称，SceneId 是唯一 title，实体数是该树根的结构摘要。若未来出现多场景 catalog，必须重新适用“可读 title + ID meta”。 |
  | `variables/undeclared-reference-catalog` | **显式排除，保留 bounded exception** | 它是“尚不存在定义”的引用诊断 / 创建动作，不是稳定对象；被引用的变量 ID 是唯一 title，meta 必须解释冲突或引用数。创建定义后即进入 declared catalog 的“名称 + ID meta”合同。 |

- 最强替代解释：没有独立 `name` 的对象把 ID 放 title、统计放 meta 已符合旧 DS-C.4c 例外，而且当前 PAL
  1,934 个资源都有 label，五个重复分支不会在代表工程出现。什么观察会推翻新设计：派生敌队标题在重复 / 混合 /
  缺失成员下比 `team.id` 更难辨认，或为了固定第二行 ID 必须伪造 schema 字段、改变实际引用值、破坏搜索 / 深链。
  若出现这些观察应 counter；不得以 UI 假别名绕过。
- Codex:
  - premise: **verified（2026-08-28，schema / 迁移器 / 28 surface 生产 census 直读）**。`SkillData.id`
    明确把 PAL oid 字符串当不透明值，迁移器实际产出 `295`；Enemy / Team 唯一生成函数分别产出
    `enemy-<objectIndex>` / `team-<sourceId>`；`sprite.pal.NNN` 是 `AssetId` 工厂，不是通用对象 ID。
    `EnemyTeamDef` 无名称字段，因此只允许从现有成员真值派生显示标题，不新增 schema。当前 5 个资源 fallback
    分支确会在 `label` 缺席时重复 title / meta，旧矩阵只锁 JSX fingerprint 与槽位存在性，未覆盖值相等分支。
  - design: **agree（2026-08-28）**。只改展示映射、registry / 门禁 / DOM 测试与 DS-C.4c 文档：EnemyTeam
    以保持槽位顺序的成员名称及重复数生成单行可截断标题，空队为“空敌队”，`meta=team.id`，不常驻语义槽数；
    Shop 由首件真实货品 + 货品数派生 title、`meta=String(shop.id)`；五个资源 family 按真实 kind 使用本地化
    “未命名…”标题，`meta` 保留精确 AssetId。场景根与未登记变量按上表保留有边界例外。所有 ID 搜索、选择、
    命令、URL / 深链继续消费原始值；不改 schema、migration、runtime、`DsCatalogRow` API、行高、滚动或 focus。
- Kimi:
  - premise: **verified（2026-08-28，本人独立直读 schema / 迁移器 / 搜索选择消费 + node 复算 PAL 敌队
    census，非复述 Codex / GLM）**:
    1. **schema 真值**: `EnemyTeamDef` 只有 `id` + `slots: Array<string | null>`(`enemy.ts:107-115`),
       无名称字段——派生标题只能来自成员真值、不新增 schema 成立。`SkillData.id` 注释明示"原版 oid
       字符串、当不透明 string"(`skill.ts:142-144`),迁移器 `migrate-content.ts:739-741`
       `id: String(s.id)` 实产 `295`;`enemySlug`(`migrate-enemies.ts:85-88`)= `enemy-<objectIndex>`;
       `teamSlug`(:227-230)= `team-<原版队号>` 且注释明示"与 startBattle.enemyTeamId 直接 join"——
       id 是引用 join 键;`palSpriteAssetId`(`asset.ts:269-273`)= `sprite.pal.NNN` 是 AssetId 工厂
       而非通用对象 ID。三类真实 ID 原样保留、不制造 `skill.pal.*` / `enemy.pal.*` / `team.pal.*`
       展示别名，前提成立。
    2. **引用 / 搜索 / 深链 owner**: `EnemyTeamTab.tsx:269,273` key 与 `select(team.id)` 均消费原始 id;
       搜索(:92-110)按 `team.id` 小写包含 + slots 成员 enemyId 字面 / `lookupText(enemy.name, locale)`
       匹配,**不走 title 字符串**——展示映射改动不触碰引用消费;缺失成员搜索降级确定(:103-104,
       enemy 不存在时仅按 id 字面)。
    3. **派生标题确定性(本人 node 复算 PAL enemy-teams.json + enemies.json)**: 380 队 = 0 空队 /
       129 单成员 / **100 纯重复**(如 team-0: 2x enemy-398、team-3: 3x enemy-399)/ 151 混合 /
       68 带 null 洞 / **0 缺失引用** / **0 完全同构成组**。重复 -> "名×N"、混合 -> 槽序 + 重复数、
       空队 -> "空敌队"(当前工程无、编辑器可建)、缺失成员 -> 原始 enemyId 段降级(与搜索同策略),
       输入为纯 slots 数据,四类边界均确定;同构成标题可重复但 `meta=team.id` 唯一区分——
       **不形成第二身份**: title 是派生展示、身份归 meta,选择 / 搜索 / 命令 / 引用全消费原值。
    4. **5 个合法无 label fallback 分支实锤**: AudioAssetWorkbench:618-619、BattleSpriteLibrary:
       1236,1243-1244、CutsceneTab:211-212、ImageTab:662-663、WorldSpriteLibrary:578,585-586——
       label 缺席时 title 与 meta 同为 AssetId 重复。(PAL 资源 label census 由 GLM 复算;无论其结果,
       fallback 语义修正均成立。)
  - design: **agree(2026-08-28，附 K-S1-K-S4 必落钉)**:
    - **K-S1(派生标题降级钉)**: 未知 enemyId 成员段回退为原始 enemyId 字面(与搜索 :103-104 同
      策略),不得显示 emoji / 空白,也不得 fail-loud 阻断目录渲染;null 槽不产生名称段(68 带洞队);
      "空敌队"仅 slots 全空时使用。
    - **K-S2(身份唯一性钉)**: title 派生文本可重复(当前 PAL 0 同构成组、作者可建),搜索 / 选择 /
      命令 / URL / 引用必须继续消费 team.id / 原始 AssetId;门禁测试断言 onClick / key / select 参数
      仍为原始 id,派生 title 不进任何引用路径。
    - **K-S3(展示别名禁令机检)**: UI 不得出现 `skill.pal.*` / `enemy.pal.*` / `team.pal.*` 等展示
      别名(真实 ID 原样显示);静态负断言 + registry reason 同步;要真正改 canonical ID 必须另开
      schema / migration 高风险卡(本卡范围外)。
    - **K-S4(本地化未命名标题)**: 5 个资源 family 缺 label 时按真实 kind 用本地化"未命名…"标题,
      保留精确 AssetId meta;fallback 文案归 locale owner,不硬编码在五处 JSX。
- GLM：
  - premise: **verified（2026-08-28，本人独立复算 census + 五 fallback 分支 + schema/迁移器直读，非代理）**：
    1. **20 文件 / 28 调用 census 复算一致**：本席 grep 生产 TSX `<DsCatalogRow` 恰 **20 文件 / 28 处**
       （文件清单与卡文一致，含 BattleSprite 3 行 / WorldSprite 4 行等多行用法面）。
    2. **五个无 label fallback 分支逐一实锤**（title 与 meta 在 label 缺席时同AssetId）：
       AudioAssetWorkbench `title={record.label || entry.id}`+`meta={entry.id}`；BattleSpriteLibrary
       `label = assetRecord.label?.trim() || entries[0]?.label?.trim() || asset`+meta=asset；
       CutsceneTab 同 Audio 模式；ImageTab :659-660 同模式；WorldSpriteLibrary 同 BattleSprite
       模式。旧矩阵只锁 fingerprint 与槽位存在性，确未覆盖值相等分支。
    3. **schema/迁移器真值**：`EnemyTeamDef = {id, slots}` 无名称字段（enemy.ts:107-115）——派生
       标题是唯一无 schema 方案；`SkillData.id` 注释明示“当不透明 string”且迁移 `id: String(s.id)`
       （migrate-content.ts:739-741）产出 `295`——真实 SkillId 即裸数字；`enemySlug=enemy-<objectIndex>`
       / `teamSlug=team-<id>`（migrate-enemies.ts:85-88/:227-230）；`palSpriteAssetId=sprite.pal.NNN`
       （asset.ts:269-273）是 AssetId 工厂非通用 ID 合同。**本席 grep 生产 UI 零
       `team.pal/skill.pal/enemy.pal` 伪装别名**——增量“不制造展示别名”是防回归约束而非修现状。
    4. **本席 census 新发现（同类普通对象遗漏）**：**ShopTab.tsx:122-127**——`title={店 ${x.id}}` +
       `meta={N 种货}`，`ShopDef = {id, items}` 无名称字段（shop.ts:11-14）：canonical id 只在
       title、第二行是统计——与 EnemyTeam“before”同构（无 name + id 冒 title + 摘要占第二行），
       同属“精确 canonical ID 固定进入 meta”新合同的违规面，但未列入本增量修复清单。另有两处
       需在新规则下显式再裁决（原 bounded-exception 需复核措辞）：VarsTab 未登记引用（title=裸 id，
       无对象可派生名）与 App 场景根（title=scene.id，既有“SceneDef 无显示名”例外）。
  - design: **agree（2026-08-28，附 GC-S1-GC-S3 必落钉；Shop 裁决为 build 前置）**：
    - **GC-S1（Shop 同类裁决为 build 前置）**：按本卡 GRow1 既有纪律（矩阵以 20 文件 census 全集
      为输入域、同类一次性收口、不得只修截图点名面），`shop/catalog` 必须在 build 前进入本增量
      registry 裁决——**纳入**（title 改派生标签如“店”/首卖货派生、meta=`String(id)` 精确 ID，
      与其他表面同型改法、不新增 schema）**或显式排除并写理由**；VarsTab 未登记引用与场景根两处
      在 registry 中按新规则补记分类（保持现状 + 理由亦可）。裁决未落 registry/docs 前，Codex
      不得开始改实现文件。
    - **GC-S2（值级测试覆盖）**：新测试必须断言到**值**：受影响 family 的 meta === 精确 canonical
      id（`295`/`enemy-468`/`team-0`/AssetId 原样）；title ≠ 任何 `skill.pal.*` 类拼接别名；无
      label 分支 title = 本地化“未命名…”且与 meta 不再同值；EnemyTeam 派生标题在重复/混合成员下
      确定（重复计数）且 meta=team.id。不得只断言槽位存在性。
    - **GC-S3（census 闭包防回流）**：registry/静态门禁须覆盖“title 含裸 id 而 meta 非精确 id”的
      同型回流检测（至少对 census 内无 name 字段的对象族：team/shop/未登记引用/场景根），新增
      同型 surface 未裁决即红。
  - 可证伪观察：①若派生敌队标题在重复/混合/空队/缺失成员下不确定或比 team.id 更难辨认（Kimi 席
    核），或派生文本被任何命令/深链/搜索当作身份消费（形成第二身份），即 counter；②若为固定第二
    行 ID 必须伪造 schema 字段或改变真实引用值，前提失效；③若 PAL 1,934 资源全有 label 使五个
    fallback 分支不可达——不可达 ≠ 可豁免：本地化 fallback 与值级断言仍须存在（demo/外部工程可
    无 label），但实现优先级可按卡面排期。
- counter / 返工处理：无 counter；GC-S1 的 Shop 裁决为 build 前置条件（agree 的组成部分）。任一方
  发现展示文本不再等于真实引用值、漏掉合法无 label 分支或派生标题不确定，立即 counter。
- 缺签豁免：N/A
- build 准入结论：**allowed（三方增量签字齐且 GC-S1 前置已落实：Codex / GLM / Kimi 均 2026-08-28
  verified + agree，无 counter）**。`shop/catalog` 已纳入；`scene/current-outline-root` 与
  `variables/undeclared-reference-catalog` 已按非普通对象性质显式保留 bounded exception。Coding Owner
  实现期落实 GLM GC-S2 / GC-S3 与 Kimi K-S1-K-S4 钉子；新 candidate 的三方 done accept 重新计算，
  上一 candidate accept 不复用。
- 历史效力：下方音频 + Enemy candidate 的三方 design / done accept 只证明上一版实现，不授权本次身份落槽增量。

### 2026-08-28 稳定身份落槽 candidate 进入 done 前审查

- Candidate 边界：只改目录展示映射、共享资源标题 formatter、registry v3 / 静态与 DOM 门禁、DS-C.4c
  文档；未改 schema、migration、runtime、`DsCatalogRow` API、搜索 / 选择 / 命令 / URL / 引用 owner。
- Codex：**accept（2026-08-28）**。逐钉确认：
  - EnemyTeam 按成员在槽位中的首现顺序派生 title、全局重复成员压为 `×N`，null 忽略，空集合为“空敌队”，
    缺失成员降级原始 EnemyId；`meta=team.id`，点击 / Hero / 试玩仍消费原始 team.id，目录不再显示“语义槽”。
  - Shop 空 / 单 / 多 / 缺失货品分别为“空货单”/首件名/“首件名等 N 种货品”/原始 ItemId 降级；
    `meta=String(shop.id)`，选择与命令仍消费原始数值 ShopId。
  - `EDITOR_ASSET_KIND_LABELS` 继续作为唯一中文 owner，`editorAssetCatalogTitle(record, fallbackLabel?)`
    统一五个资源 family；API 不接收 AssetId，因此合法无 label / 空白 label 不会再把同一 ID 同时放入两行。
  - Registry 升 v3，28 个生产 surface 均强制登记 `titleKind / identitySlot / idPresentation /
    summaryKind`；team/shop、五资源、scene root、undeclared reference 精确集合与四向政策均被门禁锁定。
    生产 TSX 对 `skill.pal.* / enemy.pal.* / team.pal.*` 零容忍；Skill `295`、Enemy `enemy-468`、
    EnemyTeam `team-*` 和真实 AssetId 均有分槽值级测试。
- 验证：聚焦 **11 files / 77 tests passed**；`pnpm --filter @type-pal/editor typecheck` passed；
  `audit:design-system` 为 **88 files / 2 evidence-bound exceptions，passed**；`git diff --check` passed。
  未重复执行本卡此前已经跑过的一次 editor 全量。
- 视觉：PAL 默认宽度确认 EnemyTeam 380 行与 Shop 21 行均固定 68px，首行可读 title、第二行精确 ID；
  720×900 下目录宽 214px、长标题单行 ellipsis、无 document 横向溢出。点击“蜜蜂×2、蛹”后 Hero / objectId /
  selected meta 均为 `team-5`；临时 viewport 已 reset，console 0 error/warning。
- Web Interface Guidelines 增量审计：本次目录仍使用语义 button，既有 focus owner 不变，title / meta 保持
  `min-width:0 + nowrap + ellipsis`，未新增图像、表单、手势、动画或横向溢出问题。EnemyTeam 380 行的既有非虚拟
  挂载属于独立性能议题，本卡按冻结范围不改滚动 / focus owner；实测当前选择与滚动正常。
- Kimi：**accept（2026-08-28，当前 candidate 只读终审，本人独立直读实现 diff / registry v3 复算 /
  聚焦复跑，非复述 Codex，未复用旧 candidate 签字）**:
  1. **EnemyTeam 派生标题确定且不形成第二身份 ✓**:`enemyTeamCatalogTitle`（EnemyTeamTab.tsx:60-86）
     遍历 slots——null 跳过（:69）、重复成员按首现顺序压 `×N`（:70-80）、缺失成员降级原始 enemyId
     字面（:74-78,K-S1 落实）、空集合"空敌队"（:82）；纯函数输入纯数据,四边界确定。`meta=team.id`、
     `select(team.id)` 不变（:297-301,K-S2);DOM 值级断言 '赤鬼×2、青鬼' / '空敌队' / 'enemy-unknown'
     + meta 三精确 id + 点击 `onObjectFocus('team-missing')` + Hero 原 id + 无 'team.pal.' / '语义槽'
     残留（K-S3);"语义槽"技术摘要已删且门禁以 `summaryKind=none` 机检禁止残留未分类摘要。
  2. **Shop 同构收口 ✓(GC-S1 前置已落实）**:`shopCatalogTitle`（ShopTab.tsx:40-47）空"空货单" /
     单件首件名 / 多件"首件名等 N 种货品" / 缺失货品降级原始 itemId;`meta={String(x.id)}` 精确数值
     ShopId(非别名),`selectShop(x.id)` 消费原值;DOM 断言四 fixture + `onObjectFocus('9')` +
     Hero '#9';registry `shop/catalog` 已按 derived-content / meta / canonical-exact 纳入裁决,
     旧"店 N"选择器测试改为按 meta 精确匹配。
  3. **五资源 fallback 共享 owner ✓(K-S4)**:`editorAssetCatalogTitle`（asset-diagnostics.ts:31-40）
     **签名不接收 AssetId**——类型级杜绝 title=meta 同值;label → fallbackLabel →
     `未命名${EDITOR_ASSET_KIND_LABELS[kind]}`;Audio / BattleSpriteLibrary / Cutscene / Image /
     WorldSprite 五处全部接入（后两者保留定义 label 二级 fallback),JSX 不再各自硬编码未命名文案。
  4. **Registry v3 与静态闭包 ✓(本人 node 复算）**:version 3、28 条、**0 缺四字段**;
     derived-content 精确集合 = [enemy-team/catalog, shop/catalog];场景根显式 canonical-id 例外且
     reason 写明"未来多场景 catalog 重审";`leading=present` 仍精确 5 条（本增量未动媒体分类）;
     门禁新增四字段枚举白名单 + identitySlot 槽位存在性 + canonical-* 不允许 identitySlot=none +
     reference-exact 必须 referenced-id+identitySlot=none + summaryKind=none 禁残留摘要(GC-S3);
     Skill 值级断言 title='梦蛇' / meta='295' / 无 'skill.pal.295'(K-S3 机检)。
  5. **边界未漂移 ✓**:本 candidate 零 CSS(editor.css 仅有上一 candidate 的 content-visibility
     段);diff 不含 packages/content / reforge / migrate / schema / runtime / DsCatalogRow API;
     搜索仍消费 team.id / slots 原值(:92-110 未碰);DS-C.4c 升 v2.15.0(DS-G.4 minor),派生投影 /
     精确 ID / 禁别名 / 共享未命名 owner 四条均已文档化。
  6. **验证证据**:本人聚焦复跑 13 文件(11 个本 candidate 改动面 + EnemyTab / Thumbnail 两个上一
     candidate 面,验证合并工作树)**95/95 全绿**(16.36s,含 DS gate 88 files / 2 exceptions
     passed);typecheck / diff check Codex 已报;PAL 浏览器证据(380 队 + 21 店 68px、720px
     ellipsis、点击 team-5 Hero / objectId 原 id、console 0)已登记,符合开发期最小视觉验证分层,
     本席不重复跑。
  - 无返工项。GLM accept 与用户最终复验前不得标记 done。
- GLM：**rework（2026-08-28，只读终审——实现实质全部核验通过，但本席独立复跑捕获一处客观门禁红；
  最小返工后本席即转 accept，无须重审其他面）**：
  1. **已核验通过的面（逐项一手直读）**：
     - **EnemyTeam 派生标题确定** ✓：`enemyTeamCatalogTitle`（EnemyTeamTab.tsx:60-88）按槽位顺序
       遍历、null 跳过、按 enemyId 去重计数、数组保序（无 Map 迭代序依赖）、缺失成员降级裸
       EnemyId、空队“空敌队”；`meta={team.id}`（:301）；值级测试 :141-142/:168（“赤鬼×2、青鬼”
       /“空敌队”）。
     - **Shop 派生标题** ✓：`shopCatalogTitle`（ShopTab.tsx:40-47）空/单/多/缺失四态；`meta=
       {String(x.id)}`（:134）；值级测试 :72-84——titles `[金创药等 2 种货品/金创药/空货单/
       item-missing]`、metas `[7/8/9/10]` 精确 canonical id 落 meta。**GC-S1 的 Shop 裁决已按
       “纳入”落地**。
     - **共享资源标题 owner** ✓：`editorAssetCatalogTitle`（asset-diagnostics.ts:29-38）API 只收
       record/fallbackLabel、**不接收 AssetId**——结构上不可能把 ID 放进 title；五消费者齐
       （Audio:619 / BattleSprite:1237 / Cutscene:214 / Image:665 / WorldSprite:19）；14 kind
       本地化“未命名X”标签表 :11-26。
     - **Registry v3** ✓：version=3、28 entries、新增
       `titleKind/identitySlot/idPresentation/summaryKind` 四政策字段；team/shop =
       derived-content + meta + canonical-exact；scene-root = canonical-id + title（显式分类）；
       undeclared = referenced-id + none（显式分类）——GC-S1 要求的四项裁决全部在册。
     - **伪别名零容忍** ✓：`catalog-row-content-adoption.test.ts:457` 以
       `/(?:skill|enemy|team)\.pal\./g` 扫生产文件；本席 grep 生产 UI 零别名。
  2. **Counter 证据（最小返工条件）**：**DS 版本三处漂移**——工作区文档已升
     `Status: implemented v2.15.0 catalog identity placement`（editor-design-system-v1.md:3），
     但 `design-system/index.ts:13 EDITOR_DESIGN_SYSTEM_VERSION = '2.14.2'`、
     `design-system/tokens.css:4 --ds-version: "2.14.2"`、`boundary.test.ts:376-378` 三处仍锁
     `2.14.2`——本席独立复跑 boundary gate **1 failed**（"keeps inline composer density…" 断言
     `Status: implemented v2.14.2`）。这正是 K-R3/版本三处一致冻结纪律（本仓曾修过 2.10.3/
     2.10.0 同型漂移）。Codex 的 11 files / 77 tests 聚焦集与 `audit:design-system`（mjs 脚本）
     均未覆盖该 vitest 门禁，故漏检。
     **最小返工**：index.ts / tokens.css / boundary.test.ts:376-378 三处同步 `2.15.0` 后复跑
     `boundary.test.ts` 绿（本席复核）；不得改本候选其他任何文件。
  3. 其余证据核对：本席独立复跑 11 文件聚焦集 131 tests 中除上述版本断言外 130 通过；schema/
     migration/runtime 未动；68px 行高与滚动 owner保持。
- GLM done 准入（本席）：rework——仅版本三处同步这一项；修复合入并复跑绿后 GLM 转 accept，与
  Kimi accept + 用户复验齐后收口。**注：Kimi 席同窗口已签 accept，其聚焦集同样未含
  boundary.test.ts 版本断言；本席反证独立成立，非代签或复述。**
- Codex 最小返工（2026-08-28）：严格按 GLM 唯一返工项，把 `design-system/index.ts` 的
  `EDITOR_DESIGN_SYSTEM_VERSION`、`tokens.css` 的 `--ds-version` 与 `boundary.test.ts` 的三向断言从
  `2.14.2` 同步为 `2.15.0`；未修改目录映射、registry、CSS 布局或其他业务实现。聚焦复跑
  `boundary.test.ts` 为 **1 file / 47 tests passed**，`git diff --check` 通过。Codex 维持 accept；GLM
  必须独立核三处一致并把本席 `rework` 转为 `accept`，Codex 不代签。
- done 准入：**blocked pending GLM accept + 用户最终复验**（Codex + Kimi accept 已签，均 2026-08-28
  当前 candidate）；任一席发现派生 title 进入 identity 路径、
  fallback 仍重复 ID、伪 `.pal.` 别名、同型 surface 未裁决或行高 / 滚动回归，签 counter 并转 rework。

### 2026-08-28 音频删除 + 敌人待机首帧缩略图合并增量重签

- 用户裁决（before -> after）：**已批准（2026-08-28）**。音乐 / 音效每行固定三角形、敌人行只有名称 / ID /
  规则数 -> `audio-asset` 全族省略 `leading`，`enemy` 全族显示其绑定 enemy `BattleSpriteDef` 的
  `profile.idle.start` 静态首帧；其余 title / meta / trailing 与中央播放器均保持。
- 增量四向真值：

  | 维度 | 当前真值 | 直接证据 |
  |---|---|---|
  | 原版 / primary source | N/A：原版没有二阶段作者目录 UI；这里只复用当前 canonical 战斗精灵语义。 | `docs/phase2/READ-FIRST.md:1-8` |
  | 第一阶段 | N/A：第一阶段没有当前 `DsCatalogRow` 内容槽位或该资源工作台。 | `docs/phase2/READ-FIRST.md:1-8` |
  | 当前二阶段 | Audio 的三角形只是整行选择内的静态 glyph；Enemy 行无 `leading`，但每个 `EnemyDef` 必须引用 enemy profile 的 `BattleSpriteDef`。enemy profile 至少有一帧待机且 canonical 强制 `idle.start === 0`；引用门会拒绝缺定义 / 错 profile。 | `AudioAssetWorkbench.tsx:320-375,613-622`；`EnemyTab.tsx:540-552,727-741`；`enemy.ts:85-93`；`battle-sprite.ts:129-145`；`validate-refs.ts:256-262,1268-1283` |
  | 本任务目标 | 删除无行为 audio glyph；Enemy 按 `profile.idle.start` 显示真实静态缩略图，并保持资源加载有界、懒加载、无动画。 | 2026-08-28 用户裁决；本增量验收条件 |

- PAL 代表工程直接 census：`projects/pal/content/enemies.json` 为 153 个敌人，绑定 152 个 enemy profile 定义；
  0 缺定义、0 错 profile、0 缺 AssetId，只有一个定义被两个敌人共享。它证明真实缩略图在当前工程有完整覆盖，
  但不把“外观必然唯一”误写为前提；同外观仍由名称 + EnemyId 区分。
- 最强替代解释与可证伪观察：36px 待机首帧可能因透明留白 / 尺寸差异而多数不可辨，或逐行复用完整动画预览
  导致首屏全量解码、全帧 bake 与 timer。若真实 PAL 抽查多数不可辨，或初始挂载触发 153 次读取、产生逐行 timer、
  快速滚动串图，则该设计 / 实现应 counter；当前完整资源链证明“没有可用真实媒体”不成立。
- Codex：
  - premise: **verified（2026-08-28，生产源码 + PAL canonical 数据直读）**。`EnemyDef.battleSprite` 是
    `BattleSpriteDef.id`（`enemy.ts:85-93`）；引用收集把它声明为 expected `enemy` profile，并在
    `validate-refs.ts:1268-1283` 拒绝缺定义 / 错 profile。`battle-sprite.ts:129-145` 又保证待机段至少一帧且从
    0 开始。因此用户所说“待机第一帧”已有唯一语义 owner；实现仍必须读取 `profile.idle.start`，不得裸写 `0`。
    PAL census 证明 153 行均能落到真实资源。音频静态 glyph / 中央 transport 真值沿用下方历史单项审查证据。
  - design: **agree（2026-08-28）**。Audio 按已签设计删除共享 row 的静态 `leading`；Enemy 新建只负责一帧的
    轻量缩略图路径，复用 `BattleSpriteAssetCache`、`loadBattleSpriteDefinition(..., 'enemy')`、标准 palette 与
    `bakeFrame`，按项目生命周期共享有界缓存，key 至少含 AssetId + revision + `idle.start`。仿
    `SpriteThumb.tsx:74-108` 进入视口才读，仅 bake 目标帧、36px 底部居中、关闭平滑、`aria-hidden`；不得直接
    塞入会解码 / bake 全帧并启动动画的 `BattleSpriteInlinePreview`。加载失败留空真实媒体槽并交现有诊断 owner，
    不串用其他敌人帧或通用 emoji；不改 `DsCatalogRow`、schema、migration、runtime、行高或滚动 owner。
    Registry 联合结果必须精确为 audio `present -> none`、enemy `none -> present`，`leading=present` 最终是
    actor / ambience / enemy / image / item。
- Kimi:
  - premise: **verified(2026-08-28,本人独立直读资源链 / 校验器 / 缓存先例 + node 独立复算 PAL census,
    非复述 Codex / GLM)**:
    1. **EnemyDef -> enemy BattleSpriteDef -> idle.start 真值链**: `enemy.ts:90-91` `battleSprite` 必填
       (注释明示"敌人 profile 的 BattleSpriteDef.id");`validate-refs.ts:256-262` 引用收集声明
       `expectedProfile: 'enemy'`,`:1268-1284` 缺定义 / 错 profile 双 error;`battle-sprite.ts:133-134`
       canonical 强制 `idle.count >= 1` 且 `idle.start !== 0` 即 fail;加载路径 `loadBattleSpriteDefinition
       (cache, reader, def, expected)` 再校 profile(`assets.ts:402`;`assets.test.ts:377` 证明传 'enemy'
       对错 profile reject)。"待机第一帧"有唯一语义 owner 实锤。
    2. **PAL census 本人 node 直读复算**(projects/pal/content/enemies.json + battle-sprites.json):
       153 敌人、171 总定义、152 个 enemy profile、**0 缺定义 / 0 错 profile / 0 缺 AssetId**,恰
       `enemy-battle-81` 一个定义被 2 敌人共享——与 Codex / GLM 数字逐项一致;"外观必然唯一"不作为前提,
       同外观行由名称 + EnemyId 区分。
    3. **禁裸 0 成立**: canonical 当前强制 `idle.start === 0` 且真实数据全 0,禁硬编码不是当下数据需求
       而是保真约束——canonical 若放宽,读 profile 的实现自动正确、硬编码 0 静默错帧;GC-E1 机检 +
       relaxed fixture 注入是必要的。
    4. **懒加载 / 有界 / 无 timer 先例在位**: `SpriteThumb.tsx:74-108`——IntersectionObserver
       (rootMargin 120px)进视口才 loadThumb(:78-91)、alive-flag 防迟到写串图(:90-92,107)、失败
       `clearRect` 后 `if (!baked) return` 留空、**无 emoji 回退**(:95-96)、关平滑等比缩放(:97-103);
       `BattleSpriteAssetCache`(`assets.ts:339-372`)capacity 192 LRU、共享并发 Promise、失败驱逐、
       record 签名失效;`bakeFrame` 单帧 bake(`render.ts:34`)。对照 `BattleSpriteInlinePreview.tsx:
       244-248`——sequence>1 时 `setInterval(setTick, frameMs ?? 200)` 动画 timer 实锤,"不得直接塞入
       目录行"的担心为真,新建单帧轻量路径成立。
    5. **失败 / 串图边界**: 仿 SpriteThumb 的 alive + revision guard 防快速滚动串图;加载失败留空真实
       媒体槽并交既有诊断 owner,不串其他敌人帧、不回退通用 emoji;缓存 key 至少含 AssetId + revision +
       idle.start(编辑后 record 签名变化自动失效,不串旧图)。
    6. **registry 算术**: audio `present -> none` + enemy `none -> present` -> `leading=present` 最终
       精确 actor / ambience / enemy / image / item(本席复算与 GLM 一致);行高 68px 不改,36px 缩略图
       在 leading 槽内(DOM 断言 build 期复核)。**audio 单项证据**(静态 glyph :617 / 整行 select :621 /
       中央 transport owner :320-378 / DsIcon aria-hidden / DsCatalogRow 已是 button)本席上一轮已独立
       核实、仍然有效;但其"精确四类"结论按合并增量作废,最终为五类。
  - design: **agree(2026-08-28)**。GLM 的 GC-E1(禁裸 0 机检 + relaxed fixture)/ GC-E2(懒加载 /
    有界 / 无 timer / 防串图断言)/ GC-E3(registry 联合断言 + 双负断言 + 全族正断言 + 68px 行高)
    三钉本席全部背书。补充定位: 36px 首帧的视觉可辨性是**验收条件**而非 build 前阻断项——卡面已登记
    史莱姆 / 灯笼 / 黑毛球 / 烂香菇抽查 + 与中央待机首帧一致的 E2E 用例;若验收抽查证明多数不可辨,
    按卡面 counter 条件回炉复验媒体价值前提,不得静默降级为 emoji 或偷换动画预览。
- GLM：
  - premise: **verified（2026-08-28，本人一手直读资源链/校验器/懒加载先例 + 独立复算 PAL census，非代理）**：
    1. **资源链真值**：`EnemyDef.battleSprite` 是 BattleSpriteDef.id（enemy.ts:85-93，注释明示“敌人
       profile”）；`battle-sprite.ts:129-145` canonical 校验——enemy profile `idle.count ≥ 1`、
       **`idle.start !== 0` 即 fail**、magic/attack 段紧接；`validate-refs.ts:1268-1283` 对缺定义/
       错 profile 双 error。“待机第一帧”有唯一语义 owner。
    2. **独立复算 PAL census（与 Codex 数字逐项一致）**：153 敌人 → 152 个 enemy profile，**0 缺
       定义、0 错 profile**；恰一个共享定义（`enemy-battle-81` 被 2 敌人用）；全部所用 profile
       `idle.start = {0}`、`idle.count ∈ [1,5]`、asset 均为字符串 AssetId——真实缩略图全量可落，
       共享外观由名称 + EnemyId 区分（卡文“不把外观必然唯一误写为前提”正确）。
    3. **懒加载/防串图先例在位**：`SpriteThumb.tsx:74-108`——IntersectionObserver（120px
       rootMargin）进视口才 load、alive-flag 防迟到写串图、单帧 bake 等比缩放 + 关平滑；
       `BattleSpriteAssetCache` / `loadBattleSpriteDefinition` / `bakeFrame` 均为真实导出
       （EnemyAnimPreview.tsx:5-7、MapContentSelectionPreview.tsx:110-115 既有消费）。设计复用
       这些 owner 而非塞入会全帧解码 + 启动动画 timer 的 BattleSpriteInlinePreview，成立。
    4. **registry 现状与目标算术**：当前 present = [actor/ambience/audio/image/item]、enemy=none
       （本席复算）；合并目标 audio present→none + enemy none→present → **最终恰
       [actor/ambience/enemy/image/item]**，与卡文一致。音频静态 glyph / 中央 transport 真值沿用
       本人已签单项证据（:616/:621/:320-340 直读，仍有效），但其“剩四类”结论按合并增量作废。
    5. **`idle.start === 0` 与“禁裸 0”的关系**：canonical 当前强制 0 且真实数据全 0——禁硬编码
       不是当下数据需求，而是保真约束（若 canonical 未来放宽，读 profile 的实现自动正确、硬编码
       0 静默错帧）；该要求成立且必须机检。
  - design: **agree（2026-08-28，附 GC-E1-GC-E3 必落钉）**：
    - **GC-E1（禁裸 0 机检）**：新缩略图组件不得出现 `frame: 0` / `frameIndex: 0` 类字面量——静态
      断言 + 单测注入 relaxed profile（idle.start ≠ 0 的构造 fixture）证明帧号确实派生自
      `profile.idle.start`；缓存 key 至少含 AssetId + revision + idle.start。
    - **GC-E2（懒加载/有界/无 timer 断言）**：测试断言初始挂载零资源读取、仅可见行加载、
      bakeFrame 每行恰一次（非逐动画帧）、组件无 rAF/setInterval 循环、缓存有界（上限可断言）；
      快速滚动下 alive/revision guard 不串图（沿用 SpriteThumb alive 模式）；加载失败留空媒体槽
      交既有诊断 owner——不用其他敌人帧、不用通用 emoji。
    - **GC-E3（registry/门禁联合断言）**：audio 条目翻 none + fingerprint 刷新 + reason 引
      2026-08-28 裁决；enemy 条目翻 present + fingerprint 刷新；music/sound DOM 双负断言
      （AudioAssetWorkbench 不得再现目录行播放 glyph）；enemy 全族正断言（所有行 data-leading
      present）；陈旧 fingerprint 即门禁红；行高 68px 断言保持（36px 缩略图在 leading 槽内）。
  - 可证伪观察：①若真实 PAL 抽查（史莱姆/灯笼/黑毛球/烂香菇等）证明 36px 首帧多数不可辨——
    用户裁决的媒体价值前提弱化须复验；②若实现出现首屏 153 次读取、全帧 bake、逐行 timer 或滚动
    串图——按卡面 counter 条件返工；③若 `enemy-battle-81` 共享双敌人的同图行被误判为缺陷——
    名称 + EnemyId 区分是设计内行为。
- 独立反证审查：GLM（2026-08-28，见上——资源链一手核验 + PAL census 独立复算 + 懒加载先例直读）；
  **Kimi(2026-08-28,独立复核完成)**: 回答"什么观察会证明 36px 首帧不具选择价值或加载方案不可
  接受"——①若验收抽查(史莱姆/灯笼/黑毛球/烂香菇)36px 首帧多数不可辨 -> 媒体价值前提回炉;
  当前 census 证明资源链 0 缺口,可辨性属已登记的验收用例,不构成 build 前阻断。②若初始挂载触发
  153 次读取 / 逐行 timer / 全帧 bake / 滚动串图 -> 加载方案不可接受;设计仿 SpriteThumb(IO 门 +
  alive guard + 单帧 bake + 无 rAF/setInterval)逐项否证,测试矩阵(GC-E2)已机检化。③若缓存 key
  缺 revision / 签名不失效 -> 编辑后串旧图;BattleSpriteAssetCache 完整 record 签名失效(assets.ts:
  347,377)+ key 含 AssetId+revision+idle.start 否证。④若 `enemy-battle-81` 共享双敌人的同图行被
  误判缺陷 -> 名称 + EnemyId 区分是设计内行为(与 GLM 观察③一致)。
- counter / 分歧处理：N/A。
- build 准入结论：**allowed(三方合并增量签字齐: Codex / GLM / Kimi 均 2026-08-28 verified + agree,
  无 counter)**。音频单项三签只授权“删除后精确剩四类真实媒体”,其结论按合并增量作废;最终集合为
  五类(actor / ambience / enemy / image / item),audio=none、enemy=present、行高 68px 不变。
  Coding Owner Codex 按 GC-E1 / GC-E2 / GC-E3 与 Kimi 背书钉落实;新实现后的三方 done accept 重新
  计算,2026-08-27 与音频单项旧 accept 均不复用。Status 流转由 Coding Owner 开工时更新。

### 历史：2026-08-28 音频静态播放 glyph 删除单项重签（因同日 Enemy 真实媒体裁决而失效）

- 用户裁决（before -> after）：**已批准（2026-08-28）**。音乐 / 音效目录每行固定播放三角形 -> 整个
  `audio-asset` family 省略 `leading`；名称、稳定 AssetId 与非零引用数保持，中央工作区播放 / 暂停入口不变。
- 增量四向真值：

  | 维度 | 当前真值 | 直接证据 |
  |---|---|---|
  | 原版 / primary source | N/A：原版没有二阶段作者资源目录 UI。 | `docs/phase2/READ-FIRST.md:1-8` |
  | 第一阶段 | N/A：第一阶段没有当前 `DsCatalogRow` / 音频工作台交互。 | `docs/phase2/READ-FIRST.md:1-8` |
  | 当前二阶段 | 三角形是不可聚焦的静态 leading；整行只选择资源，实际播放 / 暂停由中央播放器持有。 | `AudioAssetWorkbench.tsx:320-375,613-622`; `recipes.tsx:147-192` |
  | 本任务目标 | 音乐 / 音效同源目录省略 leading；不改变资源选择、引用数和中央播放控制。 | 2026-08-28 用户裁决；本增量验收条件 |

- 最强替代解释：三角形可能提示“这是音频”或承担快捷试听。可证伪观察：若它拥有独立点击 / 键盘入口、随播放
  状态变化，或是区分对象 / 类型的唯一信息，则应 counter 并保留；当前源码显示上述三项均不成立。
- Codex：
  - premise: **verified（2026-08-28，当前生产源码直读）**。`AudioAssetWorkbench.tsx:613-622` 的三角形只是
    `DsCatalogRow` 内静态 `leading={<DsIcon name="play" />}`，整行 `onClick` 仅调用 `select(entry.id)`；真实
    播放 / 暂停按钮及状态 owner 位于同文件 `:320-375`。音乐与音效共同消费该 workbench，因此该 glyph 在两类
    目录中都不执行媒体控制、也不随资源或播放状态变化。删除后 title / meta / trailing 已足以完成识别与选择。
  - design: **agree（2026-08-28）**。删除共享 `DsCatalogRow` 的 `leading` prop；同步
    `catalog-row-content-adoption.json` 的 fingerprint / `leading=none` / 用户裁决 reason，更新 DS-C.4b 音频
    family 规则并增加静态负断言。不得把播放按钮嵌进 `DsCatalogRow`：目录行本身已是 button，实际试听继续由
    中央工作区唯一负责。不得波及 actor / ambience / image / item 四类真实媒体。
- Kimi:
  - premise: **verified（2026-08-28，本人独立直读生产源码，非复述 Codex / GLM）**。①glyph 无任何媒体语义:
    `AudioAssetWorkbench.tsx:617` `leading={<DsIcon name="play" />}` 恒为 `'play'`,不随 `playing` 切换——
    对照中央 `:322` `icon={playing ? 'pause' : 'play'}` 才是动态;`DsIcon` 本体 `aria-hidden="true"
    focusable="false"`(`design-system/icons.tsx:207-208`),无独立 onClick / 键盘入口,`DsCatalogRow`
    把 leading 只渲染成纯展示 `<span>` 槽(`design-system/recipes.tsx:184`)。②整行只 select:`:621`
    `onClick={() => select(entry.id)}` 与虚拟列表 `:606 onSelect` 同一函数;键盘经 `control.tabIndex /
    onFocus`(:614-615)。③中央播放器唯一 owner:`:320-378` 播放/暂停(动态 icon + 中文 label,
    :321-351)、停止(:352-364)、seek slider(:315-319)、时间 output(:365-367)、状态文本(:369-377
    正在读取/读取失败/正在播放/就绪)。④目录行本身已是 `<button type="button">`(recipes.tsx:172),
    选中态由 `aria-pressed/aria-selected` 承载(:177-179)。⑤删除后无唯一信息损失:title=label||id
    (:618)、meta=稳定 AssetId(:619)、trailing=非零引用数 DsTag(:620);glyph 不区分资源(全行同形)、
    不区分类型——Music/Sound 消费同一 workbench 同一 glyph(`MusicTab.tsx:103 MUSIC_STRATEGY` /
    `SoundTab.tsx:53 SOUND_STRATEGY`),"这是音频"由页签与 strategy 工作区标题承载。行号与 GLM 差 1
    (本席按当前工作树 :617/:621/:620;GLM 记 :616/:621/:619)系读取时点漂移,语义一致,不构成分歧。
  - design: **agree(2026-08-28)**。删除 `audio-asset` family 共享 `DsCatalogRow` 的 `leading` prop,
    registry fingerprint / `leading=none` / 用户裁决 reason、DS-C.4b 音频条款与静态 + DOM 负断言同步;
    不得把播放按钮嵌进目录行(行已是 button,嵌套非法且违背中央唯一 owner);不得波及 actor 头像 /
    ambience 色样 / image 缩略图 / item 图标四类真实媒体与音频引用数 trailing(:620 保留)。
    GLM 的 GC-A1(删除后精确 4 媒体 + 双负断言)/ GC-A2(不波及边界)两钉本席全部背书。
- GLM：
  - premise: **verified（2026-08-28，本人一手直读 glyph/行交互/中央 transport/双消费方/registry，非代理）**：
    1. **静态 glyph 实锤**：`AudioAssetWorkbench.tsx:616` `leading={<DsIcon name="play" />}`——无
       aria-label、无独立 onClick、不随播放状态或资源变化；行级 `onClick={() => select(entry.id)}`
       （:621）与虚拟列表 `onSelect`（:605）都只做选择。“只选中对象、不播放/暂停/不反映状态/
       不区分资源”四项全部属实（同一三角形出现在每一行，音乐/音效两组目录内均无差异）。
    2. **music + sound 同源闭包实锤**：MusicTab.tsx:131（MUSIC_STRATEGY）与 SoundTab.tsx:81
       （SOUND_STRATEGY）渲染**同一个** `AudioAssetWorkbench`（:81/:131 各一行挂接）——glyph 只
       有一个生产位点，删除该处即同时覆盖音乐与音效两类目录，不存在第二处需另行删除的同源残留。
    3. **中央播放 owner 实锤**：真实播放语义在 `:320-340` transport——`DsIconButton
       icon={playing ? 'pause' : 'play'}`（状态绑定）、`transport.pause()/play()`（:63 接口含
       stop）、previewOwner claim/release——leading glyph 与该 owner 零耦合，删除不影响任何
       播放/暂停/停止能力。
    4. **registry 现状**：`audio/asset-catalog` 当前 `leading=present`、decision=bounded-exception、
       reason 引“DS-R.2 已冻结播放语义媒体”——该“播放语义”归因实际落在中央 transport 而非目录
       glyph，2026-08-27 K-I2 的 Audio 保留分类确被用户裁决推翻；本增量翻 `leading=none` +
       reason 改引 2026-08-28 裁决 + fingerprint 刷新由 gate 双向精确匹配强制（不同步即红）。
    5. **DS-C.4b 待改写确认**：`:436` 现行“音乐 / 音效用播放语义图标”条款与本增量冲突，必须改写
       （音频 family 整体省略媒体槽）；DS-C.4c 的通用语义媒体条款不受影响。
  - design: **agree（2026-08-28，附 GC-A1/GC-A2 必落钉）**：
    - **GC-A1（删除后精确 4 媒体 + 双负断言）**：删除后 registry `leading=present` 必须精确只剩
      [actor / ambience / image / item]；gate 增加 music + sound DOM 负断言（AudioAssetWorkbench
      生产源码不得再出现 `leading={<DsIcon name="play" />}` 及等价播放 glyph 进目录行）；fingerprint
      同步刷新，陈旧 fingerprint 即红。
    - **GC-A2（不波及边界钉）**：trailing 非零引用数（:619）、中央 transport 播放/暂停/停止、
      actor/ambience/image/item 四类真实媒体、以及其他目录面的既有裁决一律不动；不得把播放按钮
      嵌进 DsCatalogRow（行已是 button，嵌套 button 反破坏语义）；DS-C.4b 只改音频 family 条款。
  - 可证伪观察：①若 glyph 拥有独立点击/键盘入口、随播放状态变化、或是某行/某类的唯一区分信息——
    本席直读三项均不成立（静态 DsIcon + 全行同形 + 无状态绑定）；②若删除后作者在同名音频资源间
    失去区分——区分由 title(label) + meta(AssetId) + trailing(引用数) 承载，glyph 本就不参与；
    ③若未来用户要求“目录行内直接试听”，须另开设计卡把行内播放做成真按钮 + 真状态（且需解决行
    button 嵌套），不得复活静态三角形。
- 独立反证审查：GLM（2026-08-28，见上——三角形唯一选择价值的三个可能证据均被一手源码否定）；
  **Kimi(2026-08-28,独立复核完成)**: 回答"什么证据会证明三角形仍有唯一选择价值"——①若 glyph
  随播放状态切换(播放中该行变 ■/⏸)→ 应保留;实读否证(:617 恒 'play',状态切换只发生在中央 :322)。
  ②若 glyph 有独立点击 / 键盘入口(span onClick 或嵌套 button)→ 应保留;实读否证(纯展示 span +
  aria-hidden + focusable=false)。③若 music / sound 用不同 glyph、或 glyph 是类型 / 资源区分唯一载体
  → 应保留;实读否证(同源 strategy 外壳同一 'play',身份与格式由 title/meta/页签承载)。④若删除后
  registry `leading=present` 剩余面不精确等于 actor / ambience / image / item 四类 → 机检红、build 期
  停线(由 gate 强制,GLM GC-A1 已钉)。最强替代解释"三角形=快捷试听肌肉记忆"不成立:它从无此行为,
  用户裁决已确认"只选中对象",真实播放入口在中央有动态 icon + 中文 label,可发现性不依赖目录 glyph。
- counter / 分歧处理：N/A。
- build 准入结论：**allowed（三方增量签字齐：Codex / GLM / Kimi 均 2026-08-28 verified + agree,无
  counter）**。本增量直接推翻 2026-08-27 K-I2 / GC-R2 的“Audio 播放语义保留”分类；旧 design 与 done
  accept 只保留历史事实,不授权当前 candidate,新实现后的三方 done accept 重新计算。Coding Owner Codex
  按 GC-A1 / GC-A2 与 Kimi 背书钉落实（删除 leading prop、registry / fingerprint / reason、DS-C.4b
  音频条款、静态 + DOM 负断言;不动中央播放器、引用数 trailing 与四类真实媒体）;Status 流转由
  Coding Owner 开工时更新。

### 2026-08-28 音频删除 + Enemy 首帧合并 candidate 进入 done 前审查

- Codex: **accept（2026-08-28，当前 candidate）**。`AudioAssetWorkbench` 的共享目录调用已整体省略
  `leading`，music / sound 两类 DOM 均为 `data-leading=none`，中央播放 / 暂停 / 停止与非零引用数保持。
  Enemy 全族通过独立 `EnemyBattleSpriteThumbnail` 显示绑定 enemy profile 的 `idle.start` 单帧：进入视口前
  零读取，只 bake 目标帧，无 timer / emoji fallback；按工程资源上下文持有 64 项有界派生缓存，revision
  变化失效、并发 Promise 合并、失败驱逐、卸载清理，alive guard 防对象切换迟到结果串图。Registry 最终
  `leading=present` 精确为 actor / ambience / enemy / image / item，DS-C.4b / C.4c / DS-R.2 同步。
  聚焦 **4 files / 18 tests passed**，`typecheck` 与 `git diff --check` passed；默认宽度 + 720px PAL 浏览器实测
  Enemy 153 行固定 68px / 36px 真实缩略图、滚动无串图/横向溢出，music 86 / sound 363 行无 leading 且
  中央 transport 仍唯一，console 0 error/warn。唯一一次 editor 全量得到 152/167 files、1316/1343 tests
  passed；其余 26 项均为并发 5s/15s/60s timeout，另一个新生产文件计数断言已更新并以聚焦 gate 复绿，
  未重复跑第二次全量。
- Kimi: **accept（2026-08-28，当前 candidate 只读实现终审，本人独立直读 diff / 新组件全文 / registry
  复算 + 聚焦复跑，非复述 Codex）**:
  1. **Audio 全族无 leading、中央与引用数未受影响 ✓**:`AudioAssetWorkbench.tsx` diff 仅删 `DsIcon`
     import 与目录行 `leading={<DsIcon name="play" />}` 两处,title/meta/trailing 与中央 transport
     (:320-378)零改动;music / sound 双 DOM 负断言(行 `data-leading='none'` + 无
     `.ds-catalog-row__leading`)聚焦绿。
  2. **Enemy 用 profile.idle.start、禁裸 0 ✓**:`EnemyBattleSpriteThumbnail.tsx:47`
     `const frameIndex = definition.profile.idle.start`;静态门禁钉死
     `frames[0]` / `frameIndex = 0` / `setInterval` / `requestAnimationFrame` / emoji 均禁
     (catalog-row-content-adoption.test.ts:304-310)。
  3. **进视口前零读取、只 bake 一帧、无 timer/emoji ✓**::110-128 IntersectionObserver(120px)进视口
     才 setVisible;:136 `!visible` 在 `cache.load` 前直接 return(初始挂载零资源读取);:72-76 仅取
     `frames[frameIndex]` 单帧 `bakeFrame`;失败 catch 删 entry 返回 null,组件 :146 `!frame` 直接不画
     (clearRect 后留空真槽,无 emoji、不串其他敌人帧);全文无 timer。
  4. **缓存合同 ✓**:容量 64 LRU(:13,82-87 超限逐最旧、命中重插);key 含 projectId + definition.id +
     asset + revision(sha256)+ idle.start + profile JSON(:48-55)——revision / profile 变化自然换 key;
     entries 存 Promise 并发合并(:56-61);失败驱逐可同 revision 重试(:77-80);`prune` 语义核对
     (assets.ts:384-389——仅超容量才逐出非保护项,非每次清场);EnemyTab 按 [assetBase, assetReader]
     useMemo 持 cache + useEffect cleanup `clear()`(工程切换 / 卸载清理);alive guard(:144-146,
     167-169)防对象切换迟到写串图。
  5. **registry 精确五类 ✓(本人 node 复算)**:`leading=present` 恰 5 条 = actor / ambience / enemy /
     image / item;audio=none、enemy=present,fingerprint 与 reason(引 2026-08-28 裁决)同步;机检
     断言精确匹配五类集合(catalog-row-content-adoption.test.ts:260-272);DS-C.4b / C.4c / DS-R.2
     文档三处同步改写。
  6. **行高 / 滚动 owner / schema / runtime 未变 ✓**:editor.css diff 仅新增 `.enemy-catalog-row`
     的 `content-visibility: auto` 渲染跳过(用既有 `--ds-catalog-row-height` token),未动行高与
     `.sprite-list` 滚动 owner;工作树 diff 不含 packages/content / reforge / migrate / 任何 schema、
     migration、runtime 文件;`DsCatalogRow` props 未改。
  7. **测试与全量 timeout 证据判断**:本人聚焦复跑 5 文件(EnemyBattleSpriteThumbnail / EnemyTab /
     AudioAssetWorkbench / catalog-row-content-adoption / adoption)**32/32 全绿**(13.86s,含 DS
     gate 88 files 断言)。Codex 报告的全量一次 152/167 files、26 项并发 5s/15s/60s timeout 属既有
     基础设施波动(本席在 ED-FIELD-LAYOUT-1 等批次多次亲历同类并发 flake,聚焦复跑均绿),本 candidate
     改动面聚焦全绿 + typecheck + diff check + DS gate 绿,不构成回归信号;不要求第二次全量作为
     accept 前置,但 done 后若用户验收前有机会重跑一次干净全量更佳(不阻断)。
  - 浏览器证据(默认宽度 + 720px PAL:153 行 68px / 36px、滚动无串图、music 86 / sound 363 行无
    leading、console 0)已登记卡面,符合"功能性界面开发期最小视觉验证"分层,本席不重复跑。
  - 无返工项。2026-08-27 与音频单项旧 accept 未复用;GLM accept 齐前不得标记 done。
- GLM: **accept（2026-08-28，只读终审，本人一手直读实现 + registry 复算 + 独立复跑聚焦，不复用旧
  accept）**：
  1. **Audio 全族无 leading + 中央 owner 完好** ✓：`AudioAssetWorkbench` 目录调用无 `leading` prop
     （本席 grep 生产源码零命中），trailing 非零引用数与行 select 不变；中央 transport
     `:320-340`（动态 play/pause + stop + previewOwner）原样。music 86 / sound 363 行
     `data-leading=none`（Codex 浏览器证据）。
  2. **Enemy idle.start 派生 + 懒加载 + 单帧 + 无 timer** ✓：`EnemyBattleSpriteThumbnail.tsx:47`
     `const frameIndex = definition.profile.idle.start`——派生非裸 0，`:46/:139` 非 enemy profile
     拒染；IntersectionObserver 120px rootMargin、可见即 disconnect（:117-127），effect 以
     `visible` 门控——进视口前零读取；`bakeFrame` 每缓存项恰一次（:74-75）；全文无
     rAF/setInterval；失败 `return null` 留空 canvas（aria-hidden），无 emoji/他敌帧回退。
  3. **缓存合同逐项** ✓：容量 `THUMBNAIL_CACHE_CAPACITY = 64`（:13）+ touch-on-access LRU
     （:56-60）+ 超限逐最旧（:82-87）；key = `[projectId, definition.id, asset, revision,
     frameIndex, profile JSON]`（:48-55）——revision/工程/帧号全失效维；并发共享同一 Promise
     （:56-61）；**失败驱逐** `.catch` 中 `entries.get(key) === promise` 才删（:77-79，可重试）；
     **工程切换清理**——EnemyTab `:591-594` cache 以 `[assetBase, assetReader]` 为 memo key
     （上下文变即换新实例）+ `:600-602` 卸载 `clear()`；**异步不串图**——alive-flag
     （:144/:167-169）+ 测试 "never paints a late frame from the previously bound enemy"。
  4. **registry 精确五类** ✓：本席复算 `leading=present` 恰 [actor/ambience/enemy/image/item]；
     audio=none（fp `391831c2…`，reason 引 2026-08-28 裁决）、enemy=present（fp `1e74f074…`），
     双 fingerprint 已刷新且 gate 双向精确匹配（复跑通过即证）。DS-C.4b :436 已改写为
     “Enemy 用 idle.start 真实首帧；音乐/音效试听由中央播放器唯一持有，目录全族省略媒体槽”。
  5. **行高/滚动/schema 未变** ✓：行高 68px 断言与浏览器实测保持；滚动 owner `.outliner` 不变
     （仅 content-visibility + intrinsic size）；`git log -- packages/content|reforge|migrate|
     projects/pal` 无新提交——schema/runtime/migration/PAL 未动。
  6. **测试矩阵与 timeout 证据判断** ✓：本席独立复跑 `EnemyBattleSpriteThumbnail + EnemyTab +
     AudioAssetWorkbench + catalog-row-content-adoption` → **4 files / 18 tests passed**（与
     Codex 一致）；四个具名测试逐项对应本人 GC-E1/GC-E2 钉（declared idle.start 帧 / 可见行
     才加载 / 有界+revision+工程释放 / 失败驱逐重试 / 迟到帧不串图）。全量 26 个并发
     5s/15s/60s timeout **均为环境竞争非断言失败**、分散于本卡与相邻页面，不构成当前 candidate
     缺陷证据；Codex 以聚焦复绿 + 保留完整全量输出供 reviewer 判断的处理符合纪律——建议将
     "全量高并发 timeout 稳定性"登记为独立基础设施后续卡，不阻塞本卡。
  - 无返工项。未修改实现文件，未代签 Kimi。
- counter / 返工处理：N/A。
- 缺签豁免：N/A。
- done 准入结论：blocked——Codex + Kimi + GLM 三方 accept 已齐（均 2026-08-28，当前合并 candidate）；
  按流程待用户最终验收后收口，任何 Agent 不得自行标记 done。

### 历史：2026-08-27 无意义 leading 增量重签（音频保留边界因 2026-08-28 用户裁决失效）

- Codex：
  - premise: **verified（2026-08-27，当前生产源码 + 全 adoption registry 复扫）**。除已改为 `none` 的
    `project/entry-catalog` 外，当前 `leading=present` 的 12 个 surface 中，以下 7 个删除后不损失对象区分：
    `App.tsx:2228-2234` 固定 `🗺️`；`BattleSpriteLibrary.tsx:1213-1223` 固定 `▦`；
    `CutsceneTab.tsx:203-210,680-693` 的 `▶/▦` 与“视频/帧动画”分组重复；
    `EnemyTeamTab.tsx:268-274` 固定 `⚔`；`VarsTab.tsx:269-276,330-343` 的 `⚑/№/!` 与分组、冲突/创建状态重复；
    `WorldSpriteLibrary.tsx:579-589` 固定 `▦`。保留的 5 类均有直接选择价值：Actor 真实头像/已裁决 fallback
    （`ActorMode.tsx:126-145,460-477`）、Ambience 真实色样（`AmbienceTab.tsx:442-463`）、Audio 播放语义
    （`AudioAssetWorkbench.tsx:612-620`）、Image 缩略图（`ImageTab.tsx:649-663`）、Item 真实图标
    （`ItemTab.tsx:475-492`）。
  - design: **agree（2026-08-27）**。删除上述 7 个固定符号并同步 adoption fingerprint / leading / reason；
    当前入口 WIP 同时让选中底色贯穿排序手柄、正文和移动动作区，但移动按钮保持独立 hit target 与边框。
    `ImageAssetThumbnail` 的 item 缺图空白 fallback（`ImageAssetPicker.tsx:118`）只登记为独立待裁决缺陷，
    本增量不借机删除真实 item 媒体槽或发明新资产。
- Kimi：
  - premise: **verified（2026-08-27，独立直读三个删除面 + 一个保留面，非代理）**。
    删除面抽样：①敌队 `EnemyTeamTab.tsx:268-275`——`leading={<span>⚔</span>}` 是全行不变的装饰
    符号，行区分度由 title(team.id)与 meta（成员/槽位数）承载（我 2026-08-25 曾判“有选择价值”，
    直读复核确认该判断实际落在 meta 计数上而非符号本身，用户裁决正确）；②场景根
    `App.tsx:2228-2234` 的 🗺️ 同为常量装饰；③`VarsTab.tsx:269-276` 的 ⚑/№ 与“开关/数值”
    `DsCatalogGroupHeader` 分组（:330-333）完全重复，`:337-343` 的 ! 与“未登记引用”分组头 +
    trailing（冲突/创建定义）完全重复——删除三者均不损失对象识别。
    保留面抽样：氛围色样 `AmbienceTab.tsx:449-459`——leading 是按行真实渲染的
    `backgroundColor: toHex(ambience.tint)` 色块（选中行显示 live previewTint），是帮助识别的
    真实媒体，机械删除会损失 day/night/warm 的一眼区分。
  - design: **agree（2026-08-27，附 K-I1-K-I2）**：
    - **K-I1（删除判据形式化）**：常量、与分组/状态文字重复、或仅起装饰作用的 leading 一律删除；
      判据机检化为 adoption reason 文本（“行内不变 / 与 group header 重复 / 与 trailing 状态重复”），
      便于 registry 复审时逐条复核而非重读截图。
    - **K-I2（保留边界）**：真实媒体（头像/fallback、色样、播放语义、缩略图、物品图标）不动；
      `ImageAssetPicker.tsx:118` 的物品缺图空白 fallback 按卡面登记为独立待裁决缺陷，本增量
      不借机删除真实 item 媒体槽、不发明替代资产。
  - 可证伪观察：若任一删除面的符号按行变化或承载唯一状态（如某列表的 glyph 是唯一 kind 指示且
    无 group header / trailing 对应），删除即丢信息、该面应转保留——抽查的 VarsTab 两类符号均有
    分组头与 trailing 完全覆盖，敌队/场景根为全行常量，氛围色样为真实媒体；若入口行 WIP 的选中
    底色贯穿使排序手柄/移动动作失去独立 hit target 或边框，则与 reorder 卡 KR2 合同冲突须停线——
    卡面已明确移动按钮保持独立 hit target 与边框。
- GLM：
  - premise: **verified（2026-08-27，本席 7/7 删除面 + 2 保留面一手直读 + registry 全量复核，非代理）**：
    1. **7 个删除面逐一实锤（全部固定 aria-hidden 类型符号，无一区分具体对象）**：
       场景根 `🗺️`（App.tsx:2231——单根行纯装饰）；敌队 `⚔`（EnemyTeamTab.tsx:271——全行同 glyph）；
       已登记变量 `⚑/№`（VarsTab.tsx:272——kind 已由分组头“开关/数值”表达 :330-331）；未登记变量
       `!`（VarsTab.tsx:339——自有“未登记引用”分组头 :336 + trailing 冲突/创建定义 :341-342 双重
       重复）；战斗精灵 `▦`（BattleSpriteLibrary.tsx:1219）；过场 `▶/▦`（CutsceneTab.tsx:205——
       video/animation kind 已由“视频/帧动画”两个 AssetList 分组表达 :683-694）；大世界精灵 `▦`
       （WorldSpriteLibrary.tsx:585——待定义态已在 trailing DsTag）。删除均不损失对象区分。
    2. **5 类保留面 registry 算术精确闭合**：catalog-row-content-adoption.json 当前 `leading=present`
       恰 12 条 = 7 删除 + 5 保留（actor/ambience/audio/image/item），无一错分。保留面抽验：
       Item 真实图标（ItemTab.tsx:479-487——`ImageAssetThumbnail(candidate.icon)` 带 sha256
       revision，逐对象真实媒体）；Actor 真实头像（ActorMode.tsx:463-468 `ActorAvatar` →
       :126-146 真实 face 缩略图 + 已裁决 fallback 类——MIG-PAL-ACTOR-FACE-1 bounded-exception
       合同完好，非机械删除对象）。
    3. **本席 2026-08-25 旧签中 `EnemyTeam ⚔` 的“合规”结论按规则降为历史**——用户 2026-08-27
       裁决以选择价值为唯一判据后，固定装饰 glyph 不再因“同族一致”而合格；本席复核无异议。
  - design: **agree（2026-08-27，附 GC-R1/GC-R2 必落钉）**：
    - **GC-R1（fingerprint/leading/reason 三方同步由门禁强制）**：删除 7 处 leading 会改变其 JSX
      调用点——catalog gate（catalog-row-content-adoption.test.ts:221-249）由生产 JSX 重算
      identity 并双向精确匹配，**不同步 registry 即门禁红**，反之亦然；实施时 7 条 entry 的
      `leading` 翻 `none`、fingerprint 刷新、reason 改引 2026-08-27 用户裁决；KC2 的同族
      `data-leading` 一致性断言在翻转后必须复绿。
    - **GC-R2（保留面不得机械波及）**：5 类保留 entry 不动；Actor face 缺失 fallback 保留其
      bounded-exception 理由；`ImageAssetPicker.tsx:118` 的 item 缺图空白 fallback 只登记为
      独立待裁决缺陷，本增量不借机删除真实 item 媒体槽或发明新资产。
  - 可证伪观察：①若任一被删 glyph 是某区分的唯一载体（如某 family 无分组头且 kind 只在 glyph 中）
    ——已逐一验证相反（分组/trailing 均在位）；②若删除后用户在同名对象间失去区分且该 family 无
    meta/媒体可用——当前 7 family 均有 title+meta，glyph 本就不区分对象；③若保留面中任一实为
    固定装饰（无逐对象差异）——Item/Actor 抽验证实为真实资产缩略图，其余三类以 Codex 锚点 +
    registry reason 存证，实施时 GC-R1 的 slot-presence 断言会捕获回退。
- counter / 分歧处理：N/A（GLM 与 Codex 结论一致）。
- build 准入结论：**allowed（2026-08-27，Codex + Kimi（K-I1-K-I2）+ GLM（GC-R1-GC-R2）三签齐）。
  入口行 WIP 与 7 个删除面可按冻结分类实施；真实媒体与 `ImageAssetPicker.tsx:118` 独立缺陷不在
  本增量内。**

### 历史：2026-08-25 进入 build 前设计签字（因 2026-08-27 核心分类刷新而失效）

- Codex：
  - premise: **verified（2026-08-25）**。共享 recipe 明确四槽与可选 `leading`（`recipes.tsx:101-143`）；
    BattleField/Item/Poison 三个真实绑定分别证明错位、过载与正向基线（上述代码锚点）。
  - design: **agree（2026-08-25）**。先做全量消费矩阵，再只修改违反“真实媒体/名称/ID/关键分类或异常”
    合同的页面；不改公共 API 或业务真值。
- Kimi：
  - premise: **verified（2026-08-25，独立全量抽查，非代理）**。四槽合同直读：`recipes.tsx:101-143`
    （leading/title/meta/trailing + `data-leading` 标记）；三个被点名页属实——BattleFieldTab.tsx:260-273
    把 `#006` 放入 leading 且 meta 缺省（ID 冒充媒体）、ItemTab.tsx:1151-1175 meta 拼接
    `id · 能力 · 引用 N · 待迁移`（常驻过载）、PoisonTab.tsx:395-402 名称/ID/可解度正确分槽
    （正向基线）。**本人另完成全部 24 个生产消费点枚举**（grep DsCatalogRow 全列表）并抽查未被
    截图点名的列表：ActorMode.tsx:416-433（真实头像 leading + 名称 + id meta + 可入队/NPC 分类
    trailing——健康）、SkillTab.tsx:1060-1069（名称+id，无媒体无 trailing——健康）、
    WorldSpriteLibrary.tsx:715-721（名称+id+布局分类——健康）；未发现第四处 ID 冒充媒体。
  - design: **agree（2026-08-25，附 KC1-KC2，不阻塞准入）**：
    - **KC1（采用矩阵必须覆盖全部消费点并逐条裁决）**：本人枚举的 24 处消费点全部入矩阵；
      其中两处需在矩阵中显式裁决并写明理由——AudioAssetWorkbench 目录行的引用数 trailing
      （AudioAssetWorkbench.tsx:578-595 区域，属“普通统计常驻”候选，要么证明选择价值要么删），
      ActorMode 无 face 角色的 🧑/👤 emoji fallback（属 MIG-PAL-ACTOR-FACE-1 已裁决合同，建议
      保留但登记为“有选择价值的语义媒体”例外并写清边界）。
    - **KC2（同族媒体策略一致性机检）**：DS-C.4b 的“同族不得有的有媒体有的没有”应落为测试
      断言——按列表族断言 `data-leading` 一致（全有或全无），BattleField 改后其族应全族
      `data-leading='none'`。
- GLM：
  - premise: **verified（2026-08-25，本人全消费面 census + 三点名页实锤 + 未点名抽查，非代理）**：
    1. **全消费面 census（本人 node 扫描 21 个生产文件）**：`DsCatalogRow` 消费面恰 21
       文件（含 BattleSprite 3 行/WorldSprite 4 行/Vars 2 行/ProjectWorkbench 2 行的
       多行用法）——卡文锚点只列 6 个文件，**矩阵生成器的输入域必须以本 census 为准**
       （21 文件清单已留档于本节）。
    2. **三点名页实锤**：BattleField:260 `leading=<span class="bf-catalog-id">#
       {id.padStart(3,'0')}</span>`——**技术 ID 冒充媒体槽**属实；ItemTab:1151 起
       `meta={[id, ...tags, refs?`引用 ${refs}`, pending?'待迁移'].join(' · ')}`——
       **能力标签 + 引用数 + 迁移态全部拼进一串 meta**（卡文过载描述属实，且 Item 无
       trailing——`待迁移` 异常也混在 meta）；PoisonTab:395 无 leading、meta=id、
       trailing=可解度 DsTag——**正向基线**逐字属实。
    3. **未点名抽查 4 面（防机械删除有选择价值信息）**：EnemyTeamTab `leading=⚔ +
       meta="N 名成员 · N 语义槽"`（符号有选择价值、成员数是选择关键——**不违反合同，
       矩阵应判合规**）；SkillTab `title=name, meta=id, 无 leading`（已合规）；ActorMode
       `leading=ActorAvatar + meta=id + trailing=可入队/NPC DsTag`（真实媒体 + 关键
       分类——已合规）。**结论：规则不会机械删信息——现有未点名面大多已合规，违规
       集中在点名三页，卡文"同类语义错位一次性收口"的方向正确但实际违规面可能比
       预期小**（矩阵生成是必要的确认手段而非预设大规模改写）。
  - design: **agree（2026-08-25，附 GRow1-GRow2，不阻塞准入）**：
    - **GRow1（矩阵以 21 文件 census 为输入域）**：采用矩阵生成器必须消费本人留档的
      21 文件全集（或以 rg `DsCatalogRow` 动态派生 + adoption.test 断言闭合），不能只
      审卡文锚点列出的 6 文件；每文件输出合规/违规/合理例外 + 理由，违规面为空时允许
      矩阵全绿（不制造工作）。
    - **GRow2（Item 的 `待迁移` 必须移入 trailing 且保 DsTag 形态）**：Item 现状把
      异常态（待迁移）与普通信息（tags/引用数）混在同一 meta join——收口时**待迁移**
      必须单独成为 trailing 的 DsTag（与 Poison 可解度同形态），不能只是从 join 里
      删掉；`引用 N` 从目录行移除后"有引用筛选"与 Inspector 计数必须保真（卡文测试
      条款已含，本钉强调 DsTag 形态一致性）。
  - 独立反证审查（至少一位非 Coding Owner 必填）：
    - 审查者：GLM（2026-08-25，见上）。
    - 独立证据锚点：BattleFieldTab:260-273 / ItemTab:1151-1175 / PoisonTab:395-403 /
      EnemyTeamTab（第一行）/ SkillTab:1060 / ActorMode:416-433 / 21 文件 census。
    - 可证伪观察：①若矩阵生成器漏扫 21 文件中任何一个（如 SpriteActionEditor/
      VarsTab 的多行用法），GRow1 闭合断言红；②若 Item 收口后"待迁移"消失而非移入
      trailing（异常信息丢失），GRow2 拦截；③若某未点名面因矩阵误判被迫删掉有选择
      价值的 leading（如 EnemyTeam 的⚔），本人抽查的 4 面合规结论即被推翻——矩阵
      必须允许"合规"判定而非全部改写。
- counter / 分歧处理：N/A。
- 缺签豁免：N/A。
- build 准入结论：**allowed（2026-08-25，Codex + Kimi（KC1-KC2）+ GLM（GRow1-GRow2）三签齐）。**

### 历史：2026-08-27 无意义 leading 增量进入 done 前审查签字（当前 candidate 已失效）

- Codex: **accept（2026-08-27，当前 candidate）**。入口、场景根、战斗精灵、过场、敌队、Vars 两面和
  大世界精灵共 8 个装饰 leading 已删除；adoption registry 对 8 个调用同步刷新 fingerprint / `leading=none` /
  选择价值 reason，静态负断言防止 🧭/🚪/🗺️/⚔/⚑/№/!/▦ 回流。registry 当前 `leading=present` 精确闭合为
  5 类真实媒体：actor / ambience / audio / image / item；`ImageAssetPicker.tsx:118` 缺图 fallback 未改。
  入口选中表面同时贯穿排序手柄、正文和动作区，移动按钮仍为独立 hit target 与有边框 secondary surface；
  用户验收返工后，组合表面尾部使用 `--ds-space-2`（4px）inset，最右按钮不再贴边并为 focus outline 留足空间。
  聚焦 **8 files / 104 tests passed**，`typecheck`、`git diff --check` 通过。真实 PAL 1280px：入口 item/surface
  均为 68px、选中背景同为 `rgb(45,56,82)`；返工后动作区 x=287..349、item 右边界 x=353，左右 inset
  均为 4px 且按钮边框保持；过场 18 行全部
  `data-leading=none`、68px、标题 x=12，对应“视频/帧动画”分组清晰，页面无水平溢出、console 0 error/warn。
- Kimi: accept（2026-08-28，只读终审 commit c5cd0f83，独立直读 registry/生产面/CSS/门禁 + 聚焦复跑，
  非代理）：
  - **8 个装饰 leading 删除闭合 ✓**：registry 复算——`leading=present` 恰 5 条
    （actor/ambience/audio/image/item），8 个删除面全部翻 `none`；本人复跑
    `catalog-row-content-adoption.test.ts` + `boundary.test.ts` + ProjectWorkbenchTab/VarsTab/
    EnemyTeamTab/CutsceneTab 共 6 文件 103/103 通过，gate 按当前生产 JSX 重算 fingerprint 双向
    精确匹配。残留 glyph 仅见于 `DsObjectHero media` 详情头（GLM 已登记为相邻观察项，不属本卡
    DsCatalogRow 目录域）。
  - **5 类真实媒体保留 ✓**：真实头像/fallback、氛围色样、音频播放语义、图片缩略图、物品图标均未动；
    `ImageAssetPicker.tsx:118` 缺图 fallback 未改（K-I2 边界保持）。
  - **fingerprint/leading/reason 三方闭合 ✓**：8 条删除 entry 的 fingerprint 已刷新、reason 改引
    2026-08-27 用户裁决；KC2 同族 `data-leading` 一致性断言在翻转后复绿（adoption 测试通过）。
  - **入口动作区 4px inset ✓**：`editor.css:1688-1693` `.project-entry-item-content
    { padding-inline-end: var(--ds-space-2) }`（space-2 = 4px，与手柄左侧 4px 对称），选中背景覆盖
    padding、focus outline 不裁切；静态 gate 逐字钉住该规则。
  - 公共边界 ✓：`DsCatalogRow` props/行高/滚动/筛选/引用真值未变；reorder 公共 API 未被本卡触碰。
- GLM: **accept（2026-08-28，只读终审 commit c5cd0f83，本人一手直读 + registry 复算 + 独立复跑）**：
  1. **8 个装饰 leading 删除闭合** ✓：本席 grep 八个表面（入口/场景根/战斗精灵/过场/敌队/Vars×2/
     大世界精灵）的 `🗺️/⚔/⚑/№/!/▦/▶` 目录 leading——全部无残留；负断言钉死回流（如 gate
     `not.toContain("definition.kind === 'flag' ? '⚑' : '№'")`、`not.toContain('leading={...!...}')`、
     入口 `🧭/🚪`）。残留两处 `⚔`/`⚑/№` 在 `DsObjectHero media`（EnemyTeamTab:316、VarsTab:411，
     已选对象的详情头）——**不属本卡 DsCatalogRow 目录域**，登记为相邻后续观察项而非 counter。
  2. **5 类真实媒体保留** ✓：registry `leading=present` 恰 [actor/ambience/audio/image/item]，
     本席复算闭合；`ImageAssetPicker.tsx:118` 缺图 fallback 未改（GC-R2 保持）。
  3. **fingerprint/leading/reason 与生产 JSX 闭合** ✓：8 个被删表面全部 `leading=none` 且
     fingerprint 已刷新——gate 由生产 JSX 重算 identity 双向精确匹配（catalog-row-content-
     adoption.test.ts:221-249），本席独立复跑该 gate + CutsceneTab + EnemyTeamTab 聚焦 →
     **12/12 passed**；Codex 8 files / 104 tests 证据与静态合同一致。
  4. **入口动作区 4px inset** ✓：`editor.css:1688-1693` `.project-entry-item-content
     { padding-inline-end: var(--ds-space-2) }` + 选中背景覆盖 padding（`:has([data-selected])`
     规则）；静态 gate **逐字钉住该规则文本**（test :292-298）——与手柄左 4px 对称、focus outline
     不裁切的 Codex 实测（右 inset 4px、动作区 x=287..349、item 边界 353）一致。
  - 无返工项。相邻观察（非本卡范围）：详情头 hero media 的同类装饰 glyph 可在后续按同一用户
    裁决统一收口。未修改实现文件，未代签 Kimi。
- counter / 返工处理：N/A。
- 缺签豁免：N/A。
- done 准入结论：blocked——Codex + Kimi + GLM 三方 accept 已齐；按流程待用户最终验收后收口，任何 Agent 不得自行标记 done。

### 历史：2026-08-26 进入 done 前审查签字（因 2026-08-27 核心分类刷新而失效）

- Codex: **历史 accept（2026-08-26；因 2026-08-27 用户刷新 leading 分类而失效）**。当前生产域动态闭合为 20 文件 / 28 个 `DsCatalogRow` 调用；11 个违规 surface 已按四槽合同收口，17 个健康面或有证据例外未机械改写。受影响页聚焦测试、内容矩阵门禁、typecheck、DS gate、`git diff --check` 与 1280/720px 浏览器检查均通过。
- Kimi: pending
- GLM: pending
- counter / 返工处理：
- 缺签豁免：N/A
- done 准入结论：blocked

## Draft: 设计与风险

### 设计结论

- 结构合同不变：继续消费 `DsCatalogRow`，本卡治理的是业务内容到四个槽位的映射。
- 默认内容预算为“真实媒体（如有）+ 名称 + 稳定 ID”；关键分类或异常可以进入 `trailing`，普通统计不常驻。
- “是否有媒体”按列表族统一判断；没有真实媒体就整体省略 `leading`，而不是制造占位内容。
- 关系与详细状态优先由筛选器、Hero、Inspector 或异常诊断表达；目录只承担发现、识别和选择。

### 已知风险

- 风险：极简化可能隐藏多能力对象的差异。
- 缓解：全量矩阵逐项记录选择任务；若真实用户必须扫读某分类，使用紧凑 `trailing`，不得重新塞回 ID 文本串。
- 风险：只修三张截图会继续留下同类漂移。
- 缓解：验收以真实生产消费集合闭合，矩阵变化需同步门禁或文档证据。

### 主审立场

- Reviewer：Kimi（信息架构）+ GLM（全量消费覆盖）。
- 结论：Kimi agree（2026-08-25，KC1-KC2）+ GLM agree（2026-08-25，GRow1-GRow2）；Codex 已 agree。
- 必改项：无新增；KC1-KC2 与 GRow1-GRow2 为 build 必落钉（矩阵输入域以 21 文件全量 census 为准、
  音频引用数 trailing 与 ActorMode emoji fallback 逐条裁决、同族 data-leading 一致性机检、Item 待迁移
  移入 trailing DsTag）。
- 是否建议进入 build：是（三签齐）。

## Build: 实现与自测

- Coding Owner：Codex
- 修改文件：
  - 生产：`BattleFieldTab.tsx`、`ItemTab.tsx`、`BattleSpriteLibrary.tsx`、`WorldSpriteLibrary.tsx`、
    `AudioAssetWorkbench.tsx`、`EnemyTab.tsx`、`EnemyBattleSpriteThumbnail.tsx`、`MapMode.tsx`、
    `CutsceneTab.tsx`、`ProjectWorkbenchTab.tsx`、
    `SharedScriptTab.tsx`、`SpriteActionEditor.tsx`、`editor.css`。
  - 测试 / 门禁：上述代表页面测试、`design-system/catalog-row-content-adoption.json`、
    `EnemyBattleSpriteThumbnail.test.tsx`、`design-system/catalog-row-content-adoption.test.ts`、
    `design-system/adoption.test.ts`、`design-system/boundary.test.ts`。
  - 文档：`docs/phase2/editor/editor-design-system-v1.md`、本卡与看板。
- 实现摘要：
  - 2026-08-29 顶部摘要区（`DsObjectHero`）媒体闭包：Enemy 顶部摘要区复用目录同一个
    `EnemyBattleSpriteThumbnailCache` 与真实 `idle.start`，并以 `placement="hero"` 提供 56×56 呈现；
    EnemyTeam 与 Vars 删除重复类型文字的固定 glyph，`data-has-media=false` 时不留空槽。生产摘要媒体 census
    双向锁定 Enemy / Actor / Item / Ambience 四个真实媒体面与 EnemyTeam / Vars 两个无媒体面，raw emoji/string、
    alias、namespace 与 spread 绕过均 fail-closed。
  - 2026-08-29 最终返工把 adoption v3 从“能解析 owner”收紧为“对每个 routed DOM/class/media 状态都证明
    实际级联合同”：动态 class / spread、静态数组 occurrence、互斥分支、递归、legacy page status、根级
    element identity、CSS specificity / `!important` / shorthand-longhand / inline style、class variant 上限、媒体条件
    蕴含/重叠/query-list OR、横纵轴与有限边界均有 fail-closed 反例。响应式 owner 必须显式登记
    `condition: default` 或精确 CSS at-rule；伤亡工作台的宽/窄 owner 由同一通用合同验证，不加业务 hardcode。
  - 短窗口复核发现物品图标选择层被中央卡片 stacking context 困住；已改为 canonical `DsDialog` top layer。
    对话框 body 不滚，候选 grid 是唯一 `overflow-y:auto` owner，并锁定 `overscroll-behavior:contain`；registry
    改为 `overlay.icon-browser.options`。audit 仅在 routed canonical `DsDialog` 祖先存在时切断 DOM scroll nesting，
    local shadow / 普通 div 不能伪造 top-layer 例外。
  - 2026-08-28 Shop scroll owner / adoption truth 返工：新增非虚拟 `DsCatalogWorkspace`，七个同构页面
    Ambience / SharedScript / Item / Shop / Skill / Enemy / Poison 的固定 header 与唯一 catalog viewport 由同一
    recipe 持有；Item / Skill / Enemy / Poison / Shop 中央列同步改用真实 `DsObjectWorkspace`，七页新 owner
    不再以 raw class 冒充采用。编辑器根从 `overflow:hidden` 收紧为 `overflow:clip`，避免 focus 把根节点程序
    滚动后连固定目录标题一起推出视口。
  - adoption registry 升至 v3：25 个真实可达页面的 catalog / scroll owner 全部结构化登记，并以 route-derived
    callsite 正向可达 + live owner 反向登记闭合；prose owner、死 helper、伪 marker 与未登记 owner 均 fail-closed。
    七页外仅保留 6 文件 / 22 个精确 raw workspace selector，逐项绑定命中次数、registry、验证、移除条件与已上
    看板的 `ED-WORKSPACE-ADOPTION-DEBT-1`；任何新增、计数漂移或假 adopted 状态都会使 gate 失败。
  - done 前反证返工把 v3 从“有记录”收紧到“记录等于真实 DOM/CSS”：同一 canonical JSX 值重复渲染会按
    occurrence 分开计数，catalog / scroll 角色分别反向闭合；`custom` 必须绑定 live intrinsic / `DsInspectorHost`
    且 scroll 有真实 CSS overflow，`N/A` 只能绑定非 governed intrinsic 且 axis 为 none；`DsInspectorTabs` 纳入
    governed scroll owner，全 25 页 Inspector 真值已登记。legacy exception 改为 `exceptionId × registry` 精确
    双向反链，静态拼接、静态 object spread 与无法解析的 intrinsic JSX spread 均不可绕过 reserved marker 扫描。
    为使 fail-closed 不误伤合法画布，Ambience 的四个 pointer handler 与 IsometricEditorCanvas 的有限真实属性
    改为显式转发；BattleField 右侧引用面板补回唯一 `overflow-y:auto` owner。
  - 设计系统规范升至 v2.16.0，明确目录 viewport、中央 workspace、结构化 registry、bounded legacy exception
    和短窗口唯一 scroll owner 合同；index / token / boundary 三向版本一致。
  - 2026-08-28 稳定身份落槽增量：EnemyTeam 由成员构成派生可读 title、精确 team.id 回归 meta；Shop
    由真实货单派生 title、精确数值 id 回归 meta。五个资源目录通过共享 AssetKind formatter 处理合法无 label，
    不再回退 AssetId 到 title；场景根与未登记变量诊断保持有边界例外。Registry v3 把身份位置与摘要类型变成
    全 28 surface 必填 enum，并锁定原始 key / select / onClick 消费及伪 `.pal.` 展示别名负门禁。
  - 2026-08-28 合并增量：music / sound 共用的静态 play `leading` 已删除，中央 transport 与引用数不动；
    Enemy 行新增真实 `idle.start` 单帧缩略图。缩略图以 IntersectionObserver 懒加载，固定 36×36、等比底部
    居中且关闭平滑；缓存按 `projectId + definition/AssetId + revision + idle.start/profile` 失效，容量 64，
    共享并发 Promise、失败驱逐、资源上下文切换 / 卸载清理，异步迟到不会覆盖当前对象。
  - 长列表继续由既有 `.outliner` 持有唯一滚动；Enemy 行只增加 `content-visibility:auto` 与既有 68px
    intrinsic size，没有引入会改变滚动 / focus 合同的第二层虚拟列表。Registry 与规范最终只保留
    actor / ambience / enemy / image / item 五类真实媒体。
  - 用户验收发现入口最右移动按钮贴边后，组合表面增加 `box-sizing:border-box` 与
    `padding-inline-end:var(--ds-space-2)`；右侧 4px 与手柄左侧 4px 对称，选中背景继续覆盖 padding。
  - 2026-08-27 增量删除 8 个无选择价值的 fixed glyph leading：入口 🧭/🚪、场景根 🗺️、战斗/大世界精灵 ▦、
    过场 ▶/▦、敌队 ⚔、Vars ⚑/№/!；保留 5 类真实媒体不动。入口组合行由父级选中表面补齐动作区背景，
    不改变 `DsCatalogRow` 或 reorder 公共 API。
  - 递归扫描当前生产 TSX，按相对文件 + 规范化 opening-element fingerprint 动态闭合 20 文件 / 28 调用；
    16 项合规、12 项有证据 bounded exception。测试保证新增/删除/移动/表达式漂移必须同步裁决，按 family
    锁定 leading 策略，并拒绝 alias、spread 与排序/拖拽属性绕过 owner。
  - 共收口 11 个违规 surface：战场 ID 回归 meta；物品仅保留真实图标/名称/ID/迁移异常；精灵资源、敌人、
    地图、过场、项目入口、共享脚本与动作选择去除重复机器信息或临时 index；毒目录保持无伪图标正向基线。
    战斗/大世界精灵资源的空白 label 统一 trim 后回退 AssetId，避免目录出现空标题。
    过场与项目入口的 leading 符号标记为装饰，防止重复进入按钮可访问名称。
  - `DsCatalogRow` 公共 props、行高、选择/focus、滚动 owner、筛选与引用真值均未改变；拖拽合同仍归
    `ED-REORDER-DRAG-1`，静态门禁禁止把 reorder props 塞入本 recipe。
  - 同步修正 Startup 新增第 5 个合法 `DsRepeatRow` 后遗留的静态边界计数；这是全量测试提前暴露的既有门禁缺口。
- 运行命令：
  - 2026-08-29 顶部摘要区媒体闭包聚焦：`EnemyBattleSpriteThumbnail`、`EnemyTab`、`EnemyTeamTab`、`VarsTab`、
    catalog adoption 共 **5 files / 29 tests passed**；同 key 的目录/摘要只 load+bake 一次，56×56 摘要尺寸、
    无媒体 DOM、glyph 删除与六面 census 均有断言。
  - 2026-08-29 当前候选最终聚焦：完整 `design-system/adoption.test.ts` **20/20 passed**；完整
    `ItemTab.test.tsx` **16/16 passed**；覆盖 Shop / 全 25 页 owner 真值、CSS cascade/media/class variant
    反例、响应式 owner 切换、canonical dialog top-layer、modal scroll lock / cancel / 焦点归还和图标绑定。
  - `pnpm --filter @type-pal/editor typecheck` passed；`audit:design-system` **88 files / 2 evidence-bound
    exceptions，passed**；`git diff --check` passed。此前已按卡面仅跑过一次 editor 全量，本次返工不重复整包。
  - 2026-08-28 Shop scroll / adoption v3 聚焦：`adoption.test.ts + recipes.test.tsx + boundary.test.ts`
    **3 files / 97 tests passed**；七个接入页与 catalog content adoption **8 files / 71 tests passed**。
  - 2026-08-28 done 前反证闭合：新增 occurrence 重复渲染、governed/custom/N/A 伪装、Inspector 漏登记、
    legacy pair 漂移、字符串拼接、static/unknown JSX spread 红例；新增红例聚焦 **4/4 passed**，完整
    `adoption.test.ts` **19/19 passed**。AmbienceScenePreview / MapMode / BattleField / boundary 受影响聚焦
    **4 files / 123 tests passed**；`pnpm --filter @type-pal/editor typecheck` passed；
    `audit:design-system` **88 files / 2 evidence-bound exceptions，passed**；`git diff --check` passed。
  - BattleField 900×400 浏览器实测：`.bf-reference-panel` `clientHeight=333 / scrollHeight=472 /
    overflowY=auto`；滚轮后 `scrollTop=138.5 / max=139`，末条引用 bottom=356 小于 panel bottom=374，
    `body/document scrollTop` 始终为 0，console error/warning 为 0；临时 viewport 已 reset。
  - `pnpm run typecheck`：passed；`pnpm run audit:design-system`：**88 files / 2 evidence-bound exceptions，passed**；
    `git diff --check`：passed。v2.16.0 三向同步后单跑 `boundary.test.ts`：**1 file / 48 tests passed**。
  - 按纪律只执行一次当前最终 `pnpm test`：**165/167 files、1351/1354 tests passed**。3 项失败均为并发下
    5s/15s timeout：本卡 `adoption.test.ts` 的 dead-helper 反例，以及 `field-layout-adoption.test.ts` 两项；
    本卡 adoption 聚焦运行已 17/17 通过，另外两项属于 `ED-FIELD-LAYOUT-1`，没有功能断言失败，未重复整包。
  - 2026-08-28 稳定身份增量聚焦：asset diagnostics、EnemyTeam、Shop、Skill、Enemy、Audio、Cutscene、Image、
    BattleSprite、WorldSprite 与 catalog adoption 共 **11 files / 77 tests passed**；覆盖重复 / 混合 / 空 / 缺失
    派生标题、Shop 空单多缺、五资源缺 label、真实 ID 值与 28 surface v3 政策。
  - `pnpm --filter @type-pal/editor typecheck`：passed；`audit:design-system`：**88 files / 2 evidence-bound
    exceptions，passed**；`git diff --check`：passed。
  - 2026-08-28 合并增量聚焦：`EnemyBattleSpriteThumbnail`、`EnemyTab`、`AudioAssetWorkbench`、catalog adoption
    共 **4 files / 18 tests passed**；覆盖懒加载、`idle.start`、单帧 bake、缓存合并 / revision / LRU / clear、
    异步防串图、music + sound 双负断言、Enemy 全族正断言与 registry 精确五类。
  - `pnpm --filter @type-pal/editor typecheck`：passed；`git diff --check`：passed。
  - 新生产 TSX 使 DS audit census 从 87 增至 88；更新精确计数并为真实约 7s 的子进程 gate 设置 15s
    局部 timeout 后，目标 gate **1 passed / 13 skipped**。
  - 按纪律只执行一次 `pnpm --filter @type-pal/editor test`：**152/167 files、1316/1343 tests passed**；
    27 个失败中 26 个是高并发下与本卡及相邻页面分散出现的 5s/15s/60s timeout，唯一非 timeout 为上述
    87 -> 88 census，已修复并聚焦复绿；本卡 18 项聚焦与浏览器证据均稳定，未重复跑第二次全量。
  - 2026-08-28 在 `ED-FIELD-LAYOUT-1` 提交 `d0a42191` 之上恢复候选后做聚焦集成复核：App reference
    navigation、Battle/World Sprite、Cutscene、EnemyTeam、Vars、ProjectWorkbench 与 catalog adoption
    **8 files / 105 tests passed**；`pnpm --filter @type-pal/editor typecheck` passed；未重复跑全量。
  - 入口尾部 inset 验收返工：ProjectWorkbench + catalog static contract **2 files / 44 tests passed**；
    `git diff --check` passed。
  - 2026-08-27 增量聚焦：App reference navigation、Battle/World Sprite、Cutscene、EnemyTeam、Vars、
    ProjectWorkbench 与 catalog adoption 共 **8 files / 104 tests passed**。
  - 2026-08-27 `pnpm --filter @type-pal/editor typecheck`：passed；`git diff --check`：passed。
  - 受影响页聚焦：13 文件 / 186 tests passed。
  - `pnpm --filter @type-pal/editor exec vitest run src/ui/design-system/boundary.test.ts src/ui/design-system/catalog-row-content-adoption.test.ts`：2 文件 / 47 tests passed。
  - `pnpm --filter @type-pal/editor typecheck`：passed。
  - `pnpm --filter @type-pal/editor audit:design-system`：87 files / 3 evidence-bound exceptions，passed。
  - `git diff --check`：passed。
  - 备注：一次聚焦命令参数被包脚本吞掉而意外执行全量，先得到 1216/1217（只红旧 `DsRepeatRow=4` 计数）；
    修正为 5 后已用边界聚焦测试闭合。按既定纪律不在本切片重复全量，待三张 editor 卡完成后只跑一次最终全量。
- 浏览器 / 手工检查：
  - 2026-08-29 PAL 1280×720：Enemy 史莱姆与灯笼切换后，目录为 36×36、顶部摘要区为 56×56，均显示各自真实
    待机首帧且无固定 emoji；摘要媒体壳为 64×64、页面无横向溢出。EnemyTeam 为
    `data-has-media=false`、无媒体节点/剑形 glyph，正文自然左移且无横向溢出。
  - 2026-08-29 PAL 900×400：Shop catalog `clientHeight=293 / scrollHeight=1444`，滚到
    `scrollTop=1151/1151` 后末项完整可见，标题 top=48.5 保持不动，root/document `scrollTop=0`。
    Item 图标对话框改用 top layer 后 rect=`140,16 → 760,384`，900×400 内完整；grid
    `clientHeight=242 / scrollHeight=4543 / overflowX=hidden / overflowY=auto / overscroll=contain`，初始焦点在
    搜索框，body scroll lock 为 hidden；点击显式关闭后对话框关闭、焦点回“选择已有图标”、body scroll 恢复。
    追加 480×320 极窄窗口复核：dialog rect=`16,16 → 464,304`，grid `162/6937` 仍可滚、无横向滚动；
    关闭链与归焦相同。临时 viewport 已 reset。
  - 2026-08-28 PAL 900×400：Ambience / SharedScript / Item / Shop / Skill / Enemy / Poison 七页逐页检查；溢出页
    恰一个 `[data-ds-scroll-owner="catalog"]`，滚轮、PageDown 与 focus 均只改变 viewport `scrollTop`，末项可达且
    2px focus outline 可见，标题 rect 不动，scope 祖先无第二个纵向 owner。Shop 21 家无需虚拟列表。
  - Enemy 末项 focus 曾暴露 `.editor { overflow:hidden }` 可程序滚动（root `scrollTop=140`、标题 top 41→-99）；
    改为 `overflow:clip` 后同一流程 viewport `scrollTop=10158`、root `scrollTop=0`、标题 top 恒 41。900×400
    Shop 末项截图人工确认固定标题、列表滚动、中央与 inspector 均无裁切。
  - 2026-08-28 稳定身份增量：PAL 默认宽度 EnemyTeam 380 行、Shop 21 行均为 68px，首行成员 / 货单可读摘要、
    第二行精确 ID；720×900 下目录宽 214px、长 title 单行 ellipsis、document 无横向 overflow。点击敌队派生标题
    后 Hero / objectId / selected meta 均保持原始 `team-5`；临时 viewport reset，console 0 error/warning。
  - 2026-08-28 PAL 默认宽度：Enemy 153 行均 `data-leading=present`，前 12 行与滚动后的后续行固定
    68px / canvas 36×36；史莱姆、灯笼、黑毛球、烂香菇及后续敌人真实帧可辨，滚动后无串图。
    Music 86 行、Sound 363 行均 `data-leading=none` 且不存在 leading DOM，播放 / 停止中央按钮各 1 个。
  - 720×900：Enemy 与 Audio 行高仍 68px、Enemy 缩略图仍 36×36，`body.scrollWidth=clientWidth=720`；
    控制台 0 error/warn，临时 viewport 已 reset。
  - 入口尾部 inset 返工：PAL 1280px 实测 surface right=353、末按钮 right=349、右 inset=4px；handle left=4px，
    按钮 border `rgb(102,114,138)` 完整，选中背景连续，document overflow=0。
  - 2026-08-27 PAL 1280px：入口 item/surface 68px 且选中背景连续到动作区，两个移动按钮保留独立边框；
    过场 18 行 `data-leading=none` / 68px / title x=12，视频与帧动画分组仍清晰；两页均无水平溢出，console 0 error/warn。
  - PAL 真实项目 1280×900：BattleField `leading=none / #006 meta`、Item `leading=present / 61 meta / 无能力与引用串`、
    Poison `leading=none / 551 meta / 常规 trailing`；三族行高均 68px，文档无水平溢出。
  - 720×720：三族目录宽 214px、行高仍为 68px、选中态与四槽对齐稳定，`document.scrollWidth=clientWidth=720`；
    截图人工确认无正文横跳、截断或遮挡。临时视口已 reset。
- 跳过的检查及原因：未对全量的 26 个并发 timeout 再跑第二次整包；已用本卡聚焦测试、单独 DS gate、类型检查
  与默认 / 720px 浏览器覆盖当前改动，完整保留一次全量输出供 reviewer 判断。

### 历史：2026-08-28 Shop scroll owner / adoption truth candidate done 前反证返工

- Codex：**rework（2026-08-28）**。上一版 self-accept 已被独立反例推翻，保留为历史但不授权当前候选：
  1. 已知 shape 的 spread 仍可用运行时 `className` 注入 reserved class，显式动态 intrinsic `className` 同样未被拒绝；
  2. `.map/.flatMap` callback 固定只访问一次，导致 `[]` 假红、`[1,2]` 假绿；未知互斥三元复用同一 JSX 值被
     重复累计，递归 cycle 又被静默截断；
  3. legacy exception 已按 pair 反链，但相关 registry page 仍可继续登记 `status: adopted`，与任务卡和规范的
     `exception` 真值冲突。
- Kimi：**counter（2026-08-28，独立 occurrence 反例）**。实测 `[]/[1]/[1,2].map` 输出相同，同一 owner 的未知
  三元两支被计两次，静态 depth 递归无论 1/3/10 均被截成两次；要求静态数组展开、动态 cardinality fail-closed、
  互斥路径按最大值聚合、递归 cycle fail-closed，并按数值 source order 稳定编号。
- GLM：**counter（2026-08-28，独立 registry 反例）**。6 个 legacy exception 组覆盖 8 个 registry page / 9 个
  pair，但相关 page 仍登记 `adopted`，且 audit 只验 status 枚举；要求 legacy-bound page 必为 `exception` 并由测试
  双向钉死。
- counter / 返工处理：Coding Owner Codex 正在红先行关闭三组反例；完成前不得转 review。
- done 准入结论：**blocked / rework**。

### 2026-08-29 Shop scroll owner / adoption truth v3 candidate 进入 done 前审查（当前）

- Codex：**accept（2026-08-29，当前 candidate）**。Kimi / GLM 的三组终审反例已以红先行关闭：
  dynamic intrinsic class/spread 不能注入保留 owner；静态 map occurrence、互斥分支、递归与 source order
  可证明且动态 cardinality fail-closed；legacy exception 与 page `status: exception` 双向闭合。额外压力测试又关闭
  root identity collision、真实 CSS cascade/inline/class variant、media overlap/query-list OR 与 condition/default
  响应式 owner 漏洞。Shop 900×400 唯一 catalog owner 与末项可达已实测；Item 浮层视觉反例已改用
  canonical `DsDialog` top layer，overlay registry、滚动隔离与焦点归还闭合。完整 adoption 20/20、Item 16/16、
  typecheck、DS gate、diff check 全绿。
- Kimi：**accept（2026-08-29，当前 candidate 只读终审，本人独立直读组件 / CSS / registry 复算 /
  grep 现状 + 聚焦复跑，未复用任何旧 accept）**:
  1. **DsCatalogWorkspace 合同 ✓(K-R1/K-R2)**:`recipes.tsx:185-212`——root
     `data-ds-scroll-scope="catalog"`、header slot 在 nav 外(标题固定)、内部
     `nav[data-ds-scroll-owner="catalog"][data-ds-scroll-axis="y"]` 唯一持有目录滚动;
     `recipes.css:979-997` root `flex-column+min-w/h:0+overflow:hidden`、viewport
     `min-w/h:0+flex:1 1 auto+overflow:auto+overscroll-behavior:contain+scrollbar-gutter:stable`,
     与设计冻结逐属性一致,且选择器带 data 属性门防伪造;root 对 `.outliner{overflow-y:auto}`
     的级联以 0-2-0 特异性胜出(overflow:hidden),无嵌套滚动。
  2. **七页接入与 K-R6(a) 落实 ✓**:Shop / Item / Skill / Enemy / Poison / Ambience /
     SharedScript 全部接入(本人 grep 七处 `<DsCatalogWorkspace`);**生产 raw
     `ds-object-workspace*` 现状精确只剩 6 文件**(EnemyTeamTab / BattleFieldTab /
     ProjectWorkbenchTab / BattleSpriteLibrary / VarsTab / SpriteResourceViewer)——
     Item / Skill / Enemy / Poison 中央 raw 已随本卡清零,ShopTab 无命中且 :153 已换真实
     `DsObjectWorkspace`。
  3. **adoption truth v3 ✓(K-R3/GC-W1,本人 node 复算)**:顶层 `catalogScrollOwners` 25 条
     全结构化({region, axis, owner, source, component, callsite, reason, verification},
     custom 附证据);`workspaceLegacyExceptions` 恰 6 条,selector+count 精确锁定与 grep 现状
     一一对应;pages 25 = 17 adopted + 8 exception(ProjectWorkbenchTab 骨架覆盖 4 个
     project/* 条目,6 文件 → 8 条目算术闭合);item/shop 为 adopted、scroll owner 真实。
  4. **debt 卡先行 ✓(GLM 条件 3)**:`ED-WORKSPACE-ADOPTION-DEBT-1` 已开卡(draft,6 文件
     清零范围明确,未签字不得实现),exception removalCondition 有 owner。
  5. **机检矩阵 ✓**:共享 `catalog-workspace-test-utils.ts` 断言唯一 owner / 祖先链无第二
     scroll owner / header 固定 / owner 无 tabindex;adoption.test 20/20 测试名直接对应
     reachability / cardinality fail-closed / CSS cascade+响应式 / legacy 双向闭合 /
     prose 假绿 / 伪造 marker 各反例。
  6. **复跑证据**:本人聚焦 10 文件(design-system 4 + 七页 6)**167/167 全绿**(38.7s,
     含 adoption 20/20 与 Codex 声明一致);Item 浮层 canonical DsDialog top-layer 修复由
     ItemTab 16/16 与 Codex 900×400 浏览器证据覆盖,符合功能性最小视觉验证分层。
  - 无返工项。GLM fresh accept 与用户最终验收前不得标记 done;收口提交注意本卡与
    MIG-PAL-MAP-NAME-1 已审文件同在工作树,只暂存各自清单。
- GLM：**accept（2026-08-29，针对当前 Shop scroll owner / adoption truth v3 candidate 的 fresh 只读终审，
  未复用任何旧 accept；本人一手直读组件/CSS/registry/门禁 + 独立复跑）**：
  1. **七页闭包与 sprite-list 清零（GC-W2）** ✓：生产 `sprite-list` 恰 **0 文件**；`DsCatalogWorkspace`
     消费恰七页（Item/Enemy/Skill/Shop/Poison/Ambience/SharedScript）。组件合同逐属性对上设计：
     root `flex-column + min-width/min-height:0 + overflow:hidden`（recipes.css:979-988）+
     固定 header slot + 内部 viewport `flex:1 1 auto + overflow:auto +
     overscroll-behavior:contain + scrollbar-gutter:stable`（:990-996）；携带
     `data-ds-scroll-scope/owner/axis` 三 marker 供机检（recipes.tsx:199-206）。
     Shop 真实 `DsObjectWorkspace`（ShopTab.tsx:153，原 class 借用已消除）。
  2. **adoption v3 truth + 本人冲突裁决四条件全落地** ✓：
     a. registry 重构为 `version + catalogScrollOwners(25 结构化条目) +
        workspaceLegacyExceptions(6) + pages(25)`——prose "A+B" owner 不再是真值；
     b. **例外集机检锁定**——6 文件逐条精确 `selectors[{selector,count}]` + verification
        “静态 AST 精确核对 selector 与次数，新增或漂移即红”；adoption.test.ts:30 断言恰 6 条；
     c. **exception 状态双向闭合**——status 分布 17 adopted + 8 exception；:34-38 断言
        legacy registries 成员 ⟺ `status:'exception'` 双向绑定，假绿原形态（adopted+prose）不可再现；
     d. **debt 卡先行**——`ED-WORKSPACE-ADOPTION-DEBT-1` 已上看板（draft），每条例外的
        removalCondition 显式引用该卡；本卡 done 门禁可引用其存在。
  3. **红先行证据链** ✓：卡内记录三类反例（dynamic intrinsic class/spread 注入保留 owner、
     动态 cardinality fail-closed、legacy/status 双向）+ 追加压力反例（root identity collision、
     CSS cascade/inline/class variant、media overlap/query-list OR、condition/default 响应式
     owner）均有可复现红测后转绿——GC-W1 “先对假绿形态红”的要求以更强形式满足。
  4. **短窗口与浮层反例** ✓：Codex PAL 900×400 实测 Shop catalog `clientHeight=293 /
     scrollHeight=1444` 唯一 owner + 末项可达；Item 浮层反例改用 canonical `DsDialog` top
     layer（overlay registry/滚动隔离/焦点归还可机检）——K-R1/R2/R4 矩阵闭合。
  5. **独立复跑**：`adoption.test.ts + boundary.test.ts + ShopTab.test.tsx + ItemTab.test.tsx`
     → **4 files / 90 tests 全绿**（本席独立执行）。
  - 无返工项。未修改实现文件，未代签 Kimi，未复用 2026-08-28 counter 前 accept。
- counter / 返工处理：当前 Codex 自验无 counter；任何 reviewer 若能使动态 owner、occurrence、legacy status、
  CSS/media/class variant、Shop 短高滚动或 canonical dialog top-layer 反例重新假绿，应签 counter 并附最小复现。
- done 准入结论：**blocked pending 用户最终验收**（Codex + Kimi + GLM 三方 fresh accept 已齐，均
  2026-08-29 当前 candidate）；任何 Agent 不得自行标记 done。

### 2026-08-29 顶部摘要区（`DsObjectHero`）媒体语义闭包返工重签（当前）

- 用户裁决：Enemy 详情头不得继续显示固定 `👹`，应与目录一致使用绑定战斗精灵的
  `BattleSpriteDef.profile.idle.start`；EnemyTeam 固定 `⚔` 没有识别价值，应删除。结合用户此前“没有意义的
  图标都删除”裁决，本增量同时对全部生产 `DsObjectHero.media` 做闭包分类，避免只修截图两处。
- 历史效力：上方 Shop scroll owner / adoption truth v3 的 Codex + Kimi + GLM fresh accept 仍作为历史事实
  保留，但未审本次 Hero 扩围，不再授权 done。

#### 前提真值门

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：原版没有二阶段编辑器 `DsObjectHero`。 | `docs/phase2/READ-FIRST.md:1-8` |
| 第一阶段 | N/A：第一阶段没有当前对象工作台与 Hero 媒体槽。 | `docs/phase2/READ-FIRST.md:32-37` |
| 当前二阶段 | Enemy 目录已消费真实 `idle.start` 帧，Hero 却硬编码 `👹`；EnemyTeam 目录已省略媒体，Hero 却硬编码 `⚔`。`DsObjectHero.media` 本来可选，固定符号只重复 `eyebrow` 的类型。生产 Hero media census 另有 Item 真实物品图、Actor 头像、Ambience 当前色样，以及 Vars 的类型符号 `⚑/№`。 | `EnemyTab.tsx:750-799`；`EnemyTeamTab.tsx:295-350`；`VarsTab.tsx:410-418`；`ItemTab.tsx:1321-1333`；`ActorMode.tsx:519-526`；`AmbienceTab.tsx:486-499`；`design-system/recipes.tsx:94-109` |
| 本任务目标 | Enemy Hero 复用既有单帧缓存与 `idle.start`；EnemyTeam 不渲染 media；生产 Hero 媒体逐项登记“真实识别媒体 / 冗余类型符号 / 无媒体”，保留真实图像、头像和色样，删除不能区分对象且已被文字重复的固定 glyph。 | 用户 2026-08-29 当前裁决与 2026-08-27“没意义图标都可去掉”裁决 |

- `before -> after`：Enemy 目录是真实待机帧、Hero 却是固定 `👹`；EnemyTeam 目录无媒体、Hero 却保留固定
  `⚔`；同类 Hero glyph 仍靠人工记忆 -> Enemy Hero 使用同一 `idle.start` 真值与缓存，无自有媒体的 Hero
  省略槽位，真实媒体与删除面由完整生产 census + 门禁闭合。
- 最强替代解释：Hero 固定 emoji 只表达对象类型，未必需要区分具体对象；EnemyTeam 的剑能提示战斗属性。
- 反证：Hero 已有“敌人 / 敌队预制 / 世界变量”等 eyebrow 与类型 meta；固定 glyph 不因对象变化，用户已明确
  判定无意义。Enemy 已存在直接绑定的真实媒体，不存在只能使用通用符号的前提。
- 可证伪观察：同 definition/revision 的目录与 Hero 若触发两次资源 load/bake，则缓存复用设计失败；快速切换
  Enemy 后若 Hero 串旧帧，异步防串图失败；删除 media 后若残留 64px 空槽或窄宽溢出，无媒体布局失败；完整
  census 若发现某固定 glyph 会显著提升对象辨认准确率，应从删除面转为有证据保留项。

#### 冻结设计与范围

- Enemy Hero 直接复用现有 `EnemyBattleSpriteThumbnail`、当前选中 enemy definition/revision 与同一个
  `enemyThumbnailCache`；不得新建缓存、复制 loader/bake、裸写 frame 0 或回退 emoji。现有缓存 key 已包含
  project/definition/asset/revision/idle.start/profile，同 key 共享 Promise。
- EnemyTeam Hero 删除 `media`，不拼装成员头像、不借某一成员代表整队；`DsObjectHero` 自然进入
  `data-has-media=false`，不得留空壳。
- 对另外三个真实媒体面（Item 图标、Actor 头像/fallback、Ambience 色样）保持不动。Vars `⚑/№` 是否删除由
  Kimi / GLM 依据“是否独立帮助辨认对象”直接证据签字冻结；未冻结前不得实现该分支。
- 静态门禁从只检查 Catalog `leading` 升级为生产 `DsObjectHero.media` census：Enemy 必须消费真实缩略图；
  EnemyTeam 不得带 media；禁止业务 Hero 直接塞 raw emoji/string；真实媒体和 bounded fallback 逐项登记。
- 不改 schema、migration、runtime、项目数据、`DsObjectHero` API/CSS、目录行 title/meta/trailing、试玩、删除、
  搜索、选择或命令语义。

#### 验收条件

- Enemy Hero 与选中目录行使用同一 `idle.start`，同 key load/bake 一次；切换 definition/revision 不串图。
- EnemyTeam Hero 无 media DOM、无空槽、无 `⚔`；正文自然左移，动作区和窄宽布局不溢出。
- 生产 Hero media census 双向闭合，死 JSX、只禁旧 className 或只查 Catalog leading 均不能假绿。
- 聚焦测试：`EnemyBattleSpriteThumbnail.test.tsx`、`EnemyTab.test.tsx`、`EnemyTeamTab.test.tsx`、
  `catalog-row-content-adoption.test.ts`；默认宽度与 720px 浏览器检查 Enemy 两对象快速切换及 EnemyTeam 无媒体布局。

#### 进入 build 前设计签字

- Codex：
  - premise：**verified（2026-08-29）**。直接证据见上方四向真值；现有门禁只禁止旧
    `<span className="face">👹` 与 Catalog `leading=⚔`，没有覆盖实际 Hero media，属于可复现漏检。
  - design：**agree（2026-08-29）**。赞成复用既有缓存、EnemyTeam 删除 media 与生产 Hero media census；
    Vars 是否属于删除面留给两席以直接证据冻结，不自行扩大。
- Kimi：
  - premise：**verified（2026-08-29，本人独立直读全部生产 Hero media + 目录缓存链，非复述 Codex）**:
    1. **截图两面实锤**: `EnemyTab.tsx:792-793` Hero `media={<span aria-hidden="true">👹</span>}`
       而目录 :758-766 已用 `EnemyBattleSpriteThumbnail` 真实 `idle.start` 帧;`EnemyTeamTab.tsx:
       344-345` Hero 固定 `⚔` 而 eyebrow="敌队预制"(:346)已表达类型、目录(:296-304)无媒体。
    2. **生产 Hero media census 本人 grep 闭合**: 固定 glyph 恰 3 面(Enemy 👹 / Vars ⚑№ /
       EnemyTeam ⚔),真实媒体恰 3 面(`ActorMode.tsx:520` / `AmbienceTab.tsx:491` /
       `ItemTab.tsx:1322`),其余 `DsObjectHero`(Image / Skill / BattleField 等)无 media prop——
       无漏网第四 glyph 面。
    3. **Vars 分类直接证据**: `VarsTab.tsx:410-416` ⚑/№ 按 kind 变化,但 kind 已由同 Hero
       `meta={typeLabel(selected.kind) · 读 N · 写 N}` 文字完整表达——glyph 不提供超出文字的
       信息,与 2026-08-27 目录同类符号删除判据一致,**本席冻结为删除面**。
    4. **无媒体布局成立**: `recipes.tsx:107-109`——media 可选,`data-has-media=false` 时不渲染
       媒体 div,删除后无空壳的结构基础已在。
    5. **缓存复用成立**: 目录 `EnemyBattleSpriteThumbnail` 缓存 key 已含 projectId /
       definition.id / asset / revision / idle.start / profile(本席在合并 candidate 终审已核
       `EnemyBattleSpriteThumbnail.tsx:48-55`),Hero 复用同一 `enemyThumbnailCache` 同 key
       共享 Promise,"load/bake 一次"设计成立。
  - design：**agree(2026-08-29，附 K-H1-K-H5 必落钉）**:
    - **K-H1(缓存复用钉)**: Hero 必须与目录同 `enemyThumbnailCache` 实例、同 definition /
      revision key;测试断言同 key load / bake 一次,不得新建缓存、复制 loader / bake、裸写
      frame 0 或回退 emoji;快速切换两个 Enemy 时 alive guard 不串旧帧。
    - **K-H2(36px 与 Hero 壳尺寸钉)**: 36px 缩略图在 Hero media 壳中的呈现必须 build 前冻结
      ——组件加可选 size prop(Hero 用更大尺寸)或 Hero 壳适配 36px 居中,二选一写明;
      DOM / 浏览器断言无 64px 空壳感、窄宽不溢出。
    - **K-H3(EnemyTeam 无媒体钉)**: 删除 media 后 `data-has-media=false`、无 `⚔` DOM、
      无空槽,正文自然左移,动作区与窄宽布局不溢出。
    - **K-H4(Vars 删除钉)**: 按上条证据删除 ⚑/№;若实现期发现 kind 在某些布局不再由
      meta 表达,必须回到本卡重新冻结,不得静默保留。
    - **K-H5(census 门禁钉)**: 生产 `DsObjectHero.media` census 双向闭合——Enemy 必须消费
      真实缩略图、EnemyTeam / Vars 不得带 media、禁止业务 Hero 塞 raw emoji / string、真实
      媒体与 bounded fallback 逐项登记;死 JSX、只禁旧 className 或只查 Catalog `leading`
      均不能假绿。
  - 独立可证伪观察: ①同 definition / revision 目录与 Hero 触发两次 load / bake → 缓存复用
    失败;②快速切换 Enemy 后 Hero 串旧帧 → 异步防串图失败;③删除 media 后残留 64px 空槽
    或窄宽溢出 → 布局失败;④36px 在 Hero 壳中不可辨(浏览器抽查史莱姆 / 灯笼等代表帧)→
    K-H2 尺寸方案回炉;⑤某固定 glyph 被 census 证据显著提升辨认准确率 → 转有证据保留项
    (当前三面无此证据)。
- GLM：
  - premise：**verified（2026-08-29，本人独立复算全生产 Hero media census + 六锚点一手直读，非代理）**：
    1. **Hero media census 复算一致** ✓：grep 生产 `DsObjectHero` 的 `media=` 恰 **6 处**——
       EnemyTab:793 固定 `👹`、EnemyTeamTab:345 固定 `⚔`、VarsTab:411 类型符号 `⚑/№`
       （只随类型变不随对象变）、ActorMode:520 真实头像、AmbienceTab:491 真实色样、
       ItemTab:1322 真实物品图——与卡面四向真值逐项一致，无第七面漏网。
    2. **Enemy 目录↔Hero 割裂实锤** ✓：目录行已消费 `EnemyBattleSpriteThumbnail`
       （:765-772，idle.start 帧缓存），Hero 却硬编码 `👹`（:793）——同对象两套媒体；
       复用既有组件/缓存/revision 设计成立（key 含 project/definition/asset/revision/
       idle.start/profile，同 key 共享 Promise）。
    3. **固定 glyph 无识别价值三条件否证** ✓：三符号均不随对象变化；类型均已被同组件
       文字重复（VarsTab:415 `typeLabel(selected.kind) · 读 N · 写 N`、eyebrow 类型文案）；
       Enemy 存在直接绑定的真实媒体。推翻条件（glyph 随对象变 / 类型无文字表达）均不成立。
    4. **Vars ⚑/№ 裁决（本席独立冻结）：删除面**——kind 已由同 Hero meta `typeLabel`
       文字表达 + 目录“开关/数值”分组头双重重复，比 2026-08-27 目录删除案更充分；
       **与 Kimi 席独立裁决一致（双席收敛）**。
    5. **36px 在 64px Hero 壳可辨认性**：可接受——识别锚定目录点选→Hero 同帧同尺度一致
       性；实测若差属验收期 counter 非设计阻断；不得另建缓存/尺寸分支。
  - design：**agree（2026-08-29，附 GH1-GH3 必落钉；与 Kimi K-H 系钉互补）**：
    - **GH1（缓存复用单次证明）**：同 definition/revision 下目录 + Hero load/bake 恰一次
      （spy 计数）；切换 enemy 不串旧帧；禁裸 frame 0 / emoji / 新缓存。
    - **GH2（census 门禁双向）**：六面双向闭合——Enemy 必须消费真实缩略图、EnemyTeam 与
      Vars 不得带 media DOM、Actor/Item/Ambience 登记保留、AST 拒绝 Hero media raw
      emoji/string 字面量；死 JSX/只禁旧 className 不假绿。
    - **GH3（无媒体布局）**：`data-has-media=false` 无空槽、正文左移、动作区与 720px
      窄宽不溢出——DOM + 浏览器双断言。
  - 可证伪观察：①同 key 双 load/bake 或串旧帧——GH1 停线；②Hero 实测不可辨且用户不认
    可——36px 前提回炉；③第七面未登记——门禁 fail-closed；④删 ⚑/№ 后用户称丢类型感知
    ——以 meta/eyebrow 文字在位为准复核。
- 独立反证审查：**Kimi（2026-08-29）**。已直读全部生产 `DsObjectHero.media`（本人 grep census：
  3 glyph + 3 真实媒体，无漏网）。**Vars 分类**：删除——`VarsTab.tsx:410-416` 的 ⚑/№ 按 kind
  变化，但 kind 已由同 Hero `meta` 的 `typeLabel(selected.kind)` 文字完整表达，glyph 不提供超出
  文字的信息（与 2026-08-27 目录同类符号删除判据一致）。**36px 在 64px Hero 壳的可辨认性**：
  36px 是目录已验证的可辨尺寸（合并 candidate 验收），Hero 壳若保持 64px 槽位放 36px 会形成
  空壳感——K-H2 要求 build 前冻结 size 方案（组件 size prop 或壳适配），可辨性本身由同一
  idle.start 真值保证，不因槽位变化。**什么观察会推翻"固定 glyph 无识别价值"**：若某 glyph 承载
  同 Hero 其他槽位（eyebrow / meta / title）未表达的信息且逐对象变化——当前三面均不满足
  （👹/⚔ 全对象同形；⚑/№ 虽按 kind 变化但 kind 已由 meta 文字表达）。
- counter / 分歧处理：任一席 counter 则保持 rework；尺寸或 Vars 分类无法收敛时交用户裁决。
- 缺签豁免：N/A。
- build 准入结论：**allowed（2026-08-29，Codex + Kimi（K-H 系钉）+ GLM（GH1-GH3）三签齐、
  无 counter；Vars 删除面双席独立收敛）。实现范围限 Hero 媒体闭包，不触碰 Shop v3 已收口面。
  实施提示词见卡面"当前执行说明"。**

#### 当前增量进入 done 前签字

- Codex：**accept（2026-08-29，当前顶部摘要区媒体 candidate）**。Enemy 目录 36×36 与摘要 56×56 复用同一
  cache/key 和 `idle.start`，同 key 单次 load/bake；EnemyTeam / Vars 无 media DOM、无固定 glyph，六面媒体 census
  双向闭合。聚焦 **5 files / 29 tests passed**；PAL 1280×720 切换史莱姆/灯笼及 EnemyTeam 实测无串图、空槽或横向
  溢出；共享 typecheck、DS gate 与 diff check 均绿。
- Kimi：**accept（2026-08-29，当前顶部摘要区媒体 candidate 只读终审，本人独立直读实现 + 聚焦复跑，
  非复述 Codex）**:
  1. **Enemy Hero 真实 idle.start + 缓存复用 ✓(K-H1)**: `EnemyTab.tsx:796-809`——
     `media={<EnemyBattleSpriteThumbnail definition={enemyBattleSprite} … cache={enemyThumbnailCache}
     placement="hero" />}`,与目录行同一个 `enemyThumbnailCache` 实例;`placement` 只决定渲染尺寸
     (CATALOG 36 / HERO 56,`EnemyBattleSpriteThumbnail.tsx:12-13,109`),**不进缓存 key**
     (cache.load 参数仍 projectId / definition / asset / revision / idle.start / profile)——
     同 key 单次 load / bake、baked 原帧共享、各自 drawImage 等比缩放(≤2x),无第二缓存、无
     loader / bake 复制、无裸 0、无 emoji 回退。
  2. **尺寸与布局 ✓(K-H2/K-H3)**: Hero 56px 方案以 placement prop 落地（build 前冻结的二选一
     中选了 size prop);`EnemyTeamTab.tsx:344` 与 `VarsTab.tsx:410` 的 `DsObjectHero` 均无 media
     prop——`data-has-media=false` 自然成立,⚔ / ⚑№ glyph DOM 消失,无空槽(K-H4 Vars 按既有
     冻结删除)。
  3. **复跑证据**: 本人聚焦 5 文件(EnemyBattleSpriteThumbnail / EnemyTab / EnemyTeamTab /
     VarsTab / catalog-row-content-adoption)**29/29 全绿**,与 Codex 声明一致;PAL 1280×720
     切换史莱姆 / 灯笼与 EnemyTeam 实测(无串图 / 空槽 / 横向溢出)已登记,符合功能性最小视觉
     验证分层。
  - 无返工项。GLM accept 与用户复验前不得标记 done。
- GLM：**accept（2026-08-29，顶部摘要区媒体 candidate 只读终审，本人一手直读实现/registry/测试 + 独立复跑，非代理）**：
  1. **Enemy Hero 复用实锤（GH1）** ✓：`EnemyTab.tsx:796-800` Hero `media=
     <EnemyBattleSpriteThumbnail placement="hero" …>`——同一组件、同一
     `enemyThumbnailCache`（:594 工程上下文 memo）；组件 `CATALOG_THUMBNAIL_SIZE=36 /
     HERO_THUMBNAIL_SIZE=56`（EnemyBattleSpriteThumbnail.tsx:12-13，:106-109 按
     placement 选尺寸）；测试 :196-225"uses the same derived cache for catalog and hero
     placements"断言两 placement 同缓存 + hero 56×56 + data-placement——同 key 单次
     load/bake 机检在位。
  2. **删除面落地（GH2 的 Vars/EnemyTeam 部分）** ✓：EnemyTeam ⚔ 与 Vars ⚑/№ 的
     `media=` 生产 grep 零命中（残留仅注释/帮助文案）；Vars 按本席与 Kimi 双席收敛的
     "删除面"裁决实现。
  3. **六面 census 双向闭合（GH2）** ✓：registry 新增 `heroMedia`(4) +
     `heroMediaNone`(2)——actor/hero-avatar、ambience/hero-swatch、enemy/hero-idle-frame
     （identity-media）、item/hero-icon 四真实媒体 + enemy-team/variables 两个 no-media
     ——恰六面与设计 census 一致；gate :258-295 拒 DsObjectHero alias/spread 逃逸。
  4. **无媒体布局（GH3）** ✓：Codex 1280×720 实测无空槽/无串图/无横向溢出；聚焦测试
     含 EnemyTeam/Vars 布局断言。
  5. **独立复跑**：`EnemyBattleSpriteThumbnail + EnemyTab + EnemyTeamTab + VarsTab +
     catalog-row-content-adoption` → **5 files / 29 tests 全绿**。
  - 无返工项。未修改实现文件，未代签 Kimi。
- 用户复验：**accept（2026-08-29）**。用户按当前 candidate 最小复验步骤检查敌人真实待机首帧、快速切换、
  EnemyTeam / Vars 无媒体布局并明确回复 `ED-CATALOG-ROW-IA-1 通过`。
- done 准入结论：**allowed / done（2026-08-29）**。Codex + Kimi + GLM 当前 candidate accept 与用户复验齐，
  无 counter、无剩余返工项。

## Review: 审查与返工

- Reviewer：Kimi + GLM
- 审查结论：**done**。Shop v3 历史 accept 保持有效；当前顶部摘要区媒体增量已由 Codex / Kimi / GLM 三方
  fresh accept，并由用户复验通过。
- 审查重点：Enemy 真实 `idle.start` 与缓存复用；EnemyTeam / Vars 无媒体布局；生产摘要媒体 census 不可假绿。
- Accept / rework：**accept；无返工项**。

## 用户验收

### 当前 candidate 最小复验步骤（约 2 分钟）

此前已经通过的 Shop 滚动、目录主次、稳定 ID、音频列表去图标等切片无需重验；当前只检查顶部摘要区媒体：

1. 进入 **战斗 -> 敌人**，在左侧依次选择“史莱姆”和“灯笼”。
   - 通过：左侧每行是该敌人的真实待机首帧；中间顶部摘要显示同一敌人的较大待机首帧，不再出现固定 `👹`。
   - 快速来回切换两项时，图片不串到上一个敌人、不闪出错误敌人，也不出现空白占位。
2. 进入 **战斗 -> 敌队**，选择任意敌队。
   - 通过：中间顶部没有固定双剑图标，也没有为已删除图标保留的空白方框；标题、ID 和摘要自然左对齐。
3. 进入 **剧情 -> 变量**，选择任意变量。
   - 通过：中间顶部没有旗帜 / 数字装饰图标或空白媒体槽，信息与敌队页采用相同无媒体布局。
4. 可选最小窄宽检查：把窗口缩到约 720px，再重复步骤 1–3。
   - 通过：顶部图片、标题和动作按钮不重叠，页面不出现横向滚动；无媒体页面不突然多出左侧空洞。

以上四项都符合即可回复“ED-CATALOG-ROW-IA-1 通过”；任何一项不符时只需发对应页面截图，不用重验历史切片。

- 2026-08-29 用户完成上述当前 candidate 复验并明确回复 `ED-CATALOG-ROW-IA-1 通过`；整卡收口为 done。

- 用户结论：2026-08-27 入口行选中表面/图标截图验收触发增量返工；用户明确要求删除没有选择价值的装饰图标。
  当前入口修复浏览器自验通过，但整卡须待 7 个同类面完成、三方 review accept 和用户最终复验后收口。
- 2026-08-28 用户最终复验发现音乐目录每行固定三角形只选中、不执行播放，裁决音乐 / 音效同源删除；任务转
  `rework`，2026-08-27 design / done accept 对当前 candidate 失效，增量三签齐前不得修改实现文件。
- 2026-08-28 用户继续指出 Enemy 目录可使用敌人待机首帧；Codex 核清 153 个 PAL 敌人均有合法 enemy
  battleSprite 绑定并确认方案成立。该裁决把音频单项“最终四类真实媒体”改为合并后的五类，因此须合并重签。
- 2026-08-28 当前合并实现已完成 Codex 自验，且 Codex / Kimi / GLM 已对当前 candidate 三方 accept；现仅待
  用户复验 Enemy 缩略图与音频目录，未获得用户最终验收结论前不标 done。
- 2026-08-28 用户在最终复验继续指出 EnemyTeam 把 ID 放第一行、统计放第二行，与“名称 / 稳定 ID”心智不稳，
  并询问是否应把 `295`、`enemy-468` 等统一成 `sprite.pal.001` 形状。全量审计确认点分语法只属于真实 AssetId，
  用户批准“不造假 ID，只统一身份落槽”的推荐方案；任务转 `rework`，上一版三方 accept 保留历史但不授权新实现。
- 2026-08-28 用户指出 Shop 目录在小窗口完全不能滚动，并追问为何没有统一组件；Codex 实测确认零 scroll owner
  与 adoption registry 假绿。用户随后要求 ED-CATALOG-ROW-IA-1 返工，并纠正 Codex 只处理版本漂移的误判；
  当前卡转 `rework / build blocked`，旧 accept 再次降为历史，待三方按共享 catalog viewport / gate 新合同重签。
- 2026-08-29 用户最终复验指出 Enemy Hero 仍是固定 `👹` 而非待机首帧、EnemyTeam Hero 固定 `⚔` 没有意义，
  并要求“该返工的返工、该改的改”。任务转 Hero 媒体语义闭包 rework；Shop v3 三方 fresh accept 保留历史但
  不授权当前增量，三方设计重签前不得修改实现。
- 后续任务：N/A。

## 交接日志

- 2026-08-29 User + Codex：用户连续指出 Enemy / EnemyTeam Hero 媒体与既有真实识别规则不一致，并明确要求
  实际返工。Codex 直读确认 Enemy 目录已用 `idle.start` 但 Hero 仍硬编码 `👹`，EnemyTeam 目录无 leading 但
  Hero 仍硬编码 `⚔`；同时发现卡头/看板/Review 与 Shop v3 实际三方 fresh accept 记录漂移。已恢复真实历史、
  新增 Hero 媒体闭包重签与全生产 Hero census，未修改实现。Next：Kimi + GLM 当前设计签字。

- 2026-08-29 Kimi: Hero 媒体语义闭包增量独立复核。grep 复算生产 `DsObjectHero.media` census:
  固定 glyph 恰 3 面(EnemyTab.tsx:792-793 👹 / VarsTab.tsx:410-411 ⚑№ / EnemyTeamTab.tsx:
  344-345 ⚔),真实媒体恰 3 面(ActorMode:520 / AmbienceTab:491 / ItemTab:1322),无漏网;
  直读 DsObjectHero media 可选 + data-has-media=false 结构(recipes.tsx:107-109)、目录缓存链
  (EnemyBattleSpriteThumbnail key 含 projectId/definition/asset/revision/idle.start/profile)。
  **Vars 分类冻结为删除**(kind 已由 meta typeLabel 文字完整表达,与 2026-08-27 目录判据一致)。
  签 premise verified + design agree,附 K-H1(缓存复用同 key 一次)/ K-H2(36px 与 Hero 壳
  尺寸 build 前冻结)/ K-H3(EnemyTeam 无媒体无空槽)/ K-H4(Vars 删除不得静默保留)/ K-H5
  (Hero media census 门禁)五钉,完成独立反证(推翻"固定 glyph 有识别价值"的条件)。未修改
  实现文件。Next: GLM 设计签字;三签齐后 Codex 按"当前执行说明"实施。

- 2026-08-29 Kimi: 顶部摘要区媒体 candidate done 前只读终审。直读 EnemyTab.tsx:796-809(Hero
  复用 EnemyBattleSpriteThumbnail placement="hero" 同 cache;placement 只定渲染尺寸 36/56、
  **不进缓存 key**,同 key 单次 load/bake 共享 baked 原帧)、EnemyTeamTab.tsx:344 / VarsTab.tsx:410
  (DsObjectHero 均无 media prop,⚔ / ⚑№ DOM 消失、data-has-media=false 无空槽)。复跑 5 文件
  **29/29 全绿**;PAL 1280×720 切换与 EnemyTeam 实测证据登记。签 **accept**,无返工项,未修改
  实现文件。三方 accept 齐(Codex/GLM 已签),准入更新为待用户复验。Next: 用户复验收口。

- 2026-08-29 Kimi: Shop scroll owner / adoption truth v3 candidate done 前 fresh 只读终审。直读
  `recipes.tsx:185-212` + `recipes.css:979-997`(root overflow:hidden / header 固定 / nav 唯一
  scroll owner,data 属性门防伪造,级联 0-2-0 胜 .outliner overflow-y:auto);grep 复算七页接入齐、
  生产 raw `ds-object-workspace*` 精确只剩 6 文件 exception(K-R6 选 (a) 落实,Item/Skill/Enemy/
  Poison 中央清零,Shop:153 真实 DsObjectWorkspace);node 复算 registry v3: catalogScrollOwners
  25 条全结构化、legacyExceptions 恰 6 条 selector+count 锁定、17 adopted + 8 exception 算术
  闭合;debt 卡 ED-WORKSPACE-ADOPTION-DEBT-1 已先行登记;verifyCatalogWorkspace 机检唯一 owner /
  祖先链无第二 owner / header 固定。聚焦复跑 10 文件 **167/167 全绿**(adoption 20/20)。签
  **fresh accept**,无返工项,未修改实现文件。三方 fresh accept 齐,准入更新为待用户最终验收。
  Next: 用户复验收口;提交时注意与 MIG-PAL-MAP-NAME-1 已审文件分清单暂存。

- 2026-08-28 User + Codex：用户将 Shop 目录不可滚动、raw scroll div 与 adoption gate 假绿纳入本卡返工。
  Codex 承认先前只修版本漂移属漏项，已冻结实现并补四向真值、反证与共享 viewport / gate 草案；旧 accept 降为
  历史。Next：Kimi + GLM 独立设计审查，三签齐前不得改实现。

- 2026-08-28 Kimi: Shop scroll owner 增量独立复核完成。直读 `ShopTab.tsx:106-139`(DsListHeader +
  raw sprite-list.shop-catalog)、`editor.css:654-663`(基础 .outliner overflow-y:auto)与
  `:3609-3614`(.shop-outliner overflow:hidden 覆盖 + .shop-catalog 仅 padding)、`git show 9dd4e4a3`
  (删除 .sprite-list{flex:1;overflow-y:auto} 实锤)、`design-system-adoption.json:253-258`(登记
  DsCatalogControls/DsObjectWorkspace 与生产 JSX 不符)、`design-system-audit.mjs:2773-2781`(owners
  只验字符串非空)、`editor.css:10314-10320`(Ambience __list 正向先例逐属性吻合);grep 复算
  sprite-list 恰 5 处 + Ambience/SharedScript 同构 = 七页,DsCatalogWorkspace 不存在(新建无冲突)。
  签 premise verified + design agree,附 K-R1(接入页 overflow 接管防嵌套滚动,祖先 scrollTop 恒 0
  机检)/ K-R2(header 固定)/ K-R3(reachability + 反向登记 + 禁伪造 marker)/ K-R4(七页短窗口
  矩阵)/ K-R5(范围冻结,leading 媒体不回归)五钉,完成本席独立反证(四组可证伪观察 + 替代解释
  否证)。三方签字齐、无 counter,build 准入 allowed;未修改实现文件。Next: Codex 按钉 build ->
  三方 done 终审重新计算。
- 2026-08-28 Codex：完成 GLM 唯一最小返工，`EDITOR_DESIGN_SYSTEM_VERSION`、CSS token、boundary 三向断言
  均同步到 v2.15.0；`boundary.test.ts` 1 file / 47 tests 全绿，diff check 通过。未触碰业务实现或其他 WIP。
  Next：GLM 独立复核三处一致并转 accept；之后等待用户最终复验收口。

- 2026-08-28 User + Codex：用户批准“不造假 ID，只统一身份落槽”。Codex 直读 20 文件 / 28 个生产
  `DsCatalogRow`、Skill / Enemy / Team / Asset schema 与迁移器，并核实 PAL 1,934 个资源当前 0 缺 label；
  确认 EnemyTeam 是当前截图层级返工，五个资源 fallback 是合法 authored 工程可触发的潜在重复。任务转
  `rework`，Codex 签 premise verified + design agree；Kimi / GLM 重签前 build blocked，未修改实现文件。

- 2026-08-28 Kimi: 稳定身份落槽增量独立复核完成。直读 `enemy.ts:107-115`(EnemyTeamDef 仅 id+slots)、
  `skill.ts:142-144` + `migrate-content.ts:739-741`(SkillId=原版 oid 不透明串,实产 295)、
  `migrate-enemies.ts:85-88,227-230`(enemySlug/teamSlug 唯一生成函数,team id 是 startBattle join 键)、
  `asset.ts:269-273`(sprite.pal.NNN 是 AssetId 工厂)、`EnemyTeamTab.tsx:92-110,267-275`(搜索/选择
  消费原始 team.id+slots,不走 title 字符串;缺失成员搜索降级确定),并逐一实锤 5 个无 label fallback
  分支(Audio:618-619 / BattleSpriteLibrary:1236,1243-1244 / CutsceneTab:211-212 / ImageTab:
  662-663 / WorldSpriteLibrary:578,585-586)。node 复算 PAL: 380 队 = 0 空 / 129 单 / 100 纯重复 /
  151 混合 / 68 带洞 / **0 缺失引用 / 0 同构成组**——派生标题四类边界确定、可重复标题由 meta=team.id
  唯一区分,不形成第二身份。签 premise verified + design agree,附 K-S1(未知成员降级原始 id 字面)/
  K-S2(派生 title 不进任何引用路径)/ K-S3(禁 skill.pal.*/enemy.pal.*/team.pal.* 别名机检)/
  K-S4(未命名标题归 locale owner)四钉;直读背书 GLM GC-S1(ShopTab.tsx:120-128 与 EnemyTeam
  before 同构属实,ShopDef 无名称字段 shop.ts:11-14)。三方签字齐、无 counter,准入
  allowed-with-precondition: shop/catalog + VarsTab 未登记引用 + 场景根三处 registry 裁决落定后
  Codex 方可开工。未修改实现文件。Next: 三处裁决 -> Codex build -> 三方 done 终审重新计算。

- 2026-08-28 Kimi: 稳定身份落槽 candidate done 前只读终审。独立直读 `enemyTeamCatalogTitle`
  (EnemyTeamTab.tsx:60-86——首现顺序 ×N / null 跳过 / 缺失降级原始 enemyId / 空敌队,meta=team.id
  选择不变)、`shopCatalogTitle`(ShopTab.tsx:40-47——空货单/首件名/等 N 种/原始 itemId 降级,
  meta=String(x.id))、`editorAssetCatalogTitle`(asset-diagnostics.ts:31-40——签名不接收 AssetId,
  类型级杜绝 title=meta 同值;五资源 family 全接入);node 复算 registry v3: 28 条 0 缺四字段,
  derived-content 精确=[enemy-team, shop],场景根显式例外,leading=present 仍精确 5 条;门禁四字段
  枚举 + identitySlot 存在性 + summaryKind=none 禁残留摘要 + 伪 .pal. 别名零容忍全部落地;DOM 值级
  断言(team/shop/skill 三 family title/meta/点击原 id)核对一致;本 candidate 零 CSS、零 schema/
  migration/runtime diff。聚焦复跑 13 文件 **95/95 全绿**(含 DS gate 88 files)。签 **accept**,
  无返工项,未复用旧 candidate 签字,未修改实现文件。done 准入更新为待 GLM accept + 用户最终复验。
  Next: GLM 终审 -> 用户复验收口。

- 2026-08-28 Codex：音频 + Enemy 合并增量单 Owner build 完成并转 review。Audio 全族删除静态 play leading；
  Enemy 新增懒加载真实 `idle.start` 单帧、64 项工程级缓存与防串图；registry / DS / DOM / static gate 同步。
  聚焦 4 files / 18 tests、typecheck、diff check 与 PAL 默认 / 720px 浏览器通过。唯一一次 editor 全量
  152/167 files、1316/1343 tests 通过，26 个并发 timeout 与 1 个新文件 census 已完整留证，census 聚焦复绿，
  未重跑整包。Codex accept。Next：Kimi + GLM 只读终审当前 candidate，双签前不得 done。

- 2026-08-28 User + Codex：用户批准 Enemy 目录以绑定战斗精灵的待机首帧作为真实缩略图。Codex 完成
  EnemyDef / BattleSpriteDef / idle profile / 引用门 / AssetId 与 PAL 153 行 census，冻结懒加载、有界共享缓存、
  单帧 bake、无 timer、无 emoji fallback 设计；并入 audio 删除增量。音频单项签字保留历史，合并方案待
  Kimi + GLM 重签，双签前 build blocked，未修改实现文件。

- 2026-08-28 Kimi: 合并 candidate done 前只读终审。独立直读 `AudioAssetWorkbench.tsx` diff(仅删
  DsIcon import + 目录行 leading,中央 transport / 引用数零改动)、`EnemyBattleSpriteThumbnail.tsx`
  全文(:47 读 profile.idle.start 无裸 0;:110-128 IO 懒加载;:72-76 单帧 bake;:77-87 失败驱逐 +
  64 LRU;:48-55 key 含 revision/profile;:144-169 alive 防串)、`EnemyTab.tsx` diff(cache 按工程
  上下文 useMemo + cleanup clear;title/meta/trailing 不变)、`assets.ts:384-389`(prune 仅超容量逐出)、
  registry / editor.css / DS 文档 diff;node 复算 `leading=present` 恰 5 条 = actor/ambience/enemy/
  image/item,audio=none、enemy=present;聚焦复跑 5 测试文件 **32/32 全绿**(含 DS gate 88 files)。
  判定全量 26 项并发 timeout 属既有基础设施 flake,非本 candidate 回归。签 **accept**,无返工项,
  未修改实现文件。三方 accept 齐,done 准入更新为待用户最终验收。Next: 用户最终验收后收口。

- 2026-08-28 Kimi: 合并增量独立复核完成。直读 `enemy.ts:90-91`(battleSprite 必填)、`validate-refs.ts:
  256-262,1268-1284`(expectedProfile='enemy' 声明 + 缺定义/错 profile 双 error)、`battle-sprite.ts:
  133-134`(idle.count>=1、idle.start!==0 即 fail)、`assets.ts:339-402`(BattleSpriteAssetCache 192 LRU /
  共享 Promise / 失败驱逐 / 签名失效 + loadBattleSpriteDefinition profile 再校)、`render.ts:34`(bakeFrame
  单帧)、`SpriteThumb.tsx:74-108`(IO 懒加载 / alive 防串 / 失败留空无 emoji)、`BattleSpriteInlinePreview.
  tsx:244-248`(setInterval 动画 timer 对照);node 直读 projects/pal/content 独立复算: 153 敌人 / 152
  enemy profile / 0 缺定义 / 0 错 profile / 0 缺 AssetId / 恰 enemy-battle-81 被 2 敌人共享,与 Codex/GLM
  逐项一致。签 premise verified + design agree,完成本席独立反证(四条可证伪观察),背书 GLM GC-E1/
  GC-E2/GC-E3 三钉,并定位 36px 可辨性为验收条件而非 build 前阻断。三方合并签字齐、无 counter,build
  准入 allowed(最终五类 actor/ambience/enemy/image/item;audio=none、enemy=present、68px 不变);
  未修改实现文件。Next: Codex 按钉 build,实现后送三方 done 终审,旧 accept 不复用。

- 2026-08-28 User + Codex：用户最终复验确认音乐目录三角形只选中、不播放，批准 music / sound 同源删除。
  Codex 直读共享 workbench、真实播放器 owner、registry 和 gate，任务转 rework；旧 design / done accept 降为历史，
  未修改实现。Next：Kimi + GLM 独立增量重签，双签写入卡前 build blocked。

- 2026-08-28 Kimi: 独立直读 `AudioAssetWorkbench.tsx:606-621`(整行 select / 静态 :617 glyph / title/meta/
  trailing)、`:315-378`(中央 transport 播放/暂停/停止/seek/状态文本唯一 owner)、`design-system/
  icons.tsx:200-212`(DsIcon aria-hidden + focusable=false)、`design-system/recipes.tsx:148-192`
  (DsCatalogRow 整行 button、leading 纯展示槽)、`MusicTab.tsx:103` / `SoundTab.tsx:53`(同源 strategy
  消费同一 workbench),签 premise verified + design agree,完成本席独立反证(四条可证伪观察全部否证
  glyph 残留价值),背书 GLM GC-A1 / GC-A2 双钉。三方增量签字齐、无 counter,build 准入 allowed;
  未修改实现文件。Next: Codex 按钉 build(删 leading + registry/fingerprint/reason + DS-C.4b + 双负
  断言),实现后送三方 done 终审,2026-08-27 旧 accept 不复用。

- 2026-08-27 User + Codex：用户验收指出入口最右移动箭头贴边。Codex 将组合表面尾部 inset 设为公共
  `--ds-space-2`，与手柄左 inset 对称，并用静态合同防回流；聚焦 44/44、diff check 与 PAL 几何复核通过。
  当前 Codex accept 更新到新 candidate，Kimi / GLM 仍为 pending，不需降级任何既有 reviewer accept。

- 2026-08-27 Codex：增量单 Owner build 完成并转 review。8 个装饰 leading 删除、5 类真实媒体保留，registry
  fingerprint/slot/reason 与页面 DOM/static 断言同步；聚焦 8 文件 104/104、typecheck、diff check 及 PAL 入口/过场
  1280px 浏览器验证通过。Codex accept。Next：Kimi + GLM 只读终审当前 candidate，双签前不得 done。

- 2026-08-27 Kimi 无意义 leading 增量重签: 独立直读敌队 ⚔(:268-275)/场景根 🗺️(:2228-2234)/
  VarsTab ⚑№!(:269-276,337-343) 三个删除面——均为全行常量或与分组头/trailing 完全重复的符号；
  氛围色样(:449-459)为按行真实渲染媒体，保留。签 premise verified + design agree（附 K-I1
  删除判据形式化 / K-I2 保留边界）；完成独立反证并修正本人 08-25 对 ⚔ 的旧判断（其价值实际落在
  meta 计数而非符号）。未修改实现，未代签 GLM。三签齐，准入开放。

- 2026-08-27 User + Codex：用户指出入口行选中底色被右侧移动按钮截断，并裁决“没意义的 item 图标都可去掉”。
  Codex 对全 registry 复扫得到 7 个高置信删除面、5 个保留媒体面；入口 WIP 已去掉 🧭/🚪、让选中表面贯穿动作区，
  聚焦 2 文件 / 44 tests 与 1280px 浏览器几何通过。因该裁决直接推翻历史 `EnemyTeam ⚔` 合规前提，任务转
  blocked，旧 build/review 签字失效；其余 surface 未开始修改。Next：Kimi + GLM 增量重签。

- 2026-08-26 Codex：完成 20 文件 / 28 消费点递归 AST + fingerprint 动态矩阵与 11 surface 收口；
  13 文件 / 186 聚焦测试、47 项内容/边界门禁、typecheck、DS gate、diff check 及 1280/720px 浏览器验证通过。任务转 review，
  Codex accept；未重开旧卡，未触碰 schema / migration / 引用真值 / 公共 `DsCatalogRow` API。

- 2026-08-25 Kimi：独立全量抽查 24 个生产消费点并核三个被点名页 + ActorMode/SkillTab/
  WorldSpriteLibrary/AudioAssetWorkbench 未点名面；签 premise verified + design agree（附 KC1-KC2：
  矩阵全覆盖逐条裁决含音频引用数 trailing 与 ActorMode emoji fallback 例外登记；同族 data-leading
  一致性机检）。与 GLM 的 21 文件 census 互补一致（文件数 vs 消费点数口径差异已对齐）。
  未修改实现。Next：GLM 已签，三签齐，准入开放。
- 2026-08-25 Codex：完成战场、物品、毒的代码级审计并横向检查共享目录合同；按用户要求新开跨页面 IA 卡，
  保留毒无图标正向基线，冻结战场与物品目标。Evidence：本卡真值矩阵与代码锚点。Next：Kimi / GLM
  联合设计审查，不得改实现。
- 2026-08-29 Codex：完成顶部摘要区媒体闭包；Enemy 复用真实 `idle.start` 缓存并采用 56×56 摘要尺寸，
  EnemyTeam / Vars 删除固定 glyph，六面媒体 census 门禁闭合。聚焦 5 files / 29 tests、浏览器 1280×720、
  typecheck、DS gate 与 diff check 均绿，已签当前 candidate accept。Next：Kimi + GLM 只读终审与用户复验。

## 当前执行说明（2026-08-29 顶部摘要区媒体语义闭包）

当前签字状态：build 前 Codex + Kimi + GLM 三签齐；Codex 已完成实现并签当前 candidate accept，待 Kimi / GLM
终审与用户复验。

```text
联合终审 ED-CATALOG-ROW-IA-1 的 2026-08-29 顶部摘要区媒体语义闭包当前 candidate（只读）。

任务卡：docs/ops/tasks/ED-CATALOG-ROW-IA-1-editor-catalog-row-information-hierarchy.md
当前状态：review。Codex 已完成 build、自验并签 accept；Kimi / GLM 当前 candidate accept 与用户复验齐前不得 done。

先读：AGENTS.md、docs/phase2/READ-FIRST.md、本卡“顶部摘要区（DsObjectHero）媒体语义闭包返工重签（当前）”、
Build/Review 证据；再直读 EnemyBattleSpriteThumbnail.tsx/.test.tsx、EnemyTab.tsx/.test.tsx、
EnemyTeamTab.tsx/.test.tsx、VarsTab.tsx/.test.tsx、catalog-row-content-adoption.json/.test.ts。

当前实现：Enemy 目录 36×36 与顶部摘要区 56×56 使用同一 EnemyBattleSpriteThumbnailCache、同
definition/revision/idle.start key；EnemyTeam 与 Vars 不渲染 media；registry 双向闭合 4 个真实媒体面与 2 个
无媒体面，并拒绝 raw emoji/string、alias、namespace 和 spread 绕过。聚焦 5 files / 29 tests passed；PAL
1280×720 切换史莱姆/灯笼及 EnemyTeam 实测无串图、空槽或横向溢出；typecheck、DS gate、diff check 均绿。

Kimi 请逐条复核 K-H1-K-H5，尤其同 key 单次 load/bake、异步防串图、56px 呈现与无媒体布局；GLM 请逐条复核
GH1-GH3，尤其六面 census 双向性、四个保留面/两个删除面和 AST 绕过红例。请分别在“当前增量进入 done 前签字”
写 accept 或 counter（附 file:line、独立复跑与可证伪观察）；不得代签另一席、不得修改实现。
```

## 历史执行说明（2026-08-29 Shop v3）

```text
联合终审 ED-CATALOG-ROW-IA-1 的 2026-08-29 Shop scroll owner / adoption truth v3 当前 candidate（只读）。

任务卡：docs/ops/tasks/ED-CATALOG-ROW-IA-1-editor-catalog-row-information-hierarchy.md
当前状态：review。Codex 已关闭 2026-08-28 Kimi/GLM counter，完成自验并对当前 candidate 签 accept；Kimi 与
GLM 必须分别重新审当前实现，不得复用 counter 前的旧 accept，不得修改实现文件，双签前不得标 done。

先读：AGENTS.md、docs/phase2/READ-FIRST.md、本卡“2026-08-29 ... candidate 进入 done 前审查”、Build/Review
证据、editor-design-system-v1.md 的 catalog/scroll/adoption 合同；再直读 design-system-audit.mjs、
design-system-adoption.json、adoption.test.ts、ShopTab.tsx、ItemTab.tsx / .test.tsx、editor.css、
design-system/overlays.tsx。

当前实现：七个同构页面由 DsCatalogWorkspace 固定标题并持有唯一 catalog viewport；Shop 中央列采用真实
DsObjectWorkspace。adoption v3 以 routed root 双向核 owner，动态 class/spread、occurrence、递归、legacy status、
真实 CSS cascade/inline、class variant、媒体条件重叠/query-list OR、axis/boundary 均 fail-closed。响应式 custom
owner 显式登记 default/at-rule。Item 图标选择改为 canonical DsDialog top layer；body hidden，grid 唯一纵向滚动且
overscroll contain，registry 为 overlay region，audit 只认可 routed canonical DsDialog 边界。

验证：adoption 20/20、ItemTab 16/16、typecheck、DS gate（88 files / 2 evidence-bound exceptions）、diff check；
PAL 900×400 Shop 滚到底末项可见且标题/root 不动，Item dialog 完整在 viewport 内、初始焦点/scroll lock/关闭归焦
正确。请各自在当前签字节写 accept，或写 counter + 最小复现/file:line；不得代签另一席。两席 accept 齐后仍等待
用户最终验收，由 Coding Owner 统一标 done。
```

## 历史下一位 Agent 提示词（2026-08-28 build-time scope counter）

```text
补充审签 ED-CATALOG-ROW-IA-1 的 build-time scope counter（只读，不得修改实现）。

任务卡：docs/ops/tasks/ED-CATALOG-ROW-IA-1-editor-catalog-row-information-hierarchy.md
当前状态：blocked。原 Shop scroll owner 方案三签已齐，Codex 已完成 DsCatalogWorkspace、七页接入、
Shop 真实 DsObjectWorkspace 与聚焦 DOM/CSS 测试；但在落 route-live owner gate 时发现两条签字钉子
不可同时满足：K-R3 / GC-W1 要求业务 TSX 全局禁止 raw `ds-object-workspace*`，K-R5 又冻结
Tileset / Stamp / Audio / World / BattleSprite / Cutscene 等七页外页面不动，而生产仍有约 28 处
七页外 raw workspace 旧债。当前 adoption 结构化门禁停线，不得用假 adopted 记录掩盖。

推荐修订：本卡对七页 CatalogWorkspace + Shop 新 owner 零容忍；七页外既存 raw workspace 只能进入
精确 bounded legacy exception，逐条登记 source、selector、reason、verification、removalCondition；
门禁锁死当前精确集合并禁止新增，不得把 exception 记为 adopted DS owner；另开 workspace adoption debt
卡逐步清零。若不同意，请给出能同时满足全局禁 raw 与排除页不动的可执行替代方案。

请 Kimi / GLM 各自在本卡 build-time counter 下写 premise verified/counter 与 design agree/counter，
附直接代码证据和可证伪观察；不得复用原三签、不得代签另一席、不得标 build/review/done。两席补签
agree 或用户明确批准该范围修订后，Codex 才继续 25 页 registry / route-live gate 与浏览器矩阵。
```

## 历史下一位 Agent 提示词（2026-08-28 Shop scroll owner 返工）

```text
联合设计重签 ED-CATALOG-ROW-IA-1 的 Shop scroll owner / adoption truth 返工（只读）。

任务卡：docs/ops/tasks/ED-CATALOG-ROW-IA-1-editor-catalog-row-information-hierarchy.md
当前状态：rework / build blocked。用户把 Shop 目录不可滚动、raw scroll div 与 adoption registry 假绿明确纳入
本卡返工；旧稳定身份、音频/Enemy candidate 的 accept 均降为历史。Codex 已对本增量签 premise verified +
design agree，待 Kimi / GLM 重签；三签齐前不得修改实现。

先读：AGENTS.md、docs/phase2/READ-FIRST.md、本卡“2026-08-28 Shop 目录滚动 owner 与 adoption truth
返工重签（当前）”；再直读 ShopTab.tsx:108-152、editor.css:654-663,3597-3614、AmbienceTab.tsx:424-469、
TilesetTab.tsx:539-588、design-system/recipes.tsx 的 DsCatalogRow/DsCatalogGroupList/DsObjectWorkspace、
design-system/recipes.css、design-system-adoption.json:item/shop、design-system-audit.mjs:2752-2910 与 adoption.test.ts。

直接证据：720px 实测 .shop-outliner clientHeight=653/scrollHeight=1484/overflowY=hidden；.shop-catalog
scrollHeight=1444/overflowY=visible，因此没有 scroll owner。Shop 实际使用 DsListHeader + raw div + DsCatalogRow，
registry 却写 DsCatalogControls；中央 main 还以 raw className 模仿 DsObjectWorkspace，registry/audit 未验证这些 owner
是否真实可达。正常 Ambience/Tileset 都采用“固定 header + min-height:0/flex/overflow-y:auto 内容区”模式。

拟议设计：新增共享非虚拟 DsCatalogWorkspace；root 持有 flex-column、min-width/min-height:0、overflow:hidden 与固定
header slot，内部 nav viewport 唯一持有 flex:1 1 auto、min-width/min-height:0、overflow:auto、
overscroll-behavior:contain、scrollbar-gutter:stable 和 data scroll-owner 标记。首批候选闭包为 Shop、Item、Skill、
Enemy、Poison 五个现存 sprite-list 页面 + 精确同构的 Ambience、SharedScript，共七页；Tileset/Stamp/三个
DsVirtualList/Cutscene 明确排除。
Shop 的 raw ds-object-workspace class 冒充同时收口为真实 DsObjectWorkspace。registry 改写为真实 DsListHeader 或
DsCatalogControls + DsCatalogWorkspace + DsCatalogRow / DsObjectWorkspace + DsInspectorTabs；全部 25 页 catalog/scroll
登记升级为 `{region,axis,owner,source,component,callsite}` 或有证据 custom/N/A，audit 双向验证 canonical owner 从
routed root 的 live JSX 可达，禁止业务页伪造保留 DS class/marker，并用 CSS boundary + 首批 DOM + 720/短高浏览器
钉住唯一滚动、固定 header、scrollTop 变化、focus/选中态和无嵌套滚动。21 家 Shop 不用虚拟列表。

Kimi：审 DsCatalogWorkspace root + viewport API、Shop 中央真实 DsObjectWorkspace 转换、单一滚动/焦点/窄高边界，
判断 Shop + Item/Skill/Enemy/Poison + Ambience/SharedScript 七页首批闭包是否最小且不会误包
VirtualList/fieldset/footer；给直接证据和可证伪观察。
GLM：审 25 页 registry owner 可达性门禁是否能系统防假绿、Shop owners 与 production JSX 精确对应、CSS/DOM/
浏览器测试矩阵是否覆盖 header 固定与唯一 scroll owner；压力测试结构化
`{region,axis,owner,source,component,callsite}` 是否足以同时表达 canonical owner、custom exception 和 N/A，并给
最小 schema 修订、直接证据与漏项清单。

请各自在本卡当前重签节写 premise verified/counter 与 design agree/counter；至少一席完成独立反证。不得修改实现、
不得只加页面私有 overflow、不得删除父 overflow 让标题一起滚、不得引入虚拟列表、不得代签另一席、不得标 build/
review/done。三签齐且无 counter 后明确 build allowed，并给 Codex 实施提示词。
```

## 历史下一位 Agent 提示词（2026-08-28 稳定身份 candidate）

```text
联合终审 ED-CATALOG-ROW-IA-1“稳定身份落槽与真实 ID 呈现”当前 candidate（只读）。

任务卡：docs/ops/tasks/ED-CATALOG-ROW-IA-1-editor-catalog-row-information-hierarchy.md
当前状态：review；三方 premise/design 已齐，Codex 单 Owner build、自验和 accept 已完成。Kimi + GLM 必须分别
只读终审当前 candidate；不得修改实现文件，不得复用音频 + Enemy 上一 candidate 的 accept，双签前不得标 done。

先读：AGENTS.md、docs/phase2/READ-FIRST.md、本卡“2026-08-28 稳定身份落槽与真实 ID 呈现增量重签”及
“稳定身份落槽 candidate 进入 done 前审查”、editor-design-system-v1.md DS-C.4c、
catalog-row-content-adoption.json / .test.ts；再直读 EnemyTeamTab.tsx / .test.tsx、ShopTab.tsx / .test.tsx、
asset-diagnostics.ts / .test.ts，以及 AudioAssetWorkbench / BattleSpriteLibrary / CutsceneTab / ImageTab /
WorldSpriteLibrary 的目录映射与受影响测试。

已完成：EnemyTeam 对重复 / 混合 / 空 / 缺失成员确定性派生 title，meta 保持原始 team.id；Shop 由真实货单派生
title，meta 保持原始数值 ID；五个资源 family 共用 AssetKind 本地化“未命名…”fallback，meta 保留精确 AssetId；
registry v3 为 28 个生产 surface 登记 titleKind / identitySlot / idPresentation / summaryKind，并静态禁止
skill.pal.* / enemy.pal.* / team.pal.* 假别名。未改 schema、migration、runtime、DsCatalogRow API 或身份 owner。

验证：聚焦 11 files / 77 tests、typecheck、audit:design-system（88 files / 2 evidence-bound exceptions）与
git diff --check 均通过；PAL 默认宽度 + 720×900 浏览器确认 EnemyTeam / Shop 68px、长标题单行截断、无横向
溢出，team-5 的 Hero / objectId / selected meta 均保持原始 ID，console 0 error/warning。此前本卡已经执行过一次
editor 全量，本切片按纪律未重复整包。

Kimi：终审派生标题确定性、原始身份消费不漂移、共享 fallback owner 与默认 / 窄宽可读性。GLM：终审 28 surface
registry v3、五个合法缺 label 路径、值级 / 静态闭包与测试证据。请各自在“稳定身份落槽 candidate 进入 done 前
审查”写 accept，或写 counter / rework + 直接 file:line 证据；不得代签另一席。三方 accept 齐后仍等待用户最终
复验，由 Coding Owner 统一标 done。
```

## 历史下一位 Agent 提示词（2026-08-28 音频 + Enemy candidate）

```text
终审 ED-CATALOG-ROW-IA-1 当前音频 + Enemy 合并实现 candidate。

任务卡：docs/ops/tasks/ED-CATALOG-ROW-IA-1-editor-catalog-row-information-hierarchy.md
当前状态：review；三方 premise/design 已齐，Codex 单 Owner build 与自验完成并签 accept。Kimi + GLM 必须分别
只读终审当前 candidate；不得修改实现文件，不得复用 2026-08-27 旧 accept，双签前不得标 done。

先读：AGENTS.md、docs/phase2/READ-FIRST.md、任务卡“2026-08-28 音频删除 + 敌人待机首帧缩略图合并增量重签”、
“2026-08-28 音频删除 + Enemy 首帧合并 candidate 进入 done 前审查”、Build / Review 证据；再读
AudioAssetWorkbench.tsx、EnemyTab.tsx、EnemyBattleSpriteThumbnail.tsx / .test.tsx、editor.css、
catalog-row-content-adoption.json / .test.ts、design-system/adoption.test.ts，以及 editor-design-system-v1.md
DS-C.4b / DS-C.4c / DS-R.2。

已完成：音乐 / 音效整族无 leading，中央 transport 与引用数不动；Enemy 全族显示绑定 enemy profile 的
profile.idle.start 单帧。组件进入视口前零读，仅 bake 一帧，无 timer / emoji；缓存容量 64，随 assetBase /
assetReader 生命周期重建，revision 失效、共享 Promise、失败驱逐、clear 与 alive 防串图。最终 registry present
精确为 actor / ambience / enemy / image / item；长列表仍由原 outliner 滚动，content-visibility 只做渲染裁剪。

验证：聚焦 4 files / 18 tests、typecheck、diff check 通过；PAL 默认 + 720px 实测 Enemy 68px 行 / 36px 真帧、
滚动无串图和水平溢出，music 86 / sound 363 全族无 leading、中央播放/停止仍唯一，console 0 error/warn。
唯一一次 editor 全量为 152/167 files、1316/1343 tests passed；26 个失败均是并发 timeout，唯一非 timeout 的
87->88 新文件 census 已修并以独立 gate 复绿；按纪律未第二次跑整包。

Kimi：终审资源 / 缓存 / 生命周期 / 防串图实现与 PAL 代表帧可辨性；确认未硬编码裸 0、未复用动画预览、未
引入第二滚动 owner。GLM：终审 music + sound 双负、Enemy 全族正向、缓存测试、fingerprint/reason/DS 文档与
精确五类 registry，并判断全量 timeout 证据是否影响本 candidate。各自请在当前 done 签字节写 accept，或写
counter/rework + 直接 file:line 证据；不得代签另一席。

Counter 条件：36px 多数不可辨、raw 0、部分行无槽、eager 全量读、全帧 bake、timer、缓存跨项目/无界、滚动
串图、audio 中央 transport 或引用数受损、registry 非精确五类、行高/滚动 owner 变化。无反例则签 accept；
三方 accept 齐后仍等待用户最终验收，由 Coding Owner 收口。
```

## 历史下一位 Agent 提示词（2026-08-27 candidate）

```text
接手任务：ED-CATALOG-ROW-IA-1 编辑器对象目录行信息层级收口
任务卡：docs/ops/tasks/ED-CATALOG-ROW-IA-1-editor-catalog-row-information-hierarchy.md
当前状态：review；2026-08-27 增量 build 已完成，Codex accept，待 Kimi + GLM done 前终审
你的角色：Kimi 或 GLM（done 前增量实现 reviewer，只读）
先读：AGENTS.md、docs/phase2/READ-FIRST.md、本任务卡“2026-08-27 无意义 leading 增量重签”与
      “2026-08-27 无意义 leading 增量进入 done 前审查签字”、
      editor-design-system-v1.md DS-C.4b/DS-C.4c、catalog-row-content-adoption.json
已完成：入口 + 7 个删除面已移除装饰 leading；5 类真实媒体不动；入口选中背景贯穿动作区；
        尾部动作区新增 4px inset；原 8 files / 104 tests 基线 + 2 files / 44 tests 返工聚焦，以及
        Field Layout 新基线上的 8 files / 105 tests 集成复核、typecheck、diff check 与 PAL 入口/过场浏览器证据通过
请独立核：8 个 fingerprint/leading/reason 与生产 JSX 精确闭合；5 类保留面未机械波及；入口按钮仍有独立
           hit target/border，最右按钮与 item 边界保留 4px 且 focus outline 不被裁切；至少复跑
           catalog adoption + 一个受影响业务页测试
请输出：在当前增量 done 签字表写 accept，或签 counter 并列明 file:line 返工项
不要做：不得修改实现文件，不得代签另一席，不得把 item 缺图 fallback 偷塞进本增量；双签前不得标 done
```
- 2026-08-25 GLM（全量消费覆盖）: 审查完成，签 **premise verified + design agree（附
  GRow1-GRow2）**。21 文件全消费面 census（比卡文锚点 6 文件广 3.5 倍）；三点名页错位/
  过载/基线实锤；未点名抽查 4 面大多已合规（EnemyTeam⚔/Skill/Actor 均不违反）——规则
  不机械删信息但矩阵必须以 21 文件为输入域（GRow1）；Item 待迁移须移入 trailing DsTag
  而非删除（GRow2）。未改实现，未代签 Kimi。
