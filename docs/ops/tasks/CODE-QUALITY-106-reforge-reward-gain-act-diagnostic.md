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
