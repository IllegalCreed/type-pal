# CONTENT-DEFEATED-REFERENCE-DIAGNOSTICS-1 — 战后条件引用的诊断归属

Status: draft
Phase: phase2
Owner: Codex
Coding Owner: 未分配
Reviewer: Codex
Last reviewed: 2026-11-18
Template: task-card-v1 / 1.0.0
Visual Verification Timing: N/A

## 目标

确定战后条件的场景、实体及角色引用各由哪个扫描层诊断，保持引用缺失会阻断保存和发布的现行合同。

## 范围

核作者战后分支的引用诊断、顺序和输出归属。战后动作的执行由 Reforge 负责。

## 前提与证据

合法的作者态敌人可在 `onDefeated` 条件引用场景或实体。结构允许声明该地址，跨表验证负责判断目标是否存在。统一命令目标扫描与敌人专用校验均发现同一条战后实体边。真实 `validateReferences` 的失败用例期望一条精确错误，实际收到两条完全相同的错误。普通场景剧情是否存在这种无效引用未核证。

敌人 hook 条件还观察到同一角色边经战斗校验和通用角色扫描形成两种路径写法和文案。它与两条逐字相同的实体诊断分别处理，尚未裁定规范路径及归属。

### 调用与原件

- [统一跨表校验](../../../packages/content/src/validate-refs.ts#L607)先扫描敌人完整文档，再由敌人校验检查战后条件。
- [编辑器项目诊断](../../../packages/editor/src/core/project-diagnostics.ts#L526)和状态诊断各按路径与文案折叠逐字相同的错误。迁移发布直接使用[原错误列表的前五十条](../../../packages/migrate/src/pal-current-publication.ts#L363)，重复项可能占用其中一条。
- [唯一执行归档](../evidence/QUALITY-CONTENT-REFERENCES-1-execution.tar.gz)的 `defeated-entity-duplicate-red` 原生报告保留唯一失败及实际两个相同对象，`defeated-entity-duplicate.fixture.txt` 可临时加入 `enemy-reference-validation.test.ts` 重放。

## 验收

本卡仅取证。聚合文件维持 review。后续先确定公开诊断列表的归属、顺序与缺失项配额，再验证缺场景、缺实体、同一路径重复报告及两个独立物理引用的差异。再核一次编辑器与发布入口的阻断合同。原行为和当前活动 E2E 资产均未改。

## 状态与交接

由 Codex 在独立裁定后准入。战后动作执行、资源格式、存档和剧情无本卡变更。
