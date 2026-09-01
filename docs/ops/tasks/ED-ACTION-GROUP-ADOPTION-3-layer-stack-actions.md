# ED-ACTION-GROUP-ADOPTION-3 - 地图与组合库图层动作组及窄栏合同

Status: draft
Phase: phase2
Capability: Editor design-system action-group governance（不改变 capability-map）
Coding Owner: Codex
Reviewer: Kimi + GLM
Risk: 公共合同迭代（共享组件 + registry validator；完整三签）
Depends On: `ED-ACTION-GROUP-ADOPTION-2`
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
- 用户裁决：**pending**。

## 上下文锚点

- `docs/phase2/READ-FIRST.md`
- `ED-ACTION-GROUP-SPEC-1`、`ED-ACTION-GROUP-ADOPTION-1/2`
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
7. build顺序基于ADOPTION-2新基线；本卡新增adopted恰3条（header/state为0 move，order为2 move），
   完成后冻结：**14 groups / 46 moves / 24 adopted / 22 raw / 11 candidates
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
- 门禁：validator 0-move组合同与负例；14/46/24/22/11 +1 equivalent/10 deferred/0 N/A精确；其余
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
    DS2.23.0；不改变数据/命令owner。
- Kimi: premise/design pending
- GLM: premise/design pending
- 用户裁决: pending（三组与两级换轨形态）
- build 准入: **blocked**（依赖ADOPTION-2、Kimi/GLM签字与用户裁决未齐）

### 进入 done 前

- Codex: pending
- Kimi: pending
- GLM: pending
- 用户验收: pending
- done 准入: blocked

## 交接日志

- 2026-09-01 Codex: 独立审计把原三面批次拆开；本卡只处理共享LayerStackControls与registry 0-move
  真模型。未修改实现。Next: 用户批准三组/320/216形态；Kimi/GLM设计审签；ADOPTION-2先完成。

## 下一位 Agent 提示词

```text
审签 ED-ACTION-GROUP-ADOPTION-3（Kimi 席，draft；生产实现只读，只允许更新任务卡签字/交接）。

任务卡：docs/ops/tasks/ED-ACTION-GROUP-ADOPTION-3-layer-stack-actions.md
当前用户三组/320/216形态裁决仍pending，且依赖ADOPTION-2；用户 + Kimi + GLM三门齐前不得build。
先读：AGENTS.md前提真值门、READ-FIRST、ED-ACTION-GROUP-SPEC-1、ADOPTION-1/2、DS-C.2a与本卡全文。

请独立核验：只迁layer-order是否必造30/32混高；Map+Stamp两caller的命令/本地状态边界；header/state/order
三个ActionGroup与0-move registry合同；320/216两级换轨在reorder rail占位后的可用宽；上下文状态名称、
danger和可见disabled reason；顺序目标14/46/24/22/11及DS2.23.0版本判断。

输出Kimi premise verified + design agree，或counter + P0/P1/P2/file:line/反例。若agree，仅写回本卡
签字/交接并附GLM提示词；不得修改实现、代签GLM或标build/done。
```
