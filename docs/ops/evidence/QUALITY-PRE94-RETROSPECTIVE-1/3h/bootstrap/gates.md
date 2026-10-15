# CODE3h 启动切片质量门

两测试13→12，两个旧13绿缺口各新11绿1指定AssertionError；两glyph原oracle各2→1转移。真实IO观测旧两例各4 pending，新正常与故意断言失败后均0；这些宿主诊断不计产品测试增量。

game相邻22文件129例、game typecheck、coverage工具75例均通过，0失败/跳过/运行时诊断，原件见test-gates.json及各raw.gz。局部真实生产V8保持且不足100%的实际项保留；不是官方coverage门。

最终docs、ledger、diff-check、lint-zero及证据重建以[静态回执](static-gates.json)为准。全仓check、官方ratchet、protected fast本片未新跑，editor诊断仍未清；0新关闭、不合main。全83卡仍13partial/70pending/0整卡accept。

首轮静态门全部通过后，逐行核对并校正README的role0/segment源码行号、补齐类型读取范围；只影响证据导航。校正后的docs/lint/ledger/diff与证据重建另见[最终导航复核](final-navigation-gates.json)，未因此重跑产品测试或覆盖率。
