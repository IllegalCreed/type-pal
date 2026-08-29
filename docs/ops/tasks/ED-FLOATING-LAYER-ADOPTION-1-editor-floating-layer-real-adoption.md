# ED-FLOATING-LAYER-ADOPTION-1 - 编辑器浮层真实采用与防假绿门禁

Status: done（2026-08-29 Codex / Kimi / GLM 当前实现 accept + 用户验收齐，整卡收口）
Phase: phase2
Capability: Editor cross-cutting（不改变 capability-map）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: `main`

## 目标

让编辑器所有 route-live 弹出层与模态层由真实的公共 overlay owner 持有：工具选项、菜单和模态层不再被侧栏、
分隔条或祖先 `overflow` 遮挡/裁切；采用登记必须从真实路由组件闭包反推，不能只填一段 owner 文字便假报 adopted。

## 范围

- 范围内：
  - `IsometricEditorToolbar.ToolOptionTray`（地图和组合编辑器共同消费）迁入 `DsFloatingLayer`；保留
    listbox/option、左右键、Home/End、Escape、单次选择与焦点归还语义。
  - `DsMenuBar`、`DsListHeader` 更多菜单迁入 `DsFloatingLayer`，使当前生产调用点一并获得 portal、碰撞处理与
    light-dismiss。
  - `DsToolbar` dormant overflow menu：在本卡内迁入同一 owner，或若 census 证明 API 没有生产消费者则删除未用
    私有 popup 分支；不得留下下一次启用即回流的 absolute menu。
  - `CutsceneTab` 帧导入、`MapMode` 覆盖冲突与组合结构操作三个 route-live 私有 modal 迁入 `DsDialog`。
  - `ImageTab` 非浮层导入复核的误导性 `role="dialog"` 改为具名 section，避免 census 与辅助技术误判。
  - 为 adoption registry 增加 `ownerEvidence.overlay`，从 routed roots 的可达 JSX 闭包核对 owner、调用点、kind
    与例外；修正 `map/workspace`、`map/stamp`、`asset/cutscene` 等实际登记。
  - 静态审计覆盖业务生产代码中的 `dialog/alertdialog/menu/listbox/tooltip`、`aria-haspopup` 与 popup 几何；缺公共
    owner 或缺证据例外时 fail-loud。
- 范围外：
  - 地图 viewport 右键菜单保持 `canvas-local interaction overlay`：其坐标与裁剪属于画布 viewport，不套用
    DOM-anchor `DsFloatingLayer`，但必须证据化登记。
  - Inspector 文档流候选列表、预览 HUD、canvas decoration、持久 shell slot portal 不属于 popup，不迁移。
  - 不改变地图/组合/过场内容 schema、命令、存档、迁移、选择或画布渲染语义。
  - 不重开已完成的 `ED-DS-3`；本卡只补其后暴露的真实采用与门禁缺口。
- 明确不做：
  - 不以提高 `z-index`、取消祖先 `overflow` 或逐页面 CSS 补丁替代 portal/top-layer owner。
  - 不粗暴禁止所有 `position:absolute/fixed`；canvas-local、HUD、inline 等必须按 kind 精确分类。
  - 不在本卡重做菜单信息架构，也不把 ToolOptionTray 的既有全选项 Tab 债务扩成 roving-tabindex 重构。

## 前提真值门

### 一句话行为 / 工程前提

当前 H1-H14 工具托盘被侧栏遮挡不是单纯层级值偶发冲突，而是 route-live 业务浮层绕过公共 portal、采用登记又未
核真实 DOM/CSS 所致；同一漏洞还存在于公共菜单和三个私有 modal，必须以 owner + 证据门禁一次闭合。

### 四向真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：原版游戏没有二阶段编辑器浮层与采用登记。 | `docs/phase2/READ-FIRST.md:1-8` |
| 第一阶段 | N/A：第一阶段没有当前 Reforge 编辑器的 overlay 组件系统。 | `docs/phase2/READ-FIRST.md:32-37` |
| 当前二阶段 | `ToolOptionTray` 是 toolbar 内嵌的 absolute listbox；`DsMenuBar`、`DsListHeader` 与 dormant `DsToolbar` overflow 仍拥有局部 absolute popup；Cutscene/MapMode 仍有三个 raw modal。registry 却声称相关路由已采用 `DsFloatingLayer/DsDialog`，审计只验 owner 非空且只拦 native dialog/createPortal，故当前 gate 仍可假绿。 | `IsometricEditorToolbar.tsx:55-188`；`editor.css:925-945`；`design-system/navigation.tsx:117-142,304-357`；`design-system/controls.tsx:2207-2228`；`CutsceneTab.tsx:1057-1175`；`MapMode.tsx:3680-3764`；`design-system-adoption.json:1696-1757,2102-2110`；`design-system-audit.mjs:443-504,4439-4442` |
| 本任务目标 | route-live popup/modal 只能由公共 owner 持有，或作为边界明确、可达且有移除/保留理由的证据例外；地图/组合托盘在侧栏、窄宽和缩放下始终位于可交互 top surface。 | 用户 2026-08-29 截图与“该返工的返工、该改的改”裁决；本卡验收条件 |

### 用户可见 before -> after

`before`：H1-H14 托盘贴在 toolbar 内，以局部 absolute + 业务 z-index 渲染，侧栏/分隔条可覆盖；相同私有层即使
route registry 写着 adopted 也不会被 gate 拦住。

`after`：托盘、公共 popup 与模态层分别由 `DsFloatingLayer` / `DsDialog` 持有；打开后不被侧栏、滚动祖先或
视口边缘遮挡，键盘/关闭/焦点行为保持；registry 与真实路由 JSX 不一致立即红。

用户裁决：2026-08-29 用户指出弹出层被侧边栏遮挡，并明确要求实际返工而不是只报告问题。

### 替代解释与可证伪观察

- 最强替代解释：截图只是 `.map-tool-option-tray` 与分隔条同为 `z-index:30`，把托盘 z-index 调高即可。
- 反证：提高子层 z-index 不能逃逸祖先 stacking context / `overflow`，也不修 registry 假 adopted、公共菜单和 raw
  modal 的同类所有权缺口。
- 会推翻当前前提的观察：迁移后托盘已 portal 到 `BODY` 或最近 open dialog、computed position 为 fixed、边界在
  viewport 内，但 `elementFromPoint` 仍命中侧栏；若出现则继续调查 browser top-layer 或新的覆盖层，不再假定
  overflow/stacking 是唯一根因。
- 门禁反证：若 private absolute listbox、虚假 registry owner 或 stale exception 仍能通过，adoption 闭包失败；
  若 canvas HUD / Inspector inline listbox 被误报，则 census 分类过宽。

## 上下文锚点

- 阶段铁律：`AGENTS.md`、`docs/phase2/READ-FIRST.md`。
- 公共合同：`docs/phase2/editor/editor-design-system-v1.md:97-103,460-463`。
- 公共 primitive：`packages/editor/src/ui/design-system/floating-layer.tsx:20-166`、
  `packages/editor/src/ui/design-system/overlays.tsx`。
- 当前托盘：`packages/editor/src/ui/IsometricEditorToolbar.tsx:55-188`、
  `packages/editor/src/ui/editor.css:925-945`；调用点 `MapMode.tsx:2952-3016`、
  `StampContentEditor.tsx:648-685`。
- 公共 popup 债：`design-system/navigation.tsx:117-142,304-357`、
  `design-system/controls.tsx:2207-2228`、`design-system/primitives.css:1281-1315,1533-1549,1695-1715`。
- raw modal：`CutsceneTab.tsx:1057-1175`、`MapMode.tsx:3680-3764`、
  `editor.css:7853-7888,7947-7958`。
- 合法例外：`MapMode.tsx:537-552,3067-3164`（viewport-clamped canvas menu）；
  `MapMode.tsx:3192-3258`（Inspector inline）；`StampContentEditor.tsx:643,647`（持久 shell slot）。
- 假绿根因：`design-system-adoption.json:1696-1757,2102-2110`、
  `design-system-audit.mjs:443-504,4439-4536`、`design-system/boundary.test.ts:609-627`。
- 现有正向测试：`design-system/floating-layer.test.tsx:55-204`、`design-system/overlays.test.tsx`、
  `MapMode.test.tsx:668-710`、`StampLibraryTab.test.tsx:768-810`。
- 不得重新引入：业务内嵌 popup 几何、route registry 文字代替 live owner、无证据 absolute/fixed 例外、
  modal backdrop 私有复制。

## 冻结设计

### Popup owner

- `ToolOptionTray` 保留 trigger 与内层 `role=listbox`，外层改由 `DsFloatingLayer` 提供 portal、viewport clamp、
  above/below flip、start/end align、scroll/resize reposition 和 light-dismiss；删除本地 document pointer listener。
- `width="content"`、现有 `align` 与约 7px gap 保持；portal 后在托盘自身显式恢复 nowrap、横向 overflow 与
  bounded max-width，不依赖 toolbar 继承。
- `DsMenuBar`、`DsListHeader`、`DsToolbar` 的 popup 同样消费 `DsFloatingLayer`，各自保留现有 menu semantics、
  keyboard navigation、单次选择和 trigger focus restoration。
- 不为这一批需求新增第二套 portal 或 positioning helper；若现有 `DsFloatingLayer` API 确有缺口，必须由 reviewer
  先 counter 并列出最小公共 API before -> after，不能业务侧绕过。

### Modal owner

- Cutscene frame import、Map overwrite conflict、Map stamp lifecycle 迁入 `DsDialog`；保留现有内容、命令与确认/
  取消语义，关闭后聚焦原触发点。
- modal 内唯一长列表继续由原有内容 viewport 持有滚动；dialog body 与内层不得形成无意双滚动。
- `ImageTab` 当前 inline review 改为可访问的具名 section，不伪装 modal。

### Adoption gate

- `ownerEvidence.overlay` 必须精确对应 routed roots 与 route-live reachable JSX；登记 component 不可达、owner 未渲染、
  live owner 未登记、例外过期或 kind 不匹配均失败。
- overlay census 至少区分 `anchored-popup`、`modal`、`canvas-local`、`inline`、`preview-hud`、`shell-slot`。
- AST/CSS gate 必须先对三个反例转红：private absolute listbox、registry 虚假 owner、stale exception；同时以
  canvas-local/inline 正例证明不会误杀。
- 删除 `boundary.test.ts` 对 `IsometricEditorToolbar` handcrafted choice 的无条件放行，改验其实际消费公共 owner。

## 验收条件

- 地图与组合编辑器打开高度托盘时，listbox host 是 `BODY` 或最近 open dialog，不是 toolbar 后代；computed
  position 为 fixed。
- 320/480/720/1280px、左右侧栏开/关、100%/125%/150% zoom 下，托盘位于 viewport 8px 安全边界内；
  `elementFromPoint` 命中托盘而非侧栏/分隔条；底部空间不足自动上翻，首尾选项可达。
- 外点/Escape 关闭并归还 trigger 焦点；左右键、Home/End、点击选择仍只产生一次 change；Map 与 Stamp 写入不变。
- `DsMenuBar`、`DsListHeader` 当前生产菜单同样不受祖先 overflow/stacking 影响；dormant Toolbar 分支不留回流面。
- 三个 modal 使用 native top layer，Tab 不逃逸，Escape/按钮关闭，焦点归还；其原命令各只触发一次。
- gate 对三个负例必红、对 canvas-local/inline/HUD/shell-slot 正例不误报；registry 与 routed JSX 双向闭合。
- 受影响聚焦测试先行；实现完成后仅跑一次 editor 受影响包全量测试与 typecheck，不重复耗时全量。
- 最小浏览器证据保存托盘被侧栏覆盖的原场景，以及 MenuBar/ListHeader/三 modal 各至少一个代表路径。

## 验证命令（设计冻结，build 后执行）

```bash
pnpm --filter @type-pal/editor exec vitest run \
  src/ui/design-system/floating-layer.test.tsx \
  src/ui/design-system/overlays.test.tsx \
  src/ui/design-system/boundary.test.ts \
  src/ui/IsometricEditorToolbar.test.tsx \
  src/ui/MapMode.test.tsx \
  src/ui/StampLibraryTab.test.tsx \
  src/ui/CutsceneTab.test.tsx
pnpm --filter @type-pal/editor audit:design-system
pnpm --filter @type-pal/editor typecheck
```

## 风险

- Portal 后丢失 toolbar 继承样式导致换行、宽度或滚动退化。
- 外点 dismiss 与 option pointer/click 顺序冲突，造成未选择或双提交。
- 公共菜单迁移破坏左右键、字符查找、checkbox menuitem 或焦点归还。
- raw modal 迁移形成双 scroll owner，或确认命令因 submit/click 路径重复执行。
- overlay AST/CSS 规则过宽误杀 canvas/HUD，过窄则继续让普通 div + absolute 假绿。
- 共享 dirty worktree 中已有大量相关 WIP；Coding Owner 必须逐文件核现状，不覆盖相邻任务改动。

## Build 证据

- 当前：完成。`ToolOptionTray`、`DsMenuBar`、`DsListHeader` 更多菜单已迁入
  `DsFloatingLayer`；删除 `DsToolbar.overflowAfter` 零消费者私有分支；Cutscene 帧导入、Map 覆盖冲突与
  组合结构确认已迁入 `DsDialog`；Image 导入复核已恢复为具名 section。
- 采用门禁：`design-system-adoption.json` 升至 v4，25 个 route registry 的 overlay owner / evidence 从
  live route closure 反推；7 个 canvas-local / inline / preview-hud / shell-slot 例外精确登记。门禁负例覆盖
  private listbox、伪造 owner、stale exception，并删除了 Isometric toolbar 的无条件白名单。
- 聚焦测试：`11 files / 232 tests passed`（adoption、boundary、floating-layer、overlays、controls、
  Isometric toolbar、App navigation、MapMode、StampLibrary、Cutscene、Image）；单独 adoption
  `21/21`、boundary `50/50` 通过。
- 静态门禁：`pnpm --filter @type-pal/editor audit:design-system` 通过（88 files）。
- 全量测试 / typecheck：editor 全量按纪律仅运行一次，**173/174 files、1426/1427 tests passed**；
  唯一失败是资源引用测试仍把 shell 已删除引用、canonical 孤立正文当作 live 私有脚本，与本轮已经验收的
  “删除后不复活 detached 正文”合同冲突。夹具补入真实 `item:item.live:use` runtime ref 后聚焦 **3/3**
  通过，不重复耗时全量；`pnpm --filter @type-pal/editor typecheck` 通过，`git diff --check` 通过。
- 浏览器验证：`1280×720` 下顶部“地图”菜单、地图列表“更多操作”和高度选项均 portal 到 `BODY`、
  computed `position: fixed`，`elementFromPoint` 命中浮层；高度托盘 16 项首尾可达，Escape 后焦点归还
  trigger。`480×720` 下高度托盘边界为 `left=8/right=472`，保持 8px 安全边界与横向滚动；控制台 0 error。
- 提交：pending；不得混入 `.mimosa/` 或无关 WIP。

## 推进签字

### 进入 build 前设计签字（当前）

- Codex：
  - premise：**verified（2026-08-29）**。直接证据见四向真值；本地运行现有 design-system audit 仍通过，
    但 route-live `ToolOptionTray`、公共 absolute popup 与三个 raw modal 均可达，registry/审计未核实际 owner。
  - design：**agree（2026-08-29）**。赞成公共 popup/modal owner、全 overlay census、route-live
    `ownerEvidence.overlay` 与精确例外；不接受 z-index/CSS 单点补丁。
- Kimi：
  - premise：**verified（2026-08-29，本人独立直读托盘 / 公共 popup / raw modal / registry / audit，
    非复述 Codex）**:
    1. **ToolOptionTray 与两调用点实锤**: `IsometricEditorToolbar.tsx:55-134`——toolbar 内嵌
       `div.map-tool-option` + 本地 document pointerdown listener(:72-79)+
       `editor.css:925-942 .map-tool-option-tray { position:absolute; top:calc(100%+7px);
       z-index:var(--ds-z-popover) }`,listbox / 键盘(moveFocus :95-103)/ focusOption(:85-87)/
       `aria-haspopup="listbox"`(:118)在位;两个生产调用点 = `MapMode.tsx:2956` 与
       `StampContentEditor.tsx:652`(经 `IsometricEditorToolbar` 消费,其内部 :263/:277 两处
       使用 ToolOptionTray)。替代解释"调 z-index"不成立:子层 z-index 逃不出祖先 stacking
       context / overflow 裁剪。
    2. **公共 popup 债实锤**: `navigation.tsx:117-142` DsMenuBar 的
       `div.ds-menu-popover[role=menu]` 文档流内 absolute,内联键盘导航与 trigger 焦点归还
       (:128-138)在迁移时必须保持。
    3. **raw modal 与 registry 假绿实锤**: `CutsceneTab.tsx:1057-1064`——
       `div.modal-backdrop > div[role="dialog"][aria-modal="true"]` raw modal;而
       `design-system-adoption.json:2102-2110` asset/cutscene 登记 `"overlay": "DsDialog"`
       ——直接矛盾的假绿。`design-system-audit.mjs:443-476` 只查 legacy class / native 表单
       元素,**无 role=dialog / aria-modal / raw modal 检查**;overlay owner 校验(:2773-2781)
       只验字符串非空——假绿机制闭合。
    4. **合法例外边界**: `MapMode.tsx:537-552,3067-3164` viewport-clamped canvas 右键菜单
       (canvas-local)、`:3192-3258` Inspector inline、`StampContentEditor.tsx:643,647` 持久
       shell slot——卡面登记与生产结构一致,canvas-local 不套 DOM-anchor portal 的分类成立。
  - design：**agree(2026-08-29，附 K-F1-K-F6 必落钉）**:
    - **K-F1(托盘语义保持钉)**: listbox / option、左右键、Home / End、Escape、单次选择与
      trigger 焦点归还迁移后逐项 DOM 测试;light-dismiss 与 option pointer / click 顺序不得
      吞掉选择或双提交;`width="content"`、现有 align 与约 7px gap 保持。
    - **K-F2(portal 样式恢复钉)**: portal 后 toolbar 继承丢失——托盘自身显式恢复 nowrap /
      横向 overflow / bounded max-width;320 / 480 / 720 / 1280px × 侧栏开关 ×
      100/125/150% zoom 矩阵,`elementFromPoint` 命中托盘而非侧栏 / 分隔条,8px viewport
      安全边界,底部不足自动上翻,首尾选项可达。
    - **K-F3(modal 单滚动 / 单命令钉)**: 三个 raw modal(Cutscene 帧导入 :1057、Map 覆盖
      冲突、Map 组合操作)迁 `DsDialog` 后:native top layer、Tab 不逃逸、Escape / 按钮关闭
      焦点归还原触发点;内容 viewport 唯一滚动(无 dialog body + 内层双滚动);确认命令只
      触发一次(submit / click 路径不重复)。
    - **K-F4(门禁双向钉)**: `ownerEvidence.overlay` = routed roots 可达 JSX 闭包;登记组件
      不可达 / owner 未渲染 / live owner 未登记 / 例外过期 / kind 不匹配均红;三负例
      (private absolute listbox / 虚假 registry owner / stale exception)红先行,
      canvas-local / inline / preview-hud / shell-slot 正例不误杀;删除
      `boundary.test.ts:609-627` 对 IsometricEditorToolbar handcrafted choice 的无条件放行,
      改验实际消费公共 owner。
    - **K-F5(dormant Toolbar 钉)**: `DsToolbar` overflow 分支 build 前 census 写明:有生产
      消费者则同迁 `DsFloatingLayer`,零消费者则删除私有 popup 分支——不得留下次启用即
      回流的 absolute menu。
    - **K-F6(顺序与 WIP 钉)**: `ED-TEXT-OVERFLOW-1` K-T6 已声明本卡先落浮层 owner 迁移,
      顺序互锁成立;Hero 媒体增量(ED-CATALOG-ROW-IA-1)只碰业务 Hero media、不碰
      floating-layer / controls,可并行;共享 dirty worktree 中逐文件核现状,不覆盖相邻
      WIP。
  - 独立可证伪观察: ①迁移后托盘已 portal 至 BODY / 最近 open dialog、computed position
    fixed,`elementFromPoint` 仍命中侧栏 → 根因不止 overflow / stacking,继续查 top-layer
    冲突(卡面 :76-78 已载,本席背书);②portal 后换行 / 宽度 / 滚动退化 → K-F2 失败;
    ③dismiss 吞选择或双提交 → K-F1 失败;④canvas-local / inline 被 census 误报 → 分类
    过宽返工;⑤虚假 owner / stale exception 仍通过 gate → K-F4 失败。
- GLM：
  - premise：**verified（2026-08-29，本人独立直读托盘 CSS/两调用点/三 raw modal/公共菜单债/
    ownerEvidence 现状，非代理）**：
    1. **托盘遮挡根因实锤** ✓：`.map-tool-option-tray`（editor.css:925-945）=
       `position:absolute + top:100%+7px + z-index:var(--ds-z-popover)`——渲染在 toolbar
       后代内，被侧栏/分隔条祖先 stacking/overflow 遮挡；**仅调 z-index 无法逃逸祖先
       stacking context**，“不接受 z-index 补丁”的立场结构上成立。
    2. **两调用点复算一致** ✓：`IsometricEditorToolbar`（:55 定义，:142 tray 类，:263/:277
       两处内部使用）恰由 MapMode:2956 与 StampContentEditor:652 消费——无第三调用方。
    3. **三个 raw modal 实锤** ✓：私有 `modal-backdrop` div 模式（editor.css:7853-7888
       `position:fixed + z-index:2000`）——CutsceneTab:1058 帧导入、MapMode:3681 覆盖冲突、
       :3717 stamp 生命周期；Cutscene raw `role="dialog"` 与 registry `"overlay":"DsDialog"`
       prose 直接矛盾——假绿实锤。
    4. **ownerEvidence.overlay 现状 = 0/25** ✓：本席复算全部 25 页无任何 overlay 证据
       登记——现有 gate 对 overlay owner 零验证，`ownerEvidence.overlay` 双向门禁是全新
       真值层（这正是本卡的核心增量）。
    5. **公共菜单债在位** ✓：navigation 菜单 absolute+z-index（primitives.css:99/:222/:419）；
       DsListHeader 菜单用原生 `<details>`（:1281-1315，relative 祖先裁剪）；boundary
       :609-627 对 handcrafted choice（含 IsometricEditorToolbar:623）**无条件放行**——
       假绿通道实锤。
    6. **例外完整性** ✓：canvas-local 右键菜单（MapMode:537-552/:3067-3164 viewport-clamped
       画布坐标）、Inspector inline（:3192-3258）、Stamp 持久 shell slot
       （StampContentEditor:643-647 createPortal 到常驻 host）——三类确属非 DOM-anchor
       popup，误列入 census 才是错误；ImageTab 伪 `role="dialog"` 改具名 section 分类正确。
  - design：**agree（2026-08-29，附 GF1-GF4 必落钉）**：
    - **GF1（overlay census 六类双向）**：anchored-popup / modal / canvas-local / inline /
      preview-hud / shell-slot 六类闭合；每 anchored/modal 面 route-live producer
      {source,component,callsite} 可达；`ownerEvidence.overlay` 从 0/25 升到全量双向——
      登记不可达红、live 未登记红；**三负例红先行**（私有 absolute listbox / 虚假 registry
      owner / stale exception）+ canvas-local/inline/HUD/shell-slot 四正例不误报。
    - **GF2（托盘迁移闭包）**：删除 boundary:609-627 无条件放行，改为验实际消费
      `DsFloatingLayer`；托盘 host=BODY/最近 open dialog、computed fixed、viewport 8px
      边界、elementFromPoint 命中托盘——两调用点 + “无第三消费方”由 gate grep census
      持续钉住；删本地 document pointer listener 防双 dismiss。
    - **GF3（三 modal 迁移）**：Cutscene 帧导入 / Map 覆盖冲突 / Map stamp 生命周期迁
      `DsDialog`（native top layer、Tab 不逃逸、焦点归还、确认命令恰一次）；私有
      `modal-backdrop` CSS 删除或登记死规则；dialog body 与内层长列表无双 scroll owner。
    - **GF4（例外证据化）**：canvas-local/Inspector inline/shell-slot 三例外逐条
      owner/性质/验证/删除条件；ImageTab 具名 section；新增例外必须先登记后使用。
  - 可证伪观察：①迁移后托盘 portal+fixed 但 elementFromPoint 仍命中侧栏——根因假设
    失效继续查 top-layer；②私有 absolute listbox / 虚假 owner / stale exception 任一
    仍绿——GF1 闭包失败；③canvas HUD/inline 被误报——census 分类过宽回炉；④公共菜单
    迁移破坏键盘/单选/焦点归还——GF3 级返工。
- 独立 primary-source 反证审查（补充 GLM 席）：本席直读覆盖与 Kimi 互补——托盘 CSS 根因 +
  ownerEvidence 0/25 全量复算 + boundary 无条件放行通道 + 三例外性质判定（见上）；两席
  结论一致无分歧。
- 独立 primary-source 反证审查：**Kimi（2026-08-29）**。已直接验证 ToolOptionTray 两个生产调用点
  （`MapMode.tsx:2956` / `StampContentEditor.tsx:652` 经 `IsometricEditorToolbar`，内部 :263/:277
  两处使用——无第三消费方漏列）、三个 raw modal 之一的 Cutscene 帧导入（`CutsceneTab.tsx:1057-1064`
  raw `role="dialog"` 与 registry `"overlay": "DsDialog"` 直接矛盾）、canvas-local 例外
  （`MapMode.tsx:537-552,3067-3164` viewport-clamped 右键菜单坐标/裁剪属画布 viewport，误列入
  DOM-anchor popup 才是错误）。漏列 / 误列结论：调用点与例外清单与生产结构一致；ImageTab 的
  误导性 `role="dialog"` inline review 改具名 section 属正确分类（非 modal）。会推翻根因的观察：
  若迁移后 portal + fixed + viewport 内仍被侧栏命中，则 overflow / stacking 不是唯一根因，须继续
  查 browser top-layer 或新覆盖层（卡面 :76-78 已载，本席背书为该反例的第一检查项）。
- counter / 分歧处理：任一席 counter 则保持 blocked；公共 API、Toolbar dormant 分支或例外边界无法收敛时交用户裁决。
- 缺签豁免：N/A。
- build 准入结论：**allowed（2026-08-29，Codex + Kimi + GLM（GF1-GF4）三签齐、无 counter）。
  实现前置：本卡先于 ED-TEXT-OVERFLOW-1 落地（浮层 owner 迁移先行的串行约定）；Coding Owner
  逐文件核现状，不覆盖共享 worktree 相邻任务 WIP。实施提示词见卡面"下一位 Agent 提示词
  （Codex build 版）"。**

### 进入 done 前签字

- Codex：**accept（2026-08-29，当前实现）**。公共 popup/modal owner、25/25 route overlay evidence、
  7 个精确例外、工具托盘键盘/焦点与三 modal 迁移均已由聚焦测试和浏览器证据闭合；editor 唯一一次
  全量为 173/174 files、1426/1427 tests，唯一红项确认是私有脚本删除合同变化后的旧夹具，修正 live ref
  后聚焦 3/3 通过；typecheck 与 diff check 通过。无产品回归、无剩余返工项。
- Kimi：**accept（2026-08-29，当前实现只读终审，本人独立直读迁移面 / registry 复算 + 聚焦复跑 +
  typecheck，非复述 Codex / GLM）**:
  1. **ToolOptionTray 迁移 ✓(K-F1/K-F2)**: `IsometricEditorToolbar.tsx:130-192`——
     `DsFloatingLayer`(`width="content"` / `align` / `gap={7}` / `maxHeight={360}`),
     `onDismiss` 关闭且 `triggerRef.current?.focus()`(:139-142);listbox / option、
     ArrowLeft/Right、Home / End、Escape 关闭 + 焦点归还(:146-166)、点击
     `onChange` 单次选择 + 关闭 + 焦点归还(:182-186)全保持;本地 document pointer
     listener 已删(本人 grep `document.addEventListener` 零命中)。
  2. **公共菜单与 dormant 分支 ✓(K-F5)**: `navigation.tsx:118-234` DsMenuBar 已包
     `DsFloatingLayer`;`overflowAfter` 在 `controls.tsx` 零命中——dormant Toolbar 私有
     popup 分支删除(选删除路径);`DsToolbar` 组件本体保留(EditorAppHeader.tsx:51 在用)。
  3. **三 modal 与 Image 修正 ✓(K-F3)**: `CutsceneTab.tsx:1059-1175` 已迁 `DsDialog`,
     `modal-backdrop` / raw `role="dialog"` 零命中;Map 覆盖冲突与 stamp 生命周期同迁
     (Build 登记 + MapMode 测试绿);ImageTab 导入复核改具名 section。
  4. **registry v4 双向 ✓(K-F4,本人 node 复算)**: `design-system-adoption.json` version 4;
     **25/25 页 `ownerEvidence.overlay` 齐备**(GLM design 时复算 0/25 → 现 25/25);
     `map/workspace` owner="DsDialog + DsFloatingLayer",evidence 含 anchored-popup /
     canvas-local / inline / modal / preview-hud 五种 kinds;overlay 例外恰 7 条;
     Isometric toolbar 无条件白名单已删(boundary.test 50/50 在复跑内)。
  5. **复跑与类型证据**: 本人聚焦 11 文件(adoption / boundary / floating-layer /
     overlays / controls / toolbar / MapMode / StampLibrary / Cutscene / Image /
     editor-navigation)**229/229 全绿**;`pnpm --filter @type-pal/editor typecheck`
     **通过**(补 Codex 登记中 typecheck pending 的证据缺口)。浏览器几何(1280×720 /
     480×720 elementFromPoint 命中、8px 边界、Escape 焦点归还)已登记,符合最小视觉
     验证分层。editor 全量按"后续串行卡统一跑一次"纪律 pending,不阻断本 accept——
     收口前由 Coding Owner 补跑并登记。
  - 无返工项。Codex 表内正式 done accept 与用户复验齐前不得标记 done。
- GLM：**accept（2026-08-29，只读终审，本人一手直读迁移面/registry/门禁 + 独立复跑，非代理；按 GF1-GF4 逐钉）**：
  1. **GF2 托盘迁移闭包** ✓：`IsometricEditorToolbar.tsx:130-192` 托盘外层改
     `DsFloatingLayer`；boundary:609-625 升级为真实消费断言——toolbar 含
     `aria-haspopup="listbox"` 与 `<DsFloatingLayer`、**无 document pointerdown
     listener**、`.map-tool-option-layer` position:fixed、`.map-tool-option-tray`
     不再 absolute/fixed——原 :609-627 无条件放行已删除（本席直读新断言）。
     Codex 浏览器证据：portal BODY + fixed + elementFromPoint 命中 + 480px 8px
     安全边界 + Escape 焦点归还。
  2. **GF3 三 modal 迁移** ✓：Cutscene 帧导入（CutsceneTab:1059-1175）与 Map
     覆盖冲突/stamp 生命周期（MapMode:3667/:3696-3740）均迁 `DsDialog`；私有
     `modal-backdrop` 生产仅剩 `canonical-script-modal-backdrop`（editor.css:12462，
     ScriptEditor 域——与本卡三 modal 无关的既有类）；本卡三处 raw backdrop 零残留。
  3. **GF1 overlay census 双向** ✓：registry 升 **v4**，`ownerEvidence.overlay`
     **25/25 全覆盖**（设计审查时为 0/25——假绿根因结构性消除）；7 个
     canvas-local/inline/preview-hud/shell-slot 例外精确登记；负例（私有 listbox/
     伪造 owner/stale exception）在 gate。
  4. **独立复跑**：`adoption + boundary + floating-layer + IsometricEditorToolbar`
     → **4 files / 80 tests 全绿**（本席执行）；卡面 11 files / 232 聚焦与
     audit 88 files 证据一致。
  - 无返工项。未修改实现文件，未代签。
- 用户复验：**accept（2026-08-29）**。用户确认“浮层我验收了 ok”。
- done 准入结论：**allowed / done（2026-08-29）**。Codex + Kimi + GLM 当前实现 accept 与用户验收齐，
  无 counter、缺签或剩余阻塞。

## Review

- Reviewer：Kimi + GLM。
- 当前结论：**done**。build、Coding Owner 收口、Codex / Kimi / GLM 当前实现 accept 与用户验收均已完成。
- 审查重点：真实 portal/top-layer owner、现有语义不退化、route-live census 双向闭合、例外精确且可证伪。

## 用户验收

- 2026-08-29 用户指出 H1-H14 弹出层被侧边栏遮挡，并追问之前统一修复为何失效。
- 2026-08-29 用户进一步明确“该返工的返工、该改的改，别每次光说不做”，授权本卡在签字门禁满足后实施
  共性闭包，而非只调当前截图 z-index。
- 当前复验：**accept（2026-08-29）**。用户已确认浮层验收通过；验收范围包含浮层不被侧栏裁切、窄宽安全
  边距、Escape 关闭与焦点归还。

## 交接日志

- 2026-08-29 User：完成浮层复验并确认 ok。Codex / Kimi / GLM 当前实现 accept 已齐，本卡转 done；无剩余
  交接或返工项。

- 2026-08-29 Codex：完成 route-live overlay census，确认 ToolOptionTray 同时影响 Map/Stamp，公共 MenuBar/
  ListHeader 与 dormant Toolbar 仍局部 absolute，Cutscene/Map 有三个 raw modal；确认现有 audit 假绿与合法
  canvas-local/inline/HUD/shell-slot 边界。已开卡并签 premise/design；未修改实现。Next：Kimi + GLM 设计重签。
- 2026-08-29 Kimi: 独立直读 ToolOptionTray(IsometricEditorToolbar.tsx:55-134 + editor.css:925-942
  absolute tray + 本地 pointer listener)与 Map:2956 / Stamp:652 两调用点、DsMenuBar 内联 popover
  (navigation.tsx:117-142)、CutsceneTab.tsx:1057-1064 raw modal 与 adoption.json:2108 "DsDialog"
  假登记矛盾、audit.mjs:443-476 无 raw modal / role=dialog 检查、canvas-local / inline / shell-slot
  合法例外。签 premise verified + design agree,附 K-F1(托盘语义保持)/ K-F2(portal 样式恢复 +
  四宽三 zoom elementFromPoint 矩阵)/ K-F3(modal 单滚动单命令)/ K-F4(ownerEvidence.overlay
  双向 + 三负例红先行 + 正例不误杀)/ K-F5(dormant Toolbar 迁移或删除)/ K-F6(TEXT-OVERFLOW 顺序
  互锁 + WIP 卫生)六钉,完成独立反证(调用点无漏列、例外无误列、根因可证伪项背书)。未修改实现
  文件。Next: GLM 设计签字;三签齐后 Codex 按卡内 Codex build 提示词实施。
- 2026-08-29 Codex：完成公共 popup/modal owner 迁移、overlay route closure 与 7 个精确例外；删除
  dormant Toolbar 私有 popup 和旧 raw modal CSS。聚焦测试 11 files / 232 tests、design-system gate、
  1280/480 浏览器几何与焦点验证均通过，任务进入 review。Next：Kimi + GLM done 前终审。
- 2026-08-29 Kimi: done 前只读终审。直读 `IsometricEditorToolbar.tsx:130-192`(DsFloatingLayer
  gap=7 / onDismiss 焦点归还 / listbox 键盘与单次选择全保持 / 本地 pointer listener 删除)、
  `navigation.tsx:118-234`(DsMenuBar 迁移)、`overflowAfter` 零命中(dormant 分支删除)、
  `CutsceneTab.tsx:1059-1175`(DsDialog,raw modal 清零);node 复算 registry v4: **25/25 页
  overlay evidence 齐备**(0/25 → 25/25),map/workspace 五种 kinds,例外恰 7 条。复跑 11 文件
  **229/229 全绿**;**补跑 typecheck 通过**(Codex 登记的 pending 缺口)。签 **accept**,无返工
  项,未修改实现文件。准入更新为待 Codex 正式 done accept + 用户复验;editor 全量由收口前统一
  补跑。Next: Codex 表内 accept -> 用户复验收口。
- 2026-08-29 Codex：完成 done 前收口。editor 唯一一次全量 173/174 files、1426/1427 tests；唯一失败为
  物品私有脚本删除合同变化后的 stale fixture，补入 live runtime ref 后聚焦 3/3 通过；typecheck 与
  `git diff --check` 通过。签当前实现 accept，无返工项。Next：用户复验浮层边界、Escape 与焦点归还。

## 下一位 Agent 提示词

无下一位 Agent 提示词：三方当前实现 accept 与用户验收齐，任务已 done。
