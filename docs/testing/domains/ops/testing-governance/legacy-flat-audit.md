---
testingSchema: 2
id: legacy-flat-audit
evidence: domains/ops/testing-governance/legacy-flat-audit.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"legacy-flat-audit","sourceRefs":[{"path":"scripts/docs/classify-testing-legacy.mjs","lines":"19-150","anchor":"const domainRules = [","role":"classification rules","sha256":"93d04fa7de97afc430e9e7a49fc2300b890afc474aa979bc998e66267ad815ef"},{"path":"docs/testing/legacy-flat.json","lines":"1-20","anchor":"\"schemaVersion\": 1","role":"legacy manifest","sha256":"5457deb986251b30c833992888600f45d0055d914bac3ce601619c45f872c454"},{"path":"packages/content/src/character.ts","lines":"168-170","anchor":"export const CONTENT_VERSION =","role":"current version","sha256":"375a1d94b6f6bdc79ea104a4d76744e96da5d7c70f866af8e71a8c0c1be6d5df"},{"path":"docs/testing/archive/migrations/testing-domains-20261004.json","lines":"1-107","anchor":"\"kind\": \"testing-document-domain-migration\"","role":"migration plan","sha256":"778bad605ecd58b59353df10af45d64c7ffc2b59e04c4f8d8eddfb15e9d51179"}],"publicCallers":["node scripts/docs/classify-testing-legacy.mjs","pnpm check:testing-docs"],"legalInputs":["tracked docs/testing root files","legacy-flat.json entries and retired records","source path references embedded in report bodies"],"businessOracle":{"type":"legacy-content-governance","assertions":["every legacy path has domain/module/capability/provenance/sourceSha/inventory","migrated files have retired SHA and canonical target","retained files have explicit reason and review status","Agent names do not leak into canonical targets"]},"dedupe":{"result":"reviewed","against":["docs/testing/legacy-flat-classification.json","docs/testing/archive/migrations/testing-domains-20261004.json","docs/testing/catalog.json"],"notes":"Classification is the complete census; only the 20-file reviewed batch is physically migrated. Retained legacy files are not silently deleted or promoted to verified."},"revision":{"currentSha":"35e2b8d07c310a15c69f5e013a6d748c2146042e","contentVersion":22,"minimumSaveVersion":11,"history":[{"revision":"35e2b8d07c310a15c69f5e013a6d748c2146042e","date":"2026-10-04","action":"full census + representative migration batch","notRun":["product runtime","old tests","coverage"]}]},"evidence":"domains/ops/testing-governance/legacy-flat-audit.json"}
-->

# Legacy flat 内容深审总账

本轮完成了根目录 legacy 文件的全量机器审计，而不是把所有历史材料盲搬。分类器读取每个文件的源 SHA、正文中的
`packages/*/src`/`scripts` 证据路径、标题、行数和历史/执行语义，再按工程域、模块和功能生成
[完整分类账](/docs/testing/legacy-flat-classification.json)。

## 当前裁决

| 维度 | 数量 | 裁决 |
|---|---:|---|
| 全量 census | 359 | 每一项都有 path、kind、domain、module、capability、provenance、sourceSha、inventory。 |
| 已迁移 | 20 | 12 项架构实验原文进入 `archive/architecture-regression-lab/`，8 项 runtime owner report/evidence 进入 `domains/runtime/`；源 SHA 在迁移计划和 `legacy-flat.json.retired` 保留。 |
| 保留 legacy | 339 | 仍被任务卡、工具、审计或历史引用，或尚未完成公开 caller/真实 oracle 深审；每项保留明确的 retain reason 和 `candidate-needs-depth-review` 标记。 |
| 物理删除 | 0 | 没有静默删除；后续批次必须先完成引用清理、canonical/evidence 配对和用户范围核对。 |

## 域/模块判定

文件名只提供初筛；只要正文出现唯一主导的 `packages/<domain>/src` 或 `scripts` 路径，分类器优先使用该工程域，
否则保留 filename-hint-only，避免把 Agent 名称或历史候选编号误当业务模块。迁移批次使用 reviewed-migration-batch，
原始 Agent 名称只保留为 provenance；canonical 目标采用 runtime/battle/scene/world 等工程语义。

## 停止线与待核项

- `retain-legacy` 不等于 verified，也不等于“可以永远留在根目录”；它是有理由的待核队列。
- 工具/反控文件尚未整体搬迁，因为它们可能含相对导入、临时宿主路径和唯一公开 caller；本轮先迁 report/evidence，
  工具要在下一批逐文件核 caller、cwd、输入、清理和真实反控后再移动。
- 旧历史 report 的通过数字、warnings、候选 SHA 和 counter 原样保留；source audit 不升级运行真实性。
- coverage、产品源码、旧测试和 coverage baseline 不在本批写入范围；文档中的旧路径只做必要链接重定位。

机器门 `check-testing.mjs` 会拒绝缺 source inventory、非完整 SHA、Agent 污染 canonical target、缺 migration target、
旧 E2E-002 路径、孤儿 evidence、catalog/metadata/evidence 不一致和依赖循环。后续迁移必须沿同一 gate 追加批次。
