# 保存恢复：接收侧未覆盖分支台账

父卡：[EDITOR-SAVE-RECOVERY-1](../ops/archive/tasks/done/EDITOR-SAVE-RECOVERY-1-interrupted-author-save.md)。
本表由Codex根据正式覆盖报告与源码维护，不沿用GLM原回执中缺乏证据的“已有覆盖/不可达”结论。

## 口径与未完成边界

- 最新收口候选退役旧作者抽屉/脚本保存和逐文件写辅助；project-io已变化，wp源码与7087dbad相同。360b2f65历史快照为wp82 + project-io37 = 119臂。
- 前批119→93→82→66→60→46→39；当前为 **12 + 22 = 34臂未覆盖**。从39变化包括io三项旧未覆盖路径退休、wp三项新增命中，以及旧复制链退役后wp98/0失去命中；不能把净减5都当新增覆盖。
- branchId/arm是本次V8报告定位键，不是产品稳定ID；源码或工具升级后必须重生成。
- 条件/函数由TypeScript AST定位，行按当前LCOV节点起点。条件为归一化节选；短路表达式显示所属整体表达式，具体臂仍按报告编号，不把相同节选当同一个臂。长行用省略号。
- 当前34臂中，**4臂E0待确认、30臂E3为当前正式调用域的构造/前置保证**。新增分类依据见下方最终收口审查；所有零命中仍在分母，不算已覆盖、不自动授权删除。类型可选/难构造不能单独证明不可达。
- 本表0命中不写“已有覆盖”；34臂不是34个已确认bug，也不是整卡全部风险。相邻open-actions/handle-store/workspace-context尚有2/0/2臂，不混入两文件计数；handle-store函数仍32/33，journal等模块也仍有各自防御缺口，最终报告逐模块列明。
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

## 最终收口分类依据（2026-09-13）

[完整收口记录](editor-save-recovery-closeout.md)保留质量门、退休和新回归的分别计数；此前各批章节是历史事实。

- wp3/1、116/1、120/1：FSA读取在try外；try内为无reviver的JSON.parse、固定JSON marker parser或Map.set，正常原生JSON错误为Error。替换JSON.parse或伪造File.text返回对象不属于当前宿主合同。
- wp113/0、117/0、124/0：PAL上下文经真实构造器冻结，入口先核proof，后续复用同一上下文；不把可手写结构对象等同现行生产签发路径。
- wp121/1、122/0、126/0：授权签发时登记私有期望指纹，按同一冻结paths填满Map；Map无delete/clear或外泄路径。新增变化路径会推翻本分类。
- wp98/0：旧复制/逐文件写退役后失去的幂等命中。当前唯一生产caller为journal:650的beforeAuthor，execute:546只调用一次，prepared token又一次性消费；恢复执行不传这个hook。公开API仍可重复调用，故保留防御和分母，不称JS不可达。
- io25/1～33/1九个工作副本回退：两条正式启动路径经loader→toEditorState补齐表/变量/诊断；已检查相关命令、物品/人物/战场快照的apply/undo与脚本投影均保持完整值。只限定当前正式入口，不将公开结构类型宣称成运行期强类型保证。
- io私有signature/sizes Map与先前世界变量/scene.id保证仍有效，按新编号映射。旧io三项E4实际退休，不再列为当前缺口。
- E0保留：wp158/0二次绑定读取存在真实await窗口，但尚未证明对应完整产品并发登记链；io107/1、109/1、111/1涉及解压/hash/clone等宿主异步，未穷尽原生拒绝类型，不能凭通常抛Error改为E3。

这些不是减少校验的理由；发现正常入口/命令可产缺字段、可变proof、可丢键Map或新的异常源时应重新核定。

## 当前清单

### workspace-persistence.ts

来源：packages/editor/src/core/workspace-persistence.ts；源码SHA-256：603f76ad063931e1ceeeeec9d338e9c4516df7fbc90d57bbec0da9593ae8d88f。未覆盖12臂。

| 分支/臂 | 行 | 当前源码片段 | 分类 |
|---|---:|---|---|
| 3/1 | 127 | `return { kind: 'invalid', reason: error instanceof Error ? error.message : String(error) }` | 当前调用域保证（E3） |
| 4/0 | 147 | `if (!dir) throw new Error('拒绝未经 workspace policy 授权的 marker bootstrap 写入')` | 当前调用域保证（E3） |
| 98/0 | 555 | `if (state.firstMutationStarted) return` | 当前调用域保证（E3） |
| 113/0 | 613 | `if (context.mode !== 'pal-development' \|\| !context.palProof)` | 当前调用域保证（E3） |
| 116/1 | 622 | `PAL 开发基线指纹文件无效：${path}（${error instanceof Error ? error.message : String(error)}）,` | 当前调用域保证（E3） |
| 117/0 | 632 | `if (context.mode !== 'pal-development' \|\| !context.palProof)` | 当前调用域保证（E3） |
| 120/1 | 642 | `PAL 开发基线指纹文件无效：${path}（${error instanceof Error ? error.message : String(error)}）,` | 当前调用域保证（E3） |
| 121/1 | 646 | `const expected = palExpectedFingerprints.get(context) ?? context.palProof.expectedFingerprint` | 当前调用域保证（E3） |
| 122/0 | 648 | `if (!values.has(path)) throw new Error(PAL 开发基线指纹文件缺失：${path})` | 当前调用域保证（E3） |
| 124/0 | 660 | `if (context.mode !== 'pal-development' \|\| !context.palProof)` | 当前调用域保证（E3） |
| 126/0 | 663 | `if (!values.has(path)) throw new Error(PAL 开发基线期望快照缺失：${path})` | 当前调用域保证（E3） |
| 158/0 | 775 | `if (entryBinding && entryBinding.workspaceId !== context.workspaceId)` | 待确认（E0） |

### project-io.ts

来源：packages/editor/src/core/project-io.ts；源码SHA-256：9a874384af5cf78eb0e1301cf9eff7efe2efda52b23ff75d153126a7d2f12935。未覆盖22臂。

| 分支/臂 | 行 | 当前源码片段 | 分类 |
|---|---:|---|---|
| 13/0 | 229 | `if (!content.worldVariables)` | 当前调用域保证（E3） |
| 18/0 | 242 | `if (scene.id !== asset.id)` | 当前调用域保证（E3） |
| 25/1 | 285 | `enemies: state.enemies ?? [],` | 当前调用域保证（E3） |
| 26/1 | 286 | `enemyTeams: state.enemyTeams ?? [],` | 当前调用域保证（E3） |
| 27/1 | 287 | `battleFields: state.battleFields ?? [],` | 当前调用域保证（E3） |
| 28/1 | 288 | `tilesets: state.tilesets ?? [],` | 当前调用域保证（E3） |
| 29/1 | 290 | `poisons: state.poisons ?? [],` | 当前调用域保证（E3） |
| 30/1 | 291 | `ambiences: state.ambiences ?? [],` | 当前调用域保证（E3） |
| 31/1 | 292 | `shops: validateShops(state.shops ?? []),` | 当前调用域保证（E3） |
| 32/1 | 295 | `diagnostics: (state.migrationDiagnostics?.diagnostics ?? []).filter((diagnostic) => {` | 当前调用域保证（E3） |
| 33/1 | 300 | `worldVariables: validateWorldVariableRegistryV1(state.worldVariables ?? {}),` | 当前调用域保证（E3） |
| 72/1 | 520 | `signature ??` | 当前调用域保证（E3） |
| 73/0 | 521 | `(value instanceof ArrayBuffer` | 当前调用域保证（E3） |
| 73/1 | 521 | `(value instanceof ArrayBuffer` | 当前调用域保证（E3） |
| 77/1 | 565 | `addWrite(rel, files[rel], sizes.get(rel) ?? 0)` | 当前调用域保证（E3） |
| 81/1 | 570 | `needsCatalogShrink ? stagedCatalogSize : (sizes.get(catalogPath) ?? 0),` | 当前调用域保证（E3） |
| 84/1 | 581 | `addWrite(rel, files[rel], sizes.get(rel) ?? 0)` | 当前调用域保证（E3） |
| 86/1 | 587 | `addWrite('manifest.json', files['manifest.json'], sizes.get('manifest.json') ?? 0)` | 当前调用域保证（E3） |
| 89/1 | 590 | `addWrite(catalogPath, finalCatalog, sizes.get(catalogPath) ?? 0)` | 当前调用域保证（E3） |
| 107/1 | 663 | `瓦片集资源 RLE 损坏: ${rel}(${cause instanceof Error ? cause.message : String(cause)}),` | 宿主异常待确认（E0） |
| 109/1 | 673 | `精灵资源 RLE 损坏: ${rel}(${cause instanceof Error ? cause.message : String(cause)}),` | 宿主异常待确认（E0） |
| 111/1 | 683 | `战斗精灵资源 RLE 损坏: ${rel}(${cause instanceof Error ? cause.message : String(cause)}),` | 宿主异常待确认（E0） |
