# CODE63/65 speedrun 测试夹具与解绑判别力勘误

基点 `a2ee3650c`，唯一 `codex/code-quality-3y`；Codex单一Owner，build allowed仅snapshot主测试、index主/leaves三文件及治理证据。生产源、工具行为、公共接口、存档/资产、静态规则、baseline未改。63/65仍partial，全83卡仍47partial/36pending/0accept。

## 精确撤回旧测试声明

[63旧片](../63-speedrun-snapshot/README.md)称“合法GameState片段”不成立：旧主夹具用双重强转隐藏`facing:0`、残缺battleState及空`paletteFadeState:{}`。[65旧片](../65-speedrun-index/README.md)对主夹具/解绑的验收也不足：同样的非法Facing被强转掩盖；leaves声称解绑后不重置，实际上只观察toast，且断言失败时不保证解绑；main toast真实timeout未清。旧类型门/测试绿不能使这些输入合法。旧原件和当时数字保留，以下有限证据替代相应当前结论。

## 三文件处理与真实依据

[read-boundaries](read-boundaries.json)列完整三测试/生产snapshot/index读取及当前caller/type/构造器范围；[contracts](contracts.json)人工核定原20例的职责、合法输入、固定oracle、排重和隔离。Primary为当前公开GameState/初始化/战斗/淡入构造器、真实main-loop与计时编排/配置合同；历史speedrun计划的unsafe示例不能覆盖当前合法输入规则，SDLPal无同形工具UI合同。

- snapshot：从完整`createInitialGameState`调整目标字段，合法Facing为down；战斗经`loadDefaultGame`初始化角色runtime/Exp和`attachBattleState`正式构造，再将一敌置0HP/defeated，验证ID完整保留和总血30。淡入门使用`buildFadeIn`完整状态，删除全部核心双重强转。
- index主测试：改完整状态工厂；disabled标题所称“计时不动”补实际elapsed0；默认PB由仅>0改当前配置2:37:32的精确9452000ms。fake timers、afterEach解绑/清timer、DOM/偏好/单例保证失败后也回收。
- index leaves：通过合法状态实际计时1000、F4重置；再起表500后解绑，F4须保持500/running且无新增toast。原“无覆盖层”未断言的标题删除；修正头注释，不再说未启用真实计时。afterEach负责失败路径的解绑，保持独立于main的post-unbind合同。

用例仍20，不堆数量/覆盖率。没有引入核心mock、新强转或产品API。当前默认PB配置不等于节点坐标实跑已认证。

## 反控、恢复与质量门

[before-proof](before-proof.json)、[after-proof](after-proof.json)和raw/native gzip保存command/cwd、exit/signal/spawn、完整file×fullName、source/test/mutant hash、恢复与临时副本清理。只在隔离index副本模拟“解绑后静默重置，toast已关闭”；旧20绿，新19绿/1个指定解绑用例AssertionError。正式恢复20绿；未把collection/runtime错误算作有效针。snapshot/index正式生产源字节保持。

[test-gates](test-gates.json)记录speedrun/tools-panel与真实palette/battle构造器相邻 **23 files / 144 tests passed**，game typecheck退出0无诊断；随后仅修正F8 fake performance.now与上一帧1000ms对齐，最新定向20绿/反控单红及typecheck再验通过，相邻不重复运行。最终[static-gates](static-gates.json)记录docs/lint/ledger/diff。新全仓check、official coverage ratchet、protected fast本小批未运行；旧53波次不能认证本候选，昂贵门留大模块收尾窗口。无视觉、E2E或剧情实跑。

账本保持3312 tracked / 286 closed / 44 review / 2982 pending，三行只纠正证据，不重复新增closed。下一批续70与剩余36张pre-94卡；59/60的save/quick-save边界按原卡处理，94–102/editor优先顺序保持。
