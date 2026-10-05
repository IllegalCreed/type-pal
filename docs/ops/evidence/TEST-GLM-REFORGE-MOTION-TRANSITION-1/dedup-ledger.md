# TEST-GLM-REFORGE-MOTION-TRANSITION-1 — 排重 ledger（8 文件逐轴账）

基线：`origin/main` `7a9157ac5`（分支 `codex/glm-reforge-motion-transition-r1`）。
方法：对卡面 8 文件的每个公开导出/行为轴，登记 source:line × 公开 caller × 合法 typed 输入 ×
business oracle × 既有 fullName，判定 `existing-proof`（旧测已证，不重复）/ `NEW`（本卡新增）/
`U`（合法输入不可达的防御臂）。旧测 fullName 引用格式 `文件:行 > 用例名`。

判定总览：8 文件中 7 文件全轴 `existing-proof` 饱和；`world-motion-runtime.ts` 有 3 条
`NEW` 合同（本卡唯一新增测试文件 `world-motion-runtime.motion-transition-1.test.ts`）。
卡面重点轴 reservation/terrain/fairness、scene commit-abort-old-world isolation、input
lock/latest intent 全部 `existing-proof`（见 §5/§7 与归档 world-lifecycle 卡同名结论一致）。

---

## 1. collision.ts（36 行）— existing-proof 饱和

| 轴 | source | 公开 caller | 输入 | oracle | 判定 |
|---|---|---|---|---|---|
| buildIsBlocked 像素入口精确子格 | collision.ts:11-19 | buildIsBlocked（地图碰撞判定） | 世界像素坐标 | lattice 查值 | existing-proof `collision.test.ts:14` |
| 非 0 恒阻挡/界外恒阻挡 | collision.ts:16-17 | 同上 | 界外/非 0 值 | true | existing-proof `collision.test.ts:23` |
| isBlockedAt 与 buildIsBlocked 同源 | collision.ts:28-31 | 编辑器/调试落点检查 | GridPos | 同源判定 | existing-proof `collision.test.ts:33` |
| 作者态逐点一致 | collision.ts:11-19 | 内容守卫 | 有/无作者 collision | 逐点一致 | existing-proof `collision.test.ts:43` |
| sameLatticeCell 错排子格单位 | collision.ts:22-26 | 接触判定 | 两像素点 | 同子格布尔 | existing-proof `collision.test.ts:70` |
| sameGrid 忽略 height | collision.ts:34-36 | 站立格判定 | 两 GridPos | col/row 相等 | existing-proof `collision.test.ts:77` |

## 2. scene-transition.ts（43 行）— existing-proof 饱和

| 轴 | source | 公开 caller | 输入 | oracle | 判定 |
|---|---|---|---|---|---|
| resolveSceneFacing 优先级链 | scene-transition.ts:14-21 | 切场景/读档落点解析 | explicit/named/inherited/default | `??` 链四臂 | existing-proof `scene-transition.test.ts:5/10/14/18` |
| resolveSceneSpawn 命名/显式/默认三态 | scene-transition.ts:24-43 | main.ts loadScene/切场景 | RuntimeSceneSpawn | 稳定落点+facing | existing-proof `scene-transition.test.ts:32/43` |
| 缺失命名落点 fail-loud | scene-transition.ts:32-33 | 同上 | 不存在 entryId | throw | existing-proof `scene-transition.test.ts:57` |
| entryId+pos 并存 fail-loud | scene-transition.ts:29-30 | 同上 | 两态同给 | throw | existing-proof `scene-transition.test.ts:57` |

## 3. scene-entry-session.ts（82 行）— existing-proof 饱和

| 轴 | source | 公开 caller | 输入 | oracle | 判定 |
|---|---|---|---|---|---|
| begin/token 发号 + preparing 冻结旧帧 | scene-entry-session.ts:42-59 | main.ts 切场景 preflight | 源/目标场景+源帧+reveal | heldFrame=源帧 | existing-proof `scene-entry-session.test.ts:11/22` |
| startReveal 场景失配/契约失配 fail-loud（fade out/in、dither ms/kind、cut 正控） | scene-entry-session.ts:61-73 | main.ts reveal 边界 | 目标场景+reveal | throw/句柄 | existing-proof `scene-entry-session.test.ts:56`、`scene-entry-session.boundaries.test.ts:15` |
| boot 无旧帧 reveal 安全跳过 | scene-entry-session.ts:63-64 | 首次启动/读档直达 | 无 active | null | existing-proof `scene-entry-session.test.ts:51` |
| complete token 精确收口；旧 token 不清新事务 | scene-entry-session.ts:75-77 | main.ts 入场完成 | token | 仅当前事务清空 | existing-proof `scene-entry-session.test.ts:18/33`、`boundaries:46/54` |
| cancel 收口冻结帧 | scene-entry-session.ts:79-81 | main.ts abort/读档/quitToTitle | — | active/heldFrame 清空 | existing-proof `scene-entry-session.test.ts:38-49` |
| revealing 后 heldFrame 归 null | scene-entry-session.ts:56-59 | compositor | — | null | existing-proof `scene-entry-session.test.ts:17`、`boundaries:63` |

## 4. scene-switch-transaction.ts（105 行）— existing-proof 饱和

| 轴 | source | 公开 caller | 输入 | oracle | 判定 |
|---|---|---|---|---|---|
| 预检依赖冻结全字段（party/装备/inventory/followers/mapOverride/behavior） | scene-switch-transaction.ts:31-61 | main.ts switchScene 预检 | WorldState+script+scene | 依赖变化拒陈旧 plan | existing-proof `scene-switch-transaction.test.ts:62` |
| 无关世界字段不误伤 | 同上 | 同上 | 金钱/flags 变化 | 不取消 | existing-proof `scene-switch-transaction.test.ts:62/182` |
| 读档计划忽略活动 actor override | scene-switch-transaction.ts:54-59 | 读档 loadScene | useActorOverrides=false | 空数组 | existing-proof `scene-switch-transaction.test.ts:130` |
| onTeleport 选择是目标场景视图依赖 | scene-switch-transaction.ts:53 | teleport 预检 | 行为依赖 | 变化拒 | existing-proof `scene-switch-transaction.test.ts:216` |
| 空目标/禁用钩子忽略未消费状态 | scene-switch-transaction.ts:207 | 同上 | 空 target | 不误伤 | existing-proof `scene-switch-transaction.test.ts:207` |
| prepareAndCommitSceneSwitch：唯一异步边界 + 陈旧请求收口 | scene-switch-transaction.ts:91-105 | main.ts 切场景事务 | hooks 四态 | commit/abort/cleanup 归属 | existing-proof `scene-switch-transaction.test.ts:255/289/322/361/385/410/438`（A/B 接管三相位、旧 cleanup 不取消新演出、停旧 auto 失效在途提交） |

scene commit-abort-old-world isolation 卡面轴另由 host 级 `main.scene-flows.test.ts:46/75`
（失败场景旧世界可继续运行/旧在途响应不可覆写新往返）existing-proof。

## 5. entity-motion.ts（1403 行）— existing-proof 饱和

卡面 reservation/terrain/fairness 轴逐类（归档 world-lifecycle 卡已同判 existing-proof，本卡复核后维持）：

- 几何/扫描：footprint L∞ + height 不参与 + 精确相邻 `entity-motion.test.ts:109`；sweep
  捕捉交换与垂直交叉 `:115`；同速护航 `:120`；追近拒绝 `:124`；地形扫描 ≤0.25 步长含端点
  `:128`；部分重叠外移/保持/深入三分 `:144`；复合足迹内外分别 `:152/161`；重叠判别纯函数
  `entity-motion.c85-arms.test.ts:183`。
- 仲裁/reservation：同目的地稳定赢家+输入序无关 `entity-motion.test.ts:173`；两两交换与
  三元环拒绝 `:187`；独立长路径同步交叉拒绝 `:209`；vacate 依赖全局重建/单端点独占 `:220`；
  三元链相位化 `:244/263`；leader 地形堵时 follower 不得进依赖位 `:282`；四路争用 100 次洗牌
  字节等价 `:292`；旋转优先级防固定 id 赢家 `:325`。
- fairness：组件本地钟跨拍/换 epoch `:337`；无关 mover 8 拍不扰动争用环 `:361`；side-candidate
  争用轮转 `:388`；`MotionFairnessClock` 批记账/离场剪除/clear 复位
  `entity-motion.glm-next-wave.test.ts:146`；非整数 fairness tick fail-loud
  `entity-motion.c85-arms.test.ts:127`。
- 让位/侧杖：party 逃逸跨全体外部 body 聚合 `:515`；静态/hostile 硬阻挡不推不滑 `:529`；
  普通 NPC 先侧踏 `:541`；无法让位时 party 侧绕保持输入朝向 `:554`；站立让位者无法侧踏时
  party side-only 绕行+持杖 `c85-arms:220`；持杖多拍衰减 `c85-arms:261`；绕行受限回落
  `c85-arms:300`；被动退让原子请求/重排/第三者端点独占 `:570/592`；authority 拒绝阻止
  `:621`；四拍同侧 `:636`；第五拍可弃 `:666`；地形硬停不耗拍 `:701`；新 epoch 清杖 `:718`；
  主进度清杖 `:737`。
- 输入契约/fail-loud：重复 actor/空足迹 `:751`+`c85-arms:39`；重复/缺 actor、陈旧原点、
  非法 quantum/epoch `:751/778`+`glm-next-wave:96/118`+`c85-arms:58/87`；非 ASCII 稳定序
  `:805`；tick 非法 `glm-next-wave:82`。
- 特殊移动语义：floating 无视地形+实体 `:441`+`c85-arms:166`；无 body 检地形忽略
  actor/reservation `:460`；原地意图零位移 `c85-arms:149`；party 键序 `c85-arms:177`。

## 6. runtime-input-router.ts（56 行）— existing-proof 饱和

| 轴 | source | 公开 caller | 输入 | oracle | 判定 |
|---|---|---|---|---|---|
| 128 种活动层组合唯一最高 owner（含 scriptRunning/hostileBusy 拥有 exploration） | runtime-input-router.ts:16-56 | main.ts routeInput | 层×键 | 唯一派发 | existing-proof `runtime-input-router.test.ts:5` |
| confirm 层优先级（arrow→toggle、confirm→yes、cancel→no） | runtime-input-router.ts:23-32 | 确认 modal | 键集 | 单事件 | existing-proof `runtime-input-router.test.ts:32-48` |
| exploration 优先级（F5/F9/Escape/Enter/space） | runtime-input-router.ts:42-46 | 探索输入 | 键集 | 单事件 | existing-proof `runtime-input-router.test.ts:50-61` |
| 同帧开菜单/对话挡 debug 导航 | runtime-input-router.ts:47-54 | 同上 | Escape+] 等 | 挡下 | existing-proof `runtime-input-router.test.ts:63` |
| debug 双括号方向 | runtime-input-router.ts:47-54 | debug 切场景 | [/] | 事件 | existing-proof `runtime-input-router.test.ts:77` |
| shop/reward 关闭吞键不漏层 | runtime-input-router.ts:33-36 | 商店/奖励 | Enter 等 | 单事件 | existing-proof `runtime-input-router.test.ts:87` |
| dialogue 实时钟+忽略 save/escape/debug | runtime-input-router.ts:38-39 | 对话推进 | realNow | advance(realNow) | existing-proof `runtime-input-router.test.ts:102` |
| F5 与手动菜单开阖同域 | runtime-input-router.ts:43-45 | 快存 | 128 层 | parity | existing-proof `runtime-input-router.test.ts:111` |
| 菜单层完整按键集合不预滤 | runtime-input-router.ts:37 | 菜单输入 | 完整键集 | 原样送达 | existing-proof `runtime-input-router.runtime-session-1.test.ts:11` |

input lock 卡面轴：忙时锁即 `scriptRunning||hostileBusy` 拥有帧（`:5` 证）+ host 级
`main.entity-host-flows.test.ts:123`（脚本移动期间键盘归属、完成后探索菜单可开）existing-proof。

## 7. async-intent.ts（35 行）— existing-proof 饱和

| 轴 | source | 公开 caller | 输入 | oracle | 判定 |
|---|---|---|---|---|---|
| asyncIntentAbortError 身份 | async-intent.ts:2-6 | 全部取消路径 | message | name=AbortError | existing-proof（全部合同断言 name） |
| capture() 只读快照 | async-intent.ts:15-17 | main.ts 同世界提交 | — | 不换代不作废 | existing-proof `async-intent.world-lifecycle-1.test.ts:11`（归档卡 AI-CAPTURE-1 针，不重复） |
| begin/invalidate 作废旧启动 | async-intent.ts:19-26 | 最新启动胜出 | token | 旧 token 失效 | existing-proof `async-intent.test.ts:30` |
| 世界失效后旧续点 AbortError | async-intent.ts:32-34 | await 后置检查 | 失效 token | throw | existing-proof `async-intent.test.ts:13` |
| 战斗跨多 await 最后一拍失效 | async-intent.ts:32-34 | battle 启动 | 跨 await | 不挂载旧会话 | existing-proof `async-intent.test.ts:42` |

latest intent 卡面轴由上三行 existing-proof；host 级 awaitRunner 单次结算由归档
host-lifecycle 卡 existing-proof，不重复。

## 8. world-motion-runtime.ts（587 行）— 3 条 NEW，其余 existing-proof

existing-proof 轴：

| 轴 | source | 判定锚 |
|---|---|---|
| advanceCadence 主链（carry 余数结转、frozen 不 aging 且保值） | world-motion-runtime.ts:194-204 | `world-motion-runtime.test.ts:8-22`（60+50→carry 10、frozen 帧后 89+1 成拍） |
| schedulePartyMove 替换唤醒旧等待者、abort 只拒当前 | world-motion-runtime.ts:214-241 | `world-motion-runtime.test.ts:24-37` |
| 预中止信号四注册入口立即拒绝且不留槽 | world-motion-runtime.ts:214/251/295/352 | `world-motion-runtime.runtime-session-1.test.ts:60` |
| party 端点完成先摘 abort listener 再唤醒 | world-motion-runtime.ts:243-245 | `world-motion-runtime.test.ts:39-51` |
| script/auto 槽共存、commitSettlement 先于延迟唤醒 | world-motion-runtime.ts:251-293 | `world-motion-runtime.test.ts:53-86` |
| 中止在途走位按来源署名拒绝并清注册表 | world-motion-runtime.ts:258 | `world-motion-runtime.runtime-session-1.test.ts:33` |
| 同目标重复注册替换接管 | world-motion-runtime.ts:288/345/413 | `world-motion-runtime.runtime-session-1.test.ts:128` |
| 单步 authority 换代只回 dropped 不留续点 | world-motion-runtime.ts:295-350 | `world-motion-runtime.residual.test.ts:38` |
| 追逐 authority 入队前/后丢弃与脚本源不误丢 | world-motion-runtime.ts:352-419 | `world-motion-runtime.residual.test.ts:60` |
| chase 注册先发布槽/取消回调再拒绝 | world-motion-runtime.ts:415-417 | `world-motion-runtime.test.ts:121-146` |
| authority 接管清旧 owner 步态与侧避锁 | world-motion-runtime.ts:163-172 | `world-motion-runtime.runtime-session-1.test.ts:182` |
| 迟到回执静默（单步 attempted 后/追逐取消后） | world-motion-runtime.ts:307-323/367-381 | `world-motion-runtime.runtime-session-1.test.ts:205/234` |
| scene token 注册时快照、teardown 失效 | world-motion-runtime.ts:276 | `world-motion-runtime.runtime-session-1.test.ts:269` |
| gait 唯一 owner + expected-epoch 清理 + markGait 清显式动画 | world-motion-runtime.ts:441-454 | `world-motion-runtime.test.ts:148-161` |
| player direction/authority 共享侧杖 epoch | world-motion-runtime.ts:477-484 | `world-motion-runtime.test.ts:163-171` |
| plan/commitSideSticks 休眠保留策略（活跃实体/party 不借旧锁） | world-motion-runtime.ts:486-514 | `world-motion-runtime.residual.test.ts:131` |
| recordTrace 克隆/稳定序/显式清空 | world-motion-runtime.ts:516-563 | `world-motion-runtime.test.ts:173-208` |
| recordTrace disabled no-op、阻挡原因/被动退让记实际提交 | world-motion-runtime.ts:517-519 | `world-motion-runtime.residual.test.ts:200`/`173` |
| 诊断上限 4096 只淘汰最早条 | world-motion-runtime.ts:553-554 | `world-motion-runtime.residual.test.ts:256` |
| teardownScene 双注册表取消+authority 释放+视觉清空 | world-motion-runtime.ts:565-582 | `world-motion-runtime.test.ts:210-233` |
| clearWorldTicks 被 frame-session 于 frozen-no-step 帧调用 | world-motion-runtime.ts:210-212 | `runtime-frame-session.test.ts:64/111`（clearTicks 事件）；main.ts:5625 唯一产品接线 |
| clearExplicitAnimation 单点直清 | world-motion-runtime.ts:468-470 | 无独立业务 oracle（teardown 全清 `:231` 已覆盖生存期语义），不建 |

NEW 合同（`world-motion-runtime.motion-transition-1.test.ts`，本卡唯一新增测试文件）：

| ID | source | 公开 caller | 合法输入 | business oracle | fullName |
|---|---|---|---|---|---|
| MT-CADENCE-CLAMP-1 | world-motion-runtime.ts:194-204（钳行 200） | main.ts advanceMoves 每帧 `motion.advanceCadence(dt, frozen)`（注释锚「至多 1 拍/rAF,真积压丢弃(DM31 永不补帧)」） | dt=250（≥2×stepMs 的停顿帧，rAF 真实可达） | 一帧至多一拍；150 剩余被钳 0，下一帧须重新积满整步（99ms 不成拍）；对照臂 carry<stepMs 仍结转 | `world-motion-runtime.motion-transition-1.test.ts > TEST-GLM-REFORGE-MOTION-TRANSITION-1 world-motion-runtime 残余合同 > MT-CADENCE-CLAMP-1 真积压被钳掉：一帧至多一拍，丢弃的余数不得结转成下一帧的提前拍` |
| MT-PARTY-COMPLETE-STALE-1 | world-motion-runtime.ts:243-245（身份守卫） | main.ts:3533-3544 走位提交环（帧首捕获 `partyMove` 槽引用、`result.done` 后 `completePartyMove(mv)`）；模块公开 API 同形 | 替换后的旧槽引用（typed-legal，宿主同步窗注记见下） | 陈旧槽迟到完成不兑现新等待者（secondSettled=false、槽仍为新槽）；当前槽完成照常兑现并清槽 | 同文件 > … > MT-PARTY-COMPLETE-STALE-1 被替换的旧槽迟到完成不得唤醒新等待者；当前槽完成照常兑现 |
| MT-PARTY-RESOLVE-RELEASE-1 | world-motion-runtime.ts:247-249 | main.ts:4540-4569 abortScript（读档/dev 强停）收口链末步 `motion.resolvePartyMove()` | 在途 party 走位 + 强停收口 | 以 fulfilled（非 AbortError）兑现悬挂等待者并清槽；结算后迟到 abort 不二次结算 | 同文件 > … > MT-PARTY-RESOLVE-RELEASE-1 强停收口以 fulfilled 兑现当前在途走位并清槽；结算后迟到 abort 不再改变结果 |

可达性注记（诚实披露）：

- MT-PARTY-COMPLETE-STALE-1：main.ts 当前的走位提交环在同步块内完成捕获→完成，宿主自然
  流今天不产生陈旧引用；本合同钉的是模块公开 API 的所有权承诺（与已证
  `scene-entry-session complete 旧 token 不清新事务`、entity 槽迟到回执静默同族）。按
  world-lifecycle DT-FIRE-DROP-1 先例以模块级状态机合同交付，不宣称 host 现时可自然触达。
- MT-PARTY-RESOLVE-RELEASE-1：main.ts abortScript 是真实宿主 caller（读档/强停每次必经）；
  全仓旧测对 resolvePartyMove 行为零覆盖（仅 save/restore-preflight.chain.test.ts:277 以
  empty mock 引用方法名，非行为证明）。

U 账（合法输入不可达的防御臂，不为过门伪造输入）：

| ID | source | 论证 |
|---|---|---|
| U-1 schedulePartyMove 前置后 `if (signal?.aborted) abort()` | world-motion-runtime.ts:239 | 同步构造窗内 L216 `throwIfAborted()` 已拒预中止信号；addEventListener 之前无 await 窗口，signal 状态不可能改变。防御臂。 |
| U-2 registerMove 尾部同形臂 | world-motion-runtime.ts:291 | 同 U-1（L254 throwIfAborted 先行）。 |
| U-3 registerAutoStep 尾部同形臂 | world-motion-runtime.ts:348 | 同 U-1（L298 throwIfAborted 先行）。 |
| U-4 registerChase 尾部同形臂 | world-motion-runtime.ts:417 | 同 U-1（L354 throwIfAborted 先行）。 |

候选不设针账（复核后判已有证明/无独立 oracle，不建）：

- 「plan() 的 fairnessClock 接线」：glm-next-wave:146 已直证 MotionFairnessClock 语义，
  residual:153 经 `motion.plan()` 真链使用 fairnessTickForGroup；接线本身无独立业务轴。
- 「clearExplicitAnimation 直清」：见表内注，teardown 语义已证。
- 「world-lifecycle 四针（DT-CLEAR/DT-FIRE-DROP/AI-CAPTURE/GC-REGRESS）」：卡面排除项，
  不重复。
