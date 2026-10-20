# CODE83/84/87/91/93 菜单核心+交易族五卡复审切片(GLM,只读零改动)

基点 `dec0626e1c`;候选 HEAD `8e442940c`(本片零源码/测试改动,候选与基点在这些文件上逐字节相同)。范围:CODE-QUALITY-83(menu-mode/menu-stack)、84(inventory-menu)、87(in-game-menu)、91(inventory-action-menu)、93(sell-menu)五卡 **7 个生产/相邻文件(6 卡内生产 + 1 相邻 item-select.ts)+ 12 份卡内测试**全文逐文件八维;85/86/88/89(shop/equip/magic-select/in-game-magic)留下一菜单切片。完整读取 SHA 见 [`read-boundaries.json`](read-boundaries.json) 逐文件 A–H 索引与读域标注见 [`per-file-index.md`](per-file-index.md)(2026-10-20 C1 返工新增)。,定向原件 [`directed-final.json`](directed-final.json)。

> 2026-10-20 C2 勘误:原文写"8 生产文件 + 12 份卡内测试"。实际 fullReads 共 19 条 = 7 个生产/相邻文件(6 卡内生产 + 1 相邻 `item-select.ts`,后者在本片中按相邻 filter oracle 全文读取并单列 boundary)+ 12 份测试。原结论不变,仅计数更正。

**结论:未发现可由 primary source + 真实 caller 证实的新 direct defect;无需整改,零改动。**五卡建议 `pending → partial`(作者审查完成,待 Codex 据证验收)。

## A 正确性与边界(逐文件)

- **menu-mode.ts(33)/menu-stack.ts(32)**:tickMenu 空栈→resume、dispatch 后二次 sync;resumeAfterMenusClosed 三分支(battle 回战斗/shop waiting 清回 event/否则 explore)。与 uibattle.c:930-934/1399-1401(战斗内状态屏返回)、script.c:1163(买菜单返回续脚本)合同一致;mode.ts:62-76 每帧分发与 scene-system 开菜单 caller 核过(卡面锚,本轮 menu-mode.test 亦证栈行为)。
- **in-game-menu.ts(141)**:真 WORD id 3/4/5/6 与 11..15、defaultCursor 记忆+越界归 0、SystemMenu confirm/switch 三相、QUIT 后整栈关闭。锚核验:uigame.c:542-553(SystemMenu 5+1 项,classic 无 BATTLEMODE)、649(QUIT return TRUE)、1024-1026(case 3 goto out=DH9);ui.h:61-70 WORD id 已有 byte-level 核过记录。
- **inventory-menu.ts(280)**:grid 8 键 delta、clamp 不环绕、全显示不滤列表(色由渲染层)、usable 入口追加装备槽(count0/inUse-1)、L40 目标 slot 静态记忆、H2 死人可选。锚逐条核验:itemmenu.c:63-94(delta 表)、107-112(clamp 三分支逐字符一致)、uigame.c:1309-1324(sSelectedPlayer static + 越界归 0)。confirm 门 `flags.usable && count-inUse>0` 与 itemmenu.c:287-291 一致;sell 侧用 matchesFilter('sellable') 等价直查 flag。
- **inventory-action-menu.ts(79)**:WORD id 22/23、defaultCursor 记忆、uigame.c:878-919 二级子菜单层(历史漏层修复)。
- **sell-menu.ts(139)**:全屏 grid 复用 inventory-menu(=C PAL_SellMenu→PAL_ItemSelectMenu 复用)、confirm 期四方向 toggle、sellSelectItem 门(sellable && count-inUse>0)、refreshSellGrid 保 cursor clamp。C9 全屏化用户决策沿用。
- **item-select.ts(96,相邻)**:matchesFilter 各 filter 分支与 play.c:266/uigame.c:1777 锚一致;createItemSelectMenu 无生产 caller 的清理候选维持原登记,不在本片处理。

## B–H

B:注释与实现/真值一致(含 2026-10-15 的 id 全局化更正与 equipable 位序更正历史)。C:状态 Owner 清楚——菜单 state 由 factory 建、dispatcher 消费、cash/inventory 只由 caller 改(sellConfirm 仅返意图,测试钉住 gs.dwCash/inventory 不变)。D:sell→inventory grid 复用与 C 结构对应,无万能 helper。F/G:命名达意、无死分支(相防御均有测试与 C 对应)。H:纯 state machine 可直测,无需 mock。

## E 测试质量(逐例)

12 份测试逐例核读,去重头完备(每份文件头列明与既有文件的分工):真值表/全显示/追加装备/八键 clamp/确认门/不别名/相位防御/L39/L40/H2/方向键 confirm 期不动 grid/刷新三态(空/等长/增表)均有独立 oracle 与反例。未发现重复、恒真或无业务执行用例;本轮不新增测试(无缺口,不强造反控)。

## 执行事实

- 定向:12 files / **84 passed** / 0 failed,exit 0,无 stderr(原件 directed-final.json,`numTotalTests=84`)。
- `tsc --noEmit`(packages/game):0 诊断。
- 本片零改动,无需 biome/变异反控。
- **未跑**(留阶段收尾):全仓 check、official ratchet、protected fast、coverage。

## 失效条件与剩余项

- claim 失效条件:menu-driver dispatch 行为、game-state 菜单字段、itemmenu/uigame 参考库变化会使对应结论待复核。
- 剩余:85/86/88/89 四卡为下一菜单切片(shop/equip/magic-select/in-game-magic);item-select 的 createItemSelectMenu 0-caller 清理候选维持登记。
