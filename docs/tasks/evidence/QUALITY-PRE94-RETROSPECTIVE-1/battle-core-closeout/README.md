# CODE3m 核心合同：判别力与数值停止线

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 QUALITY-PRE94-RETROSPECTIVE-1 中 CODE3m 核心合同的收口回执,原时点状态为 scoped code acceptance; CODE3m remains partial(Owner=Codex 单 Agent,自审身份明确)。逐文件八维与继承版本桥见 [review.json](review.json);完整原件/产生者见 [receipts.json.gz](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-core-closeout/receipts.json.gz);默认只读快检见 [verify.mjs](verify.mjs)。九个文件范围接受(五新关闭、四旧关闭刷新);formulas/magic-damage 及各自主专测四项保留 review,不能以局部绿关闭整卡;pre94 仍 76 accept/7 partial。原件逐字节保全于下方保全块。

## 来源与输入

RNG 三个 range 测试用少量精确 word 映射替代 17000 次抽样,原 8 身份保留;两个错误映射分别在旧 8 例全绿,补强后各恰一个指定业务 AssertionError;四副本 32 例为 16 旧绿/14 新绿/2 新红,正式 PRNG 从未改动,临时目录 finally 移除。正式七文件 86 绿,首命令一个不存在路径不计信用;正确状态构造路径另补 14 绿,game typecheck/局部静态零诊断;没有重复跑已可靠的 897 相邻或原 C36/5151 矩阵。五份实现/状态专测只改注释,去注释 runtime token 相同;纠正攻击法术执行阶段、AoE/单体预掷 HP 条件、九 Classic 状态与 TS slow,以及 C 中间赋值的适用域;实际 queue caller 从 jitter 到 buildActionQueue 与旧基点逐字节相同,其它已变大文件只依指定已接受记录与有限读域,不授整文件信用。

## 断言与业务 oracle

两数值范围已停线并登记在原数值风险卡:其一,角色身法 21846+haste 时 C 为 2、TS999;敌 level11000/dex20 时 C 为 -32498、TS33038。原函数最小 C globals 的 O0/O2 与真实 GS 投影共 159 行,其中 154 条当前提取敌数据相等,不冒称普通剧情/原 EXE。其二,真实 GS 防御 32767→32768,敌方法术由 50→68、RNG 终态相同;当前 TS 把正 WORD 当 SHORT 后钳 0;原 C int def 的 50 是 primary 分支推导,并非新跑完整敌行动。两项均已向用户提问、尚无回答;预选项不算批准,数值实现未改。原 RNG/status/queue/positions 及 FLOAT 反例的完整可信证据按 report 具体 pin 复用;测试验收与数值范围裁定分开。

## 结果

[static.json](static.json) 在本窗实际终态后写入:六个真实文档 consumer(docs/model/testing/phase/content --strict/progress)+lint 6029 文件 0/0/0+ledger+diff+只读 verify 全部 exit0,复用未变的 125 文档工具测试;state='Actual scoped publication gates passed, not final unified integration',不借旧统一门授当前集成信用。全仓 check、official coverage/protected、PR 继续等全部 pre94 冻结,94-102 未扩展。2026-10-25 更新:用户裁决已收到;原数值/姓名停线由[README.md](../approved-boundaries/README.md)解除,旧原件和当时状态保留,本目录固定旧版本快检可显示 STALE,不据此重做未变合同;整卡代码接受,统一门仍待全部 pre94。

## 限制与复核

未重跑任何命令;历史结论保持原时点;候选待 Owner 非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2566B / SHA-256 6115adaddd4dbc413e538b69d593e8edeb52841c2e2178b328df4cdb6e5e127c；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3m 核心合同：判别力与数值停止线

Status: scoped code acceptance; CODE3m remains partial
Owner: Codex（单Agent，自审身份明确）

[13文件八维与继承版本桥](review.json)、[完整原件/产生者](receipts.json.gz)、[默认只读快检](verify.mjs)。九个文件范围接受（五新关闭、四旧关闭刷新）；formulas／magic-damage及各自主专测四项保留review，不能以局部绿关闭整卡。pre94仍76accept／7partial。

RNG三个range测试用少量精确word映射替代17000次抽样，原8身份保留。两个错误映射分别在旧8例全绿，补强后各恰一个指定业务AssertionError；四副本32例为16旧绿／14新绿／2新红，正式PRNG从未改动，临时目录finally移除。正式七文件86绿，首命令一个不存在路径不计信用；正确状态构造路径另补14绿，game TC／局部静态零诊断。没有重复跑已可靠的897相邻或原C36／5151矩阵。

五份实现／状态专测只改注释，去注释runtime token相同；纠正攻击法术执行阶段、AoE／单体预掷HP条件、九Classic状态与TS slow，以及C中间赋值的适用域。实际queue caller从jitter到buildActionQueue与旧基点逐字节相同；其它已变大文件只依指定已接受记录与有限读域，不授整文件信用。

两数值范围已停线并登记在原数值风险卡：①角色身法21846+haste时C为2、TS999；敌level11000／dex20时C为-32498、TS33038。原函数最小C globals的O0／O2与真实GS投影共159行，其中154条当前提取敌数据相等，不冒称普通剧情／原EXE。②真实GS防御32767→32768，敌方法术由50→68、RNG终态相同；当前TS把正WORD当SHORT后钳0。原C int def的50是primary分支推导，并非新跑完整敌行动。两项均已向用户提问、尚无回答；预选项不算批准，数值实现未改。

原RNG／status／queue／positions及FLOAT反例的完整可信证据按report具体pin复用。测试验收与数值范围裁定分开；全仓check、official coverage／protected、PR继续等全部pre94冻结，94–102未扩展。

[发布静态门与完整原件索引](static.json)在本窗实际终态后写入，不借旧统一门授当前集成信用。

2026-10-25更新：用户裁决已收到；原数值／姓名停线由[获批窄修与当前版本桥](../approved-boundaries/README.md)解除。旧原件和当时状态保留，本目录固定旧版本快检可显示STALE，不据此重做未变合同。整卡代码接受，统一门仍待全部pre94。
```
<!-- incremental-original-source:end -->
