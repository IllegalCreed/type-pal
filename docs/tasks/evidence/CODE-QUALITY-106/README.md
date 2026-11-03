# CODE-QUALITY-106 evidence — reward-gain 测试 Promise 生命周期诊断

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本目录记录 `reward-gain-queue.boundaries.test.ts` 的当前逐文件复核、真实生产 caller 和 Promise/Abort oracle。生产代码没有改动（Status current review,Owner Codex,2026-10-17）。

## 来源与输入

[codex-current-review.md](codex-current-review.md) 为文件、caller、生命周期、根因和结论正文;[before.txt](before.txt) 为修复前相邻回归中的未 await 诊断;[targeted-after.txt](targeted-after.txt) 为定向 1/5 结果;[adjacent-after.txt](adjacent-after.txt) 为相邻 21/118 结果零 stderr;[typecheck.txt](typecheck.txt) 为 Reforge typecheck。

## 断言与业务 oracle

settle owner 三路单次兑现（advance/timeout/abort）与 AbortError reject 等待是本批新增的可判别 oracle;原有输入/current/active 断言保持。

## 结果

[protected-fast.txt](protected-fast.txt) 为全仓 `pnpm check` exit 0（各包 typecheck/test 与 lint-zero 通过）;[ratchet.txt](ratchet.txt) 为 official coverage ratchet exit 1 复现 shared/pal-extract/total baseline 回退;[full-check.txt](https://github.com/IllegalCreed/type-pal/blob/eb223e8ae7b9f0062cbbaaf9869e890b6a974c91/docs/tasks/evidence/CODE-QUALITY-106/full-check.txt.gz) 为 protected fast exit 1 复现同一回退和历史退役保护账。

## 限制与复核

coverage 与全仓质量门按批收口记录;在统一 coverage 门通过前保持 review。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1149B / SHA-256 380d54be380f0b0f115e5d800dd81d4094ac0354be410f9f75db3fedce29da4e；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
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
```
<!-- incremental-original-source:end -->
