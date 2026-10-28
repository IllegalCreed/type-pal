# 资产与渲染专测：百文件窗口末30主体

Owner：Codex，单Agent。[任务](../../../tasks/QUALITY-GAME-ASSET-RENDER-TESTS-1.md)从32个implicit pending候选全文核验；30个存续主体的A–H逐项在[共同文件索引](../review.json)，两PNG重复文件退役不计新增接受。窗口累计100主体，依赖补读、P04-shop及loader/tileset既有关闭不重复计数。

## 候选与范围

基点72db417255d8ca4227522420e9185ef468462aa7，同一codex/code-quality-94-102，当前仍是未提交工作树。[本片索引](review.json)给每个原/当前文件指纹、caller/依赖、118旧身份到当前合同的逐项映射、原生结果与失效边界。产品实现、资源产物、schema/save和游戏行为未修改；英文、E2E、editor性能任务不占用。

## 整改与依据

- PNG两短专测及G02-A01合并到完整3×2平面，保留R/G/B区分、42/200高位、alpha0/非零及palette0合同；P10真实decode→draw消费和资源释放仍独立。
- RNG改为直接逐字节核gzip解压结果，删除同codec双跑的伪独立像素oracle；sprite同理移除相等字节上的重复帧数自比。原盘输入只读，抽样范围不夸成完整解码算法认证。
- 快照host原4B空YJ2只有长度无EOS，换成7B有效流；沿用前片有界SDLPal原生EOS证据。等长padding损坏在旧测试2绿，新测试1绿1指定AssertionError；不是产品修复红例。完整双流、child JSON及恢复指纹保留。
- UI正常fixture真气99/上限40矛盾修正为99/100，并按生产hydrate初始化runtime；每个物品独占equipableBy。移除魔法fixture隐式复活、无消费者digitCount及三个helper export；不删除有caller的测试工具。
- 像素查询越界不再默认为黑；wave全局在afterEach恢复；P08四种结算拆为四原子用例且旧断言全部保留。P01只捕获真实draw实参，P03补捕实际传入的roles。临时子进程目录finally清理，显式审查运行可先另存原始附件。

量化初筛只有两个>10 callback（17的synthetic FS模式表、11的子进程结果判别），均全文核过；保留同生命周期的输入/进程Owner，未为指标抽万能helper。初筛不是验收标准。

## 运行事实与低成本复验

基线24实际文件118绿；当前25文件137绿/0 skip，之后P03及battle fixture增量4文件12绿，身份全部已在137内，不能相加。game typecheck无输出，30文件Biome 0；所有正常轮default+JSON且stderr空。child的预期失败与optional-group skip属于runner输入合同，外层没有诊断或新增跳过。

`node docs/ops/evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/asset-render/verify.mjs`默认只读，核30指纹/A–H、附件字节/原生身份与映射；不运行被测代码、不证明语义设计。完整raw/native见[native归档](native.json.gz)，每成员hash在本片索引。真实运行由原生JSON推导，不能只信作者pass字段。

首次ledger探针在两个PNG删除尚未暂存时因Git索引枚举报ENOENT，未作为通过；只暂存这两退役路径后按机器结果记数。普通测试运行不保留临时树；本片显式导出的child证据按原字节归档。已有输入缺席的skip政策、deadline和规则不变。

代码接受与集成门分开：本片完成后窗口100主体、3465tracked／694closed／0review／2771pending；全仓check、唯一official采集/ratchet/protected、远端CI与提交发布仍待集中收尾。软件帧缓冲断言不授真人视觉/E2E信用。输入、caller、renderer或fixture漂移仅重核受影响claim，不把哈希相同当调用环境未变。

本片并入100主体统一门，最终pnpm check/七TC/whole lint0；唯一official及精确protected重放通过。[完整集中原件](../uniform/README.md)。发布在本次提交时仍待受保护PR，原定向137和增量12的范围不变。

## 2026-10-28 回执质量定向复核

用户质疑两百文件推进速度后，Codex先核两窗清单：200个不重复主体，146测试、23夹具/辅助、23实现/工具、8配置/声明，共19,264行，其中64文件不超过50行。文件构成与集中重门能解释部分提速，不能证明审查深度；两窗也不能等同于200份复杂产品实现。

发现本片15份渲染专测的C–H过于模板化，并核实7份记录的局部事实错误：P02冒称目标移动；P06把静态MP10写成99；P07冒称毒键覆盖；P08/P09/P15把生产上层caller写成这些专测实际执行链；P13冒称时钟spy/afterEach恢复。旧文本可由基点b8b6989b952968ab60108ae45842ae5689822925回读；[共同索引](../review.json)的receiptAudit20261028保留逐字段before/after。

已针对该问题全文重读15测试与7共享夹具，补齐各文件状态Owner、复用取舍、具体断言、可读性、删除影响与可测边界。30主体/47依赖均与原片指纹匹配，原始运行与A维生产证据按其范围复用。本次未发现新的直接实现/测试缺陷；没有重新认证全部200文件，也不能用指纹或绿门证明当时全文阅读发生。原始raw不改、新增治理数为0、中央账本状态不因回执文案纠正改变。

本次只修证据与交接，不重跑产品测试、全仓check或coverage。后续进度同时披露文件构成、首次审查/证据复用、实质整改、保留与未决项；100只是重门调度规模。

## 2026-10-28 后续核验边界

原件和verify证明原冻结候选。后续夹具移动、共享构造及获批产品修复由[两百文件抽核](../../QUALITY-RECENT-200-ACCEPTANCE-AUDIT-1/README.md)承接，旧raw不回填；当前源码复验改用该入口。
