# TEST-CONTENT-CONTRACTS-1 - 内容数据校验与引用边界补测

Status: draft
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
- Kimi：pending（独立设计/前提审查）。
- GLM：pending（实现可行性与矩阵设计；不是实施后的独立第三方自证）。
- build准入：pending，待三席同r1齐且无counter；用户未豁免。GLM核齐后方可作为Coding Owner开build，Reviewer不得提前改状态。

### done前

- Codex：pending（独立接收/集成/官方门禁）。
- Kimi：pending（独立终审）。
- GLM：pending（实现者自验与贡献披露，不作为独立第三方）。
- done准入：pending，不代签、不标done。

## 交接日志

- 2026-09-18 Codex：按用户要求整理一整块GLM工作，复算覆盖、查现行caller和已有测试，圈定六组13模块/13新测试白名单；主线7ab20689干净且与远端一致。只建立draft及工作包，未写测试/改产品/改基线；本席设计签字已落，两席提示同时给出。

## 下一位Agent提示词

### GLM

```text
在 /Users/zhangxu/illegal/type-pal 接手 TEST-CONTENT-CONTRACTS-1 r1，任务卡 docs/ops/tasks/TEST-CONTENT-CONTRACTS-1-content-validation-boundaries.md，draft；工作包/回执 docs/testing/glm-content-contracts.md。你是六组新测试Coding Owner；生产冻结7ab20689447150eec7ecb0678cbb6980a685eb49。
先同步查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡、工作包及指定既有测试；独立核caller/前提/矩阵，在自己设计席位签premise verified/design agree或counter并推送，不复述Kimi结论。设计未齐只读，不提前写正式或tmp测试。
三席同r1齐且无counter后，你可作为本卡Coding Owner同步并单独核定build allowed，再在codex/glm-content-contracts-r1独立worktree连续完成A资源/B地图组合/C帧容器/D定义/E对话typed引用/F跨表闭包；每组独立commit，整包交付，不逐组停下要签字。只动精确白名单新测试/薄fixture/诊断/本人回执，生产/旧测试/原探针/配置依赖/官方基线/项目资产零修改。13模块的468未命中臂不是新增测试指标；去重且只覆盖现行支持域，enemy-team-reference无caller、旧script-library及YJ2明确排除。
严格遵守合法主载荷+一轴负例、保真深快照/精确输出、每组≥2实际执行的单点业务负控、同源码同官方testSelection的before/after（/tmp输出）。新增缺陷隔离记录，不改产品、不固定错误期望、不skip/test.fails；不会视觉就不碰浏览器或截图。每组定向/明确相邻/tc/Biome、最终13文件与逐族分类/命令exit/失败记录/源码hash对账；先自审回执再交Codex。
不运行官方ratchet/strict-fast或抢跑全仓check；统一门禁由Codex集成后串行执行。主线若触及冻结content先协调，不能挪用旧报告。最终明确测试贡献者身份，不代签、不标done、不自行转Kimi终审。
```

### Kimi

```text
在 /Users/zhangxu/illegal/type-pal 独立审 TEST-CONTENT-CONTRACTS-1 r1设计，任务卡 docs/ops/tasks/TEST-CONTENT-CONTRACTS-1-content-validation-boundaries.md，draft；工作包 docs/testing/glm-content-contracts.md，生产冻结7ab20689447150eec7ecb0678cbb6980a685eb49。GLM负责白名单测试，Codex负责独立接收/集成。
先同步，读AGENTS/CLAUDE/READ-FIRST、本卡/工作包，独立读13模块的现行导出、真实loader/publication/editor调用及已有测试；不读或复述GLM设计结论。核六组范围是否有真实增量、是否误固化旧接口/无caller或不可达输入；重点是asset与map路径合同不同、tiles/sources/nullable结构、TPFS独立字节oracle、帧需求不是实际资源帧数、canonical叶与递归walker域、干净bundle及精确severity/where。
审一次整包：白名单/冻结/不改产品，已知缺陷隔离、深快照/反控鉴别力、同testSelection覆盖对照、全包和局部口径分开。Codex已排除enemy-team-reference无caller和旧script-library/YJ2/战斗公式；不把coverage0等同完全没测。只在本人席位/日志写有一手锚点和可证伪观察的premise verified/design agree或counter，提交推送；不改他席/状态、不开始实现、不标done。
三席齐后GLM作为Coding Owner另核build并连续A→F，无需每组再签；你本轮只设计审查，最终候选由Codex接收后再交独立终审。
```
