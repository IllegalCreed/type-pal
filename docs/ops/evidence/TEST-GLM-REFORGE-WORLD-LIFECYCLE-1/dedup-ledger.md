# TEST-GLM-REFORGE-WORLD-LIFECYCLE-1 排重账（GLM r1）

方法：对卡面四家族（scene 事务/entry/resources、entity 生命周期/action/walk/proximity/deferred
trigger、motion/collision/world-motion-runtime、input router/async intent/gameplay clock/cutscene）
逐一枚举既有测试 fullName，按「同 source:line + 同 caller + 同合法输入 + 同 oracle 即重复」判例
排重；下表「本卡动作」列 only-new / existing-proof / unreachable。新增合同 identity 见
[identity.json](identity.json)。

## 1. scene 家族（prepare-commit-abort / 旧场景隔离）

| 轴 | 既有证明（fullName 摘要 + 文件） | 本卡动作 |
|---|---|---|
| prepare 各端口失败零提交并清理 | `scene/map/palette/sprite/sound 预检失败零提交并清理当前呈现`（scene-switch-transaction.test.ts:225-253） | existing-proof |
| ScenePreparer 四端口失败透传原错误、不建 renderer、caller world 不变 | `%s preparation failure propagates exact error without renderer creation`（scene-preparer.test.ts:100-118） | existing-proof |
| present 失败路径 | 与 prepare 失败同 catch（prepareAndCommitSceneSwitch:101-104）、同 caller、同 oracle（rejects 原错误 + cleanup + 零提交），按「换包装不算新合同」判例不另立 | existing-proof（判例） |
| A/B 切换交错、fade/dither owner 接管、cleanup 不误杀新演出 | scene-switch-transaction.test.ts:255-436 共 7 测 | existing-proof |
| 预检依赖足迹（party/equipment/inventory/followers/mapOverride/behavior/actorOverrides） | scene-switch-transaction.test.ts:62-221 + scene-preparer.test.ts:152-165 | existing-proof |
| 旧场景隔离：场景 IO 失败旧世界可操作、可重试；旧响应不覆盖新提交 | `H6 failed scene IO leaves the original world operable…`、`H6 old in-flight scene response cannot overwrite…`（main.scene-flows.test.ts） | existing-proof |
| SceneEntrySession token/reveal/freeze；boundaries 二次 begin/旧 token | scene-entry-session.test.ts 5 测 + scene-entry-session.boundaries.test.ts 2 测 | existing-proof |
| 资源所有权/缓存失败不缓存/LRU/项目隔离 | scene-resources.test.ts 9 测（含 scene/map failure 恢复） | existing-proof |
| ActiveScene 发布/清场/wave 懒重建/map 替换 | active-scene.test.ts 7 测 | existing-proof |
| spawn 三态/朝向优先级/fail-loud | scene-transition.test.ts 7 测；scene-map.test.ts 2 测 | existing-proof |
| host 提交控制/迟到回执/幂等/会话选择 | world-async-commit.test.ts 35 测 | existing-proof |

## 2. entity 家族（phase/reappear/动作 abort/deferred trigger）

| 轴 | 既有证明 | 本卡动作 |
|---|---|---|
| lifecycle gates 派生顺序、entityState 覆写、四叶不可变 reducer | entity-lifecycle.test.ts:14-92 | existing-proof |
| 跨场景隔离：当前场景 tick 不动他场景表 | `eligible ticks freeze, decrement…`（entity-lifecycle.test.ts:120 断言 s002 冻结） | existing-proof |
| 非/未知目标拒绝（未知 scene/entity） | entity-lifecycle-command.test.ts:86-93 | existing-proof |
| awaitingExit 重现边界 0/320、独立拍、帧复位通知 | entity-lifecycle.test.ts:123-178 + entity-lifecycle-command.test.ts:63-84 | existing-proof |
| host 级 hide/restore 接续、走位所有权 | main.entity-host-flows.test.ts H10 三测 | existing-proof |
| 动作 abort：signal 中止、stop 双参、替换/清场兑现 waiter、owner 归属 | entity-action-player.test.ts 14 测 + entity-action-player.boundaries.test.ts 8 测 | existing-proof |
| walk 量子/象限/阈值/慢节奏 rest | entity-walk.test.ts 7 测（含 consumeScheduledMoveRest） | existing-proof |
| proximity 缺实体/零半径 fail-loud | entity-proximity.test.ts | existing-proof |
| deferred trigger 单claim占用、stale scene drop、clearEntity 定向、disposition drop/hold、冻结落点事实 | deferred-trigger.test.ts 6 测 | existing-proof |
| **clear() 原子复位 claim+deliveryFence（teardown caller main.ts:4408）** | 无既有证明 | **only-new：DT-CLEAR-1** |
| **fire 失败按 'dropped' 收口且不设围栏** | 无既有证明（既有 fire 恒 true） | **only-new：DT-FIRE-DROP-1**（可达性注记见 identity.json：main.ts wiring 同步窗内自带复检，按模块公开合同登记） |

## 3. motion/collision 家族（reservation/fairness）

| 轴 | 既有证明 | 本卡动作 |
|---|---|---|
| reservation 同目的地稳定胜者、vacate 链、换向优先、contention 旋转、复合足迹 | entity-motion.test.ts 40+ 测（`same destination has one stable winner…`、`vacate dependencies…` 等） | existing-proof |
| MotionFairnessClock 批次记账/剪除/clear | entity-motion.test.ts:339-354 + entity-motion.glm-next-wave.test.ts:146 | existing-proof |
| 世界拍节奏、slot 归属、teardown 取消/token 失效 | world-motion-runtime.test.ts 10 测 + .runtime-session-1.test.ts 10 测 + .residual.test.ts 5 测 | existing-proof |
| 侧避锁/公平休眠/被动退让 | world-motion-runtime.residual.test.ts + entity-motion c85/glm-next-wave | existing-proof |
| collision 像素/子格/作者态 | collision.test.ts 6 测 | existing-proof |
| 相机跟随/钳制/snap/pan/abort/reset | world-camera.test.ts 11 测 | existing-proof |

本家族未发现未证明且可合法输入的真实业务轴；不新增。

## 4. input/async 家族（输入锁/最新 async intent/时钟/cutscene）

| 轴 | 既有证明 | 本卡动作 |
|---|---|---|
| 输入锁：128 层组合穷举（含 runner/hostile 锁探索输入）、quick save 与手动菜单同步性 | runtime-input-router.test.ts:5-30、111-126 | existing-proof |
| 键盘边沿/held/后按优先 | input.keyboard-boundaries.test.ts 13 断言组 | existing-proof |
| async intent 最新启动胜出（begin/invalidate/跨 await 失效） | async-intent.test.ts 3 测 | existing-proof |
| **capture() 只读快照（不换代、不作废在途 token）** | 无既有证明 | **only-new：AI-CAPTURE-1**（caller main.ts:931-932/1168/1902） |
| 时钟冻结/恢复不补算、单步精确 | gameplay-clock.test.ts 2 测 | existing-proof |
| **realNow 回退钳 0 + gameplayNow 单调（重锚语义）** | 无既有证明 | **only-new：GC-REGRESS-1**（实测修正初版断言：恢复帧 dt 自重锚点起算受 100ms 钳，非按 16ms 真实间隔） |
| cutscene 顺序执行/busy/取消/并发分域/重放一致/dispatch 边界 | cutscene-controller.test.ts 5 测 + .dispatch-boundaries.test.ts 4 测 | existing-proof |

## blocked / unreachable 登记

- `SceneResources.map()` LRU 的 `oldest === id` 保护分支：插入序下新键恒为末位，size>16 时首键
  不可能是刚插入的 id（逐删除至 size≤16 的循环先停止），防御分支，无合法输入可触达 → unreachable，
  不设测试（scene-resources.ts:51-56）。
- `DeferredTouchTrigger.fire` 失败在 main.ts 当前 wiring 下：busy 门含 `runner!==null`、disposition
  与 fire 同步执行且 fire 内重查实体 → host 侧当前不可自然触达；按模块公开状态机合同直接登记
  （DT-FIRE-DROP-1），不宣称 host 可达性。
- 其余卡面轴（prepare-commit-abort、旧场景隔离、phase/reappear、动作 abort、reservation/fairness、
  输入锁、最新意图取消）均 existing-proof，不重复堆叠。

## 判例（本卡新增）

- vitest4 `-t` 过滤串含 ASCII 括号（如 `clear()`）时零匹配 → 全 skipped、exit 0；反控过滤器必须用
  无括号唯一子串，且脚本须校验红相位含 `1 failed` 以拦住零匹配假绿。
- GameplayClock 回退语义真值：回退帧不仅 dt 钳 0，`lastReal` 还重锚到回退值 → 恢复帧 dt 自旧锚点
  起算并受 100ms 上限钳；初版按「恢复帧 16ms」预期即红，按实测真值改断言（非放宽）。
