# QUALITY-EVENT-SLICE-CONTROL-TRUTH-1 — 事件切分控制流与人读元数据边界

Status: draft
Owner: Codex
Reviewer: Codex（事实核验，不冒充第三方）
Phase: phase1 asset/event pipeline
Capability: pal-extract reachability truth
Visual Verification Timing: N/A（本阶段只读取证；运行时影响另核）

## 停线范围

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
