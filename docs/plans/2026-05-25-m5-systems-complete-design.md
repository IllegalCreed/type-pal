# M5 · 系统补全 Design Doc

> Brainstorm + design 阶段产物。本文不含 step-by-step task 列表 — 那走后续 `2026-05-25-m5-systems-complete.md` plan(下一步 writing-plans 产)。

**目标(用户校正后定位)**:M5 做完 = **所有系统机制就绪 + dev panel 每个系统单独可触发并跑通**。不串剧情、不走真流程闭环 — 单元式验证;真剧情链路 / 通关验证推 M7。

**Brainstorm 流(对齐过程)**:
1. P0 起手:M2 era 简化补齐 — 共 5 项(初期框架以为 2 项,经 user 校正扩到 5 项,再校正到 6 项含 wScriptOnEnter)
2. Phase 2 起 并行三股 → 加 Interact 股变 4 股
3. checkpoint 策略:Phase 1 + 每股收敛点 + P2 收敛(共 7)
4. M5 / M7 划界:剧情专属推 M7;系统层 opcode 顺手补
5. 存档格式:GameState JSON(D29 对此项 sdlpal 字节级兼容不收益,与实现走)
6. 对话框:M2 简版差距 → 真做归 P1.0 sync wave
7. 升级 RNG / 商店买卖 / 换装备 / 吃药 / 学法术 / 用道具 等菜单内部用例 → 显式归 Menu 股测试覆盖
8. 开箱 / 机关 / 完整 contact → 独立成 P1 第 4 股 Interact
9. wScriptOnEnter 真跑(土灵珠路径)→ P0.e 升级,不再 hardcode 兜底

**对应 03 plan**:M5 段(03-development-plan.md:99-103)是这份的总指引;本设计是该段的细化。

---

## 0. 全局原则

- **Solo / 直接 commit main**(memory:[commit-to-main-solo-project])
- README / 公开文件 / commit message / 源码注释 **不写原游戏名**(memory:[no-game-name-in-readme])
- commit message **不带** Claude / Co-Author trailer(memory)
- **不要 amend 既有 commit**(memory)
- L2 baseline PNG **不入 git**(版权,`packages/game/e2e/baselines/` 已 gitignore)
- 不破坏既有测试基准:`pnpm -w check` 501+2 skip 至少不退;`pnpm -F @type-pal/game e2e` 31 pass / 0 skip 至少不退
- D26 raw skip 兜底:新具名 opcode 严格 disasm/recompile 对偶;未具名 opcode 仍 raw skip
- D29 sdlpal 是规格:新机制 / 公式 / 渲染必须有 sdlpal 真值对照
- 子进程统一 `execFileSync` / `execFile`(D31)
- 大白话优先,不要 schema 内部术语污染 design(memory:[avoid-implementation-jargon-in-design])

---

## 1. Macro Phase 结构

```
┌─── P0 探索物理(sequential)──────────────────────┐
│  P0.0 schema pixel · P0.a 碰撞菱形 · P0.b 遮挡    │
│  P0.c 走动 4 帧 · P0.d trail · P0.e wScriptOnEnter│
└────────────┬─────────────────────────────────────┘
             │ blocking
             ▼
┌─── P1.0 Sync Wave(parallel 2 task)──────────────┐
│  Sync.1 GameState schema 全字段                   │
│  Sync.2 DialogBox 真做(typing/portrait/key/...)  │
└────────────┬─────────────────────────────────────┘
             │ blocking
             ▼
┌─── P1 系统 4 股 (parallel) ──────────────────────┐
│  Battle 完整  │  Menu 完整  │  Save  │  Interact  │
│  13 task     │  11 task    │ 6 task │  7 task    │
└────────────┬─────────────────────────────────────┘
             │ blocking
             ▼
┌─── P2 收敛 (sequential) ──────────────────────────┐
│  dev panel 集成 · L2 baseline · manual unit · 文档 │
└──────────────────────────────────────────────────┘

P-Opcode 嵌入各股 wave(共 25-33 个系统层 opcode 顺手命名,详见 §9)
```

**Checkpoint = 7 个**:P0 / P1.0 / Battle / Menu / Save / Interact / P2 各一(每个 checkpoint 用户跑 dev panel 单元验证)。

---

## 2. P0 · 探索物理(sequential)

**为什么 sequential**:5 项都触动 scene-system.ts + present.ts 这两个核心文件,disjoint 太少,并行会冲突;且后项依赖前项(C 依赖 A 的 walking flag、D 依赖 C 的动画机制、E 依赖 A 的 walkable 真值)。

| Item | 现状(M2 简化)| 真做(参考 sdlpal)| 主测试 |
|---|---|---|---|
| **P0.0 schema 改 pixel** | `gs.party / gs.npcs` 存 `{col, row}` cell | 改 `{x, y}` pixel(对齐 sdlpal `rgParty[i].x/y`)| GameState round-trip + scene-system spec 全过 |
| **P0.a 碰撞** | scene-system.ts:80 `isWalkable` 永远 true | port scene.c:512 `PAL_CheckObstacleWithRange` — pos /32 /16 + xr/yr 残差菱形三角细分(h=0/1)→ `PAL_MapTileIsBlocked(x, y, h)`;事件对象 `\|dx\|+\|dy\|*2 < 16` | L1 各方向墙 / NPC 阻挡;sdlpal `--dump-map` 已有 baseline |
| **P0.b 遮挡** | present.ts:74 layer 1 全盖所有 | port scene.c:181 `PAL_SceneDrawSprites` Y-sort + `PAL_CalcCoverTiles` 选择性 cover-tile | L2 baseline:Party 走到柱子后面 |
| **P0.c 走动 4 帧动画** | present.ts:70 永远取站立帧 | port scene.c:636 `PAL_UpdatePartyGestures` — walking flag → `s_iThisStepFrame` 0-3 循环;`PlayerRoles.rgwWalkFrames` 区分 4 帧 / 3 帧 | L2 baseline walking 中间帧 |
| **P0.d 队友 trail** | 只画 `gs.party` 1 人 | port scene.c:779 `PAL_UpdateParty` + `rgTrail[]` 数组(保 5 步)— 队友占 trail[1] / trail[2]+ 偏移;队友 4 帧动画 | L2 baseline 3 人队 trail |
| **P0.e scene 默认 spawn** | loadScene 无 partyStart 停旧坐标 | **loadScene 真跑 `wScriptOnEnter` 段**(土灵珠路径);enter script 内 `setPartyPos` opcode 自己处理初始位 — 不 hardcode 兜底 | dev panel 跳任意 scene 入口位置合理 |

**P0 顺带 opcode**:`setPartyPos` / `setPartyDirection` / `setCamera` / `centerCameraOnParty` / `playMusic`(M6 接但 opcode 先名) / `setSceneObject` — 估 **4-6 个**。

**M5 不做(推 M6 体验升级)**:leader 半 tile 步 px 之间再插帧(sdlpal 原版没插,D29 不引偏离)。

**P0 子顺序**:
- wave 0:P0.0 schema(blocking,单 task,改完所有 tests 红一片再绿)
- wave 1:P0.a + P0.b(disjoint:scene-system vs present)→ parallel
- wave 2:P0.c(需 walking flag)
- wave 3:P0.d + P0.e(disjoint:present vs loadScene+pal-extract)→ parallel
- wave 4:收口 + manual checkpoint

**估**:7 task,~5-7 工作日。Checkpoint:你跑 dev panel scene picker 走 2-3 个 scene 验:不穿墙 / 遮挡对 / 4 帧走动 / 多人队跟得上 / 跳 scene 自动落入口。

---

## 3. P1.0 · Sync Wave(并行 2 task)

**为什么独立 wave**:GameState schema + DialogBox 是 P1 4 股共享基础,必须先冻结/做完,4 股才能 fan-out;同时这 2 个 task 之间互不依赖,可并行。

### Sync.1 GameState schema 全字段冻结

按 sdlpal `SAVEDGAME_WIN`(global.c:530)倒推 TypeScript types:
- viewport (x, y) + party 方向 + scene 编号 + palette offset + layer + chase range
- nPartyMember / nFollower / wMaxPartyMemberIndex
- rgParty[5] + rgTrail[5](P0.d 已建)
- ALLEXPERIENCE Exp(8 类 EXP × 玩家)— `rgPrimaryExp / rgHealthExp / rgMagicExp / rgAttackExp / rgMagicPowerExp / rgDefenseExp / rgDexterityExp / rgFleeExp`
- PlayerRoles 完整副本(level / HP / MP / 属性 / 装备 / spell book ...)
- rgPoisonStatus[MAX_POISONS][MAX_PLAYABLE_PLAYER_ROLES]
- rgInventory[MAX_INVENTORY]
- **rgScene[MAX_SCENES]**(per-scene 当前 wScriptOnEnter 指针 — 可被 script 改写)
- **rgObject[MAX_OBJECTS]**(item / spell / enemy 对象元 — wScriptOnUse 可被改)
- **rgEventObject[MAX_EVENT_OBJECTS]**(scene 内事件对象 sState — chest 已开 / 机关已触发 全住这)
- dwCash + 音乐编号 + 战斗场地 + 屏幕摇晃 + wSavedTimes + wBattleSpeed

**关键发现**:**chest 已开 / 机关已触发 不是独立 flag 字段**,直接住在 `rgEventObject[i].sState`(从 kObjStateBlocker 改 kObjStateHidden 等)。Save 股只 dump rgEventObject 完整数组,Interact 股不需另设 GameState 字段。

**任务面**:全部 game-state.ts 改写 + 现有 spec 字段路径调整;round-trip 测确认序列化/反序列化等价。

**估**:1 task,1-2 天(改面大,test 全要更新)。

### Sync.2 DialogBox 真做

按 sdlpal `text.c::PAL_StartDialogWithOffset` port:
- **4 styles** 位置(kDialogUpper/Center/Lower/CenterWindow)+ box layout
- **字逐字 typing animation**:以 frameNum 节奏,每 N 帧出 1 字
- **角色头像**:`portraitIcon` 字段对应 RGM.MKF chunk → 真 RLE 解码 → blit 到 box 旁(M4 P2 已 dump 92 头像)
- **按键继续 icon**:每页结尾右下角 sprite blink + 阻塞等 Confirm
- **字体颜色** `bFontColor`(palette 下标)
- **阴影** `iDialogShadow`:字体 1px 偏移 + 暗色
- **多页**:长文 `\r` 切页 + auto wrap;按键翻页

复用 P0 已建的 Unifont glyph blit(P0 没改它)。

**估**:1 task,2-3 天。

### Sync 收口

Manual:dev panel "test all dialog styles" entry → 4 style 各一段,看头像 / typing / key icon / 换页 / 颜色 / 阴影全对;M3.5 a2 walkthrough 重跑 L2 baseline 全更新。

**Sync 总 task = 3**(2 主 + 1 收口),~3-5 工作日。Checkpoint:你看 dialog test 4 style 全对。

---

## 4. P1-Battle 股(13 task,~9-12 天)

### 范围
M3 phase 1 已建:turn-queue + 5 actions + 基础公式 + 战斗 UI 骨架 + dev 入口。
M5 补:scripted AI / 五行完整 / 完整 status / Summon/Trance/装备/投掷 / 升级 EXP 8 子项 + RNG / 协力 / Magic 动画 / M3.5 ⚠️ #7 #9 修。

### Wave

**B-w0 Blocking 基建(4 task,sequential)**
- B-w0.1 修 M3.5 ⚠️ #9 sdlpal `--dump-battle` 50 fixture SIGABRT
- B-w0.2 修 M3.5 ⚠️ #7 PLAYER_POSITIONS 真值(4-5 player 实际只 3)
- B-w0.3 Status schema 扩 全套 ~12 种(poison / sap / silence / petrify / freeze / dying / ...)
- B-w0.4 D29 dump 扩 post-battle 段(exp / levelup / status 清算)

**B-w1 公式/状态/升级 三股(3 task,parallel,disjoint)**
- B-w1.a 完整 status apply 逻辑(poison 扣 HP / sap 扣 MP / silence ban magic / confused 随机敌我 / petrify freeze 跳回合 / dying 下回合死;duration / 互斥 / 抗性)
- B-w1.b 五行 field 加成 + 元素抗(`Enemy.rgsMagicResistance[5]`)
- B-w1.c 升级 EXP 8 子项细分 + 随机数值(`rgwLevelUpStats` RNG 投增);sdlpal `--dump-post-battle` 对拍

**B-w2 AI + 新 action types(2 task,parallel,disjoint)**
- B-w2.a Scripted enemy AI(消费 `wScriptOnTurnStart` / `wScriptOnReady`,复用 EventSystem battle ctx)
- B-w2.b Summon / Trance / 战斗内装备 / 物品投掷(4 个新 action types)

**B-w3 协力 + Magic 动画(2 task,parallel)**
- B-w3.a 协力法术 / 觉醒触发(组合检测 + Trance 切换)
- B-w3.b Magic 特效动画(消费 M4 dump FIRE 837 frame + RGM 92 头像 + RNG 通用动画)

**B-w4 收口(2 task,sequential)**
- B-w4.1 战斗股全 spec + sdlpal --dump-battle 10 fixture 对拍
- B-w4.2 Manual checkpoint(dev panel B 入口扩 status preset / 五行 / 4-5 player / 升级 RNG)

### B 股 opcode 顺手
Scripted AI 调用的 battle opcode:`battleSetEnemyHP` / `battleAddStatus` / `battleApplyMagic` / `battleCheckPlayerHP` 等估 **8-10 个**。

### B 股交叉依赖
- 依赖 P1.0 sync(DialogBox + GameState schema)
- 与 Menu / Save / Interact disjoint

---

## 5. P1-Menu 股(11 task,~8-11 天)

### 范围
完整菜单系统;商店买卖 / 换装备 / 吃药 / 用道具 / 学法术 / 状态查看 / inventory / 主菜单 / 暂停菜单 / 标题画面;**内部业务用例全 L1 + L2 覆盖,不只是 UI 视觉**。

### sdlpal 倒推
uigame.c 15 个 menu 函数高度复用:底层选择框 → 中层共用列表(ItemSelectMenu / MagicSelectionMenu)→ 上层业务菜单。

### Wave

**M-w0 共用基础(2 task,sequential)**
- M-w0.1 底层选择框 port(`SelectionMenu` / `TripleMenu` / `ConfirmMenu` / `SwitchMenu`)+ ShowCash
- M-w0.2 中层共用列表(`ItemSelectMenu` 分类/数量/翻页/价格列开关 + `MagicSelectionMenu` MP cost / 掌握过滤)

**M-w1 单 player 操作菜单(3 task,parallel,disjoint)**
- M-w1.a Inventory + ItemUseMenu(战斗外用药 / 万灵丹 / 还魂丹 / 仙药 — 消费 `wScriptOnUse`)
- M-w1.b EquipItemMenu(5 槽 + diff 属性自动重算 + 转给别人 + 装备槽 `dwEquipFlags` 限制)
- M-w1.c InGameMagicMenu(大世界用法术 — 治疗 / 还魂;MP 检查)

**M-w2 状态 + 主菜单链(2 task,parallel,disjoint)**
- M-w2.a PlayerStatus(属性/装备/法术 3 页 + Left/Right 切人)
- M-w2.b InGameMenu(ESC 主)+ SystemMenu(存/读/设置/战斗速度/退)

**M-w3 商店 + 标题(2 task,parallel,disjoint)**
- M-w3.a BuyMenu + SellMenu(商店 ID 表 / 限购 / 卖价折扣 / 钱不够拒);`openShop` opcode
- M-w3.b OpeningMenu(标题:新游戏 / 读档 / 退)+ SaveSlotMenu(slot 1-5 列表 + meta);**跨股**:Menu 出 UI,Save 出 API stub-first

**M-w4 收口(2 task,sequential)**
- M-w4.1 Menu spec + L2 baseline 各 menu 1 张(10-15 张)
- M-w4.2 Manual(任意 scene Esc 跑全二级 + 商店 dev 入口)

### M 股 opcode 顺手 = 2-3 个(`openShop` / `getShopId`)

### M 股交叉依赖
- 依赖 P1.0 sync(DialogBox + schema)
- 与 Save 股共建 SaveSlotMenu(stub-first 协调)
- 与 Interact 股在 "商店 NPC contact → 调 BuyMenu" 上 wave 1.c + M-w3.a 联调

---

## 6. P1-Save 股(6 task,~4-5 天)

### 范围
GameState JSON 落 IndexedDB + slot 元 + 存/读 API + 为 Menu SaveSlotMenu 提供 stub-first。

### Wave

**S-w0 API stub(1 task,blocking)**
- S-w0.1 IndexedDB API stub(`saveSlot(n, gs)` / `loadSlot(n)` / `listSlots()` / `deleteSlot(n)`)— 实现先 in-memory map,给 M-w3.b stub-first
- (GameState schema 已在 P1.0 sync wave 完成,不另列)

**S-w1 真实现(2 task,parallel)**
- S-w1.a IndexedDB 真存:序列化/反序列化 + version 字段 + slot 上限 5
- S-w1.b Slot meta 抽取(主角 level / 累计 play time / scene 名 / wSavedTimes)

**S-w2 Dev 入口(1 task,sequential)**
- S-w2.1 dev panel 4 entry(save/load/list/clear slot)

**S-w3 收口(1 task)**
- S-w3.1 Manual:任意状态 → save → 刷页 → load → state 全部恢复(含 trail / party / inventory / scene / event object states)

### S 股 opcode = 无(save/load 是运行时机制,不走 event script)

### S 股交叉依赖
- 依赖 P1.0 sync(GameState schema)
- 与 Menu wave 3 SaveSlotMenu 共建(stub-first 协调)
- 与 Battle / Interact disjoint

---

## 7. P1-Interact 股(7 task,~5-7 天)

### 范围
chest 开 + 机关踩 + 完整 contact runScript(扩 M3.5 base);系统 opcode 真名大户。

### Wave

**I-w0 EventObject schema + 触发机制(2 task,sequential)**
- I-w0.1 EventObject sState 字段全枚举 + `triggerMode: contact / confirm / cell-trigger` + scene-NN.json 全 295 scene 重 dump
- I-w0.2 Cell-trigger evaluation tick(scene-system 每 tick 检查 party 落点)

**I-w1 系统 opcode 真名(3 task,parallel,disjoint)**
- I-w1.a chest 相关 opcode:`addItem` / `removeItem` / `setObjectState` / `playSound`(估 4-5 个)
- I-w1.b 机关 / scene-state 相关 opcode:`setObjectPosition` / `setEventObjectScriptOnEnter` / `enableEventObject` / `disableEventObject` / `setLayer`(估 4-5 个)
- I-w1.c NPC 一般 contact 相关:`setNPCDirection` / `walkOneStep` / `freezeNPC`(估 3-4 个)

**I-w2 集成(1 task,sequential)**
- I-w2.1 contact / confirm / cell-trigger 三路径串通;dev panel 跳 chest / 机关 / 对话 NPC scene 测

**I-w3 收口(1 task)**
- I-w3.1 spec + L2 baseline + Manual(跳箱子开 + 机关踩 + 存读后状态保留)

### I 股 opcode 顺手 = **11-14 个**(此股 opcode 大户)

### I 股交叉依赖
- 依赖 P1.0 sync(GameState rgEventObject 字段)
- 依赖 P0.e wScriptOnEnter 真跑(I-w1.b 改 wScriptOnEnter 指针的 opcode 要能被 scene 加载时真消费)
- 与 Menu wave 3 商店 NPC contact 联调

---

## 8. P2 收敛(4 task,~3-4 天)

### Wave

**P2-w0** dev panel 集成入口(scene picker / battle 扩选 / menu Esc 任意 scene / save 4 entry / interact scene 直跳列表)

**P2-w1** L2 视觉 baseline covering(估 25-30 张新):dialog 4 style + 头像 / 商店 / 装备 / inventory / 状态(3 页)/ 标题 / SaveSlot / 战斗 magic anim / status icon / trail / 走动 / chest 开后 / 机关后

**P2-w2** Manual unit verify checklist(8 个 dev unit:scene 物理 / dialog / 战斗全 actions / 暂停菜单 / 商店买卖 / 装备 / 存读 / chest+机关)

**P2-w3** 文档(README / 03 plan M5 段 / 04 decisions D36+ / 实施过程发现归档)

---

## 9. P-Opcode 嵌入策略

20-25 个系统层 opcode 顺手命名,**不另开 phase**,各股内部 wave 分配:

| 股 | Opcode | 估数 |
|---|---|---|
| P0.e wScriptOnEnter 顺带 | setPartyPos / setPartyDirection / setCamera / centerCameraOnParty / playMusic / setSceneObject | 4-6 |
| B 股 AI 调用 | battleSetEnemyHP / battleAddStatus / battleApplyMagic / battleCheckPlayerHP / 等 | 8-10 |
| M 股 商店 | openShop / getShopId | 2-3 |
| I 股 chest | addItem / removeItem / setObjectState / playSound | 4-5 |
| I 股 机关 | setObjectPosition / setEventObjectScriptOnEnter / enableEventObject / disableEventObject / setLayer | 4-5 |
| I 股 NPC | setNPCDirection / walkOneStep / freezeNPC | 3-4 |
| **合计** | | **25-33 个** |

剩余 ~50 个 opcode(剧情专属:setFlag / 特定 cutscene 触发 / 特定 boss / palette cycle / 各种 conditional jump)**推 M7 与剧情数据一起调通**。

---

## 10. 测试策略

### L1 Vitest 单测(`pnpm -w check`)
- 每 wave / 每 task 直接相关的 unit 必有 L1 spec
- 公式 / RNG 类 task 用固定 seed
- Schema 改动:round-trip(序列化 → 反序列化 → deep equal)
- 现 501+2 skip → M5 完工预计 800-900 spec

### L2 Playwright + pixelmatch(`pnpm -F @type-pal/game e2e`)
- 每股收口前 baseline 重生
- 新增 cases:对话 4 style + 头像 / 商店 buy-sell / 装备 / inventory / 状态 / 标题 / SaveSlot / 战斗 magic anim / status icon / 走动 / trail / chest 开后 / 机关后
- 现 31 pass → M5 完工预计 55-65 pass

### D29 sdlpal 真值对拍
- 战斗 fixture:`scripts/build-sdlpal-classic.sh` build classic → `--dump-battle` per-turn JSON;**M5 扩 `--dump-post-battle` 战后段**(exp / levelup / status 清算)
- 探索 scene:M4 已有 `--dump-map` 全 295 99.7% pass(不退化)
- 升级 RNG:dump post-battle 后,L1 spec 固定 RNG 跑同 fixture → 期望 player 属性 diff 跟 dump 对得上

### Manual checkpoint(7 个,每个 5-10 min)
1. P0 后:dev panel 走 2-3 scene 验物理
2. P1.0 后:dev panel test all dialog styles
3. Battle 后:dev panel B 入口跑全场景战斗
4. Menu 后:任意 scene Esc 跑全二级
5. Save 后:任意状态存/读
6. Interact 后:dev panel 跳 chest + 机关 scene
7. P2 后:8 个 unit 全过

---

## 11. 风险与决策点

### R1:P0.0 schema 改 pixel 改面大
- 所有现有 spec(M2 / M3 / M3.5 关 party.col/row 的)全要改
- **缓解**:先开 P0.0 一个 task 一次性改完 + spec 全恢复;再启 P0.a/b/c/d/e
- **关键 D29 检查**:走两步 → x +=16 +=16 = 32(走 1 整 tile),与 sdlpal 等价

### R2:DialogBox 真做工作量比预期大
- 角色头像 RLE 解 + typing 节奏 + key icon blink + 多页 — 单 task 2-3 天可能不够
- **缓解**:Sync.2 单独 task 不与 Sync.1 共享 ddl;若 3 天未完,Sync 收口推 1-2 天
- 备选:typing animation 可做关 / 开 toggle(M5 默认开,debug 时可关跳过)

### R3:Battle B-w0.1 SIGABRT 修不动
- sdlpal `--dump-battle` 50 个就崩,根因可能 fixture id 越界 / 内存 / 等多种
- **缓解**:B-w0.1 单 task 独立,若 1 天没修出来,**临时方案**:fixture pool 限制 < 50 跑通即可,SIGABRT 归 M7 不阻塞 M5
- D29 双基准接受降级:战斗 baseline 5-10 fixture 而非 50

### R4:升级 EXP 8 子项细分公式可能与 sdlpal 不完全一致
- sdlpal 升级公式可能因 PAL_CLASSIC 与 WIN95 略不同;classic build 才是规格
- **缓解**:B-w0.4 dump post-battle 用 classic build,公式逐 step 对拍

### R5:rgEventObject 全 dump 序列化大小
- MAX_EVENT_OBJECTS 估 ~500-1000;每个 sState + 各字段 ~20-30 bytes
- IndexedDB 单 slot ~50-100KB,5 slot ~500KB — 完全 ok
- **预估**:不是问题,不缓解

### D36 候选(待 M5 进行中决):
- D36 GameState 是 PAL_CLASSIC schema 还是 WIN95?(默认 WIN95,因为本项目走 Win9x 版数据;PlayerRoles 字段以 WIN95 为准)
- D37 Dev panel 路由:dev panel scope 是否限 import.meta.env.DEV?(已是)
- D38 SaveSlot 上限是否 5(对齐 sdlpal)还是放宽到 10/无上限?(默认 5)

---

## 12. M7 留什么(M5 完工后划线)

- **真剧情链路**:scene 1 端菜 / 醒来 / 苗人 / 酒剑仙 / 桂花酒 / 出客栈 / 大地图 / 仙灵岛 / 桃林 / 水月宫 / 完整通关
- **剩余 ~50 剧情专属 opcode**(setFlag / 特定 cutscene 触发 / 特定 boss / palette cycle / 各种 conditional jump)
- **通关验证 + 数值平衡 + bug 抓 + 打磨**
- **音/视频**:见 M6

---

## 13. 完成定义

M5 完工 = 同时满足:
1. P0 5 项 + 第 6 项 wScriptOnEnter 真跑 全部 done
2. P1.0 Sync(GameState schema + DialogBox 真做)done
3. P1 4 股(Battle 13 / Menu 11 / Save 6 / Interact 7)全 task done
4. P2 4 task done
5. `pnpm -w check` 全绿(预计 800-900 spec)
6. `pnpm -F @type-pal/game e2e` 全绿(预计 55-65 pass)
7. 7 个 manual checkpoint 全 OK
8. M5 / M7 划线写入 03 plan + 04 decisions

不达此线不算 M5 done。

---

## 附录 A · 总盘汇总

| Phase / 股 | Task | 估时 |
|---|---|---|
| P0 探索物理 | 7 | 5-7 天 |
| P1.0 Sync | 3 | 3-5 天 |
| P1-Battle | 13 | 9-12 天 |
| P1-Menu | 11 | 8-11 天 |
| P1-Save | 6 | 4-5 天 |
| P1-Interact | 7 | 5-7 天 |
| P2 收敛 | 4 | 3-4 天 |
| **合计** | **51 task** | 串行 37-51 天 |

**并行后真实时长** ≈ P0(6 天)+ Sync(可与 P0 后半重叠,~3 天有效)+ P1 4 股并行 ~9-12 天(Battle 是瓶颈)+ P2(4 天)= **真实日历 22-28 工作日**。

## 附录 B · sdlpal 关键文件索引

- `scene.c::PAL_CheckObstacle`(L512) — P0.a 碰撞
- `scene.c::PAL_SceneDrawSprites`(L181) — P0.b 遮挡
- `scene.c::PAL_UpdatePartyGestures`(L636) — P0.c 走动动画
- `scene.c::PAL_UpdateParty`(L779) — P0.d trail + 输入处理
- `global.h::SCENE`(L115) — wScriptOnEnter / wScriptOnTeleport 字段
- `global.c::SAVEDGAME_WIN`(L530) — GameState schema 倒推源
- `text.c::PAL_StartDialogWithOffset`(L1219) — DialogBox 真做
- `text.c::PAL_ShowDialogText`(L1616) — typing animation
- `fight.c` — 战斗公式 / PAL_BattleWon
- `magic.c` — magic apply / status apply
- `uigame.c` — 全套菜单系统
- `itemmenu.c` / `magicmenu.c` — 物品 / 法术共用列表
- `script.c` — 全 opcode dispatch
- `io_save.c::PAL_SaveGame_All / PAL_LoadGame_All` — sdlpal 原版存读(参考,不字节级兼容)
- `rngplay.c::PAL_PlayRNG` — 战斗 magic 动画 / RNG 通用

---

**下一步**:本 design 经 user 校阅后,产 step-by-step plan `2026-05-25-m5-systems-complete.md`(走 superpowers:writing-plans skill)。
