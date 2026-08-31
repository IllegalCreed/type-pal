# ED-ITEM-ALCHEMY-SURFACE-1 - 炼蛊皿与紫金葫芦双炼化工作台

Status: blocked
Phase: phase2
Capability: Editor item authoring（不改变 capability-map）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: `main`
Depends On: `MIG-PAL-STORE0-SHOP-BOUNDARY-1`（移除伪 ShopDef0）；
`MIG-PAL-CRAFT-FAILURE-MESSAGE-1`（恢复炼蛊失败原文，当前 review / `62e30f56` 已重迁）；
`MIG-PAL-GOURD-FAILURE-MESSAGE-1`（恢复紫金葫芦零灵葫值原文，当前 draft / 三签 pending）

## 目标

在“物品”模块增加两个相互独立的作者页面：

1. **炼蛊皿**：编辑材料到产物的有序 `craftRecipe` 对应关系；PAL 当前为五种虫卵分别炼成蛊。
2. **紫金葫芦**：编辑 `collectValue` 的九档奖励；每行明确显示“消耗 N 灵葫值 → 产物”。

两页直接读写现有 `ItemData.use.effects`，不新建 `alchemy.json`、奖励镜像或 PAL 专用 Shop 页面。Shop 页只
显示真实商店；普通物品页对这两种复杂效果只显示摘要与“在对应页面编辑”跳转，详细增删改由双炼化页唯一持有。

## 范围

- 范围内：
  - `EDITOR_MODULES` 的物品模块新增两个独立子页：`炼蛊皿`、`紫金葫芦`；不新增一级模块。
  - 两页分别从 live items 派生唯一 `craftRecipe` 与 `drawFromResourcePool` canonical owner；PAL 当前各恰一项
    （268 / 270）。页面不把内部承载物品伪装成可新增的对象目录；零 owner、多 owner、重复 effect 均 fail-loud。
  - 炼蛊皿专页把每条 PAL_CLASSIC 规则收紧为固定“一项材料 × N -> 一项产物 × N”；玩家没有选料或组合
    合成步骤，因此行内不得出现“添加材料 / 添加产物”或材料/产物子项删除。复杂多项 shape 必须 fail-loud，
    不得静默截断；新增规则仍新增一条完整的一进一出映射。
  - 新增共享炼化工作区壳，但两页使用独立 route、标题、帮助、列表语义与测试。
  - 复用 `DsObjectWorkspace`、`DsObjectHero`、`DsWorkbenchSection`、`DsInspectorHost`；两页没有左侧
    Catalog/outliner，中央机制工作区铺满左栏与中央列；form 区使用默认 inset，配方 / 消耗值直接列表使用
    `contentLayout="list"`。
  - 继续通过 `UpdateItemCommand` 修改原 ItemData；补齐 route deep link、引用跳转、undo/redo 与删除保护。
  - Item 页撤下这两种 effect 的详细表单，只保留只读摘要、owner 物品信息和精确页面跳转，防止双编辑面。
  - Enemy 页把 `stats.collectValue` 从“战后结算/收妖值”中拆出为“灵葫咒收服/收服获得灵葫值”，并在敌人
    Catalog 与 Hero 直接显示“收服 +N 灵葫值”（含 `+0`）；明确它不是自动战后奖励。
  - 当前 canonical 收紧 `drawFromResourcePool.rewards.length === maxRoll`；current census 只有 PAL item270，
    当前为 9 === 9。若 build 前发现其他真实输入不满足，任务转 blocked，不得静默裁剪。
- 范围外：
  - 不新增独立炼化 schema / content 文件，不提升 content19，不改 SAVE8。
  - 不把炼蛊皿与紫金葫芦合并成一个页面、一个 effect kind 或一份表。
  - 不把档位成本保存为新字段；不允许任意、不连续灵葫消耗。
  - 不改变 `craftRecipe` 的“按顺序选择第一条材料充足配方”运行时语义。
  - 不改变 `drawFromResourcePool` 的随机公式、概率、世界 `collectValue` 字段或奖励结果表现。
  - 不在 ShopTab 隐藏 ShopDef0 作为 migration workaround；伪商店删除只由依赖卡修上游。

## 前提真值门

### 一句话行为 / 工程前提

炼蛊皿与紫金葫芦是两个不同物品、两个不同 effect 模型：前者是五条“材料 → 产物”配方，后者是按抽中档位
扣除同档灵葫值并发奖励；它们需要两个独立作者页面，但无需复制或搬迁现有 canonical 数据。

### 四向真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | item270 的 0x34 从 `1..wCollectValue` 随机，封顶 9，扣 `i`，发 `Store[0][i-1]`；item268 是另一条消耗虫卵炼蛊脚本。 | `reference/sdlpal/script.c:1452-1490`；`data/extracted/events/all.json:L_39713,L_39598` |
| 第一阶段 | 紫金葫芦九档与灵葫值公式已考据；炼蛊皿单列为炼蛊机制。 | `docs/phase1/game-mechanics.md:682-725`；`docs/phase1/status/item-status.md:256-258` |
| 当前二阶段 | item268 是 5 条 `craftRecipe`；item270 是 `drawFromResourcePool(resource=collectValue,maxRoll=9,rewards=9)`；Item 页内联编辑两者，Shop 错误出现 Store0。 | `projects/pal/content/items.json:9283-9466`；`packages/editor/src/ui/ItemUseEffectEditor.tsx:880-943` |
| 本任务目标 | 两个独立子页作为详细编辑唯一 owner；Item 页只摘要/跳转；canonical 仍是原 ItemData effect，runtime/schema shape 不变。 | 本卡设计与验收条件 |

### 当前 PAL 精确真值

- 炼蛊皿 item268：
  1. 毒蛇卵 117 ×1 → 蛊 148 ×1
  2. 毒蝎卵 118 ×1 → 蛊 148 ×1
  3. 毒蟾卵 119 ×1 → 蛊 148 ×1
  4. 蜘蛛卵 120 ×1 → 蛊 148 ×1
  5. 蜈蚣卵 121 ×1 → 蛊 148 ×1
- 紫金葫芦 item270：
  1. 消耗 1 灵葫值 → 行军丹 100
  2. 消耗 2 灵葫值 → 还神丹 105
  3. 消耗 3 灵葫值 → 还魂香 95
  4. 消耗 4 灵葫值 → 试炼果 112
  5. 消耗 5 灵葫值 → 舍利子 72
  6. 消耗 6 灵葫值 → 蜂王蜜 131
  7. 消耗 7 灵葫值 → 孟婆汤 97
  8. 消耗 8 灵葫值 → 蟠果 102
  9. 消耗 9 灵葫值 → 灵葫仙丹 111

### 替代解释与可证伪观察

- “做一个炼化页即可”：用户已明确要求两个页面；而两种机制的公式、字段和编辑任务不同，单页会重新混淆。
- “独立页面必须新建独立 schema”：否。现有 effect 已是 runtime / validator / save 的 canonical owner；新表会
  引入 content20 与双份迁移，却不增加用户要求的能力。
- “灵葫消耗应是可编辑 cost 字段”：否。原版与 runtime 都以数组档位 `index + 1` 作为 `tier/spent`；新增
  cost 会制造可能不连续、与概率公式冲突的第二真相。
- 会推翻本设计的观察：发现需要跨多个物品复用同一炼化定义，或现有 effect 无法表达真实公式，或存在不能重迁且
  必须保留的非 inline 输入。当前全项目 census 只有 item268 / item270 两项且现形状完整。

### 用户可见 before -> after

- `before`：Store0 被显示为商店；炼蛊皿与紫金葫芦规则藏在普通物品效果表单中，档位被误读成价格。
- `after`：商店只含真实店；物品模块分别提供“炼蛊皿”和“紫金葫芦”页面，明确显示五条配方与九档
  “消耗灵葫值 → 产物”关系。
- 用户裁决：2026-08-31 明确要求两个页面，一个展示炼蛊皿投入/产出，一个展示紫金葫芦产物/灵葫消耗。

## 上下文锚点

- `AGENTS.md`、`CLAUDE.md`、`docs/phase2/READ-FIRST.md`。
- paired migration：`docs/ops/tasks/MIG-PAL-STORE0-SHOP-BOUNDARY-1-pal-store-zero-resource-pool.md`。
- canonical schema/runtime：`packages/content/src/item.ts:148-155,947-1001`；
  `packages/content/src/validate.ts:965-982`。
- migration producer：`packages/migrate/src/migrate-content.ts:1530-1588`。
- current editor owner：`packages/editor/src/ui/ItemUseEffectEditor.tsx:880-943`；
  `packages/editor/src/core/commands.ts:2484-2517`。
- navigation：`packages/editor/src/ui/editor-navigation.ts`、`DataMode.tsx`；物品模块当前仅物品 / 商店两页。
- 公共工作区：`design-system/recipes.tsx` 的 Catalog / ObjectWorkspace / WorkbenchSection / Inspector recipes。
- 不得重新引入：Shop0 UI fallback、两机制合页、cost 镜像字段、两个详细编辑 owner、旧版本兼容入口。

## 设计方案

### 页面一：物品 > 炼蛊皿

- 页面是单一项目机制，不显示“1 件”、owner 列表或“添加炼蛊皿”；内部唯一 owner 是 PAL item268。
- 中间：Hero 显示 owner 物品；“炼蛊配方”用 edge-to-edge list，每行明确“材料 → 产物”，顺序即运行时优先级；
  每行固定一个材料选择器 + 数量和一个产物选择器 + 数量；复用 reorder / picker / Command，不复制 adapter，
  不暴露 schema 的通用多材料/多产物 authoring。
- 右侧：摘要、优先级公式、物品引用与诊断；不复制详细表单。
- 配方增删改 / 排序仅此页可做；机制 effect 本身不在 UI 新增或删除，Item 页只显示摘要和跳转。

### 页面二：物品 > 紫金葫芦

- 页面是单一项目机制，不显示“1 件”、owner 列表或“添加紫金葫芦”；内部唯一 owner 是 PAL item270。
- 中间：Hero 显示内部承载物品；form 区把固定 `collectValue` 资源显示为只读事实，只允许编辑单次最高实际
  消耗；“实际灵葫值消耗 → 奖励”用 edge-to-edge list。不得把 resource 改成任意 ID 后继续显示灵葫值文案。
- 数组位置 `index + 1` 同时是 runtime 抽中值与**本次实际扣除值**；界面不再重复显示普通排序圆圈，固定文案为
  “实际扣除 N 灵葫值 → 奖励”，只允许编辑奖励 item/count；不得出现买价、售价或可选配方。
- 增减实际消耗行必须原子同步 `maxRoll` 与 rewards 长度；重排奖励属于概率 / 消耗语义变化，必须使用明确移动动作和
  具体 aria，不得伪装成纯展示排序。
- 右侧：显示 PAL_CLASSIC 公式、当前资源 owner、奖励引用与不可达档位诊断；不编辑第二份数据。

### 唯一 owner

- 两页共同复用一个领域 adapter，但 route 与内容组件分开；不复制 state。
- `UpdateItemCommand` / EditSession history 是唯一 mutation owner；一次动作最多一条命令，undo/redo 可逆。
- Item 页对 `craftRecipe` / `drawFromResourcePool` 详细字段改为只读摘要 + 精确 deep link。
- Shop 页只拥有 ShopDef；Enemy 页只拥有敌人 collectValue；Skill 页只拥有 collectTreasure；入口页只拥有资源初值。
- Enemy 的 `collectValue` 仍由 Enemy 页唯一编辑；双炼化页只消费并解释全局 `world.collectValue`，不复制每敌数值。

## 验收条件

- IA：物品模块恰新增两个独立子页，URL / back-forward / deep link 稳定；八个一级模块不变，子页仍不超过 5。
- 数据：PAL item268 仍精确 5 条配方；item270 仍精确 9 档与上述奖励；content19 / SAVE8 / schema shape 不变。
- 唯一编辑面：Item 页无这两种 effect 的详细表单；两个新页面分别是唯一详细 owner，跨页跳转不丢选择。
- 语义：炼蛊皿显示“材料 → 产物”和优先级；紫金葫芦显示“消耗 1..9 灵葫值 → 奖励”，无价格文案。
- invariant：所有 `drawFromResourcePool` 均满足 rewards.length === maxRoll；档位从 1 连续到 N，count 正整数，
  item 引用存在；奖励移动同步改变档位，不产生 cost 字段。
- 交互：配方 / 消耗值的新增、删除、调整、picker、undo、redo 均单命令；炼蛊配方内部固定一进一出、无
  材料/产物子项增删；危险动作 danger icon + 具体 aria；窄宽动作组不拆；两页不得新增 / 删除第二个机制 owner。
- 空态：零 owner、多 owner、重复 effect、owner 物品删除、引用丢失分别有明确状态，不跳到其他对象掩盖错误。
- 测试：navigation/DataMode、两页组件、Item 摘要跳转、validator、refs/delete protection、commands、DS gate；
  受影响 editor/content 全量各只跑一次。
- 视觉：1280 / 900 / 720 与 200% 检查两页列表、formula、长名称、滚动 owner、Inspector、无横向溢出。
- 与 migration 联验：Shop 目录无 0 号；两页仍精确显示 item268 / 270 数据；不得靠 UI 隐藏 Shop0。
- 来源闭环：敌人目录和 Hero 显示每敌“收服 +N 灵葫值”（含 `+0`）；数值面板单列“灵葫咒收服”，帮助文案
  明确成功收服才增加全局灵葫值，`0` 表示不增加灵葫值；不得继续归入自动“战后结算”。

## 推进签字

### 进入 build 前：前提 / 设计

- Codex:
  - premise: **verified（2026-08-31）**——直读 0x34 / item268 脚本、current item268/270、content runtime /
    validator、现 Item editor 与导航；确认两机制独立、档位即消耗、现 effect 已足够做两页且无需新 schema。
  - design: **agree（2026-08-31）**——两个独立子页、现 ItemData 为唯一 owner、Item 页摘要跳转、form/list
    公共布局、无 cost 镜像；与 migration 卡分离。
- Kimi:
  - premise: **verified（2026-08-31，独立直读 0x34/item268 原版脚本、current items 数据、schema/
    validator/runtime、现编辑器与导航，非复述 Codex/GLM；与 GLM 证据各自独立取得后收敛）**：
    1. **primary source 实锤**:0x34 在 PAL_CLASSIC 分支 `i=RandomLong(1,wCollectValue)` 封顶 9、
       `wCollectValue-=i`、`i--` 后给 `lprgStore[0].rgwItems[i]`（reference/sdlpal/script.c:1465-1490）
       ——抽中档位 i 同时决定扣多少灵葫值与给哪档奖励，**数组档位 index+1 即消耗，不存在也不应
       新增 cost 字段**；item268 炼蛊为另一条 facing 判定消耗虫卵脚本
       （docs/phase1/status/item-status.md:256-258；game-mechanics.md:682-725 九档表逐字一致）。
    2. **current 数据本人复算**:item268 炼蛊皿 use.effects 恰 `[craftRecipe]`，5 条
       `{ingredients:[117/118/119/120/121 ×1] → products:[148 ×1]}`；item270 紫金葫芦恰
       `[drawFromResourcePool{resource:'collectValue', maxRoll:9, rewards:[100,105,95,112,72,
       131,97,102,111] ×1}]`，**rewards.length === maxRoll = 9**；全 items census：
       craftRecipe owner 恰 268、drawFromResourcePool owner 恰 270——“各恰一项、形状完整”成立。
    3. **唯一 canonical owner 实锤**：两机制已由 `ItemData.use.effects` 承载
       （packages/content/src/item.ts:148-155，craftRecipe 注“按顺序选择第一条材料充足的配方”、
       drawFromResourcePool 注“抽取 1..value 封顶后扣值按档位给奖励”），runtime/validator/save
       均已消费——不新增 alchemy.json / cost 镜像 / content20 的判断成立；
       validator 现 `rewards.length >= maxRoll`（validate.ts:977-978），收紧 `===` 对现存数据
       零破坏且消除不可达尾部歧义。
    4. **IA 实锤**:editor-navigation.ts 物品模块现恰 2 子页（物品/商店），+2 = 4 ≤ 5，
       一级模块不变；现详细双编辑面确实存在（ItemUseEffectEditor.tsx:880-943 的 RecipeEditor 与
       ordered ItemAmountList + resizeRewards），即待撤对象；`UpdateItemCommand` 是唯一 mutation
       owner（commands.ts:2485）。
    5. **替代解释排除**:“一个炼化页即可”被两机制的公式/字段/任务差异推翻（有序配方优先级 vs
       档位消耗概率池）且用户已明确两页；“需要独立 schema”被现有 effect 四字段完备性推翻；
       “灵葫消耗应是 cost 字段”被 0x34 语义推翻——cost 会制造可不连续、与概率公式冲突的第二真相。
    6. **可证伪观察**:出现第三个 craftRecipe/drawFromResourcePool owner（本人 census：无）；
       任一真实输入 rewards.length ≠ maxRoll（本人 census：无，9===9）；现有 effect 无法表达
       真实公式（schema 直读完备）；出现必须跨物品共享的炼化定义（无）——出现任一项本签字失效。
  - design: **agree（2026-08-31，附 KE1-KE6 必落钉；与 GLM GM-B1~B4 收敛互补）**：
    - **KE1（IA 钉）**:物品模块恰新增 `炼蛊皿`、`紫金葫芦` 两个**独立 route**（不合并、不新增
       一级模块），URL/back-forward/deep link 稳定，子页 2→4 ≤ 5。
    - **KE2（唯一 canonical owner 钉）**:两页直接读写现 `ItemData.use.effects`，
       `UpdateItemCommand` 唯一 mutation owner、一次动作至多一条命令；不建 alchemy.json、
       不加 cost 字段、不提升 content19/SAVE8。
    - **KE3（内容语义与呈现钉，本席 IA 核心）**：炼蛊皿页明确显示“材料 → 产物”且**顺序即运行时
       优先级**（schema 注释语义，重排=语义变化）；紫金葫芦页每行档位固定文案“消耗 N 灵葫值 →
       奖励”（N=index+1），**不得出现买价/售价/可选配方**；Item 页对这两种 effect 只留只读摘要 +
       owner 信息 + 精确跳转，详细增删改由双炼化页唯一持有。
    - **KE4（档位原子性与移动语义钉）**：增减档位原子同步 maxRoll 与 rewards 长度（现
       resizeRewards 为参考实现）；奖励重排是概率/消耗语义变化，必须明确移动动作 + 具体 aria
       （档位名进标签），不得伪装成纯展示排序；`rewards.length === maxRoll` 收紧带 census 证据与
       fail-loud（同 GM-B1/B3）。
    - **KE5（surface registry 连续钉，背书 GLM GM-B2）**：详细编辑器迁页必须在同一变更内重绑
       `item/craft-recipes` 与 `item/resource-reward-tiers` 两条 reorder adoption 的
       source/contentOwner/verification/integrationVerification 到新页面 owner，并修正
       resource-reward-tiers 的失真 dataPath（真实路径 `use.effects[*].drawFromResourcePool.rewards`；
       GLM 全项目 grep `use.resourcePool` 零命中）——29-adoption census 与 AST owner 门禁持续闭合，
       紫金葫芦档位行继续消费已登记的 repeat-row surface owner，不得新增第 30 个未登记入口或
       私造行皮肤（ED-REORDER-SURFACE-1 已冻结 taxonomy 的直接约束）。
    - **KE6（依赖方向钉）**:Shop0 清理只由 MIG 卡负责，本卡不得在 ShopTab 加隐藏规则；
       两页从 live items 派生，不建快照或镜像。
- GLM:
  - premise: **verified（2026-08-31，5/9 census 与全项目 owner census 本人脚本独立复算 + schema/
    validator/命令/编辑器一手直读）**：
    1. **item268 五配方逐字复算**：`projects/pal/content/items.json` item268 炼蛊皿 use.effects 恰
       `[craftRecipe]`，5 条 recipes 形如 `{ingredients:[{itemId:'117'..'121',count:1}],
       products:[{itemId:'148',count:1}]}`；物品名直读：117 毒蛇卵 / 118 毒蝎卵 / 119 毒蟾卵 /
       120 蜘蛛卵 / 121 蜈蚣卵 → 148 蛊——与卡面五行表逐字一致。
    2. **item270 九档逐字复算**：use.effects 恰 `[drawFromResourcePool{resource:'collectValue',
       maxRoll:9, rewards:9}]`，rewards itemId 序列 `[100,105,95,112,72,131,97,102,111]` ==
       Store[0] 九项（与 MIG 卡同源复算）；档位名 行军丹/还神丹/还魂香/试炼果/舍利子/蜂王蜜/孟婆汤/
       蟠果/灵葫仙丹与卡面表一致。**schema 无 cost 字段**（item.ts:148-155 仅 resource/maxRoll/
       rewards/unavailableMessage）；运行时 `tier = min(rolled, maxRoll)`、`reward = rewards[tier-1]`
       ——档位 index+1 即消耗成立。
    3. **全项目 owner census**：全 items 中 craftRecipe 恰 **1** 个 owner（268）、
       drawFromResourcePool 恰 **1** 个 owner（270, 9===9）——「只有两项且现形状完整」成立，
       `===` 收紧对现存数据零破坏。
    4. **validator 现状**：validate.ts:977-978 现为 `rewards.length >= maxRoll`（「至少覆盖」）——
       卡面「收紧为 ===」属实且方向正确（消除不可达尾部歧义）。
    5. **现状编辑面与命令 owner**：ItemUseEffectEditor.tsx:880-943 现内联 RecipeEditor（craftRecipe）
       与 ordered ItemAmountList（drawFromResourcePool 奖励档位 :926-932）——即待撤「详细双编辑面」；
       mutation 唯一 owner `UpdateItemCommand`（commands.ts:2484+，patch+undo 对称）。
    6. **IA 现状**：editor-navigation.ts 物品模块现恰 2 子页（物品/商店），+2 = 4 ≤ 5；一级模块不变。
  - design: **agree（2026-08-31，附 GM-B1~GM-B4 必落钉）**：
    - **GM-B1（`===` 收紧 fail-loud 钉）**：validate.ts 从 `>=` 收紧 `===` 时必须先 census **全部真实
      输入与既有测试 fixture**——任何 `length > maxRoll` 的 fixture 红即是修 fixture（改测试数据），
      不得静默裁剪或放宽断言；负例：length=maxRoll+1 的构造输入必须红。资源值低于档位的「不可达
      档位」属显示诊断，不进 validator。
    - **GM-B2（registry 迁移钉——本席新增，卡面未显式覆盖）**：详细编辑器迁页会连带迁移**两条**
      reorder adoption 的 owner 绑定：`item/craft-recipes`（现 source/contentOwner
      `ItemUseEffectEditor.tsx` + `className="item-recipe"` + verification/家族 marker 在
      ItemTab/ItemUseEffectEditor 测试）与 `item/resource-reward-tiers`（drawFromResourcePool 奖励
      ordered 行，:926-932）。build 必须在同一变更内把 source/contentOwner/verification/
      integrationVerification 重绑到新页面 owner，保持 29-adoption census 与 AST owner 门禁闭合；
      同时修正 resource-reward-tiers 的失真 dataPath `items[*].use.resourcePool.rewards`（schema
      无此路径，真实路径 `items[*].use.effects[*].drawFromResourcePool.rewards`；本人 grep 全项目
      `use.resourcePool` 零命中，dataPaths 计数 32 不变）。紫金葫芦页的档位移动若用公共
      DsReorderCollection 必须复用 resource-reward-tiers adoption（不得新增第 30 个未登记入口，
      census 门禁会红）。
    - **GM-B3（档位原子性与命令计数钉）**：增减档位必须原子同步 maxRoll 与 rewards 长度（现
      resizeRewards 以末位奖励补齐——`===` 语义下增长恰补差值、收缩同步截断）；奖励移动是概率/
      消耗语义变化，用明确移动动作 + 具体 aria（`消耗 N 灵葫值` 档位名进标签）；每个动作恰一条
      `UpdateItemCommand`，测试挂 dispatch 计数 spy（N 次 hover=0、有效动作=1、undo/redo 对称）。
    - **GM-B4（Item 页去详细面 + 测试矩阵钉）**：ItemUseEffectEditor 对这两种 kind 不得再渲染
      RecipeEditor / ordered ItemAmountList（静态门禁可断言两 kind 的 case 不含详细表单组件），
      只留摘要 + 精确 deep link；测试矩阵必须覆盖 navigation/DataMode（新 2 子页 URL/back/deep
      link）、两页组件（5 配方/9 档逐字渲染、无价格文案断言）、Item 摘要跳转、validator 正负例、
      引用与删除保护、commands 计数、DS gate；空态四分（无匹配 effect/owner 删除/引用丢失/候选
      耗尽）各有断言；1280/900/720+200% 视觉档。
  - 独立反证：①若 build 前发现第三个 craftRecipe/drawFromResourcePool owner 或任何
    `length ≠ maxRoll` 的真实输入（本人 census 恰 268/270 且 9===9）——转 blocked 不得静默裁剪；
    ②若现有 effect 无法表达真实公式（schema 直读四字段完备，runtime 已消费）——需重开 schema 卡；
    ③若 Item 页摘要跳转与两新页形成第二个详细编辑入口（GM-B4 静态断言防）——唯一 owner 失效。
- counter / 分歧: none（Kimi KE1-KE6 与 GLM GM-B1~B4 收敛互补；KE5 背书 GM-B2 的 registry 重绑与
  dataPath 修正，KE6 明确依赖方向，无冲突）
- 缺签豁免: N/A
- build 准入结论: **allowed（签字面）（2026-08-31，Codex + Kimi（KE1-KE6）+ GLM（GM-B1~B4）三签齐、
  无 counter，两席非 Owner 独立反证完成）。Codex 开工时状态转 build，仍为唯一 Coding Owner;
  实现与 MIG-PAL-STORE0-SHOP-BOUNDARY-1 按卡面依赖串行。**

### 进入 done 前：审查签字

- Codex: **counter / rework（2026-08-31）**——此前对 `54ba9c2e` + `1b090cb2` + `aacf68b7` 的 UI/code
  accept 作为历史保留，但用户复验发现 PAL item268 提示为空。直接证据确认是 migration 丢失可达 L39595 原文，
  使 current UI 与 runtime 回退成泛化“材料不足”。在 `MIG-PAL-CRAFT-FAILURE-MESSAGE-1` build/review 完成并
  重迁前，旧 accept 不再授权本卡 done。增量 `314e3a52` 的一进一出 rework 已自验通过；counter 现仅保留为
  migration done 门禁，不否定该增量实现。
- Kimi: pending
- GLM: pending
- 用户验收: pending
- done 准入结论: blocked

## Draft / Build / Review

- Draft：用户产品裁决、双机制真值、无新 schema 设计与 paired migration 边界已登记。
- Build：2026-08-31 Codex 按三签准入开工；`54ba9c2e` 完成实现，期间按用户视觉裁决撤销双页 owner Catalog，
  固定为单一机制 IA，并补 Enemy `collectValue` 来源闭环。
- Review：blocked；`314e3a52` 已完成一进一出 rework，migration 已完成 build/re迁并进入 review；本卡
  最终 review 等待 migration done 后恢复 Codex accept 并交 Kimi / GLM。

### Build / Review 证据

- 实现提交：`54ba9c2e feat(editor): add item alchemy mechanism workbenches`；用户真值复核后的文案/文档修正：
  `1b090cb2 fix(editor): clarify automatic alchemy sourcing`；固定资源展示修正：
  `aacf68b7 fix(editor): move fixed alchemy resource to inspector`；一进一出表面修正：
  `314e3a52 fix(editor): keep PAL crafting rules one-to-one`；均未推送。
- current 真值复算：craftRecipe owner 恰 item268 / 5 条；drawFromResourcePool owner 恰 item270 /
  `resource=collectValue` / `maxRoll=9=rewards.length` / 奖励仍
  `[100,105,95,112,72,131,97,102,111]`；Shop 仍 20 家 id1..20；Enemy 153 个，其中 100 个
  `collectValue>0`、53 个为 0，范围 0..99。
- exact scope：本提交未改 `projects/pal` 或 migration baseline，未新增 schema/content 文件，content19 / SAVE8
  不变；paired migration 的首次 plan / replay / 独立二次零计划证据继续见依赖卡。
- 聚焦：核心 adapter、两机制 UI、Item 摘要、Enemy 来源、navigation/DataMode/App 深链、delete protection、
  effect/reorder/add-picker/field/overflow/adoption gates 均绿；两位只读复核最终均报 P0/P1 清零。
- 全量（按纪律各一次）：content `34 files / 464 tests` 全绿 + typecheck；editor 全量第一次且唯一一次为
  `179/183 files、1490/1494 tests` 通过，4 个失败均为实现后陈旧静态期望/并发超时；修正后只复跑这 4 个
  失败文件，`4 files / 95 tests` 全绿，不重复 editor 全量；editor typecheck 全绿。
- lint：本任务新增/核心文件定向 Biome check 全绿；仓库级 `pnpm lint` 仍被任务前既有 338 项跨包 lint debt
  阻断，本卡未越界清理。
- 浏览器 1280：两页无 outliner/数量徽标/owner 新增删除；紫金葫芦 9 行、0 个重复圆圈、resource 无输入、
  document/main 均无横向溢出；增加实际消耗值 `9→10`、undo `10→9`、redo `9→10`、最终 undo 回 9。
- 一进一出 rework（`314e3a52`）：炼蛊规则正文由多项集合收紧为固定材料选择+数量 → 产物选择+数量；行内
  添加/删除材料与产物为 0，只保留新增完整对应关系、规则排序/删除。复杂 0/2 材料或产物 shape 进入现有
  机制数据错误空态，原数据与 history 不变；通用 content schema/runtime/migration 未改。
- 增量验证：core + ItemAlchemy `2 files / 13 tests` 全绿；DataMode + add-picker/number-field/field-layout/
  reorder/boundary 七个门禁的 85 项均闭合（唯一陈旧 action fingerprint 更新后精确复跑 2/2）；editor
  typecheck 与 design-system gate（91 files / 2 evidence-bound exceptions）全绿，未重复此前 editor 全量。
- 增量浏览器：1280×720 与 720×900 均显示 5 条固定一进一出规则、0 个材料/产物 add 按钮；720px
  `body.scrollWidth === clientWidth === 720`，保存按钮保持 disabled。箭头提供读屏“炼成”，4 个字段按配方号
  拥有唯一 accessible name。
- 响应式实机：通过键盘调整真实 Inspector 宽度，把 main 精确压到 893px / 718px / 660px；两机制行
  `scrollWidth <= clientWidth`，718px 两页截图无横向溢出。真实浏览器 200% zoom 仍待 Kimi/用户补验。
- 视觉证据（忽略目录，禁止提交）：
  - `.mimosa/evidence/ITEM-ALCHEMY-CRAFTING-1280.png`
  - `.mimosa/evidence/ITEM-ALCHEMY-CRAFTING-720.png`
  - `.mimosa/evidence/ITEM-ALCHEMY-SPIRIT-GOURD-1280.png`
  - `.mimosa/evidence/ITEM-ALCHEMY-SPIRIT-GOURD-900.png`
  - `.mimosa/evidence/ITEM-ALCHEMY-SPIRIT-GOURD-720.png`
  - `.mimosa/evidence/ENEMY-CAPTURE-COLLECT-VALUE-1280.png`
  - `.mimosa/evidence/ENEMY-CAPTURE-FIELD-1280.png`
  - `.mimosa/evidence/ENEMY-CAPTURE-ZERO-1280.png`

## 用户验收

- 产品方向: **approved（2026-08-31）**——用户明确要求炼蛊皿 / 紫金葫芦两个页面。
- IA 细化: **approved（2026-08-31）**——用户明确指出两者都是机制，不存在对象列表；撤销两页的 owner
  Catalog、数量徽标与新增 / 删除 owner 入口。用户进一步确认行号 N 是本次实际灵葫值扣除；界面移除重复排序圆圈，
  改为“实际扣除 N 灵葫值”。该细化不改变 canonical owner、schema、runtime 公式或双独立 route 前提。
- 来源闭环: **approved（2026-08-31）**——用户追问每个敌人的实际灵葫值是否在 Enemy 页显示；实现改为目录、
  Hero 与专属“灵葫咒收服”字段三处同源显示，替换易误读为自动战利品的“战后结算 / 收妖值”。
- 自动取材真值: **verified（2026-08-31）**——用户质疑游戏内是否需要选择原材料。独立双席与 Codex 直读
  raw item268 `scriptOnUse=39598/applyToAll`、SDLPal `PAL_GameUseItem`、L39598 的五段 0x20 失败跳链及
  二阶段 runtime，确认玩家只选择炼蛊皿，随后固定按 117→118→119→120→121 自动消耗首个足量材料；没有
  第二层原料 picker。同时修正 `docs/phase1/status/item-status.md` 中“0x81 facing/对准毒蛇卵”的陈旧误记，
  编辑器改称“自动取材规则”，明确行内下拉只供作者配置。
- 固定资源呈现: **approved（2026-08-31）**——用户指出不能修改的 `collectValue` 不应伪装成输入框；中央表单
  完全撤下该控件，只在右侧机制摘要以普通 code readout 显示“资源来源 collectValue”，该行不存在 input、textarea
  或 combobox。
- 炼蛊失败提示: **rework（2026-08-31）**——用户指出“材料不足提示”为空并质疑用途。核验确认字段有效，原版
  L39595 明有“炼蛊的材料不足”；空值来自 migration producer 漏翻译终端失败臂。禁止 UI/runtime fallback 或
  手改 current，已开 `MIG-PAL-CRAFT-FAILURE-MESSAGE-1`；该依赖完成前本卡实现验收暂停。
- 配方基数: **approved / rework（2026-08-31）**——用户指出游戏中无法选择原材料，因此行内“添加材料”会
  错误暗示组合合成。裁决每条炼蛊规则固定一项材料到一项产物；移除行内材料/产物添加与子项删除，只保留
  新增完整映射、优先级、物品选择和数量。该裁决收紧编辑器表面，不改 schema/runtime/current 数据。
- 紫金葫芦不可用提示: **rework（2026-08-31）**——用户指出该字段也为空。核验确认 0x34 在
  collectValue=0 时通过 operand0 跳 L38780，原版旁白“无任何效果”；当前 producer 漏失败臂。已开
  `MIG-PAL-GOURD-FAILURE-MESSAGE-1`，禁止 UI/runtime fallback 或手改 current；本卡继续 blocked。
- 实现验收: pending。

## 交接记录

- 2026-08-31 User/Codex: 用户指出紫金葫芦“不可用提示”为空。Codex + 三路只读审计确认 L39713
  `0x34 [38780,0,0]` 在零灵葫值时跳 L38780 三元组“无任何效果”；现 pool producer 未读 operand0。
  新开独立 `MIG-PAL-GOURD-FAILURE-MESSAGE-1`，不扩两张 review 卡、不改 UI/runtime/current；本卡新增依赖。
- 2026-08-31 Codex: `314e3a52` 完成一进一出 rework。移除 `RecipeAmountList` 的材料/产物行内新增与删除，
  改为单值字段；新增 editor-only strict guard，复杂 shape fail-loud，不收窄通用 craftRecipe。同步删除已失效的
  add-picker deferred owner、重绑 number-field helper 与 CSS census。聚焦 13 tests、七门禁 85 项、typecheck、
  DS gate 绿；浏览器 1280/720 无横溢、无脏写。Next: 等 MIG done 后恢复本卡 review，Kimi / GLM 终审本增量。
- 2026-08-31 User/Codex: 用户复验指出“添加材料”无法对应游戏操作。Codex 确认 runtime 对同一 recipe 的
  多 ingredient 是 AND 条件并自动消费，但 PAL_CLASSIC 没有玩家选料/组合步骤，当前五条也全为 1→1；该控件
  暴露了与炼蛊皿专页无关的通用 schema 能力。卡转 rework：每条规则固定一进一出，复杂 shape fail-loud，
  不改 schema/runtime/migration；最终 review 仍受 MIG done 门禁约束。
- 2026-08-31 User/Codex: build 期视觉复核发现双页被误做成 owner 对象目录。用户先指出紫金葫芦、随后确认
  炼蛊皿同理，裁决两者均为单一机制页；撤掉左侧列表 / “1 件” / 添加 owner / 删除机制，并隐藏不存在的左栏开关与
  分隔条。另确认数组位置 N 是 runtime 实际扣除 N 点灵葫值，撤掉重复圆圈序号并改为明确扣除文案。premise 与
  双 route 不变，实际 IA 由 done 前 reviewer 按本条增量复审。
- 2026-08-31 User/Codex: 用户继续追问每敌收服所得灵葫值。直读 runtime 确认只有灵葫咒 `collectTreasure`
  成功时才把 `Enemy.stats.collectValue` 累进全局值，原 Enemy 页虽有“收妖值”字段却误放在“战后结算”。本轮将其
  拆成专属收服组，并在 153 个敌人的 Catalog / 当前 Hero 显示实际 `+N`（含 `+0`）；不改 schema/runtime/data。
  复核同时发现原版 0x33 的零值跳转与 current reforge `collectTreasure -> instantKill` 对零值的行为可能不一致；
  本卡只如实显示 current “收服 +0”，不越界修改运行时，后续须另开机制真值卡核验。
- 2026-08-31 Codex: `54ba9c2e` build 收口。两位只读审查先报 effect census、use switch 绕过、resource
  误可编辑、零值失真、DS registry/测试证据等 blocker；逐项修复后复核均确认无剩余 P0/P1。content 全量绿；
  editor 全量仅跑一次，4 个静态失败精确复跑绿；1280/893/718/660 main 功能视觉证据落 `.mimosa`。状态转
  review，Codex accept；Next: Kimi / GLM 当前提交终审，用户复验，三方 accept + 用户验收前不得 done。
- 2026-08-31 User/Codex: 用户在 review 质疑炼蛊皿是否需要选料。三方独立核验收敛：原版选中 item268 后
  `applyToAll` 直接跑 L39598；0x20 按 117→118→119→120→121 逐项扣料，成功即进共同产物段，完全没有材料
  菜单。`1b090cb2` 将 Hero/规则/Inspector/Item 摘要改为“直接使用、固定优先级自动取材”，并纠正一阶段陈旧
  文档；聚焦 `3 files / 38 tests` + editor typecheck 绿，review 状态与 canonical 设计不变。
- 2026-08-31 User/Codex: 用户指出固定 `collectValue` 仍使用输入框视觉。`aacf68b7` 将其从中央 form 删除，
  只在 Inspector 以 code readout 显示；聚焦 ItemAlchemy + DS route truth、typecheck 绿，浏览器断言中央无
  “资源变量/collectValue”、Inspector 行输入控件数为 0。
- 2026-08-31 User/Codex: 用户指出炼蛊失败提示为空。三席只读证据收敛：L39606 最后 failure 指向 L39595，
  原文“炼蛊的材料不足”可达；translator 在解析 failure address 后 break，仅输出 recipes；runtime/UI 本身正确。
  开 `MIG-PAL-CRAFT-FAILURE-MESSAGE-1` 并将本卡转 blocked/Codex counter；新 MIG 三签齐前不得实现或恢复 review。
- 2026-08-31 Codex: 核对 Kimi KE1-KE6 / GLM GM-B1-GM-B4 三签齐、无 counter，状态转 build；
  按依赖先完成 Store0 migration，再实施两个独立 route 与唯一编辑 owner。

- 2026-08-31 Kimi: 独立直读 0x34 PAL_CLASSIC 公式（档位 index+1 即消耗、无 cost 字段）、item268
  五条 craftRecipe（117..121→148）与 item270 九档 drawFromResourcePool（maxRoll=9=rewards 长度，
  序列与卡面逐字一致）、全项目 owner census（恰 268/270 两项）、schema/validator（effect 即 canonical
  owner、`>=`→`===` 零破坏）、IA（物品模块 2 子页 +2=4 ≤5、现详细双编辑面实在、UpdateItemCommand
  唯一 mutation owner）。签 premise verified + design agree，附 KE1（双独立 route）/KE2（现
  ItemData 唯一 canonical owner）/KE3（材料→产物优先级与消耗 N 灵葫值→奖励的呈现语义、Item 页
  摘要跳转）/KE4（档位原子性与移动语义）/KE5（两条 reorder adoption 重绑 + dataPath 修正，背书
  GM-B2）/KE6（Shop0 只由 MIG 卡清理）。未修改实现，未代签 GLM。三签齐，build 准入（签字面）
  allowed。Next: Codex 按钉 build，与 MIG 卡串行。
- 2026-08-31 GLM: 独立复算 5/9 census（item268 五条 117..121→148 逐字、item270 九档
  [100,105,95,112,72,131,97,102,111] == Store0、全项目 owner 恰 {268}/{270}）+ 直读 schema（无
  cost 字段、tier=index+1）、validator 现状 `>=`、UpdateItemCommand、ItemUseEffectEditor 现内联
  双编辑面、导航 2+2≤5。签 premise verified + design agree，附 GM-B1（`===` 收紧 fail-loud +
  fixture census）/GM-B2（**registry 迁移钉**：craft-recipes 与 resource-reward-tiers 两条 adoption
  的 owner 绑定随迁页重绑、29 census 闭合、修正失真 dataPath use.resourcePool→真实 effects 路径）/
  GM-B3（档位原子同步 + 命令计数 spy）/GM-B4（Item 页静态断言无详细表单 + 全测试矩阵 + 四空态）。
  未修改实现，未代签 Kimi。Next: Kimi 签 IA/唯一 owner/反证后三签齐，Codex 方可 build
  （另需 MIG 卡先行或同批联验 Shop 目录无 0 号）。
- 2026-08-31 Codex: 独立核验 Store0 / item268 / item270 后，先纠正“Store0=炼蛊皿”的混淆；用户随后
  拍板两张独立页面。开本卡冻结双 route、唯一 ItemData owner 与不新增 schema 的最小方案；未修改实现。
  Next: Kimi / GLM 独立签 premise/design，三签齐前不得 build。

## 下一位 Agent 提示词

```text
终审 ED-ITEM-ALCHEMY-SURFACE-1（Kimi 或 GLM，只读 reviewer）。

任务卡：docs/ops/tasks/ED-ITEM-ALCHEMY-SURFACE-1-two-item-refining-workbenches.md
当前状态：blocked；实现提交 `54ba9c2e` + 真值文案修正 `1b090cb2` + 固定资源呈现修正 `aacf68b7` +
一进一出修正 `314e3a52`。Codex 对最新增量自验通过，但整卡 counter 仅因依赖
MIG-PAL-CRAFT-FAILURE-MESSAGE-1 尚在 review；Kimi / GLM / 用户 done 前验收 pending。
不得修改实现、不得代签另一席、签字不足不得标记 done。

已冻结结论：item268=5 条 craftRecipe（117..121→148）、item270=9 档 drawFromResourcePool
（rewards.length===maxRoll=9、序列 [100,105,95,112,72,131,97,102,111]）、全项目各恰一项；
档位 index+1 即灵葫消耗，无 cost 字段；现 ItemData.use.effects 是唯一 canonical owner。

终审重点：两页必须是无 Catalog 的单一机制；炼蛊皿是“直接使用后按 117→118→119→120→121 固定优先级
自动取材”，没有玩家原材料 picker；`collectValue` 只读，封顶后 N 是实际扣除；Item 页不能增删/
换型/关闭机制 owner；两 reorder adoption 保持 18 families / 29 adoptions / 32 dataPaths / 20 owner files；
指定中间行删除、两类移动、picker/count/delete 均一动作一命令且 undo/redo；Enemy 目录/Hero/专属字段显示
“收服 +N 灵葫值”（含 +0），不得称自动战后奖励或不可收服；Shop0 仍只由 migration 清理。

新增产品裁决：炼蛊皿每条规则必须固定 1 项材料 → 1 项产物；页面不得出现行内“添加/删除材料”或
“添加/删除产物”，但保留数量、选择器、新增完整对应关系、规则排序/删除。任何复杂 shape 必须进入错误空态且
原数据不变；不得把该限制下沉到通用 craftRecipe schema/runtime/migration。

验证证据见卡面 Build / Review 证据；请独立读 `54ba9c2e` 与当前测试。Kimi 重点审 IA/视觉并补真实 200%
缩放；GLM 重点复算 5/9、strict invariant、registry census、引用/删除/测试矩阵。输出 accept，或 file:line +
复现反例 counter；写回任务卡与交接记录。三方 accept + 用户实现验收齐前不得 done。
```
