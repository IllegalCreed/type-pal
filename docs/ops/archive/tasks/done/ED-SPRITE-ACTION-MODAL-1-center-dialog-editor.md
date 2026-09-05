# ED-SPRITE-ACTION-MODAL-1 - 大世界精灵预制动作中心弹窗编辑器

Status: done
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
- Kimi: **accept（2026-09-02，只读终审 `f8420026` 全 diff + 真实 Dialog create/edit/窄态实机
  复核 + registry 复算与本人聚焦复跑，非复述 Codex）**。按 KM1-KM5 与六项职责逐项核验：
  - **create baseline 保护与连续编辑 ✓（职责 1）**:`createSnapshot` 冻结
    baselineHistoryVersion/baselinePoses/actionId/asset/proofRevision
    （SpriteActionEditorDialog.tsx:32-61）;`confirmCreate` 先 flush，再重读 session 并逐项校验
    current.asset、historyVersion、poses 与 baseline 相等、生成 ID 仍空闲、record.kind/sha256
    （:263-286)——任一漂移 `reportError` + 聚焦名称框 + **零命令、草稿保留**;create→edit 经
    `createdDefinition` 桥接并在 live 追上后清除（:118-126,:150-156）,`commitEditPoses` 在
    dispatch 前重读当前 session(:222-225)——**连续编辑提交永远对当前状态而非旧快照**。
  - **dispatch 失败阻止 ✓（职责 2）**:`mutationRejectedRef` 由 `handleMutationResult` 置位
    (:245-261),`flushFocusedField` 在其为真时统一拒绝（:185-188)——完成
    (`requestClose`:198)、查看引用（`openReferences`:306)、切动作
    （`onBeforeContextChange`:397)、新建（`confirmCreate`:264）与 ⌘S（:311-324）共用同一
    guard;成功路径清除标记。edit ⌘S 先 flush 后保存、create ⌘S 仅提示“请先创建动作”
    并聚焦（:316-319）。
  - **route/browse ✓（职责 3）**:invalid 深链保留原 id + 明确报错“未自动选择其它动作”且
    不开 Dialog(WorldSpriteLibrary.tsx:290-300);valid 深链复用/新建 route-owned edit
    （:301-322);外部清 action 只关 route-owned 对话框、browse-owned 保留（:324-330);
    create 模式下焦点 action 变化不杀草稿（:283-286);选择 fallback 按 order+id 取首项
    （:331-338)。
  - **窄态/几何/焦点 ✓（职责 4，实机）**:create 初焦点在名称 INPUT;宽态实机 **2 个**
    scroll owner + body `overflow:hidden`、1120×619;窄态 700px 实机**单页单 scroll owner**、
    684px(100dvw-16)、docOverflow 0;pristine 取消与无编辑“完成”均**零命令**（dirty 前后
    均 false）且 close 只清 `action=`;footer 常驻（create=取消+创建动作、edit=完成）。
  - **单一 source owner ✓（职责 5）**:`SpriteSourceFramePicker` 唯一导出于
    SpriteFrameWorkbench.tsx:251，中央池（:462）与 Dialog（Dialog.tsx:372）双消费;
    实机 rail 12 按钮恰 1 个 Tab stop(roving),Arrow/Home/End 键盘 + scrollIntoView +
    live 播报（:277-293,:328-330）;MIME 单常量（:14）与 absent/invalid/payload 三态解析
    （:26-39)——错误 payload 零命令;drag 仅在 transferEnabled+asset 时启用（:322）。
  - **registry/版本 ✓（职责 6，本人复算）**:ActionGroup baseline 恰
    `15 groups / 42 moves / 24 adopted / 18 raw / 9 candidates`(1 equivalent + 8 deferred);
    reorder 恰 `17 families / 27 adoptions / 30 paths / 19 owner files`;allowlist
    **13 entries / 9 rules**（含 selected-item-reorder-action 与 native-draggable-reorder）;
    catalog-row-content **27 entries**;DS **2.24.0** index.ts 实测;edit header 实机
    `前移/后移/删除预制动作：PAL 自动循环` 具体 label。
  - **200% zoom（诚实声明）**：与前卡同一环境限制——真实 UI zoom 不可可靠设置、MCP 窗口
    钳制 ≥700,**真实 200% 与 Firefox/WebKit native modal trap 未实测**,Codex 卡面同样明写，
    未以缩窄视口冒充。
  - **验证（本人执行）**:SpriteActionEditorDialog + SpriteActionEditor + WorldSpriteLibrary +
    SpriteFrameWorkbench + action-group-adoption + reorder-adoption + boundary +
    field-layout-adoption → **8 files / 143 tests 全绿**;editor 串行全量 186 files / 1556、
    typecheck、build、DS gate 92/2 采用 Codex 记录，按纪律未重复全量。
  无返工项；未修改实现，未代签 GLM。
- GLM: **accept（2026-09-02，只读终审 `f8420026` + 三链 registry 独立复算 + create 事务/flush
  代码逐条直读 + 聚焦复跑 + 本人 IAB 实机几何，非复述 Codex/Kimi；与 Kimi 口径收敛、分歧点
  如实登记）**。按 GM-SM1~SM4 逐钉核验：
  - **registry 三链 + 版本 ✓（GM-SM4）**：本人 node 复算——ActionGroup 恰 **15 groups / 42
    moves / adopted 24 / raw 18 / 9 candidates（1 equivalent + 8 deferred + 0 N/A）**，sprite
    侧恰 `asset/sprite-action-current/actions`（**0 moves**，header 组）+ `asset/sprite-action-
    steps/actions`（2 moves，自 deferred 迁 adopted），definitions 候选/收养双清零；reorder 恰
    **17 families / 27 adoptions / 30 paths / 19 owner files**（sprite 仅剩 steps）；allowlist
    恰 **13 entries / 9 rules**，`selected-item-reorder-action` 恰 1 条有界不扩散；
    catalog-row-content 恰 **27 entries**；DS **2.24.0** 四处一致（index/tokens/spec×2 本人
    直读）。**其余 candidates 生产零 diff**（本人对提交文件面逐一核对——Casualty/Cutscene/
    EffectEditor/Poison/ProjectWorkbench/Script×2/LayerStack 全不在 diff）。
  - **create 事务 ✓（GM-SM1，代码逐条直读 SpriteActionEditorDialog.tsx:263-304）**：
    `confirmCreate` 先 flush，再重读 session——current 存在、asset 相等、
    `historyVersion === baselineHistoryVersion`、`poses` JSON 相等、生成 ActionId 仍空闲、
    catalog record kind==='sprite'、proof.asset 相等、**record.sha256 === proofRevision** 八条
    全过才恰一条 `UpdateSpriteCommand`；任一漂移零 command、保留 modal、报错并聚焦名称输入。
    测试矩阵逐项直读复跑绿——pristine 关闭零写 / dirty 走放弃确认仍零写 / 确认恰一条转 edit /
    **外部 history 漂移保留输入零创建** / proof 丢失保草稿可见冲突 / 连续编辑不对旧快照。
  - **edit 事务与 flush guard ✓（GM-SM2）**：`flushFocusedField` 以 `flushSync(blur)` +
    `mutationRejectedRef` 实现，五路消费直读——完成（:199）、确认创建（:264）、查看引用
    （:307）、⌘S（:321，create 只提示「请先创建动作，再保存项目。」并聚焦、不保存不创建）、
    切换上下文（:397 onBeforeContextChange）；提交失败阻止完成/引用/切动作/新建/保存五路测试绿。
  - **route/目录 ✓（职责 3）**：invalid 深链报错不偷选不开窗、外部清 action 只关 route-owned、
    create 草稿不被焦点变化杀死、删除 next→previous→empty、selection fallback order+id、
    52 项虚拟目录无 reorder 行、过滤后 header 移动保稳定 ActionId 恰一条——测试矩阵逐条在
    本人复跑的 7 files / 135 tests 内全绿。
  - **实机几何（本人 IAB 实测，create 模式）✓**：Dialog **1120×768**（min 公式生效）、
    `.ds-overlay__body` **overflow:hidden**、footer 常驻「取消/创建动作」、doc 溢出 0、
    **create 草稿不入 URL**（`action=null`）、源帧 rail 12 帧在场、焦点落入 trap 内。
    宽态双 scroll owner / 窄态单页 / rail roving 采信 Kimi 真实 Chrome 实测 + jsdom 焦点
    测试（均在本人 135 复跑内）。
  - **诚实声明（两点）**：① **create 初焦点存在测量分歧**——Kimi 真实 Chrome 实测名称
    INPUT；本席 IAB 以 DOM 合成开启复现两次均落在 Dialog 关闭钮（trap 内首位 focusable），
    名称输入框含 `autoFocus={mode==='create'}`（SpriteActionEditor.tsx:509）但 open 初焦点
    **无测试钉**（Dialog.test 仅断言提交失败回焦名称 :440）。焦点仍在 trap 内、Tab 一次可达
    名称，无数据/几何/命令影响——**不构成 counter**，建议用户真 Chrome 验收时顺手确认；若
    确认落关闭钮，属 P2 触达微调另卡处理。② **200% zoom 与 Firefox/WebKit native modal
    trap 未实测**（环境同限，不以缩窄视口/pinch 冒充），与 Codex/Kimi 口径一致。
  - **验证（本人执行）**：SpriteActionEditorDialog + SpriteActionEditor + WorldSpriteLibrary +
    SpriteFrameWorkbench + action-group + reorder + boundary → **7 files / 135 tests 全绿**；
    typecheck 干净；design-system gate **92 files / 2 evidence-bound exceptions** 通过；
    Codex 串行全量 186/1556 采信，按纪律未重复。
  无返工项；未修改实现/测试，未代签 Kimi，未填用户验收。
- 用户验收: **accept（2026-09-02，“验收通过”）**
- done准入: **allowed / closed（Codex + Kimi + GLM 三方 accept 与用户验收齐）**

## 交接日志

- 2026-09-02 User + Codex: 用户明确“验收通过”。三方 done 前 accept 已齐，无 counter；本卡由
  review 转 done，同步看板并完成 git 收口。真实 200% 与 Firefox/WebKit modal trap 继续保留为
  已知未实测环境项，不阻断本次用户验收。无下一位 Agent 提示词。
- 2026-09-02 GLM: 只读终审 `f8420026`，签 **accept**。独立证据：三链 registry node 复算
  （ActionGroup 15/42/24/18/9 + sprite current 0-move/steps 2-move、reorder 17/27/30/19、
  allowlist 13/9 有界、catalog 27、DS 2.24.0 四处）+ 其余 candidates 零 diff；create 八条重读
  校验（含 record sha256/proof）与漂移零命令保稿、flush guard 五路消费、⌘S create 只提示
  ——代码逐条直读 + 测试矩阵复跑；route/目录/52 项虚拟化/删除 fallback 测试全绿；本人 IAB
  实机 Dialog 1120×768、body hidden、footer、零溢出、create 不入 URL、焦点在 trap 内。
  **分歧如实登记**：create 初焦点本席 IAB 合成开启两次均落关闭钮 vs Kimi 真实 Chrome 实测
  名称 INPUT，open 初焦点无测试钉——不构成 counter（trap 内、Tab 一次可达），建议用户真
  Chrome 验收顺手确认，若确认落关闭钮属 P2 微调。200% 与 Firefox/WebKit trap 未实测口径
  保持。复跑 7 files / 135 tests + typecheck + gate 92/2 全绿。无返工项；未修改实现/测试，
  未代签 Kimi，未填用户验收。三方 accept 齐，仅剩用户验收；无下一位 Agent 提示词。
- 2026-09-02 Kimi: 只读终审 `f8420026`，签 **accept**。独立证据：createSnapshot 全量冻结 +
  confirmCreate 重读校验（asset/historyVersion/poses/ID 空闲/record sha256）漂移零命令保稿;
  commitEditPoses 提交前重读 session（连续编辑不对旧快照）;mutationRejectedRef 统一阻止
  完成/引用/切动作/新建/⌘S;invalid 深链报错不偷选不开窗、外部清 action 只关 route-owned;
  实机 create 初焦点在名称、pristine 取消与无编辑完成均零命令且 close 只清 action=、宽态
  2 scroll owner+body hidden、窄态 700px 单页单 owner 零溢出;rail 12 钮 1 Tab stop、
  键盘+live 播报、MIME 三态解析错误零命令;edit header“前移/后移/删除预制动作：PAL 自动
  循环”;registry 复算 15/42/24/18/9 + reorder 17/27/30/19 + allowlist 13/9 + catalog 27 +
  DS 2.24.0;200% 与 Firefox/WebKit trap 未实测（同前卡口径）。本人复跑 8 files / 143 tests
  全绿。无返工项；未修改实现，未代签 GLM，未标 done。Next: GLM 终审与用户验收。
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

无下一位 Agent 提示词；三方审查与用户验收均已完成，任务已收口。

## 历史提示词（GLM 终审，已完成）

```text
终审 ED-SPRITE-ACTION-MODAL-1（GLM 席，review；生产实现只读，不得修改实现/测试，不得代签，
不得标 done）。

任务卡：docs/ops/archive/tasks/done/ED-SPRITE-ACTION-MODAL-1-center-dialog-editor.md
实现提交：f8420026 feat(editor): move sprite actions into central dialog
当前状态：review；Codex accept 与 Kimi accept（2026-09-02，含 create/route/几何/registry
实机口径）均已签，仅余你的 GLM accept 与用户验收。

先读：AGENTS.md、READ-FIRST、本卡全部签节（KM1-KM5、Kimi accept 的 file:line 证据）、
DS-C.2a/DS-C.9 v2.24.0、`git show f8420026` 全 diff、action-group-adoption.json、
reorder-adoption.json、reorder-allowlist.json。

你的分工（独立证据，不复述 Codex/Kimi）：
1. registry 复算：ActionGroup 15/42/24/18/9（1 equivalent + 8 deferred）、reorder
   17/27/30/19、allowlist 13/9（selected-item-reorder-action 有界不扩散）、catalog 27、
   DS 2.24.0 四处一致；旧 Inspector editor、definition 逐行 reorder、旧 step 控件与双入口
   回流在门禁负例中必红；其余 reorder/action candidates 零 diff。
2. create/edit 事务测试矩阵复核：baselinePoses/historyVersion 捕获与确认时重读校验
   （poses 相等、生成 ID 空闲、asset/proof sha256、record kind）每条漂移路径零 command 且
   保稿聚焦；pristine 零写、dirty alertdialog 零 command、edit 一次一条 + global undo、
   close/IME/invalid/commit-rejection 的 flush guard 覆盖完成/引用/切动作/新建/⌘S 五路；
   create ⌘S 只提示不创建。
3. route 与目录：valid/invalid 深链、A→B、外部 clear（只关 route-owned）、create 草稿不被
   焦点变化杀死、删除 next→previous→empty、selection fallback order+id；52 项虚拟 listbox
   mounted DOM 预算与 active-descendant。
4. 几何与焦点验收：宽 2 窄 1 scroll owner、body overflow:hidden、footer 常驻、focus ring
   不裁、背景不滚不拖；窄态 list→detail 标题/首字段、detail→搜索 owner + selected
   active-descendant 逐条；source rail roving/End 同步两处/错误 payload 零命令可见报错。
5. 200% zoom 与 Firefox/WebKit native modal trap：Kimi 与 Codex 均明写未实测（CDP
   pageScaleFactor 为 pinch 式、MCP 窗口钳制），你若同样无法可靠设置请保持“未实测”口径，
   不得以缩窄视口或 pinch 冒充。
输出：GLM 席 accept 或 counter + file:line/复现；写回“进入 done 前”GLM 行与交接记录。
```

## 历史提示词（设计审签，已完成）

```text
联合审签 ED-ACTION-GROUP-ADOPTION-3 与 ED-SPRITE-ACTION-MODAL-1（GLM 席，draft；生产实现
只读，只允许更新两卡签字/交接；不得代签，不得标 build/done）。

任务卡：
- docs/ops/archive/tasks/done/ED-ACTION-GROUP-ADOPTION-3-layer-stack-actions.md（Kimi KC3-1~KC3-5 已签）
- docs/ops/archive/tasks/done/ED-SPRITE-ACTION-MODAL-1-center-dialog-editor.md（Kimi KM1-KM5 已签）
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
