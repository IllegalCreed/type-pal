# EDITOR-SCRIPT-PREVIEW-1 — 指令重点摘要、选中步骤播放与地图轨迹

Status: build
Owner: Codex Root
Reviewer: editor_preview_audit（独立只读） / Codex Root（集成）
Phase: phase2
Capability: P3 / W7
Visual Verification Timing: dev-functional
Branch: codex/editor-script-preview

单文件Owner分派：Root负责选中cursor链与指令摘要；movement_preview在codex/editor-movement隔离树独占
`core/script-movement-preview.ts`及相邻测试、`ui/PreviewCanvas.tsx`及相邻测试，Root独立接收；
editor_preview_audit只读独立复核。贡献者不改共享卡/6012，不合main。

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
- 自测/独立审查/用户体验pending。6012原服务保留，不修改用户.zcodeignore。

## 下一位 Agent 提示词

editor_preview_audit只读核选择链/重点摘要/路径反例并反馈，不改实现/不操作6012；Root继续实现并独立集成，待用户体验。
