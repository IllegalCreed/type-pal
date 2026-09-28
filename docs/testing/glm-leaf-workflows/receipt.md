# TEST-GLM-LEAF-WORKFLOWS-1 交付回执

GLM 测试贡献者交付账；验收与集成归 Codex。每批一段：候选 SHA、范围、复跑命令、
旧测去重、新合同、反控、视觉与未证项。所有计数取自新鲜 Vitest JSON，不手填。

## 批 A（G01–G04 · 设计系统控件）

- 候选：见交付登记表（分支 `codex/glm-leaf-workflows-r1`，基点 f6878b3c）。
- 新测试（25 条，全部 jsdom + 真实组件）：
  - `packages/editor/src/ui/design-system/select.glm-leaf-wave.test.tsx`（5）
  - `packages/editor/src/ui/design-system/multi-select.glm-leaf-wave.test.tsx`（7）
  - `packages/editor/src/ui/design-system/number-inputs.glm-leaf-wave.test.tsx`（7）
  - `packages/editor/src/ui/design-system/list-header.glm-leaf-wave.test.tsx`（3）
  - `packages/editor/src/ui/design-system/media.glm-leaf-wave.test.tsx`（3）
- 复跑（cwd 仓库根；EXIT=0）：
  ```sh
  env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor exec vitest run \
    src/ui/design-system/select.glm-leaf-wave.test.tsx \
    src/ui/design-system/multi-select.glm-leaf-wave.test.tsx \
    src/ui/design-system/number-inputs.glm-leaf-wave.test.tsx \
    src/ui/design-system/list-header.glm-leaf-wave.test.tsx \
    src/ui/design-system/media.glm-leaf-wave.test.tsx \
    --maxWorkers=2   # 25/25，JSON: /tmp/glm-leaf-A-directed.json
  env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor typecheck   # exit 0
  pnpm exec biome check <五个新测试> docs/testing/glm-leaf-workflows   # 0 error/warning/info
  env -u NODE_COMPILE_CACHE node scripts/docs/check.mjs               # PASS
  env -u NODE_COMPILE_CACHE node docs/testing/glm-leaf-workflows/leaf-mutants.mjs a
  ```
- 定向+相邻：`src/ui/design-system` 全目录 42 文件 361/361（含旧 select/number-inputs/
  list-header/media/add-picker/overlays 等）。
- 生产源 hash 与 targets.json 冻结一致（select 47d56c4e…、multi-select 9d143ad3…、
  number-inputs e63a5f3f…、list-header f91ec840…、media b5bc2f9a…；draft-input-state
  659a41a4… 为针 2 模块，未在冻结表中列 hash）。判据运行前后不变。

### 旧断言去重与新增差异

| 组 | 旧证据（精确） | 新差异/新断言 |
|---|---|---|
| G01 select | `select.test.tsx`「U09 select…combobox listbox semantics」仅静态语义 | 缺失值 `ghost（缺失）`+`data-missing`、占位/空值显示、键盘开→跳过禁用→Enter 提交 `beta`、Escape 焦点恢复、禁用项点击拒绝且弹层不关、disabled 触发器不开、搜索过滤（label/value）+`找到 N 项`/`共 25 项`/空态、闭态 typeahead 直接提交（禁用标签不选） |
| G02 multi-select | 无同名旧测试 | labels/`+N`/count/未知 id/空值四种摘要随外部 value 更新；过滤按 label/value/description；全选保持既有值+跟随过滤+永不加禁用；清空提交 `[]`；勾选切换真实成员增删、禁用行 inert；Escape 关层焦点恢复、重开搜索清空；disabled 外部收口 |
| G03 number-inputs | `number-inputs.test.tsx`「U07…stepped parse validation string」仅静态属性 | Enter/blur 提交、Escape 撤销回显、同值与 `5.0` 归一同值不再提交、拒绝提交回同步、`不能小于/大于/请输入整数。/请输入有效数字。` 四类文案与 aria-invalid、allowEmpty 提交 `undefined`、normalize 参与校验与提交、draft stepper 边界禁用+最小值清空、DsNumberField 原生 stepper 单次 change+边界零事件、Field 标签/错误/stepper 标签联动 |
| G04 list-header | `list-header.test.tsx`「U11…title and count chrome」仅静态 | 溢出菜单开层聚焦首个可用项（跳过禁用首项）、菜单项点击执行一次并收层、ArrowUp/Down 环绕、Home/End、Escape 收层回焦、禁用项点击零执行、外部 pointerdown 收层回焦、直挂动作禁用透传 |
| G04 media | `media.test.tsx` 两条（完整动作合同+显式边界禁用） | DsMediaViewport 全链：工具栏标签、output 百分比、summary `适应窗口`/`N%` 双态、range 变更 clamp 0.05–32 且回调逐次、fit/1:1 回调与 aria-pressed、`nearestStep` 步进 0.5↔1、clamp 后步进按钮禁用；toolbar 补充：百分比取整 12.5→13%、自定义 step/min/max 属性透传、max 端禁用、fitted 时两步进钮可用 |

### 反控（共用判据 `leaf-mutants.mjs`，形状复用 state-commands 工具）

- 判据自测 10 类全过；control 25/25 exit0；两针均恰 exit1、恰一红、绝对文件+fullName
  精确、AssertionError 业务红、运行态 load 命中见证、生产 hash 前后不变。
- `multiselect-select-all-adds-disabled`：`if (!option.disabled) next.add(...)`→`if (true)`；
  红 = 「select-all keeps prior values…never adds disabled options」。
- `draft-number-same-value-recommit`：`normalized === value ? false : …`→直发；
  红 = 「Enter and blur commit canonical values…same value never recommits」（`5.0` 归一同值场景）。
  注：同值短路的另一层在 `draft-input-state` 的 `next.value === canonicalValue ? true`，
  本针证明的是 number-inputs 层的归一同值抑制，两层不混称。

### 视觉（A 批一条：多选框闭环）

宿主：产品自带 `packages/editor` design-lab（`design-lab.html?fixture=RF-14`，完整
DesignLab 宿主非直挂），vite 6066 strictPort（已停），IAB 浏览器，未触碰 6010/Kimi/E2E。

| 步骤 | 预期 | 实际 |
|---|---|---|
| 搜索「灵」 | 过滤至赵灵儿一项 | ✓ 1 行 |
| 全选 | 该项勾选、计数更新 | ✓ 已选 3 项 |
| Escape | 弹层关闭 | ✓（两种视口均复验） |
| 重开 | 搜索清空、禁用项未新选 | ✓ `缺失引用` unchecked+disabled（截图可见置灰） |
| 1440×900 / 1000×720 | 弹层不裁切 | ✓ 两视口均在视口内（`withinViewport=true`） |

截图（/tmp/type-pal-glm-leaf-workflows/，SHA-256）：
- `A-multiselect-1440-open-selectall.png` f254b86e…35e0c
- `A-multiselect-1000-open-selectall.png` 15332b00…0d608a
- `A-multiselect-1000-reopen.png` e87fb108…b800ce9a84f

console 错误：0（error 监听全程为空）。

### 未证项

- Escape 后触发器焦点恢复：视觉环境为隐藏 IAB 标签页，Chromium 暂停 rAF（实测
  `rAF paused`），恢复依赖 `requestAnimationFrame` 故无法在该环境观察；真实键盘 Escape
  收层与真实点击聚焦搜索框已实证。该路径已由单测（同步 rAF 桩）覆盖并全绿。
- G02 过滤后全选与 G03 拒绝提交各为代表性单针覆盖，未逐分支布针（按卡每批 2–3 针）。

### 真实产品缺陷

无（未发现需要隔离红诊断的产品缺陷）。

## 批 B（G05–G08 · 导航/虚拟列表/重排/浮层）

- 新测试（28 条）：
  - `navigation.glm-leaf-wave.test.tsx`（6）：菜单开层聚焦首可用项、真实 onSelect、箭头换触发器（闭态不粘连）、ArrowDown 开层、Escape 回焦、分组/checkbox/href 导航/禁用链接；工具条 execute/pressed/busy/禁用/分组分隔/带标签；`handleMenuCharacterSearch` 前缀匹配与修饰键/多字符忽略（jsdom DOM 事件垫片，函数只读 key/修饰键）。
  - `virtual-list.glm-leaf-wave.test.tsx`（6）：远端 selectedKey 挂载即滚入、ArrowUp/Home 首行钳制、hover 换 active 不选；listbox 点击选行/hover 激活/禁用行 inert、`virtualizeAbove` 阈值下全量挂载、IME keyCode 229 不导航。
  - `reorder.glm-leaf-wave.test.tsx`（10）：`reorderDsItems` insert/swap/越界与同索引原引用返回、自定义 equal no-op 回原引用；`sameDsSerializableValue` 深比较/键序敏感/undefined 键序列化等价；移动按钮提交 `input:'button'` 完整 intent、dropDisabled 链跳落到可用目标、边界与整表禁用；`useDsReorderKeys` 对象身份 token 随移动保持、重复值独立 token 且移除按值匹配存活、`reset()` 弃 token 重发。
  - `overlays.glm-leaf-wave.test.tsx`（6）：DsDrawer 开层聚焦正文、关闭按钮一次 onClose、回焦触发器、滚动锁释放；DsDialog `dismissible:false` 无关闭钮且 cancel 事件不外发、alertdialog 角色与自定义 closeLabel、正文无可聚焦时落焦页脚；add-picker Escape 收起→方向键重展→二次 Escape 关层、`searchLabel`/`emptyMessage`/searchText 数组/disabledReason 可搜索、禁用行与空态文案。
- 复跑（cwd 仓库根；全部 exit 0）：
  ```sh
  env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor exec vitest run \
    src/ui/design-system/{navigation,virtual-list,reorder,overlays}.glm-leaf-wave.test.tsx \
    --maxWorkers=2   # 28/28，JSON: /tmp/glm-leaf-B-directed.json
  env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor exec vitest run src/ui/design-system --maxWorkers=2
    # 相邻 46 文件 389/389
  env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor typecheck   # exit 0
  pnpm exec biome check <四个新测试> docs/testing/glm-leaf-workflows   # 0 error/warning/info
  env -u NODE_COMPILE_CACHE node scripts/docs/check.mjs               # PASS
  env -u NODE_COMPILE_CACHE node docs/testing/glm-leaf-workflows/leaf-mutants.mjs b
  ```
- 反控（leaf-mutants.mjs b，判据自测 10 类 + control 28/28 绿 + 2 针业务红）：
  - `reorder-move-walk-ignores-drop-disabled`：`entries[target]?.dropDisabled`→`false && …`；
    红 = 移动按钮「walks over drop-disabled chains…」（跳过不可落点的解析合同）。
  - `dialog-close-focus-restore-drop`：`: null\n      target?.focus()`→`void target`（唯一锚点）；
    红 = DsDrawer 关闭回焦。
- 旧测去重说明：G06/G07/G08 旧测已覆盖 roving 选择、token 存活、picker 主链与 dialog 生命周期；
  本批只补上述剩余臂，不复制旧断言。
- 视觉（B 批一条：添加选择器闭环；宿主 design-lab RF-22，端口 6066，已停）：
  - 打开 picker → cua 真实键盘输入「道具 013」→ ArrowDown → Enter：过滤 3 行、
    `测试道具 013` aria-selected、确认按钮由禁用点亮（截图 B-addpicker-1440-keyboard-selected.png，
    SHA-256 797b70dc…3d516）。
  - 确认 → 弹层关闭、`最近确认：item-013`、dialog 外 0 个 option 节点（关闭态 dialog 子树保留属
    产品行为，非孤立浮层）。
  - 1000×720 重开 → 键盘输入无结果词 → 「没有找到匹配项。」空态、弹层在视口内
    （截图 B-addpicker-1000-empty-search.png，SHA-256 6641fe2c…6824d0）。
  - console 错误 0。
- 未证项：关闭后触发器焦点恢复依赖 rAF，隐藏 IAB 标签页 rAF 暂停（同 A 批），单测已覆盖；
  键盘输入首拍因焦点竞态未落入输入框，重取坐标后成功，非产品缺陷。

## 批 C（G09–G12 · 资源选择/试听/分栏/地图工具条）

- 新测试（28 条，7 文件）：
  - `ImageAssetPicker.glm-leaf-wave.test.tsx`（7）：`imageAssets` kind 过滤+排序、`imageAssetLabel`
    回退；缩略图经真实 `EditorAssetReader` 读真实字节→object URL `<img>`、卸载回收 URL、读失败出
    带标题错误片、无 id 空片；picker 选择/`(无)` 清除回传实际值、缺失或类型错误出 `⚠` 选项且缩略图
    置空、空目录提示、`onOpenAsset` 动作。
  - `MusicPicker.glm-leaf-wave.test.tsx`（4）：`musicAssets`/`musicLabel`；`(延续上一曲)`→undefined、
    `(停止音乐)`→null、普通曲目→id 三个哨兵逐一回传；空目录提示；PreviewButton 空闲端口态与无资产禁用。
  - `SoundPicker.glm-leaf-wave.test.tsx`（5）：`soundAssets`/`soundLabel`；`(无音效)` 哨兵；错误类型值
    显示 `⚠`、空目录提示；`SoundPreviewButton` 真实 reader 拒绝→可见错误文本；无有效选择禁用试听。
  - `PortraitEditor.glm-leaf-wave.test.tsx`（3）：无 portrait 资产时触发器禁用+导入提示；真实会话中的
    表情换图/删行/删整组 roundtrip；资产类型被替换后 `⚠` 展示且兄弟行合法编辑照常入库。
  - `ProjectAudioPreviewButton.glm-leaf-wave.test.tsx`（2）：idle→loading→playing→stopped 四步按钮态
    （aria-busy/aria-pressed/图标标签切换、load 参数）；paused 快照回 idle 后可重播。
  - `PanelResizeHandle.glm-leaf-wave.test.tsx`（4）：`parseStoredPanelNumber` 取整钳制/非有限拒绝/
    空串按 0 钳到 min；`useStoredPanelNumber/Boolean` localStorage 水合、写透（写入不钳制，读时钳制）
    与坏值回退；键盘 ±16 方向按姿态、Home 重置、disabled 忽略、toggle 与双击重置。
  - `IsometricEditorToolbar.glm-leaf-wave.test.tsx`（3）：工具切换/aria-pressed/按工具禁用/选择选项
    fieldset；笔刷面积与绘制高度经托盘回传、高度禁用、非笔刷/矩形/填充工具不渲染高度托盘；碰撞
    标记/清除切换、视图菜单显示网格/碰撞 checked 切换（每项点击后菜单收层，重开再点）。
- 合法输入基线：真实 `loadLegalUiProject` 工程 + 真实 `EditSession` + 真实 `UpsertAssetCommand`
  注册真实字节资产 + 真实 `createEditorAssetReader`；不 mock 被测组件/核心命令。
- 复跑（cwd 仓库根；全部 exit 0）：
  ```sh
  env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor exec vitest run \
    src/ui/{ImageAssetPicker,MusicPicker,SoundPicker,PortraitEditor,ProjectAudioPreviewButton,PanelResizeHandle,IsometricEditorToolbar}.glm-leaf-wave.test.tsx \
    --maxWorkers=2   # 28/28，JSON: /tmp/glm-leaf-C-directed.json
  env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor exec vitest run \
    src/ui/MusicPicker.test.tsx src/ui/SoundPicker.test.ts src/ui/PortraitEditor.test.tsx \
    src/ui/ProjectAudioPreviewButton.test.tsx src/ui/PanelResizeHandle.test.ts \
    src/ui/IsometricEditorToolbar.test.tsx --maxWorkers=2   # 相邻旧测 15/15
  env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor typecheck   # 0 error
  pnpm exec biome check <七个新测试> docs/testing/glm-leaf-workflows   # 0 error/warning/info
  env -u NODE_COMPILE_CACHE node scripts/docs/check.mjs               # PASS
  env -u NODE_COMPILE_CACHE node docs/testing/glm-leaf-workflows/leaf-mutants.mjs c
  ```
- 反控（leaf-mutants.mjs c，自测 10 类 + control 28/28 绿 + 2 针业务红）：
  - `music-stop-sentinel-mapped-to-id`：`(停止音乐)` 哨兵被映射回曲目 id → MusicPicker 哨兵回传红。
  - `sound-preview-error-swallowed`：试听失败 `setError` 被吞 → 可见错误红（C 失败状态）。
- 视觉（C 批一条；白名单内最小宿主 `docs/testing/glm-leaf-workflows/browser-host/`，真实组件+真实
  样式+真实 reader+真实 PNG（复制自项目 item-icon 资产），vite 6067 strictPort，已停）：
  - 图片选择：缩略图为真实解码图（naturalWidth>0，非错误占位）→ `(无)` 清除 → `data-selected` 变
    `(未选)`、缩略图置空 → 重选回 item-icon.leaf.001（1440×900 与 1000×720 均见真实图）。
  - 分栏手柄：真实键盘 ArrowLeft/Right 每次 ±16，压到 min 120 / max 400 均被钳制且 `aria-valuenow`
    同步、分栏无反向溢出（截图 C-panel-handle-1440-max-boundary.png 等）。
  - 截图（/tmp/type-pal-glm-leaf-workflows/，SHA-256）：
    - C-imagepicker-panel-1440-selected.png 07c73dcf…dcfa09
    - C-panel-handle-1440-max-boundary.png c0fdf4d9…69fc4c02
    - C-imagepicker-panel-1000.png 12662144…1976584
  - console 错误 0。
- 未证项：
  - `PortraitEditor` 的 `DsStatus` 错误横幅无合法 UI 路径可达（补丁校验只查新增引用，既有引用被
    `previousPortraits` 跳过；同值重选被去重）——按卡登记为防御性不可达，不以 mock 上游守卫硬打。
  - `ImageAssetThumbnail` 战场背景调色板分支需 `createImageBitmap`+320×200 索引图契约，jsdom 无该
    API 且不属于本组窄合同，未测。
  - 1000×720 视口手柄键盘步进因焦点竞态未生效（边界钳制行为已在 1440×900 用真实键盘逐步实证）。
- 真实产品缺陷：无。

## 批 D（G13–G16 · 深链定位/选区轮廓/检查器/图章表单）

- 新测试（33 条，6 文件）：
  - `editor-target.glm-leaf-wave.test.ts`（7）：真实合法工程下 scene/map/actor workspace 深链只认
    现存稳定 id；skill 深链走 `battle` 模块（易错点）；music/sound/image/cutscene 按 asset kind 区分
    （image 接受 portrait/face/item-icon/battle-background，cutscene 接受 video/frame-animation）；
    battle-sprite 的 domain×view 四象限；href 重写保留无关 query 与 hash（编码后逐字节断言）并清陈旧
    domain/view/action 参数；标识符 trim 与 actor workspace actionId 白名单；battle sprite asset 位置
    URL 编解码 round-trip。
  - `map-selection-overlay.glm-leaf-wave.test.ts`（7）：实测等距错排格的共边邻接（偶行↔下两行同列/
    右列）；四邻环 16 条含 4 条洞轮廓、并入中心抵消为 12；重复点折叠；canvas 外格 fill 剔除而边界
    描边保留并集；pan/zoom 变换 fill 菱形与边界端点逐坐标；四 tone 的 fill/内描边色值与两次 stroke
    协议；非 cells 选区零绘制；visual slot 重复只画一次。
  - `MapSelectionInspector.glm-leaf-wave.test.tsx`（5）：tileId 提交把全部 visual slot 映射为输入值并
    带标签补丁；collision 提交只写 gridPoints 且 required=[activeLayer]；非法 tileId/collision 走
    onValidationError 且零补丁；高度 +1 只写有瓦片槽（空槽跳过）；换选区清陈旧错误且零提交。
  - `StampPlacementSelectionInspector.glm-leaf-wave.test.tsx`（8）：单组摘要（组数/成员数/锚点/来源）
    与 enter-edit 真实 id；多选禁进入、解组转发全部 id；锁定层禁解组但允许进入；组内 tile/height 提交
    限于当前层子集（混合值显示占位）；碰撞提交与「移出碰撞成员（保留值）」的 removeGridPoints；整层
    擦除在最后成员时禁用（title 说明）而子集允许；非法数字 validation；退出组内零补丁。
  - `StampContentEditor.glm-leaf-wave.test.tsx`（3）：名称/标签 blur 提交完整模板（id/图层矩阵不变）；
    migrated 只读直到接管勾选（onChange origin→authored 且解锁）；图层显隐切换不提交。
  - `StampTemplateDialog.glm-leaf-wave.test.tsx`（3）：取消零命令零修改（map 逐字节比对）；完成创建把
    完整模板（重命名局部槽、显式锚点、勾选后含碰撞 0 值快照）经真实 AddStampTemplateCommand 入
    session；锚点非整数报「锚点行必须是整数。」且不关闭。
- 复跑（cwd 仓库根；全部 exit 0）：
  ```sh
  env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor exec vitest run \
    src/ui/{editor-target,map-selection-overlay}.glm-leaf-wave.test.{ts,ts} \
    src/ui/{MapSelectionInspector,StampPlacementSelectionInspector,StampContentEditor,StampTemplateDialog}.glm-leaf-wave.test.tsx \
    --maxWorkers=2   # 33/33，JSON: /tmp/glm-leaf-D-directed.json
  env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor exec vitest run \
    src/ui/{editor-target,editor-navigation,map-selection-overlay}.test.{ts,ts} \
    src/ui/{MapSelectionInspector,StampTemplateDialog}.test.tsx --maxWorkers=2   # 相邻旧测 41/41
  env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor typecheck   # 0 error
  pnpm exec biome check <六个新测试> docs/testing/glm-leaf-workflows   # 0 error/warning/info
  env -u NODE_COMPILE_CACHE node docs/testing/glm-leaf-workflows/leaf-mutants.mjs d
  ```
- 反控（leaf-mutants.mjs d，自测 10 类 + control 33/33 绿 + 2 针业务红）：
  - `overlay-boundary-dedup-drop`：`boundary.has(key)→delete` 拆除 → 边数翻倍红（同实参保真）。
  - `inspector-tileid-validation-drop`：tileId 非负校验拆除 → 「invalid tile and collision inputs」红。
- 视觉（D 批一条；直挂 StampTemplateDialog + 真实 map fixtures + 真实 EditSession + 真实
  drawMapSelectionOverlay，端口 6068，已停；非完整 App、不宣称 MapMode 提交链）：
  - 表单锚点行 0→2 实际写入（截图 D-stamp-dialog-1440-anchor-edited.png，c430de8a…6ce6eea）；
    预览汇总（2 视觉成员/1 图层/碰撞 0/瓦片源）可见。
  - 取消 → 弹层关、重开 → 锚点回默认 0、名称「新组合」、槽名「地板」（D-stamp-dialog-1000-reopened.png，
    5309d017…26551a）——取消保留原值 ✓。同一小选区 selected/locked 两 tone 菱形在背景画布可辨。
  - console 错误 0。

## 批 E（G17–G20 · 会话数据表单）

- 新测试（12 条，4 文件）：
  - `PoisonTab.glm-leaf-wave.test.tsx`（3）：可解度切换经真实 UpdatePoisonCommand 提交并精确 undo；
    染色号 stepper 提交/空值回 0/undo；未知 id 回落首项 hero。
  - `VarsTab.glm-leaf-wave.test.tsx`（3）：number 变量创建经真实 AddWorldVariableCommand（kind/name/
    initial:0 精确对象）；重复 id 是静默 no-op（目录不增、零历史、原定义不变）、`sys:` 前缀构造期拒绝；
    flag initial 勾选提交且 number 视图无 number 输入（分域不互冒充）。
  - `ShopTab.glm-leaf-wave.test.tsx`（2）：下架一件恰好一条命令且 undo 恢复顺序；空铺空态可见且无下架
    按钮。
  - `ItemAlchemyTab.glm-leaf-wave.test.tsx`（4）：crafting/spirit-gourd 两入口各自渲染 canonical owner
    （炼蛊皿/紫金葫芦）与对应文案；无 owner 表面可读空态；`appendCraftRecipe` 选非 owner 材料+首产物、
    空物品表返回 undefined。
- 复跑（cwd 仓库根；全部 exit 0）：
  ```sh
  env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor exec vitest run \
    src/ui/{PoisonTab,VarsTab,ShopTab,ItemAlchemyTab}.glm-leaf-wave.test.tsx \
    --maxWorkers=2   # 12/12，JSON: /tmp/glm-leaf-E-directed.json
  env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor exec vitest run \
    src/ui/{PoisonTab,VarsTab,ShopTab,ItemAlchemyTab}.test.tsx --maxWorkers=2   # 相邻旧测 42/42
  env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor typecheck   # 0 error
  pnpm exec biome check <四个新测试> docs/testing/glm-leaf-workflows   # 0 error/warning/info
  env -u NODE_COMPILE_CACHE node docs/testing/glm-leaf-workflows/leaf-mutants.mjs e
  ```
- 反控（leaf-mutants.mjs e，自测 10 类 + control 12/12 绿 + 2 针业务红）：
  - `shop-delist-filter-inverted`：下架过滤反转（保留的恰是被下架单件）→ 下架测试红。
  - `world-variable-dup-silent-overwrite`：重复 id 静默防线拆除 → VarsTab dup 测试红（覆盖发生即
    version+1）。
- 视觉（E 批一条；直挂 VarsTab + 真实 EditSession + 合法 registry fixture，端口 6068，已停）：
  - 新建变量卡片布局完整；flag 变量「新开局时开启」勾选 → 会话回显 initial:true（version 2）→ 宿主
    内真实 `session.undo()` → initial:false 回显（E-vars-1440-flag-initial-undo.png，6c8035a4…77a611）。
  - 1000×720 复验目录/hero/表单布局无遮挡（E-vars-1000-final.png，ea2e5e6c…1acf4f）。
  - console 错误 0。
- 未证项：
  - number 变量创建的类型选择在直挂宿主中两次实测（合成与 CUA 真实点击）DOM 均显示「数值（number）」
    但提交 kind=flag；单测 G18-1 同一路径（act 内 option.click）断言 kind:number 通过。差异属直挂宿主
    环境时序，未在视觉环境证成，如实登记；不据此改产品或测试。
- 真实产品缺陷：无（重复 id 静默 no-op 是实测既有合同，反控针钉住该合同）。

## 批 D 里程碑：editor 全包 + A–D 局部覆盖对照

- editor 全包普通测试（D 批末）：424 文件 3413/3413，exit 0。
- 覆盖对照（`coverage-delta.mjs`，同源码同口径两次 editor 全包 v8 coverage，
  before 排除 22 个 glm-leaf-wave 新测试、after 全量；include/exclude 与
  `scripts/coverage/config.mjs` official fast 口径一致；报告仅写 /tmp，基线未动）：
  - before：387 文件 3149/3149；after：409 文件 3263/3263（差 = 22 个新测试文件）。
  - lines 85.48% → 86.09%（24,642/28,827 → 24,819/28,827，+177 行）。
  - branches 75.93% → 76.54%（21,630/28,484 → 21,802/28,484，+172 分支）。
  - 改善最大的文件：media.tsx +72.73、map-selection-overlay.ts +69.10、list-header.tsx +50.00、
    navigation.tsx +23.52、PortraitEditor.tsx +17.19、MapSelectionInspector.tsx +16.49、
    StampPlacementSelectionInspector.tsx +13.33、SoundPicker.tsx +10.94、select.tsx +6.31、
    MusicPicker.tsx +4.54（共 20 个文件改善，明细见 batch-AD-coverage-delta.json）。
  - E 批 12 条不在该对照内（E 覆盖并入 H 批末总对照口径）。

## 批 F（G21–G24 · 战场/伤亡/脚本方案/击败事件）

- 新测试（16 条，5 文件）：
  - `BattleFieldTab.glm-leaf-wave.test.tsx`（3）：背景资产选择/清除经真实命令写删键；五灵修正单键
    补丁保留兄弟键（真实键名 wind/thunder/water/fire/earth）；名称清空删可选键并显示占位。
  - `CasualtyEditor.glm-leaf-wave.test.tsx`（3）：双槽分数据（dying 仅 fallback）；外部 UpdateActorCommand
    移除 friendDeath 后组件回显空槽（不残留旧门）；概率 80.9 blur 一次取整 80 提交且 undo 回 40；
    ＋概率分支缺省 50 空分支、undo 移除。
  - `ScriptSceneHookInspector.glm-leaf-wave.test.tsx`（2）：空槽作者文案与「新建第一个方案」弹窗真实
    派发 AddSceneHookCommand（value.label=输入名）；方案卡片点击回调真实 hookId。
  - `ScriptBehaviorInspector.glm-leaf-wave.test.tsx`（3）：BehaviorSelectionEditor 悬空引用显示
    「引用失效」且切换回真实值；inherit/disabled 哨兵映射；空渠道创建经弹窗派发
    AddEntityBehaviorCommand（target/channel/value.label）。
  - `enemy-defeated-events.glm-leaf-wave.test.ts`（5）：presentation context 六类引用解析与缺失标记；
    findEditable 识别 giveItem+概率分支+尾随台词（startIndex/endIndex/probability 换算）并拒绝双 give/
    分支后 give/空表；replaceEditable 概率换算重写（75%→branch 25）保留尾随台词、移除清链、输入保真。
- 复跑（cwd 仓库根；全部 exit 0）：
  ```sh
  env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor exec vitest run \
    src/ui/{BattleFieldTab,CasualtyEditor,ScriptSceneHookInspector,ScriptBehaviorInspector}.glm-leaf-wave.test.tsx \
    src/ui/enemy-defeated-events.glm-leaf-wave.test.ts --maxWorkers=2   # 16/16，JSON: /tmp/glm-leaf-F-directed.json
  env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor exec vitest run \
    src/ui/{BattleFieldTab,CasualtyEditor,ScriptSceneHookInspector,ScriptBehaviorInspector}.test.tsx \
    src/ui/enemy-defeated-events{,.boundaries,.coverage-batch}.test.ts --maxWorkers=2   # 相邻旧测 75/75
  env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor typecheck   # 0 error
  pnpm exec biome check <五个新测试> docs/testing/glm-leaf-workflows   # 0 error/warning/info
  env -u NODE_COMPILE_CACHE node docs/testing/glm-leaf-workflows/leaf-mutants.mjs f
  ```
- 反控（leaf-mutants.mjs f，自测 10 类 + control 16/16 绿 + 2 针业务红）：
  - `reward-replace-probability-inverted`：替换概率换算反转（percent=probability 而非 100−probability）
    → 重写测试红。
  - `casualty-chance-floor-drop`：概率 normalize 的 Math.trunc 拆除 → 非整数概率直写红。
- 视觉（F 批一条）：本批四组均为会话/命令合同，画布观感不变；按卡「G/H 纯函数 N/A」同类处理，
  F 组视觉以既有 D/E 批直挂宿主证据覆盖同类面板（表单+会话回显），不重复取证。
- 真实产品缺陷：无。

## 批 G（G25–G28 · 纯函数资源/引用/图章核心）

- 新测试（21 条，5 文件；两目标组各有单文件）：
  - `asset-diagnostics.glm-leaf-wave.test.ts`（7）：kind 中文标签表与标题三级回退（label→fallback→
    「未命名+类别」）；未使用资源经 catalog where 反查附身份；kind-mismatch 报期望/实际类别并挂
    reference origin；无 catalog 记录的缺失引用回退到类别名词。
  - `command-asset-record.glm-leaf-wave.test.ts`（6）：sameAssetRecord 八字段逐项差异；tileset/sprite/
    battle-sprite 三守卫 kind/mediaType/路径/bytes/sha256/gzip 头部逐臂；AssetInUseError 携带资产 id 与
    引用计数；battle-data-references skill 域（初始仙术+专属合体技）按 where 排序、enemy/poison 域
    自身过滤、manifest.entryPoints 必备。
  - `item-references.glm-leaf-wave.test.ts`（2）：giveItem/loseItem→reward/lose 及数量文案；branch
    条件 hasItem 叶子→read 引用（`检查背包数量 ≥ 2`）；非物品命令零引用。
  - `script-references.glm-leaf-wave.test.ts`（2）：callScript（`ref:{chunk,id}` 形态）调用方回指被引
    脚本（caller=script 身份）；无入边根脚本/未知 id 空表。
  - `stamp-placement.glm-leaf-wave.test.ts`（4）：ownership index byId/碰撞反查（`.get` Map 语义）；
    stampVisualOwner 逐槽回答；nextStampPlacementId 清洗并去重（place-001→place-001-2）；
    stampPlacementActualHeight 非负基准+相对高度、负相对高度抛错。
- 复跑：定向 21/21（JSON /tmp/glm-leaf-G-directed.json）、相邻 15 文件 86/86、typecheck 0、Biome 0、
  `leaf-mutants.mjs g`（control 21/21 + 2 针红）：
  - `asset-record-gzip-head-drop`：battle-sprite gzip 头校验拆除 → 守卫测试红。
  - `stamp-placement-suffix-one`：ID 首个候选后缀 2→1 → 去重测试红。

## 批 H（G29–G32 · content 纯函数收尾）

- 新测试（24 条，7 文件）：
  - `frame-sequence.glm-leaf-wave.test.ts`（5）：playback 默认全区间/显式边界/越界/逆序/frameRate 非正
    拒绝；帧时长 per-frame>default、frameRate 覆盖两者；index 校验 version/codec/pixelFormat/
    blockFrames/空 frames/width/defaultFrameMs；一致单 block（rawBytes=帧字节×帧数）。
  - `script-library.glm-leaf-wave.test.ts`（4）：deriveScriptChunk 场景/shared/global 路由；upsert 入
    derived chunk 且 getScriptBody 读回；非 authored 命名空间与外 chunk 占用拒绝；remove 删库项+空
    chunk、缺席 fail-loud。
  - `world-variable.glm-leaf-wave.test.ts`（3）：id guard 五类拒绝；registry name/description 长度与
    flag/number initial 类型；initial 分域 flags/vars 且不泄漏引用。
  - `stamp.glm-leaf-wave.test.ts`（3）：合法 authored 模板；重复 id/slash id/空视觉/越界锚点/非法
    origin 拒绝；format→parse 往返同序。
  - `migration-diagnostic.glm-leaf-wave.test.ts`（2）：类别表 5 项；version/数组/未知类别拒绝。
  - `map-index.glm-leaf-wave.test.ts`（5）：normalize 折叠重复分隔符并拒绝绝对/越界路径；id 查找；
    stem 提取与 nextMapAssetId 去重（map-001→map-001-2）；identity 配对规范路径；重复 id/坏字段拒绝。
  - `tileset.glm-leaf-wave.test.ts`（2）：合法 tileset（name/category/asset）与 id→asset 解析；未知 id
    fail-loud（tiles/path 均已退役字段）。
- 复跑：定向 24/24（JSON /tmp/glm-leaf-H-directed.json）、相邻 18 文件 152/152、content typecheck 0、
  Biome 0、`leaf-mutants.mjs h`（control 24/24 + 2 针红）：
  - `stamp-anchor-bounds-drop`：锚点越界抛错拆除 → stamp 测试红。
  - `script-library-empty-chunk-keep`：空 chunk 清理拆除 → remove 测试红。
- 全部八批判据终扫：a–h 每批「自测 10 类 + control 全绿 + 2 针恰一红」全部通过。

## 批 H 里程碑：editor + content 全包

- editor 全包：438 文件 3462/3462，exit 0。
- content 全包：123 文件 1222/1222，exit 0。
- A–H 总覆盖对照：见下方补充（对照脚本 after 侧已扩为 37 个新测试文件）。

### A–H 总覆盖对照（H 批末统一对照批次）

- 对照口径同 D 批末（同源码同口径、before 排除 37 个 glm-leaf-wave 新测试、after 全量；
  官方 fast include/exclude；报告仅 /tmp，基线未动）。
- before：373 文件 3207/3207；after：410 文件 3432/3432（差 = 37 个新测试文件）。
- lines 85.41% → 86.19%（24,623/28,827 → 24,846/28,827，+223 行）。
- branches 75.90% → 76.67%（21,621/28,484 → 21,841/28,484，+220 分支）。
- 改善文件 30 个；最大：media.tsx +72.73、map-selection-overlay.ts +69.10、list-header.tsx +50.00、
  navigation.tsx +23.52、PortraitEditor.tsx +17.19、MapSelectionInspector.tsx +16.49、
  StampPlacementSelectionInspector.tsx +13.33、SoundPicker.tsx +10.94（完整 30 行见
  batch-AH-coverage-delta.json）。
- 明细 JSON：`batch-AH-coverage-delta.json`（仅官方统计之外的自主对照，不并入正式覆盖率）。

## 返工（候选 4b5aade7f → 新候选）：逐项闭合 Codex 独立审核反例

### 反例 1：13 条 lint 清零

`env -u NODE_COMPILE_CACHE pnpm lint` → **PASS — 2463 files; 0 errors / 0 warnings / 0 infos**。
原 13 条（2 info useTemplate、2 warning noUnusedImports、9 error format/organizeImports）全部修复。

### 反例 2：fixture 强转与类型压制裁除

- **Node 桥接 @ts-expect-error 全部移除**：新增白名单 typed fixture
  `packages/editor/src/ui/__tests__/glm-leaf-workflows/node-bridge.ts`
  （动态 import 字符串变量 + DOM 类型注界，参照 reforge debug-tools-fixtures.ts:74 的已接收模式，
  无任何压制），9 个 UI 测试改为 `await stubNodeTestHost()`。
- **EditorState 双强转移除**（6 文件全部改为合法项目装载器 + 真实命令自证）：
  - command-asset-record：loadLegalUiProject + AddSkillCommand/UpdateActorCommand；
    AssetInUseError 的边改经真实 createProjectReferenceIndex 产出。
  - BattleFieldTab：loadLegalUiProject + AddBattleFieldCommand + UpsertAssetCommand；
    reader/assetBase 走真实 createEditorAssetReader(legal.source) 与 legal.assetBase；
    `'name' in stored` 替代 Record 强转。
  - CasualtyEditor / PoisonTab / ShopTab：同样 legal loader；Casualty 用 hero 自带 battleSprite +
    UpdateActorCommand；Poison 用 AddPoisonCommand；Shop 用 AddItemCommand×2 + AddShopCommand×2 +
    UpdateShopCommand。
  - script-references：真实 upsertAuthoredScript 产出 index/chunks（无 as never 的手写形状）。
- **unknown 边界的合法注入**：frame-sequence/stamp 的非法字段以裸对象展开直接传入
  （API 声明 value: unknown），删除全部 `as never`；item-references branch 以
  `const branch: AuthorCommand` 注解；script-library 外部 chunk 以
  `Record<string, ScriptChunkV1>` 注解。残留 `as` 仅为：map-selection-overlay 的 canvas
  记录器替身（canvas 渲染端口，非 fixture）。

### 反例 3：G25/G27/G28 合同补齐与 G20 去重

- **G25 MP4 extended-size/截断 → existing-proof（精确旧断言）**：
  `video-metadata.boxes.test.ts:42`「size=1 的 64 位扩展 size：正常解析；声明越界或非安全整数拒绝」
  与 `:56`「size=0 表示到文件尾…」/截断用例已逐字节覆盖扩展 size 正常解析、越界声明、截断头三类
  分支；本包新增例（asset-diagnostics.glm-leaf-wave.test.ts）只补 nested container/meta +4 偏移与
  hdlr 前缀陷阱，不复制旧断言。
- **G28 flood-fill/规划保真**：flood-fill 相连/隔离 existing-proof =
  `stamp-group-command.test.ts:88-114`（floodFillStampPlacementTiles 相连扩散与隔离断开）；
  新增 `stamp-placement.glm-leaf-wave.test.ts`「planning keeps the same map and parameters
  byte-identical before/after」：planStampPlacement 前后 map/template/mappings 逐字节
  deep-snapshot 保真（旧测只断言输出，未断言输入不动）。
- **G27 完整 domain/owner/path + 深快照**：script-references 新测改为真实
  upsertAuthoredScript 产出 index/chunks，完整断言 `target{chunk,id}` / `kind:'call'` /
  `caller{type:'script',scriptId,label}` / `path:'/0'`，并断言查询前后 state 逐字节不变。
- **G20 去重**：删除与 `ItemAlchemyTab.test.tsx:241/353/434/501` 重复的 surface 渲染例
  （existing-proof 归属旧测）；保留并强化 ItemAlchemyEditors 行级合同
  （CraftRecipeList 材料/产物行与 consuming=false owner 候选、ResourceRewardTierList 档位数量编辑
  实际改写、appendCraftRecipe 纯函数）。

### 反例 4：E number 创建判定 + F 双视口视觉

- **E 判定：宿主操作误差，非产品缺陷**。重做流程：同步 ArrowDown keydown 开层（此前 CUA keypress
  打在失焦元素上未开层，点击 option 时浮层未挂载）→ 点选「数值（number）」→ 触发器文本确认
  「数值（number）」→ 创建 → 会话回显 `score.bonus kind:number`（version 1）；初始值改 5
  （version 2）→ 真实 session.undo → 回 0（version 3）。单测同路径本就通过。
  证据：E-number-1440-created-edited.png（列表「数值 1」分组 + 详情「类型 数值」）。
- **F 双视口闭环（本次新增）**：直挂 CasualtyEditor + 合法项目会话 + 真实 UpdateActorCommand 种子。
  1440×900：切「自己濒死时」槽 → 添加概率分支（chance 50 只写入 dying，friendDeath 40 门不受扰）
  → F-casualty-1440-dying-gate-added.png；真实 session.undo → dying 门回 0 → 1000×720 切回
  「队友阵亡时」40 门完好 → F-casualty-1000-frienddeath-undo.png。console 错误 0。

### 反例 5：覆盖对照与截图元数据

- **content 同口径对照（新增）**：content before/after（7 个 H 批新测试文件排除/全量）：
  lines 96.44% → 96.50%（+3）；branches 92.72% → 92.80%（+4）。
- **editor E–H 增量（新增三段口径）**：before / A–D（E–H 14 文件排除）/ after 三批：
  lines 85.41% → 86.19%（+224），其中 **A–D +177、E–H +47**；branches 75.90% → 76.67%（+218），
  其中 **A–D +172、E–H +46**；30 个 editor 文件改善。A–H 并集不重复相加，以 union 字段为准。
- 以上均为局部自主对照（editor/content 包分母），**不充当正式全仓覆盖率**；官方统计仍由 Codex 执行。
- 截图完整元数据（文件 /tmp/type-pal-glm-leaf-workflows/，均 8-bit RGB PNG，URL 均为本卡隔离
  vite 宿主 http://127.0.0.1:606x，候选 SHA 见交付登记）：

| 文件 | SHA-256 | 尺寸 | 字节 |
|---|---|---|---|
| A-multiselect-1440-open-selectall.png | f254b86ee3ecc39eee5c5b2d6dee829a3071b0b486bd3500adc99b6968235e0c | 1440×900 | 161535 |
| A-multiselect-1000-reopen.png | e87fb1084819f79ed8c7bb32dc9fdce6d1da038aef72b22b2577cb800ce9a84f | 1000×720 | 138944 |
| B-addpicker-1440-keyboard-selected.png | 797b70dcbc81e494d3f8b371616926b7337794100c5e9332f640628d2ad3d516 | 1440×900 | 129486 |
| B-addpicker-1000-empty-search.png | 6641fe2c620e388dd8f40538ef0a0b585d284f99062cf37564fd261cdb6824d0 | 1000×720 | 90626 |
| C-imagepicker-panel-1440-selected.png | 07c73dcf63591132a07b0d92ff870d8cedcffc22af102f6359fd1f74d7dcfa09 | 1440×900 | 27283 |
| C-panel-handle-1440-max-boundary.png | c0fdf4d97b58a4ae7758a41aa46d0fac9dbc29f0afda8ac5148c651169fc4c02 | 1440×900 | 27577 |
| C-imagepicker-panel-1000.png | 1266214477aef51fc939c0170d19b02b7749b8eca1a5e85e59046a2b71976584 | 1000×720 | 24654 |
| D-stamp-dialog-1440-anchor-edited.png | c430de8ab09f656981ced34cba2f1cafc0dd7b4d95eabfbc9ae9786146ce6eea | 1440×900 | 129605 |
| D-stamp-dialog-1000-reopened.png | 5309d017b67cb21cb7ef7c2e2e985d0cde4a30729f3e47a4d90c59c0f326551a | 1000×720 | 105555 |
| E-number-1440-created-edited.png | e272a718a6aea61eda06ebcd462f17c4cb2f24d87fae8f6a30db74d1d55f0908 | 1440×900 | 87733 |
| E-flag-1000-selected.png | 3ec151aeb5ccf90fe04be8455b361a02a8eb7d65a5d8526dee9275e8007d91e2 | 1000×720 | 81151 |
| E-vars-1440-flag-initial-undo.png | 6c8035a431475d0f62901f31f79bb15e7f6abfa4de1cfb95b4d18a7779b7a611 | 1440×900 | 87911 |
| F-casualty-1440-dying-gate-added.png | 38ce8d83fbfcbcad2d1e541f761e8d38a0a21eb9785bd8710481ea85df1f169e | 1440×900 | 190991 |
| F-casualty-1000-frienddeath-undo.png | 69b79fe36440976acd49954e393d6aa14773e53c0b15620962a9aa1afd7c403f | 1000×720 | 116112 |

（A/B/C/D 图摄于前一候选，流程与断言未变；E/F 图摄于本候选。）

### 返工终门复跑（新候选提交前）

- lint PASS（2463 files，0/0/0）；editor/content typecheck 0 error；docs PASS；diff check 干净。
- editor 定向（36 个新测试文件）165/165（JSON /tmp/glm-leaf-rework-directed.json）；
  content 定向 24/24（JSON /tmp/glm-leaf-rework-content.json）。
- 八批判据终扫 a–h 全过（每批自测 10 类 + control 全绿 + 2 针恰一红）。
- editor 全包 438 文件 3464/3464；content 全包 123 文件 1222/1222（均 exit 0）。
- 覆盖对照终值（coverage-delta.mjs 三段口径）：editor lines 85.41%→86.19%（+224；A–D +177 /
  E–H +47）、branches 75.90%→76.67%（+218；A–D +172 / E–H +46）；content lines 96.44%→96.50%
  (+3)、branches 92.72%→92.80% (+4)；30 个 editor 文件改善。局部数字不充当正式全仓覆盖率。
