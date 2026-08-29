# ED-WORKSPACE-ADOPTION-DEBT-1 - 编辑器旧工作区滚动壳真实采用清零

Status: draft（由 ED-CATALOG-ROW-IA-1 的 bounded legacy exception 建立；未完成三方 build 前签字，不得实现）
Phase: phase2
Capability: Editor cross-cutting（不改变 capability-map）
Coding Owner: pending
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: pending
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: `main`

## 目标

清零六个既存业务文件对 raw `ds-object-workspace*` class 的借用，使中央主工作区与滚动内容改为真实
`DsObjectWorkspace`，并删除 ED-CATALOG-ROW-IA-1 为冻结旧债建立的精确 exception。完成前，静态门禁必须
锁死当前文件、selector 与出现次数，任何新增 raw 用法立即失败。

## 范围

- 范围内：
  - `ProjectWorkbenchTab.tsx`
  - `BattleSpriteLibrary.tsx`
  - `VarsTab.tsx`
  - `SpriteResourceViewer.tsx`
  - `EnemyTeamTab.tsx`
  - `BattleFieldTab.tsx`
  - 对应 route-live adoption owner、DOM/CSS 唯一滚动 owner、聚焦测试与功能性浏览器验证。
- 范围外：
  - 不改 catalog 行信息层级、字段布局、draft/commit、schema、migration、runtime 或项目内容。
  - 不把 `DsVirtualList`、Canvas / Isometric surface、Inspector 滚动误塞进中央对象工作区。
  - 不重开 ED-DS-3 或 ED-CATALOG-ROW-IA-1；本卡只消费后者登记的清零条件。

## 前提真值门

### 一句话行为 / 工程前提

六个文件当前只借用了设计系统保留 class，没有渲染真实 `DsObjectWorkspace`，却可能被 adoption 文案误记为
已采用；替换必须保持每页唯一纵向 owner、固定 Hero 和既有用户行为不变。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：原版没有二阶段编辑器工作区。 | `docs/phase2/READ-FIRST.md:1-8` |
| 第一阶段 | N/A：第一阶段没有 Reforge 编辑器设计系统。 | `docs/phase2/READ-FIRST.md:32-37` |
| 当前二阶段 | 六文件存在 raw `ds-object-workspace` / `__content`；ED-CATALOG 的 route-live 门禁将它们登记为 bounded legacy exception，禁止新增。 | `ED-CATALOG-ROW-IA-1-editor-catalog-row-information-hierarchy.md:308-372`；`packages/editor/src/ui/design-system/design-system-adoption.json`；`packages/editor/scripts/design-system-audit.mjs` |
| 本任务目标 | 六文件全部改用真实公共组件，exception 精确归零，页面主区与 Inspector/目录不形成嵌套纵向滚动。 | 本卡目标与验收条件 |

### 反证与替代解释

- 最强替代解释：class 已复用公共 CSS，视觉相同，无需真实组件。
- 反证：class 借用不提供公共 data marker、语义和 API 边界，registry 曾因此把 prose/类名误报成真实采用。
- 可证伪观察：若改造导致 Hero 跟随内容滚动、出现第二纵向 owner、创建/空/加载分支高度塌陷，或路由真值门禁
  仍可被 raw class 欺骗，则方案失败并转 blocked/rework。

## 上下文锚点

- `AGENTS.md` 的推进签字、单 Coding Owner 与前提真值门。
- `docs/phase2/READ-FIRST.md`。
- `docs/ops/tasks/ED-CATALOG-ROW-IA-1-editor-catalog-row-information-hierarchy.md:308-372`。
- `packages/editor/src/ui/design-system/recipes.tsx`（`DsObjectWorkspace`）。
- 六文件当前 raw class callsite 与 `packages/editor/src/ui/editor.css` 对应滚动 owner。
- 不得重新引入：页面伪造 `ds-object-workspace*` / `data-ds-scroll-*`、嵌套同轴滚动、无证据 allowlist。

## 验收条件

- 六文件生产 TSX 的 raw `ds-object-workspace*` 精确归零，真实 `DsObjectWorkspace` route-live 可达。
- Hero / notice 固定，内部 content 是中央主区唯一 y-scroll owner；目录、主区、Inspector 各自边界清晰。
- creating / selected / empty / loading / error 分支均不重复创建 content owner。
- 删除 `ED-CATALOG-ROW-IA-1` 建立的六文件 legacy exception；新增 raw class/marker 静态门禁保持红。
- 聚焦 DOM/CSS 测试、editor typecheck、受影响包全量测试和最小浏览器矩阵通过。

## 推进签字

### 进入 build 前：设计签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 分歧处理: N/A
- 缺签豁免: N/A
- build 准入结论: blocked

### 进入 done 前：审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

- 设计结论: pending；必须先逐文件核清 Hero/content 分支与现有 scroll owner，再决定是否需要扩展公共 API。
- 已知风险: 多分支页面可能把一个 workspace content 写成多个并列 owner；必须先用 DOM 测试红先行。

## Build: 实现与自测

- Coding Owner: pending
- 修改文件: pending
- 实现摘要: pending
- 测试结果: pending

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: N/A

## 交接日志

- 2026-08-28 Codex：按 ED-CATALOG build-time scope 补签条件建卡并上看板；当前只冻结 6 文件旧债，未修改
  本卡实现。Next：完成四向真值与逐文件设计后送 Codex / Kimi / GLM build 前签字；三签齐前不得实现。

## 下一位 Agent 提示词（draft 设计审查，待补真值后刷新）

```text
审查 ED-WORKSPACE-ADOPTION-DEBT-1 draft；当前仅登记 ED-CATALOG 的六文件 bounded legacy debt，
三方 build 前签字未开始。先读 AGENTS.md、READ-FIRST、ED-CATALOG 当前 scope 补签与本卡全文，
逐文件核真实 DOM/CSS scroll owner。不得修改实现、不得把卡转 build/done；输出 premise/design
agree 或 counter，并附直接 file:line 与可证伪观察。
```
