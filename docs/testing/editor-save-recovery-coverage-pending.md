# 保存恢复：接收侧未覆盖分支台账

父卡：[EDITOR-SAVE-RECOVERY-1](../ops/tasks/EDITOR-SAVE-RECOVERY-1-interrupted-author-save.md)。
本表由Codex根据正式覆盖报告与源码维护，不沿用GLM原回执中缺乏证据的“已有覆盖/不可达”结论。

## 口径与未完成边界

- project-io仍与4b72e492一致；wp在source漏检修复后，本批只清理唯一local调用域中私有helper的不可达身份分支，当前hash已更新。360b2f65接收树历史快照为wp82 + project-io37 = 119臂。
- 前批回归依次将119降至93、82、66、60、46；本批退休7个不可达未覆盖臂后，当前为 **14 + 25 = 39臂未覆盖**。这7项不是测试新命中，分母退休详见下节；未引入新回退。
- branchId/arm是本次V8报告定位键，不是产品稳定ID；源码或工具升级后必须重生成。
- 条件/函数由TypeScript AST定位，行按当前LCOV节点起点。条件为归一化节选；短路表达式显示所属整体表达式，具体臂仍按报告编号，不把相同节选当同一个臂。长行用省略号。
- 当前39臂中，**25臂为E0=待确认，11臂为E3=当前调用域的构造/前置保证，3臂为E4=旧路径退役审查候选**（证据见下）。E3/E4仍在未覆盖分母，不算已覆盖、不自动授权删除。类型可选/难构造不能单独证明可达或不可达。
- 本表0命中不写“已有覆盖”；39臂不是39个已确认bug，也不是整卡全部剩余工作。GLM打开身份子包已接收，identity-foundation返工经Codex接收修订，统一质量门见工作包；旧路径/性能/终审按父卡继续。相邻open-actions/handle-store/workspace-context尚有2/0/2臂，不混入本表两文件计数；handle-store函数仍32/33，不能将分支100%写成整模块100%。
- 原119臂的精确历史清单由Git保留；[preflight接收结论](editor-save-recovery-glm-preflight.md#codex-fae10e55接收结论2026-09-12)仍是该时点事实，不冒充最新数量。

## 相邻身份基础模块接收（2026-09-13，不混入主表39臂）

[Codex返工接收修订](editor-save-recovery-glm-identity-foundation.md#codex返工接收修订2026-09-136f26cc68)：
两文件27项（GLM候选26项+Codex补旧记录abort1项，接收时收紧断言），最新主线正式并集新增context15臂、handle-store6臂。
context行76/76、函数21/21、分支91/93；handle-store行85/85、函数32/33、分支39/39。
context30/1与32/1仍未覆盖：其缺scenes/maps的helper回退不符合正式loader的完整清单合同，归E4严格化/旧回退审查。
保留分母，不执行“坏清单helper不抛错”来固化兼容行为；公开helper可调用不等于完整工程合法，也不声称该分支JS不可达。

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

## 前批授权生命周期闭环的16臂（E2）

[真实token回归及单点负控](editor-save-recovery-capability-review.md)由Codex执行；最终单次严格fast6,308项确认命中：
wp20/0、25/0、26/0、35/0、42/0、45/0、47/0、50/0、71/0、82/0、85/0、88/0、89/0、91/0、93/0、96/0。
wp覆盖为行402/423（95.03%）、函数58/58、分支395/435（90.80%）；io维持287/290、52/52、215/241。
源码hash、生产文件范围和分母均未变，GLM分支不在本统计内。

## 本批最终取样/恢复快照闭环的6臂（E2）

[10项回归、4组负控及边界](editor-save-recovery-project-io-review.md#最终取样与恢复快照边界起点261c3c66)由Codex执行。
最终单次严格fast6,318项确认wp77/0、80/1、119/0、120/0、123/0，以及io7/0命中；无新回退。
wp当前行405/423、函数58/58、分支400/435；io行287/290、函数52/52、分支216/241。
加载入口显式补齐可选字段不足以证明后续所有命令均如此，io30/1～38/1仍E0，解码non-Error三臂亦不靠替换parser凑覆盖。

## 本批打开身份接收与source修复（E2）

[Codex独立复核及完整质量门](editor-save-recovery-glm-open-identity.md#codex返工接收与r1修复2026-09-1273aa0ea7)：
GLM候选相对最新main新增wp182/1、183/1、183/2、183/3、185/0、190/0、192/0、196/0、199/0、200/1、202/0、203/0、206/0、208/0共14个原缺口。
Codex新增source条件产生新臂193/2且已命中，因此分母435→436、覆盖400→415；**新臂不是又关闭一个旧缺口**，剩余wp35→21。
最终单次严格fast6,337项，wp行413/423、函数58/58、分支415/436；io保持287/290、52/52、216/241。
生产文件范围仍618，未缩分母或测试范围；source新检查是真实功能条件，不以覆盖忽略或删除守卫凑比例。

## 相邻另存为边界（不混入主表46臂）

[Codex另存为10项及三组单点负控](editor-save-recovery-project-io-review.md#另存为边界收口起点7767b67c)通过；
最终单次严格fast6,347项，open-actions新增38/0、45/0、53/0，覆盖106/108，行119/119、函数22/22。
剩余24/0（PAL proof缺席）、49/0（复制observed缺席）的当前调用域前置/构造保证见该回执源码链，标E3但不删除或移出分母。
workspace-persistence/project-io的21+25臂无增减，GLM负责的基础两个模块仍为6/17，不据此宣称本卡全部收口。

## 本批私有helper分支退休（不是E2测试新命中）

[完整调用域证据与回归](editor-save-recovery-project-io-review.md#私有本地记录转换清理起点e963598b)：
唯一caller先同步拒绝非local，故旧helper的sandbox/非local分支无当前生产调用域；重命名localContextFromRecord并仅保留本地来源转换。
保留caller模式拒绝及本地来源白名单，11项公开入口在清理前后均通过；两组单点负控验证错误降级/非法来源仍会被测试捕获。

退休旧175/0、176/0、176/1、177/0、177/1、177/2、178/1共7个未覆盖臂，并同时移除原已覆盖175/1、178/0两个外层判断臂。
wp分支415/436→413/427，行413/423→411/417，函数58/58不变；语句/行全仓分子各减2、分母各减6，分支分子减2、分母减9。
旧175以后的编号已重新分配，不把旧编号在新报告的命中误当贡献；剩余14臂均在未变代码段，逐项与原清单排除上述7项后相等。
最终严格fast6,358项、618生产文件，源码路径/测试范围没有缩窄，覆盖比例未下降；这是实际删除冗余代码的分母变化，不是忽略统计。
project-io、open-actions及GLM两个冻结模块的覆盖与源码均未变；旧writeFile/旧脚本公共管线不在本批删除。

## 当前清单

### workspace-persistence.ts

来源：packages/editor/src/core/workspace-persistence.ts；源码SHA-256：603f76ad063931e1ceeeeec9d338e9c4516df7fbc90d57bbec0da9593ae8d88f。未覆盖14臂。

| 分支/臂 | 行 | 所在函数/回调 | 条件/子表达式（按报告编号） | 当前分类 |
|---|---:|---|---|---|
| 3/1 | 127 | readJsonState | cond-expr：error instanceof Error | 待确认（E0） |
| 4/0 | 147 | writeJsonSidecar | if：!dir | 构造保证（E3，见上） |
| 113/0 | 613 | palDevelopmentTargetFingerprint | if：context.mode !== 'pal-development' \|\| !context.palProof | 待确认（E0） |
| 116/1 | 622 | palDevelopmentTargetFingerprint → 回调@615 | cond-expr：error instanceof Error | 待确认（E0） |
| 117/0 | 632 | readPalDevelopmentTargetValues | if：context.mode !== 'pal-development' \|\| !context.palProof | 待确认（E0） |
| 120/1 | 642 | readPalDevelopmentTargetValues | cond-expr：error instanceof Error | 待确认（E0） |
| 121/1 | 646 | readPalDevelopmentTargetValues | binary-expr：palExpectedFingerprints.get(context) ?? context.palProof.expectedFingerprint | 待确认（E0） |
| 122/0 | 648 | readPalDevelopmentTargetValues → 回调@647 | if：!values.has(path) | 待确认（E0） |
| 124/0 | 660 | fingerprintPalExpectedValues | if：context.mode !== 'pal-development' \|\| !context.palProof | 待确认（E0） |
| 126/0 | 663 | fingerprintPalExpectedValues → 回调@662 | if：!values.has(path) | 待确认（E0） |
| 158/0 | 775 | preflightFirstSaveTarget | if：entryBinding && entryBinding.workspaceId !== context.workspaceId | 待确认（E0） |
| 159/1 | 775 | preflightFirstSaveTarget | binary-expr：entryBinding && entryBinding.workspaceId !== context.workspaceId | 待确认（E0） |
| 164/2 | 804 | authorizeFirstSaveTarget | binary-expr：previousAuthor && (previousAuthor.dir === dir \|\| (await previousAuthor.dir.isSameEntry(dir))) | 待确认（E0） |
| 169/0 | 823 | authorizeFirstSaveTarget → verifyWorkspace | if：metadata.sandbox.kind === 'invalid' \|\| metadata.palDevelopment.kind !== 'missing' | 待确认（E0） |

### project-io.ts

来源：packages/editor/src/core/project-io.ts；源码SHA-256：4f592fc9611038c4f7acbd7c248675e1cd7929a6495357e6083b1e9fba8a996d。未覆盖25臂。

| 分支/臂 | 行 | 所在函数/回调 | 条件/子表达式（按报告编号） | 当前分类 |
|---|---:|---|---|---|
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
| 79/1 | 559 | writeProject → 回调@499 → rememberWrite | binary-expr：signature ?? (value instanceof ArrayBuffer ? await binarySnapshotSignature(value) : serializeOne(value)) | 构造/前置保证（E3） |
| 80/0 | 560 | writeProject → 回调@499 → rememberWrite | cond-expr：value instanceof ArrayBuffer | 构造/前置保证（E3） |
| 80/1 | 560 | writeProject → 回调@499 → rememberWrite | cond-expr：value instanceof ArrayBuffer | 构造/前置保证（E3） |
| 84/1 | 604 | writeProject → 回调@499 | binary-expr：sizes.get(rel) ?? 0 | 构造/前置保证（E3） |
| 88/1 | 609 | writeProject → 回调@499 | binary-expr：sizes.get(catalogPath) ?? 0 | 构造/前置保证（E3） |
| 91/1 | 620 | writeProject → 回调@499 | binary-expr：sizes.get(rel) ?? 0 | 构造/前置保证（E3） |
| 93/1 | 626 | writeProject → 回调@499 | binary-expr：sizes.get('manifest.json') ?? 0 | 构造/前置保证（E3） |
| 96/1 | 629 | writeProject → 回调@499 | binary-expr：sizes.get(catalogPath) ?? 0 | 构造/前置保证（E3） |
| 114/1 | 702 | preflightProjectWriteSet | cond-expr：cause instanceof Error | 待确认（E0） |
| 116/1 | 712 | preflightProjectWriteSet | cond-expr：cause instanceof Error | 待确认（E0） |
| 118/1 | 722 | preflightProjectWriteSet | cond-expr：cause instanceof Error | 待确认（E0） |
