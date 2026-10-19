# game-shell-audio(shell 音频/io 八小件)八维复审批

- 批次:pre-94 foundation 模块 9 批 19(shell 模块批 1)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 46+ 提交)
- Coding Owner:GLM;八文件全文读毕(audio-volume 55/rix-worklet 54/audio-rix 91/fetch-retry 97/music-source 115/audio-midi 242/precache-client 90/bootstrap-resources 67)
- **零整改批**(B–H 八维全部通过;零代码/注释改动,工作树零 diff)

## 零整改依据

- **B 注释**:全部带真值/事件锚 — fetch-retry 的 nginx keepalive_requests 1000 GOAWAY 根因考证(2026-06-13 user 报)+ 装载顺序约束(retry 先于 boot-loading 才能在还原后存活);audio-midi 的 secure-context 提示分流(局域网 IP 访问"有音效没 BGM"归因)、RIFF 魔数守卫(SPA fallback 识破)、skipToFirstNoteOn=false 循环间隔论证、parser 串行化理由;precache-client 的 \_pendingStart 补发机制(SW ready 早于 onPlayable 的实测坑);music-source 的 generation token 竞态防护。无孤儿 docblock、无过时实现状态注、无错挂。
- **A/C/D**:三后端(rix/midi/ogg 经 audio.ts)+ music-source 控制器切换层各持 generation/abort 竞态防护一致;controller 只管意图持久化、applyVolume 注入输出缩放,职责切分清晰。
- **E**:26 套件 72/72 全绿(见下),各文件测试族完整覆盖失败臂(RIFF 守臂/abort 臂/补发臂)。

## 验证

- 定向 13 文件(audio-volume×2/rix-worklet/audio-rix/fetch-retry×4/music-source/audio-midi/precache-client×2/bootstrap-resources):**26 套件 72/72,0 failed suites** → [directed.json](directed.json)
- `tsc --noEmit -p packages/game`:exit 0;工作树零 diff(diff-check 天然干净)

## 登记项

无新增。
