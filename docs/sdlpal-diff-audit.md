# type-pal × sdlpal 差异审查报告

> 生成日期:2026-06-07。方法:22 个子系统并行,每个用 agent 逐函数对照 `reference/sdlpal/` C 源(真值锚)找差异候选,再对每条候选派对抗性复核 agent 独立重核 C 源、尽力推翻误报。
> 规模:92 个 agent、7.67M token、2677 次工具调用。compare 共产出 70 条候选,**全部完成对抗复核,零遗漏**。

## 统计

| 维度 | 数量 |
|---|---|
| 候选总数 | 70 |
| ✅ 确认差异 | 64 |
| ❌ 复核否决(误报) | 6 |
| ❓ 待定 | 0 |

严重度:🔴 high 2 / 🟠 medium 15 / 🟡 low 47

类别:correctness 33 / timing 15 / pixel 14 / data 2

## 修复进度(2026-06-07 落地)

本轮按报告逐条修复,全部 TDD/真值锚定 + `pnpm check` 全绿 + 逐条 commit 推送。

- **✅ 已修复 59 条**:H1 H2 全部 high;M1–M4 M6–M15 共 14 条 medium;L1 L2 L3 L4 L5 L6 L7 L8 L9 L10 L11 L12 L13 L15 L16 L17 L18 L19 L20 L22 L23 L24 L25 L26 L27 L28 L29 L30 L31 L32 L33 L35 L36 L37 L39 L40 L41 L42 L43 L44 L45 L46 L47 共 43 条 low。
- **⏸ 暂缓 4 条**:M5(走路 fCheckRange 下边界——需重定位 6 个 walk 测试 fixture)、L21(群攻 division 衰减——需复刻 WORD 下溢语义 + 重构既有测试)、L14(OffMagic 起手 Delay(1)——波及 OffMagic/合击全部帧索引断言 18 测试,不可感知)、L34(淡入淡出 60/64 上限——有干净实现但须改写既有 fade 回归测试整洁断言为 C 量化丑值、不可感知、仅覆盖 4 套 lerp-fade 中的 2 套)。
- **未修(低 ROI)**:其余 low 多为复核判定玩家不可感知 / 原版数据结构性不可达 / 纯 pixel·timing 细节(L38),性价比低暂留。

下方速查索引与各 finding 标题前缀:**✅ 已修**、**⏸ 暂缓**、无前缀=未修。

## M级修复审查(除 M5)

> 审查日期:2026-06-07。范围:M1–M4、M6–M15 的已落地修改,按代码消费链 + 对照 `reference/sdlpal/` 真值复核。结论:14 条已完整收口。

| ID | 审查结论 | 代码审查要点 |
|---|---|---|
| M1 | ✅ 通过 | `shouldRenderAsTitle(text,lineCount,style)` 已补齐首行 + 非 center + 冒号三条件,并有续行冒号/center 用例覆盖。 |
| M2 | ✅ 通过 | 0x1A 非装备上下文已能写 avatar/battleSprite/sprite/attackAll/walkFrames/coop;大世界 sprite、队伍 leader/follower 行走帧、战斗投影、头像/群攻/合体均消费 runtime 值。 |
| M3 | ✅ 通过 | `walkFrameMod` 复刻 `nSpriteFrames==3 ? 4 : nSpriteFrames`,并覆盖 1/2/3/4/0/undefined;脚本走位/动画/追逐点均改走 helper。 |
| M4 | ✅ 通过 | `waiting='camera-pan'` 已放入 event 模式 autoScript/chase timer 白名单,测试覆盖 0x7F pan 期间 autoScript 继续推进。 |
| M6 | ✅ 通过 | `loadDefaultGame` 与 `loadGameFromSlot` 均在装备重算前清 `rgPlayerStatus`,对齐 `PAL_InitGameData`。 |
| M7 | ✅ 通过 | `fForce/fRepeat` 已变成整队粘滞标志,剩余待选队员自动提交,全员动作填完后清标志。 |
| M8 | ✅ 通过 | 已从即时数字改为 battleAnim 时间线:滑步、火花、PostMagic 抖动、Delay(5)、复位 Delay(2) 均有;火花 Y 已通过 enemy frame0 height 对齐 `target.y - height/3 + 10`。 |
| M9 | ✅ 通过 | 非 summon 合击只即时播固定 29,`magic.sound` 已挂进 OffMagic 起手帧;测试断言派发时不再即播效果音。 |
| M10 | ✅ 通过 | 大世界治疗 runner 已复刻 `PAL_IncreaseHPMP`:仅活人、无变化失败,满血/死人单体治疗不扣 MP。 |
| M11 | ✅ 通过 | 战斗 `OP_REVIVE_PLAYER` 与大世界复活法术 runner 均改 `curePlayerPoisonByLevel(...,3)`,覆盖 level>3 保留测试。 |
| M12 | ✅ 通过 | 战斗、大世界事件、装备 0x29 均在施毒当下跑 playerScript 并存返回 next entry;无 runner 的底层 helper 仅保留向后兼容 fallback。 |
| M13 | ✅ 通过 | narration `drawSingleLineBox` 已显式 `shadowOffset:0`;紫金葫芦 item-box 仍保留 `shadowOffset:5`。 |
| M14 | ✅ 通过 | `gameOverActive` hold 分支在画死亡文字前先做 0x4F→0x4E remap,战斗定格帧也能染红,且文字仍用 skipIndex 0x4F。 |
| M15 | ✅ 通过 | DOS splash 已取 FBP `0x26/0x27`;`splash-fallback.ts` 注释也已改为 DOS 0x26/0x27、WIN95 3/4 的构建分支说明。 |

## L级修复审查(已标 ✅)

> 审查日期:2026-06-07。范围:速查索引中已标 ✅ 的 43 条 Low 修改,按实现消费链 + 回归测试锚点复核。结论:43 条已完整收口,未发现新的遗漏。

| ID | 审查结论 | 代码审查要点 |
|---|---|---|
| L1 | ✅ 通过 | `shouldRenderAsTitle(text,lineCount,style)` 已排除 `center`,且首行/续行/center 用例覆盖;居中冒号对白不再被抽成 title。 |
| L2 | ✅ 通过 | `DialogBoxState.userSkip` 已复刻 `fUserSkip` 段内持续;typing 中确认后续行瞬显,并在翻页、`~` 段末复位。 |
| L3 | ✅ 通过 | 渲染排序与 cover 判定已把 `gs.wLayer` 加到角色/跟随者 worldY 基准,实际 blit 仍保留 `screenY+4`;换场景分支已清 `wLayer=0`。 |
| L4 | ✅ 通过 | `walkFrameMod` 被脚本走位、逐步动画、追击路径共同消费,覆盖 `nSpriteFrames` 为 0、1、2、3、4 与旧 fixture undefined。 |
| L5 | ✅ 通过 | 与 L30 同改:站立/撞墙/NPC 阻挡三分支均补 `stepFrame=(stepFrame&2)^2`,对齐 scene.c:773-774;站立渲染 `dir*walkFrames` 不读 stepFrame 故 0↔2 翻转不影响站立姿。 |
| L6 | ✅ 通过 | `loadGameFromSlot` 在读档后强制 `gs.iCurInvMenuItem=0`,测试覆盖脏光标读档归零;新游戏重建路径也保持初值 0。 |
| L7 | ✅ 通过 | `loadGameFromSlot` 在读档后强制 `gs.sWaveProgression=0`,避免 structuredClone 存档带回屏波增量。 |
| L8 | ✅ 通过 | 战斗与大世界法术菜单均按 WIN95 路径只画左侧 MP 框 + 法术说明,不再叠加金钱框/右侧 MP 框;两处均有像素层测试。 |
| L9 | ✅ 通过 | `drawMiscMenu(..., confirmed=true)` 在物品二级菜单中把父项『道具』画成固定 0x2C,不再用闪烁选中色。 |
| L10 | ✅ 通过 | 行动队列 flee dex 已改 `Math.floor(dex * 0.5)`,对齐 C 的 WORD `/=2`;濒死二次减半仍保留 floor。 |
| L11 | ✅ 通过 | 敌主动逃跑动画增加 `ENEMY_FLYOUT_HOLD_TICKS=13` 出屏停顿,约等于 `UTIL_Delay(500)` 后才进入 fleed。 |
| L12 | ✅ 通过 | `buildPlayerAttackTimeline` 加 `windup`,单体/群攻仅首击(t==0)前置 `currentFrame=7 + Delay(4)` 前摇帧;双击/双 sweep 第二击不加,对齐 fight.c:3667-3671/3690-3694。 |
| L13 | ✅ 通过 | 群攻每个 sweep 后补 `4 * BATTLE_FRAME_TIME` 收势延迟;单体攻击路径未被误加尾延。 |
| L15 | ✅ 通过 | 投掷和战斗用物品时间线都接入 `itemName`,在 (210,50) 生成 `battleMessage`,并由 caller 传入真实物品名。 |
| L16 | ✅ 通过 | 敌方法术伤害结果外传 `autoDefend`,动画链在特效前给对应队员注入 frame 3,受击 frame 4 仍能覆盖。 |
| L17 | ✅ 通过 | `keepEffect` 末帧判定已改用 `baseScreenWave + magic.wave < 9`;普通法术、敌方法术、合击、0x92、普通召唤 secondary 入口均传战场基础屏波与 `wave/keepEffect`。 |
| L18 | ✅ 通过 | `applyMagicDamage`/`applyEnemyMagicDamage`/`simulateMagic` 删 `rngFactor` 入参,改在逐目标 for 循环内各掷一次 `1+next()*0.1`(对齐 fight.c:215 在 PAL_CalcMagicDamage 内、群攻 fight.c:4288/4015 逐敌调用);5 个 caller(magic 玩家/敌方、coop、0x42/0x66)删预掷。单体掷骰紧贴调用、中间无 rng → 时序与序列不变(全套零回归),仅多体改为逐目标独立。新增独立性测试:next 调用次数==存活目标数 + 相同敌人伤害互异。 |
| L19 | ✅ 通过 | `buildAndStartTranceAnim` 闪色 6 帧后不再硬切单帧,改接 72 步 dither crossfade(对齐 fight.c:4234-4240 VIDEO_BackupScreen→LoadBattleSprites→iColorShift=0→MakeScene→FadeScene)。复用 present `applySummonFade` 引擎:fade 帧带 `summon{fadeDir:'out',fadeStep}` → summonGodMode=false(不画召唤神/不隐队员/bg 不染色),仅做旧精灵→新精灵低 nibble 渐变;每帧已切 caster 新精灵 + iColorShift=0,并置 `hasSummonFade` 供闪色末帧快照 from。测试断言由"末帧硬切"改为"闪色 6 帧 + 72 步 fadeOut"。 |
| L20 | ✅ 通过 | 与 L18 同一核心循环改动;敌方法术已改为先判定/预计算 autoDefend 的 `RandomLong(0,2)`(AoE fight.c:4723-4735;单体 fight.c:4746-4753),再进入逐存活队员 `PAL_CalcMagicDamage` 掷 `RandomFloat(10,11)`(fight.c:4798/4833)。新增单体与 AoE RNG 调用顺序测试,锁定 AoE 为“全队 autoDefend → 存活队员 damage rng”。 |
| L22 | ✅ 通过 | `attack.ts` 敌→我等价物中毒删 `equivId!==0` 前置短路:该 block 已隐含 `iCoverIndex==-1 && !fAutoDefend`(上方 fAutoDefend 提前 return),故对齐 fight.c:5139 在每次非格挡非自卫命中恒消费一次 `RandomLong(1,10)`。equivItem=0 时 `rate=0` → `0>=1..10` 恒假、消费后短路,find 不到物品 → 不中毒(等价 C 跑 rgObject[0] 空脚本)。新增计数测试锁定;全套零回归。 |
| L23 | ✅ 通过 | `startBattle` 在 `createBattleState` 前把队伍中 HP=0 的角色复活为 1,同步 runtime HP 并清 Puppet 状态。 |
| L24 | ✅ 通过 | hidden-exp-up 框长仍用钳后宽度,但文字段按实际姓名/属性宽度连续定位,2 字名不再多出 16px 空档。 |
| L25 | ✅ 通过 | `BattleEnemy` 新增 `objectId`(= wObjectID,OBJECT 绝对 index);0x91 同种判定改按 `(objectId ?? e.id)` 比较(对齐 script.c:2624),同 wEnemyID 多 OBJECT 不再误判同种。`createBattleState` 从 `team.enemyObjectIndexes` 填(无精确对象号 fallback enemyId,退化旧行为),0x9C 分裂副本=self.objectId、0x9E 召唤=w(自身同种则 self.objectId)、0x9F 变身=op0(对齐 script.c:2965),`resetEnemySlot` 同步复制。旧 fixture 不带 objectId 回退 e.id;新增同/异对象身份、回退、变身后 0x91 按新对象身份计数测试。原版数据结构性不可达,纯语义正确性对齐。 |
| L26 | ✅ 通过 | 0x6A 偷钱分支只在 `c>0` 时入 `battleDialogQueue`,剩 1 文整除得 0 不再弹「获得 0 文钱」。 |
| L27 | ✅ 通过 | 0x28 全体施毒已把落槽 enemyIdx 与入口脚本 self 分离;全体入口脚本 self 固定为投掷目标,后续 poison tick 仍各敌推进。 |
| L28 | ✅ 通过 | `parseWordDat` 在 GBK 解码后剥词条尾部标记字符 `1`,并同时覆盖 flat 与分段表;测试锁定 8 条受影响词。 |
| L29 | ✅ 通过 | `JUMP_TARGET_OPERAND` 补全 13 个条件跳转 opcode(0x06/1E/20/2E/33/34/38/3A/68/84/91/9C/9E),operand 序号逐条对照 reference/sdlpal/script.c `wScriptEntry=rgwOperand[N]` 核实(962/1023/1395/1448/1517/1569/1597/2031/2483·2500/2633/2798/2905/3305)。slice BFS 现跟随这些目标、disasm 打 L_ 标签,补回报告所述 244 条可达指令。新增参数化测试逐一验证目标被收集;roundtrip 字节一致不受 L_ 标签影响,全套零回归。 |
| L30 | ✅ 通过 | 与 L5 同根:idle/blocked 站立分支复位 stepFrame `&=2;^=2`;改写 3 个锁定"冻结不变"的回归测试为 C 真值(撞墙/NPC 0→2、走2步后 idle 2→0、再 idle 0↔2 翻转)。 |
| L31 | ✅ 通过 | cover-tile 扫描边界已从 `Math.floor` 改为 `Math.trunc`,对齐 C 整数除法;潜伏边界差异已收口。 |
| L32 | ✅ 通过 | layer-0 in-bounds tile 缺帧时已 fallback 到 `tiles.get(0)`,layer-1 仍按原版跳过;不再留黑洞。 |
| L33 | ✅ 通过 | narration 数字仍用 6px digit sprite 绘制,但游标步进改为 8px `PAL_CharWidth`,多位数字间距与尾随文字位置对齐。 |
| L35 | ✅ 通过 | 大世界仙术列表 cancel 从 `pick-spell` 直接置 `done`,不再回到 `pick-caster`;调用方按 done 关菜单回大世界。 |
| L36 | ✅ 通过 | `createMagicSelectMenu` 对已学 spell ObjectID 升序排序,与战斗法术菜单同源对齐 `magicmenu.c`。 |
| L37 | ✅ 通过 | 选施法人框只按 `hp<=0` 禁用,不再因没有大世界法术而灰掉活人;选中后进入空/全灰 spell 列表。 |
| L39 | ✅ 通过 | `filter='usable'` 时追加全队装备槽中本身 usable 的已装备物,且 `count=0,inUse=-1` 保证可确认。 |
| L40 | ✅ 通过 | 用物品目标框已用模块级 `sSelectedItemTargetSlot` 模拟 C static,确认/取消目标框时回写,重建目标框时越界归 0。 |
| L41 | ✅ 通过 | 单人队伍创建大世界仙术菜单时直接进入 `pick-spell` 并预建 spellMenu,跳过 1 项施法人框。 |
| L42 | ✅ 通过 | DOS splash 退出前调用 600ms palette `fadeOut`,最终 flush 全黑帧,避免满亮 splash 硬切 OpeningMenu。 |
| L43 | ✅ 通过 | Trademark fallback 默认淡出已改为 600ms,对齐 `PAL_FadeOut(1)`;1s 前置延时仍保留。 |
| L44 | ✅ 通过 | skip 分支先把标题可见高度强制补到完整高度并重绘 framebuffer,后续快进渐变/淡出只刷 palette 也不会冻在半高标题。 |
| L45 | ✅ 通过 | 结局女孩 walk frame 已改用 `Math.floor(performance.now()/50)%frameCount`,掉帧时按墙钟推进而非循环计数。 |
| L46 | ✅ 通过 | `createSfxDedup` 已接入 `playSfx`,同号未结束时抑制重叠,播放结束/加载失败/ctx 未运行会复位;helper 语义测试已覆盖。 |
| L47 | ✅ 通过 | AudioManager 保存 `curMusicLoop`,音乐开关重开和注入后端时按真实 loop 补播,不再硬编码循环。 |

## 速查索引

| ID | 严重度 | 类别 | 子系统 | 标题 |
|---|---|---|---|---|
| ✅ H1 | 🔴 | correctness | 存档·初始化与启动流程 | 新游戏不重置游戏状态(金钱/背包/毒/场景/经验/队伍/采集值/菜单光标全沿用上一局) |
| ✅ H2 | 🔴 | correctness | 菜单·主菜单/物品/装备/商店 | 大世界用物品选目标时,TS 把已阵亡(HP=0)队员标灰跳过,原版可对死人用药(复活类物品无法使用) |
| ✅ M1 | 🟠 | correctness | 事件脚本·对话与文本 | 姓名 title 识别漏 nCurrentDialogLine==0 限制 —— 段中第 2+ 行若以冒号结尾会被误当姓名牌、从正文丢失 |
| ✅ M2 | 🟠 | correctness | 事件脚本·数值与对象状态 | opcode 0x1A(SetPlayerStat)在非装备上下文丢弃 sprite/avatar/walkFrames/attackAll/合体魔法 行——剧情变身改不了角色造型 |
| ✅ M3 | 🟠 | pixel | 事件脚本·走位与场景控制 | NPC 走路帧循环硬编码 % 4，未按 nSpriteFrames 取模 → nSpriteFrames∈{1,2} 的 NPC 脚本走位时动画帧错乱 |
| ✅ M4 | 🟠 | timing | 事件脚本·走位与场景控制 | 0x7F 相对镜头多帧 pan 期间 autoScript 与追逐 timer 被冻结（C 每帧仍跑 PAL_GameUpdate） |
| ⏸ M5 | 🟠 | correctness | 大世界·走路跟随与碰撞 | 玩家走路/跟随缺少 fCheckRange 下边界(blockX=5/blockY=7),改用相机 clamp 取代 |
| ✅ M6 | 🟠 | correctness | 存档·初始化与启动流程 | 读档不清零 rgPlayerStatus(大世界施放的持久状态会跨存档残留) |
| ✅ M7 | 🟠 | correctness | 战斗·主循环与回合流程 | R(重提)/F(强行)键未做整队粘滞,只对当前队员生效 |
| ✅ M8 | 🟠 | timing | 战斗·动画与表现时序 | 混乱敌人攻击友敌完全没有动画(只结算伤害+即时弹数字) |
| ✅ M9 | 🟠 | timing | 战斗·召唤合击与变身 | 非召唤合击的法术效果音在派发瞬间立即播放，而非随 OffMagic 特效帧同步(早约 0.7 秒) |
| ✅ M10 | 🟠 | correctness | 战斗·法术伤害与治疗 | 大世界单体治疗(0x1B/1C/1D)未复刻 PAL_IncreaseHPMP 的“仅活人 + 无变化即失败”语义 |
| ✅ M11 | 🟠 | correctness | 战斗·脚本 opcode 与敌人 AI | 0x22 复活把目标全部毒清空,C 只清等级<=3 的毒 |
| ✅ M12 | 🟠 | correctness | 战斗·脚本 opcode 与敌人 AI | 0x29 给队员上毒未在施加当下跑毒的 playerScript(C 跑一次) |
| ✅ M13 | 🟠 | pixel | 渲染·字体与对话框 | narration 居中提示框(kDialogCenterWindow)被错误地画了 6px 投影阴影,原版无阴影 |
| ✅ M14 | 🟠 | pixel | 渲染·调色板与淡入淡出 | FadeToRed 的 0x4F→0x4E 像素重映射在战败 game-over 定格帧上从未生效 |
| ✅ M15 | 🟠 | pixel | 过场·整屏动画与结局 | DOS splash fallback 用 FBP chunk 3/4(WIN95 值)而非 DOS 的 0x26/0x27,背景图整张错 |
| ✅ L1 | 🟡 | correctness | 事件脚本·对话与文本 | 姓名 title 识别漏 kDialogCenter 排除条件 —— center 风格下以冒号结尾的对白被误当姓名牌画到左上角 |
| ✅ L2 | 🟡 | timing | 事件脚本·对话与文本 | fUserSkip 不跨行持续 —— 按一次确认只跳过当前行,无法像原版那样让整段剩余对白瞬显 |
| ✅ L3 | 🟡 | pixel | 事件脚本·走位与场景控制 | gs.wLayer（0x6E 设置的队伍层）在渲染层从未被使用，且换场景未重置 → 上下层走位时主角精灵 Y 偏移/遮挡排序错误 |
| ✅ L4 | 🟡 | correctness | 大世界·走路跟随与碰撞 | 明雷怪追击/NPC 走路逐帧推进硬编码 %4,未按 nSpriteFrames 取模(且 nSpriteFrames==0 仍推帧) |
| ✅ L5 | 🟡 | timing | 大世界·走路跟随与碰撞 | 站立帧未复刻 s_iThisStepFrame &= 2; ^= 2 的脚步相位翻转 |
| ✅ L6 | 🟡 | correctness | 存档·初始化与启动流程 | 读档/新游戏不复位物品菜单光标 iCurInvMenuItem |
| ✅ L7 | 🟡 | correctness | 存档·初始化与启动流程 | 读档不复位 sWaveProgression(屏幕波动增量随存档残留) |
| ✅ L8 | 🟡 | pixel | 战斗·UI 与像素布局 | 战斗法术选择叠加了 sdlpal 互斥的两套 MP/说明布局(金钱框+右侧MP+居中说明同屏) |
| ✅ L9 | 🟡 | pixel | 战斗·UI 与像素布局 | 战斗杂项→物品二级菜单时,父菜单『道具』高亮色用了闪烁选中色而非确认色(0x2C) |
| ✅ L10 | 🟡 | correctness | 战斗·主循环与回合流程 | 逃跑动作的 dex 倍率用浮点 ×0.5+四舍五入,而非 C 的整数 /2 |
| ✅ L11 | 🟡 | timing | 战斗·主循环与回合流程 | 敌方主动逃跑飞出屏后缺少 500ms 收尾停顿 |
| ✅ L12 | 🟡 | timing | 战斗·动画与表现时序 | 玩家物理攻击缺少出招前摇姿(frame 7 + Delay(4)),冲刺直接开始 |
| ✅ L13 | 🟡 | timing | 战斗·动画与表现时序 | 群攻每次挥砍后缺少 Delay(4) 收势停顿 |
| ⏸ L14 | 🟡 | timing | 战斗·动画与表现时序 | 玩家攻击魔法 OffMagic 缺少特效循环前的 Delay(1) 起手帧 |
| ✅ L15 | 🟡 | pixel | 战斗·动画与表现时序 | 战斗投掷/使用物品演出期间不显示物品名称标签 |
| ✅ L16 | 🟡 | timing | 战斗·动画与表现时序 | 敌方魔法命中前,被动格挡的队员未切到防御姿(frame 3) |
| ✅ L17 | 🟡 | correctness | 战斗·动画与表现时序 | keepEffect 烙背景的 wScreenWave<9 判定只用 magic.wWave,漏算战场基础屏波 |
| ✅ L18 | 🟡 | correctness | 战斗·召唤合击与变身 | 群攻/召唤/合击伤害对每个敌人共用同一随机系数，C 对每个敌人各掷一次 RandomFloat |
| ✅ L19 | 🟡 | timing | 战斗·召唤合击与变身 | 梦蛇变身切换到新精灵时直接硬切，缺少原版的淡入淡出过场 |
| ✅ L20 | 🟡 | correctness | 战斗·法术伤害与治疗 | AoE 法术伤害对所有目标共用同一个随机扰动因子,C 是每目标独立 RandomFloat |
| ⏸ L21 | 🟡 | correctness | 战斗·物理伤害公式 | 群攻 division 衰减:TS 跳过 health<=0 敌人不计 division,C 只跳 wObjectID==0(已清槽)且对任何未清槽敌都翻倍 |
| ✅ L22 | 🟡 | correctness | 战斗·物理伤害公式 | 敌普攻等价物中毒:TS 用 equivId!==0 短路,跳过了 C 对所有非格挡命中都会消费的 RandomLong(1,10) 抽取 |
| ✅ L23 | 🟡 | correctness | 战斗·结算与成长 | 战斗开始未把 HP=0 的队员复活为 1(且未清傀儡状态) |
| ✅ L24 | 🟡 | pixel | 战斗·结算与成长 | 隐藏属性涨点屏(hidden-exp-up)对 2 字角色名的文字 x 定位与原版不一致 |
| ✅ L25 | 🟡 | correctness | 战斗·脚本 opcode 与敌人 AI | 0x91 同种敌人判定用 enemyId,C 用 wObjectID(对象身份) |
| ✅ L26 | 🟡 | correctness | 战斗·脚本 opcode 与敌人 AI | 0x6A 偷钱在 c==0 时仍弹「获得 0 文钱」对话(C 仅 c>0 才显示) |
| ✅ L27 | 🟡 | correctness | 战斗·脚本 opcode 与敌人 AI | 0x28 全体上毒时,入口毒脚本以各敌自身 index 运行,C 统一用投掷目标 wEventObjectID |
| ✅ L28 | 🟡 | data | 提取·MKF 解码与数据表 | WORD.DAT 词条解析缺少 sdlpal 的尾部 '1' 截断,8 个法术/敌人名残留多余的「1」 |
| ✅ L29 | 🟡 | data | 提取·事件 bytecode 反编译 | slice/disasm 的 JUMP_TARGET_OPERAND 缺 13 个条件跳转 opcode,切片 BFS 丢弃 244 条可达指令 |
| ✅ L30 | 🟡 | timing | 渲染·地图瓦片与精灵 | 停步时未复现 s_iThisStepFrame 的 `&=2; ^=2` 复位,导致再次起步的首帧迈步腿相位不一致 |
| ✅ L31 | 🟡 | correctness | 渲染·地图瓦片与精灵 | cover-tile 扫描范围用 Math.floor 而非 C 的向零截断除法,精灵贴近地图左/上边缘时遮挡列判定偏移 |
| ✅ L32 | 🟡 | pixel | 渲染·地图瓦片与精灵 | layer-0 瓦片位图缺失时未回落到 tile(0,0,0,0),C 会用首格兜底填充 |
| ✅ L33 | 🟡 | pixel | 渲染·字体与对话框 | narration 框内数字字符步进用 6px(精灵宽),C 用 PAL_CharWidth(=8px) |
| ⏸ L34 | 🟡 | pixel | 渲染·调色板与淡入淡出 | 淡入淡出 ramp 在 C 里最高只到 60/64(93.75%)而 TS lerp 直插到 100% |
| ✅ L35 | 🟡 | correctness | 菜单·主菜单/物品/装备/商店 | 大世界仙术菜单:仙术列表按 Cancel 应直接关菜单回大世界,TS 却退回「选施法人」 |
| ✅ L36 | 🟡 | pixel | 菜单·主菜单/物品/装备/商店 | 仙术列表未按法术 ObjectID 升序排序,TS 按学会顺序(rgwMagic 槽位顺序)显示 |
| ✅ L37 | 🟡 | correctness | 菜单·主菜单/物品/装备/商店 | 大世界仙术「选施法人」框:TS 把无可用大世界法术的活人也标灰禁选,原版只按 HP>0 判定可选 |
| L38 | 🟡 | correctness | 菜单·主菜单/物品/装备/商店 | 菜单光标遇到禁用项会跳过,原版 PAL_ReadMenu/选人框/法术列表都是逐项移动并停在灰色项上 |
| ✅ L39 | 🟡 | correctness | 菜单·主菜单/物品/装备/商店 | 用物品列表未把「已装备但本身可用」的装备追加进列表 |
| ✅ L40 | 🟡 | correctness | 菜单·主菜单/物品/装备/商店 | 用物品选目标框的默认光标位置未跨次记忆(原版 sSelectedPlayer 为 static 持久) |
| ✅ L41 | 🟡 | correctness | 菜单·主菜单/物品/装备/商店 | 单人队伍开仙术菜单时,TS 仍弹出「选施法人」框,原版直接进法术列表 |
| ✅ L42 | 🟡 | timing | 过场·整屏动画与结局 | DOS splash 结束未做 PAL_FadeOut(1)(600ms 淡黑),直接硬切到 OpeningMenu |
| ✅ L43 | 🟡 | timing | 过场·整屏动画与结局 | Trademark fallback 淡出时长 1000ms,原版 PAL_FadeOut(1)=600ms |
| ✅ L44 | 🟡 | pixel | 过场·整屏动画与结局 | Splash 跳过时未先把标题位图补到完整高度再淡完,标题停在半长状态 |
| ✅ L45 | 🟡 | timing | 过场·整屏动画与结局 | 结局女孩动画帧用循环计数 i%4,原版用墙钟时间 (SDL_GetTicks()/50)%4 |
| ✅ L46 | 🟡 | correctness | 音频·BGM/SFX/CD 触发 | SFX 播放缺少 C 的 lastSFX 同号去重(同一声效可重叠叠播) |
| ✅ L47 | 🟡 | correctness | 音频·BGM/SFX/CD 触发 | 音乐开关重开 / 注入后端时硬编码 loop=true,会让非循环曲被错误循环 |

---

## 🔴 High（2）

### ✅ H1 · 🔴 新游戏不重置游戏状态(金钱/背包/毒/场景/经验/队伍/采集值/菜单光标全沿用上一局)

- **子系统**:存档·初始化与启动流程　**类别**:correctness
- **TS 位置**:`packages/game/src/shell/bootstrap.ts:1349-1389`
- **C 依据**:`reference/sdlpal/global.c:434-465`
- **玩家可感知**:是
- **修复补充**:`loadDefaultGame` 同时把 `currentSaveSlot` 归零,并把
  `memset(rgParty)+wMaxPartyMemberIndex=0` 正确映射为 `partyMembers=[0]`;避免读档后重开新游戏死亡时
  误载旧槽,以及 `skip-intro` 从 scene 1 启动时形成空队伍。opcode `0x4E` 在槽位 0 时直接重建
  默认新游戏,对齐 `PAL_InitGameData(0)`,不再把 0 当作 IndexedDB 存档槽读取;同时清除上一局的
  死亡/黑屏/fade/dialog 瞬态并恢复 primary palette。

**差异**:TS startNewGameFromPrimary 是唯一的新游戏入口,但它只做 hydratePlayerRolesRuntime + initExpLevelsFromLevels + updateAllEquipments 三件事,然后跑 primary scene 的 onEnter。它**不**清空 dwCash / inventory / rgPoisonStatus / partyMembers / trail / wCollectValue / nFollower / wChaseRange / wLayer / numPalette / nightPalette / wNumScene / iCurMainMenuItem / iCurInvMenuItem / Exp.wExp / rgScene / sceneOnEnterIp / rgEventObject 等。createInitialGameState 只在 boot 时调一次(bootstrap.ts:244)。C 真值:每次开新游戏经 PAL_GameMain→PAL_ReloadInNextTick(0)→PAL_InitGameData(0)→PAL_LoadDefaultGame(),后者把 dwCash=0/wNumMusic=0/wNumPalette=0/wNumScene=1/wCollectValue=0/fNightPalette=FALSE/wMaxPartyMemberIndex=0/viewport=(0,0)/wLayer=0/nFollower=0/wChaseRange=1 全部硬复位,并 memset rgInventory/rgPoisonStatus/rgParty/rgTrail/Exp 为 0,再把 8 类经验 wLevel 设为角色等级。差异触发路径真实存在:returnToTitle()(bootstrap.ts:1495)被 opcode 0xA0 quit(结局)和系统菜单 QUIT(setSystemQuitHandler,bootstrap.ts:1503)调用,回到 OpeningMenu;再选『新的故事』就第二次调 startNewGameFromPrimary,此时 gs 还残留上一局/结局态(wNumScene 可能是 281+1 等),onEnterSceneId:gs.wNumScene 也用了过期场景号。

**玩家影响**:通关或在系统菜单退出回标题后,选『新的故事』开新档,会带着上一周目的金钱、背包道具、中毒状态、经验、队员、当前场景等进入『新游戏』——存档完全不干净,可能直接黑屏/错位或满背包满金钱开局。原版每次新游戏都是彻底空档。

**复核论证**:差异属实。核对结论:

【TS 侧机制】createInitialGameState(全字段干净默认:dwCash=0/wNumScene=0/wCollectValue=0/menu cursor=0/Exp empty 等,game-state.ts:1545-1610)是 PAL_LoadDefaultGame 的等价物,但只在 boot 调一次(bootstrap.ts:244)。同样只在 boot 跑的还有 gs.partyMembers=[0](247)与 gs.wNumScene=SCENE_ID+1(250)。唯一新游戏入口 startNewGameFromPrimary(bootstrap.ts:1349-1389)只做三件事:hydratePlayerRolesRuntime(game-state.ts:1218,重置 per-role HP/MP/stat/装备/法术)+ initExpLevelsFromLevels(1193,只重置 Exp 各类 wLevel,不动 wExp)+ updateAllEquipments(equip-effect.ts:460,从 rgwEquipment 重算 effect)。这三者均**不**清 dwCash/inventory/rgPoisonStatus/partyMembers/trail/wCollectValue/nFollower/wChaseRange/wLayer/numPalette/nightPalette/wNumScene/iCurMainMenuItem/iCurInvMenuItem/Exp.wExp/rgScene/sceneOnEnterIp/rgEventObject。且 1370/1375/1379 读 gs.wNumScene 作 override-IP 与 onEnterSceneId——二周目时为上一局/结局残留场景号(如 282)。

【对比 LOAD 路径】loadGameFromSlot(bootstrap.ts:1429-1475)用 Object.assign(gs, loadedGs) 整体覆盖 gs,故读档干净;新游戏路径无此整体重置——不对称坐实漏洞。

【C 真值】PAL_InitGameData(0)(global.c:915-954):iSaveSlot==0 走 PAL_LoadDefaultGame()(940/945);LoadDefaultGame(434-465)硬复位 dwCash=0/wNumScene=1/wCollectValue=0/fNightPalette=FALSE/wMaxPartyMemberIndex=0/viewport=0/wLayer=0/nFollower=0/wChaseRange=1,memset rgInventory/rgPoisonStatus/rgParty/rgTrail/Exp(449-453),并把 8 类 wLevel 设为角色等级(455-465);InitGameData 还额外 iCurInvMenuItem=0(948)+ memset rgPlayerStatus(951)+ UpdateEquipments(953)。reload 经 PAL_LoadResources kLoadGlobalData→PAL_InitGameData(res.c:220-222),由 PAL_GameMain 的 PAL_ReloadInNextTick(game.c:54)驱动。

【触发路径核实——真实可达】opcode 0xA0:event-system.ts:2041-2042 调 _quitHandler→bootstrap.ts:1508-1524(WIN95 播 4/5/6.mp4)→returnToTitle();系统菜单 QUIT:menu-driver.ts:482 _systemQuitHandler→bootstrap.ts:1503 returnToTitle。returnToTitle(1495-1499)仅置 menuStack=opening+mode=menu,**不重建 gs**;OpeningMenu 选新游戏→setStartGameHandler(1527-1529)二次调 startNewGameFromPrimary,gs 全程残留。

【关键背景——为何 C 无此问题】C 两条退出路径都调 PAL_Shutdown(0):opcode 0xA0(script.c:2995)、PAL_QuitGame 系统菜单 QUIT(uigame.c:2074)。PAL_Shutdown(main.c:163-172)PAL_FreeGlobals 后 longjmp/exit(0)**直接退进程**。即原版/ sdlpal 根本没有"会话内回标题再开新档"流程——重开必重启程序,gpGlobals 全新归零。TS 的 returnToTitle 是浏览器无法退进程的有意适配,但适配时漏掉了给新游戏入口配套 PAL_InitGameData(0) 级别的整体重置,制造了 C 从不需要处理的 divergence。声称里"C 每次开新游戏经 PAL_InitGameData(0)→PAL_LoadDefaultGame"对重置内容描述准确,只是该路径在 C 里靠重启程序达成而非会话内 returnToTitle。

**C 源证据**:global.c:434-465 PAL_LoadDefaultGame 硬复位 dwCash/wNumScene=1/wCollectValue/fNightPalette/wMaxPartyMemberIndex/viewport/wLayer/nFollower/wChaseRange + memset rgInventory/rgPoisonStatus/rgParty/rgTrail/Exp + 8 类 wLevel=角色等级;global.c:915-954 PAL_InitGameData(iSaveSlot==0→LoadDefaultGame,948 iCurInvMenuItem=0,951 memset rgPlayerStatus,953 UpdateEquipments);res.c:220-222 kLoadGlobalData→PAL_InitGameData;game.c:48-54 PAL_GameMain OpeningMenu→ReloadInNextTick;script.c:2988-2996 opcode 0xA0→PAL_Shutdown(0);uigame.c:2059-2074 PAL_QuitGame→PAL_Shutdown(0);main.c:148-176 PAL_Shutdown FreeGlobals+exit(进程退出,非回标题)。TS:bootstrap.ts:244/247/250(boot 一次性 init)、1349-1389(startNewGameFromPrimary 仅三件事+读 stale gs.wNumScene)、1429-1475(load 走 Object.assign 整体覆盖,对比不对称)、1495-1499(returnToTitle 不重建 gs)、1503/1508-1529(quit→returnToTitle→二次 startNewGameFromPrimary);event-system.ts:2041-2042 与 menu-driver.ts:482 触发钩子。


### ✅ H2 · 🔴 大世界用物品选目标时,TS 把已阵亡(HP=0)队员标灰跳过,原版可对死人用药(复活类物品无法使用)

- **子系统**:菜单·主菜单/物品/装备/商店　**类别**:correctness
- **TS 位置**:`packages/game/src/core/menu/inventory-menu.ts:219-225 (confirmInventoryItem targetItems 设 disabled: r.hp<=0)`
- **C 依据**:`reference/sdlpal/uigame.c:1383-1396, 1473-1495`
- **玩家可感知**:是

**差异**:C 的 PAL_ItemUseMenu 对队员目标选择**没有任何 disabled / 阵亡判定**:名字一律用 MENUITEM_COLOR/选中闪烁色画(uigame.c:1383-1396),按 Enter 无条件 `return rgParty[sSelectedPlayer].wPlayerRole`(uigame.c:1493-1495),死人也能被选中作为目标——这是还魂香/赎魂灯/孟婆汤/天香续命露(items 95-98,0x22 OP_REVIVE_PLAYER)等复活类物品的必要前提。TS confirmInventoryItem 给 targetMenu 项设 `disabled: r.hp <= 0`,且 primitives.findNextSelectable 会跳过 disabled 项,导致光标根本无法停在死亡队员上。

**玩家影响**:大世界里队员阵亡后,玩家无法用还魂香/孟婆汤等复活药把他救起来(死人在选目标列表里是灰色且光标跳过),与原版可对死人用复活药的行为不符,可能让玩家以为复活药只能在战斗里用。

**复核论证**:差异属实，且玩家可感知，应推翻"误报"的尝试失败。

1) C 的目标选择 PAL_ItemUseMenu(uigame.c:1289-1500)确实无任何阵亡/disabled 判定：循环 i=0..wMaxPartyMemberIndex 把全体队员名字一律按 bSelectedColor / MENUITEM_COLOR 画(1383-1396),按 Enter(kKeySearch)无条件 `return gpGlobals->rgParty[sSelectedPlayer].wPlayerRole`(1493-1495)。死人可被选中作目标。

2) 入口流程 play.c:264-303 证实这是大世界唯一用物品路径:PAL_GameUseItem → PAL_ItemSelectMenu(kItemFlagUsable) 选物品 → 对非 applyToAll 物品在 INNER while 里反复调 PAL_ItemUseMenu(282) 选目标 → 跑 scriptOnUse → 仅 g_fScriptSuccess 时消耗(298-301)。

3) TS 注释引用的 itemmenu.c:287-291 是物品"选择"的可用性闸(对应 confirmInventoryItem 的 `!item.flags.usable || count-inUse<=0`,这部分正确),与争议无关。争议的 `disabled: r.hp<=0` 加在"目标"菜单(对应 uigame.c 的 PAL_ItemUseMenu),而 C 在该处无任何过滤——TS 凭空多了一道阵亡过滤。

4) 玩家影响真实:OP_REVIVE_PLAYER 0x22(script.c:1052-1102)单体路径(operand[0]=0)仅在 `rgwHP[wEventObjectID]==0` 时复活(1086),否则 g_fScriptSuccess=FALSE(1099)→ 物品不消耗。即复活药"必须"选中死者。提取数据证实 items 95/96/97/98(还魂香/赎魂灯/孟婆汤/天香续命露)均 usable+consuming+applyToAll:false,scriptOnUse 全指向 opcode 34(0x22)单体复活(operands [0,1/3/5/10,0])→ 全部走 per-player 目标路径。

5) TS 机制坐实封死:primitives.ts createSelectionMenu 初始光标取 `findIndex(!disabled)`(:57),findNextSelectable 上下移动跳过 disabled(:67-75)。死者 hp<=0 → disabled=true → 光标永远停不上去。menu-driver.ts:116-118 menuRoles 取 PlayerRolesRuntime 实时 HP,死者确为 hp<=0。event-system.ts:3877-3906 的 TS 复活 handler 本身正确(仅对 HP==0 生效),所以菜单 disabled 是唯一拦路。

结论:大世界队员阵亡后,玩家在物品目标菜单里根本无法把光标移到死者身上,四种复活药因而在大世界完全无法对死者使用——与原版可对死人用复活药、且复活药本就只对死者生效的设计直接冲突。属确认的高严重度回归,玩家可直接感知(野外团灭/单人倒地无法靠药复活,只能靠战斗内或客栈等其它机制)。

**C 源证据**:reference/sdlpal/uigame.c:1383-1396(目标循环无阵亡判定,全员 MENUITEM_COLOR/选中色);uigame.c:1493-1495(Enter 无条件 return rgParty[sSelectedPlayer].wPlayerRole);reference/sdlpal/play.c:266,273,282,298-301(PAL_GameUseItem 非 applyToAll 走 PAL_ItemUseMenu 选目标,仅 g_fScriptSuccess 消耗);reference/sdlpal/script.c:1086-1099(OP 0x22 单体复活仅 rgwHP==0 生效,否则 g_fScriptSuccess=FALSE);提取 data/extracted/data/items.json items 95-98 = usable+consuming+applyToAll:false + events/all.json @43024/43026/39221/39223 opcode=34 operands[0]=0(单体复活);TS:packages/game/src/core/menu/inventory-menu.ts:218-223(disabled:r.hp<=0)、primitives.ts:57,67-75(光标跳过 disabled)、menu-driver.ts:116-118,638(menuRoles 实时 HP)、event-system.ts:3877-3906(复活 handler 仅 HP==0)。


## 🟠 Medium（15）

### ✅ M1 · 🟠 姓名 title 识别漏 nCurrentDialogLine==0 限制 —— 段中第 2+ 行若以冒号结尾会被误当姓名牌、从正文丢失

- **子系统**:事件脚本·对话与文本　**类别**:correctness
- **TS 位置**:`packages/game/src/present/dialog-box.ts:315 (appendDialogLine)`
- **C 依据**:`reference/sdlpal/text.c:1715`
- **玩家可感知**:是

**差异**:C 只在 `nCurrentDialogLine == 0`(当前页第一行)时才把冒号结尾行识别成姓名 title(text.c:1715);页内第 2、3、4 行即便末字是冒号,也按正文 TEXT_DisplayText 画并 nCurrentDialogLine++。TS appendDialogLine(dialog-box.ts:315)无条件 `if (isCharacterNameLine(parsed.text))`,不检查 state.dialogLineCount 是否为 0;只要续行末字是 ：/∶/:,就把它塞进 titleText、不进 shownLines、不计行。真实数据复现:all.json 段内 idx 20043-20050(setDialogStyleTop;'算命仙∶'(line0 title);'公子真是贵人多忘事';0x8E;'贫道曾经在苏州替你和另一位';'小姑娘看过相。结果公子说∶';'贫道胡言乱语，拒不付钱';...)。其中 '小姑娘看过相。结果公子说∶' 在 C 中处于 nCurrentDialogLine==1(非 0)→ 不是姓名 → 当作正文第 1 行显示;TS 因末字是 ∶ 把它当 title,覆盖既有 '算命仙' titleText 并从正文移除,该整句不再出现在对白正文里。

**玩家影响**:以冒号结尾的旁白/转述句(如"…结果公子说∶")若出现在一页对白的非首行,TS 会把这句话从对白正文里抹掉、改写成左上角姓名牌(还覆盖了真正的说话者名字"算命仙"),玩家漏看这一句剧情文本且姓名牌显示错乱。

**复核论证**:核对 C 真值 reference/sdlpal/text.c:1715-1726：姓名 title 识别需同时满足三条件 `g_TextLib.nCurrentDialogLine == 0 && bDialogPosition != kDialogCenter && (末字==0xff1a/0x2236/':')`，否则走 else 分支按正文 TEXT_DisplayText 画并 nCurrentDialogLine++（text.c:1737/1746）。TS dialog-box.ts:315 的 appendDialogLine 只判 `if (isCharacterNameLine(parsed.text))`（仅末字冒号测试，dialog-box.ts:194-197），完全不检查 state.dialogLineCount 是否为 0——这是真实漏检。注意 TS 在 startDialogLine（首行，必为 line0）已隐式等价 C 的 count==0，但续行 appendDialogLine 缺这道闸。

数据复现核实：data/extracted/events/all.json segments[0].commands 实测 idx 20042 raw opcode5(ClearDialog)、20043 setDialogStyleTop、20044 '算命仙∶'、20045 '公子真是贵人多忘事'、20046 raw opcode142(0x8E RestoreScreen)、20047 '贫道曾经在苏州替你和另一位'、20048 '小姑娘看过相。结果公子说∶'（claim 给的 idx 略偏但内容完全一致，是苏州算命仙主线对白）。深挖发现 0x8E(script.c:3428-3436) 调 PAL_ClearDialog(TRUE)→text.c:1775 把 nCurrentDialogLine 复位 0；TS 对应 event-system.ts:1655-1676 走 partialClear/resetDialogBody(dialog-box.ts:404-417 置 dialogLineCount=0、保留 titleText)。故 C 与 TS 在 20048 入口处行计数均为 1（非 0，因 20047 是复位后的 line0）。claim 说"处于 line1"结论正确，仅中间值推理路径不同（claim 漏算 0x8E 复位），不影响判定。

经验证 C 在 20048 因 nCurrentDialogLine==1≠0 → 当正文画；TS 因末字 ∶ 无条件当 title → state.titleText 被覆盖成 '小姑娘看过相。结果公子说∶'、该句不进 shownLines/不进 currentLineText、return。我写最小复现测试（startDialogLine 算命仙∶ → append 公子真是… → resetDialogBody 模拟0x8E → append 贫道… → append 小姑娘…）断言 `bodyHas===false` 且 `titleText==='小姑娘看过相。结果公子说∶'` 全部通过，实证该句从正文消失且姓名牌"算命仙"被覆盖。渲染层 dialog-box.ts:578-580 无条件按 CYAN_ALT 画 titleText，无补偿守卫。现有测试 dialog-box.test.ts:200-206 只覆盖 title 不计行、未覆盖"续行冒号"场景，说明这是移植遗漏而非有意决策。

**C 源证据**:reference/sdlpal/text.c:1715-1726（title 识别三条件含 nCurrentDialogLine==0；不满足则 else 按正文画+ ++，text.c:1737/1746）；text.c:1552（`~`→ -1）；text.c:1775（PAL_ClearDialog 置 0）；reference/sdlpal/script.c:3428-3436（0x8E RestoreScreen 调 PAL_ClearDialog(TRUE)）。TS：packages/game/src/present/dialog-box.ts:315（appendDialogLine 无条件 isCharacterNameLine，未判 dialogLineCount==0）对照 dialog-box.ts:336 已正确实现行计数。数据：data/extracted/events/all.json idx 20044-20048（算命仙/小姑娘看过相。结果公子说∶）。


### ✅ M2 · 🟠 opcode 0x1A(SetPlayerStat)在非装备上下文丢弃 sprite/avatar/walkFrames/attackAll/合体魔法 行——剧情变身改不了角色造型

- **子系统**:事件脚本·数值与对象状态　**类别**:correctness
- **TS 位置**:`packages/game/src/core/equip-effect.ts:186-211 (setPlayerStatRow,经 event-system.ts:3831-3845 OP_SET_PLAYER_STAT 调用)`
- **C 依据**:`reference/sdlpal/script.c:834-865`
- **玩家可感知**:是
- **修复审查(2026-06-07)**:已收口。`setPlayerStatRow` 支持 row0/1/2/4/64/65,`hydratePlayerRolesRuntime`、`projectRuntimeToBattleRoles` 与 `presentFrame` 会让头像、战斗精灵、群攻、合体魔法、大世界精灵、leader/follower 行走帧都消费 runtime 值。

**差异**:sdlpal 0x1A 把整张 PlayerRoles 当扁平 WORD 数组写:`p[operand[0]*MAX_PLAYER_ROLES+role]=(SHORT)operand[1]`(script.c:862),**任何 row 都能写**——包括 row0=Avatar、row1=SpriteNumInBattle、row2=SpriteNum、row4=AttackAll、row64=WalkFrames、row65=CooperativeMagic。TS 只在 `g_iCurEquipPart!=-1`(装备脚本中)才走 writeEquipmentEffectField(全 row 覆盖);否则走 setPlayerStatRow 基路径,其 switch(equip-effect.ts:196-208)只有 Level/MaxHP/MaxMP/HP/MP/Atk/MagStr/Def/Dex/Flee/PoisonResist/CoveredBy 12 个 case,其余 row 落 default → `console.warn`+**no-op**。经 all.json 逐字节核实:有 4 段**非装备**剧情脚本用 0x1A 写这些 row(全部 hasEquip0x18=false):cmd@24099-24102(赵灵儿 role1 变镇狱明王:avatar=91/battleSprite=5/sprite=512/walkFrames=4)、@24774(role2 walkFrames=4)、@28467-28470(赵灵儿 sleep 形:avatar=11/battleSprite=1/sprite=3/walkFrames=3)、@31630-31632(role1:avatar=88/sprite=38/battleSprite=9)。这些写入在 TS 全部静默失败(setPlayerStatRow 不路由这些 row;其中 avatar/spriteNumInBattle/walkFrames 在 PlayerRolesRuntime 连字段都没有,而 sprite(row2)/合体魔法(row65)虽有字段也因 switch 不含 case 而 no-op)。注:装备脚本里的 0x1A(@39671+ 等)经 iCurEquipPart 路由到 writeEquipmentEffectField,行为正确,不受影响。

**玩家影响**:结局/关键剧情的角色变身演出造型不更新:赵灵儿变身镇狱明王(水魔兽)时大世界精灵(row2=512)、战斗精灵(row1=5)、头像(row0=91)、行走帧(row64=4)都不生效,玩家看到的仍是旧造型;赵灵儿入睡形、@31630 变身同样失效。原版这些是可见的造型切换。

**复核论证**:核对全部成立，且为真实缺陷。

【C 真值】script.c:838-863:0x1A 把 `&gpGlobals->g.PlayerRoles` cast 成 `WORD*`,写 `p[operand[0]*MAX_PLAYER_ROLES + role] = (SHORT)operand[1]`,任何 row 都可写;仅当 g_iCurEquipPart != -1(841-846)才改写 rgEquipmentEffect。g_iCurEquipPart 只在 0x18(script.c:773)置位、在 PAL_RunTriggerScript 末尾(script.c:3476)与初始(script.c:28)为 -1。

【row 索引】global.h:299-336 + palcommon.h:45(MAX_PLAYER_ROLES=6):rgwAvatar=row0、rgwSpriteNumInBattle=row1、rgwSpriteNum=row2、rgwAttackAll=row4、rgwLevel=row6、rgwCoveredBy=row31、rgwWalkFrames=row64、rgwCooperativeMagic=row65 —— 与 TS PLAYERROLES_ROW(equip-effect.ts:94-118)逐一吻合。

【TS 基路径丢行】equip-effect.ts:191-211:iCurEquipPart==-1 时走 setPlayerStatRow,switch 只有 Level/MaxHP/MaxMP/HP/MP/Atk/MagStr/Def/Dex/Flee/PoisonResist/CoveredBy 12 个 case;row0/1/2/4/64/65 全落 default → console.warn → no-op(equip-effect.ts:209-210)。即便 row2(SPRITE_NUM)在 PlayerRolesRuntime 有字段 rgwSpriteNum(game-state.ts:459)且被渲染读取(getOverworldSpriteNum,game-state.ts:1477),switch 也不路由它 → 仍 no-op。

【bytecode 逐字节核实】data/extracted/events/all.json segments[0].commands:@24099-24102=0x1A[0,91,2]/[1,5,2]/[2,512,2]/[64,4,2];@24774=[64,4,2];@28467-28470=[0,11,2]/[1,1,2]/[2,3,2]/[64,3,2];@31630-31632=[0,88,2]/[2,38,2]/[1,9,2] —— 与声称完全一致。从各点向前扫到最近 end 边界(23974/24768/28466/31562)均无 0x18;全部 0x18(decimal 24)聚集在 38789-39705 的装备脚本区,故这四段确以 iCurEquipPart=-1 跑基路径。operand[2]=2 → roleId=2-1=1(赵灵儿,event-system.ts:3835-3837 与 C script.c:859 一致)。

【原版可见】scene.c:213+res.c:325(大世界精灵←rgwSpriteNum)、scene.c:678/750(行走帧布局←rgwWalkFrames)、global.c:1999(战斗精灵←rgwSpriteNumInBattle,再叠装备)、uigame.c:1132(头像←rgwAvatar)均直接读 PlayerRoles 实时值,故 sdlpal 中这四处写入立即体现为造型切换。

【TS 即便想画也画不出】projectRuntimeToBattleRoles(game-state.ts:1335)把 avatar/walkFrames/sounds 当 ...base 不可变;spriteNumInBattle(1346)只取装备 override 或 base,无 runtime base 落点;状态头像读静态 role.avatar(draw-player-status.ts:175);partyWalkFrames 在 bootstrap.ts:307 硬编码为 3。变身角色(roleId1)的大世界精灵也无 0x65 兜底——同 run 里的 0x65(op101)只作用于 role0(@24099run 23977/24016=role0;@31630run 31564/31633=role0;@28467run 无 0x65),故 roleId1 的精灵改动彻底丢失。

【声称中的小瑕疵】描述称这些字段"在 PlayerRolesRuntime 里根本无对应字段"——对 avatar/spriteNumInBattle/walkFrames 成立,但 SPRITE_NUM(row2)与 COOPERATIVE_MAGIC(row65)实有字段。然这不改变结论:setPlayerStatRow 仍不路由 row2/65 → 仍 no-op,缺陷与玩家影响成立。

**C 源证据**:script.c:838-863(0x1A flat WORD 写,任何 row;841-846 仅 equip 上下文改 effect);script.c:28/773/3476(g_iCurEquipPart 生命周期);global.h:299-336 + palcommon.h:45(PLAYERROLES 布局 + MAX_PLAYER_ROLES=6,确认 Avatar=0/SpriteInBattle=1/Sprite=2/AttackAll=4/WalkFrames=64/CoopMagic=65);res.c:325/385 与 scene.c:213(大世界精灵 ← rgwSpriteNum);scene.c:678/750/759(站立/行走帧 ← rgwWalkFrames);global.c:1999-2005(战斗精灵 ← rgwSpriteNumInBattle);uigame.c:1132(头像 ← rgwAvatar)。TS 侧:equip-effect.ts:196-211(setPlayerStatRow 仅 12 case,其余 no-op)、event-system.ts:3831-3845(OP_SET_PLAYER_STAT 路由)、game-state.ts:1335/1346/1477(avatar/walkFrames 不可变、spriteNumInBattle 无 runtime base、getOverworldSpriteNum 读 rgwSpriteNum)、draw-player-status.ts:175(静态 avatar)、bootstrap.ts:307(walkFrames 硬编码 3);all.json 命令 @24099-24102/@24774/@28467-28470/@31630-31632(全 0x18 在 38789-39705,四点 run 内无 0x18)。


### ✅ M3 · 🟠 NPC 走路帧循环硬编码 % 4，未按 nSpriteFrames 取模 → nSpriteFrames∈{1,2} 的 NPC 脚本走位时动画帧错乱

- **子系统**:事件脚本·走位与场景控制　**类别**:pixel
- **TS 位置**:`packages/game/src/core/event-system.ts:4663 (npcWalkTo)、3499 (0x0B-0x0E)、3616 (0x6C)、3648 (0x87)、4916 (0x4C monsterChase)`
- **C 依据**:`reference/sdlpal/scene.c:893-901 (PAL_NPCWalkOneStep)`
- **玩家可感知**:是

**差异**:C 的 PAL_NPCWalkOneStep 推进帧用 `wCurrentFrameNum %= (nSpriteFrames==3 ? 4 : nSpriteFrames)`，nSpriteFrames==0 时退到 `%= nSpriteFramesAuto`。TS 在所有走路/动画 opcode 里统一硬编码 `(scriptedFrame+1) % 4`（代码注释自承“M5 简版…默认 mod 4，真 nSpriteFrames 拿不到”）。但 NpcState 实际已携带 nSpriteFrames（game-state.ts:1641/1678 已填充）。提取数据 event-objects.json 中 nSpriteFrames 分布为 0:3335 / 1:372 / 2:262 / 3:896 / 4:212 —— 即存在大量 nSpriteFrames=1 或 2 的对象。对 nSpriteFrames==2 的 NPC：C 帧循环 0,1,0,1（mod 2），TS 走 0,1,2,3（mod 4）；渲染 spriteIdx = direction*nSpriteFrames + frame，TS 的帧 2/3 会越界读进相邻方向的精灵帧 → 动画错位/串帧。nSpriteFrames==1 同理（C 恒 0，TS 0~3）。nSpriteFrames==3（mod 4）与 4（mod 4）恰好与硬编码一致，所以只在 {1,2} 出问题。

**玩家影响**:走路帧数不是 3/4 的 NPC（约 600+ 个对象 nSpriteFrames∈{1,2}）被脚本驱动行走/做动画（巡逻 autoScript、cutscene 0x10/0x6C/0x87 等）时，会出现帧错乱或闪现到错误朝向的精灵，走路动画不正确。

**复核论证**:差异属实，且经真实游戏数据验证可达、玩家可感知（纯像素层串帧）。

C 真值链：
- scene.c:893-896 PAL_NPCWalkOneStep 推进帧 `wCurrentFrameNum %= (nSpriteFrames==3 ? 4 : nSpriteFrames)`；nSpriteFrames==0 时退到 `%= nSpriteFramesAuto`(898-901)。
- scene.c:262-280 渲染 `iFrame = wCurrentFrameNum`；仅 nSpriteFrames==3 做 2/3 重映射；`lpFrame = PAL_SpriteGetFrame(lpSprite, wDirection*nSpriteFrames + iFrame)`。nSpriteFrames 是“单方向帧数”，整个 sprite chunk 含 4 方向全部帧。
- palcommon.c PAL_SpriteGetFrame：iFrame 越界返回 NULL → 该精灵整帧 skip(scene.c:282-285 continue)。
- 0x87(script.c:2540-2545)= PAL_NPCWalkOneStep(id,0)，0x10(script.c:677-686)、0x0B-0x0E、0x6C 同样只推进 wCurrentFrameNum，全部走 scene.c:896 的封顶模。

TS 实现：
- event-system.ts:3499/3616/3648/3663(0x87 handler 3643-3651)/4663(npcWalkTo)/4916(monsterChase) 全部硬编码 `(scriptedFrame+1) % 4`，注释自承“真 nSpriteFrames 拿不到，默认 mod 4”。
- 渲染 present.ts:456-465：`iFrame = scriptedFrame ?? 0`，仅 nSpriteFrames===3 重映射(460-463)，随后 `idx = dir*nSpriteFrames + iFrame`，再 `frames[idx] ?? frames[0]`。对 nSpriteFrames∈{1,2} 未再取模，过度循环的 2/3 直接进 idx。

为何渲染层持有 nSpriteFrames 却仍错：game-state.ts:1641/1678 确实把 nSpriteFrames 填入 NpcState，渲染也用它算 idx，但 scriptedFrame 已在 event-system 用 %4 推进过，渲染层没有补 `%nSpriteFrames`，所以 idx 越界/串方向。

真实数据可达性(data/extracted)：
- nSpriteFrames 分布 0:3335 / 1:372 / 2:262 / 3:896 / 4:212，与声称一致；nSF=2 有 autoLabel 的 257/262，nSF=1 有 205/372。
- id 91 sprite46(nSF=2,8 帧=4×2) autoScript L_36252 = 0x87 / 0x06 / 0x0E(向东 dir=3) / end advance；每循环推进帧 2 次。dir=3 时 TS idx=3*2+{0,1,2,3}={6,7,8,9}，8/9 越界 → 回退 frames[0](朝南站立)；C 封顶 0/1 → idx 6/7 始终在“东”块。玩家看到 NPC 走路途中闪到朝下姿势。
- id 92 sprite47(nSF=2,18 帧) autoScript L_36275 = 0x87 / 0x06 / 0x0B×2(向南 dir=0)。dir=0 时 TS idx=0*2+{0,1,2,3}，帧 2/3 落入 dir=1(西)块 → 朝南行走时混入朝西帧(串帧)。
- id 2113 sprite301(nSF=1,4 帧=4×1,dir=3) autoScript L_36524 含推帧 opcode。C 恒 idx=3；TS idx=3*1+{0,1,2,3}={3,4,5,6}，4/5/6 越界 → 回退 frames[0](朝下)，4 步里 3 步显示错向。

autoScript 驱动器(event-system.ts:1225-1279 raw 分支 + 1273 applyRawOpcode)每帧跑约一条 op，goto 不耗帧，循环体无限重复，故过度循环的帧 2/3 是持续性命中，非偶发。nSpriteFrames==3、==4 因 mod 4 与 mod(3→4)/mod 4 恰好等价(C 对 3 也是 mod 4)而不出问题，正与声称一致。

**C 源证据**:reference/sdlpal/scene.c:893-896（帧推进封顶模 `%= (nSpriteFrames==3?4:nSpriteFrames)`，898-901 退到 nSpriteFramesAuto）；scene.c:262-280（iFrame、仅 nSF==3 重映射、idx=wDirection*nSpriteFrames+iFrame）；reference/sdlpal/palcommon.c PAL_SpriteGetFrame（越界返回 NULL → 整帧 skip）；script.c:2540-2545(0x87=PAL_NPCWalkOneStep(id,0))/677-686(0x10)/652-655(0x0B-0x0E)/2056-2063(0x6C) 均只推进 wCurrentFrameNum。对照 TS：event-system.ts:3499/3616/3648/4663/4916 硬编码 %4，present.ts:456-465 渲染对 nSF∈{1,2} 未补取模。真值数据：data/extracted/data/event-objects.json(分布 + id91/92/93/2113 的 nSpriteFrames 与 autoLabel)，data/extracted/events/all.json(L_36252/L_36275/L_36311/L_36524 含 0x87/0x0B/0x0E)，data/extracted/data/sprite/46.json(8 帧)/47.json(18 帧)/301.json(4 帧)。


### ✅ M4 · 🟠 0x7F 相对镜头多帧 pan 期间 autoScript 与追逐 timer 被冻结（C 每帧仍跑 PAL_GameUpdate）

- **子系统**:事件脚本·走位与场景控制　**类别**:timing
- **TS 位置**:`packages/game/src/core/mode.ts:36-39 (shouldRunAutoScripts 白名单)；event-system.ts:1317-1331 (camera-pan tick)`
- **C 依据**:`reference/sdlpal/script.c:2364-2366 (相对 pan 内 `if (op2!=0xFFFF) PAL_GameUpdate(FALSE)`)；play.c:172-192 (autoScript 循环)`
- **玩家可感知**:是

**差异**:C 的 0x7F 相对 pan（op2 != 0xFFFF）在 do-while 每一帧都调 `PAL_GameUpdate(FALSE)`（script.c:2366），因此 pan 进行中所有场景对象的 autoScript 照常推进、wChasespeedChangeCycles 也照常自减。TS 把多帧 pan 实现为 cursor.waiting='camera-pan' 逐 tick 移 camera，但 mode.ts 的 shouldRunAutoScripts 白名单只放行 waiting ∈ {undefined, 'frame-wait', 'scene-fade'}，**不含 'camera-pan'** → 整个 pan 期间 tickAutoScripts 和 tickChaseTimer 都不跑。对比之下 party-walk/ride 用 waiting=undefined（在白名单内）所以那条路径没问题，camera-pan 是唯一漏掉的。

**玩家影响**:在“镜头平移同时有 NPC 靠 autoScript 走动/动画”的过场里（0x7F 站点很多），TS 中 NPC 会在镜头平移那几帧里静止不动，平移结束才恢复，与原版“边平移边动”的演出不符；追逐计时器（驱魔香/十里香）也会少扣这几帧。

**复核论证**:差异属实(confirmed)。

C 真值链完整成立：相对 pan 在 script.c:2366 每帧调 `PAL_GameUpdate(FALSE)`，而 PAL_GameUpdate 的 autoScript 循环(play.c:169-192)与 wChasespeedChangeCycles 自减(play.c:235-238)都在 fTrigger 守卫(play.c:51)之外 → pan 进行中每帧都推进 NPC autoScript 和追逐计时器。

TS 侧：event-system.ts:2066-2082 把 0x7F 多帧相对 pan(isPan && frames>1)设为 cursor.waiting='camera-pan' 后 return；逐 tick 由 1317-1331 只移 gs.camera + 自减计数，不跑 autoScript/chase。mode.ts:35-39 的 shouldRunAutoScripts 白名单 = {undefined, 'frame-wait', 'scene-fade'}，确实不含 'camera-pan'(我核对了 game-state.ts:225 的 waiting 联合类型，'camera-pan' 是真实独立态)。整个 pan 期间 mode==='event' 且 waiting==='camera-pan' → mode.ts:40 门为假 → tickAutoScripts/tickChaseTimer 都跳。explore 路径的 autoScript 泵(scene-system.ts:402/408)在 mode!=='explore' 时提前 return(399 行)→ 不补偿。main-loop.ts:81/99 证实 tickByMode 是唯一每帧驱动，event 模式无另一条 autoScript 泵。

对照成立：PartyWalkTo 0x70/0x7A/0x7B(event-system.ts:2288-2308)与 NPCWalkTo(2313+)都是直接 return 不设 waiting → waiting 保持 undefined → 在白名单内，故那些多帧脚本走位期间 autoScript/chase 正常跑。camera-pan 是唯一设了"非白名单 waiting"的多帧脚本运动 opcode —— 一个干净的非对称遗漏。作者在 mode.ts:32-34 显式给 'scene-fade' 加注释引 sdlpal PAL_GameUpdate 逐帧理由，却漏了语义完全相同的 camera-pan。

排除误报：宏未等价(fTrigger 守卫确不含 autoScript/chase)；非别处已处理(explore 泵被 mode 门挡死，无第二泵)；非有意决策(注释表明作者本想覆盖所有 sdlpal 每帧 PAL_GameUpdate 的等待态，camera-pan 是疏漏而非刻意)；行号/函数均核对无误。

玩家可感知/可达性：data/extracted/events/all.json 中 317 个 0x7F，165 个是多帧相对 pan(占多数；vs 128 回正 / 9 绝对 / 15 单帧)，帧数大到 48/72/100(FPS=10 → 4.8s/7.2s/10s)。多秒长 pan 期间，凡画面内有 NPC 靠 autoScript 走动或循环动画帧者，TS 会静止到 pan 结束才恢复，与原版"边平移边动"不符；同时若此时驱魔香/十里香(0x62/0x63)计时器在跑，会少扣这几十帧使其延迟到期。这是确定性发生的逻辑错位。

严重度维持 medium：机制确凿、路径高频、计时器少扣是无条件发生的；但具体某次多秒 pan 是否恰好有 in-frame NPC 在 autoScript 动(部分 pan 是纯扫景、或运动由 PartyWalkTo 另行驱动)、以及 4-10s 内 NPC 几帧静止的视觉显著度，是纯读码难以逐一断言的部分——属于"机制确认、逐场景视觉显著度需实机观察"，不足以升 high 也不降 low。

**C 源证据**:script.c:2331-2377 = 0x7F 相对 pan 分支(op2 != 0xFFFF)是 `do { ... if (pScript->rgwOperand[2] != 0xFFFF) PAL_GameUpdate(FALSE); PAL_MakeScene(); VIDEO_UpdateScreen; PAL_DelayUntil(time); } while (++i < op2)` —— 每一帧都调 PAL_GameUpdate(FALSE)(script.c:2364-2366),且 op2 同时是循环帧数。play.c:24-241 PAL_GameUpdate:fTrigger 守卫(play.c:51)只包住触发事件循环(56-167);autoScript 循环(play.c:169-192,对每个 sState>0 && sVanishTime==0 对象跑 PAL_RunAutoScript)和追逐 timer 自减 `if (--gpGlobals->wChasespeedChangeCycles == 0) gpGlobals->wChaseRange = 1;`(play.c:235-238)都在 fTrigger 守卫之外 → PAL_GameUpdate(FALSE) 照样推进二者。绝对跳分支(op2==0xFFFF,script.c:2314-2318)不进 do-while、不调 PAL_GameUpdate —— 故差异确实只在多帧相对 pan。FPS=10(game.h:27),FRAME_TIME=100ms。


### ⏸ M5 · 🟠 玩家走路/跟随缺少 fCheckRange 下边界(blockX=5/blockY=7),改用相机 clamp 取代

- **子系统**:大世界·走路跟随与碰撞　**类别**:correctness
- **TS 位置**:`packages/game/src/core/scene-system.ts:309-316, 378-385, 445`
- **C 依据**:`reference/sdlpal/scene.c:549-567, 818, 835-836`
- **玩家可感知**:是

**差异**:C 走路碰撞 PAL_UpdateParty 调 PAL_CheckObstacleWithRange(target, TRUE, 0, fCheckRange=TRUE)(scene.c:818)。该函数在 fCheckRange 时(scene.c:551/563-567)用 blockX=partyoffset.x/32=160/32=5、blockY=partyoffset.y/16=112/16=7 做下边界:`if (x<blockX || x>=2048 || y<blockY || y>=2048) return TRUE`(阻挡)。即队首 tile 列<5 或行<7 一律视作障碍,玩家走不进地图左上 5 列 / 上 7 行的边缘带;C 自始至终**不 clamp viewport**(scene.c:835 只做 viewport+=offset),靠这条走路阻挡保证 viewport 不为负、队首恒居屏幕中心(160,112)。TS 的 isWalkable→tilemapIsBlocked 只判 `col<0||col>=width||row<0||row>=height`(scene-system.ts:310),**完全没有** blockX=5/blockY=7 下边界(isWalkable 也无 fCheckRange 形参);取而代之在 syncCameraToParty 里把相机 clamp 到 [0,maxX]×[0,maxY](scene-system.ts:382-383)。后果:TS 允许队首一路走到 col0/row0,而相机停在 0 → 队首脱离屏幕中心向左上角漂移;C 里队首在 col5/row7 处就被挡住、相机始终居中。follower 避障(present.ts:352)同样走无 range 的 isWalkable。注:怪物追击 PAL_CheckObstacle 用 fCheckRange=FALSE,TS 那条反而正确。

**玩家影响**:大地图左 / 上边缘行走表现明显不同:原版主角永远居中、走到边缘带即被挡住;TS 里主角能贴进左上角且镜头不再跟随,人物滑向屏幕角落,露出地图外/错误 tile,跟随队员定位也随之偏。

**复核论证**:逐点核对均成立，差异真实存在且为可感知的移植缺陷。

C 真值（坐标模型为 viewport-relative，队首世界坐标恒等于 viewport+partyoffset）：
- scene.c:551 `blockX = PAL_X(partyoffset)/32`, `blockY = PAL_Y(partyoffset)/16`；res.c:301 partyoffset=(160,112) → blockX=5, blockY=7。
- scene.c:563-567：`if(fCheckRange) if(x<blockX || x>=2048 || y<blockY || y>=2048) return TRUE`（目标 tile 列<5 或行<7 即阻挡）。
- scene.c:818 `PAL_UpdateParty` 走路调 `PAL_CheckObstacleWithRange(target, TRUE, 0, TRUE)`，fCheckRange=TRUE。
- scene.c:835-836 仅 `viewport += offset`；grep 全 scene.c 未见任何 viewport 的 min/max/clamp。即队首恒居屏幕中心(160,112)，靠这条阻挡保证 viewport 不为负。
- 怪物追击 PAL_CheckObstacle 走 fCheckRange=FALSE（scene.c:512-518；script.c:442/477/2498；play.c:218 经 bootstrap wrapper），故 TS 那条无 range 反而对——claim 这点也准。

TS 现状：
- scene-system.ts:309-316 tilemapIsBlocked 只判 `col<0||col>=width||row<0||row>=height`；isWalkable(332) 无 fCheckRange 形参，完全没有 blockX=5/blockY=7 下边界。
- 改用 syncCameraToParty(378-385) 把 camera clamp 到 [0,maxX]×[0,maxY]，且 party.x/y 为独立绝对世界坐标（PARTYOFFSET_X=160/Y=112，game-state.ts:24-25）。
- 渲染 present.ts:241+132 队首画在 `party.x - camera.x`：camera 未 clamp 时 = 160（与 C 同），但 camera 被 clamp 在 0 时 = party.x（<160），队首向左上角漂移、不再居中。
- follower 次要点也准：C scene.c:712-713 follower 避障用 fCheckRange=TRUE，TS present.ts:352 follower-render 走无 range 的 isWalkable。

实测佐证（关键）：
- scene-system.test.ts:110-117 测例「已在最左上角不能再左」起点 x=0，按 Left 后 party.x 仍=0——证明 TS 队首可一路走到 col0/x=0，只被 col<0 挡，不在 col5 被挡。
- 我扫了全部 223 张 extracted tilemap：221 张左上 5×7 角全部可走（obstacle bit13 清）。即原版那条边缘带在 map 数据里并无障碍，纯靠 blockX/blockY 把队首挡在外、保证镜头居中；TS 缺这条 → 玩家走进左上角时队首确会贴到屏幕角、镜头停住、露出地图外/错 tile，跟随队员定位随之偏。tilemap 1.json 宽64高128（典型场景纵深大），左上角完全可达。

误报排除：宏展开后 blockX/blockY 确为 5/7 非 0；C 确无 viewport clamp（非"差异已在别处处理"）；TS clamp 是替代方案而非等价（绝对坐标 vs viewport-relative 两种模型在边缘带产生不同可见结果）；行号/函数核对无误。未发现将此 clamp 标注为有意移植决策的注释或测试（aa02ae6 仅泛泛"对齐表现"）。

**C 源证据**:reference/sdlpal/scene.c:551(blockX=partyoffset.x/32, blockY=partyoffset.y/16), 563-567(fCheckRange 下边界 x<blockX||y<blockY return TRUE), 818(PAL_UpdateParty 调用传 fCheckRange=TRUE), 835-836(viewport+=offset，无 clamp); res.c:301(partyoffset=(160,112)); scene.c:512-518(PAL_CheckObstacle 默认 fCheckRange=FALSE，怪物追击用); scene.c:712-713(follower 避障 fCheckRange=TRUE)。TS: scene-system.ts:309-316/332(isWalkable 无 range 下边界), 378-385(camera clamp), present.ts:241/132(队首 screen=party-camera); scene-system.test.ts:110-117(队首可达 x=0 实证); extracted tilemap 实测 221/223 左上 5×7 角全可走。


### ✅ M6 · 🟠 读档不清零 rgPlayerStatus(大世界施放的持久状态会跨存档残留)

- **子系统**:存档·初始化与启动流程　**类别**:correctness
- **TS 位置**:`packages/game/src/shell/bootstrap.ts:1429-1475`
- **C 依据**:`reference/sdlpal/global.c:951`
- **玩家可感知**:是

**差异**:TS loadGameFromSlot 用 Object.assign(gs, loadedGs) 把存档里的 rgPlayerStatus 原样恢复(它是 GameState 字段,被序列化进 IndexedDB),随后只调 updateAllEquipments,不会先把 rgPlayerStatus 清零。C 真值:PAL_InitGameData 在 PAL_LoadGame 之后、PAL_UpdateEquipments 之前无条件 `memset(gpGlobals->rgPlayerStatus, 0, ...)`(global.c:951);且 rgPlayerStatus **不在** SAVEDGAME_WIN 结构里(global.c:530-559),所以原版任何持久玩家状态都不随存档走,读档后仅由装备 scriptOnEquip(0x2D)重新授予。TS 这边 opcode 0x2D OP_SET_PLAYER_STATUS(event-system.ts:4016-4042,金刚符63/黑狗血85 等大世界 buff)写入 rgPlayerStatus 的 rounds<=999 状态,会被序列化并在读档时保留。

**玩家影响**:在大世界给队员上了护身/勇气/加速等持久状态后存档再读档,TS 仍保留该状态,而原版读档后这些非装备状态会被清空(只剩装备授予的)。低频但可感知的数值/战斗增益差异。

**复核论证**:差异属实，逐环节核对均成立。

C 真值链：
- global.c:951 PAL_InitGameData 在 PAL_LoadGame(940) 之后、PAL_UpdateEquipments(953) 之前**无条件** `memset(gpGlobals->rgPlayerStatus, 0, sizeof(...))`。
- rgPlayerStatus **不在**存档结构里：SAVEDGAME_WIN(global.c:530-559)与 SAVEDGAME_DOS(510-528)均无该字段，故原版任何持久玩家状态都不随档走。
- PAL_UpdateEquipments(global.c:1333) 只 `memset(&rgEquipmentEffect,0)` 后重跑各装备 scriptOnEquip，仅重新授予装备类状态(如 DualAttack=32760，>999 永久值)；非装备 buff(有限回合)不会被重授。
- PAL_SetPlayerStatus(global.c:2257-2268) good 状态(Bravery/Protect/Haste/DualAttack)按 cur<rounds 写入 rgPlayerStatus；计数器仅在战斗内每回合递减(fight.c:1632-1638 `[j]--`)，大世界静止 → 大世界施放的 buff 会一直留到下次战斗。

TS 行为：
- rgPlayerStatus 是 GameState 字段(game-state.ts:939)，createInitialPlayerStatus() 仅在 GameState 构造时调一次(1598)，load 路径/bootstrap/scene-system 全程无再次清零(grep 全仓确认)。
- 存档把整个 gs deepClone 落库(save/api.ts:60、indexed-db.ts:66)，无 SAVEDGAME_WIN 式字段白名单 → rgPlayerStatus 被序列化持久化。
- loadGameFromSlot(bootstrap.ts:1438)`Object.assign(gs, loadedGs)` 原样恢复 rgPlayerStatus，随后仅 updateAllEquipments(1469)；该函数(equip-effect.ts:460-473)只重置 rgEquipmentEffect，从不触碰 rgPlayerStatus，且 load 前后均无 memset 等价物。
- 大世界 buff 写入路径确凿:opcode 0x2D OP_SET_PLAYER_STATUS(event-system.ts:4016-4042)对 good 5-8 写有限 numRound，注释明指金刚符63(Protect)/黑狗血85(Bravery/Haste)。

结论:大世界给队员上护身/勇气/加速后存档再读档，TS 保留该 buff，原版读档则清空(只剩装备授予的 >999 状态)。这是 TS 缺失 global.c:951 那次无条件 memset 直接导致的真实分歧，非宏展开等价、非别处已处理、非有意移植决策，行号/函数均读对。

**C 源证据**:global.c:951 (无条件 memset rgPlayerStatus，PAL_LoadGame 之后 PAL_UpdateEquipments 之前); global.c:530-559 + 510-528 (rgPlayerStatus 不在 SAVEDGAME_WIN/DOS 存档结构); global.c:1333 (PAL_UpdateEquipments 只 memset rgEquipmentEffect，重跑 scriptOnEquip 仅重授装备状态); global.c:2257-2268 (PAL_SetPlayerStatus good 状态写入); fight.c:1632-1638 (状态计数器仅战斗内每回合递减，大世界静止)


### ✅ M7 · 🟠 R(重提)/F(强行)键未做整队粘滞,只对当前队员生效

- **子系统**:战斗·主循环与回合流程　**类别**:correctness
- **TS 位置**:`packages/game/src/core/battle/battle-system.ts:1115-1136`
- **C 依据**:`reference/sdlpal/fight.c:1773-1800`
- **玩家可感知**:是

**差异**:C 在每帧帧尾(PAL_BattleStartFrame,主菜单+selectMove 状态下)检测到 kKeyRepeat→`g_Battle.fRepeat=TRUE`、kKeyForce→`g_Battle.fForce=TRUE`;随后 1789-1796 只要 fRepeat/fForce 为真,就把 `g_InputState.dwKeyPress` 合成为 kKeyRepeat/kKeyForce,使**本轮剩余所有待选队员**自动重提/强行,直到全员动作填完(标志在 fight.c:1443-1444 填队列前清掉)。注释明确写 “The R and F keys and Fleeing should affect all players”。TS 的 handleMainMenuInput 把 Repeat 走 commitRepeatAction、Force 走 commitForceAction,二者都只提交 `selectingPlayerIdx` 当前一名队员然后 advanceSelectingPlayer 切到下一人;没有任何 fRepeat/fForce 粘滞状态(state 里只有用于阻止 prevAction 备份的 repeatSelectionActive,不触发后续队员)。逃跑(Flee)因 commitFleeAllPlayers 一次性全队设 flee 而被正确复刻,唯独 R/F 漏了整队传播。

**玩家影响**:原版按一次 R 即可让全队重复上一轮指令、按一次 F 让全队自动出招;TS 里按 R/F 只让当前角色执行,菜单随即跳到下一个角色还要再按一次。多人队伍下连按 R/F 的战斗节奏与原版不符,玩家会觉得 “一键重复/强行” 失灵。

**复核论证**:核对 C 真值与 TS 实现，差异属实。

C 侧机制（PAL_CLASSIC 路径，TS 正是移植此路径）:
- fight.c:1772-1787 在 PAL_BattleStartFrame 帧尾、且 MenuState==kBattleMenuMain && state==kBattleUISelectMove 时，检测 kKeyRepeat → `g_Battle.fRepeat=TRUE`(并 fAutoAttack=fPrevAutoAtk)、kKeyForce → `g_Battle.fForce=TRUE`。
- fight.c:1789-1796 只要 fRepeat/fForce 为真，每帧把 `g_InputState.dwKeyPress` 合成为 kKeyRepeat/kKeyForce。
- 该合成键随后被 fight.c:1805 的 PAL_BattleUIUpdate 消费：uibattle.c:1220-1222 `kKeyRepeat → PAL_BattleCommitAction(TRUE)`、uibattle.c:1171-1203 `kKeyForce → pickAutoMagic(60)→CommitAction(FALSE)`。CommitAction 提交当前 wCurPlayerIndex 并切下一人；因 fRepeat/fForce 仍为真，下一帧继续合成键 → 逐帧把本轮剩余所有待选队员自动填满。
- fight.c:1443-1445 仅在全员 action 决定、填 ActionQueue 前清 fRepeat/fForce/fFlee。注释 fight.c:1772-1773 明确 “The R and F keys and Fleeing should affect all players”。

TS 侧(battle-system.ts:1090-1136 handleMainMenuInput):
- Repeat → commitRepeatAction(:1199-1222)、Force → commitForceAction(:1179-1197)，二者末尾都只 `state.pendingActions.set(selectingPlayerIdx,…)` 后 `advanceSelectingPlayer`(单人提交+切下一人)，无任何跨队员粘滞。
- battle-state.ts:472-476 的 `repeatSelectionActive` 文档明写仅复刻 fight.c:1432-1438 的 “fRepeat 阻止 prevAction 备份” gate(backupRepeatActions :1248-1266 用它判断是否覆盖缓存)，并非 fight.c:1789-1796 的合成键粘滞。全仓 grep `fForce`/`fRepeat` 粘滞字段：游戏 src 内无 fForce，fRepeat 引用全是 backup-gate 注释。
- 输入层 shell/input.ts:77-78 `if (e.repeat) return; if(!held.has(k)) pressed.add(k)`，pressed 为边沿触发(按住的浏览器 auto-repeat 被显式丢弃)且每帧消费后清空(:100)。故“按一次 R/F”在 TS 仅 1 tick 命中、只提交当前一名队员；菜单随即 startPlayerSelection 切到下一人重新弹出，需再按。

对照确认逃跑确被正确复刻(Flee→commitFleeAllPlayers :1449-1458 一次性全队 set flee，等价 C 的 fFlee 粘滞)，唯独 R/F 的整队传播漏了。fAutoBattle(:605,0x8A 脚本 flag)与 fAutoAttack(:615 Auto/A 键)各有自己的粘滞自动提交路径，均与 R/F 无关，不替代本差异。行号、函数、宏(PAL_CLASSIC #ifdef 包裹 fight.c:1772-1807，TS 通篇注明移植 CLASSIC 分支)均核对无误，排除误报。

**C 源证据**:reference/sdlpal/fight.c:1772-1796(fRepeat/fForce 帧尾置位 + 逐帧合成 dwKeyPress=kKeyRepeat/kKeyForce，注释“R and F keys…should affect all players”); fight.c:1443-1445(全员动作填完前才清 fRepeat/fForce/fFlee); reference/sdlpal/uibattle.c:1171-1203 与 1220-1222(合成键 → 当前队员 CommitAction 并切下一人); TS 反证: packages/game/src/core/battle/battle-system.ts:1196 与 1212/1221(commitForce/Repeat 仅单人提交+advanceSelectingPlayer)、battle-state.ts:472-476(repeatSelectionActive 仅为 prevAction 备份 gate)、shell/input.ts:77-78,100(pressed 边沿触发、每帧清)


### ✅ M8 · 🟠 混乱敌人攻击友敌完全没有动画(只结算伤害+即时弹数字)

- **子系统**:战斗·动画与表现时序　**类别**:timing
- **TS 位置**:`packages/game/src/core/battle/actions/attack.ts:426-450 performEnemyConfusedAttack;battle-system.ts:2460-2461 dispatch`
- **C 依据**:`reference/sdlpal/fight.c:4596-4654 (PAL_BattleEnemyPerformAction confused 分支)`
- **玩家可感知**:是
- **修复审查(2026-06-07)**:已收口。`buildEnemyConfusedAttackTimeline` + `startBattleAnim` 覆盖 3 帧滑步、effectSprite 9/10/11 火花、PostMagic 抖动、Delay(5)、复位 Delay(2);火花 Y 已从敌方 battle sprite frame0 height 计算,对齐 C 的 `target.y - PAL_RLEGetHeight(frame0)/3 + 10`。

**差异**:C 中混乱敌人打另一只敌人有完整可见演出:先 3 帧把施法敌位置向目标敌中点插值滑动(x=(x+iX)/2 反复,各 Delay(1),fight.c:4598-4612),再在两者中点用 lpEffectSprite 第 9~11 帧播 3 帧命中火花(fight.c:4617-4632),随后 PAL_BattleDisplayStatChange + PAL_BattleShowPostMagicAnim(受击抖动)+ Delay(5) + 复位 Delay(2)(fight.c:4647-4652)。TS performEnemyConfusedAttack 只算伤害并 bus.emit showDamageNum,完全无位移/无命中特效/无受击抖动/无停顿。

**玩家影响**:敌人陷入混乱互殴时,屏幕上看不到任何攻击动作或受击反馈,伤害数字凭空跳出,与原版那段滑步+火花+震动的演出差距明显。

**复核论证**:核对全部成立,且发现一处加重证据(同库内不对称)。

C 真值 fight.c:4591-4654 confused 分支逐段确认:
- fight.c:4598-4612:for i<3 循环把施法敌 pos 朝 iTarget 插值滑动(x+=iX;x/=2,y 同),每次 PAL_BattleDelay(1,0,TRUE) —— 3 帧滑步。
- fight.c:4614-4632:for i=9..11 在两者中点(x4615/y4616)用 g_Battle.lpEffectSprite 第 9~11 帧 PAL_RLEBlitToSurface —— 3 帧命中火花。
- fight.c:4634-4645:伤害 = (SHORT)wAttackStrength+(level+6)*6 vs (SHORT)wDefense+(level+6)*4,PAL_CalcBaseDamage*2/wPhysicalResistance,<=0→1。
- fight.c:4647-4649:PAL_BattleDisplayStatChange()(数字)+ PAL_BattleShowPostMagicAnim()(fight.c:3189-3246,3 帧 pos-=dist 抖动 + iColorShift=6 闪白)+ PAL_BattleDelay(5,0,TRUE)。
- fight.c:4651-4652:pos 复位 posOriginal + PAL_BattleDelay(2,0,TRUE)。
按 battle.h:28-29 BATTLE_FPS=25(帧 40ms),被跳过的演出量级约 0.5s 可见动画。

TS performEnemyConfusedAttack(attack.ts:426-450):伤害公式与 C 一致(str/def/CalcBaseDamage*2/physRes/<=0→1 全对),但结算后仅 bus.emit showDamageNum(attack.ts:444-449)一句,无 startBattleAnim、无任何 timeline,即滑步/火花/受击抖动/停顿全缺。dispatch(battle-system.ts:2460-2461)在 actor.isEnemy 时把 'attack-mate' 直接路由到该函数;enemy-ai.ts:84-91 注释明示这是唯一路径。anim-timeline.ts / battle-anim-driver.ts 全库无任何"敌混乱"时间线构造器。actions.test.ts:857-880 也仅断言伤害值,无任何动画断言。

加重证据(不对称):玩家侧混乱对应函数 performAttackMate(attack-mate.ts:91-96)确实调用 startBattleAnim(state, buildAttackMateTimeline(...)),buildAttackMateTimeline(anim-timeline.ts:197-232)是 fight.c:3791-3851 玩家冲刺/击退/闪白/复位的完整逐帧移植。故"演出缺失"并非全局"混乱攻击都不演"的统一移植决策,而是敌方分支单独遗漏的不一致缺口 —— 排除了"有意移植决策"这一误报来源。行号、函数、宏(BATTLE_FRAME_TIME/FPS)均已核对无误。声称描述与 C 源逐行吻合,判定 confirmed。

**C 源证据**:reference/sdlpal/fight.c:4598-4612(3 帧插值滑步,每帧 PAL_BattleDelay(1));fight.c:4614-4632(中点 lpEffectSprite 第 9~11 帧 3 帧命中火花);fight.c:4647-4649(PAL_BattleDisplayStatChange + PAL_BattleShowPostMagicAnim 受击抖动 + Delay(5));fight.c:4651-4652(pos 复位 + Delay(2));PAL_BattleShowPostMagicAnim 本体 fight.c:3189-3246(3 帧 pos-=dist + iColorShift=6 闪白);battle.h:28-29(BATTLE_FPS=25,帧 40ms)。对照 TS attack.ts:444-449 仅 showDamageNum;玩家侧对照件 attack-mate.ts:91-96 + anim-timeline.ts:197-232 有完整动画。


### ✅ M9 · 🟠 非召唤合击的法术效果音在派发瞬间立即播放，而非随 OffMagic 特效帧同步(早约 0.7 秒)

- **子系统**:战斗·召唤合击与变身　**类别**:timing
- **TS 位置**:`packages/game/src/core/battle/actions/coop-magic.ts:114-124 (emitImmediateCoopSounds) + :185-187 (非 summon 无条件调用) + :205-221 (建链时未把 sound 传入 buildCoopMagicTimeline)`
- **C 依据**:`reference/sdlpal/fight.c:3875 (合击起手 AUDIO_PlaySound(29)) vs fight.c:2669-2672 (WIN95 时序:OffMagicAnim 起手帧前播 magic.wSound,本项目采用;非 CLASSIC 的 2711)`
- **玩家可感知**:是

**差异**:TS：非 summon 合击始终先调用 emitImmediateCoopSounds()(coop-magic.ts:186),该函数同时 emit 固定音 29 和 magic.sound(:122-123);随后才建合击时间线(:205-222),但传给 buildCoopMagicTimeline 的 magic 对象不含 sound(:210-214→anim-timeline.ts:1028 也不传 sound),所以效果音没有帧同步。C：音 29 确实在聚拢动画前播(fight.c:3875,与 TS 一致,正确),但效果音 magic.wSound 是在 PAL_BattleShowPlayerOffMagicAnim 内、聚拢+蓄势+出招(约 6+3×N+5+3 帧)之后才播(本项目采 WIN95 时序,效果音在 OffMagicAnim 起手帧 fight.c:2669-2672;不是 CLASSIC 的 2711)。差异:TS 把效果音提前到派发瞬间,比原版早整段聚拢/蓄势动画(~17 帧 ≈ 0.7s+)。注意这是 5 个实际合击(386/381/355/339/374,sound 分别 129/117/274/126/168)全部命中的路径;而普通法术路径(magic.ts:506)和召唤合击路径(已测)都正确做了帧同步,唯独非召唤合击漏了。

**玩家影响**:释放合击(合体气功/爆炸/天女散花/弦月斩/爆炸蛊)时,法术命中音在角色还在聚拢/蓄力阶段就响,声画不同步、明显比命中特效早大半秒。

**复核论证**:行为属实，已逐处核对：

1) 派发即时播效果音 — coop-magic.ts:114-124 的 emitImmediateCoopSounds 同时 emit 固定音 29 与 magic.sound(:122-123)；非 summon 分支无条件调用它(coop-magic.ts:185-187 else 块)。

2) 时间线未帧同步效果音 — coop-magic.ts:205-214 建链时传给 buildCoopMagicTimeline 的 magic 对象显式列字段但**漏掉 sound**；anim-timeline.ts:1028 调 buildPlayerOffMagicTimeline 也不带 sound；buildPlayerOffMagicTimeline 在 :780 解构出 sound=undefined，:882 的 `if (sound && sound>0 && i===0) frame.sound=sound` 永不触发。故效果音只在派发瞬间响、从不挂 OffMagic 起手帧。对比正常法术 magic.ts:506 确实传了 sound、召唤合击 coop-magic.ts:263 也把 magic.sound 挂到变亮帧——唯独非召唤合击漏。已跑 coop-magic.test.ts 12/12 通过，:97 显式断言派发即 emit [29,77]，证实现状。

3) 命中范围属实 — 查 data/extracted object-magics + magic：obj 386/381/355/339/374 → magicNum 86/79/27/88/65，type 全为 normal/attackField(非 summon)，wSound 分别 129/117/274/126/168 全非 0，fireDelay 全 0。全部走该 else 路径。

4) **对声称 C 依据的修正**：声称把"正确基线"定为 fight.c:2711(CLASSIC `(i-fireDelay)%n==0`)。但 line 2711 有 `!gConfig.fIsWIN95` 守卫，而本项目已明确决策(user 2026-06-05，anim-timeline.ts:877-882 文档化)统一采 **WIN95** 时序——效果音在 OffMagic 起手帧播(fight.c:2669-2672 `if (fIsWIN95 && !fSummon && wSound) AUDIO_PlaySound`，在 :2674 帧循环前)。所以本项目正确基线是 WIN95 非 CLASSIC。但这不能洗白合击路径：即便按 WIN95，效果音也在 PAL_BattleShowPlayerOffMagicAnim 入口(line 2671)播，而该函数在 fight.c:3951 调用——位于聚拢(fight.c:3877-3925，6 帧)/蓄势(:3927-3941，≥3 帧)/闪白(:3943-3945，5 帧)/出招(:3947-3949，3 帧)/入口 Delay(1)(:2659)之后。最小延迟 = 6+3+5+3+1 = 18 帧 × BATTLE_FRAME_TIME 40ms(anim-timeline.ts:27) = 720ms，贡献者越多越长。声称"~17 帧≈0.7s+"准确(略保守)。合击音 29 在两模式都无 WIN95 守卫(fight.c:3875)、确在聚拢前播，与 TS 一致正确——错的只是效果音被一并提前。结论：差异真实，玩家可感知；声称把基线写成 CLASSIC 是次要瑕疵，换成项目实际采用的 WIN95 基线后结论与量级不变。

**C 源证据**:fight.c:3856-3875(合击 else 分支：AUDIO_PlaySound(29) 在聚拢动画前，与 TS 一致正确)；fight.c:3877-3949(聚拢 6×Delay(1)+蓄势(N-1)×Delay(3)+闪白 Delay(5)+出招 Delay(3))；fight.c:3951(PAL_BattleShowPlayerOffMagicAnim(-1,wObject,sTarget,FALSE)，fSummon=FALSE)；fight.c:2659(入口 PAL_BattleDelay(1))；fight.c:2669-2672(WIN95：sound 在帧循环前播，本项目实际采用的基线)；fight.c:2711-2714(CLASSIC：`!fIsWIN95 && (i-fireDelay)%n==0` 才播——声称引此处但项目不走 CLASSIC)。TS：coop-magic.ts:114-124/185-187/205-214；anim-timeline.ts:780,882,1028,27(BATTLE_FRAME_TIME=40)；对照正确实现 magic.ts:506 与召唤 coop-magic.ts:263。数据：object-magics.json + magic.json 5 个合击 obj 全为非 summon、wSound 非 0。


### ✅ M10 · 🟠 大世界单体治疗(0x1B/1C/1D)未复刻 PAL_IncreaseHPMP 的“仅活人 + 无变化即失败”语义

- **子系统**:战斗·法术伤害与治疗　**类别**:correctness
- **TS 位置**:`packages/game/src/core/menu/magic-script.ts:46-60,165-183`
- **C 依据**:`reference/sdlpal/global.c:1287`
- **玩家可感知**:是

**差异**:C 的 PAL_IncreaseHPMP(global.c:1254)只在 `rgwHP[role] > 0` 时才改 HP/MP(global.c:1287),且返回是否**真发生变化**(global.c:1322-1326 “Avoid over treatment”:原值==新值则返回 FALSE)。脚本 0x1B 单体分支据此设 `g_fScriptSuccess = FALSE`(script.c:889-892);上层大世界施法 uigame.c:820-823 只有 g_fScriptSuccess 为真才扣 MP。TS 大世界 runner 的 applyHPMPDeltaSingle(magic-script.ts:46-60)**既不检查 HP>0**,**也不返回/上报是否变化**,runMagicScriptSync 的 0x1B/0x1C/0x1D case(165-183 行)也从不据此把 scriptSuccess 置 false。后果两条:(a) 对 HP=0 的死亡队友用单体治疗术,TS 会把其 HP 直接抬到 delta 值(等于免费复活),C 则 no-op;(b) 对已满血队友施法,TS 仍返回 success → menu-driver.ts:818-821 照常扣 MP,C 则 g_fScriptSuccess=FALSE 不扣 MP。注意战斗内路径(battle-opcodes.ts 的 increaseBattleHPMP,168-174 行)已正确实现这两点,仅大世界 runner 漏了——两路不一致佐证此为偏差。applyToAll 分支(magic-script.ts:62-70)有 HP>0 过滤但仍缺 anyChanged→success 的回报。

**玩家影响**:大世界用气疗术/观音咒等单体回血法术:对满血队友施放会白扣 MP(原版不扣);对死亡队友施放会被当成廉价复活把血抬到固定值并扣 MP(原版应毫无效果且不扣 MP),绕过了正规复活术机制。

**复核论证**:见上。两条差异(死人免费回血+扣MP、满血白扣MP)均经 C 源逐行核对并内联实测复现，对应真实可施放的大世界单体治疗术。

**C 源证据**:global.c:1280(fSuccess=FALSE 初始)、:1287(`if rgwHP[wPlayerRole] > 0` 仅活人门控)、:1324-1326(over-treatment 原值==新值则 fSuccess 保持 FALSE);script.c:889-892(0x1B 单体 `if(!PAL_IncreaseHPMP) g_fScriptSuccess=FALSE`)、:916-919(0x1C)、:944-948(0x1D);uigame.c:811-823(单体路径 MP 扣减在双重 `if(g_fScriptSuccess)` 内,target=rgParty[wPlayer].wPlayerRole)、:743-752(applyToAll 同构)。TS 对照正确实现:battle-opcodes.ts:168-174(increaseBattleHPMP 有 hp<=0 return false + 返回变化)、magic-script.ts:197(0x22 revive 置 scriptSuccess=false)。数据:spells.json 气疗术/观音咒/凝神归元/元灵归心术 id296-299 applyToAll=false+usableOutsideBattle=true,events/all.json L_43016 等=`raw 0x1B [0,75/150/220/500,0]`。


### ✅ M11 · 🟠 0x22 复活把目标全部毒清空,C 只清等级<=3 的毒

- **子系统**:战斗·脚本 opcode 与敌人 AI　**类别**:correctness
- **TS 位置**:`packages/game/src/core/battle/battle-opcodes.ts:970-976`
- **C 依据**:`reference/sdlpal/script.c:1071`
- **玩家可感知**:是
- **修复审查(2026-06-07)**:已收口。战斗 `battle-opcodes.ts` 与大世界同步法术 runner `core/menu/magic-script.ts` 均调用 `curePlayerPoisonByLevel(...,3)`,并有 `level>3` 保留测试。

**差异**:C 的 0x22 revive 对复活的队员调用 PAL_CurePoisonByLevel(w, 3)(global.c:1567-1614),只清除 wPoisonLevel<=3 的毒,等级>3 的毒保留(且复活后会继续 tick)。TS 的 OP_REVIVE_PLAYER 改为无条件遍历全部 16 个毒槽清零(`if (ctx.gs.rgPoisonStatus[key]) ... = {wPoisonID:0,...}`),等价于「清所有毒」,而不是「清 level<=3 的毒」。仓库已有正确实现 curePlayerPoisonByLevel(event-system.ts:4536,按 _objectPoisons 真 level 比较)可直接用 maxLevel=3,但 handler 内联成了全清。数据佐证:object-poisons.json 中大量毒的 level>3(最高到 251),所以差异在数值上真实存在。

**玩家影响**:用还魂咒/赎魂香复活带高等级毒而死的队员时,TS 会把高等级毒一并治愈(白送一次解毒);原版复活后高等级毒仍在,会继续掉血。改变战斗难度/走向。

**复核论证**:差异属实，且可在战斗中触发。

C 真值：script.c:1071/1091 的 0x0022 revive 调用 PAL_CurePoisonByLevel(w, 3)。该函数 global.c:1604-1613 只清 g.rgObject[w].poison.wPoisonLevel <= wMaxLevel(=3) 的毒槽；level>3 的毒保留。fight.c:1620-1627 的玩家毒 tick 对任意 wPoisonID!=0 的槽都跑 wPoisonScript，无 HP/死亡门控，所以复活后保留的高等级毒会继续 tick 掉血。这正是 claim 描述的玩家影响。

TS bug：battle-opcodes.ts:970-976 的 OP_REVIVE_PLAYER（战斗 handler）`for slot<MAX_POISONS(=16)` 无条件把每个非空槽清成 {wPoisonID:0,...}，没有任何 level 比较，等价于清所有毒。其自身注释承认是 "D15 残"（遗留简版）。

误报排查全部不成立：
1) 宏/常量：MAX_POISONS 在 C(palcommon.h:79)与 TS(battle-opcodes.ts:224)都为 16，循环范围一致；PAL_CurePoisonByLevel 确为 level<=maxLevel 门控，无等价改写。
2) 别处已处理？否。in-battle 用复活物品走 item.ts:97-114 runScript(runtimeMode:'battle',battleCtx) → event-system.ts:2645 dispatchBattleOpcode(0x0022) → 此 bugged handler，是战斗内唯一复活路径。
3) 有意决策？否，且是内部不一致：大世界 event-system.ts:3877-3906 的同名 OP_REVIVE_PLAYER 正确调用 curePlayerPoisonByLevel(gs,roleId,3)（按 _objectPoisons 真 level 比较，4536 行）；只有战斗副本写错。正确 helper 已导出可直接复用。
4) 行号/函数读错？否，逐一核对一致。
5) 无 battle-opcodes.test.ts 锁定该全清行为。

数值佐证：object-poisons.json 中 playerScript!=0 且 level>3 的毒有 159 条（如 id61 level197 / id62 level221，最高到 251），而 playerScript!=0 且 level<=3 仅 11 条。即「复活后应保留、却被 TS 清掉」的毒是绝大多数实战毒。差异在数值与触发面上都真实。

**C 源证据**:script.c:1071 与 script.c:1091（0x0022 revive 调 PAL_CurePoisonByLevel(w,3)）；global.c:1604-1613（仅清 wPoisonLevel<=wMaxLevel 的槽，level>maxLevel 保留）；fight.c:1620-1627（玩家毒 tick 对任意 wPoisonID!=0 跑脚本，无死亡门控）。TS 对照：battle-opcodes.ts:970-976（无条件清全 16 槽）；正确路径 event-system.ts:3894 + curePlayerPoisonByLevel(event-system.ts:4536)；触发链 item.ts:97-114 → event-system.ts:2645。


### ✅ M12 · 🟠 0x29 给队员上毒未在施加当下跑毒的 playerScript(C 跑一次)

- **子系统**:战斗·脚本 opcode 与敌人 AI　**类别**:correctness
- **TS 位置**:`packages/game/src/core/battle/battle-opcodes.ts:544-553`
- **C 依据**:`reference/sdlpal/global.c:1515`
- **玩家可感知**:是
- **修复审查(2026-06-07)**:已收口。战斗 0x29、大世界事件 0x29 与装备 0x29 均给 `addPoisonForPlayer` 注入入口 runner,施毒当下跑一次 playerScript 并存返回 next entry;底层无 runner fallback 仅保留旧 caller 兼容。

**差异**:C 的 0x29 经 PAL_AddPoisonForPlayer,落槽时执行 `wPoisonScript = PAL_RunTriggerScript(rgObject[wPoisonID].poison.wPlayerScript, wPlayerRole)` —— 施毒当下跑一次该毒的 playerScript(立即生效其入口效果,并把返回的下一条 entry 存起来供后续每回合 tick)。TS 的 OP_POISON_PLAYER 委托 event-system.ts:4501 addPoisonForPlayer,该函数只把原始 playerScript entry 存进毒槽(`wPoisonScript: playerScript`),**从不运行它**。对比同文件敌方 0x28(battle-opcodes.ts:478-497)已正确实现「施加时 ctx.runScript 跑一次」,player 侧未对齐。数据佐证:object-poisons.json 有 173 条毒带非 0 playerScript,且不少 playerScript 首条就是有副作用的 opcode(如 poison id 75 @39359 首条是 0x2B 解毒、id 36 @43445 是概率分支+0x1B 回血/0x30 加成),这些「上毒即触发」的效果在 TS 完全不发生,且后续每回合 tick 的 entry 也会差一拍。

**玩家影响**:被施加带入口效果的毒时(治疗/诅咒/特殊扣血链),原版上毒瞬间就触发的效果在 TS 不触发;多阶段毒的回合推进也会错一拍。可感知为某些毒「上了但首回合没动静」。

**复核论证**:差异属实，且非误报来源所能解释。

C 真值（已逐行核对）:
- global.c:1513-1515 — PAL_AddPoisonForPlayer 落空槽时执行 `wPoisonStatus[i][index].wPoisonScript = PAL_RunTriggerScript(rgObject[wPoisonID].poison.wPlayerScript, wPlayerRole)`，即**施毒当下跑一次 playerScript**，存其返回的下一条 entry。
- script.c:1257-1285 — 0x29 player 分支抗性 gate 后调 PAL_AddPoisonForPlayer（上面的函数），故 C player 侧确实在施加当下跑一次。
- script.c:1196-1218 / 1242-1252 — 0x28 enemy 分支落槽时 `wPoisonScript = PAL_RunTriggerScript(poison.wEnemyScript, idx)`，与 player 对称（都在 add 时跑）。
- script.c:3140-3217 — PAL_RunTriggerScript 从 wScriptEntry 起跑命令至 0x0000/0x0001/0x0002 终止；0x0000 不改 wNextScriptEntry（=入口本身），0x0001 返回 ip+1。故 add 时不仅跑入口效果，还把"推进后的 entry"存下。
- fight.c:1620-1627 / 4452-4461 — 每回合 tick `wPoisonScript = PAL_RunTriggerScript(wPoisonScript, ...)`，与 add-time 同一函数。

TS 现状（已核对）:
- event-system.ts:4501-4515 addPoisonForPlayer：只 `wPoisonScript: playerScript`（原始入口），**从不运行**。其 doc(4497)也只写"每回合 tick 跑"，无 add-time 跑，且无"有意不跑"的说明。
- battle-opcodes.ts:544-553 OP_POISON_PLAYER 与 equip-effect.ts:415-427 装备 0x29 均委托此非运行版 addPoisonForPlayer。
- 对比 battle-opcodes.ts:478-497 敌方 0x28：施加时 `entry = ctx.runScript({ip: scriptEntry,...})` 跑一次存返回值，正确对齐 C script.c:1213。故 C 对称(两边 add 都跑)，TS 不对称(仅敌方 add 跑) —— 是真实移植缺口，非等价改写。
- 每回合 tick(battle-system.ts:2546-2563)从 ps.wPoisonScript 跑并回写 next，正确匹配 fight.c:1622-1625。所以差异精确定位在"缺 add-time 那一次执行"，导致 turn-0 入口效果丢失、多阶段毒链晚一拍。

数据佐证已实证(object-poisons.json + events/all.json):173 条非 0 playerScript(91 装备 level≥99 / 82 战斗)。id 75@39359 首条 0x2B 解毒(后接 0x0000)；id 36@43445 首条 0x06 概率分支→showDialog/0x30 加成/0x28；装备回血毒 id 563@40860 首条 0x1B +20HP。这些在 C 上毒/装备瞬间触发，TS 不触发。

排除的误报路径:宏展开(0x0000 终止确返回入口本身，已读 script.c:3171/3204-3217)、等价写法(enemy 路径反证 TS 知道该跑却独漏 player)、别处补偿(battle+equip 两条 add 路径都走非运行版)、有意决策(无注释/测试支持，仅 dedup/resistance 测试)、行号读错(global.c:1515 与声称一致)。判定 confirmed。

**C 源证据**:global.c:1513-1515(add 时 PAL_RunTriggerScript(wPlayerScript) 跑一次存返回 entry); script.c:1280-1283(0x29→PAL_AddPoisonForPlayer); script.c:3171/3204-3217(RunTriggerScript 从入口跑到终止符,0x0000 返回入口、0x0001 返回 ip+1); script.c:1212-1213(0x28 enemy 对称在 add 时跑); fight.c:1622-1625(每回合 tick 同函数). TS: event-system.ts:4501-4515(addPoisonForPlayer 只存原始 entry 不跑); battle-opcodes.ts:544-553 与 equip-effect.ts:415-427(均委托); battle-opcodes.ts:478-497(敌方 0x28 已正确 add 时跑); battle-system.ts:2546-2563(tick 正确). 数据: object-poisons.json 173 条非0 playerScript; all.json entry 39359 首 0x2B / 43445 首 0x06→showDialog/0x30/0x28 / 40860 首 0x1B +20HP.


### ✅ M13 · 🟠 narration 居中提示框(kDialogCenterWindow)被错误地画了 6px 投影阴影,原版无阴影

- **子系统**:渲染·字体与对话框　**类别**:pixel
- **TS 位置**:`packages/game/src/present/dialog-box.ts:730-732`
- **C 依据**:`reference/sdlpal/text.c:1687; reference/sdlpal/script.c:1479,1513; reference/sdlpal/text.h:71`
- **玩家可感知**:是

**差异**:C 端 narration 框由 PAL_ShowDialogText 调 `PAL_CreateSingleLineBoxWithShadow(pos, (len+1)/2, FALSE, g_TextLib.iDialogShadow)`(text.c:1687)。`g_TextLib` 是全局 BSS 零初始化,PAL_InitText 从不设置 iDialogShadow,故其默认值=0;仅在紫金葫芦炼丹流程里被临时置 5(script.c:1479)用完即复位 0(script.c:1513)。所以普通 narration(『得到 XX 物品 × N』『钱不够』等)的 SingleLineBox 阴影偏移=0 —— 阴影 blit 在 (x+0,y+0) 与正色框同位,被正色完全覆盖 → 视觉上无阴影。TS `drawNarrationDialog` 调 `drawSingleLineBox({fb,x,y,len,uiSpriteFrames})` 未传 shadowOffset,落到 `drawSingleLineBox` 的默认 `?? 6`(draw-box.ts:168),阴影画在 +6 偏移处且不被覆盖 → 框右下出现一圈本不该有的投影。注:同文件 drawItemBoxLine 显式传了 `shadowOffset: 5` 是对的,唯独普通 narration 这条漏传 0。

**玩家影响**:每次拾取物品/购买/施法等弹出的居中提示框(游戏全程极高频)右下角多出一道灰色投影,与原版『无阴影、紧贴场景』的观感不一致。

**复核论证**:差异属实，C 源逐环节核对无误。

(1) C narration 框确由 `PAL_CreateSingleLineBoxWithShadow(pos, (len+1)/2, FALSE, g_TextLib.iDialogShadow)` 创建（text.c:1687，kDialogCenterWindow 分支 text.c:1663-1710）。

(2) `g_TextLib` 在 text.c:63 是文件作用域全局 `TEXTLIB g_TextLib;`（无初始化器→BSS 零初始化），故 iDialogShadow 默认=0。grep 全 C 源，iDialogShadow 仅在 script.c:1479(=5) 与 script.c:1513(=0) 两处被赋值，PAL_InitText(text.c:649-) 全函数体内从不触碰它。通用 narration 入口 opcode 0x003E `PAL_StartDialog(kDialogCenterWindow,...)`（script.c:3424）也不设置它 → 该路径 iDialogShadow 恒为 0。

(3) 关键机制 ui.c:252-352：阴影 blit 在 (rect.x+nShadowOffset, rect.y+nShadowOffset)（行 323/329/333），正色框 blit 在 pos 即 +0（行 339/345/349）。当 nShadowOffset=0，阴影与正色框同位，被完全覆盖 → 视觉无阴影。

(4) TS 侧：dialog-box.ts:730-732 `drawNarrationDialog` 调 `drawSingleLineBox({fb,x,y,len,uiSpriteFrames})` 未传 shadowOffset；落到 draw-box.ts:168 `input.shadowOffset ?? 6`。draw-box.ts:178-187 在 shadow>0 时用 blitShadowMask 在 +6 偏移画阴影（draw-box.ts:129-146 对底层像素 palCalcShadowColor 变暗，等价 C 的 RLEBlitWithShadow），不被 +0 的正色框覆盖 → 框右下出现真实灰色投影。

(5) 路由确认：opcode 0x003E(setDialogStyleNarration)→ event-system.ts:1862-1867 映射 'narration' style → dialog-box.ts:559-561 short-circuit 到 drawNarrationDialog（buggy +6）。而炼丹紫金葫芦 'item-box' 路径(script.c:1479 iDialogShadow=5)在 dialog-box.ts:829 显式传 shadowOffset:5（正确），证明作者已知阴影应参数化，唯独普通 narration 漏传 0 → 走默认 6。

结论：C 端普通 narration 框无可见阴影，TS 端每次画 6px 投影，确为像素级偏差。

注：声称里 C 引用行号(text.c:1687 / script.c:1479,1513 / text.h:71)与 ui.c 机制全部准确；唯一微瑕是 TS 默认值实际在 `menu/draw-box.ts:168`（声称写成 draw-box.ts:168 漏了 menu/ 前缀），行号与内容一致，不影响判定。

**C 源证据**:reference/sdlpal/text.c:1687 (PAL_CreateSingleLineBoxWithShadow 传 iDialogShadow); text.c:63 (TEXTLIB g_TextLib; BSS 零初始化→默认0); text.c:649-896 PAL_InitText 全函数体无 iDialogShadow 赋值; script.c:1479(=5)/1513(=0) 仅炼丹流程设置; script.c:3424 通用 narration opcode 0x003E PAL_StartDialog(kDialogCenterWindow,...) 不设阴影; reference/sdlpal/ui.c:323-349 (阴影 blit 在 +nShadowOffset，正色框 blit 在 +0；offset=0 时阴影被覆盖→无视觉阴影)。TS 对照: dialog-box.ts:730-732(未传 shadowOffset), menu/draw-box.ts:168(默认 ?? 6) 与 :178-187 + :129-146(在 +6 画 darken 阴影), dialog-box.ts:829(item-box 正确传 5)。


### ✅ M14 · 🟠 FadeToRed 的 0x4F→0x4E 像素重映射在战败 game-over 定格帧上从未生效

- **子系统**:渲染·调色板与淡入淡出　**类别**:pixel
- **TS 位置**:`packages/game/src/present/present.ts:175-178,514-524`
- **C 依据**:`reference/sdlpal/palette.c:623-631`
- **玩家可感知**:是

**差异**:C PAL_FadeToRed 在 fade 循环开始前对 gpScreen(此刻显示的是战斗最后一帧)一次性把所有 index==0x4F 的像素改成 0x4E,使这些像素也跟随 palette ramp 染红;同时 fade 循环里 j==0x4F 被 continue(palette[0x4F] 保持文字色),保证之后叠的死亡对话文字不被染红。TS 把 remap 放在 present.ts:518 的场景绘制路径里(精灵已画、对话框未画时逐帧扫描 fb 把 from→to),但 game-over 时 present.ts:175-178 的 `if (gs.gameOverActive) { drawDialogOverlay; return }` 在到达 518 行之前就提前 return —— 而定格住的那帧是上一 tick 由 presentBattleFrame 写入的战斗帧,present-battle.ts 路径里没有任何 0x4F→0x4E remap。结果:被 hold 的战斗帧中所有用 index 0x4F 的像素都被 skipIndex=0x4F 跳过、保持文字色不染红,而 C 里它们已被改成 0x4E 正常染红。

**玩家影响**:战败死亡红屏演出时,战斗背景/精灵里原本用 0x4F(默认字色)的像素不会变红,会以原文字色(偏亮)留在一片红色画面上形成色斑;C 版整屏(除死亡文字外)统一染红。

**复核论证**:机制经逐行核对，与声称一致。

C 真值：(1) palette.c:623-629 `PAL_FadeToRed` 在 ramp 前先把 gpScreen 全部 `0x4F→0x4E`（HACKHACK），随后 ramp 循环 j==0x4F `continue`（palette.c:637-640，保文字色），即"remap 让 0x4F 像素染红 + skip 0x4F 保文字色"两半。(2) script.c:1772 是 FadeToRed 唯一调用点（game over）。(3) battle.c:1804-1857 `PAL_StartBattle` 战斗返回脚本前**不调 PAL_MakeScene、不触 gpScreen->pixels**（只 FreeBattleSprites/FreeSurface），故 0x4F 执行时 gpScreen 仍是战斗最后一帧——C 的 remap 作用在战斗帧上。

TS 现状：(a) bootstrap.ts:436-438 路由 `if(!presentBattleFrame(...)) presentFrame(...)`；present.ts:688 `presentBattleFrame` 仅在 `gs.mode==='battle'` 返回 true。(b) 但 0x4F 执行时，finalizeBattleCleanup（battle-system.ts:2689 mode='explore'）→resumePostBattleScript（game-state.ts:1430 `gs.mode='event'`）已把 mode 改成 'event'，故 presentBattleFrame 返回 false → 走 presentFrame。(c) present.ts:175-178 `if(gs.gameOverActive){drawDialogOverlay;return}` 在到达 518 行 remap 之前提前 return。drawDialogOverlay（present.ts:103-119）与整个 present-battle.ts 均**无任何 0x4F→0x4E remap**（grep 零命中），flushToCanvas/framebuffer.ts 亦无。(d) 被 hold 的 fb 是上一次 presentBattleFrame 的 `fb.clear()`+draw 结果，之后各 tick 早 return 不重绘 → 战斗帧像素原样保留，其 0x4F 像素永不被 remap。(e) palette-fade.ts:229 skipIndex=0x4F 使 palette[0x4F] 不参与 ramp，保持原文字色。

净效果：C 把战斗帧 0x4F→0x4E 后随 ramp 染红；TS 战斗帧 0x4F 保留 → palette[0x4F] 被 skip 保持原色 → 红屏上留亮色像素。TS 作者其实移植了 HACK 两半（builder 带 remap + skipIndex），但 remap 半被 gameOverActive 早 return 架空，从未落到定格帧。现有测试只验 builder 产出 remap 字段（palette-fade.test.ts:154、event-system.test.ts:4130）与状态翻转，**无任何测试验证 remap 真落到 hold 帧像素**，与本缺陷自洽。

**C 源证据**:palette.c:623-629（gpScreen 全屏 0x4F→0x4E HACK）；palette.c:637-640（ramp 跳过 0x4F）；script.c:1768-1773（0x4F=PAL_FadeToRed，game over 唯一调用）；battle.c:1804-1857（PAL_StartBattle 战斗返回前不 MakeScene/不动 gpScreen→定格的是战斗帧）。TS：present.ts:175-178（gameOverActive 早 return）、:518-524（remap，被架空）、:688（presentBattleFrame 仅 battle 模式生效）；bootstrap.ts:436-438（路由）；battle-system.ts:2689 + game-state.ts:1430（战末 mode→event）；palette-fade.ts:229-231（skipIndex/remap）。


### ✅ M15 · 🟠 DOS splash fallback 用 FBP chunk 3/4(WIN95 值)而非 DOS 的 0x26/0x27,背景图整张错

- **子系统**:过场·整屏动画与结局　**类别**:pixel
- **TS 位置**:`packages/game/src/shell/bootstrap.ts:1556-1557`
- **C 依据**:`reference/sdlpal/main.c:42-43`
- **玩家可感知**:是
- **修复审查(2026-06-07)**:已收口。`playDosOpening` 改取 `assets.battleBgs.get(0x26/0x27)`,crane/title 仍取 73/71;`splash-fallback.ts` 注释也已改成 DOS 0x26/0x27、WIN95 3/4 的构建分支说明。

**差异**:sdlpal `#define BITMAPNUM_SPLASH_UP (gConfig.fIsWIN95 ? 0x03 : 0x26)` / `SPLASH_DOWN (fIsWIN95 ? 0x04 : 0x27)`,即 DOS splash 用 FBP chunk 0x26=38(上)/0x27=39(下),chunk 3/4 是 WIN95 专用值。`playDosOpening`(DOS fallback,本就是 PAL_PlayAVI 失败后的 DOS 路径)却取 `assets.battleBgs.get(3)`/`get(4)` 当 splash 上下半屏。提取数据里 battle/bg/038.png(18416B)、039.png(134942B)与 003.png(111734B)、004.png(85180B)是完全不同的图像;crane(73=0x49)/title(71=0x47)无 build 分支,取值正确,唯独上下半屏背景取错。splash-fallback.ts 顶部注释也把 'FBP chunk 3 SPLASH_UP / chunk 4 SPLASH_DOWN' 当通用值,实为 WIN95 值。

**玩家影响**:DOS 开场(?build=dos 或 devpanel『开场 DOS』)的仙鹤卷轴 splash 显示的是错误背景位图(WIN95 版图),与原版 DOS splash 画面不符;仙鹤/标题/palette 渐变其余部分正常。

**复核论证**:核对全链条均坐实该差异，且无可推翻的误报来源。

1) C 真值 (reference/sdlpal/main.c:42-43)：`#define BITMAPNUM_SPLASH_UP (gConfig.fIsWIN95 ? 0x03 : 0x26)` / `SPLASH_DOWN (fIsWIN95 ? 0x04 : 0x27)`。即 DOS splash 上/下半屏 = FBP chunk 0x26=38 / 0x27=39；3/4 为 WIN95 专用。
2) C 用法 (main.c:261-266)：`PAL_MKFReadChunk(buf, 320*200, BITMAPNUM_SPLASH_UP, gpGlobals->f.fpFBP)`（下半同理），两张 splash 均从 FBP 归档按该常量索引读取。函数所在 PAL_SplashScreen 正是 PlayAVI("2.avi") 返回失败后的 DOS 渐显路径(main.c:237 早退)。
3) TS 缺陷 (packages/game/src/shell/bootstrap.ts:1556-1557，位于 DOS 专用闭包 playDosOpening)：`fbpUp = assets.battleBgs.get(3)` / `fbpDown = assets.battleBgs.get(4)` —— 硬编码 WIN95 值 3/4，未做 DOS→38/39 分支。
4) 归档映射核对(排除"取错归档"误报)：loader.ts:54-55 注释 `battleBgs key = FBP chunk id`；bootstrap.ts:1128 注释 `battleBgs(FBP.MKF 全 dump)`，opcode 0x76 ShowFBP 处理器直接 `battleBgs.get(chunkIdx)`。故 battleBgs.get(N) 严格等价 C 的 fpFBP chunk N，3/4 与 38/39 确为不同 chunk，非等价写法。
5) 提取数据实测(stat 字节数)印证两组确为完全不同图像：003.png=111734B、004.png=85180B(WIN95) vs 038.png=18416B、039.png=134942B(DOS)，与声称完全一致。
6) crane/title 正确性核对(排除"差异在别处也错"夸大)：C main.c:44-45 `SPRITENUM_SPLASH_TITLE 0x47` / `SPLASH_CRANE 0x49` 无 WIN95/DOS 分支，读自 fpMGO；TS loader.ts:215-220 加载 MGO chunk 71(=0x47)/73(=0x49)，extractor cli.ts:683 / sprite.ts:101 从 MGO.MKF dump。故仙鹤/标题取值正确，唯独上下半屏背景取错——与声称吻合。
7) splash-fallback.ts 顶部注释(第~39行 `FBP chunk 3 SPLASH_UP`、文件头 1-2 行)确把 3/4 当通用值，实为 WIN95 值，佐证缺陷成因是误把 WIN95 常量当通用。

唯一对严重度的限定：DOS 开场仅经 `?build=dos`(bootstrap.ts:134-138 默认 win95→播 1.mp4/2.mp4)或 devpanel『开场 DOS』触发，默认路径玩家不经此路。但声称本身已把玩家影响精确限定在 DOS 开场路径；在该可达路径上缺陷为真且整张背景位图错误(玩家强可感知)，故 confirmed、medium 成立。

**C 源证据**:reference/sdlpal/main.c:42-43 (BITMAPNUM_SPLASH_UP=fIsWIN95?0x03:0x26 / DOWN=0x04:0x27)；main.c:261-266 (两张 splash 均 PAL_MKFReadChunk 自 gpGlobals->f.fpFBP，按上述常量索引)；main.c:237 (PlayAVI("2.avi") 失败方进此 DOS 渐显)；main.c:44-45 (TITLE 0x47 / CRANE 0x49 无 build 分支，读自 fpMGO)。TS 侧坐实：bootstrap.ts:1556-1557 取 battleBgs.get(3)/get(4)；bootstrap.ts:1128 + loader.ts:54-55 证 battleBgs=FBP.MKF 全 dump、key=FBP chunk id。提取实测：003=111734B/004=85180B vs 038=18416B/039=134942B。


## 🟡 Low（47）

### ✅ L1 · 🟡 姓名 title 识别漏 kDialogCenter 排除条件 —— center 风格下以冒号结尾的对白被误当姓名牌画到左上角

- **子系统**:事件脚本·对话与文本　**类别**:correctness
- **TS 位置**:`packages/game/src/present/dialog-box.ts:270 (startDialogLine) 与 :315 (appendDialogLine)`
- **C 依据**:`reference/sdlpal/text.c:1715-1726`
- **玩家可感知**:是

**差异**:C(PAL_ShowDialogText,text.c:1715)判定姓名 title 的条件是三个 AND:`nCurrentDialogLine == 0 && bDialogPosition != kDialogCenter && 末字是 ：/∶/:`。即 **kDialogCenter(居中对白框)永不把冒号结尾行当姓名** —— 它按正文画在 posDialogText(80,40)、走 TEXT_DisplayText 的逐字符色与行计数。TS 的 isCharacterNameLine(dialog-box.ts:194)只看末字标点,startDialogLine/appendDialogLine 在所有 style(含 'center')上都调用它,完全没有 style==center 的排除。真实数据可复现:all.json 段内 idx 23602-23605 序列 `setDialogStyleCenter; showDialog "李逍遥心里想∶"; showDialog "哈～太好了"; showDialog "果然鬼怪头脑都很单纯"`,以及 idx 28059 `李逍遥心里想∶`(同样紧跟在 center 风格里)。C 把 "李逍遥心里想∶" 画成居中正文第 0 行(默认色,后两句续在第 1、2 行同框);TS 因 isCharacterNameLine 命中,把它当 titleText 画到 getDialogTitlePos('center')=(12,8) 用 FONT_COLOR_CYAN_ALT(0x8C),且 currentLineText=null/dialogLineCount=0,该句从居中正文区消失。

**玩家影响**:李逍遥/赵灵儿等"心里想∶"的居中独白,本该是居中框里的第一行白字,在 TS 里被错位渲染成屏幕左上角(12,8)的青色姓名牌,且不在居中框内显示;玩家看到旁白文字位置与颜色都不对,且与紧随其后的两句不在同一框。

<details><summary>C 源证据 / 复核</summary>

reference/sdlpal/text.c:1715-1720(姓名判定三 AND 含 bDialogPosition != kDialogCenter 排除);text.c:1320-1322(kDialogCenter 仅设 posDialogText=(80,40),不设 title);text.c:1727-1746(else 分支:TEXT_DisplayText 画正文 + nCurrentDialogLine++);text.c:1725(title 分支 FONT_COLOR_CYAN_ALT);text.h:29-32(kDialogUpper=0/kDialogCenter=1/...);TS:dialog-box.ts:194-198 isCharacterNameLine 无 style 判断、:270 startDialogLine、:315 appendDialogLine 无条件调用、:182 getDialogTitlePos('center')=(12,8)、:201/580 FONT_COLOR_CYAN_ALT=0x8C;event-system.ts:1810-1816 showDialog→startDialogLine 带 currentDialogStyle、:1848-1853 setDialogStyleCenter→'center';数据 all.json segments[0].commands idx 23601-23605(opcode5;setDialogStyleCenter;showDialog"李逍遥心里想∶";"哈～太好了";"果然鬼怪头脑都很单纯")。反证:idx 28055 setDialogStyleBottom 使 28059 跑在 bottom;块内可靠回溯全库 center+块首+冒号仅 idx 23603 一条。

C 源核实成立。text.c:1715-1720 的姓名 title 判定确为三 AND:`nCurrentDialogLine == 0 && bDialogPosition != kDialogCenter && (末字 0xff1a/0x2236/':')`。其中 `kDialogCenter` 排除条件真实存在,kDialogCenter(text.h:30)下永不走 title 分支,而是落到 else(text.c:1727-1746)以 TEXT_DisplayText 画在 posDialogText(kDialogCenter=80,40,text.c:1320-1322)、默认色、nCurrentDialogLine++。

TS 侧分歧属实:isCharacterNameLine(dialog-box.ts:194-198)只看末字标点(0xff1a/0x2236/0x3a),无任何 style 判断;startDialogLine(dialog-box.ts:270)与 appendDialogLine(dialog-box.ts:315)在所有 style(含 'center')上无条件调用它,完全缺 `style==='center'` 排除。命中后置 titleText、画在 getDialogTitlePos('center')=(12,8)(dialog-box.ts:182)、用 FONT_COLOR_CYAN_ALT=0x8C(dialog-box.ts:201/580),且 currentLineText=null、dialogLineCount=0(dialog-box.ts:275/288),该句从居中正文区(80,40)消失。style 映射 'center'⇔kDialogCenter 经 events.ts:38/105 与 event-system.ts:1848-1853 确认。事件流 showDialog(event-system.ts:1810-1816)以 gs.currentDialogStyle 调 startDialogLine,确会带 'center'。无任何现存测试断言"center+冒号结尾应作正文",分歧未被他处处理(对比 shouldShowKeyIcon dialog-box.ts:635-638 已专门补了 center 排除,而 title 路径没补,属遗漏而非有意决策)。

但两点修正了原报告:
(1) 原报告第二个例子 idx 28059 `李逍遥心里想∶` 错误——回溯最近 setDialogStyle 是 idx 28055 `setDialogStyleBottom`,28056-28061 无 style 变更,故 28059 实跑在 bottom(kDialogLower)下,C 与 TS 都正确当 title,无分歧。原报告"同样紧跟在 center 风格里"系误判。
(2) 影响范围远小于"李逍遥/赵灵儿等心里想∶居中独白"的暗示。按基本块内(无 end/label/前驱 showDialog 介入)可靠回溯,全 all.json 仅 idx 23603 一条真正以 center 风格、块首、冒号结尾执行。朴素线性 style 跟踪报的 49 条是控制流伪影——`李大娘∶`/`阿九∶`/`衙役∶`(idx 544/557 等)各自带独立 label、前置 end,经 call/trigger 入口在 bottom 等风格下执行,被线性扫描错误地继承了无关位置的 center 风格。真正受影响的只有"天鬼皇"剧情里李逍遥的一句内心独白旁白(idx 23603,后接 23604/23605 两句续在同一居中框)。

</details>


### ✅ L2 · 🟡 fUserSkip 不跨行持续 —— 按一次确认只跳过当前行,无法像原版那样让整段剩余对白瞬显

- **子系统**:事件脚本·对话与文本　**类别**:timing
- **TS 位置**:`packages/game/src/present/dialog-box.ts:473-478 (confirmDialog) + DialogBoxState 缺 userSkip 字段`
- **C 依据**:`reference/sdlpal/text.c:1597,1546-1553,1264,1447`
- **玩家可感知**:是

**差异**:C 中 g_TextLib.fUserSkip 是 dialog 块级状态:打字途中按 kKeySearch/kKeyMenu 一次后 fUserSkip=TRUE(text.c:1607),此后 TEXT_DisplayText 的逐字符 `UTIL_Delay(iDelayTime*8)` 守卫 `if (!isDialog && !g_TextLib.fUserSkip)`(text.c:1597)对**同一对白块后续所有行**都为假 → 后续行全部一次性瞬显,无打字动画。fUserSkip 仅在 `~` 收尾(text.c:1553)、翻页/段末 PAL_DialogWaitForKey(text.c:1447)、新 PAL_StartDialog(text.c:1264)时复位。TS 的 confirmDialog(dialog-box.ts:473)对 'typing' 只把当前行 charsRevealed=len、phase='line-done',返回 'skip-typing';DialogBoxState 没有 userSkip 标志,下一行经 appendDialogLine 重置 typingFrames=0/charsRevealed=0/phase='typing' 又从头按 iDelayTime 速度逐字打。

**玩家影响**:原版玩家在多行对白里按一次空格,本应让该段剩下所有行立刻全显(快速跳过);TS 里按一次只跳完当前一行,下一行又重新一字一字慢慢打,玩家必须对每一行反复按键才能加速,推进对话的手感比原版慢且费按键。

<details><summary>C 源证据 / 复核</summary>

text.c:1597,1600 逐字符延时守卫 `if (!isDialog && !g_TextLib.fUserSkip){ UTIL_Delay(iDelayTime*8); ... }`，fUserSkip=TRUE 时整行瞬显;text.c:1607 打字途中按 kKeySearch|kKeyMenu 置 fUserSkip=TRUE;text.c:1737 普通多行对话走 `TEXT_DisplayText(..., FALSE)`(isDialog=FALSE，守卫生效)，text.c:1698 仅居中小窗 narration 才 TRUE;fUserSkip 仅在 text.c:1264(PAL_StartDialog)/1447(PAL_DialogWaitForKey)/1553(`~`)/1815(PAL_EndDialog) 复位，PAL_ShowDialogText 本身不复位;script.c:3438-3459 0xFFFF 在 `while(iMsg=PAL_GetMsgNum)` 内逐行调 PAL_ShowDialogText(3458)，相邻两行间(无 iMsg==0 翻页、无 `~`)fUserSkip 跨行持续。TS:game-state.ts:293-359 DialogPhase/DialogBoxState 无 userSkip 字段;dialog-box.ts:474-477 confirmDialog 的 skip-typing 只把当前行 charsRevealed=len;dialog-box.ts:337-339 appendDialogLine 每行无条件 typingFrames=0/charsRevealed=0/phase='typing';event-system.ts:1541-1547+1596-1602 skip-typing→line-done→auto ip++→下条 showDialog 重新 append 从头打。

差异属实，且四条反驳路径均被排除。

(1) isDialog 取值正确:普通多行对话经 PAL_ShowDialogText 调 TEXT_DisplayText(...,FALSE)(text.c:1737)，故守卫 `!isDialog && !fUserSkip`(text.c:1597)对普通对话生效;isDialog=TRUE 只用于居中小窗 narration(text.c:1698)。claim 没读错路径。

(2) fUserSkip 确为 dialog 块级状态、跨行持续:0xFFFF 在单条 opcode 内用 while 循环逐行调 PAL_ShowDialogText(script.c:3446-3459)，而 fUserSkip 的复位点(text.c:1264/1447/1553/1815)都不在相邻两行之间触发 —— PAL_ShowDialogText 自身从不复位。所以打字途中按一次键(text.c:1607 置 TRUE)后，同段后续每行 TEXT_DisplayText 的 `UTIL_Delay(iDelayTime*8)`(text.c:1600)守卫为假 → 全部瞬显、无逐字动画。

(3) TS 确无对应机制:DialogBoxState 无 userSkip 字段(game-state.ts:295-359)，confirmDialog 的 skip-typing 仅满当前行(dialog-box.ts:474-477)，appendDialogLine 每行硬重置 typingFrames/charsRevealed/phase(dialog-box.ts:337-339)。event-system skip-typing→line-done→ip++→下条 showDialog 重新 append 从头逐字打(event-system.ts:1541-1602)。既有测试(event-system.test.ts:1681、dialog-box.test.ts:274)也只覆盖"跳当前行"，不存在跨行持续跳过。

(4) 可感知性成立:TS 打字速度 revealAt 按 iDelay*8=24ms/字累加(dialog-box.ts:115，默认 iDelay=3)，每 100ms tick(FRAME_MS_EXPLORE)约显 4 字，一行 14-28 字约 350-670ms 可见逐字;C 同为 24ms/字。故原版按一次让整页剩余 2+ 行瞬显、TS 却要每行重新逐字打且需逐行再按键，是可复现的真实差异。

严重度维持 low:仅在"同一页按一次确认后仍剩 2 行以上待打"时才体现(多数 NPC 单行/短行会自动推进，翻页边界本就要按键)，只多费按键、略慢，不阻断推进、不影响存档或文本正确性。是否被玩家自觉察觉需实机体验，但行为差异客观存在且可复现。

</details>


### ✅ L3 · 🟡 gs.wLayer（0x6E 设置的队伍层）在渲染层从未被使用，且换场景未重置 → 上下层走位时主角精灵 Y 偏移/遮挡排序错误

- **子系统**:事件脚本·走位与场景控制　**类别**:pixel
- **TS 位置**:`packages/game/src/present/present.ts:303,308 (party Y/iLayer 硬编码 10/6，忽略 gs.wLayer)；event-system.ts:3723 (0x6E 写 gs.wLayer)；loadScene 未重置 wLayer (scene-system.ts:547-599 / event-system.ts:2419-2444)`
- **C 依据**:`reference/sdlpal/scene.c:224-226 (party 绘制用 `rgParty[i].y + wLayer + 10`、`iLayer = wLayer + 6`)；script.c:1883 (0x59 loadScene 设 `wLayer = 0`)`
- **玩家可感知**:是
- **修复补充**:按复核结论(精灵屏幕像素位置不变,wLayer 在 blit 相消)只接两条真实通道 —— present.ts 把 party / 跟随者 / 0x98 额外跟随者的 **sort key** `baseY` 与 **cover-tile** `iLayer`(进而 cover sx = x - iLayer/2)都加上 `gs.wLayer`(blit 的 `capturedSY + 4` 保持不变);event-system.ts loadScene(0x59)真换场景分支补 `gs.wLayer = 0`(script.c:1883)。scene-reset 走 TDD(event-system.test.ts);渲染 z-sort/cover-sx 属 pixel 无清晰单测路径,靠 scene.c 真值锚定 + 既有 present 测试(wLayer=0)零回归。

**差异**:C 绘制主角精灵时 Y = `rgParty.y + gpGlobals->wLayer + 10`，绘制层 iLayer = `wLayer + 6`，均叠加 gpGlobals->wLayer（由 0x6E playerWalkOneStep 的 operand[2]*8 设置，用于上桥/上层时抬高精灵并改变与地图 tile 的前后遮挡）。TS 中 0x6E 正确写入 gs.wLayer，但 present.ts 把队伍 Y 偏移和 iLayer 硬编码为 10/6（代码注释 “runtime gs.wLayer 待补”），grep 确认 present 层任何精灵渲染都没有读取 gs.wLayer。因此 0x6E 设的层在画面上完全无效。次要地：C 在 0x59 loadScene 时把 wLayer 归 0（script.c:1883），TS loadScene 路径未做此重置（不过因为渲染本就不读 wLayer，这一条目前无可见后果）。

**玩家影响**:主角通过 0x6E 走上桥/上层结构时,与桥面/层结构的前后遮挡、z 排序异常(应在桥上却被桥栏遮住或反之)。注:精灵屏幕像素高度其实不变(wLayer 在 blit 相消),根因是 z-sort 排序键与 cover-tile 取样列漏算 wLayer,而非精灵被抬高。

<details><summary>C 源证据 / 复核</summary>

scene.c:223-226（party 加入绘制：pos.y=rgParty[i].y+wLayer+10，iLayer=wLayer+6）；scene.c:99-100（cover-tile sx=pos.x-iLayer/2、sy=pos.y-iLayer）；scene.c:334（按 pos.y 冒泡 Y-sort）；scene.c:358（blit y=pos.y-height-iLayer，wLayer 相消）；scene.c:316（event-object iLayer=sLayer*8+2，TS 已正确移植于 present.ts:481-482）；script.c:2107（0x6E：wLayer=operand[2]*8）；script.c:1883（0x59 loadScene：wLayer=0）。TS：present.ts:292/303/308（硬编码 10/10/6，忽略 gs.wLayer，:308 注释“待补”）、:376/386/391（followers 同）；event-system.ts:3723（写 gs.wLayer）；scene-system.ts:547-599 与 event-system.ts:2419-2444（loadScene 未重置 wLayer）。grep：全 game/src 非注释 wLayer 仅 game-state.ts:881/1580 + event-system.ts:3723/3730。extracted/events/all.json：opcode110 共313处，operand[2]≠0 19处（值1..10）。

核对全部成立，但 reasoning 需修正“声称玩家影响”中“精灵 Y 抬高”这一措辞。

【主缺陷：渲染层从不读 gs.wLayer — 确认】
- C 真值 scene.c:223-226：party 加入绘制队列时 pos.y = `rgParty[i].y + gpGlobals->wLayer + 10`，iLayer = `gpGlobals->wLayer + 6`。
- TS 写入侧正确：event-system.ts:3723 `gs.wLayer = (operands[2] ?? 0) * 8`，对齐 C script.c:2107 `wLayer = operand[2] * 8`。
- TS 渲染侧硬编码：present.ts:292 `baseY: gs.party.y + 10`、:303 cover sy=`party.y + 10`、:308 iLayer 字面量 `6`；followers 同样 present.ts:376/386/391 用 `+10`/`6`。:308 注释自承“runtime gs.wLayer 待补”。
- grep 决定性证据：全 game/src 非注释代码引用 wLayer 仅 game-state.ts:881(类型)、:1580(初值0)、event-system.ts:3723(写)、:3730(debug log)；present/draw-sprite/draw-tilemap 内 wLayer 全在注释里。渲染确实从不读 gs.wLayer。
- 内部不一致佐证：同文件 present.ts:481-482 对 NPC/event-object 正确实现了层 —— `sortY = npc.y + sLayer*8 + 9`、`iLayer = sLayer*8 + 2`（对齐 C scene.c:316）。即代码懂层机制，唯独 party 漏接 wLayer。

【真实可见效果（修正声称措辞）— 据 C 渲染数学逐项核对】
C 最终 blit y(scene.c:358) = pos.y - height - iLayer = (party.y + wLayer + 10) - height - (wLayer+6) = party.y + 4 - height —— wLayer 相消，精灵屏幕像素位置与 wLayer 无关。TS blit 也得 capturedSY+4，二者 blit 位置一致。故声称的“精灵按层抬高/Y 偏移”不准确（精灵不会在屏上抬高）。
但 wLayer 经两条通道仍产生真实遮挡错误：
(1) z-sort key：C 排序键 pos.y = party.y + wLayer + 10(scene.c:225,334 冒泡按 pos.y)；TS baseY=party.y+10。wLayer=8..80 时 C 把 party 排得更靠后(更前景)，TS 用 wLayer=0 位置 → party 与同 y 的 NPC/tile 前后顺序错。
(2) cover-tile 横向 sx：C scene.c:99 `sx = pos.x - iLayer/2`，iLayer=wLayer+6 → sx 比 TS(iLayer=6)左移最多 wLayer/2=40px → 取样不同列的遮盖 tile，重画的盖 tile 列错。
(注：cover sy = pos.y - iLayer 中 wLayer 相消 = world.y+4，垂直裁剪不变。)
结论：声称“遮挡排序错误/应在桥上却被桥栏遮住或反之”方向正确，但根因是 z-sort 键与 cover sx 漏了 wLayer，而非精灵被抬高。

【真实使用频率】data/extracted/events/all.json 中 opcode 110(0x6E) 共 313 处，其中 operand[2]≠0(设非零层)19 处，取值 1..10(即 wLayer=8..80px)，多为桥/上下层走位序列 —— 该机制在原作真实被用，非死代码路径。

【次缺陷：loadScene 未重置 wLayer — 确认为代码事实，效果当前被掩盖】
C script.c:1883 在 0x59(0059) 换场景时置 `wLayer = 0`。TS loadScene(scene-system.ts:547-599) 与 loadScene opcode 处理(event-system.ts:2419-2444)均无 `gs.wLayer = 0`；shell/reload 路径 grep 也无重置。属实。但因渲染本就不读 wLayer，此条目前无可见后果；即便修好渲染，跨场景残留也多被进场新 0x6E 覆盖，影响有限。

【测试】仅 game-state.test.ts:155 验初值0、event-system.test.ts:1716 验 0x6E 写 wLayer=8（写侧），无任何测试断言 wLayer 感知渲染，与“待补”一致。

综上 confirmed：写侧对、读侧整体缺失，真实脚本有 19 处触发，玩家在上桥/上下层走位时确会看到主角与桥面/层结构的前后遮挡/z-序异常（但不是精灵被抬高）。

</details>


### ✅ L4 · 🟡 明雷怪追击/NPC 走路逐帧推进硬编码 %4,未按 nSpriteFrames 取模(且 nSpriteFrames==0 仍推帧)

- **子系统**:大世界·走路跟随与碰撞　**类别**:correctness
- **TS 位置**:`packages/game/src/core/event-system.ts:4911-4916, 4654-4664`
- **C 依据**:`reference/sdlpal/scene.c:893-902`
- **玩家可感知**:是

**差异**:C 的 PAL_NPCWalkOneStep 推进走路帧时:`if (nSpriteFrames>0){ wCurrentFrameNum++; wCurrentFrameNum %= (nSpriteFrames==3?4:nSpriteFrames);} else if (nSpriteFramesAuto>0){ ...%= nSpriteFramesAuto;}`(scene.c:893-902)—— 取模基数随 nSpriteFrames 变,且 nSpriteFrames==0(非方向性单姿势 sprite)时**根本不走这条**、wCurrentFrameNum 不前进。TS 在 monsterChasePlayer 收尾(event-system.ts:4916)与 npcWalkTo 收尾(:4663)都写死 `scriptedFrame = (scriptedFrame+1)%4`,与 nSpriteFrames 无关:对 nSpriteFrames∈{1,2} 的怪/NPC 帧序错(=4 时 %4 恰与 C 相等、无差);nSpriteFrames==0 时 C 不推帧而 TS 内部仍 0→1→2→3,但渲染层 `frames[idx] ?? frames[0]`(present.ts:465)在单帧数组下越界全回退 frames[0] → 像素与 C 相同、玩家不可感知。常见明雷怪/巡逻 NPC 是 nSpriteFrames=3,%4 恰好对、且渲染层有 3 帧 0/1/2/3→0/1/0/2 重映射兜底,故主流情形无差。

**玩家影响**:极低频:仅当被 0x4C 追击或 0x0F-0x12 走路驱动的对象 sprite 帧数为 1 或 2 时,行走动画帧错乱(渗进相邻方向帧块,如 scene140/142 的 2 帧 NPC);nSpriteFrames=0/3/4 经渲染兜底或取模相等,均无可感知差异。

<details><summary>C 源证据 / 复核</summary>

reference/sdlpal/scene.c:893-902(PAL_NPCWalkOneStep:nSpriteFrames>0 时 wCurrentFrameNum++ %= (nSpriteFrames==3?4:nSpriteFrames)，else if nSpriteFramesAuto>0 才推，否则不动)；scene.c:262-280(渲染 iFrame=wCurrentFrameNum，nSpriteFrames==3 时 2→0/3→2，idx=dir*nSpriteFrames+iFrame)；script.c:88/500(PAL_NPCWalkTo、PAL_MonsterChasePlayer 调 PAL_NPCWalkOneStep)。TS：event-system.ts:4663、4916、3616、3648 写死 %4；present.ts:456-465 idx 与 ?? frames[0] 兜底；data/extracted/data/event-objects.json 全量 nSpriteFramesAuto 恒 0，nSpriteFrames 分布 {0:3335,1:372,2:262,3:896,4:212}；scene-140.json autoScript L_22121 连续 0x10 walkTo 段。

核对结论：差异成立，但需对玩家影响做两处修正。

C 真值(scene.c:893-902)：PAL_NPCWalkOneStep 推进 wCurrentFrameNum 时 `if (nSpriteFrames>0){ wCurrentFrameNum++; wCurrentFrameNum %= (nSpriteFrames==3?4:nSpriteFrames);} else if (nSpriteFramesAuto>0){ ... %= nSpriteFramesAuto;}` —— 取模基数随 nSpriteFrames 变；nSpriteFrames==0 且 nSpriteFramesAuto==0 时**两条分支都不走**，wCurrentFrameNum 恒为 0。我实测 data/extracted/data/event-objects.json 全量 5081 个对象 nSpriteFramesAuto 全为 0，故第二条分支在本作是死代码。

TS 侧 `(scriptedFrame+1)%4` 写死，且不止声称的两处：event-system.ts:4663(npcWalkTo)、:4916(monsterChasePlayer)，另有 :3499、:3616(OP_NPC_WALK_ONE_STEP 0x6C)、:3648(OP_ANIMATE_OBJECT)。渲染公式 present.ts:460-464 与 C scene.c:262-280 一致：idx = dir*nSpriteFrames + iFrame，且仅 nSpriteFrames==3 时做 2→0/3→2 重映射。

逐 nSpriteFrames 值核算渲染后果：
- =3：TS %4 与 C %4 完全相等，无差(约 896 个标准走路对象)。
- =4：C 取模也是 `nSpriteFrames==3?4:4`=4，TS %4 与之**相等** —— 声称"≠3 一律错"在此过度，nSpriteFrames=4 其实无差。
- =2：TS 帧序 0,1,2,3 循环；C 为 0,1。TS 的 iFrame=2,3 使 idx=dir*2+{2,3} 渗进相邻方向帧块。真差且可感知。
- =1：TS 0,1,2,3；C 恒为 per-dir 站立帧。TS iFrame=1,2,3 渗进/越界。真差且可感知。
- =0：C 恒帧 0；TS scriptedFrame 内部确被推到 1,2,3，但渲染 `frames[idx] ?? frames[0]`(present.ts:465)在单元素数组下 idx≥1 越界全回退 frames[0] —— **渲染像素与 C 相同**。故声称"nSpriteFrames==0 出现 0/1/2/3 闪帧"不成立，被 ?? frames[0] 兜底掩盖，玩家不可感知。

实机存在性：静态追踪 trigger+autoScript(随 goto/call)确认真实走路对象命中：scene 140 sprite 166(nSpriteFrames=2)autoScript L_22121 含一长串连续 0x10 walkTo(flat idx 242-254)+ 0x6C —— 一段较长的双帧精灵行走，TS 每第 3/4 步渲染到相邻方向帧，重复肉眼可见；scene 142 sprite 166 同型；scene 58 sprite 135(=1)经 0x6C；scene 113 sprite 301(=1)经 0x0B。opcode 0x10 经 event-system.ts:2339 → npcWalkTo → :4663 的 %4，链路确认。

综上：核心论断(硬编码 %4 未随 nSpriteFrames 取模、nSpriteFrames==0 仍推帧)成立。两处玩家影响需修正：nSpriteFrames=4 实际无差；nSpriteFrames=0 内部状态虽偏但被渲染兜底掩盖、不可感知。真正可感知仅 nSpriteFrames∈{1,2} 的走路对象，确有实例但属非标准少数精灵，表现为行走动画帧错乱(非崩溃/非数值)。low 严重度恰当。

</details>


### ✅ L5 · 🟡 站立帧未复刻 s_iThisStepFrame &= 2; ^= 2 的脚步相位翻转

- **子系统**:大世界·走路跟随与碰撞　**类别**:timing
- **TS 位置**:`packages/game/src/core/scene-system.ts:456-460`
- **C 依据**:`reference/sdlpal/scene.c:773-774`
- **玩家可感知**:否

**差异**:C 的 PAL_UpdatePartyGestures(FALSE) 站立分支末尾对静态量做 `s_iThisStepFrame &= 2; s_iThisStepFrame ^= 2;`(scene.c:773-774):把内部步频相位在 0↔2 间翻转,决定下次起步先迈哪条腿(leader 帧序 [0,1,0,2]:相位 0 起步→帧1,相位 2 起步→帧2)。TS 站立时只把 walkingFrame.walking 置 false(scene-system.ts:456/460),完全不动 stepFrame,起步时直接从停下时的 stepFrame `+1`(scene-system.ts:453)。因此停步→再走的领队/队员起步腿与原版可能差一相位。

**玩家影响**:细微动画差异:每次停下再走时,主角及队员的起步迈腿脚序可能与原版相反,连续走停时步态相位与原版不完全同步;不影响位置或玩法。

<details><summary>C 源证据 / 复核</summary>

reference/sdlpal/scene.c:654 (static int s_iThisStepFrame=0,跨帧持久); scene.c:663-672 (走路 (s+1)%4 + iStepFrameLeader/Follower 计算); scene.c:680/684/724/728/742 (s_iThisStepFrame 只喂 wFrame); scene.c:773-774 (站立分支 &=2; ^=2 相位翻转,0/1→2,2/3→0); scene.c:847 (站立调 PAL_UpdatePartyGestures(FALSE)); play.c:519/534/543 (PAL_StartFrame 每视频帧调 PAL_UpdateParty,站立帧每帧重跑翻转). TS: packages/game/src/core/scene-system.ts:452-460(走路+1 mod4、站立仅 walking=false 冻结 stepFrame); packages/game/src/present/present.ts:253/331([0,1,0,2] 表忠实移植); packages/game/src/core/scene-system.test.ts:1404-1418(显式钉死站立 stepFrame 冻结、下次+1)。

差异属实，非误报，但玩家可感知性比"low"声称的还要弱。

C 真值核对(reference/sdlpal/scene.c):
- PAL_UpdatePartyGestures 中 s_iThisStepFrame 是 `static int`(scene.c:654),跨帧持久。
- 走路分支 s_iThisStepFrame=(s+1)%4(scene.c:663);leader walkFrames==4 → wFrame=dir*4+s(scene.c:680),walkFrames==3 → 用 iStepFrameLeader,序列即 [0,1,0,2][s](scene.c:664-672/684)。
- 站立分支末尾 s_iThisStepFrame &= 2; s_iThisStepFrame ^= 2;(scene.c:773-774):0/1→2，2/3→0(相位翻转)。s_iThisStepFrame 只喂 wFrame(leader 680/684、follower 724/728/742)，不碰 pos/trail/viewport/碰撞。
- 调用链:PAL_StartFrame"once per video frame"(play.c:519)→ PAL_UpdateParty(play.c:543)→ 站立(无方向键或撞墙)走 PAL_UpdatePartyGestures(FALSE)(scene.c:847)。

TS 核对:
- scene-system.ts:452-453 走路 walking=true; stepFrame=(stepFrame+1)%4;站立(456/460)只 walking=false，stepFrame 冻结不动。test 1404-1418 明确钉死"idle stepFrame 保持不变…下次走从 2 继续+1→3"。
- 渲染 present.ts:251/253、329/331 的 [0,1,0,2] 表是 C iStepFrameLeader/Follower 的忠实移植。

故差异确为:C 站立每帧翻转内部相位、TS 站立冻结 stepFrame。声称读码、行号、帧表全部正确，C 依据准确。

关键对抗性结论(削弱可感知性):因 PAL_UpdatePartyGestures(FALSE) 每视频帧都被调用，scene.c:773-774 在每个站立帧都重跑，使 s_iThisStepFrame 在 2↔0 间逐帧来回振荡。玩家恢复走路时取到的相位取决于"站立了奇数还是偶数帧"——即按键松开到再按之间经过的视频帧数奇偶(亚感知级实时时序，玩家无法精确控制)。也就是说原版自身每次停-走的起步腿就是不稳定/近乎随机的;TS 只是把它变成确定性(从停下处+1)。两者都产生合法的左右交替步态，都不会看起来异常。因此虽然静态相位翻转确实未被复刻(confirmed),但玩家几乎无法可靠区分两种实现——可感知性低于声称。

</details>


### ✅ L6 · 🟡 读档/新游戏不复位物品菜单光标 iCurInvMenuItem

- **子系统**:存档·初始化与启动流程　**类别**:correctness
- **TS 位置**:`packages/game/src/shell/bootstrap.ts:1429-1475`
- **C 依据**:`reference/sdlpal/global.c:948`
- **玩家可感知**:是

**差异**:C 真值:PAL_InitGameData 在每次读档/新游戏后都执行 `gpGlobals->iCurInvMenuItem = 0`(global.c:948),且 iCurInvMenuItem 是 gpGlobals 运行时全局、不在 SAVEDGAME_WIN(global.h:508)。TS 把 iCurInvMenuItem 当作 GameState 字段序列化进存档(game-state.ts:862-863),loadGameFromSlot 经 Object.assign 恢复存档里那份旧光标值,且没有像 C 一样在读档后强制归 0(对比:loadGameFromSlot 只显式复位了 iCurEquipPart=-1,bootstrap.ts:1470)。startNewGameFromPrimary 同样不复位。

**玩家影响**:读档后打开物品菜单,光标停在『存档当时』的物品下标而非顶部;原版读档后物品菜单光标恒回到第 0 项。轻微 UI 行为差异。

<details><summary>C 源证据 / 复核</summary>

global.c:948 `gpGlobals->iCurInvMenuItem = 0;` 在 PAL_InitGameData 内、紧跟 PAL_LoadGame/PAL_LoadDefaultGame 之后无条件执行;global.h:508 iCurInvMenuItem 属 GLOBALVARS(gpGlobals 运行时全局);global.c:530-559 SAVEDGAME_WIN 结构体逐字段列出,**不含** iCurInvMenuItem/iCurMainMenuItem/iCurSystemMenuItem(故 C 端从不持久化此值);调用链 game.c:48/54 PAL_GameMain(bCurrentSaveSlot=PAL_OpeningMenu()→ReloadInNextTick)→ global.c:908 PAL_SetLoadFlags(kLoadGlobalData...) → res.c:222 PAL_InitGameData(bCurrentSaveSlot),对新游戏(slot0→PAL_LoadDefaultGame,global.c:945)与读档(slot1-5→PAL_LoadGame)统一走此路径,即两种情形都过 line948 归零。

差异属实，两侧均核对到位。C 真值:iCurInvMenuItem 是 gpGlobals 运行时字段(global.h:508)、明确不在 SAVEDGAME_WIN 结构(global.c:530-559 逐字段已确认无此项),因此 C 端读档/新游戏后该光标归 0 的唯一来源是 PAL_InitGameData 里无条件的 `iCurInvMenuItem = 0`(global.c:948),且 PAL_GameMain→ReloadInNextTick→res.c:222 的统一加载路径保证新游戏(slot0)与读档(slot1-5)都执行到此行。TS 偏离:(1)持久化层无 SAVEDGAME 白名单——api.ts:36/60 与 indexed-db.ts:66 直接 structuredClone 整个 GameState 入库,而 iCurInvMenuItem 是 GameState 字段(game-state.ts:863),故存档里带着『当时』的光标值,与 C 把它排除在存档外相反;(2)loadGameFromSlot 用 Object.assign(gs, loadedGs)(bootstrap.ts:1438)把旧光标值原样灌回,且读档后仅显式复位 iCurEquipPart=-1(bootstrap.ts:1470),未像 C 那样强制 iCurInvMenuItem=0;(3)startNewGameFromPrimary(bootstrap.ts:1349-1389)及其调用方 setStartGameHandler(bootstrap.ts:1527-1529)均不复位该字段,而 gs 是单例(读档注释 bootstrap.ts:1436『无法替换 ref』,returnToTitle bootstrap.ts:1495-1499 也只清 eventCursor/menuStack/mode),光标值跨『读档→回标题→新游戏』在同一会话内残留。玩家感知确认:createInventoryMenu 以 `gs.iCurInvMenuItem ?? 0`(inventory-menu.ts:125)作为开菜单初始光标(仅 clamp 到 min(cur,len-1),inventory-menu.ts:126),且 menu-driver 各处(354/601/711)把光标回写 gs.iCurInvMenuItem——所以读档后打开物品菜单，光标确实停在存档当时的下标(若仍在库存范围内)而非顶部，可直接观察到。排除了误报：宏/常量无等价展开(948 是字面赋值),差异未在别处被补偿(read 全 loadGameFromSlot 与 startNewGameFromPrimary 未见任何 iCurInvMenuItem 复位),非有意移植决策(game-state.ts:862 注释把它标为 SAVEDGAME_WIN 字段，实为误标——C 中它不在该结构，恰是 bug 根因)。新游戏分支较隐蔽:全新页面首次新游戏因 createInitialGameState 初值为 0(game-state.ts:1577)恰好与 C 一致，差异仅在同会话先动过光标(读档或已开过库存)再不刷新页面开新游戏时显现，但该序列可达。仅凭读码即可定论，无需实机。

</details>


### ✅ L7 · 🟡 读档不复位 sWaveProgression(屏幕波动增量随存档残留)

- **子系统**:存档·初始化与启动流程　**类别**:correctness
- **TS 位置**:`packages/game/src/shell/bootstrap.ts:1429-1475`
- **C 依据**:`reference/sdlpal/global.c:611`
- **玩家可感知**:否

**差异**:C 真值:PAL_LoadGame_Common 在恢复字段时显式 `gpGlobals->sWaveProgression = 0`(global.c:611)——sWaveProgression 不在 SAVEDGAME 里,读档恒清零。TS sWaveProgression 是 GameState 字段(game-state.ts:715,注释也写明『读档恒置 0(sdlpal global.c:611 真值)』),但 loadGameFromSlot 经 Object.assign 恢复的是存档里那份值,代码里并没有在读档路径把它强制设回 0(bootstrap.ts 全文无 sWaveProgression 赋值)。同样地 C 在进场景(res.c:236-240,fEnteringScene 时)还会再清一次 wScreenWave 与 sWaveProgression,TS loadSceneCommon 也没有对应清零。

**玩家影响**:若恰在屏幕波动 ramp(opcode 0x71)进行中存档,读档后 TS 会把这段 ramp 继续跑完再自清(screen-wave 到 0/≥256 自动归零),而原版读档后波动增量恒为 0(冻结在存档幅度)。极低频且玩家几乎不可感知,但与真值有出入。

<details><summary>C 源证据 / 复核</summary>

global.c:611 `gpGlobals->sWaveProgression = 0;`（读档无条件清零，与同函数 602-632 行其它字段读存档形成对比；wScreenWave 见 global.c:610 读存档）；global.c:634 `gpGlobals->fEnteringScene = FALSE;`（故 res.c 清零不在读档路径触发）；res.c:236-240 进场景 fEnteringScene 时 `wScreenWave = 0; sWaveProgression = 0;`；play.c:56-76 fEnteringScene 切场景流程。TS 侧：bootstrap.ts:1438 `Object.assign(gs, loadedGs)` 无后续清零；save/api.ts:35-37 与 save/indexed-db.ts:64-74 整体 structuredClone 序列化（无字段白名单）；screen-wave.ts:33-37 自累加+到 0/≥256 自清。

差异属实。核对结果：

【C 真值】
- global.c:602-632 逐字段从 SAVEDGAME 恢复，唯独 sWaveProgression 不读存档而是写死：global.c:611 `gpGlobals->sWaveProgression = 0;` —— 每次读档无条件清零。wScreenWave 则是真读存档（global.c:610 `gpGlobals->wScreenWave = s->wScreenWave;`），证明 sWaveProgression 确实不在 SAVEDGAME 结构里。
- res.c:236-240 进场景（fEnteringScene 时）再清一次 `wScreenWave = 0; sWaveProgression = 0;`。注意 PAL_LoadGame_Common 在 global.c:634 设 `fEnteringScene = FALSE`，故 res.c 那次清零在“读档”路径不触发，读档只靠 global.c:611 这次清。res.c 的清零是普通脚本切场景（opcode 0x59 设 fEnteringScene=TRUE，play.c:56-76）时才生效。

【TS 现状】
- sWaveProgression 是普通 GameState 字段（game-state.ts:715），注释甚至明写“读档恒置 0（sdlpal global.c:611 真值）”，但无代码执行该约定。
- 存档序列化用 structuredClone 整体克隆 GameState（save/api.ts:35-37 + save/indexed-db.ts:64-74），无字段白名单/结构映射 —— sWaveProgression 因此被原样写进存档并随读档恢复。
- loadGameFromSlot（bootstrap.ts:1429-1475）经 `Object.assign(gs, loadedGs)`（1438 行）载入存档那份值，全函数无 `sWaveProgression = 0`。全仓写 sWaveProgression 的位置仅三处：opcode 0x71（event-system.ts:3475）、战斗结算清尾（battle-system.ts:2688）、动画自动清零（screen-wave.ts:36）—— 均不在读档路径。
- loadSceneCommon（bootstrap.ts:746-840），含 fromSavedGame:true 分支与普通切场景分支，均不清 wScreenWave/sWaveProgression，故 res.c:236-240 的场景入口清零在 TS 普通切场景路径也缺失。

结论：TS 读档恢复存档里的 sWaveProgression 而非强制 0，与 global.c:611 真值有出入，确为 confirmed。

【对“玩家影响”的修正】声称的“画面持续/异常波动”略有夸大：screen-wave.ts:33-37 每帧 `wScreenWave += sWaveProgression`，wScreenWave 到 0 或 ≥256 时自动把两者清 0。故即便存档带非零 progression，读档后只会把进行中的 ramp 跑完再自清，不会永久异常波动。且 wScreenWave 本身 TS 也忠实持久化（与 C 同），唯一分歧是波动“是否继续动画/自终止”(TS) vs “冻结在存档幅度”(C)。要触发须恰好在 0x71 波动 ramp 窗口内存档，极低频。差异真实存在但玩家几乎不可感知，severity=low 合适。

</details>


### ✅ L8 · 🟡 战斗法术选择叠加了 sdlpal 互斥的两套 MP/说明布局(金钱框+右侧MP+居中说明同屏)

- **子系统**:战斗·UI 与像素布局　**类别**:pixel
- **TS 位置**:`packages/game/src/present/battle/draw-battle-ui.ts:528-553`
- **C 依据**:`reference/sdlpal/magicmenu.c:124-216`
- **玩家可感知**:是
- **修复补充**(用户实测截图坐实:说明文字盖住右侧 MP):因 TS 用 `wScriptDesc`(WIN95 机制)出说明,整体改走 **WIN95 布局**(magicmenu.c:208-215 + palcfg.c:383-386):MP 框/数字全在左侧(box 0,0 len5 / needed 15,14 / slash 45,14 / current 50,14),**去掉金钱框、去掉右侧 MP**,保留居中说明。战斗法术菜单与大世界仙术菜单走 sdlpal 同一 `PAL_MagicSelectionMenuUpdate`,故**同步修两处**:`draw-battle-ui.ts`(战斗)与 `draw-magic.ts`(大世界 `drawCashAndMpBox`→`drawMpBox`,后者原同款混用了金钱框+右侧 MP+说明)。两文件各加 TDD:右侧 MP 区(216~272,12~19)无 index-15 sprite + 左侧有写入。

**差异**:TS drawMagicSelectGrid 同帧画三样东西:(1) 左上金钱单行框 0,0 + 金钱标签(10,10)+ dwCash(49,14);(2) 右上 MP 框(215,0)+ slash(260,14)+ needed(230,14)+ current(265,14);(3) 居中仙术说明文字(102, 3+line*16)。但 sdlpal PAL_MagicSelectionMenuUpdate 里这两套布局是互斥的:非 WIN95 且 lpObjectDesc==NULL 路径(magicmenu.c:128-143)只画 金钱框 + 右侧 MP(215~265),【完全不画说明】;非 WIN95 + lpObjectDesc!=NULL 路径(magicmenu.c:146-185)才画说明,但此时 MP 移到左侧(slash 45/needed 15/current 50)且【不画金钱框】;WIN95 路径(magicmenu.c:188-216)画说明 + 左侧 MP(MagicMPSlashPos=45/NeededPos=15/CurrentPos=50,palcfg.c:384-386),同样无金钱框。TS 用的是『非WIN95-noDesc 的金钱框+右侧MP』坐标,却又叠了说明文字——这是任何单一 sdlpal 路径都不会出现的组合。说明文字源 getScriptDescLines 走的是 item.wScriptDesc 脚本链(WIN95 风格),进一步印证两路径被混用。

**玩家影响**:战斗中选法术时,屏幕同时出现金钱框(左上)、需求/当前 MP(右上)和一段法术说明(中部)。原版任一配置下都见不到这种三件套:DOS 版只有金钱+右MP无说明;若要显示说明则 MP 应在左侧且无金钱框。多出的说明文字位置与原版任何形态都对不上。

<details><summary>C 源证据 / 复核</summary>

reference/sdlpal/magicmenu.c:130-142(非WIN95-noDesc:金钱框0,0+标签10/10+dwCash 49/14;右侧 MP 框215,0+slash 260/14+needed 230/14+current 265/14,无说明);magicmenu.c:146-186(非WIN95-desc:说明 PAL_XY(102,k) 166行,左侧 MP slash45/needed15/current50,无金钱框无右MP);magicmenu.c:189-216(WIN95:说明102+左侧 MP MagicMPSlashPos/Needed/Current);reference/sdlpal/palcfg.c:384-386(MagicMPSlashPos=45,14 NeededPos=15,14 CurrentPos=50,14)+:389(MagicDescMsgPos=102,0);reference/sdlpal/ui.h:43(DESCTEXT_COLOR=0x3C)。TS:packages/game/src/present/battle/draw-battle-ui.ts:528-553(三件套同帧无门控)+:105-114(常量)+:263-264(实时分派)。数据:data/extracted/data/spells.json(62/102 scriptDesc!=0)+ all.json chain(43275→"我方单人HP+75")。

见上。

</details>


### ✅ L9 · 🟡 战斗杂项→物品二级菜单时,父菜单『道具』高亮色用了闪烁选中色而非确认色(0x2C)

- **子系统**:战斗·UI 与像素布局　**类别**:pixel
- **TS 位置**:`packages/game/src/present/battle/draw-battle-ui.ts:273-275,480-483`
- **C 依据**:`reference/sdlpal/uibattle.c:400-412,502-506`
- **玩家可感知**:是

**差异**:进入 miscItemSubMenu(使用/投掷二级)时,TS drawBattleUI 先调 drawMiscMenu 再调 drawMiscItemSubMenu;drawMiscMenu 对 state.miscMenuCursor(此时=1 道具)永远用 selectedColor()=MENUITEM_COLOR_SELECTED(闪烁 0xF9..0xFE)上色。但 sdlpal 在 PAL_BattleUIMiscItemSubMenuUpdate(CLASSIC,uibattle.c:503)调用的是 PAL_BattleUIDrawMiscMenu(1, TRUE),fConfirmed=TRUE → PAL_BattleUIDrawMiscMenu 对 wCurrentItem==1 的项走 MENUITEM_COLOR_CONFIRMED 分支(uibattle.c:402-405)=固定 0x2C(绿色已确认),而非闪烁选中色。TS 缺少 fConfirmed 概念,父菜单『道具』在二级停留期间仍闪烁。(注:二级子项 使用/投掷 本身用 MENUITEM_COLOR_SELECTED 闪烁,这点 TS 与 C 一致;差异仅在父菜单那一项的颜色。)

**玩家影响**:在战斗里选『道具』展开『使用/投掷』二级菜单时,上层『道具』字样应显示为固定的已确认绿色(0x2C),原版玩家以此感知『已进入道具子层』;TS 里它仍像普通光标一样亮色闪烁,与原版观感不同。

<details><summary>C 源证据 / 复核</summary>

ui.h:31 (MENUITEM_COLOR_CONFIRMED=0x2C); ui.h:36-39 (SELECTED 闪烁); uibattle.c:344-346 (函数签名 fConfirmed); uibattle.c:400-409 (fConfirmed→0x2C / else→闪烁); uibattle.c:368-375 (CLASSIC 顺序 1=INVENTORY/道具); uibattle.c:502-503 (CLASSIC 调 DrawMiscMenu(1,TRUE)); uibattle.c:1406-1407 (每帧调用使 0x2C 持续); 对照 TS draw-battle-ui.ts:480-483 + 160-163 (恒用 selectedColor 闪烁,无 fConfirmed)

核对全部成立,差异真实存在。

C 真值链(逐行核对):
- ui.h:31 `MENUITEM_COLOR_CONFIRMED = 0x2C`(固定绿);ui.h:36-39 `MENUITEM_COLOR_SELECTED` = 0xF9 + SDL_GetTicks()%6 闪烁。
- uibattle.c:344-346 `PAL_BattleUIDrawMiscMenu(WORD wCurrentItem, BOOL fConfirmed)`;uibattle.c:400-409:当 `i == wCurrentItem` 时,`fConfirmed` 走 `MENUITEM_COLOR_CONFIRMED`(0x2C),否则走 `MENUITEM_COLOR_SELECTED`(闪烁)。
- uibattle.c:502-503(CLASSIC)子菜单 `PAL_BattleUIMiscItemSubMenuUpdate` 调 `PAL_BattleUIDrawMiscMenu(1, TRUE)` —— 硬编码 index 1 + fConfirmed=TRUE。
- uibattle.c:368-375 CLASSIC 杂项顺序 0=AUTO(围攻)/1=INVENTORY(道具)/2=DEFEND/3=FLEE/4=STATUS,故 index 1 正是『道具』。
- uibattle.c:1406-1407:只要处于 kBattleMenuMiscItemSubMenu,每帧都调 `PAL_BattleUIMiscItemSubMenuUpdate` → 0x2C 在整个二级停留期持续;uibattle.c:1366-1373 进入子菜单的前提是 w==2(即 g_iCurMiscMenuItem==1),与硬编码的 1 一致。

TS 侧(逐行核对):
- draw-battle-ui.ts:273-275 `miscItemSubMenu` 分支先 `drawMiscMenu` 再 `drawMiscItemSubMenu`。
- draw-battle-ui.ts:480-483 `drawMiscMenu` 对 `i === state.miscMenuCursor` 一律用 `selectedColor()`(160-163 行 = 0xF9..0xFE 闪烁),无 fConfirmed 分支、无 0x2C 路径。
- battle-system.ts:1313-1314 只有 cursor=1(道具)Confirm 才进 miscItemSubMenu,故二级期间 miscMenuCursor 恒=1(battle-system.test.ts:1858-1863 验证)→ TS 确实把『道具』那一项画成闪烁色。
- grep 全 draw 路径与 battle-state 均无 confirmed/0x2C/fConfirm 概念,排除"已在别处处理"。

排除误报:常量值 TS 与 C 完全一致(0x4F/0x18/0xF9/6),非写法差异;高亮的菜单项位置(index 1=道具)两边相同,差异纯粹在颜色(闪烁 vs 固定 0x2C)。claim 自身也正确指出二级子项使用/投掷仍用 SELECTED 闪烁(C uibattle.c:514-519 同样无 fConfirmed,与 TS 499-501 一致),差异仅限父菜单那一项。结论:真实移植缺失。

</details>


### ✅ L10 · 🟡 逃跑动作的 dex 倍率用浮点 ×0.5+四舍五入,而非 C 的整数 /2

- **子系统**:战斗·主循环与回合流程　**类别**:correctness
- **TS 位置**:`packages/game/src/core/battle/battle-system.ts:557,674`
- **C 依据**:`reference/sdlpal/fight.c:1546-1548`
- **玩家可感知**:否

**差异**:C 填行动队列时对 flee 动作 `wDexterity /= 2`(WORD 整数除,向下取整;fight.c:1547)。TS 的 actionDexMultiplier 对 'flee' 返回 0.5,然后第 674 行 `dex = Math.round(dex * actionDexMultiplier(...))`。其余倍率(coop ×10/defend ×5/item ×3/magic ×3)都是整数,Math.round 无影响;唯独 flee 的 ×0.5 在 dex 为奇数时 Math.round 向上取整(如 dex=101 → round(50.5)=51),而 C 得 50。濒死再 /2 这一步 TS 用 Math.floor 与 C 一致,但前一步 flee 的取整方向已偏。

**玩家影响**:逃跑回合里逃跑者的行动速度排序值偶发比原版高 1,可能在极个别情况下改变 “敌人是否抢先打出一击再让全队逃离” 的先后,属低频细微偏差。

<details><summary>C 源证据 / 复核</summary>

reference/sdlpal/fight.c:1546-1548（kBattleActionFlee 下 `wDexterity /= 2`，WORD 整除=floor）；fight.c:1093（`WORD wDexterity` 声明）；fight.c:336-389（PAL_GetPlayerActualDexterity 返回 WORD，haste×3，cap 999）；reference/sdlpal/global.c:1849-1865（PAL_GetPlayerDexterity = base+Σ装备，全整数）；fight.c:1558-1561（濒死 WORD /=2）；fight.c:1563（末尾 *=RandomFloat 后存入队列）；fight.c:1574-1584（按 (SHORT)wDexterity 降序排）。TS：battle-system.ts:557-558 与:674（Math.round(dex*0.5)）；formulas.ts:207-216（getPlayerActualDexterity 整数）；battle-system.ts:678（濒死 Math.floor）、:680/638（jitter=Math.trunc(dex*rangeFloat(0.9,1.1)))。

差异属实，C 源核对一致。

C 真值（fight.c:1546-1548）：`case kBattleActionFlee: wDexterity /= 2; break;`。`wDexterity` 在该 PAL_CLASSIC 填队列分支声明为 `WORD`（fight.c:1093），故 `/= 2` 是无符号整数除法，对正值即向下取整（floor）。其来源 `PAL_GetPlayerActualDexterity`（fight.c:336-389）→ `PAL_GetPlayerDexterity`（global.c:1849-1865）返回 `WORD w = rgwDexterity + Σ装备`，haste 时 `*= 3`，上限 999——全程整数，故到 flee 这一步 `wDexterity` 完全可能为奇数（如 101）。C：101/2=50。

TS（battle-system.ts:557-558）`actionDexMultiplier` 对 'flee' 返回 0.5；第 674 行 `dex = Math.round(dex * actionDexMultiplier(...))`。`getPlayerActualDexterity`（formulas.ts:207-216）同样产出整数（base+装备，haste×3，cap 999），故 dex 可为奇数。TS：Math.round(101*0.5)=Math.round(50.5)=51。**与 C 差 1**（JS Math.round 对 .5 向 +∞ 取整，而 C 整除向下取整）。

声称的「其余倍率不受影响」核对成立：coop ×10（fight.c:1532）、defend ×5（:1536）、magic/item ×3（:1542/1551）皆整数，Math.round 对整数是恒等，唯独 flee 的 ×0.5 在奇数时偏。濒死再 /2（fight.c:1558-1561 WORD 整除）TS 用 Math.floor（battle-system.ts:678）方向与 C 一致——但 flee 这步的取整方向（round vs trunc）确实已偏，这是独立于濒死步的真实分歧。

排除误报：宏未隐藏整除语义（WORD 确证）；flee 确为逐队员经同一 switch 的动作类型（fight.c:1546、1965）；非「别处已处理」——sort 用 (SHORT) 比较（fight.c:1578），999 内无溢出/符号问题，TS `b.dex-a.dex` 等价；非有意移植决策（注释 battle-system.ts:672-679 称对齐 fight.c:1529-1558，但此处用 ×0.5+round 而非 /2，是实现细节疏漏）。行号/函数均核对无误。

修法应为：flee 用 `Math.floor(dex / 2)`（或 `Math.trunc`，正值等价）而非 `Math.round(dex * 0.5)`。

</details>


### ✅ L11 · 🟡 敌方主动逃跑飞出屏后缺少 500ms 收尾停顿

- **子系统**:战斗·主循环与回合流程　**类别**:timing
- **TS 位置**:`packages/game/src/core/battle/battle-system.ts:1812-1828`
- **C 依据**:`reference/sdlpal/battle.c:1433`
- **玩家可感知**:是

**差异**:C 的 PAL_BattleEnemyEscape 在所有敌人精灵移出屏幕后,先 `UTIL_Delay(500)` 停顿 500ms 再把 BattleResult 置为 kBattleResultTerminated(battle.c:1433-1434)。TS 的 tickBattleEnemyEscapeAnim 在敌人全部 x<=-OFFSCREEN 后立即 `state.phase='fleed'` 转入收尾,没有这段 500ms 停顿。

**玩家影响**:敌人(0x69 触发)逃离战斗时,原版飞出屏后会停约半秒再结束战斗;TS 会立刻切回大世界,过渡比原版略快、缺少那一拍留白。

<details><summary>C 源证据 / 复核</summary>

reference/sdlpal/battle.c:1433 `UTIL_Delay(500);`(紧接 1434 `g_Battle.BattleResult = kBattleResultTerminated;`);飞出循环 battle.c:1402-1431(1413 x-=5、1420 x+w>0 续飞、1430 UTIL_Delay(10));reference/sdlpal/util.c:280-293 UTIL_Delay 为真实 ms 墙钟忙等。对照 TS:packages/game/src/core/battle/battle-system.ts:1812-1828(出屏即 phase='fleed',无停顿)、行 474-475(fleed→finalizeBattle)、行 2643-2659(finalize 无 delay)。玩家逃跑对照尾延时仅 battle.c:1525 PAL_BattleDelay(1,...)=40ms(BATTLE_FPS=25→BATTLE_FRAME_TIME=40ms,battle.h:28-29)。

代码层面差异属实。C 真值 `PAL_BattleEnemyEscape`(reference/sdlpal/battle.c:1402-1434):while 循环每帧把全活敌左移 5px 并 `UTIL_Delay(10)`(battle.c:1413/1430),退出循环条件是所有精灵 `x+w>0` 不再成立(battle.c:1420);循环结束后在 battle.c:1433 执行 `UTIL_Delay(500)`,再于 battle.c:1434 设 `BattleResult = kBattleResultTerminated`。`UTIL_Delay`(reference/sdlpal/util.c:280-293)是真实 500ms 墙钟忙等。

TS `tickBattleEnemyEscapeAnim`(packages/game/src/core/battle/battle-system.ts:1812-1828):每 tick 把全活敌左移 `ENEMY_FLYOUT_DX=20`px(注释称 20px/40ms ≈ C 的 5px/10ms,飞出速度等价);一旦全部 `x<=-160`(anyOnScreen=false),立即 `state.enemyEscapeAnim=undefined; state.phase='fleed'`(行 1824-1826)并 return true。下一 tick 该 hold 返回 false(ea 已 undefined),dispatch 落到 `switch(state.phase)` 的 `case 'fleed'`(行 474-475)直接 `finalizeBattle`;finalizeBattle(行 2643 起)只回写 HP/MP 并 cleanup→mode='explore',全程无任何 delay。故飞出屏后缺少那段 500ms 收尾停顿,确认。

排除误报:(1) 非"差异在别处被处理"——遍历 phaseStallTicks / 'fleed' / finalize 全链路,无任何补偿延时;phaseStallTicks 只是死循环看门狗(>1500 tick 强退,行 405-412),非这里的有意停顿。(2) 非"等价写法"——C 的 500ms 是固定墙钟,TS 完全没有对应物。(3) 行号/函数核对无误,0x69 触发链(battle-opcodes.ts:1301-1309 OP_ENEMY_ESCAPE 设 enemyEscapeAnim)也对得上。(4) 玩家逃跑路径 `PAL_BattlePlayerEscape` 的收尾延时只是 `PAL_BattleDelay(1,...)`=1 帧=40ms(battle.c:1525,BATTLE_FRAME_TIME=1000/25=40ms),TS tickBattleFleeAnim(行 1795-1797)同样省略了它;但敌逃这条是 500ms,量级显著大于玩家逃的 40ms,所以是更值得记的一条。飞出速度两端一致(均 0.5px/ms),故净差就是这缺失的 ~500ms 尾停顿(TS 因 160px 固定阈值反而可能多飞几帧,但那不是一段刻意的飞出后停顿)。

</details>


### ✅ L12 · 🟡 玩家物理攻击缺少出招前摇姿(frame 7 + Delay(4)),冲刺直接开始

- **子系统**:战斗·动画与表现时序　**类别**:timing
- **TS 位置**:`packages/game/src/core/battle/actions/attack.ts:238-276 (单体) / 166-214 (群攻);anim-timeline.ts:286-315 buildPlayerAttackTimeline`
- **C 依据**:`reference/sdlpal/fight.c:3667-3671 (单体 t==0) / fight.c:3690-3694 (群攻 t==0)`
- **玩家可感知**:是

**差异**:C 在调用 PAL_BattleShowPlayerAttackAnim 之前、仅首击(t==0)先设 wCurrentFrame=7(蓄力/举武器姿)并 PAL_BattleDelay(4)(=160ms)。单体(3669-3671)和群攻(3692-3694)都有。TS 的攻击时间线(buildPlayerAttackTimeline)从 frame 0=currentFrame=8 冲刺帧直接开始,attack.ts 逐击拼接时也没有在首击前补 frame7+Delay(4)。测试 anim-timeline.test.ts:295 明确断言总帧数=8(无 frame7)。双击(DualAttack)时该前摇也只应出现在第一击,与 sdlpal 一致地不应每击都加。

**玩家影响**:玩家普攻起手少了约 160ms 的举武器蓄力姿,角色会直接闪现冲到敌人面前,攻击节奏比原版更急促、缺少蓄势的视觉停顿。

<details><summary>C 源证据 / 复核</summary>

fight.c:3667-3671 单体首击 wCurrentFrame=7 + PAL_BattleDelay(4,0,TRUE)（t==0 gate）；fight.c:3690-3694 群攻同构；fight.c:2079 PAL_BattleShowPlayerAttackAnim 内首帧即 wCurrentFrame=8（无 frame7，证明 frame7 为独立前摇）；fight.c:469-496 PAL_BattleDelay 为真实 N×BATTLE_FRAME_TIME 阻塞；grep wCurrentFrame 全文件唯二 frame7 即 3669/3692。TS 对照：anim-timeline.ts:309-315 frame0=currentFrame8、:27 BATTLE_FRAME_TIME=40；anim-timeline.test.ts:295-297 断言 8 帧；attack.ts:480-491/255-275/194-207 无 frame7 前缀；battle-anim-driver.ts:30 不注入。

已在 reasoning 字段给出完整 C 源核对。

</details>


### ✅ L13 · 🟡 群攻每次挥砍后缺少 Delay(4) 收势停顿

- **子系统**:战斗·动画与表现时序　**类别**:timing
- **TS 位置**:`packages/game/src/core/battle/actions/attack.ts:194-214 (群攻 sweep 拼接);anim-timeline.ts:372-392`
- **C 依据**:`reference/sdlpal/fight.c:3747 (群攻分支 PAL_BattleShowPlayerAttackAnim 之后)`
- **玩家可感知**:否

**差异**:C 群攻分支在每次 PAL_BattleShowPlayerAttackAnim 之后都有一条 PAL_BattleDelay(4, 0, TRUE)(=160ms 收势停顿,fight.c:3747)。单体分支(fight.c:3673-3674)无此尾延。TS 群攻路径逐 sweep 只 push buildPlayerAttackTimeline 的 8 帧,sweep 之间没有补 4 帧延时;双击群攻两 sweep 衔接因此比原版快 160ms。注:单体路径无尾延是对的,只有群攻需要补。

**玩家影响**:全体攻击武器(及醉仙望月步/玄冥宝刀等双击群攻)挥砍完没有短暂收势停顿,连击衔接偏快,节奏与原版略有出入。

<details><summary>C 源证据 / 复核</summary>

fight.c:3745-3747 群攻 t-loop 内 PAL_BattleShowPlayerAttackAnim 后接 PAL_BattleDelay(4,0,TRUE)（每 sweep 一条尾延）；fight.c:3673-3674 单体 t-loop 内 ShowPlayerAttackAnim 后无尾延；fight.c:3667-3671/3690-3694 两分支首击 wCurrentFrame=7 + Delay(4) 起手（TS 也未移植）；fight.c:3754 动作收尾 Delay(3)（TS 未移植）；fight.c:3628/3681 两分支均 for(t<dualAttack?2:1)。TS：attack.ts:166-214 群攻逐 sweep 仅 push buildPlayerAttackTimeline，无 delayMs(4) 尾帧；anim-timeline.ts:286-395 该 builder 仅含 PAL_BattleShowPlayerAttackAnim 本体 9 帧；BATTLE_FRAME_TIME=40ms（anim-timeline.ts:27）→ 4 帧=160ms。

见上字段。差异经代码核实为真（confirmed），但声称对单体路径"忠实"的前提不准确，且玩家可感知度极低。

</details>


### ⏸ L14 · 🟡 玩家攻击魔法 OffMagic 缺少特效循环前的 Delay(1) 起手帧

- **子系统**:战斗·动画与表现时序　**类别**:timing
- **TS 位置**:`packages/game/src/core/battle/anim-timeline.ts:792 buildPlayerOffMagicTimeline (直接进 for i<l 循环,无前置 Delay(1))`
- **C 依据**:`reference/sdlpal/fight.c:2659 (PAL_BattleShowPlayerOffMagicAnim 主循环前 PAL_BattleDelay(1,0,TRUE))`
- **玩家可感知**:否

**差异**:C 的 PAL_BattleShowPlayerOffMagicAnim 在 for(i<l) 特效循环之前有一条 PAL_BattleDelay(1,0,TRUE)(fight.c:2659,40ms)。TS buildPlayerOffMagicTimeline 直接产出 l 帧特效循环,缺这条前置帧(test anim-timeline.test.ts:736 断言帧数恰为 l)。注:敌方 PAL_BattleShowEnemyMagicAnim(fight.c:2897)本就没有这条前置 Delay(1),故 buildEnemyMagicTimeline 不需要;DefMagic 的 Delay(1)(fight.c:2493)TS 已包含。仅玩家攻击魔法(及召唤二次效果/合击调用的 OffMagic)漏这 40ms。

**玩家影响**:玩家攻击法术从施法姿到特效喷发之间少 1 帧(40ms)过渡,音画对齐与原版有约一帧的偏移,单次几乎不可察觉但严格 1:1 不符。

<details><summary>C 源证据 / 复核</summary>

fight.c:2659 OffMagic 循环前 PAL_BattleDelay(1,0,TRUE)（位于 n=2652、WIN95 frame6=2654-2657 之后，l=2661、for=2674 之前）；fight.c:469-538 PAL_BattleDelay 定义（duration=1 渲染一帧）；battle.h:28-29 BATTLE_FPS=25→FRAME_TIME=40ms；fight.c:2492-2493 DefMagic 同款前导（TS 已 port）；fight.c:2884-2897 EnemyMagic 无此前导（TS 正确未加）；fight.c:4184/4261 单人攻击魔法 PreMagic→OffMagic 间无中间渲染延迟。TS：anim-timeline.ts:792 直接进 for 循环无前置 delayMs(1)，对比 anim-timeline.ts:1192-1196 DefMagic 有；test anim-timeline.test.ts:854 断言帧数恰为 l。

差异属实，且经多重交叉验证排除了误报。

C 真值：PAL_BattleShowPlayerOffMagicAnim 在主特效循环之前确有一条 PAL_BattleDelay(1, 0, TRUE)（fight.c:2659）。它的位置在 n = PAL_SpriteGetNumFrames（fight.c:2652）+ WIN95 wCurrentFrame=6（fight.c:2654-2657）之后、l 计算（fight.c:2661-2664）与 for(i<l) 主循环（fight.c:2674）之前。PAL_BattleDelay 定义（fight.c:469-538）确认 wDuration=1 = 一次循环，含 PAL_DelayUntil + PAL_BattleMakeScene + VIDEO_CopyEntireSurface + PAL_BattleUIUpdate，是真渲染一帧而非 no-op；BATTLE_FPS=25 → BATTLE_FRAME_TIME=1000/25=40ms（battle.h:28-29），故声称的 40ms 正确。

TS 缺失：buildPlayerOffMagicTimeline（anim-timeline.ts:777-792）计算完 l(789)、frameDuration(790) 后直接进入 for(let i=0;i<l;i++)（792），无任何前置 delayMs(1) 帧，恰好产出 l 帧。

排除误报：
1) 非"差异在别处已处理"：单人攻击魔法 C 路径 PreMagic(fight.c:4184)→PAL_RunTriggerScript(无渲染延迟)→OffMagic(fight.c:4261)，2659 的 Delay(1) 是 OffMagic 内部、施法姿结束到 FIRE 首帧之间唯一的过渡帧，TS 调用方 magic.ts:474-492 也只是 preFrames 后紧接 offFrames，无可折叠的等价延迟。
2) 非"有意移植决策"：同源同写法的兄弟函数 buildPlayerDefMagicTimeline（anim-timeline.ts:1192-1196）忠实 push 了 {durationMs: delayMs(1), fighters:[{currentFrame:6}]} 以 port fight.c:2492-2493 的同款 wCurrentFrame=6; PAL_BattleDelay(1,0,TRUE) 前导；两 C 函数前导结构相同，DefMagic port 了而 OffMagic 漏了 —— 是 port 缺口而非决策。
3) 声称的敌方注记正确：PAL_BattleShowEnemyMagicAnim（fight.c:2884-2897）从 n(2887) 直接到 l(2889)+循环(2897)，确无 PAL_BattleDelay，故 buildEnemyMagicTimeline 不需要。
4) 行号/函数无读错。测试 anim-timeline.test.ts:854 expect(buildNormal()).toHaveLength((8-2)*1+8+0)（=14，恰为 l）把"无前导帧"行为锁死，印证缺失。

补充：因 caster→frame6 切换 TS 放在循环内 i===fireDelay（anim-timeline.ts:794-797，对齐 CLASSIC fight.c:2677-2680），故可见的施法姿切换时机未单独错；唯一后果是整个特效+结算序列比原版早起 40ms。

</details>


### ✅ L15 · 🟡 战斗投掷/使用物品演出期间不显示物品名称标签

- **子系统**:战斗·动画与表现时序　**类别**:pixel
- **TS 位置**:`packages/game/src/core/battle/actions/throw-item.ts:91 buildThrowWindupTimeline 调用 / anim-timeline.ts:107-128;item.ts (useItem 无名称帧);anim-timeline.ts:139-187 buildUseItemTimeline`
- **C 依据**:`reference/sdlpal/fight.c:4348/4353/4356 (投掷 PAL_BattleDelay(N,wObject,TRUE)) 与 fight.c:2316/2333 (使用 PAL_BattleDelay(1,wObjectID,TRUE)) + fight.c:540-553 PAL_BattleDelay 名称绘制`
- **玩家可感知**:是

**差异**:C 的 PAL_BattleDelay 第二参 wObjectID 非 0 时会在延时帧把 PAL_GetWord(wObjectID)(物品名)绘到屏幕 (210,50)(fight.c:551-553)。投掷物挥臂(4348/4353/4356)和使用物品演出(2316/2333)都把 wObject 传进去,所以整段演出顶部会显示所投/所用物品的名字。TS buildThrowWindupTimeline / buildUseItemTimeline 只产位移+帧+声音,没有任何 battleMessage/名称标签(对比逃跑失败 anim-timeline.ts:65 有 battleMessage 机制,可复用)。

**玩家影响**:投掷天师符/梅花镖、或战斗中使用药品时,演出过程中原版会在右上角显示物品名,移植版没有这个文字提示。

<details><summary>C 源证据 / 复核</summary>

fight.c:540-553 PAL_BattleDelay 在 wObjectID!=0 正值时 PAL_DrawText(PAL_GetWord(wObjectID), PAL_XY(210,50), 15,...)；fight.c:4348/4353/4356 投掷挥臂 PAL_BattleDelay(N,wObject,TRUE)（4339-4346 前移段传 0）；fight.c:2316/2333 使用物品 PAL_BattleDelay(1,wObjectID,TRUE)。TS: anim-timeline.ts:107-128/139-187 两 builder 无 battleMessage；battle-anim-driver.ts:84-90 + present-battle.ts:263 仅 flee-fail（anim-timeline.ts:65）走该机制。

核对全部成立，无误报豁免。

C 真值（fight.c:540-553 PAL_BattleDelay）：wObjectID != 0 且为普通正值（非 BATTLE_LABEL_ESCAPEFAIL、非负数）时，每个延时帧把 PAL_GetWord(wObjectID)（物品名）绘到 PAL_XY(210,50)、color 15（fight.c:551-553）。逃跑失败画 (130,75)（544），负值画 (170,45)（548）。

投掷（fight.c:4337-4356）：wObject = action.wActionID（物品 id）。注意 4339-4346 的 4 步前移调 PAL_BattleDelay(1, 0, TRUE) 传 0（前移段不显名）；但 4348 PAL_BattleDelay(2,wObject,TRUE)、4353 PAL_BattleDelay(8,wObject,TRUE)、4356 PAL_BattleDelay(2,wObject,TRUE) 都传 wObject → 挥臂 hold + frame5 投掷姿 + frame6 共 12 帧（约 480ms）顶部显示所投物品名。

使用物品（fight.c:2292-2333）：起始 PAL_BattleDelay(4,0,TRUE) 传 0；随后两个 colorShift 循环（i=0..6、i=5..0）各调 PAL_BattleDelay(1,wObjectID,TRUE) 共 13 次 → 约 13 帧（约 520ms）显示所用物品名。

TS 侧确认缺失：buildThrowWindupTimeline（anim-timeline.ts:107-128）与 buildUseItemTimeline（anim-timeline.ts:139-187）只产 pos/frame/colorShift/sound，无任何 battleMessage。后者经 battle-system.ts:2415 真实接入（队员对队友用物品路径）；item.ts performItem 是 afterComplete 脚本执行器，也未设名称帧。battleMessage 字段（battle-state.ts:277）+ driver emit showBattleMessage（battle-anim-driver.ts:84-90）+ present-battle.ts:263 渲染——但全工程仅 flee-fail（anim-timeline.ts:65）一处设置该字段。故投掷/使用物品确无物品名标签。

排除误报：无宏等价（PAL_BattleDelay 第二参语义明确）、无别处补偿、无文档化有意 deviation；声称的行号/函数全部读对。唯一可商榷处：声称建议复用的 battleMessage 机制在 TS 渲染于 (130,75)（逃跑失败位），而原版物品名在 (210,50)，忠实移植需另设坐标/颜色，但机制确实可借。差异成立。

</details>


### ✅ L16 · 🟡 敌方魔法命中前,被动格挡的队员未切到防御姿(frame 3)

- **子系统**:战斗·动画与表现时序　**类别**:timing
- **TS 位置**:`packages/game/src/core/battle/actions/magic.ts:761-852 buildAndStartEnemyMagicAnim;anim-timeline.ts:1312-1348 buildEnemyMagicCastIntro / 1424-1527 buildEnemyMagicTimeline (均未设队员 frame3)`
- **C 依据**:`reference/sdlpal/fight.c:4737-4738 (AoE rgfMagAutoDefend) / fight.c:4755-4756 (单体 fAutoDefend) 设 wCurrentFrame=3`
- **玩家可感知**:是

**差异**:C 在敌人放魔法、跑 scriptOnUse 之前就按 RandomLong(0,2)==0 判定每个队员是否 magic-auto-defend,命中者立刻 wCurrentFrame=3(举盾防御姿,fight.c:4738/4756),并在整段魔法特效播放期间保持。TS 的敌方魔法动画链(intro→特效→受击反应)全程没有把任何防御中的队员切到 frame 3,队员在敌法术飞来时仍是站立/idle 姿,直到命中才切 frame4 受击。

**玩家影响**:敌人施放群体或单体攻击魔法时,原版会看到部分队员提前摆出防御架势(并对应减伤),移植版缺这个防御姿的视觉反馈。

<details><summary>C 源证据 / 复核</summary>

fight.c:4737-4738 (AoE rgfMagAutoDefend[i]=TRUE + rgPlayer[i].wCurrentFrame=3);fight.c:4755-4756 (单体 fAutoDefend=TRUE + rgPlayer[sTarget].wCurrentFrame=3);fight.c:4719-4734 (RandomLong(0,2)==0 触发条件);fight.c:4762/4766 (frame3 设于 scriptOnUse 与 ShowEnemyMagicAnim 之前);fight.c:2897-2909 (ShowEnemyMagicAnim 仅改 pos 不重置 wCurrentFrame → frame3 持续整段特效);fight.c:4861-4899 (受击反应仅对 wPrevHP!=HP 队员置 frame4)。TS:magic-damage.ts:220-222 (autoDefend 仅作除因子局部量) + magic-damage.ts:126-131 (EnemyMagicDamageResult 不含 autoDefend) + magic.ts:846-851 (拼链无 frame3) + anim-timeline.ts:1312-1348/1424-1527/1538-1561 (三个 builder 均不置队员 frame3)。

核对结论:差异属实,且无法被任何等价写法/别处处理推翻,但纯视觉、概率触发、低感知。

C 真值(fight.c):
- 4719-4744(AoE,type!=normal):对每个队员若 sleep/paralyzed/confused==0 且 HP!=0 且 RandomLong(0,2)==0,则 rgfMagAutoDefend[i]=TRUE 且 g_Battle.rgPlayer[i].wCurrentFrame=3(4737-4738)。
- 4746-4757(单体 normal):满足同类条件则 fAutoDefend=TRUE 且 rgPlayer[sTarget].wCurrentFrame=3(4755-4756)。
- 时序:frame3 在敌人施法手势循环(4697-4717)之后、PAL_RunTriggerScript(scriptOnUse)(4762)与 PAL_BattleShowEnemyMagicAnim(4766)之前设定。
- PAL_BattleShowEnemyMagicAnim 主循环(2897-2909)只改 rgPlayer[k].pos(iBlow),从不重置 wCurrentFrame,故 frame3 贯穿整段特效飞行(l 帧,每帧 (speed+5)*10ms)持续可见。
- 仅在受击反应(4861-4899)对 wPrevHP!=HP 的队员(4867)置 wCurrentFrame=4 覆盖 frame3。

TS 现状:
- 魔法 auto-defend 仅作为局部变量在 magic-damage.ts:220 `const autoDefend = canAutoDefend && state.rng.range(0,3)===0` 计算,只用于除因子(:222),从不外传——EnemyMagicDamageResult 接口(magic-damage.ts:126-131)只含 playerIdx/damage/hpBefore/hpAfter,无 autoDefend 标志,动画构建端根本拿不到谁在格挡。
- buildAndStartEnemyMagicAnim(magic.ts:761-852)拼链 [...introFrames, posResetFrame, ...effectFrames, ...hurtFrames];buildEnemyMagicCastIntro(anim-timeline.ts:1312-1348)只动敌人 currentFrame、buildEnemyMagicTimeline(1424-1527)只动敌施法帧+落点 overlay、buildPlayerMagicHitReaction(1538-1561)只对受伤队员置 currentFrame:4——全链无一处把队员置 currentFrame:3。
- TS 仅有的队员 frame3:(a) 物理攻击被动格挡(attack.ts→anim-timeline.ts:456-457/528-529);(b) resetFightersAfterAction(battle-anim-driver.ts:135)对显式「防御」命令 p.defending。二者都不覆盖敌方魔法被动 auto-defend。故 TS 全程队员保持站立/idle,直到命中切 frame4,与 C 不符,差异属实。

排除误报:除因子(减伤)已正确移植(magic-damage.ts:222 与 fight.c:4801-4803/4836-4838 一致),无机制脱钩,纯缺视觉姿态;数据结构层面就无法传递该标志,不存在「别处已处理」。

重估感知与严重度:frame3 在 C 中确实持续整段特效(非单帧丢失),理论可感知;但:(1) 仅 1/3 概率/每合格队员触发;(2) 举盾姿相对屏幕上正在队员位置绘制的法术特效较隐晦,AoE 时特效 overlay 还会部分遮挡精灵;(3) 多数 auto-defender 仍吃半伤,frame3 窗口仅持续到命中即翻 frame4。综合为低严重度、纯表现、概率+部分遮挡导致的弱感知,维持 low。

</details>


### ✅ L17 · 🟡 keepEffect 烙背景的 wScreenWave<9 判定只用 magic.wWave,漏算战场基础屏波

- **子系统**:战斗·动画与表现时序　**类别**:correctness
- **TS 位置**:`packages/game/src/core/battle/anim-timeline.ts:876 (`(wave ?? 0) < 9`) 与 1522 (敌方同款)`
- **C 依据**:`reference/sdlpal/fight.c:2757/2783/2815 (`gpGlobals->wScreenWave < 9`) + fight.c:2667 (wScreenWave += wWave) + battle.c:1563 (wScreenWave 初值=战场 wScreenWave)`
- **玩家可感知**:是

**差异**:C 判断魔法末帧是否把精灵烙进战斗背景(wKeepEffect==0xFFFF)时用的是 gpGlobals->wScreenWave,该值 = 战场基础 wScreenWave(battle.c:1563 从 lprgBattleField 取)+ 本法术 wWave(fight.c:2667 累加)。TS 用的是 magic.wave(仅本法术 wWave),漏了战场基础项。当战场基础 wScreenWave>0 且基础+wWave>=9 而 wWave 本身<9 时,C 不会烙背景而 TS 会烙。实测 11 个 keepEffect 法术 wWave 全=0,故分歧单向(TS 恒烙)、不存在"反之",且唯一可触发的战场是 field 32(screenWave=128);属极低频边界。

**玩家影响**:在带屏幕波动的特殊战场上施放可烙印的法术时,法术残影是否永久留在背景上的判定可能与原版相反,极少数场景下出现多余/缺失的背景残影。

<details><summary>C 源证据 / 复核</summary>

fight.c:2757/2783/2815 (`gpGlobals->wScreenWave < 9` 三处 keepEffect blit 判定); fight.c:2666-2667 (`wave=gpGlobals->wScreenWave; gpGlobals->wScreenWave += wWave`); fight.c:2835 (复位); battle.c:1563 (`wScreenWave = lprgBattleField[wNumBattleField].wScreenWave` 战场基础); battle.c:82 (PAL_BattleMakeScene 内 PAL_ApplyWave 每帧用 wScreenWave 扭曲整个战斗，TS 未移植). TS: anim-timeline.ts:876/1522 (`(wave ?? 0) < 9`), magic.ts:504 (wave: magic.wave), present-battle.ts:231 (只 apply animFrame.screenWave). 数据: magic.json 11 个 keepEffect 法术 wave 全=0; battle-fields.json 仅 id 32 screenWave=128 (>=9)，18/50=2、22/35=4。

代码层面差异属实，但触发面比声称更窄、方向单一。

C 真值核对：fight.c:2757/2783/2815 三处 keepEffect blit 判定均为 `gpGlobals->wScreenWave < 9`。该值在判定点 = 战场基础 + 本法术 wWave，因为 battle.c:1563 `gpGlobals->wScreenWave = gpGlobals->g.lprgBattleField[wNumBattleField].wScreenWave`（战场基础），fight.c:2666-2667 先 `wave=gpGlobals->wScreenWave` 后 `gpGlobals->wScreenWave += wWave`，且判定在末帧 i==l-1 读累加后的值。fight.c:2835 才复位。

TS 核对：anim-timeline.ts:876/1522 用 `(wave ?? 0) < 9`，其中 wave=magic.wave，magic.ts:504/739/815 确认只传 magic.wave（即 wWave），未叠战场基础。TS 全程根本不建模战场基础屏波——present-battle.ts:231 只 apply animFrame.screenWave(=wWave)，createBattleState 接收 field 但从不把 field.screenWave 写入 gs.wScreenWave（grep 全仓无此赋值）。TS 确实会烙背景：battle-anim-driver.ts:52 把 overlays 追加 persistentBgBlits，present-battle.ts:183 画在 bg 上。

实测数据收窄触发面（不是误报，但比声称窄）：magic.json 中 11 个 keepEffect==0xFFFF 法术(id 12/13/15/16/29/30/74/78/85/88/93)的 wave 全部=0。故 TS 判定恒为 0<9=真(永远烙)，C 判定退化为 base<9。58 个战场里 base>=9 的只有 field 32(screenWave=128)，其余非零为 18/50=2、22/35=4(均<9，无分歧)。所以分歧仅当上述 keepEffect 法术(对应 spells 334/338/339/340/341/342/346/378/379/380/385/388)施放于 field 32：C 不烙(128>=9)、TS 烙(0<9)。声称的"反之亦可能"在真实数据下不成立——因所有 keepEffect 法术 wWave=0，分歧单向(TS 多烙)。

另注(非本条 bug)：TS 完全缺战场基础屏波这一持久视觉(sdlpal battle.c:82 PAL_ApplyWave 每帧用 wScreenWave 扭曲整个战斗)，在 field 32 上 sdlpal 全程剧烈波动而 TS 静止——这是更大的独立缺失，且恰恰意味着 keepEffect 残影差异被"屏波本身就没实现"所掩盖。

判 confirmed：TS 的 <9 判定漏算战场基础项，与 C 真值不一致，且存在可触发的真实场景(field 32)。

</details>


### ✅ L18 · 🟡 群攻/召唤/合击伤害对每个敌人共用同一随机系数，C 对每个敌人各掷一次 RandomFloat

- **子系统**:战斗·召唤合击与变身　**类别**:correctness
- **TS 位置**:`packages/game/src/core/battle/magic-damage.ts:102-111 (applyMagicDamage 循环) + 调用处 coop-magic.ts:149-157、magic.ts:300-308`
- **C 依据**:`reference/sdlpal/fight.c:215 (PAL_CalcMagicDamage 内 `wMagicStrength *= RandomFloat(10,11)`) + fight.c:4005-4024 (合击全体逐敌调用 4015) + fight.c:4277-4297 (普通群攻逐敌调用 4288)`
- **玩家可感知**:是

**差异**:TS：rngFactor 在 caller 只 `state.rng.next()` 一次(coop-magic.ts:149 / magic.ts:300),然后 applyMagicDamage 对所有目标敌人用同一个 rngFactor 跑公式;magic-damage.ts:143-144 注释也明说『每次 perform 取一次,全目标共用』。C：RandomFloat(10,11) 在 PAL_CalcMagicDamage 函数体内部(fight.c:215),而该函数对全体敌人是逐个调用(合击 4015、普通群攻 4288、召唤二次效果同理),所以每个敌人各掷一次独立的 ±5% 随机。差异：TS 群攻对 N 个敌人的伤害随机系数完全相关(同一倍率),C 是 N 个相互独立的随机。同时 RNG 流消耗也不同(C 消耗 N 次、TS 消耗 1 次)。在场内涉及:合击天女散花(355,attackField 打全体)、所有召唤神的二次群攻效果(火神 attackAll、武神/天剑 attackWhole 等)、以及任何群攻法术。

**玩家影响**:对多个敌人施放群攻/召唤时,若敌人 def/抗性相同,TS 会显示完全相同的伤害数字(因共用倍率),而原版每个敌人伤害有各自 ±5% 抖动、数字互不相同。多敌战斗的伤害分布与原版不一致。

<details><summary>C 源证据 / 复核</summary>

util.c:276 RandomFloat 返回 `from + (float)lrand()/(INT_MAX/(to-from))` —— 每次调用都是一次全新 lrand() 抽样,无 memoize。fight.c:215 `wMagicStrength *= RandomFloat(10,11)` 位于 PAL_CalcMagicDamage **函数体内部**(174-250),故每次调用该函数都重新掷一次。fight.c:4277-4297 普通群攻 sTarget==-1 分支:for 循环逐敌,在 4288 行对每个敌人各调一次 PAL_CalcMagicDamage → N 次独立随机。fight.c:4005-4024 合击/召唤 sTarget==-1 分支:同样逐敌循环,4015 行逐敌调用 → N 次独立随机;召唤路径 fight.c:3865 起最终汇入此 4000-4024 的同一循环。范围实为 [1.0,1.1)(即 0%~+10%,而非声称的"±5%",此为描述措辞小瑕疵,不影响核心)。

核对全部成立。C 端:RandomFloat(util.c:276) 每调一次掷一次 lrand();该掷骰在 PAL_CalcMagicDamage 函数体内(fight.c:215);普通群攻(fight.c:4288)与合击/召唤群攻(fight.c:4015)都在 for 逐敌循环内逐个调用此函数,所以 N 个敌人各得一次独立的 [1.0,1.1) 随机倍率。TS 端:rng.ts:25-31 next() 每调一次推进 mulberry32 一步;coop-magic.ts:149 与 magic.ts:300 都只 `1 + state.rng.next()*0.1` 取一次标量 rngFactor,然后传入 applyMagicDamage;applyMagicDamage(magic-damage.ts:60 形参为标量、92-121 循环)对所有目标敌人复用同一个 rngFactor 跑 calcMagicDamage(formulas.ts:118 即 sdlpal 的 magStr*=RandomFloat/10 步)。magic-damage.ts:143-144 注释也自认"每次 perform 取一次,全目标共用"。无任何补偿逻辑:applyMagicDamage 是唯一共享核心、按签名根本无法逐敌掷骰；simulateMagic、battle-opcodes 等所有 AoE 调用方均如此。

结论:对 def/抗性相同的多敌，TS 必显示完全相同的伤害数字，原版每敌带各自 0~+10% 抖动、数字互异。这是结构性、忠实于源的真实偏差，confirmed。

严重度下修为 low：(1) 仅在"多个敌人 def 与全部五系/毒抗性完全相同"时玩家才看得到数字撞车——同种小怪群很常见但并非全部战斗；(2) 抖动幅度仅 [1.0,1.1)，对总伤害与战斗胜负无实质影响，纯属伤害数字的视觉离散度；(3) RNG 流消耗差异(C N 次/TS 1 次)在本项目里本就不追求逐位对齐——rng.ts:5-6 明示 TS 用 mulberry32 而非 sdlpal 的 LCG，D29 对拍只对战斗结果不对 RNG 内部 state，故该子项不构成额外可玩性问题。属可感知但低影响的表现层差异，非 medium。

</details>


### ✅ L19 · 🟡 梦蛇变身切换到新精灵时直接硬切，缺少原版的淡入淡出过场

- **子系统**:战斗·召唤合击与变身　**类别**:timing
- **TS 位置**:`packages/game/src/core/battle/actions/magic.ts:656-672 (buildAndStartTranceAnim 末帧直接置 spriteAfter + iColorShift 0)`
- **C 依据**:`reference/sdlpal/fight.c:4234-4240 (闪色后 VIDEO_BackupScreen + PAL_LoadBattleSprites + iColorShift=0 + PAL_BattleMakeScene + PAL_BattleFadeScene)`
- **玩家可感知**:是

**差异**:TS:变身闪色(iColorShift i*2,i=0..5)后,在最后一帧直接把 spriteNumOverride 切到变身后精灵并 iColorShift=0(magic.ts:663-671),是瞬间硬切。C:闪色 6 帧后做 VIDEO_BackupScreen→PAL_LoadBattleSprites(载入新精灵)→iColorShift=0→PAL_BattleMakeScene→PAL_BattleFadeScene(fight.c:4234-4240),即用一段 dither 淡入淡出过场(battle.c FadeScene ~72 步)从旧画面切到含新精灵的新画面。差异:原版变身有淡入淡出过场,TS 没有,新精灵直接弹出。(闪色阶段保持旧精灵、末帧才换新精灵这点 TS 与 C 一致,只差最后的 FadeScene 过场。)

**玩家影响**:阿奴用梦蛇变身时,变身后的精灵瞬间出现而非像原版那样淡入,过场观感不同。

<details><summary>C 源证据 / 复核</summary>

reference/sdlpal/fight.c:4226-4240(Trance 成功:6 步 iColorShift=i*2 闪色 → VIDEO_BackupScreen(4234,旧精灵)→ PAL_LoadBattleSprites(4235,载新精灵)→ iColorShift=0(4237)→ PAL_BattleMakeScene(4239)→ PAL_BattleFadeScene(4240)); reference/sdlpal/battle.c:608-682(PAL_BattleFadeScene = 12×6=72 步 nibble-dither crossfade,每步 16ms,从 gpScreenBak 渐变到 lpSceneBuf); reference/sdlpal/battle.c:564-606(PAL_BattleMakeScene 把当前(已含新精灵)fighter 渲进 lpSceneBuf)。TS 对照:magic.ts:632-674(末帧硬切,无 fade)、present-battle.ts:317-354 + magic.ts:623(fade 机制 summon 专属)、actions.test.ts:1596-1599(锁定硬切)。

差异属实。

C 真值(fight.c:4226-4240,逐行核对):Trance 成功后 for i=0..5 设 caster iColorShift=i*2 + PAL_BattleDelay(1)(6 帧闪色,保持旧精灵);随后 VIDEO_BackupScreen(g_Battle.lpSceneBuf)(4234，此时缓冲仍是旧精灵画面,最后一帧 iColorShift=10)→ PAL_LoadBattleSprites()(4235，载入新战斗精灵)→ iColorShift=0(4237)→ PAL_BattleMakeScene()(4239，把含新精灵的场景渲进 lpSceneBuf)→ PAL_BattleFadeScene()(4240)。awk 提取 4226-4241 确认五步顺序无误。PAL_BattleFadeScene(battle.c:608-682)是 12×6=72 步 nibble-dither crossfade(rgIndex stride-6 blend,每步 16ms,约 1.15s),从 gpScreenBak(旧精灵)逐步把低 nibble 逼近 lpSceneBuf(新精灵)。故原版变身末段是旧精灵→新精灵的 dither 淡入淡出过场。

TS 现状(magic.ts:632-674,逐行核对):buildAndStartTranceAnim 同样先 6 帧 iColorShift=i*2(657-662,旧精灵),但末帧(663-671)直接 push 一帧 {iColorShift:0, spriteNumOverride:spriteAfter},无任何 fade —— 即硬切。

排除误报后仍成立:
1) TS 引擎确有 PAL_BattleFadeScene 的 dither 移植(present-battle.ts:317 applySummonFade,dither-fade.ts),但它严格由 summon.fadeStep + hasSummonFade 驱动;hasSummonFade 只在召唤分支置(magic.ts:623),Trance builder 从不置;fadeStep 只在 buildSummonGodSequence(anim-timeline.ts:1118/1134)出现,Trance 帧无 fadeStep → applySummonFade 早退,Trance 永不走 dither。非"差异在别处已处理"。
2) 非等价写法/宏展开问题:闪色阶段两边一致(diff 自己也承认),只差末尾 FadeScene。
3) 非有意移植决策:相邻注释(magic.ts:628-630)明写"sdlpal fight.c:4226-4240 ... reload battle sprites + iColorShift=0 + FadeScene",说明作者知道有 FadeScene 却只实现到换精灵、未接 fade;无"省略 fade"的有意说明。
4) 测试 actions.test.ts:1596-1599 锁定的正是该硬切:frames.slice(-7,-1) 的 iColorShift=[0,2,4,6,8,10],末帧直接切 sprite,无 fade 帧。行号、函数、调用点(唯一入口 magic.ts:365-368)均核对无误。

结论:闪色一致、末段缺 72 步 dither 过场,新精灵瞬间弹出而非淡入,与 C 不符,差异成立。

</details>


### ✅ L20 · 🟡 AoE 法术伤害对所有目标共用同一个随机扰动因子,C 是每目标独立 RandomFloat

- **子系统**:战斗·法术伤害与治疗　**类别**:correctness
- **TS 位置**:`packages/game/src/core/battle/actions/magic.ts:300,333; packages/game/src/core/battle/magic-damage.ts:102-111,205-214`
- **C 依据**:`reference/sdlpal/fight.c:215`
- **玩家可感知**:否

**差异**:C 的 PAL_CalcMagicDamage 内部第一步就执行 `wMagicStrength *= RandomFloat(10,11); wMagicStrength /= 10`(fight.c:215-216),而该函数在群体法术里是**每个目标各调一次**:玩家 attackAll/attackWhole/attackField/summon 走 fight.c:4277-4297 的 `for i` 循环逐敌调用,敌方 AoE 魔法走 fight.c:4779-4818 的 `for i` 循环逐队员调用。因此 C 中每个被命中目标都拿到一个**独立**的 [1.0,1.1) 随机倍率。TS 反过来:performMagic 在调 applyMagicDamage/applyEnemyMagicDamage **之前**只摇一次 `rngFactor = 1 + rng.next()*0.1`(magic.ts:300、333),然后把这同一个值传进伤害循环对所有目标复用(magic-damage.ts 注释 143 行明确写“全目标共用”)。差异:群体法术各目标伤害不再相互独立浮动,而是被同一系数整体缩放(仅改变目标间相关性,不改变单目标 [1.0,1.1) 边际分布)。单体法术不受影响。(注:原报告所称"RNG 取数次数不一致→序列错位"不成立——本仓库 RNG 是 mulberry32、本就不与 sdlpal LCG 逐抽对齐。)

**玩家影响**:群攻法术各目标的伤害随机倍率从"相互独立"变为"共用同一倍率",但每个目标的伤害仍落在与原版相同的 [1.0,1.1) 区间与分布内,屏幕上无法分辨目标间是独立还是相关。玩家实际不可感知。

<details><summary>C 源证据 / 复核</summary>

fight.c:214-216 PAL_CalcMagicDamage 内 `wMagicStrength *= RandomFloat(10,11); wMagicStrength /= 10`；fight.c:4276-4297 玩家 AoE for 循环逐敌调 PAL_CalcMagicDamage（4288）；fight.c:4778-4818 敌方 AoE for 循环逐队员调（4793）；util.c:251-277 RandomFloat 每次消耗一次 lrand()；util.c:189/216 sdlpal LCG=1664525*glSeed+1013904223；fight.c:4727-4744 rgfMagAutoDefend[i] 逐队员 RandomLong(0,2)。对照 TS: magic.ts:300/333 单次 rngFactor；magic-damage.ts:143 注释"全目标共用"、:220 autoDefend 逐目标；rng.ts:4-6/26-30 mulberry32 且声明不与 sdlpal RNG 流对齐；formulas.ts:118-121 rngFactor 仅乘第一项。

代码层面的差异属实，定位准确，但严重度与玩家影响被夸大。

【机制核对 — 属实】
- C: fight.c:214-216 `PAL_CalcMagicDamage` 第一步即 `wMagicStrength *= RandomFloat(10, 11); wMagicStrength /= 10`。
- C 玩家 AoE: fight.c:4276-4297 `for (i = 0; i <= g_Battle.wMaxEnemyIndex; i++)` 循环内对每个敌人各调一次 `sDamage = PAL_CalcMagicDamage(str, def, ...)`（4288 行），故每敌一次独立 RandomFloat。
- C 敌方 AoE: fight.c:4778-4818 `for (i = 0; i <= wMaxPartyMemberIndex; i++)` 循环内对每队员各调一次 `PAL_CalcMagicDamage`（4793 行），每队员独立。
- C RandomFloat (util.c:251-277): `return from + (float)lrand() / (INT_MAX / (to - from))`，每次调用消耗一次 `lrand()`，确为逐目标独立 [1.0,1.1) 倍率。
- TS: magic.ts:300（玩家）与 magic.ts:333（敌方）在调 apply 前各只摇一次 `rngFactor = 1 + rng.next()*0.1`，传进 magic-damage.ts 的 `for (const idx of targetIdxs)` 循环对所有目标复用；magic-damage.ts:143 注释明写"每次 perform 取一次,全目标共用"。
→ 群体法术"各目标共用同一倍率 vs C 逐目标独立"这一点确凿存在，且是有意为之的简化（注释自述），非隐藏 bug。

【夸大点 1 — RNG 序列错位为伪命题】
TS 战斗 RNG 是 mulberry32（rng.ts:26-30），与 sdlpal 的 LCG `glSeed = 1664525*glSeed + 1013904223`（util.c:189/216）是完全不同的 PRNG。rng.ts:4-6 明确声明"与 sdlpal RNG 算法不同……D29 对拍只对战斗结果(伤害/hp/胜负),不对 RNG 内部 state"。既然两端 RNG 流本就不字节对齐、项目从不追求逐抽一致，"取数次数不一致导致后续序列错位"无任何可比基线——这半个声称不成立。

【夸大点 2 — 玩家不可感知】
(a) 每个目标的伤害仍落在与原版完全相同的 [1.0,1.1) 区间与分布内，只是各目标之间从"独立抖动"变为"被同一系数整体缩放"，即仅改变目标间相关性，不改变单目标边际分布。玩家无法从屏幕上分辨"两个敌人的伤害数是相关还是独立"。
(b) rngFactor 仅乘进 `calcMagicDamage` 的第一项 `calcBaseDamage(magStr*rngFactor)/4`（formulas.ts:118-121），不乘 `+baseDamage` 平项也不乘后续元素缩放基数，对最终数字的摆幅本就偏小（常仅几点）。
(c) 逐目标真正影响伤害的随机量——敌方魔法的 autoDefend（C `rgfMagAutoDefend[i]` 逐队员 RandomLong(0,2)，fight.c:4727-4744；TS `state.rng.range(0,3)` 逐队员，magic-damage.ts:220）——TS 已正确逐目标处理，仅强度倍率共享。
任一次重放本就因 PRNG 不同而产生不同数字，"伤害数字与原版不符"在可观测意义上不成立。

</details>


### ⏸ L21 · 🟡 群攻 division 衰减:TS 跳过 health<=0 敌人不计 division,C 只跳 wObjectID==0(已清槽)且对任何未清槽敌都翻倍

- **子系统**:战斗·物理伤害公式　**类别**:correctness
- **TS 位置**:`packages/game/src/core/battle/actions/attack.ts:178,190`
- **C 依据**:`reference/sdlpal/fight.c:3698,3726-3729`
- **玩家可感知**:是

**差异**:C 群攻循环只在 `wObjectID == 0 || index[i] > wMaxEnemyIndex` 时 continue(fight.c:3698),且 division 翻倍的判据是 `if (wObjectID != 0) division *= 2`(fight.c:3728-3729)——只看槽位是否被清空(=死亡奖励结算后由 PAL_BattleUpdateFighters 置 0),不看当前 health。TS 在 HIT_ORDER 循环里额外加了 `be.e.health <= 0` 的 continue 条件(attack.ts:178),并把 `division *= 2` 放在 continue 之后(attack.ts:190),于是 health<=0 的敌人既不挨打也不让 division 翻倍。关键分歧出现在『同一次双击群攻』的第二个 sweep:第一 sweep 打死的敌人此时 health 已为 0 但 `defeated`(=wObjectID)尚未在 sweep 间被置位(checkEnemyDeaths 只在整个 action 结束后才跑,battle-system.ts:2277/1704-1717),C 仍把它算进 division(后续活敌 division 更大、伤害更低),TS 跳过它(后续活敌 division 更小、伤害更高)。同时 C 还会对这具尸体再算一次伤害(WORD 再次下溢),TS 不会。触发面窄(需同时拥有 dualAttack 状态 + attackAll 武器,且首 sweep 击杀),但属真实数值分歧。注:actions.test.ts:317 用预置 health:0 敌人锁定了 TS 现行行为,但该状态在真实战斗起手时应已是 defeated/wObjectID==0,测试未覆盖到真正分歧的 sweep 间窗口。

**玩家影响**:使用同时具备双击与全体攻击的武器/状态(如赋予 dualAttack 的招式配 attackAll 武器)时,若第一击打死某敌,第二击对其余存活敌人造成的伤害与原版不同(TS 偏高);极端情况下还少打了一具尸体的二次溢出伤害。

<details><summary>C 源证据 / 复核</summary>

fight.c:3698-3699(续跳只判 wObjectID==0||idx>wMaxEnemyIndex); fight.c:3726(wHealth-=sDamage, WORD 下溢); fight.c:3728-3729(if wObjectID!=0 才 division*=2); global.h:270(wHealth 是 WORD); fight.c:743-757(PAL_BattlePostActionCheck 在 757 行清 wObjectID); fight.c:1664(PostActionCheck 在外层循环才调,晚于 3752 的攻击收尾); fight.c:3681-3748(群攻 t-loop 整段同步); fight.c:2080-2104(DualAttack+CanAttackAll 专用渲染分支,证组合是设计内); global.c:2071-2078(attackAll 由装备授); fight.c:3665(单体双击照扣尸体血,与 attack-all 路径对照)。TS: attack.ts:178/187/190, battle-system.ts:1704-1719/2277, actions.test.ts:317-330, magic-damage.ts:94。

逐项核对全部成立，差异真实存在且可达。

(1) C 续跳条件 fight.c:3698-3699 确为 `wObjectID == 0 || index[i] > wMaxEnemyIndex`，无 health 判据；division 翻倍 fight.c:3728-3729 确为 `if (wObjectID != 0) division *= 2`，只看槽位不看 health；fight.c:3726 `wHealth -= sDamage` 而 wHealth 是 WORD(global.h:270)，超杀时 FLOAT 转 WORD 下溢成大数。

(2) C 时序关键点核实：清 wObjectID 的唯一函数是 PAL_BattlePostActionCheck(fight.c:743-757，health<=0 时 757 行置 0)。它不在攻击体内——群攻 t-loop(fight.c:3681-3748)整段跑完后才到 PAL_BattleUpdateFighters(3752)，而 PostActionCheck 要等外层战斗循环 fight.c:1664 才跑。故 sweep0 打死的敌在 sweep1 时 wHealth<=0 但 wObjectID 仍≠0 → C 仍把它算进 division(翻倍)且对尸体再扣一次血(WORD 再下溢)。

(3) TS attack.ts:178 续跳条件多了 `be.e.health <= 0`，:190 的 `division *= 2` 在 continue 之后，:187 又 `Math.max(0,...)` 把血钳到 0。

(4) TS 时序核实:performAttack 两个 sweep(attack.ts:166 for t)同步跑完才返回，checkEnemyDeaths(battle-system.ts:1704，置 defeated)只在 performBattleAction 返回后(battle-system.ts:2277)或动画时间线播完才跑。故 sweep 间 defeated 仍为 false，真正触发 sweep1 跳过的正是 `be.e.health<=0`(非 defeated)。差异确实落在『同一次双击群攻的 sweep 间窗口』,与声称一致。

(5) 方向核实:2 敌、HIT_ORDER[2,1,0,4,3] 下 slot1 先打;若 sweep0 打死 slot1，sweep1 中 C 不跳 slot1(division 翻倍后存活的 slot0 拿 dmg/2)、TS 跳 slot1(division 维持小、slot0 拿全额)→ TS 对存活敌伤害偏高;且 C 多打一具尸体(多一个下溢伤害数字)TS 没有。两点均成立。

(6) 可达性:C 有 DualAttack+CanAttackAll 的专用渲染分支(fight.c:2080-2104，第二击错位站位),证明此组合是设计内状态;DualAttack 由装备授(仙女剑 scriptOnEquip 0x2D =32760，见 equip-effect.test.ts:262)，attackAll 也由装备授(global.c:2071-2078 PAL_PlayerCanAttackAll 扫装备 rgwAttackAll),组合可凑出。

(7) 旁证此为 attack-all 路径独有的越界检查:TS 单体双击(attack.ts:238-249)并不在 sweep 间复检 health(与 C fight.c:3665 一样照打尸体),magic-damage.ts:94 也只用 defeated。唯独 attack.ts:178 多加了 health<=0,是真正的偏差点。actions.test.ts:317 用预置 health:0 敌锁定了现行行为，但该场景在真实起手应已是 defeated，未覆盖真正分歧的 sweep 间窗口——声称对测试的判断也准确。

唯一无法纯靠读码确证的是『原版是否真有玩家会同时凑齐 attackAll 武器 + DualAttack 状态并恰好首击杀掉 HIT_ORDER 中靠前之敌』这一具体触发频率(需查具体装备组合/实战)，但这只影响发生率，不改变代码层差异为真。

</details>


### ✅ L22 · 🟡 敌普攻等价物中毒:TS 用 equivId!==0 短路,跳过了 C 对所有非格挡命中都会消费的 RandomLong(1,10) 抽取

- **子系统**:战斗·物理伤害公式　**类别**:correctness
- **TS 位置**:`packages/game/src/core/battle/actions/attack.ts:365-368`
- **C 依据**:`reference/sdlpal/fight.c:5139-5141`
- **玩家可感知**:否

**差异**:C 在敌→我物理命中后(iCoverIndex==-1 && !fAutoDefend 时)用 `wAttackEquivItemRate >= RandomLong(1,10) && PoisonResistance < RandomLong(1,100)` 判定是否触发等价物毒脚本(fight.c:5139-5141)。由于 `&&` 左到右求值,`RandomLong(1,10)` 在每一次满足 iCoverIndex==-1 && !fAutoDefend 的命中都会被消费一次,与该敌是否配有 wAttackEquivItem(=0 的敌人占多数)无关;只有第二个 `RandomLong(1,100)` 受 rate 判定短路。TS 在条件最前面加了 `equivId !== 0 &&`(attack.ts:365),于是对 attackEquivItem==0 的绝大多数敌人,`state.rng.rangeInclusive(1,10)` 根本不被抽取。C 这里没有 equivItem!=0 这一前置判据(它甚至会对 item 0 无脑跑 script 0)。这使 TS 在每次普通敌人成功命中后,RNG 流比 C 少消费一次抽取,后续 TS 自身的伤害/暴击随机数序列随之整体前移。注:本仓库 RNG 算法本就与 sdlpal LCG 不同(rng.ts 注释,只对拍战斗结果),故对 C 流不可能逐抽对齐;但该处偏离了项目在别处刻意维持的『抽取顺序与 C 一致』纪律(如 attack.ts:90 的 RandomLong(0,5) 始终消费、attack.ts:94 李逍遥 &&短路不消费),且会改变 TS 自身确定性回放的后续数值。

**玩家影响**:对没有附带毒性的普通敌人(多数),敌人每次普攻命中后 TS 的随机数流相比原版控制流少走一步,导致同种子下后续攻击的暴击/抖动结果偏移;玩家不可感知(本仓库 RNG 用 mulberry32、本就不与 sdlpal LCG 逐抽对齐);纯属 RNG 抽取序纪律瑕疵,无可观测的 correctness 后果。

<details><summary>C 源证据 / 复核</summary>

fight.c:5139-5141 条件链 `iCoverIndex==-1 && !fAutoDefend && wAttackEquivItemRate >= RandomLong(1,10) && PAL_GetPlayerPoisonResistance(...) < RandomLong(1,100)`,不以 wAttackEquivItem 为前置,左到右短路致 RandomLong(1,10) 在每个非格挡/非自卫命中恒被消费;fight.c:5143-5145 对 item i(含 0)无守卫直接跑 wScriptOnUse。对照 TS attack.ts:360(equivPoison 闸门)+366(equivId!==0 短路)+367(rangeInclusive(1,10))。生产可达见 battle-system.ts:2350-2352。RNG 算法差异声明见 rng.ts:5-6。

核对属实，差异在控制流层面真实存在，但仅为 RNG 抽取顺序纪律问题，无任何可观测后果。

C 证据(fight.c:5139-5141):条件链为 `iCoverIndex == -1 && !fAutoDefend && wAttackEquivItemRate >= RandomLong(1,10) && PAL_GetPlayerPoisonResistance(...) < RandomLong(1,100)`。该链 **不以 wAttackEquivItem 作前置判据**，而是判 wAttackEquivItemRate。C 的 && 左到右短路:一旦 iCoverIndex==-1 && !fAutoDefend 同真,第三操作数 `wAttackEquivItemRate >= RandomLong(1,10)` 必被求值 → `RandomLong(1,10)` 必被消费一次,与 wAttackEquivItem 是否为 0 无关。对绝大多数 rate==0 的普通敌:`0 >= RandomLong(1,10)`(返回 1..10,恒 >0)恒假,故恰好消费一次 RandomLong(1,10) 后短路,不再求 RandomLong(1,100)。fight.c:5143 也印证它对 item 0 仍会无脑取 i 跑 script(无 item!=0 守卫)。

TS 证据(attack.ts:365-368):条件首操作数加了 `equivId !== 0 &&`(attack.ts:366),且整体先被 attack.ts:360 的 `actor.isEnemy && isPlayerTarget && equivPoison` 包裹。对 attackEquivItem==0 的普通敌,equivId!==0 为假 → 短路,`state.rng.rangeInclusive(1,10)`(attack.ts:367)根本不抽。故 TS 每次普通敌成功命中比 C 控制流少消费一次抽取。

可达性已确认:battle-system.ts:2350-2352 在生产战斗里总是传入 equivPoison ctx,故 attack.ts:360 闸门通过,该偏离在实机可达,非死代码。

声称引用的『别处刻意维持抽取序』也属实:attack.ts:90 `rangeInclusive(0,5)` 即便 bravery>0 也照消费、attack.ts:94 roleId===0 李逍遥项 && 短路、注释 attack.ts:77-78 明述此纪律——核对一致。

但玩家不可感知:rng.ts:5-6 明确本仓库用 mulberry32 而非 sdlpal LCG,且 D29 对拍只比战斗结果(伤害/HP/胜负)不比 RNG 内部 state/抽取序。既然算法本就不可能逐抽对齐 C,这一次少抽既不改变任何对玩家可见的结果,也不破坏 TS 自身确定性(同 seed 仍同结果,序列只是内部自洽地落在与 C 控制流不同的偏移)。声称方自己也承认『可见后果有限』。故差异在代码层 confirmed,但纯属抽取序纪律瑕疵,无 correctness 实害。

</details>


### ✅ L23 · 🟡 战斗开始未把 HP=0 的队员复活为 1(且未清傀儡状态)

- **子系统**:战斗·结算与成长　**类别**:correctness
- **TS 位置**:`packages/game/src/core/battle/battle-system.ts:273-331 (startBattle 序幕,createBattleState 之前/clearHiddenExpCounts 处)`
- **C 依据**:`reference/sdlpal/battle.c:1569-1577`
- **玩家可感知**:是

**差异**:C 在 PAL_StartBattle 开战时对 i=0..wMaxPartyMemberIndex 每个队员:若 rgwHP[w]==0 则强制 rgwHP[w]=1 并清 rgPlayerStatus[w][kStatusPuppet]=0("确保全队开战时都活着")。TS startBattle 序幕只调 clearHiddenExpCounts(清 7 隐藏经验池),createBattleState 直接把 role.hp(可能为 0)拷进 BattlePlayer.prevHp,全程不复活、不清傀儡。差在:TS 缺这段开战复活。后果:若上一场战斗以逃跑/失败收场留下 HP=0 的倒地队员(逃跑路径无半血恢复),下一场战斗 C 会把他复活成 1 HP 正常参战,而 TS 让他以 HP=0 进场被当死人(alivePlayerIdxs 排除,不能选动作、战后不获经验/不升级)。

**玩家影响**:带着倒地队员逃离一场战斗后立刻进入下一场:原版该队员满血 1 点复活可继续战斗并分享经验;TS 中他持续"死着",无法行动、拿不到经验,需靠还魂类道具/仙术才能起身,与原版行为不符。

<details><summary>C 源证据 / 复核</summary>

battle.c:1569-1577(PAL_StartBattle:rgwHP[w]==0→=1 且清 kStatusPuppet);battle.c:1342-1372(半血恢复只在 PAL_BattleWon 内);battle.c:1806-1811(仅 kBattleResultWon 调 PAL_BattleWon,逃跑 kBattleResultFleed 不调);battle.c:1825 + global.c:2331-2343(每场结束 PAL_ClearAllPlayerStatus 清≤999,普通傀儡已清);global.c:2244(Puppet 仅死人可设)。TS 对照:battle-system.ts:273-366 / battle-state.ts:670 / game-state.ts:1163-1169 / event-system.ts:2769-2781 / battle-system.ts:2656。

差异属实。C 真值 battle.c:1569-1577(PAL_StartBattle 序幕):遍历 i=0..wMaxPartyMemberIndex,若 rgwHP[w]==0 则 rgwHP[w]=1 且 rgPlayerStatus[w][kStatusPuppet]=0("Make sure everyone in the party is alive")。TS startBattle(battle-system.ts:273-366)序幕只做 createBattleState + restoreRepeatActionsForParty + clearHiddenExpCounts:createBattleState(battle-state.ts:670)直接 prevHp: role.hp 拷贝,无复活;clearHiddenExpCounts(game-state.ts:1163-1169)仅清 7 经验池;production 入口 tryStartBattle(event-system.ts:2769-2781)也不复活。整个开战路径无任何 rgwHP=1(battle-system.ts:2654-2655 注释明确记载旧"伪复活"已删)。

持久前提成立:逃跑在 C 返回 kBattleResultFleed,而唯一的半血恢复在 PAL_BattleWon(battle.c:1342-1372)且仅 kBattleResultWon 才调用(battle.c:1806-1811);TS finalizeBattle 对 lost/fleed 只 writeBackBattleRolesToRuntime 无恢复(battle-system.ts:2656)。故"带倒地队员逃离后立刻再战"两端都保留 HP=0,但 C 下一场 PAL_StartBattle 复活成 1,TS 不复活——TS 让该队员以 HP=0 进场被排除(alivePlayerIdxs / isReadyForManualSelection battle-system.ts:516)、不能行动、战后不获经验。确为对 C 真值的偏离。

傀儡分支基本是非问题:C 每场战斗结束都调 PAL_ClearAllPlayerStatus(global.c:2331-2343 在 battle.c:1825),已清掉≤999 的普通时长傀儡;只有装备授(>999)傀儡能存活,且 equip-effect.ts:290-291 / global.c:2244 规定傀儡只对死人设。故 line 1576 的傀儡清除近乎冗余,真正偏离是 HP 复活那一行。

</details>


### ✅ L24 · 🟡 隐藏属性涨点屏(hidden-exp-up)对 2 字角色名的文字 x 定位与原版不一致

- **子系统**:战斗·结算与成长　**类别**:pixel
- **TS 位置**:`packages/game/src/present/battle/draw-battle-settlement.ts:122-128 (drawHiddenExpUpScreen)`
- **C 依据**:`reference/sdlpal/battle.c:1266-1269`
- **玩家可感知**:是

**差异**:C 的 CHECK_HIDDEN_EXP 用 PAL_swprintf 把 名字+属性标签+"提升" 拼成**单条字符串**,在 PAL_XY(offsetX+90,70)=(90,70) 处**一次性连续**绘制,字符自然紧贴。TS 改成三段独立 renderText:名字@(90,70)、属性标签@(90+16*w1,70)、提升@(90+16*(w1+w2),70),其中 w1=max(wordWidthCols(name),3) 强制下限 3 列。对 3 字名(李逍遥等)w1=3 与连续绘制等效;但对**2 字名(阿奴/巫后)**,C 连续绘制使属性标签从 x=90+32=122 起,而 TS 因 w1 被钳到 3 使属性标签从 x=90+48=138 起——属性标签与"提升"整体右移 16px,名字后凭空多出一个全宽字间隙。注:框长两者都=9 列(C: maxName3+maxProp1+提升1+4;TS: w1+w2+w3+2 在仙剑数据下也=9),仅框内文字定位有偏差。

**玩家影响**:阿奴 / 巫后 因隐藏属性经验涨点而弹出的结算框中,"体力/真气/…提升"几个字相对角色名整体右移半个汉字(16px),名字与属性词之间有明显空档,排版与原版不同。3 字名角色不受影响。

<details><summary>C 源证据 / 复核</summary>

battle.c:1266-1267(PAL_swprintf 拼单串 name+label+提升); battle.c:1269(PAL_DrawText 单串 @PAL_XY(offsetX+90,70)); text.c:1142+1156-1157(PAL_DrawTextUnescape 逐字 rect.x+=PAL_CharWidth，连续无量化); battle.c:1080-1082(maxPropertyWidth=2-1=1, propertyLength=0, offsetX=0); ui.c:787(PAL_MenuTextMaxWidth=(PAL_TextWidth+8)>>4); battle.c:1268(框长=maxName+maxProp+提升32/32+4=9); battle.c:1270(数字 x=183+(3+1-3)*8=191)。TS 对照: draw-battle-settlement.ts:122-129(w1=max(.,3) 钳致 2 字名标签@138/提升@170 vs C 122/154); font.ts:128(renderText 逐字连续); battle-system.ts:2732(用真实 _name 推 hidden-exp-up 屏); words.json 36-41/48-55(阿奴/巫后=2字、标签全2字)。

差异属实，且全链路可复现，与声称完全吻合。

【C 真值:连续绘制】battle.c:1266-1267 用 PAL_swprintf 把 name+statLabel+提升 拼成单条字符串 buffer，battle.c:1269 一次性绘制在 PAL_XY(offsetX+90,70)。绘制函数 PAL_DrawTextUnescape(text.c:1142,1156-1157)对每个字符 `rect.x += PAL_CharWidth(*lpszText)`（CJK=16px），逐字紧贴，无任何"按列对齐/下限"量化。故 name="阿奴"(2 个全宽字=32px)时，属性标签从 x=90+32=122 起，提升从 x=90+64=154 起。

【TS 实现:三段 + w1 钳到 3】draw-battle-settlement.ts:122 `w1=Math.max(wordWidthCols(name),3)`；:126-128 三段独立 renderText：name@90、statLabel@90+16*w1、upLabel@90+16*(w1+w2)。renderText(font.ts:128)虽也是逐字 `cursorX+=g.width` 连续，但 x 起点用了被钳的 w1。对"阿奴"，wordWidthCols=2 被钳成 3 → 标签@90+48=138、提升@90+80=170，相对 C 整体右移 16px，name 与标签间凭空多一个全宽字空档。

【数据核实】words.json:36-41 角色名 = 李逍遥/赵灵儿/林月如(3字)、阿奴/巫后(2字)、盖罗娇(3字)；48-55 状态标签全为 2 字。由此 maxNameWidth=max(3,3,3,2,2,3)=3、maxPropertyWidth=2-1=1、propertyLength=0、offsetX=-8*0=0（证实声称 offsetX=0；battle.c:1080-1082 + ui.c:763-794 PAL_MenuTextMaxWidth=(PAL_TextWidth+8)>>4）。3 字名 wordWidthCols=3=钳下限，C/TS 位置逐字节相同→不受影响；仅 2 字名(阿奴 id39/巫后 id40)受影响——与声称一致。

【排除误报】(1)框长两者皆=9：C battle.c:1268 = maxName3+maxProp1+PAL_TextWidth(提升)32/32=1+4=9；TS = w1+w2+w3+2 = 3+2+2+2=9——框不偏移。(2)涨点数字 x 两者皆=191：C battle.c:1270 = 183+(3+1-3)*8=191，TS hiddenExpUpNumberX(3,1)=191（且用全局 max 而非单名宽）——数字不偏移、未在别处补偿。(3)文字未被框裁剪：单行 box len9 内容区约 78+8+9*16≈230，TS 右移后提升末端=170+32=202，仍在框内，差异纯为可见空档。(4)非死代码：battle-system.ts:2732 用真实 _name 推这屏。(5)无测试锁定文字段 x（draw-battle-settlement.test.ts 仅断言 hiddenExpUpNumberX），故非有意移植决策，是未校验的偏差。

结论：C 行号、函数、宏展开均核对无误，差异确实存在且专打 2 字名角色。

</details>


### ✅ L25 · 🟡 0x91 同种敌人判定用 enemyId,C 用 wObjectID(对象身份)

- **子系统**:战斗·脚本 opcode 与敌人 AI　**类别**:correctness
- **TS 位置**:`packages/game/src/core/battle/battle-opcodes.ts:1054`
- **C 依据**:`reference/sdlpal/script.c:2624`
- **玩家可感知**:否

**差异**:C 的 0x91(jump if not first of same kind)以 `g_Battle.rgEnemy[i].wObjectID == g_Battle.rgEnemy[wEventObjectID].wObjectID` 判定「同种」—— 按 OBJECT 索引(脚本身份)。TS 的 OP_JUMP_IF_ENEMY_NOT_FIRST 用 `e.e.id === self.e.id`,而 BattleEnemy 的 e.id = wEnemyID(敌人 stats 表索引,见 shared/tables.ts:283),不是 wObjectID。当同一 wEnemyID 对应多个 OBJECT_ENEMY(不同脚本身份)时两者判定相反:C 视为不同种(各跑首个分支),TS 视为同种(后者跳走)。实测数据里仅 enemyId 81 映射到 478/479 两个对象,且二者从不在同一敌队共存(team29 只 478,team30 只 479),其余敌人皆 1:1,所以当前原版数据不会触发该差异;但语义实现是错的。仓库本身已用 EnemyTeam.enemyObjectIndexes 刻意保留对象身份(tables.ts:372-373 注释),BattleEnemy 却未携带 objectId 致此 opcode 无法按对象身份比较。

**玩家影响**:现有原版数据下无可感知差异(数据未触发);仅在「同 enemyId 多对象同场」配置下会让同种组脚本(只在第一个身上跑)判定出错。低频边界。

<details><summary>C 源证据 / 复核</summary>

reference/sdlpal/script.c:2624 (0x91 按 wObjectID 比较); battle.h:72 (wObjectID = Object ID of this enemy); battle.c:1716 (wObjectID = 敌队槽位 w = OBJECT 绝对 index); script.c:1987 (rgObject[wObjectID].enemy.wEnemyID 证明两层索引不同); TS: battle-opcodes.ts:1054 (e.e.id 比较) + tables.ts:283-284 (Enemy.id = wEnemyID) + battle-state.ts:81-138 (BattleEnemy 无 objectId 字段)。数据核对: data/extracted/data/enemy-objects.json(仅 enemyId 81→478/479,余皆 1:1)、enemy-teams.json(team29=[478]/team30=[479,526,526])、events/all.json(0x91 仅 5 处，用户对象 409/454/513/436/420/422 全 1:1，478/479 不用 0x91)。

代码层差异属实，且我已逐项排除误报来源。C 端 script.c:2624 用 `g_Battle.rgEnemy[i].wObjectID == g_Battle.rgEnemy[wEventObjectID].wObjectID` 判同种；wObjectID 定义见 battle.h:72「Object ID of this enemy」，在 battle.c:1716 由敌队槽位值 w(OBJECT 数组绝对 index)赋入；script.c:1987 `gpGlobals->g.rgObject[...wObjectID].enemy.wEnemyID` 证明 wObjectID 与 wEnemyID 是两层索引。TS 端 battle-opcodes.ts:1054 用 `e.e.id === self.e.id`，而 Enemy.id = wEnemyID(stats 表索引，tables.ts:283-284)；BattleEnemy(battle-state.ts:81-138)只携带 OBJECT 派生的 scriptOnReady/resistanceToSorcery 等，未带 objectId/objectIndex，故该 handler 确实无法按对象身份比较。当同一 wEnemyID 映射多个 OBJECT_ENEMY 时两实现判定相反——语义实现是错的，这一点成立(非宏等价、非他处已处理、非有意移植、行号无误)。

但「玩家可感知」一项不成立，且差异在原版数据下结构性不可达(强于声称的「未触发」)。三层独立证据:(1)enemy-objects.json 153 条中仅 enemyId 81 映射两对象 478/479，其余 152 条全 1:1——对 1:1 敌人 wEnemyID 身份恒等价 wObjectID 身份;(2)enemy-teams.json 中 team29=[478]、team30=[479,526,526]，enemyId 81 从不在同队出现两次且 478/479 从不共存，故任何真实战斗里 enemyId 81 至多 1 个 → 两实现皆 selfPos=1 不跳，结果一致;(3)最强证据——0x91 在 all.json 全部 43503 条 bytecode 中仅 5 处(40980/41267/42832/42836/42840)，分属对象 409/454/513/436/420/422(enemyId 12/57/114/39/23/25),经核对全为 1:1;对象 478 唯一脚本 scriptOnTurnStart=41413(非 0x91 站点)、479 四个 hook 全 0——即唯一多对象敌人根本不跑 0x91。故能区分两公式的代码路径在原版数据上永不执行。结论:确为真实的潜在语义 correctness 缺陷(任何把同 enemyId 的两个不同 OBJECT 放进同队的自定义配置都会令同种组脚本判定出错)，但原版资产下零玩家可感知影响、且不可达。严重度 low 准确。

</details>


### ✅ L26 · 🟡 0x6A 偷钱在 c==0 时仍弹「获得 0 文钱」对话(C 仅 c>0 才显示)

- **子系统**:战斗·脚本 opcode 与敌人 AI　**类别**:correctness
- **TS 位置**:`packages/game/src/core/battle/battle-opcodes.ts:847-854`
- **C 依据**:`reference/sdlpal/fight.c:5265`
- **玩家可感知**:是

**差异**:C 的 PAL_BattleStealFromEnemy 偷钱分支:`c = nStealItem / RandomLong(2,3)`,`nStealItem -= c; dwCash += c`,但只在 `if (c > 0)` 时才拼接并显示「获得 %d 文钱」对话(fight.c:5265-5272/5288-5296);c==0 时 s 为空,不弹任何提示。TS 的 OP_STEAL_FROM_ENEMY 偷钱分支计算 c 后**无条件** push narration「@获得 @${c} @文钱@」到 battleDialogQueue,c==0 时也会显示「获得 0 文钱」。可达:enemies.json 中「蜥蜴」stealItem==0(钱)且 stealItemCount==1,偷成功时 c = 1/RandomLong(2,3) = 0。

**玩家影响**:对蜥蜴等剩余偷钱数为 1 的敌人偷窃成功(整除得 0)时,TS 会弹一条「获得 0 文钱」的提示框,原版不会显示任何东西。轻微突兀的多余 UI。

<details><summary>C 源证据 / 复核</summary>

reference/sdlpal/fight.c:5216(WCHAR s[256]=L"");5261-5263(c=nStealItem/RandomLong(2,3); nStealItem-=c; dwCash+=c);5265(if(c>0) 才格式化串 s);5288-5296(if(s[0]!='\0') 才 PAL_StartDialog+PAL_ShowDialogText)。reference/sdlpal/util.c:229-247(RandomLong 含端点,RandomLong(2,3)∈{2,3})。data/extracted/data/enemies.json:1211-1212(蜥蜴 stealItem=0, stealItemCount=1)。TS:packages/game/src/core/battle/battle-opcodes.ts:842-854(无 c>0 守卫无条件 push 获得提示);packages/game/src/core/rng.ts:38-39(rangeInclusive 含端点);packages/game/src/present/dialog-box.ts:559-560/702(narration 真实绘制)。

差异属实。C 真值 PAL_BattleStealFromEnemy(fight.c) 偷钱分支:c = nStealItem / RandomLong(2,3)(fight.c:5261),随后 nStealItem -= c; dwCash += c(5262-5263)无条件执行,但拼接提示串 s 仅在 `if (c > 0)`(fight.c:5265)内进行;s 在函数头初始化为 L""(fight.c:5216),最终显示由 `if (s[0] != '\0')`(fight.c:5288)守卫。故 c==0 时 s 仍为空串,5288 守卫不通过,不弹任何对话框(仅 cash/nStealItem 各 +0,无可见状态变化)。TS OP_STEAL_FROM_ENEMY(battle-opcodes.ts:842-854)算出 c = Math.trunc(stealItemCount / rng.rangeInclusive(2,3)) 后,在 853-854 行**无条件** push `@获得 @${c} @文钱@` 到 battleDialogQueue,无 c>0 守卫 —— c==0 时即推出"获得 0 文钱"。该 narration(style:'narration')经 drawNarrationDialog(dialog-box.ts:559-560,702)真实绘制为居中阴影框,玩家确能看到。TS 代码注释(847-852)自称对齐 fight.c:5267-5296,但恰好漏掉了 5265 行的 `if (c > 0)` 串格式化守卫。可达性核实:enemies.json:1211-1212「蜥蜴」stealItem==0(钱)、stealItemCount==1;RandomLong(2,3) 经 util.c:229-247 含端点返回 {2,3},TS rng.rangeInclusive(rng.ts:38-39) 同义,故首次偷成功 c = trunc(1/2)=0 或 trunc(1/3)=0,必为 0,稳定触发该多余提示。RandomLong/整除/&&短路等其余细节 TS 均与 C 等价,排除了"差异在别处已处理/写法等价"的误报来源。

</details>


### ✅ L27 · 🟡 0x28 全体上毒时,入口毒脚本以各敌自身 index 运行,C 统一用投掷目标 wEventObjectID

- **子系统**:战斗·脚本 opcode 与敌人 AI　**类别**:correctness
- **TS 位置**:`packages/game/src/core/battle/battle-opcodes.ts:482-502`
- **C 依据**:`reference/sdlpal/script.c:1213`
- **玩家可感知**:是

**差异**:C 的 0x28 「apply to everyone」分支(script.c:1184-1219)对每个敌人落槽时,都用 `PAL_RunTriggerScript(rgObject[poisonID].poison.wEnemyScript, wEventObjectID)` —— 传入的是**投掷目标 wEventObjectID(固定)**,不是循环变量 i。TS 的 OP_APPLY_POISON 在 apply-all 分支对每个 enemyIdx 调 applyTo(enemyIdx),内部以 `target: { type:'enemy', idx: enemyIdx }`(各敌自身)运行入口脚本。差异仅在「施加当下那一次」入口脚本的 self 指向:数据中相关毒(553/551/560)的 enemyScript 首条即 0x21 Inflict damage(op0=0 → 打 wEventObjectID),C 全体上毒时这些首回合伤害都落在投掷目标身上,TS 则各敌打自己。后续每回合 tick(fight.c:1648 用 (WORD)i)两边都用各自 index,无差异。属低频(op0!=0 全体施毒少见)。

**玩家影响**:极低频:仅影响「全体施加带即时伤害的毒」时首次入口脚本的伤害归属(C 集中到投掷目标,TS 分散到各敌)。一般感知不到。

<details><summary>C 源证据 / 复核</summary>

script.c:1184-1219 (0x28 apply-everyone 循环用 i 落槽，但脚本调用恒用 wEventObjectID)；关键行 script.c:1213 `PAL_RunTriggerScript(rgObject[op1].poison.wEnemyScript, wEventObjectID)`；fight.c:4361-4362 投掷物 `PAL_RunTriggerScript(item.wScriptOnThrow, (WORD)sTarget)`（wEventObjectID=投掷目标敌索引，固定）；script.c:3140-3185 PAL_RunTriggerScript 把 wEventObjectID 作为脚本 self/pEvtObj；script.c:1026-1050 入口脚本首条 0x21（op0==0 → `rgEnemy[wEventObjectID].wHealth -= op1`）。TS：battle-opcodes.ts:480-496 apply-all 分支 per-enemy 以 `target:{type:'enemy', idx:enemyIdx}` 跑入口；battle-opcodes.ts:443-450 0x21(op0==0) 用 ctx.target.idx。

差异属实，方向与频率判断都对，但声称把入口 opcode 说成 0x42 SimulateMagic 是错的——真正承载首次伤害的是 0x21（Inflict damage）。\n\n1) C 侧机制核实无误：script.c:1184-1219 的 apply-everyone 循环以 i 做抗性/落槽检查，但 script.c:1213 跑入口脚本时恒传 wEventObjectID（未随 i 变）。PAL_RunTriggerScript(script.c:3140-3185) 把该 wEventObjectID 当作脚本 self。投掷物经 fight.c:4361-4362 以 (WORD)sTarget（玩家选定的目标敌索引）启动 wScriptOnThrow，故全体上毒时入口脚本 self 恒为投掷目标且固定。\n\n2) 数据核实推翻了 0x42 这一前提：全游戏仅 4 处 op0!=0 的 0x28（all.json 索引 39257/39261/43037/43045），引用毒 ID 553/551/560/555。它们的 enemyScript 首条都是 0x21 或 end，没有一条是 0x42：poison553@40872=`0x21[0,20,0]`、poison551@40864=`0x21[0,7,0]`、poison560@40915=`0x21[0,100,0]`、poison555@40889=`end`。而首条为 0x42 的 43 个毒（ID 66-255）从不被任何 0x28 引用。\n\n3) 但用 0x21 走一遍，差异同样成立：script.c:1026-1050 的 0x21 op0==0 → `rgEnemy[wEventObjectID].wHealth -= op1`，即打固定的投掷目标。C 全体上毒时入口脚本对每个落槽敌都跑一次，每次都把伤害加到同一个 sTarget 身上（N 个敌中毒 → sTarget 吃 N×伤害，其余入口伤害为 0）。TS battle-opcodes.ts:488 per-enemy 以各自 idx 跑入口，0x21(op0==0)→battle-opcodes.ts:443-450 用 ctx.target.idx → 每敌各吃一次自己的伤害。方向正是声称的「C 集中到投掷目标 / TS 分散到各敌」。\n\n4) 真实可达：触发者是 毒龙砂(item157, applyToAll投掷, 毒553 入口20伤)、赤蝎粉(item133, applyToAll投掷, 毒551 入口7伤)、战斗内 applyToAll 法术 372/373（毒555 无伤 / 毒560 入口100伤，藏在 0x68 随机分支后）。都是真实可买/可用对象（价 700/1200）。battle-system.ts:2097-2098 等已把 commands/runScript/bus 接入 opcode ctx，实战会跑入口脚本（fallback 仅老 caller/纯状态单测），故差异在真机生效，非死路。\n\n5) 可感知性：入口 0x21 的扣血在投掷脚本后经 PAL_BattleDisplayStatChange 体现于血条。毒555 入口是 end（无伤）→ 无差异；毒551 仅 7 伤；毒553 20 伤；毒560 100 伤但要过随机分支。对多敌投 毒龙砂/赤蝎粉 时，C 把每敌入口伤集中砸投掷目标、TS 平摊，血条结果确有可见出入，但量级小（7-20，每敌一份 vs 集中），且需「对一群敌人投带即时伤毒粉」这种低频操作。综合：确认为真差异，方向/频率判断正确，唯一硬伤是 opcode 误标（应为 0x21 而非 0x42），不影响结论。严重度维持 low。

</details>


### ✅ L28 · 🟡 WORD.DAT 词条解析缺少 sdlpal 的尾部 '1' 截断,8 个法术/敌人名残留多余的「1」

- **子系统**:提取·MKF 解码与数据表　**类别**:data
- **TS 位置**:`packages/pal-extract/src/io/word.ts:61-71, 86-92`
- **C 依据**:`reference/sdlpal/text.c:785-786`
- **玩家可感知**:是

**差异**:sdlpal 在 PAL_InitText 加载 WORD.DAT 时,每个词条做完 GBK→宽字符转换后会检查并删去结尾的宽字符 '1'(0x31):`if (l > 0 && lpWordBuf[i][l-1] == '1') lpWordBuf[i][l-1] = 0;`(text.c:785-786)。TS 的 word.ts 在 readBlock(行 61-71)与 flat 循环(行 86-92)里**只**去掉尾部空格 0x20(`while (end > start && buf[end-1] === 0x20) end--`),从不删尾部 '1'。实测原始 data/raw/WORD.DAT(5650 字节 / 565 词)中有正好 8 个词条去空格后以 ASCII '1'(0x31)结尾——这是 BIG5→GBK 不彻底简体化遗留的标记字节,sdlpal 一律剥掉。受影响词条(已与 data/extracted/lookup/words.json 核对,当前 dump 确实保留了多余的「1」):法术 spells[28]=「风雪冰天1」(应为 风雪冰天)、spells[43]=「弦月斩1」(弦月斩)、spells[66]=「御剑伏魔1」(御剑伏魔);敌人 enemies[81]=「女飞贼1」(女飞贼)、enemies[99]=「石长老1」(石长老)、enemies[103]=「盖罗娇1」(盖罗娇)、enemies[150]=「苗人拳1」(苗人拳)、enemies[151]=「苗枪卒1」(苗枪卒)。flat 数组同样受影响(flat[324]/flat[479] 等)。注:sdlpal 只剥结尾 '1',不剥其它结尾 ASCII('A'/'B'/'C'/'p' 等正常保留),所以本差异精确限于这 8 个词条。

**玩家影响**:玩家在仙术菜单/施法选单/练成屏看到「风雪冰天1」「弦月斩1」「御剑伏魔1」这 3 个带尾巴「1」的法术名(真能看到)。另 5 个敌人名(女飞贼1/石长老1/盖罗娇1/苗人拳1/苗枪卒1)只被 DEV 调试面板读取——生产游戏无图鉴、战斗也不显示敌人名牌,玩家看不到。故可感知仅限 3 个仙术 label,纯文案瑕疵。

<details><summary>C 源证据 / 复核</summary>

reference/sdlpal/text.c:785-786（剥尾部宽字符 '1' 的真值逻辑，在 780-789 全词条循环内）；text.c:2117-2140（CP_GBK 转换：字节<0x80 直通成独立宽字符，证 0x31→U+0031）；text.c:730（nWords=565 覆盖全部受影响 index）。对照 TS：packages/pal-extract/src/io/word.ts:67、word.ts:90（均只剥 0x20）。实测 data/raw/WORD.DAT 8 个 0x31 结尾词条 flat index=324/339/362/479/497/501/548/549，与 data/extracted 各 json 一致。运行时仙术名显示路径 packages/game/src/core/menu/magic-select.ts:45 用 spell._name；敌人名仅 packages/game/src/dev/dev-panel.ts:621/682-684（DEV-only）读取。

差异属实，但玩家影响范围比声称的窄。

【C 真值核对】
- text.c:785-786 确为每个词条在 GBK→宽字符转换后剥尾部宽字符 '1':`if (l > 0 && g_TextLib.lpWordBuf[i][l - 1] == '1') g_TextLib.lpWordBuf[i][l - 1] = 0;`，且这是在 text.c:780-789 对全部 nWords 的循环里逐条执行。
- text.c:730 `nWords = ceil(5650/10) = 565`，覆盖全部受影响 index（最大 549 < 565）。
- text.c:2117-2140 CP_GBK 转换：state==0 且字节 <0x80 时 `wcs[wlen++] = mbs[i]`（直通），lead byte 0x81-0xFE 才进 state=1 吃下一字节。故尾部 0x31（'1'，<0x80）必成独立宽字符 U+0031——正是 785-786 要剥的目标。

【TS 缺陷核对】word.ts:67(readBlock) 与 word.ts:90(flat 循环) 均只 `while (end > start && buf[end-1] === 0x20) end--`（仅剥 0x20），从不剥 0x31；其余无任何运行时补救。

【实测数据】我用 iconv-lite 复刻 C 逻辑跑 data/raw/WORD.DAT(5650B/565词)：恰好 8 个词条去空格后尾字节为独立 0x31，flat index = 324/339/362/479/497/501/548/549，解码 lastWide 全 = U+0031，hex 段（如 b7e7d1a9b1f9ccec31）显示 0x31 前均为完整 GBK 双字节对，确系独立 ASCII '1'。与声称的 spells[28/43/66]、enemies[81/99/103/150/151] 映射逐一吻合。extracted/lookup/words.json、spells.json、enemies.json 均保留了多余的「1」。

【玩家感知——这是声称被夸大处】
- 仙术名：游戏运行时 magic-select.ts:45 直接用 `spell._name` 作菜单 label，battle-system.ts:972（施法）/battle-settlement.ts（学会法术）亦读 `spell._name`，且无运行时剥 '1'。故「风雪冰天1」「弦月斩1」「御剑伏魔1」确会出现在仙术/施法选单与练成屏 —— 玩家真能看到（3/8 perceptible）。
- 敌人名：全仓库唯一读 enemy `_name` 的是 dev/dev-panel.ts:621/682-684（DEV-only 调试面板，生产环境 dead-code-eliminated）。无图鉴/bestiary 功能，原版 PAL 战斗也不显示敌人名牌。故「女飞贼1」等 5 个敌人名在生产游戏中玩家看不到 —— 声称的「战斗中遭遇/战斗结算/图鉴里看到」对敌人名不成立（5/8 not perceptible）。

结论：缺陷真实存在且与 C 真值偏离，confirmed；但可感知部分仅限 3 个仙术菜单 label 的尾巴「1」，纯文案瑕疵无功能影响。

</details>


### ✅ L29 · 🟡 slice/disasm 的 JUMP_TARGET_OPERAND 缺 13 个条件跳转 opcode,切片 BFS 丢弃 244 条可达指令

- **子系统**:提取·事件 bytecode 反编译　**类别**:data
- **TS 位置**:`packages/pal-extract/src/events/opcodes.ts:243-259`
- **C 依据**:`reference/sdlpal/script.c:962,1023,1395,1448,1517,1569,1597,2031,2483,2500,2633,2798,2905,3305`
- **玩家可感知**:否

**差异**:sdlpal 的 PAL_InterpretInstruction / 控制流 handler 里凡 `wScriptEntry = pScript->rgwOperand[N] - 1`(或 case 0x06 的 `= rgwOperand[1]`)都是"条件分支被取时跳到 operand[N]"。slice.ts 与 disasm.ts 共用 opcodes.ts 的 JUMP_TARGET_OPERAND 表来决定哪个 operand 是跳转目标、从而在 BFS 里跟随它。把 script.c 全部 `wScriptEntry = rgwOperand[N]-1` 站点逐条对出真值后,下列 13 个 opcode 的跳转目标在表里【缺失】:0x06(jump-by-rate,目标=op1,script.c:3305)、0x1E(钱不够,op1,962)、0x20(removeItem 数量不足,op2,1023)、0x2E(set-enemy-status 抗性命中,op2,1395)、0x33(collect 失败,op0,1448)、0x34(炼丹 cv=0,op0,1517)、0x38(teleport 失败,op0,1569)、0x3A(boss 不可逃,op0,1597)、0x68(jump-if-enemy-turn,op0,2031)、0x84(放置物 受阻/不在场景,op2,2483/2500)、0x91(非首个同种敌,op0,2633)、0x9C(分裂失败,op1,2798)、0x9E(召唤失败,op2,2905)。注:0x07 startBattle 的 onLost/onFled 走 named-label 字段,不在此列(已覆盖)。用真实 SSS.MKF 跑 disasm+sliceByScene(与 cli.ts 同样的 scene/global 入口),把表补全后对比可达集:补全后 scenes 文件多收 +111 条、shared 多收 +133 条,共【244 条指令(30 个连续块)】在当前(缺表)切片里被丢弃。抽样核实这些块全部只能经缺失的那条跳转到达(其前一条是 plain end 或无条件 goto,无 fall-through):[3742]/[7477]/[16013] 是 0x1E"钱不够"分支的 setDialogStyle+showDialog(如 [16013] 老鸨"啥!?你没带钱? 没钱就滚出去"、[19269] 刘夫人"还需要用钱吗?")、[8174..8191] 是 0x06 跳到的 18 条 0x24 setAutoScript 链、[43039] 是 0x68 跳到的 0x29 毒逻辑。disasm 同样不给这些目标打 L_ 标签。

**玩家影响**:当前【无玩家可感知后果】:运行时实际从完整的 all.json 执行(bootstrap.ts setGlobalEvents),且 event-system 的 jumpToGlobalIp 对 raw 条件跳转直接用数字 operand 当全局 ip(刻意绕过 label),所以这些分支在游戏里仍可达。但这是 extract/slice 子系统对 sdlpal 切片语义的真实偏离:per-scene 文件(scene-NNN.json)内部不完整(少 244 条),若日后把执行源切回 per-scene 文件、或用切片文件做任何依赖可达性的分析,像妓院"没钱就滚出去"、乾坤一掷/酒神没钱失败提示、随机分支 NPC autoScript 等整块剧情/逻辑会凭空消失。slice.test.ts 只测了 0x95(已在表内),这 13 个缺口无任何测试覆盖,且 cli 的 round-trip 自检只验 disasm→recompile 字节一致、查不出切片丢指令。

<details><summary>C 源证据 / 复核</summary>

script.c 全部 `wScriptEntry = rgwOperand[N]-1` 站点逐条核对,13 个 opcode 全部命中且 operand 序号与声称一致:0x06=op1(script.c:3305,注意此处是 `= rgwOperand[1]` 无 -1,后接 continue 绕过末尾 wScriptEntry++,故目标=op1 而非 op1-1,声称已注明);0x1E=op1(962);0x20=op2(1023);0x2E=op2(1395);0x33=op0(1448);0x34=op0(1517);0x38=op0(1569);0x3A=op0(1597);0x68=op0(2031);0x84=op2(2483 与 2500 两处);0x91=op0(2633);0x9C=op1(2798);0x9E=op2(2905)。这 13 个均不在 opcodes.ts:243-259 的 JUMP_TARGET_OPERAND(该表只含 0x04/0x24/0x25/0x58/0x5d/0x5e/0x61/0x64/0x74/0x79/0x81/0x83/0x94/0x95)。

差异属实,且声称的每一个可核维度全部对上:

1) C 真值——13 个条件跳转站点逐条核对无误(见 cEvidence)。特别确认了 0x06(script.c:3303-3306)是 `if (RandomLong(1,100) >= operand[0]) { wScriptEntry = rgwOperand[1]; continue; }`——无 -1 且 continue 跳过 PAL_InterpretInstruction 末尾的 wScriptEntry++(script.c:3296/3310),所以反编译收集目标应取 op1 原值,声称对此细节明确标注,正确。

2) 机制——slice.ts:29-38 `pushRawJumpTargets` 与 disasm.ts:63-66 都用 JUMP_TARGET_OPERAND 决定 raw opcode 的跳转目标:表里没有的 opcode,BFS 既不入队跟随、disasm 也不打 L_ 标签。13 个缺失 → 这些跳转目标若无其它(fall-through / 具名 goto / 已在表内的跳转)路径到达,就被切片剪掉。

3) 定量——用真实 data/raw/SSS.MKF 复刻 cli.ts 同样管线(disasm + annotate + sliceByScene 同样的 scene/global 入口),先按现表切一次再把 13 个 opcode 补进表切一次,差值精确为 scenes +111、shared +133、总 +244(总 bytecode 43503 条)。与声称逐字一致。

4) 抽样可达性——dump all.json 核实:[16013]=老鸨"啥！？你没带钱？/没钱就滚出去"(前一条 16012 是 plain `{op:end}`,16011 是 end-reset 不 fall-through);[3742]="我没带那么多钱呢"(前 3741 plain end);[8174]=opcode 0x24 setAutoScript 链入口(前 8173 plain end,经 0x06 跳到);[43039]=opcode 0x29 毒逻辑(前 43038 plain end,经 0x68 跳到)。全部只能经缺失的那条跳转到达,符合声称。

5) 玩家影响的"无后果"辩护属实——这是关键反向核实:运行时 bootstrap.ts:1009-1014 `setGlobalEvents(allCommands)` 从完整 all.json 执行;resolveScriptLabel(event-system.ts:716-723)只查 _globalLabelMap 返回 {ip},生产 cursor 经 getCmds(695-696)默认读 _globalCommands 全量数组;条件跳转用 raw operand 经 jumpToGlobalIp 直接当全局 ip(如 0x1E 钱不足 event-system.ts:3200-3202 `jumpToGlobalIp(gs,cursor,operands[1])`);trigger 解析 scene-system.ts:264 显式 `void ctx`——"不再用 per-scene 切片解析 trigger,全部走单一全局数组"。即 sliced per-scene 文件根本不参与脚本执行,被剪的 244 条在游戏里仍可达,玩家无感。

6) 测试缺口属实——slice.test.ts 只测 0x95(line 160)+ 0x14 end + 0xa2 random,13 个条件 opcode 零覆盖;roundtrip.ts 只验 disasm→recompile 逐字节一致,查不出切片丢指令。

综合:这是 extract/slice 子系统对 sdlpal 切片可达性语义的真实偏离(per-scene 文件内部少 244 条),但当前运行时不消费切片文件做脚本执行,故无玩家可感知后果。严重度 low 准确——既是真 bug 又确无现网影响,仅在"日后把执行源切回 per-scene 文件 / 用切片文件做可达性分析"时才会暴露。

误报排除:逐条复核了行号/operand 序号(无读错);0x06 的"无 -1"特例已被声称正确标注;0x07 startBattle 走 named-label(已在 opcodeTable 覆盖,不在此 13 个之列)亦正确;不存在"差异其实在别处已处理"——表里确无这 13 项,且补进去后 BFS 行为实测改变 +244。

</details>


### ✅ L30 · 🟡 停步时未复现 s_iThisStepFrame 的 `&=2; ^=2` 复位,导致再次起步的首帧迈步腿相位不一致

- **子系统**:渲染·地图瓦片与精灵　**类别**:timing
- **TS 位置**:`packages/game/src/core/scene-system.ts:456`
- **C 依据**:`reference/sdlpal/scene.c:773-774`
- **玩家可感知**:是

**差异**:C PAL_UpdatePartyGestures(FALSE)(站立)末尾执行 `s_iThisStepFrame &= 2; s_iThisStepFrame ^= 2;`(scene.c:773-774),把步帧计数器规整/翻转到 {0,2}(0/1→2,2/3→0),为下次起步设定相位。TS 站立分支(scene-system.ts:456 撞墙、:460 无方向键)只设 walking=false,完全不动 gs.walkingFrame.stepFrame,计数器停在上次走路的值。再次起步时 TS 做 (frozen+1)%4,起步首帧的迈步腿相位与 C 不同。

**玩家影响**:每次停下再走,第一步的迈步腿(左/右)相位与原版可能不同。影响极轻微(仅起步首帧、单帧级),但属对原版步态状态机的偏差。

<details><summary>C 源证据 / 复核</summary>

reference/sdlpal/scene.c:654 `static int s_iThisStepFrame = 0;`(持久);scene.c:663 走路 `(s_iThisStepFrame+1)%4`;scene.c:664-672 iStepFrameLeader 映射;scene.c:773-774 站立分支 `s_iThisStepFrame &= 2; s_iThisStepFrame ^= 2;`(复位到{0,2})。TS 对照:scene-system.ts:456/:460 站立仅设 walking=false 不复位 stepFrame;present.ts:251/253 渲染用 stepFrame/[0,1,0,2][stepFrame];scene-system.test.ts:1404-1419 回归测试以错误的 C 假设锁定了不复位行为。

差异属实，且非误报。

C 真值(scene.c):
- 第654行 `static int s_iThisStepFrame = 0;` — 跨调用持久。
- 走路分支 第663行 `s_iThisStepFrame = (s_iThisStepFrame + 1) % 4;`
- 站立分支(fWalking==FALSE)末尾 第773-774行 `s_iThisStepFrame &= 2; s_iThisStepFrame ^= 2;`，把计数器规整为偶数集 {0,2}（0/1→2，2/3→0），为下次起步设相位。
- 第664-672行 iStepFrameLeader 映射(walkFrames==3 时):奇数→(s+1)/2，偶数→0，即 {0→0,1→1,2→0,3→2}。

TS 现状:
- scene-system.ts:453 走路 `stepFrame=(stepFrame+1)%4` — 与 C 走路分支一致。
- scene-system.ts:456(撞墙) 与 :460(无方向键) 站立分支只设 `walking=false`，**完全不动 stepFrame**，没有 C 的 `&=2; ^=2;` 复位。
- 我对全部 src 源码 grep `stepFrame` 的 `=0 / & / ^ / %4`（除两处 `+1)%4` 自增外），确认 TS 任何地方都没有复位/规整 stepFrame —— C 的复位语义确实未被复现。
- present.ts:251/253 渲染:walkFrames==4 用 `dir*4+stepFrame`(直接用 0-3 原值)，walkFrames==3 用 `[0,1,0,2][stepFrame]`（该映射与 C 第664-672行完全一致）。

差异是否到达渲染帧:逐 step-count 推演确认，C 复位后起步首帧 stepFrame 必为奇数{1,3}（→iStepFrameLeader∈{1,2} 明确迈腿帧），TS 冻结值经 `(frozen+1)%4` 后在所有 4 种 step-count 下与 C 都不同；映射到渲染腿相位后(walkFrames==3 常见情形)四种情形也都不同，例如走1步后停→再走:C 渲染 iStepFrameLeader=2，TS=0(中立站立步帧)。故确实影响起步首帧迈步腿相位，单帧级、仅首步。

旁证:scene-system.test.ts:1404-1419 有一条回归测试显式锁定 TS 不复位行为，注释写"stepFrame 不重置为 0(保持 2,下次走时从 2 继续 +1 → 3)"——而 C 此处会把 2 复位成 0、下次得 1。该测试作者误把"保留值"当成 C 真值，恰恰把这处偏差固化进了测试。

排除误报:宏/位运算已手算展开(&=2;^=2 等价于映射到{0,2})；iStepFrameLeader 映射 C/TS 一致;无别处补偿;行号与函数(PAL_UpdatePartyGestures)核对无误。结论:确为对原版步态状态机的真实偏差。

</details>


### ✅ L31 · 🟡 cover-tile 扫描范围用 Math.floor 而非 C 的向零截断除法,精灵贴近地图左/上边缘时遮挡列判定偏移

- **子系统**:渲染·地图瓦片与精灵　**类别**:correctness
- **TS 位置**:`packages/game/src/present/draw-tilemap.ts:210-213`
- **C 依据**:`reference/sdlpal/scene.c:113-117`
- **玩家可感知**:否

**差异**:C PAL_CalcCoverTiles 的循环边界 `(sx - width/2)/32`、`sy/16` 等是 C 整数除法(向零截断);TS draw-tilemap.ts:210-213 用 Math.floor(向负无穷取整)。两者仅在被除数为负时不同。`sx = worldX - width/2 - iLayer/2`,当精灵左半身越过世界 x=0(即 sx-width/2<0,如 NPC 站在地图最左 col 0 附近)时,xStart 在 C 算得 0、TS 算得 -1,使最左列从 x=0 变成 x=-1,进而改变 i=0..2 与 i=3..4 这些 case 落到哪一列(scene.c:117 `(x==(sx-width/2)/32)?0:3`)。party 因 partyoffset 限制 world x≥160 不受影响;仅影响摆在地图极左/极上(col0/row0 附近)的 NPC。

**玩家影响**:潜伏型 latent 差异:x 轴(标题所指主线)的 in-bounds 输出在任何情况下都与 C 相同(多出的负列被 dx<0 bounds 过滤吸收);唯一可能改变可见输出的是 y 轴(高 sprite NPC 贴地图顶边 1~3 tile 内),但对全量 3217 个实装 NPC 套精确公式逐一比对、0 个触发。实际无可感知后果。

<details><summary>C 源证据 / 复核</summary>

scene.c:113-117(循环边界 + iStart 用 C 整除,向零截断);scene.c:99-101(sx=PAL_X(vp)+PAL_X(pos)-iLayer/2,sy=...-iLayer);scene.c:290-291(NPC pos.x=(SHORT)eo.x-vp.x-width/2,可为负);scene.c:246/164(dx<0 等 bounds 与 cover 条件);palcommon.h:37-38(PAL_X/PAL_Y 转 signed SHORT);res.c:301(partyoffset=PAL_XY(160,112));对照 TS draw-tilemap.ts:206-213/246 与 present.ts:481-503(NPC sortY=y+sLayer*8+9, iLayer=sLayer*8+2);本仓 trunc 约定 anim-timeline.ts:114、screen-wave.ts:48。

代码层差异属实，但玩家可感知性被高估，且声称里当作主线的 x 轴效应实际被 bounds 检查完全吸收。

【差异属实】C `scene.c:113-117` 的循环边界 `(sy-height-15)/16`、`sy/16`、`(sx-width/2)/32`、`(sx+width/2)/32` 以及 `:117` 的 `(x==(sx-width/2)/32)?0:3` 都是 C 整数除法(向零截断);TS `draw-tilemap.ts:210-213` 用 `Math.floor`(向负无穷)。`palcommon.h:37-38` PAL_X/PAL_Y 转 signed SHORT,NPC pos 推导 `scene.c:290-291` `x=(SHORT)eo.x-vp.x; x-=width/2` 使 `sx` 可为负。被除数为负的非整除值处会分叉(如 npcX=8,w=32,iLayer=2 → sx=-9,C xStart=0、TS=-1)。本仓自有约定也是「C 整除→Math.trunc」(anim-timeline.ts:114、screen-wave.ts:48 已这么写),故此处确属不一致而非有意移植决策。`sh` 用 `%`(C/JS 截断余数一致),无分叉。

【x 轴效应被完全吸收——驳倒声称主线】声称的「xStart C=0/TS=-1 翻转 case 落列」机制为真,但我做了 pre-bounds 原始候选集对比:TS 比 C 多出的候选(onlyT)全部落在 dx≤-1(负列),被 `draw-tilemap.ts:246` 的 `dx<0 continue`(对应 C 同位 bounds 检查)整列过滤。在 dx≥0 的 in-bounds 集合上,纯 x 轴情形 C 与 TS 输出完全相同(onlyC=onlyT=[])。

【唯一能产生 in-bounds 差异的是 y 轴】当 `sy-height-15<0`(即 npcY ≲ spriteHeight+7,NPC 贴地图顶边约 1.5~4 个 tile 行内)时,TS 比 C 多扫一行 y=-1,其 case2/case4 在 sh=1 时 dy=y+1=0 落到 in-bounds 第 0 行 → TS 比 C 多发 `dy=0` 的遮挡候选(如 `1,0,0`)。这才是真正可能改变可见输出的路径,且 dy=0/1 是地图最顶行。

【对照全量实装数据=0】用真值 event-objects.json 全部 3217 个「spriteNum>0 且可见」NPC,各自真实 sprite 宽高(读 sprite/N.json max frame)、真实 sLayer,套 present.ts 精确公式(含 `Math.floor(iLayer/2)`、`Math.floor(width/2)`),逐一对比 C-trunc 与 TS-floor 的 in-bounds 候选集:0 个 NPC 出现差异。实装最小 NPC x=64(col2),x<48 的 0 个;y<56 的仅 1 个(x=704,y=48,sprite272 高仅18px,需 y≤25 才分叉,不触发)。

【party 结构性免疫】partyoffset=(160,112)(res.c:301),队伍 world x≥160(col5)、y≥112(row7),两条分叉带都够不着——与声称一致。

结论:代码确与 C 真值有别(confirmed),但属潜伏型 latent issue。x 轴(声称标题主线)在任何情况下 in-bounds 输出都不变;y 轴需脚本动态把高 sprite NPC 走到地图顶边 1~3 tile 内且该顶行恰有非零高度遮挡 tile——实装静态数据无一触发,亦未见此类场景证据。

</details>


### ✅ L32 · 🟡 layer-0 瓦片位图缺失时未回落到 tile(0,0,0,0),C 会用首格兜底填充

- **子系统**:渲染·地图瓦片与精灵　**类别**:pixel
- **TS 位置**:`packages/game/src/present/draw-tilemap.ts:124-128`
- **C 依据**:`reference/sdlpal/map.c:406-413`
- **玩家可感知**:否

**差异**:C PAL_MapBlitToSurface 对 layer 0:当 PAL_MapGetTileBitmap 返回 NULL(瓦片 id 超出 tile sprite 帧数,见 palcommon.c:837 PAL_SpriteGetFrame 越界返回 NULL)时,fallback 到 PAL_MapGetTileBitmap(0,0,0,0)(map.c:412),即用首格瓦片填该位置;只有 layer 1 才 continue 跳过。TS draw-tilemap.ts:124-128 对 in-bounds 格子若 `tiles.get(lowerId)` 返回 undefined,直接跳过(留黑/不画),没有 layer-0 的首格兜底。fenceFill 仅覆盖 ±1 越界栅栏位,不覆盖 in-bounds 但 id 无对应帧的情形。

**玩家影响**:若某地图 layer-0 格子引用了不存在的瓦片 id,原版显示首格瓦片(通常是地表底色)而 TS 显示黑洞。对结构正确的原版数据极罕见(layer-0 id 一般都有效),属健壮性差异,正常游玩基本不可见。

<details><summary>C 源证据 / 复核</summary>

map.c:405-414 PAL_MapBlitToSurface 内层 blit:lpBitmap = PAL_MapGetTileBitmap(x,y,h,ucLayer); if(lpBitmap==NULL){ if(ucLayer) continue; lpBitmap = PAL_MapGetTileBitmap(0,0,0,ucLayer,lpMap); } —— 即 layer0(ucLayer==0)NULL 时回落到 cell(0,0) 的首格瓦片,只有 layer1 才 continue 跳过。map.c:249 layer0 帧号 = (d&0xFF)|((d>>4)&0x100)(0..511)。palcommon.c:837-842 PAL_SpriteGetFrame:iFrameNum<0 || iFrameNum>=imagecount → return NULL(越界即触发上面 fallback)。palcommon.c:88-91 PAL_RLEBlitToSurfaceWithShadow:lpBitmapRLE==NULL → return -1(no-op),说明 C 的 fallback 也是 best-effort:若首格本身也 NULL 则同样不画。TS 侧 draw-tilemap.ts:124-128 对 in-bounds cell(lowerId 恒 >=0)仅 `if(img) blit`,无 else 兜底;fenceFill(line 107)只对 cell===null 的 ±1 越界栅栏生效。

代码层面差异属实且描述准确。C(map.c:406-413)对 layer-0 瓦片位图为 NULL 时回落到 PAL_MapGetTileBitmap(0,0,0,0)=首格,layer-1 才 continue;NULL 来源是 PAL_SpriteGetFrame 帧号越界(palcommon.c:837)。TS(draw-tilemap.ts:124-128)对 in-bounds 格子 `if(img) blit` 无 else,缺该首格兜底;fenceFill 仅覆盖越界栅栏位(line 107 条件 cell===null),确实不覆盖 in-bounds 但 id 无帧的情形。这一点声称无误,不是误读、不是别处已处理、不是宏等价。\n\n但玩家可感知性可被实测推翻为否。我遍历了全部 223 个已 extract 的 tilemap:(1) 0 个地图存在 layer-0 格子引用缺失瓦片 id;(2) 0 个 tileset 存在帧索引空洞(连续 0..count-1)。实测最大被引用 layer-0 id=511(map 80/98),二者各有 512 帧、tile-0511.png 均存在;最紧的 map 106 引用 max id=469 而恰有 470 帧(margin=0,正好放下不溢出)。故 C 的 map.c:412 兜底分支对 layer-0 in-bounds 格子在真实数据上从不被执行,TS 的"黑洞"在真实数据上也无法发生。这是纯健壮性差异(对结构损坏/魔改数据才有别),正常游玩不可见。\n\n额外旁注(非本差异):extractor sprite.ts:36/41 用 continue 跳过 offset=0/越界/超尺寸帧,framesToOut(sprite.ts:87)按过滤后位置重编号 index,理论上可造成 tile id 漂移;但实测 0 个 tileset 有空洞,说明 tile sprite chunk 帧全有效,该隐患同样未在真实数据触发。\n\n综上:verdict=confirmed(差异客观存在且描述精确),但严重度维持 low、玩家不可感知(真实数据上不可达)。

</details>


### ✅ L33 · 🟡 narration 框内数字字符步进用 6px(精灵宽),C 用 PAL_CharWidth(=8px)

- **子系统**:渲染·字体与对话框　**类别**:pixel
- **TS 位置**:`packages/game/src/present/dialog-box.ts:754`
- **C 依据**:`reference/sdlpal/text.c:1595; reference/sdlpal/font.c:610-629`
- **玩家可感知**:是

**差异**:C 端 TEXT_DisplayText 对每个字符(含 narration 的数字字符)统一 `x += PAL_CharWidth(text[0])`(text.c:1595)。PAL_CharWidth 永远返回 `font_width[ch] >> 1`(font.c:628),对 ASCII(本项目 Unifont 代替 PALFONT,ASCII 为半宽,font_width=16)= 8px,绝不可能是 6。数字用 PAL_DrawNumber 画的是 6px 黄色精灵,但游标步进仍是 PAL_CharWidth=8,所以 C 里数字之间留 2px 间隙。TS narration 路径对数字字符 `cursorX += 6`(注释误称『PAL_CharWidth 数字字符=6』),把数字排得比原版紧 2px/位,且其后非数字文字在框内整体左移 (位数×2) px。

**玩家影响**:narration 提示框里出现多位数字(如数量 ≥10)时,数字相互贴紧、其后文字略微左移;单个数字时仅尾随字符左移 2px,可感知但轻微。

<details><summary>C 源证据 / 复核</summary>

reference/sdlpal/text.c:1595（x += PAL_CharWidth 对所有字符含数字）；text.c:1583-1592（数字走 PAL_DrawNumber kNumAlignLeft 单位）；text.c:1698（narration 经 TEXT_DisplayText isDialog=TRUE）；font.c:628（PAL_CharWidth=font_width[ch]>>1）；font.c:99（默认 font_width=16）；fontglyph.h:57121 静态表（实测 0x20-0x7E 全=16，数字含在内）；ui.c:705-731 + 提取 frame-19.png=6x8（数字精灵宽 6px，与游标 8px 区分）。TS：packages/game/src/present/dialog-box.ts:754（cursorX += 6，注释错称 PAL_CharWidth 数字=6）；可达性 packages/game/src/core/battle/battle-opcodes.ts:854（偷钱 narration 含 ${c} 数字）。

核对后无法推翻该差异，C 侧证据完全支持声称。

1) C 真值：narration（kDialogCenterWindow）文本走 text.c:1698 `TEXT_DisplayText(lpszText, ..., TRUE)`（isDialog=TRUE）。在 TEXT_DisplayText 内，每个字符（含数字）统一执行 text.c:1595 `x += PAL_CharWidth(text[0])`。数字字符在 text.c:1583-1592 走 `PAL_DrawNumber(text[0]-'0', 1, ..., kNumAlignLeft)`（每次只画 1 位），但游标步进仍是 PAL_CharWidth。

2) PAL_CharWidth 对数字=8，绝非 6：font.c:628 返回 `font_width[wChar] >> 1`；font.c:99 默认 `font_width[i]=16`；fontglyph.h:57121 起的静态表我已解析，0x20-0x7E（含 0x30-0x39）全部=16 → PAL_CharWidth=16>>1=8。所以 C 里 narration 数字间距是 8px，而数字精灵本身宽 6px（ui.c:728-729 `x-=6`；提取出的 data/extracted/images/ui/frame-19.png 实测 6x8），于是 C 数字之间留 2px 间隙、其后文字按 8px/位推进。

3) TS 偏差：dialog-box.ts:754 `cursorX += 6`，注释「sdlpal PAL_CharWidth 数字字符 = 6（digit sprite width）」是事实错误——把 PAL_DrawNumber 内部的 6px 精灵步进误当成了 narration 游标步进（PAL_CharWidth）。结果 TS 数字相互贴紧（少 2px/位间隙），其后非数字文字整体左移 (位数)×2 px。非数字 ASCII 路径无此问题：font.ts renderText 用 g.width=8（font.ts:15/128），与 C 的 PAL_CharWidth=8 一致，故偏差被精确隔离到数字字符上。

4) 排除误报：box 宽度 len 计算 TS 正确（dialog-box.ts:716-719 数字 cp<0x80 计 1，对齐 C text.c:1680-1681 的 `PAL_CharWidth>>3`=8>>3=1）；textX 起点公式也对齐 text.c:1698。差异未在别处被补偿，dialog-box.test.ts 也无任何测试断言数字 6px 步进为正确（即非有意移植决策，纯属注释 + 实现一起搞错）。行号/函数均核对无误。

5) 可达性确证：battle-opcodes.ts:854 偷钱提示构造 `@获得 @${c} @文钱@`、style:'narration'，经 battleDialogQueue → drawNarrationDialog → 命中第 754 行。c = stealItemCount / RandomLong(2,3)，偷钱敌人钱池常达数十至数百，c≥10 是常态，多位数会真实触发。

</details>


### ⏸ L34 · 🟡 淡入淡出 ramp 在 C 里最高只到 60/64(93.75%)而 TS lerp 直插到 100%

- **子系统**:渲染·调色板与淡入淡出　**类别**:pixel
- **TS 位置**:`packages/game/src/core/palette-fade.ts:103-135,241-253`
- **C 依据**:`reference/sdlpal/palette.c:170-180,238-250`
- **玩家可感知**:否
- **评估结论(2026-06-07):⏸ 暂缓**。已找到干净实现(`PaletteFadeState` 加 `rampScale`/`rampOffset`,buildFadeIn 设 `60/64,0`、buildFadeOut 设 `60/64,4/64`,stepPaletteFade lerp 用 `k=clamp(progress*rampScale+rampOffset)`,finalize 仍补精确 100%/0%),但三点叠加致 ROI 过低:(1) 须改写 buildFadeOut/buildFadeIn 既有回归测试里的整洁断言(如 progress=0.5 的 `[50,40,20]`)为 C 量化后的丑值;(2) 玩家不可感知(单帧 100% vs 93.75%);(3) 仅覆盖 4 套 lerp-fade 中的 FadeIn/Out —— SceneFade 的 63/64 上限是另一条未归档分歧,只修这条会留下姊妹不一致。优先做其余可感知 low。

**差异**:C PAL_FadeOut/PAL_FadeIn 的亮度系数 j 由 `(time-SDL_GetTicks())/iDelay/10` 得到,iDelay=1 时 j 的取值范围是整数 0..60,缩放式 `palette[i]*j>>6` = palette × j/64,所以循环期间亮度最高只到 60/64≈93.75%:FadeOut 第一帧即从 100% 直接跳到 93.75% 再线性降到 0,FadeIn 循环末尾只到 93.75%,真正的 100% 由循环结束后那条 `VIDEO_SetPalette(palette)` 一次性补上。TS buildFadeOut/buildFadeIn 用 mode='lerp',stepPaletteFade 按 progress(0→1)在 start↔target 间线性插值 round,progress=1 时正好 100% —— 即 TS 全程平滑覆盖到 100%,没有 C 的 93.75% 平台与末尾的整段补满跳变。palette-fade.ts 模块注释把 `pal[i]*factor>>6` 等同于 `lerp(start,target)` 的说法在 factor 上限是 60(非 64)这点上并不精确。

**玩家影响**:淡出起始的一帧少了 C 的瞬间约 6% 变暗、淡入收尾少了从 93.75% 到 100% 的细小亮度补跳;肉眼几乎不可见但与原版逐帧不一致。

<details><summary>C 源证据 / 复核</summary>

reference/sdlpal/palette.c:163-189（PAL_FadeOut：time=now+iDelay*10*60；j=(time-ticks)/iDelay/10 首帧=60；newpalette=palette*j>>6=×60/64=93.75%；循环后 line 188-189 补全黑）；palette.c:232-258（PAL_FadeIn：line 244 j=60-j_raw 循环封顶 93.75%；line 258 循环后 VIDEO_SetPalette(palette) 一次性补 100%）；script.c:1764/1780/1789 及 scene.c:506、battle.c:735 等调用点 iDelay 恒为 1，印证 j∈0..60。对照 TS：palette-fade.ts:113/131（mode='lerp'）、241-253（progress 0→1 线性 round，覆盖 100%↔0）。

差异在代码层面属实，我独立核对了 C 整数运算与 TS 插值两侧。

C 侧（palette.c）：
- FadeOut（palette.c:163-189）：`time = SDL_GetTicks() + iDelay*10*60`，循环内 `j = (int)(time - SDL_GetTicks())/iDelay/10`。iDelay=1（script.c:1764/1780 等几乎所有调用点都是 1，battle/scene/ending 同）时首次迭代 t≈T0 → j=600/10=60，缩放 `palette[i]*j>>6` = ×60/64 = 93.75%。循环内 j 取整数 0..60，永不到 64。100% 的色表是循环开始前屏上已有状态，循环第一条 `VIDEO_SetPalette`（line 183）即把它降到 93.75%，再线性降到 0；最终全黑由循环后 memset+SetPalette（line 188-189）补上。
- FadeIn（palette.c:232-258）：`j = 60 - j_raw`（line 244），首帧 j=0（全黑），循环末帧 j=60 → 93.75%；真正 100% 由循环结束后那条 `VIDEO_SetPalette(palette)`（line 258）一次性补上。

TS 侧（palette-fade.ts）：
- buildFadeOut/buildFadeIn 用 `mode:'lerp'`（line 113、131）。
- stepPaletteFade（line 241-253）：`progress = clamp(elapsed/total,0,1)`，`colors[j]=round(s+(t-s)*progress)`。progress=0→start（FadeOut 即 100% 原色），progress=1→target。全程平滑覆盖 0↔100%，没有 93.75% 平台，也没有末尾整段补满跳变。

main-loop.ts:90 证实 paletteFadeState 每个 rAF 帧都 present；fade opcode 在 tick 内记 startTimeMs=now，同帧/次帧 present 即以 progress≈0 渲染 → TS 首个 FadeOut 帧确实是 100%，无补偿偏移。故描述的三点（FadeOut 首帧 100% vs C 93.75%、FadeIn 末尾平滑到 100% vs C 循环封顶 93.75%+末尾跳变、模块注释把 `pal*factor>>6` 等同 lerp 在 factor 上限 60 这点不精确）全部成立，非误报。

</details>


### ✅ L35 · 🟡 大世界仙术菜单:仙术列表按 Cancel 应直接关菜单回大世界,TS 却退回「选施法人」

- **子系统**:菜单·主菜单/物品/装备/商店　**类别**:correctness
- **TS 位置**:`packages/game/src/core/menu/in-game-magic-menu.ts:203-207 (cancelInGameMagic pick-spell 分支); menu-driver.ts:772-775`
- **C 依据**:`reference/sdlpal/uigame.c:719-736`
- **玩家可感知**:是

**差异**:C 的 PAL_InGameMagicMenu 在 line 719 只在入口用 PAL_ReadMenu 显示一次「选施法人」,选完进入 line 730 的 `while(TRUE){ wMagic = PAL_MagicSelectionMenu(...); if(wMagic==0) break; ...}` 仙术循环。仙术列表 Cancel → wMagic==0 → break 外层 while → 函数 return → PAL_InGameMenu `goto out` 关掉整个菜单回大世界。即:caster 选择只出现一次,仙术列表 Cancel = 退出整个仙术菜单。TS cancelInGameMagic 在 pick-spell 时却把 phase 设回 'pick-caster',重新弹施法人选择框。模块头注释「pick-spell Menu → wMagic=0 break outer while → 回 pick-caster」是误读:break 的是 spell 循环不是回到 caster。

**玩家影响**:玩家在大世界仙术菜单里选好角色、进入法术列表后按取消键,原版直接退回大世界;TS 却回到「选谁施法」那一层,需要再按一次取消才出菜单,多了一层并与原版操作手感不一致。

<details><summary>C 源证据 / 复核</summary>

reference/sdlpal/uigame.c:719（PAL_ReadMenu 选施法人，循环外、仅执行一次）；:726 start_magicmenu: 标签；:730 while(TRUE) 外层循环；:732 PAL_MagicSelectionMenu 仙术列表；:733-736 if(wMagic==0){break;}（Cancel→break 外层 while）；:874-875 函数收尾 return；:680 唯一 goto start_magicmenu（入口单人捷径，循环内无回到 719 的路径）；:1017-1018 case 2: PAL_InGameMagicMenu(); goto out;（return 即关菜单回大世界）；:1039 out: 撤菜单框。对照 TS：in-game-magic-menu.ts:203-207 cancelInGameMagic pick-spell 分支设 phase='pick-caster'；menu-driver.ts:772-775 仅 phase==='done' 才关菜单；误读固化于 in-game-magic-menu.ts:23-24 注释与 in-game-magic-menu.test.ts:234 回归测试。

核对 C 真值 reference/sdlpal/uigame.c PAL_InGameMagicMenu，控制流与声称完全吻合：

1. uigame.c:719 `w = PAL_ReadMenu(...)`（选施法人）在 uigame.c:726 的 `start_magicmenu:` 标签之前、且在外层 while 之外，整个函数只执行一次。
2. uigame.c:730 `while (TRUE)` 开始；uigame.c:732 `wMagic = PAL_MagicSelectionMenu(...)`（仙术列表，阻塞）。
3. uigame.c:733-736 `if (wMagic == 0) { break; }`——仙术列表按 Cancel 返回 0 → break 跳出外层 while。
4. break 后落到 uigame.c:874 `}`（外层 while 收尾，即 763-781 内的 redraw 块也在 while 内）→ uigame.c:875 `}` 函数 return。grep 确认全函数内唯一的 `goto start_magicmenu` 在 uigame.c:680（仅 wMaxPartyMemberIndex==0 入口捷径），循环体内无任何 goto 回到 719 的 PAL_ReadMenu。
5. 调用方 uigame.c:1017-1018 `case 2: PAL_InGameMagicMenu(); goto out;`，函数 return 即跳 uigame.c:1039 `out:` 撤掉菜单框 → 回大世界。

故 C 真值：仙术列表 Cancel = 一次按键 = break 外层 while = 函数 return = `goto out` 关整个菜单回大世界，选施法人框绝不重弹。

TS 端 in-game-magic-menu.ts:203-207 cancelInGameMagic 的 'pick-spell' 分支把 phase 设回 'pick-caster' 并清 selectedCasterId/spellMenu；menu-driver.ts:772-775 只在 `phase === 'done'` 时 closeTopMenu，所以此时菜单不关、重新显示选施法人框，需再按一次 Cancel（pick-caster → 'done'）才回大世界。比 C 多一层、多一次按键。

排除误报：声称所指的「pick-spell Menu → wMagic=0 break outer while → 回 pick-caster」误读，正是 TS 模块头注释 in-game-magic-menu.ts:23-24 与回归测试 in-game-magic-menu.test.ts:234 'pick-spell → pick-caster' 主动锁死的错误模型——break 跳出的是 spell 循环并使函数 return，而非回到 719 的 caster PAL_ReadMenu（caster 菜单在循环外、循环内无重入路径）。其余两个 cancel 分支（pick-target→pick-spell 对应 uigame.c:805 wPlayer=CANCELLED 退内层 picker；pick-caster→关菜单对应 uigame.c:721-723 return）均正确，差异确实只在 pick-spell 这一层，非别处已处理、非等价写法、非有意移植、行号/函数无读错。

差异成立。玩家可感知：原版在大世界仙术列表按取消一次直接回大世界，TS 退回「选谁施法」需再按一次取消，多一层菜单且操作手感不符原版。

</details>


### ✅ L36 · 🟡 仙术列表未按法术 ObjectID 升序排序,TS 按学会顺序(rgwMagic 槽位顺序)显示

- **子系统**:菜单·主菜单/物品/装备/商店　**类别**:pixel
- **TS 位置**:`packages/game/src/core/menu/magic-select.ts:33-52 (createMagicSelectMenu 无排序)`
- **C 依据**:`reference/sdlpal/magicmenu.c:377-397`
- **玩家可感知**:是

**差异**:C 的 PAL_MagicSelectionMenuInit 收集 rgwMagic[i][role] 全部非零法术后,line 377-397 用冒泡排序按 wMagic(法术 ObjectID)**升序**重排 rgMagicItem[],菜单永远按法术 ID 顺序显示。TS createMagicSelectMenu 直接 `(role.magic ?? []).filter(sid => sid !== 0).map(...)` 保留 rgwMagic SoA 槽位原始顺序(=学会先后顺序),不做排序。若角色学法术的顺序与 ID 顺序不一致(常见,如先学高 ID 后学低 ID),列表项排列、默认光标落点、翻页位置都会与原版不同。

**玩家影响**:大世界/战斗仙术列表里法术的排列顺序与原版不一致(原版固定按法术编号排,TS 按习得顺序),玩家熟悉的「第 N 个是某法术」记忆失效,视觉排版不符。

<details><summary>C 源证据 / 复核</summary>

reference/sdlpal/magicmenu.c:337-372(按槽位序收集 rgMagicItem[].wMagic);magicmenu.c:377-397(冒泡按 wMagic=法术 ObjectID 升序排序);magicmenu.c:402-409(光标按 wDefaultMagic 内容匹配落点，不受排序影响);global.c:2107-2134 PAL_AddMagic(追加首个空槽，非有序插入→rgwMagic 乱序);uigame.c:732 与 uibattle.c:1112 均调用同一 PAL_MagicSelectionMenuInit。TS 旁证:battle-system.ts:976 战斗路径已 .sort((a,b)=>a.id-b.id) 并注释引 magicmenu.c:377-397，而 magic-select.ts:33-52 大世界路径无排序;game-state.ts:1359 数据层亦不排序。

差异属实，且证据链完整、无误报来源。

1) C 真值 — 排序确实存在且作用于法术 ObjectID。`magicmenu.c:337-372` 的 PAL_MagicSelectionMenuInit 按 rgwMagic[i][role] 原始槽位顺序收集非零 w 到 rgMagicItem[].wMagic；`magicmenu.c:377-397` 冒泡排序 `if (rgMagicItem[j].wMagic > rgMagicItem[j+1].wMagic) swap`，即按 wMagic(=法术 ObjectID)升序。声称的行号/函数/机制全部核对无误。

2) 排查“rgwMagic 是否本就有序导致排序为空操作”——已证伪。`global.c:2107-2134` 的 PAL_AddMagic 把 wMagic 写入“第一个空槽”(line 2118-2124 找 ==0 槽，2134 赋值)，纯按习得先后追加，不做有序插入。故 rgwMagic 确为乱序，菜单期排序是真实可观察行为。

3) 排查“TS 在别处已补排序”——已证伪。TS 数据层 `game-state.ts:1359` `magic: runtime.rgwMagic.map((slot)=>slot[i]??0)` 仅镜像 SoA 槽位顺序、无排序；大世界唯一调用点 `in-game-magic-menu.ts:110` 直接喂 createMagicSelectMenu、下游无重排；`magic-select.ts:33-52` map 后无 `.sort()`。

4) 排查“是否有意移植决策”——反证成立，是遗漏而非设计。TS 战斗法术菜单 `battle-system.ts:955-977` 的 buildBattleMagicSelect 明确 `.sort((a,b)=>a.id-b.id)` 并注释“sdlpal magicmenu.c:377-397 冒泡按 wMagic(object id)排序”，证明作者知晓并已在战斗路径移植该排序；大世界路径漏写，构成 TS 内部不一致(同一角色法术在战斗菜单有序、大世界菜单按习得序)。C 侧两条路径(大世界 uigame.c:732、战斗 uibattle.c:1112)调用同一 init，故均应有序。

5) 两菜单 id 语义一致:battle 用 `id: spellId`、overworld 用 `id: spell.id`，均为 spell ObjectID(magic-select.ts:31-32 注释“spells.json id 即 wObjectID”)，对应 C 的 wMagic，按 id 排序即正确修复。

现有测试(__tests__/item-magic-select.test.ts:103-145)的样例槽位 [1,2,0...] 恰好已升序，未覆盖乱序场景，故该遗漏不会被测试捕获，属潜伏 bug。

判定 confirmed。

</details>


### ✅ L37 · 🟡 大世界仙术「选施法人」框:TS 把无可用大世界法术的活人也标灰禁选,原版只按 HP>0 判定可选

- **子系统**:菜单·主菜单/物品/装备/商店　**类别**:correctness
- **TS 位置**:`packages/game/src/core/menu/in-game-magic-menu.ts:64-73 (casterItems disabled: !hasOutsideMagic || r.hp<=0)`
- **C 依据**:`reference/sdlpal/uigame.c:707-708`
- **玩家可感知**:是

**差异**:C 的 PAL_InGameMagicMenu 生成 caster 菜单项时,fEnabled **只判 `rgwHP[role] > 0`**(uigame.c:707-708),不检查该角色是否有可在大世界使用的法术。即一个活着但没有任何 outside-battle 法术的角色在原版里仍可被选中,进入后看到空的/全灰的法术列表再取消。TS 给 caster 项设 `disabled: !hasOutsideMagic || r.hp <= 0`,把「无大世界法术」的活人也禁选,且光标会跳过他。

**玩家影响**:大世界开仙术菜单时,某些活着但暂无大世界法术的角色在 TS 里是灰色不可选(光标跳过),与原版可选中(进入后空列表)不同。属低频边界,但选人框的可选项集合与原版不符。

<details><summary>C 源证据 / 复核</summary>

uigame.c:707-708（caster fEnabled 仅判 rgwHP[role]>0，无 outside-magic 检查）；ui.c:510 与 565-572（PAL_ReadMenu Down/Up 无条件 ++/--，不跳过 disabled），ui.c:621（Enter 仅在 fEnabled 时 return，禁用项停留但按不动）；magicmenu.c:364-367（PAL_MagicSelectionMenuInit 大世界对缺 kMagicFlagUsableOutsideBattle 的法术 fEnabled=FALSE，即进入后全灰/空列表）。TS：in-game-magic-menu.ts:72（disabled: !hasOutsideMagic || r.hp<=0）、primitives.ts:57 与 66-75（初始光标落首个非 disabled + Up/Down 跳过 disabled）；spells.ts:43（usableOutsideBattle=bit0，语义与 C 一致）。

差异属实，且实为复合分歧，两个子点都核到 C 源证据：

1) caster 启用谓词。C 的 PAL_InGameMagicMenu 生成 caster 菜单项时 fEnabled 仅 = `rgwHP[role] > 0`（uigame.c:707-708），完全不检查该角色是否有大世界可用法术。TS 在 in-game-magic-menu.ts:72 写成 `disabled: !hasOutsideMagic || r.hp <= 0`，多加了 `!hasOutsideMagic`。`hasOutsideMagic` 经 spells.ts:43（usableOutsideBattle = bit0 = kMagicFlagUsableOutsideBattle）核对语义与 C 一致，对「只会战斗法术的活人」确实可为 false，分歧不会被数据巧合掩盖。

2) 光标行为。C 的 PAL_ReadMenu（ui.c:486-628）对 Down/Right 是无条件 `wCurrentItem++`（510）、Up/Left 无条件 `wCurrentItem--`（565-572），均不跳过 disabled；只有 Enter 在 `!fEnabled` 时不 return（621），即「光标会停在禁用项上，只是按不动」。而原版里这种活着但无大世界法术的角色 fEnabled 本就是 TRUE（HP>0），是可被光标停留并按 Enter 选中的。TS 的 primitives.ts:57 createSelectionMenu 初始光标落在首个非 disabled 项，findNextSelectable（66-75）在 Up/Down 时主动跳过 disabled —— 因此 TS 把该角色灰掉且光标跳过他。

3) 原版「进入后空/全灰列表再取消」也核到：PAL_MagicSelectionMenuInit（magicmenu.c:337-372）按 role 的 rgwMagic 建表，大世界场景对缺 kMagicFlagUsableOutsideBattle 的法术置 fEnabled=FALSE（364-367），故选中这类角色后看到全灰（或他一术不会则空表）再 Cancel 退回，正是差异描述的原版行为。

综上 TS 选人框的可选项集合与原版不符：原版该活人可被选中（白字、光标可停、可进入空列表），TS 把他灰掉且光标跳过。判定 confirmed。

</details>


### L38 · 🟡 菜单光标遇到禁用项会跳过,原版 PAL_ReadMenu/选人框/法术列表都是逐项移动并停在灰色项上

- **子系统**:菜单·主菜单/物品/装备/商店　**类别**:correctness
- **TS 位置**:`packages/game/src/core/menu/primitives.ts:67-85 (findNextSelectable 跳过 disabled + moveSelectionUp/Down)`
- **C 依据**:`reference/sdlpal/ui.c:510-572 (PAL_ReadMenu 逐 1 移动不跳禁用); reference/sdlpal/magicmenu.c:111-116; reference/sdlpal/uigame.c:1473-1488`
- **玩家可感知**:是

**差异**:TS 的 SelectionMenu primitive 用 findNextSelectable 在移动时跳过所有 disabled 项(modulo 环绕+跳过),被仙术选人框、用物品选目标、法术列表共用。但 C 对应的三处都是**逐项移动、停在禁用项上、确认时 no-op**:PAL_ReadMenu(ui.c:510-572)wCurrentItem±1 环绕,落在 fEnabled=FALSE 项时画 MENUITEM_COLOR_SELECTED_INACTIVE 并允许停留,Enter 时 `if(fEnabled)` 才生效;PAL_MagicSelectionMenuUpdate(magicmenu.c:111-116)对 g_iCurrentItem 做 clamp(不跳不环绕);ItemUseMenu 选人(uigame.c:1473-1488)逐 1 移动且无禁用概念。

**玩家影响**:存在灰色不可选项的菜单(法术列表 MP 不足项、选人框等),TS 按方向键会「跳过」灰色项直接落到下一个可选项,原版则会逐格停在灰色项上(只是确认无效)。光标移动节奏与高亮位置与原版不同,玩家能直接感知。

<details><summary>C 源证据 / 复核</summary>

magicmenu.c:347-352 (MP不足→fEnabled=FALSE); magicmenu.c:67-90 (item_delta=±iItemsPerLine/±1); magicmenu.c:111-116 (仅clamp不跳); magicmenu.c:243-257 (禁用项画SELECTED_INACTIVE); magicmenu.c:279 (确认if(fEnabled)否则0xFFFF no-op); ui.c:510-572 (PAL_ReadMenu wCurrentItem++/--环绕,禁用项停留并画SELECTED_INACTIVE@528/585); uigame.c:1380-1497 (物品选人无禁用概念,sSelectedPlayer±1环绕@1473-1488,全员MENUITEM_COLOR@1391)

差异属实，C 真值三处确实逐项移动、停在禁用项上、确认时 no-op，而 TS 的 findNextSelectable 会跳过禁用项。

C 源核对：
1) 法术列表 magicmenu.c:347-352 — PAL_MagicSelectionMenuInit 明确为 MP 不足项设 `rgMagicItem[].fEnabled = FALSE`（wMP>g_wPlayerMP），还含战内/战外不可用判定。导航 magicmenu.c:67-90 是 item_delta=±iItemsPerLine(上/下)/±1(左/右)，magicmenu.c:111-116 仅 clamp 到 [0, g_iNumMagic-1] 不跳禁用；渲染 magicmenu.c:243-257 当 cursor 落在 !fEnabled 项画 MENUITEM_COLOR_SELECTED_INACTIVE；确认 magicmenu.c:279 `if(rgMagicItem[g_iCurrentItem].fEnabled)` 才返回，否则 0xFFFF（no-op）。
2) PAL_ReadMenu ui.c:510-572 — wCurrentItem++/-- 环绕（512-515、565-572），落禁用项画 MENUITEM_COLOR_SELECTED_INACTIVE（528、585），停留。
3) 物品使用选人 uigame.c:1380-1497 — 全员一律 MENUITEM_COLOR（1391）无禁用概念，sSelectedPlayer±1 环绕（1473-1488），无跳过逻辑。

TS 核对：primitives.ts:67-85 findNextSelectable 用 modulo 环绕跳过所有 disabled；moveSelectionUp/Down 调它。被三处实际带 disabled 的菜单复用并已活跃接线到运行时输入：magic-select.ts:47 `disabled: insufficient`(MP 不足)、in-game-magic-menu.ts:72 `disabled: !hasOutsideMagic || hp<=0`(选施法者)、inventory-menu.ts:222 `disabled: r.hp<=0`(用物品选目标)；menu-driver.ts:778-782 与 592-593 分别经 inGameMagicMoveUp/Down、inventoryMoveUp/Down 调用 moveSelectionUp/Down。跳过行为还被测试 primitives.test.ts:50-58「disabled item 自动跳过」锁定，证明是当前活跃行为而非废码。

排除误报：(a) 不是宏等价——C 三处确有逐 1 移动且 fEnabled 决定颜色而非跳过；(b) 不是别处已处理——渲染层 draw-magic.ts:189、276 反而已实现「cursor 落禁用项画 SELECTED_INACTIVE」的 C 着色，恰恰是导航层 findNextSelectable 让该分支对法术/选人菜单永不触发，说明导航跳过与渲染层意图自相矛盾，倾向无意偏差而非有意移植决策；(c) 行号/函数无误。

附带发现（超出本条字面，但相关）：inventory-menu.ts:222 把 hp<=0 队员标 disabled，而 C 物品选人(uigame.c:1380-1497)无禁用概念、允许选死亡队员（复活类物品需要选已倒下的成员）——TS 既跳过又（在数据层）禁用，比单纯「跳过 vs 停留」更进一步偏离 C，可能影响对倒地队员用药目标选择。

</details>


### ✅ L39 · 🟡 用物品列表未把「已装备但本身可用」的装备追加进列表

- **子系统**:菜单·主菜单/物品/装备/商店　**类别**:correctness
- **TS 位置**:`packages/game/src/core/menu/inventory-menu.ts:106-133 (createInventoryMenu 仅遍历 gs.inventory)`
- **C 依据**:`reference/sdlpal/itemmenu.c:353-376`
- **玩家可感知**:是

**差异**:C 的 PAL_ItemSelectMenuInit 在 `(wItemFlags & kItemFlagUsable) && !fInBattle` 时(=大世界用物品入口),会额外把全队 6 个装备槽里**本身带 kItemFlagUsable 的装备**追加进 inventory 列表(nAmount=0、nAmountInUse=-1),让这些已穿戴却可用的物品也能在「使用」菜单里被选用。TS createInventoryMenu 只 map gs.inventory,从不追加已装备物品,故这类物品在大世界「使用」列表中缺失。

**玩家影响**:若某件装备同时具有「可使用」标志(原版机制允许穿着的同时从用物品菜单使用它),TS 的用物品列表里看不到它、无法使用。属低频(取决于具体物品 flag 组合),但与原版列表内容不一致。

<details><summary>C 源证据 / 复核</summary>

reference/sdlpal/itemmenu.c:352-376(if `(wItemFlags & kItemFlagUsable) && !fInBattle` 遍历 rgParty×rgwEquipment[j][w],对 `item.wFlags & kItemFlagUsable` 的装备追加 rgInventory,nAmount=0/nAmountInUse=(WORD)-1);itemmenu.c:289-291 确认判定 `(SHORT)nAmount > (SHORT)nAmountInUse`(0>-1=TRUE 可选);global.h:135-141 kItemFlagUsable=(1<<0)、kItemFlagEquipable=(1<<1) 正交。TS:inventory-menu.ts:120-124 仅 map gs.inventory 无追加;menu-driver.ts:134/571 以 'usable' 进世界用物品入口。items.json 实测 id260/263/264/265/266/267(圣灵珠/风雷水火土灵珠)usable&equipable 双标志。

C 真值确认该分支存在且 TS 缺失。reference/sdlpal/itemmenu.c:352-376:PAL_ItemSelectMenuInit 在数完普通库存后,当 `(wItemFlags & kItemFlagUsable) && !gpGlobals->fInBattle`(=大世界用物品入口)时,遍历全队 6 个装备槽,把自身带 kItemFlagUsable 的已装备物追加进 rgInventory(nAmount=0, nAmountInUse=(WORD)-1)。确认逻辑 itemmenu.c:289-291 用 `(SHORT)nAmount > (SHORT)nAmountInUse` 即 `0 > -1` = TRUE,故这些"已穿戴但可用"的物品在使用菜单里可被选用。

TS 端 inventory-menu.ts:120-124 createInventoryMenu 只 `gs.inventory.map(...)`,从不追加装备槽里的可用物;其上方注释块只论证了"不按 flag 过滤列表"的移植决策,但漏掉了这条独立的"追加已装备可用物"分支。入口对齐无误:menu-driver.ts:134 与 :571 用 filter='usable' 打开正是大世界 use 入口,与 C 的 `kItemFlagUsable && !fInBattle` 前置条件一一对应;且 grep 全仓无其他代码路径会把装备槽物品注入库存列表(rgwEquipment 数据在 game-state.ts 存在,但 createInventoryMenu 未用)。global.h:135 kItemFlagUsable=(1<<0)、:136 kItemFlagEquipable=(1<<1) 为正交位,可同时置位。

玩家可感知性已用真实数据坐实:data/extracted/data/items.json 中有 6 件同时 usable:true 且 equipable:true 的物品——圣灵珠(id260)、风/雷/水/火/土灵珠(id263-267)。仙剑里这些灵珠是饰品槽装备,穿戴提升属性/抗性,使用则释放对应五灵法术。若玩家把某灵珠装上且背包无第二份,原版仍能从"用物品"菜单使用它,TS 端则该项整条从列表缺失、无法使用。非误报。

</details>


### ✅ L40 · 🟡 用物品选目标框的默认光标位置未跨次记忆(原版 sSelectedPlayer 为 static 持久)

- **子系统**:菜单·主菜单/物品/装备/商店　**类别**:correctness
- **TS 位置**:`packages/game/src/core/menu/inventory-menu.ts:224 (每次 confirmInventoryItem 都 createSelectionMenu 重置光标)`
- **C 依据**:`reference/sdlpal/uigame.c:1311 (static SHORT sSelectedPlayer)`
- **玩家可感知**:否

**差异**:C 的 PAL_ItemUseMenu 用 `static SHORT sSelectedPlayer`(uigame.c:1311),光标位置在同一次/多次开用物品菜单之间**持久记忆**(仅当越界 > wMaxPartyMemberIndex 时归 0)。TS 每次 confirmInventoryItem 都 `createSelectionMenu(targetItems)`,光标重置到第一个可选项(通常 index 0)。**切换到不同物品、或关闭重开物品菜单后**,原版保留上次选中的队员,TS 回到队首;而同一物品反复使用时 TS 实际也保留光标、与 C 一致(menu-driver 只 revert phase 不重建 targetMenu)。

**玩家影响**:仅在切换物品或重开菜单后选目标时,原版停在上次选的队员、TS 跳回队首;同一物品连续补血两者一致。属轻微体验差异。

<details><summary>C 源证据 / 复核</summary>

reference/sdlpal/uigame.c:1311 (static SHORT sSelectedPlayer=0); uigame.c:1320-1323 (仅越界归0); uigame.c:1495 (Confirm返回不复位); reference/sdlpal/play.c:264-303 (外层选物品+内层同物品反复调PAL_ItemUseMenu); TS: packages/game/src/core/menu/inventory-menu.ts:224 + primitives.ts:50-64 (createSelectionMenu初始首个可选项,无持久态); packages/game/src/core/menu/menu-driver.ts:609-614,655-659 (同物品反复用时targetMenu被保留,仅revert phase)

代码层面差异属实，但声称的"头号场景"描述有误，需收窄。

C 真值（已核对）：
- uigame.c:1311 `static SHORT sSelectedPlayer = 0` —— 确为 static，跨所有 PAL_ItemUseMenu 调用持久。
- uigame.c:1320-1323 顶部只在 `sSelectedPlayer > wMaxPartyMemberIndex` 时归 0，否则保留。
- uigame.c:1495 按 Confirm(kKeySearch) 返回 `rgParty[sSelectedPlayer].wPlayerRole`，返回时不复位。
- play.c:264-303：外层 while(TRUE) 选物品，内层 while(TRUE)(280-303) 对【同一物品】反复调 PAL_ItemUseMenu。因 static，sSelectedPlayer 跨 (a) 同物品反复使用 (b) 切换到别的物品 (c) 关闭后重开整个菜单 三种情形都持久。

TS 行为（已核对）：
- inventory-menu.ts:224 `createSelectionMenu(targetItems)` 是唯一建 targetMenu 的地方；primitives.ts:57 cursor 初始落到首个非 disabled 项，零跨调用记忆；game-state/menu-driver 中无任何 lastSelectedPlayer/targetCursor 持久态（grep 确认）。
- 关键反证：声称的头号场景"连续逐个给队员补血"其实是 C 的内层循环（同物品反复用）。该场景 TS 实际是匹配的——menu-driver.ts:655-659 一次成功使用后只把 `s.phase` 置回 'use-target'，不重建 targetMenu；refresh 块(609-614)只动 s.inventory 与 list cursor，不碰 s.targetMenu。故同物品反复用时目标光标在 TS 里也保留。声称描述的这一场景属误读。

真正未复刻的分歧（窄于声称）：
1. 切换到不同物品：用完物品A选了队员2，退回列表选物品B → confirmInventoryItem 重建 targetMenu，光标回首个可选项；C 会保留队员2。
2. 关闭后重开整个物品菜单：TS 重建全新 state 无记忆；C 的 static 仍记得上次队员。

故差异客观存在、TS 行号与 C 依据均正确，不是误报；但声称的具体玩家场景（连续补血同物品）TS 并不偏离，需把适用范围改为"跨物品/跨次开菜单"。

</details>


### ✅ L41 · 🟡 单人队伍开仙术菜单时,TS 仍弹出「选施法人」框,原版直接进法术列表

- **子系统**:菜单·主菜单/物品/装备/商店　**类别**:correctness
- **TS 位置**:`packages/game/src/core/menu/in-game-magic-menu.ts:75-81 (createInGameMagicMenu 恒从 phase='pick-caster' 起)`
- **C 依据**:`reference/sdlpal/uigame.c:677-681`
- **玩家可感知**:是

**差异**:C 的 PAL_InGameMagicMenu 在 `wMaxPartyMemberIndex == 0`(队伍只有 1 人)时,line 677-681 `w = 0; goto start_magicmenu;` 跳过整个选施法人步骤,直接进法术选择循环。TS createInGameMagicMenu 无论队伍人数恒从 'pick-caster' 阶段开始,单人队伍也会先显示一个 1 项的选施法人框。

**玩家影响**:游戏序章/特定剧情段只有李逍遥一人时,大世界开仙术原版直接进法术列表,TS 多一步「选施法人」(且配合上面的 cancel 差异,取消行为也不同)。属低频剧情段边界。

<details><summary>C 源证据 / 复核</summary>

reference/sdlpal/uigame.c:677-681 (`if (gpGlobals->wMaxPartyMemberIndex == 0) { w = 0; goto start_magicmenu; }` 跳过选施法人)；uigame.c:686-723 (被跳过的 caster 选择块:画框+PAL_ReadMenu)；uigame.c:726-732 (`start_magicmenu:` → `while(TRUE){ wMagic = PAL_MagicSelectionMenu(...) }`)；reference/sdlpal/global.h:527 (`wMaxPartyMemberIndex` = max index 0..MAX-1，故 ==0 即单人)。TS 对照:packages/game/src/core/menu/in-game-magic-menu.ts:75-81 (恒 phase='pick-caster')；packages/game/src/present/menu/draw-magic.ts:174,184-200,328-330 (单人仍画 1 项 caster 框)；menu-driver.ts:140,425,786-787 (无条件 create + 须先 confirmCaster)。

C 真值确认差异属实。uigame.c:677-681 `PAL_InGameMagicMenu` 在 `gpGlobals->wMaxPartyMemberIndex == 0` 时执行 `w = 0; goto start_magicmenu;`，整体跳过选施法人块（uigame.c:686-693 画 PlayerInfoBox、700-712 生成菜单项、717 `PAL_CreateBox`、719 `PAL_ReadMenu`），直接落到 `start_magicmenu:`(uigame.c:726)进入 `while(TRUE){ wMagic = PAL_MagicSelectionMenu(...) }`(uigame.c:730-732)法术选择循环。`wMaxPartyMemberIndex` 语义经 global.h:527 注释确认为「max index of members in party (0 to MAX_PLAYERS_IN_PARTY - 1)」，故 `== 0` 即队伍恰好 1 人——这是真正的单人快路径，非空队伍边界。

TS 侧 in-game-magic-menu.ts:75-81 `createInGameMagicMenu` 无条件返回 `phase: 'pick-caster'`，无任何队伍人数判断；两处调用点 menu-driver.ts:140 与 :425 也均无条件调用。渲染侧 draw-magic.ts:328-330 在 `pick-caster` 阶段调 `drawPickCaster`，其中 line 174 `rows = Math.max(1, state.partyMembers.length - 1)` 对单人队伍画出 1 行选施法人框并渲染 1 个角色名(draw-magic.ts:184-200)，menu-driver.ts:786-787 须先 `confirmCaster` 才进 pick-spell。因此单人队伍在 TS 确会多出一个 1 项「选施法人」框 + 一次 Confirm，与 C 行为不符。

排除误报检查：行号/函数均读对；无宏等价(`wMaxPartyMemberIndex==0` 是显式数值比较)；TS 无别处短路单人路径；模块头注释(line 13-24)将 'pick-caster' 直接映射到 uigame.c:686-723 而完全未提 677-681 的单人 skip，说明这是移植遗漏而非有意决策。

补充:序章单人段李逍遥通常无 outside-battle 法术，TS 该单项会 `disabled`(in-game-magic-menu.ts:72)、Confirm 为 no-op——但框仍渲染，反而比 C(根本不画框)更偏离;无论如何额外框都会出现，差异成立。

</details>


### ✅ L42 · 🟡 DOS splash 结束未做 PAL_FadeOut(1)(600ms 淡黑),直接硬切到 OpeningMenu

- **子系统**:过场·整屏动画与结局　**类别**:timing
- **TS 位置**:`packages/game/src/shell/splash-fallback.ts:249-266`
- **C 依据**:`reference/sdlpal/main.c:455`
- **玩家可感知**:是

**差异**:sdlpal `PAL_SplashScreen` 在 while 循环 break 后执行 `PAL_FadeOut(1)`(main.c:455),即 splash 退出前先 600ms 淡到全黑,再进 PAL_OpeningMenu。TS `playSplashFallback` 跳过分支只 `UTIL_Delay(500)` 等价的 `sleep(POST_SKIP_DELAY_MS=500)` 后 break,无淡出;bootstrap showTrademarkAndSplash().then 里紧接着 `input.clearPressed()` + 建 OpeningMenu(bootstrap.ts:1611-1619),中间无 fadeOut。splash 画面(满亮的仙鹤+标题)直接被 OpeningMenu 覆盖。

**玩家影响**:DOS 开场 splash 看完/跳过后,画面不淡黑而是硬切进主菜单,缺原版的过渡淡出。

<details><summary>C 源证据 / 复核</summary>

main.c:432 (while break) → main.c:446-453 (free+music) → main.c:455 `PAL_FadeOut(1)`；palette.c:163 `time=SDL_GetTicks()+iDelay*10*60`(=600ms)、palette.c:170-186 渐黑循环；main.c:546→551 PAL_SplashScreen 后接 PAL_GameMain；game.c:48 PAL_OpeningMenu；uigame.c:119 PAL_DrawOpeningMenuBackground(屏仍黑)→ uigame.c:120 PAL_FadeIn(0,FALSE,1) 菜单淡入。对照 TS：splash-fallback.ts:259-261 满亮帧+sleep(500)无 fadeout；bootstrap.ts:1611-1619 then 里无 fade、未设 paletteFadeState；present.ts:156-162 + draw-opening-menu.ts:53-71 满色直绘无淡入；基建可用证据 ending-player.ts:76/90 + bootstrap.ts:1274-1316。

核对属实，且实际缺失比描述更多（缺 fadeout + 缺 OpeningMenu 的 fade-in 两半）。

C 真值流程：
- main.c:432 `PAL_SplashScreen` 的 `while(TRUE)` 在按键时 `break`；main.c:446-453 释放 surface + 非CD时放标题乐；main.c:455 无条件 `PAL_FadeOut(1)`。
- palette.c:122-190 `PAL_FadeOut(iDelay=1)`：`time = SDL_GetTicks() + 1*10*60`（=+600ms），while 循环 `j=(time-now)/iDelay/10`，rgb `*j>>6` 渐变到 j<0 break，即 ~600ms 当前 palette 渐黑。
- main.c:546 `PAL_SplashScreen()` 返回 → main.c:551 `PAL_GameMain()` → game.c:48 `PAL_OpeningMenu()`。
- uigame.c:119 `PAL_DrawOpeningMenuBackground()`（uigame.c:42-80：把 FBP chunk blit 到 gpScreen 后台缓冲，此时屏幕仍黑）→ uigame.c:120 `PAL_FadeIn(0, FALSE, 1)` 把菜单从黑 ~600ms 淡入。
- 故原版过渡 = 满亮 splash → 淡黑 600ms → 菜单从黑淡入 600ms。

TS 现状：
- splash-fallback.ts:259-261 跳过路径渲染 100% palette 帧 → sleep(500) → break，结束在满亮帧，无 fadeout；非跳过 while 循环退出也无 fadeout。
- bootstrap.ts:1611-1619 `showTrademarkAndSplash().then()` 只做 `input.clearPressed()` + `gs.menuStack=[opening]` + `gs.mode='menu'`，既无 fadeOut，也未设 `paletteFadeState`/`fadeState`。
- present.ts:156-162 仅在有 `paletteFadeState` 时 ramp 色表；draw-opening-menu.ts:53-71 用满色 blit 背景+文字。故 OpeningMenu 既无淡黑也无淡入，首帧即满亮硬切。
- 排除误报：fade 基建确实存在（ending-player.ts:76 `fadeOutBlocking`/:90 `fadeInBlocking`，已在 bootstrap.ts:1274-1316 结局编排里用），所以不是"等价实现在别处"——是这段过渡根本没接 fade。行号/函数均核对无误，无宏展开等价之说（PAL_FadeOut 实测 600ms 渐黑）。

唯一与描述出入：claim 只点了缺 fadeout，但实测玩家感知到的是整段 ~1.2s "淡黑→淡入" 过渡全失（满亮 splash 直接 pop 成满亮菜单）。核心主张（无 fadeout、硬切进主菜单）成立。

</details>


### ✅ L43 · 🟡 Trademark fallback 淡出时长 1000ms,原版 PAL_FadeOut(1)=600ms

- **子系统**:过场·整屏动画与结局　**类别**:timing
- **TS 位置**:`packages/game/src/shell/trademark-fallback.ts:48`
- **C 依据**:`reference/sdlpal/palette.c:163`
- **玩家可感知**:是

**差异**:sdlpal `PAL_FadeOut(iDelay)` 总时长 = `iDelay*10*60` ms(palette.c:163 `time = SDL_GetTicks()+iDelay*10*60`),故 `PAL_FadeOut(1)`=600ms。`PAL_TrademarkScreen` DOS 路径末尾正是 `PAL_FadeOut(1)`(main.c:202)。TS `playTrademarkFallback` 的 `fadeOutMs` 默认值是 1000(trademark-fallback.ts:48 `/** … 默认 1000ms */` + line 108 `options.fadeOutMs ?? 1000`),且 bootstrap.ts:1550-1554 调用时未覆盖,实际淡出 1000ms。注:同函数 `delayBeforeFadeMs` 默认 1000ms 对应 `UTIL_Delay(1000)` 是对的,仅 fadeOut 时长偏长。

**玩家影响**:DOS 商标动画(RNG chunk 6)播完后的淡黑比原版慢约 400ms,可感知地拖长。

<details><summary>C 源证据 / 复核</summary>

reference/sdlpal/palette.c:163 (time = SDL_GetTicks() + iDelay*10*60,iDelay=1→600ms);palette.c:170-173 (j=(time-now)/iDelay/10,j<0 break);palette.c:185 (UTIL_Delay(10) 每步);reference/sdlpal/main.c:200-202 (DOS Trademark 路径:PAL_RNGPlay(6,0,-1,25) + UTIL_Delay(1000) + PAL_FadeOut(1));reference/sdlpal/util.c:280-293 (UTIL_Delay 接收 ms)。TS:trademark-fallback.ts:48/108 (fadeOutMs ?? 1000) + bootstrap.ts:1550-1554 (调用未覆盖)。

确认无误。淡出总时长 1000ms vs 真值 600ms,偏长 ~400ms(约 67%)。落在生产 DOS 开场链路(bootstrap playDosOpening 无覆盖默认值)。代码 JSDoc 自己也把真值写错成 "约 1000ms"。严重度维持 low:这是一次性开场引导动画的纯视觉淡黑过渡,玩家通常只见一次且可跳过;~400ms 差异在并排对比下可感知(淡到全黑的过渡明显拖慢),但单独游玩时不影响任何玩法或可读性。

</details>


### ✅ L44 · 🟡 Splash 跳过时未先把标题位图补到完整高度再淡完,标题停在半长状态

- **子系统**:过场·整屏动画与结局　**类别**:pixel
- **TS 位置**:`packages/game/src/shell/splash-fallback.ts:249-262`
- **C 依据**:`reference/sdlpal/main.c:400-405`
- **玩家可感知**:是

**差异**:sdlpal splash 检测到按键后(main.c:395),先把标题 RLE 高度强制写满 `lpBitmapTitle[2]=iTitleHeight&0xFF; [3]=iTitleHeight>>8` 并 `PAL_RLEBlitToSurface(…,PAL_XY(255,10))` + UpdateScreen(main.c:400-405),即跳过瞬间立刻显示完整标题,然后再快进补完 palette 渐变。TS `playSplashFallback` 跳过分支(splash-fallback.ts:249-262)只对当前 framebuffer 反复 `renderFrame`(仅缩放 palette),不重绘内容、不把 `titleVisibleHeight` 补到 `titleHeight`,故若提前跳过,标题会停留在按键当帧的半长高度直到淡入完成。

**玩家影响**:提前跳过 DOS splash 时,标题图(仙剑奇侠传字样)可能只显示了一截高度而非完整,与原版『跳过即显示完整标题』不同;看完整段才跳则无差异。

<details><summary>C 源证据 / 复核</summary>

reference/sdlpal/main.c:273-275(iTitleHeight 捕获 + 清零);main.c:378-387(每帧 RLE 高度 +1 渐显);main.c:395-405(按键后强制满高 lpBitmapTitle[2]=iTitleHeight&0xFF;[3]=iTitleHeight>>8 + PAL_RLEBlitToSurface PAL_XY(255,10) + VIDEO_UpdateScreen);main.c:412-425(快进 fade 仅重设 palette,不重绘)。对照 TS splash-fallback.ts:249-262 跳过分支只 renderFrame/flushToCanvas(present.ts:606-613)不重绘标题、不补 titleVisibleHeight。

见上。差异确凿:TS 跳过分支未把标题补满高再淡,与 C(main.c:400-405 先满高重绘)相悖,标题冻在 partial 高度。

</details>


### ✅ L45 · 🟡 结局女孩动画帧用循环计数 i%4,原版用墙钟时间 (SDL_GetTicks()/50)%4

- **子系统**:过场·整屏动画与结局　**类别**:timing
- **TS 位置**:`packages/game/src/shell/ending-player.ts:170`
- **C 依据**:`reference/sdlpal/ending.c:368`
- **玩家可感知**:否

**差异**:sdlpal 结局女孩帧取 `PAL_SpriteGetFrame(bufGirl, (SDL_GetTicks()/50)%4)`(ending.c:368)——用墙钟时间驱动 4 帧 walk 循环;而同函数里妖兽 y(`-400+i`/`-200+i`,ending.c:357-358)与 yPosGirl(`i&1`,ending.c:362)都用循环计数 i。TS `playEndingAnimation` 女孩帧用 `o.girlFrames[i % o.girlFrames.length]`(ending-player.ts:170),改成循环计数。理论上每帧 `UTIL_Delay(50)`≈50ms 时两者近似,但 rAF/setTimeout 抖动或掉帧时,墙钟版与循环计数版会逐渐错相,导致女孩步频与原版不同步。

**玩家影响**:结局女孩走路动画帧节奏与原版可能轻微不同步(掉帧/慢机器上更明显);正常满帧时几乎无差。

<details><summary>C 源证据 / 复核</summary>

ending.c:368(女孩帧=(SDL_GetTicks()/50)%4)、:331/:383(for i<400 每轮 UTIL_Delay(50))、:357-358/:362(妖兽 y/女孩 y 用 i);ending-player.ts:170(girlFrames[i%len])、:174(sleep(frameDelayMs) 默认 50ms)、:163-164/:168(与 C 一致用 i);grep 确认 TS 女孩帧不用任何墙钟时间。

【补复核】confirmed:C 用墙钟 (SDL_GetTicks()/50)%4 选女孩走路帧，TS 用循环计数 i%4。但满帧下两者周期与步进一致——C 每轮 UTIL_Delay(50) 使 SDL_GetTicks()/50 每帧约 +1，等价 (i+const)%4，仅差一个由起始时钟决定的常量相位(本就 run-to-run 非确定)。真正分歧只在掉帧/慢机:C 把女孩腿部步频锚定真实时间，TS 随帧率变慢;背景滚动/妖兽下降/女孩 y 在 C 与 TS 都用循环计数 i。原描述“逐渐错相”不准，满帧无相对漂移，实际几乎不可感知。

</details>


### ✅ L46 · 🟡 SFX 播放缺少 C 的 lastSFX 同号去重(同一声效可重叠叠播)

- **子系统**:音频·BGM/SFX/CD 触发　**类别**:correctness
- **TS 位置**:`packages/game/src/shell/audio.ts:186-209,214-217`
- **C 依据**:`sound.c:769-772`
- **玩家可感知**:是

**差异**:C 的 SOUND_Play 开头有去重门控:`if (player->lastSFX == iSoundNum) return FALSE; player->lastSFX = iSoundNum;`(sound.c:769-772),且 lastSFX 在该声效播完(缓冲被 SOUND_FillBuffer 消费完)时复位为 0(sound.c:930)。语义=同一个 SFX 编号在上一份还没播完之前不能被再次触发,从而抑制了同号声效在极短间隔内的重叠/叠音。TS 的 play()(audio.ts:186-194)每次都 createBufferSource 立即播,playSfx/playSound 与 sync 的 `for (const id of pendingSounds) playSfx(id)`(audio.ts:214-217)都没有任何 lastSFX 等价去重。结果:当 core 在同一帧把同一个 soundId 连续 push 进 pendingSounds(opcode 0x47 连发、或战斗结算多单位同声),或在上一份仍在播时再次触发同号,TS 会叠播两份(更响/回声感),C 只播一份。注:TS 已在攻击时间线里把双击的 attackSound/weaponSound 错帧分散来规避最尖锐的重叠(attack.ts:170-172/244-246 的注释),但那是逐调用点的局部 workaround,通用的 drain/playSound 路径仍无此机制。

**玩家影响**:去重的真实触发窗口很窄——PAL 的 SFX 短(~0.1-0.5s),C 多数重触发点被 PAL_BattleDelay 隔开(那时 lastSFX 已复位、C 其实也两份都播);唯一同瞬同号碰撞是敌 AoE 同次循环连杀多名队员的死亡音,而阵亡音逐角色不同、同号罕见。能被玩家听出叠音的场景很窄。

<details><summary>C 源证据 / 复核</summary>

sound.c:769-772(lastSFX 同号 return FALSE + 赋值);sound.c:930(缓冲消费完 lastSFX=0,sound.c:925-931 align 判定);sound.c:61-70(SOUNDPLAYER.lastSFX 字段);audio.c:518-544(AUDIO_PlaySound 无条件 SOUND_Play,CD/MIDI 仅 AUDIO_PlayMusic);fight.c:2061-2071(attackSound/criticalSound 起手)+2097/2118 PAL_BattleDelay+2124(weaponSound,与起手不同 id)+3807-3810(双击第二击同样隔 delay→第一份已播完);fight.c:2495-2502(magic wSound 仅 i==wFireDelay 播一次);fight.c:4810-4817(敌 AoE 同循环连调 rgwDeathSound[w] 无延迟，唯一真实同瞬同号点);battle.h:28-29(BATTLE_FPS=25)。TS:audio.ts:186-194/196-209/214-217(无去重),battle-system.ts:734-748(逐队员 emit playSound),bootstrap.ts:170-175(playSound 直发 playSfx),attack.ts:170-172/244-246(双击错帧分散 workaround)。

机制差异属实且定位准确。C 侧:SOUND_Play 开头 `if (player->lastSFX == iSoundNum) return FALSE; player->lastSFX = iSoundNum;`(sound.c:769-772),lastSFX 仅在该声效缓冲被 SOUND_FillBuffer 完全消费时复位 0(sound.c:930)。AUDIO_PlaySound(audio.c:518-544)无条件走 pSoundPlayer->Play=SOUND_Play(CD/MIDI 分支只在 AUDIO_PlayMusic 里,与 SFX 无关),故 lastSFX 去重是引擎级、对所有 SFX 生效——claim 读码正确。TS 侧:audio.ts:186-194 play() 每次 createBufferSource().start();playSfx(196-209)与 sync drain `for (const id of pendingSounds) playSfx(id)`(214-217)均无任何 lastSFX 等价物;全仓 grep 确认 SFX 路径无去重(去重只出现在毒/事件等无关处)。

但 claim 的"玩家影响"被高估,关键在去重的真实触发窗口:lastSFX 只压制"同一 id 在上一份仍在播时再次触发"。PAL 的 SFX 短(~0.1-0.5s),而 C 多数重触发点被 PAL_BattleDelay 隔开(BATTLE_FPS=25→BATTLE_FRAME_TIME=40ms,且常多帧):双击两次 attackSound 间隔≥3 帧+整段挥砍(fight.c:2065→2097/2118→3807 第二击),第一份早已播完、lastSFX 已复位,**C 实际两份都播**(并未去重);法术 wSound 每次特效只在 `if (i == wFireDelay)` 播一次(fight.c:2499),无紧凑同号循环。故 claim 列举的"同帧 0x47 连发 / 连续同声"在 C 里多半也不命中去重。真正的同瞬同号碰撞是 fight.c:4810-4817 敌 AoE 同次循环连杀多名队员、无延迟连调 AUDIO_PlaySound(rgwDeathSound[w]);TS 的 emitPlayerCasualtySounds(battle-system.ts:734-748)逐队员 emit playSound 同 tick drain,若两死者 deathSound 同号则 C 播一份/TS 叠两份——但阵亡/濒死音是逐角色不同嗓音,同号碰撞罕见。另:TS 团队已对最尖锐的双击同帧重叠(attack.ts:170-172/244-246,user 2026-06-05 报)做错帧分散,且该分散结果是"两份都响(错开)",恰与 C 该处真实行为(两份都播)一致,而非 C 的去重语义。综合:机制缺失真实、定位无误(confirmed),但能被玩家听出的场景窄;low 合理且偏 low 下沿。

</details>


### ✅ L47 · 🟡 音乐开关重开 / 注入后端时硬编码 loop=true,会让非循环曲被错误循环

- **子系统**:音频·BGM/SFX/CD 触发　**类别**:correctness
- **TS 位置**:`packages/game/src/shell/audio.ts:244,249`
- **C 依据**:`battle.c:1032`
- **玩家可感知**:否

**差异**:shell 每帧用有效 track 计算 loop:victory 战胜曲(battleVictoryTrack→2/3)与脚本设的非循环场景曲(opcode 0x43 op1==1 → gs.musicLoop=false)都应是 fLoop=FALSE(对照 C battle.c:1032 `AUDIO_PlayMusic(fIsBoss?2:3, FALSE, 0)`、script.c:1647 `AUDIO_PlayMusic(op0, op1!=1, ...)`)。但 AudioManager 在两处补播时把 loop 写死成 true:setMusicEnabled(true) 的 `else if (curMusicTrack > 0) musicBackend?.play(curMusicTrack, true)`(audio.ts:244)与 setMusicBackend 的 `backend.play(curMusicTrack, true)`(audio.ts:249)。若玩家在非循环场景曲(0x43 op1==1,全部 155 个 0x43 中仅 2 个)播放期间,从系统菜单把『音乐』关掉再打开(off→on 触发重播),该曲会被当作循环曲反复播放。注:战胜曲 track 2/3 虽也非循环,但它只在 battle 模式播、音乐开关只在大世界 menu 模式可达,C 与 TS 都到不了这个组合,故战胜曲实际不受影响。curMusicTrack 也只存 track 不存 loop,sync 仅比较 track(audio.ts:219),无法在补播时还原真实 loop 标志。

**玩家影响**:仅在那 2 个一次性场景曲播放期间切换音乐开关,才会听到本应只响一遍的曲子被循环播放(且相对 sdlpal 的 RIX 默认构建才算偏离);战胜小调场景实际不可达。极低频。

<details><summary>C 源证据 / 复核</summary>

battle.c:1032 `AUDIO_PlayMusic(g_Battle.fIsBoss?2:3, FALSE, 0)`(胜利曲非循环，且不写 wNumMusic——battle.c 仅 1849 写 wNumMusic 用于战后恢复); script.c:1646-1647 opcode 0x43 `wNumMusic=op0; AUDIO_PlayMusic(op0, op1!=1, ...)`(op1==1→FALSE); uigame.c:618-621 音乐开关 `AUDIO_EnableMusic(PAL_SwitchMenu(...))` 后仅在 `eMIDISynth==SYNTH_NATIVE && eMusicType==MUSIC_MIDI` 时 `AUDIO_PlayMusic(MusicEnabled?wNumMusic:0, MusicEnabled(), 0)`——重播的是 wNumMusic 且 fLoop=TRUE，且非默认构建不触发; audio.c:639-644 `AUDIO_EnableMusic` 只设 fMusicEnabled 标志; audio.c:104-126 fill 回调按标志静音/恢复，禁用时 pMusPlayer 位置冻结不重启; palcfg.c:301-302 默认 `eMusicType=MUSIC_RIX, eMIDISynthType=SYNTH_NATIVE`(默认 RIX→开关重播分支不触发)

机制属实但声称的主场景不可达，影响被夸大。

【机制核对——属实】audio.ts:244 (`setMusicEnabled(true)` 分支 `musicBackend?.play(curMusicTrack, true)`) 与 audio.ts:249 (`setMusicBackend` 分支 `backend.play(curMusicTrack, true)`) 确实硬编码 loop=true；curMusicTrack(audio.ts:158)只存 track 不存 loop，sync 仅比较 track(audio.ts:219)。bootstrap.ts:163 每帧 sync 的 loop 是正确算出的(victoryTrack>0?false:inBattle?true:gs.musicLoop)，证明补播路径确实丢弃了真实 loop。生产后端 SpessaSynth 把 loop 映射为 `seq.loopCount = loop ? Infinity : 0`(audio-midi.ts:55)，故强制 loop=true 确会造成无限循环。C 真值核对无误：battle.c:1032 `AUDIO_PlayMusic(g_Battle.fIsBoss?2:3, FALSE, 0)`；script.c:1647 `AUDIO_PlayMusic(op0, op1!=1, ...)`(op1==1→FALSE)；event-system.ts:3149 `gs.musicLoop=(operands[1]??0)!==1` 忠实移植。

【主场景不可达——声称夸大】胜利曲 track 2/3 仅在 phase==='won' 时放，此时 gs.mode==='battle'(battle-system.ts:2689 finishBattleWon 在结算屏放完后才把 mode 翻 'explore')。顶层模式机 mode.ts:50-65 互斥分发：'battle' 模式走 tickBattle，绝不走 tickMenu。音乐开关属大世界系统菜单(menu-driver.ts:433 `kind:'system'`、:464 `gs.fMusicEnabled=on`)，只在 'menu' 模式可达(从 explore 打开)。sdlpal 同样如此——battle.c/uibattle.c 内 grep 无 PAL_SwitchMenu/AUDIO_EnableMusic，音乐开关仅在大世界 uigame.c:618。故"战胜小调期间从系统菜单切音乐"在 TS 与 C 都做不到，该子场景是伪命题。

【可达但极窄的真子场景】0x43 op1==1 非循环场景曲：提取脚本 155 个 0x43 中仅 2 个 op1==1(track 61、1)。这类曲在 explore 放时系统菜单可达，off→on 会经 audio.ts:244 以 loop=true 补播，使本应只放一遍的曲循环，与 C 不符。

【对 C 基线的关键 nuance】sdlpal 默认 eMusicType=MUSIC_RIX(palcfg.c:301)，非 MIDI。开关重播分支 uigame.c:619-621 受 `eMusicType==MUSIC_MIDI && eMIDISynth==SYNTH_NATIVE` 门控，默认 RIX 构建根本不重播——AUDIO_EnableMusic 只翻标志(audio.c:643)，播放器恢复冻结位置且保留原 loop。即便 MIDI-native 构建会重播，它重播的是 wNumMusic 且 `fLoop=AUDIO_MusicEnabled()=TRUE`，所以那种构建下 C 自己也会把非循环场景曲在开关时循环掉。故 TS 偏离仅相对 RIX 默认成立，且只针对罕见 op1==1 场景曲。

综上：硬编码 loop=true 的代码差异客观存在(confirmed)，但触发面被大幅高估——头号的胜利小调场景不可达，唯一真实窗口是 155 中 2 个非循环场景曲 + 玩家恰在其播放期开关音乐，且相对 sdlpal RIX 默认才算偏离。

</details>


---

## ❌ 复核否决的误报（6）

> 对抗复核阶段判定「不成立」的候选,留档以免日后重复怀疑。每条附原始声称与否决依据。

### FP1 · 战斗·法术伤害与治疗 — 玩家进攻法术 inline 伤害对敌方防御做了 C 没有的 (SHORT) 转换与负值钳零

- **TS**:`packages/game/src/core/battle/magic-damage.ts:97-100`　**C**:`reference/sdlpal/fight.c:4285`　**原声称严重度**:low

**否决依据**:代码读得对，但结论的分叉机制与玩家影响都错了，且方向相反——在所有真实数据上两者结果完全一致。

【C 源核对（读对的部分）】
- 玩家 inline 进攻法术：fight.c:3600 `WORD str, def`（def 确为 WORD）；fight.c:4285-4286 / 4305-4306 `def = g_Battle.rgEnemy[i].e.wDefense; def += (wLevel+6)*4;` —— 无 (SHORT) 强转、无 if(def<0)。属实。
- SimulateMagic：fight.c:5326 `int def`；fight.c:5357-5363 / 5381-5387 `def=(SHORT)wDefense; def+=(wLevel+6)*4; if(def<0)def=0`。属实。
- TS magic-damage.ts:97-100 用 `asShort(defense)+(level+6)*4; if(<0)=0` 单核心喂两条路径。属实。

【声称错在哪 —— C 算术分析有误】
声称说 raw wDefense>=0x8000 时 “C 把它当大正数→base=0”。但它漏了 fight.c:4286/4306 的 `def += (wLevel+6)*4` 是 WORD 运算（def 是 WORD）。真实敌人防御 raw 无符号落在 65504–65535（=signed -32..-1），加上小正项后**溢出 0xFFFF 回绕成小正数**（如 65530+24=65554 &0xFFFF=18）。于是 C 的有效 wDefense 反而是小正数→base 几乎满，和 TS 把负值钳 0 后的满 base **一致**。

【数值验证（data/extracted/data/enemies.json，154 敌）】
- defense 字段 TS 按 s16 抽取（enemies.ts:120，刻意决策见 enemies.ts:46-48），range=[-32,99]；其中 14 个为负（史莱姆-6/蜜蜂-7/半截僵尸-32/盖罗娇1-30/红史莱姆-6…），即 raw 16-bit 高位置位的“>=0x8000”敌人是**常见早期杂兵，正常游戏天天打**——直接推翻声称的“实战几乎不可触发/越界异常值”。
- 对这 14 个负防御敌人，按其真实 level、magStr 扫 1..1500，C 路径 vs TS 路径 base 伤害分叉数 = 0/14（逐档完全相同，如史莱姆 lvl0：C=TS=42；半截僵尸 lvl10：37=37；盖罗娇1 lvl40：2=2）。
- 分叉仅出现在 signed 防御≈≤-25 且 level 低（WORD 加不回绕）的组合，例如 def=-32 在虚构 level0 时 C=0 / TS=50——但真实里 def≈-32 的敌人都在 lvl10/40，会回绕，故无真实 (defense,level) 落入分叉区。

结论：声称描述的源码差异客观存在，但 C 的 WORD 溢出回绕恰好与 TS 的钳 0 在所有真实数据上等价，分叉行为对全部真实敌人**完全不触发**；连声称的“TS 偏高”方向都从未发生。故对玩家可感知层面是 false_positive。无测试断言该分叉（magic-damage/formulas 无测试文件）。

**C 源证据**:fight.c:3600 (WORD str,def); fight.c:4285-4286 (玩家 inline: def=e.wDefense 无(SHORT)、def+=(wLevel+6)*4 WORD 运算、无 if(def<0)); fight.c:4305-4306 (单体同上); fight.c:5326 (int def); fight.c:5357-5363/5381-5387 (SimulateMagic: (SHORT)wDefense + if(def<0)=0); fight.c:131-170 (PAL_CalcBaseDamage: WORD wDefense, atk>def 段满伤); fight.c:174-249 (PAL_CalcMagicDamage: WORD wDefense 形参); global.h:282 (wDefense WORD). TS: magic-damage.ts:97-100, formulas.ts:36-44, enemies.ts:46-48/120 (defense s16 刻意决策). 数据: data/extracted/data/enemies.json defense∈[-32,99]，14 个负值，全部真实 (defense,level) 下 C 路径=TS 路径 (magStr 1..1500 扫描 0 分叉)。

### FP2 · 战斗·脚本 opcode 与敌人 AI — 0x9F 敌人变身覆盖了 AI 脚本字段(C 保留原脚本)→ 变身怪只变身一次后失去 AI

- **TS**:`packages/game/src/core/battle/battle-opcodes.ts:1141-1143`　**C**:`reference/sdlpal/script.c:2965-2969`　**原声称严重度**:high

**否决依据**:声称的核心机制与玩家影响均被推翻，仅残留一个与声称无关的次要副作用。

【代码层确有差异，但声称的后果错了】
- C script.c:2962-2970:0x9F 只写 wObjectID、e(敌 stats)、e.wHealth、wCurrentFrame，确实**不碰** wScriptOnTurnStart/OnReady/OnBattleEnd（battle.h:89-91 这三个字段是 BATTLEENEMY 结构体里的缓存字段，战斗初始化时从 OBJECT 表拷入；0x9E 召唤 script.c:2920-2922 与 0x9C 分裂 2824-2826 都**显式拷贝**脚本，唯独 0x9F 不拷——故省略是有意的）。
- TS battle-opcodes.ts:1141-1143 确实把三个脚本字段覆盖成目标对象 eo 的值。这一处代码差异属实。

【但 scriptOnReady / scriptOnTurnStart 的覆盖被回写吃掉了——AI 根本没丢】
TS 跑敌 AI 的唯一两处调用 battle-system.ts:2169(`enemy.scriptOnReady = runScript({ip: enemy.scriptOnReady})`）和 1852(turnStart 同款）都是「字段 = runScript(返回值)」回写式。JS 先求值右侧 runScript（其内部 0x9F 把 self.scriptOnReady 写成 0），再把**返回值**赋回，覆盖掉那个 0。我用真实抽取数据（obj402 凤梨小妖 scriptOnReady=42599，强制 0x06 落入变身分支）实测跑 runScript：readySeq=[42599,42600,42604,42606,42608,42610,42610...]，e.id 5→73(变成牡丹精)，且 0x67 设法术照跑——与 C 完全一致地走完字节码并停在 42610。AI 没失效。

【声称「C 持续切换形态/每回合可继续变身」是错的】
脚本 42599 起自带 0x01(advance)行头标记：42599→42600(0x06 概率门)→42601(0x9F 变 470)→42602(0x67)→42603(0x01)→…→42610(0x00 STOP)。这串 advance 标记会把 entry 指针**自己**走过变身处并停住——C 同样只变身一次成牡丹精就停（C 也从不回头重 roll，因为 0x06 的 jump 目标是 0=脚本终止，非循环）。所以「原版会持续切换形态」不成立，两边都是变一次→停。

【唯一真差异：scriptOnBattleEnd 41008→0，与声称无关】
战后脚本 runBattleWonPostScripts(battle-system.ts:2751-2754，注释 2744 明示「返回值不回写」；对应 C battle.c:1336 返回值丢弃）跑的是**缓存字段**。变身后 C 保留凤梨小妖的 wScriptOnBattleEnd=41008（giveItem 104「捡到一颗鼠儿果」），TS 被 0x9F 覆盖成 470 的 0。故击败已变身的凤梨小妖：原版掉鼠儿果，TS 不掉。这是真 bug，但只是单个常规杂兵的战后掉落物丢失，且声称把它误描述成「AI 失效/不再变身/不再按脚本攻击法术/行为完全不同」——那些都没发生。

结论:声称的「变身一次后失去 AI、不再变换形态、不再设法术」是 false_positive（变身、设法术、停形态时机均与 C 一致）。残留的 scriptOnBattleEnd 覆盖是一个被声称错误归因的低危副作用，不足以支撑 high。

**C 源证据**:script.c:2962-2970(0x9F 只写 wObjectID/e/e.wHealth/wCurrentFrame，不碰三个脚本字段);battle.h:89-91(wScriptOnTurnStart/OnBattleEnd/OnReady 是 BATTLEENEMY 缓存字段);fight.c:1186-1187 & 1226-1227 & 1719-1720(敌 AI 走 wScriptOnX = PAL_RunTriggerScript(wScriptOnX,i) 回写式——与 TS battle-system.ts:1852/2169 同款，故覆盖被回写吃掉);script.c:2920-2922 & 2824-2826(0x9E/0x9C 显式拷脚本，反衬 0x9F 省略是有意);battle.c:1334-1337(战后脚本 PAL_RunTriggerScript(wScriptOnBattleEnd,i) 返回值丢弃、用缓存字段——这是唯一真差异处:C 保留 41008,TS 被覆盖成 0)。实测:对真实数据跑 TS runScript,readySeq=[42599,42600,42604,42606,42608,42610...],e.id 5→73 牡丹精,与 C 字节码 walk 一致。

### FP3 · 战斗·主循环与回合流程 — 战斗菜单按 Menu 回退上一队员时只跳过死亡者,未跳过睡眠/麻痹/混乱者

- **TS**:`packages/game/src/core/battle/battle-system.ts:1565-1573`　**C**:`reference/sdlpal/uibattle.c:1266-1270`　**原声称严重度**:medium

**否决依据**:见 reasoning 字段（已含完整 C 源证据与实测）。要点：源码差异属实，但声称的「玩家可给失能角色手动下令」被实测证伪——下一 tick 的 autoFill+advance 先于输入派发，把选择弹回真正待选队员，任何 Confirm/指令都作用于后者而非失能者；失能者 pending 始终是自动占位。残留仅为一帧错误高亮 + 回退弹回出发点的观感瑕疵，玩家可感知但无行为后果，故 false_positive、severity 降 low。

**C 源证据**:reference/sdlpal/uibattle.c:1266-1270 回退 do-while 继续条件=HP==0||Confused>0||Sleep>0||Paralyzed>0（带 1230/1266 的 wCurPlayerIndex>0 守卫）；reference/sdlpal/uibattle.c:1235-1237 起 --wCurPlayerIndex 逐个回退；reference/sdlpal/fight.c:1398-1404 前向选择同样 continue 跳过失能者，仅对未失能 kFighterWait 者调 PAL_BattleUIPlayerReady(1414)。TS：battle-system.ts:582-585 alivePlayerIdxs 仅 role.hp>0；battle-system.ts:1565-1573 revert 取 alivePlayerIdxs[pos-1]；battle-system.ts:598-601 autoFill+ensure 先于 622 dispatchSelectInput；battle-system.ts:1518-1526 autoFillIncapacitatedActions；battle-system.ts:1535-1545 ensureSelectingPendingAlivePlayer→advanceSelectingPlayer。实测（临时单测，已回滚）：回退落 selecting=1（睡眠者），随后 Confirm 派发给 player2（uiState=selectTargetEnemy），player1 pending 仍为自动占位 attack。

### FP4 · 过场·整屏动画与结局 — 结局动画缺首帧从黑 600ms 淡入(fNeedToFadeIn),climax 画面直接满亮弹出

- **TS**:`packages/game/src/shell/ending-player.ts:135-180`　**C**:`reference/sdlpal/ending.c:375-381`　**原声称严重度**:medium

**否决依据**:C 侧描述本身属实，但被指为缺陷的代码路径在生产中玩家不可达，故作为"玩家可感知差异"是误报。

C 真值核对（全部逐字命中）：
- ending.c:438-440 `SDL_FillRect(gpScreen,NULL,0); gpGlobals->wNumPalette=4; gpGlobals->fNeedToFadeIn=TRUE;`，紧接 ending.c:441 `PAL_EndingAnimation();`。
- ending.c:374-381 `PAL_EndingAnimation` 循环内 `VIDEO_UpdateScreen(NULL); if (gpGlobals->fNeedToFadeIn){ PAL_FadeIn(wNumPalette,fNightPalette,1); fNeedToFadeIn=FALSE; ...}`，即首帧(i=0)绘制后阻塞淡入。
- palette.c:232 `PAL_FadeIn(_,_,1)` → `time=now+1*10*60` = 600ms 黑→满 palette 渐亮。
所以"原版结局高潮首帧有 600ms 从黑淡入"成立，TS `playEndingAnimation`(ending-player.ts:153-175)循环从 i=0 即以 `o.palette` 全亮渲染、无淡入也属实；`playDosEnding`(bootstrap.ts:1279→1285)是 `fadeOutBlocking(...,600)` 后直接 `playEndingAnimation`、中间无 `fadeInBlocking`。代码级差异为真。

但玩家不可达，理由三条：
1) 关键误读真值来源：claim 把 fNeedToFadeIn=TRUE 归于 `PAL_EndingScreen`(ending.c:438-440)。该函数是 WIN95 专用；script.c:2988-2996 的 0xA0 quit 仅在 `if (gConfig.fIsWIN95)` 时调它，纯 DOS 根本不进 `PAL_EndingScreen`。本作数据正是 WIN95 版(结局 RNG chunk 9、110-150/151- 序与 ending.c:425-426 DOS-fallback 完全对应)。WIN95 下该高潮动画走 AVI(4/5/6.avi)，DOS-fallback 仅在 AVI 失败时跑。
2) TS 生产默认 build='win95'(bootstrap.ts:134-138)，0xA0 quit handler(bootstrap.ts:1508-1524)播 4/5/6.mp4 后回标题，根本不调 `playEndingAnimation`/`playDosEnding`——高潮画面在 MP4 里，不是 TS framebuffer 渲染器。
3) `playDosEnding`(唯一用 framebuffer 渲染妖兽/女孩的入口)只挂在 DEV-only dev 面板按钮"▶ 结局 DOS 全片"(dev-panel.ts:1532)；`setupDevPanel` 在 `!import.meta.env.DEV` 时第一行 return(dev-panel.ts:392)，生产被 tree-shake 消除。而 0x96 EndingAnimation handler(bootstrap.ts:1188、event-system.ts:1999)虽存在，但实测 data/extracted/events/all.json 全部 43503 条命令中 opcode 0x96(150) 出现 0 次(0x90-0xA3 直方图已列，无 150)，DOS 脚本从不触发它。

故：真实玩家(WIN95 MP4 结局)看不到任何 framebuffer 高潮渲染，更谈不上"满亮弹出 vs 600ms 渐显"的差别；只有开发者点 dev 面板"结局 DOS 全片"才会看到这个无淡入的 climax。属 dev-only 表现差异，非玩家可感知缺陷。若团队日后让 DOS build 真用 `playDosEnding` 当正式结局，则应在 ending-player.ts 首帧补一段等价 `fadeInBlocking(...,600)`(对齐 fNeedToFadeIn)——届时再升级处理。

**C 源证据**:ending.c:438-440 (SDL_FillRect 0 + wNumPalette=4 + fNeedToFadeIn=TRUE) → ending.c:441 PAL_EndingAnimation(); ending.c:374-381 (首帧 VIDEO_UpdateScreen 后 if fNeedToFadeIn → PAL_FadeIn(wNumPalette,fNight,1)); palette.c:232 (PAL_FadeIn iDelay=1 → time=now+600ms 黑→满); script.c:2988-2993 (0xA0 quit 仅 fIsWIN95 才调 PAL_EndingScreen，纯 DOS 不调); script.c:2693-2699 (0x96 仅 !fIsWIN95 调 PAL_EndingAnimation); script.c:1780-1782 (0x50 FadeOut 设 fNeedToFadeIn=TRUE)。TS: ending-player.ts:153-175 循环 i=0 即全亮无淡入; bootstrap.ts:1279→1285 fadeOut(600) 后直跑无 fadeIn; bootstrap.ts:134-138 默认 win95; bootstrap.ts:1508-1512 win95 结局播 mp4; dev-panel.ts:392 setupDevPanel 非 DEV 即 return; dev-panel.ts:1532 playDosEnding 仅 dev 按钮; all.json 43503 命令中 opcode 150 出现 0 次。

### FP5 · 战斗·结算与成长 — 战后清状态/清毒/清临时装备效果只遍历当前队伍,而非全部 6 个角色

- **TS**:`packages/game/src/core/battle/battle-system.ts:2670-2673 (finalizeBattleCleanup)`　**C**:`reference/sdlpal/battle.c:1825-1830`　**原声称严重度**:low

**否决依据**:声称的核心场景(中毒队员换出队伍后，原版战后顺带清其毒、TS 不清)在 C 真值里不成立，因为 C 的毒根本不是按 role 存的、也无法挂在离队角色上：

1) 毒在 C 里按"队伍槽位"索引，非 roleId。global.h:547 `POISONSTATUS rgPoisonStatus[MAX_POISONS][MAX_PLAYABLE_PLAYER_ROLES]`；global.c:1591-1606 `PAL_CurePoisonByLevel` 先 `for(index=0;index<=wMaxPartyMemberIndex;index++) if(rgParty[index].wPlayerRole==wPlayerRole) break;` 再用 `rgPoisonStatus[i][index]`——index 是队伍槽，不是 role。

2) C 对离队角色 cure 直接早返回什么都不做：global.c:1599-1602 `if (index > wMaxPartyMemberIndex) return;`。所以 battle.c:1826-1830 的 `for(w=0;w<MAX_PLAYER_ROLES;w++) PAL_CurePoisonByLevel(w,3)`，对不在队伍的 w 全部命中早返回 → 等价于只清在场队员。这与 TS battle-system.ts:2670 `for (const roleId of gs.partyMembers)` 行为一致。

3) C 连给离队角色"上毒"都做不到：global.c:1483-1494 `PAL_AddPoisonForPlayer` 同样的早返回守卫。故"离队角色带毒"这一前提在 C 端不可能存在。

结论：声称的"差在不在当前队伍的角色持久毒不被清理"对 poison 而言是误读 C——C 既不为离队角色存毒也不清，TS 的 partyMembers-only 循环对 poison 与 C 等价。

剩余两项(ClearAllPlayerStatus 遍历全 6 role ≤999 状态 global.c:2331；RemoveEquipmentEffect 按 roleId 遍历全 6 role global.c:1372-1401)确为 C 遍历全员、TS 仅遍历在场队员的微差，但：Extra 槽是 per-battle 临时 buff 槽(0x17/0x30 写 currentEventObjectId)，离队角色不是战斗参战者不会获得；rgPlayerStatus 的战斗类状态(Confused/Sleep/Bravery 等)挂在离队角色上是惰性的、不渲染、再次入战会被重新 seed/清。且 TS 毒只在战斗内对参战者 tick(battle-system.ts:2545-2560，对照 fight.c:1645-1648)，大世界不 tick，离队角色任何残留都不可感知。

**C 源证据**:battle.c:1825-1830 战后清理(ClearAllPlayerStatus + for w<MAX_PLAYER_ROLES{CurePoisonByLevel(w,3); RemoveEquipmentEffect(w,Extra)});global.h:547 rgPoisonStatus[MAX_POISONS][MAX_PLAYABLE_PLAYER_ROLES](按 MAX_PLAYABLE_PLAYER_ROLES=5 队伍维度，非 role);global.c:1591-1606 CurePoisonByLevel 用 party index 索引 rgPoisonStatus[i][index];global.c:1599-1602 离队角色早返回 return;global.c:1483-1494 AddPoisonForPlayer 同样早返回(无法给离队角色上毒);global.c:2331-2343 ClearAllPlayerStatus 遍历 MAX_PLAYER_ROLES=6 清 rgPlayerStatus≤999;global.c:1372-1401 RemoveEquipmentEffect 按 wPlayerRole 列清 rgEquipmentEffect;palcommon.h:42/45/48 MAX_PLAYERS_IN_PARTY=3 / MAX_PLAYER_ROLES=6 / MAX_PLAYABLE_PLAYER_ROLES=5。TS:battle-system.ts:2670-2673 finalizeBattleCleanup 仅 partyMembers;event-system.ts:4536-4546 curePlayerPoisonByLevel 与 4501-4513 addPoisonForPlayer 均按 ${slot}_${roleId} 存(与 C 的 party-slot 不同模型但自洽);battle-system.ts:2545-2560 毒仅战斗内对参战者 tick。

### FP6 · 渲染·地图瓦片与精灵 — 队员跟随者(成员1/2)走路用了队长的步帧序列 [0,1,0,2],漏了 iStepFrameFollower 反相序列 [0,2,0,1]

- **TS**:`packages/game/src/present/present.ts:331`　**C**:`reference/sdlpal/scene.c:664-673,728`　**原声称严重度**:medium

**否决依据**:差异声称"队员 rgParty[1..wMaxPartyMemberIndex] 应用反相序列 iStepFrameFollower=[0,2,0,1](scene.c:667)",并以 scene.c:728 为 C 依据。但实际核对 C 源,scene.c:728 这行(正是队员循环 for(i=1;i<=wMaxPartyMemberIndex;i++) 内的帧赋值)写的是 `rgParty[i].wFrame = rgTrail[2].wDirection*3 + iStepFrameLeader` —— 用的是 iStepFrameLeader(序列 [0,1,0,2]),与队长 scene.c:684 完全相同,并非 follower 反相序列。声称所引的 scene.c:667 只是 iStepFrameFollower 的"定义"行;该变量的"唯一消费点"是 scene.c:742,在另一个独立循环 for(i=1;i<=nFollower;i++) 里,给的是 rgParty[wMaxPartyMemberIndex+i] —— 即 opcode 0x98 set-follower 的额外同行 NPC(res.c 路径,sprite 直取 MGO chunk),不是普通队员 1/2。

也就是说 C 真值里:普通队员 1/2 与队长"同相"([0,1,0,2]),只有 0x98 额外跟随者才"反相"([0,2,0,1])。差异把变量的定义点(667)误当成消费点,错误地把 follower 反相序列归给了 wMaxPartyMemberIndex 循环。

TS 侧两条路径都与 C 一一对应且正确:present.ts:331-332 的 "// --- followers (partyMembers[1..]) ---" 分支(对应 C 的 rgParty[1..wMaxPartyMemberIndex] 循环)赋 [0,1,0,2],匹配 scene.c:728;present.ts:398 + follower-render.ts:24 的 "0x98 额外跟随者" 分支赋 FOLLOWER_STEP_FRAME=[0,2,0,1],匹配 scene.c:742。两者并未被混淆。present.test.ts:239-265 也回归断言队员路径 walkFrames=3 时取 [0,1,0,2];follower-render.test.ts:44-53 断言 0x98 跟随者取 [0,2,0,1]。

唯一可挑剔之处:present.ts:331 的局部变量名取作 iStepFrameFollower 属命名误导(按其取值与对应的 C 循环应叫 iStepFrameLeader),但赋的值 [0,1,0,2] 完全正确,不产生任何行为差异。差异自身引用的 scene.c:728 反而证伪了它——该行明文是 iStepFrameLeader。故无 bug,玩家不可能感知所谓"队员与队长同手同脚"的差异,因为这本就是原版行为。

**C 源证据**:scene.c:728 (party member i=1..wMaxPartyMemberIndex 的帧赋值) 用 iStepFrameLeader,不是 iStepFrameFollower;scene.c:666-667 仅定义两变量;scene.c:742 是 iStepFrameFollower 的唯一消费点,位于另一个循环 for(i=1;i<=nFollower;i++) 给 rgParty[wMaxPartyMemberIndex+i];scene.c:684 队长同样用 iStepFrameLeader;TS present.ts:331-332 给队员赋 [0,1,0,2];follower-render.ts:24 给 0x98 跟随者赋 [0,2,0,1]。

---

## 审查完整性

- compare 阶段共产出 **70 条候选**,全部完成对抗复核:确认 64 / 否决 6 / 待定 0,**无遗漏**。
- 其中 cutscene「结局女孩动画帧」1 条曾因 workflow 运行时 API 529 复核失败,已单独补复核(判定 confirmed·low,见 L 表)。
- 6 条误报详情已从 workflow transcript(各复核 agent 落盘的 jsonl)重建并留档(见上节)。
- 经第二个模型(GPT)独立二次复核:H1/H2、M1–M5、M6–M15、误报区(含 FP6 专核 scene.c)主体结论均确认成立;并指出 M9/L17/L27/L40 四条的**条目正文与复核论证不一致**(M9 基线应为 WIN95 而非 CLASSIC、L17 触发面更窄且单向、L27 入口 opcode 应为 0x21 而非 0x42、L40 同物品连用其实不偏),已据复核回填正文使二者一致(结论与严重度均不变)。
- 此外自查发现同一模式(条目正文沿用 compare 原始 finding、未回填 verify 阶段对玩家影响/触发面的收窄)另有 10 条:M2、L3、L4、L7、L20、L22、L28、L31、L46、L47,已一并回填正文(均不改变 confirmed 判定与严重度,收窄的只是被原始描述夸大的影响面)。
- 2026-06-07 对除 M5 外 M 级已落地修改做代码审查,并补齐 M2/M8/M11/M12/M15 尾巴:14 条均已完整收口。
