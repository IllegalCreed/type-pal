# E2E-R4-1 — 路线驱动与合法检查点薄基线

Status: build
Owner: Codex
Phase: ops
Visual Verification Timing: e2e-consolidated（001独立执行器首批）

## 当前推进位置（2026-10-02）

001–004已按各自边界核定verify，本轮当前边角已[收口](../archive/tasks/done/PRE-005-DEBT-1-current-edge-closeout.md)。
用户确认005为回厨房接买虾委托、码头水生叔/张四对话、返回盛渔村听丁香兰报信，止于恢复控制，不继续探病。
鱼嫂对话纳入自然路线建议，但不是报信硬条件；源码与人物/时序纠正见[滚动攻略](../../lore/timeline.md#005-买虾出门与香兰报信)。
005执行器及作者编排已实现；[六份同版实跑与真实终档](../../testing/e2e-005.md)已独立核验，用户观感复验另列。
用户同时要求后续逐段回写剧情知识，维护既有timeline及碎片目录，避免仅靠对话记忆。
下一步优先[001–005共性问题族治理](../../testing/e2e-001-005-common-issues.md)：机械状态展开、动态入口后继、时基及作者模型统一，
不等待每段E2E重复踩同根问题。运行器browser.newContext崩溃/无返回时的独立超时与自动清理仍待补；
本轮未生成录像，完整Q1/Q2和后期剧情仍未完成，不把正常六case通过当作异常监督机制已完善。

## 先前进展（2026-10-01）

002最终双引擎verify与完整质量门已通过并收口，见[002回执](../../testing/e2e-002.md)。
各自真实001档正常出房至s003/e56，20正文/500文、三人起步/两段对白停步/短续走/终点隐藏、
真实002档新上下文恢复与同引擎Canvas均通过；两门持久open页修复未改变保存前结束画面。
已交付编排审查：保留目标＋速度与独立auto并行；落实局部参与者接管、完成语义与持久门意图；
李大娘24次nudge实际路径留作后续表达候选，中间动画/节拍等价未证，不机械压缩或引入parallel/join。
冻结3feb5a77完整check10655项、E2E工具57项通过，lint2704文件零诊断；四张002子卡done归档。
后续核实002下一段大娘绑定选错次日方案，已补第一天初次链并从真实001正常重跑RF002；
旧passed档及报告保留，新002结束/恢复/003 donor均增加交接语义门，不用恢复相等替代故事正确。
现有两引擎真实001→002→003链，00314正文/12楼梯实际脚步、厨房交代不取菜、生产保存与新上下文恢复已通过。
详见[003回执](../../testing/e2e-003.md)；003新统一门/用户观感与004厨房朝向counter各自记录。
本母卡仍build：004以后、跨片段完整runner、capture录像音轨及全局Q1/Q2未完成。

2026-10-02用户已定义[004](../archive/tasks/done/E2E-004-1-meal-and-beggar-wine.md)：取酒菜→送苗族跟班→正常物品菜单赠桂花酒给醉道士→
完整剧情结束且恢复移动，包含物品使用，不停在得到桂花酒。现已落实NPC正文归属与显式await，
当前RF002→003→004正常重建并passed；历史game004也已独立accept，新工具game重跑诊断另记。
40正文、正常菜单取消/失败/静止成功、唯一耗酒、持久端菜外观、完整剧情/恢复移动及两次fresh存读皆有实证，
全仓质量门通过，见[004收据](../../testing/e2e-004.md)。不是同revision both汇总，capture仍待办；
当时005尚未定义；现行边界见顶部更新，仍不造档/道具或把未执行流程标为通过。

### 001收口记录（2026-09-28）

001已按[独立验证子卡](../archive/tasks/done/E2E-001-CLOSE-1-dialogue-and-actors.md)核定verify done：
55正文及说话人/24对白块、5角色或对象、两个站定区间/演出偏序、真实结束档和新页正式恢复、
同引擎Canvas像素一致及10截图目视通过；一阶段翻页漏行/自动淡入变暗两缺陷已修。
完整check10,207/受保护strict9,746/静态零诊断。下面“逐页/其它角色未完成”均为早期批次历史。
下一步002：继承各自真实001结束档，正常出房间、到s003/e56附近触发李大娘/三苗人演出，
按既定消失/控制权边界收段并核实际500文奖励；不造档、不跳场景、不重问已定范围。
母卡仍build，后续片段与capture/录像音轨独立继续，不能把001通过说成全局Q1/Q2通过。

## 脚本合理化要求（用户，2026-09-30）

用户要求后续E2E增加脚本合理化任务：逐段判断剧情脚本的编排是否合理、是否需要改进、
以及如何以更清晰、更现代的内容表达实现目标观感。Codex负责结合源码与实际演出给出判断，
从002开始与流程验证一并交付。001既有verify收口保留，不追溯冒称已经完成本次新增审查。

每段重点检查：动作与对白的先后/并行关系；移动目标与速度的表达；等待究竟服务演出节拍还是
猜测异步动作完成；NPC自动行为与剧情接管的所有权；场景退出/取消后的收尾；阶段切换、奖励
与控制权恢复；重复步骤、隐式全局依赖和迁移遗留低层指令是否有必要。优先使用已有明确命令，
按动作完成条件衔接后续步骤；有观感依据的停顿保留并写明理由，不机械删wait或把速度改成时长。

已核例子：`packages/content/src/author-script-core.ts:188`的moveEntity使用target/to/speed；
`projects/pal/content/scenes/s001.json:7288`起李大娘按目标坐标、normal速度分段移动，另有wait与对白。
当前不是“坐标+指定移动时间”。新编排应表达“走到哪里、何时说话、何时转身/离场”的演出意图，
不以改参数名字、增加指令或复制原版逐帧机制作为现代化判据。上下文按
[READ-FIRST](../../phase2/READ-FIRST.md)铁律4/6/8/9/10及相关一阶段知识核定。

每段回执须有“脚本编排审查”：源码/实际事件证据 → 问题或保留理由 → 建议表达与收益 →
保留 / 本段改进 / 后续能力建设 / 待产品裁决，并列出验证结果和未完成项。
保持既定剧情与观感的局部编排改进可在核前提、单Owner和白名单后落实；触及schema/公共接口、
移动语义或主动改变节拍/剧情目标时开对应任务，产品取舍给出before→after和代表场景。
完整原版脚本转换核现已退役：编排改进直接维护canonical作者内容，不复活转换/overlay重写；
仅原始源拥有的资源/地图缺陷仍先定位并修对应供给真源，再刷新、核白名单和双跑幂等。
验证改进后的实际演出与真实检查点接续，测试不得为了迁就错误编排放宽预期。
语义与时序断言用于证明剧情目标，不要求两引擎内部坐标、步数或指令数相等。

2026-09-30 002已开[独立执行与编排审查子卡](../archive/tasks/done/E2E-002-1-inn-route-and-trio.md)，
用户再次钉定核心为s003/e56首次触发长脚本；正常出房间至e56是独立路线准入问题。
Codex核primary/现行内容/真档后批准隔离工具实现，产品与作者脚本暂不改；实际演出尚待验证。

## 脚本系统调研（Codex，2026-09-30）

用户要求深入调研当前脚本系统。本轮只读核作者模型、编辑器、迁移发布、编译执行、生产宿主、
所有权与保存链，并以一阶段和001作对照；未修改产品脚本、schema、运行时或迁移实现，未实跑002。
下述是源码与契约测试结论，不是所有场景的合理性审计或新的剧情视觉验收。

### 当前链路与关键语义

- 作者内容：实体Page选择具名trigger/auto行为，场景选择具名onEnter/onTeleport钩子；跨处复用
  走共享库`callScript`和显式`self`契约，物品私有正文归物品。实体地址为`{scene, entity}`，
  stage/state/behavior/hook均有稳定身份。当前作者命令取自current runtime方言，不应把内部Base
  类型中的旧命令当作产品仍接受的语法。锚点：`packages/content/src/author-script.ts:37`、
  `packages/content/src/runtime-script.ts:1`及[现行合同](../../phase2/specs/script-system.md)。
- 编辑：通用正文/flow组件经`ScriptEditSession`维护canonical内容、引用校验、undo/redo/save；
  场景投影不是作者真源。锚点：`packages/editor/src/core/script-editor.ts:1299`、
  `packages/editor/src/ui/ScriptEditor.tsx:3105/3812`、`packages/editor/src/core/script-editor-projection.ts`。
- 执行：作者对白身份解析成runtime命令；编译器生成只读、带content digest的内存Executable，
  runner递归顺序await正文、分支与共享调用。`callScript`不是并行派发；目前无通用parallel/join
  作者结构。锚点：`packages/content/src/author-script.ts:57`、`packages/reforge/src/runtime-script-compiler.ts`、
  `packages/reforge/src/script-runner-core.ts:300/325`。
- 阶段：stages每次激活只执行当前stage，`next`写下次激活cursor；没有next会再次执行本stage。
  stateMachine的continue在同次激活继续且不提交安全点，advance提交后返回，to提交后显式让步
  并继续。默认auto编译为每命令后的100ms边界；`cadence:'transition'`改由状态迁移控制节拍。
  改分组/内联/复用可能改变节拍和保存边界，不能当成纯文字整理。
  锚点：`packages/reforge/src/script-runner-core.ts:153/193`、`packages/reforge/src/script-compiler-core.ts:166/304`。
- 移动：当前moveEntity是目标坐标+速度枚举，正式宿主等待实际终点提交才返回；不是固定时长
  tween。生产按100ms世界拍、速度对应格距和slow休拍推进。其后的wait应单独审查演出意图，
  不能默认解释为等走完。锚点：`packages/content/src/author-script-core.ts:188`、
  `packages/reforge/src/entity-walk.ts:13`、`packages/reforge/src/script-project-core.ts:157`、`packages/reforge/src/main.ts:2910`。
- 并行/接管：各NPC自动行为有独立activation，和前台剧情并行；前台位移隐式接管目标，转向/
  定帧不接管。被接管的auto move保留终点并在release后续走，auto单步可因权限而跳过。
  对话不全局冻结NPC，中央confirm等执行门是另一机制；正常脚本链finally和强停负责归还权限、
  取消悬挂效果。锚点：`packages/reforge/src/main.ts:2676/2710/3776/4233`及motion-runtime-coordinator。
- 持久化：WorldScriptState保存场景分区状态、选择与flow cursor，不保存命令索引、调用栈或
  wait半程。保存gate等待真实活动lease到安全边界，旧owner epoch不能回写过期cursor；共享/
  物品/嵌套活动也计数，不能漏掉等待中的效果。锚点：`packages/reforge/src/script-world.ts:441`、
  `packages/reforge/src/runtime-script-project.ts:466`。重排奖励/隐藏/阶段切换须验证防重复与读回接续。

### 维护入口与验证边界

第一阶段已同时存在方向单步与坐标+速度NPCWalkTo，不是本来只有方向+速度。纯转换分别映射为
stepEntity和moveEntity；当前坐标模型也不是“坐标+移动时间”。锚点：
`packages/game/src/core/event-system.ts:1415/2680/4699`、`packages/migrate/src/translate-event-motion.ts:37/48`。
001当前的李大娘分段move/dialog/facing编排见`projects/pal/content/scenes/s001.json:7288`；
纯迁移overlay亦有这套编排，但不能据此断言改overlay会直接覆盖当前场景正文。

当前publication从current baseline保留作者场景/共享正文，刷新原始源拥有的资源、地图等分区，
再与当前工程三方合并。作者编排改进应维护canonical作者内容；已证实的生成缺陷才修对应生成
真源。baseline禁止手工拼接。锚点：`packages/migrate/src/pal-current-publication.ts:100/108/147`、
`packages/migrate/scripts/migrate-content.mts:56/69`及[发布维护入口](../../../packages/migrate/README.md)。

编辑器实际场景工作台使用playCanonical，复用当前compiler/runner；但移动预览仍以简化半格步进
和独立SPEED_MS推进，只加载当前场景。预览不是正式移动节拍、完整多人调度或存读档的证据。
锚点：`packages/editor/src/ui/SceneScriptWorkspace.tsx:246`、`packages/editor/src/core/playback.ts:73/85/437/456`。

只读盘点294场景及共享库（含未选中方案和全部登记flow，非活跃调用图）有4459个stages、195个
stateMachine，含13849处stepEntity与3430处nudgeEntity。数字只说明仍有大批低层表达待按实际
调用域审查，不证明全部是缺陷，也不授权全仓批量改写。

### 后续E2E采用的判断顺序

先确认选中行为/调用链和剧情意图，再核实际事件偏序；优先以现有moveEntity、动作完成等待、
明确接管/归还和合理阶段边界表达。逐拍步进只有在确认中间路线、朝向、动画、触发与节拍无
必要差异时才考虑替换；wait逐个区分停顿、节拍和冗余等待。重复正文只有真复用时才抽共享脚本。
确需“多人同走后汇合”而现有表达不足时登记parallel/join等能力候选，另开语义设计，不以auto
旁路或估算wait拼凑同步。每个保留/改进结论仍须在本段E2E回执附实际演出和检查点接续证据。

验证：Reforge五文件56项、编辑器canonical播放相关四文件39项、迁移移动/overlay/current
publication三文件12项，共107项全部通过；其中publication读取真实PAL source并核作者保留及
重放零差异。本轮未跑全仓统一质量门、未新增覆盖率结论、未重复001视觉流程或执行002。
本轮无跨Agent交接；无下一位Agent提示词，研究结论供本卡后续002编排审查使用。

## 用户意图与首批准入（首批已完成，当前二阶段增量见后文）

2026-09-27用户要求“回到E2E，推进001”。Codex核定首批build allowed，不再请求已定剧情边界：
先完成一阶段001从正常新游戏到房间可控的独立Playwright脚本、正式快存导出与新浏览器上下文读回。
二阶段对话观测仍缺cue/page状态，单列后续适配，不以盲发确认键或手造世界补齐。
本批不改游戏产品代码、存档格式、场景内容/迁移，也不接速胜；不把采样位置日志冒充完整已提交移动事件。
完整NPC静止区间诊断、二阶段001、002及后续仍未完成，本母卡保持build。

实施白名单：根package.json/pnpm-lock.yaml（独立Playwright工具依赖/命令）、scripts/e2e/**、
本卡/看板/测试索引/001执行文档及碎片目录状态。临时浏览器存储与产物仅build/e2e/，用户6010和存档不动。

| 前提 | 原版/primary | 第一阶段 | 第二阶段 | 本批目标 |
|---|---|---|---|---|
| 001正常新局 | 用户已定碎片；原始提取scene/0=L_4、scene/1=L_3545 | bootstrap:1765起新游戏handler先3.mp4再startNewGameFromPrimary | s000→s001/onEnter，dialogue仅暴露active | 正常菜单输入，不用skip-intro/dev-scene |
| 对话正常确认 | 原始脚本与用户“不跳对话”裁决 | dialogBox.phase及event-system等待门、正常KeyboardInputSource | DialogBox cue/page仍为内部状态 | 一阶段状态驱动确认、尾停顿等待；不改cursor |
| 结束档真实来源 | N/A，不改变游戏数据格式 | F5正式quick-save；tools/save-io.ts与Save API | 已有__tpE2e.dumpSave，后续使用 | 只导出本次实跑存档，正式parse/import+菜单读取回验 |
| 诊断证据边界 | 用户要求实际提交位移、有界日志 | 本批仅只读现有DEV状态与dialogHistory | 提交前motion trace不能证明静止 | 仅声明流程/检查点小样，不冒充完整时序或跨引擎验收 |

最强反例：跳过开场/旧槽恢复/新页读档失败落新局也显示场景。脚本须证明3.mp4完整结束、梦境/房间剧情锚、
菜单控制权、全新上下文起档与导出hash；恢复后比较实际世界摘要，不能仅以页面出现通过。

2026-09-27用户要求不再由Codex持续补覆盖率，转向讨论快速通关E2E，避免模型盲探剧情与迷宫。
GLM/Cursor仍后台补测，用户不承担手动通关。固定三签暂休。
最终执行器必须无Agent/模型API依赖：AI只在开发期设计/校准，运行时所有分支由程序决定，
未知状态失败留证；独立进程可连续跑声明流程是最终验收门，不以AI操作浏览器通关替代。
用户已追加确认两阶段双线、主线优先+大型支线、普通遇敌速胜/剧情Boss个案、保留对话和后续录制用途。
下述为准备期记录，已由上方001首批准入更新：范围不再重复请示；核两引擎实际观察/输入/保存/战斗结果入口、实施白名单与隔离方式，
再据[路线方案](../../testing/e2e-route-proposal.md)开执行器建设。不会因旧审计或check通过就宣称前置清零。
二阶段R4→N6b版本顺序保持，第一阶段独立向前，不等待二阶段卡住的片段。

## 一手锚点与真值

### 2026-09-27 二阶段001首批准入

用户要求继续001。Codex核定本批build allowed：增加只读对话/标题/恢复结果观测和独立Reforge执行器，
走正式标题、新游戏、自然视频结束、键盘对话与现有安全快照/恢复链。不得通过调试advance/跳场景/赋值世界推进。
前提：DialogBox:158-177按pageDone/分页/autoAdvance决定按键效果，render:229后才确认已显示；
runOpeningMenu:85起在局部维护phase/cursor；main:5372的现有dumpSave走save barrier，
e2e-load:5383成功/失败已有明确分叉。本批只读导出这些既有事实，不改变其执行顺序或游戏语义。
一阶段只提供001内容锚和结束可控目标，不复制旧引擎的对话冻结NPC机制；原版内部模型N/A。
反例：观测器自己推进打字/回调持有真实对象可改状态/失败读档落新局冒充恢复。须有读无副作用、快照隔离、
正常输入推进及显式恢复结果测试；出现真实剧情阻断就留证，不以放宽门禁或改存档掩盖。

本批新增白名单：reforge的dialog/dialog-box.ts、opening-menu.ts、main.ts（只读DEV桥接/观测绑定）、
相应新*.observation.test.ts与必要薄fixture、scripts/e2e/**、根运行命令及本卡/E2E文档。
必要基线只由整批check→ratchet→单次strict统一更新。GLM四批16模块与主目录WIP零触碰。
完整NPC实际提交事件与双阶段时序仍单列，不把本批快照采样冒充完整移动轨迹。

- 当前版本content20/SAVE8，`content/src/character.ts:168-170`；切版checkpoint重建，禁止兼容层。
- Reforge main:5372-5418的导出/恢复，main:797-809/5073后的读观察点；package.json没有runner。
- 碰撞与地图实例：reforge/src/collision.ts；动态移动继续走生产输入链，不用测试路径规划替换它。
- 用户已确认001/002见[剧情边界](../../../projects/pal/e2e-checkpoints/README.md)，003–010仍须Codex先起草。
- [现行E2E合同](../../testing/e2e.md)、[旧前置盘点](../../testing/pre-e2e-admission.md)和READ-FIRST：
  旧日期/行号/缺陷状态必须按当前树重核；一阶段只作内容/UX参考，不对齐内部状态。
- 最强替代解释：直跳场景或读档失败回落新游戏造成假通；必须有正式恢复成功与起始契约、真实前驱档hash。
- 第一阶段bootstrap:1120-1133/1918-1919的DEV状态与core/save/api.ts；game与reforge对话分页接口不同，
  不能共享内部存档或照搬固定回车次数。主线checkpoint只继承本引擎前段实跑结束状态。

## 准备期边界（历史）

不实现runner/测试后门/速胜，不改存档/迁移，不跑剧情或共享coverage，不替用户决定特殊战斗胜负。
Codex帧动画补测WIP冻结保留、未计入基线；+5pp目标未完成但不阻塞本卡讨论。
后续build卡须明确允许动作、只读状态协议、失败停线/预算、检查点来源链和小样验证。

2026-09-27追加诊断约束：重要NPC按实际位移变化记录，与对话/控制权事件共用时间线；
跨引擎按剧情节点/静止区间/事件偏序比较，不做每帧全世界dump或内部状态硬对拍。
现行Reforge trace在提交前，只作计划诊断；正式断言须看实际提交，溢出/漏事件不得静默放行。
李大娘站定说话→说完继续移动作为代表性回归；不复活Reforge全局对话冻结NPC。

## 2026-09-27 首批执行交接

[001执行说明](../../testing/e2e-001.md)：正常新局、3.mp4自然结束、梦境/叫醒全对话、房间可控，
F5导出真实档→第二隔离上下文正式导入/菜单读回/菜单控制验证。有窗口实跑exit0，36个正常按键，
131条状态变化，约76秒；无浏览器错误。保存/恢复持久域hash均为
`92bd6265f5c532be8e9bc7bac55b3494f7b54fea1cf0983d92f4e991fb4855aa`。
结束与读回截图已目视：房间/人物可见、淡入结束、无剧情对话残留。
产物`build/e2e/game-001-2026-09-27T01-32-07-387Z/`；checkpoint
`a34f8d900a49b2bbe63a63034b20a91aaf702a8d4b7fb6e29692896fa96e7fa5`。

校准记录：首次误用scene编号验证dialogHistory.map而失败；第二次流程/读回绿但截图处于自动淡入初始窗，
故补needToFadeIn观察与回归，第三次有窗口实跑闭合。未修改产品/资产/旧测试/覆盖基线；
安装Playwright时包管理器顺带升级spessasynth_core已撤回并frozen重装，音频依赖保持生产原值。
执行器7项合同测试通过；不以此小样宣布完整001/Q1/Q2通过。

统一质量门：隔离提交树`9d45ef11`执行`env -u NODE_COMPILE_CACHE pnpm check` exit0，
七包9741/9741、全包TC零诊断、严格lint扫描2247文件为0error/0warning/0info；
docs/coverage-tools/quality-tools/e2e-tools全部通过，日志`/tmp/codex-e2e-001-check.log`。
其后相同执行器散列经`pnpm e2e:001 --headless`独立复跑exit0：131事件/36按键/约76秒，
结束/读回持久域hash与有窗口跑相同；新档hash为
`5805d87f8c3dfb03ef5afc6a94c27b73e1052020832136c44b782e8c0c11a599`，
产物`build/e2e/game-001-2026-09-27T01-39-32-894Z/`。不同实跑档含运行时瞬态，
不要求跨次全文件hash相等；每次均钉本次F5字节与实际恢复持久域。
Codex核首批流程/检查点小样accept，可集成；packages/与coverage实现/基线零diff，
本轮不重复ratchet/strict-fast、不宣称官方覆盖增长。主树未提交帧编辑测试/临时探针保持原样，
质量门针对隔离的提交树，不把这些未完成WIP计入结果。

## 2026-09-27 二阶段001实现与实跑

Reforge只读标题/对话/恢复结果接口已落；不修改locale/scene/script内容、移动语义、SAVE8/content20或GLM目标。
6项观测回归证明读取不推进/不绘制、DTO不可修改真实状态、实际分页与auto尾停顿、正常标题键盘与正式恢复loaded/failed。
工具合同12项通过；页证明须同时满足实际pageTextIds、已全显phase和排版正文，声明了但没显示的未来行不能充数。
人物位置/淡入连续值不充当按键确认消费，日志按有意义状态变化记录，不逐帧dump。

Reforge有窗口实跑exit0（约66秒、86事件/30按键），真实检查点sha
`c14a252153eacf412a33b56048cf46f8ec79bcc4dbf98022436eea7baccfda6d`，恢复前后持久域hash均
`d401e9d17c413e26c4ec128e9a7e0feb6b478b4a56d35f51669253c252341f98`。
产物`build/e2e/reforge-001-2026-09-27T03-07-46-121Z/`；截图已目视房间/人物及恢复闭环。
后续收紧正文证明后的`pnpm e2e:001:both --headless`亦两子进程exit0，日志`/tmp/codex-e2e-001-both-final.log`。
两套真实结束档各自产生，各自新上下文验证空IndexedDB、正式恢复和菜单可操作，不跨引擎互喂存档。
新增`e2e:001:reforge`与`e2e:001:both`入口；两套同时跑，一方失败不跳过另一方，运行时不调用AI。

开发校准：新测试host全局窄化导致TC失败，改用boot返回句柄后修复；无产品输入强转或规则降级。
已知浏览器信息：干净工程save-state文件缺席404与Canvas读回性能提示列报告，不算资产失败或静态诊断豁免。
Reforge生产build通过，已扫描dist确认__tpE2e/readBootObservation/checkpointLoad桥接不进入生产JS。
完整NPC实际提交日志、对话序列偏序比较和capture-ready仍未完成。

首遍完整check如实失败：checkpoint-export旧AST回归要求唯一DEV导出注册，早期标题注册造成17项红。
未改旧fixture/断言：将新只读观测独立为__tpObserve，原__tpE2e注册块与e0844fe7逐字相同。
原17项+新6项合计23/23复跑通过，桥接修订后Reforge实跑再次exit0，检查点hash与前述相同。
生产build退出0但有Vite大于500kB的包体积提示；这不包含在lint/typecheck零诊断声明中，未通过改阈值消警。

3901f1d6最终整批门：完整check **9793项**（Reforge1749），另12项E2E工具合同；
全部包TC与严格lint **2265文件/0error/0warning/0info**。官方ratchet与保护e0844fe7的单次strict-fast
**9301项/728生产文件**通过，按官方baselineView投影精确相等。源码集合未变，其它六包完整基线对象不变。
本批是E2E观测能力，不是恢复主动追覆盖率：S +72覆盖/+37分母，B +49/+32，F +11/+8，L +60/+31单列。
全仓当前B46201/63315=72.97%，L57806/70877=81.56%。不把这次生产分母变化计作GLM补测。

旧检查点17项未改；最终桥接修订后Reforge独立实跑产物为
`build/e2e/reforge-001-2026-09-27T03-22-22-947Z/`，检查点与持久域hash仍与上文一致。
双引擎并行证明位于`game-001-2026-09-27T03-14-49-389Z/`与`reforge-001-2026-09-27T03-14-49-393Z/`。
正式日志`/tmp/codex-reforge-001-{check2,ratchet,strict}.log`；首遍check失败日志另存check.log，未覆盖。
Vite旧基线e0844fe7隔离替换三原模块构建也有653.46kB提示（baseline-build.log，源hash不变），
当前包大小未作阈值豁免或性能修复；DEV的__tpObserve/__tpE2e/checkpointLoad均已证不进入生产JS。
本席核本次流程/检查点增量accept并集成；母卡继续build，不标整个001时序/full-Q1-Q2通过。

无下一位Agent提示词；Codex继续实际NPC提交事件与双阶段差异比较，母卡保持build。

## 2026-09-27 001稀疏提交观测增量准入

Codex核定build allowed。本批只改scripts/e2e/**与E2E文档，不改产品、内容、存档、官方覆盖配置/基线。
使用独立Vite配置在隔离服务内对真实源码作只读AST插桩，保留原调用/返回/异常；普通dev和生产构建不加载插件。
静态锚失配、未覆盖来源的位移、观测异常或有界日志溢出必须失败，不将没有日志解释为静止。

四向依据：用户指定“李大娘站定说话”内容目标；原始提取scene/1与全局事件对象10（非厨房19）；
一阶段event-system的applyRawOpcode、npcWalkTo、partyRideEventObject、monsterChasePlayer实际执行边界，
后者中间碰撞试探不是提交；二阶段main的五处实体pos赋值在authority校验后、DialogBox.render先画后update。
目标只比较语义对话区间/移动偏序，不比较两引擎坐标、步数或逐帧时刻；不引入对话冻结NPC耦合。
二阶段s001/e10与一阶段wNumScene=2/id10独立映射，dlg.1369/1371为选定区间；001之外不宣称完整NPC覆盖。
最强反例：同次采样间往返、计划位移未提交、源码换位置导致漏钩、对话auto尾停顿被采样漏掉。
验收包含真实函数插桩合同、上述反例判别、两套独立实跑及真实检查点回验。差异先留证归因，不自动修内容。

### 本批执行证据

两引擎正常并行实跑与真实档读回exit0；比较回执
`build/e2e/both-001-2026-09-27T04-03-40-429Z/comparison.json`。
game产物`game-001-2026-09-27T04-03-40-662Z/`，Reforge产物`reforge-001-2026-09-27T04-03-40-666Z/`。
原生视频自然结束、正常确认输入与房间控制权均保持；结尾截图已目视人物/房间可见、无对话或淡入残留。

| 证据 | game | Reforge |
|---|---|---|
| NPC稀疏事件 | 138 | 103 |
| 实际移动提交 | 29 | 29 |
| 两段对话内位移 | 0 / 0 | 0 / 0 |
| 对话前/中/后非空移动见证 | 12 / 4 / 13 | 12 / 4 / 13 |
| 日志丢失/溢出/观测异常 | 0 | 0 |
| 结束/恢复持久域 | 92bd6265…均相等 | d401e9d1…均相等 |

相同步数是本次观察结果，不是跨引擎门禁；断言只核内容区间与偏序。
game新档sha `f9e12d9f589fb1f930ade42803a7ec4f020b46986e057730eed129fbd027e9cd`；
Reforge新档sha `c14a252153eacf412a33b56048cf46f8ec79bcc4dbf98022436eea7baccfda6d`。
两个明确等键区间均见NPC可见且零位移，不复现“边说边走”；没有为此改游戏移动/对话/内容规则。
新增10项工具合同、现合计22项：真实npcWalkTo同输入与未插桩实现全状态/返回值相等、同窗往返两笔、
删提交钩子必报漏观测、计划不算位移、异常身份保留、DTO隔离、溢出/身份/事件gap/缺等键等拒绝。

校准失败保留：首次工具断言预期锚点错误信息，新增更早的write-census门后实际在该门拒绝，已改断言为精确错误；
`/tmp/codex-001-trace-tools2.log`原红保留，tools3.log为22绿。
第一次带比较门的浏览器运行期间本人格式化插件触发Vite重启，视频自然结束等待按预期超时；
失败产物`both-001-2026-09-27T04-02-19-887Z/`与`/tmp/codex-001-trace-gate.log`保留。
冻结工具文件后重跑`/tmp/codex-001-trace-gate2.log`通过，不是多数票重试或放宽超时。

本批只读插桩为执行器工具，不进入正常构建/官方测试选择；packages/、旧测试、资源、覆盖配置和基线零diff。
因此不为本批重跑/抬高官方ratchet，不冒充生产覆盖率增长。全对话逐页、e11等替身与录制/音轨仍待验证；
001全视觉/capture-ready与母卡done均未开放。

最终质量：完整`pnpm check` exit0，七包9793项，全包typecheck零诊断，严格lint
2272文件/0error/0warning/0info（`/tmp/codex-001-timing-check.log`）。收紧回头正证后工具22/22、
17个E2E工具文件Biome零诊断再次通过；文档/链接门独立复跑通过。
最终有窗口`pnpm e2e:001:both --headed`两子进程与比较均exit0（`/tmp/codex-001-timing-headed-final.log`），
回执`both-001-2026-09-27T04-10-09-058Z/comparison.json`；两引擎仍为138/103事件、各29次移动，
两个静止区间与实际回头事件（game序96、Reforge序68）均通过。
原始NPC日志分别62180/65109字节；不是每帧世界dump。
最终子产物`game-001-2026-09-27T04-10-09-326Z/`与`reforge-001-2026-09-27T04-10-09-331Z/`。
Codex核本批关键NPC时序增量accept并集成；GLM四组源文件及主目录两份帧动画WIP散列均未触碰。
下一步为001全对话逐页/其它演出角色与录制音轨矩阵；无下一位Agent提示词，由Codex继续，母卡保持build。
