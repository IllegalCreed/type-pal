# TEST-FOUNDATION-COVERAGE-1 - 四包基础边界正式测试补强

Status: review
Phase: ops
Capability: 测试覆盖建设（不改变能力地图状态）
Coding Owner: GLM（仅白名单测试）
Integration Owner: Codex
Reviewer: Codex / Kimi
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: main（集成；源分支codex/glm-foundation-coverage-r1）

Revision: r1，2026-09-16。产品冻结`d64bbf6d2817ba971ae2bd3bbe9a24f3870e7e86`。
集成适配（2026-09-17）：接收639e9e4e，四目标包产品源码仍与上述冻结点一致；分支合入3b1cff4f继承了主线保存修复，
全仓并非对d64零diff。本次集成基点862733ba，产品无新增改动，测试/fixture不改正文；范围与模型未变，r1不重签。
集成候选：`48d3b8e323f5bc801954c7960d3c25efd7d35fef`，对比`862733ba`；GLM源候选`639e9e4e08ae6c42ec63d75e61d1ff62cdb40b8f`。
分配提交：`d901b77ff25493642fe0d356b4a9547f0914d6f3`；后续本次SHA回填只改文档，不改变r1范围或冻结产品。
用户批准四组工作并要求转交提示词；**未豁免本新卡三签**。一次设计审全包，签齐后分组连续做，不每组重签。

## 目标与边界

在不改产品的前提下，给shared/content/pal-extract/migrate现有合同补自包含、可证伪的正式测试。
不是再做44/72项审计，不以测试条数耗额度，不以把当前错误固定下来求绿；产出为可合并回归、明确缺陷和未覆盖清单。

- GLM唯一编写本包测试；Codex分组复核、在最新主树适配集成及统一质量门，Kimi审边界与最终风险。
- A/C遵守第一阶段原盘格式合同；B/D遵守第二阶段current-only。两套ID/格式/机制不得混用，不把原版怪癖搬进当前模型。
- 四组不碰reforge/editor主线实现，WORLD-ASYNC-COMMIT-1的补审另记原卡，不从那里挪实现签字到本卡。
- 禁止产品修复、schema/save升级、真实迁移/提取/物化、资产/工程写盘、浏览器/截图/视觉、发布部署、新依赖或统计配置更改。
- 本卡最终仅证明已测合同；不宣称全仓90%/85%或全部核心95%/90%已达标，不代替Q1/Q2/R4/N6b。

## 前提真值门

一句话前提：有既有测试不代表边界已执行；新增测试必须按现行合法输入和一手合同区分正确行为、真实缺陷与未定义行为，且产品保持零diff。

| 维度 | 核定事实与证据 |
|---|---|
| 原盘 / primary source | A/C只测文件格式、解码/字段映射，不裁决战斗机制。MKF头为N+1个LE偏移（shared/src/mkf.ts:1-5）；PlayerRoles入口是完整DATA.MKF并读chunk3（pal-extract/src/resources/parsers/player-roles.ts:92-105），不能拿裸900字节或SAVEDGAME的0x250偏移冒充输入；参考源码定位见各解析器注释，sdlpal不冒称原版运行观感 |
| 第一阶段 | 现有真实资产测试覆盖部分解析器，但fast排除了一批PAL依赖；须对照现有io/mkf.test.ts、io/yj2.test.ts、resources/tables.test.ts、parsers/__tests__/misc-mkf.test.ts去重。低fast不等于无测试；CLAUDE的roleId/word索引分界必须保持 |
| 当前第二阶段 | validate.ts:94/427/559/710/1329定义开局、角色、技能、毒、作者物品；author-script.ts:115-159及runtime-script.ts:208-260是当前脚本入口；不得仅因author-script-core仍能识别旧叶就给退役作者命令新增支持合同 |
| 当前迁移计划 | migration-merge.ts:411和migration-plan.ts:134为纯数据合并/计划；migration-baseline.ts:29-108的序列化/hash/snapshot辅助可测。migration-write-plan.ts:1/15会读真实fs，不在本包纯函数范围；transaction/materialize/CLI一律不执行 |
| 本任务目标 | 正确行为的边界回归与反控增加，生产/既有断言/统计范围不变；发现冲突先交反例，不自行修实现或倒改期望。baseline.fast.json为当前计量真源，coverage.md较早日期段仅历史，不把旧full移作当前数据 |

上表省略包前缀者位于`packages/`对应包。四包当前fast：shared行196/356、分支107/177；content 4288/5183、3584/5016；
pal-extract 329/1316、209/539；migrate 3436/6677、2843/6398。数字仅说明缺口，不证明每个未命中臂都可达/应拒绝。

最强替代解释：分支已由其它档位/测试覆盖，或拟造非法输入本来不受合同支持，或预期来自复制被测算法。
证伪方式：每项附源码/规范锚点、既有测试检索与非空正常对照；独立坏实现反控必须使业务断言失败。
原版理解、运行时语义、提取/数据错误、测试模型错误分别核；schema与实现不一致不能自动归因迁移。
用户可见行为变化：N/A（测试限定，没有产品before→after授权）。若要改变行为/格式/公开接口，该项移出本卡，另报Codex。

## 上下文锚点

- [AGENTS](../../../AGENTS.md)、[CLAUDE](../../../CLAUDE.md)、[READ-FIRST](../../phase2/READ-FIRST.md)、[协作流程](../agent-workflow.md)。
- [覆盖率合同](../../testing/coverage.md)、[预E2E总队列](../audits/pre-e2e/summary.md)、[批二接收结论](../../testing/glm-pre-e2e-boundary-batch-2-report.md)。
- [第一阶段工程经验](../../phase1/engineering-notes.md)、[知识迁移目录](../../phase2/reference/phase1-knowledge-harvest.md)仅按A/C格式/解码相关段读取，不重做运行机制全审计。
- 既有测试要先通读目标模块相邻文件；不导入另一个.test.ts导致重复执行，也不把同一文件换名复制当新增贡献。
- Vitest与V8均为4.1.7。使用现有配置，不使用已移除的coverage.all；新增fixture只进__tests__等已有测试专用范围。

## 四组范围与完成标准

以下是测试族，不是要求固定用例数。每族最终有“新增/已有证据/缺陷/待证”记录，不留空白；重复已有用例只补缺少的断言或登记证据，不能改旧文件。

### A · shared解码与归档

- A1 MKF：合法含非空chunk的容器、空chunk、首/末chunk与索引边界、子array的byteOffset；明确已有header错误与未定义损坏偏移的区别。
- A2 RNG：实际rngBlitDelta的跳过/复制/重复等opcode族、连续帧基面保留、变化/未变化字节精确断言；decodeRngFrames的帧偏移/结束条件和非空正控。只比较Uint8Array数值，不渲染、截图或判断观感。
- A3 YJ2：空头/短头只是基础，必须尝试独立可核的非空literal与back-reference小向量，精确输出字节；无法构造的深分支如实列待证，不以空流完成整模块。
- 生产目标：shared/src/mkf.ts、rng.ts、yj2.ts。禁止复制解码器来算期望、无限随机fuzz或把声明长度0xffffffff直接送入主测试进程。
  疑似超大分配/不终止输入仅在硬限时/限资源独立进程诊断；不能证明资源隔离就不执行并列risk，未经确认不进fast；不靠抬高全局timeout解决。

### B · 当前内容与脚本校验

- B1 StartWorld：合法最小/丰富输入、party与可选资源域、字段自身合法零值/可选缺席及已定义非法值；不把maxHP等所有数值一概视为可为0。
- B2 Actor：基础/战斗/表现可选组合、数组/标识/数值约束；结构校验与跨资源引用校验分层，不要求结构validator承担全工程引用守卫。
- B3 作者物品：当前equip/use/throw及复合效果；当前作者script字符串/正文入口，不复活旧ScriptRef写法。
- B4 Skill/Poison：target/effects组合、可选能力、毒tick结构与错误路径；schema允许的全队复活不能因运行时既有C-03 bug而写成“应拒绝”。
- B5 当前作者脚本入口：嵌套branch/loop/all/any/not、共享脚本/声明/引用、stage/state机与错误where路径；通过当前checkAuthor*入口触达公共核。
- B6 敌方脚本：实际checkEnemyAi/HookFlow/OnDefeated/Choreography允许词表、transition/同步步骤界限和嵌套条件；不执行战斗或新造机制。
- 生产目标：content/src/validate.ts、author-script-core.ts、author-script.ts、runtime-script.ts、enemy-script.ts及其现有调用辅助。

### C · pal-extract原盘表解析

- C1 Enemy：至少一条非零记录的LE字段、object→enemy关联与可选词表/名称路径、合法长度和已定义截断拒绝；区分objectId与enemyId。
- C2 PlayerRoles：构造真实MKF容器的chunk3，按当前PLAYERROLES大小和SoA布局放不同标记值；装备/仙术/抗性数组的轴不能颠倒，角色名按正确word索引规则。
- C3 Spell/Magic/Object视图：parseSpells/parseMagicTable及object magics/poisons/players，各自输入容器与记录大小、非空输出、标志与字段映射；不能混用OBJECT与MAGIC表。
- 生产目标：pal-extract/src/resources/parsers/enemies.ts、player-roles.ts、spells.ts。
  fixture自包含合成字节，记录布局证据；不依赖data/raw或data/extracted运行fast，不复制商业资源包进Git。

### D · 纯迁移合并与计划

- D1 mergeManagedFile：absent/null/存在、独立修改、同改、add-add/delete-modify，精确值/冲突路径及类型；保留作者修改，不把ours/theirs颠倒。
- D2 ID数组/顺序/原子子树：按真实arrayMode调用域验证身份冲突和顺序，非法身份与无ID普通数组分清，不对未知合同强设新排序规则。
- D3 createMigrationPlan：managed/unmanaged、保留/新增/删除/冲突分类及精确summary/target/writes/deletes；同输入重复调用稳定，输入本身不被修改。
- D4 原子地图：存在/缺席与hash差异的三方组合；字节合同与JSON语义合同分开，不擅自把键序或数组顺序当无关。
- D5 snapshotOf及baseline纯辅助：缺席与显式null、固定已知字节的hash、metadata/write-map对应；禁止调用loadPalBaseline/assertPalBaselineSnapshotCurrent等磁盘入口。
- 生产目标：migrate/src/migration-merge.ts、migration-plan.ts、migration-baseline.ts的纯导出子集；不含migration-write-plan/transaction/pal-assets/CLI。

## 白名单

只可新增下列测试；若已存在，先报Codex核归属，不能覆盖。既有测试/断言保持零diff，不更改产品导出以方便测试。

- shared/src：`mkf.boundaries.test.ts`、`rng.boundaries.test.ts`、`yj2.boundaries.test.ts`。
- content/src：`validate-start-world.boundaries.test.ts`、`validate-actors.boundaries.test.ts`、`validate-author-items.boundaries.test.ts`、`validate-skills-poisons.boundaries.test.ts`、`author-script-current.boundaries.test.ts`、`enemy-script.boundaries.test.ts`。
- pal-extract/src/resources/parsers/__tests__：`enemies.boundaries.test.ts`、`player-roles.boundaries.test.ts`、`spells.boundaries.test.ts`。
- migrate/src：`migration-merge.boundaries.test.ts`、`migration-plan.boundaries.test.ts`、`migration-baseline-pure.boundaries.test.ts`。
- 必要fixture：上述四包各自`src/__tests__/glm-foundation-fixtures.ts`，只放数据/薄构造器，不复制产品算法，不被生产导入；无需要不创建。
- 文档：[GLM回执](../../testing/glm-foundation-coverage-receipt.md)的GLM区域；可增`docs/testing/glm-foundation-coverage-evidence.json`、`glm-foundation-coverage-mutants.mjs`、`glm-foundation-coverage.config.mts`并在回执链接。配置仅用于tmp诊断，不成为正式统计配置。
- 本卡自己的设计/自验/交接块；作为Coding Owner只能在三签齐、无counter后核定build，完成四组自验后可交review；不得代写他席或标done。
- WORLD旧卡只允许自己的补审席位/日志，单独文档提交到main；不修改其设计/状态/历史豁免或其他席位。

所有路径除docs外加`packages/`前缀。产品、既有测试、package.json、锁文件、scripts/、coverage基线/配置、projects/、data/、reference/、原探针一律不改。
不可借“修环境”追踪gitignored资产、建旧升级入口或搬运历史stash。

## 测试与证据合同

1. 每项先核当前合同和既有证据再编码。必须有合法非空正常输入和精确输出/拒绝条件；不能只断言类型、数组非空、日志或方法被调用。
2. 小范围单变量坏输入配同输入合法对照；不让空fixture/上游提前拒绝掩盖目标分支。构造器调用成功不自动证明夹具合法。
3. 每组至少两条可重建单点负控：命中被改位置且业务断言红，原实现同输入绿。模块未加载/TypeError替身破坏/超时不算；重叠守卫如实分类，不能关掉更多守卫硬造放行。
4. 不mock被测导出/算法，不复制生产遍历来写oracle；期望来自明确字段/固定字节/已核合同。不得test.fails/skip/only/todo、coverage ignore、放宽断言或时间门槛。
5. 真实缺陷：停止该项绿色验收，保留最小诊断反例、合法正控、根因候选和未裁决点；不反向断言当前错误、不自行修产品、不向默认fast塞已知红/会挂死的测试。其它独立项继续。
6. 覆盖delta要同冻结生产树、同source include、同既有测试集，before仅不含本批新测试，after加入；完整记录两命令/文件清单/原始covered与total。
   临时报告只进本人tmp，局部数字不冒称官方fast/full；源码未变时分母变化须先查口径，不把已有PAL覆盖算新增。不修改全仓coverage输出或baseline。
7. 回执数字从最终提交树现场生成：diff文件清单、测试名/case数、每条命令exit与日志、fixture/源码hash、负控。文件内容重复与旧用例去重必须核，不凭记忆填写。
8. 每族最终标新增/已有证据/缺陷/待证并附出处；未知行为不冒称结构约束/不可达。目标尽可能接近纯核全分支，达不到逐臂解释，不通过删分母“达标”。
   待证须列实际尝试、具体阻断与下一步，不能仅换标签替代已定义且可构造的回归；缺陷/待证不自动算完成，Codex须明确接收或后续归属后才可收口。

## 执行与验证

- 从本卡r1分配提交（最终转交消息给出SHA）建立`codex/glm-foundation-coverage-r1`独立worktree。产品对d64bbf6d冻结。
  签字在main上各席只改自己的块；开始build前取回三席纯文档签字，禁止把后来主线产品变化一并混入测试分支。签字提交含其它改动时先报Codex。
- 设计签齐前可做只读合同/既有测试核对和矩阵准备，不先在tmp写完整新测试绕过门禁。本卡Coding Owner GLM核三签有效后可更新自己卡的build准入/Status，记录来源SHA；Codex负责主线看板同步。
- A→B→C→D每组独立提交，做完一组继续下一组，不逐组向用户请求许可；一组遇到具体阻断就登记并继续独立组。
- 按组运行`pnpm --filter @type-pal/<包> exec vitest run <白名单新文件和具体相邻文件>`；migrate加`--config vitest.config.ts --project unit`。
  每个改动包跑typecheck和改动文件Biome。不得让passWithNoTests掩盖选错文件，回执须有实际case数。
- 不并发跑重型检查；全仓check/full/官方ratchet/单次严格fast由Codex接收后统一排期。GLM不更新官方基线，且此限制不豁免本组定向/相邻验证。
- 每组覆盖对账可用只读现有LCOV筛选；若旧报告不匹配冻结源码，改用同口径tmp测量，不挪用其它树数字。测试快照不用真实用户工程或存档。
- 四组交付后GLM提交自验与总账，Coding Owner在review阶段交Codex负责适配/集成。GLM不作为自己测试贡献的独立第三方证明；Codex/Kimi分别复核。
- WORLD补审与本卡设计签字分开提交；旧卡若已归档，按索引找到实际路径，不恢复旧活动卡副本。新测试分支只接本卡签字文档，不混入旧卡状态操作。

新文件建立后的定向命令（未创建的文件不冒称已执行；相邻既有测试需另列实际文件名）：

```sh
pnpm --filter @type-pal/shared exec vitest run src/mkf.boundaries.test.ts src/rng.boundaries.test.ts src/yj2.boundaries.test.ts
pnpm --filter @type-pal/content exec vitest run src/validate-start-world.boundaries.test.ts src/validate-actors.boundaries.test.ts src/validate-author-items.boundaries.test.ts src/validate-skills-poisons.boundaries.test.ts src/author-script-current.boundaries.test.ts src/enemy-script.boundaries.test.ts
pnpm --filter @type-pal/pal-extract exec vitest run src/resources/parsers/__tests__/enemies.boundaries.test.ts src/resources/parsers/__tests__/player-roles.boundaries.test.ts src/resources/parsers/__tests__/spells.boundaries.test.ts
pnpm --filter @type-pal/migrate exec vitest run --config vitest.config.ts --project unit src/migration-merge.boundaries.test.ts src/migration-plan.boundaries.test.ts src/migration-baseline-pure.boundaries.test.ts
```

## 验收与推进签字

验收：四组都有完整分类；有效新增回归有同输入正控与每组至少两负控；无未申报默认红测试/环境失败；所有白名单与冻结检查通过；
贡献计数可重算，最终主线check/ratchet/受保护strict-fast不回退且无范围移除。用户不承担技术手工复验，无视觉验收项。

### build前

- Codex：premise verified / design agree（2026-09-16，r1）：已直读上述导出、旧测试入口和baseline，确认四包缺口及输入层分界；明确PlayerRoles整MKF、YJ2先分配风险、write-plan为IO而非纯函数。
  可证伪：若候选用例已覆盖/输入不合法/目标层没有该合同，应撤回新增结论而非改产品或期望；该项分类不阻止其它已核独立项。
- GLM：**premise verified / design agree（2026-09-16，r1，Coding Owner 独立核对，工作树 5cee883d，产品=d64bbf6d 零漂移）**。
  - **A/C 原盘格式直读**：`shared/src/mkf.ts:1-5` N+1 个 u32 LE 偏移头、子文件数=(head[0]-4)/4 合同在位；
    `pal-extract/src/resources/parsers/player-roles.ts:92-105` parsePlayerRoles 接收**完整 DATA.MKF 字节**、openMkf+readChunk(mkf,3)、
    PLAYER_ROLES_BYTES 精确尺寸门——裸 900 字节/SAVEDGAME 0x250 偏移不能充当输入，卡面分界属实。
  - **去重边界直读**：shared/src 现有 rng.test.ts 已覆盖 rngBlitDelta 四族 opcode（0x00/0x02/0x06/0x0d）+unknown throw
    （rng.test.ts:6-32），decodeRngFrames 无 fast 直测（仅 pal-extract rng-frames 真实资产域经 shared 复用）；
    mkf/yj2 的既有 io 测试在 pal-extract/src/io/（资产域），shared 包内无——A 组增量=纯合成字节 fast 用例，重叠面已核。
    content 侧 author-script-core.test.ts、author-script.current-characterization.test.ts 在位；migrate 侧 migration-*.test.ts 五件在位。
  - **B/D 入口直读**：validate.ts:94/427/559/710/1329=validateStartWorld/Actors/Skills/Poisons/AuthorItemCore；
    author-script.ts:115 checkAuthorCommands、runtime-script.ts:208 checkRuntimeScriptFlow 为当前作者/运行时入口；
    enemy-script.ts:152/250/458/523/576=B6 词表入口。migration-merge.ts:411 mergeManagedFile、migration-plan.ts:134
    createMigrationPlan 纯函数；migration-write-plan.ts:1/16/76 读 fs——排除正确。baseline.ts:29-40 纯辅助（原子地图路径/
    serializeMigrationJson/sha256）可测。白名单四个抽查目标文件当前均不存在，可新增。
  - **design agree**：一次设计全包、A→B→C→D 分组连续、每组≥2 单点负控（命中+业务红+正常对照绿）、同冻结树同 include
    前后对照进 tmp、B4「schema 允许的全队复活不得因运行时 C-03 写成应拒绝」（与我在批二 D05 的数据事实一致：
    301/302 均 oneAlly，无 allAllies 复活数据——若 schema 层另有允许组合，测试按 schema 合同而非运行时现状）、
    YJ2 疑似超大/不终止输入不进 fast、疑似缺陷只交反例不修产品——均与独立核验一致。
  - **可证伪观察**：①若 A 组目标分支实为 pal-extract 资产域已覆盖且 fast 亦可达，则该项只登记证据不加重复用例；
    ②若 PlayerRoles 纯字节 fixture 无法同时满足 SoA 布局与 PLAYER_ROLES_BYTES，该子项列待证，不得借 SAVEDGAME 数据冒充；
    ③若 D 组 merge/plan 存在 write-plan 之外的隐藏 IO 依赖，该项移出白名单；④负控若仅能以模块加载错误/TypeError 命中，
    不计入两条有效负控，须重造。
  - **贡献披露**：批二 F 组曾给出同源七包覆盖缺口静态清单（本人材料）；本卡为正式测试卡，该清单只作线索，
    不作为任何"已覆盖/已完成"证据，最终以本卡现场生成数字为准。
- Kimi：**premise verified / design agree（2026-09-16，r1，产品冻结 d64bbf6d 实测零漂移；全部证据本人直读，未读 GLM 结论）**。
  - **A/C 原盘格式分界**：`shared/src/mkf.ts:1-5` N+1 个 u32 LE 偏移头、子文件数=(head[0]-4)/4；
    `pal-extract/src/resources/parsers/player-roles.ts:92-105` parsePlayerRoles 接收完整 DATA.MKF、
    openMkf+readChunk(3)+PLAYER_ROLES_BYTES 精确尺寸门——裸 900 字节/SAVEDGAME 0x250 不能冒充输入，
    卡面分界属实；CLAUDE 的 roleId/word 索引分界须保持（卡面已列）。
  - **YJ2 资源风险直读**：`shared/src/yj2.ts:139-143` uncompLen 取自输入头四字节后直接
    `new Uint8Array(uncompLen)`——0xffffffff 即约 4GB 分配；「疑似超大/不终止输入仅在硬限时独立
    进程诊断、不进 fast、不抬全局 timeout」是必要纪律而非保守偏好。
  - **B/D 当前模型入口直读**：validate.ts:94/427/559/710（StartWorld/Actors/Skills/Poisons）在位；
    `migration-merge.ts:411` mergeManagedFile 与 `migration-plan.ts:134` createMigrationPlan 纯数据
    进出；`migration-write-plan.ts:1-16` import node:fs 且 differs() 真实读盘——排除出纯函数范围正确；
    `migration-baseline.ts` 纯辅助（serialize/hash/snapshot）可测属实。
  - **当前 bug 不固化**：C-03（battle.md:65 合法全队复活被运行时过滤）是运行时 P2，B4 按 schema
    合同写测试、不得写成「应拒绝」——分层正确；合同 5（缺陷停绿、留反例、不修产品、不倒改期望）
    与之配套。
  - **去重与夹具**：shared 现有 rng.test.ts、pal-extract io 域 mkf/yj2 等既有测试在册，卡面要求
    先通读去重、重复只补断言或登记证据；白名单新文件抽查四件均不存在（本人实测），新增合法。
  - **设计同意**：一次审全包四组不重签；每组≥2 有效单点负控（命中+业务红+正控绿，模块加载错/
    TypeError/超时不计）；覆盖 delta 同冻结树/同 include/同既有测试集前后对照且只进 tmp，
    baseline.fast.json 为计量真源、GLM 不动官方基线；不缩范围/不降阈/不 test.fails；
    真实缺陷隔离流程与贡献披露、worktree 隔离、分组连续执行纪律完整。范围确停在测试补强：
    无产品/格式/基线/版本改动授权；WORLD-ASYNC-COMMIT-1 补审明确另卡，不混签字。
  - **可证伪观察**（任一反例即收窄或 counter）：① 目标分支已被同合法性既有测试覆盖 → 只登记
    证据不加重复用例；② PlayerRoles 合成 fixture 无法同时满足 SoA 布局与尺寸门 → 列待证，
    不得借 SAVEDGAME 数据冒充；③ 期望来自复制被测算法或合同不支持的输入 → 非缺陷，更正期望
    或移出该项；④ 畸形长度 YJ2 输入进入 fast 主进程 → 资源纪律破坏；⑤ merge/plan 纯函数被
    发现隐藏 IO 依赖 → 该项移出白名单；⑥ 覆盖对照换树/换 include/换测试集 → 数字无效须重测；
    ⑦ 负控仅模块加载失败/TypeError/超时 → 无效须重造。
  - 返工项：无。非阻断备注：卡面 Kimi 占位行曾重复两行（并行落盘竞态），已随本签字归位一行；
    既有 rng.test.ts 四族 opcode 覆盖与 A2 目标重叠面以 build 期去重核对为准。
- 非Coding Owner独立前提证据：Codex如上；Kimi补其独立核验与可证伪观察。
- 用户豁免：none；WORLD旧卡豁免不适用于此新卡。
- build准入：build allowed（2026-09-16，Coding Owner 核验：Codex r1（分配提交 d901b77f 席位）/GLM r1（5d39f7bf）/Kimi r1（056d1e38）三签齐、无 counter；三签提交对 d901b77f 为纯文档，产品对 d64bbf6d 零漂移已实测）。测试分支自 056d1e38 建立 codex/glm-foundation-coverage-r1。

### done前

当前门禁：Codex集成accept；Kimi独立终审与GLM本人实现者自验签字待落卡。下列01c149b5/c0c94333两轮counter保留历史，均已由639e9e4e修复并复核关闭。

- GLM：pending（实现者自验，不是第三方独立accept）。
- Codex：**counter（2026-09-16，候选01c149b5）**。独立定向133项、四包typecheck和8负控符合预期，产品零diff；
  pal/migrate覆盖对照复算相同。但最终树Biome27错；隔离坏实现证明D组冲突仍删文件、C组只留首槽均未被新套件拦截；
  D组自比较/缺席替身、C3未完成及交付账需定点返工。详见[独立复核R1～R4](../../testing/glm-foundation-coverage-review.md)。
  r1设计保持，不先集成、不跑ratchet/改基线；本席不代填GLM自验/Kimi终审，Coding Owner接手按counter核定rework。
- Codex最新（2026-09-17，候选c0c94333）：**counter仅剩R2深快照漏洞及回执勘误**。139/139、相邻、四包tc/Biome和11负控通过；
  原三见证已独立复建转红，R1格式/白名单、R2删除/absent-null/hash、R3槽位/对象视图通过，不重开。
  三侧files浅副本仍同源引用；各轴输入原地写v=17仍被候选不变性断言放过，深快照对照三红/正常绿。详见同报告末节返工复核。
  YJ2两项后续归属接受；未集成/未改官方基线，旧counter原文作为历史保留，本轮不转Kimi、不标done。
- Kimi：pending（独立终审）。
- Codex本轮（2026-09-17，接收639e9e4e，整合候选48d3b8e3）：**accept（独立接收复核/集成）**。R1～R4均已关闭，139项/四包tc/Biome与14反控通过；
  原三轴污染见证均命中深快照断言。已合入862733ba产品树，完整check7218项、官方ratchet和受保护单次严格fast6730项通过，617生产文件与全部旧测试identity保持。
  全仓行70.90%/分支62.50%，无产品/既有测试改动或scope移除；仅诊断配置改为官方数组导入并勘误21文件/冻结点，139项测试与fixture保持GLM原样。
  YJ2树归约、空窗回引合同按已核后续归属接受，不声称完整覆盖/E2E已完成；GLM是测试贡献者，非其自己测试的独立第三方证明。
- done准入：blocked；由Codex统一收口，不由GLM标done。

## 额度、并行与交接

2026-09-16用户确认GLM额度恢复；可持续承担本包非视觉测试。WORLD-ASYNC-COMMIT-1先补实现审查，不重开旧r1设计/历史豁免，材料贡献须披露。
本包四目标包与Codex世界/保存主线错开；目标生产源码若漂移，由Codex明确新冻结点/适配范围，不自行合入生产修复或新版本输入。

- 2026-09-17 Codex：139项GLM测试已适配主线，完整check7218与ratchet/受保护单次strict fast6730/617全部通过；无现有文件移出统计、旧test identity均保留，reforge/game/editor基线对象逐字不变。
  当前转review，冻结整合候选交Kimi独立终审；GLM仅补本人实现者自验席位，不重复第三方审查、不代签、不标done。YJ2两项后续登记保持。
- 2026-09-17 Codex：合并提交48d3b8e3固定整合候选，随后只回填SHA/提示词；相对候选packages/scripts零diff，旧counter全文保留。

- 2026-09-17 Codex：接收639e9e4e，最后R2及回执勘误通过；合入最新主线862733ba，保留已完成保存卡归档与旧counter原文。
  实测配置适配前后迁移选例不变（314/338），正式测试零改；开始串行完整check→官方ratchet→受保护单次严格fast，暂不标done。

- 2026-09-17 Codex：复核c0c94333，明确关闭上轮已修项目，仅R2的对象深快照仍有可证伪缺口；补三个真正污染输入的内存见证及深快照正反对照。
  候选分支保持干净，主线只登记本人复核/交接，不改GLM测试/产品/基线；原三针和11正式负控均业务红，139项与相邻通过。
  R4计数/SHA/覆盖时点与重建命令顺手勘误；GLM在原分支定点返工，无需重签r1或重复整批设计。

- 2026-09-16 Codex：接收01c149b5，只读复核全部15测试/3fixture及负控，133项/四包tc通过；额外三针均命中却绿，独立正常/坏结果对照证实鉴别力缺口。
  main只登记本人counter、报告、导航与交接，候选测试/fixture/产品未合入；GLM作为Coding Owner定点返工R1～R4，本轮不转Kimi终审。
  临时日志/复建入口和本人首次oracle环境失败均写入报告；未跑全仓check/官方覆盖门，不虚报已集成或已提升主线覆盖。

- 2026-09-16 Kimi：完成 r1 独立范围/分层/反控/资源安全审查，签 premise verified + design agree，无返工项。
  直读 mkf.ts:1-5 头合同、player-roles.ts:92-105 完整 MKF 输入门、yj2.ts:139-143 畸形长度分配风险、
  validate.ts 四个入口、migration-merge:411/plan:134 纯函数与 write-plan:1-16 真实 fs 边界、
  C-03 运行时缺陷与 schema 合同分层；实测冻结产品零漂移、白名单新文件均不存在、既有 rng/io 测试在册待去重。
  七条可证伪观察与非阻断备注写入本席；本卡 Kimi 占位重复行随签字归位。未改产品/他席/状态，
  未开始测试实现。Next：三签齐且无 counter 后由 GLM（Coding Owner）按卡核定 build 并建
  worktree 连续执行 A→D；WORLD-ASYNC-COMMIT-1 补审另卡不混。
- 2026-09-16 GLM：完成独立合同核对，build前席位签 premise verified + design agree（证据锚点见签字块）；仅改本席。
  当前三签状态=Codex✓/GLM✓/**Kimi 缺席（premise/design pending）**→build 准入维持 blocked；本席不越权开始正式测试实现，
  不在 tmp 预写完整测试绕门禁。待 Kimi 设计签字落卡且无 counter 后，由本席或接手会话按卡从分配提交 d901b77f
  建 codex/glm-foundation-coverage-r1 worktree 连续实现 A→D。
- 2026-09-16 Codex：创建r1，一卡四组边界与白名单，GLM/Kimi设计审查可并行；本次未新增测试或运行覆盖率，未给实现准入。
- 2026-09-16 Codex：文档门423 Markdown / 2070链接 / 144任务通过，文档工具20/20，索引与官方生成器一致，diff检查通过；产品/测试/基线相对d64bbf6d零改动。

## 下一位Agent提示词

### 当前交接：集成候选终审（设计r1不重签）

集成候选48d3b8e323f5bc801954c7960d3c25efd7d35fef，整合基点862733ba，GLM源候选639e9e4e。两席独立读取候选证据，不读取/复述彼此本轮结论；各自只改自己的席位与日志并提交推送。

#### Kimi独立终审

```text
在 /Users/zhangxu/illegal/type-pal 终审 TEST-FOUNDATION-COVERAGE-1 r1，任务卡 docs/ops/tasks/TEST-FOUNDATION-COVERAGE-1-core-boundaries.md，状态review。候选48d3b8e323f5bc801954c7960d3c25efd7d35fef，对比862733ba；GLM源候选639e9e4e，设计不重签。
先同步并查工作树，读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡和docs/testing/glm-foundation-coverage-review.md的最终接收节、glm-foundation-coverage-receipt.md。独立核139项（27/69/19/24）业务断言、原三见证与深快照三轴反控、C3两视图、纯函数/真实IO边界、current-only与第一阶段原盘格式分界。不要把读到的Codex/GLM结论当作独立证据。
重点核集成相对862733ba无产品/既有测试变化；139项与fixture等于GLM源树；Codex仅将诊断配置改为官方迁移排除数组导入并勘误文档，基线由官方ratchet更新。复跑定向/反控，核check7218、BASE_REF=862733ba的单次strict fast6730/617、旧identity/分母不变与四包增量；YJ2两项是已登记后续，不伪称全覆盖。
在自己的实现席位写accept或带file:line/反例的counter，附独立证据、可证伪观察和旧版本兼容审查，追加本人日志并提交推送。不改产品/测试/基线/他席/状态，不代签、不标done；无视觉任务，GLM测试贡献须披露。
```

#### GLM仅补实现者自验登记

```text
在 /Users/zhangxu/illegal/type-pal 为 TEST-FOUNDATION-COVERAGE-1 r1补本人实现者自验席位。卡 docs/ops/tasks/TEST-FOUNDATION-COVERAGE-1-core-boundaries.md，状态review；候选48d3b8e323f5bc801954c7960d3c25efd7d35fef，对比862733ba，源贡献639e9e4e。设计不重签，不是让你对自己的测试再做独立第三方审查。
先同步并查工作树，读根协议、CLAUDE、phase2 READ-FIRST、本卡及docs/testing/glm-foundation-coverage-review.md最终接收节。Codex已核关闭R1～R4，139项/14反控、完整check7218、官方ratchet与受保护strict fast6730均通过；139项测试/fixture保持你的源树原样，只有诊断配置官方数组导入与文档勘误由Codex适配。
核对你贡献范围及集成差异，在GLM席位明确签accept（实现者自验，非独立第三方）或报告实际不符；更新本人日志，直接提交推送。不读/复述Kimi结论，不改他席/产品/测试/统计基线或状态，不标done，不做视觉；无需为已完成的独立质量门重复整仓运行。
```

### 历史交接：GLM定点修c0c94333剩余R2（已闭）

```text
在 /Users/zhangxu/illegal/type-pal 定点返工 TEST-FOUNDATION-COVERAGE-1 r1，分支codex/glm-foundation-coverage-r1，候选c0c9433333037f35da1fd36042cc647d6538f338。产品冻结d64bbf6d，三签不重签。
先同步并查工作树，读根协议、CLAUDE、phase2 READ-FIRST、任务卡docs/ops/tasks/TEST-FOUNDATION-COVERAGE-1-core-boundaries.md和docs/testing/glm-foundation-coverage-review.md末节2026-09-17返工复核；保留counter原文，不改他席。
上轮Biome/fixture路径、删除门、真absent/null、角色槽位、C3对象视图已经Codex复核通过，139项及11负控有效，不重做。唯一代码阻断：migration-plan.boundaries.test.ts:103-112的files展开仍共享值对象，before不是独立快照；base/ours/theirs各自被原地写v=17时测试仍绿。改为真正深快照并永久化输入污染负控；正常原实现绿、三个污染轴业务红。现成诊断在/tmp/codex-foundation-r1-rework.KtFIPX/immutability.config.mjs，丢失可按报告重建，勿改产品。
同时更正回执完整冻结SHA、D组8/8/8=24、独有文件增量基点、旧133项覆盖数据的历史时点，给完整可复制覆盖命令/配置；null与{a:null}用例不要仍叫缺席。YJ2两项后续归属保持，不扩范围。
仅改本人白名单新测试/诊断和回执，既有测试/产品/原探针/统计配置基线零改；作为Coding Owner按counter核定状态并填本人真实自验。定向/受影响相邻、tc/Biome/负控通过后提交推送交Codex接收；不代签、不标done、不转Kimi。整批接收后才由Codex跑官方check/ratchet/单次严格fast。
```

### 历史交接：GLM返工01c149b5（已按本轮结论收窄）

```text
在 /Users/zhangxu/illegal/type-pal 返工 TEST-FOUNDATION-COVERAGE-1 r1，候选01c149b5收到Codex counter，尚未集成；产品继续冻结d64bbf6d，设计三签保持、不重签。
先同步并检查工作树，读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、任务卡docs/ops/tasks/TEST-FOUNDATION-COVERAGE-1-core-boundaries.md及docs/testing/glm-foundation-coverage-review.md全部R1～R4；在原codex/glm-foundation-coverage-r1分支接收counter文档，保留原文。你是Coding Owner，按counter核定rework，不改他席结论。
R1修本人文件Biome27错、真实15测试/3fixture和B组20/6/4/21/9/9计数，pal fixture回精确白名单。R2补冲突下真实待删除文件与无冲突正控，删恒真hash自比较，真实absent/null及metadata/write-map、输入不变范围对账。R3补角色非首/末装备和仙术槽的完整非对称断言；C3 poisons/players视图本轮补齐，不以分支少后置。R4逐族分类/去重/准确负控红因与可重建覆盖命令补齐。
原133项与8负控的有效部分保留，pal/migrate覆盖数字已复算认可；YJ2两项可列明确后续归属，不为分支率造大资源流或固化未定义坏输入。额外三针见报告与/tmp/codex-foundation-review.G53t4a/witness.config.mjs，返工后应业务红；临时文件丢失按报告唯一替换可重建。
只改本卡白名单新测试/fixture、本人回执/证据/日志，不改产品、既有测试、原探针、统计配置/基线，不做视觉。逐组定向及相邻、typecheck/Biome和单点负控重跑，从最终树生成回执，不靠记忆写数字。完成交Codex复核后再决定集成/全仓check/ratchet/严格fast；不代签、不标done、不转Kimi终审。
```

### GLM

```text
分配提交d901b77ff25493642fe0d356b4a9547f0914d6f3（仅文档）；新测试分支从该提交建立，产品冻结d64bbf6d2817ba971ae2bd3bbe9a24f3870e7e86。
在 /Users/zhangxu/illegal/type-pal 执行两段工作：先补审 WORLD-ASYNC-COMMIT-1，再承担 TEST-FOUNDATION-COVERAGE-1 的四组非视觉测试。先同步并检查工作树，读AGENTS/CLAUDE/phase2 READ-FIRST；不要恢复stash或覆盖他人改动。
第一段：WORLD卡 docs/ops/tasks/WORLD-ASYNC-COMMIT-1-world-async-commit.md 当前review，候选e13216e7a4439008df38666cbcfec557c8e5a26c，对比5bc62a21。额度恢复补审，不重开r1设计/历史豁免；披露你参与过批二原始材料，直接核实现与正式回归、8反控及质量门，不读或复述Kimi实现终审。只写你自己的补审席位/日志并提交推送，不改产品/状态、不标done。
第二段：读 docs/ops/tasks/TEST-FOUNDATION-COVERAGE-1-core-boundaries.md 的r1范围，产品冻结d64bbf6d2817ba971ae2bd3bbe9a24f3870e7e86。你是测试Coding Owner：先独立核现行合同/既有测试并签自己的premise/design；签齐前三方门禁不可绕过，只能做只读核对和矩阵准备。Codex/Kimi/你本人r1设计签字齐且无counter后，按卡核定build并在codex/glm-foundation-coverage-r1独立worktree连续完成A共享解码、B当前内容校验、C原盘解析、D纯迁移合并/计划；不逐组要求用户确认。
严格按卡白名单新增自包含正式测试与必要test-only fixture；既有测试/断言、产品、版本、配置、基线、生成产物、旧探针零修改。先去重，每条有来源合同、非空正常输入、精确业务断言；不把当前bug写成正确合同。疑似缺陷只交小型可重建反例，保持该项待处理并继续其它独立项，不自行修产品。
每组至少两条有效单点负控，必须证明命中与业务断言红，正常实现同输入绿；不得拿模块加载错误/未执行路径当负控。覆盖增量只做固定生产源码/既有测试集的同树前后对照，输出到tmp；不跑官方ratchet/full/strict fast，不改排除/超时，不做浏览器或视觉。
按A→B→C→D分组提交后继续，所有组都给已补/已有证据/缺陷/待证分类及精确测试名、命令、exit、SHA和负控。四组完成后交Codex复核集成；不凑测试数量、不把局部覆盖当全仓、不代签Kimi/Codex、不标done。只读准备阶段若仍缺签，写清缺席后交接，不越权开始正式测试实现。
```

### Kimi（与GLM设计审查并行）

```text
分配提交d901b77ff25493642fe0d356b4a9547f0914d6f3，请审同一张r1卡；产品冻结d64bbf6d2817ba971ae2bd3bbe9a24f3870e7e86。
在 /Users/zhangxu/illegal/type-pal 设计审查 TEST-FOUNDATION-COVERAGE-1，卡 docs/ops/tasks/TEST-FOUNDATION-COVERAGE-1-core-boundaries.md，r1/draft，产品冻结d64bbf6d2817ba971ae2bd3bbe9a24f3870e7e86。先同步并读AGENTS/CLAUDE/phase2 READ-FIRST、本卡及docs/testing/coverage.md；此次四组只补测试，不改产品/格式/基线。
请独立直读目标源码与已有测试，核A/C原盘格式与B/D当前模型分界、正常夹具合法性、当前bug不得固化为合同、真实缺陷隔离、YJ2畸形长度资源风险、纯迁移函数与真实写盘边界、同口径覆盖对照及不缩范围。不要读取/复述GLM新卡审查结论。
在自己的设计席位给带file:line与可证伪观察的premise verified/counter、design agree/counter，只改本卡自己的签字/审查/交接日志并提交推送；不改产品/他席/状态、不开始测试实现、不标done。一次审全包边界，不要求四组分别重签。WORLD-ASYNC-COMMIT-1原实现终审是另一张卡，不与本卡设计签字混用。
```
