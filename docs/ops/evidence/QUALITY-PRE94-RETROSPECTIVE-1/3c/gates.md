# CODE3c检查点静态门

cwd: /Users/zhangxu/.codex/worktrees/quality-3y-closeout/type-pal

| 原命令 | exit | 秒 | raw SHA256 |
|---|---|---|---|
| `pnpm check:docs` | 0 | 2.222 | 0c0812efa6a4bd4855a13402f5cd1f5e3c25647dbbd2ee841cbaa185c4fa72f9 |
| `pnpm lint` | 0 | 2.774 | a7138b1f18bfa134a5a3319f738939c21e69ca3d865f1c4a1af7691fa43f4b1f |
| `node scripts/quality/code-quality-ledger.mjs` | 0 | 2.444 | 98a50a2c776741d223fc380dd927506dfd7a7f83f1e18e3e4f9fd7487c103d2a |
| `git diff --check` | 0 | 0.041 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |

同名raw.gz保存。docs为1350 Markdown/7250 links/441cards、0 issues，phase184/content570通过；本轮初始lint4407文件、0error/0warning/0info。ledger3287 inventory /213closed /211review /2863pending，0新增关闭。

目标1例及三业务反控均0运行时诊断；editor相邻36通过但6act，reforge22零诊断、editor typecheck通过。全仓check/official ratchet/protected fast未新跑，统一零诊断门未过，不合main；不得把退出0记为全部质量门通过。

最终JSON归档格式化后重跑`pnpm lint`：exit0；4408 files; 0 errors / 0 warnings / 0 infos; complete report。raw SHA256 60cdbf3326024485c3318f9171654ec30965f6a12e7d11e37502f5649da40e5a，见final-lint-zero.raw.gz。
