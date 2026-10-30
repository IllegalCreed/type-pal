# CODE-QUALITY-105 evidence — Reforge MenuBox 残余测试复核

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

原审计「CODE-QUALITY-105 evidence — Reforge MenuBox 残余测试复核」的主题按原文时点保留(摘录:本目录记录当前树对 `packages/reforge/src/menu/menu-box.residual.glm.test.ts` 的逐文件复核， 以及与 `menu-box.ts` 公开 cal)。

## 范围与证据

原报告含章节[CODE-QUALITY-105 evidence — Reforge MenuBox 残余测试复核]、8个链接;固定main源1417B(SHA 0f07977ab991)。当前存活入口:[adjacent.txt](adjacent.txt)、[codex-current-review.md](codex-current-review.md)、[counterproof-current.txt](counterproof-current.txt)、[full-check.txt](full-check.txt)、[protected-fast.txt](protected-fast.txt)、[ratchet.txt](ratchet.txt)

## 发现

原文发现/计数/日期按原时点保留在保全块;本页不重算审计结论。

## 结论

原结论保持原时点;治理不改写审计判定,不撤销旧撤信,不恢复旧完成声明。

## 整改与复核

本治理候选仅覆盖文档角色与保全;整改事实以原文与后继卡为准;候选待Owner接收。


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
