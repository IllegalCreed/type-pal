# Feature Status · type-pal

> 引擎功能实现状态。**权威功能索引** —— 任何"完成度"表述以本文件为准,README 不写百分比。
> **职责**:本表 owns 玩家可感知功能(A-M 章)的实现状态。逐 opcode 明细 → [opcode-status](opcode-status.md)(E 章只留框架级 + 指针);逐 chunk 提取明细 → [resource-status](resource-status.md)(K 章只留框架级 + 指针)。
> **三表**:feature-status(引擎功能,本表)· [opcode-status](opcode-status.md)(事件 / opcode)· [resource-status](resource-status.md)(资源提取)
> **图例**:✅ done(verified=user 拍板 / claimed=Claude 自认)· ⚠️ partial · ⬜ todo · N/A。详见下方状态定义。
> **最后更新**:2026-06-02 — 过时「残」注清理(4-agent 核验 workflow,逐条 source 复核):**11 处过时残注订正**(D17/D19/D20 Trance + D19 palette cycle + D20 战斗精灵中毒色 = 5 处 **N/A**:PAL_CLASSIC 数据/机制不可达,magicNumber 47 不在玩家法术表 / 战斗主循环无 palette cycle / iColorShift 无毒色 call-site;D2 R重复 + D16 聚拢动画 + D24 隐身效果 + D25·D26 0x90/0x79 + D8 silence灰显 = **已实现注过时**;D2 equip-battle action = sdlpal 不存在)。**真残留保留 2**:D8 confused 走入精灵动画 / D11 hidden-exp 数字 x 偏差 15px。状态列留 user 拍板,本次只订正残注 prose。此前 2026-06-02 物品系统专项(蛊孵化链 / 战斗单目标治毒 / 大世界状态 / _item 重标注 / EnemyMagic iBlow / 0x31 精灵替换)。
> **历史**:2026-06-01 — 全表重审(21-agent workflow):105 行里仅 **1 处真高估**(D12 逃跑公式 str 用 raw fleeRate)→ 降 ⚠️;**6 处低估订正**(D9 升 ✅ 已做 / D17 Summon 演出已做删过时备注 / B12 camera 升 ✅ 修错误行号 / B7 修行号 / B3·E3 测试列 ⬜→✅);L1·L2 备注措辞 + E2 计数(122→126)微调。详 [审计报告](plans/2026-06-01-feature-status-audit.md)。此前 2026-05-30:战斗演出/对话刷新(D17 动画时间线 / D18 友方目标 / D25 治疗 / D26 对话 / D27 敌魔法 / D11 升级 / M5 边界同步);B 系列战斗收口(B1 状态 / B2 敌 AI 13/13 / B6 数值装备)。
> 状态由 user 逐条 sdlpal 源核对后拍板,Claude 不自判。

## 状态定义

- **✅ verified**:Claude port 自认 1:1,**且** user 已逐行核对 sdlpal 源 + 拍板通过。
- **✅ claimed**:Claude port 自认 1:1,**但** user 尚未核对。带行号引用 sdlpal 待 user 拍。
- **⚠️ partial**:Claude 自知 / user 实测发现简版 / 缺真值 / 未完整 port。带具体差异说明。
- **⬜ todo**:未做。
- **N/A**:by design 不 port(浏览器 canvas / Web Audio 替代 SDL/audio,DOS 兼容代码,纯开发工具等)。

## 测试列定义(2026-05-29 user 要求加)

- **✅ unit**:有 unit test 覆盖核心数据 / 状态机 / 公式
- **✅ regress**:有专门防回归测试(user 反馈过的 bug 都有 unit case 钉死)
- **✅ partial**:部分有(eg 数据 state machine ✅ 但渲染层 ⬜;或单 case 但不全)
- **⬜ todo**:无测试
- **N/A**:不需要(by design 不 port / 渲染层难单测)

## audit 进度

- **2026-05-30 全表对照 commit 大刷新**(9-agent workflow audit,逐行核对 ts 源 + git log):
  - 表上次实质更新 2026-05-29,此后 ~40 commit 落地,A/C/E/G/I/K 多章严重过期。
  - 大批 `⬜ todo` → `✅ claimed`(基于已 ship commit + file:line 证据):A1/A2/A3 开场、I1/I3 结局、C9 商店、G7/G10/G11 特效、E 类多 opcode、K4 WORD.DAT 修复。
  - E 章重构:收敛为框架/架构级条目,逐 opcode 状态改由 [opcode-status.md](opcode-status.md) 单一维护(根治两表漂移)。
  - 新增 **M. 运行时架构 / 工具** 章 + B/C/G/K 缺失行(follower / camera / ConfirmMenu / 特效栈 / 音频资源提取等)。
  - **所有刷新状态一律 `claimed`/`partial`,不升 `verified`** — user 逐条核对仍 **0 verified**,本次只是把"已 ship 但表里标 todo"的漂移修正成"Claude 自认完成、待 user 核"。
- 菜单补完进度:**C5 ✅ + C7 ✅ + C8 ✅ + C9 ✅**(EquipItemMenu / InGameMagicMenu / Save-Load / 商店 全栈接入)
- L 段(特殊物品 / 剧情系统):真值已查清 = 战斗 E 类 opcode chain,gate 在战斗 opcode 未做(详见 L 章)

## 已知 follow-up

- mutatePlayerStat FIELD_MAP row index 偏移 -1 bug(event-system.ts,2026-05-28 C5 audit 发现):
  - sdlpal global.h 真值 5=Unknown1 / 6=Level / 17=AttackStrength
  - ts mutatePlayerStat 用 5=Level / 16=AttackStrength(全错位 -1)
  - 影响:opcode 0x19 (IncreasePlayerAttr) / 0x1A (SetPlayerStat) 大世界 trigger script 真值错
  - 修复策略:统一改成 sdlpal 真值 row(见 [equip-effect.ts `PLAYERROLES_ROW`](../packages/game/src/core/equip-effect.ts))
  - 优先级:中(实测可能没被触发,但 audit 时已发现就该修)

> 本表初版来自 [2026-05-28 chat 全功能清单](plans/2026-05-28-feature-audit-and-replanning.md);
> 状态变更走 plan Phase A/B audit 模板,commit message 引 sdlpal 行号。

---

## A. 启动 / 引导

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| A1 | Trademark Logo | ✅ claimed | ✅ partial | main.c:197-203 `PAL_TrademarkScreen` | shell/trademark-fallback.ts + bootstrap.ts | WIN95 build 播 1.mp4;DOS build `playTrademarkFallback`(palette chunk3 + RNGPlay(6,0,-1,25) + UTIL_Delay(1000) + FadeOut(1))。trademark-fallback.test.ts;commit b466d5f。dev `?skip-intro` 跳过 |
| A2 | Splash 屏 | ✅ claimed | ✅ partial | main.c:206-456 `PAL_SplashScreen` | shell/splash-fallback.ts + bootstrap.ts | DOS 卷轴(上/下半 FBP chunk3/4 滚动 + 9 仙鹤 MGO73 帧动画 + 标题 RLE MGO71 渐显 + palette 0→100% 15s + Menu/Search 快进);WIN95 播 2.mp4。splash-fallback.test.ts;commit b466d5f |
| A3 | 开场 AVI | ✅ claimed | ✅ partial | uigame.c:162 `PAL_PlayAVI("3.avi")` | shell/avi-player.ts + bootstrap.ts playOpeningAvi | by design 离线 ffmpeg→mp4(非 runtime port aviplay.c);1-6.mp4 全提取(data/extracted/videos/)。OpeningMenu 新游戏 → 播 3.mp4 `<video>` 全屏 + 跳过键;DOS build 无 3.avi 直接 return。avi-player.test.ts |
| A4 | OpeningMenu(新游戏/读档) | ⚠️ partial | ✅ partial | uigame.c:42-167 `PAL_OpeningMenu`(:107-108 x 公式) | core/menu/opening-menu.ts + present/menu/draw-opening-menu.ts + present/font.ts | 数据 state machine(opening-menu.test.ts)。**W3 选项 x 公式补全(2026-06-01)**:此前硬编码 x=125(被推后的 T20 follow-up)→ 改 `openingItemX(label)=125-(w>4?(w-4)*8:0)`,w=`palWordWidth`(忠实移植 PAL_WordWidth ui.c:836-861 / PAL_CharWidth font.c:611-629:ASCII<0x80=8/CJK=16,(Σ+8)>>4)。shipped 真 label '新的故事'/'读取存档'=4 字→w=4→x=125(零像素回归,已钉死测试);长文案按公式左移。OpeningMenu 本无 box(`PAL_ReadMenu(NULL)`),故 9-slice 不适用 |
| A5 | win95/dos 双版启动路由 | ✅ claimed | ✅ partial | main.c:545-546 流程 + `gConfig.fIsWIN95` | shell/bootstrap.ts buildFlag + showTrademarkAndSplash | `?build=win95`(默认)走 mp4 1/2/3/4/5/6;`?build=dos` 走 RNG/卷轴/FBP fallback 真做。sdlpal `fIsWIN95` runtime 检测,本项目用 URL flag 替代 |

## B. 大世界探索

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| B1 | 玩家走路 4 方向 + 步频动画 | ✅ claimed | ✅ partial | scene.c:636 `PAL_UpdatePartyGestures` | core/scene-system.ts + present.ts | scene-system.test.ts;真值循环动画 priority 可能偏差 |
| B2 | NPC 跟随队伍 trail | ✅ claimed | ✅ partial | scene.c:779 `PAL_UpdateParty` | core/event-system.ts partyWalkTo + present.ts | event-system.test.ts trail;进场景 0x46 setPartyPos 预填 rgTrail[0..4](commit f159e32);多 NPC 完整 trail 时序未完整测 |
| B3 | NPC 自动行走 autoScript | ⚠️ partial | ✅ partial | script.c:3482 `PAL_RunAutoScript` | core/event-system.ts:962 tickAutoScripts | 见 E3(已搬到 event-system);0x00/0x01/0x02/0x03 控制流全 port + goto 同帧续跑(commit eaaa1d5 修张四划船);1 op/tick 本就是 sdlpal 真值。event-system.test.ts 有 autoScript 断言(2026-06-01 审计:测试列 ⬜→✅ partial)。残少数 wScriptOnAnimate 态 |
| B4 | 场景切换 door / trigger zone | ✅ claimed | ✅ partial | play.c:81-166 fTrigger 段 | core/scene-system.ts updateEventObjectsAndTrigger | mode-dependent Manhattan threshold;多处转场黑屏根因已修(9791497 失败兜底解冻 / 9293dac onEnter cutscene 门控)。见 M3 |
| B5 | 调查 Confirm 键 PAL_Search | ✅ claimed | ✅ partial | play.c:362-510 `PAL_Search` + `PAL_GetSearchTriggerRange` | core/scene-system.ts | scene-system-search.test.ts |
| B6 | NPC 对话触发 runScript | ✅ claimed | ✅ partial | text.c:1208 `PAL_StartDialog` 全套 | core/event-system.ts runScript + dialog 状态机 | event-system / dialog-box test;trigger 脚本推进持久化(b479cab 修李大娘重播);详见 C13 |
| B7 | 明雷怪 visible enemy | ✅ claimed | ✅ partial | script.c:309-501 `PAL_MonsterChasePlayer` + play.c:107-165 接触触发 | core/scene-system.ts contact + core/event-system.ts:4475 monsterChasePlayer | 0x4C MonsterChasePlayer 已 1:1 port(菱形回弹 / 4 向避障 / 驱魔香原地打转,经 autoScript 每帧驱动)+ 接触触发;明雷怪追玩家完整。commit ab56445。event-system.test.ts:1501 有 0x4C 用例(2026-06-01 审计:真实现在 :4475-4569,旧表 :4035 行号过时已修) |
| B8 | tilemap 遮挡 cover tile | ✅ claimed | ⬜ todo | scene.c:77-180 `PAL_CalcCoverTiles` | present/draw-tilemap.ts addCoverTileEntries | 5×5 scan + iTileHeight bit;队员 + 0x98 follower 都接入 |
| B9 | tilemap 阻挡 block bit | ✅ claimed | ✅ partial | scene.c:512-635 `PAL_CheckObstacle*` | core/scene-system.ts isWalkable | scene-system test;菱形四分 + bit 13 + sState>=2 NPC range + 明雷怪不阻挡走路 |
| B10 | 295 个 scene 资源加载 | ✅ claimed | ⬜ todo | res.c:191 `PAL_LoadResources` | assets/loader.ts | loader.test.ts;无 295 scene 全 fixture |
| B11 | 0x98 额外跟随者视觉渲染 | ✅ claimed | ✅ unit | scene.c:210-226/732-771 + res.c:335-348(sprite=operand 直当 MGO chunk,非 role 表) | present/follower-render.ts computeFollowerRenderItems + present.ts | 临时同行 NPC(scene 102 书生 chunk 82/83)渲染:trail[3+k] 后槽 + 恒 3 帧步 + iStepFrameFollower[0,2,0,1]。跨场景持久(数据 / sprite / trail 三条腿)。follower-render.test.ts 6 用例;commit 5ef46c1 / 8df9777 |
| B12 | camera / viewport 移动 0x7F | ✅ claimed | ✅ partial | script.c:2292-2379 `MoveViewport` | core/event-system.ts:2846 OP_SET_CAMERA | **2026-06-01 审计订正**:三分支全实现(非 no-op)——①(0,0)→centerCameraOnParty(:2855)②flag=0xFFFF 绝对跳(:2860)③相对 pan `camera+=toInt16`(:2865)+ 多帧平滑 pan(tickEventSystem :1866 检测→waiting='camera-pan',:1153 逐帧自减)。event-system.test.ts:4046 center+abs-jump 用例。**旧备注引的 :2593/:2606 是 item-script 代码,行号全错已修** |

## C. UI / 菜单系统(2026-05-29 全测试强化)

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| C1 | ESC 主菜单 InGameMenu | ✅ claimed | ✅ regress | uigame.c:944 `PAL_InGameMenu` | core/menu/in-game-menu.ts + core/word-lookup.ts | in-game-menu.test.ts。**W3 getWord 链已通(2026-06-01)**:菜单项 id 改真 WORD id(GAMEMENU 3/4/5/6,ui.h:61-64,此前是 0-based 下标),label 由 `getWord(id)` 取 words.json flat[565](WORD.DAT 单一文案源),fallback=byte-level 核过的硬编码(words.json 加载失败时容错,同 glyphs→tofu)。loader 加 fetch words.json + bootstrap setWordTable 注入。波及 opening/inventory-action/CASH 同批 |
| C2 | 系统菜单 SystemMenu | ✅ claimed | ✅ regress | uigame.c:516 `PAL_SystemMenu` + 2059 `PAL_QuitGame` + 343 `PAL_ConfirmMenu` | core/menu/in-game-menu.ts SystemMenuState + menu-driver.ts + core/word-lookup.ts | in-game-menu.test.ts choice + cursor 记忆。**W3 getWord 已通**(id 真 WORD id 11-15,label getWord;BATTLEMODE 606 PAL_CLASSIC 编译掉故仍 5 项)。**W3 Quit 二次确认已做(2026-06-01)**:SystemMenuState 加 phase:'menu'\|'confirm' + confirmYes(照 ShopMenuState),选 QUIT→进 confirm(默认 No,PAL_ConfirmMenu nDefault=0);方向键 toggle 否/是;选「是」→ setSystemQuitHandler→returnToTitle(回标题,**不**复用 0xA0 结局 handler、不播结局 mp4);选「否」/ESC→关整个菜单回 explore(对抗 review 订正:sdlpal PAL_SystemMenu 选 QUIT 后无论是/否都 return TRUE → PAL_InGameMenu goto out 关整个菜单,uigame.c:650/1031,非回系统菜单层)。drawConfirmBox 复用现成 |
| C3 | 物品菜单 InventoryMenu | ✅ claimed | ✅ regress | uigame.c:878-919 `PAL_InventoryMenu` + itemmenu.c:28-466 `PAL_ItemSelectMenu` | core/menu/inventory-menu.ts + script-desc.ts | inventory-menu.test.ts 26 用例 + script-desc.test.ts 6 用例 |
| C4 | 物品使用菜单 ItemUseMenu | ⚠️ partial | ✅ partial | uigame.c:1289-1473 `PAL_ItemUseMenu` | core/menu/inventory-menu.ts use-target + present/menu/draw-inventory.ts | inventory-menu.test.ts use-target phase;INNER while loop 真值 by user 实测 |
| C5 | 装备菜单 EquipItemMenu | ✅ claimed | ✅ regress | uigame.c:1793-2056 `PAL_EquipItemMenu` | core/menu/equip-menu.ts + present/menu/draw-equip.ts | equip-menu.test.ts 16 + equip-effect.test.ts 14;全屏 UI + scriptOnEquip 真接通 + 装备 effect |
| C6 | 角色状态菜单 PlayerStatus | ✅ claimed | ✅ partial | uigame.c:1051-1288 `PAL_PlayerStatus`(:1245-1253 毒 row) | core/menu/player-status.ts + present/menu/draw-player-status.ts | player-status.test.ts + draw-player-status.test.ts。**毒 row 已补(2026-06-02)**:遍历 rgPoisonStatus[slot][role] 的 wPoisonID,仅 poison.level<=3(诅咒类)显示,名=getWord(wPoisonID),色=wColor+10 fShadow,位置 RolePoisonNames[j](185,58+j*18,palcfg.c:370);objectPoisons map 经 PresentContext 注入。残:字体非 PALFONT 像素级 |
| C7 | 法术菜单 InGameMagicMenu | ✅ claimed | ✅ regress | uigame.c:653-875 + magicmenu.c:413-484 + uibattle.c:31-269 | core/menu/in-game-magic-menu.ts + magic-script.ts + present/menu/draw-magic.ts | 全屏 UI + scriptOnUse/scriptOnSuccess 真接通 + MP 扣 + 循环 picker。in-game-magic-menu.test.ts 21 + magic-script.test.ts 19 |
| C8 | 存档菜单 SaveSlotMenu | ✅ claimed | ✅ regress | uigame.c:169-242 + 578-611 + global.c:844-911 | core/menu/save-slot-menu.ts + core/save/api.ts + indexed-db.ts | 真 IO 接通(cross-slot max+1 wSavedTimes);load 重切已接(bootstrap.ts:517-523 reslice 重建 npcs↔allEventObjects 引用);残:旧档无 allEventObjects 时 NPC sState 可能不齐。save-slot-menu.test.ts 15 |
| C9 | 商店 BuyMenu / SellMenu | ⚠️ partial | ✅ unit | uigame.c:1615 `PAL_BuyMenu` + 1755 `PAL_SellMenu` | core/menu/shop-menu.ts + menu-driver.ts applyShopTransaction + present/menu/draw-shop.ts | commit 3f5b644 全栈 1:1 接入(修曾伯卡主流程):状态机 + **真扣金/真改背包**(买 cash-=price+AddItem / 卖 cash+=price/2,menu-driver.ts:220)+ draw-shop 真渲染 + ITEMBOX 预览 + confirm 框。shop-menu.test.ts。残:卖菜单紧凑布局而非 sdlpal fullscreen PAL_ItemSelectMenu(功能等价) |
| C10 | 9-slice 边框 box 渲染 | ✅ claimed | ✅ partial | ui.c:131-240 `PAL_CreateBoxWithShadow` | present/menu/draw-box.ts | draw-box.test.ts |
| C11 | 中文字体渲染 Unifont | ⚠️ partial | ✅ partial | font.c PALFONT 字模 | present/font.ts | font.test.ts;Unifont CN stroke 跟 sdlpal 原 PALFONT 字模不同 |
| C12 | 文字阴影 triple shadow | ✅ claimed | ✅ partial | text.c:1144-1155 shadow 段 | render-text.ts(在 font.ts 内) | font.test.ts;DOS triple / WIN95 single,sdlpal "fix" 统一 triple |
| C13 | Dialog 框 PAL_StartDialog + 逐字符打字引擎 | ✅ claimed | ✅ partial | text.c:1208-1817 全套 + 1474-1611 控制符 + iDelayTime | present/dialog-box.ts + core/event-system.ts | dialog-box.test.ts。**2026-05-30 增量**:逐字符颜色控制符全套(`"`黄/`-`青0x8D/`'`红0x1A/`@`红alt toggle,消费 `()$~\`,色态跨行,commit 77f6c2e)+ 时间驱动打字($NN→iDelayTime 真变速 + ~NN 尾暂停,commit bea9475)+ 等键箭头/阴影对齐(0884ceb)|
| C14 | DrawNumber 数字 sprite | ✅ claimed | ✅ partial | ui.c:640 `PAL_DrawNumber` | present/draw-number.ts | draw-number.test.ts;digit sprite + 5 color align |
| C15 | 确认框 ConfirmMenu(否/是) | ✅ claimed | ⬜ todo | uigame.c:242-365 `PAL_ConfirmMenu` | present/menu/draw-confirm.ts + event-system.ts(waiting='confirm') + menu-driver.ts | drawConfirmBox 共享渲染:否(130,100)/是(205,100),默认否。两处消费:opcode 0x0A goto-if-no(commit 5c208d4)+ 商店 confirm phase |
| C16 | 三选菜单 TripleMenu | ⚠️ partial | ✅ unit | uigame.c:320 `PAL_TripleMenu` | core/menu/primitives.ts createTripleMenu | primitives.test.ts 有纯状态原语,但**未接 menu-driver / 无 draw 层 / 运行时无消费者**(预留)。关联 C2 quit 二次确认 |
| C-cash | 金钱面板 drawCashBox | ✅ claimed | ⬜ todo | uigame.c:451 `PAL_ShowCash` | present/menu/draw-menu.ts inline | 残:抽 helper 后单测便于覆盖 — 留 follow-up |
| C-driver | menu-driver hub 输入路由 | ✅ claimed | ✅ partial | uigame.c 各 PAL_*Menu while loop | core/menu/menu-driver.ts | menu-driver.test.ts;dispatch 各 kind menu 输入 → 对应 state machine fn |

## D. 战斗系统

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| D1 | 战斗启动 StartBattle | ✅ claimed | ✅ partial | battle.c:1531 `PAL_StartBattle` | core/battle/battle-system.ts startBattle + bootstrap startBattleHandler | battle-system.test.ts;opcode 0x07 全链通。enemyTeam slot 当 enemies.json id 直索引的简化映射(T23 对拍待) |
| D2 | 5 actions(攻/技/防/逃/物) | ⚠️ partial | ✅ partial | fight.c:3577 `PAL_BattlePlayerPerformAction` | core/battle/actions/* | actions.test.ts;5 基础 action 真做 + **throw-item action 已接**(performThrowItem + 投掷物路由)。**(2026-06-02 核验订正)R 重复 prevAction 已做**(battle-system.ts:877 commitRepeatAction,port uibattle.c:1220-1223);**summon 已做**(buildSummonGodSequence);**equip-battle action sdlpal 任何 build 不存在**(battle.h:49-60 enum 无该项);**trance 变身 = N/A**(玩家法术表无 magicNumber=47,数据不可达,见 D17)。注:0x6B BlowAway 已写 iBlow 状态(opcode), 但**吹飞位移视觉**待 D17 |
| D3 | 物理伤害公式 | ✅ claimed | ✅ partial | fight.c:131-289 三公式 + 3636-3748 perform | core/battle/formulas.ts + actions/attack.ts | formulas.test.ts。**B6(2026-05-31)收口玩家物理攻击全套真值**:**单体**(fight.c:3636-3663)base + RandomLong(1,2) jitter → crit(RandomLong(0,5)==0‖bravery ×3)→ 李逍遥 role0 RandomLong(0,11)==0 ×2 → ×RandomFloat(1,1.125) → max(1);**群攻**(fight.c:3681-3748)crit 整轮一摇 + 命中序 {2,1,0,4,3} + division 逐敌减半(无 jitter/float);**DualAttack 双击**(fight.c:3628/3681 t-loop)装备授(仙女剑等)→ 整段做两次。actions.test +11 例(rng rangeFloat / scriptedRng / forceFloat 控制)。残:**enemy→player** 的 str+RandomLong(0,2)/+RandomLong(0,1)/fAutoDefend evade(归 D27残/B2);crit 视觉(criticalSound/闪)归 D17/M6。**P0#1 修(2026-06-02 第三方审计核源)**:玩家物攻 str 此前误加 `(level+6)*6`(M3 把敌方公式套玩家)→ 已删,改 `str=role.attackStrength`(=PAL_GetPlayerAttackStrength,global.c:1757-1764 base+装备无 level;role 已投影含装备故不双计)。敌方分支 (level+6)*6 是真值不动 |
| D4 | 法术伤害公式 | ✅ claimed | ✅ partial | fight.c:174 `PAL_CalcMagicDamage` | core/battle/formulas.ts calcMagicDamage | formulas.test.ts;5 元素 + 抗 + fieldEffect |
| D5 | 玩家 dex (haste*3 + 999) | ✅ claimed | ✅ partial | fight.c:336 `PAL_GetPlayerActualDexterity` + 1849 `PAL_GetPlayerDexterity` | core/battle/formulas.ts + battle-system.ts | formulas.test.ts。**P0#2 修(2026-06-02 审计核源)**:玩家行动队列 base dex 此前误加 `(level+6)*4`(M3 套敌方公式,连乘数都错:敌方是 *3)→ 已删,改 `baseDex=role.dexterity`(=PAL_GetPlayerDexterity base+装备无 level)。haste×3/濒死÷2 各自独立不动 |
| D6 | 敌人 dex ((level+6)*3+dex) | ✅ claimed | ✅ partial | fight.c:289 `PAL_GetEnemyDexterity` | core/battle/formulas.ts | formulas.test.ts;SHORT signed cast |
| D7 | ActionQueue / turn order | ✅ claimed | ✅ partial | fight.c:1023 `PAL_BattlePlayerCheckReady` + 1451-1585 队列填充 | core/battle/turn-queue.ts + battle-system.ts | turn-queue.test.ts;敌 dualMove 第二动作已传入 queue build。**P0#2 修(2026-06-02)**:玩家 base dex 去 level 项(见 D5)→ 出手顺序回归真值(此前玩家 level 越高越快=失真);加 level-independence 不变量测 |
| D8 | 玩家 status | ✅ claimed | ✅ partial | fight.c:1398-1404/1505-1527/1632-1638/1731-1747 + 3760-3853 | core/battle/status.ts + battle-system.ts + actions/attack-mate.ts | **B1(2026-05-31)收口**:① status 统一计数器模型(battle-state.ts BattleStatus 全 number,boolean→number,对齐 rgPlayerStatus[kStatusAll])② 回合末**全 9 种** status 逐回合 -1(fight.c:1632-1638,修 boolean 类不衰减)③ selectAction 失能(睡眠/麻痹/混乱)队员 autoFillIncapacitatedActions 自动填 + 跳菜单 + dex=0(fight.c:1398-1404/1505-1527)④ perform 睡眠/麻痹→Pass、混乱→濒死?Pass:AttackMate(fight.c:1731-1747)⑤ AttackMate 随机活友军物理攻击 + Protect 减半(fight.c:3760-3853)。commit 970ff88/3bb440f。**状态可视化(2026-05-31 真机)**:⑥ 信息框状态文字 乱/定/眠/封(uibattle.c:240-255,commit 75b4196)⑦ 玩家 sleep/濒死→帧1 濒死姿(PAL_BattleUpdateFighters,commit 17b7a2b)⑧ 混乱 ±1px 抖动特效(敌 X / 玩家 Y,PAL_BattleMakeScene battle.c:114-121/187-196,commit 03be7a7)⑨ 战斗状态查看屏接通(复用 player-status 菜单,commit eaf66e0)。status/attack-mate/battle-system/draw-battle-sprites test。**(2026-06-02 核验:silence 阻施法菜单灰显已做**,isActionValid case1 `silence===0` battle-system.ts:671)。**confused 走入精灵动画已做(2026-06-02 D8)**:buildAttackMateTimeline(fight.c:3791-3858:windup frame8/0×2→走向 target+(30,12) frame8→frame9→友军击退 pos-(12,6)+闪白 iColorShift6→复位)+ performAttackMate 接 startBattleAnim。**顺修 P0 公式 bug**:attack-mate str/def 此前误加 (level+6)*K(与 attack.ts P0#1/#3 同根,漏修)→ 已删,用 PAL_GetPlayerAttackStrength/Defense base(无 level)。残:武器音(M6)。视觉真机验|
| D9 | 敌人 AI 选 target | ✅ claimed | ✅ unit | fight.c:4519-4548 `PAL_BattleEnemySelectTargetIndex` | core/battle/enemy-ai.ts | **B2 c10 收口**:decideEnemyAction 目标选择 = `rangeInclusive(0,party.length-1) + while(HP==0) 重摇`,精确对齐 fight.c:4540-4545 `RandomLong(0,wMaxPartyMemberIndex)+while(rgwHP==0)`。**坐实 sdlpal 无 target 偏好**(纯均匀随机,原"低血/前排偏好"假设是错的,不实现);Bug-1 死循环(4500-4517)ts 预过滤已规避。enemy-ai.test.ts 13 用例(物理/魔法门/confused 打友敌/reject 重摇跳死者/同 seed 确定性) |
| D10 | 敌人 AI 脚本 wScriptOnReady / wScriptOnTurnStart | ✅ claimed | ✅ | fight.c:4551 `PAL_BattleEnemyPerformAction` + 1184-1191 turnStart | core/battle/battle-system.ts tickPerformAction + battle-opcodes.ts + event-system.ts runScript | commit 4b85636:scriptOnReady runScript(runtimeMode='battle')+ battle opcode 已接。**74334e3:scriptOnTurnStart 每轮起手对全体活敌跑一次(fight.c:1184-1191 fTurnStart gate,turnStartDoneForTurn guard)→ boss 嘲讽对话入队(见 D25)**。**B2 完成**:0x67 已真驱动 decideEnemyAction(c1);scriptOnBattleEnd 战后 resume(c6,battle.c:1334-1337 仅胜利、裸调不回写);**c7 真 show-once / re-arm —— runScript 返回 wNextScriptEntry,turnStart/ready 回写 wScriptOnTurnStart/Ready(fight.c:1186/1226/1689/1719):0x00→起始 entry 每轮重显(enemyId 23/25)/ 0x01→该行+1 show-once / 0x02→resetTo re-arm**;0x90 sdlpal 战斗内不回读 rgObject(非自禁,真 show-once 走返回值)/ 0x79 经 explore handler fallthrough 已生效 |
| D11 | 战斗胜利 BattleWon + 升级 | ✅ claimed | ✅ unit | battle.c:991/1088-1120/1300-1321 `PAL_BattleWon` + global.c:2347 `PAL_PlayerLevelUp` | core/battle/battle-system.ts finalizeBattle + battleWonLevelUp | exp/cash 真写 gs.Exp.rgPrimaryExp / dwCash。**9c74488:战斗胜利升级全套** — exp 阈值循环(rgLevelUpExp)+ stat 成长(maxHP+=10+R(0,7) 等 + STAT cap 999)+ HP/MP 回满 + 学新法术(level-up-magic[j][role] level<=新等级 → AddMagic)。落在边界同步统一源 gs.PlayerRolesRuntime,stat 用 state.rng(确定性)。battle-levelup 9 + 集成 1 例。残:升级**视觉 box**(battle.c:1124-1160,8 属性 + 学法术名)present follow-up。**隐藏属性经验 wCount 子系统已实现(2026-06-02 审计 D28/E04,4 commit)**:① ExpEntry 加 wCount + clearHiddenExpCounts 战前清(battle.c:1565-1586)② applyHiddenExpGrowth 分配公式(CHECK_HIDDEN_EXP battle.c:1238-1262:`trunc(exp*wCount/total)*2+wExp` 逐级扣阈值 +RandomLong(1,2),写 rt base 不双计装备)③ 4 累积点接 performBattleAction(攻击 AttackExp+1/HealthExp+R(2,3)、防御 DefenseExp+2、逃跑失败 FleeExp+2、施法 MagicExp+R(2,3)/MagicPowerExp+1,fight.c:3756/4116/4170/4328;coop 回合天然不累积)④ 结算屏 hidden-exp-up box(像素坐标待视觉确认)。Dexterity 池 sdlpal 无累积点(身法不靠隐藏经验)忠实保留恒 0。**hidden-exp-up 涨点数字 x 已修(2026-06-02 D11)**:hiddenExpUpNumberX(maxNameWidth,maxPropertyWidth)= `183+(maxName+maxProp-3)*8`(sdlpal battle.c:1270,全局 max 非单行宽 → 仙剑 191,此前误用单行 ≈206);maxName/maxProp 从 6 角色名 + 8 状态标签 wordWidthCols 取全局最大。主升级屏坐标已核 1:1。残:无(视觉真机验)|
| D12 | 战斗逃跑 PlayerEscape | ✅ claimed | ✅ regress | battle.c:1438 `PAL_BattlePlayerEscape` + fight.c:4119-4148 | core/battle/actions/flee.ts + battle-system.ts | **公式已修(W1 commit 58f5507,2026-06-01)**:flee.ts `str = getPlayerFleeRate(gs,roleId)` = PAL_GetPlayerFleeRate(global.c:1868-1897,base+装备),装备逃跑加成已计(旧 raw role.fleeRate 描述已过期)。BOSS 不许逃(flee.ts:32 对齐 fight.c:4143)。**全队逃**(commitFleeAllPlayers,fFlee fight.c:1773-1799)+ **逃跑动画**(tickBattleFleeAnim,16 步右下滑 + 移出屏,battle.c:1438-1527;f451cb7/5b44fed)。**E04:逃跑失败累积 rgFleeExp.wCount+=2**(fight.c:4170)。残:音效45(M6)/ 逃跑位移与 sdlpal fan 版微差(有意选择)|
| D13 | 敌人主动逃 EnemyEscape | ✅ claimed | ✅ unit | battle.c:1399-1434 `PAL_BattleEnemyEscape` | core/battle/battle-opcodes.ts(0x69)+ battle-system.ts tickBattleEnemyEscapeAnim | **W5 飞出屏动画已补(2026-06-02)**:0x69 设 enemyEscapeAnim;tickBattleEnemyEscapeAnim 每 tick 全活敌往**左**挪(x-=20≈sdlpal 5px/10ms 折算 40ms tick,y 不变),全过 x<=-160 出屏 → phase='fleed'(Terminated 无奖励,**不**改 health 避免误给 exp)。**纠 plan 错**(plan 写 right-down,实读 battle.c:1413 是 x-5 左移)。残:精灵宽度精确出屏判定用近似阈值 |
| D14 | 装备 stat 加成 UpdateEquipments | ✅ claimed | ✅ regress | global.c:1333 `PAL_UpdateEquipments` + 1371 RemoveEquipmentEffect + 2173 SetPlayerStatus | core/equip-effect.ts + game-state.ts(rgPlayerStatus)+ battle-state.ts(seed) | **B6(2026-05-31)收口 scriptOnEquip 全 opcode + 卸装副作用**:① 0x2D(script.c:1367 PAL_SetPlayerStatus)→ 写持久 `gs.rgPlayerStatus`(仙女剑等 5 把 Hand 武器授 DualAttack=32760,good/bad/puppet 规则 1:1 global.c:2173)② 0x29(script.c:1257)→ addPoisonForPlayer(寿葫芦 Wear 授 level-99 正面"毒" 563=+20HP/564=+20MP 每回合)③ 卸 Hand → reset DualAttack(global.c:1411)④ 卸 Wear → 清 level≥99 毒(global.c:1413-1454)⑤ **持久桥**:新 gs.rgPlayerStatus[6][9],createBattleState seed 进 player.status → 装备授 DualAttack 真进战斗(攻击两次,串 D3)。五毒珠 resist=100 经同 0x29 gate 自然百毒不侵。equip-effect.test +8 / battle-state +2 例 + 真实数据 e2e 验(仙女剑/寿葫芦)。全装备审计坐实特殊效果无遗漏 |
| D15 | poison 系统 rgPoisonStatus[16][6] | ✅ 待真机验 | ✅ unit | global.c:1459-1735 5 fn + fight.c:5139/1657-1697 | core/event-system.ts + battle-system tickPostAction + attack.ts + battle-opcodes + draw-battle-ui | 6792dd8 大世界 add/cure;**2026-05-31 战斗全链**:0x29 抗性 RandomLong(1,100)>poisonResistance + 存真 wPlayerScript + 去重(a6ecf64)/ 每回合玩家毒 tick 跑 wPlayerScript 扣血(a6ecf64)/ cure 按真 level(a6ecf64)/ 0x2A cure 敌毒 + 0x61 查毒修复(d91e9a8)/ **敌普攻 attackEquivItem 中毒**(3a0f90f,fight.c:5139)/ 中毒头像染色(1de0444)。施加全路径:投掷/技能双向/敌普攻。真毒 12(551-562 基础4+高级8 数据驱动)。**2026-06-02 自推进修复**:毒 tick + 施毒此前丢弃 runScript 返回值 → 自推进毒链(0x0001 advance / 递增伤害 / 蛊孵化)永卡入口。修:tickPostAction 回写 `wPoisonScript/scriptEntry = runScript(...)`(fight.c:1624/1647)+ 0x28 施毒跑一次入口(script.c:1213)。详 [[L2]]|
| D16 | 协力法术 CooperativeMagic | ✅ logic | ⬜ anim | fight.c:3856-4043 / global.c:2013 | core/battle/actions/coop-magic.ts | **执行收口**:performCoopMagic — healthy contributors / **HP 代价**(非 MP,costMP)/ str=Σ(atk+mag)/4 / applyMagicDamage(minDamage=1)。**装备 override**(佛珠/圣灵珠改合击)经 rgwCooperativeMagic 末非 0 槽 override 投影进 role.cooperativeMagic(equip-effect + projectRuntimeToBattleRoles)。**聚拢动画已实现(2026-06-02 核验订正)**:anim-timeline.ts:701 buildCoopMagicTimeline(7 阶段 port fight.c:3856-4107),coop-magic.ts 接入 → 旧"⬜ anim / 残:聚拢动画"过时。6 单测 |
| D17 | **战斗动画/演出**(攻击/法术/受击/死亡/敌 idle/伤害数字) | ✅ claimed | ✅ partial | fight.c `PAL_BattleShowPlayer{Off,Def,Summon}MagicAnim`/`PreMagicAnim`/`ShowPostMagicAnim` + `PAL_BattleFadeScene`(battle.c:608) + idle 帧 | core/battle/anim-timeline.ts + battle-anim-driver.ts + battle-positions.ts + present/battle/* | **2026-05-30 时间线架构全套补齐**:**D17a**(d42a58f)per-fighter render state(pos/posOriginal/currentFrame/iColorShift,battle.h 25fps)+ `state.battleAnim` 时间线驱动 tickPerformAction(逐 BattleAnimFrame ~40ms 推进)+ 物理攻/受击动画。**D17b**(2873312)伤害数字:BattleCtx 透 bus + 全 HP-mutate opcode emit `showDamageNum` + 真值坐标(精灵底锚 offset)/ 颜色(blue 损 / yellow 回 HP / cyan 回 MP)/ 11 帧寿命(drawNumber UI sprite)。**D17c**(413f9d3)敌人 idle 帧闭式轮播(computeIdleFrameIndex)。**法术动画**:9f412b7 攻击魔法链 PreMagic→OffMagic→PostMagic(FIRE.MKF,4 落点)/ a199e16 DefMagic 治疗辉光 + EnemyMagic 敌方攻击魔法镜像。**死亡淡出**:4b56296 + 9669a47 PAL_BattleFadeScene 逐像素 rgIndex 抖动(72×16ms),修"先消失再淡出"。残:iBlow 吹飞位移 / wWave 屏波 / keepEffect 烙背景 / 音频(M6)⬜。**Summon 召唤神演出已做(2026-06-01 审计订正)**:anim-timeline.ts:24 `buildSummonGodSequence`(port fight.c:3072-3187 — 主角隐去 + 召唤神精灵 F.MKF chunk `wSummonEffect+10` 淡入逐帧 + 72 步 dither crossfade + bgColorShift)+ magic.ts:303 dispatch(`magicType==='summon'`→buildSummonGodSequence,伤害 inline 全体结算)+ 召唤神精灵 chunk 已提取(commit 94cc1e0)。**此前"Summon 完全没做/F.MKF 未提取"备注已过时**。残:Trance 变身 = **N/A**(2026-06-02 核验:PAL_CLASSIC 玩家法术表无 magicNumber=47 对象 —— spells.json/level-up-magic.json 均 0 命中,唯一引用是 object-magics id295 物品;fight.c:4226-4244 变身块代码存在但数据不可达)。实引擎 chrome-devtools 数据级验证多轮 |
| D18 | 战斗 UI + **选择动作菜单**(InfoBox + 主菜单/二级/目标光标) | ⚠️ partial | ✅ partial | uibattle.c 12 函数 + `PAL_BattleUIUpdate` kBattleMenuMain | present/battle/draw-battle-ui.ts(渲染)+ battle-system.ts tickSelectAction `handleMainMenuInput`/`handleMagicMenuInput`/`handleItemMenuInput`/`handleTargetSelectInput`(输入) | **战斗菜单已做**:主菜单 5 项(攻击/法术/物品/防御/逃跑,`>` 高亮)+ 法术/物品二级菜单 + 目标 ▽ 光标 + HP/MP + 队员状态栏。输入经 mode.ts:64 `tickBattle` 真喂、可导航 Up/Down/Confirm/Cancel(**非 stub**)。draw-battle-ui.test.ts 11 + battle-system.test.ts 菜单输入序列。已补(2026-05-30):① 法术/物品二级菜单**滚动窗口**(f889cf1,全法术可选)② **AoE 法术/攻击跳过选目标**(magic.type AttackAll/Whole/Field/Party/Summon + attackAll 武器 → 直接全体,对齐 FIGHT_DetectMagicTargetChange)③ 投掷物 throwable→throw-item 路由。**友方目标选择已做**(07d51e2:targetSide 域按 magic.flags.usableToEnemy / item kItemFlagApplyToAll 分敌/友方,治疗法术 / 治疗物品可选队友 + 修 perform 目标域硬编码 → "对队员" opcode 可达)。**目标光标真值修(2026-05-31 真机 + 27-agent workflow 核对,commit 2c15596)**:敌方目标**无箭头**,改选中敌人精灵 ColorShift 7 闪烁高亮(uibattle.c:1495-1510);补**当前行动队员**头顶箭头(CURRENTPLAYER 68/69,DX-8/DY-74,uibattle.c:994-1007)。颜色全项经核对对齐无 bug。残:自动战斗 / 友方死目标重选(**R 重复上次动作已做**,2026-06-02 核验,见 D2)|
| D19 | 战斗背景 wave / cycle / fade | ⚠️ partial | ✅ partial | battle.c:34 `PAL_BattleDrawBackground` + 609 BattleFadeScene | present/battle/draw-battle-bg.ts + draw-battle-sprites.ts(死敌 fade) | 背景静态全屏 blit;**BattleFadeScene 已用于敌人死亡淡出**(D17/D20,逐像素 rgIndex 抖动)。**W4 战斗演出视觉(2026-06-02,3 commit)**:① wWave 屏波(magic 动画帧带 screenWave→applyScreenWave 扭曲场景,fight.c:2667/2895)② iBlow 吹飞(player off-magic 逐帧吹全体活敌 (blow,blow/2) 末复位,fight.c:2681-2694;gated iBlow!=0)③ keepEffect 烙背景(末帧 0xFFFF&&wave<9→overlays 入 persistentBgBlits 持久画 bg 上,fight.c:2757-2762)。**EnemyMagic 演出对齐(2026-06-02)**:敌方魔法 wWave/keepEffect 早已做,**iBlow 抖队员补齐**(buildEnemyMagicTimeline 镜像 OffMagic,吹全体队员 (blow,blow/2) 末复位,fight.c:2901-2909;magic.ts 注入 iBlow/blowTargets=全队/rng)。战斗**入场 fade-in 已做**(introFade,W5)。残:palette cycle = **N/A**(2026-06-02 核验:PAL_CLASSIC 战斗主循环 battle.c:769-798 无 palette cycle;BATTLEFIELD struct global.h:377-380 无 cycle 字段);Trance 变身 = **N/A**(同 D17 数据不可达)|
| D20 | 死敌 colorShift / 中毒紫色 | ⚠️ partial | ✅ partial | battle.c:505 `PAL_BattleDrawAllSpritesWithColorShift` + 608 BattleFadeScene | present/battle/draw-battle-sprites.ts blitFrameDeathFade + blitFrame(iColorShift) | **死敌渐隐已做**(4b56296+9669a47,deathFadeStep 0..72 逐像素 rgIndex={0,3,1,5,2,4} 抖动 + RG_INDEX_INV)+ **iColorShift 受击变白 blit**(palcommon.c:398-411 低 nibble +shift)。**中毒/死亡头像染色已做**(1de0444,uibattle.c:114-162:PAL_PlayerInfoBox 最高 level≤3 毒 wColor mono / 死亡 mono0,computePlayerFaceColor)。残:无 —— **战斗精灵本体中毒色 shift = N/A**(2026-06-02 核验:sdlpal iColorShift 只走攻击/法术动画,无任何 call-site 把毒色写进战斗精灵体;毒色仅头像 infobox,已做 1de0444);**Trance colorShift cycle = N/A**(同 D17 数据不可达)|
| D21 | 战斗结束 status / 毒 / Extra 清 | ✅ claimed | ✅ unit | battle.c:1822-1830 + global.c:2311 `PAL_ClearAllPlayerStatus` | core/battle/battle-system.ts finalizeBattleCleanup | **B1(2026-05-31)**:commit 42eda6b。finalizeBattleCleanup 无条件(won/lost/fleed/forced)每队员 curePlayerPoisonByLevel(3)(清持久 rgPoisonStatus,毒等级上限 3=全清)+ removeEquipmentEffect(Extra=6)。ClearAllPlayerStatus:ts status battle-local 随 battleState 丢弃→自动满足。battle-system.test。残:0x30 临时 buff 直接 mutate role(非 Extra slot)→ 本清不反转,D23/0x30 待 B6/D14 改 0x30 写 Extra |
| D22 | 偷盗 StealFromEnemy | ⚠️ 待真机验 | ✅ unit | fight.c:5193-5298 `PAL_BattleStealFromEnemy` 全段 + 含 Bug-2 | battle-opcodes OP_STEAL_FROM_ENEMY + anim-timeline buildStealTimeline + battle-system tickBattleDialog 守卫 | **逻辑**(2d6f98d)+ **偷窃动画**(buildStealTimeline)+ **居中框提示(2026-05-31 二修)**:偷取成功"获得 X"改推 `battleDialogQueue` style='narration'(=kDialogCenterWindow 居中单行阴影框 drawNarrationDialog,跟**大世界"获得XX"同一 UI**),非 banner —— CLASSIC 真值 fight.c:5267-5296 `PAL_StartDialog(kDialogCenterWindow)+PAL_ShowDialogText`,banner 那条在 `#ifndef PAL_CLASSIC`(text.c:1671)。`@` toggle 红(text.c:1504);WORD34 获得/WORD10 文钱。**排序**:tickBattleDialog 加 `!battleAnim` 守卫 → 结果框在偷窃动画播完后才显示。待 user 真机验 |
| D23 | 战斗 opcode 子集(scripted enemy AI) | ✅ claimed | ✅ unit | script.c / fight.c 全 E 类 | core/battle/battle-opcodes.ts dispatchBattleOpcode | **2026-05-30 全 E 类收口**(见 opcode-status.md):31 battle-context case 全实现 + explore 0x34/0x38 + audio 0x45/0x77/0xA3。本轮补 0x30/0x31/0x33/0x3A/0x5C/0x5F/0x6B/0x89/0x8A/0x92/0x6A/0x9C/0x9F + 修 0x64 maxHealth。battle-opcodes.test.ts 81 用例。残(文档化): 0x92 present no-op(0x61/0x69/0x30/**0x31 均已接** — 0x31 战斗精灵替换 spriteNumOverride 2026-06-02 commit 5b1962f)。逐条 → opcode-status.md |
| D24 | 战斗隐身 0x5C iHidingTime | ⚠️ partial | ✅ unit | script.c:1907-1911 `g_Battle.iHidingTime = -op0` | core/battle/battle-opcodes.ts OP_HIDE_PARTY + battle-state.ts | commit 444d307:BattleState.iHidingTime 字段 + 0x5C 写入(state.iHidingTime=-op0)真做。**隐身战斗效果已做(2026-06-02 核验订正)**:sdlpal 真值是 iHidingTime>0 时敌方**整轮 goto end**(fight.c:1716),**非**原注"敌不可选队员为目标"(误述);battle-system.ts:1508-1509 整轮跳过 turnStart 脚本 + activate/decrement(port fight.c:1670-1672)。原注已订正 |
| D25 | 战斗内 magic scriptOnSuccess 治疗/复活生效 | ✅ claimed | ✅ unit | fight.c:4196-4265 PAL_BattleCommitAction(scriptOnUse→scriptOnSuccess)+ global.c:1254 PAL_IncreaseHPMP + script.c:867-950/1052-1102 | core/battle/actions/magic.ts + battle-opcodes.ts | commit ab42ea5:performMagic 跑完 scriptOnUse 后按 g_fScriptSuccess gate 跑 **scriptOnSuccess**(原只跑 scriptOnUse → 治疗法术选了队友/放了动画但 HP 不涨)。新增战斗 heal opcode **0x1B/0x1C/0x1D**(HP/MP delta,仅活人 + clamp,写 ctx.playerRoles = sdlpal gpGlobals->g.PlayerRoles 战内外同一份 HP 真源)+ **0x22**(复活 hp=maxHP*op1/10 + 清状态/毒)。伤害数字:HP yellow / MP 仅增 cyan(fight.c:704-709)。顺带 sentinel 攻击魔法(baseDamage=-999)的 scriptOnSuccess 特殊伤害也生效。magic-inline-damage +4 / battle-opcodes +24 例。残:scriptOnSuccess inline 等键见 D26(**0x90/0x79 战斗 gate 已做**,2026-06-02 核验:event-system 0x79@3885 / 0x90@4002 经 applyRawOpcode fallthrough 在战斗脚本生效)|
| D26 | 战斗内对话(scriptOnReady / scriptOnTurnStart 0xFFFF showDialog) | ✅ claimed | ✅ partial | text.c:1660-1772 PAL_ShowDialogText(CLASSIC,#ifndef PAL_CLASSIC 战斗飘字编译掉)+ 1701 DialogWaitForKeyWithMaximumSeconds(1.4) | core/battle/battle-system.ts tickBattleDialog + event-system.ts(runScript battle showDialog 入队)+ present/battle/present-battle.ts | commit 74334e3:boss 嘲讽对话(蜘蛛精/拜月/灵儿/林月如等 30 敌脚本)。原 ts 只 emit 不渲染的 showBattleMessage stub。**忠实 CLASSIC:battle dialog 走普通 dialog box(复用大世界 gs.dialogBox 渲染),覆于战斗场景**。runScript 同步无法跨 tick 阻塞 → showDialog 入 state.battleDialogQueue,tickBattleDialog(phase-agnostic hold)逐 tick 喂进 gs.dialogBox(打字 100ms cadence / 翻页 / 等键 / narration 1.4s)+ 暂停战斗。触发见 D10(turnStart 行动前 / scriptOnReady 出场)。battle-dialog 9 + event-system 3 + 集成 2 例。残:scriptOnBattleEnd 挂战后 resume / collect-then-replay 丢 dialog↔非 dialog 间 inline 等键(**0x90 show-once / 0x79 队伍条件 已实现**,2026-06-02 核验:event-system 0x90@4002 / 0x79@3885,经 applyRawOpcode fallthrough 在战斗脚本生效)|
| D27 | 敌方攻击魔法伤害结算(enemy→player) | ✅ claimed | ✅ unit | fight.c:4772-4853 PAL_BattleEnemyPerformAction 魔法分支 + 174 PAL_CalcMagicDamage | core/battle/magic-damage.ts applyEnemyMagicDamage + actions/magic.ts E2 块 | commit 24653fb:敌方攻击魔法原**只播动画不结算伤害**(纯演出,E1 inline `!casterIsEnemy` gated)→ 补齐。magStr=enemy.magicStrength+(level+6)*6;PAL_CalcMagicDamage 用玩家 def + 抗性(`100+min(100,mod)`,global.c:1969 上限)**resistMult=20**(player→enemy 是 1);除因子 `((defending?2:1)*(protect?2:1)) + (autoDefend?1:0)`(autoDefend=活+非眠/痹/乱时 RandomLong(0,2)==0);clamp dmg>hp→hp(不钳最小 1)。gate type-agnostic(只 baseDamage>0,summon 类也打)+ target type==normal?单体:全体。magic-damage +10 / actions +2 例。残:0x67 真驱动 / 敌方目标偏好(D9)。**P0#3 修(2026-06-02 审计核源)**:玩家 def 此前误加 `(level+6)*4`(M3 套敌方公式)→ 已删,改 `def=role.defense`(=PAL_GetPlayerDefense,global.c:1800-1828 base+装备无 level;role 已投影含装备故不双计;装备抗性 D27 早已核实在投影内)。敌方被打 def 的 (level+6)*4 是真值不动 |

## E. 脚本 / Cutscene(opcode interpreter)

> **逐 opcode 实现状态以 [docs/opcode-status.md](opcode-status.md) 为单一真值源**(163 opcode 全集,2026-05-30:控制流 0x00-0x0A + A/B/C/S 类 + D 视觉类 全 ✅,剩 26 战斗 E 类 + 3 音频 D 类待战斗系统/M6)。
> 本章只列**框架 / 架构级**条目,不再逐 opcode 平铺(避免与 opcode-status.md 两表漂移)。
> 特效栈(fade / wave / FBP / RNG)→ 见 **G 章**;对话打字引擎 → 见 **C13**;follower → 见 **B11**。

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| E1 | opcode interpreter 框架 | ✅ claimed | ✅ partial | script.c:587 `PAL_InterpretInstruction` | core/event-system.ts tickEventSystem + applyRawOpcode | event-system.test.ts;先按 cmd.op 解析分流,'raw' 再进 OP_ 具名大 switch |
| E2 | opcode 总体覆盖 | ✅ claimed | ✅ partial | script.c 0x00-0xA6 全集(减不存在 0x32/0x48/0x72/0x9D) | core/event-system.ts(126 个 OP_ 常量)+ battle-opcodes.ts | **126 OP_ 具名常量 / 约 134-of-163 opcode 有实现(含 stub)**(2026-06-01 审计:122→126);剩 ~26 战斗 E 类 + 3 音频 D 类未做。逐条状态 → opcode-status.md |
| E3 | RunAutoScript NPC 自动 | ⚠️ partial | ✅ partial | script.c:3482-3515 `PAL_RunAutoScript` | core/event-system.ts:962 tickAutoScripts | 0x00 park / 0x01 advance / 0x02 reset(idleFrames)/ 0x03 goto(不消耗帧同帧续跑)/ call / wait 全 port;1 op/tick 对齐 sdlpal 真值。commit 2d5a8c5 / eaaa1d5 / 4701d34。event-system.test.ts 有断言(2026-06-01 审计:测试列 ⬜→✅ partial)。残少数 wScriptOnAnimate 态 |
| E4 | 唯一全局脚本数组 / 行索引架构 | ✅ claimed | ✅ partial | script.c 单一 lprgScriptEntry 全局寻址 | core/event-system.ts:607 _globalCommands / resolveScriptLabel | commit 6b58f9e(P2#5 单一全局数组,cursor 只存 globalIp,根治存档膨胀)+ 1f99417(P0 唯一行索引,修 0x19/0x1A/0x9A 同 opcode 两套行为)+ 4701d34(116 处跨 scene 引用兜底) |

## F. 存档 / 读档

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| F1 | 默认新游戏初始化 | ✅ claimed | ✅ unit | global.c:434-467 `PAL_LoadDefaultGame` | shell/bootstrap.ts startNewGameFromPrimary + game-state.ts hydrate/initExpLevelsFromLevels | **W3 逐字段核对完成(2026-06-01)**:绝大多数字段早已对齐(dwCash=0/wNumScene=1/viewport(0,0)/party 空待 onEnter 加主角/rgInventory·rgPoisonStatus·rgPlayerStatus 全零/wChaseRange=1/PAL_UpdateEquipments 已调/PlayerRoles 整表 hydrate)。**唯一真缺口已修**:Exp 全 8 类 `.wLevel` 初始化为 rgwLevel[i](role0=1/1=5/2=3/3=48/4=28/5=40),此前全 0 —— 新增 `initExpLevelsFromLevels`(对 global.c:455-465)新游戏路径调,wExp 保持 0,仅新游戏不碰读档。次要:currentSaveSlot=1 vs sdlpal bCurrentSaveSlot=0(runtime 指针非存档字段,gameplay 无影响,不动)。「真值从 SAVEDGAME slot0 反序列化」是旧误解:sdlpal 新游戏是读 MKF chunk + 字段初始化,非读存档 |
| F2 | 存档到 IndexedDB | ✅ claimed | ✅ regress | global.c:844 `PAL_SaveGame_WIN` | core/save/api.ts saveSlot + menu-driver.ts | C8 真 IO:Save → cross-slot max+1 wSavedTimes(uigame.c:589-597)→ IndexedDB put;deepClone 隔离 |
| F3 | 读档从 IndexedDB | ⚠️ partial | ✅ regress | global.c:689 `PAL_LoadGame_WIN` + 888 `PAL_ReloadInNextTick` | core/save/api.ts loadSlot + shell/bootstrap.ts loadGameFromSlot | C8 读档 IO + scene reload;OpeningMenu/SystemMenu/opcode 0x4E 共享 handler;eecfbc4 修读档卡死。残:rgEventObject sparse → 旧档 NPC sState 可能不齐 |
| F4 | sdlpal `*.RPG` 字节兼容 | N/A | N/A | — | — | D37 决策不做(IndexedDB 存 typed GameState JSON,非二进制 SAVEDGAME) |

## G. 视觉效果

> 调色板 ramp 引擎(G7/G10/G14)与 dither 引擎(G8)正交;modal 全屏渲染器(G12/G13)走 shell suspendRaf(见 M2)。

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| G1 | RLE sprite blit | ✅ claimed | ✅ partial | palcommon.c:36-446 4 个 RLE fn | pal-extract io/rle.ts + present/draw-sprite.ts | rle-decode.test.ts + draw-sprite.test.ts |
| G2 | FBP 整图 blit | ✅ claimed | ⬜ todo | palcommon.c:651 `PAL_FBPBlitToSurface` | pal-extract dump FBP → png | M4 P3 提取层;运行时全屏显示/滚动见 G13 |
| G3 | sprite color shift | ⚠️ partial | ✅ partial | palcommon.c:245 `PAL_RLEBlitWithColorShift` | pal-extract io/rle.ts | rle-decode test;runtime 死敌/状态 colorShift ⬜(见 D20)|
| G4 | tilemap 双层渲染 | ✅ claimed | ✅ partial | map.c 全 6 fn | present/draw-tilemap.ts | draw-tilemap.test.ts |
| G5 | palette 加载 / 切换 | ✅ claimed | ⬜ todo | palette.c:25/93 + 0x8B / 0x53·0x54 | event-system.ts:2077 setPalette + 2765 昼夜 flag | 0x8B `_fetchPalette` 异步注入 + 0x53/0x54 昼夜 flag(commit 8fe20e4)。夜色经 resolveNightColors 在 fade target 生效 |
| G6 | palette cycle 水/火 动画 | N/A | ✅ partial | text.c:1408-1426 PAL_DialogWaitForKey palette shift(唯一真值) | present.ts:564 applyDialogIconPaletteShift | **深读订正(2026-05-30 9-agent 蓝图)**:sdlpal 全源 grep `palette[i]=palette[i+1]` 仅命中 1 处(text.c:1421)= 对话箭头 icon 色槽 0xF9..0xFE 每 100ms 左轮 1 格 —— **已实现接通**(present.ts:564 + bootstrap.ts:285,dialog 等键 phase 生效)。**无任何资源文件携带数据驱动水/火 cycle 段**(decodePalette `cycles=[]` 即 sdlpal 真值,非缺口)。"水波荡漾"是 PAL_ApplyWave 逐扫描线卷动(G11 ✅),非 palette 色表循环。故 G6 无独立开发缺口 |
| G7 | FadeIn / FadeOut 全屏(0x50/0x51) | ✅ claimed | ✅ partial | palette.c:163/176 | core/palette-fade.ts buildFadeOut/In + present.ts:124 stepPaletteFade | commit fec9a11:palette ramp 引擎 time-based + 夜色 target。palette-fade.test.ts |
| G8 | SceneFade 72 帧 dither(0x73/0x9B) | ✅ claimed | ⚠️ partial | video.c:1130 `VIDEO_FadeScreen` | present.ts:467-516 + event-system.ts | 72-step nibble dither(backupPixels 快照);0x9B 复用 fadeState。注:0x93 SceneFade 改走 palette ramp(buildSceneFade)。palette-fade.test.ts 覆盖 ramp 数学,dither e2e ⬜ |
| G9 | ShakeScreen 0x35 | ✅ claimed | ✅ unit | video.c:1030 `VIDEO_ShakeScreen` | core/event-system.ts + present.ts:562 | opcode 派发解析(duration/intensity)+ **present 层已实接**(`if(gs.shakeTime) applyScreenShake`,每帧主渲染路径,2026-06-02 审计订正旧"stub"描述) |
| G10 | FadeToRed 战斗结束(0x4F) | ✅ claimed | ✅ partial | palette.c:595/633-666 | core/palette-fade.ts buildFadeToRed + present.ts:445 | commit fec9a11:逐步收敛 ±8 + skip 文字色 idx 0x4F + fb 像素 0x4F→0x4E 重映射 |
| G11 | ApplyWave 水波(0x71) | ✅ claimed | ✅ partial | scene.c:365-450 `PAL_ApplyWave` | present/screen-wave.ts applyScreenWave + present.ts:166 | commit 8872b54:逐扫描线横向循环卷动 + 32 相位表;只波动地图层。screen-wave.test.ts |
| G12 | RNG.MKF 动画播放(0x36/0x37) | ✅ claimed | ✅ partial | rngplay.c:371-448 `PAL_RNGPlay` | shell/rng-player.ts + event-system OP_SET_RNG/PLAY_RNG | commit 8872b54:0x36 set iCurPlayingRNG(instant)+ 0x37 阻塞 modal 逐帧 PNG 直写 fb + Space 跳过(suspendRaf);全 12 chunk 提取。rng-player.test.ts。开场 trademark DOS 亦复用 |
| G13 | ShowFBP / ScrollFBP runtime(0x76/0xA4/0xA5) | ✅ claimed | ✅ partial | ending.c:48-150 `PAL_ShowFBP` + 152-279 `PAL_ScrollFBP` + g_wCurEffectSprite | shell/fbp-player.ts showFbp/scrollFbp/overlayEffectSprite | commit 5c7aece/046a583/f600c03:0x76 96 步 nibble dither 渐变 + 0xA4 220 步下滑卷入 + 0xA5 MGO effectSprite 叠加。本游戏 in-game 多 0 调用,结局编排 + devpanel 用。fbp-player.test.ts |
| G14 | ColorFade / PaletteFade 昼夜(0x8C/0x80 + 0x53/0x54) | ✅ claimed | ✅ partial | palette.c:432/494 + script.c:1802/1809 fNightPalette | core/palette-fade.ts buildColorFade/buildPaletteFade + resolveNightColors | commit fec9a11/ac8612e/8fe20e4:0x8C 场景↔纯色双向 64 步 + 0x80 昼夜 toggle 32 步 lerp;夜色经 PAL_GetPalette(n,fNight)选(PAT.MKF #0/#5 夜间半,已提取见 K8)。palette-fade.test.ts |

## H. 音频

> runtime 播放全部 ⬜(M6 Web Audio);**资源已提取落地**(见 K6 Musics / K7 SOUNDS),数据≠零进展但播放层待 M6。

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| H1 | BGM(MIDI/MP3/OGG/OPUS) | ⬜ todo | N/A | audio.c + midi*.c + mp3/ogg/opusplay.c | — | opcode 0x43 playMusic 仅写 wNumMusic 字段不播;资源已提取(K6)。M6 Web Audio + SpessaSynth |
| H2 | SFX sound.c | ⬜ todo | N/A | sound.c 14 fn | — | opcode 0x47 playSound 仅 console.debug;363 WAV 已提取(K7)。M6 |
| H3 | CD audio | ⬜ todo | N/A | audio.c CD 相关 | — | 8 TRACKxx.ogg 已提取(K6);opcode 0xA3 未接播。M6 |

## I. 通关 / Ending

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| I1 | Ending 动画 + EndingScreen 全编排 | ✅ claimed | ✅ partial | ending.c:282-393 `PAL_EndingAnimation`(0x96) + 396-512 `PAL_EndingScreen` DOS | shell/ending-player.ts + fbp-player.ts + bootstrap.ts playDosEnding | commit d517919/75344f1/046a583/f600c03/cefb343:0x96 400 帧(背景上滚 + 妖兽 MGO571 + 女孩 MGO572 walk + wScreenWave 水波);DOS fallback 全 beat 编排(RNG 9/10/11 + Fade + ShowFBP + ScrollFBP + ColorFade + EndingAnim + WaitForKey + 演职员表卷动 67→59)。ending-player.test.ts。残:音乐 M6 |
| I2 | Credits | N/A | N/A | script.c:504 `PAL_AdditionalCredits` | — | N/A **仅指 sdlpal 引擎 GNU GPL 版权页**(user 决策跳过)。游戏内演职员表 scroll(ending.c:485-511 FBP 67→59)≠ 引擎页,已并入 I1 编排 |
| I3 | 通关 AVI | ✅ claimed | N/A | uigame.c PAL_EndingScreen AVI 序 | shell/avi-player.ts + bootstrap.ts setQuitHandler | commit 30a4822:opcode 0xA0 quit → WIN95 build 顺序播 4/5/6.mp4 → 回 OpeningMenu;DOS build 结局由前序 opcode/playDosEnding 跑完 → 直接回标题。4/5/6.mp4 已提取 |

## J. 输入

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| J1 | 键盘 8 方向 + 6 键 | ✅ claimed | ✅ partial | input.c:58-90 CODE_MAP + input.c:213 fRepeat | shell/input.ts(KeyboardInputSource) | input.test.ts;物理键映射真值 + e.repeat 过滤。(注:旧表写的 shell/keyboard.ts 不存在,键盘逻辑全在 input.ts) |
| J2 | 鼠标 | ⬜ todo | N/A | input.c:436 `PAL_MouseEventFilter` | — | 无 MouseInputSource。M6 |
| J3 | 手柄 / Joystick | ⬜ todo | N/A | input.c joystick 全组 | — | 无 GamepadInputSource。M6 |
| J4 | 触屏 移动支持 | ⬜ todo | N/A | input.c touch 全组 | — | 无 TouchInputSource。M6 |

## K. 数据提取 (pal-extract)

> **逐 chunk 提取覆盖明细以 [resource-status.md](resource-status.md) 为单一真值源**(14 MKF + 非 MKF 资源全 chunk + byte-level 覆盖率自检)。
> 本章只列提取器框架级条目;新增提取产物只维护 resource-status.md。

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| K1 | pal-extract 提取器框架 | ✅ claimed | ✅ partial | palcommon.c MKF 5 fn + 各 resources parser | pal-extract io/ + resources/ + cli.ts | 14 MKF + M.MSG + WORD.DAT + Musics / SOUNDS / AVI;25 test 文件 / 210 cases |
| K2 | 提取总体覆盖 | ✅ claimed | ✅ partial | — | data/extracted/ | byte-level 复核:全非空 chunk 已落地,零真实数据 gap(逐 chunk 明细见 resource-status.md 覆盖率自检) |
| K3 | 已知残留 | ⚠️ partial | N/A | — | — | runtime 音频播放 wiring(M6,非提取 gap)+ RNG PNG 的 runtime mirror(asset-copy 步骤)+ WORD.DAT 新 55 条无 regress 测 |

## L. 特殊物品 / 剧情系统

> 2026-05-28 user 补提。真值已查清(byte-level 追 items/spells.json + all.json 脚本链):炼丹/蛊虫在 sdlpal **不是独立 C fn / 特殊菜单**,而是**战斗 E 类 opcode chain**。gate = 战斗 collect/transform/throw opcode 未做(见 D23 / opcode-status.md E 类)。

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| L1 | 炼丹系统(紫金葫芦 + 灵葫咒) | ✅ claimed | ✅ partial | script.c 0x34/0x33 + 0x64/0x60 | event-system.ts + battle-opcodes.ts | **opcode 全实现 + 脚本 byte 核验(2026-06-02)**:灵葫咒 scriptOnSuccess=0x64(JumpIfEnemyHPAbove,:214)+0x60(ImmediateKO,:226)+0x33(collectEnemy→wCollectValue,:537);紫金葫芦 scriptOnUse @39713=`0x34[38780]`(TransformCollected,event-system:127,wCollectValue→RandomLong(1,cv) cap9→store[0]物品)。byte-dump 确认仅用已实现 opcode。残:① 物品框 dialog(SPRITENUM_ITEMBOX,present 视觉,现 console.debug)② 真档 e2e 玩法验收(user 实玩)③ 0x34 用 Math.random(大世界惯例,非种子)|
| L2 | 蛊虫 / 炼蛊皿系统 | ✅ claimed | ✅ done | script.c 0x66/0x28 + **1213 施毒跑一次** + fight.c:1647 毒tick回写 + 数据 @40917-40960 | battle-opcodes.ts + event-system.ts + battle-system tickPostAction | **寄生蛊孵化链查实+修复(2026-06-02)**。**重大 byte-truth 订正**(此前误判"无N回合升级"是错的,user 直觉对):食妖虫附(561 @40917)/碧血蚕附(562 @40940)是**自推进毒脚本链** — 入口 `end advance`(0x0001)→ 逐回合 `0x21` 递增吸灵气(1→8)→ 第9回合 `"由食妖虫炼成一只灵蛊"`+giveItem(145灵蛊)/`"由碧血蚕炼成一只赤血蚕"`+giveItem(149赤血蚕)+`0x2a` 移除附身毒。物品说明 @40804 逐字="寄生宿主吸取灵气,九回合后,可炼成灵蛊"。机制原版+sdlpal 都有,**非未实现 bug**。**修了 type-pal 三处偏离**:① 施毒回写 `scriptEntry=runScript(enemyScript)`(script.c:1213 跳入口 terminator,精确九回合);② 毒 tick 回写 `poison.scriptEntry=runScript(...)`(fight.c:1647 自推进,此前丢返回值→永卡入口);③ giveItem 在 battle runtimeMode 真给物品(此前硬 skip)。炼蛊皿 scriptOnUse @39598=`0x20`(RemoveItem 卵)+goto 链。测试:battle-system 孵化链集成 + battle-opcodes apply-run×2。残:真档 e2e + 物品框 dialog 视觉 |
| L? | 御剑 / 打铁 / 双修 / 小游戏 | N/A | N/A | — | — | 查无新独立系统:御剑术(spell 49/65)走普通战斗/移动魔法(0x3F/0x44/0x97 已做);打铁/双修是 dialog 文本 + 给物品 opcode(0x20 已做) |

## M. 运行时架构 / 工具

> 浏览器运行时基础设施 + 架构根因修复 + 开发工具。多数无直接 sdlpal 1:1 对应(SDL 单线程阻塞语义的等价替代)。

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| M1 | 主循环 渲染/逻辑解耦 | ✅ claimed | ⬜ todo | main.c `PAL_GameUpdate` 帧语义(等价) | shell/main-loop.ts | commit 3ebf1cb:逻辑 tick 恒速(explore 100ms / battle 40ms),不被 scene 淡入提速;dither/paletteFade 进行中每 raf present(wall-clock 平滑)。修香兰 cutscene 走入/对话被加速 6× |
| M2 | suspendRaf modal 独占 canvas | ✅ claimed | ⬜ todo | —(浏览器特有,SDL 阻塞等价) | shell/main-loop.ts onPresent + bootstrap suspendRaf gate | commit a01cd73:modal 播放器(AVI/trademark/splash/RNG/FBP/结局)期间主循环 present 跳过,修闪烁。含阻塞 fade/colorFade/WaitForKey 工具(ending-player.ts)供 modal 编排 |
| M3 | scene 转场淡入门控 + 失败兜底解冻 | ✅ claimed | ⬜ todo | scene.c:503-508 `PAL_MakeScene` fNeedToFadeIn | core/event-system.ts:515 tickSceneAutoFadeIn | commit 9293dac/ef70491/9791497/39b5848:onEnter cutscene 黑屏真因=自动淡入门控旧码 explore-only → 对齐 PAL_GameUpdate;scene-load 失败兜底解冻 sceneLoading(架构根因);0x05 redraw 对齐(修仙灵岛靠岸黑屏) |
| M4 | devpanel 开发工具 | N/A | N/A | —(纯调试工具) | shell/dev-panel.ts | import.meta.env.DEV-gated:Videos(开场/结局 mp4 双版)、DOS 版按钮(trademark RNG + splash 卷轴 + 结局全片)、Effects opcode 触发、font/dialog 测试、Save/Load slot、B 键 battle picker、P 键强制三人入队、加道具/清背包 |
| M5 | player-roles 数据模型边界同步 | ✅ claimed | ✅ unit | sdlpal 单一 `gpGlobals->g.PlayerRoles`(战内外同源) | core/game-state.ts projectRuntimeToBattleRoles / writeBackBattleRolesToRuntime + bootstrap + finalizeBattle | commit 99e57d3:修架构裂缝 — 战斗原读写 assets.playerRoles(静态 1 级基线 object)而大世界菜单/经验/升级/heal opcode/存档用 gs.PlayerRolesRuntime(运行时 array),仅新游戏 hydrate 一次后分叉(战斗用 1 级属性 + 伤害不持久化)。补两道边界:startBattle 入口投影 runtime→战斗 roles(战斗吃升级后属性)+ finalizeBattle 回写 HP/MP→runtime(战果持久化 + 存档对齐)。game-state +4 / battle-system +1 例(残血进战斗治满出来 runtime 满血 等往返)。adversarial review PASS。残:装备 Extra 抗性加成(D14)/ 战斗 magic 菜单接 role.magic 真值 |

---

## 测试一览(防回归)

**2026-05-29 菜单/装备强化(123 case,613 → 714 + 2 skip)**

| 测试文件 | 覆盖 | case 数 |
|---|---|---|
| [equip-menu.test.ts](../packages/game/src/core/menu/equip-menu.test.ts) | EquipMenu state machine(C5)+ scriptOnEquip swap chain | 16 |
| [equip-effect.test.ts](../packages/game/src/core/equip-effect.test.ts) | rgEquipmentEffect 写/清 + 6 stat getter + 木剑 swap(D14) | 14 |
| [inventory-menu.test.ts](../packages/game/src/core/menu/inventory-menu.test.ts) | pickItemRowColor 6-case truth table + matchesFilter + grid 8-key clamp(C3) | 26 |
| [save-slot-menu.test.ts](../packages/game/src/core/menu/save-slot-menu.test.ts) | SaveSlotMenu 5 slot + cross-slot max+1 + roundtrip(C8) | 15 |
| [in-game-menu.test.ts](../packages/game/src/core/menu/in-game-menu.test.ts) | InGameMenu + SystemMenu choice / cursor 记忆(C1/C2) | 10 |
| [inventory-action-menu.test.ts](../packages/game/src/core/menu/inventory-action-menu.test.ts) | 1 级 box 子菜单(装备/使用) | 3 |
| [script-desc.test.ts](../packages/game/src/core/menu/script-desc.test.ts) | getScriptDescLines 木剑/玉佛珠真值 + 边界(C3) | 6 |
| [magic-script.test.ts](../packages/game/src/core/menu/magic-script.test.ts) | C7 magic 同步 runner(0x1B/0x1C/0x1D/0x22 + 气疗/还魂咒 chain) | 19 |
| [in-game-magic-menu.test.ts](../packages/game/src/core/menu/in-game-magic-menu.test.ts) | C7 state machine 4 phase + 测试发现 hasOutsideMagic code bug | 21 |

**2026-05-29~30 特效 / 商店 / 开场结局 / follower(新增,case 数见各文件)**

| 测试文件 | 覆盖 |
|---|---|
| [shop-menu.test.ts](../packages/game/src/core/menu/shop-menu.test.ts) | C9 商店买/卖状态机 + 扣金 |
| [follower-render.test.ts](../packages/game/src/present/follower-render.test.ts) | B11 0x98 跟随者 trail/帧/sprite(6 用例) |
| [palette-fade.test.ts](../packages/game/src/core/palette-fade.test.ts) | G7/G10/G14 ramp 数学(FadeIn/Out/ToRed/ColorFade/PaletteFade) |
| [screen-wave.test.ts](../packages/game/src/present/screen-wave.test.ts) | G11 ApplyWave 逐扫描线卷动 |
| [rng-player.test.ts](../packages/game/src/shell/rng-player.test.ts) | G12 RNG.MKF 逐帧播放 |
| [fbp-player.test.ts](../packages/game/src/shell/fbp-player.test.ts) | G13 ShowFBP/ScrollFBP dither |
| [ending-player.test.ts](../packages/game/src/shell/ending-player.test.ts) | I1 EndingAnimation 400 帧 |
| [trademark-fallback.test.ts](../packages/game/src/shell/trademark-fallback.test.ts) | A1 DOS trademark |
| [splash-fallback.test.ts](../packages/game/src/shell/splash-fallback.test.ts) | A2 DOS 卷轴 splash |
| [avi-player.test.ts](../packages/game/src/shell/avi-player.test.ts) | A3/I3 mp4 `<video>` 播放器 |

## sdlpal 自身 bug(audit 过程发现,ts port 时显式 fix)

| # | 描述 | sdlpal 行 |
|---|---|---|
| Bug-1 | `PAL_BattleSelectAutoTarget` 死循环 — 全敌死时无退出 while | fight.c:4500-4517 |
| Bug-2 | `PAL_BattleStealFromEnemy` 无 dead target check — R 重复偷死敌时数值 underflow | fight.c:5193+ |
