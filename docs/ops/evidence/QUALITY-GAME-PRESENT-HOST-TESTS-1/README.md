# present 主测与冻屏合同质量

Owner: Codex（单 Agent）。基点 `f47f052fa1e732f7e574e70b268790d301dada3d`，同一 `codex/code-quality-94-102`；候选为未提交工作树，逐文件指纹绑定，不冒称冻结提交。

## 范围与裁定

[任务卡](../../tasks/QUALITY-GAME-PRESENT-HOST-TESTS-1.md)、[第二百文件窗口](../../tasks/QUALITY-PENDING-100-2.md)。两个主体原1537／175行完整读取，当前逐文件A–H、caller/primary/读域、问题与保留理由见[审查索引](review.json)。本片代码与本地统一门已接受，ledger 已closed，远端发布由父窗口跟踪；本窗累计2／约100，依赖补读和相邻文件不计数。

产品、接口、机制、资源和规则均未改。复用前窗 P11/P12 与 primitive 的既有证据；当前810行 present 及 bootstrap onPresent 另核实际调用/ownership。SDLPal 仅是参考实现，本片不声称原版或浏览器观感验收。

## 必要整改与排重

移除非法菜单 fixture 和游标的不必要强转、死 helper；8份同义帧数组收成局部构造。drawSprite spy 旁观真实绘制，选帧还核真实屏幕颜色；排序要求完整身份序列，排除缺对象的 `indexOf(-1)` 假绿。统一恢复 spy/wave 相位。陈旧坐标/collector/单跟随者注释纠正，SceneFade 称集成而非 e2e。

菜单 mock 两例复用已有 P12 真像素合同；noThrow、两条较弱 fade 完成例和重复4×4 cover 有明确去向。进行中的 fade、height48/camera、四方向、runtime优先级、脚本姿势/缺资源仍保留。旧屏外 cover 负例不能证明 height gate，撤回该信用，换为可见 height0 拒绝例；不冒称不同输入等价。67旧身份全部有[保留/迁移/替代映射](identities.json)，当前52＋9=61例。

G04-D04 使用真实 battle factory 与六角色 hydrate，真正进入战中菜单 guard。freeze 前色表推进有固定数值 oracle；各 hold 检查整帧。Canvas 保留真实 getImageData，改为3×2异色完整RGBA、原点/边界与源索引断言，移除重复PNG磁盘旁路。SceneFade 初帧全色、非alias和最终16×24矩形均为独立预期，不再只比两个产物。

## 执行与有效反控

原2文件67绿；当前两文件61绿；最终9文件102绿、0 skipped/pending、完整 stderr 为空。game typecheck 0；两个文件 Biome error/warning/info 均0。执行显式 default＋JSON reporter，完整原生结果/双流/command/cwd/time/exit 保存在无损 native archive，不把各轮相加。

两个单点变异只在 owned 临时树实施：height `<=0→<0`、flush首像素破坏。各为旧67全绿／新61恰一条指定业务 AssertionError，零pending；原件含实际patch/源码/测试指纹，临时树均移除、治理树指纹前后相同。

失败保留：新cover夹具首跑一红是遗漏接缝扩散和真实party收集入口，随后补完整地面与透明真实sprite，未改产品；这不是产品红例。首版反控宿主漏root tsconfig/node_modules，四轮0 collection不给信用；r2保持正常workspace结构后才成立。两类原始失败完整保留，未用绿回执覆盖。

## 低成本复验与限制

只读执行 `node docs/ops/evidence/QUALITY-GAME-PRESENT-HOST-TESTS-1/verify.mjs`：核主体/依赖指纹、无损原件、实际身份/诊断、67条映射和两枚单红；不联网、不写树、不重跑测试或覆盖率。八维的语义判断来自本片全文审查，不由哈希认证。

必要定向复验可在 game 包运行 `../../node_modules/.bin/vitest run src/present/present.test.ts src/present/present-hold.grok-r1.test.ts --reporter=default`，预期2文件61例；相邻原命令在原件 execution.json。源码/caller/类型/输入域/布局合同漂移后，仅重新核受影响claim。圈复杂度初筛见附件，不作指标验收。

全仓 check、official coverage ratchet、protected fast、精确退役数据和提交/PR留约100实际主体冻结后；当前未运行、未声称通过。其它 pending 保持原状态，不授依赖或整模块关闭信用。

2026-10-28 集中门更新：已随100主体通过本地全仓check、official同报ratchet/protected及零诊断，旧“未运行”段保留为片内历史。远端发布待GitHub网络恢复，[统一原件](../QUALITY-PENDING-100-2/uniform/README.md)。
