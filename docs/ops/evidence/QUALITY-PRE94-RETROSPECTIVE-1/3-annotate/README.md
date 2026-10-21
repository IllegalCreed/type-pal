# CODE3/3f 标注与symbols测试复审

归[全83卡复审](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)，起点e3cf2cd5a/main=f98d0ddd8，单Agent、唯一codex/code-quality-3y。生产annotate/CLI/词表、公共接口、raw与生成物字节不改；本片只改两测试及精确退役支持数据，0新增关闭。

## 实际读取与合同

[路径/行数/SHA及区间](read-boundaries.json)区分全文与caller片段。源文件前缀packages/pal-extract/src/，coverage工具除外。

| 文件 | 直接证据、ownership与当前结论 |
|---|---|
| events/annotate.ts，109行全文 | 对合法Command联合分派，人读名只来自对应symbols或items词表；raw及未改叶子可共享引用，结构节点新建，纯映射不等于deep clone。parseSymbols在JSON入口检查顶层/已知表/表形状/字符串值；当前实现正确的这些路径被六枚旧测试漏检的变异直接验证。没有生产修复证据，不把本片变成接口/语义改造。 |
| events/annotate.test.ts，原106/现119行全文 | 原9→6。完整expected约束op/id/count/label与递归步骤，去掉局部结构强转；scene fixture由0改为有效1且词表同位非空，继续证明场景名只取symbols。WORD正向承接62/63，symbols优先级保持。三条已证重复的远端缺名/raw独立用例转移到GLM保留合同，仍review。 |
| events/annotate.glm-runtime-resource.test.ts，原121/现159行全文 | 原8→10。choice完整文本/选项/步骤；无else验证then实际被注释，不再钉无业务区别的undefined own-key。输入守恒直接传两项真实调用数组，核commands/words/symbols前后与独立固定输出。四个symbols坏输入合同独立为顶层、未知键、表形状、表值；合法例保留全部五表。缺名ID明确是宽容/未知域，不称合法物品。旧RULES待补注释已清；仍review。 |
| io/word.ts / word.test.ts、shared events类型与出口 | 全文。WORD.DAT为全局ID对应10B记录，items视图从61起；原始551–564逐记录实际是毒素/特殊文字，不能当场景名。人工小词表只证明索引/来源合同，未声称这些药名是原始WORD真实内容。word测试作为相邻执行，不在本片补签整文件。 |
| approved-test-retirements.mjs / test.mjs，全文 | 仅新增主测试精确9→6条目、固定表24→25/净56→59及对应期望；matcher和所有拒绝合同不变。历史其它24条来源未在本片重审，继续原review，不凭70工具测试关闭。 |

CLI的195–218/260–292实际IO接线与落盘区间、schema D17/D20是直接caller/primary；完整CLI仍未重新验收。结构化sequence/if/choice是公开typed转换子集，disasm不产出，不能把这些单测冒充CLI剧情执行。两份词表各例独立创建，未新增公共fixture或另写注释算法；固定expected直接列字段，使丢步骤/改选项可独立发现。

## 六项判别力补证

[probe.py](probe.py)只创建同目录独立模块/测试副本，真实源码/测试在每轮保持不变并finally精确清理。两文件全量执行，无name filter、skip、timeout变化。source/copy SHA、command/cwd/exit、原生JSON/raw均保存。

| 变异 | 旧17例 | 新16例的指定失败 |
|---|---|---|
| sequence只留第1步 | 全绿 | 原sequence合同 |
| choice选项文本改空 | 全绿 | 原choice合同 |
| 无else时不递归then | 全绿 | 加强后的无else合同 |
| 产出正确结果后reverse调用数组 | 全绿 | 真实调用输入守恒 |
| parseSymbols丢spell表 | 全绿 | 五表合法映射保真 |
| 漏表形状guard、仅拒数组 | 全绿 | 表必须为对象映射 |

[before-proof.json](before-proof.json)与[after-proof.json](after-proof.json)：每枚新针均15绿、恰1个指定AssertionError，0pending/0运行时诊断；恢复正常16绿。旧“输入零突变”检查的是原tuple，实际传副本且仅1项，无法证明调用数组不变，不能仅凭原绿accept。没有发现产品实现需要改变。

## 精简、改名与oracle转移

四条重复身份精简：主测试id2/id9999缺名转至GLM邻位缺名例，保留相同三项items视图与原输入；主raw 0x50/[1,2,3]转至直接输入守恒的完整raw输出；GLM正向/优先级由主WORD与symbols两合同承接。scene例中的另一raw子断言也移除，保留真正场景来源合同。

原“if无else只钉undefined键”改为有效then注释；缺名describe更正合法域措辞；原symbols多轴混合用例拆四层。原生list实际8旧身份移除、7新身份加入，不伪称身份不变；9→6与8→10，总17→16。详细身份见[retirement.json](retirement.json)。

三枚转移诊断独立于六枚单例针：错误WORD偏移旧7红→新7红，保留正向/缺名/递归/输入oracle；优先级错置旧2红→新1红，保留主优先级oracle；给raw加wrong注释旧3红→新3红，保留choice/sequence/raw调用输入oracle。完整失败集合由原生JSON保存，不能把多红转移诊断记成“恰一业务针”。

主文件的原生旧digest/count与HEAD、origin/main、旧3y d4cf7f57d三参考一致；实际新SHA和digest精确登记。登记前拒绝，登记后只允许该快照，字节漂移/多删继续拒绝。GLM文件净增2不产生test-count removal，但全部身份变化仍披露；未手改baseline或scope规则。

## 恢复、真实包诊断与未完成项

[tests.json](tests.json)：定向7文件52、shared16文件126/typecheck、extract typecheck及coverage-tools70通过，定向与共享输出无诊断。完整extract runner报告72文件433通过/0pending，但这**不构成包级验收通过**。

[完整stderr census](runtime-diagnostics.json)实际有10个日志块：六条原盘用例因错误REPO_ROOT指向packages/data/raw后提前return，未执行业务断言却被Vitest计passed；另外四块含坏输入/缺映射的parser警告。此前只统计0act/环境/navigation，不能据此说全部运行时诊断清零。没有改原件、静音或以“既有/预期日志”豁免。

两份原盘测试已全文读取，真实根目录四个MKF存在，当前resolver只向上5级而应回到6级；已开[原盘执行完整性卡](../../../tasks/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1.md)draft作为下一批，核路径、真实输入与oracle。其原有fast排除没有新增或扩大。实际数据/decoder/API与零诊断政策保持；不把6条早退粗略从433减去后声称其余都已语义验收。

[verification.json](verification.json)另进程重建变异/副本SHA、核所有raw/runner、原生身份变化与支持表不变部分、恢复与精确清理；不是第三方签字。[静态门](gates.md)按本轮原命令记录。全仓check/official ratchet/protected fast未新跑，editor诊断和extract假绿未清，不合main。

本片只撤回两测试旧关闭为review，source与支持工具历史状态不改、不重新accept。CODE3/3f均partial，全83卡当前0accept/9partial/74pending。先修六条原盘假绿，再续3b及94–102/editor；无下一位Agent提示词，Codex单Agent继续。

2026-10-21 多卡窗口增量见[八维复核与保留项](../3f/closeout/README.md)；历史原件保持原版本边界。
