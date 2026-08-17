# ED-AUDIT-2 - 编辑器全页面视觉、闭环与代码质量审计

Status: draft
Phase: phase2
Capability: Editor cross-cutting（审计，不改变 capability-map）
Audit Owner: Codex
Reviewer: Kimi（架构/视觉）+ GLM（覆盖/测试）
Visual Verification Owner: Codex + User

## 目标

在 ED-DS-2 基础稳定后，对 `EDITOR_MODULES` 的 8 个模块、25 个二级页面做一次主动审计，不再由用户逐页
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

- 用户可见前提：**当前 25 个二级页的共享外壳已经大幅统一，但内嵌专业面板、长目录和旧表单/按钮仍存在
  可直接证明的跨页缺口；下一轮应按证据拆小卡，而不是重做已闭合页面。**
- 四向真值矩阵：

| 方向 | 结论 | 一手证据 |
|---|---|---|
| 原版 / primary source | N/A：作者工具视觉与可访问性不由原版游戏定义。 | 本卡不改变游戏机制、schema、save 或 runtime。 |
| 第一阶段 | N/A：第一阶段没有当前 8 模块编辑器信息架构。 | 本卡只审第二阶段 Editor。 |
| 当前第二阶段 | 8 模块、25 子页；17 canonical catalog、15 Inspector、16 引用面、6 诊断面已有静态合同，但 raw form 基线仍为 198/123/8/205，敌队 380 行一次渲染。 | `editor-navigation.ts:1-10,68-277`；`design-system/boundary.test.ts:121-214,250-268`；`EnemyTeamTab.tsx:198-232`；localhost:6010 敌队实机 DOM。 |
| 本任务目标 | 只重建审计真值与优先矩阵；不在审计卡内修改业务实现。首个建议实现批次为 Map Palette 控件，长目录性能合同另卡。 | `editor-ui-audit-2026-08-15.md` §2.1/§3.1/§3.2。 |

- 最强替代解释：最近多张统一卡已经完成，继续审计只会重复劳动。反证：`MapStampPalette.tsx:69-96,142-153`
  仍直接使用 `.in/.mini`；`DsVirtualList` 在 `design-system/virtual-list.tsx:3-59` 存在但生产零调用，而
  `EnemyTeamTab.tsx:220-230` 对 380 项直接 `map`。
- 可证伪观察：若 25 页所有专业子面板均只消费共享控件、所有大于 50 项目录都有可访问虚拟化/渐进渲染证明、
  raw controls 和旧按钮族已归零或逐项记录必要例外，则本审计可直接 done；当前不满足。

## 推进签字

### 审计方案

- Codex: **premise verified + design agree（2026-08-17，重签）**。已按当前 25 页重跑静态 census，核对
  design-system 边界合同，并在 1280/900/720 对 Map/Palette、在 1280 对 EnemyTeam 做实机复核；同意只输出
  resolved/open 矩阵与小卡顺序，不在审计卡夹带实现。旧 2026-08-15 签字随页面数和基线变化作废。
- Kimi: pending
- GLM: pending
- build 准入结论：blocked（开卡任务；Kimi/GLM 设计签字未齐。审计文档可更新，业务实现不得开始。）

### 完成审查

- Codex: pending
- Kimi: pending
- GLM: pending

## 当前证据（2026-08-17 rebaseline）

- 更新报告：`docs/phase2/editor/editor-ui-audit-2026-08-15.md`（保留首轮历史矩阵，新增 §2.1/§3.1/§3.2）。
- Chromium：localhost:6010；Map/Palette 1280×720、900×720、720×720 均无 document/body 横向溢出，
  Console warning/error 0；EnemyTeam 1280×720 实机确认 380 个对象按钮一次进入 DOM。
- 代码：`EDITOR_MODULES` 当前 8/25；边界合同钉住 17 catalog / 15 Inspector / 16 reference / 6 diagnostic；
  raw form 198 input / 123 select / 8 textarea / 205 label / 23 checkbox；旧按钮类 62/43/20/34/16/3。
- `MapStampPalette.tsx:69-96,142-153` 仍是 raw `.in/.mini`；`DsVirtualList` 生产零调用。
- 用户 2026-08-15 追加执行裁决：角色标题、技能、敌人等页面要作为统一重构连续推进；Agent 主动审查全部
  页面，不得把 foundation 单点纠错当作停止点，也不得等待用户逐页点名。

## 下一步

1. Kimi 复核 resolved/open 边界、Map Palette 与长目录性能拆卡是否合理，签 `premise verified + design agree`
   或给出带锚点 counter。
2. GLM 独立复算 8/25 页面、17/15/16/6 覆盖、raw controls/旧按钮基线和遗漏页，签字或 counter。
3. 两席 agree 后，本卡进入 review：只收审计交付，不改业务实现；三方 accept 后 done。
4. 审计 done 后先正式开 `ED-MAP-PALETTE-CONTROLS-1`，再开长目录性能合同卡；两卡各自重新走三签。

## 交接日志

- 2026-08-17 Codex：完成二次基线。Evidence：8/25 路由；17/15/16/6 共享覆盖；198/123/8/205、
  23 与 62/43/20/34/16/3 存量账；Map 1280/900/720 零溢出/零 Console；Palette raw control 与
  EnemyTeam 380 DOM 行直接复现。Next：Kimi/GLM 只读审查；不得改业务实现。

## 下一位 Agent 提示词

```text
接手任务：ED-AUDIT-2 编辑器全页面视觉、闭环与代码质量审计
任务卡：docs/ops/tasks/ED-AUDIT-2-editor-systematic-audit.md
当前状态：draft；Codex 已按 2026-08-17 当前代码重签，Kimi/GLM 设计签字 pending；不得开始业务实现。
先读：AGENTS.md、docs/phase2/READ-FIRST.md、本卡全文、
docs/phase2/editor/editor-ui-audit-2026-08-15.md，以及：
- packages/editor/src/ui/editor-navigation.ts
- packages/editor/src/ui/design-system/boundary.test.ts
- packages/editor/src/ui/design-system/virtual-list.tsx
- packages/editor/src/ui/MapStampPalette.tsx
- packages/editor/src/ui/EnemyTeamTab.tsx
当前证据：8 模块/25 子页；17 catalog / 15 Inspector / 16 reference / 6 diagnostic 已有合同；
raw form 198/123/8/205、checkbox 23；旧按钮 62/43/20/34/16/3；Map 1280/900/720 零溢出和零
Console；Palette 仍 raw .in/.mini；EnemyTeam 实机一次渲染 380 个目录按钮，DsVirtualList 生产零调用。
Kimi 职责：独立核对架构/视觉边界、已闭合项不重做、Map Palette 与长目录性能拆卡，写
premise verified + design agree 或带 file:line counter。
GLM 职责：独立复算 8/25 页面与覆盖/存量数字，检查遗漏页、测试矩阵和验收判据，写
premise verified + design agree 或 counter。
输出必须写回本卡推进签字与交接日志。签字未齐不得进入 build；本卡本身也不得夹带业务实现。
```
