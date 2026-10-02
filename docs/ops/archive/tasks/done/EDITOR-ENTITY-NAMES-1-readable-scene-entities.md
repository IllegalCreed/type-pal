# EDITOR-ENTITY-NAMES-1 - 实体名称与稳定身份分离

Status: done
Phase: phase2
Capability: W7 / P3
Coding Owner: entity_names 贡献者（交付）；Root存量步骤字段窄修（独立accept）
Contributor: Codex 子 Agent
Generation Owner: N/A
Reviewer: Codex Root 独立验收
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Branch: codex/editor-entity-names

## 2026-10-02清账收口（当前结论）

`e111a273e`的C1/C2/C3/T1全部闭合，完整editor3757项绿；四门扇补名`a05a572f5`已独立核映射/无正文漂移并在6012实际交付。
本轮按用户“先清当前边角再继续005”授权核既定范围与证据，Codex技术accept并归档。
除004上述明确认可外，不补写用户逐项体验签名；下文旧pending/返工/提示保留为过程记录，非当前阻塞。
本次不重跑未变剧情来重复取证。原声录像由E2E-CAPTURE-1承接；全量Q1/Q2、后期命名和发布素材库未因此完成。
无下一位Agent提示词，本卡已收口；[清账母卡](PRE-005-DEBT-1-current-edge-closeout.md)继续当前未完事项。

## 目标与边界

用户2026-10-02批准“最好有个实体名称”：场景实例增加可编辑名称，列表、实体属性、脚本参数和移动轨迹优先显示名称，
编号为次要信息；内部ID、脚本目标和存档状态键不改。已确认客栈角色先命名，未核实体不猜名。

- 实现白名单：content实体名称元数据及校验、editor名称编辑/统一解析/相关显示与回归测试；贡献者是唯一实现写入Owner。
- Root只写本卡/看板/规范文档、已核PAL作者实体label、验收证据；不与贡献者同时修改实现文件。
- 排除：实体ID重命名、NPC身份合并/转为actor、正文/演出/轨迹计算修改、存档升级、digest设计变化、旧版本兼容、恢复原版转换核。
- 候选树：`/Users/zhangxu/.codex/worktrees/e2e-003/type-pal`，冻结基线f5726a504。6012主树服务及页面保持打开，接收前不更新。

## 前提真值门

一句话前提：当前实体只提供稳定ID和actor/sprite/zone外观，sprite实体没有独立作者名称，补名称比改身份更符合作者阅读诉求。

| 维度 | 真值与直接证据 |
| --- | --- |
| 原版/primary source | N/A：实例作者名称是新编辑器元数据；剧情命名依据现行正文和已核RF001～003，不声称原版提供实体命名字段。 |
| 第一阶段 | N/A：没有此场景作者编辑器；本任务不修改第一阶段或游戏渲染表现。 |
| 当前二阶段 | `content/src/index.ts:71–91` EntityBase没有名称，BaseSceneEntity继承它；`editor/src/ui/App.tsx:3527–3548`仅actor解引用名字；`command-form-controls.tsx:125`直接以ID为下拉label；`PreviewCanvas.tsx:766–777`仅actor有中文轨迹名；`script-world.ts:102–113`以scene/entity ID记录持久行为。 |
| 本任务目标 | 可选非空`label`只用于作者阅读；显示优先级为实例label→actor人物名→ID，同名仍以ID区分；保存重开保真、可撤销重做，所有引用和执行行为不变。 |

最强替代解释：用精灵名称或修改e59即可。精灵是共享外观，不能推定实例剧情身份；e59被命令与持久行为寻址，改它不是显示改名。
可证伪观察：名称改变目标ID/脚本内容，保存丢名，同名实体目标混淆，修改后脚本区/轨迹还用旧名，非法label通过校验，均拒绝接收。
本任务不是批量审计红项或迁移修复；现行作者正文自行维护，不能恢复已退役转换器。

用户可见before→after：`e59`→`苗人头领`（次要编号e59）；实例名称与人物预制名分离。用户已明确批准，不需再次裁决。
名称改变仍可能改变完整场景digest，旧开发档活动续接遵守现行严格校验，不承诺历史档不受影响，不另做save兼容。

## 上下文锚点与设计

- [第二阶段铁律](../../../../phase2/READ-FIRST.md)：稳定身份、作者真源、仅当前版本。
- [前批方案/步骤命名](E2E-SCRIPT-NAMES-1-plot-scheme-and-step-labels.md)：label元数据，不改执行，已核剧情范围和digest边界。
- [脚本合同](../../../../phase2/specs/script-system.md)、[E2E合同](../../../../testing/e2e.md)：后续走过的内容同步核读命名。
- `entity-commands.ts:138–196`不可变patch与undo；`script-editor-projection.ts:30–75`主属性会话和脚本真值保存合并。
- `ScriptEditor.tsx:640–649`当前摘要只读脚本会话；名称从主属性会话编辑时必须及时供给脚本摘要/目标选择，不能等保存重开才更新。
- 唯一显示解析器，不从sprite猜角色；可选名称表示当前未填写，非旧版本fallback。空输入清除label，guard拒绝非空白字符串之外的显式值。
- ID仍唯一：名称相同合法，下拉/引用应可查看次要ID，选择value/key继续稳定ID；跨场景地址保留场景上下文。
- 使用现行DsDraftTextInput，Enter/blur一次提交、Escape取消，按scene/entity ID隔离草稿；支持撤销重做。

## 验收条件

- 名称输入、撤销/重做/清除、切实体草稿不串；普通实体、actor覆盖/继承、zone均可命名。
- 当前schema合法/非法/无名称/同名测试，真实作者工程save→open保留元数据；ID、正文、引用完整不变。
- 列表/选中标题/地图标签/脚本参数摘要和目标选择/轨迹名称一致，刚改名未保存也即时显示；不存在名字写到另一个会话后丢失的问题。
- content与reforge必要回归、editor相关工作流/UI测试；全仓lint/格式/typecheck零error/warning/info，PAL作者校验及docs/设计控件gate。
- Root独立复核差异/真实入口，最小功能性浏览器核名称与可编辑字段；剧情纯元数据不重复执行既有RF001～003报告。
- 6012更新前确认无草稿；不停止服务、不关闭页面。已核作者内容去除新增entity.label后须与冻结基线逐项一致。

## 当前模式推进记录

- Root前提 verified：直接读取以上模型、UI、保存合并和持久寻址代码；反证项可由回归证明。
- 范围/设计 agree；用户批准实例名称，不授权身份重写。Codex build allowed（2026-10-02）。
- 贡献者自验 pending；Codex独立验收 pending；用户体验 pending。
- 旧固定三席签字不适用当前临时模式；独立验收仍不可由实现自验替代。

## 已核作者命名收据（Root，2026-10-02）

| 场景/实体 | 实例名称 | 直接依据 |
| --- | --- | --- |
| s001/e8 | 密道遮挡物 | RF001实际密道开启图及`docs/testing/e2e-001.md:193`纠正旧“锅具”误称；不从sprite-55推断身份。 |
| s001/e10、e11 | 李大娘（房内走动）、李大娘（床边） | RF001真实参与矩阵；`opening-matrix.mjs:195–215`床边替身隐藏→行走婶婶显示，现行s001正文同坐标换身。 |
| s001/e19 | 李大娘（厨房） | actor=li-daniang；RF003厨房126/127交代端菜。 |
| s003/e56 | 李大娘（走廊与大厅） | actor=li-daniang；RF002接待、下楼及RF003大厅交谈。 |
| s003/e59、s001/e24 | 苗人头领 | RF002走廊头领；进房方案显式显示s001/e24并隐藏s003/e59；房内身份为相邻正文核读，不冒充本批入房交互。 |
| s003/e60、s001/e25 | 苗人随从（开门） | RF002开门随从及原进房正文显示s001/e25；职责名，不发明人物本名。 |
| s003/e61、s001/e26 | 苗人随从（随行） | RF002跟随进房及原正文显示s001/e26；房内实例为正文核读。 |
| s003/e62 | 醉酒道士（客栈门口） | RF003首次讨酒及现行对白/门口醉卧姿势；用本段身份，不凭外观猜人名。 |

共12个实例字段。Root从Git读取冻结f5726a504的两场景，当前树仅删除entities[].label后deepStrictEqual，
所有ID、坐标、精灵/actor、页、对白、指令、路径、去向均零差异。其余实体不猜名，随后续E2E继续。

004增量另由[E2E-004-1](E2E-004-1-meal-and-beggar-wine.md)接收：s001/e12随从客房出口、e15送酒菜触发区、
e16苗人客房酒菜、e18厨房出口、e20厨房待端酒菜；s003/e46上楼楼梯、e47下楼楼梯、e51苗人随从客房入口。
8个新增实例用途均由正常004路线与正文核定，引用与ID不变；不将本卡12个历史字段计数改写成当前全项目总数。

## 独立复核与counter（Root，2026-10-02）

- 贡献者RC1：22d006b63，25实现/测试文件；自验editor14文件99项、content4文件157项及局部静态门绿。
  已真实authorizeFirstSaveTarget→writeProject→committed receipt→current loader重开，不降低guard或writer。
- Root直接复核类型/空间guard、属性patch、两会话显示解析、实际目标提交、正式保存重开、App/地图/图例及表单差异。
- C1 counter：新canonical branch从旧`ScriptTree.describeCondition`改走`ScriptEditor.conditionLabel`。
  后者hasItem/ownsItem/itemEquipped显示英文kind+ID且丢atLeast，inParty丢人物中文名，facingEntity丢range；
  `ScriptEditor.tsx:640–675/841–845`与`ScriptTree.tsx:49–89`是直接对照证据。
  这是本批branch显示回退，不是用户允许的实体改名，也不是执行语义差异。须保留既有重点条件信息、复合地址和新名称。
- Root完整回归先冻结RC1执行；贡献者暂只读反证，Root明确释放后再修改最小条件展示/test文件。
  RC1质量结果不自动给修改后的候选准入；C1闭合后重跑受影响全套与静态门。
- 用户6012仍为原main，未更新、未关闭。固定签字不适用；C1未闭合前不集成。
- RC1独立已完成：content124文件1253项、reforge258文件2183项，七包typecheck、lint2738文件
  0error/0warning/0info与PAL294场景/223地图/1934资源校验通过。editor全套发现门禁失败后由Root
  结束本任务专属PID64634（cwd/父PID/命令核实，SIGINT exit130），保留未完成日志，不冒充全套通过。
- C2：新EntityNameField尚未在field-commit-adoption登记；直接gate实测101文件仍2证据例外，
  adoption.test旧库存期望100需同步101。独立定向3失败/1通过/86未选；早期App connector超5秒是
  并行资源争抢，定向已通过，不更改超时门。正常字段归属/库存更新不能变成豁免或放宽规则。
- 独立发现此前步骤名称新增raw label导致33>32。Root从Git计数确认f5726a504与RC1均33，
  是前批存量，不是本贡献者新增；保持32门不变。贡献者交付C1/C2并停写后，Root独占ScriptEditor
  将该字段用现行设计label原语表达，单独提交验证；不把全仓存量治理外推给贡献者。
- 贡献者48189ac7e交付C1/C2五文件后明确停止写入；Root接回ScriptEditor独占权，仅将步骤名称的
  原生label/手工help外壳改为现行DsField。id、input、帮助正文、草稿事务和脚本状态不变，32预算不放宽。
- Root窄修5efe62fe8与对应测试ce7f5d941已由贡献者独立只读accept：DsField生产API绑定原id，
  草稿事务/正文/去向不变；原布局内部header选择器改为逐setting严格核三个真实标签顺序，并新增for=input.id。
  Root定向5文件118项绿，32原生label预算恢复；旧选择器1失败117通过日志保留。
- 最终七包串行typecheck完成、lint2738文件0error/0warning/0info、docs815文档4289链接255任务0issue，
  直接设计gate101文件/原2证据例外通过；没有新增排除/规则降级/强转或save兼容。
- Root6011隔离真界面核：实体名称输入、Enter、Esc、撤销/重做/清除、列表/选中标题/移动与隐藏摘要、
  异场景s001/e24摘要、具名目标下拉及轨迹图例全部实见；临时名称已撤销，未点保存，Git当前作者数据未改。
  正式保存重开另由真实writer/committed receipt/current loader测试闭环，不把此浏览器查看冒充保存IO。
  截图`build/e2e/entity-names-browser.jpg`。验证完仅关闭Root自建6011页和已核PID48796服务，6012/PID88523原样运行。
- Root最终editor全套仍执行：adoption最后CLI case17.651秒超15秒，专项再现24.3秒超时，
  同时另有两个用户工作树完整editor测试且主机内存紧张；此前贡献者全adoption/field84项绿，直接CLI gate亦绿。
  不改timeout或宣布最终editor全套绿；保留完整与单项日志，继续核验性能原因/剩余结果。6012主树尚未更新。
- 最终editor全套结束：489文件，3749通过/3失败（3752项）；两项是family ownership硬门反对World/Actor
  表单新传Locale，第三项是上述15秒wall上限。不以通过大多数作为验收。
- C3：遵守薄表单边界，父CommandForm持有locale并提供预解析的实体显示回调；World/Actor/EntitySel
  只消费窄显示接口，不删Locale禁项或改变family规则。Root交回这四实现文件和相关命名回归的独占权给贡献者。
  ScriptEditor/ScriptTree及存量步骤修复冻结；Root保持只写文档，C3交付后再独立复核。
- 超时只读核验：既有audit缓存AST/模块闭包且有循环保护；DsField早已有children证明，设计控件导入不解析其实现；
  5efe迁移前后DsField+DsHelpTip调用数12→12，没有引入循环或新解析路径。并行多工作树和主机内存压力是强替代解释，
  不修改15秒门；具体反证/结果随最终验收补记。
- C3 e111a273e：贡献者仅改四薄表单实现及新增CommandForm.entity-names测试，原family硬门红2→绿，
  五文件24项、editor双typecheck及Biome局部门绿。Root直接读取全部四源和真blank-loader夹具后代码accept：
  父CommandForm唯一持有locale，World/Actor生产入口仅两处，callback只返回显示文本；value/onChange仍为ID。
  不修改原family规则。最终editor全套在此源冻结点重跑，不以此前失败计数冒称成功。

## 最终技术验收收据（2026-10-02）

- 冻结实现e111a273e（含Root步骤字段窄修5efe62fe8/ce7f5d941），Root独立accept；C1/C2/C3全部闭合。
  Root窄修另有贡献者只读独立accept，不以实现者自测冒充审查。
- Root最终完整editor490文件3757项通过；此前489文件3749通过/3失败和原SIGINT未完成日志保留。
  仍为原15秒门，未排除任何测试/更改timeout/放宽架构规则；并行压力减轻后全套一次零失败，T1闭合。
- content完整124文件1253项、reforge完整258文件2183项通过；这两包源码在后续仅editor窄返工期间未改，
  复用同一冻结源的完整回归，不虚报又跑了一次。七包最终串行typecheck（editor双配置）全部完成，
  lint2739文件0error/0warning/0info；docs815文档4289链接255任务0issue；PAL294场景/223地图/1934资源通过。
- 直接设计gate101文件/原2证据例外通过，所有原门保留。未跑根完整check/coverage ratchet或新的RF001～003故事批次，
  不宣称全仓测试或新剧情E2E通过；本次只有实例元数据和作者界面，没有演出修改。
- 旧版本兼容审查pass：只增当前可选非空作者label，没有旧类型/parser/upgrader/双读或digest放宽；
  stable ID/复合地址/指令/游标/存档身份仍不变，旧开发档活动continuation仍受现行完整digest校验。
- 真浏览器6011已验证改名即时传播、取消、撤销/重做/清除、目标下拉及异场景名称；未写PAL浏览器草稿到磁盘。
  正式保存重开由真实writer/receipt/current loader回归证明。12个作者label去除后与f5726a504逐项相同。
- 日志：`build/e2e/entity-names-root-editor-accepted-full.log`、`root-content-full`、`root-reforge-full`、
  `root-types-accepted`、`root-lint-accepted`、`root-docs-accepted`、`root-pal-author`、`root-design-final`、
  `root-counters-final`和`metadata-proof`；原红/C1/C2/C3/各中间失败日志原样保留。
- 技术实现/独立审查已完成；Status review仅待用户名称及界面体验，不替代母卡全PAL后续命名。

### 6012接收与用户最小复验

- 主树接收前再次从真实DOM确认保存/撤销/重做全disabled，无草稿；main fast-forward到737aac2ad。
  Vite自行HMR重载后恢复s003/e59→自动行为→接待结束进房方案，未停止6012服务、未关闭或手动刷新用户页面。
- 接收后实见实体名称=苗人头领、图例=苗人头领·e59，两移动指令/隐藏指令及s001苗人头领·e24正确具名，
  所有保存/撤销/重做仍disabled；仅选择查看没有写浏览器草稿。PID88523继续监听，截图
  `build/e2e/entity-names-6012.jpg`；本批原红/绿日志及隔离截图全部保留到主树build/e2e。
- 用户复验：点任一实体→属性→实体名称。修改后回车或失焦提交，Esc取消，清空沿用预制人物名称/编号；
  列表、脚本目标/摘要、轨迹应立即同步，同名仍可按次要ID区分。已填名称可保存重开；内部ID、对白和运行去向不变。
- 本批12个已核实体已填名，其他实体随下一段E2E核读；身份/用途不确定问用户，不把未核剧情猜名。

## 下一位 Agent 提示词

无下一位Agent提示词，等待用户体验验收。后续E2E按实体→方案→步骤同步核读命名；未核人名/用途问用户，
不猜名，不改变ID，不重复接收本批实现或重跑已冻结历史剧情报告。

## 门扇名称补全（用户2026-10-02追加批准）

- 用户指出e54/e55也应命名，批准补四个已核门扇；本轮仅s003四个entity.label，不启动004或重写开门动作。
- Root同一作者Owner，复用干净候选树codex/pal-inn-door-names，冻结基线736431bbe；正文/schema/editor源码均不改。
- 直接依据：s003/e52门口(123,42)进入s001落点(38,9)，对应头领e24(35,1)所在客房；
  e51门口(133,42)进入s001落点(108,30)，对应随从e25/e26房间。e54/e55门扇(123/124,44)，
  e73/e74门扇(133/134,44)，相同row下col+1投影x+16（grid.ts:37–38），故分左/右扇。
  前者由e56接待正文显式隐藏，后者由e60进房/自身触发选择open页；已核RF002门生命周期，不从精灵名猜房间。
- 名称：e54/e55为“苗人头领客房门（左扇）/（右扇）”；e73/e74为“苗人随从客房门（左扇）/（右扇）”。
- 原版/第一阶段N/A：作者label不参与其运行；当前/目标为前批已验现行label，只补作者内容。
  Root premise verified/design agree/build allowed；反证为除四个label以外任何字段差异或房间映射不符。
- 验证：候选场景去除这四个新增label与736431bbe逐项一致；作者工程、门/客栈回归、lint/docs及最小编辑器名称实看。
  不复跑未变的全套代码或剧情旅程，不伪造新E2E/checkpoint；仍不承诺旧开发档活动digest可兼容。
- 6012更新前再次确认无草稿，服务和页面保持打开；技术及实看收据待完成后追加。
- 独立只读entity_names直接读取门口/落点、房内身份、进房换身与grid投影后premise verified/accept；
  独立去除四label后deepStrictEqual=true。两扇同grid row下屏幕dx+16/dy+8，左右取屏幕x，不冒称同屏幕y。
- Root作者工程294场景/223地图/1934资源通过；reforge四客栈文件40项和editor PAL引用一项通过；
  lint2739文件0error/0warning/0info、docs815文档0issue。仅四行JSON新增label，复用前批未变源码的类型/全包收据，
  不宣称此批又执行了全套类型检查、全仓测试或剧情E2E。日志为build/e2e/door-names-*.log。
- main接收a05a572f5前真实DOM确认所有保存/撤销/重做disabled，原选中e55的名称为空、坐标124/44/0与磁盘一致、无弹窗。
  纯JSON没有触发页面HMR；按已告知的无草稿重读方式仅reload原标签页一次，未停止服务或关闭页面，恢复原e55选择。
  四个具名门按钮、e55属性值/标题和原ID实见，保存仍disabled；PID88523保持，截图build/e2e/door-names-6012.jpg。
  本批名称已技术验收并交付，母卡仍review待界面体验；004不在本次执行范围。
