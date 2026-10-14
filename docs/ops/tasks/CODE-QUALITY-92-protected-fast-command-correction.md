# CODE-QUALITY-92 — protected fast 命令误标纠正

Status: rework
Phase: engineering
Capability: 全仓代码治理质量门
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立复核）
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Contributor: Codex
Branch: codex/code-quality-3y

## 目标与范围

纠正 CODE83–89、CODE91 将 `pnpm check:fast` 误标 protected fast 的门禁结论。范围限本卡、账本、导航、审查增量及 evidence/CODE-QUALITY-92；不改30条关联文件、测试断言或产品。

## 前提与上下文锚点

- 原版/第一阶段/第二阶段产品真值：N/A，纯工程门纠错，不改变产品。
- 一手证据：`scripts/coverage/run.mjs:403-462,526-558`，只有设置 TYPE_PAL_COVERAGE_BASE_REF 的 coverage fast 才保护目标 baseline 的比例和存量生产/测试范围；`pnpm check:fast` 是另一条检查命令。
- 历史真门示例：CODE48 卡明确 `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`。
- 错误原件：CODE83–89、CODE91 卡/日志实际执行 pnpm check:fast；保留命令、计数与先前结论，补当前 counter，不追溯伪造 protected 运行。
- 当前 ledger：机器 inventory3271，关联30条由已验证转review；closed340/review42/pending2889。
- 反证：若旧原件可直接证明执行了带 origin/main 保护的 coverage fast，则相应记录可单独复核恢复，不能从 check:fast exit0 推断。
- AGENTS.md：硬门零诊断、未知不关闭；用户要求逐文件证据与完整质量门，不能用包级全绿作文件完成。

## 准入与验收

- Codex 已核定前提、唯一 Owner 和范围；build allowed 仅限纠错记录/门执行，不允许改产品、规则、ignore/exclude、assertion 或手工拼 baseline。
- 30条旧语义审查保留，但目前不是有效完成状态；原 done 卡保留历史身份，当前 counter 由本卡及账本承载。
- 在最新同步基点完成全仓 check、official ratchet、**真正的 protected coverage fast**、静态0/0/0、docs/content-review/ledger。
- 逐一比对每个关联文件当前 Git blob 与各自关闭提交的源码；不同者维持review并重新逐文件核验，相同者可引用原完整读/primary/caller/oracle加本轮真实门恢复。
- 正确命令：`TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`。并发资源限制可披露，不能改变 timeout/范围/断言/规则。
- CODE90 两文件及最新 event-system 的独立未闭合项不因本卡恢复旧记录而关闭。

## 交接日志

- 2026-10-14 Codex：发现 protected gate 命令误标，明确告知用户；建立当前counter并暂转30条review。最新 full check 在7a93336c6源基点完整通过（worker1；7包check与lint4031、0/0/0）；下一步 official ratchet→两父基线核对→真正protected coverage fast→逐文件源快照检查，不宣布专项完成。

## 下一位 Agent 提示词

继续 CODE92 工程门纠错；先读 AGENTS.md、code-quality-governance/ledger、脚本真门与本卡。保持单Agent，不能改30条源码或产品/规则。保留旧实际日志，执行当前真实门，逐一比较源快照。只对证据和门均齐全的文件恢复关闭，差异/未知继续review。CODE90/53/57/79/80/81及event-system独立counter不自动消失。

- 2026-10-14 源快照核对：30/30 当前文件与各自旧任务归档/关闭提交的源码字节一致，逐条closureCommit/双SHA256见 evidence/CODE-QUALITY-92/source-snapshot-comparison.json。原语义/primary/caller/oracle证据可沿用；真实受保护覆盖门尚未通过前仍review。
