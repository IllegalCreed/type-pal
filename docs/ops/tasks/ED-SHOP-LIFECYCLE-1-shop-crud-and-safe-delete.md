# ED-SHOP-LIFECYCLE-1 - 商店生命周期闭环

Status: draft
Phase: phase2
Capability: E9 / Editor shop lifecycle
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: main
Design Revision: shop-design-r1（2026-09-05；实现基线 dc332df4）

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
- E2E 用例登记: 空白工程 → 新建/复制商店 → 上架重复货品 → 保存重开 → 正式试买 → 安全删除。

## 推进签字

### 进入 build 前:设计签字

- Codex: **premise verified | design agree（2026-09-05，shop-design-r1，基线dc332df4）**。
  已直接读正式输入/结算、current-author引用接口和CLI合并→target校验→纯theirs baseline全链；
  内存反例证明问题在固定census门而非merge覆盖。支持下述schema-neutral方案及生成/作者双层门禁，
  独立试买早分支无SaveStore/剧情。只完成设计，不宣称实现/验收完成；Kimi/GLM仍须独立取证。
- Kimi: premise pending | design pending
- GLM: premise pending | design pending
- 独立反证审查: pending
- counter / 分歧处理: pending
- 缺签豁免: N/A
- build 准入结论: blocked

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: pending
- 缺签豁免: N/A
- done 准入结论: blocked

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
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: pending
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: pending

## 视觉验证记录

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: pending
- 集中 E2E 用例 / 批次: 编辑器综合工作流前置子链
- 截图 / 像素检查路径: pending
- 结论: pending
- 未完成项: pending

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: 第一、第二阶段全仓代码审计及 E2E 阻断项修复；R4 content20 薄 E2E。

## 交接日志

- 2026-09-05 Codex: ED-3 收口时建立后续正式卡，只固定范围、地基和验收边界；未做前提/设计签字，
  不授权 build。Next: 场景生命周期后按第二阶段队列启动本卡前提真值门。
- 2026-09-05 Codex: 场景已在dc332df4收口，用户要求推进。完成shop-design-r1：纠正“重迁覆盖”的初版猜测，
  冻结既有合并+生成/作者双层校验，范围不加名称、不重做货单；独立试买明确无存档/剧情。
  内部只读协作完成raw/第一阶段/runtime与merge/target反例核验，不代表Kimi/GLM签字。仅更新文档，未开始实现。
  Next: Kimi与GLM并行独立前提/设计审查，直接各自落卡并提交推送。

## 下一位 Agent 提示词

两席审查同一 `shop-design-r1`，实现基线 `dc332df4`；本卡仍为draft。两席只写自己的签字块与交接日志，
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
