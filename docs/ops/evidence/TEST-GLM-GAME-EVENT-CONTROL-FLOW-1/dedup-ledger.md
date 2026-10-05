# TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 合同排重账（r1）

对照源:`event-system.test.ts`(旧全量)、`event-system.cov85.test.ts`、
`event-system.glm-event-contracts.test.ts`(已归档 TEST-GLM-GAME-EVENT-CONTRACTS-1,其 §1/§4 账为本账底账)、
`glm-event-k01/k02/k04/k06`、`event-dialogue-pagination(.glm-contracts)`、`mode.test.ts`、
`event-opcode-player.{test,cov85,glm-next-wave,glm-opcode-residual}`、battle `runscript-rearm`。
排查方法:hex 字面量 + `OP_*` 常量名双 grep(前卡判例),叠加 vitest coverage 实证
(v8 statement 级,10 文件 415 测试跑 `--coverage.include=src/core/event-system.ts`,
对每个疑点分支读 statementMap 命中数;原始两次 coverage JSON 摘录见本目录 coverage-probe/)。

**NEW** = 本卡新增测试(`event-system.glm-event-control-flow.test.ts`,2 it);
**REG** = 旧测已证,只登记锚点不新增(卡面纪律);**unreachable** = 数据/调用面不可达,留证据不伪造覆盖。

## 1. runOneAutoOp end/callStack/goto/reset/random-rate/wait(1254-1469)

| 合同 | 去向 | 锚点 |
|---|---|---|
| end plain park / advance / reset idleFrames 三拍 / resetTo 缺失停 / callStack 弹帧 | REG | cov85:128-204 + k02:52-80 + contracts 账 §1 |
| goto 恒跳同帧续跑 / 计数满 fall-through / 目标缺失停 / 自环护栏 | REG | cov85:205-236 + 旧测 2388 |
| 0x09 wait 逐帧累计 / ip 越界停 / default 防御 ip++ | REG | cov85:238/255/318 |
| 0x06 rate=0 原地重掷 / 恒跳 / label 缺失恒等回退(鱼漂移) | REG | cov85:263 + 旧测 2432 块(2467 回归) |
| 0x04 instant callee 同帧跑完 / **多帧 callee 退化逐帧 + stall-break** | REG | 旧测 2525-2546 / contracts 卡 NEW-it |
| 0x10/0x11/0x7C/0x82 walk + stagger | REG | cov85:286-317 + 旧测 B 类移动(0x82=0x10 仅速度差,语义等价登记) |

## 2. 0x7F moveViewport / camera-pan(2381-2417 拦截、1499-1513 waiting 推进、3596-3616 raw)

| 合同 | 去向 | 锚点 |
|---|---|---|
| 回正 [0,0,0] → camera=party-(160,112);绝对 [n,n,0xFFFF] → (n*32-160,n*16-112) | REG | 旧测 5725/5734 |
| 单帧 pan(op2<=1)移一次+yield 1 帧;多帧 waiting='camera-pan' 逐帧移+完成续跑;负 SHORT | REG | 旧测 5743/5751/5774 |
| 0x6E+0x7F 成对走步(相机固定、逐帧 yield) | REG | 旧测 5792 |
| isEventCursorAtMakeSceneStep 分类(pan 算 MakeScene;全 0/flag 0xFFFF 不算) | REG | cov85:397 |
| waiting 推进 handler(1500-1511:camera+=dx/dy、自减、完成清四字段+ip++) | REG | 旧测 5751(3751 帧序走完) |
| **[0,0,0xFFFF] 回正豁免(2388-2391):唯一跳过 PAL_MakeScene 的组合 → 空 body 残留 box 与 currentDialogPortraitIcon 保留,后续无 setDialogStyle 对话 append 继承立绘** | **NEW** | 本卡 it 2;sdlpal script.c:2314-2319;真数据锚 all.json idx 9001(全库唯一实例,林天南 loadScene40→0x46→0x7F[0,0,0xFFFF])。coverage 实证:2389 clearDialogBoxes 体与豁免臂在全仓 415 测试 0 命中;对照臂([0,0,0]+box 在场)由本卡 it 2 对照参数补证,657 同机制但 0x7F 时 box 已不在场(其 coverage 亦证) |
| autoScript 侧 0x7F(runOneAutoOp raw fallback → applyRawOpcode 单步移动) | unreachable(数据) | 全数据扫描(下方"数据面证据"):2165 个自带 autoLabel 对象 + 250 个 0x24 setAutoScript 装载目标,按 disasm JUMP_TARGET_OPERAND 精确跳转语义 BFS,**零脚本可达任何 0x7F**。附注:该路径单步移动与 sdlpal PAL_RunAutoScript default→PAL_InterpretInstruction 完整 do-while(script.c:3652-3656)存在潜在语义差,数据不可达故不测、不钉现行为;留 Codex 裁决是否按 latent 对齐登记 |

## 3. 0x0A goto-if-no / confirm 派发 / resolveConfirmGoto(1620-1653、2320-2328、3435-3453)

| 合同 | 去向 | 锚点 |
|---|---|---|
| 进入 confirm(默认否/ip 不动)/ 无按键阻塞 / 方向键 toggle 不提交 | REG | 旧测 1613/1623/1634 |
| 是 → ip++;否/Cancel → goto operand[0] 续跑 | REG | 旧测 1652/1663/1672 |
| 问句 confirm 期保留,提交才清 | REG | 旧测 1684 |
| **resolveConfirmGoto fail-closed(3442-3452):目标不在 labelMap → 终止脚本+清问句+consumePendingItem+iCurEquipPart=-1+restoreModeAfterScript,返回 false** | **NEW** | 本卡 it 1;coverage 实证 3443-3449 全仓 0 命中;同款清理链在 goto 缺失(旧测 1432)与 'end'(旧测 4143 物品门)已证,本合同是 confirm 这条独立 caller 上的目标缺失臂 |

## 4. OP_PLACE_USED_ITEM 0x84(4387-4413)

| 合同 | 去向 | 锚点 |
|---|---|---|
| 合法放置(party 正前方 + sState=op1)/ sState SHORT(0xFFFF→-1)/ 对象缺失 → jump op2 + fScriptSuccess=false / 障碍 → jump op2 + false | REG | 旧测 3754/3768/3811(facing=right 机制臂) |
| facing left/up/down 三朝向同一三元式换数字 | REG(同形登记) | 与 0x46 trail 四朝向(旧测 1730)同 offset 符号约定;按"换数字不算新合同"不包装 |

## 5. event-opcode-player.ts 公开等待/终止/返回链

| 合同 | 去向 | 锚点 |
|---|---|---|
| applyPlayerOpcode 返回链(false→applyRawOpcode switch / true 消费)、战斗保留族 0x21/0x28/0x2a/0x2e 世界侧 no-op | REG | glm-next-wave:104-109 + 旧测 174 |
| runPlayerPoisonEntrySync 全链(入口解析/end 三态/0x04 弹帧/goto 两臂/阻塞返回 startIp/越界/角色目标链/世界侧 0x29 集成) | REG | glm-event-contracts §3(8 it,2026-10-04 归档) |
| 装备/HP/MP/毒/状态/升级各族 | REG | opcode-residual 卡(2026-10-05 归档)+ cov85 + 旧测 |

## 6. 终止/清理链(tickEventSystem)

| 合同 | 去向 | 锚点 |
|---|---|---|
| 'end' 全链(对话框收尾/onEnter 持久化/triggerResume 三态/pendingItem 门/iCurEquipPart/clearPressedOnce/restoreMode/triggerPendingSceneLoad) | REG | 旧测 4143/4179/4382 + runscript-rearm + k06 |
| goto 目标缺失 → warn+终止清理(不 throw 不自旋) | REG | 旧测 1432 |
| ip 越界 → warn+清理+triggerPendingSceneLoad(1815-1822) | REG | coverage 实证 415 测试 1 次命中(mode.test.ts:137/181/229/274 单 raw op 无 end fixture 自然越界) |
| DL17 trigger end{reset}+idleFrames 计数臂(1930-1942) | REG | coverage 实证 1934-1946 全命中(旧测,contracts 账登记的 k06/runscript-rearm 族) |

## fullName 唯一性

新文件 2 个 it 全名互异且全仓唯一(含 `*.cov85/*glm-event-k*/*glm-event-contracts*` 无同名);
`directed-vitest.json` 落 file×fullName×status。

## 数据面证据(0x7F 可达性与 DL17 观察)

- 方法:`data/extracted/events/all.json`(SSS.MKF 只读提取,54319 命令)+ `event-objects.json`(5077 对象,
  2165 个 autoLabel);跳转语义按 pal-extract `opcodes.ts` JUMP_TARGET_OPERAND(29 opcode 精确 operand 序号)
  + 0xA2 随机跳 [i+1,i+op0] 全收 + 0x06 无 label 恒等回退;BFS 过含 0x24/0x25 装载目标(过近似,只会多不会漏)。
- 结果 1:2165 个 auto 入口 + 250 个全局 0x24 setAutoScript 目标,可达 0x7F 命令数 = **0**(全库 0x7F 共 317 条,
  全部只在 trigger/onEnter 链)。
- 结果 2:0x7F[cx=0,cy=0] 共 128 条,op2 ∈ {0: 127, 0xFFFF: 1};[0,0,0xFFFF] 仅 idx 9001(林天南序列)。
- 观察(非合同):event-system.ts:1933 注释称 trigger 侧 end{reset}+idleFrames "现版 0 实例",
  但同法扫描 trigger 可达 end{reset,idleFrames≠0} 有 3 处(idx 542/379/33436,如 541→542 `0x12; end{reset→L_541,idleFrames=8}`)。
  该臂已证(§6),注释计数疑陈旧;登记待 Codex 处置,不改产品不改注释(本卡零产品改动)。

## 判例

- **coverage 语义判读须分块**:首次 3 文件 coverage 曾把 ip 越界链判为 UNHIT,扩到 k0x/pagination/mode
  10 文件后确认 1 命中(mode.test.ts 单 op fixture)——排重结论必须以"全部可能 caller 文件"并集为准,
  单文件子集会假阳性报缺口。
- **657 型 fixture 的 box 在场性漂移**:scene-145 旧测的 0x7F[0,0,0] 开火时 box 已不在场(coverage 2389 体
  0 命中),其"无立绘"断言由 2390 icon 复位单独支撑;观察 0x7F 对 box 的直接作用必须走五行翻页+`~80` 收尾
  延时链让空 body box 活到 0x7F 开火(本卡 it 2 探针实证双臂判别:portrait 90 vs undefined)。
