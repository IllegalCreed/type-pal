# CODE58 tools-panel 夹具与隔离勘误

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

前次 58 把主测试 417 行记为'合法fixture、fake timer隔离'证据不足:核心 GameState/runtime/status/battle/resources 用 as never 隐藏缺字段和错误结构(如 rgPlayerStatus:{}),每例只清 body/timer、没有解除 window 监听器。本片以直接反例修正该结论:基点 ba45329cc、唯一分支 codex/code-quality-3y、Codex 单一 Owner,build allowed 仅含两份 tools-panel 测试、新的共用测试宿主及治理证据;58 仍 partial,83 卡仍 47 partial/36 pending/0 accept。

## 范围与证据

逐文件读取与范围见 [read-boundaries.json](read-boundaries.json)(三测试全文+生产/构造器/宿主精确范围 SHA);19 例逐项真实入口、固定输出、排重边界和未认证项见 [case-review.json](case-review.json)。工具面板为项目新增能力,SDLPal 无同形 UI primary;事实源是 bootstrap 单次安装/注入合同、公开 GameState/BattleState 构造器和实际 DOM 动作。被替代旧片 [README.md](../58-tools-panel/README.md)。

## 发现

[before-proof.json](before-proof.json):原 18 绿;隔离副本追加相邻两例后 19 绿+1 个指定业务 AssertionError——前例安装面板,后例清 body 并按 Backquote,已离开的前例 getGs 仍被调用 2 次;不是 collection/runtime 错误或构造器异常。返工:主测移除全部核心 as never,场景/对话从 createInitialGameState 修改明确目标轴,战斗复用已核 typed 角色/敌人 fixture 经 hydratePlayerRolesRuntime 和 createBattleState 建完整状态;敌 HP 与 turn 分别改变,HP 断言定位火神龙单元精确比较 'HP 77/100';leaves 18→19 仅来自职责拆分(全屏/FPS 拆开);tools-panel.test-fixtures.ts 共用合法稳定 GameState 与 typed 依赖,真实 window 事件注册在 afterEach 按 type/listener/options 解绑,清 fake timers/rAF、DOM/styles、speedrun/FPS 单例、偏好保存/清空/恢复。[after-proof.json](after-proof.json):正式 19 绿、同一跨例探针 21 绿,源/测试/宿主 SHA、完整 file×fullName、exit/signal/spawn、native JSON 与 raw gzip、副本清理全部可回读;正式工具面板实现字节未改。

## 结论

[test-gates.json](test-gates.json):完整 tools、battle-inspect、music-source 相邻 34 files/199 tests passed,无 failed/pending/stderr;game typecheck 退出 0 无诊断。[static-gates.json](static-gates.json) 记录 docs/lint/ledger/diff 全过。账本 3312 tracked/286 closed/44 review/2982 pending:旧两测试只修正证据不重复新增 closed;新增测试宿主登记 fixture 已验证;生产 tools-panel.ts 沿用旧源审查记录,不因新相邻全绿增加整卡 accept。

## 整改与复核

存档导入导出仍是 59 边界;本片未实跑其 IO、计时器编辑回写、完整快捷键机制、视觉或 E2E;无新全仓 check/coverage ratchet/protected fast,53 波次是历史候选不能认证本候选。下一步核 63/65 既有测试的核心状态夹具。未重跑任何命令;历史结论保持原时点;候选待 Owner 非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3740B / SHA-256 f98dc02e475d4387b1e4f3bba897f35dbdff567a4b7675893b714c51e282e7d0；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE58 tools-panel 夹具与隔离勘误

基点 `ba45329cc`，唯一 `codex/code-quality-3y`；Codex 单一 Owner，build allowed 只含两份 tools-panel 测试、新的共用测试宿主及治理证据。生产实现、UI、公共接口、存档/资产、规则和 baseline 均未改。58仍为 partial，83卡仍47 partial / 36 pending / 0 accept。

## 直接反例与旧结论勘误

前次58把主测试417行记为“合法fixture、fake timer隔离”，证据不足：核心GameState、runtime/status、battle/resources用`as never`隐藏了缺字段和错误结构，例如`rgPlayerStatus:{}`；每例只清body/timer，没有解除window监听器。两测试原18绿不能证明合法性或隔离。此段精确替代[前次58](../58-tools-panel/README.md)和旧账本相应声明，旧raw/历史记录保留。

[before-proof](before-proof.json)：原18绿；隔离副本追加相邻两例后19绿/1个指定业务AssertionError。前例安装面板，后例清body并按Backquote，已离开的前例getGs仍被调用。不是collection/runtime错误或构造器异常。

## 逐文件与输入/caller/oracle

[read-boundaries](read-boundaries.json)记录本片完整三文件读取与相邻的实际范围/SHA；[case-review](case-review.json)逐项登记19例的真实入口、固定输出、排重边界和未认证项。工具面板为项目新增能力，SDLPal无同形UI primary；事实源是bootstrap单次安装/注入合同、公开GameState/BattleState构造器和实际DOM动作。

- 主测试：移除全部核心`as never`。场景/对话从`createInitialGameState`修改明确目标轴；战斗复用已核typed角色/敌人fixture，经`hydratePlayerRolesRuntime`和`createBattleState`建完整状态，之后只改当前目标轴。不把未hydrate的0或错误结构装成完整运行态。敌HP与turn分别改变，HP断言定位火神龙单元并精确比较`HP 77/100`，避免两轴同时改变掩盖遗漏。修正场景标题只声称实际已断言的场景号/坐标。
- leaves：移除重复deps/宿主，缩放316%委托保留；把互不相干的全屏/FPS混合用例拆开。正式用例18→19仅来自职责拆分，没有堆覆盖率用例。
- `tools-panel.test-fixtures.ts`：两文件共用合法稳定GameState和typed依赖；真实window事件注册继续执行，afterEach按type/listener/options解绑。音源覆盖值也纳入dispose，清fake timers/rAF、DOM/styles、speedrun/FPS单例，偏好保存/清空/恢复。无生产disposer/API扩张，无核心mock、规则弱化或新强转。

## 判别力、测试与未关闭边界

[after-proof](after-proof.json)：正式19绿；同一跨例探针21绿；源/测试/宿主SHA、完整file×fullName、exit/signal/spawn、native JSON与raw gzip、精确副本清理全部可回读。正式工具面板实现字节未改。

[test-gates](test-gates.json)：完整tools、battle-inspect、music-source相邻 **34 files / 199 tests passed**，无failed/pending/stderr；game typecheck退出0无诊断。最终[static-gates](static-gates.json)记录docs/lint/ledger/diff。

账本3312 tracked / 286 closed / 44 review / 2982 pending：旧两测试修正证据，没有重复增加closed；新增测试宿主1项有直接证据后登记fixture已验证。生产tools-panel.ts沿用旧源审查记录，不因新相邻全绿增加整卡accept。存档导入导出仍是59边界；本片未实跑其IO、计时器编辑回写、完整快捷键机制、视觉或E2E。无新全仓check/coverage ratchet/protected fast；53波次是历史候选，不能认证本候选，昂贵门留较大模块收尾窗口。

下一步核63/65既有测试的核心状态夹具，再续70及剩余36张pre-94卡；94–102/editor顺序保持。
```
<!-- incremental-original-source:end -->
