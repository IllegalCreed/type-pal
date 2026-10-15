# QUALITY-PRE94-RETROSPECTIVE-1 — 94前全部治理成果逐卡复审

Status: build
Owner: Codex
Reviewer: Codex（当前源码与证据复核；不冒充第三方）
Phase: engineering first; phase1/phase2按真实路径分别准入
Capability: governance evidence reliability
Visual Verification Timing: 按逐卡风险登记，源码/测试工具本身N/A

## 当前用户要求、范围与准入

用户2026-10-16重申“复审94号之前的所有卡的成果”，本卡当前覆盖全部83张CODE-QUALITY编号小于94的卡，包含字母后缀，不是抽样。77张历史done、1张build、4张review、1张draft仅是原卡状态；本轮重新accept为0。按当前Git tracked路径收集，大小写敏感编号规则排除行政卡CODE-QUALITY-3Y-CLOSEOUT-1；不按编号空缺虚构卡。完整83行清单与卡SHA见[复审队列](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/all-cards.md)。原36卡结构/8卡全文抽查是历史部分证据，不能替代任何整卡成果复验。3y的58差异卡矩阵也不是全部83卡。

唯一工作树/分支codex/code-quality-3y；主树和其它Owner只读，不再新建治理分支。94–102及editor既有返工继续保留；C10未完成检查点bea19f80c已提交推送，当前先推进本卡。工程→模块→功能→文件；先6a的账本/清单四文件，再核92的受保护门证据，继而逐卡回到shared/extract/game等模块。活跃53/57/79/80/81/90只读协调，未核前不抢写其实现。

Codex premise verified / design agree / build allowed：完整读取任务卡、实现、真实caller/出口/类型/生命周期，核注释事实、可复用代码边界、内聚耦合、输入/错误/异步取消/清理/ownership；测试核合法输入、真实oracle、排重、判别力与隔离。只读复核、隔离反控、测试与治理证据允许；发现需修复时先钉有限白名单和反例，低风险工具/测试补证逐批准入。产品机制、schema/save/migration/资产、公共接口或可感知行为变化立即停线专卡，不用本卡泛化授权。

逐卡状态只记pending/partial/rework/accept等实际结论；源码全文读取不等于caller已核，测试全绿不等于合同完备，旧done不等于本轮accept。原账本关闭遇直接counter才精确重开，不批量假验收/假否定。每个有限切片记录实际读取路径和SHA、primary/caller/oracle、问题/未修、定向相邻和反控；完整check/official ratchet/protected fast在稳定模块窗口集中。error/warning/info及运行时诊断未清前不合main，不宣布全仓完成。

## 当前推进

83卡当前全量accept=0；6a、92、CODE1 RLE、CODE2 MKF/RNG已有逐文件证据与有限返工，仍partial、统一门待续。CODE75已有MIDI重复退役局部证据，仍不等于该卡整文件复审结束。其它卡既有抽查/旧卡证据按历史保留，当前未完成项仍pending/partial。每卡范围须由全文读取后人工核定；清单生成只抽取文本和字节SHA，不伪装为语义阅读。

无下一位Agent提示词，Codex单Agent继续全量复审，不把本卡交回GLM。

## 历史：2026-10-15抽查准入原文（已被上方全量范围取代）

Historical status: review
Owner: Codex
Reviewer: Codex（只读抽审；不冒充第三方）
Phase: engineering / phase1 sample
Capability: governance evidence reliability
Visual Verification Timing: N/A（只读代码/证据）

## 用户目标与边界

用户要求大致浏览94卡之前的治理，确认注释、复用、内聚/耦合及测试质量。不能按模型名称推断质量；本卡按当前源码、实际caller、SDLPal与原件核对。36张卡结构盘点不等于全文复验；完整读取名单与部分caller段分别记录。单Agent，主树/GLM树只读。94–102与editor诊断清理原goal继续，不被本卡替换。

## 准入

Codex premise verified / design agree，build allowed仅只读抽审、探针、测试执行及治理记录；不修改产品/schema/save/迁移/资产/公共接口。高风险毒状态域转专卡draft。不能给全部旧卡补accept，也不能把历史文字改成已执行新门。

本轮先抽3o毒键、3u/3w清理测试、2b codec/边界与6a账本门，另核92工程纠错。保留历史原件，直接反证才撤回对应文件结论；其它229旧闭合不批量撤销或重验通过。

## 输出与交接

报告须区分直接支持、确认不足、未知待复验；记录实际读取文件、测试原件与未修问题，机器账本按当前结果。全仓门与editor稳定窗口合跑，本卡只读不会授权集成。无下一位Agent提示词，Codex继续。

## 6a有限测试补证准入（2026-10-16）

已全文读取ledger实现142行/测试123行、inventory实现216行/测试48行，以及原6a卡、根package.json caller。隔离副本仅删除ledger的CLI导入guard，原九例仍全部通过且导入产生真实CLI输出，证明“导入不启动CLI”缺乏测试判别力；实现当前guard正确，不称为产品缺陷。inventory原例标题声称deterministic但只运行一次、未检验--out出口，属测试证据缺口。

Codex build allowed补证白名单仅两份现有测试：ledger.test.mjs新增隔离子进程导入安静合同；inventory.test.mjs在原例核对stdout和临时目录--out字节一致、从无关cwd调用并finally/after清理。两实现只读；不新建公共helper/配置，不改任何游戏行为/覆盖规则。反控在同目录临时副本运行，真实原件SHA保持且finally清除；全量门待稳定窗口，不凭补证关闭文件。

### 6a当前结果

两枚隔离反控旧绿/新精确单例红，恢复11/11、相邻quality-tools38/38；工具实现未修改，仅两测试补证。ledger测试旧关闭撤回review，inventory测试pending→review，0新增关闭。四源职责/输入/caller/oracle/注释/复用与未核范围见[6a证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/6a/README.md)。全仓check/ratchet/protected未重跑，editor诊断未清，6a整卡partial，本轮83卡accept仍0。下一片92工程门原件和源码快照。

6a检查点docs/lint-zero/ledger/diff-check均通过，lint4376文件0/0/0；机器3287/222closed/201review/2864pending。全仓check/ratchet/protected未重跑，editor诊断仍未清，保持build/partial，禁止合main。

## CODE92当前复审

历史protected失败/成功与同commit全仓check原件已核SHA/exit，旧收口实际有门执行；当前30源20相同/10变化，全部继续review。成功raw缺结构化环境，后续保存环境白名单/ref/baseline SHA，不追补原件。工程门实现/依赖与原生定向测试实际读取见[92证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/92/README.md)。0新增关闭、全83卡accept仍0；下一片CODE1 shared RLE，94–102/editor原返工继续保留。

## CODE1 RLE有限复审与测试补证准入

已全文读取rle.ts/主测试/boundaries/runtime-resource及相邻glm-o，核shared公共barrel、game tileset/rle-decode、extract sprite全文件与reforge assets实际caller分段；读取SDLPal原函数和phase2铁律。发现高位literal语义差异已立即停线至QUALITY-RLE-COMMAND-TRUTH-1 draft，算法/格式/资源与公共接口不得实现。

独立的已定测试合同：原CODE1明确宽容入口必须捕获decoder畸形输入并保留其后合法帧。隔离副本把catch改成rethrow，四份原RLE测试54/54仍绿；主测试所谓截断样本连header不完整，实际未进入catch。Codex build allowed仅修packages/shared/src/rle.test.ts这一现有测试的合法容器/坏帧字节和精确oracle，保持测试身份数量；先验证旧反控存活，再新反控精确一红、恢复定向/共享包与相邻。rle.ts与encoder/资源/格式probe边界全部只读；这不是允许实施高位literal修复。其它原卡范围仍pending/partial，0新增关闭。

### CODE1本片结果

只补主RLE测试一例，54身份保持，rethrow反控旧54绿→新53绿1业务红，恢复shared typecheck/131例与game21/extract6/reforge20通过。decoder/主测试/boundary三旧关闭撤回review；高位literal格式真值专卡draft，未改算法或资源。GOP67715成功帧结构trace未见分类分歧，不等同SDL native像素对比。全83卡accept仍0、统一门待续；下一片CODE2 MKF/RNG。

## CODE2 MKF/RNG补证准入（2026-10-16）

全文读mkf.ts、rng.ts、两boundary测试与rng主测试；核共享fixture/barrel、extract MKF重导出及RNG PNG wrapper、game rng-player caller全文件，SDLPal对应MKF/RNG函数。当前没有生产实现缺陷证据。隔离删整数guard，MKF旧11例仍绿；YJ2失败catch错误清空surface，RNG旧16例仍绿。原注释还把已拒绝的offset越界写成未定义，与实现/现有反例矛盾。

Codex premise verified/design agree/build allowed白名单仅两现有测试：mkf.boundaries.test.ts校正注释、在同一索引拒绝例加入NaN/非整数并明确共享视图ownership；rng.boundaries.test.ts把坏YJ2例加强为正常帧→坏帧→后续delta，直接核旧画面保持和最终完整plane。保持例数，不改mkf/rng/YJ2实现、公共API、错误政策或资源。原例标题必要时精确更名，映射落证据，不伪造旧身份相同；官方baseline仅后续真实ratchet生成。先旧反控存活→新精确单例红→恢复定向/相邻与必要typecheck。

同时只读核真实MKF区间与RNG当前解码结果；若运行native源码则记录原函数SHA/给定解压payload的比较边界，不把它冒充YJ2或pal.exe验证。无新产品取舍，不借本片解除RLE格式draft或接管CODE53等活动实现。

### CODE2 B段：已证重复精简准入

A段保持例数的两项补证已通过旧绿/新单例红与恢复绿。全文排重确认rng.test.ts的“delta累加”与rng.boundaries.test.ts“连续帧基面保留”均是literal写前两字节→0x02跳过→写后两字节；后者还精确约束全320×200未触区域。小零面与大MARK面在该调用无尺寸/像素值分支，前者断言是后者合同的弱子集，真实caller面为320×200；其它小面/越界合同仍在，不能因文件短保留重复。

按用户测试少而精规则，Codex build allowed B段只退役rng.test.ts该一例（7→6）并核oracle转移反控；A段两测试保留。仅必要时新增approved-test-retirements.mjs精确7→6/双身份digest/源SHA条目，更新固定表测试23项/净52；matcher、拒绝合同、scope规则及baseline比例不改。原生Vitest list身份与三父快照比对后再登记，baseline只由后续官方ratchet生成。无产品/算法变化，统一门未跑不合main。

### CODE2当前结果

两项补证各有旧绿/新单例AssertionError；精确退役一条重复delta并验证oracle转移。生产MKF/RNG及YJ2字节未改；原始15MKF/2373chunks区间一致，给定相同解压payload的native SDL1464帧逐像素/索引一致。最终33定向、shared130+typecheck、game13/extract17与coverage-tools68通过。三测试旧关闭转review、0新关闭，统一门仍待续；全83卡accept仍0，下一片CODE2b YJ2。
