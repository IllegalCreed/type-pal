# CODE55 draw-menu 当前复审切片

> 2026-10-18 波次门勘误：本页引用的 [47–52统一门回执](../53-wave-gates/README.md) 已撤回“通过/收口”信用，未证明零诊断；不得沿用为本片验收或合并依据。本页原逐文件/定向结果按各自证据保留，旧计数不改写为0。

基点：`f544b9b94`；分支：`codex/code-quality-3y`。本片重新复审历史 CODE-QUALITY-55 的唯一未登记范围，不把历史 `done` 或旧波次回执当作当前整卡验收。当前卡复审为 `partial`。

## 读取与事实边界

完整读取：

- `packages/game/src/present/menu/draw-menu.ts`
- `packages/game/src/present/menu/draw-menu.test.ts`
- `packages/game/src/present/menu/draw-menu.glm-phase1-leaves.test.ts`
- 真实 caller/lifecycle：`present.ts:679-705`、`menu-driver.ts` 全部菜单 dispatch 与栈迁移、`menu-mode.ts`、`menu-stack.ts`、`game-state.ts` menu union/runtime projection，以及 in-game/system/save-slot/inventory-action/player-status/sell state owners
- primary：`reference/sdlpal/uigame.c:42-242,430-620,878-919,990-1031,1051-1286,1503-1777` 与 `reference/sdlpal/ui.c:458`

`drawMenuStack` 只从底到顶投影 `GameState.menuStack`；cash、主菜单、system、confirm/switch、save-slot、inventory-action、shop-sell 的坐标/颜色/框体层级、savedTimes 与 extra 资源转发均和 primary/caller 一致。`present.ts` 仅在 `mode='menu'` 且 UI frame 已注入时调用，事件脚本模式不会把菜单盖在对话上；绘制层不写 GameState、Save/IDB 或菜单生命周期。

## 本片变更与测试

发现实现末尾的 `SelectionMenuState` 类型导入和 `void (null as unknown as SelectionMenuState)` 是无实际用途的历史 lint 伪用法。已删除这两行，属于纯重构，不改变菜单分支、framebuffer 输出或公共接口。

旧专属测试的shop-sell只把空grid强设confirm，三个转发缺失反控全存活；缺extra也混用不完整state，不能维持“fixture合法/叠层与资源合同完备”当前信用。现改可卖库存经公开确认，增加grid/icon/noDesc/overlay的必要像素oracle、正式状态工厂/hydrate与前后清理，GLM该文件旧关闭撤回review。原15/197只保留有限历史执行，未据新结果重签整文件。详见[当前商店/宿主返工](../core-comment-audit/shop-layout-tests/README.md)。

## 验证

- 直接：3 files / 15 tests passed
- 相邻：11 files / 197 tests passed
- `pnpm --filter @type-pal/game typecheck`：passed
- `pnpm lint`：passed，5002 files，0 errors / 0 warnings / 0 infos
- `git diff --check`：passed
- 波次级 `pnpm check`、审计退役后的官方 ratchet、`TYPE_PAL_COVERAGE_BASE_REF=origin/main` protected fast：见 [`53-wave-gates`](../53-wave-gates/README.md)，已通过，本片不重复运行昂贵 coverage

未关闭：超长 word table 标签的 SDLPal `dx` 分支与异步 slot metadata 的更宽输入域仍只保留 caller 证据；视觉/E2E 延后。CODE-QUALITY-53、GAME-MAGIC-PLAYERINFO-STATUS-1 及其它 pending/review 不在本片范围。

2026-10-18 补证：[read-boundaries.json](read-boundaries.json)是当前770f9168e候选的实际后补全文核读，明确区分历史f544报告，不能冒充当时缺失原件；三个draw-menu文件及menu mode/stack已补读，caller边界单列。旧15/197摘要保留，不为补元数据重跑产品/coverage。上文“已通过”仅原错误回执的历史表述，53统一门当前仍rework，不能用于本片收口。

2026-10-18 新反控：丢grid、丢图标、漏noDesc各旧5绿→新4绿1指定AssertionError；5例不增量。调用drawMenuStack时未真实按键路由，不冒称浏览器或完整交易链。旧README字节在本片55-report.before.gz保留，原55 source的448行数只精确修账，不授新增质量关闭信用。
