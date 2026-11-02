# CODE3事件切分/标注成果复审

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

本篇是 CODE3「事件切分/标注」切片的证据索引，归 [QUALITY-PRE94-RETROSPECTIVE-1.md](../../../cards/QUALITY-PRE94-RETROSPECTIVE-1.md) 全 83 卡复审（起点 605585752 / main=f98d0ddd8，唯一 3y 分支、单 Agent）。本片真实目标只补两份切分测试的判别力：slice.test.ts 的 reset 例旧版只验目标不验续行、A2 例所有目标本可顺序到达（删随机边仍绿）；slice.kimi-r1.test.ts 的 EO auto 例所有 end 相同，autoScript 错成 1 仍绿。生产 slice.ts/annotate.ts 与生成物零修改，整卡 partial、0 新增关闭。

## 范围与证据

读取边界逐文件登记在 [read-boundaries.json](read-boundaries.json)：28 个文件区分全文（slice.ts 239 行、annotate.ts 109 行、四份切分测试、两份标注测试、disasm/recompile/roundtrip、opcodes、SSS/WORD/MSG 解析、shared 事件类型等）与指定区间（cli.ts 仅 1–325/901、event-system 仅 1280–1336 与 1968–2035/5117、sdlpal script.c 五段区间等），不把区间读取冒充整文件验收。真值锚：SDL script.c 3016–3022 定义 A2 相对目标 i+1..i+op0，3204–3236/3520–3548 定义 end 与计数 reset，SSS 16u16 记录 slot5 读 autoScript；expected 来自固定互异可人工推演的图，不用产品 helper 自制、不以 covered/total 作 oracle。反控原件 [before-proof.json](before-proof.json)/[after-proof.json](after-proof.json)，真实输入探针 [control-probe.mts](control-probe.mts) 及 [control-proof.json](control-proof.json)、命令回执 [control-command.json](control-command.json)、变异脚本 [counter-probe.py](counter-probe.py)、恢复 [tests.json](tests.json)、核验 [verification.json](verification.json)、静态门 [gates.md](gates.md)、探针 typecheck [probe-typecheck.json](probe-typecheck.json)。

## 发现

三变异（删 A2 随机目标、resetTo 缺失才收续行、auto 入口错定为 1）旧四文件 28 例全部绿（盲点实证）；补证后各 27 绿 1 指定 AssertionError，分别唯一落到 A2 有序集合（期望 5 实得 2）、reset 目标+续行（期望 4 实得 3）、EO auto 入口身份（期望带 label L_4 实得裸 end），28 个身份保持、0 删例。真实 raw 探针：43503 指令/295 场景/5077 对象/694 全局入口/6767 标签入口，disasm→recompile 与 annotate→recompile 字节一致，掩去人读字段后投影相同；实有 17 条非零 frameDelay goto。两条高风险控制流争议（text/_item 恰为 L_N 时元数据伪边使切片 2→3 条且重编译字节不变；非零计数 goto 漏收续行 2/3）停线到 draft 卡 [QUALITY-EVENT-SLICE-CONTROL-TRUTH-1.md](../../../cards/QUALITY-EVENT-SLICE-CONTROL-TRUTH-1.md)，本片不借测试补证实施算法修复。

## 结论

本片时点结论：仅两旧关闭（slice.ts/主测试）转 review、一份 pending Kimi 测试登记 review，0 新增关闭；83 卡 0accept/8partial/75pending。重要自纠（2026-10-16 补记，详见 [README.md](../3-annotate/README.md)）：本页旧的 extract 72 文件 434 通过包日志保留，但完整 stderr 实有 10 块/52 行，六例原盘 root 指错后早退成假绿，仅 act/环境/navigation 三模式为 0 不能称「零诊断」，包级验收不成立；不追溯涂改原日志。

## 整改与复核

恢复面：定向六文件 45、extract 完整 72 文件 434+typecheck、shared 16 文件 126+typecheck 通过（434 的 stderr 边界见上节自纠）；探针按现行严格规则 typecheck 与实际执行重新通过。全仓 check/官方 ratchet/protected fast 未新跑，editor 诊断未清，不合 main。治理页不重开任务、不重跑执行；后续以 3-annotate 复审与原盘执行完整性卡为准，候选待 Owner 接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 8021B / SHA-256 db24e7ddcb2174b1aa480e339ec41390dbf9fe1f43cb0062921fb31eec667767；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
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

2026-10-16 后续[annotation完整stderr复查](../3-annotate/README.md)：本页旧434原始包日志保留，但仅act/环境/navigation三模式为0不能称“零诊断”。同一两份原盘测试此前也走错误packages/data/raw并早退；当前已确认六条假绿，完整包结果不验收。新增draft原盘执行卡优先处理，未改生产/原件、不追溯涂改日志。
```
<!-- incremental-original-source:end -->
