# Codex人物/命令引用补测

2026-09-22，Owner：Codex；基点`0ba26a84`，生产与`57dda7ed`相同。
用户要求覆盖率优先并让Codex继续独立工作。本批为同Owner连续推进的既有合同测试维护，只新增两个content测试文件
和隔离工具，不改产品、公共fixture、schema/存档/资源合同或能力地图；不开新实施签字卡。遵循AGENTS、READ-FIRST及既有Vitest4.1.7/V8、pnpm流程。

## 范围与去重

| 目标 | 现行消费者 | 新增或补强 |
|---|---|---|
| `content/src/actor-reference.ts` | `editor/src/core/actor-dialogue-commands.ts:76`真实rename；validate-refs及editor引用图 | exact actor+expression改名、完整输出/计数、实际输入保真与无命中深拷贝；canonical战斗编排；默认/缺席/非人物肖像路径 |
| `content/src/command-target-reference.ts` | editor `commands.ts:3007`、script-editor复制、project-reference-adapters | 两hook槽语义；visitor每边恰一次/回调结果不串；multi targets；空复制参数拒绝、非引用数据深隔离与unknown输入防御 |

既有`actor-reference.contracts.test.ts`、`command-target-reference.test.ts`/`.contracts.test.ts`已测基础分类，原断言零改。
editor的`actor-dialogue-commands.test.ts`已有跨作者面重命名集成；本包首次直接命中rename不宣称首次拥有重命名测试。
本批差异为精确非目标保持、完整实际输入快照、输出深别名、独立计数及编排域，不重复旧主流程当新业务。

合法命令先过`checkAuthorCommands`；对话另过`assertAuthorDialogueReferences`和真实ActorDef表，改名后再用对应新表验证。
成长delta提供全部必填字段，没有`as unknown`绕守卫。残缺形状的unknown-input防御单列，不声称合法作者内容，
不替作者guard定义新接受政策。快照只复用已读过的既有`deepSnapshot`，公共fixture零改。

两目标不在GLM第二波25模块修改清单。**间接命中与GLM重叠**：author-script-core增加15行/14臂、enemy-script增加6行/2臂。
接收GLM整包时须按集成树并集复算，不把冻结7538的遗漏全算成GLM新增；不改其准备稿或签字。
没有为0%但未发现现行caller的`enemy-team-reference.ts`补续命测试，也未扩测退役命令。

## 同口径覆盖对照

[对照config](codex-reference-coverage.config.mjs)两侧采用官方content全生产范围及fast testSelection；
before只额外排除本批两个新文件，after纳入。709→721项均绿；生产集合/各维分母不变。
报告：`/tmp/type-pal-reference-coverage-B0tFkX/{before,after}`，不占用coverage/fast。

| 范围 | 行 | 函数 | 分支 |
|---|---|---|---|
| actor-reference | 75/93 → **93/93** | 10/14 → **14/14** | 73/113 → **113/113（100%）** |
| command-target-reference | 88/89 → **89/89** | 15/15不变 | 83/94 → **92/94（97.87%）** |
| content整包 | 4510/5185 → **4561/5185** | 771/831 → **780/831** | 3888/5019 → **3965/5019** |

整包净增51行/63语句/9函数/77臂；两直接目标净增19行/49臂，其余来自真实guard/对话解析的间接执行，不能混记。
command-target剩两臂保留在分母：`:119`在exact EntityAddress已保证非空scene后再判空，普通JSON不可达；
`:198`是退役scene-script绑定缺scene防御，归E-05，不为100%复活测试。

```sh
REFERENCE_COVERAGE_PHASE=before REFERENCE_COVERAGE_DIR=/tmp/type-pal-reference-coverage-B0tFkX pnpm exec vitest run --config docs/testing/codex-reference-coverage.config.mjs
REFERENCE_COVERAGE_PHASE=after REFERENCE_COVERAGE_DIR=/tmp/type-pal-reference-coverage-B0tFkX pnpm exec vitest run --config docs/testing/codex-reference-coverage.config.mjs
node docs/testing/codex-reference-mutants.mjs
```

重跑时可将REFERENCE_COVERAGE_DIR换成本人mktemp目录。统计用分子/分母，不混用Vitest截断百分比与官方四舍五入。

## 鉴别力与验证

[负控工具](codex-reference-mutants.mjs)：1个12项全绿对照＋6个单点变异全部钉名自身AssertionError红。
变异分别去掉actor身份比较、直接污染输入portrait、不累计改写数、漏choreography、visitor缓存不清空、copy返回原值。
每针唯一源码点、实际测试数与标题唯一、零skip/todo、产品hash前后不变；判据自测拒普通Error夹带AssertionError、
混合错误、超时与未执行。只在Vite load隔离变异，不改磁盘生产文件。
最终明细：系统临时目录`type-pal-reference-mutants-d1EB6U`，总日志`/tmp/type-pal-reference-coverage-B0tFkX/mutants-gate-final.log`。
最终工具另拒绝suite级错误与未捕获运行时错误；新增文件最终Biome零warning/error。
定向＋相邻27/27、content TC与新增文件Biome通过；最终全包局部覆盖721项绿。

## 失败记录与边界

- 对照config初版未映射官方`--passWithNoTests`而拒绝启动；显式转同义配置后before709绿，未删除选择校验。
- 初版成长fixture漏delta字段，被guard/TC拒绝；已补完整当前类型。content无DOM全局structuredClone声明，改用既有深快照helper，未改tsconfig。
- 初版假设setAmbience空串/learnSkill非字符串必被checkAuthorCommands拒绝，实跑不成立，已撤回。测试只核unknown扫描器不制造引用，不将坏形状登记为合法内容。
  作者guard对这两种叶字段的完整准入待沿保存/导入链另核，归GLM E02/后续审计线索，不在本批改schema/产品。
- UI、原生保存、七套预制资源阻断、E2E/N6b与其它卡不借此关闭。

## 统一质量门

串行完成：`pnpm check` exit0、七包**8041项**，47既有warning/6info（无error）；
`pnpm coverage:ratchet` exit0、fast **7550项/633生产文件**，基线只升不降；
`TYPE_PAL_COVERAGE_BASE_REF=0ba26a84 pnpm coverage:fast`单次exit0，与新基线各维计数完全一致（提升0/下降0）。
日志依次为同一/tmp目录的`check.log`、`ratchet.log`、`strict.log`，没有取多数通过或改变超时/排除。

content整包行87.97%、语句85.55%、函数93.86%、分支79.00%；全仓行51271/70420（72.81%）、
语句56916/80452（70.75%）、函数10766/14914（72.19%）、分支40669/63149（64.40%）。
相比0ba26a84只增加content的12测试身份与覆盖；另六包完整baseline对象序列化后完全相等，所有生产文件与分母不变。
远端CI未在这些本地结果中冒充通过；未运行full/Q1/Q2。

## 后续批次节奏（用户2026-09-22补充）

用户指出仅12项就跑全套覆盖率成本过高；本次门禁已经收尾，不重复运行。后续以5～8个相关模块或完整业务域
作为一批，日常只跑改动文件/相邻定向及必要TC、单点反控；整批冻结后才统一全仓check→ratchet→一次strict-fast。
不按用例数硬凑规模、不降低门禁，也不把每个子切片都变成一次全仓统计。
