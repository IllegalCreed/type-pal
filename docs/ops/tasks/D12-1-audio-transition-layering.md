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
- Kimi: **agree**（2026-08-07，架构/听感主审：fade 语义/抢占竞态/GainNode 接入逐项
  压测，附 K1-K6 build 验收钉，见「Kimi 设计主审」；G1-G3 附议）
- GLM: **agree（2026-08-07，附 G1-G3 build 准入钉，见「GLM 设计准入复审」）**
- counter / 分歧处理: 无 counter；G1（胜利曲过渡接入）为 build 前覆盖口径对齐项，Kimi
  独立确认并补 lose 路径（K6）
- 缺签豁免: N/A
- build 准入结论: **allowed**（2026-08-07，三方 agree 齐；G1-G3 + K1-K6 为 build 验收钉，
  不阻塞准入）

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
- 结论: **GLM agree（附 G1-G3）+ Kimi agree（附 K1-K6）**
- 必改项: 见 G1-G3 + K1-K6（build 准入钉）
- 是否建议进入 build: **双方同意进入 build（钉子均为验收钉，不阻塞准入）**

### 三方争议记录(按需)

- Codex: 2026-08-06 用户咨询议题 12 后开卡；硬切现状 + 缺分层为剩余缺口。
- Kimi: **agree（2026-08-07，架构/听感主审）**。详见「Kimi 设计主审」。
- GLM: **agree（2026-08-07，场景曲目覆盖矩阵主审）**。详见「GLM 设计准入复审」。

#### Kimi 设计主审（2026-08-07，架构/听感）：**agree（附 K1-K6 build 准入钉）**

**方法**：只读独立压测（非对 G1-G3 打勾）；一手读 bgm.ts 全文（209 行）、
main.ts 全部音乐切换点（:1076-1082 场景曲、:1470-1478 restoreSceneMusic、
:1686-1688 startBattle、:1774-1778 胜利曲、:1881 战后恢复、:4044-4052 读档恢复）。
未修改实现。

**独立确认（附议 GLM）**：

1. **G1 胜利曲漏接成立**：main.ts:1777 `bgm.play(victoryRole, false)` 是战斗曲→胜利曲
   硬切点；战斗音乐生命周期 = 场景曲→(:1687)战斗曲→(:1777)胜利曲→(:1881)场景曲，
   「只接两处」漏中间一环。build 前必须对齐口径（接 300ms 或显式注明例外）。
2. **G2/G3** 附议：fade 抢占单测、ctx 生命周期（suspend 停 currentTime、fade 末尾
   pause 归零曲、fadeInMs=0 快捷路径不调度 ramp）为实现期必落。
3. 默认 0 兼容、串行 crossfade 诚实收敛、稳定性纪律（autoplay/懒初始化/开关记账/
   同曲不重启/CC91 锁）全部成立。

**K 钉（build 准入必落，增量于 G1-G3，不阻塞 agree）**：

- **K1（fade 控制通道接口归属）**：GainNode 由 runtime adapter 在 initialize 建
  （`synth → gain → ctx.destination`，bgm.ts:76 现状直连）；fade 操作通道挂
  BgmSequencerAdapter 最小方法（建议 `fadeTo(value, ms)` + `cancelFade()`），
  `cancelScheduledValues + setValueAtTime(当前值)` 封装在 adapter 内——player 层
  不碰 AudioParam。假 adapter 记录调用序列供 G2 单测断言（现有 createBgmPlayerWithRuntime
  注入模式延伸）。
- **K2（抢占竞态补两点，G2 外延）**：(a) fade-out **完成回调**（loadNewSongList 新曲 /
  末尾 pause）必须过 `isCurrent(serial)` 门——否则旧 fade 完成后误 pause 新曲；
  (b) 新 play/stop 接管时 ramp 起点 = **当前 gain 值**（cancelScheduledValues 后
  setValueAtTime(gain.value)），不得从 0/1 突变——突变即爆音点。
- **K3（记账含 fade）**：`last` 只记 `{asset, loop}`；autoplay 锁 resume 补播与懒初始化
  尾部补播都走 `playCurrent()`——fadeInMs 在补播路径丢失（补播变硬切）。二选一：
  last 扩记 fadeInMs（推荐，记账一致），或显式设计「补播一律硬切」并在 bgm.ts 注释
  写清。同曲不重启守卫只看 asset，不受影响。
- **K4（战斗进场听感时序）**：串行 fade-out(300)+fade-in(300) = 战斗曲晚 ~600ms 进场
  （原版硬切即时）。v1 可接受，但 300ms 常量必须集中一处定义（不得散在各调用点）；
  听感验收若嫌慢允许改 overlap（fade-in 提前启动），但 overlap 改变 serial 语义须补测。
- **K5（同曲守卫 × fade 窗口竞态，新发现）**：现状同曲守卫读 `playing`（已播成的曲），
  doPlay 异步尾部才赋值——无 fade 时窗口仅一次 readBytes；fade 把窗口拉长到 300ms+。
  窗口内 `play(旧曲)`：playing 仍是旧曲 → 命中守卫 → 只改 last、**不 serial++** →
  进行中的换曲不被取消 → playing=新曲但 last=旧曲，记账/播放分裂。钉：守卫命中时
  若存在目标 ≠ 本曲的进行中请求，必须 serial++ 取消之（收敛「留在本曲」）；或守卫基准
  从 playing 改为 last。单测：fade 换曲 A→B 期间 play(A) → B 不播、A 续播、记账一致。
- **K6（lose/gameOver 路径，补 G1 矩阵）**：main.ts:1881 `result !== 'lose'` 才
  restoreSceneMusic——战败进 gameOver 流程的音乐切换点不在 GLM 矩阵内。build 前把
  lose/gameOver 音乐路径列入曲目矩阵（接不接过渡显式注明），避免「败北硬切」漏审。

**听感验收门禁（本席，build 后执行）**：浏览器实测 PAL——进/出战斗无爆音、无半截曲；
默认路径（场景切曲 :1080、读档恢复 :4049）零变化；音乐开关即时；resume/懒初始化补播
行为符合 K3 定稿。机读辅助：假 adapter 断言 ramp 调用序列（G2 单测）。

**结论**：**agree**。架构方向（GainNode 串行近似 + requestSerial 贯穿 + 默认 0 兼容）
成立；K1-K6 为 build 验收钉，不阻塞准入。

**GLM 提示词四问裁定**：

1. **ramp 曲线（linear vs exponential）**：人耳响度感知对数，linear fade-out 听感
   「前快后拖」。但 300ms 短窗内差异小，且 exponentialRampToValueAtTime 不能达 0
   （需 0.001 再补 setValueAtTime(0)），复杂度不值。**裁定：v1 linear 保持**；
   听感验收若觉得淡出拖尾，改 `setTargetAtTime`（timeConstant≈0.09）一条线即可，
   不属于 build 钉。
2. **抢占接管时机**：立即接管（不等旧 fade-out 完成）——与设计「杜绝旧曲淡出后被
   新曲覆盖」意图一致；等完成会引入可感知延迟（fade 中连切场景会卡拍）。K2(b) 的
   「从当前 gain 值起 ramp」保证立即接管也无爆音。
3. **G1 胜利曲裁定：接**（同 300ms 常量）。胜利曲切换发生在结算屏，战斗曲→胜利曲
   硬切是全链最刺耳一环；「战斗进出场无硬切爆音」验收语义应覆盖战斗音乐全生命周期。
   与 GLM 建议一致，build 直接落地，不留例外。
4. **G3**：附议为实现期钉，无补充。

**边界**：本 agree 只准入 D12-1 build，不代表 done。

#### GLM 设计准入复审（2026-08-07）：**agree（附 G1-G3 build 准入钉）**

**方法**：只读审查；一手核实 bgm.ts（play/stop/requestSerial/isCurrent 现状 + synth 直连 destination）、
main.ts 全部音乐切换接入点（grep battleTrack/restoreSceneMusic/playMusic/stopMusic/victoryRole/
plan.def.music）、A-1 审计口径。未修改实现。

**正面核实（设计成立）**

1. **bgm.ts 现状对齐设计描述** ✅：`play(asset, loop=true)` / `stop()` 无 fade 参数、无 GainNode
   （synth → ctx.destination 直连）；`requestSerial` 抢占机制已在（每次 play/stop/setEnabled `++serial`，
   `isCurrent(serial,asset,loop)` 检查防 stale callback 覆盖）。设计卡"requestSerial 贯穿 fade 防抢占"
   是在既有机制上扩展，方向正确——fade 期间新 play/stop 仍 `++serial` 取消旧 fade 的 ramp。
2. **默认 0 向后兼容成立** ✅：`play(asset, loop?, fadeInMs=0)` / `stop(fadeOutMs=0)` 默认值 = 现行为
   （立即 play/pause，无 ramp）。场景切曲（main.ts:1080-1081）、playMusic/stopMusic 脚本指令
   （1758/2317/2322）保持默认 0 = 不改既有场景节奏与脚本语义，口径正确。
3. **串行近似 crossfade 是诚实收敛** ✅：SpessaSynth 单 WorkletSynthesizer 不能并行两 MIDI
   （卡已注明）；"旧 fade-out → 新 fade-in"串行是单 synth 下的合理近似，真并行双 synth 留口。
   不冒充真 crossfade（会有 fade-out 末尾到 fade-in 开头的短暂静默/断点），口径诚实。
4. **稳定性不回归** ✅：autoplay/resume 守卫（resume() suspended 检查 + resuming 锁）、懒初始化
   （ensureInit 首播才拉合成器）、音乐开关记账（setEnabled 关时 last 保留、开时续播）、同曲不重启
   （play 内 `playing===asset` 短路）、CC91 混响锁——设计明确全部保持；fade/GainNode 是加层不动这些。
5. **范围纪律** ✅：环境音层诚实口径（W6 ambience 是视觉滤镜无音频源 → v1 不做）、ducking 不做
   （避免对话状态机耦合）、不换 synth/音色库、不改 asset/schema → 无 schema/save/migration 风险，常规迭代。

**G 钉（build 准入必落，非 agree 阻塞）**

- **G1（胜利曲过渡接入——覆盖矩阵缺口，build 前对齐）**：设计卡第 3 条说"只接两处（startBattle 1687 +
  restoreSceneMusic 1473）"，但 main.ts:1777 `bgm.play(victoryRole, false)` 是**战斗结算阶段的战斗曲→胜利曲
  切换**（buildSettlement 内，结算屏期间播，之后 1881 restoreSceneMusic 才回场景曲）。战斗音乐完整生命周期
  = 场景曲 →(1687)战斗曲 →(1777)胜利曲 →(1881)场景曲。若 1777 保持默认 0 = **战斗曲→胜利曲仍硬切**，
  与"战斗进出场过渡无硬切爆音"的验收条件（line 53）口径不一致。**实现前必须明确**：1777 胜利曲是否接过渡？
  建议接（同 300ms 或更短，胜利时刻硬切更刺耳）；或卡内明确"胜利曲切换允许硬切（结算屏是非战斗态）"并
  在验收条件注明例外。**这是覆盖矩阵口径差，必须在 build 前对齐**，否则"战斗进出场无硬切"会落空。
- **G2（fade 抢占单测必落）**：requestSerial 抢占语义贯穿 fade 是设计的核心防竞态机制。实现必须加单测：
  fade-out 期间新 play → 旧 fade ramp 立即取消、新曲接管（不出现"旧曲淡完才播新曲"的延迟，也不出现
  "旧曲淡出末尾被新曲 ramp 覆盖导致爆音"）；fade 期间 stop → 干净静默；fade 期间 setEnabled(false) →
  不残留 ramp。无 AudioContext 真音频的单测环境下，用 mock GainNode/gain.linearRampToValueAtTime
  断言调用序列 + requestSerial 自增即可。
- **G3（fade 时长与 AudioContext 生命周期）**：fade 用 `gain.gain.linearRampToValueAtTime`，须确认
  (a) fade 进行中 AudioContext 被 suspend（页签后台/可见性）时 ramp 行为——线性 ramp 依赖 ctx.currentTime，
  suspend 时 currentTime 不进，fade 暂停符合预期但要核实不卡死；(b) fade-out 末尾 gain 归零后是否
  disconnect/pause synth（避免零增益仍在跑 MIDI 浪费 CPU）；(c) fadeInMs=0 时是否走"立即全增益"快捷路径
  （不调度 0ms ramp，避免 ramp 调度开销/边界）。实现期核实并在 bgm.test.ts 钉。

**结论**：设计方向干净、默认 0 兼容、串行 crossfade 诚实收敛、稳定性纪律保持，无 schema/save/migration 风险。
**agree**。G1（1777 胜利曲过渡接入口径）、G2（fade 抢占单测）、G3（fade 时长/ctx 生命周期/disconnect）
为 build 准入必落钉——其中 **G1 必须在动手实现前对齐覆盖口径**（"只接两处"漏了 1777），其余为实现期验收钉。
建议进入 build。

**边界**：本 agree 只准入 D12-1 build。不代表 done；环境音层/ducking/真并行 crossfade 明确 v1 不做；
统一多媒体控制器属 D14-2。

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件:
  - `packages/reforge/src/audio/bgm.ts`（BgmPlayer.play(asset, loop?, fadeInMs?) /
    stop(fadeOutMs?)；BgmSequencerAdapter 增 fadeTo/cancelFade（adapter 封装 AudioParam）；
    runtime initialize 建 master GainNode（synth→gain→destination）；串行换曲 fade-out →
    isCurrent 门 → 换曲 + fade-in；K5 inflightTarget 取消换向其他曲的进行中请求；
    K3 last 记 fadeInMs；G3c fadeInMs=0 快捷回全增益；G2 setEnabled(false) cancelFade+归零；
    导出 BATTLE_MUSIC_TRANSITION_MS=300）
  - `packages/reforge/src/main.ts`（战斗进出场三处接过渡：startBattle 播战斗曲 /
    restoreSceneMusic 回场景曲 / 胜利曲（G1 裁定接））
  - `packages/reforge/src/audio/bgm.test.ts`（假 adapter 补 fadeTo/cancelFade + 7 条新测：
    串行换曲、K2a 接管、K2b stop 接管、K5 同曲守卫×窗口、K3 补播 fade、G2 关音乐、
    G3c 快捷路径）
- 实现摘要: 三方签后完成。K1 fade 通道走 adapter（player 层不碰 AudioParam）；
  K2(a) fade-out 完成回调过 isCurrent 门、(b) fadeTo 内 cancelScheduledValues +
  setValueAtTime(当前值) 起 ramp 防爆音；K3 last 记 fadeInMs,补播仍走 fade-in；
  K4 300ms 常量集中一处(BATTLE_MUSIC_TRANSITION_MS)；K5 playing 基准守卫 +
  inflightTarget 取消换向请求(旧曲不重载续播)；K6 lose/gameOver 路径入矩阵(战败曲
  延续至渐红→loadLastSave 硬切档内曲,读档语义硬切合理,注明例外不接过渡)；
  G1 胜利曲接同常量;G2 抢占单测 7 条;G3(a) suspend 期间 ramp 暂停(依赖 ctx.currentTime,
  无死锁,注释注明)、(b) fade-out 完成 pause synth、(c) fadeInMs=0 快捷路径。
- 运行命令:
  - `pnpm --filter @type-pal/reforge check`（807 通过,bgm 10 条含 7 新测）
  - `pnpm --filter @type-pal/content check`（400 通过）
  - `pnpm --filter @type-pal/editor typecheck` 通过
- 浏览器 / 手工检查: pending（听感验收——Kimi:进/出战斗无爆音、无半截曲;默认路径零变化;
  音乐开关即时;resume/懒初始化补播行为符合 K3）
- 跳过的检查及原因: 听感验收(需要真实浏览器 + 音频)按协议由 Kimi 承担,Codex 自证到
  类型 + 单测层;G3(a) suspend 行为仅代码审查 + 注释注明,未真机测。

### 钉逐项对照(G1-G3/K1-K6)

- G1 胜利曲: ✅ 1777 bgm.play(victoryRole, false, 300),战斗音乐全链(场景→战斗→胜利→场景)
  无硬切。
- G2 抢占单测: ✅ 7 条新测(K2a/K2b/K5/关音乐/快捷路径/串行/补播)。
- G3 ctx 生命周期: ✅ (a) suspend 暂停 ramp 依赖 ctx.currentTime 已注释;(b) fade-out 完成
  pause synth;(c) fadeInMs=0 快捷回全增益(fadeTo(1,0))。
- K1 adapter 封装: ✅ BgmSequencerAdapter.fadeTo/cancelFade,player 层不碰 AudioParam。
- K2 抢占补点: ✅ (a) fade-out 完成回调过 isCurrent 门;(b) fadeTo 从当前 gain 起 ramp。
- K3 记账含 fade: ✅ last={asset,loop,fadeInMs},playCurrent/补播走同 fade。
- K4 常量集中: ✅ BATTLE_MUSIC_TRANSITION_MS=300 一处导出,三调用点统一引用。
- K5 同曲守卫×窗口: ✅ playing 守卫 + inflightTarget 取消换向请求,单测证 B 不播 A 续播。
- K6 lose 路径: ✅ 矩阵注明——战败曲延续至 gameOver 渐红→loadLastSave 硬切档内曲
  (读档=新语境,硬切合理,显式例外不接过渡)。

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
- 2026-08-07 GLM（场景曲目覆盖矩阵主审）: 签 **agree（附 G1-G3）**——G1 胜利曲 1777
  漏接（build 前对齐）、G2 fade 抢占单测、G3 ctx 生命周期。详见「GLM 设计准入复审」。
- 2026-08-07 Kimi（架构/听感主审）: 签 **agree（附 K1-K6）**——三方 agree 齐，
  **build 准入 allowed**。K1 fade 通道接口归属（adapter 封装 AudioParam）、K2 抢占补
  完成回调 isCurrent 门 + 当前值起 ramp、K3 last 记账带 fadeInMs（补播不丢 fade）、
- 2026-08-07 Codex: 实现完成并自证——reforge 807（bgm 10 条含 7 新测）/ content 400 /
  editor typecheck 全绿;G1-G3/K1-K6 逐项落地(见 Build 节钉对照);K6 lose 路径显式例外
  注明。待 Kimi 听感验收(浏览器实测)后进 review。
  K4 300ms 常量集中一处、K5 同曲守卫 × fade 窗口竞态（playing/last 分裂，新发现）、
  K6 lose/gameOver 音乐路径补入矩阵。GLM 四问裁定：linear ramp 保持 / 立即接管 /
  G1 胜利曲接过渡 / G3 附议。详见「Kimi 设计主审」。

## 下一位 Agent 提示词

```text
接手任务: D12-1 音频动态过渡与分层实现（三方 agree 齐,build allowed）
任务卡: docs/ops/tasks/D12-1-audio-transition-layering.md
当前状态: draft → build 准入 allowed(Codex/GLM/Kimi 三方 agree,2026-08-07)。
你的角色: Coding Owner——build 阶段唯一实现文件修改者。
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡全文(设计结论 + GLM G1-G3 +
  Kimi K1-K6 + 四问裁定);packages/reforge/src/audio/bgm.ts 全文、
  main.ts:1076-1082/1470-1478/1686-1688/1774-1778/1881/4044-4052。
必落钉(build 验收逐项核):
  - K1: GainNode 由 runtime adapter initialize 建(synth→gain→destination);
    fadeTo/cancelFade 挂 BgmSequencerAdapter;AudioParam 操作封装在 adapter 内;
    gain 初值 1.0(默认 0 fade = 现行为零变化)。
  - G2+K2: fade 抢占单测——fade 中新 play/stop/setEnabled(false) 各一条;
    fade 完成回调过 isCurrent(serial);接管 ramp 从当前 gain 值起(cancelScheduledValues
    + setValueAtTime),不得 0/1 突变。
  - K3: last 扩记 fadeInMs(autoplay resume/懒初始化补播带原 fade),或显式注释
    「补播一律硬切」——二选一,写清。
  - K5: 同曲守卫 × fade 窗口——守卫命中且有异曲进行中请求时 serial++ 取消之;
    单测:A→B fade 期间 play(A) → B 不播、A 续播、记账一致。
  - G1(已裁定接)+K4: 战斗全链 300ms——startBattle(:1687)、胜利曲(:1777)、
    restoreSceneMusic(:1473) 三处;常量集中一处定义。K6: lose/gameOver 音乐路径
    列入矩阵并注明接/不接。
  - G3: fade 中 ctx suspend 不卡死;fade-out 末尾 gain 归零后 pause synth;
    fadeInMs=0 走快捷路径不调度 ramp。
听感验收(Kimi 席,build 后): 浏览器实测战斗进出场无爆音/无半截曲;场景切曲与读档
  恢复零变化;开关即时;补播行为符合 K3 定稿。
纪律: 不换 synth/音色库;不破坏 autoplay/resume/懒初始化/开关记账/同曲不重启/CC91 锁;
  环境音层/ducking/真并行不做(v1)。pnpm check 全绿 + bgm.test.ts 新测覆盖 G2/K5。
验收输出: 实现摘要 + 钉逐项对照 + 测试证据;回卡交 GLM/Kimi review 签字。
```

```text
接手任务: D12-1 音频动态过渡与分层（Kimi 架构/听感主审）——已执行完毕,勿再执行
说明: 本提示词为历史记录,Kimi 已于 2026-08-07 签 agree(K1-K6 + 四问裁定),
  三方 agree 齐,build 准入 allowed。请改用上方实现提示词。
```

```text
接手任务: D12-1 音频动态过渡与分层——实现完成,交 Kimi 听感验收 + 双审(当前生效)
任务卡: docs/ops/tasks/D12-1-audio-transition-layering.md
当前状态: build(实现完成,提交 `0187ea76`;reforge 807 / content 400 / editor typecheck 全绿)。
你的角色: Kimi 听感验收(浏览器实测)+ Kimi/GLM review 签字;不是再改实现。
已实现(Codex): BgmPlayer play/stop fade 参数 + master GainNode 串行 crossfade;
  战斗全链(场景→战斗→胜利→场景)300ms 过渡;K1-K6/G1-G3 全落(见 Build 节钉对照)。
请你做: 浏览器实测(PAL)进/出战斗无爆音、无半截曲;场景切曲/读档恢复零变化;
  音乐开关即时;resume/懒初始化补播符合 K3;done 前审查签字表签 accept/counter。
不要做: 不得修改实现文件(必改项以 counter + 返工项写卡)。
输出要求: 更新审查签字、听感/视觉验证记录、下一位提示词(无则写「等待用户验收」)。
```
