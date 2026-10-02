# SCRIPT-GOV-2 统一作者步骤模型

Status: review
Phase: phase2
Capability: W7 / P3
Coding Owner: Core / Editor / Content按下文文件域独占
Reviewer: Codex Root
Visual Verification Owner: Codex
Visual Verification Timing: functional-minimal-and-story-e2e
Branch: codex/unified-script-steps

## 用户目标和范围

用户要求继续治理。承接[SCRIPT-GOV-1](SCRIPT-GOV-1-script-family-governance.md)首批，
作者模型统一为方案、步骤、指令，剩余147套机器不是长期保留项。本卡优先处理所需公共表达，
同时逐类证明当前内容可以清楚表达；不能只把state改名为step，不能继续暴露逐拍调度状态。

主树基线1b3bffb79。6012持续运行，.zcodeignore是用户文件，禁止修改；原始存档与既有回执保留。
候选在隔离树验证，不先更新主工程，不录视频。原版完整脚本转换器不恢复。

## 前提真值门

| 维度 | 当前证据与需核问题 |
| --- | --- |
| 原版输入 | all.json为只读剧情参考；各内容族须核控制流、动作与显式帧停顿，不为清理状态数假定全等。上一批全部绑定/hash见治理台账。 |
| 第一阶段 | knowledge-harvest E6、E7、N2、X3、X7：真实auto调用域、同帧交接、时间状态收尾必须实证；不复刻对话冻结NPC等隐含耦合。 |
| 当前二阶段 | script-compiler-core.ts:166–171给auto每个命令追加100ms；:308起区分机器transition节拍。script-runner-core.ts:256–406有两套游标/执行形态，:589起条件loop的maxIterations是保护，不是正常次数。 |
| 目标 | 普通步骤包含连续动作、条件、选择与等待；下次步骤变化显式且可读；消除作者机器结构，内部续跑游标不变成作者概念。 |

本节原始风险已按下文直接证据补齐并核定首个整体候选；没有授权中间双模型合入main。
必须核所有147机器、32个handoff端点，以及其它普通auto/共享调用受时序变化的影响。
最强反例：把已含等待的普通auto按新无隐含拍运行会变速；只从initial看图会遗漏handoff入口；
将stopScript抽到共享调用会改变退出作用域；改变条件求值次数会改变chance剧情和随机巡逻。
若方案只能通过新建私有全局变量模拟旧指针、将旧状态一对一变成步骤、或引入常驻旧兼容层成立，则拒绝。

## 前提复核和整体候选准入

Root及三贡献者独立读取当前模型、真实运行器与消费者，确认：

- 294场景4662方案，147机器5490状态。1328 auto中1194为普通步骤、134机器；1251 auto有每指令100ms，
  77机器是transition节拍。不能仅改147机器后删除全局等待。
- main.ts:3910–3952另有成功激活后的40ms和不可运行时120ms轮询；前者是正常演出节拍，后者是唤醒策略。
- 原共享库为空，所有作者入口callScript为0；无需为共享脚本新增修改调用方步骤的能力。
- s250/s252的摇晃轮数源于SDL参考中的旧idle计数共享，而当前第一阶段OP_SET_AUTO_SCRIPT明确重建
  autoCursor。真实P1探针旧计数0/1/2/3/9均得到固定4轮32次位移。原33644–33666每轮23个auto tick，
  4轮92tick；下一拍恢复touch。此前RF1–4轮及5600ms不是应永久保真的产品意图。
- s231庆典人群撤离，源32156–32167在同段安装12方案，各新方案有自己的2–5帧停顿/路线；不继承旧idle。
  s021原7338明确安装7339开头，P1清旧计数后完整140位移；s273原34728–34731安装34778开头，
  P1清旧计数后船和乘客完整320位移。这里没有源指定中段启动，不新增公开cursorHandoff能力。
- s252初次追逐33641与摇晃后追逐33668速度和驻足规则不同，必须拆有业务名称的两个方案，不能直接回旧initial。
- s081确认后局部循环演示、同意后还有共同尾文，证明需要词法退出循环；不能用finishStep或共享返回冒充break。

据此由Root记**premise verified / design agree / build allowed**，仅限下列整体候选：

1. 唯一stages flow；FlowCursor仅stage/completed。content22、SAVE11、compilerVersion3一次切换。
2. `finishStep.next`明确为stay、stage（带stage ID）或complete，仅步骤正文及其结构化子树可用。
   禁入场prepare、shared、物品/技能/敌AI等无步骤根；调用上下文须显式传rootScope，不能拿self判断。
3. `returnScript`返回共享/私有命令根；退役stopScript，不能偷偷终止调用方步骤。
4. confirm直接onYes/onNo，退役commandId结果映射。repeat为正整数固定次数；loop为while/until/forever，
   无隐含worldTick、无巡逻累计寿命上限；breakLoop只退出同命令根的最内层循环。
5. 取消auto每命令100ms及成功激活后的隐含40ms；必要节拍写入正文并合并相邻等待、折叠重复动作。
   无源证明的现作者演出先保持既有偏序/时长，已核四个交接族按P1明确新方案语义改编，不用统一乘常数。
   生命周期/权限等待作为运行器唤醒策略处理，不写成剧情等待，不复活对话冻结全NPC。
6. 零时间预算跨步骤与共享调用，有限CPU让步不冒充游戏时间；Promise、wait0或即时动作不重置预算。
   正常有等待的长期巡逻不因总循环数报错。实际host时间/挂起证据与只让出JS必须区分。
7. finishStep经现有settlement gate及当前lease一次CAS提交并清resume；恢复不重问confirm、不重掷chance。
8. 删除机器作者类型、编辑界面、执行分支、旧游标交接、版本fallback及旧专属夹具；不一对一改名成步骤或私有dispatcher变量。

### 单一写入Owner

- Core：packages/content与packages/reforge的脚本模型、校验/遍历、compiler/runner/continuation/coordinator、
  自动激活调度、保存/恢复及相关测试。main仅自动脚本相关接线；不改战斗公式、移动碰撞、音频/渲染规则或资产。
  统一版本常量及compilerVersion归Core一次修改并通报。可清理本域因本次退役失效的旧专属测试，不删除业务断言。
- Editor：packages/editor全部本次模型消费者及测试，沿用React步骤卡/指令树；不得改Core/Content域。
  包括深层编辑/复制/删除、目标步骤引用、预览/轨迹/资源预取、保存工程、引用快照；不引入节点图。
- Content：projects下当前作者工程/manifest/说明及本次专属内容回归，源只读；按模板整理147机器与普通auto。
  用临时候选重写工具，不恢复原版转换核或新增产品常驻迁移入口。只写author字段及必须的版本，不改资源供应分区。
  专属新测试以pal-unified-steps开头，Core不改这些文件；旧governance历史结构测试退役与新业务断言接替需两Owner协调。
- Root：本卡/母卡/看板/治理文档，scripts/e2e与其它跨包版本引用，独立复核、整仓门、最小UI和真实检查点链。
  同时负责migrate当前消费者与发布基线：等Content冻结后，以现有baselineWrites重建已核作者分区，
  保留地图及资源供应分区hash，验证窄供应核重建/三方合并零差异；不恢复完整原版转换器。
  Root复核发现当前作者脚本已引用旧发布基线没有的端菜精灵sprite-208及两扇门的open姿态，
  另有首批补全的locale。基线须同步这两份既有作者定义，才能独立闭包；不将它们误当供应源分区。
  六角色及其精灵仍由窄供应核重建后逐项相等验证，资源catalog、地图和其它非作者hash保持不变。

所有补丁必须用隔离树绝对路径。每个Owner仅提交自己的路径，Git index提交按Root安排串行；主树仅只读参考。
实现中若发现新的不可表达内容、源行为争议或需要新能力，先停对应包向Root报告，不擅自补全局变量/兼容模式。

本轮中断后接续由core_finish、editor_finish、content_finish分别继承原文件域；此前未提交改动保留，
没有并行旧Owner。Root继续独占runtime-shell/project.ts、project-loader.test.ts、runtime-project-view.test.ts、
startup-entry.test.ts四个版本夹具；Content独占pal-unified-steps前缀的新内容回归。

### 随机姿态循环的词法重试

Root、Core与Content各自直接读s112/e2109/default：现3段只是帧0–3、帧4、回帧3的随机动画，
初段内层until中stop必须放弃当前姿态段尾部并重试该段；finishStep stay会回整动画开头，
最近break会错误执行尾文，returnScript也不能返回一个不存在的成功标记。前4个相似单步声音方案可直接finishStep stay，
不因此增加新层；此例证明外层循环重试的真实需要。

新增精确准入：loop/repeat可选稳定id与可读label；continueLoop可选loop引用，省略指最近循环，
有值只允许命中同一命令根内的词法祖先。禁止数字depth、任意goto、跨shared根或私有分派变量。
breakLoop仍只退出最近循环。只对真正需要被内层引用的重试循环命名，不给所有循环强加技术标识。
while继续前测、until继续后测、forever重进正文、repeat进入下一次迭代；不额外重掷chance、不重置零时间预算。
同根重复id和非法祖先目标应拒绝；编辑器复制/移动/撤销同步保全命名循环引用，界面选择可读循环名。
断言必须覆盖内层不吞外层continue、跨根拒绝、取消/续跑与随机次数/时刻。

### 集成复核发现的同族遗漏

- 自隐藏后结算：旧runCommands在执行命令后直接等待compiler的after，不重新进入生命周期门；
  机械展开为setEntityState(self,0)、wait、finishStep后，wait会被不可见实体的自动执行门暂停。
  Core保持真实叶指令门；Content全族查新添的纯结束尾等待，删除无后续作用的等待，不前移到隐藏前，
  不改隐藏时刻。真实作者等待、仍有后续副作用的分支不能按此规则删除。另列oracle时长差异及主壳存读回归。
- s091/e1682探监费：Root独立读取原始提取all.json:100445–100590。15383询问，确认后0x1E
  的-300/15398表示余额不足跳到拒绝共用段；该段end advance后复读dlg.5350。付费成功复读dlg.5342。
  当前旧机器及首版步骤候选都在余额不足文案后错误落入扣费和成功后继，属于此前付款族未覆盖的漏结束。
  本批修为不足与拒绝同后继、够钱才扣300；不是改变已核剧情。Core覆盖0/299/300/301、拒绝、复读与存读，
  Content只改该已核失败分支并给予可读名称。原版数据已直接给出分支，不以SDL参考推断原版执行。

## 先前只读分工

- Core reviewer：核最小步骤内结束/条件后继、对称确认、固定次数循环、执行与取消/保存作用域，给公共接口建议和反例。只读。
- Content reviewer：按147机器与外部交接族核可结构化程度、必要动作能力及现有普通auto节拍影响；交真实例子与阻塞项。只读。
- Editor reviewer：核编辑、预览、引用、验证、保存格式及版本切换影响面；不得通过隐藏UI保留旧作者模型。只读。
- Root：独立读一手锚点、核产品取舍、确定单一文件Owner及实现顺序，维护卡/看板，执行质量门与整体验收。

schema/runtime/editor/当前内容必须在同一canonical候选中完成切换，
删除旧作者类型/旧入口/旧版本分支/专属兼容夹具；不能把未完成的双模型作为交付。不可逆或新的产品取舍交用户。

## 上下文与验收要求

- [二阶段铁律](../../phase2/READ-FIRST.md)、[协作协议](../../../AGENTS.md)、[工作流](../agent-workflow.md)。
- [统一步骤后续方案](../../testing/script-governance/unified-steps-plan.md)、[机器全量分类](../../testing/script-governance/machine-census.json)。
- [当前检查点](../../testing/script-governance/current-checkpoints.md)与[SAVE10作者组织修复](SCRIPT-AUTHOR-2-readable-inn-choreography.md)。
- 编排保持目标点与速度优先，不将每次转弯拆成跨激活步骤，不为此次任务引入parallel/join。
- 实际compiler/runner/ProjectRuntime覆盖条件与确认分支、循环、取消、自切绑定、共享返回和后台保存恢复。
- 内容与时序反例须核完整动作/等待/条件求值偏序，不只核末位置；保护001至005已验观感。
- 全仓lint、格式、typecheck零error/warning/info，不放宽规则。界面沿用既有步骤列表与指令树，最小真实浏览器核验。
- 候选整批冻结后再决定需要重建哪些真实前驱，不改档、不手改digest、不逐小改反复重播。

## 下一位Agent提示词

本轮内部已按上文委派，无需用户转发。只允许整体候选内各自文件域的实现，不能把未完成双模型合入main或标记done。
用户本轮确认6012没有未保存改动，允许候选验证后更新，服务和页面保留。

## 独立验收记录

2026-10-03 Root已独立复核执行器、保存结算、词法循环范围、编辑器引用与深层保存消费者。
147个旧机器hash、294个场景非脚本字段及10个共享调用者的历史hash均直接对Git1b3bffb79重算相符。
作者内容冻结hash为10f2c0528fa2ee4424ae18ab56e6b2f618b830e655bf501ebd5a0698666af93c；
全部1329个自动方案只有一个步骤，具体时序、四交接族与尾等待例外见[内容证据](../../testing/script-governance/unified-steps-evidence.md)。

质量验收采用完整组合证据：Content1256；Reforge全包7600，随后Content专属回归增至5480由Root独立复跑；
Editor3811；Migrate453；Game2773；Extractor357；Shared128。Migrate全包曾有作者商店引用在生成分区提前检查的失败，
Root修正为生成处只核源货单/炼丹，作者引用在merge后的完整闭包验证；相关4项出版回归最终通过。
Root另独立复跑8个高风险脚本文件，因并行冷启动出现一次主壳测试5秒超时，单文件24项5.84秒全绿，
原失败日志保留，不改产品或重试逻辑。7包typecheck及全仓Biome2798文件零error/warning/info，diff检查通过。

最小实际界面通过：6014的s003/e56单步骤卡、紧邻标题的数量/帮助、地图路线、可读方案切换指令、
选步骤2播放仅出现“别怠慢了客人”，finishStep表单只有可读下次去向；没有保存预览改动到作者工程。
001–005新SAVE11链均passed，Root重算报告输入hash、原档及恢复世界；004/005含真实中途与后台续跑恢复。
旧SAVE10档和旧回执保持历史，不手改版本或digest。当前仍在收整回执/主树集成，尚未宣布done。

旧版本兼容审查pass：当前产品没有machine作者类型、状态游标、handoff、旧结束命令或版本fallback。
敌AI召唤结果图和宿主既有世界拍服务不属于作者机器，不因名称相似误删。未用世界拍服务未被compiler/runner调用，
不能生成隐含作者等待。后期剧情的视觉与命名继续随E2E推进，不用本批有限模型轨迹声称全游戏观感已验。
