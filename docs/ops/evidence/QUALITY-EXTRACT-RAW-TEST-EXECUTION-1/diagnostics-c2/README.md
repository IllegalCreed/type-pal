# C2 敌队翻译与诊断合同复核

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

本片是原盘执行完整性任务[QUALITY-EXTRACT-RAW-TEST-EXECUTION-1.md](../../../tasks/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1.md)在C1之后的第二片敌队翻译与诊断合同复核，归全部83卡复审[QUALITY-PRE94-RETROSPECTIVE-1.md](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)。起点3bcdaadc3，唯一codex/code-quality-3y；origin/main=f98d0ddd8。仅修改enemy-teams.boundaries.test.ts与tables.test.ts两份既有测试，生产parser/资源/schema/API/规则/官方baseline保持原字节；全83卡仍9partial/74pending/0accept，本片0文件关闭。时点结论按原文保留，本页不重开任务、不授新信用。

## 范围与证据

阅读边界与SHA见[read-boundaries.json](read-boundaries.json)，登记18条目三种口径：enemy-teams.ts(111行)、boundaries测试(110行)、glm-runtime相邻(44行)、enemies.ts(250行)、tables.ts(43行)、parser-diagnostics helper(67行)全文读取；tables.test.ts按C1已全文读取的before SHA(7988ed74)只核480–642行的精确删除区间，fixture同SHA只读213–215行；caller仅区间（cli.ts320–347、shared/tables.ts325–393、battle-system.ts198–270、sdlpal global.h288–298、global.c288–299、battle.c1592–1635与1710–1725）。全部条目wholeFileAccepted=false：读区间或包绿不是整文件accept。本片直接counter是enemies.ts146/153两处EnemyTeam.slots注释与shared接口375–393实际字段（enemies/enemyObjectIndexes，无slots）矛盾，enemies旧关闭因此撤回review；CLI320–347才是parser真实caller，纠正旧注释所称BattleSpriteLibrary直接调用。

## 发现

[counter-probe.py](counter-probe.py)以20轮隔离运行（command/cwd/exit/signal、92个file×fullName、原生JSON/raw与finally清理均存档）证明判别力：7个旧绿在新测试下各恰一指定AssertionError（队伍id错位、修改输入bytes/map/names、未知域漏诊断、错索引、额外输出；565只是构造不影响402/403的隔离故障条件）；raw名字键故障旧/新均恰一红，既有oracle保留、不冒称新缺口；999错误返回故障旧tables一红→新P07专例一红，同输入oracle转移，两者不计入7枚新红。原件见[before-proof.json](before-proof.json)/[after-proof.json](after-proof.json)；[verify.py](verify.py)与[verification.json](verification.json)由另进程重建检查（同Codex，非第三方）：fullRuns=20、oldGreenNewSingleAssertionError=7、exact999OracleTransferred=true、wholeFilesClosed=0。

原生list[inventory.json](inventory.json)披露身份迁移：tables.test.ts 90→89（移除M3.30只验首槽的旧弱例）、P07两例→三例（新增未知999空映射第三例），总92不变但removed/added各2条显式记录，含缺映射例标题从补全映射+名字后零新增warn更正为补全映射后同输入恢复、不依赖名字表；三个快照（3bcdaadc3/f98d0ddd8/d4cf7f57）tables同SHA且fastEntries空，证明官方fast从未含该文件，无需新增退役豁免；noNewRetirementApproval=true，26项/净60批准数据与matcher、baseline/config一字节未改。[before-coverage.json](before-coverage.json)/[after-coverage.json](after-coverage.json)对生产enemy-teams.ts的局部V8实测statements 32/32、functions 2/2、branches 22/22保持，officialGate=false，不冒充官方ratchet/protected。

## 结论

[regressions.json](regressions.json)六项全过（原报告口径：完整extract 72文件431例、shared 16文件126例、真实战斗caller 1文件186例、双方typecheck、coverage-tools），0 stderr块，两处原输出已成为显式被测IO。静态门轨迹见[gates.md](gates.md)：首轮lint exit1、第二轮docs exit1均保留失败原件，最终四项全过、lint零诊断，未降规则。enemies旧关闭精确撤回，0新关闭；机器账本3289 inventory/208 closed/226 review/2855 pending。全仓check、official ratchet、protected fast本片未执行；editor诊断仍未清，不合main。

## 整改与复核

本页为治理候选正文重写：原文本逐字节保全于下方保全块，本轮逐篇语义整改将本片真实目标、发现、结论与限制载入可见正文；不重开已归档结论，不重跑任何命令，时点边界以原文为准。按原文，下一批回CODE3b的SSS/M.MSG四文件，再续其它编号卡与94–102/editor；无下一位Agent提示词，单Agent继续。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 5540B / SHA-256 61b738a444a9add29fa46525cc5b255865a1e1a90f1d1f48aa6683f3ca458fb5；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# C2 敌队翻译与诊断合同复核

归[原盘执行完整性任务](../../../tasks/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1.md)与[全部83卡复审](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)。起点3bcdaadc3，唯一codex/code-quality-3y；origin/main=f98d0ddd8。只改两份测试，生产parser/资源/schema/API/规则/官方baseline均保持。全83卡仍9partial/74pending/0accept，本片0文件关闭。

## 逐文件结论

[阅读边界/SHA](read-boundaries.json)区分本片全文、C1已全文读取且字节保持、caller区间；不把grep命中或包绿算完整审核。

| 文件 | 证据、修复及未核范围 |
|---|---|
| enemy-teams.boundaries.test.ts | 原正例漏403映射，产生与本轴无关的warn；现补完整映射，手列两份完整DTO，包含id、五槽、raw身份和按raw反查名字。403无名字仍正常翻译，两个不同OBJECT映同enemyId不合并。对实际传入的bytes副本、两map的原始primitive条目比较，防止调用者输入被修改；每例自行创建输入。真实Node Console边界验证stdout空、全部stderr记录，没有spy/no-op。合法OBJECT缺map和补map恢复合同保留无names形态。未知999单独第三例，不能冒充合法敌人输入。 |
| tables.test.ts | C1已全文读864行，C2开始核同SHA；本片只删已证13行弱子集，其余字节精确保持。旧999例同一10B/空map/无names，原只验首槽；现在原字节e703ffffffffffffffff转入P07专例，完整DTO/原身份和唯一警告都有固定oracle。大文件其它表、弱断言/重复与生产实现仍待逐域复审；本片不accept整文件。 |
| enemy-teams.ts / tables.ts | 全文只读。parser固定10B、5u16；翻译仅按raw键查map，0/FFFF保留；缺映射warn+FFFF、names按raw查；id为队伍表下标。公共barrel保持导出。当前实现未发现本片直接缺陷，修的是测试证据。兼容/无map形态未据此重新批准，整文件不关闭。 |
| enemies.ts | 全文只读，两个map都是OBJECT绝对索引为key；CLI同时传两map。发现146/153行两处EnemyTeam.slots，当前shared接口375–393实际为enemies/原身份enemyObjectIndexes，slots不存在。误导注释是直接counter，旧关闭撤回review，留下一专片修复；未借此改生产实现或公共类型。 |
| parser-diagnostics.ts / fixture / GLM相邻 | 复用C1已核67行同步IO helper，函数体不改；fixture沿C1全文同SHA，只读213–215确认两队字节；GLM纯模式三例全文读但未改。IO helper仅用于已核同步纯parser，不推广到React或异步告警。 |

primary：SDL global.h292–295的ENEMYTEAM、global.c294–295加载chunk2、battle.c1599–1615/1716保留OBJECT身份；game startBattle198–270用原槽号取脚本，0占空位、FFFF跳过，两者不混同。CLI320–347是实际parser caller，同时传names/map，不是旧注释所称BattleSpriteLibrary直接调用。合成名字只作独立标记，不称原版名字；999属于已标清的未知输入域。产品行为无变化，不触碰高风险实现。

## 判别力、排重和覆盖率

[counter-probe.py](counter-probe.py)保存20轮完整两文件执行、command/cwd/exit/signal、92个file×fullName、原生JSON/raw、源/模块/副本hash与finally清理；原件见[before](before-proof.json)/[after](after-proof.json)。无name filter、skip/todo、timeout调整或生产改写。

- 7个旧绿→新恰一指定AssertionError：队伍id错位；修改输入bytes/map/names；只对未知域漏诊断、错索引、额外输出。后三针中的565只是构造不影响402/403的隔离故障条件，不引入产品通用上界规则。
- raw名字键故障旧/新均恰一红，证明既有oracle保留，不能冒称新缺口；999错误返回故障旧tables一红→新P07专例一红，证明同输入oracle转移。两者不计7枚旧绿新红。
- 恢复92通过、0pending、0stderr块。所有原source/barrel与正式测试在各轮保持原字节，临时文件精确清除。[verify.py](verify.py)/[verification.json](verification.json)由另进程重建检查，仍为同Codex，不冒充第三方。

[原生list](inventory.json)：tables90→89、P07两例→三例，总92不变；两条移除/两条加入包括原负例标题纠正，不能只报总数不变。三个冻结快照的tables旧字节相同，fast基线从未包含该文件；无需新增退役豁免。现有26项/净60批准数据与matcher、baseline/config一字节未改。

[修改前](before-coverage.json)/[修改后](after-coverage.json)直接运行真实enemy-teams.ts，V8 statements32/32、functions2/2、branches22/22均保持。未把调用搬到子进程，也不把局部V8实测冒充官方ratchet/protected。

## 回归与剩余门

[回归原件](regressions.json)：完整extract72文件431例、shared16/126、真实战斗caller1/186、双方typecheck与coverage-tools71通过，0stderr块。两处原输出已成为显式被测IO，生产警告未删除；完整包无未声明诊断泄漏。

全仓check、official ratchet、protected fast在稳定模块窗口集中，本片未新跑；editor诊断仍未清，不合main。静态docs/lint-zero/ledger/diff见[gates](gates.md)，未执行的门不得写通过。机器账本3289 inventory /208closed /226review /2855pending；两测试pending→review，enemies旧关闭精确撤回，0新关闭。下一批回CODE3b的SSS/M.MSG四文件，再续其它编号卡；94–102/editor原目标保留。无下一位Agent提示词，单Agent继续。
```
<!-- incremental-original-source:end -->
