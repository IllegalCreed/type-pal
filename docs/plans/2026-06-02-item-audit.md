# 物品功能实现完整性审计(type-pal vs sdlpal)

日期:2026-06-02
范围:仙剑(type-pal)TypeScript 1:1 移植对 sdlpal 物品系统四维(大世界使用 / 战斗使用 / 战斗投掷 / 技能消耗)+ 装备维 + 标注/数据层的完整性审计。
方法:opcode 真值矩阵(逐 opcode Read sdlpal `script.c`/`fight.c`/`global.c` + type-pal `event-system.ts`/`battle-opcodes.ts`/`battle/actions/*`)→ 对抗验证 verdicts 修正 → 逐物品 gap 归并。

---

## 1. 摘要

- **数据规模**:`data/extracted/data/items.json` 共 **235 个物品**(wObjectID 61..295)。其中 `usable`(大世界+战斗使用)**100** 件、`throwable`(战斗投掷)**83** 件(其中 7 件 `scriptOnThrow==0` 走默认路径)、`equipable` **107** 件。物品脚本(scriptOnUse/Throw/Equip)涉及 **51 个 unique opcode**。
- **任务前置 3 个"已知确认 gap" 经 Read 核实为误报,已剔除**:
  - `0x81`(朝向判定 jump)——**已实现** `event-system.ts:4031-4063`(大世界+战斗 fallthrough 共用),仅有 scene-bounds + g_fScriptSuccess 两处边界偏差(partial)。
  - `0x84`(用物品生成场景 event object)——**已实现** `event-system.ts:3905-3925`,同样仅边界偏差(partial)。
  - `0x5D`(jump if 玩家没中某毒)——**已实现** `event-system.ts:3826-3832` + helper `isPlayerPoisoned@2776`,两维 ok。
- **确认 gap 总数:14 处**(opcode 级 5 处 + 逐物品/路由级若干 + 标注 1 处 + 装备维 1 处),按四维分布:
  - **大世界使用**:5 处(0x2D/0x2F 状态 STUB、0x22 status 清除缺失、0x34 物品框 dialog 缺、0x50 delay 缺、0x62/0x63 timer 死)。
  - **战斗使用**:4 处(0x29/0x2B/0x2C 单目标因 item.ts 不传 eventObjectId 失效、0x50 战斗淡屏未实现)。
  - **战斗投掷**:0 处确认逻辑 gap(throw 路径 eventObjectId 已通过 ctx.target 解析;7 件食物 scriptOnThrow==0 为真值数据,非 bug)。
  - **技能消耗**:0 处(0x20 RemoveItem 战斗路径已验,蛊148/酒86 消耗链可达)。
  - **音频/演出**:0x47 PlaySound 两维 STUB(M6 音频未接)、0x31 战斗精灵替换 present-stub、0x73 战斗淡场 stub。
  - **标注/数据**:`events/all.json` 的 `giveItem._item` 标注 **100% 错**(off-by-61 命名空间错位),但仅人工阅读用,不影响运行时;`items.json` 数据层 byte-level 全量 0 mismatch。

---

## 2. opcode-gap 表(未实现 / stub / 边界偏差)

| opcode | sdlpal 语义 | sdlpalRef | 大世界 | 战斗 | 影响物品 | typePalRef | 建议 |
|---|---|---|---|---|---|---|---|
| **0x50** FadeOut | `VIDEO_UpdateScreen + PAL_FadeOut(op0?op0:1) + fNeedToFadeIn=TRUE`,屏幕淡黑 | script.c:1775-1782 | yes | **no** | 圣灵珠/五灵珠 cutscene scriptOnUse(id 260/263-267);引路蜂链邻接 | 大世界 event-system.ts:1985-1992(仅 tickEventSystem 内联);applyRawOpcode 无 case | 把 0x50 加入 applyRawOpcode switch(或战斗 dispatchBattleOpcode),让战斗 fallthrough 命中淡屏 |
| **0x62** ChasePause | `wChasespeedChangeCycles=op0; wChaseRange=0`;**play.c:235 每帧 `--wChasespeedChangeCycles`,到 0 复位 wChaseRange=1** | script.c:1967-1973 + play.c:235-238 | **partial** | na | 驱魔香类(大世界追逐控制) | 写:event-system.ts:3416-3422;**逐帧自减消费缺失**(全仓 grep 确认 `wChasespeedChangeCycles` 只被 0x62/0x63 写、无任何 `--`) | 在大世界帧 tick(monster chase 更新处)加 `if(--wChasespeedChangeCycles==0) wChaseRange=1`,否则暂停=永久 |
| **0x63** ChaseSpeedup | `wChasespeedChangeCycles=op0; wChaseRange=3`;计时消费同 0x62 | script.c:1975-1981 + play.c:235-238 | **partial** | na | 加速妖怪追逐道具 | 写:event-system.ts:3424-3430;**同 0x62 timer 死** | 同 0x62:加逐帧自减 + 到期 wChaseRange=1 复位 |
| **0x2D** SetPlayerStatus | `PAL_SetPlayerStatus(role, statusId, dur)`:坏状态仅当前=0 才设 / puppet 仅死人更久 / 好状态活人更久 | script.c:1367-1375 + global.c:2173-2277 | **stub** | yes | 金刚符63/黑狗血85/醍醐香126/忘魂花127/紫罂粟128/迷魂香135/幻蛊140/傀儡虫152/捆仙绳160 | 大世界 event-system.ts:3757-3763(STUB no-op);战斗 battle-opcodes.ts:395-417(real) | 实现大世界 player status 模型(持久 buff 存 gs),让金刚符/黑狗血等大世界用生效 |
| **0x2F** RemovePlayerStatus | `PAL_RemovePlayerStatus(role, statusId)`:仅 `status<=999`(>999=装备永久效果不清) | script.c:1399-1404 + global.c:2280-2308 | **stub** | yes | 灵心符65、银针255 | 大世界 event-system.ts:3757-3763(与 0x2D 共用 STUB);战斗 battle-opcodes.ts:433-441(real) | 随 0x2D 大世界 status 模型一并实现解状态 |
| **0x73** FadeScreen | `BackupScreen + MakeScene + VIDEO_FadeScreen(op0)` dither 淡入 | script.c:2140-2147 | yes | **stub** | 大世界过场(归隐/瞬移/靠岸);战斗罕用 | 大世界 event-system.ts:1938-1963(内联);applyRawOpcode 无 case → 战斗 default skip | 战斗维影响小,可低优补 applyRawOpcode case |
| **0x47** PlaySound | `AUDIO_PlaySound(op0)` 播音效 | script.c:1704-1709 | **stub** | **stub** | 所有带音效的物品脚本 | event-system.ts:3043-3047(两 context 共用 console.debug no-op) | 等 M6 音频系统接入,无逻辑副作用 |
| **0x31** ChangeBattleSprite | 临时换队员战斗精灵号(present 层渲染) | script.c:1429-1435 | na | **stub** | 梦蛇295 scriptOnUse 0x31[5,0] | battle-opcodes.ts:624-630(present-stub,consumed:true no-op) | 纯演出,待战斗 present 精灵替换实现后接线(可接受) |

> 注:0x81 / 0x84 / 0x5D **不再列为 gap**(任务前置误报,经 Read 核实已实现)。0x81/0x84 仅有两处 partial 边界偏差(见第 3 节),纳入逐物品表。

---

## 3. 逐物品 gap 表(仅列含非 ok finding 的物品 / opcode)

### 3.1 大世界使用维(overworld-use)

| 维度 | status | opcode/物品 | detail | sdlpalRef | typePalRef |
|---|---|---|---|---|---|
| 大世界用 | stub | 0x2D:金刚符63/黑狗血85 等 | 大世界用上 buff 类物品无效(STUB no-op,无大世界 status 模型,留 M6) | script.c:1367 / global.c:2173 | event-system.ts:3757-3763 |
| 大世界用 | stub | 0x2F:灵心符65/银针255 | 大世界用解负面状态无效(与 0x2D 共用 STUB case) | script.c:1399 / global.c:2280 | event-system.ts:3757-3763 |
| 大世界用 | partial | 0x22:还魂香95/赎魂灯96/孟婆汤97 | 复活 HP + 解毒 + fScriptSuccess 都对,但**未清 kStatusAll 全状态**(注释自承 follow-up,无大世界 status 模型) | script.c:1052-1102(:1072-1075 清状态) | event-system.ts:3621-3647 |
| 大世界用 | partial | 0x34:紫金葫芦270(炼丹) | 物品发放逻辑正确,但**物品框 dialog(itembox sprite + bitmap + 「获得 X」文本)被跳过**,玩家看不到获得提示 | script.c:1479-1512 | event-system.ts:3143-3164 |
| 大世界用 | partial | 0x05:圣灵珠260/五灵珠263-267 | dialog-clear + redraw 核心对,但**未实现 UTIL_Delay(op1?op1*60:60) 阻塞延迟**及 op2→UpdatePartyGestures;真实 cutscene op1=op2=0 故影响小 | script.c:3267-3297 | event-system.ts:1898-1929 |
| 大世界用 | partial | 0x81:桂花酒类(朝向判定) | 几何 1:1,但 (a) 缺 scene-bounds 检查(改用 resolveTargetNpc 近似);(b) jump 失败分支**未置 g_fScriptSuccess=FALSE** → consuming 物品朝向失败时可能被错误消耗 | script.c:2390-2435(:2402/2432) | event-system.ts:4031-4063 |
| 大世界用 | partial | 0x84:生成场景物 | 同 0x81 两偏差:缺 scene-bounds + jump 分支未置 g_fScriptSuccess=FALSE → 消耗 gate 偏差 | script.c:2473-2509(:2484/2501) | event-system.ts:3905-3925 |
| 大世界用 | partial | 0xA1:cutscene 队伍聚拢 | trail 聚拢效果对,但未逐字段设 `rgParty[1..].y=party[0].y-1`、未显式 UpdatePartyGestures(功能等价,非 1:1) | script.c:2998-3014 | event-system.ts:2973-2983 |
| 大世界用 | partial | 0x17:大蒜84(scriptOnUse 0x17[17,22,30]) | 装备效果写入对,大世界正确;此 opcode 主用于 scriptOnEquip(见装备维) | script.c:752-766 | event-system.ts:3504-3521 |

### 3.2 战斗使用维(battle-use)—— 核心 bug:item.ts 不传 eventObjectId 致单目标失效

| 维度 | status | opcode/物品 | detail | sdlpalRef | typePalRef |
|---|---|---|---|---|---|
| 战斗用 | partial | 0x29:寿葫芦/净衣符类(战斗施毒/正向毒) | 战斗 `item.ts performItem` 调 runScript **不传 opts.eventObjectId** → 单目标(op0==0)时 `currentEventObjectId=undefined` → targets=[] → **不施毒**;另 item targetIdx 是 state.players 槽 index 非 roleId,即便 seed 也需转换。仅 applyAll(op0!=0)或敌普攻(attack.ts seed roleId)生效 | script.c:1257-1285 | event-system.ts:3704-3722;item.ts:98(未传 eventObjectId) |
| 战斗用 | partial | 0x2B:净衣符64(scriptOnUse 三连 0x2b[0,种,0] 全单体) | **真实 bug**:0x2B 不在 dispatchBattleOpcode → fall applyRawOpcode,因 item.ts 不传 eventObjectId → 单目标 targets=[] → **战斗中用净衣符解单个队员毒无效** | script.c:1331-1347 | event-system.ts:3724-3738;item.ts:98 |
| 战斗用 | partial | 0x2C:九节菖蒲89/鬼枯藤129/毒龙胆278(三件全 op0=0 单目标) | dispatchBattleOpcode **无 0x2C case** → fall applyRawOpcode,因 item.ts 不传 eventObjectId → 单目标 no-op → **战斗按等级治毒治不了目标队员**。仅全队(op0!=0)可用,但实测三件全单目标 | script.c:1349-1365 / global.c:1567 | event-system.ts:3740-3755;item.ts:98-115 |
| 战斗用 | ok | 0x2D/0x2F:金刚符/灵心符/银针(战斗) | 战斗用 status set/remove **正确**(battle-opcodes.ts 用 ctx.target/ctx.caster 解析,不依赖 eventObjectId,故 0x29/0x2B/0x2C 单目标 bug 不影响) | script.c:1367/1399 | battle-opcodes.ts:395-417 / 433-441 |
| 战斗用 | partial | 0x17:大蒜84(战斗用) | 0x17 fall applyRawOpcode 写 gs 装备效果,但战斗 combat math 读 live playerRoles clone(只 HP/MP 回写),mid-battle 0x17 不反映在当回合战斗属性 | script.c:752-766 / game-state.ts:1397-1408 | event-system.ts:3504-3521 |
| 战斗用 | partial | 0x19:舍利子/玉菩提等永久增益(战斗用) | 同 0x17:写 gs.PlayerRolesRuntime 但不在 live battle clone;且 HP/MP 行可能被 writeback 覆盖。属大世界永久增益物品,战斗少用 | script.c:813-832 | event-system.ts:3556-3573 |
| 战斗用 | na→no | 0x50:战斗淡屏 | 0x50 不在 applyRawOpcode → 战斗 default skip(见 opcode 表) | script.c:1775-1782 | event-system.ts:1985(仅大世界) |

### 3.3 战斗投掷维(throw)

| 维度 | status | opcode/物品 | detail | sdlpalRef | typePalRef |
|---|---|---|---|---|---|
| 投掷 | ok | 0x66 投掷武器(32 件武器) | w=op1*5+attackStr*rng(0,3),simulateMagic 1:1,target=ctx.target.idx;throw-item.ts 注入 playerRoles | script.c:2007-2014 | battle-opcodes.ts:274-305 |
| 投掷 | ok | 0x21/0x28/0x2E/0x39/0x42/0x5B 等(梅花镖/银针/吸星锁/符镖卵蛊) | 投掷致伤/致毒/致敌状态/吸血/模拟法术/敌血减半全对齐;throw 经 ctx.target 解析,无 eventObjectId 依赖 | script.c 各 case | battle-opcodes.ts 各 case |
| 投掷 | na(真值数据) | 糯米75/盐巴77/大蒜84/黑狗血85/雄黄酒88/烧肉93/腌肉94(7 件 throwable 但 scriptOnThrow==0) | **非 bug**:byte-level 验证 flagsRaw 与原始 SSS 字节一致,sdlpal 真值数据(食物可投但无专属投掷脚本,走默认/特殊 NPC 触发)。注意 throw-item.ts 对 scriptOnThrow==0 应走默认路径而非空脚本崩溃 | global.h:151 + fight.c:4332 | data/extracted/data/items.json(id 75/77/84/85/88/93/94) |

### 3.4 技能消耗维(skill-consume)

| 维度 | status | opcode/物品 | detail | sdlpalRef | typePalRef |
|---|---|---|---|---|---|
| 技能消耗 | ok | 0x20 RemoveItem:蛊148(三尸咒352/万蛊蚀天372/毒吞天下373 消耗)、酒86(酒神370 消耗) | 战斗 magic.scriptOnUse 的 0x20 fall applyRawOpcode(battleCtx.gs 在)→ 真扣物品;完整 1:1(countItem 条件 + 负 add + 装备槽匹配 + 失败跳转)。gs 路径已验 | script.c:977-1024 | event-system.ts:3006-3041;magic.ts:172(注入 gs) |

### 3.5 装备维(equip)

| 维度 | status | opcode/物品 | detail | sdlpalRef | typePalRef |
|---|---|---|---|---|---|
| 装备 | ok | 0x17(105 件武器/防具 scriptOnEquip,如长鞭) | rgEquipmentEffect[part][row][role] 写入 1:1,PLAYERROLES_ROW 表逐字段对齐 global.h:299-336 | script.c:752-766 | event-system.ts:3504-3521;equip-effect.ts:94-160 |
| 装备 | ok | 0x30 临时百分比增益:梦蛇295(scriptOnUse 0x30[17,100]/[20,100],经装备路径) | 战斗写 Extra bonus=base*op1/100,base 取未 buff 不叠加,战末清,1:1 | script.c:1406-1427 | battle-opcodes.ts:580-621 |
| 装备 | stub(可接受) | 0x31 战斗精灵替换:梦蛇295 | present-only 演出,逻辑层无副作用,present-stub 对齐当前 D17 战斗演出全 stub 现状 | script.c:1429-1435 | battle-opcodes.ts:624-630 |

### 3.6 边界 / 小偏差(低优,非阻塞)

| status | opcode | detail | sdlpalRef | typePalRef |
|---|---|---|---|---|
| partial | 0x61 jump if not poisoned | 两实现都未排除 level>=99 装备毒(sdlpal global.c:1669-1675 显式 skip);role 仅带装备毒时 type-pal 误判"已中毒"不跳。常规毒一致 | script.c:1957-1965 / global.c:1616 | event-system.ts:3833;battle-opcodes.ts:1047 |
| ok(注释 stale) | 0x2C overworld | 注释 line425/3742 写"fallback 全清/简版 level cap 99" 是 **STALE**,实际 4229 是真 level 实现(注入 _objectPoisons 取真 level) | script.c:1349 | event-system.ts:3740;curePlayerPoisonByLevel@4229 |
| 可达性风险 | 0x5A halve player HP | handler 正确,但 performBattleAction 现强制 item→enemy 目标,无影毒-use 选队员 UI 路由可能未通(handler 就绪,触发链待验) | script.c:1887-1893 | battle-opcodes.ts:693-711 |

---

## 4. 标注 + 数据问题

### 4.1 标注根因:`giveItem._item` off-by-61 命名空间错位(high)

- **现象**:`events/all.json` 共 425 条 giveItem,**337 条带 `_item` 全部为 off-by-61 错值**(337/337 命中 `wordById[itemId+61]`),另 88 条 `itemId>234` → `itemId+61>295` 越界返回 undefined 静默丢 `_item`。例:itemId=145 标"凤凰羽毛"(实为 wObjectID 206),但 wObjectID 145 = "灵蛊"。
- **根因**:`annotate.ts:22` `w.items[id]` 直接以 wObjectID(61..295)索引 0-based 数组 `Words.items`(io/word.ts:95 `readBlock(buf, ITEMS_OFFSET=61, 235)`,index 0 = wObjectID 61)。两命名空间差 ITEM_OBJ_START=61。`giveItem.itemId` = 原始 opcode operand = wObjectID(disasm.ts:206;items.ts:83 `id=ITEM_OBJ_START+i`)。`symbols.json` 不存在 → `s.item` 兜底永不命中,每条都落坏分支。
- **影响**:`_item` 仅供人工阅读(GiveItemCommand recompile 不读),**不影响运行时正确性**,但**严重误导本次物品审计**——按 `_item` 会把"给 A 物品"误判成"给 B 物品"。本审计已绕开 `_item`,直接用 items.json `_name`(以 wObjectID 为 key)。
- **修法**:`annotate.ts:22` 改为 `w.items[id - 61]`(用 `_utils.ITEM_OBJ_START` 常量),或更稳妥复用 cli.ts:173 已解析的以 wObjectID 为 key 的 items 表 `_name`(`items.find(i=>i.id===id)?._name`),同时自然覆盖 itemId>234 的 88 条合法 wObjectID 235..295。
- **测试固化(med)**:`annotate.test.ts:18-19/24-25/49/63-64/82-83` 把 itemId 当 0-based 索引断言(itemId:2→'灵葫芦'),把 bug 锁死。修 annotate.ts 后须同步改测试用例为 wObjectID 前提。
- **同类潜伏(low)**:`annotate.ts:27/37/42` 的 `_spell`/`_enemy`/`_enemyTeam` 同款 0-based 数组接 wObjectID(spell 偏 296、enemy 偏 398);`_enemyTeam` 更用 enemy 名表索引 team 号(命名空间彻底错)。目前因无对应具名命令 + startBattle 在 disasm 从不 emit 而**休眠**,建议随 _item 一并修 + RULES 重构为显式声明 id 命名空间。

### 4.2 items.json 数据层:byte-level 全量 0 mismatch(无 bug)

- `parseItems`(resources/parsers/items.ts)对齐 sdlpal `global.h:156-165 tagOBJECT_ITEM`(WIN95 7-WORD=14 字节)+ `global.h:135-141 tagITEMFLAG`,**完全正确**。
- 对 raw SSS.MKF chunk 2(7910 字节,565 个 14-byte OBJECT,div14 余 0、div12 余 2 → 确认 WIN95 格式)独立 14-byte stride 解码,全 235 个物品逐字段(bitmap/price/scriptOnUse/Equip/Throw/Desc/7 flag 位/6 equipableBy 位)对照 items.json **全量 0 mismatch**,含任务点蛊148/酒86。
- 字段偏移(bitmap=0/price=2/scriptOnUse=4/scriptOnEquip=6/scriptOnThrow=8/scriptDesc=10/flags=12)= tagOBJECT_ITEM 精确匹配;flag 位映射(usable=1<<0..sellable=1<<5,equipableBy[i]=1<<(6+i))= tagITEMFLAG 精确匹配。chunk 选取(cli.ts:172 SSS.MKF chunk 2)= global.c:408。id 体系=全局 wObjectID,名称索引 words.items[i] 对齐 WORD.DAT offset 61。
- 7 件 throwable+scriptOnThrow==0 食物 + id295 梦蛇 equipable 无角色位 = sdlpal 真实游戏数据特征(非解析错),flagsRaw 与原始字节一致已验。

---

## 5. 修复建议清单(按严重度排序)

### High(真实功能缺陷,玩家可感知)

1. **已修:战斗单目标治毒/解毒/施毒(0x29/0x2B/0x2C)**——早期审计指出 `performItem` 不传 `opts.eventObjectId` 会让单目标(op0==0)分支 no-op。当前实现已在 `dispatchBattleOpcode` 用 `ctx.target` 解析目标 roleId,绕开 `eventObjectId` 依赖;见 `battle-opcodes.ts` 0x29/0x2B/0x2C 分支与 `battle-opcodes.test.ts` 的 "战斗单目标(ctx.target 解析)" 用例。净衣符64、九节菖蒲89/鬼枯藤129/毒龙胆278 等战斗内单体治毒/施毒路径不再属于 High 缺口。
2. **大世界 player status 模型缺失(0x2D/0x2F STUB)**——`event-system.ts:3757-3763` 两 opcode 大世界 no-op,金刚符63/黑狗血85 等上 buff、灵心符65/银针255 解状态在大世界**完全无效**。修法:在 gs 建持久 player status 表(对齐 battle rgPlayerStatus 语义),实现 set(坏/puppet/好三分支 + 活人/死人/更久门控)+ remove(<=999 才清)。
3. **修 `giveItem._item` 标注 off-by-61**(annotate.ts:22)——虽不影响运行时,但 100% 错值会持续误导后续物品/事件审计与人工阅读。改 `w.items[id-61]` 或复用 wObjectID-key items 表 `_name`,同步改 annotate.test.ts 锁死断言。

### Med(逻辑偏差 / 体验缺失)

4. **0x62/0x63 追逐 timer 死(永不到期)**——event-system.ts:3416/3424 只写 `wChasespeedChangeCycles`,全仓无 `--` 消费(grep 确认),致驱魔香/加速效果**永久生效**,偏离原版"a while"。修法:在大世界帧 tick / monster chase 更新处加 `if(--wChasespeedChangeCycles==0) wChaseRange=1`(对齐 play.c:235-238)。
5. **0x50 战斗淡屏未实现**——只在 tickEventSystem 内联,applyRawOpcode 无 case → 战斗 fallthrough default skip。把 0x50 加入 applyRawOpcode switch 或 dispatchBattleOpcode。
6. **0x22 复活未清全状态(大世界)**——event-system.ts:3640 follow-up,缺 sdlpal:1072-1075 的 kStatusAll 清除;随 #2 大世界 status 模型一并补。
7. **0x81/0x84 jump 失败分支未置 g_fScriptSuccess=FALSE**——`jumpToGlobalIp` 不设 fScriptSuccess,致 consuming 物品在朝向/障碍失败时可能被错误消耗。修法:这两 case 的 jump 分支显式 `gs.fScriptSuccess=false`(对齐 script.c:2402/2432、2484/2501)。

### Low(演出 / 边界 / 真值数据 / 注释)

8. **0x34 紫金葫芦炼丹物品框 dialog 缺**(event-system.ts:3164)——逻辑发物品正确,缺「获得 X」视觉提示(present 层)。
9. **0x47 PlaySound 两维 STUB**——等 M6 音频系统;无逻辑副作用。
10. **0x73 战斗淡场 stub / 0x31 战斗精灵替换 present-stub**——纯演出,待战斗 present 层实现接线。
11. **0x61 level>=99 装备毒边界**——两实现未 skip 装备毒(global.c:1669-1675),仅装备毒 role 误判;常规毒一致。
12. **0x2C 注释 stale**(event-system.ts:425/3742)——"fallback 全清/简版 level cap 99" 与实际 4229 真 level 实现矛盾,清理误导注释。
13. **0xA1 逐字段非 1:1**——未设 `rgParty[1..].y-1` / 未显式 UpdatePartyGestures(功能等价,可不改)。
14. **annotate spell/enemy/enemyTeam 同类命名空间错位**(休眠)——随 #3 重构 RULES 显式声明 id 命名空间。

---

## 附:验证修正记录(verify verdicts → 任务前置修正)

| 任务前置断言 | Read 核实结果 | 处理 |
|---|---|---|
| 0x81 两处实现都没有(gap) | 已实现 event-system.ts:4031-4063(大世界+战斗 fallthrough),仅 scene-bounds + fScriptSuccess 偏差 | **剔除 gap → 降级 partial** |
| 0x84 两处实现都没有(gap) | 已实现 event-system.ts:3905-3925,同两处偏差 | **剔除 gap → 降级 partial** |
| 0x5D 两处实现都没有(gap) | 已实现 event-system.ts:3826-3832 + isPlayerPoisoned@2776,对齐 global.c:1724-1730 | **剔除 gap → 两维 ok** |
| 0x50 屏幕淡出(gap) | 大世界 ok(内联),**战斗确实 no** | **保留:战斗 gap** |
| 0x62/0x63 暂停/加速追逐(gap) | 写入 ok,**逐帧自减消费缺失 → timer 死** | **保留:partial(timer 死)** |
