# Grok / Cursor 大包 r1 独立复核（2026-10-02）

两卡均 **counter / rework**。通过项保留；作者自验不等于 accept/done。
未写贡献者树、未操作 ZCode/模型、未合 main/推 main、未执行官方 ratchet/protected strict-fast，
未正式覆盖结算。只清理本轮自建审查副本及自己的泄漏探针树，不清理贡献者遗留树。

| Owner | 固定本地/远端 HEAD | 测试/证据候选 | 后续区间 |
|---|---|---|---|
| Grok | `919fc291a6e2b5b8710bac756e6a7d28d99dbae7` | `16db4d1ed9d394a2506293e7b4448f8a0c19ceef` | README/coverage-delta/receipt，docs-only |
| Cursor | `6ea1b41ff30e8bf532a78e98af991128947da9df` | `6a16751e7a12e1e1a3734fb749dcfe7547226dfd` | 仅receipt，docs-only |

两树干净、对象真实且远端一致。派发 `0704d3de6d3d2a2099475a42f601b654bba08579`，
生产冻结 `3ac9a2e2f6aba8a5cc97640c18fef8549d199380` 不变。
固定 detached 审查副本 `/private/tmp/codex-gc-review.WO1nJa/{G,C}`，
旧测所需 gitignored raw/extracted / PAL assets 只复制到审查副本，不生成或修改真实数据。

## 独立门与证据

| 项 | Grok | Cursor |
|---|---|---|
| 新全包 test | game **3173/3173**，0 skipped/failed | Editor **4493/4493**，0 skipped/failed |
| directed 对照 | 40文件/400 passed，最终file×fullName×status对应 | 58文件/707 passed，最终身份状态对应 |
| typecheck | 0诊断 | 0诊断 |
| 根 lint/格式 | 2969文件完整 **0/0/0** | **FAIL：1 error format**，不是零诊断 |
| docs / 区间 diff | 零问题 | 零问题 |
| verifier | 716全局/120分配源、零重叠/冻结一致、496白名单路径 | 同源冻结一致、795白名单路径 |
| 存档复算 | 40三态业务/身份/最终原源hash对应，**38份patch可重建** | 50三态业务/身份/最终原源及patchhash对应，**43不同目标** |

Grok 作者记录的全包资产异常是如实单列，没有冒称绿。本轮首次只补extracted时还缺raw，
5条旧snapshot红/7pending；补齐本轮副本raw后全包3173全绿，环境门关闭。
不能把作者3145/13历史数追溯改成3173，也不能因此改旧测/真实产物。

90存档逐枚复算不冒称重跑全部90业务变异。另新重放 **G02-C、G04-A、G10-B、
CTR-C03-02、CTR-C05-06** 五针完整15相：退出0→1→0、执行集/恰一指定AssertionError/hash恢复。
Grok原runner的真实“单红叠未处理异常”探针新跑正确拒收。
Cursor原runner错完整目标探针实际exit2，泄漏一个本轮自建worktree；Reviewer已只回收这一个，registry恢复。
本轮读了Cursor现有截图与23张哈希，没有重复运行旧视觉流程或冒称新拍。

机器记录：[总证据](codex-grok-cursor-r1-review-20261002.json)、
[Grok逐针](codex-grok-cursor-r1-review-20261002-grok-counters.json)、
[Cursor逐针](codex-grok-cursor-r1-review-20261002-cursor-counters.json)。
本轮原始全包/重放/探针JSON与stdout/stderr保存在上述临时父目录；候选原证据仍在各分支。
旧版本兼容审查：pass，本次没有产品版本/兼容代码变动，fixture未被产品引用。

## Grok

### GROK-R1-01 唯一判据漏收不等于40业务针全无效

`run-counters.mjs` 的 judgeMutant 只做 fullName.includes(短id)，不核登记的完整file/fullName。
judgeClean 用顶层numTotalTests/numPassedTests，不核实际叶非零与总数闭合；
两者漏 suite collection/runtime 总门。
直接调用这份真实判据，用G01-A存档构造独立反例：

- 正/反相同样换成带G01-A07的错误完整标题，sameNames一致，仍收为正确注册合同；
- 指定单红叠另一空断言failed suite及numRuntimeErrorTestSuites=1，仍收；
- numTotalTests增加1但实际叶未增加，仍收；
- clean顶层声称1通过、实际testResults空，仍收。

真实raw未处理异常探针则已正确拒收，exit/signal与正常恢复也保留。
将判据提取为唯一可导入模块，runner和正反自测共用；只去临时root前缀，保留包/子路径。
登记完整目标、多重执行身份、实际叶计数和suite/runtime/raw/spawn门。
**只改判据且源/身份未变，可以重判保留40存档，不要求全40重采**。

### GROK-R1-02 两份patch打包坏，不要求重造合同

G02-C patch hunk标7行但内容只有6行，git apply报corrupt patch line11；
G04-A缺源码空白上下文，现有hunk无法应用。
从needles.json原from/to各唯一替换能得到**与meta完全相同的mutant SHA256**；
两针完整三态新重放也成立。只重生成正确可应用patch、重建校验、同步索引，不用重采未变JSON/raw。
其它38份patch可从最终源重建hash。

### GROK-R1-03 六组像素本身是真读回，图像落盘/hash还未交

G04-D08/G05-A11/G06-A12/G07-B13/G08-D07/G10-B01等从真实canvas getImageData读不透明RGBA，
有256色板、真实Framebuffer和真实渲染/flush；本轮全包绿，代码/执行证据可接收。
六条boot/precache功能宿主也是真DOM操作断言，不是剧情世界后门。
但证据目录没有任何PNG/JPEG/WebP或图像hash，卡面“像素/宿主日志及截图hash”仍未交。
只补这些已有合成canvas/功能宿主最小图像落盘与对应hash/读回日志，
不重新走PAL剧情、不启动PAL001/002、不生成替代美术。

400执行/40组/40不同反控目标已实证；合同账400行的63个旧测试blob全部与派发树一致，
所抽查的loader装配、屏幕镜像、Uint8截断、真实canvas入口和录制对象归属有具体条件/旧matcher/新轴。
不把G09-A07的新增frameNum oracle误扣成旧“空held”重复；不凭数量臆判整包凑数。
仍不宣称400合同已逐项最终accept，待上述判据/证据收口后做最终去重/验收及并集门。
**这次不用扩成另一大包或补回已登记existing-proof，只修明确项**。

## Cursor

### CURSOR-R1-01 硬门与typed fixture

完整根lint失败项是 `_vitest-raw.json:0 error format`。正常机械格式化可用；
JSON值和原输出公告保留，不加ignore、不降规则、不删证据逃门。
`tileset-references.c08-g02.cursor-r1.test.ts:86`仍 `as unknown as EditorState`；
同文件:147还以 `{} as MapReferenceEdgeBatch` 冒充真实batch（即便前置拒绝不用到，也不合法）。
构造完整EditorState、真实公开扫描batch或明确不可触及callback抛错，不用桥。
`frame-editor-harness.tsx:303`自定义waitFor timeout3000/interval5不符默认超时纪律，
改可观察就绪条件与默认等待，不扩大timeout或用mock业务通过。

### CURSOR-R1-02 回退到旧版judge，实际拒收泄漏

当前judgeMutant没有 expectedIdentitySet/rawOutput 输入，只比数量，且只拒exit0。
用真实CTR-C03-02三态报告和Grok真实Vitest异常stderr，直接模块调用四反例全部误收：
同数量换passed邻居身份、exit2、mutant叠真实未处理异常raw、clean叠同raw。
恢复相有身份比较，**不等于mutant身份已核**。按当前协议补唯一judge与真实进程拒收自测。

runner的die(process.exit(2))从try内退出，finally不执行；建树/依赖同步也在try外。
错完整目标的实际runner探针exit2并遗留注册树，本轮已证，不只是静态推测。
改throw+外层exitCode，整个建树/复制/三相纳入finally，只清本次mkdtemp，不全局prune。
历史贡献者遗留树本轮没动；贡献者只可在逐一证实属于自己已失败且无人运行后精确清理，
不能对整个临时目录/共享worktree做批量删除。

50业务存档最终hash/三相身份与单红结构均对应，不全部宣告失效；
判据变但业务源/执行集不变时重判保留，受源/执行集变化影响的针才重采。
**50存档只有43不同file×fullName目标**；例如C05-06/07同目标，其它重叠见机器记录。
50有效不同合同目标尚至少缺7，且旧合同针须另扣新配额；不能换标题拆同目标补数字。

### CURSOR-R1-03 707不是已验合法净新，模板账和拆旧例未过

generate-contracts.mjs把整批primarySource归到一个UI文件，caller/输入/旧断言/oracle全用统一描述。
如音频owner实际主源audio-preview-session.ts却统一AudioAssetWorkbench；
没有逐条件/生产caller行、旧SHA/fullName/断言matcher、精确操作数和值。
defects.md承认“路径级引用”不能替代协议要求。必须重建真账，不能让Reviewer替作者补707行。

明确排重反例：旧audio-preview-session.test.ts完整单例已直接断言首次/重复claim不stop、
新owner停止旧owner并成为owner、release非活动owner不影响当前、重复stop只stop一次。
新C09-G02-01/02/03/05/10只是拆这些旧断言，不计新；
C09-G02-06只有两次stop、无显式业务oracle，且空owner重复stop路径旧例已执行，不能作独立新合同。
C09-G01-04 LRU get(a)再load(c)淘汰b与audio-preview.test.ts原例同条件同结果。
另C07-G01-01已精确锁定完整四kind列表，-02唯一性/值与自身相等、-10否定其余kind均是同包冗余证明，
不另计两个新合同。上述九条已足以使**净新上限≤698，缺口≥2**，不是最终全量去重数。
其它新增合法轴保留，逐组真账复核后再算；70组/700目标不自行缩围。

### CURSOR-R1-04 十二流程不能按pass布尔收口

23截图hash全匹配，但oracle/真实操作不支持“12完整流程”：

- R01只核input读回和固定definitionCount，未核实际过滤后的行集；before/after过滤oracle仍空。
- R02 purposeFilter始终空且battleSpriteCount固定，谓词只要求不是undefined，无法证明用途筛选。
- R03 after focusObjectId仍null，catalogSize≥0的兜底使未聚焦也pass。
- R04截图仅12×12色块；host直接fillRect，没有调用产品PreviewCanvas，不计产品预览流程。
- R05一开始就selectedTileset=flow-tileset，之后只缩窗、未选择，不能证明选择变化。
- R06“recovered”截图仍显示0项和ghost缺失；after依旧showsMissing=true，predicate只查初态。
- DS03把不存在的onValueChange传给DsNumberField；console两条error明示未知handler/受控只读。
  实际只是只读value=2未变，不是取消已编辑draft。改用该产品真实公开草稿边界/合法prop，核中间draft与恢复。
- DS01、DS02确有鼠标引起的order/value变化，可保留鼠标合同；源码却未执行所写的ArrowUp/Enter序列，
  不能把按钮点击叫键盘验收。补真实键盘操作和焦点/值断言或诚实收窄交接标题，卡面键盘覆盖另补。
- AR01没有保存/核afterBad错误，只比较idle→applied，跳过失败阶段也可pass；补真实错误→合法恢复三相。
  AR02已核error true→false，可保留此轴，但loadProof始终“error”的注记应修正，别冒称取得某kind。

只重做这些未证/错误阶段；已有正确AR02错误清除、DS鼠标改值、虚拟列表滚动与真实截图hash保留。
需要实际产品Canvas/typed合法宿主、宽窄与键盘状态差分、完整console归属；
不以静态截图数充流程数，不修产品、不抢6010/E2E服务。

## 下一位贡献者提示词（用户手动转发）

### Grok

```text
继续TEST-GROK-RENDER-HOST-LARGE-1，唯一Grok测试Owner，原树/Users/zhangxu/.codex/worktrees/grok-render-host-large/type-pal、分支codex/grok-render-host-large-r1，固定919fc291a6e2b5b8710bac756e6a7d28d99dbae7、测试16db4d1ed9d394a2506293e7b4448f8a0c19ceef。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/testing/grok-cursor-large/codex-grok-cursor-r1-review-20261002.md/json及原卡最新段。只闭GROK-R1-01～03：唯一judge可导入且runner/selftest共用，完整注册file/fullName和多重身份、实际叶非零/顶层计数闭合、collection/runtime/raw/spawn与正常exit/signal政策；补已给错完整标题、单红叠空suite、假执行数/零实际叶拒收和真实Vitest单红叠异常探针。原raw异常拒收/真实Canvas/typed代码/400定向/40组与40不同目标、资产副本全包3173已证保留，不重做或扩大另一包。G02-C/G04-A只修两份可应用patch，from/to重建与旧mutant hash及三态已独立成立，不重采未变日志。按原卡给已有至少六组离线真实canvas及功能宿主补最小图像落盘/hash/读回日志，不跑剧情PAL001/002，不生替代美术。其它未变针可按新judge重判保留，源/最终执行集变化才重采受影响针。400合同账63旧blob与派发一致，保持逐条件真账/排重，不为已证轴造数量；完整收口后交真实40位SHA、docs-only锚与实际门数。派发0704d3de6d3d2a2099475a42f601b654bba08579、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，仅原game新.grok-r1测/专属grok-render-r1 fixture/grok证据可写；产品/旧测/配置/官方baseline/真实数据/GLM/Cursor/共享文档只读。末批game全包/typecheck、根lint完整0/0/0、docs/diff/verifier；环境资产单列，不冒称绿。不合main、不done、不正式ratchet/protected、不清贡献者树。
```

### Cursor

```text
继续TEST-CURSOR-ASSET-UI-LARGE-1，唯一Cursor测试Owner，原树/Users/zhangxu/.codex/worktrees/cursor-asset-ui-large/type-pal、分支codex/cursor-asset-ui-large-r1，固定6ea1b41ff30e8bf532a78e98af991128947da9df、测试6a16751e7a12e1e1a3734fb749dcfe7547226dfd。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/testing/grok-cursor-large/codex-grok-cursor-r1-review-20261002.md/json及原卡最新段，逐项闭CURSOR-R1-01～04。_vitest-raw.json正常机械格式化保留JSON值与原日志，lint须完整0/0/0；tileset引用fixture双桥和伪batch改完整typed/真实公开batch，frame-editor自定义3000ms等待改默认观察就绪，不扩timeout。唯一judge补mutant完整身份/raw和三相异常/恰exit1/真实拒收自测；die改throw+外层exitCode，建树/复制/各相全部finally局部清理，错目标实际泄漏已证，禁止全局prune。50存档三态hash对应但只43不同目标，旧合同扣净新；新增至少7真实不同合法目标，不能拆标题。重建707逐合同真账（真实primary源条件/caller/合法输入/旧SHA fullName断言matcher/精确oracle），删重或existing-proof：C09-G02-01/02/03/05/10旧owner例直接已证，-06无新oracle；C09-G01-04旧LRU直接已证；C07-G01-02/10被本组-01完整列表包含。当前净新上限≤698仍待全量排重，700/70组不缩。视觉按审核修R01行集/R02用途/R03聚焦/R04真实产品Canvas/R05选择变化/R06真实恢复/DS03错误prop与只读伪证/DS01-02真实键盘/AR01失败中相；23截图hash、已证AR02错误清除及DS鼠标/虚拟滚动保留，不全部重拍，不抢6010/E2E。判据变而源/身份不变可重判保留50旧存档；源或执行集变动仅重采受影响针。派发0704d3de6d3d2a2099475a42f601b654bba08579、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，仅原editor新.cursor-r1测/专属cursor-asset-r1 fixture/cursor证据可写，74源主合同边界保持；产品/旧测/配置/baseline/真实数据/GLM/Grok/共享文档只读。末批Editor全包/typecheck、根lint完整0/0/0、docs/diff/verifier，交真实完整SHA、准确执行/净新/存档/不同目标/流程与未完账。不合main、不done、不正式ratchet/protected，不批量清共享临时树或退休原树。
```
