# GLM Wave K 交付证据(GLM 独占记录;任务卡/看板/共享索引归 Codex)

## r2(返工响应 Codex codex-review-4ebea2b5,2026-09-29)

r1 候选 `4ebea2b5` 被 Codex 判 rework(四项);r2 在原白名单内逐项修复,已 rebase 到
main(`4d34a007`)之上,Codex 审核记录原样保留(`codex-review-4ebea2b5.md`)。

四项返工对照:

1. **K04 无 handler 对照**(r1 假对照:第二次运行时 reloader 仍注入)→ r2 在第二场景前
   真正 `setMapReloader(null)`,断言 `reloadedMaps` 保持 `[99]`(撤下后未再触发),`finally` 清理保留。
2. **三枚反控改为合法输入单轴变异**(r1 变异的是期望值,只证断言会红)→ r2 断言零改动,只变异输入:
   - CC-K02:脚本 operand `idleFrames: 3 → 4`(合法域)→ 第 3 tick 仍在 resetTo,"满次 fall-through 落 ip1" 业务断言红;
   - CC-K05:0x73 operand `[1,0,0] → [0,0,0]`(合法域)→ speed=0、totalMs=720,先由 "speed=1" 业务断言检出;
   - CC-K03:opcode `0x27 → 0x26`(同族合法)→ handler mode='buy',"mode=sell" 业务断言红。
   判据单一化(`judgeControl`):正控 exit0;反控 exit1 + 执行数非零 + 恰一个指定测试的业务断言红
   **且该断言来自注入副本绝对路径**(拒非目标文件)+ 无 skip + 无 timeout(消息级扫描)+ 无收集/基础设施红;
   judge FAIL 时 runner 非零退出。`--self-test` 8/8 覆盖 timeout / 非目标文件 / 混错 / skip /
   零执行 / 收集错 / 正控红 + valid 正例。
3. **K03 卖出参数**(r1 把 `0x27[4]` 的 storeNum 透传写成"卖出侧真值";C `PAL_SellMenu()` 不读
   operand,bootstrap sell 分支忽略 storeNum)→ r2 撤掉卖出 storeNum 语义断言,同一 it 内用
   两个合法 operand(4/9)对照证明 mode/停驻行为与 operand 无关。
4. **K06 战斗夹具**(r1 自造 `players:[]` 的 BattleState 却设 `caster:{player,idx:0}`)→ r2 改经
   现行构造器 `createBattleState`(`gs.partyMembers=[0]` + minimalRole/minimalEnemy fixture),
   新增合法性对照断言 `state.players[0].roleId===0`(caster 指向真实玩家);三态返回与 giveItem 断言保留。

## 候选与冻结核验

- r2 候选:分支 `codex/glm-event-wave-k-r1`(worktree `/Users/zhangxu/.codex/worktrees/glm-union-intake/type-pal`),
  完整 SHA 见提交(本轮新候选);base = main `4d34a007`。
- `verify-targets.mjs` exit 0:源 `packages/game/src/core/event-system.ts`
  SHA256 `c3332dd087e5b7b3ef5b9056c32a27d342a93d6f087c516b904ec40949868fcb` 1/1 一致,
  groups 6,`priorQueueOverlap:false`。
- 只写:六个冻结新测试路径 + `docs/testing/archive/legacy/batches/glm-event-wave-k/**` 证据。产品、旧测、共享配置、
  官方基线零改动。
- 本地覆盖对照(r1 口径,同 vitest/istanbul):event-system.ts 分支 1251/1876 → **1314/1876(+63 臂)**。
  正式结算归 Codex;此处只证新测翻转目标臂。

## 六组对照(caller → 旧证 → 新证/已证/不可达)

### K01 trigger 游标、子脚本及恢复
- caller:`mode.ts:63`;`event-system.ts:1919-1952`;scene-system triggerResume 消费。
- 旧证:`event-system.test.ts:2765`(advance)/:2786(plain)/:2807(0x08 checkpoint)/:2826(0x25 清 resume)。
- 一手:`script.c:3218-3237`(0x0002 计数门)+ `play.c:153`(写回)。
- 新证(2 例):0x02 reset 收尾重臂 resetTo(单值 4 排除 plain=1/advance=2)+ end 与目标之间 op 永不执行 + 从 resume 再触发;idleFrames=2 计数挂 owner、满次同帧 fall-through(音效 [11]→[11,11,22])、resume 不被覆盖、计数清零。
- 已证不重做:advance/plain/checkpoint/0x25/0x04 call 弹帧。

### K02 autoScript、onEnter 与跨帧等待
- caller:`mode.ts:63/91`;bootstrap `runEnterScript`;`event-system.ts:1208/1471/5035`。
- 旧证::3409/:3529(auto 0x0002 仅 idleFrames:0);:4226/:4246/:4268/:4288/:4300(onEnter advance/plain/checkpoint);:1524/:1540(0x09 仅 [n,0,0])。
- 一手:PAL_RunAutoScript case 0x0002;script.c:3218-3237 + play.c:64;script.c:3354-3367 + scene.c:773-774。
- 新证(5 例):auto idleFrames=3 计数轨迹(0,0,1,1,1);onEnter 0x02 reset 写回(异步 + runEnterScript 同步);0x09 op2=1 等待期站立帧复位(3→0)+ op2=0 负控。
- 已证不重做:auto 0x00/0x01/goto/0x06/0x04;onEnter advance/plain/checkpoint。

### K03 物品、金钱、商店及队伍状态
- caller:`mode.ts:63`;`event-system.ts:2196-2206`;bootstrap setShopMenuHandler(`shell/bootstrap.ts:1239-1248` sell 分支忽略 storeNum)。
- 旧证:shop-menu.test.ts:131-140(0x26 买侧端到端)。0x27 卖出侧 r1 前全仓零断言;无 handler 降级零断言。
- 一手:`script.c:1157-1173`(0x26 `PAL_BuyMenu(operand[0])`;0x27 `PAL_SellMenu()` **不读 operand**)。
- 新证(r2,2 例):0x27 → handler 一次 {mode:'sell'} + waiting='shop' + ip 预推进 1,operand 4/9 两合法值对照(不断言卖出 storeNum 语义);无 handler 时 0x26+0x27 同 tick 连续 skip 回 explore。
- 已证不重做:0x26 handler 端到端与买卖交互(shop-menu.test.ts)。

### K04 场景对象、地图与相机边界
- caller:`event-system.ts:4111`(0x7E)/:4528(0x99)。
- 旧证::1998(0x7E 正数)、:4671(0x99 指定 scene)。sLayer 负值 wrap、0x99 当前场景臂 r1 前零断言。
- 一手:`global.h:78`(SHORT sLayer);`script.c:2740-2753`(0x99 0xFFFF → rgScene[wNumScene-1].wMapNum + 立即 PAL_LoadResources,脚本继续)。
- 新证(r2,2 例):0x7E[0xFFFF,0xFFFE]→sLayer=-2(对照 3→3);0x99[0xFFFF,99] → override 单键 [5]=99 + reloader(99) 恰一次 + 当帧续跑(音效 77)+ **真撤下注入**(`setMapReloader(null)`)后的无 handler 对照:override 仍写、`reloadedMaps` 保持 `[99]`、不崩。
- 已证不重做:0x46/0x7F/0xA1 相机、0x4C、0x12/0x13/0x16/0x6C/0x7D。

### K05 对话、调色板、音画等待与消费
- caller:`event-system.ts:2490-2516`(0x73)/:700/:659。
- 旧证:0x50/0x51/0x80/0x8C/0x93/0x4F/0x9B 家族 :4784-:5112;tickSceneAutoFadeIn :5162/:5176/:5225(camera-pan 执行态)。0x73 全仓零断言(r1 前后均本波首证)。
- 一手:`script.c:2140-2147` + video.c VIDEO_FadeScreen((op0+1)*10ms × 72 步);script.c:2364-2366 + scene.c:503-508。
- 新证(3 例):0x73[1] 全合同(fadeState{speed:1,totalMs:1440} + 清黑屏保持/冻屏 + waiting + 老化时钟消费后续跑);MakeScene 步判定 0x70/0x44/0x7Fpan 正 + 0x35 负。
- 已证不重做:palette fade 家族、narration/item-box、RNG/FBP/ending、夜间色。

### K06 战斗/大世界脚本入口与失败门
- caller:`battle/actions/item.ts:97`;menu-driver;毒入口 `:3156`。
- 旧证::775-:1136(全 plain end);:4143-:4224(物品 gate 成功入口);:4151/:4170/:4187/:4197(startOverworldItemScript 仅成功路径)。
- 一手:`script.c:3204-3237` + `fight.c:1185-1186/1689-1690`;`script.c:970-975`;`play.c:244-325`。
- 新证(r2,6 例):battle end 三态返回值(advance=2 / reset=L_3=3 / plain=0);battle 具名 giveItem{178,2} 入包;**合法性对照**:夹具经现行 `createBattleState`(partyMembers=[0] + minimalRole/minimalEnemy),caster.idx 0 指向真实 `state.players[0].roleId===0`;startOverworldItemScript 双失败门 + 成功对照记账。
- 已证不重做:battle 对话队列/0x69/0x35/0x19 回灌/0x06 fall-back。

## 质量门(r2 候选分支实测)

| 门 | 结果 |
|---|---|
| `verify-targets.mjs` | exit 0;hash 1/1;groups 6;零交集 |
| 定向 + 相邻 Vitest | **638/638 passed,0 failed,0 skipped**(`vitest-directed.json` 新鲜生成;含旧 `event-system.test.ts` 326、`mode`/`scene-system`/`event-opcode-player(+glm-next-wave)`/`shop-menu`/`menu-driver`/`battle actions`/`battle-state`/`dependency-ownership` 及六个 K 文件 20 断言) |
| `pnpm --filter @type-pal/game run typecheck` | exit 0 |
| `pnpm lint`(全仓零诊断包装器) | PASS — 2760 files;0 errors / 0 warnings / 0 infos;complete report |
| `node scripts/docs/check.mjs` | PASS(0 issues) |
| `git diff --check` | exit 0 |
| 反控判据自测 | `--self-test` 8/8(valid 正例 + timeout/非目标文件/混错/skip/零执行/收集错/正控红全拒),exit 0 |
| 业务反控 | 3/3 valid(`counter-control/evidence.json` r2):CC-K02(idleFrames 3→4)、CC-K05(speed [1,0,0]→[0,0,0])、CC-K03(0x27→0x26);**合法输入单轴变异**;每枚正控 exit0 → 注入后恰一指定业务断言红(来自注入副本绝对路径)+ exit1 + 执行数非零 + 无 skip/timeout/收集错;FAIL 时 runner 非零退出;临时副本已删 |

## 未证 / 单列诊断(不阻塞本包测试交付)

1. **0x12 setObjectPosRelParty 的符号表示**:TS `toInt16(sum)`(npc.x 可为负)vs C `WORD x`
   (global.h:89 无符号;影响 0x52 复活判定的左右屏语义)→ 原版行为考据交 Codex 另卡裁决。
2. **applyRawOpcode 内 `operands[n] ?? 0` 元组兜底臂**:typed 输入不可达,非行为缺口。
3. **runPlayerPoisonEntrySync 非主流臂**(dialog bail/reset 缺 label):与旧 M12(:4565)相邻度高,排重不新增。
4. 剩余未覆盖分支为异常防御臂(owner 缺失、resetTo 无 label fall-back、ip 越界 stop 等)。

## 反控复跑方式

```bash
node docs/testing/archive/legacy/batches/glm-event-wave-k/counter-control/run-counter-controls.mjs --self-test  # 判据自测 8/8,exit 0
node docs/testing/archive/legacy/batches/glm-event-wave-k/counter-control/run-counter-controls.mjs              # 全流程,FAIL 非零退出
# → docs/testing/archive/legacy/batches/glm-event-wave-k/counter-control/evidence.json(每次新鲜;注入副本用后即删)
```
