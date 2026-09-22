# GLM 覆盖率第二波准备回执 r2（针对 Codex counter 4240fbca R1～R4）

任务卡：[TEST-NONVISUAL-COVERAGE-2](../ops/tasks/TEST-NONVISUAL-COVERAGE-2-six-domain-boundaries.md)（draft/r1）。
生产冻结 `57dda7ed2376fc25f07756be117bb4a058d09915`（r1 机账 SHA 笔误已更正）；分支
`codex/glm-coverage-wave2`。本版取代 d4703cdf 准备稿的估算分桶；三席原文与日志保留。
机账：[glm-coverage-wave2-results.json](glm-coverage-wave2-results.json)（schemaVersion 2）。

## R1｜可展开的一对一分类映射（计数由映射生成）

机账 `ruleTable`（`modules[].rules`）给出每模块规则：`lineRanges` 归类遗漏**行**，
`branchLineRanges` 按 `[line,block,arm]` 的 **line 分量**归类遗漏**分支臂**；每个定位恰命中
一条规则（生成脚本验证 ALL MODULES OK，与冻结 evidence 逐模块集合相等）。

**展开规则**：`generatedTotals` 与 `modules[].generatedCounts` 全部由规则表与冻结定位求交机械
生成，非手写。合计 960 行/1274 臂完全对账。

| 生成桶 | 行 | 臂 |
|---|---:|---:|
| NEW（全部族） | 955 | 1259 |
| UNREACH（adapter vanish 3/6 + validate-runtime 2/5） | 5 | 11 |
| PEND（migrate-enemies 历史轴 :96/:98/:211） | 0 | 4 |

r1 的 PKG/XPKG/UNREACH/PEND 五桶混合了**族级去重**与**臂级可达性**两个正交概念，已更正：
臂级只有 NEW/UNREACH/PEND；去重由各族 `dedupTitles`（精确旧标题）约束——**永不写重复合同**，
而不是把臂改桶。因此 NEW 总数与 r1 的 671/888 不可比，不强凑旧数。

各模块生成计数（行/臂）：adapter A01 100/118 + UNREACH 3/6；script-world A04 34/72；
core A03 15/13 + A05 37/37；trial-config B01 3/7；trial-prepare B02 9/17 + B05 1/1；
trial-assets B04 5/2 + B05 78/47；sim-state B02 6/15；sim-library B02 0/5；sim-commands B03 0/6；
world-sprite C01 93/136 + C02 8/23；draft C03 2/7 + C04 6/37；actions C05 3/7；
project-reference D01 29/57；adapters D02 27/33；tileset D03 13/31；script-refs D02 7/18 + D04 4/3；
battle-data D02 5/11；wv-refs D04 4/6；enemy-script E01 97/126；author-core E02 111/159；
runtime-scene E03 8/15；validate-runtime E04 UNREACH 2/5；migrate-enemies F01 43/60 + PEND 0/4；
pal-casualty F02 75/74；script-library-audit F03 132/116。逐模块规则与区间见机账 `modules[]`。

## R2｜分类方向更正（逐项一手复证）

- **trial snapshot 去重**：`createTrialFileSnapshot`（:53-102）冻结定位仅漏 **:85（urlFor 固定
  拒绝）、:87（readBytes await 后 abort 复核）** 两行与 **[76,11,0]** 一臂；副本隔离/seal/
  dispose/迟到取消/bytes-sha 校验已由 `packages/reforge/scripts/battle-trial-assets.test.ts:16-115`
  断言（r1 误把整段 55L/31B 计 NEW）。B04 现为 5L/2B（:40-42 abortableTrial abort 臂 + 上述两行
  一臂）；该文件其余 79L/48B 是 **prepare 资源预载链**（:113-299）→ B05。
- **current vanish 禁用域**：adapter vanishEntity 臂（:56-58，3L/6B）改 **UNREACH**——
  `content/runtime-script.ts:39-43` `Exclude<BaseAuthorCommand,{kind:'vanishEntity'}>`、`:139-149`
  词表 `vanishEntity:false`、`runtime-script-project.ts:79` 再次拒绝；不得绕过 current 入口测试。
- **runtime 外层重复守卫**：`validate-runtime.ts:24/:29`（2L/5B）改 **UNREACH**——
  `validateBaseScenes`（:17 先行）经 validate.ts assertArray(:64)/assertObject(:69) 已拒坏
  顶层数组/entities 数组/entity；不为打后层 mock 前置守卫。E04 保留为外层重叠保护登记。
- **函数锚更正**：script-world `:186/:188` = **assertFlowCursor** 拒绝（r1 误写 initialFlowCursor）；
  `:254-295` = **selection/cursorHandoff 校验**（r1 误标 flow 断言段）；`:126` assertEntityTarget、
  `:163` pageById、`:358-386` trigger/hook、`:722-772` evalAuthorCondition 各归 A04。
- **core :170 冲突解决**：:170 是 moveEntity case 内 `sceneSessionId` 取值行，**A05 NEW**——
  由 moveEntity 构造路径可达（r1 同时落入 NEW 范围与 UNREACH 描述的矛盾已消除；UNREACH 不再
  覆盖该行）。

## R3｜PEND 归属更正（不复述参数臆测）

- 历史 translator 注入（`translate` 参数）与 `reportHookSources` **只存在于
  `migrate-enemies.ts:95-98,:211`**——本人逐行复核 pal-casualty-scripts 与 script-library-audit
  全文无此二参。r1 把 22L/22B PEND 摊到错误模块，已撤销。修正后唯一 PEND =
  **migrate-enemies :96/:98（可选参在场臂）+:211（reportHookSources=false 臂），0L/4B**——唯一
  现行 caller `packages/migrate/src/migrate-content.ts:1753`（r1 误写 scripts 入口，已更正）不传
  任何可选参；注入/false 臂无现行 caller，E-05 相邻。
- **author-script-core r1 PEND（11L/19B）撤销**：所谓 Base-only 无消费者不成立——
  `checkBaseAuthorCommands/checkBaseScriptFlow/checkBaseEntityBehaviors/checkAuthorCondition` 有
  现行 caller（本人 grep：content/validate.ts、content/runtime-script.ts、content/enemy-script.ts、
  reforge/script-compiler-core.ts）。全模块 111L/159B 归 E02 NEW；跨包已证部分按族级 dedupTitles
  登记，不重复。

## R4｜负控/输入合同冻结（真实源码针位+正控+反例+拟定标题）

| 族 | 真实针位（唯一替换点） | 合法正控 | 反例（坏实现） | 拟定测试标题（钉新增 wave2 文件） |
|---|---|---|---|---|
| A03 | `script-project-core.ts:148-149` setMultiEntityState `for (target of targets) writeEntityValue(...)` → 只写首个 target | 双 target 命令两条 entityState 全写入并各自通知 | 第二 target 未写 | `setMultiEntityState 逐 target 写入全部目标并各自通知` |
| B04 | `battle-trial-assets.ts:78` `(await abortableTrial(pending, signal)).slice(0)` → 去 `.slice(0)` | 同路径二次读字节相等；改返回缓冲不污染缓存与第三次读 | 共享缓冲别名跨读可见 | `缓存命中返回独立副本：两次读取内容相等且互不别名` |
| C02 | `world-sprite-behavior.ts:527-555` collectAutomaticScriptSpriteInstanceSites → 同资源实例合并为单一共享 site | 同资源被两个不同实体引用产出两个独立站点 | 合并为一个站点 | `同资源多实例生成独立站点，不共享预览对象` |
| D03 | `tileset-references.ts:243` `assertCurrentProof(state, batch, proof.generation, proof.coverage)` → 传 `batch.generation` 自比较（r1 的 projectId 比较不存在，已替换为真实链） | 新鲜 proof（当前 generation/coverage）通过预检 | 陈旧 generation proof 被接受 | `陈旧 generation 的移除 proof 必须拒绝` |
| E01 | `enemy-script.ts:141-144` `percent()` 上界检查删除——**chancePercent 域为 0..100**（r1 误用 0..10 巫抗域） | `checkEnemyFallback` 接受 0 与 100 | 101 被接受 | `chancePercent 边界 0/100 合法、101 拒绝` |
| F03 | `script-library-audit.ts:155` `if (index.library?.[id])` authored/migrated 分栏谓词反转 | 混合库（一 id 在 index.library、一不在）分栏正确、字节/命令数各自正确 | 两条都进错栏 | `migrated/authored 分栏按 index.library 精确归属` |

每针唯一注入点、钉新增测试精确标题 failed、自身 AssertionError 首行、混合 Error/超时/未执行自测
拒绝、产品 hash 不变；12～18 针总量随实施按保护族冻结，不凑数。

## 机械收尾

- 生产冻结 SHA 笔误更正（`...058d09915`）；migrate-enemies caller 更正为
  `packages/migrate/src/migrate-content.ts:1753`；白名单包计数更正 editor **12**/fixture **9**
  （r1 写 9/11）；文件路径本身与 r1 相同（25 测试+9 fixture+2 工具，不被推翻）。
- `docs/testing/README.md` 已补本回执索引行（修 `pnpm check:docs` 目录索引 exit1）。
- 机账 JSON 以主树 Biome 格式化并过 `biome check`。
- r1 回执的旧估算表随本版整体取代；d4703cdf 提交保留历史。

## 白名单（不变）与实施边界

25 个 `<stem>.wave2.test.ts`（reforge 6/editor 12/content 4/migrate 3）+ 9 个按组薄 fixture
（`packages/<pkg>/src/__tests__/coverage-wave2/<group>-*.ts`）+ 2 工具
（`glm-coverage-wave2-mutants.mjs`、`glm-coverage-wave2-coverage.config.mts`）+ 本回执/机账/卡内
本人区。零改 packages/正式测试/原探针/官方配置基线/真实 data/projects；不开 build、不标 done。

## GLM r2 结论（修订稿）

- **premise verified / design agree 维持并按 counter 修订**：R1～R4 全部落实——映射可机械展开、
  计数由映射生成且 960/1274 全对账；snapshot/vanish/外层守卫/锚点/F 轴五处方向错误逐项更正；
  六针带真实源码锚与拟定标题；元数据/Biome/索引修复。
- **可证伪观察**：① 任一规则区间经展开与冻结定位不等（脚本可复跑验证）；② 任一 UNREACH 臂被
  证明可经 current 入口合法到达（vanish/validate-runtime）→ 分类回滚改 NEW；③ :96/:98/:211 之外
  出现第二处历史轴定位→R3 复核；④ 六针任一在实施中证明无鉴别力→换针并记失败。
- 未查清即 PEND 的族：无（r1 PEND 已全部消解或落地到 migrate-enemies 三臂）；实施期发现的真实
  缺陷仍按「隔离反例+归属 Codex、该族暂停」处理。
