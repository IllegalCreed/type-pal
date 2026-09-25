# P4 · battle-session.ts 阶段与 Promise 所有权取证（ARCH-SUPPORT-GLM-1）

日期 2026-09-25。冻结 SHA `3270473862…`。对象：`packages/reforge/src/battle/battle-session.ts`
（实测 **3022 行**）及直接阶段 helper（`enemy-hook-runtime.ts`）。**边界**：不碰 main.ts/
新 BattleHost/A3 帧循环，不改公式，不重跑剧情；本包只读静态取证，动态证据引用既有测试
精确标题（本席是 battle-workflows 卡的贡献者，其 46 项用例属贡献者证据，不充独立审查）。

> **r2 返工更正（Codex intake counter 0e751efe）**
> ① **门归属更正**：':604 preparing 早退'属于 `beginTurnPreparation`（逐回合 SFX 屏障入口守卫），
> `writeBackHp`（:2534-2541）**没有** preparing 门——r1 报告把两者混写，且据此误提"新增 writeBackHp
> 防护"方向，一并撤回。概念区分：开战视觉 ready 输入与逐回合 SFX 屏障是两个概念。② 测试计数
> **93 = 43（battle-session.test.ts 收集，37 静态 test( + 2 test.each 展开）+ 46（六 flows）+ 4
> （hook-runtime）**，r1 误写 87。③ 补会话内 pump→render 耦合边界（新增 P4-003）：pumpScriptExecution
> （:1032）与 render（:2543）共享 nowMs/screenShake/floats 等实例态，读写同 tick 交叠——这是本包
> 目标内的边界，不需读 main/A3 即可陈述；render 消费的字段集是拆分冻结面。

## 1. 阶段转换模型（双轴）

- **core 相位** `state.phase`：`selectAction → performAction → won|lost|fled`（grep 实测 5 值）。
- **UI 层** `this.ui`：约 29 处赋值（menu/preparing/skill/item/throwItem/misc/miscSub/target/
  acting/over/readinessError），与相位独立；`tick` 入口 :1192 `if (this.closed) return` 先决。
- 转换链：selectAction 分支 :1247 起（choreoTurn 收集 → pumpScriptExecution → nextSelecting →
  `beginTurnPreparation` :1282）；performAction 分支 :1565 起（pump + 动画回放）；
  终态分支 :1199 起（terminalResult 归一 victory/defeat/playerFled/enemyFled/terminated，
  settlement 逐屏 :1240-1252、playerFled/terminated 快速完成 :1257-1266）。

## 2. 读 / 写 / 取消 / Promise 所有权图

| 所有权 | 位置 | 说明 |
|---|---|---|
| `done` Promise 唯一构造 | :414-417 `new Promise((res,rej) => {resolveDone/rejectDone})` | resolve 仅 :641（complete），reject 仅 :659（cancel，AbortError 兜底） |
| 终态收口 `complete()` | :637-643 `doneSettled/closed` 双闸 + `preparationSerial++` | 幂等；迟到准备 token 自动失效 |
| 取消收口 `cancel()` | :646-661 双闸 + serial++ + musicSerial++ + pendingTerminal/pendingHookActivations 清空 + rejectDone(reason ?? AbortError) | **cancel 语义 = 整会话作废**，与 enemyFled/terminated 终态不同（既有测试 :1314/:1424 标题实证独立终态） |
| 两级资源屏障 | `beginTurnPreparation` :603-632（token=preparationSerial；**:604 preparing 门属此函数**）+ `settleTurnPreparation` :575-601（五重守卫 token/closed/doneSettled/phase/ui） | 屏障期间 tick :1202 提前 return 锁全部输入；资源失败 SfxReadinessResourceError 降级 / fatal 停留。`writeBackHp`（:2534-2541）**无 preparing 门**（r2 更正） |
| 会话内定时 | actTimer/overTimer（:257-258，数值累计非 setTimeout）、musicSerial（:326） | 无 OS 定时器泄漏面 |
| 写回表面 | writeBackInventory :2450 / writeBackPersistentEffects :2462（幂等门 persistentEffectsWritten）/ writeBackHp :2534 | 公开 mutating API；幂等由 ARCH battle-workflows r4/r5 用独立快照钉住 |

## 3. 拆分先后建议与"不可跨 await 区"

- **不可跨 await 区**（当前实现是同步 tick，天然安全；拆分时必须保持）：
  ① `beginTurnPreparation` token 分配 → `pending.then` 挂接（token 与 promise 必须同帧配对）；
  ② `submit → submitOrder/lastActs/pendingActions` 三写（Esc 回退 :1357 依赖原子性）；
  ③ `complete/cancel` 的 doneSettled+closed+serial 三连写。
- **拆分先后**（依赖最少优先）：① render/输入路由（ui 状态机）→ ② 脚本泵（pumpScriptExecution
  + hook runtime，已有独立 runtime 测试）→ ③ 屏障与资源（preparation/readiness）→ ④ 写回三方法
  （已是纯边界）→ ⑤ 终态/结算屏。core 相位推进（stepBattle）建议保持单核不动。
- 每步的回归门：下节 37+46 条标题。

## 4. 现有测试去重表

| 来源 | 覆盖面 | 精确标题示例（完整标题见对应文件） |
|---|---|---|
| battle-session.test.ts（**收集 43**：37 静态 test( + 2 test.each 参数化展开） | 屏障/token/迟到 resolve、终态、hook、逃跑、成长写回 | `pending 后取消会作废旧 token；迟到 resolve 不得推进 core`（:646）、`done 已 resolve 时，迟到的屏障回调不得再推进 core`（:755）、`合击消费其余队员后仍先冻结完整动作快照，再进入行动`（:690）、`endBattle terminate…`（:1284）、`fleeBattle…`（:1405）、`固定成长定位失败时在任何 mutation 前 fail-loud`（:1526） |
| battle-session.{selection,round,action,script,terminal,writeback}-flows.test.ts（r1~r5 引入，46 条） | 选择/跨轮/执行/屏障与 hook/终态精确 resolve/写回 | `victory：真实击杀→settlement 恰一次→300ms 边界前不兑现→精确 resolve victory`、`公开 cancel：pending 屏障期间取消 → done 以 AbortError 精确拒绝，迟到完成零推进`、`多队员胜利含阵亡成员：writeBackHp 对非败终局把 0 HP 队员钳制为 1（[1,100] 精确）`、`合击消费非施法队友行动（活敌场景）…` |
| enemy-hook-runtime.test.ts（4 条） | runtime cursor/effect/branch/restart | `continue 同 activation 执行，advance 只在结束时提交 cursor` |

**它们确实证明**：token 失效、迟到回调不推进、取消语义、终态精确 resolve、消费门、写回幂等。
**与 P4 差异**：计数口径已更正（93，r1 误写 87）；P4-003 补 pump/render 边界；不新增动态证据。

## 5. 证据条目

- **P4-001 covered（r2 计数更正）** 上表 93 条（43+46+4；43=37 静态 test( + 2 test.each 收集展开）。
- **P4-002 risk** `ui` 状态机约 29 处赋值分散在 tick 各分支，无集中转移表——拆分①（输入路由）
  的第一刀应先建 `transitionUi(next)` 单点（纯重构，行为不变）再移动，否则 29 处散赋值会成为
  拆分回归盲区。静态结构证据；无行为缺陷。
- **P4-003 risk** `resolveDone/rejectDone` 为实例字段（! 断言 :220-221），构造期 ：414 赋值前的窗口
  内若任何路径调 complete/cancel 会 TypeError——当前构造顺序安全（无早调路径证据），拆分时该
  隐式顺序约束必须显式化（如构造期先挂 `doneSettled` 闸或改为可选调用）。risk。
- **P4-005 N/A（r2 重编号）** 两级屏障与取消语义已有 93 条测试钉住，本包无新增反证——如实不发明缺陷。（原 P4-003 risk 顺延为 P4-004；新增 P4-003 covered=pump/render 边界。）

## 6. 未证风险

- `pumpScriptExecution` 与渲染层（render/anim）的耦合未深读（A3 帧循环由 Codex 并行实施，
  本包按卡面回避，未读 main.ts/新 host）。
- 拆分建议未经实施验证，仅依赖图推断。
