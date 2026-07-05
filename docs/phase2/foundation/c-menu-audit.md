# 菜单系统 九单元 三方逐函数对照审计(框架 / 状态 / 装备 / 仙术 / 物品 / 商店 / 存档 / 开场 / 主菜单)

| 字段 | 值 |
|---|---|
| 审计日期 | 2026-07-05 |
| sdlpal C 真值 | `reference/sdlpal/{uigame.c, ui.c, itemmenu.c, magicmenu.c, play.c, game.c}`(monorepo HEAD 同 commit) |
| 一阶段 .ts | `packages/game/src/core/menu/*.ts`(状态机,53 fix 之 35)+ `packages/game/src/menu/present/menu/draw-*.ts`(渲染,53 fix 之 18) |
| reforge .ts | `packages/reforge/src/menu-state.ts` + `packages/reforge/src/{equip,magic,use,system}-menu-state.ts` + `packages/reforge/src/menu/{menu,equip,magic,use,system,item-list,save-browser}-box.ts` + `packages/reforge/src/save/{browser-state,types,ops,store}.ts` |
| 审计单元 | 9(菜单框架 / 状态面板 / 装备 / 仙术 / 物品 / 商店 / 存档 / 开场 / 主菜单) |
| 方法 | sdlpal C 真值逐函数 → 一阶段逐函数对照(✅/⚠️/❌ + git fix 锚点)→ reforge 逐函数对照(✅/⚠️/❌/✨)→ 缺口 + 风险 + 行动 |

> **行号口径**:sdlpal 行号锚 `uigame.c` 等 C 文件 cat -n 行号;一阶段锚 `packages/game/src/...` cat -n 行号;reforge 锚 `packages/reforge/src/...` cat -n 行号。所有锚点为本审计读取时 HEAD 真值。
>
> **状态图例**:✅ 完全对齐 / ⚠️ 部分偏离 / ❌ 缺失 / ✨ 新架构免疫(用 reforge 范式重做后该坑不存在或不适用)。

---

## 总览矩阵(先看结论)

| 单元 | sdlpal 核心 | 一阶段 | reforge | 一阶段 fix 命中 | reforge 命中 |
|---|---|---|---|---|---|
| 1 菜单框架 | uigame/ui.c 原语 | menu-driver + menu-mode | menu-state + menu-box | 8/8 | 4/8(单人 demo) |
| 2 状态面板 | PAL_PlayerStatus | player-status + draw-player-status | MenuBox.renderStatus | 5/5 | 3/5(EXP 硬编 / 多人缺) |
| 3 装备菜单 | PAL_EquipItemMenu | equip-menu + draw-equip + dispatchEquipMenu | equip-menu-state + equip-box | 6/6(swap链/4色/DM23) | 3/6(单 casterId / 无按角色禁用门) |
| 4 仙术菜单 | PAL_InGameMagicMenu + magicmenu.c | in-game-magic-menu + draw-magic | magic-menu-state + magic-box | 5/5(MP/外场/sLastCaster) | 2/5(单 caster / MP 仅渲染 / TODO 自承认) |
| 5 物品/背包 | PAL_ItemUseMenu + itemmenu.c | inventory-menu + draw-inventory + dispatchInventoryMenu | use-menu-state + use-box + item-list | 6/6(两阶段/记忆/usable filter) | 3/6(单目标 / triggerScript 桩) |
| 6 商店 | PAL_Buy/Sell/EquipItemMenu | shop-menu + sell-menu + draw-shop + dispatchShopMenu | ❌ 未实现 | 4/4 | 0/4 |
| 7 存档 | PAL_SaveSlotMenu + GetSavedTimes | save-slot-menu + draw-menu drawSaveSlotMenu + dispatchSaveSlotMenu | save/browser-state + save-browser-box + save/ops+store+types | 4/4(savedTimes 计数) | 1/4(故意 30 槽分页 / 无跨槽计数器) |
| 8 开场 | PAL_OpeningMenu(play 3.avi) | opening-menu + draw-opening-menu + dispatchOpeningMenu | ❌ 未实现(X3 自承认) | 3/3 | 0/3 |
| 9 主菜单 | PAL_InGameMenu + PAL_SystemMenu | in-game-menu + draw-menu + dispatchInGameMenu/System | menu-state.MAIN_MENU + system-menu-state + system-box | 5/5(DH9/L38/默认光标) | 3/5(DH9 「否」回 hub 自承认偏离) |

---

## 审计单元 1:菜单框架(菜单栈 / 框原语 / dispatcher)

### 1.1 sdlpal C 真值

#### `PAL_CreateBoxWithShadow`(ui.c:131-240)— 主菜单 9 切片框
- 9-slice tile,边角 tile 不缩、中段 tile 平铺;**先画 shadow 再单循环画不透明**(ui.c:163-198)。
- shadow 不是固定黑:用 `PAL_CalcShadowColor` `(src & 0xF0) | ((src & 0x0F) >> 1)`(逐像素降明度)。

#### `PAL_CreateSingleLineBoxWithShadow`(ui.c:252-352)— 单行卷轴框
- frames 44/45/46(左杆 / 中段 / 右杆),中段平铺;`nLen` = 中段 tile 数。

#### `PAL_ReadMenu`(ui.c:401-637)— 通用菜单读取(光标 + 闪烁 + 确认)
- **issue #166 修**:`g_bRenderPaused` 期冻结渲染,菜单仍可读输入(ui.c:430-440)。
- `wCurrentItem` 环绕:`(w + n + len) % n`(ui.c:540-560)。
- **不跳过 disabled 项**(ui.c:520-535)—— 选中色 0x1C,但光标可停。这是 L38 的 C 真值。
- 6 帧闪烁 `MENUITEM_COLOR_SELECTED + (frame/10) % 6`(ui.c:486-500;色 0xF9-0xFE)。

#### `PAL_ShowCash`(uigame.c:451-491)— 顶部金钱横卷轴
- 单行卷轴 `(0,0)` + 「金錢」label(深米黄 0xBB,**无阴影**)+ 黄数字右对齐。

### 1.2 一阶段实现

#### `packages/game/src/core/menu/menu-driver.ts`(970 行)— 中央 dispatcher
- `dispatchMenuInput` switch on `top.kind`(menu-driver.ts:200-250);`setMenuCatalogs` 单例注入(menu-driver.ts:top)。
- `menuRoles(gs)` 投影运行时角色(menu-driver.ts:openOverworldShortcutMenu)。
- 每个 `dispatchXxxMenu` 都在 `done` / `goto out` 等价路径写 `gs.menuStack = []`(menu-driver.ts:672/768/862/939 等多处),复刻 sdlpal 「关整个菜单回大世界」。

#### `packages/game/src/core/menu/menu-mode.ts`(63 行)
- `tickMenu` / `resumeAfterMenusClosed`(battle/event/explore)/ `openMenu` / `closeTopMenu`。

#### `packages/game/src/menu/present/menu/draw-box.ts`(196 行)
- `drawBox` 9 切片**单循环 shadow-then-opaque**(draw-box.ts 与 ui.c:163-198 1:1)。
- `palCalcShadowColor` 逐像素(draw-box.ts)— 不是固定黑。
- `drawSingleLineBox` frames 44/45/46(draw-box.ts)。
- `menuTextMaxCols` 框宽计算真值。

| 函数 | 一阶段对照 | 状态 |
|---|---|---|
| PAL_CreateBoxWithShadow | draw-box.ts drawBox | ✅ |
| PAL_CreateSingleLineBoxWithShadow | draw-box.ts drawSingleLineBox | ✅ |
| PAL_ReadMenu(issue #166 + 不跳 disabled) | primitives.moveSelectionUp/Down 包环绕 + 不跳 | ✅(L38 fix) |
| PAL_ShowCash(label 无阴影) | draw-menu.ts drawCashBox | ✅ |
| goto out 关整个栈 | menu-driver.ts `gs.menuStack = []`(DH9) | ✅(DH9 fix) |

**一阶段 fix 命中**:L38(cursor 不跳 disabled,对齐 PAL_ReadMenu ui.c:520)、DH9(goto out 关整个菜单)、DL20/21/22(导航键映射 Up\|Left 上、Down\|Right 下)。

### 1.3 reforge 实现

#### `packages/reforge/src/menu-state.ts`(88 行)— **不同范式:树级联 vs 栈**
- `MenuState {active, stack: MenuLevel[], openPanel}`(menu-state.ts:36-40)。
- `MAIN_MENU` 静态树:status/magic/item→[equip,use]/system(menu-state.ts:16-28)。
- `moveCursor`(menu-state.ts:58-65):末层环绕 `(c+delta+n)%n`;**openPanel 期不动**(menu-state.ts:59)。
- `confirm`(menu-state.ts:68-78):children→压栈、panel→openPanel、disabled→不动。
- `back`(menu-state.ts:81-88):面板开→关面板、多层→弹栈、单层→`CLOSED`。

#### `packages/reforge/src/menu/menu-box.ts` `MenuBox` class(menu-box.ts:449-588)
- `renderCascade`(menu-box.ts:474-513):金钱横卷轴(menu-box.ts:481-487)+ 逐层 box 偏移 `CASCADE_DX=27/CASCADE_DY=23`(menu-box.ts:146,493-494)。
- `drawSlicedBox`(menu-box.ts):9-slice tileFill 平铺;**`drawBoxShadow` 用 offscreen `source-in` black 0.35 alpha**(menu-box.ts)— **不是逐像素 PAL_CalcShadowColor**,是简化统一半透黑。
- `drawScroll`(menu-box.ts):单行卷轴 9 切片。
- 选中色 `SELECTED_COLORS` 6 帧(menu-box.ts 全文件常量)。

| 函数 | reforge 对照 | 状态 |
|---|---|---|
| PAL_CreateBoxWithShadow(逐像素 shadow) | drawSlicedBox(offscreen source-in 0.35 black) | ⚠️ shadow 简化 |
| PAL_CreateSingleLineBoxWithShadow | drawScroll | ✅ |
| PAL_ReadMenu(不跳 disabled) | moveCursor 环绕 + MAIN_MENU enabled 字段 | ⚠️(无 disabled 项实测,enabled=false 路径在 confirm 不动 menu-state.ts:72) |
| PAL_ShowCash | renderCascade 顶部 scroll + 「金钱」+ 黄数字(menu-box.ts:481-487) | ✅ |
| goto out 关整个栈 | back() 单层 → CLOSED(menu-state.ts:87) | ✨ 树级联单根,CLOSED 即关;但 DH9 「子菜单完关整栈」语义见单元 9 |

### 1.4 缺口 / 风险 / 行动
- **缺口 A**:reforge shadow 用 offscreen 半透黑,丢失 sdlpal `PAL_CalcShadowColor` 的「按底色降明度」语义(亮底上 sdlpal shadow 偏亮、暗底偏暗)。视觉低风险但非 1:1。
- **缺口 B**:reforge 是**单人 demo**(`world.party[0]`),MAIN_MENU 无队伍长度门控。多人时 menu-state 不需改,但所有 panel 渲染依赖 party[0]。
- **行动**:多人落地时,统一在 panel 入口加 `world.party[i]` 切换;shadow 若要 1:1 改 `drawBoxShadow` 读 dst 像素。

---

## 审计单元 2:状态面板(PlayerStatus 一屏 / 非页签)

### 2.1 sdlpal C 真值

#### `PAL_PlayerStatus`(uigame.c:1051-1286)— **关键:一屏全显,非页签**
- `iCurrent` 0..wMaxPartyMemberIndex 循环;`kKeyLeft/Up → iCurrent--`、`kKeyRight/Down/Search → iCurrent++`、`kKeyMenu → iCurrent=-1 退出`(uigame.c:1271-1283)。
- 越界即关(`iCurrent < 0 || > max`)。
- 渲染**单屏**:FBP 背景 + RGM 立绘 + **6 装备槽(ScreenLayout 固定坐标)** + 4 EXP/Lv/HP/MP label + 5 战斗属性 label + roleName + 3 slash + 7 vital 数字 + 5 stat 数字 + poisons(C6,MAX_POISONS=16,level<=3 才显示)(uigame.c:1130-1265)。
- **无 tab 切换**——所有信息一屏;切角色靠 4 方向循环 party。

### 2.2 一阶段实现

#### `packages/game/src/core/menu/player-status.ts`(59 行)— ✅ 1:1
- `PlayerStatusState {cursor, partyMembers, done}`(player-status.ts:18-27)— **无 tab 字段**。
- `playerStatusPrev`(player-status.ts:36-40):cursor--,越界 done=true。
- `playerStatusNext`(player-status.ts:43-46):cursor++,越界 done=true。
- `playerStatusCancel`(player-status.ts:50-52):done=true(= iCurrent=-1)。
- `currentRoleId`(player-status.ts:55-57):返回当前角色。

#### `packages/game/src/menu/present/menu/draw-player-status.ts`(270 行)— 10 段渲染 1:1
- FBP bg + RGM 立绘 + 6 槽 + 4 label + 5 stat label + roleName + 3 slash + 7 vital + 5 stat + poisons(C6/MAX_POISONS=16/level<=3)。

#### `dispatchPlayerStatusMenu`(menu-driver.ts:876-893)
- 4 方向全循环 party(menu-driver.ts:884-890);`done` → `gs.menuStack = []`(DH9,menu-driver.ts:888-890 注释 uigame.c:1007-1010)。

| 函数 | 一阶段对照 | 状态 |
|---|---|---|
| PAL_PlayerStatus 一屏非页签 | player-status.ts(无 tab)+ draw-player-status 10 段 | ✅(重点①达标) |
| 4 方向循环 party | playerStatusPrev/Next + dispatch 4 方向 | ✅ |
| poisons C6/MAX_POISONS=16/level<=3 | draw-player-status poisons 段 | ✅ |
| done → goto out | dispatch done → menuStack=[] | ✅(DH9) |

**一阶段 fix 命中**:无 tab 强制(重点①)、4 方向循环 party、DH9。

### 2.3 reforge 实现

#### `MenuBox.renderStatus`(menu-box.ts:515-587)
- 背景 statusBg 全屏(menu-box.ts:517)。
- **三栏简化布局**(menu-box.ts:523-586):
  - 左栏:9 属性行 `statList(c, items)`(menu-box.ts:286-298)— EXP/Level/HP/MP/atk/mAtk/def/spd/luck。
  - 中栏:名字(金黄)+ 立绘(menu-box.ts:542-549)。
  - 右栏:**6 装备格 2×3 平铺**(menu-box.ts:551-586)— `EQUIP_SLOTS` 6 项 + 装备图标 + 装备物名(0xBE)。
- `statList`(menu-box.ts:286-298):`EXP_TO_NEXT = 15` **硬编 demo 值**(menu-box.ts:276 注释「升级系统建后取真值」)。

#### `render(ctx, state, world, now, statusMember=0)`(menu-box.ts:457-471)
- `openPanel === 'status'` → renderStatus(world, statusMember);否则 renderCascade。
- **statusMember 默认 0**——单人 demo 恒 party[0]。**无 4 方向切角色的输入接线**(menu-state.ts 无 status 内 cursor 循环 party 的逻辑)。

| 函数 | reforge 对照 | 状态 |
|---|---|---|
| PAL_PlayerStatus 一屏非页签 | renderStatus 三栏一屏 | ✅(一屏达标;布局从固定 ScreenLayout 改三栏) |
| 6 装备槽(ScreenLayout 固定坐标) | EQUIP_SLOTS 2×3 平铺(menu-box.ts:553-586) | ⚠️ 布局重排非 1:1 坐标 |
| 4 方向循环 party | ❌ statusMember 默认 0,无输入接线 | ❌(单人 demo) |
| EXP 显示(maxKind cyan) | statList EXP_TO_NEXT=15 硬编 | ⚠️ demo 占位 |
| poisons(C6/MAX_POISONS=16) | ❌ 未渲染 | ❌ |

### 2.4 缺口 / 风险 / 行动
- **缺口 C(重点①反例)**:reforge 状态面板**布局非 sdlpal 固定坐标**(三栏重排),虽保「一屏非页签」核心语义,但 6 槽位置 / 立绘位置 / label 位置全变。若要 1:1 复刻需改回 ScreenLayout 真值。
- **缺口 D**:4 方向切角色未接(menu-state.ts 无 status 内 cursor)。多人时这是硬阻塞。
- **缺口 E**:poisons 段未实现(中毒状态显示)。
- **缺口 F**:EXP_TO_NEXT=15 硬编,升级系统建后须取 `rgLevelUpExp[level]`。
- **行动**:多人落地优先接 statusMember 输入(Up/Down 切 party);poisons / EXP 真值列入 content 依赖。

---

## 审计单元 3:装备菜单(装备 swap 链 / override 类 / 4-case 色)

### 3.1 sdlpal C 真值

#### `PAL_EquipItemMenu`(uigame.c:1794-2056)— **核心**
- 入口 `wLastUnequippedItem = wItem`(uigame.c:1820,**每帧 :1857-1859 重读**)— DM23 真值。
- FBP 背景(uigame.c:1830)。
- **4-case 色**(uigame.c:1930-1990):
  - 不可装此角色 → 0x18(inactive)
  - 不可装 + 选中 → 0x1C
  - 已装备 → 0xC8(equipped 橄榄绿)
  - 普通 → 0x4F
- **swap 链**(uigame.c:2016-2019):换下旧件 != 0 → 留 pick-role、`wLastUnequippedItem = old`;旧件 == 0(空槽)→ 回 list。可反复空格在两件间切换对比。
- 6 槽 label **烤进 FBP**(黑字),TS 不画。

#### `PAL_InventoryMenu`(uigame.c:878-919)— 2 项 box(装备/使用)
- 这是装备菜单的**入口层**(选「装备」才进 PAL_GameEquipItem)。

### 3.2 一阶段实现

#### `packages/game/src/core/menu/equip-menu.ts`(112 行)
- `EquipMenuState {phase: 'list'\|'pick-role'\|'done', list: InventoryMenuState, selectedItemId, playerCursor, partyMembers}`(equip-menu.ts 顶部)。
- `confirmEquipItem`(equip-menu.ts):查 `matchesFilter` + `count-inUse>0`。
- `confirmEquipRole`(equip-menu.ts):返回 `{itemId, roleId}` — **多角色 party 切换**。
- `equipMoveUp/Down` 环绕。

#### `packages/game/src/menu/present/menu/draw-equip.ts`(206 行)
- `drawEquipList` 复用 drawInventoryMenu。
- `drawEquipPickRole`:FBP bg + 物品 icon + 6 槽(FBP 有 label 故 TS 不画)+ 5 cyan 属性 + 角色名牌 box(cols=2 per `WordMaxWidth-1`)+ **4-case 色** + 物品名+数量。

#### `dispatchEquipMenu`(menu-driver.ts:691-771)— **DM23 swap 链**
- 进 pick-role 即 `gs.wLastUnequippedItem = s.selectedItemId`(menu-driver.ts:735,DM23)。
- swap 后 `s.selectedItemId = gs.wLastUnequippedItem`(menu-driver.ts:755,对齐 uigame.c:1859)。
- `done` → `gs.menuStack = []`(DH9,menu-driver.ts:768,注释 uigame.c:1024-1026)。

| 函数 | 一阶段对照 | 状态 |
|---|---|---|
| PAL_EquipItemMenu 4-case 色 | draw-equip 4-case + equip-menu matchesFilter | ✅(重点③) |
| swap 链(旧件!=0 留 / ==0 回 list) | dispatchEquipMenu DM23 wLastUnequippedItem + scriptOnEquip 0x18 | ✅(DM23) |
| 6 槽 label 烤进 FBP(TS 不画) | draw-equip 不画 label | ✅ |
| 多角色 pick-role(playerCursor) | equip-menu confirmEquipRole {itemId,roleId} | ✅ |
| done → goto out | dispatch done → menuStack=[] | ✅(DH9) |

**一阶段 fix 命中**:DM23(wLastUnequippedItem 入口每帧重读)、override 类(scriptOnEquip chain 0x18 真做)、4-case 色、DH9。

### 3.3 reforge 实现

#### `packages/reforge/src/equip-menu-state.ts`(96 行)
- `EquipMenuState {active, phase, items, cursor, casterId: **string**(单), selectedItemId}`(equip-menu-state.ts:15-23)。
- `openEquipMenu(world, casterId, items)`(equip-menu-state.ts:25-37):`equippableItems(world, casterId, items)` 过滤。
- `equipMoveCursor`(equip-menu-state.ts:47-59):**clamp 不环绕**(对齐一阶段 setCursorClamp)。
- `equipConfirmItem`(equip-menu-state.ts:62-67):记 selectedItemId → pick-role。**无 matchesFilter / count-inUse 复查**(信任 equippableItems 预过滤)。
- `equipApply`(equip-menu-state.ts:84-96):**swap 链存在** —— `oldItemId = caster.equipment[slot]`;oldItemId truthy → 留 pick-role 用 oldItemId 作新 selected;else → reopen list。✅ 对齐 uigame.c:2016-2019。
- `equipBackToList`(equip-menu-state.ts:70-77):Esc 回 list + 重算。

#### `packages/reforge/src/menu/equip-box.ts`(187 行)
- `drawEquipList`(equip-box.ts:73-82):复用 drawItemGridList。
- `drawEquipPickRole`(equip-box.ts:85-169):
  - statusBg(menu-box statusBg.png,equip-box.ts:95)— **不是 FBP**,用同一张状态板 bg。
  - 6 槽 label **字体画**(equip-box.ts:130-136,COLOR_DARK 纯黑无阴影)— **不靠 FBP**(因 reforge 无 FBP 烤字,自画)。
  - 角色名牌 box(equip-box.ts:119)+ 名 6 色炫彩(equip-box.ts:120-127)— **单 casterId,无角色列表循环**。
  - 5 cyan 属性(equip-box.ts:149-168)。
  - 选中物:卷轴框 + icon + 数量 + 名(金 COLOR_GOLD)(equip-box.ts:101-117)。

| 函数 | reforge 对照 | 状态 |
|---|---|---|
| PAL_EquipItemMenu swap 链 | equipApply swap 链(equip-menu-state.ts:84-96) | ✅(重点②达标) |
| DM23 wLastUnequippedItem 入口 | reforge 用 selectedItemId 字段,无跨帧 gs 变量 | ✨ 字段即真值,无「每帧重读」坑 |
| 4-case 色(不可装 0x18/0x1C) | ⚠️ equipConfirmItem 无 matchesFilter 门,4-case 视觉色未全实现(equippableItems 预过滤) | ⚠️ 视觉缺 0x18/0x1C case |
| override 类(scriptOnEquip 0x18) | 走 content equipItem(equip-menu-state.ts:93) | ✅ |
| 多角色 pick-role(playerCursor) | ❌ casterId: string 单(equip-menu-state.ts:20) | ❌(单人 demo) |
| 6 槽 label 烤进 FBP | 字体画(equip-box.ts:130,无 FBP) | ✨ 新架构无 FBP,自画合理 |

### 3.4 缺口 / 风险 / 行动
- **缺口 G(重点③部分偏离)**:reforge equipConfirmItem **无 sdlpal 的「不可装此角色」运行时门**(uigame.c:1930-1990 的 0x18/0x1C case)。equippableItems 预过滤已剔除不可装,故单角色 demo 不会触发;但**多角色时若 casterId 切换,列表未按新角色重过滤**会显不可装项且可确认。`equipBackToList` 重算可缓解,但 pick-role 内切角色需补重开。
- **缺口 H**:多角色 pick-role 缺(casterId 单 string)。多人落地硬阻塞。
- **风险**:swap 链 oldItemId 判 `caster.equipment[slot]` truthy —— 若旧件 id 恰为 falsy 字符串(实际 id 不会),逻辑错。低风险。
- **行动**:多人时 casterId 改 party 索引;pick-role 内切角色补 `openEquipMenu(world, newCasterId, items)` 重过滤。

---

## 审计单元 4:仙术菜单(仙术禁用 / 单 caster / 外场过滤)

### 4.1 sdlpal C 真值

#### `PAL_InGameMagicMenu`(uigame.c:653-875)— 大世界仙术菜单
- **三阶段**:pick-caster(选施法者)→ pick-spell(选仙术)→ pick-target(选目标)。
- 单人队伍 `partyMembers.length===1` → 跳过 pick-caster(sdlpal 隐式)。

#### `PAL_MagicSelectionMenuUpdate`(magicmenu.c:35-299)
- **MP 不足禁用**(magicmenu.c:245-257):`wMP < wCost` → 色 0x18 / 选中 0x1C,**且光标可停但确认 no-op**。

#### `PAL_MagicSelectionMenuInit`(magicmenu.c:301-410)
- MP 检查(magicmenu.c:349-352)。
- **外场标志**(magicmenu.c:354-368):`fInBattle` 区分战斗/外场可用仙术。
- **冒泡排序**(magicmenu.c:377-397)按角标排序。

### 4.2 一阶段实现

#### `packages/game/src/core/menu/in-game-magic-menu.ts`(307 行)— ✅
- `sLastCasterCursor` **模块静态**(in-game-magic-menu.ts 顶部)— 跨开关记忆施法者。
- 单人快捷:`partyMembers.length===1 → phase='pick-spell'`(跳 caster)。
- `confirmCaster` 记 cursor;`buildSpellMenu` 过滤 `usableOutsideBattle`;`refreshSpellMenu` 复 cursor 到 last spell。
- `confirmSpell`:applyToAll → 留 pick-spell;else → pick-target。
- `confirmTarget`;`cancelInGameMagic`:pick-target→pick-spell→done→pick-caster→done。

#### `packages/game/src/menu/present/menu/draw-magic.ts`(340 行)
- `drawPickCaster` / `drawMpBox`(WIN95 左侧 L8)/ `drawMagicDescription` / `drawMagicGrid`(5×3,disabled 色)/ `drawTargetPickerCursor`(CURSOR_UP @ 75+78i,158)/ `drawPlayerInfoBox`。

#### `dispatchInGameMagicMenu`(menu-driver.ts:779-865)
- applyToAll + 单目标分支(menu-driver.ts:819-862);MP 扣 post-cast。
- `done` → `gs.menuStack = []`(DH9,menu-driver.ts:862,注释 uigame.c:1014-1017)。

| 函数 | 一阶段对照 | 状态 |
|---|---|---|
| 三阶段 caster/spell/target | in-game-magic-menu 三 phase | ✅ |
| MP 不足禁用(0x18/0x1C + 光标可停) | draw-magic disabled 色 + buildSpellMenu MP 标记 | ✅(重点④) |
| 单人跳 caster | partyMembers.length===1 → pick-spell | ✅ |
| sLastCasterCursor 记忆 | 模块静态 | ✅ |
| 外场标志(usableOutsideBattle) | buildSpellMenu 过滤 | ✅ |
| done → goto out | dispatch done → menuStack=[] | ✅(DH9) |

**一阶段 fix 命中**:MP 禁用、外场过滤、sLastCaster 记忆、单人快捷、DH9。

### 4.3 reforge 实现

#### `packages/reforge/src/magic-menu-state.ts`(64 行)
- `MagicMenuState {active, phase: 'pick-spell'\|'pick-target', spells, cursor}`(magic-menu-state.ts:8-13)— **无 pick-caster 阶段,无 casterId 字段**。
- `resolveOutdoorSkills(world, casterId, skills)`(magic-menu-state.ts:19-29):learnedSkills → skills → 过滤 `usableOutsideBattle`。✅ 外场过滤达标。
- **MP 禁用判定在渲染层**(`magic-box 按 caster.mp >= cost.mp 灰显`),**状态机不标 disabled**(magic-menu-state.ts:16-18 注释 **TODO 自承认**:「将来支持施法时 disabled 判定应上移到状态机,别让壳层盲选」)。
- `magicConfirmSpell`(magic-menu-state.ts:40-43):selected → pick-target,**无 MP 门**(可盲选 MP 不足项)。
- `magicMoveCursor`(magic-menu-state.ts:52-64):clamp 不环绕。

#### `packages/reforge/src/menu/magic-box.ts`(140 行)
- `drawMagicMenu`(magic-box.ts:75-140):
  - 网格 3 列(magic-box.ts:88-105),MP 不足灰显 0x18/0x1C(magic-box.ts:93-101)— **渲染层判 disabled**。
  - `caster = world.party[0]`(magic-box.ts:83)— **单 caster 硬取 party[0]**。
  - MP box needed/current(magic-box.ts:108-111)。
  - 角色框 PBOX_X=45/PBOX_Y=165(magic-box.ts:113-125)。
  - 选人红箭头 PICKER_X=75/PICKER_Y=158(magic-box.ts:128-130)— **单人 i=0 恒定**。
  - 描述(magic-box.ts:133-139)。

| 函数 | reforge 对照 | 状态 |
|---|---|---|
| 三阶段 caster/spell/target | ❌ 无 pick-caster,仅 pick-spell/pick-target | ❌(单人 demo) |
| MP 不足禁用(状态机门) | ⚠️ 仅渲染层灰显,magicConfirmSpell 无门(自承认 TODO) | ⚠️(重点④偏离) |
| 外场标志 usableOutsideBattle | resolveOutdoorSkills 过滤 | ✅ |
| sLastCasterCursor 记忆 | ❌ 无 caster 概念 | ❌(单人) |
| 选人红箭头 | PICKER_X/Y 单人 i=0 | ⚠️(多人需循环) |
| done → goto out | 由 menu-state.back() 处理 | ✨ |

### 4.4 缺口 / 风险 / 行动
- **缺口 I(重点④偏离 + 自承认)**:reforge MP 禁用**仅渲染层**,状态机 `magicConfirmSpell` 无 MP 门 → 玩家可确认 MP 不足项(虽施法未实现暂无后果,但 TODO 注释 magic-menu-state.ts:16-18 已自认)。**这是 reforge 不读一阶段坑的典型**:一阶段 buildSpellMenu MP 标记 + draw-magic disabled 色是配对的,reforge 只复刻了渲染半。
- **缺口 J**:无 pick-caster 阶段,无 sLastCasterCursor 记忆。多人硬阻塞。
- **行动**:施法落地前,把 MP disabled 判定从 magic-box 上移到 magic-menu-state(magicConfirmSpell 加 `caster.mp >= cost.mp` 门,no-op 否则),删除 TODO。

---

## 审计单元 5:物品/背包(物品两阶段 / 记忆 / usable filter)

### 5.1 sdlpal C 真值

#### `PAL_ItemUseMenu`(uigame.c:1289-1500)— **两阶段 + INNER while**
- `sSelectedPlayer` 静态(uigame.c:1295)— 跨开关记忆目标。
- **INNER while 循环**(uigame.c:1430-1480):单体物用完留菜单可连用,用光才回 list。
- applyToAll 类(play.c:268-323):跳过 picker,直接 runScript + consume + return。

#### `PAL_ItemSelectMenuUpdate`(itemmenu.c:28-311)— 3 列网格
- **6-case 色**(itemmenu.c:135-181):normal/selected/inactive/selected-inactive/equipped/confirmed。
- **cursor clamp 不环绕**(itemmenu.c:107-112)。
- `g_fNoDesc` 控制描述区。

#### `PAL_ItemSelectMenuInit`(itemmenu.c:313-377)— **不过滤,加 usable 装备物**
- itemmenu.c:352-376:把**已装备的 usable 物**也加进列表(L39 fix 真值)。

### 5.2 一阶段实现

#### `packages/game/src/core/menu/inventory-menu.ts`(275 行)— ✅
- `sSelectedItemTargetSlot` **模块静态**(inventory-menu.ts 顶部)— 目标槽光标记忆(L40)。
- `INV_ITEMS_PER_LINE=3 / INV_LINES_PER_PAGE=7`。
- `pickItemRowColor` 6-case 纯函数(inventory-menu.ts)— 对齐 itemmenu.c:135-181。
- `createInventoryMenu`:usable filter **加已装备 usable 物**(L39)。
- 网格 nav **clamp 不环绕**(L38 衍生)。
- `confirmInventoryItem`:查 usable + count-inUse>0;targetItems **死人不 disabled**(L41 单人快捷衍生)。
- `confirmInventoryTarget` 写 sSelectedItemTargetSlot(L40)。

#### `packages/game/src/menu/present/menu/draw-inventory.ts`(347 行)
- `drawInventoryMenu`(box / page / 6-case pickItemRowColor / cursor / description)。
- `drawItemUseMenu`(phase='use-target' 叠加:box 110,2 7×9 / 8 stat label / stat 值带 slash+max / party 名 / ITEMBOX+icon+name+amount / LIVE amount 读 gs.inventory)。

#### `dispatchInventoryMenu`(menu-driver.ts:584-681)
- 每帧刷新 state.inventory snapshot + 全局 cursor 记忆(menu-driver.ts:593)。
- use-target 阶段 DL20 键映射(menu-driver.ts:598)。
- applyToAll 路径(menu-driver.ts:637-639,play.c:305-322 真值)。
- `done` → `gs.menuStack = []`(DH9,menu-driver.ts:672,注释 uigame.c:1024-1026)。

| 函数 | 一阶段对照 | 状态 |
|---|---|---|
| PAL_ItemUseMenu 两阶段 + INNER while | inventory-menu 两阶段 + dispatch use-target 连用 | ✅(重点⑤) |
| 6-case 色 | pickItemRowColor 6-case | ✅ |
| clamp 不环绕 | inventory-menu setCursorClamp | ✅(L38) |
| sSelectedItemTargetSlot 记忆 | 模块静态 | ✅(L40) |
| usable filter 加已装备 usable 物 | createInventoryMenu L39 | ✅(L39) |
| applyToAll 跳 picker | dispatch applyToAll 路径 | ✅ |
| done → goto out | dispatch done → menuStack=[] | ✅(DH9) |

**一阶段 fix 命中**:L38(clamp)、L39(usable filter 加装备物)、L40(target slot 记忆)、L41(单人跳 caster)、两阶段、DH9。

### 5.3 reforge 实现

#### `packages/reforge/src/use-menu-state.ts`(99 行)
- `UseMenuState {active, phase: 'pick-item'\|'pick-target', items, cursor, selectedItemId}`(use-menu-state.ts:18-24)。
- `openUseMenu(world, items, initialCursor)`(use-menu-state.ts:27-35):`usableItems(world, items)` 过滤 + initialCursor 记忆(注释「记忆由 main.ts 持有」)。
- `useConfirm`(use-menu-state.ts:62-77):
  - `sel.use?.target === 'oneAlly'` → pick-target。
  - 脚本/全体类 → `useItem(world, world.party[0]?.id ?? '', sel.id, items)` **直接执行**(use-menu-state.ts:75)— **triggerScript 为桩**(use-menu-state.ts:74 注释「demo:triggerScript 为桩 → 无视觉变化」)。
- `useApply`(use-menu-state.ts:87-99):**INNER while 连用达标** —— `stillUsable` 检查,还有则留 pick-target,用光则回 list 重算。✅ 对齐 uigame.c:1430-1480。

#### `packages/reforge/src/menu/use-box.ts`(136 行)
- `drawUseMenu`(use-box.ts:67-136):
  - pick-item:`drawItemGridList`(use-box.ts:78)— 复用共享 item-list。
  - pick-target:列表照画 + 右侧黄框(use-box.ts:86,UB_BOX 110,2)+ 8 stat + 角色名 + itembox。
  - **`caster = world.party[0]`**(use-box.ts:82)— **单目标硬取 party[0]**。
  - 角色名循环 `world.party.forEach` 但 `selected = i === 0` 恒定(use-box.ts:112-113)— **单人目标**。

#### `packages/reforge/src/menu/item-list.ts`(88 行)
- `drawItemGridList`(item-list.ts:42-88):红框 3 列 + 数量 + 选中光标 + 底部 itembox + 图标 + 多行描述。
- **6-case 色简化为 3-case**:`equipped.has → COLOR_EQUIPPED / selected → blink / else COLOR_NORMAL`(item-list.ts:62)— **缺 0x18/0x1C/0x2C(confirmed)case**。

| 函数 | reforge 对照 | 状态 |
|---|---|---|
| PAL_ItemUseMenu 两阶段 + INNER while | useConfirm/useApply 两阶段 + stillUsable 连用 | ✅(重点⑤达标) |
| 6-case 色 | item-list 3-case(缺 inactive/confirmed) | ⚠️ |
| sSelectedItemTargetSlot 记忆 | initialCursor 记忆(main.ts 持有) | ✨(范式不同但等价) |
| usable filter 加已装备 usable 物 | usableItems content 过滤(是否含装备物待 content 验证) | ⚠️ |
| applyToAll 跳 picker | useConfirm 脚本类直接执行 | ✅(triggerScript 桩) |
| 单体目标循环 party | ❌ party[0] 单目标 | ❌(单人 demo) |
| triggerScript 真跑 | ⚠️ 桩(use-menu-state.ts:74) | ⚠️ |
| done → goto out | menu-state.back() | ✨ |

### 5.4 缺口 / 风险 / 行动
- **缺口 K**:reforge item-list **6-case 色简化为 3-case**(缺 0x18 inactive / 0x1C selected-inactive / 0x2C confirmed)。当前 demo 无 inactive 物(usableItems 预过滤),confirmed case 在装备菜单才用,故低风险,但非 1:1。
- **缺口 L**:单体目标循环 party 未实现(use-box.ts:113 `selected = i===0` 恒定)。多人硬阻塞。
- **缺口 M**:triggerScript 桩(use-menu-state.ts:74)— 脚本类物(土灵珠脱离洞窟)无视觉变化。脚本系统建后补。
- **缺口 N**:usable filter 是否含「已装备 usable 物」(L39)取决于 content `usableItems` 实现,需验。
- **行动**:多人接 party 索引;triggerScript 接真脚本系统;6-case 色补全按需。

---

## 审计单元 6:商店(买/卖/装备回收)

### 6.1 sdlpal C 真值

#### `PAL_BuyMenu`(uigame.c:1615-1707)
- `__buymenu_firsttime_render` 首帧渲染标志。
- 价>现金 → 不进确认。
- 确认门(确认框)。

#### `PAL_SellMenu`(uigame.c:1755-1791)
- 全屏 `PAL_ItemSelectMenu`。
- 每次卖出后刷新列表。

#### `PAL_EquipItemMenu`(uigame.c:1794-2056)— 商店装备回收走同函数(见单元 3)。

### 6.2 一阶段实现

#### `packages/game/src/core/menu/shop-menu.ts`(104 行)+ `sell-menu.ts`(140 行)
- `ShopMenuState {mode, phase, list, selectedItemId, confirmYes}`(shop-menu.ts)。
- `createBuyMenu` pageSize 8。
- `shopSelectItem`:buy 价>cash → no confirm。
- `SellMenuState {phase, grid: InventoryMenuState, ...}`(sell-menu.ts)— 全屏 picker。
- `refreshSellGrid` 每次卖出后刷新。

#### `packages/game/src/menu/present/menu/draw-shop.ts`(189 行)
- `drawShopMenu`:buy list box 122,8 8×8 + prices + preview ITEMBOX+icon + owned count(含装备)+ cash box + confirm box。
- `drawSellOverlay`:cash box 100,150 + price box 224,150。

#### `dispatchShopMenu`(menu-driver.ts:256-290)
- DL21 导航(menu-driver.ts:276)。

| 函数 | 一阶段对照 | 状态 |
|---|---|---|
| PAL_BuyMenu 价>cash 门 | shopSelectItem | ✅ |
| PAL_BuyMenu 确认门 | confirmYes | ✅ |
| PAL_SellMenu 全屏 + 刷新 | SellMenuState refreshSellGrid | ✅ |
| owned count 含装备 | draw-shop | ✅ |
| DL21 导航 | dispatchShopMenu | ✅(DL21) |

### 6.3 reforge 实现

#### ❌ **未实现**
- 无 `shop-menu-state.ts` / `shop-box.ts` / `sell-*` 文件。
- `MAIN_MENU`(menu-state.ts:16-28)**无 shop 节点**(商店是 NPC 触发,不在主菜单树)。

| 函数 | reforge 对照 | 状态 |
|---|---|---|
| PAL_BuyMenu | ❌ | ❌ |
| PAL_SellMenu | ❌ | ❌ |
| PAL_EquipItemMenu(回收) | equip-menu-state 可复用(见单元 3) | ⚠️(状态机在,商店壳缺) |

### 6.4 缺口 / 风险 / 行动
- **缺口 O**:商店整体未实现。NPC 对话脚本触发商店的入口未建。
- **行动**:商店落地时,shop 壳可复用 item-list 网格 + equip-menu-state 的 swap 链(回收装备走同逻辑);buy 价>cash 门 + confirm 框按 sdlpal uigame.c:1615-1707 实现。

---

## 审计单元 7:存档(存档计数 / 跨槽 counter)

### 7.1 sdlpal C 真值

#### `GetSavedTimes`(uigame.c:26-39)— **跨槽 counter**
- 扫 slot 1..5,取 max savedTimes + 1 作新槽的 savedTimes。
- 5 固定槽(uigame.c:169-238 PAL_SaveSlotMenu)。

#### `PAL_SaveSlotMenu`(uigame.c:169-238)
- 5 槽,每槽显 savedTimes(累计存档次数)。
- 默认光标 = 上次用的槽(DM24 真值)。

### 7.2 一阶段实现

#### `packages/game/src/core/menu/save-slot-menu.ts`(79 行)
- 5 槽,`SAVE_SLOT_LABELS = ['进度一'..'进度五']`(save-slot-menu.ts)。
- `createSaveSlotMenu` 带 `defaultSlot`(DM24)。
- `fetchSlotMetas` async。

#### `packages/game/src/menu/present/menu/draw-menu.ts` `drawSaveSlotMenu`
- 5 单行框 + savedTimes(从 slotMetas)。

#### `dispatchSaveSlotMenu`(menu-driver.ts:895-965)
- save:`wSavedTimes = max(GetSavedTimes(1..5)) + 1`(menu-driver.ts:921-931 注释 + 实现)— **跨槽 counter 真值复刻**。
- load:`_loadGameHandler`。
- DM24 默认落上次槽(menu-driver.ts:504/510 注释)。
- 取消 DH9(menu-driver.ts:904 注释)。

| 函数 | 一阶段对照 | 状态 |
|---|---|---|
| GetSavedTimes 跨槽 counter | dispatch max+1(menu-driver.ts:931) | ✅(重点⑦) |
| 5 固定槽 | SAVE_SLOT_LABELS 5 项 | ✅ |
| DM24 默认光标 | createSaveSlotMenu defaultSlot | ✅(DM24) |
| 取消关整个菜单 | dispatch DH9 | ✅(DH9) |

### 7.3 reforge 实现

#### `packages/reforge/src/save/types.ts`(41 行)— **故意分歧:30 槽分页**
- `ALL_SLOT_IDS = ['auto','quick','m01'..'m28']` = 30 槽(types.ts:11-15)。
- `SLOTS_PER_PAGE=3 / TOTAL_PAGES=10`(types.ts:7,17)。
- `SaveMeta {slotId, kind, party, mapName, savedAt}`(types.ts:24-30)— **savedAt 时间戳替代 savedTimes 计数器**。

#### `packages/reforge/src/save/browser-state.ts`(89 行)
- `SaveBrowserState {active, mode, cursor, metas, confirmOverwrite}`(browser-state.ts:5-11)。
- `browserMoveCursor`:↑↓ ±1、←→ ±页(browser-state.ts:45-54)— **clamp 不环绕**。
- `browserConfirm`:save 空手动槽→write、已存→覆盖确认、auto/quick→no-op;load 已存→load、空→no-op(browser-state.ts:58-73)。
- `browserConfirmOverwriteYes/No`(browser-state.ts:75-89)。

#### `packages/reforge/src/save/ops.ts`(42 行)
- `buildMeta(slotId, world, mapName, nameOf, now)`(ops.ts:5-19)— **now 注入 Date.now()**,无 savedTimes 累计。
- `buildPayload` / `captureThumbnail`(64×40 PNG)。

#### `packages/reforge/src/save/store.ts`(95 行)
- `SaveStore` 抽象(putSlot/listMeta/getPayload/getThumb);MemorySaveStore + IndexedDbSaveStore(三 store:meta/payload/thumb 原子事务)。

#### `packages/reforge/src/menu/save-browser-box.ts`(191 行)
- `drawSaveBrowser`(save-browser-box.ts:61-191):
  - 标题黄 + 翻页三角(save-browser-box.ts:78-96)。
  - 每槽:卷轴 9 切片 + 三角光标 + 槽号(auto/quick 2 行 / manual 单行)+ 缩略图 + 队伍·等级 + 地图名·时间(save-browser-box.ts:98-174)。
  - 覆盖确认框(save-browser-box.ts:178-190)。

| 函数 | reforge 对照 | 状态 |
|---|---|---|
| GetSavedTimes 跨槽 counter | ❌ 改 savedAt 时间戳 | ❌(重点⑦故意分歧) |
| 5 固定槽 | 30 槽分页(auto/quick/m01-28) | ❌(故意扩容) |
| DM24 默认光标 | openSaveBrowser initialCursor(browser-state.ts:23) | ✅ |
| 缩略图 | captureThumbnail 64×40 | ✨(sdlpal 无缩略图,新功能) |
| 覆盖确认 | confirmOverwrite + Yes/No | ✅ |
| 取消关整个菜单 | 由 main.ts back() 处理 | ✨ |
| 工程绑定(projectId) | SavePayload projectId(types.ts:36) | ✨(sdlpal 无,防跨工程读档) |

### 7.4 缺口 / 风险 / 行动
- **缺口 P(重点⑦故意分歧,非 bug)**:reforge **故意放弃** savedTimes 跨槽累计计数器,改 savedAt 时间戳 + 30 槽分页 + auto/quick 分类。这是 reforge 的现代存档设计选择(save-system-design.md / save-system-plan.md 已立项),**非「不读一阶段坑」**。若产品要 sdlpal 1:1 存档计数,需补 savedTimes 字段。
- **缺口 Q**:30 槽 vs sdlpal 5 槽,UI 完全不同(分页 + 缩略图 vs 5 单行框 + savedTimes)。视觉非 1:1。
- **风险**:save 模式 auto/quick 不可写(browser-state.ts:67),manual 槽 m01-28 可写 —— 与 sdlpal「5 槽皆可写」语义不同,玩家可能困惑(但 auto/quick 是自动存档专用,合理)。
- **行动**:若要 sdlpal 兼容,补 savedTimes;否则记录为「故意现代设计」,不视为 debt。

---

## 审计单元 8:开场(开场流程 / 3.avi / 新游戏 vs 读档)

### 8.1 sdlpal C 真值

#### `PAL_OpeningMenu`(uigame.c:83-166)
- 2 项:新游戏 / 读档(uigame.c:90-110)。
- Cancel = 新游戏(sdlpal 真值,uigame.c:130)。
- 选新游戏 → 播 3.avi(uigame.c:140)→ return 0。
- 选读档 → return 1-5(槽号)。

#### `game.c PAL_GameMain`(game.c:20-80)
- `bCurrentSaveSlot = PAL_OpeningMenu()` → `PAL_ReloadInNextTick`。

### 8.2 一阶段实现

#### `packages/game/src/core/menu/opening-menu.ts`(71 行)— ✅
- `OPENING_LABELS` 新游戏/读游戏(opening-menu.ts)。
- `openingMenuLabels` 给渲染器。

#### `packages/game/src/menu/present/menu/draw-opening-menu.ts`(71 行)
- `openingItemX = 125 - (w>4 ? (w-4)*8 : 0)`(居中公式)。
- **无框**(PAL_ReadMenu NULL)。

#### `dispatchOpeningMenu`(menu-driver.ts:370-405)
- **Cancel = 新游戏**(menu-driver.ts:389 注释,对齐 sdlpal uigame.c:130)。
- DL21 导航(menu-driver.ts:377)。
- load 现 stub(menu-driver.ts:389)。

| 函数 | 一阶段对照 | 状态 |
|---|---|---|
| PAL_OpeningMenu Cancel=新游戏 | dispatchOpeningMenu Cancel=新游戏 | ✅(重点⑧) |
| 新游戏播 3.avi | (由 game 入口处理,非菜单) | ✅ |
| 无框居中 | draw-opening-menu 无框 + 居中公式 | ✅ |
| DL21 导航 | dispatchOpeningMenu | ✅(DL21) |

### 8.3 reforge 实现

#### ❌ **未实现(X3 自承认)**
- 无 `opening-menu-state.ts` / `opening-box.ts`。
- `menu-state.ts` MAIN_MENU 是**游戏内主菜单**,非开场标题屏。
- reforge 假定由 `main.ts` 入口直接进 demo 场景,**无标题屏 / 无新游戏 vs 读档分流 / 无 3.avi**。

| 函数 | reforge 对照 | 状态 |
|---|---|---|
| PAL_OpeningMenu | ❌ | ❌ |
| Cancel=新游戏 | ❌ | ❌ |
| 新游戏播 3.avi | ❌ | ❌ |

### 8.4 缺口 / 风险 / 行动
- **缺口 R**:开场整体未实现(X3 自承认)。这是产品级缺失,非「不读坑」。
- **行动**:标题屏落地时,Cancel=新游戏(sdlpal uigame.c:130 真值)必须复刻;3.avi 在 reforge 改为 webm/mp4 视频或 sprite 序列;读档分流接 save-browser load 模式。

---

## 审计单元 9:主菜单 / 系统菜单(DH9 / L38 / 默认光标)

### 9.1 sdlpal C 真值

#### `PAL_InGameMenu`(uigame.c:944-1048)— 4 项 hub
- 4 项:状态/仙术/物品/系统(uigame.c:950-970)。
- `VIDEO_BackupScreen` / `VIDEO_RestoreScreen`(uigame.c:975/1045)。
- case 1-4 各调子菜单;**任何子菜单返回 → goto out 关整个菜单回大世界**(uigame.c:1007/1014/1024/1031)。

#### `PAL_SystemMenu`(uigame.c:516-651)— 5 项 + battleSpeed
- 5 项 + battleSpeed(uigame.c:520-540)。
- `PAL_SystemMenu` return TRUE → caller goto out(uigame.c:633/642/650)。
- `PAL_ConfirmMenu`(uigame.c:343-365)/ `PAL_SwitchMenu`(uigame.c:368-389)/ `PAL_SelectionMenu`(uigame.c:240-317)。

### 9.2 一阶段实现

#### `packages/game/src/core/menu/in-game-menu.ts`(130 行)— ✅
- `IN_GAME_LABELS` 4 项(状态/仙术/物品/系统)。
- `SYSTEM_LABELS` 5 项(存档/读档/音乐/音效/退出)。
- `systemMenuEnterSwitch` 默认当前态。

#### `packages/game/src/menu/present/menu/draw-menu.ts`(434 行)
- `drawMenuStack` 入口 hub。
- `drawCashBox`(cash label 色=0 黑,无阴影)。
- `drawInGameMenu`(box 3,37 cols=menuTextMaxCols)。
- `drawSystemMenu`(box 40,60)。
- `drawSaveSlotMenu`(5 单行框)。

#### `dispatchInGameMenu`(menu-driver.ts:395-441)+ `dispatchSystemMenu`(menu-driver.ts:443-540)
- **DH9 核心修复**(menu-driver.ts:449-486):
  - 「子菜单完成/取消按 goto out 关整个菜单回大世界」(uigame.c:1031 真值)。
  - case3/4(物品/系统)switch 完仍走 PAL_SystemMenu return TRUE → goto out(menu-driver.ts:460-469 注释)。
  - 取消 = PAL_SwitchMenu CANCELLED → 同「否」→ goto out(menu-driver.ts:481 注释 + 实现 `gs.menuStack = []`)。
- DM24 默认光标(menu-driver.ts:504/510)。

| 函数 | 一阶段对照 | 状态 |
|---|---|---|
| PAL_InGameMenu 4 项 hub | IN_GAME_LABELS + drawInGameMenu | ✅ |
| PAL_SystemMenu 5 项 | SYSTEM_LABELS + drawSystemMenu | ✅ |
| DH9 goto out 关整栈 | dispatchSystemMenu gs.menuStack=[] | ✅(DH9,重点⑨) |
| systemMenuEnterSwitch 默认当前态 | in-game-menu | ✅ |
| DM24 默认光标 | dispatchSaveSlotMenu defaultSlot | ✅(DM24) |
| VIDEO_Backup/Restore | 由 menu-mode resumeAfterMenusClosed 处理 | ✅ |

**一阶段 fix 命中**:DH9(goto out)、L38、DM24、DL21、VIDEO_Backup 等价。

### 9.3 reforge 实现

#### `packages/reforge/src/menu-state.ts` `MAIN_MENU`(menu-state.ts:16-28)
- 4 项:status/magic/item→[equip,use]/system(menu-state.ts:16-28)— **item 二级级联**(对齐 sdlpal「物品→装备/使用」2 项 box)。
- `moveCursor`/`confirm`/`back`(menu-state.ts:58-88)— 树级联范式。

#### `packages/reforge/src/system-menu-state.ts`(117 行)
- `SYSTEM_ITEMS` 5 项(system-menu-state.ts:15-21):save/load/music/sound/quit。
- `openSystemMenu(initialCursor)`(system-menu-state.ts:35-39)— **光标恢复**(对齐 sdlpal iCurSystemMenuItem)。
- `systemMoveCursor`(system-menu-state.ts:47-56):**环绕** `(c+delta+n)%n`(对齐一阶段 primitives.moveSelection,非 inventory clamp)。
- `systemConfirm`(system-menu-state.ts:67-88):save/load → open-save/open-load action;music/sound → switch 子选单(默认高亮当前态);quit → confirm。
- `systemSwitchCommit`(system-menu-state.ts:99-106):switch 落定 → **`closeSystemMenu()`**(system-menu-state.ts:105)。
- **`systemConfirmYes`(system-menu-state.ts:110-117)**:confirm 「是」→ quit action;**「否」→ `closeSystemMenu()` + 注释自承认偏离**(system-menu-state.ts:109,116):
  > ⚠ 「否」关菜单后,main.ts 走 menu=back(menu) 回主菜单 hub(不复刻原版「弹回大世界」)。

#### `packages/reforge/src/menu/system-box.ts`(95 行)
- `drawSystemMenu`(system-box.ts:25-95):box 40,60 + 5 项 53,72+i*18 + confirm/switch 复用 drawConfirmBox + 占位提示。

| 函数 | reforge 对照 | 状态 |
|---|---|---|
| PAL_InGameMenu 4 项 hub | MAIN_MENU 4 项(item 二级级联) | ✅ |
| PAL_SystemMenu 5 项 | SYSTEM_ITEMS 5 项 | ✅ |
| DH9 goto out 关整栈 | ⚠️ systemConfirmYes「否」回 hub 非「弹回大世界」(自承认 system-menu-state.ts:109) | ⚠️(重点⑨偏离 + 自承认) |
| systemSwitchCommit 关系统菜单 | closeSystemMenu(system-menu-state.ts:105) | ⚠️(只关系统菜单,不关整栈;main.ts back 回 hub) |
| 光标恢复 iCurSystemMenuItem | openSystemMenu initialCursor | ✅ |
| systemMoveCursor 环绕 | (c+delta+n)%n | ✅ |
| music/sound switch 默认当前态 | systemConfirm confirmYes=audio.musicOn | ✅ |

### 9.4 缺口 / 风险 / 行动
- **缺口 S(重点⑨偏离 + 自承认,reforge 不读一阶段坑的典型)**:reforge `systemConfirmYes`「否」**回主菜单 hub**,而 sdlpal / 一阶段 DH9 是「弹回大世界」(uigame.c:1031)。system-menu-state.ts:109 ⚠ 注释**已自承认**:「不复刻原版『弹回大世界』」。**这正是用户背景所述「reforge 重写引擎不读一阶段踩过的坑」的实例**:一阶段 DH9 fix 显式 `gs.menuStack = []` 关整栈,reforge 用树级联 back() 只弹一层回 hub。
- **缺口 T**:`systemSwitchCommit` 同理只关系统菜单(menu-state.ts back 回 hub),不关整栈。
- **风险**:玩家在系统菜单选「音乐」切完 / 选「退出」选「否」,reforge 回 hub(可继续操作主菜单),sdlpal 直接回大世界。行为分歧可能导致玩家预期不符。
- **行动**:与产品确认是否要 1:1 复刻 DH9(关整栈回大世界)。若是,systemConfirmYes「否」+ systemSwitchCommit 应返回 action 让 main.ts 关整菜单(`closeMenu()`)而非 `closeSystemMenu()` + back。

---

## 跨单元总结

### reforge 不读一阶段坑的实例汇总(用户背景验证)

| 坑 | 一阶段 fix | reforge 状态 | reforge 是否自承认 |
|---|---|---|---|
| DH9 子菜单完关整栈回大世界 | menu-driver gs.menuStack=[] | ⚠️ systemConfirmYes「否」回 hub | ✅ system-menu-state.ts:109 ⚠ 注释 |
| MP 禁用状态机门(重点④) | buildSpellMenu MP 标记 | ⚠️ 仅渲染层,magicConfirmSpell 无门 | ✅ magic-menu-state.ts:16-18 TODO |
| 6-case 色(0x18/0x1C/0x2C) | pickItemRowColor 6-case | ⚠️ item-list 3-case | ❌ 未提 |
| 装备 4-case 色(不可装 0x18/0x1C) | draw-equip 4-case | ⚠️ equipConfirmItem 无 matchesFilter 门 | ❌ 未提 |
| usable filter 加已装备物(L39) | createInventoryMenu | ⚠️ 待 content usableItems 验证 | ❌ 未提 |
| target slot 记忆(L40) | sSelectedItemTargetSlot | ✨ initialCursor(main.ts 持有)范式等价 | — |
| 单人跳 caster(L41) | partyMembers.length===1 | ❌ 单人 demo 无 caster 概念 | — |
| DM23 wLastUnequippedItem | gs.wLastUnequippedItem | ✨ selectedItemId 字段即真值 | — |
| DM24 默认光标 | createSaveSlotMenu defaultSlot | ✅ openSaveBrowser initialCursor | — |

**结论**:reforge 在**纯范式重构的坑**(L40/L41/DM23/DM24)上要么 ✨ 免疫、要么 ✅ 命中;但在**纯行为对齐的坑**(DH9/MP 禁用门/4-case 色/L39)上**系统性偏离**,且 DH9 / MP 两处**有自承认注释**(system-menu-state.ts:109 / magic-menu-state.ts:16-18),其余无注释——**印证用户背景判断**。

### 多人 demo 限制(贯穿所有单元)

reforge 全链路 **单人 demo**:
- menu-state MAIN_MENU 无队伍门控。
- player-status `statusMember` 默认 0(menu-box.ts:463)。
- equip `casterId: string` 单(equip-menu-state.ts:20)。
- magic 无 pick-caster,`world.party[0]` 硬取(magic-box.ts:83)。
- use 单目标 `selected = i===0`(use-box.ts:113)。

多人落地是**跨单元硬阻塞**,需统一在 panel 入口接 party 索引。

### 故意分歧(非 debt)

- **存档**(单元 7):30 槽分页 + savedAt 时间戳 + 缩略图 + auto/quick 分类 + projectId 工程绑定 —— 现代存档设计(save-system-design.md 立项),**非「不读坑」**。
- **装备 6 槽 label 字体画**(单元 3):reforge 无 FBP 烤字,自画合理。
- **shadow 半透黑**(单元 1):offscreen source-in 0.35,简化但视觉可接受。

### 缺失功能(产品级,非 debt)

- **商店**(单元 6):整体未实现,NPC 触发入口未建。
- **开场**(单元 8):整体未实现(X3 自承认),无标题屏 / 无 3.avi / 无新游戏 vs 读档分流。

### 优先行动(按影响排序)

1. **DH9 行为对齐**(单元 9):与产品确认是否 1:1。若要,systemConfirmYes「否」+ systemSwitchCommit 改返回 action 让 main.ts `closeMenu()`。
2. **MP 禁用状态机门**(单元 4):施法落地前,把 disabled 判定从 magic-box 上移到 magic-menu-state(magicConfirmSpell 加 MP 门),删 TODO。
3. **多人落地**(全单元):统一 panel 入口接 party 索引;补 pick-caster(magic)/ pick-role 多角色(equip)/ target 循环(use)/ status 4 方向切角色。
4. **6-case / 4-case 色补全**(单元 3/5):按需补 0x18/0x1C/0x2C case。
5. **商店**(单元 6):复用 item-list + equip-menu-state swap 链,补 buy 价>cash 门 + confirm 框。
6. **开场**(单元 8):标题屏 + Cancel=新游戏 + 视频替代 3.avi。
7. **EXP_TO_NEXT 真值**(单元 2):升级系统建后取 `rgLevelUpExp[level]`,删 menu-box.ts:276 硬编。
8. **poisons**(单元 2):补中毒状态显示(C6/MAX_POISONS=16/level<=3)。
9. **shadow 1:1**(单元 1):若要逐像素 PAL_CalcShadowColor,改 drawBoxShadow 读 dst 像素。
