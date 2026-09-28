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
