# ED-DS-3 编辑器设计系统全量采用与防回流门禁

> **状态**：draft（待 Kimi / GLM 设计签字）
> **负责人**：Codex（Coding Owner，待准入）
> **参与审查**：Kimi（公共组件 / 交互架构）、GLM（页面覆盖 / 规则审计）
> **能力格**：ED2 编辑器设计系统与交互基础设施
> **风险级别**：高（跨页面公共接口与用户可见交互）

## 目标

把“旧控件反复出现、同类页面间距与布局漂移、滚动容器失效、弹层 / tooltip 被裁切或不消失、按钮与删除动作样式不一致”等重复缺陷，从逐页打补丁升级为可枚举、可迁移、可自动阻断回流的设计系统采用工程。

本卡不是再做一次截图巡检，而是建立：

1. 从实际页面 / route 注册表生成的全量采用矩阵；
2. 有明确 owner 的布局、字段、按钮、滚动和 overlay 公共合同；
3. 对旧组件、旧 class、原生控件误用和非标准动作的静态门禁；
4. 能覆盖窄侧栏、长正文、modal、popover、tooltip、缩放与滚动的 Design Lab / 组件测试。

## 用户可见行为 / 工程前提

相同语义必须由同一公共 owner 渲染；页面不得通过局部 CSS 或独立原生控件重新定义同一套交互。

### before -> after

- **before**：全局审计后仍不断出现旧 select / button、折行删除按钮、控件高度不齐、无滚动、tooltip 裁切和层级错误。
- **after**：所有可达编辑器页面都进入采用矩阵；相同语义共享组件与 token；新增回流在 CI / 本地审计中直接失败，例外必须带 owner、理由和删除条件。

用户已多次明确要求系统性修复并将可复用规则写入设计规范，本卡不再逐项征询上述方向。

## 前提真值矩阵

| 方向 | 当前结论 | 一手证据 | 状态 |
|---|---|---|---|
| 原版 / primary source | N/A：本卡只治理第二阶段编辑器 UI 基础设施，不改变原版玩法语义 | 不适用说明：不触碰游戏运行规则与内容数据 | N/A |
| 第一阶段 | 一阶段 UX 只作为可用性真值参考，不要求复刻旧实现；不得破坏已有可达工作流 | `CLAUDE.md` 忠实还原与工程经验；涉及具体页面时补一阶段 UX 锚点 | verified |
| 当前二阶段 | 已有 DS 基础设施，但页面采用不完整；审计仍发现大量原生控件、legacy class、inline style 与独立滚动 / overlay 实现 | `docs/phase2/editor/editor-design-system-v1.md:340`、`:936`；`packages/editor/scripts/audit-legacy-controls.mjs`；当前 census 见下 | verified |
| 本任务目标 | 从页面注册表推导采用范围，把公共语义收口到 DS，并以自动门禁阻止回流 | 本卡“范围”“验收标准” | verified |

### 当前 census（开卡基线，2026-08-24）

执行 `node packages/editor/scripts/audit-legacy-controls.mjs`：

- files：84
- native：`button 186`、`input 113`、`select 0`、`textarea 2`、`label 75`、`img 6`、`checkbox 9`
- inline style objects：66
- DS：`DsButton 203`、`DsIconButton 70`、`DsActionLink 3`、`DsToolbar 2`、`DsMenuItem 0`
- legacy classes：`tool 40`、`btn 18`、`mini 13`、`mini-txt 20`、`pv-btn 5`、`mini-icon 3`

这些数字只证明采用不完整，不等于所有原生标签都非法；迁移前必须按语义分类并建立显式 allowlist。

### 最强替代解释

部分原生控件可能是浏览器语义、性能或可访问性所必需，部分 inline style 可能是动态几何值，并不适合机械替换。若采用 DS 会降低键盘语义、性能或可维护性，应保留受控例外，而不是为了 census 清零制造包装层。

### 什么观察会推翻当前前提

若页面注册表已能证明某页面不可达，或某原生元素有不可替代的语义 / 性能证据，则不要求迁移，但必须进入机器可读 allowlist，并记录 owner、原因、验证与删除条件。

## 上下文锚点

- `AGENTS.md`：跨包 / 公共接口三方必审、功能性界面最小视觉验证。
- `docs/phase2/READ-FIRST.md`：第二阶段纪律。
- `docs/phase2/editor/editor-design-system-v1.md:340`：按钮与 legacy 控件规范。
- `docs/phase2/editor/editor-design-system-v1.md:936`：v2.8 中“同语义必须共享 owner，不做截图补丁”的用户裁决。
- `packages/editor/scripts/audit-legacy-controls.mjs`：现有 legacy audit。
- `packages/editor/src/ui/design-system/controls.tsx`：当前字段 / 按钮基础组件。
- `packages/editor/src/ui/design-system/controls.test.tsx`：现有组件测试。
- `docs/ops/tasks/ED-DS-2-editor-design-system-controls.md`：已完成的基础组件建设，不重开。
- `docs/ops/tasks/ED-AUDIT-2-editor-full-surface-audit.md`：已完成的历史审计，不把旧完成状态当成当前覆盖证据。

## 不得重新引入

- 不得用页面私有 class / inline CSS 模仿已经存在的公共组件。
- 不得只凭截图修 padding、z-index、overflow 或 button height，而不修公共 owner。
- 不得把“raw native 数量清零”当目标；必须按语义审计，受控例外需可追踪。
- 不得用超宽桌面截图作为唯一验收；默认侧栏、窄侧栏、长内容和 modal 都必须覆盖。
- 不得让页面自行持有 tooltip 定时、popover portal、滚动 owner 或删除按钮危险态。
- 不得在本卡顺手重做业务 IA、schema、迁移或运行时语义；这些由独立卡负责。

## 范围

### A. 页面采用矩阵

- 从 App / module / page registry 生成所有可达页面，而非手写一份容易漏项的清单。
- 每页登记：主滚动 owner、侧栏 / 底栏、属性分区、表单控件、动作、危险操作、tooltip / popover / modal、空态与窄宽度状态。
- 按“未采用 / 部分采用 / 已采用 / 合理例外”追踪，并绑定代码锚点。

### B. 公共合同

- **Field / property row**：统一 label 列、control 列、独占一行 checkbox 宽度、控件高度、行距、帮助入口、只读值与错误态。
- **Action / destructive**：统一新增、复制、跳转、删除、解除绑定、图标 + tooltip、文本按钮与 disabled 规则；删除位置遵守列表 / 中间 header 的既定 IA。
- **Scrollable surface**：明确 flex 链上的 `min-height: 0`、唯一 overflow owner、sticky header/footer、wheel / keyboard 行为。
- **Overlay**：统一 portal、z-index、anchor、viewport collision、dismiss、tooltip 尺寸与离开后清理。
- **Panel / section**：统一一级 tab、二级 section、分隔线、padding、标题与说明；无帮助价值的常驻说明删除，有价值说明进入通用圆圈问号。
- **Control height / spacing tokens**：输入、select、checkbox row、button 同级对齐，禁止页面自定相邻控件高度。

### C. 自动门禁

- 扩展 legacy audit 为按类别、页面和 allowlist 输出的失败门禁。
- 新增 raw `<select>`、误用 native checkbox、legacy class、页面私有 tooltip / modal 层级、非标准危险按钮时阻断。
- 对动态 inline style 只拦截可由 token / class 表达的视觉常量，保留几何 / 测量白名单。
- 报告必须给出文件、行号、规则、推荐 owner，不只给总数。

### D. Design Lab 与回归

- 长表单 / 长正文可滚动。
- modal 内 select / popover 位于 modal 之上且不被裁切。
- tooltip 不截字、不滞留、图标保持圆形。
- 100% / 125% / 150% 缩放与默认 / 窄侧栏布局。
- 同一行 input / select / button / checkbox 高度与基线一致。
- 列表项危险操作不折行，文本、图标和 tooltip 语义一致。

## 与其他任务的边界 / 依赖

- `ED-FIELD-COMMIT-1`：负责字段本地草稿、提交、撤销与全局命令边界；本卡负责视觉 / 结构 owner。两卡须先共同冻结 Field API，再由同一 Coding Owner 串行实现。
- `ED-PROJECT-STARTUP-IA-1`：消费本卡公共组件，不在其页面内另写替代控件。
- `ARCH-ENTRY-ACTOR-SEED-1`：决定初始角色字段的业务所有权；不属于本卡。
- `MIG-PAL-WORLD-SPRITE-ALIAS-1`：数据迁移独立推进；不属于本卡。

## 建议实施顺序

1. 生成页面 registry 与采用矩阵，冻结 census / allowlist 格式。
2. 与 `ED-FIELD-COMMIT-1` 联合冻结 Field / PropertyRow 公共 API。
3. 先修滚动与 overlay 两类跨页面根因，并补 Design Lab。
4. 再迁移动作 / 危险操作、字段布局、panel / section 与遗留控件。
5. 开启静态门禁，修完所有非 allowlist 红项。
6. 对矩阵中每个页面做最小功能视觉验证，输出证据索引。

## 验收标准

- [ ] 页面采用矩阵由真实注册表生成，覆盖所有可达编辑器页面，新增页面自动进入矩阵。
- [ ] 所有相同语义均指向一个公共 owner；例外有机器可读 owner、理由、验证与删除条件。
- [ ] `audit-legacy-controls` 对禁止项返回非零并输出 `file:line` 与修复建议；CI / 本地检查已接入。
- [ ] legacy class 非 allowlist 使用为 0；原生控件与 inline style 仅剩审定 allowlist。
- [ ] 主内容、左右侧栏、底栏与 modal 的滚动 owner 均有组件测试；已知“页面不能滚动”类型用例通过。
- [ ] tooltip / popover / select overlay 的 portal、层级、裁切、dismiss 与滞留回归测试通过。
- [ ] 标准新增 / 复制 / 跳转 / 删除 / 解除绑定在页面中不再出现私有样式或折行语义漂移。
- [ ] 默认 / 窄侧栏与 100% / 125% / 150% 缩放下，字段行高、间距、按钮高度和分区边界符合规范。
- [ ] `docs/phase2/editor/editor-design-system-v1.md` 更新公共合同、采用规则、allowlist 与审查清单。
- [ ] `ED-PROJECT-STARTUP-IA-1` 等消费页面不再复制 DS 实现。
- [ ] 单元、静态、编辑器最小功能视觉验证通过并记录证据。

## 推进签字

### draft -> build

| Agent | premise | design | 证据 / 备注 |
|---|---|---|---|
| Codex | verified | agree | 已运行 legacy census，并核 `edit-session` / DS 现状；同语义共享 owner 与自动门禁符合用户多次裁决 |
| Kimi | pending | pending | 需独立审公共合同、overlay / scroll owner、迁移风险与可证伪例外 |
| GLM | pending | pending | 需独立审页面 registry 覆盖、allowlist、测试矩阵与规范更新 |

**准入结论：不满足。Kimi / GLM 签字前不得修改实现文件或标记 build。**

### review -> done

| Agent | accept | 证据 / 备注 |
|---|---|---|
| Codex | pending | — |
| Kimi | pending | — |
| GLM | pending | — |

## 下一位 Agent 提示词

> 请审查任务卡 `docs/ops/tasks/ED-DS-3-editor-design-system-adoption-gate.md`。先读 `AGENTS.md`、`docs/phase2/READ-FIRST.md`、`docs/phase2/editor/editor-design-system-v1.md`、`docs/ops/tasks/ED-DS-2-editor-design-system-controls.md` 与 `docs/ops/tasks/ED-AUDIT-2-editor-full-surface-audit.md`，并自行运行 `node packages/editor/scripts/audit-legacy-controls.mjs`。请独立核验：页面范围是否从真实 registry 推导；Field / PropertyRow、ScrollableSurface、Overlay、Action / Destructive 的 owner 是否足以根治反复缺陷；allowlist 是否可证伪；门禁是否会误伤必要原生语义。把直接证据、最强反例和验收缺口写回任务卡，签 `premise verified + design agree` 或 `counter`。当前不得开始实现、不得标记 build / done。
