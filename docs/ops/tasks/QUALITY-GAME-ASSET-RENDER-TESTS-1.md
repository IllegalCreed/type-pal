# QUALITY-GAME-ASSET-RENDER-TESTS-1 — 资产读取与渲染专测的合同收口

Status: done
Owner: Codex
Reviewer: Codex（单Agent；审查判断与运行事实分别记录）
Phase: ops
Capability: game-tests
Visual Verification Timing: N/A（软件帧缓冲断言，不授真人画面/E2E信用）
Branch: codex/code-quality-94-102

## 目标

接续[百文件窗口](QUALITY-PENDING-100-1.md)剩余约30主体；以真实caller/独立像素/IO oracle逐文件核八维，只对证据充分且必要返工完成的文件授信用。

## 范围

候选32文件：assets内snapshot-input.setup、load-all-bounds、PNG三个专测、rng/sprite blob snapshots、scene-cache两专测、snapshot-input-boundaries共10；present内grok-present的font/images/world/png-rgba四fixture及p01/p02/p03/p05–p10九专测，grok-composition三fixture及p11–p16六专测共22。

分片按PNG/快照IO/加载缓存、菜单像素与fixture、世界叠层/战斗装配执行。可修本范围测试/fixture、合并或退役已证重复，记录每个旧身份和断言去向；产品代码、schema/save、资源/生成物和UI形态不写。两PNG短专测是否退役待完整排重，不预先计数。依赖补读、既有关闭和退役不凑100；重要未知保持pending/review。

## 前提真值门

已有loader/codec/present生产实现与部分相邻测试证据按具体指纹复用，再核真实caller与相关增量。输入来自typed公开入口/实际IO域；合法BDF/RLE/YJ2 fixture不能只靠被测实现自洽。像素预期手列或来自一手C布局，不以重画相同函数生成oracle。生命周期核取消、全局/资源/临时树清理，mock仅隔离IO宿主。

## 上下文锚点

[长期八维](../code-quality.md)、[测试验收](../agent-workflow.md)、[共同证据](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/README.md)。当前main72db417255d8ca4227522420e9185ef468462aa7；已fetch确认0behind，已有WIP保护备份不覆盖。英文三树无WIP，本卡不写英文/SLF/修订链、E2E和editor-save-performance范围。

## 验证

必要定向default+JSON保留完整原件；同候选可靠结果复用，反控只针对重要判别力缺口。静态error/warning/info全零；test.skip/timeout/ignore和强转不新增。约100实际主体后冻结整个窗口，集中全仓check/官方coverage/ratchet/protected、零诊断后受保护PR/CI合并，不提前提交。

## 当前模式推进记录

Codex build allowed：以上测试/fixture有限整改；单一Owner，不委派、不修改被测生产机制。原盘和extracted仅读；快照输入探针只隔离FS，不写真实资源树。

## 交接

无下一位Agent提示词。完成审查与统一门、提交发布分别记录；32候选不等于32接受。

## 代码验收与统一门边界

2026-10-27：32候选全文八维，30存续主体代码接受、两PNG重复文件退役不计数。窗口累计100实际主体；3465tracked／694closed／0review／2771pending已由ledger实测。137定向/相邻0skip/空stderr，P03与battle fixture最后增量12例复用其中身份；game TC及30文件Biome0。具体A–H、118旧身份映射、padding反控与双流见[本片证据](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/asset-render/README.md)。现在冻结窗口，不扩新模块；重门、官方采集/ratchet/protected与发布仍待集中完成。

## 本窗口本地验收收口

2026-10-28（JST）：100主体八维及本地统一门接受；本次提交时远端PR/CI/合并尚待，发布以受保护PR实际结果为准。 20536包测试＋732工具测试全部通过、七包typecheck和whole lint error/warning/info为0；唯一official20,188fast/809src，有限计数调整后原报告ratchet/protected0。文件关闭只来自本卡既有逐文件证据，未扩大到其它pending。见[统一原件与只读复验](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/uniform/README.md)。本卡done指本地审查/整改/验收，远端发布不是预先完成声明。

## 2026-10-28 用户质疑后的证据返工

Codex在同一治理分支按具体缺口定向补核，未开新文件窗口。15份P01–P03/P05–P16测试的C–H通用句不能充分支持低成本独立复验；全文重读这15文件与7共享夹具后，逐文件改为实际Owner、复用取舍、断言和隔离依据，并纠正7份记录内的caller/oracle/时钟事实。详见[补核范围与限制](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/asset-render/README.md#2026-10-28-回执质量定向复核)。

无源码、测试、规则或原始执行附件变更；未重跑重型门，也不重复计入完成数。本卡既有代码接受保持，不能将这次15文件补核说成重新认证整个200文件。后续回执区分实现、测试、夹具、配置及证据复用，而不单报文件数量。
