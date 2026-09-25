# TEST-CURSOR-TOOLS-1 — Codex独立接收复核

日期：2026-09-25。候选`02d91f7ac98e7737283f4c255f5e76e23a49fd6e`，
基点1763ac58，源码冻结590037a6。[原回执/候选](cursor-tool-regressions/README.md)原样保留。

## 结论

**counter：CT-R1错误预期固化工具缺陷、CT-R2实际输入保真有盲区。**
七文件21例确实能绿，且直接import真实公开函数，不是测试替身绕过产品；主体也不是把旧用例换名复制。
但全绿不能替代合同判断。正式转正与官方质量门暂缓；独立复核分支保留候选供取证，不合main、不代签、不标done。

## CT-R1 — T05将有效父目录映射被遮蔽的漏改写成正确

位置：`tests/t05-path-rewrite.test.mjs:26-47`，尤其:36输入与:44预期。
两条映射分别是`docs/old → docs/archive/old`和`docs/old/deep → docs/archive/deep`。
输入`docs/old/deep-extra.md`不属于第二个目录，但仍属于第一个目录，应保留有效父映射：

| 对照 | 真实公开函数当前输出 |
|---|---|
| 只有父映射 | `docs/archive/old/deep-extra.md` |
| 添加不适用于该路径的deep映射 | `docs/old/deep-extra.md`（漏改） |

合同依据：`scripts/docs/relocate.test.mjs:39-54`已证目录映射作用于其子路径；
`relocate.mjs:118-123`允许plan.directories加入mapping；`:58-74`声明完整路径/历史SHA保护。
这不是要求`docs/a.md.bak`服从文件`docs/a.md`映射，也不是保护Git历史引用的例外。
根因在`:65-71`：正则先吃最长文本前缀，回调发现后续`-`后放弃，却不能重试有效较短父目录匹配。

本席只在加载视图中将右边界判断前移到正则，使其可回退到有效父目录匹配（源文件零改）：

- 独立正确预期oracle：原函数AssertionError红，诊断修正视图绿。
- 原候选整包：原树21绿，修正视图20绿/1红；红的正是上述T05测试。

返工：绿套件不能保留“漏改正确”的:44预期。将该同输入反例移入显式diagnostics，
以正确父映射输出断言，并保留单父映射成功对照；其它最长有效匹配/Git引用/无有效映射后缀案例仍可保留绿。
不得skip/test.fails、不删掉发现，不要求Cursor改生产工具。工具缺陷由Codex后续单独修复/准入，
本次隔离修正仅用于证明测试预期方向，不是已发布修复。

关于“失败是否被改预期”：提交链只有两次新增用例，没有可见的先红后改绿记录，
不能据此推断作者是否曾改过未提交预期；**能确定的是最终树此预期掩盖了实际缺陷**，必须纠正。

## CT-R2 — T07比较了相邻夹具，没覆盖全部实际实参

位置：`tests/t07-allowlist.test.mjs:43-62,81-98`。

- 错配分支:53传的是临时数组`[mismatched]`，后面比较的是外层axes。
  修改临时数组的长度/成员并不会修改axes，输入保真证明有空洞。
- invalid分支:84/91把两份document直接内联传入，只有violations的快照。
  生产函数若修改无效document，当前测试不会发现。

本席独立单点反控均在实际evaluateAllowlist函数加载视图内插入，原返回结果保持：

| 反控 | 候选整包 | 本席实际实参oracle |
|---|---|---|
| 遇unapproved后向实际violations数组push一项 | 21/21绿，CALL_HIT已到达 | 正控绿，突变AssertionError红 |
| invalid返回前修改实际document字段 | 21/21绿，CALL_HIT已到达 | 正控绿，突变AssertionError红 |

返工：给每次真实调用建立具名document/rows，调用前独立structuredClone、调用后立即比较同一实参；
错配三轴与两个invalid形状均覆盖。完整业务输出也要保留，不以输入快照替换原返回断言。
validateAllowlist的Cursor-owner拒绝输入也可同样具名保留，避免回执继续宣称“各例完整输入保真”但留内联空洞。
不要求改产品函数，不改合法owner规则。

## 非阻断观察与去重结论

- 四条`importing … does not …`用例只检查exitCode和typeof，最多证明导入烟测；
  无输出/IO/进程入口见证，不能动态证明没有跑checker、搬移或gate。
  建议收窄标题/回执为import smoke，或只保留一次启动校验；不要求扩建副作用监控框架。
  当前21=17条行为用例+4条导入烟测，不应对外报“21条新增业务合同”。
- T01的位置切片/引用定义与使用处行号对照、T03输入数组深保真、T04起点缺失/精确去重、
  T05合法编码目标改写、T07完整结果、T08多节点行号都有旧用例之外的断言，主体非机械复制。
- T02字符串“保真”本身由不可变字符串保证，不额外证明对象不变；checkoutTargets真实数组快照则有效。
- T06复用三条selector-prefilter旧测试及DOM矩阵合理，本轮不强制再造文件或重跑重型Vitest套件。
- 位置偏移单点反控将真实markdownLinks使用处start加1，候选两条业务用例AssertionError红
  （T01位置例、T05链接改写例），说明这部分新增断言具有实际鉴别力。

## 独立复跑与可复建见证

在Cursor候选worktree运行（Node v22.23.2，检查子进程去掉NODE_COMPILE_CACHE）：

1. 候选Node测试：21/21，0skip、0fail。
2. 相邻`node --test --test-concurrency=1 scripts/docs/*.test.mjs`：20/20。
   相邻原套件自身会在mkdtemp目录调用applyRelocation；“候选未调用”成立，不等于整个相邻执行没有调用。
   没有在仓库运行真实CLI或搬移工作树文件。
3. `pnpm exec biome check docs/testing/cursor-tool-regressions`：7文件通过；docs PASS，diff check通过。
4. [冻结见证工具](cursor-tools-review-witness.mjs)：

```sh
node docs/testing/cursor-tools-review-witness.mjs /Users/zhangxu/illegal/type-pal-cursor-tools-tests
```

见证结果：原候选21绿；路径修正视图20绿/1红；两种输入污染均21绿（盲区）；位置变异19绿/2红；
三个独立oracle成对控制均按预期反转；三份被加载源码及七份候选文件hash前后不变。
见证里的0-test记录是`node --eval`独立oracle，不冒充候选套件；只按显式断言和exit验证。
该工具冻结当前候选期望，返工后结果应反转；由Codex调整下一轮判定，不要求Cursor改历史工具让其绿。

## 范围与后续

- 候选diff恰README+七个test，T06无文件，无额外fixture/config或产品/旧测试/基线改动。
- 候选通过真实相对路径import本worktree公开函数，未调用整仓DS gate/迁移入口；无核心mock。
- 两个提交原样cherry-pick入独立复核分支（745025cf/1f2dca6f）只作证据承载，不是正式转正，main未动。
- 正式接入、质量门和统计并集暂缓到CT-R1/CT-R2闭合。新发现的目录工具缺陷归Codex后续，
  不授权Cursor修复、不借本卡改前批五份指南或其它任务；无新官方覆盖率数字。
- 下一位Cursor只改本人实验包，交修订候选和真实失败诊断，完整提示见[任务卡当前席位](../ops/tasks/TEST-CURSOR-TOOLS-1-pure-regressions.md)。
