# Grok / Cursor 两条独立大测试包

2026-10-02最新：[Cursor r5返工后二审（Codex r6）](codex-cursor-r6-review-20261002.md)、
[机器证据](codex-cursor-r6-review-20261002.json)。旧10诊断/最终17核定+700候选/.not oracle进展accept，
源码/依赖未变明确复用独立723/typecheck与54针/12视觉，不重复重门或补针。
最后pin新增receipt一格式error，612旧matcher/105旧锚一blob错配与不等价语义、staging生产器
自动70人审项仍counter；新增C01引用tab旧证明后结构上限≤702，原700目标不缩，连续真账而非工具回执。
未main/done/正式结算；Grok/Kimi限额短审已接收done不续派，旧400包accept保持。

2026-10-02当前：[Cursor r5与GLM三路合并复核/四份直接交接](../glm-tenfold-triple/codex-opqc-r13-review-20261002.md)、
[机器证据](../glm-tenfold-triple/codex-opqc-r13-review-20261002.json)。新723定向相邻/54结构针对应，
中间空洞新条件独证旧3绿仅新红，净新目标50数量门关闭，不再换针；完整lint5error+5warning、
685旧matcher与自动human标志真账仍counter，703上限未全量排重。旧kind/视觉/judge不重开，
Grok旧400accept保持，限额六合同短审不扩；未main/done/正式结算。

2026-10-02当前：[Cursor r4与GLM三路合并独立复核/四份直接交接](../glm-tenfold-triple/codex-opqc-r12-review-20261002.md)、
[机器证据](../glm-tenfold-triple/codex-opqc-r12-review-20261002.json)。新728定向相邻/717身份、53结构针、
静态完整0/0/0；精确kind C08-34独立感度关闭，替代C05-09仍旧排序证明，净新目标上限49，
663旧matcher与真实条件/caller账未闭，717扣十四旧证上限703仍待全量排重。只当前未闭项返工，
旧工具/typed/视觉不重开。Grok代码证据accept仍有效、无作者返工，待Codex正式门；未main/done/结算。

2026-10-02当前：[Cursor r3独立复核与可复制返工](codex-cursor-r3-review-20261002.md)、
[机器证据](codex-cursor-r3-review-20261002.json)。格式/EOF/DS键盘相位/非空fixture关闭，
728定向相邻绿、717身份/52结构反控对应、静态完整0/0/0；仍708旧matcher未核与跨行oracle缺结果，
四新增重复后净新结构上限704未全量排重，CTR-C05-08旧目标使净新目标上限49，至少缺1真新目标。
只连续真账与真新目标，不重开已闭工具/视觉；未main/done/正式结算。同条审核回复直接交提示词，
不等用户再提醒。[Grok r3](codex-grok-r3-review-20261002.md)仍代码证据accept待Codex统一门，无作者返工。

2026-10-02最新：[Grok r3独立接收](codex-grok-r3-review-20261002.md)、
[机器证据](codex-grok-r3-review-20261002.json)。生成格式最后窄项关闭，两selftest后根lint完整0/0/0，
400/40组/40不同目标代码证据accept，卡review、等待Codex串行全仓check→官方ratchet→受保护strict-fast
及main选择性集成/正式并集覆盖结算；未done，不要求作者重采40针或另扩包。
Cursor本轮按用户要求不审，其r2结论与原卡保持，不把历史交付或作者自验当接收。

2026-10-01 用户授权 Grok、Cursor 同时补大量测试；本轮只开放测试、专属 fixture 与证据，
不开放产品实现、官方覆盖率门、E2E 或 UI 取舍。手动转发，不恢复 ZCode 自动操作。

## 分派与所有权

| Owner / 卡 | 冻结源 | 合法新例目标 | 工作组 | 有效反控 | 连续批次 |
|---|---:|---:|---:|---:|---:|
| [Grok](../../ops/tasks/TEST-GROK-RENDER-HOST-LARGE-1.md) | game 46 | 400 | 40 | 40 | 10 × 约40例 |
| [Cursor](../../ops/tasks/TEST-CURSOR-ASSET-UI-LARGE-1.md) | editor 74 | 700 | 70 | 50 | 10 × 约70例 |

[精确源分配 / SHA256](targets.json)是合同所有权清单，不是产品写入白名单。
两个新 Owner 的源交集为零。Grok 负责呈现/资源/有限播放及加载宿主；
Cursor 负责资源编辑叶组件/相关命令与草稿/设计控件。没有登记的主合同不能顺手补。
历史同轮测量分别395/1431未命中分支臂，**不是当前实测、全部可达或保证收益**。
400/700是合法新合同目标；不能改名、换数字、拆断言、无业务 oracle 参数化凑数。
若合同池不足，逐条件交 existing-proof/unreachable/blocked 证据由 Codex 裁决，不自行缩围。

## 与 GLM 及其它队列的边界（revision GC-1）

GLM O/P/Q 原卡仍 rework；原派发、冻结、700目标与旧counter不变。新增所有权取代
P/Q旧“全包新增合同独占”中本表120源的后续主合同权，不否定任何历史交付：
已有测试/有效反控保留、只读并作为排重基线；P/Q继续其它源和原卡窄返工。
Grok/ Cursor 不修改或重采 GLM 证据、不接管其分支。GLM可读/调用保留源以验证未保留主合同，
但不在保留源新增主合同或变异针；反之新 Owner 不向 GLM剩余源拓展主合同。
跨域消费者测试先在账中注明 primarySource；有归属不明则暂停该合同请Codex裁定。

派发前另核当前main的120个保留源均与冻结hash一致。
world-sprite-behavior已在main完成流机制修改，故不划入Cursor；自动脚本预览/完成流新机制
及其相关型别轴停线只读，不把旧冻结投影合同带入新任务，资源静态合同与其它合法组继续。

固定排重候选：O `1d805509af6ecd94a95c0965d373bf98ccde123c`、
P `bb2ffcb6614a5f48eb5bb0bab671941242f2a00b`、
Q `2ebf42b84f6092947e1d35c6ac56901607eb1430`。都是真实Git对象，但不是accept。
派发树含L/M/N及更早旧测；另须用 `git show <固定SHA>:<测试路径>` 读取P/Q新测试与断言，
不能因本树没有GLM后缀就当空白。Q的framebuffer四例不重领；L/M帧/资源/控件证明同样排重。
审查证据见[O r6](../glm-tenfold-triple/codex-o-r6-review-20261001.md)、
[P r3.5](../glm-tenfold-triple/codex-p-r35-review-20261001.md)、
[Q r6](../glm-tenfold-triple/codex-q-r6-review-20261001.md)。
活动E2E/遮挡/剧情/存档等其它卡只读，不碰各自服务或数据。

## 冻结、工作树与精确写入

生产冻结 `3ac9a2e2f6aba8a5cc97640c18fef8549d199380`；源基点
`5cbe5c08b43a3e53b9b7109bc26ab2f913df969e`。
**派发BASE**为新增本目录targets的注册提交，可从本卡所在分支执行：
`git log -1 --format=%H -- docs/testing/grok-cursor-large/targets.json`，
必须展开完整40位、核真实对象及祖先；最终提示词也会给出该完整SHA。
从这个BASE各建隔离分支，不从旧主树/退休候选/作者P/Q树开工。
登记前的主树 `977d391f45c896eeaf66cdf7761b3318bde28bc3` 和未跟踪.zcodeignore不动。

- Grok：`packages/game/src/**/*.grok-r1.test.ts(x)`、
  `packages/game/src/__tests__/grok-render-r1/**`、
  `docs/testing/grok-cursor-large/grok/**`。
- Cursor：`packages/editor/src/**/*.cursor-r1.test.ts(x)`、
  `packages/editor/src/__tests__/cursor-asset-r1/**`、
  `docs/testing/grok-cursor-large/cursor/**`。
- 只有派发时不存在的新测试/专属fixture；旧测试及公共fixture只读。证据目录内现有README可维护。
  专属fixture不得被产品import。共享README/targets/verifier/任务卡/看板由Codex维护。
- 产品/依赖/配置/官方baseline/原版reference/真实数据/项目/存档/其它队列只读。
  CLI/写盘反控仅mkdtemp合成工程；禁止真实工程migrate含dry-run、extract重写数据或全局prune。
- 禁止 any、双桥、as never、类型抑制、私有态注入、mock业务核心、扩默认超时、弱化assert/规则。
  IO边界可typed spy；真实Canvas像素合同须真实2D，不能Partial伪装或透明底假验。
- 冻结漂移/缺合法输入/新机制真值/产品缺陷只停受影响组、给直接证据；其它批准组继续。
  不修产品、不恢复已退役开发版本、不授权移植新规则。发现缺陷交单独draft诊断。

## 连续交付与拒收条件

每Owner连续十批，阶段commit/push后直接下一个合法组，不逐批等用户说继续。
每批跑定向、相邻测试和本包typecheck；只在批末统一私有coverage，不逐例刷覆盖率。
首批先交合同账和可运行typed宿主小样，再扩展；禁把旧测试中的非法fixture照搬成新准入。

`contracts.json`逐条包含 id/batch/group/primarySource及条件行/caller及行/合法输入构造/
旧测试SHA、file、fullName、**实际断言行与matcher**/新axis/oracle（操作数、matcher、精确结果）/
分类/对应执行file/fullName。用“同上”、文件顶部、随意最近标题、复制expect操作数不算证据。
只有新增且实跑passed的合法未重复合同计数，existing-proof/unreachable/blocked另账。
每批准确累计和剩余，不把400/700或分支臂数当已交付。

反控每枚在独立mkdtemp复制树单轴变异：保存patch和 original/mutant/restored三态SHA256、
三态完整JSON/raw stdout+stderr、exitCode/signal/执行多重集合、目标file×fullName及AssertionError原文。
唯一judge核三态相同完整file×fullName执行多重集合；clean/restored全部passed且非零；
mutant恰一个指定业务AssertionError、其它passed、退出码恰1。
拒绝零执行、身份偷换、pending/todo/skip、collection/runtime/未处理异常/raw harness错误、
多红、错误目标、改答案、signal/spawn失败与异常退出码；restore使用同judge。
先用真实Vitest拒收探针测“单断言红叠未处理异常”，不可只用理想合成JSON。
runner用try/finally仅清理本次临时树；finally之前不能process.exit；不全局prune。
最终源或定向执行集变动，重采受影响针，其它历史原证据原样保留；最终receipt重建索引并验证patch/hash。

最终交完整40位测试/证据候选SHA（git rev-parse/cat-file核真对象）。docs-only pin独立字段；
不为回填自指HEAD无限提交，不改历史快照冒充最终。directed JSON含全部file/fullName/status；
contracts/directeds/counters/fixture路径/实际全包数与receipt统一。
至少交 README、contracts.json、directed-vitest.json、counters.json+counters原始日志、
coverage-delta.json、defects.md、receipt.json及本卡要求的视觉/隔离宿主证据。
导航已登记：任何新增证据子目录README须从本Owner README链接，不能共享导航缺失常驻豁免。

最终串行本包全量test/typecheck、根pnpm lint完整error/warning/info=0/0/0、
node scripts/docs/check.mjs、git diff --check BASE...HEAD、
node docs/testing/grok-cursor-large/verify-targets.mjs --owner grok或cursor --base BASE。
日志保持原始诊断计数；外部存量异常举证交Codex、不越界修复或冒称门通过。
Codex独立核候选、去重与反控；仅接收后串行全仓check→官方ratchet→受保护strict-fast，
决定选择性集成/推main/done/清退休树。贡献者不跑正式ratchet、不合main、不标done/清树。
私有隔离收益不相加，只认正式main并集实测；不承诺1100例能把覆盖率推到85%。

## 导航

- [Cursor r2独立复核（2026-10-02）](codex-cursor-r2-review-20261002.md)、
  [机器证据](codex-cursor-r2-review-20261002.json)：新4493/707绿，50三态结构匹配，
  typed/默认等待/旧judge漏收/清理关闭；2旧合同针扣新增配额后上限48，698真账/700缺口、
  DS键盘相位与selftest生成格式/raw EOF仍counter，多数真实视觉阶段保留；未main/正式结算。

- [Grok r2独立复核（2026-10-02）](codex-grok-r2-review-20261002.md)、
  [机器证据](codex-grok-r2-review-20261002.json)：原三业务项关闭，3173/400/40/像素证据过；
  仅selftest生成报告后lint1格式红，窄修生成器即可，不重采40针或扩另一包。仍未main/正式结算。

- [Codex r1独立复核（2026-10-02）](codex-grok-cursor-r1-review-20261002.md)、
  [机器总证据](codex-grok-cursor-r1-review-20261002.json)：新game3173/Editor4493全绿，
  400/707最终执行身份状态对应；Grok两patch与judge/图像hash待闭，Cursor静态1格式红、
  判据/清理/真账/typed/流程counter，50存档仅43不同目标；两卡rework，未main/正式结算。
- [Codex派发前核验](dispatch-preflight.md)、[机器记录](dispatch-preflight.json)

- [Grok独占证据](grok/README.md)
- [Cursor独占证据](cursor/README.md)
- [冻结及所有权验证器](verify-targets.mjs)、[判据自测](verify-targets.test.mjs)
