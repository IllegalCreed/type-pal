# Cursor — TEST-CURSOR-SCRIPT-PREVIEW-MEDIUM-1 证据

Owner: Cursor · Branch: `codex/cursor-script-preview-medium-r1` · BASE: `f5c7f904a3f623e3ca5b413ab43f78029d99fe11`

## 导航

| 文件 | 作用 |
|---|---|
| [contracts.json](contracts.json) | C1–C8 合同账、排重、unreachable |
| [directed-vitest.json](directed-vitest.json) | file×fullName×status（37/37 passed） |
| [counters.json](counters.json) | 6 枚反控索引 |
| [counters/](counters/) | 三态 JSON/raw + receipt |
| [receipt.json](receipt.json) | 交付回执 |

## 数量

| 项 | 值 |
|---|---|
| 执行 / 净新 | **37 / 37**（预算 32–45，上限 48） |
| 分组 | C1:7 C2:3 C3:5 C4:5 C5:4 C6:5 C7:4 C8:4 |
| 旧证明复测 | 0（已排重，见 contracts.dedupNotes） |
| unreachable | 1（typed state.label 必填 → C1-07 改空串合同） |
| 阻塞 | 0 |
| 反控 | 6/6 valid；old-green/new-red **3**（CTR-C1-01 / CTR-C4-01 / CTR-C6-01） |

## 新测文件（白名单）

- `packages/editor/src/core/script-flow-preview.cursor-mid-1.test.ts`
- `packages/editor/src/core/script-movement-preview.cursor-mid-1.test.ts`
- `packages/editor/src/core/script-preview-integration.cursor-mid-1.test.ts`
- fixture: `packages/editor/src/core/__tests__/cursor-preview-mid-1/`

产品源码 / 旧 `.cursor-r1` / 共享 targets / 任务卡：只读未改。

## 未完账

1. **DOC-PARENT-NAV**：共享 `docs/testing/medium-triple-20261002/README.md` 未链入 `cursor/` 子目录；该文件属 Codex 只读维护，贡献者无法在白名单内消掉 docs 门此条。请 Codex 验收时补一行导航。

其余等待 Codex 独立验收；不合 main、不标 done、不接官方门。
