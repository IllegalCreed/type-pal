# CODE-QUALITY-106 — Codex 当前验收（2026-10-17）

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「CODE-QUALITY-106 — Codex 当前验收（2026-10-17）」的治理候选页;证据原件即下方逐字节保全的固定main源(1786B,SHA 4d802d6fe9fe)。

## 来源与输入

来源为固定Git载体,非本次运行;原0个链接处置见作者review的linkDisposition。当前存活入口:无当前仓库内存活链接。

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1786B / SHA-256 4d802d6fe9fec20e303f2850f5f95552bc40d931b26d015ac904948249dad0bb；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-106 — Codex 当前验收（2026-10-17）

## 读取范围与 caller

完整读取 `reward-gain-queue.boundaries.test.ts`、`reward-gain-queue.ts`、既有
`reward-gain-queue.test.ts`、`script-work-queue.ts`、`runtime-input-router.ts`，以及
`main.ts` 中 `showItemUseResults`、`rewardGainQueue.present`、`consumeReward` 和输入冻结
条件。测试覆盖的是公开 `RewardGainQueue.present` 与 `handleRewardGainInput`，不是私有 helper。

`presentOne` 将 timer、AbortSignal listener、active request、resolve/reject 绑定为同一
settle owner；`advance`、timeout、abort 三路都必须只兑现一次。真实产品 caller 由物品使用
流程进入队列，输入 caller 由运行时路由消费 Enter/空格/Escape/其它键。

## 根因与修改

修复前测试在 Enter 分支用 `void expect(pending).resolves.toBeUndefined()`，在 abort 分支
用 `void pending2.catch(...)`，导致 Vitest 报未等待 Promise 诊断且取消结果没有业务 oracle。
修复后测试改为 async，并等待 resolve 与 AbortError reject；原有输入、current、active 和
单次兑现断言保持不变。

## 当前结果

- 修复前相邻：21 files / 118 tests PASS，但有一条 Vitest 未 await 诊断，见 `before.txt`。
- 修复后定向：1 file / 5 tests PASS，0 stderr。
- 修复后相邻：21 files / 118 tests PASS，0 stderr。
- Reforge typecheck：PASS。
- 没有生产实现、schema/save、公共接口或 coverage 范围变化。

## 裁决

该测试文件的诊断根因已修复，且取消 Promise 现在有真实可判别 oracle。文件保持
`review`，等待本批全仓 `pnpm check`、coverage ratchet/protected fast、lint-zero、
docs 和 ledger 收口；不因定向/相邻通过而宣布全仓完成。
```
<!-- incremental-original-source:end -->
