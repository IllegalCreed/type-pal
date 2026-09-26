# GLM 同步守卫叶测试

任务与测试白名单见[六组任务卡](../../ops/archive/tasks/done/TEST-GLM-CONTENT-GUARDS-2-leaf-boundaries.md)。
生产冻结51048353；r1候选b8e037cb被Codex counter（R1–R4），r2窄返工已交付（91行/判据自测+6针反控/
三模块四维100%作者tmp测量），见[回执](receipt.md)与[evidence.json](evidence.json)。
产品/旧测试/统计范围零改；作者自验不替代Codex独立验收。

- [guard-leaf-mutants.mjs](guard-leaf-mutants.mjs)：同一judge判据的自测10例+1对照+6单点变异（Vite load
  隔离注入+运行态命中见证）。
- [guard-leaf-coverage.config.mjs](guard-leaf-coverage.config.mjs)：同口径before/after临时覆盖配置。
