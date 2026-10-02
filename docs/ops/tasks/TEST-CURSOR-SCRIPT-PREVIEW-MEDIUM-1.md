# TEST-CURSOR-SCRIPT-PREVIEW-MEDIUM-1 — 选中步骤与静态移动预览中包

Status: rework
Phase: phase2
Capability: test-coverage / cursor-medium
Coding Owner: Cursor（仅白名单新增测试、fixture、专属证据）
Generation Owner: N/A
Reviewer: Codex（独立验收/正式结算）
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Branch: `codex/cursor-script-preview-medium-r1`

## 目标与容量

用户2026-10-02授权Grok/Kimi/Cursor各一批**中等体量**。本卡候选8组，预计32–45例，硬上限48例，6个不同合法新oracle反控目标。
数字为预算，不是强迫造用例的门槛；所有候选条件逐条处置，先旧证明排重，再补真实新缺口。
不足须交精确existing-proof/unreachable/blocked及剩余量给Codex裁决，不自动整族免做或换数值凑数。
达到硬上限停止追加；Grok/Kimi按此前剩余约1/3额度控制，不滚动续派大包；不把原700卡缩成此中包。

[共同协议与路由](../../testing/medium-triple-20261002/README.md)、[冻结与独占白名单](../../testing/medium-triple-20261002/targets.json)。
源冻结为当前main `554b8a0552db30294a9050b4466659c4a14549f8`（content21/SAVE10）；开工BASE为随后仅新增此批文档的登记提交，不能在旧冻结源码树直接开本批。
隔离树：`/Users/zhangxu/.codex/worktrees/cursor-script-preview-medium/type-pal`。由Codex预备或贡献者创建；若路径已存在先核对BASE/分支/干净状态，不重建或覆盖。仅此分支此Owner写入。

## 范围与排重

主合同源码（只读）：

- `packages/editor/src/core/script-flow-preview.ts`
- `packages/editor/src/core/script-movement-preview.ts`

只可新增targets.json精确注册的测试与本Owner fixture/证据目录；本任务卡/共享README/targets/verify工具由Codex维护，贡献者只读。
旧Cursor700大卡仍rework、原返工不能免；新卡只两新增源，不写原.cursor-r1测试或工具，不抢旧卡同文件Owner。两张卡不同新测/fixture/证据；若旧树仍在写，独立新树不得共享目录。
现main全部旧测试与targets.dedupCandidates固定候选都要按合同对照，旧fullName不等于全部旧oracle；更名/不同数字/weak matcher不能算新。
业务输入必须经过现行公开typed/作者载入入口；坏JSON只在unknown/IO验证域输入，不伪造typed业务对象。

## 前提真值门

一句话：预览仅作当前选中步骤的静态作者提示，不评价世界条件、碰撞或预测未知起点；保持新稳定ID与既有输出模型，只加测试。

| 维度 | 已核前提 | 直接证据 |
|---|---|---|
| 原版/primary | N/A（二阶段编辑器静态预览没有一阶段产品对应；不准入玩法或UX改形） | 下表当前公开源码与实际caller是测试前提的一手证据 |
| 第一阶段 | N/A：新二阶段模块，不做跨引擎行为对齐 | docs/phase2/READ-FIRST.md 铁律2/5/11 |
| 当前二阶段 | 当前content21/SAVE10与下表公开入口，AST/地址必须稳定ID | packages/content/src/author-flow-stages.ts / packages/reforge/src/script-continuation.ts（Kimi）；script-flow-preview.ts / script-movement-preview.ts（Cursor） |
| 本卡目标 | 只追加冻结现行合同的判别性测试，before→after产品行为不变 | sourceBase Git对象+targets SHA256+diff白名单 |

最强替代解释：某“缺口”已由main或未集成候选的更强断言证明，或只能伪造typed输入才可触发。
可证伪观察：相同最小产品变异旧新同红则优先排重；公开输入校验拒收正控则不得声称合法新例。
runtime/命令真值、原版理解、数据解码或测试模型四类根因分开登记；没有产品修复层裁决授权。
无用户可见偏离，无schema/save/格式/管线写入。发现新产品取舍/未知机制，仅停受影响子组并举证，其他合法组可继续。

## 候选合同与一手锚点

| 组 | 领域 | 冻结源码/caller锚点 | 具体残余候选与旧证明限制 |
|---|---|---|---|
| C1 | 选中游标与标题域 | `script-flow-preview.ts:4-42；ScriptEditor.tsx:3974` | previewCursorKey缺省/null等价和稳定ID区分；label空/缺省/不匹配种类/状态缺label，已证deleted/state-machine错id回退不计新。 |
| C2 | 分支合流知识 | `script-movement-preview.ts:75-102/:206-216` | 相同落点但不同node时后续起点/segments和conditional精确；相对不同arm未知不连线旧证不再重复。 |
| C3 | 挂载与追逐动态边界 | `script-movement-preview.ts:301-350` | ride/mount/chase使party或owner起点未知而另一目标仍独立；后续绝对重置恢复确定性，typed合法场景。 |
| C4 | 条件结果族 | `script-movement-preview.ts:351-370` | confirm/startBattle/teleportOut缺省arms与boundary，不读世界条件也不运行机制；完整tracks/nodes/segments/notes oracle，不只hasLength。 |
| C5 | 共享调用域 | `script-movement-preview.ts:371-411` | 合法self和独立shared sibling调用；missing/递归/32层仅公开作者输入，旧self/recursive一例全部轴先拆旧证明，不测试伪共享或private态。 |
| C6 | 地图与可见目标 | `script-movement-preview.ts:129-147/:413-426` | setSceneMapOverride当前/其它scene分路、缺当前实体/跨scene不绘制、合法实体height；旧loadScene/foreign基础证归旧。 |
| C7 | 显示容量与步号 | `script-movement-preview.ts:177-202` | 10000上限前后精确停止点、节点每目标独立编号、notes去重和segment引用；不拆10000个输入成10000例。 |
| C8 | 纯函数组合 | `collectScriptMovementPreview:107；PreviewCanvas.tsx:306` | 选中游标→当前body/preparation→真实轨迹输出，原AST/scene不变；不运行剧情、不冒作碰撞预测/UI截图。 |

这些是已核代码条件的候选池，不宣称全部都未覆盖；贡献者必须先逐条件阅读全文排重。
旧测试必读：

- `packages/editor/src/core/script-flow-preview.test.ts`
- `packages/editor/src/core/script-movement-preview.test.ts`
- `packages/editor/src/ui/PreviewCanvas.test.tsx`

还须读同域新旧所有测试及固定未集成候选，不能只看以上短清单。当前产品体验review/E2E卡状态不被本测试卡覆盖。

## 验收与交付

1. `contracts.json`每条源条件/实际生产caller或有证N/A/合法输入/旧Git blob+完整fullName+全部matcher行/新observable oracle完整expected/分类；新、旧证明、不可构造、阻塞分列。
2. `directed-vitest.json`真实file×fullName×status，零skip/todo/空执行；每批定向+相邻，结束所属包全测/typecheck。Kimi为Reforge+content两包串行，另两卡各game/Editor。
3. 6枚主反控仅在自有mkdtemp隔离副本最小产品源变异，恢复后真实重跑；正/变/恢复JSON与raw/exit/执行集/目标/产品和测试三態SHA完整，唯一judge由runner/selftest共用。至少2枚新旧同场旧绿仅新红。合法输入分区只可辅助，不能冒作产品变异主针；数量不足如实counter。
4. 禁止双桥/as never/ignore/扩timeout/业务核心mock/私有态/手画图伪业务；允许typed IO port/deferred、标准HTTP、真实Canvas（如需要），清理仅本次临时目录。
5. 根lint完整error/warning/info=0、docs零、`git diff --check BASE...HEAD`零、共享只读verify通过；最终回执/SHA编辑后再次lint/diff。完整门有环境资产红要保留原报告、精准说明；不能作者自报accept替代Codex。
6. 不跑浏览器剧情、PAL001/002/004、现有6012或新产品E2E，不生图、不要求人工产品体验；本批没有视觉验收承诺。
7. 覆盖如实报私有增量/口径，建议仅最后一次同分母隔离测量；非必要不耗费额度重复全仓覆盖，85%只由Codexmain并集实测。不得写官方基线/official ratchet/protected脚本。
8. 交付一次完整40位候选SHA、测试/证据提交与docs-only尾区间、准确执行/净新/反控/未完账，推送本卡独立分支；原主工程和其它Owner零写入。

## 当前模式推进记录

- 2026-10-02 Codex premise verified：直接读取上表源码与相邻旧正文，sourceBase真实对象；新Kimi/Cursor四源均不在旧O/P/Q或Grok/Cursor冻结池，Grok三源维持Grok原Owner。
- Codex design agree：中量封顶、精确写入白名单、各自隔离、新旧oracle排重、当前版本冻结；产品风险仅可记录不能修。
- **Codex build allowed：仅新增测试/fixture/本卡Owner证据**。无固定三签等待；本卡三Owner互不写同文件，依赖可只读。
- 贡献者交付/自验：固定候选 `40c88183a2edde38aacd6244288361dae0dba9cb`，已推送，作者树干净；不是Codex接受。
- Codex独立accept/done：2026-10-02 counter / rework。CURSOR-R1-01～04：空label非法；C1-04/05重复；旧绿执行0、focusJson删collection错误与合同账不完整，一次窄修。
- 用户产品裁决：N/A（不改变产品或格式；需要新取舍时另卡）。

## 风险与停线

源/冻结/Owner冲突仅停止受影响子组；禁止擅rebase产品版本来消除漂移。旧卡的counter不因新卡消失。
同时有旧Owner树运行时，不把新卡写到旧树、不merge旧包；同卡第二写入会话先停派、不能抢锁。
Schema/save/输入合法性必须按当前公开入口证明；故事/现实数据用例本卡不覆盖，缺真实资产不准填假绿。

## 交接日志

- 2026-10-02 Codex：用户重新授权三中包，核定冻结、候选旧证明、独占范围和容量；已开卡待用户转发，不声称已执行。Next: Cursor build → Codex independent review。

## Codex 独立审核 r1（2026-10-02）

固定候选：`40c88183a2edde38aacd6244288361dae0dba9cb`。独立证据与全部一次窄项见[三中包审核](../../testing/medium-triple-20261002/codex-medium-r1-review-20261002.md)。

CURSOR-R1-01～04：空label非法；C1-04/05重复；旧绿执行0、focusJson删collection错误与合同账不完整，一次窄修。

冻结12/12及白名单、定向相邻/typecheck、根lint完整0/0/0、diff通过；作者docs仅剩共享导航归Codex。全包本轮结果与首次失败原报告分列在审核文档，不把作者“完成”当accept。
本轮无产品/旧测/配置/baseline写入，无main/official coverage/done。原中量预算不升格为新大包，旧400/700卡独立保持。

- 交接日志：Codex固定候选独立counter已落卡，下一步为原Owner按下面提示词一次修齐，再固定新SHA二审；不重开未变闭合项。

## 下一位Agent提示词

```text
Cursor 接手 TEST-CURSOR-SCRIPT-PREVIEW-MEDIUM-1 一次窄返工，原树 /Users/zhangxu/.codex/worktrees/cursor-script-preview-medium/type-pal，原分支 codex/cursor-script-preview-medium-r1，候选 40c88183a2edde38aacd6244288361dae0dba9cb。只读审查材料位于 /Users/zhangxu/.codex/worktrees/medium-test-dispatch/type-pal，不merge审查分支到作者树。先读本卡最新 Codex 审核及 docs/testing/medium-triple-20261002/codex-medium-r1-review-20261002.md 的 CURSOR-R1-01～04。共享machine空label被公开validator拒收：改合法完整fixture，C1-07空串轴撤回/不可合法构造登记，非空label已被旧测证不另计新。C1-04/C1-05分别重复旧flow标题测试，不计净新，删除仅本卡重复case或明确cross-check；其它真合同保留不凑回37。三条oldGreenNewRed的旧测都因沿用新case grep而零执行，撤回宣称并重跑真实非零旧集，至少两枚新旧同场旧绿仅新红。focusJson会删空collection错误suite，独立叠错反例被误收；保留原始JSON/raw，不把derived过滤表当实跑report，显式选定执行范围但始终拒收collection/runtime错误。唯一judge由runner和真实拒收selftest共用，正/变/恢复同非零身份集合与状态，signal/spawn错误拒收；六针补最终产品和测试三态hash及受影响重采，历史单红保留。contracts.json从8组概述展开最终逐合同合法输入/source/caller/旧blob+实际fullName+全部matcher/完整expected与分类，执行/净新/旧证明分列。最终定向相邻/Editor test/typecheck、lint完整0/0/0、docs/diff/verify；共享导航Codex处理。仅本卡白名单，产品/旧测/配置/基线/真实数据/原700卡/共享文档只读。不扩timeout、不造bridge，不main/done/官方覆盖/E2E。一次推真实40位SHA及测试/docs-only区间交二审。
```
