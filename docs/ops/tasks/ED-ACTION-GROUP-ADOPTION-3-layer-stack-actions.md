# ED-ACTION-GROUP-ADOPTION-3 - 地图与组合库图层动作组及窄栏合同

Status: draft
Phase: phase2
Capability: Editor design-system action-group governance（不改变 capability-map）
Coding Owner: Codex
Reviewer: Kimi + GLM
Risk: 公共合同迭代（共享组件 + registry validator；完整三签）
Depends On: `ED-FRAME-TIMELINE-UX-RESTORE-1`
Target Design-System Version: `2.23.0`

## 目标

统一地图编辑与组合库共用 `LayerStackControls` 的集合动作、图层状态动作和排序动作：全部使用32×32px
compact `DsActionGroup`，修复当前140px最窄栏横向溢出、状态名称语义冲突、非显然禁用无可见原因，
并让 action-group registry 正确登记不含移动按钮的合法动作组。地图/组合的稳定 layer id、内容命令、
workspace显隐/锁定状态与undo边界不变。

## 范围

- `LayerStackControls.tsx`、`MapMode.tsx`、`StampContentEditor.tsx`
- 图层行/header CSS与两级container query
- ActionGroup registry/audit/schema测试、DS v2.23.0规范与版本常量
- Map/Stamp业务测试和真实双consumer视觉验证

不在范围：图层schema、地图/组合数据格式、显隐/锁定持久化、画布/碰撞/高度语义、其它动作候选。

## 前提真值门

### 一句话前提

只把 `layer-order` 包进ActionGroup会制造30/32px混高；完整闭环至少需要header、状态、排序三组，并由
图层列表父容器在320/216两道边界整组换轨，同时修正registry“所有ActionGroup都恰有两枚移动按钮”的
错误审计假设。

### 四向真值矩阵

| 维度 | 结论 | 一手证据 |
|---|---|---|
| 原版 / primary source | N/A：纯二阶段地图作者工具布局。 | `docs/phase2/READ-FIRST.md:8-20` |
| 第一阶段 | N/A：一阶段无共享LayerStackControls。 | `CLAUDE.md:5-12` |
| 当前二阶段 | header、显示/锁定、排序均30px；row为`30 30 1fr auto`；140px最窄实测名称列0、row横溢23px。状态按钮名称随状态翻转且多行同名。audit强制adopted moveButtonCount=2。 | `LayerStackControls.tsx:84-181`；`editor.css:11339-11393`；`action-group-audit.mjs:158-190`；本卡实机记录 |
| 本任务目标 | 三个compact ActionGroup；320/216父容器换轨；所有命中区≥32；稳定上下文名称与可见禁用原因；registry允许并核验0-move组。 | 本卡设计/验收；用户裁决 pending |

### 替代解释与可证伪

- 最强替代解释：“2px混高可以靠居中忽略，140px只需继续截断名字”。反证：公共合同冻结ActionGroup
  compact为32；当前140px名称列已为0且row横溢23px，已不是正常ellipsis。
- 可推翻观察：若只迁排序组仍能在Map/Stamp所有宽度证明四类按钮同尺寸、名称正宽、focus完整且零横溢，
  或registry无需登记生产0-move ActionGroup仍能双向闭合，则本前提失效。

## 用户可见偏离

- 所有图层icon action `30×30` → `32×32`；名称按钮高度30→至少32；行最小高度38→至少40。
- 宽度 `>=320px`：状态组 / 名称 / 排序组同排；`216–319px`：排序组完整下沉；`<216px`：
  状态组、名称、排序组按DOM顺序三层。非选中行不产生空白排序层。
- 显示/锁定改为稳定状态名称（含图层名），新增/删除被业务规则禁用时显示邻近原因。
- 用户裁决：
  - **approved（2026-09-01）**——用户明确“图层可以加”，即保留图层拖拽/移动并继续统一治理。
  - **pending**——header/state/order三组及320/216具体响应式形态仍需用户确认。

## 上下文锚点

- `docs/phase2/READ-FIRST.md`
- `ED-ACTION-GROUP-SPEC-1`、`ED-ACTION-GROUP-ADOPTION-1`、`ED-FRAME-TIMELINE-UX-RESTORE-1`；
  cancelled ADOPTION-2只作历史反例
- `LayerStackControls.tsx:84-181`
- `MapMode.tsx:2455-2487,2888-2932`
- `StampContentEditor.tsx:127,432-492`
- `MapMode.test.tsx:867-927,1888-1936`
- `editor.css:652-680,5123-5145,11339-11393`
- `action-group-audit.mjs:140-225,360-452`
- 不得重新引入：业务尺寸/gap owner、隐藏某枚动作凑宽、显隐/锁定写入内容history、按显示index认图层。

## 设计方案

1. header新增/删除 → `map-layer-header-actions` compact ActionGroup；删除保持danger，具体label冻结为
   `删除选中图层：${activeLayer.name}`。
2. 每行显示/锁定 → `layer-state-actions` compact ActionGroup；按钮移除size，label固定为
   `图层可见：${name}` / `图层锁定：${name}`，`aria-pressed`表达状态，图标随状态变化。
3. 选中行上/下移 → `layer-order` compact ActionGroup；label含完整图层名。选择按钮增加
   `选择图层：名称（稳定ID）`、`data-layer-id={layer.id}`，命中高度至少32px。
4. `LayerStackControls` 以 `addDisabledReason/deleteDisabledReason` 代替无解释boolean；用`useId`为每条
   可见原因生成唯一ID，按钮以`aria-describedby`关联。文案冻结：Map为“至少保留一个图层。”/
   “先显示当前图层，再删除。”/“先解锁当前图层，再删除。”；Stamp未接管时为
   “先接管迁移组合，才能增删或排序图层。”。
5. `.map-layer-list`成为唯一inline-size container。基础三列；`width < 320px`两列并把order放第二层右对齐；
   `width < 216px`三组各占整行。保留reorder rail inset、8px inline/4px block padding与4px focus空间。
6. audit adopted `moveButtonCount`从硬编码2改为“非负整数且等于AST实数”；candidate仍必须2。新增0合法、
   负数/小数/登记漂移/漏登记负例。DS公共规范和版本升到2.23.0。
7. build顺序基于帧时间线恢复后的新基线；本卡新增adopted恰3条（header/state为0 move，order为2 move），
   完成后冻结：**13 groups / 44 moves / 22 adopted / 22 raw / 11 candidates
   （1 equivalent +10 deferred +0 N/A）**。
8. 命令边界不变：Map排序/删除仍是MoveProjectMapLayerCommand及既有确认链；Stamp结构写入仍是一条
   ReplaceStampTemplateCommand；显隐/锁定只改workspace/local state，history与dirty不变。

## 验收条件

- DOM/a11y：三个静态ActionGroup fingerprint全部登记；所有icon button32×32、4px gap、SVG hidden、
  tooltip与上下文label一致；状态label稳定且pressed正确；删除danger；非显然disabled有可见原因/描述关系。
- 响应式：Map宽360/320/319/257/216/215/140；Stamp host360/230。同行档名称≥96px；两层档≥96px；
  最窄档`.layer-name > span`与可选`small`正宽且至少可见字符；完整name/id保留在源DOM
  （`data-layer-id`）与`选择图层：名称（ID）`accessible name；active/non-active无空白伪行；group不拆，
  row/list/document横溢0；4px focus外扩位于header/row/list非裁切边界。
- Map：排序单MoveProjectMapLayerCommand、undo/redo；显隐/锁定history与dirty不变；删除确认取消零写，
  确认一步undo；top-first方向映射不变。
- Stamp：未接管时新增/删除/排序禁用且原因可见；显隐/锁定零history；结构排序/删除一条
  ReplaceStampTemplateCommand并可undo；bottom-first方向映射不变。
- 门禁：validator 0-move组合同与负例；13/44/22/22/11 +1 equivalent/10 deferred/0 N/A精确；其余
  11 candidates生产零diff；**三个ActionGroup领域class**只持placement、不持gap/wrap/尺寸；
  `.map-layer-row/.layer-name/.map-layer-list`继续持本卡审签的40/32px与响应式recipe；DS index/tokens/spec
  一致2.23.0。
- 测试：新增LayerStackControls component测试；Map/Stamp/action-group/boundary聚焦、typecheck、design-system
  gate；受影响包全量一次。真实200%无法可靠触发时诚实记录。

## 推进签字

### 进入 build 前

- Codex:
  - premise: **verified（2026-09-01）**——逐行核共享组件与两个caller/命令链；真实map-001在419px
    同行、140px名称列0且横溢23px；registry 2-move硬假设已直读。
  - design: **agree（2026-09-01）**——三语义组 +320/216两级换轨 +可见禁用原因；修audit真模型并升
    DS2.23.0；依赖基线刷新为13/44/22/22/11；不改变数据/命令owner。
- Kimi:
  - premise: **verified（2026-09-01，本人逐行直读共享组件、行 CSS、audit 假设与命令链，非复述 Codex）**：
    1. **混高与禁用实锤**:`LayerStackControls.tsx:84-189`——header 两枚
       `DsIconButton size="compact"`(30px)且 `addDisabled/deleteDisabled` 为无原因 boolean;
       每行 eye/lock 两枚 30px 状态钮，label 随状态翻转（`:147` 显示图层/隐藏图层、`:155`
       锁定图层/解锁图层）;active 行 `.layer-order` 为 2 枚 32px `DsReorderMoveButton`——
       **只迁 order 必留 30/32 混高行**;名称按钮只有 title 无 `data-layer-id` 与含 ID 的稳定
       accessible name(:158-167)。
    2. **140px 实锤（算术）**:`.map-layer-row` 为 `30px 30px minmax(0,1fr) auto` +
       `min-height:38px; padding:4px 8px`(editor.css:11331-11337)——active 行固定件
       30+30+68(order 2×32+4)+16 padding + gaps ≈ 156-163 > 140,名称列归零且行溢出
       16-23px,与卡面“名称列 0 / 横溢 23px”一致;`.layer-name` 高度 30px(:11355-11363)
       低于 32px 命中下限。
    3. **audit 硬假设实锤**:`action-group-audit.mjs:189-190` 与 `:224-225` 对 adopted 与
       candidate 均硬编码 `moveButtonCount !== 2`——header/state 这类 0-move 合法组当前
       无法登记,卡面“registry 错误审计假设”逐字成立。
    4. **命令/状态边界直读**:Map 排序/删除走 `MoveProjectMapLayerCommand` 与既有确认链,
       Stamp 结构写为一条 `ReplaceStampTemplateCommand`;显隐/锁定为 workspace/local state,
       不进 content history/dirty——卡面边界与既有代码一致;top-first/bottom-first 方向映射
       不应在本卡改动。
    5. **基线算术本人复算**:RESTORE-1 后基线 10/44/20/24/12 → 本卡 +3 groups
       (header/state 0-move、order 2-move)→ **13 groups / 44 moves / adopted 22 / raw 22 /
       candidates 11(1 equivalent + 10 deferred + 0 N/A)**,逐项一致;其余 11 candidates
       生产零 diff 的范围声明相容。
    6. **可推翻观察**:若只迁 order 仍能在 Map/Stamp 全宽度证明四类按钮同尺寸、名称正宽、
       focus 完整且零横溢（算术已否）;若 0-move 组无需登记也能双向闭合（audit 硬编码已否）;
       若显隐/锁定需要进 content history（现行为 local state）——任一本签字失效。
  - design: **agree（2026-09-01，附 KC3-1~KC3-5 必落钉）**：
    - **KC3-1（三组最小闭环钉）**:header/state/order 三个 compact ActionGroup 是无可避免
      混高与无原因禁用的最小合法闭面;**audit adopted 必须改为“非负整数且等于 AST 实数”,
      candidate 仍恰 2**;新增 0 合法、负数/小数/漏登记/漂移负例先红后绿;三个领域 class
      只持 placement,不持 gap/wrap/尺寸。
    - **KC3-2（320/216 换轨钉）**:`.map-layer-list` 唯一 inline-size container;`>=320` 三列
      同排、`<320` order 整组第二层右对齐、`<216` 三层 DOM 序;名称列在同排档 >=96px,
      窄档 `.layer-name > span` 与可选 `small` 正宽且可见字符;active-only 渲染 order,
      非选中行不产生空白排序层;reorder rail inset 与 4px focus 空间保留。
    - **KC3-3（稳定命名与原因钉）**:状态钮 label 固定为 `图层可见：${name}` /
      `图层锁定：${name}`,状态仅由 `aria-pressed` 与图标表达,**禁止随状态翻转文案**;
      header 删除固定 `删除选中图层：${activeLayer.name}` 且 danger;boolean disabled 改为
      `addDisabledReason/deleteDisabledReason` + useId + `aria-describedby`,四段文案冻结
      （Map 至少保留一个图层 / 先显示再删除 / 先解锁再删除;Stamp 先接管迁移组合）。
    - **KC3-4（命令/状态边界钉）**:Map 排序恰一条 MoveProjectMapLayerCommand 且 undo/redo,
      删除确认取消零写、确认一步 undo;Stamp 结构排序/删除恰一条
      ReplaceStampTemplateCommand;显隐/锁定 history 与 dirty 均不变;方向映射
      （top-first 反向 / bottom-first 正向）不改。
    - **KC3-5（基线与版本钉）**:build 顺序基于 RESTORE-1 后新基线;完成后冻结
      **13 groups / 44 moves / 22 adopted / 22 raw / 11 candidates(1 equivalent +
      10 deferred + 0 N/A)**;其余 11 candidates 生产零 diff;DS 升 **2.23.0**(registry
      validator 合同 + 图层响应式合同,DS-G.4 minor 适用）;DS-C.2a census 文案同步为
      “0-move 合法、candidate 仍恰 2”的表述。
- GLM:
  - premise: **verified（2026-09-01，registry 基线/组件实锤/审计硬编码/命令链全部本人一手复算，
    非复述 Codex/Kimi；与 Kimi 逐项收敛）**：
    1. **当前基线本人复算（RESTORE-1 后）**：action-group registry 现恰 **10 groups / 44 moves /
       adopted 20 / raw 24 / 12 candidates（1 equivalent + 11 deferred）**（node 复算 20+24=44；
       `asset/frame-animation-timeline` 候选已被恢复移除、cutscene 仍在）——与卡面/ Kimi 所引
       RESTORE 基线逐字一致；reorder **17 families / 28 adoptions / 31 paths / 19 owner files**
       （owner files 按 source+contentOwner+railOwner 去重本人复算=19）、reorder-allowlist 恰
       **12 entries**——三条链起点全部实证。
    2. **组件实锤直读**：header 两枚 `DsIconButton size="compact"`（30px）且
       `addDisabled/deleteDisabled` 为无原因 boolean；每行 eye/lock 亦 compact 30px 且 label
       随状态翻转（`显示图层/隐藏图层`、`解锁图层/锁定图层` + aria-pressed）——label 承载翻转
       动作文案、语义名称不稳定属实；active 行 `.layer-order` 2 枚 32px move——**同排 30/32
       混高必然**；名称按钮仅 `title`、无 `data-layer-id`、accessible name 不含 ID
       （LayerStackControls.tsx:106-181 本人直读）。
    3. **CSS/算术实锤**：`.map-layer-row` 为 `30px 30px minmax(0,1fr) auto` + min-height 38 +
       padding 4px 8px（editor.css:11331-11340 直读）——active 行固定件 30+30+68+16+gaps ≈
       156-163 > 140，「140px 名称列归零 + 行横溢」算术成立，`>=320/216` 两级换轨必要。
    4. **审计真模型缺陷实锤**：`action-group-audit.mjs` 对 adopted（:189-190）与 candidate
       （:224-225）**均硬编码 `moveButtonCount !== 2`**——header/state 类 0-move 合法组当前
       结构上不可登记，「registry 错误审计假设」逐字成立，validator 修真模型是本卡必要组成
       而非顺手改动。
    5. **命令/状态边界直读**：Map 排序 `session.dispatch(new MoveProjectMapLayerCommand(...))`
       （MapMode.tsx:2476）；显隐/锁定走 workspace 回调不进 content history；Stamp 结构写
       `ReplaceStampTemplateCommand`——与卡面边界一致。
    6. **目标基线算术本人复算**：自 10/44/20/24/12 +3 groups（header 0 / state 0 / order 2）、
       order 自 candidate 迁 adopted → **13 / 44 / 22 / 22 / 11（1 equivalent + 10 deferred +
       0 N/A）**，逐项自洽。
    7. **可推翻观察**：只迁 order 仍能全宽度证明同尺寸/正宽/focus/零横溢（算术已否）；0-move
       组不修 validator 也能双向闭合（硬编码已否）；显隐/锁定需进 content history（现为
       local state）——任一本签字失效。
  - design: **agree（2026-09-01，附 GM-A3-1~GM-A3-4 必落钉；与 Kimi KC3-1~KC3-5 收敛互补）**：
    - **GM-A3-1（validator 真模型钉，同 KC3-1）**：adopted `moveButtonCount` 改为「非负整数且
      等于 AST 实数」（0 合法），candidate 仍恰 2；负例矩阵先红后绿——0-move 合法正例、负数/
      小数/漏登记/与 AST 实数漂移必红；既有全部负例（单枚 raw move/1→3/wrapper regression 等）
      继续有效。三个领域 class（`map-layer-header-actions`/`layer-state-actions`/`layer-order`）
      只持 placement，不持 gap/wrap/尺寸。
    - **GM-A3-2（换轨与算术钉，同 KC3-2）**：`.map-layer-list` 唯一 inline-size container；
      `>=320` 三列同排（名称 ≥96px）、`<320` order 整组第二层右对齐、`<216` 三层 DOM 序；
      非选中行不渲染空白排序层；reorder rail inset 与 4px focus 外扩空间保留；Map 360/320/319/
      257/216/215/140 + Stamp host 360/230 双 consumer 逐档实测。
    - **GM-A3-3（命名与原因钉，同 KC3-3）**：状态钮 label 冻结 `图层可见：${name}` /
      `图层锁定：${name}`，状态仅由 aria-pressed + 图标表达；header 删除固定
      `删除选中图层：${activeLayer.name}` 且 danger；`addDisabledReason/deleteDisabledReason` +
      useId + aria-describedby 四段文案冻结；`选择图层：名称（稳定ID）` + `data-layer-id`。
    - **GM-A3-4（命令/基线/版本钉，同 KC3-4/5）**：Map 排序恰一条 MoveProjectMapLayerCommand
      + undo/redo、删除确认链不变；Stamp 恰一条 ReplaceStampTemplateCommand；显隐/锁定
      history/dirty 零变化；方向映射不改；冻结 **13/44/22/22/11 + 1+10+0**，其余 11 candidates
      生产零 diff（build diff 范围机器证明）；DS 四处一致 **2.23.0**。
- 用户裁决: 保留图层拖拽/移动 approved（2026-09-01）；三组与两级换轨形态 pending
- counter / 分歧处理: none
- build 准入: **blocked（2026-09-01 Codex + Kimi + GLM 三方 design 签字齐、无 counter；仍缺用户
  对三组/320/216 具体形态裁决，且依赖 ED-FRAME-TIMELINE-UX-RESTORE-1 完成——用户裁决与依赖
  齐前不得 build）**

### 进入 done 前

- Codex: pending
- Kimi: pending
- GLM: pending
- 用户验收: pending
- done 准入: blocked

## 交接日志

- 2026-09-01 GLM: 联合审签（同 SPRITE-ACTION-MODAL-1）。独立复算三条链起点（AG 现恰
  10/44/20/24/12 + 1 eq + 11 def、reorder 17/28/31/19、allowlist 12）与目标基线
  13/44/22/22/11 算术；直读组件实锤（header/state 30px + 翻转 label + boolean 无因禁用、
  order 32px 混高、名称钮无 ID）、`.map-layer-row` 30/30/1fr/auto + 140px 算术、audit
  adopted/candidate 双硬编码 `!==2`（0-move 组不可登记的真模型缺陷）、Map/Stamp 命令链与
  显隐/锁定 local state。签 premise verified + design agree，附 GM-A3-1（validator 真模型
  负例矩阵：0 合法/负数/小数/漏登记/AST 漂移 + candidate 仍 2 + 三 class 只持 placement）/
  GM-A3-2（320/216 两级换轨 + 名称 ≥96 + 4px focus + 双 consumer 逐档）/GM-A3-3（稳定命名
  + useId 原因 + data-layer-id）/GM-A3-4（命令/基线冻结/11 candidates 零 diff/DS 2.23.0）。
  未修改实现，未代签 Kimi。三席 design 齐；build 仍待用户三组/320/216 形态裁决与 RESTORE-1
  依赖闭合。Next: 用户裁决。
- 2026-09-01 Kimi: 独立直读 LayerStackControls（30px 状态钮翻转 label、32px order 混高、
  header 无原因 boolean）、行 CSS(140px 固定件 ≈160px 致名称列 0、横溢 16-23px 算术成立)、
  audit 对 adopted/candidate 硬编码 moveButtonCount=2(:189-190,:224-225)与 Map/Stamp 命令/
  本地状态边界;复算基线 13/44/22/22/11(自 RESTORE-1 新基线逐项一致)。签 premise verified +
  design agree(KC3-1 三组最小闭环 / KC3-2 320/216 换轨 / KC3-3 稳定命名与可见原因 / KC3-4
  命令状态边界 / KC3-5 基线与 DS2.23),完成独立反证。未修改实现,未代签 GLM。Next: GLM 签字 +
  用户三组/320/216 形态裁决;依赖 RESTORE-1 先完成。
- 2026-09-01 Codex: 独立审计把原三面批次拆开；本卡只处理共享LayerStackControls与registry 0-move
  真模型。未修改实现。Next: 用户批准三组/320/216形态；Kimi/GLM设计审签；RESTORE-1先完成。

## 下一位 Agent 提示词

```text
联合审签 ED-ACTION-GROUP-ADOPTION-3 与 ED-SPRITE-ACTION-MODAL-1（GLM 席，draft；生产实现
只读，只允许更新两卡签字/交接；不得代签，不得标 build/done）。

任务卡：
- docs/ops/tasks/ED-ACTION-GROUP-ADOPTION-3-layer-stack-actions.md（Kimi KC3-1~KC3-5 已签）
- docs/ops/tasks/ED-SPRITE-ACTION-MODAL-1-center-dialog-editor.md（Kimi KM1-KM5 已签）
当前状态：两卡 Codex + Kimi 已签；ADOPTION-3 另缺用户对三组/320/216 具体形态裁决；
依赖顺序：RESTORE-1 → ADOPTION-3 → SPRITE-ACTION-MODAL-1。

先读：AGENTS.md 前提真值门、READ-FIRST、ED-ACTION-GROUP-SPEC-1、ADOPTION-1、两卡全部签节、
DS-C.2a/DS-C.4d/DS-C.9/RF-27、action-group-adoption.json、reorder-adoption.json、
reorder-allowlist.json。

GLM 分工（独立证据，不复述 Codex/Kimi）：
1. ADOPTION-3：复算 13 groups / 44 moves / 22 adopted / 22 raw / 11 candidates（1 equivalent
   + 10 deferred + 0 N/A）；audit adopted「非负整数且等于 AST 实数」与 candidate 仍恰 2 的
   validator 新负例（0 合法、负数/小数/漏登记/漂移）先红后绿；LayerStackControls 组件测试矩阵
   （三组指纹、32×32、稳定 label+aria-pressed、danger、useId 原因+describedby）；Map 排序
   单 MoveProjectMapLayerCommand/undo 与 Stamp 单 ReplaceStampTemplateCommand/显隐锁定零
   history 的命令边界；320/216 换轨在 rail 占位后的名称正宽与 4px focus 归属；其余 11
   candidates 生产零 diff；DS 2.23.0 四处一致。
2. SPRITE-ACTION-MODAL-1：复算 ActionGroup 15/42/24/18/9、reorder 17/27/30/19、allowlist
   13/9；create baselinePoses/historyVersion 捕获与确认时重读校验（poses 相等、生成 ID 空闲、
   漂移零 command 保留输入）的测试覆盖；pristine 零写 / dirty alertdialog 零 command / edit
   一次一条 + global undo / close flush / IME 与 invalid 留 Dialog / ⌘S 两侧边界；搜索单选
   listbox 52 项虚拟窗口与 mounted DOM 预算；宽 2 窄 1 scroll owner 与 body overflow:hidden；
   分层 Esc 与窄态键盘焦点迁移（list→detail、detail→搜索 owner、删除 fallback）；单一
   SpriteSourceFramePicker owner 的双 consumer 合同测试；DS-C.9 长流程 modal 例外不扩散与
   DS 2.24.0 四处一致。
3. 200% zoom 无法可靠触发时保持“未实测”口径，不用 pinch/等效冒充。
输出：分别写回两卡 GLM 席 premise verified + design agree，或 counter + file:line/反例。
```
