# Cursor — TEST-CURSOR-SCRIPT-PREVIEW-MEDIUM-1 证据（R1 窄返工）

Owner: Cursor · Branch: `codex/cursor-script-preview-medium-r1` · BASE: `f5c7f904a3f623e3ca5b413ab43f78029d99fe11`

## 导航

| 文件 | 作用 |
|---|---|
| [contracts.json](contracts.json) | 逐合同账 + 撤回/不可构造 |
| [directed-vitest.json](directed-vitest.json) | file×fullName×status（34/34） |
| [counters.json](counters.json) | 6 枚反控索引（重采后） |
| [counters/](counters/) | 三态 JSON/raw/scope + receipt + 三态 hash |
| [counters/_r0-history/](counters/_r0-history/) | 首轮历史单红/零执行旧绿原件 |
| [counter-judge.selftest.mjs](counter-judge.selftest.mjs) | collection+AssertionError 复合拒收 |
| [receipt.json](receipt.json) | 交付回执 |

## 数量（R1 后）

| 项 | 值 |
|---|---|
| 执行 / 净新 | **34 / 34**（不凑回 37） |
| 撤回 existing-proof | C1-04、C1-05 |
| unreachable | C1-07（空 label 被公开 validator 拒收） |
| 分组 | C1:4 C2:3 C3:5 C4:5 C5:4 C6:5 C7:4 C8:4 |
| 反控 | 6/6；old-green/new-red **3**（旧执行 3/12/12，非零） |

## R1 修复摘要

1. **CURSOR-R1-01**：共享 machine 改为非空合法 label；撤 C1-07。
2. **CURSOR-R1-02**：删 C1-04/C1-05 净新重复。
3. **CURSOR-R1-03**：旧测不再套用新 case grep；三枚旧绿真实非零。
4. **CURSOR-R1-04**：原 JSON 落盘；judge 始终对完整报告拒收 collection；声明 scope 另文件；产品/测试三态 hash；selftest 钉复合拒收。

## 临时树回收（资源交付硬要求）

- `node_modules`：**symlink**，禁止整仓递归复制。
- 并发 / 活树：`MAX_CONCURRENCY=1`、`MAX_LIVE_TREES=1`、磁盘软顶 2 GiB。
- 成功 / 失败 / SIGTERM：`counter-cleanup.selftest.mjs` + `cleanup-evidence/` 零残留实测。
- 只清本会话精确路径；`live-registry.json` 登记不可捕获终止遗留供核验，不做全局 prune。

## 未完账

1. **DOC-PARENT-NAV**：共享 `medium-triple-20261002/README.md` 链入 `cursor/` 仍属 Codex 只读维护。

等待 Codex 独立验收；不合 main、不 done。
