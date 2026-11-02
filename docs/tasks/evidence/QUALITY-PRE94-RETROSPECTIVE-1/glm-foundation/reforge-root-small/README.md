# reforge-root-small(reforge 根目录微/小件 ~45 文件)八维复审批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 pre-94 foundation 模块14批41(reforge 包批2)的作者八维复审回执:对 reforge 根目录微/小件约45个生产文件全文读毕(defined/hash/entity-proximity/runtime-script-runner/game-over-dialog/ambience-compositor/dialogue/runnable-project-loader/cursor-pure-fixtures/movement/collision/scene-map/palette-color/typewriter/slot/item-use-session/item-use-result/reward-gain/async-intent/boot/dev-preset/item-use-placement/presentation-intent/gameplay-clock/scene-runtime-state/script-wake-gate/script-execution-gate/script-execution-budget/automatic-target-command/scene-transition/screen-hold-transaction/actor-condition-runtime/actor-condition-lifecycle/author-io/save-scope/menu-system-box/engine-chrome-registry/reward-gain-queue/narration-scroll/dialog-assets/glyph/text-render/save-types/save-ops/menu-item-list/menu-equip-box),基线 origin/codex/code-quality-3y@53db76bbb 候选线(76+ 提交)。裁决为零整改批:B–H 全维通过,零代码/注释改动、工作树零 diff。证据原件即下方逐字节保全的固定 main 源(2599B,SHA a9368cfeccae)。

## 来源与输入

本页属 GLM 作者候选阶段,非 Codex 整包/全维验收;页首 Codex 2026-10-19 裁定保留作者阶段证据。验证输入为同目录 Vitest 回执 [directed.json](directed.json);返工矩阵与可复用范围见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 断言与业务 oracle

零整改依据亮点:红线纪律注普遍到位——presentation-intent "v1 演出态不入协议 K4"、script-execution-budget "engine safety budget, not authored repeat count"、scene-runtime-state "engine-owned, not author pages"、save/scope "Runtime storage identity, not a field in the portable save payload",域归属声明与实现一致。gate 族:ScreenHoldTransaction token 精确消费+owner 防旧 cleanup;ScriptWakeGate 纯 eligibility waiter 非 timer;AsyncIntentController 窄身份门+调用方 assertCurrent 责任;atScriptExecutionGate "no asynchronous gap may separate this read from a mutation"。game-over-dialog $00/$02 控制行→空行 y=58/76 坐标考证。typewriter DEFAULT_SPEED_MS=24(iDelayTime=3×8)与一阶段 Bug1 同源,isLineDone autoAdvance 尾停顿语义。engine-chrome/registry 85 slot 穷尽表+missing/extras 双向断言+非项目资源声明。menu family 已读件:item-list marquee 无缝双画+desc 行距 151+i*16;equip-box 布局=ScreenLayout 真值+图标(+8,+8)纠自创偏移史;system-box/confirm/switch 复用同布局。以上为作者时点核读结论,本治理轮不重核源码。

## 结果

原验证结果:定向 39 套件 106/106、0 failed suites;tsc --noEmit -p packages/reforge exit 0(批40 已核);工作树零 diff;登记项无新增。计数说明:原文称「21 测试文件」,而回执 testResults 实为 18 个文件(39 套件与 106 用例两轴吻合);该差异按原文保留并在此登记,引用本批文件数时以回执 18 为准。reforge 余量由批42-50续批。

## 限制与复核

未重跑 106 套件用例与 tsc;基线为候选线非 main 集成分支;106 绿不证初红根因,不授 E2E/coverage 信用;21vs18 文件计数差异根因未在本回执内证实;整包收口以 Codex 返工记录为准。本页为治理候选,待 Owner 非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2599B / SHA-256 a9368cfeccae0a084079e4b885ebe44867e1b834572d01c4f24b62f5630872d1；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# reforge-root-small(reforge 根目录微/小件 ~45 文件)八维复审批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

- 批次:pre-94 foundation 模块 14 批 41(reforge 包批 2)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 76+ 提交)
- Coding Owner:GLM;~45 文件全文读毕(defined/hash/entity-proximity/runtime-script-runner/game-over-dialog/ambience-compositor/dialogue/runnable-project-loader/cursor-pure-fixtures/movement/collision/scene-map/palette-color/typewriter/slot/item-use-session/item-use-result/reward-gain/async-intent/boot/dev-preset/item-use-placement/presentation-intent/gameplay-clock/scene-runtime-state/script-wake-gate/script-execution-gate/script-execution-budget/automatic-target-command/scene-transition/screen-hold-transaction/actor-condition-runtime/actor-condition-lifecycle/author-io/save-scope/menu-system-box/engine-chrome-registry/reward-gain-queue/narration-scroll/dialog-assets/glyph/text-render/save-types/save-ops/menu-item-list/menu-equip-box)
- **零整改批**(B–H 全维通过;零代码/注释改动,工作树零 diff)

## 零整改依据(亮点)

- **红线纪律注普遍到位**:presentation-intent "v1 演出态不入协议 K4"、script-execution-budget "engine safety budget, not authored repeat count"、scene-runtime-state "engine-owned, not author pages"、save/scope "Runtime storage identity, not a field in the portable save payload" — 域归属声明与实现一致。
- **门/gate 族**:ScreenHoldTransaction token 精确消费+owner 防旧 cleanup;ScriptWakeGate 纯 eligibility waiter 非 timer;AsyncIntentController 窄身份门+调用方 assertCurrent 责任;atScriptExecutionGate "no asynchronous gap may separate this read from a mutation"。
- **game-over-dialog**:`$00/$02` 控制行→空行 y=58/76 坐标考证。
- **typewriter**:DEFAULT_SPEED_MS=24(iDelayTime=3×8)与一阶段 Bug1 同源;isLineDone autoAdvance 尾停顿语义。
- **engine-chrome/registry**:85 slot 穷尽表+missing/extras 双向断言+非项目资源声明。
- **menu family 已读件**:item-list marquee 无缝双画+desc 行距 151+i*16;equip-box 布局=ScreenLayout 真值+图标 (+8,+8) 纠自创偏移史;system-box/confirm/switch 复用同布局。

## 验证

- 定向 21 测试文件:**39 套件 106/106,0 failed suites** → [directed.json](directed.json)
- `tsc --noEmit -p packages/reforge`:exit 0(批40 已核);工作树零 diff

## 登记项

无新增。
```
<!-- incremental-original-source:end -->
