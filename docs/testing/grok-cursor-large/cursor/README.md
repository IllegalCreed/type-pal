# Cursor asset / UI large：交付入口

[任务卡](../../../ops/tasks/TEST-CURSOR-ASSET-UI-LARGE-1.md) ·
[共同协议](../README.md) · [冻结分配](../targets.json)。

Coding Owner: Cursor。本目录为 **TEST-CURSOR-ASSET-UI-LARGE-1** 证据包（`codex/cursor-asset-ui-large-r1`），**不是 review/accept/done**。

## 当前实测账（本 worktree）

| artifact | 路径 | 计数 |
|---|---|---:|
| 定向 Vitest | [directed-vitest.json](./directed-vitest.json)（原始 [_vitest-raw.json](./_vitest-raw.json)） | **717** 例（717 passed / 0 failed） |
| 人工核定 | overrides `verification=human-ledger` | **18** human-ledger（staging-draft **699** ≠ humanVerified） |
| 合同账 | [contracts-index.json](./contracts-index.json) + [contracts/C01.json](./contracts/C01.json)…[C10.json](./contracts/C10.json) + [human overrides](./contract-human-overrides.json) | **717** 条（分片全文；候选与核定字段分离） |
| 工作组 | C01–C10 × 7（含 C06-G07） | **70** |
| 有效反控 | [counters.json](./counters.json) + [counters/](./counters/) | **54** 枚三态 / **54** 不同目标（净新 **50**；cross-check **4**：C09-04/29 + C05-08/09） |
| judge 自测 | [judge-selftest.json](./judge-selftest.json) | 四反例拒收 + baseline（R2 已闭，未重做） |
| 视觉流程 | [flows/](./flows/README.md) | **12/12**（R2 相位保留，本轮未重拍） |
| 净新估算 | contracts `existing-proof` | **702**（717−15；≥700；oldMatcher-none **565** 仍待全量同轴排重） |
| 私有覆盖 | [coverage-delta.json](./coverage-delta.json) | 74 源中 72 有 private hits（非正式 ratchet；原始 JSON 受根 `.gitignore` 的 `coverage/` 规则忽略，不入库） |
| 缺陷/未证 | [defects.md](./defects.md) | |
| 候选回执 | [receipt.json](./receipt.json) | pending Codex |

## 工具与子目录

| 用途 | 脚本 / 目录 |
|---|---|
| 采集 directed JSON | [collect-directed.mjs](./collect-directed.mjs) |
| 生成 contracts | [generate-contracts.mjs](./generate-contracts.mjs) → 分片 [contracts/](./contracts/) + 索引 [contracts-index.json](./contracts-index.json)（逐例解析测试源/产品条件片段/生产调用方；末次摘要 [generate-contracts-last.json](./generate-contracts-last.json)） |
| 反控 runner | [counter.mjs](./counter.mjs) · [counter-judge.mjs](./counter-judge.mjs) · [run-counters.mjs](./run-counters.mjs) |
| judge 拒收自测 / 重判 | [judge-selftest.mjs](./judge-selftest.mjs) · [rejudge-counters.mjs](./rejudge-counters.mjs) |
| 反控索引重建 | [rebuild-counters-index.mjs](./rebuild-counters-index.mjs) |
| 三态原证据 | [counters/](./counters/) |
| **12 功能视觉流程** | [flows/](./flows/README.md)（Playwright + 6013+ 隔离宿主） |

## 采集命令（repo 根）

```bash
node docs/testing/grok-cursor-large/cursor/collect-directed.mjs
node docs/testing/grok-cursor-large/cursor/generate-contracts.mjs
node docs/testing/grok-cursor-large/cursor/run-counters.mjs
node docs/testing/grok-cursor-large/cursor/flows/run-flows.mjs
node docs/testing/grok-cursor-large/verify-targets.mjs --owner cursor --base 0704d3de6d3d2a2099475a42f601b654bba08579
```

## 限制

- 不合 main、不标 done、不跑官方 ratchet；正式收益只认 Codex 并集实测。
- 自动脚本预览/完成流（world-sprite-behavior）停线只读。
- App/MapMode/ScriptEditor 等 GLM 剩余域只读，未拓展主合同。
