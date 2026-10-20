# C1 逐文件 A–H 索引 — 85-89 菜单 shop/equip/magic(15 条 fullReads)

读域标注同 [73-78 索引](../73-78-shell-lifecycle/per-file-index.md)。指纹勘误见 [`read-boundaries.json`](read-boundaries.json)。共享论据引用本目录 README A/B–H 节。

## 生产文件(4)

**shop-menu.ts**【原审全文】A:买菜单紧凑布局(PAL_BuyMenu 本就紧凑)、`price<=cash` 才弹 confirm(uigame.c:1683)、confirm 默认 No、纯意图返回。caller=menu-driver dispatchShopBuy(opcode 0x26 链路,shop-menu.test 端到端证)。B:卖菜单分流 sell-menu 注释互指清楚。C:cash/inventory 由 caller 持有(G06 钉零副作用)。D:primitives SelectionMenu 复用。F/G:无死分支。H:纯状态机可直测。
**equip-menu.ts**【原审全文】A:.list 复用 InventoryMenuState(filter='equip')、确认门 equipable&&count>inUse(itemmenu.c:287-291)、pick-role wrap(uigame.c:2021-2035)、partyMembers 快照、swap 链语义(selectedItemId=gs.wLastUnequippedItem,1820)由 dispatcher 承接(2016-2019)。caller=menu-driver:753-852。B:历史"[简版,M6 grid]"怒怼修复注释保留。C/D/H 同菜单族。
**magic-select.ts**【原审全文】A:spell.id 直查(非 magicNumber 反查)、习得序排序(magicmenu.c:377-397)、MP 恰等可选/差 1 禁用、悬空 spell/magic 剔除。caller=in-game-magic-menu buildSpellMenu(usableOutsideBattle 过滤)+battle-system.ts:976 同款排序。B:2026-05-29 id 统一史。F/G:防御分支均有测试。H:纯工厂。
**in-game-magic-menu.ts**【原审全文】A:四相状态机对齐 uigame.c:653-875——L35(pick-spell Cancel 关整菜单 733-736/1017-1018)、L37(caster 仅判 HP>0 707-708)、L38(3 列网格 clamp)、L41(单人队快速道 677-681)、DL22(施法人 static 记忆 674/719+越界归 0)、refresh 落回 wDefaultMagic(magicmenu.c:402-409)、pick-target 边界不 wrap(841/849)。caller=menu-driver dispatchInGameMagicMenu。B:三处历史误修复注(多回一层/灰活人)保留。C:spellMenu/casterMenu 状态自持;MP 扣由 dispatcher。D:magic-select 复用。F/G/H:同族。

## 测试文件(11,E 为主)

**shop-menu.test.ts**【原审全文】E:列表原价、买得起/买不起门、toggle、cancel 分层、**opcode 0x26/卖链端到端**(真实 event-system tickEventSystem+setShopMenuHandler+dispatchMenuInput 链,cash/inventory 终态 oracle)。
**shop-menu.boundaries.test.ts**【原审全文】E:恰等可进/差 1 拒、空列表、No 意图收尾、catalog 不变(零副作用)。
**shop-menu.glm-phase1-leaves.test.ts**【返工补读】原审查未读取(误列 fullReads),2026-10-20 返工全文补读。E:缺 _name 回退 ?id、pageSize 8、错相零请求、目录缺 item no-op、list 相 confirm null。补读结论:无缺口。
**equip-menu.test.ts**【原审全文】E:.list InventoryMenuState 特征字段(防退化)、全显示、确认门、pick-role 请求、cancel 复位、wrap 双向、list 相 noop。
**equip-menu.boundaries.test.ts**【原审全文】E:inUse 耗尽、party[2,0] roleId、意图零副作用(装备/钱/库存快照)、done 相结构化零请求。
**equip-menu.glm-phase1-leaves.test.ts**【返工补读】原审查未读取(误列 fullReads),2026-10-20 返工全文补读。E:目录外 itemId no-op、done 相三操作零触达、单人队环绕自返。补读结论:无缺口。
**magic-select.boundaries.test.ts**【原审全文】E:MP 恰等/差 1、排序不污染传入 roles.magic、295 非连续返 spell.id、缺 spell/坏角色空表。
**magic-select.glm-phase1-leaves.test.ts**【原审全文】E:magicNumber 悬空剔除、缺 _name 回退、costMP=0 于 MP=0 可选、全空槽、pageSize。
**in-game-magic-menu.test.ts**【原审全文】E:四相转换、L37 活人无 outside 法术仍可选、死人 caster noop、applyToAll 留相/单体切相、MP 不足 disabled null、target 边界、网格导航、refresh 落回、battle-only 过滤。
**in-game-magic-menu.boundaries.test.ts**【原审全文】E:单人队直进、非顺序 party roleId、错相零请求、refresh cursor 落回。
**in-game-magic-menu.glm-phase1-leaves.test.ts**【原审全文】E:DL22 记忆回放/越界归 0、roles 缺失 id 剔除、错相 confirmCaster 不重建、单人队死亡直进、空 spellMenu 八向兜底、pick-target Left/Right、非 pick-spell 相翻页零触达、关闭后 refresh 不复活、cancel 幂等。

## Codex接收边界（2026-10-20）

本索引的读取身份、补读勘误和逐文件具体结论按各自范围接收；测试条目多为E维，不能读成69文件全部八维已验收。各文件A–H已陈述/尚缺依据的状态分别列于[Codex验收记录](../codex-pending27-acceptance.json)。未单列论据的维度保持review-unknown，文件不关闭；后续只补这些具体缺口，不重复已成立的E/primary。
