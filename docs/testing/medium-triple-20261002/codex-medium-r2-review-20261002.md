# 三中包窄返工二审（2026-10-02）

结论：Grok代码/证据accept，卡转review待统一接入；Kimi与Cursor实际新测试/业务反控数据通过，但辅助判据仍有拒收漏洞，卡保留rework。未main/done，未official ratchet/protected或覆盖结算。
原中量软预算不追加，旧400/700卡不重开；本轮不要求任何未变业务针重新采样。

## 固定对象与时序

| Owner | 最终固定候选 | 事实与边界 |
|---|---|---|
| Grok | `d03cba2c23c858526bc514a5389347177794861c` | 相对8ab47527只本波证据/工具；产品、测试、配置完全同对象 |
| Cursor | `36e409420018f9c9cea4d70d70186e3c466f3a0b` | 初审6f4621ac后追加17条工具/证据路径；packages/scripts/配置未变，完整门明确复用6f新实跑 |
| Kimi | `bced8883a1d60a980e6e442707bed6ced6618fa6` | 开始时5f34旧HEAD且dirty；途中先de14、再bced提交推送并干净。只认固定已提交树，不把未提交进展当交付 |

Kimi de14→bced packages/scripts/配置相同；差异是raw拼接分隔修正及12份真实重采报告/回执，最终bced diff零，de14旧EOF红原记录保留。
Cursor 6f→36e不仅是receipt pin，确有生命周期工具代码变更，不冒称docs-only尾巴；CTR-C3-01新三态对应最终树，另五针及r0历史复算保留。
三作者最终只读verifier通过12份冻结，Grok67/Cursor135/Kimi36路径白名单；三树干净，本地/远端对象匹配。
审查只在自有locked detached副本运行，不写作者树。main当时523cf97d已有其它OPS看板/任务卡WIP，全部保持，不在main落审核。

## 程序门

| 门 | Grok | Cursor | Kimi |
|---|---|---|---|
| 定向+相邻新实跑 | 31/31（新19） | 53/53（新34） | 114/114（新32） |
| 包typecheck | game零 | Editor零 | Reforge/content零 |
| 新完整包test | 未重跑；完整对象同8ab，复用上轮2792/2792 | Editor3801/3801 | Reforge2257/2257；content对象未变复用1255/1255 |
| 根lint完整 | 2791文件0/0/0 | 最终36e：2851文件0/0/0 | 最终bced：2783文件0/0/0 |
| diff BASE...HEAD | 零 | 零 | 最终bced零 |
| docs | 共享grok导航1项 | 共享cursor导航1项+作者cleanup-evidence导航1项 | 共享kimi导航1项 |

第一尝试offline依赖缺tarball，vitest/tsc/Biome无法运行；是Reviewer环境失败，不算作者业务红，也不假称那轮执行过测试。
按原lock在线安装（ignore-scripts，不改锁/配置）后重跑，失败日志原保留。仅复制同锁canvas native与main只读gitignored资产到自有副本。
原React act/AudioContext宿主运行告警保留于raw，不能把静态0/0/0等同全console零；本批仍N/A视觉。

## Grok：GROK-R1-01闭合

C3降existing-proof/cross-check，原历史所有文件字节未变；C1/C2/C4产品/测试/配置及三態证据复算保持，不重采。
C5-count-bound为新的“manifest.count不能补造PNG请求条目”目标，产品/test三態SHA、重建patch、真实JSON/退出/身份/单AssertionError全部对应。
除原选择的弱旧L23外，Codex把必读f4665f7a旧dialog-icons十四例与本波dialog四例同场独立重放：正18绿，变异旧14全绿/仅新count目标1红，恢复18绿，退出0/1/0且源精确恢复。
这轮只重放新的C5，不伪称重放其它三针。四不同新目标成立、至少两旧绿新红成立，19软预算不足与G3完整默认解码局部停线按原卡接受，不加配额。
Grok无作者返工提示词，等待Codex对当时main排重/共享导航和正式串行接入门；卡review不等done。

## Kimi：原两项代码/业务证据闭合，剩KIMI-R2-01采样转换层

K6非法b.entry已撤，保留合法第二stage nested-body隔离；四fixture及组织产物走真实公开checkBaseScriptFlow，独立新32+相邻82绿。
旧author-flow-stages.test:185-210主要为stage[0]entry/confirm及组织后修改源隔离；新第二stage branch/body不是更名旧证明。
四针现在真实三态同非零范围67/67/67/50，完整file×fullName多重集一致，12份原JSON/raw均在固定树。
每针产品/全部参与测试original/restored与最终文件、重建mutant逐项对应；每针唯一精确业务AssertionError、恢复逐条passed；旧绿35/35/18成立。
原函数embedded自测2接受/16拒收独立执行通过。这些实际业务证据accept，不宣布无效或全重采。

但mutants.mjs:260-273把完整report转run时，只带suiteMessages/todo/叶子；丢numRuntimeErrorTestSuites、failed空suite状态及顶层叶计数闭合信息。
独立实际原函数+同转换路径反例：目标AssertionError、另failed零叶suite且message为空、numRuntimeErrorTestSuites=1、raw仅reporter公告，被judgedRun误收。
这是原要求的collection/runtime拒收未完整实现，不因现16自测绿就关闭。只修转换/唯一判据并补此类真实拒收自测；所有67/50原三态逐针用修后判据复算，数据/测试/执行集不变就不重采。
同时核顶层numTotal/Passed/Failed/Pending/Todo与真实叶闭合、signal/spawn失败；不修改raw或把空消息解释为无异常，不新增业务范围。

## Cursor：原输入/删重/六针数据闭合，剩三窄项

C1共享machine已非空label，C1-04/05重复与C1-07不可合法空串撤回，原R1-01/02代码闭合。
六针最终三態产品/test hash与最小patch、原完整JSON/raw、声明scope、退出及唯一目标AssertionError均逐枚对应；原history与40c候选逐文件字节一致。
三份旧绿现在真实执行3/12/12、无grep、无skip且全绿，旧零执行误报已关闭。两调用在同一个变异副本/相位进行，明确不是一个Vitest进程同时跑新旧。
本次独立复算全部六针，不冒称重放全部六变异。其实际业务三態数据可以保留；不再重做这些已闭项。

### CURSOR-R2-01 — find不是完整多重执行集合

counter-judge.mjs:67-78按declaredFullNames逐个allLeaves.find取第一条，仍会压掉同名叶子/额外红，且不核原顶层计数闭合。
五个独立原函数探针全误收：clean同file/fullName两passed却expected1；登记red叠同身份pending；两登记red；目标red叠范围外另一AssertionError；clean顶层总数99但实际1。
范围外**未选中skip**依然允许，不要求把它们当passed或一概报失败；但已执行额外红/运行异常不能隐藏。
只修真实全叶筛选/完整file×fullName多重集与原report计数/状态校验，clean/mutant/restored同判据，补五类拒收和真实完整正样本。当前六针用修后唯一judge重判即可，不重采未变业务。

### CURSOR-R2-02 — 新清理工具允许未登记前缀目录删除

新增counter-lifecycle.mjs:138条件是`!registered && !prefix`才拒收，因此只要前缀匹配就绕过登记，:153/156还会在git remove失败后递归删除。
Codex仅创建自己的独占临时哨兵目录（故意不register到该模块）：report.owned=false、gitRemoveOk=false，但dirRemoved=true，哨兵被删除；作者/用户数据从未触碰。
需本会话准确登记AND合法临时父目录/基名前缀，不能includes祖先前缀或前缀即授权；Git/锁/路径身份失败应保留并报错，不盲目rm兜底。
拒收未登记同前缀目录/祖先含前缀路径/失效登记，测试只用本次自建哨兵；成功/失败/可捕获中断各只回收本次路径，原copy依赖改symlink/cap/串行方向保留。不清他人目录或全局prune。
该新增工具未达到安全准入，本次没有执行作者cleanup-selftest，避免错误删除边界；已提交作者自测不作为Codex复跑。

### CURSOR-R2-03 — 一处本波内部重复与导航

C4-03 :232-252和C4-02 :204-230均为同一startBattle空胜利+两非空结果臂，从同已知点发散；只换boss/数字、去掉后续，C4-02精确向量更强。
C4-03新增虚线notes是公共alternatives的:222文案，已在C4-01及C2-01断言，不构成另一battle专属新合同。
可保留C4-03执行作为cross-check，只把净新从34改至≤33并补分类，不要求删源码或凑回34，纯分类不导致重采。
作者新cleanup-evidence/README未在自己cursor/README链接，docs额外1项属作者白名单可修；父共享导航仍Codex接线，不要求作者越界。

## 下一步

[机器二审证据](codex-medium-r2-review-20261002.json)保存逐针/复用/拒收与清理反例。完整raw/helpers留自有父目录；仅退休本轮三个detached副本，原作者树保留。
Kimi/Cursor的完整一次窄返工提示词已写各卡，最终回复直接给；Grok无需作者动作。不增加测试量或重采原有效针，不单独开纯pin轮。
三卡未全accept前不进入统一main/check/ratchet/protected/done。审查文件使用Vitest真实身份与pnpm原包脚本，零诊断不靠降低规则/扩timeout。
审查记录轻门：根lint2762文件完整0/0/0；docs823 Markdown/4341本地链接/259任务零问题；diff零。仅修改Codex审核/卡/看板文档，无产品/旧测试改动。
