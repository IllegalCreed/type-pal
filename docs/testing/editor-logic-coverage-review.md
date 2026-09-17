# TEST-EDITOR-LOGIC-COVERAGE-1 · Codex接收复核

日期：2026-09-18。候选`d531aa2473d1081fb201248fae3694731fe2cae2`，分支`codex/glm-editor-logic-coverage-r1`；
build基点`a5df9fbc`，产品起点`c1cec3ad`。接收主线`4ad6522a`已有Q1检查点17项，不计入本包。
任务：[编辑器命令与引用补测](../ops/tasks/TEST-EDITOR-LOGIC-COVERAGE-1-editor-command-boundaries.md)。

## 结论：counter，定点返工，不合入

白名单/运行结果可确认，但合法输入、核心断言和口径还不满足r1验收。设计三签保持有效，不重签。
不合并测试或候选诊断配置，不更新官方基线、不跑接收后的check/ratchet/strict-fast、不转Kimi终审、不标done。
本报告是**测试包的缺陷**，不是宣布产品出现了下述故意注入的错误；本轮没有修改产品。

## 已通过的复核

- 远端ls-remote与本地remote ref均为d531aa24；候选工作树干净。相对a5df9fbc恰12文件：8个新增测试、1个fixture、
  2个新增诊断、1份回执。产品/旧测试/原探针/正式统计/基线/data/projects零diff；不混入Q1提交。
- 候选八文件独立运行44/44（6/7/9/2/6/7/4/3），editor typecheck exit0；11个TS/诊断文件Biome exit0，
  有2条新增unused EditSession import warning（catalog/map），不是error，但返工顺手清理。
- 自选相邻八文件67/67：world-variable-commands、actor-commands、actor-dialogue-commands、stamp-commands、
  project-reference、project-reference-adapters、asset-reference-commands、battle-data-delete-commands。
  不将本席67冒称回执76；回执没有给出其八文件完整命令，尚不能核定其76来源，也不据此指控76必然错误。
- 原负控脚本重建：1对照44绿+10次exit1；四个产品源hash保持不变。
  其中B组“closure removed”实际含义需要R3勘误，不能仅凭退出码把十针全部解释成守卫缺席证明。
- D-02的disabled/inherit/transition已知漏边没有被固化为默认绿色合同，也没有引入默认红或修改该产品缺陷。
- 入仓局部覆盖命令可复跑：before 211文件2256项、after 219文件2300项，均exit0；五目标源码的分母前后相同。
  行2595/2739→2617/2739、语句2897/3256→2945/3256、函数707/729→714/729、分支1759/2316→1805/2316。
  **局部+22行/+46分支数属实，但其测试选择不是官方fast，且命中无效输入不等于合法业务合同成立。**

## R1 · 正控输入不是现行合法值；伪造proof不能代替真实旧证明

以下`file:line`均以候选树为准，测试路径省略`packages/editor/src/core/`。

- `__tests__/glm-editor-logic-fixtures.ts:100–109`的actorCue缺`portrait.side`，rows还是字符串数组。
  实际抽取此函数、调用当前`checkAuthorDialogueCue`，先报`fixture.cue.identity.portrait.side: 期望 left|right`；
  只补side后继续报`fixture.cue-with-side.rows[0]: 期望对象`。同时改成side与`[{text:'dialog.hero'}]`才通过。
  一手守卫`packages/content/src/author-dialogue.ts:82–88,126–144`；邻近旧测试也有旧fixture不能成为本批继续沿用的理由。
- `commands-map.boundaries.test.ts:23–58`的tinyMap顶层tiles为0、sources为null；0是有效瓦片，不是空格。
  当前`validateProjectMap(tinyMap())`拒绝`projectMap.layers[1].sources[0][0]: tiles/sources 必须同时为空或同时非空`。
  只把该层tiles改为null，同一validator正控通过；新增L3的tile=2/source=null也需纠正。
  一手守卫`packages/content/src/project-map.ts:156–190`。
- `actor-dialogue-commands.boundaries.test.ts:72–97`物品私有脚本缺固定`id:'use'`，sharedScript.self是旧对象形态。
  实际`validateAuthorItemCore`报`script.id: item-private 固定为 use`；`checkBaseScriptLibrary`报`self: 期望 none|optional|required`。
  “collector能递归找到任意对象”不能证明当前合法作者域已覆盖。
- `stamp-commands.boundaries.test.ts:133–141`用`Object.create(realProof)`覆盖referenceCount，并非真实状态变化形成的旧proof。
  保留无proof拒绝正交用例；“真实过期/引用变化”须经EditSession/扫描API产生旧证明、真实修改和新证明正控。
  若后层count臂被coverage/revision前置守卫拦截，按防御/重叠保护分类，不能用伪造字段当生产时序到达。

返工：只修本包fixture/测试；对受测的cue/map/shared/item值加现行守卫正控，优先复用当前构造器并移除掩盖非法字段的强转。
局部fixture不必强行升级为完整可保存工程，但受测值自身必须有效；不改旧测试、产品或恢复旧兼容模型。

## R2 · 深快照与关键业务输出没有被断言钉住

- `actor-dialogue-commands.boundaries.test.ts:137–166`只断言cue表达式与部分invert结果，没断言apply后的actor表情key/asset映射，
  也没比较原输入与before。`:220`的`s1SnapshotSafe`只返回原对象，没有任何保护。
- 独立在生产`expressions[to] = asset`这一点换成`expressions[to] = 'wrong-portrait-asset'`：B组仍6/6绿。
  **重命名后指向错误图片这种明确业务错误未被发现**。
- 独立在Rename返回前污染`state.locale.__reviewInputPollution='leaked'`：B组6/6绿；
  在PaintTiles.apply进入真实paint前同样污染输入：A地图组9/9绿。
  三个见证均唯一替换，既有测试断言原样，另在同一测试模块afterAll确认变异执行；输入污染还检查实际原对象确有leaked值。
  产品源hash前后不变，不是只证明模块加载。
- helpers虽有structuredClone/expectUnchangedApartFrom，但**创建before或工具存在不等于实际核验**。
  其余同型用例只比较ID数组/单字段的部分也须逐族检查，不把invert部分相等冒称完整往返/输入不变。

返工：钉actor目标表、旧key移除、新key所指原asset、非目标数据完整保留；apply/invert后分别核输入不变与独立预期输出。
将上述三针变成有效业务红，并保留相同输入正常实现绿。不要仅靠冻结错误类型或扩大toMatchObject掩盖字段。

## R3 · 负控语义与标题/回执不一致

- `glm-editor-logic-coverage-mutants.mjs:69–75`的`rename-rewrite-closure-removed`没有删除guard，
  而把`rewritten !== expected`改成`rewritten !== expected + 99`，在完全正确的重命名上强行报错。
  本席复跑其红因是`期望 3，实际 3`仍抛错；真正把该guard改成false时，带执行见证的B组6/6仍绿。
- 强行拒绝合法操作可证明“合法操作应成功”，**不能叫“移除闭合guard后抓到漏改写”**。
  不要求为了一个可能由同源walker保证的防御臂伪造不可达不一致；应改名/重新分类，并补真正错误的业务改写结果反控（R2）。
- 脚本`:174–178`以`/AssertionError|Error: /`认定业务红，没有排除TypeError、超时或Unhandled Errors。
  本次已人工核红因，不等于未来这条自动判据可靠。收紧验证到明确业务断言与真实执行，环境/替身错误不能验收。

返工：逐针列目标合同、唯一替换、实际失败测试/断言和红因，至少两有效业务反控/组；保留已有效的其余针，不必重做整个包。

## R4 · 覆盖口径与“逐族完成”账需补齐

- `glm-editor-logic-coverage.config.mts:12–20,39–40`只正则提取editor的四个coverageTestExcludes，再硬写ts/tsx include。
  正式`testSelection(editor,'fast')`还排除PAL与runner目录，默认测试扩展名也不同。
- 独立`vitest list`：候选诊断2300项，正式fast2299项；诊断**多**project-reference.pal.test.ts和author-disk-baseline.pal.test.ts各1项，
  **漏**enemy-defeated-events-boundary.test.mjs 1项。修为直接消费官方结构化selection，before/after只差本包，不用正则猜配置。
  重新给前后inventory/五文件源码hash/指标；旧+22/+46仅保留为该错误口径的历史实测。
- 回执`:12`A组22误计，实际6+7+9+2=24，整批44没错。补相邻76的具体8文件命令/输出；两条新增unused import清理。
- 声明与断言不符：`commands-assets.boundaries.test.ts:37`标题列同值、新键新增/invert，实际只测既有键改回；
  `commands-world...:45`声称“不留命令痕迹”却直接apply/invert，未dispatch/断言history；
  B1标题“带首尾空格”仅空白，B3标题“无立绘组”实际只测缺actor；回执D1“非派生key拒绝”没有对应用例。
  允许补真实用例或收窄声明；不要标题换一个大范围又继续写“全部完成”。
- 逐族表不能仅给文件名和“主体已覆盖”：A2物品、A3敌队/战场/技能、A4落点、A5碰撞、D4 script版本/冷地图/扫描失败等须落
  新增 / 已有精确测试名 / 缺陷 / 待证 / 确认不适用之一。**不要求每族都新增，也不要求固定条数**，要求签过的范围不无声消失。
- AddEnemy重复ID断言不能仅据当前append实现称为受支持业务合同：`commands.ts:2451–2462`确会追加，但
  现行`EnemyTab.tsx:743–752`在调用前保证新ID唯一，invert按ID过滤全部。须核caller/类型前提，改合法新增/undo正控；
  不支持的重复输入降只读观察/待证，不擅自改产品，也不在默认回归保证“将来永远接受重复ID”。

## 可重建见证与记录

入仓工具：[独立见证](editor-logic-coverage-review-witnesses.mjs)。必须给候选独立工作树，不把main上未集成测试当目标：

```sh
node docs/testing/editor-logic-coverage-review-witnesses.mjs /Users/zhangxu/illegal/type-pal-glm-ed1
```

d531aa24结果：正常B对照6绿；输入污染B6绿/A9绿、错误目标asset B6绿、真正closure移除B6绿，标记MISSED而不是accept。
三个错误结果见证应在补强后变为业务红；closure防御臂按R3真实可达性处理，不强造输入。工具不改产品，只生成自己的tmp配置/日志。
最终目录`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/editor-review-witnesses-4Uhvij/`。

本席本地证据：

- `/tmp/codex-editor-r1-directed.log`、`/tmp/codex-editor-r1-adjacent.log`、`/tmp/codex-editor-r1-typecheck.log`。
- 原10反控复跑：`/tmp/codex-editor-r1-mutants.log`，详细日志`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/ed1-mutants-UEWsBy/`。
- fixture实际提取/校验、before/after覆盖、inventory差集：`/tmp/codex-editor-r1-review.kCl2cr/`。
- 初版独立临时见证有错误替换点（this.patches而非this.edits）、外部vitest setup模块身份错误、以及缺前导分号的执行标记问题；
  已丢弃其结论并修正。仅以上最终带实际执行/污染断言、原文件hash不变的入仓工具结果用于counter，不把初版环境红/无执行绿当产品证据。

## 返工边界

GLM只修原白名单新测试/fixture/诊断/本人回执，保留本counter原文；不改产品/旧断言/原探针/官方配置基线。
三签不重签，无需用户手动复验。下一次由Codex先复核R1～R4；通过才集成最新主线、串行质量门、交Kimi终审。
Q1检查点17项与本包44项分别对账。GLM是测试贡献者，不代签、不标done。
