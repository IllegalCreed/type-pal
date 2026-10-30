# CODE-QUALITY-108 — Codex 当前验收（2026-10-17）

## 读取范围

完整读取：

- `packages/game/src/core/menu/magic-script.ts`（258 行）
- `packages/game/src/core/menu/magic-script.test.ts`（492 行）
- `packages/game/src/core/menu/magic-script.glm-next-wave.test.ts`
- `packages/game/src/core/menu/menu-driver.ts` 中大世界法术 dispatch（`castOverworldMagic` caller）
- `packages/game/src/core/menu/in-game-magic-menu.ts`
- `packages/game/src/core/script-catalog.ts`
- `packages/game/src/core/event-system.ts` 中全局脚本/`runScript`/物品脚本的相邻生命周期
- `packages/game/src/core/battle/actions/magic.ts` 与战斗 `runScript` caller
- `packages/game/src/core/player-poison-state.ts`

primary source：`reference/sdlpal/uigame.c:740-873` 的大世界法术顺序、
`reference/sdlpal/script.c:867-1102` 的 HP/MP/复活 opcode、
`reference/sdlpal/global.c:1254-1330` 的存活与“无变化失败”合同。

## 诊断根因

基线定向 `magic-script.test.ts` 为 1 file / 37 tests PASS，但两项主动构造缺失
`L_99999` 的测试把生产 runner 的预期 fail-closed `console.warn` 直接写到 stderr：

- `runMagicScriptSync - 流程控制 > label 不存在 → 返回 false`
- `castOverworldMagic - 双层 script > scriptOnUse 失败 → 不跑 scriptOnSuccess`

这不是生产路径的未捕获异常，也不是应删除的诊断；测试缺少 warning oracle 和隔离恢复。

## 修复

只修改 `magic-script.test.ts` 两个既有用例：各自安装 `vi.spyOn(console, 'warn')`，断言
精确 warning 文本，`finally` 恢复 spy。原有返回值、HP 不变和 scriptOnSuccess 不执行断言保留；
没有修改生产 runner、公共接口、第一阶段机制、schema/save 或生成物。

## 验证

- 修复前：1 file / 37 tests PASS，但 2 条 stderr 诊断。
- 修复后定向：1 file / 37 tests PASS，0 stderr。
- game menu 相邻：40 files / 377 tests PASS，0 stderr。
- game typecheck：PASS。

后续批次收口仍需跑完整 `pnpm check`、official coverage ratchet、protected fast、lint-zero、
`pnpm check:docs`、ledger；coverage baseline 的既有 shared/pal-extract 回退不能由本批修改掩盖。
