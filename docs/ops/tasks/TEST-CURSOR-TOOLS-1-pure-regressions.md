# TEST-CURSOR-TOOLS-1 — 八组工具纯函数候选回归

Status: draft
Owner: Codex（正式接入与工具实现）
Contribution Owner: Cursor（隔离候选测试）
Reviewer: Codex
Phase: ops
Capability: 文档工具与F1审计工具的回归准备；不改变能力格
Visual Verification Timing: N/A
Branch: codex/cursor-tools-tests-r1

Revision: r1
Evidence freeze: 590037a6

## 目标与范围

用户2026-09-25要求继续给Cursor任务。本包换为八组小型可执行回归，不再扩扫已接收文档。
全部通过真实公开纯函数入口，数据用内存字符串/对象；不启动应用，不需要PAL原版素材，不涉及玩法/存档。
只准在[独立实验目录](../../testing/cursor-tool-regressions/README.md)补候选用例；draft准备可执行，
**不是产品/正式测试build准入**。Codex独立接收后再决定哪些转正；不能宣称已经提升官方七包覆盖率。

### 开工与并行隔离

- 从包含本卡的Codex交付提交新建worktree `/Users/zhangxu/illegal/type-pal-cursor-tools-tests`，
  分支`codex/cursor-tools-tests-r1`。此提交在独立复核分支，不为取包合main；已有路径先核归属，不覆盖。
- 生产/工具冻结590037a6。GLM仍负责地图/App/脚本草稿/预览/校验器/一阶段跨模块/迁移及视觉实验，
  本包不触及那些函数；Codex A3主线、两份Cursor文档回执、五份指南修订卡均不重领。
- 先读AGENTS/CLAUDE/READ-FIRST、文档维护规则、本文目标函数及指定去重测试。
  任务不改变用户行为，四向机制真值N/A；工具合同来自现行注释/维护规则/已签规范/旧业务断言，
  不能单以当前函数返回值为预期真值。未知预期记待确认，不把可能的bug固化成绿测试。

## 八组（先去重，再补真实差异轴）

| 组 | 真实入口与去重文件 | 候选验证轴 | 允许候选文件 |
|---|---|---|---|
| T01 链接定位 | `scripts/docs/markdown.mjs`的withoutFences/markdownLinks；先读`check.test.mjs`前四例 | 中文/多行/围栏/注释与真实链接共存时，结果line及positions精确对应原输入；引用式链接的坐标指向定义目标，不误当使用处；同输入关闭positions后目标/行号一致 | `tests/t01-markdown.test.mjs` |
| T02 本地目标 | `scripts/docs/check.mjs`的localTarget/checkoutTargets；去重`check.test.mjs`本地链接与checkoutTargets测试 | repo根路径、合法编码路径、query/fragment、目录祖先集合；外链忽略与错误百分号分别按既有合同断言；调用前后输入数组保真。不要发明“此函数必须阻止越界”的安全合同 | `tests/t02-targets.test.mjs` |
| T03 任务元信息/索引 | 同文件taskInfo/isTaskDocument/renderTaskIndex；去重顶部状态/归档/索引案例 | 文件白名单边界、缺标题fallback、正文历史状态不能覆盖顶部；非空混合状态索引排序/标题竖线转义/实际输入数组不变；不改任务状态政策，不新增历史豁免名单 | `tests/t03-task-index.test.mjs` |
| T04 现行段版本 | 同文件checkCurrentSection；去重版本分界测试 | 合法当前段与历史段组合、起止标记缺失、重复错误去重、拒绝范围/局部格式轴不冒充content/SAVE；用现行caller同类非global规则，不臆造任意Markdown/正则全兼容 | `tests/t04-current-section.test.mjs` |
| T05 纯文本搬移 | `scripts/docs/relocate.mjs`的validateMoves/rewriteLinks/rewriteRepositoryPaths；去重`relocate.test.mjs`全部既有案例 | 明确同名后缀边界、最长路径匹配、Git SHA历史引用保留、链接目标改写而label/title/正文不变、引用定义多次使用只改一次；输入Map/entries保真。只调纯函数，**不调用applyRelocation** | `tests/t05-path-rewrite.test.mjs` |
| T06 选择器预筛 | `packages/editor/scripts/selector-prefilter.mjs`的requiredTargetClasses；去重`ui/design-system/selector-prefilter.test.ts`三例及其完整矩阵 | 小型ASCII目标复合selector的必要类，不把祖先/兄弟类当目标；不支持语法返回保守空集。现有大矩阵已证的case不复制；需要DOM对照时仅自有内存JSDOM，必须close | `tests/t06-selector.test.mjs` |
| T07 例外清单判定 | `packages/editor/scripts/design-system-audit.mjs`的validateAllowlist/evaluateAllowlist；去重`adoption.test.ts:2058-2087` | 非空合法条目正控，file/line/rule单轴错配，stale与unapproved并存的返回优先级，invalid形状；完整active/unapproved/stale/problems与输入深快照，不只看exit code。沿用既有owner规则，不把Cursor加进产品枚举 | `tests/t07-allowlist.test.mjs` |
| T08 导航字形工具 | 同文件isEmbeddedNavigationGlyphAction/findEmbeddedNavigationGlyphActions；去重`adoption.test.ts:2090-2110` | 小段自包含TSX、多个命中节点/多行定位/不匹配标签/合法方向控制；返回精确line/tag数组。此函数是源码扫描工具，不证明React运行期可达或视觉效果，不据此扩UI规则 | `tests/t08-navigation-glyph.test.mjs` |

这些是候选轴，不保证都有缺口。读到相同输入/同层级/同断言已有证据，记录existing-proof并继续下组，
不换标题复制现有例；不设“至少多少测试/多少bug”指标。

## 让执行保持简单

1. 统一用Node内建`node:test`与`node:assert/strict`，`.test.mjs`可直接import真实MJS，无Vitest/Vite新config。
   先用一个最小正控确认模块导入不会执行CLI；`design-system-audit.mjs`只能调用表中四个公开函数，
   不调用runDesignSystemGate/derive*/print*等整仓扫描入口，不提取私有函数或复制实现来测。
2. 正控与反例均在输入层构造：例如一份合法allowlist和只改line的违规匹配。断言可观察结果完整，
   不以“没有throw”、源码包含字符串、只数mock调用冒充业务回归；预期由独立人工可核的输入推得。
3. 不做性能基准、长循环模糊测试、复杂负控框架或真实文件搬移。本轮突变鉴别力由Codex接收时抽查，
   Cursor不删除产品守卫、不改模块加载器来凑红。无异步需求不要造定时器/固定sleep。
4. 若真实函数违反已明确合同，保留失败例到`diagnostics/`显式运行并写清成功对照；不修改预期迁就现状，
   不skip/test.fails/only，不把未知合同的观察强写成产品bug。单组疑点不阻止其它七组。
5. 依赖优先用本worktree现有安装；必要时按pnpm规范`pnpm install --frozen-lockfile`，锁文件零改。
   不新增依赖/版本；源模块必须解析到本worktree，不拿主树整个node_modules替换来偷用主树源码。
   依赖不可用就记blocked-environment，T01～T05不需要第三方包仍可继续。

## 唯一写入白名单

仅`docs/testing/cursor-tool-regressions/**`，最多下列形态：

```text
README.md                    # 本人交付总账/短回执；原授权保留
tests/t01-*.test.mjs          # 对应上表T01～T08；没有新增就不造空文件
fixtures/inputs.mjs           # 可选，纯小数据；不复制生产算法
diagnostics/tXX-*.test.mjs    # 可选，显式失败或待证，不加入默认绿集合
```

不新增工具框架/机账JSON/runner config，不写packages/scripts/正式测试/配置/基线/源文档/GLM目录。
测试中用于验证parser的虚拟Markdown放字符串内，不生成会污染全仓索引的临时Markdown文件。
本目录不在官方scripts/docs测试glob和七包Vitest收集范围；lint/docs仍正常检查，不能借实验目录躲语法质量。

## 验证与交付

- 从工作树根显式跑`env -u NODE_COMPILE_CACHE node --test --test-concurrency=1 docs/testing/cursor-tool-regressions/tests/*.test.mjs`。
  使用Node现有版本，记录版本与完整命令/cwd/exit/测试标题。无文件时不能跑空glob并报通过，写清全组复用既有证据。
- T01～T05补例后允许一次相邻`node --test --test-concurrency=1 scripts/docs/*.test.mjs`。
  T06～T08的Vitest既有测试只需读断言去重，不必为此跑整个adoption/boundary重型套件。
- 整包末检查本人目录Biome、`node scripts/docs/check.mjs`、`git diff --check`及白名单；
  不跑全仓check、官方coverage/ratchet/strict，不声称新增正式覆盖行数。工具脚本不因测试变多自动算进七包分母。
- 每四组一提交，八组连续完成后整体push。唯一README逐组记candidate-green / existing-proof /
  reproduced-defect / pending-contract / blocked-environment，给确切测试标题/命令/结果与去重理由。
  结果从Node报告数，失败/未执行分列，记录全量实际输入快照断言位置；不手写重复总表。
- Codex接收后决定正式转正入口/抽查反控/统一质量门；本轮只交隔离候选。
  不合main、不代签、不标done；前两批文档accept及五份指南修订门保持原状。

## 推进签字与交接

- Codex：2026-09-25核对八组公开入口与旧测试存在，批准上述draft隔离准备；不预断候选正确或缺口数量。
- Kimi/GLM：本次不请求，不代签；Cursor不替代其它席位。
- build准入：not opened（无产品/正式测试接入授权）；done准入：not opened。
- 材料接收：返工候选85f2a824已由Codex签accept，见文末；仍不合main、不标done。
- 原始分配时尚未执行候选测试；后续执行与接收见本人席位。另卡修订准入不因本卡打开。

## 下一位Agent提示词

下方为原始分配，文末初版返工提示也已完成，仅保留历史。

```text
接手TEST-CURSOR-TOOLS-1，从Codex本次提交新建独立worktree
/Users/zhangxu/illegal/type-pal-cursor-tools-tests，分支codex/cursor-tools-tests-r1；不合main，不在旧任务目录切分支。
先读AGENTS/CLAUDE/READ-FIRST、docs/ops/tasks/TEST-CURSOR-TOOLS-1-pure-regressions.md，证据冻结590037a6。
按T01～T08连续做工具纯函数候选回归：先逐组读旧断言去重，再补真实公开函数的输入/输出用例。
统一node:test+assert，产物仅docs/testing/cursor-tool-regressions/**；不新增框架/config，不改产品/旧测试/基线。
正反输入同合同，比较完整输出及实际输入深快照；已有证据足够则记existing-proof，不凑测试数。
工具只调用卡内纯函数，不执行CLI、applyRelocation、全仓审计门或迁移；没有浏览器/PAL素材需求。
疑似bug保留显式隔离失败例，不改预期/skip，不顺手修产品。四组一提交，八组做完整包push。
只跑本人Node候选、允许的相邻docs工具测试、本人Biome/docs/diff；不跑全仓check或官方覆盖率。
交正文SHA、逐组状态、精确测试名/命令/结果和给Codex的接收提示词；不代签、不标done，正式接入由Codex另核。
```

## Codex初版接收席位 — 2026-09-25（历史）

候选02d91f7a：**counter，CT-R1/CT-R2**。独立复跑候选21/相邻20绿、Biome/docs/diff通过；
公开函数实际调用与T06去重成立。但T05预期固化目录改写漏改，T07两种实际输入污染反控仍全绿。
详见[复核报告](../../testing/cursor-tools-review.md)和[冻结见证](../../testing/cursor-tools-review-witness.mjs)。
Candidate与源码原样保留，未代改测试语义；不合main、不代签、不标done。正式转正/质量门暂缓，
目录工具缺陷由Codex另行处理，Cursor只交正确方向的诊断与完整实参回归。

### 初版下一位Agent提示词（历史；返工已接收）

```text
在codex/cursor-tools-tests-r1返工TEST-CURSOR-TOOLS-1，原候选02d91f7a，证据冻结590037a6不变。
先git show读取Codex复核分支上的docs/testing/cursor-tools-review.md和本卡CT-R1/CT-R2，
不合入共享卡/看板，不改Codex冻结见证工具。
CT-R1：T05中docs/old/deep-extra.md仍适用父目录映射，不能预期保持原样；
把正确输出docs/archive/old/deep-extra.md的反例移到显式diagnostics，配单父映射成功对照。
保留合法最长匹配、Git引用与真正无有效映射的后缀绿例；不得skip/test.fails或掩盖已发现工具缺陷，不修生产。
CT-R2：T07错配三轴与两个invalid分支都用具名实际document/rows，调用前独立深快照、后立即比较同一实参；
保留完整业务结果断言，两针实际输入污染应能变红。不要只比较外层axes或临时对象的副本。
顺手把四条导入检查及回执收窄为import smoke，不冒称动态证明没有IO/审计；分清21原用例中的烟测与行为例。
白名单仍docs/testing/cursor-tool-regressions/**；T06 existing-proof及其它已核断言不重开。
只跑候选/显式diagnostics/允许的相邻工具测试、本人Biome/docs/diff；失败如实记录，不跑官方覆盖率。
Codex见证冻结旧候选，返工后部分结果应反转，由Codex适配判定，不让你改见证凑绿。
整包提交推送并给正文SHA/登记tip，列绿候选数、诊断实际红因和剩余项；不合main、不代签、不标done。
```

## Codex当前接收席位 — 2026-09-25

返工候选`85f2a8243f84e6ffdfe01ce6f8e96160f98e82ca`：**accept，仅隔离候选材料接收**。
CT-R1/CT-R2均闭合：绿套件22/22，T05显式诊断1绿/1业务红、隔离修正视图诊断2绿；
T07两针实际输入污染各使目标用例业务红。相邻docs工具20/20、Biome/docs/diff通过。
[本人复核](../../testing/cursor-tools-review.md)保留初版counter与本轮接收；贡献者原测试/回执未由本人修改。
工具漏改仍在源码中，诊断红不是已修复；当前候选不计官方覆盖率。
按用户本轮限定，Status保持draft，不合main、不代签、不标done；正式转正与缺陷修复另核。

交接：无下一位Agent提示词，Cursor本包无剩余返工，等待后续正式准入。
