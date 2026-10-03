# E2E-SCRIPT-NAMES-1 - 随剧情核验命名方案与步骤

Status: done
Phase: phase2
Capability: W7 / P3
Coding Owner: Codex Root
Generation Owner: N/A
Reviewer: Codex 独立只读专项复核
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Branch: codex/e2e-script-names

## 2026-10-02清账收口（当前结论）

`19b68078b`独立accept，5方案22步骤的元数据保真、当前加载重开与实际界面均有证据。功能与这批已核名称收口，后期命名继续SCRIPT-AUTHOR-2。
本轮按用户“先清当前边角再继续005”授权核既定范围与证据，Codex技术accept并归档。
除004上述明确认可外，不补写用户逐项体验签名；下文旧pending/返工/提示保留为过程记录，非当前阻塞。
本次不重跑未变剧情来重复取证。原声录像由E2E-CAPTURE-1承接；全量Q1/Q2、后期命名和发布素材库未因此完成。
无下一位Agent提示词，本卡已收口；[清账母卡](PRE-005-DEBT-1-current-edge-closeout.md)继续当前未完事项。

## 目标与范围

用户2026-10-02要求命名s003/e59自动行为3，并在后续E2E中为实际走过、剧情含义已核实的方案与步骤命名。
方案说明剧情时期与用途；步骤说明当前执行内容，区分首次、复读和收尾。名称不替代稳定ID。

- 范围：当前客栈已核内容（首先e59/e60/e61进房），普通步骤的可选名称及编辑/展示/保存，E2E命名验收规则。
- 不改：任何指令、对白、顺序、速度、等待、步骤去向、方案ID、游标、编译节拍或存档合同。
- 不做：全PAL猜名、批量翻译未核后期状态、原版迁移/转换器复活、隐藏步骤、parallel/join。
- Root复用本线程干净候选树`/Users/zhangxu/.codex/worktrees/e2e-003/type-pal`；6012主树暂不更新。

## 前提真值门

一句话前提：方案已有label，普通stage没有名称字段；必须补作者元数据而非改稳定ID，才能实现真实可保存的步骤命名。

| 维度 | 真值与直接证据 |
| --- | --- |
| 原版/primary source | N/A：作者名称不参与原版执行；剧情含义依已核RF002和当前正文，不从名称推断新剧情。 |
| 第一阶段 | N/A：一阶段没有方案→步骤作者界面；此次不修改其脚本或运行时。 |
| 当前二阶段 | `author-script-core.ts:303–309/996`无stage.label且exactKeys拒绝它；`runtime-script.ts:50–55`同样无名称；`ScriptEditor.tsx:3990/4066`仅显示编号；compiler `script-compiler-core.ts:314–326`显式投影id/entry/body/next。 |
| 本任务目标 | stage可选非空label，未命名表示尚未填写而非旧版本兼容；编号+剧情名称共同展示，详情可编辑；compiler不携带label，存档仍按原stable ID和现行内容digest校验。 |

e56接待正文显式选择三人`auto/legacy-003`（739a02982的`s003.json:1040–1085`，按实体及命令定位）。
e59该方案两段move→显示s001/e24→隐藏s003/e59（`s003.json:5771–5831`）；e60开门/进房换身，
e61随行进房换身（`s003.json:7136/8638`）。既有RF002正式终点三人均隐去，见客栈检查点README。

最强替代解释：只改stage.id就能命名。反证：id被next、预览选择、引用定位与存档游标消费，改它会改变身份，
并且界面仍只显示步骤编号。只写未声明JSON字段也会被现行严格校验拒绝。
可证伪：改名后任何指令/去向/执行结构变化、加载/保存丢名、同名步骤混淆游标、空/非法label被接受，均不通过。

用户可见before→after：仅“步骤1”→“步骤1 · 走到房门并转为房内角色”；ID及游戏行为不变。
用户此次明确要求方案与步骤按剧情命名，已授权这一作者元数据/界面变化，不授权剧情变化。

## 上下文锚点

- [第二阶段铁律](../../../../phase2/READ-FIRST.md)：当前作者内容为真源，不重新启动已退役完整转换核。
- [现行脚本合同](../../../../phase2/specs/script-system.md)：方案→步骤→指令，跨方案显式选择，作者稳定ID不变。
- [脚本合理化母卡](../../../tasks/SCRIPT-AUTHOR-2-readable-inn-choreography.md)：已核客栈名称、单步路线及已闭合保存counter；未核全PAL不宣称完成。
- [E2E合同](../../../../testing/e2e/contract.md)、`projects/pal/e2e-checkpoints/README.md`：RF002三人入房，RF003不取菜。
- `project-io.ts:1–9`：作者工作副本序列化/重开必须保真；`character.ts:168–170`现行21/SAVE10，只接受现行版本。

## 设计与验收

- 可选label是当前作者元数据，填写时必须非空；没有名称不是版本fallback。不改版本号、不新增upgrader或旧格式分支。
- 明确整理简单machine为stages时保留其已写label；不在loader/runtime偷偷改作者树。
- 步骤卡、去向选项、详情、轨迹图例统一显示编号与名称；名称字段允许正常撤销/重做/保存重开。
- 单测覆盖非法名称、名称保留、同名不同ID、编译结果不变、作者序列化重开、编辑器改名及预览选中步。
- 内容证据：仅已核地址允许改名；去除新增label后与冻结739a02982正文/所有身份逐项比较。
- 6012验无草稿后才接收；服务不停止、页面不关闭，最小功能实看新名和步骤详情。剧情不因纯命名重复走E2E。
- 后续每段E2E回执列实际经过地址、命名依据、未核项；未走到的后期脚本不冒充已命名完成。

## 当前模式推进记录

- Root前提核验：verified（以上直接类型、严格校验、投影与正文证据）。
- 独立只读`editor_preview_audit`：premise verified / design agree，直接读取739a02982的Base/RuntimeStage、共同guard、project-io:299、compiler:314–325及script-world:175–200；未改任何文件或6012。
- 范围/设计：agree；单一写入Owner Root，白名单content核心stage元数据、editor展示/相关测试、已核PAL内容及本卡规范文档。
- build准入：Codex build allowed（2026-10-02，单一Owner Root）。
- 用户体验：pending。

现行digest哈希完整场景（main.ts:3069–3075）；改方案/步骤名称仍会改变content digest，旧开发档里的活动
自动续接可能按`script-continuation.ts:29`被拒绝。保持这一现行严格边界，不改save/digest设计，不宣称
“纯改名绝不影响已有开发档”。历史RF001/002/003报告冻结hash原样保留，不重写为新内容验收。

## 下一位 Agent 提示词

无下一位Agent提示词：独立复核已完成，等待用户体验验收。后续E2E命名沿用本卡与E2E合同，不重复接收本批实现。

## 实施范围与命名收据（2026-10-02）

本轮5个方案显示名、22个步骤名称，覆盖16套正文已核流程。已执行与相邻复读核读分开记，
不把复读核读补名写成新的E2E执行报告。每项地址保存原行为ID和原步骤ID。

| 作者地址 | 方案/步骤用途 | 依据 |
| --- | --- | --- |
| s000/onEnter/default/initial | 开场梦境：罗刹鬼婆现身 / 梦中遭擒，转入客栈醒来 | RF001已执行；梦中罗刹鬼婆对白与loadScene。 |
| s001/onEnter/default/initial | 梦醒客栈：婶婶叫逍遥招呼客人 / 叫醒逍遥并交代接客 | RF001已执行；完整叫醒、离房交代及密道未走对白。 |
| s003/e56/trigger/default/initial、legacy-002 | 首次接待与赏银 / 复读：提醒别怠慢客人 | RF002已执行initial；legacy-002核读dlg.54。 |
| s003/e59/auto/legacy-003/initial | 接待结束：苗人头领进房 / 走到房门，切换房内头领 | RF002入房与隐藏已执行；正文两段move及s001/e24。 |
| s003/e60/auto/legacy-003/initial | 接待结束：苗人随从开门进房 / 开门进房，切换房内随从 | RF002开门/入房已执行；正文开e73/e74及s001/e25。 |
| s003/e61/auto/legacy-003/initial | 接待结束：苗人随从跟随进房 / 跟随进房，切换房内随从 | RF002已执行；正文等待/三段move及s001/e26。 |
| s003/e56/auto/legacy-006/leave-reception | 下楼到大厅，开放交谈 | RF002/003已执行；六目标、开放交互及切换trigger。 |
| s003/e56/trigger/greet-after-guests/initial、remind-kitchen | 交代赶走门口道士 / 复读：提醒去厨房帮忙 | RF003已执行initial；复读核读dlg.59–60。 |
| s003/e56/auto/go-to-kitchen/initial | 走进厨房，切换厨房角色 | RF003已执行；三目标及厨房e19显示。 |
| s003/e62/trigger/default/initial | 观察门口醉汉 | 相邻正文核读dlg.143；不宣称RF003执行过这个初始方案。 |
| s003/e62/trigger/beggar-first-talk/initial、ask-again、persistent-begging | 首次讨酒，逍遥拒绝 / 再次恳求喝一口酒 / 复读：赖着不走继续讨酒 | RF003已执行initial；后两步核读dlg.158–163。 |
| s003/e62/auto/default/initial、legacy-002、legacy-003 | 等待动作轮换 / 醉卧姿势一 / 醉卧姿势二 | 003可见醉卧；正文为显式原循环，未新增空步骤或拆动作。 |
| s001/e19/trigger/default、busy-in-kitchen、serve-guests的initial | 复读：追问是否赶走道士 / 复读：催逍遥帮忙 / 交代把桌上酒菜端给客人 | RF003执行serve-guests；相邻两方案仅核读dlg.124/129–130。 |
| s001/e19/auto/default/initial（历史） | 备菜时保持向上姿势 | RF003历史可见；004已退役此无意义auto，取菜正文显式转身/回身，不再作为当前方案入口。 |

004增量见[E2E-004-1](E2E-004-1-meal-and-beggar-wine.md)：实际取菜/送菜/赠酒及正常经过的门与触发区已核用途补名，
对应稳定ID未变；不重复接收本卡5方案/22步骤实现，也不将未核后期正文批量猜名。

未核后期方案、e59自动行为1/2及全PAL剩余模板名称仍由后续实际E2E逐包核读，不归此批完成。

## 技术验收收据与最小复验

- 冻结实现`19b68078b`（基线739a02982）；`editor_preview_audit`独立读取24文件diff与一手消费者后accept，
  独立从Git读取三场景JSON去除label后deepStrictEqual，无非label差异；没有新counter，不代替用户体验验收。
- schema原红1失败/31未选，明确拒绝合法step.label；实施后content全124文件1246项、reforge全258文件2183项绿。
  editor最终11文件113项绿，覆盖真实loader重开、history、UI草稿提交/取消、同名ID、当前步预览及带名图例。
  不宣称本批重跑editor全套或新RF001→003故事E2E。
- 早期两轮typecheck因新增测试夹具的作者/投影类型边界失败，原日志保留；修正为真实AuthorScene→toEditorState
  入口后，七包typecheck（editor两配置）全部完成零诊断，没有加强转或削弱规则。
  最终lint2733文件0error/0warning/0info，docs814 Markdown/4283链接/254卡0issue；
  PAL作者检查294场景/223地图/1934资源通过，设计控件gate100文件/2个既有证据绑定例外通过。
- 证据：`build/e2e/script-names-schema-red.log`、`script-names-types.log`、`script-names-types-final.log`
  保留原失败；最终`script-names-content-full.log`、`script-names-reforge-full.log`、
  `script-names-editor-final-candidate.log`、`script-names-types-zero.log`、`script-names-lint-zero.log`、
  `script-names-docs-final.log`、`script-names-pal-check.log`、`script-names-controls.log`及`script-names-metadata-proof.log`。
- 6012更新前保存/撤销/重做均disabled、状态已保存，预览就绪；接收后原PID88523继续监听，未停止服务、
  未关闭或手动刷新页面。HMR自动重载后恢复s003/e59自动行为与新进房方案选择。
  实际DOM、截图及详情确认方案新名、带用途步骤卡、同名图例、可编辑名称值；只查看，未写浏览器草稿。
- 用户最小复验：6012→s003→e59→自动行为→“接待结束：苗人头领进房”，应看到步骤1用途
  “走到房门，切换房内头领”；打开步骤详情可见同名字段和原complete去向。可在自己的工程改名并撤销，
  名字/编号/去向应各自正确；无需再走001～003剧情。当前页面已停在此方案，等待用户判断名称与展示是否清楚。
- 本卡技术实现与独立复核完成，Status review仅待本轮作者界面体验；母卡全PAL治理仍build。
