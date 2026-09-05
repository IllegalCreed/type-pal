# ED-AUDIT-2 - 编辑器全页面视觉、闭环与代码质量审计

Status: done
Phase: phase2
Capability: Editor cross-cutting（审计，不改变 capability-map）
Audit Owner: Codex
Reviewer: Kimi（架构/视觉）+ GLM（覆盖/测试）
Visual Verification Owner: Codex + User

## 目标

在 ED-DS-2 基础稳定后，对 `EDITOR_MODULES` 的 8 个模块、25 个二级页面做一次主动审计，不再由用户逐页
发现同类问题。审计分三条证据线：设计系统/可用性、ED-1 创建编辑保存重开引用删除闭环、代码质量与旧兼容
清理；输出可执行的优先矩阵和小批模块卡，不在本卡批量改业务实现。

## 范围与交付

- 页面矩阵：Wide/Medium/Narrow、zoom、键盘、滚动、空错加载、长文本、大列表、媒体、Inspector。
- 功能矩阵：创建、编辑、保存、重开、深链、引用、删除/阻断、undo/redo；不以截图替代。
- 质量矩阵：组件职责、状态所有权、跨包边界、重复 CSS/inline style、旧版本兼容、错误恢复与测试。
- 产出：[`editor-ui-audit-2026-08-15.md`](../../../../phase2/archive/audits/editor-ui-audit-2026-08-15.md)、页面分数表、
  浏览器证据、迁移批次和每批任务卡。
- 不做：不在审计卡内重写页面；不改变 schema/save/migration/runtime；不把 Actor 或 BattleField 当自动正确模板。

## 前提真值门

- 用户可见前提：**当前 25 个二级页的共享外壳已经大幅统一，但内嵌专业面板、长目录和旧表单/按钮仍存在
  可直接证明的跨页缺口；下一轮应按证据拆小卡，而不是重做已闭合页面。**
- 四向真值矩阵：

| 方向 | 结论 | 一手证据 |
|---|---|---|
| 原版 / primary source | N/A：作者工具视觉与可访问性不由原版游戏定义。 | 本卡不改变游戏机制、schema、save 或 runtime。 |
| 第一阶段 | N/A：第一阶段没有当前 8 模块编辑器信息架构。 | 本卡只审第二阶段 Editor。 |
| 当前第二阶段 | 8 模块、25 子页；17 canonical catalog、15 Inspector、16 引用面、6 诊断面已有静态合同，但 raw form 基线仍为 198/123/8/205，敌队 380 行一次渲染。 | `editor-navigation.ts:1-10,68-277`；`design-system/boundary.test.ts:121-214,250-268`；`EnemyTeamTab.tsx:198-232`；localhost:6010 敌队实机 DOM。 |
| 本任务目标 | 只重建审计真值与优先矩阵；不在审计卡内修改业务实现。首个建议实现批次为 Map Palette 控件，长目录性能合同另卡。 | `editor-ui-audit-2026-08-15.md` §2.1/§3.1/§3.2。 |

- 最强替代解释：最近多张统一卡已经完成，继续审计只会重复劳动。反证：`MapStampPalette.tsx:69-96,142-153`
  仍直接使用 `.in/.mini`；`DsVirtualList` 在 `design-system/virtual-list.tsx:3-59` 存在但生产零调用，而
  `EnemyTeamTab.tsx:220-230` 对 380 项直接 `map`。
- 可证伪观察：若 25 页所有专业子面板均只消费共享控件、所有大于 50 项目录都有可访问虚拟化/渐进渲染证明、
  raw controls 和旧按钮族已归零或逐项记录必要例外，则本审计可直接 done；当前不满足。

## 推进签字

### 审计方案

- Codex: **premise verified + design agree（2026-08-17，重签）**。已按当前 25 页重跑静态 census，核对
  design-system 边界合同，并在 1280/900/720 对 Map/Palette、在 1280 对 EnemyTeam 做实机复核；同意只输出
  resolved/open 矩阵与小卡顺序，不在审计卡夹带实现。旧 2026-08-15 签字随页面数和基线变化作废。
- Kimi: **premise verified + design agree（2026-08-17，本人一手读码 + 实机 + node 复算，非代理）**。
  逐项独立复核：
  - **8 模块 / 25 页 ✓**：node 解析 `editor-navigation.ts` 得 2+3+3+1+2+5+5+4=25 个 subpage；
    `enemy-team` 为首轮后新增的第 25 页（:178-182），无第 26 页。
  - **已闭合边界不重做 ✓**：U-01/02/04/05（Header/目录行/Inspector Tab/sash）与 U-03/U-09/U-12
    主对象页闭合，与本席在 ED-BATTLE-UI-1 / ED-CATALOG-CONTROLS-1 / ED-DIAGNOSTIC-UI-1 /
    ED-SCENE-UX-1 的实审证据一致；§3.1 resolved/open 划分成立。
  - **Map Palette 拆卡 ✓**：`MapStampPalette.tsx:69-96` raw `.in` 搜索/分类、`:142-153` `.mini`
    按钮逐项属实；它是 Inspector 内嵌 palette，不套带 `DsListHeader` 的目录 recipe 的边界正确
    （与 ED-CATALOG-CONTROLS-1 CK1/RK-A 的排除一致，闭合看板已登记的 palette debt）；保留 60 条
    渐进、兼容性禁用与最近排序的约束合理。
  - **长目录性能拆卡 ✓**：`DsVirtualList`（virtual-list.tsx:3-59）生产零调用（全仓仅 DesignLab
    :36,:330）；该原型只有固定 itemHeight/height、listbox/option 与 Home/End，缺方向键选择、
    `aria-selected`/`activedescendant`、受控滚动定位与动态高度——「先补可访问选择/滚动/变宽合同
    再接 380 行目录，不得 content-visibility 冒充虚拟化」的顺序正确；`EnemyTeamTab.tsx:221`
    `shown.map` 一次渲染 380 行属实（本席在 ED-ENEMY-1 实审中已实机复现该页 DOM）。
  - **GA1 独立互证 ✓**：本席独立发现同一缺口——boundary 的 `catalogFiles`（:176-195）与
    `referenceFaces`（:298-315）未含 `EnemyTeamTab.tsx`，而它已消费 `DsCatalogControls`（:199-219）
    与 `DsReferencePanel/List/Row`（:29-31,:409-445），当前实际消费者为 18/17/17/6；该页可静默
    回流。本席完全携带 GLM GA1（done 前补清单 + 修正基线数字），不另立钉。
  - **GA2 同意**：按钮 census 方法论须钉死词界/口径后才可作只减不增基线，本席无异议。
  未改任何文件，未代签 GLM，未标 build/done。
- GLM: **premise verified + design agree（2026-08-17，本人一手读码 + 独立复算，非代理；附必落钉
  GA1-GA2，不阻塞准入）**。核心数字独立复算：
  - **8/25 页面矩阵 ✓**：node 解析 editor-navigation.ts 全部 33 个 id = 8 模块 + 25 子页
    （scene 2 / map 3 / story 3 / actor 1 / item 2 / **battle 5 含新增 enemy-team** / asset 5 /
    project 4）；DataMode:266 消费 EnemyTeamTab——第 25 页来自 ED-ENEMY-1，无第 26 页。
  - **raw controls 存量 ✓（逐字吻合）**：本人 node 全量扫描生产 TSX（排除 design-system/test）得
    input=198 / select=123 / textarea=8 / label=205 / checkbox=23，与卡文完全一致；boundary
    ceiling 已同步（input 199→198，随 ENEMY-1 JSON 兜底删除）。
  - **共享门禁数字 ✓ 但有缺口（→GA1）**：boundary 清单 17 catalog / 15 inspector / 16 reference /
    6 diagnostic 与卡文一致；**但实际消费者为 18/17/17/6——EnemyTeamTab 消费 DsCatalogControls 与
    DsReferencePanel 却不在 catalogFiles/referenceFaces 清单**，卡文的"17/16 已有静态合同"是门禁数
    而非消费数，审计基线未记录这 1 个未设防页面。
  - **三个证据点 ✓**：MapStampPalette:69-96 raw `className="in"` input/select 直读属实；
    EnemyTeamTab:220-230 对 380 项 `shown.map` 直接渲染 DsCatalogRow 属实；DsVirtualList 生产零调用
    属实。
  - **旧按钮类 62/43/20/34/16/3 ±偏差（→GA2）**：本人词界正则复算得 tool=65 / btn=43 / mini=20 /
    mini-txt=33 / pv-btn=16 / mini-icon=3——tool +3、mini-txt -1，方法论未钉死导致"只减不增"基线
    不可复现。
  - design agree：拆卡顺序合理——Map Palette 先行（小而孤立，闭合 CATALOG 卡 CK1 登记的 palette
    debt）、长目录性能另卡且"先修 DsVirtualList 可访问选择/受控滚动/变宽合同再接敌队、不得
    content-visibility 冒充虚拟化"的工程顺序正确、旧控件按领域分批不开巨型卡；U-07 优先级上调有
    380 直渲染实证支撑；"审计卡不夹带业务实现"边界正确。
  - **必落钉 GA1-GA2（进 review 前补录进审计文档）**：
    - **GA1（boundary 门禁缺口记录 + 补清单）**：审计文档 §2.1 必须记录"实际消费者 18/17/17/6 vs
      门禁 17/15/16/6"差异；EnemyTeamTab 补进 boundary catalogFiles 与 referenceFaces 两清单（纯
      测试改动，可在本卡 review 阶段落或并入 ED-MAP-PALETTE-CONTROLS-1，二选一显式记录）；
      inspector 侧 EnemyTab/App scene entity 两个既有消费者入清单为可选加强项。
    - **GA2（按钮基线可复现性）**：审计文档发布按钮族 census 的精确命令/正则（含排除规则），
      使 62/43/20/34/16/3 基线可复算；本人 ±3/±1 偏差即因方法论未定义——"只减不增"门禁只有钉死
      census 方法才可证伪。
- build 准入结论：**allowed（2026-08-17）——Codex + Kimi + GLM 三方设计签字齐；GA1/GA2 为进
  review 前必落（补录审计文档与 boundary 清单），本卡进入 review 后只收审计交付，不改业务实现。**

### 完成审查

- Codex: **accept（2026-08-17，review 自验）**。GA1 已将 EnemyTeam 补进 catalog/reference 门禁，并把
  Enemy/App 补进 Inspector 门禁，静态合同与实际消费者统一为 18/17/17/6；GA2 新增只读 census 脚本，
  发布扫描范围、className 匹配器与 token 词界，输出 62/43/20/34/16/3 且 boundary ceiling 同步收紧。
  `node packages/editor/scripts/audit-legacy-controls.mjs` 与 boundary 23/23 通过，`git diff --check` 通过；
  本批未修改业务实现。
- Kimi: **accept（2026-08-17 review 终审，本人一手读码 + 独立复跑；基于候选提交 99069677）**。
  - **GA1 门禁 ✓**：node 解析 boundary.test.ts 实测 catalogFiles=18（含 EnemyTeamTab）、
    migratedInspectors=17（补 EnemyTab/App）、referenceFaces=17（含 EnemyTeamTab）、
    diagnosticFaces=6——静态门禁与实际消费者统一为 18/17/17/6；本席独立执行
    `vitest run src/ui/design-system/boundary.test.ts` → 23/23 通过。上轮我独立发现的
    EnemyTeamTab 缺口已闭合，Enemy/App Inspector 补强超出最低要求但不越界（仍是门禁清单）。
  - **GA2 口径 ✓**：本席独立执行 `node packages/editor/scripts/audit-legacy-controls.mjs`——
    输出 tool/btn/mini/mini-txt/pv-btn/mini-icon = 62/43/20/34/16/3、tags 198/123/8/205、
    checkbox 23、inline 72、raw button 331、DsButton 114/DsIconButton 53/DsActionLink 3，
    与卡文逐字一致；scope/排除规则/className 匹配器/token 词界已自文档化且与 boundary 同源，
    只减不增基线可复现可证伪。
  - **已闭合项不重开 ✓**：候选 diff 只追加 §2.1 GA1 记录与 §2.2 口径节，§3.1 resolved/open 划分与
    §3.2/§3.3 拆卡顺序（Palette 先行 → 长目录合同 → 旧控件分批）未变；候选提交仅触 docs +
    只读 census 脚本 + boundary 测试，零业务实现。
  - **拆卡顺序同意**：ED-MAP-PALETTE-CONTROLS-1 先行（闭合已登记 palette debt）、长目录性能合同
    另卡且先补 DsVirtualList 选择/滚动/变宽合同——与本席 build 前审查结论一致。
  未改任何文件，未代签 GLM，未标 done。
- GLM: **accept（2026-08-17 review 终审，本人独立运行两条命令，非代理；基于候选提交 99069677）**。
  - **GA2 独立复跑 ✓**：`node packages/editor/scripts/audit-legacy-controls.mjs` 本人执行——输出
    legacyClasses **tool=62 / btn=43 / mini=20 / mini-txt=34 / pv-btn=16 / mini-icon=3**
    （item-action-button/media-zoom-controls=0）与卡文逐字一致；tags 198/123/8/205、checkbox 23、
    inline 72、raw button 331 与 DsButton 114/DsIconButton 53/DsActionLink 3 全部吻合。脚本自文档化
    （scope 74 文件 + className 匹配器 + token 词界 `(?<![\w-])TOKEN(?![\w-])`）——本人上轮 ±3/±1
    偏差即因词界方法论未定义，现已发布且可复现，"只减不增"基线可证伪。
  - **GA1 独立复跑 ✓**：`boundary.test.ts` 本人执行 23/23 通过；EnemyTeamTab 已进 catalogFiles
    （:186）与 referenceFaces（:310），inspector 清单补入 EnemyTab + App（17 成员）——静态门禁与
    实际消费者统一为 **18/17/17/6**，且超越了 GA1 的最低要求（可选项一并落地）。
  - **审计文档同步 ✓**：editor-ui-audit §2.1 记录复核前 18/17/17/6 vs 17/15/16/6 差异（:39）、
    §2.2 发布 census 口径。
  - **审计卡纪律 ✓**：候选提交 99069677 仅触 docs + 只读脚本 + boundary 测试，零业务实现改动。
- GLM 对下一步顺序的表态：同意 §3.2——ED-MAP-PALETTE-CONTROLS-1 先行、长目录性能合同卡其次
  （先修 DsVirtualList 可访问选择/受控滚动/变宽合同再接敌队），两卡各自重新走三签。
- done 准入结论：**allowed / completed——Codex + Kimi + GLM 三方 accept 齐，用户于 2026-08-17
  明确验收通过。**

## 当前证据（2026-08-17 rebaseline）

- 更新报告：`docs/phase2/archive/audits/editor-ui-audit-2026-08-15.md`（保留首轮历史矩阵，新增 §2.1/§3.1/§3.2）。
- Chromium：localhost:6010；Map/Palette 1280×720、900×720、720×720 均无 document/body 横向溢出，
  Console warning/error 0；EnemyTeam 1280×720 实机确认 380 个对象按钮一次进入 DOM。
- 代码：`EDITOR_MODULES` 当前 8/25；GA1 修复后边界合同与实际消费者均为
  18 catalog / 17 Inspector / 17 reference / 6 diagnostic；
  raw form 198 input / 123 select / 8 textarea / 205 label / 23 checkbox；旧按钮类 62/43/20/34/16/3。
- GA2：`packages/editor/scripts/audit-legacy-controls.mjs` 固化 production TSX 排除规则、className 匹配器和
  token 词界；同一输出同步收紧 `boundary.test.ts` 的只减不增 ceiling。
- `MapStampPalette.tsx:69-96,142-153` 仍是 raw `.in/.mini`；`DsVirtualList` 生产零调用。
- 用户 2026-08-15 追加执行裁决：角色标题、技能、敌人等页面要作为统一重构连续推进；Agent 主动审查全部
  页面，不得把 foundation 单点纠错当作停止点，也不得等待用户逐页点名。

## 下一步

1. 本卡审计、三方完成审查与用户验收均已完成，不再追加业务实现。
2. 后续按审计结论进入独立任务 `ED-MAP-PALETTE-CONTROLS-1`；该卡须重新完成自己的三方设计签字。

## 用户验收

- 用户结论：**accept（2026-08-17：“验收通过”）**
- 后续任务：按既定顺序进入 `ED-MAP-PALETTE-CONTROLS-1`。

## 交接日志

- 2026-08-17 Codex：完成二次基线。Evidence：8/25 路由；17/15/16/6 共享覆盖；198/123/8/205、
  23 与 62/43/20/34/16/3 存量账；Map 1280/900/720 零溢出/零 Console；Palette raw control 与
  EnemyTeam 380 DOM 行直接复现。Next：Kimi/GLM 只读审查；不得改业务实现。
- 2026-08-17 Kimi：架构/视觉审查签 premise verified + design agree。8/25 页面 node 复算吻合；
  已闭合项（U-01/02/04/05、U-03/09/12 主对象页）与本席前四张卡实审一致，不重做；Map Palette
  拆卡边界正确（Inspector 内嵌 palette 不套目录 recipe，闭合 palette debt）；长目录性能拆卡顺序
  正确（DsVirtualList 生产零调用且缺选择/滚动/变宽合同，先补合同再接 380 行目录）。
  **独立发现与 GLM GA1 相同的 boundary 缺口**（EnemyTeamTab 未入清单，实际消费者 18/17/17/6），
  双向互证成立，携带 GA1 不另立钉；GA2 按钮口径钉死同意。未改文件，未标 build/done。
  Next：Codex 补录 GA1/GA2 后本卡进 review（只收审计交付）。
- 2026-08-17 GLM（覆盖/测试）：审查完成，签 **premise verified + design agree（附 GA1-GA2）**。
  独立复算：8/25 页面矩阵（enemy-team 第 25 页来自 ED-ENEMY-1）、raw controls 198/123/8/205/23
  逐字吻合、boundary ceiling 已同步、三个证据点（palette raw/380 直渲染/VirtualList 零调用）
  全部属实。**两项发现**：①实际共享消费者 18/17/17/6 vs 门禁 17/15/16/6——EnemyTeamTab 未入
  catalog/reference 门禁清单（GA1：记录差异 + 补清单）；②旧按钮 census 方法论未定义，本人复算
  ±3/±1 偏差，"只减不增"基线不可复现（GA2：发布精确 census 命令）。拆卡顺序同意（Palette 先行、
  长目录性能合同另卡且合同先行）。未改实现文件，未代签 Kimi，未标 build/done。
  Next：Codex 补录 GA1/GA2 进审计文档；Kimi 签字后进 review。
- 2026-08-17 Codex：GA1/GA2 已落地并进入 review。GA1 将 boundary 从 17/15/16/6 补齐到实际消费者
  18/17/17/6；GA2 新增 `audit-legacy-controls.mjs` 固化范围/正则/词界并同步收紧 legacy ceiling。
  census 输出吻合，boundary 23/23、diff check 通过。未改业务实现。Next：Kimi/GLM implementation accept。
- 2026-08-17 GLM（覆盖/测试）：review 终审完成并签 **accept**。两条命令本人独立运行：census 脚本
  输出 62/43/20/34/16/3 及全部辅助数字与卡文逐字一致、脚本自文档化可复现（GA2 闭环，上轮 ±3/±1
  偏差源于词界方法论、现已钉死）；boundary 23/23 通过、EnemyTeamTab 入 catalog/reference 两清单
  且 inspector 补入 EnemyTab/App（18/17/17/6 与实际消费者统一，超越 GA1 最低要求）。候选提交零业务
  实现改动，审计卡纪律保持。同意 §3.2 后续顺序。未改实现文件，未代签 Kimi，未标 done。
  Next：Kimi accept 后本卡 done，随即开 ED-MAP-PALETTE-CONTROLS-1。
- 2026-08-17 Kimi：review 终审完成并签 **accept**。一手读码 + 独立复跑：node 解析 boundary 实测
  18/17/17/6（EnemyTeamTab 入 catalog/reference 两清单、EnemyTab/App 补 Inspector）、boundary
  23/23 通过；census 脚本本席独立执行，62/43/20/34/16/3 与全部辅助数字逐字吻合、口径自文档化
  且与 boundary 同源（GA2 闭环）；候选 diff 零业务实现、§3.1 闭合划分与 §3.2/§3.3 拆卡顺序未变
  （已闭合项不重开）。同意 Palette 先行 + 长目录合同先行的后续顺序。未改任何文件，未标 done。
  Next：三方 accept 齐，仅剩用户验收；用户通过后本卡 done 并正式开 ED-MAP-PALETTE-CONTROLS-1。
- 2026-08-17 User + Codex：用户明确“验收通过”；三方 done 前 `accept` 与用户验收全部齐备，任务由
  `review` 转 `done`。无返工项；后续任务 `ED-MAP-PALETTE-CONTROLS-1` 独立重新走三方签字。

## 下一位 Agent 提示词

无下一位 Agent 提示词；ED-AUDIT-2 已完成三方 review `accept` 与用户最终验收，整卡收口。
后续 `ED-MAP-PALETTE-CONTROLS-1` 使用其独立任务卡与签字，不沿用本卡授权。
