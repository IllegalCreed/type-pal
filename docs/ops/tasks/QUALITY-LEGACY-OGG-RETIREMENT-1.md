# QUALITY-LEGACY-OGG-RETIREMENT-1 — 未接入的旧OGG后端退役裁决

Status: draft
Phase: phase1
Capability: audio module cohesion and unused exports
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex
Visual Verification Owner: N/A
Visual Verification Timing: N/A（未接入路径退役；现用音乐/音量由直接回归验证）
Contributor: Codex
Branch: `codex/code-quality-3y`

## 目标

裁定是否删除已无生产入口的旧OGG后端导出、遗留音量空写及其三例专用测试。CODE74在裁决和必要处置前保持partial，不能由包绿或内部自洽的替身测试关闭。

## 范围

- 提案删除`audio.ts`的`createOggMusicBackend/setOggVolumeScale`和仅被它们使用的两个模块状态。
- 清理`bootstrap.ts`旧setter导入/调用；保留实际`musicSource.setVolume(v)`。
- 精简`audio.test.ts`两例OGG释放、GLM测试一例OGG音量；保留活跃manager/loop和无AudioContext的MIDI合同。
- 删除本轮刚提取、仅供上述OGG测试使用的共享替身；清理audio-volume/AVI中的旧注释指针。
- 不改MusicBackend/AudioManager类型、MIDI/RIX源选择、SFX、存档、资源或生成流程。

## 前提真值门

| 维度 | 当前事实 | 直接证据 |
|---|---|---|
| 原版/primary | SDLPal不决定本项目内部旧导出的去留；本任务无需重新考据音源机制 | 以当前TS调用图和接口边界为primary |
| 第一阶段 | 实际选择器仅midi/rix；OGG构造器只有定义和测试调用；bootstrap仍向其旧音量槽空写 | `shell/music-source.ts`的MusicSource、`bootstrap.ts`的createMusicSourceController及applyVolume、`audio.ts`对应导出/状态 |
| 第二阶段 | N/A；不是Reforge/编辑器音频合同变更 | packages/game私有包，不扩其它包 |
| 本任务目标 | 用户若批准，删除未接入旧路径；不恢复旧fallback | 未应用的七文件提案已保存于本轮shell证据工作目录，随父卡封存 |

最强替代解释：仓库外脚本可能直接调用这些导出。已核game包private且无exports/main入口、全packages/scripts符号引用和当前两模式工厂；这些事实不能证明不存在仓库外用户，因此导出删除仍交用户裁决。若提供现行外部consumer，本卡重定范围而不强删。

before→after：保留无生产入口的旧OGGAPI及三个测试，变为删除该API/空写/专用测试；现有MIDI/RIX选择与音量效果保持。用户裁决pending。

## 上下文锚点

- [pre94父卡](QUALITY-PRE94-RETROSPECTIVE-1.md)、CODE74和73–78逐文件索引。
- `CLAUDE.md`、长期代码质量的G简洁性/D复用/E真实caller要求。
- Codex原先先整理OGG测试而未核到底生产入口，属本轮漏项；新提取fixture不能作为保留旧路径的理由。
- 不得降低覆盖率规则或恢复无用测试以保数；若退役，按用户已给出的精确baseline/合同映射流程集中收口。

## 验收条件

用户若批准：实际活跃接口/函数体、MIDI/RIX音量调用保持；仅删除四个旧节点和空写。三个旧测试各有退役理由，余用例身份/断言保全。必要定向/相邻/typecheck及模块集中门通过，完整diff/原件/八维和只读快检配对。纯删除不伪造行为红例，不用测试调用冒充生产入口。

## 当前模式推进记录

- Codex核前提：已证当前调用图；仓库外consumer未知。
- Owner：Codex，唯一3y隔离树。
- build：只允许提案与证据；未删除上述导出。
- 用户裁决：pending；CODE74继续partial，四个audio/fixture文件不关闭。

## Draft: 设计与风险

七文件提案保留全部当前活动音乐接口，删三项只维护旧OGG实现的测试。本轮提取的fixture若随唯一consumer退役应直接删除，不为已投入工作制造保留理由。主要风险是仓库外未登记导出consumer。

## Build: 实现与自测

退役未应用。当前改动只含已完成的注释/测试补强和新fixture；其局部全绿不解决本卡G/E欠账。其余五张shell卡独立继续。

## Review: 审查与返工

CODE74不接收；原生产caller/测试相关性结论按本卡纠正。实际MIDI/RIX/loop合同的有效证据保留，不全盘撤回。

## 用户验收

待决定删除或提供当前外部consumer，不改变其它卡授权。

## 交接日志

- 2026-10-21 Codex：复核真实工厂/音量线和全仓引用，固定七文件未应用提案，暂停74关闭。Next：用户裁决后再准入。

## 下一位 Agent 提示词

无下一位Agent；Codex继续父卡其它范围。不得把本提案当成已经删除或已经验收。
