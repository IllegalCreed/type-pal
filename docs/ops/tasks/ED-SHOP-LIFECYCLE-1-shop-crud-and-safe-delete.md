# ED-SHOP-LIFECYCLE-1 - 商店生命周期闭环

Status: done
Phase: phase2
Capability: E9 / Editor shop lifecycle
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex（1280×720）+ Kimi（720宽补验）
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: main
Design Revision: shop-design-r1（2026-09-05；实现基线 dc332df4）
Implementation Revision: shop-impl-r1 / 7e6f935a（实现前0980f90d；其代码等于dc332df4）

## 目标

让作者在商店工作区内完成商店的新建、复制、安全删除、撤销/重做、保存重开和独立试买；
删除前只把真实读取 `ShopDef` 的 buy 指令作为引用，并直接消费 ED-3 的统一 `ProjectReferenceIndex`。

## 范围

- 范围内:
  - 商店目录的新建、复制与稳定数值 id 展示；继续使用货单内容派生的可读目录标题。
  - 安全删除、统一引用面板与结构化跳转；`openShop(mode='buy')` 阻断，sell 的历史 `shop` 值不形成引用。
  - 复制、重排和保存精确保留已有货单顺序与重复项，全部作者操作可 undo/redo、保存重开。
    不顺带改变当前“上架物品”选择器避免重复追加的策略。
  - 使用正式 Reforge 商店结算做独立试买，覆盖余额充足/不足、物品入包和价格真值。
  - 修正 PAL 合并后目标误用固定商店 census 的校验；保留既有三方合并，保证作者合法修改可发布、冲突显式阻断。
- 范围外:
  - 不重做物品数据、当铺卖出机制、炼蛊皿或紫金葫芦机制页。
  - 不改 ED-3 边合同，不新增商店私有引用收集器。
- 明确不做:
  - 不把 sell `shop=0` 或任意非零历史字段解释成商店引用。
  - 不自动改写 `openShop`、不级联删除、不把目录派生标题当稳定身份。
  - 不为本卡新增 ShopDef 名称、持久字段、contentVersion、upgrader 或 fallback；原用户范围没有要求可编辑商店名。
  - 不改旧敌队试打/技能试放的存档策略；不扩成通用试玩前置状态配置（X5 已排第三阶段）。

## 前提真值门

### 一句话行为 / 工程前提

当前商店缺复制、安全删除和独立试买；既有三方合并已经保留作者商店修改，真正的发布障碍是合并后目标
仍被要求恰为 PAL 原来的 20 家店、29 buy/6 sell，必须拆开生成数据保护与作者目标校验。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | 原始数据中 store1 货单为 87/99/105/95/90、价格 50/50/200/550/3000。作者 CRUD 为 N/A（原版无作者编辑器）。买读 store、卖读背包的行为另以 sdlpal reference 取证，不冒称本次观察 PAL.EXE。 | `data/raw/DATA.MKF` chunk0 @0x40、21×18 bytes；`data/raw/SSS.MKF` chunk2 @0x283f0，OBJECT 的 id×14+2 价格；解码 `packages/pal-extract/src/resources/parsers/stores.ts:28`、`items.ts:87`；`reference/sdlpal/script.c:1157,1166`、`uigame.c:1642,1665,1683,1775` |
| 第一阶段 | buy 才读 stores；买一次入包1件，资金不足不进确认；sell 读可卖背包、按原价半价结算。没有二阶段作者 CRUD。 | `packages/game/src/shell/bootstrap.ts:1254`；`packages/game/src/core/menu/menu-driver.ts:346`、`shop-menu.ts:65`、`sell-menu.ts:94`；`packages/game/src/core/event-system.ts:2282` |
| 当前二阶段·编辑与结算 | ShopDef 只有 number id/items；新建空店，标题从货单派生，无复制/删除/试买。buy 查店，sell 不查；正式结算用独立 buyPrice/sellPrice，不能把二阶段卖价重新推成半价。 | `packages/content/src/shop.ts:11,17,27`；`packages/editor/src/core/commands.ts:4163,4199`；`packages/editor/src/ui/ShopTab.tsx:44,129,152`；`packages/reforge/src/main.ts:3442` |
| 当前二阶段·合并与校验 | publisher 的 shops 是 theirs；createMigrationPlan 按 id 三方合并，items 原子数组保序保重复。但 CLI 验 plan.target 时强制原店数量/顺序与指令数量，导致作者 CRUD 被拒。 | `packages/migrate/src/pal-current-publication.ts:186,327,338`；`packages/migrate/src/migration-merge.ts:44,111`；`packages/migrate/scripts/migrate-content.mts:70,78,90,115`；`packages/migrate/src/pal-store-boundary.ts:140` |
| 本任务目标 | 复用 ED-3 补七环；生成侧仍保护源 Store0/真实店，作者 target 按结构+真实 buy 引用验证；独立试买复用正式菜单/结算而不运行剧情或读写存档。内容20/SAVE8不变。 | 用户已批准第二阶段队列；`docs/ops/tasks/ED-3-project-reference-index.md`；下述 r1 设计与矩阵 |

### 2026-09-05 只读诊断（实现基线 dc332df4）

以下通过 stdin 内存副本调用实际 `createMigrationPlan` / `validatePalCurrentPublication`；其中指令数量与
sell999反例直接调用 `assertPalStoreBoundaryInvariant`，未另跑完整planner→validator，取证层次在表中注明。
没有改 PAL 工程、baseline 或实现文件，也没有执行 migration write。

| 观察 | planner | 合并 target 的现有发布门 |
|---|---|---|
| 作者新建 id21 空店 / 复制 id21（含重复货品） | 精确保留 ours，writes/deletes/conflicts=0；推进纯 generated baseline 后 replay 仍零 | 拒绝：真实商店 id/顺序不再等于1..20 |
| 作者删除原店20 | 保留删除，零计划 | 先被固定目录门拒；且20店均有 buy，正式删除还必须解除这些引用 |
| 作者修改 shop1 货单顺序与重复项 | 精确保留，连续 replay 零计划 | 通过，直接反证“重迁必覆盖作者货单” |
| 只新增/删除一条合法 buy | 未单独跑planner；代码链表明target会交给同一门禁 | 直接invariant分别报30≠29、28≠29 |
| 只将一个 sell 历史 shop 改成999 | 未单独跑planner；代码链表明target会交给同一门禁 | 直接invariant报sell shop应为0；实际运行与ED-3不读此值 |
| 作者改店1、上游改店2 | 保留两边，shops一次写入、下次 replay零 | 合并算法本身满足分店 ownership |
| 同店货单双改 / 作者删店而上游改店 / 重复id | 分别 value、delete-modify、invalid-identity 冲突 | CLI在发布写盘前停线 |

数字口径：原始字节码是23次0x26买店；29 buy/6 sell是当前 canonical PAL 作者根展开后的 census，
不能混称。原始20家店全部有 buy 引用，不存在可直接删除的“无引用原店”。

### 反证与替代解释

- 最强替代解释1：publisher重新生成shops必然覆盖作者，所以需要新ownership字段/新合并算法。
  反证：上表合法货单修改实际通过完整发布；theirs=base 时现有合并保留ours，baseline保持纯theirs。
- 最强替代解释2：只放宽店数就够。反证：合法新增buy、sell999仍被固定指令 census 拒绝。
- 最强替代解释3：独立试买等于在boot末尾打开商店。反证：`main.ts:578` 已建持久SaveStore、
  `main.ts:6940` 已启动auto runners，可能先跑剧情；必须在这些副作用之前进入隔离分支。
- 可证伪观察：合法作者差异在source/base不变时被实际merge丢弃；或隔离试买触及SaveStore/剧情；
  或移除固定census后dangling buy仍通过，任一出现即停线复核本设计。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: ED-3 已用一手 runtime 分支和 29 buy/6 sell census 固定 buy-only。
  - 原版 / 第一阶段理解: 只约束结算真值，不推导编辑器 IA。
  - extractor / 地图 / 数据解码: 原始MKF货单/价格与extracted一致；本缺陷不在提取器或商店生成值。
  - audit / test model: 已分别调用实际planner和完整target validator；零计划不等于目标合法，必须两者同验。

### 用户可见偏离

- 是否主动偏离已核真值: yes（补齐二阶段作者工作流，不改变买卖结算机制）
- `before -> after` 一句话: 只能新建和改货单 -> 可复制、安全删除、保存重开并用正式结算试买。
- 代表场景: 复制一间有重复货品的商店并修改顺序；buy 引用阻止删除，sell 不阻止；解除 buy 后删除并 undo。
- 用户裁决: 2026-09-04 已将商店生命周期列为第二阶段必须项；2026-09-05 场景收口后要求“推进吧”。
  本卡不借生命周期新增名称、重做货单样式或扩展通用试玩前置配置。

## 上下文锚点

- 已拍板决策 / 铁律: `AGENTS.md`; `docs/phase2/READ-FIRST.md`; ED-3 buy-only 真值与 current-only 纪律。
- 代码锚点(`file:line`):
  - `packages/content/src/shop.ts:11`
  - `packages/reforge/src/main.ts:3442-3452`
  - `packages/editor/src/core/commands.ts:4163-4215`
  - `packages/editor/src/ui/ShopTab.tsx:90-180`
  - `packages/editor/src/core/project-reference-adapters.ts`
  - `packages/migrate/src/pal-current-publication.ts`
  - `packages/editor/src/ui/DataMode.tsx:432`（待传入已存在的referenceIndex/status/provider/open locator）
  - `packages/editor/src/core/project-reference-adapters.ts:1927-1944`（current main+script cold复核）
  - `packages/editor/src/ui/EnemyTeamTab.tsx:177-196,416,572`（引用fail-closed与既有试玩入口）
  - `packages/editor/src/play.ts:33-75`（同源workspace身份与已保存工程）
  - `packages/reforge/src/menu/shop-box.ts:74-145,148`（正式输入/确认/绘制）
  - `packages/reforge/src/main.ts:578,6040,6437,6940`（存档、商店呈现/输入、auto启动）
- UI合同: `docs/phase2/editor/editor-design-system-v1.md` DS-F.4/F.4a、DS-L.4、DS-C.2/C.4f；
  Hero是对象动作唯一owner；主表单数字用带stepper的`DsNumberField`；列表content无padding、表单有padding；
  Inspector只能有一个纵向滚动owner。复用现有组件，不为本卡设计新的按钮/列表外观。
- 一阶段知识: `docs/phase2/foundation/phase1-knowledge-harvest.md` §X7/X9、§MG1/MG2；
  `docs/phase1/game-mechanics.md:697-725` 仅作紫金葫芦边界参考，不把资源池混回买店。
- 已知坑 / 审计文档: `docs/ops/tasks/ED-5I-item-workbench.md`; `docs/ops/tasks/MIG-PAL-STORE0-SHOP-BOUNDARY-1-pal-store-zero-resource-pool.md`;
  ED-3 的 29 buy + 6 sell、current-author、TOCTOU 与 fail-closed 约束。
- 不得重新引入: shop=0 伪引用、派生标题身份、页面私有 scanner、自动 cascade、直接手改 PAL 生成产物。
- 相关测试: `shop.test.ts`, `ShopTab.test.tsx`, `commands.test.ts`, `project-reference*.test.ts`,
  `pal-current-publication.pal.test.ts`。

## 验收条件

- 功能:
  - 新建/复制/删除均通过 Command；复制精确保留货单顺序与重复项并生成新稳定 id。
  - 删除前由 ED-3 index 展示全部 buy 引用；sell `shop=0` 与 sell 非零 fixture 均不成为引用。
  - checking/stale/failed/current-without-index 全部 fail-closed；确认后 live 新引用和 redo 均重新验真。
  - 保存重开、完整target validation与current publication后作者数据不丢；纯baseline replay四零；冲突停线。
  - 独立试买使用正式 `shopBuy`/Reforge 路径，断言余额、价格、背包和不足反馈，不做 UI 仿真结算。
- 测试:
  - 货单空/单项/重复项、create/copy/delete/cancel、buy/sell、provider failure、TOCTOU、undo/redo、
    保存重开、publication ownership 与正式试买。
  - editor/content/migrate typecheck、聚焦测试、最终 editor 全量、production build、design-system gate。
- 文档: 更新 editor design、roadmap、capability-map 与商店/当铺说明；不把炼化机制混回商店。
- 视觉 / 手工验证: 空商店、有货商店、被 buy 引用商店；1280/720；引用跳转、删除确认与试买反馈。
- E2E 用例登记: 空白项目 → 新建/复制商店 → 上架货品 → 保存重开 → 正式试买 → 安全删除；
  已有重复货单通过fixture验证，不声称UI新增重复上架能力。

## 推进签字

### 进入 build 前:设计签字

- Codex: **premise verified | design agree（2026-09-05，shop-design-r1，基线dc332df4）**。
  已直接读正式输入/结算、current-author引用接口和CLI合并→target校验→纯theirs baseline全链；
  内存反例证明问题在固定census门而非merge覆盖。支持下述schema-neutral方案及生成/作者双层门禁，
  独立试买早分支无SaveStore/剧情。只完成设计，不宣称实现/验收完成；Kimi/GLM仍须独立取证。
- Kimi: premise **verified**（2026-09-05，ownership/运行链视角一手直读，针对
  shop-design-r1 / 实现基线 `dc332df4` / 文档候选 `30ecc092`，非复述 Codex）:
  1. **缺陷定位正确（固定 census 误施于作者 target，非合并覆盖）**:
     - 合并本身保留作者:`mergeAtomicNode` 在 theirs==base 时取 ours
       （`migration-merge.ts:111-120`),shops.json 在 id-mode 名单（`:49`）按店 id 分店
       ownership；同店双改/删改冲突显式登记（`:122-124`)。
     - baseline 保持纯生成:`buildPalCurrentPublication` 的 shops 直接取 generated
       （`pal-current-publication.ts:186`)。
     - 误拦点在 CLI 链:plan.target（合并后作者目标）交给
       `validatePalCurrentPublication`(`migrate-content.mts:78-94`),validator 读 shops
       并调用 `assertPalStoreBoundaryInvariant({expectedBuyCalls:29, expectedSellCalls:6})`
       （`pal-current-publication.ts:327,338-344`)；该 invariant 强制 真实店恰为 1..20、
       禁 ShopDef0、固定 29/6 指令数与 sell shop=0(`pal-store-boundary.ts:140-168`)——
       作者增删店/id0/增删 buy/sell 非零全部被误拦，与 r1 诊断表逐项一致。
  2. **生成保护与作者 target 可安全拆分**:源侧断言（Store0 唯一/奖励非零/源真实店
     1..20/112·72 buyPrice=0/灵葫/炼蛊保护）保护的是生成数据，必须留；target 侧安全网
     已在通用 validator——dangling buy = error(`validate-refs.ts:1292-1294` 经 ED-3
     typed walker,buy-only 识别 `command-target-reference.ts:185-192`),
     shop.items→item = error(`:1588-1593`)。移除 target census 后悬空 buy 仍 fail-loud,
     作者自由编辑不再被冻结。
  3. **buy-only 与 id0/Store0 边界**:运行时 buy 查店、sell 只查背包
     （`reforge/main.ts:3442-3452`,ED-3 已核）;sell 的 0/非零历史值不成引用；
     `:140` 禁 ShopDef0 防的是迁移把源 Store0 再生成为商店（伪店），作者显式 id0 是合法
     稳定 id（非负安全整数）,r1 "作者 id0 ≠ 源 Store0 回生、绝不新增隐式回退"边界成立。
  4. **独立试买复用正式结算且可隔离**:正式 `shopInput/shopBuy/drawShop` 为可导入函数
     （`menu/shop-box.ts:76-151`；默认否 `:137`、不足不进确认 `:135`、确认 Esc 回货单
     `:93-97`、货单 Esc 关店 `:119`)——无需新结算模拟器；空货单 Down 使 cursor=-1 的
     边界 bug 真实存在（`:122` `Math.min(-1, …)`）且修复范围正确；早分支可行——
     SaveStore 创建于 `main.ts:578`、剧情/auto 起于 `:6940-6941`
     （applyWorldToScene/startAutoRunners)，参数在 `:570` 区域已可用，分支先于此即可
     不触存档/剧情;play.html workspace 身份链现成（`editor/src/play.ts:33-77`)；
     不新增持久字段/contentVersion/boot 公共签名。
- Kimi: design **agree**（2026-09-05；三签齐后允许 build）。目录与命令、安全删除
  fail-closed、生成/作者双层门禁、隔离试买与实现顺序均是最小合法方案；必改钉（build
  落实条件，非阻塞）:
  ① **门禁拆分归属钉**:源侧断言继续对纯生成 publication 跑（生成基线回归不削弱）;
     target 侧被删的每条 census（恰 20/29/6/sell=0/禁 id0）在 diff 逐条可见，不得静默
     连坐删源侧断言；item268/270 保护原样保留。
  ② **隔离试早分支证明**:集成测试必须断言 SaveStore 未构造、applyWorldToScene/
     startAutoRunners 未调用、IndexedDB 槽零读写（spy/探针），不得只断言"显示了商店";
     `shop-trial=0` 与缺参数区分测试（id0 不得被 truthy 吞掉）。
  ③ **空货单边界**:修 `:122` 不得改变有货列表导航；空表 Up/Down/Escape/确认四键各
     一条测试。
  ④ **redo 不重新编号/不重读源**:`DuplicateShopCommand` 首次 apply 捕获目标 id 与
     货单深拷,redo 用捕获值——源店已改/已删后 redo 仍恢复同一复制体专测。
- 可证伪观察:
  ① 合法作者差异在 source/base 不变时被 merge 丢弃 → 前提推翻，停线；
  ② 移除 target census 后 dangling buy 通过 target 验证 → 安全网失效，停线；
  ③ 隔离试买触及 SaveStore/IndexedDB/剧情 runner → 隔离失败；
  ④ sell 非零历史值被 ED-3 或 target 校验当成引用/错误 → buy-only 边界失效；
  ⑤ 重迁二跑非零或作者 shops 被生成覆盖 → ownership 失效。
- GLM:
  - premise: **verified（2026-09-05，shop-design-r1 / 基线 `dc332df4`；全部口径与反例本人独立
    复算——数字 census、raw 货单/价格、真实 `createMigrationPlan` 内存实测与
    `assertPalStoreBoundaryInvariant` 直调，非复述 Codex）**：
    1. **数字口径一手复算（核 1）**：raw `all.json` 全扫 opcode 0x26 恰 **23 次**、operand
       值域恰 **1..20**、零 0；canonical（作者根递归）恰 **29 buy + 6 sell、sell 全
       shop=0**——两种口径确为「原始字节码 vs canonical 作者根展开」，不可混称。
    2. **原始货单/价格一手复算**：raw store1 items = `[87,99,105,95,90]` 与 current shop1
       逐项一致；raw items price 87→50 / 99→50 / 105→200 / 95→550 / 90→3000 与 current
       `buyPrice` **逐项相等**——真值矩阵 primary source 行属实。
    3. **三方合并保留作者——真实 planner 实测（核 2，本人 vitest 探针跑真实
       `createMigrationPlan`，6 反例全绿后探针即删未入库）**：作者新建 **id21 空店** →
       零冲突、target 精确保留 `{id:21,items:[]}`；**复制 shop1→id22 含重复货品** →
       target items 恰 `['87','99','105','95','90','87','87']`（顺序+重复逐字保留、
       无 Set 去重）；**删除原店 20** → 零冲突、target 不含 id20；**shop1 改序+加重复** →
       精确保存 `['90','95','105','99','87','87']`；**同店货单双改**（ours id1=['87'] vs
       theirs id1=['99']）→ **value 冲突落在 shops 路径**——「merge 保留作者、同店双改
       冲突、重迁并非必然覆盖」全部实测成立。
    4. **固定 census 误拦作者 target——invariant 直调实锤（核 2/3）**：合并后 target
       （含 id21）交 `assertPalStoreBoundaryInvariant` → 抛 `真实商店 id/顺序漂移
       1..20,21 != 1..20`（pal-store-boundary.ts:145-148 硬等 `sameStrings`）；构造 sell
       `shop=999` 单根直调 → 抛 `sell shop 应为 0`——「作者 CRUD/增删 buy/sell 被固定
       PAL census 拒绝、根因在 target 校验层不在 merge」实锤；发布链直读——publisher
       `put('content/shops.json', generated)`（pal-current-publication.ts:186）+ merge 按
       id 三方合并（migration-merge.ts:49 shops 'id' 模式）+ CLI 对 plan.target 调
       validatePalCurrentPublication（migrate-content.mts:89）→ :337-342 固定 29/6/0——
       「拆生成保护与作者 target 校验」双层结构成立；**Store0 生成保护不退化**——
       pal-store-boundary.ts:132-135 禁 ShopDef0、源真实店 1..20 序列校验、源 Store0
       奖励闭包均在生成侧门内，拆分后须原样保留。
    5. **试买隔离锚点直读（核 3 部分）**：main.ts:578 SaveStore 创建与 :6940
       `startAutoRunners()` 在 boot 尾段——早分支前 return 时序有据；`shopBuy`
       （shop.ts:17-25）独立 buyPrice、判 `money < buyPrice`（**0 价合法**）、入包叠加
       语义清晰；`shopInput` list 相 Down `Math.min(len-1, cursor+1)`（shop-box.ts:122）
       ——**空表 len=0 时 cursor 推到 -1**（本人复算 min(-1,1)=-1），卡面局部边界缺陷
       属实；现有命令层仅 `UpdateShop/AddShop`（commands.ts:4163,4199）——无复制/删除，
       缺口属实。
    6. **可证伪观察**：合法作者 shop 差异在 source/base 不变时被真实 merge 丢弃（本人
       实测未发生）；隔离试买触及 SaveStore/buildWorld/runner 或 IndexedDB 槽；移除固定
       census 后悬空 buy 仍通过 validateReferences；空表 Down 修复后仍越界；已有重复货品
       在复制/保存/replay 任一环被去重——任一出现本签字失效。
  - design: **agree（2026-09-05，附 GM-SH1~GM-SH4 必落钉；与卡面矩阵收敛互补）**：
    - **GM-SH1（双层门禁拆分钉）**：生成侧门（源 Store0 资源池、真实店 1..20 货单/顺序
      vs raw stores、canonical 29/6/sell0）保留且继续跑固定种子基线；作者 target 侧只施
      ShopDef 结构验证（unique 非负安全整数 id、items 可空/非空 string/重复合法）+
      validateReferences 既有 buy→shop、shop.items→item——**buy 增/删、sell 任意历史值、
      店数变化、作者 id0 均不得再触发固定 census**；item268/270 机制保护不受拆分影响；
      旧「current==baseline 全等」测试改固定生成基线断言、生成回归门不降。
    - **GM-SH2（复制/删除命令钉）**：DuplicateShopCommand 首次 apply 深拷贝+固定目标 id
      （max+1、空集 0、溢出/冲突 fail-loud），redo 不重读源不重编号；DeleteShopCommand
      捕获完整记录+原位索引、undo 原位恢复；删最后一家 → 显式空表合法；取消零命令、焦点
      归还、深链不指向消失对象；删除经 ED-3 index 复核（current exact + blockers=0 +
      apply/redo 冷复核），sell 0/999 双负例不阻断。
    - **GM-SH3（试买隔离矩阵钉）**：早分支在 SaveStore/buildWorld/runner 之前 return（时序
      已证可行）；参数严校验（id0 不得 truthy 吞掉、与其他启动模式互斥拒绝、workspace
      身份同源）；dirty 拒绝且弹窗打开后再改工程也拒绝（启动瞬间复检）；测试矩阵——默认
      否/确认是、余额恰好/不足（不进确认不扣钱不入包）、**0 价合法**、新入包/叠加、
      **重复货品分次购买**、**空表 Up/Down/Escape（修 cursor=-1 并以 min/max 断言钉死）**、
      确认态 Escape 回货单、结束清理 rAF/listeners；旧 IndexedDB 槽字节不变断言。
    - **GM-SH4（验收矩阵钉 + 两补充）**：Command/UI/引用/保存重开/合并发布/上游冲突六层
      按卡面表逐项落地；**补充①**——合并层 fixture 必须含「作者删店而上游改同店 →
      delete-modify 冲突写盘前停线」与「作者显式 id0 合法（生成侧门以源数据而非 target
      判 Store0 回流）」两个易漏项；**补充②**——「长引用末项可滚到、tab/header 不滚」
      须真实浏览器实测并登记为 done 前必查项。
- 独立反证审查: Kimi与GLM已分别读取一手调用链，GLM另独立复算raw/canonical与真实planner反例；两席均通过。
- counter / 分歧处理: 无counter；Kimi四钉与GM-SH1~SH4全部纳入build验收。
- 缺签豁免: N/A
- build 准入结论: **build allowed（2026-09-05；三方对shop-design-r1签字齐，用户“签了”后推进）**。

### 进入 done 前:审查签字

- Codex: **accept（2026-09-05，shop-impl-r1；实现与下述已完成验证）**。三签设计已落实：
  生成/作者校验拆分、current-only结构验证、命令闭环和live删除守卫、正式菜单早分支隔离、公共字段/列表均落地。
  宽屏功能视觉已验；720宽已由Kimi独立补验并提交截图，Codex已读取证据，不再留补验pending。
  编辑器重型规范测试的超时与重跑情况完整记录在Build，不掩盖首轮失败。三方终审与用户产品验收均通过，现已收口。
- Kimi: **accept（2026-09-05，只读终审候选 `7e6f935a`（对比 `0980f90d`）+ 设计四钉独立
  直读复算 + 本人 720 实机补验与聚焦复跑，非复述 Codex）**：
  1. **钉① 生成/作者校验分离 ✓**:`buildPalCurrentPublication` 在合并前的 generated 侧跑
     完整固定 census（29/6/sell0 + 禁 ShopDef0 + 新增逐店货单与源一致
     `pal-store-boundary.ts:157-161`），注释明确"never apply to merged author target";
     target 侧仅 `validateShops` 结构门 + `assertPalAlchemyBoundaryInvariant`
     （`pal-current-publication.ts:207-219,343-357`);buy→shop/shop.items→item 通用引用
     规则原样。
  2. **Store0 保护 ✓**:Store0 唯一/奖励非零/灵葫/炼蛊断言经
     `assertPalAlchemyBoundaryInvariant` 在生成侧与 target 侧双调用，item268/270 保护
     零漂移。
  3. **buy-only 实时删除守卫 ✓**:`DeleteShopCommand.apply` 每次（含 redo）经
     `collectCurrentProjectDeletionImpact(currentReferences, …)` 冷复核并 throw
     ShopInUseError(`commands.ts:4273-4301`);UI 按钮 disabled(!current/有 blocker/无
     provider)、确认时再查 + 命令再验双层（`ShopTab.tsx` submitIntent);sell 0/999 不入
     引用（ED-3 typed leaf 不变）。
  4. **钉④ redo 固定快照 ✓**:`DuplicateShopCommand` 首次 apply 以
     `this.copy ?? { ...structuredClone(source), id: targetId }` 捕获深拷与固定目标 id,
     redo 不重新编号、不重读源货单（`commands.ts:4245-4271`);previousManifest 一次捕获。
  5. **钉⑤ 正式试买隔离 ✓**:`bootGame` 首行分支 `parseShopTrialParameters → runShopTrial
     → return`(`main.ts:349-353`),先于 SaveStore(:578）与剧情/auto(:6940);
     `params.has('shop-trial')` 不吞 id0、仅允许 4 参数、非负安全整数严校验
     （`shop-trial.ts:15-29`)；正式 `openShopUi→shopInput→shopBuy→drawShop` 直用、局部
     world、无 SaveStore/剧情；空表 cursor 钉 0 且非空导航不变（`shop-box.ts:120-124`);
     退出/pagehide 清理 rAF/监听。
  6. **兼容审查 ✓**:content 仅新增 `validateShops`（非负安全整数唯一 id、货单非空字符串
     数组、重复合法）,ShopDef 形状/manifest 可选 shops 路径/content20/SAVE8 不变；
     diff 内 upgrader/legacy/fallback/content19 零命中（`fallbackFocusRef` 为焦点 API,
     adoption 测试 stale-legacy 负例是门禁本职）。
  7. **720 实机补验 ✓（本人 playwright,viewport 720×720 实测 innerWidth=720）**:
     Hero 三动作（复制/试买/删除）完整可见不裁切；店3引用 tab 面板滚动
     511→639/scrollTop 0→128.5、末项 bottom 663≤panel 680 可达、tablist 固定 y=120;
     试买弹窗 520×282 完整在视口、只读店号 + `初始金钱` label 关联 + −/+ stepper 均
     36×36、取消正常关闭（前次"未关"为同帧测量假象，分帧复查已关）;document/body
     横溢 0、console error 0。截图 `docs/ops/evidence/ED-SHOP/shop-trial-dialog-720.jpg`。
  复跑：editor 4 files / 22 tests、reforge 试买 2 files / 10 tests、migrate 3 files /
  9 tests（含"protects the fixed generated seed while author shops need not mirror" PAL
  钉测试与 publication ~34s）全绿；全量 content 488/reforge 869/editor 1747+1/migrate
  424、typecheck、双 build、DS gate、双 dry-run 四零采信 Codex 记录未重复。
  **返工项：无**；未修改实现，未标 done。
- GLM: **accept（2026-09-05，只读终审候选 `7e6f935a`（对比 `0980f90d`）+ GM-SH1~SH4 逐钉
  独立直读复算与聚焦复跑，非复述 Codex/Kimi）**：
  - **GM-SH1 双层门禁拆分 ✓**：`assertPalStoreBoundaryInvariant` 现带注释「Generated PAL seed
    only; never apply this fixed census to a merged author target」，在 publication 的
    **generated 侧**（theirs，合并前）继续跑完整固定 census（29/6/sell0 + 禁 ShopDef0 +
    生成店货单与源逐店一致 `生成商店 N 货单与源不一致` 新断言）；**merged target 侧改调
    `assertPalAlchemyBoundaryInvariant`**——只保 item268/270 机制保护（SpiritGourd/
    VesselRecipes），固定店数/buy/sell census 不再施于作者 target（publication diff 逐行
    核）；`validateShops`（shop.ts:17-31）共享结构门——非负安全整数、重复 id fail-loud、
    items 非空字符串数组**重复合法**——loader（project-loader.ts:280 `?? []` 空集合合法）、
    保存、发布三处复用；item 机制回归未降（pal-store-boundary.pal 仍绿）。
  - **GM-SH2 复制/删除命令 ✓**：`DuplicateShopCommand`（:4244）首次 apply 深拷贝 + 固定
    id，**redo survives changed or deleted source**（测试名实证——redo 不重读源）；
    `DeleteShopCommand`（:4284）捕获原位恢复、删最后一家合法、**redo rechecks canonical
    buy**；provider failure 与 live unsaved buy 均不授权删除（shop-lifecycle 四测直读）；
    sell `shop=999` 双负例在命令层（shop-lifecycle.test:107）与 publication 层
    （pal-current-publication.pal.test:46 把 canonical sell 改 999 仍通过——历史值不形成
    引用/错误）；AddShop 首店登记 manifest shops 路径（commands.ts:4176-4178）。
  - **GM-SH3 试买隔离矩阵 ✓**：`bootGame` 首分支识别 shop-trial 后 `await runShopTrial` +
    `return`（main.ts diff 直读——位于 world/SaveStore 初始化之前）；测试以真实 bootGame +
    **sentinel probes**（`buildWorld/IndexedDbSaveStore/MemorySaveStore/runtimeProjectView`
    注入探针 :42-47）与 `indexedDB.open` spy（:77,162 `expect(openDb).not.toHaveBeenCalled()`
    + save/world/projection 全零调用）钉死隔离——比「显示菜单即算」强一档；参数严校验
    id0 ≠ 无试玩、与其他 boot 模式互斥拒绝（首个测试名）；**空货单 cursor 修复**——
    `if (s.list.length === 0) { s.cursor = 0; s.scrollTop = 0; return }`（shop-box.ts diff）
    消除 `min(-1,1)=-1` 边界（本人设计期复算的 bug 已修）；shop-box.test 83 行含正式
    shopInput 路径；退出/pagehide/draw error 均清理 rAF/监听（三个专项测试）。
  - **GM-SH4 合并 fixture 与发布 ✓**：shop-author-merge.test 覆盖——作者新建 id3/id0
    （含重复 `['b','a','b']`）/改序/清空 `[]` 四形态保留 + **双跑 replay 零计划**；同店
    双改 value 冲突 `/@number:1/items`；**delete-modify 冲突** `/@number:2`；重复 id
    invalid-identity；id3 双方不同 value 冲突——设计期两条易漏 fixture 均落；
    pal-current-publication.pal 补「作者 id0 空店 target 通过 + 悬空 buy 拒绝」。
  - **PAL 数据零漂移 + 零计划复算 ✓**：本人独立 dry-run `managed=537 writes=0 deletes=0
    conflicts=0 asset-deletes=0`、reference-warnings=0；PAL shops 仍恰 20 家 id 1..20；
    **未向 PAL 开发基线写入任何测试商店**（工作树仅 evidence 目录未跟踪文件）。
  - **旧版本兼容审查 ✓**：无旧类型/版本分支/upgrader/升级入口/fallback；manifest 未声明
    shops = 当前格式的合法空集合（loader `?? []`），非兼容 shim；content20/SAVE8 未动。
  - **测试诚实性 ✓**：Build 节如实记录首轮 5 项扫描超时 + 1 处登记未同步 → 修正后串行
    43 测过 → `--maxWorkers=2` 1747 过 → 余 1 项九次超时加 15s 预算（与相邻扫描测试一致、
    断言不变）单独过——不称「一次全绿」，推荐复跑命令如实；**planner 零计划未被当作
    target 验证替代**——完整 publication 验证在 pal.test 内跑真实 target。
  - **本人复跑**：migrate 门禁三件（shop-author-merge + pal-store-boundary.pal +
    pal-current-publication.pal）**3 files / 9 tests**、editor 生命周期四件
    （shop-lifecycle + ShopTab + project-io + play-workspace）**4 files / 22 tests**、
    reforge 试买双件 **2 files / 10 tests**、content shop **1 file / 16 tests**——全绿
    （合计 10 files / 57 tests）+ reforge typecheck 干净。
  - **可证伪观察**：固定 census 从 generated 侧消失或 item 机制保护降级；作者合法 shop
    差异被真实 merge 丢弃；试买路径触碰 `indexedDB.open`/save/world 探针；空表 cursor
    再越界；sell 历史值重新成为引用/错误；PAL 双跑非零——任一出现本 accept 失效。
  - **遗留（非返工项）**：720 宽视觉由 Kimi 补验（卡面已登记）；FSA 写盘→重开→试玩完整
    自动化链登记 R4/编辑器综合工作流（核心序列化→loader 重开与同源身份测试已在）。
  无返工项；未修改实现/生成数据，未代签 Kimi，未填用户验收。
- counter / 返工处理: 无counter、无返工项；Kimi与GLM均对7e6f935a accept，720宽已补验通过。
- 缺签豁免: N/A
- done 准入结论: **done allowed；候选7e6f935a三方accept、720宽补验通过，用户2026-09-05明确“验收通过”，现标记done。**

## Draft: 设计与风险

### 设计结论

#### 1. 目录与命令

- 沿用现有三栏。左侧只保留“新建店铺”；中央 `DsObjectHero.actions` 增加“复制店铺 / 独立试买 / 删除店铺”。
  右侧为“摘要 / 引用 / 说明”，复用`DsReferencePanel/List/Row`与既有结构化打开动作。
- 新建/复制取当前最大id+1（空集合为0）；只接受非负安全整数，溢出或冲突明确失败，不按数组位置重编号。
  `DuplicateShopCommand`首次apply深拷贝货单并捕获固定目标id，redo不重新编号、不重新读取已修改的源货单。
- `DeleteShopCommand`捕获完整记录与原目录位置，undo原位恢复；删除最后一家合法，界面回到现有空态。
  选中删除对象后选择相邻店，恢复/redo不得留下指向已消失对象的深链；测试确认取消零命令与焦点归还。
- 当前上架picker两处去重不变；复制/载入/重排不得对已有重复项做Set转换或排序。数据条目数不当成去重后种类数。

#### 2. 安全删除和保存

- DataMode将已经提供的`projectReferenceIndex/status/getCurrentProjectReferenceIndex/onOpenProjectReference`
  传入ShopTab；不另写scanner。只有`current + 有index + blockers=0`允许确认删除。
- 点击最终确认与Command每次apply（包括redo）均按current main+canonical script冷复核，provider抛错即阻断。
  弹窗打开后新增buy也必须拒绝；sell的0/999不阻断。只删ShopDef，不级联改脚本、物品或资产。
- 沿现有EditSession与工程序列化保存shops；新店需要确保manifest的shops路径存在，全部删空仍保存显式空表。
  仅补当前ShopDef声明形状的公共验证（unique非负安全整数id；items数组可空、每个元素为非空string、重复合法），复用于当前
  loader/保存/发布边界；manifest未声明shops仍是合法空集合，不视为旧版本。无新增持久字段或版本切换。

#### 3. PAL生成保护与作者target分离

- 不改`migratePalShops`输出、不换三方merge、不把merged作者结果回填baseline。baseline继续写纯publication/theirs。
- 生成源门继续证明Store0只用于资源池、真实店1..20与源货单一致且不重编号；固定PAL种子/基线回归继续证明
  canonical29buy/6sell、sell0。原始opcode23次买与canonical census分开记录。
- 合并后target不再施加“恰20家、恰29/6条、sell必须0、禁止作者id0”。只用当前ShopDef结构验证与
  `validateReferences`已存在的buy→shop、shop.items→item规则；无buy时允许shops=[]，有sell仍合法。
  作者显式创建id0不等于迁移把源Store0重新生成为商店，绝不新增隐式回退。
- 拆分`pal-store-boundary`调用时保留item268/item270现有配方/资源池保护；本卡不修改它们的ownership、公式或文案。
  旧“current shops必须与baseline全等”测试改成固定生成基线断言+作者target语义断言，不能降低生成回归门。

#### 4. 独立试买（不是新的结算模拟器）

- “独立试买”打开公共`DsDialog`：只读店号、`DsNumberField`“初始金钱”（默认1000文、非负安全整数）、
  “取消 / 开始试买”；数字控件有label和公共stepper，不用裸number input。表单有公共内边距。
- 只读已保存工程；若任一main/script作者改动未保存，禁止开始并直接显示“请先保存工程，再试买”，
  不仅放disabled tooltip、不自动保存。重新检查启动瞬间dirty，避免弹窗打开后改工程仍试旧数据。
- 沿同源`play.html?project=…&workspace=…&shop-trial=<id>&money=<n>`；project/workspace身份规则原样保留。
  严校验参数和商店存在性，id0不得被truthy判断吞掉；与scene/entry/battle/skill/e2e-load等启动模式混用明确拒绝。
- `bootGame`在创建SaveStore、buildWorld、场景runner之前进入Reforge内部窄分支并return；不修改公开boot签名，
  不向editor导出内部菜单。加载正式菜单资产/字库，局部空背包/空队伍与指定金钱，直接调用
  `openShopUi → shopInput → shopBuy → drawShop`。不新建任何SaveStore，不跑开场/auto/探索，不改工程。
- 正式320×200菜单形态与整数倍率保留。一次购买一件，确认默认否；不足时留在货单、不进确认、不扣钱不入包，
  不凭空追加错误toast/音效。0价合法。空货单可安全上下键及Escape（修当前Down使cursor=-1的局部边界）。
- 确认态Escape回货单；货单Escape结束试买，清理rAF/listeners并显示可关闭标签页的结束状态，绝不落入剧情。
  “现有”仅本次试买所得，关闭/刷新即丢弃；真实存档槽完全不访问。

#### 5. 实现顺序与验证范围

先补校验归属反例并拆分门禁，再做CRUD/引用与保存，最后接隔离试买；仍是同一张卡、同一Coding Owner。
不得在关键设计签字未齐时先改其中一部分。

| 验证层 | 必须覆盖 |
|---|---|
| Command/UI | 空表/id0、新建/复制深拷贝/重复货单/删除最后店、原位undo/redo、稳定id、取消零命令、选中与焦点 |
| 引用 | 所有current作者根buy、sell0/999、checking/stale/failed/current无index、provider异常、确认后新增引用、redo重新校验、结构化来源跳转 |
| 保存/重开 | 新店shops路径、货单顺序/重复项、删除后空表；只修改预期shops/manifest，不修改物品/脚本/资产 |
| 合并/发布 | 作者新建/复制/改/删/清空（解除buy后）；作者id0；增删buy/sell；悬空buy拒绝；完整target验证+内容保留+纯baseline replay零计划 |
| 上游冲突 | 不同店双改自动合并；同店货单双改、删除/修改、同id新增冲突；冲突前不得写产物/资产/事务 |
| 正式试买 | 直接驱动shopInput：默认否/确认是、余额恰好/不足/0价、新入包/叠加、重复项、空表导航/退出；不另写模拟扣款 |
| 隔离与来源 | 启动分支不触SaveStore/buildWorld/runner；旧IndexedDB槽不变；无效参数/缺店/缺物品/workspace丢失fail-loud；已保存新店/新价格真实生效 |
| 视觉 | 空/有货/有引用店，1280×720与720宽；原货单外观不变，Hero动作可达，公共NumberField同壳；长引用末项可滚到、tab/header不滚，modal焦点归还；真实试买余额和现有数 |

build期使用聚焦Vitest（`pnpm --filter <package> exec vitest run <files>`）、受影响包typecheck、最终受影响
包全量各一次与editor/reforge production build、design-system采用门禁。PAL实际工程应仍为零内容diff，
连续dry-run四零；作者修改/冲突案例放隔离fixture，不向真实PAL工程加入测试商店。

### 已知风险

- 风险：把固定源census删除而非移至正确归属，可能放走源Store0回流；仅去掉店数又会留下指令数误拦。
  缓解：生成种子与作者target分别验证，保留item机制保护与buy-only引用；反例见上表。
- 风险：试买接得太晚会跑剧情/接真实存档，或直接另写扣款逻辑；隔离启动集成与正式shopInput测试必须同时绿。
- 风险：存量ShopDef仅类型断言，非法id/重复id会让稳定身份和删除不可靠；只补当前声明形状验证，不借机加字段。
- 风险：新引用页重演场景Inspector裁剪问题；必须实测最后一条可达，不能仅凭jsdom类名通过。

### 主审立场

- Reviewer: Kimi（ownership/运行链）+ GLM（数据/测试矩阵）
- 结论: 两席独立premise verified + design agree（090b47be、0980f90d），无阻塞。
- 必改项: 生成/target门禁归属、独立试买隔离探针、空表四键、稳定复制redo及GM-SH1~SH4矩阵。
- 是否建议进入 build: yes

## Build: 实现与自测

- Coding Owner: Codex
- 修改范围：content `shop.ts`与测试；editor `commands/project-io/ShopTab/DataMode`、生命周期/重开/身份测试与DS采用矩阵；
  migrate `pal-store-boundary/pal-current-publication`及生成/作者合并测试；reforge `project-loader/main/shop-trial/menu/shop-box`及测试。
  没改ShopDef持久字段、content20/SAVE8、合并算法、源货单、物品/配方/奖励数据或任何ED-3公共合同。
- 实现摘要：`validateShops`共享结构门；Add登记shops路径，Duplicate捕获固定id/货单，Delete经ED-3每次apply/redo冷复核；
  货单只在展示种类数时去重，真实items不去重；引用复用公共InspectorSection/Tabs/Reference。
  `bootGame`第一分支识别显式shop-trial，正常world/SaveStore初始化全部跳过；正式输入/结算/绘制直接复用，
  无项目/存档写入。空货单游标不再变负；退出/pagehide/error清理rAF与监听。菜单按窗口使用1..4整数倍，不裁掉下缘。
- 验证：
  - `pnpm typecheck`：7包通过；最后editor/reforge增量typecheck再过。
  - content全量：36 files / 488 tests；reforge全量：95 / 869；migrate全量（unit+PAL）：55 / 424，通过。
  - editor全量：193 files / 1748 tests均已执行。首次默认并发有5项扫描超时与1处新数字字段登记context未同步；
    登记修正后4个规范文件串行43测通过。随后`--maxWorkers=2`整套1747通过，剩1项九次全仓扫描超出默认5秒；
    该测试只加与相邻扫描测试一致的15秒预算，全部反例/断言保持不变，单独重跑通过（10.66s）。
    不将首轮失败说成“一次全绿”；推荐复跑用`pnpm --filter @type-pal/editor exec vitest run --maxWorkers=2`。
  - 聚焦：shop生命周期/保存→真实assembleCurrentProject重开/ShopTab、正式shopInput与真正bootGame早分支均通过；
    试买测试用SaveStore/buildWorld/runtimeProjectView抛错sentinel与`indexedDB.open` spy钉零调用，不仅测“显示菜单”。
    本地workspace句柄读取与游戏存档库不同；禁止的是`type-pal-saves`，不把合法句柄读取算泄漏。
  - editor/reforge production build通过（保留既有大chunk提示）；design-system gate：92 files、2个既有证据型例外；
    数字采用38 files / 116 leaf calls，新表单落`DsNumberField + DsFieldGroup`，不加裸input例外。
  - Biome变更文件error-level检查与`git diff --check`通过。AST反例注入锚点改为稳定stockSectionRef，不删反例、不降低规范规则。
  - PAL发布核验：两次dry-run均managed537、writes0/deletes0/conflicts0/asset-deletes0，294scenes/223maps/1934assets，
    reference-warnings0；182个既有unused资产警告不属于本卡。正式`--write`与随后零计划结果在交接日志补记。
- 浏览器：下节记录真实动作/几何证据；未保存任何测试商店到PAL开发基线，临时新店通过undo恢复并关闭验证标签页。
- 旧版本兼容审查：pass；没有新增旧类型/版本分支/升级入口/fallback；manifest未声明shops的空集合是当前格式可选能力。
- 720宽视觉已由Kimi终审补验通过。真实本地FSA写盘→重开→试玩的完整自动化链未在本轮浏览器重复执行；
  已有核心序列化→loader重开及同源身份测试，完整从空白项目链登记到R4/编辑器综合工作流。

## 视觉验证记录

- Visual Verification Owner: Codex（已验宽屏）+ Kimi（720宽）
- Visual Verification Timing: dev-functional
- 验证方式: CUA后台浏览器，真实localhost:6010页面；截图与只读DOM几何，不靠jsdom判滚动/像素。
- 集中 E2E 用例 / 批次: 编辑器综合工作流前置子链
- 截图 / 像素检查: 本会话工具截图（已实际查看）；可复现入口及测量如下，不虚构落盘PNG路径。
  - `?module=item&page=shop&object=13`：复制为21、9项货单保留；未保存时试买明确禁用；删除确认→撤销原位恢复21；
    再undo复制恢复20家。未点击保存PAL开发基线。
  - 独立试买弹窗：只读编号与金钱共用96px标签轨，公共stepper完整边框、同高、清楚label；与现货单外观保持一致。
  - `play.html?project=pal&shop-trial=13&money=12000`：1280×720窗口按3倍完整显示320×200菜单；金童剑价格12000，
    默认否→选是后现有0→1、钱12000→0；再次Enter不进确认/不入包；Escape显示结束，不进入剧情。
    CUA未保留window.open弹出的页，实际通过同一已验证URL打开临时标签检查；URL调用另有UI测试钉死。
  - 店3引用：3条，tabpanel clientHeight525/scrollHeight597；滚轮及Home/End使scrollTop在0..72变化，
    tablist y=120固定、root.scrollTop=0，末项bottom677小于panelBottom694。最后一条打开后实际定位到
    s276/e4734/默认触发行为/after-checkpoint/body[1]“商店3 买”指令，状态条确认精确位置。
  - 两个验证页console新增error为0，临时标签已关闭。
- 结论: 1280×720功能视觉通过。Codex当时viewport设置未生效并已reset，没有冒报；Kimi现已独立补验720×720
  （实际innerWidth=720）：Hero动作完整、document/body横溢0；引用面板511→639、scrollTop 0→128.5、末项663≤680，
  tablist y=120固定；弹窗520×282、stepper按钮36×36、label关联正确、取消正常、console error0。
  证据：[`shop-trial-dialog-720.jpg`](../evidence/ED-SHOP/shop-trial-dialog-720.jpg)，Codex已实际查看。
- 未完成项: 无本卡功能视觉遗留；用户最终产品验收已通过。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: 两席均独立accept；候选7e6f935a，GLM35d39216、Kimi60c33328，Kimi完成720宽补验。
- 必须返工项: 无。
- Accept / rework: accept；无需再转发审查签字提示词。

## 用户验收

- 用户结论: **验收通过（2026-09-05，用户明确回复）**。
- 先前“签了”只登记两席终审；本次明确产品验收后收口，不再要求重复签字或复验。
- 后续任务: 第一、第二阶段全仓代码审计及 E2E 阻断项修复；R4 content20 薄 E2E。
- 最小产品复验（历史，已通过，无需重跑）：在已保存、无未保存改动的项目里，先从物品→商店→店13→独立试买，
  金钱12000买金童剑一次，应余额0/现有1，Escape结束。接着店3→引用→末项打开应到s276木匠脚本；
  最后再复制任意店→删除复制体→撤销，检查新编号与货单恢复；这些测试修改不用保存。
  先试买后做编辑，避免编辑产生dirty后按设计禁用试买。不要求用户代跑技术测试；720宽专项已由Kimi补验完成。

## 交接日志

- 2026-09-05 Codex: 用户明确“验收通过”；三方accept、720宽证据与产品验收齐备，任务done、E9编辑器侧✅，
  从进行中看板移出。只做状态/队列文档收口，不改实现或重复测试。后续为第一、第二阶段全仓只读代码审计，
  确认缺陷/待验证疑点/可选优化分开登记，先处理E2E阻断项后进入R4。
- 2026-09-05 Codex: 核对两席均accept同一候选7e6f935a，无实现变动；已读取Kimi720×720几何和截图证据。
  统一清除当前状态中的“待AI终审/待720补验”，审查门禁通过；只待用户产品验收，不重复测试、不再索要AI签字，
  不提前改done/E9✅。本轮仅更新状态文档，后续顺序仍为两阶段全仓审计→E2E阻断修复→R4。
- 2026-09-05 Kimi: 只读终审候选 `7e6f935a`（对比 `0980f90d`），签 **accept**。设计四钉
  独立核验：校验分离（generated 侧完整 census + 逐店货单与源一致新断言；target 侧
  `validateShops` + 炼化门禁 `pal-current-publication.ts:207-219,343-357`）、Store0 双
  侧保护、buy-only 双层删除守卫（`commands.ts:4273-4301` 冷复核 + UI disabled/确认再查）、
  redo 固定快照（`commands.ts:4245-4271`）、试买隔离（`main.ts:349-353` 首行分支、
  `shop-trial.ts:15-29` 严参数不吞 id0、正式 shopInput/shopBuy/drawShop、空表 cursor 钉 0
  且非空不变）；兼容审查零 upgrader/fallback。**720 宽由本人 playwright 实机补验**
  （Codex 工具未能改 viewport，不采信其截图）：innerWidth=720 实测，Hero 动作可见、
  引用末项可达 tablist 固定、试买弹窗 label+36px stepper、横溢 0、console 0；截图
  `docs/ops/evidence/ED-SHOP/shop-trial-dialog-720.jpg`。复跑 editor 22/reforge 10/
  migrate 9 全绿。返工项无；只改 Kimi 签字与本条日志。Next: 用户验收。
- 2026-09-05 GLM: 只读终审候选 `7e6f935a`（对比 `0980f90d`），签 **accept**。GM-SH1~SH4
  逐钉验证：固定 census 移至 generated 侧（合并前 theirs）并新增生成店货单与源逐店一致
  断言，target 侧只保 item 机制 + `validateShops` 共享结构门（loader/保存/发布三复用，
  空集合合法）；Duplicate/Delete 命令深拷贝固定 id、redo 不重读源、redo 重查 canonical
  buy、provider 失败与 live buy 不授权；试买以真实 bootGame + sentinel 探针
  （save/world/projection/indexedDB.open 全零调用）钉隔离，空表 cursor 修复直读；
  合并 fixture 覆盖 id0/空表/重复/delete-modify/invalid-identity + 双跑 replay 零计划；
  sell 999 双负例（命令层 + publication 层 canonical 改 999 仍通过）。PAL shops 20/1..20
  未动、本人独立 dry-run 四零、无测试商店写入基线。旧版本兼容审查 pass（无 upgrader/
  fallback/版本分支）。复跑 10 files / 57 tests + reforge typecheck 全绿；测试超时与
  时间预算调整的记录诚实（未称一次全绿、planner 零计划未替代 target 验证）。遗留 720
  宽 Kimi 补验与 R4 综合链登记（非返工项）。无返工项；未修改实现，未代签 Kimi，未填
  用户验收。Next: Kimi 终审（含 720 宽）与用户验收。
- 2026-09-05 Codex: shop-impl-r1进入review。正式`pnpm --filter @type-pal/migrate migrate:content --write`完成：
  transaction-changes=0，1934资产written=0/unchanged=1934；内置replay writes/deletes/conflicts/asset-deletes四零。
  git核对baseline、PAL content与manifest均无diff。最终聚焦editor三文件19测、reforge两文件10测通过；
  唯一重型规范用例独立15秒预算后反例全部通过。宽屏视觉与精确引用定位已验，720宽交Kimi补验。
  Next: 两席对同一实现候选并行终审，直接各自落卡/提交推送，不改实现/Status，不标done。
- 2026-09-05 Codex: 已读取两席完整签字及必落钉，统一判定shop-design-r1准入；开始build，Coding Owner仍为Codex。
- 2026-09-05 GLM: 完成 shop-design-r1 数据/覆盖/测试矩阵并行主审（基线 `dc332df4`、文档
  候选 `30ecc092`），签 premise verified + design agree。独立证据：raw 0x26 恰 23 次
  operand 1..20 vs canonical 29 buy + 6 sell 全 shop=0 两口径一手复算；raw store1 货单
  `[87,99,105,95,90]` 与 5 物价 50/50/200/550/3000 同 current buyPrice 逐项相等；**真实
  `createMigrationPlan` 内存实测 6 反例全绿**（新建 id21/复制含重复/删店20/改序加重复/
  同店双改 value 冲突/sell999 invariant 拒绝），探针即删未入库；固定 census 拒绝点
  （pal-store-boundary.ts:145-148 硬等）与发布链（publisher theirs→id merge→CLI target
  validate 固定 29/6/0）直读；试买隔离锚点（SaveStore :578 / runners :6940 / shopBuy
  0 价合法 / shopInput 空表 Down cursor=-1 复算）属实；命令层无复制/删除缺口属实。
  附 GM-SH1~SH4 钉（双层门禁拆分保生成回归 / 复制删除命令与 ED-3 复核 / 试买隔离矩阵
  含 0 价重复货品空表 / 验收矩阵含 delete-modify 与作者 id0 两个易漏 fixture + 引用滚动
  真浏览器必查）。未读取 Kimi 结论；未修改实现/生成数据。Next: 三签齐后 Codex 统一
  判断 build 准入。
- 2026-09-05 Kimi: 完成 shop-design-r1 ownership/运行链并行前提/设计主审（基线
  `dc332df4`、文档候选 `30ecc092`），签 premise verified + design agree。独立证据：
  merge 保留作者（`migration-merge.ts:111-120`、id-mode `:49`）、baseline 纯生成
  （`pal-current-publication.ts:186`）、误拦链 plan.target→validator→固定 census
  （`migrate-content.mts:78-94`、`pal-current-publication.ts:327,338-344`、
  `pal-store-boundary.ts:140-168`);dangling buy/货单引用安全网已在通用 validator
  （`validate-refs.ts:1292-1294,:1588-1593`);buy-only 运行时与 ED-3 typed 识别复核；
  正式 `shopInput/shopBuy/drawShop`(`menu/shop-box.ts:76-151`）与空表 Down cursor=-1
  真 bug(`:122`)；早分支先于 SaveStore(`main.ts:578`）与剧情/auto(`:6940-6941`)
  可行；play workspace 链（`play.ts:33-77`)。附四钉：门禁拆分归属、隔离分支探针、
  空货单四键、redo 不重新编号。只改 Kimi 签字块与本条日志；未读/复述 GLM 结论，
  未改实现/Status/准入结论。Next: GLM 并行数据/测试矩阵主审；三签齐后 Codex 推进。
- 2026-09-05 Codex: ED-3 收口时建立后续正式卡，只固定范围、地基和验收边界；未做前提/设计签字，
  不授权 build。Next: 场景生命周期后按第二阶段队列启动本卡前提真值门。
- 2026-09-05 Codex: 场景已在dc332df4收口，用户要求推进。完成shop-design-r1：纠正“重迁覆盖”的初版猜测，
  冻结既有合并+生成/作者双层校验，范围不加名称、不重做货单；独立试买明确无存档/剧情。
  内部只读协作完成raw/第一阶段/runtime与merge/target反例核验，不代表Kimi/GLM签字。仅更新文档，未开始实现。
  Next: Kimi与GLM并行独立前提/设计审查，直接各自落卡并提交推送。

## 设计阶段提示词（历史，已完成，不再转发）

当时两席审查同一 `shop-design-r1`，实现基线 `dc332df4`、状态draft。两席只写自己的签字块与交接日志，
不读/复述另一席结论，不改Status或共享准入结论，Codex在双方落卡后统一推进。

### 给 Kimi

```text
请审 ED-SHOP-LIFECYCLE-1 的 shop-design-r1（实现基线 dc332df4），当前 draft。
任务卡：docs/ops/tasks/ED-SHOP-LIFECYCLE-1-shop-crud-and-safe-delete.md。
先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、docs/ops/agent-workflow.md、本卡及锚点。
职责：独立架构/前提审查。直接追 createMigrationPlan→plan.target校验→纯theirs baseline，核实真正缺陷是固定
PAL census误施于作者target，而非merge覆盖；核生成保护不降级、作者id0与源Store0分离、buy-only删除fail-closed。
核独立试买早分支是否确实可不触SaveStore/剧情，并复用正式shopInput/shopBuy/drawShop，无新增schema/boot公共合同。
已完成只读反例与r1设计，尚未实现；不要以测试计划冒充已完成验证。独立给file:line、最强替代解释、可证伪观察，
签 premise verified + design agree，或counter和具体返工项。不要读取/复述GLM结论。
不得修改实现、不得开始build/标done。直接只写本卡Kimi签字和自己的交接日志；提交前同步main、保留他人已落改动，
提交推送；push竞态自行rebase/retry。无写权限明确报阻塞，不让用户复制审查正文。
```

### 给 GLM

```text
请审 ED-SHOP-LIFECYCLE-1 的 shop-design-r1（实现基线 dc332df4），当前 draft。
任务卡：docs/ops/tasks/ED-SHOP-LIFECYCLE-1-shop-crud-and-safe-delete.md。
先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、docs/ops/agent-workflow.md、本卡及锚点。
职责：独立数据/覆盖/测试矩阵审查。直接核原始货单/价格、23次原始买与canonical29buy/6sell口径；核新增/复制/删店、
buy增删、sell999为何被当前target校验拒绝，确认三方合并其实保留作者且同店双改会冲突。
检查r1是否同时保住源Store0/1..20生成回归与作者自由编辑；完整target验证、保存重开、replay零计划不可互相替代。
核已有重复货单保留但不扩上架策略、0价/不足/空表/默认否、无存档/剧情隔离、dirty/workspace、引用滚动/数字组件矩阵。
已完成只读诊断和设计，未实现。请独立写file:line、可证伪观察，签 premise verified + design agree或counter/具体遗漏；
不要读取/复述Kimi结论，不改实现，不开始build/标done。直接只写本卡GLM签字和自己的交接日志；同步main保留他人改动，
提交推送，push竞态自行rebase/retry；无写权限明确报阻塞，不让用户复制审查正文。
```

## 终审提示词（历史，已完成，不再转发）

当时两席共同候选`7e6f935a`（shop-impl-r1），对比实现前`0980f90d`；两席已落卡通过、720宽已补验。
以下只保留历史交接内容，不再作为待办。

### 给 Kimi

```text
请终审 ED-SHOP-LIFECYCLE-1，当前 review。
仓库：/Users/zhangxu/illegal/type-pal
任务卡：docs/ops/tasks/ED-SHOP-LIFECYCLE-1-shop-crud-and-safe-delete.md
实现候选7e6f935a（shop-impl-r1），对比0980f90d；设计shop-design-r1三签已齐。
先读AGENTS.md、CLAUDE.md、READ-FIRST、agent-workflow、完整任务卡及锚点。不要读取/复述GLM终审结论。
独立核生成/作者校验拆分、纯theirs baseline、源Store0保护、buy-only安全删除、复制redo固定快照，
以及bootGame第一分支是否确实不建立SaveStore/世界/剧情而复用正式shopInput/shopBuy/drawShop。
核你四条设计钉与旧版本兼容残留。宽屏复制删除撤销、未保存禁试买、12000文买金童剑与引用末项定位已实测，
不重复走相同宽屏流程；请补720宽Hero动作、引用滚动/定位、试买弹窗标签和公共stepper，写实际viewport证据。
Codex工具设置viewport后实际仍1280×720，未冒报窄窗通过；你若也无法验证，明确登记未完成。
测试结果及一次重型规范用例5秒→15秒的独立预算理由见Build，全部断言未削弱；按风险复跑，不默认再跑全部重测试。
输出accept或counter+具体返工项，附file:line、独立证据和旧版本兼容审查结论。
不得改实现、不改Status/共享准入结论、不标done；只写自己的终审签字与交接日志，提交前同步main并保留另一席改动，
提交推送，push竞态自行rebase/retry；无写权限明确报告，不让用户搬运审查正文。
```

### 给 GLM

```text
请终审 ED-SHOP-LIFECYCLE-1，当前 review。
仓库：/Users/zhangxu/illegal/type-pal
任务卡：docs/ops/tasks/ED-SHOP-LIFECYCLE-1-shop-crud-and-safe-delete.md
实现候选7e6f935a（shop-impl-r1），对比0980f90d；设计shop-design-r1三签已齐。
先读AGENTS.md、CLAUDE.md、READ-FIRST、agent-workflow、完整任务卡及锚点。不要读取/复述Kimi终审结论。
独立核GM-SH1~SH4：生成固定census仍在、作者target允许id0/增删店及buy/sell但拒绝悬空引用；
同店双改/删改/同id新增冲突不能覆盖作者，baseline仍纯theirs；已有重复货单及保存重开不能丢失。
核shopInput默认否/不足/免费/重复货品/空表四键，启动隔离spies、dirty瞬间复核与workspace身份失败，
不得以planner零计划或纯shopBuy单测替代完整target与真正bootGame验证；明确区分游戏存档库与本地句柄库。
证据：content488/reforge869/migrate424全量通过；editor全1748已执行，最后仅1项重型扫描默认5秒超时，
保留全部断言并给单例15秒预算后独立通过。正式PAL发布transaction-changes=0、1934资产零写，replay四零。
请按风险独立复算/复跑并检查文档、矩阵与旧版本兼容残留；720宽由Kimi补验，勿把它写成Codex已通过。
输出accept或counter+具体遗漏，附file:line和独立证据。不得改实现、不改Status/共享准入结论、不标done；
只写自己的终审签字与交接日志，同步main保留他人改动，提交推送，竞态自行rebase/retry；无写权限明确报阻塞。
```

## 下一位 Agent 提示词

本卡无下一位 Agent 提示词，已收口。三方终审、720宽补验及用户验收均通过，不再重复索要签字；
后续全仓审计按路线图启动范围另行推进，不复用本卡签字授权实现新的修复。
