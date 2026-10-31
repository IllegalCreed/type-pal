# game-present-menu(present/menu 九文件)八维复审批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「game-present-menu(present/menu 九文件)八维复审批」的治理候选页;证据原件即下方逐字节保全的固定main源(2581B,SHA 3598bc00fb8a)。

## 来源与输入

来源为固定Git载体,非本次运行;原3个链接处置见作者review的linkDisposition。当前存活入口:[codex-stage2-rework.json](../codex-stage2-rework.json) [body-invariance.json](body-invariance.json) [directed.json](directed.json)。

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2581B / SHA-256 3598bc00fb8a3da00eb2c595be1c7798f90d3772549e85f7b7ce7ab8fbd64d88；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
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
```
<!-- incremental-original-source:end -->
