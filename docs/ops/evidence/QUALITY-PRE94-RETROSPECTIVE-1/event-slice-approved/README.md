# 已批准的事件切分修复：本地增量

Status: recorded
Owner: Codex

## 范围与裁决

用户明确“同意修复”：对白/物品人读文字不能制造跳转，非零计数goto不能漏掉结束后的续行。同一3y，先把前窗9b4df7145推送并快进main、fetch核0/0，再开本窗；[真实远端CI及完整解码原件](integration.json)只属于前窗，不替新代码授门禁信用。

## 逐文件与实现

三文件全文/差异及A–H见[有限审查](review.json)。2ad4c36e9为行为修复，e016c27a3为纯BFS去重，976c0ce5c为测试身份/去强转；不同性质分提交。唯一生产caller为CLI，输入来自disasm/annotate/parsed表。两旧while正文alpha相同后提取无模式参数的私有collectReachable，其它编译正文守恒；借用输入，局部queue/visited各次独占。未改公共接口/schema/save、原字节码、all.json或仓库生成物。

## 原始反例、回归和真实输入

旧源码先实跑6个业务AssertionError（2计数、4metadata），另19绿；修复后53定向/相邻绿。最终全包首次451绿/1超时（FIRE837帧oracle超过原5000ms），原件保留；原规则/超时/断言不改，仅maxWorkers=2复跑76文件452绿、stderr0；typecheck0错、scoped Biome0/0/0。

只读raw43503指令，严格recompile原字节码一致。收集union38464→38765，增301/删0，12scene+shared内存输出不同；16/17计数站点可达，其续行均入union。33964续行仍在另一输出，34779 goto本身未入片，不冒称所有单文件游玩已修复。纯重构前后完整真实输出深等，label观测去除后与原调用一致。

## 原件与低成本复验

[native.json.gz](native.json.gz)保留全部双流/nativeJSON/命令/版本/退出、6红到恢复、超时到受控并发恢复、三输入SHA、历史源快照、纯重构证明与只读raw脚本，字节清单在review.artifact。默认运行本目录verify.mjs，只读核源/原件/精确失败及恢复/边界，零测试/coverage/网络/写回；STALE退出2，FAIL退出1，LOCAL MATCH也不等于统一门通过或文件accept。

## 未决与下一步

全仓check、官方ratchet/protected本窗未跑。按用户多卡聚合要求，继续同分支CLI IO余项与必要测试排重后，集中全门再推送/合main；不拿上一窗口全绿代替本窗。0新关闭，账本3338/356closed/126review/2856pending、pre94仍56accept/27partial。Kimi/runtime-resource的生产防御输入域和新共用路径排重、跨文件执行限制仍review；94–102不扩展。
