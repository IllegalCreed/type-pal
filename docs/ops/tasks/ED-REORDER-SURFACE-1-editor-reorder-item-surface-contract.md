# ED-REORDER-SURFACE-1 - 编辑器排序项可见边界与列表表面合同

Status: draft
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

为全部 29 个生产排序入口冻结可见表面语义：内缩且有项间距的复合编辑项必须逐项拥有完整边框，贴边连续列表
必须由一个完整外框包住且行间 gap 为 0，目录 / 树 / 时间线继续由各自专用 surface owner 管理。把该分类写进
采用矩阵和 fail-closed 门禁，清掉 6 个已确认的“内缩项 + 仅分割线 / 无边界”遗留点，且不改变排序、命令或数据语义。

## 范围

- 范围内:
  - 为 `reorder-adoption.json` 的 29 个 adoption 登记 `framed-item | edge-to-edge-list |
    continuous-structure | overlay-card` 视觉表面分类和证据 owner。
  - 修复 `enemy/ai-rules`、`enemy-team/fixed-slots`、`item/resource-reward-tiers`、
    `actor/initial-magic`、`story/dialogue-cue-rows`、`story/set-party-members` 六个已确认红项。
  - 复核窄宽度下 identity / fields 与不可拆动作组，禁止以“没有 overflow”代替内容可用性。
    `shop/stock` 保持连续列表，但在窄容器让完整动作组下沉，并恢复图标动作至少 `32×32px` 的公共下限。
  - 增加 registry、CSS/DOM 和代表页面浏览器门禁，新增或陈旧分类必须 fail-closed。
- 范围外:
  - 不修改 `DsReorderCollection` 的 pointer / keyboard / projection 状态机。
  - 不改变数组顺序语义、adapter、稳定 token、Command 或 undo/redo owner。
  - 不给 surface-neutral 的 `.ds-reorder-item` 全局加 border、padding、background 或 gap。
  - 不重开已完成的 `ED-REORDER-DRAG-1`；本卡只处理其后发现的可见 surface adoption 缺口。
- 明确不做:
  - 不把 Shop、Cutscene、Catalog、Tree 或 Timeline 强行改成逐项卡片。
  - 不用页面局部 margin、单边 border 或隐藏动作来伪造窄宽适配。

## 前提真值门

### 一句话行为 / 工程前提

排序交互 owner 必须保持 surface-neutral；“逐项完整边框”还是“外框 + 连续 divider”由列表容器关系决定，
不能靠是否出现 grip 一刀切，也不能把有 gap 的独立编辑项只画一条底线。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：本任务只改第二阶段作者工具的可见层级，不涉及原版游戏机制或内容真值。 | `docs/phase2/READ-FIRST.md`；`packages/editor/src/ui/design-system/reorder.tsx:1161-1244` |
| 第一阶段 | N/A：第一阶段没有当前 Reforge 编辑器的公共 reorder surface 合同。 | `CLAUDE.md`；`docs/phase1/engineering-notes.md` |
| 当前二阶段 | registry 有 17 家族 / 29 adoption / 32 数据路径，但没有视觉 surface 分类；已确认 2 个严格 edge-to-edge、5 个专用连续结构、16 个已有 frame、6 个 inset/gap 无完整 frame。 | `packages/editor/src/ui/design-system/reorder-adoption.json:1-476`；`packages/editor/src/ui/design-system/reorder-adoption.test.ts:430-446`；下方 census |
| 本任务目标 | 29 项逐项登记视觉分类；6 个红项迁到正确 surface owner；门禁同时证明边界、gap/inset、窄宽可用性，合法连续列表保持不变。 | `docs/phase2/editor/editor-design-system-v1.md` 的 DS-F.4、DS-C.4d、RF-21 |

### 反证与替代解释

- 最强替代解释:
  - 给所有 `.ds-reorder-item` 统一加 border 最省代码；但会让 EffectEditorCard 等双框，并破坏 Shop、Cutscene、
    Catalog、Tree 和 Timeline 的连续表面。
  - 把所有缺框项改成 gap 0 的连续列表也能减少视觉歧义；但复合表单项会失去逐项编辑对象层级和拖动范围。
- 什么观察会推翻当前前提:
  - 若某红项实际由一个完整外框、gap 0、无外侧 inset 的列表 owner 持有，则应改判为 `edge-to-edge-list`，
    不应逐项加 frame。
  - 若某项已有语义卡片 owner，则应登记 `overlay-card` 并复用现有 frame，不能再包 `DsRepeatRow`。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: N/A；本卡不改命令。
  - 原版 / 第一阶段理解: N/A；仅第二阶段编辑器视觉。
  - extractor / 地图 / 数据解码: N/A。
  - audit / test model: 已确认现门禁只验证 grip 几何位于 DOM item 内，不验证可见 surface。

### 用户可见偏离

- 是否主动偏离已核真值: no；按用户提出的两种可接受表现冻结已有界面关系。
- `before -> after` 一句话: 6 个“内缩/有 gap 但无完整边界”的排序编辑项 -> 每项拥有清晰完整 frame；
  合法贴边连续列表不变。
- 代表场景: Enemy AI 规则、敌队固定槽、物品资源奖励档、角色初始法术、对白 cue、设置队员。
- 用户裁决: 2026-08-30 用户明确指出两种合法方向并要求按边界关系统一；本卡设计仍需三方签字。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `DsReorderItem` 只拥有排序交互和几何；业务 surface 不能下沉到公共 reorder wrapper。
  - grip 只表示起拖入口，完整边框表示被移动的对象范围；整行仍不得变成任意位置可起拖。
  - Shop 风格只在完整外框、贴边、gap 0 时成立。
- 代码锚点:
  - 公共中性 wrapper：`packages/editor/src/ui/design-system/reorder.css:1-113`、
    `packages/editor/src/ui/design-system/reorder.tsx:1161-1244`。
  - framed recipe：`packages/editor/src/ui/design-system/recipes.tsx:355-370`、
    `packages/editor/src/ui/design-system/recipes.css:834-877`。
  - 合法 edge-to-edge：`packages/editor/src/ui/ShopTab.tsx:223-257`、
    `packages/editor/src/ui/editor.css:3691-3729`；`packages/editor/src/ui/CutsceneTab.tsx:1107`、
    `packages/editor/src/ui/editor.css:8006-8027`。
  - 六个红项：`packages/editor/src/ui/EnemyTab.tsx:1007-1031`、
    `packages/editor/src/ui/EnemyTeamTab.tsx:444`、`packages/editor/src/ui/ItemUseEffectEditor.tsx:467`、
    `packages/editor/src/ui/ActorMode.tsx:1612`、`packages/editor/src/ui/CommandForm.tsx:450,1561`。
- 已知坑 / 审计文档:
  - 只查 overflow 会让宽度缩到几像素但没有 scroll 的字段假绿。
  - 给 `.ds-reorder-item` 全局加 frame 会污染全部 29 adoption。
  - `ED-REORDER-DRAG-1` 已完成，不得重开或改变排序语义。
- 不得重新引入:
  - inset item + only bottom divider；页面私有 handle；整行 draggable；动作组拆行；无键盘替代。
- 相关测试:
  - `packages/editor/src/ui/design-system/reorder-adoption.test.ts`
  - `packages/editor/src/ui/design-system/reorder.test.tsx`
  - 六个 owner 的聚焦组件测试与 Design Lab RF-21。

## 生产 surface census（build 前冻结）

- `edge-to-edge-list`（2）: `shop/stock`、`asset/cutscene-import-frames`。
- `continuous-structure`（5）: `project/entry-points`、`script/canonical-siblings`、
  `script/legacy-siblings`、`map/layer-stack`、`asset/sprite-action-definitions`。
- 已有 `framed-item / overlay-card`（16）: `project/startup-party`、`project/startup-inventory`、
  `item/equipment-effects`、`item/craft-recipes`、`item/use-effects`、`item/throw-effects`、
  `skill/base-effects`、`skill/execution-effects`、`poison/ticks`、`asset/sprite-action-steps`、
  `asset/frame-animation-timeline`、`actor/casualty-gates`、`actor/casualty-lines`、
  `actor/casualty-effects`、`story/entity-behavior-schemes`、`story/scene-hook-variants`。
- 待迁移 `framed-item`（6）: `enemy/ai-rules`、`enemy-team/fixed-slots`、
  `item/resource-reward-tiers`、`actor/initial-magic`、`story/dialogue-cue-rows`、
  `story/set-party-members`。
- 合计: `2 + 5 + 16 + 6 = 29`。

## 验收条件

- 功能:
  - 29 个 adoption 分类闭合；6 个红项有明确逐项 frame；Shop/Cutscene/专用连续结构不出现双框。
  - pointer、keyboard、上下移动按钮和 undo/redo 仍共用原 owner，一次动作最多一条命令。
- 测试:
  - registry schema/fingerprint/census fail-closed；CSS/DOM 反例能红；六个 owner 聚焦测试通过。
  - Editor typecheck、design-system audit、受影响包全量测试各跑一次。
- 文档:
  - DS-C.4d / RF-21 与 adoption schema 同步，明确四类 surface 的 owner 和禁用混搭。
- 视觉 / 手工验证:
  - 1280 / 900 / 720 与 200% 缩放检查完整边界、拖动预览、动作组、长名称和字段可用性。
  - 至少逐类验证一个 framed、edge-to-edge、continuous、overlay 代表页。
  - Shop 720px 代表场景中 identity 不得缩到仅剩省略号，三枚图标动作不得小于 `32×32px`。
- E2E 用例登记: N/A（功能性编辑器界面，开发期最小浏览器验证）。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: verified（2026-08-30；独立直读 29-adoption registry、公共 reorder wrapper、Shop/Cutscene
    连续表面和 6 个红项代码锚点，census 为 2+5+16+6）
  - design: agree（保持 wrapper 中性；采用矩阵登记视觉分类；只迁移 6 个红项；窄宽检查不能只看 overflow）
- Kimi:
  - premise: pending
  - design: pending
- GLM:
  - premise: pending
  - design: pending
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: pending（Kimi 或 GLM）
  - 独立证据锚点: pending
  - 可证伪观察: pending
- counter / 分歧处理: N/A
- 缺签豁免: N/A
- build 准入结论: blocked

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

- 采用矩阵新增视觉 surface 分类，但不改变已有 adapter / identity / command / revision 字段。
- `DsReorderItem` 永远保持 surface-neutral；framed item 复用 `DsRepeatRow` 或已有领域卡，连续列表由父容器持边框。
- 门禁必须从 registry 反查真实 owner 和 fingerprint，不能只检查“字段已填写”。
- 窄宽降列必须保留完整动作组和可用字段宽度；不允许依靠省略号或零 overflow 假装适配。

### 已知风险

- 风险: 错把专用连续结构改成逐项卡，造成双框和信息噪声。
  - 缓解: 29 项先冻结分类，代表页逐类验证。
- 风险: 为了边框顺手修改 reorder state machine 或业务数组。
  - 缓解: 公共 wrapper、adapter、Command 和 undo 测试 fingerprint 均保持不变。
- 风险: 720 / 200% 下动作组挤掉身份或字段，但 overflow 检查仍为零。
  - 缓解: 同时断言关键列最小可用宽度、动作组矩形和可见文案，不只断言 scrollWidth。

### 主审立场

- Reviewer: Kimi + GLM
- 结论: pending
- 必改项: 至少一位非 Owner 必须独立复算 29 项分类并给出会推翻分类的代表观察。
- 是否建议进入 build: pending

## Build: 实现与自测

- Coding Owner: pending
- 修改文件: pending
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: N/A

## 视觉验证记录

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: pending
- 集中 E2E 用例 / 批次: N/A
- 截图 / 像素检查路径: pending
- 结论: pending
- 未完成项: pending

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: pending

## 交接日志

- 2026-08-30 Codex: 用户指出 Poison 内缩拖动行仅靠 divider 无法表达移动范围；完成 29-adoption 只读 census，
  确认两种合法 surface 与 6 个同型遗留点。当前仅开卡审签，不允许修改本卡范围内的六个 owner。

## 下一位 Agent 提示词

```text
接手任务: ED-REORDER-SURFACE-1 编辑器排序项可见边界与列表表面合同
任务卡: docs/ops/tasks/ED-REORDER-SURFACE-1-editor-reorder-item-surface-contract.md
当前状态: draft / build blocked
你的角色: Kimi 核对视觉/架构边界；GLM 独立复算 29-adoption 分类、覆盖与测试门禁
先读: AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、docs/phase2/editor/editor-design-system-v1.md、
  ED-REORDER-DRAG-1 历史卡、本任务卡、reorder-adoption.json/test、reorder.tsx/reorder.css
已完成: Codex 已从 registry 得到 2 edge-to-edge + 5 continuous + 16 framed + 6 debt = 29 的设计基线；
  本卡未开始实现。
请你做: 独立直读真实 TSX/CSS，给 premise verified 或 counter；检查四类 surface 是否足够、六个红项是否误判、
  窄宽验收是否能防止 no-overflow 假绿；同意时把证据和可证伪观察写入推进签字表。
不要做: 不得改实现文件；不得重开 ED-REORDER-DRAG-1；不得给 .ds-reorder-item 全局加边框；签字不齐不得 build。
输出要求: 分别给出 premise verified/design agree，或 counter + 具体证据；至少一席完成独立反证审查。
```
