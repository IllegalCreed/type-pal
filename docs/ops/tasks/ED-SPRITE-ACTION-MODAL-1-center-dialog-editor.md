# ED-SPRITE-ACTION-MODAL-1 - 大世界精灵预制动作中心弹窗编辑器

Status: draft
Phase: phase2
Capability: Editor world-sprite action authoring（不改变content schema/capability-map）
Coding Owner: Codex
Reviewer: Kimi + GLM
Risk: 高（信息架构 + modal + route + 提交/undo边界 + 两份reorder治理）
Depends On: `ED-FRAME-TIMELINE-UX-RESTORE-1`、`ED-ACTION-GROUP-ADOPTION-3`
Target Design-System Version: `2.24.0`（用户批准中心长流程modal，扩展DS-C.9边界）

## 用户裁决

2026-09-01 用户明确：新增动作不应在右侧栏完成，应在中间工作区提供入口，并以弹窗形式提供完整编辑器；
随后批准以下具体形态：

- 右侧Inspector只保留用途定义、帧布局、引用和源资源，不保留动作编辑器。
- 中央提供新建/编辑入口；同一个Dialog承担create/edit。
- Dialog内嵌源帧选择区。
- 动作目录改为搜索 + 单选列表，取消逐行grip/前移/后移；当前动作标题栏集中前移、后移、删除。
- create取消零写、确认一次创建；existing edit继续使用全局undo，底栏文案“完成”而非“取消”。

## 目标

把当前塞在右侧Inspector中的完整`SpriteActionEditor`迁到中央入口打开的专用Dialog，同时保留稳定ActionId、
动作深链、source-frame拖入、step/cue编辑、引用阻断、UpdateSpriteCommand与global undo语义。不得复制第二套
动作状态或让modal背景中的帧池继续承担不可达的拖入来源。

## 前提真值门

### 四向矩阵

| 维度 | 结论 | 一手证据 |
|---|---|---|
| 原版 / primary source | N/A：二阶段作者工具信息架构。 | `READ-FIRST.md:8-20` |
| 第一阶段 | N/A：一阶段没有当前预制动作作者器。 | `CLAUDE.md:5-12` |
| 当前二阶段 | 中央已有源帧池和“用途定义与动作”语义shelf；右侧“动作”tab同时承载用途/布局与完整动作目录、属性、步骤、引用/删除。create会立即dispatch。 | `WorldSpriteLibrary.tsx:601-689,692-889`；`SpriteResourceViewer.tsx:420-579`；`SpriteActionEditor.tsx:96-277,283-651` |
| 本任务目标 | 中央Hero/语义动作行打开单一Dialog；Inspector退回用途/布局；Dialog有源帧区、搜索单选目录与当前动作编辑；route/command/schema保持稳定。 | 本卡设计/验收；用户已批准 |

### 替代解释与可证伪

- 最强替代解释：“只把新增按钮移到中央，表单继续留右侧”。不成立：用户要求的是“用弹窗形式做一个编辑器”，
  截图中的名称、播放、步骤、音效和删除共同构成完整主任务，留下即形成双入口/双owner。
- 可推翻观察：若右侧完整表单能在最小220px Inspector和长步骤下证明主任务可达、且用户撤回modal裁决，
  本前提才失效；当前均不成立。

## 用户可见 before -> after

- before：右侧“动作”tab中“新增动作”立即写默认动作，随后在窄Inspector直接编辑名称/循环/步骤/音效/删除；
  动作目录每行都有grip和前移/后移。
- after：右侧tab改名“用途”，只保留用途定义与帧布局；中央Hero显示“新建预制动作”与
  “编辑预制动作（N）”，中央语义动作行也可直接打开相同Dialog。
- create mode：本地名称/初始动作draft，关闭/取消零command；“创建动作”确认恰一条UpdateSpriteCommand，
  成功后切edit mode并写稳定ActionId route。
- edit mode：字段/结构仍按既有一次操作一条全局command；底栏“完成”，关闭不回滚已提交改动；未提交/无效/
  IME composition字段必须先flush/报错，禁止unmount丢值。
- 动作目录：搜索 + 单焦点listbox；逐行grip/移动按钮取消；当前动作header以compact ActionGroup集中
  前移/后移/删除。

## 设计方案

1. `SpriteResourceViewer`中央`DsObjectHero.actions`接入：有定义时显示“新建预制动作”；有动作时并列
   “编辑预制动作（N）”。button accessible name包含当前用途名称；proof loading/error有邻近可读原因。
2. `SemanticFrameShelf`动作行点击、Hero编辑按钮和`action=<ActionId>`深链都走同一parent modal owner；
   close清action query但保留module/page/domain/view/object；create draft不进URL，确认成功后才写ActionId。
3. 右侧tab从“动作”改为“用途”，保留用途定义选择/创建、帧布局、proof状态；移除`.sprite-action-editor`
   及动作新增/排序/删除/字段。引用与源资源tab原样。
4. 新建`SpriteActionEditorDialog`，复用`DsDialog`：
   `width:min(1120px,calc(100dvw - 32px))`、`height:min(780px,calc(100dvh - 32px))`；`<=720px`
   使用`100dvw/100dvh -16px`。固定header/footer；宽态目录280px +详情`minmax(0,1fr)`两个明确scroll owner，
   窄态以“动作列表/动作详情”单页切换，仅一个纵向owner；各owner内边缘≥4px，零横溢。
5. Dialog内嵌有界`SpriteSourceFramePicker`：显示当前asset源帧、点击选择、同一`SPRITE_FRAME_DRAG_MIME`
   内部拖入，并保留“追加/在此插入已选帧”键盘替代；不得从inert背景取drag source。它必须从现有
   `SpriteFrameWorkbench`私有FrameCell/drag payload抽取单一共享domain owner，中央池和modal共同消费；
   禁止复制第二套MIME、选择或a11y语义。该抽取是有界UI API变更并需双consumer合同测试。
6. 动作目录使用搜索 + `DsVirtualListbox`单焦点选择，`virtualizeAbove=50`，52项fixture必须window并冻结
   mounted DOM预算；ActionId完整、
   `translate=no`。当前动作header的ActionGroup含前移/后移/删除：删除danger；首尾disabled；引用/proof
   阻断有可见原因。逐行不再渲染DsReorderItem/handle/move button。
7. create mode只持本地draft；打开时捕获`baselinePoses`与historyVersion，ID从baseline/draft IDs确定性生成。
   确认前重新读当前sprite，要求poses与baseline结构相等且生成ID仍空闲；任何漂移零command、保留modal/input
   并报错，不扩UpdateSpriteCommand API。确认一次dispatch后转edit。
8. edit mode保留现有live command：rename/loop/action move/delete/step/cue/drag各一条UpdateSpriteCommand并可global
   undo/redo。关闭前结束composition并flush当前字段；无效/提交失败保持Dialog并聚焦首错。create pristine
   可直接关闭；dirty create关闭/Esc/X先开共享alertdialog“放弃新动作”，确认后仍零command。全局⌘S：edit先
   flush成功再保存项目；create消费快捷键、聚焦并提示“先创建动作”，不得创建或让后台保存伪装草稿已保存。
9. scopeKey（definition.id + asset revision）变化主动关闭；opener ref关闭后归还，deep-link无真实opener时回中央
   Hero入口。第一层Esc取消字段/select/reorder，第二层Esc才请求关闭Dialog。
10. 删除继续由UpdateSpriteCommand apply时复核live references/proof；Dialog预检查只改善可见原因，不替代command guard。
    不新增schema、不为SpriteActionStep持久化id；现有editor-local step token继续只存在内存。
    “查看引用”在edit mode离开前执行与“完成”相同的composition/field flush，失败留modal并聚焦首错；成功才
    关闭、保留stable ActionId并切引用tab。create mode未确认时不得借此隐式创建或丢draft。
11. DS-C.9升至v2.24.0：modal默认仍用于短决策；仅当用户明确要求中央专用编辑器、背景必须阻断、拥有固定
    header/footer、清晰滚动owner、route/focus/dirty边界与独立审签时，才允许本类长流程editor modal。
    index/tokens/spec/RF fixture同步2.24.0，禁止把例外扩散成普通表单默认形态。
12. `.sprite-action-dialog`与其`.ds-overlay__body`都冻结`overflow:hidden; min-width:0; min-height:0`，覆盖共享
    body默认overflow:auto；宽态目录/详情pane各自`overflow:auto; overscroll-behavior:contain;
    scrollbar-gutter:stable`，不得出现第三纵向owner。窄态只挂当前页的单一owner。
13. 迁入modal同时关闭现存步骤控件债：`.sprite-action-step-buttons`改为compact icon-only ActionGroup，
    move 32×32 + danger delete 32×32 +4px gap；cue delete改正式32px danger icon；插入边界始终可见且
    min-height≥32，不再从6px在hover/focus时改变几何；末端插入有公共focus ring和具体accessible name。
14. 初始焦点：create到名称；edit/deep-link到搜索/已选option。source frame rail为单一Tab stop，支持
    Arrow/Home/End、selected播报与scrollIntoView；drag与“追加/在此插入”命中同一目标adapter。
15. 窄态单页焦点迁移：listbox激活动作后切detail，焦点到`tabIndex=-1`的动作详情标题（或首个明确字段）并
    播报；“返回动作列表”回搜索owner，恢复selected ActionId的active-descendant并scrollIntoView；运行中
    宽↔窄/200%切档优先保留含当前焦点的页，无法保留时按同一规则迁移；删除后聚焦next→previous→空态入口。

## Registry / 规范影响（依赖任务顺序后）

- ActionGroup基线从ADOPTION-3后的`13/44/22/22/11`变为
  **15 groups /42 moves /24 adopted moves /18 raw moves /9 candidates（1 equivalent +8 deferred）**：
  删除definition目录两枚raw move与candidate，新增当前动作header 0-move compact icon-only ActionGroup；
  step move/delete转compact ActionGroup并把`asset/sprite-action-steps/actions`从deferred转adopted。
- Reorder adoption从RESTORE后的`17 families /28 adoptions /31 paths /19 owner files`变为
  **17 /27 /30 /19**：移除`asset/sprite-action-definitions`，保留同family的`asset/sprite-action-steps`。
- Reorder allowlist从RESTORE后的12 entries/8 rules增加唯一`selected-item-reorder-action`例外，目标
  **13 entries /9 rules**；只允许本Dialog当前动作header的稳定ActionId/local-or-live adapter，不扩散。
- 若组件拆到新文件，只更新registry source/fingerprint/verification，不手调其它census；DS-C.2a/C.4d/C.9
  正文与boundary同步，DS版本升为2.24.0。

## 验收条件

- IA：右侧无SpriteActionEditor、无动作新增/排序/删除；用途/布局/引用/源资源完整。中央两入口和语义动作行
  均打开同一Dialog；0动作空态可创建。
- Route：valid action深链自动开并精确选择；invalid action明确报错、不偷选；close只清action；create成功后
  写新ActionId；复杂ActionId编码往返。
- Create：pristine关闭零写；dirty关闭走放弃alertdialog，确认后仍零global command；确认创建一条；
  baseline poses/history/ID collision闭合；外部undo/poses/proof/definition变化fail-closed并保留输入；create⌘S
  不保存/不创建并给出可见提示。
- Edit：每次有效操作一条UpdateSpriteCommand；no-op零条；global undo/redo；关闭不回滚已提交值；focused draft、
  invalid和IME close不丢；⌘S先flush。
- CRUD/order：搜索/listbox单焦点；header前移/后移稳定ActionId、order连续；引用删除disabled+原因/打开引用；
  无引用删除确认；删末项/删全部、selection fallback与undo正确。
- Steps/source：共享单一source picker owner；modal内点击/drag插入；错误asset/index/JSON拒绝；step
  insert/move/delete/min1、loopFrom、duration、cue与内存token稳定；step/cue/delete/insert全部≥32px、4px
  节奏、focus不改几何；背景inert且不可作为drag source。
- Dialog/a11y：1280×800、900×720、720×700、1280@200% CSS viewport、高480；0/1/52 actions、1/52 steps、
  20汉字/40英文/64字符ID。52动作必须virtual window；宽态2个、窄态1个明确纵向owner，外层body hidden；
  focus ring不裁、背景不滚、trap/return/fallback、create/edit初焦点、source rail roving、分层Esc、footer常可达、
  浮层portal落最近Dialog。
- 窄态键盘：list→detail标题/首字段、detail→搜索owner+selected active-descendant、宽窄切档与删除后的
  next/previous/empty fallback焦点均确定；720与1280@200%逐条实测，不允许焦点掉到dialog/body。
- 引用/关闭：edit“查看引用”与“完成”共用flush guard；invalid/IME失败不离开；create不能借引用入口隐式创建/
  丢draft；edit⌘S flush后全局保存。
- 门禁：action15/42/24/18/9、reorder17/27/30/19、allowlist13/9精确；DS index/tokens/spec一致2.24.0
  且长流程modal例外不扩散；其它reorder/action candidates零diff；Inspector旧editor、逐行grip/move、
  背景drag与双入口回流必红。
- 验证：SpriteActionEditor/Dialog、WorldSpriteLibrary、navigation/route、commands、reorder/action/boundary、
  typecheck、design-system gate；受影响包全量一次。真实Firefox/WebKit modal trap与200%无法完成时明确补验责任。

## 推进签字

### 进入 build 前

- Codex:
  - premise: **verified（2026-09-01）**——直读中央Hero/semantic shelf、Inspector、SpriteActionEditor、
    UpdateSpriteCommand与route；确认完整主任务误置侧栏、modal背景drag不可达、现有command可保留。
  - design: **agree（2026-09-01）**——中央单一入口 + 同一Dialog + 内嵌源帧 + 搜索listbox + header动作；
    create baseline-protected local/edit live，schema零变，单一source owner、step控件与registry/DS-C.9例外
    有界，目标DS2.24.0。
- Kimi: premise/design pending
- GLM: premise/design pending
- 用户裁决: **approved（2026-09-01，“按以上弹窗和动作目录方案执行”）**
- build准入: **blocked（RESTORE-1/ADOPTION-3依赖与Kimi/GLM签字未齐）**

### 进入 done 前

- Codex: pending
- Kimi: pending
- GLM: pending
- 用户验收: pending
- done准入: blocked

## 交接日志

- 2026-09-01 Codex: 用户从真实Inspector截图否决侧栏完整动作编辑器，并批准中央Hero + 单一Dialog +
  内嵌源帧 + 搜索单选目录 + 当前动作header操作。三路只读审计补齐create并发保护、dirty guard、单一drag
  owner、步骤控件与scroll/focus合同；未修改实现。Next: Kimi/GLM设计审签。

## 下一位 Agent 提示词

```text
审签 ED-SPRITE-ACTION-MODAL-1（Kimi席，draft；生产实现只读，只允许更新任务卡签字/交接）。

任务卡：docs/ops/tasks/ED-SPRITE-ACTION-MODAL-1-center-dialog-editor.md
用户已批准中央入口、单一Dialog、内嵌源帧、搜索单选目录与当前动作header操作；依赖与三签齐前不得build。

请独立核：WorldSpriteLibrary中央/Inspector所有权；create local零写/确认1与edit live/global undo边界；
UpdateSpriteCommand的proof/live reference guard；action route开关；modal source picker；1120×780双栏和720/200%
单页scroll/focus；create baseline/dirty/⌘S与edit flush/reference边界；单一source picker owner；步骤动作32px；
逐行reorder移除与当前header例外；最终action15/42/24/18/9、reorder17/27/30/19、
allowlist13/9及DS2.24版本判断。

输出Kimi premise verified + design agree，或counter + P0/P1/P2/file:line/反例。若agree，仅更新任务卡签字与
交接并附GLM提示词；不得修改实现、代签GLM或标build/done。
```
