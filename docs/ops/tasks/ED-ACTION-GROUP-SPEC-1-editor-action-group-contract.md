# ED-ACTION-GROUP-SPEC-1 - DsActionGroup 公共规范与当前采用闭合

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
Target Design-System Version: `2.22.0`

## 目标

把已经在生产界面使用的 `DsActionGroup` 从“只有代码注释与零散测试的公共 recipe”提升为正式设计系统合同，
并让当前 8 个采用点全部符合该合同：同一对象的离散命令保持不可拆、表达方式一致，default 图标动作固定
36×36px、compact 图标动作固定 32×32px，文字动作只冻结相应最小宽高；窄容器只能由父布局让整组换行。
现有 15 个未消费公共组的移动动作 surface 先作为候选逐项分类为 `equivalent-owner | deferred | N/A`，本卡不
预判其全部违规，也不机械迁移全部页面。

## 范围

- 范围内:
  - 新增规范 `DS-C.2a DsActionGroup`，澄清 `DS-F.5` 的纯图标 / 图标加文案 / 纯文案三种同组一致模式。
  - 冻结 `inline-flex + flex:none + nowrap + intrinsic width`、4px gap；图标动作 default 36×36px / compact
    32×32px，文字动作分别只冻结 `min-width/min-height` 36px / 32px。
  - 当前 6 个生产文件 / 8 个 `DsActionGroup` 调用的采用闭合与静态 census。
  - `CommandForm` 两处现存混组修复：字段控件离开动作组、数字输入获得独立可访问名称、删除统一为
    danger `DsIconButton`；Shop 删除按钮移除冗余 `size` 双 owner。
  - 炼化页唯一配方 / 奖励行的 disabled 删除提供邻近可读原因，不能只留下不可聚焦的禁用图标。
  - 新建 `action-group-adoption.json`：8 adopted + 15 candidate surfaces；逐项分类 equivalent owner、
    deferred 或 N/A，并以生产 AST 双向闭合。
  - Design Lab `RF-27`、版本四处、规范 Owner/Status 与 boundary/组件/业务测试同步。
- 范围外:
  - 不迁移 15 个候选私有移动动作 surface；只有本卡证据判为 deferred 的项才进入后续
    `ED-ACTION-GROUP-ADOPTION-1`。
  - 不修改 reorder pointer/keyboard/click 状态机、identity、命令或 history。
  - 不给 wrapper 增加 `role="toolbar"`、roving tabindex、方向键模型或无证据的 `role="group"`。
  - 不改变 schema、项目数据、存档、Command 数量或字段提交语义。
- 明确不做:
  - 不把 ActionGroup 伪装成表单字段组、toolbar、导航组或 `DsInlineComposer`。
  - 不允许业务 CSS 缩小命中区、拆按钮、改顺序、隐藏单项或用 overflow 裁掉 focus ring。

## 前提真值门

### 一句话行为 / 工程前提

`DsActionGroup` 已有公共实现、8 个生产采用点和 default/compact 尺寸行为，但规范正文零具名登记；若只补
版本文案会把两个不合规 CommandForm 采用与 15 个未分类移动动作 surface 继续藏在规范外，因此本卡必须同时
冻结公共合同、闭合当前 adopted 集并显式分类候选 owner，不能把“未使用 DsActionGroup”直接等同于违规，也
不能宣称“全量迁移已完成”。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：纯二阶段作者工具布局，不涉及原版游戏行为。 | `docs/phase2/READ-FIRST.md:8-21` |
| 第一阶段 | N/A：第一阶段没有当前 Reforge 编辑器设计系统。 | `CLAUDE.md:5-16` |
| 当前二阶段 | 公共组件已经存在；根为 inline-flex/flex:none/max-content，default 图标 36×36、compact 图标 32×32；生产恰 6 files / 8 callsites。规范只有通用尺寸、图标与排序条款，全文零次具名 `DsActionGroup`。 | `packages/editor/src/ui/design-system/recipes.tsx:371-382`；`packages/editor/src/ui/design-system/recipes.css:885-918`；`docs/phase2/editor/editor-design-system-v1.md:179-235,514-554` |
| 本任务目标 | DS 2.22.0 正式登记合同；当前 8 adopted 全符合；15 candidate surfaces 逐项分类且可机器追踪，不在本卡迁移。 | 本卡设计与验收条件；`docs/ops/board.md` |

### 生产 census 直接证据

- 当前 `DsActionGroup`：**6 files / 8 callsites / compact 7 + default 1**。
  - `ActorMode.tsx:1671`
  - `CommandForm.tsx:462,1577`
  - `EnemyTab.tsx:532`
  - `EnemyTeamTab.tsx:459`
  - `ItemAlchemyEditors.tsx:147,296`
  - `ShopTab.tsx:228`
- 8 组中有 16 个 `DsReorderMoveButton`、7 个删除动作；`CommandForm.tsx:462-491` 额外把
  `DsCheckbox + Num` 放进动作组，两个 CommandForm 组均混用纯图标移动与文字删除。
- `Num` helper 不接收 accessible name：`CommandForm.tsx:109-117`；第一处删除仍为 quiet：
  `CommandForm.tsx:479-490`。这些与现行危险动作、图标 accessible name 和同组呈现合同冲突。
- 生产扫描域固定为 `packages/editor/src/ui/**/*.tsx`，排除 `*.test.tsx` 与 `src/design-lab/**`；Design Lab
  的第 9 个 fixture 不计入生产 adopted。
- 另有 **30 个**生产 `DsReorderMoveButton` 未进入 `DsActionGroup`，按当前 DOM owner 组成 **15 个候选
  surface（每个恰两枚）**：
  `CasualtyEditor.tsx:307,455`、`CutsceneTab.tsx:1089-1115`、`EffectEditorCard.tsx:158`、
  `FrameAnimationEditor.tsx:154`、`LayerStackControls.tsx:169`、`PoisonTab.tsx:148`、
  `ProjectWorkbenchTab.tsx:1305,1533,1978`、`ScriptEditor.tsx:221,996`、`ScriptTree.tsx:548`、
  `SpriteActionEditor.tsx:318,497`。
- 历史 P2 已把缺口定性为“规范遗漏而非原任务返工”：
  `docs/ops/tasks/ED-REORDER-SURFACE-1-editor-reorder-item-surface-contract.md:470-471`。

### 反证与替代解释

- 最强替代解释 A：只补规范、版本和已有 boundary，不动生产。否决原因：可关闭最初 P2，却会把
  CommandForm 非动作 children、无名数字输入、quiet 删除和同组模式混用写成“已符合”，与现行 MUST 冲突。
- 最强替代解释 B：本卡迁移全部 15 个 candidate surface。否决原因：这些点分布在 casualty/cutscene/effect/
  timeline/layer/project/script/sprite 多个布局族，父容器降级真值不同；机械包进公共 span 会制造跨页视觉风险，
  超出“规范登记与当前采用闭合”。
- 最强替代解释 C：把组件降为 reorder 私有 helper，只登记在 DS-C.4d。当前 8 个生产采用确实全部位于
  reorder collection，此解释有证据；但组件已作为 design-system recipe 导出、由炼化/商店/命令等多个领域使用，
  且合同内容属于通用的同项动作几何。若未来要宣称 toolbar/form 通用能力，必须另证，不在本卡预埋。
- 什么观察会推翻当前前提:
  - 若 AST 复算不是 8 adopted / 30 raw move buttons / 15 candidate surfaces，必须更新 census 后重签，
    不得手调数字；新增单枚 raw move button 同样必须红，不能只按“完整 pair”计数而漏网。
  - 若任一 adopted 真实需要字段控件与命令作为不可拆同组，`CommandForm` 拆分方案失效，需用户产品裁决。
  - 若任一 candidate 已有等价公共/领域原子 owner，不能重复迁移，registry 必须记为
    `equivalent-owner` 或 `N/A` 并附真实证据；例如 EffectEditorCard / ScriptTree 不得预判为 debt。
  - 若 320/720/200% 下整组 relocation 仍令字段或 identity 不可用，本合同的父布局责任不足，任务转 rework。
- audit 红项替代根因排查:
  - runtime 语义 / 命令分类: reorder/Command owner 零改动；问题是布局/可访问性，不是命令分类。
  - 原版 / 第一阶段理解: N/A。
  - extractor / 地图 / 数据解码: N/A。
  - audit / test model: 现有 boundary 只覆盖部分尺寸，确有漏网；不能把“测试绿”当成采用全量合规。

### 用户可见偏离

- 是否主动偏离已核真值: yes（只修正现存设计系统违规，不改变业务命令）
- `before -> after` 一句话: `CommandForm` 的速度 checkbox/数字输入与移动/删除挤在一个动作组、删除表现混杂，
  炼化唯一行的禁用删除没有邻近原因 -> 速度设置成为具名独立字段簇，移动/删除保持纯图标 danger 动作组，
  炼化禁用删除邻近显示“至少保留 1 条”的原因；其它 adopted 页面视觉不变。
- 代表场景: 对话指令“第 N 行”的自定速度 + 数值 + 上移/下移/删除；队伍成员行的移动/删除；炼化页
  唯一配方 / 唯一奖励档位的禁用删除与“至少保留 1 条”原因。
- 用户裁决: **pending**（即使三方设计签字齐，用户批准该 before -> after 前仍不得 build）

## 上下文锚点

- 已拍板决策 / 铁律:
  - 设计系统规范必须对生产界面有效，不能靠用户逐个 input/button 验错。
  - `ED-REORDER-SURFACE-1` 已冻结排序动作在窄宽下整组下沉、compact 至少 32×32px。
  - `ED-ITEM-ALCHEMY-SURFACE-1` 已冻结紫金葫芦 default 动作与 36px NumberField 等高。
- 代码锚点:
  - `packages/editor/src/ui/design-system/recipes.tsx:312-382`
  - `packages/editor/src/ui/design-system/recipes.css:885-918`
  - `packages/editor/src/ui/design-system/tokens.css:47-58`
  - `packages/editor/src/ui/design-system/boundary.test.ts:373-396`
  - `packages/editor/src/ui/design-system/recipes.test.tsx:201-221`
  - `packages/editor/src/design-lab/DesignLab.tsx:962-965,1089-1135`
- 已知坑 / 历史:
  - `05f46e37` 首次引入 compact ActionGroup；`13ed6138` 补齐 default 36px。
  - 现行 `DsReorderMoveButton` 自身以 compact 为独立使用 fallback；default ActionGroup 通过公共后代 CSS
    持有最终几何。本卡不顺手重开 reorder API。
  - 旧 `.shop-stock-actions .mini` 28px 死规则已删除并有零存在门禁，不得重复修复。
- 不得重新引入:
  - 30px 图标动作、组内混高、quiet 删除、无 accessible name 数字输入、内部 flex-wrap、业务尺寸覆盖。
  - 把 wrapper 伪装成 toolbar/roving-focus 交互组件。
- 相关测试:
  - `recipes.test.tsx`
  - `boundary.test.ts`
  - `reorder-surface-adoption.test.ts`
  - `CommandForm` 相关行为测试

## 设计方案

1. 规范新增 `DS-C.2a 同项动作组（v2.22.0）`：
   - `DsActionGroup` 是布局 owner，不拥有 command、disabled、tooltip、业务状态或 toolbar 键盘模型。
   - 只承载同一对象/作用域的离散命令；字段、checkbox、number 不进入组。
   - 同组采用一种表现模式：纯图标、图标 + 文案、纯文案三者之一；纯图标必须有具体 label + tooltip。
   - root 不拆行、不隐藏/重排单项；窄态由父 recipe 把整组移到下一行。
   - default 图标动作固定 36×36px，compact 图标动作固定 32×32px；文字动作只要求相应
     `min-width/min-height`，不得错误锁成方形。30px compact form control 不得扩散到动作命中区。
   - 领域 class 只可放置完整 root（grid-area/column、justify/align self）；不得覆写 gap/wrap/order/尺寸。
2. 公共 CSS 显式写入 `flex-wrap: nowrap`，移除会把 wrapper 夹窄但让固定按钮外伸的 `max-width: 100%`，
   以 intrinsic root 完整包含全部按钮；boundary 锁 root 全部几何、default/compact 的 icon 固定尺寸与 text
   最小尺寸、公共 CSS 唯一 owner与业务层禁止覆盖。
3. `CommandForm`：
   - 对话速度 checkbox + 数字输入移到独立具名 controls wrapper，数字控件得到逐行 accessible name、
     meaningful `name` 与 `autoComplete="off"`。
   - 两个移动按钮 + 删除组成纯图标组；删除使用具体 label/tooltip 的 danger `DsIconButton`。
   - set-party-members 删除同样改 pure-icon danger；业务命令、禁用条件与事件 handler 原样。
4. Shop 删除移除显式 `size="compact"`；ActionGroup density 继续持最终尺寸。其余当前 adopted TSX 零变化。
5. ItemAlchemy 唯一配方 / 奖励行在 disabled 删除按钮附近显示可读保留原因，并以描述关系关联；按钮仍 disabled，
   handler 与最少一条业务规则不变。
6. 新建 `action-group-adoption.json`：8 adopted + 15 candidate surfaces。生产 AST 扫描域精确限定为
   `packages/editor/src/ui/**/*.tsx`（排除 tests 与 Design Lab），双向枚举全部 8 group 与全部 46 move buttons：
   16 枚位于 adopted、其余 30 枚必须逐枚归属 15 个 candidate owner 且每 owner 恰两枚；新增单枚也必红。
   拒绝漏登/重复/stale fingerprint、动态或未知 density、spread/alias/namespace、非动作 child、混合模式、
   adopted 直系按钮显式 size。candidate 经证据分类为 equivalent-owner / deferred / N/A；只有 deferred
   需要 removalCondition，本卡不改其生产 DOM。
7. Design Lab 新增独立 `RF-27`：default/compact、2/3 动作、pure-icon/pure-text/icon-text、danger、disabled
   + 邻近原因、长 identity 与 480/320 parent relocation；同时验证 native button、icon-only accessible name +
   tooltip、装饰 SVG hidden、Tab 顺序与逐按钮 focus-visible，不复用 RF-21 双移动按钮冒充完整证据。
8. 规范/index/tokens/boundary 四处升 `2.22.0`，Design Lab 继续从公共常量显示版本。

## 验收条件

- 功能:
  - 8 adopted / 46 move buttons / 15 candidate surfaces census 精确；candidate 逐项有语义 disposition；当前
    adopted 无字段控件、无混合模式、无 direct child size 双 owner。
  - CommandForm handler、disabled、move/remove 顺序和一次命令语义不变；数字输入有 accessible name、name、
    autocomplete 策略；炼化 disabled 删除有邻近可读原因。
  - root 单行不可拆，`group.scrollWidth === group.clientWidth`；所有 button border box 位于 group 内，
    其 4px focus 外扩矩形位于 item / 最近的非裁切 owner 内。父布局不足时整组 relocation，不得裁切 focus ring。
- 测试:
  - root geometry、default/compact icon 固定尺寸 + text 最小尺寸、business override 负例。
  - AST adopted/candidate 双向闭合与额外单枚 raw move、alias/spread/dynamic/non-action/mixed-mode/size
    负例先红后绿。
  - 原生 button、icon-only name + tooltip、SVG hidden、Tab/Enter/Space、focus-visible、disabled reason。
  - recipes、boundary、reorder-surface、CommandForm 聚焦测试；editor typecheck、design-system gate。
  - 受影响包全量只跑一次。
- 文档:
  - DS-C.2a、DS-F.5 模式澄清、RF-27、Owner/Status/Last updated 与版本四处 `2.22.0`。
  - 明写本卡只闭合 8 adopted；15 candidate 的 equivalent/deferred/N/A 分类不得在看板上伪报全部债务或已迁移。
- 视觉 / 手工验证:
  - Design Lab 480/320 与真实 CommandForm 1280/720；记录真实 action-row 容器宽度并确保覆盖 `<520px`
    relocation 分支；未覆盖时必须补真实 320/200% 场景，不能用 generic RF-27 代替业务父布局证据。
  - default icon 36×36、compact icon 32×32、text 只验最小尺寸，同组 top/height 一致；button border box
    位于 group 内，focus 外扩矩形位于 item / 最近非裁切 owner 内；identity/字段保持可用宽度；相关 scroll
    owner 横向溢出 0。
  - 真实 200% zoom 无法可靠触发时必须诚实标记，不得用 pinch/pageScaleFactor 冒充。
- E2E 用例登记: N/A（功能性编辑器界面，开发期最小视觉验证）。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: **verified（2026-08-31）**——直读公共 component/CSS/token/test、8 adopted 与 30 枚 raw move /
    15 candidate production census、历史 P2 与 CommandForm / ItemAlchemy 真实 DOM，确认“纯文档补登即可完成”
    不成立，也确认“未包 ActionGroup = 必须迁移”属于未经逐项核验的过度推断。
  - design: **agree（2026-08-31，推荐上述中间方案）**——只闭合当前 8 adopted，15 candidate 先按
    equivalent-owner / deferred / N/A fail-loud 分类；不机械迁移候选、不新增 toolbar/ARIA role、不改业务
    命令。用户可见 CommandForm + disabled reason before -> after 仍待裁决。
- Kimi:
  - premise: **verified（2026-08-31，本人 rg 独立 census + 逐处 DOM 直读，非复述 Codex）**：
    1. **census 本人复算（限定生产域 `packages/editor/src/ui/**/*.tsx`、排除测试与 design-lab）**:
       `DsActionGroup` 恰 **6 files / 8 callsites / compact 7 + default 1**——CommandForm.tsx:462,1577、
       ItemAlchemyEditors.tsx:147(compact),296(default)、EnemyTab.tsx:532、ShopTab.tsx:228、
       EnemyTeamTab.tsx:459、ActorMode.tsx:1671;`DsReorderMoveButton` 恰 **46 枚**——
       adopted 内 16（CommandForm 4 + ItemAlchemy 4 + EnemyTab 2 + ShopTab 2 + EnemyTeamTab 2 +
       ActorMode 2），外 30 枚按 10 文件恰 **15 个两枚 surface**（CasualtyEditor:307,455、
       CutsceneTab:1089-1115、EffectEditorCard:158、FrameAnimationEditor:154、LayerStackControls:169、
       PoisonTab:148、ProjectWorkbenchTab:1305,1533,1978、ScriptEditor:221,996、ScriptTree:548、
       SpriteActionEditor:318,497）——与卡面逐字一致。
    2. **CommandForm 违规实锤**:cf-dialog-row-actions（:462-491）把 `DsCheckbox`（自定速度，表单控件）
       与条件 `Num` 放进动作组——非动作 children;`Num` helper（:109-117）不传任何
       accessible name/name/autoComplete——无名数字输入;`DsButton variant="quiet" icon="delete"`
       带文字“删除”（:479-490）与两枚纯图标移动同组——quiet 删除 + 表达模式混用;
       cf-party-row-actions（:1577-1588）为纯图标移动 + icon+文字 danger 删除——模式混用。
       另 ShopTab.tsx:239-245 的 `DsIconButton size="compact"` 与父组 density="compact" 构成
       direct-child size 双 owner（DS-F.4 已禁类）。
    3. **ItemAlchemy disabled reason 实锤**:ItemAlchemyEditors.tsx:147 与 :296 的删除均为
       `disabled={rows.length <= 1}` 的 danger 图标按钮，附近无“至少保留 1 条”可读原因——
       违反 DS-C.1“disabled 必须给出原因”。
    4. **组件与规范缺口实锤**:recipes.tsx:371-382 的 root 为
       `inline-flex / flex:none / max-content / max-width:100%`（recipes.css:885-892），
       default 图标 36×36、compact 图标 32×32、文字按钮仅 min 尺寸（:894-918）;
       规范全文零具名 `DsActionGroup`——P2“规范遗漏而非原任务返工”
       （ED-REORDER-SURFACE-1 卡 :470-471）属实。
    5. **candidate 不等同违规的实样**:ProjectWorkbenchTab 的 inventory 行已由
       `.project-inventory-actions` 原子槽持有（ED-REORDER-DRAG-1 收口）;EffectEditorCard header
       动作由 DS-L.7/RF-26 效果卡合同持有;CasualtyEditor 两族由
       `.casualty-gate-actions/.casualty-item-actions` flex 簇持有（editor.css:2851-2855）——
       至少三类候选存在等价原子 owner 证据，机械迁移会双 owner。
    6. **可证伪观察**:任一数字与本人 rg 复算不符（8/46/16/30/15）即重签；任一 candidate 经直读
       证明确无等价 owner 且父布局可安全包组（如 PoisonTab/LayerStackControls 的行尾裸对），
       才够格 deferred;320/720/200% 下 relocation 令字段/identity 不可用则合同父责任不足。
  - design: **agree（2026-08-31，选 B：合同 + 8 adopted 闭合 + 15 candidate 逐项分类；
    附 KA1-KA5 必落钉）**：
    - **KA1（范围 B 钉）**:A（纯文档）会把 :462-491 非动作 children、:109-117 无名输入、
      :479-490 quiet 删除与 :1577-1588 模式混用写成“已符合”，与现行 MUST 正面冲突;
      C（同卡迁移 15）无逐面父布局真值、对 inventory/EffectEditorCard/casualty 已有等价 owner 的
      面制造双 owner。B 是唯一既不伪合规又不伪债务的范围。candidate registry 必须逐项带
      file:line 结构证据:equivalent-owner / deferred(含 removalCondition) / N/A;
      看板不得伪报“15 全债务或已迁移”。
    - **KA2（CommandForm 修复与用户裁决钉）**:checkbox+Num 是字段控件不是同项离散命令,
      拆出为独立具名字段簇且 handler/disabled/一次命令语义不变——属用户可见 before -> after,
      **必须经用户产品裁决方可 build**(卡面已标 pending,任何一方不得代为放行);
      纯图标 danger 组（具体 label/tooltip）是现行 DS-C.2/DS-F.5 唯一一致模式;
      数字输入补 accessible name + name + autoComplete="off";Shop 删 direct-child size。
      更小替代（仅 tooltip 原因）对触屏不可达,不采。
    - **KA3（disabled reason 钉）**:ItemAlchemy 唯一行在 disabled 删除邻近显示“至少保留 1 条”
      并以描述关系关联,handler 与最少一条规则不变;同属 before -> after 需用户裁决。
    - **KA4（公共边界钉）**:wrapper 保持交互中性——不得新增 role=toolbar/group、roving tabindex
      或方向键模型;density 只经公共后代 CSS 冻结按钮**计算几何**,合同约束（无字段、单一模式）
      由 AST 门禁执行,不得虚构“任意 child 自动继承”;root intrinsic containment 必须移除
      `max-width:100%` 并显式 `flex-wrap:nowrap`——现状（recipes.css:891）会把 wrapper 夹窄而
      固定按钮外伸出界;窄态唯一答案是父布局整组 relocation,focus 外扩矩形须落在 item/最近
      非裁切 owner 内（验收条件已钉）。
    - **KA5（版本与门禁比例钉）**:DS-C.2a 属新具名 pattern,DS-G.4 minor(2.22.0)适用,
      2.21.0(done)→2.22.0 顺序成立;RF-27 独立成立（RF-21 的排序焦点覆盖不了纯文案/图标加文案/
      danger/disabled reason/parent relocation）;adoption AST 与既有 gate 家族同密度,不算过度
      设计——**新增单枚 raw move 也必须红**,不得只按完整 pair 计数;Design Lab 第 9 个 fixture
      不计入生产 adopted。
- GLM:
  - premise: pending
  - design: pending
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: Kimi（2026-08-31，完成——本人 rg census + 逐处 DOM/CSS 直读；GLM 席位保留）
  - 独立证据锚点: `rg '<DsActionGroup'` / `rg '<DsReorderMoveButton'`（生产域，排除测试与
    design-lab）;`recipes.tsx:371-382`、`recipes.css:885-918`、`CommandForm.tsx:109-117,462-491,
    1577-1588`、`ItemAlchemyEditors.tsx:147,296`、`ShopTab.tsx:239-245`、`editor.css:2851-2855`、
    `ED-REORDER-SURFACE-1 卡 :470-471`。
  - 可证伪观察: 任一 census 数字与本人 rg 复算不符即重签;任一 candidate 直读证明确有等价
    owner（如 inventory 原子槽/效果卡合同/casualty flex 簇）即不得判 debt,反之（Poison/
    LayerStack 类行尾裸对）才够格 deferred;若移除 max-width 后 root 仍夹窄外伸（320/720 实测），
    intrinsic containment 前提失效转 rework。
- counter / 分歧处理: none（Kimi 选 B 与 Codex 推荐一致；A 伪合规、C 伪债务均已带证据否决。
  用户改变 before -> after 时现有三方 design 签字全部失效，更新方案后必须重签）
- 缺签豁免: N/A
- build 准入结论: **blocked（2026-08-31 Codex + Kimi 已签；缺 GLM premise + design；且用户
  CommandForm + ItemAlchemy disabled reason 两项 before -> after 裁决均 pending）**

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- 用户验收: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

采用“正式合同 + 当前 adopted 闭合 + candidate census”三层方案。它既不把已知违规写成合规，也不预判 15 个
跨页面专用 owner 全部是债务。公共 API 仍只有 `density: 'default' | 'compact'`、children、className；不新增
toolbar role、actionMode prop 或任意尺寸开关。规范的采用义务限定为：没有等价原子 owner 的同项尾随动作簇
必须消费 `DsActionGroup`；有证据的领域 owner 可登记 equivalent/N/A，不制造带着已知 MUST 违规发布的 2.22.0。

### 已知风险

- 风险: action-mode AST 对 conditional/fragment/wrapper 误判。
  - 缓解: fixture 先覆盖真实 `DsReorderMoveButton`、`DsIconButton`、`DsButton` 与条件 disabled；对无法静态
    证明的 wrapper fail-closed，不以字符串 contains 放行。
- 风险: CommandForm controls 拆分改变行高或窄态可用宽度。
  - 缓解: 1280/720 + 480/320 Design Lab/真实页面验证，字段和动作分别有父级布局 owner。
- 风险: candidate 分类把真实 debt 伪装成等价 owner，或 deferred 变成永久豁免。
  - 缓解: 每项必须有 owner/file:line/结构证据；deferred 记录 removalCondition；新增 raw move button（含单枚）
    必红；只有证据化 deferred 才进入后续 adoption 卡。

### 主审立场

- Reviewer: Kimi（公共合同/范围/视觉）+ GLM（census/AST/测试矩阵）
- 结论: pending
- 必改项: pending
- 是否建议进入 build: no（签字与用户裁决未齐）

## Build: 实现与自测

- Coding Owner: Codex（签字门满足后）
- 修改文件: pending
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: pending

## 视觉验证记录

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: pending
- 集中 E2E 用例 / 批次: N/A
- 截图 / 像素检查路径: pending（`.mimosa/evidence/`，禁止提交）
- 结论: pending
- 未完成项: pending

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending（build 前须同时裁决 CommandForm + ItemAlchemy disabled reason 两项
  before -> after；build 后再功能验收）
- 后续任务: `ED-ACTION-GROUP-ADOPTION-1`（仅在本卡逐项分类后仍有真实 deferred 时开卡；数量不得预设）

## 交接日志

- 2026-08-31 Kimi: 独立 census（rg 生产域：6 files / 8 DsActionGroup compact 7+default 1、
  46 枚 move buttons = adopted 16 + 30 枚/15 个两枚 surface，逐 file:line 复核一致）+ 直读
  CommandForm 两处（:462-491 字段控件入组 + :109-117 无名 Num + :479-490 quiet 删除、
  :1577-1588 模式混用）、Shop direct-child size 双 owner、ItemAlchemy disabled 删除无邻近原因、
  recipes.css:885-892 现状 max-width 外伸风险、candidate 三类等价 owner 实样（inventory 原子槽/
  效果卡合同/casualty flex 簇）。签 premise verified + design agree（选 B；附 KA1 范围 / KA2
  CommandForm 修复须用户裁决 / KA3 disabled reason / KA4 公共边界含 intrinsic containment /
  KA5 版本与单枚必红五钉），完成独立反证。未修改实现，未代签 GLM。Next: GLM 核 census/AST/
  测试矩阵；用户对 CommandForm + disabled reason 两项 before -> after 裁决未下前不得 build。
- 2026-08-31 Codex: wide label track 已三方 + 用户验收收口并推送 `98e06c2f`。对下一项 ActionGroup P2
  做三路只读压力审计，确认公共实现与 8 adopted 已存在，但 CommandForm 有两个不合规采用、ItemAlchemy
  disabled reason 缺失，另有 30 枚 raw move buttons / 15 个候选 surface 尚待语义分类。开卡采用中间方案；
  未修改实现。Next: Kimi 独立核前提/三种范围与用户可见风险。

## 下一位 Agent 提示词

```text
审签 ED-ACTION-GROUP-SPEC-1（GLM 席，draft；生产实现只读，只允许更新本任务卡签字/提示词）。

任务卡：docs/ops/tasks/ED-ACTION-GROUP-SPEC-1-editor-action-group-contract.md
当前状态：draft；Codex + Kimi（KA1-KA5，选 B）已签；你的 GLM premise/design 与用户
CommandForm + ItemAlchemy disabled reason 两项 before->after 裁决均 pending。
任何一项未齐不得修改实现、不得转 build。

先读：AGENTS.md、docs/phase2/READ-FIRST.md、editor-design-system-v1.md DS-F.4/DS-F.5/DS-C.2/
DS-C.4d/DS-G.4/RF-21、本卡全文（含 Kimi 签节与独立 census）、recipes.tsx:312-382、
recipes.css:885-918、boundary.test.ts:373-396、CommandForm.tsx:109-117,462-491,1577-1588、
ItemAlchemyEditors.tsx:147,296、ShopTab.tsx:239-245。

你的分工（独立证据，不复述 Codex/Kimi）：
1. 以你自己的扫描方式复算 8 adopted / 46 move buttons / 15 candidate surfaces，并设计
   action-group-adoption.json 的双向 AST 门禁：漏登/重复/stale、alias/spread/dynamic density、
   非动作 child、混合模式、adopted 直系 size、**新增单枚 raw move** 全部必红；
2. 15 candidate 逐项分类的证据审查：equivalent-owner / deferred(含 removalCondition) / N/A
   每项是否带真实 file:line 与 DOM/父布局证据；防止真实 debt 被写成等价 owner，也防止
   deferred 变永久豁免；
3. 测试矩阵：root 几何（nowrap/intrinsic、scrollWidth==clientWidth、按钮 border box 与 4px
   focus 外扩矩形归属）、default 36/compact 32/文字仅最小尺寸、native button/a11y name/
   tooltip/SVG hidden/Tab/Enter/Space、disabled reason 关联、RF-27 与 boundary/recipes/
   reorder-surface/CommandForm 聚焦；
4. CommandForm 与 ItemAlchemy 修复的命令语义零变化核验（handler、disabled、一次命令、
   undo/redo 对称）；
5. 输出 GLM 席 premise verified + design agree，或 counter + file:line/反例。
```
