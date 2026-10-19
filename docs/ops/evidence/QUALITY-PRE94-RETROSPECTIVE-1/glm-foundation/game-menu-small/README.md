# game-menu-small(menu 小中件 11 文件 + battle-state 一注)八维复审批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

- 批次:pre-94 foundation 模块 10 批 23(menu(core) 批 1,含原批 23/24 合并)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 52+ 提交)
- Coding Owner:GLM;11 文件全文读毕(menu-stack 32/menu-mode 33/script-desc 39/magic-select 56/player-status 58/opening-menu 74/inventory-action-menu 79/save-slot-menu 93/item-select 94/shop-menu 103/equip-menu 111/sell-menu 139/in-game-menu 141/primitives 176 — 实 15 文件)
- 整改类型:纯注释 2 处,零代码改动 — body-invariance `allEqual: true`

## 整改清单

| # | 位置 | 问题 | 修正 |
|---|---|---|---|
| 1 | item-select.ts createItemSelectMenu disabled 注 | "M5 简版 — 全可选;sell mode 下 important 类应该 disabled,买卖菜单 follow-up 精细"过时 — 卖路径灰显/拒确认已由 sell-menu('sellable' filter)+draw-inventory pickItemRowColor+sellSelectItem 实现,不经本工厂;且本工厂零生产 caller | 改述实际去向并注明清理候选 |
| 2 | battle-state.ts:514 magicSelect docblock | "进 magicSelect 时 createMagicSelectMenu 建"错指 — 战斗 grid 实由 battle-system.ts:1328 buildBattleMagicSelect 建(createMagicSelectMenu 仅大世界 in-game-magic-menu 用);批 12 漏网 | 改 buildBattleMagicSelect |

## 零整改面(13 文件)

menu-stack(resumeAfterMenusClosed 三分支 uibattle.c/script.c 锚)、menu-mode、script-desc(木剑 chain 实例)、magic-select(L36 排序真值+id 体系统一史)、player-status(三输入映射 uigame.c:1265-1284)、opening-menu(GBK 解码真值)、inventory-action-menu(static w 记忆)、save-slot-menu(DM24 默认槽)、shop-menu(买不起不弹 confirm 真值)、equip-menu(itemmenu.c:287-291 确认守卫+swap 链)、sell-menu(uigame.c:1755 全屏 picker 论证+refreshSellGrid cursor clamp)、in-game-menu(WORD id 单一源+PAL_CLASSIC 5 项)、primitives(L38 不跳 disabled 真值+pageUp test-only 治理注) — 全部零缺陷。

## 验证

- body-invariance:两整改文件 printedSha256 一致 → [body-invariance.json](body-invariance.json)
- 定向 28 文件(15 目标测试族+battle-system 回归):**105 套件 340/340,0 failed suites** → [directed.json](directed.json)
- `tsc --noEmit -p packages/game`:exit 0;scoped biome 0 诊断;`git diff --check` 干净

## 登记项(交 Codex)

1. `createItemSelectMenu` 零生产 caller(仅 leaves 测试)— 死导出清理候选(批23新增)
