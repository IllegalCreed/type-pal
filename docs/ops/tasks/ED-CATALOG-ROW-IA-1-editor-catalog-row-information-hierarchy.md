# ED-CATALOG-ROW-IA-1 - 编辑器对象目录行信息层级收口

Status: review（2026-08-27 无意义 leading 增量 build 完成；Codex accept，待 Kimi + GLM 终审）
Phase: phase2
Capability: Editor cross-cutting（不改变 capability-map）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: `codex/ed-project-startup-ia-1`

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
- 范围外：
  - 不改 `DsCatalogRow` 公共 props、固定行高、滚动 owner、选中态或 focus 合同。
  - 不改 schema、migration、引用收集真值、筛选结果、对象选择、删除守卫或运行时行为。
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
- 代表场景：PAL 战场 `#006`、物品 `61 观音符`、毒 `551 赤毒` 在默认宽度与窄侧栏中的目录行。
- 用户裁决：2026-08-25 用户明确要求战场 ID 回归普通层级、物品目录降噪，并要求把结论正式落成任务卡防遗忘；
  2026-08-27 又明确裁决“没用、没意义的 item 图标都应去掉，占地方”，授权按选择价值而不是装饰一致性判断。

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
  - 其他消费点若与同一规则冲突，同一切片收口并记录；无冲突页面不做机械改写。
- 测试：
  - 三个代表页断言 `data-leading`、title/meta/trailing 的 DOM 语义，不只断言整行 `textContent`。
  - Item 测试证明“有引用”筛选和右侧引用数仍工作，目录行移除引用数不改变引用真值。
  - 运行目录矩阵/设计系统门禁和受影响页面聚焦测试；最终只跑一次 editor 全量。
- 文档：把内容槽位选择门写入 `editor-design-system-v1.md`，采用矩阵保留证据锚点和合理例外原因。
- 视觉 / 手工验证：PAL 项目在默认宽度与 720px 检查 `#006`、`61`、`551`，覆盖选中态、对齐、长名称
  截断、滚动与缩放；不得出现正文水平跳动或行高变化。
- E2E 用例登记：N/A（功能性编辑器界面在 build 期做最小浏览器验证）。

## 推进签字

### 2026-08-27 无意义 leading 增量重签

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

### 2026-08-27 无意义 leading 增量进入 done 前审查签字

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
- Kimi: pending（只读核实现与入口/代表页证据，accept 或带锚点 counter）。
- GLM: pending（只读核 8 fingerprint/slot、5 保留面不变与 104 测试矩阵，accept 或带锚点 counter）。
- counter / 返工处理：N/A。
- 缺签豁免：N/A。
- done 准入结论：**blocked**。

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
    `EnemyTab.tsx`、`MapMode.tsx`、`CutsceneTab.tsx`、`ProjectWorkbenchTab.tsx`、
    `SharedScriptTab.tsx`、`SpriteActionEditor.tsx`、`editor.css`。
  - 测试 / 门禁：上述代表页面测试、`design-system/catalog-row-content-adoption.json`、
    `design-system/catalog-row-content-adoption.test.ts`、`design-system/boundary.test.ts`。
  - 文档：`docs/phase2/editor/editor-design-system-v1.md`、本卡与看板。
- 实现摘要：
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
  - 入口尾部 inset 返工：PAL 1280px 实测 surface right=353、末按钮 right=349、右 inset=4px；handle left=4px，
    按钮 border `rgb(102,114,138)` 完整，选中背景连续，document overflow=0。
  - 2026-08-27 PAL 1280px：入口 item/surface 68px 且选中背景连续到动作区，两个移动按钮保留独立边框；
    过场 18 行 `data-leading=none` / 68px / title x=12，视频与帧动画分组仍清晰；两页均无水平溢出，console 0 error/warn。
  - PAL 真实项目 1280×900：BattleField `leading=none / #006 meta`、Item `leading=present / 61 meta / 无能力与引用串`、
    Poison `leading=none / 551 meta / 常规 trailing`；三族行高均 68px，文档无水平溢出。
  - 720×720：三族目录宽 214px、行高仍为 68px、选中态与四槽对齐稳定，`document.scrollWidth=clientWidth=720`；
    截图人工确认无正文横跳、截断或遮挡。临时视口已 reset。
- 跳过的检查及原因：最终 editor 全量留到 Startup / Catalog / Reorder 三卡全部实现后的唯一一次执行，避免重复耗时全量。

## Review: 审查与返工

- Reviewer：Kimi + GLM
- 审查结论：Codex 对 2026-08-27 当前增量 candidate accept；2026-08-28 叠加 Field Layout 新基线后
  8 files / 105 tests 与 typecheck 仍通过。Kimi / GLM pending。
- 必须返工项：内部审计先后发现顶层漏扫、fingerprint 未绑定、reorder 禁词误伤/漏放、alias/spread 绕门、
  `leading={undefined/0}` 假阳性、空 label 不回退及装饰符号重复朗读；均已补 AST/合成负例、页面 fixture 或
  DOM 断言闭合。当前增量无遗留 blocker / high；item 缺图空白 fallback 是已登记范围外缺陷，不冒充本卡完成。
  若外部 reviewer 发现新回归则转 rework。
- Accept / rework：review（done 仍由三方 accept 门禁阻塞）。

## 用户验收

- 用户结论：2026-08-27 入口行选中表面/图标截图验收触发增量返工；用户明确要求删除没有选择价值的装饰图标。
  当前入口修复浏览器自验通过，但整卡须待 7 个同类面完成、三方 review accept 和用户最终复验后收口。
- 后续任务：N/A。

## 交接日志

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

## 下一位 Agent 提示词

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
