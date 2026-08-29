# ED-FIELD-LAYOUT-1 - 编辑器字段标签列与响应式布局合同

Status: done（2026-08-29 三方 fresh accept 齐；用户批准末轮小修免重复签并直接验收通过）
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

把已经写入设计规范但没有被实现和门禁约束的字段布局真正落地：主工作区横排字段统一使用 `96px` 标签轨，
同一字段组的控件起点一致；容器不足 `480px` 时整组切换为“标签在上、控件在下”。业务页面不得再用
`60/72/84/92/...px` 等私有魔法数自行决定标签宽度，也不得让采用矩阵在页面仍使用 legacy `.field` 时误报
“已采用”。

## 范围

- 范围内：
  - 新增公共 responsive field-group owner，复用现有 `DsField` 的 label/control/help/error 语义；标准标签轨由公共
    token 持有，冻结为 `96px`。
  - 同一 field group 只允许一条共享标签轨；标签不得按单行文字长度自行推开后续控件。
  - 普通长标签在 `96px` 轨内自然换行；若整组标签普遍过长，整组改用 stacked，不提供业务页私自扩宽的逃生口。
  - `ProjectWorkbenchTab` 的入口信息、开局金钱、入口 ID 修复、项目显示名等 legacy `.field` 一次迁入公共 owner；
    截图中的“标签 / 起始场景 / 入口视频 / 金钱”必须共享相同控件起点。
  - 从生产 TSX/CSS 动态生成横向 label/control 轨 census；当前只读基线为 20 条 live page-private 轨、1 条重复
    Inspector bridge、1 条 live 私有只读属性轨和 3 条无 TSX 引用遗留规则。逐项归为公共主表单、Inspector
    紧凑属性行、非表单结构轨或应删除遗留，不能只修截图页面。
  - 明确 `DsPropertyGrid/DsPropertyRow` 是窄 Inspector 的紧凑属性语法；若保留 `60px`，必须在规范中登记为
    唯一命名例外、保持同组一致并覆盖长标签，而不能让业务页面借用该例外。
  - 修正 design-system adoption 真值和静态门禁：登记 owner 必须在生产源码真实出现；业务 CSS 自造字段标签轨
    默认失败，确属非表单结构轨的 allowlist 必须带 owner、理由、响应式证据和删除条件。
- 范围外：
  - 不改字段 draft/validate/commit/cancel/resync、命令数量、undo/redo 或输入性能合同。
  - 不改 schema、migration、runtime、项目内容、角色初始状态 ownership 或排序交互。
  - 不重开已 done 的 `ED-DS-3`、`ED-FIELD-COMMIT-1`、`ED-PROJECT-STARTUP-IA-1`；本卡修复的是新发现的
    规范执行与门禁缺口。
- 明确不做：
  - 不把 `72px` 简单改回 `60px`，也不为被截图点名的四行再写一个页面局部宽度。
  - 不用 JavaScript 测量最长标签后逐行或逐卡动态改宽；布局由 CSS grid/container query 持有。
  - 不把 `DsPropertyRow` 当作主工作区表单 owner，也不为了对齐把短数值输入拉成整行；控件宽度继续由
    `DsFieldMeasure` 等公共 measure 决定。

## 2026-08-29 用户验收返工

- 反例：PAL → 战斗 → 敌人 → 数值。`EnemyTab.tsx:868-895` 虽已消费 `DsDraftNumberInput`，但没有消费
  `DsFieldMeasure`；`.enemy-stat-grid` 只有 `display:grid + gap`，没有列定义，公共 `.ds-input { width:100% }`
  使 11 个运行时数字字段全部成为单列超长输入。
- 这直接违反本卡范围 `:45-46` 与“Draft: 设计结论”中的“短数值不得拉满、由公共 measure 决定”要求。现有
  `boundary.test.ts` 只验证 token/recipe 存在，没有验证真实页面消费，故此前绿色证据不足以通过用户验收。
- 原 Kimi/GLM/Codex review accept 是对 `d0a42191` 的历史事实，保留但不再授权 done；本卡从 review 转 rework。
- 本卡内返工边界：补 short-number 真实消费与防假绿验收。用户同时提出的 NumberInput 可见 affordance、
  inputMode/wheel、全生产数字调用 census 与 `auto-fit` 数字字段网格属于新增公共 API/行为，单独进入
  `ED-NUMBER-FIELD-1`，不得用本卡旧签字夹带实现。
- 依赖：`ED-NUMBER-FIELD-1` 三方 build 前签字齐、实现并完成本反例后，本卡才能重新进入 review。

## 2026-08-29 物品字段布局二次返工

- 用户反例一：PAL → 物品 → 金刚符 → 使用能力。目标、使用规则、成功后菜单、效果类型、状态与回合在同一
  工作流中混用 `compact/default` 密度；业务页用等分列把短枚举拉成超长控件，短数字虽已正确消费公共
  `10rem` NumberField，却被放在一个无意义的等宽大槽内。
- 用户反例二：PAL → 物品 → 金刚符 → 基础信息 → 身份信息。名称与稳定 ID 被页面私有 `1fr 1fr` 强制
  等分，只有两位字符的稳定 ID 仍伪装成半卡宽禁用输入框，信息主次与可编辑性不直观。
- 根因仍属于本卡：业务布局绕过 `DsFieldGroup`、`DsRepeatRow` 与主区只读值合同，并混入私有 viewport
  断点；`ED-NUMBER-FIELD-1` 的公共 `10rem` stepper 本身没有失效，不重开该卡。
- `before -> after`：同一工作流混用尺寸档、短字段等分拉满、稳定 ID 伪装成输入框 -> 主表单统一默认密度，
  完整字段组进入容器驱动的有界 auto-fit 网格，短数字保留 `10rem`，稳定 ID 改为 `DsReadoutList/Row`。
- 原 Kimi/GLM/Codex review accept 是上一候选的历史事实；本轮用户可见候选变化后不授权 done。build 前提与
  已签公共合同未变化，Codex 作为同一 Coding Owner 完成本卡内返工；done 前必须刷新三方 review accept。

## 2026-08-29 物品效果依赖层级第三次返工

- 用户 counter：PAL → 物品 → 使用能力中，“效果 N / 效果类型”和随类型变化的“数值 / 状态 / 回合”等字段
  仍铺在同一视觉平面；排序手柄按整张卡垂直居中后又落在参数行旁，无法看出类型是父选择、下方字段是它的
  条件参数。上一候选的 Codex / Kimi / GLM current accept 全部转为 historical，仅保留审查事实，不再授权
  build 或 done。
- 增量行为前提：效果类型决定该项拥有哪些参数，因此类型、项级动作和排序归属必须位于父级项头，动态参数必须
  位于由该效果命名的下级内容区；这不是 `ED-NUMBER-FIELD-1` 的数字控件缺陷。
- `before -> after`：效果类型、条件参数和排序手柄视觉同级 -> 每个“效果 N”成为一张完整的语义化效果卡，
  类型和项级动作位于父头，手柄归属父头，随类型变化的参数只在有明确分隔、缩进和命名的子区更新。
- 当前二阶段直接证据：
  - `ItemUseEffectEditor.tsx:1321-1365,1797-1835` 的 use / throw 项虽分成 `item-effect-row-head` 与
    `item-effect-grid`，二者仍由同一个无语义层级的 `DsRepeatRow` 表面承载；全部动态分支来自
    `EffectFields` / `ThrowEffectFields`。
  - `design-system/reorder.css:13-27` 的 inline rail 按整项 `50%` 垂直居中，卡片增高后手柄自然落到参数层。
  - `SkillTab.tsx:708-770` 与 `editor.css:8992-9114` 已有“效果头 + 字段体”的视觉先例，但仍是业务私有结构，
    不能再复制第三套页面 CSS。
  - 原版 / 第一阶段均 `N/A`：这是二阶段编辑器的信息层级与可访问语义，不改变游戏机制或内容真值。

### 第三轮增量四向真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：原版游戏没有可对照的 Reforge 物品效果编辑器；本轮不推断游戏机制。 | `docs/phase2/READ-FIRST.md:1-8` |
| 第一阶段 | N/A：第一阶段没有该编辑器及效果卡设计系统；业务效果语义保持当前 canonical，不在本卡改动。 | `docs/phase2/READ-FIRST.md:32-37` |
| 当前二阶段 | 类型选择与动态字段是同一 `DsRepeatRow` 的 sibling；inline reorder rail 位于整卡 50% 中线；Skill 另有私有 header/body 结构。 | `ItemUseEffectEditor.tsx:1321-1365,1797-1835`；`design-system/reorder.css:13-27`；`SkillTab.tsx:708-770` |
| 本任务目标 | use/throw/skill 共同消费语义化 `EffectEditorCard`；父头持有类型、手柄与项级动作，子区持有随类型变化的参数及可选 preview。 | 本节候选设计与第三轮验收条件 |

- 最强替代解释：只给参数行增加背景色或左缩进便足以表达层级。反证是项级手柄仍会停在整卡中线、DOM 仍没有
  列表/分组命名，而且 use / throw / skill 会继续各自维护不同结构；因此必须由共享结构 owner 同时持有语义、
  视觉层级和动作槽。
- 什么观察会推翻当前前提：若真实 DOM 已把每条效果暴露为有名称的列表项/分组，计算样式证明手柄位于父头且
  参数区拥有独立表面与命名，并且 use / throw / skill 已共同消费同一 owner，则无需本轮返工；当前代码证据相反。

### 第三轮候选设计（fresh design）

- 新增领域共享 `EffectEditorCard`，只组合既有设计系统 primitive，并冻结 `header / fields / optional preview`
  槽；不把效果业务语义、mutation 或 draft owner 下沉到通用 `DsRepeatRow` / `DsReorderItem`：
  - effect chain 使用有序列表；`DsReorderItem as="li"` 继续持有拖拽、键盘排序、live region 和上下移动替代。
  - 单项使用由稳定 item key 命名的 `section`（或等价真实分组）；父头包含手柄、“效果 N”、类型选择器与
    上移/下移/删除，参数子区由同一标题关联。
  - 手柄使用 header-aligned / overlay 布局并由共享 header 预留空间，不再按整卡垂直居中；不得把整卡改成
    pointer-only draggable。
  - 参数子区具有独立分隔线、背景与 padding，内部继续使用 `DsFieldGroup`、`DsNumberField` 等已冻结合同；
    类型切换只替换子区，焦点留在类型选择器，不产生额外命令。
  - 无参数类型也保留子区并显示“此效果无需设置参数”或真实行为说明，不能空白消失。
- 系统范围：先由 census 核齐 item use、item throw、skill base/execution、summon/trance preview 与私有脚本
  分支；这些已知效果编辑链共同迁入共享 owner，不允许复制页面局部 CSS。若 census 发现更多同型消费者，
  同卡登记后迁移或给出证据化暂缓项。Item 维持 default density，Skill 维持 compact density；现有业务网格、
  compatible chain、draft scope 与校验仍由宿主持有。
- 响应式与无障碍：容器窄时父头拆为“索引/动作 + 全宽类型”两行、参数改单列；所有格子 `min-width:0`，
  动作不收缩、长名称不横向溢出。保留 `focus-visible`、键盘排序与 Escape 取消；类型切换不 autofocus 参数。
  删除后按“下一项类型 -> 上一项类型 -> 添加效果”恢复焦点并礼貌播报；不在含控件的整块参数区使用
  `aria-live`，不增加高度动画或 `transition: all`。
- 明确不改：schema、migration、runtime、项目内容、NumberField 数值合同、draft/validate/commit、单命令与
  undo/redo 语义。

### 第三轮 build 推进签字

| Agent | Premise | Design | 结论 |
|---|---|---|---|
| Codex | premise verified（2026-08-29）：直读 use/throw DOM、`DsRepeatRow` 单表面、reorder rail 50% 中线与 Skill 私有先例；截图反例可由这些结构直接解释。 | design agree（2026-08-29）：同意共享语义化 EffectEditorCard、父头/参数子区、header-aligned grip、全效果链 census 与焦点/响应式合同。 | agree |
| Kimi | **premise verified（2026-08-29，本人独立直读 use 段 / reorder / Skill 先例，非复述 Codex）**：`ItemUseEffectEditor.tsx:1321-1385` 行头（索引+类型+动作）与 `.item-effect-grid` 参数区确由同一 `DsRepeatRow` 无层级表面承载；`reorder.css:13-23` `.ds-reorder-item__rail { inset-block-start: 50%; transform: translateY(-50%) }` 按整项 50% 垂直居中——卡增高后手柄落参数层的根因实锤；`SkillTab.tsx:708-770 SkillEffectCard` 已是"header(索引+类型+actions)+ fields + 可选 preview"正确结构但业务私有、且无手柄槽。最强替代解释（只加背景/缩进）不成立：手柄仍停中线、DOM 无分组命名、三处结构继续分叉。 | **design agree（2026-08-29，附 K-L1-K-L6）**：K-L1 共享边界——EffectEditorCard 放 ui/ 领域层不进 design-system/，只组合既有 primitive，DsRepeatRow/DsReorderItem 公共合同零改动；K-L2 手柄布局——**`DsReorderItem` 已有 `layout="overlay"`（reorder.tsx:1165、reorder.css:100-108：rail `inset-block-start: var(--ds-space-2); transform: none` 顶部对齐）**，header-aligned 无需改 reorder 公共 API、不得动 inline 50% 规则（其他列表依赖）；K-L3 子区语义——标题关联分组、独立分隔/背景/padding、无参数类型显示"此效果无需设置参数"不空白消失、full-span/嵌套字段结构断言；K-L4 切换与焦点——类型切换只换该卡 body、焦点留类型选择器、零额外命令、相邻不串草稿；删除焦点=下一项→上一项→添加+播报；含控件参数区不用 aria-live；K-L5 密度对称——Item default / Skill compact，use/throw/skill/summon/trance/私有脚本共同消费同一卡，不允许第三套页面 CSS；K-L6 防假绿——adoption/census + CSS 快照，反例红含"手柄仍在整卡中线"。 | agree |
| GLM | premise **verified（2026-08-29，本人独立枚举全部动态分支 + 结构/CSS 一手直读，非代理）**：①**use 分支 = `EffectFields`（:622 起）恰 17 臂**——healHp/healMp/revive/applyStatus/removeStatus/applyPoison/curePoison/permanentStatBoost/gate/runScript/runSceneHook/craftRecipe/drawFromResourcePool/extraPoisonRes/hideParty/modifyHostileAwareness/scaleCurrentHp；无一是空 return——最少参数类型 runSceneHook 也渲染只读说明（"当前场景钩子·传送"），gate/ hideParty/extraPoisonRes 各有单 NumberField——**当前不存在"空白消失"臂，但均直接铺在同一平面**；②**throw 分支 = `ThrowEffectFields`（:1481 起）恰 7 臂**——magicDamage/fixedDamage/applyPoison/currentHpDamage/applyStatus/killIfHpAtMost/damageAndHealCaster；③**私有脚本分支**：use 行 `props.privateScripts?.[index]` 走 `ItemPrivateScriptBodyEditor`（:128 起，:1331-1337 与 :1366 两处消费）——类型头降级为只读"当前物品脚本"；④**Skill 先例**：`SkillEffectCard`（SkillTab:708-770）私有 header/index+type+spacer+actions 结构 + `skill-effect-card--with-preview`（summon/trance preview 槽），editor.css:8992-9114 业务 CSS——**与 use/throw 三套并存的结构漂移实锤**；⑤**单表面 + 50% 中线实锤**：use/throw 行均为一个 `DsRepeatRow.item-effect-row` 内 sibling `item-effect-row-head` + `item-effect-grid`（:1321-1365/:1797-1835）；`reorder.css:13-27` rail `inset-block-start:50% + translateY(-50%)` 按整卡居中——卡增高后手柄落入参数区，截图反例结构可直接解释。 | design **agree（2026-08-29，附 G3-1~G3-4 必落钉，见下方 GLM 展开）** | agree |

**GLM 第三轮 design 展开与必落钉（G3-1~G3-4）**：

- **G3-1（对称采用 census 闭包）**：共享 `EffectEditorCard` 的消费 census 必须机器枚举并双向钉死——use 链（17 臂 + 私有脚本只读降级分支）、throw 链（7 臂）、skill base/execution 链（含 preview 槽）三条链 + 私有脚本分支**全部登记**；Skill 私有 `skill-effect-card` CSS（editor.css:8992-9114）迁移后删除或登记死规则；若 census 发现第四个同型消费者（如其他效果链编辑面），同卡登记后一并迁移或证据化暂缓，不得静默漏。
- **G3-2（类型切换只替换子区）**：`healHp -> applyStatus` 切换只重渲染当前卡的 fields 子区，焦点留在类型选择器，0 条额外命令；相邻卡草稿不串（ItemEffectDraftScope 以 `effect:${reorderKey}:${effect.kind}` 为 scope——kind 变化即 scope 切换，现有 resync 合同继续持有）；类型切换不触发整卡重排动画。
- **G3-3（无参/full-span/嵌套/长名测试矩阵）**：无参数类型（runSceneHook 只读说明等）必须保留带命名的子区，不得空白消失；craftRecipe/drawFromResourcePool 等 full-span 与嵌套字段（rewards ItemAmountList）在 header/fields 结构断言中覆盖；最长效果名（"把场景实体放到玩家面前"）+ 最长物品脚本名不横向溢出。
- **G3-4（防假绿反例）**：effect-card adoption/census + CSS selector 快照同步；门禁必须从真实 Item/Skill render 路径证明共享 owner 消费（route-live，非字符串登记）；四个负例自证会红——缺 owner、错误 item key、手柄仍 50% 中线（CSS 快照拦 `inset-block-start:50%` 于效果卡上下文）、丢 full-span。Skill 密度差异（default/compact）作为 census 字段而非复制 CSS。

#### Implementation-entry census correction（2026-08-29）

- GLM 签字中的“use 恰 17 臂”保留为当时审查记录，但不是当前 canonical 真值。Codex 实施入口机器复核确认：
  item use 为 **20 kind / 19 render arms + 1 author-private 分支**；漏记的 canonical kind 是
  `dieIfNotPoisoned`、`levelUp`、`placeEntityInFront`。直接证据：`packages/content/src/item.ts:181-202`、
  `ItemUseEffectEditor.tsx:54-75,622-1091`。
- 全生产顶层效果链不是原先列出的四个调用路径，而是严格 6 family：
  1. `item/use-effects`：20 kind + author-private；
  2. `item/throw-effects`：7 kind；
  3. `item/equipment-effects`：9 kind；
  4. `skill/base-effects`：18 kind；
  5. `skill/execution-effects`：18 kind（player / enemy 共用调用点）；
  6. `actor/casualty-effects`：2 kind。
  直接证据：六个静态 `adoptionId="*-effects"` 生产调用点；`ItemTab.tsx:1682-1780` 的 equipment 与
  `CasualtyEditor.tsx:536-667` 的 casualty 同样是“类型决定动态参数”的 route-live 卡，后者当前甚至把类型放在
  body 内，不能静默 allowlist。
- 处理结论：六族全部迁入共享 `EffectEditorCard`，不采用 deferred。G3-1 已明确授权 census 发现更多同型消费者
  后同卡迁移或证据化暂缓；本 correction 不改变核心 premise、父头/body、density、手柄或 `before -> after`，
  因此不使三方 fresh design 签字失效。不存在剩余 unknown / counter。
- 防假绿 owner：新增独立 effect-card adoption manifest + test，并接入 `design-system-audit.mjs` 的主 gate；
  production callsite census 与六族 manifest 必须双向相等，且静态证明 canonical import、`as="li"`、
  `layout="overlay"`、稳定 itemKey、header/body slot、kind set 与真实 integration marker。

- build 准入结论：**allowed（2026-08-29）**。fresh Codex + Kimi + GLM premise verified + design agree
  三签齐、无 counter；Codex 为唯一 Coding Owner，可按 K-L1~K-L6 与 G3-1~G3-4 实施。
- done 准入：实现后 fresh Codex / Kimi / GLM 三方 accept 均须重签；用户只需复验本次失败的效果层级切片。

### 第三轮验收条件

- 结构：共享卡的 header 必须先于 fields；类型和项级动作只出现在 header，参数/preview 只出现在 body；
  effect chain 是有序列表，每项是由稳定 key 命名的列表项与分组。六族 Item use/throw/equipment、Skill
  base/execution、Actor casualty，以及 summon/trance preview 与私有脚本分支均有结构断言。
- 行为：切换 `healHp -> applyStatus` 只把同一卡 body 从“数值”替换为“状态/回合”，相邻项不串草稿；排序、
  删除、undo/redo 与一次编辑周期一条命令合同不变。覆盖无参数、full-span、嵌套字段与最长效果名。
- 键盘/焦点：手柄键盘排序、上/下移按钮和 Escape 取消继续可用；类型切换焦点不跳；删除后聚焦下一项、上一项
  或添加按钮并播报。Tab 顺序与视觉顺序一致。
- 响应式视觉：至少检查 1280 / 520 / 320px；父头/参数体分隔清楚，手柄 bounding rect 位于 header 内，
  动作不遮挡类型，参数窄宽改单列，页面无横向溢出；`prefers-reduced-motion` 下无新增布局动画。
- 防假绿：同步 effect-card adoption/census 与 CSS selector 快照；门禁必须从六族真实 render 路径证明共享
  owner 被消费，并以缺失 owner、错误 key、手柄仍在整卡中线和丢失 full-span 的反例自证会红。

## 前提真值门

### 一句话行为 / 工程前提

现行规范已经要求主表单标签轨至少 `96px`、窄于 `480px` 转 stacked，但当前公共组件、项目页面、采用矩阵和
静态门禁没有共同执行这条合同，导致同一页面同时出现 `60px` 与 `72px` 标签轨且门禁仍为绿色。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：二阶段编辑器字段布局没有原版游戏作者工具可对照。 | `docs/phase2/READ-FIRST.md:1-8` |
| 第一阶段 | N/A：一阶段没有 Reforge 编辑器设计系统或项目工作台。 | `docs/phase2/READ-FIRST.md:32-37` |
| 当前二阶段 | 规范要求同组控件起点对齐、横排 label 至少 96px、<480px stacked；入口信息实际命中 `.field=60px`，金钱被 `.project-field-grid` 覆盖为 72px；adoption 却宣称页面已使用 `DsField`。 | `docs/phase2/editor/editor-design-system-v1.md:194,320-327`；`packages/editor/src/ui/ProjectWorkbenchTab.tsx:783-799,1574-1657`；`packages/editor/src/ui/editor.css:1362-1371,1693-1698`；`packages/editor/src/ui/design-system/design-system-adoption.json:269-289` |
| 本任务目标 | 主工作区由公共 field group 持有统一 96px 标签轨与 480px 响应式降级；真实采用与登记一致，私有轨受证据化门禁约束。 | 本卡目标、设计结论与验收条件 |

### 反证与替代解释

- 最强替代解释：截图错位只是两个相邻卡片各自选择不同字段密度，统一成任意相同宽度即可；或采用矩阵只需声明
  控件族，不必证明布局 owner 真正出现。
- 什么观察会推翻当前前提：若计算样式证明两组字段实际 control `left` 相同；或生产源码确实在截图路径消费
  已登记的 `DsField` 布局 owner；或现行规范允许主工作区使用小于 96px 的私有标签轨。当前直接证据均相反。
- audit 红项如适用，已排查的替代根因：
  - runtime 语义 / 命令分类：N/A；纯编辑器布局，不改变命令与数据。
  - 原版 / 第一阶段理解：N/A；无对应作者 UI。
  - extractor / 地图 / 数据解码：N/A；不消费迁移数据。
  - audit / test model：已确认是门禁漏检：现有 adoption 测试检查声明，不证明登记 owner 在页面真实出现；现有
    boundary 反而把 Inspector `60px` 固化，未检查主工作区 `>=96px` 和 container query。

### 用户可见偏离

- 是否主动偏离已核真值：yes（修正当前不合规范的用户可见布局）。
- `before -> after` 一句话：同页标签轨由页面私有 `60/72px` 决定、控件起点错开 -> 主工作区统一 `96px`
  公共轨，窄容器整组转上下布局，业务页不能再自行改列宽。
- 代表场景：项目设置 → 入口点，同屏比较“标签 / 起始场景 / 入口视频 / 金钱”；默认宽度、479/480px 容器与
  100%/125%/150%/200% 缩放。
- 用户裁决：2026-08-27 用户指出同页错位，并明确质疑“有规范却不执行”的设计系统无效问题，要求给出并执行规则。

## 上下文锚点

- 已拍板决策 / 铁律：
  - 已完成旧卡不得重开；新发现的跨页面公共合同和门禁缺口独立开卡。
  - 同一时间只有 Codex 作为 Coding Owner 修改实现；三方 build 签字齐前不改实现文件。
  - 设计系统采用必须来自真实页面 registry，不能只靠声明字符串自证。
- 代码锚点（`file:line`）：
  - `packages/editor/src/ui/design-system/controls.tsx:375-425`（`DsField`）
  - `packages/editor/src/ui/design-system/primitives.css:434-449`（inline 目前为逐行 `auto`）
  - `packages/editor/src/ui/design-system/recipes.tsx:926-960`（Inspector-only PropertyRow）
  - `packages/editor/src/ui/design-system/recipes.css:719-733`（PropertyRow 当前 60px）
  - `packages/editor/src/ui/ProjectWorkbenchTab.tsx:783-799,1353-1378,1574-1657,1929-1941`
  - `packages/editor/src/ui/editor.css:1362-1371,1693-1698,14259-14292`
  - `packages/editor/src/ui/design-system/design-system-adoption.json:269-289`
  - `packages/editor/src/ui/design-system/boundary.test.ts:663,1151-1162`
- 已知坑 / 审计文档：
  - `docs/phase2/editor/editor-design-system-v1.md:194,320-327,487,778`
  - `docs/ops/tasks/ED-DS-3-editor-design-system-adoption-gate.md`
  - 2026-08-27 只读 census：20 条 live 私有横向标签轨，宽度谱含 58/60/72/84/88/92/120/190px 及
    auto/max-content/fraction；必须逐项分类，不能把所有 grid 第一轨机械当作表单。
- 不得重新引入：业务 `.field` 魔法数、单行自动扩宽、viewport/JS 测量代替 container query、逐字中文列、虚假
  adoption、无理由永久 allowlist、把短数值控件拉满整行。
- 相关测试：`design-system/boundary.test.ts`、`design-system/adoption.test.ts`、
  `ProjectWorkbenchTab.test.tsx` 及受影响页面聚焦测试。

## 验收条件

- 功能：
  - 公共 field-group recipe 在宽容器使用唯一 `96px + gap + minmax(0,1fr)` 轨，label/control/help/error 的
    关联、必填、错误和帮助语义继续由 `DsField` 持有。
  - 容器 `<=479px` 时整组 stacked；`>=480px` 时才允许横排。任何单行不得自行覆盖标签列。
  - 项目入口页所有 legacy 字段迁入公共 owner；宽布局中“标签 / 起始场景 / 入口视频 / 金钱”的 control
    `getBoundingClientRect().left` 差值不超过 `0.5px`。
  - 长标签在标准轨中自然换行但不逐字竖排；无法清晰容纳时使用整个 stacked group，不按单行加宽。
  - Inspector 紧凑属性行若保留 60px，规范、公共 recipe 和测试必须明确它是唯一命名例外；业务主表单无法借用。
  - 动态 census 覆盖全部生产 label/control 私有轨，逐项记录迁移、公共例外、非表单结构或死规则删除结论。
- 测试：
  - component/CSS 合同测试覆盖 479/480px、96px token、help/error grid placement、长中文标签和控件 `min-width:0`。
  - adoption 门禁验证登记 owner 在对应生产源码真实出现；ProjectWorkbench 禁止 `className="field"` 与
    `.project-field-grid` 回流。
  - 静态门禁默认禁止业务 CSS 为 field/label/property 自造 label/control 轨；allowlist 必须有 owner、理由、
    响应式证据和删除条件。
  - 每个切片先跑聚焦测试；最后只跑一次 editor 受影响包全量和 typecheck。
- 文档：
  - `editor-design-system-v1.md` 写清“主工作区 96px / <480 stacked / Inspector 命名例外 / 长标签策略”；
    设计系统版本、token、Design Lab 与 adoption registry 同步。
- 视觉 / 手工验证：
  - PAL 项目入口页 1280px、900px、720px，100%/125%/150%/200% 缩放；检查同起点、长标签、无横向溢出、
    focus ring、错误/帮助文案、选择器浮层和滚动。
- E2E 用例登记：N/A（功能性编辑器界面在 build 期做最小浏览器几何验证）。

## 推进签字

### 进入 build 前：设计签字

- Codex：
  - premise: **verified（2026-08-27）**。规范 `editor-design-system-v1.md:194,320-327` 明确 96px/480px
    合同；`ProjectWorkbenchTab.tsx:783-799,1574-1657` 与 `editor.css:1362-1371,1693-1698` 直接证明同页
    60/72px 分裂；`design-system-adoption.json:269-289` 与真实 JSX 不一致，门禁漏报成立。
  - design: **agree（2026-08-27）**。新增公共 responsive field-group owner，主工作区唯一标准轨 96px，
    <480px 整组 stacked；先按动态 census 分类再收口真实违规，不用页面补丁；Inspector 只允许经规范化的
    `DsPropertyRow` 紧凑例外。
- Kimi：
  - premise: **verified（2026-08-27 独立直读规范/页面/公共组件/采用矩阵，非代理）**。①双轨分裂实锤：
    `editor.css:1362-1371` legacy `.field` = `60px 1fr`，`:1693-1698` `.project-field-grid .field` 覆盖为
    `72px minmax(0,1fr)`；`ProjectWorkbenchTab.tsx:783-799` 金钱字段走 72px 轨，`:1578-1661` 入口信息
    （标签/起始场景/入口视频）走 60px 轨——同页同屏两轨。②规范冲突属实：DS-L.7（doc:320-327）要求
    标签列 ≥96px、容器 <480px 整组 stacked；DS-F.4（:194）要求标签列/输入起点逐行对齐；60/72px 均违规。
    ③采用矩阵误报实锤：adoption.json 的 project/entrypoint 与 project/overview 登记 field owner 为
    “DsField + …”，而上述 JSX 实际是 legacy `<label className="field">`/`<div className="field">`，
    不消费 DsField。④公共组件现状：`primitives.css:440-449` 的 `ds-field--inline` 为逐行 `auto` 轨，
    无法形成跨行合同；`recipes.css:719-733` Inspector `DsPropertyRow` 为 60px 紧凑语法。
  - design: **agree（2026-08-27，附 KL1-KL4，build 必落钉）**：
    - **KL1（断点必须 container query）**：`DsFieldGroup` 只持轨道与响应式降级，label/control/help/error
      语义仍归 `DsField`；479/480 断点必须基于容器（container query），不得用 viewport media query——
      drawer/Inspector 嵌套下两者不等价。
    - **KL2（Inspector 例外唯一命名 + inline 收口）**：`DsPropertyRow` 的 60px 若以“Inspector 紧凑属性行”
      保留，必须在规范、recipe、Design Lab 与测试中登记为唯一命名例外，业务主表单借用即红；
      `DsField layout="inline"` 的逐行 auto 轨要么退休生产用法，要么限制到明确无对齐场景并由门禁区分。
    - **KL3（adoption 真值门禁）**：登记 owner 必须在对应生产源码真实出现（防本次误报回流）；census
      输入域为全生产 TSX+CSS 动态派生，逐项分类为公共主表单/Inspector 紧凑/非表单结构/死规则删除，
      不允许只修截图四行。
    - **KL4（长中文标签策略）**：96px 轨内自然换行，不逐字竖排、不按单行扩宽；整组普遍过长时整组
      stacked；落成组件测试断言（长标签行高变化但控制起点不变）。
- GLM：
  - premise: **verified（2026-08-27，本人一手读码 + 独立机器 census，非代理）**：
    1. **60/72px 分裂实锤**：`editor.css:1362-1366` 通用 `.field` = `60px 1fr`；`editor.css:1693-1698`
       `.project-field-grid .field` = `72px minmax(0,1fr)`（双类选择器更高优先级）。JSX 侧：金钱字段
       被 `.project-field-grid` 包裹（`ProjectWorkbenchTab.tsx:784-785`）→ 72px；入口“标签 / 起始
       场景 / 入口视频”是裸 `.field`（`:1580-1601`）→ 60px——同页相邻卡片控件起点差 12px，
       before 属实。
    2. **违反现行规范实锤**：`editor-design-system-v1.md:194`（表单标签列、输入起点和尾部动作列必须
       逐行对齐）与 DS-L.7 `:322-323`（横排仅容器 >=480px 且标签列不得窄于 96px，不足转上下）。
       60 与 72 均低于 96px 下限且无 480px 容器降级——双重违规，非“两种合法密度”。
    3. **adoption 漏报实锤**：`design-system-adoption.json:269-289` `project/startup` 与
       `project/entrypoint` 的 field owner 声明 `"DsField + …"` 且 `status: adopted`，但生产 JSX
       （:785/:1580/:1590/:1361/:1936）全部是 `className="field"` legacy 标记——登记 owner 与源码
       不符，“已采用”为虚报。
    4. **门禁双缺口实锤**：`boundary.test.ts` 全文 grep `96px|480px` **零命中**——主工作区
       96px/480px 合同完全无断言；`:663-668` 反而把 Inspector 桥接 `:is(.inspector,…)
       :where(.field,.music-meta-row) = 60px minmax(0,1fr)`（editor.css:14259）冻结为现状。另
       `primitives.css:437-443` `.ds-field--inline` 是逐行 `auto minmax(0,1fr)`——构不成跨行起点
       合同，与卡文/ KL2 判断一致。
    5. **独立机器 census（本席复跑）**：扫 editor.css 全部 `grid-template-columns` 首轨共 **51 条**
       原始命中；按“可见 label 第一轨 + control 第二轨”语义过滤后约 25 条 label 轨候选，其余为
       序号（30px DsSequenceIndex 族）/图标/槽位/动作/选项结构轨——宽度谱 42/56/58/60/64/72/88/
       92/112/120/150/190px（:1986）及 auto/max-content，与卡文基线同域；**无 TSX 引用的死规则
       本席直接找到 3 条**：`.stamp-slot-list li`（:4734）、`.canonical-command-row`（:13720）、
       `.script-hook-initial`（:14176）；`.music-meta-row`（:7986）类名不在 TSX 但被 :14259 桥接
       选择器引用，需 census 判定动态引用或死规则。卡文 20/1/1/3 基线量级复现，精确数以 build 期
       动态 census 为准。
  - design: **agree（2026-08-27，附 FL1-FL3 必落钉；与 KL1-KL4 互补不冲突）**：
    - **FL1（census 产物化 + 分类判定轴冻结）**：动态 census 必须落成可复现产物（同
      field-commit-adoption.json 纪律）：脚本扫生产 TSX/CSS 全部横向首轨，逐条登记 selector、
      live/dead（TSX 引用核验，含动态类名）、分类（主表单迁移 / Inspector 紧凑例外 / 非表单结构轨 /
      死规则删除）与证据锚点。判定轴冻结为“可见 label/属性名第一轨 + control/value 第二轨”——
      本席 51→25 的过滤结果证明不做语义分类会误伤序号/媒体/动作结构轨。本席找到的 3 条死规则 +
      `.music-meta-row` 动态引用疑点必须进入 census 首轮分类结论。
    - **FL2（adoption 真值化 + 补齐 boundary 主工作区断言）**：adoption 门禁双向化——登记 owner
      必须在对应生产源码真实出现（本席已证 project/startup+entrypoint 的 DsField 声明为虚报），
      源码出现未登记同样失败；boundary 必须补上当前完全缺失的 `96px` token 与 `480px` container
      query 断言（grep 零命中为证），并把 Inspector 桥接 60px 合法性收紧到 `:is(.inspector,…)`
      作用域内——主工作区 .field 不得借道（与 KL1 container query、KL2 例外唯一命名同向）。
    - **FL3（测试矩阵）**：DsFieldGroup 组件/CSS 合同测试覆盖 479/480 切换、组内唯一共享轨（非
      逐行 auto）、长中文标签换行不逐字（与 KL4 同向）、stacked 态 help/error grid placement、
      control `min-width:0`；每个迁移页断言 `className="field"` / `.project-field-grid` 覆盖不
      回流；入口页四行 control left 差 ≤0.5px 在迁移后公共 owner 上实测，并保留“旧 60/72 双轨”
      负例断言（再出现双轨即红）。
  - 独立反证 / 可证伪观察：①若浏览器实测两组字段 control left 本已相等（更高优先级覆盖或容器
    差异），before 前提失效——本席特异性分析（双类 > 单类）表明 72px 必然生效于金钱、60px 必然
    生效于入口信息，分裂是结构性的；②若某主工作区表面的 `DsField layout="inline"` 逐行 auto 是
    承载语义（单字段无对齐场景），退休该用法须走 census 分类 + 命名例外，不得静默破坏；③若卡文
    “1 条 live 私有只读属性轨”实际可由 `DsPropertyRow` 表达，应迁移而非 allowlist——allowlist
    仅收真正非表单结构轨。
- 独立反证审查（至少一位非 Coding Owner 必填）：
  - 审查者：Kimi（2026-08-27）；GLM（2026-08-27，独立机器 census + 逐锚点直读，见 GLM 签节
    FL1-FL3 与可证伪观察①-③——两席反证独立完成，证据集合互补不重叠）。
  - 独立证据锚点：`editor.css:1362-1371,1693-1698`；`ProjectWorkbenchTab.tsx:783-799,1578-1661`；
    `editor-design-system-v1.md:194,320-327`；`design-system-adoption.json` project/* 四条；
    `primitives.css:434-449`；`recipes.css:719-733`。
  - 可证伪观察：若计算样式证明截图四行的 control `left` 实际相同，前提被推翻——两条私有轨（60/72px）
    的 CSS 直读已排除；若生产源码确在截图路径消费已登记 DsField owner，门禁误报不成立——JSX 直读为
    legacy `.field`；若现行规范允许主工作区 <96px 私有轨，本卡目标错误——DS-L.7 明文 ≥96px。另注意
    范围外纪律：本卡不重开 ED-DS-3/ED-FIELD-COMMIT-1/ED-PROJECT-STARTUP-IA-1 的已冻结合同，若
    DsFieldGroup 实施必须改 DsField 公共 props 或 draft 事务语义，相关卡签字须重开评估。
- counter / 分歧处理：N/A。
- 缺签豁免：N/A。
- build 准入结论：**historical allowed（2026-08-27，Codex + Kimi（KL1-KL4）+ GLM（FL1-FL3）三签齐、无 counter，
  两席非 Owner 独立反证完成；必落钉 KL1-KL4 / FL1-FL3 一并携带。转 `build`，Coding Owner 保持
  Codex；本卡仅授权字段布局合同范围，不得夹带改 DsField draft 事务语义——若实施必须改 DsField
  公共 props，按 Kimi 反证条款相关旧卡签字须重开评估。）**

### 进入 done 前：审查签字

- Codex: **accept（2026-08-28）**。最终聚焦 7 files / 132 tests、typecheck、build、design-system gate
  与浏览器几何证据均通过；Codex 并行只读压力测试发现的路由/可达性 P0/P1 已全部以反例闭合。
- Kimi: accept（2026-08-28，只读终审 commit d0a42191，独立直读公共 recipe/CSS/门禁与消费面 + 聚焦复跑，
  非代理）。按我设计期 KL1-KL4 逐项核验：
  - **96px 主轨 ✓**：`tokens.css:50 --ds-field-label-track: 96px`；`DsFieldGroup` 的 responsive 轨 =
    `var(--ds-field-label-track) minmax(0,1fr)`（primitives.css:453-457）；help/error 落独立 support
    grid-area（:481-484），长标签 `overflow-wrap: break-word` 自然换行不扩宽（:468-471，KL4）。
  - **精确 <480px stacked ✓（KL1）**：`@container ds-field-group (width < 480px)` 严格小于阈值
    （primitives.css:502-509），`container-type: inline-size`（:441-443）——容器查询而非 viewport
    media query，drawer/嵌套下不等价问题按设计规避。
  - **Inspector 60px 命名例外 ✓（KL2）**：`DsInspectorHost/DsInspectorPortal`（recipes.tsx:37-62，
    portal 离开宿主即 throw）；`recipes.css:728-731` 的 60px 紧凑轨只在 `[data-ds-inspector-host]`
    下生效，基础 `.ds-property-row` 为单列——主工作区无法借用该例外，命名唯一例外机检成立。
  - **真实路由 adoption 与防假绿 ✓（KL3）**：`field-layout-adoption.json`（version/adoptions/
    exceptions/retiredPrivateTracks 四域）+ `field-layout-css-census.snapshot.txt`（217 行快照
    本人复核存在性）；`field-layout-adoption.test.ts` 七断言覆盖“真实 render 可达闭包”、
    Inspector 逃逸宿主拒绝、public-owner/token override 拒绝与 96px/480px 边界锁定——adoption 不再
    凭声明字符串自证，登记 owner 必须真实可达。
  - **消费面 ✓**：ProjectWorkbenchTab 11 处 `DsFieldGroup`（含入口信息四行区 :1347 与角色资源
    :466），legacy `.field`/`.project-field-grid` 迁移路径与卡面一致；无路由 `EntryPointTab.tsx`
    已删除（commit diff 复核）。
  - 聚焦复跑：field-layout-adoption/adoption/recipes/boundary 四文件 96/96 通过（含并行 timeout
    波动复跑两轮均绿）；全量采纳卡内记录未重复。
- GLM: **accept（2026-08-28，只读终审 commit d0a42191，本人一手直读 CSS/组件/门禁 + 独立复跑）**：
  1. **96px 主轨** ✓：`tokens.css:50` `--ds-field-label-track: 96px`；`primitives.css:453-457`
     `.ds-field-group[data-layout="responsive"] > .ds-field` = `var(--ds-field-label-track)
     minmax(0,1fr)`，label/control/support 由 grid-area 持有（help/error 独立 support 行）。
  2. **精确 <480px stacked** ✓：`primitives.css:502` `@container ds-field-group (width < 480px)`
     ——严格小于 480（479 单列/480 横排），container-type: inline-size（:441-443，非 viewport
     media query，KL1 落实）；Codex 浏览器实测 480=`96px 372px`、479=单列。
  3. **Inspector 60px 命名例外** ✓：`recipes.css:728-731` 60px 紧凑轨**仅在**
     `[data-ds-inspector-host]` 下生效；基础 `.ds-property-row`（:719-726）为单列——比原设计
     更强，业务面在合法宿主外根本借不到 60px（KL2 落实且超出）。
  4. **真实路由 adoption** ✓：`field-layout-adoption.test.ts` 七个具名测试——:1741 按“真实
     render 可达闭包”核每个 field group/inline 例外/detached Inspector owner；:1793/:1988 拒绝
     Inspector 逃逸宿主与主区自授权；:2100 例外须带证据；adoption 审计升级为沿 App→connector→
     dispatcher→真实 render 追踪（本席核 test 内 ts 解析与反例结构，FL2 防假绿落地）。
  5. **CSS census 与防假绿** ✓：`field-layout-css-census.snapshot.txt`（217 行）+ :2243
     “locks every production CSS grid track and rejects public-owner or token overrides” +
     :2434 “locks the main readout track to 96px and the exact <480px container boundary”
     ——死规则删除与 allowlist 由快照钉住；:2455 防 legacy 类名复合误匹配。
  6. **消费与独立复跑**：ProjectWorkbenchTab 11 处 DsFieldGroup（含入口四行区）；本席独立复跑
     `field-layout-adoption.test.ts + adoption.test.ts + boundary.test.ts` → **65/65 passed**。
  - 无返工项。未修改实现文件，未代签 Kimi。
- counter / 返工处理：当前无 counter；若任一席给出可复现 P0/P1，保持 review 并返工。
- 缺签豁免: N/A
- done 准入结论: **historical blocked（2026-08-28）**——当时 Codex + Kimi + GLM 三方 accept 已齐、仅待用户；
  2026-08-29 用户反例已使该候选失效，当前以其后的返工审查签字为准。

#### 2026-08-29 第三轮前的历史审查签字（全部失效）

以下签字只记录其各自候选在当时的审查事实；2026-08-29 效果依赖层级 counter 已使其全部失效，不得再解释为
当前准入签字。

- Codex：**accept（2026-08-29）**。Enemy 与其它代表主表单已真实消费公共 `DsNumberFieldGrid` / 10rem
  NumberField；数字 adoption registry、field-layout registry/CSS census 与真实路由 owner 已同步刷新，聚焦
  field-layout 7/7、route adoption 20/20 通过，浏览器 1280～320px 无横向溢出。
- Kimi：**accept（2026-08-29，当前返工候选只读终审；旧 2026-08-28 accept 仅作历史未复用）**:
  1. **既有合同零破坏 ✓**:96px 主轨 / 精确 <480px container stacked / Inspector 60px 命名例外
     未被本轮回流——`field-layout-adoption.test.ts` 七断言（真实 render 可达闭包、Inspector
     逃逸宿主拒绝、CSS grid track 快照锁定、96px/480px 边界）本人聚焦复跑 **7/7 通过**;
     `field-layout-css-census.snapshot.txt` 仍由门禁钉死。
  2. **Enemy short-number 反例收口 ✓(本卡 rework 核心)**:EnemyTab.tsx:46,64,876 真实消费
     `DsNumberFieldGrid` + `DsDraftNumberField`——公共 `repeat(auto-fit, minmax(min(100%,
     12rem), 1fr))`(recipes.css:888-896,tokens.css:53)替换无列 `.enemy-stat-grid`;
     `.ds-number-field > [data-ds-control-id]` 以 10rem measure 默认限宽
     (primitives.css:597-601),stepper `− / input / +` 同壳提供可见 affordance
     (controls.tsx:791-832)——截图"单列超长无 affordance 框"根因三件(全宽 input / spinner
     隐藏无替代 / grid 无列)全部由公共配方收口,不是页面私修。
  3. **registry 同步真值 ✓(本人 node 复算)**:`number-field-adoption.json` baseline
     `{files:36, leafCalls:111, controls:{55,29,4,23}}` 算术闭合;EnemyTab 自身证据(不再
     借同 registry 其他组件冒充);`design-system-adoption.json` 与 field-layout registry 在
     同一工作树同步刷新,route adoption 20/20(NUMBER-FIELD 卡终审已核)。
  4. **横向溢出与 zoom**:Codex 1280→320px × 100-200% zoom 浏览器证据登记在 NUMBER-FIELD
     卡,`min(100%, 12rem)` 与 `minmax(0, 1fr)` 提供结构性防溢出;符合功能性最小视觉验证
     分层,本席不重复跑。
  5. **复跑证据**:本人聚焦 5 文件(controls / number-field-adoption /
     field-layout-adoption / SkillTab / EnemyTab)**75/75 全绿**;Skill"前置震屏帧"
     关闭↔1 往返与强度字段显隐(ED-NUMBER-FIELD-1 终审第 6 条)同工作树核实。
  - 无返工项。GLM accept 与用户复验前不得标记 done。
- GLM：**current accept（2026-08-29，物品字段二次返工候选只读终审；旧 2026-08-28 Enemy 前与
  2026-08-29 Enemy 后 accept 均仅作历史，未复用）**。本人一手直读迁移面 + 独立复跑：
  1. **身份信息迁移实锤** ✓：`ItemTab.tsx:1518-1523` 稳定 ID 改为
     `DsReadoutList > DsReadoutRow label="稳定 ID" > DsOverflowText as="code"`——
     真实只读行 + overflow reveal，不再伪装等宽输入框；名称保留可编辑标准字段组；
     **`.item-readonly-field` 生产零命中**（本席 grep ItemTab 与 editor.css 均为 0）。
  2. **使用/投掷效果迁移实锤** ✓：`ItemUseEffectEditor` 消费 `DsRepeatRow` +
     `DsFieldGroup layout="stacked"`（:24-30 import，:263/:294/:311/:330/:349 多组）；
     目标/规则/菜单与效果参数走 `item-effect-grid`（:904/:1363/:1833）容器驱动网格；
     NumberField 公共 10rem 不变（NUMBER-FIELD 卡合同）。
  3. **registry 真值同步** ✓：全量唯一失败（NumberField 旧 `none` context 登记）已由
     Codex 修正并聚焦 gate 4/4 复绿；本席独立复跑 `field-layout-adoption +
     boundary + ItemTab` → **3 files / 74 tests 全绿**——96px 主轨 / <480px stacked /
     Inspector 60px 命名例外七断言含在内，既有合同零回流。
  4. **Codex 浏览器证据**（1920px 双列 / 1000px 单列 / 溢出 0 / 旧 readonly 0）与
     实现结构一致，本席不重复跑（功能性最小视觉验证分层）。
  - 无返工项。未修改实现文件，未代签 Kimi。
- 用户复验：historical pending（已被第三轮 counter 取代）。
- 当前 done 准入结论：**blocked（第三轮 review 三方 accept 齐，仅待用户复验）**。fresh design 三签齐、
  六族实现与 counter 返工（DS v2.19.0 四向同步）均已闭合；Codex / Kimi / GLM 当前 review accept 均
  2026-08-29；任何 Agent 不得自行标记 done。

## Draft: 设计与风险

### 设计结论

- 公共 owner 建议命名为 `DsFieldGroup`：父级持有 container query 和 `--ds-field-label-measure: 6rem`，直接子级
  继续使用现有 `DsField`/`DsDraft*Field`；业务页不接触轨道 CSS。
- 标准布局不按每行 label 的 intrinsic width 伸缩。这样相邻卡片只要使用相同 card padding 和公共 token，输入
  起点就稳定一致；短数值字段通过 `DsFieldMeasure` 收窄 control 本身，不改变 label track。
- `DsField` 当前 `layout="inline"` 的逐行 `auto` 不足以形成跨行合同：实施时要么退休该生产用法，要么只允许在
  单字段无对齐要求的明确场景使用，并由门禁区分。
- `DsPropertyGrid/DsPropertyRow` 是窄 Inspector 的独立紧凑语法，不得成为主工作区绕过 96px 的入口；其 60px
  保留与否以三方签字后的唯一结论为准，但无论哪种都必须在规范、recipe、Design Lab 和测试中一致。
- census 的判定对象是“可见 label/属性名第一轨 + control/value 第二轨”，不是所有多列 grid；避免误伤媒体、
  序号、图标或尾部动作等非标签结构。

### 已知风险

- 风险：全局正则把非表单结构 grid 误判为 label 轨。
- 缓解：以生产组件/DOM 语义和动态 census 为准；allowlist 仅接收命名 owner、理由、响应式证据和删除条件。
- 风险：强制 96px 可能让窄 Inspector 控件过窄，强制 stacked 又会显著增加纵向高度。
- 缓解：Inspector 走独立 `DsPropertyRow` 设计裁决并形成唯一命名例外，不把局部妥协扩散到主工作区。
- 风险：只验证截图四行，其他 20 条私有轨继续漂移。
- 缓解：采用矩阵从生产代码动态派生，门禁断言输入域闭合；实现按聚焦切片推进，最终只跑一次全量。

### 主审立场

- Reviewer：Kimi（公共 API、响应式和视觉规则）+ GLM（census、门禁与测试矩阵）。
- 结论：Codex agree；Kimi agree（KL1-KL4）；GLM agree（FL1-FL3），三签齐且无 counter。
- 必改项：KL1-KL4 + FL1-FL3，含容器断点、Inspector 命名例外、adoption 真值门禁、长标签策略和
  双轨负例矩阵。
- 是否建议进入 build：是；准入已开放，按单 Coding Owner 纪律排在当前 Add Picker build 之后。

## Build: 实现与自测

- Coding Owner: Codex（complete；唯一实现者）
- 修改文件:
  - 公共合同与文档：`design-system/tokens.css`、`primitives.css`、`controls.tsx`、`recipes.tsx/.css`、
    `index.ts`、Design Lab RF23、`editor-design-system-v1.md`。
  - 真实页面迁移：项目工作台及动态 census 命中的主工作区/Inspector 消费面；删除无路由的
    `EntryPointTab.tsx` 和已证实死 CSS，不修改 schema/runtime/project 内容。
  - 门禁：`field-layout-adoption.json`、`field-layout-css-census.snapshot.txt`、
    `field-layout-adoption.test.ts`，并将 adoption registry/审计器升级为按真实 App → connector →
    Project/Data dispatcher → render 可达组件闭包核 owner。
- 实现摘要:
  - 新增 `DsFieldGroup`：主工作区共享 `96px + gap + minmax(0, 1fr)` 标签轨，精确在容器 `<480px`
    stacked；help/error/control 仍由 `DsField` 持有，长标签自然换行。
  - 新增 `DsInspectorHost` / `DsInspectorPortal`，把 `DsPropertyGrid/Row` 的 `60px` 紧凑轨限制在已命名
    Inspector 宿主；`StampContentEditor` 仅把属性表 portal 到合法宿主。
  - 动态 census 对全部生产 TSX/CSS 分类；移除 35 条已证实死/废弃 grid 声明，保留的非表单结构轨均有
    证据化 allowlist。项目入口四行和其他真实业务字段不再通过页面 CSS 自造标签列。
  - adoption 审计不再相信声明字符串：严格核 Project/App/connectors/DataMode 路由控制流，并只沿真实
    render return、render-prop、map/flatMap、本地 helper、返回变量及 `useMemo` 追踪 owner；dead local、
    字面量或稳定 `const`/别名/取反链形成的 dead branch、提前 return/throw 和伪 dispatcher 均有反例测试；
    Inspector portal/ref 证据同样只接受 live branch，遇绑定写入即取消静态常量判定。
- 运行命令:
  - `pnpm --filter @type-pal/editor exec vitest run src/ui/design-system/field-layout-adoption.test.ts src/ui/design-system/adoption.test.ts src/ui/design-system/recipes.test.tsx src/ui/EntityPageAnimationEditor.test.tsx src/ui/design-system/boundary.test.ts src/ui/App.reference-navigation.test.tsx src/ui/editor-navigation.test.ts`：
    **7 files / 132 tests passed**（最终 P1 返工后复跑，15.44s）。
  - `pnpm typecheck`：passed。
  - `pnpm audit:design-system`：passed（87 files；2 条证据化 exception）。
  - `pnpm build`：passed（仅既有 chunk-size warning）。
  - `git diff --check`：passed。
- 浏览器 / 手工检查: PAL 入口页与 Design Lab RF23 已做 1280/900/720/640 宽度的最小功能性验证；
  480px 容器实测 `96px 372px`，479px 实测单列，Inspector 实测 `60px 1114px`，页面横向 overflow=0。
- 跳过的检查及原因: 不再重复跑 editor 全量。此前本切片已发生四次全量尝试：首次 164/166 files、
  1329/1331 tests（Entity draft 并发波动 + adoption timeout）；第二次误重复为 164/166 files、
  1331/1335 tests（4 个门禁/快照问题均随后聚焦修复）；只读压力审查又误触全量为 1334/1335 tests，
  唯一 Entity draft 并发波动已隔离复跑 3/3 通过；随后一次命令参数透传失误又触发 165/166 files、
  1335/1336 tests，仍只剩同一 Entity draft 并发断言波动。为遵守“最终全量只跑一次”，收口只运行受影响
  的最终聚焦矩阵，不再用重复全量掩盖证据。

### 2026-08-29 NumberField 联动返工

- Enemy、Actor、BattleField、Skill、Item、Project Startup 等主表单短数字迁入公共
  `DsNumberField / DsDraftNumberField / DsNumberFieldGrid`；控件壳固定 10rem，集合由 12rem
  `auto-fit/minmax` 随容器分列，移除对应页面私有数字 grid/断点。
- `field-layout-adoption.json`、真实 route `design-system-adoption.json` 与 CSS census 已按当前生产 DOM/CSS
  刷新；LevelCurve 已从 FieldGroup owner 准确转为 NumberFieldGrid owner，Project inventory 例外类名同步。
- 返工聚焦验证：`field-layout-adoption.test.ts` **7/7 passed**，`adoption.test.ts` **20/20 passed**；
  NumberField 最终矩阵 **15 files / 250 tests passed**，editor typecheck 与 design-system audit 通过。

### 2026-08-29 效果卡层级第三轮返工

- 新增领域共享 `EffectEditorChain / EffectEditorCard`，迁移六族 route-live 消费者：Item use 20 kind +
  author-private、throw 7、equipment 9、Skill base 18、execution 18、Actor casualty 2；业务 mutation、draft、
  preview 与 canonical schema owner 保持在原宿主，不新增兼容层。
- 卡片统一为“父头（效果序号、类型、排序/删除）→ body（依赖参数、可选 preview）”。overlay grip 的 rail
  只覆盖标题行；宽屏与窄屏实测手柄中心相对 header/title 为 **0px**。Item 普通字段恢复 auto-fit，只有显式
  `.item-effect-field-wide` 跨列；三个动作统一 compact 命中区。
- 六族 reorder key 改为 JSON 语义 identity，并在真实深拷贝命令路径调用 move/remove/retain；覆盖重复项删除、
  下一项→上一项→添加按钮焦点，以及非首卡切换独占效果后保留该卡 key 与类型焦点。
- 新增独立 `effect-card-adoption.json`、双向 production census 与按 `EffectEditorChain` 子树作用域验证；错误
  callsite key、缺 identity/remove/retain、丢 full-span、手柄回到整卡 50% 或动作尺寸漂移均使 gate 转红，
  不再接受同文件另一条链掩盖违规。
- 只读终审发现并关闭 321–520px 中间断点：类型换到第二行后，rail 改按标题行的 compact 动作高度计算，
  不再沿用第二行 default 类型控件高度；adoption 新增专用断点负例，恢复旧公式会明确转红。
- Kimi review counter 最小返工已完成：`EDITOR_DESIGN_SYSTEM_VERSION`、CSS `--ds-version` 与 boundary
  规范断言统一升级为 `2.19.0`，并同步断言 ED-FIELD-LAYOUT-1 的 v2.14.0 / v2.19.0 双版本归属；复跑
  `boundary / effect-card-adoption / EffectEditorCard` **3 files / 54 tests passed**。等待 Kimi 复核后把原
  counter 更新为 fresh accept。
- 最终聚焦：`EffectEditorCard / ItemUseEffectEditor / SkillTab / ItemTab / CasualtyEditor / reorder /
  effect-card-adoption / boundary` **8 files / 131 tests passed**；editor typecheck passed；Vite production build
  passed（仅既有 chunk-size warning）。主设计系统 gate 仅剩当前工作树中另外三条既有 owner 登记债：
  `actor/workspace DsDraftNumberInput`、`item/item DsDraftNumberInput`、`battle/skill DsDraftTextInput`；本卡
  effect-card gate 无报错，不在本卡越界修改上述独立 WIP。
- 用户末轮小修：默认“效果参数”改为视觉隐藏但继续作为 body 的 `aria-labelledby` 读屏标题，自定义
  “脚本内容”等领域标题仍可见；`SkillAnimationEditor` 的字段网格由底部对齐改为顶部对齐，让“特效号 / 落点”
  的标签和控件起点一致、help 只向下延伸；投掷“法术特效演出”由分离标题 + 添加/移除按钮收敛为左侧单一
  `DsSwitch`，沿用 optional presentation 的单命令与 undo 语义，不改 schema。
- 小修最终验证：`EffectEditorCard / ItemTab / effect-card-adoption / boundary` **4 files / 71 tests passed**；
  editor typecheck passed；`git diff --check` passed。

## 视觉验证记录

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: 本地浏览器打开 PAL 项目入口页和 Design Lab RF23；调整 viewport/容器宽度并读取实际
  grid-template-columns、scrollWidth/clientWidth，检查滚动、长标签、Inspector portal 与窄宽 stacked。
- 集中 E2E 用例 / 批次: N/A
- 截图 / 像素检查路径:
  - `/tmp/type-pal-ed-field-layout-1280.png`
  - `/tmp/type-pal-ed-field-layout-900.png`
  - `/tmp/type-pal-ed-field-layout-720.png`
  - `/tmp/type-pal-ed-field-layout-640-fixed.png`
  - `/tmp/type-pal-ed-field-layout-rf23.png`
- 结论: 主工作区同组控件起点一致；480/479 边界、Inspector 60px 命名例外、窄宽 stacked 和无横向
  溢出均符合合同。功能性焦点/滚动/overlay 未见新增阻断。
- 返工补验: Design Lab RF25 在 1280/900/720/480/320px 为 6/4/3/2/1 列，控件壳 160px 且无横向
  overflow；Enemy 等主表单消费同一公共 recipe。原 short-number 反例已闭合。
- 物品补验: PAL → 物品 → 金刚符。1920px 工作区中目标/规则/菜单与状态/回合按容器自动双列，回合
  stepper 保持 160px；1000px 工作区自动单列，`scrollWidth - clientWidth = 0`。身份信息中名称仍可编辑，
  稳定 ID 为普通只读行，旧 `.item-readonly-field` 数量为 0。
- 效果卡第三轮补验: PAL → 物品 → 金刚符真实页面。1280px / 卡宽 556px 的单行父头，手柄对 header/title
  中线偏差均为 0px；1200px / 卡宽 476px 的中间断点，类型换到第二行但动作仍在标题行，手柄对标题中线偏差
  0px；1040px / 卡宽 316px 的三层窄卡，手柄对标题中线偏差仍为 0px。三档页面与卡片
  `scrollWidth - clientWidth` 均为 0，临时 viewport 已恢复。
- 末轮小修补验：PAL → 物品 → 无影毒。556px 双列下“特效号 / 落点”label top 与 control top 差均为 0px，
  help 在控件下方；900/720/520px 单列均无页面横向溢出。演出 subhead 只有一个“法术特效演出”switch，
  与容器左缘差 0px；可见“效果参数”计数 0，隐藏语义标题仍存在。临时 viewport 已恢复。
- 未完成项: 无。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 当前说明：以下旧 Codex / Kimi / GLM 结论均属于第三轮 counter 之前的候选，现统一为 historical；第三轮
  六族共享效果卡实现已完成，fresh review 以紧随其后的当前签字表为准。

### 第三轮当前 review 签字

| Agent | 当前实现审查 | 结论 |
|---|---|---|
| Codex | **re-accept（2026-08-29，Kimi counter 返工后）**：六族共享 owner、稳定 identity/remove/retain、作用域 adoption 负例、131 tests、typecheck、build 与 1280/1200/1040/520/320 几何证据均闭合；另将代码常量、CSS token、规范/boundary 统一为 v2.19.0，counter 聚焦复跑 3 files / 54 tests 全绿。主 gate 三条红项属于其他已存在 owner 登记债，本卡无红项。 | accept |
| Kimi | **fresh accept（2026-08-29，counter 返工复核后更新；原 counter 及功能面核验保留见下）**。版本同步复核：①`index.ts:13 EDITOR_DESIGN_SYSTEM_VERSION = '2.19.0'` ✓；②`tokens.css:4 --ds-version: "2.19.0"` ✓；③规范文档 `Status: implemented v2.19.0 effect editor card hierarchy` ✓；④boundary.test.ts:405-407 断言同步 2.19.0 ✓——四向一致（本人 grep 逐项核对）。复跑：`boundary.test.ts` **50/50 全绿**（本人独立执行，原红断言已转绿）；`boundary + effect-card-adoption` 52/52 全绿（Codex 口径 3 files / 54 tests 含其第三文件，本席两文件证据已覆盖 counter 根因）。**counter 关闭**：功能面维持原核验结论——六族共用 `ui/EffectEditorCard.tsx`（ItemUseEffectEditor:1222/1751、ItemTab:1665、SkillTab:764/1306、CasualtyEditor:523）；DsReorderItem `as="li" layout="overlay"`、header 持标题/类型/actions、body 独立 `aria-labelledby` 分组、空参数不空白；editor.css:9049-9063 rail `inset-block-start:0` 标题行对齐（双密度 + 321-520px 断点 :9208-9212）；Chain `remove`(:78-88) 三级焦点恢复 + 链级播报(:101-103)；此前复跑 8 中 7 文件全绿。无返工项。 | accept |
| GLM | **accept（2026-08-29，第三轮当前候选只读终审，本人一手直读组件/registry/门禁 + 独立复跑，非代理；未复用任何历史 accept）**：①**六族 census 独立复算一致**——`EffectEditorChain/Card` 生产消费恰四文件六链：item/use + item/throw（ItemUseEffectEditor:1222/:1428）、item/equipment（ItemTab:1665）、skill/base + skill/execution（SkillTab:764/:1306）、actor/casualty（CasualtyEditor:523）；registry `effect-card-adoption.json` 六 family 逐条对上，且 kind 完备性含本人上轮枚举未入 EffectFields 的 `dieIfNotPoisoned/levelUp/placeEntityInFront`（20 kinds，与文件 26 处 case 全覆盖含私有脚本分支 `privateBranch: true`）——**G3-1 闭包达成且比我枚举更完整**。②**稳定 occurrence key** ✓——`useDsReorderKeys(use.effects, e => JSON.stringify(e))`（:1115/:1726）editor-local occurrence token，卡 `itemKey={props.itemKey}`（EffectEditorCard:136）。③**move/remove/retain 焦点** ✓——Chain 持久 owner（:51-107）：remove 后 nextKey→previousKey→添加按钮三级恢复（:78-88 `closest [data-ds-reorder-item]` 的 sibling key），polite 播报挂在链级（卡片卸载后仍存活 :101-103）；move 按钮与手柄共享 itemKey。④**门禁负例四类** ✓——effect-card-adoption.test:32-60：缺 owner（LegacyEffectCard 替换必红）、错 itemKey、**手柄错位**（compact token 替换为 default 必红——`inset-block-start:0 + block-size` header 对齐而非 50% 中线，editor.css:9049-9062 双密度 + 520/320 容器两档）、**丢 full-span**（`grid-column:1/-1` 删除必红）；kind 完备 + 双向 route-live（:14-30）。⑤**独立复跑**：effect-card-adoption + ItemUseEffectEditor + SkillTab + CasualtyEditor + ItemTab → **5 files / 56 tests 全绿**（本席执行）。无返工项。 | accept |
- 审查结论:
  - Codex：**current accept（2026-08-29，物品字段二次返工候选）**。`ItemUseEffectEditor` 的使用/投掷
    效果统一为 default `DsRepeatRow` 与完整 `DsFieldGroup`；目标/规则/菜单和效果参数由容器驱动的有界
    auto-fit 网格排列，NumberField 继续保持公共 `10rem`。`ItemTab` 的名称改用标准字段组，稳定 ID 改用
    `DsReadoutList/Row + DsOverflowText`，不再伪装成等宽输入框。聚焦组件测试、字段/边界/排序/截断门禁、
    typecheck 与设计系统审计通过；最终 editor 全量唯一失败是 registry 仍把已迁入 FieldGroup 的 NumberField
    标成旧 `none` context（其余 173 files / 1421 tests 通过），修正登记后聚焦 gate 4/4 通过。1920px 宽
    工作区自动双列，1000px 窄工作区自动单列且页面横向溢出为 0。
  - Codex：**current accept（2026-08-29）**。三条用户返工项均已由 ED-NUMBER-FIELD-1 公共实现、真实页面
    adoption 与门禁闭合；未以逐页 CSS 补丁处理。
  - Codex：**accept（2026-08-28）**。实现、聚焦测试、typecheck、build、动态审计与最小浏览器几何证据均
    已闭合；未改 schema/runtime/project 内容，未混入 `stash@{0}` 的 Catalog Row WIP。
  - Codex 并行只读压力审查（不代替 Kimi/GLM 签名）：先后发现路由死分支、DataMode 提前 exit、App
    allowlist else 分支、owner dead JSX、静态 helper/prop、伪 render-prop consumer 与跨模块 AST 归属假绿，
    以及 Inspector 稳定 `const` dead branch 伪造 portal/ref 证据，均补反例并修复；三路最终只读对抗复核
    均确认无剩余 P0/P1。内部只读复核不冒充 Kimi/GLM 签名；当前生产 census 无漏项。
  - Kimi：**current accept（2026-08-29，物品字段二次返工候选只读终审，本人独立直读实现 / CSS /
    聚焦复跑；historical accept（2026-08-28）见"进入 done 前"，仅作历史未复用）**:
    1. **反例一（使用能力混用密度 / 等分拉满）收口 ✓**:`ItemUseEffectEditor.tsx:1321,1797`
       使用 / 投掷链统一 `DsRepeatRow density="default"`,行头类型 `DsSelect` 无 size（默认
       default,:1330-1337),排序 / 删除为公共动作按钮;`.item-effect-grid`(editor.css:
       9940-9947)`repeat(auto-fit, minmax(min(100%, 14rem), 28rem))` 容器驱动有界分列,
       替代页面私有等分;EffectFields 走 `DsFieldGroup`(:263-374),NumberField 保持公共
       10rem;残留 `size="compact"` 抽查均为合法紧凑语境（:404-411 `item-amount-row` 行内
       composer、:1397 集合动作按钮),主表单无 compact/default 混用。
    2. **反例二（稳定 ID 伪装输入框）收口 ✓**:`ItemTab.tsx:1512-1522`——名称进标准
       `DsFieldGroup` 编辑字段(:1517);稳定 ID 改 `DsReadoutList > DsReadoutRow[label="稳定
       ID"] > DsOverflowText[as="code"]{item.id}`(:1518-1521)——只读行 + 完整值 overflow
       reveal,不再伪装半卡宽禁用输入框;信息主次（名称可编辑 / ID 只读）直观。
    3. **既有合同零回流 ✓**: 96px 主轨 / <480px stacked / Inspector 60px 例外未动
       (field-layout-adoption 7/7 本人复跑);NumberField adoption 登记已由旧 `none` context
       刷新为 field-group(Codex 全量唯一红项的修正,聚焦 4/4);1920px 自动双列 / 1000px
       自动单列且横向溢出 0 的浏览器证据登记,符合最小视觉验证分层。
    4. **复跑证据**: 本人聚焦 4 文件(ItemTab / ItemUseEffectEditor / field-layout-adoption /
       number-field-adoption)**39/39 全绿**。
  - 无返工项。用户复验通过前不得标记 done。
  - GLM：**current accept（2026-08-29，物品字段二次返工候选）**。当前签字与一手证据见上方
    “用户返工后的当前审查签字”：稳定 ID 只读行、use/throw 完整字段组与有界 auto-fit、现有 96px / <480px /
    Inspector 合同均闭合，独立复跑 3 files / 74 tests 全绿；旧候选 accept 仅作历史，未复用。
- 必须返工项:
  1. ~~Enemy 主表单短数字不得整行拉伸；真实消费公共 measure/NumberField recipe。~~ 已完成。
  2. ~~门禁必须验证 short-number 的真实页面采用，不能只检查 token/recipe 存在。~~ 已完成。
  3. ~~新增 affordance / inputMode / wheel / auto-fit / 全局 numeric adoption 由 `ED-NUMBER-FIELD-1` 新三签授权。~~
     新卡 build 三签齐后实现完成。
- Accept / rework: **done（2026-08-29 三方 fresh accept + 用户末轮小修直接验收通过）。**

## 用户验收

- 历史结论: **rework（2026-08-29）**。Enemy 数值输入超长且没有按宽度自动分列；已由
  `ED-NUMBER-FIELD-1-editor-number-control-and-responsive-density.md` 公共收口。
- 当前结论: **rework（2026-08-29）**。物品使用效果区仍存在混合尺寸、短字段等分拉满与布局松散；身份信息
  的名称 / 稳定 ID 仍机械等宽且把只读 ID 伪装成输入框。
- 第三轮结论: **rework（2026-08-29）**。效果类型与依赖参数仍缺少父子层级，排序手柄视觉上落入参数行；
  上一候选三方 current accept 转历史。
- 当前复验: **通过（2026-08-29）**。用户明确裁决末轮冗余标题、动画字段对齐和演出单开关均按小修处理，
  修复完成后直接通过、免 Kimi / GLM 重复签字；既有三方 fresh accept 保留为功能候选审查证据。

## 交接日志

- 2026-08-29 Codex：按用户末轮小修裁决隐藏默认“效果参数”视觉标题、修正 SkillAnimation 字段顶部对齐，
  并把投掷演出收敛为左侧单一 `DsSwitch`；71 tests、typecheck 与真实页面宽/窄几何验证通过。用户明确免重复
  签字并直接验收，本卡转 done。无下一位 Agent 提示词。

- 2026-08-29 Kimi: counter 返工复核。grep 逐项核四向版本一致: `index.ts:13` '2.19.0' /
  `tokens.css:4` "2.19.0" / 文档 `Status: implemented v2.19.0` / boundary.test.ts:405-407 断言
  2.19.0;复跑 `boundary.test.ts` **50/50 全绿**(原红断言转绿)、`boundary + effect-card-
  adoption` 52/52 全绿。counter 关闭,签字表更新为 **fresh accept**(功能面维持原核验:
  六族同卡 / overlay 手柄标题行对齐 / 命名分组 / 删除焦点链)。三方 review accept 齐,准入
  更新为仅待用户复验;未修改实现文件。Next: 用户只复验效果卡父头 / 参数子区 / 手柄中线 /
  窄宽换层后收口。

- 2026-08-29 Kimi: 第三轮当前候选只读终审。功能面全部核验通过（六族同卡 / overlay 手柄标题行
  对齐 + 双密度与 321-520px 断点 / header-body 命名分组 / 空参数不空白 / Chain 删除焦点三级
  恢复 + 链级播报;复跑 8 中 7 文件全绿)。**counter 一项(DS-G.4 版本四向同步不完整)**:
  文档已 v2.19.0,`index.ts:13` 与 `tokens.css:4` 仍 2.18.0,boundary.test.ts:405-407 断言
  2.18.0 与文档冲突——本人复跑 boundary.test.ts 实测红。最小返工: 三处升 2.19.0 + boundary
  复跑绿后转 accept,无需重审其他面。未修改实现文件;任务保持 review。Next: Codex 修版本
  同步 -> Kimi/GLM 确认 -> 用户复验。

- 2026-08-29 Codex：实施入口 machine census 修正 GLM 的旧“17 臂”快照：canonical use=20 kind / 19 render
  arms + author-private，并发现 `item/equipment-effects` 与 `actor/casualty-effects` 两个同型 route-live 消费者；
  全生产闭包为六族。依据已签 G3-1 全部纳入迁移，不 defer；核心 premise / before-after 未变，fresh design 三签
  继续有效。未改实现文件，现进入 Codex build。

- 2026-08-29 GLM: 第三次返工 fresh 设计审查。独立枚举全部动态分支：use=EffectFields 17 臂（无空 return，
  最少的 runSceneHook 也渲染只读说明）、throw=ThrowEffectFields 7 臂、私有脚本 ItemPrivateScriptBodyEditor
  分支（两处消费）、Skill 私有 SkillEffectCard+preview 先例——三套结构漂移实锤；单 DsRepeatRow 表面 +
  reorder.css:13-27 rail 50% 中线直读确认截图反例根因。签 premise verified + design agree（附 G3-1
  对称 census 闭包 / G3-2 类型切换只替换子区 / G3-3 无参·full-span·嵌套·长名矩阵 / G3-4 防假绿四反例）。
  未修改实现，未代签 Kimi。Next: Kimi fresh 签字后三签齐放行 build。

- 2026-08-29 Codex：根据用户截图完成第三轮只读根因审计；确认 use/throw 的 `DsRepeatRow` 单表面与
  `DsReorderItem` inline rail 整卡垂直居中共同抹平了“类型父级 -> 参数子级”。卡转 rework，上一候选三方
  accept 转历史；补共享语义化 EffectEditorCard、全分支 census、响应式与焦点合同。未修改实现文件；等待
  Kimi + GLM fresh design 签字。

- 2026-08-29 Kimi: 第三轮（物品效果依赖层级）fresh 设计审查。直读 `ItemUseEffectEditor.tsx:1321-1385`
  (行头与参数区同 DsRepeatRow 无层级表面)、`reorder.css:13-23`(rail 50% 垂直居中根因)、
  `SkillTab.tsx:708-770`(SkillEffectCard 正确结构先例但业务私有、无手柄槽)、`reorder.tsx:1159-1237`
  (DsReorderItem 内部固定 rail+handle,**已有 `layout='inline'|'overlay'`** 与
  `reorder.css:100-108` overlay 顶部对齐规则)——header-aligned 手柄用既有 overlay API 即可,
  不动 reorder 公共合同。签 fresh premise verified + design agree,附 K-L1(共享边界不进
  design-system)/ K-L2(overlay 手柄,inline 50% 规则不动)/ K-L3(子区命名与无参数不空白)/
  K-L4(切换焦点与删除焦点链)/ K-L5(Item default / Skill compact 对称,全分支同卡)/
  K-L6(防假绿含手柄中线反例)六钉。GLM 未签,build 准入维持 blocked;未修改实现文件。
  Next: GLM fresh 签字;三签齐后 Codex build。

- 2026-08-29 Kimi: 物品字段二次返工候选 done 前只读终审。直读 `ItemUseEffectEditor.tsx:1321,1797`
  (DsRepeatRow density="default" 统一 + 行头 default DsSelect + 公共动作按钮;残留 compact 抽查
  均为合法紧凑语境)、`editor.css:9940-9947`(.item-effect-grid auto-fit minmax(14rem,28rem)
  替代私有等分)、`ItemTab.tsx:1512-1522`(名称标准字段组 + 稳定 ID DsReadoutList/Row +
  DsOverflowText 只读行);复跑 4 文件 **39/39 全绿**(含 field-layout-adoption 7/7 既有合同
  零回流)。签 **current accept**,无返工项,未复用 historical,未修改实现文件。三方 current
  accept 齐(GLM 已签),准入维持待用户复验。Next: 用户按宽 / 窄工作区复验后收口。

- 2026-08-29 Codex：完成物品字段二次返工。`ItemUseEffectEditor` 删除主表单零散 compact 与 viewport
  布局，使用/投掷链统一 default RepeatRow、完整字段组与有界 auto-fit；`ItemTab` 名称使用标准字段，稳定
  ID 使用只读行。聚焦 26/26、门禁 72/72、typecheck、设计系统审计通过；浏览器在 1920px 自动双列、
  1000px 自动单列且无横向溢出。editor 最终全量仅暴露 NumberField adoption 的旧 context 登记（其余
  173 files / 1421 tests 通过），登记由 `none` 刷新为 `field-group` 后聚焦 4/4 通过，未重复跑全量。卡保持
  review，Codex current accept；等待 Kimi + GLM 当前候选终审及用户复验。

- 2026-08-29 Codex：ED-NUMBER-FIELD-1 已完成公共 10rem stepper、12rem auto-fit grid、36 文件 / 111
  leaf adoption 门禁与代表页面迁移；Enemy short-number 不再整行拉伸，field-layout registry/CSS census/route
  owner 已刷新，聚焦 7/7 + 20/20 与浏览器多宽度证据通过。本卡由 rework 转 review，Codex current accept；
  等待 Kimi + GLM 重签及用户复验。

- 2026-08-29 Kimi: 当前返工候选 done 前只读终审。既有 96px / <480px stacked / Inspector 60px 合同
  零破坏(field-layout-adoption 7/7 本人复跑);Enemy 反例由公共 `DsNumberFieldGrid` + 10rem
  NumberField 收口(EnemyTab.tsx:46,64,876;recipes.css:888-896;primitives.css:597-601),非页面
  私修;registry 同步真值(node 复算 36/111 闭合,EnemyTab 自身证据);复跑 5 文件 75/75 全绿。
  签 **accept**,无返工项,未复用 2026-08-28 旧 accept,未修改实现文件。准入更新为待 GLM + 用户
  复验。Next: GLM 重签 -> 用户复验收口。

- 2026-08-29 Codex：依据用户截图复核 Enemy 路径，确认其已是 `DsDraftNumberInput`，但公共全宽输入、隐藏
  spinner、无列 `.enemy-stat-grid` 与缺失 `DsFieldMeasure` 共同造成反例；本卡转 rework。全局只读 census 为
  36 个业务文件 / 111 个数字调用点，新增公共行为另开 `ED-NUMBER-FIELD-1` 走新三签。未修改实现文件。

- 2026-08-28 Codex：完成公共 96px/480px field group、Inspector 60px 命名例外、全生产 CSS census、
  真实路由/render 可达 adoption 门禁及页面迁移。最终聚焦 7 files / 132 tests、typecheck、build、
  design-system gate 全绿；浏览器几何证据闭合。最终只读对抗复核发现并关闭 Inspector 稳定 const dead
  evidence P1，复跑 7 files / 132 tests 通过。卡保持 review，Codex accept；等待 Kimi + GLM done 前终签。

- 2026-08-28 Codex：核对卡面确认 Codex + Kimi（KL1-KL4）+ GLM（FL1-FL3）build 三签仍有效，无
  counter / 阻塞 unknown。前置 Add Picker 已以 `0787197d` 单独提交并推送；未终审 Catalog Row WIP 没有混提，
  已可恢复隔离为 `stash@{0}`。本卡转 active build，先执行动态 census + 红测试，再实现公共 owner。

- 2026-08-27 GLM: 完成独立审查并签 premise verified + design agree（附 FL1 census 产物化与分类轴
  冻结 / FL2 adoption 真值化 + boundary 补 96px/480px 断言 / FL3 测试矩阵含双轨负例）。一手实锤：
  .field 60px vs .project-field-grid .field 72px 同页分裂（特异性分析证明结构性）、双重规范违反
  （:194 对齐 + DS-L.7 96px/480px）、adoption 虚报 DsField、boundary 零 96px/480px 断言；独立
  census 51→25 条 label 轨候选 + 3 条死规则 + .music-meta-row 动态引用疑点。核验发现 Kimi
  （KL1-KL4）已同窗口签回，三签齐互证互补（KL1 container query / KL2-KL3 ↔ FL2 / KL4 ↔ FL3），
  准入 allowed，状态转 build。未修改实现，未代签 Kimi。
- 2026-08-27 Kimi：独立直读同页双轨（`.field` 60px / `.project-field-grid` 72px）、规范 DS-L.7/DS-F.4
  原文、adoption 登记与真实 JSX 的不一致、公共组件 inline 逐行 auto 轨与 Inspector 60px 紧凑语法；
  签 premise verified + design agree（附 KL1-KL4），完成独立反证。未修改实现文件，未代签 GLM。
  Next: GLM 核 census/门禁/测试矩阵并签字。
- 2026-08-27 Codex：完成规范、真实页面、公共组件、采用矩阵和业务 CSS 的只读审计；定位同页 60/72px
  分裂及 20 条 live 私有轨基线，创建独立横切任务卡。未修改实现文件。Evidence: 前提真值门与代码锚点。
  Next: Kimi + GLM 独立核真值并签 design；三签齐后 Codex build。

## 下一位 Agent 提示词

无下一位 Agent 提示词；三方 fresh accept、用户验收和末轮小修证据均已闭合，本卡 done。
