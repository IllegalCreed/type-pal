# ED-ITEM-ALCHEMY-SURFACE-1 - 炼蛊皿与紫金葫芦双炼化工作台

Status: review
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
`MIG-PAL-GOURD-FAILURE-MESSAGE-1`（恢复紫金葫芦零灵葫值原文，当前 review / `893da2a3` 已重迁）

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

- Codex: **accept（2026-08-31）**——`314e88e3` 将材料/产物两侧改为带可见 label 的
  `DsSelectField + DsDraftNumberField`，数量使用标准 `− / number / +` 步进器。CSS伪元素连接符两次验收均因
  测量盒不包含真实箭头像素而被用户截图推翻；`55b5e981` 最终删除伪元素，改用 viewBox 32×16、path
  `M3 8h26M23 2l6 6-6 6` 的对称 SVG。浏览器直接测 path 渲染边界 522..548、中心535，精确等于真实控件
  空隙中心535；720 path中心偏差同为0。`35843eb7` 进一步把紫金葫芦奖励从 `DsRepeatRow` 正式迁为
  Shop式 `edge-to-edge-list`：逐项卡框/圆角/raised背景清零，只保留底部分割线，输入36px、动作32px。
  用户随后以2048px截图指出扣除文案与连接符间距异常；`c8016faa` 将错误吸收剩余宽度的
  `minmax(10rem, 0.38fr)` 收紧为 `max-content`，剩余宽度仅交给奖励选择轨。宽屏直接测可见文字右缘到SVG
  path左缘由275.4px降为15px，path右缘到奖励控件同为15px；1280仍为15px/15px，无横向溢出。
  `9c38d97b` 同时修正field-layout登记中“五轨/六槽”的文字自相矛盾。
  用户随后指出窄态四层堆叠过高；`0a423136` 将奖励行改为水平连接符的紧凑两/三行，并把裸数量input升级为
  带可见“数量”label与标准stepper的`DsDraftNumberField`。只读审查发现521px奖励仅62.9px及761px第10档
  潜在溢出两个P1；`b01d10a8` 将中档改为“扣除→奖励 / 数量+动作”，root奖励轨允许安全收缩。最终521px
  reward274.9px、520px384px；761px新增第10档reward184.2px且row/main/body overflow均0，undo恢复9档。
  用户继续指出数量步进器与同排动作按钮高度不一；根因是default字段36px与compact动作组32px混排。
  `13ed6138` 将奖励组改为default，并在公共ActionGroup recipe补齐default尺寸所有权，三枚动作与数量input/±
  全部36px；`1f6b25af`把stepper同token与Craft仍compact写入防回流门禁。520/396无溢出，761第10档
  reward最终172.2px且overflow0、undo回9；Shop/Craft继续compact32px。
  用户随后指出炼蛊配方卡整体错位；`e11515f7` 修复reward动作area泄漏到Craft header产生隐式5列×2行，
  将Craft rail切到公共overlay并稳定锚定首header行，同时把公共number stepper真实border改为不占布局的inset描边。
  最终1280 header96→56px、row173→131px；handle/header中心在1280/760/520差0，identity与formula起点同为
  x103，四label与Select/stepper/箭头控制行同top/bottom且均36px。invalid/focus/forced-colors四态门禁闭合。
  聚焦测试、typecheck、DS gate、无溢出/无脏写均通过；数据/schema/runtime/migration 零变化，恢复 Codex accept。
- Kimi: **accept（2026-08-31，只读终审七提交最终组合态（`54ba9c2e` + `1b090cb2` + `aacf68b7` +
  `314e3a52` + 三张 MIG——后三者本日已由本席逐卡独立终审 accept）+ 本人静态核对、聚焦复跑与
  1280/720 实机测量，不重审已通过范围，非复述 Codex/GLM）**。按 KE1-KE6 与卡面六区逐项核验：
  - **IA 与唯一 owner ✓（KE1/KE2）**:editor-navigation 物品模块恰 4 子页（物品/炼蛊皿/紫金葫芦/
    商店）≤5，两页独立 route 且 deep link 自动聚焦 canonical owner（实机 `?page=crafting&object=268`、
    `?page=spirit-gourd&object=270`）；outliner/Catalog 按子页 capability 抑制（App.tsx
    `editorSubpageHasOutliner` + 菜单/快捷键/布局门同钉），两页无对象列表、无数量徽标、无添加/删除
    机制 owner 入口；`findItemAlchemyEffect` 重复 effect 抛错、`itemAlchemyOwners` 多 owner 抛错
    “只能存在一个 canonical owner”（item-alchemy.ts:41-51,92-93），`mutateItemAlchemyEffect`
    禁改 kind、no-op(JSON 相等)返回 false 零 dispatch、有效动作恰一条 `UpdateItemCommand`
    （:98-126）；Item 页两种 kind 仅摘要行 + `onOpenAlchemy` 精确跳转（ItemUseEffectEditor.tsx:629+
    只读摘要 + open 按钮），且机制承载物品的“启用使用能力”开关被禁用并说明原因（ItemTab.tsx:
    1791-1804）——不存在第二个详细编辑面；Shop 目录 20 家无 Shop0（本日前卡已证）。
  - **炼蛊皿 ✓（KE3）**：实机 Hero“游戏中只需使用炼蛊皿，不选择原材料；系统按固定顺序自动消耗
    第一种足量材料”；5 行“优先级 N · 首个材料充足的配方生效”，行内固定 材料 select+count →
    产物 select+count（patchRecipe 只写单元数组），**全页无“添加材料/添加产物”**（实机
    hasAddMaterial=false）；保留选择器、数量、header“添加对应关系”（完整 1→1）、排序与
    danger 删除（实机 aria=“删除配方 1”、32×32）；
    `assertSingleInputOutputCraftRecipes` 仅存在于编辑器领域层并以注释明写“通用 craftRecipe
    schema 仍允许复合配方”（item-alchemy.ts:53-65）——复杂 shape 命中即 derivationError 错误
    空态、原数据不变，一进一出限制**未下沉** schema/runtime；材料不足提示实机字段值
    “炼蛊的材料不足”（migration 来）。
  - **紫金葫芦 ✓（KE3/KE4）**:collectValue 只在 Inspector 以 `<code translate="no">` 只读呈现
    （实机 resourceIsInput=false、resourceInInspector=true，aacf68b7 落点）；maxRoll 实机=9；
    9 行实机文案逐行“实际扣除 N 灵葫值 → 奖励”（1 行军丹…9 灵葫仙丹），无买价/售价/cost 字段
    （实机全 false）；删除原子 `maxRoll-1 + filter`、增加原子 `maxRoll+1 + 复制末档`、改档
    `resizeResourcePoolEffect` slice/pad（item-alchemy.ts:67-79）；不可用提示实机字段值
    “无任何效果”（migration 来）。
  - **来源闭环 ✓**:Enemy 目录行与 Hero 均无条件插值“收服 +{collectValue} 灵葫值”
    （EnemyTab.tsx:805,849，+0 也显示）；帮助与 section 文案明示“灵葫咒成功收服该敌人时，实际
    增加到全局灵葫值；0 表示不增加灵葫值”（:951）与“灵葫值只在灵葫咒成功收服时增加”（:1207）——
    不是自动战后奖励。
  - **设计系统与交互 ✓（KE5）**：表单卡默认 inset、两个列表卡 `contentLayout="list"`；添加均在
    section header 且带 `data-ds-add-picker-deferred`（`item/craft-recipe-append-default` /
    `item/resource-reward-tier-append-default`）；720px 实机奖励行 select 538px 可用宽、动作组
    整组下沉不拆（groupOnOwnRow=true、三钮 32×32 在界内）、document overflow=0；
    **registry 复核**:item/craft-recipes 与 item/resource-reward-tiers 的 source/contentOwner
    已重绑 `ItemAlchemyEditors.tsx`（指纹 `item-alchemy-recipe-row` / `item-alchemy-reward-row`、
    verification 指向 `ItemAlchemyTab.test.tsx`），resource-reward-tiers dataPath 已修正为
    `items[*].use.effects[kind=drawFromResourcePool].rewards`（KE5/GM-B2 全闭环）。
  - **最终数据 ✓**:item268 五条 117..121 ×1→148 ×1 + “炼蛊的材料不足”；item270 九档
    [100,105,95,112,72,131,97,102,111] ×1 + “无任何效果”——两种原文均由 producer 重迁
    （62e30f56 / 893da2a3 本席已 accept），无 UI/runtime 特判（本日 grep 已证）、无 current 手改；
    content19/SAVE8 不变，validate.ts 仅把 `rewards.length === maxRoll` 收紧（:976-979），
    schema shape 不变。
  - **验证（本人执行）**:editor 聚焦 item-alchemy + item-commands + ItemAlchemyTab +
    DataMode.item-alchemy + ItemTab + ItemUseEffectEditor + EnemyTab + App.reference-navigation +
    reorder-surface/reorder-adoption/add-picker/boundary → **12 files / 158 tests 全绿**；
    content `validate.test.ts` → **93 tests 全绿**；1280 双页与 720 实机测量如上，
    与 Codex 证据一致且独立取得。
  无返工项；未修改实现，未代签 GLM。
- GLM: **accept（2026-08-31，只读终审七提交最终组合态（`54ba9c2e` + `1b090cb2` + `aacf68b7` +
  `314e3a52` + 三张 MIG `ff6c9532`/`62e30f56`/`893da2a3`，后三者本日已由本席逐卡独立终审）+
  当前工作树复算与聚焦复跑，非复述 Codex）**。按 GM-B1~B4 与卡面六区逐项独立核验（本席重点：
  5/9 复算、strict invariant、registry census、引用/删除/测试矩阵）：
  - **IA 与唯一 owner ✓（KE1-KE3/GM-B4）**：editor-navigation 物品模块恰 4 子页（物品/炼蛊皿/
    紫金葫芦/商店）≤5、一级模块不变；两页为 `DsObjectWorkspace + Hero + Sections + Inspector`
    单一机制形态，无 Catalog/outliner、无“1 件”数量徽标、无添加/删除机制 owner 入口（行内
    “添加对应关系/增加消耗值”只在既有 effect 内追加规则/档位）；adapter `findItemAlchemyEffect`
    重复 effect 抛错、`mutateItemAlchemyEffect` 禁止改写 kind，`UpdateItemCommand` 唯一 mutation
    owner；ItemUseEffectEditor 对两种 kind 用 `DsReadonlyValue` 只读类型标 + ALCHEMY_EFFECTS
    禁 reorder，卡片体仅摘要（“直接使用后自动采用首条材料充足规则 · 共 N 条”/“最高实际消耗 N
    灵葫值 · 第 N 行实际扣除 N 点”）+“在 XX 页面编辑”精确跳转（:629-660），无第二个详细编辑面；
    Shop 目录 20 家 id 恰 1..20、无 Shop0（本席复算）。
  - **炼蛊皿 ✓（一进一出钉）**：`RecipeAmountField` 每行恰一个材料选择器+数量、一个产物选择器
    +数量（`recipe.ingredients[0]!/products[0]!` 单值字段）；测试断言无「删除材料/删除产物」
    按钮（ItemAlchemyTab.test.tsx:142-143）；复合 0/2 材料/产物 shape 由 editor-only
    `assertSingleInputOutputCraftRecipes`（core/item-alchemy.ts:54-65）进入“机制数据不一致”
    错误空态——测试实证原文 2 材料 2 产物不被截断、`historyVersion` 不变（零命令）；保留选择器、
    数量、“添加对应关系”新增完整一进一出（appendCraftRecipe）、优先级排序（上移/下移配方 N）
    与 danger 删除（删除配方 N，≤1 禁用）。**未下沉通用层**：四提交对 content item.ts / reforge
    零文件（本人 `git log` 复核），一进一出仅存在于编辑器 guard。自动取材文案（`1b090cb2`）：
    “不选择原材料；系统按固定顺序自动消耗第一种足量材料”。材料不足提示精确“炼蛊的材料不足”
    来自 migration（最终数据复算）。
  - **紫金葫芦 ✓（档位原子性钉/GM-B3）**：`collectValue` 只在 Inspector 以 `<code>` readout
    呈现（aacf68b7 后中央表单无该控件），resource≠collectValue 直接进入错误空态；档位行固定
    文案“实际扣除 N 灵葫值”，无重复排序圆圈、无买价/售价（测试断言 textContent 不匹配
    /买价|售价/）、无 cost 字段（schema 未动）；增加消耗值 = maxRoll+1 + rewards 追加尾档、
    删除档位 = maxRoll-1 + rewards 过滤、`resizeResourcePoolEffect` 原子同步（1..999 整数边界），
    全部单条 UpdateItemCommand；移动为语义移动（aria 带档位名“上移实际扣除 N 灵葫值的奖励”）；
    不可用提示精确“无任何效果”来自 migration。
  - **registry census ✓（GM-B2/KE5）**：reorder-adoption 18 families / 29 adoptions /
    32 dataPaths；`item/craft-recipes` 与 `item/resource-reward-tiers` 两条 source/contentOwner
    均重绑 `ItemAlchemyEditors.tsx`（fingerprint 与实际行 className 一致）、dataPath 修正为
    `items[*].use.effects[kind=…].recipes|rewards` 真实路径（本人 grep 全库 `use.resourcePool`
    **零命中**）、verification 指向 ItemAlchemyTab.test；add-picker deferred 恰
    `item/craft-recipe-append-default` + `item/resource-reward-tier-append-default` 与按钮
    标记一致；number-field/field-layout/boundary/adoption 门禁全部复跑绿。
  - **来源闭环 ✓**：EnemyTab 目录行与 Hero 均“收服 +N 灵葫值”（153 敌全量含 +0，>0 accent/
    =0 neutral）；专属字段组「灵葫咒收服 · 收服获得灵葫值」自“战后结算”拆出，帮助文案
    “灵葫咒成功收服该敌人时…0 表示不增加”、结算描述“经验、金钱在战后结算，灵葫值只在灵葫咒
    成功收服时增加”——不称自动战后奖励。enemy census：153 个、100 个 >0、53 个 =0、0..99，
    与卡面一致（本人复算）。
  - **strict invariant ✓（GM-B1）**：validate.ts `>=`→`===` 收紧（:976-980），正例 2===2 通过、
    负例 1<2 与 3>2（不可达尾部）均红，错误信息含两侧数值；收紧对现存数据零破坏（全项目
    pool owner 恰 item270 且 9===9，本人复算）。
  - **最终数据与来源 ✓**：item268 恰 5 条 117..121 ×1 → 148 ×1 +「炼蛊的材料不足」；
    item270 resource=collectValue、maxRoll=9===rewards 9、九档
    `[100,105,95,112,72,131,97,102,111]` count 全 1 +「无任何效果」；craftRecipe/
    drawFromResourcePool 全项目各恰 1 owner；两条原文均由 producer 重迁（三张 MIG 卡本席已逐卡
    独立终审：exact diff/镜像/双零计划/invariant 全闭合），编辑器字段为通用 unavailableMessage
    编辑面、无 UI/runtime 特判；四个 editor 提交零 `projects/pal`/migration baseline/reforge/
    content schema 改动，content19/SAVE8/schema shape 不变。
  - **本人复跑**：editor 核心 10 files / 140 tests（adapter/两页/ItemTab/ItemUseEffectEditor/
    EnemyTab/navigation/DataMode/App 深链/item-commands/item-references）+ design-system 门禁
    7 files / 109 tests（adoption/reorder×2/add-picker/boundary/number-field/field-layout×2）+
    content validate 93 tests——**全绿**。命令计数/no-op 0/undo-redo 对称断言逐条直读确认。
  无返工项；200% zoom 实机复验按卡面分工仍归 Kimi/用户补验，不构成本席 blocker；
  未修改实现，未代签 Kimi，未填用户验收。
- 用户验收: pending（历史组合态曾 approved；最新控件高度/配方卡几何增量待复验）
- done 准入结论: **blocked（窄态密度增量三方accept；最新控件高度/配方卡几何增量仅Codex accept，待Kimi/GLM accept + 用户复验）**

### 数量字段 / 连接符 / 奖励列表表面、横向节奏与窄态密度增量复审

- Codex: **accept（2026-08-31，`314e88e3` + `55b5e981` + `35843eb7` + `c8016faa` + `9c38d97b` +
  `0a423136` + `b01d10a8`）**——标准数量字段、对称SVG、Shop式edge列表、15px/15px横向节奏与紧凑窄态
  均按可见元素边界实机复验通过；521/520与761/760两个断点cliff已闭合；
  `f7cc5770` / `b6d751c4` 两次错误居中证据仅作历史保留。
- Kimi: **accept（2026-08-31，只读增量终审 `0a423136` + `b01d10a8`（含 `541ea07d` 证据），按本席
  视觉/响应式分工做像素级实机复测 + 静态核对与聚焦复跑，非复述 Codex/GLM）**：
  - **两断点新布局实机逐像素复测 ✓**：以命名容器（`container-name: item-alchemy`）显式定宽逐档测量——
    container=760 时行高恰 **99px**（旧四层 159.5px 已消失），grid areas 实机为
    `"cost flow reward reward" "count count count actions"`：第一行 实际扣除 → 箭头 → 奖励，
    第二行 数量字段 + 完整动作组（countTop≈actionsTop）；container=520 时行高恰 **123.5px**，
    areas `"cost cost cost" "flow reward reward" "count count actions"`：扣除文案 / 水平箭头+奖励 /
    数量+动作组三行——与卡面验收逐字一致。
  - **连接符 ✓**：五档宽度（761/760/521/520/396）逐档实机 `arrow top == reward top`（sameRow=true），
    `.item-alchemy-reward-row > .formula-arrow` 无 transform——连接符始终水平并与奖励同排；
    唯一 `rotate(90deg)` 仅存于 `.item-alchemy-recipe-row__formula`（炼蛊配方列纵向堆叠），非本列表。
  - **数量字段 ✓**：实机每行可见 `<label>数量</label>` 且 `label for` 与 input id 精确相等；
    标准 ± 步进器两枚（aria=“减少/增加实际扣除 N 灵葫值的奖励数量”、36px）；count=1 时减号
    disabled（实机）。一次步进点击实机产生一个可撤销变更（dirty 出现），Header 全局撤销按钮恢复——
    单命令/undo 语义另由 ItemAlchemyTab.test.tsx（:285-376,451-493 真实 `edit.undo()` 断言）与
    本人复跑锁定。
  - **cliff 闭合 ✓**:container=521 实机奖励宽 **274.9px**、container=520 实机 **384px**
    （与 Codex 记录逐点一致），521→520 从两行 274.9 平滑增为三行全宽 384，**无省略号 1px 断崖**；
    container=761 加第 10 档实机 cost=**112.8px**、reward=200.2px（与 Codex 184.2 同量级，差异为
    面板态宽度差），row/main/body overflow 全 0，Header undo 恢复 9 档。
  - **720/396 与动作组 ✓**:viewport=720（container 688、两行态）与 container=396（三行态）实机
    document/section/row 横向溢出全 0；动作组恒 32px 高、整组不拆。
  - **census 与零漂移 ✓**:number-field-adoption baseline 实读 `leafCalls:115`、
    `DsDraftNumberInput:28`、`DsDraftNumberField:28`（逐字一致）；两提交仅触 editor UI/CSS/
    registry/测试——projects/pal、schema、runtime、migration、rewards/maxRoll/reorder key/Command
    零漂移（本人 `git show --stat` 证实）；reorder adoption 仍绑定 `item-alchemy-reward-row`
    （DsRepeatRow 行类未变），门禁扩展钉死两断点 areas 与箭头禁 transform（本人直读
    reorder-surface-adoption.test.ts 新增断言）。
  - **本人复跑**:ItemAlchemyTab + reorder-surface-adoption + reorder-adoption + field-layout +
    number-field + boundary → **6 files / 92 tests 全绿**（与卡面记录一致）。
  - 200% zoom 复核建议随用户复验一并进行（本席本轮未覆盖，卡面已同样标注）。
  无返工项；未修改实现，未代签 GLM。
- GLM: **accept（2026-08-31，只读增量终审 `0a423136` + `b01d10a8`（含 `541ea07d` 证据），按本席分工
  核 DOM / registry / 测试 / 数据零漂移，非复述 Codex）**：
  - **窄态结构 ✓**：旧四层已删——editor.css 中 760px 断点现为两行
    `"cost flow reward reward" / "count count count actions"`（`max-content 2.75rem minmax(0,1fr) auto`），
    520px 断点为三行 `"cost cost cost" / "flow reward reward" / "count count actions"`
    （`2.75rem minmax(0,1fr) auto`）；`.item-alchemy-reward-row > .item-alchemy-formula-arrow` 的
    `transform: rotate(90deg)` 已删除，rotate 仅存于炼蛊配方列——连接符始终水平、与奖励同排、
    不独占行。默认五轨 `minmax(12rem,1fr)→minmax(0,1fr)`（b01d10a8）消除 521/520 奖励被 12rem
    地板挤成省略号断崖、并让 761px 第 10 档可收缩不溢出（与 Codex 实测 274.9/384/184.2px 数值
    方向一致；像素级复测归 Kimi/视觉）。结构由 reorder-surface 门禁**永久钉死**（正则断言两断点
    grid-template-areas 逐串 + reward-row 箭头禁 transform），本人直读该测试。
  - **数量字段 ✓**：奖励数量由裸 `DsDraftNumberInput` 升级为 `DsDraftNumberField label="数量"
    layout="inline"`（ItemAlchemyEditors.tsx）；`DsField` 渲染 `<label htmlFor={id}>` 且控件同 id
    ——label for 关联由测试对每行断言 `label.textContent==='数量' && label.htmlFor===input.id`；
    ± 步进器为公共 `DsNumberStepper`（`减少/增加{aria-label}`、stepUp/stepDown、
    `decrementDisabled={!canStep(-1)}`）；count=1 减号 disabled、一次 + 恰 `historyVersion+1`
    （单条 UpdateItemCommand）、undo 恢复 1——测试逐条实证（ItemAlchemyTab.test.tsx 新增块）。
  - **registry ✓**：number-field census `leafCalls:115 / DsDraftNumberInput:28 /
    DsDraftNumberField:28` 与卡面一致且由 AST 门禁强制复算；field-layout adoption 三档
    grid-template-columns 与 CSS 逐值同步（root/760/520）、css census snapshot 同步更新；
    design-system-adoption 奖励页组件清单移除 DraftNumberInput；b01d10a8 的 P1 修复同步更新
    registry + snapshot + 门禁期望（`"cost flow reward count"→"cost flow reward reward"` 等），
    无 registry/实现漂移。
  - **数据零漂移 ✓**：`git diff 9c38d97b..b01d10a8` 文件面恰为 editor UI/registry/测试/CSS +
    文档——`projects/`、content、reforge、migrate、editor core（commands/item-alchemy）、shared
    **零文件**；item270 现值 maxRoll=9、9 档 `[100,105,95,112,72,131,97,102,111]` count 全 1、
    message“无任何效果”不变；reorder key（useDsReorderKeys/editor-local-token）与
    UpdateItemCommand 路径未触碰。
  - **本人复跑**：聚焦 6 files / 90 tests（ItemAlchemyTab + item-alchemy core + number-field/
    field-layout/reorder-surface/boundary 门禁）+ DS adoption 总门禁 21 tests + editor
    typecheck——**全绿**。
  无返工项；200% zoom 实机与像素级复测按分工归 Kimi/用户补验；未修改实现，未代签 Kimi，
  未填用户验收。
- 用户验收: pending

### 奖励行控件高度、配方卡几何与公共Stepper外框增量复审

- Codex: **accept（2026-08-31，`13ed6138` + `1f6b25af` + `e11515f7`）**——奖励数量input/−/+与
  上移/下移/删除均36px同y；公共stepper outer也由38收紧为真实36px，并保留normal/invalid/focus/
  forced-colors可辨识外框。Craft header序号/摘要/actions同轴，rail稳定锚首header行，formula四字段与箭头同线；
  1280/760/520三档overflow0。7 files / 134 tests、typecheck与91-file DS gate绿；多路只读终审无finding。
- Kimi: pending
- GLM: pending
- 用户验收: pending

## Draft / Build / Review

- Draft：用户产品裁决、双机制真值、无新 schema 设计与 paired migration 边界已登记。
- Build：2026-08-31 Codex 按三签准入开工；`54ba9c2e` 完成实现，期间按用户视觉裁决撤销双页 owner Catalog，
  固定为单一机制 IA，并补 Enemy `collectValue` 来源闭环。
- Review：in progress；窄态密度增量三方accept；最新控件高度/配方卡几何增量Codex accept，待Kimi/GLM终审与用户复验。

### Build / Review 证据

- 实现提交：`54ba9c2e feat(editor): add item alchemy mechanism workbenches`；用户真值复核后的文案/文档修正：
  `1b090cb2 fix(editor): clarify automatic alchemy sourcing`；固定资源展示修正：
  `aacf68b7 fix(editor): move fixed alchemy resource to inspector`；一进一出表面修正：
  `314e3a52 fix(editor): keep PAL crafting rules one-to-one`；数量字段标准化：
  `314e88e3 fix(editor): label alchemy quantity fields`；连接符居中：
  `f7cc5770 fix(editor): clarify alchemy quantity flow` +
  `b6d751c4 fix(editor): center alchemy flow connector`（两次 CSS 方案均被用户复验推翻）+
  `55b5e981 fix(editor): use symmetric alchemy flow glyph`（最终对称SVG）；紫金葫芦奖励列表表面：
  `35843eb7 fix(editor): flatten spirit gourd reward rows`；奖励行横向节奏：
  `c8016faa fix(editor): tighten spirit gourd reward flow` +
  `9c38d97b fix(editor): correct reward layout registry wording`；奖励行窄态：
  `0a423136 fix(editor): compact spirit gourd reward rows` +
  `b01d10a8 fix(editor): preserve gourd rewards at breakpoints`；奖励行控件高度：
  `13ed6138 fix(editor): align gourd reward action heights` +
  `1f6b25af test(editor): lock aligned gourd control sizes`；配方卡几何/公共Stepper外框：
  `e11515f7 fix(editor): align alchemy recipe card geometry`；均未推送。
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
- 数量字段增量：每行恰 4 个公共字段，可见 label 为“材料/材料数量/产物/产物数量”，label `for` 精确关联
  控件；两个 `type=number` 输入各有完整 stepper，1 时减号 disabled，点击+ history 恰+1且 undo恢复。
  number-field leaf 总数115不变，DraftNumberInput 30→29、DraftNumberField 26→27；DS 公共实现无业务
  CSS 覆盖。连接符保留读屏“炼成”；两次 CSS 伪元素方案因 DOM 盒不含真实箭头像素被用户截图推翻，证据
  作废。最终 `55b5e981` 改用对称SVG path `M3 8h26M23 2l6 6-6 6`：浏览器直接测 path 渲染边界
  522..548、中心535，精确等于 stepper右边缘505与产物输入左边缘565的空隙中心535，左右各13px；
  720旋转向下后path中心偏差0px。两档body/row overflow均0、两个stepper各160px、保存disabled。
- 最新验证：ItemAlchemy + number-field/field-layout/boundary `4 files / 80 tests` 全绿；editor typecheck、
  design-system gate（91 files / 2 evidence-bound exceptions）、定向 Biome 与 `git diff --check` 通过；
  未重复此前 editor 全量。Biome 仅报告 editor.css 既有 visually-hidden `!important` warnings，本增量未触碰。
- 奖励列表表面增量：`item/resource-reward-tiers` 从 repeat-row 正式重分类为 edge-to-edge-list；surface census
  repeat-row 9→8、edge 2→3，总 adoption 29不变。DOM 不再含 DsRepeatRow；行与 Shop 同为透明背景、圆角0、
  四边中仅 bottom 1px、padding 9px/14px（reorder rail为拖拽柄把左侧computed扩到38px，Shop同值）、列表/内容
  x与width完全一致。默认select/input均36px，三个动作均32×32；主面板734px时connector向下、动作组整组下沉，
  row/main/body overflow均0。聚焦6 files / 91 tests、typecheck、DS gate绿；数据/command不变量未变。
- 奖励行横向节奏增量（`c8016faa`）：2048px 下修复前第一轨被 `0.38fr` 扩到364.6px，可见扣除文案右缘到
  SVG path左缘275.4px；改为 `max-content` 后第一轨104.1px，文案→path与path→奖励控件均为15px。1280px
  复测仍为15px/15px；奖励选择器独占剩余宽度，select/input保持36px、动作保持32px，row/body overflow均0。
  同步 field-layout adoption与CSS census；聚焦6 files / 91 tests、typecheck、91-file DS gate、定向Biome与
  `git diff --check` 全绿，仅有未触碰的visually-hidden `!important`既有warning。临界容器实测：761px仍为
  五轨且reward轨222.9px；760px准确切到两列/向下connector，row/main/body两点overflow均0。
- 不可用提示旧会话反例：current与migration baseline的item270均精确为`unavailableMessage: "无任何效果"`
  且byte mirror；旧`?ui_samples`标签实测input为空，但撤销/重做/保存评审副本全disabled，排除手工脏改。同一
  6010、同一URL fresh boot后开发基线与评审沙盒input均为“无任何效果”。根因是`main.tsx`仅首次mount读取
  `projects/pal`并构造EditSession，Vite HMR不会重读迁移后的JSON；`ui_samples`也不投影items。旧页/迁移前
  保存的独立评审副本不得继续充当current验收证据；不返工producer/current，不加UI/runtime fallback。
- 奖励行窄态增量（`0a423136` + `b01d10a8`）：用户截图对应760px旧行159.5px，因cost/竖箭头/
  reward+count/actions机械拆四层。最终760px为99px两行：首行“实际扣除→奖励”，次行可见“数量”标准stepper
  与32px动作组；520px以下为123.5px三行，箭头始终与奖励同排且保持水平。number-field leaf115不变，
  DraftNumberInput29→28、DraftNumberField27→28；label for、min=1、stepper、单命令与undo有测试钉。
  边界实测：521/520 reward274.9/384px，396px reward260px，720 viewport reward294px；761px新增合法第10档
  cost112.8px/reward184.2px，row/main/body overflow0并undo回9档。初版两个P1经修复后只读复审accept；
  聚焦6 files / 92 tests、typecheck、91-file DS gate与Biome/diff绿，P1修复后仅精确复跑3 files / 22 tests
  + DS gate，未重复全量。content/reforge/migrate/projects/pal/editor core/reorder核心均零diff。
- 奖励行控件高度增量（`13ed6138` + `1f6b25af`）：用户指出数量与动作按钮仍不同高。直接computed确认
  select、数量input及−/+均为36px，但compact动作仅32px。仅把ResourceRewardTierList的ActionGroup改为
  default，并在公共recipe对称补齐default/compact唯一density owner；default三按钮现均36×36且与input同y，
  stepper outer38px只是上下边框。Shop/Craft继续compact32px。动作组104→116px后520/396 row/main/body
  overflow0；761新增第10档reward172.2px且overflow0，undo回9。静态门禁同时钉default/compact ActionGroup
  与stepper消费同一语义token，并锁Craft compact、Shop compact、gourd default。7 files / 126 tests、
  typecheck、91-file DS gate绿；P2补钉2 files / 71 tests绿。canonical/data/command/reorder语义零漂移。
- 配方卡几何/公共Stepper外框增量（`e11515f7`）：用户截图显示摘要左上、actions悬空、字段错位。直接根因一是
  通用`.item-alchemy-row-actions{grid-area:actions}`泄漏到未声明named area的Craft header，浏览器生成隐式
  5列×2行；二是number stepper的36px子按钮再叠加真实上下border，使outer38px而Select36px；三是inline rail
  按整卡50%漂移。修复后actions area分别scope到Craft header/reward row；Craft使用官方overlay rail并以56px
  header band锚定；stepper改为不占布局的inset描边。1280 header96→56px、row173→131px，header index/
  identity/actions/handle同cy579，identity/formula x同103，四field均h60且label y607、Select/stepper/arrow
  y631..667 h36。760/520 handle-header delta0、overflow0。普通/invalid/focus以及forced-colors base/invalid/
  focus/invalid+focus均有独立外框合同。reorder adoption仅Craft railLayout inline→overlay，dataPath/adapter/
  commandOwner不变。7 files / 134 tests、typecheck、91-file DS gate绿；多路只读终审accept。
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
- 奖励列表表面: **rework（2026-08-31）**——用户要求紫金葫芦参考Shop货单，移除每项重复卡框、只用
  分割线并采用规范组件尺寸。`35843eb7` 已迁为edge-to-edge-list，待增量终审/复验。
- 奖励行横向节奏: **rework（2026-08-31）**——用户指出“实际扣除”与箭头之间存在异常大空白。确认不是设计
  意图，根因为扣除值轨误用fr吸收宽屏余量；`c8016faa` 已改为内容宽轨并以可见文字/SVG path边界复测为
  15px/15px，待增量终审/复验。
- 不可用提示旧页截图: **verified stale-session（2026-08-31）**——用户截图中的input确为空，但current /
  baseline与同URL fresh开发基线/评审沙盒均显示“无任何效果”；旧页无history或dirty，确定是迁移前boot快照，
  不是当前数据或字段绑定回归。刷新/新开取证即可；若是迁移前另存的独立副本，必须从最新current新建评审会话。
- 奖励行窄态密度: **rework（2026-08-31）**——用户指出四层堆叠“丑到过分”。确认是过度响应式：箭头和动作
  各自占行造成159.5px高空白。`0a423136`紧凑化并补可见数量字段；`b01d10a8`继续消除521/520可辨识断崖与
  761px第10档溢出风险，待增量终审/用户复验。
- 奖励行控件高度: **rework（2026-08-31）**——用户指出数量与同排动作按钮高度仍不一致。确认是default字段
  36px与compact动作32px混排；`13ed6138`以公共ActionGroup default合同统一交互面为36px，`1f6b25af`
  锁住stepper/action同token及Shop/Craft继续compact，待增量终审/用户复验。
- 炼蛊配方卡几何: **rework（2026-08-31）**——用户指出配方摘要、actions、drag handle与四字段严重错位。
  `e11515f7`消除跨surface grid-area泄漏、用overlay rail锚定header，并从公共Stepper外框修正38/36px错位；
  normal/invalid/focus/forced-colors状态与1280/760/520几何均闭合，待增量终审/用户复验。
- 实现验收: pending（最新控件高度/配方卡几何增量待用户复验）。

## 交接记录

- 2026-08-31 User/Codex: 用户截图指出炼蛊配方卡摘要/actions/handle/字段严重错位。浏览器证实Craft header因
  reward共享`grid-area:actions`生成隐式5列×2行（96px），number stepper真实border又使outer38而Select36。
  `e11515f7`将actions area按surface分域、Craft切公共overlay rail并锚56px header、formula与identity同起点，
  同时把公共stepper外框改成不占布局的inset描边并补invalid/focus/forced-colors四态。最终1280 header56/
  row131，index/identity/actions/handle同cy579，四label/control全齐；760/520 handle-header差0、overflow0。
  7 files/134 tests、typecheck、DS gate绿；三路只读终审accept。待正式Kimi/GLM签最新组合增量与用户复验。
- 2026-08-31 User/Codex: 用户指出数量与排序/删除按钮高度再次不一致。实测根因为default数字字段交互面36px
  对compact ActionGroup32px；`DsReorderMoveButton`自身还硬编码compact，故只改父prop会形成30/30/36混组。
  `13ed6138`在公共ActionGroup recipe补齐default所有权，仅奖励行选default：input、−/+、上/下/删全部36px
  同y；Shop/Craft仍compact32px。520/396无溢出，761第10档reward172.2px且overflow0、undo回9。只读终审
  实现accept但指出两P2门禁缺口；`1f6b25af`补stepper同token与Craft compact钉后复审accept。7 files / 126
  tests、typecheck、DS gate绿；待正式Kimi/GLM签最新高度增量与用户复验。
- 2026-08-31 Kimi: 增量只读终审 `0a423136` + `b01d10a8`（窄态重做），按视觉/响应式分工签
  **accept**。独立证据：命名容器显式定宽逐档实机——760=99px 两行（扣除→奖励 / 数量+动作组，
  旧四层 159.5 消失）、520=123.5px 三行、521 奖励恰 274.9px、520 恰 384px 平滑无 1px 断崖、
  761 加第 10 档 cost 恰 112.8px 且三处 overflow=0、Header undo 恢复 9 档；连接符五档宽度
  sameRow 恒真（rotate 仅存炼蛊配方列）；数量 label for==input id、±步进器 36px、count=1 减号
  disabled（均实机）；census 实读 115/28/28；两提交 projects/pal/schema/runtime/migration/
  rewards/maxRoll/reorder key/Command 零漂移（git show --stat）；本人复跑 6 files / 92 tests 全绿。
  200% zoom 留用户复验。无返工项；未修改实现，未代签 GLM，未标 done。Next: 用户复验。
- 2026-08-31 GLM: 增量只读终审 `0a423136` + `b01d10a8`（窄态重做），按本席分工签 **accept**。独立证据：
  CSS 断点结构直读（760px 两行 `"cost flow reward reward"/"count count count actions"`、520px 三行
  `"cost cost cost"/"flow reward reward"/"count count actions"`、竖箭头 rotate 已删仅存炼蛊配方列、
  root 五轨 minmax(0,1fr) 消 12rem 地板断崖）并由 reorder-surface 门禁永久钉死；数量字段为
  DsDraftNumberField label="数量"、htmlFor 关联/±步进器/减号 1 时 disabled/单命令/undo 均有测试
  断言逐条实证；number-field census 115/28/28、field-layout 三档值与 CSS 逐值同步、css census
  snapshot 与门禁期望随 P1 修复同步；`git diff 9c38d97b..b01d10a8` 证明 projects/content/reforge/
  migrate/editor core/shared 零文件、item270 九档与 message 不变、reorder key 与 command 路径
  未触碰；本人复跑聚焦 6 files / 90 tests + DS adoption 21 tests + typecheck 全绿。像素级数值
  （99/123.5/274.9/384/112.8/184.2px、overflow 0、32px 动作）与 200% zoom 采信 Codex 实测并归
  Kimi/视觉/用户复验，结构/测试与其方向一致。无返工项；未修改实现，未代签 Kimi，未填用户验收。
  Next: Kimi 增量终审（视觉/响应式 + 200%）与用户复验。
- 2026-08-31 User/Codex: 用户指出紫金葫芦奖励窄态四层布局过高。`0a423136`改为紧凑两/三行、水平SVG，
  并将奖励数量升级为可见“数量”DsDraftNumberField；760px行159.5→95px。只读视觉审查随后counter：521px
  reward仅62.9px、761px新增第10档可能溢出。`b01d10a8`重排中档并放开root reward最小轨；最终760px99px、
  521/520 reward274.9/384px，761px第10档reward184.2px且overflow0、undo回9。P1提出席复审accept，
  其余只读审查确认registry与数据/command无blocker；6 files/92 tests、typecheck、DS gate绿；仍待正式
  Kimi/GLM增量签字与用户复验。
- 2026-08-31 User/Codex: 用户再次截图指出“不可用提示”为空。三路只读追踪与浏览器A/B确认：旧评审标签
  value=''且undo/redo/save均disabled；同一`?ui_samples`地址fresh tab value='无任何效果'。current与baseline
  item270亦精确同值。根因是迁移前boot的单次EditSession快照不会被HMR重载；无实现返工，不刷新用户页以避免
  潜在丢失编辑。后续review必须刷新/新开后取证，旧截图作废。
- 2026-08-31 Codex: 用户截图指出奖励行扣除文案到箭头空白过大。浏览器2048px实测修复前可见文字→SVG
  为275.4px；`c8016faa` 把扣除轨 `minmax(10rem, 0.38fr)` 改为 `max-content`，余量只分配给奖励选择器，
  修复后2048/1280均为文字→SVG 15px、SVG→奖励15px，overflow0。同步field-layout registry/census；
  761/760px容器断点两侧亦overflow0。只读内审无P0/P1；唯一P2“六槽”陈旧登记由`9c38d97b`改为“五轨”，
  复跑field-layout 7/7与Biome绿。Codex accept，仍待Kimi/GLM增量终审与用户复验。
- 2026-08-31 Codex: `35843eb7` 删除紫金葫芦奖励行的 DsRepeatRow，正式把reorder surface从repeat-row迁为
  edge-to-edge-list并同步taxonomy/field/number/DS registry。与Shop实机对照：透明、radius0、仅bottom1px、
  同padding/边界；select/input36px、动作32px。主面板734px connector保留向下、动作不拆、overflow0。
  6 files / 91 tests、typecheck、DS gate绿；canonical数据与命令语义零变化。Codex accept。
- 2026-08-31 Codex: `55b5e981` 删除不可可靠测量的 CSS 伪元素箭头，改用 viewBox 32×16 的对称SVG path。
  1280直接读取 path实际渲染边界522..548、中心535，与真实控件空隙中心535完全一致；720旋转后path中心
  偏差同为0px，overflow=0、无脏写。ItemAlchemy/field-layout 2 files / 16 tests、typecheck、DS gate绿。
  Codex 对数量+连接符最新增量恢复accept，转review。
- 2026-08-31 User/Codex: 用户第二次截图证明连接符仍未视觉居中。Codex 复盘发现 `b6d751c4` 只量了
  `.item-alchemy-formula-arrow__line` 元素盒，CSS `::after` 箭头头部不在该矩形内，因而“偏差0”证据无效。
  最新增量转 counter/rework：删除伪元素箭头，改用可直接测量 path 几何边界的对称 SVG，不再接受容器指标。
- 2026-08-31 Codex: `314e88e3` 用公共 `DsSelectField + DsDraftNumberField` 重构一进一出字段，显示
  “材料/材料数量/产物/产物数量”，number type、min=1、step=1、± stepper 与一动作一命令/undo 均闭合；
  number-field census 30/26→29/27。`f7cc5770` 将文字箭头改为流程连接符，但初次误量外层容器；用户截图
  证实可见图形右偏16px。`b6d751c4` 消除数量轨额外32px并把箭头头部纳入自身边界，复测真实可见中心
  偏差0px；720同为0px，两档overflow=0、保存无脏写。聚焦测试、typecheck、91-file DS gate 全绿。
- 2026-08-31 User/Codex: 用户指出材料/产物后的值无法识别为数量，且不像统一数字 input。代码虽使用
  `DsDraftNumberInput(type=number)`，但页面只暴露无可见标签的裸控件；按数字字段合同应改用带“数量”label
  与步进器的 `DsDraftNumberField`。本卡从 done 转 rework；仅改 editor surface / registry / 测试 / CSS，
  不碰 canonical 数据、schema、runtime 或 migration。
- 2026-08-31 User/Codex: Kimi / GLM 对七提交最终组合态均签 accept；用户回复“签了”确认验收。
  双页 IA、一进一出、5/9 数据、两种 producer 原文、Enemy 来源闭环、DS registry 与响应式证据全部闭合，
  无 counter、无剩余返工。本卡转 done；无下一位 Agent 提示词。
- 2026-08-31 Kimi: 只读终审七提交最终组合态，签 **accept**。独立证据：导航恰 4 子页、双 route
  deep link 自动聚焦 owner、outliner 按 capability 抑制（实机无 Catalog/徽标/机制 owner 增删）；
  adapter 重复 effect/多 owner/改 kind 抛错、no-op 零 dispatch、有效动作恰一条 UpdateItemCommand；
  炼蛊皿实机 5 行优先级一进一出、无添加材料/产物、删除 32×32 danger、一进一出 guard 仅在编辑器
  领域层未下沉 schema、复杂 shape 错误空态；紫金葫芦 collectValue 只读于 Inspector（非输入框）、
  9 行“实际扣除 N → 奖励”实机逐字、无价格/cost、增删改档全原子；Enemy“收服 +N 灵葫值”（含 +0）
  与“只在灵葫咒成功收服时增加”直读；两条 reorder adoption 重绑 ItemAlchemyEditors.tsx + dataPath
  修正；两条 message 字段实机值=“炼蛊的材料不足”/“无任何效果”（producer 重迁，本席前三卡已
  accept）；本人复跑 editor 12 files / 158 tests + content validate 93 tests 全绿，1280 双页与
  720 动作组整组下沉零溢出。无返工项；未修改实现，未代签 GLM，未标 done。Next: 用户验收。
- 2026-08-31 GLM: 只读终审七提交最终组合态，签 **accept**。独立证据：导航恰 4 子页、双页无
  Catalog/徽标/机制 owner 增删；adapter 重复 effect 抛错、no-op 零命令、有效变更恰一条
  UpdateItemCommand；一进一出单值字段 + 复合 shape 错误空态零命令且原文不变（测试逐条直读），
  一进一出仅存编辑器 guard（content/reforge 四提交零文件）；collectValue 仅 Inspector code
  readout、档位“实际扣除 N 灵葫值”固定文案、增删档位原子同步 maxRoll、无买价/售价/cost；
  registry 18/29/32 census + 两条 adoption 重绑 ItemAlchemyEditors + dataPath 修正
  （`use.resourcePool` 全库零命中）+ add-picker deferred 双条一致；validate `===` 收紧正负例
  齐；Enemy 153 全量“收服 +N 灵葫值”（含 +0）+ 灵葫咒收服专属字段非战后结算；最终数据
  5 条/9 档/两条 migration 原文/Shop 20 家全复算；本人复跑 editor 10 files/140 + DS 门禁
  7 files/109 + content validate 93 全绿。无返工项；200% zoom 按卡面分工归 Kimi/用户补验；
  未修改实现，未代签 Kimi，未填用户验收。Next: Kimi 终审（IA/视觉 + 200%）与用户实现验收。
- 2026-08-31 User/Codex: `MIG-PAL-GOURD-FAILURE-MESSAGE-1` 三方 accept + 用户验收齐后转 done；
  craft/store 两依赖亦已 done。双炼化页最终数据态现为 item268“炼蛊的材料不足” + item270“无任何效果”，
  两者均由 producer 重迁。Codex 复核 `314e3a52` 一进一出增量与浏览器证据后恢复 accept，本卡转 review。
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
增量终审 ED-ITEM-ALCHEMY-SURFACE-1（Kimi 或 GLM，只读，不得修改实现）。

任务卡：docs/ops/tasks/ED-ITEM-ALCHEMY-SURFACE-1-two-item-refining-workbenches.md
当前状态：review；历史组合态三方 accept 保留。最新增量提交：
- `314e88e3 fix(editor): label alchemy quantity fields`
- `f7cc5770 fix(editor): clarify alchemy quantity flow`
- `b6d751c4 fix(editor): center alchemy flow connector`
- `55b5e981 fix(editor): use symmetric alchemy flow glyph`
- `35843eb7 fix(editor): flatten spirit gourd reward rows`
- `c8016faa fix(editor): tighten spirit gourd reward flow`
- `9c38d97b fix(editor): correct reward layout registry wording`
- `0a423136 fix(editor): compact spirit gourd reward rows`
- `b01d10a8 fix(editor): preserve gourd rewards at breakpoints`
- `13ed6138 fix(editor): align gourd reward action heights`
- `1f6b25af test(editor): lock aligned gourd control sizes`
- `e11515f7 fix(editor): align alchemy recipe card geometry`
历史至`b01d10a8`的窄态增量三方已accept；最新控件高度/配方卡几何增量Codex accept，Kimi / GLM与用户复验pending。

请只审最新增量及其与既有一进一出表面的组合：
1. 每条配方是否恰有“材料/材料数量/产物/产物数量”四个可见公共字段；label for、唯一 aria、name、
   autocomplete、type=number、min=1、step=1、integer/enforceRange 是否正确。
2. 两个数量字段是否使用 DsDraftNumberField 标准 ± stepper；1 时减号 disabled；一次+只产生一条
   UpdateItemCommand，undo恢复；itemId、另一侧、其它配方和 canonical 数据零变化。
3. number-field census 115 leaf不变；配方增量为DraftNumberInput 30→29 / DraftNumberField 26→27，奖励数量
   升级后当前为DraftNumberInput28 / DraftNumberField28。field-layout、
   design-system owner 与 boundary gate 是否同步；业务 CSS 是否未覆盖公共 number 实现。
4. 最终连接符是否为非交互对称SVG path，读屏仍为“炼成”；`f7cc5770` / `b6d751c4` 的CSS伪元素
   居中证据已作废，不得复用。请直接测 path 渲染边界：1280材料数量stepper右边缘505、产物输入左边缘565、
   空隙中心535；path边界522..548、中心535，左右各13px、偏差0px。720旋转向下后path中心偏差0px；
   两档无row/body overflow、stepper不裁切、保存无脏写。
5. 紫金葫芦奖励是否正式从DsRepeatRow/repeat-row迁为Shop式edge-to-edge-list：DOM无DsRepeatRow，
   逐项四边框/圆角/raised背景为0，仅bottom 1px divider；列表和内容边界同宽同x。select/input与当前奖励动作
   均为default36px（Shop/Craft仍compact32px）；surface census repeat 8 / edge 3 / 总adoption29。窄态connector保持水平且与奖励同排、动作组不拆、
   row/main/body overflow均0。rewards顺序、maxRoll同步、单命令/undo与canonical数据不得变化。
6. 宽屏横向节奏是否按可见元素而非容器盒验证：2048px实际扣除文案右缘→SVG path左缘15px，path右缘→
   奖励select左缘15px；1280同为15px/15px。第一轨computed应为内容宽（当前104.133px），不得再随行宽扩张；
   奖励轨独占剩余宽度，select36px、数量stepper与奖励动作均为公共default尺寸，row/body overflow均0。root
   field-layout值应为`max-content 2.75rem minmax(0, 1fr) max-content auto`。
   另请复测item-alchemy容器761/760px：761保持五轨；760为“扣除→奖励 / 数量+动作”两行，connector水平。
7. 不可用提示必须以fresh boot取证：current与baseline item270均为“无任何效果”；同一6010的fresh开发基线和
   `?ui_samples`评审沙盒input均应预填该值。迁移前已打开标签或迁移前保存的独立评审副本可能为空，不得当作
   current反例；不得因此添加UI/runtime fallback或手改current。若fresh boot仍空，才用网络响应与绑定链反证。
8. 窄态密度与可辨识性：旧760px四层159.5px证据作废；当前760px约99px、520px约123.5px。main521/520
   reward分别约274.9/384px，不得再次出现只剩省略号的1px cliff；396px/720 viewport无溢出。main761新增
   第10档后cost约112.8px；最终default动作组下reward约172.2px且row/main/body overflow0。每行必须有可见“数量”label、label for
   正确、标准stepper，1时减号disabled，一次+恰一命令且undo恢复。
9. 同排控件高度必须按实际交互rect验证：奖励select、stepper outer、数量input、−/+、上移/下移/删除均为
   36px并同y，不再允许38px外壳。奖励ActionGroup必须`density="default"`且公共recipe把组内
   icon/button统一到`--ds-control-height`；Shop与Craft必须继续compact并使用compact token。520/396无溢出；
   761新增第10档时action group116px、reward约172.2px且row/main/body overflow0，undo回9。静态门禁必须同时
   锁default/compact ActionGroup与default/compact stepper使用同一对语义token。
10. Craft配方卡几何：header不得再生成隐式grid行；1280应为`index identity actions`三列单行，header约56px、
    row约131px，index/identity/actions/handle中心差≤1px。Craft DsReorderItem必须`layout="overlay"`并由scoped rail
    锚首header行；1280/760/520 handle-header delta均≤1px。identity与formula起点应一致（当前x103）；宽态四个
    label同top，两个Select/两个Stepper/箭头控制行同top-bottom且全部36px。760/520无横向溢出。通用actions
    class不得持grid-area；Craft header与reward row必须各自scope。公共Stepper普通描边不得占盒模型，并保留
    invalid/focus/forced-colors base/invalid/focus/invalid+focus四态可辨识外框。Craft rail adoption只允许把
    railLayout改overlay，dataPaths/adapter/identity/commandOwner/revisionOwner必须不变。

Kimi 重点审可视对齐/1280/720/200%；GLM 重点审DOM、command、registry/census与零数据漂移。
请在任务卡“奖励行控件高度、配方卡几何与公共Stepper外框增量复审”本人席位写 accept，或带 file:line/复现步骤的 counter，
并追加交接记录。
不得代签另一席、不得填写用户验收、不得标记done、不得修改实现或推送。
```
