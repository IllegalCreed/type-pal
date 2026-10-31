# CODE-QUALITY-108 — game magic-script warning ownership

Status: review
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

保留原卡「CODE-QUALITY-108 — game magic-script warning ownership」的任务归属与历史边界。原目标见原文(摘录:Reviewer: Codex（独立验收） Capability: game / menu / diagnostic ownership Visual Verification Timing: N/A);本页治理不重开已终态任务。

## 范围

原卡含章节[CODE-QUALITY-108 — game magic-script warning ownership、目标与白名单、准入与事实、实施、当前验证、收口要求与未决项],共0个原文链接。治理范围仅限文档角色、保全与链接处置,不改产品/测试/coverage。

## 前提与证据

固定main源3040B(SHA d8d67c83e52c);原卡前提按原时点保留。当前存活入口:无当前仓库内存活链接。

## 验收

本页治理验收=模板符合+原文逐字节保全+链接处置如实;原卡验收结论保持原时点(原Status:review),治理不改写。

## 状态与交接

review保持原语义;本治理候选为作者稿(partial/needs),交Owner非作者接收;无新执行授权。


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
