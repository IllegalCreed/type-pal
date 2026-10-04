# SCRIPT-GOV-1 剧本共性问题族治理

Status: done
Phase: phase2
Capability: W7 / P3
Coding Owner: 分包独占，见下文
Reviewer: Codex Root
Generation Owner: N/A
Visual Verification Owner: Codex
Visual Verification Timing: e2e-deferred
Branch: main

## 用户目标与本批范围

用户要求共性问题批量治理，而不是随E2E逐NPC救火；作者模型统一方案→步骤→指令，
不保留并列的“连续流程/高级状态”作为长期作者界面。当前开始首批治理，不推进006。
母依据：[001–005共性回顾](../../../../testing/e2e/cross-stage/common-issues.md)。

首批先建立全量问题族清单，并修复源映射可靠的动态入口后继缺失、重复奖励；
同时给165个复杂flow分类，核可以用现有步骤/指令折叠的机械链，不把状态数量直接当bug数量。
保护已验001–005场景s000–s005、既有存档原字节和用户6012；不恢复全量转换核，不全局替换wait，
不把循环次数上限当时间，不为过门改规则或手工改checkpoint digest。

## 前提真值门

| 维度 | 当前已核证据 |
| --- | --- |
| 原版输入 | 本机all.json L2018给药后advance，L3383两段交谈后reset，L5076多帧auto续跑；0x24/25为动态安装边。原始提取只读。 |
| 第一阶段 | event-system.ts:1276–1288保留advance/reset游标，:1342–1348 auto按tick等待；场景探索100ms，goto.frameDelay为计数不是时间。 |
| 二阶段当前 | s010/e191/legacy-001仅给物品107且复读；s008/e180/legacy-001仅前段；s020/e343/auto/legacy-001仅frame3后完成。SCRIPT-GOV首批需逐绑定再核。 |
| 历史转换根因 | Git63aafb81c translate-events.ts:354–430动态注册只存首段body，:1956安装入口走该路径；缓存key不含refKind，旧573/111不是全量安装边分母。 |
| 用户目标 | 原有剧情和副作用正确，表达用普通步骤及指令；同类一次治理有可追溯的已修/无问题/待核清单，不引入原版怪癖调度。 |

最强反例：后继正文在另一个NPC里存在，实际被安装方案仍重复首段；只凭相似台词/legacy编号无法证明映射。
必须核caller→真实owner/channel→target→当前selection→下一次cursor；有多义或作者已改写时保留unknown。
先排除runtime语义/原版理解/提取地址/审计模型四类替代根因，不能因大批命中直接写盘。

## 分包与推进门

- Census Owner：独占新增`scripts/script-governance/**`及`docs/testing/archive/legacy/batches/script-governance/`专属机器台账。
  draft允许只读普查工具和其反控；没有工程写盘、转换或发布入口。不能靠恢复执行旧转换核补映射。
- Motion reviewer：只读分类现有machine与外部handoff，直接核compiler/runner节拍；先交可批量转换类别和反例，
  不改schema、runtime、JSON或编辑器。候选分类不是删除165机器的build授权。
- Content Owner：待Root核定首批精确白名单、旧子树hash、每个后继及名称后再build，不先修改作者工程。
- Root：任务卡/看板/回执，独立核mapping与修复、静态零诊断和必要整批验证、一次冻结后统一处理checkpoint。

## 上下文与验收

- [CLAUDE](../../../../../CLAUDE.md)、[二阶段纪律](../../../../phase2/READ-FIRST.md)、[工作流](../../../agent-workflow.md)。
- [作者步骤治理](../../../tasks/SCRIPT-AUTHOR-2-readable-inn-choreography.md)、[005收据](../../../../testing/e2e/stages/005-shrimp/report.md)。
- `pal-errand-author.test.ts`使用真实compiler/runner验证连续激活，不能用手写解释器模拟新语义。
- census反控：缓存去重漏调用边、self/0清绑定、多owner、相似对白错误匹配、作者修改、未知指令等须拒绝假确定。
- 内容修复：连续激活/一次性奖励/循环复读/完成/取消与合法存读，原正文和非白名单字段保全。
- 机械链：核有效可达图、外部state引用、transition cadence、动作/姿态/速度、终止/循环等，再决定普通步骤表达。
- 修复按整批冻结，集中登记代表E2E入口与预期，不逐站启动浏览器；本轮不录视频、不停6012。

## 当前状态

2026-10-03追加：统一步骤子卡已独立验收集成，147套旧作者机器全部退役，当前content22 / SAVE11，
001–005前驱链已刷新。母卡继续未证动态入口映射与后期剧情合理化；以下2026-10-02首批准入/签字保留历史范围，
不再据“剩147套”推断当前产品仍有机器。详见[SCRIPT-GOV-2](SCRIPT-GOV-2-unified-author-steps.md)。

2026-10-02：用户批准开始治理并确认6012没有未保存草稿。以下已核小批获准build；其它候选仍只读取证。
审计脚本不写作者工程，主工程仅在整批验证后更新，服务和页面保留。

### 首批精确准入

Root与successor贡献者分别核原L2018/2024→2025、L3383/3386→3387→reset3383，
原0x74为非满HP跳转（game event-system.ts:4309）。**Content build allowed**：
Owner script_successor_repair独占s008/e180/trigger/legacy-001、s010/e191/trigger/legacy-001，
locale仅新增缺少的dlg.719与dlg.1245，以及新增pal-script-successor-governance.test.ts。
洪大夫初次给药后，后续须分伤者治疗/康健购药，治疗不得继续落入商店；老王两个步骤往复，不能只补一次尾句。
旧behavior哈希分别8a6166eae128b309f985f5d2600ffab4fd6666eeb2a35872ec7d24ba7344fe6d、
0ac7b72a839bc82ec54e9af3e434af3220d6ab4e23cb6318ea209e7211f6ef7c。
同文件default/legacy-003有已读出的治疗分支fallthrough风险，另补源绑定/反控后核准，不先越界。

Motion独立全量分类165=88 perCommand+77 transition；机械flatten不能改变auto每命令100ms与transition同拍语义。
Root已读真实runStateMachine确认interactive continue不提交中间存档游标，尾restart是下次激活回初始。
6个无外部handoff端点、全部节点构成continue链且尾restart的interactive方案获**结构批次build allowed**：
s231/onEnter/default、s249/e4394、s250/e4411、s257/e4550、s277/e4736、s285/e4807（后五均trigger/default）。
Owner script_motion_audit独占这6个scene JSON与新增pal-linear-script-governance.test.ts；
沿真实边顺序拼正文、保留唯一初始entry、保留初始ID、一步省略next以重复。其他字段和命令逐项不变。
须补真实compiler/runner及ProjectRuntime的分支/连续激活/切场取消/中断/自切绑定反控；不能仅凭叶trace相同收口。
其他159机器、schema/runtime/editor、本轮保护场景暂不开放写入。两内容Owner按文件不交叉，locale只归successor Owner。

### 后继批次扩展准入

2026-10-02 Root独立读取原all.json、当前caller安装指令和各被安装方案；Content Owner先交真实运行器失败反控。
后继批次增至16套：原2套之外，新增s008/e177/legacy-001、legacy-002，s008/e176/legacy-004，
s020/e342、s035/e591、s050/e844、s049/e813、s049/e811、s051/e883、s097/e1782、s093/e1740、
s108/e1998、s100/e1812、s234/e4212（未注明均trigger/legacy-001）。
源入口依次为2158、2461、3254、4778、9124、11053、11061、11079、11087、14055、14331、19199、19865、32326。
除s097古董商两步回环、s108婢女三步外，追加的纯对白均进入稳定复读的末步；原首段正文、绑定ID、初始ID保留。
逐项旧hash、完整后继原地址、caller路径及新名称必须落入审查回执。新增locale仅补缺项，不覆盖已有不同文案。

同文件s010/e191/default与legacy-003另获准将健康分支移动到branch.else，保留原治疗和健康命令，
防止治疗后继续说健康台词或开商店。旧hash分别178fa217c49e15c1de6d81432f50fb13082b307927782c00c60333f10d1c655e、
e022d7dd303e186d32d21d996ab31b2ff36a60957a867143e58d20b4ff68b716；源2003→2008、3308→3320为互斥分支。

治疗呈现也查出完整真值链：原2013/3326 fadeOut后2014/3327的0x05重画会恢复画面，
第一阶段event-system.ts:2424–2465明确触发600ms淡入；当前main.ts:1922及1967的clearDialog只清框，
hostFade保留FadeDriver最终值，正常trigger finally不恢复亮度。
因此这三条已核治疗分支须在clearDialog后显式fade in600再说末句，不把旧隐式耦合加入runtime。
必须补真实FadeDriver的末句/结束亮度与取消反控。其余淡出风险只登记，不自动批改。

s084/e1599、e1600、e1601的候选不修改：原14995–14997和当前正文已显式切到legacy-002，
该方案含14999后继；真实ProjectRuntime及SAVE10反控证明下一次不会重复让路。归类已核无问题。

同轮最后扩入s132/e2313/trigger/legacy-001与s174/e2875/trigger/legacy-003，后继批次共18套后冻结。
Root独立核20013→reset15923→end15926、28551→advance28606→end28613及两当前caller；
旧hash分别ae36a3b498588e6d1f0125ec8c38e7565a8b3d26734b3142847a6a32cfffd9ef、
6dbc5e48e87bf90d4f3e50280e9e8d69c85c0b3b211129ed2065629013097a32。
前者caller在s100/e1825机器内部，测试仍须核真实安装指令，不得为了便捷跳过该绑定。

### 结构批次交付记录

Motion提交8656dd029：6套39状态转为6个普通单步骤，机器165→159；18项新增测试与74项相关测试自验通过，
Root独立复跑18项通过，正在核全部正文及非白名单保全。台账包含165方案全量分类、18条handoff和32个端点；
仅initial遍历会漏27状态，必须合并handoff目标后判可达，不能当死代码删除。
本包发生一次相对apply_patch路径误写主树6个flow，已逐对象证明仅自身改动后精确反向恢复，未reset/checkout。
Root随后独立检查主树仅用户.zcodeignore未跟踪；后续补丁使用绝对路径。候选测试不算已更新6012。

### 确认分支结构批次准入

Root独立读取12套当前graph及script-runner-core.ts:256–406、548–557：步骤内stopScript结束本次激活且不推进，
因此否定分支可在confirm.onNo中顺序执行原正文后结束；同意分支继续正文，最后用普通Stage.next进入后继。
不抽成callScript，因子调用中的stop作用域不同。保持真正跨激活的初始与后续ID、全部cue/效果/显式等待。
以下12套trigger方案获Motion结构build allowed：s023/e437/default、s050/e845/default、s050/e846/default、
s084/e1583/legacy-001、s084/e1584/legacy-001、s100/e1837/default、s111/e2085/default、s127/e2224/default、
s009/e188/default、s100/e1817/default、s100/e1825/default、s148/e2433/default。
相交的s050/s100文件须等successor Owner提交释放后再改，不能并写。新增测试、原hash及反控随Motion交付。
此批连同前6套构成18套结构候选，随后整批冻结，不继续增加第三结构批。

s023/e433被排除：相似售药尾段的完整cue并不相同，一段top、一段缺省bottom，不能只因同台词合并。
结构候选中另发现购买脚本的余额不足分支fallthrough、s023确认前扣钱，以及s100/s148淡出未恢复风险。
本批结构等价不授权这些行为变更，也不证明这些剧情正确；下一族须核源条件跳转和副作用，不能漏登记。

### 余额不足分支族追加准入

独立核证后，8绑定的不足余额尾部串行与医生分支错误同型，本轮一并闭合。
Root直接读取L7567、11017、14581、17179、16220、17723/17785完整原跳转，
第一阶段event-system.ts:3673–3685不足时不扣款且跳失败分支，当前main.ts:2312–2314的giveMoney只钳制余额，
script-runner-core.ts:534–544的branch执行完仍继续。原因是作者控制流缺少结束，不是通用加钱函数错误。
八条准入为s023/e437/default、s050/e845与e846/default、s084/e1583与e1584/legacy-001、
s111/e2085/default、s127/e2224/default、s100/e1825/default的收费后续步；全为trigger。
不足分支补明确结束，不能扣钱、发物品、启动放行或选中小莲儿方案，也不能推进到成功后续。

用户于本轮明确批准产品调整：s023原L7568扣20文在L7569确认之前，取消仍扣钱确为原行为，
此次主动改成“先确认，余额足够才扣钱并交付”。不是把原有行为误报为迁移缺陷。
其余七处保持原已核内容/收费顺序，只修不足分支不再落入成功尾部；酒馆原无不足提示，不凭空新增对白。

Owner successor独占上述scene精确方案、新payment测试和payment-repairs.json；Motion只负责已有confirm结构测试
与机器台账的授权语义差异核验，不修改scene。历史结构等价证据原样保留，语义修复后须明确以纠正后的基准验证，
不能静默刷新历史SHA或删除反控。拒绝、不足、恰好足够和有余款、连续激活、SAVE10恢复均走实际ProjectRuntime。
Root核过后整批冻结，后续新问题只登记。

### 整批冻结前独立复核

后继20a0ce2e9、确认结构6c3e1fbe3、支付d7eaac763与结构反控适配b92f4fc91已交付。
Root独立重算18后继前后/源段/首段hash，核14场景只20准入behavior及实体label变更，28新增locale逐字对应原输入，
原locale全保留；12确认结构逐对象对20a0ce2e9只flow变化，48状态→18步骤。
支付8绑定逐一逆向核只有授权不足stop与s023确认前移，6场景其它内容保全；没有实现层改动。
两批结构合计18机器/87状态→24普通步骤，当前147机器/5490状态；剩余能力设计见
[统一步骤后续方案](../../../../testing/archive/legacy/batches/script-governance/unified-steps-plan.md)，不误报为全模型已退役。

Root早次114项合跑有8个失败，为新增固定步骤名称尚未同步到结构对照期望；保留失败日志，
后续按明确字面标签核准，没有忽略metadata或更改原历史SHA。最终114项由Root再跑后记整批质量门。
作者工程检查第一次拒绝隔离素材符号链接逃逸，是安全门正常生效；用APFS写时复制的本地素材后，
294场景/223地图/1934资源检查通过，没有放宽路径规则。两份原日志均保留。

旧001原档没有auto.resume，经当前生产preflight与现行002前驱合同通过，可原字节继续。
旧002至005分别有1、2、1、19个全局digest续跑点，不能在新内容上继续冒称有效。
冻结后仅从旧001重建二阶段002→003→004 saves→005 saves，不重播视频或第一阶段，不修改旧档/指纹。

### 首批技术验收

Root独立验收接受18套后继、18套结构、8个收费绑定及相邻医生修复。原始证据与未解决范围见
[独立回执](../../../../testing/archive/legacy/batches/script-governance/independent-review.json)和[当前检查点](../../../../testing/archive/legacy/batches/script-governance/current-checkpoints.md)。
全部实现/作者内容在e3586965e冻结，其后bb08d30ee仅补已核新增引用的测试断言；没有运行时、schema或版本改动。

七包typecheck与11,116测试通过。首轮整仓门发现旧shop数量，实际逐项核出shop+1、portrait+4，
明确owner/step/locator及全部原parity保留后再跑；第二轮所有包通过，末尾仅两份JSON回执格式有2个诊断。
格式修正未改JSON语义hash，随后全仓lint零诊断；各原失败日志保留，不把exit1改写为exit0。
最终文档门与作者工程检查另行通过，所有新运行器/工具回归纳入常规根检查。

e358同版RF002、003、004 saves、005 saves全部passed；Root复核各登记输入、5个新档（含004端菜中途档）
及9份trace，正式保存/恢复完整世界hash相同，并目视厨房、端菜与村口读回。原warning1/1/2/2不删除。
52个E2E文件17,990,370字节已保全到main的build/evidence-archive/script-governance-20261002；不含视频。
旧002至005档不再冒称当前前驱，原001无auto.resume且经过当前preflight可继续使用。

本卡保留build：首批已验收，但147套复杂流程、未证源链/帧序列及已登记后期视觉E2E仍未完成。
后续按统一步骤设计推进，不扩大本次已冻结内容。无下一位Agent提示词；首批交用户检视，后续仍由Codex推进。

首批ee1a7b570已fast-forward合入main并推送。6012原PID88523仍监听、HTTP200；用户.zcodeignore未动。
隔离工作树已由应用归档为可恢复快照，本地codex/script-governance分支已按已合入检查删除，未改其它工作树。
E2E原字节、当前census及17份质量/失败日志已保全于build/evidence-archive/script-governance-20261002，
其中质量日志在logs子目录。包含最终独立回执后的再次全仓lint为2787文件、0error/0warning/0info；
最终文档门为830 Markdown/4425本地链接/263任务、0问题。没有重新声称整仓pnpm check原始exit1为0。

## 下一位 Agent 提示词

已在当前任务内部委派，无需用户转发。贡献者只在白名单内交证据；Root核前提后分批开放build，不能自行标done。
