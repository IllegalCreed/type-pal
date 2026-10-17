# CODE3x battle progression 当前复审切片

2026-10-18 当前结论：3x仍partial，整文件信用撤回review。前轮“未发现direct实现defect”只保留已核普通数值路径；“无弱断言/所有夹具合法/完整开战闭环”不能成立：levelup投影夹具缺字段而用as any as隐藏，H02额外RNG消费变异旧5例仍绿。旧报告完整字节保存在[本次附件](../core-comment-audit/poison-progression-comments/3x-README.before.gz)，旧207绿仅是当时回归观察，不认证当前语义或统一门。

本次重新全文核battle-progression、H02、levelup，按PAL_BattleWon/PAL_PlayerLevelUp/真实settlement caller核主升级999 cap、隐藏不套此cap、主6抽/隐藏2抽和HP/MP回满顺序。修正STAT_LIMIT2393–2401、MAX_LEVELS/palcommon.h与global.c真实EOF2409；写回余exp与PAL_PlayerLevelUp自身清零不同，PRNG算法也不同于SDLPal，不能声称同种子同序。

生产仅注释，removeComments编译JS字节与27358f9d9基点一致。levelup复用完整typed角色工厂，只执行公开投影，不声称真实开下一场；H02头注只保留Health→Magic两池信用，主升级回满例明确8个合法抽样并核完整调用参数序列。额外一抽的同一变异旧5绿→新4绿1指定业务AssertionError，恢复SHA一致；两文件仍5/11例，无新增弱测试或退役。

本片27定向（含11所有权相邻）与16真实结算/装备/opcode相邻全绿无stderr，game typecheck通过。完整原件/读边界、当前门、身份映射与限制见[毒/升级有限返工](../core-comment-audit/poison-progression-comments/README.md)。C WORD极端数值、全部七池判别力、原盘表重算、真正开战/演出与统一check/coverage/protected仍未验，不关闭文件；前轮C源越界原件也继续保留于53 receipt-audit。
