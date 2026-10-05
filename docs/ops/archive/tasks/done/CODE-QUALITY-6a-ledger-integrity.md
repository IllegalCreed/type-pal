# CODE-QUALITY-6a - 逐文件账本唯一性与清单对账门

Status: done
Phase: ops tooling
Capability: ops / code-quality
Coding Owner: Codex
Reviewer: Codex（复核并执行质量门；不冒充第三方）
Branch: codex/code-quality-governance

## 前提、范围与准入

用户要求逐文件治理，不能以包绿、重复行数或手填计数替代完成证据。此前 Q3u/Q3w 重复计数已由直接
路径对账检出；Q3t 还误替换 Q3s 的 battle-system 生产文件行。现有 `scripts/quality/code-quality-inventory.mjs`
只输出待核清单，`code-quality-inventory.test.mjs` 只验清单字段，不校验 Markdown 账本；
`docs/ops/audits/code-quality-file-ledger.md` 当前头部为 226/5/2735，tracked inventory 为 2966。

- primary/第一阶段/二阶段：N/A；本包只校验治理记录，不改变游戏机制、schema/save、生成物、UI或覆盖率规则。
- 直接 caller：根 `test:quality-tools` 的 `node --test scripts/quality/*.test.mjs`；新测试必须调用真实校验器。
- 最强替代解释：重复文件可能是相邻复核，不是新增完成；保留一条主记录，把相邻证据合并，不重复计数。
- 可证伪观察：重复路径、错计数、清单中新增/删除路径、非法状态或空证据仍可通过，即校验器失效。
- 白名单：新增 `scripts/quality/code-quality-ledger.mjs` 与专属测试；修正 ledger/总纲/本卡/board/index。
- 不做：不判断人是否真正读过源码，不自动标已验证，不自动删候选，不降低 lint/coverage 门。
- Codex：`premise verified`、`design agree`、`build allowed`。只允许只读校验和治理文档修正。

## 验收

- 同一路径只计一次；重复/未知路径、非法状态、缺证据、清单总数/状态汇总漂移均 fail-closed。
- 以真实 inventory 输出做对账；失败不得写文件，导入纯校验函数不得启动 CLI。
- 定向测试包括独立反例和实际仓库调用；补充根质量工具、docs、lint零诊断。
- 恢复 Q3s 被误替换的原账本行；历史测试/coverage 数值原样保留，不追溯伪造零诊断。

## 收口证据

- 机器 CLI：`node scripts/quality/code-quality-ledger.mjs` PASS — 2966 files; 226 closed / 5 review / 2735 pending；明确输出 semantic review still required。
- 质量工具：`node --test scripts/quality/*.test.mjs` 37/37 全绿；新增 ledger 专属测试 9 个，覆盖重复/未知路径、状态计数漂移、inventory 增删、表形状/状态/证据缺失、fenced 文本与真实仓库调用。
- 全仓 `pnpm check`：docs 914 Markdown / 4709 links / 313 tasks；content 149/1490；shared 16/131；game 298/3403；pal-extract 69/421；reforge 325/8682；editor 606/4845；migrate 95/723；Biome 3200 files，0 errors / 0 warnings / 0 infos。
- `pnpm coverage:ratchet` 与 `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`：726 files / 19,285 tests，statements 88.89%、branches 82.67%、functions 88.59%、lines 90.80%，基线不变、无回退、0 improvements。
- 文档/静态：`node scripts/docs/check.mjs --json` 0 issues，`git diff --check` 通过。
- 结论：记录完整性门已纳入正式 quality-tools runner；它只防重复/漂移/漏记，不替代逐文件源码语义审查；goal 仍未完成。

## 交接

2026-10-05 Codex：先完成账本事实核验，再实现机器门。Q3x 继续只读，禁止因为工具过门而宣布全仓已审。
2026-10-05 Codex：账本门、反例测试、全仓 check、ratchet、protected fast 和零诊断全部通过；卡转 done 后归档。

无下一位 Agent 提示词；本卡只完成治理记录完整性，不代表全仓源码治理完成。
