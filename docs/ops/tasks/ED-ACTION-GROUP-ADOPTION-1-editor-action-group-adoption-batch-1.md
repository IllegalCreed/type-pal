# ED-ACTION-GROUP-ADOPTION-1 - 同项动作组采用第一批（战斗 / 毒回合；项目设置 / 入口点）

Status: review
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

把“战斗 / 毒”的玩家/敌人回合规则和“项目设置 / 入口点”迁移到现有 `DsActionGroup`。毒回合仍是
wrapper-only 机械采用；入口点除换 wrapper 外，还要修复真实约 235px 目录下正文仅 53px 的问题，由父目录
在 `<280px` 时把完整动作组移到第二层。两处都复用现有 `DsReorderMoveButton` / `DsIconButton` 与 reorder
owner，不改变任何排序、删除、命令、identity 或数据语义。

## 范围

- 范围内:
  - “战斗 / 毒”的回合规则（`poison/ticks/actions`）：`.ef-ops` wrapper 改为
    `DsActionGroup density="compact"`，保留 danger 删除。
  - “项目设置 / 入口点”（`project/entry-points/actions`）：`.project-entry-row-actions` wrapper
    改为 compact ActionGroup；`.project-entry-list` 成为 container owner，内容宽 `<280px` 时把完整动作组
    移到 CatalogRow 下方，保证名称/ID 可读宽度与 focus containment。
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

两处都已使用正式移动按钮和稳定 reorder owner。毒回合只需把私有 wrapper 收口到 compact ActionGroup；
入口点的旧同排布局在真实约 235px 目录下会把正文压到 53px，因此还必须由 `.project-entry-list` container
持有 `<280px` 整组下沉。命令、identity 与数据层不需要也不允许变化。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：纯二阶段作者工具动作布局，不涉及原版游戏行为。 | `docs/phase2/READ-FIRST.md:8-10,20` |
| 第一阶段 | N/A：第一阶段没有当前编辑器设计系统动作组。 | `CLAUDE.md:5-12` |
| 当前二阶段 | `DsActionGroup` v2.22.0 已冻结 compact 32×32 / 4px / nowrap；两处仍登记 deferred；入口旧同排在真实约235px目录下正文仅53px，已推翻wrapper-only前提。 | `docs/phase2/editor/editor-design-system-v1.md:429-453`；`packages/editor/src/ui/design-system/action-group-adoption.json:3-8,166-175,215-224`；本卡 build 反证记录 |
| 本任务目标 | 两处转 adopted；毒保持机械采用；入口由真实 `.project-entry-list` 在 `>=280px` 同排、`<280px` 第二层；其余13个candidate原样保留。 | 本卡设计/验收条件；`docs/ops/board.md:27`；用户2026-09-01分批授权 |

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
   - **build 期反证（2026-09-01）**：真实 720px 页面把左目录调到约 235px 后，ActionGroup 仍与
     CatalogRow 同排，正文实际只剩 53px（卡面要求 ≥96px）；group/focus 虽未溢出，但 identity 已被过度压缩。
     因此“父 grid/inset 原样即可”的 wrapper-only 前提被推翻，必须新增 `<280px` 整组下沉合同。

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
    宽度 `>=280px` 保持同排；`<280px` 时动作组完整移到目录行第二层，正文不得被压到 96px 以下。
- 代表场景: “战斗 / 毒”的玩家/敌人回合规则；“项目设置 / 入口点”的入口目录。
- 用户裁决:
  - 分批授权: **approved（2026-09-01）**——用户明确把是否分批交由 Codex 判断。
  - refreshed 入口响应式形态: **approved（2026-09-01）**——用户以“签了”批准“>=280px同排；
    <280px动作组第二层”。

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
3. “项目设置 / 入口点”删除 `.project-entry-row-actions` 的私有 flex/gap；给 `.project-entry-list` 增加
   container owner，并以 range query `@container (width < 280px)` 把 `.project-entry-item-content` 改为
   单列、动作组 `grid-column:1 / justify-self:end`；父 content 在窄态提供至少 4px `padding-block-end`，
   让最后一行按钮的 2px ring + 2px offset 留在 item/非裁切 owner 内。280px 及以上父 grid/inset 原样。
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
  - “项目设置 / 入口点”精确边界：内容宽 280px 时保持同排且正文 ≥96px；279.5px 与 279px 时动作组
    进入第二层，CatalogRow 正文 ≥96px；真实缺陷档约235px也必须下沉且正文≥96px。最后一项/滚动边缘的
    focus 外扩位于 item/最近非裁切 owner 内，block-end 不裁切。
  - icon-only 继续有具体 aria-label + tooltip，SVG hidden；“战斗 / 毒”删除保持 danger。
- registry / 门禁:
  - 10/46/20/26/13 与 1 equivalent +12 deferred 精确；其它 12 deferred 生产 DOM 零改。
  - 除本卡两处外的其余 13 个 candidate surfaces（1 equivalent + 12 deferred）生产 DOM/CSS 全部零改。
  - 两个业务 class 不再持有 display/gap/wrap/尺寸；只允许“战斗 / 毒”和“项目设置 / 入口点”各自在卡面
    列明的 grid-column/justify-self 等整体 placement，以及入口父 content 的4px block-end containment。
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
- build 准入结论: **invalidated（2026-09-01 build 实机反证推翻“Project 父 grid 原样即可”核心前提；
  上述 Codex / Kimi / GLM 签字保留为历史事实，不再授权实现）**

### rework 后重新进入 build：前提 / 设计签字

- 直接反证: 真实 720px 页面把“项目设置 / 入口点”目录调到约 235px，正文仅 53px，低于已签 ≥96px；
  wrapper/focus 零溢出不能替代 identity 可读性。未提交实现已全部用 apply_patch 撤回，工作树只保留任务卡/看板。
- Codex:
  - premise: **verified（2026-09-01 refreshed）**——原 wrapper-only 前提对“战斗 / 毒”仍成立，对入口点
    `<280px` 不成立；必须由真实 `.project-entry-list` container 在 279/280 两侧持有整组 relocation。
  - design: **agree（2026-09-01 refreshed）**——Poison 方案不变；入口点新增 `<280px` 单列/动作第二层，
    冻结 280 同排正文≥96、279 下沉正文≥96、完整 DOM/access name 与双溢出0；按钮/命令/registry计数不变。
- Kimi:
  - premise: **verified（2026-09-01 refreshed，本人实机复现反证 + 真实 DOM 注入模拟新边界，
    非复述 Codex）**：
    1. **反证独立复现成立（且更劣）**:720px 视口下真实 `.project-entry-list` 实测宽 **193px**,
       默认入口行（带“直接启动”tag 52px）正文 title 仅 **17px**;将目录显式调到 235px 后同排
       正文 **59px**(卡面记 53px，同量级)——均低于已签 ≥96px 下限。零溢出（list/content/doc
       全 0）确实不等于 identity 可读，反证成立且原 wrapper-only 前提对入口点不成立。
    2. **新边界实测闭合（真实 DOM 注入模拟）**:
       - 235px 注入 `<280px` 形态（单列 + 动作组 `grid-column:1; justify-self:end` +
         `padding-block-end:4px`)：正文 **121px ≥96**,list/content 溢出 0;
       - 279px 同注入：正文 **165px ≥96**,溢出 0;
       - 279.5px 在本环境被布局取整为 280px，无法区分小数边界——整数边界 280 同排 / 279 下沉
         已实测，申报为整数边界验证;
       - 280px 同排（当前旧 30px 按钮 62px)：正文 **104px ≥96**；迁后按钮 32px(+6px)推算约
         **98px**——仍 ≥96 但仅约 2px 余量，属合同内紧贴通过，已在卡面风险中注明;
       - 235px 同排对照 **59px <96**——正是新方案要消灭的形态，证明 `<280px` 分支必要。
       以上均为真实生产 DOM 上的页面级注入测量，未改任何实现文件;完整名称/ID 始终保留在
       DOM 与 accessible name（动作组不覆盖 CatalogRow 节点）。
    3. **“战斗 / 毒”不受影响**:rework 只改入口点边界;`PoisonTab.tsx:108-166,184-207` 的
       wrapper-only 前提、520/360 整组 placement(editor.css:9211-9223)、danger 删除与
       UpdatePoisonCommand/undo 语义均与初版核验一致,无需重开。
    4. **基线算术复核**:10 groups / 46 moves / adopted 20 / raw 26 / candidates 13,
       disposition 1 equivalent + 12 deferred + 0 N/A 与初版一致;其余 13 candidates 生产
       零 DOM/CSS diff;DS-C.2a census 与 boundary 断言同版同步、不升版成立。
    5. **可推翻观察**:280 同排实测正文若 <96（本人测 104/推算 98，余量仅约 2px,环境字体差异
       可推翻);注入形态与最终实现若有语义偏差（最终以真实实现的 279/280 复测为准）;
       名称/ID 若在任一窄档从 DOM/access name 丢失;毒面底线实测若错位——任一本签字失效。
  - design: **agree（2026-09-01 refreshed，维持 KB1-KB5 并以 KBR1-KBR3 替换 KB4）**：
    - **KBR1（280 边界钉）**:`.project-entry-list` 持唯一 container owner;`>=280px` 同排
      （父 grid/inset 原样）,`<280px` 单列 + 动作组 `grid-column:1; justify-self:end` +
      `padding-block-end >=4px`;实现后必须以真实页面复测 280 同排正文 >=96px（预期仅约 2px
      余量）与 279/235 下沉正文、focus 外扩归属、双溢出 0,不得以注入模拟替代实现证据。
    - **KBR2（identity 语义钉）**:四档（280/279/235/真实 193）下完整长中文名与 entry.id 必须
      保留在 DOM 与 accessible name;动作组不得覆盖 CatalogRow;“直接启动”tag 行是最紧约束,
      必须纳入验收断言。
    - **KBR3（rework 纪律钉）**:Poison 方案与 registry 基线不变;其余 13 candidates 生产零 diff;
      初版签字失效仅因入口边界,重签后仍冻结 10/46/20/26/13 + 1+12,不升设计系统版本;
      280 同排若实测低于 96 即回 rework,不得改回更大阈值凑数。
- GLM:
  - premise: **verified（2026-09-01 refreshed，容器 owner/CSS 结构/命令零漂移/基线算术本人独立
    复核，非复述 Codex/Kimi；与 Kimi 实测口径独立取得后收敛）**：
    1. **反证结构核心独立核实**：当前 `.project-entry-list` 仅为 `flex:1; overflow:auto;
       padding:4px 0`（editor.css:1938-1943 本人直读）——**全库零 container-type/零 @container/
       零 media 降级**持有入口列表窄态（本人 grep 证实）；`.project-entry-item-content` 静态
       `minmax(0,1fr) auto` 把动作列恒置 auto 档，`DsCatalogRow` 自身固定高 flex（gap+padding+
       trailing「直接启动」tag 争宽，recipes.css:168-180 直读）——窄列表下 title 必然塌缩，
       Kimi 实测 193px→17px / 235px→59px 与该结构完全自洽。「wrapper-only 父 grid 原样即可」
       对 `<280px` 不成立、零溢出 ≠ identity 可读——**原前提失效与撤回正当**。本人另证
       `git diff 5a084708..HEAD -- packages/` 为空——生产树与初版签字时逐字节一致，撤回干净，
       我对毒面（DOM/命令/CSS/520/360 placement）的初版核验**继续有效**，无需重开。
    2. **新方案结构合法**：`.project-entry-list`（ProjectWorkbenchTab.tsx:1958 实在）作唯一
       container owner，280 同排 / <280 整组下沉——与 DS-C.2a「窄态由父 recipe 整组换行」及
       `.ef-ops` 520/360、field-group `<480` 先例同构；动作 `grid-column:1; justify-self:end`
       + `padding-block-end >=4px` 与毒面 placement 形态一致。
    3. **280 余量风险量化复核**：Kimi 实测 280 同排正文 104px（旧 30px 按钮 62px 列）、迁后
       32px 按钮 +6px 推算 ~98px——≥96 但仅 ~2px 余量；279.5 取整申报诚实。「直接启动」tag 行
       为最紧约束属实。该余量属合同内紧贴通过，**以真实实现复测为准**的控制（KBR1/KBR3）必要
       且充分，不构成 counter。
    4. **命令零漂移与基线复核**：rework 仅改 CSS 边界——按钮 label/variant/disabled/handler/
       itemKey、`useDsReorderKeys(entry.id)` → `SetStartupEntriesCommand`（:1764）路径零触碰；
       registry 目标基线维持 **10/46/20/26/13 + 1 equivalent + 12 deferred + 0 N/A**（与本人
       初版算术一致）；DS 不升版成立（既有 pattern 采用）。
    5. **可推翻观察**：真实实现 280 同排复测 <96（余量仅 ~2px，字体环境差异可翻）；279/235/
       最窄档任一名称或 entry.id 从 DOM/accessible name 丢失；毒面底线实测错位；registry 复算
       不等于冻结基线——任一本签字失效。
  - design: **agree（2026-09-01 refreshed，维持 GM-P1/P2/P4 效力并以 GM-R1~R3 替换 GM-P4
    入口部分）**：
    - **GM-R1（容器 owner 与边界钉）**：`container-type: inline-size`（+命名）只落在
      `.project-entry-list` 一处；`>=280px` 父 grid/inset 原样同排，`<280px` 单列 + 动作组
      `grid-column:1 / justify-self:end / padding-block-end >=4px`；边界为整数 280 并由 CSS
      断言钉死，不得在 item/action 层散落第二断点或 media fallback。
    - **GM-R2（identity 四档测试矩阵钉）**：280（同排，复测 ≥96，~2px 余量如实登记）/ 279 /
      235 / 真实最窄档逐档断言：title/meta 可用宽与可见性、完整长中文名 + entry.id 保留在
      DOM 与 accessible name、动作组不覆盖 CatalogRow、**「直接启动」tag 行纳入断言**（最紧
      约束）、focus 外扩落 item/最近非裁切 owner、list/content/document 三点溢出 0；注入模拟
      不得替代真实实现复测；200% zoom 保持未实测口径。
    - **GM-R3（零漂移与纪律钉）**：毒面方案/命令/基线不变；其余 13 candidates 生产 DOM/CSS
      零 diff 机器证明（diff 范围断言只允许两处 TSX + 入口 CSS + registry/规范/测试）；280
      实测 <96 即回 rework，不得改回更大阈值凑数；DS 保持 2.22.0。
- counter / 分歧处理: none
- build 准入结论: **allowed（签字面）（2026-09-01 refreshed，Codex + Kimi（KBR1-KBR3）+
  GLM（GM-R1~R3）三方 refreshed premise/design 齐、无 counter；用户已批准 280 同排 / <280
  下沉形态。Codex 恢复实现时状态转 build，仍为唯一 Coding Owner。）**

### 进入 done 前:审查签字

- Codex: **accept（2026-09-01，implementation `d8b04a23`）**——逐文件复核实现只改两个 wrapper、入口
  `<280px` 父容器换轨、registry/规范/测试；按钮 props、稳定 key、reorder owner、命令/schema/数据均零改。
  聚焦 133、全量 1521、typecheck、91 文件设计系统门禁全绿；真实入口 280/279/235/139 与毒
  760/520/360/320 容器逐档复验，无 P0/P1/P2 自审遗留。
- Kimi: **accept（2026-09-01，只读终审 `d8b04a23` 全 diff + 真实页面两边界复测 + registry/版本/
  测试证据复核与本人聚焦复跑，非复述 Codex）**：
  - **生产变更面 ✓（diff 直读）**:PoisonTab `.ef-ops` 与 ProjectWorkbenchTab
    `.project-entry-row-actions` 两处 span 仅换为 `<DsActionGroup density="compact">`,按钮
    label/variant/disabled/handler/itemKey 逐字未动;`.ef-ops` 私有的 display/gap/flex 与
    `.project-entry-row-actions` 私有 flex/gap 规则删除,`.ef-row .ef-ops` 移出 1px optical
    margin(仅 `.ef-kind` 保留);`.project-entry-list` 新增唯一命名 container + `<280px`
    单列/padding-block-end 4px/动作组 `grid-column:1; justify-self:end`——与 rework 方案逐字一致;
    其余文件仅 registry/测试/audit/规范文案。
  - **入口边界（真实实现复测）**:280px 实机 `208px 68px` 同排,正文 title=**98px ≥96**
    （与设计期注入推算的 ~98px 一致）、meta=`new-game` 全量 ID 在 DOM、动作 68px 两枚 32×32
    在 item 内、溢出 0;279px 实机单列下沉,title=**165px**;235px 下沉 title=**121px**——
    小数边界以整数档申报,focus 外扩有 4px block-end 承接。
  - **毒回合断点（真实实现复测）**:760px 同排右对齐;520px 整组第二行右对齐;360/320px
    整组跨行右对齐;四档三枚按钮（上移/下移/删除回合 1，具体 aria）均 **32×32**、
    `scrollWidth===clientWidth`、删除保持 danger 边框 rgb(242,125,132)、row/doc 溢出全 0;
    字段/动作底线 1280 实测证据见 Codex 记录（本人 760 同排无异常）。
  - **基线 ✓（本人复算）**:registry baseline 恰为
    `10 groups / 46 moves / adopted 20 / raw 26 / candidates 13`;adopted 清单恰为原 8 +
    `poison/ticks/actions` + `project/entry-points/actions`;disposition
    **1 equivalent + 12 deferred + 0 N/A**;其余 13 candidates 的 DOM/CSS 零改动（commit stat
    证明）;DS 版本保持 **2.22.0**(index.ts 与 tokens.css 实测未升）;DS-C.2a census 文案已同步为
    “10 组 / 20 枚…26 枚…13 个候选”。
  - **测试证据 ✓**:本人复跑 action-group-adoption + PoisonTab + ProjectWorkbenchTab +
    boundary → **4 files / 133 tests 全绿**(与卡面“聚焦 133 项”精确一致）;typecheck、
    91-file design-system gate 与 editor 全量 184 files / 1521 项记录采用 Codex 证据,
    按纪律未重复全量。
  无返工项；未修改实现，未代签 GLM。
- GLM: **accept（2026-09-01，只读终审 `d8b04a23` + registry/命令/门禁独立复算 + 本人实机
  几何五档实测 + 聚焦复跑，非复述 Codex/Kimi；与 Kimi 口径各自独立取得后收敛）**。按
  GM-P1/P2/R1-R3 逐钉核验：
  - **registry 复算 ✓（GM-P1）**：baseline 恰 **10 groups / 46 / adopted 20 / raw 26 / 13
    candidates**，disposition **1 equivalent + 12 deferred + 0 N/A**（本人 node 复算：adopted
    moves 20 + candidate moves 26 = 46）；两个新 adopted 条目 `poison/ticks/actions` 与
    `project/entry-points/actions` 静态字段恰 **compact / icon-only / moveButtonCount:2**；
    提交文件面即零 diff 证明——除两处 TSX/editor.css 对应行/registry/门禁/规范/测试外**无其它
    candidate 文件**；新增负例直读复跑绿（47/27 单枚 raw move、两组 wrapper regression
    9/18/28、既有 stale/alias 等全家族）。
  - **业务类几何清零 ✓（GM-R1）**：`.ef-ops` 的 `display:flex/gap:2px/flex:none` 与
    `.project-entry-row-actions` 的 `flex/gap:space-1` 私有规则已删（diff 逐行核）；1px optical
    margin 仅 `.ef-kind` 保留、动作侧已移出；`container-type: inline-size` + 命名只落在
    `.project-entry-list` 一处，`<280px` 单列 + `padding-block-end: space-2(4px)` + 动作
    `grid-column:1/justify-self:end`——与 rework 冻结方案逐字一致；毒 520/360 整组 placement
    原样。
  - **命令语义零变化 ✓（GM-P2）**：DOM diff 恰两处 span→DsActionGroup，按钮零触碰；新测试
    矩阵逐条直读——毒玩家/敌人删除各自恰 `history+1` 且**另一序列逐字不变**、undo/redo 精确
    复原（双向四断言）；入口移动 hover 0/有效恰 1、entry.id 顺序精确、`defaultEntryId` 与
    选中项不变、undo 复原；icon-only 三属性（label、tooltip id 关联、SVG hidden/focusable）
    与 danger 断言齐备；长中文名 + 64 字符 ID 完整保留 DOM/accessible name。
  - **实机几何五档 ✓（GM-R2，本席独立测量）**：毒 1280/760/520/360/320——三钮全部
    **32×32**、gap **4px**、`flex-wrap:nowrap`、`scrollWidth===clientWidth`、danger 尾钮、
    同行同 top、组恒 104px 整组迁移不拆、list/body 溢出 0。入口——真实活态列宽 **193px**
    （固定列，与 Kimi 实测一致）：单列下沉、2×32、scrollEq、完整 title/meta 在 DOM、溢出 0；
    以页面级注入把同一**真实实现**的容器分别压到 **280/279/235**（仅变输入宽度，未改任何
    文件；注入后已清除并复核复原 193px）——**280 双轨 `208px 68px` 同排、最紧「直接启动」
    tag 行 title 98px ≥96（与 Kimi 推算 98 恰合，~2px 余量）**；279/235 单列下沉、title
    165/121 ≥96；三档 focus 外扩均在 item 内、双溢出 0——整数边界 280 同排/279 下沉精确。
  - **测试证据自洽 ✓**：本人复跑 action-group + boundary + PoisonTab + ProjectWorkbench +
    reorder-adoption **5 files / 139 tests 全绿** + editor typecheck 干净 + design-system
    gate **91 files / 2 evidence-bound exceptions** 通过；卡面全量 184 files / 1521 与聚焦
    记录自洽，按纪律未重复全量。
  - **200% zoom（诚实声明）**：本席环境同前——IAB 键盘缩放零响应，**真实 200% zoom 未实测**，
    不以 pinch/等效冒充；已测五档（320..1280）覆盖 zoom 敏感代码路径。
  无返工项；未修改实现/测试（浏览器注入仅本会话页面态并已清除复原），未代签 Kimi，未填用户验收。
- 用户验收: pending
- done 准入结论: blocked（Codex + Kimi + GLM 三方 accept 齐；缺用户验收，不得标 done）

## Draft / Build / Review 证据

- Draft: Codex 已完成 14 deferred 分层审计并把首批从 5 处收窄为 2 处；初版三方 premise/design
  签字已因 build 期反证失效。
- Build:
  - 首次开工在真实 235px 入口目录测得正文仅 53px，触发反证后完整撤回未提交实现并转 rework。
  - refreshed 三签 + 用户批准齐后以 `d8b04a23` 恢复实现：两处 wrapper 消费 compact `DsActionGroup`；
    `.project-entry-list` 成为唯一具名 inline-size container，`width < 280px` 时 CatalogRow 与动作组改为
    两层；窄态父 content 以 4px block-end 空间容纳 focus 外扩。Poison 只删私有 2px gap/1px optical
    margin，520/360 placement 原样。
  - registry / DS-C.2a 闭合 **10 groups / 46 moves / 20 adopted / 26 raw / 13 candidates**，disposition
    **1 equivalent + 12 deferred + 0 N/A**；其余 13 candidates 规范化 manifest 与生产文件 diff 均为 0。
  - 验证：聚焦 `4 files / 133 tests`；reorder surface `5 tests`；`typecheck`；design-system gate
    `91 files / 2 evidence-bound exceptions`；最终编辑器全量单线程 **184 files / 1521 tests** 全绿。
  - 真实入口：280px 同排最紧正文 **98px**；279px / 235px 下沉正文 **165px / 121px**；真实最窄
    139px 正文仍为正宽（带“直接启动”行 25px），四档 group/button 68px/32×32、双溢出0、最后一项
    4px focus 外扩均在 item/list 内。279.5px 浏览器按整数布局取整，由 range query + 静态门禁覆盖。
  - 真实毒回合：760px 容器同行底线差0；520px 第二列右对齐；360/320px 横跨整行右对齐；各档
    group 104px、三按钮32×32、无溢出、danger/tooltip/SVG hidden 与 focus containment 正确。
  - 200% zoom：未实测；未以 pinch/pageScaleFactor 冒充。
- Review: Codex 自审 accept；待 Kimi / GLM 独立代码、测试与视觉证据审查。

## 后续批次

- `ED-ACTION-GROUP-ADOPTION-2`：“资源 / 帧动画时间线”“地图编辑 / 图层列表”“资源 / 大世界精灵 /
  预制动作目录”三个几何敏感面。
- `ED-ACTION-GROUP-ADOPTION-3`：剩余 9 个含混合语义、旧按钮或特殊 reveal 的动作区。

## 交接日志

- 2026-09-01 GLM: 只读终审 `d8b04a23`，签 **accept**。独立证据：registry node 复算
  10/46/20/26/13 + 1 equivalent + 12 deferred、两新 adopted 静态字段恰 compact/icon-only/2、
  提交文件面即 13 candidates 零 diff 证明；业务类几何清零与 container owner 单点（diff 逐行）；
  命令矩阵（毒双序列隔离 + 入口 hover 0/有效 1/defaultEntryId/undo）逐条直读；实机五档——毒
  1280/760/520/360/320 三钮 32×32、4px、nowrap、scrollEq、组恒 104px 不拆、零溢出，入口活态
  193px 下沉 + 注入 280/279/235（真实实现仅变容器宽，已清除复原）280 同排 tag 行 title 98≥96
  与 Kimi 推算恰合、279/235 下沉 165/121、focus 归属、双溢出 0；复跑 5 files / 139 tests +
  typecheck + 91-file gate 全绿。200% 未实测口径保持。无返工项；未修改实现/测试，未代签
  Kimi，未填用户验收。三方 accept 齐，仅剩用户验收；无下一位 Agent 提示词，等待用户验收/收口。
- 2026-09-01 Kimi: 只读终审 `d8b04a23`，签 **accept**。独立证据：两 wrapper 仅换
  `DsActionGroup density="compact"` 且按钮逐字未动、三处私有 CSS 几何清除（diff 直读）;
  真实实现复测——入口 280 同排 title=98px ≥96 / meta=new-game 全量 / 动作 32×32 在 item 内、
  279 下沉 165px、235 下沉 121px、溢出全 0;毒 760 同排 / 520 第二行右对齐 / 360、320 跨行右对齐、
  三钮均 32×32、删除 danger、scrollEq、溢出全 0;registry 复算恰 10/46/20/26/13 + 1 equivalent
  + 12 deferred、其余 13 candidates 零 diff（commit stat）、DS 保持 2.22.0(index/tokens 实测）;
  本人复跑 4 files / 133 tests 全绿（与卡面聚焦数一致）。无返工项；未修改实现，未代签 GLM,
  未标 done。Next: GLM 终审与用户验收。
- 2026-09-01 Codex: implementation `d8b04a23` 完成。聚焦133 + 全量1521、typecheck、设计系统门禁全绿；
  真实入口280/279/235/139与毒760/520/360/320均通过几何/a11y/focus检查，临时入口未保存且页面重载后
  恢复“已保存”。状态转 review，Codex accept。Next: Kimi 只读代码/视觉审查并签 accept 或 counter；
  不得修改实现/标 done。
- 2026-09-01 Codex: 核对 Kimi KBR1-KBR3 与 GLM GM-R1-R3 refreshed 签字、用户入口新形态批准，
  三方 premise/design + 用户裁决齐且无 counter；状态由 rework 转 build，Codex 恢复为唯一 Coding Owner。
  Next: 按新边界实现、自测与真实页面复验后转 review；不得跳过 280px 正文仅约2px余量的反证门。
- 2026-09-01 GLM: rework 重签。独立核实反证结构核心——`.project-entry-list` 现仅 flex/overflow/
  padding，全库零 container/媒体降级 owner，`.project-entry-item-content` 静态 `1fr auto` +
  CatalogRow 固定高 flex（tag 争宽）→ 窄列表 title 必塌缩，与 Kimi 193/235px 实测自洽，原
  wrapper-only 前提失效与撤回正当；另证 `git diff 5a084708..HEAD -- packages/` 为空（撤回干净，
  毒面初版核验继续有效）。新方案（`.project-entry-list` 唯一 container owner、280 同排 / <280
  下沉）与 DS-C.2a 及 ef-ops/field-group 先例同构；280 余量 ~2px 风险量化复核，以真实实现复测
  为准不构成 counter。签 refreshed premise verified + design agree，附 GM-R1（container owner
  单点 + 整数 280 边界钉）/GM-R2（四档 identity 矩阵含「直接启动」最紧行 + 三点溢出 0 +
  注入不得替代实现复测）/GM-R3（毒面/基线/13 candidates 零漂移 + 不改阈值凑数 + 不升版）。
  未修改实现，未代签 Kimi。三方 refreshed 齐 + 用户批准在案，恢复 build（签字面）allowed。
  Next: Codex 恢复实现；done 前需真实实现 279/280 复测。
- 2026-09-01 Kimi: rework 重签。独立实机复现反证：720px 下真实入口目录宽 193px、带 tag 行
  正文仅 17px;235px 同排对照 59px(卡面记 53px，同量级)<96——反证成立且更劣。真实 DOM 注入
  模拟新边界：235/279 下沉正文 121/165px、280 同排 104px(迁后推算 98px,余量约 2px)、各档溢出
  全 0;279.5 在本环境被取整为 280，按整数边界申报。毒面不受影响（初版核验维持）。签 refreshed
  premise verified + design agree(KBR1 280 边界 / KBR2 identity 语义 / KBR3 rework 纪律),
  注明最终以真实实现的 279/280 复测为准。未修改实现，未代签 GLM。Next: GLM 核容器 owner/CSS/
  测试矩阵与命令零漂移后三签齐,Codex 方可恢复实现。
- 2026-09-01 User: 以“签了”批准 refreshed 入口响应式形态：目录内容宽 `>=280px` 同排，`<280px`
  时动作组完整移到第二层。Next: Kimi / GLM 对新前提与边界重新签字；两席齐前不得 build。
- 2026-09-01 Codex: build 实机发现入口目录 content≈235px 时正文仅53px，推翻“父 grid/inset 原样即可”
  及“240px正文≥96”前提。停止实现并完整撤回未提交生产/测试/规范改动；任务转 rework。新设计以
  `.project-entry-list` 为 container owner，280px 同排 / 279px 动作整组下沉；旧三签失效。
  Next: 用户批准新入口响应式形态，Kimi / GLM 对新前提和边界重新签字；三门齐前不得 build。
- 2026-09-01 Codex: 核对 Kimi KB1-KB5 与 GLM GM-P1-GM-P4，三方 premise verified + design agree
  齐、无 counter，用户分批授权在案；状态转 build。Next: Codex 按钉实现、自测并转 review。
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
终审 ED-ACTION-GROUP-ADOPTION-1（GLM 席，review；生产实现只读，不得修改实现/测试，不得代签，
不得标 done）。

任务卡：docs/ops/tasks/ED-ACTION-GROUP-ADOPTION-1-editor-action-group-adoption-batch-1.md
实现提交：d8b04a23 feat(editor): adopt action groups in poison and entry rows
当前状态：review；Codex accept 与 Kimi accept（2026-09-01，含真实实现两边界复测与基线复算）
均已签，仅余你的 GLM review accept 与用户验收。

先读：AGENTS.md done 门禁、本卡全部 rework/签字/Build 证据（含 Kimi accept 的实机口径）、
ED-ACTION-GROUP-SPEC-1、DS-C.2a、`git show d8b04a23` 全 diff。

你的分工（独立证据，不复述 Codex/Kimi）：
1. registry 与门禁复算：10 groups / 46 / adopted 20 / raw 26 / 13 candidates 与
   1 equivalent + 12 deferred + 0 N/A；两个新 adopted 面的静态字段（compact / icon-only /
   moveButtonCount:2）与两处业务 class 不再持 display/gap/wrap/尺寸的机器证明；其余
   13 candidates 生产 DOM/CSS 零 diff；既有负例与新增 stale/wrapper regression 继续有效。
2. 命令语义测试矩阵复核：Poison 玩家/敌人删除各 +1 history、另一序列不变、undo/redo 复原；
   entry-points 移动恰一次 SetStartupEntriesCommand、entry.id/defaultEntryId/选中项不变；
   按钮 label/variant/disabled/handler/itemKey/scopeKey/adoptionId 逐字核对。
3. 几何验收复核：入口 280 同排 title>=96（最紧 tag 行）、279/235 下沉、最窄档 title/meta
   正宽与完整 DOM/access name、focus 外扩归属；毒 760 同行底线、520/360/320 整组 placement、
   三钮 32×32、scrollEq、danger；不恢复私有 1px margin / 2px gap。
4. 测试证据：聚焦 133、typecheck、91-file design-system gate、editor 全量 184 files / 1521
   是否自洽；可复跑聚焦（Kimi 已复跑 4 files / 133 全绿），不要重复全量。
5. 200% zoom 无法可靠触发时保持“未实测”口径，不用 pinch/等效冒充。
输出：GLM 席 review accept 或 counter + file:line/复现；写回“进入 done 前”GLM 行与交接记录。
```
