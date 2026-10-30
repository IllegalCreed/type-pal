# Extract原盘执行检查点静态门

cwd: /Users/zhangxu/.codex/worktrees/quality-3y-closeout/type-pal

定向36/shared126/typecheck通过；完整extract432原生绿仍4stderr块，不通过统一零诊断验收。完整check/official ratchet/protected fast未新跑，不合main。实际静态回执待原命令完成后追加。

| 原命令 | exit | 秒 | raw SHA256 |
|---|---|---|---|
| `pnpm check:docs` | 0 | 1.384 | ee3875950f101b95fa2a883691224e2619df531ace84f59519a9334f82a345e2 |
| `pnpm lint` | 0 | 2.385 | 6c5bd7dc30687d17a43b3645b5b766bee4b535ca3e5fb8c4cea3e2d5819b4349 |
| `pnpm test:coverage-tools` | 0 | 3.386 | a8fba98c3c8bb857032c86f265befd7b8df7d3e60a69faa8e120ef144e56b6f8 |
| `node scripts/quality/code-quality-ledger.mjs` | 0 | 1.1 | bd9d3b01d7269988344484dca8315d350c8b28d4e97e3b9ada3237f44b2036b6 |
| `git diff --check` | 0 | 0.023 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |

同名raw.gz保留原始回执。docs1358 Markdown /7324 local links /443cards，48工具测试、testing/phase184/content570均0 issues；coverage-tools70通过；lint4445文件0 errors/0 warnings/0 infos。ledger原命令3288 inventory /209closed /220review /2859pending；四测试/helper列review，0关闭。完整extract432原生绿仍4stderr块/46行，不通过统一零诊断验收。

最终归档后 `pnpm check:docs`：exit0、1.342秒；raw SHA256 fae3f383147a88ea4bcb51c89a5b8f5df3c688ba73f28af924e5058016fa225a，见initial-final-docs.raw.gz。

最终归档后 `pnpm lint`：exit0、2.348秒；raw SHA256 91f1373527fca927e76302638cca93277c009b55e95bceea55101a001724bdc2，见initial-final-lint-zero.raw.gz。

以上初次“最终”回执保留为initial-final原件；随后空块0/7转移补证使当前源码变化，后续最终重跑另记，不能把本段旧回执当作当前版本统一通过。

0/7转移与原件最终归档后 `pnpm check:docs`：exit0、1.446秒；raw SHA256 7c60f4f63ca586e0cd71f3989cc19df210ff5cb66fa3d0e646a5a9e152b50b7a，见final-docs.raw.gz。

0/7转移与原件最终归档后 `pnpm lint`：exit0、2.229秒；raw SHA256 9f103e54a305d552d69cca30c9e32ebfb21275d662607177cec71a4e9e48f0c1，见final-lint-zero.raw.gz。

0/7转移与原件最终归档后 `node scripts/quality/code-quality-ledger.mjs`：exit0、1.128秒；raw SHA256 bd9d3b01d7269988344484dca8315d350c8b28d4e97e3b9ada3237f44b2036b6，见final-ledger.raw.gz。
