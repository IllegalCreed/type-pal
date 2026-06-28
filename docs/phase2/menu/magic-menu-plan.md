# 仙术菜单 实现计划

> **For agentic workers:** 交 GLM 执行,Claude 审 + 浏览器对齐截图。第二阶段 Reforge,先读 [READ-FIRST](../READ-FIRST.md)。
> **参考第一阶段 game `packages/game/src/present/menu/draw-magic.ts` + `core/menu/in-game-magic-menu.ts`(原版 1:1 复刻),照搬布局/逻辑,不照搬其全局架构(reforge 是 clean rewrite)。**

**Goal:** 大世界仙术菜单(单人 pick-spell 查看版),对齐原版:红框仙术网格 + 左侧 MP box + 底部角色框 + 效果描述。

**范围(demo 单人):** ✅ pick-spell 页(网格 + MP + 角色框 + 描述);❌ 选施法人(单人跳)、选目标 + 实际施法(先查看,scriptDesc 解析简化)。

## 真值规格(game draw-magic.ts 坐标,勿改)

- **仙术网格红框**:`PAL_CreateBoxWithShadow(10, 42)` rows=4 cols=16 **style 1(红框,已 bake `ui/box-red/`)**;仙术名起点 `(35, 54)`,**3 列**(每列 +87px)× 5 行(每行 +18px);选中 cursor sprite(`ui/cursor/grid.png`)at `(itemX+25, itemY+10)`。
- **MP box(左上,WIN95)**:`drawSingleLineBox(0,0) len5`;needed MP `(15,14)` 黄右对齐 + slash sprite `(45,14)` + current MP `(50,14)` 青右对齐。**不画金钱框**(与描述互斥)。
- **PlayerInfoBox(底部)**:`(45 + 78×i, 165)` —— playerbox(`ui/magic/playerbox.png`)+ face(`ui/magic/face-0.png`,画在 box `x-2,y-4`)+ HP/MP(slash@`x+49,y+6/22`;HP 黄 cur@`x+26,y+5` max@`x+47,y+8`;MP 青 cur@`x+26,y+21` max@`x+47,y+24`)。单人画 1 个。
- **描述(顶部)**:`(102, 3)`,色 `0x3C`,每行 +16。**demo 简化:先显当前仙术名**(scriptDesc→效果文字解析留后)。
- **数字色**:needed/HP/maxHP 黄,current MP/maxMP 青。复用 `drawNumber`(已有黄/蓝/青 nums + slash)。
- **网格导航**(game 真值):↑↓ = ±3(列数),←→ = ±1,边界 clamp 不 wrap。

## Global Constraints

- 阶段隔离:仙术数据在 `@type-pal/content`;渲染/状态机在 reforge。零 lint/type;每 Task tsc + biome 0/0。
- sprite 已全 bake(`ui/box-red/` 红框 9 帧、`ui/magic/playerbox|face-0`、`ui/cursor/up|down|grid`、`ui/num/slash`、`ui/num*` 数字)。canvas 靠浏览器验。

---

## Task 1: content 仙术数据 + 李逍遥仙术

**Files:** `packages/content/src/magic.ts`(新)+ test;`character.ts`(李逍遥 initialMagic)

- [ ] **Step 1:** 新建 `magic.ts`:`SpellData { id: string; name: string; costMP: number; usableOutsideBattle: boolean }`。
  **⚠ 第二阶段铁律(杜绝下标式身份):仙术身份用语义 id(拼音 kebab),不用原版 object 下标(oid 296 那种全局杂糅大数组下标)。`SpellData` 自包含 —— name/costMP 存值,不存 magicNumber/oid 等原版下标。** demo 常量 `DEMO_SPELLS`(值已核实,直接填):

  | id(语义) | name | costMP | (溯源,仅注释不入字段) |
  |---|---|---|---|
  | `qi-liao-shu` | 气疗术 | 6 | 原 oid296/mn33 |
  | `guan-yin-zhou` | 观音咒 | 10 | 原 oid297/mn35 |
  | `ning-shen-gui-yuan` | 凝神归元 | 18 | 原 oid298/mn34 |
  | `yuan-ling-gui-xin` | 元灵归心术 | 40 | 原 oid299/mn51 |
  | `wu-qi-chao-yuan` | 五气朝元 | 40 | 原 oid300/mn46 |

  (五个全 `usableOutsideBattle=true`。原版 `oid → 语义 id` 的映射是 migrate 的活;现 demo 直接写语义 id,不碰原版下标。)
- [ ] **Step 2:** `character.ts` 李逍遥 `initialMagic: ['qi-liao-shu','guan-yin-zhou','ning-shen-gui-yuan','yuan-ling-gui-xin','wu-qi-chao-yuan']`(语义 id;demo 5 个看网格,原版真实初始仅气疗术)。`magic: string[]` 字段已有。
- [ ] **Step 3:** test:`DEMO_SPELLS` 含气疗术(296)、costMP>0;`pnpm --filter @type-pal/content run check` 绿。
- [ ] **Step 4:** commit:`feat(content): 仙术数据 demo(气疗术等)+ 李逍遥初始仙术`

## Task 2: reforge 仙术选择状态机

**Files:** `packages/reforge/src/magic-menu-state.ts`(新)+ test

- [ ] **Step 1:** `MagicMenuState { active: boolean; spells: SpellData[]; cursor: number }`。`openMagicMenu(spells)`、`magicMoveCursor(s, dir: 'up'|'down'|'left'|'right')`(↑↓=±3、←→=±1,clamp[0, n-1])、`closeMagicMenu()`。纯函数 + 单测(网格导航边界)。参考 game `in-game-magic-menu.ts` 的 `moveSpellGrid`(±MAGIC_GRID_COLS / ±1)。
- [ ] **Step 2:** test:3 列网格,cursor 2 按 down → 5;cursor 0 按 up → 0(clamp)。check 绿。
- [ ] **Step 3:** commit:`feat(reforge): 仙术选择状态机(网格导航,纯函数)`

## Task 3: reforge 仙术菜单 UI(参考 draw-magic.ts 坐标)

**Files:** `packages/reforge/src/menu/magic-box.ts`(新);`menu-box.ts`(复用 drawSlicedBox/drawCashBox/drawNumber — 按需 export)

- [ ] **Step 1:** 加载红框 9 帧(`/ui/box-red/frame-0X.png`)+ playerbox + face-0 + cursor/grid。
- [ ] **Step 2:** `drawMagicMenu(ctx, state, world, now)`:① 红框网格(drawSlicedBox 喂红框 tiles,box@10,42,尺寸按 rows4×cols16 算)+ 仙术名 3 列(米白/选中黄闪,坐标 35,54 起)+ grid cursor;② MP box(drawCashBox 式单行框@0,0 + needed/current MP);③ PlayerInfoBox(playerbox + face + HP/MP,@45,165);④ 描述(当前仙术名@102,3)。坐标全用真值规格。
- [ ] **Step 3:** typecheck + biome 0/0。
- [ ] **Step 4:** commit:`feat(reforge): 仙术菜单 UI — 红框网格 + MP box + 角色框 + 描述`

## Task 4: menu-state 集成(main → 仙术)

**Files:** `menu-state.ts`(仙术项 enabled + 进仙术菜单);`main.ts`(仙术菜单输入 + 渲染)

- [ ] **Step 1:** `MAIN_ITEMS` 仙术项 `enabled: true`;confirm 仙术 → 开仙术菜单(world.party[0].magic → DEMO_SPELLS 过滤 usableOutsideBattle)。
- [ ] **Step 2:** main.ts tick:仙术菜单 active 时 ↑↓←→ 导航、Esc 返回主菜单;render 画 `drawMagicMenu`(ctx.scale 4)。
- [ ] **Step 3:** typecheck + biome。commit:`feat(reforge): 主菜单进仙术菜单 + 输入集成`

## Task 5: 浏览器验

- [ ] `pnpm --filter @type-pal/reforge run dev` → Esc → 选「仙术」→ 进仙术菜单。对齐截图核:红框网格 + 气疗术名 + grid cursor、左上 MP box(needed/current)、底部李逍遥角色框(头像+HP/MP)、顶部描述、×4 高清。位置不贴合就调坐标(浏览器看)。截图自查跑完删。

## Self-Review

1. **覆盖**:数据(T1)→状态机(T2)→UI(T3)→集成(T4)→验(T5)。✅
2. **真值**:4 块坐标全标 game draw-magic.ts 出处;数据链 object-magics→magic.json→words 标 extracted 路径。✅
3. **阶段隔离**:仙术数据 content、渲染/状态机 reforge。✅
4. **范围显式**:单人(跳 caster)、查看版(砍 target/施法/scriptDesc 解析)在范围 + T3/描述明示。✅
5. **数据驱动**:仙术网格遍历 spells 列表(加仙术 = 列表多一条)。✅
