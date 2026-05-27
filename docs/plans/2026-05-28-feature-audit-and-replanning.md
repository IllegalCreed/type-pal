# 2026-05-28 · 全功能逐条核对 + 开发计划重置

> **背景**:M5.5 / M5.6 我自报"47% → 52% 完成度"被 user 反复揭穿夸大。session 3 末 user 原话:
> "咱们不能再这样下去了,已经工程上的灾难了 ...
> 现在开始不要再做新功能了 ...
> 列一个全游戏所有功能列表,然后明确标注哪些你认为你完成了的。
> 我会逐条让你逐行查看 sdl 源代码,仔细核对功能,直到把已经完成的功能核对完了,再继续做新功能。"

**Goal**: 把项目从"自报完成度 + 用户实测被打脸"切到"逐功能 sdlpal 源代码 1:1 核对 → user 拍板 → 标记落地"的工程纪律。**M6 暂停**,先完成 audit + replan。

**Architecture**: 三阶段 — Phase A 核对自认 ✓(18 项)→ Phase B 核对自认 ⚠️(31 项)→ Phase C 基于 audit 结论重排 M6+ 优先级。**每条 task 由 user 拍板,不由 Claude 自判**。

**单一权威来源**: 新建 `docs/feature-status.md` 作为 README "完成度 N%" 表述的替代 — 所有功能 4 状态(✓/⚠️/✗/N/A)落到此文件,README 只引用、不再写百分比。

---

## 工作原则(全程硬约束)

1. **不动业务代码**:Phase A/B 期间不补做、不重构、不"顺便修一下"。只 read sdlpal C 源 + read ts 源 + 列 diff + 等 user 拍板。补做留 Phase C。
2. **read 不 grep**:遵守 CLAUDE.md TOP 0 — 每条 audit 起手 **完整 read sdlpal 整 callpath C fn 全文**,不"猜关键字 grep + 命中就停"。read 顺序写到 audit log。
3. **按 user 节奏**:user 说"先核 D3" 我就核 D3,不擅自一次推 5 条。每条核完等 user 反馈 → 落标记 → 下一条。
4. **诚实降级**:如果 sdlpal 真值跟 ts 实现有任何 1 行不一致,**立即承认**,不辩护"已抓重点 / 简版等价"。降级到 ⚠️ 或 ✗。
5. **commit 节奏**:每核完一条 + user 拍板,commit `audit(F#X): ✓→⚠️ 真值 sdlpal X.c:N-M 差异 Y`,不堆。
6. **频道**:audit log 全程写到 `docs/feature-status.md`,不再开新 doc;commit message 直接引 sdlpal 行号。

---

## 文件结构

```
docs/
  feature-status.md            # NEW · 权威功能表(45 行表 + audit notes)
  plans/
    2026-05-28-feature-audit-and-replanning.md   # 本 plan
README.md                       # 改:删"完成度 ~52%"自吹,改"详 docs/feature-status.md"
```

不新增其他 doc。所有 audit 发现写到 `feature-status.md` 行内 notes 字段。

---

## Phase 0:建立权威状态表(Day 0,~30 min)

### Task 0.1:新建 `docs/feature-status.md`

**Files:**
- Create: `docs/feature-status.md`

- [ ] **Step 1: 起草表头 + 4 状态定义**

```markdown
# Feature Status · type-pal

> 权威功能表。任何"完成度"表述以本文件为准,README 不再写百分比。
> 状态由 user 逐条 sdlpal 源核对后拍板,Claude 不自判。

## 状态定义

- **✓ verified**:Claude port 自认 1:1,**且** user 已逐行核对 sdlpal 源 + 拍板通过。
- **✓ claimed**:Claude port 自认 1:1,**但** user 尚未核对。带行号引用 sdlpal 待 user 拍。
- **⚠️ partial**:Claude 自知 / user 实测发现简版 / 缺真值 / 未完整 port。带具体差异说明。
- **✗ todo**:未做。
- **N/A**:by design 不 port(浏览器 canvas / Web Audio 替代 SDL/audio,DOS 兼容代码等)。

## audit 进度

- 核对中:(空)
- 已 verified ✓:0 / 18 自认 ✓
- 已 verified ⚠️:0 / 31 自认 ⚠️

## A. 启动 / 引导

| # | 功能 | 状态 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|
| A1 | Trademark Logo | ✗ | main.c:179 PAL_TrademarkScreen | — | 未做 |
| A2 | Splash 屏 | ✗ | main.c:206 PAL_SplashScreen | — | 未做 |
| A3 | 开场 AVI | ✗ | aviplay.c 全组 | — | ffmpeg→mp4 follow-up |
| A4 | OpeningMenu | ⚠️ claimed | uigame.c:83 PAL_OpeningMenu | core/menu/opening-menu.ts | 数据 state machine,box 坐标 + 9-slice 未严格对齐 |

... (其余 B-K 按 2026-05-28 chat 表填充,40+ 行)
```

- [ ] **Step 2: 把 2026-05-28 chat 给 user 的 4 状态 45 项 + L 段全表抄入,行内带 sdlpal C 源行号引用**

具体内容引用本 plan 上面给 user 的清单原文(A1-K5 + L1-L? 共约 90 行)。每条标 `⚠️ claimed` / `✓ claimed`(凡 Claude 自报 ✓ 暂记 claimed,等 user 拍板转 verified)/ `✗ todo` / `N/A`。

**新增 L 段 — 特殊物品 / 剧情系统**(2026-05-28 user 补提,初始清单漏列):

| # | 功能 | 状态 | sdlpal 真值出处 | ts 路径 | 备注 |
|---|---|---|---|---|---|
| L1 | 炼丹系统(紫金葫芦 + 灵葫咒) | ✗ todo | 待 Phase B grep sdlpal 入口 — 可能在 itemmenu.c 子菜单 / script.c 特殊 opcode / events.json script chain | — | 物品交互特殊菜单 |
| L2 | 蛊虫 / 练蛊皿系统 | ✗ todo | 待 Phase B grep sdlpal 入口 | — | 物品交互特殊菜单 |
| L? | (待 user 补:其他特殊物品 / 剧情系统) | ✗ todo | — | — | user 想到再补 |

> **入口待考**:仙剑特殊系统在 sdlpal 多半通过 **item.wScriptOnUse** 触发 events.json 内的剧情 script chain 实现,**不是**独立 sdlpal C fn。所以 audit 时核对范围是 a) script.c 的 opcode 是否够支撑这条 chain,b) 对应 events.json 的 script 是否能正确解释 + 跑通,c) 触发 UI(选材料 / 选品质等)是否有对应 menu 子状态。具体入口 Phase B.G4 opcode 组 audit 时一并定位。

- [ ] **Step 3: README 改**

`README.md` "M5.6 完成 ... 完成度约 47% → ~52%" 段改成:

```markdown
## 状态(2026-05-28)

M5/M5.5/M5.6 完工后,user 实测发现自报完成度被夸大。已停"做新功能",
转入 **Phase A/B feature audit** — 逐功能 sdlpal 源 1:1 核对 + user 拍板。
详 [`docs/feature-status.md`](docs/feature-status.md) 和
[`docs/plans/2026-05-28-feature-audit-and-replanning.md`](docs/plans/2026-05-28-feature-audit-and-replanning.md)。
```

删除"完成度约 52%"等所有百分比 + "基础玩法可闭合"等定性夸大。

- [ ] **Step 4: commit**

```bash
git add docs/feature-status.md docs/plans/2026-05-28-feature-audit-and-replanning.md README.md
git commit -m "plan(2026-05-28): feature audit + replan — 停做新功能,逐条核对 ✓/⚠️"
```

---

## Phase A:核对自认 ✓(18 项,每条 1 task)

**节奏**: user 选一条 → Claude 走 audit 模板 → user 拍板 → 落标记 → commit → 下一条。**不并行多条**。

**Audit 模板**(每条 task 固定 6 step):

```
1. 列入口:
   - sdlpal C fn 名 + 行号 + 文件
   - ts fn 名 + 行号 + 文件
   - 递归 dep:列调用的 sdlpal helper / ts helper

2. 完整 read sdlpal C fn 全文(不 grep + 30 行,完整 `{` 到 `}`)
   + 递归 read 所有 dep fn 全文

3. 完整 read ts 实现 + 单测全文

4. 列差异表:
   | sdlpal 行 | sdlpal 真值 | ts 行 | ts 实现 | diff |
   一行一字段。任何 1 行不一致都列。

5. 等 user 拍板:
   - ✓ verified:user 看完差异表认可对齐,无遗漏
   - ⚠️ 降级:user 指出某字段简版,登记到 feature-status notes
   - ✗ 降级:整条不算,登记 + 移到 Phase C M6 待做

6. commit:
   `audit(F#X): claimed ✓ → verified ✓ — sdlpal X.c:N-M 全字段对齐`
   或
   `audit(F#X): claimed ✓ → ⚠️ — sdlpal X.c:Y 真值 Z,ts 简版未做 W`
```

### Task A.1:D3 calcBaseDamage(物理伤害公式)

**Files:**
- Read: `reference/sdlpal/fight.c:131-171` (PAL_CalcBaseDamage)
- Read: `packages/game/src/core/battle/formulas.ts` (calcBaseDamage)
- Update: `docs/feature-status.md` D3 行

- [ ] **Step 1: read sdlpal fight.c PAL_CalcBaseDamage 全文(line 131-171,~40 行)**
- [ ] **Step 2: read formulas.ts calcBaseDamage 全文**
- [ ] **Step 3: 列差异表(每 case branch + 每运算符 + signed/unsigned 边界)**
- [ ] **Step 4: 在 chat 把差异表给 user,等拍板**
- [ ] **Step 5: 按 user 决定改 feature-status.md D3 行状态 + notes**
- [ ] **Step 6: commit**

### Task A.2:D4 calcMagicDamage(法术伤害公式 5 元素)

**Files:**
- Read: `reference/sdlpal/fight.c:174-252` (PAL_CalcMagicDamage)
- Read: `packages/game/src/core/battle/formulas.ts` (calcMagicDamage)
- Update: `docs/feature-status.md` D4 行

- [ ] **Step 1-6 同 A.1 模板**(read sdlpal 5 元素 + 抗 + fieldEffect + poison 分支,列字段差异)

### Task A.3:D5 getPlayerActualDexterity

**Files:**
- Read: `reference/sdlpal/fight.c:336-394` (PAL_GetPlayerActualDexterity)
- Read: `packages/game/src/core/battle/formulas.ts` (getPlayerActualDexterity)
- Update: `docs/feature-status.md` D5 行

- [ ] **Step 1-6 同 A.1 模板**

### Task A.4:D6 getEnemyDexterity

**Files:**
- Read: `reference/sdlpal/fight.c:289-335` (PAL_GetEnemyDexterity)
- Read: `packages/game/src/core/battle/formulas.ts` (getEnemyDexterity)
- Update: `docs/feature-status.md` D6 行

- [ ] **Step 1-6 同 A.1 模板**(SHORT signed cast 重点核)

### Task A.5:B8 PAL_CalcCoverTiles(tilemap 遮挡)

**Files:**
- Read: `reference/sdlpal/scene.c:77-180` (PAL_CalcCoverTiles)
- Read: `packages/game/src/present/draw-tilemap.ts` (addCoverTileEntries)
- Update: `docs/feature-status.md` B8 行

- [ ] **Step 1-6 同 A.1 模板**(5×5 scan + iTileHeight bit 8-11/24-27 重点核)

### Task A.6:B9 PAL_CheckObstacleWithRange(tilemap 阻挡)

**Files:**
- Read: `reference/sdlpal/scene.c:522-635` (PAL_CheckObstacleWithRange)
- Read: `packages/game/src/core/scene-system.ts` (isWalkable / tilemapIsBlocked)
- Update: `docs/feature-status.md` B9 行

- [ ] **Step 1-6 同 A.1 模板**(bit 13 blocked + sState>=2 NPC range 重点核)

### Task A.7:C10 PAL_CreateBoxWithShadow(9-slice 边框)

**Files:**
- Read: `reference/sdlpal/ui.c:131-240` (PAL_CreateBoxWithShadow)
- Read: `packages/game/src/present/menu/draw-box.ts`
- Update: `docs/feature-status.md` C10 行

- [ ] **Step 1-6 同 A.1 模板**(9-slice 8 角 + shadow 偏移 + frame 0/2 切换 重点核)

### Task A.8:C12 triple shadow(文字阴影)

**Files:**
- Read: `reference/sdlpal/text.c:1144-1155` (TEXT_DisplayText shadow 段)
- Read: `packages/game/src/present/font.ts` 或 `render-text.ts` shadow 实现
- Update: `docs/feature-status.md` C12 行

- [ ] **Step 1-6 同 A.1 模板**(DOS triple vs WIN95 single + sdlpal "fix" 统一 triple 重点核)

### Task A.9:C13 Dialog 状态机(PAL_StartDialog 全套)

**Files:**
- Read: `reference/sdlpal/text.c:1219-1817` (StartDialogWithOffset + ShowDialogText + DialogWaitForKey* + ClearDialog + EndDialog)
- Read: `packages/game/src/present/dialog-box.ts` + `core/event-system.ts` showDialog/setDialogStyleX handler
- Update: `docs/feature-status.md` C13 行

- [ ] **Step 1-6 同 A.1 模板**(typing 时序 + 1.4s timer + portrait + key icon + 4 style 全核;sdlpal 真值已知含 narration / dialog / window / battle 4 path)

### Task A.10:C14 PAL_DrawNumber(数字 sprite)

**Files:**
- Read: `reference/sdlpal/ui.c:640-748` (PAL_DrawNumber)
- Read: `packages/game/src/present/draw-number.ts`
- Update: `docs/feature-status.md` C14 行

- [ ] **Step 1-6 同 A.1 模板**(digit sprite 索引 + 5 color align + shadow 重点核)

### Task A.11:E6 / G8 VIDEO_FadeScreen(SceneFade 72 帧 dither)

**Files:**
- Read: `reference/sdlpal/video.c:1130-1292` (VIDEO_FadeScreen)
- Read: `packages/game/src/core/event-system.ts` fadeScreen handler (opcode 0x73)
- Update: `docs/feature-status.md` E6 + G8 行

- [ ] **Step 1-6 同 A.1 模板**(72 帧 dither pattern + speed param + 黑屏 in/out 重点核)

### Task A.12:G1/G2 RLE & FBP blit(palcommon.c 5 fn)

**Files:**
- Read: `reference/sdlpal/palcommon.c:36-737` (RLEBlitToSurface / RLEBlitToSurfaceWithShadow / RLEBlitWithColorShift / RLEBlitMonoColor / FBPBlitToSurface + RLEGetWidth/Height)
- Read: `packages/pal-extract/src/io/rle.ts` + `packages/game/src/present/draw-sprite.ts`
- Update: `docs/feature-status.md` G1/G2 行

- [ ] **Step 1-6 同 A.1 模板**(RLE control byte + transparent + color shift + shadow 重点核;extract-time vs runtime 划分)

### Task A.13:J1 PAL_KeyboardEventFilter

**Files:**
- Read: `reference/sdlpal/input.c:350-435` (PAL_KeyboardEventFilter)
- Read: `packages/game/src/shell/keyboard.ts` + `shell/input.ts`
- Update: `docs/feature-status.md` J1 行

- [ ] **Step 1-6 同 A.1 模板**(Escape/Alt/Insert → Menu 真值 + 8 方向 + 6 键全核)

### Task A.14:K1-K3/K5 pal-extract(M1/M4)

**Files:**
- Read: `reference/sdlpal/palcommon.c:855-1170` (MKFGetChunkCount/Size + MKFReadChunk + MKFGetDecompressedSize + MKFDecompressChunk)
- Read: `packages/pal-extract/src/io/mkf.ts` + `io/yj1.ts` + `io/yj2.ts`
- Update: `docs/feature-status.md` K1/K2/K3/K5 行

- [ ] **Step 1-6 同 A.1 模板**(14 MKF chunk 全 dump + YJ2 解压 + DATA chunk 6/11/14 typed + events round-trip 重点核)

### Task A.15:D1 PAL_StartBattle(战斗启动)

**Files:**
- Read: `reference/sdlpal/battle.c:1531-1809` (PAL_StartBattle) + 调用入口 `PAL_LoadBattleSprites` / `PAL_LoadBattleBackground` / `buildBattleState` 链
- Read: `packages/game/src/core/battle/battle-system.ts` (startBattle / buildBattleState)
- Update: `docs/feature-status.md` D1 行

- [ ] **Step 1-6 同 A.1 模板**(g_Battle 初始化全字段 + mode='battle' 切换 + enemyTeam load + RNG seed 入口 重点核)

### Task A.16:E3 PAL_PartyWalkTo(opcode 0x70)

**Files:**
- Read: `reference/sdlpal/script.c:101-202` (PAL_PartyWalkTo)
- Read: `packages/game/src/core/event-system.ts` partyWalkTo handler
- Update: `docs/feature-status.md` E3 行

- [ ] **Step 1-6 同 A.1 模板**(party trail unshift + UpdatePartyGestures + camera viewport partyoffset(160,112) 重点核)

### Task A.17:E4+E5 NPC walk opcodes(0x10/0x11/0x82/0x6C)

**Files:**
- Read: `reference/sdlpal/script.c:31-100` (PAL_NPCWalkTo) + `scene.c:851-980` (PAL_NPCWalkOneStep)
- Read: `packages/game/src/core/event-system.ts` opcode handlers(0x10/0x11/0x82/0x6C)
- Update: `docs/feature-status.md` E4 + E5 行

- [ ] **Step 1-6 同 A.1 模板**(dir*N+iFrame + 2/3 重映射 + sprite frame priority 重点核)

### Task A.18:E8 OP_SET_PALETTE(palette 切换)

**Files:**
- Read: `reference/sdlpal/palette.c:25-122` (PAL_GetPalette + PAL_SetPalette)
- Read: `packages/game/src/core/event-system.ts` OP_SET_PALETTE handler + `assets/loader.ts` fetchPalette
- Update: `docs/feature-status.md` E8 行

- [ ] **Step 1-6 同 A.1 模板**(palette.json dump + 异步注入时序 + 跨 scene 保留 / 重置 重点核)

---

## Phase B:核对自认 ⚠️(31 项,分 7 组)

**节奏**: 每组先 1 个 task 写 audit summary(整组共性差异),再按 user 选条逐项 audit。**不强求所有 ⚠️ 都核对** — 如果 user 直接说"这组留 M6,跳过细核"就跳。

### Task B.G1:大世界探索组(B1-B5/B7,~6 项)

**Files:**
- Read: `reference/sdlpal/play.c:25-510` (PAL_GameUpdate + GameUseItem + Search + GetSearchTriggerRange) + `scene.c:636-851` (UpdatePartyGestures + UpdateParty + NPCWalkOneStep)
- Read: `packages/game/src/core/scene-system.ts` + `event-system.ts` partyWalkTo / tickAutoScripts / findContactNpc 全套

- [ ] **Step 1: 完整 read 上述 sdlpal 整 callpath**
- [ ] **Step 2: 写组级差异 summary 到 feature-status.md 顶部 audit notes(不细核到每字段)**
- [ ] **Step 3: 等 user 选哪条单独细核 / 哪条留 M6**
- [ ] **Step 4: 按 user 选的条目逐个走 A.1 模板**
- [ ] **Step 5: commit**

### Task B.G2:UI 菜单组(C1-C9,~9 项)

**Files:**
- Read: `reference/sdlpal/uigame.c:42-2058` 全文(23 函数:OpeningMenu / SystemMenu / InGameMenu / InventoryMenu / EquipItemMenu / PlayerStatus / InGameMagicMenu / ItemUseMenu / SaveSlotMenu / BuyMenu / SellMenu / ShowCash 等)
- Read: `packages/game/src/core/menu/*` + `present/menu/*`

- [ ] **Step 1-5 同 B.G1 模板**

### Task B.G3:战斗组(D2/D7/D8/D9/D11/D12/D18/D19,~8 项)

**Files:**
- Read: `reference/sdlpal/fight.c` (PerformAction + ValidateAction + PlayerCheckReady + BattleStartFrame + tick) + `battle.c` (BattleWon + PlayerEscape + MakeScene)
- Read: `packages/game/src/core/battle/*` + `present/battle/*`

- [ ] **Step 1-5 同 B.G1 模板**

### Task B.G4:脚本 opcode 组(E2/E11/E13/E15,~4 项)

**Files:**
- Read: `reference/sdlpal/script.c:587-3500` (PAL_InterpretInstruction 100+ case)
- Read: `packages/game/src/core/event-system.ts` opcode handlers + `core/scene-system.ts` autoScript runner

- [ ] **Step 1-3 同 B.G1 模板** + **额外**:列**完整 sdlpal 51 unique opcode** + ts 端**已具名 35 个**对照表(user 之前已怼"不是补常见 opcode,全都列出来"),逐 opcode 标 ✓/⚠️/✗
- [ ] **Step 4: 等 user 选条细核**
- [ ] **Step 5: commit**

### Task B.G5:存档组(F1-F3,~3 项)

**Files:**
- Read: `reference/sdlpal/global.c:378-887` (LoadDefaultGame / LoadGame_WIN / SaveGame_WIN + LoadGame_Common / SaveGame_Common)
- Read: `packages/game/src/core/save/api.ts` + `indexed-db.ts`

- [ ] **Step 1-5 同 B.G1 模板**(D37 字节兼容已 N/A,本组主要核语义对齐 + UI 接通)

### Task B.G6:视觉 / 字体组(C11/G3,~2 项)

**Files:**
- Read: `reference/sdlpal/font.c` + `palcommon.c:28-34 PAL_CalcShadowColor`
- Read: `packages/game/src/present/font.ts` 字模相关

- [ ] **Step 1-5 同 B.G1 模板**(Unifont vs PALFONT 真值 stroke 差,正式接受偏差还是补 PALFONT)

### Task B.G7:特殊物品 / 剧情系统组(L1-L?,user 补提)

**Files:**
- Grep: `reference/sdlpal/` 找紫金葫芦 / 灵葫咒 / 练蛊皿等特殊 item 的 wScriptOnUse 入口(可能通过 events.json scriptOffset 反查 → script.c opcode chain)
- Read: 命中的 opcode + 对应 events.json script chunk
- Read: `packages/game/src/core/menu/*` 看是否有对应子菜单 state
- Update: `docs/feature-status.md` L 段

- [ ] **Step 1: 在 chat 跟 user 确认完整清单**(L1/L2 之外还有哪些特殊系统 — 御剑 / 五灵法术升级 / 装备打造 / 双修 / 等)
- [ ] **Step 2: 对每条:grep sdlpal 找入口 + 列对应 events.json script + 列 ts 端是否能跑**
- [ ] **Step 3: 状态分类:**
  - 入口 script 能跑(opcode 全具名)→ ⚠️ claimed,UI 子菜单待补
  - 入口 script 有未具名 opcode → ✗ todo,opcode 缺一就跑不通
  - 完全没碰过 → ✗ todo
- [ ] **Step 4: 等 user 拍板,登记到 feature-status.md L 段**
- [ ] **Step 5: commit**

### Task B.G8:数据 / 资源组(K4,~1 项 但极关键)

**Files:**
- Read: `reference/sdlpal` 引用 WORD.DAT 所有 PAL_GetWord call(grep sdlpal source)
- Read: `packages/pal-extract/src/resources/word.ts` + `cli.ts` parseWordDat 调用

- [ ] **Step 1: 列 sdlpal WORD.DAT 全 category 真值**(sys / npc / monster / item / spell / 等 7+ 类)
- [ ] **Step 2: 对照 parseWordDat 实际 dump 哪几类**
- [ ] **Step 3: 列漏 dump 条数 + chunk_count vs output_entries 数字**
- [ ] **Step 4: 等 user 拍板补 dump 还是接受**
- [ ] **Step 5: 如 user 让补,**这个**单独允许在 Phase B 内动 pal-extract 代码**(因 audit 自身是数据完整性问题,不是 game logic);其他 Phase B 一律不动代码
- [ ] **Step 6: commit**

---

## Phase C:基于 audit 结论重排 M6+(audit 完成后,~1 day)

**前提**: Phase A/B 走完(或 user 中途说"够了,开始做"),`feature-status.md` 状态稳定。

### Task C.1:汇总 audit 真实完成度

**Files:**
- Update: `docs/feature-status.md` 顶部 "audit 进度" 段填实数 — 例如 `verified ✓ N / claimed ✓ 14`、`verified ⚠️ M / claimed ⚠️ 31`、`✗ K`
- Update: `README.md` 不写百分比,只列**已 verified ✓ 的核心功能 bullet list**(实事求是)

- [ ] **Step 1: 数 audit 完毕的状态分布**
- [ ] **Step 2: 改 README 表述**
- [ ] **Step 3: commit**

### Task C.2:重排 M6 scope

**Files:**
- Update: `docs/03-development-plan.md` M6 段
- Create: `docs/plans/2026-05-28-m6-scope-design.md`(brainstorm + 决策依据)

- [ ] **Step 1: 列 audit 揭出的"必修才能继续"清单**(eg 战斗数值偏差源 D14 装备 effect / D11 升级 loop / D15 poison;基础玩法 ⚠️ → ✓ 收口)
- [ ] **Step 2: 列"体验补全"清单**(音频 / palette cycle / magic anim / AVI / ending)
- [ ] **Step 3: brainstorm 决定 M6 切几个 phase,每 phase 进入条件 / 完成条件**(user 拍板)
- [ ] **Step 4: 写 design doc + 改 03-development-plan M6 段**
- [ ] **Step 5: commit**

### Task C.3:写 M6 实施 plan

**Files:**
- Create: `docs/plans/2026-05-28-m6-<phase-name>.md`(按 C.2 决策,可能多个)

- [ ] **Step 1: 按 superpowers:writing-plans 模板写 M6 Phase 1 实施 plan**(具体 task 拆 + step 拆 + 文件路径 + 单测)
- [ ] **Step 2: 让 user 过 plan,拍板**
- [ ] **Step 3: 进入 M6 实施(本 plan 结束,M6 plan 接管)**

---

## 进度跟踪

- [ ] Phase 0:Task 0.1 — 建 feature-status.md + 改 README
- [ ] Phase A:Task A.1 — D3 calcBaseDamage
- [ ] Phase A:Task A.2 — D4 calcMagicDamage
- [ ] Phase A:Task A.3 — D5 getPlayerActualDexterity
- [ ] Phase A:Task A.4 — D6 getEnemyDexterity
- [ ] Phase A:Task A.5 — B8 PAL_CalcCoverTiles
- [ ] Phase A:Task A.6 — B9 PAL_CheckObstacleWithRange
- [ ] Phase A:Task A.7 — C10 PAL_CreateBoxWithShadow
- [ ] Phase A:Task A.8 — C12 triple shadow
- [ ] Phase A:Task A.9 — C13 Dialog 状态机
- [ ] Phase A:Task A.10 — C14 PAL_DrawNumber
- [ ] Phase A:Task A.11 — E6/G8 VIDEO_FadeScreen
- [ ] Phase A:Task A.12 — G1/G2 RLE & FBP blit
- [ ] Phase A:Task A.13 — J1 PAL_KeyboardEventFilter
- [ ] Phase A:Task A.14 — K1-K3/K5 pal-extract
- [ ] Phase A:Task A.15 — D1 PAL_StartBattle
- [ ] Phase A:Task A.16 — E3 PAL_PartyWalkTo (opcode 0x70)
- [ ] Phase A:Task A.17 — E4+E5 NPC walk opcodes (0x10/0x11/0x82/0x6C)
- [ ] Phase A:Task A.18 — E8 OP_SET_PALETTE
- [ ] Phase B:Task B.G1 — 大世界探索组 summary
- [ ] Phase B:Task B.G2 — UI 菜单组 summary
- [ ] Phase B:Task B.G3 — 战斗组 summary
- [ ] Phase B:Task B.G4 — opcode 组(含全 51 opcode 对照表)
- [ ] Phase B:Task B.G5 — 存档组 summary
- [ ] Phase B:Task B.G6 — 视觉 / 字体组 summary
- [ ] Phase B:Task B.G7 — 特殊物品 / 剧情系统组(炼丹 / 蛊虫 / 等)
- [ ] Phase B:Task B.G8 — WORD.DAT 数据完整性(允许动 pal-extract)
- [ ] Phase C:Task C.1 — 汇总 audit 完成度 + 改 README
- [ ] Phase C:Task C.2 — 重排 M6 scope(brainstorm + design doc)
- [ ] Phase C:Task C.3 — 写 M6 Phase 1 实施 plan

---

## 风险 / 反 pattern 防御

| 风险 | 防御 |
|---|---|
| Claude 又"抓重点"压缩 audit 范围 | 每条 Phase A task **必走完整 6 step**;sdlpal C fn read 必引行号到 step 描述,不许 grep + 30 行 |
| user 选条后 Claude 一次推 5 条 audit 显勤奋 | **节奏硬约束**:一次只 1 条 task,完了 commit,等 user 说"下一条" |
| audit 中发现 bug 顺手修了 | **不许**。发现 bug 登记到 feature-status 状态降级 + 加 follow-up 行,**不动代码** |
| user 失去耐心想直接做 M6 | 接受 — Phase B 不强求全核,user 说"够了"就跳 Phase C.2 |
| 自报"已 verified"绕过 user 拍板 | **`verified ✓` 状态只能在 commit message 引"user 拍板"那一刻打**;`claimed ✓` 不能直升 `verified ✓` |

---

## 完成定义

本 plan 完成 = 满足下列全部:

1. `docs/feature-status.md` 存在,45+ 行功能表稳定
2. 至少 Phase A 18 条全走完 audit 模板(user 中途叫停 OK,但已起手的必走完)
3. README 不再有自报百分比 / "基础玩法可闭合"等定性夸大
4. M6 Phase 1 实施 plan 存在 + user 拍板
5. 全程**无业务代码改动**(除 Phase B.G7 WORD.DAT 数据补 dump,如 user 授权)

---

## 后续(plan 之外)

- M6 Phase 1 实施按 C.3 plan 走,本 plan 范围到此结束
- 若 audit 发现 sdlpal 自身 bug(已知 Bug-1 SelectAutoTarget 死循环 / Bug-2 StealFromEnemy 无 dead check),feature-status 单开 "sdlpal bugs to fix in port" 段
