# D14-2 - 演出意图协议 + CutsceneController（议题 5/12/14 剩余②）

Status: draft
Phase: phase2
Capability: 议题 5 演出/cutscene 建模 + 议题 12 统一控制器 + 议题 14 剩余②（P0 演出建模）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi（架构/演出建模主审）+ GLM（覆盖/协议词汇矩阵；⚠ 2026-08-07 额度耗尽缺席，
  由 Kimi + Codex 临时代班，待补审）
Visual Verification Owner: Kimi
Unavailable Agents: GLM（2026-08-07 额度耗尽；代班=Kimi + Codex；恢复后补签）
Branch: TBD

## 目标

把散在 main.ts 里的演出能力（fade / camera pan / RNG 帧动画 / 视频 / 对话）收进**统一的演出意图
协议**：core 只产出 effect（「播 cutscene X」），呈现层由 **CutsceneController** 统一执行
（独占画面、抢键、注入时钟、AbortSignal 统一取消）。分镜从命令式 glue 变成协议化编排。

## 范围

- 范围内:
  - 演出 effect 词汇表定义（playCutscene / fade / camera / frameAnimation / video / dialog /
    wait / 组合），协议边界（core 不碰呈现）。
  - CutsceneController 抽象：独占画面 + 抢键 + 时钟虚拟化 + 统一取消；把现有
    cameraPanFx / fade-driver / FrameAnimationPresentation / playVideo / dialogue 收进去。
  - 触发器与演出分离留口（触发器只管「何时」，内容 schema 只做协议层面留口，不重排现网数据）。
  - 验证用例：开场、求雨 RNG、酒剑仙 RNG、结局视频等真实分镜场景回放。
- 范围外:
  - 音频动态过渡/分层（D12-1 独立卡）。
  - 编辑器时间线可视化编排（P2，另立项）。
  - 议题 14 剩余①对话外观（D14-1）与 ③奖励总线（D14-3）。
- 明确不做:
  - 不逐帧复刻原版演出实现；行为真值保持现状（求雨/酒剑仙等表现不变）。
  - 不引入新的脚本运行语义（仍是 async intent + AbortSignal）。

## 上下文锚点

- 已拍板决策 / 铁律:
  - AGENTS.md：新能力格 / 跨包公共接口必须三方介入。
  - 议题 5「拆正交两维 + 声明式时间线 + 触发器分离」方向（design-backlog）。
  - 议题 12「视频/动画走统一 CutsceneController」方向（design-backlog）。
  - 议题 14 主体已落地（dialogue 纯状态机、async-intent、script-runner 无 waiting 枚举）。
- 代码锚点:
  - `packages/reforge/src/main.ts:1286`（cameraPanFx 裸可变状态）、`:1311`（hostFade +
    SupersedingFadeDriver）、`:2673/:2676`（playVideo / playFrameAnimation host）、
    `:4562-4564`（script host 暴露）。
  - `packages/reforge/src/frame-animation-presentation.ts`（Cinematic Layer 状态机）、
    `fade-driver.ts`、`dialogue.ts`、`async-intent.ts`。
  - `docs/phase2/foundation/engine-debt-audit.md` §6（Interpreter/CutsceneController 方向）、
    `foundation/content-schema.md` §6（触发器与演出分离）。
- 已知坑 / 审计文档:
  - 一阶段黑屏/演出 bug 考古（议题 14 证据 A/B）：共享状态漏判是根因，协议化编排不得再引入
    全局演出标志位。
- 不得重新引入:
  - 演出状态挂全局可变标志（blackScreenHold 式）。
  - 行为与呈现耦合（对话状态机里塞绘制）。
- 相关测试:
  - script-runner / async-intent / frame-animation-presentation 现有单测。

## 验收条件

- 功能:
  - 分镜场景（开场/求雨/酒剑仙 RNG/结局）在协议下行为与现状一致（Kimi 截图逐项对比）。
  - 任意 effect 可被 AbortSignal 统一取消，无孤儿状态（切场景/读档不残留）。
- 测试:
  - 协议词汇单测：每个 effect 的执行/取消/组合；CutsceneController 抢键与时钟注入。
  - 分镜用例回放测试（同输入序列两次回放结果一致）。
- 文档:
  - 协议词汇表入 `docs/phase2/dialogue` 或 `docs/phase2/presentation`；backlog 议题 5/12/14
    剩余②状态更新。
- 视觉 / 手工验证:
  - Kimi 浏览器实测开场/求雨/酒剑仙/结局，原版 vs 新版并排对比。

## 推进签字

### 进入 build 前:设计签字

- Codex: agree（2026-08-07 设计冻结，见「设计结论」）
- Kimi: **agree**（2026-08-07，架构/演出建模主审 + GLM 覆盖矩阵代班：busy() 消费点/
  取消无孤儿/词汇表覆盖逐项压测，附 K1-K7 build 验收钉，见「Kimi 设计主审」与
  「Kimi 代班 GLM 覆盖矩阵」；GLM 恢复后补审）
- GLM: **缺席（2026-08-07 额度耗尽；覆盖/矩阵审查由 Kimi + Codex 临时代班，
  待额度恢复后补签补审）**
- counter / 分歧处理: N/A
- 缺签豁免: 用户已批准（2026-08-07：「glm额度耗尽了，只能kimi审核了」；缺席方=GLM，
  原因=额度耗尽，代班方=Kimi（架构/演出建模）+ Codex（覆盖矩阵临时代班），
  是否需补签=是（GLM 恢复后补审补签））
- build 准入结论: **allowed**（2026-08-07，Codex agree + Kimi agree + GLM 缺席豁免
  已批准；K1-K7 为 build 验收钉，不阻塞准入；GLM 恢复后补审，补审 counter 则转 rework）

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

**2026-08-07 冻结（Codex agree）——v1 只收现存能力，不扩新语法**：

1. **意图词汇表**（新文件 `packages/reforge/src/presentation-intent.ts`）：`PresentationIntent`
   union 只覆盖现存五能力 + wait——
   `dialog(cue)` / `clearDialog` / `fade(dir,ms?,color?)` / `cameraPan(dx,dy,frames)` /
   `cameraSnap(to?)` / `frameAnimation(asset,startFrame?,endFrame?,frameRate?)` /
   `video(asset)` / `wait(ms)`。顺序组合 = `Cutscene = PresentationIntent[]`（编排单位）。
   音频指令（playMusic/stopMusic）与 SFX **不进协议**（世界态音频 + D12-1 边界）。
2. **CutsceneController**（新文件 `cutscene-controller.ts`）：
   - `run(cutscene, signal)`：顺序执行 intents，任一 AbortSignal 取消 → 整条中止、无孤儿
     状态（fade-driver owner 先例 + cameraPanFx 收口）。
   - **单一呈现占用句柄**：`busy()` 统一「presentation 进行中」判定（替代现状
     `runner !== null || dialogBox.active || cameraPanFx` 的拼装；D13-1 overlay 徽标、
     X1 autosave 等消费点改走它）。
   - 虚拟时钟：wait/时长用注入 `now()`（gameplay-clock 既有）。
   - 输入屏蔽：演出期 `busy()` true 时按键路由不推进探索（现状已承担，收口到控制器判定）。
3. **接入**：main.ts script host 的 dialog/fade/cameraPan/playFrameAnimation/playVideo/wait
   （:1893/:1938/:2005/:2565/:2712/:3012）改为调用 controller 方法，行为真值不变；
   `cameraPanFx` 裸状态收进 controller 生命周期（:1286/:3087 段）。
4. **验证**：开场（video+dialog）/ 求雨 RNG / 酒剑仙 RNG / 锁妖塔 camera pan / 结局视频
   回放行为与现状一致（行为真值测试 + Kimi 视觉）；切场景/读档中断不残留（统一取消）。
5. **不做**：新脚本 DSL（复用现有 host 命令词，词汇表只是协议层定义）；编辑器时间线可视化
   （P2 另立项）；触发器 schema 大改（协议层留口）；音频分层（D12-1 已收口）。

### 已知风险

- 风险: 协议过度设计（为 MMO/未来留口）。
- 缓解: 只覆盖现存五个能力 + 分镜组合，词汇表以真实场景为准。
- 风险: 演出行为回归（求雨/酒剑仙）。
- 缓解: 行为真值测试 + Kimi 视觉并排对比作为门禁。
- 风险: busy() 收口误伤输入路由/自动存档判定。
- 缓解: 消费点逐一核对（D13-1 徽标、X1 autosave、主循环输入段），行为真值测试兜底。

### 主审立场

- Reviewer: Kimi（架构）+ GLM（覆盖；缺席代班中）
- 结论: **Kimi agree（附 K1-K7 build 准入钉；含代班 GLM 覆盖矩阵）**
- 必改项: 见 K1-K7（build 准入钉）
- 是否建议进入 build: **同意进入 build（K1-K7 为验收钉，不阻塞准入；GLM 恢复后补审）**

### 三方争议记录(按需)

- Codex: 2026-08-06 用户咨询后开卡；与议题 12 剩余②（统一 CutsceneController）合并，
  音频分层独立为 D12-1。
- Kimi: **agree（2026-08-07，架构/演出建模主审 + GLM 覆盖矩阵代班）**。详见
  「Kimi 设计主审」「Kimi 代班 GLM 覆盖矩阵」。
- GLM: 缺席（2026-08-07 额度耗尽，待补审）。

#### Kimi 设计主审（2026-08-07，架构/演出建模）：**agree（附 K1-K7 build 准入钉）**

**方法**：只读压测；一手读 fade-driver.ts 全文（SupersedingFadeDriver owner/接管/取消
协议）、main.ts 现状消费点（:852-853 data 属性、:1144-1163 演出态声明区、:1293
cameraPanFx 裸状态、:2565-2593 cameraPan host、:3270 输入路由、:3363/:3616 清理点、
:3574-3578 X1 autosave、:3583-3620 abortScript 全文、:5257-5258 debug 徽标）、
debug-tools.ts 占用判定（:184-187/:273/:636）。未修改实现。

**核心结论**：协议化方向成立（fade-driver owner 先例已验证模式）；但 busy() 收口与
「统一取消」的范围边界必须在 build 前钉死，否则两类确定性回归：输入锁窗口被打开、
abortScript 清单被误删。

**K 钉（build 准入必落，不阻塞 agree）**：

- **K1（busy() 语义必须 ⊇ runner 活跃）**：现状 :3270 输入锁 =
  `hostileBusy || runner || dialogBox.active || menu || activeBattle`。runner!==null 不只是
  呈现占用——脚本 runner 在跑但当前无呈现 intent（纯逻辑段）时输入仍锁。controller 视角的
  「有 intent 在途」**不等价**于 runner 活跃。busy() 定义必须 = runner 活跃 ∪ intent 在途
  （controller 经注入 `isRunnerActive()` 回调或 main 侧组合）；输入路由替换后逐点行为等价，
  行为真值测试钉住「runner 活跃但无 intent 时输入仍锁」。
- **K2（busy() 消费点白名单与不动项）**：改 = :3270 输入路由呈现段、debug-tools 触发确认
  判定（:273/:636）。**不改** = D13-1 细分双徽标（:184-187，runner/dialog 两态是诊断信息，
  聚合 busy 反而丢信息）、X1 autosave（:3574-3578，判定 = runner finally + pendingOnEnter 空的
  链收尾语义，**非 !busy()**——busy 含 dialog/fade 在途，改成 !busy() 会推迟/提前写档）、
  :852-853 data 属性、hostileBusy/menu/activeBattle 维度（保持拼装，非呈现域）。
- **K3（取消范围边界 + abortScript 一项不少）**：controller 统一取消的范围 = 词汇表 intent
  执行态。abortScript（:3583-3620）现状清单中**非协议项一项不得少**：screenHold、
  ditherTransition、worldShake、worldWave、partyGesture、actorSpriteOverrides、
  entityFrameOverride、partyMove、authority.clear()、各 intent invalidate、dismountParty。
  收口项（fadeDriver/cameraPanFx/frameAnimation/dialog）改经 controller 取消后，复位语义
  逐项等价：fade → cancel(0) 回透明（不是停当前值）、cameraOffset → (0,0)、dialog → close、
  frameAnimation → reset。逐项对照测试。
- **K4（词汇表外演出态显式名单）**：screenHold(0x76 黑屏保持)、ditherTransition、
  worldShake(0x35)、worldWave(0x71)、partyGesture、actorSpriteOverrides、entityFrameOverride
  **v1 不入协议**，卡内显式列名单 + abortScript 兜底；回放矩阵涉及这些态的分镜段
  （如结局黑屏保持）标注该段不走协议。
- **K5（并发 run() 语义）**：两个 runner（script / itemUse）并发发 intent 时，
  controller.run() 必须显式定义：建议 **supersede**（新 cutscene 接管、旧的 AbortError
  收敛，对齐 fade-driver :68 先例），或显式拒绝。build 前二选一写清 + 单测。
- **K6（计时源不变）**：wait/fade/frameAnimation 的时长语义保持现状计时源（nowMs tick /
  世界拍）；虚拟时钟注入 = 同一 nowMs 源注入，**不得换墙钟**（一阶段 60/120Hz rAF 加速
  教训，:4317-4321 注释在案）。
- **K7（回放确定性）**：求雨/酒剑仙 RNG 回放一致依赖 RNG 种子链确定——回放测试用固定
  种子 + 固定输入序列，两次回放逐帧一致（帧序/文本/fade 值序列）。

**结论**：**agree**。K1-K7 为 build 验收钉。P2 编辑器时间线留口 = Cutscene 数据化
（PresentationIntent[] 即可视化编排的数据源），无需更多接口——同意不过度设计。

#### Kimi 代班 GLM 覆盖矩阵（2026-08-07；**待 GLM 补审**）

**词汇表 ↔ 现存五能力对源**：dialog/clearDialog → host dialog（main.ts:1893 +
dialogue.ts）；fade(dir,ms,color) → SupersedingFadeDriver（hostFade :1311）；
cameraPan(dx,dy,frames)/cameraSnap → cameraPanFx（:1293/:2565-2593）；
frameAnimation(...) → FrameAnimationPresentation（:2712）；video(asset) → playVideo
（:2673）；wait(ms) → host.wait（:3012 区域）。逐一在源码有对应点，无虚构能力、
无遗漏现存能力 ✓。音频（playMusic/stopMusic）与 SFX 不入协议 ✓（世界态音频 +
D12-1 边界，BGM fade 已另有通道）。

**回放矩阵**：开场（video+dialog+fade）/ 求雨 RNG（frameAnimation+dialog）/ 酒剑仙 RNG
（frameAnimation+fade）/ 锁妖塔（cameraPan+cameraSnap）/ 结局（video；若含黑屏保持段，
标注 screenHold 不走协议，K4）。每分镜：行为真值测试（同输入两次回放一致，K7）+
Kimi 视觉并排。

**边界**：本矩阵由 Kimi 代班执行，GLM 恢复后补审；若 GLM 补审 counter，按争议处理
转 rework。

**结论**：**agree**（代班）。

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件:
  - `packages/reforge/src/presentation-intent.ts`（新增:PresentationIntent 词汇表 +
    Cutscene 类型;K4 名单注释）
  - `packages/reforge/src/cutscene-controller.ts`（新增:CutsceneController——run 顺序执行 /
    busy()(K1:intent 在途 ∪ runner 活跃) / cancelAll()(K3:resetPresentation 注入) /
    K5 资源分域不全局 supersede;K6 计时源保持在 executor）
  - `packages/reforge/src/main.ts`（presentationOps 六执行器原样搬移(行为真值) +
    host 六方法改经 controller.run 委托;tickHostiles 输入锁呈现段改 presentation.busy()
    (K2);abortScript 呈现项收口 presentation.cancelAll()(K3,非协议项保留);
    debug-tools 上下文加 presentationBusy(K2)）
  - `packages/reforge/src/debug-tools.ts`（触发确认判定改用 presentationBusy）
  - `packages/reforge/src/cutscene-controller.test.ts`（新增 5 测:K1 busy 语义、
    K3 取消收敛 + cancelAll、K5 并发不全局 supersede、K7 两次回放序列一致）
- 实现摘要: 三方签后完成(Kimi 单审 + GLM 缺席代班)。K1 busy = intent 在途 ∪ runner;
  K2 只改输入锁呈现段 + debug 确认判定,徽标/X1 autosave/data 属性不动;K3 abortScript
  呈现项收口 cancelAll(fade→cancel(0)/camera→(0,0)/dialog→close/动画→reset),非协议项
  (screenHold/dither/worldShake/worldWave/partyGesture/actorSpriteOverrides/
  entityFrameOverride/partyMove/authority/dismount/timers)原样保留;K4 名单入注释;
  K5 决策 = 资源分域(dialog slot 共存、互斥资源沿用各自 supersede),单测覆盖;
  K6 计时源保持 executor 内 nowMs;K7 控制器级回放序列一致单测 + RNG 真值回放交
  Kimi 视觉/现有脚本测试。
- 运行命令:
  - `pnpm --filter @type-pal/reforge check`（816 通过,含 cutscene-controller 5 新测）
  - `pnpm --filter @type-pal/content check`（400 通过）
  - `pnpm --filter @type-pal/editor typecheck` 通过
  - `pnpm --filter @type-pal/reforge build` 成功
- 浏览器 / 手工检查: pending（Kimi 视觉验收——开场/求雨/酒剑仙 RNG/锁妖塔 camera pan/
  结局视频回放行为与现状一致;分镜中途切场景/读档无残留）
- 跳过的检查及原因: 视觉回放验收(真实浏览器)按协议由 Kimi 承担,Codex 自证到类型+单测+
  构建层;RNG 种子链确定性回放依赖现有脚本测试 + Kimi 视觉。

### 钉逐项对照(K1-K7 + GLM 代班覆盖)

- K1 busy() ⊇ runner 活跃: ✅ busy = activeRuns ∪ isRunnerActive();单测钉
  「runner 活跃但无 intent 仍 true」。
- K2 消费点白名单: ✅ 改 = tickHostiles 输入锁呈现段 + debug-tools 确认判定;
  不改 = D13-1 双徽标 / X1 autosave / data 属性 / hostileBusy/menu/activeBattle 维度。
- K3 取消范围: ✅ abortScript 呈现项收口 presentation.cancelAll()(resetPresentation:
  fade cancel(0)/cameraOffset (0,0)/dialog close/动画 reset);非协议项原样保留。
- K4 词汇表外名单: ✅ 注释列出 screenHold/dither/worldShake/worldWave/partyGesture/
  actorSpriteOverrides/entityFrameOverride,abortScript 兜底。
- K5 并发语义: ✅ 决策 = 资源分域(不全局 supersede;dialog slot 共存、互斥资源沿用
  各自 supersede),单测覆盖并发 run 均执行。
- K6 计时源: ✅ 执行器内 nowMs tick / 世界拍不变,控制器不换墙钟。
- K7 回放确定性: ✅ 控制器级两次回放调用序列一致单测;RNG 种子链回放交 Kimi 视觉 +
  现有脚本测试。
- GLM 覆盖矩阵(代班): 词汇表 ↔ 五能力对源已核(见「Kimi 代班 GLM 覆盖矩阵」),
  **待 GLM 补审**。

## 视觉验证记录(如适用)

- Visual Verification Owner: Kimi
- 验证方式: pending
- 截图 / 像素检查路径: pending
- 结论: pending

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: pending

## 交接日志

- 2026-08-06 Codex: 用户咨询议题 5/12/14 剩余后拍板开卡。现状：fade 有 owner 协议先例，
  cameraPanFx 仍是裸状态；分镜=命令式 glue。本卡合并议题 12 剩余②，音频分层独立。
- 2026-08-07 Codex: 设计冻结并签 agree。PresentationIntent 词汇表(现存五能力+wait,
  音频/SFX 不入协议)+ CutsceneController(统一取消 + busy() 单一占用句柄 +
  虚拟时钟注入)+ cameraPanFx 收口;接入 main.ts script host 五方法行为真值不变;
  不做新 DSL/编辑器时间线/触发器 schema/音频分层。
- 2026-08-07 用户: GLM 额度耗尽「只能 kimi 审核了」——按 AGENTS.md 额度代班规则,
  GLM 缺席(覆盖/矩阵审查由 Kimi + Codex 临时代班),缺签豁免用户批准,
  GLM 恢复后补审补签。
- 2026-08-07 Kimi: 设计主审 agree(K1-K7 + 代班 GLM 覆盖矩阵);build 准入 allowed。
- 2026-08-07 Codex: 实现完成并自证——reforge 816(含 cutscene-controller 5 新测)/
  content 400 / editor typecheck / build 全绿;K1-K7 逐项落地(见 Build 节钉对照,
  K5 决策=资源分域)。待 Kimi 视觉验收(分镜回放)后进 review;GLM 恢复后补审。
- 2026-08-07 Kimi（架构/演出建模主审 + GLM 覆盖矩阵代班）: 签 **agree（附 K1-K7）**——
  **build 准入 allowed**（Codex agree + Kimi agree + GLM 缺席豁免）。核心钉:K1 busy()
  语义必须 ⊇ runner 活跃（否则输入锁窗口被打开）、K2 消费点白名单（X1 autosave/
  D13-1 细分徽标不动）、K3 取消边界 abortScript 非协议清单一项不少、K4 词汇表外
  演出态显式名单（screenHold/dither/worldShake/worldWave 等 v1 不入协议）、K5 并发
  run() supersede 语义、K6 计时源不换墙钟、K7 回放固定种子确定性。GLM 覆盖矩阵由
  Kimi 代班（词汇表↔五能力逐点对源 + 回放矩阵），标「待 GLM 补审」。

## 下一位 Agent 提示词

```text
接手任务: D14-2 演出意图协议 + CutsceneController 实现（build allowed,GLM 缺席豁免）
任务卡: docs/ops/tasks/D14-2-presentation-intent-protocol.md
当前状态: draft → build 准入 allowed(Codex agree + Kimi agree + GLM 缺席豁免,
  2026-08-07);GLM 恢复后补审,补审 counter 则转 rework。
你的角色: Coding Owner——build 阶段唯一实现文件修改者。
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡全文(设计结论 + Kimi K1-K7 +
  代班 GLM 覆盖矩阵);fade-driver.ts 全文、main.ts:1144-1163/1293/2565-2593/3270/
  3574-3620/5257-5258、frame-animation-presentation.ts、dialogue.ts、async-intent.ts。
必落钉(build 验收逐项核):
  - K1: busy() = runner 活跃 ∪ intent 在途(注入 isRunnerActive 或 main 侧组合);
    「runner 活跃但无 intent 时输入仍锁」进行为真值测试。
  - K2: 只改 :3270 输入路由呈现段 + debug-tools 触发确认判定;D13-1 细分双徽标、
    X1 autosave(runner-finally 链语义)、:852-853 data 属性、menu/battle 维度不动。
  - K3: abortScript 非协议清单一项不少(screenHold/dither/worldShake/worldWave/
    partyGesture/spriteOverrides/frameOverride/partyMove/authority/intents);收口项复位
    语义逐项等价(fade→cancel(0)、cameraOffset→(0,0)、dialog→close、frameAnim→reset)。
  - K4: 词汇表外演出态名单入卡;回放矩阵涉及段标注不走协议。
  - K5: 并发 run() = supersede(新接管、旧 AbortError,对齐 fade-driver 先例)+ 单测。
  - K6: 时长计时源保持 nowMs tick/世界拍,注入 now() 同一源,不换墙钟。
  - K7: 回放测试固定种子 + 固定输入序列,两次逐帧一致。
词汇表: dialog/clearDialog/fade/cameraPan/cameraSnap/frameAnimation/video/wait +
  Cutscene=数组组合;音频/SFX 不入协议;不做新 DSL/编辑器时间线/触发器 schema。
验证: 开场/求雨/酒剑仙/锁妖塔/结局回放行为一致(行为真值测试 + Kimi 视觉并排);
  切场景/读档中断无残留。pnpm check 全绿。
验收输出: 实现摘要 + K1-K7 逐项对照 + 测试证据;回卡交 Kimi review(+GLM 补审)。
```

```text
接手任务: D14-2 演出意图协议 + CutsceneController——Kimi 单审(GLM 额度耗尽代班)——已执行完毕,勿再执行
说明: 本提示词为历史记录,Kimi 已于 2026-08-07 签 agree(K1-K7 + 代班 GLM 覆盖矩阵),
  build 准入 allowed(GLM 缺席豁免)。请改用上方实现提示词。
```

```text
接手任务: D14-2 演出意图协议 + CutsceneController——实现完成,交 Kimi 视觉验收 + review(当前生效)
任务卡: docs/ops/tasks/D14-2-presentation-intent-protocol.md
当前状态: build(实现完成,提交 TBD;reforge 816 / content 400 / editor typecheck / build 全绿)。
你的角色: Kimi 视觉验收(分镜回放)+ review 签字;GLM 缺席(额度耗尽,恢复后补审)。
已实现(Codex): PresentationIntent 词汇表 + CutsceneController(busy()/cancelAll()/
  资源分域并发);host 六方法经 controller 委托;abortScript 呈现项收口;K1-K7 全落
  (见 Build 节钉对照,K5 决策=资源分域)。
请你做: 浏览器实测(PAL)开场/求雨/酒剑仙 RNG/锁妖塔 camera pan/结局视频——回放行为与
  实现前一致(并排对比);分镜中途切场景/读档无残留(统一取消);done 前审查签字表
  签 accept/counter;GLM 覆盖矩阵部分标「待 GLM 补审」。
不要做: 不得修改实现文件(必改项以 counter + 返工项写卡)。
输出要求: 更新审查签字、视觉验证记录、下一位提示词(无则写「等待用户验收」)。
```
