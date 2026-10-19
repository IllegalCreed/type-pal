# reforge-root-small(reforge 根目录微/小件 ~45 文件)八维复审批

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
