# EDITOR-SCRIPT-PREVIEW-1 — 指令重点摘要、选中步骤播放与地图轨迹

Status: done
Owner: Codex Root
Reviewer: editor_preview_audit（独立只读） / Codex Root（集成）
Phase: phase2
Capability: P3 / W7
Visual Verification Timing: dev-functional
Branch: codex/editor-script-preview

单文件Owner分派：Root负责选中cursor链与指令摘要；movement_preview在codex/editor-movement隔离树独占
`core/script-movement-preview.ts`及相邻测试、`ui/PreviewCanvas.tsx`及相邻测试，Root独立接收；
editor_preview_audit只读独立复核。贡献者不改共享卡/6012，不合main。

## 2026-10-02清账收口（当前结论）

`839cad2a7`路线/停止语义counter闭合；`739a02982`工具栏与简洁图例实际验证。后者为`e111a273e`祖先，后续完整editor3757项通过已闭旧15秒测试超时；原失败日志不改。
本轮按用户“先清当前边角再继续005”授权核既定范围与证据，Codex技术accept并归档。
除004上述明确认可外，不补写用户逐项体验签名；下文旧pending/返工/提示保留为过程记录，非当前阻塞。
本次不重跑未变剧情来重复取证。原声录像由E2E-CAPTURE-1承接；全量Q1/Q2、后期命名和发布素材库未因此完成。
无下一位Agent提示词，本卡已收口；[清账母卡](../../../tasks/PRE-005-DEBT-1-current-edge-closeout.md)继续当前未完事项。

## 目标与范围

用户2026-10-01要求三项：右侧参数突出可理解的信息、播放从当前选中步骤开始、地图用节点及线标识移动。
仅编辑器UI/纯派生预览与其测试；不改canonical脚本、save/schema、迁移/供应、运行时移动算法。
开场视频交接另由OPENING-HANDOFF-1隔离贡献者执行，不混入本卡实现。

## 前提真值门

| 维度 | 一手证据 / 目标 |
| --- | --- |
| 原版/primary | 用户附件中interact2/go-to-kitchen/beggar-first-talk及冗长portrait资产名不可理解；用户实点第二步骤仍播第一步骤。 |
| 第一阶段 | N/A：第一阶段没有作者方案/步骤编辑器；只沿用content gridToPixel坐标投影，参照READ-FIRST铁律9的相机/脚底坐标教训，不复制旧脚本解释器。 |
| 当前二阶段 | ScriptEditor.tsx:821 describeCommand直接显示behavior/page/trigger原始ID；FlowEditor:3856本地selectedId未上报；SceneScriptWorkspace:241播放只传flow；playback.ts:447 runFlow未传cursor。PreviewCanvas:352绘地图、无作者路线层。 |
| 本任务 | 中文方案名/触发方式/目标坐标及速度等重点；同一选中FlowCursor用于编辑正文/播放/路线；路线是当前步骤编排参考，不冒充避障结果或执行未选分支。 |

- 替代解释：Playback故意从头运行整个方案。用户明确要求从选中步骤开始，默认首次行为不是预览选择。
- 可证伪：选第二步仍有第一步奖励/对话；切NPC/方案后沿用旧cursor；摘要只换英文ID样式；条件两臂被连成一条确定路线；地图线点与同一投影坐标不重合。
- before→after及产品授权：不可读技术参数/永远从初始步播/无路线→重点中文摘要/当前步骤播/节点连线。用户已明确要求。

## 上下文锚点与设计边界

- READ-FIRST铁律4/5/8/9、phase1-knowledge-harvest W3/E5/E6/N4；地图投影复用，不自己重算脚底或复制执行语义。
- CanonicalSceneScriptWorkspace/ScriptBehaviorInspector/ScriptSceneHookInspector/CanonicalScriptFlowEditor选择链；现有Playback隔离scratch world与RuntimeScriptRunner真实cursor入口。
- Summary从当前作者数据按稳定ID解析语义名；全文及编辑表单保留，列表不堆资产标识/内部状态名。
- 地图展示当前选中步骤的编排路径；显式坐标移动连线、瞬移区分、条件/循环/追逐不伪造确定走法。
  当前可解析共享self与坐标展示；未知/跨场景段断线并说明，不能画虚假的跨场景长线。
- 不新增parallel/join、隐藏作者状态、脚本列表模式、存档版本或runtime公共API。

## 验收

- 先红后绿：不同stage/state当前cursor传入真实runner；单步/播放/重置同一选中位置；方案/NPC切换隔离；作者数据不变。
- 摘要真源解析及缺失引用提示；dialog只显示位置/说话人等重点，原完整表单仍可达。
- 路线纯派生反控：多NPC、共享self、分支/循环、瞬移断线、相对移动、选步改变、地图相机/缩放投影。
- 功能性最小浏览器验证：6012 e56/e62中文摘要，选第二步播放可观察；e56单步六目标节点/线实际可见。
  候选验证服务不关用户6012；更新主工程前重新确认无未保存草稿。未获用户体验验收不标done。
- editor完整测试、全仓typecheck/lint/格式零error/warning/info、docs/tools必要门；不降低规则或增加忽略。

## 当前模式推进记录

- Root直接读取以上链路：premise verified / build allowed，隔离codex/editor-script-preview单一实现Owner。
- editor_preview_audit独立只读核前提和最终候选；Root保留相关测试/实际画面证据再集成。
- 自测与独立代码审查accept，用户体验pending。6012原服务保留，不修改用户.zcodeignore。

## 实现与独立验收收据（2026-10-02）

- 选中stage/state的结构化cursor贯穿正文、真实RuntimeScriptRunner预览与路线，按场景/实体/入口/方案隔离；
  删除当前步骤同步回落，不改作者初始步骤。原红控第二步骤错误执行第一步骤，修后真实奖励及单步反例通过。
- 指令摘要解析作者方案/页面/共享脚本名称，显示中文触发方式、移动坐标与速度；对话不堆portrait资产ID，
  未解析引用明确提示。完整参数编辑表单保留，不修改canonical内容或runtime/save/schema。
- 路线展示当前步骤的作者节点、分色连线、条件虚线及瞬移标记；共享self、相对移动与相机缩放复用现有坐标语义。
  追加“显示完整轨迹”，解决e56六目标在浅地图视口中被裁切的问题；它是编排参考而不是实际避障结果。
- 独立只读审查在d68943fc5给出counter：stopScript后仍画移动、共享脚本局部结束语义及相对落点高度。
  Root修正为839cad2a7；审查者重新读取运行时primary代码和反例后accept，未用作者自验代替独立验收。
- 浏览器实际操作候选6013：e56交互第二步播放只出现“别怠慢了客人”，不是接客第一步；自动方案
  “接客后：下楼到大厅”的六目标路径实画可见，完整轨迹按钮能一键纳入视口；中文切换目标已显示
  “客人进房后：请逍遥打发门口道士”；e62“门口初见”正文只突出对话内容与“居中”。
  未写作者数据，候选及6012的保存/撤销/重做均禁用、显示已保存。
- 冻结功能包7 files / 63 tests绿；独立counter修复2 files / 15 tests绿；最终完整editor check
  486 files / 3721 tests绿（458.93s），收据`build/e2e/editor-preview-final-check.log`。
- 第一轮完整editor check 1 failed / 3717 passed：静态样式adoption门捕获新legend三处内联常量。
  保留原始红收据`build/e2e/editor-preview-full-check.log`；Root移入CSS recipe，未降级规则/增加忽略，最终完整检查全绿。
- 全仓7包typecheck零诊断；lint 2732 files、0 errors / 0 warnings / 0 infos；E2E工具94 tests绿。
  收据`build/e2e/editor-preview-final-{types,lint,e2e-tools}.log`。原浏览器导航模拟的测试stderr原样保留，不伪称无任何运行时提示。
- 文档登记门已修正新卡board/index缺项；37工具tests与813 Markdown / 4276链接 / 253任务检查全绿。
  最终卡状态登记后复跑PASS、0 issues，收据`build/e2e/editor-preview-final-docs.log`。
  6012服务PID88523持续运行；用户未跟踪.zcodeignore保持原样。

## 下一位 Agent 提示词

无下一位 Agent 提示词，等待用户验收/收口。

## 用户体验反馈窄迭代（2026-10-02）

- 用户明确要求按钮移入上方工具栏，图例简洁、半透明；Root在本会话继续负责3个原Owner文件，
  只调整PreviewCanvas展示/相邻回归/CSS，不改轨迹推导、移动、正文、save/schema或公共接口。
- “显示完整轨迹”和“回正视图”进入共享预览工具栏；地图图例仅保留当前步骤、角色颜色与简短符号。
  长说明进入title提示，背景改为50%透明，文字本身保持不透明。删除废弃的浮动按钮CSS。
- 新回归先红1 failed / 3 passed，修后功能包3 files / 22 tests绿；同一工具栏按钮定位、图例无按钮、
  短标签/完整悬停说明、完整轨迹和回正行为均验证。editor typecheck零诊断、全仓lint2732 files零error/warning/info。
- 组合检查原收据1 failed / 44 passed：共享控件审计包装测试超过15000ms；单项复跑同样超时。
  未调整阈值/忽略/规则；直接执行同一个audit-legacy-controls --gate通过（100 files、2条既有证据绑定例外），
  不宣称本轮完整editor套件全绿。日志保留为`build/e2e/editor-route-toolbar-{green,adoption-retry,adoption-cli,functional,types,lint}.log`。
- 6012真实浏览器确认：按钮均在工具栏、图例无按钮；computed background为rgba(16,21,28,0.5)、文字opacity=1。
  完整轨迹实点后节点线仍显示，服务与用户页面保持打开；仅改变预览视图，不写作者工程。
