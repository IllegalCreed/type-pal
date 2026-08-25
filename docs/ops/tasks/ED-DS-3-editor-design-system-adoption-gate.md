# ED-DS-3 编辑器设计系统全量采用与防回流门禁

> **状态**：done（2026-08-25 Codex / Kimi / GLM 三方 `accept` 齐）
> **负责人**：Codex（Coding Owner）
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

- [x] 页面采用矩阵由真实注册表生成，覆盖所有可达编辑器页面，新增页面自动进入矩阵。
- [x] 所有相同语义均指向一个公共 owner；例外有机器可读 owner、理由、验证与删除条件。
- [x] `audit-legacy-controls` 对禁止项返回非零并输出 `file:line` 与修复建议；CI / 本地检查已接入。
- [x] legacy class 非 allowlist 使用为 0；原生控件与 inline style 仅剩审定 allowlist。
- [x] 主内容、左右侧栏、底栏与 modal 的滚动 owner 均有组件测试；已知“页面不能滚动”类型用例通过。
- [x] tooltip / popover / select overlay 的 portal、层级、裁切、dismiss 与滞留回归测试通过。
- [x] 标准新增 / 复制 / 跳转 / 删除 / 解除绑定在页面中不再出现私有样式或折行语义漂移。
- [x] 默认 / 窄侧栏与 100% / 125% / 150% 缩放下，字段行高、间距、按钮高度和分区边界符合规范。
- [x] `docs/phase2/editor/editor-design-system-v1.md` 更新公共合同、采用规则、allowlist 与审查清单。
- [x] `ED-PROJECT-STARTUP-IA-1` 等消费页面不再复制 DS 实现。
- [x] 单元、静态、编辑器最小功能视觉验证通过并记录证据。

## Build 实现与验证证据（Codex，2026-08-24）

- 实现提交：`9dd4e4a3 feat(editor): enforce design system adoption gate`；未包含任务卡、看板或
  `.mimosa/` 会话状态。
- 公共合同：新增统一的 `DsCatalogRow`、`DsPressable`、file / color / readonly 控件能力，
  扩展 `DsDialog` 与字段控件；`DsTextInput` / `DsTextArea` 修复原生 `aria-invalid` 被覆盖的问题。
  音乐、音效、世界与战斗精灵列表统一采用固定 leading slot 与单行 title / meta；标准行高
  68px、compact 行高 46px。
- 采用闭包：`design-system-adoption.json` 由真实 registry 覆盖 25 个页面，并对
  `DataMode` return 组件做双向闭合；`design-system-allowlist.json` 只保留 3 个带七字段证据的
  persistent-shell portal 例外。
- 静态门禁：`audit:design-system` 实现 0=通过、1=违规、2=allowlist 损坏 / 漂移三态，违规报告
  包含 `file:line`、rule、发现物与建议；production raw `button/input/select/textarea`、native
  checkbox 及旧 `in/tool/btn/mini/mini-txt/pv-btn/item-action-button/mini-icon/media-zoom-controls`
  均为 0。剩余 20 个 inline style 均为动态几何，受 AST 规则按证据放行。
- KD2 / GD 门禁测试：隐藏 DS 文件边界和动态几何负例通过；allowlist 0/1/2 三态、registry / DataMode
  闭包、七字段 schema 与陈旧例外均有自动测试。
- 滚动：世界 / 战斗精灵列表改用 `DsVirtualList`；PAL 世界精灵 636 项从全量挂载降到视口内约
  13–18 项，完整 `scrollHeight=43248`，键盘 `End` + `Enter` 可选中第 636 项。
- 聚焦测试均通过；最终唯一一次受影响包全量验证：`pnpm --filter @type-pal/editor check`，
  typecheck 通过，145 个测试文件、1114 个测试全部通过。静态复核
  `pnpm --filter @type-pal/editor audit:design-system`：84 files、3 evidence-bound exceptions、通过。
  `git diff --check` 通过。
- 最小浏览器验证：音乐 / 音效 / 世界精灵行高均为 68px、每行固定 1 个 leading slot；世界精灵
  虚拟滚动与末项键盘选择通过；720px、1024px（125% 等效）、853px（150% 等效）均无横向溢出；
  720px 下 select popover 保持在 viewport 内，`Esc` 关闭后 `aria-expanded=false`；最终 fresh tab
  无 warning / error console log。

## 推进签字

### draft -> build

| Agent | premise | design | 证据 / 备注 |
|---|---|---|---|
| Codex | verified | agree | 已运行 legacy census，并核 `edit-session` / DS 现状；同语义共享 owner 与自动门禁符合用户多次裁决 |
| Kimi | **verified** | **agree** | 2026-08-24 独立核验，附 KD1-KD3（见下方 Kimi 审查节）；census 本人复跑逐数一致，四合同 owner 现状锚点已读 |
| GLM | **verified** | **agree** | 附 GD1-GD3（见下方 GLM 审查节）；census 本人复跑逐数一致，registry 可机读推导 |

**准入结论：build allowed（2026-08-24，Codex + Kimi + GLM 三签齐；`ED-FIELD-COMMIT-1`
已 done，同一 `DsField` + 控制件族冻结点满足）。**

### review -> done

| Agent | accept | 证据 / 备注 |
|---|---|---|
| Codex | **accept** | `9dd4e4a3`；editor 145 files / 1114 tests + typecheck 全绿；静态门禁与最小浏览器验证通过，见上方 Build 证据 |
| Kimi | **accept** | 2026-08-24 独立终审 9dd4e4a3：①本人跑 `audit:design-system`——84 files / 3 evidence-bound exceptions 通过；legacy census 复跑 raw button/input/select/textarea 与 legacy 类全 0，inline 剩 20 均为动态几何负例放行；②25 页采用矩阵与真实 registry 精确相等且每页五 owner 齐全（adoption.test.ts:14-35），DataMode/AST 闭包测试直接执行真实门禁脚本；③allowlist 3 条均为 StampContentEditor 持久壳层布局桥（非浮层），七字段 schema + 0/1/2 三态机检（GD1/GD2 落地）；④公共组件只补真空缺：DsPressable 注释明示不承接标准/危险动作，实测用于物品图标网格与 stamp 卡片等富表面（ItemTab.tsx:576-610、StampPlacementSelectionInspector.tsx:205-231），DsFilePicker/DsColorInput/DsReadonlyValue 同理，aria-invalid 覆盖修复正确；⑤行合同 68/46px 落入 tokens.css:50-51；世界精灵虚拟化 636 项有界挂载 + End/Enter 选择测试通过；⑥聚焦复跑 adoption/boundary/controls/recipes/virtual-list/WorldSpriteLibrary 6 文件 115/115 全绿；全量 145/1114 采纳卡内记录未重复 |
| GLM | **accept** | 2026-08-24 done 前终审（提交 9dd4e4a3，73 文件 +2656/-1539）：**①**本人复跑 `node scripts/design-system-audit.mjs --gate`（= audit:design-system）exit 0，输出 "design-system gate passed: 84 files, 3 evidence-bound exceptions"；**②**census 对比开卡基线零回流：native button 186→**0**、input 113→**0**、select 0、textarea 2→**0**、checkbox 9→**0**、inline 66→**20**（纯动态几何）；legacy class 全家族（tool 40/btn 18/mini 13/mini-txt 20/pv-btn 5/mini-icon 3）→**全零**；DS 采用上升（DsButton 203→309）；**页面级 raw `<input>` 零命中**（仅存 10 处全在 design-system 公共组件本体——census 排除域合法）；**③**allowlist 3 条 exception（StampContentEditor:636-638 private-overlay-portal）**七字段全齐**（file/line/rule/owner/reason/verification/removalCondition，owner=card:ED-DS-3）——GD1 落地；**④**adoption matrix 25 页面 + 四个测试：registry 双向闭合（每注册页恰一条记录）、registry×DataMode return×allowlist×source AST 四向闭合、KD2 双负例（DsFileInput/DsFilePicker 公共化 + BattleSpriteUploader 动态几何 style 实测断言）、陈旧 exception exit 2 / 违规 exit 1 / 通过 exit 0 **三态**——GD2/GD3/KD2 全落地；**⑤**inline style 20 处全为动态几何（width*2/pixelated 类）；**⑥**focused 4 files/97 tests + typecheck 全绿（全量 145/1114 采纳 Codex 记录）。滚动/overlay 合同（KD1 以 DsObjectWorkspace/DsFloatingLayer 为文本源）由 recipes 测试"one constrained scroll content region"/"inspector tabs one visible scroll panel"承载。 |

**收口结论：done（2026-08-25，三方 accept 齐，无 counter / 返工项）。**

## 下一位 Agent 提示词

无下一位 Agent 提示词；ED-DS-3 已完成三方验收并收口，等待后续任务消费稳定公共合同。

#### Kimi 审查（2026-08-24，公共组件/交互架构；本人一手复跑 census + 直读 DS/Session/App/非项目页字段路径）

**premise verified（独立证据锚点）：**
1. **census 复跑逐数一致**：`node packages/editor/scripts/audit-legacy-controls.mjs` 输出
   files=84、button 186/input 113/select 0/textarea 2/label 75/img 6/checkbox 9、inline 66、
   DsButton 203/DsIconButton 70/DsActionLink 3/DsToolbar 2/DsMenuItem 0、legacy tool 40/btn 18/
   mini 13/mini-txt 20/pv-btn 5/mini-icon 3——与开卡基线完全一致；脚本 scope 已排除
   design-system 与 test（脚本头 scope.exclude 直读确认）。
2. **四合同 owner 现状直读**：字段 `DsField`/`DsTextInput`（controls.tsx:410）；滚动
   `DsObjectWorkspace`（recipes.tsx:82，ED-AUDIO 卡已验证其为唯一滚动 owner）；Overlay
   `DsFloatingLayer` portal + collision（floating-layer.tsx:9,51-56,136）与 `DsDialog` 焦点
   生命周期（overlays.tsx:5-43）；动作四层级含 danger（editor-design-system-v1.md:340 DS-C.2）。
   反复缺陷的根因确为“同语义多 owner”，公共 primitive 已存在——本卡是把采用面收口 + 防回流，
   不是新造组件，方向正确。
3. **页面 registry 可机读**：`editor-navigation.ts` 恰 33 个 `id:`（8 模块 + 25 二级页），
   GD3 的双向闭合断言可执行。
4. **最强反例核验**：隐藏原生 file input（import/replace 路径）与 canvas 是必要原生语义；
   卡文已明确“raw 清零不是目标”且门禁只拦视觉常量类 inline style——该反例不推翻前提，
   但必须落入 GD1 的机器可读 allowlist，而不是靠审查默契。

**design agree（附 KD1-KD3，不阻塞准入，与 GD1-GD3 互补）：**
- **KD1（迁移目标是既有 primitive，不是新造）**：ScrollableSurface/Overlay 合同应显式以
  `DsObjectWorkspace` / `DsFloatingLayer` / `DsDialog` 的现行行为为合同文本来源；凡页面行为
  与这些 primitive 冲突，默认改页面。防止本卡产出第三套“理想中的”合同文档与既有实现漂移。
- **KD2（门禁误伤面的双负例）**：除 GLM 的 `.mimosa/` scope 观察外，build 首日须以两个
  已知合法形态做负例回归——隐藏 `<input type=file>`（import/replace 合法路径）与动态几何
  inline style（transform/scrollTop 类）不得触发红项；allowlist 格式即 GD1 七字段。
- **KD3（与 ED-FIELD-COMMIT-1 的 Field API 联合冻结点）**：Field/PropertyRow 的视觉合同
  （本卡）与 draft/commit 事务合同（ED-FIELD-COMMIT-1）必须冻结在同一个 API 表面上
  （同一 `DsField`+控制件族），两卡同 Owner 串行实现；若冻结点分裂成“视觉字段”与“事务
  字段”两套组件，即为回归信号，应停线重签。

**可证伪观察**：若 registry 新增页面未被矩阵生成器拦截（GD3 双向闭合失效），或门禁首日把
隐藏 file input / 动态几何 inline style 报为红项（KD2 负例失败），或某既有 primitive 行为与
合同文档冲突时卡文要求改 primitive 而非页面（KD1 失守）——任一出现即转 blocked 重签。

**验收缺口登记**：D 节 Design Lab 的“modal 内 select/popover 层级”已有 ED-AUDIO 的
FloatingLayer 证据可复用；建议验收时直接引用该卡的浏览器几何证据，不重复巡检。

#### GLM 审查（2026-08-24，页面覆盖/规则审计；本人一手复跑 census + registry 核验）

**premise verified：**
1. **census 本人复跑逐数一致**：`audit-legacy-controls.mjs` 输出 files=84、
   button 186/input 113/select 0/textarea 2/label 75/img 6/checkbox 9、inline 66、
   DsButton 203/DsIconButton 70/DsActionLink 3/DsToolbar 2/DsMenuItem 0、
   legacy tool 40/btn 18/mini 13/mini-txt 20/pv-btn 5/mini-icon 3——与卡文开卡基线
   **完全一致**。
2. **页面闭包可从真实 registry 机读推导**：editor-navigation.ts 含 33 个 id
   （8 模块 + 25 二级页），DataMode dispatch 覆盖各页组件——A 节"从 registry 生成
   而非手写清单"**可执行**（ED-INSPECTOR-TABS/REFERENCE/CATALOG 三卡已用同法
   验证过该路径的完备性）。
3. **历史证据链**：ED-DS-2 系列与 ED-AUDIT-2（GA1/GA2）已把 census 方法论钉死
   （token 词界 + 精确 ceiling），本卡扩展为按类别/页面/allowlist 门禁是自然演进。

**design agree（附 GD1-GD3）：**
- **GD1（allowlist 机器可读 schema 钉死）**：例外条目必须含
  `{file, line, rule, owner, reason, verification, removalCondition}` 七字段并以
  JSON/结构化格式落仓（如 `design-system-allowlist.json`）；boundary test 消费同一
  文件而非测试内复制——防 allowlist 漂移为第二个手写清单。owner 必须是具名 Agent
  或"card:ED-XXX"，不接受"team"。
- **GD2（门禁输出契约）**：失败输出必须含 `file:line: rule-id: 发现物 → 推荐
  owner + 修复建议`（非总数）；exit code 语义（0=通过 / 1=非 allowlist 违规 /
  2=allowlist 自身损坏）三态区分，CI 可直接消费。
- **GD3（页面矩阵生成器防漏）**：矩阵生成器除 registry 33 id 外，必须断言
  "DataMode dispatch 的每个 return 组件都在矩阵中"（双向闭合）；新增页面若未注册
  采用状态，生成器 exit 非零——把"新增页面自动进入矩阵"从口号变成机检。

**测试矩阵核验**：D 节 Design Lab 覆盖滚动/overlay/tooltip/缩放/高度对齐——
建议补两条：① modal 内打开 select 后 Esc 关闭顺序（先 popover 后 modal）的
键盘合同；② 窄侧栏下 tooltip 位于视口右缘时的 collision 翻转。均并入既有
RF fixture 体系，不新增第三套。

**可证伪观察**：若 census 脚本对 `.mimosa/` 或生成产物误扫（scope 已排除
design-system 与 test，但须确认新增目录），门禁第一天即大面积误报——build 首跑
即知。
- 2026-08-24 GLM（页面覆盖/规则审计）: done 终审完成并签 **accept**。GD1-GD3/KD2 逐钉验证：
  gate 三态 exit（0/1/2）+ 七字段 allowlist 3 条 + 25 页面 registry×DataMode×AST 四向闭合 +
  KD2 双负例（file input 公共化 DsFilePicker + 动态几何实测）。census 零回流：native
  button/input/textarea/checkbox 与 legacy 全家族全部归零、页面级 raw input 零命中（10 处
  仅存公共组件本体）、inline 66→20 全动态几何、DsButton 203→309。gate 复跑 exit 0。focused
  97+typecheck 全绿。未改实现，未代签 Kimi，未标 done。
