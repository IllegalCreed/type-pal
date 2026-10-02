# 三审实际运行与反例

对应[独立裁决](../codex-medium-r3-review-20261002.md)和[机器复算](../codex-medium-r3-review-20261002.json)。

- [runs.json](runs.json)：原命令/cwd/真实exit/signal/spawn、完整stdout/stderr原文（JSON字符串无损存储）。
- [cursor-real-composite.json](cursor-real-composite.json)：实际Vitest的一failed叶两failureMessages；
  [原始JSON字节](cursor-real-composite.json.raw.txt)与JSON视图字段值相同。
- [probes.json](probes.json)：原Cursor judge误收、Kimi实际转换拒收、pending/todo错配及同路径替换哨兵结果。
- [cursor-rejudged-generated.json](cursor-rejudged-generated.json)：在Codex副本实际重判/清理自测生成的完整输出，
  收集后副本恢复固定候选，仅便于按原树跑轻门，不写作者证据。
- [kimi-lint.complete.json](kimi-lint.complete.json)、[cursor-lint.complete.json](cursor-lint.complete.json)：完整Biome报告。
- [file-manifest.json](file-manifest.json)：上述工件SHA256与JSON视图/原始字节对照。

pending↔todo为明确标注的坏输入派生，不冒称原六针数据坏。所有临时哨兵为Codex本轮创建，
原登记对象保存在自有父目录，未登记作者/用户目录零写入。清理自测没有全局prune。
只退休本轮两个detached副本；原作者树、原history、父目录helpers/logs保持。
