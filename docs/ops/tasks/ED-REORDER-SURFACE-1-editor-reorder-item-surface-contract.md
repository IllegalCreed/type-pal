# ED-REORDER-SURFACE-1 - 编辑器排序项可见边界与列表表面合同

Status: review
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

为全部 29 个生产排序入口冻结内容组件与手柄布局两条正交语义：同构字段编辑项、完整对象卡、贴边连续列表、专用
连续结构分别保留各自 surface owner；手柄另行登记 inline / overlay。排序能力不得替换原内容组件。把两轴分类写进
采用矩阵和 fail-closed 门禁，清掉 6 个已确认的“内缩项 + 仅分割线 / 无边界”遗留点，且不改变排序、命令或数据语义。

## 范围

- 范围内:
  - 为 `reorder-adoption.json` 的 29 个 adoption 登记 `contentSurface: repeat-row | object-card |
    edge-to-edge-list | continuous-structure` 与 `railLayout: inline | overlay`，两轴分别绑定证据 owner。
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

排序交互 owner 必须保持 surface-neutral；内容先决定组件，再决定“逐项完整边框”还是“外框 + 连续 divider”。
主要由同构行内字段组成、没有独立对象级任务边界的项使用 repeat row；拥有可识别 identity、可选择状态、对象级动作
或独立详情任务的业务对象保留对象卡，标题是必备 identity，状态 / 摘要 / 详情是按业务存在的可选槽且不得因排序消失。
不能靠是否出现 grip 一刀切，也不能把有 gap 的独立编辑项只画一条底线。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：本任务只改第二阶段作者工具的可见层级，不涉及原版游戏机制或内容真值。 | `docs/phase2/READ-FIRST.md`；`packages/editor/src/ui/design-system/reorder.tsx:1161-1244` |
| 第一阶段 | N/A：第一阶段没有当前 Reforge 编辑器的公共 reorder surface 合同。 | `CLAUDE.md`；`docs/phase1/engineering-notes.md` |
| 当前二阶段 | registry 有 17 家族 / 29 adoption / 32 数据路径，但没有 contentSurface / railLayout 分类；已确认 2 个严格 edge-to-edge、5 个专用连续结构、16 个已有 frame、6 个 inset/gap 无完整 frame。脚本方案的历史产品真值是横向对象卡；reorder wrapper 插入真实 div 后旧 child selector 失活，曾退化为全宽大行。 | `packages/editor/src/ui/design-system/reorder-adoption.json:1-476`；`docs/ops/tasks/N3-1-script-control-flow-modernization.md:3618-3631`；`packages/editor/src/ui/design-system/reorder.tsx:1122-1145`；`packages/editor/src/ui/ScriptEditor.tsx:188-268` |
| 本任务目标 | 29 项逐项登记内容 / surface 分类；6 个红项迁到正确 owner；门禁同时证明组件语义、边界、gap/inset、窄宽可用性，合法对象卡和连续列表保持不变。 | `docs/phase2/editor/editor-design-system-v1.md` 的 DS-F.4、DS-C.4d、RF-21 |

### 反证与替代解释

- 最强替代解释:
  - 给所有 `.ds-reorder-item` 统一加 border 最省代码；但会让 EffectEditorCard 等双框，并破坏 Shop、Cutscene、
    Catalog、Tree 和 Timeline 的连续表面。
  - 把所有缺框项改成 `DsRepeatRow` 也能统一边框；但会把脚本方案这类有 identity / summary / status / details 的
    完整对象卡降级成字段行，丢失信息层级。
  - 把所有缺框项改成 gap 0 的连续列表也能减少视觉歧义；但复合表单项会失去逐项编辑对象层级和拖动范围。
- 什么观察会推翻当前前提:
  - 若某红项实际由一个完整外框、gap 0、无外侧 inset 的列表 owner 持有，则应改判为 `edge-to-edge-list`，
    不应逐项加 frame。
  - 若某项已有语义卡片 owner，则 `contentSurface` 应登记 `object-card`；时间线等手柄位于内容上方时只把
    `railLayout` 登记为 `overlay`，不能把手柄位置冒充内容组件。对象卡复用现有 frame，不能再包 `DsRepeatRow`。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: N/A；本卡不改命令。
  - 原版 / 第一阶段理解: N/A；仅第二阶段编辑器视觉。
  - extractor / 地图 / 数据解码: N/A。
  - audit / test model: 已确认现门禁只验证 grip 几何位于 DOM item 内，不验证可见 surface。

### 用户可见偏离

- 是否主动偏离已核真值: no；按用户提出的两种可接受表现冻结已有界面关系。
- `before -> after` 一句话: 6 个“内缩/有 gap 但无完整边界”的排序编辑项 -> 按内容语义消费 repeat row 或对象卡；
  合法对象卡、贴边连续列表与专用结构不变。
- 代表场景: Enemy AI 规则、敌队固定槽、物品资源奖励档、角色初始法术、对白 cue、设置队员。
- 用户裁决: 2026-08-30 用户先明确两种合法边界方向，随后反例指出脚本方案必须保留原对象卡层级，不能仅因可拖动
  就套用行式组件；本卡已按“内容语义先于排序表面”修订，仍需三方签字。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `DsReorderItem` 只拥有排序交互和几何；业务 surface 不能下沉到公共 reorder wrapper。
  - grip 只表示起拖入口，完整边框表示被移动的对象范围；整行仍不得变成任意位置可起拖。
  - 完整对象卡的标题、状态、摘要和详情动作不得因排序采用而消失、拉伸或降级为字段行。
  - Shop 风格只在完整外框、贴边、gap 0 时成立。
- 代码锚点:
  - 公共中性 wrapper：`packages/editor/src/ui/design-system/reorder.css:1-113`、
    `packages/editor/src/ui/design-system/reorder.tsx:1161-1244`。
  - repeat-row recipe：`packages/editor/src/ui/design-system/recipes.tsx:355-370`、
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

## 生产 surface census（设计输入，子类待三方冻结）

- `edge-to-edge-list`（2）: `shop/stock`、`asset/cutscene-import-frames`。
- `continuous-structure`（5）: `project/entry-points`、`script/canonical-siblings`、
  `script/legacy-siblings`、`map/layer-stack`、`asset/sprite-action-definitions`。
- 已有明确 frame owner、build 前须登记 `repeat-row / object-card` 与独立 `railLayout`（16）:
  `project/startup-party`、`project/startup-inventory`、
  `item/equipment-effects`、`item/craft-recipes`、`item/use-effects`、`item/throw-effects`、
  `skill/base-effects`、`skill/execution-effects`、`poison/ticks`、`asset/sprite-action-steps`、
  `asset/frame-animation-timeline`、`actor/casualty-gates`、`actor/casualty-lines`、
  `actor/casualty-effects`、`story/entity-behavior-schemes`、`story/scene-hook-variants`；其中两项 story scheme
  明确为 `object-card`，不得迁为 `DsRepeatRow`。
- 待独立核定为 `repeat-row` 或 `object-card` 并迁移（6）: `enemy/ai-rules`、`enemy-team/fixed-slots`、
  `item/resource-reward-tiers`、`actor/initial-magic`、`story/dialogue-cue-rows`、
  `story/set-party-members`。
- 合计: `2 + 5 + 16 + 6 = 29`。

## 验收条件

- 功能:
  - 29 个 adoption 的 `contentSurface + railLayout` 两轴分类闭合；6 个红项有正确内容 owner 与清晰边界；
    Shop/Cutscene/专用连续结构不出现双框。
  - `story/entity-behavior-schemes`、`story/scene-hook-variants` 是 object-card + inline rail canary：每卡保留标题、
    步骤摘要、可选默认状态和方案详情；两卡横向平铺，单卡不得拉成 collection 全宽。
  - pointer、keyboard、上下移动按钮和 undo/redo 仍共用原 owner，一次动作最多一条命令。
- 测试:
  - registry schema/fingerprint/census fail-closed；CSS/DOM 反例能红；六个 owner 聚焦测试通过。
  - Editor typecheck、design-system audit、受影响包全量测试各跑一次。
- 文档:
  - DS-C.4d / RF-21 与 adoption schema 同步，明确四类 contentSurface、两类 railLayout 和禁用混搭。
- 视觉 / 手工验证:
  - 1280 / 900 / 720 与 200% 缩放检查完整边界、拖动预览、动作组、长名称和字段可用性。
  - 至少逐类验证一个 repeat-row、object-card、edge-to-edge、continuous 代表页，并分别覆盖 inline / overlay rail。
  - Shop 720px 代表场景中 identity 不得缩到仅剩省略号，三枚图标动作不得小于 `32×32px`。
- E2E 用例登记: N/A（功能性编辑器界面，开发期最小浏览器验证）。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: verified（2026-08-30 二次修订；独立直读 29-adoption registry、N3 脚本方案历史真值、公共 reorder
    wrapper、Shop/Cutscene 连续表面和 6 个红项锚点，确认内容组件与 rail placement 必须分轴登记）
  - design: agree（保持 wrapper 中性；采用矩阵登记 contentSurface + railLayout；对象卡不得迁为 RepeatRow；
    两项 story scheme 作为横向 object-card canary；只迁移 6 个红项；窄宽检查不能只看 overflow）
  - 签字变更: 首版“边界拓扑优先”的 design 签字因用户反例失效；以上为按内容语义优先和两轴矩阵重新给出的签字。
- Kimi:
  - premise: **verified（2026-08-30 独立直读 registry 全 29 项、公共 reorder/recipes 层、四桶代表面 TSX+CSS、
    六红项行容器与 N3-1 历史真值，非代理；与 GLM 证据各自独立取得后比对收敛）**。
    - **29 项独立复算**:逐一枚举 `reorder-adoption.json` 全部 29 个 adoptionId 并按内容语义归桶:
      `edge-to-edge-list`(2)= shop/stock(`.shop-stock-card` 唯一外框 editor.css:3717-3722 +
      `.shop-stock-list` 无 gap + 行仅 `border-bottom` 3743-3754;ShopTab.tsx:217-269)、
      asset/cutscene-import-frames(`.cutscene-import-files` 外框 8024-8031 + li 仅底部分割线 8032-8036;
      CutsceneTab.tsx:1093-1138);`continuous-structure`(5)= project/entry-points(DsCatalogRow 连续目录行,
      ProjectWorkbenchTab.tsx:1953-1973)、script 两族(`.cmd-row` 树行无边框、整宽选中背景,
      editor.css:2493-2499,6825-6832)、map/layer-stack(`.map-layer-row` 无边框、`.sel` 整宽背景+inset 强调线,
      11277-11294)、asset/sprite-action-definitions(连续 catalog-content 行,SpriteActionEditor.tsx:296-322);
      已有 frame(16)逐项或按族直读全部成立:startup-party/startup-inventory(DsRepeatRow,
      ProjectWorkbenchTab.tsx:1240,1467)、poison/ticks(DsRepeatRow compact,PoisonTab.tsx:108,即 93bcab33
      已收口的毒行)、craft-recipes(`.item-recipe` 完整 border,editor.css:10251-10258)、casualty-gates
      (`.casualty-gate-row.arow` border,3208-3214)、casualty-lines(`.casualty-item-card` border,3334-3339)、
      六条效果链(EffectEditorCard 调用点 ItemTab.tsx:1701、ItemUseEffectEditor.tsx:1327,1789、
      SkillTab.tsx:827,1329、CasualtyEditor.tsx:555)、sprite-action-steps(`.sprite-action-step` border,
      6459-6469)、frame-animation-timeline(`layout="overlay"` + FrameThumbnail 自有帧视觉,
      FrameAnimationEditor.tsx:909)、story 两 scheme(`.script-scheme-card` border,12397-12424)。
      四桶 2+5+16+6=29 与 registry 集合精确相等,无漏项、无重复、无第 30 项。
    - **六红项逐一实锤“有 gap/内缩但无完整 frame”**:enemy/ai-rules(`.rule-row` 纯 flex,无
      border/background,editor.css:7206-7211;EnemyTab.tsx:1006-1034)、enemy-team/fixed-slots
      (`.enemy-team-slot` 无 border/background,容器 gap 8px,10718-10727;EnemyTeamTab.tsx:434-476)、
      item/resource-reward-tiers(`.item-amount-row.ordered` 无 border/background,10264-10272;
      ItemUseEffectEditor.tsx:466-508)、actor/initial-magic(`.actor-initial-magic-row` 无
      border/background,容器 gap 7px,2840-2850;ActorMode.tsx:1643-1660)、story/dialogue-cue-rows
      (`.cf-dialog-row` 有 background+radius+padding+margin 但**无 border**,6921-6926——正是 DS-F.4
      禁止的内缩独立项无完整边界混搭;CommandForm.tsx:437-489)、story/set-party-members
      (`.cf-row.cf-party-row` 无 border/background,6870-6875,6939-6947;CommandForm.tsx:1548-1593)。
    - **两轴正交性实锤**:29 项全部消费同一 DsReorderItem(都有 grip),却分属四类内容 surface——证明分类轴
      是内容语义而非“有没有手柄”;railLayout 独立成立:frame-animation-timeline 为唯一 overlay 代表
      (`layout="overlay"`,FrameAnimationEditor.tsx:909),其余均为 inline(默认),overlay 是 rail 位置
      而非内容组件,与卡面反证节一致。
    - **公共层 surface-neutral 实锤**:`.ds-reorder-item` 仅 position/display/box-sizing/min-width/
      min-block-size(reorder.css:5-11),无 border/padding/background/gap;inline rail 只向内容首根节点
      预留 padding(reorder.css:94-98,DS-C.4d 已批准机制);`DsReorderItem` props 无 surface 入口
      (reorder.tsx:1161-1244);registry 当前确无 contentSurface/railLayout 字段(全文直读)。
    - **对象卡历史真值实锤**:N3-1 P7-R4(2026-07-25)用户验收约束“方案必须平铺;每张方案卡直接提供
      方案详情”(docs/ops/tasks/N3-1-script-control-flow-modernization.md:3618-3631);当前
      ScriptSchemeStrip 每卡持有 identity(strong 业务名)、选择态(aria-pressed+.active)、摘要
      (N 个步骤)、可选状态(默认方案徽标)与详情任务(方案详情弹窗)(ScriptEditor.tsx:202-237);
      wrapper 插入后失活的 220px 横向布局已由类锚定 `.script-scheme-card-list > .ds-reorder-item`
      修复(editor.css:12404-12406)。将其迁为 DsRepeatRow 必然丢失选择态与详情槽——用户反例成立,
      object-card 分类正确。
    - **门禁缺口实锤**:现行门禁只断言 grip 在 item 边界内与不占 catalog 媒体槽
      (reorder-adoption.test.ts:430-446),对可见 surface 零断言;六红项今天全绿与“audit/test model
      是已排查的替代根因”一致。alias/spread fail-closed 范式(:448-464)可复用于新门禁。
    - **窄宽假绿风险现证**:`.rr-p1{flex:1 1 120px;min-width:0}`(editor.css:7228-7231)可无横向滚动地
      缩到 0 宽;`.shop-stock-row` 全文无响应式规则(3746-3768);Shop 下架按钮 compact=30px
      (ShopTab.tsx:244-253)低于 32px 公共下限——卡面“禁止只看 no-overflow”有具体对象,不是抽象告诫。
    - **draft 期提交边界独立复核**:`git show --stat` 确认 93bcab33(毒行)与 704a24bd(方案卡)只触碰
      PoisonTab/ScriptEditor/CSS/测试/文档/本卡,未触碰六红项 owner、registry 或公共 wrapper;
      DS-C.4d(editor-design-system-v1.md:523-526)与 RF-21(:1042)确已携带四类 taxonomy 措辞,
      可随本卡签字生效。
  - design: **agree（2026-08-30,附 KS1-KS4 build 必落钉;与 GLM GM-S1~S5 互补不冲突）**:
    - **KS1(六红项分类核定,本人独立判定)**:六项全部是“同构行内字段编辑 + 仅位置性身份(规则 N /
      槽 N / 第 N 行 / 队长·队员 N),无选择态、无状态/摘要槽、无逐项详情任务”——按 DS-F.4 全部判
      **repeat-row**,无一应判 object-card,与 GLM 独立判定一致;与既有同型面(startup-inventory、
      poison/ticks 均为 DsRepeatRow)连续。若 build 前产品裁决为任一红项新增选择态/状态徽标/逐项详情,
      该项须重判 object-card 并回本卡重签,不得先按卡片实现。
    - **KS2(迁移 = 换 owner,不是叠边框)**:六红项迁移必须删除遗留行皮肤——`.rule-row`/`.rr-*` 的固定
      flex 基宽与 `.in` 私有小字号(editor.css:7212-7248)、`.item-amount-row(.ordered)` 私有列轨
      (10264-10272)、`.actor-initial-magic-*`(2840-2864)、`.cf-dialog-row` 的
      background/radius/padding/margin(6921-6926)、`.cf-party-row` 私有 flex(6939-6947)——由
      DsRepeatRow 统一持有 density/边框/节奏,领域 class 只声明列语义;禁止在遗留行上叠 1px border,
      也禁止保留“背景+圆角+无 border”的半吊子形态冒充采用。shop/stock 保持 edge-to-edge:窄容器只允许
      完整动作组整体下沉,不得拆散、不得把身份列压到只剩省略号,下架与移动按钮恢复至少 `32×32px`
      公共下限(现证 compact=30px)。
    - **KS3(窄宽验收防假绿)**:720px 与 200% zoom 的通过判据必须同时断言关键列最小可用宽度、完整动作组
      矩形(每枚 ≥32×32、整组落在 item 内)与可见文案,不得只断言 `scrollWidth <= clientWidth`;
      长名称(20 汉字/40 英文/64 字符 id)与动作组(移动×2+删除)必须进入六红项每一代表页的浏览器断言。
    - **KS4(门禁反查真实 surface,兼顾对象卡 canary)**:contentSurface/railLayout 登记后,门禁须按桶断言
      CSS/DOM 不变量并能由反例打红——edge-to-edge:容器 gap 0、行无 border/radius、存在唯一外框 owner;
      repeat-row:逐项完整 border 且行 owner 为 DsRepeatRow;object-card:存在语义 frame owner且未消费
      DsRepeatRow;continuous:行无逐项 border。两项 story scheme 的 object-card + inline rail 作为横向
      平铺 canary 进 CSS/DOM 门禁(单卡 220px 有界、不得拉成 collection 全宽、保留选择态与详情槽);
      fingerprint 绑定真实调用点与 CSS owner,沿用 alias/spread/陈旧条目 fail-closed 三态纪律;
      只校验“字段已填写”不算闭环。
- GLM:
  - premise: **verified（2026-08-30，机器 census 复算 + 六红项/合法边界/16 组代表逐个直读，非代理）**：
    1. **机器 census 闭合**：解析 `reorder-adoption.json` 复算得 17 家族 / **29 adoption（唯一）** /
       **32 dataPaths** / 19 owner 文件，与 baseline 块完全一致；本卡四组清单（2 edge-to-edge +
       5 continuous + 16 existing-frame + 6 debt）与 registry 29 个 adoptionId **集合精确相等**，
       无缺失、无多余、无重复。registry v1 现有字段只有 adapter/identity/command/revision/verification，
       确无 contentSurface / railLayout 分类。
    2. **六红项逐一实锤「内缩/gap 无完整 frame」**：`enemy/ai-rules` = `.rule-row` 纯 flex 无边框
       （EnemyTab.tsx:1019-1031；editor.css:7206-7211）；`enemy-team/fixed-slots` =
       `.enemy-team-slot` grid 无边框、容器 `.enemy-team-slots` gap 8px（EnemyTeamTab.tsx:444-473；
       css:10718-10727）；`item/resource-reward-tiers` = `.item-amount-row.ordered` grid 无边框、
       `.item-amount-list` gap 5px（ItemUseEffectEditor.tsx:467；css:10259-10271）；
       `actor/initial-magic` = `.actor-initial-magic-row` grid 无边框、editor gap 7px
       （ActorMode.tsx:1659-1696；css:2840-2849）；`story/dialogue-cue-rows` = `.cf-dialog-row`
       有底色+圆角但**无 border**、margin-bottom 6px（CommandForm.tsx:450；css:6921-6925）；
       `story/set-party-members` = `.cf-row.cf-party-row` 纯 flex 无边框（CommandForm.tsx:1561；
       css:6870-6874）。**本席独立分类读**：六项均为同构字段行（条件/选择/数量字段 + 移动/删除），
       无对象级 identity、可选择状态、摘要或独立详情任务 → repeat-row 候选；无一满足对象卡判据，
       也无一处于「完整外框 + gap 0」容器 → 非 edge-to-edge。与卡面「待核定」口径一致，未发现误判。
    3. **合法 edge-to-edge 实锤**：Shop `.shop-stock-card` 完整外框（css:3715-3719）+
       `.shop-stock-list` grid 无 gap（:3743-3745）+ `.shop-stock-row` border-bottom divider
       （:3746-3753；ShopTab.tsx:223-256）；Cutscene `.cutscene-import-files` ol 外框
       （css:8021-8027）+ `.cutscene-import-file` li divider（:8032-8036；CutsceneTab.tsx:1103-1124）。
       「Shop 风格仅在完整外框、贴边、gap 0 时成立」有现存正例。
    4. **16 组已有 frame 抽查**：`.effect-editor-card` 完整 border+radius+bg（css:9188-9195，覆盖
       casualty-effects 及 ED-FIELD-LAYOUT-1 六族）；`.casualty-gate-row.arow` 有 border
       （css:3208-3214）；poison/ticks 已是 `DsRepeatRow`（PoisonTab.tsx:108，commit `93bcab33`
       在本卡 census 前收口，解释其归入 16 组而非六红项）；use-effects 行已是
       `DsRepeatRow`（ItemUseEffectEditor.tsx:1321）；story 两 scheme 为对象卡（ScriptEditor.tsx:202-235：
       标题/步骤摘要/默认徽标/方案详情按钮），N3-1 P7-R4 用户拍板真值（方案平铺、卡片直进详情，
       N3-1 卡 :3618-3631）支持「不得降级为 DsRepeatRow」。
    5. **中性 wrapper 与两轴现实性**：`.ds-reorder-item`（reorder.css:5-11）只有
       position/display/min 尺寸，**无 border/padding/background/gap**；唯一 padding 是 inline rail
       在内容首子的留空（:94-98），属手柄几何非表面。`DsReorderItem` props（reorder.tsx:1161-1169）
       无任何表面 props；`layout: 'inline' | 'overlay'` 已存在且有真实消费者（EffectEditorCard.tsx、
       FrameAnimationEditor.tsx:909），railLayout 两值对当前 29 项足够。
    6. **wrapper 破坏子选择器机制实锤**：commit `704a24bd` diff 显示旧 `.script-scheme-strip > nav`
       结构选择器在 reorder wrapper 插入真实 div 后失活，修复改为类锚定
       `.script-scheme-card-list > .ds-reorder-item { flex: 0 0 220px }`；boundary.test.ts:460-486
       已锁定卡有界 + 规范句存在。
    7. **门禁缺口属实**：reorder-adoption.test.ts 六断言（:179 census 绑定、:286 allowlist、
       :356 draggable 扫描、:373 私有移动拒绝、:430 grip 几何、:448 别名/展开）全部只验证交互
       adoption，无一验证可见 surface——六红项今天全绿，证明「audit/test model」替代根因排查成立。
    8. **draft 期提交边界核查**：`93bcab33`（毒行）与 `704a24bd`（方案卡）均只触碰回归修复面
       （PoisonTab/ScriptEditor/editor.css/测试/文档），**未触碰六红项 owner**，与本卡交接日志
       「不视为六个红项的 build」一致，未发现签字门禁违规。
  - design: **agree（2026-08-30，附 GM-S1~GM-S5 必落钉）**：
    - **GM-S1（registry 双轴机器冻结）**：`reorder-adoption.json` 每个 adoption 新增
      `contentSurface: repeat-row|object-card|edge-to-edge-list|continuous-structure` 与
      `railLayout: inline|overlay`，两轴分别绑定证据 owner（真实持框的组件类 / CSS 规则锚点）；
      census 复算必须继续闭合 29/32/19 与四组计数；新增、删除、改名或**分类与证据 owner 脱绑**
      均 fail-closed。分类判据必须绑定内容语义（identity/可选择状态/对象级动作/详情任务的存在性），
      永不得以「有无 grip」或「有无 gap」单轴推断。六个红项迁移与 registry 字段翻转在同一变更内完成。
    - **GM-S2（六红项迁移 + 红先行）**：六红项逐项获得 `DsRepeatRow` 逐项完整边框（或有证据的对象卡）；
      禁止页面局部单边 border、margin 伪装修、隐藏动作换空间。每个 owner 配聚焦测试断言
      frame owner 与动作组原子性；CSS/DOM 门禁必须先有**红态负例 fixture**（内缩+仅底分割线、
      无框项间 gap、对象卡被降级为 DsRepeatRow 的 ScriptSchemeStrip 形态负例）再实现修复，
      不接受只在新实现上跑绿的门禁。
    - **GM-S3（窄宽/缩放防假绿）**：720px / 200% / 长名称测试必须断言 identity 与字段列的最小可用
      宽度、动作组完整矩形（每枚移动/删除 ≥32×32、整体落在 item 内、组不拆散）与可见文案，
      不得以 scrollWidth==clientWidth 单独判绿；Shop 720px identity 不得只剩省略号；Shop 下架按钮
      当前为 compact `DsButton`（30px，tokens.css:48 `--ds-control-height-compact`）低于 32px 下限
      （tokens.css:57 `--ds-hit-target-compact`），必须经公共 recipe 恢复下限，不得页面 CSS 补丁。
    - **GM-S4（中性 wrapper 不变量 + 文档同步）**：`reorder.css` 的 `.ds-reorder-item` 不得新增
      border/padding/background/gap，作为 CSS 解析型门禁断言固化；DS-C.4d / RF-21 中已由 `704a24bd`
      提前写入的四类 taxonomy 段落**随本卡三签生效**——若 review 修订分类，文档与 boundary.test 的
      规范句断言必须同任务重同步；build 收口时复核文档措辞与最终 registry 分类零漂移。
    - **GM-S5（不重开 DRAG-1）**：pointer/keyboard/projection 状态机、adapter 语义、
      command/revision owner、occurrence-token 身份零改动；reorder.test.tsx 状态机套件与
      reorder-adoption 六断言保持绿且语义不变（只允许增量 schema 字段）；ED-REORDER-DRAG-1 的
      done 状态不重开；story 两 scheme 保持对象卡 canary 与
      `.script-scheme-card-list > .ds-reorder-item { flex: 0 0 220px }` 有界横向平铺。
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: GLM（2026-08-30，完成）；Kimi（2026-08-30，完成——两席反证各自独立直读一手证据后比对收敛，
    证据集合高度重叠但分类判定与替代解释排除分别独立作出）
  - 独立证据锚点（GLM）: 六红项 `EnemyTab.tsx:1019` / `EnemyTeamTab.tsx:444` / `ItemUseEffectEditor.tsx:467` /
    `ActorMode.tsx:1659` / `CommandForm.tsx:450,1561` 及对应无边框 CSS（editor.css:7206,10722,10264,
    2845,6921,6870）；合法 edge-to-edge `ShopTab.tsx:223-256`+css:3715/3743/3746、
    `CutsceneTab.tsx:1103-1124`+css:8021/8032；对象卡真值 `ScriptEditor.tsx:202-235` +
    N3-1:3618-3631；中性 wrapper `reorder.css:5-11`；机器 census 脚本输出 29/32/19 与四组集合相等。
  - 独立证据锚点（Kimi）:
    - 公共中性 wrapper 与 rail 机制:`reorder.css:5-11,94-98`;`reorder.tsx:1161-1244`;repeat-row owner
      `recipes.tsx:355-369` + `recipes.css:834-843`。
    - 六红项行容器 CSS:`editor.css:7206-7211`(rule-row)、`:10718-10727`(enemy-team-slot)、
      `:10264-10272`(item-amount-row.ordered)、`:2840-2850`(actor-initial-magic-row)、
      `:6921-6926`(cf-dialog-row 有背景无 border)、`:6870-6875,6939-6947`(cf-party-row)。
    - 对象卡 canary:`ScriptEditor.tsx:188-278`(选择态/摘要/默认徽标/方案详情俱全) +
      `editor.css:12397-12424`(卡持 border、item 220px 有界) + N3-1:3618-3631(用户拍板横向卡)。
    - 四桶代表:edge-to-edge `editor.css:3717-3722,3743-3754,8024-8036`;continuous
      `ProjectWorkbenchTab.tsx:1953-1973`、`editor.css:2493-2499,6825-6832,11277-11294`;
      existing-frame `recipes.css:834-843`(DsRepeatRow)、`editor.css:3208-3214,3334-3339,10251-10258,
      6459-6469`、`FrameAnimationEditor.tsx:909`(唯一 overlay rail)。
    - 门禁缺口:`reorder-adoption.test.ts:430-446`(只查 grip 几何);窄宽假绿现证
      `editor.css:7228-7231`(rr-p1 可缩零)、`:3746-3768`(shop-stock-row 无响应式)、
      `ShopTab.tsx:244-253`(compact 30px < 32px 下限)。
    - draft 期边界:`git show --stat 93bcab33 704a24bd` 均未触碰六红项 owner/registry/公共 wrapper;
      taxonomy 措辞已存在于 `editor-design-system-v1.md:523-526,1042`。
  - 最强替代解释与排除（Kimi）:
    1. “给 `.ds-reorder-item` 全局加 border 最省代码”——直读证伪:29 项中 16 项已自带 frame
       (EffectEditorCard/`.script-scheme-card`/`.item-recipe`/`.casualty-*`/`.sprite-action-step`/
       DsRepeatRow),全局 border 必双框;shop/cutscene 连续外框与 catalog/tree/layer 连续行会被切碎。
    2. “六红项改 gap 0 连续列表也能统一”——排除:六项父级是表单 section(DsWorkbenchSection/ActorPanel/
       命令表单),不存在单一外框 list owner;为边框重组 section 会丢掉逐项编辑对象层级,与用户两种合法
       方向都不符;repeat-row 是与 startup-inventory/poison 同型的最小迁移。
    3. “六红项中应有 object-card”——排除:逐项直读 DOM,六项均无选择态、状态/摘要槽或详情任务,身份仅
       位置性;强造卡片会发明产品从未有过的层级(N3 横向卡真值只属于脚本方案)。
  - 可证伪观察（GLM）: ①若六红项中任一项实际承载对象级任务边界（如 AI 规则未来需要独立详情/摘要槽），
    其分类应翻为 object-card 且 registry 须记证据——本席今日直读未发现任何一项；②若出现第 30 个
    adoption 或 29 项之一消失，2+5+16+6 划分即失效，census 必须 fail-closed 而非手改数字；
    ③若 Shop/Cutscene 某行需要行级独立状态信号（当前缺货提示在行内文本），edge-to-edge 类需增补
    状态槽修正案——现存证据不支持；④若 720/200% 下不隐藏动作就无法保住 identity 与字段可用宽，
    必须演示「动作组整组下沉」的既定回退，不得以省略号交差。
  - 可证伪观察（Kimi）:
    1. 若任一红项在浏览器中被观察到拥有选择态、状态徽标或逐项详情入口（本次直读均未发现）,KS1 的
       repeat-row 判定失效,该项重判 object-card 并回签。
    2. 若 shop/stock 或 cutscene-import 行在真实渲染中出现外侧 inset 或行间 gap(与 CSS 直读矛盾),
       edge-to-edge 桶不成立,须重新 census。
    3. 若 16 个“已有 frame”代表页在 1280/720 下渲染出缺边或被 wrapper 裁切的卡片,existing-frame 桶
       不成立;代表页浏览器门禁会先行暴露。
    4. 若窄宽下迁移后的 repeat-row 仍能让关键列缩到 0 宽而无断言失败,KS3 防假绿判据未落地,不得转 review。
- counter / 分歧处理: N/A（Kimi KS1-KS4 与 GLM GM-S1~S5、Codex 设计修订两两无冲突:KS1↔GM-S2 六红项
  迁移、KS2↔GM-S2/S3 owner 更换与窄宽、KS3↔GM-S3 防假绿、KS4↔GM-S1/S4 registry 反查与 canary）
- 缺签豁免: N/A
- build 准入结论: **allowed（签字面）（2026-08-30,Codex + Kimi（KS1-KS4）+ GLM（GM-S1~S5）三签齐、
  无 counter,两席非 Owner 独立反证均完成）**。KS1-KS4 与 GM-S1~S5 为 build 必落钉;Codex 开工时状态转
  build,仍为唯一 Coding Owner。

### 进入 done 前:审查签字

- Codex: **accept（2026-08-31，战斗工作区单列返工后刷新）**——为战斗与成长页增加专用
  `.actor-battle-detail-grid`，以纯 CSS `minmax(0, 1fr)` 固定单列；基础能力、战斗形象、初始装备与仙术、
  升级曲线、战斗音效按文档顺序上下排列，不再让 1237px 长预览与 293px 短配置被 grid 等高并排。未改
  ActorPanel、预览、添加/排序动作或数据命令。红测先命中旧 grid class 与缺失 CSS owner；修复后 ActorMode +
  boundary 2 files / 72 tests、typecheck、design-system audit（89 files / 2 evidence-bound exceptions）与
  diff-check 全绿。1280px 实机 grid=1080px 单列，战斗形象/初始配置均宽 1080px 且前者 bottom 1781 <
  后者 top 1795；8 动作、唯一 header 添加按钮保留，document overflow=0、console error=0。证据
  `.mimosa/evidence/ACTOR-BATTLE-STACKED-PANELS-1280.jpg`。
- Kimi: **counter（2026-08-30，只读终审 build 链 05f46e37→e901eb75 + 本人独立复核与 720px 浏览器抽查；
  与 GLM accept 分歧一点：craft-recipes 分类失实，见下）**——除一项外全部钉通过：
  - **通过项（本人独立证据）**：registry v2 复算 17/29/32/19 闭合、owner file+fingerprint 全员在册；
    六红项全部真消费 `<DsRepeatRow density="compact">`（EnemyTab.tsx:381、EnemyTeamTab.tsx:446、
    ItemUseEffectEditor.tsx:468、ActorMode.tsx:1637、CommandForm.tsx:454,1564），旧皮肤只剩列语义
    （`.cf-dialog-row` 背景/圆角/padding/margin 清零 editor.css:6949-6951；`.rule-row` 固定 flex 基宽改
    auto-fit minmax(8rem) :7243-7245，本人设计期 KS3 假绿证据 `.rr-p1` 已除；`.item-amount-row.ordered`
    数量列有界 + 动作组 container query 下沉 :10293-10306）；公共 `DsActionGroup` compact 双按钮 32px
    下限（recipes.css:889-900）；Shop 保持 edge-to-edge（外卡持框 + 行仅 divider + 560px 动作组整组
    下沉 + identity 换行 :3794-3808）；新门禁四断言含 fingerprint 反查、中性 wrapper 与旧皮拒绝，
    scheme canary 由 boundary.test.ts 锁定（220px 有界 + 规范句）；`git diff 704a24bd..HEAD --
    reorder.tsx reorder.css` 为空（GM-S5）。用户返工两项实锤：initial-magic 添加仅在
    `DsWorkbenchSection.actions`（ActorMode.tsx:1487-1510）、body 入口 0、删除为 compact 组内 danger
    icon 且 aria 具体（:1661-1668）、embedded 空态与候选用尽说明俱全；战斗形象面 actor 侧
    uploader/import/深链零引用、`BattleSpritePicker` 未传 `onOpenDefinition`（:1420-1426）故不渲染
    打开动作，uploader 仅存于 EnemyAnimPreview 与 BattleSpriteLibrary 两个合法 owner，
    `.bsu-frame-grid` 滚动 owner 只剩 library/enemy 两区。本人复跑聚焦 11 files / 161 tests 全绿；
    720px 实机：敌队窄壳字段 550px、动作 32×32 在界内、document 零溢出（与 Codex 证据一致）；
    Shop 720px identity 476px 不缩省略号、三动作 32×32、行无全框、外卡持框。
  - **返工项（唯一，分类失实）**：`item/craft-recipes` 在 registry 登记为
    `contentSurface: "repeat-row"`，但其行根仍是裸 `<div className="item-recipe">`
    （ItemUseEffectEditor.tsx:552），由**私有 CSS 持框**——`padding: 9px; border: 1px solid var(--line);
    border-radius: 6px; background: color-mix(...)`（editor.css:10274-10281），全文件无 DsRepeatRow
    消费（本人 grep 仅 :468 一处属 resource-reward-tiers）。按本卡已签 taxonomy（KS4/GM-S1：
    repeat-row 的行 owner 必须为 DsRepeatRow，分类与证据 owner 脱绑即 fail-closed；object-card =
    存在语义 frame owner 且未消费 DsRepeatRow）及内容语义（配方 N 标题 + 排序/删除对象级动作 +
    材料/产物复合 body，与 `.casualty-item-card`、`.sprite-action-step` 同型），该项真实分类是
    **object-card**。现登记使 repeat-row 计数虚为 10（实为 9/13），且正是 KS4「只校验字段已填写不算
    闭环」要防的失配：现行门禁只对六个红项断言 DsRepeatRow 消费，craft-recipes 不在其列而漏网。
    GLM accept 行核对了桶分布计数与 fingerprint 绑定，但未逐项核对 repeat-row 桶成员的真实消费，
    本席与此点分歧，证据如下可复现。
    最小返工条件（二选一并补门禁）：**A（建议，零视觉变化）**——registry 将 `item/craft-recipes`
    改登 `object-card`（contentOwner fingerprint `className="item-recipe"` 不变），同步
    reorder-surface-adoption.test.ts 桶计数断言为 repeat-row 9 / object-card 13；
    **B**——若产品裁决配方确应为行式表面，则迁移 `.item-recipe` 真消费 DsRepeatRow 并删私有框皮肤。
    无论 A/B：`reorder-surface-adoption.test.ts` 必须把「repeat-row ⇒ 真实消费 DsRepeatRow」与
    「object-card ⇒ 未消费 DsRepeatRow」两条桶不变量从六红项扩到**全部 29 项 registry 驱动断言**，
    使分类与证据 owner 脱绑即 fail-closed（KS4/GM-S1 本意）。复现命令：
    `sed -n '10274,10281p' packages/editor/src/ui/editor.css`；
    `sed -n '552,556p' packages/editor/src/ui/ItemUseEffectEditor.tsx`；
    `node -e "const r=require('./packages/editor/src/ui/design-system/reorder-adoption.json');console.log(r.families.flatMap(f=>f.adoptions).find(a=>a.adoptionId==='item/craft-recipes').contentSurface)"` → `repeat-row`。
  - 其余九项 repeat-row 登记已逐一核对真实消费 DsRepeatRow（startup-party/inventory、poison/ticks、
    六红项），无误判；12 项 object-card 登记均未消费 DsRepeatRow。GLM 的 P2（DsActionGroup 未登
    DS 文档/未升 minor）与 P3（`.shop-stock-actions .mini` 死规则、cssRule 首规则体局限）观察与本
    counter 不冲突，返工轮可一并收口但非本 counter 的放行条件。未修改实现，未代签 GLM。
- Kimi 增量复审: **accept（2026-08-31，只读核 bf129290 增量，不重审已通过范围）**。上方
  2026-08-30 counter 的全部返工条件已闭环：①A 方案落地——`item/craft-recipes` 改登 `object-card`
  （本人 git diff 证实，fingerprint `className="item-recipe"` 不变），桶计数断言同步为
  repeat-row 9 / object-card 13 / edge-to-edge 2 / continuous 5，rail 28/1 不变；②桶不变量按
  要求扩展并超预期收紧——新增 registry 驱动「binds every row/card surface classification to its
  real JSX owner」门禁：TS AST 按 exact class token 定位唯一 owner，repeat-row 强制 owner tag 为
  `DsRepeatRow`，object-card 强制自身与祖先链均无 `DsRepeatRow`；红先行成立——旧 registry 下
  craft-recipes=repeat-row 且 owner tag=div，桶计数与消费断言双双必红（本人逻辑核对），Codex
  记录的红测亦先命中二者；③本人复跑 reorder-surface-adoption + reorder-adoption + boundary +
  ItemUseEffectEditor → 4 files / 79 tests 全绿。GLM P2 另开 DS 版本卡、P3 不混入本轮，与本人
  counter 放行条件一致。A 方案零视觉变化，按卡面无需重跑浏览器档。无剩余返工项；未修改实现，
  未代签 GLM，未标 done。
- GLM: **accept（2026-08-30，只读终审 HEAD `e901eb75`（build 链 05f46e37→3c2852b8→1e0a6db1→e901eb75），全部钉逐条独立核验 + 本人复跑 12 files / 185 tests，非复述 Codex）**：
  - **GM-S1/KS4 registry 双轴**：本人脚本复算 registry v2——29 adoption / 32 dataPaths / 17 家族 / 19 owner 与 baseline 块一致；contentSurface 分布 **10 repeat-row + 12 object-card + 2 edge-to-edge + 5 continuous = 29**，railLayout **28 inline + 1 overlay**（唯一 overlay = frame-animation-timeline）；每条 adoption 恰 12 键含 contentSurface/contentOwner/railLayout/railOwner，两 owner 指纹经 `reorder-surface-adoption.test.ts:45-46` 逐一绑定真实源文件；桶成员精确断言（2/5 ID 清单、overlay 单例、六红项=repeat-row :72-80、story 两 scheme=object-card :81-82）。
  - **GM-S2/KS2 六红项迁移与旧皮肤清零**：六 owner 全部 `DsRepeatRow density="compact"`（EnemyTab.tsx:381、EnemyTeamTab.tsx:446、ItemUseEffectEditor.tsx:468、ActorMode.tsx:1637、CommandForm.tsx:454,1564）；本人逐块直读现存 CSS——`.rule-row`(:7243)/`.enemy-team-slot`(:10757)/`.item-amount-row(.ordered)`(:10287+)/`.actor-initial-magic-row`(:2845)/`.cf-dialog-row`(:6949)/`.cf-party-row`(:6967) 只剩列轨与 justify，border/background/radius/padding/margin/固定 flex 全部清除（旧 `.cf-dialog-row` 底色圆角形态已消灭）；门禁 `reorder-surface-adoption.test.ts:97-117` 同时反查 wrapper 中性与六选择器皮肤、禁 `.rr-*` flex；窄容器动作组**整组下沉**（item-amount/cf-party `grid-column: 1 / -1` @520px、enemy-team container-type、shop @560px）。
  - **GM-S3 32px 公共下限**：新增公共 `DsActionGroup`（recipes.tsx:372-382）——compact 图标按钮 `--ds-hit-target-compact`(32px)、文字按钮 min 32×32（recipes.css:889-900），Shop 三枚动作经该组收口（ShopTab:227），下架按钮不再低于下限；Shop ≤560px identity 换行（`overflow-wrap:anywhere; white-space:normal`，editor.css:3799-3804）而非仅省略号。
  - **GM-S4 中性 wrapper + 文档零漂移**：`.ds-reorder-item` 规则体无 border/padding/background/gap（门禁断言 :99-101）；DS-C.4d/DS-F.4/RF-21 taxonomy 与最终 registry 桶零矛盾（四类 + inline/overlay + 禁用混搭成文）；DS 版本三处一致 2.20.0。
  - **GM-S5 不重开 DRAG-1**：`reorder.tsx / reorder.css / reorder.test.tsx` 自 build 起点（9b1d48cf）到 HEAD **零 diff**（本人 git diff 证实）；状态机 22/22 绿、allowlist 11 条三态闭合、别名/展开负例保持。
  - **用户返工①（initial-magic）**：添加唯一存在于 `ActorPanel actions` 头部（ActorMode.tsx:1487-1506，deferred owner + 分态 title），body 添加入口 0；行级删除为 `DsActionGroup` 内 danger `DsIconButton`，aria/tooltip=`删除初始仙术：${label}`（:1661-1668）；embedded 空态 + 候选用尽双态（:1674-1688）。
  - **用户返工②（战斗形象纯选择器）**：ActorMode 对 `BattleSpriteUploader/prepareBattleSpriteImport/AddBattleSpriteCommand/onOpenBattleSprite` 引用**归零**（本人 grep exit=1）；共享组件仅由资源库 `BattleSpriteLibrary` 与 `EnemyAnimPreview` 消费，adoption 条目 source 均绑定这两个合法 owner 而非 ActorMode；actor 面无 file input / 导入 / 编辑深链。
  - **本人复跑**：reorder-surface 4/4 + reorder-adoption 6/6 + 六 owner/Shop/recipes 7 files 94/94 + add-picker/boundary/reorder 状态机 3 files 81/81 全绿；按纪律未重复 editor 全量。
  - **非返工观察（P2，建议随下一次 DS 触碰卡或小文档任务收口）**：`DsActionGroup` 为本卡新增、6 个生产文件消费的公共 recipe，但 `editor-design-system-v1.md` 零登记且未随卡升 minor（2.20.0 系先前 boolean 卡 e66f65ae 所升）——32px 组下限与「不可拆组」契约目前只由 surface gate CSS 断言钉住，规范文档应补登并升 2.21.0（index.ts/tokens.css/boundary.test/doc 四处同步）；因本卡验收文本只要求 DS-C.4d/RF-21 taxonomy 同步（已满足）且无版本矛盾，不构成返工。P3 卫生项：`editor.css:3784-3787` `.shop-stock-actions .mini`（28px）为 ShopTab 已无消费者的死规则，建议顺手删除。门禁加固建议：`cssRule()` 只取每个选择器首个规则体，后续 @container/@media 内同选择器违规可绕过该断言（当前代码干净），可改 matchAll 全量断言。
  - 无必须返工项；未修改实现文件，未代签 Kimi。
- GLM 增量复审: **accept（2026-08-31，只读核 `bf129290` 增量，不重审已通过范围；本行取代本席
  2026-08-30 对 `e901eb75` 的 accept——其 10/12 桶口径已被 Kimi counter 证实失实）**：
  - **承认漏项**：Kimi 定性准确——本席上轮核对了桶计数与两 owner 指纹绑定，但**未逐项核对 repeat-row
    桶成员的真实 DsRepeatRow 消费**，`item/craft-recipes` 从该缝隙漏网。counter 证据本人独立复核成立：
    `.item-recipe` 私有持框（editor.css:10274-10281 padding/border/radius/background）、行根裸
    `<div className="item-recipe">`（ItemUseEffectEditor.tsx:554）、全文件 DsRepeatRow 唯一消费 :468
    属 resource-reward-tiers——按已签 taxonomy 真实分类是 object-card。最小返工条件（A/B + 全 registry
    桶不变量）与 KS4/GM-S1 本意一致，本席背书。
  - **A 增量核验**：`git show bf129290 --stat` 证实仅 registry JSON（恰 1 行翻转）+ 新门禁 109 行 +
    文档，**生产 TSX/CSS 零变化**；本人脚本复算桶分布 **9/13/2/5 + rail 28/1**；剩余 9 个 repeat-row
    成员（六红项 + startup-party/inventory + poison/ticks）均为本席先前逐一直读核实的真实消费者，
    13 个 object-card 含 craft 与六条 EffectEditorCard 效果链、sprite-action-steps、
    frame-animation-timeline、story 两 scheme。
  - **新门禁核验（reorder-surface-adoption.test.ts:167-192）**：`jsxOwners` 以 exact class token
    集合 AST 定位并要求**恰一个 owner**（指纹子串多义在 AST 级被拒，较旧字符串 contain 更紧）；
    repeat-row ⇒ tag 必须 `DsRepeatRow`；object-card ⇒ 自身与**祖先链**均无 DsRepeatRow——Kimi 要求的
    两条桶不变量落地且被祖先链检查加强。
  - **红态能力独立模拟（本席 node 脚本内存翻转，未改文件）**：旧登记下两条断言**双双确定红**
    （计数 10/12 ≠ 9/13；craft owner 唯一命中 tag=`div` ≠ DsRepeatRow），与 Codex 红测记录互证。
  - **复跑（本人执行）**：reorder-surface-adoption 5/5 + reorder-adoption 6/6 = 11/11 全绿。
  - **边界与条件**：本 accept 覆盖 craft 增量及此前 build 链的全部既有核验项（除被修正的桶口径外均
    维持有效）；2026-08-31 用户第四轮返工（四向行走预览改共享 embedded 语义动作架）当前 `rework`、
    Codex accept 失效，**本 accept 不覆盖该未实现增量**，落地后本席需再做只读复审。**P2 跟踪条件**：
    「DsActionGroup 规范登记 + 2.21.0 另开 DS 版本卡」承诺当前看板无对应行——要求本卡收口 done 前由
    Codex 开卡登记或看板留行，避免悬空。未修改实现文件，未代签 Kimi，未标 done。
- counter / 返工处理: Kimi counter 已按建议 A 完成：craft-recipes 改登 object-card，桶计数 9/13/2/5；
  两条真实 owner 不变量扩展为全 registry 门禁，并进一步收紧为 exact class token、唯一 owner 与 object-card
  祖先链无 DsRepeatRow。Kimi 增量复审 accept（2026-08-31），全部 counter 闭环；原 counter 保留为
  历史事实。用户四向预览旧皮与战斗绑定层级返工均已完成，等待两席增量复审。用户最新澄清取代先前
  “连资源库深链也不保留”的过宽解释：允许“在资源库编辑”导航，但角色页仍禁止编辑/导入。GLM P2 已在看板登记
  `ED-ACTION-GROUP-SPEC-1` draft（DsActionGroup 规范 + 2.21.0）；P3 卫生项不混入本次必要返工。
- 缺签豁免: N/A
- done 准入结论: blocked（Kimi + GLM 对 `bf129290` craft 增量 accept 均已签；Codex 已完成四向预览、
  战斗绑定与战斗页单列视觉返工并刷新 accept，当前只缺 Kimi/GLM 对视觉增量复审与用户验收，齐前不得标记 done）

## Draft: 设计与风险

### 设计结论

- 采用矩阵新增 `contentSurface + railLayout` 两轴分类，但不改变已有 adapter / identity / command / revision 字段。
- `DsReorderItem` 永远保持 surface-neutral；同构字段项复用 `DsRepeatRow`，有独立 identity / selection / object action
  或 details 任务边界的对象保留领域卡，连续列表由父容器持边框；inline / overlay 只说明 rail 位置。
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
- 结论: agree（2026-08-30,Kimi KS1-KS4 + GLM GM-S1~S5 均已写回,两席独立复算 29 项分类并各自完成
  反证,结论收敛:四桶闭合、六红项全判 repeat-row、story 两 scheme 保持 object-card canary）。
- 必改项: KS1-KS4 与 GM-S1~S5 全部为 build 必落钉。
- 是否建议进入 build: 是（签字面 allowed;Codex 为唯一 Coding Owner,开工时状态转 build）。

## Build: 实现与自测

- Coding Owner: Codex（2026-08-30，唯一实现方；build 完成）
- 修改文件: `EnemyTab.tsx`、`EnemyTeamTab.tsx`、`ItemUseEffectEditor.tsx`、`ActorMode.tsx`、
  `CommandForm.tsx`、`ShopTab.tsx`、Design Lab RF-21、design-system recipes / adoption matrices /
  CSS census、`SpriteFrames` / `SpriteFrameWorkbench` / world sprite semantic helper 与相应测试。
- 实现摘要:
  - 新增公共 `DsActionGroup`，compact 动作的图标按钮和文字按钮最小命中区均为 32px，动作组不可拆。
  - AI 规则、敌队固定槽、资源奖励档、初始仙术、对话行、设置队员六个 owner 全部迁为
    `DsRepeatRow`；删除旧行的私有 padding/background/radius/fixed-flex surface，只保留领域列语义。
  - `reorder-adoption.json` 升到 v2，29 项逐项登记 `contentSurface/contentOwner +
    railLayout/railOwner`；公共 wrapper 保持 surface-neutral，story 两 scheme 保持 object-card canary。
  - Shop 保持 edge-to-edge 外框 + divider；560px 容器以下 identity 可换行、三枚动作整体下沉且均为
    32×32px。Design Lab RF-21 的字段行同步改用公共 repeat-row。
  - 用户返工后，`actor/initial-magic` 集合级添加归入 panel header actions，行级删除归入 compact
    `DsActionGroup` 的 danger `DsIconButton`；补齐 empty / candidates-exhausted 状态，删除 body 添加入口与
    旧 `.actor-initial-magic-editor > .btn` 规则，并刷新 add-picker deferred owner / fingerprint。
  - 角色战斗形象面移除 `BattleSpriteUploader` / `prepareBattleSpriteImport` / `AddBattleSpriteCommand` 与
    `onOpenBattleSprite` 深链，只保留库内选择、`SetActorBattleSpriteCommand` 换绑和全动作预览；共享 picker
    以 callback 是否存在决定是否渲染打开动作，actor adoption 精确移除上传器及其滚动/字段 owner。
  - Kimi counter 返工采用 A：`item/craft-recipes` 改登 object-card，零生产视觉/行为变化；新增全 registry
    row/card owner AST 门禁，exact class token 只允许一个真实 owner，并检查 object-card 祖先链不含
    DsRepeatRow，防止错误 wrapper 藏在 fingerprint owner 外层仍假绿。
  - 四向预览删除角色专属旧实现和 CSS，抽出资源库/角色页共用 world-sprite semantic helper，并将角色页
    接到 `SemanticFrameShelf presentation="embedded"`；资源库 full 模式与编辑 owner 不变。只读面不再生成
    无 callback 的动作按钮，命名动作按每步 duration 与 loopFrom 真值播放。
  - 战斗绑定区使用与四向相同的 raised 背景、padding/divider、字段标签与概念 help；选择项拆成可读名称 +
    `id · profile summary`，恢复经用户澄清批准的资源库导航按钮。Actor 处明确使用 default 尺寸，导入和
    内联编辑能力仍不存在。
  - 四向绑定区清除 compact 30px 与 720px 私有上限，选择器/导航统一为 default 36px，并在宽容器铺满
    binding 内容行；窄容器继续复用公共 control group 的整组纵向满宽回退。
  - 战斗与成长页使用专用单列 grid；战斗形象长预览与初始装备/仙术短配置改为同宽上下排列，消除双列
    等高产生的大面积空白，其他关系页继续保留通用双列合同。
- 运行命令:
  - 聚焦：10 files / 108 tests；adoption / field-layout / number / add-picker / catalog fingerprint
    逐项复跑通过。
  - `pnpm --filter @type-pal/editor check`：178 files / 1460 tests（含 typecheck）全绿。
  - `pnpm --filter @type-pal/editor audit:design-system`：89 files / 2 evidence-bound exceptions。
  - 用户返工聚焦：`ActorMode.test.tsx` + add-picker / reorder adoption gate，3 files / 24 tests；独立
    `typecheck` 与 design-system gate 全绿，`git diff --check` 通过；未重复 editor 全量。
  - 纯选择器返工聚焦：`ActorMode.test.tsx` + `BattleSpritePicker.test.tsx`，2 files / 17 tests；独立
    `typecheck` 与 design-system gate 全绿，`git diff --check` 通过；未重复 editor 全量。
  - Kimi counter 返工聚焦：reorder-surface-adoption 5 + reorder-adoption / ItemUseEffectEditor / boundary 74，
    合计 4 files / 79 tests；独立 typecheck、design-system gate、`git diff --check` 全绿，未重复 editor 全量。
  - 四向预览返工聚焦：SpriteFrames / SpriteFrameWorkbench / SpriteResourceViewer /
    BattleSpriteInlinePreview / ActorMode / boundary，6 files / 82 tests；独立 typecheck、design-system gate、
    `git diff --check` 全绿，未重复 editor 全量。
  - 战斗绑定澄清返工聚焦：ActorMode / BattleSpritePicker / boundary，3 files / 73 tests；独立 typecheck、
    design-system gate、`git diff --check` 全绿，未重复 editor 全量。
  - 四向绑定尺寸/宽度返工聚焦：ActorMode + boundary，2 files / 72 tests；独立 typecheck、
    design-system audit、`git diff --check` 全绿，未重复 editor 全量。
  - 战斗工作区单列返工聚焦：ActorMode + boundary，2 files / 72 tests；独立 typecheck、
    design-system audit、`git diff --check` 全绿，未重复 editor 全量。
- 浏览器 / 手工检查: PAL 项目 1280/900/720/640（200% 等效 CSS 宽度）检查初始仙术；720 检查
  enemy-team、Shop、RF-21 与 map layer；1280 检查四向绑定 default 尺寸、满行宽度与四方向预览；复用
  本会话既有 script scheme object-card 证据。1280 追加检查战斗工作区单列、相邻面板同宽与交互保留。
- 跳过的检查及原因: N/A

## 视觉验证记录

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: 本地 editor 6010 + 应用内浏览器 DOM / computed-style / bounding-rect 检查；1280/900/
  720/640 四档 viewport，640 作为 1280@200% 等效 CSS 宽度。
- 集中 E2E 用例 / 批次: N/A
- 截图 / 像素检查路径: `.mimosa/evidence/ED-REORDER-SURFACE-1-actor-initial-magic-720.png`
  、`.mimosa/evidence/ACTOR-BATTLE-PREVIEW-EMBEDDED-720.png`、
  `.mimosa/evidence/ACTOR-INITIAL-MAGIC-HEADER-ACTIONS-720.png`、
  `.mimosa/evidence/ACTOR-BATTLE-APPEARANCE-SELECT-ONLY-720.png`、
  `.mimosa/evidence/ACTOR-WORLD-SPRITE-EMBEDDED-720.png`、
  `.mimosa/evidence/ACTOR-BATTLE-BINDING-REFERENCE-720.png`、
  `.mimosa/evidence/ACTOR-WORLD-SPRITE-FULL-WIDTH-1280.jpg`、
  `.mimosa/evidence/ACTOR-BATTLE-STACKED-PANELS-1280.jpg`（本地忽略证据，禁止提交）。
- 结论: 初始仙术行 1px 完整边界，手柄位于行内；四档字段宽 325/656/476/396px，动作组始终在边界内，
  三枚动作 32/32/42px。敌队 5/5 repeat-row，720px 字段 550px、动作 32×32；Shop 720px
  identity 约 481px，外框 1px + 行 divider，三动作 32×32；RF-21 repeat-row / overlay rail 与
  map continuous row 均符合分类。角色战斗动作架移除重复的 preview border / shelf border / 总标题 /
  单用途身份头 / active 蓝边，只保留动作 divider 与帧卡；8 动作 / 19 帧卡完整，console error 0。
  初始仙术返工后，720px 下添加按钮只在 section header（body 同名入口 0），含公共 add icon；行级
  上移 / 下移 / 删除均为 32×32px 且完整位于 642px repeat-row 内，删除为 danger icon，aria-label 与
  tooltip 均为“删除初始仙术：气疗术”；panel / document 横向 overflow 均为 0，console error 0。
  战斗形象纯选择器返工后，720px 下 header actions=0、control actions=0、file input=0、导入/上传/编辑/打开
  按钮=0；`player-fighter` picker 与全部动作预览保留，panel / document 横向 overflow 均为 0，console error 0。
  Kimi counter 采用纯 registry/test 修正，不改 TSX/CSS 或用户可见行为，按卡面不重复浏览器验证。
  四向预览返工后，720px 下 4 个方向语义行、16 个共享帧卡、4 个动态首格；旧 preview/dir/fcell/pose
  类、shelf/group 重复 header 与预览交互控件均为 0；shelf border=0、background=transparent、track
  overflow-x=auto、panel/document overflow=0。动态帧卡与战斗动态帧卡计算样式精确一致（90px、5px、6px、
  同背景），console error 0。
  战斗绑定澄清后与四向 binding 的 background/padding/divider 精确一致；最终两处选择器与导航按钮均为
  default 36px。四向 binding 在 1280px 实机 root=1238px、control=1198px、左右 inset=20px，选择器
  1056×36、导航 136×36，已清除 720px 上限且四方向预览完整；战斗选择器显示主名称 +
  `player-fighter-0 · 玩家战斗 · 8 个动作`，导航按钮只进入资源库；header action/import/file input 均 0，
  overflow 与 console 全绿。
  战斗页单列返工后，1280px 的 grid computed columns=`1080px`；战斗形象与初始配置面板同宽 1080px、
  依次上下排列且间距 14px，不再互相拉出等高空白。8 个战斗动作、添加初始仙术 header action 与行级排序/
  删除均保留，document overflow=0、console error=0。
- 未完成项: Kimi / GLM 当前实现终审与用户验收。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: Kimi + GLM 对 `bf129290` craft 增量均 accept；Codex 已完成四向预览、战斗绑定与战斗页单列
  返工并刷新 accept，Kimi / GLM 对当前视觉增量复审 pending。此前签字保留为历史事实，不覆盖当前增量。
- 必须返工项:
  1. 角色战斗形象面导入与编辑入口已连同调用链、禁用占位动作和陈旧 adoption 全部移除（closed）。
  2. **closed（Kimi counter，2026-08-31 增量复审确认）**：craft-recipes 已改登 object-card，桶计数
     9/13/2/5；全 registry 两条 owner 不变量已实现，并补 exact token / 唯一 owner / 祖先 wrapper 防绕过。
  3. **closed pending reviewer confirmation（用户四向预览反馈）**：角色页已复用资源库语义派生 + 战斗页
     embedded shelf，旧皮与错误动画语义清零；等待两席增量复审。
  4. **closed pending reviewer confirmation（用户战斗绑定反馈与澄清）**：背景/标题问号/主次摘要/资源库导航
     对齐四向，尺寸保持战斗 default；无内联编辑或导入。等待两席增量复审。
  5. **closed pending reviewer confirmation（用户四向绑定尺寸/宽度反馈）**：四向选择器与导航已由 compact
     30px 升为 default 36px，删除 720px 上限并铺满 binding 内容行；等待两席增量复审。
  6. **closed pending reviewer confirmation（用户战斗页双列失衡反馈）**：战斗工作区已固定为单列，长预览
     与短配置同宽上下排列；等待两席增量复审。
- Accept / rework: **review**（Codex accept；等待 Kimi / GLM 视觉增量复审与用户验收）。

## 用户验收

- 用户结论: pending
- 后续任务: pending

## 交接日志

- 2026-08-31 Codex: 用户指出战斗形象长预览与初始配置短面板已不适合双列，等高 grid 造成大面积空白。
  新增 `actor-battle-detail-grid` 专用单列规则，不改变关系页通用双列或任何业务组件。红测先命中旧 class /
  缺 CSS owner；修复后聚焦 2 files / 72 tests、typecheck、design audit、diff-check 全绿。1280px 实机两面板
  均宽 1080px 并上下相邻，8 动作/添加按钮/排序动作保留，overflow 与 console 全绿；证据
  `.mimosa/evidence/ACTOR-BATTLE-STACKED-PANELS-1280.jpg`。刷新 Codex accept，转 review。
  Next: Kimi / GLM 合并复审 90f9dc6f 以来全部视觉增量；两席 accept 与用户验收齐前不得 done。

- 2026-08-31 Codex: 用户指出四向绑定仍错误使用 compact 30px 且控制组被 720px 上限截断，要求与战斗
  形象统一。删除选择器/按钮的 compact 参数与 `.actor-world-sprite-binding__control` 私有 max-width；
  保留 `<520px` 整组纵向满宽回退。红测先命中 compact class / source 参数与 CSS 上限，修复后聚焦
  2 files / 72 tests、typecheck、design audit、diff-check 全绿；1280px 实机 control 在 binding 内左右
  inset 均 20px，select/button 均 36px，四方向、overflow、console 全绿。证据
  `.mimosa/evidence/ACTOR-WORLD-SPRITE-FULL-WIDTH-1280.jpg`。刷新 Codex accept，转 review。
  Next: Kimi / GLM 合并复审 90f9dc6f 以来全部视觉增量；两席 accept 与用户验收齐前不得 done。

- 2026-08-31 Codex: 用户要求战斗精灵绑定参考四向设计，随后澄清背景与跳转按钮获准，但组件尺寸应保持
  战斗形象原规格。实现同背景/padding/divider、字段标题与圆形 help，选择器以名称 + ID + 中文 profile 摘要
  呈现并覆盖缺失/不兼容；恢复“在资源库编辑”导航链，但不恢复导入或内联编辑。战斗控件 default 36px，
  四向仍 compact 30px。聚焦 3 files / 73 tests、typecheck、design gate、diff-check 与 720px 实机全绿；
  证据 `.mimosa/evidence/ACTOR-BATTLE-BINDING-REFERENCE-720.png`。刷新 Codex accept，转 review。
  Next: Kimi / GLM 合并复审 90f9dc6f 以来的两轮视觉增量；两席 accept 与用户验收齐前不得 done。

- 2026-08-31 Codex: 用户指出角色四向行走预览仍是旧版样式。只读核验确认 `SpriteFrames` 独占私有
  纹理、硬编码方向色、帧卡/姿势卡与错误动画语义；抽出 `world-sprite-action-preview` 供资源库和角色页
  共用，角色页改用战斗预览同款 embedded SemanticFrameShelf，资源库 full/编辑能力不变。删除旧 JSX/CSS，
  修复无 callback 动作按钮，并恢复逐步 duration/loopFrom。聚焦 6 files / 82 tests、typecheck、design gate、
  diff-check 与 720px 实机全绿；证据 `.mimosa/evidence/ACTOR-WORLD-SPRITE-EMBEDDED-720.png`。看板新增
  `ED-ACTION-GROUP-SPEC-1` draft 满足 GLM P2 跟踪条件。刷新 Codex accept，转 review。Next: Kimi / GLM
  只复审本视觉增量；两席 accept 与用户验收齐前不得 done。

- 2026-08-31 GLM: 对 Kimi counter 返工增量 `bf129290` 完成增量复审，签 **accept**（取代 2026-08-30
  对 e901eb75 的 accept）。承认上轮漏项（核了桶计数与指纹绑定、未逐项核 repeat-row 成员真实消费），
  独立复核 counter 证据成立（.item-recipe 私有持框 + 裸 div + 无 DsRepeatRow）；A 增量核验：提交仅
  registry 1 行 + 门禁 109 行、生产零变化，桶 9/13/2/5 + 28/1 复算闭合，新 AST 门禁唯一 owner +
  祖先链检查落地；node 内存模拟证明旧登记下双断言必红；复跑 11/11 绿。附 P2 跟踪条件：DS 版本卡
  开卡须在本卡 done 前落到看板。四向预览返工落地后本席再复审。未修改实现，未代签 Kimi，未标 done。
  Next: Codex 完成四向行走预览 embedded 返工 → Codex 重签 → Kimi/GLM 增量复审 → 用户验收。
- 2026-08-31 Kimi: 只读增量复审 bf129290，签 **accept**。counter 全部条件闭环：A 方案落地
  （craft-recipes 改登 object-card、fingerprint 不变、桶计数 9/13/2/5，本人 git diff 证实）；
  桶不变量扩为全 29 项 registry 驱动 TS AST 门禁并超预期收紧（exact class token、唯一 owner、
  object-card 祖先链无 DsRepeatRow）；红先行成立（旧态下 craft=repeat-row 且 owner=div，计数与
  消费断言双必红，本人逻辑核对 + Codex 红测记录）；本人复跑 4 files / 79 tests 全绿。GLM P2 另卡、
  P3 不混入，与本席放行条件一致；A 方案零视觉变化，无需重跑浏览器。无剩余返工项；未修改实现，
  未代签 GLM，未标 done。Next: GLM 增量复审后交用户验收。

- 2026-08-31 Codex: 确认 Kimi counter 成立并采用 A 方案。红测先证明旧 registry 为 10/12 且
  craft fingerprint owner tag=`div`、无法满足 repeat-row owner；随后只把 craft 改登 object-card，得到
  9/13/2/5。门禁从六红项硬编码扩为全部 29 项 registry 驱动，并经只读交叉审查进一步收紧为 exact class
  token、唯一 owner、repeat-row 自身必须是 DsRepeatRow、object-card 自身及祖先链均不得是 DsRepeatRow。
  聚焦 4 files / 79 tests、typecheck、design gate、diff-check 全绿；生产 TSX/CSS/交互零变化，无需浏览器。
  GLM P2 明确另开规范版本卡，P3 不混入本轮。刷新 Codex accept，转 review。Next: Kimi / GLM 只复审
  本增量；两席当前实现 accept 与用户验收齐前不得 done。

- 2026-08-30 Kimi: 只读终审 build 链 05f46e37→e901eb75，签 **counter**。通过项（本人独立证据）：
  六红项 DsRepeatRow 真采用且旧皮肤只剩列语义（含 `.rule-row` 固定基宽改 auto-fit、`.cf-dialog-row`
  背景圆角清零）、DsActionGroup 32px 公共下限、Shop edge-to-edge + 560px 整组下沉、新门禁四断言 +
  scheme canary、公共 reorder 层零 diff、两轮用户返工实锤；本人复跑聚焦 11 files / 161 tests 全绿，
  720px 实机敌队字段 550px / 动作 32×32 / 零溢出、Shop identity 476px / 三动作 32×32。**唯一返工项**：
  `item/craft-recipes` 登记 repeat-row 但行为裸 `<div className="item-recipe">` + 私有框 CSS
  （editor.css:10274-10281），未消费 DsRepeatRow，与 KS4/GM-S1 桶定义矛盾（真实分类 object-card，
  与 `.casualty-item-card`/`.sprite-action-step` 同型）；现行门禁只查六红项消费而漏网。最小返工：
  A 改登 object-card（建议，零视觉变化）或 B 真迁移；并把两条桶不变量扩为全 29 项 registry 驱动
  断言。与 GLM accept 在此一点分歧，按协议转 rework。未修改实现，未代签 GLM，未标 done。
  Next: Codex 处置后刷新 accept，Kimi / GLM 复审增量；若分歧不收敛请用户拍板。
- 2026-08-30 GLM: 只读终审 HEAD `e901eb75`，签 **accept**（无必须返工项）。逐钉核验：registry v2 双轴
  10/12/2/5 + 28/1 机器复算闭合且指纹绑定真实源；六红项 DsRepeatRow 真采用、六块旧皮肤 CSS 逐块直读
  确认只剩列轨；DsActionGroup 32px 公共下限 + Shop identity 换行；公共 reorder 层自 build 起零 diff
  （GM-S5）；两轮用户返工（initial-magic header actions/danger icon/空态、战斗形象纯选择器与导入链
  归零、资源库合法保留）逐一实锤；本人复跑 12 files / 185 tests 全绿。附三条非返工观察：P2 DsActionGroup
  规范登记 + 2.21.0 升线待下次 DS 触碰卡收口、P3 `.shop-stock-actions .mini` 死规则、门禁 cssRule
  首匹配加固建议。未修改实现，未代签 Kimi，未标 done。Next: Kimi surface/视觉终审后交用户验收。
- 2026-08-30 Codex: 用户重申角色战斗形象面只能从精灵库选择，不能导入或编辑资源。移除 header 导入、
  uploader / import command 链与编辑深链；共享 picker 在无跳转 owner 时不再渲染禁用打开按钮，资源库及
  其他有 owner 的业务面保持打开能力。actor adoption 同步清掉上传器、`.bsu-frame-grid` 和字段 owner；
  聚焦 17、typecheck、design gate 与 720px 实机全绿，截图为
  `.mimosa/evidence/ACTOR-BATTLE-APPEARANCE-SELECT-ONLY-720.png`。刷新 Codex accept，转 review。
  Next: Kimi / GLM 按当前实现终审，签字不足不得 done。

- 2026-08-30 Codex: 完成初始仙术动作归属返工。添加移入 panel header actions；删除改为 compact action
  group 内 danger icon 并补齐 aria / tooltip；按 DS-C.4e 同步补齐 embedded 空态和候选用尽说明，清理死
  CSS 与刷新 deferred owner/fingerprint。聚焦 24、typecheck、design gate、720px 几何与 console 全绿，
  截图为 `.mimosa/evidence/ACTOR-INITIAL-MAGIC-HEADER-ACTIONS-720.png`；刷新 Codex accept，转 review。
  Next: Kimi / GLM 按当前实现终审，签字不足不得 done。

- 2026-08-30 Codex: 用户在 review 期指出初始仙术的添加按钮错误放在 panel body，行级移除也未使用
  规范的危险图标动作。直读 DS-C.2 / DS-C.3、公共 `DsWorkbenchSection.actions` 与初始队伍/道具
  合规类比后确认反馈成立，旧 Codex accept 失效，任务转 rework。Next: 由 Codex 唯一实现并聚焦复验。

- 2026-08-30 Codex: 用户在 review 期指出角色战斗动作预览叠加角色面板、preview、semantic shelf、
  单用途身份头与 active 蓝边，视觉层级过深。新增 `SemanticFrameShelf presentation="embedded"`，角色页
  隐藏重复总标题/单用途头并移除两层大边框，资源库 full presentation 不变；“上传帧带”改为可理解的
  “导入战斗形象”并补充作用说明。聚焦 22、typecheck、design-system gate 与 720px 实机全绿，Codex
  刷新 accept。Next: Kimi / GLM 按当前实现终审。

- 2026-08-30 Codex: 按 KS1-KS4 / GM-S1-GM-S5 完成 build 并转 review。六红项全部消费
  `DsRepeatRow`，29 项双轴 registry 与证据 owner 闭合，Shop 保持 edge-to-edge 并由公共
  `DsActionGroup` 收口 32px 动作命中区；聚焦 108、全量 1460、typecheck、design audit 和四档浏览器
  验证全绿。Codex accept；Next: Kimi / GLM 只读终审，未齐签不得 done。

- 2026-08-30 Kimi: 独立直读 29 项 registry 与四桶代表面 TSX+CSS、六红项行容器、公共 wrapper、N3-1
  方案卡历史真值与现门禁,复核 draft 期两提交边界(93bcab33/704a24bd 未触碰六红项)。签 premise
  verified + design agree,附 KS1-KS4 必落钉(六红项全判 repeat-row 的独立核定 / 迁移即换 owner 不叠
  边框 / 窄宽防假绿具体判据 / 门禁按桶反查真实 surface 含对象卡 canary),完成独立反证。未修改实现
  文件,未代签 GLM。三签齐,build 准入(签字面)allowed。Next: Codex 按 KS1-KS4 + GM-S1~S5 开工,
  状态转 build。
- 2026-08-30 GLM: 完成机器 census 复算（29/32/19 与四组 2+5+16+6 集合精确相等）、六红项 TSX+CSS
  逐个直读（均为无完整边框的同构字段行，独立判为 repeat-row 候选）、合法 edge-to-edge 与 16 组
  代表抽查、中性 wrapper 与 railLayout 现实性核验、draft 期两提交（93bcab33/704a24bd）边界核查
  （未触碰六红项）。签 premise verified + design agree，附 GM-S1~GM-S5 必落钉（registry 双轴
  机器冻结 / 六红项迁移红先行 / 窄宽防假绿 / 中性 wrapper 不变量与文档同步 / 不重开 DRAG-1），
  完成独立反证。未修改实现文件，未代签 Kimi。Next: Kimi 签字后三签齐，Codex 方可开工 build。
- 2026-08-30 Codex: 用户指出 Poison 内缩拖动行仅靠 divider 无法表达移动范围；完成 29-adoption 只读 census，
  确认两种合法 surface 与 6 个同型遗留点。当前仅开卡审签，不允许修改本卡范围内的六个 owner。
- 2026-08-30 Codex: 用户以脚本方案反例否决“有 gap 即 RepeatRow”的过宽解释；修订为内容语义优先，脚本方案明确
  保留 object-card。本次只修复其 reorder wrapper 后失活的卡片布局，不视为六个红项的 build。

## 下一位 Agent 提示词

```text
复审 ED-REORDER-SURFACE-1 两轮角色视觉增量（Kimi / GLM reviewer）。

任务卡：docs/ops/tasks/ED-REORDER-SURFACE-1-editor-reorder-item-surface-contract.md
当前状态：review。craft counter 已由 bf129290 闭环并获 Kimi/GLM accept；本轮只复审四向预览与战斗
绑定增量，
不得修改实现、不得重审已通过范围、不得标记 done。

增量要点：SpriteFrames 删除旧 frames-preview/dirgroup/fcell/posegroup JSX 与私有 CSS；抽出
world-sprite-action-preview 供 SpriteResourceViewer 与角色页共用；角色页改为
SemanticFrameShelf presentation="embedded" + ariaLabel="四向行走与动作帧预览"，资源库仍为 full
presentation + RawFrameInspector + 编辑 callbacks。只读面无 callback 时不再渲染动作按钮；命名动作按
逐步 duration 与 loopFrom 真值播放。boundary 门禁要求旧类 JSX/CSS 为 0。

战斗/四向绑定增量：两处 binding 背景/padding/divider 一致，字段标题 + 概念 help、选项主名称 +
`id · 中文 profile summary`、完整 title；用户澄清允许“在资源库编辑”导航，但角色页不得出现导入、
file input 或内联编辑表单。两处下拉/按钮均为 default 36px；四向控制组已删除 720px 上限，在宽容器
只保留左右 20px panel padding 并铺满整行，`<520px` 下选择器/动作组整体纵向满宽。缺失/不兼容分支
也必须保留原值并使用同一主次信息层级。

请核：资源库 full 与动作跳转不回退；角色页四向 4 行、动态首格 + 具体帧完整、命名 pose 正确；旧皮归零；
720px screenshot/DOM 证据中 frame card 与战斗动态卡 90px/5px/6px/背景一致；1280px 四向 binding
证据中 select/button 均 36px、control 只保留左右 20px inset 并铺满内容行；战斗 binding 同为 default
36px，8 动作完整，overflow/console 为 0。战斗工作区必须由 `.actor-battle-detail-grid` 固定单列；1280px
战斗形象与初始配置同宽 1080px、上下相邻，不得恢复失衡双列。可按风险复跑相关聚焦文件，不要跑 editor 全量。结论写回
当前视觉增量 Kimi / GLM accept，或给出
file:line + 复现反例 counter。`ED-ACTION-GROUP-SPEC-1` 已在看板登记，满足 P2 跟踪条件。
```

## 历史 build 交接提示词

```text
接手任务: ED-REORDER-SURFACE-1 编辑器排序项可见边界与列表表面合同——build 开工
任务卡: docs/ops/tasks/ED-REORDER-SURFACE-1-editor-reorder-item-surface-contract.md
当前状态: 三签齐(Codex + Kimi KS1-KS4 + GLM GM-S1~S5,无 counter,两席独立反证完成),
  build 准入(签字面)allowed。你是唯一 Coding Owner(Codex),开工时把 Status 转 build。
先读: 本任务卡全部签节(尤其 KS1-KS4 与 GM-S1~S5 必落钉)、AGENTS.md、
  docs/phase2/READ-FIRST.md、docs/phase2/editor/editor-design-system-v1.md(DS-F.4、DS-C.4d、RF-21)、
  reorder-adoption.json、reorder.tsx/reorder.css、recipes.tsx/recipes.css,
  六红项 owner(EnemyTab/EnemyTeamTab/ItemUseEffectEditor/ActorMode/CommandForm)。
已冻结结论(不得重开):
  1. 29 = 2 edge-to-edge + 5 continuous + 16 existing-frame + 6 debt,四桶与 registry 集合精确相等;
  2. 六红项全部判 repeat-row(Kimi KS1 与 GLM 独立收敛);story/entity-behavior-schemes 与
     story/scene-hook-variants 保持 object-card + inline rail 横向平铺 canary(220px 有界,
     保留选择态/摘要/默认徽标/方案详情),不得迁为 DsRepeatRow;
  3. DsReorderItem 保持 surface-neutral:不得给 .ds-reorder-item 全局加 border/padding/background/gap;
  4. 不重开 ED-REORDER-DRAG-1:状态机/adapter/identity/command/revision 零改动。
build 必落钉(验收时逐条核):
  - KS1/GM-S1: registry 每 adoption 登记 contentSurface + railLayout 并绑定证据 owner,
    census 29/32/19 持续闭合,分类与证据脱绑即 fail-closed;
  - KS2/GM-S2: 六红项迁移到 DsRepeatRow 时删除遗留行皮肤(.rule-row/.rr-*/.item-amount-row.ordered/
    .actor-initial-magic-*/.cf-dialog-row 背景圆角/.cf-party-row),禁止叠 border 冒充采用;
    CSS/DOM 门禁先有红态负例 fixture 再修复;shop/stock 保持 edge-to-edge,窄容器动作组整组下沉,
    图标动作恢复 ≥32×32 公共下限(现 compact=30px);
  - KS3/GM-S3: 720px/200%/长名称断言关键列最小可用宽度 + 完整动作组矩形 + 可见文案,
    不得只断言 scrollWidth;Shop 720px identity 不得只剩省略号;
  - KS4/GM-S4: 门禁按桶断言 CSS/DOM 不变量(edge-to-edge 容器 gap 0+行无 border;repeat-row 逐项完整
    border;object-card 有 frame owner 且未消费 DsRepeatRow;continuous 行无逐项 border),
    story scheme canary 进门禁;DS-C.4d/RF-21 既有 taxonomy 措辞随本卡生效,文档与最终 registry 零漂移;
  - GM-S5: reorder 状态机与 adoption 既有六断言保持绿且语义不变(只允许增量 schema 字段)。
验证要求: 六 owner 聚焦测试 + editor typecheck + design-system audit + 受影响包全量各跑一次;
  1280/900/720 与 200% 缩放代表页(逐类 repeat-row/object-card/edge-to-edge/continuous 各一,
  覆盖 inline/overlay rail)浏览器几何断言;证据写入视觉验证记录。
输出: 完成 build 与自测后重签 Codex accept 并转 review,按卡面流程交 Kimi + GLM 实现终审;
  任一必落钉无法满足时停线转 blocked,不得变相通关。
```
