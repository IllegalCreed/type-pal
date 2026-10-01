# Wave O / P r2：Codex 独立复核（2026-10-01）

结论：**两卡均 counter，保持 rework**。已闭合的旧项下方单列，不要求重复返工。
本轮不改贡献者候选，不合main、不标done、不清活动树，不运行官方ratchet/protected fast。
O/P提交者README均仍称partial；“做完了”不等于700合法未重复合同整卡验收。

## 候选与独立复跑

- O分支 `codex/glm-wave-o-supply-validation-r1`，本地/远端
  `4d1fbd80e4bc61987d7d94eb2733d6aa8ca4d9af`。
  `21cc359e4c6dede69c19f4fa8ecf7e3fdb46b7ea..HEAD`确实仅receipt.json变化。
- P分支 `codex/glm-wave-p-editor-residual-r1`，本地/远端
  `2547d8ade1ba94f124acdbef17d495672c581828`。
  测试锚点 `47a3e49ae72a1262e23de814bd483628ab896a98` 后仅wave-P文档/证据，
  无后续包内测试或产品改动；旧P-03区间误记已关闭。
- 派发 `8b3ca062953b17a12178f8d1a9e36657971234b1`，生产冻结
  `3ac9a2e2f6aba8a5cc97640c18fef8549d199380`不变。
- O三个包、P Editor逐包串行运行
  `env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/<pkg> test`
  （追加JSON reporter/outputFile），之后typecheck、根lint、docs、区间diff、verifier。

| 候选 / 包 | 全包实跑 | 新文件 / 新例 | typecheck |
|---|---:|---:|---|
| O / migrate | 704/704 | 10 / 254 | 零诊断 |
| O / content | 1352/1352 | 9 / 130 | 零诊断 |
| O / shared | 145/145 | 1 / 17 | 零诊断 |
| P / editor | 3856/3856 | 6 / 70 | 零诊断 |

合计 **6057/6057绿**。O 401、P 70条最终directed JSON的
file×fullName×status与独立实跑逐条相同，无漏/增项。
这证明可运行及报告对应，不等于471条都已accept为合法未重复合同。

O根lint **exit1，3 error / 0 warning / 0 info**，均为wave-O中的
coverage-delta.json、directed-vitest.json、receipt.json格式诊断。
docs815 Markdown/4284链接/245任务零问题；区间diff零；verifier716/716源匹配、
Owner交集0、469路径白名单通过。旧六个patch whitespace诊断已关闭。
receipt/README的706/1241包例数、lint文件数及194路径旧数须按最终实跑更新，保留历史说明。

P根lint完整2801文件 **0/0/0**；docs814 Markdown/4281链接/245任务零；
区间diff零。全包有jsdom `Not implemented: navigation to another Document`提示，
不冒称运行stdout/浏览器console全零；静态门本身零诊断。
P完整verifier exit1：仅因 `projects/glm-p-lab/` 20个未跟踪自有浏览器工程文件。
独立源检查716/716、Owner交集0；按相同allowedNewPath检查已提交区间142路径，
无越界或旧包测试改动。区别记录“提交树合规”与“活动树临时产物未收尾”，
Codex未删除任何lab文件。

[机器证据](codex-op-r2-review-20261001.json)保存候选、门禁命令、四份全包报告hash、
471逐例结果、54枚反控审计及两枚独立重放。新报告位于
`/tmp/codex-op-r2-review.3Z5anV/`，机器账注明临时报告路径与SHA256。
Vitest/pnpm技能用于真实执行JSON、typed fixture/业务断言检查及串行包门；未改配置/依赖。

## O-R2-01：类型桥仍未清零，且一条oracle证明了错误原因

README所称“17处已清零”与最终候选不符：以下 **7处禁止桥**，另有两处单断言掩盖必填字段。
均为O候选锚点，不把普通合法联合收窄一概禁用。

| 文件（packages下） | 行 | 实际问题 |
|---|---:|---|
| migrate/src/pal-supply-guards.glm-o.test.ts | 89 | as never，旧increaseHpMp形状 |
| content/src/validate-refs.glm-o.test.ts | 104 | 双桥；curability normal不属common/severe/incurable |
| content/src/enemy-ai.glm-o.test.ts | 71 | 双桥；friendDead不属turnStart/act |
| content/src/small-guards.glm-o.test.ts | 182, 226, 227 | as never三处 |
| shared/src/rle.glm-o.test.ts | 200 | as never将wat塞入typed profile |
| content/src/enemy-ai.glm-o.test.ts | 29 | 单断言藏缺失AiBattleView.turn |
| content/src/small-guards.glm-o.test.ts | 23 | 单断言藏缺失WorldState.learnedSkills |

一手类型锚点：content/src/poison.ts:32、enemy-ai.ts:46-59、character.ts:16-25。
合法坏数据仅能通过真实unknown/IO guard入口；不能将它强作运行时合法输入。

small-guards.glm-o.test.ts:219-229声称“party references unknown actor”：
actorsById却实际有ghost键，错误发生于该actor没有battler，泛化toThrow仍绿。
character.ts:325-328先查缺actor，再instantiate；请用完整合法fixture、真正缺键、
精确missing-actor诊断，不能只删桥并保留错误oracle。

## O-R2-02：合同账、排重与剩余规模未闭合

缺少逐合同contracts.json；counters+directed不能替代caller/旧fullName及断言锚点/
输入轴/oracle/分类账。明确重复：enemy-ai.glm-o.test.ts:179-185中canAct/canCastMagic
五条断言与battle-formulas.test.ts:219-224相同，不计新合同。
其余具有ruleIdx/不同guard区分力的轴不得因这条重复而一并删除。

当前20新文件401条、44枚提交反控，仍部分交付，距离700还有299条运行数差额，
且尚未扣重复/非法项；O07–O10等README登记残余未完成。
原700合法未重复例/60组/50有效反控不缩。继续有合法消费者的残余；
确属existing-proof/unreachable/blocked者逐合同举证申请，不靠时间预算或机械参数凑数。

DEFECT-O-1仍只有generic JSON稀疏pages猜测，缺canonical guard/caller及稳定引用证明。
不立已确认产品修复卡、不夹修产品；README“降级”与defect-report须同义，或补一手证据。

## 三态反控：54枚证据审计与两枚实际重放分开记录

读取O44/P10枚正/变/恢复JSON、raw、退出码、执行数：
存量报告均正/恢复全绿、变异恰一目标业务红且执行数稳定；
按最终文件find/replace重建原/变/恢复字节hash均匹配。
O44个patch解析及 `git apply --check --unidiff-zero` 均通过。
**没有独立执行全部54枚变异**，不把读取报告冒称全量反控实跑accept。
O旧“没有恢复执行”已关闭；其类型/合同问题仍独立存在。
O06-CC3/CC5同fullName但分别观测refs与zone facing，不自动算重复。

P旧P01-C03/P02-C10“双红”已经关闭：Codex独立隔离副本不筛相邻例，
分别24正绿→24执行/1业务红→24恢复绿，
5正绿→5执行/1业务红→5恢复绿，合并恢复29/29。
薄副本起初缺本地workspace资源导致collection失败；补齐本地依赖再跑，
未改配置、不计作候选失败。候选和main产品文件未变。
`Error: promise resolved ... instead of rejecting`的Vitest rejects栈实际来自AssertionError，
保留原文，不能仅按Error前缀拒收或改断言伪造文本。

## P-R2-01：10枚patch不可应用，judge仍会接受旧双红

全部10条receipt.patch用 `git apply --numstat` 解析均exit128：
`error: corrupt patch at line 5`。工具将整文件上下文放进
`@@ -1 +1 @@`，hunk计数错误。
find/replace字节hash正确不等于patch可重建；输出正确patch或经验证的明确替换manifest，
在最终候选验证应用结果与mutatedHash一致，勿改产品/规则掩盖。

wave-P/tools/counter.mjs:209判据
`mutatedRun.exit !== 0 && assertionRed && mutatedStats.failed.length >= 1`
没有恰一红与目标file/fullName匹配。
独立用该实际predicate评价旧8fb38fcc证据，P01-C03/P02-C10各两红仍被接受；
构造一个错误目标单红也被接受。这是工具判据counter，不否认当前两枚换针的真实业务单红。
补严格单目标判据及多红/错目标/跳过/collection/环境/超时/未处理异常等拒收自测；
正/恢复全绿，三态执行集与数一致，不过滤邻居隐藏额外红。

## P-R2-02：类型旧项关闭，但合同排重/规模仍未闭合

project-diagnostics.glm-p.test.ts旧三处禁止桥已删除，当前typed fixture合法，P-01关闭。
P01-G09-01/03/04在editor-asset-io.glm-p.test.ts:146/165/175的
insecure/unsupported/available断言与file-system-access.test.ts:16/37/7相同或更弱；
换URL/布尔值不产生新合同。G09非法URL localhostOrigin轴是不同残余，保留。
contracts.json虽然70项有字段，多处oldAssertion/oracle仍是模板，须逐合同给真实旧断言锚点。

70/700、10/50仍只有P01/P02部分；P02残余及P03–P10未完成。
700合法未重复例/70组/50有效反控不缩；逐合同排重后再续合法轴，不能把实跑70全计净增。

## P-R2-03：20条浏览器记录不是20条已证明的功能流程

55张PNG的SHA256全部对应；metadata相位文件一致。Codex抽看11张截图，
没有重复跑贡献者已有浏览器流程。下面是证据相位counter，不从截图错位推断产品一定失效：

- F02 after-undo图仍显示两地图且新地图选中，phase却声称一地图；等待稳定后重取对应相位。
- F06 before/paint/undo三图字节完全相同（hash见机器账），与变化checksum声称不相符；
  未证明可见绘制→undo差分，重取可见状态或如实撤回。
- F09 search/clear图字节相同，clear图仍为zzz和无匹配地图；恢复相位未证明。
- F13/F14/F15/F17/F20只有一张before、after为空，是导航/静态观察，不算实际前后流程。
- F16 beforeHead==selectedHead，inspector已可见，没证明新的选择状态合同。
- F18 375px截图toolbar明显重叠/裁切；DOM menuItems=13不证明可见导航可操作，
  补真实鼠标/键盘可达证据，不授权改UI/产品取舍。
- F09搜索空态不是实际错误→恢复合同；按卡面补合法失败后恢复。
- F03创建/undo、F11菜单undo/redo截图成立，保留；CmdZ宿主限制已如实登记，不强求伪造。

仅重取缺失/错相位，勿重复健康流程。自有lab目前20个文件仅未跟踪，
请保留可复现最小输入/版本/hash/启动步骤于本卡白名单，运行工程放隔离临时目录，
可恢复迁出残留再跑完整verifier，不能增ignore或提交projects越界。Codex未删除文件。
原20条实际功能流程要求不缩，不把静态观察换名凑数。

## 正式结算边界与下一步

O私有migrate比率提升本轮仅审读作者报告，P私有覆盖明确未在返工后重跑；
本轮没有新覆盖率实测，不相加私有收益，不宣称解L/M/N统一ratchet或达到85%。
产品/旧测试/官方baseline均未改，未引入开发版本兼容层；
资源profile名legacy-migrated不等于退休开发schema，不因名称删除当前资产格式支持。

GLM O/P只修各自白名单、推送新完整SHA；Codex再次独立核证后决定集成及官方结算。
本次仅在Codex验收分支落审查/任务卡/导航/看板；文档工具37/37、
docs818 Markdown/4318链接/246任务零问题、根lint2748文件完整0/0/0、diff零诊断。
两份完整r3交接提示词分别落在
[O任务卡二审段](../../ops/tasks/TEST-GLM-WAVE-O-1-supply-validation-tenfold.md#codex-r2-二审2026-10-01)与
[P任务卡二审段](../../ops/tasks/TEST-GLM-WAVE-P-1-editor-residual-tenfold.md#codex-r2-二审2026-10-01)。
