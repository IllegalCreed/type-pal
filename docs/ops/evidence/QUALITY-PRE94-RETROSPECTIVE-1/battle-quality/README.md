# 状态／结算／成长相关窗口验收

Status: accepted within specified scope; original window merged, CI repair locally accepted
Owner: Codex（单Agent）

同一`codex/code-quality-3y`，基点9a5f80e7c；实现／测试冻结于d05fdc82c，官方派生baseline提交7ea761572。**本窗关闭10个明确文件，CODE3u按原状态／资源／位置合同接受；固定83卡当前57accept/26partial/0pending。**机器账本3355库存、371closed/114review/2870pending。3w/3x仍partial，94–102未扩展。远端集成按实际Git/CI另核，不能从本页推定已合main。

## 文件与八维依据

[review.json](review.json)列15文件逐项A–H、当前SHA、真实caller、复用证据、接收／保留理由和10个关闭路径。既有源码全文与GLM全文证据按具体版本复用；本轮只重读实际疑点、差异与必要caller，不重复整套原版考据。相邻大型event／GameState／battle-system不授整文件信用。

状态／资源／位置以原CODE3u合同验收，scope不包含整个战斗演出。19个既有单红的原件字节、失败身份与当前测试SHA已实际校验，79份附件沿原路径复用；state去注释TS与旧全文版本相同。positions与DATA阈值parser为既有关闭的有限B维刷新，不增加关闭数。

## 实际结构整改

清毒／装备数值直接依赖真实状态Owner，去除对解释器／装备脚本转出口的无关依赖。七个旧转出口与leaf实际import是同一函数；battle-system仍直接加载两facade，不宣称任意初始化顺序等价或全部循环已消除。

三个type声明原文移到无执行逻辑的数据模块，旧settlement type出口名字／字段保持。新模块只发射空export；settlement执行JS完全相同，其余两源按文件限定import目标替换后其余编译JS相同。原通用比较器原件保留，v2收窄到实际文件。修正空敌槽全无消费、positions缺人数layout返回值、满级阈值零占位三处错注；执行／常量未变，Win95原盘DATA99项实际32000。

量化初筛口径、源指纹和热点处置在原件中：逐函数／闭包按JS决策点统计，>10仅作阅读线索；状态seed的19主要为九组可选／默认读取，不据数字拆万能mapper。成长函数仍review。选中8源的80-token原样块未发现重复窗口，不能推定不存在语义重复或其它尺度重复。

## H02判别力及夹具返工

原两池case补为七项属性／显示数据／经验余数／RNG顺序，仍5例、仅一标题迁移。Defense/Dex对调：旧5绿→新4绿1指定属性AssertionError→恢复5绿。身法无动作计数来源，case只使用当前V1允许的存留经验边界，不声称正常剧情能积身法经验。

补核发现其余四例仍依赖未hydrate运行态，后两例实际0级而注释1级；此前该夹具信用撤回。先加精确等级oracle得3绿2指定业务红，再使用真实初始化；后两例普攻Health2/Attack1配合法存留34/68，保留隐藏涨1/2级、HP/MP恢复和8抽原合同。修正后5绿，同七池变异仍恰1属性红，恢复5绿。前两例是有意helper数值边界。所有身份及旧／新／失败／恢复字节均保留；这修的是测试质量，产品数值未改。

## 实际质量门与成本口径

- 定向／相邻40、state/runtime20、最终H02/主升级16及game typecheck通过；运行有重叠，不相加冒充唯一数量。
- 完整`pnpm check`在150650c59实跑20430例，七包TC、工具、lint均通过；所有运行诊断和stderr为0。260个普通stdout块已逐类核对，与上一可信运行仅耗时值不同。
- 其后唯一变化是隔离H02测试文件：受影响5例／相邻11与TC已重验，其余20425未变结果复用；**未冒称在后继提交再跑一次完整check**。
- 最终候选的官方fast实际20032例／758源，联合ratchet与固定main保护通过；同一报告的canonical投影、严格metrics/scope及protected复核通过，未再采集。253个普通stdout块与前次完全一致，诊断／stderr为0。
- 所有包和总计metrics逐计数完全不变；baseline只同步新type源、单标题身份及其派生摘要／时间。没有新调整授权、退役、范围移除、规则／ignore／exclude变化。
- 当前文档消费者、严格进度consumer、lint-zero、ledger和diff按最终原件记录。退出码0且带诊断不作为通过；失败原件与后继修正分开保留。

完整命令、cwd、工具版本、exit/signal、双流、原生JSON、原生C／输入与实际SHA见[native.json.gz](native.json.gz)；索引在review。state相邻命令所带动画路径未匹配，只计实际3文件20例，不授动画实跑信用。首次census遗漏wrapper的工具失败有原件且不计语义信用。

## 保留的停止线

- [非队员Extra](../../../tasks/GAME-BATTLE-NONPARTY-EXTRA-CLEANUP-1.md)：原盘43503指令中，Extra 0x17仅大蒜84入口，14处0x30均无显式role override；这只是缩小范围，完整动态写入→无重建→清理→消费链仍未知。C逐脚本阻塞与TS先排队的中间时序亦未授全等价。
- [WORD边界](../../../tasks/GAME-BATTLE-HIDDEN-WORD-BOUNDARY-1.md)：原生C字段复合赋值与正式TS结算边界已证65535+1分歧；未运行完整SDLPal／浏览器导入，也未证明普通原盘剧情自然触发。数值策略待用户裁决，未改算术／save。

三个相关产品源保持review，不因测试／统一门全绿升格。第一、二阶段不混用；schema/save/资源、公共字段和UI形态未改变。

## 低成本复验

`node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-quality/verify.mjs`默认只读，核当前源／caller指纹、79份复用附件、全部原件完整性和指定原生失败／恢复身份；不运行producer、测试、联网或改工作树。MATCH仅表示这些检查匹配，语义取舍见逐文件八维。源／caller／输入／合同变化只重核受影响claim；其它26partial不附带关闭。

## cb67a6a0e远端CI与两测试窄返工

原窗口已先推3y并FF远端main。branch Docs39680869184及main Docs39681495449成功；main Coverage39681495390在M05第170行失败，editor4781例中1失败。完整未裁剪远端日志、job元数据、annotations和诊断计数已入本包；Actions平台Node20动作迁移warning与Ubuntu镜像notice另列，不隐去或当产品诊断。不能从先前本地绿推定这次CI成功。

M05等待真实asset/SHA解码证明后再断言应用可用，默认等待1000/50不变。隔离真实reader闸门：旧1绿1指定AssertionError，新2绿，恢复2绿；15业务断言保留，两处复制公式改为独立字面值3，第二标题从未执行的0ms/两字段改为真实80ms/放弃，删无用变量并恢复自有act描述符。没有改组件或核心算法。

修正后首轮official fast20032例/758源、metrics不变、exit0，但K06出现5条act/2个stderr块，**拒绝作干净统一门**。根因是重排两帧收势及焦点/滚动尚在进行，测试进入外部expected编码IO；按公开data-reorder-settling等待实际结束，并恢复自有act描述符。两帧RAF诊断校准：旧5条、新0、恢复0；只选1/8例，7个filtered明确保留，这不是业务变异反控。八例标题/业务主体去注释AST相同，仅新增一次就绪等待；当前五文件29相邻及editor TC零诊断。

最终`ci-two-tests-final-ratchet`再次从官方入口完整采集20032例/758源，固定cb67a6a0e保护及同报告严格metrics/scope/protected均通过，全部诊断/stderr0；253个正常stdout块与前次逐身份/消息相同。各包/全仓计数完全不变。baseline仅首轮官方写入的一条标题身份与摘要，后轮无提升/范围变化而原样保留其生成时间，未假称重写。

本次确有两轮新增采集：第一轮带诊断拒绝，第二轮才是干净门；同报告严格比较不算第三轮。完整check仍绑定150650c59的20430原件；其后只有5个H02、2个M05、8个K06测试变化，20415未变结果复用，受影响测试/当前TC及最终official另核，未伪造第二次全check。两editor文件仍为隐式pending，0新增关闭；57accept/26partial和371closed/114review/2870pending保持。源码、公共接口、规则、超时、选择、资源与存档未改，不扩94–102。

`review.json.ciRepair`为逐项入口，快检另核两测试/真实caller指纹、M05失败身份、K06诊断校准与当前官方结果。首次私有副本Vite路径权限collection失败不算有效反例，原件保留。当前修正只授本地接受；本笔发布后的远端CI必须按实际Git SHA/run核对，不能从本文推定成功。
