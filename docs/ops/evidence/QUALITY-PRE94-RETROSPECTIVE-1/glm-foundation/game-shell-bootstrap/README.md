# game-shell-bootstrap(bootstrap.ts + audio.ts)八维复审批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 pre-94 foundation 模块 9 批 22(shell 模块收口批)的作者八维复审回执:Coding Owner GLM,基线 origin/codex/code-quality-3y @ 53db76bbbb(候选线 50+ 提交)。bootstrap.ts 1934 行与 audio.ts 323 行全文读毕。整改类型:纯注释 3 处(B 维,bootstrap.ts 一文件),零代码改动。Codex 当前裁定(2026-10-19):本页保留作者阶段证据,未获整包/全维收口验收。证据原件即下方逐字节保全的固定main源。

## 来源与输入

整改清单:①bootstrap.ts L356-358 "M4 简版 fallback 3…M5 真做时按 PlayerRoles[leaderRole].walkFrames 取"未来注过时——present.getPartyWalkFrames(present.ts:113-124)已实现 per-role 真值链(runtime→playerRoles→兜底),改述现架构:本值仅为 ctx 兜底,真值链在 present。②L609-611 "M5 把 sprite 数据装这里,present 切到从 sceneAssets 取"未来注——该计划未实施且 closure 共享 npcSprites map 已是定案架构(present 全读 ctx.npcSprites),改"定案的架构,不再计划切换"。③L1860 "其余 boot 资源(~3200 个请求)"过时——2026-06-22 资源管线优化后 ~800(boot-loading.ts EXPECTED_BOOT_REQUESTS=810 自记,含实测校准史),改"~800(优化后;曾 ~3200)"。零整改面:audio.ts 323 行(L46 SFX 同号去重 sound.c:769-772 lastSFX 三臂/L47 真实 loop 补播/DM29 战斗入场静默序/OGG release 释放论证);bootstrap.ts 其余 1931 行(handler 注入族 setSceneLoader/setMapReloader/…、loadSceneCommon 双路径 fromSavedGame 边界全集 DM25 屏波清/0x6D override/读档 palette 黑屏 guard/DH7 解毒/L6/L7 复位、DOS 结局 ending.c:420-511 逐 beat、playDosOpening M15 FBP 0x26/0x27、H1 新游戏复位)——真值锚密度全仓最高。返工范围与逐文件依据见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 断言与业务 oracle

body-invariance(method=typescript@6.0.3 parse+createPrinter removeComments,标题 <TITLE> 掩码):bootstrap.ts 去注释打印 53291 字节,printedSha256 ca49273d…两侧一致,titleCallCount 0/0,printedEqual=true、allEqual=true——3 处注释改写零可执行字节变化,见 [body-invariance.json](body-invariance.json)。定向回归 [directed.json](directed.json):8 个测试文件(bootstrap×5:bootstrap-audio 1/bootstrap-load 1/bootstrap-resources.grok-mid-1 9/bootstrap.glm-next-wave 2/shell-bootstrap.glm-shell 6;audio×3:audio.test 17/audio.glm-phase1-leaves 2/audio-volume 3),23 套件 41/41 全 passed、0 failed suites、snapshot 全零、success=true(startTime 2026-10-19T01:03:01.320Z);audio-volume.test.ts(3 例)与 shell-audio 批回执为同一文件复跑。补充门:tsc exit 0;scoped biome 0 诊断;git diff --check 干净。

## 结果

批内结论:3 处未来注/过时注修正成立,audio.ts 零缺陷;shell 模块全部收口(audio/io+players+loop+bootstrap=22 文件,三零整改批)。登记项(交 Codex)1 项:SceneAssets.npcSprites 接口字段定案为不装数据(bootstrap 传空 map 满足接口)——schema 清理候选(批22新增)。历史时点回执保持原状。

## 限制与复核

未重跑任何测试/证明脚本;bootstrap-resources.grok-mid-1(9 例)为 grok-mid-1 代族,与 shell-audio 批 bootstrap-resources.test.ts(3 例)为不同测试文件;41 例的薄覆盖(bootstrap-load/bootstrap-audio 各 1 例)是大文件测试族拆分后的定向口径,不等于 bootstrap.ts 全量判别力。候选待 Owner 非作者接收;失效条件:两文件或测试族身份变化时重出证据。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2769B / SHA-256 6606a0f7b30f006dc62d9a2d8b3a46ecd96d082f75b5885ddd49fbcbc4187fd2；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# game-shell-bootstrap(bootstrap.ts + audio.ts)八维复审批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

- 批次:pre-94 foundation 模块 9 批 22(shell 模块收口批)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 50+ 提交)
- Coding Owner:GLM;bootstrap.ts 1934 行全文读毕 + audio.ts 323 行全文读毕
- 整改类型:纯注释 3 处(B 维,bootstrap.ts 一文件),零代码改动 — body-invariance `allEqual: true`

## 整改清单

| # | 位置 | 问题 | 修正 |
|---|---|---|---|
| 1 | bootstrap.ts L356-358 | "M4 简版 fallback 3…M5 真做时按 PlayerRoles[leaderRole].walkFrames 取"未来注过时 — present.getPartyWalkFrames(present.ts:113-124)已实现 per-role 真值链(runtime → playerRoles → 兜底) | 改述现架构:本值仅为 ctx 兜底,真值链在 present |
| 2 | bootstrap.ts L609-611 | "M5 把 sprite 数据装这里,present 切到从 sceneAssets 取"未来注 — 该计划未实施且 closure 共享 npcSprites map 已是定案架构(present 全读 ctx.npcSprites) | 改"定案的架构,不再计划切到从 sceneAssets 取" |
| 3 | bootstrap.ts L1860 | "其余 boot 资源(~3200 个请求)"过时 — 2026-06-22 资源管线优化后 ~800(boot-loading.ts EXPECTED_BOOT_REQUESTS=810 自己记录,含实测校准史) | 改"~800(优化后;曾 ~3200)" |

## 零整改面

- **audio.ts(323 行)**:L46 SFX 同号去重(sound.c:769-772 lastSFX 语义:未播完复位/挂起复位三臂全注)、L47 真实 loop 补播、DM29 战斗入场静默序、OGG 后端 release 释放论证 — 零缺陷。
- **bootstrap.ts 其余 1931 行**:全部 handler 注入(setSceneLoader/setMapReloader/setObstacleChecker/setStartBattleHandler/setRngPlayHandler/setShowFbpHandler/setScrollFbpHandler/setEndingAnimationHandler/setQuitHandler/setLoadGameHandler…)、loadSceneCommon 双路径(fromSavedGame 边界全集:DM25 屏波清/0x6D override 直用/读档 palette 黑屏 guard/DH7 读档解毒/L6/L7 复位)、DOS 结局全片编排(ending.c:420-511 逐 beat 配乐锚)、playDosOpening(M15 DOS FBP 0x26/0x27 真值)、H1 新游戏复位 — 真值锚密度全仓最高,零缺陷。

## 验证

- body-invariance:bootstrap.ts printedSha256 一致 → [body-invariance.json](body-invariance.json)
- 定向 8 文件(bootstrap×5 + audio×3):**23 套件 41/41,0 failed suites** → [directed.json](directed.json)
- `tsc --noEmit -p packages/game`:exit 0;scoped biome 0 诊断;`git diff --check` 干净

## 登记项(交 Codex)

1. `SceneAssets.npcSprites` 接口字段定案为不装数据(bootstrap 传空 map 满足接口)— schema 清理候选(批22新增)
```
<!-- incremental-original-source:end -->
