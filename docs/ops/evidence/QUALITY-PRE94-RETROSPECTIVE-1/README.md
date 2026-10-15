# 94前全部治理成果复审

任务：[QUALITY-PRE94-RETROSPECTIVE-1](../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)。当前要求是全部83卡逐卡逐文件复审，未全部完成。下文原f0cf0f7f抽查是历史快照；当前唯一3y分支、主工作树只读。

## 2026-10-16 当前范围与优先级

用户要求94前所有卡成果复审，全部83卡（77历史done/1build/4review/1draft），本轮全量accept=0。逐卡队列见[all-cards.md](all-cards.md)，结构原件见[all-cards.json](all-cards.json)。36卡/8卡及下文旧分支位置是历史抽查快照，不是当前完整范围或分支真相。当前唯一codex/code-quality-3y，C10原检查点bea19f80c已推送，当前恢复见本片末尾；主线f98d0ddd8，0behind，未合main。全83卡14partial/69pending/0accept；[6a](6a/README.md)、92、CODE1/2/2b/3/3b/3c/3f和75已有有限证据。最新[C2支持片](../QUALITY-EXTRACT-RAW-TEST-EXECUTION-1/diagnostics-c2/README.md)实测extract431零stderr；[CODE3b](3b/README.md)两边界六oracle已补；[raw补证](3b/raw-tests/README.md)9→2/五新反控、完整extract428零stderr；全正文仍待，[3d PNG](3d/README.md)两height盲点已补，下一片3h assets/shell，再按模块逐文件推进；94–102/editor未完成项保留。

下文旧数字、探针与结论作为历史保存；不会把旧抽查、历史done或包全绿补签成当前验收。

最新[3h PNG测试切片](3h/README.md)：完整平面与真实cause两个旧绿新红，重复精简10→9；game相邻107、extract16和coverage工具74零诊断。四测试仅review、0新增关闭，下一片3h启动/重试测试；CLI未决策略与全83卡、94–102/editor及统一门继续待收口。

最新[3h启动屏障切片](3h/bootstrap/README.md)：两个旧13绿新单例红、弱重复精简13→12，真实默认fetch正常/失败收尾均结局；相邻129零诊断。三文件仅review，0新关闭，下一片fetch-retry三测试。

最新[fetch-retry/旧71切片](3h/fetch-retry/README.md)：三旧18绿新单例红、正常族19/相邻156；真实取消域counter转draft，完整game初始候选3605 passed仍17块stderr，包门未过。全83卡14partial/69pending/0accept，game/editor诊断与原目标继续。

## 统一候选后的范围更正

以下role键探针和四项counter针对冻结f0cf0f7f主线系候选。用户要求先收3y后，已发现其未合入的CODE53包含party-slot mapper/离队guard与对应测试；现统一候选已有该实现，不能继续宣称“当前helper仍按role键”。CODE53仍待端到端/整文件/视觉与统一门复审，原probe不被改写为当前失败。重复GAME-PLAYER-POISON-KEY-DOMAIN-1取消、归CODE53；YJ2过期注释与cleanup fixture待核仍保留。

## 实际范围

定位36张94之前的CODE-QUALITY卡，逐卡结构提取状态、Owner/Reviewer声称、最近路径commit、门命令和源SHA；仅8张全文读取（2b/3b/3o/3u/3w/3x/6a/92）。实际13个源码/测试/工具全文及caller/primary部分区间逐条列在read-boundaries.json。其余28张仅结构浏览，不以此宣布语义通过。Git身份或卡中Codex署名不能证明当时实际模型，也不能替代本轮核实。

## 局部有直接支持

- 6a账本工具：完整实现+专属测试直接调用真实validator，负控覆盖重复/未知路径、状态/计数漂移、非法清单与真实CLI。当前37质量工具测试通过；它明确只证明记录完整性，不能证明Agent读过源码。这条职责边界可保留为局部支持。
- 2b YJ2：decoder为shared唯一实现，extract入口是真re-export，未复制算法。全文核对SDL YJ2位流/回引段与独立固定向量，现9条边界包含截断、目标越界、窗口前回引、overlap和early-EOS；shared16文件131通过。不能由131绿推其它shared文件重新验收。旧卡声称2626真实raw字节对比，本轮未重新执行该census，不能升级为新证据。
- 战斗清理实现全文仍有≤999清临时态、>999保留装备态，符合已读battle.c与phase1机制；本轮没有动装备buff/复活/战斗行为。不是所有战斗或数值重新验收。

## 确认不足与返工入口

| 项目 | 直接发现 | 本轮处理 |
|---|---|---|
| 3o 毒状态域（高风险） | SDL global.c:1487-1502等先role→party index，冻结f0cf0f7f的player-poison-state所有key直接roleId；合法party[2,0]对role2施毒探针得到0_2，party键0_0为空。battle tick与status绘制同样读role。旧“SDL等价/合同完整”不成立；不能仅凭role键自洽证明无行为风险。 | 撤回该文件关闭结论为rework，曾开[高风险前提卡](../../archive/tasks/cancelled/GAME-PLAYER-POISON-KEY-DOMAIN-1.md)draft，统一3y后取消归CODE53复审；不改机制/schema/save。 |
| 3n 依赖ownership测试 | 第8例party=[1]却断言0_1，证明旧TS域，不能充当SDL party-slot的独立oracle；其它绑定identity负控有实际业务执行。 | 整文件改review，保留所有测试；不删除未知业务轴、不把局部缺口扩张为其它10例无效。 |
| 3u/3w finalization测试 | 全文两例实际调用cleanup，BattleState与空dialog通过强转绕过真实factory；第一例只7个status值。现测试可保护所断言状态快照，但不能仅凭本文件证明完整BattleState/9状态/全部outcome/forced caller域或精确释放时序；相邻历史oracle仍待重核。 | 改review，要求下一有限片使用真实工厂、完整合法输入和精确caller锚点；未宣布产品cleanup有错。 |
| 2b YJ2注释 | 文件头仍称空窗口回引“不能独立构造、待证”，而末例已有[3,0,0,0,0x7e,0x07,0]直接错误oracle。 | 改review，过期注释待窄修；不删除真实边界测试或改变early-EOS合同。 |

另外：extract旧raw两例只验输出长度，而当前decoder先按头分配输出，属于smoke，不能证明解码字节正确；其语义支持须来自固定向量/快照或真实冻结digest。两例仍保留，是否重复/能否精简待独立反控，不在抽审中按模式批删。

3u日志7条vs收口5条、3w日志4条vs收口3条的冲突已被后续6a明确记为历史重复计数并修正当前ledger；本轮没有发现机器账本仍重复，不能把旧文档矛盾再次计为新增产品bug。92也已记录83–89/91把check:fast误当protected的真实纠错；保留旧原件，当前门仍按候选重新跑，不复写旧失败成通过。

## 当前重跑与边界

shared16/131、game3文件24（ownership11/poison11/cleanup2）、extract YJ2两例及quality-tools37均通过，0skip，输出无act/环境/native模式，原件/命令/cwd/exit/SHA见test-results.json和raw.gz。绿色与上述反证同时成立，不能代替语义验收。毒域探针不是产品修复测试或正式变更验收。

这是只读抽审；未修改任何产品/测试/配置，未新增ignore/强转，未碰生成物、schema/save/公共接口/装备机制。全仓check/official ratchet/protected随editor下一稳定窗口运行，本概览不声称新全仓门通过。四条历史关闭撤回：当前机器3284/225closed/75review/2984pending（review统含rework），0新增关闭。其它225旧关闭保留原历史身份，既未批量否定，也没有被本轮重新证明。

## 后续次序

先完成editor Viewer Kimi/上传宿主有限片与统一零诊断窗口，94–102原goal持续；并行仅指同一Agent可做独立只读核验。前94先补毒域role/party/队伍改变/清理/保存的端到端真值，再处理合法finalization fixture与YJ2注释；场景/event/opcode大文件、升级随机数/数值、资源管线及其它28卡逐步补验，未知仍未知。不得趁“回溯”重写机制或恢复旧兼容代码。

用户临时查询旧分支：code-quality-3y=d4cf7f57d未合main（main...branch=5behind/86ahead，82非mergepatch不等价）；也非当前治理HEAD祖先，旧worktree干净但挂着它。按“已合并才清理”条件未删除，不把清理当作批准合并。

无下一位Agent提示词，Codex继续；专项未完成。

2026-10-16 6a切片机器重新对账：3287 inventory /222closed /201review /2864pending，0新增关闭；撤回一条旧测试关闭，另一测试pending→review。原83卡本轮accept仍0。

2026-10-16 [CODE92工程门复审](92/README.md)：历史回执与同commit全仓check原件真实；当前30源20相同/10变化，全部review；0关闭。下一片CODE1 shared RLE，不以工程工具绿替代模块逐文件核验。

2026-10-16 [CODE1 RLE四文件复审](rle/README.md)：原catch测试补证，native格式分歧停线draft；三旧关闭转review，0新关闭。当前219closed/204review/2864pending，续CODE2 MKF/RNG。

2026-10-16 [CODE2 MKF/RNG复审](2/README.md)：两测试补证、一条重复精简、15MKF与native1464帧实际比对；三测试review，0新关闭。机器216closed/207review/2864pending，续CODE2b YJ2。

2026-10-16 [CODE2b YJ2复审](2b/README.md)：原函数native2626段对拍、四混合合同转规范、raw长度smoke换完整字节oracle；0新关闭，续CODE3c。

2026-10-16 [CODE3c动画与清理复审](3c/README.md)：原1例补活动timer卸载，三有效反控；editor模块36绿仍6act，reforge22零诊断/typecheck通过。两旧关闭转review，0新关闭；全83卡0accept/7partial/76pending，下一片CODE3 extraction。

2026-10-16 [CODE3切分复审](3/README.md)：两测试补三oracle/三旧绿新红，extract434/shared126恢复绿；控制流伪边/计数goto风险停线draft，生产/资源未动。0新关闭；83卡0accept/8partial/75pending，续CODE3 annotation。

2026-10-16 [CODE3/3f标注测试复审](3-annotate/README.md)：六旧绿新红、四重复有证转移，17→16；两测试撤回review、0新关闭；83卡0accept/9partial/74pending。完整extract433原生绿实际10 stderr块、6条原盘路径早退，不能作为包级验收；下一片原盘执行完整性，之后3b与94–102/editor。

2026-10-16 [原盘执行完整性支持片](../QUALITY-EXTRACT-RAW-TEST-EXECUTION-1/README.md)：六早退修复，native1332图像全RGBA、七有效反控、空块重复转移21→20。四测试/helper登记review，0新关闭；extract432仍4stderr块，非零诊断验收。全83卡仍9partial/74pending/0accept；不以支持片代替后续整卡核验。

2026-10-16 [C1同步诊断IO支持](../QUALITY-EXTRACT-RAW-TEST-EXECUTION-1/diagnostics-c1/README.md)：53定向、8有效反控、局部V8不降；三文件仅review，0关闭；全83卡仍9partial/74pending/0accept，extract431剩两块日志待C2。

2026-10-16 [C2敌队测试合同](../QUALITY-EXTRACT-RAW-TEST-EXECUTION-1/diagnostics-c2/README.md)：7旧绿新红、同999输入独立转移、实际V8保持；完整extract431/0stderr，shared126/战斗caller186/TC通过。两测试review，误导slots注释精确重开enemies；机器3289/208/226/2855，0关闭，全83卡9partial/74pending/0accept。回3b，94–102/editor原goal保留，统一门未过不合main。

2026-10-16 [CODE3b SSS/M.MSG复审](3b/README.md)：六旧绿新红与原子拒绝，原生16→20，生产未改；独立struct全量5077/295/3955/13514/43503一致，非文本codec/native证明。42定向/extract435/shared126/TC/71工具通过，0stderr；两旧test重开、两raw仅review，0关闭。83卡10partial/73pending/0accept；续raw精度及3d/3g，94–102/editor与统一门未收口。

2026-10-16 [CODE3b原盘测试补证](3b/raw-tests/README.md)：SSS全结构oracle与MSG五固定原文，9→2；五旧绿新红/两原oracle1→1，旧3a9证据按Git重建。35相邻/extract428/shared126/TC/71工具零stderr，0关闭；机器3289/206/230/2853，全83卡仍10partial/73pending/0accept。正文全量未知，续3d及94–102/editor。

当前优先级：3g共享输出边界只等该策略裁决；独立续3h assets/shell。editor余诊断与94–102返工保留，并在稳定窗口集中执行统一门和阶段合并。全部83卡成果持续在范围内，未核项不变更为accept。


当前用户优先级再次确认：全部83卡成果复审，非抽查。C10恢复检查点见[真实等待与排重](../QUALITY-EDITOR-UPLOAD-DIAGNOSTICS-1/recovery/README.md)，仅Wizard28零诊断；完整editor仍624act/243环境/1表单告警，0关闭/未合main。保存后回3d PNG，再3g CLI；不把editor余项替代全部83卡。当前仍10partial/73pending/0整卡accept，94–102/editor原返工保留。


2026-10-16 [CODE3d PNG复审](3d/README.md)：四源全文/真实caller/SDL与PNG运输合同已核，两height旧绿新单例AssertionError；输入混轴2→6独立，错误primary与排重注释校正，算法不变。47相邻/extract432/game8/typecheck零stderr；四文件review、0关闭，机器已确认3289/204/237/2848。全83卡11partial/72pending/0整卡accept；下一片3g，94–102/editor原目标保留，统一门未清不合main。

2026-10-16 [CODE3g CLI IO复审](3g/README.md)：901行总装、五CLI测试/共享输入与真实caller已读，四次自有临时树观察证实根/父链接清理另一树；高风险输出卡draft等裁决，产品未改。仅窄修字形码点注释，41定向相邻/typecheck零诊断；CLI旧关闭撤回rework、三测试review，0新关闭。机器3289/203closed/241review/2845pending；全83卡12partial/71pending/0整卡accept，续3h及原94–102/editor，统一门未清不合main。
