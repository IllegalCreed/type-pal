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
