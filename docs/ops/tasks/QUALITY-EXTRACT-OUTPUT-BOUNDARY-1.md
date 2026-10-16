# QUALITY-EXTRACT-OUTPUT-BOUNDARY-1 — 提取器共享输出目录清理停止线

Status: draft
Owner: Codex
Reviewer: Codex（当前源码与隔离原件自核，不冒充第三方）
Phase: phase1 pal-extract / asset pipeline ownership
Capability: extraction output cleanup boundary
Visual Verification Timing: N/A（CLI文件所有权，无UI变化）

## 已确认事实与停止线

**当前用户裁决（2026-10-16）**：批准方案A“拒绝共享输出”。遇到本仓库data或data/extracted节点为链接时，任何输出创建/清理前立即报错退出；正常自有输出和只读data/raw链接保持原行为。不增加force开关。此裁决解除产品策略待定，当前仍draft，先完成失败反例与有限build准入再实施；下文未批准表述均是裁决前记录，不作为当前待答问题。

源基点c2fee5a9e，唯一codex/code-quality-3y；main=f98d0ddd8。用户要求资产管线风险立即停线开卡，不得直接实现。3g901行全文读取发现OUT清理仅有字符串suffix guard，随后readdir/rm子项。当前治理树data/extracted实际是指向主树data/extracted的symlink；本任务没有在真实工作树运行提取命令。

[四场景隔离原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3g/output-boundary.json)执行未改CLI的临时副本，输入/输出/所有链接目标均在自建临时目录：OUT根链接或data父链接都能通过guard并删除链接目标的marker，之后因缺SSS退出1；videos保留。对照：普通OUT照常清理，OUT内子项链接仅被unlink、其目标marker保留。不能把根/父链接风险扩张为“rm一定跟随每个子链接”。首次探针因macOS /var别名的校验失败发生在启动CLI前，原件保留，归一化探针自有路径后才得到四次产品观察。

## 四向真值与可证伪前提

| 维度 | 直接证据/边界 |
|---|---|
| Primary | CLI:73–77、184–201；Node fs的lstat/realpath与rm语义见[官方fs参考](https://nodejs.org/api/fs.html)；四个真实子进程及两侧marker字节为本次直接IO证据。 |
| 第一阶段 | CLAUDE提取产物可重生成；用户要求治理树不得覆盖/清理主工作树。可重生成不等于当前工作树拥有另一个树的产物清理权。 |
| 第二阶段 | N/A；不改content/reforge/editor，也不改其资产格式/迁移。 |
| 当前目标 | 建议“共享输出会被清理 → 清理前拒绝共享/重定向输出”；正常自有OUT仍按原策略保留videos、清理其它旧产物。该行为边界待用户裁决。 |

最强替代解释：共享输出可能是有意工作流，原清理行为并非在所有调用域都错误；因此不擅改产品策略，也不把symlink raw只读输入一并禁止。若四次原件表明根/父链接目标未被删除，本前提被推翻；若存在经批准的共享输出调用方，则须先明确其显式授权方式。

## 可审阅方案A（推荐，未实施）

第一阶段命令pnpm extract在任何输出创建/清理前检查本仓库的data与data/extracted这两个输出路径节点；若节点为symlink则明确报错退出，不进入清理/写出。只读data/raw链接继续允许；正常自有OUT以及其内部子项原清理行为保持。不增加force/兼容开关，不改argv接口、资源路径或文件格式。

若获批准，白名单仅cli.ts清理前guard与cli-error-exits.kimi-r1.test.ts的真实临时树反例；原普通清理/videos合同保留。先以旧实现证两新反例红，再补最小guard，再核OUT根链接、data父链接、普通目录、无目录、子项链接以及真实caller/相邻回归。非法输出在缺SSS之前即拒绝，目标marker/videos字节必须保留；完整command/cwd/exit/signal/JSON/raw、可重建副本及清理证据齐备。实现与纯注释/重构分提交。

方案B为保留共享输出但另设显式授权流程；这会增加命令接口/工作流设计，用户本次未选择。当前已批准A，Status仍draft、没有build allowed，待先红与实现准入。

## 未决与交接

先完成当前fetch取消有限批次，再按获批A核Owner/失败反例并准入输出边界修复；3g其它只读复审、测试证据与全83卡/94–102/editor独立范围继续。CLI旧关闭因直接counter保持rework；全仓静态/运行时门未收口，不合main。无下一位Agent提示词，Codex单Agent继续，无需重复请求输出策略裁决。
