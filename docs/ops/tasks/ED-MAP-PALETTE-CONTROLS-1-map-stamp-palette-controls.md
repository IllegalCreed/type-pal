# ED-MAP-PALETTE-CONTROLS-1 - 地图组合 Palette 控件统一

Status: review
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
  - Kimi: **premise verified + design agree（2026-08-17，本人一手读码，非复述；完全携带 GLM MP1）**。
    逐项独立核实：
    - **raw chrome 缺口属实**：`MapStampPalette.tsx:70-80` raw `input.in` 搜索、`:81-96` raw
      `select.in` 分类、`:144-147` / `:150-153` 两枚 `button.mini`；私有皮肤
      `editor.css:12025-12029`（`.map-stamp-filters .in` 29px 高/10px 字/7px padding + 私有
      focus 规则 :12005-12010）实存，属本卡删除面。
    - **几何安全**：compact 共享控件高 30px（tokens.css:48）vs 私有 29px，密度等价；
      `map-stamp-filters` 布局类保留（`1fr / minmax(78px, 0.72fr)` 双列不动），容器 padding 7px
      足以容纳共享 focus ring（2px outline + offset）；Inspector 最窄 220px 下无横滚风险，
      三档视口为 build 退出实机门禁。
    - **DsSelect 语义匹配**：`searchable='auto'` + 阈值 20（controls.tsx:443,584）——分类是
      短集合，自动保持不可搜索；分类变化重置 limit 的回调语义原样保留（只换控件不换 handler）。
    - **边界正确**：不套 DsCatalogControls/DsListHeader（CK1 冻结，Inspector 内嵌 palette 非
      正式目录）；不新增公共 API；不改排序/兼容禁用/60 渐进/最近标记；census 预期算术成立且
      以实现后实测为准。MP1（boundary 按文件划界、禁全仓 `.in/.mini`）我完全同意——
      StampLibraryTab:544 等邻接合法用途不归本卡。
    - 可证伪观察沿用卡文+GLM：compact primitive 在三档/最窄栏出现裁切/横滚/focus 截断，
      或 DsSelect 破坏分类选择/limit 重置——任一出现即 counter，不用业务页覆写补洞。
    未改实现文件，未代签 GLM，未标 build/done。
  - GLM: **premise verified + design agree（2026-08-17，本人一手读码，非代理；附必落钉 MP1，不阻塞
    准入）**。锚点独立核实：raw `<input className="in">`（:70-71 搜索）、raw `<select className="in">`
    （:81-82 分类）、两枚 `<button className="mini">`（:144 再显示 60 / :150 管理组合）实存；
    `map-stamp-card`（:103）是领域卡 class 非 raw chrome——**census 预期算术核对成立**：raw
    input -1 / raw select -1 / `.mini` -2 / raw button -2 / DsButton +2，与卡文验证节一致且已
    正确钉住"以实现后脚本实测为准"。MapStampPalette.test.tsx 在位（当前 1 test，卡内已列补齐
    清单）。设计边界正确：不套 DsCatalogControls（CK1 冻结）、保留领域排序/兼容禁用/60 渐进、
    compact primitive 合同引用 controls.tsx 实存。
  - **必落钉 MP1（boundary 划界按文件，禁全仓 `.in/.mini`）**：raw 零回流断言必须限定
    `MapStampPalette.tsx` 文件内（raw input/select/button 与 `.in/.mini` token 为零）；
    **不得全仓禁止 `.in/.mini`**——StampLibraryTab 登记面板（:544 `className="in"`）等
    邻接合法用途仍在（归后续卡），全仓禁会误伤。
  - 独立反证（至少一位非 Owner）: GLM（覆盖/测试）+ Kimi（架构/视觉）均已完成（见各自签字）。
    可证伪观察：compact primitive 在最窄 Inspector 发生裁切/横滚/focus 截断，或 DsSelect 破坏
    分类选择/limit 重置语义——任一出现即 counter（卡文已列，GLM/Kimi 同意该观察集）。
  - 用户豁免: N/A
  - 结论: **allowed（2026-08-17）——Codex + Kimi + GLM（MP1）三方签字齐。由 Codex 转 build。**
- done 准入: Codex **accept（2026-08-17）** | Kimi pending | GLM pending | 用户验收 pending |
  结论 blocked。Codex 证据：focused 83/83、editor 128 files / 942 tests、typecheck、Biome/diff-check、
  census 与三档浏览器矩阵全绿；实现不含 `DsCatalogControls/DsListHeader`，领域卡/排序/兼容/最近/60 渐进未改。

## Build: 实现与自测

- Coding Owner: Codex（三签齐后实现）
- 实现:
  - `MapStampPalette.tsx` 的 raw search/select 迁为 compact `DsTextInput/DsSelect`；分类明确
    `searchable={false}`，原 `onValueChange -> setLimit(60)` 语义保留。
  - 两枚 `.mini` 动作迁为 quiet/secondary compact `DsButton`；删除 Palette 私有高度、字号、padding 和
    focus 皮肤，只保留筛选双列、动作行与文字截断等业务布局。
  - `MapStampPalette.test.tsx` 从 1 项扩至 4 项，覆盖 600 项 60 分批、搜索/分类重置 limit、不可搜索 Select、
    兼容禁用、recent 排序、selected、可选管理入口和空态。
  - MP1 按签字内 `map-stamp-card` 领域卡例外落边界：文件内 raw input/select、`.in/.mini` 与 raw chrome
    action 为零；唯一保留的 raw `<button>` 必须是 `map-stamp-card`，同时禁止目录 shell creep。
- 自动验证:
  - focused：`MapStampPalette + MapMode + boundary` 3 files / 83 tests passed。
  - full editor：128 files / 942 tests passed；`tsc --noEmit` passed。
  - census：raw button/input/select = `329/197/122`，`DsButton=116`，`mini=18`；相对基线精确
    `-2/-1/-1/+2/-2`，已同步 boundary ceiling 与审计报告。
  - changed-files Biome passed；仅报告 `editor.css:9868-9871` 既有 `.visually-hidden !important` 4 条
    warning，本卡未新增；`git diff --check` passed。
- 浏览器验证:
  - `?ui_samples=1&module=map&page=workspace` 的地图右侧“组合”页，1280/900/720×720 三档 document、
    Palette、filters、actions 均 `scrollWidth === clientWidth`。
  - 720 档 Palette 275px，搜索约 149px、分类约 107px；无裁切/横滚。Select 6 项且 search input 0，
    弹层右边界 1272 < viewport 1280，选择后焦点精确返回分类触发器。
  - 搜索命中/空态/清空恢复、分类筛选与“管理组合”跳转通过；新开干净页面 Console warning/error 0。
- 跳过: 样例仅 6 个组合，无法在实机出现“再显示 60”；由 600 fixture 的 React 测试覆盖 60→120 与
  搜索/分类重置回 60。

## 交接

- 2026-08-17 User + Codex：ED-AUDIT-2 三方 accept + 用户验收完成并合入 main；按已验收顺序正式开本卡。
  Codex 完成一手证据、范围、验证矩阵与设计签字；未改实现文件。Next：Kimi 架构/视觉独立反证，
  再由 GLM 覆盖/测试独立反证；三签齐前不得 build。
- 2026-08-17 GLM（覆盖/测试）: 审查完成，签 **premise verified + design agree（附 MP1）**。
  raw 控件三处 + 双 mini 按钮实存；:103 map-stamp-card 非_raw——census 预期算术成立；测试补齐
  清单可执行。一钉：boundary 划界按 MapStampPalette 文件，禁全仓 .in/.mini（StampLibraryTab
  :544 等合法邻接用途防误伤）。未改实现文件，未代签 Kimi，未标 build/done。Next: Kimi 签字。
- 2026-08-17 Kimi（架构/视觉）: 独立反证完成，签 **premise verified + design agree（携带 MP1）**。
  一手核实：三处 raw chrome 与私有皮肤（29px/10px + 私有 focus 规则）逐项属实；compact 共享控件
  30px 密度等价、双列布局类保留、7px 容器 padding 容纳共享 focus ring；DsSelect auto 阈值 20 使
  短分类集自动不可搜索、limit 重置 handler 不动；不套目录 recipe（CK1）、不新增公共 API、领域
  行为不变。三签齐，build 准入转 allowed。未改实现文件，未代签 GLM，未标 build/done。
  Next: Codex 转 build（MP1 必落：boundary 按文件划界）。
- 2026-08-17 Codex: build 完成并签 Codex accept。Palette raw/private chrome 全部迁入既有 compact
  primitive，MP1 文件边界、census/report 与行为测试落地；focused 83、full editor 942、typecheck、
  三档实机及 Console 0 全绿。Next: Kimi/GLM done 前独立 review；三方 accept + 用户验收前不得 done。

## 下一位 Agent 提示词

### 给 Kimi（build 前审查——已完成）

Kimi 已于 2026-08-17 完成架构/视觉独立反证并签 premise verified + design agree（携带 MP1，
逐项证据见签字节与交接日志），本节提示词不再适用。

### 给 Kimi / GLM（done 前 review，可直接复制）

```text
接手任务：ED-MAP-PALETTE-CONTROLS-1 地图组合 Palette 控件统一——done 前 review
任务卡：docs/ops/tasks/ED-MAP-PALETTE-CONTROLS-1-map-stamp-palette-controls.md
当前状态：review；Codex build + accept 完成，Kimi/GLM accept 与用户验收 pending；不得标 done
你的角色：Kimi 或 GLM——独立代码/视觉/覆盖审查并签 accept 或 counter
必读：本卡全文、MapStampPalette.tsx/test、editor.css W7G Palette 段、design-system/boundary.test.ts、
  editor-ui-audit-2026-08-15.md census 段。
核验：共享 compact 控件采用；搜索/分类/limit 重置/60 渐进/兼容禁用/recent/管理入口行为；MP1 仅按
  MapStampPalette 文件划界且明确保留唯一 map-stamp-card 领域按钮；不套目录 recipe；census
  329/197/122、DsButton116、mini18；三档无横滚/focus 裁切。
输出：无阻塞则在 done 准入签 accept；有问题签 counter/rework 并给文件行号与最小返工项。不得代签另一方，
  不得在三方 accept + 用户验收前标 done。
```
