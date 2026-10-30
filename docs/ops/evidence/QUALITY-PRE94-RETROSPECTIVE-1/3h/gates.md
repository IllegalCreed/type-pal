# CODE3h PNG 切片质量门

正式四测试正常9例通过，两个缺口各旧10绿/新8绿1指定AssertionError；错误上下文/close转移诊断单列，完整原件见before/after-proof。相邻game17文件107例、extract4文件16例，coverage工具74例通过，0失败/跳过/运行时诊断；game typecheck和四文件Biome通过。局部真实png.ts V8覆盖保持，只是局部对照。

最终docs、lint-zero、ledger与diff-check以[静态原件](static-gates.json)为准；原始输出按门名保存raw.gz。全仓check、官方ratchet、protected fast本片未新跑，editor全包诊断仍未清；不合main、0新增关闭。全83卡13partial/70pending/0整卡accept，统一门不得由局部绿替代。

首轮[静态回执](initial-static-gates.json)中证据重建通过，docs因父README漏掉3h子目录直链exit1，后续静态门未执行；对应initial-docs.raw.gz保留。补父导航后重新运行完整静态检查，不改写首次失败。
