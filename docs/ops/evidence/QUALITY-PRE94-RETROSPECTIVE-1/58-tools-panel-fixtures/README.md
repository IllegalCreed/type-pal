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
