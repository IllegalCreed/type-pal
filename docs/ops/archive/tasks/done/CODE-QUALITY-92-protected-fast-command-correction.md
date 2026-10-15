# CODE-QUALITY-92 — protected fast 命令误标纠正

Status: done
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


### 2026-10-14 最新真实 protected fast

- 在最新治理提交 `06839866f`、`origin/main=cddf65557` 上实际执行 `TYPE_PAL_COVERAGE_BASE_REF=origin/main VITEST_MAX_WORKERS=1 pnpm coverage:fast`；7 包 731 files / 19,864 tests 均完成并通过原生测试。
- 门禁最终 `exit 1`，明确失败为 `候选 baseline 删除仍存在文件中的 fast tests: test-file: packages/game/src/core/event-rng-scene-restore.test.ts`。候选分支 baseline 仍是 d7 旧快照，主线已新增 RNG 测试；不能把这条删除当作批准退役，也不能恢复30条旧关闭。
- 同一真实结果的 coverage 汇总为 game `13805/15602` statements、total `70847/78780` statements，ratchet floor 也仍有精确回退；因此即使先处理 RNG baseline scope，coverage ratchet 仍需独立解决，不能降基线或加弱测试。原生 receipt：`docs/ops/evidence/CODE-QUALITY-92/protected-fast-current.txt`，exit：`protected-fast-current.exit`。
- 当前 ledger 保持 3271 / 340 closed / 42 review / 2889 pending；CODE83–89/91 的30条记录继续 review，CODE90 两文件继续 review。


### 2026-10-14 protected fast 在新 baseline 上通过

- 官方 ratchet 已在 `edbcad970` 更新 baseline，纳入 origin/main 的 RNG test 与本批 6 条真实 runner 合同。随后在同一治理分支执行 `TYPE_PAL_COVERAGE_BASE_REF=origin/main VITEST_MAX_WORKERS=1 pnpm coverage:fast`，7 包 731 files / 19,870 tests 全部通过。
- protected gate exit 0，候选 baseline 与 origin/main scope 通过；最终 consolidated game `13812/15602` statements、`9064/11373` branches、`12336/13685` lines，total `70854/78780` statements、`51557/61618` branches、`63306/68945` lines；工具报告相对 baseline 提升0项。receipt：`evidence/CODE-QUALITY-92/protected-fast-after-ratchet.txt`，exit：`protected-fast-after-ratchet.exit`。
- 30/30 当前文件与各自关闭提交源码字节一致；下一步仅剩全仓 `pnpm check`、最终 lint/docs/content-review/ledger，再恢复30条账本状态并把本卡收口。CODE90 两文件不随本卡恢复。


### 2026-10-14 收口

- Codex 独立验收：最新 baseline ratchet 与 `TYPE_PAL_COVERAGE_BASE_REF=origin/main VITEST_MAX_WORKERS=1 pnpm coverage:fast` 均 exit 0；7 包/731 files/19,870 tests；lint/docs/content-review/ledger 收口门待本次全仓 check 后补写。
- 30/30 当前源码与各自关闭提交字节一致；恢复 CODE83–89/CODE91 的30条账本记录为 `已验证`。CODE90 两文件、latest event-system 与其它 pending/review 不在本卡范围。
- 无下一位 Agent 提示词；本工程门纠错卡已完成，后续从最新账本选择下一批。

## 2026-10-16 当前候选复审（历史done保留）

本轮完整读取工程门与原件，核两份rawCombinedOutput SHA/exit以及同一收口commit中的full check真实原件；历史执行有直接支持，不能因“待补写”文案认定未跑。30源码当前20字节相同/10变化，旧30/30不能沿用；全部仍review，本轮不恢复关闭。成功输出未记录结构化环境，后续真实门须保存环境/refs/SHA，不能追补伪造旧捕获。详见[当前92复审](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/92/README.md)。本轮partial，非当前统一门或整卡accept。
