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
