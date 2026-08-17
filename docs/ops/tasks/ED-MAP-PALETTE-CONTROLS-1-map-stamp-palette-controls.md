# ED-MAP-PALETTE-CONTROLS-1 - 地图组合 Palette 控件统一

Status: draft
Owner: Codex
Reviewer: Kimi + GLM
Phase: phase2
Capability: Editor cross-cutting（地图组合 Inspector 控件收敛，不改变 capability-map）
Visual Verification Timing: dev-functional

## 目标

- 将地图右侧 Inspector“组合”页内 `MapStampPalette` 的原生搜索框、分类选择器与两枚 `.mini` 操作迁入
  `DsTextInput`、`DsSelect`、`DsButton`，使其尺寸、状态、焦点和按钮层级与编辑器其他区域一致。
- 保留 Palette 的领域结构与行为：它仍是地图主工作区内嵌的组合选择面，不冒充正式左侧目录。

## 范围

- 修改 `MapStampPalette.tsx`：搜索使用 compact `DsTextInput`，固定短分类使用 compact、不可搜索的
  `DsSelect`；“再显示 60 个”使用 quiet compact `DsButton`，“管理组合”使用 secondary compact
  `DsButton`。所有现有 accessible name 与回调语义保持。
- 删除 `editor.css` 中仅为 `.in` / `.mini` 重做高度、字号、padding、focus 的 Palette 私有皮肤；保留
  `map-stamp-filters`、`map-stamp-palette-actions` 等业务布局，以及组合卡、预览、空态的领域样式。
- 补充 `MapStampPalette.test.tsx` 与 design-system boundary：钉住共享控件采用、分类筛选、60 条渐进显示、
  搜索重置 limit、可选管理入口和 raw 控件零回流；同步刷新可复现 census 的下降基线。
- 开发期最小视觉验证：地图“组合”Inspector 在 `1280×720`、`900×720`、`720×720` 下无横向溢出，
  搜索、选择弹层、操作按钮及 focus ring 可达，Console warning/error 为 0。
- 不做：不引入 `DsCatalogControls` / `DsListHeader`；不改组合卡皮肤、排序、兼容性禁用、最近标记、预览、
  放置流程、schema/save/runtime；不顺带处理敌队长目录或 `DsVirtualList`。

## 前提真值门

- 一句话行为 / 工程前提：`MapStampPalette` 的搜索、分类和尾部动作是普通表单/命令语义，现有业务行为
  已正确；本任务只把 raw/private chrome 迁入现有共享 primitive，不改变组合选择与地图数据。

| 方向 | 结论 | 一手证据 |
|---|---|---|
| 原版 / primary source | N/A：这是第二阶段作者工具，没有原版游戏 UI 真值。 | 本卡不改游戏运行时、资源或机制。 |
| 第一阶段 | N/A：第一阶段没有 Reforge 地图组合作者面板。 | `CLAUDE.md:5-13`；`docs/phase2/READ-FIRST.md:1-16`。 |
| 当前二阶段 | Palette 在 Inspector 内使用 raw `<input className="in">`、raw `<select className="in">` 和两枚 raw `<button className="mini">`；查询/分类变化会把渐进 limit 重置到 60，结果按 tileset 兼容、recent、名称/id 排序，卡片按兼容性禁用。 | `packages/editor/src/ui/MapStampPalette.tsx:33-65,67-154`；`packages/editor/src/ui/MapMode.tsx:3812-3854`；`packages/editor/src/ui/MapStampPalette.test.tsx:63-105`。 |
| 本任务目标 | 使用既有 `DsTextInput / DsSelect / DsButton` 的 compact 合同替换上述 chrome；保持 Palette 独立于正式目录 recipe，并保持当前领域行为。 | `packages/editor/src/ui/design-system/controls.tsx:27-68,250-274,436-472,551-603`；`docs/phase2/editor/editor-design-system-v1.md:304-331,344-375,379-388`；`docs/phase2/editor/editor-ui-audit-2026-08-15.md:93-101`。 |

- 当前 `before` -> 目标 `after`：局部 `.in/.mini` 控件皮肤 -> canonical compact shared controls；
  搜索、分类、排序、选择、渐进显示与打开组合库的行为不变。
- 最强替代解释：Palette 位于窄 Inspector，当前 29px/10px 的私有控件可能是有意的密度设计，共享控件会
  撑高或横向溢出。可推翻当前方案的观察：compact primitive 在三档视口或最窄右栏仍发生裁切/横向滚动、
  focus ring 被截断，或 `DsSelect` 使分类选择/焦点返回/limit 重置无法保持；出现任一项即停止并 counter，
  不得靠业务页覆写共享控件高度或焦点皮肤补洞。
- 是否主动偏离已核真值：no。用户可见变化仅为既有设计系统样式统一，不改变信息架构或操作结果。

## 上下文锚点

- `AGENTS.md`；`docs/phase2/READ-FIRST.md`：第二阶段架构与作者工具纪律。
- `docs/phase2/editor/editor-design-system-v1.md:289-388`：状态、按钮、搜索/过滤、表单与 Select 合同。
- `docs/ops/tasks/ED-CATALOG-CONTROLS-1-global-catalog-controls.md:122-131,323-338,594-600`：CK1 已冻结
  Palette 是邻接控制，不套 `DsCatalogControls / DsListHeader`，但必须另卡消除 raw 控件。
- `docs/phase2/editor/editor-ui-audit-2026-08-15.md:20-32,93-101`：三档实机基线与最新实现顺序。
- `packages/editor/src/ui/MapStampPalette.tsx:7-154`：业务状态、筛选排序、60 条渐进显示、兼容性与操作入口。
- `packages/editor/src/ui/editor.css:12005-12154`：当前局部控件皮肤和仍需保留的 Palette 布局/卡片样式。
- `packages/editor/src/ui/design-system/controls.tsx:27-68,250-274,436-472,551-603` 与
  `packages/editor/src/ui/design-system/primitives.css:310-465`：目标 primitive API、尺寸与状态真源。
- `packages/editor/src/ui/MapStampPalette.test.tsx:63-105`、`MapMode.test.tsx:481-531`、
  `design-system/boundary.test.ts:135-215`：现有行为与 raw/shared 边界测试。
- 不得重新引入：第二套 Palette control variant、业务页控件高度/颜色/focus override、正式目录 header、
  `content-visibility`/虚拟化扩 scope、旧版本兼容 fallback。

## 验证

- `pnpm --filter @type-pal/editor exec vitest run src/ui/MapStampPalette.test.tsx src/ui/MapMode.test.tsx src/ui/design-system/boundary.test.ts`
- `pnpm --filter @type-pal/editor run typecheck`
- `node packages/editor/scripts/audit-legacy-controls.mjs`：预期 raw input/select 各净减 1、`.mini` 净减 2、
  raw button 净减 2、`DsButton` 净增 2；数字以实现后脚本实测为准并同步 boundary/report，不凭手算硬写。
- `pnpm --filter @type-pal/editor test` 与 `pnpm exec biome check`（仅本卡改动文件）、`git diff --check`。
- Chromium `http://localhost:6010/`：进入 Map -> 组合，分别检查 1280/900/720；搜索命中/空结果/清空、
  分类打开与键盘选择、再显示 60、管理组合、focus ring、document/control/list `scrollWidth <= clientWidth`、
  Console warning/error 0。证据写回本卡；功能界面在开发期完成，不延后到剧情 E2E。

## 推进签字

- build 准入：
  - Codex: **premise verified + design agree（2026-08-17）**。一手读取 `MapStampPalette.tsx:33-154`、
    `controls.tsx:27-68,250-274,436-472,551-603`、DS-C.2/C.4/C.5/C.6、CATALOG CK1 与 AUDIT §3.2；
    确认 raw/private chrome 缺口、既有共享 API 和独立 Palette 边界均成立。实现无需新增公共 API，
    验证覆盖行为、边界、census 与三档功能视觉。
  - Kimi: premise pending | design pending
  - GLM: premise pending | design pending
  - 独立反证（至少一位非 Owner）：pending；须直接核对窄 Inspector 几何、shared primitive API、
    CATALOG CK1 边界，并说明何种观察会要求 counter。
  - 用户豁免: N/A
  - 结论: **blocked——待 Kimi + GLM 分别签 premise verified / design agree；不得开始实现。**
- done 准入: Codex pending | Kimi pending | GLM pending | 用户验收 pending | 结论 blocked

## 交接

- 2026-08-17 User + Codex：ED-AUDIT-2 三方 accept + 用户验收完成并合入 main；按已验收顺序正式开本卡。
  Codex 完成一手证据、范围、验证矩阵与设计签字；未改实现文件。Next：Kimi 架构/视觉独立反证，
  再由 GLM 覆盖/测试独立反证；三签齐前不得 build。

## 下一位 Agent 提示词

```text
接手任务：ED-MAP-PALETTE-CONTROLS-1 地图组合 Palette 控件统一
任务卡：docs/ops/tasks/ED-MAP-PALETTE-CONTROLS-1-map-stamp-palette-controls.md
当前状态：draft；Codex 已签 premise verified + design agree，Kimi/GLM pending；不得开始实现。
你的角色：Kimi，负责架构/视觉独立反证与 build 前签字。
先读：AGENTS.md、docs/phase2/READ-FIRST.md、本卡全文、
docs/phase2/editor/editor-design-system-v1.md 的 DS-C.1/C.2/C.4/C.5/C.6、
docs/ops/tasks/ED-CATALOG-CONTROLS-1-global-catalog-controls.md 的“邻接控制”与 CK1、
docs/phase2/editor/editor-ui-audit-2026-08-15.md §2/§3.2，以及 MapStampPalette.tsx、editor.css
对应区段、design-system/controls.tsx、MapStampPalette.test.tsx。
请你做：独立确认 raw/private chrome 缺口；压力测试 compact DsTextInput/DsSelect/DsButton 在窄 Inspector
中的几何与焦点；确认不套 DsCatalogControls/DsListHeader、不新增公共 API、不改领域行为的边界；写出
直接证据锚点、最强反例和可证伪观察，并在卡内签 premise verified + design agree，或给出 counter。
不要做：不得修改实现文件、不得代签 GLM、不得把任务标 build/done、不得扩到组合卡或长目录性能。
输出要求：签字与审查摘要写回任务卡；若 agree，附可直接交给 GLM 的下一位 Agent 提示词。
```
