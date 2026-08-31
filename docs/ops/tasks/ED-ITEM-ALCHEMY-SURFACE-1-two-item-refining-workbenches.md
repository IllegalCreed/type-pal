# ED-ITEM-ALCHEMY-SURFACE-1 - 炼蛊皿与紫金葫芦双炼化工作台

Status: draft
Phase: phase2
Capability: Editor item authoring（不改变 capability-map）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: `main`
Depends On: `MIG-PAL-STORE0-SHOP-BOUNDARY-1`（只负责移除伪 ShopDef0）

## 目标

在“物品”模块增加两个相互独立的作者页面：

1. **炼蛊皿**：编辑材料到产物的有序 `craftRecipe` 对应关系；PAL 当前为五种虫卵分别炼成蛊。
2. **紫金葫芦**：编辑 `collectValue` 的九档奖励；每行明确显示“消耗 N 灵葫值 → 产物”。

两页直接读写现有 `ItemData.use.effects`，不新建 `alchemy.json`、奖励镜像或 PAL 专用 Shop 页面。Shop 页只
显示真实商店；普通物品页对这两种复杂效果只显示摘要与“在对应页面编辑”跳转，详细增删改由双炼化页唯一持有。

## 范围

- 范围内：
  - `EDITOR_MODULES` 的物品模块新增两个独立子页：`炼蛊皿`、`紫金葫芦`；不新增一级模块。
  - 两页分别从 live items 派生 `craftRecipe` 与 `drawFromResourcePool` owner；PAL 当前各恰一项（268 / 270）。
  - 新增共享炼化工作区壳，但两页使用独立 route、标题、帮助、列表语义与测试。
  - 复用 `DsCatalogWorkspace`、`DsObjectWorkspace`、`DsObjectHero`、`DsWorkbenchSection`、
    `DsInspectorHost`；form 区使用默认 inset，配方 / 档位直接列表使用 `contentLayout="list"`。
  - 继续通过 `UpdateItemCommand` 修改原 ItemData；补齐 route deep link、引用跳转、undo/redo 与删除保护。
  - Item 页撤下这两种 effect 的详细表单，只保留只读摘要、owner 物品信息和精确页面跳转，防止双编辑面。
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

- 左侧：只列含 `craftRecipe` effect 的物品；PAL 当前只显示“炼蛊皿 268 · 5 条配方”。
- 中间：Hero 显示 owner 物品；“炼蛊配方”用 edge-to-edge list，每行明确“材料 → 产物”，顺序即运行时优先级；
  复用现有 recipe editor / reorder / picker / Command，不复制 adapter。
- 右侧：摘要、优先级公式、物品引用与诊断；不复制详细表单。
- 详细 effect 的新增 / 删除 / 配方增删改 / 排序仅此页可做；Item 页只显示摘要和跳转。

### 页面二：物品 > 紫金葫芦

- 左侧：只列含 `drawFromResourcePool` effect 的物品；PAL 当前只显示“紫金葫芦 270 · 9 档”。
- 中间：Hero 显示 owner 物品；form 区显示 resource 与档数；“灵葫炼丹档位”用 edge-to-edge list。
- 每行序号是稳定档位，文案固定为“消耗 N 灵葫值”，只允许编辑奖励 item/count；不得出现买价、售价或可选配方。
- 增减档位必须原子同步 `maxRoll` 与 rewards 长度；重排奖励属于概率 / 消耗语义变化，必须使用明确移动动作和
  具体 aria，不得伪装成纯展示排序。
- 右侧：显示 PAL_CLASSIC 公式、当前资源 owner、奖励引用与不可达档位诊断；不编辑第二份数据。

### 唯一 owner

- 两页共同复用一个领域 adapter，但 route 与内容组件分开；不复制 state。
- `UpdateItemCommand` / EditSession history 是唯一 mutation owner；一次动作最多一条命令，undo/redo 可逆。
- Item 页对 `craftRecipe` / `drawFromResourcePool` 详细字段改为只读摘要 + 精确 deep link。
- Shop 页只拥有 ShopDef；Enemy 页只拥有敌人 collectValue；Skill 页只拥有 collectTreasure；入口页只拥有资源初值。

## 验收条件

- IA：物品模块恰新增两个独立子页，URL / back-forward / deep link 稳定；八个一级模块不变，子页仍不超过 5。
- 数据：PAL item268 仍精确 5 条配方；item270 仍精确 9 档与上述奖励；content19 / SAVE8 / schema shape 不变。
- 唯一编辑面：Item 页无这两种 effect 的详细表单；两个新页面分别是唯一详细 owner，跨页跳转不丢选择。
- 语义：炼蛊皿显示“材料 → 产物”和优先级；紫金葫芦显示“消耗 1..9 灵葫值 → 奖励”，无价格文案。
- invariant：所有 `drawFromResourcePool` 均满足 rewards.length === maxRoll；档位从 1 连续到 N，count 正整数，
  item 引用存在；奖励移动同步改变档位，不产生 cost 字段。
- 交互：新增 / 删除 / 调整 / picker / undo / redo 单命令；危险动作 danger icon + 具体 aria；窄宽动作组不拆。
- 空态：无匹配 effect、owner 物品删除、引用丢失、候选为空分别有明确状态，不跳到其他对象掩盖错误。
- 测试：navigation/DataMode、两页组件、Item 摘要跳转、validator、refs/delete protection、commands、DS gate；
  受影响 editor/content 全量各只跑一次。
- 视觉：1280 / 900 / 720 与 200% 检查两页列表、formula、长名称、滚动 owner、Inspector、无横向溢出。
- 与 migration 联验：Shop 目录无 0 号；两页仍精确显示 item268 / 270 数据；不得靠 UI 隐藏 Shop0。

## 推进签字

### 进入 build 前：前提 / 设计

- Codex:
  - premise: **verified（2026-08-31）**——直读 0x34 / item268 脚本、current item268/270、content runtime /
    validator、现 Item editor 与导航；确认两机制独立、档位即消耗、现 effect 已足够做两页且无需新 schema。
  - design: **agree（2026-08-31）**——两个独立子页、现 ItemData 为唯一 owner、Item 页摘要跳转、form/list
    公共布局、无 cost 镜像；与 migration 卡分离。
- Kimi: pending（需独立核 IA / 唯一 owner / 无 schema 的反证）
- GLM: pending（需独立核 5 / 9 census、测试矩阵与不可达档位 invariant）
- counter / 分歧: none
- 缺签豁免: N/A
- build 准入结论: **blocked（缺 Kimi / GLM premise verified + design agree；签字齐前不得实现）**

### 进入 done 前：审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- 用户验收: pending
- done 准入结论: blocked

## Draft / Build / Review

- Draft：用户产品裁决、双机制真值、无新 schema 设计与 paired migration 边界已登记。
- Build：pending。
- Review：pending。

## 用户验收

- 产品方向: **approved（2026-08-31）**——用户明确要求炼蛊皿 / 紫金葫芦两个页面。
- 实现验收: pending。

## 交接记录

- 2026-08-31 Codex: 独立核验 Store0 / item268 / item270 后，先纠正“Store0=炼蛊皿”的混淆；用户随后
  拍板两张独立页面。开本卡冻结双 route、唯一 ItemData owner 与不新增 schema 的最小方案；未修改实现。
  Next: Kimi / GLM 独立签 premise/design，三签齐前不得 build。

## 下一位 Agent 提示词

```text
审签 ED-ITEM-ALCHEMY-SURFACE-1（draft，不得实现）。

任务卡：docs/ops/tasks/ED-ITEM-ALCHEMY-SURFACE-1-two-item-refining-workbenches.md
先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡与
MIG-PAL-STORE0-SHOP-BOUNDARY-1 全文。

用户已拍板物品模块增加两个独立页面：炼蛊皿（材料→产物）与紫金葫芦（灵葫消耗→奖励）。请独立核：
item268=5条 craftRecipe、item270=9档 drawFromResourcePool；档位 index+1 即 spent，不存在 cost 字段；
两个页面直接写现 ItemData、Item 页只摘要/跳转是否能保持唯一 owner；不新增 schema/content20 是否充分；
rewards.length===maxRoll 收紧、奖励移动语义、CRUD/undo/ref/delete/route/视觉测试是否闭合。

Kimi 输出独立 primary-source / IA / 反证；GLM 输出 5/9 census、测试矩阵与 fail-loud 条件。将 premise
verified + design agree 或 counter 写回本卡；不得修改实现，不得代签另一席，不得推进 build/done。
```
