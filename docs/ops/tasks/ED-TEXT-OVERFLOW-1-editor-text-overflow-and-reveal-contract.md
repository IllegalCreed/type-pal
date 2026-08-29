# ED-TEXT-OVERFLOW-1 - 编辑器文本截断与完整值披露合同

Status: done（2026-08-29 Codex / Kimi / GLM 三方 accept 与用户复验均通过）
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

让编辑器中确实需要单行省略的名称、稳定 ID、路径和只读值在**实际发生截断时**可通过鼠标悬浮与键盘聚焦查看
完整值，同时保持完整 DOM 文本可选择复制；按钮、菜单、Tab、短状态和结构性 nowrap 不得被机械套用 tooltip。

## 范围

- 范围内：
  - 新增公共 `DsOverflowText`，统一拥有实际 overflow 测量、hover/focus/Escape、完整值、复制与
    `DsFloatingLayer` tooltip；业务页不再手写测量或无条件 native `title`。
  - 首批迁移全部 8 个生产 `.ds-inspector-readonly` 消费点：WorldSprite 的 AssetId/路径/SHA-256、
    BattleSprite 的 AssetId/路径/SHA-256、Actor 名称 ID、Sprite Action ActionId。
  - SHA-256 不再先用 JS `slice()` 损失源 DOM；完整 hash 进入 DOM，再由 CSS/primitive 按真实宽度截断。
  - 审核共享 `DsCatalogRow`、`DsReferenceRow`、`DsListHeader`、Select/MultiSelect/AddPicker、Tabs/Menu 和业务 CSS
    截断面，按七类策略逐项决定“tooltip、选中详情、换行、禁止省略、短 token 或结构例外”。
  - 新增 `text-overflow-adoption.json`，以 route-live producer + 精确 selector + policy + reveal 证据双向治理
    `text-overflow:ellipsis` / `white-space:nowrap`，删除 stale CSS。
  - Design Lab 增加短值、长中文、40 字符英文、64 字符 ID、120 字符路径和 resize 正反例。
- 范围外：
  - 不改变 schema、save、migration、runtime、业务字段值或项目数据。
  - 不把 tooltip 变成带复制按钮的交互 popover；如未来需要一键复制，另用明确 `DsCopyButton + toast`。
  - 不给大型/虚拟目录的每一行挂一个永久 `ResizeObserver` 或 tooltip listener；selection-summary 必须由共享组件
    采用惰性/详情披露策略。
  - 不机械替换表示解释、禁用原因、快捷键或业务帮助的 `title`；它们不是“被截断的同值”。
- 明确不做：
  - 不对所有 `ellipsis/nowrap` 一律加 tooltip。
  - 不以 `aria-label` 代替鼠标用户可见的完整值出口。
  - 不在 render 阶段读取 `scrollWidth/clientWidth/getBoundingClientRect`。
  - 不用 JS 预先截短字符串后再判断 CSS overflow。

## 前提真值门

### 一句话行为 / 工程前提

当前设计规范已经要求 ID/路径截断后提供完整值，但 WorldSprite/BattleSprite 等 Inspector 只应用
`.ds-inspector-readonly` 的 CSS ellipsis，没有 tooltip 或完整值披露；同时现有 adoption gate 完全不治理文本截断，
因此必须建立 overflow-aware primitive 与分型门禁，不能只给截图路径补一个 `title`。

### 四向真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：原版没有二阶段编辑器 Inspector 与文本截断组件。 | `docs/phase2/READ-FIRST.md:1-8` |
| 第一阶段 | N/A：第一阶段没有当前 Reforge 编辑器设计系统。 | `docs/phase2/READ-FIRST.md:32-37` |
| 当前二阶段 | 规范明确“英文/ID 可省略并提供完整值”，`.ds-inspector-readonly` 强制 ellipsis；截图命中的 WorldSprite 路径及 BattleSprite 同构路径没有 `title/DsTooltip`。`DsTooltip` 无 overflow 判定且静态 code 不可键盘 focus；现有审计没有 text owner。全 governed editor CSS census 有 153 个相关 rule block / 195 selector arm，不能以 grep 一概套 tooltip。 | `editor-design-system-v1.md:79,888-892`；`recipes.css:955-963`；`WorldSpriteLibrary.tsx:1123-1131`；`BattleSpriteLibrary.tsx:1791-1800`；`controls.tsx:147-220`；`design-system-audit.mjs:414-490,4408-4438` |
| 本任务目标 | 信息型截断只在实际 overflow 时披露完整同值；动作标签不截断，长说明/路径按策略换行，短 token/结构 nowrap 精确例外；新增或陈旧 selector 均由 route-live 门禁发现。 | 用户 2026-08-29 当前截图与“类似这种显示不全的鼠标悬浮应该 tip 显示全部”裁决；本卡验收条件 |

### 用户可见 before -> after

`before`：`assets/migrated/sprites/001.rle` 在窄 Inspector 显示为 `assets/migrated/sprites/0…`，悬浮无完整值；
相同 CSS 类的 AssetId/ActionId 也可能丢失尾部，短值却可能被无条件 title 制造噪声。

`after`：仅当文本真实超出可用宽度时，hover 与键盘 focus 才出现包含完整值的公共 tooltip；扩宽后提示与额外 Tab
stop 自动消失；源节点始终保存完整、可复制字符串。按钮/菜单/Tab 不通过 tooltip 掩盖布局错误。

用户裁决：2026-08-29 用户明确确认被截断文本应悬浮显示全部，并用“类似这种”要求按共性处理。

### 替代解释与可证伪观察

- 最强替代解释：直接给两处路径加原生 `title={record.path}` 已足够。
- 反证：原生 title 会在未截断时无条件出现、键盘不可控、Escape/portal/viewport 行为不统一，也无法防住新增的
  `.ds-inspector-readonly` 或其他 reveal-required 截断面。
- 会推翻当前设计的观察：若公共 primitive 在短值上仍显示提示、在长值上无法 keyboard focus、ResizeObserver
  驱动宽度变化后状态不更新，或 tooltip 成为唯一可复制来源，则设计失败。
- 性能反证：500 行 Catalog/Select 若因本卡生成 500 个 observer/浮层实例或明显增加滚动工作，则 selection-summary
  策略失败，必须回到惰性 hover 测量或选中详情披露。

## 上下文锚点

- 阶段铁律：`AGENTS.md`、`docs/phase2/READ-FIRST.md`。
- 既有长文本合同：`docs/phase2/editor/editor-design-system-v1.md:72-104,173-177,448-456,628-636,888-892`。
- 截图直接锚点：`WorldSpriteLibrary.tsx:1123-1131`、`projects/pal/assets/index.json:10842`、
  `design-system/recipes.css:955-963`。
- 同构缺口：`BattleSpriteLibrary.tsx:1791-1812`、`ActorMode.tsx:1185-1188`、
  `SpriteActionEditor.tsx:352-355`。
- 现有 tooltip：`design-system/controls.tsx:147-220`、`design-system/floating-layer.tsx:20-166`、
  `design-system/primitives.css:412-432`、`design-system/controls.test.tsx:711-785`。
- 共享 selection/row：`design-system/recipes.tsx:214-257,658-670`、
  `design-system/controls.tsx:1836-1986,2173-2315`、`design-system/multi-select.tsx:70-90`、
  `design-system/add-picker.tsx:288-310`。
- 相关在途卡：`ED-FLOATING-LAYER-ADOPTION-1` 同样消费 `DsFloatingLayer` 并会修改公共菜单；两卡均签齐后由
  单一 Coding Owner 先完成浮层 owner 迁移，再落本卡 overflow disclosure，避免并发编辑公共 controls/recipes。
- 现有 gate 缺口：`design-system-audit.mjs:414-490,4408-4438`、`design-system/boundary.test.ts:381-403`。
- 现有 census：governed editor CSS 为 153 rule blocks / 195 selector arms；其中 DS 28 arms、业务 CSS 167 arms。
  该数字是 CSS 上界，不代表全部 route-live，最终以可达 JSX/CSS 证据为准。
- 不得重新引入：无条件 native title、业务 overflow 测量、JS slice 假省略、按钮/Tab 省略后用 tooltip 掩盖、
  大列表逐项 observer。

## 冻结设计

### `DsOverflowText`

- API 最小形态：`as?: 'span' | 'code'`、`children: string`，其余只透传安全的 span/code 属性；不接收已经截短的值。
- 自带 `min-width:0`、单行 ellipsis、`user-select:text`；源 DOM `textContent` 始终是完整字符串。
- callback ref + `useLayoutEffect` 在 commit 后读取真实节点；`ResizeObserver` 响应宽度变化，`children` 变化主动重测。
- 判定为 `clientWidth > 0 && scrollWidth > clientWidth + 1`；只在布尔值变化时更新，避免 observer feedback loop。
- 仅 clipped 时加入 `tabIndex=0`、`aria-describedby` 并启用 hover/focus/Escape；未 clipped 时无 tooltip、无额外
  Tab stop。pointerdown/copy 不得 `preventDefault`，tooltip 保持 `pointer-events:none`。
- 视觉层复用既有 `DsFloatingLayer`；overflow 测量不进入 geometry primitive。可抽取私有 tooltip interaction/bubble
  helper 与 `DsTooltip` 共用，但业务 API 保持单一。

### 七类策略

1. `informational-truncate`：名称、路径、ID、readonly、状态/上下文；允许 ellipsis，必须有同值完整出口。
2. `selection-summary`：CatalogRow、Select、AddPicker、MultiSelect；允许固定密度截断，但以惰性 reveal 或选中详情
   提供完整值，禁止大列表逐项常驻 observer。
3. `command-label`：普通按钮、菜单、Tab、导航命令；禁止 ellipsis/裁切，改为换行、overflow menu 或经批准的
   icon-only + `DsTooltip`。
4. `compact-token`：计数、序号、短 tag、单位、固定状态；nowrap 合法且无需 tooltip，若出现 max-width + hidden/
   ellipsis 自动升级为 informational。
5. `structural-nowrap`：hidden input、visually-hidden/live region、toolbar/action-slot 容器；精确登记结构理由，不提示。
6. `wrap-required`：help/error/说明和需阅读的长路径；禁止 ellipsis，使用 wrap/`overflow-wrap:anywhere`。
7. `stale-css`：route-live owner 证不出来即删除，不得长期 allowlist。

### Adoption gate

- `text-overflow-adoption.json` 每项精确登记：`source`、`selectorText`、`condition`、
  `producer{source,component,callsite}`、`policy`、`contentKind`、`reveal`、`reason`、`verification`。
- CSSOM + specificity 与 routed JSX graph 双向枚举 governed CSS 中每个 ellipsis/nowrap selector arm；新/删/改声明、
  duplicate、stale registry、live producer 不可达均 fail。
- `command-label` 命中 ellipsis 直接失败；`informational-truncate` 必须机证同值 `DsOverflowText`/可复制详情；
  `structural-nowrap` 只能绑定精确批准 owner。`aria-label` 不算视觉 reveal。
- Design Lab 只承载 fixtures，不计入 production registry；`packages/reforge` debug UI 不被 editor gate 越权治理。

## 验收条件

- WorldSprite/BattleSprite 路径在窄 Inspector 真实截断时，hover/focus 显示完整工程相对路径；短路径不显示。
- 8 个 `.ds-inspector-readonly` 面全部使用公共 primitive；SHA DOM 保留完整 hash，不再 JS slice。
- clipped/non-clipped、resize 双向变化、children 变化、0 宽、1px rounding、unmount cleanup、SSR 无 render layout read
  均有红转绿测试。
- 截断节点可选择复制，完整值来自源 DOM；Escape 关闭 tooltip 且焦点保留，dialog 内继续 portal 到最近 open dialog。
- 1280/900/720px 与 100%/150%/200% zoom 验证 20 汉字、40 英文、64 ID、120 path；无水平 document overflow。
- 目录/Select 大列表不产生逐项 observer 或滚动回归；选中详情或惰性 disclosure 可达完整 title/ID。
- 普通按钮、菜单、Tab 不出现 CSS ellipsis；help/error/说明按 wrap-required 完整阅读。
- gate 对新增未登记 ellipsis、command-label ellipsis、缺同值 reveal、stale selector/registry 必红；对短 token、
  hidden/live/container nowrap 不误报。
- 先跑 primitive + World/Battle/Actor/SpriteAction 聚焦测试；最终只跑一次 editor 全量与 typecheck。

## 验证命令（build 后执行）

```bash
pnpm --filter @type-pal/editor exec vitest run \
  src/ui/design-system/controls.test.tsx \
  src/ui/design-system/boundary.test.ts \
  src/ui/WorldSpriteLibrary.test.tsx \
  src/ui/BattleSpriteLibrary.test.tsx \
  src/ui/ActorMode.test.tsx \
  src/ui/SpriteActionEditor.test.tsx
pnpm --filter @type-pal/editor audit:design-system
pnpm --filter @type-pal/editor typecheck
```

## 风险

- wrapper 的 min-content 宽度使文本永不 overflow；primitive 必须测量真实文本节点。
- ResizeObserver 与状态更新形成反馈循环；只观察源节点且布尔去重。
- 字体晚加载、0 宽初始挂载和亚像素 rounding 造成误判。
- 条件 tabIndex 改变键盘顺序；只给真实 clipped 的静态信息节点加 focus。
- 机械替换 title 会误改说明/禁用原因；registry 必须按内容语义而不是属性名分类。
- 大型列表若逐行观测会造成性能回归；selection-summary 采用惰性或详情 owner。

## Build 证据

- 当前：实现完成并进入 review。公共 `DsOverflowText` 已统一真实 overflow 测量、条件 Tab stop、
  hover/focus/Escape 与同值 `DsFloatingLayer` 提示；首批 8 个 Inspector readonly 面全部迁移，SHA-256
  以完整字符串留在源 DOM，不再 JS 预截短。
- 全局采用：`text-overflow-adoption.json` 已登记 148 个生产 selector arm；route-live producer、CSSOM、声明签名、
  specificity、重复/stale、command-label、同值 reveal 与有证据例外均由门禁双向核验。CLI
  `--text-overflow-matrix` 只向 stdout 生成机械草案，新项保持 `UNCLASSIFIED` 且不写 registry。
- 独立提交归一：三方审查时的 149-arm candidate 混入后续 FIELD 切片的 `.skill-effect-card__index`；本卡从已审
  registry 删除该越界 selector，保留 `.item-readonly-field code`，故纯 TEXT 基线为 148 arms。历史签字中的
  149 是当时审查记录，不改写；后续 FIELD 切片落地后才会再收敛为 147 arms。
- Design Lab：RF-06 覆盖短值、20 汉字、40 ASCII、64 字符 ID、120 字符路径和同实例窄/宽/窄变化；RF-14
  继续保留字段布局矩阵。设计系统版本同步升至 2.18.0。
- 聚焦测试：overflow primitive、adoption、boundary、WorldSprite、BattleSprite、ActorMode、SpriteAction 共
  **7 files / 110 tests passed**；生成器调整后 adoption 单跑 **1 file / 9 tests passed**。
- 最终 editor 全量只执行一次：**170/171 files、1391/1393 tests passed**；仅两项
  `ProjectWorkbenchTab` 旧测试仍在表面寻找已迁入“更多操作”菜单的按钮。测试已改为走真实菜单交互，随后该文件
  聚焦复跑 **1 file / 41 tests passed**；按纪律未重复第二次全量。
- `pnpm --filter @type-pal/editor typecheck` passed；设计系统门禁 **88 files / 2 evidence-bound exceptions，passed**；
  `git diff --check` passed。
- 浏览器（1280×720）：WorldSprite 路径/SHA 真实截断时获得 Tab stop 和完整同值提示；鼠标悬浮、键盘聚焦、
  Escape 关闭并保留焦点均通过，短 AssetId 无提示。Design Lab RF-06 的 40 ASCII 在窄/宽/窄切换中依次为
  clipped/unclipped/clipped，Tab stop 与 `aria-describedby` 同步增删，页面无横向溢出。
- 提交：pending；不得混入 `.mimosa/` 或无关 WIP。

## 推进签字

### 进入 build 前设计签字（当前）

- Codex：
  - premise：**verified（2026-08-29）**。截图精确命中 WorldSprite `record.path`；共享 CSS 强制 ellipsis，生产
    节点无完整值出口，且现有 gate 不治理文本截断。完整 CSS census 证明不能全局机械加 tooltip。
  - design：**agree（2026-08-29）**。赞成 `DsOverflowText` + 七类策略 + route-live registry/gate；首批先闭合
    8 个 Inspector readonly，高密列表不得逐项 observer。
- Kimi：
  - premise：**verified（2026-08-29，本人独立直读截图路径 / 全部 8 面 / CSS / DsTooltip 现状，
    非复述 Codex）**:
    1. **截图与同构 8 面精确闭合**: `WorldSpriteLibrary.tsx:1123-1131`(AssetId / 路径 readonly
       无 title)+ `:1145` `record.sha256.slice(0, 16)…`;`BattleSpriteLibrary.tsx:1791-1800`
       (AssetId / 路径)+ `:1805-1812` **SHA-256 `title={record.sha256}` + `slice(0,16)…`**
       ——JS 截短 + native title 混合反模式实锤;`ActorMode.tsx:1185-1188`(名称 ID);
       `SpriteActionEditor.tsx:352-355`(ActionId)。恰 8 面,与卡面一致。
    2. **CSS 强制省略无出口**: `recipes.css:955-963 .ds-inspector-readonly { overflow:hidden;
       text-overflow:ellipsis; white-space:nowrap }`——DOM 有完整文本、视觉截断、无 reveal。
    3. **DsTooltip 现状**: `controls.tsx:147-222`——hover/focus/Escape/DsFloatingLayer 齐全但
       **无 overflow 测量**(传 label 即无条件显示);静态 `<code>` 无 tabIndex 逻辑、键盘不可
       达;floating-layer 复用先例在位(:206-220),抽取共用 interaction helper 可行。
    4. **规范早已要求**: editor-design-system-v1.md:888-892"英文/ID 可省略并提供完整值"——
       实现与 gate 未执行属实;153 blocks / 195 selector arms 的 CSS census 证明不能机械套
       tooltip(GLM 复核口径)。
  - design：**agree(2026-08-29，附 K-T1-K-T7 必落钉）**:
    - **K-T1(测量真实性钉)**: 必须测真实文本节点(非 wrapper min-content);`clientWidth > 0
      && scrollWidth > clientWidth + 1` 的 0 宽保护与 1px 容差写进测试;**jsdom 无法真实布局
      ——build 前必须写明测量测试方案(可控 mock RO / 属性注入层级),0 宽 / 1px rounding /
      字体晚加载 / children 变化 / unmount cleanup 红转绿,不得靠 skip 假绿**。
    - **K-T2(条件 focus 钉)**: `tabIndex=0` 仅 clipped 时设置、变不 clipped 时移除;键盘顺序
      测试(clipped→扩宽→Tab stop 消失);Escape 关闭 tooltip 后焦点保留源节点;dialog 内
      portal 到最近 open dialog(FloatingLayer 既有行为复用)。
    - **K-T3(复制畅通钉)**: 源 DOM `textContent` 恒为完整字符串 + `user-select:text`;
      pointerdown / copy / contextmenu 不 preventDefault;tooltip `pointer-events:none`;
      `aria-label` 不作唯一 reveal(门禁机检——复制来源必须是源 DOM,不是 tooltip)。
    - **K-T4(性能钉)**: selection-summary 大列表(500 行 CatalogRow / Select)不得逐项常驻
      ResizeObserver / tooltip listener——惰性 hover 测量或选中详情披露;registry 机检
      `policy=selection-summary` 且 `reveal ∈ {lazy, selected-detail}`;Design Lab 或浏览器
      证据(500 行 mount 无 N observer / 滚动无回归)。
    - **K-T5(首批 8 面 + SHA 完整 DOM 钉)**: 8 个 `.ds-inspector-readonly` 全部换
      `DsOverflowText`;SHA-256 完整 hash 进 DOM,删除 `slice(0,16)…` + native title 混合
      形态(WorldSprite :1145 / BattleSprite :1805-1812 双页 DOM 断言)。
    - **K-T6(顺序约束钉)**: `ED-FLOATING-LAYER-ADOPTION-1` 先完成浮层 owner 迁移,本卡后落
      overflow disclosure(公共 controls / recipes 单 Coding Owner 顺序,卡面 :94-95 已载);
      两卡同时 build 即停线。
    - **K-T7(门禁不误报钉)**: `command-label` 命中 ellipsis 必红;`compact-token` /
      `structural-nowrap` / `wrap-required` 不误报;`stale-css` 删除而非长期 allowlist;
      新增 / 删除 / 改声明 / duplicate / stale registry / live producer 不可达 fail-closed。
  - 独立可证伪观察: ①短值(未 clipped)仍出 tooltip → 设计失败;②长值键盘不可 focus →
    失败;③RO 驱动宽度变化后 clipped 状态不更新或布尔未去重形成 feedback loop → 失败;
    ④500 行列表 mount 出现逐项 observer → 性能失败回惰性方案;⑤jsdom 测量分支无真实覆盖
    (恒 0 宽全 false)而测试仍绿 → 假绿停线。最强替代解释"两处加 native title"不成立:
    native title 未截断也出、键盘不可控、无统一 Escape/portal,且 BattleSprite SHA 的
    slice+title 混合正是该路线恶化的活例。
- GLM：
  - premise：**verified（2026-08-29，本人独立复算 CSS census + 截图锚点/8 readonly/SHA slice/tooltip 缺口一手直读，非代理）**：
    1. **CSS census 独立复算** ✓：严格口径（`text-overflow:ellipsis | white-space:nowrap`）扫
       DS css + editor.css 得 **153 rule blocks / 199 arms**（DS 25/28 + 业务 128/171）——
       blocks 与卡面 153 精确一致、DS arms 28 精确一致（业务 171 vs 卡面 167 为 ±4 分类
       噪声，量级结论相同）：**绝不可全局机械加 tooltip，七类分型必要**。本席两轮复算
       （宽口径 164/210 vs 严格 153/199）的差异本身证明**计数对正则口径敏感——gate 必须
       以 CSSOM 解析为唯一真源**，手写数字只作基线。
    2. **截图锚点实锤** ✓：`WorldSpriteLibrary.tsx:1123-1131`——AssetId 与
       `{record.path}` 均为裸 `<code className="ds-inspector-readonly">`，无 title/DsTooltip/
       任何完整值出口；`.ds-inspector-readonly`（recipes.css:955-963）强制
       `text-overflow:ellipsis + white-space:nowrap`——截断无披露实锤。
    3. **8 个 readonly 消费点复算一致** ✓：grep 生产 TSX 恰 **8 处**，分布于
       WorldSprite/BattleSprite/ActorMode/SpriteActionEditor 四文件，与首批清单一致。
    4. **SHA-256 JS slice 实锤** ✓：`WorldSpriteLibrary.tsx:1145
       record.sha256.slice(0, 16)…`——源 DOM 确已丢失完整 hash，"完整 hash 进 DOM 再由
       CSS 截断"的修复方向正确。
    5. **DsTooltip 缺口实锤** ✓：`controls.tsx:147-151` props 仅 `{label, shortcut,
       children}`——无 overflow 判定（hover/focus 无条件开）；cloneElement 只注入
       aria-describedby 不加 tabIndex——**静态 `<code>` 子节点不可键盘 focus**，卡文属实。
    6. **规范已要求** ✓：DS-A.2（:891）"英文/id 允许…省略，并提供完整值"——现状违反
       既有规范，非新发明需求。
    7. **反例核验**：长列表——DsCatalogRow title ellipsis + 234 项目录（虚拟列表在位），
       逐项常驻 observer 即数百实例，性能反证真实；command-label——`.ds-button` 样式无
       text-overflow（按钮现状不省略），第三类"禁止 ellipsis"与现状一致是防回归而非改写。
  - design：**agree（2026-08-29，附 GT1-GT4 必落钉）**：
    - **GT1（census 口径冻结）**：gate 以 **CSSOM 解析**为唯一计数真源（本席两轮正则复算
      153/199 vs 164/210 的差异即反证）；registry arms 数 = CSSOM 枚举数机器相等，DS 28
      arms 与业务 arms 基线在建卡时以 CSSOM 输出冻结（解决 167 vs 171 的口径噪声）；
      新增/删除 ellipsis/nowrap 声明 fail-closed。
    - **GT2（七类红绿矩阵）**：每类至少一红一绿机检示例——command-label 命中 ellipsis 红
      （按钮/Tab/菜单）、informational-truncate 无同值 reveal 红（现 8 readonly 为天然红
      先行反例）、compact-token/structural-nowrap 不误报绿（短 tag/sr-only 精确 owner）、
      stale-css 删除证明绿；`aria-label` 不算视觉 reveal。
    - **GT3（首批 8 面 + SHA 全量 DOM）**：迁移后两个 Library 的 `sha256.slice(0,16)` 全部
      删除，源 DOM textContent = 完整 64 字符 hash，CSS 截断 + clipped 才披露——以测试
      断言 DOM 文本长度与复制可用性，不只断言视觉。
    - **GT4（route-live producer 双向）**：每 selector arm 登记
      producer{source,component,callsite} 且从真实 route 可达；live 而未登记红、登记而
      route-unreachable 红；Design Lab fixtures 不入 production registry；reforge debug UI
      不被越权治理。
  - 可证伪观察：①若 500 行目录因本卡出现逐项 observer/滚动回归——selection-summary 策略
    失败回炉（惰性 hover 测量或选中详情）；②若完整值只能从 tooltip 获得（源 DOM 被截短）
    ——GT3 红线停线；③若条件 tabIndex 扰乱 Tab 序或 tooltip 成为唯一 focus 出口——
    primitive 失败；④若 render 阶段出现 layout read（scrollWidth 等）——违反"commit 后
    读取"合同即返工。**何时 tooltip 反而是错误处理**：当它掩盖布局缺陷（本该换行的说明被
    ellipsis）或掩盖 command-label 截断（本该换行/overflow menu）时——tooltip 只该服务
    "信息型同值截断"，此边界已由第三/六类策略钉死。
- 独立反证审查：**Kimi（2026-08-29）**。已直读截图路径（WorldSpriteLibrary.tsx:1123-1131 + :1145
  SHA slice）、全部 8 个 readonly（World×3 / Battle×3 / Actor×1 / SpriteAction×1）、一个长列表
  先例（DsCatalogRow 大目录——PAL 敌人 153 行 / 音乐 86 / 音效 363 行既有生产规模，selection-summary
  若逐项挂 observer 即该量级 ×2）、一个 command-label 反例（DsButton / Tab / 菜单动作标签——若允许
  CSS ellipsis + tooltip，布局错误会被提示层掩盖而非修复）。回答“何时 tooltip 反而是错误处理”：
  ①文本未真实截断时——无条件 title / tooltip 是噪声且键盘不可控（native title 现状即此）；
  ②动作命令标签——应换行 / overflow menu / 经批准 icon-only，tooltip 是掩盖布局错误；
  ③tooltip 成为唯一完整值来源时——复制与可访问性必须来自源 DOM 完整字符串；
  ④大列表逐项常驻 observer / listener 时——性能失败，必须惰性 hover 测量或选中详情披露。
  可证伪观察：见 Kimi 签节①-⑤。
- counter / 分歧处理：任一席 counter 则保持 blocked；primitive API、selection-summary 披露或 registry 规模无法
  收敛时交用户裁决。
- 缺签豁免：N/A。
- build 准入结论：**allowed（2026-08-29，Codex + Kimi + GLM 三签齐、无 counter；GT1-GT4 与 Kimi 钉一并携带。前置：ED-FLOATING-LAYER-ADOPTION-1 若在途，浮层 owner 迁移先落再开工本卡，避免并发编辑公共 controls/recipes。）**

### 进入 done 前签字

- Codex：**accept（2026-08-29）**。实现、聚焦测试、一次全量、typecheck、设计系统门禁、diff check 与
  1280×720 浏览器验证均完成；全量暴露的两条旧菜单测试已聚焦复绿，无遗留功能失败。未以 tooltip 掩盖动作标签
  或说明文本，也未给高密目录逐行挂 observer。
- Kimi：**accept（2026-08-29，当前实现只读终审，本人独立直读组件 / CSS / 8 面 / registry 复算 +
  聚焦复跑，非复述 Codex）**:
  1. **DsOverflowText 测量与生命周期 ✓(K-T1)**: `controls.tsx:183-216`——
     `clientWidth > 0 && scrollWidth > clientWidth + 1`(0 宽保护 + 1px 容差)+ clippedRef
     布尔去重防 RO 反馈循环;`useLayoutEffect` commit 后读(无 render layout read);
     ResizeObserver 观察源节点(无 RO 时 window resize fallback);**`document.fonts`
     loadingdone + fonts.ready 双钩**(字体晚加载误判覆盖);children 变化主动重测;
     cleanup disconnect / removeEventListener 完整。`overflow-text.test.tsx` 含 SSR
     (`renderToString` :219)与 dialog portal(:175)——jsdom 测试方案落地非 skip。
  2. **仅真实 overflow 提示 + 键盘 ✓(K-T2)**: `open = clipped && !dismissed && (hovered ||
     focused)`(:181)——未 clipped 永不开;`tabIndex={clipped ? 0 : undefined}` +
     `aria-describedby={clipped ? tooltipId : undefined}`(:237-238)条件 Tab stop;
     clipped 才渲染 visually-hidden tooltip 文本(:252-256);Escape document keydown
     关闭(:218-227),焦点留在源节点。
  3. **完整 DOM 与复制畅通 ✓(K-T3)**: 源 Element children 恒为完整字符串;`children:
     string` API 约束(:159)不接收已截短值;`.ds-overflow-text` `min-width:0 + ellipsis +
     user-select:text`(primitives.css:415-423)+ focus-visible outline(:425-429);
     `.ds-tooltip__bubble { pointer-events: none }`(:443)+ `overflow-wrap: anywhere`
     (:444)——tooltip 不是复制唯一来源,长值在 bubble 内可换行阅读。
  4. **8 面迁移 + SHA 完整 DOM ✓(K-T5)**: 本人 grep 消费点恰 8 处(World×3 :1125/:1130/
     :1141、Battle×3 :1793/:1798/:1807、Actor :1187、SpriteAction :354);两处 SHA-256
     均为 `{record.sha256}` 完整 hash(WorldSpriteLibrary:1146、BattleSpriteLibrary:1812),
     `slice(0,16)…` + native title 混合反模式已清除。
  5. **门禁与大列表性能 ✓(K-T4/K-T7)**: `text-overflow-adoption.json` 149 arms 五类闭合
     (本人 node 复算: selection-summary:101 / structural-nowrap:28 / compact-token:7 /
     command-label:12 / informational-truncate:1);DsOverflowText 生产消费面仅在 8 个
     informational readonly(grep 无 Catalog / Select 大行列表消费)——未给高密目录逐行
     挂 observer,selection-summary 以登记策略承载。
  6. **复跑证据**: 本人聚焦 7 文件(overflow-text / controls / boundary / WorldSprite /
     BattleSprite / ActorMode / SpriteAction)**141/141 全绿**;Codex 声明的一次全量两条
     旧菜单测试已按真实交互修正复绿,与既往 stale 模式一致,不构成阻断。
  7. **顺序观察(K-T6 作者注,非 counter)**: 卡面原定"FLOATING-LAYER 先落浮层 owner 迁移,
     本卡后落"的字面顺序未被执行——TEXT-OVERFLOW 先行 build(FLOATING-LAYER 仍 draft)。
     但 K-T6 的意图(两卡不得**并发**编辑公共 controls / recipes)未违反:单一 Coding
     Owner 串行完成,无公共文件冲突。要求(已写入 FLOATING-LAYER 卡 K-F6): 其 build 必须
     基于含 DsOverflowText 的新基线逐文件核现状。
  - 无返工项。GLM accept 与用户复验前不得标记 done。
- GLM：**accept（2026-08-29，只读终审，本人一手直读 primitive/registry/首批 8 面 + 独立复跑，非代理）**：
  1. **DsOverflowText 合同逐项（GT1 前提/K-T1-K-T3）** ✓：`controls.tsx:166-279`——
     `useLayoutEffect` 后测真实节点 `clientWidth>0 && scrollWidth>clientWidth+1`
     （0 宽保护 + 1px 容差）；ResizeObserver + `document.fonts loadingdone/ready`
     双通道重测（字体晚加载覆盖）；布尔去重（`next === clippedRef.current` return——
     无 observer 反馈环）；**条件 Tab stop** `tabIndex={clipped ? 0 : undefined}` +
     `aria-describedby` 同步增删；`open = clipped && !dismissed && (hover || focus)`
     ——**未截断零提示零额外 Tab stop**；源 DOM `textContent` = 完整 children（不截短），
     tooltip 走 `DsFloatingLayer + dismissOnPointerDown:false`（不吞 pointer/copy）；
     Escape 经 layer onDismiss。无 render 阶段 layout read。
  2. **首批 8 面迁移 + SHA 全量 DOM（GT3）** ✓：四个消费文件
     （WorldSprite/BattleSprite/ActorMode/SpriteAction）grep `DsOverflowText` 在位；
     **`slice(0, 16)` 双页零命中**——SHA-256 完整 hash 进源 DOM，由 CSS 截断。
  3. **registry 149 arms + 七类分布（GT1/GT2）** ✓：policy 分布
     selection-summary 101（reveal 全部 = `selected-detail`，无一逐项 observer）/
     structural-nowrap 28 / compact-token 7 / command-label 12 / informational-truncate 1
     ——command-label 12 条（如 `.ds-menu-trigger`）由 gate 钉"命中 ellipsis 即红"；
     CSSOM 真源 + route-live producer + stale/重复/签名核验在 gate 测试内；
     `--text-overflow-matrix` 生成器只产 `UNCLASSIFIED` 草案不写 registry。
  4. **版本与门禁** ✓：DS 版本 2.18.0；88 files / 2 evidence exceptions gate 通过
     （卡面记录）；全量 170/171、1391/1393，两条旧菜单测试已改真实菜单交互并聚焦复绿。
  5. **独立复跑**：`controls + WorldSprite + BattleSprite + ActorMode + SpriteAction`
     → **5 files / 85 tests 全绿**（含 K-T1-T4 的测量/焦点/复制/resize 红转绿矩阵）。
  - 无返工项。未修改实现文件，未代签 Kimi。
- 用户复验：**accept（2026-08-29）**。用户按当前 candidate 最小复验步骤检查 hover / keyboard / Escape /
  宽度变化 / 完整值复制并明确回复 `ED-TEXT-OVERFLOW-1 通过`。
- done 准入结论：**allowed / done（2026-08-29）**。Codex + Kimi + GLM 当前实现 accept 与用户复验齐，
  无 counter、无剩余返工项。

## Review

- Reviewer：Kimi + GLM。
- 当前结论：**done**。Codex / Kimi / GLM 当前实现 fresh accept 与用户复验均通过。
- 审查重点：只在真实 overflow 时提示、完整 DOM/复制、键盘 focus、无 render layout read、大列表性能与分型门禁。

## 用户验收

### 当前 candidate 最小复验步骤（约 2 分钟）

1. 进入 **资源 -> 精灵库 -> 大世界**，选择任意 PAL 精灵资源，在右侧切到 **源资源**。
2. 把右侧面板拉窄，直到“路径”或“SHA-256”出现省略号。
   - 通过：鼠标悬浮被截断的值时，浮层显示完整原值；不是只重复省略后的短文本。
3. 用 `Tab` 把焦点移到同一个被截断值。
   - 通过：键盘聚焦也能看到完整值；按 `Escape` 只关闭提示，焦点仍留在原值上。
4. 把右侧面板拉宽，直到该值完整显示。
   - 通过：未截断时不再出现多余提示，也不再成为额外的 `Tab` 停靠点。
5. 选中文本并复制一次；也可切到 **资源 -> 精灵库 -> 战斗 -> 源文件**复查同一行为。
   - 通过：复制得到完整路径 / 64 位 SHA-256，而不是 UI 中看到的省略文本；提示层不挡住选择和复制。

以上五项都符合即可回复“ED-TEXT-OVERFLOW-1 通过”。若失败，只需说明是悬浮、键盘、Escape、宽度变化还是复制，
并附一张截图；无需检查 149 条静态门禁，那部分已经由三方审查和自动测试覆盖。

- 2026-08-29 用户完成上述当前 candidate 复验并明确回复 `ED-TEXT-OVERFLOW-1 通过`；整卡收口为 done。

- 2026-08-29 用户指出 WorldSprite 路径被截断且悬浮无完整值，明确要求同类显示不全内容用 tip 显示全部。

## 交接日志

- 2026-08-29 Codex：定位截图与同构 readonly 缺口，完成 governed CSS census 和 tooltip primitive 审计；确认规范
  已要求“省略并提供完整值”，实现与 gate 未执行。已新开独立卡，避免把 195 selector 的语义治理塞进浮层 owner
  迁移卡；未修改实现。Next：Kimi + GLM 设计签字。
- 2026-08-29 Kimi: 独立直读截图路径(WorldSpriteLibrary.tsx:1123-1131 + :1145 SHA slice)、全部
  8 个 readonly 面(World×3 / Battle×3——含 :1805-1812 slice+native title 混合反模式 / ActorMode:
  1185-1188 / SpriteActionEditor:352-355)、recipes.css:955-963(readonly 强制 ellipsis 无出口)、
  controls.tsx:147-222(DsTooltip 无 overflow 测量、静态 code 键盘不可达、FloatingLayer 复用先例)。
  签 premise verified + design agree,附 K-T1(jsdom 测量测试方案 build 前写明,不靠 skip)/ K-T2
  (条件 tabIndex + Escape 焦点保留)/ K-T3(源 DOM 完整可复制,tooltip 非唯一来源)/ K-T4(大列表
  禁逐项 observer,惰性或选中详情)/ K-T5(8 面 + SHA 完整 hash 进 DOM)/ K-T6(FLOATING-LAYER 卡
  先落,顺序约束)/ K-T7(门禁不误报 + fail-closed)七钉,并完成独立反证(长列表与 command-label
  两反例 + "tooltip 何时反而是错误处理"四答)。未修改实现文件。Next: GLM 设计签字;三签齐后
  Codex 按 K-T6 顺序 build。
- 2026-08-29 Codex：完成 `DsOverflowText`、8 面迁移、149-arm adoption gate、RF-06、规范 2.18.0 与验证；
  一次全量发现的两条 ProjectWorkbench 旧菜单测试已按真实交互修正并 41/41 复绿。已签当前 candidate accept，
  Next：Kimi + GLM 只读终审，用户复验后方可 done。
- 2026-08-29 Kimi: done 前只读终审。直读 `DsOverflowText`(controls.tsx:183-216 测量 + 布尔去重 +
  RO / fonts 双钩 + children 重测;:181 仅 clipped 开;:237-238 条件 tabIndex;:252-271 visually-
  hidden tooltip + FloatingLayer 完整同值)、primitives.css:415-445(ellipsis + user-select:text +
  bubble pointer-events:none + overflow-wrap);grep 复算 8 面迁移齐、两处 SHA 完整 hash 进 DOM
  (WorldSpriteLibrary:1146 / BattleSpriteLibrary:1812,slice+title 反模式清除);node 复算 adoption
  149 arms 五类闭合;grep 确认大行列表无 DsOverflowText 消费(K-T4)。复跑 7 文件 **141/141 全绿**。
  签 **accept**;K-T6 作者注: TEXT-OVERFLOW 先于 FLOATING-LAYER build 是字面顺序变更,但单 Owner
  串行无并发编辑公共文件冲突,意图未违反,已要求 FLOATING-LAYER 基于新基线核现状。三方 accept 齐,
  准入更新为待用户复验。未修改实现文件。Next: 用户复验收口。

## 下一位 Agent 提示词

```text
联合终审 ED-TEXT-OVERFLOW-1 当前 candidate（只读，不得修改实现）。

任务卡：docs/ops/tasks/ED-TEXT-OVERFLOW-1-editor-text-overflow-and-reveal-contract.md
当前状态：review。Codex 已完成 build、自验并签 accept；Kimi / GLM 当前 candidate accept 齐前不得标 done。

先读 AGENTS.md、docs/phase2/READ-FIRST.md、本卡四向真值/七类策略/验收条件、
docs/phase2/editor/editor-design-system-v1.md:72-104,173-177,448-456,628-636,888-892；再直读
WorldSpriteLibrary.tsx、BattleSpriteLibrary.tsx、ActorMode.tsx、SpriteActionEditor.tsx、controls.tsx、
floating-layer.tsx、recipes.tsx/.css、primitives.css、design-system-audit.mjs 与 boundary.test.ts。

当前实现：公共 DsOverflowText 仅在真实 clipped 时启用同值提示与 Tab stop；8 个 Inspector readonly 已迁移且
SHA 完整留在源 DOM；149 个生产 selector arm 由 text-overflow adoption 双向治理；RF-06 覆盖短值、20 汉字、
40 ASCII、64 ID、120 path 与窄/宽/窄变化。一次全量为 170/171 files、1391/1393 tests，唯一两条旧菜单测试
已按真实“更多操作”交互修正并聚焦 41/41 复绿；typecheck、DS gate、diff check 均绿。

Kimi 请重点复核 primitive 的 commit 后测量、ResizeObserver/fonts/SSR、条件 focus、Escape、复制与 FloatingLayer
归属，以及高密列表没有逐项 observer。GLM 请重点复核 149-arm census/声明签名/route-live 双向闭包、生成器只产
UNCLASSIFIED 草案、七类 policy 与红绿反例、RF-06 精确长度和 8 面覆盖。请分别在“进入 done 前签字”写
accept 或 counter（附 file:line、独立复跑与可证伪观察）；不得代签另一席、不得修改实现。双席 accept 与用户复验
齐前不得标 done。
```
