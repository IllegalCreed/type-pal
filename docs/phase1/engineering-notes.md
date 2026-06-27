# Engineering Notes · type-pal(第一阶段)

> 跨会话沉淀的**调试方法论 / 引擎陷阱 / 代码库事实 / 运维**——把"踩过的坑和怎么定位"落成共享知识,供任何协作者(人或 AI)查阅。
> 速查版见 [CLAUDE.md](../../CLAUDE.md) 的「工程经验 / 引擎陷阱速查」节;本文件是其展开。
> **仅适用第一阶段(忠实还原)**;第二阶段 Reforge 不对齐旧引擎,本文件方法论不适用(见 `docs/phase2/READ-FIRST.md`)。
>
> 个人偏好/工作风格类(用中文回复、别反复确认、忠实 vs 修复的口味取舍等)不在此,留在 Claude 的个人 memory。

---

## 1. 调试方法论

### 1.1 复现剧情/演出 bug — 别从头玩
- **`window.__tpgs`**(DEV,bootstrap 注入)= 活 GameState 引用:console 直接读 `eventCursor.ip/waiting`、`dialogBox.phase`、`paletteFadeState`,写 `party.x/y`、`sceneOnEnterOverride`(布防一次性演出,如香兰报信 = override[5]=903)。
- **dev 面板(B 键)场景 tab**:📍 坐标传送(世界像素);跳场景卡片无 partyStart 会把人落在非法点(困水面),先跳再传送。⚠ **dev 跳场景走同步 runEnterScript、跳过对话**——复现 cutscene 必须走真实门触发垫(loadScene → bootstrap loadSceneCommon 异步路径)。
- **`?tp_dump=1`** + `window.__tpDumpBuffer`:逐帧 party/npc/scene JSON。方向键步长:下=(-16,+8) 左=(-16,-8) 右=(+16,+8) 上=(+16,-8)。
- **`window.__tpmidi`**(DEV,audio-midi 注入)= {ctx, synth, getSeq}:查 BGM 音量类问题 `synth.connect(analyser)` tap AnalyserNode 量 RMS;改 `__tpgs.wNumMusic` 走真实管线切曲。参照值:村庄曲 49 ≈ 0.09,战斗曲 26/18 ≈ 0.22-0.27(战斗曲天生响 2-3 倍,非 bug)。
- **战斗动画/施法节奏诊断**:浏览器装探针 wrap `CanvasRenderingContext2D.putImageData`(= 每 present 一次,真实重绘率)+ wrap `requestAnimationFrame`(rAF 率),施法期采样。**present 25fps vs rAF 120fps = 量化拍频(非 CPU);rAF 掉才是 CPU 瓶颈**。dev server 自签证书挡 playwright → `E2E=1 vite --port 58xx` 起 HTTP 旁路。工具面板「系统」tab 有左上角 FPS 开关(`fps-overlay.ts`)供 live 诊断。

### 1.2 分层定位:离线 harness vs 壳层
- 离线 harness(`setGlobalEvents` + `tickByMode` 从任意 ip 起跑)能推完、而浏览器卡死 → **bug 在壳层**:main-loop 的 `paletteFadeState!=null → suppressHeldForFade`(吞键)、loading 覆盖层、rAF 节流。
- **离线 harness 必须 import 真实函数,别手写模拟脚本语义**:定位 autoScript/巡逻移动类 bug,写 vitest 探针 `setGlobalEvents(读 data/extracted/events/all.json)+ npcFromEventObject(读 data/extracted/data/scene/N.json)+ 真实 tickAutoScripts`,逐帧记 npc.x/y(用 `throw new Error(结果)` 输出,绕过 vitest 默认吞 console.log)。
  - **教训(鱼游出池塘,2026-06-14)**:手写模拟 0x06/walk/goto 语义两轮都算"漂 40px 不出界"→ 误判无 bug;改调真实 `tickAutoScripts` 才炸出 3228px 漂移(差 80×)。手写模拟会因对实现的错误假设骗你——能调真实函数就别复刻语义。(根因:0x06 概率跳转目标无 label 时 autoScript 侧没 fall back 到全局 ip,trigger 侧 jumpToGlobalIp 早有;disasm 不给 0x06 跳目标打 label,91/235 处受影响。)

### 1.3 渲染类 bug 的纯数据离线定位
- **"地块异常/缺失"类视觉 bug**:用 Python 直接按 tilemap JSON + tile PNG + live palette 复刻 `drawTilemap` 两遍(注意:**先全图 layer0 再全图 layer1,不能逐 cell 交错**),同相机坐标与引擎 canvas 逐像素 diff——余差即"引擎多画/少画的东西",每个 diff 热区可反查 world 坐标→对象/cell。血池"异常地块"就这样定位到屏外触发垫产生的 cover-tile(C 在 scene.c:286-314 先剔除屏外对象再算 cover,旧 port 漏了)。盲走截图低效且漏。

### 1.4 sdlpal 字段"死代码"判定
- **判断 sdlpal 字段是否死代码,必须查 `res.c` 装载回填,不能只看 dump 静态值。** `EventObject.nSpriteFramesAuto` 原始数据恒 0,但 C 在每次 kLoadScene 用 `PAL_SpriteGetNumFrames` 回填(res.c:295-298),`PAL_NPCWalkOneStep` 靠它驱动 nSpriteFrames==0 对象的 0x87/0x4C 氛围动画(冒泡/血柱/boss idle)。port 某字段前先 `grep <字段名> reference/sdlpal/res.c`,发现"全 0/恒定"先确认无装载/运行时写入再裁剪。

### 1.5 接 sdlpal 修复的纪律(对照 codex 5-commit 示范提炼)
改 ts 前先答**四问**,答不全 = 没读够,回去读,别动代码:
1. **真值在 source 哪行、原文是什么?**(引 C 代码,锚行号)
2. **要改的这段是 sdlpal 真值,还是 TS 移植自造的 workaround?** 若是 workaround,真 bug 窗口精确到哪个 tick/帧?——修 workaround 时回到真值**收窄**,不是再加一层补丁盖症状。(范例:owner-skip 根本不在 sdlpal 里,是 TS 自造;真 bug 窗口只 `waiting===undefined` 那 1 tick,精确收窄到那 1 tick,而非对所有 waiting 都跳。)
3. **改完什么不变、凭什么零回归?**(显式排除自己前几个 commit:"那两次只改 X,本路径逐字节未变,git diff 核实"。)
4. **测试能不能复刻真实场景的帧级坐标?**(真实 label、真实坐标断言,不是测字段写入。)

配套:bug 定位到"那一 tick / 那一帧"并量化(具体数字,不含糊);从症状反查到 opcode 字节序列;诊断靠 instrumentation(逐帧探针),不靠截图;改对了顺手收干净但不过度。

---

## 2. 忠实性真值锚 & 忠实 vs 修复

> 决策口味(用户倾向跟原版后期修复)属个人偏好,留 memory;此处只记**可复用的考证方法与已拍板结论**。

### 2.1 真值锚分层
- **原版 = pal.exe。** 提取自 pal.exe MKF 的**数据**(脚本字节码 `all.json`、资源、data 表)= 真值,可直接引为"原版";**sdlpal 的 `.c` 源只能"推断" pal.exe 引擎行为**——结论必须标"sdlpal 验证 / pal.exe 推断",最终视觉/手感裁决留给用户(他玩 pal.exe,是权威)。
- bug 归属分**四层**:原版早期(bug) / 原版后期(已修) / sdlpal(可能跟可能没跟) / type-pal。别假设 sdlpal=原版最新。
- **存档 `.RPG` 只证"存储布局"不证"运行时读法"**:如 HP 按 roleId 存(`rgwHP[role]`)只说明两个相同 roleId 槽共用一格血,运行时是否读全局血要从原版二进制证或用户亲核,别只看 sdl 实现下断言。
- 渲染"忠实 vs bug"别只信 sdlpal 静态 dump:**sdlpal 一次性 `--dump-map` 在干净 surface 上画完、无持久遮盖 ≠ 原版 runtime**(原版/sdlpal runtime 的 PAL_MakeScene 不清屏,糊上持久 gpScreen)。涉及不清屏/持久 surface 观感时核真原版 runtime。
- **roleId 3=巫后、4=阿奴(别按槽位顺序当名字)** —— 原版 `rgwName@0x220 = [36,37,38,**40,39**,41]` 故意把 role3/4 的名字 word 指针对调。角色显示名必须按 `rgwName[i]` 查词(`words.persons[rgwName[i]-36]`),**不能用 sequential `words.persons[i]`**。`parsePlayerRoles` 旧版用 sequential → role3/4 的 `_name` 写反(role3 标"阿奴"实为巫后、role4 标"巫后"实为阿奴),导致**反复把阿奴叫巫后**(2026-06-19 修:player-roles.ts 改按 rgwName 查;级联订正 CLAUDE.md roleId 顺序 + dev-panel 法术测试标签)。教训延伸:**認用户的游戏内视觉**——当年"屏幕造型是阿奴"是对的,错的是我们提取的 `_name` 标签。

### 2.2 已拍板的忠实-vs-修复例(偏离须源码注释 + 回归测试钉住)
- **逃跑抵抗**:原版 bug(误用敌身法/吉运死字段)→ 选修复版 `be.e.fleeRate`(flee.ts)。
- **物攻受击收尾**:两段式复位手感差 → 坐标归位并入切帧。
- **巫术状态命中 0x2E**:原版早期 `>` (巫抗 0 也吞 10%)→ 原版后期改 `>=` → sdlpal 没跟 → type-pal 改 `>=`(battle-opcodes.ts:634,**偏离 sdl、跟原版后期**)。
- **寿葫芦白嫖**:level≥99 装备伪毒是否算中毒,原版后期判 bug 修(不算)→ sdlpal 跟了(global.c:1669)→ type-pal 补 `level>=99 跳过`(event-system.ts:3241,对齐 sdl)。
- **玉佛珠/将军冢门禁(0x86 op1=0)**:`if(y<op1)` 恒假门禁哑火,镜像 sdlpal#324 → `(operands[1]??0)||1`(event-system.ts OP_JUMP_IF_NOT_EQUIPPED)。
- **敌方中乱/定/眠仍跑 wScriptOnReady**:加 `incapacitated = sleep>0||paralyzed>0||confused>0` 守卫(镜像 sdlpal#311)。

### 2.3 原版数据 bug —— 修运行时加载层,不动提取器
- 提取器必须字节级忠实(disasm↔recompile **roundtrip 不变式**),所以原版**数据本身**的 bug(脚本/资源数据错)不能改提取器,改在**运行时加载层**。
- 范例:扬州宝物屋 3 箱 `giveItem itemId=0`(原版字节码 operand 就是 0)→ `setGlobalEvents` 里 `patchGiveItemZeroBugs`(event-system.ts)按前一句 showDialog 的 `messageIndex`(12256/12347/12408,MSG.DAT 稳定下标)补回真 id;另 `addItemToInventory` 跳过 id-0(对齐 sdlpal `AddItemToInventory(0)→FALSE`)。这是今后所有"原版脚本/数据 bug"的通用修法。
- **考证原版 bug 先查 github.com/sdlpal/sdlpal/pulls**(常有人已定位 + 附 DOS 实测复现)。勾稽对了别因用户质疑轻易翻供,用证据回应(玉佛珠案被"没人说 sdlpal 有此 bug"问退缩、错误收回判断,实则 PR#324 正坐实)。
- 另(纯工程,非 faithful):JSON 存档导入/导出经 `JSON.stringify/parse`,Map 字段塌成 `{}` → 消费点 `reviveNumberKeyedMap` 兜底(battle-system.ts)。

---

## 3. 引擎架构陷阱

### 3.1 opcode 双解释器
sdlpal 是**单一** `PAL_InterpretInstruction`(script.c)解释所有 opcode;type-pal 拆成**两套**:
- 事件/场景脚本:`event-system.ts` 的 `applyRawOpcode`(trigger / autoScript / explore runScript 共用)。
- 战斗内脚本:`battle/battle-opcodes.ts` 的 `dispatchBattleOpcode`(scriptOnTurnStart / scriptOnReady / 战斗 runScript)。

**陷阱:某 opcode 可能只在一侧实现,另一侧落 default no-op。** 跨战斗边界的标志类 opcode 尤其危险(战斗前的事件脚本里调、战斗中生效):
- `0x8A` Enable-Auto-Battle 只在战斗侧实现,事件侧漏 → 石长老 vs 盖罗娇自动战变手动(补事件侧 case 即修)。
- 调色板 fade `0x51/0x80/0x8C/0x93` 战斗侧 `applyRawOpcode` 只有 `0x50`,其余落 no-op;且 `stepPaletteFade` 战斗 present 漏调(补 4 个 cursor-less case + 战斗 present 调 stepPaletteFade;⚠ 别把带事件态副作用的 `0x4F` FadeToRed 搬战斗侧)。

排查"某 opcode 不生效",先确认它该在哪侧跑,再 grep 两侧 case 是否都实现。

### 3.2 相机建模:相对移动非绝对回正
type-pal 把 sdlpal 的 (viewport, partyoffset) 双量塌缩成 (camera, 常量 PARTYOFFSET=160,112)。塌缩在"队伍居中"时无害,但 **0x7F 故意把队伍推离屏幕中心后就破**:任何"绝对回正"`camera = party - 常量` 都会把队伍拽回中心、抹掉 0x7F 偏移。
- 真值:sdlpal 脚本走位 `PAL_PartyWalkTo`/骑乘/`0x6E` 移的是 **viewport**,partyoffset 不变 → 等价 `camera += step`(相对)。居中态下相对与绝对等价,只有偏移态才显出差别。
- 凡"逐步移动队伍"的 op 都该相对移相机:`0x6E`、`partyWalkTo`(0x7A/0x7B)、`partyRideEventObject`(骑乘 0x3F/0x44/0x97)。
- 区分:`0x46 设队伍位` / `0x7F op0==0&&op1==0 回正` / abs-jump 是**绝对定位**(用常量),别误改。
- 中招史:林家堡李逍遥走出场(0x6E)、彩依抱刘晋元飞走(0x7A)。排查别只信 dev panel 预览(可能滤掉触发 bug 的 op),核真机或单测重放真实 opcode 序列。

### 3.3 切场景演出全黑 —— 两层
切场景后 onEnter 一上来就走位的演出会被黑屏盖住。根因有**两层**:
- **层A `sceneLoading`**(异步 fetch 资源期间 present 提前 return、显冻结旧帧):几乎所有多帧 op 执行时清 sceneLoading 解冻,**唯独 PartyWalkTo(0x70/0x7A/0x7B)、Ride(0x3F/0x44/0x97)、NPCWalkTo(0x10/0x11/0x7C/0x82)三组走位 op 漏清**。修:三组走位 op 执行时 `if (gs.sceneLoading) gs.sceneLoading = false`(对齐 0x09)。连带:冻屏期 `computeFollowerWorldPos` 不跑 → frozenOffset 没捕获 → 跟随者站位错,同解。
- **层B `needToFadeIn`**(调色板卡在 FadeOut 0x50 压的黑,场景渲染了却全黑):`tickSceneAutoFadeIn` 白名单(event-system.ts:653)与 `mode.ts:42` autoScript 白名单**同源、必须同步**。`camera-pan` 用独立 `waiting='camera-pan'`,执行态掉两套判断之缝(锁妖塔进塔运镜全黑)→ autoFadeIn 白名单显式加 `'camera-pan'`。
- **辨症**:层A = 完全冻屏显旧帧、镜头不动;层B = 镜头/演出在动但全黑(小地图能看到 camera 路径正确)。"镜头路径对却全黑" = 层B。
- **教训:新增"逐帧演出推进态"opcode 须同时登记 `mode.ts` autoScript + `event-system` autoFadeIn 两白名单**,否则黑屏复发(补一处漏一处实锤)。注:`blackScreenHold`(0x76 ShowFBP CG 黑屏)是另一套门控,别混清。

### 3.4 C 阻塞 → 异步化丢"同帧后续"
sdlpal 的阻塞调用返回后**同一帧**常还有后续步骤,异步化(跨帧 cursor)会把后续推到"重新进入扫描"之后,丢掉原版隐含的执行机会:
- **帧序**:`PAL_RunTriggerScript` 返回后同帧跑 `PAL_UpdateParty`(玩家必得一次移动)。异步化后脚本结束切 explore 的下一帧又是"先触发扫描后移动",TouchFar 无冷却下玩家位置永不变 → 每帧重触发死锁(客栈李大娘"别怠慢了客人")。修:`gs.suppressAutoTriggerOnce`——restoreModeAfterScript 设,tickScenePreInput 首帧消费跳过触发扫描(= C 同帧 UpdateParty 语义)。
- **数据异步化**也丢同帧保证:`0x8B setPalette` 旧实现 `fetchPalette(id).then(...)` fire-and-forget,而 `PAL_GetPalette` 从 pat.mkf **同步**读。scene-140 `0x50 FadeOut → setPalette → SetRNG → PlayRNG` 同步 tick 内跑完,Promise `.then` 隔 microtask → PlayRNG 读旧 palette → RNG 整段偏色(酒剑仙坐葫芦,**确定性非偶发**)。修:bootstrap 开机 `Promise.all` 预载 PAT.MKF 全 9 块成同步 Map,setPalette 优先同步回填。
- **方法**:移植阻塞控制流(脚本/战斗/菜单),列出 C 返回点之后同帧还会执行什么,确认 ts 帧序在哪个等价时点补回。⚠ 回归测试须驱动**真实 opcode 序列**(手设 gs 字段跳过 opcode 会一直不暴露)。

### 3.5 time-based 状态要有兜底收尾人
sdlpal 阻塞式过程(PAL_FadeIn 等)tick 化后变成"状态对象 + 收尾人"。收尾人若按"谁在等"分派,中间路径点火的状态就成**孤儿** → `state != null` 当全局门(吞键/冻逻辑)时即死锁(tickSceneAutoFadeIn 演出 frame-wait 中点的自动渐入两边都不收,main-loop 把 `paletteFadeState != null` 当 fade 进行中每 rAF 吞键 → 香兰报信等键死锁)。
- 新增 time-based gs 状态(fade/shake/wave/hold):① 列全点火路径(opcode handler / auto 触发 / 读档恢复);② 每条路径指定收尾人,无人等的给"到时自清"兜底;③ 凡 `state != null` 作输入门/逻辑门的,审一遍孤儿可能。

### 3.6 战斗动画拍频(施法慢/卡顿)
战斗用 40ms 固定逻辑 tick,`advanceBattleAnimFrames` 按 40ms 累积推进时间线帧。凡帧时长**非 40ms 整数倍**就拍频离散抖动:法术效果帧 `(speed+5)*10ms`(**45/104 法术 speed=0=50ms** 最坏 → frame0 在 40ms tick 下停 80ms,80/40/40/40 拍频);召唤 loop / fade 步同理。sdlpal 原版是独立 `PAL_DelayUntil` blocking 循环(精确),塞进 25fps 异步 tick 就抖。
- **修法:present 每 rAF wall-clock 细分**,三处同模式:
  - 死亡淡出 `stepDeathFadeRender`、召唤 loop `stepSummonLoopRender`(**塌缩段**:整段并成 1 帧,present 推内部子帧索引)。
  - 全战斗动画 `stepBattleAnimRender`(battle-anim-driver.ts,2026-06-19 通用版,**平行索引**:保留逐帧时间线,present 加 `renderIdx` 按 wall-clock 并行于逻辑 `idx` 算视觉帧,只刷视觉字段 `applyAnimFrameVisual`,`renderIdx=max(算, idx)` 不落后逻辑/不回退/末帧前停;召唤 loop/fade 帧早退交各自专驱,召唤神攻击 OffMagic 帧照常细分)。
- 共通:逻辑 `idx`(40ms tick)独占副作用(sound/damage)与完成判定 → 确定性不变(headless 无 present → renderIdx 恒 undefined、纯 idx 路径);present gate 加状态(`battleState?.battleAnim != null`)每 rAF present。
- ⚠ 别误把"前摇/演出步骤"当多余删了——卡顿/状态残留是**节奏/复位**问题,不是步骤多余。

### 3.7 立绘残留
立绘(头像)在 sdlpal 是 `PAL_StartDialog` 一次性 blit 的屏幕像素,任何 `PAL_MakeScene` 全屏重画都擦掉它。type-pal state-driven、**渲染读 `gs.dialogBox.portraitIcon`**(不是持久态 `currentDialogPortraitIcon`)。
- **修法 = 会 PAL_MakeScene 的 opcode 须 `clearDialogBoxes(gs)` 清整个 box**——只清 `currentDialogPortraitIcon` **无效**(后续无 setDialogStyle 的 showDialog 若 **append** 进残留 box,复用的是 box.portraitIcon)。已做:0x05 redraw / 0x09 wait / 0x7F moveViewport(0x7F 除"回正且 op2==0xFFFF"外都清)。未覆盖:walk 类 op(0x6E/0x0B-0x0E/ride/PartyWalkTo)也每帧 MakeScene,将来报同类先查。
- **复现陷阱**:触发条件 = 多行对话(≥5 行)**翻页**后保留空 body 的残留 box;手写**单行**简化序列走"新建 box"路径复现不了 append bug → 假阳性。必须用**真实多行翻页序列**跑真实 `tickEventSystem`(读 scene-NNN.json 真实字节码),直接 trace `box.portraitIcon`。

### 3.7b 跟随者朝向/位置冻结
- **`0x15`(setPartyDirectionAndFrame)写 `rgParty[operand[2]].wFrame`,operand[2] 点名转哪个队员**(0=队长,1+=跟随者),不是转全队。`wFrame = dir*3 + frameOffset`。
- **静止演出/划船期 sdlpal 从不重算队员 wFrame**(`PAL_GameUpdate` 不调 `PAL_UpdatePartyGestures`;ride 也不调)。只有自由行走/`PAL_PartyWalkTo`/`0x6E` 才从 rgTrail 重算。故队员朝向 = 最后一次 0x15 或走路设的值,冻到下次走路。渲染:跟随者静止且有 scriptedFrame 时用脚本帧,否则回退 trail——只动 operand[2] 点名那员。
- **位置同样冻结**:0x46 setPartyPos 循环写 `rgParty[i]=rgTrail[i]=队长+i×offset`(每员退一格)→ 静止演出跟随者位置 = `trail[m]`,不是 trail[1] 再叠方向偏移(=多退一格=间隙)。扇形布局只属走路态。

### 3.8 瓦片接缝漏黑
原版美术里少数瓦片在崖边斜接缝处自带透明像素;原版/sdlpal runtime 的 PAL_MakeScene **不清屏**(糊上持久 gpScreen)→ 缝里显示上一帧残留邻接地形,肉眼看不出。type-pal present 每帧 `fb.clear()` 清成 index 0 → 同样的缝露**纯黑**(血池 map76)。
- 修:`repairTilemapSeams`(draw-tilemap.ts;drawTilemap 传 coverage mask 标记已画像素 → 没画的用最近邻地形逐圈 dilation 填,在两层 tilemap 之后、applyScreenWave 之前)。**关键:用 coverage 判漏黑,不能用 `indices===0`**(瓦片可合法画 opaque index-0)。
- ⚠ 改 present/渲染循环后 Vite HMR 常不重载 rAF loop,要硬刷/重启 dev 才见效。

### 3.9 SW 离线预缓存
`packages/game/public/sw.js` + `src/shell/precache-{client,ui}.ts` + `boot-loading.ts` + bootstrap onPresent。
- **两段进度条**:虚线前(0→12%)= 必要资源前台 fetch 计数(`ui.setNecessaryProgress`);虚线后(12→100%)= SW 全量 `bytes/total`(`ui.setFullProgress`)。按钮卡在虚线(=必要资源就绪 `onPlayable`)。
- **SW 全量预缓存时机**:`onPlayable`(虚线)后 `startPrecache()`,不在页面打开就启动(否则抢必要资源带宽)。**视频/modal 期间暂停**:onPresent 检测 `gs.suspendRaf` → pause/resumePrecache(不抢视频 Range / 输入)。
- **改 SW 的 5 个验证盲区(都得实测真实条件、不能只靠逻辑)**:
  1. fetch handler `cache.put` 必须 **fire-forget + `status === 200`**(排 206):`<video>` Range 请求返 206,Cache.put 不支持 → respondWith reject → AVI 黑屏。**本地 python http.server 不返 206**,须生产 nginx / 支持 Range 的 server 测。
  2. `startPrecache`/`pause`/`resume` 依赖 `_activeWorker`(`swc.ready` 后才设);`onPlayable` 可能**早于** ready → 指令发空、SW 永不启动、进度停虚线。须 `_pendingStart` 缓冲、ready 后补发。
  3. `precacheAll` 长任务 → message handler 必须 `event.waitUntil(precacheAll())` 保活,否则 ~30s idle 被杀(停 76%)。
  4. fetch handler 用 `caches.match(req)` **跨 cache**(不是 `caches.open(CACHE_NAME).match`)——SW 重启后 `CACHE_NAME` 重置回 bootstrap、只在它里找会全 miss → 退化打网络。**真离线(停 server)实测**才暴露。
  5. `activate` 清缓存须**按版本**清(只删 `!== 当前版本`),**别清所有**(含当前版本):清所有的话每次 app 发版都把老用户整份预缓存清空 → 慢网(prod ~440KB/s,~200MB≈8min)重下、进度**停虚线**(2026-06-22 误用「清所有」即此根因——本意是迁移后清老格式 cache 防跨 cache 命中崩,但顺手把当前版本也清了)。正解:activate 调 `setCacheVersion()`(拿 manifest version 归位 `CACHE_NAME` + 删非当前),版本变更仍清老格式(防崩)、版本不变保留当前份 → 续访 precache 全 `cache.match` 命中秒满;离线 manifest 取不到 → `catch` 跳过勿误删。**验证**:`E2E=1 vite preview`(关 basicSsl 走 `http://localhost` 真 SW)造「当前版本+伪旧版本」两 cache 各插 sentinel,升级 SW 重载 → 当前 sentinel 存活、伪旧被删(三向区分:清所有=sentinel 没;没升级=伪旧还在)。
- SW 缓存命名 `type-pal-<asset-manifest.json.version>`,version 变触发整缓存失效;extractor 按内容哈希定 version,故改了资源格式/路径 version 必变、activate 据此清老格式 cache(无需手动改 sw.js 触发)。

---

## 4. 代码库事实

- **extracted scene id 0-based vs loadScene 操作数 1-based**:`data/extracted/data/scene/N.json` 和 `events/scene-N.json` 的 N 是 rgScene 数组下标(0-based);`loadScene`(0x59)的 sceneId 操作数是 sdlpal `wNumScene`(1-based)。用操作数查 extracted 文件先 **-1**;反向搜 `sceneId === N+1`。(追"打完僵尸王进血池":脚本 `loadScene 67` 实际进 extracted scene-66。)
- **PAL 立交/上下层 = 两张坐标对齐共瓦片的独立地图叠加**:PAL 碰撞是**单层**(`xr+yr*2` 阈值映射唯一菱形子格查 `&0x2000`),同一张图做不出"两条交叉路各自单向通"。游戏用两张坐标对齐、共用同套瓦片的独立地图(各自单层碰撞),一张开横路一张开纵路,路口用事件 `teleport` 换图(同坐标+同瓦片察觉不到)。实例:**隐龙窟迷宫1 = tilemap 42(下层)+ 131(上层)**,scene 40→map42、scene 41→map131,共享 `onTeleportLabel: L_9139`。检测特征:两 tilemap 尺寸相同、共用同套瓦片、对应 scene 共享 teleport label、`topH>0` 子格数差异指示谁是下层。其它多层区(怡红院 117/118、尚书府二层 111、南诏地宫 203/205、试炼窟群)大概率同款。
- **边界法术对象:梦蛇 = object 295**(巫后/赵灵儿的女娲变身,`0x55 addMagic` 授予)。它是**法术**,但名字落在 **item word 段**末位(61..295),不在 spell 段(296..397)。我们把 OBJECT 表按段拆成 items.json(61..294,**已排除 295**)/ spells.json(296..397 **+ 补 295**),`MENGSHE_OBJ_ID` 常量在 `pal-extract/.../_utils.ts`。原版不分段、直接 `rgObject[295]`(magic-union 施法 + item-union wScriptDesc 出说明);分段后须手工把它归到 spells.json,否则 `spells.find(295)` 落空 → 菜单说明为空(2026-06-19 修)。全表唯一这种对象。
- **M.MSG 文本是繁体 BIG5 原版"不彻底简体化"产物**:正文转 GBK 简体,但残留三类未转干净的内容,纯 GBK 解码落到 PUA(U+E000–F8FF),Unifont 无此码点 → 渲染成空心方块。三类:① 繁体字残留(GBK 造字区 AE/AF/FE)② BIG5 标点(A140–A14A 线性映射 U+E4C6+n)③ 整条未转码 BIG5 台词。已在 [`packages/pal-extract/src/utils/gbk.ts`] `decodeGbk → fixupTranscodeResidue` 还原(`FULL_LINE_FIXUP` 整条 + `PUA_CHAR_FIXUP` 逐字)。**decodeGbk 是所有文本统一解码入口,改后必须重跑 `pnpm extract`**(data/extracted 是 .gitignore,game 经 symlink 读)。再报方块:node 扫 all.json 的 PUA 找码点+上下文 → iconv `encode(ch,'gbk')` 回字节 + `decode(bytes,'big5')` 看是否 BIG5 → AE/AF 繁体字靠上下文**问用户**确认正字(别凭猜)→ 加进两张 fixup 表 → 重跑 extract + 扫 PUA=0 验证。

---

## 5. 部署 / 运维

### 5.1 生产站 & CDN
- 生产 **pal.illegalscreed.cn**(阿里云 ECS 47.120.26.143,nginx 1.20 HTTP/2,实测下行 ~437KB/s)**已接入阿里云 CDN**(2026-06-17)。业务类型「图片小文件」、加速区域「仅中国内地」、ECS 作源站(方案A)。实测 `Server: Tengine`+`Via: kunlun`+`X-Cache: HIT`。
- **CDN 配置要点**:缓存规则**必开「优先遵循源站缓存策略」**(否则 CDN 无视源站头统一缓存 1 月,壳/SW/manifest 的 no-cache 全失效);Range 回源 512KB + Gzip;**回源协议 HTTPS(443) + 默认回源 SNI=pal.illegalscreed.cn**(ECS 多站点,不指定会拿错证书);流量封顶 100GB/天兜底(别配请求数封顶——一个完整访客发 7.7 万请求会误伤)。
- **HTTPS 证书自动续期(已配,全免管)**:CDN 证书 = 服务器 certbot 的 Let's Encrypt;`/etc/letsencrypt/renewal-hooks/deploy/upload-cdn-cert.sh` → `aliyun cdn SetCdnDomainSSLCertificate`(参数必须 `--SSLPub=`/`--SSLPri=` 等号形式,PEM 空格分隔会被当 flag)。aliyun CLI profile `cdn-deploy` 用 RAM 子账号(仅 AliyunCDNFullAccess)。⚠ 安全:别把 AK 发对话(用户曾误发主 AK,须去 AccessKey 管理禁用)。

### 5.2 部署后缓存
- `scripts/deploy.sh app` 原子切换 dist 后,nginx 给 `index.html` 无 `Cache-Control` → 浏览器启发式缓存旧版,**不硬刷看不到更新**(JS/assets 带 hash 不受影响,问题只在 index.html)。
- **根治(已做)**:nginx `location /` 加 `Cache-Control: no-cache`(index.html、/sw.js、/extracted/asset-manifest.json 三件套;JS/assets 带 hash 仍 immutable 1y;extracted 7d;soundfont 30d)。
- 验证服务器真值:`curl -s https://pal.illegalscreed.cn/ | grep -o 'index-[A-Za-z0-9_-]*\.js'` 跟本地 `vite build` hash 对比。

### 5.3 "卡/慢"诊断:先分本地 vs 生产
- 本地 dev 测不出冷加载/带宽问题(本地零 long task、tile 秒过)。用户说"第二次就没事" = HTTP 缓存命中 = 冷加载/带宽问题,不是代码卡顿。
- 报"卡/慢"先问本地还是生产;生产问题直接 `curl -w speed_download` 测速生产 URL 拿量化证据。大资源(soundfont、视频)的下载窗口会饿死并发小资源。

### 5.4 BGM 音色库
- = **TimGM6mb**(5.97MB,GPL-2)。用户拍板"更像原版"(薄音色贴近 1995 OPL/早期波表,是优点)。**别以"音质更好"建议换回 GeneralUser GS(32MB)**;若嫌薄,升级路径是 FluidR3Mono_GM.sf3(13.8MB),不是 32MB。文件名固定 `public/soundfont.sf3`(内容 SF2),换库同步更新 soundfont-LICENSE.txt。

### 5.5 本地验 Service Worker 的坑
- **vite preview 走 HTTPS 自签证书**(basic-ssl,AudioWorklet 需 secure context),会让 `serviceWorker.register('/sw.js')` 抛 `SecurityError`——chrome `--ignore-certificate-errors` 不豁免 SW 脚本注册的证书校验(`isSecureContext` 仍 true,迷惑性强)。
- **绕法**:`http://localhost` 是 potentially-trustworthy 源(secure context 豁免)且无证书 → SW 能注册。对 dist 起纯 HTTP:`python3 -m http.server 4174 --directory packages/game/dist`(dist 里 PROD 已固化)。
- **chrome-devtools `emulate Offline` 对 SW 网络无效**(SW 有独立网络栈)→ 真离线须停掉 http server。
- chrome-devtools-mcp 残留实例锁 profile:`pkill -f "chrome-devtools-mcp/chrome-profile"`。

---

## 6. docs / 计划维护

### 6.1 docs 状态表刷新口径
- 文档体系:`README.md`=导航+快照;`feature-status.md`=玩家可感知功能主表 → 引用 `opcode-status`/`resource-status`/`item-status`/`magic-status`/`cutscene-status`/`game-mechanics`。
- **关键经验:大多数明细表的逐条状态不会因细节 fix 翻转**(一段 commit 多是菜单/演出/加载层修正,不动 opcode 级效果机制)→ 通常只"更新快照日期 + 一句复核结论",逐行状态保持。真正会动内容的一般只有 feature-status(新增系统行)+ resource(新增提取产物)。
- **陷阱**:① `cutscene-status` 的 🔴🟡⚪ 是**复核优先级(复杂度启发),不是已测/已修状态** → 修了 bug 别下调风险分级,改去底部「已知演出差异」台账。② 顶部"2026-0x-xx 审计"日期是事件标记,别改成今天(会谎称重新 dump 审计过),改用"加增量块"或"标双日期"。③ `map-names.ts` 是 tools 硬编码派生,不入 resource-status。④ soundfont 是手工放入的第三方资源,非 pal-extract 产物。
- 高效做法:派 per-表后台 agent 并行核查"对照 `git log --since=<日期>` 找事实性过时,返回行级建议(old→new),不直接编辑文件",主表自己改。

### 6.2 攻略 flow.md & e2e 计划
- `reference/walkthrough/flow.md` 已按知乎墨羽 98 版攻略细化成 **29 个「阶段」**(对应地点章节),每阶段模板:目标/进入状态/⭐队伍能力变化/主线/支线/物品/战斗(可逃·胜负皆可·坚持N回合·可偷)/迷宫/转场。
- **下游计划**:把游戏拆阶段 → 每阶段设初始化状态 → 让 AI 按攻略"摸索"生成 e2e 通关脚本。价值在「玩家动作粒度 + 每阶段 init 状态钩子」,不在场景号(场景号让 AI 跑时自己探)。
- ⚠ **只第一章早期 3 场景(开场梦境 scene/0·余杭镇 scene/4·码头 scene/5)+ 香兰跨场景 arm 经 data/extracted 逐字段复核 ✅**,其余一律 ⚠️待核实。**继承来的"已核实"标注别照抄,verify 后再标且写明出处/范围**(别把"3 个早期场景"夸成"整章")。补场景号按"0-based vs 1-based"口诀查 `scene/*.json`+`events/scene-NNN.json`。
