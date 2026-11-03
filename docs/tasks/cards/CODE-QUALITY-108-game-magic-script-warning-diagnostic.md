# CODE-QUALITY-108 — game magic-script warning ownership

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-11-03
Template: task-card-v1 / 1.0.0

## 目标

记录原magic-script两条预期warning的stderr归属修复：缺失入口应返回false并报告warning，不能静音或改成成功。原L_99999输入属于原时点；后继使用合法WORD域内未注册的65000，保留失败、零HP变化与精确warning。primary锚为SDLPal uigame.c:740-873、script.c:867-1102、global.c:1254-1330与全局label ownership。

## 范围

白名单仅magic-script.test.ts；相关实现与caller（magic-script.ts、in-game-magic-menu、menu-driver、script-catalog、event-system、战斗actions/magic、player-poison-state）只读核验不修改。

## 前提与证据

原检查点固定源全文核读。实施：两个既有测试各自vi.spyOn(console,'warn')捕获并精确断言warning、finally恢复spy；业务断言unchanged——缺失label返回false、scriptOnSuccess不执行、HP不变。修复前1file/37tests PASS但2条缺失L_99999 stderr；修复后同37tests PASS 0 stderr；game menu相邻40files/377tests PASS 0 stderr；game typecheck过。2026-10-17收口：全仓check exit0（lint 4962文件0/0/0）、check:docs/ledger/git diff --check通过、账本3307/231closed/30review/3046pending；official ratchet与protected fast保留真实失败（shared 447/466 statements、203/218 branches，pal-extract 1068/1546 statements、461/593 branches、111/140 functions、943/1367 lines及总量回退），本批未调baseline。

## 验收

原两条warning保持业务可观察并精确校验消息/次数，未改返回false、零HP变化和不执行后续脚本的负面合同。[runner职责承接](../evidence/QUALITY-PENDING-100-3/organization-magic-runner.json)与后继[magic API原件](../evidence/QUALITY-PENDING-100-3/organization-magic-api.json)分别承接控制流、阶段组合测试及两项刷新warning反控，当前输出SHA已核；不由本卡新增整实现文件质量信用。

## 状态与交接

Status为done，仅收两条预期warning的测试归属与发布；旧shared/pal-extract回退是原检查点，不作为当前阻塞。没有新增法术行为、产品取舍或全game runtime验收。

2026-11-03复核：原统一门与发布义务由[第三窗口实际发布回执](QUALITY-PENDING-100-3.md#状态与交接)闭合；冻结原件的待发布字段保留原时点。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3040B / SHA-256 d8d67c83e52ceefc09433921c075e4b7f550c27fd483021cc7a4073c026a85d6；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-108 — game magic-script warning ownership

Status: review
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1
Capability: game / menu / diagnostic ownership
Visual Verification Timing: N/A（测试宿主诊断，不改产品行为）

## 目标与白名单

清理 `magic-script.test.ts` 两个真实预期 warning 的 stderr 泄漏，同时保留生产
fail-closed 诊断和业务反例：

- `packages/game/src/core/menu/magic-script.test.ts`

相关实现与 caller 只读核验，不在本批修改：
`magic-script.ts`、`in-game-magic-menu.ts`、`menu-driver.ts`、`script-catalog.ts`、
`event-system.ts`、战斗 `actions/magic.ts`、`player-poison-state.ts`。

## 准入与事实

完整读取实现、测试、真实大世界/战斗 caller、全局 label ownership 和 SDLPal
`uigame.c:740-873`、`script.c:867-1102`、`global.c:1254-1330`。两个 warning 都来自
测试主动传入缺失 `L_99999`；生产 runner 应返回 false 并报告 warning，不能静音或改成成功。

## 实施

两个既有测试各自通过 `vi.spyOn(console, 'warn')` 捕获并精确断言 warning，使用 `finally`
恢复 spy。业务断言 unchanged：缺失 label 返回 false、scriptOnSuccess 不执行、HP 不变。
没有生产源码、schema/save、公共接口、生成物或 coverage 配置改动。

## 当前验证

- 修复前：1 file / 37 tests PASS，2 条 stderr。
- 修复后定向：1 file / 37 tests PASS，0 stderr。
- game menu 相邻：40 files / 377 tests PASS，0 stderr。
- game typecheck：PASS。

## 收口要求与未决项

批次收口前必须补完整 `pnpm check`、official coverage ratchet、protected fast、lint-zero、
`pnpm check:docs`、ledger 和 `git diff --check`。shared/pal-extract baseline 回退若仍存在，
保持 `review`，不降低门槛或刷新无关 baseline。相邻包若出现新的诊断必须另开卡。

## 2026-10-17 批次收口回执

- 修复前定向 1 file / 37 tests PASS，但 2 条缺失 `L_99999` stderr；修复后同一 37 tests
  PASS、0 stderr。
- game menu 相邻 40 files / 377 tests PASS、0 stderr；game typecheck PASS。
- 全仓 `pnpm check` exit 0：content 149/149、shared 16/16、game 321/3613、
  pal-extract 72/434、reforge 359/8964、editor 631/4943、migrate 96/739；各包
  typecheck/test 均通过，lint 4962 files 为 0 errors / 0 warnings / 0 infos。
- `pnpm check:docs`、`node scripts/quality/code-quality-ledger.mjs` 和 `git diff --check`
  通过；账本为 3307 tracked / 231 closed / 30 review / 3046 pending。
- official `pnpm coverage:ratchet` 与 protected fast 均保留真实失败，原因仍是
  shared 447/466 statements、203/218 branches，pal-extract 1068/1546 statements、
  461/593 branches、111/140 functions、943/1367 lines，以及总量回退；本批未调 baseline。
- 生产 `magic-script.ts` 未修改；schema/save、公共接口、第一阶段行为和生成物均未触碰。
  `magic-script.ts` 与 `magic-script.test.ts` 保持 `review`，整卡不标 `done`。
```
<!-- incremental-original-source:end -->
