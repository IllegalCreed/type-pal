# SDLPal 功能面覆盖审计

更新时间：2026-06-01

## 审计范围

本次审计把 `reference/sdlpal` 作为源头，对照当前 Web 版实现、测试与三份核心状态文档：

- `docs/feature-status.md`
- `docs/opcode-status.md`
- `docs/resource-status.md`

重点不是逐条复核已有状态表是否写对，而是反向从 SDLPal 源码枚举功能面，检查 `feature-status.md` 是否漏了 SDLPal 的重要系统、是否有过期描述、以及当前版本还原度的真实风险点。

当前项目明显以 SDLPal 的 `PAL_CLASSIC` 路径为主要目标；SDLPal 的部分平台层能力，例如 fullscreen、窗口缩放、截图、手柄/触摸、非 classic 配置页，应该在状态表中明确标为“Web 替代 / 暂不纳入”，否则容易被误判为缺漏。

验证命令：

```bash
pnpm --filter @type-pal/game test -- --runInBand
```

结果：80 个测试文件通过，1538 passed，2 skipped。

## 总结判断

`resource-status.md` 和资源抽取链路非常扎实，资源面基本已经接近完整；`opcode-status.md` 的 opcode 覆盖度也很高。真正的问题在于 `feature-status.md` 更像“开发完成记录”，还不是一张从 SDLPal 功能面反推出来的完整还原矩阵。

按可见玩法估算，当前版本已经覆盖了主线可玩所需的大部分骨架：地图、脚本、菜单、物品、法术、战斗流程、存档、RNG/FBP/MKF 资源、结局与大量视觉层都已经存在。但距离“SDLPal 行为级还原”仍有几个核心差距：运行时音频未接入、战斗若干数值公式不完全一致、隐藏属性经验系统缺失、部分战斗视觉与菜单细节仍是简化实现。

粗略分层还原度：

| 层面 | 估计还原度 | 判断 |
| --- | ---: | --- |
| 资源抽取与数据覆盖 | 98-100% | 非空 chunk、RNG、FBP、精灵、文本、音频资源抽取已很完整 |
| Opcode 框架与脚本执行 | 85-95% | opcode 面覆盖很高，但部分 opcode 是状态记录或 present/audio 待接 |
| 地图探索与剧情可玩性 | 80-90% | 地图、事件、碰撞、搜索、追逐、菜单联动已成型，仍需更多真档回放验证 |
| 战斗流程 | 70-85% | 流程完整度高，但隐藏经验、玩家攻击/敏捷公式、部分动画音效是主要风险 |
| UI/菜单 | 75-85% | 主要菜单可用，系统菜单、确认框、硬编码 WORD、音乐/音效开关仍需补齐 |
| 运行时音频 | 0-15% | 资源已抽取，播放器和脚本驱动基本未接 |
| 输入与平台层 | 50-70% | 键盘主路径完成，鼠标、手柄、触摸、SDL 视频配置多为 Web 替代或待办 |

整体如果按“玩家能否通关并看到主要内容”权重看，大约在 80% 上下；如果按 SDLPal 引擎功能面逐项还原，大约在 70-75% 更稳妥。这个比例不是精确指标，更适合用来指导后续优先级。

## SDLPal 功能面与当前映射

| SDLPal 模块 | 主要功能面 | 当前 Web 版状态 |
| --- | --- | --- |
| `main.c` / `game.c` | 初始化、商标、开场、主循环、退出 | 已有启动、资源加载、开场与主循环骨架；音频初始化缺失 |
| `res.c` / `map.c` / `palette.c` / `text.c` | MKF/地图/调色板/文本读取 | 抽取与解析覆盖强，`resource-status.md` 基本准确 |
| `scene.c` | 地图绘制、遮挡瓦片、场景波动、队伍跟随、NPC 行走 | 大部分存在；细节节奏、尾队、个别遮挡/动画仍需真档对照 |
| `script.c` | opcode 解释器、触发脚本、自动脚本、NPC/怪物移动 | opcode 覆盖高；部分行为由文档低估，需同步状态 |
| `play.c` | 地图更新、使用/装备物品、搜索、按键等待 | 主要路径已实现；搜索/物品特殊链路需要更多端到端验证 |
| `uigame.c` | 系统菜单、背包、法术、状态、买卖、装备、确认菜单 | 主菜单可用；系统开关、退出确认、BattleSpeed/配置页边界需明确 |
| `itemmenu.c` / `magicmenu.c` | 物品/法术选择列表 | 已实现主要能力；部分 SDLPal 文本与视觉细节仍简化 |
| `battle.c` / `fight.c` / `uibattle.c` | 战斗加载、行动队列、AI、伤害、逃跑、胜利结算、战斗 UI | 流程很完整，但仍是最大还原风险区 |
| `global.c` | 经验、等级、属性、装备、毒、状态、协同法术、库存 | 大量基础能力已实现；隐藏属性经验缺失是大洞 |
| `ending.c` / `rngplay.c` / `aviplay.c` | 结局、RNG 动画、AVI | RNG/结局已接，AVI 属 SDLPal 平台历史能力，可标 Web 替代 |
| `input.c` / `video.c` / `audio.c` / `sound.c` | 输入、视频、音频、MIDI/SFX | 键盘与画面主路径可用；音频、鼠标/手柄/触摸、平台配置待补或 N/A |

## `feature-status.md` 建议补充的功能点

### 1. 隐藏属性经验系统

建议新增到战斗或成长章节，例如 `D28 隐藏属性经验 / ALLEXPERIENCE`。

SDLPal 有 8 类隐藏经验池：攻击、防御、法术、法力、生命、灵力、逃跑、等级。战斗中不同动作会累积 `wCount`，胜利后按本场获得经验比例分配隐藏经验，并可能提升对应隐藏属性。

当前 TypeScript 的 `ExpEntry` 只有 `wExp` / `wLevel`，没有 `wCount`；`defend.ts` 和 `battle-settlement.ts` 也明确留下“不实现 exp count / hidden exp”的注释。这个功能没有在 `feature-status.md` 里单列，导致 `D11 BattleWon + level-up` 看起来比实际更完整。

建议状态：`⬜/⚠️`。这是战斗数值长期还原度的高优先级缺口。

### 2. 战斗结果路由 / Game Over / 强制败北剧情

建议新增 `D29 战斗结果路由与 Game Over`。

SDLPal 的战斗结果不只是 win/lost/flee 三态，还牵涉：

- 失败后是否 Game Over；
- 特殊剧情战的失败后脚本继续；
- 读档/死亡保持画面；
- `0x4F` 等脚本流程恢复。

当前代码已经有 `gameOverActive`、`deathHoldActive`、`resumePostBattleScript`、`scriptRunHits0x4F` 等实现，这块值得在功能表中独立列出。否则 `D1 StartBattle` 与 `D21 ExitBattle` 会把重要剧情流程埋掉。

建议状态：`✅/⚠️`，取决于真档覆盖测试数量。

### 3. 胜利结算画面与成长展示

建议从 `D11` 中拆出 `D30 战斗胜利结算 UI`。

当前代码已经有经验/金钱、等级提升、习得法术、战后半血半蓝恢复、`scriptOnBattleEnd` 等结算实现；`feature-status.md` 里仍写“level-up 视觉框残留”已经偏旧。但隐藏属性经验没有实现，因此不能标成完全 1:1。

建议状态：`✅/⚠️`，说明“结算 UI 已实现，隐藏属性经验未实现”。

### 4. 系统菜单设置与确认框

建议新增或扩展 `C2`：`系统设置、音乐/音效开关、退出确认`。

SDLPal 的 `SystemMenu` 不只是列表跳转，还包含确认菜单、音乐/音效、战斗速度/配置项等历史路径。当前 Web 版系统菜单的音乐/音效操作仍是 `console.debug`，退出也是直接关闭菜单栈；这点应该明确写进 `feature-status.md`，并和 `H` 音频章节关联。

建议状态：`⚠️`。

### 5. 平台视频与输入能力边界

建议新增 `M` 或 `J/G` 下的“平台层能力边界”。

SDLPal 包含 fullscreen、窗口缩放、截图、鼠标、手柄、触摸、AVI 播放、MIDI/SFX 后端等能力。Web 版不一定要逐项照搬，但需要在状态表中明确：

- 哪些是 Web 浏览器天然替代；
- 哪些是不纳入 classic 目标；
- 哪些是未来待办。

否则功能矩阵会长期无法判断“缺失”还是“有意不做”。

## `feature-status.md` 过期或高估项

### D3 玩家物理攻击公式高估

`feature-status.md` 当前说玩家物理攻击已经按 SDLPal 公式完整接入，但当前 `attack.ts` 玩家分支仍把攻击力算成：

```ts
role.attackStrength + (role.level + 6) * 6
```

这更像 SDLPal 敌方攻击强度公式，不是玩家攻击公式。SDLPal 玩家攻击应走 `PAL_GetPlayerAttackStrength`，也就是基础属性叠装备效果，不应额外加等级项。

建议把 `D3` 从 `✅` 降到 `⚠️`，并把“玩家攻击强度公式去除敌方等级项”列为高优先级修复。

### D5/D7 玩家敏捷公式需要复核

当前行动队列里玩家基础敏捷类似：

```ts
role.dexterity + (role.level + 6) * 4
```

SDLPal 玩家敏捷应通过 `PAL_GetPlayerDexterity` 取得基础属性加装备效果；等级项是敌方派生属性常见形式。若继续对照确认无误，这会影响出手顺序、双动、法术/道具/防御节奏。

建议将 `D5/D7` 标为 `⚠️`，直到玩家敏捷公式与装备效果路径完全对齐。

### D11 未提隐藏属性经验

`D11` 可以保留“胜利、等级、学法术、战后恢复”已完成，但必须加上隐藏属性经验缺口；否则会误导为成长系统完全还原。

### D12 逃跑公式描述偏旧

`feature-status.md` 说逃跑仍用 raw `role.fleeRate`，但当前代码已经通过 `getPlayerFleeRate` 取值，比文档更新。仍需保留一个偏差：主动逃跑动画位移目前有“贴近原版/不同于 SDLPal fan 版”的实现选择。

建议把公式状态更新为已修正，把动画差异单独说明。

### D18 重复/自动战斗描述偏旧

`feature-status.md` 仍提到 Repeat、AutoBattle、强制动作等残留较多，但当前已有 `commitRepeatAction`、`fAutoBattle`、`fAutoAttack`、强制动作提交等路径。建议重新审一遍这一项，删掉已经完成的旧残留，只保留真缺口。

### D24 隐身状态描述偏旧

`feature-status.md` 说 `0x5C` 只存了 `iHidingTime`，AI/目标筛选未接。当前代码已经有隐身启用、递减、敌方行动跳过等逻辑。建议更新为完成或保留“需真档验证”的轻微风险。

### G9 ShakeScreen 描述偏旧

`feature-status.md` 说 ShakeScreen 只在状态层记录，present 未接。当前 present 已调用 screen shake 处理，并有测试。建议改为完成。

### L1/L2 特殊物品状态偏旧

`feature-status.md` 仍把毒龙胆、蛊等特殊物品标为 TODO，并提到 `0x34/0x60/0x64` 等基础 opcode 缺口。当前代码已经实现：

- `0x34 TransformCollected`
- `0x33 CollectEnemy`
- `0x60 EnemyImmediateKO`
- `0x64 JumpIfEnemyHPAbove`
- `0x66 ThrowWeapon`
- `0x28 ApplyPoison`

这些条目不应继续写成“底层缺失”。更准确的状态是：底层 opcode 已补，特殊物品链路需要真档端到端验证，尤其是战斗 UI、物品消耗、掉落/收集、蛊升级与提示文本。

## 仍然合理的缺口

这些项目目前文档判断基本可信，或者虽可细化但方向没错：

- 运行时音频：BGM、RIX/MIDI、SFX、音频 opcode、菜单音效仍是大缺口。
- 鼠标/手柄/触摸：SDLPal 有输入后端，Web 版仍主要是键盘。
- 系统菜单：退出确认、音乐/音效切换、部分 SDLPal 配置路径仍未完整。
- 战斗视觉：battle fade、wave、palette cycle、`iBlow`、`keepEffect`、部分法术/投掷/吸收表现仍需逐项对照。
- 菜单与文本：部分标签仍是硬编码，未完全走 WORD/M.MSG。
- 真档验证：很多 opcode 和菜单动作有单测，但需要更多真实存档、真实剧情点、真实战斗链路的集成回放。

## 建议优先级

### P0：修正文档高误导项

先更新 `feature-status.md`，至少同步这些点：

1. 新增隐藏属性经验系统。
2. 下调 `D3` 玩家物理攻击公式。
3. 复核并下调 `D5/D7` 玩家敏捷公式。
4. 更新 `D12`、`D18`、`D24`、`G9`、`L1/L2` 的过期描述。
5. 单列战斗结果路由、Game Over、胜利结算 UI。

### P1：修核心战斗数值

优先修玩家攻击强度与敏捷公式，因为这会影响全游戏手感、难度和战斗平衡。随后补隐藏属性经验 `wCount` 与战后分配。

### P2：做特殊物品真档验收

毒龙胆、蛊、偷窃、收妖、投掷武器等已经不是“opcode 未实现”的问题，而是需要用真实战斗链路验收：

- UI 能否选中；
- 脚本是否执行；
- 物品是否正确消耗；
- 敌方状态/HP/掉落是否正确变化；
- 文本和音效是否合理。

### P3：补音频与系统菜单

音频是当前还原感最明显的空白。建议从最小可听闭环开始：

1. BGM 播放/停止/切换；
2. SFX 播放；
3. opcode 驱动；
4. 菜单音效；
5. 音乐/音效开关持久化。

### P4：平台能力归档

把 SDLPal 的 fullscreen、scale、screenshot、AVI、joystick、touch、非 classic config page 等归档为：

- 已由浏览器替代；
- 暂不纳入；
- 未来增强。

这样 `feature-status.md` 会从“开发列表”变成真正的还原度矩阵。

---

## 第二轮深审：SDLPal 全功能面逐项对账

本节回应“粒度仍太粗”的问题。上一版按模块给结论，这一版改为按 SDLPal 源码功能面反推功能全集，再逐项找当前 TypeScript 对应实现与还原度。

审计基准：

- 目标分支：`PAL_CLASSIC`。`reference/sdlpal/common.h` 中 `PAL_CLASSIC=1`，所以 ATB/time charging、非 classic battle mode 作为 N/A 或 Web future，不计入核心还原。
- 已读源码主面：`main.c`、`game.c`、`play.c`、`scene.c`、`script.c`、`global.c`、`res.c`、`map.c`、`palcommon.c`、`palette.c`、`text.c`、`ui.c`、`uigame.c`、`itemmenu.c`、`magicmenu.c`、`battle.c`、`fight.c`、`uibattle.c`、`ending.c`、`rngplay.c`、`input.c`、`video.c`、`audio.c`、`sound.c`、`aviplay.c`、`palcfg.c`、`util.c`、`font.c`、`yj1.c`。
- 统计口径：SDLPal public/static function inventory + `script.c` opcode cases + 玩家可感知功能。纯 SDL/OpenGL shader/resampler 工具函数列为平台能力，不强行要求 Web 逐函数复刻。
- 还原度图例：`✅ 高` = 功能与主行为基本对齐；`🟡 中高` = 主路径完成但有视觉/节奏/少量分支差异；`🟠 部分` = 可用但有数值或流程缺口；`❌ 缺失` = 功能未接；`🚫 N/A` = Web 或 PAL_CLASSIC 目标不要求。

### SDLPal 函数功能全集索引

| 源码组 | SDLPal 函数面 | 功能边界 |
|---|---|---|
| 启动生命周期 | `PAL_Init`、`PAL_Shutdown`、`PAL_TrademarkScreen`、`PAL_SplashScreen`、`main`、`PAL_GameMain`、`PAL_StartFrame`、`PAL_GameUpdate` | 初始化、资源装载、商标/标题、主循环、每帧逻辑与退出 |
| 资源与地图 | `PAL_InitResources`、`PAL_FreeResources`、`PAL_SetLoadFlags`、`PAL_LoadResources`、`PAL_GetCurrentMap`、`PAL_LoadMap`、`PAL_MapGetTileBitmap`、`PAL_MapTileIsBlocked`、`PAL_MapGetTileHeight`、`PAL_MapBlitToSurface` | MKF 资源、地图、tileset、阻挡、高度、上下层绘制 |
| 图像基础 | `PAL_RLEBlit*`、`PAL_RLEGetWidth/Height`、`PAL_FBPBlitToSurface`、`PAL_SpriteGetFrame`、`PAL_SpriteGetNumFrames`、`PAL_MKF*`、`YJ1/YJ2_Decompress` | RLE、FBP、sprite frame、MKF chunk、压缩解码 |
| 场景系统 | `PAL_AddSpriteToDraw`、`PAL_CalcCoverTiles`、`PAL_SceneDrawSprites`、`PAL_ApplyWave`、`PAL_MakeScene`、`PAL_CheckObstacle*`、`PAL_UpdatePartyGestures`、`PAL_UpdateParty`、`PAL_NPCWalkOneStep` | 大世界绘制、遮挡、波动、碰撞、队伍跟随、NPC 行走 |
| 大世界交互 | `PAL_GameUseItem`、`PAL_GameEquipItem`、`PAL_GetSearchTriggerRange`、`PAL_Search`、`PAL_WaitForKey*` | 大世界用物/装备、调查 13 格、等待按键 |
| 脚本解释器 | `PAL_RunTriggerScript`、`PAL_RunAutoScript`、`PAL_InterpretInstruction` 内 0x0000-0x00A7 与 0xFFFF | 剧情、NPC 自动脚本、战斗 opcode、对话、特效、跳转 |
| 全局状态 | `PAL_InitGlobals`、`PAL_FreeGlobals`、`PAL_ReadGlobalGameData`、`PAL_LoadDefaultGame`、`PAL_SaveGame*`、`PAL_LoadGame*`、`PAL_ReloadInNextTick` | 全局数据、默认新游戏、存读档、切档重载 |
| 玩家/物品/成长 | `PAL_AddItemToInventory`、`PAL_CompressInventory`、`PAL_GetItemAmount`、`PAL_UpdateEquipments`、`PAL_RemoveEquipmentEffect`、`PAL_AddPoisonForPlayer`、`PAL_CurePoison*`、`PAL_GetPlayer*`、`PAL_AddMagic`、`PAL_RemoveMagic`、`PAL_SetPlayerStatus`、`PAL_PlayerLevelUp` | 背包、装备效果、毒、属性 getter、法术学习、状态、升级 |
| 大世界 UI | `PAL_OpeningMenu`、`PAL_SaveSlotMenu`、`PAL_SelectionMenu`、`PAL_TripleMenu`、`PAL_ConfirmMenu`、`PAL_SwitchMenu`、`PAL_SystemMenu`、`PAL_InGameMenu`、`PAL_InventoryMenu`、`PAL_PlayerStatus`、`PAL_InGameMagicMenu`、`PAL_ItemUseMenu`、`PAL_BuyMenu`、`PAL_SellMenu`、`PAL_EquipItemMenu`、`PAL_QuitGame` | 标题、存档、确认/开关、系统、背包、状态、法术、商店、装备、退出 |
| 物品/法术选择 | `PAL_ItemSelectMenuInit/Update/Menu`、`PAL_MagicSelectionMenuInit/Update/Menu` | 物品与法术网格、翻页、说明脚本、可用/不可用颜色 |
| 文本与 UI 基元 | `PAL_InitText`、`PAL_ReadMessageFile`、`PAL_GetWord`、`PAL_GetMsg`、`PAL_DrawText`、`PAL_StartDialog`、`TEXT_DisplayText`、`PAL_ClearDialog`、`PAL_EndDialog`、`PAL_CreateBox*`、`PAL_DeleteBox`、`PAL_DrawNumber`、`PAL_WordWidth` | WORD/M.MSG、对话、逐字、控制符、框、数字、字宽 |
| 战斗加载/渲染 | `PAL_StartBattle`、`PAL_BattleMain`、`PAL_LoadBattleSprites`、`PAL_LoadBattleBackground`、`PAL_BattleMakeScene`、`PAL_BattleDraw*`、`PAL_BattleFadeScene`、`PAL_BattleEnemyEscape`、`PAL_BattlePlayerEscape`、`PAL_BattleWon` | 战斗入口、背景/精灵、淡出、逃跑、胜利结算 |
| 战斗逻辑 | `PAL_CalcBaseDamage`、`PAL_CalcMagicDamage`、`PAL_CalcPhysicalAttackDamage`、`PAL_GetEnemyDexterity`、`PAL_GetPlayerActualDexterity`、`PAL_BattlePlayerCheckReady`、`PAL_BattleCommitAction`、`PAL_BattlePlayerPerformAction`、`PAL_BattleEnemyPerformAction`、`PAL_BattlePlayerValidateAction`、`PAL_BattleSimulateMagic`、`PAL_BattleStealFromEnemy` | 公式、行动队列、玩家/敌人行动、目标校验、偷窃、模拟法术 |
| 战斗 UI | `PAL_PlayerInfoBox`、`PAL_BattleUIIsActionValid`、`PAL_BattleUIDrawMiscMenu`、`PAL_BattleUIUseItem`、`PAL_BattleUIThrowItem`、`PAL_BattleUIPickAutoMagic`、`PAL_BattleUIUpdate`、`PAL_BattleUIShowNum/Text` | 战斗面板、图标、杂项、用/投物、自动法术、飘字 |
| 战斗动画 | `PAL_BattleShowPlayerAttackAnim`、`PAL_BattleShowPlayerUseItemAnim`、`PAL_BattleShowPlayerPreMagicAnim`、`PAL_BattleShowPlayerDefMagicAnim`、`PAL_BattleShowPlayerOffMagicAnim`、`PAL_BattleShowEnemyMagicAnim`、`PAL_BattleShowPlayerSummonMagicAnim`、`PAL_BattleShowPostMagicAnim` | 攻击、用物、预施法、防御法术、攻击法术、敌法术、召唤、后效 |
| 调色板/视频特效 | `PAL_GetPalette`、`PAL_SetPalette`、`PAL_FadeOut/In`、`PAL_SceneFade`、`PAL_PaletteFade`、`PAL_ColorFade`、`PAL_FadeToRed`、`VIDEO_UpdateScreen`、`VIDEO_FadeScreen`、`VIDEO_ShakeScreen`、`VIDEO_ToggleFullscreen/Scale`、`VIDEO_SaveScreenshot` | palette ramp、dither、摇屏、屏幕输出、平台视频 |
| 过场 | `PAL_RNGReadFrame`、`PAL_RNGBlitToSurface`、`PAL_RNGPlay`、`PAL_ShowFBP`、`PAL_ScrollFBP`、`PAL_EndingAnimation`、`PAL_EndingScreen`、`PAL_PlayAVI` | RNG 动画、FBP 显示/滚动、结局、AVI |
| 输入 | `PAL_InitInput`、`PAL_KeyboardEventFilter`、`PAL_MouseEventFilter`、`PAL_JoystickEventFilter`、`PAL_TouchEventFilter`、`PAL_GetCurrDirection`、`PAL_ClearKeyState`、`PAL_ProcessEvent` | 键盘、鼠标、手柄、触摸、按键状态 |
| 音频 | `AUDIO_OpenDevice`、`AUDIO_PlayMusic`、`AUDIO_PlaySound`、`AUDIO_PlayCDTrack`、`AUDIO_EnableMusic/Sound`、`SOUND_Play`、`MIDI/MP3/OGG/OPUS/RIX` backends | BGM、SFX、CD、开关、混音与格式后端 |
| 配置/工具 | `PAL_LoadConfig`、`PAL_SaveConfig`、`PAL_Get/SetConfig*`、`UTIL_*`、`resampler_*`、`video_glsl/glslp` | SDLPal 配置、文件、日志、平台、shader/resampler |

### 逐功能还原矩阵

#### A. 启动 / 主循环 / 生命周期

| ID | SDLPal 功能点 | SDLPal 源 | TS 对应 | 还原度 | 差异与结论 |
|---|---|---|---|---|---|
| A01 | 初始化全局、视频、UI、文本、输入、资源、音频、AVI | `main.c:PAL_Init` | `shell/bootstrap.ts`、`assets/loader.ts`、`main-loop.ts` | 🟡 中高 | Web 端初始化顺序与职责不同；资源/画面/输入可用，音频初始化缺失 |
| A02 | 关闭释放所有子系统 | `main.c:PAL_Shutdown` | `returnToTitle`、浏览器生命周期 | 🚫 N/A/部分 | 浏览器不退出进程；仅回标题和清状态，不复刻 SDL 资源释放 |
| A03 | Trademark：WIN95 AVI 或 DOS RNG fallback | `main.c:PAL_TrademarkScreen` | `avi-player.ts`、`trademark-fallback.ts` | ✅ 高 | 1.mp4/`RNGPlay(6)` 路径都有；音频缺失 |
| A04 | Splash：WIN95 AVI 或 DOS FBP 卷轴+仙鹤+标题渐显 | `main.c:PAL_SplashScreen` | `splash-fallback.ts` | 🟡 中高 | 视觉主流程已做；CD/RIX 播放缺失 |
| A05 | Opening AVI 3.avi | `uigame.c:PAL_OpeningMenu` | `avi-player.ts`、`bootstrap.ts` | ✅ 高 | 运行时用离线 mp4，不 runtime port `aviplay.c` |
| A06 | 主循环：重载资源、StartFrame、菜单/脚本/场景推进 | `game.c`、`play.c` | `main-loop.ts`、`scene-system.ts`、`event-system.ts` | ✅ 高 | SDL 阻塞循环改为 RAF+固定 tick，语义大体等价 |
| A07 | WaitForKey / WaitForAnyKey | `play.c:603-682` | `waiting='wait-key'`、modal 播放器、dialog confirm | 🟡 中高 | 多处按键等待已接；阻塞时序由状态机近似 |

#### B. 资源 / 地图 / 数据

| ID | SDLPal 功能点 | SDLPal 源 | TS 对应 | 还原度 | 差异与结论 |
|---|---|---|---|---|---|
| B01 | MKF chunk 读取、YJ1/YJ2 解压 | `palcommon.c`、`yj1.c` | `packages/pal-extract`、`assets/loader.ts` | ✅ 高 | 离线抽取替代运行时 MKF；非空资源基本全落地 |
| B02 | DATA/SSS 全局表加载 | `global.c:ReadGlobalGameData` | `data/extracted/data/*.json` | ✅ 高 | 资源表覆盖强；`resource-status.md` 基本可信 |
| B03 | 地图 MAP/GOP、上下层瓦片、阻挡 bit、高度 | `map.c` | `present/draw-tilemap.ts`、`scene-system.ts` | ✅ 高 | tile id、cover、block 主公式对齐 |
| B04 | RLE sprite blit、shadow、mono、color shift | `palcommon.c` | `rle-decode.ts`、`draw-sprite.ts`、battle/menu draw | 🟡 中高 | 解码/常规 blit 强；部分 runtime color shift/特效仍局部化 |
| B05 | FBP 全图 blit | `palcommon.c:PAL_FBPBlitToSurface` | `draw-battle-bg.ts`、`fbp-player.ts` | ✅ 高 | 背景、过场、状态页都有对应 |
| B06 | 调色板 day/night | `palette.c:PAL_GetPalette/SetPalette` | `palette-fade.ts`、`loader.ts` | ✅ 高 | PAT #0/#5 夜间半已提取并用于 fade target |
| B07 | WORD.DAT / M.MSG / codepage | `text.c`、`global.c:PAL_DetectCodePage` | `word-lookup.ts`、`dialog-box.ts`、`font.ts` | 🟡 中高 | 文案表接入；字体使用 Unifont/BDF，不是 PALFONT 像素级 |
| B08 | Object description / item/magic desc script | `ui.c:LoadObjectDesc`、`itemmenu.c`、`magicmenu.c` | `script-desc.ts`、menu draw | 🟡 中高 | WIN95 desc script 路径有实现；DOS object desc 文件路径基本不作为目标 |
| B09 | lazy load flags：scene/player/event sprites/global data | `res.c` | `bootstrap.ts`、`loader.ts` 缓存 | 🟡 中高 | Web 端异步缓存替代同步 flags，行为上基本覆盖 |

#### C. 大世界探索 / 场景

| ID | SDLPal 功能点 | SDLPal 源 | TS 对应 | 还原度 | 差异与结论 |
|---|---|---|---|---|---|
| C01 | 进场景脚本 `wScriptOnEnter` | `play.c:PAL_GameUpdate` | `scene-system.ts`、`event-system.ts` | ✅ 高 | onEnter override / reload / fade 门控均有 |
| C02 | 触发区 / touch trigger | `play.c:81-166` | `scene-system.ts:updateEventObjectsAndTrigger` | ✅ 高 | 大世界转场、NPC 接触、明雷接触主路径完成 |
| C03 | AutoScript 每帧驱动 | `play.c`、`script.c:PAL_RunAutoScript` | `event-system.ts:tickAutoScripts` | 🟡 中高 | 0x00/01/02/03/04/06/09/FFFF 主干完成；少数 animate 态仍需真档验 |
| C04 | 事件对象隐藏、vanishTime、负状态复活 | `play.c:167-223` | `scene-system.ts` | ✅ 高 | vanish 与屏外复活逻辑已接 |
| C05 | NPC/地图障碍检测 | `scene.c:PAL_CheckObstacle*` | `scene-system.ts:isWalkable` | ✅ 高 | tile block + NPC blocker 基本对齐 |
| C06 | 队伍动画、trail、队员跟随 | `scene.c:636-858` | `scene-system.ts`、`present.ts` | 🟡 中高 | trail/follower 已做；尾队细节仍建议真档对拍 |
| C07 | 临时 follower `0x98` 渲染 | `scene.c`、`res.c` | `follower-render.ts` | ✅ 高 | chunk 直索引、trail 后槽、跨场景持久已接 |
| C08 | NPCWalkOneStep / chase / partyWalkTo | `scene.c`、`script.c` | `event-system.ts` | ✅ 高 | chase、walk、ride object、pan/wait 多数已收口 |
| C09 | Search 13 格调查 | `play.c:PAL_GetSearchTriggerRange/PAL_Search` | `scene-system-search.ts` | ✅ 高 | 13 坐标和触发脚本已 port |
| C10 | 大世界热键：菜单/用物/装备/法术/状态/调查/退出 | `play.c:PAL_StartFrame` | `scene-system.ts`、menu driver | 🟡 中高 | 主路径都有；退出在 Web 语义为回标题 |
| C11 | camera / viewport / `0x7F` 多帧 pan | `script.c:2292-2379` | `event-system.ts`、`scene-system.ts` | ✅ 高 | 三分支与多帧 pan 已修，需真档视觉验收 |
| C12 | scene wave | `scene.c:PAL_ApplyWave` | `screen-wave.ts` | ✅ 高 | 32 相位扫描线卷动已做 |

#### D. 脚本 / Opcode

| ID | SDLPal 功能点 | SDLPal 源 | TS 对应 | 还原度 | 差异与结论 |
|---|---|---|---|---|---|
| D01 | TriggerScript 控制流 0x00-0x0A | `script.c:3140+` | `event-system.ts` | ✅ 高 | end/goto/call/wait/battle/confirm 主干完整 |
| D02 | AutoScript 控制流 0x00/01/02/03/04/06/09/FFFF/A7 | `script.c:3482+` | `tickAutoScripts` | 🟡 中高 | 主要完成；A7/部分特殊 animate 仍需真档覆盖 |
| D03 | Dialog style 0x3B-0x3E、0xFFFF 文本 | `script.c:3389+`、`text.c` | `dialog-box.ts`、`event-system.ts` | ✅ 高 | 打字、颜色控制符、title/portrait、partial clear 已做 |
| D04 | 物品/金钱/装备 opcode | `script.c:0x18-0x20/0x58/0x86` | `event-system.ts`、`equip-effect.ts` | ✅ 高 | 0x20 装备消耗等已修；库存顺序仍可能非字节级 |
| D05 | HP/MP/复活/毒/状态 opcode | `script.c:0x1B-0x2F/0x5D/0x61` | `event-system.ts`、`battle-opcodes.ts` | ✅ 高 | 活人 gate、状态清理、毒抗大多完成 |
| D06 | 战斗 opcode 全 E 类 | `script.c`、`fight.c` | `battle-opcodes.ts` | 🟡 中高 | handler 面很全；个别视觉 no-op、毒 tick 差一拍、真档仍要验 |
| D07 | 音频 opcode 0x43/0x45/0x47/0x77/0xA3 | `script.c`、`audio.c` | `event-system.ts` | 🟠 部分 | 只写 `wNumMusic/wNumBattleMusic` 或 debug，未真播 |
| D08 | 视觉 opcode 0x35/0x36/0x37/0x4F/0x50/0x51/0x71/0x73/0x76/0x80/0x8B/0x8C/0x93/0x96/0x9B/0xA4/0xA5 | `script.c`、`palette.c`、`ending.c`、`rngplay.c` | `palette-fade.ts`、`rng-player.ts`、`fbp-player.ts`、`ending-player.ts`、`screen-shake.ts` | ✅ 高 | G9 文档过期，shake present 已接 |
| D09 | 全局脚本数组 / 全局 IP / label fallback | `script.c` | `event-system.ts` | ✅ 高 | 单一全局数组和无 label fallback 已做 |
| D10 | teleport/onEnter/onTeleport override | `script.c:0x38/0x6D` | `event-system.ts`、`loader.ts` | 🟡 中高 | 逻辑完成；dialog-heavy teleport 仍需真实剧情验 |
| D11 | 特殊系统：收妖/炼丹/蛊/投掷链 | `script.c:0x33/0x34/0x60/0x64/0x66` | `battle-opcodes.ts`、`event-system.ts`、`throw-item.ts` | 🟡 中高 | opcode 基础已做；灵葫/炼蛊端到端真档验收不足 |

#### E. 全局状态 / 存档 / 成长

| ID | SDLPal 功能点 | SDLPal 源 | TS 对应 | 还原度 | 差异与结论 |
|---|---|---|---|---|---|
| E01 | 默认新游戏字段初始化 | `global.c:PAL_LoadDefaultGame` | `game-state.ts`、`bootstrap.ts` | ✅ 高 | 8 类 Exp `wLevel` 已按角色等级初始化 |
| E02 | SAVEDGAME DOS/WIN 兼容读写 | `global.c:PAL_LoadGame*/SaveGame*` | `core/save/api.ts`、IndexedDB | 🟠 部分/设计差异 | 保存游戏态已可用，但不做 `.RPG` 字节兼容 |
| E03 | 主经验、等级、学法术 | `battle.c:PAL_BattleWon`、`global.c:PAL_PlayerLevelUp` | `battle-system.ts:battleWonLevelUp` | ✅ 高 | 主经验、升级随机成长、学法术、结算屏已做 |
| E04 | 七类隐藏属性经验 `wCount` 与战后分配 | `battle.c:CHECK_HIDDEN_EXP`、`fight.c` 行动计数 | `game-state.ts:ExpEntry`、`battle-settlement.ts` 注释 | ❌ 缺失 | `ExpEntry` 无 `wCount`；攻击/防御/逃跑/魔法等动作计数与战后属性成长缺失 |
| E05 | 背包 Add/Remove/Compress/GetAmount | `global.c:957-1242` | `event-system.ts:addItemToInventory`、menus | 🟡 中高 | 主路径可用；装备数量 0、inUse、顺序压缩等仍建议专项对拍 |
| E06 | 装备效果 `rgEquipmentEffect` 与 getter | `global.c:1333-1457/1736-2013` | `equip-effect.ts`、`game-state.ts` | ✅ 高 | attack/magic/def/dex/flee/resist/coop/battle sprite 多数完成；战斗入口投影也已接 |
| E07 | 毒：加毒、按等级/类型解毒、毒抗 | `global.c:1459-1598/1900+` | `equip-effect.ts`、`battle-opcodes.ts`、`battle-system.ts` | 🟡 中高 | 战斗/大世界毒逻辑大体在；状态页毒名显示缺失 |
| E08 | 状态：confused/sleep/silence/paralyzed/puppet/bravery/protect/haste/dualAttack | `global.c:2173-2329`、`fight.c` | `battle/status.ts`、`battle-system.ts` | 🟡 中高 | 计数/衰减/行动限制大体完成；silence 菜单灰显等细节仍有风险 |
| E09 | 法术 Add/Remove、Coop magic override | `global.c:2013-2169` | `battle-settlement.ts`、`equip-effect.ts` | ✅ 高 | 学法术与装备覆盖协力法术已接 |
| E10 | Runtime PlayerRoles 单源边界 | SDLPal `gpGlobals->g.PlayerRoles` | `projectRuntimeToBattleRoles`、`writeBackBattleRolesToRuntime` | ✅ 高 | 早期静态/运行时分叉已修；后续要避免新代码绕过 runtime |

#### F. 大世界 UI / 菜单 / 文本

| ID | SDLPal 功能点 | SDLPal 源 | TS 对应 | 还原度 | 差异与结论 |
|---|---|---|---|---|---|
| F01 | OpeningMenu 新游戏/读档、背景、位置公式 | `uigame.c:42-167` | `opening-menu.ts`、`draw-opening-menu.ts` | ✅ 高 | 长文案 x 公式已补；音乐缺失 |
| F02 | SaveSlotMenu 5 槽、savedTimes | `uigame.c:169-242` | `save-slot-menu.ts`、`save/api.ts` | ✅ 高 | IndexedDB 替代 RPG 文件 |
| F03 | Selection/Confirm/Switch/Triple 原语 | `uigame.c:242-393` | `primitives.ts`、`draw-confirm.ts` | 🟡 中高 | Confirm/Switch 用到处完成；Triple 作为原语未完整接 runtime |
| F04 | InGameMenu + Cash box | `uigame.c:944-1044` | `in-game-menu.ts`、`draw-menu.ts` | ✅ 高 | WORD id 已接，cash box 渲染仍少独立测试 |
| F05 | SystemMenu save/load/music/sound/quit | `uigame.c:516-651` | `in-game-menu.ts`、`menu-driver.ts` | 🟠 部分 | save/load/quit confirm 可用；music/sound 只是 debug，未切音频开关 |
| F06 | Inventory 2 项子菜单：装备/使用 | `uigame.c:878-919` | `inventory-action-menu.ts`、`menu-driver.ts` | ✅ 高 | 二级菜单已补 |
| F07 | ItemSelect grid、翻页、说明、装备数量 0 色 | `itemmenu.c` | `inventory-menu.ts`、`draw-inventory.ts` | 🟡 中高 | 网格/颜色/翻页完成；DOS desc 与少量视觉还可细抠 |
| F08 | ItemUseMenu 目标选择、同物品循环使用 | `uigame.c:1289-1473` | `inventory-menu.ts`、`menu-driver.ts` | 🟡 中高 | 单体/全体使用与脚本消耗已接；视觉和 live count 主路径已修 |
| F09 | MagicSelection grid、MP、排序、可用性 | `magicmenu.c` | `magic-select.ts`、`draw-magic.ts` | ✅ 高 | outside/battle flags 与 MP 判断已接 |
| F10 | InGameMagicMenu 选施法者/选目标/扣 MP | `uigame.c:653-875` | `in-game-magic-menu.ts`、`magic-script.ts` | ✅ 高 | applyToAll 与单体循环逻辑已按源码写 |
| F11 | PlayerStatus 全屏状态页 | `uigame.c:1051-1288` | `player-status.ts`、`draw-player-status.ts` | 🟠 部分 | 主布局和数值完成；毒素 row 明确 skip，字体非 PALFONT |
| F12 | BuyMenu / SellMenu | `uigame.c:1503-1792` | `shop-menu.ts`、`draw-shop.ts` | 🟡 中高 | 功能交易完成；卖菜单视觉较简化 |
| F13 | EquipItemMenu 换装、swap chain、装备脚本 | `uigame.c:1793-2056` | `equip-menu.ts`、`menu-driver.ts`、`equip-effect.ts` | ✅ 高 | 背包刷新和 `wLastUnequippedItem` 链已接 |
| F14 | Box / single-line box / shadow | `ui.c` | `draw-box.ts` | ✅ 高 | 9-slice 与阴影已有测试 |
| F15 | DrawNumber sprite 数字 | `ui.c:640` | `draw-number.ts` | ✅ 高 | 颜色/对齐已接 |
| F16 | DrawText、阴影、字宽 | `text.c`、`font.c` | `font.ts` | 🟡 中高 | 字宽接近；字形不是原 PALFONT |
| F17 | Dialog：style、逐字、控制符、翻页、portrait/title | `text.c:1208-1817` | `dialog-box.ts`、`event-system.ts` | ✅ 高 | 这是当前还原较强的 UI 子系统 |
| F18 | Battle UI player info、icons、misc、item/magic/target、damage num | `uibattle.c` | `battle-system.ts`、`draw-battle-ui.ts`、`draw-battle-num.ts` | 🟡 中高 | 状态机很全；部分 icon/灰显/目标高亮视觉需真档对拍 |

#### G. 战斗系统

| ID | SDLPal 功能点 | SDLPal 源 | TS 对应 | 还原度 | 差异与结论 |
|---|---|---|---|---|---|
| G01 | StartBattle：复活 1HP、清 hidden count、清 inUse、载敌队/战场/背景/精灵/波动 | `battle.c:1531-1815` | `battle-system.ts:startBattle` | 🟡 中高 | 主流程完成；hidden exp count 不存在 |
| G02 | BattleMain/phase loop | `battle.c:685`、`fight.c:PAL_BattleStartFrame` | `battle-system.ts:tickBattle` | ✅ 高 | phase 状态机较完整 |
| G03 | 战斗背景、队员/敌人 sprite、排序、death fade | `battle.c:34-609` | `present-battle.ts`、`draw-battle-sprites.ts`、`death-fade` | 🟡 中高 | 主显示完成；局部 sprite color shift/吹飞等仍有差异 |
| G04 | 战斗位置表与 fighter 状态帧 | `battle.c`、`fight.c:916-986` | `battle-positions.ts`、`battle-anim-driver.ts` | 🟡 中高 | 站位/姿态主路径可用；逐帧动作仍需继续对拍 |
| G05 | 战斗 UI 主图标、杂项、热键、回退上一角色、Repeat/Auto/Force | `uibattle.c:785-1768` | `battle-system.ts` | 🟡 中高 | 比文档旧描述更完整；backtrack item inUse 等仍建议真档验 |
| G06 | ActionQueue CLASSIC：敌先入队、dualMove 二抽、玩家倍率、jitter | `fight.c:1451-1585` | `battle-system.ts`、`turn-queue.ts` | 🟠 部分 | 敌 dualMove 很接近；玩家 base dex 错加 `(level+6)*4`，影响全战斗出手顺序 |
| G07 | 玩家物理攻击：有效攻击+敌防+随机/暴击/双击/群攻 | `fight.c:3618-3748` | `actions/attack.ts` | 🟠 部分 | 随机、暴击、双击、群攻已做；玩家 `str` 错加 `(level+6)*6`，应为 `PAL_GetPlayerAttackStrength` |
| G08 | 敌人物理攻击、自动防御、保护/替挡、equiv item poison | `fight.c:4917-5148` | `actions/attack.ts` | 🟡 中高 | 主逻辑很完整；动画和音效未完全 |
| G09 | 玩家攻击法术 inline damage、simulateMagic、throw weapon | `fight.c:4245-4318/5301+` | `actions/magic.ts`、`magic-damage.ts`、`throw-item.ts` | ✅ 高 | 这块已从早期 0 caller 状态补上 |
| G10 | 敌方攻击魔法 | `fight.c:4772-4853` | `magic-damage.ts:applyEnemyMagicDamage` | 🟠 部分 | 已结算伤害，但玩家 `def` 错加 `(level+6)*4`；SDLPal 用 `PAL_GetPlayerDefense` 无等级项 |
| G11 | Defend | `fight.c`、`uibattle.c` | `actions/defend.ts` | 🟠 部分 | 防御状态本身可用；隐藏防御经验 `wCount += 2` 缺失 |
| G12 | Flee 公式与逃跑动画 | `battle.c:PAL_BattlePlayerEscape`、`fight.c` | `actions/flee.ts`、`anim-timeline.ts` | 🟡 中高 | 公式较新；逃跑动画采用统一位移，非完全 SDLPal fan delta |
| G13 | Use item / throw item in battle | `uibattle.c`、`fight.c` | `actions/item.ts`、`actions/throw-item.ts` | 🟡 中高 | 链路可用；特殊物品仍需真实战斗验收 |
| G14 | Cooperative magic | `fight.c:3856-4043` | `actions/coop-magic.ts` | 🟡 中高 | 逻辑与动画都有；仍缺音效/像素级对拍 |
| G15 | 玩家状态限制与衰减 | `fight.c`、`global.c` | `status.ts`、`battle-system.ts` | 🟡 中高 | 计数、睡眠/麻痹/混乱等完成；silence 菜单灰显等细节待验 |
| G16 | Poison tick：玩家/敌人毒脚本 | `fight.c:1645-1697` | `battle-system.ts:tickPostAction` | 🟡 中高 | 战斗毒 tick 已接；0x28 立即 tick 与 postAction 差异需记录 |
| G17 | 敌方 AI：目标选择、魔法率、equiv item、confused attack | `fight.c:4489-5150` | `enemy-ai.ts`、`battle-system.ts` | 🟡 中高 | 大部分逻辑完成，仍需更多真实敌队回放 |
| G18 | 敌脚本 turnStart / ready / battleEnd | `fight.c`、`battle.c:1334` | `battle-system.ts` | ✅ 高 | ready re-arm/show-once、battleEnd 胜利后已接 |
| G19 | Steal from enemy | `fight.c:5193` | `battle-opcodes.ts`、`anim-timeline.ts` | 🟡 中高 | 逻辑/动画有；提示文本/音效可继续细化 |
| G20 | Enemy summon / division / transform / collect / blow / escape | `script.c:E opcodes` | `battle-opcodes.ts` | 🟡 中高 | 逻辑覆盖高；部分 present 视觉待补 |
| G21 | BattleWon 经验/金钱/升级/学法术/半血半蓝恢复 | `battle.c:991-1373` | `battle-system.ts`、`battle-settlement.ts`、`draw-battle-settlement.ts` | 🟡 中高 | 主结算 UI 已做；隐藏属性经验整段缺失 |
| G22 | 战斗收尾：清状态、清低级毒、清 Extra 装备效果、恢复音乐 | `battle.c:1817-1856` | `finalizeBattleCleanup` | 🟡 中高 | 状态/毒/Extra 已处理；恢复音乐因音频缺失只状态层 |
| G23 | lost/fled/won 结果路由、剧情失败、Game Over | `script.c:0x07/0x4F/0x4E` | `resumePostBattleScript`、`gameOverActive` | 🟡 中高 | 架构已做；需要用剧情战/死亡脚本真档验收 |
| G24 | 法术/攻击/召唤/合击/敌魔法动画时间线 | `fight.c:2008-3190` | `anim-timeline.ts` | 🟡 中高 | 已覆盖很多大块；SFX、部分 keepEffect/iBlow/色变仍未像素级 |
| G25 | Battle UI 数字飘字 | `uibattle.c:1770` | `draw-battle-num.ts` | ✅ 高 | 掉血数字与延迟显示已接 |

#### H. 视觉特效 / 过场

| ID | SDLPal 功能点 | SDLPal 源 | TS 对应 | 还原度 | 差异与结论 |
|---|---|---|---|---|---|
| H01 | FadeIn/FadeOut/SceneFade/PaletteFade/ColorFade/FadeToRed | `palette.c` | `palette-fade.ts`、`present.ts` | ✅ 高 | ramp 与红屏基本完整 |
| H02 | VIDEO_FadeScreen nibble dither | `video.c:1130` | `present.ts` fadeState | 🟡 中高 | 72 步 dither 有实现；缺更多截图对拍 |
| H03 | ShakeScreen | `video.c:1030` | `screen-shake.ts`、`present.ts` | ✅ 高 | `feature-status.md` 仍写 stub，实际已接 |
| H04 | RNG.MKF 动画 | `rngplay.c` | `rng-player.ts` | ✅ 高 | manifest + PNG 播放；asset copy 是部署问题 |
| H05 | ShowFBP / ScrollFBP / effect sprite | `ending.c:49-279` | `fbp-player.ts` | ✅ 高 | 96 步渐变、220 步卷入、effect overlay 已接 |
| H06 | EndingAnimation / EndingScreen DOS 编排 | `ending.c:282-512` | `ending-player.ts`、`bootstrap.ts` | 🟡 中高 | 主视觉完成；音乐缺失，ColorFade blocking 是近似 |
| H07 | AVI 播放 | `aviplay.c`、`uigame.c` | `avi-player.ts` | ✅/🚫 | Web 用离线 mp4，不 port MS-MPEG4 runtime decoder |
| H08 | Fullscreen/scale/screenshot/GLSL shader | `video.c`、`video_glsl.c` | 浏览器 canvas/CSS | 🚫 N/A | 应在 feature-status 明确归档，不作为还原缺口 |

#### I. 输入 / 平台

| ID | SDLPal 功能点 | SDLPal 源 | TS 对应 | 还原度 | 差异与结论 |
|---|---|---|---|---|---|
| I01 | 键盘方向、确认、菜单、战斗快捷键 | `input.c:58-90` | `shell/input.ts` | ✅ 高 | WASD 原义已按 SDLPal 恢复，不当方向 |
| I02 | key repeat / 后按优先 | `input.c` | `KeyboardInputSource` | 🟡 中高 | `e.repeat` 过滤和 held 顺序已接 |
| I03 | MouseInputSource | `input.c:PAL_MouseEventFilter` | 无 | ❌ 缺失 | Web 可做增强，但当前无鼠标游戏输入 |
| I04 | Joystick/Gamepad | `input.c` | 无 | ❌ 缺失 | 可用 Gamepad API 未来补 |
| I05 | Touch | `input.c`、`VIDEO_SetupTouchArea` | 无 | ❌ 缺失 | 移动端可做 future |
| I06 | SDL config / config page | `palcfg.c` | 少量运行时选项、URL flag | 🟠 部分/🚫 | PAL_CLASSIC 核心不要求完整 SDLPal config |

#### J. 音频

| ID | SDLPal 功能点 | SDLPal 源 | TS 对应 | 还原度 | 差异与结论 |
|---|---|---|---|---|---|
| J01 | 音频设备、混音、音量 | `audio.c`、`sound.c` | 无 runtime audio | ❌ 缺失 | 当前最大沉浸感缺口 |
| J02 | BGM `AUDIO_PlayMusic` / RIX/MIDI/MP3/OGG/OPUS | `audio.c`、`midi*.c`、`*play.c` | `event-system.ts` 只记 `wNumMusic` | ❌ 缺失 | Musics 已抽，未播 |
| J03 | SFX `AUDIO_PlaySound` / `SOUND_Play` | `sound.c` | `console.debug` | ❌ 缺失 | 363 WAV 已抽，未播 |
| J04 | CD audio fallback | `audio.c:PlayCDTrack` | `wNumMusic=op1` | ❌/🚫 | Web 可直接播 OGG track；当前未接 |
| J05 | SystemMenu music/sound switch | `uigame.c:SystemMenu` | `menu-driver.ts` debug | ❌ 缺失 | UI 有项，实际不开关 |
| J06 | 战斗/菜单/法术/死亡音效 | `fight.c`、`uibattle.c`、`audio.c` | 部分 `sound` 字段进 timeline，但 present 不播 | 🟠 部分 | 数据在，播放层缺 |

### 当前最关键的还原偏差

| 优先级 | 偏差 | 证据 | 影响 |
|---|---|---|---|
| P0 | 玩家物理攻击强度错加等级项 | SDLPal `fight.c:3630` 用 `PAL_GetPlayerAttackStrength`；TS `actions/attack.ts:136` 为 `role.attackStrength + (level+6)*6` | 玩家伤害系统性偏高，难度和战斗节奏失真 |
| P0 | 玩家行动队列敏捷错加等级项 | SDLPal `fight.c:1520` 用 `PAL_GetPlayerActualDexterity(wPlayerRole)`，其底层 `PAL_GetPlayerDexterity` 只加装备；TS `battle-system.ts:579` 加 `(level+6)*4` | 出手顺序、道具/防御/法术倍率、濒死节奏都受影响 |
| P0 | 敌方法术打玩家防御错加等级项 | SDLPal `fight.c:4790/4825` 用 `PAL_GetPlayerDefense`；TS `magic-damage.ts:183` 加 `(level+6)*4` | 敌方法术伤害偏低，后期尤其明显 |
| P0 | 隐藏属性经验缺失 | SDLPal `battle.c:1226-1293` 依赖七类 `wCount`；TS `ExpEntry` 无 `wCount` | 长期成长曲线缺一大块，战斗胜利结算不完整 |
| P1 | 状态页毒素 row 未画 | SDLPal `uigame.c:1245-1253`；TS `draw-player-status.ts` 明确 skip | 角色状态菜单缺可见毒信息 |
| P1 | 音频系统缺失 | SDLPal `audio.c/sound.c`；TS 只抽资源和状态 | BGM/SFX/菜单反馈/战斗反馈全缺 |
| P1 | SystemMenu 音乐/音效开关是 stub | SDLPal `uigame.c:610-621`；TS `menu-driver.ts` debug | 菜单项可选但无效果 |
| P2 | 视觉级战斗动画尚未完全像素对齐 | SDLPal `fight.c:2008-3190`；TS `anim-timeline.ts` 已覆盖大块 | 可玩性够，但还原感仍有差距 |
| P2 | 鼠标/手柄/触摸无输入源 | SDLPal `input.c` | 平台增强缺口，非通关核心 |

### `feature-status.md` 需要同步的精确修订

这部分是本次审计对三表的直接产出。

| 条目 | 当前文档问题 | 建议状态 |
|---|---|---|
| `D3 物理伤害公式` | 文档写玩家物理攻击完整，但 TS 玩家 `str` 明确错用敌方等级派生公式 | 从 `✅ claimed` 降为 `⚠️ partial`，备注“玩家攻击强度公式待修” |
| `D5 玩家 dex` / `D7 ActionQueue` | 文档只说公式完成；TS queue 实际给玩家 base dex 加等级项 | 降为 `⚠️ partial`，备注“玩家行动队列 base dex 待修” |
| `D27 敌方攻击魔法` | 文档写完成，但 TS 玩家 def 加等级项与 SDLPal 不符 | 降为 `⚠️ partial`，备注“enemy→player magic defense formula 待修” |
| `D11 BattleWon` | 文档没有把隐藏属性经验作为明确缺口 | 拆成“主经验/升级/学法术 ✅”和“隐藏属性经验 ❌” |
| `C6 PlayerStatus` | 文档写 partial，但没点明毒素 row 是明确 skip | 保持 `⚠️ partial`，补“poison row 未画” |
| `C2 SystemMenu` | 文档已经比旧版准确，但 music/sound toggle 应与 H 章强关联 | 保持 partial 或改 `⚠️`，明确“开关项无实际 audio backend” |
| `G9 ShakeScreen` | 文档仍写 present 未接，实际 `screen-shake.ts` + `present.ts` 已接 | 改为 `✅ claimed`，测试列更新为 `✅ unit` |
| `D12 Flee` | 文档曾说 raw fleeRate，当前代码已走 getter；残是动画差异 | 更新备注：公式已修，动画非完全原版 |
| `D18 Repeat/Auto/Force` | 文档残留偏旧；当前 `commitRepeatAction`、`fAutoBattle`、`fAutoAttack` 较完整 | 重新核条目，只保留真实缺口 |
| `D24 Hide` | 文档旧称 AI/目标筛选未接；当前隐身、递减、敌行动保护已接 | 升级或改为“需真档验证” |
| `L1/L2 特殊物品` | 文档部分措辞仍像底层 opcode 缺失；实际 0x33/0x34/0x60/0x64/0x66/0x28 多已做 | 改为“opcode 已做，端到端真档验收不足” |
| `H 音频` | 当前判断仍准确 | 继续作为最大 ❌ 缺口 |

### 更准确的总体还原度

如果按 SDLPal 功能面而非“主线能否跑通”来估算：

| 层 | 还原度 | 说明 |
|---|---:|---|
| 资源抽取与数据表 | 98-100% | 非空 chunk、union view、文本、图像、音频资源均接近全覆盖 |
| 地图/场景/脚本主干 | 88-94% | 探索、触发、转场、搜索、移动、视觉 opcode 覆盖很强 |
| 大世界 UI/菜单 | 80-88% | 功能状态机完整度高；状态毒 row、音频开关、字体像素级是主要差异 |
| 战斗流程/AI/opcode | 80-88% | 架构完整；真实敌队与特殊物品仍需回放验收 |
| 战斗数值 | 65-75% | 三个明确公式偏差 + hidden exp 缺失拉低这一层 |
| 战斗视觉 | 60-75% | 大块动画已做，但音效、若干特效/色变/像素级仍未完全 |
| 音频 | 0-15% | 数据有，播放层基本无 |
| 输入/平台 | 55-70% | 键盘强，鼠标/手柄/触摸/SDL config 缺失或 N/A |

所以更保守的结论是：

- “主线可玩骨架”：约 80-85%。
- “SDLPal classic 引擎功能面”：约 74-80%。
- “数值/体验级 1:1”：目前不应高于 70-75%，主要被战斗数值、hidden exp、音频拖住。

### 建议下一步修复顺序

1. 先修三个 P0 数值公式：玩家攻击 `str`、玩家 queue dex、敌方法术玩家防御。
2. 给 `ExpEntry` 补 `wCount`，在 attack/defend/flee/magic/use item 等行动点累积，再补 `CHECK_HIDDEN_EXP` 战后分配。
3. 更新 `feature-status.md` 的 D3/D5/D7/D11/D27/G9/L1/L2/C6/H 相关条目，避免状态表继续误导。
4. 做真实战斗回放验收：灵葫咒、紫金葫芦、蛊、偷窃、投掷武器、敌方攻击魔法、剧情败北。
5. 开 Web Audio 最小闭环：BGM 播放/停止/切换、SFX 播放、SystemMenu 开关、战斗音效。
