# 已批准的事件切分修复：本地增量

Status: recorded
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「已批准的事件切分修复：本地增量」的治理候选页;证据原件即下方逐字节保全的固定main源(2562B,SHA a332042eb81a)。本页语义:用户明确"同意修复"——对白/物品人读文字不能制造跳转,非零计数goto不能漏掉结束后的续行;同一3y分支上base 9b4df71,行为修复2ad4c36e9、纯BFS去重e016c27a3、测试身份/去强转976c0ce5c三commit分性质提交。历史验收时点,不重开任务。

## 来源与输入

来源为固定Git载体,非本次运行;原3个链接处置见作者review的linkDisposition。当前存活入口:[integration.json](integration.json) [native.json.gz](native.json.gz) [review.json](review.json)。三文件全文/差异及A-H见review;前窗9b4df71推送/快进main/fetch核0/0在先,integration.json的真实远端CI只属于前窗,不替新代码授门禁信用。

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。本页真实oracle事实:(1)旧源码先实跑6个业务AssertionError(scene/global的人读dialogue/item文本L_N不制造控制流边×4、计数goto同时收跳转和结束续行×2)另19绿;修复后53定向/相邻绿。(2)唯一生产caller为CLI;两旧while正文alpha相同后提取无模式参数的私有collectReachable,其它编译正文守恒。(3)最终全包首次451绿/1超时(FIRE837帧oracle超原5000ms),原件保留;不改规则/超时/断言,仅maxWorkers=2复跑76文件452绿、stderr0;typecheck0错、scoped Biome 0/0/0。(4)只读raw 43503指令严格recompile一致;union 38464→38765增301删0;16/17计数站点可达且16条续行入union;33964续行仍在另一输出、34779 goto未入片,不冒称所有单文件游玩已修复;纯重构前后完整真实输出深等。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。批结论:六个具名IO文件范围在前窗统一门后接受;CODE3/3g仍partial,P3当时仍待裁决;0新关闭,账本3338/356closed/126review/2856pending,pre94仍56accept/27partial。全仓check、官方ratchet/protected本窗未跑;按用户多卡聚合要求,继续同分支CLI IO余项与必要测试排重后集中全门再推送/合main,不拿上一窗口全绿代替本窗。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。原文明示:native.json.gz保留全部双流/nativeJSON/命令/版本/退出、6红到恢复、超时到受控并发恢复、三输入SHA、历史源快照、纯重构证明与只读raw脚本;默认verify.mjs只读核源/原件/精确失败及恢复/边界,零测试/coverage/网络/写回,STALE退出2、FAIL退出1,LOCAL MATCH不等于统一门通过或文件accept;Kimi/runtime-resource的生产防御输入域和新共用路径排重、跨文件执行限制仍review;94–102不扩展。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2562B / SHA-256 a332042eb81af73e941bbe7fa86142cb29b828db06f24e61c5b36a7c1e0bfd24；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
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
```
<!-- incremental-original-source:end -->
