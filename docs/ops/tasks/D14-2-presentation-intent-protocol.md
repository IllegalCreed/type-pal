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
- Kimi: pending
- GLM: **缺席（2026-08-07 额度耗尽；覆盖/矩阵审查由 Kimi + Codex 临时代班，
  待额度恢复后补签补审）**
- counter / 分歧处理: N/A
- 缺签豁免: 用户已批准（2026-08-07：「glm额度耗尽了，只能kimi审核了」；缺席方=GLM，
  原因=额度耗尽，代班方=Kimi（架构/演出建模）+ Codex（覆盖矩阵临时代班），
  是否需补签=是（GLM 恢复后补审补签））
- build 准入结论: blocked

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

- Reviewer: Kimi（架构）+ GLM（覆盖）
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending

### 三方争议记录(按需)

- Codex: 2026-08-06 用户咨询后开卡；与议题 12 剩余②（统一 CutsceneController）合并，
  音频分层独立为 D12-1。
- Kimi: pending
- GLM: pending

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: pending；设计三签前不得开始实现。
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending（Kimi 视觉验收）
- 跳过的检查及原因: N/A

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

## 下一位 Agent 提示词

```text
接手任务: D14-2 演出意图协议 + CutsceneController——Kimi 单审(GLM 额度耗尽代班)
任务卡: docs/ops/tasks/D14-2-presentation-intent-protocol.md
当前状态: draft（build 准入 blocked；Codex 设计冻结并签 agree；GLM 额度耗尽缺席，
  覆盖/矩阵由你 + Codex 临时代班，待 GLM 补审——见「推进签字·缺签豁免」）
你的角色: Kimi 架构/演出建模主审 + GLM 覆盖矩阵的代班主审
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡、design-backlog 议题 5/12/14、
  engine-debt-audit §6、content-schema §6、main.ts:1286/1893/1938/2005/2565/2712/3012、
  frame-animation-presentation.ts、fade-driver.ts、dialogue.ts、async-intent.ts、D12-1 卡
已完成: Codex 设计冻结——PresentationIntent 词汇表(现存五能力+wait,音频/SFX 不入协议)
  + CutsceneController.run(cutscene, signal) 统一取消 + busy() 单一呈现占用句柄
  (替代 runner/dialog/cameraPanFx 拼装判定);cameraPanFx 收口;虚拟时钟注入;
  接入 main.ts script host 五方法,行为真值不变;验证=开场/求雨/酒剑仙/锁妖塔/结局
请你做: 压测 busy() 收口的消费点核对(输入路由/D13-1 徽标/X1 autosave)、取消无孤儿语义、
  与编辑器时间线(P2)留口;**代班 GLM 覆盖矩阵**:复核词汇表对现存五能力的全量覆盖与回放
  矩阵(开场/求雨/酒剑仙/锁妖塔/结局)——此部分同时标「待 GLM 补审」;
  冻结方案后 agree/counter
不要做: 不得修改实现文件；不得为未来留过度设计
输出要求: 更新设计签字、主审立场、争议处理和下一位提示词
```
