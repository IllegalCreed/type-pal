# 守卫叶补测 r3 独立接收

2026-09-26，Codex；候选`09c8ccba`（测试正文`a3ab195a`），基线`7d64de13`。
**accept，C1/C2全部闭合**；[任务卡](../ops/archive/tasks/done/TEST-GLM-CONTENT-GUARDS-2-leaf-boundaries.md)。
仅复核[r2 counter](guard-leaf-r2-review.md)，已闭项未重开，不改GLM测试语义。

- C1：`enemy-validation-shapes.leaf.test.ts` record/exactKeys均传同一具名对象或helper参数；
  `battle-choreography.leaf.test.ts` fullInput/body直入口也比生产所消费对象，坏数组/坏键对象有独立快照。
- C2：not(turn>=1)与when(turn>=1)经相同入口先通过，坏例只改op；G6参数表明确good/bad，未知kind有合法正控。
- 本席冻结工具未改：control91绿；record改写84/91、cue改写90/91、路径污染90/91、exactKeys改写89/91、
  body删项90/91、嵌套turn恒拒89/91，六针全由候选自身AssertionError检出。判据原反例和exit2/null继续拒绝。
- 独立运行作者原工具：判据10自测、1个91绿对照、6针逐一业务红且恰目标fullName，load见证与产品hash保持。
- 候选全content79文件957/957及TC通过；改动Biome0 error（4个源码字符串模板针warning），docs/diff通过。
- `ef19ae7e..09c8ccba`仅三新测试、fixture、专属证据和任务卡作者块；三个产品守卫/scripts零diff。

证据：`/tmp/codex-guard-leaf-r3-{witnesses,mutants,content,biome}.log`；
本席见证原始JSON目录`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-guard-leaf-review-y2ehtI`，
作者反控独立复跑输出`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-guard-leaf-mutants-qd3Far`。

接收后与[Codex资源补测](codex-content-resources/README.md)合并跑一次统一门，不重复争用coverage。
GLM为测试贡献者，独立验收由Codex完成；视觉N/A，未把full/Q1/Q2或远端CI计入本卡。

## 集成收口

`d1e99a0d`合并候选；保留GLM三测试/fixture/专属回执语义原样（收口只机械适配任务卡归档链接），合并任务卡冲突时保留双方历史全文。
本席串行全仓check8896、官方ratchet、保护7d64de13单次strict-fast8404均exit0；
详见[并集机账](codex-content-resources/evidence.json)。三守卫直接行/分支达到113/113与114/114；
不把直模块增量19L/29B和作者包级20L/30B混写。正式基线为两批并集，不复跑两份官方统计。
Codex核定本卡done；无需GLM再返工或固定席位签字。
