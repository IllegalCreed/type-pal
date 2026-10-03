# TEST-CURSOR-ASSET-UI-LARGE-1 — Editor资源编辑/叶组件/设计控件大包补测

Status: review
Phase: phase2
Capability: editor-assets-leaf / test-coverage
Coding Owner: Cursor（仅新测试/专属fixture/证据）
Generation Owner: N/A（不生成美术）
Reviewer: Codex（独立验收与正式结算）
Visual Verification Owner: Cursor最小功能验证，Codex终审
Visual Verification Timing: dev-functional（自有合成小工程，不走剧情）
Contributor: Cursor
Branch: `codex/cursor-asset-ui-large-r1`

## 目标、隔离与范围

十批连续交付：**700合法未重复新合同、70工作组、50有效反控、12真实功能流程**。
[共同协议](../../testing/grok-cursor-large/README.md) GC-1及
[精确74源/SHA256](../../testing/grok-cursor-large/targets.json)为硬边界；
历史1431未命中臂不是现在覆盖、全部可达或收益承诺。

Cursor拥有表内资源编辑叶组件、design-system与相关sprite/frame/tileset/audio/stamp草稿服务；
App/MapMode/ScriptEditor/SceneCanvas/保存/诊断/Actor与一般数据表等不在源表的主合同仍GLM P。
design-lab只读消费者；资源源的行为测试可调用公开只读EditSession/命令，不mock核心凑oracle。
L/M、旧Cursor/Grok治理/资源/帧动画测试及P最新67例先逐断言排重，不以不同suffix当新合同。
深链#0、Esc通知与所有E2E产品卡只读，不能顺手修产品或改变样式。

工作树：`/Users/zhangxu/.codex/worktrees/cursor-asset-ui-large/type-pal`。
从targets注册提交BASE开 `codex/cursor-asset-ui-large-r1`，生产冻结完整值见协议。
只写editor新 `.cursor-r1.test.ts(x)`、`src/__tests__/cursor-asset-r1/**`、
`docs/testing/grok-cursor-large/cursor/**`。不向reforge/content/shared写测试/fixture或产品。
公共IO边界可typed spy、业务命令/资源编解码/会话必须真实调用，禁止照搬旧非法测试fixture。

## 前提真值门与上下文

前提：canonical作者资源编辑、选择、异步归属和键盘入口已存在，结果可经真实公开状态/DOM/资源读回；
只补测试证据，不改变UI形态、保存版本、机制或兼容开发旧格式。before→after为合同覆盖增强。

| 维度 | 已核直接证据/边界 |
|---|---|
| primary | `ui/SpriteUploadWizard.tsx:80–195`真实session/selection/revision/外部decode入口；`ui/design-system/reorder.tsx:48–125`公开insert/swap/no-op/目标排除 |
| 第一阶段 | 仅现行菜单/显示形态参考，不改变布局；不把一阶段索引坐标或动态palette带回二阶段 |
| 二阶段 | `core/frame-animation-draft.ts:51,112,163,216,256–293`草稿/帧/历史真实入口；`ui/AudioAssetWorkbench.tsx:371`策略/transport边界；表内stamp命令/草稿真实公开入口 |
| 目标 | 合法完整typed EditorState/EditSession，公开操作→真实命令→状态/DOM/资源oracle；所有数据/资产合成且隔离 |

最强替代解释：未命中只是旧测试已证或需要非法输入/私有闭包/新接口。
推翻观察：只能mock业务核心、用as never/unknown双桥、改产品字段或偷私有state才覆盖，停该组举证。
不可合法构造必须查真实caller/公开seed，不凭类型猜blocked；分类不得整体缩围。
先读READ-FIRST、frame-editor历史回归和L/M旧断言，再读每个主源真实公开调用域。

旧证明必须抽查实际matcher：
`ui/SpriteUploadWizard.test.tsx:82,123`多帧源/锁重复提交；
`ui/BattleSpriteLibrary.test.tsx:282–664`fail-closed/引用/用途/缩短帧；
`ui/AudioAssetWorkbench.test.tsx:151,229`短音端点/异步删除重新核引用；
`ui/design-system/reorder.test.tsx:251–1159`键盘/pointer/取消/token/no-op。
它们只读；其中旧mock/强转不是本卡合法fixture许可，不重领已证生命周期合同。
关联资料：[Codex帧动画编辑](../../testing/codex-frame-editor/README.md)、
[L/M/N并集](../../testing/glm-next-triple/codex-lm-union-review.md)与共同协议P固定候选。

## 十个连续批次（每批7组，约70新例/5有效反控）

| 批 | 主范围 / 精确结果 |
|---|---|
| C01 | WorldSpriteLibrary静态资源；选择/过滤/引用/命令结果，排L/M与旧业务；自动脚本/完成流投影因main源漂移只读停线 |
| C02 | BattleSpriteLibrary + battle-sprite-commands/import；用途/ABI/引用/共享帧迟到保护，不伪造引用索引 |
| C03 | SpriteUploadWizard/ResourceViewer/上传叶与真实image-import；合法输入/重复/取消/迟到释放 |
| C04 | FrameAnimationEditor + draft/history；真实时长/插删换排/undo-redo与选择归属 |
| C05 | SpriteActionEditor/Dialog/FrameWorkbench与sprite-actions/commands；真实动作帧及资源身份 |
| C06 | PreviewCanvas/EnemyAnim/Fire/BattleInline/Portrait/Entity动画叶；真实不透明像素、清理和选择恢复 |
| C07 | ImageTab/static-image/frame-images/worker-client/codec；真实合成字节、边界IO与资源关闭 |
| C08 | TilesetTab/commands/references + Stamp叶/draft/template；只测表内主合同，不抢MapMode/SceneCanvas |
| C09 | AudioAssetWorkbench + audio-preview/session；合成音频策略IO/transport/引用重新核验，不改audio运行时 |
| C10 | design-system select/reorder/virtual-list/navigation/number/overlays等；键盘焦点/取消/归属，排历史治理与adoption已证 |

七轴扫描：创建；编辑/替换；删除/引用阻断；撤销重做；取消失败恢复；键盘焦点；迟到与资源归属。
无对应轴则N/A，不虚构API。100%源旧证明充分则existing-proof，不硬造参数化测试。
12条实际自有小工程功能流程覆盖至少资源6/设计控件4/异步失败恢复2；
宽窄窗+键盘/真实前后状态，截图SHA256及完整console分类。流程必须不同合同，不拿截图数充数。
不能接管其它会话浏览器/6010服务，先查端口/归属，复用只读可用服务或自有隔离宿主。
新增browser/visual子目录须从自己的README链接。真实Canvas2D不可用诚实blocked，不fake像素。

## 验收与当前推进

协议要求700最终合法新例、70组/50枚有效counter全三态、真实拒收探针、12流程、
file/fullName/status、逐合同条件/caller/旧断言matcher/新axis/精确oracle，
私有同分母coverage与准确receipt、缺陷/未证账。不得在模板账后用总数宣称完成。
每批定向相邻/editor typecheck；末批串行editor全包test/typecheck、根lint完整0/0/0、
docs/diff/verifier。环境或存量异常单列给Codex、不越界修，不把exit0当全门通过。
源或执行集变动仅重采受影响counter；不追溯改写历史原证据。

Codex核74源hash、公开入口、旧证明与GC-1分配，**build allowed仅新测试白名单**。
作者交付pending；Codex独立accept/done blocked。用户产品体验裁决N/A（纯补测，形态不变）。
700不足只能逐条件举证交Codex裁决；不能把不可合法输入等同授权修接口。
派发前与当前main逐源核hash：world-sprite-behavior不一致，已移出保留表，
以未漂移stamp-commands替换；自动脚本预览与完成流相关轴不开放，不能对旧投影冒称当前合同。
贡献者不合main、不标done、不跑官方ratchet/清树；正式收益只认Codex并集实测。

## 下一位Cursor提示词

```text
你是TEST-CURSOR-ASSET-UI-LARGE-1唯一测试Owner Cursor。在本卡指定隔离工作树/分支，从grok-cursor-large/targets.json注册提交完整BASE开工。
先读AGENTS、READ-FIRST、本卡、grok-cursor-large共同协议/targets、帧动画与L/M历史证明；用git show固定P候选读67例断言，核冻结与真实排重。
连续C01-C10，700合法未重复新合同/70组/50有效反控/12自有小工程真实功能流程，不逐批等继续；首批真账和typed宿主小样，每批定向相邻/typecheck，阶段提交推送后继续。
仅新.cursor-r1测试/专属cursor-asset-r1 fixture/cursor证据可写，主合同仅74源；App/MapMode/ScriptEditor等P剩余源只读。产品/旧测/共享文档/配置/官方baseline/真实数据/其它队列只读。
禁止非法fixture、强转桥、核心mock、私有state/扩大timeout；新机制/真缺陷/源漂移仅停受影响组举证。交完整fullName JSON、实际旧断言和精确oracle、counter三态原证据及拒收自测、私有覆盖和真实视觉流程证据。
末批串行editor全包test/typecheck、lint0/0/0、docs/diff/verifier，推完整真实候选SHA；不合main、不标done、不跑正式ratchet。
```


## Codex r1 独立验收（2026-10-02，最新）

固定6ea1b41ff30e8bf532a78e98af991128947da9df（测试6a16751e7a12e1e1a3734fb749dcfe7547226dfd），counter/rework。新Editor4493全绿、58文件707身份状态对应/typecheck零；根lint FAIL 1 error format（_vitest-raw.json），docs/diff/716冻结与120分配源/795白名单过。50三态结构/patch/hash对应但仅43不同目标；至少7新合法目标尚缺，判据换邻居/exit2/真实raw异常误收，实际错目标runner泄漏已证（Reviewer只清自己探针树）。双桥/伪batch、3000ms等待、707模板真账未闭；至少九重复/未证使净新上限≤698、缺口≥2且待全量排重。23截图hash过但12流程不接受：固定计数/null聚焦/自画色块/无选择变化/缺失未恢复/DS错误prop只读/键盘未执行/失败中相未证。2针6相新重放通过；未变业务证据保留、只重采受源/身份变动针。700/70组/50不同目标/12真实流程不缩，未main/done/正式结算。

[详细审核与交接](../../testing/grok-cursor-large/codex-grok-cursor-r1-review-20261002.md)、[机器证据](../../testing/grok-cursor-large/codex-grok-cursor-r1-review-20261002.json)。不写贡献者树、不自动投递；用户手动转发以下最新提示词。

### 下一位 Cursor 提示词（覆盖旧交接）

```text
继续TEST-CURSOR-ASSET-UI-LARGE-1，唯一Cursor测试Owner，原树/Users/zhangxu/.codex/worktrees/cursor-asset-ui-large/type-pal、分支codex/cursor-asset-ui-large-r1，固定6ea1b41ff30e8bf532a78e98af991128947da9df、测试6a16751e7a12e1e1a3734fb749dcfe7547226dfd。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/testing/grok-cursor-large/codex-grok-cursor-r1-review-20261002.md/json及原卡最新段，逐项闭CURSOR-R1-01～04。_vitest-raw.json正常机械格式化保留JSON值与原日志，lint须完整0/0/0；tileset引用fixture双桥和伪batch改完整typed/真实公开batch，frame-editor自定义3000ms等待改默认观察就绪，不扩timeout。唯一judge补mutant完整身份/raw和三相异常/恰exit1/真实拒收自测；die改throw+外层exitCode，建树/复制/各相全部finally局部清理，错目标实际泄漏已证，禁止全局prune。50存档三态hash对应但只43不同目标，旧合同扣净新；新增至少7真实不同合法目标，不能拆标题。重建707逐合同真账（真实primary源条件/caller/合法输入/旧SHA fullName断言matcher/精确oracle），删重或existing-proof：C09-G02-01/02/03/05/10旧owner例直接已证，-06无新oracle；C09-G01-04旧LRU直接已证；C07-G01-02/10被本组-01完整列表包含。当前净新上限≤698仍待全量排重，700/70组不缩。视觉按审核修R01行集/R02用途/R03聚焦/R04真实产品Canvas/R05选择变化/R06真实恢复/DS03错误prop与只读伪证/DS01-02真实键盘/AR01失败中相；23截图hash、已证AR02错误清除及DS鼠标/虚拟滚动保留，不全部重拍，不抢6010/E2E。判据变而源/身份不变可重判保留50旧存档；源或执行集变动仅重采受影响针。派发0704d3de6d3d2a2099475a42f601b654bba08579、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，仅原editor新.cursor-r1测/专属cursor-asset-r1 fixture/cursor证据可写，74源主合同边界保持；产品/旧测/配置/baseline/真实数据/GLM/Grok/共享文档只读。末批Editor全包/typecheck、根lint完整0/0/0、docs/diff/verifier，交真实完整SHA、准确执行/净新/存档/不同目标/流程与未完账。不合main、不done、不正式ratchet/protected，不批量清共享临时树或退休原树。
```


## Codex r6独立复核（2026-10-02，最新；覆盖旧交接）

固定6459e906097594277bd0761d48367a0c148d5d9b，证据57221d6de0c1a7e74e6cd10f51b219b4b7dec006。
旧10诊断/最终17核定+700候选分离/完整.not oracle修复接受，原package/依赖/配置全字节未变，
明确复用独立723/723与typecheck零，未新跑全Editor4503或54变异/12视觉。
**counter/rework**：final pin新增receipt.reworkCloses一格式error，原候选完整lint1/0/0；
自有副本judge/generate/正常format后完整3289文件0/0/0，生成717合同语义改动0，不冒称作者HEAD绿。
新docs/diff/716冻结/120分配源/849白名单过，54三态仅C05-10三JSON格式值不变，净新目标50门保持。
真账612旧matcher/19裸export/104 caller-none未闭，105旧blob中C05-G05-06一错配，
C05-G01-03值相等≠引用、C03-G04-03失败≠恢复、C04时长oracle须按子轴；中间空洞已accept不重开。
C01-G01-10引用tab可见新增旧证明，717净新结构上限≤702不是702已接收；700/70组/50/12不缩。
staging builder实跑C03仍自动70 human-ledger，自动输出应候选不人审；真实17核定保留，
修小项后继续C01-C10完整源条件/caller/合法输入/旧完整matcher/全部oracle真账，不仅交工具完成。

[详细审核与当前直接提示词](../../testing/grok-cursor-large/codex-cursor-r6-review-20261002.md)、
[机器证据](../../testing/grok-cursor-large/codex-cursor-r6-review-20261002.json)。
未作者/main/浏览器/UI/模型操作，未官方门/覆盖结算；Kimi/Grok限额短审done不续派。

### 下一位Cursor提示词（当前；用户手动转发）

```text
继续TEST-CURSOR-ASSET-UI-LARGE-1，唯一Cursor Owner。原树/Users/zhangxu/.codex/worktrees/cursor-asset-ui-large/type-pal，分支codex/cursor-asset-ui-large-r1，固定6459e906097594277bd0761d48367a0c148d5d9b，证据57221d6de0c1a7e74e6cd10f51b219b4b7dec006。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/ops/tasks/TEST-CURSOR-ASSET-UI-LARGE-1.md最新段及同树docs/testing/grok-cursor-large/codex-cursor-r6-review-20261002.md/json。旧10诊断/最终17核定+700候选分离/.not完整oracle进展accept，旧723/typecheck/54针及净新50目标门/12视觉保持，不重做、不全重采、不补针。只闭CURSOR-R6-01/02并连续C01-C10真实账：最终pin后receipt.reworkCloses仍1格式error，正常格式化保留值，所有最后回执/SHA编辑后完整根lint0/0/0，不只验前一提交或过滤目录。C05-G05-06旧文件blob错配，SpriteActionEditor.test.tsx真实16cb19c3a212375371d688afe32faa0262c33026，核完整旧matcher/新notice部分轴；C05-G01-03旧deep toEqual不证明新同引用toBe，C03-G04-03旧失败alert不证明坏→好恢复，C04-G07-05旧帧序不独证全部duration，新旧按子轴pending/核定，不自动裁全旧。C01-G01-10同公开引用tab/panel旧:811-842已更强证明，existing-proof扣新；保留C05-G01-06中间空洞已accept。staging builder实跑C03仍自动70条human-ledger，自动输出须false/staging-draft，不把候选直接并成人审，保留真实17核定；修工具后继续实质逐条件旧正文核验，不再仅交工具完成。717执行/净新上限≤702仍未全量排重，612 oldMatcher none/19裸export条件/104 caller-none逐项真实source守卫/合法输入/生产caller或有证N/A/旧完整SHA-fullName-matcher/全部业务oracle，真差额不足700才补；原700/70组/50目标/12流程不缩。仅原editor新.cursor-r1测试/专属fixture/cursor证据可写，74源/派发0704d3de6d3d2a2099475a42f601b654bba08579/冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，其它Owner/产品/旧测/配置/baseline/真实数据/共享文档只读，不擅迁main版本。每批定向相邻/typecheck阶段推送后继续真账，只源/执行集真变重采受影响针；末批Editor全包/静态0/0/0/docs/diff/verifier/真实完整SHA及准确未完账。不合main、不done、不官方门、不清原树或共享临时树。
```

## Codex r5独立复核（2026-10-02，历史）

固定f7f64784e176eb233ae74a67fe811270f0f8dea5，证据cac301580d1988e65c97eedf55b623e98289e596。
新723定向相邻绿/717身份、54三态结构hash/patch对应；新C05-10中间空洞为旧尾空位未覆条件，
独立旧3绿/恰新1红、恢复13全绿/source逐字节恢复，净新目标数量50门关闭，不再换针。
typecheck/docs/diff/verifier过但完整lint真实5error+5warning（staging未用import/literal模板/格式，
C05-10三相JSON与receipt格式），685旧matcher/717自动human标记、部分.not不完整oracle仍counter。
717扣十四旧证上限703未全量排重，700/70组/50合法目标/12流程不缩；只当前静态+真账返工，
旧kind/视觉/typed/judge关闭项不重做，不全量重采54或仅报告工具完成。

[详细审核与当前返工提示词](../../testing/glm-tenfold-triple/codex-opqc-r13-review-20261002.md)、
[机器证据](../../testing/glm-tenfold-triple/codex-opqc-r13-review-20261002.json)。整卡rework，
未作者/main/UI/模型写入或正式门/结算；诊断仅自有副本串行已恢复，不冒称作者静态全绿。

### 下一位Cursor提示词（用户手动转发，优先于下方历史）

```text
继续TEST-CURSOR-ASSET-UI-LARGE-1，唯一Cursor Owner，原树/Users/zhangxu/.codex/worktrees/cursor-asset-ui-large/type-pal、分支codex/cursor-asset-ui-large-r1，固定f7f64784e176eb233ae74a67fe811270f0f8dea5。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/ops/tasks/TEST-CURSOR-ASSET-UI-LARGE-1.md最新段及docs/testing/glm-tenfold-triple/codex-opqc-r13-review-20261002.md/json完整Cursor范围。新中间空洞针独证旧3绿仅新红，54目标扣四旧项净新50数量门关闭，别再换/补针、不重拍12视觉/旧kind/judge/typed。只闭CURSOR-R5-01/02：真实5error+5warning，staging两unused import/三literal模板/format、C05-10三相JSON与receipt格式，保留literal字节/JSON值/raw，正常生成收尾格式，自测/生成后lint完整0/0/0，不ignore/降规则/删证据。685 oldMatcher none与717自动humanVerified不构真正人工排重，C01-C10逐条件真实源码/caller/合法构造/旧fullName matcher/不同axis/完整oracle，.not片段补到matcher，候选与确认分离，保留人工值，不只交工具完成。703结构上限不是700接收，全量排重后真差额不足才补例；原700/70组/50目标/12流程不缩，原白名单外只读、74源/派发冻结不变、不擅迁版本。每批定向相邻/typecheck推送后连续真账，真变源/执行集仅受影响针重采，不全重采54；末批全包/静态0/0/0/docs/diff/verifier/真实SHA和余账，不main/done/官方门/清原树或共享临时树。
```

## Codex r4独立复核（2026-10-02，历史）

固定e3bcc779d52a8e3ed2a1a9b2ceb3c3fe1e1c3db4，证据967ec2f8e3f7c17c2a191617deaeb09665b65857。
新728定向相邻绿/717身份、53三态结构/hash/patch对应，两selftest/typecheck/3272文件静态0/0/0/
docs/diff/verifier过。四旧分类/C05-08 cross-check及精确kind C08-34独立感度accept：旧9绿、仅新kind1红。
替代C05-09的order0/缺省仍旧wave2完整数组直证，独立旧新13例2红，转cross-check后净新目标≤49至少缺1。
新增第十四旧证明，717上限703未全量排重；663旧matcher none、433 humanVerified来自共享字符串工具，
props非条件/harness非生产caller仍counter。原700/70组/50合法新目标/12流程不缩，继续真实账，不重做已闭工具/视觉。
诊断两源已逐字节HEAD恢复、32控制全绿，不写作者树/不冒称业务多红是有效新针。

[详细审核与完整返工提示词](../../testing/glm-tenfold-triple/codex-opqc-r12-review-20261002.md)、
[机器证据](../../testing/glm-tenfold-triple/codex-opqc-r12-review-20261002.json)。整卡rework，
未UI/模型操作、未main/done/正式结算；本轮没有新跑Editor全包，不用作者4503摘要替独立门。

### 下一位Cursor提示词（用户手动转发；优先于下方历史）

```text
继续TEST-CURSOR-ASSET-UI-LARGE-1，唯一Cursor Owner，原树/Users/zhangxu/.codex/worktrees/cursor-asset-ui-large/type-pal、分支codex/cursor-asset-ui-large-r1，固定e3bcc779d52a8e3ed2a1a9b2ceb3c3fe1e1c3db4。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/ops/tasks/TEST-CURSOR-ASSET-UI-LARGE-1.md最新段及docs/testing/glm-tenfold-triple/codex-opqc-r12-review-20261002.md/json，执行最新Cursor完整范围。四旧分类/旧C05-08/精确kind针C08-34已关闭，不重做、不重拍12流程。只闭663旧matcher及真实条件/caller/oracle真账，433 humanVerified标志不是独立人工核定，props类型不是条件、harness不是生产caller；连续C01-C10读旧完整断言逐条件排重，保留真核定值。C05-G01-02/CTR-C05-09是旧missing-order sorts-last，独立同patch旧新2红，转existing-proof/cross-check，再补至少1真新目标。53执行目标扣四旧项上限49，717扣十四旧证上限703仍未全量排重，低于700按真实差额补，不换数字拆标题。700/70组/50合法新目标/12流程不缩，保留53结构有效历史，源/最终执行集变化仅重采受影响针；仅原新测/fixture/cursor证据可写，74源/派发冻结不变，其它全只读。每批定向相邻/typecheck推送后继续，末批全包/静态0/0/0/docs/diff/verifier/真实SHA和准确余账；不合main、不done、不官方门、不清原树或共享临时树。
```

## Codex r3独立复核（2026-10-02，历史）

固定35c977f8407f0e79fa75421df4771fae67b51f27、证据c9067a8d2d45d36ddcc9b2819f418b1fb5492baa。
生成格式/raw EOF、DS01键盘独立相位/DS02宽窄记录、C08非空fixture关闭；新728定向相邻全绿，
717身份/59新文件匹配，typecheck/两selftest零、静态3268文件完整0/0/0、docs/diff/
716冻结/120源/826白名单过。52业务三態结构与hash对应，50未变+2新增，未全重放。
未新跑完整Editor4503，作者摘要不替独立门。整卡仍rework，只余真实合同账/净新目标验收：
708 oldMatcher none、717 export锚、跨行oracle仍缺expected；新增四条旧证明使结构净新上限≤704，
CTR-C05-08是旧零基index，净新目标上限≤49至少还缺1；CTR-C08-34非空退化已被旧:387证明，
如无独立精确关系新轴则也转cross-check，需补第2目标。独立两旧+新诊断分别3红/2红，
恢复35绿且两源逐字节HEAD，不冒称多红诊断是有效新针。原700/70组/50合法新目标/12流程不缩。

[详细审核与最新完整返工提示词](../../testing/grok-cursor-large/codex-cursor-r3-review-20261002.md)、
[机器证据](../../testing/grok-cursor-large/codex-cursor-r3-review-20261002.json)。
不重复已闭窄修、不重拍原12流程、不全量重采52，连续C01–C10真账；本次起审核最终回复
直接附可复制提示词，无需用户再提醒。未写作者树/未浏览器或会话操作/未main/done/正式结算。

### 下一位Cursor提示词（用户手动转发；优先于下方历史）

```text
继续TEST-CURSOR-ASSET-UI-LARGE-1，唯一Cursor测试Owner，原树/Users/zhangxu/.codex/worktrees/cursor-asset-ui-large/type-pal、分支codex/cursor-asset-ui-large-r1，固定35c977f8407f0e79fa75421df4771fae67b51f27。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/ops/tasks/TEST-CURSOR-ASSET-UI-LARGE-1.md最新段及docs/testing/grok-cursor-large/codex-cursor-r3-review-20261002.md/json，执行其CURSOR-R3-01～02最新完整范围。格式/EOF/键盘相位/非空fixture/旧judge与typed等待关闭，不重做、不重拍整12、不全重采52。连续C01-C10逐条件真账，708旧matcher未核、source仍export参数和跨行oracle缺结果不能算closed；保留分片，核生产caller/合法构造/旧完整fullName及matcher/精确新expected。四旧证明C05-G01-01、C06-G07-02/03/04扣净新，上限704仍全量排重未完，真差额不足700才补。CTR-C05-08旧目标转cross-check，净新目标上限49至少补1；CTR-C08-34若无独立精确关系新轴则再扣，需第2。保留52结构有效旧证据，仅源/最终执行集变动重采受影响针。700/70组/50合法新目标/12流程不缩；派发冻结及74源Owner不变，仅原新测/专属fixture/cursor证据可写，产品/旧测/配置/baseline/真实数据/其它Owner/共享文档只读。每批定向相邻/typecheck推送后继续，末批Editor全包/静态0/0/0/docs/diff/verifier及真实完整SHA/真实未完账。不合main、不done、不官方门、不清原树或共享临时树。
```

## Codex r2独立复核（2026-10-02，历史）

固定f2a1468d844d1678b5304b4ca7a110a480b2d174（测试2e1f7228dce7059d030c7ef3eec8c8aa6697c0d6），counter/rework。新Editor4493全绿/707身份对应/typecheck零，50三态源hash/patch/身份单红对应与50不同执行目标；四旧误收现拒收、纯错目标runner退出2无泄漏，typed桥/默认等待/_vitest-raw格式关闭，不重做旧工具。自测生成judge-selftest.json后lint1format error，区间raw probe末尾空行diff失败；docs/716冻结/120分配源/805白名单过。698旧matcher未锚、688条件仅export、97oracle截断，707扣9旧证后上限698未达700；两counter CTR-C09-04/29对应旧C09-G02-02/05，新增目标上限48，至少补2，不重新要求7。23截图hash过，多数流程阶段接受；DS01鼠标fallback可掩盖键盘，DS02宽键盘成立只补持久相位，C08-G02-02空every未证。700/70组/50新目标/12真流程不缩，未main/done/正式结算。

[详细结论与交接](../../testing/grok-cursor-large/codex-cursor-r2-review-20261002.md)、[机器证据](../../testing/grok-cursor-large/codex-cursor-r2-review-20261002.json)。不写贡献者树、不自动投递；用户手动转发以下最新提示词。

### 下一位 Cursor 提示词（覆盖旧交接）

```text
继续TEST-CURSOR-ASSET-UI-LARGE-1，唯一Cursor测试Owner，原树/Users/zhangxu/.codex/worktrees/cursor-asset-ui-large/type-pal、原分支codex/cursor-asset-ui-large-r1，固定f2a1468d844d1678b5304b4ca7a110a480b2d174。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/testing/grok-cursor-large/codex-cursor-r2-review-20261002.md/json及原卡最新段。旧typed双桥/伪batch、默认等待、_vitest-raw格式、唯一judge四拒收与真实finally清理已关闭，不重做。仅闭CURSOR-R2-01～04：selftest生成judge-selftest.json后lint1format error，修生成/正常格式化收尾，raw probe末尾多空行只清EOF保留正文；连续selftest后lint/diff须零。698旧matcher无锚、688条件只export行、97oracle截断，按批分文件+索引保留完整源码条件/生产caller/合法构造/真实旧SHA/fullName断言matcher/精确结果，不截字段绕1MiB、不让Codex代填；原707执行扣9旧证明后上限698，继续合法余族补至少2真新例并全量排重，不缩700/70组。50存档/50执行目标已结构成立，但CTR-C09-04/29分别是C09-G02-02/05旧证明，不计新增目标，保留历史cross-check；只需补至少2真实不同新目标，不再补7、不拆标题。DS01鼠标fallback可掩盖键盘失败，持久化afterKeyboard/焦点/提交结果，键盘不成功就明确counter，鼠标阶段另列；DS02宽键盘已证只补相位记录，不把窄回b误判；其它已成立视觉阶段和23截图hash不重拍，R04性能warning分类保留不冒称console0。C08-G02-02目前无真实stampPlacement而every空集恒真，补非空合法placement与精确关系集合或existing-proof扣列。判据或账变化且源/身份未变，50旧存档重判保留；源或执行集变化仅受影响针真重采。仅原editor新测/专属fixture/cursor证据白名单可写，74源主合同边界保持；产品/旧测/配置/baseline/真实数据/GLM/Grok/共享文档只读。派发0704d3de6d3d2a2099475a42f601b654bba08579、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，末批Editor全包/typecheck、完整静态0/0/0/docs/diff/verifier与真实完整候选SHA及准确未完账。不合main、不done、不官方ratchet/protected、不清原树或共享临时树。
```
