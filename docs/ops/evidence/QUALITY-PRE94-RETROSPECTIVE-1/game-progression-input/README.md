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
