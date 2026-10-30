# game-shell-loop(shell 交互/循环四文件)八维复审批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「game-shell-loop(shell 交互/循环四文件)八维复审批」的治理候选页;证据原件即下方逐字节保全的固定main源(1915B,SHA d34a8aa47eef)。

## 来源与输入

来源为固定Git载体,非本次运行;原2个链接处置见作者review的linkDisposition。当前存活入口:[codex-stage2-rework.json](../codex-stage2-rework.json)、[directed.json](directed.json)

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1915B / SHA-256 d34a8aa47eef648cdc7aedab8441797a90344b577920c7bebe489471aa0c5589；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# game-shell-loop(shell 交互/循环四文件)八维复审批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

- 批次:pre-94 foundation 模块 9 批 21(shell 模块批 3)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 49+ 提交)
- Coding Owner:GLM;四文件全文读毕(input 164/main-loop 181/boot-loading 159/precache-ui 189)
- **零整改批**(B–H 八维全部通过;零代码/注释改动,工作树零 diff)

## 零整改依据

- **input.ts**:CODE_MAP 逐键对照 sdlpal input.c:58-90 真值 + WASD 原义还原决策(2026-05-31 user);e.repeat 过滤(键序"后按优先"失效根因)、DM30 suppressHeldForFade 抑制集(palette.c:313-316 函数级清键边界)、clearPressed 的 PAL_ClearKeyState 等价与 modal 边界论证 — 全部锚点准确。
- **main-loop.ts**:DM31 不补帧/溢出结转双修正(死亡淡出慢 25% 根因考证)、DM30 scene-fade 清键边界、DM32 fade-only present 门控五条件(含 battleAnim renderIdx 细分)、fade 不提速逻辑的香兰报信根因 — 时间线论证完整自洽。
- **boot-loading.ts**:810 预估的实测校准史(3237→800 波次论证)、fetch 包装所有权模型(restoreFetch 只撤自己占有的槽,与 fetch-retry 装载顺序约束呼应)、PROD 两段进度与 fallback 互斥(2026-06-14 互盖闪烁实测)。
- **precache-ui.ts**:两段进度状态机(necessary/full/entered/failed 四相,迟到进度拒收)、单调不回退贯穿两段、enterGame 后 widget 初始化消空白论证。

## 验证

- 定向 10 文件(input×3/main-loop×2/boot-loading×2/precache-ui×2/menu-input-lock):**28 套件 112/112,0 failed suites** → [directed.json](directed.json)
- `tsc --noEmit -p packages/game`:exit 0;工作树零 diff

## 登记项

无新增。
```
<!-- incremental-original-source:end -->
