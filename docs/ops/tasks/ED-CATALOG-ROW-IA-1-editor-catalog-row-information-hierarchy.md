# ED-CATALOG-ROW-IA-1 - 编辑器对象目录行信息层级收口

Status: draft（2026-08-25 设计三签齐；等待 Coding Owner 排期）
Phase: phase2
Capability: Editor cross-cutting（不改变 capability-map）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: `codex/ed-audio-workbench-1`

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
- 代表场景：PAL 战场 `#006`、物品 `61 观音符`、毒 `551 赤毒` 在默认宽度与窄侧栏中的目录行。
- 用户裁决：2026-08-25 用户明确要求战场 ID 回归普通层级、物品目录降噪，并要求把结论正式落成任务卡防遗忘。

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

### 进入 build 前：设计签字

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

### 进入 done 前：审查签字

- Codex: pending
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
- 修改文件：pending
- 实现摘要：pending
- 运行命令：pending
- 浏览器 / 手工检查：pending
- 跳过的检查及原因：pending

## Review: 审查与返工

- Reviewer：Kimi + GLM
- 审查结论：pending
- 必须返工项：pending
- Accept / rework：pending

## 用户验收

- 用户结论：已批准设计方向，待实现后视觉验收。
- 后续任务：N/A。

## 交接日志

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
当前状态：draft；Codex、Kimi、GLM 设计三签齐，build 准入已开放
你的角色：Codex（唯一 Coding Owner）
先读：AGENTS.md、docs/phase2/READ-FIRST.md、本任务卡、editor-design-system-v1.md:53-91,404-411、
      ED-DS-3、ED-CATALOG-CONTROLS-1、ED-5I:95-100，以及 BattleFieldTab/ItemTab/PoisonTab 锚点
已完成：用户已裁决战场 ID 回归 meta、物品降噪、毒无图标保持；三方 premise verified + design agree；
        Kimi 已核 24 个生产消费点，GLM 已核 21 文件消费域，并冻结 KC1-KC2 / GRow1-GRow2
请你做：生成完整采用矩阵；落实战场 ID meta、物品能力/引用降噪与待迁移 trailing DsTag；保持毒无伪图标；
        逐条裁决音频引用数 trailing、ActorMode emoji fallback，并建立同族 data-leading 一致性机检
不要做：不得重开已完成旧卡；不得修改 schema、引用真值、筛选逻辑或公共 DsCatalogRow API；不得机械删除
        对选择任务确有帮助的信息
输出要求：独立提交；聚焦测试、最小功能界面验证与 Build / Review 证据；实现后转 review，等待三方 accept
```
- 2026-08-25 GLM（全量消费覆盖）: 审查完成，签 **premise verified + design agree（附
  GRow1-GRow2）**。21 文件全消费面 census（比卡文锚点 6 文件广 3.5 倍）；三点名页错位/
  过载/基线实锤；未点名抽查 4 面大多已合规（EnemyTeam⚔/Skill/Actor 均不违反）——规则
  不机械删信息但矩阵必须以 21 文件为输入域（GRow1）；Item 待迁移须移入 trailing DsTag
  而非删除（GRow2）。未改实现，未代签 Kimi。
