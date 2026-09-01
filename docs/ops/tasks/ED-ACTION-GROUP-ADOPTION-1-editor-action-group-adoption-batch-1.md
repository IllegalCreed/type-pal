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
  - premise: pending
  - design: pending
- GLM:
  - premise: pending
  - design: pending
- 独立反证审查:
  - 审查者: pending
  - 直接证据: pending
  - 可证伪观察: pending
- counter / 分歧处理: none
- 缺签豁免: N/A
- build 准入结论: **blocked（缺 Kimi / GLM premise verified + design agree；不得实现）**

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

- 2026-09-01 Codex: 用户把分批判断交由 Codex。三路只读审计后确认“战斗 / 毒”回合规则与
  “项目设置 / 入口点”为真正机械采用；“资源 / 帧动画”“地图编辑 / 图层列表”“资源 / 大世界精灵 /
  预制动作目录”分别存在 focus 裁切、30/32 混高与 Inspector 边界，故改为三批并先开本卡。未修改实现。
  Next: Kimi 独立审架构/视觉范围；三签齐前不得 build。

## 下一位 Agent 提示词

```text
审签 ED-ACTION-GROUP-ADOPTION-1（Kimi 席，draft；生产实现只读，只允许更新任务卡签字/交接）。

任务卡：docs/ops/tasks/ED-ACTION-GROUP-ADOPTION-1-editor-action-group-adoption-batch-1.md
当前状态：draft；Codex 已签 premise verified + design agree；Kimi / GLM pending。三签齐前不得实现。

先读：AGENTS.md、docs/phase2/READ-FIRST.md、上一卡 ED-ACTION-GROUP-SPEC-1、设计规范 DS-C.2a/
DS-C.4d/RF-27、action-group-adoption.json，以及本卡全部证据。

请独立核验：
1. “战斗 / 毒”回合规则（poison/ticks）与“项目设置 / 入口点”（project/entry-points）是否确实只需
   替换 wrapper/删除私有几何，按钮、handler、identity、command/schema 是否零变化；给 file:line 与最强反证。
2. 审 Codex 从“首批5处”收窄为“首批2处”的判断：“资源 / 帧动画”的固定卡 focus 裁切、
   “地图编辑 / 图层列表”的状态按钮 30/32 混高、“资源 / 大世界精灵 / 预制动作目录”的 Inspector
   尾部裁切是否足以要求另批；若不同意请给更小/更安全边界。
3. 审“战斗 / 毒”移除 1px optical margin 的底线风险与 520/360 整组 placement；“项目设置 / 入口点”
   父 grid / 4px end inset、240px 下正文宽度≥96px、完整名称/ID DOM 语义和 focus 是否闭合。
4. 复算迁移后 registry 必须为10 groups /46 moves / adopted20 / raw26 / candidates13，disposition
   1 equivalent +12 deferred；其余13 candidates（含 equivalent）必须零DOM/CSS diff；同步核 DS-C.2a
   census 文案和 boundary 断言更新但版本不升。
5. 输出带直接证据的 Kimi premise verified + design agree，或 counter + P0/P1/P2/反例；若agree，
   写回任务卡并附可直接转发给GLM的提示词。不得代签GLM，不得标build/done。
```
