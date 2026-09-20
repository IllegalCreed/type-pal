# TEST-CONTENT-RESIDUAL-1 - 内容合同已登记残项补测（队列 TB-01）

Status: rework
Phase: phase2
Capability: 已有内容合同覆盖（不改变能力地图）
Coding Owner: Codex（用户授权接手CR-R1窄返工及集成；GLM原始测试贡献保留）
Integration Owner: Codex
Reviewer: Kimi / GLM（GLM参与贡献须披露，不作为独立第三方自证）
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: codex/tb00-tb01-finish

Revision: r2，2026-09-19；生产核对点`e58834f6389a40ffe9f187e6a8051f552e964d79`不变。r1前提/方案已收窄，旧签留历史，不授权r2。
来源：[补测长队列](../../testing/glm-coverage-work-queue.md) TB-01；r2三席已齐，实施时机以本卡当前准入为准。
唯一工作包/族账/白名单：[glm-content-residual.md](../../testing/glm-content-residual.md)。

## 目标与边界

### 2026-09-21 Owner接手

用户明确“那就修好呀”，Codex接替GLM完成ccc67dcc仅剩CR-R1：实际合法world/非空levelUp/shops/noPortrait载荷的调用前后快照和候选内结构守卫自证。
不重开已闭环的Unicode/目标判据/计数格式；保留原GLM分支/worktree。独立codex/tb00-tb01-finish工作树从main 0cb5010e接入白名单新增文件，不回退当前产品，也不反向import Reforge。
原r2设计三签保持；与TB00分开裁决/提交，接收后由Codex统一串行完整check→ratchet→受保护单次fast。GLM原贡献披露，本席接手后不再充独立第三方审查；Kimi独立终审和GLM新候选复核仍需按卡完成，不代签、不done。

只补[已接收内容合同包](../../testing/glm-content-contracts.md)回执登记的残项（asset unbound 肖像直连臂、
author-dialogue 字段守卫轴、map-index 剩余拒绝边界、validate-refs 数据引用轴、frame-sequence 可达错误路径）。
已接收 118 项逐项对账不重做；TextEncoder 降级不存在不补；D-06/D-07 留修复卡；无 caller 接口不保活。

## 前提真值门

| 维度 | 一手证据与结论 |
|---|---|
| 原版/primary source | N/A——本包不涉及原版机制真值；当前公开 TS 合同为真源 |
| 第一阶段 | N/A——content 无一阶段对应 |
| 当前二阶段 | asset.ts:387为commandAssetTaggedReferencesAtNode，actor-reference的portrait引用器不扫unbound；frame-sequence:255解析外部字节；editor/project-diagnostics.ts:688调用validateReferences。表情rename已有editor:76消费与强回归；content的ES2022/rootDir:src禁止为测试反向引运行时loader |
| 本任务目标 | before→after 只增合法正反测试与覆盖账；行为/schema/版本零变 |

最强替代解释：跨包已测（rename 全域证据见工作包去重表）、不可达（多字节 encode 臂）、
已有强断言（118 项）、合同未定。反证成立即登记已有/防御/待证，不凑数。

## 推进签字

### build前（r2，当前）

- Codex：**premise verified / design agree（2026-09-19，r2，冻结e58834f6）**。本人直读asset.ts:387–423、frame-sequence.ts:117–152/255–278、author-dialogue.ts:125–168、content/tsconfig.json及editor的rename既有强断言；相关10文件148项复跑绿，前提探针证明合法unbound边和外部Unicode TPFS及独立错误路径。r2不反向依赖运行时loader、不保活无当前非空消费证据的scriptChunks、不强制已覆盖A3新增。可证伪：合法基线被守卫拒绝、旧断言已经完全同合同、caller只能来自已退役链，则撤回该候选；不得改产品迁就。
- Kimi：**premise verified / design agree（2026-09-19，r2，冻结 e58834f6；全部锚点本人直读/复跑，未读 GLM 结论——其签字于本人核查完成后落盘，仅确认席位位置）**。
  - **残项入口直读**：`asset.ts:387` 确为 `commandAssetTaggedReferencesAtNode`（原 A1 混名已订正）；
    `actor-reference.ts:244` `collectDialoguePortraitReferences` 注释明「不扫描 unbound 的全局
    AssetId」——unbound 肖像直连臂缺口真实；`author-dialogue.ts:125-168` exactKeys+rows 非空、
    speed/autoAdvance 允许 0 及非负有限数；`frame-sequence.ts:255` 解析外部字节（UTF-8→JSON 分层）。
  - **依赖方向核实**：content 包 ES2022/rootDir 不允许反向引运行时 loader——r2 改本包结构
    guard+引用零 issue 基线正确；open-local 当前 scriptChunks={}，旧 migrate 分片构造不等于当前
    发布消费，A12 先证 consumer 再补的纪律正确。
  - **去重核实**：editor actor-dialogue-commands.boundaries.test.ts:149 确有经 content rename 的
    全域/invert/深快照强证据（跨包间接），登记已有不强制第六文件；map-index 重复 ID/路径/自身
    保护已有强测试先扣重。
  - **探针本人复跑**（exit 0）：合法 unbound cue 精确 AssetId 边、外部 Unicode TPFS 逐像素
    恢复（UTF-8/JSON 错误分开）、browserAdapter 实拷字节、worker.onmessage 真实 quantize/encode
    与真实 transfer、原 buffer 保持且 terminate 一次——非视觉宿主协议证据成立。
  - **设计同意**：只补已接收包回执登记的残项；118 项逐项对账不重做；TextEncoder 降级不存在
    不补；D-06/D-07 留修复卡；无 caller 接口不保活；合法 fixture 过当前结构守卫、负控钉名
    业务红；同口径覆盖对照只出 /tmp；整包串行门由 Codex 接收后统一。
  - **可证伪观察**（任一反例即收窄或 counter）：① 某族已被同合同断言覆盖（含跨包）→ 登记
    已有；② 拟造输入不在当前支持域 → 撤回；③ scriptChunks 非空出现当前 consumer → 该族
    回纳入范围；④ 为结构正控反向引入运行时 loader → 依赖方向破坏；⑤ 产品/旧测试/基线
    任何 diff → 越界即停。
  - 返工项：无。
- GLM：**r2 premise verified / design agree（2026-09-19，r2，冻结 e58834f6；差异锚点本人直读/复跑，未读 Kimi 结论；r1 签字留历史）**。
  - **锚点订正本人复核**：asset.ts:387 确为 `commandAssetTaggedReferencesAtNode`（r1 稿误名
    `collectDialoguePortraitReferences`，后者属 actor-reference.ts:244 且刻意不扫 unbound——探针
    输出 valid current cue → exact asset reference 印证）；:278 `palBattleSpriteAssetId` 的真实
    caller 在 migrate/pal-battle-sprites.ts:53/63/116（本人直读），A2 收敛为合法参数轴正确。
  - **依赖方向**：content/tsconfig.json rootDir=src 本人直读——r1 稿"经 loadCurrentProjectFrom 守卫"
    确会反向引 reforge，r2 改为本包现行结构 guard + validateReferences 零 issue 正控正确。
  - **scriptChunks 归类**：open-local.ts:77 当前返回 `scriptChunks: {}`、main.ts 零 scriptChunks
    消费（本人 grep 证实）——A12 先证当前消费者否则不新增旧分片正例，同意。
  - **既有基线复跑**：TB-01 相关 11 个现存测试文件（asset/actor-reference.contracts/frame-sequence/
    author-dialogue×2/map-index×2/validate-refs×2/asset-catalog/asset-closure）162/162 绿
    （本人执行；比 r2 收口报告的 10 文件集多含 author-dialogue.contracts——不影响其结论）。
  - **探针复跑**：`node --import tsx docs/testing/glm-coverage-queue-premise.mjs` rc=0——合法 unbound
    cue 精确 AssetId 边、外部 Unicode TPFS 索引逐像素往返且 UTF-8/JSON 错误分离，与 A1/A4 前提一致。
  - **可证伪观察**：①合法 cue 被 checkAuthorDialogueCue 拒→A1 撤；②多字节 encode 臂出现合法
    构造→A4 重开；③scriptChunks 找到当前非空消费者→A12 升级；④产品/旧测试/基线 diff→停。
  - 返工项：无。Kimi 签齐且无 counter 后由 Codex 核定 build。
- build准入：**r2设计门已通过，Codex于2026-09-19统一核准**（本席f5cd23c0、GLM efe6b932、Kimi 61b79f1b；生产相对e58834f6零漂移）。本卡现进入build，GLM可从最新已接收main领取独立worktree；这是开工授权，不是实现已完成。 TB-00返工优先，未接收实施包最多两批；有空位且本卡目标产品/合同未变、无新counter时，GLM可按本授权同步本卡/看板/索引到build并开工，无需重复签字或再次询问用户。若目标漂移或出现新合同分歧，仅暂停对应批交Codex核定，不自行更换前提。

### build前r1签字（历史，已被r2替代）

- Codex：pending（独立核队列 TB-01 范围/去重表/白名单）。
- Kimi：pending（独立前提/设计审查，不读 GLM 结论）。
- GLM：**premise verified / design agree（2026-09-19，核对点 e58834f6；锚点本人直读，未读他席）**。
  模块/计数与机器台账逐格一致（census --check 通过）；跨包去重表本人逐条核验——editor
  actor-dialogue-commands.boundaries.test.ts:149+ 确经 :76 调用 content rename 并钉全域/invert/深快照，
  rename 族登记已有跨包间接；A1-A12 族锚点在工作包直读列明。可证伪：某族无合法输入或已被同合同
  断言覆盖→登记已有；产品/旧测试/基线 diff→停。
- build准入：未开放；三席同 r1 齐且无 counter 后由 Codex 核定。

### done前

- GLM：**实施者自验 accept（2026-09-19，r1；非独立第三方）**。
  - 交付树：分支 `codex/glm-content-residual-r1`（worktree
    `/Users/zhangxu/illegal/type-pal-glm-content-residual`），基点 4473c367；
    产品对冻结 e58834f6 零漂移。
  - 计数：5 新测试文件 24 项（A3 按 r2 已有不新增）；定向 24/24、content 全包 60/698、tc rc=0、
    7 新文件 Biome rc=0。
  - 负控：mutants rc=0——1 对照 + 13 变异针全部钉名 AssertionError 业务红；产品 hash 不变。
  - 覆盖：六模块局部与全包双栏（/tmp）；A6 勘误（现行无 rows 长度上限，原 >4 拒绝是发明已删）、
    A12 levelUp 属主按现行 warn 政策落账。
  - 未做：全仓 check/ratchet/strict-fast 留 Codex；不代签、不标 done。
- Codex：**收窄counter（2026-09-20，候选ccc67dcc，r2不重签）**。原三见证detected、mixedFailureAccepted=false、七fixture accepted；原15跑、content60/698全测/tc及9文件Biome通过。CR-R2/R3主要鉴别力和R4数字/格式闭环。
  只余CR-R1：合法world在调用后才取快照、非空levelUp没有保真；新两针各候选4/4仍绿、oracle业务红（5对照绿，3 detected/2 MISSED）。并核合法shops/noPortrait同类静态遗漏及候选内结构守卫自证缺席，不把本席确认合法误写成输入非法。
  详见[最新收窄证据](../../testing/content-residual-review.md)；未改候选测试，未集成/改官方基线，不转Kimi。
- Codex前轮记录（历史）：**counter（2026-09-19，候选0e49db91，设计r2不重签）**。白名单/生产零漂核通过；实际23定向、content60/698全测/tc、1正控+14针通过，私有覆盖增量复算一致；但9文件Biome有1格式error。
  CR-R1真实cue/world输入保真漏检且world未按已签合同构造；CR-R2合法Unicode正控实际expect抛错；CR-R3目标STACK_TRACE_ERROR可借别例AssertionError被负控判据认证；CR-R4计数24/13针/7文件等与树不符。独立三针3对照绿、3 MISSED，混合错误被接受；根bundle七表面独立guard全accepted，不反称其非法。
  详见[独立复核与可重建见证](../../testing/content-residual-review.md)。不改候选测试语义、不集成、不跑接收后官方全仓门、不释放实施槽。
- Kimi：pending（接收后终审）。
- done准入：未开放，不代签、不标done。

## 交接日志
- 2026-09-21 Codex：按用户明确要求接手CR-R1窄返工。已同步main/核工作树干净，源分支仍ccc67dcc；将修实际输入快照/非空反例/结构自证，五针及原工具按最终树复验后独立接收。原counter先保留，状态仍rework，不动GLM工作树；TB00各自裁决，不以一包通过替另一包放行。
- 2026-09-20 Codex：独立接收ccc67dcc，原三针/判据/Unicode/计数/格式改善属实；针对原CR-R1加合法world与非空levelUp两针仍MISSED，仅此保真/守卫族继续返工。原15跑/content全包/tc/9文件Biome绿；不改候选、不集成、不跑官方全仓门。
- 2026-09-20 Codex：核远端codex/glm-content-residual-r1为ccc67dcc，与本地独立worktree一致，已有CR-R1～R4返工回执。进入本席待接收队列，不重复要求已交返工；原counter在独立验证前不核销，状态仍rework，不合入或抬基线。新物品/脚本卡独立推进。
- 2026-09-19 Codex：独立接收0e49db91，实跑定向/全包/tc/Biome/原15跑与私有覆盖；新增只读反证三针均MISSED，负控判据混合错误误收。签CR-R1～R4 counter，转rework，设计r2保持；A3已有/rows无上限/owner warn不重开。保留GLM自验原文，未合入正式测试，主线七批设计与他席改动完整保留。
- 2026-09-19 GLM（实施完成）：按已签 r2 连续完成 A1～A12（A3 登记已有）；24 项 + 13 针负控 +
  覆盖对照交付。实施者自验 accept 已签；等 Codex 独立接收。
- 2026-09-19 Codex：用户告知“Kimi他们签了”后同步核三席同r2/冻结、直接证据及可证伪观察齐、无counter；生产目标零diff。核定本卡build并分配新增实施槽。 r1历史不回写，所有既有r2排除项保留；不代签、不标done。GLM当前返工仍优先，后续领取条件与交接已落卡，避免每批做完再等临时派活。
- 2026-09-19 Kimi：完成 r2 独立设计压力测试，签 premise verified + design agree，无返工项。
  直读 asset.ts:387 入口名、actor-reference.ts:244 unbound 刻意不扫、author-dialogue 字段守卫、
  content 依赖方向（不反向引 loader）与 open-local scriptChunks={}；跨包 rename 去重与 map-index
  既有强测试核实；复跑队列探针（unbound 边/Unicode TPFS/browserAdapter/worker transfer 全成立）。
  五条可证伪观察写入本席。未改产品/他席/状态，未读 GLM 结论。Next：三席齐后 Codex 核准入。
- 2026-09-19 GLM：完成 r2 差异确认，签 premise verified / design agree，无 counter。复核
  A1/A2 函数名订正、content 依赖方向、scriptChunks 当前消费归类；探针 rc0；TB-01 相关 11 现存
  文件 162/162 绿。未读 Kimi 结论；仅改本席与日志。

- 2026-09-19 Codex：按用户要求与TB-00返工并行推进本卡；修正A1/A2函数锚点、内容包依赖方向和当前fixture证明方式；A3与旧分片先分类，不承诺六文件全都新增。已把修订合入工作包正文，r2本人前提/设计签字完成，待GLM补充确认与Kimi独立审查。仅文档/只读探针，未写正式测试或改产品。统一证据见[前三批设计收口](../../testing/glm-coverage-queue-design-review.md)。

- 2026-09-19 GLM：按队列 TB-01 细化。核台账计数、跨包 rename 去重（编辑器测试确调用 content 函数）、
  上包回执残项锚点、白名单路径未占用；产出本卡+工作包（A1-A12 族账/负控/覆盖方案）。仅规划，未写测试。

## 下一位Agent提示词

### 当前：GLM仅完成ccc67dcc的CR-R1残项

```text
按docs/testing/content-residual-review.md顶部ccc67dcc收窄counter返工本卡，状态rework，设计r2不重签。先读AGENTS/CLAUDE/READ-FIRST、当前报告并同步最新版见证工具；原三针/Unicode/目标判据/23项和15跑/格式不重开。
合法world快照移到实际调用前；非空levelUp各调用前后比较真正载荷；同步核合法shops与noPortrait实际对象，不比未消费对象，防御轴声明据实收窄；候选工厂内补当前结构守卫自证（本席七检查已证内容合法，不需发明新fixture或反向import Reforge）。
五对照绿、五针候选自身业务AssertionError detected、mixedFailureAccepted=false、七fixture accepted；原15跑、相关定向/content全包/tc/9文件Biome通过后更新最终树回执交Codex。不改产品/旧测试/他席工具语义/官方基线，不代签、不标done、不转Kimi；与物品作者身份只读包独立工作树。
```

### 历史：GLM返工0e49db91的CR-R1～R4

```text
在 /Users/zhangxu/illegal/type-pal 返工 TEST-CONTENT-RESIDUAL-1，任务卡 docs/ops/tasks/TEST-CONTENT-RESIDUAL-1-registered-gaps.md，rework；实施候选0e49db91，已签设计r2不重签，生产冻结e58834f6。
先同步本次Codex counter与docs/testing/content-residual-review-witnesses.mjs到独立分支，保留主线七批设计和他席；读AGENTS/CLAUDE/READ-FIRST、docs/testing/content-residual-review.md及原工作包。
CR-R1：真实cue/world/shops/levelUp消费前后快照，world用content buildWorld、表面现行guard+零issue正控；不反向引Reforge，不把缺字段world/as unknown或未实际消费对象当保真证据。CR-R2：完整合法Unicode TPFS必须parse成功，UTF8/JSON/schema错误分开准确断言，header长度按u32。CR-R3：负控逐一核目标自身failureMessages，目标STACK_TRACE_ERROR+别例AssertionError必须拒绝，自测与执行见证都永久化。CR-R4：真实23=3/5/3/8/4、14针+1对照、9文件Biome一错误等勘误，修后从最终树重生，不以凑24为目标；族账精确去重。
三独立见证须detected且mixedFailureAccepted=false，七fixture检查accepted；原工具、定向/相邻/content全包/tc/全部新增文件Biome/私有同口径覆盖复跑。只改原白名单，不改产品/旧测试/官方基线/他席工具语义，不代签、不标done、不转Kimi。与TB00返工独立提交；Codex接收后再跑统一全仓门，本轮未释放TB02实施槽。
```

### 历史：GLM按已签队列首次实施

```text
在 /Users/zhangxu/illegal/type-pal 按 docs/ops/tasks/TEST-CONTENT-RESIDUAL-1-registered-gaps.md 的r2实施，生产冻结e58834f6，三席齐且Codex已核准，不重签。先同步、检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡当前准入、对应工作包及docs/testing/glm-coverage-queue-design-review.md的当前实施交接。
TB-00三项返工优先；未接收实施包最多两批。TB-01已开build，TB-02/03依序待空位；满足卡面条件后你可同步状态/看板/索引并开工，不再等用户逐批点头。领取前核目标产品未漂移；每批独立codex/glm-content-residual-r1分支/worktree，不在主树切分支、不恢复stash、不混用未接收成果作为基线。
只新增已签白名单测试/fixture/诊断和本人回执，逐族去重，合法输入先过守卫，负控须由候选自身AssertionError变红，不能把超时/STACK_TRACE_ERROR或仅独立oracle红算检出。PNG编码失败泄漏及活动页/在途回填待证保持原归属，不改产品或写错绿。
完成定向/相邻/全包/tc/Biome、私有同口径覆盖与真实逐族账后交Codex接收；全仓check/官方ratchet/strict-fast留Codex。不做视觉/听感，不改旧测试/官方基线，不代签、不标done、不直接转Kimi终审。
```

### 历史 · r2设计交接（已完成，不重复执行）

两席完整合并提示词见[前三批r2设计交接](../../testing/glm-coverage-queue-design-review.md#两席并行提示词)。本卡最小可复制交接如下：

```text
在 /Users/zhangxu/illegal/type-pal 审 docs/ops/tasks/TEST-CONTENT-RESIDUAL-1-registered-gaps.md（r2/draft，冻结e58834f6）。先同步检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡和对应工作包、docs/testing/glm-coverage-queue-design-review.md，直接读一手代码而非复述他席。
Codex已签r2。GLM负责对本卡r2差异补充确认，Kimi负责独立设计压力测试，两席可并行且不读另一席结论。分别只在本人r2席位/日志写带直接锚点和可证伪观察的premise verified/design agree或counter，并提交推送。
同时审其余TB-01～03同r2卡可用合并提示词，但各卡独立裁决。不得改产品/正式测试/另一席/状态，不标build/done；三席齐后Codex核准入。TB-00返工不因本轮设计等待而停止。
```
