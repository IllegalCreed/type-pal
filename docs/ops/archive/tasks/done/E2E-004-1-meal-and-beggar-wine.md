# E2E-004-1 - 端菜与使用桂花酒赠道士

Status: done
Phase: ops
Capability: E2E-R4-1 / W1
Coding Owner: entity_names（显式NPC调用/作者内容）；Root（旧003合同/接收）；e2e004_runner（新004工具），各文件单一Owner
Generation Owner: N/A
Reviewer: Codex 独立验收
Visual Verification Owner: Codex
Visual Verification Timing: mixed
Contributor: Codex 子 Agent；e2e004_phase1_premise独立只读核验
Branch: codex/e2e-004（Root接收）；贡献者独立分支见准入增量

## 2026-10-02清账收口（当前结论）

`e5b432685`后的产品和`9a488c02`六case均已独立接收；用户最新连续演示后明确“非常好”。厨房姿态、NPC归属与耗酒/存读反控闭合。
本轮按用户“先清当前边角再继续005”授权核既定范围与证据，Codex技术accept并归档。
除004上述明确认可外，不补写用户逐项体验签名；下文旧pending/返工/提示保留为过程记录，非当前阻塞。
本次不重跑未变剧情来重复取证。原声录像由E2E-CAPTURE-1承接；全量Q1/Q2、后期命名和发布素材库未因此完成。
无下一位Agent提示词，本卡已收口；[清账母卡](../../../tasks/PRE-005-DEBT-1-current-edge-closeout.md)继续当前未完事项。

## 用户演示返工（2026-10-02）

用户拒绝正常演示插入取消/错误use/存读，且发现道士尾部消失不连贯，明确要求比较第一阶段。
上一轮技术verify与报告保留，不代表此观感已验收；按[E2E-004-2](E2E-004-2-continuous-story-and-presentation-clock.md)
拆正常流程与专项、核实并修主壳混钟，不先改作者wait。此返工现已独立技术accept：六case实测、一期尾段对照及
全仓10971测试/七包types/lint2760零诊断通过，转review等待用户连续观感；原通过/失败证据保留，6012保持。

## 当前技术接收（2026-10-02，覆盖下文旧施工快照）

- NPC归属裁决已落实：`runEntityTrigger`同一前台链await目标当前trigger/游标，桂花酒私有use仅四条守卫/选方案/调用；
  唯一完整25行正文与扣酒仍在s003/e62。auto/prepare、busy/递归、异session、副作用和游标提交反控已闭合。
  aa候选两项Root独立红日志保留；078窄修后两反控及相邻123项绿，独立只读审查accept。
- 编辑器同项目runtime scratch真实播放完整PAL NPC/caller；跨场景绑定只读解析，暂停/单步/停止可用，作者树零写回。
  名称/表单/重点摘要/动态调用轨迹边界已接入；74相邻与16外观preview回归绿。
- 46362585f作者内容、c6bf58dd9真实主壳5项集成已独立接收：e19空姿态auto退役，慢读朝下后显式返朝上；
  喝酒前禁道士auto，持久appearance保存端菜208且送完恢复普通外观。真实菜单/手动菜单保存/fresh恢复皆通过。
  Root重构批准的六项非label差异并全树deepEqual，证明其余正文/动作/节拍/去向未改；8个经过对象及方案/步骤补名。
- 当前Root正式RF002→003→004 passed，004冻结e5b432685，真实003档SHA3f5f74b9…；
  40正文/400来源/3fresh上下文、取消/失败/静止成功dispatch、唯一耗酒/完整收尾/真实移动/存读World与Canvas均通过。
  Root逐项核原字节和截图，详见[完整收据](../../../../testing/e2e-004.md)。不与历史game报告拼成同revision both。
- Root追加白名单：`project-reference.pal.test.ts`仅修当前内容的精确golden及真实语义见证；总entityAddress38111不变，
  e20→e19新转向引用、e19auto退役、两处持久appearance与net+1正文均显式核。规则/预算/边界未放宽。
  `004-final-frozen-quality.log`全仓check七包10957测试与所有types、docs/工具门绿，lint2757文件0/0/0；
  后续仅新meal工具最终126项及完整lint另核。两旧全仓引用fixture失败保留，不追溯改成passed。
- 第一阶段历史game004完整候选4e1a5ab79已独立accept；当前新工具重跑失败只作诊断：真实保存克隆时机、
  正常touch边界与当前导航采样待窄修，不改产品/作者/旧001–003，不放行任意切场/伪造落步。
  Root已复读2ad222444并接为3ba3708df：正常ready held步不读取整份traceRPC，异常边界先up再证明本leg普通落步，
  两实际热路径反控双红→绿、Root完整工具124项和lint0/0/0；05-33重跑五个导航leg正常结束，
  送菜入口自然触发先隐藏e15后读取active footprint的竞态仍待窄修，旧失败留存。
  6ac574406严格本leg e15真实hide提交＋后续party IP＋当前scene2/owner15/IP服务闭包后转完整13行验收。
  正式game004 05-39-02-763Z passed；Root逐项复算401源/三trace/两档与两次F5真实clone输入/恰好一条成功ack，
  World/Canvas fresh相等，40正文及正常菜单/站位/唯一耗酒/最后真实移动通过，必要两图已看。
  最后cursor/trace/footprint夹缝由fd377664d（Root89bc9b5e5）同DOM快照窄修：active直接用冻结足迹，
  inactive才核严格marker；不改产品或该冻结回执。Root复读两文件、独立126工具/完整lint0/0/0，
  用已复算真实05-39 trace回放入口正例及active零夹层RPC；此回放不是新E2E，fd也不冒称另跑完整剧情。
- 用户再次确认6012无草稿、允许更新；Root先核保存禁用，main安全ff到c46a458d2，原服务PID88523与Chrome页保持。
  仅正常刷新一次，再选e62交互方案“赠桂花酒：约定山神庙学剑”；实际播放到首句后reset，页面就绪、保存仍禁用，
  main除用户原有`.zcodeignore`无脏改。截图`main/build/e2e/004-editor-delivery/6012-npc-owned-gift.png`已目视核。
  当前产品技术验证、工具增量接收与6012最小交付完成：Codex独立accept，转review等待用户体验，
  capture另排，不宣称done或同revision both汇总通过。贡献者已停止写入，原失败及冻结报告全部保留。

### 用户最小体验复验（无需代跑技术测试）

6012原页面已停在s003/e62醉酒道士→交互脚本→“赠桂花酒：约定山神庙学剑”。
1. 看方案与唯一完整步骤卡：名称应说明赠酒、约剑及回应喊话；不多出空步骤，正文仍在NPC而不是道具。
2. 如需看观感，点上方播放、逐句确认；喝酒/消失/大娘喊话完整，重置后就绪，不出现跨场景绑定错误或新增草稿。
3. 名称与脚本可读性由用户判断；普通物品菜单取消/错误位置/有效使用及存读已由Root实测，无需用户重复001–003。

无下一位Agent提示词：贡献者交付由Root直接接收，不需用户转交固定审查席；待用户体验验收，capture另排。

## 当前裁决与停止线（2026-10-02）

用户明确：使用桂花酒应触发绑定在醉道士身上的剧情方案；开发者在NPC身上找剧情，且须能在场景内预览。
因此撤销下文旧准入中“将成功正文内联到272私有use、删除NPC赠酒方案”的设计及对应实现授权。
旧签字和准入保留为历史，不再授权该内容写入；暂停期间主树未搬移正文，下方修订准入取代旧内联设计。

- 当前目标：完整赠酒正文仍归s003/e62的“赠桂花酒：约定山神庙学剑”方案；物品仅检查使用条件并显式发起执行。
- 正文不得复制到物品/共享脚本；不用额外玩家移动、全局touch轮询或调试后门补启动。
- 基线只有切换绑定，没有作者可用的可靠立即执行入口；本轮已核既有runEntityBehavior及其活动/取消边界，
  下面登记最窄显式调用准入，不用已撤销的“无需runtime/schema变更”设计覆盖新范围。
- e19无用姿态循环、持久端菜外观的已核事实仍有效，按修订准入恢复作者回归和施工。
- 独立工具Owner可继续第一阶段正常输入诊断及回执修正；Reforge正式004等待当前作者/调用能力冻结。

下一位Agent提示：内容Owner保留旧红日志并修订测试，不reset/删除、不执行旧内联；按下方修订白名单施工，
Root独立核同一候选并接收。6012服务和用户页面继续保持。

本轮只读桥核验（不是新build准入）：runtime-script-project.ts:290已能运行实体当前绑定的trigger，
但作者词表没有立即调用指令；coordinator的实体/通道单活动键会拒绝重复进入，调用方不得吞false冒充执行成功。
子链必须继承同一AbortSignal/activity lineage，不新建控制器；否则遇到已关闭save gate可能等待自己。
编辑器playback.ts:350/439当前直接构造scratch host/runner，只补主壳入口不能证明场景预览可执行新调用。
auto没有前台输入所有权，不能仅凭父lease直接发起前台剧情；本段需求仅interactive调用，不默认扩张auto能力。
main.ts:1195旧inline helper的return Promise/finally会提早释放owner标记；新桥不得直接继承该错误栈语义。
这些是对新能力边界的核验，不授权顺带改写无关追逐/保存/输入机制。

## 修订准入：显式执行NPC当前交互方案（2026-10-02）

用户再次要求继续推进，NPC正文归属/场景预览已明确，无待问产品选择。Root已直接读以下调用域并核独立反例。

| 维度 | 当前事实与目标 |
| --- | --- |
| 原始/第一阶段UX参考 | item272正常场景use守卫面对e62，再启动L650；原始39648/39649字节、game/menu-driver.ts:704及event-system.ts:3344。独立game004正常菜单静止use已交候选回执，尚待Root接收。 |
| 当前二阶段 | items272只select/touch，main.ts:3848新touch仅playerMoved；runEntityBehavior已复用目标trigger游标/self/lease。coordinator:600单owner拒绝busy；lineage:20按exact host/signal登记父活动。 |
| 作者与预览 | author-script-core.ts:191/273没有立即调用；editor/playback.ts:350/439直接scratch host/runner，须真实接入调用，不能仅目录有条目。 |
| 目标 | 普通新leaf runEntityTrigger(target)，同一前台链立即await目标当前trigger/current cursor；正文留e62，item只守卫→select→run。不是新方案/步骤层级，不模拟玩家按互动键。 |

合同已收窄，作为实现/独立反控要求：

- 仅interactive可用；auto直接或经shared编译/执行都明确拒绝，scene-entry prepare禁止。不新增auto抢前台调度。
- 不切绑定/重置游标，不检查自然touch/interact距离；作者条件决定能否调用。无绑定/disabled/completed明确no-op；
  missing、异当前场景、异session、永久removed明确失败。允许存在实体的隐藏/临时生命周期下纯显式调用，
  不把它当玩家自然交互；目标自身隐藏后仍完成对白尾段。004面对条件已检查可见性。
- 当前调用域限定同scene-session：子链直接/经shared/嵌套的loadScene、loadLastSave、quitToTitle等替换scene/world操作
  在副作用前明确拒绝，目录说明“切场在调用返回后编排”；外部session替换则AbortError终止子与父尾。
  不改普通根trigger/shared既有切场语义，不为004开发区分主动/外部切场的新世界控制协议。
- 该限定还包括gameOver，以及非leaf的teleportOut/startBattle（会新建hook/onDefeated runner），均在原命令副作用前拒绝；
  不顺带禁同场摆位/外观/物品。chase经shared改self后可隐式进入其他trigger，故禁令与观察hooks按同runtime/exact signal
  的活跃调用scope继承到所有新runner，finally清理；只传最初子runner options不算完成。beforeStep后还有gate await，
  最终同步派发点再次核session/signal，放行同ID异session的旧副作用是counter。
- busy、同目标重入、A→B→A必须错误并中止调用者尾段，不能把false全当成功或等待自己；无绑定/完成与busy不得混淆。
- 使用同一AbortSignal、host/coordinator与activity lineage；子self为目标、返回父self不变；子stop只结束子，abort向父传播，
  finally释放owner/lease。父save gate关闭未ready时允许同lineage子链，完整结束前不可假ready；不新增存档执行栈/兼容分支。
- 主壳追逐self识别实际活跃子trigger，不能再次租自己的owner。旧inline helper必要的return await修复在白名单内，
  不扩张追逐/自动调度/保存政策。目标选中行为和步骤的持久权仍在现有coordinator。
- 编辑器scratch用同一运行桥，真实执行子链；暂停/单步/停止与错误不能被日志桩替代，作者树零写回。
  Root直接核现行e62末尾跨场景select s001/e19，而旧preview resolver仅当前scene会在207/209前报错；
  追加SceneScriptWorkspace.tsx传现有props.state.scenes只读定义给scratch，仅解析跨场景绑定，不载其它地图/视觉切场。
  未提供scene仍明确失败，不伪造空实体；实际PAL完整gift scratch需走到207/209并核作者树未改。
  移动轨迹遇到无法静态确定的目标当前方案，显示调用边界并使后续起点unknown，不能画假连接。
- 作者目录/默认命令/地址表单/中文重点摘要齐全，名称为“执行实体交互方案”，说明“等执行完成后继续”。
  现有精确EntityAddress引用collector可复用，补缺目标/重命名/复制/删除反控，不扩张共享collector猜字段。

最强替代解释：桥只有主壳可跑而预览不支持、同owner被静默截断、auto借lease误抢前台、fork signal/save自死锁。
推翻条件：静止正常use仍需落步、任何上述反控不拒绝/不释放、父尾在子完成前执行、正文不在NPC或预览修改作者树。
Root premise verified / design agree / build allowed：独立审计的条件性counter按上述合同逐项转成硬验收，并非忽略counter。

### 修订单一Owner白名单

- entity_names（codex/e2e-004-content）：content作者命令类型/形状/auto与prepare门；reforge编译/项目runtime/host桥及
  coordinator最窄只读活跃查询、main子owner识别与inline await；editor命令目录/ScriptEditor表单摘要/preview scratch/轨迹边界，
  各自相邻或新增测试；s001/s003/items已核内容修正和实际剧情命名、pal-meal-author/shell测试。
  禁止save codec/version、整体schema版本/旧兼容、资产供应、全局touch、自动调度、公共配置/规则、其他实体剧情扩张。
  保留旧红日志，修订旧内联回归为NPC所有权；优先先交能力与测试冻结SHA，再交作者内容SHA，均不合main。
- Root：docs/看板/索引、package004命令、scripts/e2e/kitchen-contract.mjs及其test（现行持久取菜表达的严格003交接合同）；
  独立反控另写run-entity-trigger-root.test.ts（仅Root Owner、不与贡献者实现/测试文件重叠）；
  只读独立复核新工具/能力/内容，必要补测另窄授权后才改贡献者文件，最终集中质量门/正式RF002→003→004及6012交付。
- e2e004_runner：已有新meal-*工具交付4e1a5ab7965c1e40262a4677c65a3203d3ef5051停写；必要工具counter窄返工另派。

本轮工具counter追加白名单（只meal-journey/contract及新meal相邻test）：送菜目标改为e15真实108,29，
防入场已在range而未实际落步；WorldState.inventory严格按现行数组读取，删除错误map DTO/兼容；
冻结实际编译/guard/lineage/host源及能力新增helper，不能仅主壳hash声称全调用链冻结。均不改产品/旧001–003工具。

零诊断门保持；测试红→绿、禁重入/异session/auto/shared/save/abort、真实scratch预览、实际main菜单use与持久208回归必须有证据。
尚未实现/未跑的RF项不得报pass；第一阶段回执不外推新引擎。

### 本轮独立接收进度

- 新004工具02b270e77/4e1a5ab79已在Root候选树接收；独立读12源及实际菜单/dispatch只读插桩，无产品/旧001–003越界。
  发现private正文来源fallback后返工ff2b3ac16，Root复读差异并执行107工具测试绿、相关Biome零诊断，旧报告不改。
- game候选4e1a5ab79回执391来源/三trace/两档原字节逐项复算，持久域/Canvas实际相等；两张关键图已看。
  [004证据登记](../../../../testing/e2e-004.md)明确game已核、RF仍未完成，不把两个独立engine报告误称both通过。
- Root严格003交接45570b01f：待取菜正文只接受持久setActorAppearance208，无瞬态兼容分支；结束party与前驱一致、
  无已端菜外观。19回归红→绿、两文件Biome零诊断。新候选作者冻结前不能拿此合同跑旧作者正文并报003绿。
- 用户本轮确认6012没有未保存改动、可更新；Root实际只读页面显示“已保存”、保存按钮禁用，服务PID88523保持。
  更新仍等能力/作者独立验收，不提前覆盖当前工程。
- 原基线RF002/003分别02-56-36-266Z/02-59-13-038Z已正常重建，未改档/使用当前digest；旧入口counter首轮
  reforge-004-stationary-baseline-2026-10-02T03-01-16-800Z停在serve前，是工具已在range就等touch的问题，
  不作为赠酒根因counter。Root另直接读character.ts:30/141和main.ts:836/2670确认库存数组，旧RF计数/map测试是工具错误，
  不是迁移/作者/运行时缺陷。原失败不改写，工具各自红→绿并冻结后再复跑静止入口。
- 工具1cf2e7f07冻结后原基线03-21-56-707Z实际counter成立：正式use站位137,72朝下、e62可见137,73，
  select赠酒/touch已设、2秒静止仍无172且酒数组1；core=counter-confirmed，不是RF004通过。
  Root逐项复算400源与实际trace SHA/错误0，全部材质重物化中间样本保留；两旧failed不改写。
- 能力aa340e033只进入Root隔离候选，不接受/合main：Root读完整实现并复核独立两counter后，
  自写两项真实runtime反控均红（004-invocation-root-counter-red.log）：最后子effect期间换session，目标仍被写completed；
  同signal两个API调用乱序结束清掉仍活跃scope，后者loadScene未拒绝。贡献者只在原白名单窄修cursor提交守卫与scope registration，
  不新增parallel/save结构，需Root红→绿才接收。
- 作者增量追加pal-inn-stairs-target相邻e19旧auto名称断言改静态up/无auto；preview host缺setActorAppearance导致208
  可静默不画，需相邻可视spriteId反控与最窄host增量，不扩张portrait/battle预览系统。
- 能力07816dc52窄返工：coordinator实际cursor commit前同步guard，Set registration与各隐式runner独立生命周期收尾。
  Root保持同两独立反控红→绿（123项含scope/lineage/save相邻），代码复读与独立审计accept；无新存档栈或版本分支。
  Root editor5文件74项含完整NPC/caller PAL preview绿；七包types exit0且无诊断、全仓lint2755文件0/0/0。
- 外观preview f7c749a8b只沿用单角色sprite overlay：portrait/battle不模拟、不改作者数据。
  Root复读两文件并独立16项绿；作者内容包仍待真实main菜单回归/独立接收，不提前外推正式RF004。

## 用户范围（2026-10-02）

用户明确：从拿起酒菜开始，端给苗族跟班，再把桂花酒给醉道士，等该段剧情全部结束并可自由移动就结束。
此前建议“004止于桂花酒收入怀中”未获采用；当前边界包含正常物品使用与完整赠酒后续，不停在拿到酒，也不进入005。

- 前驱：本引擎真实003结束档（厨房交代已结束，尚未拿菜，菜仍在桌上）；只消费当前合法档及来源链。
- 范围：厨房取菜、端菜外观与正常楼梯/客房路线、给苗族跟班送酒菜、桂花酒真实入库存、返回门口、
  正常物品菜单使用、完整对白/喝酒与消失/李大娘远处喊话、恢复控制、真实保存与新上下文读回。
- 不做：去厨房接下买虾任务、出客栈/005、造物品/旗标/档、跳坐标或直接调用物品/剧情函数。
- 两引擎共用语义边界，各自输入/存档/观测；一阶段只作新引擎观感与内容参考，不按内部帧/坐标逐项硬对拍。
- 本卡仅登记已批准范围及待核事项，尚未分派Coding Owner、准入build或实现004 runner。

## 前提真值门（开工前补齐）

一句话前提：004必须通过玩家正常的场景物品使用启动赠酒，而不是交互或测试后门替代。

| 维度 | 已知证据/待核 |
| --- | --- |
| 原始内容 / primary source | 003卡已核取菜L583/服务L565等直接闭包；本批尚待直接核桂花酒使用及赠酒完整原始链。 |
| 第一阶段 | 待核真实物品菜单/面对场景对象使用入口、有效站位、对白与耗酒/恢复控制调用域；不以记忆代替源码。 |
| 当前二阶段 | items.json中272为桂花酒，use.target=scene、consuming=false，私有use脚本核facingEntity(s003/e62,range1)，失败提示后stopScript；有效时选赠酒c8-321c0a7d7de1并启用touch。 |
| 当前后续/目标 | s003/e62赠酒方案包含喝酒/约山神庙/道士隐藏/loseItem272/大娘喊话/逍遥应答，最后complete；实际菜单、触发时序和恢复移动仍待实跑证明。 |

直接作者锚点：s001/e20 trigger/take-dishes；s001/e15 trigger/default送菜长链；
s003/e62 trigger/c8-321c0a7d7de1；items.json id272 use.script(use)。地址比历史行号稳定。
桂花酒不是人物回血类选人道具，按当前位置/朝向判定；物品定义不会自动扣酒，实际loseItem在成功剧情正文，须核恰好一次。

最强替代解释：执行器只按交互也触发了旧绑定、恢复失败落新局或直接runScript造成假通。
反证：必须见正式恢复成功、合法拿菜/入库存、真实菜单选择与场景使用、成功/失败库存差异、实际剧情选择与控制恢复。
任何关键调用域unknown未核时保持draft，不以范围批准代替实现准入。

## 已知风险与脚本合理化

- 003已留counter：取菜将e19转朝下后，其auto/default继续朝上；用慢读至少3秒核实际覆盖，必要时局部接管/归还，
  不恢复全局NPC冻结，不为存档拆步骤。先查原始内容/第一阶段和当前实际调用域，不仅从静态脚本猜观感。
- 道士取姿态与auto禁用先后、喝酒/消失、耗酒和大娘后续方案选择需核真实时序，不机械压缩指令或估时等待。
- 按已批准要求，对实际经过的实体、方案、步骤同步命名；未确认身份/用途问用户，保留稳定ID。
- 作者内容/显示名已改变完整digest；从最近合法前驱正常重建当前链，不修改旧档或放宽版本/来源校验。
- 6012编辑器服务与用户页面保持；更新工程前核无草稿，不借执行器验证关闭它。

## 验收预登记

1. 从本引擎真实003恢复，取菜一次；桌上菜隐藏、端菜外观正确，未提前赠酒或凭空获酒。
2. 正常走楼梯/客房并送给苗族跟班；完整对白，端菜结束恢复普通外观，桂花酒真实入库存，不能重复取得。
3. 正常站到醉道士面前，经正式菜单“物品→使用桂花酒”触发；按实际UI核菜单关闭及前台剧情接管。
4. 错误位置/朝向使用不耗酒、不切赠酒方案/推进；退出菜单不使用；有效使用只执行成功链一次。
5. 不跳对白，核全部喝酒/约定/消失及大娘喊话；控制恢复后正常方向键产生合法位移（不以对话框消失冒充可移动）。
6. 结束仍处于005前，正确库存/外观/道士生命周期/大娘下一方案；正式保存与fresh-context恢复完整持久域与同引擎画面。
7. 状态驱动、有界动作/观测/超时，失败保留现场；无Agent/模型也能独立重跑声明流程。scope/source/checkpoint/收据分别冻结。
8. 必要源/内容/时序回归和硬性静态零诊断；剧情E2E集中实跑留图，菜单功能可最小开发期验证，不反复巡视既有003。

## 上下文锚点

- [第二阶段铁律](../../../../phase2/READ-FIRST.md)、[E2E合同](../../../../testing/e2e.md)、[双阶段路线方案](../../../../testing/e2e-route-proposal.md)。
- [003范围与交接](E2E-003-1-inn-stairs-and-kitchen.md)、[003原始回执](../../../../testing/e2e-003.md)、[保存修复](SAVE-AUTO-CHECKPOINT-1-background-script-snapshots.md)。
- [脚本合理化母卡](../../../tasks/SCRIPT-AUTHOR-2-readable-inn-choreography.md)、[实体命名](EDITOR-ENTITY-NAMES-1-readable-scene-entities.md)。
- [剧情碎片目录](../../../../../projects/pal/e2e-checkpoints/README.md)；当前003 runner只证明未拿菜，不能代替004。
- item-use-executor.ts实际生产入口及原子使用/取消合同、正常物品菜单/场景使用与触发绑定须在build前读到端到端调用点。

## 当前模式推进记录

- 用户已批准004语义边界与物品使用范围；没有新的产品选择待问。
- Premise：部分只读已核，原始/第一阶段物品使用及主壳完整调用域待核；Design/Owner/build准入pending。
- 不修改schema/save/输入门禁或创建测试捷径；不恢复原版完整转换核；不实施剧情修复或宣称004通过。

## 下一位 Agent 提示词

无下一位Agent提示词，本批只记录用户范围。下一轮Codex先完成一手前提和现行003前驱核验，
再分派不重叠的004执行器/内容工作包，维护单一Owner及独立验收；draft状态不得开始产品实现或标done。

## 开工前核验与build准入（2026-10-02，覆盖上述draft历史pending）

Root已直接读原始提取/SSS字节关键项、第一阶段菜单/触碰调用域、二阶段菜单/主壳与当前作者树；未以静态核读冒充实跑。

| 维度 | 本轮直接核验 |
| --- | --- |
| 原始内容 | 取菜L583；送菜实际L469（L565只是厨房复读，纠正历史引用）；use L39647含81[63,1,38780]+25[63,650]，赠酒L650至732，720唯一20[272]扣酒。独立席核49处相关原字节；Root核583/469/720/39648/39649及OBJECT272 flags17（没有consuming）。 |
| 第一阶段 | menu-driver.ts:704–717正常库存use applyToAll跳选人→event-system.ts:3286；:3344清菜单返explore→scene-system触碰扫描启动赠酒。:4543当前场景面对守卫；mode.ts:43–47对话不推进auto只作UX参考，不复制全局冻结。 |
| 当前二阶段 | MenuSession:310–341/480–518→main.ts:4577–4592运行private use；当前只切touch/赠酒方案。main:2866仅投影、4260仅drain既有pending，唯一新touch检测3848依playerMoved，静止use不能可靠启动。e19 auto仅反复up/frame0，已有静态facing up。 |
| 目标 | 正常菜单有效use直接顺序await同一成功剧情，不再等待额外移动；错误面对仍提示不扣酒。唯一成功body归272 private use，不造shared复用/新schema能力/global touch轮询。e19退役pose回写循环，静态初值+取菜对白结束显式up/frame0收尾。 |

独立全作者引用审计：赠酒c8-321c0a7d7de1仅定义+item选择2处，没有第二复用、self/chase/call依赖；
e19 auto仅本页绑定，外部没有auto/页面/动作/移动/外观写，晚剧情仅trigger/显示/隐藏。Root分别读同一调用域与目标。
强反证：基线正常静止use后若无需落步出现172，推翻缺入口判断；候选若仍需移动/重复扣酒/遗漏喊话/不能正常走动则不接收。
错误use的stopScript在当前执行器可正常返回outcome success，故必须以真实菜单dispatch、正文/绑定/库存/生命周期证明赠酒，不能只看success。
取消反控为确认前Esc退出菜单；成功后不引入新回滚或作者pause状态。保持现行前台存档/输入门，不伪造物品或世界。

Root premise verified/design agree；两独立席直接读原始/一阶段、当前完整链后核验或提出上述counter。
修复保持原版/第一阶段体验（使用酒即喝酒、讲话面向逍遥、返做饭朝上），用户已批准004与脚本合理化，无新剧情取舍待问。
Codex build allowed，白名单与单一写入Owner如下；新未知前提/产品选择仍停止线核验。

### 所有权与交付

- entity_names：codex/e2e-004-content，仅s001/s003/items作者JSON、reforge新增pal-meal-author测试及旧pal-inn-kitchen/菜单用途相邻测试。
  内联成功body/删除旧唯一转接、e19静态化、实际内容具名；不改runtime/schema/save/editor/供应核/规则。
- e2e004_runner：codex/e2e-004-runner，仅新增scripts/e2e/meal-*旅程/合同/只读菜单observer/隔离trace/config/反控。
  不改001–003工具、产品或作者JSON；真实menus.view/game menuStack投影冻结DTO，不增可变产品后门。
- Root：接收树codex/e2e-004只写卡/看板/规范、package004命令、执行独立接收/必要质量门/正式冻结后实跑与6012交付。
  未接收前贡献者不得合main/标done，施工不能写Root或另一Owner文件；先红→绿，提交精确SHA后停写。
- 004 route包含e15真实一次性touch送菜，不以直接点随从/调用剧情替代；走路held，菜单按真实cursor/itemId确定按键，不固定连按。
  actor采集扩到e15/e16/e24/e25/e26与e19/e20/e62；真正提交/菜单实绘/dispatch/控制恢复有界，overflow/epoch/来源/像素/超时不放宽。
- pose反控>=3秒需真实host/collector；不靠手写auto模拟或仅命令列表宣布视觉pass。未实跑项登记可执行用例/Owner。

### 最近合法前驱

- RF001主树build/e2e/reforge-001-2026-10-01T14-45-18-085Z passed，真实档
  158d4f59f6b6e04d9855801000059c76913c85432e3a515de98313c3855ab695，SAVE10/content21、无auto resume/behaviors.entities；
  Root与工具席各核实际字节及所有记录source当前无差异，可复用，不重复已通过开场。
- RF旧003含旧digest活动resume，不能改旧档；作者冻结后从上述001正常002→003重建，真正恢复核当前digest/未取菜入口。
- game真实003在e2e-003-runner历史树build/e2e/game-003-2026-10-01T05-41-47-466Z，
  原档67adca00b0a0ed1f1649f65ba5134a4d3f9a49c506b0c670a77840b2b597ad21，第一阶段/原始数据当前hash零差异，可各自复用。
- 正式004必须等作者/工具都冻结再跑；开发diagnostic不冒充最终passed，原红保留。录屏/音轨独立，不由本批技术pass自动成立。

### 端菜外观的现行持久表达（同轮前提增量）

Root与当前审计席直接核：0x65原始写PlayerRoles的精灵持续跨交互；第一阶段真实保存包含该角色状态。
新主壳main.ts:2139–2160的setActorSprite只写actorSpriteOverrides Map，:847/save快照只clone(world)，
abortScript:4410清Map。取菜208直到e15送完才切本体，中间探索/菜单本来能存档，故不宜使用瞬态外观表达剧情持有状态。
现行setActorAppearance（script.ts:152、main.ts:2164–2216）可仅覆写spriteId，写CharacterInstance.appearance随world保存，
已有正常预载/恢复链，不需新增schema/save字段或版本。

- build白名单增量：作者Owner将取菜→送完的两条外观写改为现行持久appearance(208→li-xiaoyao)，其他维度不写；
  原帧/对白/路径不因此改动。实际中途保存/新上下文读回仍保持端菜，送完当前和读回均普通本体，作为本段反控。
- 可证伪：基线中途F5/fresh恢复若仍渲染208且角色外观有真实持久数据，则推翻Map丢失判断；
  候选若丢餐盘、持久旧208、影响portrait/battleSprite或写静态actor表，则不接收。
- Owner仍只内容与相邻/新增真实主壳回归；禁止动save codec、runtime实现或增加兼容恢复。这是已支持能力的正确内容使用，
  保持一阶段跨交互端菜/存读观感，没有新剧情或产品取舍待问。

### 当前交接提示

准入增量替代draft提示：贡献者在Root提供的独立worktree按本卡白名单实施、自验提交/停写，给精确代码/测试/风险；
Root独立读源/反控/实际执行后决定接收，源域扩张或产品取舍先报告，不依赖固定三签或用户搬运意见。
