---
testingSchema: 2
id: legacy-flat-audit
evidence: domains/ops/testing-governance/legacy-flat-audit.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"legacy-flat-audit","sourceRefs":[{"path":"scripts/docs/classify-testing-legacy.mjs","lines":"24-45","anchor":"const domainRules = [","role":"classification rules","sha256":"e564e0b4184cc0e6af06fbf5989eff30f2b5821bf7f96b68f938abc2e71d886f"},{"path":"docs/testing/legacy-flat.json","lines":"1-20","anchor":"\"schemaVersion\": 1","role":"legacy manifest","sha256":"104f659cc1408120b75f6e6f40061295645937307321d95747a32a1204e6a7c8"},{"path":"packages/content/src/character.ts","lines":"168-170","anchor":"export const CONTENT_VERSION =","role":"current version","sha256":"375a1d94b6f6bdc79ea104a4d76744e96da5d7c70f866af8e71a8c0c1be6d5df"},{"path":"docs/testing/archive/migrations/legacy-full-closeout-plan.json","lines":"1-16","anchor":"\"id\": \"legacy-full-closeout-plan\"","role":"full closeout plan","sha256":"7e7baa8eb62d73d30cc60ad611786e3ee1864f290e545c3a997926ba87deb777"},{"path":"docs/testing/archive/migrations/legacy-full-closeout-relocation.json","lines":"1-16","anchor":"\"id\": \"legacy-full-closeout-relocation\"","role":"relocation plan","sha256":"bf6d5c9654aec5cecbdca8ea45e7cadee5f2af9bbf957aaacdf9b5d41c8e9daf"},{"path":"docs/testing/archive/migrations/testing-layout-closeout-20261004.json","lines":"1-16","anchor":"\"id\": \"testing-layout-closeout-20261004\"","role":"root layout closeout plan","sha256":"01eb6b7156e958d68435f558cb35b4d2859f44f2b0c032500bd536cf28ba593f"}],"publicCallers":["node scripts/docs/classify-testing-legacy.mjs","pnpm check:testing-docs"],"legalInputs":["tracked docs/testing root files","legacy-flat.json entries and retired records","source path references embedded in report bodies"],"businessOracle":{"type":"legacy-content-governance","assertions":["every legacy path has domain/module/capability/provenance/sourceSha/inventory","migrated files have retired SHA and canonical target","retained files have explicit reason and review status","Agent names do not leak into canonical targets"]},"dedupe":{"result":"reviewed","against":["docs/testing/legacy-flat-classification.json","docs/testing/archive/migrations/legacy-full-closeout-plan.json","docs/testing/archive/migrations/legacy-full-closeout-relocation.json","docs/testing/archive/migrations/testing-layout-closeout-20261004.json","docs/testing/catalog.json"],"notes":"The closeout plan is the complete 331-item decision ledger; archive moves preserve source SHA, while tools remain only with explicit stop lines."},"revision":{"currentSha":"fecf1dab93468b40752667987c7c75a29fe9af6b","contentVersion":22,"minimumSaveVersion":11,"history":[{"revision":"35e2b8d07c310a15c69f5e013a6d748c2146042e","date":"2026-10-04","action":"full census + representative migration batch","notRun":["product runtime","old tests","coverage"]},{"revision":"fecf1dab93468b40752667987c7c75a29fe9af6b","date":"2026-10-04","action":"legacy full closeout: 209 archive moves + 122 tool stop-lines","notRun":["product runtime","old tests","coverage"]}]},"evidence":"domains/ops/testing-governance/legacy-flat-audit.json"}
-->

# Legacy flat 内容深审总账

本轮完成了根目录 legacy 文件的全量机器审计，而不是把所有历史材料盲搬。分类器读取每个文件的源 SHA、正文中的
`packages/*/src`/`scripts` 证据路径、标题、行数和历史/执行语义，再按工程域、模块和功能生成
[完整分类账](/docs/testing/legacy-flat-classification.json)。

## 当前裁决

| 维度 | 数量 | 裁决 |
|---|---:|---|
| 全量 census | 359 | 每一项都有 path、kind、domain、module、capability、provenance、sourceSha、inventory。 |
| 已迁移/归档 | 359 | 28 项前批 canonical/历史迁移、209 项非工具材料归档，以及本轮 122 个工具归入 `domains/*/*/tools`；源/归档 SHA、supersedes 和迁移计划保留在 manifest。 |
| 根目录平铺工具 | 0 | 工具入口已按 domain/module 归位；工具 README、caller/import/cwd/runner/停止线和布局 after SHA 见布局计划。 |
| 待深审 | 0 | 分类账 `reviewStatus` 已全量为 `reviewed`；任何未来恢复为当前合同都必须新建 catalog canonical/evidence 配对。 |
| 物理删除 | 0 | 没有静默删除；所有历史材料可由 Git 和 archive 迁移计划恢复。 |

## 域/模块判定

文件名只提供初筛；只要正文出现唯一主导的 `packages/<domain>/src` 或 `scripts` 路径，分类器优先使用该工程域，
否则保留 filename-hint-only，避免把 Agent 名称或历史候选编号误当业务模块。归档目标使用 runtime/editor/content/quality 等工程域，
原始 Agent 名称只保留在 archive 文件名和 provenance，不进入 canonical 语义；工具仍保留原路径以避免相对导入和公开 runner 断裂。

## 停止线与待核项

- 工具不再留在根目录：122 项按 domain/module 归位，旧相对 import 和公开 runner 由布局计划逐项重基；布局移动不宣称 runtime 通过。
- 非工具材料不再留在根目录：209 项已按 domain/module 归档，旧链接已由 SHA 锁定 relocation plan 重写，历史正文未改写。
- 旧历史 report 的通过数字、warnings、候选 SHA 和 counter 原样保留；source audit 不升级运行真实性。
- coverage、产品源码、旧测试和 coverage baseline 不在本批写入范围；文档中的旧路径只做必要链接重定位。

机器门 `check-testing.mjs` 会拒绝缺 source inventory、非完整 SHA、Agent 污染 canonical target、缺 migration target、
旧 E2E-002 路径、孤儿 evidence、catalog/metadata/evidence 不一致和依赖循环。完整决策与字段见
[`legacy-full-closeout-plan.json`](../../../archive/migrations/legacy-full-closeout-plan.json)，实际移动见
[`legacy-full-closeout-relocation.json`](../../../archive/migrations/legacy-full-closeout-relocation.json) 和
[`testing-layout-closeout-20261004.json`](../../../archive/migrations/testing-layout-closeout-20261004.json)。
