# CODE85/86/88/89 菜单 shop/equip/magic 四卡复审切片(GLM,只读零改动)

基点 `dec0626e1c`;候选 HEAD `33cf347a8`(本片零改动,文件与基点逐字节相同)。范围:CODE-QUALITY-85(shop-menu)、86(equip-menu)、88(magic-select)、89(in-game-magic-menu)四卡 4 生产文件 + 11 份测试全文逐文件八维。菜单族(83-89/91/93 九卡)至此全部完成本轮复审。读取 SHA 见 [`read-boundaries.json`](read-boundaries.json) 逐文件 A–H 索引与读域标注见 [`per-file-index.md`](per-file-index.md)(2026-10-20 C1 返工新增)。,定向原件 [`directed-final.json`](directed-final.json)。

**结论:未发现可由 primary source + 真实 caller 证实的新 direct defect;零改动。**四卡建议 `pending → partial`。

## A 正确性与边界(逐文件)

- **shop-menu.ts(103)**:买菜单紧凑布局忠实 C(PAL_BuyMenu 本就是紧凑列表);`price<=cash` 才弹 confirm(uigame.c:1683)、confirm 默认 No、纯意图返回(cash/inventory 由 caller 持有——G06 测试钉住零副作用)。0x26 端到端(开菜单→买→关→续脚本)经真实 event-system+menu-driver 链验证(shop-menu.test)。
- **equip-menu.ts(111)**:list 相复用 InventoryMenuState(防退简版,测试钉 `.list.phase/filter` 特征);确认门 `equipable && count>inUse`;pick-role 光标 wrap(uigame.c:2021-2035);partyMembers 快照隔离;swap 链(selectedItemId=gs.wLastUnequippedItem)语义由 dispatcher 承接(卡面注释一致)。
- **magic-select.ts(56)**:spell.id 直查(非 magicNumber 反查)、习得序排序(magicmenu.c:377-397 升序,大世界路径补齐)、MP 恰等可选/差1禁用、悬空 spell/magic 剔除、costMP=0 在 MP=0 可选。G04/L02 全轴覆盖。
- **in-game-magic-menu.ts(306)**:四相状态机与 uigame.c:653-875 对齐——L35(pick-spell Cancel 关整菜单不回弹 caster 框)、L37(活人 caster 仅判 HP>0)、L38(pick-spell 3列网格 clamp)、L41(单人队快速道直进 pick-spell)、DL22(施法人光标 static 记忆+越界归0)、refresh 落回 wDefaultMagic(magicmenu.c:402-409)、pick-target 边界不 wrap(uigame.c:841/849)、battle-only spell 过滤。

## B–H

B:注释含历史修复依据(误加 hasOutsideMagic 灰活人、误回 pick-caster 多一层均已修并有测试)。C:纯状态机+意图返回,交易/装备/扣 MP 全在 dispatcher,clean。D:magic-select 复用于战斗路径(battle-system.ts:976 同款排序);equip/shop/sell 各自对应不同 C 函数,非假复用。F/G:无死分支(防御分支均有测试判别)。H:可直测。

## E 测试质量(逐例)

11 份测试逐例核读,去重头完备:恰等门/差1/空列表、意图零副作用、非顺序 party roleId、错相零请求、DL22 记忆回放与越界、空 spellMenu 八向兜底、关闭后 refresh 不复活、单人队死亡成员快速道均有判别。0x26/0x27 端到端走真实事件链。无缺口,不新增。

## 执行事实

- 定向:11 files / **80 passed** / 0 failed,exit 0,无 stderr(directed-final.json)。
- 本片零改动,无需 typecheck/biome 重跑(与前片同候选树,前片已 0 诊断)。
- **未跑**(留阶段收尾):全仓 check、ratchet、protected fast、coverage。

## 失效条件与剩余项

- claim 失效条件:menu-driver dispatch、uigame/magicmenu 参考库、shared Spell/Magic 类型变化会使对应结论待复核。
- 菜单族九卡(83-89/91/93)本轮全部完成;`__tests__/item-magic-select.test.ts` 的 MagicSelectionMenu 合同为 88 卡面旧指针,其轴已被 magic-select 双测试覆盖排重,未重读整文件(登记为相邻证据)。
