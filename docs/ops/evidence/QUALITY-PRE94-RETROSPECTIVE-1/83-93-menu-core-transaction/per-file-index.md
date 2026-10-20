# C1 逐文件 A–H 索引 — 83-93 菜单核心+交易族(19 条 fullReads)

读域标注同 [73-78 索引](../73-78-shell-lifecycle/per-file-index.md)。指纹勘误见 [`read-boundaries.json`](read-boundaries.json)。共享论据引用本目录 README"逐文件读取与事实边界"节。范围计数勘误:7 生产/相邻(6 卡内生产+1 相邻 item-select)+12 测试(README 已注)。

## 生产文件(6)+相邻(1)

**menu-mode.ts**【原审全文】A:空栈→resume、dispatch 后二次 sync;resumeAfterMenusClosed 三分支(battle 回战斗 uibattle.c:930-934/1399-1401、shop waiting 清回 event script.c:1163、否则 explore)。caller=mode.ts 每帧 tickMenu、scene-system/menu-driver 开关栈。B:注释与实现一致。C:tick 编排与栈操作分离(本文件 re-export menu-stack 出口)。D/F/G:33 行无冗余。H:栈状态可直接构造。
**menu-stack.ts**【原审全文】A:openMenu push+mode 切换、closeTopMenu 只 pop 不切 mode(留 tickMenu 下帧处理,防本帧 flip)。B/C/D/F/G/H 同上族:纯栈 helper,无输入/场景依赖(文件头声明)。
**in-game-menu.ts**【原审全文】A:真 WORD id 3/4/5/6、11..15(uigame.c:542-553 SystemMenu classic 5 项核证)、defaultCursor 记忆+越界归 0、QUIT return TRUE(649)关整栈、confirm/switch 三相。caller=menu-driver dispatchSystemMenu。B:含历史修复依据。C:纯 state machine。D:toItems/getWord 复用 word-lookup 单一文案源。F/G:无死分支。H:工厂+纯转换可直测。
**inventory-menu.ts**【原审全文】A:grid 8 键 delta(itemmenu.c:63-94)、clamp 三分支(107-112 逐字符一致)、全显示不滤列表(331-377)、usable 入口追加装备槽(352-376,count0/inUse-1)、L40 sSelectedPlayer 静态记忆(uigame.c:1309-1324)、H2 死人可选(1383-1495)。caller=menu-driver dispatchInventoryMenu/draw-inventory 读 state。B:含 id 全局化更正史。C:菜单快照不别名 gs.inventory(G02 钉)。D:pickItemRowColor 纯函数供 draw-inventory/draw-equip 复用(2026-05-29 用户报障修复)。F/G:常量即 ui.h 真值。H:可直测。
**inventory-action-menu.ts**【原审全文】A:WORD id 22/23、uigame.c:878-919 二级子菜单层(历史漏层修复)、defaultCursor=gs.iCurInvActionMenuItem 记忆。caller=menu-driver。B-H 同菜单族:纯状态机、无死分支。
**sell-menu.ts**【原审全文】A:全屏 grid 复用 inventory-menu(=C PAL_SellMenu→PAL_ItemSelectMenu,uigame.c:1755/1777)、确认门 sellable&&count-inUse>0(itemmenu.c:287-307)、refreshSellGrid 保 cursor clamp。caller=menu-driver dispatchShopSell/buy 入口 bootstrap.ts:1236-1249。C:纯意图返回,cash/inventory 由 caller 持有(测试钉零副作用)。D:grid 复用即 C 结构对应,非假复用。
**item-select.ts**(相邻)【原审全文】A:matchesFilter 各分支锚(play.c:266 usable/uigame.c:1777 sellable);`createItemSelectMenu` 无生产 caller——清理候选维持登记(README 已注)。D/equipableBy 位序更正史在注释。

## 测试文件(12,E 为主)

**menu-mode.test.ts**【原审全文】E:空栈切 explore、Menu pop 层级、DH9 物品层 goto out(uigame.c:1024-1026)、open/close 出口双臂。
**in-game-menu.test.ts**【原审全文】E:真 id/词表 flat/顺序/Down 序列/defaultCursor 越界;oracle=ui.h WORD id+uigame.c 顺序。
**in-game-menu.boundaries.test.ts**【原审全文】E:G09 三相状态字段、choice 按 id 防御(重排后仍按 WORD id)。
**in-game-menu.glm-phase1-leaves.test.ts**【原审全文】E:首尾环绕、负 defaultCursor、SystemMenu 词表 flat[11..15]。
**inventory-menu.test.ts**【原审全文】E:6-case 色真值表+闪烁 cycle、matchesFilter 三态、全显示、L39 追加/不追加双臂、8 键 clamp、空表、H2 死人 disabled=否、空队伍防御。
**inventory-menu.boundaries.test.ts**【原审全文】E:count==inUse 拒/少占用正控、追加装备可确认、party[2,0] roleId 非 cursor、错相零请求、快照不别名。
**inventory-menu.glm-phase1-leaves.test.ts**【原审全文】E:iCurInvMenuItem 恢复+clamp、缺 inUse 默认 0、use-target 相导航委派+六键零触达、done 相 no-op、cancel 回写 L40、防御 null。
**inventory-action-menu.test.ts**【原审全文】E:2 项顺序/真 id/static 记忆/Down-Up。
**inventory-action-menu.glm-phase1-leaves.test.ts**【返工补读】原审查未读取(误列 fullReads),2026-10-20 返工全文补读。E:越上界守卫、Down 两连环绕、词表 flat[22]/[23]、空 selection 防御 undefined。补读结论:与族内模式一致,无缺口。
**sell-menu.test.ts**【原审全文】E:全显示含不可卖红项、选中门、confirm 四方向 toggle、意图返回不改 cash/inventory、cancel 分层、卖光 clamp。
**sell-menu.boundaries.test.ts**【原审全文】E:inUse 耗尽拒、confirm 期翻页零触达、等长/空/增表刷新精确 cursor、不别名。
**sell-menu.glm-phase1-leaves.test.ts**【返工补读】原审查未读取(误列 fullReads),2026-10-20 返工全文补读。E:空库存 !slot 防御、确认态重复选择零请求、list 相 sellConfirm null。补读结论:无缺口。
