# 事件 / 脚本系统三方逐函数审计(事件解释器 / autoScript / 触发器 / 走位骑乘相机 / 页切换状态机)

| 字段 | 值 |
|---|---|
| 审计日期 | 2026-07-05 |
| sdlpal C 真值 commit | `282c1fab1deb101a397617e70282460e85cdc290`(主仓 `reference/sdlpal/`,非独立 submodule,与 HEAD 同 commit) |
| 一阶段 .ts commit | `282c1fab1deb101a397617e70282460e85cdc290`(monorepo 同 HEAD) |
| reforge .ts commit | `282c1fab1deb101a397617e70282460e85cdc290`(monorepo 同 HEAD) |
| 审计单元 | 5(事件解释器主体 / autoScript 巡逻 / 触发器系统 / 走位骑乘相机 / 页切换状态机 setPalette) |
| 方法 | sdlpal C 真值语义 → 一阶段逐函数对照(含 git log 踩坑)→ reforge 逐函数对照(✅/⚠️/❌/✨)→ 缺口 + 风险 + 行动 |

> **时效说明（2026-07-14）**：本文是 2026-07-05 的审计快照，其中关于可执行 `unmigrated`、
> 旧 opcode 运行时兼容层和“缺 label 即目标缺失”的现状描述已被
> [R2 任务](../../../ops/archive/tasks/done/R2-script-single-model.md)取代。当前规则是：可执行内容只有 clean `Command`；
> 迁移缺口只写 `MigrationGap` 并阻断生成；全局脚本地址按 `all.json.commands[n]` 解析。本文仍保留原始证据与
> 当时缺口，不能再作为这三项的当前实现真值。

> **返工补记（2026-07-16）**：A7-3 的 `s066→s059` 实机复核又发现四类不能由“clean async 架构”自动
> 免疫的源语义：0x6E party layer、0x50 后首个 `PAL_MakeScene` 隐式淡入、0x46 重填整条 party trail、
> 以及 0x71 必须先卷背景再画人物。下文已补当前锚点；本轮只改 phase2 migrate/content/reforge/editor 与
> 上游迁移生成物，`packages/game` 零 diff，第一阶段继续作为真值而未被修改。

> 全文行号锚点都基于上述 commit。判断必有 `文件:行`。
>
> 本子系统是 reforge 重写最重的一块。一阶段 `event-system.ts`(5583 行)在三套 cursor(trigger / autoScript / battle runScript)+ 单一 `applyRawOpcode` 分发上叠了大量修补;reforge 用「原生 async AST 树遍历 + AbortSignal」从架构上消解了多数坑,但**仍有一批因语义折叠 / 内容层决策引入的新缺口**,见各单元「缺口」。

---

## 审计单元 1:事件解释器主体

### 1.1 sdlpal C 真值(`reference/sdlpal/script.c`)

#### 双解释器模型(核心架构事实)

sdlpal 有**两套独立解释器**,共享底层 `PAL_InterpretInstruction`,但控制流 op 各自实现:

- **`PAL_RunTriggerScript`**(script.c:3139-3480):跑触发脚本 / onEnter / callScript 子脚本。**同步阻塞**(C 函数调用,内部 `while` 循环 + `PAL_DelayUntil` 自旋)。游标 = `wScriptEntry`(全局 `lprgScriptEntry` 下标)。
- **`PAL_RunAutoScript`**(script.c:3482-3651):跑每帧 autoScript。**每帧一条 op**(注释 script.c:3514-3517 「one instruction per frame except jumping」),游标存回 `pEvtObj->wAutoScript`(play.c:183)。
- **`PAL_InterpretInstruction`**(script.c:586-3084):被两者 `default` 分支调用的「数据/演出 op 大集合」(0x0B-0xA6)。**返回下一条 entry**(多数 `return wScriptEntry+1`,改游标的 op 直接改 `wScriptEntry`)。

#### `PAL_RunTriggerScript` 主循环(script.c:3194-3256)
- **终止条件**:`while (wScriptEntry != 0 && !fEnded)`(script.c:3194)。**`wScriptEntry == 0` = 脚本结束**(全局数组 entry 0 是哨兵)。
- 控制流 op 直接内联在循环 `switch`(0x00-0x0A、0x3B/0x3C 等),其余 `default` 调 `PAL_InterpretInstruction`(script.c:3253-3256 实际是循环末尾的 fall-through)。

#### 0x0004 callScript(script.c:3258-3265)— **callStack 等价 = C 函数栈**
```c
PAL_RunTriggerScript(pScript->rgwOperand[0],
   ((pScript->rgwOperand[1] == 0) ? wEventObjectID : pScript->rgwOperand[1]));
wScriptEntry++;
```
- **同步递归调用**(C 函数栈天然 = callStack)。op1=0 沿用当前 eventObjId;op1≠0 切到 `op1`(1-based)。
- 调用方在 callee **完全跑完后**才 `wScriptEntry++`(C 阻塞语义)。callee 的 `0x00 plain end` 退出 callee,不弹 caller(caller 自己的循环继续)。
- **无显式 callStack 结构** —— 靠 C 栈帧。跨段(不同 scene 的 shared script)靠全局 `lprgScriptEntry` 单一数组下标。

#### 0x0006 jumpByRate(script.c:3299-3312)— **trigger 侧语义**
```c
if (RandomLong(1, 100) >= pScript->rgwOperand[0])
{
   wScriptEntry = pScript->rgwOperand[1];
   continue;   // ← 关键:continue 不是 break,跳转后同帧续跑目标
}
else
{
   wScriptEntry++;
}
```
- **`continue`** = 跳过循环体末尾的隐式 `wScriptEntry++`,直接重读循环头 → **同帧续跑目标 op**(goto 不消耗帧)。
- **op1==0 时**:jump 到 entry 0 → 循环条件 `wScriptEntry != 0` 假 → **整段脚本结束**(=「概率失败 = 终止」)。这是 trigger 侧的「无 label → 全局 ip 0 = 退出」fall back。

#### 0x0007 startBattle(script.c:3314-3333)— **fAutoBattle 消费 + 复位**
```c
i = PAL_StartBattle(pScript->rgwOperand[0], !pScript->rgwOperand[2]);
// 胜→下一条 / 负→op[1] / 逃→op[2]
gpGlobals->fAutoBattle = FALSE;   // ← 战后无条件清
```
- **fAutoBattle 是全局 flag**,由 0x8A 在战**前**设(`fAutoBattle = TRUE`,script.c:2568),`PAL_StartBattle → createBattleState` 读取它整场 AI 自动;战后 `0x07` 末尾清。

#### 0x008A enableAutoBattle(script.c:2564-2569)— **单一全局 handler**
```c
gpGlobals->fAutoBattle = TRUE;
```
- **在 `PAL_InterpretInstruction` 内**(script.c:2564),即 trigger/auto/battle 三侧**共用同一处实现**(C 单一 switch)。**不存在「双解释器漏侧」**——sdlpal 真值里 0x8A 只有一份代码,任何解释器跑到它都生效。

---

### 1.2 一阶段实现(`packages/game/src/core/event-system.ts`)

一阶段是**单一巨型 `applyRawOpcode` 分发**(event-system.ts:3529-5583)+ 三套 cursor(`gs.eventCursor` trigger / `npc.autoCursor` autoScript / battle `cursor`)。控制流 op(0x04/0x06/0x0A/条件跳转)操作传入的 cursor,trigger / auto 共用同一解释器。

#### `applyRawOpcode` 主分发(event-system.ts:3529-3546)
- 签名 `(gs, opcode, operands, currentEventObjectId?, cursor?)`。**cursor 可空**(battle runScript raw fallback / 无 trigger NPC)。
- `switch(opcode)`(3547)覆盖 ~80 个 opcode;未覆盖的走末尾兜底(event-system.ts 无 default skip,而是 builder 不生成 / tick 主循环不调)。

#### 0x8A 双解释器漏侧 — **一阶段踩过的坑**(commit `0f71695e`)
- **历史状态**:0x8A 早期**只在 `battle-opcodes.ts:774-776`(战斗侧 `dispatchBattleOpcode`)实现**(`gs.fAutoBattle = true`),事件侧 `applyRawOpcode` **无 case** → default skip。
- **后果**:石长老 vs 盖罗娇剧情(`0x8A → 0x4a set-battlefield → 0x07 startBattle team37`)进战斗时 `gs.fAutoBattle` 仍 false → AI 不自动 → 退化成玩家手动(user 2026-06-14 报)。
- **修复**(commit `0f71695e`):event-system.ts:4036-4041 补事件侧 `case OP_ENABLE_AUTO_BATTLE: gs.fAutoBattle = true`。
- ✅ **现已双侧**:事件侧(4036)+ 战斗侧(battle-opcodes.ts:774)。`createBattleState` 从 `gs.fAutoBattle` seed(battle-state.ts:903),战后 `battle-system.ts:3111` 清 `gs.fAutoBattle = false`(对齐 script.c:3332)。
- ⚠️ **根因遗留**:一阶段用「两处独立 case」而非 sdlpal 的「单 handler」,需人工保持同步。reforge 单解释器天然免疫(见 1.3)。

#### `jumpToGlobalIp`(event-system.ts:3430-3440)— trigger 侧 0x06 fall back
```ts
const mapped = cursor.labelMap?.[`L_${globalIp}`]
cursor.ip = (mapped ?? globalIp) - 1   // 查不到 label → 用全局 ip 本身
```
- **commit `5d256f8f`**:旧逻辑 `labelMap` 查不到即静默不跳 → 法术不走失败分支(没钱仍放乾坤一掷且 0 伤害)。disasm 不给 0x06/条件跳转目标打 label(235 个 0x06 中 91 个 target 无 label)→ 必须 fall back 到 `globalIp`(数组下标恒等)。
- ✅ **已对齐** script.c:3305 `wScriptEntry = op1`(op1 就是绝对下标,直接用)。

#### `OP_JUMP_BY_RATE`(event-system.ts:4266-4273)— trigger 侧
```ts
if (Math.floor(Math.random() * 100) + 1 >= rate) {
  jumpToGlobalIp(gs, cursor, operands[1] ?? 0)  // cursor.ip = target-1, caller ip++ → target
}
```
- ✅ **概率对齐**:sdlpal `RandomLong(1,100) >= op0` 等价 `Math.floor(rand*100)+1 >= rate`。
- ⚠️ **goto 不消耗帧**:sdlpal 用 `continue`(同帧续跑);一阶段靠「caller raw-case 末尾 `cursor.ip++`」(2765)。`jumpToGlobalIp` 设 `ip = target-1`,caller `++` → `target`,**下一条 tick 才跑目标**(每 tick 一条 op)。**不忠实**(sdlpal 同帧续跑目标),但语义等价(最终都到 target),只是节奏差一帧。autoScript 侧另有专门处理(见单元 2)。

#### `OP_CALL_SCRIPT`(event-system.ts:4739-4764)— callStack 实现
```ts
cursor.callStack.push({ returnIp: cursor.ip + 1, returnCommands, returnLabelMap, savedEventObjectId })
cursor.ip = subIp - 1   // caller ip++ → subIp
```
- ✅ **对齐** script.c:3262-3265:压返回帧 + 跳子脚本。op1≠0 切 `currentEventObjectId = op1-1`(对齐 1-based)。
- ⚠️ **同步阻塞的近似**:sdlpal callee 同步跑完后 caller 才 `wScriptEntry++`;一阶段 callee 的 `end`(1298-1308 auto / 2947-2951 trigger)弹帧回 caller,**callee 内多帧 op**(wait/walkTo 未达)时退化为逐帧推进(注释 1422-1425)。callStack 是持久数组(跨 tick),非 C 栈。

#### `tickEventSystem` 主 while(event-system.ts:~1496+)
- 单 cursor `gs.eventCursor`,每 tick 跑**一条 op** 到首个 waitable(waiting ∈ {undefined, dialog, frame-wait, ...})。
- `waiting===undefined` 时同 tick 续跑(party-walk/滚屏/ride 每 tick re-run 同 ip);`waiting` 非空时 return 等待。

---

### 1.3 reforge 实现(`packages/reforge/src/script-runner.ts` + `content/script.ts`)

#### 单一 async AST 解释器(`ScriptRunner.exec`,script-runner.ts:207-318)
- **`async exec(cmd)`**(207):每命令 `await h.<host>(...)`。**无 IP / 无 label / 无 switch(opcode)** —— 命令是结构化 AST `Command` 联合(content/script.ts:26-103),`switch(cmd.kind)` 分发。
- **`async run(body)`**(175-188):`for` 循环顺序 `await exec`,**天然 callStack = JS 调用栈**(branch 递归 `this.run(cmd.then)` 278)。
- **AbortSignal 贯穿**(`throwIfAborted` 178/181):切场景 / 读档 abort 即全树取消,无孤儿 waiting 态。

#### 0x8A 双解释器 — **✨ 架构性免疫**
- 0x8A 迁移成 `startBattle.auto?: boolean`(translate-events.ts:530-545):`0x8A` 设 `ctx.pendingAuto=true`,紧邻的 `0x07` 合并成 `startBattle{...,auto:true}`(543)。
- `ScriptHost.startBattle(team, {auto})`(script-runner.ts:81)→ main.ts:713 传 `battleOpts?.auto`(856)→ battle-session.ts:411 `this.opts.auto`。
- ✅ **单一解释器,不存在「漏侧」**:0x8A 不再是独立 opcode,而是 startBattle 的字段;任何 AST 出现 `{kind:'startBattle',auto:true}` 都自动生效,无「事件侧 vs 战斗侧」二分。
- ✅ **战后复位**:battle session 是一次性对象,`opts.auto` 随 session 销毁天然清(等价 script.c:3332)。

#### 0x06 概率跳转 — **⚠️ trigger 侧免疫,但 auto 侧语义丢失**(见单元 2)
- 迁移:0x06 → `branch{cond:{kind:'chance',percent:101-op0}, then:inlineArm(op1)}`(translate-events.ts:546-553)。
- `evalCondition` chance(script-runner.ts:124-125):`random()*100 < percent` → then 臂。
- ✅ **概率公式对齐**:sdlpal `RandomLong(1,100) >= op0`(op0=20 → 81/100 概率跳);`percent=101-20=81`,`rand*100<81` → 81%。✓
- ✅ **无 label fall back 免疫**:AST `branch` 的 then 臂是内联命令数组,**不存在「查不到 label」问题**(迁移期 `inlineArm` 解析,解析失败 → `unmigrated` 占位,运行期恒有内容)。
- **❗重大补充(2026-07-05 复核发现 + 已修):跳走臂曾无终止语义 → 命中后落穿回父体**。
  runner 的 branch 跑完 then 会继续父体后续命令,而跳走臂本义 = 原版改 wScriptEntry 后一路
  跑到 END 即整个脚本结束;op1==0 更是跳全局 0 号 END = 当场退,曾被译成空臂 no-op。
  伤面(全量扫描):2983 个 branch 中 **775 个空臂(概率门全废,21% 掉落变 100%、选"否"照办)
  + 2158 个有臂有尾(命中后臂+尾双跑)**。一阶段同族前科:`5d256f8f`(0x06 不跳 → 法术不走
  失败分支)。**修法**:新增 `stopScript` 终止命令(runner 哨兵穿透嵌套臂到 runStages 收口,
  阶段不转移 —— auto 循环下拍重跑恰好 = 原版 auto 侧 op1==0「原地不动」,G2.2 一并闭环);
  inlineArm 臂尾一律发射(op1==0 → 臂=[stop]);存量数据结构化补丁 110 文件(769 空臂 + 2486
  尾追加,手作 guijie-minju/demo 零 branch 不涉)。单测钉双向 + 开场链/战斗烟测回归。

#### callScript(0x04)— **✨ AST 嵌套免疫**
- 迁移:0x04 → **整段内联**(`body.push(...calleeBody)`,translate-events.ts:644)。callee 体 memo 化(617)+ 深度护栏(`MAX_ARM_DEPTH`)+ 长度护栏(`MAX_ARM_BODY`,超 → `unmigrated`)。
- ✅ **无 callStack / 无 IP / 无跨段**:call 在迁移期展平成顺序命令,运行期就是普通 `run` 循环。**0x04 的所有坑(callStack 弹帧、跨段 shared#、callee end 弹回)架构性消失**。
- ⚠️ **代价**:超长 / 深嵌套 callee → `unmigrated` 占位(note「call 体超长截断」640)。需统计有多少 call 触发截断(见缺口 G1.3)。

---

### 单元 1 缺口 + 风险 + 行动

| 编号 | 缺口 | 等级 | 行动 |
|---|---|---|---|
| G1.1 | 一阶段 0x8A 双 handler(event-system.ts:4036 + battle-opcodes.ts:774)需人工同步,reforge 已免疫 | 低(仅一阶段债) | reforge 无需动作;若回填一阶段保持双侧 |
| G1.2 | reforge `branch` 无 goto「同帧续跑」概念 —— `for` 循环每条命令是独立 `await`,概率环靠 auto runner `while` 循环(1104)而非单条 0x06 自旋。**节奏差异**:sdlpal 0x06 命中且 op1≠0 时同帧跑到目标;reforge 命中后跑 then 臂(内联),臂内命令逐条 await。~~低(语义等价)~~ **复核纠正(2026-07-05):节奏结论成立,但"语义等价"漏了臂后落穿 —— 跳走臂无终止 = 概率门/确认门全废(775 空臂 + 2158 双跑),已以 stopScript 修复(见上 ❗ 补充)** | ~~低~~ 高(已修) | stopScript 三件套已落地;auto 0x06「原地重掷」= stop 后下拍重跑,G2.2 一并闭环 |
| G1.3 | reforge 0x04 内联有 `MAX_ARM_DEPTH` / `MAX_ARM_BODY` 截断 → 超限 call 变 `unmigrated`。需统计实际截断率 | 中 | 跑 migrate 全量,统计 `unmigrated` 中 opcode=0x04 的数量;若 >0 评估能否提高上限或改运行期 callStack |
| G1.4 | 一阶段 `OP_JUMP_BY_RATE` trigger 侧 goto 不消耗帧的「同帧续跑」未忠实(每 tick 一条 op,差一帧) | 低 | reforge 已免疫(无 tick 模型);一阶段可接受 |

---

## 审计单元 2:autoScript / 巡逻

### 2.1 sdlpal C 真值(`reference/sdlpal/script.c` PAL_RunAutoScript + `play.c`)

#### `PAL_RunAutoScript`(script.c:3482-3651)— **每帧一条 op**
- **`begin:` 标签**(3506)+ `goto begin`(3557, 3584)= 跳转 op **同帧续跑**(不消耗帧)。
- 非 jump op 执行后 `return wScriptEntry`(3651)= **每帧只跑一条**(play.c:183 把返回值存回 `pEvtObj->wAutoScript`)。

#### 0x0006 auto 专用语义(script.c:3575-3591)— **与 trigger 侧完全不同**
```c
if (RandomLong(1, 100) >= pScript->rgwOperand[0])
{
   if (pScript->rgwOperand[1] != 0)
   {
      wScriptEntry = pScript->rgwOperand[1];
      goto begin;   // op1≠0:同帧续跑目标
   }
   // op1==0:wScriptEntry 不变 → break → 下帧重掷(原地重掷 = 随机停顿门)
}
else
{
   wScriptEntry++;  // 推进
}
break;
```
- **三种行为**:
  - 命中且 op1≠0:jump + `goto begin`(**同帧跑到目标**,不消耗帧)。
  - 命中且 op1==0:**原地重掷**(ip 不变,下帧重新 `RandomLong`)—— 巡逻 NPC 的「随机驻足」(每帧 op0% 概率才推进)。
  - 未命中:`wScriptEntry++`(推进)。
- **对比 trigger 侧 0x06**(script.c:3299-3312):trigger 命中且 op1==0 → jump 到 entry 0 → 退出脚本;auto 命中且 op1==0 → **原地不动**。**语义截然相反**。

#### 0x0004 auto 专用语义(script.c:3566-3573)— **同步阻塞**
```c
PAL_RunTriggerScript(pScript->rgwOperand[0],
   pScript->rgwOperand[1] ? pScript->rgwOperand[1] : wEventObjectID);
wScriptEntry++;
```
- **整个 callScript 占当前 1 帧**:同步跑完 callee 再 `wScriptEntry++`。callee 内多帧 op(wait/walkTo)时阻塞 auto 推进。

#### 0x03/0x02 auto goto/reset(script.c:3549-3564, 3533-3547)
- 0x03 goto:`goto begin`(3557)同帧续跑;`wScriptIdleFrameCountAuto` 累计(idle frame gate)。
- 0x02 reset:gate 满前跳 `resetTo`,满后 `wScriptEntry++`。

#### play.c autoScript 循环(play.c:172-192)
```c
for (wEventObjectID = ...; wEventObjectID <= ...; wEventObjectID++)
{
   p = &gpGlobals->g.lprgEventObject[wEventObjectID - 1];
   if (p->sState > 0 && p->sVanishTime == 0)
   {
      WORD wScriptEntry = p->wAutoScript;
      if (wScriptEntry != 0)
         p->wAutoScript = PAL_RunAutoScript(wScriptEntry, wEventObjectID);
   }
   // ... blocker push
}
```
- **无 owner 排除**:对场景内每个 `sState>0` 对象都跑(play.c:178-183)。**owner(刚触发 trigger 的 NPC)的 autoScript 照常跑** —— 在它 trigger 脚本的 `0x09 wait`(每帧 `PAL_GameUpdate(FALSE)`)期间逐帧走(eg. 水月宫赵灵儿对话后走向右上)。

---

### 2.2 一阶段实现(`event-system.ts` tickAutoScripts + runOneAutoOp)

#### `tickAutoScripts`(event-system.ts:1242-1285)
- **owner 跳过门控**(1259-1268):仅 `waiting===undefined && !startedExecution` 那 1 tick 跳 owner(修对话朝向 bug);frame-wait/ride/party-walk 期间 owner 照跑(对齐 play.c 无排除)。
  - **commit `e8a53ac1`**:旧码对所有 waiting 都跳 owner → 赵灵儿 frame-wait 期该跑的 walk 被跳 → 原地消失。
  - **commit `f6145486`**(更早):对话期 owner autoScript 冻结(修面向玩家被覆盖)—— 后被 `e8a53ac1` 收窄。
- **sState/sVanishTime 门**(1248):对齐 play.c:178 `sState>0 && sVanishTime==0`。
- **autoLabel 全局解析兜底**(1269-1282):切片优化后入口在全局数组的 NPC(`L_36205` 等)解不到 → 在此补 `resolveScriptLabel`。

#### `runOneAutoOp` 0x06 auto 专用语义(event-system.ts:1387-1420)— **DH4 修复**
```ts
if (cmd.opcode === OP_JUMP_BY_RATE) {
  const rate = cmd.operands[0] ?? 0
  const target = cmd.operands[1] ?? 0
  if (Math.floor(Math.random() * 100) + 1 >= rate) {
    if (target !== 0) {
      const ip = getLabels(cursor)[`L_${target}`] ?? target  // fall back
      cursor.ip = ip
      if (gotoDepth >= SINGLE_TICK_LIMIT) { npc.autoCursor = undefined; return }
      runOneAutoOp(gs, npc, gotoDepth + 1)  // goto begin:同帧续跑
    }
    return  // op1==0:原地重掷(ip 不变)
  }
  cursor.ip++
  return
}
```
- ✅ **完全对齐** script.c:3575-3591 三分支:命中+op1≠0 同帧续跑;命中+op1==0 原地;未命中推进。
- **commit `5d256f8f`**:旧码复用 `applyRawOpcode` 的 0x06(trigger 语义)→ op1==0 时 `jumpToGlobalIp(0)` → 落 entry 0 永久 park → 巡逻 NPC 走到第一个停顿点后 ~81-93% 概率冻死。
- **commit `bb388ecf`**:DH4/DM16/DL13/DL15 综合修(auto runner 对齐 RunAutoScript)。

#### `runOneAutoOp` 0x04 auto 专用(event-system.ts:1426-1442)— **同步阻塞近似**
```ts
if (cmd.opcode === OP_CALL_SCRIPT) {
  applyRawOpcode(gs, cmd.opcode, cmd.operands, ...)  // 压栈
  cursor.ip++
  while ((cursor.callStack?.length ?? 0) > 0 && guard++ < SINGLE_TICK_LIMIT) {
    runOneAutoOp(gs, npc, gotoDepth + 1)  // 同帧消化 callee
  }
  return
}
```
- ✅ **对齐** script.c:3566-3573:压栈后同帧消化 callee(开门/机关类短指令);callee 多帧 op 时退化为逐帧(注释 1422-1425)。

#### 0x03 goto 同帧续跑(event-system.ts:1335-1356 区域 + `eaaa1d50`)
- **commit `eaaa1d50`**:goto 不消耗帧(同帧续跑目标)—— 修张四划船掉到船尾之外。深度护栏防自环。

---

### 2.3 reforge 实现(`main.ts` startAutoRunner + `script-runner.ts`)

#### `startAutoRunner`(main.ts:1094-1121)
```ts
const r = new ScriptRunner(autoHost, world.script!, ac.signal)
r.selfId = e.id
r.paceMs = 80  // 原版 auto 一帧一 op 的节拍近似
void (async () => {
  while (!ac.signal.aborted) {
    if (e.hidden) { await host.wait(120); continue }
    try { await r.runStages(`auto:${e.id}`, stages) }
    catch (err) { ...; break }
    await host.wait(40)  // 段间让步
  }
})()
```
- **每实体独立 runner,与主脚本并行**(main.ts:1105 注释)。`runStages` 跑完一段 → `applyStageNext` 转阶段 → 循环。
- ✅ **owner 不排除**:auto runner 不感知 trigger 系统(设计裁决 main.ts:1106-1107「不复刻对话冻结 NPC」),owner 触发 trigger 时其 auto 照跑。**对齐 play.c 无 owner 排除**。
- ✨ **sState/sVanishTime**:用 `e.hidden`(1108)代替;`vanishEntity`(main.ts:498-506)设 hidden + 定时恢复。

#### 0x06 auto 语义 — **❌ 原地重掷丢失**(高危)
- **问题根源**:迁移 `translateStages`(translate-events.ts:116)**不区分 trigger / auto 上下文**(migrate-content.ts:1233 trigger / 1242 auto 调同一函数,无 isAuto 标志)。0x06 在 auto 链里也变成 `branch{chance, then:inlineArm(op1)}`(546-553)。
- **op1==0 时**:`inlineArm(0)` → `if (!addr) return []`(translate-events.ts:351)→ **空 then 臂**。
- **运行期**:auto runner `runStages` → `run(body)` for 循环 → `branch` 命中 → `run([])`(空,no-op)→ **循环继续下一条命令**;不命中 → 无 else → 继续。**两种情况 ip 都推进**。
- **丢失的语义**:sdlpal auto 0x06 命中+op1==0 = **ip 不变,下帧重掷**(随机驻足门)。reforge **永远推进** → 巡逻 NPC 没有随机停顿,节奏变快且恒定。
- **数据面**:0x06 在 auto 链里可达 74 处(DH4 注释 event-system.ts:1394),其中 op1==0 的「原地重掷」型需统计。

#### 0x04 auto 语义 — **✨ 免疫**(已内联)
- 0x04 在迁移期整段内联(translate-events.ts:644),auto 链里的 call 变成顺序命令 → `run` 循环天然同步阻塞(await 顺序)。
- ✅ **对齐** script.c:3566-3573「同步跑完 callee」语义(JS await 顺序 = C 同步)。

#### 0x03 goto 同帧续跑 — **✅ 阶段转移覆盖**
- sdlpal auto goto(0x03)靠 `goto begin` 同帧续跑;reforge 用 `ScriptStage.next`(content/script.ts:114)+ `applyStageNext`(165)做阶段转移,`runStages`(script-runner.ts:194-205)跑完一段转下一段。**goto 回跳 = next 指回旧段**。
- ✅ **goto 不消耗帧**:同段内 `for` 循环连续跑;跨段 `runStages` 重新选段。无「单条 op 自旋」需求(0x06 除外,见上)。

---

### 单元 2 缺口 + 风险 + 行动

| 编号 | 缺口 | 等级 | 行动 |
|---|---|---|---|
| **G2.1** | **reforge auto 0x06 原地重掷语义丢失** —— `branch{chance,then:[]}` 永远推进,巡逻 NPC 无随机驻足 | **高** | **方案**:① 迁移期识别 auto 链的 0x06 op1==0 → 译成新命令 `randomHold{percent}`(auto runner 命中则 `continue` 不推进,等下帧重掷);② 或 `branch` 加 `holdOnTrue?: boolean` 字段,auto runner 命中且 holdOnTrue 时 `return`(不 advance ip)重跑同段。需先统计 auto 链 0x06 op1==0 数量 |
| G2.2 | reforge auto goto 同帧续跑(sdlpal `goto begin` 单条 op 自旋)无对应 —— 阶段转移靠 `next`,但单段内 `for` 循环无「命中后回到段首」能力 | 中 | `branch` + `next` 组合可表达多数环;真正单 op 自旋(0x03 goto self)罕见,评估是否需 `loop` 命令 |
| G2.3 | 一阶段 owner 排除窗口(`waiting===undefined && !startedExecution`)极精细,reforge 用「auto 不感知对话」规避 —— 但失去「对话首帧 owner 不抢跑转向」保护 | 低 | reforge 触发是边沿(main.ts:1997 落步才查),owner auto 抢跑一拍影响小;接受 |
| G2.4 | reforge `paceMs=80`(main.ts:1102)是固定节拍,不区分 sdlpal「一帧一条 op」(PAL_RunAutoScript 每帧 1 op,~100ms)与「goto 同帧续跑」(0 op 节拍) | 低 | goto/0x04 内联后无独立节拍;0x06 驻足(G2.1)修后节拍自然体现 |

---

## 审计单元 3:触发器系统

### 3.1 sdlpal C 真值(`play.c` PAL_UpdateObject + `PAL_SearchEventObject`)

#### 触发模式枚举(global.h:82-93)
```
kTriggerNone=0, SearchNear=1, SearchNormal=2, SearchFar=3,
TouchNear=4, TouchNormal=5, TouchFar=6, TouchFarther=7, TouchFarthest=8
```
- **1-3 = 按键交互**(search,玩家按确认键);**4-8 = 走近自动**(touch,无需按键)。

#### 自动触发扫描(play.c:107-165)— touch 路径
```c
else if (p->sState > 0 && p->wTriggerMode >= kTriggerTouchNear)
{
   if (abs(partyX - p->x) + abs(partyY - p->y) * 2 <
       (p->wTriggerMode - kTriggerTouchNear) * 32 + 16)
   {
      // 调朝向 + 跑 trigger script
      p->wTriggerScript = PAL_RunTriggerScript(p->wTriggerScript, wEventObjectID);
   }
}
```
- **曼哈顿距离**(y 权重 ×2,play.c:112-113)。阈值 `(mode-4)*32+16`:Near=16, Normal=48, Far=80, Farther=112, Farthest=144。
- **每帧扫**(PAL_GameUpdate 内),**无 owner 排除 / 无边沿检测** —— 玩家在触发区内每帧都重触发。

#### 手动触发扫描(play.c:440-499)— search 路径(PAL_SearchEventObject)
```c
for (i = 0; i < 13; i++)  // 13 cell 范围
{
   for (k = ...; k < ...; k++)
   {
      if (p->sState <= 0 || p->wTriggerMode >= kTriggerTouchNear ||
          p->wTriggerMode * 6 - 4 < i || dx != ex || dy != ey || dh != eh)
         continue;
      // 跑 trigger script
   }
}
```
- **仅 mode 1-3**(play.c:467 `wTriggerMode >= kTriggerTouchNear` 排除 touch 型)。
- **13 cell 范围**(PAL_GetSearchTriggerRange,play.c:361)+ 网格精确匹配(dx==ex && dy==ey)。

#### TouchFar 死锁根因(sdlpal 真值)
- play.c:107-165 **每帧扫**,玩家在 TouchFar(80px)区内不动 → 每帧重触发。
- sdlpal **靠 PAL_RunTriggerScript 同步阻塞**:trigger 跑完(含 0x00 end)才返回,返回后同帧 PAL_UpdateParty(play.c:534)给玩家一次移动 → 移出区 / 玩家主动走开。
- **若 trigger 立即 end(短脚本)**:返回 → 玩家未移动 → 下一帧又触发 → **死锁**(李大娘「别怠慢了客人」)。

---

### 3.2 一阶段实现(`scene-system.ts` + `event-system.ts`)

#### `updateEventObjectsAndTrigger`(scene-system.ts:200-266)— touch 扫描
- ✅ **曼哈顿 + y×2**(scene-system.ts:228-229):`dxAbs + dyAbs*2 >= threshold`。
- ✅ **阈值公式**(222):`(mode - TRIGGER_MODE_AUTO_MIN) * 32 + 16`,`TRIGGER_MODE_AUTO_MIN=4`(142)。
- ✅ **转向面对 party**(235-246):对齐 play.c:120-148(仅 nSpriteFrames>0)。
- ✅ **单 cursor 限制**(257-260):ts 无法同 tick 触发第二个脚本 → 记 `triggered`,后续对象跳过触发但副作用(vanish/sState)照走(对齐 play.c:81-166 不 break)。
- ✅ **autoTriggerOnce**(264):触发成功即 `triggerMode=0`(扬州太守领赏,防刷)。

#### `suppressAutoTriggerOnce`(scene-system.ts:450-455 + event-system.ts:3365,3373)— **TouchFar 死锁修复**
- **commit `9367efc6`**(李大娘死锁):脚本结束切回 explore 的首帧跳过触发扫描。
- **机制**:`restoreModeAfterScript`(event-system.ts:3358-3374)在 mode 切回 explore 时设 `gs.suppressAutoTriggerOnce = true`;`tickScenePreInput`(scene-system.ts:450)首帧消费它(跳过 `updateEventObjectsAndTrigger`)。
- ✅ **对齐 sdlpal**:sdlpal 靠「PAL_RunTriggerScript 同步阻塞返回后同帧 PAL_UpdateParty 给一次移动」;一阶段用 suppress flag 显式实现等效(给玩家一帧移动机会移出触发区)。

#### 触发模式设置 op
- 0x40 setTriggerMethod(event-system.ts:4570-4582):`pCurrent.wTriggerMode = op1`(对齐 script.c:1619)。`resolveTargetNpc`(op0 选 NPC,非恒 self)—— commit 修水生叔 trigger 误改自己。
- 0x27 setTriggerMode+Normal(event-system.ts:4883-4887):`pCurrent.triggerMode = 5 + op1`(对齐 script.c:2426)。

---

### 3.3 reforge 实现(`main.ts` findTrigger + fireTrigger)

#### `findTrigger`(main.ts:1277-1292)— **切比雪夫距离**(非曼哈顿!)
```ts
function gridDist(a, b) { return Math.max(abs(a.col-b.col), abs(a.row-b.row)) }  // 1272
for (const e of scene.entities) {
   if (e.hidden) continue
   const t = e.pages?.[0]?.trigger
   if (!t || t.on !== on) continue
   const range = Math.max(t.range ?? 0, on === 'interact' ? 1 : 0)
   const d = gridDist(player.pos, e.pos)
   if (d <= range && d < bestD) { best = e; bestD = d }
}
```
- ⚠️ **距离公式不同**:reforge 用**切比雪夫**(max(|dc|,|dr|),main.ts:1272),sdlpal 用**曼哈顿 y×2**(|dx|+|dy|*2)。对角邻居:切比雪夫=1,曼哈顿 y×2 可能=2-3。**触发半径几何不同**。
- ⚠️ **range 语义不同**:reforge `range` 是格数(touch 缺省 0 = 贴脸);sdlpal `triggerMode 4-8` 映射到 16/48/80/112/144 像素阈值。迁移 translate-events.ts:680-683 把 mode 1-3 → interact range=mode;mode 4-8 → touch range=mode-4(0-4 格)。**像素阈值 → 格数转换有损**(80px ≈ 2.5 格,迁移成 2 格)。

#### touch 边沿触发(main.ts:1996-2001)— **✨ TouchFar 死锁架构性免疫**
```ts
// 落步才查,站着不重触发
const touched = findTrigger('touch')
if (touched) { fireTrigger(touched); break }
```
- ✅ **边沿语义**:仅在玩家**落步**(while 循环内,stepAcc 满)时查 touch。站着不动 → 不重触发。**TouchFar 死锁架构性消除**(注释 main.ts:1996)。
- ✅ **无需 suppressAutoTriggerOnce**:reforge 不存在「每帧扫触发区」的连续触发路径。
- ✨ **对比一阶段**:一阶段需精细的 suppress flag + owner 排除;reforge 边沿触发一刀切。

#### `fireTrigger`(main.ts:1294-1297)
```ts
function fireTrigger(e) {
   const t = e.pages?.[0]?.trigger
   if (t) startScript(e.id, t.stages, e.id)
}
```
- `startScript`(1207-1242):`if (runner) return`(1208)防重入 —— 已有脚本跑时不触发新脚本。

#### interact 触发 — 按键路径
- 玩家按确认键 → `findTrigger('interact')` → `fireTrigger`。range 缺省 1(贴脸)。

---

### 单元 3 缺口 + 风险 + 行动

| 编号 | 缺口 | 等级 | 行动 |
|---|---|---|---|
| G3.1 | reforge `gridDist` 用切比雪夫,sdlpal 用曼哈顿 y×2 → 触发区几何不同(对角邻居判定差异) | 中 | 评估:格制下切比雪夫更自然(对角=1 格);若要忠实 sdlpal,改 `|dc|+|dr|` 或加 y 权重。多数 touch range=0-1,影响小 |
| G3.2 | 迁移 mode 4-8 像素阈值 → 格数有损(80px Far → 2 格;144px Farthest → 4 格)。sdlpal 阈值 16/48/80/112/144 非整数格 | 中 | 接受格制近似;或迁移期按场景微调 range 内容层覆盖 |
| G3.3 | reforge 边沿触发「落步才查」—— 玩家**走进**触发区但**停**在区内不再触发(sdlpal 每帧扫会重触发)。多数情况等价(玩家持续走),但「走进后停住等触发」的脚本行为不同 | 低 | sdlpal 这类重触发本就是 bug 源(死锁);reforge 行为更合理。接受 |
| G3.4 | 一阶段 `suppressAutoTriggerOnce` + owner 排除窗口极精细,reforge 全部规避 —— 但失去「触发瞬间 owner autoScript 冻结一拍」保护(对话朝向 bug 根源) | 低 | reforge 触发边沿 + auto 不感知对话,owner 抢跑一拍影响小;若实测有朝向覆盖问题,内容层加 setEntityFacing |

---

## 审计单元 4:走位 / 骑乘 / 相机 op

### 4.1 sdlpal C 真值(`script.c` PAL_PartyWalkTo / PartyRideEventObject + 0x6E/0x7F)

#### `PAL_PartyWalkTo`(script.c:100-200)— 队伍走位(阻塞)
- **视口相对目标**:`xOffset = x*32 + h*16 - viewport.x - partyoffset.x`(script.c:133)。
- **while 循环**(138):每步 `PAL_DelayUntil(t)`(140)+ `PAL_GameUpdate(FALSE)`(191)+ `PAL_MakeScene`+`VIDEO_UpdateScreen`(192-193)—— **每步重绘 + 跑 autoScript**(PAL_GameUpdate 内含 auto 循环)。
- **方向决策**(155-162):yOffset<0 → 北/西;xOffset<0 → 西。
- **速度**:`dx += iSpeed*(xOffset<0?-2:2)`(173,2x 水平);`dy += iSpeed*(yOffset<0?-1:1)`(182)。speed 2/4/8 → 4/8/16 px 水平每步。
- **到达**:xOffset==0 && yOffset==0 退出(138)。

#### `PAL_PartyRideEventObject`(script.c:202-307)— 骑乘走位(阻塞)
- **同 PartyWalkTo + 联动 event object**:`p->x += dx; p->y += dy`(297-298,被骑对象同步移)。
- **trail 存储**(282-289):含 `+dx`(预扣本步位移)。

#### 0x46 setPartyPos(script.c:1665-1700)— **落点同时重填队伍与 trail**
- operand `(col,row,h)` 定位世界点 `x=col*32+h*16`、`y=row*16+h*8`，再以 partyoffset 计算 viewport。
- 它不是“只移动队长”：循环把 `rgParty[i]` 与 `rgTrail[i]` 同时写成队长位置加 `i×(xOffset,yOffset)`，
  每槽沿当前朝向向身后铺一个 16×8 菱形步，并把 trail 方向写成当前 party direction。
- 后续 0x75 只替换成员角色，不重算位置；静止期恢复成员时直接复用这条已铺好的队形。若迁移只留下
  `teleportParty(player)`，队员会叠在队长脚下/被 cover 遮住，直到玩家移动才补出 trail。

#### 0x6E movePlayerOneStep(script.c:2091-2113)— **相对移 viewport**
```c
gpGlobals->rgTrail[0].x = viewport.x + partyoffset.x;  // 存旧位
gpGlobals->viewport = PAL_XY(viewport.x + SHORT(op0), viewport.y + SHORT(op1));
gpGlobals->wLayer = op2 * 8;
if (op0 != 0 || op1 != 0) PAL_UpdatePartyGestures(TRUE);
```
- **viewport 相对移**(2103-2105),partyoffset 不变 → party 屏位不变 = 「party 在固定屏位走出」。
- **关键**:`0x6E + 0x7F` 对(林家堡李逍遥走出场):0x6E 移 viewport,0x7F 移回 → 净相机=0、party 屏位不变。

#### 0x7F moveViewport(script.c:2292-2379)— **三形态**
- **① 回正**(op0==0 && op1==0):`viewport += (party.x-160, party.y-112)`(2301-2305)+ `partyoffset=(160,112)` + party 反向移(2308-2312)。
- **② 绝对跳**(op2==0xFFFF):`viewport = op0*32-160, op1*16-112`(2338-2339)+ party 补偿(2344-2348)。
- **③ 相对 pan**(else):`do{ viewport+=(x,y); partyoffset-=(x,y); party-=(x,y); PAL_GameUpdate; DelayUntil } while(++i<op2)`(2352-2366)。**每帧 PAL_GameUpdate → autoScript 照跑**(script.c:2364)。

#### sceneLoading 冻屏耦合(无 sdlpal 对应)
- sdlpal **无 sceneLoading 概念** —— PAL_MakeScene 同步重绘,切场景靠 FadeOut/LoadMap/FadeIn 顺序阻塞。
- 一阶段引入 `sceneLoading`(异步加载期间 present 保留旧帧),走位/骑乘三组 op 漏清 → 全黑。

---

### 4.2 一阶段实现(`event-system.ts`)

#### PartyWalkTo handler(event-system.ts:2645-2673)— speed 2/4/8
```ts
const arrived = partyWalkTo(gs, op0, op1, op2, speed)
if (gs.sceneLoading) gs.sceneLoading = false  // Bug1:清冻屏让走位可见
if (arrived) { cursor.ip++; break }
return  // 未到 → 下 tick
```
- ✅ **speed 映射**:0x70=2, 0x7A=4, 0x7B=8(2648-2652,对齐 script.c:2129/2249/2256)。
- **commit `c6482fff`**(走位清 sceneLoading):onEnter 一上来 PartyWalkTo 时前面无对话/wait 清冻屏 → 整段走位跑在切场景黑里 + 跟随者重叠。修:走位前清 sceneLoading。

#### NPCWalkTo handler(event-system.ts:2678-2720)— 含隔帧 stagger gate
- ✅ **stagger gate**(2695-2698):`(npc.id+1 & 1) ^ (frameNum & 1)`(0x11/0x7C,对齐 script.c:692/2263)。
- ✅ **清 sceneLoading**(2691):同 PartyWalkTo。

#### PartyRideEventObject handler(event-system.ts:2725-2754)— speed 2/4/8
- ✅ **speed 映射**:0x3F=2, 0x44=4, 0x97=8(2733-2737,对齐 script.c:1609/1654/2705)。
- ✅ **清 sceneLoading**(2748)。

#### 0x46 handler(event-system.ts:3709-3727)— **重填 rgTrail 真值已落地**
- 一阶段按 SDLPal 方向计算 `(xOff,yOff)`，同时写 `party/camera/trail[0..4]`，并清
  `followerFrozenOffset`。`present/follower-pos.ts` 的静止无快照分支使用 `trail[m]`，不是走路态的偏移公式。

#### 0x6E handler(event-system.ts:4215-4238)— **相对移 camera**
```ts
gs.camera.x += dx  // 相对,非绝对回正
gs.camera.y += dy
```
- **commit**(林家堡李逍遥走出场):旧码 `camera = party - offset`(绝对回正)→ 0x7F 偏离居中时把队首拽回中心 → 相机错误跟随。修:相对移(对齐 script.c:2103)。

#### 0x7F handler(event-system.ts:2395-2434 + 3650-3672)
- **多帧 pan 拦截**(2395-2432):`waiting='camera-pan'`,逐帧 `gs.camera += (dx,dy)`(cameraPanFramesRemaining)。
- **即时路径**(applyRawOpcode 3650-3672):回正 / 绝对跳 / 单帧。
- **commit `2ab8ad80`**(camera-pan autoScript 白名单):0x7F 相对 pan 期间不冻 autoScript/追逐 timer(对齐 script.c:2364 `PAL_GameUpdate`)。

#### sceneLoading 冻屏 — **W4 两层坑**
- **层 A**:走位/骑乘三组 op(0x70/0x7A/0x7B/0x3F/0x44/0x97/0x10/0x11/0x7C/0x82)漏清 sceneLoading → 切场景走入演出全黑 + 跟随者重叠(commit `c6482fff`)。
- **层 B**:needToFadeIn 调色板卡黑,`tickSceneAutoFadeIn` 白名单(event-system.ts:645+)与 mode.ts:42 autoScript 白名单必须同步。

---

### 4.3 reforge 实现(`main.ts`)

#### moveParty / moveEntity(main.ts:652-655, 619-631)— **Promise 驱动**
```ts
moveParty: (to, speed) => new Promise(resolve => {
   partyMove = { to, stepMs: SPEED_MS[speed] ?? 130, acc: 0, resolve }
})
```
- `advanceMoves`(main.ts:1008-1090)每 tick 推进:`mv.acc += dt; while(acc>=stepMs) { 走半格 }`。
- **commit `8eae732d`**(首步零延迟):`acc` 从 0 起(曾预充满 → 短距 partyWalk 一两帧瞬移)。
- ~~✅ 半格步长(main.ts:1038 注释「原版 16/8px」)~~ **2026-07-05 Claude 复核纠正:❌ 注释是错的,审计照抄未核换算**——reforge grid 1 格 = 16/8px(grid.ts:37 `x=16(col−row)`),0.5 格只有 **8/4px**,而原版 walkTo(0x10 speed3)= 6/3px/tick(scene.c:887-888 NPCWalkOneStep x±2s,y±1s)。量子不对 + stepMs 130ms 与玩家 100ms 错拍 = 作者报 NPC 抖动。**同日已修**:全局 100ms 世界拍 + s/8 格/拍精确速度 + 双轴 <2s px snap(script.c:101)+ slow(0x11)隔拍;单步 op(0x0B-0E)同修 0.5→0.25 格(原版 NPCWalkOneStep(2)=4/2px,script.c:660)。

#### nudgeParty(0x6E)(main.ts:656-662)— **相对,已对齐**
```ts
const d = pixelDeltaToGridDelta(dx, dy)
player.pos = { col: player.pos.col + d.dcol, row: player.pos.row + d.drow }
partyGesture = null; stepFrame = (stepFrame+1)%4  // 走姿推进
updateCamera()
```
- ✅ **相对移**(增量制,非绝对回正)。注释 main.ts:84「⚠ 一阶段彩依飞走案:走位期间偏移必须保持,不许绝对回正」—— 设计层已记录此坑。
- **2026-07-16 补正**：0x6E 第三 operand 不能丢；迁移为可选 `nudgeParty.layer`，host 同步覆写
  `partyLayer`。队伍 cover iLayer=`layer*8+6`、sort offset=10，NPC 为 `layer*8+2`/9，并按
  `PAL_CalcCoverTiles` 五邻候选扫描；这才是 s059 三人不被地形截成半身的层级真值。

#### teleportParty / switchScene— **0x46 trail side effect 已恢复**
- `follower.ts:51-65` 的 `seedFormationTrail` 把四朝向换成菱形格后退轴；`main.ts:741-745` 与
  `1018-1027` 在场景落点/同场景 teleport 时铺满 trail，并清 frozen/派生 follower 位置。
- 静止且无冻结快照时 `follower.ts:104-115` 直接取 `trail[m]`；连续走路的 `BASE_SLOT` 校准不能套到
  0x46 静止队形。s059 最终 setParty 因此无需先走一步即可显示三人。

#### cameraPan(0x7F 相对)(main.ts:663-675)— **cameraOffset 累积**
```ts
cameraPanFx = { fromX: cameraOffset.x, fromY: cameraOffset.y, dx, dy, steps: frames, done: 0, resolve }
```
- `advanceMoves`(main.ts:1010-1021)每步 `cameraOffset = from + dx*done`,不回正。
- ✅ **走位期间偏移保持**:cameraOffset 是独立累积量,nudgeParty 的 `updateCamera()`(661)叠在 cameraOffset 上。
- cameraSnap(0x7F 回正/绝对)(main.ts:676-688):`to` 给定 → 绝对偏移;缺省 → cameraOffset=0 回正。

#### mountParty / ride(0xA1+0x3F/0x44/0x97)(main.ts:604-617)
```ts
mountParty: (entityId, dx, dy) => authority.set('party', { kind:'mount', parent, dx, dy })
ride: async (entityId, to, speed) => {
   authority.set('party', { kind:'mount', parent: entityId, dx:0, dy:0 })
   await host.moveEntity(entityId, to, speed)
}
```
- **commit `43010172`**(载具权威):mount = 父动子随(deriveMounts main.ts:991-1005 每 tick 派生 party 位置 = parent + offset)。
- ✅ **骑乘 = mount + ride**(script.ts:96-99):0xA1 聚拢 → mountParty;0x3F/44/97 → ride。

#### 0x71 screen wave— **先背景波动、再静态人物/cover**
- SDLPal `scene.c:475-491` 先画地图层、调用 `PAL_ApplyWave(gpScreen)`，再 `PAL_SceneDrawSprites`；因此人物
  不随血池波动。旧 Reforge 曾把绑定主 ctx 的 renderer 交给离屏 wctx，目标 transform 与实际落笔错配，
  在 s066→s059 后造成半尺寸/画布污染。
- 当前 `render-scene.ts:29-42` 对 renderer/context 不一致 fail-loud；`main.ts:2664-2683` 给 wctx 独立
  `waveRenderer`，离屏只画 background，卷完后在主 ctx 静态叠 sprites/cover。探索屏波相位只在 100ms
  world tick 推进（`screen-wave.ts:52-83`），rAF 补帧不加速。

#### sceneLoading 冻屏 — **✨ 并行模型免疫**
- reforge **无 sceneLoading 概念**:loadScene 是 `async`(main.ts host.loadScene),`await` 期间主脚本挂起,渲染线程照跑(显示旧帧 until 新场景 ready)。
- ✅ **走位/骑乘三组 op 无需「清 sceneLoading」**:它们是 `await moveParty/ride` Promise,挂起期间不存在「冻屏漏清」问题。
- ⚠️ **白名单耦合不存在，不等于隐式淡入语义免疫**：reforge 无 `tickSceneAutoFadeIn` + mode.ts
  autoScript 白名单二分，显式 fade 是 `await host.fade()`；但 SDLPal 0x50 只置 `fNeedToFadeIn`，随后首个
  `PAL_MakeScene` 才消费并淡入。迁移若只保留 fade-out，clean 运行时没有全局 flag 可补救，会永久黑屏。

#### autoScript 并行模型(main.ts:1105 + authority)
- **设计裁决**(main.ts:1106-1107, 452):auto 与主脚本并行,不复刻「对话期冻结 NPC」;仅被主脚本 `authority` 接管的实体其位移暂停(main.ts:954-955 `while authority.has(id) await wait(150)`)。
- ✅ **0x7F pan 期间 autoScript 照跑**:无 sdlpal script.c:2364 的耦合问题(cameraPanFx 是渲染层 fx,不 gate auto runner)。

---

### 单元 4 缺口 + 风险 + 行动

| 编号 | 缺口 | 等级 | 行动 |
|---|---|---|---|
| G4.1 | reforge moveParty/moveEntity 半格步长 vs sdlpal 整格视口移动 —— 节奏 / 碰撞判定细节差异(半格可能卡碰撞) | 低 | 半格是 reforge 手感设计(main.ts:637 注释);碰撞用 `isBlockedAt` 整格判,半格累积进位时检查。接受 |
| G4.2 | reforge `SPEED_MS`(main.ts:409)= `{slow:200, normal:130, fast:100, run:50}` ms/半格步。迁移映射(translate-events.ts:80-84,473-478):0x70(speed2)→slow(200ms)、0x7A(speed4)→fast(100ms)、0x7B(speed8)→run(50ms)。sdlpal speed 2/4/8 = 4/8/16px 每步(整格视口)。节奏近似(半格步 + 时间驱动 vs 整格视口 + 帧驱动) | 低 | 接受;若实测走位节奏偏离原版,内容层微调 SPEED_MS |
| G4.3 | reforge 0x7F 相对 pan 的 `frames` 语义:sdlpal `do-while ++i<op2`(op2=0 跑 1 帧);reforge `Math.min(steps, done+round(dt/16))`(main.ts:1012)按 dt 推进,frame 概念模糊 | 低 | reforge 帧率无关(dt 驱动),frames 近似成时间;接受 |
| G4.4 | reforge 免疫的是 sceneLoading/白名单耦合，不是 0x50→首个 MakeScene 的隐式淡入；s059 曾漏译而在 dlg.4348 后永久黑屏 | 已修 | s059 semantic overlay 在 fade-out 后首个 wait 前显式插入 600ms fade-in；禁止全局 blanket fade-in，以保留 FBP/RNG 黑屏 hold |
| G4.5 | 场景落点/teleport 曾只重置 leader，丢失 0x46 重填 rgTrail side effect；setParty 后 followers 叠脚下，走一步才恢复 | 已修 | `seedFormationTrail` + 清 frozen/派生位置；静止 fallback=`trail[m]`；四朝向单测 + s059 无方向输入终场浏览器复验 |
| G4.6 | 0x6E 第三 operand layer 曾在迁移中丢失，party cover/sort 层级错误，s059 三人被地形截成半身 | 已修 | clean 命令保留可选 layer；runtime 对齐 PAL party/NPC iLayer、sort offset 与五邻 cover candidates |
| G4.7 | 0x71 离屏 pass 复用绑定主 ctx 的 renderer，context/transform 错配；且人物被一起卷、rAF 推相位过快 | 已修 | context guard + 独立 waveRenderer；background-only wave 后静态 sprites/cover；探索相位按 100ms world tick |

---

## 审计单元 5:页切换 / 状态机 / setPalette

### 5.1 sdlpal C 真值(`script.c` 0x24/0x25/0x40 + 0x8B)

#### 0x24 setAutoScript(script.c:1137-1145)
```c
if (pScript->rgwOperand[0] != 0)
   pCurrent->wAutoScript = pScript->rgwOperand[1];
```
- **op0=0 整条无效**;op0≠0 → 改 `pCurrent`(op0 选,fix4 解析)的 autoScript **入口指针**(全局 lprgScriptEntry 下标)。
- **持久**:`wAutoScript` 存在 event object 上,跨帧 / 跨 PAL_RunAutoScript 调用保留(play.c:183 每帧读它)。

#### 0x25 setTriggerScript(script.c:1147-1155)
```c
if (pScript->rgwOperand[0] != 0)
   pCurrent->wTriggerScript = pScript->rgwOperand[1];
```
- 同 0x24,改触发脚本入口指针。**持久**(play.c:153 读它)。

#### 0x40 setTriggerMethod(script.c:1613-1621)
```c
if (pScript->rgwOperand[0] != 0)
   pCurrent->wTriggerMode = pScript->rgwOperand[1];
```

#### 0x8B setPalette(script.c:2571-2580)— **同步**
```c
gpGlobals->wNumPalette = pScript->rgwOperand[0];
if (!gpGlobals->fNeedToFadeIn)
   PAL_SetPalette(gpGlobals->wNumPalette, FALSE);  // 同步读 pat.mkf
```
- **`PAL_SetPalette` 同步**读 pat.mkf → 当帧生效。
- **仅 !fNeedToFadeIn 时**套到屏幕(FadeOut 后的黑屏期不立即套,只更新 wNumPalette 供后续 FadeIn)。
- **同帧消费**:scene-140 `FadeOut→setPalette→SetRNG→PlayRNG` 同 tick 内,`PAL_GetPalette` 同步 → RNG 读新 palette → 颜色正确。

---

### 5.2 一阶段实现(`event-system.ts`)

#### OP_SET_AUTO_SCRIPT(0x24)(event-system.ts:3853-3880)
```ts
if (entry === 0) { npc.autoLabel = undefined; npc.autoCursor = undefined }
else {
   npc.autoLabel = `L_${entry}`
   const r = resolveScriptLabel(gs, label)
   if (r) npc.autoCursor = { ip: r.ip }
}
```
- ✅ **对齐** script.c:1141-1144:op0=0 无效(op0 在 resolveTargetNpc);op1=0 清;op1≠0 设。
- ✅ **持久**:autoCursor 存 npc 上,跨 tick 保留。
- ✅ **op0 选 NPC**(`resolveTargetNpc`,非恒 self)。

#### OP_SET_TRIGGER_SCRIPT(0x25)(event-system.ts:4454-4465)— 同 0x24 模式

#### OP_SET_TRIGGER_METHOD(0x40)(event-system.ts:4570-4582)
- ✅ **对齐** script.c:1619。commit 修水生叔误改自己(用 resolveTargetNpc)。

#### setPalette 同步回填(event-system.ts:2827-2870)— **W7 修复**
```ts
gs.numPalette = paletteIdx
const synced = _getPalette?.(paletteIdx)  // 同步源(bootstrap 预载 PAT 全块)
if (synced) {
   gs.basePalette = makeWorkingPalette(synced)
   if (!gs.needToFadeIn) gs.palette = makeWorkingPalette(synced)  // 仅 !needToFadeIn 套屏
}
else if (_fetchPalette) { /* 异步回退 */ }
```
- **commit `2aa43b29`**(酒剑仙坐葫芦偏色):旧实现纯 `fetchPalette.then` fire-and-forget → 同 tick 内 setPalette→PlayRNG 时 basePalette 仍旧色 → RNG 偏色。
- ✅ **同步源优先**(`_getPalette`,bootstrap 预载 PAT.MKF 全调色板成 Map):同帧回填,保证同 tick 后续 op(0x37 PlayRNG / 0x51 FadeIn)拿新色。
- ✅ **仅 !needToFadeIn 套屏**(2845,对齐 script.c:2576)。
- `setPaletteSource`(event-system.ts:556)注入同步 getter。

#### needToFadeIn 两白名单(W4 层 B)
- `tickSceneAutoFadeIn`(event-system.ts:645-663):`if (!palGameUpdateRuns || gs.sceneLoading) return` + `if (!gs.needToFadeIn) return`。
- mode.ts:42 autoScript 白名单:`w === undefined || 'frame-wait' || 'scene-fade' || 'camera-pan'`。
- **必须同步**:某 op 设 needToFadeIn 但 autoScript 白名单不放行 → NPC 冻结;反之 autoScript 跑但淡入未消费 → 漏淡入。

---

### 5.3 reforge 实现(`content/script.ts` + `main.ts`)

#### 页切换 = setEntityAuto / setEntityTrigger(content/script.ts:89-91)
```ts
| { kind: 'setEntityAuto'; entity: string; stages: ScriptStage[] }      // 0x24
| { kind: 'setEntityTrigger'; entity: string; stages: ScriptStage[] }   // 0x25
| { kind: 'setEntityTriggerMode'; entity: string; on?; range? }         // 0x40
```
- **注释**(script.ts:87-88):「运行时覆盖,暂不持久 —— 原版存档存指针,clean 版的持久化留给页注册表设计(M4 期)」。

#### setEntityAuto host(main.ts:689-695)
```ts
setEntityAuto: (id, stages) => {
   const e = scene.entities.find(x => x.id === id)
   if (!e) return
   e.pages = e.pages?.length ? e.pages : [{}]
   e.pages[0] = { ...e.pages[0], auto: stages.length ? { stages } : undefined }
   restartAutoRunner(e)  // 停旧起新
}
```
- ✅ **运行时改 auto 页**:mutate `e.pages[0].auto` + `restartAutoRunner`(main.ts:1189-1193 abort 旧 + 起新)。
- ⚠️ **不持久**:注释 script.ts:88 明确「暂不持久」。`e.pages` 是 scene def 的运行时副本(main.ts:241 `structuredClone`),**不进 world.script 存档**。读档 / 切场景重入 = def 初态(`applyWorldToScene` main.ts:430-437 只重放 entityState,不重放 auto 页覆盖)。

#### setEntityTrigger host(main.ts:696-703)— 同 setEntityAuto 模式,改 `trigger` 字段

#### setEntityTriggerMode host(main.ts:704-712)— 改 `trigger.on/range`,on 缺省=关

#### entityStage / stageIndexFor(content/script.ts:138-166)— **clean 化的阶段状态机**
```ts
interface WorldScriptState {
   entityStage: Record<string, number>  // 实体触发阶段(原版 end.advance 推进的"第几段")
}
function stageIndexFor(world, key, stages) {
   const raw = world.entityStage[key] ?? 0
   return Math.max(0, Math.min(raw, stages.length - 1))  // 越界钳末段
}
function applyStageNext(world, key, current, next) {
   if (next === undefined) return
   world.entityStage[key] = next === 'advance' ? current + 1 : next
}
```
- ✅ **持久**:`entityStage` 在 `world.script`(content/script.ts:144)→ **进存档**(buildPayload 序列化 world)。
- ✅ **原版指针 vs clean entityStage**:原版 `wTriggerScript` 存的是**全局 script entry 指针**(下标),每次触发从该指针跑;reforge `entityStage` 存**第几段**(`ScriptStage` 数组下标),`stageIndexFor` 选段。**语义清洁**(无裸指针)。
- ✅ **end.advance/reset → next**(content/script.ts:114):`next?: 'advance' | number`,数字=重置到该段。

#### 0x50 隐式 FadeIn— **迁移必须显式保留消费点**
- SDLPal `script.c:1775-1791` 的 0x50 在已经黑屏时只设置 `fNeedToFadeIn`；随后首个
  `PAL_MakeScene` 才在 `scene.c:501-508` 消费该标记并执行 `PAL_FadeIn(...,1)`。
- clean Reforge 没有这个全局 flag，因此“运行时没有白名单耦合”不能替代迁移语义。s059 dlg.4348 后曾只
  迁出 fade-out，导致永久黑屏；`packages/migrate/src/script-overlays.ts:30-47` 现于首个 wait 前定点插入 600ms
  fade-in。这里必须定点表达，不能给所有 fade-out 自动补 fade-in，否则会破坏 FBP/RNG 黑屏保持。

#### setPalette — **❌ reforge 无此命令**(高危)
- **Command 联合无 setPalette**(content/script.ts:26-103 全表无)。
- reforge palette 仅场景级:`def.paletteId`(content/index.ts:137)→ main.ts:327 `getPalette(def.paletteId ?? 0)` 加载。
- **迁移期 0x8B**:translate-events.ts 无 `oc === 0x8b` 分支 → 落 `JUMP_FAMILY` / 未实现 → `unmigrated` 占位(translate-events.ts:689-693)或 default skip。
- **getPalette 是 async**(main.ts:227):`async function getPalette(id)` —— 即使加 setPalette 命令,host 实现也需 await,**同帧消费丢失**(同 W7 根因)。

---

### 单元 5 缺口 + 风险 + 行动

| 编号 | 缺口 | 等级 | 行动 |
|---|---|---|---|
| **G5.1** | **reforge 无 palette 命令族**(0x8B setPalette / 0x38 setDayPalette / 0x39 setNightPalette),迁移全部落 `unmigrated`(0x38 在 skip 列表 translate-events.ts:76;0x8B/0x39 无任何分支)。scene-140 酒剑仙坐葫芦等 RNG 演出 + 任意脚本内换调色板 / 昼夜色失效 | **高** | **方案**:① 加 `setPalette{id}` + `setNightPalette`/`setDayPalette` Command + host.setPalette(预载 PAT 全块成同步 Map,host 实现同步查表 setPaletteState);② 渲染层每帧读 paletteState。**必须同步**(同 W7):bootstrap 预载,host.setPalette 同步,杜绝 async |
| **G5.2** | **setEntityAuto / setEntityTrigger 运行时不持久**(script.ts:88 注释)—— 读档 / 切场景重置成 def 初态,脚本运行期改的 auto/trigger 页丢失 | **高** | **方案**:页注册表(world.script 加 `entityAutoOverride` / `entityTriggerOverride` Record),setEntityAuto/Trigger host 写 world.script(进存档),applyWorldToScene 重放。**或**:内容层把所有 0x24/25 静态化(不靠运行时改) |
| G5.3 | reforge getPalette 是 async(main.ts:227)—— 即使 G5.1 加 setPalette,若 host 实现不预载成同步,同帧 RNG 消费仍偏色(同 W7) | 高(随 G5.1) | G5.1 实现时**必须** bootstrap 预载 PAT 全块成 Map,host.setPalette 同步查表(参照一阶段 `setPaletteSource` event-system.ts:556) |
| G5.4 | reforge `entityStage` 持久化已对齐(clean 化,无裸指针)—— ✅ 已 clean | — | 无需动作;确认 buildPayload 序列化 world.script.entityStage(save-system) |
| G5.5 | 一阶段 needToFadeIn 的运行时白名单耦合在 reforge 不存在，但 0x50→首个 MakeScene 的隐式消费仍是迁移责任；s059 曾漏译 | 已修/持续审计 | s059 semantic overlay 定点补 600ms fade-in；其他 0x50 站点逐场景审计，禁止 blanket 规则 |

---

## 高危汇总(跨单元,按优先级)

| 编号 | 缺口 | 等级 | 单元 | 核心行动 |
|---|---|---|---|---|
| **G5.1+G5.3** | reforge **无 setPalette 命令**,getPalette async —— 0x8B 失效 + 同帧 RNG 偏色(同 W7 根因) | **高** | 5 | 加 setPalette Command + bootstrap 预载 PAT 同步 Map + host 同步 |
| **G5.2** | setEntityAuto/Trigger **运行时不持久** —— 读档/切场景丢失脚本改的页 | **高** | 5 | 页注册表进 world.script 存档,或内容层静态化 |
| **G2.1** | reforge auto **0x06 原地重掷语义丢失** —— 巡逻 NPC 无随机驻足,节奏恒定变快 | **高** | 2 | 迁移期识别 auto 链 0x06 op1==0 → `randomHold`/`branch.holdOnTrue` |
| G1.3 | reforge 0x04 内联有深度/长度截断 → 超限 call 变 `unmigrated` | 中 | 1 | 统计 migrate 全量 unmigrated 中 0x04 数量 |
| G3.1 | reforge 触发用切比雪夫,sdlpal 曼哈顿 y×2 → 触发区几何不同 | 中 | 3 | 评估格制近似是否够;或忠实改距离公式 |
| G2.2 | reforge auto goto 单 op 自旋(0x03 goto self)无对应 —— 阶段转移靠 next | 中 | 2 | 评估是否需 `loop` 命令;罕见 |

---

## reforge 架构性免疫清单(已对照确认)

| 一阶段坑 | reforge 免疫机制 | 确认 |
|---|---|---|
| 0x8A 双解释器漏侧(event-system.ts:4036 vs battle-opcodes.ts:774) | 单解释器 + startBattle.auto 字段(translate-events.ts:543) | ✅ 免疫 |
| 0x06 概率跳转无 label fall back(jumpToGlobalIp 3430) | AST branch then 臂内联,运行期恒有内容 | ✅ 免疫(trigger 侧) |
| callScript(0x04)callStack + 跨段 shared# | 0x04 迁移期整段内联,无 callStack/IP | ✅ 免疫 |
| goto 不消耗帧(同帧续跑) | for 循环顺序 await;阶段转移靠 next | ✅ 免疫(单段内) |
| sceneLoading 冻屏(走位/骑乘漏清) | 无 sceneLoading;loadScene 是 async await | ✅ 免疫 |
| needToFadeIn 两白名单同步 | 无 tickSceneAutoFadeIn + mode.ts 白名单；显式 fade 是 await | ⚠️ 仅免疫白名单耦合；0x50 隐式 MakeScene 淡入仍须迁移显式表达（G4.4/G5.5） |
| suppressAutoTriggerOnce(TouchFar 死锁) | 触发边沿(落步才查,main.ts:1996) | ✅ 免疫 |
| 走位相对移相机 vs 绝对回正(0x7F 偏移) | cameraOffset 独立累积 + nudgeParty 相对(main.ts:656-662) | ✅ 已对齐 |
| autoScript owner 排除窗口 | auto 不感知对话(设计裁决 main.ts:1106) | ✅ 规避(语义不同但合理) |
| 0x7F pan 期间 autoScript 冻结 | cameraPanFx 渲染层 fx,不 gate auto runner | ✅ 免疫 |
| 页切换指针 vs entityStage | entityStage clean 化(无裸指针,进存档) | ✅ 已 clean(entityStage 持久;setEntityAuto/Trigger 不持久 = G5.2) |

---

## 附:核心 path:line 锚点速查

### sdlpal(`reference/sdlpal/`)
- `PAL_RunTriggerScript`:script.c:3139-3480(循环 3194;0x04 call 3258;0x06 3299;0x07 3314)
- `PAL_RunAutoScript`:script.c:3482-3651(0x06 auto 3575;0x04 auto 3566;0x03 goto 3549;0x09 3593)
- `PAL_InterpretInstruction`:script.c:586-3084(0x24 setAutoScript 1137;0x25 1147;0x40 1613;0x46 setPartyPos 1665;0x50 fadeOut flag 1775;0x8A 2564;0x8B 2571;0x6E 2091;0x71 screenWave 2132;0x7F 2292;0x70 2125;0x7A 2245;0x7B 2252;0x3F 1605;0x44 1650;0x97 2701)
- scene.c:`PAL_MakeScene` 453-508（ApplyWave→DrawSprites 475-491；隐式 FadeIn 501-508）。
- `PAL_PartyWalkTo`:script.c:100-200;`PAL_PartyRideEventObject`:202-307
- play.c 触发:107-165(touch 自动)/ 172-192(autoScript)/ 440-499(search 手动)
- global.h:82-93(triggerMode 枚举)

### 一阶段(`packages/game/src/core/`)
- `applyRawOpcode`:event-system.ts:3529-5583(0x8A 4036;0x06 4266;0x04 4739;0x24 3853;0x25 4454;0x40 4570;0x46 3709;0x6E 4215;0x7F 3650;0x70/7A/7B 2645;0x3F/44/97 2725)
- `tickAutoScripts`:event-system.ts:1242-1285;`runOneAutoOp`:1287+(0x06 auto 1387;0x04 auto 1426)
- `jumpToGlobalIp`:event-system.ts:3430;`restoreModeAfterScript`(suppressAutoTriggerOnce):3358-3374
- `setPalette`:event-system.ts:2827-2870;`setPaletteSource`:556;`tickSceneAutoFadeIn`:645
- scene-system.ts:`updateEventObjectsAndTrigger`:200-266;`tickScenePreInput`(suppress):450-455
- mode.ts:`tickByMode` autoScript 白名单:39-50
- battle:0x8A 双侧 battle-opcodes.ts:774-776;fAutoBattle seed battle-state.ts:903;战后清 battle-system.ts:3111

### reforge(`packages/reforge/src/` + `packages/content/src/`)
- `ScriptRunner`:script-runner.ts:152-319(`run` 175;`runStages` 194;`exec` 207;chance evalCondition 124)
- `ScriptHost`:script-runner.ts:22-92;Command 联合:content/script.ts:26-103
- `stageIndexFor`/`applyStageNext`:content/script.ts:152-166;`WorldScriptState`:138-145
- main.ts:`getPalette`(async)227;`hostFade` 439;`authority` 454-458;`host` 460-712(startBattle.auto 713/856;moveEntity 619;moveParty 652;nudgeParty 656;cameraPan 663;cameraSnap 676;setEntityAuto 689;setEntityTrigger 696;setEntityTriggerMode 704;mountParty 604;ride 613)
- main.ts:`startAutoRunner` 1094;`startAutoRunners` 1122;`restartAutoRunner` 1189;`deriveMounts` 991;`advanceMoves` 1008
- main.ts:`startScript` 1207;`fireTrigger` 1294;`findTrigger` 1277(touch 边沿 1996)
- migrate:translate-events.ts(0x04 内联 612;0x06 branch 546;0x24/25 645;0x40 672;0x8A→startBattle.auto 530);translateStages 116(无 auto/trigger 区分)
- A7-3 当前锚点:`follower.ts:51-65,104-115`；`main.ts:741-745,1018-1027,2534-2613,2664-2683`；
  `render-scene.ts:29-42`；`screen-wave.ts:52-83`；`frame-animation-player.ts:161-184`；
  `migrate/src/script-overlays.ts:30-47`。

### 关键 commit(一阶段踩坑 → 修复)
- `0f71695e` 0x8A 事件侧补实现
- `5d256f8f` 0x06 fall back 全局 ip(鱼游出池塘)
- `bb388ecf` autoScript runner 对齐 RunAutoScript(DH4/DM16/DL13/DL15)
- `e8a53ac1` autoScript owner-skip 仅 waiting===undefined
- `eaaa1d50` goto 不消耗帧(张四划船)
- `9367efc6` 李大娘 TouchFar 死锁(suppressAutoTriggerOnce)
- `c6482fff` 走位/骑乘清 sceneLoading
- `2ab8ad80` camera-pan autoScript 白名单
- `2aa43b29` setPalette 同步回填(酒剑仙偏色)
- `8eae732d` reforge 走位首步零延迟
- `43010172` reforge 载具 mountParty/ride 权威
