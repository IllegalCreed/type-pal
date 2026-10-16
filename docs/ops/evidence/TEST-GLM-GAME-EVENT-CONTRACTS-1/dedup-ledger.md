# TEST-GLM-GAME-EVENT-CONTRACTS-1 合同排重账

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: evidence-receipt-v1 / 1.0.0

本页把测试合同排重账接入 `evidence-receipt-v1`，并追加 `archive-record-v1` 历史边界。原始合同、NEW/REG 分类、source:line、caller、合法输入、oracle、排重结论、计数和判例在 quote 中保全；本页不授当前 runtime、E2E、视觉或 coverage 信用。

## 证据身份

- `id`：TEST-GLM-GAME-EVENT-CONTRACTS-1 排重账（原始身份与 r1/r2 标记保留于 quote）。
- `schemaVersion`：原文未声明机器 schema；本页不补造执行 schema。
- `status`：historical receipt；不把排重账的 NEW/REG 或“全绿”文字改写为当前 verified。
- candidate/source SHA：source `2211da92651d699d844a5d4868ad73cb27729008263094f4c0cca8a7c186e161`；after 见本批 review record。

## 来源与输入

- caller/source refs（file:line）：event-system.test.ts、cov85、glm-event-k 系列、runscript-rearm、battle-dialog 和任务专属测试（以 quote 为准）；其余一手锚点和旧测路径由 quote 逐条保留。
- 合法输入与版本：以原 ledger 记载的 typed 输入、公开 caller、源码版本、旧测/cov85/fullName census 为准；本次迁移不重跑测试。
- 执行时间和环境：原始任务卡、identity、mutation 和 raw 证据目录；本次只做静态内容迁移。

## 断言与业务 oracle

- 业务 oracle：每条合同必须保持 source:line × caller × 合法输入 × 可观察业务结果 × fullName 的对应关系。
- 原子断言：原文 NEW 合同、REG 已证锚点、未证项、unreachable/defensive 边界和判例保持原样。
- 排重对象：对应 task card、旧测/cov85、同任务 evidence、fullName identity 与后续 fresh receipt。

## 结果

- 逐步结果、退出码、产物：本页只记录原始排重账内容；不把历史“全绿”、计数或 mutation 摘要升格为当前通过。
- 失败：原始未证、rework、blocked、空转反例和合法输入缺口继续保留于 quote。

## 限制与复核

- 未执行/未覆盖：本次不执行 runtime、E2E、视觉或 coverage，也不重新认证原始测试合同。
- 不得外推的结论：排重账不能单独证明产品行为、完整 caller 可达性、全包覆盖或当前任务 done。
- 复核条件：当前 task card 状态、真实合法输入、business oracle、反控三态 raw/JSON、执行集和独立验收重新齐全。

## 历史范围

- 原始日期、版本、阶段：源文档固定于 `7ea529ab5a3f2be583ae02909066824913eee66a`；其具体 r1/r2 时间、状态和候选分支保留于 quote；本轮为 R55。
- 归档原因：排重账是任务时点证据，保留原合同边界，避免把历史合同清单变成当前验收授权。

## 原始结论

- 原始 event-system 四段排重账：NEW/REG、0x opcode 分支、runScript/autoScript/poison 入口、fullName 唯一性和双 grep 判例。

## 当时证据

- 原始测试文件、旧测/cov85、source:line、caller、oracle、fullName、反控与判例保留于 quote。

## 当前有效性

historical。do not promote historical test ledger, NEW/REG labels, counts or mutation summaries to current runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：当前 task card、fresh evidence 和独立验收仍是事实权；TEST-GLM-GAME-TURN-BOUNDARIES-1 当前 rework 状态不因本页迁移改变。

## 继任文档

- 当前 canonical 文档：对应 task card、当前 evidence README、identity/mutation consumer 与重新生成的 receipt。
- supersedes / superseded-by：替代 governed-legacy 的未分层呈现；原始 ledger 不删除。
- 若重新启用的复核条件：合法输入重跑、排重账与实际执行集一致、业务反控可证伪、SHA/清理证据和 Codex 独立验收齐全。

## 原文保全

固定源 revision `7ea529ab5a3f2be583ae02909066824913eee66a`，source SHA `2211da92651d699d844a5d4868ad73cb27729008263094f4c0cca8a7c186e161`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-GAME-EVENT-CONTRACTS-1 合同排重账
>
> 对照源:`event-system.test.ts`(旧全量)、cov85 全 6 文件(已归档 TEST-COVERAGE85-GLM-GAME-1,
> 193 合同已选择性集成 main)、`glm-event-k01/k02/k04/k06`、`runscript-rearm.test.ts`、
> `battle-dialog.test.ts`、`game-state.test.ts`、battle/reforge 侧相关文件。
> 排查方法:hex 字面量 + OP_* 常量名双 grep(判例:0x62/0x63/0x4C/0x4B 仅常量名出现在旧测,
> 单查 hex 会漏)。
>
> **NEW** = 本卡新增测试(`event-system.glm-event-contracts.test.ts`,22 it);
> **REG** = 旧测已证,只登记锚点不新增(卡面纪律)。
>
> ## 1. event-system.ts:1208-1469(tickAutoScripts / runOneAutoOp)
>
> | 合同 | 去向 | 锚点 |
> |---|---|---|
> | 空全局数组/sState≤0/vanish/owner 门+豁免/autoLabel 延迟解析失败 | REG | event-system.cov85.test.ts:47-127 |
> | end plain park / advance / reset idleFrames 三拍 / resetTo 缺失停 | REG | cov85:128-204 + k02:52-80 |
> | end 带 callStack 弹帧回 caller | REG | cov85:181 |
> | goto 恒跳同帧续跑 / 计数满 fall-through / 目标缺失停 / 自环护栏 | REG | cov85:205-236 + 旧测 2388 |
> | 0x09 wait 逐帧累计 | REG | cov85:238 |
> | ip 越界停 | REG | cov85:255 |
> | 0x06 rate=0 原地重掷 / 恒跳 / **label 缺失恒等回退**(鱼漂移修复) | REG | cov85:263 + 旧测 2432 块(2467 回归) |
> | 0x04 call **instant callee** 同帧跑完(DL15) | REG | 旧测 2525-2546 |
> | **0x04 call 多帧 callee(wait)逐帧退化 + stall-break 防御 + 弹帧续跑** | **NEW** | 本卡「callee 内 0x09 wait 退化逐帧推进」 |
> | 0x10/0x11 walk + stagger 隔帧 | REG | cov85:286-317 |
> | 0x7C(speed4 stagger)/0x7A/0x7B walk 族 | REG | 旧测 B 类移动 2078-2090 等 |
> | 0x82(speed8 无 stagger) | REG(语义=0x10,仅速度常量差;按"换数字不算新合同"登记) | 旧测 2078+cov85:306 |
> | default 分支防御 ip++ | REG | cov85:318 |
>
> ## 2. event-system.ts:2903-3154(runScript)
>
> | 合同 | 去向 | 锚点 |
> |---|---|---|
> | battle 缺 battleCtx throw / explore 误传 throw | REG | 旧测 1064/1076 |
> | step limit >256 throw | REG | 旧测 1120 |
> | ip 越界 → warn + 返回起始 entry(B2 c7) | REG | runscript-rearm:59 |
> | end 三态返回(plain/advance/reset,战斗写回语义) | REG | runscript-rearm:31-55 + k06:141-181 |
> | 'end' callStack 弹帧(trigger/auto 侧) | REG | 旧测 4681(0x04 callScript describe) |
> | goto 正常跳(battle) | REG | 旧测 1090 |
> | **goto label 缺失 throw** | **NEW** | 本卡「goto label 缺失(2968-2972)→ throw」 |
> | battle showDialog 入 battleDialogQueue + 风格/clearBefore | REG | 旧测 790/816/901 + battle-dialog.test.ts |
> | **showDialog explore throw** | **NEW** | 本卡「showDialog in explore mode(2997-3001)→ throw」 |
> | setDialogStyle* battle 写 battleDialogStyle / gs 不变量 | REG | 旧测 815/1105 |
> | 0x69 defer(队列非空入 effect + terminatedByEnemyEscape)/空队列立即跑 | REG | 旧测 834 + battle-dialog:196-215 |
> | dispatchBattleOpcode 未消费 fall applyRawOpcode(0x06/0x1e/未打 label 回退) | REG | 旧测 948/976/1000 |
> | 0x19/0x1A 后 resync 战斗副本 | REG | 旧测 1024 |
> | 0x35 战斗缓冲 pendingScreenShake | REG | 旧测 883 |
> | 兜底 skip console.debug(battle 缺 gs / explore raw) | REG | 旧测 924 |
> | giveItem battle 真入包 / explore no-op | REG battle 臂(k06:184)/ **NEW** explore 防御臂并入本卡 explore no-op it |
> | **startBattle/loadScene/setPalette 诊断 skip 续跑** | **NEW** | 本卡「startBattle/loadScene/setPalette 诊断 skip」 |
> | **结构化 op sequence/if/choice throw** | **NEW** | 本卡「结构化 op sequence/if/choice(3143-3146)」 |
> | **explore setDialogStyle*/giveItem 防御 no-op** | **NEW** | 本卡「explore 防御 no-op」 |
> | **battle raw 0x04 call/return(持久 callStack + curEventObjId)** | **NEW** | 本卡「raw 0x04 call:子脚本同步跑完弹帧回 caller」 |
> | **0x04 op1 覆盖 curEventObjId 持久到子脚本 raw** | **NEW** | 本卡「0x04 op1 覆盖(4436)」 |
>
> ## 3. event-system.ts:3156-3225(runPlayerPoisonEntrySync)
>
> 全部旧测(event-opcode-player.* / k06)只注入 stub runner,**真入口零旧证** → 本卡 8 it 全新:
> 入口解析(label/恒等)、raw 执行 + end 三态返回、0x04 弹帧、goto 两臂、阻塞 op 返回 startIp、
> ip 越界返回、curEventObjectId=roleId 角色目标链(嵌套 0x29)、世界侧 trigger 0x29 集成
> (施毒当下同步跑入口 + wPoisonScript=advance 返回)。
> battle 侧 0x29 入口走 `ctx.runScript`(battle-opcodes.ts:602-627),与本函数不同链,不重复。
>
> ## 4. event-system.ts:3464-4600(applyRawOpcode)
>
> REG(旧证锚点,按序):0x50/51/80/8C/93 palette fade(cov85+旧测 4763)、0x46 trail(1711)、
> 0x15(1907)、0x7F(5724)、0x43/45/77/A3(5894)、0x49(2633)、0x1E 三臂(2958+旧测 975)、
> 0x1F(2997)、0x20 主臂+失败跳(3105-3164+cov85)、0x47 pendingSounds(3167)、0x12(cov85+I-w1.b)、
> 0x6F(cov85)、0x24(cov85)、0x53/0x54(4745)、0x35(3267+883)、0x34(5532)、0x38(5634)、
> 0x36/0x71(5239)、0x0B-0x0E(3308)、0x4A(1495)、0x8A(2497)、0x13(1782)、0x14(1810)、
> 0x16(1826)、0x0F(1876)、0x6C(1935)、0x6E(2289)、0x4B/0x52/0x62/0x63/0x4C(旧测 B 类移动
> 2016-2258,含 0x4C 浮空/驱魔香三臂)、0x7D/0x7E/0x87(1968+cov85)、0x65(2868)、
> 0x25/0x40/0x9A(cov85+A1 3845)、0x61(4547)、0x86(2721)、0x83/0x84(3725-3830)、
> 0x95(4405)、0xA2(4465)、0x04 trigger 侧(4681)、0x75/0x90(A3 4475)、0x6D/0x98/0x99(I-w1.b)、
> 0xA6(cov85)、0xA7(1377)、0x58/0x81(cov85)。
>
> | 未证合同 | 去向 | 本卡 fullName(尾段) |
> |---|---|---|
> | 0x5D jumpIfNotPoisonKind 两臂 | **NEW** | 「0x5D jumpIfNotPoisonKind(4295-4300)」 |
> | 0x74 jumpIfNotAllFullHp 两臂 | **NEW** | 「0x74 jumpIfNotAllFullHp(4309-4316)」 |
> | 0x79 jumpIfPlayerInParty 两臂 | **NEW** | 「0x79 jumpIfPlayerInParty(4318-4323)」 |
> | 0x94 jumpIfObjState 两臂 | **NEW** | 「0x94 jumpIfObjState(4341-4347)」 |
> | 0x20 装备槽补足臂(清槽+撤效果层) | **NEW** | 「0x20 removeItem 装备槽补足臂(3729-3745)」 |
> | 0x78 FIXME no-op + default 未实现诊断 skip | **NEW** | 「0x78 FIXME no-op(4583-4585)与 default 未实现 opcode 诊断 skip(4595-4601)」 |
>
> ## fullName 唯一性
>
> 新文件内 22 个 it 全名互异;文件名 `event-system.glm-event-contracts.test.ts` 全仓唯一
> (含 `*.cov85/*glm-event-k*` 无同名);`directed-vitest.json` 逐条落盘 file×fullName×status。
>
<!-- original-source-quote:end -->
