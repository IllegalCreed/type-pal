# CODE63 speedrun snapshot 当前复审切片

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

历史 CODE-QUALITY-63 的快照投影需重新核验:基点 ecbbeb53c、分支 codex/code-quality-3y,只复核快照投影 ownership、真实 caller 与测试判别力,不改变 speedrun 数据/公共接口/产品行为;整卡复审为 partial。2026-10-18 两则勘误:统一门 [README.md](../53-wave-gates/README.md) 信用撤回;本页旧测试合法性结论由 [README.md](../63-65-speedrun-fixtures/README.md) 精确替代。

## 范围与证据

实现/直接测试:snapshot.ts(58行)、snapshot.test.ts(62行)。真实 caller:speedrun/index.ts 的 tickSpeedrunTimer、timer.ts 的 ProgressSnapshot 输入、detectors.ts 纯快照检测器、shell/main-loop.ts 每帧调用。状态 owner/相邻类型:GameState 中 inventory/battleState/mode/sceneLoading/paletteFadeState/suspendRaf;设计合同为 docs/phase1/plans/2026-06-18-speedrun-timer.md §Task2/§4.1。工具无仓内 SDLPal 同形态 snapshot primary。

## 发现

snapshot.ts 每次调用新建 inventory 与 enemy Set,将 count>0 的物品投影为只读集合;战斗敌人 id 进入集合而总血按全部敌槽求和,阵亡槽仍参与总量,符合 bossWon/caiyiDetector 消费合同;canMove 只在 explore 且未 scene-loading/palette-fade/suspendRaf 时为真,避免 boot 预载/开场演出提前起表;读取中未发现有 caller 支持的越界/错误传播/异步/资源清理问题。snapshot.test.ts 7 测试覆盖 count=0 反例、无战斗/战斗 id 与总血、mode/suspendRaf/sceneLoading/paletteFadeState 四类不可移动门。定向 1 file/7 tests、相邻 5 files/32 tests、typecheck passed。

## 结论

投影 ownership 核验成立;但 2026-10-18 合法输入/判别力勘误:本页旧'合法GameState片段'结论不足——已发现核心双重强转隐藏非法 Facing 和不完整状态,解绑 toast 观察不能独立证明计时保持;当前仍 partial,旧 raw/数字保留。

## 整改与复核

正式构造器、实际计时 oracle 与失败清理已由 63-65-speedrun-fixtures 补齐;speedrun 其余 64-69 文件、checkpoint 实跑/视觉体验或整卡统一门未关闭;旧波次不能认证新候选,无新全仓/coverage/protected 门。未重跑任何命令;历史结论保持原时点;候选待 Owner 非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3144B / SHA-256 60bfc03e3b9d8046b9d2cfb93a2b8d09948f72624281b694e4be82e1ea331609；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE63 speedrun snapshot 当前复审切片

> 2026-10-18 波次门勘误：本页引用的 [47–52统一门回执](../53-wave-gates/README.md) 已撤回“通过/收口”信用，未证明零诊断；不得沿用为本片验收或合并依据。本页原逐文件/定向结果按各自证据保留，旧计数不改写为0。

基点：`ecbbeb53c`；分支：`codex/code-quality-3y`。本片只复核快照投影 ownership、真实 caller 与测试判别力，不改变 speedrun 数据、公共接口或产品行为；CODE-QUALITY-63 当前复审为 `partial`。

## 实际读取与依据

- 实现/直接测试：`packages/game/src/tools/speedrun/snapshot.ts`（58 行）、`snapshot.test.ts`（62 行）。
- 真实 caller/消费方：`speedrun/index.ts` 的 `tickSpeedrunTimer`、`timer.ts` 的 `ProgressSnapshot` 输入、`detectors.ts` 的纯快照检测器、`shell/main-loop.ts` 的每帧 `tickSpeedrunTimer` 调用。
- 状态 owner/相邻类型：`GameState` 中 `inventory`、`battleState`、`mode`、`sceneLoading`、`paletteFadeState`、`suspendRaf` 定义；`docs/phase1/plans/2026-06-18-speedrun-timer.md` §Task 2/§4.1 设计合同。工具没有仓内 SDLPal 同形态 snapshot primary，PalTimer/checkpoint 设计与真实 caller 是当前 oracle。

## 逐文件结论

`snapshot.ts` 每次调用新建 inventory 与 enemy `Set`，将 `count > 0` 的物品投影为只读集合；战斗敌人 id 进入集合而总血按全部敌槽求和，阵亡槽仍参与总量，符合 `bossWon`/`caiyiDetector` 消费合同。`canMove` 只在 explore 且未 scene-loading、palette-fade、suspendRaf 时为真，避免 boot 预载/开场演出提前起表。读取过程中未发现有 caller 支持的越界、错误传播、异步或资源清理问题。

`snapshot.test.ts` 的 7 个测试使用合法 `GameState` 片段，覆盖 count=0 反例、无战斗/战斗 id 与总血，以及 mode、suspendRaf、sceneLoading、paletteFadeState 四类不可移动门；相邻 detectors/index 五个文件共 32 tests 通过，没有新增重复或恒真用例。

## 验证

- 定向：`pnpm --filter @type-pal/game exec vitest run src/tools/speedrun/snapshot.test.ts` — 1 file / 7 tests passed。
- 相邻：snapshot、detectors（含 GLM leaves）、index（含 GLM leaves）5 files / 32 tests passed。
- 类型：`pnpm --filter @type-pal/game typecheck` — passed。
- 覆盖率、protected fast、全仓 `pnpm check`：沿用 [`53-wave-gates`](../53-wave-gates/README.md) 的稳定波次证据，本小批不重复运行昂贵门。

未关闭 speedrun 其余 64–69 文件、checkpoint 实跑/视觉体验或整卡统一门；未知保持 pending/partial。

## 2026-10-18 合法输入/判别力勘误

本页旧测试合法性/解绑结论不足，已发现核心双重强转隐藏非法Facing和不完整状态；解绑toast观察不能独立证明计时保持。相应当前声明由[63/65勘误](../63-65-speedrun-fixtures/README.md)精确替代，旧raw/数字保留。正式构造器、实际计时oracle与失败清理已补；当前仍partial。旧波次不能认证新候选，无新全仓/coverage/protected门。
```
<!-- incremental-original-source:end -->
