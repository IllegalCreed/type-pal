# M3 · 剧情脚本系统 — 翻译器 + 解释器设计(v1)

> 2026-07-02。基于:①全库字节码普查(43,503 指令/160 opcode,统计见 §1);②B2 v0 草稿
> (`script-system-design.md`,定了结构化嵌套 AST 的大方向);③一阶段 event-system.ts 的
> 全部架构教训(CLAUDE.md 工程经验节)。**本文定 M3 的完整方案:AST v1、翻译分层、
> 解释器架构、分期验收。**2026-07-14 R2 修订**：本文原先的可执行 `unmigrated`“逃生口”已经退役；
> 现在只有迁移期 `MigrationGap`，可达缺口会阻断生成，不进入 content/editor/runtime。其余历史设计仍作为 M3
> 决策背景保留。

## 0. 一句话

原版脚本 = 扁平 bytecode + IP 跳转;**76% 触发链完全线性、onEnter 98% 线性、跳转族仅
31 个 op 且几乎全是"失败旁路"单臂形** —— 结构化重建的难度远低于预期,主食是模式识别
(门传送 666 条、纯对话 NPC 291 条、宝箱 136 条),长尾走逃生口。

## 1. 普查事实(设计输入,全库数字)

- **43,503 指令**;对话族占 38.6%(showDialog 13,513 + 样式 op)。44 op 覆盖 95%。
- **触发链 2,322 条(唯一)**:76.2% 完全线性;conditional 14.7%(其中 321/342 只是
  startBattle 败/逃分支);真·数据条件跳 ≤22 条(0.9%)。链长中位 4,p90=9,最长 416。
- **Top 链形**:`loadScene setPartyPos fadeOut end`×666(29%!门传送);`startBattle goto`
  ×274(遇敌);宝箱 ×136;纯对话 ×291(2-4 句);楼梯走位传送 ×79;拾取+消失 ×72。
- **跳转/分支族 31 op 全清单**(操作数携带目标,普查表存档):高频真分支只有
  0x07 startBattle(434)/0x06 jumpByRate(235)/0x0A gotoIfNo(26);其余全是低频失败旁路。
- **多阶段触发**:end.advance(0x01,1186)= 顺序推进"下次交互跑下一段";end.reset
  (0x02,513)= 重置到指定段。**这是原版的"页"机制**,imperative 版。
- **autoScript 287 条唯一链**:65% 线性循环体;end.reset 循环 41%;jumpByRate 随机徘徊
  59 条;四件套 = 走位步+帧动画+wait+随机分支。**链首定向 527 实体**(已在 M2 静态折叠)。
- **onEnter 146 条**:97.9% 线性;主导 = playMusic 52% / setPartyPos 46% / setBattleField
  36%(遇敌战场配置)/ 入场 cutscene 长尾(p90=84,最长 468)。
- **等待/阻塞两类**(一阶段 waiting union 对齐):A 等待态(dialog/frame-wait/fade/
  scene-load/camera-pan/shop/RNG 播片…);B 原地重试(walkTo 族/rideObject,每 tick 一步)。

## 2. AST v1(在 v0 上的增量)

v0 的骨架(Command 判别联合/结构化嵌套/Script/页模型/flags+vars)不动,增量如下:

### 2.1 世界状态 —— 实体状态是一等公民

```ts
interface WorldStateScriptExt {
  flags: Record<string, boolean>
  vars: Record<string, number>
  // 原版 sState/触发段推进的 clean 版:页选择的数据源(1,373 次 setObjectState + 1,699 次
  // end.advance/reset 都落在这两张表上)。跟存档。
  entityState: Record<string, number>   // 实体可见性/形态档(原版 sState)
  entityStage: Record<string, number>   // 实体触发阶段(原版 end.advance 推进的"第几段")
}
```

### 2.2 实体页模型(v0 决策⑥的落地形)

```ts
interface EntityPage {
  when?: Condition          // 声明式(手工内容用);省略 = 默认页
  state?: number            // 匹配 entityState(迁移内容用;when/state 二选一)
  sprite?: string; pos?: GridPos; facing?: Facing; visible?: boolean; collide?: boolean
  trigger?: { on: 'interact' | 'touch'; range?: number; stages: Script[] }
  //                                    ^ 多阶段:entityStage 选第几段(end.advance 的 clean 版)
  auto?: { body: Command[]; loop: boolean }  // autoScript:每帧推进的环境行为(巡逻/动画)
}
```

- **迁移内容用 `state:`+`stages[]`**(imperative 语义 1:1);手工内容用 `when:`。
- M2 静态字段(hidden/collide/facing/interact)= "单默认页"的扁平简写,loader 归一化。
- `setTriggerScript/setAutoScript/setTriggerMethod`(639 次)→ 翻成 `switchEntityPage`
  命令(imperative 换页,存 world.entityPages 覆盖位;声明式 when 在无覆盖时才生效)。

### 2.3 命令增量(按普查频次排,v0 已有的不列)

| 新命令 | 覆盖的原版 op | 说明 |
|---|---|---|
| `clearDialog` | 0x05 redrawScreen(2,671) | 原版语义=PAL_MakeScene 清对话箱(一阶段踩坑:立绘残留);新引擎无需重绘,只清对话 |
| `teleportParty{pos,facing?}` | 0x46(1,064)+0x15 | 场景内瞬移(≠loadScene) |
| `setEntityState{entity,state}` | 0x49(1,373) | 改 entityState → 页重选(隐/现/换形态) |
| `setEntityFacing/Frame` | 0x0F/0x14/0x16(1,698) | 演出用定向定帧 |
| `moveEntity{path,speed,wait}` | walkTo 族+单步族(~2,300) | 翻译时把连续单步**合并成 path**;speed 枚举对齐原版 2/3/4/8 |
| `moveParty{...}` / `stepParty` | 0x7A/0x70/0x7B/0x6E | 队伍走位(演出) |
| `animEntity{frames?}` | 0x87(189) | 推一拍动画帧 |
| `playMusic/setBattleMusic/setBattleField` | 0x43/0x45/0x4A | onEnter 主导族;battleField 是场景遇敌配置 |
| `startBattle{team,onLose?,onFlee?}` | 0x07(434) | 两臂结构化;胜利 = 顺序续走 |
| `branch{cond:{kind:'chance',percent}}` | 0x06(235) | 随机分支(徘徊/彩蛋);Condition 加 chance |
| `confirm{prompt,onNo}` → 语法糖归 choice | 0x0A(26) | 是/否框 |
| `openShop{shopId,mode:'buy'\|'sell'}` | 0x26/0x27 | 商店表另建(items 已有价格字段) |
| `switchEntityPage{entity,page}` | 0x24/0x25/0x40 | 见 §2.2 |
| `advanceStage{entity?,to?}` | 0x01/0x02(1,699) | 脚本末尾推进/重置触发阶段;翻译器自动插入 |
| `camera{...}`(v0 已有,补 pan 语义) | 0x7F(317) | 相对 pan(一阶段教训:绝对回正毁演出) |
| `MigrationGap`（仅迁移器内部） | 长尾诊断 | 记录源地址/opcode/operands/归属/引用路径/原因；可达缺口阻断写盘，不属于 `Command` |

Condition 增量:`chance`(0x06)、`entityState{entity,is}`(0x94 jumpIfObjState)、
`hasMoney{atLeast}`(0x1E 减钱分支)、`inParty{actorId}`(0x79)。其余低频条件跳(≤26 次)
按需增加 clean 命令；暂时不能翻译的可达站点必须作为迁移缺口失败，不能进入工程内容。

### 2.4 触发器

```ts
type TriggerKind = 'interact' | 'touch' | 'sceneEnter' | 'use' | 'auto'
```
原版 triggerMode:1-3=search(按 1 起交互,range 1-3)→ interact;4-8=touch(走近自动,
range 0-3)→ touch。SceneDef 增 `onEnter?: Script`(146 场景)。`use` 挂 ItemUseEffect
.triggerScript(M1d 已留口)。

### 2.5 场景入场呈现契约(X3-1)

`ScriptStage.entry` 是目标场景活动 stage 的可选呈现元数据，不是来源 `loadScene` 的参数。
它把原先扁平的早期命令分成三个阶段:

1. `prepare`: 在旧 presented frame 仍被 compositor 冻结时，对目标逻辑世界做同步准备。
2. `reveal`: 以 `dither | fade | cut` 之一原子提交目标画面。
3. `body`: 呈现完成后才跑正常演出、对话和 stage 推进。

`ScriptRunner.runStages` 是顺序的唯一执行者；`SceneEntrySession` 只持有 source frame、目标场景、
reveal 契约和生命周期 token。切场景、读档、abort、prepare 异常或资产加载失败都必须清理
session，旧 token 不得收口新事务。无 `entry` 时仍走普通 fade；非 onEnter 站点的
`ditherScreen` 仍在当前已呈现画面上工作。

旧 PAL 脚本的 lifting 仅发生在 migrate，且同时扫描 root 与 `setSceneOnEnter` override；运行时
已删除命令前缀白名单和分片穿透预读。

## 3. 翻译器(migrate 包,纯函数 + golden)

**分层策略 —— 按普查份额逐层吃,每层可验收:**

1. **模式层(≈60% 触发链)**:门传送(666)/纯对话(291)/宝箱(136)/拾取(72)/楼梯走位(79)
   → 直接产出高层命令序列。识别失败自动降到下一层,**不硬套**。
2. **线性直译层(补到 76%)**:线性链逐 op 查表翻译;连续单步合并 path;对话样式 op
   折叠进 DialogueLine.style;waitFrames→wait{ms}(40ms/帧)。
3. **结构重建层(conditional 14.7%)**:基本块 + 跳转族 31 op 清单 → 单臂失败旁路 →
   `branch{then}`;startBattle 双臂;end.advance/reset → stages+advanceStage;
   goto 单前驱内联、多前驱提成共享 Script(callScript);回跳仅认 autoScript 循环形。
4. **阻塞诊断(长尾)**:`MigrationGap` + 分类报告(源地址/场景/实体/op/引用路径/原因)。
   先补迁移语义或明确改写方案，再允许生成；不再输出可执行占位节点。

**label→Script 命名**:`s005/e127/t0`(场景/实体/触发段序)、共享段 `shared/L_35639`;
callScript 目标全部提名。翻译是**整库一遍**(跨场景 label 引用,M2 朝向折叠已建全局索引)。

## 4. 解释器(reforge 包)—— 原生 async,单解释器

一阶段的坑全部用架构消解,不再打补丁:

- **ScriptRunner = async 函数树**:每命令 `await run(cmd)`;等待 = 子系统 driver 的
  Promise(dialogDriver.confirm()/movementDriver.arrive()/fadeDriver.done())。
  ⇒ 没有 waiting 枚举、没有"孤儿 time-based 态"(一阶段:每个 fade/hold 要点名收尾人)、
  没有"C 阻塞异步化丢同帧后续"(await 天然保序)。
- **单脚本槽 + 实体 auto 并发**:触发/onEnter 脚本独占主槽(event 模式,冻结探索输入
  = 原版语义);每实体 auto 页是独立 runner(结构化并发,场景切换时统一 cancel)。
  parallel 命令 = Promise.all 子块。**取消语义**:AbortSignal 贯穿全部 driver Promise
  ——切场景/读档即 abort,杜绝一阶段"覆盖层吞键/演出残留"类 bug。
- **确定性**:runner 的时间源 = 主循环 tick 注入(不是 wall-clock),离线可单测
  (一阶段离线 harness 方法论直接复用)。
- **战斗边界**:`startBattle` await 一个由 M4 实现的接口,M3 期先接"必胜桩"。

## 5. 分期与验收(接 roadmap §8 M3 行)

| 期 | 内容 | 验收(浏览器实测) |
|---|---|---|
| **M3a 骨架+线性** | AST schema/guard + 解释器核(dialog/teleport/loadScene/give/fade/wait/music)+ 翻译模式层+线性层 + onEnter | 盛渔村:进门出门(666 门)、NPC 对话、宝箱拾取、进场音乐/落位全走脚本;`?scene=` 任意逛 |
| **M3b 状态+分支** | flags/entityState/stages/页切换 + branch/chance/battle 双臂(桩)+ 商店 + autoScript 巡逻/动画 runner | 码头市集活起来(游走小贩/招牌动画);多阶段对话推进;商店可买卖 |
| **M3c 演出+长尾** | camera/moveParty 编排/parallel/RNG 播片位 + callScript 共享库 + 迁移诊断 | 开场 → 出村完整剧情链；可执行产物零 `unmigrated`，可达 gap 为 0 |

编辑器侧(B2/C 系列):M3 只交付**数据模型 + 只读脚本树查看器**(验证眼睛);
可视化编辑/模板表单是 C-track,另排。

## 6. 已拍板 / 遗留

- ✅ 单解释器、无兼容执行器(P0-5/6 不复活)；R2 已进一步删除可执行 `unmigrated` 数据节点，缺口只存在于迁移报告。
- ✅ 实体状态/阶段一等公民(不是 flag 命名约定)—— 编辑器可做专用 UI。
- ✅ 翻译整库一遍 + 全局 label 索引;共享段命名 `shared/*`。
- ⏳ choice(多选项)原版不存在(只有 0x0A 是/否)——保留 v0 设计给新内容。
- ⏳ 0xA2 相对随机跳(2 次)/收妖/炼丹等战斗耦合 op → M4 期一并。
- ⏳ 对话选择的 DialogueLine.style 枚举与一阶段 dialog-box 样式对齐(M3a 落地时定)。
