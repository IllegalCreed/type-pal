# ED-FIELD-LABEL-TRACK-WIDE-1 - 编辑器整组宽标签轨合同

Status: review
Phase: phase2
Capability: Editor design system（不改变 capability-map）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: `main`
Target Design-System Version: `2.21.0`

## 目标

为“整组标签普遍较长、仍需保持横排”的主工作区字段新增唯一公共宽轨变体：
`<DsFieldGroup labelTrack="wide">`。wide 标签轨固定 `160px`，容器 `<560px` 时整组 stacked；现有
default `96px / <480px stacked` 合同保持不变。首个采用 owner 为项目全局资源角色 12 行。

## 范围

- 范围内:
  - 公共 token、`DsFieldGroup` 封闭枚举 API、公共 CSS/container query。
  - 项目资源角色 `RoleBindings` 唯一首批采用。
  - DS-L.7、RF-23、Design Lab、版本四处同步与 field-layout adoption census。
  - 12 个标签 + HelpTip 单行、560 边界、720/宽屏溢出与无障碍验证。
- 范围外:
  - 不允许业务 CSS、inline style 或任意数字宽度。
  - 不改变默认 96px / 479-480 边界，不扩大 Inspector 60px 例外。
  - 不修改字段内容、资源角色 schema、命令、选择器或保存语义。

## 前提真值门

### 一句话行为 / 工程前提

资源角色整组的最长标签、必填星号与 32px HelpTip 在 96px 轨内必然换行；用户要求保持横排并整组加宽，
因此必须扩展公共字段布局合同，不能在业务页覆盖既有 MUST。

### 四向真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：纯第二阶段作者工具布局，不涉及原版游戏机制。 | `docs/phase2/READ-FIRST.md` |
| 第一阶段 | N/A：第一阶段没有当前设计系统字段轨合同。 | `CLAUDE.md` |
| 当前二阶段 | DS-F / DS-L.7 锁定唯一 96px 主轨，长标签整组 stacked，禁止业务页扩宽；静态门禁拒绝业务 `--ds-field-label-track` 与私有 grid。 | `docs/phase2/editor/editor-design-system-v1.md:201-202,353-360`；`packages/editor/src/ui/design-system/field-layout-adoption.test.ts:2282-2322,2434-2520` |
| 本任务目标 | 新增公共 wide 160px / `<560px` stacked 变体；default 96px / `<480px` 不变；RoleBindings 只声明枚举采用。 | 本卡设计与验收条件 |

### 用户可见 before -> after

- `before`：标题菜单音乐、启动商标视频、启动开场视频等标签因 HelpTip 占用轨道而换行；最长
  “特殊战胜利结算音乐”在默认轨内更窄。
- `after`：资源角色 12 行使用共享 160px wide 轨，在 720px 与宽屏均保持标签 + 问号单行；小于 560px
  整组切为标签在上、控件在下。
- 产品裁决：2026-08-31 用户明确要求“整体再宽一些，这样就不会换行”。

### 最强替代解释与反证

- 直接给 `.project-role-list` 写 `grid-template-columns` / CSS 变量：违反业务不得拥有标签轨的 MUST 与门禁。
- 使用现有 `layout="stacked"`：合法但违背用户要求的宽屏横排。
- 只缩短文案：不能覆盖 12 个稳定业务名称，且损失作者识别信息。
- 将 HelpTip 绝对定位或缩小命中区：规避布局门禁并破坏公共 32×32 可访问命中区。
- 128px wide：只能覆盖截图中的 6 字标签；最长标签 + required + gap + 32px HelpTip 约需 155px，无法完成
  “整组不换行”。
- 会推翻前提的观察：真实字体与 12 标签测量证明 128px 已全部单行；或 160px 在 720px 令 control/action
  不可用且 560px stacked 仍不能闭合。当前只读估算与现有 DOM 不支持这些观察。

## 上下文锚点

- `docs/ops/tasks/ED-FIELD-LAYOUT-1-editor-field-label-layout-contract.md`：既有 96px/480px 合同与禁止私有轨。
- `packages/editor/src/ui/design-system/controls.tsx:509-523`：`DsFieldGroup` owner。
- `packages/editor/src/ui/design-system/primitives.css:454-531`：当前 responsive/stacked 轨。
- `packages/editor/src/ui/design-system/tokens.css:50`：默认轨 token。
- `packages/editor/src/ui/ProjectWorkbenchTab.tsx:474-609`：12 行资源角色唯一首批采用。
- 不得重新引入：per-row 宽度、业务变量覆盖、inline style、默认轨漂移、Inspector 借壳。

## 设计方案

1. `DsFieldGroup` 新增 `labelTrack?: 'default' | 'wide'`；DOM 输出静态 `data-label-track`，不接受数字。
2. 新 token `--ds-field-label-track-wide: 160px`；wide group 内仍复用同一 field grid owner。
3. wide 仅在 `>=560px` 使用 `160px + gap + minmax(0,1fr)`；`<560px` stacked。default 仍以 `<480px`
   stacked，两个断点各自 fail-closed。
4. `RoleBindings` 声明 `labelTrack="wide"`；不得新增业务 CSS 轨。
5. 规范升 `2.21.0`；`ED-ACTION-GROUP-SPEC-1` 的目标版本顺延为 `2.22.0`。
6. field-layout adoption registry 登记 RoleBindings 为唯一 wide owner，门禁拒绝第二个未审采用和动态/别名参数。

## 验收条件

- 公共合同：default 96px、480 边界不变；wide 160px、560 边界精确；任意数字宽度不可表达。
- 真实页面：12 个标签 + HelpTip 在 720/宽屏均单行且控件起点一致；559 stacked、560 inline。
- 无障碍：label/htmlFor、HelpTip 32px 命中、error/aria-describedby 合同不变。
- 溢出：720、559、560、1280、200% 下页面/卡片无横向溢出，选择器和动作可用。
- 门禁：业务 CSS/inline track 覆盖继续必红；adoption census 唯一 owner；Design Lab RF-23 覆盖 default/wide。
- 测试：聚焦 controls/boundary/field-layout/ProjectWorkbench；typecheck、design-system gate；受影响包全量只跑一次。

## 推进签字

### 进入 build 前：前提 / 设计

- Codex:
  - premise: **verified（2026-08-31）**——直读 DS-L.7 MUST、旧 ED-FIELD-LAYOUT-1 裁决、静态门禁与
    RoleBindings 12 行；确认业务 CSS/absolute-help 不是合法修复。
  - design: **agree（2026-08-31）**——封闭 wide 枚举、160px/560px、default 零漂移、唯一首批 owner、
    DS 2.21.0 与 adoption/Design Lab/浏览器边界闭合。
- Kimi:
  - premise: **verified（2026-08-31，独立直读 DsFieldGroup owner、当前轨 CSS/token、静态门禁、
    RoleBindings 12 行与 12 个标签真值，非复述 Codex）**：
    1. **现行合同与封闭性实锤**:`DsFieldGroup` 当前仅 `layout?: 'responsive' | 'stacked'`
       （controls.tsx:509-523）；responsive 轨由 `--ds-field-label-track` 单 token 持 96px、
       `<480px` 整组 stacked（primitives.css:454-531、tokens.css:50）；既有静态门禁逐值锁定
       `--ds-field-label-track: 96px` 与 480 边界（field-layout-adoption.test.ts:2282-2322,2434-2520）
       ——业务页/per-row 加宽今天就是 MUST 违规且机器必红，唯一合法出路确为扩公共合同。
    2. **12 行与换行必然性实锤**:RoleBindings 12 个 `DsField` 均带结构化 help（→ label-group 内
       32px DsHelpTip）与 required 星号（ProjectWorkbenchTab.tsx:474-613）；12 标签真值
       （project-asset-roles.ts:26-71）:MIDI 音色库 / 默认战斗音乐 / **特殊战胜利结算音乐（9 字最长）**
       / 普通胜利音乐 / 标题菜单音乐 / 战斗物品使用音效（8 字）/ 合击起手音效 / 逃跑音效 /
       敌人变身音效 / 启动商标视频 / 启动开场视频 / 标准色表。本人估算：9 字×12px≈108px +
       星号约 7 + label-group 间距约 6 + HelpTip 命中 32 ≈ **153px**——96px 轨必然换行、
       128px 仍不足、160px 有约 7px 余量，卡面 128px 否决与 160px 取值独立成立。
    3. **原版/一阶段 N/A 认同**:纯二阶段作者工具布局合同，无原版/一阶段真值维度。
    4. **可推翻当前方案的观察**:①若真实字体逐标签测量证明最长组合 ≤128px（本人估算约 153px，
       不支持）;②若 560px 下 160px 轨使 control（select+打开资源类 action）不可用且 559 stacked
       也无法闭合（现行 DsControlGroup 自有窄态行为，预计不成立）;③若改后任一既有 default 组
       渲染漂移——96px token 与 480 边界已被门禁逐值锁定，应红而不应绿。
  - design: **agree（2026-08-31，附 KL1-KL5 必落钉）**：
    - **KL1（最小公共 API 钉）**:在既有 owner 上以封闭枚举 `labelTrack?: 'default' | 'wide'` 扩展是
      最小合法形状——与 `layout` 枚举同构、DOM 只出 `data-label-track`；数值 prop 会重开 96px 合同
      已消灭的 magic number；业务 CSS/per-row 已是 MUST-not + 门禁红；`layout="stacked"` 不满足
      用户“保持横排”裁决。禁止第三档或任意宽度。
    - **KL2（160/560 布局风险钉）**:≥560 时 control 约 360px 可用（select+action）;720px 窄壳
      主区约 688 → wide 保持横排;1280@200% 等效 640 → 组约 600+ 仍 ≥560 横排;<560 整组 stacked
      与 default <480 同型降级，两断点各自 fail-closed。480–560 区间本组由 inline(96) 转
      stacked(wide) 属合同内换轨，非回归。行内 `.project-role-resource`/`.project-role-no-preview`
      尾随内容必须进入 720/560 浏览器断言。
    - **KL3（default 零漂移钉）**:改动严格可加——新枚举值、新 token `--ds-field-label-track-wide`、
      仅作用于 wide 的规则与 `<560px` 查询；default 96px/480 既有规则与门禁断言零改动；
      DS-L.7/RF-23/Design Lab 规范文与版本四处同步同提交完成。
    - **KL4（版本治理钉）**:DS-G.4 minor（响应式合同扩展）适用;2.20.1(done)→2.21.0(本卡)→
      2.22.0(`ED-ACTION-GROUP-SPEC-1` 顺延)顺序与看板登记一致;MUST 级布局合同走“规范修订 +
      三签 + 升 minor”路径而非业务豁免，符合 DS-G.3。
    - **KL5（采用纪律钉）**:RoleBindings 为 field-layout adoption 登记的唯一 wide owner;
      门禁拒绝第二个未审采用、别名/动态/展开传参；wide 组内 label/htmlFor、HelpTip 32px 命中区、
      error/aria-describedby 与 default 完全同构，不得借新轨改动字段自身事务语义。
- GLM:
  - premise: **verified（2026-08-31，12 标签/星号/HelpTip 宽度、census、门禁与 a11y 合同全部本人
    一手复算，非复述 Codex/Kimi；与 Kimi 153px 估算各自独立取得后收敛）**：
    1. **12 标签逐项直读**（project-asset-roles.ts:26-71 ASSET_ROLES）：MIDI 音色库 / 默认战斗音乐 /
       **特殊战胜利结算音乐（9 字最长）** / 普通胜利音乐 / 标题菜单音乐 / 战斗物品使用音效（8 字）/
       合击起手音效 / 逃跑音效 / 敌人变身音效 / 启动商标视频 / 启动开场视频 / 标准色表——
       RoleBindings 角色行 `help` 为对象形式**无条件渲染 DsHelpTip**（ProjectWorkbenchTab.tsx:533-536），
       HelpTip 与 label 同处 `.ds-field__label-group` 标签轨内（controls.tsx DsField）。
    2. **宽度复算（真实 token 直读）**：`--ds-font-label: 600 12px/18px`（CJK 每字 12px）、
       required 星号 `*` ≈6px + margin-inline-start 4px（--ds-space-2）、label→HelpTip gap 4px
       （--ds-space-2）、HelpTip 命中 `--ds-hit-target-compact: 32px`（tokens.css:57）。最长 9 字
       = 108px → **108+4+6+4+32 ≈ 154px**：**160px 可容纳（≥6px 余量）、128px 装不下（154>128，
       8 字标签 ≈142px 同样超）、96px 轨内文本仅剩 ~50px ≈ 4 字/行 → 9 字标签必然两行**。
       「128px 只覆盖 6 字标签」「96px 必然换行」两条前提量化成立；不计星号的弱化情形
       （108+4+32=144px）同样 >128 且 <160，结论对 required 状态鲁棒。
    3. **census 复算**：field-layout-adoption.json 现恰 **18 条 adoptions / 23 条 retired 私有轨**、
       全 registry **零处 wide**；RoleBindings 现登记 `ProjectWorkbenchTab.tsx / responsive:1` 普通
       adoption；同页另有 StartWorldFields / EntryPointEditor×2 / ProjectOverviewPage 四个 default
       消费者——「RoleBindings 唯一 wide 首批」是机器可分辨、可门禁的约束，非整页放行。
    4. **default 零漂移与门禁实锤**：default 轨 = tokens.css:50 `--ds-field-label-track: 96px` +
       `@container ds-field-group (width < 480px)` stacked（primitives.css:471-474,523-533）；
       field-layout 门禁以**精确 allowlist 相等**锁定全部公共轨声明（
       field-layout-adoption.test.ts:2303-2322）；业务轨形状（`72px 1fr` / `minmax(72px,96px)…`）
       被 `isPotentialBusinessLabelTrack` 识别必红（:2473-2497）；inline `gridTemplateColumns` 与
       inline `--ds-field-label-track` 覆盖均被 `governedInlineStyleViolations` 捕获必红
       （:2499-2518）——「业务 CSS / inline / 任意数字宽度不可表达」有既有静态门禁背书。
    5. **a11y 合同与轨宽正交**：`<label htmlFor={id}>` + 控件同 id、error/inlineHelp →
       `aria-describedby={id}-description`、HelpTip 32×32 命中——全在 DsField/DsHelpTip 层，
       与 label track 宽度无关；本方案只加 `data-label-track` + token/grid，语义面零接触。
  - design: **agree（2026-08-31，附 GM-W1~GM-W4 必落钉；与 Kimi KL1-KL5 收敛互补）**：
    - **GM-W1（default 零漂移钉，同 KL3）**：wide 为封闭枚举 + 静态 `data-label-track`，不接受
      数字/表达式；default 四条轨声明（96px token、responsive 双列、stacked 单列、<480 容器查询）
      在 allowlist 中**一行不改**，wide 只新增自己的 allowlist 行；负例：业务页
      `--ds-field-label-track` / `--ds-field-label-track-wide` 覆盖与任意 px 数字轨必须继续红。
    - **GM-W2（census 唯一 owner 钉，同 KL5）**：field-layout adoption 为 RoleBindings 登记
      `labelTrack: "wide"`，门禁机器枚举生产 `labelTrack="wide"` 调用点与登记**双向相等**；第二个
      未审 wide 采用、动态/别名/计算属性传参（AST 精确属性匹配，同 hasExactClassToken 先例）
      必须红；同页四个 default 消费者不得被波及。
    - **GM-W3（双断点精确钉，同 KL2）**：wide stacked 用 `@container ds-field-group
      (width < 560px)` 精确边界（与 default `<480px` 同容器名同 fail-closed 形态）；测试矩阵两侧
      都钉——**559 stacked / 560 inline、479/480 default 不变**，另加 720 / 1280 / 200% 无横向
      溢出且控件/动作可用（560 时 control = 560−160−12 = 388px，布局算术成立；实机归 build 视觉）；
      KL2 指出的 `.project-role-resource` / `.project-role-no-preview` 尾随内容一并进断言。
    - **GM-W4（a11y 与版本钉，同 KL4/KL5）**：聚焦测试断言 label/htmlFor、HelpTip 32px 命中、
      error/aria-describedby 在 wide 与 default 完全一致；DS 2.21.0 为 DS-G.4「响应式合同扩展 =
      minor」正确档位，ED-ACTION-GROUP-SPEC-1 顺延 2.22.0 与看板登记一致。
- counter / 分歧: none（GLM 154px 与 Kimi 153px 为独立测算的正常收敛，钉值一致取 160px/560px）
- build 准入结论: **allowed（签字面）（2026-08-31，Codex + Kimi（KL1-KL5）+ GLM（GM-W1~GM-W4）
  三方 premise verified + design agree 齐、无 counter。Codex 开工时状态转 build，仍为唯一
  Coding Owner。**

### 进入 done 前：审查签字

- Codex: **accept（2026-08-31，commit `6e7999ef`）**——公共 API / token / CSS、RoleBindings 唯一采用、
  adoption/census/版本/Design Lab 均按已签设计闭合；default 96px / `<480px` 声明零漂移。聚焦
  5 files / 157 tests、typecheck、design-system gate（91 files、2 个 evidence-bound exceptions）通过；
  1280、720、560/559 与 default 480/479 浏览器证据无横向溢出，标签、HelpTip、双动作与尾随资源对齐。
  当前工具未能可靠触发真实浏览器 200% zoom，已把该点显式留给 Kimi 视觉复核，不以等效宽度冒充实测。
- Kimi: pending
- GLM: pending
- 用户验收: pending
- done 准入结论: blocked

## Draft / Build / Review 证据

- Draft：用户裁决、规范冲突、推荐公共方案与直接证据已记录；未修改实现/CSS/token/version。
- Build：2026-08-31 Codex 核对三方签字齐、无 counter 后开工；仍为唯一 Coding Owner。
  - `DsFieldGroup` 新增封闭 `labelTrack?: 'default' | 'wide'`，DOM 恒输出 default/wide 静态属性；
    token 新增 160px，CSS 只新增 wide 根规则与 `<560px` query。
  - RoleBindings 五组 12 行仅在 group owner 声明 `labelTrack="wide"`；字段内容、候选、command、预览、
    跳转与保存语义零改动。同页四个 field-group owner 继续 default。
  - field-layout registry 仍为 18 adoptions / 23 retired，wide owner 恰一项；AST 门禁拒绝动态、数字、
    `narrow`、spread 与业务 inline/CSS token 覆盖；snapshot 只新增两条公共 wide 轨记录。
  - DS 版本 index/token/spec/boundary 四处同步 `2.21.0`，规范日期为 2026-08-31；Design Lab RF-23
    增加 wide 560/559，保留 default 480/479。
  - 验证：聚焦 5 files / 157 tests 绿；editor typecheck 绿；design-system gate 91 files、2 个已登记
    evidence-bound exceptions。一次 editor 全量执行为 182/183 files、1498/1499 tests，唯一失败是
    EffectEditorCard 负例被新 CSS 中同名声明截获；将负例定位收窄到目标 selector 后，受影响测试与上述
    聚焦集全绿，按“一次全量”纪律未重复全量。
  - 浏览器：真实 Project 页 1280 下 5 组/12 行均为 160px 标签轨，最长标签单行、HelpTip 32px、
    control/tail 同起点，双动作和 no-preview/resource tail 无溢出；720 下实际 group 292px 自动 stacked，
    control 258px 且无页面/卡片溢出；Design Lab 精确验证 wide 560 inline / 559 stacked 与 default
    480 inline / 479 stacked。真实 200% zoom 未由当前工具可靠触发，禁止写成已实测。
- Review：实现提交 `6e7999ef`；Codex accept，三路内部只读压力审查无剩余 P0/P1/P2；正式 Kimi / GLM
  审签与用户验收待完成，不得标记 done。

## 交接记录

- 2026-08-31 Codex: commit `6e7999ef` 完成公共 wide 标签轨、RoleBindings 唯一采用、DS 2.21.0、
  registry/census/负例与 Design Lab。聚焦 157 tests、typecheck、design-system gate 通过；一次 editor
  全量唯一陈旧负例已以精确 selector 修正并聚焦复绿。浏览器完成 1280、720、560/559、480/479 与
  tail/双动作/HelpTip/overflow 核验；真实 200% zoom 未伪报。Codex 签 accept，状态转 review。
  Next: Kimi 只读视觉/架构终审，重点实测或明确裁决 200% zoom；不得改实现或标记 done。
- 2026-08-31 GLM: 独立测量 12 标签（最长 9 字逐项直读）、星号/HelpTip 真实 token（12px 字体、
  32px 命中、4px×2 gap）→ 最长组合 ≈154px，与 Kimi 153px 独立收敛：160 可容、128 不可、96 必换行；
  复算 field-layout census（18 adoptions/23 retired、零 wide、RoleBindings 同页另有 4 个 default
  消费者可机器分辨）；直读门禁（公共轨 allowlist 精确相等、业务轨形状与 inline `--ds-field-label-track`
  覆盖必红）与 a11y 合同（label htmlFor/HelpTip 命中/aria-describedby 与轨宽正交）。签 premise
  verified + design agree，附 GM-W1（default allowlist 一行不改 + wide 负例必红）/GM-W2（census
  双向相等 + 拒第二采用与动态传参）/GM-W3（559/560 + 479/480 双断点两侧钉 + 720/1280/200%）/
  GM-W4（a11y 同构断言 + DS-G.4 minor 2.21.0 与 2.22.0 顺延一致）。未修改实现，未代签 Kimi。
  三签齐，build 准入（签字面）allowed。Next: Codex 按钉 build；200% zoom 实机仍归 build 期视觉。
- 2026-08-31 Kimi: 独立直读 DsFieldGroup owner（仅 layout 枚举）、96px/480 现行 CSS/token 与
  逐值门禁、RoleBindings 12 行（结构化 help→32px HelpTip + required 星）与 12 标签真值
  （最长 9 字，估算组合约 153px——96 必换行、128 不足、160 有余量）。判封闭枚举为最小合法公共
  API；160/560 对 720/1280/200% 风险闭合；default 由既有门禁锁零漂移；2.20.1→2.21.0→2.22.0
  顺序合理。签 premise verified + design agree（附 KL1 最小 API / KL2 布局风险 / KL3 default
  零漂移 / KL4 版本治理 / KL5 采用纪律五钉与三条可推翻观察）。未修改实现，未代签 GLM。
  Next: GLM 测量 12 标签与 census 后三签齐，Codex 方可 build。
- 2026-08-31 Codex: 用户要求资源角色标签整组加宽避免换行。核验确认现行 MUST 禁止业务加宽，故新开
  公共 wide-track 卡，冻结 160px/560px 与 default 零漂移；未修改实现。Next: Kimi / GLM 独立审签，
  三签齐前不得 build。

## 下一位 Agent 提示词

```text
终审 ED-FIELD-LABEL-TRACK-WIDE-1（Kimi 席，review，只读，不得实现）。

任务卡：docs/ops/tasks/ED-FIELD-LABEL-TRACK-WIDE-1-editor-wide-field-label-track.md
实现提交：6e7999ef feat(editor): add wide field label track
当前状态：review；build 前三签已齐，Codex 已签 accept；Kimi / GLM 正式审查签字与用户验收仍 pending。
你只做只读架构/视觉终审；不得修改实现、不得代签 GLM、不得标记 done。

先读：AGENTS.md、docs/phase2/READ-FIRST.md、editor-design-system-v1.md 的 DS-L.7/DS-G.4、
ED-FIELD-LAYOUT-1 历史卡、本卡全部签字与 Build/Review 证据；审查 commit 6e7999ef 全 diff。

必须独立输出：
1. 核对 API 只能表达 default/wide，default 96px/<480 一行未漂移，wide 160px/<560 只作用于
   RoleBindings；第二 owner、动态/数字值及业务 token/CSS 覆盖是否 fail-loud。
2. 在真实 Project 页复核 5 组/12 行：最长“特殊战胜利结算音乐”+ required + 32px HelpTip 单行，
   control 起点一致；重点覆盖音乐双动作、resource/no-preview tail、error/help 语义与横向溢出。
3. 复核 560/559、720、1280；请尽可能做真实浏览器 200% zoom。若环境仍不能可靠设置 zoom，必须
   明写未实测，并判断 720/<560 stacked 证据是否足以接受，不能把等效 viewport 冒充 200% 实测。
4. 核对 DS 2.21.0 四处、RF-23、18/23 registry 与唯一 wide owner；确认 effect-card 负例定位修正
   没有弱化门禁。
5. 给出 Kimi `accept`，或 `counter` + P0/P1/P2、file:line/复现步骤。若 accept，请写入任务卡并在
   回复末尾附一段可直接转发给 GLM 的只读终审提示词；GLM 与用户签字前不得标记 done。
```
