# 保存恢复：接收侧未覆盖分支台账

父卡：[EDITOR-SAVE-RECOVERY-1](../ops/tasks/EDITOR-SAVE-RECOVERY-1-interrupted-author-save.md)。
本表由Codex根据正式覆盖报告与源码维护，不沿用GLM原回执中缺乏证据的“已有覆盖/不可达”结论。

## 口径与未完成边界

- 本表两份生产源码相对4b72e492未变；保存凭据解析性能优化不改变这两份源码。360b2f65接收树的未覆盖快照为wp82 + project-io37 = 119臂。
- 前批PAL/首存回归将119臂降至93臂，project-io-admission再命中io11臂降至82；2026-09-12本批真实授权生命周期13项再命中wp16臂，当前为 **40 + 26 = 66臂未覆盖**；没有新回退臂。
- branchId/arm是本次V8报告定位键，不是产品稳定ID；源码或工具升级后必须重生成。
- 条件/函数由TypeScript AST定位。条件为归一化节选；短路表达式显示所属整体表达式，具体臂仍按报告编号，不把相同节选当同一个臂。长行用省略号。
- 当前66臂中，**52臂为E0=待确认，11臂为E3=当前调用域的构造/前置保证，3臂为E4=旧路径退役审查候选**（证据见下）。E3/E4仍在未覆盖分母，不算已覆盖、不自动授权删除。类型可选/难构造不能单独证明可达或不可达。
- 本表0命中不写“已有覆盖”；66臂不是66个已确认bug，也不是整卡全部剩余工作。GLM打开身份返工未接收、hint.source产品缺口及原生/性能/终审按父卡继续。
- 原119臂的精确历史清单由Git保留；[preflight接收结论](editor-save-recovery-glm-preflight.md#codex-fae10e55接收结论2026-09-12)仍是该时点事实，不冒充最新数量。

## 前批闭环的9臂（E2：常驻测试已覆盖）

全部来自[pal-save-identity.test.ts](../../packages/editor/src/core/pal-save-identity.test.ts)，通过合法独立可信源/目标目录、生产授权及loader调用验证；IDB边界替身不冒充原生验收。

| 原分支/臂 | 实际入口与断言 |
|---|---|
| wp107/0、108/0、108/1 | assertPalDevelopmentDirectory拒绝sentinel缺失/非法结构，同目录合法正控通过 |
| wp109/0 | 合法sentinel换workspaceId后拒绝，而非允许复用旧授权 |
| wp115/0、116/0 | manifest是palFingerprintPaths实际列入的文件；缺失/坏JSON在指纹读取层拒绝 |
| wp130/0 | 两个marker均独立解析有效，公开bound授权仍拒绝冲突；原E1临时证据已常驻 |
| wp132/0、133/0 | 当前绑定缺失或project/mode漂移拒绝，目标文件与恢复凭据不变 |

前批还验证合法PAL连续保存推进会话指纹、target签发后外部修改仍拒绝、人物表由作者基线保护；
后者不属于PAL结构指纹路径，不能混淆拒绝层。原生PAL跨页结果见父卡本轮回执。

## 前批闭环的17臂（E2：常驻测试已覆盖）

来自[workspace-save-admission.test.ts](../../packages/editor/src/core/workspace-save-admission.test.ts)20项；最终官方fast 6,280项的LCOV与本表逐臂核对，产品源码未改。

| 原分支/臂 | 真实入口与证据 |
|---|---|
| wp9/0、10/0 | 完整暂存和pending后的FSA枚举边界，未知目录/未知文件/既有blob篡改在首个作者IO前拒绝；快照、后续IO和凭据数据字段不变 |
| wp99/0、100/0、101/0、101/1 | 沙盒marker真实close后发生PAL混入/缺失/坏JSON，bootstrap继续校验拒绝；没有作者文件或恢复凭据写入 |
| wp104/0、106/0 | 公开PAL目录验证分别拒绝普通上下文、后出现的有效沙盒marker；合法PAL对照通过 |
| wp138/0 | 已绑定普通本地项目出现单个有效受限marker，公开bound授权拒绝 |
| wp143/0、145/1 | 已有同目录绑定project/mode/source漂移拒绝；恢复正确绑定后的同目录匹配分支进入真实writer并成功 |
| wp149/0、150/1、172/1 | bootstrap-only调用方失败后明确resume复用原marker且不重写；没有marker的resume提示仍只允许空目录 |
| wp162/0、165/0 | PAL首存缺加载时作者基线拒绝；没有构造空基线冒充，真实loader基线可保存 |
| wp173/0 | 初次additionalVerify后合法PAL sentinel混入，prepare在创建沙盒marker前拒绝 |

## 构造保证的防御分支（E3，仍未覆盖）

wp4/0：`writeJsonSidecar`的缺token映射拒绝分支，当前不是合法外部输入路径。证据（workspace-persistence.ts）：

- 私有WeakMap在:83声明，仅:160 set、:146 get；没有delete或外部入口。
- `writeJsonSidecar`(:141)和`authorizeSandboxBootstrap`(:158)均不导出。
- 唯一调用点:850–851直接把刚创建的token作为参数传入；创建/登记/调用之间没有await，token不向外泄露。
- AST复算引用清单保存在`/tmp/codex-admission.ifO6Ix/private-bootstrap-census.json`。只覆盖当前正常产品调用域，不把恶意篡改JS内建对象的环境算合法输入。
- 保留防御检查；不通过导出私有函数、伪造品牌、篡改WeakMap来凑覆盖，也不据此移出覆盖统计。

## 本批project-io闭环的11臂（E2）

[15项新回归与完整证据](editor-save-recovery-project-io-review.md)由Codex执行；GLM打开身份工作包未合入本统计。
io2/0、8/0、18/1、22/1、23/0、26/0、40/1、50/1、65/1、71/0、82/1已由最终fast 6,295项的LCOV确认命中。
其中坏元数据会被完整writer拒绝，不把“部分序列化曾返回输出”当合法旧版本支持。

## project-io的E3/E4分类

详见[构造保证及旧路径审查](editor-save-recovery-project-io-review.md)的逐组源码链：

- E3共10臂：io15/0的同步前置世界变量门、io20/0的Map按相同字符串ID构造；
  io79/1、80/0、80/1的私有完整签名Map；io84/1、88/1、91/1、93/1、96/1的私有完整sizes Map。
- E4共3臂：io13/0、29/0的旧分片路径，以及io48/0的旧writeFile辅助函数。
  旧ScriptDrawer仍有旧命令引用，不能误报“全部零引用”；它位于正常启动已有canonical会话的回退分支。
  writeFile仍导出，亦不能称为JS不可调用。都是清理审查候选，不以猜测直接删除。
- 所有13臂仍列在下方未覆盖表，不改源码、不减分母；剩余可选工作副本字段/异常类别继续E0。

## 本批授权生命周期闭环的16臂（E2）

[真实token回归及单点负控](editor-save-recovery-capability-review.md)由Codex执行；最终单次严格fast6,308项确认命中：
wp20/0、25/0、26/0、35/0、42/0、45/0、47/0、50/0、71/0、82/0、85/0、88/0、89/0、91/0、93/0、96/0。
wp覆盖为行402/423（95.03%）、函数58/58、分支395/435（90.80%）；io维持287/290、52/52、215/241。
源码hash、生产文件范围和分母均未变，GLM分支不在本统计内。

## 当前清单

### workspace-persistence.ts

来源：packages/editor/src/core/workspace-persistence.ts；源码SHA-256：f4cea61c2ae532945e9d707e73cf9def2ed98bc22a1b17cd19dd95eb0b3553b0。未覆盖40臂。

| 分支/臂 | 行 | 所在函数/回调 | 条件/子表达式（按报告编号） | 当前分类 |
|---|---:|---|---|---|
| 3/1 | 127 | readJsonState | cond-expr：error instanceof Error | 待确认（E0） |
| 4/0 | 147 | writeJsonSidecar | if：!dir | 构造保证（E3，见上） |
| 77/0 | 492 | recordAuthorizedWorkspaceWriteCompleted | if：value instanceof ArrayBuffer \|\| ArrayBuffer.isView(value) | 待确认（E0） |
| 80/1 | 499 | recordAuthorizedWorkspaceWriteCompleted | cond-expr：typeof value === 'string' | 待确认（E0） |
| 113/0 | 613 | palDevelopmentTargetFingerprint | if：context.mode !== 'pal-development' \|\| !context.palProof | 待确认（E0） |
| 116/1 | 622 | palDevelopmentTargetFingerprint → 回调@615 | cond-expr：error instanceof Error | 待确认（E0） |
| 117/0 | 632 | readPalDevelopmentTargetValues | if：context.mode !== 'pal-development' \|\| !context.palProof | 待确认（E0） |
| 119/0 | 637 | readPalDevelopmentTargetValues | if：text === undefined | 待确认（E0） |
| 120/0 | 642 | readPalDevelopmentTargetValues | cond-expr：error instanceof Error | 待确认（E0） |
| 120/1 | 642 | readPalDevelopmentTargetValues | cond-expr：error instanceof Error | 待确认（E0） |
| 121/1 | 646 | readPalDevelopmentTargetValues | binary-expr：palExpectedFingerprints.get(context) ?? context.palProof.expectedFingerprint | 待确认（E0） |
| 122/0 | 648 | readPalDevelopmentTargetValues → 回调@647 | if：!values.has(path) | 待确认（E0） |
| 123/0 | 651 | readPalDevelopmentTargetValues | if：actual !== expected | 待确认（E0） |
| 124/0 | 660 | fingerprintPalExpectedValues | if：context.mode !== 'pal-development' \|\| !context.palProof | 待确认（E0） |
| 126/0 | 663 | fingerprintPalExpectedValues → 回调@662 | if：!values.has(path) | 待确认（E0） |
| 158/0 | 775 | preflightFirstSaveTarget | if：entryBinding && entryBinding.workspaceId !== context.workspaceId | 待确认（E0） |
| 159/1 | 775 | preflightFirstSaveTarget | binary-expr：entryBinding && entryBinding.workspaceId !== context.workspaceId | 待确认（E0） |
| 164/2 | 805 | authorizeFirstSaveTarget | binary-expr：previousAuthor && (previousAuthor.dir === dir \|\| (await previousAuthor.dir.isSameEntry(dir))) | 待确认（E0） |
| 169/0 | 823 | authorizeFirstSaveTarget → verifyWorkspace | if：metadata.sandbox.kind === 'invalid' \|\| metadata.palDevelopment.kind !== 'missing' | 待确认（E0） |
| 175/0 | 889 | contextFromRecord | if：record.mode === 'sandbox' | 待确认（E0） |
| 176/0 | 890 | contextFromRecord | if：record.source !== 'ui-samples' && record.source !== 'sandbox-copy' && record.source !== 'review-copy' | 待确认（E0） |
| 176/1 | 890 | contextFromRecord | if：record.source !== 'ui-samples' && record.source !== 'sandbox-copy' && record.source !== 'review-copy' | 待确认（E0） |
| 177/0 | 891 | contextFromRecord | binary-expr：record.source !== 'ui-samples' && record.source !== 'sandbox-copy' && record.source !== 'review-copy' | 待确认（E0） |
| 177/1 | 892 | contextFromRecord | binary-expr：record.source !== 'ui-samples' && record.source !== 'sandbox-copy' && record.source !== 'review-copy' | 待确认（E0） |
| 177/2 | 893 | contextFromRecord | binary-expr：record.source !== 'ui-samples' && record.source !== 'sandbox-copy' && record.source !== 'review-copy' | 待确认（E0） |
| 178/1 | 898 | contextFromRecord | if：record.mode === 'local-project' | 待确认（E0） |
| 182/1 | 916 | assertExpectedWorkspaceIdentity | if：context.workspaceId !== expected.workspaceId \|\| context.projectId !== expected.projectId \|\| context.mode !== expected.mode \|\| context.source !== expected.source | 待确认（E0） |
| 183/1 | 918 | assertExpectedWorkspaceIdentity | binary-expr：context.workspaceId !== expected.workspaceId \|\| context.projectId !== expected.projectId \|\| context.mode !== expected.mode \|\| context.source !== expected.source | 待确认（E0） |
| 183/2 | 919 | assertExpectedWorkspaceIdentity | binary-expr：context.workspaceId !== expected.workspaceId \|\| context.projectId !== expected.projectId \|\| context.mode !== expected.mode \|\| context.source !== expected.source | 待确认（E0） |
| 183/3 | 920 | assertExpectedWorkspaceIdentity | binary-expr：context.workspaceId !== expected.workspaceId \|\| context.projectId !== expected.projectId \|\| context.mode !== expected.mode \|\| context.source !== expected.source | 待确认（E0） |
| 185/0 | 940 | resolveOpenedWorkspaceContext | if：hint && hint.projectId !== projectId | 待确认（E0） |
| 190/0 | 953 | resolveOpenedWorkspaceContext | if：marker.projectId !== projectId | 待确认（E0） |
| 192/0 | 957 | resolveOpenedWorkspaceContext | if：context.mode !== 'sandbox' \|\| context.workspaceId !== marker.workspaceId | 待确认（E0） |
| 196/0 | 963 | resolveOpenedWorkspaceContext | if：existing.mode !== 'sandbox' \|\| existing.projectId !== marker.projectId \|\| existing.source !== marker.source | 待确认（E0） |
| 199/0 | 974 | resolveOpenedWorkspaceContext | if：hint && hint.mode !== 'pal-development' | 待确认（E0） |
| 200/1 | 974 | resolveOpenedWorkspaceContext | binary-expr：hint && hint.mode !== 'pal-development' | 待确认（E0） |
| 202/0 | 980 | resolveOpenedWorkspaceContext | if：!(await existing.handle.isSameEntry(dir)) | 待确认（E0） |
| 203/0 | 982 | resolveOpenedWorkspaceContext | if：existing.mode !== 'pal-development' \|\| existing.projectId !== context.projectId \|\| existing.source !== 'dev-http' | 待确认（E0） |
| 206/0 | 993 | resolveOpenedWorkspaceContext | if：hint.mode !== 'local-project' | 待确认（E0） |
| 208/0 | 1000 | resolveOpenedWorkspaceContext | if：existing.projectId !== projectId | 待确认（E0） |

### project-io.ts

来源：packages/editor/src/core/project-io.ts；源码SHA-256：4f592fc9611038c4f7acbd7c248675e1cd7929a6495357e6083b1e9fba8a996d。未覆盖26臂。

| 分支/臂 | 行 | 所在函数/回调 | 条件/子表达式（按报告编号） | 当前分类 |
|---|---:|---|---|---|
| 7/0 | 152 | resumeOwnProjectSave | if：!snapshot | 待确认（E0） |
| 13/0 | 220 | serializeProject | if：diagnostics.warnings.length | 退役审查候选（E4） |
| 15/0 | 233 | serializeProject | if：!content.worldVariables | 构造/前置保证（E3） |
| 20/0 | 246 | serializeProject | if：scene.id !== asset.id | 构造/前置保证（E3） |
| 29/0 | 287 | serializeProject | if：!chunk | 退役审查候选（E4） |
| 30/1 | 299 | serializeProject | binary-expr：state.enemies ?? [] | 待确认（E0） |
| 31/1 | 300 | serializeProject | binary-expr：state.enemyTeams ?? [] | 待确认（E0） |
| 32/1 | 301 | serializeProject | binary-expr：state.battleFields ?? [] | 待确认（E0） |
| 33/1 | 302 | serializeProject | binary-expr：state.tilesets ?? [] | 待确认（E0） |
| 34/1 | 304 | serializeProject | binary-expr：state.poisons ?? [] | 待确认（E0） |
| 35/1 | 305 | serializeProject | binary-expr：state.ambiences ?? [] | 待确认（E0） |
| 36/1 | 306 | serializeProject | binary-expr：state.shops ?? [] | 待确认（E0） |
| 37/1 | 309 | serializeProject | binary-expr：state.migrationDiagnostics?.diagnostics ?? [] | 待确认（E0） |
| 38/1 | 314 | serializeProject | binary-expr：state.worldVariables ?? {} | 待确认（E0） |
| 48/0 | 404 | writeFile → 回调@393 | cond-expr：snapshot instanceof ArrayBuffer | 退役审查候选（E4） |
| 79/1 | 560 | writeProject → 回调@499 → rememberWrite | binary-expr：signature ?? (value instanceof ArrayBuffer ? await binarySnapshotSignature(value) : serializeOne(value)) | 构造/前置保证（E3） |
| 80/0 | 561 | writeProject → 回调@499 → rememberWrite | cond-expr：value instanceof ArrayBuffer | 构造/前置保证（E3） |
| 80/1 | 562 | writeProject → 回调@499 → rememberWrite | cond-expr：value instanceof ArrayBuffer | 构造/前置保证（E3） |
| 84/1 | 604 | writeProject → 回调@499 | binary-expr：sizes.get(rel) ?? 0 | 构造/前置保证（E3） |
| 88/1 | 609 | writeProject → 回调@499 | binary-expr：sizes.get(catalogPath) ?? 0 | 构造/前置保证（E3） |
| 91/1 | 620 | writeProject → 回调@499 | binary-expr：sizes.get(rel) ?? 0 | 构造/前置保证（E3） |
| 93/1 | 626 | writeProject → 回调@499 | binary-expr：sizes.get('manifest.json') ?? 0 | 构造/前置保证（E3） |
| 96/1 | 629 | writeProject → 回调@499 | binary-expr：sizes.get(catalogPath) ?? 0 | 构造/前置保证（E3） |
| 114/1 | 702 | preflightProjectWriteSet | cond-expr：cause instanceof Error | 待确认（E0） |
| 116/1 | 712 | preflightProjectWriteSet | cond-expr：cause instanceof Error | 待确认（E0） |
| 118/1 | 722 | preflightProjectWriteSet | cond-expr：cause instanceof Error | 待确认（E0） |
