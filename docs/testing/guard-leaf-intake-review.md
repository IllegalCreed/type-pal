# TEST-GLM-CONTENT-GUARDS-2 r1 独立接收

2026-09-26，Reviewer：Codex。候选`b8e037cb3f4da68e4c5217842949bddbe6d23828`，起点ef19ae7e，
接收主线fe4ccdb2。**counter，仅下列R1–R4；不接入main、不改候选测试语义、不执行官方统计门。**
卡：[六组守卫叶补测](../ops/tasks/TEST-GLM-CONTENT-GUARDS-2-leaf-boundaries.md)。

## 已通过，不重开

- 白名单：三测试、一个fixture、专属目录与卡内作者交付块；本卡允许的作者块不算越界。
  产品、旧测试、scripts、配置/基线零diff；三个目标对51048353不漂移。主线Reforge改动不归GLM差异。
- 独立复跑全content79文件/957项与TC全部exit0。原负控91正控/六针均exit1、实际各一项AssertionError，
  三生产hash保持。**六针本次实跑为有效红**与**判据仍存在误收能力**分别成立，不撤回实跑事实。
- docs检查PASS、diff whitespace PASS。fixture使用当前形状/联合，无强转或产品替身；
  guard-leaf-fixtures只是typed构造器。deepSnapshot对本批实际plain object/array/NaN输入有效，不误报成JSON快照问题。
- 作者递归13项未复制；G5原Error身份有真实新增断言，新的growth/容器错误路径有价值。91数量本身不是counter。
  覆盖配置使用官方content选择和相同生产include/exclude，before仅排除新测试；本轮未独立重跑临时覆盖，
  不把作者20L/30B当本席新增统计。没有发现实际产品缺陷，本轮反例是隔离变异，不是生产现状。

## R1 — 输入保真与精确错误路径没有被所称断言钉住

直接锚点（候选）：

1. `packages/content/src/enemy-validation-shapes.leaf.test.ts:20–22`只做toBe(input)，
   不能证明标题所称“字段不被改写”。给record的原返回前插入同一对象`ms=888`，三份候选仍**91/91**绿。
2. `packages/content/src/battle-choreography.leaf.test.ts:218–227`的seen与expected均指向同一cue，
   回调返回后把`cue.rows[0].text`改掉，三份候选仍**91/91**绿。其它合法动作数组、G5部分输入也没有独立快照，
   回执“每行deepSnapshot”不实。要求对本批实际可变输入，在调用前取独立快照、返回/拒绝后比较同一对象；
   对G5错误身份仍保留catch+toBe，不改成只比message。原始值无需装作可变对象做空快照。
3. `packages/content/src/enemy-ai-condition-guard.leaf.test.ts:91–93`使用toThrow(string)，
   它是子串匹配。生产路径从`when.in[1]`改成`WRONG.when.in[1]`，三份候选仍**91/91**绿。
   本卡明确承诺精确路径；在新例中以实际Error.message全等或等价精确matcher落实，不改旧测试。

三个反例均运行完整91项，无skip、超时或测试代码注入；实际生产load唯一命中，源hash不变。
[复建工具](guard-leaf-review-witnesses.mjs)与[本席机账](guard-leaf-review-evidence.json)记录MISSED。
修后应分别由对应新断言检出；不得通过改标题撤掉卡面输入保真/精确路径要求。

## R2 — 同型合法对照/单轴构造与回执不一致

- `battle-choreography.leaf.test.ts:80/:86`的“wait缺ms”因`'ms' in bad`为false，正控实际是stopMusic(0)。
  用显式同kind正控或先构造合法wait再删ms；按坏字段有无猜正控是错误依据。
- `:305–307`的when为`{kind:'turn',op:'<'}`，同时缺value。补合法value，并从同一合法turn仅改op。
- `:272–279`没有先过同型合法中间hook，还把playMusic整体换成wait(-1)，不是只改ms。
  先准备中间hook为合法wait(0)、通过真实容器guard，再仅破ms。
- `:208–214`标题称“缺rows”，实际输入是整个cue缺席；请真删rows，或如实收窄为cue缺席，且相应表述一致。
- 同时核新例中缺少本型正控的G1/G3拒绝，以及playSound拒绝却用playMusic作正控的行。
  正控可经明确共用fixture/fixture setup，但必须是同一形状且确实执行，不能引用另一个kind替代。

这是少量构造/断言修订，不要求另造大矩阵或扩大测试数。

## R3 — 实际负控判据误收五类反例，缺运行态注入见证

`docs/testing/glm-content-guards-wave2/guard-leaf-mutants.mjs:79–84/:141–158`：
只查failureMessage以AssertionError开头；接受多个失败；失败按短title匹配而完整名只要求某个用例存在；
文件只校验endsWith。工具还只验证源串唯一，没有把load实际命中写入运行态见证。

本席抽取并执行其**真实运行校验块**，不是另写类似谓词：

| 输入 | 应判 | 实际 |
|---|---|---|
| 同一failureMessage含AssertionError后再含TypeError | 拒绝 | 接受 |
| AssertionError开头的timeout | 拒绝 | 接受 |
| 目标失败+无关用例同时失败 | 拒绝（回执合同是恰一个目标红） | 接受 |
| 目标完整名绿，同短title但另一describe红 | 拒绝 | 接受 |
| 另一物理根下同后缀文件 | 拒绝 | 接受 |

合法红对照通过、exit2/null被拒，故不是本席把所有输入强行判成错误。
修复必须绑定**同一失败记录**的绝对文件与Vitest实际fullName，恰一红、其余预期执行项通过、恰exit1，
逐条failureMessages拒混错/timeout；加入唯一变异id+目标路径的运行态load命中记录。
自测调用同一真实判据，包含以上五反例及现有有效/exit/零执行检查；不新造一份脱离运行入口的“自测谓词”。
原六针产品变异本身可保持，不需要为了修判据扩大成另一批。

## R4 — 最终树格式门与回执校准

`docs/testing/glm-content-guards-wave2/evidence.json:19`起多处格式不符合Biome。
本席`pnpm exec biome check docs/testing/glm-content-guards-wave2/evidence.json`实际**exit1**，
与receipt.md:59的0 error矛盾；三测试/fixture/两工具以外不要漏掉提交的JSON。
允许的四个模板针warning单列，不把本格式error混为warning。

校准回执/机账/卡内作者新交付块：实际正控、单轴、输入快照、精确路径、判据、最终文件检查与计数。
去重表还需把共享percent叶的父入口已证上下界与本次直接入口变体分开：
`enemy-ai-condition-guard.ts:8–14`四kind共用同一percent调用，wave2:14–30已证上下界/有限数，
没有“无直测”就能推出“无合同重叠”。可保留有独立身份/返回值/精确路径等额外断言的直入口用例；
无需硬压回30–50或保住91，也不要把新增用例数说成新增未命中臂数。旧作者13项与原覆盖范围不动。

## 复验记录与停止线

- `/tmp/codex-guard-leaf-content.log`：957/957、TC0。
- `/tmp/codex-guard-leaf-mutants.log`：1+6有效；实际summary位于临时`type-pal-guard-leaf-mutants-VnO7vY`。
- `/tmp/codex-guard-leaf-review.log`：五判据反例被误收；三个坏实现全套91/91仍绿。
  原始机账位于`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-guard-leaf-review-oxViwY/summary.json`。
- `/tmp/codex-guard-leaf-biome.log`：1 error/4 warnings；单独JSON复跑exit1。docs/diff绿。

取证工具exit0只表示取证执行结束；看MISSED/criterion.accepted，不能把其退出码叫候选accept。
旧版本兼容审查：pass，仅测试当前合同，无新兼容入口。视觉N/A。
产品/正式测试/基线不合入，main仅落本席审查材料；任务转rework，候选分支/worktree保留用于返工。
通过后Codex自行统一check→ratchet→strict/集成/清理，不要求GLM补跑全仓门。
