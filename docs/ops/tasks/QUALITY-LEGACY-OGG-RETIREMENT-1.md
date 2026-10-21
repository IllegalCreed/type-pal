# QUALITY-LEGACY-OGG-RETIREMENT-1 — 未接入的旧OGG后端退役

Status: done
Phase: phase1
Capability: audio module cohesion and unused exports
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex
Visual Verification Owner: N/A
Visual Verification Timing: N/A（未接入路径退役；现用音乐/音量由直接回归验证）
Contributor: Codex
Branch: `codex/code-quality-3y`

## 目标与用户裁决

用户2026-10-21明确批准“删除未使用的旧路径（推荐）”。删除无生产入口的旧OGG导出、bootstrap音量空写及三个专测；现用MIDI/RIX、SFX和音量合同保持。CODE74不因包级全绿自动关闭。

## 范围与准入

Codex build allowed；同一隔离3y树、唯一Coding Owner为Codex。`audio.ts`删除`createOggMusicBackend/setOggVolumeScale`及两个专属模块状态；bootstrap只删对应导入/调用，保留`musicSource.setVolume`。删除两例OGG释放、一例OGG音量及唯一测试替身，修正audio-volume/AVI旧注释。MusicBackend/AudioManager类型与活动函数体不改。

本卡D/G补缺：现有纯`musicUrl`只被测试使用，而MIDI重复相同拼接。由实际MIDI加载caller复用该函数，单独纯重构提交；原A/B/A接线测试增加三个独立literal URL断言，12个MIDI测试身份不变。无新抽象、依赖环或顶层音频初始化。

## 前提真值门

| 维度 | 真值与边界 |
|---|---|
| primary | 当前TS调用图决定内部导出去留，SDLPal不决定本项目旧API是否保留。 |
| 第一阶段 | 当前选择器仅MIDI/RIX；OGG构造器只有定义/测试caller，旧setter只有bootstrap空写。game包private、无exports/main；未宣称证明不存在仓库外消费者，删除依据为用户明确裁决。 |
| 第二阶段 | N/A；不改Reforge/编辑器。 |

最初七文件提案按固定source SHA应用。早先把OGG测试视作生产相关及新提取fixture的结论撤回；不为保留投入工作或覆盖率而留下死路径。

## Build: 实现与自测

已应用退役；活跃音频相邻八文件52/52，纯URL复用后受影响四文件39/39；game typecheck与局部Biome零诊断。保留原18个manager/pure cases和1个无WebAudio MIDI边界，旧22→现19的三个身份逐项登记。三个退役不伪造行为红例。

退役账登记本次用户授权；精确快照规则不改。替换GLM该文件旧3→2 live快照为当前2→1，旧授权条目原文存回执及Git。批准账工具59/59。两次临时登记脚本错误均发生在写入前，首次完整raw未保存，只保留同源复现raw；提前跑的旧工具测试不授新批准信用，真正登记后59例另采。

## Review: 审查与剩余项

复用GLM逐例/八维、DM29/L47指定反控及原生SFX证据；Codex补生产工厂、删除影响和活动函数保持证明。统一check/ratchet/protected在本模块收尾集中通过；官方基线按精确旧快照/14源码固定实测调整，比较函数与规则未放宽。听觉全流程不是本次新测承诺，当前RIX/MIDI源选择和volume由独立回归支撑。

## 用户验收

旧路径删除已获用户批准；无需再问。若未来出现仓库外消费者，属新接口需求，不恢复无用fallback。

## 交接日志

- 2026-10-21只读发现：OGG无生产入口，固定未应用提案并等待导出删除裁决。
- 2026-10-21批准后：删除旧路径/三专测/唯一fixture；活跃回归保持，纯URL复用另分提交。完整身份/原件/八维及集中门随父卡当前输入音频回执封存。

## 下一位 Agent 提示词

Codex集中完成输入/音频模块门与同一3y发布；不用旧测试数/旧授权头冒充当前验收，不扩94–102。

## 2026-10-21 输入音频模块收口

本卡获批范围整改与CODE74三文件八维收口；完整原始失败/绿结果、命令/诊断、精确baseline和只读快检见父卡input-audio-closeout.json。Git发布另核实际ancestry，不由本段推定。
