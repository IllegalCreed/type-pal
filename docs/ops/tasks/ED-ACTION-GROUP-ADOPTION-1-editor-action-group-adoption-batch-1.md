# ED-ACTION-GROUP-ADOPTION-1 - 同项动作组采用第一批（战斗 / 毒回合；项目设置 / 入口点）

Status: draft
Phase: phase2
Capability: Editor design system adoption（不改变 capability-map）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: `main`
Target Design-System Version: `2.22.0`（采用既有合同，不升版）

## 目标

把两个真正低风险的旧动作包装迁移到现有 `DsActionGroup`：“战斗 / 毒”的玩家/敌人回合规则
（上移 / 下移 / 删除）和“项目设置 / 入口点”（上移 / 下移）。复用现有 `DsReorderMoveButton`、
`DsIconButton` 与 reorder owner，只统一动作组
的 32×32px 命中区、4px 间距、不可拆布局和焦点边界；不改变任何排序、删除、命令或数据语义。

## 范围

- 范围内:
  - “战斗 / 毒”的回合规则（`poison/ticks/actions`）：`.ef-ops` wrapper 改为
    `DsActionGroup density="compact"`，保留 danger 删除。
  - “项目设置 / 入口点”（`project/entry-points/actions`）：`.project-entry-row-actions` wrapper
    改为 compact ActionGroup。
  - 删除两处业务 class 对 `display/gap/flex/尺寸` 的私有所有权，只保留父布局需要的 grid-column /
    justify-self 等整体放置规则。
  - 更新 action-group registry / CLI/Vitest census、边界测试、业务行为测试与浏览器证据。
  - 同版修订 DS-C.2a 的采用数字：8 groups / raw 30 / 15 candidates → 10 groups / raw 26 /
    13 candidates；同步 boundary 精确断言，但设计系统版本保持 2.22.0。
- 范围外:
  - 第二批几何敏感面：“资源 / 帧动画”的时间线、“地图编辑 / 图层列表”、“资源 / 大世界精灵 /
    预制动作目录”。
  - 第三批 9 个复杂动作区：casualty×2、cutscene、EffectEditorCard、startup party、script scheme、
    canonical/legacy script rail、sprite steps。
  - 不新增组件、不修改 `DsActionGroup` / `DsReorderMoveButton` API，不升设计系统版本。
  - 不修改 button label/type/variant/disabled/onClick、reorder handler、itemKey、scopeKey、adoptionId、
    command、history、schema、content/runtime 或项目数据。
- 明确不做:
  - 不把全部 14 个 deferred 一次机械包组。
  - 不顺手处理帧卡 overflow、地图图层状态按钮、Inspector focus inset 或旧脚本动作语义。

## 前提真值门

### 一句话行为 / 工程前提

这两处已经使用正式移动按钮和稳定 reorder owner，唯一缺口是外层仍由业务 class 持有 2px 私有间距或裸 flex；
把 wrapper 换成现有 compact `DsActionGroup` 并清掉私有几何即可完成采用，命令和数据层不需要也不允许变化。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：纯二阶段作者工具动作布局，不涉及原版游戏行为。 | `docs/phase2/READ-FIRST.md:8-10,20` |
| 第一阶段 | N/A：第一阶段没有当前编辑器设计系统动作组。 | `CLAUDE.md:5-12` |
| 当前二阶段 | `DsActionGroup` v2.22.0 已冻结 compact 32×32 / 4px / nowrap；两处仍登记 deferred。 | `docs/phase2/editor/editor-design-system-v1.md:429-453`；`packages/editor/src/ui/design-system/action-group-adoption.json:3-8,166-175,215-224` |
| 本任务目标 | 两处转 adopted；其余 13 个 candidate 原样保留并重新精确计数。 | 本卡 `:109-143`；`docs/ops/board.md:27`；用户 2026-09-01 裁决 |

### 两处直接证据

1. **“战斗 / 毒”的玩家/敌人回合规则**
   - 真实 DOM：`PoisonTab.tsx:108,148-165`，父 `DsRepeatRow density="compact"` 内是 2 枚
     `DsReorderMoveButton` + 1 枚 danger `DsIconButton`，已经是 pure-icon 单一模式。
   - 业务 owner：`TicksEditorView.reorder` 继续调用 `reorderDsItems/useDsReorderKeys/onChange`
     （`PoisonTab.tsx:184-207`）；玩家/敌人 ticks 分别沿 `patchPlayer/patchEnemy → patch →
     UpdatePoisonCommand` 提交（`PoisonTab.tsx:418-430,573-589`），最终命令路径不在 wrapper。
     现有排序单命令/token/undo-redo 证据为 `PoisonTab.test.tsx:235-286`。
   - 私有缺口：`.ef-ops { display:flex; gap:2px; flex:none }` 与 1px 光学校正；520/360 容器已把整个
     `.ef-ops` 放到同一 grid column（`editor.css:9161-9230`）。按钮因父 RepeatRow 已是 32px，迁移主要
     收口 gap/owner。
2. **“项目设置 / 入口点”**
   - 真实 DOM：`ProjectWorkbenchTab.tsx:1948-1982`，每项只有 2 枚正式 move button。
   - identity / command：`useDsReorderKeys(entryPoints, entry.id)`；`reorderEntries → commit →
     SetStartupEntriesCommand`（`ProjectWorkbenchTab.tsx:1723-1724,1763-1765,1900-1905`）。
   - 私有缺口：`.project-entry-row-actions` 只有 flex + 2px gap；父 `.project-entry-item-content` 已有
     `minmax(0,1fr) auto` 与 4px inline-end inset，恰好容纳 2px ring + 2px offset
     （`editor.css:1672-1682`）。

### 反证与替代解释

- “14 处都包含移动按钮，一卡机械包完最省事”不成立：其余面存在文字/图标混用、详情/当前状态、
  hover-only、20×18px 旧按钮、固定卡片裁切、状态按钮混高或 Inspector overflow。
- “首批仍做 5 处”也不够严谨：帧动画必须解决固定 102px 卡片 `overflow:hidden` 的 focus containment；
  地图图层若只迁移动作会留下显示/锁定 30px 与移动 32px 混高；精灵动作目录需补 Inspector 尾部 inset 与
  proof-disabled 原因。这三处转第二批。
- 会推翻本卡前提的观察:
  - 实现需要改任一按钮 type/label/variant/disabled/onClick 或 reorder/command owner。
  - 移除“战斗 / 毒”回合规则的 1px margin 后字段与动作底线真实错位，无法由公共
    align/placement 闭合。
  - “项目设置 / 入口点”的长名称/ID 在 320/240px 目录下被动作组压成不可识别，或 focus 外扩越过 item。
  - registry 复算不等于本卡冻结的新基线。

### 用户可见偏离

- 是否主动偏离已核真值: yes（仅视觉/命中区统一，业务行为不变）
- `before -> after`:
  - “战斗 / 毒”回合规则：32px 按钮 + 2px 私有间距 → 32px 按钮 + 公共 4px 间距，整组下沉逻辑不变。
    同时取消业务层 1px optical margin，由父 align + 公共 root 持有底线；真实多档失败则转 rework，
    不用私有 margin 回补。
  - “项目设置 / 入口点”：30px 按钮 + 2px 私有间距 → 32px 按钮 + 公共 4px 间距，目录身份与排序不变。
- 代表场景: “战斗 / 毒”的玩家/敌人回合规则；“项目设置 / 入口点”的入口目录。
- 用户裁决: **approved（2026-09-01）**——用户明确把是否分批交由 Codex 判断；Codex依据直接审计选择
  三批推进，并先开这两个低风险面。

## 上下文锚点

- `docs/phase2/READ-FIRST.md`
- `docs/ops/tasks/ED-ACTION-GROUP-SPEC-1-editor-action-group-contract.md`
- `docs/phase2/editor/editor-design-system-v1.md` DS-C.2a / DS-C.4d / RF-27
- `packages/editor/src/ui/design-system/action-group-adoption.json`
- `packages/editor/src/ui/PoisonTab.tsx:100-207`
- `packages/editor/src/ui/ProjectWorkbenchTab.tsx:1723-1724,1763-1765,1900-1982`
- `packages/editor/src/ui/editor.css:1672-1682,9161-9230`
- 不得重新引入：业务 gap/尺寸 owner、内部 wrap、raw glyph 按钮、label/handler 漂移。

## 设计方案

1. 两个 wrapper 改用现有 `<DsActionGroup density="compact" className="…">`；子按钮逐字保留。
2. “战斗 / 毒”回合规则删除 `.ef-row .ef-ops` 的 1px optical margin 与 `.ef-ops` 的
   display/gap/flex；保留 520/360
   query 的 `grid-column/justify-self` 整组放置。若视觉实测底线失败则本卡转 rework，不以私有 margin 回补。
3. “项目设置 / 入口点”删除 `.project-entry-row-actions` 私有规则；父 grid/inset 原样。
4. registry 把两个 deferred 移入 adopted，静态字段均为 `compact / icon-only / moveButtonCount:2`。
5. 新基线必须精确为：**10 groups / 46 move buttons / 20 adopted moves / 26 raw moves /
   13 candidates（1 equivalent + 12 deferred + 0 N/A）**。所有既有负例继续工作，并补两项 stale/
   wrapper regression。
6. 同版更新设计规范 DS-C.2a 的当前采用 census 与 boundary 文案断言为 10 / 26 / 13；不升 DS 版本，
   因为这是 v2.22.0 既有 pattern 的采用，不是新 API/布局档位。

## 验收条件

- 功能:
  - 两处 button 标签、disabled、方向、危险语义、handler 与顺序不变。
  - “战斗 / 毒”新增删除玩家/敌人回合测试：每次删除只增加 1 history，另一序列不变，undo/redo 精确复原；
    “项目设置 / 入口点”移动仍一次 `SetStartupEntriesCommand`，稳定 entry id、`defaultEntryId` 与选中项不变。
- 几何 / a11y:
  - 每枚按钮 32×32；group `scrollWidth === clientWidth`；同组 top 一致。
  - 按钮 border box 位于 group 内；4px focus 外扩位于 item / 最近非裁切 owner 内。
  - “战斗 / 毒”760/520/360/320 容器整组不拆；“项目设置 / 入口点”在 480/320/240px 目录下，
    CatalogRow 正文可用宽度至少 96px，title/meta 各有正宽并至少可见若干字符，完整长中文名与 64 字符 ID
    仍保留在 DOM/accessible name；动作组不覆盖正文，group 与目录 owner 横向溢出均为 0。
  - icon-only 继续有具体 aria-label + tooltip，SVG hidden；“战斗 / 毒”删除保持 danger。
- registry / 门禁:
  - 10/46/20/26/13 与 1 equivalent +12 deferred 精确；其它 12 deferred 生产 DOM 零改。
  - 除本卡两处外的其余 13 个 candidate surfaces（1 equivalent + 12 deferred）生产 DOM/CSS 全部零改。
  - 两个业务 class 不再持有 display/gap/wrap/尺寸；只允许“战斗 / 毒”回合规则的响应式 placement。
- 测试:
  - action-group adoption/CLI gate、boundary、Poison、ProjectWorkbench、reorder adoption 聚焦；typecheck。
  - Editor 受影响包全量只跑一次。
- 视觉:
  - 真实“战斗 / 毒”与“项目设置 / 入口点”在 1280/720；再以真实页面或挂载真实业务组件 + 生产 CSS
    的 fixture 覆盖 520/360/320/240。Design Lab 只能补充，不能代替两套真实父布局证据。
  - 真实 200% 无法可靠触发时继续明写未实测，不用 pinch/pageScaleFactor 冒充。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: **verified（2026-09-01）**——逐行核 Poison / Project wrapper、父布局、registry、handler 与
    command owner；并用 Frame/Layer/Sprite 的裁切/混高/Inspector 反证否决首批 5 处。
  - design: **agree（2026-09-01）**——第一批仅迁两个低风险面；复用既有组件，冻结 10/46/20/26/13；
    不改按钮/命令/数据，不升版本。
- Kimi:
  - premise: **verified（2026-09-01，本人逐行直读两处 DOM/CSS/command owner、三处另批问题与
    registry 算术，非复述 Codex）**：
    1. **两处确为机械迁移面**:poison/ticks——`.ef-ops`(PoisonTab.tsx:148-165）内恰 2 枚
       `DsReorderMoveButton` + 1 枚 danger `DsIconButton`（纯图标单一模式），私有几何仅
       `display:flex; gap:2px; flex:none`(editor.css:9205-9209)+ 1px optical margin
       (editor.css:9167-9170);reorder 经 `TicksEditorView.reorder`(PoisonTab.tsx:184-207)→
       patchPlayer/patchEnemy → UpdatePoisonCommand(:418-430,573-589),wrapper 不在命令路径上。
       project/entry-points——`.project-entry-row-actions`(ProjectWorkbenchTab.tsx:1978-1981）
       恰 2 枚正式 move button，私有规则仅 `display:flex; gap:var(--ds-space-1)`
       (editor.css:1672-1676);父 `.project-entry-item-content` 已持
       `minmax(0,1fr) auto + 4px inline-end inset`(editor.css:1677-1683);identity/command 经
       `useDsReorderKeys(entry.id)` → `reorderEntries` → `SetStartupEntriesCommand`。
       两处按钮 label/variant/disabled/handler/itemKey/scopeKey/adoptionId 均无需改动。
    2. **5→2 收窄成立（三处另批各有实锤）**:
       - 帧动画：时间线帧卡为固定 `width: 102px` + `overflow: hidden`(editor.css:8013-8064
         区域）——包组后 focus 外扩矩形必然被卡片裁切，须先做 focus containment 设计;
       - 地图图层：行内显示/锁定状态按钮为 30px 档，移动组为 32px——只迁移动作会留下
         30/32 混高行，须同批决定状态按钮档位;
       - 精灵动作目录：目录行尾部在 Inspector 窄宽被裁切，且需 proof-disabled 原因,
         超出 wrapper 替换。
       “更小边界”（先迁这三处再补视觉）只会把已知违规带进 2.22.0——收窄到 2 处才是最小安全面。
    3. **1px optical margin 风险有界**:`.ef-row` 由 DsRepeatRow 的 `align-items:center` 持有,
       32px 组与 30px compact 字段天然居中——移除 1px margin 后底线差为居中自洽的 ±0.5px,
       卡面已钉 1280/720 与 520/360/320 实测及“失败转 rework 不以私有 margin 回补”的诚实退路,
       不构成 counter;520/360 placement 规则（`.ef-ops` 整组 `grid-column:2; justify-self:end` /
       `1 / -1`,editor.css:9211-9223）与 DS-C.2a 父 relocation 模式一致。
    4. **入口点窄宽语义闭合可验证**:240px 目录下正文 = 240 − 动作组(68) − 4px inset − 行内距
       ≈ 130px ≥ 96px,算术成立;长名称/64 字符 ID 保留在 DOM/accessible name 的验收与
       focus 外扩归属已在卡面冻结。
    5. **registry 算术本人复算**:8+2=**10 groups**;46 moves 不变;adopted 16+4=**20**
       （毒 2 + 入口 2);raw 30−4=**26**;candidates 15−2=**13**;deferred 14−2=**12**,
       equivalent 1、N/A 0——与卡面冻结基线逐字一致。其余 13 candidates 本卡零 DOM/CSS diff
       的范围声明与证据相容。DS-C.2a census 文案与 boundary 断言同版更新不升版成立——
       这是 v2.22.0 既有 pattern 的采用而非新合同（DS-G.4 适用）。
    6. **可推翻观察**:实现若改动任一按钮 type/label/variant/disabled/onClick 或 reorder/command
       owner;若移除 1px margin 后 760/520/360/320 实测底线真实错位;若 240px 下长名/ID 被压成
       不可识别或 focus 外扩越界;若 registry 复算不等于 10/46/20/26/13 + 1+12——任一本签字失效。
  - design: **agree（2026-09-01，附 KB1-KB5 必落钉）**：
    - **KB1（机械边界钉）**:两处仅替换 wrapper 为 `DsActionGroup density="compact"` 并删除
      `.ef-ops` 的 display/gap/flex 与 `.project-entry-row-actions` 私有规则;520/360 的
      grid-column/justify-self 整组 placement 与父 grid/4px end inset 原样保留——业务 class
      从此只持放置、不持几何。
    - **KB2（批次纪律钉）**：帧动画（102px overflow-hidden focus 裁切）、图层（30/32 混高须
      同档裁决）、精灵动作目录（Inspector 尾部 inset + proof-disabled 原因）转第二批;
      其余 9 面第三批;**不得以“顺手”名义在本卡夹带**,registry 其余 13 candidates 生产零 diff。
    - **KB3（底线实测钉）**:“战斗 / 毒”移除 1px optical margin 后,必须在 1280/720 与
      520/360/320 实测字段/动作底线;失败即转 rework 且不得回补私有 margin。
    - **KB4（入口点语义钉）**:240px 下 title/meta 可用宽 ≥96px、各有正宽且可见若干字符,
      完整长中文名与 64 字符 ID 保留于 DOM/accessible name;动作组不覆盖正文,group 与目录
      owner 横向溢出均 0;focus 外扩矩形落在 item/最近非裁切 owner 内。
    - **KB5（基线与版本钉）**:registry 冻结为 **10 groups / 46 moves / adopted 20 / raw 26 /
      candidates 13(1 equivalent + 12 deferred + 0 N/A)**;两个 deferred 转 adopted 的静态字段
      恰为 `compact / icon-only / moveButtonCount:2`;既有负例继续有效并补两项 stale/wrapper
      regression;DS-C.2a census 文案与 boundary 断言同版同步,**不升设计系统版本**。
- GLM:
  - premise: **verified（2026-09-01，两处 DOM/命令路径/私有几何、三处另批反证与 registry 算术全部
    本人一手直读复算，非复述 Codex/Kimi；与 Kimi 逐数收敛）**：
    1. **poison/ticks 机械面实锤**：`DsRepeatRow density="compact"` 内 `.ef-ops` span 恰 2 枚
       `DsReorderMoveButton`（上移/下移回合 N）+ 1 枚 danger `DsIconButton`（删除回合 N）——纯图标
       单一模式（PoisonTab.tsx:148-165 本人直读）；私有几何恰 `.ef-ops { display:flex; gap:2px;
       flex:none }`（editor.css:9205-9209）+ `.ef-row .ef-ops { margin-bottom:1px }` 光学校正
       （:9168-9170）；520/360 query 只持 `grid-column/justify-self` placement（:9218-9231）——
       KB1「删几何留放置」可精确执行。命令路径 wrapper 外：`TicksEditorView.reorder` →
       reorderDsItems/keys/onChange → `patchPlayerTicks/patchEnemyTicks → patch →
       UpdatePoisonCommand`（:184-207, :418-430, :573-589 直读）；既有单命令/undo-redo 测试锚点
       在 PoisonTab.test.tsx:235+（本人确认存在）。
    2. **project/entry-points 机械面实锤**：`.project-entry-row-actions` span 恰 2 枚正式 move
       button（ProjectWorkbenchTab.tsx:1978-1981），私有规则恰 `display:flex; gap:
       var(--ds-space-1)`（editor.css:1672-1676）；父 `.project-entry-item-content` 已持
       `minmax(0,1fr) auto + inline-end space-2`（:1677-1683）；identity/command
       `useDsReorderKeys(entry.id)` → reorderEntries → `SetStartupEntriesCommand`（:1764）。
    3. **registry 新基线算术本人复算**：8+2=**10 groups**；46 moves 不变（按钮只在 raw↔adopted 间
       转移）；adopted 16+2×2=**20**；raw 30−4=**26**；candidates 15−2=**13** =
       **1 equivalent + 12 deferred + 0 N/A**——与本人在 SPEC 卡独立复算的 8/46/16/30/15 基线
       自洽。第二批 3 + 第三批 9 = 12 留存 deferred，**无漏分**（casualty×2/cutscene/
       EffectEditorCard/startup party/script scheme/canonical/legacy/sprite steps 恰 9）。
    4. **三处转第二批反证本人复核**：帧动画 `.fa-frame` 固定 `width:102px; height:122px;
       overflow:hidden`（editor.css:8016-8024 直读）——包组后 4px focus 外扩必被裁切实锤；
       图层行 lock/unlock 为 standalone `DsIconButton size="compact"`（30px 档，
       LayerStackControls.tsx:150-158 直读）与组 compact 32px 混高实锤；精灵目录 Inspector
       尾部 inset + proof-disabled（registry reason 一致）。「先迁再补视觉」会把已知违规带进
       采用面——收窄到 2 处是最小安全面。
    5. **版本判断**：v2.22.0 既有 pattern 的采用 + census 文案/boundary 断言同版更新，非新
       API/合同——DS-G.4 不升版成立；240px 算术（240−68−4−行距 ≈ 130 ≥ 96）自洽。
    6. **可证伪观察**：实现改任一按钮 type/label/variant/disabled/onClick 或 reorder/command
       owner；移除 1px margin 后 760/520/360/320 实测底线错位且公共 align 不能闭合；240px 下
       长名/64 字符 ID 不可识别或 focus 越界；registry 复算 ≠ 10/46/20/26/13 + 1+12——任一
       本签字失效。
  - design: **agree（2026-09-01，附 GM-P1~GM-P4 必落钉；与 Kimi KB1-KB5 收敛互补）**：
    - **GM-P1（新基线 + 零 diff 机器证明钉，同 KB5）**：registry 冻结
      **10/46/20/26/13（1 equivalent + 12 deferred + 0 N/A）**；两个转 adopted 条目静态字段恰
      `compact / icon-only / moveButtonCount:2`；**其余 13 candidates 生产 DOM/CSS 零 diff 必须
      机器证明**——build diff 范围断言只允许两处 TSX + 对应 editor.css 几何行 + registry/规范/
      测试文件，任何第三文件红；`.ef-ops` / `.project-entry-row-actions` 残留 display/gap/flex/
      尺寸声明由 boundary/audit 负例钉死（placement 规则白名单除外）；补两项 stale/wrapper
      regression 负例。
    - **GM-P2（命令语义零变化测试钉）**：poison 玩家/敌人删除各自恰 +1 history 且**另一序列
      不变**（playerTicks/enemyTicks 互不污染）、undo/redo 精确复原；entry-points 移动恰一次
      `SetStartupEntriesCommand`、全部 entry.id 顺序、`defaultEntryId` 与选中项不变——沿既有
      PoisonTab reorder-family 测试形态扩展，不新建命令。
    - **GM-P3（批次纪律钉，同 KB2）**：第二批三面与第三批九面在本卡**零触碰**（含 CSS）；
      帧动画/图层/精灵目录的 focus 裁切、30/32 混高、Inspector 尾部问题留给
      ADOPTION-2 逐面设计，不得以「顺手」夹带。
    - **GM-P4（实测与诚实口径钉，同 KB3/KB4）**：毒页移除 1px optical margin 后 1280/720 +
      520/360/320 底线实测，失败转 rework 不回补私有 margin；入口点 240px 目录 title/meta
      ≥96px、完整长中文名与 64 字符 ID 留在 DOM/accessible name、focus 外扩归属、双溢出 0；
      200% zoom 无法可靠触发时保持「未实测」，不以 pinch/等效冒充。
- 独立反证审查:
  - 审查者: Kimi（2026-09-01，完成——本人逐行直读 DOM/CSS/命令路径与算术）；
    GLM（2026-09-01，完成——两处 DOM/私有几何/命令路径、三处另批反证（.fa-frame 102px
    overflow-hidden / standalone compact 30px 混高 / sprite Inspector 尾部）、registry 新基线
    10/46/20/26/13 与批次清单 3+9=12 全部本人一手复算；两席独立取得后收敛）。
  - 直接证据: `PoisonTab.tsx:108-166,184-207,418-430,573-589`、`editor.css:1672-1683,9161-9230`、
    `ProjectWorkbenchTab.tsx:1948-1985`、`editor.css:8016-8024`（帧动画固定卡）、
    `LayerStackControls.tsx:150-169`（standalone compact 30px）、
    `action-group-adoption.json` 基线算术。
  - 可证伪观察: 见 Kimi 签节第 6 条与 GLM 签节第 6 条（按钮/owner 漂移、底线错位、240px 语义
    失败、基线不等）。
- counter / 分歧处理: none（Kimi KB1-KB5 与 Codex 设计一致，GLM GM-P1~P4 收敛，无 counter）
- 缺签豁免: N/A
- build 准入结论: **allowed（签字面）（2026-09-01，Codex + Kimi（KB1-KB5）+ GLM（GM-P1~P4）
  三方 premise verified + design agree 齐、无 counter；用户 2026-09-01 已裁决分批授权。Codex
  开工时状态转 build，仍为唯一 Coding Owner。）**

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- 用户验收: pending
- done 准入结论: blocked

## Draft / Build / Review 证据

- Draft: Codex 已完成 14 deferred 分层审计并把首批从 5 处收窄为 2 处；未修改实现。
- Build: pending
- Review: pending

## 后续批次

- `ED-ACTION-GROUP-ADOPTION-2`：“资源 / 帧动画时间线”“地图编辑 / 图层列表”“资源 / 大世界精灵 /
  预制动作目录”三个几何敏感面。
- `ED-ACTION-GROUP-ADOPTION-3`：剩余 9 个含混合语义、旧按钮或特殊 reveal 的动作区。

## 交接日志

- 2026-09-01 GLM: 独立直读两处机械面（毒 `.ef-ops` 2 move + 1 danger 纯图标、私有几何恰
  flex/2px/1px 光学 margin、520/360 仅 placement；入口 `.project-entry-row-actions` 恰 2 move、
  私有恰 flex/space-1、父 grid/inset 已备）、命令路径（UpdatePoisonCommand /
  SetStartupEntriesCommand 均 wrapper 外）、三处第二批反证（.fa-frame 102px overflow-hidden、
  standalone compact 30px 与组 32px 混高、sprite Inspector 尾部）与 registry 新基线
  10/46/20/26/13 + 1 equivalent + 12 deferred（3+9=12 无漏分）。签 premise verified +
  design agree，附 GM-P1（新基线 + 13 candidates 零 diff 机器证明 + 业务类几何清零负例）/
  GM-P2（毒双序列删除互不污染 + 入口语义不变测试钉）/GM-P3（批次纪律零夹带）/GM-P4（1px
  margin 底线实测 + 240px 语义 + 200% 未实测口径）。未修改实现，未代签 Kimi。三签齐且用户
  分批裁决在案，build 准入（签字面）allowed。Next: Codex 按钉 build。
- 2026-09-01 Kimi: 独立直读两处迁移面（毒 `.ef-ops` 与入口 `.project-entry-row-actions` 的
  DOM/私有几何/命令路径）、三处另批实锤（帧动画 102px overflow-hidden focus 裁切、图层 30/32
  混高、精灵目录 Inspector 尾部裁切）、毒 1px optical margin 的居中自洽性与 520/360 placement、
  入口 240px ≥96px 算术与 registry 新基线（10/46/20/26/13 + 1+12，本人复算一致）。签 premise
  verified + design agree，附 KB1 机械边界 / KB2 批次纪律 / KB3 底线实测 / KB4 入口语义 /
  KB5 基线与版本不升五钉，完成独立反证。未修改实现，未代签 GLM。Next: GLM 核 census/测试矩阵/
  零 diff 后三签齐，Codex 方可 build。
- 2026-09-01 Codex: 用户把分批判断交由 Codex。三路只读审计后确认“战斗 / 毒”回合规则与
  “项目设置 / 入口点”为真正机械采用；“资源 / 帧动画”“地图编辑 / 图层列表”“资源 / 大世界精灵 /
  预制动作目录”分别存在 focus 裁切、30/32 混高与 Inspector 边界，故改为三批并先开本卡。未修改实现。
  Next: Kimi 独立审架构/视觉范围；三签齐前不得 build。

## 下一位 Agent 提示词

```text
审签 ED-ACTION-GROUP-ADOPTION-1（GLM 席，draft；生产实现只读，只允许更新任务卡签字/交接）。

任务卡：docs/ops/tasks/ED-ACTION-GROUP-ADOPTION-1-editor-action-group-adoption-batch-1.md
当前状态：draft；Codex + Kimi（KB1-KB5）已签；你的 GLM premise/design pending。三签齐前不得实现。

先读：AGENTS.md、docs/phase2/READ-FIRST.md、上一卡 ED-ACTION-GROUP-SPEC-1、设计规范
DS-C.2a/DS-C.4d/RF-27、action-group-adoption.json、本卡全部签节（含 Kimi 独立证据）。

你的分工（独立证据，不复述 Codex/Kimi）：
1. 复算迁移后 registry 新基线：10 groups / 46 moves / adopted 20 / raw 26 / candidates 13，
   disposition 1 equivalent + 12 deferred + 0 N/A；两个转 adopted 面的静态字段
   （compact / icon-only / moveButtonCount:2）与两处 business class 不再持 display/gap/wrap/尺寸
   的门禁断言；其余 13 candidates（含 equivalent）生产 DOM/CSS 零 diff 的机器证明。
2. 测试矩阵：Poison 玩家/敌人删除各 +1 history 且另一序列不变、undo/redo 精确复原；
   entry-points 移动恰一次 SetStartupEntriesCommand、entry.id/defaultEntryId/选中项不变；
   32×32、scrollWidth==clientWidth、同组 top、focus 外扩归属、icon-only aria/tooltip/SVG hidden；
   action-group adoption/CLI gate、boundary、Poison、ProjectWorkbench、reorder adoption 聚焦；
   受影响包全量只跑一次。
3. 复核三处转第二批的理由（帧动画 102px overflow-hidden focus 裁切、图层 30/32 混高、
   精灵目录 Inspector 尾部 inset + proof-disabled）与 9 面第三批清单是否有漏分或误分。
4. 复核“战斗 / 毒”移除 1px optical margin 的实测要求（1280/720 + 520/360/320、失败转 rework
   不回补）与入口点 240px 语义验收（≥96px、完整 DOM 名称/ID、focus 归属、双溢出 0）。
5. 200% zoom 无法可靠触发时保持“未实测”口径，不用 pinch/等效冒充。
输出：GLM 席 premise verified + design agree，或 counter + file:line/反例。
```
