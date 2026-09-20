# GLM TB-02～TB-10：Codex统一接收复核

2026-09-19；接收main基点41cc7cd9，生产冻结e58834f6389a40ffe9f187e6a8051f552e964d79。
用户本轮重申已批准额度空窗期九批先行实施、恢复后统一检查；本次据此认可排期例外，不再以此前两槽限制追溯判违规。
这只适用于已列九批，不是以后任意扩大范围/跳过审查的授权；TB-00/TB-01另排，不混入本次候选。

**本节为首轮历史；当前以[返工复核](glm-nine-rework-review.md)为准。原七针与五夹具已关闭，勿重复返工。**
首轮结论：九批分别counter，未合并任何新测试/产品，未更新官方基线，不转Kimi终审、不标done。
有效旧/新断言保留；已签设计不重签（TB-02/03设计r2，其余r1）。问题是断言鉴别力、夹具/已签范围、回执与格式，不是认定205项全部无价值或发现九个产品bug。

## 实际执行总账

| 批次 | 接收tip | 定向通过 | 原工具对照+变异 | tc退出码 | 全部新增TS/MJS/MTS/JSON的Biome | 裁决 |
|---|---|---:|---:|---:|---|---|
| TB-02 | a7c48d9c | 24 | 3+8 | 0 | 10文件 / 0错 | counter |
| TB-03 | f4c229ed | 39 | 3+8 | 0 | 11文件 / 1错 | counter |
| TB-04 | 851a6ede | 19 | 3+8 | 0 | 13文件 / 1错 | counter |
| TB-05 | d083e5c6 | 24 | 3+9 | 0 | 11文件 / 1错 / 1警告 | counter |
| TB-06 | 0563eda7 | 18 | 3+8 | 0 | 10文件 / 1错 | counter |
| TB-07 | 90369143 | 17 | 3+7 | 0 | 9文件 / 2错 | counter |
| TB-08 | b1deae49 | 17 | 3+8 | 0 | 11文件 / 5错 | counter |
| TB-09 | 61f0af34 | 25 | 3+8 | 0 | 10文件 / 6错 / 5警告 | counter |
| TB-10 | bd597558 | 22 | 3+9 | 0 | 11文件 / 11错 / 2警告 | counter |

合计66个新测试文件、205/205定向；原九工具27对照+73变异=100跑全部符合自身预期。
**本席还逐一复算73个实际被钉名用例的失败首行，均为AssertionError**，不谎称这73次只是超时。
但原工具通过不是完整验收：独立七针坏实现全部被候选漏掉，九工具判据同源缺口亦被反证。
全部九批包typecheck通过；Biome除TB-02外均失败，合计28 errors/8 warnings/2 infos，候选不得称全仓门已绿。

范围：九候选现有生产/旧测试/官方coverage文件零diff；packages下仍有**新增测试/fixture**，
因此“git diff e58834f6..HEAD -- packages/为空”的原话不成立，应写“排除已列新增测试/fixture后现有生产零改”。
TB-10代码候选fdf91ca9，实际tip bd597558只多交接任务卡27行，产品/测试不变。
测试路径互不重叠；TB-03等诊断命名以本轮用户明确交付的实际路径登记，不静默写回别批报告/公共fixture。

## 公共counter C0：不是错误首行判定

九份mutants工具均使用`/AssertionError|^expect\(/`对**整条failureMessages**匹配。
本席AST抽取实际运行时两段判据（非重写判据），先用纯AssertionError正控证明可执行，
再喂目标错误`Error: decoder rejected input\nCaused by AssertionError: nested detail`，九份都接受。
它们已拒绝STACK_TRACE_ERROR旧反例，但普通Error包含“AssertionError”子串仍可偷过，和回执“目标首行”不符。

修复：把同一个判据函数用于真实运行与自测；核精确且唯一的目标标题已执行、失败消息非空、
每条**首行**符合业务AssertionError（或已约定expect形式），环境/未处理/普通错误不接受。
自测增加普通Error内嵌AssertionError、纯目标超时+别例业务红、未执行和纯业务红，不能只另写不被运行态调用的helper。
本条不改变产品合同，无需设计重签；各分支自己修各自工具，不引入跨未接收分支共享文件。

## 公共counter C1：完整文件面格式与证据

GLM多数Biome回执未包括全部新增JSON/诊断文件；TB-07～10另有测试/脚本本身错误。
按git新增清单一次检查所有TS/TSX/MJS/MTS/JSON，保存命令/退出码/最终SHA，机账/卡面同步。
不能只检查部分文件再写“全部干净”，也不能先跑后又编辑文件而沿用旧结果。
本席只复制回执作为审查资料并机械格式化主线副本，不代表候选分支的错误已修复。

## TB-02

任务卡：[TEST-REFORGE-ASSET-IO-1-read-cache-sfx](../ops/archive/tasks/done/TEST-REFORGE-ASSET-IO-1-read-cache-sfx.md)。候选a7c48d9c；/Users/zhangxu/illegal/type-pal-glm-asset-io。
锚点路径相对该候选，不是主线尚不存在的新测试。

- **R02-1，真实坏JSON漏检**：`fsa-source.cancel-windows.test.ts:121–133`没有把text改成坏JSON，反而断言readText/readJson都成功。单点吞掉JSON解析错误后，候选3/3仍绿，独立坏JSON oracle红（`fsa-invalid-json-swallowed`）。
- **R02-2，物品夹具不合法**：`__tests__/glm-asset-io-fixtures.ts:63–77`的soundItem被正式validateItems拒绝：`items[0].throw.effects: 不得为空`。collector只检查引用能否收集，不是物品结构守卫。补合法throw effect与消费前guard，继续保留非战斗声音集合/页政策隔离。
- C0适用。Biome实际10文件全净，不是回执9；不要求重做有效copy/RIFF/缓存断言。

## TB-03

任务卡：[TEST-EDITOR-IMPORT-CODEC-1-workers-metadata](../ops/archive/tasks/done/TEST-EDITOR-IMPORT-CODEC-1-workers-metadata.md)。候选f4c229ed；/Users/zhangxu/illegal/type-pal-glm-import-codec。
锚点路径相对该候选，不是主线尚不存在的新测试。

- **R03-1，量化实参保真漏检**：`frame-animation-codec.tpfs.test.ts:178/188`传的是input.slice().buffer，却比较外面的input。单点让产品原地改实际frame后候选6/6仍绿，oracle红（`quantize-mutates-actual-input`）。保留同一实际buffer、调用前快照，调用后与改输出后分别检查。
- **R03-2，输出transfer未证**：`frame-animation-worker-client.boundaries.test.ts` FakeWorker.reply直接回data，未执行输出transfer；worker测试只验transfer数组长度，未钉被发送buffer的byteLength变0。按已签r2实现输入/输出真实transfer，并检查实际缓冲，不仅“调用过structuredClone”。
- **R03-3，图片摘要正控被stub掩蔽**：`image-import.stages.test.ts:63/70–71`toBlob给8个零字节、digest固定32个零；摘要只验64位正则。无法证明catalog SHA与真实产物一致。用完整可解码PNG/真实digest、独立摘要和合法catalog字段；不扩为视觉测试，也不碰已隔离PNG失败close缺陷。
- C0/C1适用。覆盖与环境回执中不把host协议测试称为真实PNG/浏览器线程验收。

## TB-04

任务卡：[TEST-PAL-TABLES-COVERAGE-1-self-contained-inputs](../ops/archive/tasks/done/TEST-PAL-TABLES-COVERAGE-1-self-contained-inputs.md)。候选851a6ede；/Users/zhangxu/illegal/type-pal-glm-pal-tables。
锚点路径相对该候选，不是主线尚不存在的新测试。

- **R04-1，SSS输入保真空转**：`io/sss.boundaries.test.ts:51`比较调用前snapshot与**新造fixture**的snapshot，未比较实际wrapped/view。单点污染已经读取的原buf，候选3/3仍绿、oracle红（`sss-mutates-consumed-buffer`）。暴露同一输入及前后保护字节，调用后比较。
- **R04-2，越过已签排除**：`io/msg.boundaries.test.ts:34`新增offset递减→空段的正确绿测，P03已明确此政策未定。删除该新语义承诺或仅在诊断分类，不改产品。
- **R04-3，P07名字轴缺交付**：两个enemy-team用例均传names=undefined；真实caller传names和映射，两不同OBJECT映同enemyId时各自名字未测。该轴可自包含构造，不能一概归“真实资产依赖”。补同输入names+映射的精确_names与补映射后零新增warn；输入解耦/新增业务分栏。
- C0/C1适用；565仅为该内容包，原版位模式和梦蛇例外不重开。

## TB-05

任务卡：[TEST-RESOURCE-TOOLS-COVERAGE-1-rle-events-font](../ops/archive/tasks/done/TEST-RESOURCE-TOOLS-COVERAGE-1-rle-events-font.md)。候选d083e5c6；/Users/zhangxu/illegal/type-pal-glm-resource-tools。
锚点路径相对该候选，不是主线尚不存在的新测试。

- **R05-1，缺label默认0被重新保活**：`events/recompile.boundaries.test.ts:65–66`将dangling goto写0当正确合同。已签R04明确排除无当前consumer/未定缺label政策，撤回此新绿测；保留有真实target的独立字节oracle。
- **R05-2，标题/覆盖账需贴实际断言**：RLE两个标题写126/127/128，实际只构造128；recompile称整条8字节完整却漏若干unused WORD。补所称边界和完整数组，或据既有精确证据如实减少贡献，不将未测标已测。
- C0/C1适用。RLE当前获准legacy profile、u16 giveItem、BDF宽高/bitmap、manifest的path:size合同保留；不用此次返工删产品兼容面或改格式。

## TB-06

任务卡：[TEST-EDITOR-MAP-DATA-1-selection-stamps](../ops/archive/tasks/done/TEST-EDITOR-MAP-DATA-1-selection-stamps.md)。候选0563eda7；/Users/zhangxu/illegal/type-pal-glm-editor-map-data。
锚点路径相对该候选，不是主线尚不存在的新测试。

- **R06-1，权限保真空转**：`map-patch.boundaries.test.ts:116–117/132`快照、传参、最后比较三次创建permission。单点改真实permission.hiddenLayerIds，候选2/2仍绿，oracle红（`patch-mutates-actual-permission`）。必须持有同一权限对象；map/patch也取完整实际输入快照。
- **R06-2，混合目标失败未建立**：`map-transform.boundaries.test.ts`“目标层被删但另一目标仍有效”只有一条映到ghost的visual mapping；没有一有效一无效两目标，无法证部分计划清空。补真实capture/删除层的混合场景、双patch全空与完整issues。map保真只核tiles/collision，补sources/heights/owners等当前字段。
- C0/C1适用。M06已有/内部防御可保留，但需旧测试精确标题；不强增无caller接口或非法collision-only placement。

## TB-07

任务卡：[TEST-EDITOR-SCRIPT-HELPERS-1-authoring-boundaries](../ops/archive/tasks/done/TEST-EDITOR-SCRIPT-HELPERS-1-authoring-boundaries.md)。候选90369143；/Users/zhangxu/illegal/type-pal-glm-script-helpers。
锚点路径相对该候选，不是主线尚不存在的新测试。

- **R07-1，三个实际正控被正式guard拒绝**：`author-command-edit.boundaries.test.ts:19`是未知/退役kind dialogue；S03 makeCanonical().scenes的hooks是数组，报`scenes[0].hooks: 期望对象`；S06 gourdItem缺use.consuming，报期望boolean（还须继续过完整guard，不能只补首个报错）。请从当前合法作者对象构造，不用as unknown洗白。shell从当前投影产生，实际消费前自证。
- **R07-2，排除项反向写绿**：`item-alchemy.boundaries.test.ts:132`测试maxRoll1/rewards空的fallback；`script-reference-catalog.boundaries.test.ts:58`测试authorScripts缺席退旧library。两轴均在设计中明确不扩，撤回新增合同，保留合法扩容/显式空数组不退回的轴。
- **R07-3，S02留本卡补齐**：SaveSceneHookDetails默认项隔离、缺target后session/history不变、最后未引用hook清理三轴确实未交。不是已有证据，不因“会话面大”自动减项；本席裁决并入本卡返工，无需另开小卡/重新三签。
- C0/C1适用；D01全局history、保存缺正文和D06/D07修复归属不扩。

## TB-08

任务卡：[TEST-GAME-MENU-BOUNDARIES-1-navigation-requests](../ops/archive/tasks/done/TEST-GAME-MENU-BOUNDARIES-1-navigation-requests.md)。候选b1deae49；/Users/zhangxu/illegal/type-pal-glm-game-menu。
锚点路径相对该候选，不是主线尚不存在的新测试。

- **R08-1，done相位没有断言**：`equip-menu.boundaries.test.ts:87`仅expect(confirmEquipItem(...))无matcher，紧接着手工把phase改为pick-role。单点让done确认错误写phase=list，候选2/2仍绿、oracle红（`equip-done-phase-is-mutated`）。调用前后比较同一state/完整请求。
- **R08-2，无caller页辅助被保活**：`primitives.boundaries.test.ts:46–55`新测pageDown/pageUp，已签明确排除这些孤立helper。保留当前moveSelection跨页轴，撤回新保活。缺spell/坏role的空表轴也应按已签防御/调用域如实分类，不当正常工程主业务。
- C0/C1适用。不得把一期角色数值ID改成二期身份模型；outdoor过滤差异仍隔离。夹具按当前完整类型构造，不对未使用字段发明产品政策。

## TB-09

任务卡：[TEST-GAME-HOST-BOUNDARIES-1-privacy-timer](../ops/archive/tasks/done/TEST-GAME-HOST-BOUNDARIES-1-privacy-timer.md)。候选61f0af34；/Users/zhangxu/illegal/type-pal-glm-game-host。
锚点路径相对该候选，不是主线尚不存在的新测试。

- **R09-1，method优先级正反不具鉴别力**：`fetch-retry.boundaries.test.ts:30`总返回200；即使把Request(GET)+init(POST)错当GET，也只调用一次。单点忽略Request上的init.method覆盖后，候选4/4仍绿、503+POST oracle红（`request-method-ignores-init-override`）。使用失败/502/503触发的同条件POST/GET对照，核调用次数和最终Response/Error身份；保留AbortError未定政策隔离。
- C0/C1适用。非阻断宿主收口：GA用例未显式设置意外网络fail-fast；当前jsdom默认不自动加载远端资源，本轮未观察真实GA访问，但不要把它宣称真实端点验证；按原工作包补明确隔离和globals恢复。
- timer合法idx与readonly视图合同保持；不补setStep(length)未知轴。

## TB-10

任务卡：[TEST-MIGRATION-BOUNDARIES-1-current-isolated-io](../ops/archive/tasks/done/TEST-MIGRATION-BOUNDARIES-1-current-isolated-io.md)。候选bd597558；/Users/zhangxu/illegal/type-pal-glm-migration。
锚点路径相对该候选，不是主线尚不存在的新测试。

- **R10-1，baseline快照浅别名**：`migration-write-plan.boundaries.test.ts:52–55`只展开Map，value仍与输入共享。单点在返回前污染nextBaseline的JSON值，候选2/2仍绿、深快照oracle红（`writer-mutates-baseline-json`）。对实际Map/Set/嵌套JSON做调用前深快照，别用浅entries冒充。
- **R10-2，E05旧发现接口保活**：`migration-project-io.boundaries.test.ts:62–74`新测content/scripts/index的chunks，已签T01排除。撤回该新合同；scene/map当前发现及TOCTOU继续。
- **R10-3，journal反例不够精确**：`migration-transaction.boundaries.test.ts:91–119`只断言不是recovered，任何别的异常都能过；单操作已经提交后才中断，未留下待提交staging；所谓“全文件保留”只核journal和一个target。用至少两操作的真实中断造pending，再一轴改坏、钉准确业务错误/全部自建文件快照，合法同journal恢复对照必须成功。
- **R10-4，T08归属勘误**：本席实际args().scenes经validateAuthorScenes接受，**不把zone:true误判非法**。当前两root分场景独立链不等于已签同root菱形；补菱形或给等价旧测试精确证据，不能改标题充数。
- C0/C1适用。A08/A09不由journal既有守卫盖章已修；仅自建mkdtemp，不操作真实工程或恢复stash。


## 独立见证与合法性核验

[可重建工具](glm-nine-intake-witnesses.mjs)不改候选；通过Vite加载钩子唯一源点替换，原实现与坏实现都跑候选+独立oracle，前后产品/候选测试hash相同。
七对照全绿；七个坏实现的独立oracle都是业务AssertionError，候选自身都仍绿：
TB-02吞坏JSON、TB-03量化原地污染、TB-04 SSS原buffer污染、TB-06权限污染、TB-08 done状态污染、
TB-09忽略init.method、TB-10baseline JSON污染。这些是**故意注入的反证，不是声称产品当前存在这些bug**。

实际factory经AST读取，不另造一套“看起来一样”的对象：
TB-02 soundItem被validateItems拒；TB-07 body/canonical/gourd三个各被正式guard拒；TB-10场景guard接受。
未来fixture组织变化时由Codex适配捕获边界，不要求为了工具保留错误数据结构。

```bash
node docs/testing/glm-nine-intake-witnesses.mjs
# 仅复算实际判据与fixture：
node docs/testing/glm-nine-intake-witnesses.mjs --census-only
```

工具退出0只表示诊断成功，须读MISSED/fixture/criterion结果，不把退出0当候选通过。
返工期望：七针候选自身detected且无环境红、九个ordinaryErrorWithNestedAssertionAccepted=false，
相应合法factory全部accepted（或正式收窄有据）；C0纯业务正控仍通过。

本席工具初跑因macOS临时目录/var→/private/var导致jsdom找不到外部oracle，未把该次作产品证据；
已用realpath临时根修正，完整七对照/七针重新执行。小段只读查找路径/汇总命令笔误也已更正，不归GLM失败。

## “预存环境失败”裁决

- 本席复现editor world-sprite两例缺projects/pal/assets/migrated/sprites/044.rle与035.rle；
  game dev-panel模块缺data/extracted/data/enemy-teams.json；
  pal-extract四旧套件缺DATA.MKF/M.MSG/SSS.MKF/WORD.DAT。
  对应既有测试/生产源与冻结一致，物理文件确实缺失；认可这些**具体ENOENT**属于当前worktree资源未就绪，不算本批测试逻辑回归。
- migrate在同一候选物理树以project级配置仅排本批8文件：基线49文件/370项（361过、9败），含本批57文件/392项（383过、9败），同一9个断言失败及模块加载失败均缺data/extracted。首次CLI --exclude未作用于嵌套project，两边都跑392，未把该次误当基线；已改project级临时配置后确认上述配对。
  不把失败的全包命令记exit0，不因此宣布完整质量门通过。
- **audit-performance-adoption并行15s超时不能仅凭“隔离绿”判无关**；保留确定性/性能质量问题，合并后的同口径完整check仍必须实跑。
- 未恢复任何stash，未生成/改写PAL/data资产。未为取得绿结果放宽timeout、exclude或降低基线。
- 本轮有硬counter，不重跑九包全量覆盖来堆数字；已静读官方testSelection对照配置，但回执覆盖增量仅作候选自报，不用于官方ratchet或完工证明。

## Mimosa边界（用户最新裁决）

用户已明确：**Mimosa是GLM自己的MCP，Codex不用处理**。本次不接入、不要求补扫，不把它作为接收或合并门。
此前入口排查仅是历史动作；未运行、不宣称安全。九批counter依据C0/C1和各批独立反证，与Mimosa无关。

## 证据与后续

根日志：`/tmp/codex-nine-intake.4NRQ0e/`。最终独立见证summary：`/private/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-nine-review-GrI2Vm/summary.json`。每批targeted JSON、mutants日志、typecheck日志/退出码、biome日志；
editor/game/pal环境探针与migrate环境对照也在此目录。
[机器接收账](glm-nine-intake-evidence.json)记录确切tip、文件清单、逐文件计数、工具结果与裁决；候选原始回执留其独立分支并同步为历史自验资料。
全仓check/官方ratchet/strict-fast未跑：没有通过接收的实施包可合并。官方fast仍7049，不把205个尚未接收用例加进基线。
本次审查文档/工具/证据JSON的完整Biome检查与文档门（20工具测试、链接/任务状态）通过；主线packages/scripts/coverage/projects/data零diff。
不代签、不标done；GLM为测试贡献者，后续接收通过再交Kimi独立终审。

## 下一位Agent提示词：GLM（九卡分别返工，不重签）

```text
在 /Users/zhangxu/illegal/type-pal 返工TB-02～TB-10九批，先同步本次Codex counter到各自独立分支，保持产品冻结e58834f6，设计不重签（02/03 r2，其余r1）。
先读AGENTS/CLAUDE/READ-FIRST、docs/testing/glm-delivery-checklist.md、docs/testing/glm-nine-intake-review.md、其九张卡/各原工作包和机器接收账。卡均rework；先修公共C0真实错误首行判据、C1完整文件Biome/回执，再按各TB章节仅修未闭环项。
保留有效测试，不全量重写；不得新增已明确排除的MSG倒序、缺label默认0、空reward fallback、旧library/chunks发现、无caller pageUp/Down等合同。合法fixture真实guard通过，快照必须持有真正实参。S02三会话轴在TB07原卡补，不另开卡重签。
重跑本席见证应七对照绿/七针候选业务detected、九判据普通Error反例拒绝、合法factory接受；工具若需适配fixture组织先交Codex，不改判据含义。原73针/27对照、定向205（以返工最终树重算，勿凑固定数）、相邻/全包/tc/全部新增文件Biome与私有同口径覆盖要真实记录。
每批独立提交推送，完成一批即可交Codex接收，不把另批未接收成果合入。只动原白名单/本人回执，不改产品、旧测试、官方基线、原审计探针或他席签字；不代签、不标done、不直接转Kimi。具体缺资产ENOENT与超时分开，不能把失败check写绿。
用户已授权本轮九批先行，不再以旧两槽限制判其实施违规；这不放宽验收或泛化以后新批。Mimosa按用户最新裁决归GLM私有MCP，Codex不用处理、不作为接收门；全仓check/ratchet/strict-fast留Codex接收后串行执行。TB00/TB01继续另排，不混本九批。
```

## GLM 返工回执（2026-09-19，九批全部分别推送）

各批独立分支同步 216cf3bb 后按 counter 返工并推送；生产对冻结 e58834f6 零漂移不变、
设计未重签。公共项与逐批残项全部闭环：

| 批次 | 返工分支 tip | 要点 |
|---|---|---|
| TB-02 | d4d79026 | C0 首行判据；fsa 坏 JSON 真实到达解析器；soundItem 过 validateItems |
| TB-03 | 9fe3a07f | quantize 实参保真（同一 buffer）；输出双向真 transfer detach；真实 digest+离线 oracle |
| TB-04 | a87652fd | SSS 同一 view 前后比较；撤 msg 倒序政策；P07 names+映射轴补齐 |
| TB-05 | 4cf2f2e8 | 撤缺 label 默认 0；补 126/127 单段轴与全部未用 WORD 断言 |
| TB-06 | d8b02958 | 同一权限对象保真；混合目标（一有效一无效）整笔失败+相邻正控 |
| TB-07 | 000983c8 + b86f235d | 三 fixture 过正式 guard；撤两排除轴；S02 三轴补齐（hooks-session 3 项）；顶层 body 过 validateAuthorSharedScripts |
| TB-08 | 9cef33cb | done 相位同一 state 完整相等断言；撤 pageUp/Down 保活；防御分类标注 |
| TB-09 | c9edd015 + 1620ab24 | method 优先级同条件失败对照（calls 精确）；GA 意外网络 fail-fast；取值结算保纯 AssertionError |
| TB-10 | 76bafede | baseline 深快照；撤 chunks 发现；两操作 journal 精确错误+全文件保真；同 root 菱形 |

本席见证复跑（`node docs/testing/glm-nine-intake-witnesses.mjs`，最终树）：
**9/9 判据拒绝普通 Error 内嵌 AssertionError、5/5 合法 factory accepted、
7 对照全绿、7 针候选全部 detected（业务 AssertionError 首行）**。
各批原负控（27 对照 + 75 针）复跑 rc=0；定向以最终树重算
（02:24/03:39/04:19/05:24/06:18/07:20/08:16/09:25/10:23 = 208 项，其中 TB-07 含 S02 新增 3 项）；
全包/tc/全部新增文件 Biome/私有覆盖双时点均真实记录于各机账 rework 节。
预存环境失败维持 Codex 裁决分类不变；全仓 check/ratchet/strict-fast 仍留 Codex 接收后。

## 下一位Agent提示词：Codex（九批返工复核接收）

```text
在 /Users/zhangxu/illegal/type-pal 复核接收 GLM 按 docs/testing/glm-nine-intake-review.md counter
完成的九批返工（各批独立分支已推送、生产零漂移、设计未重签）：

  TB-02 codex/glm-reforge-asset-io-r1      d4d79026
  TB-03 codex/glm-editor-import-codec-r1   9fe3a07f
  TB-04 codex/glm-pal-tables-r1            a87652fd
  TB-05 codex/glm-resource-tools-r1        4cf2f2e8
  TB-06 codex/glm-editor-map-data-r1       d8b02958
  TB-07 codex/glm-editor-script-helpers-r1 b86f235d
  TB-08 codex/glm-game-menu-r1             9cef33cb
  TB-09 codex/glm-game-host-r1             1620ab24
  TB-10 codex/glm-migration-r1             76bafede

返工要点与逐批证据见各工作包「GLM返工回执」节与机账 rework 节。复核建议：
1. 复跑 node docs/testing/glm-nine-intake-witnesses.mjs——期望 9/9 判据拒绝普通Error、
   5/5 factory accepted、7 对照绿、7 针候选业务 AssertionError detected；
2. 逐批复跑各自 mutants 脚本与定向测试、抽查 evidence.json rework 数字与最终树一致；
3. 重点核对本轮关键修复：TB-03/04/06/10 的"同一实参前后比较"、TB-05/07/08/10 撤回的
   排除轴（缺 label 默认 0、空 rewards fallback、authorScripts 缺席退 library、msg 倒序、
   pageUp/Down 保活、chunks 发现）、TB-07 S02 三轴（script-editor.hooks-session.test.ts）；
4. 满足后按你的接收流程串行合并，全仓 check/官方 ratchet/strict-fast 与合并后同口径完整
   check（含 audit-performance 并行轴）由你执行；Mimosa 按用户裁决不归你处理、不作门禁；
5. TB-00/TB-01 继续另排。接收完成后按卡走 review→done 签字与 Kimi 终审。
```
