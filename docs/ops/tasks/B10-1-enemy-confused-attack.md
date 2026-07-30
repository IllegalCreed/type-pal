# B10-1 - 混乱敌人攻击同伴

Status: draft
Phase: phase2
Capability: B4 / B5 / B10
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Unavailable Agents: none
Branch: main

## 目标

修复 Reforge 中敌人处于“乱”状态后仍照常施法、变身、召唤、逃跑或攻击玩家的问题。敌人混乱时必须按一阶段机制真值从全敌槽拒绝死/空后抽取一个活敌，抽到自己则本回合跳过，抽到同伴则走专用伤害公式和专用演出。

## 范围

- 范围内:
  - battle-core 敌人混乱决策、结算和 `lastAction` 证据。
  - battle-session 专用表现路由。
  - battle-anim 专用滑步、命中特效、受击抖动和复位时间线。
  - core / session / animation 回归测试。
- 范围外:
  - 玩家混乱行为；现有有意偏离不改。
  - content schema、存档、迁移器、编辑器和世界实体生命周期。
  - backlog 18b / W9 的明雷逃跑冷却和怪物重现。
- 明确不做:
  - 不把混乱攻击同伴塞进普通敌人物攻链。
  - 不用“随机另一只敌人”替代“包含自己、抽到自己 Pass”。
  - 不增加 jitter、暴击、格挡、援护、护体、附毒或攻击音。

## 上下文锚点

- 已拍板决策 / 铁律:
  - 用户于 2026-07-30 要求游戏机制直接参考一阶段 `docs/phase1/game-mechanics.md` 已核实真值，不得猜测。
  - `docs/phase2/READ-FIRST.md` 铁律 9：战斗/数值/机制真值以 `game-mechanics.md` 为首选，一阶段实现同时是演出 UX 真值。
  - 本任务涉及伤害公式，按高风险任务开卡；三方设计签字前不得修改实现文件。
- 代码锚点(`file:line`):
  - `docs/phase1/game-mechanics.md:833-883`：敌人混乱选目标和伤害真值。
  - `reference/sdlpal/fight.c:4489-4517`、`reference/sdlpal/fight.c:4578-4654`：原始目标选择、结算和演出。
  - `packages/game/src/core/battle/enemy-ai.ts:68-117`：一阶段全槽拒绝采样、自身 Pass 与状态优先级。
  - `packages/game/src/core/battle/actions/attack.ts:464-524`：一阶段专用公式与结算。
  - `packages/game/src/core/battle/anim-timeline.ts:1170-1240`：一阶段专用动画。
  - `packages/reforge/src/battle/battle-core.ts:639-646`、`:727-746`、`:2133-2253`：当前 decision、AI 与敌行动。
  - `packages/reforge/src/battle/battle-session.ts:2032-2074`：当前只处理玩家 `attackMate` 的表现路由。
  - `packages/reforge/src/battle/battle-anim.ts:1-100`：Reforge 动画帧模型。
- 已知坑 / 审计文档:
  - `projects/pal/content/skills.json` 的鬼降会对敌人施加 `confused`，缺口真实可达。
  - 当前 ready hook 已禁止 confused 敌执行，`applyEnemyEffect` 也禁止其变身/召唤；普通 AI 决策仍漏掉混乱分支，必须在 rules/fallback 前截断。
  - 一阶段按全敌槽拒绝死/空采样，不能先构造活敌列表，否则分布虽同但 RNG 消耗不同。
  - 一阶段稳健处理物抗 0 为“不除”；当前 PAL 153 个敌人物抗实际最小 1、最大 99、零值 0 个，但编辑器/测试仍可构造 0。
- 不得重新引入:
  - 抽到自己后重抽。
  - 让混乱敌继续跑 AI rules / fallback。
  - 用钳后 HP 差显示超杀伤害；真值显示完整公式伤害，HP 自身钳到 0。
  - 借本任务改变玩家混乱或全局普通敌 AI 的 RNG 契约。
- 相关测试:
  - 一阶段 `packages/game/src/core/battle/__tests__/enemy-ai.test.ts:158-210`。
  - 一阶段 `packages/game/src/core/battle/__tests__/actions.test.ts:953-975`。
  - 一阶段 `packages/game/src/core/battle/__tests__/anim-timeline.test.ts:1357-1405`。

## 验收条件

- 功能:
  - sleep/paralyzed 优先 Pass；无活玩家保持当前战斗结束边界；confused 在任何 AI rule/fallback 前截断。
  - 从完整敌槽 `[0..max]` 抽取，死/空拒绝重抽；包含自己，抽到自己直接 Pass。
  - 专用公式精确为：
    - `str = SHORT(attacker.attackStrength) + (attacker.level + 6) * 6`
    - `def = SHORT(target.defense) + (target.level + 6) * 4`
    - `damage = calcBaseDamage(str, def) * 2 / target.physicalResistance`
    - 物抗非 0 时整数截断；0 时不除；结果 `<= 0` 保底 1；HP 钳到 0。
  - `lastAction` 保留目标敌槽和完整公式伤害；击杀仍进入既有奖励/胜利检查。
  - 专用动画 12 帧：3 帧递归中点滑步、effect 9/10/11、4 帧目标抖动/首帧伤害数字、Delay5、攻击者复位 Delay2；无声音。
- 测试:
  - 决策覆盖选同伴、选自己、仅自己、死/空槽拒绝重抽、失能优先、AI rule 被绕过。
  - 结算覆盖标准值、高防保底 1、物抗截断、物抗 0、超杀数字、无额外 RNG 和无普通防御链。
  - 动画逐帧断言 midpoint、overlay、抖动、数字、时长与最终复位。
  - session 证明 enemy `attackMate` 进入专用 timeline，不落普通敌人物攻。
- 文档:
  - 更新 `design-backlog` 18a 与 capability-map B10 备注；任务卡记录验证证据。
- 视觉 / 手工验证:
  - 用可施加“乱”的 PAL 技能实际打一场多敌战斗，观察敌人可能攻击同伴或空过；console 无新增错误。

## 推进签字

### 进入 build 前:设计签字

- Codex: agree（2026-07-30；一阶段目标、公式、动画与测试锚点完整，改动可限定在 Reforge 战斗三层）
- Kimi: pending
- GLM: pending
- counter / 分歧处理: N/A
- 缺签豁免: N/A
- build 准入结论: blocked

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

1. `EnemyDecision` 增加内部 `attackMate` 形态，携 `targetEnemyIdx`；不改 content schema。
2. `decideEnemyAction` 在既有 `canAct` / 无活玩家门之后、构建 AI view 之前处理 confused。按完整 `s.enemies` 槽拒绝 `hp <= 0`，64 次仅作异常 RNG fail-safe；抽到自身返回 Pass。
3. `performEnemyAction` 为 `attackMate` 走独立 helper，使用局部 SHORT cast 与 `calcBaseDamage`；结算后把完整公式伤害写入内部 `lastAction.damage`。
4. `battle-session` 在通用非 attack 过滤前识别敌方 `attackMate`，读取双方 `basePos`、目标 frame0 高度与已结算 damage，调用专用 builder。
5. `battle-anim` 按一阶段 12 帧 UX 真值移植；不复用普通攻击音、攻击帧或防御表现。
6. 不额外模拟原始 C 函数在 confused 分支前那次最终丢弃的玩家目标抽签，以免暗改 Reforge 新 AI 的全局 RNG 契约；混乱分支自身的全槽拒绝采样严格照一阶段实现。若审查方认为逐 seed 对拍必须包含该抽签，应 `counter` 并交用户裁决。

### 已知风险

- 风险: `lastAction.target` 当前在敌行动中通常表示玩家槽，新增同伴攻击后语义依赖 kind。
- 缓解: decision 使用显式 `targetEnemyIdx`，session 仅在 `side=enemy && kind=attackMate` 时按敌槽解释；补类型和路由负测。
- 风险: 超杀显示值与 HP diff 不同。
- 缓解: 结算时记录完整 `damage`，动画不事后从 HP diff 推导。
- 风险: 伤害公式可能被误接到普通物理函数。
- 缓解: 测试用 defending/protect/固定 RNG 证明普通链完全未参与。

### 主审立场

- Reviewer: Kimi（战斗分层/表现路由）+ GLM（公式/覆盖矩阵）
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending

### 三方争议记录(按需)

- Codex: 只照一阶段 confused 分支的全槽拒绝采样，不引入原始函数在分支前被丢弃的玩家目标 RNG 抽签。
- Kimi: pending
- GLM: pending
- 用户拍板: 2026-07-30，一阶段游戏机制文档是真值，不得猜测。

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: pending；设计三签前不得开始实现。
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: N/A

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: pending

## 交接日志

- 2026-07-30 Codex: 对照一阶段机制文档、实现与 SDLPal 完成只读审计；确认缺口覆盖 decision、结算、lastAction、session 路由和专用动画，而非单一 if 分支。Next: Kimi / GLM 设计签字；R13-5 候选形成且本卡三签后实现。

## 下一位 Agent 提示词

```text
接手任务: B10-1 混乱敌人攻击同伴
任务卡: docs/ops/tasks/B10-1-enemy-confused-attack.md
当前状态: draft（build 准入 blocked）
你的角色: Kimi 审战斗分层/表现路由；GLM 审公式真值/测试覆盖
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本任务卡、docs/phase1/game-mechanics.md:833-883，以及任务卡列出的一阶段实现和 fight.c 锚点
已完成: Codex 已完成只读全链审计并冻结目标选择、专用公式、12 帧动画与测试矩阵
请你做: 独立核对设计；在任务卡写 agree，或 counter + 必改理由
不要做: 不得修改实现文件，不得改变玩家混乱、content schema、迁移器或 W9 生命周期，不得在三签前标 build
输出要求: 更新设计签字、主审立场、争议处理和下一位提示词
```
