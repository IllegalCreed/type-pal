# ED-SPRITE-ACTION-MODAL-1 - 大世界精灵预制动作中心弹窗编辑器

Status: review
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
- Kimi:
  - premise: **verified（2026-09-01，本人直读中央/Inspector 结构、create 现行写、registry 链与
    命令边界，非复述 Codex）**：
    1. **“before”实锤**:WorldSpriteLibrary.tsx:690 的“动作”tab 挂载完整
       `SpriteActionEditor`(:873)——名称/循环/步骤/音效/删除整个主任务确在右侧 Inspector;
       `createAction`(SpriteActionEditor.tsx:187-207)**立即 `commitPoses` 写默认动作**并
       选中——“create 会立即 dispatch”逐字成立;动作目录逐行 grip + 前移/后移
       （`asset/sprite-action-definitions` 为现行 reorder adoption)。
    2. **Registry 链本人复算（自 ADOPTION-3 基线 13/44/22/22/11）**:
       - ActionGroup：删 definitions 目录 2 raw moves(-2 moves)+ steps 组 deferred→adopted
         (+2 adopted,-2 raw,-1 candidate,-1 deferred)+ 当前动作 header 0-move 组(+1 group)
         → **15 groups / 42 moves / 24 adopted / 18 raw / 9 candidates(1 equivalent +
         8 deferred + 0 N/A)**,逐项一致;
       - Reorder：移除 `asset/sprite-action-definitions` 一条 adoption/data path →
         **17 families / 27 adoptions / 30 paths / 19 owner files**,一致;
       - Allowlist:+1 `selected-item-reorder-action`(限本 Dialog 当前 header 稳定
         ActionId 适配)→ **13 entries / 9 rules**,一致;DS 2.23→**2.24.0**。
    3. **事务边界实锤**:edit 侧既有 `UpdateSpriteCommand` 一次一条 + global undo 可保留
       （不扩 API);create 侧“打开捕获 baselinePoses/historyVersion、确认前重读当前 sprite、
       poses 结构相等且生成 ID 仍空闲,漂移零 command 保留输入”——是在不扩
       UpdateSpriteCommand 的前提下最严的并发保护;create 立即写 → 本地 draft + 确认一次写
       是用户已批准的 before -> after。
    4. **单一 source owner 判定**:SpriteFrameWorkbench 的私有 FrameCell/drag payload 抽为
       共享 `SpriteSourceFramePicker` 领域 owner 属有界 UI API 变更;中央池与 modal 双消费 +
       同一 MIME/选择/a11y 语义 + 键盘“追加/在此插入”替代——避免第二套拖拽语义;
       modal 背景 inert、不可作 drag source 成立。
    5. **DS-C.9 长流程 modal 例外判定**:用户明确要求的中央专用编辑器、固定 header/footer、
      明确 scroll owner、route/focus/dirty 边界与独立审签——属 DS-G.4 minor 的**有界例外**,
      卡面已明写“禁止扩散成普通表单默认形态”,判断成立。
    6. **可推翻观察**:若右侧完整表单能在 220px Inspector 证明主任务可达且用户撤回 modal
       裁决;若 create 并发无需 baseline 保护（现行立即写已证反）;若步骤/目录动作仍需逐行
       grip/move(reorder 治理已证替代表达）——任一本签字失效。
  - design: **agree（2026-09-01，附 KM1-KM5 必落钉）**：
    - **KM1(IA/唯一 owner 钉）**:中央 Hero 两入口、语义动作行与 `action=<ActionId>` 深链
      均驱动同一 parent modal owner;右侧 tab 改名“用途”,**不得残留任何动作编辑器/新增/
      排序/删除**;create 成功才写 ActionId route,close 只清 action;背景 inert 且不可作
      drag source。
    - **KM2(create/edit 事务钉）**:create = 本地 draft + baselinePoses/historyVersion 捕获 +
      确认时重读校验(poses 相等、生成 ID 空闲）+ 恰一条 UpdateSpriteCommand;pristine 零写、
      dirty 关闭走放弃 alertdialog 仍零 command;edit 一次操作一条 + global undo/redo,
      关闭不回滚已提交值;close 前结束 composition 并 flush,invalid/失败留 Dialog 聚焦首错;
      ⌘S edit 先 flush 后保存、create 消费快捷键并提示“先创建动作”。
    - **KM3（单一 source owner 钉）**:从 SpriteFrameWorkbench 私有 FrameCell/drag payload
      抽取唯一共享 `SpriteSourceFramePicker` 领域 owner,双 consumer 合同测试绑定同一
      MIME/选择/a11y;modal 内点击与拖入共用同一插入 adapter;键盘“追加/在此插入”恒可用。
    - **KM4(Dialog 几何与焦点钉）**:固定 header/footer;宽态目录 280px + 详情
      `minmax(0,1fr)` 两个明确 scroll owner,窄态单页单一 owner;`.sprite-action-dialog` 与
      body 冻结 `overflow:hidden`,禁止第三纵向 owner;52 项虚拟 listbox 冻结 mounted DOM
      预算;分层 Esc;窄态 list→detail 标题/首字段、detail→搜索 owner + selected
      active-descendant 的焦点迁移逐条实测;删除后 next→previous→empty fallback。
    - **KM5（registry/版本钉）**:冻结 **ActionGroup 15/42/24/18/9、reorder 17/27/30/19、
      allowlist 13/9**;`selected-item-reorder-action` 例外限本 Dialog 当前 header 稳定
      ActionId/local-or-live adapter,不扩散;DS 升 **2.24.0**(DS-C.9 长流程 modal 有界例外,
      用户批准）;其它 reorder/action candidates 零 diff;Inspector 旧编辑器、逐行 grip/move、
      背景 drag 与双入口回流必须进门禁负例。
- GLM:
  - premise: **verified（2026-09-01，before 实锤与三条 registry 链算术全部本人一手复算，非复述
    Codex/Kimi；与 Kimi 逐项收敛）**：
    1. **before 实锤直读**：WorldSpriteLibrary.tsx:690「动作」tab 于 :873 挂载完整
       `SpriteActionEditor`——名称/循环/步骤/音效/删除整条主任务确在右侧 Inspector；
       `createAction`（SpriteActionEditor.tsx:189-207）**立即 `commitPoses` 写默认动作**——
       「create 即 dispatch」逐字成立；动作目录逐行 grip + 前移/后移
       （`asset/sprite-action-definitions` 为现行 reorder adoption，与 steps 同族并存——
       本人 registry 直读确认两条均在）。
    2. **三条 registry 链算术本人复算（自 ADOPTION-3 冻结目标 13/44/22/22/11 起算）**：
       - ActionGroup：删 definitions 目录（−2 moves、−1 candidate）+ steps 组 deferred→adopted
         （+2 adopted/−2 raw/−1 candidate）+ 当前动作 header 0-move 组（+1 group）→
         **15 groups / 42 moves / 24 adopted / 18 raw / 9 candidates（1 equivalent +
         8 deferred + 0 N/A）**，逐项自洽；
       - Reorder：移除 `asset/sprite-action-definitions` 一条 adoption/一个 dataPath →
         **17 / 27 / 30 / 19**（自本人复算的现状 17/28/31/19 起算）；
       - Allowlist：现状恰 **12 entries**（本人直读）+ 唯一 `selected-item-reorder-action`
         例外 → **13 entries / 9 rules**。链式依赖诚实：三条目标值以 ADOPTION-3 按冻结基线
         完成为前提，上游漂移必须重算重签（卡面已声明依赖顺序）。
    3. **事务边界判定**：create 侧「打开捕获 baselinePoses/historyVersion、确认前重读当前
       sprite、poses 结构相等且生成 ID 空闲，漂移零 command 保留输入」——在不扩
       UpdateSpriteCommand API 前提下的最严并发保护，与现行「立即写」形成用户已批准的
       before→after；edit 侧既有一次一条 + global undo 可原样保留（命令 owner 不在 UI 层）。
    4. **单一 source owner 判定**：从 SpriteFrameWorkbench 私有 FrameCell/drag payload 抽
       共享 `SpriteSourceFramePicker` 属有界 UI API 变更；中央池与 modal 双消费同一
       MIME/选择/a11y + 键盘替代——避免第二套拖拽语义；modal 背景 inert 不可作 drag source
       结构成立。
    5. **DS-C.9 例外判定**：用户明确要求的中央专用编辑器 + 固定 header/footer + 明确 scroll
       owner + route/focus/dirty 边界 + 独立审签——属 DS-G.4 minor 的**有界例外**，卡面明写
       「禁止扩散成普通表单默认形态」，升 2.24.0 成立。
    6. **可推翻观察**：右侧 220px Inspector 能证明完整主任务可达且用户撤回 modal 裁决；
       create 并发无需 baseline 保护；52 项虚拟化后 mounted DOM 预算不可测——任一本签字失效。
  - design: **agree（2026-09-01，附 GM-SM1~GM-SM4 必落钉；与 Kimi KM1-KM5 收敛互补）**：
    - **GM-SM1（create 事务钉，同 KM2）**：baselinePoses/historyVersion 捕获 + 确认时重读
      校验（poses 结构相等、生成 ID 空闲）+ 恰一条 UpdateSpriteCommand；漂移 fail-closed
      （零 command、保留 modal/输入、报错聚焦）必须有测试；pristine 关闭零写、dirty 关闭走
      放弃 alertdialog 确认后仍零 global command；⌘S create 消费快捷键不保存不创建。
    - **GM-SM2（edit 命令与关闭钉，同 KM2）**：一次有效操作一条 UpdateSpriteCommand、no-op 零条、
      global undo/redo；关闭前结束 composition 并 flush、invalid/失败留 Dialog 聚焦首错；
      「查看引用」与「完成」共用 flush guard；⌘S edit 先 flush 再全局保存——逐项测试钉。
    - **GM-SM3（单一 owner 与目录钉，同 KM3/目录）**：`SpriteSourceFramePicker` 双 consumer
      合同测试（同一 MIME/选择/a11y、键盘「追加/在此插入」恒可用、背景不可作 drag source）；
      搜索单选 listbox 52 项 fixture 冻结 virtual window 与 mounted DOM 预算；逐行
      DsReorderItem/handle/move 全删 + Inspector 旧编辑器/双入口回流必红。
    - **GM-SM4（Dialog 几何/焦点/版本钉，同 KM4/5）**：`.sprite-action-dialog` 与 body 冻结
      `overflow:hidden`，宽态恰 2 个、窄态恰 1 个纵向 scroll owner；52 项虚拟窗口；分层 Esc、
      窄态 list↔detail 焦点迁移与删除 next→previous→empty fallback 逐条实测；三条 registry
      目标冻结 **15/42/24/18/9、17/27/30/19、13/9**（上游 ADOPTION-3 漂移即重算）；
      `selected-item-reorder-action` 例外限本 Dialog header 稳定 ActionId 不扩散；DS 四处
      一致 **2.24.0** 且 DS-C.9 例外写明边界；200% zoom 无法可靠触发时保持未实测口径。
- 用户裁决: approved（2026-09-01，“按以上弹窗和动作目录方案执行”）
- build准入: **allowed（2026-09-02 Codex + Kimi + GLM 三方 design 签字齐、无 counter；用户明确
  “做吧”；ED-FRAME-TIMELINE-UX-RESTORE-1 与 ED-ACTION-GROUP-ADOPTION-3 均done，Codex为唯一
  Coding Owner）**

### 进入 done 前

- Codex: **accept（2026-09-02）**——实现提交 `f8420026`。中央 Hero / 语义动作行 / action 深链共用
  单一 `SpriteActionEditorDialog`；Inspector 退回“用途”；create 为 baseline/history/proof 保护的本地草稿，
  确认恰一条 `UpdateSpriteCommand`，edit 继续一操作一命令；完成/引用/新建/切动作/⌘S 共用 flush 与
  commit-rejection guard；route A→B、外部清 action、create 清旧 action、proof 漂移保稿、删除
  next→previous→empty 焦点与动态宽窄切档均有回归测试。共享 `SpriteSourceFramePicker` 统一两处选择、
  roving keyboard 与 MIME，背景帧池冻结不可拖。
  - 自动验证：editor typecheck；串行全量 `186 files / 1556 tests`；聚焦 review 回归 `4 files /
    118 tests`；design-system gate `92 files / 2 evidence-bound exceptions`；Vite production build。
  - 浏览器验证：1280×800、900×720、720×700、720×480；页面横溢 0；Dialog/body hidden；footer
    始终在视口；详情纵向滚动；窄态单页；动作/步骤/插入命中区 32px；focus ring 2px + offset 2px
    且不裁切；modal 源帧 `draggable=true`、背景 `false`，End 选择同步两处。
  - 已知补验：内置浏览器无法可靠改变真实页面 zoom，1280@200% 与 Firefox/WebKit native modal trap
    保持待 Kimi/用户补验；未以缩视口冒充。全仓 Biome 仍有 319 个本卡外既存诊断；本卡新建/核心文件
    的定向 Biome、typecheck、测试与 build 均通过。
- Kimi: pending
- GLM: pending
- 用户验收: pending
- done准入: blocked

## 交接日志

- 2026-09-02 Codex: 完成中央单一 Dialog、用途 Inspector 收口、共享源帧 picker、搜索虚拟目录、
  create/edit 事务与 route/focus/dirty 边界、步骤控件和 DS 2.24 / registry 联动；提交 `f8420026`。
  串行全量 1556 项、typecheck、build、design-system gate 与四档真实浏览器矩阵通过；Codex 签 accept，
  卡转 review。Next: Kimi 独立代码/视觉审查；不得标 done。
- 2026-09-02 User + Codex: 用户明确“做吧”；两张依赖卡均done，三方design签字和用户形态裁决齐。
  本卡转build，Codex按中央入口/单一Dialog/源帧选择/搜索目录三批连续实现，不再重复开工签字。
- 2026-09-01 GLM: 联合审签（同 ADOPTION-3）。独立直读 before 实锤（:690 动作 tab 挂完整
  editor :873、createAction :189 立即 commitPoses、definitions/steps 两条 reorder adoption
  并存）并自 ADOPTION-3 冻结目标复算三链算术——ActionGroup 15/42/24/18/9（1 eq + 8 def）、
  reorder 17/27/30/19（自本人复算现状 17/28/31/19）、allowlist 13/9（现状 12 直读）；判定
  create baseline 并发保护、单一 SpriteSourceFramePicker owner 与 DS-C.9 有界例外（2.24.0）
  成立。签 premise verified + design agree，附 GM-SM1（create 事务 fail-closed 测试钉）/
  GM-SM2（edit 一条命令/flush/IME/⌘S/引用共用 guard）/GM-SM3（单一 picker 双 consumer 合同 +
  52 项虚拟窗口 + 旧编辑器回流必红）/GM-SM4（scroll owner 计数/焦点迁移/三链冻结随上游重算/
  例外不扩散/200% 未实测口径）。未修改实现，未代签 Kimi。三席 design 齐 + 用户 modal 裁决
  在案；build 待 RESTORE-1 与 ADOPTION-3 完成后按新基线起算。Next: 依赖卡推进。
- 2026-09-01 Kimi: 独立直读“before”实锤（WorldSpriteLibrary.tsx:690 动作 tab + :873 挂
  SpriteActionEditor、createAction:187-207 立即 commitPoses 写）、复算三条 registry 链
  (ActionGroup 15/42/24/18/9、reorder 17/27/30/19、allowlist 13/9，自 ADOPTION-3 基线逐项
  一致)、create baseline 并发保护与单一 source picker owner 判定、DS-C.9 长流程 modal 有界
  例外与 DS2.24 版本判断。签 premise verified + design agree(KM1 IA 唯一 owner / KM2
  create-edit 事务 / KM3 单一 source owner / KM4 Dialog 几何焦点 / KM5 registry 与版本),
  完成独立反证。未修改实现,未代签 GLM。Next: GLM 签字;依赖 RESTORE-1 与 ADOPTION-3 先完成。
- 2026-09-01 Codex: 用户从真实Inspector截图否决侧栏完整动作编辑器，并批准中央Hero + 单一Dialog +
  内嵌源帧 + 搜索单选目录 + 当前动作header操作。三路只读审计补齐create并发保护、dirty guard、单一drag
  owner、步骤控件与scroll/focus合同；未修改实现。Next: Kimi/GLM设计审签。

## 下一位 Agent 提示词

```text
审查 ED-SPRITE-ACTION-MODAL-1（Kimi 席，状态 review；只读实现，允许更新任务卡 Kimi 签字与交接，
不得代签 GLM，不得标 done）。

任务卡：docs/ops/tasks/ED-SPRITE-ACTION-MODAL-1-center-dialog-editor.md
实现提交：f8420026 feat(editor): move sprite actions into central dialog

先读：AGENTS.md、docs/phase2/READ-FIRST.md、任务卡全部裁决/验收/签字；重点代码：
- packages/editor/src/ui/WorldSpriteLibrary.tsx
- packages/editor/src/ui/SpriteActionEditorDialog.tsx
- packages/editor/src/ui/SpriteActionEditor.tsx
- packages/editor/src/ui/SpriteFrameWorkbench.tsx
- packages/editor/src/ui/SpriteResourceViewer.tsx
- packages/editor/src/ui/editor.css
- 对应四个 test 文件与 design-system registry/boundary/spec 2.24。

Codex已完成：中央 Hero/语义行/深链共用单一 Dialog；Inspector 只留用途；create baseline/history/proof
本地事务与 dirty alert；edit live undo；完成/引用/切动作/新建/⌘S commit guard；route A→B/clear；删除
next→previous→empty；宽窄动态焦点；共享 source picker；目录虚拟化；步骤 32px ActionGroup；DS 2.24。
证据：f8420026；editor 串行 186 files / 1556 tests 全绿；typecheck、Vite build、design-system gate
92 files / 2 evidence-bound exceptions 全绿。浏览器 1280×800、900×720、720×700、720×480 通过；
真实 200% 与 Firefox/WebKit trap 未实测，禁止拿缩视口替代。

Kimi职责：
1. 独立审查 create→edit 连续编辑无旧快照覆盖；poses/history/ID/proof 漂移零 command 且保稿；
   dispatch false/throw 后完成、查看引用、切动作、新建、⌘S 均不得离开。
2. 审 route-owned/browse 状态：valid A→B、external clear、create 清旧 action、delete-last 留空态；
   invalid deep link 不 fallback。
3. 审窄态 list/detail 单挂载、动态宽窄 focused draft、返回 active-descendant、删除焦点 fallback、
   fixed footer/scroll owner/focus ring；能做真实 200% 时补验并记录，不能则保持 pending。
4. 审单一 SpriteSourceFramePicker 双 consumer/MIME/键盘/drag；背景不可拖；错误 payload 零命令可见报错。
5. 复算门禁：ActionGroup 15/42/24/18/9、reorder 17/27/30/19、allowlist 13/9、catalog 27、
   DS 2.24；确认旧 Inspector editor、definition reorder、旧 step 控件回流必红。

输出：直接证据 file:line + 可证伪结论；通过则在任务卡 Kimi 席签 accept，并写下一位 GLM 提示词；
否则签 counter/列返工。不得修改生产实现；不得标 done。
```

## 历史提示词（设计审签，已完成）

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
