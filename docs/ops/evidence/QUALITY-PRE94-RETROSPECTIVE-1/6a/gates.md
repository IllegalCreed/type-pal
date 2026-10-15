# 6a检查点静态门

cwd: /Users/zhangxu/.codex/worktrees/quality-3y-closeout/type-pal

定向/相邻与反控见test-proof.json；本检查点不等于统一全仓门。

| 门/原命令 | exit | 秒 | raw SHA256 |
|---|---|---|---|
| docs：`pnpm check:docs` | 0 | 2.01 | a8468ed93b8bb3353b1b1ed4451dded8614a93acba8d7994bda08af3c37b8c83 |
| lint：`pnpm lint` | 0 | 2.55 | f9b1f4e128b0b95c736a5cab7b8d4ddc2f765bc0c0ae162c39c61f1475583991 |
| ledger：`node scripts/quality/code-quality-ledger.mjs` | 0 | 2.16 | d6f20931eba3478b400f14f156a3a030fba17369bcb1c5a68f65ab2667099e3c |
| diff：`git diff --check` | 0 | 0.03 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |

原件为同名raw.gz。全仓check、官方ratchet、protected fast未重新执行，editor运行时诊断未清；0新增关闭、未合main。
