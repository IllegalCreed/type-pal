# 状态面板完整还原 实现计划

> **For agentic workers:** 交 GLM 执行,Claude 逐 Task 审。第二阶段 Reforge,先读 [READ-FIRST](../READ-FIRST.md)。
> 把 D17 技术验证占位版状态面板 → 完整对齐原版(作者提供的原版截图)。

**Goal:** 状态面板对齐原版:角色立绘 + 9 属性(体力/真气显示当前/最大)+ 装备格围绕头像布局 + 用词对齐原版。

**Architecture:** content schema 加 `luck`;立绘走 migrate bake(复用/扩 portraits);reforge `renderStatus` 按原版布局重做。

## 真值规格(已查证 sdlpal `uigame.c` PAL_StatusPage / `ui.h`,勿改)

- **装备槽 6**(`MAX_PLAYER_EQUIPMENTS`);**状态背景** = FBP chunk 0(现用 `ui/status/bg.png` 占位木纹);**装备名色** `0xBE`。
- **属性 9 项**(顺序 = 原版 labels0 + labels):
  | 显示 | 字段 | 原版 word |
  |---|---|---|
  | 经验 | `exp` | STATUS_LABEL_EXP |
  | 修行 | `level` | STATUS_LABEL_LEVEL |
  | 体力 | `hp`/`maxHP` | STATUS_LABEL_HP(当前/最大) |
  | 真气 | `mp`/`maxMP` | STATUS_LABEL_MP(当前/最大) |
  | 武术 | `attack` | STATUS_LABEL_ATTACKPOWER |
  | 灵力 | `magicAttack` | STATUS_LABEL_MAGICPOWER |
  | 防御 | `defense` | STATUS_LABEL_RESISTANCE |
  | 身法 | `speed` | STATUS_LABEL_DEXTERITY |
  | 吉运 | `luck`(加) | STATUS_LABEL_FLEERATE |
- **立绘**:原版 `rgwAvatar[role]` from RGM.MKF(uigame.c:1132)。李逍遥核对 chunk —— 大概率 = 对话头像 chunk 1(已 bake `portraits/1.png`,78×91),GLM 核对后复用。
- **装备图标**:原版是 item sprite(BALL.MKF / `images/items/`)。⚠ **依赖 item 系统(itemId→sprite+name,未建)** → **本次装备格只画「框 + 槽名」,图标留 item 系统切片**(见 [范围])。
- **布局(作者设计三栏,非原版散布)**:**左**=属性 9 项竖排;**中**=名字(上)+ 立绘(下),栏内**水平居中**;**右**=6 装备格 **2 列 × 3 行平铺网格**(规整,非原版围绕立绘)。clean rewrite,坐标 GLM 浏览器调。

## 范围

- ✅ 立绘 + 9 属性(当前/最大)+ 装备格 6 围绕布局 + 槽名 + 放大 + 用词对齐。
- ❌ **装备图标**(依赖 item 系统,留后);换装交互;多角色翻页(demo 单人)。

## Global Constraints

- 阶段隔离:`luck` 在 `@type-pal/content`;立绘 bake 走 `@type-pal/migrate`;渲染在 reforge。
- 零 lint/type(不写 `!`,下标 `?? 兜底`);每 Task `tsc`+`biome` 0/0。canvas 靠浏览器验。

---

## Task 1: schema 加 luck + 李逍遥 + locale 用词对齐

**Files:** `packages/content/src/character.ts`(+test)、`packages/content/src/locale.ts`

- [ ] **Step 1:** `CharacterInstance` 与 `CharacterTemplate.baseStats` 各加 `luck: number`。`LI_XIAOYAO.baseStats` 加 `luck`(取原版初始值 —— 从 `data/extracted` 的 player-roles 数据查李逍遥 roleId 0 的 luck/吉运;查不到先填 `5` 并在 commit 注明待核)。`instantiate` 无需改(已 `...t.baseStats`)。
- [ ] **Step 2:** `character.test.ts` 加 `expect(instantiate(LI_XIAOYAO).luck).toBeGreaterThanOrEqual(0)`。
- [ ] **Step 3:** locale 用词对齐原版(`flat[48..55]` 真值):`stat.level`→`修行`、`stat.hp`→`体力`、`stat.attack`→`武术`、`stat.speed`→`身法`;新增 `stat.exp`→`经验`、`stat.luck`→`吉运`。(`stat.mp`=真气、`stat.magicAttack`=灵力、`stat.defense`=防御 已对。)
- [ ] **Step 4:** `pnpm --filter @type-pal/content run check` 全绿。
- [ ] **Step 5:** commit:`feat(content): 角色 schema 加 luck + 状态属性用词对齐原版`

## Task 2: 李逍遥立绘 bake + 加载

**Files:** `packages/migrate/scripts/bake-assets.mts`、`packages/reforge/src/menu/menu-box.ts`

- [ ] **Step 1:** 核对李逍遥状态立绘 chunk:打开 `data/extracted/images/portraits/`,找半身立绘(对照原版截图李逍遥头肩像),确认 chunk(预期 1)。
- [ ] **Step 2:** bake-assets.mts 加:把该 chunk 烤到 `ui/status/avatar-li-xiaoyao.png`(若 = chunk1 可直接复用 `portraits/1.png`,则跳过 bake、加载时直接用 `/portraits/1.png`,在 plan 注明)。跑 `pnpm --filter @type-pal/migrate run bake` 确认产出。
- [ ] **Step 3:** `MenuAssets` 加 `avatar: ImageBitmap | undefined`;`loadMenuAssets` 加载立绘。
- [ ] **Step 4:** typecheck 绿。commit:`feat(reforge/migrate): 李逍遥状态立绘 bake + 加载`

## Task 3: renderStatus 重做(布局对齐原版)

**Files:** `packages/reforge/src/menu/menu-box.ts`

- [ ] **Step 1:** 重写布局常量(作者三栏):**左**属性列(label x + value x,9 行 `STAT_LINE_H=18`);**中**名字 + 立绘(栏内**水平居中**:x = 中栏中心 − 内容宽/2);**右**装备格 **2 列 × 3 行平铺**(`COLS=2`,格 `{x,y}` 按行列算:`baseX + col*(格宽+间距)`、`baseY + row*(格高+间距)`)+ 槽名;装备格放大(~48)。
- [ ] **Step 2:** `renderStatus` 重写:① 背景 `status/bg.png` 铺满;② 立绘 `drawImage(avatar, ...)`;③ 属性 9 项遍历(数据驱动 `statList` 扩到 9 项;体力/真气画 `当前/最大`,如 `150/150`);④ 6 装备格遍历画 `slot.png`(放大尺寸)+ 槽名(`STATUS_COLOR_EQUIPMENT` 色系)。装备图标本次不画(item 系统留后)。
- [ ] **Step 3:** `statList` 扩到 9 项(加 exp/luck;hp/mp 改成返回 `当前/最大` 字符串)。注意数据驱动:保持「遍历列表」不写死每项。
- [ ] **Step 4:** typecheck + biome 0/0。
- [ ] **Step 5:** commit:`feat(reforge): 状态面板布局对齐原版(立绘+9属性+装备格围绕)`

## Task 4: 浏览器验 + 对比原版

- [ ] **Step 1:** `pnpm --filter @type-pal/reforge run dev` → Esc → 选「状态」→ Enter。
- [ ] **Step 2:** 核三栏:**左**属性 9 项(经验/修行/体力当前-最大/真气/武术/灵力/防御/身法/吉运)、**中**名字+立绘水平居中、**右**装备格 **2×3 平铺**且放大、用词对齐、×4 高清、无行距重叠。位置不贴合就调 Task3 布局常量(浏览器看)。截图自查,跑完删。
- [ ] **Step 3:** 缺口确认:装备格内**无图标**(预期,item 系统留后)—— 在最终 commit/汇报里说明。

## Self-Review

1. **覆盖**:schema(T1)→立绘(T2)→布局(T3)→验收(T4)。✅
2. **真值**:9 属性字段映射 + word、装备槽6、立绘 RGM、背景 FBP0、装备名色 0xBE 均标 sdlpal 出处。✅
3. **阶段隔离**:luck 在 content、立绘 bake 走 migrate、渲染 reforge。✅
4. **已知缺口显式**:装备图标依赖 item 系统(未建),T0 范围 + T4 Step3 明示留后,不静默。✅
5. **数据驱动**:属性 9 项仍遍历 `statList`、装备 6 格遍历(加项不返工)。✅
