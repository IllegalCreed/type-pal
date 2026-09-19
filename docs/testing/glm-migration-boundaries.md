# GLM当前迁移辅助与隔离文件系统补测工作包（TB-10）

## 当前Codex接收结论

**counter**。定向22项/原3+9跑/tc通过，但仍有公共C0和本批业务返工；Biome完整面11文件/11 errors。详见[统一复核TB-10](glm-nine-intake-review.md#tb-10)。
本轮认可用户先行实施授权；不合并测试、不更官方基线、不转Kimi。下面GLM回执为候选自验原文，不能覆盖当前counter；生产零改只指已列新增测试/fixture之外，不能写整个packages diff为空。


任务：[TEST-MIGRATION-BOUNDARIES-1](../ops/tasks/TEST-MIGRATION-BOUNDARIES-1-current-isolated-io.md)，r1/rework；本轮实施候选bd597558未接收，设计不重签。
共同准入、负控、覆盖和隔离规则见[七批统一审核](glm-coverage-remaining-review.md)；本包只增测试；三席设计有效，用户已批准本轮先行实施，当前接收counter。
表内为已按调用域筛选的候选，不是已经完成的新增覆盖；允许去重后减文件/减族，不设必须凑足的用例数。

## 合同族、去重与当前调用

路径在 migrate/src。

| 族/模块 | 当前caller/既有test证据 | 允许新增候选 |
|---|---|---|
| T01 migration-project-io | scripts/migrate-content.mts:135–143；旧test:30仅托管JSON、:40 TOCTOU、:63非托管、:86索引、:104 identity旁车 | 当前scene/map index合法正控后的单轴坏JSON/坏path类型与准确错误；snapshot新增目标检查/缺失根/实际managed集合不别名；hash diff精确排序与20路径上限，仅临时根 |
| T02 migration-transaction | scripts/migrate-content.mts:125；旧test:24删除hash、:67中断补完、:126 manifest、:196并发、:218篡改 | current journal v2由真实commit+afterOperation中断产生，单轴坏operations/kind/previousHash/staged/hash/preconditions与拒绝前全文件快照；合法同journal恢复成功/再次false；missing staging与hash坏分开 |
| T03 migration-write-plan | 同script:116–124；旧test:93重复、:103前置、:114 no-op、:132事务序、:151 scene先、:174 baseline删、:197退役 | 当前合法plan多write/delete/不同baseline排序完整changes，expectedPreviousHash/preconditions实际对象；只补未被旧断言覆盖的保真/排序轴，不重抄manifest-last；源plan/baseline深快照 |
| T04 project-map-converter | pal-migration当前地图转换；旧test:24逐位/:56 id/:96 residual | 独立两行非对称上下子格与两层完整matrices/sources/heights/collision；合法输出过validateProjectMap；源shape行列缺口、已定ID/height范围仅单轴；输入保真，不以decode算expected |
| T05 project-map-audit | 与converter同入口；旧converter.test:76统计/:96残差 | 重复mapNum拒绝；多map同tileset的(tile,layer)多高度计数、residual与empty-upper两集合完整坐标；sourceJsonBytes0比率0；精确完整report/输入不变 |
| T06 source-facts | translate-events/当前migrate；translate-events.test:91六WORD/未知已有 | 先全仓去重。只有实际caller未覆盖的current name WORD、legacyEventObjectEntityId边界、partyPosToGrid/faceframes才候选；现有0x79映射不是新发现，可全部记已有 |
| T07 pal-authored-overlays | pal-migration:419–424、publication:181–185；旧test:11/24物品/:42–258消息/:261追加/:276执行 | **仅current r13SixBExecution:true**；当前craft/pool多effect中某条有message、另一条无message的归属/配方一致性；实际current/generated深快照，所有非message作者字段保留；多输出修改不串引用；旧断言已有则不再加 |
| T08 pal-item-scheme-labels | publication:316；旧test:90闭包/:123零root/:140多root/:160环/:178悬空/:189 opaque | 用合法itemPrivateScript+scene行为/hook跨stage/machine链，entry.prepare仅放onEnter初始stage/state（author-script-core:957/991，onTeleport或非初始entry非法）；同root菱形非环、同order不同id稳定命名、machine内名/期望计数单轴漂移与完整report；实际输入不变 |
| T09 pal-store-boundary | publication:209为生成seed完整商店；:357合并作者只alchemy | 旧5例已钉0店/买引用/卖0/奖励/recipes；剩item268/270消息、数量、资源/奖励count等独立拒绝轴需合法同条件正控；嵌套buy/sell计数/路径域不串；作者自定义shop不被固定20约束 |

## 真实文件系统、合法夹具与排除

- 所有repo/root参数必须来自本测试mkdtemp，里面自建projects/pal与packages/migrate/baselines/pal同形目录；不得传主仓/worktree根、真实projects/data/baselines；禁止运行extract、migrate:content、bake或物化CLI。
- afterEach只删除本例创建并记录的绝对临时根。路径越界反例只能越到同一私有sandbox里的邻居并核不变；不触真实用户目录。不创建根外symlink。
- T02先真实commit中断取得current journal；恢复前单轴改坏，反例拒绝后journal/staging/目标字节全保留，正控能恢复且二次幂等。不自写手工journal“守卫”代替产品。低层fs替身若必要须精确操作见证，优先真实临时FS。
- T04/T07/T08/T09正控过现行content守卫/正式parser；反例仅目标一轴。输入deep snapshot必须在实际调用前取得，不浅拷贝、不比clone自身。
- A08最后snapshot到journal采样窗口、A09资产物化父链symlink是已确认修复项（audits/pre-e2e/README:163–183）；本包不改、不要求默认红转绿、不写错误允许行为。journal恢复已有symlink保护不代表物化链已安全。
- E05历史输出退役：不新增discovery旧content/scripts/index chunks、pal overlay r13SixBExecution:false或旧translator profile测试；已有旧测试不在本卡删除，后续清理另批。
- SourceMap审计semanticRoundTripMismatch为内部反证防御；类型/构造保证的空洞不靠伪造内部状态刷覆盖。
- Store0机制检查与作者商店目录分离：固定1..20只用于生成seed，不能据纯helper存在就施加到合并作者工程；不重新核定炼化数值/公式。
- source-facts/overlay未必还有可新增合同；允许最终减少文件，禁止为了九文件而续测旧接口。

## 代表性负控

至少5族：snapshot目标并集、journal全验前零IO/坏staging识别、write-plan输出保真、地图子格/位域独立预期、label同root闭包、消息同步污染作者字段或Store边界。选择剩余有增量的族，正常同输入对照绿。
所有拒绝需精确业务错误+全文件快照/IO合同；单纯文件不存在或TypeError不够。负控只在隔离加载/临时副本修改一处，候选自身业务AssertionError，原生产hash不变。

## 冻结目标（不允许修改）

```text
packages/migrate/src/migration-project-io.ts
packages/migrate/src/migration-transaction.ts
packages/migrate/src/migration-write-plan.ts
packages/migrate/src/project-map-converter.ts
packages/migrate/src/project-map-audit.ts
packages/migrate/src/source-facts.ts
packages/migrate/src/pal-authored-overlays.ts
packages/migrate/src/pal-item-scheme-labels.ts
packages/migrate/src/pal-store-boundary.ts
```

## 新增文件白名单（上限，允许减项）

```text
packages/migrate/src/migration-project-io.boundaries.test.ts
packages/migrate/src/migration-transaction.boundaries.test.ts
packages/migrate/src/migration-write-plan.boundaries.test.ts
packages/migrate/src/project-map-converter.boundaries.test.ts
packages/migrate/src/project-map-audit.boundaries.test.ts
packages/migrate/src/source-facts.boundaries.test.ts
packages/migrate/src/pal-authored-overlays.boundaries.test.ts
packages/migrate/src/pal-item-scheme-labels.boundaries.test.ts
packages/migrate/src/pal-store-boundary.boundaries.test.ts
packages/migrate/src/__tests__/glm-tb10-fixtures.ts
docs/testing/glm-migration-boundaries-mutants.mjs
docs/testing/glm-migration-boundaries.config.mts
docs/testing/glm-migration-boundaries-evidence.json
```

此外仅允许本工作包末尾GLM回执/逐族账、本卡本人签字和本人日志；如需README索引机械一行须先由Codex协调，禁止覆盖主线其他行。未存在文件不要求强建；需要另路径先申请收窄/扩白名单，不能借同名测试覆盖旧文件。

## 实施验证与回执要求

- 按统一审核协议先逐族核既有测试精确标题、当前caller/守卫、实际白名单与target hash；本次未运行任何新测试/负控，不得把拟定针点记已检出。
- 定向→相邻→涉及包全测/typecheck→所有新增文件Biome；负控工具带精确测试标题运行态见证与判据自测。实际记录失败和重跑原因，不能倒填SHA/数字。
- 覆盖config必须使用仓库官方testSelection口径，在专有/tmp目录作同树有/无本批测试对照，局部与全包双口径；旧资产排除两侧一致，不动全局超时/排除/官方baseline。
- GLM不跑全仓check/官方ratchet/strict-fast。Codex独立接收集成后串行执行；GLM贡献终审披露，不自证第三方，不代签、不标done。
- 提交时本节后附GLM实现回执：候选SHA、白名单diff、真实命令/退出码、逐族互斥分类与新增价值、负控细目、覆盖两时点与待证归属。

## GLM回执区（候选历史自验；以当前Codex复核勘误为准）

r1 完成（2026-09-19，GLM，Coding Owner；基点 41cc7cd9，三席 r1 签字齐；用户拍板在 Codex 额度
空窗期先行实施 TB-02～TB-10、恢复后统一接收——本批据此开工，非代签 Codex 准入）。分支
`codex/glm-migration-r1`（worktree `/Users/zhangxu/illegal/type-pal-glm-migration`）；
产品对冻结 e58834f6 零漂移。最终树 **8 个新测试文件共 22 项**（T01-T09 全族落账，
T04/T05 共用 converter 文件、减 fixture 白名单项）；|unit| 57 文件/392 项中 4 文件 9 项预存
data/extracted ENOENT（stash 基线同样失败，361→383 恰为 +22）；官方 fast 口径 338→360 双
exit0；tc rc=0；9 新文件 Biome rc=0。

- 负控 `node docs/testing/glm-migration-boundaries-mutants.mjs` rc=0：判据自测 + 3 对照 +
  **9 变异针**全部钉名新增测试 failed 且目标自身 failureMessages 首行 AssertionError；
  产品 hash 不变。针点：越界路径门、journal staged 配对校验、SceneIndex 提升丢失、
  tilemap 行守卫、上层第 9 位解码、名字 WORD 指针对调、overlay kind 过滤、labels channel
  地址键、Store0 计数门。
- 覆盖对照（官方 testSelection fast，/tmp，最终提交树）：write-plan L35→37/37、
  store L83→89/96 B78→85、labels L126→130/154 B71→76、io L55→59/63 B35→39、
  converter L58→60/67 B47→49、source-facts L9→11/11（满格）、audit B32→34、
  transaction L163→164 B140→143；全包 L3439→3460/6677、B2851→2878/6398。
- T02 订正：journal `previousHash=null` 对新建目标为合法（真实合同），本批以 `hash` 篡改为
  拒绝轴；A08/A09/E05 待证保持原归属（见机器账 knownBoundaries）。
- 机器账 `docs/testing/glm-migration-boundaries-evidence.json`。

## GLM返工回执（r2，2026-09-19，针对 Codex 统一接收 counter）

基点合并 216cf3bb；生产零漂移不变。修：

- **C0**：mutants 判据改为每条 failureMessages **首行**匹配 `/^AssertionError(\b|:)|^expect\(/`；
  四向自测新增「普通 Error 内嵌 AssertionError 子串」「纯超时」拒绝反例。3 对照 + 9 针复跑全绿。
- **C1**：11 个新文件（含 JSON/config）Biome rc=0；机账同步最终树数字。
- **R10-1**：baseline 快照改深比较——structuredClone 直接持有实际 Map/Set/嵌套 JSON，
  调用后对同一实际对象 toEqual（浅 entries 冒充已废）。
- **R10-2**：撤回 content/scripts/index chunks 发现轴（E05 已签排除）；scene/map 发现保留。
- **R10-3**：journal 重写为两操作真实中断——合法同 journal 恢复对照成功（pending 补完+幂等+
  清理）；六轴篡改各自钉精确业务错误消息、拒绝后全部自建文件（目录递归快照）逐字节保留。
- **R10-4**：同 root 菱形补齐——一 root 经 hook 与直连两路径达同一行为：非环、终点只计一次。
- 复跑：定向 23/23、|unit| 57 文件/393 项（9 项预存裁决一致）、tc rc=0、
  官方 fast 338→361 双 exit0。机器账 rework 节。
