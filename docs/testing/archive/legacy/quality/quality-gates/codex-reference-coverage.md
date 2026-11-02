# Codex人物/命令引用补测

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 Codex 人物/命令引用补测回执（2026-09-22，基点 `0ba26a84`，生产与 `57dda7ed` 相同；同 Owner 连续推进不开新卡）：只新增两个 content 测试文件与隔离工具，不改产品/公共 fixture/schema/存档/资源合同；actor-reference 与 command-target-reference 两目标补强。

## Scope

- 范围与去重：actor-reference（exact actor+expression 改名/完整输出计数/实际输入保真/无命中深拷贝/canonical 战斗编排/默认缺席非人物肖像）+command-target-reference（两 hook 槽语义/visitor 每边恰一次/multi targets/空复制拒绝/unknown 防御）；既有 contracts 测试基础分类零改，本批首次直接命中 rename 不宣称首次拥有重命名测试。

## Execution and assertions

- **合法性**：合法命令先过 checkAuthorCommands；对话另过 assertAuthorDialogueReferences+真实 ActorDef 表，改名后再用对应新表验证；成长 delta 全部必填字段无 as unknown；残缺形状 unknown-input 防御单列不声称合法作者内容；快照复用既有 deepSnapshot，公共 fixture 零改
- **覆盖对照**：对照 config 两侧官方 content 全生产范围+fast testSelection；before 只排除本批两新文件、after 纳入；709→721 项均绿；生产集合/各维分母不变；actor-reference 行 75/93→93/93、函数 10/14→14/14、分支 73/113→113/113（100%）；command-target 行 88/89→89/89、分支 83/94→92/94（97.87%，:119 exact EntityAddress 保证后不可达、:198 退役防御归 E-05 保留分母不复活）；content 整包净增 51 行/63 语句/9 函数/77 臂，两直接目标净增 19 行/49 臂不混记
- **负控**：reference-mutants.mjs：1 个 12 项全绿对照+6 单点变异全钉名 AssertionError 红（去 actor 身份比较/污染 portrait/不累计改写数/漏 choreography/visitor 缓存不清空/copy 返回原值）；每针唯一源码点、实际测试数与标题唯一、零 skip/todo、产品 hash 前后不变；判据自测拒普通 Error 夹带/混合错误/超时/未执行；最终工具另拒 suite 级错误与未捕获运行时错误
- **失败记录**：对照 config 初版未映射官方 --passWithNoTests 拒绝启动（显式转同义配置后 before 709 绿）；初版成长 fixture 漏 delta 被拒后补完整类型；初版假设 setAmbience 空串/learnSkill 非字符串必被拒绝实跑不成立已撤回（guard 完整准入归 GLM E02/后续审计）；不将坏形状登记为合法内容；UI/原生保存/七套预制资源/E2E/N6b 不借此关闭

## Results

- 间接命中与 GLM 重叠：author-script-core +15 行/14 臂、enemy-script +6 行/2 臂——接收 GLM 整包时按集成树并集复算，不把冻结 7,538 遗漏算成 GLM 新增。
- 统一门：check exit0 七包 8,041 项（47 既有 warning/6 info 无 error）；ratchet exit0 fast 7,550 项/633 生产文件只升不降；受保护单次 strict（BASE_REF=0ba26a84）与新基线各维完全一致。
- 后续节奏（用户 2026-09-22）：5–8 个相关模块或完整业务域为一批，日常定向+TC+单点反控，整批冻结才统一三门。

## Evidence

- 证据路径：本回执正文（quote 保全）；对照 config/负控工具/复跑命令在 quote；/tmp 按原文时点。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| 引用补测 | 2026-09-22 | 两文件+6 针+三门 | 完成（连续推进） | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy quality/quality-gates 的引用补测回执；固定来源与 source SHA 见下方保全节。

## 原始结论

两目标 100%/97.87% 分支（两保留臂登记归属）；间接命中与 GLM 重叠须并集复算；三门 exit0。

## 当时证据

覆盖对照表、负控六针、失败记录与后续节奏在 quote 保全。

## 当前有效性

historical。覆盖数字按当时基点。

## 继任文档

当前覆盖真值归官方 ratchet/fast。

## 原文保全

固定源 revision `b6b32d2ac3c0276357e43eee8658c50da8da695b`，source SHA `97310780b50e4c78f59ee53409987ae659cc6e252258aa894297d467442e69bb`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # Codex人物/命令引用补测
>
> 2026-09-22，Owner：Codex；基点`0ba26a84`，生产与`57dda7ed`相同。
> 用户要求覆盖率优先并让Codex继续独立工作。本批为同Owner连续推进的既有合同测试维护，只新增两个content测试文件
> 和隔离工具，不改产品、公共fixture、schema/存档/资源合同或能力地图；不开新实施签字卡。遵循AGENTS、READ-FIRST及既有Vitest4.1.7/V8、pnpm流程。
>
> ## 范围与去重
>
> | 目标 | 现行消费者 | 新增或补强 |
> |---|---|---|
> | `content/src/actor-reference.ts` | `editor/src/core/actor-dialogue-commands.ts:76`真实rename；validate-refs及editor引用图 | exact actor+expression改名、完整输出/计数、实际输入保真与无命中深拷贝；canonical战斗编排；默认/缺席/非人物肖像路径 |
> | `content/src/command-target-reference.ts` | editor `commands.ts:3007`、script-editor复制、project-reference-adapters | 两hook槽语义；visitor每边恰一次/回调结果不串；multi targets；空复制参数拒绝、非引用数据深隔离与unknown输入防御 |
>
> 既有`actor-reference.contracts.test.ts`、`command-target-reference.test.ts`/`.contracts.test.ts`已测基础分类，原断言零改。
> editor的`actor-dialogue-commands.test.ts`已有跨作者面重命名集成；本包首次直接命中rename不宣称首次拥有重命名测试。
> 本批差异为精确非目标保持、完整实际输入快照、输出深别名、独立计数及编排域，不重复旧主流程当新业务。
>
> 合法命令先过`checkAuthorCommands`；对话另过`assertAuthorDialogueReferences`和真实ActorDef表，改名后再用对应新表验证。
> 成长delta提供全部必填字段，没有`as unknown`绕守卫。残缺形状的unknown-input防御单列，不声称合法作者内容，
> 不替作者guard定义新接受政策。快照只复用已读过的既有`deepSnapshot`，公共fixture零改。
>
> 两目标不在GLM第二波25模块修改清单。**间接命中与GLM重叠**：author-script-core增加15行/14臂、enemy-script增加6行/2臂。
> 接收GLM整包时须按集成树并集复算，不把冻结7538的遗漏全算成GLM新增；不改其准备稿或签字。
> 没有为0%但未发现现行caller的`enemy-team-reference.ts`补续命测试，也未扩测退役命令。
>
> ## 同口径覆盖对照
>
> [对照config](../../../../domains/quality/quality-gates/tools/reference-coverage-config.mjs)两侧采用官方content全生产范围及fast testSelection；
> before只额外排除本批两个新文件，after纳入。709→721项均绿；生产集合/各维分母不变。
> 报告：`/tmp/type-pal-reference-coverage-B0tFkX/{before,after}`，不占用coverage/fast。
>
> | 范围 | 行 | 函数 | 分支 |
> |---|---|---|---|
> | actor-reference | 75/93 → **93/93** | 10/14 → **14/14** | 73/113 → **113/113（100%）** |
> | command-target-reference | 88/89 → **89/89** | 15/15不变 | 83/94 → **92/94（97.87%）** |
> | content整包 | 4510/5185 → **4561/5185** | 771/831 → **780/831** | 3888/5019 → **3965/5019** |
>
> 整包净增51行/63语句/9函数/77臂；两直接目标净增19行/49臂，其余来自真实guard/对话解析的间接执行，不能混记。
> command-target剩两臂保留在分母：`:119`在exact EntityAddress已保证非空scene后再判空，普通JSON不可达；
> `:198`是退役scene-script绑定缺scene防御，归E-05，不为100%复活测试。
>
> ```sh
> REFERENCE_COVERAGE_PHASE=before REFERENCE_COVERAGE_DIR=/tmp/type-pal-reference-coverage-B0tFkX pnpm exec vitest run --config docs/testing/domains/quality/quality-gates/tools/reference-coverage-config.mjs
> REFERENCE_COVERAGE_PHASE=after REFERENCE_COVERAGE_DIR=/tmp/type-pal-reference-coverage-B0tFkX pnpm exec vitest run --config docs/testing/domains/quality/quality-gates/tools/reference-coverage-config.mjs
> node docs/testing/domains/content/testing-records/tools/reference-mutants.mjs
> ```
>
> 重跑时可将REFERENCE_COVERAGE_DIR换成本人mktemp目录。统计用分子/分母，不混用Vitest截断百分比与官方四舍五入。
>
> ## 鉴别力与验证
>
> [负控工具](../../../../domains/content/testing-records/tools/reference-mutants.mjs)：1个12项全绿对照＋6个单点变异全部钉名自身AssertionError红。
> 变异分别去掉actor身份比较、直接污染输入portrait、不累计改写数、漏choreography、visitor缓存不清空、copy返回原值。
> 每针唯一源码点、实际测试数与标题唯一、零skip/todo、产品hash前后不变；判据自测拒普通Error夹带AssertionError、
> 混合错误、超时与未执行。只在Vite load隔离变异，不改磁盘生产文件。
> 最终明细：系统临时目录`type-pal-reference-mutants-d1EB6U`，总日志`/tmp/type-pal-reference-coverage-B0tFkX/mutants-gate-final.log`。
> 最终工具另拒绝suite级错误与未捕获运行时错误；新增文件最终Biome零warning/error。
> 定向＋相邻27/27、content TC与新增文件Biome通过；最终全包局部覆盖721项绿。
>
> ## 失败记录与边界
>
> - 对照config初版未映射官方`--passWithNoTests`而拒绝启动；显式转同义配置后before709绿，未删除选择校验。
> - 初版成长fixture漏delta字段，被guard/TC拒绝；已补完整当前类型。content无DOM全局structuredClone声明，改用既有深快照helper，未改tsconfig。
> - 初版假设setAmbience空串/learnSkill非字符串必被checkAuthorCommands拒绝，实跑不成立，已撤回。测试只核unknown扫描器不制造引用，不将坏形状登记为合法内容。
>   作者guard对这两种叶字段的完整准入待沿保存/导入链另核，归GLM E02/后续审计线索，不在本批改schema/产品。
> - UI、原生保存、七套预制资源阻断、E2E/N6b与其它卡不借此关闭。
>
> ## 统一质量门
>
> 串行完成：`pnpm check` exit0、七包**8041项**，47既有warning/6info（无error）；
> `pnpm coverage:ratchet` exit0、fast **7550项/633生产文件**，基线只升不降；
> `TYPE_PAL_COVERAGE_BASE_REF=0ba26a84 pnpm coverage:fast`单次exit0，与新基线各维计数完全一致（提升0/下降0）。
> 日志依次为同一/tmp目录的`check.log`、`ratchet.log`、`strict.log`，没有取多数通过或改变超时/排除。
>
> content整包行87.97%、语句85.55%、函数93.86%、分支79.00%；全仓行51271/70420（72.81%）、
> 语句56916/80452（70.75%）、函数10766/14914（72.19%）、分支40669/63149（64.40%）。
> 相比0ba26a84只增加content的12测试身份与覆盖；另六包完整baseline对象序列化后完全相等，所有生产文件与分母不变。
> 远端CI未在这些本地结果中冒充通过；未运行full/Q1/Q2。
>
> ## 后续批次节奏（用户2026-09-22补充）
>
> 用户指出仅12项就跑全套覆盖率成本过高；本次门禁已经收尾，不重复运行。后续以5～8个相关模块或完整业务域
> 作为一批，日常只跑改动文件/相邻定向及必要TC、单点反控；整批冻结后才统一全仓check→ratchet→一次strict-fast。
> 不按用例数硬凑规模、不降低门禁，也不把每个子切片都变成一次全仓统计。
>
<!-- original-source-quote:end -->
