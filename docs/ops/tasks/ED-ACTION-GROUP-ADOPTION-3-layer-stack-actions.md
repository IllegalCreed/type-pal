# ED-ACTION-GROUP-ADOPTION-3 - 地图与组合库图层动作组及窄栏合同

Status: done
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
  - **approved（2026-09-02）**——用户先明确“按照你的判断来吧”，并在三方签字齐后确认“都签了”；
    Codex据此采用已审签的header/state/order三组与320/216两级换轨，不再重复索要签字。

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

## 实现与验证证据

- 实现提交：`44c0cfd5`。`LayerStackControls`新增header/state/order三个compact `DsActionGroup`；状态
  accessible name稳定并以`aria-pressed`表达状态；名称按钮带完整name/id与`data-layer-id`；删除保持danger
  并随active稳定命名。新增/删除boolean改为可见reason + `aria-describedby`，Stamp相同接管原因只渲染一次。
- 响应式：`.map-layer-list`为唯一named inline-size container；`width < 320px`排序组完整进入第二行，
  `width < 216px`按state/name/order三层排列；非active行没有空`.layer-order`。三领域ActionGroup class静态门禁
  仅允许placement属性，公共32×32/4px/nowrap几何未被业务CSS接管。
- 命令/状态：Map动作按钮按稳定ID派发恰一条`MoveProjectMapLayerCommand`并可undo；删除确认链不变；显隐/
  锁定前后map identity、map revision、historyVersion、dirty均不变。Stamp未接管时add/delete/order禁用且原因
  可见，显隐零history；接管后move/delete各恰一条`ReplaceStampTemplateCommand`并可一步undo。
- registry/DS：ActionGroup冻结**13 groups / 44 moves / 22 adopted / 22 raw / 11 candidates（1 equivalent +
  10 deferred + 0 N/A）**；order沿用稳定ID`map/layer-stack/actions`；其余11 candidates逐对象零diff。
  validator允许adopted非负整数0-move并继续强制candidate=2，负数/小数/漏登记/AST漂移均有负例。DS版本、
  tokens、live spec与boundary同步为2.23.0；field-layout四条新证据与CSS census snapshot同步。
- 自动验证：
  - 聚焦：6 files / 176 tests全绿；action/boundary/field-layout/LayerStack独立95项亦全绿；
  - editor全量：185 files / 1534 tests全绿（`--maxWorkers=1`）；
  - `typecheck`、Vite production build、design-system gate（91 files / 2 evidence-bound exceptions）通过；
  - 其余候选owner生产零diff、allowlist仅刷新Stamp portal真实行号。
- 真实页面：PAL `map-001`以键盘sash实测list宽139/193/209进入三层、225/257/305进入两层、321进入
  同行；三档按钮32×32、group 68px、gap4px、nowrap，row/list/document横溢0，完整name/id保留，非active
  无排序伪行。最宽/最窄键盘focus-visible均为2px outline+2px offset且四边位于row内。`ui_samples` Stamp
  在viewport高480/720/1000实测host block-size 230/280.8/360；3层时list为唯一纵向scroll owner，最后层名称
  与可用排序按钮均可由键盘聚焦滚入可见区，footer完整位于host内。`ui_samples`均为authored，未冒充migrated
  接管原因视觉证据；该语义由集成测试覆盖。真实200%未可靠触发，未以页面缩放冒充。

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
- 用户裁决: **approved（2026-09-02）**——保留图层拖拽/移动；三组与320/216两级换轨按用户授权
  Codex判断采用已审签方案；三方签字齐后用户再次确认“都签了”。
- counter / 分歧处理: none
- build 准入: **allowed（2026-09-02 Codex + Kimi + GLM 三方 design 签字齐、无 counter；用户形态
  裁决与 ED-FRAME-TIMELINE-UX-RESTORE-1 done 依赖均齐；Codex为唯一Coding Owner）**

### 进入 done 前

- Codex: **accept（2026-09-02）**——实现、命令边界、registry负例、1534项全量与Map/Stamp真实双consumer
  三档布局/focus/scroll均复核通过；schema/capability-map/命令owner未变。
- Kimi: **accept（2026-09-02，只读终审 `44c0cfd5` 全 diff + 真实 Map 双面板七档复测 +
  registry/版本/命令边界复核与本人聚焦复跑，非复述 Codex）**。按 KC3-1~KC3-5 与卡面四点逐项核验：
  - **三组唯一尺寸 owner ✓（实机 + diff）**:header/state/order 三个 compact ActionGroup 实机
    全部按钮恰 **32×32**(140px 最窄档亦无 30px 残留);按钮 `size=` 已删、私有几何规则清除,
    领域 class 只持 placement。header 删除实机 label=`删除选中图层：下层` + danger 边框
    rgb(242,125,132);状态钮实机稳定 label=`图层可见：上层`/`图层锁定：上层`,状态仅由
    `aria-pressed`+图标表达、SVG `aria-hidden`;order label=`上移图层：下层` 含完整图层名;
    名称钮实机 `aria-label=选择图层：上层（layer-1）` + `data-layer-id=layer-1`;
    `addDisabledReason/deleteDisabledReason` + useId + `aria-describedby` 与共享原因去重逻辑
    (Map 三段冻结文案 / Stamp 接管文案)diff 直读一致。
  - **断点与溢出 ✓（实机七档）**:360/320 同排（state+name+order 同行,stateOrderSameRow),
    319/257 order 整组第二层,216 名称 98px ≥96,215/140 三层 DOM 序、名称 169/94px 正宽可见;
    七档 `scrollWidth===clientWidth`、row/list/document 横向溢出全 0;非活动行无 order 渲染
    （零空轨）;`.map-layer-list` 唯一命名 inline-size container、`<320` 与 `<216` 两条
    container query 与设计逐字一致。
  - **命令/状态边界 ✓**:Map `deleteLayerDisabledReason` 三段冻结文案 + 排序仍走
    MoveProjectMapLayerCommand(diff 直读，确认链未触);Stamp ownership/删除两段原因 +
    结构写仍一条 ReplaceStampTemplateCommand;显隐/锁定为 local state、history/dirty 不变
    （卡面锚点与 diff 相容）;方向映射 stackOrder 传参未改;canMoveUp/Down 冗余 props 已清。
  - **registry/版本 ✓（本人复算）**:baseline 恰 `13 groups / 44 moves / 22 adopted /
    22 raw / 11 candidates`;三条 layer 登记为 header-actions/state-actions(0 moves,compact,
    icon-only)+ actions(2 moves);candidates **1 equivalent + 10 deferred + 0 N/A**;
    audit adopted 改为「非负整数且等于 AST 实数」、candidate 仍恰 2,0-move 合法与漂移负例在
    adoption 测试内;DS **2.23.0** index.ts 实测（tokens/spec/boundary 同步见 diff）;
    其余 11 candidates 生产零 diff(commit stat 证明）;field-layout snapshot 同步。
  - **验证（本人执行）**:LayerStackControls + MapMode + StampLibraryTab +
    action-group-adoption + boundary + field-layout-adoption → **6 files / 176 tests 全绿**;
    `pnpm --filter @type-pal/editor typecheck` 通过;`audit:design-system` →
    **91 files / 2 evidence-bound exceptions passed**。
  无返工项；未修改实现，未代签 GLM。
- GLM: **accept（2026-09-02，只读终审 `44c0cfd5` + registry/validator/DOM/CSS 独立复算 + 本人
  Map 七档实机几何 + 聚焦复跑，非复述 Codex/Kimi；与 Kimi 口径各自独立取得后收敛）**。按
  GM-A3-1~A3-4 逐钉核验：
  - **registry/audit 复算 ✓（GM-A3-1/5）**：baseline 恰 **13 groups / 44 moves / adopted 22 /
    raw 22 / 11 candidates（1 equivalent + 10 deferred + 0 N/A）**（本人 node 复算 22+22=44）；
    三条 layer 登记——`map/layer-stack/header-actions`（**0 moves**）、`state-actions`
    （**0 moves**）、`actions`（2 moves），均 compact/icon-only；`layer-order` candidate 已移除
    （candidates 零残留）；**其余 11 candidates 生产文件零 diff**（本人对提交文件面逐一核对，
    Casualty/Cutscene/EffectEditor/Poison/ProjectWorkbench/Script×2/Sprite×2/FrameAnimation
    全部不在 diff）。**validator 真模型**：adopted 改「非负整数且等于 AST 实数」（audit diff
    直读，负例 `owns 0 move buttons, expected 1` 漂移红实证）、candidate 仍恰 2（:225 原样）；
    负例矩阵复跑绿——0-move 合法正例（恰 header/state）、candidate-zero 红、生产 45/raw 23
    漂移红、两组 wrapper regression 红、既有全家族继续有效。
  - **组件 DOM/命名 ✓（GM-A3-3）**：useId 原因 + `aria-describedby`，且**同文案共享去重**
    （add/delete 同 reason 时共用同一 id——diff 直读）；稳定 label 实机——`图层可见：上层` +
    `aria-pressed`、名称钮 `选择图层：上层（layer-1）` + `data-layer-id`、danger 删除
    `删除选中图层：下层`（实机逐字）；三组全部 `DsActionGroup density="compact"`。
  - **命令/测试矩阵 ✓（GM-A3-4）**：Map 排序恰一条 `MoveProjectMapLayerCommand`（MapMode.test
    :929「按稳定 ID 只派发一条」）、删除确认链、显隐/锁定零 history、Stamp
    `ReplaceStampTemplateCommand` 与未接管禁用原因——全部在本人复跑的 **6 files / 176 tests**
    内绿（LayerStackControls 245 行新测试含三组指纹/32×32/pressed/danger/describedby）。
  - **Map 七档实机几何 ✓（GM-A3-2，本席独立测量；真实实现 + 容器注入变宽，测后复原）**：
    **360/320** 三列同排（state/名称/order 同 top，row 高 40）、名称 170/130px ≥96；
    **319/257** order 整组第二层右对齐（row 高 76）、名称 201/139 ≥96；**216** 两层、名称
    **98 ≥96**（`minmax(96px,1fr)` 轨下限生效的最紧档）；**215/140** 三层（row 高 112）、
    `.layer-name > span` 正宽 157/82px 可见字符；**非活动行无空轨**（两层档非活动行高 40=
    自身两行内容、无 order 占位；三层档单列）；**focus 外扩（4px）全部落在 row 内**七档全真；
    list/body 溢出 0 七档全真；活态 193px（<216）三层档全部按钮恰 **32px** 零混高、复原干净。
  - **测试证据自洽 ✓**：本人复跑 LayerStackControls + MapMode + StampLibraryTab +
    action-group + boundary + field-layout **6 files / 176 tests 全绿** + typecheck 干净 +
    design-system gate **91 files / 2 evidence-bound exceptions**；DS 版本四处一致
    **2.23.0**（index/tokens/spec Status/Owner 链本人直读）。
  - **Stamp consumer 实机几何 ✓（GM-A3-2，本席经 `?ui_samples=1` 评审样例补测；sandbox
    workspace 内存注入、零仓库写入）**：开发基线组合库为空，改用 `?ui_samples=1`
    （main.tsx:39,96-103——内存评审数据 + `createSandboxWorkspaceContext`，无 PAL proof 权限）
    打开评审组合的 StampContentEditor host——活态 **193px**（<216 三层）全钮 32×32、header 组
    在场、名称 147/span 135 正宽、focus 归属、双溢出 0；注入 **360/320** 同排（与 Map consumer
    同一换轨行为，名称 170/130 ≥96）、**230** 两层 order 下沉（名称 **112 ≥96**、span 100
    正宽）、三档 focus/溢出全 0、复原干净——**双 consumer 换轨合同一致闭合**。
  - **诚实声明**：**200% zoom 未实测**（环境同限），不以 pinch/等效冒充；Map 七档 + Stamp
    三档 + 双活态 193px 已覆盖换轨全部分支。
  无返工项；未修改实现/测试（容器注入仅本会话页面态并已复原），未代签 Kimi，未填用户验收。
- 用户验收: **accept（2026-09-02）**——用户确认两行窄栏为预期设计后明确“通过”。
- done 准入: **allowed（Codex + Kimi + GLM 三方 accept 与用户验收齐）**

## 交接日志

- 2026-09-02 User: 确认`<320px`排序动作整组进入第二行是刻意的窄栏设计后验收通过；本卡转done，
  `ED-SPRITE-ACTION-MODAL-1`依赖正式解除。
- 2026-09-02 GLM: 只读终审 `44c0cfd5`，签 **accept**。独立证据：registry node 复算 13/44/22/22/11
  + 1 equivalent + 10 deferred、三条 layer 登记 header/state=0 order=2 compact/icon-only、
  其余 11 candidates 生产文件零 diff；validator adopted 非负整数+AST 实数（漂移负例
  `owns 0, expected 1` 红）与 candidate 仍恰 2、负例矩阵复跑绿；useId 原因共享去重与稳定命名
  （图层可见/锁定、选择图层：名称（ID）+data-layer-id、danger 删除带图层名）实机逐字；
  Map 七档实机——360/320 同排（名称 170/130≥96）、319/257 两层（201/139）、216 两层最紧档
  名称 **98≥96**、215/140 三层 span 正宽、非活动行零空轨、4px focus 归属、双溢出 0、活态
  193px 全 32px、复原干净；Stamp consumer 经 `?ui_samples=1`（sandbox 内存评审数据，零仓库
  写入）补测——活态 193px 三层全 32px、360/320 同排（名称 170/130≥96）、230 两层（名称
  112≥96）、focus/溢出 0、复原干净，双 consumer 换轨一致；复跑 6 files / 176 tests +
  typecheck + 91-file gate 全绿、DS 2.23.0四处一致。200% 未实测口径保持。无返工项；未修改实现/测试，未代签 Kimi，未填用户验收。
  三方 accept 齐，仅剩用户验收；无下一位 Agent 提示词，等待用户验收/收口。
- 2026-09-02 Kimi: 只读终审 `44c0cfd5`，签 **accept**。独立证据：三组实机全 32×32 无 30px
  残留、header 删除含层名 danger、状态钮稳定 label+aria-pressed+SVG hidden、order 含完整层名、
  名称钮含 ID 的 aria-label+data-layer-id、useId 原因+describedby 与共享去重（均实机/diff);
  七档断点 360/320 同排、319/257 order 下沉、216 名称 98、215/140 三层且名称正宽、溢出全 0、
  非活动行零空轨;Map/Stamp 原因文案与命令链（MoveProjectMapLayerCommand /
  ReplaceStampTemplateCommand / 显隐锁定零 history）未变;registry 复算恰 13/44/22/22/11 +
  1 equivalent + 10 deferred、三条 0/0/2 moves 登记、DS 2.23.0 实测、其余 11 candidates 零 diff;
  本人复跑 6 files / 176 tests 全绿、typecheck 通过、DS gate 91 files / 2 exceptions 通过。
  无返工项；未修改实现，未代签 GLM，未标 done。Next: GLM 覆盖终审与用户验收。
- 2026-09-02 Codex: `44c0cfd5`完成三ActionGroup、320/216换轨、稳定名称/原因与0-move registry真模型；
  聚焦176、全量1534、typecheck/build/gate及Map/Stamp实机通过。卡转review，Next: Kimi实现/视觉审查，
  不得改实现；accept后交GLM覆盖终审。
- 2026-09-02 User + Codex: 用户此前授权“按照你的判断来”，三方签字齐后确认“都签了”；记录三组与
  320/216两级换轨裁决approved。RESTORE-1已done，卡转build，Codex直接实现，不再重复签字。
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
无下一位 Agent 提示词；三方accept与用户验收齐，本卡已done。
```
