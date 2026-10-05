# TEST-GLM-GAME-EVENT-STATE-OPCODES-1 合同排重账

对照源（fullName×caller×合法输入×oracle 四维）:`event-system.test.ts`(旧全量)、
`event-system.cov85.test.ts`、`event-system.glm-event-contracts.test.ts`(已归档卡 §1/§4 为底账)、
`event-system.glm-event-control-flow.test.ts`(已归档)、`glm-event-k01~k06`、
`event-dialogue-pagination(.glm-contracts)`、`event-opcode-player.{test,cov85,glm-next-wave,glm-opcode-residual}`、
`event-opcodes.cov85`、`mode`、`game-state(.glm-next-wave)`、`scene-system.test.ts`(走路清 pose 旧证)、
battle `runscript-rearm`。

方法:hex 字面量 + `OP_*` 常量名双 grep(前卡判例),叠加 **coverage 并集实证**——两轮 v8 statement 级
coverage:①event/opcode 相关 21 文件 574 测试、②game 全套件 3498 测试,均
`--coverage.include=event-system.ts / event-opcode-player.ts`;零命中簇逐段读源码定性。
原始 JSON 见本目录 coverage-probe/(两轮几乎一致 → 无"单文件子集假阳性"问题)。
判例沿用:同 caller + 同 oracle 只登记;换数字/换包装不算新合同;先证排重再动笔。

**NEW** = 本卡新增(`event-system.glm-event-state-opcodes.test.ts`,8 it,全部来自 coverage 零命中臂);
**REG** = 旧证登记锚点;**unreachable/defensive** = 数据下界不可达或合法输入不可达,不伪造覆盖。

## 0. event-opcode-player.ts 状态写回(卡面范围第二支)

全量并集 coverage 零命中仅 `:98 if (!eqRow) return true` —— opcode-residual 卡(2026-10-05 归档)
已登记为防御守卫(rgwEquipment 六行在 createInitialGameState 恒初始化);其余全部语句/臂均有旧证
(opcode-residual 6 NEW + cov85 r1/r3 + 旧测 + glm-next-wave + magic-script)。**本卡该文件零新增。**

## 1. NEW(8 合同,全部 coverage 全量并集零命中)

| ID | source:line | 公开 caller | 合同轴 / oracle | 针 |
|---|---|---|---|---|
| W1 | 4829-4834(到达臂)+ 2673-2675(拦截推进)+ 4809(trail 收口) | tickEventSystem | 0x7A 多步走位**到达**:snap 到目标 + walking=false + DL26 `&2^2` 相位复位 + 满 5 trail 收口 + 到达同 tick 续跑下一条 opcode(dwCash 生效) | MUT-01 |
| W3 | 4789-4791 | tickEventSystem | 0x7A 走位**首步清 0x15 scripted pose**(UpdatePartyGestures(TRUE) 覆写;pose 残留会让静止后恢复旧姿势) | MUT-03 |
| W2 | 4779-4783 | tickEventSystem | 0x70 **零距离走位**:立即到达且零副作用(不重算 facing/不 unshift trail/不清 pose/照常 DL26 复位) | MUT-02 |
| L1 | 2821-2825(skip 臂,guard 真值 script.c:1870-1885) | tickEventSystem | loadScene **同场景冗余**:不置 pendingSceneLoad/sceneLoading、不触发 loader,仅推进续跑 | MUT-04 |
| E1a | 5083-5090(命中臂) | runEnterScript(导出) | onEnter 同步路径**结构化 goto 命中**:跳 label 续跑,跳过段 opcode 不执行(dwCash 只计 ip0、0x46 落 label 位) | MUT-05 |
| E1b | 5084-5087(缺失臂) | runEnterScript(导出) | onEnter 同步路径**goto 缺失**:warn + fail-stop,前段已生效、后续 opcode 不执行(不抛错不自旋) | MUT-06 |
| M1 | 4948-4951(i+j*2≥48 子臂) | tickEventSystem | 0x4C **阻挡追击菱形回弹基准**:子格 i+j*2≥48 → prevx/prevy 双 tile 进位,全阻挡回弹落 (352,336) 而非原坐标 | MUT-07 |
| S1 | 4488(rgwData 扩展) | tickEventSystem | 0x90 **稀疏写回**:idx=2+op2 越界时零填充扩展(槽 7/8 必须是 0,C rgwData 定长零初始化语义)后落值 | MUT-08 |

fixture 合法性:typed `Command` 数组 + `createInitialGameState` 公开状态字段(与旧测同法);
setObstacleChecker/setSceneLoader 是产品注入 setter(旧测 2196/3826 同用法,loader mock 返回
Promise 符合 SceneLoaderFn 契约);不读私有 cursor、不 mock 业务核心、无强转/skip/ignore/扩 timeout。
数据面佐证(W1/W2/W3 现实可达):onEnter 段直接可见 party 走位 op——0x70×6、0x7a×5、0x7b×10
(见 onenter-walk-reachability.md;刘晋元房间 enter 18753 等 cutscene 正是该链)。

## 2. REG(本卡范围内已证,登记不包装)

- **走位族起步/步长/隔帧**:0x7A 每 tick ±8(旧测 2058)、0x7B 一步 16(2069)、0x7C stagger 两臂
  (2074/2081)、0x10/0x11/0x82 auto 侧全族(cov85:286-317 + 旧测 B 类移动);0xA1+0x44 骑乘跟随者
  重叠不变量(旧测 2151,多步不到达形态)。
- **NPC 走位/骑乘 trigger 侧到达推进臂(2723-2724 / 2756-2757)**:与 W1 同 caller 同拦截模式
  (`arrived → ip++ + break` 同帧续跑)、oracle 同形;npcWalkTo 到达本体(4749-4751)auto 侧已证、
  partyRideEventObject 到达 return(4900)旧测每次调用已执行 —— 按"换包装不算新合同"同形登记。
- **loadScene 主臂**(pendingSceneLoad/wNumScene/sceneLoading/RNG 态清理/wLayer=0,2805-2819):
  pagination/contracts/scene-system 族旧证;0 哨兵/越界臂与 L1 同 guard 不同输入值,并入 L1 判别域。
- **runEnterScript 已证臂**:0x08 checkpoint + 0x00/0x01 收尾持久化(旧测 4288/4300)、raw 条件跳转
  cursor 接线(4312);ip 越界 return(5064-5066)由 0 哨兵/短脚本自然覆盖(全量并集命中)。
- **0x4C monsterChase 已证三臂**:无障碍追击朝 party 走 1 步 + 朝向(2196)、floating 跳过障碍检查
  (2211)、wChaseRange==0 驱魔香原地打转(2245);4966-4967(x<0 象限朝向)包含其中。
- **0x90 setObjectScript 已证臂**:界内写 rgwData[3](旧测 4499)、新建 overlay 从静态敌人表播种
  (4510+);0x75 setParty 三臂(4474/4481/4486)。
- **applyRawOpcode 状态 opcode 全族 REG**(contracts 卡 §4 账逐 opcode 锚点,本卡并集 coverage 复核
  无新零命中):对象状态/位置/方向(0x13/0x14/0x0F/0x16/0x6C/0x7D/0x7E/0x87/0x4A/0x49/0x9A/0x12/0x6F)、
  party/scene/camera(0x46/0x15/0xA1/0x8F/0x75/0x98/0x99/0x6D/0x65)、inventory/equipment/poison
  (0x1E/0x1F/0x20/0x86/0x5D/0x61/0x74/0x79)、cash(0x8F 旧测 3961+2816)、script-result(0x41/0x38/
  0x83/0x81/0x84/0x94/0x95/0x06/0xA2)、清理链(end 全链/resolveConfirmGoto/consumePendingItem ——
  control-flow + contracts 卡)。

## 3. unreachable / defensive 登记(不伪造覆盖)

| 臂 | source:line | 定性 |
|---|---|---|
| applyRawOpcode 0x7F 相对 pan(3611-3614) | 3612-3613 | trigger 侧全部被 tickEventSystem 2381-2417 拦截(不落此处);autoScript 侧全库零可达(control-flow 卡数据面 BFS,2165 入口+250 装载目标);残余 caller 仅 battle runScript raw fallback——全库 317 条 0x7F 全在 trigger/onEnter 链,战斗 item/magic/poison 脚本零实例。**unreachable(数据)**,不测不钉 |
| tickEventSystem NPC 走位/骑乘 no-self 跳过臂 | 2692-2693 / 2739-2740 | onEnter 异步 cursor 无 currentEventObjectId 时触发;数据下界扫描 160 个 onEnter 入口线性段 **0 处** NPC 走位/骑乘 op(onenter-walk-reachability.md)。**unreachable(数据下界)** |
| partyWalkTo 已到臂之外的三处 `&2^2`(1484/2434/4782) | — | 1484 frame-wait DL16、2434 0x05 redraw M1(cov85+旧测命中)、4782 归 W2 判别域;非零命中 |
| 0x4C x/y 对齐随机方向(4937-4938) | 4937-4938 | 合法输入可达但需钉 Math.random;oracle(朝向/位移)与已证象限合同(2196)同形 —— 换包装,登记 |
| 0x4C 象限朝向 x≥0 臂(4969)/骑乘 NW 朝向(4868)/骑乘零偏移到达(4864) | — | 换方向/换数字同形登记(2196/2151 已证同 caller 同 oracle 族) |
| tickEventSystem 结构化 op throw(2880-2884) | 2880-2884 | contracts 卡已证 runScript 侧同语义(3143-3146);tickEventSystem 侧属控制流卡范围(结构化 op M2 未实现守卫),登记留 Codex 裁置,本卡不越界补 |
| 0x7F 非豁免臂清残留 box(2389-2390) | 2389 | control-flow 卡 it-2 证的是豁免臂保留;非豁免清臂在其 scope(0x7F 家族)内仍零命中,登记观察待裁,本卡不越界补 |
| 各防御守卫 | 4419(0x04 entry=0)、4617-4618(getSelfNpc 无效 id)、1540/1575-1596(modal waits)、1376-1377/1409(auto 防御)、3417(jumpToGlobalIp !cursor)、2457-2458(0x05 palette 缺席)、2865(fetchPalette catch)、3076(battle 0x35 缓冲)、3149-3150/3210-3151(runScript/poison 入口兜底)、5059-5060(runEnterScript tick-limit)、1099-1102/1187-1188(dialog keep 辅助)、2135/2155-2157(setDialogStyle center/narration return 臂,对话域非本卡轴)、2284-2312(FBP handler 未注入 fallback) | 合法生产输入不可达或纯 UI/注入缺失 fallback;其中 4419/4617 在 applyRawOpcode 状态轴内显式登记,其余出轴 |

## 4. fullName 唯一性

新文件 8 个 it 全名互异;`event-system.glm-event-state-opcodes.test.ts` 文件名全仓唯一;
directed-vitest.json 逐条落盘 file×fullName×status(passed ×8)。

## 5. 判例

- **"旧测已碰该 opcode"≠"该 opcode 已证"**:走位族旧测只起步(1 tick 断言步长/不推进),
  到达/清 pose/零距离三臂全量并集零命中;排重必须落到臂级 coverage,opcode 级登记会漏。
- **loader mock 必须满足返回值契约**:vi.fn() 返回 undefined,needle 红相位经
  triggerPendingSceneLoad 的 `_sceneLoader(sid).catch(...)` 炸 TypeError 而非业务断言
  (r2 判据 red-no-business-assertion 正确拒收);修法 = mock 返回 Promise(真实 SceneLoaderFn 形状)。
- **MUT-04 红断言落点漂移**:needle 使 loadScene 误入 reload 分支后,end 链消费 pendingSceneLoad
  并再置 sceneLoading=true → 首红断言是 sceneLoading 而非 pendingSceneLoad;判据只要求
  唯一失败=目标合同 + AssertionError,断言落点在合同内即可。
