# GLM Wave K 交付证据(GLM 独占记录;任务卡/看板/共享索引归 Codex)

- 候选:分支 `codex/glm-event-wave-k-r1`(worktree `/Users/zhangxu/.codex/worktrees/glm-union-intake/type-pal`),
  生产冻结 `aac9443bfe81799b06afdb1787d32abf7cb43e14`,
  源 `packages/game/src/core/event-system.ts` SHA256 `c3332dd087e5b7b3ef5b9056c32a27d342a93d6f087c516b904ec40949868fcb`
  (`verify-targets.mjs` exit 0,`priorQueueOverlap:false`)。
- 只写:六个冻结新测试路径 + `docs/testing/glm-event-wave-k/**` 证据。产品、旧测、共享配置、
  官方基线零改动(`git status` 仅六测试文件 + 本目录)。
- 本地覆盖对照(仅 `event-system.test.ts` vs +六个 K 文件,同 vitest/istanbul 口径):
  event-system.ts 分支 1251/1876 → **1314/1876(+63 臂)**,行 1489/1767 → 1549/1767。
  正式结算归 Codex(main 并集 protected fast);此处只证新测翻转了目标臂。

## 六组对照(caller → 旧证 → 新证/已证/不可达)

### K01 trigger 游标、子脚本及恢复
- caller:`mode.ts:63` tickEventSystem;`event-system.ts:1919-1952` trigger end 持久化;scene-system triggerResume 消费。
- 旧证:`event-system.test.ts:2765`(0x01 advance)、:2786(0x00 plain)、:2807(0x08 checkpoint)、:2826(0x25 清 resume)。
- 一手:`reference/sdlpal/script.c:3218-3237`(0x0002:计数中 → wNextScriptEntry=op0;满 → 清零 + wScriptEntry++);
  `play.c:153`(wTriggerScript 写回返回值)。
- 新证:`k01` 2 例 —— ①0x02 reset 收尾重臂 resetTo(L_4,单值同时排除 plain=1/advance=2 臂)+ end 与目标之间的 op 永不执行 + 从 resume 再触发跑目标段;②idleFrames=2 计数挂 owner 跨运行累计、满次同帧 fall-through(音效轨迹 [11]→[11,11,22])、resume 不被覆盖、计数清零。
- 已证不重做:advance/plain/checkpoint/0x25 清除/0x04 call 弹帧(旧 :4682-:4738)。

### K02 autoScript、onEnter 与跨帧等待
- caller:`mode.ts:63`(tickAutoScripts 门)/`:91`(tickEventSystem);bootstrap `runEnterScript`;`event-system.ts:1208/1471/5035`。
- 旧证:`:3409`/`:3529`(auto 0x0002 仅 idleFrames:0 恒跳臂)、`:4226`/`:4246`/`:4268`/`:4288`/`:4300`(onEnter advance/plain/checkpoint,异步+同步)、`:1524`/`:1540`(0x09 仅 [n,0,0]/[0,0,0])。
- 一手:`script.c` PAL_RunAutoScript case 0x0002(op1==0 || ++count<op1 → wScriptEntry=op0;否则清零 + ++);`script.c:3218-3237` + `play.c:64`(onEnter 写回);`script.c:3354-3367` + `scene.c:773-774`(0x09 op2 → 每帧 PAL_UpdatePartyGestures(FALSE),stepFrame &=2 ^=2)。
- 新证:`k02` 5 例 —— ①auto idleFrames=3:tick 轨迹 ip 0,0,1,1,1(计数跳 resetTo → 满次 fall-through → park);②onEnter 异步 0x02 reset → sceneOnEnterIp=4(排除 plain=0/advance=2);③runEnterScript 同步 0x02 reset → 同写回;④0x09 op2=1:等待期首 tick 复位 walking/stepFrame(3→0)且耗尽续跑;⑤单轴负控 op2=0:不复位。
- 已证不重做:auto 0x00/0x01/goto/0x06/0x04/onEnter advance/plain/checkpoint(旧测在案)。

### K03 物品、金钱、商店及队伍状态
- caller:`mode.ts:63`(shop waiting↔menu resume);`event-system.ts:2196-2206`;bootstrap setShopMenuHandler。
- 旧证:`core/menu/shop-menu.test.ts:131-140`(0x26 买侧端到端)。**0x27 卖出侧全仓零断言;shop 无 handler 降级零断言**(对照 0x07 :1340/0x37 :5348/0x76 :5480 同类防御合同有旧证)。
- 一手:`script.c:1157-1173`(0x0026 PAL_BuyMenu(operand[0]);0x0027 PAL_SellMenu())。
- 新证:`k03` 2 例 —— ①0x27[4]:handler 恰一次({mode:'sell',storeNum:4})+ waiting='shop' + ip 预推进 1;②无 handler:0x26+0x27 同 tick 连续 skip → 脚本跑完回 explore(与①构成正反对照)。
- 已证不重做:0x26 handler 端到端、买卖菜单交互与钱/物结算(shop-menu.test.ts);0x1E/0x1F/0x20/0x8F/0x34 队伍/物品/钱 opcode(旧 I-w1 系)。

### K04 场景对象、地图与相机边界
- caller:applyRawOpcode(tick/autoScript/runScript 共用);`event-system.ts:4111`(0x7E)/`:4528`(0x99)。
- 旧证:`:1998`(0x7E 正数层)、`:4671`(0x99 op0≠0xFFFF 指定 scene)。**sLayer 负值 wrap、0x99 当前场景臂全仓零断言**(setMapReloader 测试零注入)。
- 一手:`global.h:78`(SHORT sLayer);`script.c:2740-2753`(0x99 op0==0xFFFF → rgScene[wNumScene-1].wMapNum=op1 + 立即 PAL_LoadResources,脚本继续)。
- 新证:`k04` 2 例 —— ①0x7E[0xFFFF,0xFFFE] → sLayer=-2,单轴对照 op1=3 → 3;②0x99[0xFFFF,99]:override 仅键 [5]=99 + mapReloader(99) 恰一次 + 当帧后续 op 照跑(pendingSounds 77)+ 守卫臂(未注入 reloader → 只改 override 不崩)。
- 已证不重做:0x46/0x7F/0xA1 相机与 trail、0x4C 追击、0x12/0x13/0x16/0x6C/0x7D 对象位移动(旧测在案)。0x12 的 SHORT 符号化(npc.x 负值表示)与 C WORD 存储存在表示层分歧,按卡面「原版争议不写死」未新增断言,单列诊断交 Codex。

### K05 对话、调色板、音画等待与消费
- caller:`mode.ts:63`;`event-system.ts:2490-2516`(0x73)/`:700` tickSceneAutoFadeIn/`:659` isEventCursorAtMakeSceneStep。
- 旧证:0x50/0x51/0x80/0x8C/0x93/0x4F/0x9B 家族 `:4784-:5112`;tickSceneAutoFadeIn explore/阻塞态/frame-wait `:5162`/`:5176`、camera-pan 执行态 `:5225`。**0x73 fadeScreen 全仓零断言;MakeScene 步判定的走位/骑乘/0x7F-pan 即将执行臂零断言**。
- 一手:`script.c:2140-2147`(0x73:VIDEO_BackupScreen + PAL_MakeScene + VIDEO_FadeScreen(op0));video.c VIDEO_FadeScreen(wSpeed+1)*10ms × 72 步;`script.c:2364-2366` + `scene.c:503-508`。
- 新证:`k05` 3 例 —— ①0x73[1]:fadeState{speed:1,totalMs:1440} + 清 blackScreenHold/sceneLoading + waiting='fade-screen' + ip 不动;老化 startTimeMs(无睡眠)→ 消费 tick:fadeState 清、ip++ 同帧续跑(音效 77)、end 收尾;②MakeScene 步判定:0x70/0x44/0x7F 多帧 pan(即将执行)消费 needToFadeIn(黑→base 昼色 target);③负控 0x35 shake 不消费。
- 已证不重做:palette fade 家族、narration/item-box、RNG/FBP/ending modal、夜间色(旧测在案)。

### K06 战斗/大世界脚本入口与失败门
- caller:`battle/actions/item.ts:97`(performItem → runScript battle);menu-driver → `startOverworldItemScript`(:3286);毒入口 `:3156`(event-opcode-player.ts:245 注入)。
- 旧证:`:775-:1136`(battle runScript 全部 plain end 收尾)、`:4143-:4224`(物品 gate 走 scriptOnUse=1 成功入口)、`:4151`/`:4170`/`:4187`/`:4197`(startOverworldItemScript 仅成功路径)。
- 一手:`script.c:3204-3237`(wNextScriptEntry 三态)+ `fight.c:1185-1186/1689-1690`(返回值写回 wScriptOnTurnStart);`script.c:970-975`(0x1F AddItemToInventory);`play.c:244-325`(GameUseItem 入口上下文)。
- 新证:`k06` 5 例 —— ①battle end advance → 返回 ip+1;②battle end reset → 返回 L_resetTo;③单轴对照 plain → 返回起始 ip;④battle 具名 giveItem{178,2} → battleCtx.gs.inventory +2(蛊孵化链合同);⑤startOverworldItemScript 双失败门(scriptOnUse=0 / label 缺失 → false + 零副作用),成功对照记账 pendingItemConsume。
- 已证不重做:battle 对话队列/0x69/0x35/0x19 回灌/0x06 未打 label fall-back(旧测在案)。runPlayerPoisonEntrySync 的 dialog-bail 臂(:3207)与 reset/缺 label 臂未新增 —— 与 0x29 旧证(M12 :4565)相邻度高,排重保留;如需可另开小包。

## 质量门(候选分支实测)

| 门 | 结果 |
|---|---|
| `verify-targets.mjs` | exit 0;hash 1/1 一致;groups 6;零交集 |
| 定向 + 相邻 Vitest | 623/623 passed,0 failed,0 skipped(`vitest-directed.json`;含旧 `event-system.test.ts` 326、`mode`/`scene-system`/`event-opcode-player(+glm-next-wave)`/`shop-menu`/`menu-driver`/`battle actions`/`dependency-ownership` 及六个 K 文件) |
| `pnpm --filter @type-pal/game run typecheck` | exit 0(tsc --noEmit 零诊断) |
| `pnpm lint`(全仓零诊断包装器) | PASS — 2757 files;0 errors / 0 warnings / 0 infos;complete report |
| `node scripts/docs/check.mjs` | PASS(788 Markdown / 4131 links / 0 issues) |
| `git diff --check` | exit 0 |
| 业务反控 | 3/3 valid(`counter-control/evidence.json`):CC-K02(auto fall-through)、CC-K05(0x73 totalMs)、CC-K03(0x27 sell mode);每枚:正控 exit0 全绿 → 隔离副本单轴变异 → 恰一指定业务断言红 + exit1 + 执行数非零 + 无 skip/收集错误 → 临时副本已删 |

## 未证 / 单列诊断(不阻塞本包测试交付)

1. **0x12 setObjectPosRelParty 的符号表示**:TS `toInt16(sum)`(npc.x 可为负)vs C `WORD x`(global.h:89,无符号存储;C 距离/复活判定把 65408 当"屏右远端",TS 当"队首左侧 -128")。表示层分歧影响 0x52 复活判定语义,涉及原版行为考据 → 按卡面停,不写死为测试预期,交 Codex 另卡裁决。
2. **applyRawOpcode 内 `operands[n] ?? 0` 元组兜底臂**:typed `RawCommand.operands` 是固定三元组,`??` 右臂经 typed 输入不可达(istanbul 仍计臂)——非行为缺口,不动产品签名(白名单外)。
3. **runPlayerPoisonEntrySync 非主流臂**(dialog bail/reset 缺 label):可达但与旧 M12 证据相邻度高,判排重不新增。
4. 剩余未覆盖分支为异常防御臂(owner 缺失、resetTo 无 label 的 fall-back、ip 越界 stop 等),多为"合法输入难达或纯防御",本包不追。

## 反控复跑方式

```bash
node docs/testing/glm-event-wave-k/counter-control/run-counter-controls.mjs
# → docs/testing/glm-event-wave-k/counter-control/evidence.json(每次新鲜生成;注入副本用后即删)
```
