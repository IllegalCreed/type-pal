# D15-1 - NPC 移动补全：动态碰撞 + 互相让路 + 转向动画（议题 15）

Status: build
Phase: phase2
Capability: 议题 15 NPC 自主移动（P1 引擎移动/碰撞/实体行为）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi（移动/碰撞架构主审）+ GLM（实体行为/测试覆盖主审）
Visual Verification Owner: Kimi
Visual Verification Timing: mixed（自主移动/追逐属功能性行为，build 期最小验证；开场走位与载具演出只登记到集中 E2E）
Unavailable Agents: none（2026-08-12 看板确认 Kimi / GLM 均可用）
Branch: `main`

## 目标

在已有 auto 巡逻基础上补全议题 15：自主地面移动不穿墙，可碰撞实体不互穿；玩家与
移动 NPC 在有空间时确定性错位让路；成功移动、受阻转向和停步站立的动画状态一致。
这是 clean rewrite 新机制，只借原版错位观感，不复制旧引擎的阻塞循环或全局冻帧。

## 范围

- 范围内:
  - 每个 100ms 世界拍统一规划玩家、auto locomotion、脚本 `chaseStep` 与引擎 hostile 的
    dynamic movement；地图、连续实体 footprint、同目标 reservation、对穿 / swap 一次判定。
  - auto `moveEntity` / `stepEntity` 按 source 进入动态碰撞；pending move 被主脚本接管时暂停并
    在归还后从真实位置续走；one-shot step 在注册或提交前发现 authority 时丢该步并完成 ack。
  - 玩家↔正在自主移动的普通 NPC、NPC↔NPC 的确定性侧移 / 让路；无合法侧位时停步。
  - movement-owned gait 与 legacy `animEntity` / 定帧状态分离，补齐转向、走帧、停步。
- 范围外:
  - auto 巡逻脚本模板（E2 已 done）、auto runner（M3b 已 done）。
  - hostile 感知、香效果、遇敌结算等既有能力；本卡只统一追逐位移和贴近开战仲裁。
  - 主脚本 `moveEntity` / `stepEntity` 的 authored endpoint、`nudgeEntity` 像素演出、
    `setPos` / `moveParty` / `ride` / mount / follower 派生的碰撞重写。
- 明确不做:
  - 不做 A*、navmesh、全局寻路或 60fps 物理 / 插值；墙挡住 authored auto waypoint 时不猜路。
  - 不改 content schema、save、migration、editor 或公开 `ScriptHost` 契约。
  - 不把 `collide:false` 的氛围 / 演出对象变成动态 blocker，不拆 follower / mount 的有意重叠。
  - 不把普通静态 NPC、script-owned NPC 或 hostile 当成可由玩家推走的对象。
  - 不改 2026-07-03 拍板：NPC 移动不感知对话，不因对白全局冻结。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `docs/phase2/READ-FIRST.md`：clean rewrite、架构先行、一阶段仅作 UX 真值；本卡不向
    PAL 生成内容追加运行时特判。
  - 2026-07-03：auto 与主脚本按实体权威并行；只有被接管实体暂停，NPC 与对话解耦。
  - `docs/phase2/foundation/e6-position-authority-design.md:41-72`：world / script / mount
    单写者矩阵；mount 位置由父实体派生。
  - `docs/phase2/foundation/n-event-script-audit.md:580-589`：mountParty / ride 已有语义。
- 一阶段 / 原版 UX 真值（只借观感，不照搬算法）:
  - `reference/sdlpal/scene.c:512-635`：event-object 足点菱形距离碰撞。
  - `reference/sdlpal/play.c:180-235`：auto 后 blocker 压到队伍时，按固定四向顺序把玩家
    推开一整步；一阶段对应 `packages/game/src/core/scene-system.ts:279-307` 与
    `packages/game/src/core/scene-system.test.ts:799-883`。
  - `reference/sdlpal/scene.c:785-902`：玩家撞墙停；NPCWalkOneStep 不查墙或实体；
    `reference/sdlpal/script.c:31-98` 的 NPCWalkTo 同样只调用普通步进。
    `reference/sdlpal/script.c:311-500` 只有怪物追逐查 map / blocker。
  - 因此“不穿墙、主动让路、批量仲裁”是 Reforge 新机制，不能声称为逐帧忠实复刻。
- 当前代码锚点:
  - `packages/reforge/src/main.ts:2262-2292`（脚本 chase）、`:2775-2831`
    （move / step / nudge）、`:3108-3155`（scriptHost / autoHost 权威视图）。
  - `packages/reforge/src/main.ts:3603-3698`（walkTick + entityMoves 顺序提交）、
    `:3795-3843`（hostile 顺序直写）、`:5356-5363` 与 `:5843-5869`
    （玩家实体硬挡与输入提交）。
  - `packages/reforge/src/collision.ts:6-28`：地图 lattice 与 exact `sameGrid`；后者不能处理
    0.25 / 0.375 / 0.5 分数步。
  - `packages/reforge/src/entity-lifecycle.ts:35-57`：visible / collidable / autoAllowed /
    hostileAllowed 唯一 gate。
  - `packages/reforge/src/sprite-anim.ts:18-21,62-92` 与
    `packages/reforge/src/main.ts:4924-4945`：方向帧、现有 `entityAnim` 渲染优先级。
- 已知坑 / 数据审计:
  - `entityMoves` 当前按 `Map` 插入顺序写，hostile 按 scene 数组顺序写，玩家随后直写；逐处
    加 `isBlocked` 会产生同目标抢占、A↔B 对穿、数组顺序偏差和饥饿。
  - 当前 `entityAnim` 同时承载 walking gait 与 legacy `0x87 animEntity`；受阻时直接 delete
    会误清演出帧，不清又会永远停在抬腿帧。
  - PAL 294 场景只读 census（口径：实体任一页启用 auto，且其 behavior registry 任一可选择候选含
    move / step / nudge / chase）：989 个 auto 实体中 333 个潜在 mover，但只有 65 个
    `collide:true`；不能把 268 个 non-solid 演出对象一刀切进实体互撞。只数当前 page 引用则为
    311 mover / 60 solid / 251 non-solid；registry 行为仍可在 runtime 被选择，故设计取较宽口径。
  - auto `moveEntity` Promise 只有真到 endpoint 后才能让 runtime 持久化位置；未到点 resolve
    会制造假存档，替换时 Abort 又可能杀死整条 auto runner。
- 不得重新引入:
  - 脚本 authored move 被墙 / NPC 误挡而永不收尾；auto 接管后 stale endpoint 迟到提交。
  - dialogue / menu 与无关 NPC 移动耦合；scene 数组顺序或 `Math.random` 决定碰撞结果。
  - mount / follower 的有意重叠被“NPC 不重叠”规则拆散。
- 相关测试:
  - `collision.test.ts`、`movement.test.ts`、`sprite-anim.test.ts`、
    `entity-lifecycle.test.ts`、`follower.test.ts`。
  - `script-project-v5.test.ts` endpoint / replace / abort 用例；`script-runner.test.ts`
    auto signal 隔离与 authority dispatch 用例。

## 验收条件

### 功能不变量

- 物理只在合格 100ms 世界拍提交；同一拍读取同一 snapshot，规划完成后一次性 commit。
- 本卡的 **motion tick** 是现有 100ms movement tick：dialogue 不冻结，menu / battle / gameplay
  freeze 按现主循环 gate；它不是 W9 `lifecycle eligible tick`。hostile 另叠加 presentation / menu /
  battle eligibility，auto 另叠加 authority / lifecycle gate，三者不得混用。
- 所有 dynamic ground intent 查地图 / 界外；`floating` 只绕过 terrain。只有 lifecycle
  `collidable` actor 参与实体 footprint / reservation；这叫 `hasBody`。只有 active autonomous
  ordinary solid NPC 叫 `yieldable`；hostile sensor 不等于 collision body。suspended solid 仍占位但
  无 autonomous intent，interactive scriptedBypass 仍可写；hidden / awaitingExit / removed 不占位。
- 任意输入顺序下，同目标、swept crossing、A↔B swap 均不产生新重叠；结果不依赖 scene / Map
  顺序，不使用随机数。存在合法侧路时不得固定饿死同一 mover。
- 玩家撞正在自主移动的普通 solid NPC 时先让 NPC 按自身步进量侧移、玩家本拍等待；NPC 无侧路
  时玩家可侧移；都无路则停。静态 / script-owned / mounted / hostile 仍是硬 blocker。
- auto / hostile 遇玩家时先尝试自身侧移；仍冲突时可按冻结候选原子让玩家一格。任何玩家
  被动位移都必须先通过 E6 `canWrite('world', 'party')`；通过后才更新 trail / camera，并只对最终
  落点执行一次 touch scan。party 被 script / mount 持有时请求方停步，零玩家副作用。
- 主脚本 `moveEntity` / `stepEntity` 保留 authored bypass 并真到 endpoint；auto 途中被 take
  时暂停而非 abort，release 后从真实位置恢复；scene / abort / removed 不得迟到写。
- 只有成功 commit 才推进 gait；受阻可面向意图方向但显示站立帧；侧移朝实际位移方向；到点
  回站立。被拒移动不得误清 legacy explicit animation / frame override。
- hostile 贴近仍只开一场战斗；presentation / menu / battle gate、香效果与 floating 语义不回归。

### 最低自动测试矩阵

- 几何：0.25 / 0.375 / 0.5 / 1 四步距、snap segment、边界、凹角、双墙夹角；height
  忽略；floating 穿 terrain 但 solid floating 不穿 actor。
- 生命周期 / solid：collidable / non-collidable / self / hidden / suspended / removed；
  script / mount cluster 的有意重叠豁免。
- 仲裁：两 NPC 同目标、迎面 swap、跟随进入已腾空位置、三实体链、最多 4 实体十字交会；打乱
  输入 100 次轨迹一致。公平 fixture 中 mover 持续有 intent、除 contender reservation 外至少一个
  候选在整个窗口持续合法，且 slow 空拍不计 eligible tick；此条件下 8 个 eligible ticks 内每个
  mover 至少推进一次。
- 玩家 / NPC：左右各单侧开放、双侧全堵；auto NPC 主动让、静态 / script / hostile 不被推；
  玩家侧移后保持输入朝向且仍可面向 NPC 交互。
- party authority：world 下 active / passive player outcome 正常提交；mounted 与 script-owned party
  均拒绝 passive-yield，mover 停步，且 player position / trail / camera / touch scan 全部零写。
- 脚本：script move / step 穿过动态占位仍按既有 timing 到点；auto move take→script
  move→release 后续走；auto step 在 authority 下继续保持既有“丢该单步”语义；suspend / scene
  switch / abort / remove 清理；未到点绝不持久化 endpoint。
- lifecycle / cancellation matrix：suspend pause auto activation / motion 且 script 可写；hide /
  awaitingExit cancel auto 并在重现后从 canonical behavior cursor 重启；remove / scene switch 取消
  script + auto；script runner abort 只取消 script slot 并归还 authority；auto controller / behavior
  replace 只取消 auto slot。每格测试 Promise、cursor 与 stale endpoint。
- hostile：多敌贴近只触发一次、普通 solid 挡路时侧移 / 等待、floating 只穿墙不穿 solid。
- auto chase：PAL current13 的 7 个 `chasePlayer` site（s003/e60,e61；s049/e831；s250/e4409,
  e4410；s252/e4440 两条）都保持 pre-close / accepted-to-close / blocked 后下一次尝试的
  `fireTrigger(self)` 一次性终端语义；不得被 engine-hostile encounter scan 吞掉。
- overlap escape：初始 penetration 为 1 / 0.5、步进 0.25 / 0.375 的组合能逐拍单调脱离；
  同向等距不算 escape，且不得制造新 overlap。
- trigger / effect order：拍初 hostile contact、拍中新 contact + 玩家外移、final contact 与 touch
  同格、被动推到门格、touch loadScene 与 auto endpoint 同拍完成；任一 scene token 失效后零
  encounter、零旧场景迟到 callback。
- 动画：moved / sidestepped / blocked / arrived 四态；slow 隔拍与首步≤100ms；像素轴四象限
  朝向；walk state 与 `0x87` / frame override 所有权不串；active / passive sidestep 下 visual
  facing 与 trail 实际离格方向分离，两名 follower 路径不跳格。
- PAL fixture contract：s004 的移动 solid NPC、s006 的 non-solid / floating hostile、s060 的
  多 solid hostile 验收入口存在且仍满足 lifecycle 前提，防测试链接随内容漂移。

### 文档与视觉 / 手工验证

- done 前更新 capability-map / 议题 15 口径；明确“不互穿”只保证 dynamic locomotion，
  authored nudge / mount / follower overlap 属例外。
- build/review 前跑 PAL-wide dry simulation / diagnostic census：遍历 333 个潜在 mover 的所有可选
  behavior，记录 terrain-blocked waypoint、永久等待、初始 overlap 和调用域；与基线审计，任何新增
  永久 blocked route 必须修上游迁移 / 内容源或登记明确例外，不能仅凭 s004/s006/s060 三入口
  宣称全 PAL 不回归。
- build 期功能性最小验证:
  - `http://localhost:6051/?scene=s004&pos=139,59&collision`：在 e76 附近反复沿其前进方向和
    垂直方向穿插，连续观察至少 10 秒，验证单 NPC↔玩家让路、无穿墙 / 左右逐拍抖、转向与停步。
    证据登记 `output/playwright/d15-1/s004-motion.webm` 与
    `output/playwright/d15-1/s004-positions.json`；trace 每条按 stable actor key / worldTick 排序并
    记录 from / proposed / outcome / to / blockReason，才可作确定性证据。
  - `http://localhost:6051/?scene=s006&pos=102,50&collision`：复验本场 non-solid / floating 明雷
    仍能追逐、贴近并恰好开战一次；它不是 solid 互撞样例。证据登记
    `output/playwright/d15-1/s006-hostile.webm`。
  - `http://localhost:6051/?scene=s060&pos=148,54&collision`：多名 solid hostile 同时接近时
    不抢同格 / 对穿，只由 stable-id 首个贴近者开战。证据登记
    `output/playwright/d15-1/s060-solid-hostiles.webm`。
- 集中 E2E 登记（剧情 / 演出观感延后，不在 build 期重复走）:
  - `http://localhost:6051/?scene=s001`：只验证开场 authored script movement 照常完成；
    “对白不冻无关 auto”由 synthetic integration test 证明，s001 本身没有适合观测的 locomotion
    auto NPC。证据 `output/playwright/d15-1/e2e-s001-script-motion.webm`。
  - `http://localhost:6051/?scene=s213&pos=114,80&facing=down&party=li-xiaoyao,anu`：按一次下
    触发 e3613，队伍 / 跟随者与筏保持 authored 重叠漂行，不被 arbiter 拆散；证据
    `output/playwright/d15-1/e2e-s213-mount.webm`。

## 推进签字

### 进入 build 前:设计签字

- Codex: **agree（2026-08-12；冻结 snapshot→intent→reservation→atomic commit、source
  分层、连续 footprint、take/release 与 gait 所有权，见「设计结论」）**
- Kimi: **agree（2026-08-12，本人架构主审；附 1 条 build 前必落卡钉，见「主审立场」）**——
  source/authority 分层、swept/footprint、公平仲裁、touch/hostile 时序、gait 所有权逐条压测成立；
  唯一发现：passive-yield 漏 E6 `canWrite` 权威门（mount/script 持有 party 时可产生幽灵位移 +
  幽灵 touch scan），一行设计钉即可闭合，不构成架构返工。
- GLM: **agree（2026-08-12，本人实体行为/测试覆盖设计主审；非代理）**——snapshot→
  intent→reservation→atomic commit 数据流、source 分层（script>hostile>auto 单 producer + 双 slot 不互杀）、
  连续 footprint + swept + terrain 0.25 采样、stable-id 确定性仲裁 + worldTick 轮转、E6 `canWrite('world','party')`
  passive-yield 门（Kimi 钉已落卡）、gait 与 legacy animEntity 拆分所有权、source/cancellation 矩阵逐条
  核实成立；测试矩阵覆盖几何/生命周期/仲裁/玩家/party authority/脚本/cancellation/hostile/chase/overlap
  escape/trigger-effect order/动画/PAL fixture 十三面，且明确要求 PAL-wide dry simulation census 与
  shuffled-input 100 次 determinism。详细核对见下方「GLM 设计主审证据」。
- counter / 分歧处理: 无 counter；Kimi 的 E6 `canWrite` 钉已于 2026-08-12 落入功能不变量、
  测试矩阵及设计结论 §1 / §4。GLM 无新增 counter。
- 缺签豁免: N/A
- build 准入结论: **allowed（Codex / Kimi / GLM 三方设计 agree 齐；Kimi 钉已落卡；可进入 build）**

#### GLM 设计主审证据（2026-08-12；本人只读核查 + 数据复算，非代理）

> Codex 基线校正：GLM 写入签字时仓库 HEAD 为 `ca9b422d`，原签字草稿中的 `b9de09d0`
> 是陈旧基线字段；签字正文逐项引用并接受 `ca9b422d` 已落卡的 E6 `canWrite` 钉，故仅校正
> 客观元数据，不改 GLM 的 agree 结论或审查内容。

**实体分类与 hasBody/yieldable 边界 ✓**：设计冻结 `hasBody` = lifecycle `collidable` actor（suspended 占位
无 autonomous intent、scriptedBypass 仍可写、hidden/awaitingExit/removed 无 body）；`yieldable` 唯一为
active autonomous ordinary solid NPC（静态/script-owned/mounted/hostile 硬挡，不可被动推离）。mount
parent + party/follower 为允许内部重叠的 compound cluster，对外以成员 footprint union 参与。分类口径干净，
不把 268 个 non-solid 演出对象误纳入互撞（卡文已知坑明示）。

**PAL census 独立复算 ✓（关键事实精确吻合）**：
- 7 个 `chasePlayer` site **逐个核实成立**：s003/e60、s003/e61、s049/e831、s250/e4409、s250/e4410、
  s252/e4440（e4440 behaviors 含 **2 条** chasePlayer 出现，即卡文「s252/e4440 两条」）→ 共 **6 实体 / 7
  occurrences**，与卡文逐字一致。这是 auto chase 收口验收的硬钉。
- mover/solid 计数（本人复算 auto+move-kind behavior：mover ~430 / solid ~121）与卡文 333/65 同量级；
  卡文明示「较宽口径 vs 只数当前 page 311/60」的口径差异，并要求 build 期 PAL-wide dry simulation census
  定锚，不在设计期冒充精确——GLM 接受该口径坦诚。

**E6 权威门与幽灵位移闭合 ✓**：`e6-position-authority-design.md:41` 定义 `canWrite(who, id)` 唯一写裁决点；
设计 §1/§4 把 passive-yield 候选 + 任何 player position commit 都前置 `authority(party) === world` 检查，
非 world（mount s213 / script moveParty 在途）时 mover 停步、零玩家副作用。Kimi 钉已落功能不变量 +
测试矩阵（mounted/script-owned party 拒绝 passive-yield）。这闭合了「幽灵位移 + 幽灵 trail/camera/touch
scan → 玩家未真实落足的门格 loadScene」风险。

**source 分层与 cancellation 矩阵 ✓**：script > engine hostile > auto 单 producer 优先级、script/auto 双
slot（take 暂停非 abort、release 从真实位置续走、不杀 auto runner）；cancellation 矩阵（§6 表）覆盖
script abort/replace、auto abort/replace、suspend/hide/awaitingExit/remove/scene-switch 各自对 script slot /
auto slot / authority 的精确影响。auto step `droppedByAuthority` outcome + one-shot ack bridge 不扩 public
ScriptHost。未到点绝不持久化 endpoint（防假存档）。

**确定性仲裁 ✓**：stable-id 归一化 + worldTickNum 轮转起点（防固定 id 饥饿）、禁 Math.random、
swept segment 同步 pA(t)/pB(t) 比较、腾位依赖图拓扑子相位、swap/cycle 拒绝、4-tick side-stick 防
逐拍左右抖。测试矩阵 shuffled-input 100 次轨迹一致 + 公平 fixture 8-tick 内每 mover 至少推进一次。

**gait 所有权拆分 ✓**：runtime-only `entityWalkPhase` + `lastMovedWorldTick` 与 legacy `entityAnim`/frame
override 分离；渲染优先级 frame override > active gait > explicit anim > semantic action > loop > idle；
rejected intent 只更新 facing 不清旧演出；blocked idle 不暂停 semantic action。闭合卡文已知坑
（entityAnim 同载 walking gait + 0x87 导致受阻误清或永远抬腿）。

**测试矩阵完整性 ✓（十三面）**：几何（0.25/0.375/0.5/1 + snap + 凹角 + floating）、生命周期/solid、
仲裁（同目标/swap/三实体链/4 实体十字/shuffle 100）、玩家/NPC（双侧开放/全堵/auto 让/静态硬挡）、
party authority（mounted/script 拒绝 passive-yield 零写）、脚本（take→script→release/droppedByAuthority）、
cancellation matrix（每格 Promise/cursor/stale endpoint）、hostile（多敌一场/solid 侧移/floating 只穿墙）、
auto chase（7 PAL site fixture）、overlap escape（1/0.5 初始 + 0.25/0.375 步进单调脱离）、trigger/effect
order（拍初/拍中/final/被动推到门/loadScene 同拍）、动画（四态 + slow 隔拍 + 像素轴朝向 + follower 不跳格）、
PAL fixture contract（s004/s006/s060 验收入口存在 + lifecycle 前提）。本人确认 s004(e76 collide:true)、
s006(16 hostile)、s060(20 hostile) 入口存在。

**GLM 非阻塞建议（不阻塞 build 准入）**：
1. build 期 PAL-wide dry simulation census 须把 mover/solid 计数从设计期口径（333/65 或 311/60）定锚到
   精确值，任何新增永久 blocked route 按上游铁律另开卡修迁移源，不在 runtime 特判。
2. 设计主动偏离原版三项（blocked 站立不踏步 / passive trail 记真实离格方向 / Chebyshev<1 footprint）
   已在「已知风险」末段明示为 clean rewrite 产品选择、验收不得倒称原版复刻——GLM 认可该口径诚实。

Evidence: docs/phase2/foundation/e6-position-authority-design.md:41 / collision.ts:6-28(sameGrid/sameLatticeCell) /
entity-lifecycle.ts:21-46(gates) / main.ts 锚点 2262/2775/3108/3603/3795/5356/5843 全部存在 / PAL 复算
chasePlayer 6 实体 7 occurrences 精确吻合 / s004 e76 collide:true + s006/s060 hostile 入口存在 / 五个相关
测试文件均存在。只读核查，未改实现文件，未代签 Kimi。

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

**2026-08-12 Codex 冻结 v1（不改 public schema / ScriptHost）**。

#### 1. 内部边界与世界拍数据流

新增 Reforge 内部纯模块 `entity-motion.ts`（最终命名可等价调整），`main.ts` 只负责快照、
intent 适配和结果提交：

```text
eligible 100ms motion tick（不是 lifecycle tick）
  → snapshot(map, actor positions, lifecycle, authority, active producers)
  → collect one intent per actor
  → pure plan(terrain + swept footprint + reservations + yielding)
  → atomic commit accepted outcomes
  → one player trail/camera/touch update
  → render movement-owned gait
```

actor key 使用 `{kind:'party'} | {kind:'entity', id}` 判别联合，不能用可能与 entity id 冲突的
魔法字符串。内部 intent 至少携带 `actor / source(player|auto|hostile|script) / from / desired /
desiredFacing / collision(dynamic|scriptedBypass) / floating`；outcome 为 moved / sidestepped /
blocked，并带最终位置、朝向和阻挡原因。它们不是 content schema，也不进入 save。

planner 收集或提交任何 player outcome 前必须过 E6 唯一写权限：只有
`canWrite('world', 'party')`（等价于 party authority 缺省为 world）才能把 party 作为 dynamic
mover / passive-yield target。script / mount 持有 party 时，party cluster 仍作为 protected body，
但 planner 不得改 player position、trail、camera 或执行该幽灵候选的 touch scan。

同一实体同拍只允许一个 locomotion producer：script authority > engine hostile > auto。player
独立参与批次。`entityMoves`（或替代容器）必须保存 `source`；script 与 suspended auto move
不能再挤在一个会互相 cancel 的槽里。

#### 2. 调用域冻结

- interactive 主脚本 `moveEntity` / `stepEntity`：`scriptedBypass`，保留现有墙 / actor 均不挡的
  authored timing；脚本 actor 到达后的 committed position 仍作为 solid snapshot blocker。
- `nudgeEntity`（包括 auto 内的像素 nudge）、绝对 setPos、`moveParty`、ride / mount、follower
  派生：保持编排 / 派生直写，不交给 dynamic planner，也不承诺消除其 authored overlap。
- auto `moveEntity` / `stepEntity`：`dynamic`。所有地面 mover 查 terrain；只有自身和对方均为
  solid footprint 参与 actor 互斥。non-solid auto 仍查墙，但不阻挡 / 不被 actor reservation 阻挡。
- `chaseStep`（auto 或 interactive script）与引擎 hostile：`dynamic`。scriptHost chase 仍可 take
  目标实体，但碰撞语义保持行为型 chase，不等同 authored endpoint move。
- floating 只跳过 terrain，绝不自动跳过 solid actor；非-solid floating 才因本身不占空间而
  可穿 actor。

#### 3. 连续 footprint 与 swept 规则

- actor footprint 以足点 GridPos 定义，height 不参与；相邻中心正好一格允许并列。固定
  `COLLISION_EPSILON = 1e-6`，`max(abs(Δcol), abs(Δrow)) < 1 - COLLISION_EPSILON`
  视为重叠；禁止复用 exact `sameGrid` 或含糊使用 `Number.EPSILON`。
- proposal 的 actor swept 检查按同一归一化时刻比较两条轨迹 `pA(t)` / `pB(t)`，任一时刻均
  不得 footprint overlap；静止 blocker 视为常量轨迹。同拍 A↔B swap、相交 crossing 也算冲突，
  但同速 convoy 进入已腾空位置不会因“路径集合相交”被误拒。walkTick 的 snap proposal 同样
  走 swept 检查，不能只验 endpoint。
- terrain 对 proposal 按不大于 0.25 格的确定性采样检查（含 endpoint），避免 run / snap
  穿过窄墙；地图边界 fail-closed。
- occupancy 只消费 `entityLifecycleGates(...).collidable`。suspended 保持可见 / 占位但无
  autonomous intent；interactive scriptedBypass 仍可写，否则 runner 与冻结的 lifecycle clock 会
  相互死锁。despawned / awaitingExit / removed 无 body。player 永远是 body；mount parent + party /
  followers 是一个允许内部重叠的 compound cluster，对外以成员 footprint 的 union 参与碰撞，
  内部成员互不阻挡。
- 既有 scripted bypass 造成的重叠不由 planner 反向传送修复。定义 penetration =
  `max(0, 1 - max(abs(Δcol), abs(Δrow)))`：escape proposal 对每个既有冲突在整个子相位内不得
  增加 penetration、拍末至少一个严格下降，且不得制造新 overlap；允许 0.25 / 0.375 步进用
  多拍逐步脱离，不要求第一拍就完全合法。同向等距移动不算 escape。

#### 4. 确定性仲裁与让路

- snapshot actor / intent 先按 stable id 归一化，不能依赖 scene 数组、Map 插入顺序或 Promise
  恢复顺序。player 的有效输入优先尝试；world actors 用 stable-id 环形顺序并以 `worldTickNum`
  轮转起点，避免固定 id 饥饿；禁止 `Math.random`。
- 进入已确认腾空的 footprint 时建立“谁先腾位”的依赖图；无环链按拓扑顺序拆成逻辑子相位，
  先验证 / 腾位者、后验证跟随者，每个子相位内才按同步 `pA(t)` / `pB(t)` 做 swept 检查。全部
  子相位验证成功后仍只做一次 atomic commit；两者 swap 和任意 cycle 均拒绝。多者抢同一
  destination 只接受一个，其余尝试侧位或等待。
- 只有 actor footprint 阻挡时尝试侧位；墙 / 界外仍硬停，不把全局 player `resolveMove` 改成
  撞墙滑行。侧位沿当前意图的两个垂直方向，单拍位移不超过该 mover 原本的移动量子；需要多拍
  才清出 footprint 时，runtime-only side-stick 固定同一侧最多 4 个 eligible ticks。偏好由
  stable id 决定；stick 绑定 command / endpoint epoch，而非每拍重算出的 desiredFacing。前进
  成功 / command epoch 改变 / authority 或 lifecycle 改变 / 切场时清除，防止绕行变向误清、
  左右逐拍抖动和慢速 NPC 瞬移一整格。
- 玩家前方是有 active autonomous intent 且 `hasBody` 的 ordinary NPC（唯一 `yieldable` 类）：
  NPC 先沿合法侧路推进本拍量子，
  玩家本拍等待，直至目标 footprint 真正腾空；若首拍两侧都无合法 proposal，玩家再试左右一格
  并保持输入朝向；全堵则双方停。静态、script-owned、mounted、hostile 不可被推离 authored
  位置，继续硬挡。
- 每拍 player 最多一个 outcome。先规划玩家自身 active intent；若已安全腾位，不再接受任何被动
  push。只有无输入或 active intent 被拒时才汇总 passive-yield requests；多 mover 请求不同落点
  时按同一 stable-id 轮转只选一个，其余重规划 / 停步。mover 自己的 primary intent 若本来安全，
  不得为了“让路”强制改侧位。
- autonomous NPC / hostile 的目标是玩家：mover 先侧位；无位时才提出 passive-yield request，
  候选按“相对 mover 前进方向的右侧→前方→左侧→后方”固定四邻让一整格。候选必须同时通过
  terrain、body、reservation 和 E6 `canWrite('world', 'party')`；无合法位或 party 非 world authority
  则 mover 停。玩家被动让位保留原 facing。
- 所有 player position commit（主动前进、主动侧移、NPC 请求导致的被动位移）在 batch 后统一
  再检查一次同一 authority epoch 的 `canWrite('world', 'party')` 后更新 camera；trail 每拍只 push 一次
  并使用实际 displacement direction，不能复用 visual facing。若 snapshot 后 authority 已变化，
  整个 player outcome fail-closed，零 position / trail / camera / touch 副作用。
  active sidestep 保留输入 facing 并按该 facing 播 player gait（横滑观感）；passive yield 保留原
  facing 且不推进 player gait。NPC sidestep 始终面向实际位移方向。

#### 5. 世界拍后置副作用顺序

同一拍只允许一个世界接管结果，顺序冻结为：

1. snapshot 时若已有 eligible hostile 与玩家距离 `<=1`，按 stable id 建立 pre-contact encounter
   claim；该拍不再接受 player / dynamic world movement，直接启动一次 encounter。
2. 没有 pre-contact claim 才 plan / atomic commit。accepted endpoint 的 live position、canonical
   `world.entityPos` 与 command-completion record 在 touch 前同一线性化点原子落地，再更新 trail /
   camera。之后只把“从下一 safe-point 继续执行后续脚本命令”排队；encounter 另带本拍
   post-contact claim token，二者不能复用一个过宽 token。
3. 对最终玩家落点做一次 touch scan。touch 若启动 runner / presentation / battle 或切场景，立即
   invalidate post-contact claim，因此本拍不再开第二个 encounter。同场景 runner / presentation /
   battle 不取消已经 commit 的 movement settlement；只有 scene / world / session 替换才取消全部旧
   continuation。touch 对同 actor 的 take 只暂停**下一 safe-point**，不能撤销已 commit settlement；
   replace / remove 只取消尚未 commit proposal / slot 和后续执行。若 touch 随后写同 actor 新位置，
   顺序固定为旧 endpoint 先 commit、新 mutation 后 commit 并成为最终真值。
4. touch 未接管才按 post-commit 距离做一次 hostile scan；新贴近者按 stable id 只启动首场战斗。

这保留“拍初已经贴脸不能临帧逃跑”，同时延续现有“本拍新贴近时，玩家最终落入门 / touch 可先
接管”的时序。NPC intent 本身不触发门；只有最终 player outcome 触发一次 scan。

#### 6. 阻塞、接管、lifecycle 与 Promise 语义

- auto `moveEntity` 只有真到 endpoint 才 resolve / 持久化。actor 临时阻挡时侧移或等待；terrain
  / 永久阻挡时低频等待，不做路径猜测，也不虚假完成。等待只挂起该实体 runner，不忙循环；
  20 个实际尝试且 blocked 的 ticks 后报告一次诊断，此后节流；slow 空拍、authority / suspend
  暂停不计数，不污染内容 / save。
- auto `stepEntity` / `chaseStep` 是单次尝试：blocked 时只转向、不走帧，然后按既有 pacing 完成；
  引擎 hostile 留到后续 eligible tick 重试。
- public `stepEntity(): void` 不变；interactive step 仍立即 scriptedBypass。auto adapter 使用内部
  one-shot ack bridge，在下一 motion tick 的 outcome 确定后才让该 leaf 到达 safe-point；不能让
  v5 / v13 cursor 在 commit 前越过命令。auto step 注册时或已经 enqueue 但提交前一旦发现 script
  authority，统一产出 `droppedByAuthority` outcome、resolve ack 且不留 stale step；它不暂停续走。
  该 ack 是内部 timing 适配，不扩 public `ScriptHost`。
- auto move 途中被 script take：保留其 Promise 与 endpoint 为 paused slot，不 reject；script move
  使用独立 slot 并拥有提交权。release 后 auto 从当时真实坐标重新计算 proposal，不能提交 take
  前缓存的位置。
- source / owner cancellation matrix 冻结为：

  | 事件 | script slot | auto slot / activation | authority |
  |---|---|---|---|
  | script runner abort / script move replace | 取消本 script slot | 保留 / paused 继续 | 归还后恢复 auto |
  | auto controller abort / behavior replace | 不动 | 只取消 auto slot / activation | 不动 |
  | `suspendEntity` | scriptedBypass 仍可执行 | activation gate + pending motion pause，cursor 不前进 | 不动 |
  | `hideEntity` / `awaitingExit` | 当前脚本可写但不可成为 body | 取消 activation / auto slot；重现后由 canonical cursor 重启 | 按既有脚本收尾 |
  | `removeEntity` / scene switch / entity replacement | 取消 | 取消 | 清理 |

  pause auto 不能只停 motion Promise、放任同一 flow 执行后续命令；必须在每个 auto leaf / safe-point
  走 per-activation lifecycle gate。auto `stepEntity` 在 authority 已持有时沿用现状：该单步丢弃并
  到达 safe-point，不为它创建 pending slot。新 script move 只替换同 source 的旧 script move；
  不得再通过取消 auto promise 杀死 auto runner。公开 `ScriptHost` 返回类型不变。
- motion endpoint 的线性化点同时提交 live position、canonical `world.entityPos` 与 command-completion
  record；这三者一旦 accepted 不可回滚。Promise resolution 只唤醒后续 command execution，排入
  scene/world/session + activation gate 队列：同场景 touch / presentation / battle 以及同 actor
  take 都不得取消已 commit settlement，take 只暂停下一 safe-point；scene/world/session 替换、
  behavior replace / remove 可取消尚未 commit proposal 和后续执行。touch 后同 actor 新 mutation
  服从“旧 endpoint 先、新 mutation 后胜”。此顺序必须用同拍 endpoint + 同场景 touch、同 actor
  take-only、同 actor replace/new-position、touch loadScene 五条集成测试钉死。

#### 7. hostile 收口

- hostile cooldown / awareness / presentation / menu / battle gate 保持；到期意图只在下一个合格
  world tick 进入 planner。encounter 严格服从上一节 pre-contact→touch→post-contact 的唯一顺序，
  首个命中设置 busy，其他 hostile 本拍不得重复开战。
- ordinary solid actor 可使 hostile 侧移或等待；floating 只越 terrain。抵近阈值和战斗结果后的
  disappear / respawn policy 不在本卡重写。
- `chaseStep` 是脚本 / auto behavior，不走 engine-hostile scan：leaf 开始的 snapshot `dist<=1`
  时直接对 self `fireTrigger` 一次并按既有 wait resolve；accepted movement 本拍新到 `<=1` 不抢跑，
  仍在既有 pacing 后的下一次 chase leaf 才触发；blocked 且仍 `>1` 同样留到下一次 leaf 重试。
  current13 的 7 个 PAL auto `chasePlayer` site 必须有 fixture / integration coverage。

#### 8. 动画所有权

- 将 locomotion gait 从 legacy `entityAnim` 拆为 runtime-only `entityWalkPhase`（或等价状态）和
  `lastMovedWorldTick`。渲染优先级冻结为：frame override > active locomotion gait > explicit
  `animEntity` > semantic action > loop > idle。
- accepted locomotion 首拍清与行走互斥的旧 frame override / explicit anim，并按实际位移方向推进
  gait；sidestep 同理。rejected intent 只更新 facing，不清旧演出状态、不推进 gait；若无更高优先
  状态则显示该方向站立帧。
- 每个 motion tick 没有 accepted outcome 就清上一 locomotion gait，唯一例外是同一 pending slow
  move 的 scheduled-rest tick：保持当前 gait frame、不推进 phase。hostile cooldown / chase pacing /
  command 到点的后续空拍均回 idle；authority take、suspend / hide / remove 立即清 gait，但不清
  frame override / explicit anim。endpoint 当拍回方向组第 0 帧。`walkTick` 像素轴四象限和
  `[0,1,0,2]` 步序继续复用，不新增 animation schema。
- player active sidestep 以保留的 visual facing 播 gait，但 trail 记真实位移方向；passive yield 是
  不推 gait 的滑移。两者都只能提交一次位置 / trail 更新，followers 继续从真实 trail 派生。
- blocked pending 本身不算 gait / presentation owner。entity semantic action 只有被 frame override、
  active locomotion gait 或 explicit anim 等更高 presentation owner **实际遮住**时才暂停自己的时钟；
  slow scheduled-rest 仍属 active gait，blocked idle 不暂停 action。补 once-action Promise / SFX 不得
  在被遮住时提前完成、也不得因永久 blocked 永久冻结的回归。

### 已知风险

- 风险: script / auto 共用 host 原语，source 分层不完整会让剧情卡死或 auto runner 被 Abort 杀死。
- 缓解: 内部 source slot + script bypass / auto dynamic 调用域表；take→release 与 endpoint 持久化
  集成测试是 build 硬钉。
- 风险: 分数步和 snap 只查 endpoint 仍会穿 actor / 窄墙。
- 缓解: 连续 footprint + swept segment + terrain 0.25 格采样的纯函数测试。
- 风险: 多实体仲裁按遍历顺序会不确定或长期偏袒同一 NPC。
- 缓解: snapshot、stable-id 归一化、tick 轮转、公平上限与 shuffled-input determinism 测试。
- 风险: side-step 逐拍左右抖或把 shopkeeper / hostile 推走。
- 缓解: 4-tick side-stick；只有 active ordinary autonomous NPC 可被动让路，其余硬挡。
- 风险: gait 拆分误清 0x87、定帧、semantic action。
- 缓解: 明确渲染优先级和 rejected-move 不清理规则，补 legacy animation ownership 回归。
- 风险: 现有 PAL authored auto waypoint 穿墙，收紧后某实体永久等待。
- 缓解: 不假 resolve、不阻塞全局；blocked 诊断 + PAL fixture / 浏览器巡检，若是内容迁移缺陷则按
  上游铁律另开卡修迁移源，不在 runtime 放特判；done 前交 PAL-wide dry simulation census。
- 设计主动偏离原版: 原版 hostile 受阻仍会调用 speed=0 step 并推进腿帧，Reforge 冻结为 blocked
  站立不踏步；原版推离玩家不更新 trail，Reforge 为 follower 路径一致性主动记录真实离格方向；
  `<1` Chebyshev 对称 footprint 也比原版约 `<0.5` 的点对 blocker 更保守。三项均是 clean rewrite
  产品选择，验收不得倒称为原版距离 / 帧级复刻。

### 主审立场

- Reviewer: Kimi（架构 / 权威 / 动画）+ GLM（实体分类 / 测试矩阵）
- 结论: Kimi **agree（2026-08-12，附钉已落卡）**；GLM **agree（2026-08-12）**
- 已落实的 build 钉（2026-08-12 Codex 已落卡，非架构返工）:
  1. **passive-yield / 玩家位置提交必须过 E6 `canWrite` 权威门**（Kimi 设计压测发现，
     已写入功能不变量、测试矩阵与设计结论 §1 / §4）。
     §4 的 passive-yield 候选当前只要求 terrain / body / reservation。反例：party authority 为
     `mount`（s213 乘筏）或 script `moveParty` 在途时，party 位置唯一写者是 mount 派生 / 脚本；
     此时 arbiter 接受被动让路会写入一拍即被派生覆盖的幽灵位移，但 trail push、camera 与该
     幽灵落点的 touch scan 已生效，可在玩家并未真实落足的门格上触发 loadScene。修订：passive-yield
     候选与任何玩家位置 commit 增加前提 `authority(party) 为 world`；非 world 时请求方 mover
     停步 / 等待，不位移玩家、不推 trail、不做 touch scan。矩阵补一条：mounted / script-owned
     party 拒绝 passive-yield，mover 停步且不产生玩家副作用。
- 是否建议进入 build: **建议进入；三方 agree 已齐，2026-08-12 准入生效**

### 三方争议记录(按需)

- Codex: 2026-08-12 **agree**。选择内部 pure arbiter，不扩 schema / public API；脚本 authored
  move 保 bypass，dynamic locomotion 才保证不互穿；player / active-auto mutual yield 按上述
  确定性规则冻结。
- Kimi: 2026-08-12 **agree（附 1 条必落卡钉：passive-yield 过 E6 canWrite 门）**。逐条压测记录：
  - source 分层：script > engine hostile > auto 单 producer、script/auto 双 slot 不互杀、take 暂停
    而非 abort、release 从真实坐标续走、auto move 真到 endpoint 才 resolve/持久化——逐一封住卡内
    已知坑；interactive `moveEntity`/`stepEntity` 保 scriptedBypass，剧情走位不会被动态碰撞卡死。
  - 几何：Chebyshev `<1−ε` 连续 footprint、归一化时刻双轨迹 swept、腾位依赖图子相位 + cycle/swap
    拒绝、terrain ≤0.25 格采样、penetration 单调脱离规则，覆盖 0.25/0.375/0.5 分数步与 convoy
    误拒两类经典反例；static/suspended/script-owned/mounted/hostile 的 body 与 yieldable 分类与
    `entity-lifecycle.ts:35-57` gate 派生一致。
  - 公平：stable-id 归一化 + `worldTickNum` 轮转起点、禁 Math.random、8 eligible-tick 推进上界入矩阵。
  - 时序：pre-contact claim（snapshot 贴脸不可逃）→ 线性化 commit → 最终落点单次 touch scan →
    post-contact 首贴近者，token 分离、scene 失效零迟到回调，与现行 `main.ts:5849-5865` /
    `tickHostiles` 语义一致且更严。
  - gait：从 `entityAnim` 拆出独立 walk phase、渲染优先级 frame override > gait > explicit anim >
    semantic action > loop > idle、rejected 只转朝向不清演出帧——精确对应 `main.ts:4924-4945`
    现行双计数混用与「误清 0x87 / 永停抬腿帧」两坑；slow 隔拍空拍保 gait 帧的例外已写明。
  - 红线复核：未复引对白全局冻结；未改 content schema/save/migration/public ScriptHost；mount/
    follower 有意重叠豁免在案；65 solid / 268 non-solid census 口径被尊重，未一刀切。
  - 唯一缺口即上方 E6 `canWrite` 钉（mount/script 持有 party 时的幽灵位移 + 幽灵 touch scan；
    现已由 Codex 落卡）。
  Evidence: 本卡设计结论 §1-§8 对照 `main.ts:2262-2292,2775-2831,3108-3155,3603-3698,3795-3843,
  4924-4945,5356-5363,5843-5869`、`collision.ts`、`entity-lifecycle.ts:35-57`、`sprite-anim.ts:18-21,
  62-92`、`e6-position-authority-design.md:41-72` 只读核查；未修改实现文件，未代签 GLM。
- GLM: 2026-08-12 **agree**。实体分类、cancellation、determinism、公平性、PAL fixture 与
  PAL-wide census 验收矩阵完整；无新增 counter。详见「GLM 设计主审证据」。
- 用户拍板: pending（当前无分歧待裁决）

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: 第一批预计 `packages/reforge/src/entity-motion.ts`、对应 test 与 `main.ts` 适配；
  实际文件随 build 追加。
- 实现摘要: 2026-08-12 三签齐，进入 build；先落 pure geometry / reservation arbiter，再接
  source slots、player/auto/hostile、gait 和 PAL-wide census，保持单一 Coding Owner。
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: N/A

## 视觉验证记录(如适用)

- Visual Verification Owner: Kimi
- Visual Verification Timing: mixed
- 验证方式: build 期 s004 / s006 / s060 功能性最小验证；代码冻结后 s001 / s213 集中 E2E。
- 集中 E2E 用例 / 批次: 见「验收条件」。
- 截图 / 像素检查路径: pending（预登记 `output/playwright/d15-1/`）。
- 结论: pending
- 未完成项: 全部；当前仍为 draft。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: pending

## 交接日志

- 2026-08-06 Codex: 开卡。auto 巡逻已有；缺口为动态碰撞、让路和转向。
- 2026-08-12 Codex: 完成三路只读压力审计并冻结 v1 设计；审计不构成 Kimi / GLM 席位签字，
  未改实现。Evidence: 当前链路 / 原版 UX / 294 场景 auto census / 自动测试矩阵均已落本卡；
  advisory 复审发现的 source、swept、lifecycle、touch token、chase terminal、gait blocker 已逐项
  修订后清零。Next: Kimi 架构审签，随后 GLM 覆盖审签；两席 agree 前保持 draft。
- 2026-08-12 Kimi（本人架构主审）: 签 **agree（附 1 条 build 前必落卡钉）**。逐条压测记录见
  「三方争议记录」Kimi 条。唯一缺口：passive-yield / 玩家位置 commit 未过 E6 `canWrite` 门，
  mount / script 持有 party 时可产生幽灵位移 + 幽灵 touch scan（可能误触门格 loadScene）；
  修订为一行规则 + 一条矩阵用例，见「主审立场」必改项 1。Next: Codex 把该钉落入设计文本
  （可同 GLM 复审并行），GLM 审实体分类与测试矩阵；钉落卡 + GLM agree 前保持 draft，不得
  修改实现文件。
- 2026-08-12 Codex: 已把 Kimi 的 E6 `canWrite` 钉落入功能不变量、测试矩阵及设计结论 §1 / §4：
  party 非 world authority 时 planner 不产生 / 提交 player outcome，不写 position / trail / camera，
  不做 touch scan，请求让位的 mover 停步。Next: 仅等待 GLM 设计审签；agree 前保持 draft。
- 2026-08-12 GLM（本人实体行为/测试覆盖主审）: 签 **agree**；无新增 counter，完整证据见
  「GLM 设计主审证据」。签字写入时实际基线为 `ca9b422d`，陈旧 HEAD 文本由 Codex 仅作元数据
  校正。Next: 三方 agree 齐，D15-1 进入 build，Coding Owner Codex 开始 pure arbiter。

## 下一位 Agent 提示词

无下一位 Agent 提示词；三方设计签字已齐，Coding Owner Codex 在本会话继续 build。实现完成并
自验后再生成 Kimi / GLM review 提示词，done 前仍须三方 accept。
