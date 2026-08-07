# D15-1 - NPC 移动补全：动态碰撞 + 互相让路 + 转向动画（议题 15）

Status: draft
Phase: phase2
Capability: 议题 15 NPC 自主移动（P1 引擎移动/碰撞/实体行为）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi（移动/碰撞架构主审）+ GLM（实体行为覆盖矩阵）
Visual Verification Owner: Kimi
Unavailable Agents: Kimi + GLM（2026-08-07 双额度耗尽；Codex 单 Agent 推进需用户批准）
Branch: TBD

## 目标

在已有 auto 巡逻基础上补全议题 15 剩余：NPC 移动不穿墙、不穿彼此（每帧动态碰撞），
玩家↔NPC 互相让路/错位避让（滑步而非硬卡），转向动画对齐原版手感。clean rewrite——
拿原版当手感灵感、不逐帧复刻。

## 范围

- 范围内:
  - 移动子系统碰撞校验：stepEntity / moveEntity / hostile chase 的每一步查墙 + 查实体
    （NPC 不重叠）。
  - 玩家↔NPC 互相让路：碰撞时滑步/错位避让而非硬挡（现状 main.ts:4529 硬挡）。
  - 转向动画与游走节奏（原版手感灵感）。
  - 与主脚本接管语义兼容（被接管实体暂停 auto 的既有规则不变）。
- 范围外:
  - auto 巡逻脚本模板（E2 已 done）、auto runner（M3b 已 done）。
  - hostile 明雷追逐引擎能力（已有，只补碰撞校验）。
- 明确不做:
  - 不逐帧复刻原版 NPCWalkOneStep 的全部细节；碰撞/避让以手感与不穿模为准。
  - 不改对话冻结 NPC 的既有拍板（2026-07-03：NPC 不感知对话）。

## 上下文锚点

- 已拍板决策 / 铁律:
  - 2026-07-03：NPC 移动与对话系统解耦（不复刻原版冻结怪癖）。
  - 议题 15 backlog 方向（动态碰撞 + 互相让路 + 转向动画；切片 1 不做、有巡逻场景再立项）。
- 代码锚点:
  - `packages/reforge/src/main.ts:2018`（stepEntity 无条件移 0.25 格）、`:1985-2015`
    （moveEntity 不校验可走性）、`:3262`（hostile chase 只查地图）、`:4529-4531`
    （玩家硬挡 collide 实体）。
  - `packages/reforge/src/collision.ts`（isBlockedAt / sameGrid）。
  - E2 卡（巡逻模板）、M3b auto runner（main.ts:3155）。
- 已知坑 / 审计文档:
  - 一阶段跟随者/走位演出期反复修（议题 14 证据 C）：碰撞改动不得破坏走位演出。
- 不得重新引入:
  - 走位演出（moveEntity/stepEntity 的脚本语义）被碰撞校验误挡而卡死——脚本走位与
    自主移动的碰撞语义要分开定义。
- 相关测试:
  - script-runner / collision / follower 现有单测。

## 验收条件

- 功能:
  - 巡逻/游走 NPC 不穿墙、不穿彼此（多 NPC 场景实测）。
  - 玩家撞移动 NPC 滑步错开；NPC 主动让路（或按冻结方案定义的避让规则）。
  - 转向动画/游走节奏手感对齐原版（Kimi 并排对比）。
- 测试:
  - 碰撞单测（穿墙/互穿/让路矩阵）；脚本走位演出回归（不卡死）。
- 文档:
  - backlog 议题 15 状态更新；capability-map 实体行为口径。
- 视觉 / 手工验证:
  - Kimi 浏览器实测多 NPC 巡逻场景 + 玩家穿插手感。

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

待冻结。方向：自主移动与脚本走位分层——脚本走位保语义（不误挡），自主移动（auto/追逐）
逐帧动态碰撞；玩家↔NPC 避让按手感定算法。

### 已知风险

- 风险: 碰撞改动破坏脚本走位演出（切场景/演出期）。
- 缓解: 脚本走位与自主移动碰撞语义分离 + 演出回归测试。
- 风险: 避让手感难量化。
- 缓解: Kimi 并排对比 + 作者试玩反馈作为门禁。

### 主审立场

- Reviewer: Kimi（移动/碰撞架构）+ GLM（实体覆盖）
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending

### 三方争议记录(按需)

- Codex: 2026-08-06 用户咨询议题 15 后开卡；auto 巡逻已有，缺口 = 动态碰撞/让路/转向。
- Kimi: pending
- GLM: pending

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

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: pending

## 交接日志

- 2026-08-06 Codex: 开卡。现状：auto 巡逻（M3b/E2）done；stepEntity/moveEntity/chase
  无动态碰撞；玩家撞 NPC 硬挡。

## 下一位 Agent 提示词

```text
接手任务: D15-1 NPC 移动补全
任务卡: docs/ops/tasks/D15-1-npc-movement-dynamic-collision.md
当前状态: draft（build 准入 blocked）
你的角色: Kimi 移动/碰撞架构主审；GLM 实体行为覆盖矩阵主审
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡、main.ts:1985/2018/3262/4529、
  collision.ts、E2 卡、M3b auto runner
已完成: 开卡（缺口=动态碰撞/让路/转向；auto 巡逻已有），设计未冻结
请你做: 压测脚本走位 vs 自主移动的碰撞语义分离、避让算法、转向动画口径；
  冻结方案后 agree/counter
不要做: 不得修改实现文件；不得破坏脚本走位演出；不得改对话冻结拍板
输出要求: 更新设计签字、主审立场、争议处理和下一位提示词
```
