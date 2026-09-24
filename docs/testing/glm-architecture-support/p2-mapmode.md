# P2 · MapMode.tsx 生命周期与手势边界取证（ARCH-SUPPORT-GLM-1）

日期 2026-09-25。冻结 SHA `3270473862…`。对象：`packages/editor/src/ui/MapMode.tsx`
（实测 **3819 行**，与卡面一致）。静态只读取证。

## 1. 输入生命周期（pointer / 键盘 / 选择 / 剪贴板 / 拖拽）

- **手势状态 ref**：`strokeRef: Map<string, StrokeEdit>`（:394，笔划中逐格收集，onUp 一次性提交）、
  `hoverRef`（:395）、`coordinateHoverRef`（:396）、`selectionDragRef` / `selectionPreviewRef`
  （选区拖拽 + 预览镜像）、`paintingRef` / `rectAnchorRef`（矩形笔刷锚）、`stampSessionRef`
  （图章作者会话防串 :416-421）。全部为组件私有 ref，无模块级可变状态。
- **canvas pointer 三入口**（React 合成事件 :3072-3074）：`onDown`（:1948，按键过滤 0/1、
  transformIntent 落点冻结、stamp 单击放置、笔刷起点）、`onMove`（:2158，hover/拖拽更新）、
  `onUp`（:2222，selectionDrag 按 pointerId 校验后提交 set-selection/set-stamp-group-selection，
  paintingRef 收集 strokeRef 按 tile/collision 分组派发单条命令并清空）。pointerId 校验（:2224）
  保证多点触控不串——**cancel/leave 路径**：React onPointerUp 只覆盖 up；窗口失焦保护在
  `window blur`（:2309-2310，对称清理），未见 `onPointerCancel`/`lostpointercapture` 处理
  （risk-P2-002）。
- **键盘**：canvas `onKeyDown`（:3097）+ 右键菜单（:3119）+ 候选菜单（:3239）+ Inspector 内联
  （:3313/:3470/:3506/:3536/:3580）；全局级监听仅 window blur 一个（:2309）。
- **剪贴板**：组内 Alt 与普通剪贴板快捷键隔离（MapMode.test.tsx:1519 标题实证）；整组复制粘贴
  生成新 ID（:1192 标题）。
- **会话/项目切换清场**：mapId 变化清 pendingDelete/workspaceNotice/selectionPreview/candidate
  菜单/transformIntent（:605-628）；EditSession 变换清组选择/变换预览/剪贴板/删除确认
  （test :1579/:1611/:2000 标题）。

## 2. effect 清理与取消/提交/undo 同步区

19 个 useEffect 逐一核对：

| effect | 职责 | 清理 | 评注 |
|---|---|---|---|
| :338/:341 | referenceIndex 变化撤销 pendingDelete | —（state 重置幂等） | 双 effect 职责重叠（risk-P2-003） |
| :388/:391 | 选区非 cells 关图章对话框；图章失效回收工具 | — | 幂等 |
| :416-421 | stampSession 防串（同 id 另一项目副本） | — | 注释明确；测试 :1507 标题实证 |
| :528 | workspaceNotice 上抛 | — | 纯转发 |
| :541-555 | 右键菜单 rAF 聚焦 + document pointerdown 外点关闭 | :555 remove 对称 | 闭环 |
| :584 | ensureMapLoaded | **无清理，catch 吞错** | 同 P1-003 同型（risk） |
| :589/:595/:600 | 活动层/图章选择失效兜底 | — | 幂等自愈 |
| :605 | mapId 变更清场 | — | 见上 |
| :630 | liveMap 同步 clip-map | — | dispatchWorkspace 幂等 |
| :635 | fit-map（lastFitMap ref 防重） | — | 闭环 |
| :789 | 变换预览 | — | test :1962 标题实证取消路径 |
| :2309 | blur 清 hover | remove 对称 | 闭环 |

undo/redo 同步：全部内容修改走 `dispatchWorkspace`/`dispatchStampGroupEdit` 单命令历史
（test :977 `图层动作组上移按稳定 ID 只派发一条 MoveProjectMapLayerCommand`、:1101
`整组移动…一步历史提交`、:1216/:1247 标题）——数据修改不绕历史层，DOM/UI 态（预览、菜单、
hover）在提交/取消路径显式重置。

## 3. 数据/DOM 边界与拟拆单元的保真断言

- 画布渲染为 canvas + lattice 数学（pixelToLattice/isLatticeInside），DOM 只承载面板/菜单/Inspector；
  菜单聚焦走 `canvasContextMenuRef` 局部 querySelector（:543-547），无全局 DOM 越权查询（对照
  App 滚动恢复同样 `:scope >` 限定）。
- 拟拆单元（建议，非执行）：① 图章作者态（stampSession + 图章对话框 + 组内编辑）自成闭环；
  ② 选区/拖拽手势（selectionDragRef 族）；③ 变换预览（transformIntent + planTransform :651 +
  transformPermissionForPlan :768）。每个单元的保真断言已被下表测试钉住。

## 4. 现有测试去重表（MapMode.test.tsx 58 条 test(，全部精确标题）

本包抽取与生命周期直接相关的 20 条作对账（其余 38 条为内容交互合同，同文件可查）：

| 标题（:行） | 确实证明 | 与本包差异 |
|---|---|---|
| :1507 `切换到同 mapId / placementId 的另一项目会话会清空组选择与组内上下文` | 会话防串 | covered |
| :1579 `切换 EditSession 会清掉旧项目正在进行的变换预览与剪贴板` | 跨会话清场 | covered |
| :1611 `切换同 mapId 的 EditSession 会清掉旧项目删除二次确认` | 删除确认清场 | covered |
| :1663/:1688（引用索引缺失/revision 更新撤销删除确认） | 引用态与删除确认同步 | covered |
| :1962 `变换预览锁定 Inspector，切回平移后取消预览、清空选区并恢复地图属性` | 变换取消路径 | covered |
| :1131 `画布点击即冻结并放下移动目标…` / :1150 `普通冲突…移出画布不漂移，返回调整零写且覆盖可撤销` | 拖放边界 | covered |
| :1889 `Alt 候选按面板自上而下，方向键移动焦点，Esc 关闭并回到画布` | 菜单键盘闭环 | covered |
| :1042/:1088/:1101/:1192/:1216/:1247/:1272/:1286（整组两极进退/追加/一步历史/复制粘贴/重复/删除/硬冲突/互斥） | 组操作合同 | covered |
| :2000/:2022/:2049/:2076/:2107/:2126/:2142/:2167（会话清空/原子放置/冲突覆盖/删层确认/过期确认/零写锁定） | 确认与零写族 | covered |
| :977 `图层动作组上移按稳定 ID 只派发一条 MoveProjectMapLayerCommand` | 单命令历史 | covered |

**未覆盖区**：window blur 之外没有 pointerCancel 测试；`ensureMapLoaded` 失败静默路径无断言。

## 5. 证据条目

- **P2-001 covered** 上表 20 条 + 其余 38 条同文件标题（共 58）。
- **P2-002 risk** 画布手势缺 `onPointerCancel`/`lostpointercapture` 兜底：window blur 有清 hover，
  但系统手势打断（如触控板手势接管、浏览器手势）时 `selectionDragRef/paintingRef` 可能滞留到
  下一次 pointerup。静态推断，无复现——标 risk，建议实施批次在拆手势单元时补 pointerCancel
  归零 + 回归。
- **P2-003 risk** `:338` 与 `:341` 两个 effect 都在 referenceIndex 变化时 `setPendingDeleteId(undefined)`
  （前者多一个条件分支）——重复职责，后一个疑似前一个的重构残留。标 risk（可合并），无行为差异证据。
- **P2-004 risk** `:584` ensureMapLoaded catch 吞错（与 P1-003 同型）：MapMode 场景下地图加载失败
  无用户可见反馈。risk。
- **P2-005 covered** :551/:2309 两处 window/document 级监听对称清理（静态核对）。

## 6. 未证风险

- pointerCancel 缺口的实际触发条件未运行复现（需触控/手势设备）。
- `dispatchWorkspace` 内部 undo 栈实现（map-workspace 层）未深读——本包以 MapMode 派发点为边界。
