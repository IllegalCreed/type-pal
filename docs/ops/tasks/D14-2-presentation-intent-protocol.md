# D14-2 - 演出意图协议 + CutsceneController（议题 5/12/14 剩余②）

Status: draft
Phase: phase2
Capability: 议题 5 演出/cutscene 建模 + 议题 12 统一控制器 + 议题 14 剩余②（P0 演出建模）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi（架构/演出建模主审）+ GLM（覆盖/协议词汇矩阵）
Visual Verification Owner: Kimi
Unavailable Agents: none
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

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 分歧处理: N/A
- 缺签豁免: N/A
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

待冻结。方向：effect 词汇表（声明式）+ CutsceneController（执行器）；现有 fade-driver 的
owner/接管语义作为协议先例；cameraPanFx 收敛进 controller。

### 已知风险

- 风险: 协议过度设计（为 MMO/未来留口）。
- 缓解: 只覆盖现存五个能力 + 分镜组合，词汇表以真实场景为准。
- 风险: 演出行为回归（求雨/酒剑仙）。
- 缓解: 行为真值测试 + Kimi 视觉并排对比作为门禁。

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

## 下一位 Agent 提示词

```text
接手任务: D14-2 演出意图协议 + CutsceneController
任务卡: docs/ops/tasks/D14-2-presentation-intent-protocol.md
当前状态: draft（build 准入 blocked）
你的角色: Kimi 架构/演出建模主审；GLM 协议词汇/覆盖矩阵主审
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡、design-backlog 议题 5/12/14、
  engine-debt-audit §6、content-schema §6、packages/reforge/src/main.ts:1286/1311/2673/2676、
  frame-animation-presentation.ts、fade-driver.ts、dialogue.ts、async-intent.ts
已完成: 开卡（范围/锚点/验收），设计未冻结
请你做: 压测 effect 词汇表边界（五个现有能力 + 组合）、CutsceneController 的独占画面/抢键/
  虚拟时钟/取消语义、与 D12-1 和编辑器时间线（P2）的接口留口；冻结方案后 agree/counter
不要做: 不得修改实现文件；不得为未来留过度设计
输出要求: 更新设计签字、主审立场、争议处理和下一位提示词
```
