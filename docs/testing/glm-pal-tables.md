# GLM原版表格与文本自包含补测工作包（TB-04）

## 当前Codex接收结论

二轮候选a87652fd仍为**counter**，仅返[本轮报告](glm-nine-rework-review.md)的C0精确唯一目标、C1最终树格式/回执及所列本批残项。
原七针与五夹具已关闭；定向19项通过，本批Biome exit1。不重开已关闭项、不重签、不合并、不更新基线。

### 首轮接收结论（历史）

**counter**。定向19项/原3+8跑/tc通过，但仍有公共C0和本批业务返工；Biome完整面13文件/1 errors。详见[统一复核TB-04](glm-nine-intake-review.md#tb-04)。
本轮认可用户先行实施授权；不合并测试、不更官方基线、不转Kimi。下面GLM回执为候选自验原文，不能覆盖当前counter；生产零改只指已列新增测试/fixture之外，不能写整个packages diff为空。


任务：[TEST-PAL-TABLES-COVERAGE-1](../ops/tasks/TEST-PAL-TABLES-COVERAGE-1-self-contained-inputs.md)，r1/rework；本轮实施候选851a6ede未接收，设计不重签。
共同准入、负控、覆盖和隔离规则见[七批统一审核](glm-coverage-remaining-review.md)；本包只增测试；三席设计有效，用户已批准本轮先行实施，当前接收counter。
表内为已按调用域筛选的候选，不是已经完成的新增覆盖；允许去重后减文件/减族，不设必须凑足的用例数。

## 合同族、去重与一手锚点

路径在 pal-extract/src；“新增候选”须先与所列旧测试逐断言去重，允许最终只交已有证据。

| 族 | 当前入口/一手证据 | 旧测试已覆盖 | 允许新增候选 |
|---|---|---|---|
| P01 SSS | cli:200–202；io/sss.ts:185；SDL global.h:95–122 | sss.test：“chunk 0 长度是 EventObject 整数倍”“字节码长度是 8 的倍数” | 真五chunk MKF，两条非对称16字段EO和四字段scene，signed vanish/layer/state与unsigned高位分开；完整raw/chunk2 WORD/chunk3 DWORD/chunk4字节；32B/8B截断各单轴 |
| P02 WORD | cli:203/867；SDL text.c:726–788 | word.test：“全表565条…”、尾标记1、中文content-pin | 完整565×10手写表；persons36..41/items61..295/spells296..397/enemies398..550/scenes551..564/system0..35/battleUi42..60边界不同标记；完整flat；内部空格与尾空格/尾1不同 |
| P03 MSG | cli:202；SDL text.c:795–844 | msg.test：规模、字符串、含逍遥 | 独立已知GBK/ASCII字节+offset [0,1,3,3,4]，精确四条含空条、sentinel不产消息；合法[0]零消息；两输入均非零offset |
| P04 items | cli:220；SDL global.h:135–165 | tables.test：234条/排梦蛇、全六角色位、截断 | 296×14B完整表中七WORD各异；六基础flag/六装备位一热；四脚本字段与原Object身份完整相等，不能全真掩盖串位 |
| P05 stores | cli:338；SDL global.h:252–255 | tables.test：首0截断/满9/非18整除 | 三记录同时含空首槽/截断/满9，完整id和数组，证明记录互不串位；此处不把Store0过滤成商店产品政策 |
| P06 fields | cli:336；SDL global.h:377–381 | tables.test：signed负值/五元素/截断 | 两12B记录、五维不同正负值与高位unsigned wave完整对象 |
| P07 teams | cli:334实际传names与objectIndexToEnemyId；SDL battle.c:1600–1615 | tables.test：“M3.30 翻译模式…”及缺映射warn | 两不同OBJECT映到同enemyId仍保留五槽原Object/名字；0/FFFF不压缩；缺映射只影响对应槽，补映射合法对照与精确warn |
| P08 misc | cli:352/358/364，roleCount固定5；SDL global.h:384–394/442–444 | data-misc.test：100WORD、20×5、40B、零技能保留 | 100经验/20×5×2学习表/20效果WORD完整数组，entry与role非对称，非零offset |
| P09 positions | cli:343；SDL global.h:401–404、battle.c:936–937 | 未找到直接parseEnemyPos测试，不等于无间接覆盖 | 100B不对称5×5输入，五layout长度1..5，全部15坐标精确；99/101拒绝与100正控 |

P03的Uint32Array非零byteOffset须四字节对齐（如4/8），不能用宿主RangeError替业务拒绝。

所有解析输入前后留保护字节、实际输入不变；fixture只写独立LE字节/合法MKF结构，不导入被测字段偏移来算预期。没有JSON守卫的二进制不要虚称“schema通过”：以正式parser成功正控+SDL结构/完整手列预期证明。

## 收窄与待证

- WORD短表/多表/尾余字节，MSG倒序或越界offset、SSS对象表/offset尾余字节政策不立新合同；WORDS的scenes字段不是地图名真值。
- 不补enemyTeams无映射旧模式；当前caller必传映射。不扩N6b成长配置、技能效果、战斗公式。
- 既有表格测试混有真实资源依赖；从旧断言移为内存fixture记“输入解耦”，非新业务。禁止执行extract CLI、更新data或正式assets。

## 代表性负控

至少6个独立保护/转录族的代表针：SSS signed→unsigned、WORD段界偏一、物品脚本偏移/一热位、team原身份误用mapped、学习二维转置、位置转置；MSG端点/多店stride可按去重增补。
对照完整合法；每针只改一处，必须由本批精确标题的业务AssertionError检出；TypeError/超时不是成功。不得用同被测parser计算预期。

## 冻结目标（不允许修改）

```text
packages/pal-extract/src/io/sss.ts
packages/pal-extract/src/io/word.ts
packages/pal-extract/src/io/msg.ts
packages/pal-extract/src/resources/parsers/items.ts
packages/pal-extract/src/resources/parsers/stores.ts
packages/pal-extract/src/resources/parsers/battle-fields.ts
packages/pal-extract/src/resources/parsers/enemy-teams.ts
packages/pal-extract/src/resources/parsers/data-misc.ts
packages/pal-extract/src/resources/enemy-pos.ts
```

## 新增文件白名单（上限，允许减项）

```text
packages/pal-extract/src/io/sss.boundaries.test.ts
packages/pal-extract/src/io/word.boundaries.test.ts
packages/pal-extract/src/io/msg.boundaries.test.ts
packages/pal-extract/src/resources/parsers/__tests__/items.boundaries.test.ts
packages/pal-extract/src/resources/parsers/__tests__/stores.boundaries.test.ts
packages/pal-extract/src/resources/parsers/__tests__/battle-fields.boundaries.test.ts
packages/pal-extract/src/resources/parsers/__tests__/enemy-teams.boundaries.test.ts
packages/pal-extract/src/resources/parsers/__tests__/data-misc.boundaries.test.ts
packages/pal-extract/src/resources/enemy-pos.boundaries.test.ts
packages/pal-extract/src/__tests__/glm-tb04-fixtures.ts
docs/testing/glm-pal-tables-mutants.mjs
docs/testing/glm-pal-tables.config.mts
docs/testing/glm-pal-tables-evidence.json
```

此外仅允许本工作包末尾GLM回执/逐族账、本卡本人签字和本人日志；如需README索引机械一行须先由Codex协调，禁止覆盖主线其他行。未存在文件不要求强建；需要另路径先申请收窄/扩白名单，不能借同名测试覆盖旧文件。

## 实施验证与回执要求

- 按统一审核协议先逐族核既有测试精确标题、当前caller/守卫、实际白名单与target hash；本次未运行任何新测试/负控，不得把拟定针点记已检出。
- 定向→相邻→涉及包全测/typecheck→所有新增文件Biome；负控工具带精确测试标题运行态见证与判据自测。实际记录失败和重跑原因，不能倒填SHA/数字。
- 覆盖config必须使用仓库官方testSelection口径，在专有/tmp目录作同树有/无本批测试对照，局部与全包双口径；旧资产排除两侧一致，不动全局超时/排除/官方baseline。
- GLM不跑全仓check/官方ratchet/strict-fast。Codex独立接收集成后串行执行；GLM贡献终审披露，不自证第三方，不代签、不标done。
- 提交时本节后附GLM实现回执：候选SHA、白名单diff、真实命令/退出码、逐族互斥分类与新增价值、负控细目、覆盖两时点与待证归属。

## GLM回执区（候选历史自验；以当前Codex复核勘误为准）

r1 完成（2026-09-19，GLM，Coding Owner；基点 41cc7cd9，三席 r1 签字齐；用户拍板在 Codex 额度
空窗期先行实施 TB-02～TB-10、恢复后统一接收——本批据此开工，非代签 Codex 准入）。分支
`codex/glm-pal-tables-r1`（worktree `/Users/zhangxu/illegal/type-pal-glm-pal-tables`）；
产品对冻结 e58834f6 零漂移（`git diff e58834f6..HEAD -- packages/` 为空）。
最终树 **9 个新测试文件 + 1 fixture 共 19 项**（P01-P09 逐族落账：3+3+2+2+1+1+2+3+2）；
定向 19/19 绿；官方 fast 口径 before 110 / after 129 双 exit0；tc rc=0；11 新文件 Biome rc=0。

- 全包 37 文件/177 项：4 项真实资产 ENOENT（fresh worktree 缺 `data/raw/*.MKF`，未跟踪）——
  stash 掉本批后基线同样失败（151→170 恰为 +19），与本批无关。
- 负控 `node docs/testing/glm-pal-tables-mutants.mjs` rc=0：判据自测 + 3 对照 + **8 变异针**
  全部钉名新增测试 failed 且目标自身 failureMessages 首行 AssertionError；产品 hash 不变。
  针点：SSS signed→unsigned、WORD 物品段界偏一、items 脚本偏移别名、items 装备位基号、
  teams 原身份覆盖、misc level/magic 错位、enemy-pos 转置、MSG 端点坍缩。
- 覆盖对照（官方 testSelection fast，/tmp，最终提交树）：九模块在 fast 口径下从 L0 起步——
  sss 0→53/53、word 0→32/32（B 7/8）、msg 0→6/6、items 0→19/20、stores 0→15/16、
  battle-fields 0→10/11、enemy-teams 0→20/27、data-misc 0→23/23、enemy-pos 0→16/16；
  全包 L561→755/1316、B253→288/539、F67→89/140。
- 输入自包含：合成 MKF/表格字节 + GBK 用 iconv-lite 编码（产品解码同库逆操作）；预期值手列；
  SSS 输入前后保护字节且断言不变；非零 byteOffset 视图（4 对齐）。不执行 extract CLI、
  不碰 data/ 与正式 assets。
- 机器账 `docs/testing/glm-pal-tables-evidence.json`。
