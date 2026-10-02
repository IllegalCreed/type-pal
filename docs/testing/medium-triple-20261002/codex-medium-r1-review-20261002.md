# 三中包独立审核 r1（2026-10-02）

结论：Grok/Kimi/Cursor 三卡均 `counter -> rework`；这不是此前400/700卡重开。
只收本轮明确窄项，不要求达到软数量下限，不自动追开下一波。作者自验不等accept/done。
Codex未接产品/旧测试、未合main、未跑official ratchet/protected、未宣称覆盖率增长。

## 固定候选与范围

BASE `f5c7f904a3f623e3ca5b413ab43f78029d99fe11`；冻结main `554b8a0552db30294a9050b4466659c4a14549f8`，content21/SAVE10。
三作者树均干净，实际Git对象/本地与origin相同；只读verify逐树通过12份冻结与白名单。
轮末只读发现main已到 `523cf97d0a33768dbb91b345ddece7fb26b7c7d6`，另队列已集成004时钟/证据与旧meal测试修订，包含root package.json变更。
本批七主源未在该区间变更；本轮门只描述固定冻结候选，不冒称是新main并集门。作者仍按原冻结返工，不擅rebase/改配置；接受后集成须重新对当时main排重与跑正式串行门。

| Owner | 固定完整HEAD | 交付/独立定向与相邻 | 验收 |
|---|---|---|---|
| Grok | `8ab4752727699a821492e26c2bb3111171234f5d` | 新19；并集31/31 | 3个新目标可保留，C3是旧oracle交叉证明 |
| Kimi | `5f34c60f6bd5fbc9deb9f4b06190b2a1f31f428e` | 新32；并集114/114 | 一例含非法entry，反控判据/原raw/执行范围补正 |
| Cursor | `40c88183a2edde38aacd6244288361dae0dba9cb` | 新37；并集56/56 | 非法label、两重复case、零执行旧绿与过滤判据补正 |

Kimi测试提交 `8a2b05e09ee10b90b5fc58f352836100676d7728`，证据提交 `41959a52cd400bedac8044fb3220c42d9cce2cf8` 后只有receipt pin。
Cursor测试提交 `f01765a265006672457800cf4cd4a7d6f4c89626`；最后格式提交 `0845dc7010efc7f10c35184922c58e05068b0d21` 后只有receipt pin。
Grok为单次候选提交，无docs-only尾巴；receipt内不预写自引用SHA不是本轮counter。

## 程序门与环境核验

Codex自有detached副本位于 `/private/tmp/codex-medium-r1-review.UvmjTG/{grok,kimi,cursor}`，不向作者树写。
只复制main现有gitignored只读资产及同锁canvas3.2.3 native build到副本；未生成/修改真实数据。

| 独立门 | Grok | Kimi | Cursor |
|---|---|---|---|
| 定向+相邻 | 31/31 | 114/114 | 56/56 |
| 包typecheck | game零 | Reforge/content零 | Editor零 |
| 根lint完整 | 2787文件0/0/0 | 2783文件0/0/0 | 2799文件0/0/0 |
| diff BASE...HEAD | 零 | 零 | 零 |
| 冻结/白名单verify | 12/12，56路径 | 12/12，24路径 | 12/12，61路径 |
| docs | 仅共享grok导航1项 | 仅共享kimi导航1项 | 仅共享cursor导航1项 |
| 最终串行包test | game2792/2792 | Reforge2257/2257；content1255/1255 | Editor3804/3804 |

第一轮独立并发全测原报告保留：Grok缺raw资产5红（2768绿/7skip），Kimi3条旧meal-shell失败，Cursor4条旧adoption失败；不能把STACK_TRACE_ERROR未经核验说成环境红。
补齐只读资产后串行调用包test且不扩timeout，Grok与Kimi全绿，前一轮结果不覆盖/倒填。
Editor使用原包脚本的`--maxWorkers=1`，第一次直调vitest未用该包参数，最终结果独立登记。
作者原环境报告也保留：Grok缺extracted导致collection失败；Kimi旧资产5红；Cursor旧sprite资产2红。
共享README属于Codex，三个导航不是作者越界修共享文档的授权；正式接入Owner目录时由Codex补一行。
本审核分支只登记固定候选链接与审核导航，不把未接受证据目录提前混入main。

## GROK-R1-01 — C3非新的图标键oracle

四针原三态JSON/stdout/stderr、exit/身份、生产与新测试SHA及重建mutant全部复算通过；C1/C2/C4的新目标/真实非零旧绿可保留。
C3仅选择main的弱旧`dialog-assets.glm-phase1-leaves.test.ts`（2例空图标），不足证明相对强制旧候选的新oracle。
旧候选 `f4665f7ac51b80cae5620e4c08bd62f607881f73` 的 `dialog-icons.grok-r1.test.ts`，blob `fd46f6f329286b4bca83ebebf5b845cb02777d0e`：
G02-D01/D04/D08/D13/D14直接断言icon键0/1及精确像素/遮罩。D07证成功兄弟头像，D14证头像404不清图标。
本轮G4混合降级可以保留组合正例，但针`map.set(i) -> map.set(i + 1)`只破坏已经被旧测试强证的图标键。

独立将这份旧blob及原fixture放入自有副本，旧14+新4（共18）同场，未过滤名称：正18绿；同针旧5红+新1红、12绿；恢复18绿，退出0/1/0且源完全恢复。
这是排重诊断，6红绝不冒作有效主反控。C3保留历史，降existing-proof/cross-check，不计第四新目标。
只需在原三源已有合法剩余合同中替换一个不同新oracle并取完整三态；不用重开原400/40针或补到24例。
19例是软容量不足，不是counter原因；G3完整默认解码的局部停线可接受，范围不扩成大包。

## KIMI-R1-01 — K6非initial entry

`packages/reforge/src/author-stage-organization.kimi-mid-1.test.ts:135-157` 的最后一例，initial为a而b有entry，随后修改第二stage.entry。
公开`checkBaseScriptFlow`，`packages/content/src/author-script-core.ts:1058-1060`只允许onEnter initial state。
独立以该fixture走公开校验，真实拒收：`probe.machine.states.b.entry: 只允许 onEnter initial state`。
仅修此非法子轴：合法初始entry或第二stage nested-body隔离可继续，但必须重新对旧完整oracle排重，不能移动entry后只换名计新。
其它真实compiler/公开resolver/typed控制帧方向不因此全部否定；不修产品格式，不新增兼容。

## KIMI-R1-02 — 单红判据、执行范围与原raw

`counters/mutants.mjs:80-96`先过滤passed/failed，再认executed1；独立原函数反例“同一登记file×fullName的一红 + pending重复叶子”被误收，两条均在exact-name声明范围内。现10拒收自测未含这一叠加反例。
另保留历史不同名pending探针，但它可能是name-filter排除叶子，单凭该探针不作counter；不能将范围外未选中状态误判为必修业务红。
clean和restored只检查退出及部分计数，未同判据核完整状态/身份；正控和每次恢复UNION85，target只执行1（其余pending），三枚same-field实执行67/50，三态原范围不同。
三枚same-field的旧35/18确实非零且全绿、仅新1红；不是Cursor的零执行旧绿，不撤回其业务方向。
四生产original/restored与最终源、重建mutant、repoHashes新旧测试hash均对应；但逐针未落测试三态SHA。
12个raw `.log`只在作者本机gitignored文件中，固定提交只含JSON/summary，receipt“raw log齐备”不成立。

补单一strict judge和真实拒收自测，保留全部原JSON/raw；明确一个非零file×fullName多重声明执行范围，三相相同，未选中叶子不可写passed。
范围外的collection/runtime/raw未处理异常也必须拒收；signal/spawn/零执行/错身份/多红/状态异常拒收。
原始raw提交可追踪字节（如`.raw.txt`），不要改ignore或重新伪造历史；测试hash补录须可验证来源，当前hash不能冒作历史实采。
可复核复用未变证据；fixture/执行集变动只重采受影响针。更新最终展开fullName/数量，9项deferredBudget不追加新量。

## CURSOR-R1-01/02 — 非法空label与重复标题

`script-flow-preview.cursor-mid-1.test.ts:22`的共享machine为`idle.label=''`；C1-03/C1-06也复用此非法fixture。
公开`author-script-core.ts:1056`必须nonEmptyString；独立真实拒收`probe.machine.states.idle.label: 期望非空字符串`。
C1-07空串轴不能由“typed字段可写”证明合法；撤回/登记不可合法构造，修共享合法fixture，非空label旧测已证不另计新。

C1-04（:52-55）的步骤2精确标题、C1-05（:58-61）的步骤N·用途+稳定id已在旧`script-flow-preview.test.ts:14-22/:53-63`完整断言。
旧blob `ca6f991b39c9c717a1eddafd94d5bd09605a6fc9`；增加notContains或换序号/文本不算新。
撤两case净新，删本卡重复或标cross-check；37是实际执行，不是已接受净新。其它合法精确segments/nodes/notes不一概退回。

## CURSOR-R1-03/04 — 零执行旧绿、过滤报告与合同账

CTR-C1-01/C4-01/C6-01的`oldOnMutated.executed`均0：`runVitest`把新case的同一grep用于旧文件。
三份原old-on-mutated报告旧3/12/12全skip，退出0只表示没运行，README与索引“3旧绿新红”撤回；至少两枚须真实非零新旧同场。
六针生产SHA/重建patch与指定单AssertionError在现最终代码对应，但没有最终测试三态SHA记录，暂不完整accept。

`counter.mjs:175-208`的focusJson删skip及零断言suite、改pending/todo/count/success；stored JSON是derived而非原report，完整原JSON仍在raw里，不称raw完全丢失。
独立用原focusJson+judgeMutant复合判定，“指定AssertionError + 另一文件SyntaxError空collection suite”被误收。
必须保存原JSON并明确derived scope，任何collection/runtime错误不因空断言被过滤，runner/拒收selftest共享唯一判据；恢复也用相同声明非零身份/状态。
补最终产品和测试三态hash，因最终文件/范围变动重采受影响针；不把过滤scope之外的skip变passed，不把重复旧合同当新目标。

contracts.json只有8组概述（oldBlobMatchers为泛述），不足最终逐合同source/caller/合法输入/旧blob+展开fullName+全部matcher/精确expected。
展开最终实际合同，执行/净新/旧证明/不可构造/阻塞分列，排掉已确证重复；不要求凑回37或扩到旧700卡。

## 接续与可复算证据

[机器审核证据](codex-medium-r1-review-20261002.json)登记本轮门与逐针复算/拒收反例。
自有临时父目录保留完整首次/最终JSON与raw、公开输入probe及旧新排重诊断；仅清理三个detached checkout，不删除这些证据。
审查记录轻门：白名单拒收自测11/11；根lint2761文件完整0/0/0；docs822 Markdown/4335链接/259任务零问题；diff零。产品/旧测树无改动。
三个任务卡各含一次完整窄返工提示词。贡献者只写原白名单；Codex下一轮固定最终SHA检查这些项，未变已闭合项不再重开。
未全accept前不进入全仓check→official ratchet→protected strict-fast/main/done/退休作者树清理。
Vitest技能用于实际执行身份/报告与真实业务oracle核验；pnpm技能用于按原工作区包脚本串行复核，没有改测试配置或超时。
