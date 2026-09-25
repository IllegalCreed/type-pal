# TEST-GROK-PRESENT-2 — 一阶段画面合成与战斗呈现候选回归

Status: draft
Phase: phase1
Capability: 只补隔离候选测试，不改变玩法或正式覆盖率范围
Contribution Owner: Grok
Coding/Review Owner: Codex（正式接入、产品缺陷与统一质量门）
Branch: `codex/grok-present-composition-r1`（独立 worktree）
Evidence freeze: `077516bb04c27b38865139a67ad64b0c7eb3fd47`

## 目标与准入

用户允许 Grok 继续并行工作。本卡授权 Grok 在 **draft 阶段**连续做一批一阶段呈现层候选测试，
不开放产品修复或正式测试/基线修改。当前 Codex 主线处理 A3 Reforge 架构治理，GLM 的 G07 只碰
一阶段 core 跨模块边界，Cursor 只核覆盖率文档；本包限定 `packages/game/src/present/**` 的
真实渲染/显示调用链，避免争用相同实现文件。

前提真值：本包不主张新的原版规则，仅把已核实的现有一阶段行为钉成可鉴别回归。
若当前代码、原版/sdlpal、历史测试三者冲突，先登记 `pending-contract` 和能推翻假设的观察，
不改测试预期迁就实现，也不自行修产品。第一阶段忠实规则见 `CLAUDE.md`；相关踩坑先读
`docs/phase1/engineering-notes.md` 与需要时的 `docs/phase1/game-mechanics.md`。

## 冻结入口与去重

- 正式上一包 P01–P10 见 [`grok-present-integration.md`](../../testing/grok-present-integration.md)：
  菜单/索引绘制 25 项已入 game，不能换标题再补一遍。既有
  `present.test.ts`、`dialog-box.test.ts`、`battle/__tests__/present-battle.test.ts`、
  `draw-battle-ui.test.ts`、`draw-battle-sprites.test.ts` 必须逐轴列出精确旧标题与新差异。
- 当前入库 fast 是 8090 测试/641 生产文件。主工作树当次只读 LCOV 对本包候选四模块显示未命中分支：
  `present.ts` 61、`present-battle.ts` 51、`draw-battle-ui.ts` 46、`dialog-box.ts` 61。
  这些是**定位线索**，不保证每臂可达或值得补测；不设新增项数或覆盖百分比成绩。
- 真实公开入口：`presentFrame`（`present.ts:184`）、`BattlePresent.draw`（`present-battle.ts:129`）、
  `drawBattleUI`（`draw-battle-ui.ts:235`）、`drawDialogBox`（`dialog-box.ts:638`）。
  禁止只测内部辅助函数却声称命中整帧装配。

## 六组连续工作包

| ID | 候选差异轴 | 必须避免的旧例重复/弱证明 |
|---|---|---|
| P11 大世界分层与前景 | 真实 `presentFrame` 输入的地块/NPC/队首/跟随/遮挡前景；用不同索引色和交叠点核画序与透明孔，消费前后拍同一实际输入 | 旧 `present.test.ts` 已测普通 Y-sort、各方向/步帧、NPC 屏外剔除和 cover-tile 基本位置；新例须提出未证的组合或边界，不只断言“有像素” |
| P12 大世界叠层与补帧 | `presentFrame` 的 palette remap、dialog kept/current、菜单叠层与 `advanceEffects=false` 补帧时波/震计数；用成对帧、精确像素及状态不变正控 | 旧例已测 black hold、RNG backup、菜单 mode 门、对话同屏和单项 fade；不能把这些重命名为新增 |
| P13 战斗命令与提示寿命 | `BattlePresent.draw` 消费非空命令：伤害数字、战斗消息入场/到期、对话/结算叠层；区分 frame 顺序、重复 draw 与清场后的残留 | 旧 `present-battle.test.ts` 已测单次伤害、跨帧漂浮、结算四屏“有写入”；新增须有可区分的坐标/色/寿命与对照 |
| P14 战斗画面渐变与补帧 | `introFade`、召唤 crossfade、palette fade 与 `advanceEffects=false` 的真实帧序；最少起点/中段/终点及重复帧，验证输入/世界副作用不被渲染偷改 | 不重测 `draw-battle-bg` 的纯色阶或 `draw-battle-sprites` 现有 death-fade 纯函数；不得以私有字段反射代替画面/公开状态 |
| P15 战斗 UI 多态 | `drawBattleUI` 在 1/2/3 人合法队伍下的实际状态栏与当前行动者、使用/投掷道具、MP 临界和目标选择；正确状态来自公开 battle state，断言确切像素/文字位置及缺数据对照 | 旧 UI 套件大量“有写入/不抛错”，也已有 target 箭头/魔法说明/头像染色等单例；只补缺的业务差异，绝不把 `>3` 队员当产品新需求 |
| P16 对话框绘制 | 经 `drawDialogBox` 和至少一条 `presentFrame` 调用域验证 portrait/title/body/key-icon、narration/itemBox 差异及透明索引0；有上层覆盖顺序与缺资源正控 | `dialog-box.test.ts` 已密测解析/打字/翻页状态机，P16 仅做未证的**绘制结果**，不复制控制符矩阵或只比较状态字段 |

某组经去重发现已充分覆盖，可交 `existing-proof`（旧标题+file:line+实际断言）；不可达/依赖真实 PAL
资源的臂交 `pending-contract`/`blocked-input`，不造非法 fixture 保持组数。第一阶段像素合同须引用
原版/SDL 一手源或已核一阶段代码+历史修复，报告清楚证据层级。

## 候选纪律与交付

- 唯一写入白名单：`docs/testing/grok-phase1-composition-r1/**`。允许候选测试、typed 自包含 fixture、
  显式 Vitest/tsconfig、单点负控工具、README/机账；不改 `packages/`、旧测试、PAL 资产、
  原探针、根配置、锁文件、脚本、正式覆盖率基线或其它任务卡。
- 测试实际调用生产 `presentFrame`/`BattlePresent.draw`/`drawBattleUI`/`drawDialogBox`；
  可替身化 Canvas/时钟/字体/资源读取边界，不 mock 被测渲染器、游戏状态机或命令消费结果。
  typed GameState/BattleState/资源 fixture 先过现行 guard；不用 `as unknown as` 掩盖无效核心输入。
- 对**每次** draw，把真实传入的可变对象、位图尺寸/indices/opaque、颜色表和菜单/战斗状态在调用前独立深拍，
  调用后立即比较同一对象；输出先设可辨认哨兵。索引0必须区分不透明0与透明孔；
  不能以“某区域有任何非零像素”充业务断言。
- 至少挑 4 个分属不同调用链的关键新断言做单点反控：绿对照 exit0、仅替换一个生产加载点后
  指定候选标题恰 exit1 且为业务 AssertionError、注入见证命中、源文件 hash 不变；
  TypeError/超时/0执行/错标题均 invalid。若保护重叠导致单点不红，登记真实原因，不改产品硬造。
- 无新产品缺陷则如实写0；真缺陷保留独立 diagnostics 红例、合法正控与复现，不 skip/test.fails，
  不自行修产品。Grok 自验不算 Codex 独立接收。
- 逐组连续完成，至少每两组提交一次；整包统一交候选 `README.md`、机器账（稳定 ID、测试完整标题、
  旧例去重、来源、命令/cwd/退出码、反控或未证分类）、定向与相邻 Vitest JSON、候选 TS typecheck、
  自有目录 Biome、`node scripts/docs/check.mjs`、`git diff --check`。候选可跑局部覆盖定位，但
  **不跑**全仓 check/官方 ratchet/strict-fast/full 或浏览器剧情 E2E；最终统一统计归 Codex。

## 阶段门与交接

- Codex 已核前提、冲突面与白名单：**draft 隔离候选准备 allowed**；这不是正式实现/测试接入的 build 门。
- 当前无需 Kimi/GLM 固定签字。Grok 只贡献候选，Codex 独立决定 accept/counter、正式移入 game、
  全仓 check→官方 ratchet→受保护单次 strict-fast、done 与清理旧 worktree/分支。
- 无产品行为/schema/save/资产格式改动授权。发现需要这些变化时停止该轴，登记反例交 Codex。

## 下一位 Grok 提示词

```text
在 /Users/zhangxu/illegal/type-pal 接手 TEST-GROK-PRESENT-2；先读 AGENTS.md、CLAUDE.md、
docs/phase1/engineering-notes.md、本卡 docs/ops/tasks/TEST-GROK-PRESENT-2-phase1-composition.md、
docs/testing/grok-present-integration.md，以及本卡列出的现有 present/battle/dialog 测试。
从包含本卡的 origin/main 新建独立 worktree /Users/zhangxu/illegal/type-pal-grok-present-composition，
分支 codex/grok-present-composition-r1；接手前核工作树干净。不得在 main 或旧 Grok 已归档分支上改。

按 P11–P16 连续做一阶段画面合成/战斗呈现候选回归。先逐组列既有测试精确标题与新差异，
再用 typed 自包含输入走真实 presentFrame、BattlePresent.draw、drawBattleUI 或 drawDialogBox；
核精确像素/帧序和同一实参深快照，不用“非空像素/不抛错”充合同。至少四条不同调用链的新断言
交可复建单点业务反控；不可达/已有证据/输入不足如实分类，不为数量造测试。发现产品 bug 留
diagnostics 红例和正控，不自行修产品或更改原版机制。

只写 docs/testing/grok-phase1-composition-r1/**，不改 packages/、旧测试、PAL资源、根配置、
脚本或覆盖率基线。每两组至少提交一次，整包提供 README、机器账、测试 JSON、反控、typed
fixture、候选 typecheck/Biome/docs/diff 检查结果；不跑全仓 check、官方 coverage ratchet/strict/full
或剧情 E2E。提交推送候选完整 SHA，交 Codex 独立接收；不合 main、不标 done、不要求 Kimi/GLM 签字。
```
