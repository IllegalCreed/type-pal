# O/Q 最终有限包实跑证据

对应[接收记录](../codex-oq-next-r2-acceptance-20261002.md)与[机器复核](../codex-oq-next-r2-acceptance-20261002.json)。

GE-*五针各original/mutated/restored的run.json为真实命令/cwd/exit/signal/spawn/完整stdout-stderr及源、测试、fixture、配置SHA。
vitest.json是机械格式视图，`*.vitest.json.raw.txt`保存原始JSON报告字节；对象值不变。
input-proof.json由最终纯factory与公开parser直接运行，证明140B敌表及id1/字段存在。
o/q-lint.complete.json保留完整Biome JSON，O重建/64再判与Q全包/typecheck/docs/verifier的run.json保留原输出。
[file-manifest.json](file-manifest.json)记录各工件SHA及原始JSON/格式视图对照。

这是本次最终五针重采，旧71没有重采；上轮五针留历史，不叠加目标数。不触作者/main/真实数据。
