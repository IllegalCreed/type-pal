# CODE3m formulas / magic-damage 当前复审切片

2026-10-18 当前结论：3m保持partial，0整卡accept。旧README的“整数步骤与C一致/未发现直接缺陷/fixture窄as any不改变输入”不能作为当前整文件关闭依据；旧222绿只保留原执行范围。原文完整字节保存在当前数值返工片的3m-report.before.gz，不重写历史为已通过。

此前漏报的上次选靶、0x66裸武术、非伤害敌法术预掷由[三机制返工](../../QUALITY-BATTLE-MAGIC-PARITY-1/README.md)独立修复并先红后绿；它们不覆盖本轮新发现的FLOAT/WORD中间赋值差异。magic-damage/battle-opcodes仍review。

[当前公式数值/注释与测试返工](../core-comment-audit/formula-numeric-audit/README.md)全文核formulas、magic-damage和既有28例公式测试，核真实GS hydrate/projection/createBattleState/applyMagicDamage及SeedableRng。原C O0/O2正常域扣161，而TS真实caller扣160；[风险卡](../../../tasks/GAME-MAGIC-NUMERIC-ASSIGNMENT-1.md)等待用户裁决，未改执行，也没有用删除*10/10冒充修复。两旧关闭转review，无新closed。

当前只修错注和原测试判别力：玩家身法无等级项、必填抗性除数1/20、TS半开与C含端点、玩家抗性倍率[0,5]及投影前提；去注释TS/JS同字节。五灵五个独立值、非零毒抗、合法倍率1.05，删除2条被精确值蕴含断言，28例保持。两枚各旧28绿→新27绿1指定业务AssertionError；原C独立oracle可复算，完整原件随片保存。

恢复后定向2文件51绿、相邻6文件293绿与必要game typecheck；具体诊断/文档/lint见本片最终回执。全仓check、official coverage ratchet、protected fast留完整大任务收尾。越界WORD/SHORT、其它float系数/场效全排列、原盘与视觉/E2E、整文件/整卡仍未接受，不将小值手算或包绿扩成完整1:1。
