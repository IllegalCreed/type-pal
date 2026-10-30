# CODE-QUALITY-105 evidence — Reforge MenuBox 残余测试复核

Status: current review
Owner: Codex
Last reviewed: 2026-10-17

本目录记录当前树对 `packages/reforge/src/menu/menu-box.residual.glm.test.ts` 的逐文件复核，
以及与 `menu-box.ts` 公开 caller/相邻 oracle 的证据。历史 TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1
证据保持 historical，不被本目录升级为当前通过。

- [codex-current-review.md](codex-current-review.md)：逐文件、caller、oracle、排重和结论。
- [targeted.txt](targeted.txt)：五文件定向回归。
- [adjacent.txt](adjacent.txt)：menu 目录相邻回归及未 await 诊断。
- [typecheck.txt](typecheck.txt)：reforge typecheck。
- [counterproof-current.txt](counterproof-current.txt)：当前源树 K1–K5 反控重放摘要。

本批无产品代码或测试修改；coverage ratchet/protected fast 的既有 baseline 回退使状态保持
`review`。退出码 0 但带诊断不计硬门通过。
- [full-check.txt](full-check.txt)：批次全仓 `pnpm check`，exit 0；各包测试与 typecheck 通过，lint-zero 0/0/0。
- [ratchet.txt](ratchet.txt)：official `pnpm coverage:ratchet`，因 shared/pal-extract/total baseline 回退 exit 1。
- [protected-fast.txt](protected-fast.txt)：`TYPE_PAL_COVERAGE_BASE_REF=origin/main node scripts/coverage/run.mjs fast`，同一覆盖率回退并复现历史退役保护账，exit 1。
