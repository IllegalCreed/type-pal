# GLM Q r10 独立复核（2026-10-02）

固定本地/远端 `751933d1524fce56e970a1615e1d5079867c0aa0`，测试/证据树
`d1414ec08b33996c0f71d6ac006fc6b84d580743`，其后只有receipt pin。
对象真实、作者树干净。派发 `8b3ca062953b17a12178f8d1a9e36657971234b1`、
冻结 `3ac9a2e2f6aba8a5cc97640c18fef8549d199380` 不变，**整卡 counter / rework**。
未写贡献者树、未ZCode/模型操作、未main/done/官方ratchet/protected/正式覆盖结算。

## 原返工的实质关闭项

### Q-R9-01 的实际MAP/PAT正控 accept

本轮对新fixture独立编码/原产品解码，并在只读解码器副本按primary
`reference/sdlpal/yj1.c:387-434`的until-terminator循环继续读尾标，逐bit检查EOF、
逐回引检查已产出位置、逐输出检查声明上界：

- 65536B全零MAP编码8240B，严格读65879bit，产出恰65536，真命中0xFFF终止；
  无EOF、负回引或输出越界，逐字节/hash等于预期零图。
- 合法0帧sprite原文[0,0]编码10B，严格真终止、产出2B，与原文一致。
- 40字面量序列也严格终止、逐字节一致。

这不是仅用宽松产品roundtrip循环停止冒充尾标正确；本次实际使用的literal-only流合法。
PAT输入通道代码已全部0..63，index1=[1,2,63]→[4,8,255]，旧254溢出依赖关闭。
MAP0/1与GOP0/1、FBP五个合法空目录槽成立；MGO非空压缩组解出合法零帧sprite，
F/ABC空组、FBP空图、无BDF仍如实属于跳过路径，不当作非空图形/E2E证明。

### Q-R9-02 FP真实业务轴 accept

FP2变MAP0非空→空，确实不被场景引用、靠非空扫描入集，变异后tilesets由2→1；
不是空GOP触发DataView异常。
FP3 MGO合法组1→2，输出sprite计数真实1→2；不是非法零长sprite崩溃。
FP4已成独立FBP目录不足合同：正常3chunk精确exit1与chunk3越界消息，
变异5chunk后exit0，目标断言恰一红。这个新输入条件与旧“文件缺失ENOENT”不同，可计新轴。
三针本轮独立完整9相均0→1→0、6例执行身份/hash恢复对应。

全部 **61活跃存档** 的索引/meta/最终原源与恢复/重建mutant/hash、
三相执行身份/退出/指定单AssertionError逐枚对应；**51旧组未变+10CLI组更新**。
不是本轮重跑全部61针。NT8历史原证据保留且不在活跃索引；
旧slot/投影/默认timeout/NT1～6及其它已闭合业务不重开。

## Q-R10-01 未用的通用回引API有确定性编码错位

不把这个问题外推成“实际MAP仍非法”：上面的字面量流已经通过严格边界/尾标证明。
但新fixture公开Yj2Backref、可选b0/b1及README“回引全往返”主张不成立。

encoder:184-191先写8bit、再写data2[b0&0xf]位；
primary解码实际总读data2+6位，所以扩展段是data2-2位，而非data2位。
数据回引后多出两位，后继symbol错位。

独立最小输入：literal7、回引val0x100/pos0、literal9，合法预期[7,7,7,7,9]。
当前产品实际返回[7,7,7,7,178]；严格读流继续后报literal output overrun，未命中尾标。
不是产品decoder被本轮改坏（生产冻结未变），也没有向产品提出新机制修复。

**优先收窄fixture**：当前CLI只需要literal-only+终止符，删除未用错误回引接口/反查复杂分支，
撤回“支持回引且测试全过”的摘要即可；不要求为额外功能再造一套产品级编码器。
若确需保留，先按primary长度修好、校验合法回引/声明长度、用实际回引后接字面量的字节断言验证。
没有commit中的40/128/回引往返测试，不能把手工实验或本次Codex探针写成作者已提交测试。
fixture依赖字节变化时重采受影响10枚CLI针；其它51组不动，不造新标题/新配额。

## Q-R10-02 存档/目标/净新/缺口四个维度仍算错

- counters.json自身count=61、perCounter长度61；README/receipt却62。
- 实际52不同file×fullName目标；FP4从旧共享全管线身份改为独立拒绝目标，
  **目标增加1，不是存档新增1**。来源准确为51未变+5Q10更新+5FP更新=61。
- C114与S1-RC4是同一个旧合同及其反控，不得把同一个目标扣两次。
  结构净新合同目标上限为52−1=51；若保守只计50，须列明另一独立排除合同，不能重复扣room0。
  **原50数量门已足够，不要求再补针**；最终合法排重账仍由Codex决定。
- 136执行只扣已登记C114时净新结构上限135、缺口至少565。
  作者若仍保守记134，须列另一具体排除项，且700−134=566；
  “净新134/缺口564”明显拿执行数相减，不能保留。
- 当前contracts的C134仍把独立FP4记作“该目标多轴”；FP3 axis还是toContain('0 sprites')旧字样。
  CLI helper大段注释仍说短MAP/1GOP/零流/空MGO，PAT断言尾注还写254；更新为真实最终构造。
  历史段保留但标历史错误已被Codex修正，不再作为当前续派依据。

这些是窄账/fixture剩余，不重新打掉已证明的合法MAP/PAT与真实FP业务轴。
700合法新例/50工作组/原非剧情流程目标仍未完成，不能以达到counter数量替整卡done。
继续Q07/Q08合法typed生命周期与Q10自包含CLI余族；D-Q01-1保持独立产品draft。

## 独立门

新pal-extract **363/363全绿**、typecheck三包零、根lint3020文件完整0/0/0，
docs815 Markdown/4277链接零问题、派发区间diff零；716全局冻结、Q323源、
Owner overlap0、662白名单路径通过。
Reforge2150/game2805：完整包+shared/content依赖/配置/锁/patch字节不变，
明确复用原独立全包证据，不冒称本轮新跑；最终136定向身份状态与这些全包对应。
没有新视觉/剧情操作，无产品兼容代码新增（旧版本兼容审查pass）。
[机器证据](codex-q-r10-review-20261002.json)记录严格读流、三针重放、61存档及门；
完整新raw/JSON在 `/private/tmp/codex-p-r10-review.PYFL5L`。

## 下一位 GLM Q 提示词

代码阶段请用户发送前手动选 **GLM-5.3**，只有用户切模型，不自动投递。

```text
继续TEST-GLM-WAVE-Q-1，唯一Q Owner，原树/Users/zhangxu/.codex/worktrees/glm-wave-q/type-pal、原分支codex/glm-wave-q-runtime-residual-r1，固定751933d1524fce56e970a1615e1d5079867c0aa0、测试d1414ec08b33996c0f71d6ac006fc6b84d580743。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/testing/glm-tenfold-triple/codex-q-r10-review-20261002.md/json及原卡最新段。实际literal-only MAP/零帧sprite的严格EOF/回引/输出边界+真尾标、PAT0..63、FP2/3真实数量及FP4独立精确拒绝都已关闭，不重做非法零流旧修项。仅闭Q-R10-01～02：fixture未用通用backref API编码扩展多两bit，literal7+回引3个7+literal9实际末字节178非9；优先删未用回引/可选位模式/反查API，保留已需字面量+正确终止符并撤回回引全往返误报，不造产品级编码器、不改生产decoder。若保留须按primary总位长data2+6（扩展data2-2）修好并有真实字节往返与边界证明。账为61存档/52执行目标、51未变+5Q10更新+5FP更新，FP4只是重定一个目标不是新增一枚存档；C114/S1-RC4同一旧合同只扣一次，净新目标结构上限51，原50数量门已足，不再补针。136执行扣C114后结构上限135/缺口≥565；如保守134须列另一具体排除且缺口≥566，不能写564。同步README/receipt/index/quotaNotes/contracts与FP3及CLI旧注释，历史错误明确标历史。fixture依赖/CLI源或执行集变动仅重采受影响10CLI针，其它51保留。然后连续原Q07/Q08已核typed生命周期/Q10合法合成CLI余族，700/50组不缩，避让Grok46源；game/pal-extract与Reforge分阶段，D-Q01-1不夹修，不learnedSpells/capture/剧情/世界后门。派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，仅原Q新测/fixture/wave-Q，产品/旧测/配置/baseline/真实数据/O/P/其它队列/共享文档只读。每批定向相邻/typecheck阶段推送，末批三包/静态0/0/0/docs/diff/verifier与真实完整SHA/准确未完账。不合main、不done、不官方ratchet/protected、不清原树。
```
