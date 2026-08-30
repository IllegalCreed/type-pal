# ED-FIELD-LABEL-TRACK-WIDE-1 - 编辑器整组宽标签轨合同

Status: draft
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
- Kimi: pending（需独立核 API/版本治理/反证与宽窄风险）
- GLM: pending（需独立测量 12 标签、census、测试矩阵与门禁）
- counter / 分歧: none
- build 准入结论: **blocked（缺 Kimi / GLM premise verified + design agree；签字齐前不得修改实现）**

### 进入 done 前：审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- 用户验收: pending
- done 准入结论: blocked

## Draft / Build / Review 证据

- Draft：用户裁决、规范冲突、推荐公共方案与直接证据已记录；未修改实现/CSS/token/version。
- Build：pending。
- Review：pending。

## 交接记录

- 2026-08-31 Codex: 用户要求资源角色标签整组加宽避免换行。核验确认现行 MUST 禁止业务加宽，故新开
  公共 wide-track 卡，冻结 160px/560px 与 default 零漂移；未修改实现。Next: Kimi / GLM 独立审签，
  三签齐前不得 build。

## 下一位 Agent 提示词

```text
审签 ED-FIELD-LABEL-TRACK-WIDE-1（draft，不得实现）。

任务卡：docs/ops/tasks/ED-FIELD-LABEL-TRACK-WIDE-1-editor-wide-field-label-track.md
先读 AGENTS.md、docs/phase2/READ-FIRST.md、editor-design-system-v1.md DS-L.7/DS-G.4、
ED-FIELD-LAYOUT-1 历史卡与本卡全部证据。

Kimi：独立判断 wide 枚举是否是最小合法公共 API、160/560 是否会破坏布局/版本治理，并给反证。
GLM：独立测量 12 标签 + required/help、复算 field-layout census，审 default/wide 双断点与测试矩阵。
输出带直接证据的 premise verified + design agree，或 counter/推翻观察，并写回本卡。
三签齐前不得修改 controls/primitives/tokens/spec/version/RoleBindings，不得推进 build。
```
