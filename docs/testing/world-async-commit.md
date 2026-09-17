# 世界异步操作提交一致性：验证与集中E2E入口

任务：[WORLD-ASYNC-COMMIT-1](../ops/archive/tasks/done/WORLD-ASYNC-COMMIT-1-world-async-commit.md)，r1。
实现候选`e13216e7a4439008df38666cbcfec557c8e5a26c`，对比`5bc62a21`；SHA回填不修改产品/测试/基线。
2026-09-17已补齐Kimi独立accept与GLM补审accept，Codex按用户确认核done归档。历史GLM豁免与素材贡献披露保留，不作为第三席独立证明。
本文不扩张到保存barrier、U-02、战斗、默认落点、迁移或完整E2E。

## 实现和正式回归

- 地图：core不抢写，窄提交控制穿过真实main路由和adapter；准备资源/renderer/room且仍有效后，同栈提交canonical与现场。
  通知只在完整安装后执行；提交后abort/reject仍通知，不回滚覆盖新地图。无reload宿主显式提交纯状态。
- 预检：首次await前冻结world/script与actor定义；签名与投影取同一输入，复用解析器取得目标hook/cursor/页/行为/动作。
  不再读取旧sceneScriptOverrides/entityStage，不序列化整world；candidate script优先，无关money/flags/其它场景不误伤。
- 选择：四叶在最后scene await之后检查signal及来源会话，再同步选择；目标地址不与来源混同。
- SAVE8/content20、正常地图/演出形态不变；不改生成内容，不增加旧版本兼容入口。

正式证据：

- [世界提交测试](../../packages/reforge/src/world-async-commit.test.ts)：current runtime→main.executeProjectScriptEffect→adapter→main.reloadMap。
  缺席/已有override、失败/取消/重试、renderer失败、同ID重入、原对象world失效、提交后abort/reject、旧请求迟到、迟到/重复控制、纯状态宿主及显式scene；四叶empty/existing-cursor两初态与合法跨scene控制。
- [主壳预检测试](../../packages/reforge/src/scene-preflight.chain.test.ts)：真实main函数与selector/lease；hook/page/stage/state变化、首次scene等待的冻结输入、candidate script、actor定义快照与无关变化。
- [依赖矩阵](../../packages/reforge/src/scene-switch-transaction.test.ts)：旧字段两用例改为canonical禁用/游标矩阵，原资源依赖和呈现owner保护保留；补页/trigger/auto/activation/animation及有效值归一化。
- [测试fixture与AST提取](../../packages/reforge/src/__tests__/world-async-fixture.ts)不被产品导入；沿用现有__tests__规则，无既有生产范围移除。
- [读档chain](../../packages/reforge/src/save/restore-preflight.chain.test.ts)适配canonical读取：trace记录target校验及prepare的两次定义读取。
  原target校验已经调用getCanonicalScene，旧替身没记它；不是增加网络请求或放宽提交断言。
- [编辑器预览回归](../../packages/editor/src/core/playback.test.ts)走真实playCanonical：换图纯状态提交后继续朝向命令、无中断、作者场景/flow不变。
  它与core中直接核scratch/canonical的纯状态宿主用例互补，不声称预览画布支持实时切地图。
- 最终自查移除了main中转为握手后已无现行调用方的直接canonical写回旁路。现行main调用来自adapter三参路径；
  独立ScriptRunner的自有host合同仍保留，不能用它为main的第二个writer辩护。缺控制时在IO前拒绝的实际main测试已补。

初始先红证据：地图/选择17项为11红/6绿，预检8项为7红/1绿，均在对应产品修复前执行。
日志：`/tmp/type-pal-world-async-build.aNkqp5/before-map-selector.log`、`before-preflight.log`；不是最终测试总数。
初写fixture的undefined默认参数误设已有override已纠正后复跑；取消回归先释放等待并await拒绝，再比较期间快照，避免红路径残留未等待断言。

## 单点反控（可重建）

入口：[隔离反控脚本](world-async-commit-mutants.mjs)。临时配置/日志只进mkdtemp；Vite只替换唯一源点，产品前后hash必须一致。
main.ts?raw保持原TS字符串进入AST；不把环境/模块加载错误记成业务红。

```sh
node docs/testing/world-async-commit-mutants.mjs
pnpm --filter @type-pal/reforge exec vitest run src/world-async-commit.test.ts src/scene-preflight.chain.test.ts src/scene-switch-transaction.test.ts src/runtime-script-project.test.ts src/script-host-adapter.test.ts src/save/restore-preflight.chain.test.ts
```

| 见证 | 预期/实测 |
|---|---|
| control | 正常实现exit0 |
| editor-control | 编辑器12项正常对照exit0 |
| editor-loses-commit-control | 编辑器不传提交控制，新增真实预览用例中后续朝向未执行/中断，1项业务红、exit1 |
| map-early-write | 恢复core抢先写，失败/取消残留断言红，exit1 |
| selector-no-abort | 删除最后await后的取消检查，残留断言红，exit1 |
| selector-no-session | 删除来源会话检查，同ID新会话错误放行，exit1 |
| preflight-no-behavior | 签名漏目标行为，hook/cursor/page旧计划放行，exit1 |
| preflight-live-script | 改成浅拷贝，首次await后混入活动script，exit1 |
| main-loses-commit-control | main路由丢控制，协议拒绝/成功用例红，exit1；不声称错误数据被接受 |
| post-commit-skips-notification | 看到abort就跳过已提交通知，通知次数断言红，exit1 |

首次完整日志：`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/world-async-mutants-KkJPb2/`。
含源hash/变换/命令/exit/日志hash的汇总：`/tmp/type-pal-world-async-build.aNkqp5/mutants.json`。这是单点鉴别力，不是穷尽全部状态组合。
最终代码反控重跑（2026-09-15）：8项反控全exit1，Reforge 45项/Editor 12项正常对照各exit0。
最终汇总`/tmp/type-pal-world-async-build.aNkqp5/mutants-release.json`，日志根
`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/world-async-mutants-w7liFj/`；主壳旁路移除后重新生成的hash仍与当前代码一致。

## WA-E1～3集中E2E入口（尚未执行）

最小逻辑fixture与可执行非视觉driver为上述两个正式测试；资产/场景读取受控，未改PAL工程。
R4集中批需将同场景与命令组装到隔离工程，走正式引擎试玩、保存与重开；以下视觉/磁盘断言未宣称完成。

| ID | 操作与预期 | 可复用driver |
|---|---|---|
| WA-E1 | 房间切可辨底图→正式保存→重开：成功同图；失败/提交前取消仍原图，资源恢复后可重试，无混搭 | world-async-commit的map组与barrier快照 |
| WA-E2 | 目标fade/cut及两页；资源entered时切换配置，旧计划拒绝且现场不换，重新准备按新配置成功 | scene-preflight.chain的selector/cursor、冻结输入矩阵 |
| WA-E3 | 四叶提交前取消无幽灵选择、不丢已有cursor；正常重试及保存重开；提交后取消保留结果 | 四选择叶empty/existing两初态 |

不以dev裸builder导出代替正式存档，不把故障桩成成功。观感由Codex集中验证，不转GLM；PAL s230/s243只供Q1后续内容回归参考。

相邻静态观察（不计本卡已修）：`main.ts`的updateCamera读取viewMin/Max（:558），这些边界由commitSceneSwitch更新（:1150），
即时reloadMap保持原有room等字段更新方式。异尺寸底图切换的镜头裁剪边界需WA-E1/R4实测；本卡没有更改相机策略，也未据此宣称新增视觉缺陷已经复现。

## 全仓质量门

最终定向6文件101项、编辑器Playback 12项、reforge/editor typecheck均通过。
完整check三次对应不同候选均exit0：`check.log`七包7034项，补编辑器回归后的`check-final.log`7035项，去除无调用旁路后的`check-release.log`7036项；
另含文档工具20/20与coverage-tools 17/17。日志根`/tmp/type-pal-world-async-build.aNkqp5/`。
全仓lint为0 errors / 48 warnings / 11 infos；main/playback触及文件的5条未用导入/参数warning为既有代码，未关规则或改无关实现。

首次`coverage:ratchet`为exit1：editor分支19082/27547低于19081/27545，虽都显示69.27%但精确比例回退，基线未被写入。
这不是抖动：补上真实playCanonical换图回归与编辑器漏转交反控后，该新增分支被执行。第二次ratchet通过；
最终主壳旁路移除后再次跑完整check/ratchet/严格fast，以最终候选结果为准，不用多数通过放行。

最终门禁（2026-09-15）：

- `pnpm coverage:ratchet`（`ratchet-release.log`）exit0；随后单次`TYPE_PAL_COVERAGE_BASE_REF=5bc62a21 pnpm coverage:fast`（`strict-fast.log`）exit0。
- fast由6493→6548项（+55：Reforge +54、Editor +1）；生产文件保持617，scope removals为空、相对签字前基线regressions为空。未使用allow-scope-removal、coverage ignore或更改provider/筛选/超时。
- 全仓fast：语句53569/78871（67.92%）、分支38473/61979（62.07%）、函数10173/14506（70.13%）、行48341/69022（70.04%）。
- Reforge行7594/14047→7680/14089，分支5063/10970→5149/11021；Editor分支19081/27545→19083/27547，精确比例提升，不以四舍五入判断。
- AST回归证明实际main函数逻辑，不等于V8已统计这些eval代码为main覆盖行；全仓长期高覆盖目标尚未达成，本卡不替代其它覆盖建设或E2E。

旧批二探针/机器账继续保存冻结产品的历史证据，零修改；新接口验证走上述正式回归，不拿历史probe未适配新签名的错误当产品回归。
