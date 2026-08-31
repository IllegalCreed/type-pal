# MIG-PAL-STORE0-SHOP-BOUNDARY-1 - PAL Store[0] 奖励表与商店边界收口

Status: done
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
  - 不在本卡新增编辑器页面或炼化 schema。用户拍板的“炼蛊皿 / 紫金葫芦”两个独立页面由
    `ED-ITEM-ALCHEMY-SURFACE-1` 消费现有 item268 / item270 canonical effect，不反向扩大本 migration 卡。

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
- item268 炼蛊皿是独立的 5 条 `craftRecipe`（虫卵 117..121 → 蛊 148），与 Store0 / item270 无关。

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
4. 完整发布 current/baseline；结构化 exact diff 只允许 `shops.json` 删除 id0 与 baseline state 中该文件
   hash 变化。无其他漂移时首次 PAL plan 必须精确 `writes=1`。
5. 发布 replay 与删除任何一次性辅助后再次 dry-run，均须 `writes=0 deletes=0 conflicts=0 asset-deletes=0`。

## 验收条件

- 数据：baseline/current shops 均为 20 项、id1..20、镜像；112/72 ItemData 原始 price0 不改；item270 九档不改。
- 引用：29 个 current buy 调用全部命中 1..20；sell 流程不依赖 shop 货单。
- exact diff：除 shops0 删除和派生 publication hash 外，items（含 item268 / 270）、manifest、scenes、命令、
  id、价格、奖励零变化；content19 / SAVE8 不变。
- 测试：migrate 聚焦、PAL publication、typecheck、design-system gate 通过；受影响包全量只跑一次。
- 视觉：Shop 目录中不再出现 0 号伪商店或“试炼果/舍利子买价 0 文”；真实 1..20 商店不变。
- current-only：不保留转换器、兼容分支、UI 隐藏规则或 upgrader。

## 推进签字

### 进入 build 前：前提 / 设计

- Codex:
  - premise: **verified（2026-08-31）**——直读 SDLPal 0x26/0x34、提取器 store 注释、raw/current buy census、
    migration owner、ShopDef 结算语义与 item270 rewards；确认 UI 只是暴露上游分类错误。
  - design: **agree（2026-08-31）**——PAL migration 过滤 id0但不重编号；保留 store0 resource-pool source；
    publication/invariant/exact-diff/replay 全闭合，零 UI fallback；用户新增双页面决定由独立 ED 卡消费
    现有 effect，本卡保持 migration-only，原设计仍有效。
- Kimi:
  - premise: **verified（2026-08-31，独立直读 sdlpal 源、提取器、raw/current census、migration/
    runtime/validator owner 与 shops/items 数据，非复述 Codex/GLM；与 GLM 证据各自独立取得后收敛）**：
    1. **primary source 实锤**:0x26 把 operand 直传 `PAL_BuyMenu`、无 0 值守卫
       （reference/sdlpal/script.c:1156-1163）；0x34 在 PAL_CLASSIC 分支
       `i=RandomLong(1,wCollectValue)` 封顶 9、`wCollectValue-=i`、`i--` 后
       `PAL_AddItemToInventory(lprgStore[0].rgwItems[i],1)`（script.c:1465-1490）——
       Store[0] 就是紫金葫芦九档奖励表，档位 index+1 即灵葫消耗；提取器明写 store0 脚本专用、
       0x26 实际用 1..N（packages/pal-extract/src/resources/parsers/stores.ts:17-24）；
       九档表与 docs/phase1/game-mechanics.md:697-725 逐字一致。
    2. **raw census 本人复算**:data/extracted/events/all.json 全扫 `opcode=0x26` → **23 次、
       operand 恰为 1..20、无 0**——“无 PAL_BuyMenu(0)”成立（与 GLM 独立一致）。
    3. **current census 本人复算**:projects/pal/content 全扫 openShop → **buy 29 次、引用恰
       1..20、buy shop=0 为 0**；sell 6 次全 shop=0，且 reforge runtime sell 走
       `sellableItems(world, project.items)` 不查 shops（packages/reforge/src/main.ts:3442-3452），
       店不存在仅 report 后续跑不死锁——“sell 不依赖货单”在运行时成立；
       packages/content/src/validate-refs.ts 无 per-command shop 引用校验（本人 grep 仅注释命中），
       删除 ShopDef0 不产生新诊断。
    4. **根因与数据实锤**:`migratePalShops` 盲 map 全部 21 store（pal-derived-content.ts:170-171）；
       shops.json 恰 21 项 id 0..20、shop0 items=`100,105,95,112,72,131,97,102,111`、
       零价仅 112 试炼果/72 舍利子、真实店 1..20 零价项为 0（本人 node 复算）；
       item270 已独立持有同一组九档 rewards，迁移从源 stores 读取（migrate-content.ts:1530），
       运行时 drawFromResourcePool 不依赖 ShopDef0。
    5. **替代解释排除**:“buyPrice=0=不可购买”被 `shopBuy` 推翻——只判断 `money < buyPrice`，
       0 文是合法免费结算，sellable 只管当铺（packages/content/src/shop.ts:10-34）；
       “store0 必须作 ShopDef 供资源池运行时查询”被推翻——item270 rewards 独立固化；
       “只是 UI 文案错”被推翻——ShopTab 如实呈现了被错误发布的 canonical ShopDef0，错在上游分类。
    6. **可证伪观察**:任一 raw 0x26 operand=0（本人 census：无）；任一 current buy shop=0
       （本人 census：无）；sell 或 validator 解析 ShopDef（直读：均无）；真实店 1..20 出现
       零价商品（本人 census：无）——出现任一项本签字失效。
  - design: **agree（2026-08-31，附 KM1-KM4 必落钉；与 GLM GM-A1~A4 收敛互补）**：
    - **KM1（过滤不重编号，同 GM-A2）**:migratePalShops 仅过滤 `store.id !== 0`，原始 id 1..20
       原样保留——operand 即 id，重编号即断全部 29 处 buy 引用。
    - **KM2（永久门禁三件套，同 GM-A1/A4）**:publication 断言无 ShopDef0；buy-only openShop 引用
       命中真实 ShopDef（sell shop=0 合法豁免，GLM GM-A1 负例双 fixture 背书）；store0 → item270
       rewards 闭包精确一致；item268 与本迁移零交集。6 条 sell `shop=0` 保持 canonical 原值不改写。
    - **KM3（exact-diff 与 current-only，同 GM-A3）**：首次 plan 精确 `writes=1`（shops.json）+
       baseline state hash；items/manifest/scenes/content19/SAVE8/价格/命令/奖励零变化；
       replay 与删除一次性辅助后的 dry-run 均 `writes=0 deletes=0 conflicts=0 asset-deletes=0`；
       不保留转换器/upgrader/UI 隐藏规则。
    - **KM4（build 期必查的编辑器呈现，本席独有补充）**:CommandForm openShop 对 buy/sell 同显
       店铺下拉（CommandForm.tsx:1814-1826），移除后 6 条 sell `shop=0` 的值不在 options 内——
       本人确认 DsSelect 的 onValueChange 仅由用户交互触发（CommandForm.tsx:131-149），无静默
       改写风险；build 视觉验证须覆盖这 6 条 sell 命令的表单显示状态（原值保留、无误导文案），
       不得靠删命令或加 fallback 消灭该显示。
- GLM:
  - premise: **verified（2026-08-31，raw/current census 全部本人脚本独立复算 + 一手语义直读，非复述 Codex）**：
    1. **raw 0x26 census 精确复算**：`data/extracted/events/all.json` 43503 命令中 opcode 38（0x26）恰
       **23 次**，operand[0] 值域**恰 1..20**（1/2/3 各 2、4..20 各 1），**零次 =0**——与卡面逐字一致。
       opcode 52（0x34）**恰 1 次**（L_39713），与 ED 卡锚点同源。
    2. **一手语义直读**：`reference/sdlpal/script.c:1157-1163` `PAL_BuyMenu(rgwOperand[0])` 直传；
       `:1452-1490` `i=RandomLong(1,wCollectValue)`（封顶 9）→ `wCollectValue -= i` → `i--` →
       `AddItemToInventory(lprgStore[0].rgwItems[i])`——**Store[0] 独占炼丹奖励、档位 i+1 即消耗**。
    3. **一阶段真值**：`pal-extract/src/resources/parsers/stores.ts:17-20` 注释明写
       「lprgStore[0] 是脚本专用，0x0026 实际用 1..N」。
    4. **current census 复算**：shops.json current/baseline 各 **21 项 id 0..20 且逐字镜像**（本人
       `cur == base` 为 True）；零买价货单**只**出现在伪 shop0 的 112/72（真实 1..20 零项）；shop0
       九项 `['100','105','95','112','72','131','97','102','111']` 与 item270 rewards **逐项相等**；
       canonical openShop：buy **29 次全部 1..20**（无 0），sell **6 次全部 shop=0**。
    5. **sell 不读 shops 实锤（关键反证）**：`packages/reforge/src/main.ts:3444-3452` openShop host——
       buy 查 `project.shops.find(id)`，sell 直接 `sellableItems(world, project.items)`，**shop id 仅进
       报错文案**；`shop.ts:17-18` shopBuy 只判余额（0 文合法免费）。删除 ShopDef0 后 6 次 sell 完全
       不受影响。
    6. **根因与改点唯一**：`pal-derived-content.ts:170-172` `migratePalShops = stores.map(全部)` 盲 map；
       全库唯一消费点 `pal-migration.ts:635 put('content/shops.json', ...)`；item270 奖励独立派生自
       **raw stores**（`migrate-content.ts:1530 find(store.id===0)`），与 derived shops 无关——过滤
       id0 结构上只影响 shops.json。
  - design: **agree（2026-08-31，附 GM-A1~GM-A4 必落钉）**：
    - **GM-A1（buy-only 引用 invariant 钉）**：publication 永久断言「全部 **buy** openShop 引用命中真实
      ShopDef」必须显式限定 `mode === 'buy'`——现存 6 次 sell 命令携带 shop=0 且语义合法（运行时
      main.ts:3448 sell 分支不读 shops）；负例双 fixture：sell shop=0 + ShopDef 缺失必须**保持绿**，
      buy 悬空引用必须**红**。现 validate-refs.ts 对 shop id 零扫描（本人 grep），新增 invariant 是
      首个此类断言，不得误伤 sell。
    - **GM-A2（过滤语义钉）**：过滤必须为 `store.id !== 0` 且**原样保留 id 1..20 不重编号**；聚焦测试
      断言输出恰 20 项、id 序列恰 1..20、每店 items 数组与过滤前逐字相等；**零价合法性不扩大**——真实
      店中 buyPrice=0 货品仍合法（不做全局零价禁令），仅伪 shop0 消失；item 112/72 的 ItemData
      buyPrice=0 原始真值不改。
    - **GM-A3（exact-diff 与幂等钉）**：结构化 diff 允许集恰为 {shops.json 删除 id0 元素}；items（含
      268/270）、manifest、scenes/index、content19、SAVE8、价格、奖励零变化；首次 PAL plan 必须精确
      **writes=1**（按 content path 计——LABEL 卡先例 17 路径跨双树=writes=17）；完整 replay 与删除
      一次性辅助后的独立 dry-run 均 `writes=0 deletes=0 conflicts=0 asset-deletes=0`。
    - **GM-A4（268/270 永久区分钉）**：永久门禁同时断言（a）shops 无 ShopDef0；（b）item270 rewards
      仍逐项等于源 store0 九项 `[100,105,95,112,72,131,97,102,111]`（池源读 raw stores 的 owner
      migrate-content.ts:1530 不动）；（c）item268 的 5 条 craftRecipe 与本迁移零交集——三者任一
      漂移即红。
  - 独立反证：①若 raw 中出现 `0x26 operand[0]=0` 的真实买调用（本人 census 23 次零命中）或 canonical
    出现第 30 个 buy 引用 shop0——前提失效停线；②若 sell 运行时/校验在任何路径读取 ShopDef 货单
    （main.ts sell 分支实测只读背包）——删除 shop0 造成回归，转 rework；③若真实店 1..20 原始货单
    含 0 价商品（本人 census 零命中）——「零价仅伪店」前提失效，零价合法性钉需重审。
- counter / 分歧: none（Kimi KM1-KM4 与 GLM GM-A1~A4 逐项收敛；KM4 为 Kimi 独有的编辑器呈现补充，
  不构成 counter）
- build 准入结论: **allowed（签字面）（2026-08-31，Codex + Kimi（KM1-KM4）+ GLM（GM-A1~A4）三签齐、
  无 counter，两席非 Owner 独立反证完成）。Codex 开工时状态转 build，仍为唯一 Coding Owner。**

### 进入 done 前：审查签字

- Codex: **accept（2026-08-31，`ff6c9532`）**——migration-only build 全部落钉：生成层过滤 Store0
  不重编号；current publication 显式重放 generated shops；永久门禁覆盖无 ShopDef0、buy-only 引用命中、
  sell shop0 合法、item270==源 Store0 九档、item268 保持 5 recipe 且无 resource pool。首次 dry plan
  `writes=1`；发布 transaction-changes=3，内置 replay 与独立第二轮均
  `writes=0 deletes=0 conflicts=0 asset-deletes=0`。结构化 diff 仅 current/baseline shops 删除 id0 与
  baseline state 的 shops hash；items/manifest/scenes/content19/SAVE8/价格/奖励零变化。migrate 全量
  50 files / 391 tests、typecheck 与聚焦 4 files / 8 tests 全绿。1280px 实机 Shop 20 行 id1..20、无
  伪店/试炼果/舍利子；s029 sell shop0 表单保留原值，显示“0（缺失）/卖（当铺收购）”，无静默改写。
- Kimi: **accept（2026-08-31，只读终审 `ff6c9532` + 本人独立复核命令与聚焦复跑，非复述 Codex）**。
  按 KM1-KM4 与卡面核验点逐项核验：
  - **过滤不重编号 ✓（KM1/GM-A2）**:`migratePalShops` 现为
    `stores.filter(store => store.id !== 0).map(...)`（pal-derived-content.ts:170-173），原始 id 与
    货单原样保留；本人 node 复算 working tree——current shops 恰 20 项、id 序列恰 `1..20`、
    baseline 与 current 逐字镜像；shops.json diff 恰 −14 行（仅删 id0 元素）、`_state.json` 仅
    `files["content/shops.json"]` 一行 hash 变化。
  - **buy/sell 边界 ✓（KM2/GM-A1）**:`assertPalStoreBoundaryInvariant`（pal-store-boundary.ts:126-184）
    永久断言：禁止发布 ShopDef0、源/发布真实商店 id 序列恰 1..20、buy openShop 必须命中真实
    ShopDef、sell 仅计数豁免且 sell shop 恒为 0（publish 侧钉 `expectedBuyCalls:29 /
    expectedSellCalls:6 / expectedSellShopId:0`，pal-current-publication.ts:301-309）；sell 运行时
    不读 shops 的前提（设计期本人直读 main.ts:3442-3452）未被本提交改变，CommandForm 对 sell
    shop=0 的呈现由 Codex 实机证据覆盖（保留原值显示“0（缺失）”，无静默改写）——KM4 闭环。
  - **item270/268 区分 ✓（GM-A4）**:`assertSpiritGourd`（:74-98）断言源 Store0 恰九档
    `[100,105,95,112,72,131,97,102,111]`、item270 唯一 pool、resource=collectValue、
    maxRoll==源档数、rewards 序列==源、count 全 1、112/72 原始 buyPrice 保持 0；
    `assertVesselRecipes`（:44-52）断言 item268 恰 1 个 craftRecipe×5 且 resource pool 为 0——
    本人 node 复算 working tree 与之一致（item270 rewards 九档精确、item268 零交集）。
  - **exact-diff 与幂等 ✓（KM3/GM-A3）**：本提交仅 shops.json×2 + state hash + 迁移侧代码/测试，
    零 editor 文件（本人 `git show --stat` 证实）；Codex 记录首次 plan writes=1、
    transaction-changes=3、内置 replay 与独立第二轮四项全零，与本卡验收口径一致。
  - **无 workaround ✓**：无 UI 隐藏规则、兼容分支、upgrader 或一次性转换器（Shop 目录的 0 号
    消失来自 canonical 数据，非 UI 过滤）。
  - **本人复跑**:pal-store-boundary（unit+pal）+ pal-derived-content + migrate-content +
    pal-authored-overlays + pal-current-publication → **6 files / 75 tests 全绿**（含真实 PAL
    镜像断言 item268 recipes/message 与 item270 源闭包）；按纪律未重复全量。
  无返工项；未修改实现，未代签 GLM。
- GLM: **accept（2026-08-31，只读终审 `ff6c9532` + 当前工作树独立复算与聚焦复跑，非复述 Codex/Kimi）**。
  按 GM-A1~GM-A4 与卡面核验点逐项独立核验：
  - **过滤不重编号 ✓（GM-A2）**：本人 node 复算 working tree——current/baseline shops 均 20 项、id 序列
    严格 `1..20`、无 id0、两树字节镜像；`git show ff6c9532` 生成侧 diff 恰两树 shops.json 各 −14 行
    （仅删 id0 元素）+ `_state.json` 仅 `content/shops.json` hash 一行；本提交零 editor 文件
    （本人 `git show --stat` 复核）。
  - **buy/sell 边界 ✓（GM-A1）**：本人重扫 canonical 全部 openShop——buy 29 次引用恰为 `1..20`、
    零次 shop=0；sell 6 次全 shop=0；运行时 sell 分支 `sellableItems(world, project.items)` 不读
    shops（`packages/reforge/src/main.ts:3442-3452` 直读）；`assertPalStoreBoundaryInvariant`
    （pal-store-boundary.ts:126-184）永久断言禁 ShopDef0、源/发布 id 序列 1..20、buy 命中真实店、
    sell 恒 0，publication 每次发布执行并钉 `expectedBuyCalls:29 / expectedSellCalls:6 /
    expectedSellShopId:0`（pal-current-publication.ts:310-318）。
  - **raw 真值与 268/270 区分 ✓（GM-A4）**：本人重扫 all.json——0x26 恰 23 次、operand 值域恰
    `1..20`、零次 0；0x34 恰 1 次（L_39713）；sdlpal 直读 0x26 直传 `PAL_BuyMenu(rgwOperand[0])`
    （script.c:1157-1163）、0x34 读 `lprgStore[0].rgwItems[i]`（script.c:1465-1490）；raw
    stores.json store0 = `100,105,95,112,72,131,97,102,111` 与 item270 rewards 逐项相等、
    maxRoll=9、count 全 1；真实店 1..20 零买价货单 0 项、112/72 buyPrice 保持 0；item268 恰
    1 craftRecipe ×5（117..121 ×1 → 148 ×1）零 pool——与本迁移零交集。
  - **幂等 ✓（GM-A3）**：本人在当前工作树独立复跑只读 migration plan：
    `managed=537 writes=0 deletes=0 conflicts=0 asset-deletes=0`——独立二次零计划成立（该工作树
    已含后续 `62e30f56`，两卡合并状态下仍零漂移）。
  - **无 workaround ✓**：ShopTab 无 id0 过滤（:73 为货单排除、:242 为编辑删除，均无关）；无
    upgrader/兼容分支/UI 隐藏规则，0 号伪商店消失来自 canonical 数据本身。
  - **本人复跑**：pal-store-boundary（unit 8 + pal 1）+ pal-derived-content + pal-current-
    publication.pal（2）→ 4 files / 12 tests 全绿（craft 卡另补 2 files / 63 tests，两卡合计
    6 files / 75 tests；按纪律未重复全量）。
  无返工项；未修改实现，未代签 Kimi，未填用户验收。
- 用户验收: **approved（2026-08-31）**——用户在两席终审 accept 落卡后回复“签了”，确认依赖卡验收并放行收口。
- done 准入结论: **allowed / complete（Codex + Kimi + GLM 三方 accept + 用户验收齐，无 counter）**

## Draft / Build / Review 证据

- Draft：本卡与直接证据已建立；尚未修改 migration、tests、baseline/current 或 UI。
- Build：2026-08-31 Codex 按三签准入开工；仍为唯一 Coding Owner。
- Review：completed；Codex / Kimi / GLM accept 与用户验收齐，任务收口 done。

## 交接记录

- 2026-08-31 User/Codex: Kimi / GLM 终审均 accept；用户回复“签了”确认验收。无 counter、无剩余返工，
  本卡转 done，解除 `MIG-PAL-GOURD-FAILURE-MESSAGE-1` 的 Store0 依赖。
- 2026-08-31 GLM: 只读终审 `ff6c9532` + 当前工作树，签 **accept**。独立证据：node 复算 shops 双树
  20 项 id 严格 1..20、字节镜像、diff 恰 −14 行删 id0 + state 单 hash 行；重扫 canonical openShop
  buy 29 全 1..20 零 0、sell 6 全 shop=0，sell 运行时不读 shops（main.ts:3442-3452 直读）；重扫
  raw all.json 0x26 恰 23 次 operand 1..20 零 0、0x34 恰 1 次；sdlpal script.c 0x26/0x34 直读；
  raw store0 九档 == item270 rewards 逐项相等、真实店零价 0 项、112/72 buyPrice 保 0、item268
  5 配方零 pool 零交集；invariant + publication 钉 29/6/0 直读；零 editor 文件、无 UI 隐藏/
  upgrader；本人独立复跑只读 plan 全零（managed=537 writes=0 deletes=0 conflicts=0
  asset-deletes=0）+ 聚焦 4 files / 12 tests 全绿。无返工项；未修改实现，未代签 Kimi，未填用户
  验收。三方 accept 齐，仅剩用户验收；无下一位 Agent 提示词，等待用户验收/收口。
- 2026-08-31 Kimi: 只读终审 `ff6c9532`，签 **accept**。独立证据：过滤 `store.id !== 0` 不重编号
  （pal-derived-content.ts:170-173）；本人 node 复算 shops 20 项 id 1..20、current==baseline 镜像、
  diff 恰 −14 行仅删 id0、state 仅 shops hash；永久 invariant 直读（禁 ShopDef0、id 序列 1..20、
  buy 命中真实店、sell 豁免且恒 shop=0、publish 钉 29/6/0）；assertSpiritGourd 九档源闭包 +
  112/72 buyPrice 保 0、assertVesselRecipes 268 恰 5 配方零 pool；零 editor 文件、无 UI 隐藏/
  兼容/upgrader；本人复跑 6 files / 75 tests 全绿。无返工项；未修改实现，未代签 GLM，未标 done。
  Next: GLM 终审与用户验收。
- 2026-08-31 Codex: 完成 `ff6c9532` migration-only build。红测先证明 migratePalShops 输出 21 项、
  PAL current/baseline 含 ShopDef0；修复后首次 plan writes=1，发布与独立 replay 全 0，exact diff 白名单
  恰三路径。永久 invariant / unit / PAL truth / publication 全绿；migrate 全量 391。浏览器证据：
  `.mimosa/evidence/PAL-SHOPS-WITHOUT-STORE0-1280.jpg`、
  `.mimosa/evidence/PAL-SELL-SHOP0-PRESERVED-1280.jpg`。Codex 签 accept，转 review。
  Next: Kimi / GLM 终审；两席与用户验收齐前不得 done。

- 2026-08-31 Codex: 核对 Kimi KM1-KM4 / GLM GM-A1-GM-A4 三签齐、无 counter，状态转 build。
  先完成 migration-only exact diff / replay，再进入依赖的双炼化页面卡。

- 2026-08-31 Kimi: 独立直读 sdlpal 0x26/0x34、提取器注释、raw census（0x26 恰 23 次 operand 1..20
  无 0）、current census（buy 29 全 1..20、sell 6 全 shop=0 且运行时不读 shops、validate-refs 无
  shop 扫描）、盲 map 根因与 shops/items 数据（shop0 九项==item270 rewards、零价仅 112/72、真实店
  零价 0），排除三条替代解释。签 premise verified + design agree，附 KM1（过滤不重编号）/KM2
  （永久门禁三件套）/KM3（exact-diff writes=1 + 双零计划 + current-only）/KM4（sell shop=0 在
  CommandForm 的呈现 build 期必查，无静默改写风险——本席独有补充）。未修改实现，未代签 GLM。
  三签齐，build 准入（签字面）allowed。Next: Codex 按钉 build。
- 2026-08-31 GLM: 独立复算全部 census（raw 0x26 恰 23 次值域 1..20 零次 0；0x34 恰 1 次；shops
  current/baseline 21 项镜像、零价仅伪 shop0 的 112/72；shop0 九项 == item270 rewards；buy 29 次
  全 1..20、sell 6 次全 shop=0）+ 直读 SDLPal 0x26/0x34、sell 运行时不读 shops（main.ts:3448）、
  shopBuy 零价合法、migratePalShops 盲 map 唯一消费点 pal-migration.ts:635。签 premise verified +
  design agree，附 GM-A1（buy-only 引用 invariant 防 sell 假红负例）/GM-A2（过滤不重编号 + 零价
  合法性不扩大）/GM-A3（exact-diff 允许集恰 shops.json 删 id0、首跑 writes=1、双零计划）/GM-A4
  （shops 无 0 + item270==store0 + item268 零交集三断言）。未修改实现，未代签 Kimi。
  Next: Kimi 签 primary-source/边界反证后三签齐，Codex 方可 build。
- 2026-08-31 Codex: 用户质疑试炼果/舍利子“买价 0 文”。核验后确认 price0 为 raw 真值，但两项来自
  Store[0] 炼丹奖励表而非商店；根因为 `migratePalShops` 盲 map。按 migration 铁律开卡并停在 draft，
  未修改实现/生成内容。Next: Kimi / GLM 独立签 premise/design；三签齐前不得 build。
- 2026-08-31 User/Codex: 用户拍板炼蛊皿与紫金葫芦分别做独立页面。再次核验确认 Store0 只属于
  紫金葫芦，炼蛊皿是 item268 craftRecipe。页面另开 `ED-ITEM-ALCHEMY-SURFACE-1`，本卡收窄保持
  migration-only；首次 exact plan 收紧为 shops.json 单一 write。未修改实现/生成内容。

## 下一位 Agent 提示词

```text
终审 MIG-PAL-STORE0-SHOP-BOUNDARY-1 当前实现（Kimi / GLM reviewer）。

任务卡：docs/ops/tasks/MIG-PAL-STORE0-SHOP-BOUNDARY-1-pal-store-zero-resource-pool.md
当前状态：review；Codex `ff6c9532` accept，Kimi / GLM done 前 accept pending，用户验收 pending。
只读审查，不得修改实现，不得标 done。

已冻结结论：Store[0] 是紫金葫芦 0x34 九档奖励表（非商店）；raw 0x26 恰 23 次 operand 1..20；
current buy 29 次全 1..20、sell 6 次 shop=0 且运行时不读 shops；migratePalShops 盲 map 是根因；
item270 rewards 已独立固化。不得重开这些前提。

逐项核 build 必落钉：KM1/GM-A2 过滤 `store.id !== 0` 不重编号；KM2/GM-A1/A4 永久门禁三件套
（无 ShopDef0 + buy-only 引用命中真实 ShopDef（sell shop=0 合法豁免、buy 悬空必红负例）+
store0→item270 rewards 闭包 + item268 零交集）；KM3/GM-A3 首次 plan 精确 writes=1（shops.json）
+ baseline state hash，items/manifest/content19/SAVE8 零变化，replay 与删辅助后 dry-run 双零计划，
不保留转换器/upgrader/UI 隐藏；KM4 build 视觉验证须覆盖 6 条 sell shop=0 命令在 CommandForm 的
显示（原值保留、无误导），以及 Shop 目录无 0 号伪商店。
证据：首次 plan writes=1；发布 replay 与独立第二轮全0；diff只三路径；migrate 50 files / 391 tests、
typecheck、聚焦8；两张浏览器截图。按风险复跑聚焦测试，不要重复全量。
输出本席 accept，或 file:line + 复现反例 counter；写回任务卡与交接日志，不得代签另一席。
```
