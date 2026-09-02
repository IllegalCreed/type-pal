# ED-WORKSPACE-ADOPTION-DEBT-1 - 编辑器旧工作区滚动壳真实采用清零

Status: draft（由 ED-CATALOG-ROW-IA-1 的 bounded legacy exception 建立；未完成三方 build 前签字，不得实现）
Phase: phase2
Capability: Editor cross-cutting（不改变 capability-map）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: `main`
Design-System Version: `2.24.0`（纯采用清债，不改公共合同，不升版）

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

## 用户裁决

- 2026-09-02 用户明确“做吧”，批准继续本卡。
- 用户可见 `before -> after`：六个既有中央工作区的页面名称、Hero、字段、按钮、滚动位置与业务行为保持
  不变；只把“借公共 class 的假 owner”替换为真实公共组件与可机检 data marker。
- 本卡按一张卡、两批实现：第一批 Project / BattleSprite / SpriteViewer；第二批 Vars / EnemyTeam /
  BattleField。分批只服务验证，不重复开卡或改变签字范围。

## 前提真值门

### 一句话行为 / 工程前提

六个文件当前只借用了设计系统保留 class，没有渲染真实 `DsObjectWorkspace`，却可能被 adoption 文案误记为
已采用；替换必须保持每页唯一纵向 owner、固定 Hero 和既有用户行为不变。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：原版没有二阶段编辑器工作区。 | `docs/phase2/READ-FIRST.md:1-8` |
| 第一阶段 | N/A：第一阶段没有 Reforge 编辑器设计系统。 | `docs/phase2/READ-FIRST.md:32-37` |
| 当前二阶段 | 六文件共有 22 个 raw `ds-object-workspace*` occurrence；registry 为 27 pages（19 adopted / 8 exception）、6 legacy entries / 12 selector records / 9 registry pairs，并以现有门禁冻结。运行态各分支仍只有一个中央 y owner。 | `ProjectWorkbenchTab.tsx:309-317`；`BattleSpriteLibrary.tsx:1128-1177`；`VarsTab.tsx:360-491`；`SpriteResourceViewer.tsx:450-535`；`EnemyTeamTab.tsx:365-514`；`BattleFieldTab.tsx:278-424`；`design-system-adoption.json` |
| 本任务目标 | 六文件各只渲染 1 个真实 `DsObjectWorkspace` + 1 个 canonical content owner；27 pages 全 adopted，legacy 全归零，102 条 scroll records 总数不变，9 条 legacy main record 原位换成 `DsObjectWorkspaceContent`。 | `recipes.tsx:132-178` 现有 wrapped API；本卡设计与验收条件 |

### 反证与替代解释

- 最强替代解释：class 已复用公共 CSS，视觉相同，无需真实组件。
- 反证：class 借用不提供公共 data marker、语义和 API 边界，registry 曾因此把 prose/类名误报成真实采用。
- 可证伪观察：若改造导致 Hero 跟随内容滚动、出现第二纵向 owner、创建/空/加载分支高度塌陷，或路由真值门禁
  仍可被 raw class 欺骗，则方案失败并转 blocked/rework。
- 最强实现替代解释：多分支页必须使用 `contentMode="manual"` 并手写多个 content owner。不成立：现有
  `hero: ReactNode` 可用无 DOM fragment 同时承载 notice + selected Hero，children 内切换业务正文；默认 wrapped
  mode 始终只生成一个 canonical content callsite，边界更强且无需扩 API。

## 上下文锚点

- `AGENTS.md` 的推进签字、单 Coding Owner 与前提真值门。
- `docs/phase2/READ-FIRST.md`。
- `docs/ops/tasks/ED-CATALOG-ROW-IA-1-editor-catalog-row-information-hierarchy.md:308-372`。
- `packages/editor/src/ui/design-system/recipes.tsx`（`DsObjectWorkspace`）。
- 六文件当前 raw class callsite 与 `packages/editor/src/ui/editor.css` 对应滚动 owner。
- `design-system-adoption.json` 当前 27 pages / 102 scroll records / 6 legacy exceptions；
  `adoption.test.ts` 与 `design-system-audit.mjs` 的 route-live、reserved marker 与 nested-owner 反例。
- 不得重新引入：页面伪造 `ds-object-workspace*` / `data-ds-scroll-*`、嵌套同轴滚动、无证据 allowlist。

## 验收条件

- 六文件生产 TSX 的 22 个 raw `ds-object-workspace*` occurrence 精确归零；每文件恰一个真实
  `DsObjectWorkspace`，每个运行态恰一个 direct `data-ds-scroll-owner="main"` / axis y。
- Hero / notice 固定，内部 content 是中央主区唯一 y-scroll owner；目录、主区、Inspector 各自边界清晰。
- creating / selected / empty / loading / error 分支均不重复创建 content owner。
- registry 从 19 adopted / 8 exception 变为 27 / 0；legacy 6 entries / 12 selectors / 22 occurrences /
  9 pairs 全归零；102 scroll records 总数不变，canonical `DsObjectWorkspaceContent` record 从 11 增至 20。
- 删除六文件 legacy exception；raw literal/拼接/spread/dynamic class 回流、真组件退回 raw、重复 content owner、
  漏登 9 条 main owner、stale legacy 与 `status:exception` 回流均必须红。
- `recipes.tsx/css`、`design-system-audit.mjs`、index/tokens、DS 版本与 Design Lab/RF 零 diff；若实现需要新增
  notice/branch 等公共 prop，立即停线更新前提并重新三签。
- Project 四 route + repair、BattleSprite upload/ready/empty、SpriteViewer loading/error/ready、Vars/EnemyTeam/
  BattleField creating/selected/empty（含引用/preview loading/error）均有 DOM owner 与焦点回退覆盖。
- 聚焦 DOM/CSS 测试、editor typecheck、受影响包全量测试和最小浏览器矩阵通过。
- 浏览器覆盖 1280×800、900×720、720×700 与高 480：Hero/notice rect 固定，content 可滚到底，root/祖先
  scrollTop=0，document 横溢=0，focus 只滚中央 content；catalog/Inspector 与有界 `.bsu-frame-grid` 独立。

## 推进签字

### 进入 build 前：设计签字

- Codex:
  - premise: **verified（2026-09-02）**——直读六文件 22 个 raw callsite、互斥分支和 CSS；独立复算
    registry 27 pages（19/8）、102 scroll records、6/12/22/9 legacy 基线。当前每个运行态只有一个中央
    y owner，但 class 借用缺公共 marker/API 边界，前提成立。
  - design: **agree（2026-09-02）**——六文件统一使用现有 wrapped `DsObjectWorkspace`；Project helper 一处
    覆盖四 route，BattleSprite 一处覆盖三分支，SpriteViewer 收敛三次 early return；复杂三页以 hero fragment
    固定 notice/selected Hero、children ternary 切正文。公共 API/DS 版本零变；两批实现与 registry/测试/视觉
    矩阵闭合。可推翻观察为 Hero/notice 滚动、重复 owner、focus 掉 body 或 route-live 无法追到 helper。
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

- 设计结论: **Codex agree，待 Kimi / GLM 独立签字**。现有 `as / label / hero / className /
  contentClassName` wrapped API 足够；六文件都不得使用 manual mode 或手写 `DsObjectWorkspaceContent`。
- 第一批：Project helper、BattleSprite、SpriteViewer。三者分别保持四 route、三业务分支、三加载状态的单一
  workspace callsite；SpriteViewer 先把 early return 归一为一处 final workspace。
- 第二批：Vars、EnemyTeam、BattleField。`hero` fragment 承载固定 notice 与仅 selected 时出现的 Hero；
  children 在 creating/selected/empty 间切换，canonical content 永不随分支替换 owner identity。
- CSS：删除 `.project-scroll`、`.world-variable-scroll`、`.enemy-team-scroll` 的私有 y-overflow 声明与明确
  重复的 root flex/grid 属性；保留领域 padding、背景、height、container 和 bounded subviewport。
- 已知风险：分支切换焦点掉 body；Project `scrollIntoView` 错滚祖先；Enemy reorder 最近 owner 漂移；
  BattleSprite upload bounded grid 被误判第二 main owner；SpriteViewer asset 快速切换重建 owner。均先补红测。

## Build: 实现与自测

- Coding Owner: Codex（build 准入签字齐后开始）
- 修改文件: pending
- 实现摘要: pending
- 测试结果: pending

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: 已批准开工方向；最终功能验收 pending
- 后续任务: N/A

## 交接日志

- 2026-09-02 User + Codex：用户明确“做吧”。Codex 完成六文件/22 occurrence、互斥分支、CSS 与 registry
  一手审计，确认现有 wrapped API 足够且公共 API / DS 版本零变，签 premise verified + design agree。
  卡仍为 draft/build blocked。Next：Kimi 独立设计审查；不得实现。
- 2026-08-28 Codex：按 ED-CATALOG build-time scope 补签条件建卡并上看板；当前只冻结 6 文件旧债，未修改
  本卡实现。Next：完成四向真值与逐文件设计后送 Codex / Kimi / GLM build 前签字；三签齐前不得实现。

## 下一位 Agent 提示词

```text
审查 ED-WORKSPACE-ADOPTION-DEBT-1（Kimi 席，draft；生产实现只读，只允许更新任务卡 Kimi 设计签字
与交接，不得代签 GLM，不得转 build/done）。

任务卡：docs/ops/tasks/ED-WORKSPACE-ADOPTION-DEBT-1-editor-workspace-owner-adoption.md
当前：用户“做吧”与 Codex premise verified + design agree 在案；Kimi/GLM 未签，build blocked。

先读：AGENTS.md、docs/phase2/READ-FIRST.md、本卡全文、ED-CATALOG 卡 308-380 与 1320-1380、
packages/editor/src/ui/design-system/recipes.tsx:132-178、design-system-adoption.json、adoption.test.ts。

Kimi职责（独立证据）：
1. 复算现状/目标：27 pages 19 adopted+8 exception→27+0；102 scroll records不变；legacy
   6 entries/12 selectors/22 occurrences/9 pairs→0；9 main legacy records→DsObjectWorkspaceContent，
   canonical content records 11→20。
2. 逐文件核 Project/BattleSprite/SpriteViewer 与 Vars/EnemyTeam/BattleField 的 Hero、notice、
   creating/selected/empty/loading/error 分支及现有 CSS y owner。
3. 压测统一 wrapped 方案：hero fragment 承载 notice+selected Hero、children ternary正文；确认六文件都不需
   manual mode、公共 API 或 DS 升版。若认为必须扩 API，签 counter，不能顺手放宽。
4. 审测试/门禁：每态恰1 root+1 direct main owner；Hero/notice固定；focus fallback；Project四route；
   Battle upload bounded grid；Sprite快速切资源；raw/拼接/spread/dynamic/重复owner/stale legacy回流必红。
5. 审视觉矩阵 1280/900/720/高480；catalog/main/Inspector独立、末项可达、root/祖先不滚、横溢0。

输出：直接 file:line + 可证伪观察；通过则在任务卡 Kimi 席签 premise verified + design agree，并写下一位
GLM提示词；否则签 counter/列阻塞。不得修改实现，不得标 build/done。
```
