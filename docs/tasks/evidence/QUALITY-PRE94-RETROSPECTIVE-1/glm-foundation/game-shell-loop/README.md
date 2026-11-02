# game-shell-loop(shell 交互/循环四文件)八维复审批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 pre-94 foundation 模块 9 批 21(shell 模块批 3)的作者八维复审回执:Coding Owner GLM,基线 origin/codex/code-quality-3y @ 53db76bbbb(候选线 49+ 提交)。四文件全文读毕:input 164/main-loop 181/boot-loading 159/precache-ui 189。零整改批(B–H 八维全部通过;零代码/注释改动,工作树零 diff)。Codex 当前裁定(2026-10-19):本页保留作者阶段证据,未获整包/全维收口验收。证据原件即下方逐字节保全的固定main源。

## 来源与输入

零整改依据:input.ts——CODE_MAP 逐键对照 sdlpal input.c:58-90 真值+WASD 原义还原决策(2026-05-31 user)、e.repeat 过滤(键序"后按优先"失效根因)、DM30 suppressHeldForFade 抑制集(palette.c:313-316 函数级清键边界)、clearPressed 与 PAL_ClearKeyState 等价及 modal 边界。main-loop.ts——DM31 不补帧/溢出结转双修正(死亡淡出慢 25% 根因考证)、DM30 scene-fade 清键边界、DM32 fade-only present 门控五条件(含 battleAnim renderIdx 细分)、fade 不提速的香兰报信根因。boot-loading.ts——810 预估实测校准史(3237→800 波次论证)、fetch 包装所有权模型(restoreFetch 只撤自己占有的槽,与 fetch-retry 装载顺序约束呼应)、PROD 两段进度与 fallback 互斥(2026-06-14 互盖闪烁实测)。precache-ui.ts——两段进度四相状态机(necessary/full/entered/failed,迟到进度拒收)、单调不回退贯穿两段、enterGame 后 widget 初始化消空白。返工范围与逐文件依据见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 断言与业务 oracle

定向回归 [directed.json](directed.json):10 个测试文件(input×3/main-loop×2/boot-loading×2/precache-ui×2/menu-input-lock),28 套件 112/112 全 passed、0 failed suites、snapshot 全零、success=true(startTime 2026-10-19T01:01:24.041Z);构成——4 个 grok-r1 宿主件 58 例(precache-ui-host 23/main-loop-gates 13/input-replay 11/boot-loading-host 11)+主测 49 例(input 17/main-loop 12/boot-loading 11/precache-ui 9)+boundaries 3 例+menu-input-lock.glm-msio 2 例(跨文件守卫);断言实样如『G09-B03 dt 150 只 tick 一次,并把 50ms 余量留在累加器』『G09-B04 dt 200 结转后余量正好等于间隔,不丢弃』『G09-D02a 小组件忽略非有限字节,不把 NaN 写入 DOM』。补充门:tsc --noEmit -p packages/game exit 0;工作树零 diff。

## 结果

批内结论:四文件零缺陷,零整改。登记项无新增。历史时点回执保持原状,本页治理不产生新执行结果。

## 限制与复核

未重跑任何测试/typecheck;28 套件为 vitest 套件字段,与 (文件,根 describe) 对 17、文件数 10 三口径分轴;零整改批的绿是存量保持证据,判别力属测试族建立期(尤其 DM30-32 修正史的初红不在本件)。候选待 Owner 非作者接收;失效条件:四文件或测试族身份变化时降级为历史记录。

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
