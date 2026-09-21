# 第一阶段资源对拍测试输入合同 · E-01

Owner：Codex，2026-09-19；接续主线常规测试维护，不等待GLM运行时补测返工，不新开签字卡。
只修`game/src/assets/*-blob-snapshot.test.ts`三套现有测试及其输入回归；**不改生产、提取器、格式、资源或全局测试选择**。

## 2026-09-21 CI彩色日志补正（Codex，同Owner连续测试维护）

用户指出远端Coverage ratchet连续失败后，Codex核#265/#274/#278日志：均在
`snapshot-input-boundaries.test.ts`的断言计数检查失败，四个合法正控子测试已通过，但外层从文本日志匹配到0条计数。
此前记录的本地check/strict通过属实，**不等同远端CI已通过**；未跟进远端结果是本席验证遗漏。
代表运行：[Actions #278](https://github.com/IllegalCreed/type-pal/actions/runs/35549573297)。失败发生在game测试阶段，尚未到最终覆盖率比较，不能归因为覆盖率下降。

根因：Vitest普通CI输出给数字添加ANSI控制字符；本地`NO_COLOR`与Vitest的Agent模式关闭颜色，掩盖了直接匹配数字的正则缺陷。
本席在仅测试子进程中去掉Agent检测标记并启用普通CI彩色报告，复现**4红/16绿**（`/tmp/type-pal-ci-runner-all-repro.log`）；
子报告passed=1，原始日志`SNAPSHOT_ASSERTIONS ... \u001b[33m6\u001b[39m`，直接匹配为空、去控制字符后计数6。
这不是PAL缺资源或游戏算法错误，不改Actions版本/跳过项/阈值来遮盖。

补正仅触一个测试文件：用Node内置`stripVTControlCharacters`对**解析视图**标准化，原始子日志仍原样保存；
抽出同一断言证据检查供真实子测试与五条回归共用。有色/无色精确保留6与1；缺失/零计数/数量不足仍拒绝。
五条回归先在未标准化实现上**2红/3绿**（`/tmp/type-pal-ci-evidence-red2.log`），修后原20项+新5项 **25/25**，
Agent模式与普通CI彩色模式各exit0（`/tmp/type-pal-ci-evidence-green.log`、`/tmp/type-pal-ci-runner-fixed.log`）；game typecheck与改动文件Biome通过。
子进程去Agent标记只用于验证报告格式差异，不改变任何执行权限、产品或实际资源；常驻回归不依赖当前环境开启颜色。

本次本地验证：完整check **7993项 exit0**（`/tmp/type-pal-ci-fix-full-check.log`）、官方ratchet exit0
（`/tmp/type-pal-ci-fix-ratchet.log`），随后在普通CI彩色模式执行保护`d1ed3d73`的**单次strict-fast 7502项 exit0**
（`/tmp/type-pal-ci-fix-strict-ci.log`）。生产632文件、七包全部覆盖分子/分母及范围不变，仅game登记新增5项（2313→2318）；
另外六包整个基线对象不变。原始资源套件/fixture、生产代码、工作流、超时/排除/阈值零改。
本条明确只记录本地已跑证据；远端验收必须核**同一推送headSha**的
[Coverage ratchet工作流](https://github.com/IllegalCreed/type-pal/actions/workflows/coverage.yml)完整conclusion，不能以本地绿替代，
也不重跑或删除旧失败记录来冒称历史已绿。提交后的远端结论以GitHub附着于该提交的检查记录为准。

## 前提与范围

已读CLAUDE、第一阶段engineering-notes的真实函数/分层取证规则、[E-01审计](../ops/audits/pre-e2e/engineering.md)。
现行测试注释允许可选整组原版输入缺席时skip；不是宣称全仓check可在无PAL资源环境中通过。
真实PAL字节对拍的算法、公式、抽样数量和原有断言保持；原版机制/第二阶段接口均无新裁决。

- 输入组缺席：明确skipped，不读取尚未提供的输入。
- 输入组存在：缺必需文件、某类抽样为空、读取失败必须失败，不能零次循环/直接return后算passed。
- RNG合法空chunk没有导出blob仍可通过其`truth.length === 0`断言；不误杀提取器本来允许的空项。
- RNG整个归档零chunk无法验证，新增非空census断言明确失败。
- 真实资源缺失/解析与守卫行为不混淆：内存边界测试验证测试入口，现有真实资源套件另跑验证真实字节。

根因：sprite effect缺文件直接return；enemy/player/fire空样本循环0次；RNG与tileset在describe.skipIf的
收集回调里先readFile，skip仍执行回调。不是迁移器/解码器缺陷，不执行extract或改生成内容。
替代解释排除：整组缺席与单文件缺席分开、真实空chunk作为正控、非空合法gzip/RLE与RNG数据作为对照、权限失败单列。

## 修复与常驻回归

三现有文件：

- `sprite-blob-snapshot.test.ts`：每类样本显式非空，effect显式存在，fire不再去raw目录找替代文件；样本排序固定。
- `rng-blob-snapshot.test.ts`：hasData保护实际读盘，保留动态chunk测试并加一个非空census；缺输入仍有明确skipped测试。
- `tileset-blob-snapshot.test.ts`：读盘移至beforeAll，缺组时六个固定样本均注册为skipped，不在收集期读文件。

原E-01阶段新增`game/src/assets/snapshot-input-boundaries.test.ts` **20项**（本次CI补正另加5项，见上），配
`game/src/assets/__tests__/snapshot-input.setup.ts`：子Vitest实际运行上述测试文件，只替换`node:fs`的数据读边界，
MKF/RLE/gzip/RNG解析仍是真实实现；所有data路径由内存文件表提供，未读写真实raw/extracted资产。
子进程显式关闭coverage，输出仅mkdtemp，不能覆盖官方统计；外层20项才计入fast，不重复累计嵌套用例数。

| 轴 | 断言 |
|---|---|
| 可选raw/导出目录缺席 | exit0、passed=0、pending>0、无任何数据读取，覆盖三个suite及两侧输入缺席 |
| effect缺失 / npc、enemy、player、fire空样本 | exit1、实际测试AssertionError，不把宿主错误或零测试当守卫生效 |
| RNG完整 / 正常空chunk / 缺非空chunk blob / 零chunk归档 | 正常两类通过且断言数非零，缺失与空归档明确业务失败 |
| tileset完整 / 缺blob | 正常gzip及真实像素对拍通过；缺文件业务失败 |
| RNG/GOP存在但拒绝读取 | exit1并明确读取故障，不错误skip/吞错 |

before：最初17项在旧三套测试上**7红/10绿**，均为预期入口合同反例；新增三条导出目录缺席轴后最终20项验证。
after：**20/20回归绿**；连真实PAL三套对拍和相邻tileset-blob，共**5文件/59项绿**，game tsc通过。
新增回归不以额外断言掩盖旧零断言：afterEach只读取/打印expect断言计数，自身不调用expect匹配器。
合法sprite fixture为两帧1×1像素AA/BB；RNG为一帧合法零长度YJ2 delta，真实解码得到一帧未改变的surface。
这些只证明输入合同，不冒充完整PAL资产或新增渲染验收。

```sh
pnpm --filter @type-pal/game exec vitest run src/assets/snapshot-input-boundaries.test.ts src/assets/sprite-blob-snapshot.test.ts src/assets/rng-blob-snapshot.test.ts src/assets/tileset-blob-snapshot.test.ts src/assets/tileset-blob.test.ts
pnpm --filter @type-pal/game run typecheck
```

## 质量门与接续

日志根`/tmp/type-pal-resource-gates.K4bVXY/`，旧树反例子日志`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/snapshot-input-boundaries-i3FBLM/`。
原审计probe-test-gates三文件保持原样：它们记录“旧缺陷成立”，修复后不能为使其继续通过而回退测试。
串行完整`pnpm check` **7478项**通过（game2328；docs-tools20与coverage-tools17另计）；
官方ratchet与`TYPE_PAL_COVERAGE_BASE_REF=4678650a pnpm coverage:fast` **单次严格fast6989项/617生产文件**通过。
lint exit0，既有48 warning/11 info未变，新增/改动文件Biome干净；没有重试取多数。
fast只增20项，RNG新增1条真实数据census仅在普通check/full范围，未改fast选择或排除。
game旧118个fast文件identity/计数保留，现119文件/2271项；七包生产清单/scopeDigest/指标分子分母与全仓total完全相同，
其它六包整个基线对象相同。没有生产diff，没有提取/改写data/projects，没有缩统计范围或降低阈值。
全仓行71.27%/语句69.15%/函数70.99%/分支62.96%保持；这是可信度修复，不冒称生产覆盖率提升或full/E2E已执行。
本次没有浏览器/剧情/听感变化，不需视觉复验。2026-09-19 E-01按本范围修复完成；无下一位Agent提示词，Codex直接收口。
