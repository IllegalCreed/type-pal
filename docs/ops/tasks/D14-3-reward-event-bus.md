# D14-3 - 奖励/事件总线统一收尾（议题 14 剩余③）

Status: done
Phase: phase2
Capability: 议题 14 剩余③ 奖励/事件（物品提示两套 UI 统一）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: GLM（覆盖矩阵主审）+ Kimi（视觉/UX 抽审）
Visual Verification Owner: Codex（K3 功能输入 + 代码冻结后剧情奖励集中 E2E）
Visual Verification Timing: mixed（K3 功能性输入已在开发期最小验证；剧情奖励观感后续只进集中 E2E）
Unavailable Agents: Kimi / GLM（仅 K3 最终增量 re-review；用户 2026-08-09 明确签字豁免）
Branch: `chore/docs-migrate-cleanup`

## 目标

物品/金钱/经验入账统一走「奖励事件」通道，所有「获得 X」提示统一为同一呈现组件，
消灭 narration 卷轴 vs item-use-result 框两套 UI 的并存；giveItem 呈现不再依赖脚本自写旁白。

## 范围

- 范围内:
  - 奖励事件定义（给物品/金钱/经验 + 可选呈现元数据），入账意图边界（worldMutationIntent/
    scriptMutationIntent）不变，只在其上接事件通道。
  - 统一「获得 X × N」提示组件（基于现有 narration scroll 或 item-use-result 取一），
    宝箱/剧情拾取/偷窃/战斗入账/物品使用/脚本 giveItem 全走它。
  - 战斗胜利结算屏（settlement）结构保持，但物品获得提示入口统一。
- 范围外:
  - 对话外观（D14-1）；结算屏整体重做。
  - 演出意图协议（D14-2）。
- 明确不做:
  - 不改脚本语义（giveItem 仍同步入账）；不引入异步奖励队列改变时序。

## 上下文锚点

- 已拍板决策 / 铁律:
  - 议题 14 剩余清单：③奖励/事件总线统一收尾（物品提示两套 UI）。
  - 数据迁移缺陷先修上游（本卡若涉及迁移器输出则先上游）。
- 代码锚点:
  - `packages/reforge/src/main.ts:1811`（giveItem 只入账不呈现）、`:2493`（buildSettlement）、
    `:3645`（showToast）。
  - `packages/reforge/src/battle/battle-core.ts:284`（偷窃横幅）、
    `packages/reforge/src/menu/item-use-result.ts`（炼成框）、
    `packages/reforge/src/dialog/dialog-box.ts:248`（narration 卷轴）、`narration-scroll.ts`。
- 已知坑 / 审计文档:
  - 原版「获得物品有时用 dialog、有时用物品 UI」（议题 14 立卡背景）。
- 不得重新引入:
  - 入账与呈现耦合（呈现器直接写 world）。
  - 第三套提示 UI。
- 相关测试:
  - item-use-executor / battle-core / narration-scroll 现有单测。

## 验收条件

- 功能:
  - 所有入账路径（giveItem/宝箱/偷窃/合成/战斗结算/任务脚本）的「获得 X」提示同一样式。
  - giveItem 默认呈现（无脚本旁白时也有提示），原有脚本旁白不重复（幂等）。
- 测试:
  - 奖励事件单测（入账+呈现解耦）；全游戏覆盖矩阵（GLM）：giveItem/宝箱/偷窃/合成/结算路径
    逐条过。
- 文档:
  - backlog 议题 14 剩余③状态更新；capability-map 文本呈现口径。
- 视觉 / 手工验证:
  - 功能性 K3 输入可在开发期最小验证；宝箱/偷窃/合成/战斗结算等剧情/内容观感只登记并进入代码
    冻结后的集中 E2E，不要求 build/review Agent 重复走剧情截图。
  - 集中 E2E 登记：PAL；宝箱旁白、战斗偷窃、炼蛊皿合成、战斗结算四入口；预期引擎自有提示均走
    reward-gain、无双 UI、固定时序后无残留；证据落 `output/playwright/d14-3/e2e-*`。

## 推进签字

### 进入 build 前:设计签字

- Codex: agree（2026-08-07 设计冻结，见「设计结论」）
- Kimi: **agree**（2026-08-07，额度恢复补审，视觉/UX 抽审：reward-gain 统一观感口径 +
  v1.1 giveItem 呈现预裁定 + 逐条排队观感，附 K1-K3 build 验收钉，见「Kimi 设计抽审」）
- GLM: **agree（2026-08-07，额度恢复补审：v1 只统一引擎自有呈现（偷窃横幅 + item-use-result → reward-gain）、不动 content schema 的诚实范围认可；覆盖矩阵 5 路径（giveItem/宝箱旁白/偷窃/合成炼成/结算物品）明确。附 G1-G2 build 准入钉：5 路径逐条覆盖 + 双 UI 并存门禁（引擎自有呈现全走 reward-gain、无残留 narration 卷轴与 item-use-result 并存）。giveItem 自动呈现留 v1.1 认可。见「GLM 设计压测」）**
- counter / 分歧处理: 无 counter
- 缺签豁免: 用户已批准（2026-08-07 双额度耗尽）;GLM/Kimi 已补签,豁免闭环
- build 准入结论: **allowed**（2026-08-07，三方 agree 齐；G1-G2 + K1-K3 为 build 验收钉，
  不阻塞准入）

### 进入 done 前:审查签字

- Codex: **accept（2026-08-08，K3 rework + Kimi 键位裁决自验）**——timeout / advance / abort
  竞争同一 settle；Enter / Space 只跳当前条并消费同帧输入；Esc 不推进且返回未消费，保留外层关闭 /
  菜单语义。后续保序、timer/listener 清理不变。定向 5 测、Reforge 81 files / 826 tests、build 通过。
- Kimi: **waived by user（2026-08-09）**——此前对 `141d24e7` 的 K1 / 合成卷轴视觉 accept 保留为
  历史证据；K3 最终键位增量未由 Kimi re-review，本次豁免不得记为 Kimi 本人 re-accept。
- GLM: **waived by user（2026-08-09）**——此前对 `141d24e7` 的 G1 / G2 accept 保留为历史证据；
  K3 队列生命周期增量未由 GLM re-review，本次豁免不得记为 GLM 本人 re-accept。
- counter / 返工处理: Codex 原 counter 已由 `RewardGainQueue` 收口；OPS-RW1 Kimi 对 Esc 的设计
  counter 也已落实为“Enter/Space 跳过、Esc 外传”。rework diff 等待 Kimi / GLM 重新确认。
- 缺签豁免: **用户明确批准（2026-08-09，“签了”）**；只豁免 Kimi / GLM 对 K3 最终增量的
  re-review，不改写两席旧版 accept，也不豁免自动测试。
- done 准入结论: **allowed（2026-08-09，Codex accept + 用户缺签豁免；OPS-RW1 全量集成复验通过）**

## Draft: 设计与风险

### 设计结论

**2026-08-07 冻结（Codex agree）——v1 只统一引擎自有呈现,不碰 content schema**：

1. **奖励事件通道（reforge 内部类型,非 content schema）**：`RewardEvent` =
   `{ kind: 'item', itemId, count } | { kind: 'money', delta }`，入账点（giveItem/giveMoney
   脚本命令、战斗偷窃 writeBackInventory、合成/使用结果、结算物品入账）在原有意图边界
   （worldMutationIntent / scriptMutationIntent）内发射事件；入账逻辑零改动，只加发射。
2. **统一 presenter 组件**：新 `reward-gain.ts`（「获得 X × N」横卷轴,基于 narration-scroll
   样式,原版 0x3E 语义）,替换两处引擎自有呈现——偷窃横幅（battle-core.ts:284 结果横幅）
   与物品使用/炼成框（item-use-result.ts）为同一组件;宝箱/剧情拾取保持内容驱动
   （作者脚本显式 narration,不走引擎 presenter,幂等天然成立）。
3. **giveItem 自动呈现 = v1.1 留口**（**诚实范围调整**）：giveItem 默认呈现需给脚本命令
   加可选字段（content schema 变更,跨包公共接口）——双审缺席下不动 schema,卡内注明
   「v1.1 待三贤恢复后评审:giveItem 显式 present 字段或旁白去重启发式」。
4. **结算屏不动**：战斗胜利结算屏（settlement.ts）结构保留,仅物品入账提示入口统一。
5. **覆盖矩阵（GLM 席位,待补审）**：giveItem / 宝箱旁白 / 偷窃 / 合成炼成 / 结算物品
   路径逐条;验收 = 引擎自有呈现全部走 reward-gain,无双 UI 并存。

### 已知风险

- 风险: 覆盖路径多，漏一条路径仍走旧 UI。
- 缓解: GLM 覆盖矩阵 + 统一 presenter 后旧 UI 入口删除（fail-closed）。
- 风险: 脚本旁白与自动提示重复。
- 缓解: v1 引擎自有呈现与内容旁白域分离（giveItem 保持静默,重复不可能）;
  v1.1 若做 giveItem 自动呈现再按幂等口径评审。
- 风险: 双审缺席下动 content schema。
- 缓解: v1 明确不碰 schema,涉及 schema 的 giveItem 呈现留 v1.1。

### 主审立场

- Reviewer: GLM（覆盖主审）+ Kimi（视觉抽审）
- 结论: **GLM agree（附 G1-G2）+ Kimi agree（附 K1-K3）**
- 必改项: 见 G1-G2 + K1-K3（build 准入钉）
- 是否建议进入 build: **双方同意进入 build（钉子均为验收钉，不阻塞准入）**

### 三方争议记录(按需)

- Codex: 2026-08-06 用户咨询后开卡；缺口 = giveItem 无呈现 + 提示 UI 两套。
- Kimi: **agree（2026-08-07，视觉/UX 抽审）**。详见「Kimi 设计抽审」。
- GLM: **agree（2026-08-07，覆盖矩阵主审）**。详见「GLM 设计压测」。

#### Kimi 设计抽审（2026-08-07，视觉/UX，额度恢复补审）：**agree（附 K1-K3 build 准入钉）**

**方法**：只读抽审；一手核现状两 UI 形态（battle-core.ts:284 notice 顶部居中横幅、
item-use-result.ts 已是 narrationTextUnits/drawScroll 卷轴系且「多产物逐个展示不压一行」
先例）、narration-scroll 样式基线。未修改实现。

**观感口径核实**：

1. **统一 presenter 观感成立**：被替换两处的现状已接近卷轴系——item-use-result 本就
   用 drawScroll/narrationTextUnits;偷窃 notice 是顶部居中横幅（对齐原版对话框提示）。
   统一为 reward-gain（narration-scroll 样式、原版 0x3E「获得 X」语义）是向原版标准
   呈现收敛,观感方向正确 ✓。
2. **v1 不动 schema 诚实** ✓（缺席不动跨包接口的纪律正确）。
3. **幂等域分离**：引擎呈现（偷窃/炼成）vs 内容旁白（宝箱脚本 narration）分离,
   重复不可能 ✓。

**K 钉（build 准入必落,增量于 G1-G2,不阻塞 agree）**：

- **K1（战斗内 reward-gain 观感）**：偷窃发生在战斗流程中——reward-gain 卷轴在战斗
  画面的位置/时长须与战斗节奏合（不打断结算流、不挡战斗画面关键区）。若卷轴样式在
  战斗中违和,备选 = 战斗内保留横幅形态但同组件（样式变体);视觉验收时战斗偷窃实测
  截图定。
- **K2（v1.1 giveItem 呈现口径预裁定）**：v1.1 评审时**优先显式 present 字段**
  （默认不呈现 = 现行为不变,作者显式开）,**不做旁白去重启发式**——启发式是猜测
  作者意图,双显/漏显风险不可控。UX 确定性原则。
- **K3（连续入账排队观感）**：快速连续入账（开箱多件/结算物品+钱）逐条展示（对齐
  item-use-result「逐个展示不压一行」先例 + 原版逐条 0x3E),不合并丢失;逐条固定
  时长 + 可按键跳过,防结算后长串卷轴拖尾。实现期定,验收看。

**结论**：**agree**。统一 presenter 观感口径正确;K1-K3 为 build 验收钉,不阻塞准入。
视觉验收（本席,build 后）:宝箱/偷窃/合成/结算提示一致截图 + 战斗内偷窃观感(K1)+
连续入账排队(K3)。

**边界**：本 agree 只准入 D14-3 build,不代表 done;giveItem 自动呈现留 v1.1。

#### GLM 设计压测（2026-08-07，覆盖矩阵主审）：**agree（附 G1-G2 build 准入钉）**

**方法**：只读设计压测；核实入账点现状（main.ts:2395 giveItem / :2413 giveMoney /
battle-core.ts:284 偷窃横幅 / item-use-result.ts / buildSettlement）、设计冻结的 RewardEvent 通道 +
统一 presenter + v1 范围。未修改实现。

**设计核实（成立）** ✅：
1. v1 范围诚实收敛：只统一**引擎自有呈现**（偷窃横幅 battle-core.ts:284 + item-use-result.ts →
   新 reward-gain.ts），不动 content schema（giveItem 自动呈现需给脚本命令加 present 字段 = 跨包
   公共接口变更，双审缺席下不动、留 v1.1）——范围纪律正确，不趁缺席塞 schema 改动。
2. RewardEvent 通道（reforge 内部类型）：`{kind:'item'|'money', ...}`，入账点在原有意图边界
   （worldMutationIntent/scriptMutationIntent）内发射、入账逻辑零改动——不破坏既有 async intent 纪律。
3. 宝箱/剧情拾取保持内容驱动（作者脚本显式 narration，不走引擎 presenter）：幂等天然成立
   （引擎不重复呈现脚本自写旁白）——这是"双 UI 并存"问题的正确解法（引擎只管自己的呈现，
   脚本旁白归内容）。
4. 结算屏不动（settlement.ts 结构保留，仅物品入账提示入口统一）——收敛到位。

**G 钉（build 准入必落，非 agree 阻塞）**：
- **G1（覆盖矩阵 5 路径逐条——GLM build 期冻结责任）**：giveItem / 宝箱旁白 / 偷窃 / 合成炼成 /
  结算物品 五路径必须逐条核实：入账点发射 RewardEvent + 引擎自有呈现走 reward-gain + 脚本旁白不重复。
  build 期 GLM 逐路径核对 + 单测。
- **G2（双 UI 并存门禁——验收核心）**：实现后必须验证**无双 UI 并存残留**——偷窃横幅与 item-use-result
  两处引擎自有呈现全部走 reward-gain，无 narration 卷轴与 item-use-result 同框；grep 确认旧呈现入口
  已替换/移除（不残留死代码路径）。这是本卡存在的根本目的（消灭双 UI），验收门禁。

**结论**：设计方向干净、v1 范围诚实（不动 schema）、RewardEvent 不破坏 intent 纪律、宝箱旁白幂等解法正确。
**agree**。G1（5 路径覆盖矩阵）、G2（双 UI 并存门禁）为 build 准入必落钉——GLM 席位 build 期逐条核。
giveItem 自动呈现留 v1.1 认可（待三贤恢复评审 present 字段 vs 去重启发式）。建议进入 build（blocked on Kimi）。

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件:
  - `packages/reforge/src/menu/reward-gain.ts`（新增:统一 presenter——drawRewardGainLine
    横卷轴(0x3E 语义) + drawRewardGainText 文本变体(战斗横幅,K1)）
  - `packages/reforge/src/menu/item-use-result.ts`（删 drawItemUseResult/盒+图标呈现;
    保留 buildItemUseResultEntries;新增 itemUseResultText 单行文本「炼成/炼出 X × N」）
  - `packages/reforge/src/main.ts`（itemUseResult 状态 → rewardGain 队列(逐条 1400ms);
    渲染改 drawRewardGainLine(96);canActivateScriptConfirm/输入模态分支改 rewardGain）
  - `packages/reforge/src/menu/reward-gain-queue.ts`（K3 rework：单 owner 顺序队列；timeout / advance /
    abort 单 settle；模态输入消费）
  - `packages/reforge/src/menu/reward-gain-queue.test.ts`（K3 fake-timer / 键位 / 多条 / abort 回归）
  - `packages/reforge/src/battle/battle-session.ts`（itemBanner 渲染改 drawRewardGainText
    同组件文本变体,位置/时长(1200ms)不变,K1）
  - `packages/reforge/src/menu/item-use-result.test.ts`（itemUseResultText 单测替换
    itemUseResultLineLayout 测）
- 实现摘要: 三方签后完成。RewardEvent 通道 v1 以「统一 presenter」形态落地——引擎自有
  呈现(偷窃横幅 + 物品使用/炼成)全部走 reward-gain;giveItem/宝箱旁白保持内容驱动
  (幂等天然);giveItem 自动呈现留 v1.1(K2 预裁定:显式 present 字段优先,不做启发式)。
  - 2026-08-08 K3 rework：移除 `showItemUseResults` 内不可跳过的裸 `setTimeout(1400)`；改由
    `RewardGainQueue.present()` 保序展示。Enter / Space 调 `advance()` 仅 settle 当前条；Esc 不绑定
    reward skip，外传给关闭 / 菜单；其它非跳过键仍被模态层消费。AbortSignal 清 timer / listener /
    current。呈现器与入账逻辑未改。
- 运行命令:
  - 红测：`pnpm --filter @type-pal/reforge exec vitest run src/menu/reward-gain-queue.test.ts` —— 模块
    未存在，1 suite fail；落实现后 4/4 通过。
  - `pnpm --filter @type-pal/reforge exec vitest run src/menu/reward-gain-queue.test.ts src/menu/item-use-result.test.ts`
    —— 6/6 通过。
  - `pnpm --filter @type-pal/reforge check`（81 files / 825 tests 通过）
  - `pnpm --filter @type-pal/reforge build` 成功
  - Kimi 键位裁决后：`pnpm --filter @type-pal/reforge exec vitest run src/menu/reward-gain-queue.test.ts`
    —— 5/5；`pnpm --filter @type-pal/reforge check` —— 81 files / 826 tests；build 成功。
  - `pnpm exec biome check packages/reforge/src/menu/reward-gain-queue.ts packages/reforge/src/menu/reward-gain-queue.test.ts`
    —— 2 files 无问题；`main.ts` 全文件仍有本卡前既存 import / format 债，留 OPS-RW1 统一收口，未做
    大范围机械格式化。
  - G2 门禁 grep:`drawItemUseResult|itemUseResultLineLayout` 非测试源码零命中(旧入口移除)
- 浏览器 / 手工检查: 初版 Playwright 双条 harness 证明队列 advance 不漏菜单；其中 Escape 推进属于
  Kimi 裁决前历史证据，现已由单测钉成 `handled=false` 且 current 不变。未为这一行键位调整重复启动
  浏览器；功能合同由定向 5 测 + package check 闭环。
- 跳过的检查及原因: 未重跑根 `pnpm lint`；当前已知 119 errors 属 OPS-RW1 门禁债，本增量新文件
  局部 Biome 已绿，未格式化用户 dirty 文档或 `main.ts` 全文件。

### 钉逐项对照(G1-G2/K1-K3)

- G1 覆盖矩阵 5 路径: ✅ giveItem(静默,内容驱动,未动) / 宝箱旁白(内容驱动,未动) /
  偷窃(battle itemBanner → drawRewardGainText) / 合成炼成(item-use-result →
  drawRewardGainLine 逐条队列) / 结算物品(settlement 结构未动)。GLM build 期逐路径
  核对待补(随 review)。
- G2 双 UI 门禁: ✅ 旧入口 drawItemUseResult/itemUseResultLineLayout 源码零残留,
  reward-gain 为唯一引擎自有呈现组件。
- K1 战斗内观感: ✅ 同组件文本变体(drawRewardGainText),位置/时长不变,视觉验收定。
- K2 v1.1 预裁定: ✅ 卡内记录——显式 present 字段优先,不做旁白去重启发式。
- K3 连续入账排队: ✅ 逐条固定 1400ms 展示(不合并)；Enter / Space 只跳当前条并消费同帧输入；
  Esc 不跳过且留给外层菜单；后续保序；abort 清理。fake-timer 5 测已钉。

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex（K3 功能输入 + 代码冻结后剧情奖励集中 E2E）
- 验证方式: GLM build 期核对 = 141d24e7 全 diff 核实 + G2 grep 零残留 + item-use-result 2 测 + reforge 821 无回归；Kimi 浏览器实测（PAL dev server 6051,chrome-devtools MCP 驱动,纯键盘合成事件 + canvas 定时裁剪取证）
- 截图 / 像素检查路径:
  - `output/playwright/d14-3-steal-banner.png` —— 战斗内偷窃成功「获得 十里香」白字横幅（drawRewardGainText 同组件文本变体,位置/时长 1200ms 不变;K1 ✓,与战斗节奏合,不打断回合流）
  - `output/playwright/d14-3-craft-scroll.png` —— 炼蛊皿合成「炼出 蛊」横卷轴（drawRewardGainLine,世界层 y=96,卷轴宽度随文字自适应,无截断;148 物品名即「蛊」）
  - `output/playwright/d14-3/scroll-t500.jpg` / `scroll-t1200.jpg` / `scroll-t2100.jpg` / `scroll-t3200.jpg` —— 合成后卷轴时序四帧:t+500/t+1200 卷轴在干净世界层可见（dispatchItemUse 先 `useMenu = closeUseMenu()` + `menu = CLOSED`,main.ts:3797-3798,展示窗内无菜单遮挡）;t+2100/t+3200 useMenu 重开、卷轴已收,无残留
  - `output/playwright/d14-3/k3-keyboard-queue-1280x720.png` —— Codex K3 rework 浏览器双条键盘
    初版 trace（Enter 第一条、Escape 第二条）；Escape 行为已被后续 Kimi 裁决取代，仅作为队列初版
    历史证据，不再作为当前键位验收证据。
  - 机读验证:合成 117→148 inventory 计数两次复核（117 -1 / 148 +1）
- 结论: 旧版 GLM 逻辑 accept + Kimi 视觉 accept 保留；Codex 已补 K3 输入闭环并落实最终键位。当前等待两席
  对 rework 增量重新确认。2026-08-08 用户新规生效后，不再要求 reviewer 重跑剧情视觉；既有截图
  作为历史证据复用，未来剧情观感统一进入集中 E2E。

## Review: 审查与返工

- Reviewer: GLM + Kimi
- 审查结论: Codex K3 rework 自验 accept；旧版 GLM / Kimi accept 仍是历史证据；最终增量双审由用户
  明确签字豁免，不冒签两席。
- 必须返工项: 无。OPS-RW1 集成后 Reforge 82 files / 842 tests、production build、根级检查与 Biome
  全绿；queue 的 timeout / Enter / Space / Esc / abort / 多条保序合同由 fake-timer 测试覆盖。
- Accept / rework: **done（2026-08-09，用户缺签豁免）**。

### GLM 实现复审（2026-08-07，覆盖矩阵 build 期核对）：**accept**

**方法**：只读复审;核 `141d24e7` 全 diff（reward-gain.ts 新 presenter + item-use-result.ts -61 旧呈现 +
battle-session.ts 偷窃横幅 + main.ts giveItem/giveMoney 接入 + item-use-result.test）；
G2 grep 残留检查;独立复跑 item-use-result 2 测 + reforge 全包 821 测。未修改实现。

**G1 五路径逐条核（本席设计审查的覆盖矩阵钉）** ✅：
- **giveItem/giveMoney**（世界路径）：main.ts 旧 `itemUseResult` 状态 → 新 `rewardGain`（:3715
  `{text, untilMs}` + :3749 `itemUseResultText(entry)` 转 reward-gain 文本 + 1400ms 展示）；
  canActivateScriptConfirm（:1218）+ 渲染分支（:4501-4505/4812）全改 rewardGain，旧状态零残留。
- **偷窃**（战斗路径）：battle-session.ts:2786 偷窃横幅从内联 `renderSpans` 改 `drawRewardGainText`
  （reward-gain 文本变体，战斗节奏位置/时长保留）。
- **合成/炼成**：走同一 itemUseResultText → rewardGain 路径（item-use-result.ts 保留 text 构造、
  仅删旧 draw/layout）。
- **结算物品**：settlement.ts 不动（设计明确 v1 不改结算屏结构），仅物品入账提示入口统一。
- **宝箱/剧情拾取**：保持内容驱动（作者脚本显式 narration，不走引擎 presenter）——幂等天然成立
  （引擎不重复呈现脚本旁白）。

**G2 无双 UI 并存门禁（验收核心）** ✅：
- grep `itemUseResultLineLayout`/`drawItemUseResult`/旧 narration-item-use 卷轴 → **零命中**
  （仅 reward-gain.ts 注释提到"消灭两套 UI"）。
- item-use-result.ts -61 行：旧 `drawItemUseResult`/`itemUseResultLineLayout` 全删，只留
  `itemUseResultText`/`buildItemUseResultEntries`（text 构造保留、呈现移除）。
- 即引擎自有呈现（偷窃 + 物品使用/炼成）全部走 reward-gain，无 narration 卷轴与 item-use-result 同框残留。

**reward-gain presenter 复用纪律** ✅：drawRewardGainLine 横卷轴（drawScroll + renderSpans，原版 0x3E 语义）
+ drawRewardGainText 文本变体（白字带影，fight.c:2316 color15 语义）——两变体同源、不引第二套样式。

**独立复跑**：item-use-result 2/2 绿 + reforge 全包 **821/821 绿**（80 files，无回归）。与 Build 节自验一致。

**未实测（如实标注）**：浏览器视觉实测（四类提示观感一致 + 战斗内偷窃观感 K1 + 连续入账排队拖尾 K3）
本席未跑——本卡视觉抽验归 Kimi，IAB 渲染交互受限。五路径**入账/呈现逻辑层**已由代码核实 + 单测覆盖;
观感门禁（卷轴样式一致性、战斗横幅节奏、排队无拖尾）留 Kimi。

**结论**：**accept**。G1（五路径逐条）+ G2（无双 UI grep 零残留）闭环；reward-gain presenter 复用纪律对；
reforge 821 无回归。giveItem 自动呈现留 v1.1（K2 预裁定已记）。浏览器视觉实测留 Kimi；
本 accept 连同 Kimi 视觉 + Codex 收口 + 用户验收后 done。

### Kimi 视觉抽验与实现复审（2026-08-08，视觉/UX 席）：**accept**

**方法**：只读复审 + 浏览器实测。diff 层独立核 141d24e7（reward-gain.ts 两函数、
battle-session 偷窃横幅换同组件文本变体、main.ts rewardGain 队列 1400ms 逐条）；
G2 grep 独立复跑零残留；reforge 821 复跑绿。浏览器实测走 chrome-devtools MCP
（合成键盘事件 + canvas 定时裁剪;游戏本体纯键盘,鼠标点画布无输入——道具菜单无鼠标支持,
已核 menu 源码确认;dev 面板开着时 Esc 被 capture 抢占只关面板,D13-1 既有语义,取证前须先关面板）。

**K 钉逐项**：

- **K1（战斗内偷窃观感）✓**：`?skill=377&battle=11` 飞龙探云手偷 enemy-400,成功横幅
  「获得 十里香」白字带影居中(drawRewardGainText,fight.c:2316 color15 语义),位置/时长与旧
  itemBanner 完全一致,不挡战斗关键区、不打断回合节奏。截图 `d14-3-steal-banner.png`。
- **K2（v1.1 预裁定）✓**：卡内已记,实现未越界做 giveItem 自动呈现。
- **K3（连续入账排队）△ 记录项**：1400ms 逐条常量与队列结构 diff 已核;
  PAL 合成(117→148)与偷窃均为单产物,多入账排队拖尾无实机场景可验——观感留待首个
  多产物内容出现时抽验,不阻塞本卡。

**合成卷轴时序（本卡唯一新增世界层呈现路径,重点取证）**：

- 实测:`?debug=1&give=268` + debug console `give 117`,菜单→物品→使用→炼蛊皿,
  first-match 配方 117→148 合成成功(inventory 机读两次复核:117 -1 / 148 +1)。
- 时序四帧:`scroll-t500/t1200` 卷轴「炼出 蛊」在干净世界层可见;t+2100/t+3200 useMenu
  重开、卷轴已收。机制核实:dispatchItemUse 入口即 `closeUseMenu()` + `menu = CLOSED`
  (main.ts:3797-3798),展示窗 1400ms 内无菜单遮挡;finishUseExecution 重开面板时卷轴
  恰好到期收口。评审中曾怀疑「卷轴被 useMenu 盖住」——证伪,非缺陷。
- 卷轴观感:横卷轴 + 黑字「炼出 蛊」,宽度 narrationTextUnits 自适应,无截断
  (148 物品名即单字「蛊」)。截图 `d14-3-craft-scroll.png`。

**一致性口径**：被统一的两处引擎自有呈现（偷窃横幅/使用炼成结果）实测均走 reward-gain,
样式与 narration 卷轴系一致;宝箱/剧情旁白（内容驱动）与结算屏（结构未动）呈现路径未改,
观感基线不变,不存在「双 UI 同框」场景。

**结论**：**accept**。视觉观感门禁闭环;K3 留记录项。done 准入 blocked on Codex 收口 + 用户验收。

## 用户验收

- 用户结论: 2026-08-09 明确“签了”，批准 D14-3 收口并豁免 Kimi / GLM 对 K3 最终增量的 re-review。
- 后续任务: giveItem 自动呈现仍按既定范围留 v1.1（优先显式 `present` 字段）；宝箱 / 偷窃 / 合成 /
  结算观感按新规进入代码冻结后的集中 E2E，不在开发期重复截图。

## 交接日志

- 2026-08-06 Codex: 开卡。现状：giveItem 只入账不呈现；提示 UI 有 narration 卷轴 /
  item-use-result 框两套 + 战斗横幅 + toast。
- 2026-08-07 Codex: 设计冻结并签 agree。RewardEvent 内部通道 + 统一 reward-gain
  presenter（偷窃/炼成替换）;宝箱/剧情旁白内容驱动幂等天然;giveItem 自动呈现 v1.1
  留口（涉 content schema,双审缺席不动）;Kimi/GLM 缺席待补审,缺签豁免用户批准。
- 2026-08-07 Kimi/GLM: 额度恢复补签——设计三方 agree 齐(G1-G2 + K1-K3 build 验收钉),
  build 准入 allowed。
- 2026-08-07 Codex: 实现完成并自证——reforge 821 + build + G2 grep 零残留;reward-gain
  统一 presenter(世界卷轴 + 战斗文本变体);G1-G2/K1-K3 逐项落地(见 Build 节钉对照)。
  待 Kimi 视觉抽验 + GLM build 期逐路径核对 + 双审 review。
- 2026-08-07 GLM: 额度恢复补审,设计 agree（G1 五路径矩阵、G2 双 UI 并存门禁）。
- 2026-08-07 Kimi: 额度恢复补审,视觉/UX 抽审 **agree（附 K1-K3）**——三方 agree 齐,
  **build 准入 allowed**。K1 战斗内 reward-gain 观感（违和备选=横幅形态同组件变体）、
  K2 v1.1 预裁定（显式 present 字段优先,不做去重启发式）、K3 连续入账逐条排队+
  可跳过（对齐 item-use-result 逐个展示先例）。详见「Kimi 设计抽审」。Next: Codex build。
- 2026-08-07 Codex: 实现完成并自证——reward-gain 统一 presenter(横卷轴 + 战斗文本变体);
  偷窃横幅/炼成框旧呈现移除;giveItem 自动呈现 v1.1 留口(K2 预裁定已记);reforge 821 +
  G2 grep 零残留。待 Kimi/GLM review 签字。
- 2026-08-07 GLM（覆盖矩阵 build 期核对）: 签 **accept**。核 141d24e7 全 diff + G2 grep
  零残留 + 独立复跑 item-use-result 2 测 + reforge 821 无回归;**G1 五路径逐条核**
  （giveItem/giveMoney 走 rewardGain 状态、偷窃 drawRewardGainText、合成炼成同路径、结算屏不动、
  宝箱内容驱动幂等）+ **G2 无双 UI 并存门禁**（旧 itemUseResultLineLayout/drawItemUseResult 零命中、
  item-use-result -61 行旧呈现全删）。reward-gain presenter 复用纪律对（横卷轴 + 文本变体同源）。
  浏览器视觉实测（四类提示观感 + 战斗偷窃 + 排队拖尾）留 Kimi。done 前签字 GLM 行补本席 accept。
  详见「GLM 实现复审」。
- 2026-08-08 Kimi（视觉抽验）: 签 **accept**。浏览器实测闭环——K1 偷窃横幅
  （`d14-3-steal-banner.png`,战斗白字同组件文本变体,位置/时长不变）;合成卷轴
  （`d14-3-craft-scroll.png`「炼出 蛊」+ `d14-3/scroll-t500~t3200` 时序四帧,
  证实 dispatchItemUse 先关菜单后展示、1400ms 窗内无遮挡、finishUseExecution 重开面板时
  卷轴已收口,此前「卷轴被 useMenu 遮挡」疑点证伪非缺陷）;合成 inventory 机读两次复核。
  K3 排队拖尾留记录项（PAL 单产物场景无实机可验,常量/结构 diff 已核,不阻塞）。
  GLM + Kimi 双 accept 齐,done 准入 blocked on Codex 收口 + 用户验收。
  详见「Kimi 视觉抽验与实现复审」。Next: Codex done 前收口签字。
- 2026-08-08 Codex（done 前复核）: 签 **counter**。发现 K3 的“可按键跳过”未实现：展示循环只
  `setTimeout(1400)`，输入分支只吞键；现有两席 accept 未覆盖真实多条 advance / abort 行为。
  Status 转 rework。Next: Codex 在既有三方 agree 设计内补 K3 + targeted tests + 浏览器输入闭环，
  再交 Kimi / GLM 复审增量；不得标 done。
- 2026-08-08 Codex（K3 rework）: counter 已解决并签 **accept**。新增 `RewardGainQueue`，把 1400ms
  timeout、Enter / Space / Esc advance、AbortSignal 合并为单 settle；跳过只推进当前条，模态 handler
  同帧返回 handled 防菜单泄漏。Evidence: 红→绿 4 测；Reforge 81 files / 825 tests；build；Playwright
  双条 trace `handled=true×2 / leaks=0 / done=true`，截图
  `output/playwright/d14-3/k3-keyboard-queue-1280x720.png`。Status → review。Next: Kimi / GLM 只读
  复审 K3 增量并签 re-accept 或 counter；不得标 done。
- 2026-08-08 Codex（Kimi 键位裁决跟进）: OPS-RW1 Kimi 明确 Enter / Space 跳过、Esc 保留关闭 /
  菜单语义。已从 advance keys 移除 Escape，handler 对 Esc 返回 false 且不 settle；新增 Esc 外传回归。
  Evidence: queue 5/5，Reforge 81 files / 826 tests，build。旧 Escape 浏览器 trace 降为历史证据，未重复
  启动浏览器。Next: Kimi / GLM 按最终两键合同 re-review；不得标 done。
- 2026-08-09 Codex（OPS-RW1 集成复验）: D14-3 增量随 Reforge 全包 82 files / 842 tests、production
  build、根级全包检查与 Biome 通过；剧情奖励视觉按用户新规未重复执行。Next: 用户决定是否批准
  Kimi / GLM 最终增量 re-review 缺签豁免。
- 2026-08-09 User: 明确“签了”，批准 D14-3 收口及 Kimi / GLM K3 增量 re-review 缺签豁免；不得
  记作两席本人 re-accept。Status → done。Next: giveItem `present` 留 v1.1，剧情奖励观感进集中 E2E。

## 下一位 Agent 提示词

无下一位 Agent 提示词；任务已按用户缺签豁免收口，等待集中 E2E / v1.1 另行开卡。
