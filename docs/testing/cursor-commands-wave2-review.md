# ARCH-F2-CURSOR-BATCH-2 r1 独立复核

2026-09-26，Codex。候选`b2e8d712cacad8253fbbe9aaf2225753d6d9de80`，开工ef19ae7e，
生产对照51048353；主线接收点be5218bb。**九组产品搬移核验通过；整包counter，仅R1–R3收尾。**
任务卡：[剩余命令拆分](../ops/tasks/ARCH-F2-CURSOR-BATCH-2-remaining-commands.md)。

## 已闭合，不重新实施九组

- `commands.ts`3163→179行，13个新模块，14个产品文件恰落白名单；其他产品、旧测试、配置、基线零diff。
- [本席审计](cursor-commands-wave2-audit.mjs)逐项定位**90个声明**的唯一新归属，声明正文/类型相同。
  只忽略新增export修饰、注释/排版与formatter合法参数/调用尾逗号；不删除数组逗号，未把稀疏数组差异藏掉。
  首次探针因withEntities签名的尾逗号误报，本席修正审计归一化；不是候选代码缺陷。
- **119旧出口**集合相同；**62运行期import绑定**逐项核原来源或搬移后唯一helper归属，没有别名串接。
  擦除type-only后的274个editor生产模块静态图无SCC，新模块不回引commands barrel。
  不把静态图当作所有动态加载形式已证；本次没有新增动态加载。
- 11份新增测试共16项，主要是旧barrel/新模块同一构造器身份，而不是16个新增业务缺陷回归。
  C2–C9引用的既有业务标题确实存在，原测试/断言未改。错误类身份下沉是同一声明，不是两套构造器。
- 本席独立editor check：**324文件/2829项，TC与测试exit0**。改动产品/测试/工具Biome exit0、2条既有针字面量warning。
  `git diff --check`通过。旧兼容审查pass：只是现有当前模型的声明搬移，没有新增upgrader或格式分支。
- 五针均已由本席复跑，并额外用本席严格条件读取原始green/red JSON与日志：每针一正控、恰一目标AssertionError红、
  精确绝对file/fullName、唯一MUTANT_HIT、无suite error/混错/全局异常、源hash未变。
  因作者runner默认回写仓库文件，本席只在/tmp复制它并改变root/输出目录定位，**针与判据代码不改**。
  本次五个实际红有效；下方R1是它仍会接受坏证据的能力漏洞，不撤回真实复跑结果。

## R1 — 负控判据仍会误收四种不合格失败；复跑回写仓库

候选`docs/testing/cursor-commands-wave2/module-mutants.mjs:101–107/:132–148`：
isExactAssertionFailure只核首行和单词timeout，judgeRed只看筛选到的目标，不看其它执行项/套件错误。
本席直接抽取**实际函数**并执行，合法红对照被接受，以下本该拒绝的四项也全被接受：

| 反例 | 误收原因 |
|---|---|
| 同一failureMessage第一行为AssertionError、后面另有TypeError | 不检查后续异常头 |
| `AssertionError: Test timed out in 5000ms` | timeout正则不覆盖timed out |
| 目标AssertionError与另一用例TypeError并存 | 只看目标过滤结果 |
| 目标失败并夹杂另一file.message套件错误 | 不检查suite error |

修复同一实际judge（绿/红均应拒suite/global异常）：钉全范围执行数与目标、拒额外失败/错误、逐message拒混错与超时，
保留绝对file/真实fullName/exit1/hash/注入见证。自测补合法对照及以上四项，必须调用运行使用的同一函数。
保留有效Vitest堆栈中的`runWithTimeout`等函数名，不要把字符串包含Timeout全部误判成超时。

`:475–500`每次运行会回写已跟踪`c*-mutant.json`与evidence.json；与本卡“工具输出写/tmp”不符。
改默认只写唯一临时目录（并打印位置），需要提交摘要时显式另行生成/复制，不在复跑中改作者已提交证据。
五份JSON约11KB，含汇总约23KB，是紧凑摘要，不判定为“大量原始日志”违规；无需为这一点删除全部摘要。

## R2 — 只修新增C1的空强转fixture

`packages/editor/src/core/commands-wave2.composite.test.ts:29`使用`{} as EditorState`，不满足本卡新fixture合法typed输入要求。
两个child只记log且返回原对象，因此测试确实验证了执行顺序，**没有发现CompositeCommand产品行为错误**；
也不把它冒称完整编辑状态/atomic rollback回归。请换用真实合法EditorState（可从现有正式loader fixture取），
调用前独立快照、后比较同一实际输入，并保留原apply/invert顺序断言。不改旧测试、不增加另一套大矩阵。
可参考`packages/editor/src/core/__tests__/scene-reference-fixture.ts`的正式seed/loader构造路径。

## R3 — 回执归位并通过文档门

唯一白名单外文件是`docs/testing/cursor-commands-wave2.md`；卡面允许的是专属目录`cursor-commands-wave2/**`。
本席实际`node scripts/docs/check.mjs` **exit1**：`docs/testing/README.md:1: 目录索引未链接：cursor-commands-wave2.md`。
将回执移到专属目录如`receipt.md`，更新该目录README和卡内作者链接；不需要修改父索引或扩大白名单。
文件搬移必须校准其内部`cursor-commands-wave2/*.json`及任务卡相对链接，别只改文件名。
回执同步区分紧凑摘要与/tmp原始JSON/日志、默认输出位置、最终检查与实际测试数。

## 证据与后续

- [本席机账](cursor-commands-wave2-review-evidence.json)；`/tmp/codex-cursor-wave2-audit.json`保留完整90声明/62绑定表。
- `/tmp/codex-cursor-wave2-editor.log`：2829通过（不是作者自验复述）。
- `/tmp/codex-cursor-wave2-biome.log`：0 error/2warning。
- `/tmp/codex-cursor-wave2-mutants.log`与`/tmp/codex-cursor-wave2-negatives.lacPIT/evidence.json`：五针有效红。
  所有实际green/red JSON位于各自新mktemp目录，摘要列明路径；候选工作树仍干净、HEAD仍b2e8d712。

任务转rework，仅修上述工具、一个fixture和回执。产品九组、90正文/119出口/62绑定/无环事实已接收，不重做。
未合候选、未改官方基线8232/688，不标done、不代签；最小UI与全仓check/ratchet/strict待整包通过后由Codex统一完成。
