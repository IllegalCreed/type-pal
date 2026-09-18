# TEST-CONTENT-CONTRACTS-1 - 内容数据校验与引用边界补测

Status: rework
Phase: phase2
Capability: 当前内容合同回归与覆盖率（不改变能力地图）
Coding Owner: GLM（新测试/薄fixture）
Integration Owner: Codex
Reviewer: Codex / Kimi
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: codex/glm-content-contracts-r1

Revision: r1，2026-09-18。用户要求再分配一整块适合GLM独立完成的工作。
产品冻结`7ab20689447150eec7ecb0678cbb6980a685eb49`，该时点content/src树`fea45d244bd83528cced2b0b5e9650f715233d34`；
此树hash含既有测试，仅作起点核验；实施后允许白名单新增测试，生产文件/旧测试仍须逐文件零diff。
本卡只增加当前合同的回归，不修产品、不定义新schema、不做视觉；六组一次设计准入，不逐组重新签字。
详细范围、覆盖快照和交付表见[工作包与GLM回执](../../testing/glm-content-contracts.md)。
当前（2026-09-18）：候选`dbe579c5f7e8790d03d4ce1974449118537c021f`独立接收为counter，R1～R4见[复核报告](../../testing/content-contracts-review.md)。
116定向/673全包、原6+12负控及覆盖增量已复算；主fixture合法性、六条漏检见证、判据与完成账仍需返工。
测试未合入main、官方基线未动；GLM原实施回执/自验保留候选树，不代填或改写。r1设计不重签。

## 目标

针对现行content包13个模块，补足有真实调用方、能独立证伪的合法/非法输入、精确输出、引用闭包与不变性测试。
六组连续执行：资源校验、地图/组合数据、帧动画容器、精灵/敌队定义、对话/typed引用、跨表闭包。
交付是可信可合并的测试和逐族剩余账，不承诺固定新增条数，也不承诺消灭全部未覆盖分支。

## 前提真值门

一句话前提：当前加载/发布/编辑器依赖同一内容校验和引用函数；仅正常输入测试或有行覆盖，不能证明拒绝边界、引用路径和原输入不变。

| 维度 | 一手证据与边界 |
|---|---|
| 原版 / primary source | 原版机制N/A：本卡测试现代内容合同与自有TPFS容器，不重裁原版公式、帧演出或物理移动。合同真源为content当前导出及现行调用方，例如asset.ts:111/126/167/856/898、project-map.ts:126/307、frame-sequence.ts:173/255 |
| 第一阶段 | N/A：不改game/pal-extract/shared，不测试YJ2/原盘解码或复刻玩法；不能用旧作者版本fixture代替当前content20模型 |
| 当前二阶段 | reforge/project-loader.ts:201/203/276/279、:510真实调用catalog/map/enemyTeams/tilesets/stamps守卫；editor/commands.ts:1671/3531/3612/3879及reforge/assets.ts:413消费帧需求/集合；migrate/pal-current-publication.ts:361/391消费引用闭包 |
| typed引用调用域 | editor/project-reference-adapters.ts:234/625/1177分别消费canonical target/actor/asset叶；content/actor-reference.ts:198与:220、command-target-reference.ts:278与:313明确区分整树递归和单canonical命令；二者不能互相当替身 |
| 本任务目标 | before→after为“已存在的合同增加有效回归与可重建覆盖证据”，用户行为/格式/版本不变；未知合同/真实缺陷先隔离登记，不把现有错误固化成绿色期望 |

以上代码路径按packages/所属包/src/补全。覆盖快照为当前官方fast：content 557项/50生产文件，行4358/5183、分支3666/5016。
选定13模块合计1842可计数行、1743分支，其中468臂在content-fast未命中。**不是468个bug，也不等于跨包间接调用全未测试。**

最强替代解释：已有同合同断言（含跨包）已覆盖；导出没有现行消费者；拟造输入不属该API支持域；仅因不支持的宿主能力/旧版本分支未执行。
证伪：先列真实caller与既有测试，再以同输入正控+唯一坏实现的业务失败证明新断言必要；未知/重叠/防御如实分类。
关键合同矛盾时停止该族、向Codex报告；不影响其它已确认独立组。若整体前提改变则按协议阻断，不边猜边实现。

## 已核实的易错边界

- asset.ts:111拒绝空段/`.`且不隐式规范化；map-index.ts:25明确trim并消除空段/`.`。不要把两个路径API写成同一合同。
- project-map.ts:126的矩阵行数是height×2；tileId=0不是空格，tiles/sources必须同时null或同时非null。stamp的nullable collision与地图dense collision不同。
- author-dialogue.ts:82/123要求合法portrait.side、rows对象；runtime/author两种cue不能混用。缺Actor/主立绘/表情由:168 fail-loud，不回退全局资源。
- enemy-team.ts:15/35/49有现行loader和publication消费者，当前content-fast为0%仍值得直接核边界；不能由0%推出整个产品从未测过。
- enemy-team-reference.ts的collectEnemyTeamTaggedReferences本次rg只找到声明/导出，无现行消费者：**不在本包默认补测范围**，也不授权删除。
- script-library.ts/旧script接口、YJ2两项待证、战斗数值/item运行效果不属于本包；不能为了覆盖率固化旧接口或引入一阶段机制争议。
- 名称含legacy不自动等于退役：例如asset origin的legacy-migrated仍是当前合法元数据；按真实守卫和caller判断，不凭关键词把现行正控改成拒绝。
- content/validate-refs.ts:74 ContentBundle同时服务当前内容切片及内部投影；fixture必须按现行调用组装，不能照抄旧fixture就宣称可保存canonical项目。

## 六组范围与白名单

生产模块只读，13个新测试文件须使用下列精确路径；不存在才新增，不能覆盖同名他人文件。全部位于packages/content/src/：

| 组 | 只读目标 | 新测试白名单 |
|---|---|---|
| A 资源目录/闭包 | asset.ts | asset-catalog.contracts.test.ts、asset-closure.contracts.test.ts |
| B 地图/瓦片/组合数据 | project-map.ts、map-index.ts、tileset.ts、stamp.ts | project-map.contracts.test.ts、map-index.contracts.test.ts、tileset-stamp.contracts.test.ts |
| C 帧动画二进制与纯数据时序 | frame-sequence.ts | frame-sequence.contracts.test.ts |
| D 精灵/战斗精灵/敌队定义 | sprite.ts、battle-sprite.ts、enemy-team.ts | sprite-frame-demand.contracts.test.ts、battle-sprite-profile.contracts.test.ts、enemy-team.contracts.test.ts |
| E 对话身份与typed引用 | author-dialogue.ts、actor-reference.ts、command-target-reference.ts | author-dialogue.contracts.test.ts、actor-reference.contracts.test.ts、command-target-reference.contracts.test.ts |
| F 项目跨表引用 | validate-refs.ts | validate-refs.contracts.test.ts |

另允许：

- 薄数据fixture：packages/content/src/__tests__/glm-content-contract-fixtures.ts；只放数据/小构造/保真快照，不复制生产算法、walker或整包测试。
- 本卡GLM自己的设计/自验签字与交接日志；docs/testing/glm-content-contracts.md的GLM回执区。
- docs/testing/glm-content-contracts-mutants.mjs、glm-content-contracts.config.mts、glm-content-contracts-evidence.json。
- 必要隔离诊断docs/testing/probe-glm-content-contracts.mjs（已证产品缺陷，不进入默认Vitest，明确observe/contract预期与红因）。

产品、旧测试、旧fixture、原审计探针、全局配置、依赖/锁、scripts/coverage、官方baseline、projects/data/reference均零修改。
新增白名单外文件先报Codex；不修改文档根结构，不恢复stash，不加ts-nocheck整文件、不扩大生产tsconfig。
需要Node宿主类型桥时限制在test-only导入并说明，不用as any/强转掩盖正常fixture缺字段；当前作者→运行态投影的必要类型桥须有真实调用出处及前置合法性验证。

## 执行和验收纪律

1. **先签整包设计**。GLM/Kimi各自独立读源码与既有测试后写本人premise verified/design agree或counter；Kimi不读GLM结论。
   三席齐、同r1且无counter后，GLM作为本卡Coding Owner可同步主线并单独登记build allowed再实施；不需用户逐组批准，也不得提前在/tmp写测试绕门禁。
2. 独立分支codex/glm-content-contracts-r1与独立worktree，建议路径/Users/zhangxu/illegal/type-pal-glm-content-contracts。
   路径/分支已存在则先核归属，不覆盖；从包含本卡及签字的主线建立，先证生产与冻结7ab20689一致。
3. A→F连续实施，每组独立commit并在最终提交树回填证据；中间不把一组做完当整包交付，不每组重签。
   Codex可并行准备editor范围的缺陷修复；若其后续需动本包content冻结面，先停相关组、明确同步策略，不能混用新旧源码覆盖报告。
4. 每族记录现行caller/已有断言→拟补边界→合法正控→反例→结果；已有同合同用例记录复用，不抄用例凑数字。
   同一函数被别包覆盖不自动算本包新增业务保障；确有必要的独立库出口正控要标明重叠。
5. 正常fixture先过对应现行守卫，坏值只改目标轴；验证实际被测载荷，不另造合法正控给非法主例背书。
   全输入深快照与精确输出分开核；含undefined/NaN/typed array的值不能用JSON往返丢信息；集合比较全部元素，不只长度/首项。
6. F组先有干净非空bundle零issue（或明确既有无关issue的精确清单），再按一轴损坏核severity/where/目标id及非目标保持。
   不能复制产品collector计算expected；不能只断言某个错误存在而漏掉额外错误；当前合法optional缺席、显式0/false/null依各API合同分别验证。
7. 每组至少两条**有意义的单点负控**（共至少12条；不是固定用例数目标）。唯一替换、相同fixture/断言、正常实现绿、坏实现实际执行且本组新增断言AssertionError业务红；既有测试变红不能替新增断言背书。
   执行见证不能只是模块load打印；TypeError/超时/零测试/替身故障不算。被其它守卫拦截归重叠保护，不伪造非法状态强打防御臂。
8. 稳定正确合同进入默认fast；新缺陷单独给最小反例/正控/根因候选/修复归属，不改产品，不test.fails/skip/todo后冒称完成。
   不凭当前缺陷反向写“应该成功/应该失败”；D-02/D-06/D-07、E-03/E-04不会因本包绿而关闭。
9. 局部覆盖配置直接import scripts/coverage/config.mjs的coveragePackages/testSelection/coverageExcludes，不正则抄其它包配置，不用已退役的coverage.all开关。
   同目标源码、同既有测试集，before只排本包13个新增文件，after加入；输出专属/tmp目录，禁止写coverage/fast或官方baseline。
   报告覆盖全部13模块；全content包并集与局部13模块分栏，缺口按可达未测/已有重叠/防御或无caller/已证缺陷/合同待证分类并列锚点。
10. GLM每组跑定向、明确相邻、content typecheck、本人文件Biome，最终再整包复跑与逐组负控。
    全仓check/官方ratchet/受保护单次strict fast由Codex接收后**串行统一**执行，GLM不抢跑重型全仓门或改基线。
11. 回执从最终提交树生成文件/test清单、源码hash、测试标题、命令/exit/日志与失败记录；不凭记忆填计数，不把旧日志目录当自己新复跑。
    交付前自行核diff白名单、counter原文、每族状态和负控红因；判定一次失效就返工，不取多数通过。

## 推进签字

### build前

- Codex：**premise verified / design agree（2026-09-18，r1，冻结7ab20689）**。直读asset两层closure与path边界、map/stamp矩阵及规范化、TPFS header/index、sprite/battle帧集合、enemyTeams形状/引用、actor/dialogue/canonical与递归walker、validateReferences及真实loader/publication/editor调用。官方现状content557/50与13模块468未命中臂已读取复算；13测试名均未占用。
  关键反证：asset路径不规范化而map-index规范化、tile0非空、actor cue需side/rows对象、canonical叶不递归嵌套命令；这些都不能用泛化规范替代源码合同。
  已排除无现行调用的enemy-team-reference和旧script-library/YJ2/战斗公式，避免覆盖率驱动旧模型扩张。测试限定、无产品行为变化；不重审已done两批补测。
  可证伪：同合同已有断言、无caller、输入不合法、只靠前置其它守卫/测试替身失败、目标本身错误，则该族不记新增完成并交Codex裁定；其余独立组可继续。
- Kimi：**premise verified / design agree（2026-09-18，r1，产品冻结 7ab20689；全部锚点本人直读，未读 GLM 结论——其签字于本人核查完成后落盘，仅确认席位位置）**。
  - **路径合同差异直读**：`asset.ts:111` `validateProjectRelativePath` 注释明令「禁止隐式规范化」
    （fail-loud）；`map-index.ts:25` `normalizeMapAssetPath` 明确 trim 并拒绝对/反斜杠/`..`——
    两个 API 合同不同，卡面警告属实，不能写成同一合同。
  - **结构差异直读**：`project-map.ts:126` validateIsometricMapContent 含 nullable collision 变体
    （与 stamp 的 nullable 不同族）；`author-dialogue.ts:82/123` portrait exactKeys+side 检查、
    `checkAuthorDialogueCue` 为作者 cue 唯一形状守卫（runtime/author 两种 cue 不混）。
  - **canonical 叶 vs 递归 walker 直读**：`actor-reference.ts:198` 共用叶扫描 vs `:220`
    「One canonical command visit…never nested arms」；`command-target-reference.ts:278` 全递归
    walker vs `:313` 「only the current command, its direct EntityAddress fields and its condition
    tree」——两域明确，不能互相当替身。
  - **帧容器直读**：`frame-sequence.ts:173` TPFS.index 校验、`:255` parseFrameSequence magic
    头检查——独立字节 oracle 目标真实；帧需求（frame demand）是定义集合非实际资源帧数
    （卡面边界正确）。
  - **真实调用方直读**：`project-loader.ts:48/61/201-202` validateEnemyTeams/Tilesets/
    AssetCatalog 消费；editor commands 与 migrate publication 调用域与卡面一致。
  - **排除项核实**：`collectEnemyTeamTaggedReferences` 全仓 grep 仅声明/导出无现行消费者
    （本人实测）——排除默认补测正确，且不授权删除；旧 script-library/YJ2/战斗公式排除合理。
  - **覆盖快照复算**：content 557 项/50 文件、行 4358/5183、分支 3666/5016 与卡面逐项一致；
    468 未命中臂是缺口指示非指标、非 bug 计数（卡面声明正确）。白名单抽查两个测试文件
    均不存在（本人实测）。
  - **设计同意**：六组范围映射真实现行调用域；合法主载荷先过现行守卫+一轴负例；保真深快照
    与精确输出分开（undefined/NaN/typed array 不走 JSON 往返）；每组≥2 有意义单点负控
    （唯一替换+执行见证+业务红+正常绿，TypeError/超时/零用例不算）；覆盖 before/after 直接
    import 官方 testSelection、输出仅 /tmp、全包并集与局部 13 模块分栏；已知缺陷隔离不固化、
    不动产品/旧测试/基线；工作包独立分支与门禁分工（GLM 测试/Codex 集成）清楚。
  - **可证伪观察**（任一反例即收窄或 counter）：① 某边界已被同合同断言（含跨包）覆盖 →
    登记证据不加重复；② fixture 过不了自身现行守卫 → 非法输入不给主例背书；③ 负控仅
    TypeError/超时/模块加载失败 → 无效重造；④ 两个路径 API 被当成同一合同 → 测试模型错；
    ⑤ canonical 叶与递归 walker 互替 → 域错；⑥ 覆盖对照换源码/换选择集或写官方目录 →
    数字无效；⑦ 产品/旧测试/官方基线出现 diff → 越界即停。
  - 返工项：无。非阻断备注：F 组「干净 bundle 零 issue 或精确既有 issue 清单」是本包最易
    踩坑点（卡面纪律 6 已列）；enemy-team.ts 当前 fast 0% 不等于从未被测（跨包 loader 间接
    执行），去重时按真实调用域核，终审时逐族对账。
- GLM：**premise verified / design agree（2026-09-18，r1，冻结 7ab20689；全部锚点/覆盖表本人直读，
  未读 Kimi 结论；上两批 editor/foundation 补测的 counter 教训——深快照、真实正控、负控鉴别力、
  官方 testSelection 口径——已吸收进本包执行计划）**。
  - **锚点直读**：A——`asset.ts:111-126` validateProjectRelativePath fail-loud 且**返回原值不规范化**；
    `map-index.ts:25-30` normalizeMapAssetPath **先 trim 再逐段规范化**——两路径 API 合同确不相同，
    卡面「不能写成同一合同」属实。B——`project-map.ts:120-130` dense/nullable collision 双签名；
    :126 矩阵行数=height×2 合同在 validateIsometricMapContent。D——`sprite.ts:83/98`
    spriteDefinitionFrameDemand/Indices 为纯计算（Pick<layout|poses>，无 IO）；`enemy-team.ts:15/35/49`
    结构/引用/合并三导出（id 非空去重、slots≤5、string|null 槽）。E——`actor-reference.ts:198`
    collectActorTaggedReferences **整树递归** vs :220 collectCanonicalActorTaggedReferences
    **单命令叶不递归嵌套臂**——「不能互当替身」属实；`command-target-reference.ts:278/313`
    全树 walker 与 rewrite 的分工边界在位。F——`validate-refs.ts:74` ContentBundle 双服务面确认。
  - **无 caller 排除独立复核**：`collectEnemyTeamTaggedReferences` 全仓 rg 仅 enemy-team-reference.ts
    自身声明/导出，零现行消费者——不默认补测、不授权删除，与卡面一致。
  - **覆盖表独立复算**：13 模块行/分支命中从当前 `coverage/fast/content/coverage-summary.json`
    逐文件复算，与工作包表**逐格一致**（asset 267/296·229/289、sprite 0/11·0/12、enemy-team 0/28·0/30、
    validate-refs 578/628·445/522 等）；content 557/50 与官方 fast 一致。468 未命中臂是缺口输入不是指标。
  - **13 个白名单测试名核对**：全部不存在可新增（下 op 前再逐个 ls 核验归属）。
  - **设计同意**：六组范围/白名单/执行纪律与我的可执行矩阵一致——每族「caller/已有断言→去重→合法
    正控→一轴反例→保真深快照+精确输出」；F 组先建干净非空 bundle 再单轴损坏、完整 Issue 多重集合
    比较（不 Set 去重、不 .some 首错即停）；覆盖对照直接 import coveragePackages/testSelection；
    每组≥2 实际执行的单点业务负控；已知缺陷隔离不固化。**非阻断建议**：C5 的 byteOffset 视图用例
    与 D1 的「一组资源多种定义」用例在旧包 counter 中有先例教训（数据合法性先过守卫），实施时优先。
  - **可证伪观察**：①若某族边界已被同合同既有断言覆盖→登记已有不重复（去重先行）；②拟造输入不属
    API 支持域（如给纯计算 helper 传非法布局）→撤回该用例；③负控 TypeError/超时/零用例不算鉴别力；
    ④深快照 JSON 往返丢 undefined/NaN/typed array→改保真比较；⑤发现现行实现与合同矛盾→停该族
    交 Codex，不反向写期望；⑥产品/旧测试/基线任何 diff→越界即停。
  - 返工项：无。三签齐且无 counter 后按卡连续 A→F。
- build准入：**build allowed（2026-09-18，Coding Owner 核验：Codex / Kimi / GLM 三席同 r1 设计签字齐、无 counter；生产与冻结 7ab20689 一致）。并行落盘披露：GLM 签字内容因 git 索引竞态被并入 Kimi 的提交 7ff4038f（内容完整已在远端，提交署名为 Kimi），不重写历史，Codex 收口时可补说明。**

### done前

- Codex：**counter（2026-09-18，dbe579c5接收复核；对比5fd655ec，冻结7ab20689）**。产品/旧测试/基线零改已核；116/673/tc及原6+12负控通过，覆盖+116语句/+127臂成立。但R1实际F场景/Sprite及A4页结构被当前守卫拒绝；R2六个已证执行的坏实现仍被候选断言放行；R3判据仅load标记且接受混合宿主错误日志；R4逐族完成账、命令、JSON格式与任务索引未闭合。见[报告与复建工具](../../testing/content-contracts-review.md)。不合入、不跑官方接收门禁、不转Kimi；不重开已核事实，不改GLM测试语义。
- Kimi：pending（独立终审）。
- GLM：**r1 返工实现者自验 accept（2026-09-18；非独立第三方；原候选自验已被 counter 覆盖，原文见 dbe579c5 树）**。
  - R1：F bundle 去退役 onEnter、sprites 补 label；F1/A4 主载荷在测试内先过 validateAuthorScenes/
    validateSprites/validateActors/validateBattleSprites——witness 工具 7 项 fixture 检查全 accepted；
    A4 普通字符串移入合法 hooks.onEnter.variants.main.flow 的 setFlag.flag。
  - R2：actor 表快照比较真正传入的同一对象；来源越界单轴+修正正控+精确错误路径；C5 非零 offset
    视图完整解码逐像素；F 全部确定 severity/完整 where/完整 Issue 多重集合（levelUp=warn；
    mapId 改称 map id 引用非物理路径）。
  - R3：mutants 判据自测（AST 抽取自身判据块：good 日志通过/混合坏日志拒绝；接收工具
    mixedFailureAccepted 已翻 false）+ JSON 运行态执行见证钉本组新增测试精确标题必须 failed。
  - R4：43 族逐项对账落 glm-content-contracts.md 回执；C4 补 encodeFrameSequenceFromProvider
    用例；B4 按 counter 锚点记已有（project-map.test.ts:91 + editor map-reference-facts.ts:73）、
    C8 记 N/A（frame-sequence.ts:98 手写 encodeUtf8 无 TextEncoder 分支）；覆盖命令改绝对路径
    可复制；evidence.json 过 Biome formatter。
  - 复跑：定向 13 文件 118/118、全包 55 文件/675 项、tc rc=0、新文件 Biome rc=0、mutants 18/18、
    witnesses 4 对照+6 针 detected+执行检查 passed、覆盖对照 +117 语句/+128 分支（/tmp 专属输出）。
  - 未做（按卡）：全仓 check/ratchet/strict-fast 留 Codex；无新产品缺陷、无隔离登记；不代签、不标 done。
- done准入：pending，不代签、不标done。

## 交接日志

- 2026-09-18 GLM（r1 返工完成）：合入 counter 31aa0e3b（原文保留），按 R1～R4 定点返工并复验：
  fixture 合法性（witness 7 检查 accepted）、六针全 detected、mutants 判据自测+JSON 执行见证
  18/18、43 族账重写、覆盖对照 +117/+128。定向 118/全包 675/tc/Biome 绿。返工实现者自验
  accept 已签本人席位；任务保持 rework，等 Codex 重新接收。
- 2026-09-18 Codex：同步5fd655ec，核候选dbe579c5与远端一致、工作树干净；独立116/673/tc、原18次负控和before557/after673覆盖均复算。实际fixture守卫拒绝，六条坏实现经Vitest JSON执行检查确认到达而候选原测试仍绿，混合错误日志仍被原判据接受；JSON格式/index检查失败。counter R1～R4转rework，未改候选源码/测试/官方基线；不代签、不标done，设计不重签。GLM下一步定点返工并核43族账，原回执见候选树。
- 2026-09-18 Kimi：完成 r1 独立设计/前提审查，签 premise verified + design agree，无返工项。
  直读 asset.ts:111 与 map-index.ts:25 两个不同路径合同、project-map nullable 结构、
  author-dialogue portrait/cue 守卫、actor-reference:198/220 与 command-target-reference:278/313
  canonical 叶 vs 递归 walker 两域、frame-sequence TPFS 头/index、project-loader 真实调用方；
  实测 collectEnemyTeamTaggedReferences 无现行消费者（排除正确）、覆盖快照与卡面逐项一致、
  白名单文件不存在。七条可证伪观察写入本席；范围确停测试补强、不固化已知缺陷。
  未改实现/他席/状态，未读 GLM 结论。Next：三签齐后 GLM 作为 Coding Owner 核 build 并
  连续 A→F；最终候选经 Codex 接收后再交本席终审。
- 2026-09-18 GLM：完成 r1 设计审查，签 premise verified + design agree，无返工项（附一条非阻断
  建议：C5 byteOffset 与 D1 多定义用例优先，先过数据守卫）。直读 asset/map-index 双路径合同、
  project-map dense/nullable、sprite/enemy-team/actor-reference 双 walker/validate-refs 锚点；
  独立复算 13 模块覆盖表逐格一致；collectEnemyTeamTaggedReferences 无 caller 复核确认。
  未读 Kimi 结论；仅改本席与日志，三签未齐不写任何测试。
- 2026-09-18 Codex：按用户要求整理一整块GLM工作，复算覆盖、查现行caller和已有测试，圈定六组13模块/13新测试白名单；主线7ab20689干净且与远端一致。只建立draft及工作包，未写测试/改产品/改基线；本席设计签字已落，两席提示同时给出。
- 2026-09-18 GLM（build 完成）：A→F 六组连续实施完毕，每组独立提交（A+B 合并为首提交，另含
  mutants 脚本、覆盖诊断 config、回执/evidence 收口共 7+1 提交）。116 项新测试全绿、tc rc0、
  Biome 0 error、12+6 负控两轮实跑 18/18、覆盖对照双口径落 /tmp。实现者自验 accept 已签本人席位；
  任务保持 review，等 Codex 独立接收。无下一位 Agent 提示词见下方 Codex 接收提示词。

## 下一位Agent提示词

### GLM · 当前R1～R4返工

```text
在 /Users/zhangxu/illegal/type-pal 返工 TEST-CONTENT-CONTRACTS-1 r1，卡 docs/ops/tasks/TEST-CONTENT-CONTRACTS-1-content-validation-boundaries.md，rework。原候选dbe579c5f7e8790d03d4ce1974449118537c021f，分支codex/glm-content-contracts-r1，产品冻结7ab20689；设计不重签。
先同步合入并保留Codex counter，读AGENTS/CLAUDE/READ-FIRST、本卡及docs/testing/content-contracts-review.md。只改原白名单测试/fixture/本人诊断与回执、必要任务index机械联动；不得改产品/旧测试/原探针/官方基线。
R1修实际F bundle的旧onEnter/缺sprite.label及A4非法page.body，主载荷先过当前结构守卫，不另造正控替主例背书。R2快照并比较实际传入actor表；地图来源负例只坏一轴并核路径；C5完整解码非零offset视图；F钉确定severity、完整where与Issue多重集合。
运行node docs/testing/content-contracts-review-witnesses.mjs <候选物理绝对路径>：当前六针均MISSED，返工应detected，执行检查本身必须passed；若fixture提取需适配，保留反例语义并告知Codex，不删见证或改产品规避。
R3原12针此次业务红保留，但工具须运行态执行见证/明确新增断言红因，并拒绝TypeError、timeout、Unhandled Errors；混合坏日志判据自测必须拒绝。R4按43族逐项列新增/已有/待证/防御/缺陷与真锚点，撤回“仅B4未做其它全新增”；B4可留后续但补实际caller/已有正控；C8按实际源码分类，不造TextEncoder降级。修标题、可复制覆盖命令、JSON Biome与任务index；数字/hash/失败记录从最终树生成。
保留有效用例与已核116运行/+116语句/+127分支，不为固定条数或100%凑数。复跑定向/全content/tc/全部新增文件Biome、原6+12与新见证、同口径/tmp覆盖；全仓check/官方ratchet/strict-fast仍留Codex。GLM为测试贡献者，不代签、不标done、不自行转Kimi终审。
```

### Codex · 重新接收 r1 返工（当前）

```text
在 /Users/zhangxu/illegal/type-pal 重新接收 TEST-CONTENT-CONTRACTS-1 r1 返工。任务卡 docs/ops/tasks/TEST-CONTENT-CONTRACTS-1-content-validation-boundaries.md（rework）；返工回执与 43 族账 docs/testing/glm-content-contracts.md；机器账 docs/testing/glm-content-contracts-evidence.json（已过 Biome）。候选分支 codex/glm-content-contracts-r1（worktree /Users/zhangxu/illegal/type-pal-glm-content-contracts），在你的 counter 31aa0e3b 之上追加返工提交；产品冻结 7ab20689447150eec7ecb0678cbb6980a685eb49；设计不重签。
GLM 已按 R1～R4 返工：主 fixture 在测试内先过现行结构守卫（你的 witness 工具 7 项 fixture 检查应全 accepted）；六针应全 detected 且执行检查 passed；mutants 脚本带判据 AST 自测（你的 mixedFailureAccepted 应翻 false）与 JSON 运行态执行见证（每针钉本组新增测试精确标题 failed）；43 族逐项账、可复制覆盖命令、Biome-clean JSON 已落。最终树 13 新文件 118 项、全包 55 文件/675 项、tc rc=0、覆盖 +117 语句/+128 分支（/tmp 同口径）。
请独立复核：重跑 node docs/testing/content-contracts-review-witnesses.mjs <候选物理绝对路径> 与 node docs/testing/glm-content-contracts-mutants.mjs；抽查 R1-R4 修复点与 43 族账锚点真实性；复跑定向/全包/tc/Biome。通过后统一串行执行全仓 check、官方 ratchet、受保护 strict-fast（GLM 未跑），在本席签 accept、更新看板并给 Kimi 终审提示词。仍有问题则 counter 并写明复现；不代签、不标 done。
```

### GLM · 原设计与实施提示（历史，按当前返工执行）

```text
在 /Users/zhangxu/illegal/type-pal 接手 TEST-CONTENT-CONTRACTS-1 r1，任务卡 docs/ops/tasks/TEST-CONTENT-CONTRACTS-1-content-validation-boundaries.md，draft；工作包/回执 docs/testing/glm-content-contracts.md。你是六组新测试Coding Owner；生产冻结7ab20689447150eec7ecb0678cbb6980a685eb49。
先同步查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡、工作包及指定既有测试；独立核caller/前提/矩阵，在自己设计席位签premise verified/design agree或counter并推送，不复述Kimi结论。设计未齐只读，不提前写正式或tmp测试。
三席同r1齐且无counter后，你可作为本卡Coding Owner同步并单独核定build allowed，再在codex/glm-content-contracts-r1独立worktree连续完成A资源/B地图组合/C帧容器/D定义/E对话typed引用/F跨表闭包；每组独立commit，整包交付，不逐组停下要签字。只动精确白名单新测试/薄fixture/诊断/本人回执，生产/旧测试/原探针/配置依赖/官方基线/项目资产零修改。13模块的468未命中臂不是新增测试指标；去重且只覆盖现行支持域，enemy-team-reference无caller、旧script-library及YJ2明确排除。
严格遵守合法主载荷+一轴负例、保真深快照/精确输出、每组≥2实际执行的单点业务负控、同源码同官方testSelection的before/after（/tmp输出）。新增缺陷隔离记录，不改产品、不固定错误期望、不skip/test.fails；不会视觉就不碰浏览器或截图。每组定向/明确相邻/tc/Biome、最终13文件与逐族分类/命令exit/失败记录/源码hash对账；先自审回执再交Codex。
不运行官方ratchet/strict-fast或抢跑全仓check；统一门禁由Codex集成后串行执行。主线若触及冻结content先协调，不能挪用旧报告。最终明确测试贡献者身份，不代签、不标done、不自行转Kimi终审。
```

### Kimi · 原设计提示（历史，已完成）

```text
在 /Users/zhangxu/illegal/type-pal 独立审 TEST-CONTENT-CONTRACTS-1 r1设计，任务卡 docs/ops/tasks/TEST-CONTENT-CONTRACTS-1-content-validation-boundaries.md，draft；工作包 docs/testing/glm-content-contracts.md，生产冻结7ab20689447150eec7ecb0678cbb6980a685eb49。GLM负责白名单测试，Codex负责独立接收/集成。
先同步，读AGENTS/CLAUDE/READ-FIRST、本卡/工作包，独立读13模块的现行导出、真实loader/publication/editor调用及已有测试；不读或复述GLM设计结论。核六组范围是否有真实增量、是否误固化旧接口/无caller或不可达输入；重点是asset与map路径合同不同、tiles/sources/nullable结构、TPFS独立字节oracle、帧需求不是实际资源帧数、canonical叶与递归walker域、干净bundle及精确severity/where。
审一次整包：白名单/冻结/不改产品，已知缺陷隔离、深快照/反控鉴别力、同testSelection覆盖对照、全包和局部口径分开。Codex已排除enemy-team-reference无caller和旧script-library/YJ2/战斗公式；不把coverage0等同完全没测。只在本人席位/日志写有一手锚点和可证伪观察的premise verified/design agree或counter，提交推送；不改他席/状态、不开始实现、不标done。
三席齐后GLM作为Coding Owner另核build并连续A→F，无需每组再签；你本轮只设计审查，最终候选由Codex接收后再交独立终审。
```

### Codex · 原接收提示（历史，已被 counter 取代；返工后重给）

```text
在 /Users/zhangxu/illegal/type-pal 接收 TEST-CONTENT-CONTRACTS-1 r1 整包。任务卡 docs/ops/tasks/TEST-CONTENT-CONTRACTS-1-content-validation-boundaries.md（review）；回执与机器账 docs/testing/glm-content-contracts.md + docs/testing/glm-content-contracts-evidence.json。候选分支 codex/glm-content-contracts-r1（worktree /Users/zhangxu/illegal/type-pal-glm-content-contracts），基点 5fd655ec；产品冻结 7ab20689447150eec7ecb0678cbb6980a685eb49。
先同步主线并核候选对冻结零漂移（除基线内 477cd0c6 的 docs/testing/README.md 一行外应只动白名单）。GLM 已交付六组 13 新测试文件 116 项、mutants 负控脚本（6 正控 + 12 变异针两轮 18/18）、官方 testSelection 覆盖对照（局部 13 模块与全包双口径，/tmp 输出）与实现者自验 accept；未发现新产品缺陷、无隔离登记项，B4 按工作包条款留待证。
你负责独立接收/集成：核对白名单与计数、抽读合同断言与 fixture 合法性（先过现行守卫）、复跑 13 文件定向与全 content 包、tc/Biome；复跑 node docs/testing/glm-content-contracts-mutants.mjs 验 18/18；按需重跑覆盖对照 config 验 /tmp 输出。然后统一串行执行全仓 check、官方 ratchet 与受保护 strict-fast（GLM 未跑，不得由其补跑）；全部通过后在本人席位签 accept、更新看板并给 Kimi 终审提示词。发现问题先 counter 并写明复现，不直接改 GLM 测试文件语义；不得代签他人或标 done。
```
