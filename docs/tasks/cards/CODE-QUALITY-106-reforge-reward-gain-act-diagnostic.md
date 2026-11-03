# CODE-QUALITY-106 — Reforge reward-gain 测试 Promise 诊断

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-11-03
Template: task-card-v1 / 1.0.0

## 目标

清理packages/reforge/src/menu/reward-gain-queue.boundaries.test.ts的Vitest未等待Promise断言诊断，保持reward-gain输入、单次兑现、取消和资源清理合同不变。生产caller链为executeWorldItemUse→showItemUseResults→RewardGainQueue.present，输入caller为RuntimeInputPorts.consumeReward→handleRewardGainInput；scriptWorkWait在settle前释放execution wait，队列由同一owner管理当前条、timer、AbortSignal和Promise。

## 范围

白名单仅该测试文件、当前任务卡与docs/ops/evidence/CODE-QUALITY-106/；不改生产reward-gain-queue.ts、main.ts、公共接口或coverage配置。

## 前提与证据

固定源全文核读。根因与修改：修复前输入语义测试用void expect(pending).resolves...既没等待Promise也没把取消Promise结果纳入oracle，相邻menu回归出现“Promise returned by expect(...).resolves... was not awaited”诊断；修复后测试声明async：Enter推进后await expect(pending).resolves，Escape/其它键保持current后abort并await expect(pending2).rejects.toMatchObject({name:'AbortError'})。修复前相邻21files/118tests通过但有1条未await诊断（before.txt）；修复后定向1file/5tests与相邻均通过且stderr为零。原检查点全仓check exit0、lint-zero 4962文件0/0/0；official ratchet与protected fast当时均exit1复现shared/pal-extract/total baseline回退，未降阈值；check:docs、最终ledger、diff-check通过，失败与成功各保留原时点。

## 验收

父52逐文件接受该测试，接受SHA与当前源一致，原统一门与发布义务后续已闭合；本轮没有重跑产品或全仓门，不由局部零诊断外推全仓完成。

## 状态与交接

Status为done，仅收Promise等待、取消结果与测试资源归属；其它相邻诊断另走其范围，不外推整个Reforge或全仓runtime。

2026-11-03复核：原统一门与发布义务由[父52实际发布回执](QUALITY-REVIEW-52-CLOSEOUT-1.md#状态与交接)闭合；原件的待发布字段保留原时点。

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
