# CODE94/95、97–102：Codex 接手后的完整模块窗口

2026-10-15，稳定候选 `bb94ad8e2efc5a56c10f496ccb16303cae9d4518`，主线
`f98d0ddd89ebdee7b04502ee35de26ee82c6d246`。独立三验冻结在 `30d42c983`；
之后的修复属于 Codex 作者实施与自验证，不能冒称另一位 Reviewer 的独立 accept。
单一 Coding Owner=Codex；隔离分支 `codex/quality-menu-accept-94-95`，不写主工作树或 GLM 本地工作树。

## 当前裁定

CODE94 保持 **rework**；CODE95、97–102 与两张已批准修复卡保持 **review**。
本轮 **0 文件关闭**，机器账本为 **3284 inventory /229 closed /45 review /3010 pending**。
包级测试全绿、覆盖率提升和退出码0都不代替逐文件验收，统一零诊断门尚未通过，未合 main。

已完成两个明确获批行为修复：存档写事务 complete 后才成功、abort 向调用者拒绝；
标题读档取消后选回新游戏。分别为 `c81f469e3`、`23f4effbf`，先保存合法失败反例再实现。
标题真实浏览器链及截图已直接核对，见 `codex-opening-browser.json`。
第三项大世界仙术显示 **未获批准、未实施**；当前仍只列可在大世界使用的仙术。

## 实际修改与逐文件证据

完整读取、真实 caller、出口、类型、SDLPal/W3C/oracle 锚及独立反证见
[R3冻结记录](codex-r3-review.md)、[接手分片日志](codex-takeover.md)及两张 GAME 修复卡。
本窗口前的12份源码/测试修改均已分片提交；此处列清范围，不扩大任何文件关闭信用：

| 文件（相对 packages/game/src） | 直接改变与未闭合项 |
|---|---|
| core/menu/menu-driver.test.ts | C4 由完整真实角色启动事件；mode/event cursor 排除原空操作假正例。 |
| core/menu/menu-driver.cov85.test.ts | 移除无必要双重强转；真实标题 Down→Confirm→Menu 断言 cursor0。 |
| tools/quick-save.test.ts | 检查真实 KeyboardEvent 与 Save 参数；移除匿名观察监听器，收支探针0残留。 |
| core/menu/primitives.ts | 撤回虚构 SDL 翻页锚和可选保证；test-only 公共面仍待核。 |
| core/menu/primitives.glm-phase1-leaves.test.ts | 现状测试标题/注释诚实化，未更改业务 oracle。 |
| core/menu/item-select.ts | Important 为当前近似条件，未虚构原版枚举，未改筛选行为。 |
| core/menu/equip-menu.glm-phase1-leaves.test.ts | 注释排重表去掉已退役轴；精确退役 SHA 同步，matcher 未放宽。 |
| core/menu/player-status.test.ts | 角色索引与对象 ID 注释分域，未改状态逻辑。 |
| core/menu/save-slot-menu.ts | 说明真实 Save/handler、双存储路径与 driver 取消 ownership。 |
| core/save/indexed-db.ts | 写入/删除等待 complete，abort 拒绝；DB版本/schema/清档策略未改。 |
| core/save/__tests__/indexed-db.test.ts | 3条真实 Save→IDB 回归：提交时机与正常存读删、覆盖/删除 abort 保旧槽；隔离连接/global/spy/cache。 |
| core/menu/menu-driver.ts | 仅标题槽取消后复位 opening 光标；游戏内取消合同保留。 |

另明确新增 game 的 fake-indexeddb 6.2.5 直接测试依赖及 lock importer 三行，未刷新其它依赖。
IDB open 失败缓存、连接生命周期、Save 输入域、helper test-only 面等未知仍 review；
没有以事务修复或注释修正替代这些审核。

## 集中验证结果

定向相邻11files/125tests通过；两个行为反例均先恰一业务断言失败，过滤造成的 skipped 不算完整通过。
完整输出回执为 `codex-takeover-approved-fixes-green.raw.json`，无 stderr；game typecheck通过。
最终全仓 check 中七包合计1640files/20274tests通过，game318files/3564tests、
pal-extract71files/427tests通过；七包typecheck、docs48、coverage-tools62、quality-tools37、
E2E工具397、script-governance22均通过。这里运行的是工具单测，不宣称剧情 E2E 通过。
根 check 的 lint 为4117files、0errors/0warnings/0infos；证据落盘后的静态复验另记最终回执。

| 完整门 | 进程/数值结果 | 未包 act | act环境未配置 | 导航诊断 | 零诊断裁定 |
|---|---|---:|---:|---:|---|
| pnpm check | exit0；全部包测试/typecheck通过 | 3620 | 577 | 2 | 不通过 |
| pnpm coverage:ratchet | exit0；官方基线只升不降 | 3610 | 577 | 2 | 不通过 |
| protected pnpm coverage:fast | exit0；无覆盖率回退，精确退役保护通过 | 3523 | 577 | 2 | 不通过 |

protected 的 `TYPE_PAL_COVERAGE_BASE_REF` 为完整主线 SHA `f98d0ddd89ebdee7b04502ee35de26ee82c6d246`。
三份 `codex-final-*.json` 中 `actDiagnostics` **仅计未包 act 更新**；577条环境诊断在
`codex-final-window.json` 补充独立计数，不能把3620等误当作全部诊断数。此表也不是全部 console 的语义分类。
完整原始字节保存在 gzip 中，逐份解压核对SHA与字节数；可读txt只规范展示，不替换原件。
移除的仅子进程 agent reporter 检测变量，已验证 std-env.isAgent=false，React检查与原规则没有关闭。

官方 fast 基线为736源文件/19865tests（此前19862）；新增恰为IDB测试3条。
只有game与汇总的8项指标提升，另有2项范围变化；其它包基线完全一致，源范围/include/exclude未改变。
primitives与quick-save测试名称身份更新、新IDB文件及game执行digest变化均已机械复核。
protected核准 equip4→3、opening3→2、save-slot15→14的精确历史退役，没有新增退役或放宽保护。
36项冻结源码/依赖/工具字节在全门期间未变；唯一快照例外是官方工具生成的baseline。

## 下一片与停线边界

[QUALITY-EDITOR-DIAGNOSTICS-1](../../tasks/QUALITY-EDITOR-DIAGNOSTICS-1.md) 仍为draft，无实现。
首片两个harness/kit及1201行C01测试现已全文读取，SHA记录于本窗口JSON；
真实组件资源生命周期、相邻oracle/排重及定向隔离根因尚未核完，文件仍pending，不能只套act或静音关闭。
首片限定 world-sprite-harness.tsx、kit.ts、WorldSpriteLibrary.c01.cursor-r1.test.tsx；
ED-ENTITY-STATE-PLAN-1与其它任务未接管。并行输出中的邻近文件头只是定位线索，尤其导航诊断不能据此定责。

大世界可用数据恰7种恢复/复活仙术，证据为 `codex-outside-magic-truth.json`。
仓库SDLPal源码显示已学但不可用项的结论，与DOS pal.exe实机观感分开；后者仍未验证，不据合成fixture名称改产品。
全部授权修复已在治理分支提交推送；本窗口只提交证据/文档与官方基线，未合main，不宣告专项完成。
无下一位Agent提示词，本卡仍由Codex维护；下一片先核前提及独占Owner后才可build。

## 证据落盘后的静态复验

check:docs通过：48工具测试、1253 Markdown、6894本地链接、381任务、184阶段文档、
570份严格content-review全部通过、0issues；官方任务索引401行与生成器字节一致，不需要重写。
仅更新看板自身语义pin，其余569份语义记录与元数据完整保留。
ledger再次通过3284/229closed/45review/3010pending；没有因全文读取下一候选而改变状态。
最后lint4122files、0errors/0warnings/0infos；postflight JSON另经Biome格式/检查。
回执codex-final-postflight.json及同名post-*/lint-last文本与gzip原件。
这些干净静态门不消除上表测试执行诊断，CODE94仍rework、未合main。
