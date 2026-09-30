# SCRIPT-COMPLETE-1 — 脚本完成语义与空结束步骤清理

Status: review
Phase: phase2
Capability: W7 / X1 / P3
Coding Owner: Codex Root
Generation Owner: N/A
Reviewer: Codex / e2e_002_runner（只读独立前提与实现压力审）
Visual Verification Owner: Codex
Visual Verification Timing: mixed
Contributor: Codex
Branch: codex/e2e-002-r1

## 目标与范围

用户2026-09-30以“正文两条指令→零条指令且下次仍执行当前步骤”的截图指出结束占位不合理，
在说明“重复 / 下一步 / 本方案完成”后批准“那咱们处理一下”。把完成建模为可保存的真实状态，
编辑器直接选择完成，不制造作者空节点；谨慎清理PAL中经核实的纯结束占位。

- Root唯一产品/作者写入Owner；隔离树 `/Users/zhangxu/.codex/worktrees/e2e-002/type-pal`。
- 白名单：content作者flow/cursor/版本及对应guard；reforge控制流/宿主/投影/保存及回归；
  editor通用flow编辑、引用/预览与回归；当前工程manifest及已核实的纯结束占位；当前规范/指南/本卡。
- 版本切换仅当前canonical，旧开发档拒绝，不建旧upgrader。必要的版本fixture机械更新单独记录。
- 不改一阶段语义、地图/资产/提取/退役转换核，不引入parallel/join、全局对白冻结或自动折叠未知空节点。
- 6012服务保持运行；用户2026-10-01确认无草稿并批准更新后才集成、刷新。测试使用独立实例。
  002工具Owner不写产品，恢复提交点的后续工具窄改另见002卡。
- 依赖[保存门修复](E2E-002-SAVE-1-completed-auto-safe-point.md)的v2窄改；不以新完成节点掩盖to晚保存反例。

## 前提真值门

### 一句话前提

当前省略next表示下次重跑；一次性脚本不得靠作者空stage常驻轮询来表达完成。

| 维度 | 真值 | 直接证据 |
|---|---|---|
| 原版/primary source | N/A：这是现代作者flow的结束表达，不改原版字节码；不得由原版END直接推导现代owner选择语义 | 作者flow的实际生产合同如下 |
| 第一阶段 | N/A：一阶段没有canonical FlowCursor/编辑器；不修改其解释器或保存 | `packages/game/src/core/event-system.ts`独立于此合同 |
| 当前二阶段 | stage缺next提交自己；普通completed空stage没有特殊意义；列表无差别显示0条指令步骤 | `script-runner-core.ts:186`；`s003.json:2120–2164`；`ScriptEditor.tsx:3865/3899/3921` |
| 本任务目标 | 正文结束CAS提交completed cursor；完成方案不再激活，保存/读回保持；仍支持重复/正常下一段和显式切换 | 当前lease `script-world.ts:452`、选择复位 `script-world.ts:239–312`；本卡设计 |

### 反证与替代解释

- 空节点可能承担entry、状态条件、显式yield、外部cursorHandoff或真正重复空行为；不能按body为空一刀切。
- 已完成不是selection disabled；同方案选择不重放，真实切换/复位仍依现行身份变化纪律。
- 推翻：完成后重复副作用、保存丢状态、切换不能重启、旧epoch覆盖新选择、nested假完成、
  预览仍伪装循环、清理去掉真实节拍或引用失效。
- runtime是真实缺少完成cursor，不是显示计数误差；作者占位有next直接引用，不是坏提取地图；
  原版END不作为schema结论；测试须运行真实runner/coordinator/主壳，不能只看缩短JSON。

### 用户可见偏离

- before→after：两个步骤（正文+空结束）→一个正文步骤，完成后标记“本方案完成，不再执行”。
- 代表：s003/e56自动行为1的两个move后纯completed；真实后续对白不删。
- 2026-09-30用户已批准上述方向；具体数据折叠须直接核引用/节拍，未知不执行。

## 上下文锚点

- [二阶段铁律](../../phase2/READ-FIRST.md)、[作者脚本合同](../../phase2/specs/script-system.md)、
  [工作流](../agent-workflow.md)、[AGENTS](../../../AGENTS.md)。
- `author-script-core.ts:34/278/285/938/1129`：cursor、flow、严格guard。
- `script-world.ts:167/177/204/441/642`：选择、租约、epoch/CAS与屏障。
- `runtime-script-project.ts:300–410`、`runtime-project-view.ts:91/220`：激活/场景投影。
- `world-sprite-behavior.ts:374–435`：只读预览；`script-editor.ts:678/2341`：引用/文案。
- 原转换已退役，作者内容直接维护；不恢复旧版本、magic stage id或默认类型强转。

## Draft：设计与验收

- stage next增加显式 `{kind:'complete'}`；machine transition同样可complete。
- FlowCursor增加 `{kind:'completed'}`，只经完整body安全点提交；不是command，不保存半执行栈。
- 已完成owner不创建新lease或触发前台占位；完成不改变Page/Behavior/Hook选择，切换仍按旧规则复位。
- 编辑器通用详情提供完成选项，卡片/单步骤也能看到完成语义；共享/物品正文不引入假owner状态。
- PAL只折叠443个从initial图可达、非initial、无entry、body空且next省略/自指的stage sink，
  分布355 auto/61 onEnter/27 trigger。18处handoff/247 cases无这些sink直接引用。
  s182/onEnter/legacy-001/legacy-003孤立空节点保留；36个machine sink有28条to/9条advance入边，
  本次不折叠，不增complete.yield或丢掉原final节拍。有entry/initial/真实控制空节点均保留。
- 单一canonical切换content21/SAVE9；真正RF001 SAVE8/content20含被删legacy-002 cursor，
  必须重新执行正式001生成新前驱。拒绝旧档，不升级旧真实输入、不改历史report。
- identity解析保留completed信息，用可执行性单独拒绝lease；CAS完成通知刷新绑定/触发revision，
  auto外围正常退出，不abort未完命令；不因刷新重置无关动画。
- 红绿：schema严格形状；stage/machine/branch完成；调用/abort/modal/旧epoch；完成无新lease；
  选择同一方案不重放、切到另一方案再回来可运行；真实F5/F9和fresh-context restore。
- UI：当前PAL两move案例只有1个正文步骤；选择重复/下一步/完成、撤销/重做、保存重开与预览核验。
- 剧情E2E：002保持20行/500/局部接管/真实走位，当前版本前驱由真实流程生成，不升级旧真档伪造证据。
- 全仓check及静态硬门零诊断；任何未完成验证如实留卡，不借此关闭002母任务。

## 当前模式推进记录

- Root premise verified：直接读上述生产runner、guard、编辑器与实际作者内容。
- 独立premise verified/design agree：e2e_002_runner直接读取生产选择/epoch/主壳入口、作者295场景
  4654 flow与保存真实001；发现旧真档引用及前台/auto再激活counter，已在设计中闭合，源码待验。
- Root design agree / build allowed（2026-09-30）：版本/443折叠/调度边界已核，Root唯一Owner。
- Root已冻结实现为`a98a3855`（完成语义/当前21与9）+`b83faa50`（443作者空结束折叠）。
- e2e_002_runner独立源码/数据压力审：实现边界accept；间接条件完成的预览counter已修，
  全仓门与当前RF001→002正式回执仍由Root独立验收，不据此提前done。

## Review：实现与证据（2026-10-01）

- `packages/content/src/author-script-core.ts:276/336/985/1163`：完成边与完成cursor严格形状；
  `packages/reforge/src/script-runner-core.ts:137/195/253`：完整正文安全点提交完成，不伪造abort/stop完成。
- `packages/reforge/src/script-world.ts:177/548/645/672`：真实owner/epoch CAS后通知；
  completed仍参与身份解析，但不再创建lease；同身份不重放，真实换方案/复位沿既有规则。
- `packages/reforge/src/main.ts:2784/2998/3833`及`runtime-project-view.ts:107/129/137`：
  移除执行绑定并自然退出auto循环，触发修订仅对完成trigger更新，不重置动画/页面身份。
- `packages/editor/src/ui/ScriptEditor.tsx:3539/3867/3964/4093`：单正文显示完成及通用去向选择，
  同名stage id不会与complete选项碰撞；core覆盖编辑、撤销/重做、序列化重开与引用。
- `packages/editor/src/core/world-sprite-behavior.ts:386/433/742/1021`：只读有限预览标一次执行，
  间接条件终止不谎报循环；投影哨兵不进入作者工程/存档，也没有插入空stage。
- 独立295场景审计：443个fold只删纯吸收空stage、改入边；4905个保留node的命令与其余字段不变，
  状态机不变；355 auto/61 onEnter/27 trigger；审计聚合SHA
  `e8fd1e93cdb1834b920eb814fdfaca65d229a3088b02abab9ff39fff7135b65e`。
- 独立运行真实guard/compiler/runner/coordinator：共享stop只停自身、caller仍可完成；
  nested完成不提前释放父保存屏障；旧epoch完成不覆写新选择、也不通知。源码反证不是正式浏览器回执。
- 定向：content guard31、核心runner/world/main/save codec57、编辑core/UI/preview74；
  Reforge相邻6文件82项与此前全包250文件2023项通过（最终全仓需按冻结候选重跑，不将此前数量冒作最终）。
  当前main.auto-save-flows 6项实际F5/F9主壳回归含4项旧to/advance晚保存反控与2项显式完成。
- `pnpm check:content`：PAL 294注册场景/223地图/1934资源，通过；隔离工程资产实际置于工程根内，
  未降低author source真实路径边界，没有改main资产/提取/供应核。
- Root独立6013实看s003/e56 auto1：正文两move、1步骤、完成标记；去向改重复及撤销/重做恢复完成；
  原trigger第二步仍有实际命令而保留。截图
  `build/e2e/script-complete-20260930/editor-complete.jpg`位于主树；6012服务与用户页面未关闭/刷新。
- 全包typecheck与严格lint2703文件0 error/0 warning/0 info已通过；最终完整check在跑。
  之前红项保留：隔离raw/作者资产缺失；版本断言/AST helper fixture；PAL引用census差12来自此前
  CHOREO新增六对take/release，不是fold删命令。补真实输入、更新当前fixture和准确计数后定向绿，
  未新增ignore、降低规则或放宽引用payload预算。
- 正式E2E：已委派只执行冻结`b83faa50`正常RF001→RF002；运行前3181个tracked生产/作者/工具及锁
  hash聚合`6e5e0eb238e2499b58ede281f38f119e0be95366c42080a3617db0fc0b8efc2c`。
  RF正式链是生产barrier dumpSave与fresh-context e2e-load，不冒称浏览器F5；真实F5/F9单列主壳回归。
  RF001实际passed：`build/e2e/reforge-001-2026-09-30T15-05-01-983Z`，55行/24cue、
  SAVE9/content21原始档SHA `4104d7c3540f523d9b42dc062ac32db2c716edee0fe3a7da65f9f8bd4dfabcfc`，
  新上下文World及Canvas hash一致；Root已直接验字节/hash/回执并看结束图。
  RF002首次`15-07-24-839Z`真实route/core/choreography及15ms生产保存passed，报告整体failed：
  读回后第二次dump等待553ms使正常循环e62从legacy-003推进initial。Root与贡献者直接核提交域/实际事件，
  以实际restore提交点只读取证另修工具，不删游标/放宽hash，不借feature关闭002。
- 完整check第一轮冻结结果：game1224、pal-extract128、content2773、platform357、Reforge2024、
  editor3692全绿；migrate449/450，唯一红是把三个作者scene字节冻结到历史baseline。
  `91d07f62`把此门限定为四个inParty完整分支（条件/正文/transition）镜像，保留全根4引用、
  无数字/无悬空；定向已绿，不改生产供应核、不更新历史baseline或降低静态门。最终完整重跑pending。
- 2026-10-01用户明确“没有未保存改动，可以更新”；主树集成不再被草稿信息阻塞，
  等冻结验收后正常更新，6012服务不关闭。旧开发SAVE8/content20拒绝，用户需开新局，不建兼容器。

### 最终质量门与主树集成

- 冻结产品/作者候选的最终完整 `pnpm check` exit0：game1224、pal-extract128、content2773、
  platform357、Reforge2024、editor3692、migrate450，共10648项；lint2703文件
  0 error/0 warning/0 info。原失败日志保留，不追溯改写。
  日志 `build/e2e/script-complete-20260930/check-v3.log`；工具前段当时54项，
  后续`9d15218b`提交点取证交付由Root独立重跑为56项全绿，另存`e2e-tools-final.log`。
- `fc1d5804`合入主树，保留主树`d04a1328`圆角脚本类型tab，不覆盖既有UI调整。
  集成后全包typecheck、严格lint2703零诊断、作者工程检查均通过；
  SceneScriptWorkspace两文件、ScriptEditor、编辑core与预览五文件81项通过。
  以上不是另一次完整主树check，完整包门来自冻结候选，相邻主树差异单独复核。
- 用户批准后只刷新原6012标签，不停服务、不关闭窗口；实际s003/e56自动行为1显示
  1步骤/2条move/“本方案完成，不再执行”，详情选项正确，保存按钮禁用、工程已保存。
  截图 `build/e2e/script-complete-20260930/editor-6012-complete.jpg`。
- 正式002第二轮`build/e2e/reforge-002-2026-09-30T15-29-25-294Z`：实际成功恢复提交点
  全量World（包含completed及所有背景游标）与原始档严格相同；路线/20正文/500文/实际续走仍通过。
  整体仍failed：e73/e74的瞬态定帧在读档时清除，已开门画面变为关门。
  Root直接核trace、保存字节、渲染宿主并看两图；该命令/渲染路径未由本卡改变，门trigger不是fold目标。
  独立问题见[E2E-002-DOOR-1](E2E-002-DOOR-1-persistent-open-presentation.md)，不以放宽画面断言收口。
- Root完成功能代码/数据/质量/最小UIaccept；顶部仍review等待用户检视新结束表达。
  002及母任务不宣布通过，本卡不负责修门或创建新的通用持久化frame字段。

## 交接日志

- 2026-09-30 Root：用户明确授权；建立卡并拆完成状态与既有SAVE-v2依赖，未直接删除空数据。
- 2026-10-01 Root：实现冻结进入review；直接验收代码/数据与最小功能UI；用户6012草稿状态未明，
  不更新main以免打断在用编辑器，候选与正式E2E仅隔离树推进。
- 2026-10-01 Root：用户确认可更新；实际001已通过，002剩余取证时机反控归工具卡；
  当前完成功能/作者正文无新counter，全仓fixture闭合后重跑与集成pending。
- 2026-10-01 Root：最终完整门通过、主树集成与6012实看完成；严格恢复提交点已闭合，
  新门画面counter另登记；本卡保持review等待用户检视，母任务不收口。

## 下一位Agent提示词

无下一位Agent提示词，等待用户检视6012中的完成表达；002门画面问题另卡，不在本卡追加实现。
