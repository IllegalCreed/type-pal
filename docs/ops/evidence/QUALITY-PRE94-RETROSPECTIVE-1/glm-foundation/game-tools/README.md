# game-tools(tools 8 件 + speedrun 9 件 = 17 文件)八维复审批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「game-tools(tools 8 件 + speedrun 9 件 = 17 文件)八维复审批」的治理候选页;证据原件即下方逐字节保全的固定main源(2060B,SHA f1a17fc9d3c7)。

## 来源与输入

来源为固定Git载体,非本次运行;原2个链接处置见作者review的linkDisposition。当前存活入口:[codex-stage2-rework.json](../codex-stage2-rework.json) [directed.json](directed.json)。

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


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
