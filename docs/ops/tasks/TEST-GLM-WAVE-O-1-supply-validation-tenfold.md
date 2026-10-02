# TEST-GLM-WAVE-O-1 — 当前供应链、内容守卫与migrate门十倍测试包

Status: rework
Phase: phase2
Capability: supply-validation / test-coverage
Coding Owner: GLM O（仅新测试与专属证据）
Reviewer: Codex（独立验收、集成和正式覆盖结算）
Visual Verification Timing: N/A（CLI/纯校验；不改UI）
Branch: `codex/glm-wave-o-supply-validation-r1`（新独立worktree）

Execution Model: GLM-5.3（个人套餐文本模型；代码/类型/反控/账目，无视觉阶段）

## 目标、冻结与排重

用户2026-09-30要求三张至少十倍规模的独立卡。O目标 **700合法未重复用例、60合同
工作组、50有效反控**；十里程碑连续做，先解migrate比率门，再做内容/共享守卫残余。
[共同协议](../../testing/glm-tenfold-triple/README.md)为本卡硬验收条件，
[冻结表](../../testing/glm-tenfold-triple/targets.json)给105个源、SHA256与825候选未命中臂。
生产冻结 `3ac9a2e2f6aba8a5cc97640c18fef8549d199380`，派发树已有L/M/N，禁止重造旧断言。
这是剩余合同扩围，不是恢复旧转换卡或改官方分母；700不允许机械换参数凑数。

## 前提真值门与上下文

工程前提：已退休原版脚本转换不再是消费者；当前窄供应、三方合并/事务、内容校验仍在使用。
before→after仅测试证据增强，产品/格式/发布行为保持冻结；用户可见取舍N/A。

| 真值维度 | 锚点与边界 |
|---|---|
| primary | `packages/migrate/README.md:27-48`当前入口及dry-run先恢复事务；`migration-transaction.ts:264,277`真实恢复/提交入口 |
| 一阶段 | 不裁决玩法/原版脚本；原始静态资源仅窄供应输入，禁止恢复旧translator |
| 二阶段 | `pal-current-publication.ts:111`现行publication；`migration-transaction.ts:27-31`项目旧hash合同；content现行guard以真实公开caller为准 |
| 目标 | 仅typed临时工程与公开入口补证；[退役卡](../archive/tasks/done/ARCH-PAL-SUPPLY-1-author-publication-and-import-retirement.md)r6与97文件退休边界保持 |

最强替代解释：缺口属于fast不测真实PAL的范围、CLI/原版输入依赖或旧测试已有断言。
推翻观察：需要假造内部索引/生产强转、复活无消费者旧模块、主工程写盘或新产品裁决才能测，
该组停止并记blocked/不可合法构造，不按覆盖数字硬补。第二阶段先读READ-FIRST铁律10/11。

## 十里程碑（每域六轴，共60工作组）

| 批 | 领域及先读源 |
|---|---|
| O01 | migrate门优先：pal-current-publication、pal-assets、migration-transaction；statement/line缺口先核公开路径 |
| O02 | 临时工程三方merge/plan、ownership、删除/新增/冲突及输入不可变 |
| O03 | journal恢复/manifest最后提交、TOCTOU、符号链接/路径、partial failure；只在mkdtemp |
| O04 | catalog/资源hash、bake-indexed-rgba、PNG/RLE边界与供应IO；不写真实资产 |
| O05 | 静态角色/商店/地图/窄物品消息、sprite registry/alias显式引用；不翻译剧情 |
| O06 | content项目/scene/map/asset引用、诊断路径与混合错误优先级 |
| O07 | author/runtime script、嵌套分支/脚本库与当前单版本guard；不改schema |
| O08 | actor/enemy/team/skill/item/poison字段、跨引用与生命周期guard残余 |
| O09 | locale/rich-text/frame-sequence/sprite/stamp/tileset公开数据合同 |
| O10 | shared输入/资源/排序小边界及CLI临时工程入口残余；全账去重与门禁 |

每域六轴：正常输入/结果；边界拒绝与精确诊断；字段维护权/引用不丢；失败资源释放；
重放幂等与输入不变；caller组合/先后顺序。没有相应异步/释放合同就记N/A，不造假能力。
每批约70用例目标与至少5枚有效反控。O01先交可复核门缺口证据，但不等待用户才继续后九批。
旧比率同分母下至少需142 statements、5 branches、156 lines；不是官方放行承诺。

## 写入、证据与验收

只写migrate/content/shared `src/**/*.glm-o.test.ts(x)`、各自
`src/__tests__/glm-o/**`、`docs/testing/glm-tenfold-triple/wave-O/**`。
脚本源测试置src，用公开入口/独立临时cwd；不跑主项目migrate CLI（含dry-run）。
P/Q包、旧测试、产品、配置、锁、真实PAL/存档、官方baseline、共享导航/任务卡/看板只读。

按共同协议交十批contracts账、最终定向JSON全fullName/status、50枚正/变/恢复完整日志/
执行数/退出码/业务AssertionError/三态hash/可重建patch、同源同分母覆盖对照、准确receipt。
末批串行三个Owner包全量test/typecheck、根lint完整0/0/0、docs、区间diff、verifier。
合法坏数据只进入公开unknown/IO校验拒绝合同，不强作合法运行时值。
不得改官方include/exclude/provider/baseline；Codex独立复核后才串行统一check/ratchet/protected fast。

## 当前模式推进记录

- Codex：生产库存/当前消费者/目录独占与退役边界已核，**build allowed仅测试**。
- Coding Owner：GLM O；独立分支/worktree，不与P/Q共享可写fixture。
- 原版机制或产品修复准入：未开放；发现缺陷交最小红诊断，不冻结bug或越界修复。
- 贡献者交付/独立验收：pending；done准入blocked，700合法合同不足时交证据申请调整。
- 用户产品验收N/A：纯测试；官方门由Codex，不恢复固定三签。

## 下一位GLM O提示词

```text
你是 TEST-GLM-WAVE-O-1 唯一测试Owner。任务卡 docs/ops/tasks/TEST-GLM-WAVE-O-1-supply-validation-tenfold.md，当前build allowed仅新测试。
从本轮已推送派发提交（转发消息给40位SHA）新建 codex/glm-wave-o-supply-validation-r1 与独立worktree；基点包含L/M/N。
先读AGENTS、READ-FIRST、退役卡r6、GLM自检、glm-tenfold-triple共同协议/targets/本卡，跑verify-targets。
连续十批做O01–O10，700合法未重复合同/60组/50有效反控；先补当前migrate比率门，禁止恢复旧translator。
仅写本卡O白名单，公开真实入口+typed临时工程；按协议交最终JSON、逐合同去重、正变恢复日志/hash/patch与同分母私有覆盖。
串行migrate/content/shared全包test/typecheck、根lint0/0/0、docs/diff/verifier，提交推送完整候选SHA。
产品/旧测/配置/官方baseline/真实项目/P/Q/共享文档只读；不合main、不标done。缺合法新合同或真缺陷时交证据停该组，不凑数。
```

## Codex 独立审核返工项（2026-10-01）

候选 `214643a2379c263f86a74ee0b78f5473af5354f7`，远端与本地相符。
Codex **counter → rework**；这是274/700例、30/50枚反控的部分交付，未完成O06–O10。
[独立审查与返工项](../../testing/glm-tenfold-triple/codex-review-20261001.md)、
[457例实跑及门禁机器证据](../../testing/glm-tenfold-triple/codex-review-20261001.json)
覆盖上方旧派发提示词，历史数字不追溯改写。

- 冻结716/716及白名单通过；新例255+19全绿、三个Owner包typecheck零、docs零。
- O-01：最终lint四个格式诊断；区间diff六个mutation.patch尾随空白/EOF诊断，必须清零，不能损坏patch。
- O-02：新测试的as unknown as/as never等禁止桥需清零；合法typed fixture与真实unknown/IO拒绝入口分开。
- O-03：缺contracts.json；30枚没有恢复后执行，工具哈希未变候选不能代替恢复跑绿。
- COMMON-01：原700例/60组/50有效反控目标保留，继续O06–O10；缺合法合同须逐项举证后申请调整。
- 稀疏pages缺陷暂未证明canonical caller合法，不授权修产品；全包/正式覆盖/统一门本轮未复跑，未accept。

### 下一位 GLM O 提示词（返工，取代旧派发提示词）

```text
你继续 TEST-GLM-WAVE-O-1，原分支 codex/glm-wave-o-supply-validation-r1，起点候选 214643a2379c263f86a74ee0b78f5473af5354f7。当前 rework，仅原白名单测试/fixture/专属证据可写。
先读 /Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/ops/tasks/TEST-GLM-WAVE-O-1-supply-validation-tenfold.md 的2026-10-01返工段与所链Codex审查/机器证据，再读共同协议和GLM自检。
先闭合 O-01/02/03：lint四格式与diff六patch零诊断；禁止桥改为typed合法fixture/真实IO拒绝；补逐合同账和30枚实际恢复执行的完整三态JSON/raw/退出码/执行数/目标AssertionError/hash，可重建patch不能trim坏。
保留已交成果，连续补O06–O10，原目标700合法未重复例/60组/50有效反控不缩；不足交逐合同existing-proof/unreachable/blocked证据，不用超时或数字换值灌水。稀疏pages疑似缺陷交canonical guard/caller，不夹修产品。
仍钉派发基点8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380；不得cherry-pick Codex共享审查提交或改基点绕过白名单，源漂移先交Codex。
最终实跑JSON与源hash重核；串行migrate/content/shared全包test/typecheck、根lint完整0/0/0、docs、区间diff、verifier，再提交推送完整候选SHA。产品/旧测/配置/官方baseline/真实工程/P/Q/共享卡看板只读，不合main、不标done、不清树。
```

## Codex r2 二审（2026-10-01）

候选 `4d1fbd80e4bc61987d7d94eb2733d6aa8ca4d9af`（本地/远端一致）。
**counter，保持rework**，401/700实跑例、44/50提交反控仍属部分交付；
运行数未扣非法/重复，不能当作401已accept新合同。旧记录不追溯改写。
[二审详情](../../testing/glm-tenfold-triple/codex-op-r2-review-20261001.md)、
[机器证据](../../testing/glm-tenfold-triple/codex-op-r2-review-20261001.json)。

- 已关闭：旧六个patch whitespace；44枚恢复后实际JSON/raw齐备，三态hash对应最终文件，
  O44个patch解析/只读apply检查通过。这里只审计全部证据，未独立重跑44枚。
- 独立全包migrate704/content1352/shared145共2201绿；新401与directed逐条一致，
  typecheck×3、docs/diff、716源/469白名单路径零问题。
- O-R2-01：7处禁止桥+2处单断言藏必填字段仍在；unknown-actor测试实际因no-battler红，
  typed合法fixture与精确oracle需修。位置见详情，不能以tsc绿豁免。
- O-R2-02：缺逐合同contracts.json；canAct/canCastMagic五断言重复旧测；
  O07–O10等合法残余继续，原700/60组/50目标不缩。缺合法轴须逐合同举证申请。
- 硬静态counter：wave-O的coverage-delta.json/directed-vitest.json/receipt.json共3格式error，
  warning/info零但整体不通过；包例数、lint数、区间路径与最终回执须同步。
- DEFECT-O-1仍缺canonical guard/caller证明，只保留疑似；不夹产品修复。
- 不合main、不done、不清活动树；私有比率不等于正式ratchet解阻或85%。

### 下一位 GLM O 提示词（r3，取代上方返工提示词）

```text
你继续 TEST-GLM-WAVE-O-1，原分支 codex/glm-wave-o-supply-validation-r1，候选起点 4d1fbd80e4bc61987d7d94eb2733d6aa8ca4d9af。当前rework，仅原O新测试/fixture/wave-O白名单可写。
先读 /Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/ops/tasks/TEST-GLM-WAVE-O-1-supply-validation-tenfold.md 的Codex r2二审段、所链codex-op-r2-review-20261001.md/json，再读共同协议和GLM自检。
旧patch空白和44枚恢复记录已关闭，保留成果；修详情列7处禁止桥与2处缺必填字段，坏数据仅走真实unknown/IO guard，修ghost已存在却以no-battler拒绝的错误oracle，用合法fixture和精确missing-actor诊断。
清三个JSON格式诊断，补逐合同contracts.json，按旧fullName/断言锚点逐项排重，canAct/canCastMagic重复不得算新；更新最终包例数/lint/469路径等回执，DEFECT-O-1疑似表述与证据同义。
连续补O07–O10等合法残余，原700合法未重复例/60组/50有效反控不缩；缺合法轴给existing-proof/unreachable/blocked逐条件证据申请，不靠时间预算/机械参数灌水。所有最终三态hash/patch/JSON/raw/执行数重核，不把审计冒称Codex全量实跑。
派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变；不得cherry-pick Codex共享审查提交或改基点绕白名单，源漂移先报Codex。
最后串行migrate/content/shared全包test/typecheck、根lint完整0/0/0、docs、区间diff、verifier；定向file×fullName×status与最终实跑一致，推送完整40位候选。产品/旧测/配置/官方baseline/真实工程/P/Q/共享卡看板只读；不合main、不标done、不清树。
```

## Codex r4 固定候选预审（2026-10-01）

测试树 `590dd57ab867519281065c7aadc998b263907ae3`，docs pin
`894641a41be1d7099abda08c3b170b84007d39f5`；**counter，保持rework**。
[最新窄项](../../testing/glm-tenfold-triple/codex-zcode-oq-preflight-20261001.md)、
[机器复算](../../testing/glm-tenfold-triple/codex-zcode-oq-preflight-20261001.json)。

- 七桥/两fixture-oracle旧项和canAct整例排重在代码层关闭，保留，不重复返工。
- O-R4-01：442身份对应，但400 source/caller/batch占位，442旧锚/oracle模板；补真实逐合同账。
- O-R4-02：56生产/变异hash与历史三态对应，仅六枚最终执行集漂移（O08-CC1/2、
  O10-CC2/3/4/5）需重采，其它50枚保留。未独立执行56枚业务反控。
- O-R4-03：最后receipt格式未过配置对照，数量/区间口径旧；按最终唯一合同重算。
- 本轮716源/595白名单路径/diff复核通过；未新全包/官方门，442不当accept净增。
- 再续原合法残余，700/60组/50不缩；只有原白名单可写，不合main/不done。
  提示由Codex直接发，用户无需转交；发送成功前不得称新返工已执行。


## Codex r6 独立审核（2026-10-01）

固定本地/远端候选 `1d805509af6ecd94a95c0965d373bf98ccde123c`，**counter，保持rework**。
[O本轮独立复核](../../testing/glm-tenfold-triple/codex-o-r6-review-20261001.md)、
[机器证据](../../testing/glm-tenfold-triple/codex-o-r6-review-20261001.json)。

三包704/1410/154合计2268绿，新468身份逐条一致；typecheck×3零、lint3153文件完整0/0/0、docs/diff/verifier通过。旧六针漂移关闭，62份存档三态hash/执行集全对齐，旧50未动；不是62枚独立业务重跑。O-R6-01真账/重复gate失败/未证allAllies与死亡轴，O-R6-02 item-use as never缺exp及Record桥，O-R6-03判据零执行/真实未处理异常漏收/不保stderr及全局prune，O-R6-04最终254/188/26、658路径和历史/未完账需修。原700/60组/50不缩，468非已accept净增，私有migrate比率不是正式门。

不合main、不标done、不清贡献者树、不正式覆盖结算。用户已撤销直接ZCode操作授权；
上方历史自动续派说明不再执行，以下由用户手动转发。

### 下一位GLM O提示词（本轮最新）

```text
继续 TEST-GLM-WAVE-O-1，原树 /Users/zhangxu/.codex/worktrees/glm-wave-o/type-pal，原分支 codex/glm-wave-o-supply-validation-r1，固定审核候选 1d805509af6ecd94a95c0965d373bf98ccde123c。先读 /Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/ops/tasks/TEST-GLM-WAVE-O-1-supply-validation-tenfold.md 最新 r6 独立审核段及所链 codex-o-r6-review-20261001.md/json，按 O-R6-01～04 窄返工：合同账不能用token最近标题/首条expect代替逐条件排重与完整oracle；删 item-effects gate失败重复，不计 item-use 用存在hero伪证缺目标轴，死亡跳过未测须更名或先排重再补合法轴；item-use world/useItem 改完整 typed WorldState/CharacterInstance/ItemData，补exp、去as never及Record扩展强转；runner零执行/pending/todo/skip/异身份/错file或fullName/未处理异常/raw harness/signal/spawn拒收，保留stdout+stderr，不全局prune；最终包分布254/188/26及658路径从树生成，历史数字标历史，锚点与docs-only区间明确，勿循环自pin。旧七桥/两oracle/canAct删重、六针漂移及62枚hash对应项已关闭；不重跑未变业务，仅重采改动文件受影响针（item-effects目前O08-CC6/7、O09-CC12；item-use目前O09-CC6/7），其他保留。继续原合法余族，700例/60组/50有效反控不缩，468仍部分，缺合法轴逐项existing-proof/unreachable/blocked申请。只写原O白名单新测/专属fixture/wave-O证据，CLI mkdtemp合成工程，真实工程migrate含dry-run禁止；派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变。最终串行migrate/content/shared全包test/typecheck、lint完整0/0/0、docs/diff/verifier后推送40位候选；产品/旧测/配置/官方baseline/真实数据/P/Q/共享文档只读，不合main、不标done。
```


## Codex r7 最新独立复核（2026-10-01）

固定本地/远端 `a708ac4fbb5c7a25549b03805880779048e647c5`，**counter / rework**。475执行不是475净新合同；新content1417绿，未变migrate704/shared154与typecheck复用，总2275。lint3173文件0/0/0、docs/diff/716冻结/690白名单路径通过；65三态对应、63不同目标，57旧存档不变。旧typed桥与gate/allAllies伪轴删除关闭，不重开。O-R7-01真账仍首expect/token匹配且新equip包至少6旧合同重复；O-R7-02实际runner异身份恢复/错fullName后缀/真实未处理异常/-1退出误收，自测为另一复制判据；O-R7-03 225/234、194/690、30组及最后工具/报告锚需分开。原700/60组/50不同目标不缩。

[详细判定与下一步](../../testing/glm-tenfold-triple/codex-opq-latest-review-20261001.md)、
[机器证据](../../testing/glm-tenfold-triple/codex-opq-latest-review-20261001.json)。
本轮未合main、未done、未官方覆盖结算、未新视觉；不写贡献者树，不自动投递。
用户手动选择GLM-5.3后转发以下代码提示词；P视觉另阶段手动选Flash。

### 下一位GLM O代码提示词（本轮最新）

```text
继续TEST-GLM-WAVE-O-1，唯一O Owner，原树/Users/zhangxu/.codex/worktrees/glm-wave-o/type-pal、分支codex/glm-wave-o-supply-validation-r1，固定a708ac4fbb5c7a25549b03805880779048e647c5。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/ops/tasks/TEST-GLM-WAVE-O-1-supply-validation-tenfold.md最新段和同树docs/testing/glm-tenfold-triple/codex-opq-latest-review-20261001.md/json。仅执行O-R7-01～03：逐条件真账/真实旧fullName与断言行/完整业务oracle，不再token匹配或首expect；item-equip六明确旧合同扣除，其它加强轴举证保留。实际runner和自测共用唯一judge，完整三态多重身份/精确目标/状态/JSON和raw错误/正常退出/signal/spawn拒收，补已给4误收反例，不复制另一判据。按最终blob同步225/234、690路径、65存档63目标、工具/证据锚41ce5430与报告锚及docs-only区间。保留已关闭旧桥、gate/allAllies删重、五受影响针更新和未变57针，不重采未变业务。然后连续原合法余族，700合法未重复例/60组/50不同目标不缩、不凑数；缺合法轴逐项existing-proof/unreachable/blocked申请。仅原O白名单新测/fixture/wave-O证据可写，派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，真实工程与产品/旧测/配置/baseline/P/Q/共享文档只读，CLI仅mkdtemp合成。每批定向相邻/typecheck并阶段推送，最终全包/静态零/docs/diff/verifier及完整真实SHA；不合main、不done、不跑官方门、不清贡献者树。
```


## Codex r8 独立复核（2026-10-02）

固定本地/远端 `5cf74bdd1ae3dd47d953b504362c83697cb5fbb0`，**counter / rework**。469最终执行身份匹配；新content1411绿/typecheck零，完整包/配置锁相同的migrate704/shared154及typecheck复用，合计2269。lint3174文件完整0/0/0、docs/diff/716冻结/691白名单通过。唯一judge22自测绿但实际跨相强求状态相同误拒正常0→1→0；O01-CC1实际runner又因短title误拒；collection/runtime反例漏收。唯一导入/raw真实异常/exit及清理子项关闭，不重做。已删目标O08-CC8/9、O09-CC13退役，当前62存档60目标成立，不重采不存在合同。真账仍239 token推新/首断言及残缺oracle；资源7→0同已证条件不计新，最多468净新候选，缺口至少232。700/60组/50不同合同目标保留。

[详细判定与下一步](../../testing/glm-tenfold-triple/codex-opq-r8-review-20261002.md)、
[实跑与逐针机器证据](../../testing/glm-tenfold-triple/codex-opq-r8-review-20261002.json)。
本轮无新视觉、未合main、未done、未正式覆盖结算；不写贡献者树、不自动投递。
以下代码阶段请用户发送前手动选 **GLM-5.3**；P视觉另阶段手动选Flash，不混派。

### 下一位GLM O代码提示词（覆盖旧交接；用户手动转发）

```text
继续TEST-GLM-WAVE-O-1，唯一O Owner，原树/Users/zhangxu/.codex/worktrees/glm-wave-o/type-pal、分支codex/glm-wave-o-supply-validation-r1，固定5cf74bdd1ae3dd47d953b504362c83697cb5fbb0。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/testing/glm-tenfold-triple/codex-opq-r8-review-20261002.md/json及原卡最新段。只补O-R8-01～03：正常0→1→0身份相同但目标状态应变化，修唯一judge的跨相状态误拒、spec短title误拒，完整目标/完整包路径与collection/runtime拒收；用真实存档及整段合法生命周期正控自测。O08-CC8/9、O09-CC13目标已删，保留历史并退役，不重采或重造；剩余62存档60目标不变保留。旧删重/typed/raw未处理异常/exit拒收与清理已闭合不重做。分域人工真账替代token最近标题与首断言生成器；明确matcher和值、源条件/caller、旧fullName断言锚。资源7→0同条件cross-check不计新，同步净新上限468/缺口至少232、691路径和历史数。然后持续原合法余族，700/60组/50不同合同目标不缩，CLI仅mkdtemp。派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，仅原O新测/fixture/wave-O白名单；产品/旧测/配置/baseline/真实数据/P/Q/共享文档只读。每批定向相邻/typecheck，最终静态0/0/0、全包/docs/diff/verifier后阶段推送完整SHA；不合main、不done、不官方门、不清树。
```


## Codex r9 独立复核（2026-10-02，最新）

固定 ad468369015a4ec9c4652f3e24de603f77c42b07，counter/rework。新704/1439/154全绿、三typecheck零，lint3215文件0/0/0、docs/diff/716冻结/760白名单过，497最终身份匹配。69三态结构对应/67执行目标；正常三态误拒、collection/runtime与三旧针退役关闭，实际O01-CC1 runner全过并干净清理。新6强转、至少4 ambience旧合同、串邻例/截答案/token真账未闭；judge仍末两段路径跨包误收与顶层执行数漏核、新7短title未钉完整目标。净新上限≤492、缺口≥208并待合法性复核；原700/60组不缩，只重采源/执行集变动的针，未变证据保留。

[详细结论与交接](../../testing/glm-tenfold-triple/codex-opq-r9-review-20261002.md)、[机器总证据](../../testing/glm-tenfold-triple/codex-opq-r9-review-20261002.json)。未写贡献者树、未自动投递、未合main/done/正式结算。代码阶段由用户发送前手动选 GLM-5.3；P未证视觉另阶段手动选GLM-5.3-Flash，不混派。

### 下一位 GLM O 提示词（覆盖旧交接；用户手动转发）

```text
继续TEST-GLM-WAVE-O-1，唯一O Owner，原树/Users/zhangxu/.codex/worktrees/glm-wave-o/type-pal、原分支codex/glm-wave-o-supply-validation-r1，固定ad468369015a4ec9c4652f3e24de603f77c42b07。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/testing/glm-tenfold-triple/codex-opq-r9-review-20261002.md/json与原卡最新段。只闭O-R9-01～03：judge去临时根但保留完整包/子路径与fullName、多重集合及顶层叶计数闭合；新活跃spec登记完整target，补异包/异深路径/同尾标题/假执行数拒收。正常0→1→0、collection/runtime/raw、三针退役已闭，不重做69针；判据/登记变且业务源身份不变可重判保留。新增ambience-skill/rewards-lifecycle六处强转改真实typed直构；四条已证ambience重复登记existing-proof不计新，非整数rounding新轴保留；逐新增28合同核旧fullName/断言行/源条件与生产caller，修串邻例与截数组oracle，整账不得靠token。497执行净新上限不超过492、缺口至少208并待进一步合法性扣列；继续原合法余族，700/60组不缩。派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，仅原O新测/fixture/wave-O；产品/旧测/配置/baseline/真实数据/P/Q/共享文档只读。变动源或执行集仅重采受影响针，每批定向相邻/typecheck阶段推送，末批全包/静态0/0/0/docs/diff/verifier，回执钉真实完整SHA和剩余账。不合main、不done、不官方门、不清树。
```


## Codex 最新独立复核（2026-10-02，r10）

固定12be8ec2ae73bfe8692c9aa678abc990a990e8df，整卡counter/rework。新704/1429/154全绿、487身份对应，三typecheck/静态0/0/0/docs/diff/冻结通过。66三态结构对应/64目标/61未变；旧路径计数judge、六桥、删19旧例/8退役、WORD真oracle与rich-text9轴关闭。新re-adjudicate传suite非leaf导致异身份误收，修调用方即可、不重采66；O08-CC10补完整target。464条件空/249token旧锚仍counter，完整oracle抽取工具已闭。结构净新上限486/缺口≥214，原700/60组继续，不main/done/正式结算。

[详细审核与最新交接](../../testing/glm-tenfold-triple/codex-o-r10-review-20261002.md)、[机器证据](../../testing/glm-tenfold-triple/codex-o-r10-review-20261002.json)。只审固定候选、未写贡献者树、不自动投递。代码阶段由用户手动选GLM-5.3；P未证视觉另阶段手动选GLM-5.3-Flash。

### 下一位 GLM O 提示词（覆盖旧交接；用户手动转发）

```text
继续TEST-GLM-WAVE-O-1，唯一O Owner，原树/Users/zhangxu/.codex/worktrees/glm-wave-o/type-pal、分支codex/glm-wave-o-supply-validation-r1，固定12be8ec2ae73bfe8692c9aa678abc990a990e8df。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/testing/glm-tenfold-triple/codex-o-r10-review-20261002.md/json及原卡最新段。原完整路径/叶计数judge、六桥、删19旧例/8退役、WORD截断与rich-text新轴、完整oracle去截断已关闭，不重做工具或未变61业务针。仅闭O-R10-01：re-adjudicate.mjs把suite当leaf传给sameExecutionIdentity，两次调用都改flattenTests三相后比较，补真实换passed邻居身份拒收，当前66原三态用修后模块再判即可、不重采；O08-CC10补显式完整target，不改业务答案。O-R10-02真实账仍464空条件/249 token旧锚，按域补源码条件/生产caller/合法输入/旧完整fullName和断言matcher/新axis，保留已写18人工行与少数merge行，抽完整expect链工具保留但旧join不能当closed。“多级独立掷随机”恒rng只证累积，诚实收窄或真oracle；同步最终实数与历史。487执行/净新上限486/缺口≥214、66存档64目标为部分，连续推进原合法余族并同步真账，700/60组不缩，不再仅交窄返工完成。派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，仅原O新测/fixture/wave-O；产品/旧测/配置/baseline/真实数据/P/Q/Grok/Cursor/共享文档只读，CLI只mkdtemp。源/执行集真变只重采受影响针，每批定向相邻/typecheck阶段推送，末批三包/静态0/0/0/docs/diff/verifier和真实完整SHA/准确剩余账。不合main、不done、不官方ratchet/protected、不清原树。
```
