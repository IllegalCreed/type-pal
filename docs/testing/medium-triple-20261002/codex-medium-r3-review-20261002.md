# Kimi / Cursor 窄返工三审（2026-10-02）

**Kimi代码/证据accept，转review待Codex统一接入；Cursor业务数据保持接受，仅判据完整性与真实失效登记仍counter/rework。**
没有追加预算、重采未变业务针、main合并/done、official ratchet/protected或覆盖结算。
Grok此前d03cba2c代码/数据accept保持，本轮未重复审核Grok。

[机器复核](codex-medium-r3-review-20261002.json)、[运行原文与真实复合错误](codex-medium-r3-evidence/README.md)。
固定对象：Kimi43a3849bae2cbe02c43a28287fb0945e5d03ac4f，Cursor6808d3ab1d920102603e801ab4dd0c68aa0a82bf；
两作者本地/远端一致、树干净。Cursor3363a8ea6后只有receipt维护，不冒称3363自身是docs-only。
所有写入/运行在Codex自有locked detached副本，作者只运行只读verify，不写作者树或main。
sourceBase554b8a0552db30294a9050b4466659c4a14549f8、BASEf5c7f904a3f623e3ca5b413ab43f78029d99fe11不变。

## 实跑与同对象复用

| 项 | Kimi | Cursor |
|---|---|---|
| 本轮业务/配置变化 | 相对bced8883为零 | 相对36e40942为零 |
| 旧完整门 | 114定向相邻、Reforge2257/content1255、两typecheck，同对象明确复用 | 53定向相邻、Editor3801/typecheck，同对象明确复用 |
| 本轮原针重判/独立复算 | 4针×3相，67/67/67/50身份、全部三态hash/原raw通过 | 6针×3相/旧3、12、12、全部hash/原raw通过 |
| 本轮判据自测 | 原模块2接受/23拒收执行通过；另独立真实复合错误拒收 | 原五反例与正样本通过；两个新反例误收 |
| 本轮清理自测 | N/A（未变收集器未运行） | 原8项通过；额外真实同路径替换哨兵误删 |
| 完整lint | 2784文件0/0/0 | 2853文件0/0/0 |
| docs | 仅共享kimi导航1项 | 仅共享cursor导航1项，自身cleanup导航已闭 |
| BASE...HEAD diff / 冻结白名单 | 零 / 12文件与37路径通过 | 零 / 12文件与137路径通过 |

不把复算写成产品变异重放，不把静态零写成全部业务console零。两者原业务JSON/raw/scope字节未变，
本次没有新包全测或typecheck执行主张。未变旧失败尝试/history仍原样保留。

## Kimi — KIMI-R2-01关闭

reportToRun现保留runtime错误计数、全部suite状态/叶数及顶层suite/test计数和success；
judgedRun由collect/recompute/selftest共用，scope为完整非零file×fullName多重集合，所有相位同标准。
本轮执行`mutants.mjs --recompute`，原四针12份JSON/raw均通过，不重采、不改原字节。
Codex另复算每相非零身份/状态/单目标AssertionError、原/恢复最终源与测试hash及重建mutant，均无差异。
三份旧绿为35/35/18，原K6合法第二stage及32新合同保持。
下面Cursor真实Vitest报告含一个AssertionError和一个afterEach Error，沿Kimi实际转换+judge路径明确拒收。

实数为**2接受/23拒收**，提交内recompute-r2.json也是23；receipt文字残留21以实跑23为准，
candidateHead文字占位以本次已验证40位Git对象为准。此非业务重采/新工具缺口，不再开纯数字或pin返工轮，
Codex在统一接入回执维护准确元数据。原32例/9deferredBudget按中量软预算接收，不增额度、不续派大包。
**无下一位Kimi返工提示词，等待Codex正式门/接入；母产品draft与其它卡不随此推进。**

## Cursor — 已闭项不重开

find已换全叶筛选、多重身份和额外红检查；原五误收反例全部拒收，合法范围外未选中skip仍正确接受。
本轮六针数据独立复算、修后原judge重判6/6通过；old-on-mutated非零3/12/12绿，r0/history未改。
前缀绕过登记与git失败rm兜底已删除；未登记同前缀、祖先含前缀、失败/可捕获中断的自测8项实跑通过。
C4-03已明确cross-check/不计净新，34执行/33净新和自身cleanup-evidence导航闭合，不要求删测试或补回34。

### CURSOR-R3-01 — 完整failureMessages和pending/todo闭合仍漏判

counter-judge.mjs:21只保留`failureMessages[0]`首行，judgeMutant只检查该字符串。
Codex在独占副本用实际Vitest4.1.7运行以下普通用例（非手造JSON）：

```ts
import { afterEach, expect, test } from 'vitest'
afterEach(() => { throw new Error('CODEX owned afterEach hook failure') })
test('CODEX business assertion plus hook error', () => { expect(1).toBe(2) })
```

真实exit1、1个failed叶，但failureMessages有两条：AssertionError及afterEach Error。
stdout/stderr只有JSON reporter公告/正常pnpm非零包装，没有Unhandled标记；当前原judge返回valid=true、reasons=[]。
这是执行/清理错误叠业务红被误收，不是实际六针证据被推翻。

另用CTR-C1-01实际positive派生一个明确标注的坏输入：原pending3/todo0（3个合法未选中skip），
只改为pending0/todo3，保持总数/Passed/Failed/范围/身份不变；当前judgeClean仍valid=true。
topLevelCountReasons只对Passed/Failed与叶闭合，不核Pending/Todo真实分类，故同和不同身份状态能绕过。
修唯一judge的完整failureMessages/全部文本、suite异常、各状态真实计数与success闭合；
加真实afterEach复合拒收和pending↔todo错配拒收，保留干净单AssertionError正样本/合法范围外skip。
修后六针原数据重判即可，不修改原JSON/raw或重采未变业务。

### CURSOR-R3-02 — 同字符串路径不代表同一已登记对象

counter-lifecycle.mjs只用Set保存字符串路径，registerOwned不保存目录/Git身份，cleanupExact只查has+prefix/parent。
现“stale”自测先unregister，再换到非法父目录，证明的仍是未登记/非法路径拒收，**没有测试真实失效登记**。
Codex仅创建独占`cursor-mid-patch-codex-stale-*`哨兵：注册目录inode166409981，
将原目录移到自己父目录保存，再在完全相同合法路径创建inode166409983的替换物。
当前cleanup返回owned=true/legalPath=true/dirRemoved=true/error=null，替换物被删除；原登记对象在Codex父目录仍保留。
没有用户/作者文件被删除，涉及的两对象均为本轮自造fixture。

需登记并清理前复核真实对象身份（如lstat dev/ino+目录/非symlink、必要Git worktree登记），
路径复用/对象替换/Git身份失效必须保留并拒收，不允许通过重新register替换物来让反例变绿。
保留现登记AND合法路径、无Git失败rm兜底、cap/symlink依赖和串行；自建同路径替换哨兵证明替换物仍在，
同时成功/失败/中断只清本次真实对象。不扫描清理他人目录、不全局prune、不清作者树。

## 下一位Cursor提示词（一次合并，原范围不扩）

```text
Cursor 接手 TEST-CURSOR-SCRIPT-PREVIEW-MEDIUM-1，只闭 CURSOR-R3-01/02，原树 /Users/zhangxu/.codex/worktrees/cursor-script-preview-medium/type-pal、分支 codex/cursor-script-preview-medium-r1，固定 6808d3ab1d920102603e801ab4dd0c68aa0a82bf。先只读审核根 /Users/zhangxu/.codex/worktrees/medium-test-dispatch/type-pal 的本卡最新r3段及 docs/testing/medium-triple-20261002/codex-medium-r3-review-20261002.md/json。原find五反例、六针真实数据/旧3-12-12/历史hash、C4-03扣净新及自身导航已闭，不再重做。R3-01：leavesOf取failureMessages[0]漏掉同一failed叶的afterEach Error；Codex实际Vitest产生AssertionError+afterEach Error两条且原judge误收。保留并判完整数组/文本及suite错误，业务红叠hook/runtime/额外failure拒收；topPending/Todo分别与真实状态闭合、核合法计数与success，原positive的pending3→todo3错配也误收。补两真实拒收/忠实单红正样本和合法范围外未选中skip，runner/selftest/恢复用唯一judge；六针仅原字节重判，不重采业务。R3-02：Set只登记路径，已登记目录被移走后同路径新inode替换物会被误删；现stale自测先unregister+换非法父目录不证明失效登记。登记并核真实目录身份和必要Git登记，路径复用/替换/身份失败保留拒收，不靠重新register替换物过门。自建同路径替换哨兵原物与替换物分清，核替换物仍在及成功/失败/中断只清本次对象；保留登记AND合法路径/无rm兜底/cap/symlink/串行，不触他人目录或全局prune。仅本卡证据工具/回执白名单可写，产品/新旧测试/配置/基线/其它Owner/共享文档只读，34执行/33净新/6业务针不加量不改历史。最终lint完整0/0/0、docs仅父共享导航由Codex、diff/verifier，一个真实40位SHA一次收齐；不main/done/官方门/清原树。Kimi/Grok无需动作。
```

本轮Vitest技能用于真实复合错误、完整身份/状态；pnpm技能用于冻结依赖与原包命令。
正式接入仍由Codex对当时main排重与串行check→official ratchet→受保护fast；本次没有85%增益主张。
