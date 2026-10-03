# Cursor — TEST-CURSOR-SCRIPT-PREVIEW-MEDIUM-1 证据（R4 窄返工）

Owner: Cursor · Branch: `codex/cursor-script-preview-medium-r1` · 候选起点: `ceeed04610247e60c463f2786cd533552050e563`

## 导航

| 文件 | 作用 |
|---|---|
| [contracts.json](contracts.json) | 逐合同账 + 撤回/cross-check |
| [directed-vitest.json](directed-vitest.json) | file×fullName×status（执行 34） |
| [counters.json](counters.json) | 6 枚反控索引 |
| [counters/](counters/) | 三态 JSON/raw/scope + receipt（原字节保留，R4 仅重判） |
| [fixtures/](fixtures/) | 真实 Vitest afterEach 复合红原件 |
| [counter-judge.selftest.mjs](counter-judge.selftest.mjs) | 假绿拒收（含严格 AssertionError 首部） |
| [counter-cleanup.selftest.mjs](counter-cleanup.selftest.mjs) | 精确登记+inode 身份+创建回滚 |
| [cleanup-evidence/](cleanup-evidence/) | 临时树回收证据（见 [cleanup-evidence/README.md](cleanup-evidence/README.md)） |
| [receipt.json](receipt.json) | 交付回执 |

## 数量（保持）

| 项 | 值 |
|---|---|
| 执行 / 净新 | **34 / 33**（C4-03 cross-check） |
| 反控 | 6/6；old-green/new-red **3**（不重采） |

## R4 修复摘要

1. **CURSOR-R4-01**：业务红仅认去 ANSI 后真实 `AssertionError` 首部；拒收 ReferenceError/TypeError/Error 仅消息含该词。
2. **CURSOR-R4-02**：创建失败回滚核对象/Git 身份；替换或 remove 失败保留路径，不 rm 兜底；仅未进 Git 的空创建对象可精确回收。

## 未完账

1. **DOC-PARENT-NAV**：共享 `medium-triple-20261002/README.md` 链入 `cursor/` 仍属 Codex。

等待 Codex 独立验收；不合 main、不 done。
