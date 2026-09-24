# TEST-BATTLE-WORKFLOWS-1 r5 独立接收

2026-09-24，Codex；候选 `fd4efd760219a9a945029b3869684b22230b8d5a`，设计 r1 保持。
**accept（实现接收）**：r4 唯一业务残项与两处计数勘误均闭合，无新增 counter。
此签不代表已集成、官方统计门禁通过或 done。接收时Kimi额度耗尽、终审pending；同日用户随后明确
“豁免他了”，已在任务卡登记仅本候选的终审缺签豁免，不伪记Kimi accept；统一质量门仍待完成。

本轮只审上述两点；N1/N2/N4 和 N3 已闭子项不重开。证据见[机账](battle-workflows-r5-evidence.json)。

## 1. 队友消费闭合

候选 `packages/reforge/src/battle/battle-session.selection-flows.test.ts:165-201`：

- 敌 health=5000，p1 经公开方向键/确认发起合击，p2 是非施法队友；没有私改状态或 mock core。
- `:194/:196/:198/:201` 分别钉一轮回 menu、合击恰一次、无 **p2** 普攻、敌真实行动，排除原一击致胜掩蔽。
- `:122-162` 原用例明确改名为成本正控，仍断言 victory 与 `[91,91]`，不再宣称证明队友消费。

复用冻结 [r4 见证](battle-workflows-r4-witnesses.mjs)，只在内存选择前4个消费门案例，不改历史工具：

| 实现 | 候选6文件 | 独立活敌 oracle |
|---|---|---|
| 正常 | 46/46 绿 | 1/1 绿，合击后无 p2 普攻 |
| 仅将 core:1888 消费门改为 false && 原条件 | 45绿/1红，**新增用例自身 AssertionError，:198** | 1红，多出 `p2 会心一击 攻击 survivor 造成 108` |

唯一替换点与加载路径见证通过，测试/产品前后 hash 不变。失败不是超时或环境错误。
原 oracle 先复跑同向；另一次仅将 oracle 敌身法改为候选默认10、tick改为候选500ms，对齐输入后仍同向。
正常与变异均真实回到 menu，合击伤害35、敌反击19一致，差异恰是 p2 多余普攻。

## 2. 两处计数勘误接受

- TypeScript AST 实数 mutants 工具中11个 `assert.equal(judge(...))` 自测，行号
  `228/229/239/249/254/274/301/303/330/331/336`；11条均调用实际 judge。回执/机账已纠正为11。
- 无尾斜杠命令实跑 **23文件/333项**；带尾斜杠实跑 **19文件/279项**。
  两者差4个 battle-trial 文件、54项，与回执解释相符。历史r4对应19/278、23/332；本轮各增加1项。
  不把不同子串选择范围混作同口径，也不将此前差异误判为环境失败。

## 独立复跑

- 定向6文件 **46/46**（14/6/6/8/6/6）；全Reforge **158文件/1460项**。
- `pnpm --filter @type-pal/reforge exec vitest run src/battle`：23/333。
- `pnpm --filter @type-pal/reforge exec vitest run src/battle/`：19/279。
- Reforge TC exit0；白名单Biome **12文件/0**；GLM原工具 **6正控+10针 detected，exit0**。
- r5相对r4的 packages 差异仅 selection-flows 测试；四生产目标相对57dda7ed零diff；旧测试、基线、
  统计配置、冻结历史见证未改。本人复用detached树，GLM工作树零修改。

复建消费门4个案例（仓库根运行，后两次替换只对齐 oracle 输入，不修改候选）：

```bash
node --input-type=module - /Users/zhangxu/illegal/type-pal-battle-review <<'JS'
import fs from 'node:fs'
import assert from 'node:assert/strict'
let source = fs.readFileSync('docs/testing/battle-workflows-r4-witnesses.mjs', 'utf8')
for (const [from, to] of [
  ['for (const item of cases) {', 'for (const item of cases.slice(0, 4)) {'],
  ['attackStrength:1,dexterity:1', 'attackStrength:1'],
  ['h.idle(100)', 'h.idle(500)'],
]) {
  assert.equal(source.split(from).length, 2)
  source = source.replace(from, to)
}
await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))
JS
```

日志 `/tmp/type-pal-battle-r5-*.log`；见证目录 `battle-workflows-r4-review-E1iWbK`（原oracle）与
`battle-workflows-r4-review-N4MQ2H`（输入对齐），完整路径/哈希/失败标题在机账。oracle不计候选46项。

## 阶段门与额度

Codex本席签accept，原counter关闭；GLM是测试贡献者，其自验不充当独立第三方。
本轮只落Reviewer席位/证据，不合候选、不代Coding Owner改Status；后续由Codex统一集成和阶段推进。
尚未运行整仓check/ratchet/受保护strict-fast，官方基线仍7826/633，不采GLM局部增量作全仓并集。

用户明确Kimi额度耗尽：登记 unavailable；接收后同日明确豁免本候选终审，未安排代班、未代签。
风险是缺少该席最终实现审查，用户已接受；补审不再作为本候选done必需条件，不外推其它卡。
旧兼容审查pass（产品未改），统一集成/质量门不因此豁免。
不标done，不改full/Q1/Q2边界。

无下一位Agent提示词，本轮不转Kimi；等待后续统一集成/门禁，再由Codex核定done。
