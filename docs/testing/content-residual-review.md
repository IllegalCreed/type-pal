# 内容合同残项：Codex独立接收复核

## 2026-09-21 Codex接手补正

用户要求直接修好，Coding Owner已移交Codex。源ccc67dcc的CR-R1已在b609617b补正：真实非空输入调用前后快照、当前结构自证及合法无肖像speaker；五针现全detected/七fixture accepted/mixedFailureAccepted=false，原15跑通过。仍23项，不重开原已闭环项。详见[分包补正与统一验证](tb00-tb01-completion.md)。统一候选44b9b763已过check7988/ratchet/受保护单次strict7497，本席实施者自验accept、转review，待两席新候选审查。下面counter留历史；本席不代替Kimi独立审查。

## 历史返工复核：ccc67dcc（2026-09-20）

**收窄counter：CR-R2/R3主要鉴别力及CR-R4计数/格式已闭环，只补原CR-R1实际输入保真/守卫自证残项。**
原三见证全部由候选自身检出；`mixedFailureAccepted=false`，七fixture独立检查accepted。原工具1对照+14针通过；
content全包60文件/698项（新增23）、tc通过；9文件Biome通过。未集成/未抬官方基线。

### CR-R1剩余（直接锚点钉ccc67dcc）

1. `validate-refs.data-refs.test.ts:114–115`先消费okBundle再拍okSnapshot，“调用前”注释不符；仅在合法world路径改money的坏实现仍候选4/4绿。
2. 同文件`:160–205`三个非空levelUp调用没有输入快照；`:207–211`的保真用例仍是空levelUp。在真实levelUp遍历内改level值的坏实现也仍候选4/4绿。
   两条均是原要求的非空实际入参保真，不新增能力范围。
3. 同文件`:151–156`合法shops正控没有前后快照；`asset.residual.test.ts:34–44`仍比较cue，但实际扫描的是noPortrait/badAsset。
   这两处是源码静态遗漏，没有冒称本轮新增了其动态坏实现；一并核实修正，或对防御输入如实收窄保真声明，不拿未消费对象作证明。
4. bundle内容经本席七检查合法，**不判它非法**；但提交的bundle工厂/用例仍未调用相应结构守卫，只有as unknown与零引用issue，
   原要求的候选内长期合法性自证未落下。引用正确与结构正确分开，补本包当前guard，不反向引Reforge。

### 独立反证（沿原R1加两针，不改前三针）

`content-residual-review-witnesses.mjs`共5对照全绿：原Unicode/portrait/world三针detected；
新增`valid-world-reference-mutates-money`与`nonempty-level-up-mutates-level`均MISSED，独立oracle均业务AssertionError。
不是候选运行错误，也不是产品现有突变；这是注入坏实现证明断言仍漏检，修后应5针候选自身均detected。
日志`/tmp/type-pal-content-ccc67dcc-five-witness.log`；summary：
`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-content-residual-RaVcKp/summary.json`。
其它日志：`/tmp/type-pal-content-ccc67dcc-mutants.log`、`/tmp/type-pal-content-ccc67dcc-check.log`、`/tmp/type-pal-content-ccc67dcc-biome.log`。
私有覆盖本轮未重跑；存在阻断，不运行接收后全仓check/ratchet/strict-fast。

### 历史GLM提示词（Codex已接手，不再执行）

```text
收窄返工TEST-CONTENT-RESIDUAL-1，卡docs/ops/tasks/TEST-CONTENT-RESIDUAL-1-registered-gaps.md，rework/r2，候选ccc67dcc，设计不重签。
先读本报告顶部并同步最新版content-residual-review-witnesses.mjs；原三针、Unicode正控、目标判据、23项/15跑/格式已闭环不重开。
只完成CR-R1残项：合法world快照必须在调用前；非空levelUp各调用前后比较真实载荷；同步补合法shops及实际noPortrait对象的保真，防御输入声明据实收窄；实际bundle工厂加当前结构守卫自证，不把本席七项检查冒充候选内置。别改产品或为计数加空例。
五对照须绿、五针候选自身AssertionError detected、mixedFailureAccepted=false、七fixture accepted；再复跑原15跑、相关定向/全content/tc/9文件Biome并按最终树回填。白名单不变，不改他席工具语义/旧测试/官方基线，不代签、不标done、不转Kimi；交Codex独立接收。
```

## 历史候选0e49db91（2026-09-19）

结论：**counter，任务转rework；已签设计r2不重签，实施包r1返工**。不集成正式测试，不转Kimi，不标done。
A3按r2裁决未新增文件正确；rows无上限、levelUp属主warn两项勘误正确，不改回错误合同。

白名单实际为5新测试+1薄fixture+mutants/config/机器账（三个诊断文件），合计9个可检查TS/MJS/MTS/JSON。
产品/旧测试/官方基线相对e58834f6零改；main/其它分支fixture不共享。分支对策划树的board/index登记不直接覆盖主线。

## 独立运行结果

| 检查 | 实际结果 |
|---|---|
| 五文件定向 | **23/23**，逐文件asset3/dialogue5/frame3/map8/refs4，不是24 |
| content全包与tc | **60文件/698项、typecheck exit0**；675既有+23，非674+24 |
| 原负控工具 | exit0，但实际**1对照+14针=15跑**，不是1+13；AST毒日志自测通过不代表完整判据无漏洞 |
| 新增文件Biome | **9文件、1 error、exit1**：validate-refs.data-refs.test.ts:132–134格式；非“7文件干净” |
| 同口径私有覆盖before/after | before675 / after698；行4458→4491/5183、语句4882→4921/5854、函数766→768/829、分支3798→3863/5016；不等于本包可接收 |
| Codex合法性抽核 | 实际bundle的scene/actor/sprite/battleSprite/startWorld/mapIndex与零引用issue七检查全accepted；**不把这些根谎称非法** |
| Codex三业务见证 | 三原实现对照绿；三个单点坏实现下候选均仍绿，独立oracle业务红：3 MISSED |
| 判据反证 | 候选目标STACK_TRACE_ERROR+另一例AssertionError被工具接受：mixedFailureAccepted=true |

日志均在 `/tmp/codex-dual-intake.DfkStJ/`：content-targeted.json、content-package.log、content-biome.log、
content-mutants.log、content-cov-before.log/content-cov-after.log及各cov子目录。
最终独立见证：content-witness-final2.log，summary：
`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-content-residual-Yhm352/summary.json`。
格式收口后再跑`content-witness-committable.log`仍为3对照绿/3 MISSED/混合误收；最终summary为
`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-content-residual-HyJF5Q/summary.json`。

## CR-R1：实际入参保真与world合法输入合同未落实

- `packages/content/src/asset.residual.test.ts:19–28`真正扫描合法cue后没有快照比较；
  :31–41保存的是cue，但实际传入noPortrait/badAsset，只有rows引用共享。改写真实cue.portrait.side的坏实现仍通过3/3。
- `packages/content/src/validate-refs.data-refs.test.ts:92–116`的world是三字段对象，party只有id/template/appearance，
  缺WorldState必需learnedSkills及CharacterInstance数值/装备/tags等（character.ts:16–29/187–207）。用as unknown绕类型，不是r2要求的正式buildWorld构造。
  根bundle经结构守卫可以通过，但候选未自己做七个表面自证；守卫只查结构，不能用引用零issue冒充结构已过。
- 其:173–177“输入不变”只检查没有worlds/shops/levelUp数据的空基线。坏实现仅在world引用扫描里改money，四候选仍绿。
- owner与skill两个引用同时坏可保留作组合检查，但不能替代“合法技能下仅坏owner”的单轴正控；空levelUp={}不是optional字段真正缺席，回执按实际分清。

返工：合法bundle各表面在新用例内真实过现行content守卫；world经buildWorld（不反向import Reforge）建立，先零issue再只坏目标引用；
在每个实际有数据的调用前拍**真正入参**、消费后比较，至少覆盖portrait扫描和worlds/shops/levelUp相关载荷。
asset非字符串正例不在合法cue域，如需保留必须列防御证据，不称合法负目标。

## CR-R2：所谓合法Unicode正控仍然在期待失败

`frame-sequence.residual.test.ts:61–66`把完整合法index替换成仅含“名/值”的非法对象，
再用/toThrow(index或期望)/断言，合法解码和UTF8拒绝都能过，未证明“完整往返”。
Codex只将decodeUtf8改为拒绝**所有合法非ASCII解码结果**，候选3/3仍绿；真正完整index加Unicode扩展键的合法容器则被拒，独立oracle红。

返工：保留合法index必需字段与真实payload，只加允许的Unicode扩展键并重写完整u32长度，正式parse成功且数据内容正确；
非法JSON/合法JSON坏schema分别钉不同的准确业务错误，不用泛化toThrow互相遮盖。withIndexBytes目前读旧长度只取低16位，改用完整u32合同，不扩大产品能力。
这不要求编码器生成Unicode；已签r2仅测外部解码合法域。

## CR-R3：负控判据仍能借另一例的业务错误认证目标

`glm-content-residual-mutants.mjs:264–284`只检查整份输出含AssertionError、目标status=failed，
不验证该目标failureMessages错误类型，排除列表也漏STACK_TRACE_ERROR。
本席AST直接抽取**实际两段判据**：目标只报STACK_TRACE_ERROR、另一个用例报AssertionError、loaded marker与非零退出条件满足时，
结果仍接受。不能用另一例/独立oracle的错误认证目标自身业务失败。

返工：目标精确标题确已运行、failureMessages非空、每条错误首行都为AssertionError；全套无宿主/未处理错误。
永久化自测至少包括目标超时+另一例业务红、目标未运行、混合宿主错误、纯业务红；保留单点替换与hash不变。
原14针这次真实运行的红因不因此自动判假，但工具可误判是独立验收缺口。

## CR-R4：从实际提交树重算计数/格式/回执

- 定向23而非24、refs4而非5；机器账既写newTotal24又在每针写executedTests23，内部已矛盾。
- 原工具是14针+1正控，不是13针+1；对应header/README式叙述、卡签名外的当前回执和机器账需同步。
- Biome实际9文件一错误。格式错误修复后全文件重跑，不以只查7文件声称全部干净。
- A3跨包已有、未知分片域不补保持；逐族账应提供旧测试**精确标题与新增差异**，不是仅模块大类/族名。
- 顶部“未交付”和旧build领取提示在接收返工后应转成历史，设计不重签，不代改其它席位历史结论。

## 重建与工具自证

```bash
node docs/testing/content-residual-review-witnesses.mjs /Users/zhangxu/illegal/type-pal-glm-content-residual
node /Users/zhangxu/illegal/type-pal-glm-content-residual/docs/testing/glm-content-residual-mutants.mjs
```

第一工具是只读诊断：正常实现必须绿，坏实现oracle必须业务红；输出MISSED仍可exit0，不能只看退出码。
返工目标：三针候选自身detected、mixedFailureAccepted=false，合法性七检查accepted。所有产品/候选文件hash前后不变。

本席工具开发过程也如实登记：首个Unicode oracle误用了不存在的index.frameCount，原实现对照红，已改frames数组合同；
随后world needle匹配两处被唯一性断言拒绝，已收窄到appearance.battleSprite唯一行。两次失败不归GLM/产品；
最终完整三对照/三针与判据反证复跑才作为证据。无正式测试或候选语义修改。
本次审查工具/证据JSON四文件Biome通过，文档门（20工具测试+链接/状态）通过，冻结覆盖台账复算通过。

## 准入与队列

两包裁决独立；本包自身存在CR-R1～R4，故不接收。运行时包另有D6收尾counter；本轮无包释放实施槽，
TB-02仍保持已签设计待槽，不因想消耗额度跳过两批上限。GLM可继续已授权设计审核，但实施先返工。
没有可接收包，因此不运行接收后全仓check/官方ratchet/strict-fast、不改变官方7049基线；返工通过后按用户要求两包共用一次串行全仓门。

## 下一位Agent提示词：GLM

```text
在 /Users/zhangxu/illegal/type-pal 返工 TEST-CONTENT-RESIDUAL-1，任务卡 docs/ops/tasks/TEST-CONTENT-RESIDUAL-1-registered-gaps.md，rework；实施候选0e49db91，已签设计r2不重签，生产冻结e58834f6。
先同步本次Codex counter与docs/testing/content-residual-review-witnesses.mjs到独立分支，保留主线七批设计和他席；读AGENTS/CLAUDE/READ-FIRST、docs/testing/content-residual-review.md及原工作包。
CR-R1：真实cue/world/shops/levelUp消费前后快照，world用content buildWorld、表面现行guard+零issue正控；不反向引Reforge，不把缺字段world/as unknown或未实际消费对象当保真证据。CR-R2：完整合法Unicode TPFS必须parse成功，UTF8/JSON/schema错误分开准确断言，header长度按u32。CR-R3：负控逐一核目标自身failureMessages，目标STACK_TRACE_ERROR+别例AssertionError必须拒绝，自测与执行见证都永久化。CR-R4：真实23=3/5/3/8/4、14针+1对照、9文件Biome一错误等勘误，修后从最终树重生，不以凑24为目标；族账精确去重。
三独立见证须detected且mixedFailureAccepted=false，七fixture检查accepted；原工具、定向/相邻/content全包/tc/全部新增文件Biome/私有同口径覆盖复跑。只改原白名单，不改产品/旧测试/官方基线/他席工具语义，不代签、不标done、不转Kimi。与TB00返工独立提交；Codex接收后再跑统一全仓门，本轮未释放TB02实施槽。
```
