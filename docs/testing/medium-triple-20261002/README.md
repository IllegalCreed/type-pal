# Grok / Kimi / Cursor 中等补测批次（2026-10-02）

当前[Cursor四审与两窄项提示词](codex-cursor-r4-review-20261002.md)、[机器探针](codex-cursor-r4-probe-20261002.json)：R3已闭、六原数据保持，但错误类型子串误收和新创建失败rm旁路仍counter；只修工具、不重采业务/不加量。
Kimi/Grok已有accept保持，不追加额度；未main/done/正式覆盖。

用户重新授权三人各一批中量任务；不是旧大卡缩围，也不追开自动连续大包。
Grok/Kimi考虑此前额度余量设封顶，Cursor新卡与旧大卡返工独立。代码Owner由本表分隔，贡献者自验仍由Codex独立复核。

| Owner | 任务卡 | 候选组/容量 | 主反控 | 产品主合同源码（只读） |
|---|---|---|---|---|
| Grok | [启动资源中包](../../ops/tasks/TEST-GROK-BOOT-RESOURCES-MEDIUM-1.md) | 6组，24–32例，最多36 | 4目标 | game bootstrap-resources/dialog-assets/loader |
| Kimi | [当前恢复地址中包](../../ops/tasks/TEST-KIMI-CURRENT-CONTINUATION-MEDIUM-1.md) | 6组，24–32例，最多36 | 4目标 | Reforge script-continuation / content author-flow-stages |
| Cursor | [脚本预览中包](../../ops/tasks/TEST-CURSOR-SCRIPT-PREVIEW-MEDIUM-1.md) | 8组，32–45例，最多48 | 6目标 | Editor script-flow-preview/script-movement-preview |

## 开工路由与当前版本

[targets.json](targets.json)冻结真实main `554b8a0552db30294a9050b4466659c4a14549f8` 的7源/blob/SHA256及root配置/官方baseline。
它同时固定5条未集成候选作排重基线；作者HEAD不等accept/done，不能复制旧测试unsafe fixture或以测试新名称算新。
本批只认此main的content21/SAVE10，不从原GLM的content20/SAVE8树开工或修旧兼容。
随后仅文档注册提交是统一BASE；贡献者从该提交各建独立分支/树，注册表为推荐精确路径，不能在main或旧贡献者树落新批。

先执行 `node docs/testing/medium-triple-20261002/verify.mjs --owner grok|kimi|cursor --base BASE`。
[只读冻结/白名单验证器](verify.mjs)与[白名单拒收自测](verify.test.mjs)检查当前源码、配置hash和BASE后的所有已跟踪及未跟踪可见变更；没有文件删除许可。
注册commit只改文档，产品/旧测试树对象与sourceBase逐字节相同。发现源漂移或Owner冲突，停受影响组，不擅改freeze。
Kimi/Cursor四主源在原O/P/Q/GC冻结池均不存在；Grok三源保持原GC-1 Grok主合同Owner，原400卡所有代码/证据只读。

## 容量、排重和停止线

目标范围是中量容量预算，不是凑数门。每个候选条件读当前源、actual caller、合法输入与main/固定候选旧fullName全部oracle。
全旧证明、不能合法构造或真实产品缺陷逐条件登记；不足预计数交完整处置账给Codex，不自称全部accept，不扩到其它源码凑例。
硬上限到即停止本批新加；没有自动下一波。原GLM三700目标和旧Cursor700/Grok400独立保留，不用此卡替代旧返工。

仅精确注册新测试、专属fixture、自己的证据目录可写。产品/旧测/配置/依赖/官方baseline/真实projects/data/其它Owner/任务卡/共享文档只读。
默认不修改测试配置/规则，不unsafe双桥/as never/ignore/扩timeout/核心业务mock/私有态；typed IO port/deferred与标准API spy可用，真实业务函数必须运行。
坏输入仅进入声明unknown/IO的validator域；别把类型可写当规范合法，不能复活旧chunks/compat/新玩法或格式fallback。
产品缺陷只停相关组并举证，其它组继续；不修SAVE/格式/机制，不扩大D-Q01-1，不能实际migrate/extract真实数据，CLI若必要只mkdtemp合成工程。

## 反控与门

主反控是隔离副本最小产品源变异；每针正/变/恢复的完整JSON/raw、实际exit/signal/spawn、非零file×fullName多重执行集合、恰一精确业务AssertionError及恢复全绿、最终产品与测试SHA256。
唯一judge由runner+拒收selftest共用，拒收零/skip/pending/todo/collection/runtime/未处理异常/多红/错身份；恢复和正控同标准。
至少两枚还要新旧同场旧绿仅新红，以证明真新oracle；输入分区对照辅助不能冒作产品主变异，计数不足诚实counter不补假针。
临时副本mkdtemp+finally只清本次目录，禁止全局prune；历史失败原文保存，新采样不得覆盖旧针历史。

每批新测+相邻/typecheck；最后所属包全test/typecheck（Kimi Reforge与content串行），根lint完整0/0/0、docs/diff/verify。
完整门环境红原报告分列，不跳过旧测试、扩timeout或报假绿；不为此卡抢现行E2E/6012。
本批N/A视觉，只做程序化合同，不冒称新UI/E2E/原版机制验收；若需要用户可见变化即另卡。
覆盖只有最后一次可选私有同分母测量，口径/源码/分母必须标清，不强求个人花额度跑全仓。
官方check→ratchet→protected和main并集/85%只归Codex；作者不改baseline、不合main、不done、不清旧树。

## 证据交付

每Owner在自己的目录提交README导航、contracts.json、directed-vitest.json、receipt.json、counters/三态及必要原raw。
README必须列新执行/净新/旧证明/阻塞/needle不同目标/未完账，不把固定样本全部标verified。
单批分阶段提交，但最终只交一个真实40位候选SHA；测试/证据提交与任何docs-only pin尾区间清楚分开，最后pin编辑后再完整lint/diff。
两报告若大于既有格式门size，正常拆表并导航，不调高size或ignore。

Codex2026-10-02核准build allowed仅新测；本README不声称已自动发到第三方或作者已开工。

## 2026-10-02 当前独立审核 r3

[Kimi/Cursor三审与当前Cursor提示词](codex-medium-r3-review-20261002.md)、[机器证据](codex-medium-r3-review-20261002.json)、[真实运行与反例](codex-medium-r3-evidence/README.md)。
Kimi完整转换+共享judge accept，2/23自测、四针原三态/最终hash重判通过，32例按中量软预算接收，不续派；Grok此前accept保持。
Cursor原五误收/六业务证据/旧3-12-12、C4扣净新和自身导航闭合，但实际afterEach复合错误/状态计数错配误收、同路径对象替换误删仍counter；只修两个工具窄项，34/33不加量、旧六针不重采。
本轮只新跑辅助工具/轻门；114/2257/1255及53/3801/所属包typecheck有同对象证明明确复用。
未main/done/official覆盖结算；所有当前边界在卡面顶部，不重执行历史提示词。

## 2026-10-02 独立审核 r1/r2（历史）

当前以[窄返工二审r2](codex-medium-r2-review-20261002.md)及[机器证据](codex-medium-r2-review-20261002.json)为准：
Grok代码/数据accept待Codex统一接入；Kimi/Cursor业务数据通过，仅剩判据/安全/净新计数窄项。
新31/53/114、Editor3801/Reforge2257绿，静态零；原有效针不重采、软预算不加量，不main/done/正式覆盖结算。

[三中包审核与逐项返工](codex-medium-r1-review-20261002.md) / [机器证据](codex-medium-r1-review-20261002.json)。
三卡均counter/rework，包test已独立全绿，静态零诊断；阻塞是合法输入/排重与反控证据，不是软预算没填满。
不合main、不done，85%未进行本批正式结算。最新提示词在各任务卡末尾，原Owner一次窄修。

作者专属目录尚未接入本共享树，固定候选原证据导航如下；正式集成时Codex再补本地目录链接，不要求作者越界写共享README。

- [Grok固定候选证据](https://github.com/IllegalCreed/type-pal/blob/8ab4752727699a821492e26c2bb3111171234f5d/docs/testing/medium-triple-20261002/grok/README.md)
- [Kimi固定候选证据](https://github.com/IllegalCreed/type-pal/blob/5f34c60f6bd5fbc9deb9f4b06190b2a1f31f428e/docs/testing/medium-triple-20261002/kimi/README.md)
- [Cursor固定候选证据](https://github.com/IllegalCreed/type-pal/blob/40c88183a2edde38aacd6244288361dae0dba9cb/docs/testing/medium-triple-20261002/cursor/README.md)

登记轻门：白名单拒收自测11/11、源码/配置12份hash与登记范围通过，根lint2760文件完整0/0/0、docs821 Markdown/4329链接/259任务零问题、diff零；没有新增产品测试执行或覆盖率结算主张。
