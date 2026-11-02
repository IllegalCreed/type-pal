# 经验输入与真实结算终止性

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-31
Template: audit-report-v1 / 1.0.0

## 审计问题

本页回答的问题:合法极大经验余数经真实serialize/parse、进程私有内存Save/Load与真实startBattle后,公共胜利结算builder是否会失去终止性;以及若会,输入侧应以什么政策修复。同一3y分支,基点31c9775ce,Owner Codex单Agent;观察为draft前态,修复需用户裁决,不自行定数值政策。

## 范围与证据

证据分三层:修复前八source指纹与四轮完整双流/ready/done/退出信息在[observation.json](observation.json),原件与producer在[native.json.gz](native.json.gz);当前批准、逐文件八维、实际差异/红绿/指纹在[review.json](review.json)及新原件[local-native.json.gz](local-native.json.gz);最终静态以集中门[gates.json](gates.json)为准;[verify.mjs](verify.mjs)只读快检分别核旧Git基点与当前指纹,不联网、不跑测试、不写仓库。数值政策风险见[GAME-SAVE-EXPERIENCE-DOMAIN-1.md](../../../cards/GAME-SAVE-EXPERIENCE-DOMAIN-1.md);获批物品上下文修复另见[三文件八维/原件](../game-item-role-context-review.json)。阈值独立从真实DATA.MKF第14chunk读取,99级为32000;C的WORD与旧固定样本只是值域候选依据,不自动批准JSON接口政策。

## 发现

修复前终止性缺口成立:主/隐藏两域以65535作对照,均不到1ms完成并得余数1535;相应MAX_VALUE极大有限数输入仍被当前JSON解析器接受、被槽位与真实开战接受,父进程等ready后启动1s观察,两异常例均无done,随后请求终止私有进程组。数学非进展MAX_VALUE-32000===MAX_VALUE与实际循环体对应;隐藏case只提供合法一次普攻计数边界(Health2/Attack1),未伪造完整战斗经过。方法论边界:tsx进程封装可能返回outer exit0,必须结合ready/无done/超时终止记录读取,不当绿色质量门、不伪称Vitest业务红;实际异常退出保留原件不归为绿测。

## 结论

用户已批准0..65535整数经验余数拒绝合同('按WORD范围拒绝异常余数')。正式新增两例,旧守卫28绿1指定业务测试红——八个拒绝断言失败且原槽位被覆盖(8应拒却接受+旧槽覆写,非环境失败);新守卫相邻6文件66例绿/零stderr,game typecheck与局部Biome零诊断;合法六角色八池两端点及属性65536均保留。3x同时删去唯一caller已排除的零法术死条件并补明隐藏属性TS WORD偏离,五例H02删1条被蕴含自比而身份数不变。集中源门实际通过:七包Vitest 20434一次实调,其后仅物品三个game文件变化以完整game TC/3724刷新该包(组合20438,不声称二次全check);单次官方fast ratchet 20040/758带固定31主线保护,strict/scope/protected零回落、无源移除、无需任何baseline授权;260/33/253普通stdout块与既有分类逐消息一致。收口:59恢复、3x原合同接受,v1恢复及progression/levelup两review闭合,相对已合31净增2closed;固定83卡59accept/24partial,账本3355/374closed/112review/2869pending;item由隐式pending登记review,未因门绿关闭。

## 整改与复核

仍保留边界:V1格式、DB版本、奖励/成长算法、其它数值政策和二阶段保持原合同;新案例在真实独立内存Save拒绝,IDB相邻沿原测试,没有新跑浏览器FileReader/实际IDB/正常原盘故事或视觉,旧真实浏览器入口证据按未改caller复用;item/event系统广域script pointer、3w动态Extra链、3r/3s宽dispatcher仍review,不授完整fight/视觉。过程失败如实保留:初次相邻命令两个路径未匹配只计实际3文件43例(修正后6文件66);首轮接线漏import引发4 ReferenceError与TC TS2552,修正后289相邻及3724整包0诊断——自身失误不当原产品反例;物品首轮4业务/传输失败与context-only投影失败身份区分。旧观察原件字节不因当前修复改写;提交/推送/main按实际refs记录。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 4438B / SHA-256 22d566f35da546e150b5db06b6f65ef66089046e0dcaa6a8aea461849cb67e81；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# 经验输入与真实结算终止性

Status: source accepted within scope / final document statics before integration
Owner: Codex（单Agent）
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

同一3y，基点31c9775ce。修复前八个source指纹、四轮完整双流/ready/done/退出信息在[observation.json](observation.json)，原件与producer在[native.json.gz](native.json.gz)。当前批准、逐文件八维、实际差异/红绿/指纹见[review.json](review.json)及[新原件](local-native.json.gz)。[只读快检](verify.mjs)分别核旧Git基点和当前指纹，不联网、不跑测试、不写仓库。

## 来源与输入

当前正式serialize/parse、真实进程私有内存Save/Load、loadDefaultGame/project/startBattle与buildBattleWonSettlement。阈值独立从真实DATA.MKF第14chunk读取，99级为32000。读取bootstrap实际赋值/归一范围确认未改经验。C的WORD与旧固定样本只是值域候选依据，不自动批准JSON接口政策。

## 断言与业务oracle

主/隐藏两种经验分别用65535作对照，均不到1ms完成并得余数1535；相应极大有限数输入仍被解析、槽位和真实开战接受。父进程等ready后才启动1s观察，排除冷启动；两异常例均无done，随后请求终止私有进程组。数学非进展MAX_VALUE-32000===MAX_VALUE与实际循环体对应。隐藏case只提供合法一次普攻计数边界，未伪造完整战斗经过。

## 结果

修复前跨边界终止性缺口成立；旧liveness观察不是正式Vitest红/绿，outer exit0不授产品接受。用户已批准0..65535整数经验余数合同，见[风险卡](../../../tasks/GAME-SAVE-EXPERIENCE-DOMAIN-1.md)。正式新增两例，旧守卫28绿1指定业务测试红：八个拒绝断言失败且原槽位被覆盖；新守卫相邻6文件66例绿/零stderr，game typecheck与局部Biome零诊断。合法六角色八池的两个端点及属性65536均保留。

3x同时删去私有helper唯一caller已排除的零法术条件，补明隐藏属性的TS WORD偏离；五例H02去掉一条已被1/1字面断言蕴含的自比，身份数不变。唯一caller/源码与JS差异证明、最终16例原件在新包；纯重构与输入行为修复分提交。初次相邻命令的两个路径未匹配，只计实际3文件43例，随后修正路径实际6文件66例，不把过滤参数当执行文件。

集中源门已实际通过：七包Vitest20434及工具/TC/lint全check，随后仅物品三个game文件变化，以完整game TC/3724刷新该包，另六包代码据相同版本复用。单次official fast ratchet20040/758带固定31主线保护，同报告baseline canonical投影/strict/scope/protected零回落、无源移除；不声称再次全check或第二轮coverage。所有运行诊断及stderr0，260/33/253普通stdout块与既有分类逐消息一致（只归一耗时）。

59恢复、3x原合同接受；v1恢复及progression/levelup两review闭合，相对已合31净增2closed。固定83卡59accept/24partial，账本3355/374closed/112review/2869pending。item由隐式pending登记review，未因门绿关闭。最终静态以[集中门](gates.json)为准，提交/推送/main按实际refs记录。

## 限制与复核

V1格式、DB版本、奖励/成长算法、其它数值政策和二阶段保持原合同。新案例在真实独立内存Save拒绝，IDB相邻沿原测试；没有新跑浏览器FileReader/实际IDB/正常原盘故事或视觉。旧真实浏览器入口证据按未改caller复用，不能写成这次新实跑。已集中完成源门；最终文档消费者/progress/lint/ledger/diff仍须零诊断才可推送合并。

获批物品上下文修复及必要8D属性刷新另见[三文件八维/原件](../game-item-role-context-review.json)。四旧不变/四新先红，context-only仍留一个投影业务红；首轮接线漏import引发4ReferenceError与TC TS2552，修正后289相邻及3724整包0诊断。失败原件完整保留，不能把自身失误当原产品反例。item/event系统广域script pointer和3w动态Extra链仍review，不授完整fight/视觉。

原观察tsx进程封装可能返回exit0，必须结合ready/无done/超时后终止记录读取；实际异常退出也保留原件，不归为绿测。未证正常剧情自然产生异常值；既有属性持续增长决定与本场经验奖励不受本输入限制。旧原件字节不因当前修复改写。
```
<!-- incremental-original-source:end -->
