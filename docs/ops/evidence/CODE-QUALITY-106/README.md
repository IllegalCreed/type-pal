# CODE-QUALITY-106 evidence — reward-gain 测试 Promise 生命周期诊断

Status: current review
Owner: Codex
Last reviewed: 2026-10-17

本目录记录 `reward-gain-queue.boundaries.test.ts` 的当前逐文件复核、真实生产 caller
和 Promise/Abort oracle。生产代码没有改动。

- [codex-current-review.md](codex-current-review.md)：文件、caller、生命周期、根因和结论。
- [before.txt](before.txt)：修复前相邻回归中的未 await 诊断。
- [targeted-after.txt](targeted-after.txt)：定向 1/5 结果。
- [adjacent-after.txt](adjacent-after.txt)：相邻 21/118 结果，零 stderr。
- [typecheck.txt](typecheck.txt)：Reforge typecheck。

coverage 与全仓质量门将在本批收口阶段记录；在统一 coverage 门通过前保持 `review`。
- [full-check.txt](full-check.txt)：全仓 `pnpm check` exit 0；各包 typecheck/test 与 lint-zero 通过。
- [ratchet.txt](ratchet.txt)：official `pnpm coverage:ratchet` exit 1，复现 shared/pal-extract/total baseline 回退。
- [protected-fast.txt](protected-fast.txt)：protected fast exit 1，复现同一回退和历史退役保护账。
