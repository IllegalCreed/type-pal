# GLM后续七批统一细化与审核（TB-04～TB-10）

2026-09-19，r1；策划树 `4473c367`，生产冻结 `e58834f6389a40ffe9f187e6a8051f552e964d79`。
用户要求把后续工作一次细化、审核好，便于GLM连续领取。十批队列中前三批已签，剩余实际为**七批**，不是六批；两组资源解析主题/夹具独立，没有为凑数合并的技术理由。

**本页为设计阶段证据。** 七卡设计三签已齐（GLM de698205、Kimi 986e58ab及Codex原签）；用户批准先行实施后，当前[九批接收](glm-nine-intake-review.md)已分别counter，卡均rework，不重签设计。
59个目标模块是白名单候选上限，不等于59个文件都必须新加测试；既有/无caller/防御/待裁决允许剔除。
三席齐后Codex统一核准，不在缺签时开始实现。TB-01～03既有r2签字/准入、TB-00残余返工不重开。

## 一次审核，逐批接收

| 批次 | 任务卡 | 族账/白名单 | 目标模块 | 当前状态 |
|---|---|---|---:|---|
| TB-04 | [原版表格与文本自包含补测](../ops/tasks/TEST-PAL-TABLES-COVERAGE-1-self-contained-inputs.md) | [工作包](glm-pal-tables.md) | 9 | 三席设计已齐；实施接收counter |
| TB-05 | [RLE、事件与资源工具补测](../ops/tasks/TEST-RESOURCE-TOOLS-COVERAGE-1-rle-events-font.md) | [工作包](glm-resource-tools.md) | 9 | 三席设计已齐；实施接收counter |
| TB-06 | [地图选区与组合模板数据补测](../ops/tasks/TEST-EDITOR-MAP-DATA-1-selection-stamps.md) | [工作包](glm-editor-map-data.md) | 8 | 三席设计已齐；实施接收counter |
| TB-07 | [脚本与内容编辑辅助补测](../ops/tasks/TEST-EDITOR-SCRIPT-HELPERS-1-authoring-boundaries.md) | [工作包](glm-editor-script-helpers.md) | 7 | 三席设计已齐；实施接收counter |
| TB-08 | [第一阶段菜单导航与请求补测](../ops/tasks/TEST-GAME-MENU-BOUNDARIES-1-navigation-requests.md) | [工作包](glm-game-menu-boundaries.md) | 9 | 三席设计已齐；实施接收counter |
| TB-09 | [第一阶段宿主、隐私与计时补测](../ops/tasks/TEST-GAME-HOST-BOUNDARIES-1-privacy-timer.md) | [工作包](glm-game-host-boundaries.md) | 8 | 三席设计已齐；实施接收counter |
| TB-10 | [当前迁移辅助与隔离文件系统补测](../ops/tasks/TEST-MIGRATION-BOUNDARIES-1-current-isolated-io.md) | [工作包](glm-migration-boundaries.md) | 9 | 三席设计已齐；实施接收counter |

GLM完成旧counter优先；实施成果最多两批尚未接收，设计审核不限此两槽。获准后的领取授权由Codex写回卡面，不要求用户逐文件反复签字。
一批counter不影响其它已明确合同；各批独立分支/worktree、独立薄fixture/输出目录，从最新已接收main起步，禁止把未接收分支互相合入。
Coding Owner仍为每卡唯一GLM；Codex继续产品修复/集成/视觉验证，Kimi独立审查。本长队列不新增R4薄E2E门槛。

## 本轮真实收窄（不是新增产品缺陷总数）

| 原候选表述或风险 | 本轮证据与裁决 |
|---|---|
| signed giveItem可能被理解成提取就转-1 | disasm.ts:190–196保u16；SDL script.c:970–975执行才转SHORT。只钉原始位模式 |
| BDF位/offset保真 | bdf-to-json.ts:30–34只取宽高，模型无offset。不立未实现合同 |
| RLE都保帧槽、递归annotate可批量测 | 宽容parseSpriteChunk压缩数组，严格入口单列；annotate唯一CLI输入是flat。无caller别名/skipFilePrefix:true/递归choice不续测 |
| 清单内容hash | asset-manifest.ts:29–40实际path:size；engineering-notes旧文字已更正为现状，不授权修改缓存键或容错 |
| collision-only组合 | D29与placement-mutation:80–82要求至少一视觉槽；普通cells collision-only和合法视觉组空grid才可测 |
| 所有CRUD/回退都是目标 | stamp旧移动helper、五个script CRUD导出无当前caller；catalog三个UI调用都传authorScripts；空reward被content守卫挡住 |
| 一期菜单“数量过滤” | SDL itemmenu:287–306/340–375是保留列表、确认门；非顺序party必须返回roleId而非cursor |
| 一期outdoor技能列表与参考一致 | 当前magic-menu:135过滤，SDL magicmenu:354–367保留disabled；旧test:456钉过滤。此轴待查历史裁决，排除新增正确绿测，不直接改产品 |
| timer setStep(length)“完成” | 注释与实现不一致；tools-panel:758–768只产生0..length−1。极值列待证，无当前UI触达 |
| GA导航/取消重试 | install-analytics:38–49未订阅page；fetch AbortError政策未定。可选API/现状不扩大成产品承诺 |
| journal守卫代表迁移全链安全 | A08 snapshot→journal窗口、A09先行物化symlink仍为独立修复项；只测已有守卫，不能宣称问题已修。E05历史输入/producer不新增保活测试 |

待证项目归属：菜单差异、timer极值、fetch取消和GA初始化异常由Codex后续核定产品合同；无caller接口归现行调用面清理审查，不批准删除；
A08/A09/E05归现有迁移/版本纪律台账；map/脚本防御臂归本包分类。GLM不得自行改未知政策或为覆盖率造非法正控。

## 共同实施合同（七包均适用）

1. 逐族记录唯一ID、当前caller/上游guard、旧测试精确标题、完整输入/输出与新增价值。分类互斥为新增边界、输入解耦、已有证据、防御或无caller、待裁决；不要把coverage空臂数等同业务缺口。
2. 正控先过真实当前守卫/构造器/正式parser。二进制oracle手列独立字节/字段，不以同一被测解码器回算预期；无JSON守卫如实说明typed构造合同。
3. 反例仅坏目标一轴，合法同条件对照；真实入参调用前深快照、消费后比较同一对象。API本来原地改state不能强求不变；Readonly类型也不代表deep clone。
4. 宿主替身只替平台边界，实际产品函数必须执行。异步用entered/deferred/事件见证；禁止固定sleep代替完成。GLM不做浏览器、截图、视觉或听感验证。
5. 所有FS只在本例mkdtemp根；所有GA/fetch只用假网络，意外外网请求失败。禁止真实extract/migrate/bake、PAL/data/baseline写入、真实用户存储或主树分支检出。
6. 每包代表性负控数量/族在工作包；若去重后有真实增量的族少于建议针数，先报Codex按证据收窄，不为数字重复造例；对照先绿，单点隔离变异、实际新增精确标题执行且由**业务AssertionError**检出。语法/类型错、TypeError、超时、STACK_TRACE_ERROR、未执行、独立oracle红但候选不红都不算。
7. 负控工具判据自测必须包括混合业务/宿主错误不能偷过、目标标题未运行不能偷过；保存JSON运行态证据。变异次数唯一，生产hash前后不变；临时副本/加载钩子不得改主树。
8. 只新增白名单文件，不改旧测试、公共fixture、产品、全局配置/超时/排除、正式coverage报告或baseline。需要新增导出/重构才能测时先counter，不擅改。
9. GLM完成定向/相邻/涉及包全测、包typecheck、新增文件Biome与独立负控；私有覆盖用官方testSelection在/tmp作同树有/无新测试对照，局部与全包分栏，资产排除/分母一致。不能累计各包百分比或拿覆盖增量替业务断言。
10. Codex独立接收→最新主线适配→串行全仓check/官方ratchet/受保护strict-fast→Kimi独立终审；GLM贡献显式披露，不算第三方独立证明，状态/done由Codex核定。

## Codex本轮验证回执

只读源码/调用域/参考源与已有测试。内部并行分别负责提取、编辑器和一期调用域census，Codex核关键primary矛盾与迁移链；
内部协作者不是Kimi/GLM账号，不写其席位。未新增正式测试、未执行候选负控、未提升覆盖、未跑官方覆盖门。

| cwd | 实际命令 | 结果 |
|---|---|---|
| packages/migrate | pnpm exec vitest run src/migration-project-io.test.ts src/migration-transaction.test.ts src/migration-write-plan.test.ts src/project-map-converter.test.ts src/pal-authored-overlays.test.ts src/pal-item-scheme-labels.test.ts src/pal-store-boundary.test.ts src/translate-events.test.ts --reporter=dot | exit0，8文件/135项 |
| packages/editor | pnpm exec vitest run src/core/map-selection.test.ts src/core/map-transform.test.ts src/core/map-patch.test.ts src/core/stamp-draft.test.ts src/core/stamp-placement.test.ts src/core/stamp-placement-mutation.test.ts src/core/stamp-group-transform.test.ts src/core/stamp-template.test.ts src/core/author-command-edit.test.ts src/core/script-editor.test.ts src/core/script-editor-projection.test.ts src/core/script-reference-catalog.test.ts src/core/item-authoring.test.ts src/core/item-alchemy.test.ts src/ui/enemy-defeated-events.test.ts --reporter=dot | exit0，15文件/156项 |
| packages/game | pnpm exec vitest run src/core/menu src/shell/fetch-retry.test.ts src/shell/input.test.ts src/shell/audio-volume.test.ts src/analytics/analytics-consent.test.ts src/analytics/google-analytics.test.ts src/tools/speedrun/timer.test.ts src/tools/speedrun/detectors.test.ts src/tools/speedrun/time-format.test.ts --reporter=dot | exit0，25文件/303项（含相邻driver/magic-script，不把它们扩为本包实施范围） |
| packages/pal-extract | pnpm exec vitest run src/io/sss.test.ts src/io/word.test.ts src/io/msg.test.ts src/resources/tables.test.ts src/resources/parsers/__tests__/data-misc.test.ts src/events/disasm.test.ts src/events/recompile.test.ts src/events/annotate.test.ts src/events/slice.test.ts src/resources/palette.test.ts src/font/__tests__/bdf-to-json.test.ts src/__tests__/asset-manifest.test.ts --reporter=dot | exit0，12文件/164项；**其中DATA chunk9/10两旧用例输出缺原盘并提前return，不能计作真实资源验证** |
| packages/shared | pnpm exec vitest run src/rle.test.ts src/rle-encode.test.ts --reporter=dot | exit0，2文件/26项 |

合计Vitest报告62文件/784项；不能据此说784项都验证了本轮候选。两条early-return限制如上，正式新测试不得复制这种伪绿模式。
现存官方fast仍为7049，详见长队列冻结快照，本次未改基线；不把本轮重跑项加到7049。
本轮中几次只读查找路径猜错/输出截断已用rg定位和所需源码分段读取补齐，不属于产品测试失败，不影响上述实际退出码。

规划一致性检查：59目标路径全部存在且互不重复、相对生产冻结零diff；59拟增测试与8薄fixture路径均未占用且不重复。
`pnpm check:docs`（含20项文档工具测试）通过；`node docs/testing/glm-coverage-queue-census.mjs --check`通过，仍617文件/10批78候选；`git diff --check`通过。
首次暂存后`git diff --cached --check`检出六张新卡EOF多一空行，已去除后复跑；没有改动合同或测试。
末轮只读勘误已核入：编辑路径的叶/父错误分域、projection只在承诺clone处验别名、奖励guard边界、一期system helper的phase归属、负时间格式分域、entry.prepare仅onEnter初始态。正式两席仍须独立审核，不以本轮内部勘误代签。

## 两席并行提示词

同一r1/同一生产冻结，每卡独立签。用户只转发，不搬运审查正文；审查者直接落本人席位并提交推送。

### Kimi

```text
在 /Users/zhangxu/illegal/type-pal 一次审核 TB-04～TB-10 七批补测设计r1，生产冻结 e58834f6389a40ffe9f187e6a8051f552e964d79，统一入口 docs/testing/glm-coverage-remaining-review.md。先同步main、检查工作树，读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、统一入口的七张卡/七份工作包；一期范围另读engineering-notes及相关一手参考。
你的席位是Kimi。独立读primary source并做前提/风险压力测试，重点看原版/当前合同差异、实际调用域、合法fixture、保护层级、未定政策与旧接口保活。不读取或复述另一席审查结论；Codex内部协作证据不代替你的独立读取。
七卡为：TEST-PAL-TABLES-COVERAGE-1、TEST-RESOURCE-TOOLS-COVERAGE-1、TEST-EDITOR-MAP-DATA-1、TEST-EDITOR-SCRIPT-HELPERS-1、TEST-GAME-MENU-BOUNDARIES-1、TEST-GAME-HOST-BOUNDARIES-1、TEST-MIGRATION-BOUNDARIES-1。分别在本人build前席位与本人交接日志签带直接file:line及可证伪观察的premise verified/design agree，或counter列明确返工；一张有问题只阻塞该卡，不笼统批量accept。
重点保持：giveItem提取保u16；RLE宽容/严格分域；BDF无offset输出；manifest是path:size键；地图placement至少一视觉槽；无caller导出/非法reward臂不补；一期法术过滤差异、setStep(length)、AbortError政策隔离；迁移A08/A09/E05不被测试保活或误关。GLM不做视觉/听感，迁移/清单FS只能自建临时根，绝不执行真实extract/migrate/bake或改PAL工程。
只改本人签字/日志并提交推送，提交前同步保留他席，push竞态自行rebase/retry；不得改产品、正式测试、他席、状态、官方基线，不标build/done。当前仅设计审核，三席齐后由Codex核准；获准后按队列滚动、TB00返工优先、最多两批未接收实施成果。全仓check/官方ratchet/strict-fast留Codex。这七批不新增薄E2E前置门。
```

### GLM

```text
在 /Users/zhangxu/illegal/type-pal 一次审核 TB-04～TB-10 七批补测设计r1，生产冻结 e58834f6389a40ffe9f187e6a8051f552e964d79，统一入口 docs/testing/glm-coverage-remaining-review.md。先同步main、检查工作树，读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、统一入口的七张卡/七份工作包；一期范围另读engineering-notes及相关一手参考。
你的席位是GLM。独立核当前caller、旧测试精确去重、合法fixture可构造、白名单互不冲突、负控能以业务结果检出；逐批评估可实施性，不靠候选数许诺新增数量。不读取或复述另一席审查结论；Codex内部协作证据不代替你的独立读取。
七卡为：TEST-PAL-TABLES-COVERAGE-1、TEST-RESOURCE-TOOLS-COVERAGE-1、TEST-EDITOR-MAP-DATA-1、TEST-EDITOR-SCRIPT-HELPERS-1、TEST-GAME-MENU-BOUNDARIES-1、TEST-GAME-HOST-BOUNDARIES-1、TEST-MIGRATION-BOUNDARIES-1。分别在本人build前席位与本人交接日志签带直接file:line及可证伪观察的premise verified/design agree，或counter列明确返工；一张有问题只阻塞该卡，不笼统批量accept。
重点保持：giveItem提取保u16；RLE宽容/严格分域；BDF无offset输出；manifest是path:size键；地图placement至少一视觉槽；无caller导出/非法reward臂不补；一期法术过滤差异、setStep(length)、AbortError政策隔离；迁移A08/A09/E05不被测试保活或误关。GLM不做视觉/听感，迁移/清单FS只能自建临时根，绝不执行真实extract/migrate/bake或改PAL工程。
只改本人签字/日志并提交推送，提交前同步保留他席，push竞态自行rebase/retry；不得改产品、正式测试、他席、状态、官方基线，不标build/done。当前仅设计审核，三席齐后由Codex核准；获准后按队列滚动、TB00返工优先、最多两批未接收实施成果。全仓check/官方ratchet/strict-fast留Codex。这七批不新增薄E2E前置门。
```

## 当前下一步

设计审查已经完成；现在按统一接收报告逐卡返工，设计不重签。以下两席设计提示词是历史交接，不要再次索要同轮签字；没有通过接收的测试可标done。
