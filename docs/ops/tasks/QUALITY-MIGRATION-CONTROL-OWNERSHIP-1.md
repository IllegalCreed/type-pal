# QUALITY-MIGRATION-CONTROL-OWNERSHIP-1 — 事务内部写入路径所有权

Status: review
Owner: Codex
Coding Owner: Codex
Reviewer: Codex（单 Agent）
Phase: phase2
Capability: A7
Visual Verification Timing: N/A（离线文件写入，无新增界面）
Branch: codex/code-quality-94-102

## 目标与范围

核清迁移事务内部暂存/journal路径是否在任何写入之前拒绝外部链接。用户已批准写入前拒绝链接，先正式失败回归，再补事务控制路径预检；不改产品路径政策、迁移内容、journal格式、生成物、真实工程或存档。

## 前提真值门

一句话前提：事务不得先沿内部目录/临时文件链接写入另一棵树，再在后续校验时拒绝。

| 维度 | 当前来源与边界 |
|---|---|
| primary | `packages/migrate/README.md`操作纪律要求目标/临时路径拒绝链接，单writer并非OS沙箱；历史MIGRATION-WRITE-GUARD-1明确JSON目标/暂存保护。 |
| 第一阶段 | N/A：不涉及原盘字节、战斗、显示或一阶段存档；仅二阶段离线事务IO。 |
| 复现基点二阶段 | e940基点的 `migration-transaction.ts:343-362`先mkdir/write staging后validateJournal；`:363-369`写journal `.tmp`前无该路径守卫。原生复现先写外树后错／覆盖外文件而成功；这些行号只定位冻结before，修后结果见Build。 |
| 目标 | 正常自有路径保持，遇控制路径链接在外部首次修改前拒绝；不改journal版本或迁移内容。实际局部修复与未跑边界见Build。 |

最强替代解释：单writer纪律、后续validateJournal、POSIX rename替换叶链接可能已经足够。本卡分别用正常自有路径正控和调用前已存在的链接验证；没有并发、race hook、核心mock或运行时机制差异。若真实入口始终在外部首次写入前拒绝且保留外部字节，即推翻疑点。

## 上下文与来源

[父窗口](QUALITY-PENDING-100-3.md)、[八维质量](../code-quality.md)、[第二阶段规则](../../phase2/READ-FIRST.md)、[历史写入保护](../archive/tasks/done/MIGRATION-WRITE-GUARD-1-planned-snapshot-and-paths.md)。真实入口为 `commitMigrationTransaction`；公共caller的正常TransactionChange输入、原始hash/null和manifest纪律保持。

## 验收条件与风险

先形成准确before/after、真实错误/成功结果、外部字节/文件集合及清理原件。probe只写自有临时根（repo与outside都是其子目录），finally移除；不运行 `migrate:content` 或真实重迁。正常对照通过后再判断两个静态链接观察，不以单纯报错当安全通过。

若证实问题，登记确切受影响写点，先正式失败回归再修获批范围；检查失败传播、暂存清理Owner、恢复入口和重放。新的产品取舍/资产管线修复按用户最初停止线裁决，不自动从历史卡取得实现授权。无资源生图、视觉或E2E范围。

## 实际取证（2026-10-29）

原生fs＋真实`commitMigrationTransaction`、合法project变更（期望目标不存在的null），无mock/并发/真实PAL数据。正常对照成功、目标为独立字面量`{"value":1}`且outside不变；控制目录链接：outside从空变为含stage正文，随后才报链接错误；journal临时文件链接：outside原字节`OUTSIDE_ORIGINAL`变成journal正文，函数成功返回。两种链接均在调用前已存在，不是最后一次check到syscall之间的外部竞态。

正式隔离contract入口分别要求outside字节/文件集合不变；红例原件、完整观察及probe在[窗口证据](../evidence/QUALITY-PENDING-100-3/README.md)。所有写入限自有mkdtemp根，finally清理，主树与产品实现未改。并未证明真实作者工程已经存在这些链接或已受损。

## 当前模式推进记录

2026-10-29 用户裁决：“批准写入前拒绝链接（推荐）”。Codex build allowed：同一治理树/分支、单Owner，仅修改 `migration-transaction.ts` 及正式控制路径回归，复用现有路径守卫/夹具，先红后修；同步核恢复入口的控制路径清理，禁止输出链接穿透。不得改journal版本、合法内容或单writer/非OS沙箱承诺。全仓门和done仍pending，不扩大其它关闭信用。

## Build与局部验收

用户批准后先新增正式4例，冻结测试/旧实现，全部因外部字节或文件集合改变出现业务AssertionError。随后只改 `migration-transaction.ts`：journal/temp预检、全量staging路径首写前检查、恢复读取有效journal前拒绝链接；staging相对地址格式提为私有pure builder供producer/validator共同消费，格式不变，无新公共出口。

正式4绿，相邻9文件89绿、migrate typecheck0，stderr均0。新专测随后仅Biome格式调整，保留原诊断、格式AST桥和最后4绿。没有执行真实迁移/生成物重写，没有改内容或journal版本；正常提交、恢复和重放由相邻原测试支持，不拿报错本身当保全证据。

本卡代码修复局部接受、统一门待父窗口集中；整源仍pending，不能由本卡直接升级为整文件已验证。单writer、非OS沙箱、staging中途失败原边界不扩张。原红例/完整原件/失效条件见父证据。

## 交接日志

- 2026-10-29：补读路径守卫真实caller时发现内部写入时点疑点，开本完整风险卡；隔离probe结果与原件回填本卡，不先冒称已证缺陷或已修。
- 2026-10-29：用户批准后按4正式红→窄修→4绿/89相邻/TC0推进review；原件保留，等待父窗口统一门，不另开PR/重跑覆盖率。

## 下一位 Agent 提示词

无下一位Agent提示词；Codex单Agent保持同一父窗口，继续相关pending切片，统一门/发布尚未进行。
