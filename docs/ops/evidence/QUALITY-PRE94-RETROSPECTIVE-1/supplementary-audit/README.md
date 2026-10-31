# 九笔代码补审：Save漏迁合同与交接勘误

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

原审计对象是pre94复审下的九笔代码补审：Save API测试漏迁合同补齐与任务卡交接勘误。基点835bd059bb4ed815e844a153ee02d577d339af0f，分支codex/code-quality-3y，Codex单Agent（作者修复/反控，不冒充第三方），2026-10-18，状态recorded、统一门未收口。父卡为[QUALITY-PRE94-RETROSPECTIVE-1.md](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)；实施写回[CODE-QUALITY-100-save-slot-menu-review.md](../../../tasks/CODE-QUALITY-100-save-slot-menu-review.md)、[CODE-QUALITY-101-save-api-review.md](../../../tasks/CODE-QUALITY-101-save-api-review.md)与[QUALITY-EXTRACT-OUTPUT-BOUNDARY-1.md](../../../tasks/QUALITY-EXTRACT-OUTPUT-BOUNDARY-1.md)。

## 范围与证据

逐笔历史diff核实2daed1bb7删例、cc8971760内联守卫与dd341e5f3抽出重构；实际全文/部分caller边界和当前SHA见[read-boundaries.json](read-boundaries.json)（11文件全文读、4文件限区间、零新关闭、零schema/save/CLI行为改动；本轮唯一改动的产品树文件是api.test.ts）。Save API源码的存/读deepClone是本项目内存合同primary；fixture由正式createInitialGameState构造（slot4/1在1..5、HP150/MaxHP200、Level8、正库存），本文件显式indexedDB=undefined，不冒充IDB验收。

## 发现

合同修补三笔：Save→Load字段往返在原roundtrip补scene12/counter7/HP150/Level8/inventory105×3（现金999与party.x100保留）；读侧深克隆新增1例（改loaded现金/嵌套HP/库存后reloaded仍100/150/105×3）；存侧克隆原例保留。总数只8→9。七个精确变异（五类丢字段、读出别名、只做浅拷贝）对旧完整8例与新单一目标合同对照：旧全绿、新各恰一个指定业务AssertionError、零runtime error suite；命令过滤未选中的8例skipped不算执行/反控信用，逐run原件见[controls-current.json](controls-current.json)。初版测试绿但typecheck发现TS2532数组下标未收窄，改用正常遍历（无新强转/ignore，失败原件保留）；中间又补HP上限和正库存，早期direct/control原件保留但不替代最终spec证据。交接勘误：dd341e5f3真实为可测性重构+三单测、首次拒绝行为在cc8971760；770f9168e修三机制全体，[QUALITY-BATTLE-MAGIC-PARITY-1.md](../../../tasks/QUALITY-BATTLE-MAGIC-PARITY-1.md)已映射真实目标，原红例9红6绿/15-935与五反控沿用不重跑。提取三边界（dataRoot缺失ENOENT/友好消息、非ENOENT重抛、默认参数）按用户允许登记pending。

## 结论

本次0新增closed，菜单主测试1条旧闭合转review，API测试原review不变；机器账本实跑3314 tracked/283 closed/56 review/2975 pending。全83卡仍50partial/33pending/0accept。双路径非法输入/IDB连接生命周期、提取三边界、pre94十注释与两UI差异仍pending/review；新见GameState.runtime武术注释冲突仅登记不越界改产品。

## 整改与复核

以[gates.json](gates.json)为准：定向+相邻6文件41例零stderr/act/environment/runtime-error，七变异旧绿新恰1红，typecheck/docs/lint/ledger/diff各exit0（docs含125工具例、1555 md、9200链接全检）。昂贵全仓check、官方coverage ratchet、protected fast按用户指令集中到大任务收尾，本次不运行、不宣布统一门、不浏览器/E2E、未合main。候选待Owner接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 4406B / SHA-256 19471ab433a01b80518875d2bea16f287bac1f60d4e5823291073d99cef6842f；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# 九笔代码补审：Save漏迁合同与交接勘误

Status: review
Owner: Codex（单Agent；作者修复/反控，不冒充第三方）
Date: 2026-10-18
Base: `835bd059bb4ed815e844a153ee02d577d339af0f`
Branch: `codex/code-quality-3y`

## 证据身份

- id: QUALITY-PRE94-RETROSPECTIVE-1 / supplementary-audit
- schemaVersion: 1
- status: recorded；统一门未收口。
- 父卡：[pre94复审](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)；实施写回原[CODE100](../../../tasks/CODE-QUALITY-100-save-slot-menu-review.md)、[CODE101](../../../tasks/CODE-QUALITY-101-save-api-review.md)和[输出边界卡](../../../tasks/QUALITY-EXTRACT-OUTPUT-BOUNDARY-1.md)。

## 来源与输入

逐笔历史diff核实2daed1bb7删例、cc8971760内联守卫与dd341e5f3抽出重构。实际全文/部分caller边界和当前SHA见[read-boundaries.json](read-boundaries.json)。本轮唯一改动的产品树文件是api.test.ts；Save两实现、CLI/helper、schema/DB_VERSION、迁移、规则和baseline都未改变。

Save API源码的存/读deepClone是本项目内存合同primary；菜单driver先写savedTimes后调用saveSlot，bootstrap读出后替换运行时对象，quick-save依赖异步成败。内存快照合同不能由C序列化机制或IDB事务测试替代。fixture由正式createInitialGameState构造，slot4/1在1..5，HP150/MaxHP200、Level8和正库存；本文件显式indexedDB=undefined，每例前后清Map并恢复global。真实fake-indexeddb主路径另在原事务测试，不将本文件称IDB验收。

## 断言与业务oracle

| 合同 | 原缺口 | 当前最小修正 |
|---|---|---|
| Save→Load字段往返 | 删除了六类断言，API只验party.x/cash | 在原roundtrip中补scene12/counter7/HP150/Level8/inventory105×3，现金999与party.x100保留 |
| 读侧深克隆 | 存后修改输入与读后修改输出是不同方向 | 新增1例改loaded现金/嵌套HP/库存，reloaded仍100/150/105×3 |
| 存侧克隆 | 原API已有 | 原例保留，没有冒充读侧替身 |

总数只8→9。缺槽null仍由API原例承担，菜单不回填纯API用例，菜单异步meta/导航与真实driver链保持原职责。七个精确变异各用相同生产mutant对旧完整8例与新单一目标合同作对照：五类丢字段、读出别名、只做浅拷贝。旧全绿、新各恰一个指定业务AssertionError、零runtime error suite；命令过滤未选中的测试不算执行/反控信用。每个spec/mutant/恢复SHA、file×fullName、exit/signal与完整raw/json均在[当前controls回执](controls-current.json)；finally逐字节恢复生产和spec。

## 结果

以[gates.json](gates.json)为准。初版测试绿但typecheck发现数组下标未收窄，改用正常遍历，没有新强转或ignore；初次日志保留。中间又补HP上限和正库存，早期direct/control原件保留但不替代最终精确spec证据；当前spec与控制脚本另存gzip。

提取三边界按用户允许登记pending：dataRoot缺失的原生ENOENT/友好消息、非ENOENT重抛精确反例、默认参数独立oracle。九个既有临时树子进程源码已确认main→prepareOutputRoot()无参接线，故不是默认caller完全未覆盖；本片不为了登记触碰真实输出或重复跑未改的extract全包。dd341e5f3真实为可测性重构+三单测，首次拒绝行为在cc8971760，原卡已勘误。

770f9168e修三机制全体，不只其中之一；[原卡交接](../../../tasks/QUALITY-BATTLE-MAGIC-PARITY-1.md)已映射simulateMagic/0x42真实目标、performThrowItem→0x66裸值、performMagic无条件预掷/姿态。沿用原红例9红6绿、当前15/935与五有效反控的原件，不为交接重跑，原完整53波次门仍rework。

## 限制与复核

本次0新增closed，菜单主测试1条旧闭合转review，API测试原review不变；机器账本实跑3314 tracked / 283 closed / 56 review / 2975 pending。全83卡仍50partial/33pending/0accept。双路径非法输入/IDB连接生命周期、提取三边界、pre94十注释与两UI差异仍pending/review；新见GameState.runtime武术注释冲突仅登记，不越界改产品。

昂贵全仓check、官方coverage ratchet、protected fast按用户指令集中到大任务收尾；本次不运行，不宣布统一门、浏览器/E2E或全仓完成。静态docs/lint/ledger与实际定向/相邻及game typecheck分别给原件，未合main。
```
<!-- incremental-original-source:end -->
