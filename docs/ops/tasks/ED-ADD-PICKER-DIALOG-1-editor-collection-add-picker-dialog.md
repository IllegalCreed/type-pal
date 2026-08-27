# ED-ADD-PICKER-DIALOG-1 - 编辑器候选对象添加弹窗统一

Status: build（2026-08-27 Codex + Kimi + GLM 已在 4+6 冻结基线上签齐；Codex 恢复唯一 Coding Owner）
Phase: phase2
Capability: Editor cross-cutting（不改变 capability-map）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: `codex/ed-project-startup-ia-1`（按当前串行工作分支推进；本卡单独提交）

## 目标

把“从已有对象候选中选择一项，再追加到当前集合”的添加动作统一为紧凑的标题区按钮和共享搜索选择弹窗：
页面不再常驻占满整行的下拉框 + 添加按钮，作者在弹窗内搜索、读取必要身份信息、选择并明确确认；取消不写
状态，确认只产生一条可撤销命令。首批必须收口入口初始队员、初始道具和可配置世界资源，并用生产 census、公共
组件与静态门禁防止页面重新发明私有 picker。

## 范围

- 范围内:
  - 建立“候选对象添加”适用判定：数据来自已有对象 / live registry，动作语义是把候选追加到集合，且选择前不应
    修改 canonical state。所有命中项进入生产 adoption registry，首批至少覆盖入口初始队员、初始道具、初始世界
    资源；其余命中项要么采用，要么提供 owner / 理由 / 删除条件明确的 evidence allowlist。
  - 新增唯一共享 picker dialog owner（工作名 `DsAddPickerDialog`，最终命名由三方设计签字冻结）。触发器使用
    `DsButton`，位于集合标题动作区；数量 tag、帮助与添加动作共用稳定 header，不因 0 / 1 / N 项改变位置。
  - 弹窗正文直接呈现搜索框 + 候选列表，不在弹窗里再嵌套一个下拉框。候选行支持可读主名称、稳定 ID 次级信息、
    可选媒体 / 类型 / 状态槽；整行是单一选择命中区，具备 selected / active / disabled 状态。列表复用 / 扩展
    `DsVirtualList` 与现有选择器过滤语义，不复制另一套虚拟、键盘或焦点状态机。
  - 首版冻结为**单选 + 明确确认**：打开弹窗不会写数据；选择只更新 dialog-local draft；底部“取消 / 加入队伍”或
    “取消 / 添加道具 / 添加资源”明确动作，未选择时确认禁用。Escape / 关闭 / 点击取消均丢弃 draft。
    这是用户拍板的“选择后再确定”，不得把候选行点击 / Enter 偷换成即时 add。候选结果采用可访问的 single-select
    listbox / option + `aria-selected` 语义；若现有 `DsVirtualList` 的 list / listitem + button 公共 API 不适配，应抽取
    其虚拟窗口 engine，而不是混用错误角色。
  - 搜索至少覆盖可读名称、稳定 ID 和领域次级信息；结果数、零结果和所有候选已添加都用可理解文案表达。已在当前
    集合中的对象默认从候选排除；若领域需要解释不可选原因，保留 disabled 行和原因，不静默伪装成缺失。
  - 大列表复用 / 抽取现有虚拟窗口 owner。PAL 初始道具当前有 234 项，禁止在弹窗中直接 `.map()` 挂载全部复杂行；
    滚动、键盘 active descendant、搜索过滤和结果计数必须共用同一过滤 / 虚拟索引真源。
  - `DsDialog` 继续持有 native modal、Escape、关闭与焦点归还；overlay / tooltip / popup 必须留在最近 native dialog
    top-layer host。正文是唯一滚动 owner，footer 固定可见，720px / 200% zoom 不遮挡当前焦点。
  - 每次确认最多调用一次领域 `onConfirm(id)`；双击、Enter、按钮点击、IME composition、快速重复点击不得造成双加。
    对象 / 入口切换、外部 revision、undo / redo、readOnly 切换和 unmount 必须关闭或 resync draft，不得把候选串到
    另一个对象。
  - 调整设计系统分类规则：`DsInlineComposer` 继续负责自由文本、短列表或明确高频的“输入 / 选择 + 立即动作”行；
    “从已有对象库选择后追加”改由共享 Add Picker Dialog 持有。不能继续用“一切主控件 + 尾部动作都必须 inline”
    的过宽规则覆盖两类不同任务。
  - 更新 Design Lab、公共测试、设计规范和 adoption / boundary gate；公共组件变更按 DS-G.4 同步规范、代码常量、
    CSS token 版本到实施时的下一 minor。
- 范围外:
  - 不修改 `StartWorld`、角色、物品、世界资源、save、runtime、migration 或 PAL 生成数据；只改编辑器交互与公共 UI。
  - 不把编辑已有行中对象引用的 `DsSelect` 改成添加弹窗；“替换当前值”和“向集合新增对象”是不同任务。
  - 不替换自由文本新建、稳定 ID 创建、文件选择、危险删除确认或完整对象创建向导；它们不属于候选追加。
  - 首版不做多选 / 批量添加、批量数量编辑、“添加并继续”、跨集合拖放或在弹窗内重排。队伍顺序和道具数量继续在
    添加后的正式行中编辑。
  - 不改变初始世界资源的 live consumer 派生、`collectValue` 排除、repair 四态或入口 ownership。
  - 不重开已完成的 `ED-DS-3` / `ED-FIELD-COMMIT-1`；`ED-PROJECT-STARTUP-IA-1` 当前 candidate 继续独立 review，
    本卡是用户明确要求的新 successor，不使其历史 build / review 证据失效。
- 明确不做:
  - 不在 `ProjectWorkbenchTab` 写页面私有 `<dialog>`、搜索状态机、portal、虚拟列表或 picker CSS。
  - 不得选择“dialog 内再开 select”或“复制一份 direct list 状态机”任一捷径；direct list 必须复用共享虚拟 owner。
  - 不直接复用当前 `DsMultiSelect`：它即时 `onChange`、无明确确认且对过滤结果直接 map，不满足本卡事务和 234 项性能合同。
  - 不用关闭弹窗作为隐式确认，不允许选择候选时立即写 canonical state。

## 前提真值门

### 一句话行为 / 工程前提

当前入口工作台的三类“选择已有候选再添加”都常驻为宽 `DsInlineComposer`；仓库已有可访问的 dialog、搜索选择、
dialog-aware portal 和虚拟化基础，但没有“打开 -> 搜索 / 选择 -> 明确确认 -> 单命令”的公共添加 picker owner，
因此应修共享交互与 adoption，而不是继续逐页面压缩输入框。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：这是二阶段作者工具的集合添加交互；原版游戏不定义编辑器弹窗、焦点或撤销行为。 | `docs/phase2/READ-FIRST.md:1-8` |
| 第一阶段 | N/A：一阶段没有 Reforge 项目工作台与设计系统；本卡不改变一阶段 / 运行时的队伍、库存或资源语义。 | `docs/phase2/READ-FIRST.md:32-37` |
| 当前二阶段 | Startup 的队员、道具、世界资源分别常驻 `DsInlineComposer`；现有测试证明每项选择后再点尾部按钮写一条命令。`DsDialog` 已持有 native modal / Escape / 焦点归还，`DsFloatingLayer` 已处理 native dialog top layer，`DsSelect` 在 80 项以上虚拟化；但生产代码没有共享 Add Picker Dialog。PAL 当前有 234 个物品。 | `packages/editor/src/ui/ProjectWorkbenchTab.tsx:906-937,1079-1117,1175-1214`；`packages/editor/src/ui/ProjectWorkbenchTab.test.tsx:521-533,625-695,968-1051`；`packages/editor/src/ui/design-system/overlays.tsx:5-92`；`packages/editor/src/ui/design-system/floating-layer.tsx:20-32`；`packages/editor/src/ui/design-system/controls.tsx:1092-1096,1244-1252`；`projects/pal/content/items.json`（234 项） |
| 本任务目标 | 保持领域数据和命令 owner 不变，把候选追加的 UI owner 改为共享标题动作 + 单选确认弹窗；页面只提供 live options、领域行内容和一次性 confirm adapter。 | 用户 2026-08-27 产品裁决；本卡范围与验收条件 |

### 2026-08-27 census 更正（重新打开前提门）

- Codex 独立直读确认原签字所称“4 处对话式 + 3 处 append-first-default 全量命中”不闭合。对话式 4 处不变；
  append-first-default 还包括：
  - `SkillTab.tsx:1237-1260`：从 live `items` 取 `firstUnused`，向 `skill.cost.items` 追加
    `{ itemId, amount: 1 }`，命令 owner 为 `UpdateSkillCommand`；
  - `LevelingEditor.tsx:65-115`：从 live `skills` 取 `skillIds[0]`，向 `levelUp[actorId]` 追加
    `{ level: max + 1, skillId }` 并排序，命令 owner 为 `UpdateLevelUpCommand`；
  - `SpriteActionEditor.tsx:61,544-565`：从 live asset catalog 取 `firstSoundAsset`，向当前 step 的
    `cues` 追加 `{ kind: 'sound', asset }`，命令 owner 为 `UpdateSpriteCommand`。
- `ItemAmountList` 不是单一路径：同一 append-default owner 实际覆盖配方材料、配方产物、资源奖励档位三条 data path
  （`ItemUseEffectEditor.tsx:492-503,862-868`），registry 必须逐路径登记，不能以一个模糊条目代替。
- 两席独立复扫后的生产基线为 **4 处对话式追加 + 6 个 append-first-default owner（其中 ItemAmountList 覆盖
  3 条 data path）**。新增三处与原三处采用同一分类：本卡首轮只登记为 deferred evidence，不趁补 census 扩大业务迁移范围；
  删除条件是后续任务为“先选后追加”或“创建默认行后编辑”作出统一产品裁决并独立签字。
- 这改变 AP1 的“全量 census”核心前提，因此 2026-08-27 原 Codex / Kimi / GLM build 签字仅保留为历史记录，
  **不再授权继续修改实现文件**。Kimi / GLM 已分别直读新增 owner 并共同 counter 4+5；本节现按其直接证据登记
  4+6 基线、三条 ItemAmountList data path 与 deferred 理由。两席把 counter 转为 agree 前仍不得恢复 build；
  无须重审已冻结的 Dialog 公共 API。

#### 4+6 冻结分类 registry（docs 真源；JSON gate 在恢复 build 后机械落地）

| 分类 | Adoption ID / owner | 数据路径 / 默认值 | 当前理由 | 删除条件 |
|---|---|---|---|---|
| included | `project/startup-party` / `SetStartupEntriesCommand` | `entryPoints[*].startWorld.party` / actor id | 已是选择后确认，迁移共享 dialog | 本卡实现并由公共 owner 接管 |
| included | `project/startup-inventory` / `SetStartupEntriesCommand` | `entryPoints[*].startWorld.inventory` / `count=1` | 已是选择后确认，PAL 234 项需要搜索虚拟化 | 本卡实现并由公共 owner 接管 |
| included | `project/startup-resource` / `SetStartupEntriesCommand` | `entryPoints[*].startWorld.resources[key]` / `value=0` | 已是选择后确认，保持 live consumer/repair owner | 本卡实现并由公共 owner 接管 |
| included | `shop/stock` / `UpdateShopCommand` | `shops[*].items` / item id | 已是选择后确认，现有 234 项选择器不可搜索 | 本卡实现并由公共 owner 接管 |
| deferred | `item/item-amount-append-default` / `ItemUseEffectEditor.onChange` | `craftRecipes[*].ingredients`、`craftRecipes[*].products`、`drawFromResourcePool.rewards` / 首项 `count=1` | 创建可继续行内改对象与数量的默认行，不等同当前明确选择后确认 | 后续卡裁决“先选后追加”与“建默认行再编辑”的统一边界并三签 |
| deferred | `actor/initial-magic-append-default` / `UpdateActorCommand` | `actors[*].battler.initialMagic` / 首个未用 skill id | 创建后可在正式行替换，当前点击即一命令 | 同上；若改为先选后追加则删除 allowlist 并采用公共 picker |
| deferred | `story/set-party-members-append-default` / `CommandForm.onChange` | `setParty.members` / 首个未用 battler id | 脚本命令草稿内创建默认成员行，提交 owner 仍在上层脚本编辑器 | 同上；需独立核脚本 draft/command 边界后迁移 |
| deferred | `skill/cost-items-append-default` / `UpdateSkillCommand` | `skills[*].cost.items` / 首个未用 item、`amount=1` | 创建后在行内改物品与数量 | 同上；若统一先选后追加则删除 allowlist |
| deferred | `actor/level-up-skill-append-default` / `UpdateLevelUpCommand` | `levelUp[actorId]` / `level=max+1`、首个 skill id并排序 | 同时创建等级与技能两个可编辑默认值，不只是挑候选 | 后续卡先冻结等级默认/排序事务再决定 picker |
| deferred | `asset/sprite-step-sound-cue-append-default` / `UpdateSpriteCommand` | `sprites[*].poses[*].steps[*].cues` / 首个 sound asset | 在当前 step 创建可行内改选的 sound cue，且与动作编辑 proof/command owner 绑定 | 后续卡核 proof、step scope 与 cue 默认后再决定 picker；迁移时删除 allowlist |

机器 census 纪律：不得再以单行“添加”动词 grep 作为全量证明；恢复 build 后的 registry gate 必须结合 JSX
button↔handler 关联、数组追加形态、`first*` / `[0]` live registry 首项信号，并逐项解释排除项。

### 反证与替代解释

- 最强替代解释: inline composer 让控件和目标集合同时可见，对只有 1–3 个候选的资源添加更快；弹窗会遮住上下文，
  还可能把一次简单添加变成过度设计。实现上也可只组合现有 `DsDialog + DsSelectField`，避免新增公共列表接口。
- 设计回应: 当前 inline 流程本来就是“打开选择 -> 选择 -> 点击添加”三步；弹窗仍为三步，但移除常驻宽控件并给
  234 项道具更完整的搜索 / 身份空间。适用判定只覆盖“已有候选库 -> 追加集合”，自由输入和真正高频短操作继续
  使用 inline；资源零候选时不渲染无用触发器。`DsDialog + DsSelectField` 会形成 modal 内再开 anchored listbox 的
  双层选择，仍不能持有 disabled reason、loading/error、明确 footer commit 与单一结果滚动面；因此当前设计冻结
  direct list，reviewer 若有反证应签 counter，而不是在 build 期临时换案。
- 什么观察会推翻当前前提: 可用性验证显示作者连续添加多项时反复开关 dialog 明显慢于 inline，或 single-select
  无法表达实际批量工作流；此时应停线比较“保持弹窗打开 / 添加并继续 / 多选有序 tray”，不得未经设计签字偷加
  即时写入或不确定顺序的 multi-select。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: 不改 runtime；确认仍调用现有 `SetStartupEntriesCommand` owner。
  - 原版 / 第一阶段理解: 无对应作者 UI，不从游戏内队伍 / 道具菜单推断编辑器弹窗布局。
  - extractor / 地图 / 数据解码: N/A；不改 PAL 提取、迁移或内容。
  - audit / test model: 不能只搜索 `DsInlineComposer`；build 前 census 必须按“候选来源 + 追加语义”识别页面，排除
    编辑已有引用、自由文本创建和危险确认。

### 用户可见偏离

- 是否主动偏离已核真值: yes。
- `before -> after` 一句话: 集合卡片底部常驻“宽搜索下拉 + 灰色确认按钮” -> 标题右侧只有紧凑“添加…”按钮，
  点击后在共享弹窗中搜索候选、看清身份、选择并确认，返回后新行出现在集合中。
- 代表场景: PAL 默认入口先点击“添加队员”选择赵灵儿并确认，再点击“添加道具”搜索观音符并确认；两次各只新增
  一行、各可 undo 一次，取消弹窗时 history 不变。
- 用户裁决: **2026-08-27 用户明确认为此类添加应改为“点击按钮 -> 弹窗选择 -> 确定添加”，并要求单独开新卡。**

## 上下文锚点

- 已拍板决策 / 铁律:
  - 本卡是 `ED-PROJECT-STARTUP-IA-1` 的 successor，不把新交互偷塞回旧卡，也不重开已完成旧卡。
  - 候选必须来自 live canonical editor state / registry；弹窗只持 draft selection，不成为第二数据 owner。
  - 全局 EditSession / command 是唯一历史 owner；一次确认最多一条命令，取消为零。
  - overlay / scroll / field / action 必须消费设计系统公共 owner；不得页面私有弹窗与 portal。
- 代码锚点(`file:line`):
  - `packages/editor/src/ui/ProjectWorkbenchTab.tsx:120-142,611-702`（资源候选、三类 local state 与领域 add owner）。
  - `packages/editor/src/ui/ProjectWorkbenchTab.tsx:906-937`（添加队员 inline composer）。
  - `packages/editor/src/ui/ProjectWorkbenchTab.tsx:1079-1117`（添加初始道具 inline composer）。
  - `packages/editor/src/ui/ProjectWorkbenchTab.tsx:1175-1214`（添加世界资源 inline composer）。
  - `packages/editor/src/ui/design-system/overlays.tsx:5-92`（dialog open / close / focus owner）。
  - `packages/editor/src/ui/design-system/floating-layer.tsx:20-32,142-155`（dialog-aware portal host）。
  - `packages/editor/src/ui/design-system/controls.tsx:1092-1096,1178-1199,1240-1252,1557-1667`（搜索 / 虚拟列表 owner）。
  - `packages/editor/src/ui/design-system/virtual-list.tsx:3-19,20-46,82-158`（固定行高、稳定 key、显式选择与虚拟窗口）。
  - `packages/editor/src/ui/design-system/multi-select.tsx:6-108`（不满足本卡明确确认 / 大列表合同的现状）。
- 已知坑 / 审计文档:
  - `docs/phase2/editor/editor-design-system-v1.md:180-188,322-327` 当前冻结 `DsInlineComposer` 的同行 density / 响应合同；
    本卡要把“候选追加”和“自由输入 / 短操作”重新分类，不能简单删除 InlineComposer。
  - `docs/phase2/editor/editor-design-system-v1.md:418-426,609-613` adoption / overlay / modal 焦点合同。
  - `docs/phase2/editor/editor-design-system-v1.md:886-893` 大列表性能合同。
  - `docs/ops/tasks/ED-PROJECT-STARTUP-IA-1-project-entry-startup-workbench.md` 当前入口 ownership、资源四态与命令证据。
  - `docs/ops/tasks/ED-FIELD-COMMIT-1-editor-field-draft-commit-boundary.md` draft / commit / cancel / resync 合同。
  - 旧成功后焦点：party 聚焦新行删除动作，resource 聚焦新值字段；与 `DsDialog` close 后归还 opener 的 rAF 可能
    竞争，必须由本卡统一而非靠 effect 时序碰运气。
  - `DsDialog` 当前 description 未绑定 `aria-describedby`，title id 由标题文本生成可能碰撞；公共层也缺真正覆盖
    showModal / native close event / scroll lock / repeated-open 的专项生命周期测试。本卡扩公共 dialog 时一并补齐。
  - `.ds-overlay__body` 与 `.ds-virtual-list` 当前都可滚；新 recipe 必须提供 contained body，让结果区成为唯一纵向
    scroll owner，禁止 modal body + virtual list 双同向嵌套滚动。
- 不得重新引入:
  - 页面私有 modal / picker CSS、raw button、裸 portal、选择即写、双提交、跨对象残留 draft。
  - 写死 PAL 候选数量、静态角色 / 道具表、资源 key 假枚举、`collectValue` 普通候选。
  - 多选顺序推断、批量添加后无法解释的队伍顺序或默认道具数量。
- 相关测试:
  - `packages/editor/src/ui/ProjectWorkbenchTab.test.tsx:462-695,951-1149`。
  - `packages/editor/src/ui/design-system/controls.test.tsx:765-818,840-902`。
  - `packages/editor/src/ui/design-system/virtual-list.test.tsx:61-144`。
  - `packages/editor/src/ui/design-system/overlays.test.tsx`（当前缺失，本卡须新增真正的 dialog 生命周期测试）。
  - `packages/editor/src/ui/design-system/adoption.test.ts`、`boundary.test.ts`。

## 验收条件

- 功能:
  - 所有 included 候选追加表面只显示标题动作区的公共添加按钮，不常驻宽 select / input + action；0 / 1 / N 项时
    标题、数量和按钮位置稳定。没有候选时按领域显示可理解状态，并隐藏或禁用触发器且说明原因。
  - 共享 dialog 直接显示搜索与候选身份，不嵌套 `DsSelectField`；必须复用 / 扩展 `DsVirtualList` 与现有过滤语义，
    不得复制过滤 / 虚拟 / keyboard owner。候选点击 / Enter 只更新 `selectedId`（0 command），footer 确认才执行 add
    （恰 1 command）；使用 single-select listbox / option / aria-selected，不把即时 add button 语义混入本卡。
  - 明确区分 loading、真正空候选、过滤零结果、error、all-used / all-disabled；每态有下一步或原因，footer 不因
    状态跳位。
  - dialog-local query / selected id 每次打开按当前 scope 初始化；选择不写 history。取消、Escape、关闭、空确认、
    对象切换、revision 变化、readOnly 和 unmount 均 0 command 且不把 draft 带到下一对象。
  - 明确确认恰调用一次领域 adapter；快速双击 / 双 Enter / IME Enter / 重复 pointerup 不双加。确认前按最新
    addable candidates 重校验，stale selection 不得提交。
  - 确认后新项按现有领域规则追加到末尾：队员不恢复已清理 seed 覆盖，道具默认 count=1，世界资源默认 value=0；
    其他字段与其他入口逐键不变。
  - undo 一次删除刚新增项，redo 一次恢复；重新打开 dialog 后该项不再可选。已有重复语义必须按领域 ID / stable key
    过滤，不按显示名误合并。
  - 焦点规则唯一：取消 / × / 第二层 Escape 后最终回到 opener；确认后若 opener 仍可用则回 opener，若最后一个候选
    使 opener 消失 / 禁用，则落到 section 或新行首个非危险字段。不得与旧“聚焦删除按钮 / 资源值字段”effect 竞争，
    不得最终落到 body。
  - 键盘可完成“打开 -> 搜索 -> 上下移动 active -> 选择 -> Tab 到确认 -> Enter -> 返回”；`aria-labelledby` /
    `aria-describedby` / listbox position / result live region 完整。listbox 打开时第一次 Escape 只关 listbox，第二次关 dialog。
  - 234 项 PAL 道具和 500 项合成 fixture 使用虚拟化，复杂候选行挂载量不超过 DS 性能上限；过滤、滚动和 active
    descendant 同步，无白屏、跳项或错误确认隐藏项。
  - dialog body 是唯一滚动 owner，footer 固定可见；native top layer 内的 tooltip / menu 留在 dialog host；720px、
    200% zoom、触屏与软键盘下当前搜索框 / 选项 / footer 不被遮挡，document 不横向滚动。
  - `DsInlineComposer` 保留给非候选追加场景；生产 census / allowlist 可解释每个保留项。新候选追加页面若未登记公共
    owner，设计系统门禁失败。
- 测试:
  - 公共 dialog：open / close / cancel / confirm、分层 Escape、焦点初始与归还、single selected、零结果、disabled
    reason、loading / error / all-used、长名称、IME、重复确认、scope / revision / readOnly / unmount resync；同时补
    `aria-describedby`、唯一 title id、native close event、scroll lock 与 repeated-open 生命周期。
  - 虚拟列表：0 / 1 / 8 / 79 / 80 / 81 / 234 / 500 项，搜索后索引、Home / End / Arrow、滚动窗口、aria-posinset /
    setsize / selected、行点击 / Enter 后 callback 仍为 0、footer confirm 后 callback 恰 1、选中隐藏 / 移除候选、
    reduced-motion 与性能预算。
  - Startup 三集成：队员 / 道具 / 世界资源分别覆盖 confirm 一命令、cancel 零命令、undo / redo、候选过滤、焦点；
    保留 seed、count=1、resource=0 与 `collectValue` / repair / 跨入口既有断言。
  - 当前 resource “新增 -> undo 后保留 composer 选择”行为改为“dialog 不自动重开，重开无残留”；这属于新交互的
    明确 before -> after，不得继续保护隐式旧 draft。
  - census / gate：扫描 production 候选追加表面；included 必须消费共享 owner，合法 inline / create / edit-existing 例外
    必须有 evidence。拒绝 raw dialog、页面私有 picker 类和复杂列表无虚拟化。
  - 每切片先跑聚焦测试；最终只跑一次 `pnpm --filter @type-pal/editor check`、一次 DS gate 和一次 build，不重复耗时全量。
- 文档:
  - 更新 `editor-design-system-v1.md`，冻结候选追加 vs inline composer 分类、trigger / dialog / option / confirm / focus /
    transaction / virtualization 合同；同步下一 DS minor、Design Lab 与 adoption registry。
  - 在 `editor-design.md` 更新入口队伍 / 道具 / 世界资源添加流程，不复制数据 ownership。
- 视觉 / 手工验证:
  - Design Lab 覆盖 default / narrow、0 / 1 / many、selected / active / disabled / empty / long、keyboard / pointer、
    234 项虚拟列表与 reduced-motion。
  - 真实 PAL 在 1280 / 900 / 720px、100% / 150% / 200% zoom 验证队员与道具；条件 fixture 验证资源候选、长名称、
    0 候选、dialog scroll / footer / popup、确认 / 取消 / undo / redo 和 console error 0。
- E2E 用例登记: N/A（功能性编辑器界面在 build 期做最小浏览器验证）。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: **verified（2026-08-27）**。直接读码确认 Startup 三处 `DsInlineComposer` 均为“live 候选选择 + 尾部
    确认”，PAL 道具有 234 项；现有 `DsDialog`、dialog-aware `DsFloatingLayer` 与 `DsSelect` 80+ 虚拟化证明底层能力
    存在，但没有共享 Add Picker Dialog。问题层是候选追加 IA / 公共 owner，不是 schema、runtime 或数据迁移。
  - design: **agree（2026-08-27）**。建立单选、明确确认、direct searchable virtual list 的共享 dialog；复用 / 扩展
    `DsVirtualList` 与既有过滤 / dialog / portal owner，不在 modal 内嵌 `DsSelect`。领域页只给 live options / row
    presentation / 一次性 confirm adapter。保留 `DsInlineComposer` 给自由输入 / 短操作，首批迁移 Startup 三处并用
    census / allowlist 防回流；不改 schema/runtime，不做多选。
  - premise: **reverified（2026-08-27 census 更正）**。本人独立直读 `SkillTab.tsx:1237-1260`、
    `LevelingEditor.tsx:65-115` 与 `ItemUseEffectEditor.tsx:492-503,862-868`，确认原 4+3 census 漏两位
    append-first-default owner，且 ItemAmountList 覆盖三条 data path；生产基线应为 **4+5**。
  - design: **agree（2026-08-27 census 更正）**。新增两处与原三处同样登记 deferred owner / 理由 / 删除条件，
    不扩大本卡四个 included 业务迁移面；公共 API、单命令与性能合同不变。等待 Kimi / GLM 对更正前提增量重签。
  - premise: **reverified（2026-08-27 4+6 二次更正）**。本人直读 `SpriteActionEditor.tsx:61,137-172,
    544-565`，确认 `firstSoundAsset` 从 live catalog 取首个 sound，按钮立即 append cue，最终由
    `UpdateSpriteCommand` 提交；它与其余 append-first-default owner 同型。两席未见第 7 个的复扫证据已写回。
  - design: **agree（2026-08-27 4+6 二次更正）**。接受 4 included + 6 deferred 表；Sprite sound cue
    只登记 owner/理由/删除条件，不扩大本卡实现范围。公共 API 与四个 included 迁移范围不变。
- Kimi:
  - premise: **verified（2026-08-27 独立直读 UI/DS 一手代码，非代理）**。①三处常驻宽 composer 实锤：
    队员（ProjectWorkbenchTab.tsx:906-937）、初始道具（:1079-1117）、世界资源（:1175-1214，零候选
    PageHint 已存在）均为 searchable `DsSelectField` + 尾部 DsButton 的常驻整行形态；既有测试证明
    现行“选择再点添加”为一条命令（ProjectWorkbenchTab.test.tsx:521-533 historyVersion 恰 1）。
    ②底层能力在位：DsDialog 持 native modal/Escape/焦点归还（overlays.tsx:5-43），DsFloatingLayer
    dialog-aware portal，DsSelect 的搜索/虚拟化 owner（controls.tsx:1092-1096 阈值 20/80、
    过滤语义 :1178-1199、虚拟窗口 :1240-1252），DsVirtualList 已有选择/键盘合同。③缺口实锤：
    无共享 Add Picker Dialog；DsMultiSelect 确不满足——即时 toggle onChange、无明确确认、
    filtered.map 全量挂载无虚拟化（multi-select.tsx:49-56,136-156）。④PAL 道具 234 项（本人复数
    items.json）。⑤双同向滚动风险属实：`.ds-overlay__body` 与 `.ds-virtual-list` 均 overflow:auto
    （primitives.css:1548-1552,1675-1679）。⑥DsDialog 两个现存缺陷属实：titleId 由标题文本生成
    （overlays.tsx:56，同题碰撞可能）、description 未绑 aria-describedby（:78）。
  - design: **agree（2026-08-27，附 KA1-KA5，build 必落钉）**：
    - **KA1（dialog 生命周期补齐）**：title id 改 useId 实例唯一（不按标题文本派生）；description 绑
      `aria-describedby`；新增 overlays 生命周期测试覆盖 showModal/native close/scroll lock/
      repeated-open。
    - **KA2（唯一焦点政策）**：冻结 post-confirm 焦点规则——opener 可用则回 opener，否则落到 section
      或新行首个非危险字段；拆除旧竞争 effect（队伍聚焦删除动作/资源聚焦值字段）；分层 Escape：
      首层关内层 popup，次层关 dialog；取消必须回 opener，不得落 body。
    - **KA3（唯一滚动面 + 虚拟 engine）**：dialog body contained，结果区为唯一纵向 scroll owner；
      复用/抽取 DsVirtualList 引擎并以 listbox/option/aria-selected 语义承载（不混 list/listitem+button
      错误角色）；active 行纳入 overscan。
    - **KA4（确认事务防护）**：未选择确认禁用；confirm 置 busy 防双击/双 Enter/IME Enter/重复
      pointerup 双加；确认前按最新 addable 集重校验，stale selection 安全失败；取消/Escape/对象切换/
      revision/readOnly/unmount 全零命令。
    - **KA5（分类边界机检）**：InlineComposer 保留给自由输入/短高频；census 按“已有候选库→追加”
      分类入 adoption registry + evidence allowlist；未登记的新增 picker 即红——防止把编辑已有引用或
      自由文本误迁。
  - premise: **reverified（2026-08-27 census 更正，独立直读三处新增锚点，非复述 Codex）**。
    ①`SkillTab.tsx:1237-1260` 实锤：从 live `items` 取 `firstUnused`（当前 cost.items 未用的第一项），
    点击立即追加 `{itemId, amount: 1}`；`setCostItems` 经 `session.dispatch(new UpdateSkillCommand)`
    （:998-1000）——append-first-default owner 成立。②`LevelingEditor.tsx:106-115` 实锤：取
    `skillIds[0] ?? ''`，追加 `{level: maxLv+1, skillId}`；`dispatchRows` 经
    `new UpdateLevelUpCommand`（:9,43-45）——同型 owner 成立。③`ItemUseEffectEditor.tsx:492-503,
    862-868` 实锤三条 data path：配方材料 `recipe.ingredients`（:492-497）、配方产物
    `recipe.products`（:498-503）、资源奖励档位 `effect.rewards`（:862-868）——同一 ItemAmountList
    组件下的三条独立数据路径，registry 必须逐路径登记而非一条模糊条目。④基线复核：对话式 4 处
    （Startup 三处 + ShopTab 上架）不变；append-first-default owner 为 ItemAmountList（3 path）+
    ActorMode 初始仙术 + CommandForm setParty.members + SkillTab 消耗物品 + LevelingEditor 学技能行
    = **5 个 owner**。随后独立复核 GLM counter：`SpriteActionEditor.tsx:61,544-565` 的“＋ 同步音效”
    取 `firstSoundAsset(props.catalog)` 立即向 step.cues 追加 `{kind:'sound', asset}`，经 updateAction
    落入既有 sprite command owner——确为第 6 个 append-first-default owner；另扫 firstUnused/
    firstSoundAsset/firstItem 形态，firstItem 用例均在已登记的 ItemAmountList 三路径内，未见第 7 个。
  - design: **counter（接受 GLM 基线 counter）**：**基线应为 4+6（对话式 4 + append-first-default 6）**，
    原 4+3 与 Codex 的 4+5 均不闭合。追加一处要求（docs-only 返工，非实现返工）：Codex 把基线与
    registry 更正为 4+6 并登记 SpriteActionEditor 同步音效为第 6 个 deferred owner（与原五处同一
    owner/理由/删除条件纪律）后，本人即恢复 design agree；新增六处全部 deferred，不扩大首批四个
    业务迁移面。公共 Dialog API 不重审；KA1-KA5 继续有效。
  - design: **agree（2026-08-27，4+6 counter 条件已满足，counter 转为 agree）**。逐条复核冻结
    registry（卡面 4+6 冻结分类节）：
    ①4 included（startup-party/inventory/resource + shop/stock）+ 6 deferred 全部登记；
    ②SpriteActionEditor 同步音效条目含 owner=`UpdateSpriteCommand`（本人复核 :9,145 的 commitPoses
    落点属实）、路径 `sprites[*].poses[*].steps[*].cues`、理由与删除条件；
    ③ItemAmountList 三条 data path（ingredients/products/rewards）逐条写清；
    ④included 仍为原定四个迁移面，未借 census 更正扩面。机器 census 纪律（JSX 关联 + first*/[0]
    live registry 首项信号 + 排除项解释）已写入卡内，作为恢复 build 后 registry gate 的口径。
- GLM:
  - premise: **verified（2026-08-27，本人一手读码 + 独立机器 census，非代理）**：
    1. **Startup 三处现状实锤**：`DsInlineComposer` 全库生产消费恰 3 处——队员 :906 / 道具 :1079 /
       世界资源 :1176（grep 全 ui 目录无第四处），均为“live 候选选择 + 尾部确认按钮”常驻宽行；测试
       `ProjectWorkbenchTab.test.tsx:521-533` 证明现流程 select→button→恰 1 命令 + 添加后聚焦行内
       （与 dialog 焦点归还竞争的 effect 即卡文已知坑）。
    2. **底层能力实锤**：`controls.tsx:1092-1096` `SELECT_VIRTUAL_THRESHOLD=80`（搜索阈值 20、
       行高 40、可见 8+overscan 4×2），`:1244-1252` 过滤后虚拟窗口切片——80+ 虚拟化属实；
       `virtual-list.tsx:3-19` DsVirtualList 已有固定行高、getKey、active/tabIndex 控制与显式
       selectedKey/onSelect——复用/扩展方案有真实地基。`overlays.tsx:5-60` useDialogState 持有
       showModal/close/焦点捕获与 rAF 归还；`floating-layer.tsx:20-32` `resolveDsPortalHost`
       dialog-aware（portal 回 dialog 而非 body）。`multi-select.tsx:6-40` 即时 onChange + 过滤
       结果直接使用、无虚拟化——“不满足本卡事务与性能合同”属实。PAL 道具本席独立复数 = **234**。
       全 design-system 无任何 Add Picker Dialog——公共 owner 缺口成立。
    3. **独立机器 census（本席核心增量，非复述卡表）**：按“live 候选库 + 追加语义”判定轴全扫
       searchable select / 添加动作，命中分三类——
       a) **对话式追加（选择+确认按钮，与首批同型）共 4 处**：Startup 三处之外还有
          **`ShopTab.tsx:203-224` 上架物品**（DsSelectField + 上架按钮 → UpdateShopCommand，
          候选域同为 234 项物品，且当前**无 searchable**——迁移 dialog 后自然获得搜索）。卡文首批
          只列三处；ShopTab 必须进 registry（本卡采用或显式 deferred allowlist），不得静默遗漏。
       b) **追加默认项（按钮直接 append 首个候选、行内再编辑）共 3 处**：`ItemUseEffectEditor
          :392-400` ItemAmountList 添加X、`ActorMode.tsx:1636-1644` 添加初始仙术、
          `CommandForm.tsx:1338-1347` setParty.members 添加队员——语义同族但无“选择”步骤、
          点击即写；须逐项登记分类（allowlist 理由或后续卡），不得无记录消失。
       c) **正确排除项**：App 场景切换 :2215+（导航）、CommandForm 字段 select 与“添加一行”
          （编辑引用/创建行）、MapStampPalette/TilePickerGrid/NamedIdPicker（放置/引用拾取）、
          EnemyTeam 五槽（编辑既有引用）、Cutscene 导入（文件选择）、创建向导类。
    4. **命令边界现状**：现三处每添加恰 1 条命令（party/item/resource 测试断言 historyVersion +1），
       取消不写状态——0/1 命令合同是既有语义的自然延续，无 schema/runtime 变化。
  - design: **agree（2026-08-27，附 AP1-AP3 必落钉）**：
    - **AP1（census registry 全量钉，防只做三处）**：adoption registry 由机器 census 生成（信号族
      = searchable/DsSelectField + 追加动词 + 候选库来源判定），判定轴冻结“live 候选库 + 追加语义 +
      选择前不写 canonical”。本席 4+3 命中清单必须全部进入首轮分类：ShopTab 上架（同型同域，
      采用或 deferred 带理由）；三个 append-first-default 表面逐项 allowlist（写明“无选择步骤的
      追加默认”差异与删除条件）或列为后续卡；新增命中未登记即门禁失败。
    - **AP2（命令计数门禁）**：每个 included 表面挂 dispatch/historyVersion 计数断言：打开/搜索/
      选择/取消/Escape/关闭/对象切换/revision 变化/unmount = 0；确认 = 恰 1（双击/双 Enter/IME
      composition/重复 pointerup 去重）；确认前对最新 addable 候选重校验 stale selection；
      undo 一次删新行、redo 恢复；重开后已添加项不可再选、按 stable id 去重（不按显示名）。
    - **AP3（性能/虚拟化测试矩阵）**：0/1/8/79/80/81/234/500 项分层（79-81 钉住 80 阈值边界）；
      断言复杂候选行**挂载数 ≤ 可见+overscan 预算**（不得出现 234/500 全量挂载）；过滤、滚动、
      active descendant 共用同一过滤/虚拟索引真源（无白屏、跳项、确认到未挂载行）；若 ShopTab
      本卡采用，其“234 项不可搜索 select”缺陷随迁移消除须有回归断言。
  - 独立反证 / 可证伪观察: ①可用性若证明连续多项添加时反复开关 dialog 明显慢于 inline 且用户提出
    批量诉求——即卡面停线条件，须另开“添加并继续/有序 tray”设计签字，不得 build 期偷加多选；
    ②若 DsVirtualList 的 list/listitem+button API 无法在不复制状态机的前提下表达 listbox/option +
    aria-selected，必须走“抽取虚拟窗口 engine”路径——出现第二套 direct-list 状态机即 AP 失败返工；
    ③若真实 PAL 授权流中“一次加 5 名队员”类操作证明单选 dialog 不可用，single-select 首版边界
    前提弱化，须停线重审。
- GLM 增量重签（2026-08-27 census 更正复审；上方 GLM 原签为 4+3 前提历史记录）：
  - 对更正本身的核验（全部一手直读）：①SkillTab 属实——`消耗物品` adder（SkillTab.tsx:1240-1260）
    从 live `items` 取 `firstUnused`（排除已用），追加 `{itemId, amount: 1}`（:1256），经
    `setCostItems`（:1000-1006）→ `patch` → `session.dispatch(new UpdateSkillCommand(...))`
    （:997-998）——owner 链完整。②LevelingEditor 属实——`skillIds` 由 live `skills` memo 派生
    （:22-31），`＋ 添加学技能行`（:106-115）追加 `{level: maxLv+1, skillId: skillIds[0] ?? ''}`，
    `dispatchRows`（:43-50）dispatch `UpdateLevelUpCommand` 且 `[...rows].sort((a,b)=>a.level-b.level)`
    升序归一——“追加 max+1 并排序”属实。③ItemAmountList 三 data path 属实——配方材料 :492-497
    （ingredients/ingredientItems）、配方产物 :498-503（products/items）、drawFromResourcePool
    奖励档位 :862-868（rewards，ordered）——一个 owner 三条路径，registry 须逐路径登记属实。
  - **counter（拒绝 4+5 基线，应为 4+6）**：本席复扫发现第 6 个 append-first-default owner——
    `SpriteActionEditor.tsx:546-560` “＋ 同步音效”按钮：`asset = firstSoundAsset(props.catalog)`
    （helper :61-63 取 live asset catalog 中首个 `kind==='sound'` 资源），立即追加
    `{kind:'sound', asset}` 到 step.cues，随后 cue 行内用 DsSelect 在 live `sounds` 选项
    （:496-513）中改选——与 SkillTab 消耗物品/LevelingEditor 完全同型（live registry 首项 +
    立即追加 + 行内编辑），命中判定轴“live 候选库 + 追加语义”。最小返工条件（docs-only，无实现
    改动）：census 更正节基线改为 **4+6**，并把 SpriteActionEditor 同步音效以 owner/理由/删除条件
    登记为第 6 个 deferred 条目；完成该登记后本席对更正前提即时转 premise verified，无须重审其余。
  - **接受 deferred 分类方式本身**（含 SkillTab、LevelingEditor 与本席新增的 SpriteAction 同步音效
    三处）：与本卡原三处（ItemAmountList×3 path / ActorMode 初始仙术 / CommandForm members）同分类，
    只登记 owner/理由/删除条件，不扩大首批四个业务迁移面——“先选后追加 vs 创建默认行”待统一产品
    裁决另卡处理的边界正确。
  - census 方法教训（写入 registry 纪律）：本席原 4+3 census 漏 SkillTab/LevelingEditor 的根因是
    单行 grep 要求“动词与 handler 同行”，多行 JSX 按钮文本/aria-label/onClick 拆行使两处漏网；
    本次复扫改用 `[...x, {` 追加模式 + `first*[A-Z]/[0]` registry 首项信号 + icon="add" 三信号族
    交叉，并逐条分类其余命中（CasualtyEditor :125/:429/:529、EnemyTab :940、PoisonTab :236、
    ScriptEditor :1438 均为默认行创建/类型枚举默认，非 live registry 候选追加；FrameAnimation
    “插入图片”是文件输入；PWT :1461 是入口克隆）。AP1 的机器 census 必须以 JSX 解析
    （button↔handler 关联）+ 追加模式为主信号，不得再用单行动词 grep。
  - 另记录：`design-system/add-picker.tsx` 公共组件已存在于工作区（Codex 停线前的公共层工作）——
    按指令本席不重审已冻结公共 API；其存在不影响 census 结论。
  - design: **agree（2026-08-27，以基线更正为 4+6 为前提）**——deferred 分类、不扩大首批、
    AP1-AP3/KA1-KA5 钉继续有效；build 门禁在基线登记 4+6 前保持 blocked。
- GLM counter 转正（2026-08-27，4+6 counter 条件核验）：
  - premise: **verified（4+6 counter 条件已满足）**。逐项核验“4+6 冻结分类 registry”：
    1. **4 included + 6 deferred 完整登记** ✓——included：startup-party / startup-inventory /
       startup-resource / shop-stock（各带 command owner、数据路径、默认值、理由、删除条件）；
       deferred：item-amount ×3 path、actor-initial-magic、story-set-party-members、
       skill-cost-items、actor-level-up-skill、asset-sprite-step-sound-cue 共 6 owner。
    2. **SpriteActionEditor 同步音效条目属实** ✓——registry 称 owner 为 `UpdateSpriteCommand`，
       本席直读代码链验证：cue append（:546-560）→ `updateAction`（:164-171）→ `commitPoses`
       → `session.dispatch(new UpdateSpriteCommand(definition.id, {poses}, proof))`（:144-149，
       含 proof guard :138-141）——owner、路径 `sprites[*].poses[*].steps[*].cues`、默认首个
       sound asset、理由（与 proof/command owner 绑定）与删除条件全部准确。
    3. **ItemAmountList 三条数据路径分别写清** ✓——registry 行显式枚举
       `craftRecipes[*].ingredients`、`craftRecipes[*].products`、`drawFromResourcePool.rewards`
       三条路径与“首项 count=1”默认，非模糊条目；三路径同 owner 同交互，一行枚举满足“逐路径
       登记”的反模糊要求（若 JSON gate 落地时需拆三行，属机械细节）。
    4. **本卡仍只迁移原定四个 included surface** ✓——四行 included 恰为 Startup 三处 + ShopTab
       上架（本席 census 发现的第四处），六条 deferred 全部不迁移、只登记。
    另确认 registry 末尾已写入机器 census 纪律（JSX button↔handler 关联 + 数组追加形态 +
    `first*`/`[0]` 信号族，禁单行动词 grep）——本席 counter 的方法教训已落地。
  - design: **agree（4+6 counter 条件已满足）**。AP1-AP3 / KA1-KA5 全部继续有效；AP1 的
    census 命中清单按 4+6 冻结表执行。本席条件满足、counter 关闭；门禁仅待 Kimi 同样转正。
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: GLM（2026-08-27，独立机器 census + 逐锚点直读，见 GLM 签节 AP1-AP3 与可证伪观察①-③；
    小候选场景核验：资源 adder 0-2 候选时按设计不渲染触发器/走空态，1-3 候选走 dialog 与现 inline
    同为三步，无步数回归；234 项可在 DsVirtualList 固定行高 + 80 阈值既有 owner 上成立——本席
    复核通过）+ Kimi（2026-08-27，独立直读三处 composer、DsDialog 双缺口、DsMultiSelect 不适用、
    双同向滚动与既有测试证据；并独立复核 GLM 新增的 ShopTab.tsx:203-229 上架物品面属实——
    候选库→追加同型、当前不可搜索，同意其进入 registry 首轮分类）。
  - 独立证据锚点: ProjectWorkbenchTab.tsx:906,1079,1176；ShopTab.tsx:203-229；
    ItemUseEffectEditor.tsx:392-400；ActorMode.tsx:1636-1644；CommandForm.tsx:1338-1347；
    controls.tsx:1092-1096,1244-1252；virtual-list.tsx:3-19；overlays.tsx:5-60；
    floating-layer.tsx:20-32；multi-select.tsx:6-40；primitives.css:1548-1552,1675-1679；
    ProjectWorkbenchTab.test.tsx:521-533；projects/pal/content/items.json（234 项两席复数一致）。
  - 可证伪观察: 见 GLM 签节①-③与 Kimi 签节可证伪观察①-④。
- counter / 分歧处理: N/A（两席无 counter）
- 缺签豁免: N/A
- build 准入结论: **allowed（2026-08-27，4+6 冻结基线）**。历史：原 Codex + Kimi（KA1-KA5）+
  GLM（AP1-AP3）三签在 4+3 census 前提下曾放行；独立复核先后确认基线应为 4+5、最终为 4+6，按前提
  真值门立即停线。GLM 增量复审 counter 拒绝 4+5 基线（应为 4+6，SpriteActionEditor 同步音效
  :546-560 为第 6 个 append-first-default owner）；Kimi 同席复核一手证据属实后附议。Codex 已完成
  docs-only 4+6 冻结分类表与第 6 处 deferred 登记；GLM 已核验四项条件满足并转正，Kimi 亦核验
  四项条件满足并把 counter 转为 premise verified + design agree（SpriteActionEditor
  UpdateSpriteCommand 代码链 :9,144-149 直读复核）。**Codex + Kimi + GLM 三席在 4+6 冻结基线上
  签字齐，build 恢复；KA1-KA5 / AP1-AP3 钉继续有效。**

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

- 公共层分三部分：现有 `DsDialog` 继续持有 modal / focus；搜索候选表面复用 `DsVirtualList` 的虚拟窗口 engine 与
  `DsSelect` 的过滤语义，并为“先选后确认”提供 single-select listbox / option 合同；新 Add Picker Dialog 组合标题、
  说明、draft selection、取消 / 确认和 result live region。
- Add Picker Dialog 不认识 Actor / Item / Resource，也不 dispatch EditSession。它接收 stable option id、可读展示、scope /
  revision、disabled reason 与 `onConfirm(id)`；领域 adapter 在 confirm 边界构造唯一 command。
- dialog draft 包含 `query + selectedId + busy guard`。open scope 变化时重置；confirm 开始后禁用重复提交；成功后关闭，
  失败则保留 dialog、显示邻近错误并聚焦错误 / 当前选择。
- 触发器属于集合 header action，不属于列表尾部 item。空集合仍显示 `0 项 + 添加…`；列表出现后位置不变。无候选时
  不显示失效的大输入框，必要说明靠 header 状态 / help / 明确空态表达。
- single-select 是首版刻意边界：队伍顺序与道具数量均在正式行内拥有唯一 owner；本卡不在 picker 中复制 reorder / count。
- `DsMultiSelect` 不作为实现捷径；若未来用户需要批量添加，另以有序选择 tray、数量策略和一次命令模型刷新设计。

### 已知风险

- 风险: 把所有“添加”机械改成 dialog，会让 1–3 个候选的高频操作变慢。
- 缓解: census 按“已有候选库 + 追加语义”分类；Kimi / GLM 必须各核一个保留 inline 的反例，allowlist 写证据。
- 风险: direct list 复制 `DsSelect` 的过滤语义，或把 `DsVirtualList` 的滚动与 dialog body 叠成双 scroll owner。
- 缓解: 复用 / 抽取共享过滤逻辑，扩展 `DsVirtualList` 而非重写 virtualizer；recipe 让结果区成为唯一纵向滚动面。
- 风险: native dialog top layer、虚拟行和固定 footer 组合后造成焦点遮挡、双滚动或 aria active 指向未挂载行。
- 缓解: modal-aware portal、单 body scroll、虚拟窗口把 active 行纳入 overscan；720px / 200% zoom + keyboard 实测。
- 风险: 当前 Startup 的 party / resource 成功后焦点 effect 与 dialog close 焦点归还竞争。
- 缓解: 本卡冻结唯一 post-confirm focus policy，并移除旧竞争 effect；测试下一 animation frame 的最终焦点。
- 风险: 本卡与已完成的 `ED-PROJECT-STARTUP-IA-1` 同改一个页面，若收口提交未分离会混淆签字证据。
- 缓解: 前置卡已由 `f287c05c` 独立提交并转 done；本卡继续单独提交，不把两卡签字 / 测试记录混写。

### 主审立场

- Reviewer: Kimi（公共接口、弹窗 / overlay / focus / UX）；GLM 负责 census、测试矩阵与性能覆盖。
- 结论: **agree / build allowed**。Kimi / GLM 已分别核验 4+6 docs-only 条件并把 counter 转为
  premise verified + design agree；Codex / Kimi / GLM 三席签字齐，KA1-KA5 / AP1-AP3 继续有效。
- 必改项: KA1 dialog 生命周期补齐、KA2 唯一焦点政策、KA3 唯一滚动面 + listbox 语义、KA4 确认事务
  防护、KA5 分类边界机检；AP1 census registry 全量、AP2 命令计数门禁、AP3 性能/虚拟化测试矩阵。
- 是否建议进入 build: 是（4+6 冻结基线三签齐；Codex 串行恢复公共层与四个 included surface）。

## Build: 实现与自测

- Coding Owner: Codex（2026-08-27 4+6 三签恢复后继续作为唯一实现修改者）
- 修改文件: 公共 Add Picker / shared filter / virtual listbox / Dialog lifecycle 及其聚焦测试当前为未提交 WIP；
  尚未迁移任何业务页面。
- 实现摘要: 已建立公共 API 草案并补 dialog 唯一 ID、description、scroll lock、异步 close/reopen 与 focus restore；
  test-first 又证实隐藏 selection、editable Space/Home/End、远距 End 程序滚动三个公共反例。更正签字前保留 WIP，
  不继续修绿或扩页。
- 运行命令: `pnpm --filter @type-pal/editor typecheck` 通过；公共层曾达 6 files / 60 tests green；新增三条
  可证伪回归后当前预期为 2 files / 3 failed + 24 passed，失败点与卡面 AC 一致，并非业务页回归。
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: pending

## 视觉验证记录

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: pending
- 集中 E2E 用例 / 批次: N/A
- 截图 / 像素检查路径: pending
- 结论: pending
- 未完成项: pending

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: 2026-08-27 用户提出并批准单独开卡设计“按钮 -> 弹窗选择 -> 确认添加”；尚未验收实现。
- 后续任务: 4+6 三签与串行前置均满足；Codex 已恢复公共层修绿与四个 included 业务迁移，完成自测和功能
  视觉验证后交 Kimi + GLM 做 done 前只读审查。

## 交接日志

- 2026-08-27 Codex: 再次以任务卡为真源核验 Kimi / GLM 已分别把 4+6 counter 转为 premise verified +
  design agree，build 准入结论已为 allowed、无新 counter。同步卡头 / 看板后恢复唯一 Coding Owner；先修三个
  test-first 公共反例，再落 4+6 JSON registry 与四个 included 业务迁移。

- 2026-08-27 Kimi: 核验 4+6 counter 四项条件全部满足（4 included + 6 deferred 完整登记、
  SpriteActionEditor 同步音效含 UpdateSpriteCommand（本人 :9,144-149 直读 commitPoses 落点）/
  路径/理由/删除条件、ItemAmountList 三路径逐条、included 仍限定原定四面），把本轮 counter 转为
  **premise verified + design agree**。GLM 已先转正；三席 4+6 冻结基线签字齐，准入恢复 allowed。
  未修改实现，未代签 GLM。

- 2026-08-27 GLM: 核验 4+6 冻结分类 registry 四项条件全部满足，把 counter 转正为 premise verified +
  design agree。关键验证：registry 称 SpriteAction 同步音效 owner 为 UpdateSpriteCommand——本席直读
  代码链（:546-560 → :164-171 → :144-149 含 proof guard）证实；ItemAmountList 三路径显式枚举非
  模糊；included 恰四处（Startup×3 + ShopTab），六 deferred 不迁移；机器 census 纪律（JSX 解析 +
  追加形态 + first*/[0] 信号）已写入。未修改实现，未代签 Kimi；门禁仅待 Kimi 转正。

- 2026-08-27 Codex: 核对任务卡发现“签了”实际为 Kimi / GLM 共同 counter 4+5、要求改为 4+6。本人直读
  `SpriteActionEditor` helper、append handler 与 `UpdateSpriteCommand` 链后确认反证成立；完成 docs-only 4+6
  冻结分类表，逐项登记 4 included、6 deferred、ItemAmountList 三条 data path、owner/理由/删除条件与 JSX census
  纪律。未修改实现文件。Next: 两席只确认 counter 条件已满足并转 agree。

- 2026-08-27 Kimi 增量复审: 直读 SkillTab:1237-1260 / LevelingEditor:106-115 / ItemUseEffectEditor
  :492-503,862-868 三处更正锚点全部属实；另独立复核 GLM counter 证据 SpriteActionEditor:61,544-565
  （同步音效 firstSoundAsset 立即追加 cue），确认其为第 6 个 append-first-default owner，同形态 sweep
  未见第 7 个。签 **counter（附议 4+6 基线）**，要求 Codex docs-only 更正基线并登记第 6 处 deferred 后
  恢复 design agree。未修改实现，未代签 GLM。

- 2026-08-27 GLM: 完成 census 更正增量复审。SkillTab（firstUnused/amount=1/UpdateSkillCommand）、
  LevelingEditor（skillIds[0]/max+1 升序归一/UpdateLevelUpCommand）、ItemAmountList 三 data path
  （材料/产物/奖励档位）全部一手核验属实；但复扫发现第 6 个 append-first-default owner——
  SpriteActionEditor “＋ 同步音效”（:546-560，firstSoundAsset 从 live catalog 取首项立即追加 +
  行内 DsSelect 改选），与 SkillTab/LevelingEditor 完全同型。签 **counter：拒绝 4+5 基线、应为
  4+6；接受 deferred 分类方式**。最小返工 = docs-only 基线更正 + 第 6 处 deferred 登记，完成后本席
  即时转 premise verified。同时记录 census 方法教训（单行动词 grep 漏多行 JSX 按钮，机器 census 须
  以 JSX 解析 + 追加模式为主信号）。未修改实现，未代签 Kimi，未重审已冻结公共 API。

- 2026-08-27 Codex: 在编写 adoption registry 前按 AP1 再做一次独立语义 census，确认 GLM 原 4+3 基线漏掉
  `SkillTab` 消耗物品和 `LevelingEditor` 升级学技能两处 append-first-default owner，且 `ItemAmountList` 实际覆盖
  三条 data path。核心前提变为 4+5，原 build 签字失效；立即停止实现，卡转 blocked/rework。公共层尚未进入业务页；
  WIP 与三个已复现的红测试原样保留。Next: Kimi / GLM 只补审更正 census 与 deferred 分类，不重审公共 API。

- 2026-08-27 Codex: 实际核对三方 build 签字与独立证据，确认无 counter；前置 Startup / Reorder 已分别由
  `f287c05c` / `32d09da0` 收口，串行门满足。本卡转 build，首切片只实现 census registry、Dialog 生命周期、
  共享过滤 / 虚拟 owner 与 `DsAddPickerDialog`，暂不迁移业务页。

- 2026-08-27 Kimi: 独立直读三处 Startup composer、DsDialog/DsFloatingLayer/DsSelect/DsVirtualList 底层
  能力与 DsMultiSelect 不适用证据；确认 PAL 234 项、双同向滚动与 DsDialog 双缺口（titleId 碰撞、
  description 未关联）；复核 GLM 新增的 ShopTab 上架面属实。签 premise verified + design agree
  （附 KA1-KA5），完成本席独立反证。未修改实现，未代签 GLM。三签齐，准入开放。
- 2026-08-27 GLM: 完成独立机器 census 与逐锚点直读，签 premise verified + design agree（附
  AP1 census registry 全量钉 / AP2 命令计数门禁 / AP3 性能虚拟化矩阵）。核心增量：候选追加
  全库命中 4 处对话式（Startup 三处 + ShopTab 上架 :203-224，后者同为 234 项物品域且当前
  不可搜索——必须进 registry）+ 3 处 append-first-default（ItemAmountList/ActorMode 初始仙术/
  CommandForm members）须逐项分类；234 项、80 阈值、DsVirtualList/dialog/portal 地基、
  DsMultiSelect 不满足合同均一手复现。未修改实现，未代签 Kimi。Next: Kimi 独立核公共接口/
  focus/UX 后三签齐放行。
- 2026-08-27 User + Codex: 用户认为队员 / 道具等候选添加应从常驻宽 composer 改为按钮打开选择弹窗并明确确认，
  要求单独开新卡。Codex 直读 Startup 三处 consumer、现有 dialog / portal / virtual select 和 PAL 234 项道具，签
  premise verified + design agree；新卡保持 draft / build blocked。Next: Kimi + GLM 独立设计审查并实际写回签字。

## 下一位 Agent 提示词

```text
联合审查新卡：ED-ADD-PICKER-DIALOG-1 编辑器候选对象添加弹窗统一
任务卡：docs/ops/tasks/ED-ADD-PICKER-DIALOG-1-editor-collection-add-picker-dialog.md
当前状态：draft；Codex 已签 premise verified + design agree，Kimi / GLM pending，build blocked。
你的角色：Kimi 核公共接口、Dialog/overlay/focus/UX；GLM 核生产 census、234/500 项性能、命令与测试矩阵。

先读：AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本任务卡、
docs/phase2/editor/editor-design-system-v1.md，以及 ED-PROJECT-STARTUP-IA-1 当前范围 / 测试证据。
一手锚点：ProjectWorkbenchTab.tsx 三处 DsInlineComposer；design-system/overlays.tsx、floating-layer.tsx、
controls.tsx 的搜索 / 80+ 虚拟化、multi-select.tsx；ProjectWorkbenchTab.test.tsx 添加 / focus / undo 用例。

请独立核对：
1. “已有候选库 -> 追加集合”是否应与自由输入 / 编辑已有引用分开，至少给一个支持 dialog 和一个应保留 inline 的反例；
2. direct search list + DsVirtualList 是否形成唯一公共 owner；若认为 modal 内嵌 DsSelect 更正确，必须签 counter 并
   用交互 / 焦点 / loading-error-disabled / scroll 证据推翻当前 direct-list 设计；
3. single-select + 明确确认、scope/revision resync、取消 0 命令、确认 1 命令、最终焦点合同是否完整；
4. Startup 队员 / 道具 / 世界资源是否保持 seed、count=1、resource=0、collectValue/repair/跨入口真值。

不要修改实现文件，不要代签另一席，不要把多选 / 批量数量或 schema 变化塞进本卡。
输出要求：分别在“进入 build 前:设计签字”写 premise verified + 直接证据及 design agree，或 counter + 理由；
至少一席填写独立反证锚点和可证伪观察。三签齐前不得开始实现。
```

## 下一位 Agent 提示词（2026-08-27 census 更正增量重签）

```text
确认 ED-ADD-PICKER-DIALOG-1 的 4+6 counter 条件已经满足；不要重审已冻结的 Dialog 公共 API。
任务卡：docs/ops/tasks/ED-ADD-PICKER-DIALOG-1-editor-collection-add-picker-dialog.md
当前状态：blocked / rework；Kimi / GLM 已共同确认 4+6，但卡面仍保留 counter。Codex 已完成要求的 docs-only
4+6 分类表，业务页尚未迁移。

先读：AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本任务卡的
“2026-08-27 census 更正（重新打开前提门）”及其中“4+6 冻结分类 registry”。

你们已经分别直读并确认的事实无需重跑；本轮只核文档条件：
1. 基线是否已写成 4 个 included + 6 个 append-first-default deferred owner；
2. SpriteActionEditor 同步音效是否作为第 6 个 deferred 登记了 UpdateSpriteCommand、路径、理由与删除条件；
3. ItemAmountList 三条 data path 是否逐项写清；
4. 六处 deferred 是否都不扩大本卡四个 included 迁移范围；JSX + append/first-signal census 纪律是否已写入。

输出要求：Kimi、GLM 各自在“进入 build 前：设计签字”追加“4+6 counter 条件已满足”的
premise verified + design agree，或指出仍缺的具体字段。不得修改实现文件、不得代签另一席。
两席转签齐前不得恢复 build；签齐后 Codex 才修绿公共回归、机械落 4+6 JSON registry，并迁移原定四个 included surface。
```
