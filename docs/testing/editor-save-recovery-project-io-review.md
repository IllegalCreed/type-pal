# 作者保存恢复：project-io边界复核

父卡：[EDITOR-SAVE-RECOVERY-1](../ops/tasks/EDITOR-SAVE-RECOVERY-1-interrupted-author-save.md)。
Codex，2026-09-12；生产源码不改，与GLM打开身份测试并行。
本页保留945f54ab起点的历史批次，最新261c3c66起点的续批见下方“最终取样与恢复快照边界”。

## 前批结果（起点945f54ab）

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

## 最终取样与恢复快照边界（起点261c3c66）

用户要求GLM返工期间继续推进，Codex新增独立
[save-readback-boundaries.test.ts](../../packages/editor/src/core/save-readback-boundaries.test.ts)10项；
不碰GLM文件、产品代码、原测试、共享fixture或配置。

| 用例组 | 项数 | 实测行为和边界 |
|---|---:|---|
| journal/writer原页恢复 | 2 | 同一完整当前工程中，角色HP改237，在真实author close前失败，凭据applying/completed0/issued=true。直接journal的公开调用不产生project-io快照，恢复后明确报“重新打开已恢复的项目”；正常writer正控返回包含237的真实snapshot。两者均committed/正式重开237，再保存238成功 |
| PAL最后取样间隙 | 4 | 独立可信源创建proof。target签发后，两次准入指纹读取均返回真实旧manifest；第二次text读取结束时外部修改磁盘，下一次getFile实际遇到缺文件/坏JSON/不同有效JSON，必须在owner回调前拒绝；同输入不变正控进入owner。外部字节及全IO/绑定/凭据保持，恢复原文件后真实writer可保存237 |
| PAL JSON写入证据 | 3 | object/string/Blob三种形式分别经过真实scope、路径预检、begin及FSA close，再调用完成记账；仅manifest标题改变，指纹与作者基线推进，loader重开及下次授权通过。不是用未变化内容证明一个no-op也能通过 |
| PAL裸二进制证据 | 1 | 传入字节为合法且与磁盘相同的manifest JSON，公开记账API仍拒绝裸ArrayBuffer，文件/IO/身份/凭据不变；没有拿JSON解析错误当二进制守卫证据 |

前两种API层级要区分：正常产品写入口只有writeProject会调用prepare/commit；journal→resumeOwnProjectSave的组合
是公开边界反例，不宣称当前UI会漏掉差异快照。恢复丢失的是原页diff信息，**不是恢复后的内容数据**。
PAL取样不靠sleep、getter切换身份、篡改parser或私有Map；FSA返回的File/Blob本来就是取得时的字节快照。
外部改动发生在已取旧快照后，独立见证text读取次数与文件实际改动；异常仍由下一次实际读取产生。
本批只替换现有绑定的存储读边界和恢复凭据存储，真实登记业务/锁函数保留，没有待登记写入，也不据此声称验证了原生IDB登记。

### 独立负控与编写期修正

临时`/tmp/codex-readback.0YbCrU/negative.config.mts`按TS AST限定所属函数和唯一语句，隔离移除一个throw或values.set，
记录原/突变源码hash，物理生产树不变。四组均exit1：

- snapshot：删除project-io:152的缺快照throw，得到错误的resolved `{ snapshot: undefined }`，1红。
- admission：仅删除workspace-persistence/readPalDevelopmentTargetValues:652的指纹不符throw，owner被错误调用一次，1红。
  后层author baseline仍能拒绝，但不能撤回已进入的回调；测试先断言零回调，不把“错误文案变了”当本组业务证据。
- binary：删除recordAuthorizedWorkspaceWriteCompleted:493的二进制拒绝，记账调用resolved，1红。
  断言位于该调用边界内，不让后层指纹拒绝掩盖裸二进制被接受。
- evidence：仅删除同函数:500的values.set，三种合法标题写入都无法通过最终指纹收口，3红；证明正控确实依赖记账更新。

首跑10项中2项失败是本测试对凭据阶段的错误预期：author IO发出前生产journal:573已经持久化applying/issued=true，
不是ready。修正为精确applying/completed0/issued=true后通过；没有修改产品，也没有把该失败列产品bug。
进一步将正控从“相同数据记账”增强为真实改标题/close/记账/重开，并把负控断言收口到对应API边界。
最终定向/相邻6文件150项、editor typecheck、新文件biome均exit0。完整check6,806项通过（另有docs工具20项及coverage工具17项），
lint仍为既有50 warnings/11 infos，无error；以261c3c66为BASE_REF的官方ratchet和随后**单次**严格fast6,318项均exit0。
editor fast202文件/2,079项，生产仍618文件，全部scopeDigest/分母不变；测试清单只新增本文件10项身份。
全仓分支+8，其中重点台账wp5+io1：wp77/0、80/1、119/0、120/0、123/0；io7/0。重点两模块66→60，无新回退臂。
wp行405/423、函数58/58、分支400/435；io行287/290、函数52/52、分支216/241。未覆盖E3/E4继续计入分母。
严格summary与生成baseline逐包metrics/总数一致；未复现editor off-by-one，没有多数投票放行。

证据日志位于`/tmp/codex-readback.0YbCrU/`：target-first/second/final、adjacent-final、typecheck-final、negative-*、
check、ratchet、strict-fast及reconcile.json（两模块逐臂复算）。不重签、不标done，产品与GLM文件均未改动。

### 未按可选类型硬造成功用例

原io30/1～38/1的9臂仍待确认：project-loader:209–212/273–286规范化相应表与诊断/变量，
toEditorState:91–129均显式赋值，main:131–135/163两条正常启动入口都使用该转换。
这只能证明**当前加载入口会补齐字段**，不是所有导出EditorState/API或后续命令都不可能缺字段的完整证明。
因此未将它们擅自升级为E3，更没有delete字段后把潜在清空原表的输出当合法保存。
原解码器catch的non-Error三臂也仍E0：本批不替换decoder或JSON.parse来制造非Error异常，后续按真实错误源继续核定。

## 后续

GLM继续只做打开身份代码测试；Codex保留E0核验、E3/E4清理裁定、性能/权限与所有视觉验证。
本轮不标父卡done，不降低覆盖门槛，不以分类替代实际覆盖。

文档质量门：`pnpm check:docs`通过（日志位于同一证据目录）。生产基线保持，GLM无需切换生产实现。
