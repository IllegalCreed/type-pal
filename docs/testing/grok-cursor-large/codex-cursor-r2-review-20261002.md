# Cursor大包 r2 独立复核（2026-10-02）

固定本地/远端`f2a1468d844d1678b5304b4ca7a110a480b2d174`，测试/证据
`2e1f7228dce7059d030c7ef3eec8c8aa6697c0d6`，其后仅receipt pin。
作者树干净、对象真实，派发/冻结不变，**counter / rework**。
原卡700/70组/50不同合法合同目标/12真实流程不缩围，未main/done/正式覆盖结算。

## 已关闭的返工子项，不重复

- tileset-references fixture双桥/伪batch已经改成完整typed态/真实公开扫描，
  缺proof时callback明确抛错不伪造batch；只确认此修复，不泛签全部输入值合法。
- frame-editor自定义3000ms等待已删除，按默认可观察ready/drawn收敛。
- `_vitest-raw.json`已格式化，原JSON值可保留；不重开这条旧格式项。
- 真实CTR-C03-02存档直调四个反例：换passed邻居、exit2、mutant叠真实unhandled raw、
  clean叠同raw，当前唯一judge全部拒收，baseline正常业务存档仍接受。
- 原runner已throw/外层退出，建树/复制纳入finally。用纯CTR-C07-01错完整目标实跑，
  exit2、wrong-fullName拒收且无本轮泄漏、registry前后完全一致。
  首个图像counter清理探针同时叠beforeEach STACK_TRACE_ERROR与业务红，亦拒收/无本轮树遗留，
  不冒称它是新的有效业务三态；清理关闭以另一个纯错目标探针为准。
- 50存档的完整三态叶身份、指定单AssertionError/退出、最终原源与恢复/patch重建hash对应，
  50不同执行目标；不是重跑全部50变异。九条旧证明已诚实分类existing-proof，698未假称700。

## 独立质量门

新Editor **4493/4493**，707定向/58文件与全包身份状态对应，typecheck零。
新唯一judge selftest退出0；docs/冻结/白名单通过，716全局/120分配源、overlap0。
完整门顺序全包→typecheck→selftest→lint→docs→diff→verifier后：

- lint **FAIL：1 error format**，文件`cursor/judge-selftest.json`；
- 派发区间diff **FAIL：vitest-unhandled-probe.stderr:45 new blank line at EOF**。

因此不能采作者“静态0/0/0、diff clean”的摘要作本轮结果。
本輪未写贡献者树/产品/真实数据、未接管浏览器/服务/模型、未官方ratchet/protected。
[机器证据](codex-cursor-r2-review-20261002.json)与
[逐针](codex-cursor-r2-review-20261002-counters.json)，新原始log/JSON在
`/private/tmp/codex-cursor-r2-review.0vrNqZ`。旧版本兼容审查pass，无产品兼容代码新增。

## CURSOR-R2-01 报告生成格式与raw末尾，不是业务返工

judge-selftest.mjs用JSON.stringify多行数组把提交时已format的报告写回格式红。
修正常报告生成/机械格式化收尾，连续自测之后立即lint零诊断；
只提交前手动format不能证明流程可重复。raw fixture只清末尾多余空行，
保留完整stdout/stderr正文、JSON值与历史诊断，不ignore/不降规则。
不用重做四反例/50针/typed等待修复。

## CURSOR-R2-02 真账/700缺口仍未交完

新生成器已分清实际primary文件，不再整批归一个UI，方向接受。
但 **698行oldMatcher仍none、688行sourceCondition只是export声明行、97行oracle被截断**。
caller多为测试调用或“test invoke”，不是生产调用条件。产品导出位置不是条件，
240字截断经常删掉matcher/expected，不能为绕1MiB格式门牺牲证明。
按批分文件+总索引保存完整条件/生产caller/合法构造/旧SHA、fullName、断言matcher/新轴/精确结果。
自动解析可辅助，不要求作者臆造旧行号，也不由Codex代填698条；旧证为空不自动算new。

707−9=698为结构上限，原700目标尚至少缺2，且全量语义排重未完。
请先继续合法余族并同步真实账，不只提交“工具返工完成”。
相同候选内冗余C07-G01-02/10旧锚的`same-file-prior-case`不是Git SHA，
可登记真实候选blob与prior-case关系，不冒称40位对象。

## CURSOR-R2-03 50执行目标仍含两条旧合同

当前50目标确实各不相同，原43→50结构修复关闭；但其中：

- CTR-C09-04对应C09-G02-02（重复claim幂等）；
- CTR-C09-29对应C09-G02-05（release非活动owner不影响当前）。

两条已被作者自己标为existing-proof；反控继续作历史cross-check保留，
不计新增合法合同目标配额。因此净新目标上限 **48，至少缺2**，不是再要求补原来的7。
补真正合法新条件的两个不同目标，不换名/拆标题；原50业务原证据不全量重采，
源/最终执行集变动才重采受影响针。

## CURSOR-R2-04 视觉大部分改善接受，DS01键盘仍被兜底遮住

23截图hash全部匹配；R01精确过滤行集、R02用途中相、R03真实聚焦、
R04实际产品PreviewCanvas（截图有真实地图）、R05真实选择、R06ghost→valid恢复，
DS03 input17/committed2的中相→Escape回2、AR01错误中相、AR02真实frames proof恢复成立。
DS02宽窗键盘b→c的driver等待及wide截图成立；最终narrow回b不是失败，
应补持久化两个独立相位别只留after=b；不重开已证明的宽窗键盘合同。
R04唯一console告警是可归属的Canvas多次readback性能提示，分类保留，**不冒称console全零**。
没有重复跑旧浏览器流程，已核正确阶段不要求全12重拍。

DS01在Enter/ArrowUp/Enter后若没把b移首，自动点击“前移B”，仍同一个pass=true。
没有afterKeyboard或usedFallback记录，steps恒写fallback，无法判定键盘成功。
保留真实鼠标前移，但键盘验收必须在鼠标前独立核order/焦点/提交结果；
失败就如实counter，不能靠另一种输入纠正后叫键盘pass。只补此未证阶段。

另C08-G02-02 maps未建立stampPlacement/sourceStampId，
map-reference-facts只从authoring.stampPlacements产生stamp-placement-source；
当前edges为空而every恒true，不证明“保留该关系”。补真实非空合法placement与精确保留/排除集，
或诚实记empty-existing-proof，不按弱断言凑700。

## 下一位 Cursor 提示词

```text
继续TEST-CURSOR-ASSET-UI-LARGE-1，唯一Cursor测试Owner，原树/Users/zhangxu/.codex/worktrees/cursor-asset-ui-large/type-pal、原分支codex/cursor-asset-ui-large-r1，固定f2a1468d844d1678b5304b4ca7a110a480b2d174。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/testing/grok-cursor-large/codex-cursor-r2-review-20261002.md/json及原卡最新段。旧typed双桥/伪batch、默认等待、_vitest-raw格式、唯一judge四拒收与真实finally清理已关闭，不重做。仅闭CURSOR-R2-01～04：selftest生成judge-selftest.json后lint1format error，修生成/正常格式化收尾，raw probe末尾多空行只清EOF保留正文；连续selftest后lint/diff须零。698旧matcher无锚、688条件只export行、97oracle截断，按批分文件+索引保留完整源码条件/生产caller/合法构造/真实旧SHA/fullName断言matcher/精确结果，不截字段绕1MiB、不让Codex代填；原707执行扣9旧证明后上限698，继续合法余族补至少2真新例并全量排重，不缩700/70组。50存档/50执行目标已结构成立，但CTR-C09-04/29分别是C09-G02-02/05旧证明，不计新增目标，保留历史cross-check；只需补至少2真实不同新目标，不再补7、不拆标题。DS01鼠标fallback可掩盖键盘失败，持久化afterKeyboard/焦点/提交结果，键盘不成功就明确counter，鼠标阶段另列；DS02宽键盘已证只补相位记录，不把窄回b误判；其它已成立视觉阶段和23截图hash不重拍，R04性能warning分类保留不冒称console0。C08-G02-02目前无真实stampPlacement而every空集恒真，补非空合法placement与精确关系集合或existing-proof扣列。判据或账变化且源/身份未变，50旧存档重判保留；源或执行集变化仅受影响针真重采。仅原editor新测/专属fixture/cursor证据白名单可写，74源主合同边界保持；产品/旧测/配置/baseline/真实数据/GLM/Grok/共享文档只读。派发0704d3de6d3d2a2099475a42f601b654bba08579、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，末批Editor全包/typecheck、完整静态0/0/0/docs/diff/verifier与真实完整候选SHA及准确未完账。不合main、不done、不官方ratchet/protected、不清原树或共享临时树。
```
