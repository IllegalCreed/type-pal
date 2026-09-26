# GLM 同步守卫叶测试

任务与测试白名单见[六组任务卡](../../ops/tasks/TEST-GLM-CONTENT-GUARDS-2-leaf-boundaries.md)。
生产冻结51048353；GLM已交付（91行/6针反控/三模块四维100%），见[回执](receipt.md)与[evidence.json](evidence.json)。
产品/旧测试/统计范围零改；作者自验不替代Codex独立验收。

- [guard-leaf-mutants.mjs](guard-leaf-mutants.mjs)：1对照+6单点变异反控（Vite load隔离注入）。
- [guard-leaf-coverage.config.mjs](guard-leaf-coverage.config.mjs)：同口径before/after临时覆盖配置。
