# ED-AUDIT-2 - 编辑器全页面视觉、闭环与代码质量审计

Status: draft
Phase: phase2
Capability: Editor cross-cutting（审计，不改变 capability-map）
Audit Owner: Codex
Reviewer: Kimi（架构/视觉）+ GLM（覆盖/测试）
Visual Verification Owner: Codex + User

## 目标

在 ED-DS-2 基础稳定后，对 `EDITOR_MODULES` 的 8 个模块、24 个二级页面做一次主动审计，不再由用户逐页
发现同类问题。审计分三条证据线：设计系统/可用性、ED-1 创建编辑保存重开引用删除闭环、代码质量与旧兼容
清理；输出可执行的优先矩阵和小批模块卡，不在本卡批量改业务实现。

## 范围与交付

- 页面矩阵：Wide/Medium/Narrow、zoom、键盘、滚动、空错加载、长文本、大列表、媒体、Inspector。
- 功能矩阵：创建、编辑、保存、重开、深链、引用、删除/阻断、undo/redo；不以截图替代。
- 质量矩阵：组件职责、状态所有权、跨包边界、重复 CSS/inline style、旧版本兼容、错误恢复与测试。
- 产出：[`editor-ui-audit-2026-08-15.md`](../../phase2/editor/editor-ui-audit-2026-08-15.md)、页面分数表、
  浏览器证据、迁移批次和每批任务卡。
- 不做：不在审计卡内重写页面；不改变 schema/save/migration/runtime；不把 Actor 或 BattleField 当自动正确模板。

## 前提真值门

- premise: **verified by Codex（2026-08-15）**。`editor-navigation.ts` 登记 8 模块/24 二级页；生产仍并存
  legacy 裸表单、Actor 对象工作台与 BattleField/Shop 新工作台。用户连续指出 Header、列表、panel、Shop、Skill
  和跨页不一致，并明确要求 Agent 主动审查，而非逐页等待反馈。
- primary / phase1: N/A；这是二阶段作者工具质量审计，不改变原版/一阶段游戏机制。
- 最强替代解释：只要继续按用户截图修小问题，成本更低。反证：同一 active row、Inspector padding、hero 层级、
  sash toggle 已在多个页面重复出现，局部修补不能证明其余 24 页无同类问题。
- 可证伪观察：若 24 页均已消费同一 recipe/primitives、ED-1 七环均有自动证据且没有私有布局/兼容分支，
  则本审计无需继续；当前代码和浏览器均不满足。

## 推进签字

### 审计方案

- Codex: premise verified + design agree（2026-08-15）。先自动/静态扫全页，再以代表页浏览器复核，最后
  Kimi/GLM 独立抽样；输出问题矩阵，不在审计结果里夹带实现。
- Kimi: pending
- GLM: pending

### 完成审查

- Codex: pending
- Kimi: pending
- GLM: pending

## 当前证据

- 首轮报告：`docs/phase2/editor/editor-ui-audit-2026-08-15.md`
- Chromium：localhost:6010，1280×720；Skill/Actor/BattleField/Shop/Image/Story/Map 代表页。
- 代码：`EDITOR_MODULES` 全路由；19 个主要 page component 的规模/原生控件/inline style census。
- 用户 2026-08-15 追加执行裁决：角色标题、技能、敌人等页面要作为统一重构连续推进；Agent 主动审查全部
  页面，不得把 foundation 单点纠错当作停止点，也不得等待用户逐页点名。

## 下一步

1. ED-DS-2 v2.2 correction 完成 Kimi/GLM accept，冻结 foundation 当前 API。
2. `ED-BATTLE-UI-1` 已扩为共享 Object Hero + Actor/BattleField + Skill/Enemy/Poison 第一批；三签后连续实现。
3. 同时补 900/720/zoom、键盘、错误注入与 ED-1 七环表，Kimi/GLM 分工抽样。
4. 第一批完成后直接按矩阵开 Item/Shop、Assets、Map/Story/Project、Scene 批次，不等待用户逐页提醒。
