# 作者保存恢复：project-io边界复核

父卡：[EDITOR-SAVE-RECOVERY-1](../ops/tasks/EDITOR-SAVE-RECOVERY-1-interrupted-author-save.md)。
Codex，2026-09-12；起点945f54ab，生产源码不改，与GLM打开身份测试并行。

## 本轮结果

新增[project-io-admission.test.ts](../../packages/editor/src/core/project-io-admission.test.ts)15项，定向/相邻6文件80项通过；
editor typecheck、新文件biome、完整check **6,783项**、官方ratchet及随后单次严格fast **6,295项**全部通过。
统计范围与全部分母不变：618生产文件、editor 200测试文件/2,056项；语句+6、分支+11、行+5、函数不变。
project-io行287/290、函数52/52、分支215/241；未覆盖37→26，和wp合计未覆盖93→82。
全部当前源码/版本/公共接口保持，未重复视觉验证，也没有改GLM文件或回执。

## 新增11个常驻命中

编号对应当前V8报告，源码不变才能沿用。原清单与最终LCOV逐项核对，不按函数名猜测。

| 原分支/臂 | 实际证据 |
|---|---|
| io2/0 | 非空图章表已登记却未加载时toEditorState拒绝；显式加载正控序列化、正式重开仍保留模板 |
| io8/0 | 原页恢复完成但私有文件清理被拒，返回snapshot及cleanupWarning；237保留、解除清理故障后继续保存238 |
| io18/1、40/1 | 缺scenes/sharedScripts的故意损坏当前元数据虽能形成部分序列化输出，真实writer仍在staging阶段拒绝，零作者IO；不当作合法旧工程正控 |
| io22/1 | 缺maps登记在序列化阶段拒绝 |
| io23/0 | 合法自定义索引路径content/map-catalog.json能重开；地图正文指向该路径时由本地守卫拒绝。不能用默认index路径的前置拒绝推断所有路径均被拦截 |
| io26/0 | 已加载但未登记的合法地图工作副本不能静默丢弃；合法index/工作副本对照通过 |
| io50/1 | 在真实授权scope进入后，旧catalog读取的NotAllowedError/普通IO错误保持原异常并零写，不被当缺文件；解除故障后正常保存 |
| io65/1、82/1 | 合法现存工程的部分JSON/附属二进制写集可不带manifest/catalog，但仍验证完整工程，其他作者文件不变且正式重开成功 |
| io71/0 | 差异提示Map已匹配目标catalog、磁盘仍是已授权旧catalog时，必须强制写入新label及必要内容，不能仅相信提示快照 |

另外验证：部分写集即使省略输入manifest/catalog，篡改真实tileset gzip字节仍被完整暂存视图的资源摘要校验拒绝；
同一资源原字节正控可保存。该用例不靠错误kind、不伪造资源二进制。
以上是公开函数/保存调用链的代码测试，不声称UI会产生每一种部分写集或坏元数据。

## 负控制与编写期错误

隔离配置`/tmp/codex-project-io.xphxdA/negative.config.mts`每次只替换唯一目标，不修改生产文件；记录原文/突变SHA。
六组均有业务红：图章未加载不再拒绝；孤立地图被静默省略；自定义索引覆盖不再拒绝；catalog必要写入消失；
恢复cleanupWarning字段消失；部分损坏资源错误提交。警告用例的失败是返回字段变为undefined，不是加载/编译失败。

编写期先修两处测试类型错误（误导入非导出的serializeOne、字节下标的undefined类型）；后修一处fixture选择错误：
catalog首项是JSON资产，不能断言为二进制，改为真实tileset并从正式FileSource读原gzip字节。该失败发生在writer之前，
不登记为产品缺陷；不通过改产品、换虚假kind或放宽校验来迁就测试。

日志：同目录`typecheck.log`/`typecheck-final.log`、`targeted.log`、`adjacent.log`、`negative-*.log`、
`check.log`、`ratchet.log`、`strict-fast.log`。旧失败日志保留；全仓已有50warning/11info未扩大。

## 10臂构造/前置保证（E3，仍未覆盖）

这里没有删除守卫或减少分母。E3只针对当前正常数据对象/产品调用域，不包含篡改JS内建对象、getter切换字段或替换validator。

| 臂 | 源码证明 |
|---|---|
| io15/0 | project-io:217同步先调assertProjectSaveValid；project-diagnostics:861–864已拒绝缺worldVariables路径。到:233重复检查前没有异步窗口；本轮坏输入确认在前置门拒绝 |
| io20/0 | project-io:242按scene.id建Map；:244用asset.id取出scene；普通稳定字符串ID在:246再比较必相同。不是用getter改变ID的输入模型 |
| io79/1、80/0、80/1 | :486–489在prev存在时用diffFiles为所有克隆输入键计算签名，diffFiles:371–377无条件set；rememberWrite:556在无prev时直接返回。有prev时，addWrite只用输入键，catalog超集另传明确字符串签名，所以私有desiredSignatures无缺项 |
| io84/1、88/1、91/1、93/1、96/1 | :541在force-write清单补齐之后，以全部write键构造私有sizes；后续普通/manifest写入均取该清单，catalog收缩要求此前stagedCatalog成立（即write含catalog）。sizes不外泄、不删除，复制分支另记copiedSize；0字节也不是缺键 |

直读配合AST引用清单：`/tmp/codex-project-io.xphxdA/local-map-census.json`，源码SHA-256
`4f592fc9611038c4f7acbd7c248675e1cd7929a6495357e6083b1e9fba8a996d`。这是证据目录，不冒充完整自动证明器。

## 3臂退役审查候选（E4，仍未覆盖）

- **io13/0、29/0：旧分片序列化路径。** current loader（project-loader:188–191）禁止content.scripts并要求sharedScripts；
  toEditorState:97初始化scriptIndex为undefined，open-local:77返回空scriptChunks。
  不能因此草率写“相关代码都没有引用”：ScriptDrawer:835/840仍调用旧UpdateScriptBodyCommand；但App:3042–3066
  将它置于canonical脚本会话缺席的回退分支，App的script参数本身必填，main:138/167的两条正常启动路径均建立该会话。
  App:365直接取props.script.session；ScriptEditSession:1317返回已初始化state，script-editor-projection:131–140始终返回对象，
  不是正常载入中的“暂时undefined”占位。
  当前共享脚本页用script-editor的Add/UpdateSharedScriptCommand，旧commands的Upsert/DeleteAuthoredScriptCommand无其他生产调用。
  应作为旧管线整组退役审查，不补旧模型“成功保存”的假正控；清理需覆盖这些关联模块和旧测试，不能只删两个分支。
- **io48/0：旧writeFile辅助函数。** packages内除定义/注释，没有当前生产调用；现存调用来自旧policy/fsa-copy测试。
  它仍是导出的API，因此不称为JS不可调用；没有必要为凑覆盖新造一条非现行保存主链的二进制调用。
  后续统一核定该辅助函数及关联测试是否退役，不在GLM基线冻结期间改生产。

这些是当前模型残留的清理审查，不是第三阶段脚本模板库改造，不引入新内容版本。
剩余可选EditorState字段和解码异常等路径继续E0；类型写了optional不足以证明正常作者流程可缺席，不能把可能丢表的默认值当合法正控。

## 后续

GLM继续只做打开身份代码测试；Codex保留E0核验、E3/E4清理裁定、性能/权限与所有视觉验证。
本轮不标父卡done，不降低覆盖门槛，不以分类替代实际覆盖。

文档质量门：`pnpm check:docs`通过（日志位于同一证据目录）。生产基线保持，GLM无需切换生产实现。
