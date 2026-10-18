# RLE首批独立校准与执行准入

Status: review
Owner: Codex
Date: 2026-10-18

归[父卡](../../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)和[既有RLE证据](../README.md)。本包是首批交付口径校准，不是模型能力考试，也不是每批新增的只读前置门。GLM随后直接执行获准整改，Codex独立验收；未经裁定的格式行为继续冻结。

## 身份与总裁定

治理分支`codex/code-quality-3y`，本次读取基点`170edee4444fc87731308ec179d93fad93882704`，origin/main为`28fd9013e09e8792decbff2fa117aae14c36b196`。GLM报告基点`0bc82025928b4fe13dce0f34c3a8696507d04032`之后仅文档变化，三个RLE源文件及相邻两测试未变。主树/其它Owner树只读，无新治理分支。

GLM发现账本漂移成立；归因和“八维无问题”完整性需返工。高位literal的既有选定探针表现为显式拒绝，不能外推所有格式分歧都必然fail-loud或绝无静默像素偏差；一般域仍未知。W-1两行由Codex修复；W-2/W-3扩为下述三文件文案候选，GLM可以开始。产品实现、fixture、断言、资源、格式、接口均未改；三受审文件保持review，0新增关闭，83卡仍55partial/28pending/0accept。历史partial不自动取得八维信用。

## P-1独立追溯

| 锚点 | 实际事实 |
|---|---|
| c727bc81e | 三个RLE旧关闭撤回review，含证据指针。 |
| 9cf1fd09f及父22eead43a | 另一支线的首张表中，三RLE行已经是旧关闭；9cf本次没有把其父表内review改为closed。没有正文不足以推断意图。 |
| 89bf84e16，治理线第一父8861b2994 | 合并文档支线后，第一张活动表取回旧关闭；原review表留在后面的历史区。这里是本治理线实际状态丢失点。 |
| 7b8365195 | 仅重新打开boundaries，前两行持续误列closed。 |
| 本次W-1 | 只恢复rle.ts/rle.test.ts为review并链接本包；3319 tracked /249 closed /105 review /2965 pending。 |

[完整逐行差异](ledger-drift.json)比较合并第一父的活动表与合并后活动表，不靠grep命中或提交标题判定。243条旧review失去该状态：26条转closed、217条不再进入活动表。在本次修复前，当前其中76条closed、130条未登记、36条review、1条rework；两行修复后另74条closed候选仍待核后继证据。它们不是本批新发现的产品缺陷，不能直接批量改状态；当前closed也不能冒充本轮重新验收。

Codex负责下一片账本沿革：先核16条仍逐字保留合并旧关闭行的其它候选，再核其余后继变更/补登和未登记路径。保留当前明确review/rework和全部历史原件，不清掉counter，不把pending强行关闭。GLM的RLE文案整改可独立开展，无需等待这项记录追溯完成。

## 实际读取与依据

Codex本次全文：`rle.ts`、`rle.test.ts`、`rle.boundaries.test.ts`、`rle.glm-o.test.ts`、`rle.glm-runtime-resource.test.ts`、`rle-encode.ts`、shared的`index.ts/package.json`、game的`assets/rle-decode.ts`及`assets/tileset-blob.ts`、extract的`resources/sprite.ts`。当前行数与SHA见[manifest](manifest.json)，不改写原包历史行数。

Reforge只读`assets.ts`中tileset、world/battle-sprite与effect实际解码入口段，不能据此关闭整文件；引用其origin→profile选择、hash/bytes/gzip校验和解码后ownership。公共barrel仍转出共享实现，game/extract按过滤后序列赋索引，WorldSprite别名仍有真实caller。SDLPal本次核读`PAL_SpriteGetFrame`及绘制函数判定段；高位literal原生反例、encoder跨行透明段及限定原盘cohort沿[既有真值卡](../../../../tasks/QUALITY-RLE-COMMAND-TRUTH-1.md)证据复用，未重跑native/raw census，不把当前51绿当作SDL一般格式证明。

## 八维逐文件校准

| 维度 | rle.ts | rle.test.ts | rle.boundaries.test.ts |
|---|---|---|---|
| A 正确性/边界 | generic源边界失败、strict帧间上界、legacy连续有效前缀/坏尾后可解帧拒绝有直接代码依据；高位literal差异仍冻结，不宣称无格式风险。同步纯函数无取消/异步释放需求；输出plane由函数创建。 | 全26例核输入和oracle；catch例确有完整坏帧头并在后面保留合法帧，独立完整结果约束；非法profile为刻意运行时防御输入，不当作正常生产路径。未新增直接行为counter。 | 七例核pad、offset、零命令、越界/尺寸/相邻帧头及legacy报告；字节与断言支持当前TS合同，2×3样本不冒充SDL一般格式真值。 |
| B 注释 | 前缀记法错误；“decodeRle死循环”已过时；parseSpriteChunk说明实际挂在decodeStrictSpriteFrame之前；“原版从不索引尾帧”缺证据；需明确过滤后索引，不许冒称原slot保持。GLM三项清单不完整。 | 空帧测试标题“数组下标=tile索引”必须限定为过滤后序列；不能理解为原始槽号不变。手列帧注释与catch例本体相符；无新增覆盖承诺。 | “1长度”实为2；“帧头越界”实际尺寸非法；FFFF实为0FFF；首例“无sentinel报告”未调report入口；头部“不重复”不能代替跨文件排重。均须精确修订。 |
| C 内聚/耦合 | 无IO/隐式全局/跨层状态写入，入口按容错与索引合同分工；legacy函数分支密集是维护热点，先明确不变量再决定提取，不按行数拆文件。 | 按四公开入口组织；fixture局部构造，无全局mock、资源或状态推进；不为压缩字节样本引入跨包fixture。 | 两个局部fixture helper只组装格式/偶对齐，业务断言保留在各例；sentinel是明确容器轴，当前无万能业务上下文。 |
| D 复用 | shared已统一两端；generic与strict的边界/零命令/失败策略不同，不能机械合并循环。真实别名使用未退役，不删接口。 | 手列字节是独立输入与oracle；不改用生产encoder替代所有输入，避免同源自洽。跨文件相似轴进入O-4核合同。 | frameBytes/strictChunk用于本文件合法容器搭建，可保留；与glm-o编码fixture目的不同，不为少几行合成万能helper。 |
| E 测试质量 | 既有catch业务反控与本次原生51身份支持限定合同；不为每个充分覆盖分支再制造反控；格式真值不由单元测试绿灯批准。 | 直接pixels/opaque和错误消息约束有效；部分容器例只断长度/尺寸，不能孤立声称完整像素oracle，其余强例提供相邻轴。O-4待合同映射，不立即删测。 | 完整pixels/opaque、拒绝原因、报告字段有判别力；多个边界放同例不冒充多个身份，当前仅改说明，断言精简/拆例另准入。 |
| F 可读性 | source/target及入口命名表达作用；超长legacy控制流列结构候选，docblock错位必须修；不靠增加历史噪音掩盖代码。 | describe按入口、局部字节注释便于追踪；过滤后序列名称需澄清，保留显式字节避免过度抽象。 | helper和正反相邻关系清楚，但标题错误直接误导阅读，需要与真实轴一致；不扩大命名承诺。 |
| G 无多余部分 | strict的frameCount<=0臂不可达：count>0，count=1时slot0=count不可能同时为0 sentinel；offsets[0]!==tableBytes也不可达：同一u16同时为count和slot0。登记结构候选，未删除。GLM未登记此项。 | 不按测试数量删；公共非法输入守卫与别名仍有合同；无已证可立即删除的用例，排重未知留待核。 | 每个helper在用；末尾pad及sentinel额外payload合法但不是新增断言合同。未以短小或包绿关闭，重复候选留O-4。 |
| H 可测试性 | 纯字节输入/新建输出，确定性、无时钟/RNG/IO，公开入口可直接测。无需为测试注入依赖或暴露私有helper。 | 直接调用公开入口、每例局部buffer，无共享mock状态，执行不依赖原盘。当前设计可直接构造反例。 | helper独立新buffer，不依赖环境或跨例污染，错误与正控可直接观察；不为测试引入新公共API。 |

本次未执行复杂度工具，未宣称某函数超过已测数值阈值；legacy的控制流热点来自全文阅读。指标初筛是线索，非本次文案验收门。上述校准不授予三个文件整体accept，B待改、G及格式/输入域候选留review。

## 观察项与去向

| 项 | 分类/去向/解除条件 |
|---|---|
| O-1 尺寸分配 | 未知支持域/资源风险，归真值卡输入域候选。最大u16宽高使每个plane理论4,294,836,225字节，两个共8,589,672,450；宿主可能先拒绝。禁止实际巨量分配，不凭畸形头宣布生产漏洞；先核作者/原盘caller与上限，再定修复层。 |
| O-2 过短容器 | 当前RangeError为直接观察到的读取语义，非已证产品bug；归父卡错误合同候选，含整个offset表截断。先核caller合法输入和失败传播；若要行为改变，独立反例/准入，不仅为统一错误文案改实现。 |
| O-3 0x18444特例 | 已证SDL源差异，已补真值卡。SDL乘2后把0x18444转WORD为0x8444，TS未实现；真实资源触达、phase1适配层/canonical层未定，无产品build。 |
| O-4 排重 | 归父卡测试合同映射候选。主测试/strict报告/encoder组装相邻测试的sentinel和坏尾有重叠，但入口、oracle、错误合同未必相同。必须逐例映射必要断言再决定退役；本次不删。 |
| G-1 strict两臂 | 可改善结构，不是用户可感知缺陷；条件推导见G维。后续有限纯重构候选，先核slot0=count不变量和相邻报告合同，不混入文案批。 |
| R-1/R-2 | 转交摘要没有定义这两个标识，不能猜造含义或关闭。实际高位literal风险继续归真值卡，结构/测试问题按上表登记；GLM下一交付补全标识映射即可，不阻塞已明确文案整改。 |

## GLM可立即执行的有限批次

Codex premise verified / design agree / build allowed，仅限文案候选；Coding Owner=GLM，集成/账本Owner=Codex。

1. 从此回执提交并推送后的`origin/codex/code-quality-3y`锁定完整SHA，新建**一个临时detached worktree**；不得继续用0bc旧候选或其它遗留副本，不创建/推送新的长期分支。主树和集成工作树只读。临时worktree可用`git worktree add --detach <自有临时目录> <已核完整SHA>`，目录冲突即停，不清理其它Owner内容。
2. 白名单仅`packages/shared/src/rle.ts`、`rle.test.ts`、`rle.boundaries.test.ts`。修正B维所列错误/过时注释、docblock位置和错误测试标题，引用当前TS与SDL差异边界；不扩写无证据原版结论。W-2/W-3原两文件提案据本次补核扩入主测试误导标题。**不改实现、参数、出口、fixture字节、断言、测试增删、G-1防御或格式算法**；不得静音/放宽规则。
3. 标题可按真实轴更正，因此fullName会变；交付旧→新51身份的一一映射，26+7+9+9数量不变，未改标题的身份原样保留。用TypeScript AST或去注释后的可执行代码对照，证明三个文件实现/每例body不变；不能同时声称“修正标题”与“身份字节不动”。记录具体比较方法与限制，不拿文本diff代替测试body比较。
4. 在副本完成文案整改和定向4文件复验，保存完整raw、原生JSON、cwd/命令/时间/exit/诊断计数及输入SHA。受影响静态检查按实际差异执行；本纯文案批不重复全仓check、official coverage ratchet或protected fast。若发现必须改变实现/断言才可解决的问题，登记并停止该项，继续其余已准入文案。
5. 向用户交付patch与证据路径，补B/G和未定义标识映射；不写共享任务卡/账本/验收结论，不自行合main或标文件accept。Codex核变更、代码body/身份映射和实际结果后，在**同一3y分支**分提交集成推送，再清理该临时worktree。该校准后按有限范围直接分派审查与获准整改，无每批纯只读考试。

GLM下一批先交此三文件实作；Codex可同时处理纯记录沿革。接收后候选CODE2 MKF两文件`mkf.ts/mkf.boundaries.test.ts`，开工前核活跃Owner和最新候选；不因本包提前准入算法或继承旧卡accept。

## 执行证据与低成本复验

独立命令为GLM建议的四文件vitest，另启default/json双reporter；见[targeted.json](targeted.json)、[完整输出](targeted.raw.gz)、[原生报告](targeted.native.json.gz)。本次4文件51/51，0fail/skip/pending，完整618字节输出0error/warning/info/runtime诊断。原生报告按file×fullName锁在manifest；它是本次Codex独立执行，不冒称找回GLM未附的原件。历史54与当前51不混为同一身份集合。

快速复验：在仓库根运行`python3 docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/rle/calibration-20261018/verify.py`。只读核Git来源、实际输入、附件字节/51身份、历史表格差异和当前两行review；不联网、不修改树、不跑测试/coverage。输入或附件变更须区分过期/损坏，不能回写manifest冒充原校准。它不自动认证八维语义，后续先据失效范围定向核读。

文档消费者、lint及ledger本次结果附后；本批没有新产品测试、反控、相邻全包/typecheck或全仓check/coverage/protected执行。静态文档结果不代替产品统一门；旧editor诊断未闭合前不合main。


| 本次验证 | 实际结果/原件 |
|---|---|
| RLE定向 | 4文件51/51，完整raw与原生JSON见上；0诊断。 |
| check:docs | [docs.json](docs.json)与完整raw：125/125工具合同、实际5消费者均通过；0诊断，不复用口头摘要。 |
| lint-zero | 初次[lint.json](lint.json)报本包manifest一个格式错误，保留原件；格式修正后[lint-final.json](lint-final.json)5535文件0error/0warning/0info。后补回执单独做格式检查，不循环重跑整套门。 |
| ledger | [ledger.json](ledger.json)：3319/249closed/105review/2965pending，PASS仅记录一致性。 |
| 范围/历史保持 | [scope-verification.json](scope-verification.json)、[scope-final.json](scope-final.json)：仅两活动行状态回退，历史表尾及其它元数据结论/历史保持；产品、测试、工具、规则和83卡队列不变。 |
| 快检 | [fast.json](fast.json)：输入/原件/51身份/243历史记录匹配；不授予语义或统一门信用。 |
| 未运行 | 相邻全包、typecheck、全仓check、official coverage ratchet、protected fast、E2E/视觉；本批只改文档/记录，无产品build或合main。 |

新附件有原件与SHA，已有历史失败不覆盖。首次最终消费者检查[docs-final.json](docs-final.json)因尚未生成的回执链接报2个缺失，保留失败原件；附件就位后的5消费者结果为`docs-final-pass.json`。后补回执格式见[artifact-format.json](artifact-format.json)。125工具测试源与本次首次check:docs相同，最终只复跑受影响的5个消费者，不再重跑125合同。
