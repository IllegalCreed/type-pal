# N3-1 P7-R13 源指令语义闭包独立审计报告（Kimi，架构 / SDLPal 语义红队）

**基线**:d263efd3(实现核心 c3d620a9)· 只读 · 未修改实现/产物/baseline/任务卡 · 未读 GLM 报告
**方法**:独立三路重建(SDLPal script.c/scene.c/play.c/global.c 语义清单 → translate-events/translate-enemy-scripts 去向映射 → reforge 运行时执行覆盖)+ projects/pal 最终产物一手抽查 + 全量 0x08/0x04/0x76 站点普查。与 Codex 金丝雀的差集在 §6/§7。

---

## §1 确认最终缺失(最终产物中没有等价物,用户可感知)

### M1.【新发现·最重】0x04 callScript 的 owner 操作数 off-by-one,12 个站点错绑实体

- **源**:data/extracted/events/all.json 'all' 段,12 个 `0x04` 且 op1≠0 的站点:L_3736(op1=71)、L_3739(74)及相邻 2 个无标站点(72/75);L_13356/L_13359/L_13362/L_13365 及相邻 4 个无标站点(op1=1750..1757)。全部被调方为 L_35644(首条指令即 `0x49[0xFFFF,1,0]` setObjState **self**,还含 0x14 设帧、0x6E 走步、0x09 等待)。
- **SDLPal 语义**:script.c:3258-3265 `PAL_RunTriggerScript(op0, op1?op1:curEvt)`;op1 是 1-based 全局对象号,被调方内部 `pEvtObj = &lprgEventObject[wEventObjectID - 1]`(script.c:624-639),0xFFFF 自引用解析到该对象。
- **最终去向**:translate-events.ts:1549 `const callOwner = (o[1] ?? 0) !== 0 ? \`e${o[1]}\` : owner` —— **未做 -1**。对照同文件 :970-974 的 entRef:`e${v - 1}`,且注释明记"曾直译 e${v} 全体 +1 错位(2026-07-03 用户报)"——同一 bug 模式在 0x04 路径上残留。
- **产物实证**:projects/pal/content/scenes/s093.json 中 **e1749** 的 trigger 行为依次 `setEntityState/setEntityFacing/setEntityFrame` 作用于 **e1750、e1751…**;源意图是 op1=1750..1757 → e1749..e1756,产物错一格变 e1750..e1757:该变的不变(e1749 自身),不该变的被变(e1757)。门禁全绿是因为错目标实体同样存在,不产生悬空引用。
- **用户影响**:12 处剧情子脚本作用到错误 NPC:正确对象状态/朝向/帧不切换,错误对象被改。视觉错位、后续按状态分支的脚本(0x94)可能走错路。
- **置信度:高**(语义链 + 产物双重实证)。

### M2. 0x08 checkpoint 语义全丢;前缀副作用在重触发时重放,含 6 处物品、5 处金钱刷取点

- **源**:all.json 'all' 段共 **36 个 0x08**(普查,仅 L_6344 带 label)。全部 36 站点的段尾都是 plain `0x00`。
- **SDLPal 语义**:script.c:3335-3341——0x08 把 `wNextScriptEntry` 推进到下一条并**继续执行**;段尾 0x00 结束并把 checkpoint 地址经 play.c:153 回写进宿主脚本槽(随存档)。即"**首触发跑全程,再触发只跑 checkpoint 之后的尾巴**"。
- **最终去向**:translate-events.ts:1059-1060 `push(undefined)`;canonical 词汇无 checkpoint 概念;`grep -r checkpoint projects/pal/content` **0 命中**;runtime 也无承载(v4 stage / v5 FlowCursor 均为 stage 粒度,重触发从头重跑同段)。
- **前缀副作用普查**(每站回看 ≤60 条指令):
  - **giveItem 在 checkpoint 前(重触发=再拿一次)6 站**:L_4221→item 108;L_5182→**67/68/69/70/71 五连**;L_6379→199;L_9825→284;L_15033→154;L_17190→80。
  - **cash 在 checkpoint 前 5 站**:L_741(+50)、L_7445、L_7482、**L_19289(+30000×2)**、L_17190(与 giveItem 同站)。
  - partyPos 前缀约 8 站(重触发=队伍被反复传送,如 L_9410 六连 partyPos);其余为 setObjState/setTrigger/setAuto/sceneOverride(幂等度不一)。
  - 具体链实证(L_9825):长对话 → setObjState[878] → giveItem → **0x08** → 两句短对话 → 0x00。原版再触发只剩两句短对话;reforge 每次重触发全长对话重播 + 物品再入包。
- **用户影响**:可无限刷物品/钱(L_19289 每次 6 万);长 intro 重播;部分站队伍被传送回旧位置。
- **置信度:高**(机制与站点静态确认;单站可否实际重触发取决于 triggerMode,建议动态抽验 L_9825 与 L_19289 各一次)。

### M3. 0x0A confirm 运行时恒返回"是",全部 26 个是/否选择失效

- **源**:0x0A 全游戏 26 用(opcode-status.md:197,水果贩等)。SDLPal script.c:3373-3387:确认框选"否"→ 跳 op0。
- **最终去向**:迁移为 `confirm{onNo}`(翻译无损);但 runtime main.ts:2581-2585:`confirm` host **stub,`return true` 恒成立**,仅 `host.report('confirm 是/否框未实现(暂按"是")')`。
- **用户影响**:所有是/否分支恒走"是",onNo 臂是死代码;且 report 只报一次,玩家无任何感知。
- **置信度:高**。

### M4. end.reset(0x02) 的 idleFrames 被提取后无人读取,跨触发延时闸门语义全丢

- **SDLPal 语义**:script.c:3219-3237——`op1` 帧闸门:恢复点被重入 `op1` 次才放行,计数器 `nScriptIdleFrame` 是事件对象字段**随存档**(global.h:109)。
- **最终去向**:提取器 opcodes.ts:57-62 已命名 `idleFrames` 字段;translate-events.ts:841-846 `end.reset` **只读 resetTo**;packages/migrate 内对脚本 idleFrames 的引用为 0(pal-battle-sprites.ts 的同名是另一概念)。
- **用户影响**:所有 reset 型延时循环节奏交给新引擎默认,延时类剧情节拍失真。
- **置信度:高**(机制);受影响站点数未普查(建议并入 §8 G1 的指令账)。

### M5. 敌人 12 个 pending 运行时零 fallback;明王缺口比金丝雀所列更大

- **产物**:projects/pal/content/enemies.json 153 敌,无 pending 标记;运行时只播存在的 choreography/ai.rules,缺的部分**静默不存在**(battle-session.ts:276 起)。
- **12 个 pending 敌人**(内存复跑 `buildPalMigration` 实测):enemy-420/421/422/435/463/469/**483 林月如二**/486/499/**519 明王**/539/547。
  - 林月如二(483):turnStart 段1 `0x77/0x85/0x43` 未翻(金丝雀已列)。
  - **明王(519):turnStart 段2 `0x43`、`0x19×8`、`0x22`、`0x1D`、`0x92` 未翻**(金丝雀未列)——含 8 条属性增减、复活、HP/MP 同时增减与施法前摇,是 boss 战机制+演出缺口,不只是音乐。
- **机制根因**:translate-enemy-scripts.ts 是**独立 opcode 白名单**,fall-through :319-321 记 pending;主翻译器已实现的 opcode(0x77/0x85/0x43 见 translate-events.ts:1061-1066、:1216)在敌人语境被丢。pending 只进内存 report(migrate-enemies.ts:150-158;pal-migration.ts:602),**无任何门禁消费**,不落盘。
- **置信度:高**。

### M6. 战斗 choreography 混合词汇,运行时只执行 4 种命令,其余记日志丢弃

- enemy.ts:55-62 choreography 仍是 v4 `Command[]`;battle-session.ts:651-731 只执行 dialog/playSound/fleeBattle/endBattle;**wait 显式忽略**(:726-727);其余一切 kind 落 default `演出命令 X 未接(记日志)`(:728-729)。
- **用户影响**:敌人战斗演出里的 setEntityState/giveItem/cameraPan/fade 等静默不存在;与 M5 叠加(能翻出来的也执行不全)。
- **置信度:高**。

### M7. 敌脚本 battleEnd 只取 stages[0],多段链第 2 段起全丢且无 pending

- translate-enemy-scripts.ts:382-384。无 pending、无 note。
- **置信度:高**(机制);站点数待普查(建议 §8 G1 入账)。

### M8. 敌脚本 0x79 队伍门在"段内有后续对话"时整支丢弃

- translate-enemy-scripts.ts:166-176,注释自认"避免双套台词":门条件与跳转目标台词**都丢**。
- **置信度:高**。

### M9. setPalette 5 组 palette5↔0 无可执行替代

- 0x8B 整条丢弃(translate-events.ts:944-950,note `known-deferred`);reforge 无逐场景调色板(main.ts:961 恒定 standard palette),schema 无对应命令。14 条 deferred 中 4 条有真彩烘焙替代(与金丝雀一致),**其余 5 组无替代**。
- **用户影响**:特定场景色调氛围缺失(表现层)。
- **置信度:高**。

---

## §2 已被等价补回(确认有现代等价物,不计缺失)

| 项 | 等价机制 | 证据 |
|---|---|---|
| 读档后 onEnter 不重跑 | 对齐原版 `fEnteringScene=FALSE`(global.c:634) | main.ts:3872 注释 |
| 读档 BGM 恢复 | `resolveRestoredMusic` ≈ sdlpal res.c:223 按 wNumMusic 重播 | save/ops.ts:173-181 |
| 读档清毒三件套 | sdlpal 读档 rgPoisonStatus memset 不恢复(global.c:630,原版即如此) | main.ts:3829-3835 |
| setPalette 中 4 条 | 真彩资产烘焙替代(金丝雀口径,抽查机制成立) | translate-events.ts:947 + 资产层 |
| loadScene 邻接 fade | foldDoorPattern 吸收(:1717-1758)+ 运行时 260+260(main.ts:1505/1532)——**有切换淡变但时长被固定**,属"等价机制+时长近似",不彻底但非全黑 | 见 §4 近似组 |
| 0x08 中 2 个站点 | C8 augmentation 覆盖 1、s048 定点修复 1(转述金丝雀,未逐案复验) | 任务卡 P7-R13 |
| screen wave / ambience / hostile 等隐式态 | 均随存档并有运行时消费 | screen-wave.ts、character.ts:28-30、main.ts:4114 |

---

## §3 仅风险待动态验证(结构性开放口,当前数据未造成实害或需实机确认)

| # | 项 | 证据 | 为什么只是风险 |
|---|---|---|---|
| R1 | **onDefeated canonical 写入黑洞**:战后脚本用 v4 ScriptRunner 跑在 `world.script` 上;v5 工程下那是 `legacyWorldScriptScratchV5` 的 **structuredClone**(legacy-runtime-shell-v5.ts:202-218),setFlag/setVar/setEntityState 永远到不了 canonical,且下次 sync(main.ts:855-858)即被覆盖 | main.ts:2474-2490 | 当前 15 个 onDefeated 只含 branch/giveItem/dialog/stopScript,暂无写入类命令 → 无实害;新增即踩雷 |
| R2 | 0x65 换装(actorSpriteOverrides)读档即丢;原版 `rgwSpriteNum` 随 SAVEDGAME | main.ts:3430 | 需"换装剧情中途存档读档"复现(如钓鱼 sprite-259) |
| R3 | vanishEntity 重生纯临时态;原版 sVanishTime 随存档 | main.ts:1390-1398 | 0x4B/0x52 后读档对象提前重现,低风险 |
| R4 | 0x8A pendingAuto 悬置:后续 0x07 永不出现或被 fold 时标记静默蒸发 | translate-events.ts:1384-1401 | 站点普查+动态验证 |
| R5 | 0x79 双映射表:事件侧 `ROLE_SLUGS[op0]`(:1530)vs 敌脚本 rgwName word 36-41(translate-enemy-scripts.ts:17-25) | 两处 | 若同一 op0 域不同解释,存在误判分支 |
| R6 | giveItem itemId=0 烘焙修正表查不到时产出 `itemId:"0"` | translate-events.ts:929-943、表 :463-467 | 运行时给 "0" 号物品的行为未验证 |
| R7 | chasePlayer speed 不映射走速、近似 wait ms + 固定节拍 | main.ts:1358-1388 | 观感近似 |
| R8 | setPartyFacing member>0(跟随者)静默忽略 | main.ts:1555-1560 | 低频 |
| R9 | 0x76 × 4(见 §4 N4 的反向论证):理论≈no-op,但 DOS 真机对 0xFFFF 图号行为未验证 | all.json 4 站 | 动态验证后定组 |

---

## §4 真实 no-op / 用户批准近似(有源码或铁律证据,不应计 bug)

| # | 项 | 证据 |
|---|---|---|
| N1 | **0x16 op0==0 静默丢弃**(translate-events.ts:1196-1205) | sdlpal script.c:741 `if (op0 != 0)`——本就 no-op |
| N2 | **0x24/0x25 op0==0 静默丢弃**(:1583-1585) | sdlpal script.c:1137/1147 同样 `op0!=0` 才写,本就 no-op |
| N3 | **0x9B × 2 丢弃**(:1057-1058) | sdlpal 自认 `FIXME: This is obviously wrong`(script.c:2769) |
| N4 | **0x76 × 4 丢弃**(:1155-1156) | 四站 operands 全 `[0xFFFF,0,0]` 非有效 FBP 图号;四站上下文均有**已迁移的**显式 fadeOut/fadeIn 相邻(普查命令见 §6);WIN95 分支本就是清黑屏 → 丢弃≈等价(留 R9 尾巴) |
| N5 | "10 个非默认 0x05 延时未保留" | sdlpal script.c:3267-3297:延时仅 `UTIL_Delay(op1?op1*60:60)`ms 级 pacing,且只在非对话/非 RNG 分支;铁律 6 演出损耗可接受——**但应显式入账而非静默** |
| N6 | 0x78/0xA6/0xA7 | knownNoOp 有案(:1634-1636 等;opcode-status.md:210) |
| N7 | 0xA3 CD 轨丢弃回退 RIX | sdlpal 无 CD 同样回退(script.c:3023-3036) |
| N8 | 固定参数近似族:FRAME_MS=40(:476)、0x85×80、0x50/51×600/档、0x73×720、0x4B 固定 2s、0x52÷10、0x80 3200/800、0x4F 900、0x35 level=4、0x37 rate=16 | 时间换算/观感级近似,建议统一登记 |
| N9 | "条件臂为 0 → default 未知 opcode gap"(0x1B/1D/22/55/58/74/81/83/86/90/95 无臂变体) | 语义多为 no-op 却按阻塞 gap 计——门禁噪声,应显式分类而非混进 gap |

---

## §5 门禁为什么没挡住(机制分析)

1. **gaps 的定义性盲区**:`recordGap` 只在 walkBody"走到且不识别"时记录(translate-events.ts:668-680),且 `reachable:true` 是字面量写死(:110-118)。`push(undefined)`(0x08/0x9B/0x76)、note 吸收(setPalette)、静默丢弃(idleFrames、0x05 操作数)**从定义上就不是 gap**。"gaps=[]"只证明"没有撞见不认识的",不证明"认识的都翻了"。
2. **flowCuts 是纯计数器**(:881/:1684/:1707),无地址/owner 明细,过门后无法考古。
3. **P7 ledger 验登记不验覆盖**:entries 克隆自 P6(p7-transition-ledger.ts:242-244),哈希链证明"登记簿没漂移";一条在 v4 期被 NOP 的指令从不进入任何 entry,ledger 对它无感。
4. **notes/pending/lossy 全在内存 report**:573 段转移池(:317-318/:1012-1013)无消费者(全仓仅一条测试断言);enemy pendingScripts、skill pending/lossy 不落盘、无 assert;唯一落盘的 item-use 诊断已清零,造成"诊断为空=无损"的错觉。
5. **敌人钩子翻译器独立白名单**与主表漂移(M5 根因)。
6. **运行时无"命令×上下文执行矩阵"**:confirm stub、choreo default log、onDefeated scratch 都是"schema 有命令、运行时静默降级"——C8 的 G4 消费矩阵模式没有推广到脚本命令与演出通道。
7. **身份换算无单源真值**:entRef/pcRef/callOwner 三处手写 ±1,2026-07-03 已爆过一次同款;没有任何 oracle 从产物反解源 operand 对账。

---

## §6 可复跑命令与计数

```bash
# 0x08 全量普查 + 前缀副作用分类(M2 全部数字来源)
python3 - <<'EOF'
import json
cmds = json.load(open('data/extracted/events/all.json'))['segments'][0]['commands']
SE = {0x1F:'giveItem',0x49:'setObjState',0x24:'setAuto',0x25:'setTrigger',0x1E:'cash',0x46:'partyPos',0x6D:'sceneOverride'}
last=None; labels=[]
for c in cmds:
    if c.get('label'): last=c['label']
    labels.append(last)
sites=[(i,labels[i]) for i,c in enumerate(cmds) if c.get('opcode')==0x08]
print('0x08 total:', len(sites))   # → 36
for i,lbl in sites:
    fx=[(SE[c2['opcode']],c2.get('operands')) for c2 in cmds[max(0,i-60):i] if c2.get('opcode') in SE]
    if fx: print(lbl, fx[-4:])
EOF

# 0x04 op1≠0 站点(M1)→ 12 站,全部 call L_35644
python3 -c "
import json
cmds = json.load(open('data/extracted/events/all.json'))['segments'][0]['commands']
print([(c.get('label'), c['operands']) for c in cmds if c.get('opcode')==0x04 and c['operands'][1]!=0])
"

# 0x76 站点与操作数(N4)→ 4 站全 [65535,0,0]
python3 -c "
import json
cmds = json.load(open('data/extracted/events/all.json'))['segments'][0]['commands']
print([c['operands'] for c in cmds if c.get('opcode')==0x76])
"

# off-by-one 产物实证:projects/pal/content/scenes/s093.json 搜 e1749 的 behaviors
# 敌人 pending 清单:内存执行 loadPalMigrationSources + buildPalMigration,读 report.enemies.pendingScripts
# 门禁定义:translate-events.ts:668-702(gaps/flowCuts)、p7-transition-ledger.ts:195-282、migration-validate.ts:403-637
```

---

## §7 新增差集与误报

### 我发现而 Codex 金丝雀未覆盖的(按严重度)

1. **M1:0x04 callOwner off-by-one,12 站,产物实证错绑实体**(金丝雀完全未提)。
2. **M3:confirm 运行时 stub 恒"是",26 个源站点的选择分支运行时全废**(金丝雀未提;这是运行时层缺失,不在迁移报告任何维度)。
3. **M2 的站点级普查**:giveItem×6(item 108/67-71/199/284/154/80)、cash×5(含 L_19289 +30000×2)——金丝雀只有"31 个重播风险"总数,未识别**可无限刷物品/钱**的利用类与子集清单。
4. **M4:end.reset idleFrames 提取后无人读**(控制流参数丢失,金丝雀未提)。
5. **M5-明王 enemy-519 的缺口明细**(0x43/0x19×8/0x22/0x1D/0x92;boss 机制+演出,金丝雀只点林月如二)。
6. **M7:敌 battleEnd 只取 stages[0]**(无 pending 记录)。
7. **M8:敌 0x79 队伍门整支丢弃**。
8. **R1:onDefeated scratch 写入黑洞**(v5 工程下结构性地雷)。
9. **R2/R3:0x65 换装与 vanishEntity 读档丢失 vs 原版随存档**。
10. **R4 0x8A 悬置蒸发、R5 0x79 双映射表、R6 giveItem "0"、R8 setPartyFacing member>0**。
11. **M6 的机制细化**:choreography 混合 v4 词汇 + default log-only 清单(金丝雀只泛指"敌人战斗演出")。

### 我认为 Codex 误报/高估的

1. **0x9B × 2 列"直接丢弃"**:有 sdlpal 自认 FIXME 证据,应归真实 no-op(§4 N3)。
2. **0x76 × 4 列"直接丢弃"**:operands 全 0xFFFF 非有效图号 + 相邻显式 fade 已迁移,丢弃≈等价;应归"仅风险待动态验证"(§4 N4 + §3 R9)。
3. **"10 个非默认 0x05 延时未保留"**:60ms 级演出 pacing,按铁律 6 属批准近似;真正的问题是**静默**而非丢弃本身,应转为"登记入账"项而非缺失项(§4 N5)。
4. 若 573 池/任何清单计入了 0x16、0x24/0x25 的 op0==0 变体:原版本就 no-op(§4 N1/N2)。
5. 不确认不否认:金丝雀"3 个丢整段正文"的具体站点我未独立复现,不列入误报也不背书。

---

## §8 fail-closed 门禁建议(最小结构性,非堆 golden)

1. **G1 指令级覆盖账(核心)**:生成期对每个可达源指令(可达枚举复用 script-control-flow-audit 的入口/CFG)force 登记 disposition ∈ `translated(kind) | folded(evidence) | asset-baked | runtime-equivalent | explicit-noop(evidence) | approved-lossy(ticket)`;任何 `push(undefined)`、note、静默丢操作数必须落账;append-only 存 `_transitions/instruction-disposition-v1.json`,MG2 同 P7 待遇验签;**未登记 = 写前失败**。573 池、0x08、0x05、setPalette、idleFrames 全部因此显性化。
2. **G2 诊断落盘 + 类别预算**:report.notes、enemy pendingScripts、skill pending/lossy 全部写入 migration-diagnostics.json(带 domain/capability/category);各类别冻结当前计数为预算,**新增=写前失败**,减少需销账。消灭"诊断为空=无损"错觉。
3. **G3 命令×上下文执行矩阵**:canonical 命令全集 × (大世界 trigger/auto/onEnter/战斗 choreo/onDefeated/物品/技能)每个 cell 显式标记 executed/equivalent/refused(fail-loud),测试钉死;运行时 `未接(记日志)` 一律改 fail-loud 或注册表申报。直接消灭 confirm stub、choreo log-only、onDefeated scratch 三类。
4. **G4 身份换算单源化 + 反解 oracle**:owner/实体引用换算集中一个函数;产物抽样反解(产物 e-id +1 必须等于源 operand)进写前门禁。0x04 这类 off-by-one 当场现形。
5. **G5 副作用重放审计**:静态检查"可重入 trigger flow 内含 giveItem/giveMoney/非幂等写入且无 checkpoint 等价物" → 写前失败或强制分段。0x08 类问题结构性收口。
6. **G6 敌人/物品/技能钩子翻译器单源化**:opcode 分发表一处维护,语境只声明差异;pending 即写前失败(对齐 item-use 闭包 migration-validate.ts:374-400 的先例)。

---

**审计边界声明**:本报告逐项可到 file:line / source address 复核;§1 全部条目经本人一手验证(非转述子代理)。未逐案验证处已显式标注(0x08 的 2 个已修复站、3 个"丢整段正文"站、setPalette 4 条真彩替代的具体站点)。未修改任何实现、产物、baseline、任务卡与签字。待 GLM 报告到达后由 Codex 做三方差集合并。
