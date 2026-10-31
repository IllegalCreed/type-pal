# CODE-QUALITY-106 — Reforge reward-gain 测试 Promise 诊断

Status: review
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

保留原卡「CODE-QUALITY-106 — Reforge reward-gain 测试 Promise 诊断」的任务归属与历史边界。原目标见原文(摘录:Reviewer: Codex（独立验收） Capability: reforge / menu / test-host diagnostics Visual Verification Timing:);本页治理不重开已终态任务。

## 范围

原卡含章节[CODE-QUALITY-106 — Reforge reward-gain 测试 Promise 诊断、目标与白名单、逐文件与生产链读取、根因与修改、验证与未闭合项、下一步],共0个原文链接。治理范围仅限文档角色、保全与链接处置,不改产品/测试/coverage。

## 前提与证据

固定main源3147B(SHA 7e9a711700a4);原卡前提按原时点保留。当前存活入口:无当前仓库内存活链接。

## 验收

本页治理验收=模板符合+原文逐字节保全+链接处置如实;原卡验收结论保持原时点(原Status:review),治理不改写。

## 状态与交接

review保持原语义;本治理候选为作者稿(partial/needs),交Owner非作者接收;无新执行授权。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3147B / SHA-256 7e9a711700a4d0cce6b1a2217c4fb9f20d889182dbdcff07aeabb905f8fc2599；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-106 — Reforge reward-gain 测试 Promise 诊断

Status: review
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase2
Capability: reforge / menu / test-host diagnostics
Visual Verification Timing: N/A（仅测试生命周期合同）

## 目标与白名单

清理 `packages/reforge/src/menu/reward-gain-queue.boundaries.test.ts` 的 Vitest 未等待
Promise 断言诊断，保持 reward-gain 的输入、单次兑现、取消和资源清理合同不变。
白名单仅包含该测试文件、当前任务卡和 `docs/ops/evidence/CODE-QUALITY-106/`；不改生产
`reward-gain-queue.ts`、`main.ts`、公共接口或 coverage 配置。

## 逐文件与生产链读取

已完整读取：

- `packages/reforge/src/menu/reward-gain-queue.boundaries.test.ts`
- `packages/reforge/src/menu/reward-gain-queue.ts`
- `packages/reforge/src/menu/reward-gain-queue.test.ts`
- `packages/reforge/src/script-work-queue.ts`
- `packages/reforge/src/main.ts` 中 `showItemUseResults`、`rewardGainQueue.present`、
  `RuntimeInputPorts.consumeReward` 和大世界输入冻结条件
- `packages/reforge/src/runtime-input-router.ts` 及其真实 fixture/oracle
- `docs/ops/archive/tasks/done/D14-3-reward-event-bus.md`、
  `docs/ops/archive/tasks/done/TEST-RUNTIME-STATE-BOUNDARIES-1-state-and-metadata.md`

生产 caller 链为 `executeWorldItemUse → showItemUseResults → RewardGainQueue.present`，
输入 caller 为 `RuntimeInputPorts.consumeReward → handleRewardGainInput`。`scriptWorkWait`
在 settle 前释放 execution wait，队列由同一 owner 管理当前条、timer、AbortSignal 和 Promise。

## 根因与修改

修复前输入语义测试用 `void expect(pending).resolves...`，既没有等待 Promise，也没有把
取消 Promise 的结果纳入 oracle，因此相邻 menu 回归出现 Vitest “Promise returned by
expect(...).resolves... was not awaited” 诊断。修复后测试声明为 async：Enter 推进后
`await expect(pending).resolves`，Escape/其它键保持 current 后 abort，并
`await expect(pending2).rejects.toMatchObject({ name: 'AbortError' })`。

这只修测试宿主生命周期与判别力，不改变输入语义、队列实现、timer、取消传播或产品行为。

## 验证与未闭合项

- 修复前相邻 21 files / 118 tests 通过但有一条未 await 诊断；原始输出见 `before.txt`。
- 修复后定向 1 file / 5 tests、相邻 21 files / 118 tests 均通过且 stderr 为零。
- Reforge typecheck：PASS。
- 全仓 `pnpm check`：exit 0；content 1498/1498、shared 126、game 3613、pal-extract 434、
  reforge 8964、editor 4943、migrate 739，lint-zero 4962 files 0/0/0。
- official coverage ratchet 与 protected fast：均 exit 1，复现 shared/pal-extract/total
  baseline 回退；未降低阈值或更新 baseline。
- check:docs、最终 ledger、diff-check：通过。
- 本卡保持 `review`，不把局部零诊断外推为全仓完成。

## 下一步

coverage 与全仓统一门收口后复验本卡；若其它相邻测试仍有诊断，另开最小白名单卡，
不把当前零诊断外推为整个 Reforge 或全仓 runtime 完成。
```
<!-- incremental-original-source:end -->
