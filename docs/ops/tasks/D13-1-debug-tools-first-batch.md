# D13-1 - 调试工具首刀（议题 13）

Status: draft
Phase: phase2
Capability: 议题 13 开发/调试工具（P1 工具层）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi（工具架构）+ GLM（覆盖/矩阵）
Visual Verification Owner: Kimi
Unavailable Agents: none
Branch: TBD

## 目标

把「创作验证」升级为「调试器」：cheat console、世界变量检视、任意脚本/触发器按 id 触发、
战斗态构建器（任选敌队/成员装备/等级/HP/MP/异常状态/道具）、触发区可视化、帧步进。

## 范围

- 范围内:
  - cheat console（命令行：跳场景/给物品/金钱/状态/运行脚本）。
  - 世界变量/脚本状态检视器。
  - 按脚本/触发器 id 任意触发（补齐「触发任意脚本」能力）。
  - 战斗态构建器：敌队自由组合 + 成员装备/等级/HP/MP/异常状态/道具预设（内存态，不落档）。
  - 触发区可视化（现有 ?collision 的扩展）。
  - 帧步进（依赖注入时钟，gameplay-clock 已具备基础）。
- 范围外:
  - 时间旅行 / effect 溯源回放：**依赖 D14-2 的 effect 协议**，协议落地后再开子卡。
  - 网络/多人调试。
- 明确不做:
  - 不做编辑器内嵌调试器 UI（工具先以 URL 参数 + 浏览器 console + 页面 overlay 形式）；
    编辑器集成入口另议。

## 上下文锚点

- 已拍板决策 / 铁律:
  - D2「意图→纯函数判定→结果」红线；注入时钟基础已有。
  - 议题 13 backlog 方向（时间旅行/帧步进/可视化/console/检视器）。
- 代码锚点:
  - `packages/reforge/src/main.ts:319/4304`（?collision 可视化）、`:1099-1125`（?scene/?pos/
    ?facing）、`:5090-5157`（?battle/?skill/?give/?field/?party）、`:4566/4580`
    （debugLog/debugPlayers）、`gameplay-clock.ts`。
  - 编辑器 `play.ts`（同源试玩页，URL 参数原样生效）。
- 已知坑 / 审计文档:
  - 一阶段 `__tpgs` 调试口先例（main.ts 注释）；DEV-only 入口纪律。
- 不得重新引入:
  - 调试状态落档/污染存档（全部内存态）。
  - 生产路径依赖调试分支（DEV-only guard）。
- 相关测试:
  - gameplay-clock / script-runner 现有单测。

## 验收条件

- 功能:
  - cheat console 常用命令可用；世界变量检视实时可见。
  - 任意脚本/触发器 id 可一键触发（同脚本语义执行，AbortSignal 可取消）。
  - 战斗态构建器可组任意敌队 + 任意成员预设开局（内存态），可回归默认。
  - 触发区可视化叠加层；帧步进可单步观察。
- 测试:
  - 每条能力的 e2e/手动路径；DEV guard 单测（生产构建不含调试分支）。
- 文档:
  - 调试命令速查入 docs（dev-tools.md）；backlog 议题 13 状态更新。
- 视觉 / 手工验证:
  - Kimi 浏览器实测战斗构建器与触发区可视化。

## 推进签字

### 进入 build 前:设计签字

- Codex: agree（2026-08-06 设计冻结，见「设计结论」）
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

**2026-08-06 冻结（Codex agree）**：

1. **入口形态**：`?debug` 打开 DEV overlay 面板；现有 URL 参数（?scene/?pos/?battle/?skill/
   ?give/?party/?collision）全部保持兼容。面板含五个区：命令输入（cheat console）、
   世界变量树（只读检视）、脚本/触发器列表（一键触发）、战斗构建器表单、图层开关
   （碰撞/触发区）。全部 `import.meta.env.DEV` guard，生产构建不含。
2. **cheat console**：命令注册表模式（命令名 → 执行器），复用现有 host 能力
   （giveItem/giveMoney/setAmbience/startBattle/脚本触发），不新建执行路径。
   命令集：help / scene / pos / give / money / party / skill / battle / field /
   run-script / run-trigger / state / var。
3. **世界变量检视**：只读快照树（world 状态：money/inventory/party/entity 态），
   overlay 树形展示；只读、不落档。
4. **任意脚本/触发器触发**：枚举 canonical project 的 script refs（shared + scene）与
   触发器，列表点击 → 走 `runSharedScript` / `runEntityBehavior` / `startScript`
   同一执行器（main.ts:3715 先例）；主 runner 独占规则不变（有活跃演出时提示排队/拒绝）；
   AbortSignal 可取消。
5. **战斗态构建器**：表单 = 战场 field + 敌队（选现成 team 或从 enemiesById 自由多选组合）+
   我方成员（从 actors 多选，逐成员设等级/HP/MP/装备/道具/异常状态）→ 生成 dev-only
   battle opts（enemyOverride / partyPreset），走同一 `startBattle` 入口
   （main.ts:2152 扩展可选参数），内存态不落档，结束回触发前世界。URL 兼容
   （?battle 语义不变）。
6. **触发区可视化**：在 ?collision 叠加层上扩展触发器范围框 + 标签；仅 DEV。
7. **帧步进**：gameplay-clock 加 dev 暂停/单步（worldMoveAcc 暂停累积，按键强制一拍）；
   放本卡尾段，若复杂度超标拆独立子项。

范围边界重申：时间旅行/effect 回放不做（依赖 D14-2）；调试状态一律内存态；
生产路径零调试分支。

### 已知风险

- 风险: 战斗态构建器与 startBattle 正常路径分叉，行为漂移。
- 缓解: 构建器只覆写参数（enemyOverride/partyPreset），走同一 battle session 入口
  （复用 ?battle 现有路径）。
- 风险: 调试分支进生产。
- 缓解: DEV-only guard + 构建门禁。
- 风险: 任意脚本触发与主脚本并发冲突。
- 缓解: 复用独立 runner 先例（runDetachedV5ScriptChain）或活跃演出时拒绝并提示。

### 主审立场

- Reviewer: Kimi（工具架构）+ GLM（覆盖）
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending

### 三方争议记录(按需)

- Codex: 2026-08-06 用户咨询议题 13 后开卡；首刀范围如上，时间旅行留 D14-2 之后。
  同日冻结设计并签 agree（入口=DEV overlay + URL 兼容；战斗构建器=startBattle 参数扩展）。
- Kimi: pending
- GLM: pending

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: pending；设计三签前不得开始实现。
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending（Kimi 视觉验收）
- 跳过的检查及原因: 时间旅行回放（依赖 D14-2，明确跳过）

## 视觉验证记录(如适用)

- Visual Verification Owner: Kimi
- 验证方式: pending
- 截图 / 像素检查路径: pending
- 结论: pending

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: pending

## 交接日志

- 2026-08-06 Codex: 开卡。现状：?scene/?battle/?skill/?give/?party/?collision 已有；
  缺 console/检视/任意触发/战斗态构建/触发区可视化/帧步进；时间旅行依赖 D14-2。
- 2026-08-06 Codex: 设计冻结并签 agree。DEV overlay 五区 + 命令注册表 + 脚本/触发器
  枚举触发 + startBattle 参数扩展（enemyOverride/partyPreset）+ 触发区可视化 + 帧步进；
  时间旅行留 D14-2 之后；Kimi/GLM 待压测签字。

## 下一位 Agent 提示词

```text
接手任务: D13-1 调试工具首刀
任务卡: docs/ops/tasks/D13-1-debug-tools-first-batch.md
当前状态: draft（build 准入 blocked；Codex 设计冻结并签 agree，见「设计结论」）
你的角色: Kimi 工具架构/并发语义主审；GLM 覆盖矩阵主审
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡、main.ts:319/1099/4304/5090/4566、
  gameplay-clock.ts、编辑器 play.ts
已完成: Codex 设计冻结——DEV overlay 五区 + 命令注册表 + 脚本/触发器枚举触发 +
  startBattle 参数扩展（enemyOverride/partyPreset）+ 触发区可视化 + 帧步进；全部 DEV-only
请你做: Kimi 压测入口形态、战斗构建器与 startBattle 并发/取消语义、任意脚本触发的
  runner 独占规则、DEV guard 边界；GLM 复核命令集/覆盖矩阵与验收样例；
  冻结方案后写 agree，或 counter + 必改理由
不要做: 不得修改实现文件；不得让调试状态落档/污染生产路径
输出要求: 更新设计签字、主审立场、争议处理和下一位提示词
```
