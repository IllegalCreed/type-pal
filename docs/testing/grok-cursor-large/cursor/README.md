# Cursor asset / UI large：交付入口

[任务卡](../../../ops/tasks/TEST-CURSOR-ASSET-UI-LARGE-1.md) ·
[共同协议](../README.md) · [冻结分配](../targets.json)。

Coding Owner: Cursor。本目录为 **TEST-CURSOR-ASSET-UI-LARGE-1** 证据包（`codex/cursor-asset-ui-large-r1`），**不是 review/accept/done**。

## 当前实测账（本 worktree）

| artifact | 路径 | 计数 |
|---|---|---:|
| 定向 Vitest | [directed-vitest.json](./directed-vitest.json)（原始 [_vitest-raw.json](./_vitest-raw.json)） | **707** 例（707 passed / 0 failed） |
| 合同账 | [contracts.json](./contracts.json) | **707** 条 passed 合同 |
| 工作组 | C01–C10 × 7 | **70** |
| 有效反控 | [counters.json](./counters.json) + [counters/](./counters/) | **50** 枚三态 receipt |
| 视觉流程 | [flows/](./flows/README.md) | **12**（资源 6 / 设计控件 4 / 异步失败恢复 2） |
| 私有覆盖 | [coverage-delta.json](./coverage-delta.json) | 74 源中 72 有 private hits（非正式 ratchet；原始 JSON 受根 `.gitignore` 的 `coverage/` 规则忽略，不入库） |
| 缺陷/未证 | [defects.md](./defects.md) | |
| 候选回执 | [receipt.json](./receipt.json) | pending Codex |

## 工具与子目录

| 用途 | 脚本 / 目录 |
|---|---|
| 采集 directed JSON | [collect-directed.mjs](./collect-directed.mjs) |
| 生成 contracts | [generate-contracts.mjs](./generate-contracts.mjs) |
| 反控 runner | [counter.mjs](./counter.mjs) · [counter-judge.mjs](./counter-judge.mjs) · [run-counters.mjs](./run-counters.mjs) |
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
