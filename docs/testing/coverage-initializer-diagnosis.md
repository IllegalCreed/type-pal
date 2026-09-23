# STAT-1：类初始化覆盖率合并误报

2026-09-23，[修复卡](../ops/archive/tasks/done/TEST-COVERAGE-TRUTH-1-class-initializers.md)r1已实施并进入review，统一候选b6286df0。
上半篇保留只读取证；正式实施与验证见文末。当前不标done，也不是下调基线授权。

2026-09-23实施附注：r1三席已准入build；旧最小probe和默认capture/`--replay`针对**未装patch**的
准备树2fcf57d7，不应在已安装修复的依赖树上冒充修复验收。实际安装回归是
`node --test scripts/coverage/merge-initializers.test.mjs`；修后旧1378正式范围捕获用
`node docs/testing/coverage-initializer-capture.mjs --installed`（在bb0e3c3e的7790冻结树运行；最终7826树会
按冻结检查拒绝，不能把新增宿主混进“旧1378”）。本节原始诊断数字保持历史。

## 结论

已把宿主补测出现的script-runner-core逐文件“回退”定位到**覆盖率依赖的合并身份冲突**：
`@bcoe/v8-coverage@1.0.2/src/lib/merge.js:79-86/:125-127`只以函数根range的起止位置分组。
Node22.19.0的V8会给同一个类的`<static_initializer>`和`<instance_members_initializer>`返回
相同位置、不同计数。两个仅导入类的样本，各自是静态初始化1、实例初始化0；合并时两种函数被错误并成一条2。
`ast-v8-to-istanbul@1.0.5`把这条覆盖整类的正计数继续归到未调用的方法，形成幻影覆盖。

根因链有三个独立对照：

1. 不导入任何游戏代码的原生Node inspector样本：实际run调用0/0；分别转换0/0，原合并后2。
2. 同一原始数据**分别转换后合并**得0；或只在内存改合并key保留两种initializer身份，转换得0。
3. 真调用run的正常/抛错正控：实际1/1，原合并及内存修订均2；未把全部计数粗暴清零。

不是V8把run执行记成2：原始数据没有该方法调用；不是项目脚本输入/旧测试被删除；不是并发worker抖动。
仍不声称“所有V8统计都精确”，初始化字段本身的逐项归因、其它语言转换等不由这12个样本证明。

## 最小复现与源码锚点

```bash
node docs/testing/coverage-initializer-probe.mjs
```

[工具](coverage-initializer-probe.mjs)直接开启`Profiler.startPreciseCoverage`，运行临时ES module，
读取原生副作用计数与原始函数range。三种类（静态+实例/仅静态/仅实例）×四种操作
（仅导入/仅构造/合法调用/抛错调用）共12组，各用两个独立进程采样，12组全部通过诊断断言。
`reported`数组依次为原始样本1、原始样本2、正式合并器、内存单点修订。

反例为`both/import`：`actualCalls=[0,0]`、`reported=[0,0,2,0]`。
其它11组的原始/合并/实验计数均与本组实际方法调用相符。
工具严格核原依赖needle只有一处；内存执行同一依赖源码，仅在key加入两种initializer的类型标识。
不修改node_modules、产品、旧测试或基线。正式修复尚需顺序置换/嵌套类等回归，实验不替代准入。

源码链（当前本机安装版本，路径可由createRequire(realpath(provider))解析）：

- `@vitest/coverage-v8/dist/index.js:27-40`：inspector原始采样，附加wrapper起点。
- `@vitest/coverage-v8/dist/provider.js:32-48`：按transform environment先合并raw，再转Istanbul。
- `@bcoe/v8-coverage/src/lib/merge.js:79-86/:125-127/:146-169`：range身份分组与计数合并。
- `ast-v8-to-istanbul/dist/index.mjs:426-443`：相同面积/位置取后序range，再按位置取计数。

上游资料：[Vitest覆盖率管线](https://vitest.dev/guide/coverage)、
[ast-v8-to-istanbul源码与局限](https://github.com/AriPerkkio/ast-v8-to-istanbul)。
本结论来自冻结安装树和本地原始数据，不依据上游当前版本文案推断项目版本的行为。

## 项目原始数据闭环

```bash
# 约一次Reforge旧fast；报告只到新临时目录，不占官方coverage目录。
node docs/testing/coverage-initializer-capture.mjs
# 之后可用上一命令打印的输出目录反复离线复算，无需重跑测试。
node docs/testing/coverage-initializer-capture.mjs --replay <原始输出目录>
```

[捕获工具](coverage-initializer-capture.mjs)使用7790基线记录的Reforge旧1378精确文件集合、官方生产范围/排除，
包装provider仅旁存raw及remap输入，原方法仍被调用。全1378通过；未修正式报告四维分母/分子逐项等于
现有官方Reforge基线。分别保存ssr/client两套输入，不把不同transform数据错拼。

触发误报的是`shop-trial.test.ts`和`scripts/battle-trial-host.test.ts`所属client组：两套仅导入，
均未调用core方法。原client合并把core的192/195行染成已覆盖，再与ssr的158/195行合并变195/195。
同raw分别转换后合并，或使用内存修订合并key，client为0行、ssr仍158行。

| script-runner-core | 原正式报告 | 同raw实验修正 | 差额 |
|---|---:|---:|---:|
| 行 | 195/195 | 158/195 | -37 |
| 语句 | 208/209 | 166/209 | -42 |
| 函数 | 18/18 | 16/18 | -2 |
| 分支 | 141/147 | 104/147 | -37 |

这与宿主包before/after出现的四维下降完全相等，37行清单在[机账](coverage-initializer-evidence.json)。
这证明那组差额能由合并缺陷解释，**不把158行绝对化为逐行实际执行真值**。
另一个同形状模块script-runner.ts四维不变。只对两文件替换回算后，旧Reforge包实验值为
8722L/9668S/1540F/5876B，分母保持14599/16737/2539/11359；官方8759/9710/1542/5913未改。

## 影响范围与证据

工具对633生产文件做AST形状盘点（包含静态块、不要求属性有initializer、排除declare/abstract属性）：
命中`script-runner-core.ts:104`与`script-runner.ts:313`两类。旧Reforge原始采样也只见这两文件的
initializer同range冲突。另六包未重跑；该形状盘点不覆盖所有转换后可能生成的类，也不是整个覆盖工具无缺陷的保证。

最终可重建证据：

- 最小12组：`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-initializer-probe-Ugwsq6/summary.json`。
- main实际1378捕获：`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-initializer-capture-QghVLq/replay-summary.json`。
- 初轮宿主分支取证：`/tmp/type-pal-stat1-investigation.Y5CFWl/`，old/census两次旧1378均绿。
- 机账包含baseline/依赖hash、633源码摘要与命令/退出码；protected输入前后hash不变。
- Kimi先前窄审`e7c4b743`已推`codex/runtime-shell-coverage-r1`；它证明旧计数不可信，未签本次新根因/修复设计。

GLM观察(a)补记：`sourceCensusSha256`配方为SHA-256(UTF-8(JSON.stringify(rows)))，无尾换行；
rows按`Object.values(baseline.packages)`现有插入顺序，逐包按`sourceFiles`数组顺序（不另排序），
每行为`[仓库相对路径, SHA-256(文件原始字节)]`。不含绝对根路径；633行正好是probe的hashes去掉
前3项merge/provider/baseline后，相对化后的序列。该配方与生产文件集合真值来自准备树，不掺新工具fixture。

自查失败不隐藏：最小样本初稿没有realpath化`/tmp`，导致raw目标未找到；修为物理file URL并assert存在。
一次离线汇总误把Istanbul的addFileCoverage当替换（实际会合并），产生错误分母；弃用该次结果，现工具先
排除被替换文件再加入新值，断言文件集合与四维分母完全不变。一次structuredClone库实例丢原型的报错亦修复；
最终正式工具1378捕获/离线复算均通过，不以失败草稿当证据。

## 后续边界

原诊断阶段仅提交计划/复现，未安装patch或修改provider/基线；其后的正式实施单列如下，不倒填诊断证据。
宿主36项与GLM战斗返工独立保留；不能用统计缺陷豁免GLM业务反例，也不能为恢复数字补无意义输入。

## r1正式实施（Codex，2026-09-23）

设计准入c5569d1a（Kimi49269a61、GLMdefd960e）；补丁候选bb0e3c3e；联合验证树e0803d6e。
独立分支`codex/coverage-initializer-truth-r1`；仅合入既有宿主候选1d3d3fb3的测试/工具/文档，
其9个测试/fixture文件与原候选逐字节零diff，GLM战斗31项未纳入。633生产文件对57dda7ed逐个hash一致。

### 实际安装与先红后绿

pnpm生成`patches/@bcoe__v8-coverage@1.0.2.patch`，只改merge.js的两种initializer合并key；
普通函数保留range-only。根package.json只加patchedDependencies，lock仅登记patch resolution。
patch SHA-256：`2f8a8ecf59c8c2a034a221e318faf7be09767cde12bca6d4f5fe1ec70f1ff8bd`。
`pnpm install --frozen-lockfile --offline`通过，实际require路径含同一patch hash。

- 正式回归`merge-initializers.test.mjs`共10项：实际安装/锁校验、原生四态×5种类与普通函数、
  二/三份双序、混合调用、两类initializer身份/计数、普通函数异名同range原合同、空/单输入、
  真实Vitest两个ssr+两个client只导入用例，以及加入真正调用的正控。
- 补丁前首9项：6绿/3红，红因分别为未调用方法误记、initializer混并、真实Vitest方法调用4≠0。
- 补丁后10/10绿，coverage-tools整组27/27绿，改动代码Biome干净。
- 撤补丁对照没有改共享node_modules：将**同一测试原文件及fixture**复制到临时薄工程，链接主树实际
  已安装的未打补丁依赖，仅选上述3条业务反例；3条全部AssertionError，退出1。测试文件SHA相等，
  没有复制/改写合并器逻辑作为正式安装证明。
- 撤补丁日志：`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-unpatched-control-sa3jSe/negative.log`。
  修前/修后工具日志：`/tmp/type-pal-merge-prepatch.log`、`/tmp/type-pal-merge-final10.log`、`/tmp/type-pal-merge-tools.log`。
- 为避免主树后来安装patch影响上述symlink对照，另以`git archive c5569d1a`创建独立临时树并冻结安装，
  复制同一候选测试/fixture后跑`node --test --test-name-pattern='native import:|same-range static|real Vitest ssr/client import-only' scripts/coverage/merge-initializers.test.mjs`；
  同3条全部AssertionError，exit1，真实Vitest仍4≠0。可按此法重建；路径
  `/tmp/type-pal-truth-unpatched-frozen.1cCM6Z`，日志`/tmp/type-pal-truth-unpatched-frozen-negative.log`。

### 四格对照：统计修正与补测收益分开

| Reforge同树测试集 | 未修合并器 L/S/F/B | 已安装补丁 L/S/F/B |
|---|---|---|
| 旧1378 | 8759 / 9710 / 1542 / 5913 | 8722 / 9668 / 1540 / 5876 |
| 加宿主1414 | 10374 / 11430 / 1750 / 6712 | 10374 / 11430 / 1750 / 6712 |

四格分母均为14599L/16737S/2539F/11359B。旧1378修前复用冻结raw，修后本轮实际运行；
最终1d3d3fb3宿主1414的修前、修后均本轮实跑。1414逐测试身份/status相同、131文件逐文件四维汇总
完全相同，statementMap/fnMap/branchMap相同；部分正计数次数因轮询等变化，不影响任何covered集合或分母。
旧core的37/42/2/37是统计修正；在修正口径上，36项宿主净增1652L/1762S/210F/836B。
相对旧官方口径的净增仍是1615L/1720S/208F/799B，不把统计修正计作新增测试功劳。

证据：修后旧1378在`type-pal-initializer-capture-kyVSKc/installed-summary.json`（系统临时目录），
1414两格在`/tmp/type-pal-truth-pair-{unpatched,patched}/after/`；宿主8针在
`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-runtime-shell-mutants-ZZVxL1/`，本轮均重新通过。

### 验证纪律与保留项

pnpm patch-commit曾机械重解到无关音频子依赖spessasynth_core4.3.22，审diff发现后撤掉这三处无关lock变化，
冻结安装恢复4.3.20；最终lock diff只剩patch三处登记，未借补丁升级任何依赖。隔离工作树缺gitignored资源，
只复制主树既有raw/extracted/PAL二进制以运行full check，不提交资源，也未运行提取/迁移生成。

GLM(a)哈希配方已补；(b)其它同span函数形状仅理论观察，无已证新缺陷，不扩本补丁；
(c)正式门不降保持。类字段自身的逐语句精度、其它V8/remapper盲点不作整体担保；DEV-TOAST-1未修。
统一门禁按序**各一次exit0**：`pnpm check`七包8317项（另docs20/coverage-tools27），
`TYPE_PAL_COVERAGE_BASE_REF=c5569d1a pnpm coverage:ratchet`与随后受保护`pnpm coverage:fast`均7826/633。
日志分别为`/tmp/type-pal-truth-{check,ratchet,strict}.log`。基线仅宿主+36，其它六包完整对象不变，
全仓L76.09%/S73.90%/F74.17%/B66.68%；Reforge L71.06%/S68.29%/F68.92%/B59.09%。
不以整体提升掩盖逐文件修正：本例37/42/2/37已用四格raw对照解释。

独立空目录`git archive e0803d6e`→`pnpm install --frozen-lockfile --offline`→实际安装hash回归1/1也通过，
日志`/tmp/type-pal-truth-cold-{install,smoke}.log`。check的lint保留既有47 warnings/6 infos（exit0），
只声明改动文件Biome零诊断。本人实施者accept，GLM/Kimi同候选终审pending；尚未done。
