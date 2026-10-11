# 有限测试合同派发 2026年10月8日

2026-10-11 集成以[Codex独立验收](codex-review.md)、[当前固定针配置](codex-needles.json)和[重放入口](codex-replay.mjs)为准；下文派发冻结与贡献原件保留历史身份。

本批三个独立对话分别检查当前脚本编辑器、物品炼化机制页、工程加载边界。产品冻结`797a46a097640206a12b8f61dc014c8db277e457`，路由、源hash及互斥白名单见[targets](targets.json)。具体清单以各卡为准，不滚动扩围。所有模型选择由用户手工完成，本批建议GLM-5.3文本模型。

基点托管状态：Documentation通过；[Coverage 37744699839](https://github.com/IllegalCreed/type-pal/actions/runs/37744699839)失败于第一阶段Game旧测`present/__tests__/grok-composition/p12-overlays.test.ts:21`的5000ms超时，不是本批尚未交付的测试失败。失败日志本机存于`/private/tmp/type-pal-glm-dispatch-base-ci-20261008.raw`，SHA256 `2c16d22637c0fa9520dbda6eb03e04d7e1d04f267749ad248076b813a53ec4ec`。不推断根因已修或放宽timeout；贡献者不用处理该白名单外问题，Codex集成门仍须另核。

- [当前脚本编辑器交互与草稿生命周期](../../archive/tasks/done/TEST-EDITOR-SCRIPT-INTERACTION-1.md)：当前canonical正文、定位帧和被拒提交，不为旧ScriptTree视图补死分支。
- [炼蛊与灵葫机制编辑边界](../../archive/tasks/done/TEST-EDITOR-ALCHEMY-BOUNDARIES-1.md)：合法owner、深链、引用及真实会话草稿，不改玩法公式。
- [当前工程加载与跨表引用边界](../../archive/tasks/done/TEST-REFORGE-PROJECT-LOADING-BOUNDARIES-1.md)：真实组装接线、FileSource错误与地图入口，不伪造typed manifest。

## 完成标准

每个清单轴必须裁定existing-proof、new-contract、unreachable、blocked或product-counter，并有可复核锚点。零新增是允许的；例数、针数、覆盖率都不是任务卡指标。覆盖率仍是整体最终指标，由Codex在精简后的main并集实测结算。

每条新增或合并建议需给源条件、真实公开caller、输入域、旧file/fullName/实际断言行、精确业务oracle及处置。不以fullName相似度、body模板或coverage未命中自动下结论。正文必须写最终裁决；不要只追加一段“后来修正”却让首段保留错结论。

已有合同只登记，不换名称、数字、资源ID或fixture复制。默认不改任何旧测试；确认旧测冗余或跨合同也只提交逐断言建议，不越过本批新测试白名单。未知候选不自动删除。源里存在分支不等于合法caller能到达，unreachable必须解释具体前置条件，不笼统整族缩围。

## 编码及隔离边界

只能在原卡唯一工作树/分支写本卡新测、专属fixture、证据与自己的回执。主树、产品、所有旧测、共享fixture、配置/依赖/官方baseline、真实projects/pal、存档/用户数据和其它队列只读。不得改共享README、任务索引、看板或本协议来消除登记缺口；Codex集成时统一维护。

禁止双桥、as never、Partial伪装、假枚举、ignore、skip/xfail、扩大timeout、业务核心mock、私有state或新后门。业务API使用当前typed合法输入；unknown/JSON/IO边界可合成坏输入，但必须确实进入该公开未知域。通用FileSource的单个JSON反序列化边界不等于允许把假业务对象强转成完整project。任何窄断言必须写明为何属于边界收窄；不得复制旧不安全fixture。

DOM测试调真实React组件和当前设计系统，act包住异步更新；只控制外部IO、RAF、时间与浏览器端口。捕获并恢复原有global/property descriptor、spy、RAF/root/DOM；不静音或过滤console掩盖警告。新测试定向须零act/console.error/未处理异常，相邻旧日志分列，不冒称整仓console为空。

依赖在本次独占工作树安装或复用已有只读依赖。不得在指向主树/另一Owner的node_modules symlink上install；若需安装，先核链接，改为独占安装并用frozen-lockfile，不改tracked依赖。缺资产如实环境blocked，不改ignored规则、不写真实数据来过门。

## 反控与判据

新增/实质新业务oracle选最小可反证变异，针数随合同风险而不是配额。原始绿→恰一指定业务AssertionError红→真正恢复绿→最终重放；每针相位必须有相同非空file×fullName执行多重集合，不能用Set掩盖同名重数。不同定向文件允许不同集合，但该针各相位必须一致。

唯一判据同时检查native JSON、原始stdout/stderr、退出码、signal/spawn、各相位状态、suite.message、未处理/collection/hook/runtime错误、目标身份及失败全文。普通Error、第二个红、pending/todo/skip、零执行、同数量不同身份、信号/启动失败一律不算有效；恢复必须调用同样绿判据，不能只看exit0。

可只读复用[已独立复验的纯判据库](../TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1/lib-isolated-tree.mjs)，先读实际API；只复用判据，不把上一卡固定源/文件/计数常量搬成本卡前提。自测需真实拒收上述陷阱，并至少验证真实Vitest的业务单红、hook/global污染红等必要宿主路径。不要另造宽松judge。

变异只在本次mkdtemp隔离树，finally只清本次明确路径；不能写活动贡献者树产品、固定全局/tmp文件或全局prune。保存原始源、变异、恢复、最终测试字节SHA256，按最终候选重建mutant核可应用及hash。测试源或该针执行集变化必须重采受影响针；未变原件保留，不将历史针冒充最终证据。不修改历史JSON/raw内容再冒充原件hash；若必须格式化，原件独存并列规范化字节hash。

## 交付结构与命令

每卡只在自己的`docs/ops/evidence/<task-id>/`交付：

- README.md：固定候选、清单终态、当前/历史口径、门结果、未完成项和真实停止点。
- contract-ledger.json：逐合同锚点与existing-proof/new-contract等裁决，不只有模板占位；旧fullName与断言锚点必须真实。
- directed.json和directed.raw：同一进程default+native JSON reporter的完整file×fullName×status及stdout/stderr，不把vitest list当实跑。
- counters/、counter-receipt.json和run-counterproof.mjs：原始各态JSON/raw、命令、cwd/env/exit/signal/spawn、目标AssertionError全文、源/测试/mutant/restored hash及精确清理证明。
- gates.json：定向/相邻、本包全包test/typecheck、lint完整error/warning/info、docs/diff；基点失败独立列，不伪造零诊断。
- receipt.json：完整40位dispatch、productionFreeze、testCandidate、receiptHead与docs-only区间（必须git rev-parse/cat-file真实对象）。不得承诺未来回执commit的SHA；可最后docs-only pin并明确其区间。

每批先定向+typecheck，最终一次本包全包/test和typecheck；根`env -u NODE_COMPILE_CACHE pnpm lint`、`pnpm check:docs`、`git diff --check <dispatch>...HEAD`。不每个反控重复跑全仓check或私有全覆盖；官方ratchet/protected fast仅Codex接收后串行执行。共享登记缺口如实单列由Codex维护，不越界修。

基点hosted CI状态另核，不把上一main通过推成当前通过；更不让贡献者修白名单外的基点失败。产品缺陷、无法合法输入或冻结漂移只停止受影响轴，其它有限合法轴继续。交付review后停止：不合main、不done、不删分支、不追加下一批。

## Codex派发与收口责任

2026-10-08 Codex已直接读选定源码、当前caller和代表旧实际断言，确认三卡新测试/fixture/证据白名单互斥；活动Game turn、E2E和代码质量产品写入不交叉。独立验收核合法域、原子性、排重、oracle/有效反控与源hash，不凭全绿或数量收口。

提交前必须先stage所有新增代码文件，再执行tracked质量inventory核验；上一轮CI拒收来自新增测试未计入tracked台账，不允许重犯，也不因此让贡献者改共享台账。Codex集成后按最终索引同步机器总数和真实pending，不虚增已审进度。只有必要质量门通过后才选择性集成、推送、done及退休树清理；新托管CI以实际HEAD核验。
