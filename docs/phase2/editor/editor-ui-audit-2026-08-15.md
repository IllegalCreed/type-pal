# 编辑器视觉与工作台一致性巡检（2026-08-15）

Status: working audit（ED-AUDIT-2 输入；不是任一页面的 build authority）

## 1. 结论

用户不应继续逐页指出基础问题。当前最主要的问题不是某个 padding，而是生产页仍同时存在三代界面语言：

1. 旧 `outliner + 裸表单 + 说明型 inspector`；
2. Actor 首轮对象工作台；
3. BattleField / Shop 等新对象工作台。

后续必须按同一设计系统逐批迁移，不能再把某个已改页面直接复制为唯一模板。Actor 的任务分区和
BattleField 的主次层级都可借鉴，但列表、Header、面板控制、表单 primitive、Inspector 和响应式必须使用
共同合同。

## 2. 本轮证据

- 浏览器：本地生产编辑器 `http://localhost:6010/`，Chromium CSS viewport `1280×720`。
- 实机页：Skill、Actor、BattleField、Shop、Image，以及 Story scripts/vars/events、Map tileset；用户本轮
  还提供了 Header、Shop、Skill、Actor/BattleField 对照截图。
- 代码巡检：`EDITOR_MODULES` 登记的 8 个模块、24 个二级页面；重点读取 `App.tsx`、`SkillTab.tsx`、
  `ActorMode.tsx`、`BattleFieldTab.tsx`、`ShopTab.tsx`、`ItemTab.tsx`、`ImageTab.tsx`、`EnemyTab.tsx`、
  `PoisonTab.tsx`、`ProjectWorkbenchTab.tsx`、`PanelResizeHandle.tsx` 与相应 CSS。
- 浏览器观察：Header 高 `41px`；Wide 左右面板约 `210/306px`；每个页面当前都有两处 sash toggle。
  对 Stamp/Actor 执行通用全 DOM census 时曾超过 browser evaluate deadline；这是需单独 profile 的信号，
  不能单凭这一观察判定业务性能结论。
- 静态规模：Skill `1114` 行、Enemy `823`、Poison `479`、Item `2089`、ProjectWorkbench `1700`、
  MapMode `4031`。它们不是重构理由本身，但说明不能继续在单组件内叠加页面级布局和领域编辑器。

## 3. 跨页面公共红项

| ID | 红项 | 当前证据 | 统一处理 |
|---|---|---|---|
| U-01 | Header 操作过大，布局控制分散 | 用户截图；`EditorAppHeader` 仅三操作；sash 常驻 toggle | ED-DS-2 v2.1 紧凑工具栏 + View menu + 三面板控制 |
| U-02 | 列表选中语法不统一 | Actor 已改全宽方角；历史 Shop 等曾为 inset 圆角卡 | `DS-C.3`：全宽、方角、左 accent；模块不得私有 active 卡片 |
| U-03 | 中央工作平面与卡片层级不统一 | Actor/BattleField/Skill/Shop 明度和留白不同 | canvas 最深，panel/card/input 逐级抬高；统一 hero/section/card |
| U-04 | Inspector 没有统一职责 | Skill/Shop 右侧是贴边长说明；Actor/BattleField 已有摘要/引用 | Inspector 固定为摘要、引用、当前选择上下文和危险操作；正文帮助进 help/callout |
| U-05 | panel sash 同时承担 resize 与 toggle | `PanelResizeHandle.tsx` 与 `.panel-resizer-toggle` | sash 仅 resize；Header/View 提供显隐与恢复 |
| U-06 | 原生表单与局部 CSS 并存 | production 大量 `<select>`/checkbox；Skill 自有 grid/11px label | 按 primitive 迁移，禁止页面继续自造 control state |
| U-07 | 大量列表/option 缺统一性能策略 | Tileset 223 项；Skill 音效 picker 数百 option；Stamp DOM census 超时 | shared VirtualList/Combobox；复杂交互行 <=120，长 option 改可搜索 picker |
| U-08 | 空/错/加载/缺引用的恢复语法不统一 | 历史白屏、`stages is not iterable`；各页私有空态 | 统一 boundary + visible error + retry/open-source action；禁止静默空数组 |
| U-09 | 页面自身标题与主任务说明不稳定 | Skill 直接从“基础”表单开始；BattleField 有明确 hero | 每个对象页必须先有 hero：类型/id、名称、摘要、状态、主要动作 |
| U-10 | 页面级 inline layout 仍多 | Skill/Enemy/Ambience 等保留 inline style | 迁移卡逐页删除并记录例外；不得在 ED-DS-2 批量机械改写 |
| U-11 | 按钮体系只有规范、没有完成采用 | 静态审计：69 个 TSX 文件中有 571 个原生 `<button>`；`DsButton/DsIconButton` 仅 7 个调用；`tool/btn/mini/mini-txt/pv-btn/item-action-button` 六个高频遗留族外仍有业务私有族 | 公共入口只保留 `DsButton/DsActionLink/DsIconButton/DsToolbar/DsMenuItem`；先迁高频遗留族，再按文件拆解语义混杂的 `.btn`，最终用边界测试禁止新增遗留 token |
| U-12 | 对象级删除的位置随模块漂移 | Skill/Enemy/BattleField 在 hero，Actor 曾在 Inspector 底部；引用面板标题又重复写“引用与删除” | 对象级删除统一进入 `DsObjectHero.actions`；Inspector 只保留“引用”与阻断原因；子项删除留在所属行/卡片 |

### 3.1 按钮迁移顺序

按钮视觉只允许 `primary / secondary / quiet / danger` 四个层级；HTML 元素差异只表达语义，不得形成新皮肤。

1. P0：补齐共享按钮/link 的 hover、active、focus-visible、disabled 状态；列表头操作改为复用 compact icon action。
2. P1：机械迁移 `tool / mini / mini-txt / pv-btn`，先区分普通动作、导航、图标动作和 toolbar 命令。
3. P2：逐文件迁移 `.btn`；它在不同容器中语义和尺寸冲突，禁止用全局 alias 粗暴覆盖。
4. P3：清除 item/music/tileset/stamp/image/sprite 等业务按钮皮肤，只允许页面保留布局类。
5. 门禁：扫描非 design-system TSX/CSS，遗留 token 采用只减不增基线；禁止无 accessible name 的图标按钮、
   无 `:not(:disabled)` 的 hover，以及页面 CSS 重写按钮尺寸/边框/圆角/颜色/焦点环。

## 4. 页面优先矩阵

| 批次 | 页面 | 现状判断 | 主要动作 |
|---|---|---|---|
| P0 foundation | 全局 Header / left-bottom-right panels / status | 用户刚拍板，当前实现未满足 | ED-DS-2 v2.1，先完成再迁业务页 |
| P0 first migration | Battle / Skill | 旧裸表单最典型；Inspector、效果链、预览和 hero 均需重做 | 新开 `ED-BATTLE-UI-1`，以 Data/Object hybrid recipe 重构 |
| P1 battle family | Enemy / Poison | 与 Skill 同代旧布局，领域字段复杂 | 共享 Battle data shell，分别保留领域扩展，不复制 Skill JSX |
| P1 item family | Item / Shop | Shop 已有三栏骨架但中央/右侧层级仍弱；Item 单文件过大 | 先统一 Shop recipe，再拆 Item 分区/引用/效果编辑器 |
| P1 assets | Image / Sprite / Music / Sound / Cutscene | Image 媒体画布仍需标准缩放；音频/过场页工作台语言分裂 | Media recipe + shared picker/preview/inspector |
| P1 map tools | Map / Tileset / Stamp | 专业画布保留；目录/预览/Inspector 和大列表需统一 | 不重做画布算法，只迁外壳、列表、panel 和反馈 |
| P1 story | Scripts | 专业脚本工作台，不能套普通表单；需独立代码质量审查 | Script recipe、错误聚焦、树键盘、drawer |
| P2 simple data | Ambience / Vars / Events | 结构较小但仍用旧裸列表/说明 | 作为 primitive 快速采用批次 |
| P1 project | Overview / Startup / Entrypoint / Advanced | 四页共用大组件，信息架构与危险操作需复核 | Object/Script recipe 分页采用；保留稳定深链 |
| P1 references | Actor / BattleField | 不是“已统一完成”，是双参考输入 | 统一 hero、列表、panel controls、spacing；保留各自主任务差异 |
| P1 complex scene | Scene | 高频核心页，涉及实体/脚本/引用闭环 | 在基础稳定后单独开卡，不和视觉批量迁移混写 |

## 5. Skill 页面重设计摘要

Skill 采用“数据目录 + 对象工作台”的 hybrid recipe：

- 左：搜索、类别/可用范围过滤、名称/id/目标/消耗摘要；选中行遵守 DS-C.3。
- 中：对象 hero（技能/id、目标、消耗、战内/战外、试放）后分为基础、消耗与说明、效果链、动画、施法分支。
- 效果链：每个 effect 是有序 card/row，显示序号、类型、可读摘要和紧凑 reorder/delete；字段在选中 effect
  的编辑区展开，不把所有复杂字段横向铺成一行。
- 媒体：召唤/变身/FIRE 预览使用统一 black media stage 和共享 fit/1:1/播放语法，不作为孤立大黑块插在字段间。
- 右：技能摘要、引用/被谁习得、当前 effect 上下文和删除阻断；帮助说明移到可关闭 callout/帮助入口。
- 功能闭环：创建、编辑、保存、重开、深链、被角色/敌人引用、删除阻断与战斗试放都要有测试；本卡不改
  content schema、Skill 运行时语义或原版数值。

## 6. 审计边界

- 本文不声称 24 页功能闭环已验收；功能七环仍由 ED-1/模块卡逐项验证。
- 本文不允许一次性重写全编辑器。顺序固定为 ED-DS-2 foundation → ED-AUDIT-2 完整矩阵 → 小批模块迁移。
- 用户后续指出的新问题要并入相应公共红项/页面卡，不再只做截图位置的局部补丁。

## 7. 2026-08-15 执行裁决：主动连续迁移，不等待逐页点名

用户明确指出“角色标题、技能、敌人等页面的重构”属于同一轮编辑器统一工作，否决把 ED-DS-2 的底部
面板纠错当作当前工作终点。执行方式调整为：仍用小批 diff 保证可审查和可回滚，但批次连续推进，Agent
主动巡检下一批，不再要求用户逐页提供截图。

1. `ED-BATTLE-UI-1`：共享 Object Hero + Actor/BattleField 基准迁移 + Skill/Enemy/Poison。
2. Item/Shop：共享对象目录、商品编排、引用/删除与 Inspector。
3. Assets：Image/Sprite/Music/Sound/Cutscene 统一 Media workbench、缩放和背景。
4. Map/Story/Project：保留专业画布/脚本语义，统一壳、列表、panel、错误与键盘。
5. Scene：最后单独处理高复杂工作台；保留地图/演出/脚本上下分栏能力。

“小批”只表示工程风险控制，不表示等待用户逐批提醒。每批完成自验后立即进入下一批设计/签字流程，直到
24 页矩阵完成。
