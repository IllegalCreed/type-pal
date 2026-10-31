# game-tools(tools 8 件 + speedrun 9 件 = 17 文件)八维复审批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 pre-94 foundation 模块 11 批 28(game 包余量批)的作者八维复审回执:Coding Owner GLM,基线 origin/codex/code-quality-3y @ 53db76bbbb(候选线 61+ 提交)。17 文件全文读毕:tools 侧 map-names 11/save-io 26/display-scale 51/quick-save 61/toast 81/fps-overlay 110/minimap 487/tools-panel 1107;speedrun 侧 countdown 29/time-format 36/store 58/snapshot 58/detectors 76/checkpoints 110/index 116/overlay 120/timer 218。零整改批(B–H 全维通过;零代码/注释改动,工作树零 diff)。Codex 当前裁定(2026-10-19):本页保留作者阶段证据,未获整包/全维收口验收。证据原件即下方逐字节保全的固定main源。

## 来源与输入

零整改依据:speedrun 家族——checkpoints 的 PARTYOFFSET(160,112) 视口↔世界换算考证(PalTimer 源码+香蕉实测坐实)、香蕉树 3 格 tol=0 照抄 PalTimer 精确命中论证、边缘点 ⚠ 待实跑核的诚实标注;snapshot canMove 起表门(boot 预载窗口实测四阶段);timer 暂停双轨(香蕉拿到即恢复无倒计时 vs F8 倒计时)与 setStep 边沿检测器重置;detectors/bossWon 镜像 PalTimer 声明。minimap——kinds 缓存按 gs.npcs 引用判失效(wNumScene 先于 npcs 更新的 user 报错根因)、baseFailed 防 404 洪水、currentMapNum>0 门防标题空 widget、"不保证每档都是降采样"边界声明。tools-panel——battleSig"不是完整 checksum"的范围声明、我方 HP/MP 不显示的滞后理由(战斗工作副本边界回写)、Backquote stopPropagation 放行;快捷键 tab 与 input.ts CODE_MAP 一致。小件——map-names/save-io/display-scale/quick-save/toast/fps-overlay 注释与实现一致(F5 拦刷新/对数刻度/HP 颜色阈值)。返工范围与逐文件依据见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 断言与业务 oracle

定向回归 [directed.json](directed.json):21 个测试文件(speedrun 全家+save-io/quick-save/msio),52 套件 106/106 全 passed、0 failed suites、0 失败消息、snapshot 全零、success=true(startTime 2026-10-19T01:18:56.043Z);构成——11 个主测 70 例(timer 14/index 11/detectors 8/quick-save 8/snapshot 7/store 5/overlay 4/save-io 4/time-format 4/countdown 2/checkpoints 3)+7 个 glm-phase1-leaves 18 例+time-format.boundaries 8 例+timer.boundaries 6 例+save-import-quicksave.glm-msio 4 例;断言实样如『checkpoints :: 正好 21 个,id 唯一,时间单调递增』『香蕉配置(照抄 PalTimer 3 精确格 + PARTYOFFSET,零容差)』『SpeedrunTimer 起表与打点 :: scene>0 但李逍遥不可移动(标题/开场演出/加载/淡入)→ 不起表』。补充门:tsc --noEmit -p packages/game exit 0;工作树零 diff。

## 结果

批内结论:17 文件零缺陷,零整改;game 包余量收至 dev 两件(state-dump 117/dev-panel 2342)。登记项无新增。历史时点回执保持原状,本页治理不产生新执行结果。

## 限制与复核

未重跑任何测试/typecheck;52 套件为 vitest 套件字段,与 (文件,根 describe) 对 31、文件数 21 三口径分轴;『17 文件』是生产文件口径、『21 文件』是测试文件口径,两轴不互推;边缘点 ⚠ 待实跑核项保持开放。候选待 Owner 非作者接收;失效条件:17 生产文件或 21 测试文件身份变化时降级为历史记录。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2060B / SHA-256 f1a17fc9d3c744c23111b3b795c193fef59be9dff82b2d23a953176c33c03c3f；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# game-tools(tools 8 件 + speedrun 9 件 = 17 文件)八维复审批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

- 批次:pre-94 foundation 模块 11 批 28
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 61+ 提交)
- Coding Owner:GLM;17 文件全文读毕(map-names 11/save-io 26/display-scale 51/quick-save 61/toast 81/fps-overlay 110/minimap 487/tools-panel 1107 + speedrun: countdown 29/time-format 36/store 58/snapshot 58/detectors 76/checkpoints 110/index 116/overlay 120/timer 218)
- **零整改批**(B–H 全维通过;零代码/注释改动,工作树零 diff)

## 零整改依据

- **speedrun 家族**:checkpoints 的 PARTYOFFSET(160,112) 视口↔世界换算考证(PalTimer 源码+香蕉实测坐实)、香蕉树 3 格 tol=0 照抄 PalTimer 精确命中论证、边缘点 ⚠ 待实跑核的诚实标注;snapshot canMove 起表门(boot 预载窗口实测四阶段);timer 的暂停双轨(香蕉拿到即恢复无倒计时 vs F8 倒计时)与 setStep 边沿检测器重置论证;detectors/bossWon 镜像 PalTimer 声明 — 全部准确。
- **minimap**:kinds 缓存按 gs.npcs 引用判失效(wNumScene 先于 npcs 更新的 user 报错根因)、baseFailed 防 404 洪水、currentMapNum>0 门防标题空 widget、"不保证每档都是降采样"边界声明。
- **tools-panel**:battleSig"不是完整 checksum"的范围声明、我方 HP/MP 不显示的滞后理由(战斗工作副本边界回写)、Backquote stopPropagation 放行论证;快捷键 tab 与 input.ts CODE_MAP 一致。
- **小件**:map-names/save-io/display-scale/quick-save/toast/fps-overlay 全部注释与实现一致(F5 拦刷新/对数刻度/HP 颜色阈值)。

## 验证

- 定向 21 文件(speedrun 全家 + save-io/quick-save/msio):**52 套件 106/106,0 failed suites** → [directed.json](directed.json)
- `tsc --noEmit -p packages/game`:exit 0;工作树零 diff

## 登记项

无新增。
```
<!-- incremental-original-source:end -->
