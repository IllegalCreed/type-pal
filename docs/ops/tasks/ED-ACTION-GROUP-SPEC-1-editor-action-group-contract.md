# ED-ACTION-GROUP-SPEC-1 - DsActionGroup 公共规范与当前采用闭合

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
- 用户裁决: **approved（2026-09-01）**——用户在术语改为真实页面名称后明确回复“批准以上两项调整”，
  同时批准脚本编辑器「对话」指令的字段/动作分离与炼蛊皿/紫金葫芦唯一行禁用原因；业务命令与数据不变。

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
  - premise: **verified（2026-08-31，census 全量本人独立扫描复算 + 违规点/等价 owner/规范与门禁现状
    逐处直读，非复述 Codex/Kimi；与 Kimi rg 复算各自独立取得后逐数收敛）**：
    1. **census 本人复算（生产域 `packages/editor/src/ui/**/*.tsx`，排除 *.test.tsx 与 design-lab）**：
       `<DsActionGroup` 恰 **8 callsites / 6 files**——CommandForm:462,1577（compact×2）、EnemyTab:532、
       ItemAlchemyEditors:147（compact）+296（default）、ActorMode:1671、ShopTab:228、EnemyTeamTab:459，
       **compact 7 + default 1**；`<DsReorderMoveButton` 恰 **46 枚**，按文件 4/4/4/4/2×12——adopted
       六文件的组内按钮恰 16（CommandForm 2 组×2、ItemAlchemy 2 组×2、其余 1 组×2，**无组外孤儿**），
       组外 30 枚按 10 文件恰 **15 个两枚 surface**（ProjectWorkbenchTab 6→3、SpriteAction 4→2、
       ScriptEditor 4→2、Casualty 4→2、其余各 2→1）——**8/46/16/30/15 全数与卡面逐字一致**。
    2. **CommandForm/Shop/炼化违规实锤（本人直读）**：cf-dialog-row-actions（:462-491）内
       `DsCheckbox`（自定速度字段）+ 条件 `Num` + 两枚纯图标移动 + **quiet 带文字「删除」**——
       非动作 child + 模式混用双违规；`Num` helper（:109-117）零 aria-label/name/autoComplete；
       cf-party-row-actions（:1577-1588）纯图标移动 + icon+文字 danger 删除——模式混用；
       ShopTab:239-245 `DsIconButton size="compact"` 叠加父组 `density="compact"`——直系 size
       双 owner；ItemAlchemy:147/:296 删除 `disabled={…length <= 1}` 邻近无可读原因（本席当日
       终审该文件时同一事实）。
    3. **公共实现与规范缺口实锤**：recipes.css:885-892 root 为
       `inline-flex/flex:none/gap 4px/width:max-content/max-width:100%`——**无显式 nowrap**，且
       `max-width:100%` 确会在窄容器把 wrapper 夹窄而固定尺寸按钮外伸（KA4 前提成立）；default
       icon 36（`13ed6138` 本席终审时新增）/ compact icon 32 / 文字仅 min 尺寸；规范全文
       `DsActionGroup` 具名 **0 次**（本人 grep 计数 0）；boundary 现仅锁 per-density 尺寸
       （boundary.test.ts:373-396 直读），root 几何/业务覆盖/adoption 全部缺位——「现有 boundary
       只覆盖部分尺寸」属实；DesignLab fixture 恰 1 处（第 9 个不计入生产，口径成立）。
    4. **candidate 等价 owner 实样复核**：`.project-inventory-actions` 原子槽
       （ProjectWorkbenchTab:1533 + editor.css:1790）、`.casualty-gate-actions/.casualty-item-actions`
       （CasualtyEditor:307,455）、`.effect-editor-card__actions`（EffectEditorCard:159，effect-card
       adoption 合同 owner）——三类等价 owner 实锤，「未包 ActionGroup ≠ 违规、不得机械迁移」
       成立；PoisonTab/LayerStack 类行尾裸对是否 deferred 待 build 期逐项证据。
    5. **P2 历史定性**：ED-REORDER-SURFACE-1 卡 :470-471 原文复核——「规范遗漏而非原任务返工」
       及升 minor 建议 + 28px 死规则卫生项，与本卡承接关系一致。
    6. **可证伪观察**：任一 census 数字（8/46/16/30/15）与复算不符即重签；任一 candidate 直读
       证明有等价 owner 不得判 debt（反之裸对才够格 deferred）；移除 max-width 后 320/720 实测
       root 仍外伸则 intrinsic containment 前提失效转 rework。
  - design: **agree（2026-08-31，选 B；附 GM-A1~GM-A4 必落钉，与 Kimi KA1-KA5 收敛互补）**：
    - **GM-A1（census 双向闭合钉，同 KA5）**：`action-group-adoption.json` AST 门禁双向枚举
      **adopted 8 组 + 全部 46 枚 move button**——每枚必须唯一归属（adopted 组或已分类 candidate
      owner）；**新增单枚 raw move button 必红**（按枚计数，不按完整 pair）；漏登/重复/stale
      fingerprint 必红；candidate 逐项 `equivalent-owner | deferred | N/A` 且 deferred 必带
      removalCondition，本卡不改其生产 DOM。
    - **GM-A2（AST 负例矩阵钉）**：alias/spread/namespace import、动态或未知 density、非动作 child
      （DsCheckbox/DsNumberInput/DsDraftNumberInput 等字段控件入组）、同组混合模式（纯图标 +
      带文字按钮）、adopted 直系按钮显式 size——全部先红后绿；对无法静态证明的 wrapper
      fail-closed，不以字符串 contains 放行（与既有 adoption 家族 hasExactClassToken/
      staticAttribute 同密度，KA5「不算过度设计」本席背书）。
    - **GM-A3（root 几何与 a11y 门禁钉，同 KA4）**：boundary 扩展锁 root `inline-flex/flex:none/
      flex-wrap:nowrap/gap 4px` 且**移除 `max-width:100%` 需带防回归负例**；default icon 36×36 /
      compact icon 32×32 方形、text 仅 min-width/min-height（负例：text 被锁方形必红）；业务 CSS
      覆盖 gap/wrap/order/尺寸必红；`group.scrollWidth===group.clientWidth` 与按钮 border box ⊂
      group、4px focus 外扩 ⊂ 最近非裁切 owner（jsdom box 计算可测，真实裁切归 build 视觉矩阵
      320/480/720/1280 + 200% 诚实条款）；native button、icon-only accessible name + tooltip、
      装饰 SVG hidden、Tab/Enter/Space、focus-visible。
    - **GM-A4（命令语义零变化 + 用户裁决钉，同 KA2/KA3）**：CommandForm 拆分后
      setRow/setCue/setMembers handler、disabled 条件（rows.length===1 等）、移动/删除顺序与一次
      命令语义逐项测试钉（含 undo/redo 对称）；数字输入补 accessible name + name +
      autoComplete="off"；Shop 移除直系 size 后密度仍由组 density 唯一持有；ItemAlchemy 删除
      handler 与「至少一条」业务规则不变、disabled 原因以描述关系（aria-describedby）关联；
      **两项 before -> after（CommandForm 字段簇拆分、disabled 邻近原因）用户裁决未下前不得
      build**——三方 design 签字不构成豁免，卡面 pending 任何一方不得代为放行。
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: Kimi（2026-08-31，完成——本人 rg census + 逐处 DOM/CSS 直读）；
    GLM（2026-08-31，完成——本人独立扫描复算 8/46/16/30/15 全数收敛 + 违规点/等价 owner 实样/
    recipes.css root 现状/规范零具名/boundary 缺口/P2 原文逐处直读；两席证据各自独立取得）。
  - 独立证据锚点: `rg '<DsActionGroup'` / `rg '<DsReorderMoveButton'`（生产域，排除测试与
    design-lab）;`recipes.tsx:371-382`、`recipes.css:885-918`、`CommandForm.tsx:109-117,462-491,
    1577-1588`、`ItemAlchemyEditors.tsx:147,296`、`ShopTab.tsx:239-245`、`editor.css:1790,2851-2855`、
    `ED-REORDER-SURFACE-1 卡 :470-471`。
  - 可证伪观察: 任一 census 数字与复算不符即重签;任一 candidate 直读证明确有等价
    owner（如 inventory 原子槽/效果卡合同/casualty flex 簇）即不得判 debt,反之（Poison/
    LayerStack 类行尾裸对）才够格 deferred;若移除 max-width 后 root 仍夹窄外伸（320/720 实测），
    intrinsic containment 前提失效转 rework。
- counter / 分歧处理: none（Kimi 选 B、GLM 选 B 与 Codex 推荐一致；A 伪合规、C 伪债务均已带
  证据否决。用户改变 before -> after 时现有三方 design 签字全部失效，更新方案后必须重签）
- 缺签豁免: N/A
- build 准入结论: **allowed（2026-09-01，Codex + Kimi（KA1-KA5）+ GLM（GM-A1~GM-A4）三方
  premise verified + design agree 齐、无 counter；用户已批准脚本编辑器「对话」指令与炼蛊皿/
  紫金葫芦两项 before -> after；Codex 为唯一 Coding Owner）**

### 进入 done 前:审查签字

- Codex: **accept（2026-09-01，commit `1c320ce0`）**——DS 2.22.0 公共合同、8 adopted、46 move
  buttons / 15 candidates、CommandForm 与双炼化禁用原因、RF-27、CLI/Vitest/浏览器证据均按
  KA1-KA5 / GM-A1-GM-A4 闭合；两路内部只读终审发现的“组间转移一枚 move 仍假绿”和
  “equivalent owner 证据只写文案”两项 P1 已以逐组 count + 结构化 parent/CSS/响应式门禁关闭并重获 accept。
- Kimi: **accept（2026-09-01，只读终审 `31ecc0fa..1c320ce0` 全 diff + 真实页面/Design Lab/门禁
  直读与本人聚焦复跑，非复述 Codex）**。按 KA1-KA5 与卡面五点逐项核验：
  - **scope ✓**:diff stat 仅 editor UI/CSS、design-lab、规范/门禁/audit 脚本与看板/任务卡——
    reorder API、schema、Command、projects/pal、content/migrate 零文件（本人 `git diff --stat` 证实）;
    CommandForm handler/disabled/一次命令语义未动（diff 仅结构拆分与 a11y 属性）。
  - **公共几何与语义 ✓（实机 + diff）**:root 实机 `flex-wrap: nowrap`、宽恰 104px(2×32+32+2×4)
    且 `scrollWidth === clientWidth`（真实对话表单）;`max-width:100%` 已改 `min-width: max-content`
    的 intrinsic containment(recipes.css:885-893);default 图标 36×36/compact 图标 32×32/文字按钮
    仅 min 尺寸不锁方形(RF-27 实机 default 文字 80×36、compact 图标 32×32);wrapper 无 role、
    无 roving/方向键模型(recipes.test 断言 role=null、native button、aria-describedby tooltip、
    SVG hidden+focusable=false);DS-C.2a 成文含“首尾位置边界态不强制重复原因、tooltip 不能代替
    业务禁用原因”的精确边界;`DS-F.5` 三模式禁混用成文。
  - **census/门禁 ✓（本人复算一致）**:registry baseline `8/46/16/30/15` 与本人 rg 复算一致,
    disposition `{equivalent-owner: 1, deferred: 14, N/A: 0}`——equivalent 恰为
    `project/startup-inventory/actions`（设计期预判的原子槽，绑定 default parent/几何/响应式
    证据，stale 即红）;门禁负例直读：stale fingerprint、deferred 缺证据、dynamic density、
    spread/import alias/variable alias、non-action child、mixed mode、**额外单枚 raw move**
    (47/31 必红）、**组间 1→3 转移**(总量不变仍红）、candidate pair 增减一枚必红、
    adopted 直系 size 双 owner(Shop `size="compact"` 已删）。
  - **真实页面 ✓（实机）**：场景脚本对话表单——速度字段已入独立 `fieldset`（视觉隐藏 legend
    “对话第 1 行打字速度”+ 可见“毫秒/字”)，动作组内仅剩两枚移动 + danger 删除（无字段控件）;
    单行时删除 disabled 且邻近显示“至少保留 1 行对话”,button
    `aria-describedby=dialogue-row-1-delete-reason` 关联成立;`Num` 现带
    aria-label/name/autoComplete(diff :107-127,:488-491);队伍删除为
    `从队伍移出：${memberName}` 纯图标 danger（移出语义如实）;ItemAlchemy 双列表同型
    “至少保留 1 条配方/奖励”邻近原因 + describedby;720 实机 row/group/document 溢出全 0。
  - **200% zoom（诚实声明）**：真实 UI 级 200% zoom 在本环境**仍无法可靠设置**——CDP
    `Emulation.setPageScaleFactor` 已于前卡实测为 pinch 式（布局视口不响应）;chrome-devtools
    MCP 窗口在本环境被钳制 ≥720，等效 640 也无法下探（实测 innerWidth 恒 720）。
    **真实 200% zoom 与 640 等效视口均未实测**,720/RF-27(480/320)/560 以下 stacked 证据覆盖
    zoom 敏感代码路径，不以等效或 pinch 冒充。
  - **测试记录诚实性 ✓**:卡面如实记录——全量第一次 3 失败（field-layout snapshot 两条
    CommandForm grid 属本任务预期、EnemyTab 时序、text-overflow 30s timeout）并按精确原因复绿;
    `vitest run -u` 因 Vitest v4 参数位置**意外触发第二次全量**(183/184 files、1513/1514)
    已如实记录未隐瞒;text-overflow 在 `--testTimeout=120000` 下 14.63s 绿,归因为 timeout 而非
    产品回归;最终 9 files / 158 focused 复绿。归因与证据自洽。
  - **本人复跑**:action-group-adoption + recipes + boundary + reorder-surface + field-layout +
    CommandForm.current-characterization + ItemAlchemyTab + ShopTab + reorder-adoption →
    **9 files / 157 tests 全绿**。
  无返工项；未修改实现/测试，未代签 GLM。
- GLM: **accept（2026-09-01，只读终审 `31ecc0fa..1c320ce0` + registry/门禁/语义 diff 独立复算与
  聚焦复跑，非复述 Codex/Kimi；与 Kimi 实测口径各自独立取得后收敛）**。按 GM-A1~GM-A4 逐钉核验：
  - **registry 复算 ✓（GM-A1）**：`action-group-adoption.json` baseline 恰
    `8 groups / 46 moveButtons / adopted 16 / raw 30 / 15 candidateSurfaces`——本人 node 复算
    adopted 8 组**每组 moveButtonCount=2**（合计 16）+ candidate 15×2（合计 30）= 46，与本人
    设计期独立扫描逐数一致；disposition 恰 **1 equivalent-owner + 14 deferred + 0 N/A**。
    **deferred 逐项可执行**：14 项全部带具体 reason + verification 测试 + removalCondition
    （迁移 DsActionGroup 或独立审签等价合同，另卡裁决类明确指向后续任务而非永久豁免）——本人
    抽查 `.casualty-gate/item-actions`（editor.css:2854）、`.ef-ops`、`.cmd-ops`（absolute 私有
    rail）、`.layer-order`、`.sprite-action-step-buttons`（:497）等 fingerprint 均真实存在于
    生产源，无虚构 debt。**equivalent（inventory）证据实锤**：`.project-inventory-actions`
    （editor.css）持 requiredDeclarations 全集（inline-flex / min-width:max-content /
    flex-wrap:nowrap / gap:var(--ds-space-2) / white-space:nowrap），父
    `<DsRepeatRow density="default" className="project-inventory-row">`（:1476）实在；门禁对
    parent density 改 compact 与 gap token 漂移均有 stale-red（本人直读 + 复跑绿）——无把真实
    debt 写成 equivalent，也无 deferred 变永久豁免。
  - **门禁负例矩阵 ✓（GM-A2）**：`action-group-adoption.test.ts` 负例为**真实生产源变异**——
    额外单枚 raw move（47/31 必红 + “must map to exactly one candidate owner”）、组间 1→3 转移
    （总量不变仍红：actor 1 枚/enemy-team 3 枚双红）、candidate pair 增减一枚红、equivalent
    parent/gap stale 红、alias/spread/dynamic density/non-action/mixed-mode/direct-size
    fail-closed（"fails closed for import alias" 等本人复跑绿）。**扫描域精确**：
    `action-audit.mjs` 以 `src/ui` 为根（design-lab 结构性排除）、排除 `*.test.tsx` 与
    `/design-system/`（组件自计数排除），接入 `design-system-audit.mjs` CLI gate（91 files 复跑
    通过）。
  - **命令语义零变化 ✓（GM-A4）**：diff 逐行核——dialogue 行 `setRow`（checkbox 三元、Num
    回写）、`setCue`（rows.filter 删除）、disabled `cue.rows.length === 1`、移动 backward→forward
    顺序全部逐字保留；party 行删除 handler 原样、label 具体化“从队伍移出：角色名”；ItemAlchemy
    两处删除 filter handler、`<=1` 条件、move label 原样，仅新增 useId 前缀 reason span +
    aria-describedby；Shop 仅删 `size="compact"`；字段/命令/一次 UpdateItemCommand 路径零触碰
    （schema/content/migrate/projects-pal 零文件）。`Num` 三属性逐行断言（characterization 测试
    :205-238：aria-label/name/autoComplete + 删除 describedby → “至少保留 1 行对话”节点）。
  - **root 几何与公共 CSS ✓（GM-A3）**：recipes.css root 现为显式 `flex-wrap: nowrap` +
    `min-width: max-content`，`max-width: 100%` 已删除（本人直读 :885-893）；default 36×36 /
    compact 32×32 / text 仅 min 尺寸既有断言保持。
  - **测试记录复核 ✓**：卡面如实记录全量第一次 3 失败的精确归因（field-layout snapshot 两条
    为本任务预期 CommandForm grid 差异、EnemyTab 时序、text-overflow 30s timeout）、
    `vitest run -u` 因参数位置**意外触发第二次全量**（183/184、1513/1514）未隐瞒、timeout
    归因自洽——诚实性成立。**本人复跑**：action-group + recipes + boundary + reorder-surface
    门禁 **4 files / 113 tests**、CommandForm characterization + ItemAlchemyTab + ShopTab
    **3 files / 30 tests**、DS adoption 总门禁 **21 tests**、`audit:design-system` CLI
    **91 files / 2 evidence-bound exceptions**、editor typecheck——**全绿**（按纪律未重复全量）。
  - **200% zoom（诚实声明）**：本席环境与前卡同——IAB webview 对键盘缩放零响应、CDP
    pageScaleFactor 为 pinch 式，**真实 200% zoom 与 640 等效视口均未实测**，与 Kimi 口径一致，
    不以 pinch/等效冒充；720 / RF-27 480/320 / 360 单列下沉已覆盖 zoom 敏感代码路径。
  无返工项；未修改实现/测试，未代签 Kimi，未填用户验收。
- 用户验收: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked（Codex + Kimi + GLM 三方 accept 齐；缺用户验收，不得标 done）

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
- 是否建议进入 build: yes（2026-09-01 三方签字与用户产品裁决均齐）

## Build: 实现与自测

- Coding Owner: Codex（唯一实现修改者）
- 修改文件:
  - 公共合同 / 版本：`recipes.css`、`index.ts`、`tokens.css`、设计规范、RF-27。
  - 当前采用：`CommandForm.tsx`、`ItemAlchemyEditors.tsx`、`ShopTab.tsx` 与受限 `editor.css`。
  - census / 门禁：`action-group-adoption.json`、`action-group-audit.mjs`、CLI gate 接线、adoption /
    boundary / recipe / reorder-surface / field-layout snapshot 测试。
  - 明确零改：`reorder.tsx`、`reorder.css`、`reorder-adoption.json`、schema/content/runtime/project data。
- 实现摘要:
  - root 改为显式 nowrap + intrinsic min-width，删除会夹窄 wrapper 的 `max-width:100%`；default icon
    36×36、compact icon 32×32，文字动作只锁最小宽高，业务 CSS 禁止覆盖公共 class。
  - 脚本编辑器「对话」指令：`fieldset` 持有“自定速度 + 每字间隔（毫秒）+ 毫秒/字”，补 name/
    autocomplete；上移/下移/删除成为 pure-icon group，单行删除显示“至少保留 1 行对话”；队伍删除改为
    `从队伍移出：角色名` danger icon。`setRow/setCue/setMembers` 与草稿提交时机原样。
  - 炼蛊皿 / 紫金葫芦：唯一配方 / 唯一奖励档位显示完整可见原因并以 `aria-describedby` 关联；disabled、
    handler、`maxRoll` 与至少一条业务规则原样。Shop 只删除直系冗余 `size`。
  - 生产 census 精确为 8 groups / 46 move buttons / adopted 内 16 / raw 30 / 15 candidate surfaces；
    最终分类为 1 `equivalent-owner`（startup inventory）+ 14 `deferred` + 0 N/A。每组 adopted 恰 2 枚
    move；组间 1→3 转移、额外单枚 raw move、alias/namespace/spread/dynamic/non-action/mixed-mode/
    direct-size/stale/重复均有红态负例。唯一 equivalent owner 的 default parent、4px gap、max-content/
    nowrap 与 520/400 整组换轨由 CLI + boundary 双锁。
- 运行命令:
  - final focused：9 files / 158 tests 绿（action-group、recipes、boundary、reorder-surface、field-layout、
    text-overflow、CommandForm、ScriptDrawer、ItemAlchemy）。
  - `pnpm --filter @type-pal/editor typecheck` 绿。
  - `pnpm --filter @type-pal/editor audit:design-system`：91 files、2 个既有 evidence-bound exceptions，绿。
  - Editor 全量第一次：3 项失败——field-layout snapshot 为本任务新增两条 CommandForm grid 预期差异；
    EnemyTab focus 时序失败；text-overflow 30s timeout。按精确原因更新 snapshot。
  - `vitest run -u <field-file>` 因 Vitest v4 的 `-u` 参数位置意外再次触发 editor-wide：183/184 files、
    1513/1514 tests，唯一剩余为 text-overflow 30s timeout；这是意外第二次全量，已如实记录，不再重复全量。
  - 精确复跑：EnemyTab + field-layout 2 files / 19 tests 绿；text-overflow 单文件 9 tests 在
    `--testTimeout=120000` 下 14.63s 绿；最终 9-file focused 再次 158/158 绿。
- 浏览器 / 手工检查:
  - RF-27 v2.22.0：480px 三枚 icon-text 36px 同排；320px 三枚 pure-icon 32px 整组下沉；480px
    pure-text 保持 intrinsic。20 汉字 / 40 英文 / 64 字符 ID 均零溢出，group scrollWidth=clientWidth。
  - 真实脚本页在评审沙盒临时插入未保存“对话”后检查：1280/720 下实际 row 486px 同排；360 viewport
    实际 row 294px 单列，group 完整下沉。速度 input 不在 group，aria/name/autocomplete 正确，三动作
    32×32 同 y、danger 正确、row/document overflow 0；刷新后未保存草稿已丢弃。
  - 真实炼蛊皿 / 紫金葫芦：1280 与 720 均测。炼蛊组 104px、按钮 32×32；紫金葫芦组 116px、按钮
    36×36；group/client/scroll width 相等、按钮位于 row 内、row/document overflow 0。
- 跳过的检查及原因: 真实浏览器 UI 级 200% zoom 仍无法由当前工具可靠设置；未用 pinch/
  pageScaleFactor 冒充。RF-27 固定 320px、真实 360 viewport / row294、720 与 1280 已覆盖两侧布局路径，
  200% 留 Kimi / 用户复验。

## 视觉验证记录

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: Design Lab RF-27 DOM/computed geometry + 真实脚本/炼蛊皿/紫金葫芦页面 DOM、截图与
  bounding-rect 检查；1280/720/360 viewport。
- 集中 E2E 用例 / 批次: N/A
- 截图 / 像素检查路径: 应用内浏览器本轮截图（未写仓库）；无 `.mimosa` 提交。
- 结论: RF-27 三模式、真实 CommandForm 与两机制页面均无拆组、混高、裁切或横向溢出。
- 未完成项: 真实 UI 级 200% zoom；当前证据不宣称已实测。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: Codex accept；内部两路只读压力审查 accept；正式 Kimi / GLM pending。
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: build 前产品裁决 **approved（2026-09-01）**；build 后功能验收 pending
- 后续任务: `ED-ACTION-GROUP-ADOPTION-1`（仅在本卡逐项分类后仍有真实 deferred 时开卡；数量不得预设）

## 交接日志

- 2026-09-01 GLM: 只读终审 `31ecc0fa..1c320ce0`，签 **accept**。独立证据：registry node 复算
  8 组×2=16 + 15×2=30 = 46、disposition 1 equivalent + 14 deferred + 0 N/A，deferred 逐项
  removalCondition 可执行、fingerprint 抽查全实在；equivalent(inventory) requiredDeclarations
  与 default parent 实测在源 + stale-red 双锁；门禁负例为真实生产源变异（单枚 raw move/1→3
  转移/pair 增减/stale/alias/spread/dynamic/non-action/mixed/direct-size 全红），扫描域以
  src/ui 为根结构性排除 design-lab 与组件自计数；CommandForm/ItemAlchemy/Shop 语义 diff 逐行
  零变化（handler/disabled/顺序/一次命令），Num aria/name/autoComplete 与删除 describedby
  原因逐行断言；recipes.css root 显式 nowrap + intrinsic、max-width 已删；测试记录（3 失败
  归因/意外第二次全量/timeout）诚实；本人复跑门禁 4 files/113 + 页面 3 files/30 + DS adoption
  21 + audit CLI 91 files + typecheck 全绿。200% zoom 与 640 等效均未实测（环境同限，不冒充）。
  无返工项；未修改实现/测试，未代签 Kimi，未填用户验收。三方 accept 齐，仅剩用户验收；
  无下一位 Agent 提示词，等待用户验收/收口。
- 2026-09-01 Kimi: 只读终审 `31ecc0fa..1c320ce0`，签 **accept**。独立证据：scope 零越界
  （git diff --stat 无 schema/Command/projects/content-migrate）；真实对话表单速度字段已入具名
  fieldset（隐藏 legend + 毫秒/字）、动作组纯两移+danger、单行删除 disabled 且邻近原因 +
  aria-describedby 关联、组实机 nowrap/104px/scrollEq;root `min-width:max-content` intrinsic
  containment;RF-27 实机 default 文字 80×36 不锁方、compact 图标 32×32、wrapper role=null;
  registry 8/46/16/30/15 与本人 rg 复算一致、1 equivalent(inventory 原子槽绑 parent/几何/
  响应式)+14 deferred；门禁单枚/1→3 转移/pair 增减/stale/alias/dynamic/non-action/mixed/
  direct-size 全必红;Shop direct-size 已删;Num 补 aria/name/autoComplete;队伍“移出：名”;
  测试记录诚实（预期 snapshot/意外第二次全量/timeout 归因均如实）;200% zoom 与 640 等效均
  未实测（窗口钳制 ≥720，已明写不冒充）;本人复跑 9 files / 157 tests 全绿。无返工项；未修改
  实现，未代签 GLM，未标 done。Next: GLM 终审与用户验收。
- 2026-09-01 Codex: commit `1c320ce0` 完成 DS 2.22.0、当前 8 adopted 闭合、46/16/30/15 census、
  1 equivalent +14 deferred 分类、CommandForm / ItemAlchemy 真实术语修复与 RF-27。最终 focused
  9 files /158、typecheck、CLI gate 绿；全量与意外第二次全量的预期 snapshot/时序/timeout 过程已如实
  记录并全部精确复绿。浏览器完成 RF-27 480/320、真实 1280/720/360 与两机制页；未伪报 200%。
  Codex 签 accept，状态转 review。Next: Kimi 只读架构/视觉终审，不得修改实现或标 done。
- 2026-09-01 User + Codex: 用户要求把内部代码名改为真实页面术语；Codex 澄清为“脚本编辑器「对话」
  指令”和“炼蛊皿/紫金葫芦唯一行禁用原因”后，用户明确回复“批准以上两项调整”。三方签字与用户
  产品裁决门均齐，状态转 build；Codex 作为唯一 Coding Owner 开工。Next: Codex 实现、自测并转 review。
- 2026-09-01 Codex: 核对 `fd37fd9b` / `992fe8fc`，Kimi KA1-KA5 与 GLM GM-A1~GM-A4 均签
  premise verified + design agree，选择范围 B、无 counter；build 唯一剩余门禁是用户同时批准
  CommandForm 字段簇拆分与 ItemAlchemy disabled 邻近原因两项 before -> after。未修改实现。
  无下一位 Agent；等待用户产品裁决。
- 2026-08-31 GLM: 独立复算 census 全数收敛（8 callsites/6 files、compact 7+default 1、46 枚
  move = adopted 组内 16 无孤儿 + 组外 30 = 15 两枚 surface，按文件算术闭合）+ 直读
  CommandForm 两处违规（字段入组/quiet 带字删除/无名 Num/模式混用）、Shop 直系 size 双 owner、
  ItemAlchemy disabled 无邻近原因、recipes.css root 无显式 nowrap 且持 max-width:100% 外伸风险、
  规范零具名（grep 计数 0）、boundary 仅锁部分尺寸、三类 candidate 等价 owner 实样
  （inventory 原子槽/casualty flex 簇/effect-card 合同）与 P2 原文。签 premise verified +
  design agree（选 B；附 GM-A1 census 双向闭合含单枚必红 / GM-A2 AST 负例矩阵 / GM-A3 root
  几何与 a11y 门禁含 max-width 防回归负例 / GM-A4 命令语义零变化 + 用户裁决不豁免）。
  未修改实现，未代签 Kimi。三席 design 签字齐；**用户对 CommandForm 字段簇拆分与炼化 disabled
  邻近原因两项 before -> after 的裁决未下前不得 build**。Next: 用户裁决；裁决后 Codex 按钉 build。
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
终审 ED-ACTION-GROUP-SPEC-1（GLM 席，review；只读，不得修改实现/测试，不得代签，不得标 done）。

任务卡：docs/ops/tasks/ED-ACTION-GROUP-SPEC-1-editor-action-group-contract.md
实现提交：1c320ce0 feat(editor): enforce action group contract
当前状态：review；Codex accept 与 Kimi accept（2026-09-01，含真实页面/门禁/测试记录诚实性
与 200% zoom 未实测声明）均已签，仅余你的 GLM accept 与用户验收。

先读：AGENTS.md、docs/phase2/READ-FIRST.md、本卡全部签节（KA1-KA5、GM-A1~A4、Kimi accept
实测口径）与 Build/视觉证据、editor-design-system-v1.md DS-C.2a/DS-F.5/RF-27；审
`31ecc0fa..1c320ce0` 全 diff。

你的分工（独立证据，不复述 Codex/Kimi）：
1. 以你自己的方式复算 action-group-adoption registry：8 adopted（每组 moveButtonCount=2）/
   46 / 16 / 30 / 15，disposition 1 equivalent + 14 deferred + 0 N/A；deferred 逐项的
   removalCondition 与 file:line 证据是否真实可执行、有无把真实 debt 写成 equivalent 或把
   deferred 变永久豁免；equivalent(inventory)的 default parent/几何/响应式证据复核。
2. 门禁负例矩阵独立复跑与覆盖判断：额外单枚 raw move、组间 1→3 转移、candidate pair 增减、
   stale fingerprint、alias/namespace/spread/dynamic density/non-action child/mixed mode/
   adopted 直系 size 是否逐条真能红；action-group-audit.mjs 与 design-system-audit.mjs 的
   扫描域（排除测试与 design-lab）是否精确。
3. CommandForm/ItemAlchemy/Shop 的命令语义零变化：handler、disabled、move/remove 顺序、
   一次命令、undo/redo 对称、字符/资源引用不丢失；Num 的 aria/name/autoComplete 逐行断言。
4. 测试记录复核：全量 3 失败的精确归因（snapshot 为本任务预期、时序、timeout 非产品回归）、
   `vitest run -u` 意外第二次全量是否如实记录、最终 9 files / 158 与 editor typecheck、
   design-system gate 证据是否自洽；可复跑聚焦，不要重复全量。
5. 200% zoom：Kimi 已明写真实 UI zoom 与 640 等效均未实测（CDP pageScaleFactor 为 pinch 式、
   MCP 窗口钳制 ≥720）；你若同样无法可靠设置，请保持“未实测”口径，不得以 pinch/等效冒充。
输出：本席 accept 或 counter + file:line/可复现步骤；写回“进入 done 前”GLM 行与交接记录。
```
