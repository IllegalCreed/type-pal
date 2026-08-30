# MIG-PAL-STORE0-SHOP-BOUNDARY-1 - PAL Store[0] 奖励表与商店边界收口

Status: draft
Phase: phase2
Capability: E9 商店 / 物品资源池（不改变 capability-map）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional（仅最终确认 Shop 目录不再出现 0 号伪商店）
Unavailable Agents: none
Branch: `main`

## 目标

修正 PAL 迁移把原始 `Store[0]`（紫金葫芦 `0x34` 的九档炼丹奖励表）误发布为普通 `ShopDef` 的上游缺陷。
PAL current / baseline 的 `content/shops.json` 只发布真实买店 `1..20`；物品 270 的九档奖励继续从源
`Store[0]` 精确派生。禁止只在 Shop UI 把 `buyPrice=0` 改写成“不可购买”，也禁止直接手改 `projects/pal`。

## 范围

- 范围内:
  - `migratePalShops` 区分脚本专用 `Store[0]` 与真实买店，保留原始 id `1..20`，不重编号。
  - 增加源 store / buy opcode / resource-pool / publication 永久门禁。
  - 通过完整发布更新 baseline/current 镜像，并验证二次发布零计划。
- 范围外:
  - 不改变 `ItemData.buyPrice` 的数字语义；作者仍可在真实 ShopDef 中配置 0 文免费商品。
  - 不把 `sellable=false` 解释成不可购买；它只约束当铺出售。
  - 不改变 Shop UI 文案，不增加 `shop 0` 兼容 fallback，不改 openShop 指令或 ShopDef schema。

## 前提真值门

### 一句话行为 / 工程前提

PAL `Store[0]` 是脚本资源池，不是买店；把它发布为 ShopDef 才使试炼果、舍利子在编辑器中被误读为“买价 0 文”。

### 四向真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | `0x26` 将 operand 直接传给 `PAL_BuyMenu`；原始 23 次 buy operand census 只有 `1..20`。`0x34` 则直接从 `lprgStore[0].rgwItems[i]` 发炼丹奖励。 | `reference/sdlpal/script.c:1157-1163,1470-1490`；`data/extracted/events/all.json` 可复算 census |
| 第一阶段 | 提取器明写 store 0 脚本专用、买菜单实际用 `1..N`；炼丹九档第 4/5 项为试炼果/舍利子。 | `packages/pal-extract/src/resources/parsers/stores.ts:17-24`；`docs/phase1/game-mechanics.md:697-725` |
| 当前二阶段 | `migratePalShops` 无差别 map 全部 21 个 store，current/baseline shops 都含 id 0；仅 shop0 含零价货单项 112/72。与此同时物品 270 已把同一九档奖励独立固化为 `drawFromResourcePool`。 | `packages/migrate/src/pal-derived-content.ts:170-171`；`projects/pal/content/shops.json:1-18`；`packages/migrate/baselines/pal/content/shops.json:1-18`；`projects/pal/content/items.json:9418-9452` |
| 本任务目标 | PAL publication 只输出 ShopDef 1..20；store0 仍只作为 item270 资源池的源真值，九档顺序与奖励不变。 | 本卡验收条件 |

### 独立 census

- 原始 `0x26` buy operand：23 次，唯一值 `1..20`；无 `PAL_BuyMenu(0)`。
- current canonical `openShop(mode=buy)`：29 次，只引用 `1..20`；6 次 sell 的 `shop=0` 不消费货单。
- current/baseline shops：各 21 项、id `0..20`、正文镜像。
- 真实 shops `1..20` 中零买价货单项为 0；零价只出现在伪 shop0 的 112/72。
- store0 九项：`100,105,95,112,72,131,97,102,111`；与 item270 rewards 精确一致。

### 最强替代解释与反证

- 替代解释 1：`buyPrice=0` 表示“不可购买”。反证：通用 `shopBuy` 只判断余额，0 文是合法免费结算；
  `sellable` 仅影响当铺。证据：`packages/content/src/shop.ts:10-34`。
- 替代解释 2：store0 必须作为 ShopDef 保留，资源池运行时会查 shops。反证：item270 已持有独立 rewards，
  运行时 `drawFromResourcePool` 不依赖 ShopDef；迁移读取 store0 的 owner 位于
  `packages/migrate/src/migrate-content.ts:1530`。
- 替代解释 3：只是 ShopTab 文案错误。反证：UI 正确呈现了 canonical ShopDef0；错在迁移把非商店表发布为商店。
- 会推翻当前前提的观察：发现原始 `0x26 operand[0]=0` 的真实买调用；或 `drawFromResourcePool` 运行时必须
  查 ShopDef0；或任一真实 store1..20 原始货单含 0 价商品。当前 census 均未发现。

### 用户可见 before -> after

- `before`：Shop 目录出现 0 号伪商店，货单第 4/5 项显示“试炼果 / 舍利子 · 买价 0 文”。
- `after`：Shop 目录只含真实商店 1..20；紫金葫芦仍按原九档抽取试炼果、舍利子等奖励。
- 是否偏离原版 / 第一阶段：否，恢复已核实真值。

## 上下文锚点

- 铁律：先修 migration / publication，上游缺陷未修前禁止手改 `projects/pal` 或增加 UI fallback。
- 相关实现：
  - `packages/migrate/src/pal-derived-content.ts:170-171`
  - `packages/migrate/src/migrate-content.ts:1518-1542`
  - `packages/migrate/src/pal-migration.ts:635`
  - `packages/editor/src/ui/ShopTab.tsx:77-79,224`
  - `packages/content/src/shop.ts:10-34`
- 不得重新引入：store id 重编号、0 价全局哨兵、sellable 推导 buyability、current-only 手改、旧版本 upgrader。

## 设计方案

1. `migratePalShops` 只发布 `store.id !== 0`，保留真实 id 1..20，不做 `-1` 重编号。
2. 新增聚焦测试证明：输出 20 项、无 id0、id1..20/货单不变；item270 rewards 仍精确等于源 store0。
3. PAL publication 永久断言：无 ShopDef0；全部 buy openShop 引用均命中真实 ShopDef；store0 rewards 闭合。
4. 完整发布 current/baseline；结构化 exact diff 只允许 `shops.json` 删除 id0 与相应 state hash 变化。
5. 发布 replay 与删除任何一次性辅助后再次 dry-run，均须 `writes=0 deletes=0 conflicts=0 asset-deletes=0`。

## 验收条件

- 数据：baseline/current shops 均为 20 项、id1..20、镜像；112/72 ItemData 原始 price0 不改；item270 九档不改。
- 引用：29 个 current buy 调用全部命中 1..20；sell 流程不依赖 shop 货单。
- exact diff：除 shops0 删除和派生 publication hash 外，items/scenes/命令/id/价格/奖励零变化。
- 测试：migrate 聚焦、PAL publication、typecheck、design-system gate 通过；受影响包全量只跑一次。
- 视觉：Shop 目录中不再出现 0 号伪商店或“试炼果/舍利子买价 0 文”；真实 1..20 商店不变。
- current-only：不保留转换器、兼容分支、UI 隐藏规则或 upgrader。

## 推进签字

### 进入 build 前：前提 / 设计

- Codex:
  - premise: **verified（2026-08-31）**——直读 SDLPal 0x26/0x34、提取器 store 注释、raw/current buy census、
    migration owner、ShopDef 结算语义与 item270 rewards；确认 UI 只是暴露上游分类错误。
  - design: **agree（2026-08-31）**——PAL migration 过滤 id0但不重编号；保留 store0 resource-pool source；
    publication/invariant/exact-diff/replay 全闭合，零 UI fallback。
- Kimi: pending（需独立 primary-source 证据与可证伪回答）
- GLM: pending（需独立 census / exact-diff / 测试矩阵）
- counter / 分歧: none
- build 准入结论: **blocked（缺 Kimi / GLM premise verified + design agree；签字齐前不得修改实现或生成内容）**

### 进入 done 前：审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- 用户验收: pending
- done 准入结论: blocked

## Draft / Build / Review 证据

- Draft：本卡与直接证据已建立；尚未修改 migration、tests、baseline/current 或 UI。
- Build：pending。
- Review：pending。

## 交接记录

- 2026-08-31 Codex: 用户质疑试炼果/舍利子“买价 0 文”。核验后确认 price0 为 raw 真值，但两项来自
  Store[0] 炼丹奖励表而非商店；根因为 `migratePalShops` 盲 map。按 migration 铁律开卡并停在 draft，
  未修改实现/生成内容。Next: Kimi / GLM 独立签 premise/design；三签齐前不得 build。

## 下一位 Agent 提示词

```text
审签 MIG-PAL-STORE0-SHOP-BOUNDARY-1（draft，不得实现）。

任务卡：docs/ops/tasks/MIG-PAL-STORE0-SHOP-BOUNDARY-1-pal-store-zero-resource-pool.md
先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md 与本卡全部证据。

角色：Kimi 核 primary source / 边界与反证；GLM 独立复算 raw/current census、exact-diff 与测试矩阵。
必须独立核实：0x26 buy 是否只使用 store1..20；0x34 是否独占 store0；item270 rewards 是否已脱离 shops；
0 价是否是通用合法价格；migratePalShops 过滤 id0且不重编号是否会留下悬空引用。

输出带 file:line / 可复现命令的 premise verified + design agree，或 counter 与推翻观察；写回任务卡。
Kimi / GLM build 前签字未齐，不得修改 migration/tests/baseline/current/UI，不得把卡推进 build。
```
