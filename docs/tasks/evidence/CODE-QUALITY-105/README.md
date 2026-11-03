# CODE-QUALITY-105 evidence — Reforge MenuBox 残余测试复核

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

本目录回答:当前树对 `packages/reforge/src/menu/menu-box.residual.glm.test.ts` 的逐文件复核及其与 `menu-box.ts` 公开 caller/相邻 oracle 的证据状态。历史 TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1 证据保持 historical,不被本目录升级为当前通过。

## 范围与证据

本批无产品代码或测试修改。[codex-current-review.md](codex-current-review.md) 为逐文件、caller、oracle、排重和结论正文;[targeted.txt](targeted.txt) 为五文件定向回归;[adjacent.txt](adjacent.txt) 为 menu 目录相邻回归及未 await 诊断;[typecheck.txt](typecheck.txt) 为 reforge typecheck;[counterproof-current.txt](counterproof-current.txt) 为当前源树 K1–K5 反控重放摘要。

## 发现

五个合同测试（两级框几何/闪烁相位/九行状态/中心定位/六格物品）均有 typed fixture 与 renderSpans/drawImage oracle,历史反控在当前源树重放逐针 red+restored green;menu-box.ts SHA 与历史冻结源一致。

## 结论

[full-check.txt](https://github.com/IllegalCreed/type-pal/blob/eb223e8ae7b9f0062cbbaaf9869e890b6a974c91/docs/tasks/evidence/CODE-QUALITY-105/full-check.txt.gz) 为批次全仓 `pnpm check` exit 0（各包测试与 typecheck 通过,lint-zero 0/0/0）;[protected-fast.txt](protected-fast.txt) 为 official coverage ratchet 因 shared/pal-extract/total baseline 回退 exit 1;[ratchet.txt](ratchet.txt) 为 protected fast 同一回退并复现历史退役保护账 exit 1。

## 整改与复核

coverage ratchet/protected fast 的既有 baseline 回退使状态保持 review;退出码 0 但带诊断不计硬门通过。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1417B / SHA-256 0f07977ab991f0e3888cba6b081e17ce57dbcf00bc5c73c892d698b5ce2c0da0；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
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
```
<!-- incremental-original-source:end -->
