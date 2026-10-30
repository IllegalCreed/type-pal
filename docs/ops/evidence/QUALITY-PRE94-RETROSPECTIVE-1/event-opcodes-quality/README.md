# CODE53 事件 opcode 专测质量收口

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「CODE53 事件 opcode 专测质量收口」的治理候选页;证据原件即下方逐字节保全的固定main源(3775B,SHA 9c178700519e)。

## 来源与输入

来源为固定Git载体,非本次运行;原4个链接处置见作者review的linkDisposition。当前存活入口:[receipts.json.gz](receipts.json.gz)、[review.json](review.json)、[static-receipts.json.gz](static-receipts.json.gz)、[static.json](static.json)

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3775B / SHA-256 9c178700519e8baf56b6569d3169372d3ea60be1f1393220abf8a98f1a9aa38b；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
````markdown
# CODE53 事件 opcode 专测质量收口

Status: source-backed
Owner: Codex
Last reviewed: 2026-10-25

同一 `codex/code-quality-3y`，基点 `4ae01d9069c7538cf62a4c2b6bd56ed8cf2cb2e7`。本片核 `packages/game/src/core/event-opcodes.cov85.test.ts`，并为相邻解释器清除一条死计算和四处误导注释；原419行与最终版本完整读取，八维及逐例旧→新合同见 [review.json](review.json)。解释器除无人消费的`_fadeSec`声明外，整TS去注释后与基点完全一致，类型/import/出口也在比较中；状态写入、机制、资产和公开接口不变。源码完整八维复用既有3r证据，实际变更按本片有限准入单独核验。

原21例中，多opcode混合断言拆开，错误caller/单位/标题纠正；使用已hydrate运行态、真实BattleState、bus、RNG和NPC装载工厂。色表使用完整256色与不同日夜/工作色；CD曲目、镜头/trail、SHORT进度/层与动画帧改成确定结果断言。0x75保留正式事件tick和真实装备刷新，完整16槽oracle包含零记录，离队角色不得获得装备伪毒的断言保留。弱0xA6例只观测plain-end返回与未变undefined，不能支持屏幕备份，精确退出；当前TS no-op行为没有因此获得新保真信用。21个旧身份全部有去向，最终32例；净增加不是质量依据，未改官方baseline或放宽数量门。

三项反控分别把ColorFade方向、CD回退曲目或SetPartyPos镜头更新改错。每项旧修复oracle基线21绿，新32例恰一个指定AssertionError；`finally`逐字节恢复。最终相邻8文件502绿，另补真实路径毒状态1文件16绿；共9文件518例，stderr均空。最终game typecheck exit0、stderr空。主测的世界等待、FadeOut delay2与builder数学仍由原文件持有，本片保留fallback默认delay0等不同调用层合同。

过程原件均在 [完整原件归档](receipts.json.gz)，命令/cwd/起止/exit/native全名/恢复指纹可查：初始20绿1红是毒表旧oracle；第一次新断言误把trail当成重叠点，核SDLPal `script.c:1665–1700` 后修为逐槽偏移，保留当次31绿1红。相邻命令误写一个不存在的core路径，实际仅匹配8文件；随后单独运行真实根目录毒状态文件，不冒称一次跑了9文件。

只读复验（不写、不联网、不重跑测试）：

```sh
node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/event-opcodes-quality/verify.mjs
```

按需重放定向：

```sh
pnpm --filter @type-pal/game exec vitest run src/core/event-opcodes.cov85.test.ts
```

32例及相邻结果、上下文版本桥与八维支持该文件代码接受。CODE53原声明15个文件逐项与live账本相配后，代码复审升accept；任务仍review，统一门/合并未完成。固定83卡当前78accept／5partial／0pending；尚余1／3m／42／57／58。机器账本3445tracked／488closed／74review／2883pending。

未跑全仓check、官方coverage/ratchet、protected、浏览器/视觉或PR/merge。全仓与覆盖率仍等全部pre94解决后集中；94–102不扩展。既有中文受控视觉证据复用，不声称本轮验证普通剧情或英文资源。解释器StopMusic死计算已删除，43/77/A3注释按实际MIDI/RIX宿主修正，palette说明区分局部cursor与跨帧等待。此清理不实现淡出，也不声称现有后端时间行为逐一对齐SDLPal。完整AST桥支持此前518相邻复用，最终同9文件518例和typecheck另实跑确认。自动脚本旧cursor改用两入口中的合法ip1；不用无效ip9冒充合法fixture。

静态门的完整stdout/stderr/命令原件另见[静态回执](static.json)与[静态原件归档](static-receipts.json.gz)。这些静态门不替代未跑的全仓runtime/coverage。
````
<!-- incremental-original-source:end -->
