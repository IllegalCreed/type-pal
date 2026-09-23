# STAT-1：类初始化覆盖率合并误报

2026-09-23，Codex只读取证；[修复卡](../ops/tasks/TEST-COVERAGE-TRUTH-1-class-initializers.md)仍为draft。
此文不是已修复回执，也不是下调基线授权。

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

自查失败不隐藏：最小样本初稿没有realpath化`/tmp`，导致raw目标未找到；修为物理file URL并assert存在。
一次离线汇总误把Istanbul的addFileCoverage当替换（实际会合并），产生错误分母；弃用该次结果，现工具先
排除被替换文件再加入新值，断言文件集合与四维分母完全不变。一次structuredClone库实例丢原型的报错亦修复；
最终正式工具1378捕获/离线复算均通过，不以失败草稿当证据。

## 后续边界

修复方案、白名单、回归与三签见新卡。当前只提交诊断/计划，不装patch、不改provider/基线、不跑官方ratchet/strict。
宿主36项与GLM战斗返工独立保留；不能用统计缺陷豁免GLM业务反例，也不能为恢复数字补无意义输入。
