# CODE3事件切分/标注成果复审

归[全83卡复审](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)。起点605585752/main=f98d0ddd8，唯一3y分支、单Agent。本片只补两份切分测试，生产/生成物不改，整卡partial、0新增关闭。

## 实际读取、职责与当前结论

[完整路径/行数/SHA及区间](read-boundaries.json)区分全文与caller片段，不将搜索/执行算作全文。下表事件路径前缀packages/pal-extract/src/events/。

| 文件 | primary/caller/oracle、ownership及边界 |
|---|---|
| slice.ts（239行） | 全文。收入口→两份独立BFS→sceneCount/shared强制归属→按全局原顺序collect→只改具名goto。局部Set/数组每次新建；goto改写才复制，不复制其它command，输入对象由调用者持有且不写。当前与48b623d66原类型收紧提交字节相同；未把原卡的无行为漂移误报成新bug来源。两个BFS是复用候选，但在控制流真值未核清前不抽取固化；元数据伪边/计数goto风险专卡draft，撤回旧关闭为review。 |
| annotate.ts（109行） | 全文及Words/Command真实类型。按discriminant纯映射；只增人读名，结构节点创建新容器，未注释叶子可以保留引用，不能把“纯映射”解释为深拷贝。CLI在disasm/recompile之后、slice之前调用。相对48b623d66只有3f parseSymbols IO验证增量；原卡没有验证这个新范围。word offset/sidecar/递归和两份测试已读，排重、oracle与3f当前整体验收留下一片，0新增关闭。 |
| slice.test.ts（原233/现244行） | 全文。原reset只验目标，不验续行；A2所有目标原可顺序到达，删随机边仍绿。改原两例为完整有序oracle：reset用非零计数30覆盖两条可能路径，目标后显式end；A2用end隔断普通fall-through。无新身份、无新增强转。Scene/EO fixture raw字段按4/16个u16与声明值同步。旧关闭转review。 |
| slice.kimi-r1.test.ts（原203/现205行） | 全文。原auto入口例所有end相同，autoScript错成1仍绿；目标4加稳定label后精确区分来源。修正raw fixture形状，原8例不增删。末例“text=L_N扫描”原本还可顺序到达，不能证明text应是控制流；只加明确风险注释，暂不删未知轴或认可该语义。pending→review。 |
| slice.boundaries / slice.glm-runtime-resource 两文件 | 全文，合法归属、循环与IO越界/外部标签政策可见。部分全end fixture只约束数量，排重和每条目标身份仍待后续核；本片不因28绿或读取完就补accept，也不批量撤销原历史状态。 |
| annotate.test / annotate.glm-runtime-resource 两文件 | 全文，部分结构断言靠局部强转、word边界/优先级重复候选尚未完成排重；保留原件，不批删、不凭包绿接受。下一片核真实oracle/输入/隔离与精简。 |

其它完整读取包括disasm/recompile/roundtrip、opcode表、shared事件类型、SSS/MSG/WORD解析与game script-catalog。CLI仅1–325、game bootstrap/loader/event-system分别指定caller区间；未声称这些大文件整文件重新验收。第一阶段schema/engineering真值边界与SDL相关case直接读取；无战斗/数值机制修改、无pal.exe实跑。

## 真值与高风险停线

三项测试目标有直接一手来源：SDL script.c:3016–3022/解释器末尾定义A2的i+1..i+op0，3204–3236/3520–3548定义end及计数reset，SSS tag字段/parseSss把autoScript读自16u16记录的slot5。expected来自固定、互异且可人工推演的图，不调用产品helper生成expected，不以covered/total作为oracle。

独立的[控制流真值卡](../../../tasks/QUALITY-EVENT-SLICE-CONTROL-TRUTH-1.md)保持draft：

- text或_item恰为L_N时，Object.values扫描产生伪BFS边；schema规定它们只是人读值。四个合法更名探针覆盖scene/global两个域，原opcode/operand/recompile逐字节相同，切片却从2条变3条。
- 非零frameDelay的goto在SDL计数满时会走i+1，当前slice始终不收续行；合法字节码探针漏2/3。真实raw有17条非零计数goto，但各站点续行可能由其它入口收集，未核实际运行表现，不能由17直接宣称17处游戏bug。
- game默认getCmds读取all.json，bootstrap await全局数组；per-scene仍被fetch。SDL与当前game计数分支已读，pal.exe未执行。实际slice输出差异不等于现行游戏故障，也不授权删除slice出口、修改资源或改运行时。

生产BFS/annotation/公共接口、raw和生成物全部冻结。本片A2/reset/EO测试补证不修改上述两条争议算法。

## 真实输入与可复跑探针

[control-probe.mts](control-probe.mts)从CLI提取原入口收集块，以相同真实parser读取原始文件；不导入会清输出目录的CLI main。raw43503指令/295场景/5077对象、694全局入口、6767标签入口；disasm→recompile及annotate→recompile均字节一致。当前无symbols.json，使用与CLI相同的空sidecar；掩去人读字段后的真实切片投影完全相同，因此没有把合成反例冒充当前raw污染。

[control-proof.json](control-proof.json)包含17站点/四更名反例/计数goto样本；[命令](control-command.json)保存cwd/exit/实际脚本SHA、输入前后SHA及临时caller清理。只读3份raw，没有启动根目录extract、重迁或写data/extracted symlink后的内容；全包CLI测试按既有隔离临时树运行。字节roundtrip在CLI先于切分，不能用它证明BFS可达集合正确。

## 判别力、精简边界与恢复

[counter-probe.py](counter-probe.py)在同目录写独立module/test副本，不改正式源码。三变异分别删A2随机目标、仅在resetTo缺失时收续行、把auto入口错定为1。每针执行四份完整切分测试，无name filter/skip/timeout变化。

[补证前](before-proof.json)各28绿；[补证后](after-proof.json)各27绿1指定AssertionError，分别唯一落到原A2、reset、EO auto身份。原28个file×fullName集合完全相同；原生JSON/raw、源/副本SHA及精确清理都有原件。没有删例或新退役条目，official baseline未改；其它重复候选待核，不为维持覆盖率堆弱断言。

[恢复](tests.json)：定向六文件45通过；pal-extract完整72文件434通过及typecheck；shared16文件126通过及typecheck。0fail/0skip/0act/环境/navigation；完整包全绿与高风险反例并存，不能替代逐文件判断。另进程[核验](verification.json)重建变异/SHA、核失败身份/类型和raw、测试恢复及临时副本清理，非第三方签字。

## 当前门、账本与交接

[静态门](gates.md)待原命令完成后补写。仅两旧关闭（slice.ts/主测试）转review，一份pending Kimi测试登记review；0新增关闭，机器计数由ledger实测确认。annotation及其它历史关闭未被本片重新accept。

全仓check/official ratchet/protected fast未新跑，editor诊断未清；不合main。下一片CODE3 annotation测试质量，再3b；94–102/editor原返工继续保留。全部83卡当前0accept/8partial/75pending；无下一位Agent提示词，Codex单Agent继续，不宣布专项完成。

探针也继承extract现行strict/noUncheckedIndexedAccess配置额外[检查](probe-typecheck.json)：初次9条索引未收窄诊断保留原件，改为明确存在断言后exit0且输出为空；临时配置仅扩大rootDir/include，不放宽规则或改仓库配置。最终探针重新执行，输入/SHA/清理复核通过。账本已原命令确认3287 inventory /211closed /214review /2862pending。
