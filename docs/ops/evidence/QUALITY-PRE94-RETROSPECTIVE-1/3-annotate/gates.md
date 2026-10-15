# CODE3/3f检查点静态门

cwd: /Users/zhangxu/.codex/worktrees/quality-3y-closeout/type-pal

定向52、shared126/typecheck、extract typecheck与coverage工具70通过；完整extract433原生绿含10 stderr块/六早退，包验收未过。全仓check/official ratchet/protected fast未新跑，editor诊断未清，不合main。

静态原命令回执将在实际执行后追加，不能把本检查点标成完整治理批次关闭。

| 原命令 | exit | 秒 | raw SHA256 |
|---|---|---|---|
| `pnpm check:docs` | 0 | 1.267 | 7ebdc606516308e00cdd10f8690dc78a054d0f858d017303a13d1453629e24cd |
| `pnpm lint` | 0 | 2.306 | a667d4b6570f39ec4b96359580a26e4a8b8339e28a5bc184ebc242284265afbf |
| `node scripts/quality/code-quality-ledger.mjs` | 0 | 1.12 | 1c6ce34c7d3251ffb0a4213a498cc6c15112ad797f1952057659554ac7e605ff |
| `git diff --check` | 0 | 0.033 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |

同名raw.gz保留原件。docs为1356 Markdown /7297 local links /443 cards，0 issues；48 docs-tool tests、phase184/content570通过。lint-zero检查4428文件，error/warning/info全部0；ledger实际3287 inventory /209 closed /216 review /2862 pending。两条历史关闭转review，0新增关闭；机器绿不代表语义复审完成。

最终归档后 `pnpm check:docs`：exit0，1.263秒；raw SHA256 9d1f463f881a66926e0b198cf349777356aec35c2da9bcd9a57b6d4e33a1ed2a，见final-docs.raw.gz。

最终归档后 `pnpm lint`：exit0，2.155秒；raw SHA256 20931e7c2e4b4e60fb23fd1ba3f9ca0a0ae433efea8d9ce263ac48f18e7e966f，见final-lint-zero.raw.gz。

最终lint检查4429文件，0 errors /0 warnings /0 infos；完整报告见final-lint-zero.raw.gz。
