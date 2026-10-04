# Testing tools: domains/runtime/engine-boundaries/tools

这些脚本是按工程域归位的历史/反控工具，不代表当前 runtime、E2E 或 coverage 已通过。
每个工具的 source SHA、after SHA、caller/import/cwd/runner、合法输入、oracle、排重、截止日和停止线见
[布局收口计划](../../../../archive/migrations/testing-layout-closeout-20261004.json)。

- [phase1-dependency-refactor-audit.mjs](phase1-dependency-refactor-audit.mjs)
- [phase1-dependency-refactor-mutants.mjs](phase1-dependency-refactor-mutants.mjs)
- [reforge-asset-io-config.mts](reforge-asset-io-config.mts)
- [reforge-asset-io-mutants.mjs](reforge-asset-io-mutants.mjs)
- [reforge-runtime-contracts-config.mts](reforge-runtime-contracts-config.mts)
- [reforge-runtime-contracts-mutants.mjs](reforge-runtime-contracts-mutants.mjs)
- [reforge-runtime-contracts-review-witnesses.mjs](reforge-runtime-contracts-review-witnesses.mjs)
- [reforge-runtime-input-review-witness.mjs](reforge-runtime-input-review-witness.mjs)
- [runtime-frame-mutants.mjs](runtime-frame-mutants.mjs)
- [runtime-shell-mutants.mjs](runtime-shell-mutants.mjs)
- [runtime-shell-wave2-mutants.mjs](runtime-shell-wave2-mutants.mjs)
- [runtime-state-config.mts](runtime-state-config.mts)
- [runtime-state-mutants.mjs](runtime-state-mutants.mjs)
