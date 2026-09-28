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
