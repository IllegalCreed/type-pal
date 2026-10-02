# Cursor — TEST-CURSOR-SCRIPT-PREVIEW-MEDIUM-1 证据（R3 窄返工）

Owner: Cursor · Branch: `codex/cursor-script-preview-medium-r1` · 候选起点: `6808d3ab1d920102603e801ab4dd0c68aa0a82bf`

## 导航

| 文件 | 作用 |
|---|---|
| [contracts.json](contracts.json) | 逐合同账 + 撤回/cross-check |
| [directed-vitest.json](directed-vitest.json) | file×fullName×status（执行 34） |
| [counters.json](counters.json) | 6 枚反控索引 |
| [counters/](counters/) | 三态 JSON/raw/scope + receipt（原字节保留，R3 仅重判） |
| [fixtures/](fixtures/) | 真实 Vitest afterEach 复合红原件 |
| [counter-judge.selftest.mjs](counter-judge.selftest.mjs) | 假绿拒收 + 真实复合/pending↔todo |
| [counter-cleanup.selftest.mjs](counter-cleanup.selftest.mjs) | 精确登记+inode 身份清理 |
| [cleanup-evidence/](cleanup-evidence/) | 临时树回收证据（见 [cleanup-evidence/README.md](cleanup-evidence/README.md)） |
| [receipt.json](receipt.json) | 交付回执 |

## 数量（保持）

| 项 | 值 |
|---|---|
| 执行 / 净新 | **34 / 33**（C4-03 cross-check） |
| 反控 | 6/6；old-green/new-red **3**（不重采） |

## R3 修复摘要

1. **CURSOR-R3-01**：完整 `failureMessages` 数组/全文；Pending/Todo 与真实叶状态闭合；真实 afterEach 复合与 pending↔todo 错配拒收自测；六针原字节重判。
2. **CURSOR-R3-02**：登记 `dev/ino` 目录身份 + 必要 Git worktree；同路径新 inode 替换拒删；成功/失败/中断仍只清本次对象。

## 未完账

1. **DOC-PARENT-NAV**：共享 `medium-triple-20261002/README.md` 链入 `cursor/` 仍属 Codex。

等待 Codex 独立验收；不合 main、不 done。
