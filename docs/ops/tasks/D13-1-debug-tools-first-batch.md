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

- Codex: pending
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

待冻结。方向：URL 参数拐杖升级为统一调试入口（console 命令解析 + overlay 面板），
战斗态构建器复用 startBattle 数据路径做内存态覆写。

### 已知风险

- 风险: 战斗态构建器与 startBattle 正常路径分叉，行为漂移。
- 缓解: 构建器只覆写参数，走同一 battle session 入口（复用 ?battle 现有路径）。
- 风险: 调试分支进生产。
- 缓解: DEV-only guard + 构建门禁。

### 主审立场

- Reviewer: Kimi（工具架构）+ GLM（覆盖）
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending

### 三方争议记录(按需)

- Codex: 2026-08-06 用户咨询议题 13 后开卡；首刀范围如上，时间旅行留 D14-2 之后。
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

## 下一位 Agent 提示词

```text
接手任务: D13-1 调试工具首刀
任务卡: docs/ops/tasks/D13-1-debug-tools-first-batch.md
当前状态: draft（build 准入 blocked）
你的角色: Kimi 工具架构主审；GLM 覆盖矩阵主审
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡、main.ts:319/1099/4304/5090/4566、
  gameplay-clock.ts、编辑器 play.ts
已完成: 开卡（首刀范围 = console/检视/任意触发/战斗构建器/触发区可视化/帧步进），设计未冻结
请你做: 压测调试入口形态、战斗态构建器复用路径、DEV guard 边界；时间旅行为何留到 D14-2
  之后的判定；冻结方案后 agree/counter
不要做: 不得修改实现文件；不得让调试状态落档/污染生产路径
输出要求: 更新设计签字、主审立场、争议处理和下一位提示词
```
