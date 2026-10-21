# QUALITY-EVENT-SLICE-CONTROL-TRUTH-1 — 事件切分控制流与人读元数据边界

Status: build
Owner: Codex
Reviewer: Codex（事实核验，不冒充第三方）
Phase: phase1 asset/event pipeline
Capability: pal-extract reachability truth
Visual Verification Timing: N/A（提取器纯收集；无游戏/E2E或原版运行通过主张）

## 历史停线范围（下方2026-10-22用户新授权覆盖两项窄修）

94前CODE3复审发现：slice.ts两份BFS扫描所有字符串字段，可能将对白text或注释_item中的L_N当控制流；goto分支始终不收续行，而SDLPal的0x0003在非零operand[1]达到计数时会推进i+1。涉及生成的事件切片，立即停止slice/annotate/disasm/opcodes生产算法、公共接口、资源/生成物修改；不得用本卡draft授权实现或改写历史验收。两份BFS重复暂不抽取，避免在前提未核完整时固化错误语义。

## 前提真值矩阵

| 方向 | 一手证据与当前边界 |
|---|---|
| 原版/primary | 原始SSS.MKF chunk4为8字节opcode+3u16，不含symbols/对白正文控制流。SDLPal script.c:3239–3258的0x0003同时有跳转与计数续行；3438–3465的0xFFFF按消息索引显示并推进。SDL源码可验证，pal.exe实际运行未验证，不把两者混称。 |
| 第一阶段合同 | docs/phase1/05-events-schema.md：数字ID是真值，_名字只供阅读、引擎不读/roundtrip忽略；shared/events.ts同样将showDialog.text声明为人读字段。disasm.ts从messages构造text，annotate.ts只增加人读名。 |
| 当前生产调用 | cli.ts:205–292直接执行parseSymbols→disasm→recompile自检→annotate→sliceByScene→写scene/shared/objects/all。当前roundtrip先于annotation/slice，不能证明切片归属不受元数据影响。slice.ts:106–112/148–154扫描Object.values；goto分支只跟目标。 |
| 本卡目标 | 先用实际公开纯函数、合法字节码/sidecar探针与只读raw census确认影响域，再核game真实caller与修复层。暂不允许修改算法或生成事件文件。 |

一句话前提：人读名称/对白不应制造BFS边；合法的非零frameDelay goto还需核条件续行的收集。最强替代解释包括：通用字符串扫描是为未来具名label字段；真实raw永远不用相关输入；全局all.json可掩盖局部切片遗漏；SDL与原版计数语义可能不同。前两项不能只靠合成样本排除，后两项须继续核caller与原版边界。

可证伪观察：相同原始opcode/operand，仅合法更名不改变去除人读字段后的切片；或有直接一手证据说明特定人读字段本来就是控制流；或非零frameDelay实际输入/调用域不满足已读计数分支。没有这些证据前不将当前行为封为“已验证”。

## 准入、证据与交接

只读probe/raw census允许；本卡不进入build。CODE3独立的A2/reset/EO测试精度补证不涉及此处两项算法取舍，另在QUALITY-PRE94-RETROSPECTIVE-1明确白名单和反控。未知测试不批删，不用新baseline掩盖差异。

证据见[CODE3复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3/README.md)：四个合法text/item更名探针在scene/global两域各使2条切片变3条，原始opcode/operand及recompile字节完全相同；带计数goto合成程序漏续行2/3。实际raw43503指令/295场景/5077对象，694全局入口/6767标签入口，严格字节roundtrip一致；当前词表/sidecar去元数据后投影相同，不能说当前raw已被元数据伪边污染。实有17条非零frameDelay goto，尚未逐站判定局部续行是否由其它入口收集。

当前game的script-catalog.ts全文与bootstrap:1172–1186确认生产默认读全局all.json，event-system.ts:1303–1336/1978–2010实现计数续行；per-scene仍在bootstrap:594和loader:165被加载。不能从局部切片差异直接宣布现行游戏故障，也不能据“默认全局”擅自删除切片出口/兼容代码。原版运行、全caller与生成影响域仍待核。禁止合main或宣布本卡done；无下一位Agent提示词，Codex继续事实核验。

## 2026-10-22 当前只读影响域增量

沿用原3证据，不重复四个metadata合成探针或旧计数反例。[当前CLI/事件窗口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/cli-slice-closeout/README.md)用真实raw+当前slice完整遍历17个非零goto；合法label自环仅用于指令身份，去除新增label后逐输出深等于未观测调用结果。14个goto实际入scene片，14个i+1均不在同一输出；其中13个i+1全片缺失，33964的i+1在另一输出，205/32209/34779的goto本身未入片。是实际静态归属，不是运行失效次数。

当前bootstrap::setGlobalEvents之前await all.json、script-catalog::getCmds默认全局与event-system::runOneAutoOp计数续行已定向复核；原版运行未做。collector已抽成无IO内部模块，原循环逐句守恒、6767总入口/694 global及原盘严格recompile相同；未动slice/annotate/disasm/opcodes算法。原draft/停线保持，不据新纯模块绕过两个语义取舍或擅删切片出口。

## 2026-10-22 用户裁决与下一窗口build allowed

用户听取普通文字被误识别为跳转、循环结束后续行漏收的解释后，明确回复“同意修复（推荐）”。先前draft停止线与原件按历史保留；本节是唯一新授权，不追溯改旧结论。Codex单一Coding Owner；当前CLI/测试冻结批先封证据、推送及合并，下一窗口只准修slice的两项收集语义及相邻有效测试/必要私有拆分，先保存失败反例再实现。对白/_item等人读字段不制造边；非零frameDelay goto应保留计数耗尽后的i+1。

原始字节码、全局all.json、schema/save、游戏机制及生成物保持不改；不得借此扩展annotate/disasm/opcodes或删除出口。继续核真实caller、入口顺序、shared归属、结束指令及零计数goto；新增纯结构与行为修复分提交。原版实际游戏未运行的边界保留，不能把静态17站点写成17个游玩缺陷。按相关卡聚合后集中全仓/coverage，不逐小片重复昂贵门。

## 2026-10-22 本地修复与纯结构增量（统一门待聚合）

前窗9b4df7145已先推3y、远端Documentation通过、快进main并fetch核0/0，主树未动。随后本卡单Owner实施两批准项：2ad4c36e9行为修复；e016c27a3纯BFS去重；976c0ce5c主测完整身份等式/去三处强转与头注澄清。先保存6业务AssertionError/19绿，再53相邻绿；全包首跑451绿/1 FIRE像素oracle超5000ms，原件保留，原阈值/规则不改，仅maxWorkers=2复跑76文件452绿、stderr0；TC/scoped Biome均0。

原盘严格字节roundtrip不变，收集union38464→38765（+301/-0），12scene+shared内存结果不同。16/17计数goto可达，其续行全入union；33964续行仍在另一输出，34779 goto本身未入片；不冒称每个切片独立运行已修好。纯重构前后实际完整结果深等，两个原while正文alpha一致、新helper正文不变。仓库原盘/生成物/all.json/存档均未改。[逐文件八维、原件与只读复验](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/event-slice-approved/README.md)。

本窗0新关闭，3/3g仍partial。按用户多卡聚合要求，继续CLI IO与必要排重后才集中本窗全check/official ratchet/protected，再推送/合main；当前只本地提交，不拿前窗门禁替新源授通过。旧停止线历史保留，新授权只覆盖本节两项，不批准其它算法或表示格式变化。

## P3 战败/玩家逃跑接回边：新停线，待用户裁决

2026-10-22继续CLI/事件caller复核时确认新反证，不包含在前两项用户批准里。disasm::emitCommand没有startBattle专用分支，0x0007经emitRawFallback保号落raw；opcodes定义已有op1/op2两个label，disasm会为目标打标签，但slice仅使用单目标JUMP_TARGET_OPERAND，而表中没有7。SDLPal script.c:3314–3333分别在Lost+op1非零、Fleed+op2非零跳转；当前event-system::savePostBattleResume、game-state::resumePostBattleScript也分别保存/恢复两个地址。缺的是提取器收集边，不是字节码/游戏战斗规则。

只读真实公开函数探针：8条合法8-byte指令，raw7的op1=4/op2=6，普通续行在2真end截断；disasm/recompile逐字节一致。scene与global两个入口实际均只收L_1而缺L_4/L_6，报告先落盘，再由指定AssertionError否定“return commands must be collected”。未把它算作Vitest红例或现行游戏故障。只读raw43503条中434条raw7，334入当前切片，327带非零接回；其610条非零return边有609条的目的地址不在任何切片，目的仅3个不同地址6186/41073/41075，不能写成609个独立故障。完整all.json仍含它们且当前生产默认用全局数组。

可review窄修：不改disasm产出/opcode7格式；slice对raw7分别收非零op1/op2，保留原胜利fall-through，补充双目标收集合同说明。先增加正式scene/global失败反例，再最小修复，再核零地址/两目标/共享改写与相邻回归；对真实raw只读比较新增归属。原始bytes/all.json、存档/机制/战斗胜负及逃跑规则不改。用户批准前禁止实现P3或给CODE3/slice授accept；同卡前两获批修复、CLI纯重构可继续独立收尾。原件当前在本轮CLI IO临时证据，收口时接回稳定导航，不能只凭本段文字授通过。

本节归因勘误：此前“旧注还误称7走named-label”未定位到现行源码，撤回这条注释缺陷断言。当前opcodes的named含义与disasm专用emit并非一一对应，已有测试也明确raw fallback；P3由当前真实raw7输出、单目标收集表、SDL/caller及合法探针独立成立，不依赖该无锚注释归因。

### 2026-10-22 集中门结果

相关CLI IO/事件/输出边界统一窗口已实跑整合后check20430，official ratchet/protected同报告20032，全部0诊断；原两次拒绝保留，最新主线移动端统计未覆盖。仅本窗六明确IO路径接受，卡内其它余项与P3停止线保持，详见父卡与cli-io-closeout/review.json。推送/合main以实际Git refs为准。

另记可定位的B维待改项：opcodes.ts模块头及OpcodeDef.named注释将“已具名”概括为disasm必输出结构化Command，而当前startBattle(named)明确经raw fallback，已有两专测也固定该合同。它不是上面已撤回的“跳转表旧注”归因；后续可用纯文案批收窄为注册表命名与实际emit分开，不改字段、字节或行为。opcodes原review状态保持，本窗六IO接受不覆盖它。
