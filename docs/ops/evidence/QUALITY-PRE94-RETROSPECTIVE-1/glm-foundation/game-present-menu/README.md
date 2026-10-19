# game-present-menu(present/menu 九文件)八维复审批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

- 批次:pre-94 foundation 模块 8 批 18(present/menu 家族)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 44+ 提交)
- Coding Owner:GLM;九文件全文读毕(2401 行:confirm 48/opening-menu 70/box 191/shop 241/equip 279/magic 359/player-status 375/inventory 390/menu 448)
- 整改类型:纯注释 2 处(B 维,两文件),零代码改动 — body-invariance `allEqual: true`

## 整改清单

| # | 文件:位置 | 问题 | 修正 |
|---|---|---|---|
| 1 | draw-equip.ts 模块头 L23-24 | "phase='list' 简版复用 SelectionMenu list;完整 grid 与 InventoryMenu 共享,留 follow-up(M6 grid statemachine 抽 primitive)"过时 — drawEquipList(L113-125)已直接复用 drawInventoryMenu 完整 grid | 改"直接复用 drawInventoryMenu(完整 grid)—— sdlpal 真值装备物品选择就是同一个 PAL_ItemSelectMenu,仅 filter 不同" |
| 2 | draw-player-status.ts 模块头第 10 条 | "poison row 首版 skip,留 follow-up(需 items poison 字段 + gs.rgPoisonStatus 接入)"过时 — 函数末 step 10 已实现(C6:objectPoisons + rgPoisonStatus,level<=3 过滤/色 wColor+10) | 改"已实现(C6…),见函数末 step 10"并保留真值要点 |

## 零整改面(7 文件)

- **draw-confirm.ts**:uigame.c:272/298 真值坐标 + PAL_SwitchMenu 复用说明;**draw-opening-menu.ts**:uigame.c:107-108 x 公式已忠实移植的声明与退化分析;**draw-box.ts**:PAL_CalcShadowColor 真值(含 2026-05-27 hardcode 错色修正史)、menuTextMaxCols port、单循环 shadow-then-color 顺序论证;**draw-shop.ts**:PAL_BuyMenu/SellMenu_OnItemChange 全坐标锚 + ownedCount 含已装备数真值;**draw-magic.ts**:WIN95/DOS 双布局互斥论证(L8)+ 与战斗法术菜单同源约束;**draw-inventory.ts**:6-case 颜色规则 + g_fNoDesc 语义 + live amount 读库存论证;**draw-menu.ts**:v1 走损纠正清单 + SaveSlotMenu 两处 user 纠错史 — 全部零缺陷。

## 验证

- body-invariance:两整改文件 printedSha256 一致 → [body-invariance.json](body-invariance.json)
- 定向 21 文件(9 目标文件全部测试族):**47 套件 154/154,0 failed suites** → [directed.json](directed.json)
- `tsc --noEmit -p packages/game`:exit 0;scoped biome 2 文件 0 诊断;`git diff --check` 干净

## 登记项

无新增。沿用批 15/16 死 op/参数清理候选。
