# D12-1 - 音频动态过渡与分层（议题 12 剩余①）

Status: draft
Phase: phase2
Capability: 议题 12 多媒体统一 · 音频（P1 多媒体 + P0 演出建模）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi（架构/听感）+ GLM（场景曲目覆盖矩阵）
Visual Verification Owner: N/A（听感验收：作者 + Kimi 代听）
Unavailable Agents: none
Branch: TBD

## 目标

BGM 从「硬切」升级为「动态过渡 + 分层」：换曲有淡入淡出/交叉淡化，环境音与音乐可分层，
战斗进出场有过渡，全部走现有 A-1 意图边界（稳定 AssetId、懒初始化、开关记账不变）。

## 范围

- 范围内:
  - BgmPlayer 增加 fade-out/fade-in / crossfade 语义（play/stop 带过渡参数，默认值对齐现行为）。
  - 分层混音：音乐层 + 环境音层（ambience）可共存；可选对话期 ducking。
  - 战斗进出场过渡接入（startBattle/restoreSceneMusic 的硬切改过渡）。
  - 保持稳定 AssetId、同曲不重启、音乐开关记账、懒初始化语义。
- 范围外:
  - 不改 asset/schema（曲目角色不变）。
  - MMO 级音轨总线 / 动态音乐编排（第三阶段）。
  - 视频/动画统一控制器（D14-2）。
- 明确不做:
  - 不逐帧复刻原版音频实现；MIDI 合成器不换（SpessaSynth + TimGM6mb 保持）。

## 上下文锚点

- 已拍板决策 / 铁律:
  - D9 i18n/稳定 id；作者拍板「更像原版，别换大库」（bgm.ts 头注）。
  - A-1 音频意图边界干净（audit），本卡在其上加能力。
- 代码锚点:
  - `packages/reforge/src/audio/bgm.ts`（现 play/stop 硬切；无 gain 节点/过渡）。
  - `packages/reforge/src/main.ts:2414`（战斗曲硬切）、`:2202-2204`（场景曲恢复硬切）、
    `:2485-2486`（playMusic/stopMusic）。
  - `packages/reforge/src/audio/sfx.ts`（音效层，保持独立）。
- 已知坑 / 审计文档:
  - engine-debt-audit A-1：意图边界干净，不要引入全局音频状态标志。
  - 一阶段 CC91 混响锁、autoplay/resume 守卫（bgm.ts 头注）不得破坏。
- 不得重新引入:
  - 模块级音量全局耦合（一阶段 videoVolume 教训）。
- 相关测试:
  - audio/bgm.test.ts、sfx.test.ts。

## 验收条件

- 功能:
  - 换曲有淡入淡出（默认值不改变现有场景节奏）；战斗进出场过渡无硬切爆音。
  - 环境音 + 音乐可同时播放；开关/存档语义不变。
- 测试:
  - fade/crossfade 单测（时长/取消/幂等）；场景曲目进出矩阵（GLM）。
- 文档:
  - bgm.ts 接口注释更新；backlog 议题 12 状态更新。
- 视觉 / 手工验证:
  - 作者 + Kimi 听感验收（切换流畅、无爆音）。

## 推进签字

### 进入 build 前:设计签字

- Codex: agree（2026-08-07 设计冻结，见「设计结论」）
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

**2026-08-07 冻结（Codex agree）**：

1. **BgmPlayer API 扩展（向后兼容，默认 0 = 现行为不变）**：
   - `play(asset, loop?, fadeInMs?)`——淡入时长；`stop(fadeOutMs?)`——淡出时长。
   - 换曲语义 = 旧曲 fade-out 后新曲 fade-in 的**串行近似 crossfade**：SpessaSynth 单
     Sequencer 不能并行两 MIDI（WorkletSynthesizer 单实例），真并行需双 synth 实例（成本
     高，v1 不做；留口注明）。
2. **实现机制**：runtime 建 master GainNode（`synth → gain → ctx.destination`，bgm.ts:80
   现状 synth 直连 destination）；fade = `gain.gain.linearRampToValueAtTime`；
   **requestSerial 抢占语义保持**——fade 期间新 play/stop 立即接管并取消旧 fade，杜绝
   「旧曲淡出后被新曲覆盖」的竞态。
3. **接入点（只接两处，不扩散）**：
   - 战斗进出场：startBattle 播 battleTrack（main.ts:1687-1688）与 restoreSceneMusic
     （main.ts:1473-1476）各带短过渡（v1 常量 300ms，听感验收可调）。
   - 场景切曲（main.ts:1080 plan.def.music）与 stopMusic 指令（main.ts:4049）**保持默认
     0**——不改变既有场景节奏与脚本语义，除非内容侧后续显式传 fade。
4. **分层口径（诚实）**：W6 ambience 是视觉滤镜（day/night multiply），**当前无环境音
   音频源** → v1 **不做环境音层**；BgmPlayer 接口留口（将来有 ambient 播放器时接混音
   总线）。对话期 ducking 属可选，v1 不做（避免与对话状态机耦合，如需另立小项）。
5. **稳定性不回归**：autoplay/resume 守卫、懒初始化、音乐开关记账、同曲不重启、
   CC91 混响锁（bgm.ts 头注既有纪律）全部保持。

### 已知风险

- 风险: 过渡时长破坏原版节奏感。
- 缓解: 默认 0 保持现行为；仅战斗进出场接 300ms 常量过渡，听感验收可调。
- 风险: SpessaSynth 单 Sequencer 不能并行两曲。
- 缓解: 串行近似（旧 fade-out → 新 fade-in）；真并行双 synth 留口注明。
- 风险: fade 期间抢占竞态（旧 fade 覆盖新曲）。
- 缓解: requestSerial 语义贯穿 fade（新 play/stop 立即取消旧 fade），单测覆盖。

### 主审立场

- Reviewer: Kimi（架构/听感）+ GLM（曲目矩阵）
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending

### 三方争议记录(按需)

- Codex: 2026-08-06 用户咨询议题 12 后开卡；硬切现状 + 缺分层为剩余缺口。
- Kimi: pending
- GLM: pending

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: pending；设计三签前不得开始实现。
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending（听感）
- 跳过的检查及原因: N/A

## 视觉验证记录(如适用)

- Visual Verification Owner: N/A（听感验收走作者 + Kimi）
- 验证方式: pending
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

- 2026-08-06 Codex: 开卡。议题 12 剩余 = 音频动态过渡/分层（硬切现状），统一控制器并入
  D14-2。
- 2026-08-07 Codex: 设计冻结并签 agree。BgmPlayer play/stop 加 fade 参数（默认 0）+
  master GainNode 串行近似 crossfade；只接战斗进出场 300ms 过渡；环境音层诚实口径
  （无音频源，v1 不做）、ducking 不做；requestSerial 贯穿 fade 防抢占竞态。

## 下一位 Agent 提示词

```text
接手任务: D12-1 音频动态过渡与分层
任务卡: docs/ops/tasks/D12-1-audio-transition-layering.md
当前状态: draft（build 准入 blocked；Codex 设计冻结并签 agree，见「设计结论」）
你的角色: Kimi 架构/听感主审；GLM 场景曲目覆盖矩阵主审
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡、packages/reforge/src/audio/bgm.ts、
  main.ts:1080/1473-1476/1687-1688/4049、engine-debt-audit A-1
已完成: Codex 设计冻结——BgmPlayer play/stop 加 fade 参数（默认 0）+ master GainNode
  串行近似 crossfade（单 Sequencer 不能并行两 MIDI）;只接战斗进出场 300ms 过渡;
  环境音层诚实口径（W6 无音频源,v1 不做）/ducking 不做;requestSerial 贯穿 fade 防抢占
请你做: Kimi 压测 fade 语义/抢占竞态/GainNode 接入与听感门禁;GLM 复核战斗进出场曲目
  矩阵（startBattle/restoreSceneMusic 全路径）与默认 0 兼容口径;冻结方案后 agree/counter
不要做: 不得修改实现文件；不得换 MIDI 合成器/音色库；不得破坏 autoplay/resume 守卫
输出要求: 更新设计签字、主审立场、争议处理和下一位提示词
```
