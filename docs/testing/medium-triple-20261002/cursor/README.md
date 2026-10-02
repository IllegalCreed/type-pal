# Cursor — TEST-CURSOR-SCRIPT-PREVIEW-MEDIUM-1 证据（R2 窄返工）

Owner: Cursor · Branch: `codex/cursor-script-preview-medium-r1` · 候选起点: `36e409420018f9c9cea4d70d70186e3c466f3a0b`

## 导航

| 文件 | 作用 |
|---|---|
| [contracts.json](contracts.json) | 逐合同账 + 撤回/cross-check |
| [directed-vitest.json](directed-vitest.json) | file×fullName×status（执行 34） |
| [counters.json](counters.json) | 6 枚反控索引 |
| [counters/](counters/) | 三态 JSON/raw/scope + receipt（原字节保留，R2 仅重判） |
| [counters/_r0-history/](counters/_r0-history/) | 首轮历史原件 |
| [counter-judge.selftest.mjs](counter-judge.selftest.mjs) | 五类假绿拒收 + 忠实正样本 |
| [counter-cleanup.selftest.mjs](counter-cleanup.selftest.mjs) | 精确登记清理 + 哨兵拒删 |
| [cleanup-evidence/](cleanup-evidence/) | 临时树回收证据（见 [cleanup-evidence/README.md](cleanup-evidence/README.md)） |
| [receipt.json](receipt.json) | 交付回执 |

## 数量（R2 后）

| 项 | 值 |
|---|---|
| 执行 / 净新 | **34 / 33**（C4-03 改记 cross-check） |
| 撤回 existing-proof | C1-04、C1-05 |
| unreachable | C1-07 |
| cross-check | C4-03（相对 C4-02） |
| 分组执行 | C1:4 C2:3 C3:5 C4:5 C5:4 C6:5 C7:4 C8:4 |
| 反控 | 6/6；old-green/new-red **3**（旧执行 3/12/12，不重采） |

## R2 修复摘要

1. **CURSOR-R2-01**：`commonChecks` 改为全叶多重 file×fullName + 顶层计数闭合；五类拒收自测；六针原 JSON 重判。
2. **CURSOR-R2-02**：`cleanupExact` 须本会话精确登记 **且** 合法临时父路径；禁止前缀即删 / git 失败 rm 兜底；哨兵拒收自测。
3. **CURSOR-R2-03**：C4-03 保留执行、净新≤33；本 README 链入 `cleanup-evidence/`（父共享导航仍 Codex）。

## 临时树回收

见 [cleanup-evidence/README.md](cleanup-evidence/README.md)。只清本会话精确路径；不清其它 counter 目录。

## 未完账

1. **DOC-PARENT-NAV**：共享 `medium-triple-20261002/README.md` 链入 `cursor/` 仍属 Codex。

等待 Codex 独立验收；不合 main、不 done。
