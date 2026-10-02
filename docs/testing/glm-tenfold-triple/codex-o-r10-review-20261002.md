# GLM O r10 独立复核（2026-10-02）

固定本地/远端`12be8ec2ae73bfe8692c9aa678abc990a990e8df`，测试/证据锚
`a7c15cdf8142e435dfea51930184f4f7ea1c7753`，其后只receipt维护。
作者tracked树干净，派发/冻结不变，整卡 **counter / rework**；
未main/done/官方覆盖结算，不写贡献者树、不自动投递。

## 本轮关闭

原O-R9-01唯一judge的包/深路径截断与叶计数漏核，独立真实存档反例现已拒收；
跨相状态政策与已闭collection/runtime/raw规则保持，不再重开旧判据。
六处typed强转已清；新增28行中的19旧合同已删、8针退出活跃索引且历史目录留存，方向接受。
保留非整数rounding、未钳位成长精确值/固定luck、合法unbound结果与WORD截断新轴；
WORD现在直接观察100000→34464，不能再用循环耗尽后的低位0冒充掩码证据。
新rich-text九条有实际旧断言对照和精确结果，关键词白名单/空内容/非贪婪/大小写等轴成立。
完整oracle tokenizer去截断/串邻例的方向接受，**不要求重做它或重采未变业务针**。

新全包migrate704/content1429/shared154全绿，三typecheck零；
487定向/33文件与全包身份状态对应；根lint3231文件完整0/0/0、docs815/4288零问题、
diff/冻结/白名单门通过。66存档/64目标逐枚patch、三态source/rebuild/restore hash、
执行多重集合/指定单AssertionError对应；61存档未变、3受影响旧针更新、2rich-text新增。
没有新视觉、产品或旧版本兼容代码改动。

## O-R10-01 新再判定工具错把suite当leaf

`re-adjudicate.mjs`两次sameExecutionIdentity传的是`json.testResults`，不是flattenTests结果。
suite没有file/fullName，当前比较器把每份单文件报告都折成同一个undefined键。
用实际O01-CC1报告只换一个passed邻居的fullName：
**当前工具调用形态接受**；正确flatten后同一唯一judge明确拒绝身份变化。

修调用方，把三相都flatten后再比较，补真实同数量换邻居反例。
唯一judge包路径/计数修复已关闭，不另复制judge、不全66重采；原证据用修后模块重新判定即可。
O08-CC10仍缺显式完整target，正常登记最终fullName即可，身份/源未变无需重采。
本轮Reviewer自己的逐针审计已正确展平，66存档业务证据对应，**不因工具错误全判无效**。

## O-R10-02 真账仍是旧账join，不是全量逐条件闭合

build-contracts.mjs保留旧source/caller/oldAssertion，只对少数manualOverlay补condition。
最终487行里 **464 condition空、249 oldAssertion含token/重叠阈值近似**。
例如场景单侧重复id却旧锚指同id add-add，场景顺序冲突旧锚指map index；
正确完整expect链解决了语法截断，不自动证明条件/caller/旧matcher对应。

已完成18行人工域与少数merge行保留；其它按域逐条件核实际源行、生产caller、合法输入、
旧完整fullName/断言matcher、新轴与精确oracle。生成器可以抽断言，但不能把旧join的空条件当closed。
不必为未变合法代码反复窄返工，后续补合法余族时同步填真账；最终整卡验收前必须闭合。
“多级独立掷随机”用恒rng0只证多级累积，不独证独立抽样；收窄标题或加真正可区分oracle，不能凑例数。

487执行/净新结构上限486/缺口至少214仍是部分，不是700/60组完成。
README顶层194路径/自测27等旧摘要与最终实跑分类同步，不继续让旧摘要覆盖当前数字。
新缺合法轴仍逐条件申请，不整族缩围，不为已删除目标重造针。

[机器证据](codex-o-r10-review-20261002.json)与
[逐针](codex-o-r10-review-20261002-counters.json)；新原始log/JSON在
`/private/tmp/codex-p-r10-review.PYFL5L`。旧版本兼容审查pass，无产品版本分支新增。

## 下一位 GLM O 提示词

代码阶段请用户发送前手动选 **GLM-5.3**，不自动投递或自行切模型。

```text
继续TEST-GLM-WAVE-O-1，唯一O Owner，原树/Users/zhangxu/.codex/worktrees/glm-wave-o/type-pal、分支codex/glm-wave-o-supply-validation-r1，固定12be8ec2ae73bfe8692c9aa678abc990a990e8df。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/testing/glm-tenfold-triple/codex-o-r10-review-20261002.md/json及原卡最新段。原完整路径/叶计数judge、六桥、删19旧例/8退役、WORD截断与rich-text新轴、完整oracle去截断已关闭，不重做工具或未变61业务针。仅闭O-R10-01：re-adjudicate.mjs把suite当leaf传给sameExecutionIdentity，两次调用都改flattenTests三相后比较，补真实换passed邻居身份拒收，当前66原三态用修后模块再判即可、不重采；O08-CC10补显式完整target，不改业务答案。O-R10-02真实账仍464空条件/249 token旧锚，按域补源码条件/生产caller/合法输入/旧完整fullName和断言matcher/新axis，保留已写18人工行与少数merge行，抽完整expect链工具保留但旧join不能当closed。“多级独立掷随机”恒rng只证累积，诚实收窄或真oracle；同步最终实数与历史。487执行/净新上限486/缺口≥214、66存档64目标为部分，连续推进原合法余族并同步真账，700/60组不缩，不再仅交窄返工完成。派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，仅原O新测/fixture/wave-O；产品/旧测/配置/baseline/真实数据/P/Q/Grok/Cursor/共享文档只读，CLI只mkdtemp。源/执行集真变只重采受影响针，每批定向相邻/typecheck阶段推送，末批三包/静态0/0/0/docs/diff/verifier和真实完整SHA/准确剩余账。不合main、不done、不官方ratchet/protected、不清原树。
```
