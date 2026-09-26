# GLM 物品纯逻辑六组

任务与白名单见[六组任务卡](../../ops/tasks/TEST-GLM-ITEM-LOGIC-1-world-use-residuals.md)，
共同规则见[后台补测两包](../background-tests-20260927/README.md)。
生产冻结 a95618fc（item.ts 221/326B，105 未命中臂仅选题）；GLM 已交付六组 45 行 + 6 针代表负控，
见[回执](receipt.md)与[evidence.json](evidence.json)。作者自验不替代 Codex 独立验收。

- [item-logic-mutants.mjs](item-logic-mutants.mjs)：同一 judge 的判据自测 10 例 + 45 项对照 +
  6 针代表负控（Vite load 隔离注入 + 运行态命中见证 + 生产 hash 校验）。
