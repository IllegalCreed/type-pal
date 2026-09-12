# 作者保存恢复：project-io边界复核

父卡：[EDITOR-SAVE-RECOVERY-1](../ops/tasks/EDITOR-SAVE-RECOVERY-1-interrupted-author-save.md)。
Codex，2026-09-12；生产源码不改，与GLM打开身份测试并行。
本页保留各批历史；最新旧作者保存链退役与统一候选见[最终收口](editor-save-recovery-closeout.md)，本页各批数字仅代表当时源码。

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

## 另存为边界收口（起点7767b67c）

Codex，2026-09-12；新增[save-as-boundaries.test.ts](../../packages/editor/src/core/save-as-boundaries.test.ts)10项。
与GLM identity-foundation-r1分开文件，workspace-context/handle-store和全部产品代码保持b7a56dd4，不改旧测试/共享fixture/配置。
复用真实saveProjectAs、writer、loader及登记守卫/锁；仅替换picker、内存FSA和IDB存储边界。
没有新增浏览器视觉流程；无目录FileSource用独立观测基线，明确不是在本轮启动真实HTTP服务器。

| 组 | 项数 | 结果和业务断言 |
|---|---:|---|
| 取消 | 1 | picker取消返回null，不构建文件，不改源/目标/最近记录/恢复凭据；同一合法输入随后可成功保存 |
| 构建失败 | 1 | 真实入口保留原始异常，目标无暂存/写入/登记，源不变；解除故障后正控成功 |
| 缺源基线 | 2 | local/source-only均拒绝，目标零create/close/remove，原记录与凭据不变；传入真实基线后成功。没有声称此时callback零调用，也不锁定当前callback次数 |
| 已过期源基线 | 2 | 源人物表由外部改777后，在文件构建callback之前拒绝；保留777及空目标/旧记录。恢复原字节后同条件另存237成功 |
| 清理与重开 | 4 | local/source-only × 清理正常/拒绝，当前编辑237与所有注册资源字节完整保存、真实登记新身份；失败清理只产生warning，仍committed；带故障重开保留提示，解除后提示消失，均不重复写作者文件或修改源 |

初版8项及随后10项均通过；最终相邻5文件130项、editor typecheck及biome通过。
接收前自查将“目标零IO”标题收窄为“零mutation”：选择后的预检允许读取，不把零写轨迹误称零读取。
缺证据用例不固定build次数，只钉住拒绝和零副作用；未将提前失败的优化偏好擅自升级为产品缺陷。

### 三组单点负控

`/tmp/codex-save-as.uCWxGJ/negative.config.mts`用TS AST限定saveProjectAs内唯一语句，仅隔离加载变换：

- cancel：:276的返回null改为返回空对象，1红（取消返回值错误，不是TypeError）。
- warning：:316只返回opened、丢掉saved.cleanupWarning，2红（真实committed仍成立，但两条拒绝清理用例的warning丢失）。
- verify：:289的首次verifyAuthor调用去除，2红（本应拒绝的旧源先执行了build）；后层复验仍能拒绝，不把它误记成作者文件已被覆盖。

三组都exit1，断言业务结果，非加载/编译/文案差异。源hash均为open-actions的
`9c9fae0c1d2977df7af6bbc6b40c645fb2d57f65089ce6096ef76a2a3480cd47`，产品物理文件未改。
没有对“缺证据”强拆第二层守卫制造错误放行。

### 相邻剩余防御分支的源码证明

open-actions的两个E3候选不靠伪造返回值/导出私有函数凑覆盖，也不删除：

- **24/0（:182，缺finalPalProof）**：readOpenedProject:144–151按初始metadata创建trustedPalSource；:155–157、:168–169要求后续metadata一致。
  :171–175同一个const source存在即调用真实createPalDevelopmentWorkspaceContext（workspace-context:227–245只返回上下文或抛错）。
  该本地closure仅由resolver的PAL metadata分支调用；metadata若不是PAL则不调用它，若是PAL则初始source已存在、finalProof必为对象。
  这是当前真实调用域的构造保证，不声称任意篡改JS环境后仍不可能进入。
- **49/0（:293，缺observed）**：:282只有sourceEvidence与original都存在才await observeProjectCopySource；该函数(project-copy-source:47–56)返回对象或抛错。
  :285/292的verifyAuthor在两者缺席时先拒绝，已用两类真实缺基线调用验证；二者均存在且observe成功则const observed不可能为undefined。
  buildFiles不能改这三个局部const引用。保留末层防御检查，不把类型optional等同可达。

完整check **6,835项**、以7767b67c为BASE_REF的官方ratchet及随后**单次**严格fast **6,347项**均exit0。
editor fast204文件/2,108项，生产仍618文件，所有sourceFiles/scopeDigest/指标分母不变；原生/GLM工作包不受影响。
最终open-actions新增38/0（取消）、45/0（缺源基线）、53/0（warning返回），覆盖103/108→106/108，行119/119、函数22/22不变。
剩余24/0、49/0按上述源码链登记E3，继续计入未覆盖分母；主台账两文件仍46臂，不能把相邻模块的3臂混减进去。
workspace-context仍76/93、handle-store仍33/39，本批未借GLM工作域抬高贡献；没有editor覆盖抖动、没有多数投票放行。
严格summary与生成baseline各包/全仓metrics及总数一致。日志在`/tmp/codex-save-as.uCWxGJ/`：target-first、adjacent、typecheck-final、
negative-*、check、ratchet、strict-fast及verified.json。lint仍为既有50 warnings/11 infos，无error。
本轮没有产品缺陷或新权限/版本裁决；根卡仍build/r2，不重签、不标done。

## 私有本地记录转换清理（起点e963598b）

Codex，2026-09-12；用户要求GLM返工期间继续独立推进。只清理workspace-persistence的一个私有helper，
不改GLM的workspace-context/handle-store或其两个测试文件，不涉及脚本公共模型、版本或存储协议变化。

### 调用域证据与实施边界

`git grep -n contextFromRecord e963598b -- packages scripts`只有声明:888、调用:1007两处。
该唯一调用前的:1005–1006已拒绝所有非local-project记录，检查与同步helper调用间无await或外部callback；
当前IDB读出的普通记录对象不通过getter变换字段。因此helper内部的sandbox来源转换及非local尾拒绝没有当前生产调用域。
最强替代解释是另有调用或正常数据能在检查后改变mode；当前源码与公开入口验证均不支持它，不把任意篡改JS环境算当前输入。

将helper改名localContextFromRecord，仅保留原本地来源白名单与相同构造器调用；caller的模式拒绝、projectId校验、
标记验证、登记守卫全部不改。不是让受限记录改走本地分支，也不是删除一个能被当前调用触发的安全检查。
GLM两模块hash与工作包冻结值一致，返工前提未变；其名义覆盖不计入本批。

### 先测旧实现，再测清理后

新增[workspace-local-record.test.ts](../../packages/editor/src/core/workspace-local-record.test.ts)11项：

- 四种合法本地来源经真实finishOpen登记后，无hint重开保持workspace身份；公开resolver返回同样身份。
- 三种合法sandbox来源及PAL都先通过真实打开/登记，再外部移除marker/sentinel；finishOpen与公开resolver都拒绝，
  文件、写IO、记录/凭据不变；恢复原标记后原身份可重开。PAL的HTTP proof字节来自独立可信源，不用被改目标自授权。
- 两种受限记录即使外部把source改成看似合法local来源，公开resolver仍不能降级；这是故意损坏记录的负例，不是合法构造器输出。
- 本地记录的非法来源仍拒绝，原记录不改，恢复后合法重开。

真实登记/锁函数保留，仅替换底层IDB与FSA/HTTP宿主。此批不测IDB升级/abort模型，不将内存fixture称为原生验证。
旧实现11/11通过、typecheck通过；清理后相邻6文件100/100及typecheck通过。
编写期只有新文件字符串拼接的biome info，改模板字符串后两改动文件零诊断；没有为让测试绿而修改产品语义。

独立隔离负控（/tmp/codex-record-cleanup.Rifq6t/negative.config.mts）每次只移除一个保留的throw：
caller模式拒绝去除→两条“受限mode+伪装local来源”的公开resolver用例错误resolve，2红；
本地来源白名单拒绝去除→非法来源被接受，1红。没有把后层换文案拒绝当错误放行，也未导出私有函数凑覆盖。

完整check **6,846项**、以e963598b为BASE_REF的官方ratchet与随后**单次**严格fast **6,358项**均exit0。
editor205测试文件/2,119项，618生产文件；所有sourceFiles/scopeDigest不变，没有删除测试或改变排除配置。
wp分支415/436→413/427、行413/423→411/417、函数58/58不变；原未覆盖21→14，主表46→39。
退休的是旧7个未覆盖臂和2个已覆盖外层判断臂；全仓语句/行各-2已覆盖/-6总数，分支-2已覆盖/-9总数，函数不变。
其余包及project-io/open-actions/workspace-context/handle-store指标不变，新增11项用于验证现行公开行为，并非11个新功能或7个新增命中。
严格summary与新baseline逐包/全仓metrics一致，未出现覆盖率抖动；lint仍为既有50 warnings/11 infos，无error。
旧writeFile和整套旧脚本公共管线不在本切片删除；GLM两模块源码hash与原工作包相同，不影响其返工前提。

证据目录`/tmp/codex-record-cleanup.Rifq6t/`：before/after-adjacent、typecheck、negative-*、check、ratchet、strict-fast及verified.json。
辅助取旧LCOV时报告已进入重新生成阶段，曾报ENOENT；旧整数计数改由上批持久verified.json和e963598b Git baseline复算，未将失败读取当证据。
父卡仍build/r2，不重签、不标done，不转Kimi。

## 后续

GLM继续只做打开身份代码测试；Codex保留E0核验、E3/E4清理裁定、性能/权限与所有视觉验证。
本轮不标父卡done，不降低覆盖门槛，不以分类替代实际覆盖。

文档质量门：`pnpm check:docs`通过（日志位于同一证据目录）。生产基线保持，GLM无需切换生产实现。
