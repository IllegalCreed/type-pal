# game-shell-audio(shell 音频/io 八小件)八维复审批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 pre-94 foundation 模块 9 批 19(shell 模块批 1)的作者八维复审回执:Coding Owner GLM,基线 origin/codex/code-quality-3y @ 53db76bbbb(候选线 46+ 提交)。八文件全文读毕:audio-volume 55/rix-worklet 54/audio-rix 91/fetch-retry 97/music-source 115/audio-midi 242/precache-client 90/bootstrap-resources 67。零整改批(B–H 八维全部通过;零代码/注释改动,工作树零 diff)。Codex 当前裁定(2026-10-19):本页保留作者阶段证据,未获整包/全维收口验收。证据原件即下方逐字节保全的固定main源。

## 来源与输入

零整改依据:B 维注释全部带真值/事件锚——fetch-retry 的 nginx keepalive_requests 1000 GOAWAY 根因考证(2026-06-13 user 报)与 retry 先于 boot-loading 的装载顺序约束(还原后存活);audio-midi 的 secure-context 提示分流(局域网 IP 访问"有音效没 BGM"归因)、RIFF 魔数守卫(SPA fallback 识破)、skipToFirstNoteOn=false 循环间隔论证、parser 串行化理由;precache-client 的 _pendingStart 补发机制(SW ready 早于 onPlayable 的实测坑);music-source 的 generation token 竞态防护;无孤儿 docblock、无过时实现状态注、无错挂。A/C/D 维:三后端(rix/midi/ogg 经 audio.ts)+music-source 控制器切换层各持 generation/abort 竞态防护一致;controller 只管意图持久化、applyVolume 注入输出缩放,职责切分清晰。返工范围与逐文件依据见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 断言与业务 oracle

定向回归 [directed.json](directed.json):13 个测试文件(audio-volume×2/rix-worklet/audio-rix/fetch-retry×4/music-source/audio-midi/precache-client×2/bootstrap-resources),26 套件 72/72 全 passed、0 failed suites、0 失败消息、snapshot 全零、success=true(startTime 2026-10-19T00:58:21.733Z);fetch-retry 四件套 26 例(boundaries 11/cancellation 7/main 6/leaves 2)是覆盖失败臂最厚的一族,断言实样如『init.method 优先于 Request.method:POST 覆盖 GET,不重试 503』『drains an old parser failure before submitting the next song』。补充门:tsc --noEmit -p packages/game exit 0;工作树零 diff(diff-check 天然干净)。因本批零改动,绿的含义是存量行为保持,不证新修复。

## 结果

批内结论:八小件零缺陷,零整改;shell 模块开工。登记项无新增。历史时点回执保持原状,本页治理不产生新执行结果。

## 限制与复核

未重跑任何测试/typecheck;26 套件为 vitest 套件字段,与 (文件,根 describe) 对 13、文件数 13 三口径分轴;零整改批的绿不构成判别力新证(断言判别力属各测试族建立期)。候选待 Owner 非作者接收;失效条件:八文件或其测试族身份变化时本回执降级为历史记录。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1946B / SHA-256 4da57fded4134f58d6dc25277edf6b6ba39d8bc4140380526e22c573b7f550f6；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# game-shell-audio(shell 音频/io 八小件)八维复审批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

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
```
<!-- incremental-original-source:end -->
