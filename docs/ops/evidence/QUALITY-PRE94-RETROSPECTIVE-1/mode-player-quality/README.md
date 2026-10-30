# CODE3o／3p 模式、历史与玩家指令质量返工

Status: recorded
Owner: Codex（单Agent；作者自核，不冒称第三方）
Date: 2026-10-24
Branch: codex/code-quality-3y

[逐文件八维／当前指纹与合同](review.json)、[完整原始输出与生产者](receipts.json.gz)、[默认只读复验](verify.mjs)。

本窗继续剩余pre94，未开PR，未跑全仓check、官方coverage或protected。16份文件级记录含两份相邻测试的有限增量，不能据数量关闭整卡；既有3m极端输入及其它卡仍未收口，94–102未扩展。

## 实际改动

- 对话历史7例不读实现容量作oracle，核完整保留序列、trim、非连续重复和恢复输入不变；容量50与反转输入两变异均是旧绿新业务红。模式10例保留、目录逐例释放；模块头压缩为Owner／时序／约束，修正两等待白名单被误称相同的问题。搜索删未用常量，复用既有12例及原C反控。
- 玩家指令目标复用已有helper，状态指令不同的缺省规则保留。四专测61例与断言合同保留；共享正式hydrate夹具，告警从只数次数补到消息与参数，成长核独立精确值。全队MP/HPMP先false后true，旧测会漏的强制成功变异由两条业务断言拒绝。装备36例也改为hydrate及失败时可靠cleanup，去shared.json过时说明。
- 用户 `call_4069993f441d4cc0ad23d731139664f3` 批准：卸Wear清高等级毒后按原顺序前移幸存毒，保留脚本续点；扫全16槽、保留洞后有效毒及全槽去重，**不复制SDLPal丢毒／重复施毒的空槽边界**。两正式反例先红再绿：颜色64应为33、解毒洞后的毒应保留并前移；三个旧位置断言迁移为精确packet，没有删失败断言。

## 证据与限制

原盘寿葫芦39163、普通毒552/553与实际装备／玩家指令／同步毒入口／颜色consumer串联；原生C完整三函数及颜色片段使用最小结构、入口脚本identity stub，不能当完整SDLPal或HP演算。TS原盘探针与正式紧凑label夹具分别保存。OBJECT联合视图的173个非零script记录不能冒称173种玩家毒；实际0x29字面引用12种，其初次同步段均到end，范围在原件明确，不认证任意mod或回调重入。

实际局部验证：13文件610例；获批毒修复11文件486例；装备cleanup后36例。集合有重叠，不相加成独立总数。game typecheck及静态结果以原件为准；所有成功测试显式default reporter，stderr和可见console block为0。9组预期拒绝告警由测试精确捕获，不以只吞日志或mock次数替代业务验证。

过程失败完整保留：首次探针误用私有入口的TypeError不是产品红；首轮相邻485/486为旧Wear位置oracle，已按获批规则迁移后486绿。初次catalog查询假设root.commands，后按segments修正；未写资产。原始失败不覆盖为通过。

## 复验与后继

在治理树运行 `node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/mode-player-quality/verify.mjs`。只读核附件字节、测试身份／业务红、恢复记录、窄源代码连续性；不联网、不写树、不重跑测试。MATCH仅支持列明的证据，不自动认证设计或全pre94；相关源码／caller变更返回STALE，按claim定向重核。

统一门和PR等待全部剩余pre94冻结。源／测试审查、用户行为批准、统一门及合并分别记账，不以本窗局部通过恢复所有旧信用。
