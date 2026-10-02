# P NEXT2 Codex 独立原始证据

[接收结论](../codex-p-next2-acceptance-20261002.md)、[机器复核](../codex-p-next2-acceptance-20261002.json)、[运行原件 SHA256](manifest.json)、[先补的忽略资产](copied-assets.json)、[旧 PAL 精灵资产补齐清单](copied-sprite-assets.json)。

每相 `NAME.json.raw.txt` 是原始 Vitest JSON 字节；`NAME.run.json.raw.txt` 保留实际命令、cwd、exit/signal/spawn、完整 stdout/stderr 和执行前源码/测试/配置 hash。
四针：CURRENT-PERMISSION（01）、SAVE-BATCH-MEMO（04）、NONERROR-IO-MESSAGE（08）、NO-LOADER-SCAN-MESSAGE（12）。每相完整41身份，exit0/1/0，恰一指定AssertionError、精确恢复与变异重建hash、其它支持文件不变。
各正控明确复用最近真实恢复报告，不冒称额外重跑；失败原文与精确 from/to 都在机器复核。

全包 `p-full.json.raw.txt` 为3898通过/两旧PAL ENOENT，不是全绿。只读复制636个ignored sprites RLE到自有副本后，`p-old-pal-recovered.json.raw.txt` 复跑该旧文件；相同两失败身份均转绿。
不把局部恢复报告伪装成再次全包3900全绿；集成main时正式全包门仍由Codex负责。原stderr导航宿主未实现提示保留，不声称console零。
只复制自有临时树忽略依赖里的相同canvas@3.2.3构建，以及作者树readonly忽略资产，产品/作者树/真实工程/数据零写入。

`p-full-cli-attempt.run.json.raw.txt` 是Codex最初重复传入包脚本已经固定的maxWorkers参数，被CLI拒绝的原件；未收集测试，不算作者业务失败。修正调用后才产生上面的真正完整包报告。
完整helper/原日志保留 `/private/tmp/codex-oq-next2-review.ydLzy0`；仅退休本轮独占副本，不清作者树或其它临时目录。
