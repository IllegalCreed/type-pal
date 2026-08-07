# D14-3 - 奖励/事件总线统一收尾（议题 14 剩余③）

Status: draft
Phase: phase2
Capability: 议题 14 剩余③ 奖励/事件（物品提示两套 UI 统一）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: GLM（覆盖矩阵主审）+ Kimi（视觉/UX 抽审）
Visual Verification Owner: Kimi
Unavailable Agents: none（2026-08-07 GLM/Kimi 均已恢复,补审中）
Branch: TBD

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
  - Kimi 浏览器实测宝箱/偷窃/合成/战斗结算提示一致。

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

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

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
- 修改文件: pending；设计三签前不得开始实现。
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending（Kimi 视觉验收）
- 跳过的检查及原因: N/A

## 视觉验证记录(如适用)

- Visual Verification Owner: Kimi
- 验证方式: pending
- 截图 / 像素检查路径: pending
- 结论: pending

## Review: 审查与返工

- Reviewer: GLM + Kimi
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: pending

## 交接日志

- 2026-08-06 Codex: 开卡。现状：giveItem 只入账不呈现；提示 UI 有 narration 卷轴 /
  item-use-result 框两套 + 战斗横幅 + toast。
- 2026-08-07 Codex: 设计冻结并签 agree。RewardEvent 内部通道 + 统一 reward-gain
  presenter（偷窃/炼成替换）;宝箱/剧情旁白内容驱动幂等天然;giveItem 自动呈现 v1.1
  留口（涉 content schema,双审缺席不动）;Kimi/GLM 缺席待补审,缺签豁免用户批准。
- 2026-08-07 GLM: 额度恢复补审,设计 agree（G1 五路径矩阵、G2 双 UI 并存门禁）。
- 2026-08-07 Kimi: 额度恢复补审,视觉/UX 抽审 **agree（附 K1-K3）**——三方 agree 齐,
  **build 准入 allowed**。K1 战斗内 reward-gain 观感（违和备选=横幅形态同组件变体）、
  K2 v1.1 预裁定（显式 present 字段优先,不做去重启发式）、K3 连续入账逐条排队+
  可跳过（对齐 item-use-result 逐个展示先例）。详见「Kimi 设计抽审」。Next: Codex build。

## 下一位 Agent 提示词

```text
接手任务: D14-3 奖励/事件总线统一收尾实现（三方 agree 齐,build allowed）
任务卡: docs/ops/tasks/D14-3-reward-event-bus.md
当前状态: draft → build 准入 allowed(Codex/GLM/Kimi 三方 agree,2026-08-07)。
你的角色: Coding Owner——build 阶段唯一实现文件修改者。
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡全文(设计结论 + GLM G1-G2 + Kimi K1-K3);
  main.ts:1811/2493/3645、battle-core.ts:284(notice 横幅)、item-use-result.ts、
  narration-scroll.ts、dialog-box.ts:248。
必落钉(build 验收逐项核):
  - G1(GLM build 期冻结): 五路径(giveItem/宝箱旁白/偷窃/合成炼成/结算物品)逐条
    入账点发射 RewardEvent + 引擎呈现走 reward-gain + 脚本旁白不重复。
  - G2: 双 UI 并存门禁——偷窃横幅/item-use-result 全走 reward-gain,grep 无旧入口
    残留死代码。
  - K1: 战斗内 reward-gain 位置/时长与战斗节奏合;违和则战斗内横幅形态同组件变体,
    视觉验收定。
  - K3: 连续入账逐条排队(不压一行)+ 固定时长 + 可按键跳过。
  - 设计结论全项: RewardEvent 仅 reforge 内部类型(不动 content schema);入账逻辑零改动
    只加发射;giveItem 保持静默(v1.1 留口);结算屏结构保留。
纪律: 不改 giveItem 时序语义;不引入异步奖励队列改变时序;不第三套提示 UI;
  不入账与呈现耦合(呈现器不写 world)。
验收输出: 实现摘要 + G/K 钉逐项对照 + 测试证据;回卡交 GLM/Kimi review 签字;
  Kimi 视觉验收(宝箱/偷窃/合成/结算提示一致 + 战斗偷窃观感 + 连续入账排队)。
```

```text
接手任务: D14-3 奖励/事件总线统一收尾（设计补审）——已执行完毕,勿再执行
说明: 本提示词为历史记录,GLM/Kimi 已于 2026-08-07 额度恢复后补审签 agree
  (G1-G2 + K1-K3),三方 agree 齐,build 准入 allowed。请改用上方实现提示词。
```
