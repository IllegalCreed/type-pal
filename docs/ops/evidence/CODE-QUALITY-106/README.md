# CODE-QUALITY-106 evidence — reward-gain 测试 Promise 生命周期诊断

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「CODE-QUALITY-106 evidence — reward-gain 测试 Promise 生命周期诊断」的治理候选页;证据原件即下方逐字节保全的固定main源(1149B,SHA 380d54be380f)。

## 来源与输入

来源为固定Git载体,非本次运行;原8个链接处置见作者review的linkDisposition。当前存活入口:[adjacent-after.txt](adjacent-after.txt) [before.txt](before.txt) [codex-current-review.md](codex-current-review.md) [full-check.txt](full-check.txt) [protected-fast.txt](protected-fast.txt) [ratchet.txt](ratchet.txt) [targeted-after.txt](targeted-after.txt) [typecheck.txt](typecheck.txt)。

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


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
