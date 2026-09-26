# 守卫叶补测 r2 独立复核

2026-09-26，Codex；候选 `99113d225fe2322395238a7b60fdb4a06e72d69c`，接收主线 `cc59a2fa`。
**counter，仅 C1/C2；不合候选、不改 GLM 测试语义、不跑全仓统计。**
[任务卡](../ops/tasks/TEST-GLM-CONTENT-GUARDS-2-leaf-boundaries.md) ·
[上一轮](guard-leaf-intake-review.md) · [本轮机账](guard-leaf-r2-evidence.json) ·
[可复建见证](guard-leaf-review-witnesses.mjs)。以下行号均指候选。

## 已闭合，不重开

- R1 原三反例分别恰红对应新断言：record 原对象 ms 改写、cue 回调后改写、错误路径前缀污染；
  都是候选自身 AssertionError，90/91 通过。完整 message 与 G5 原 Error 身份成立。
- R2 wait 缺 ms 的同 kind 正控、playSound 正控、真删 cue.rows、中间 hook wait(0)→ms=-1 已落实。
- R3 抽取实际 `judge` 函数复验：合法红接受；旧五类误收、exit2/null 全部拒绝。
  GLM 原 1 对照+6 针独立实跑通过，逐针唯一目标、实际 load 见证与源 hash 保持。
- R4 JSON 格式门与共享 percent 轴分类已闭合；不过“所有实际输入/每行同型单轴”的回执声明仍受 C1/C2 阻断。
- 白名单无越界：三新测试、fixture、专属证据和作者块；产品/旧测试/scripts/配置/基线零改。
  全 content 79 文件 **957/957**、TC、候选改动范围 Biome（7 个受检源码/JSON 文件，0 error/4 既有模板针 warning）、docs/diff 全过。
  不把 91 个用例数等同新增分支；没有实际产品缺陷证据，以下均为隔离变异。

## C1 — 新 helper 的七处调用仍在比较另一份对象

`expectAcceptsUnchanged` 本身正确；问题在调用方。第一参数闭包另造对象，第二参数是又一份对象：

- `enemy-validation-shapes.leaf.test.ts:36/48/53`：内联对象分别新建。
- `battle-choreography.leaf.test.ts:301/314/348`：两次 `fullInput()`；`:356–359`：两次 `[waitAction(0)]`。

应使用 `(input) => production(input)`，或一次创建具名 input 且生产调用和 helper 都引用它。
不是禁止零参数闭包：其它行闭包引用与第二参数相同的具名对象，是正确用法。

另外 G1 `:43–44` 合法 exactKeys 仅 not.toThrow；`:50/:54` 坏 exactKeys 的内联对象、record 数组坏输入，
以及 G6 `:316–317` 的 `['x']/[null]` 尚无实际输入快照。统一补本批已承诺的可变输入保真即可，原始值无需空快照。

直接反证（每次完整 91 项、生产 load 唯一命中、源文件未改）：

| 隔离生产变异 | 违反的已有合同 | 候选结果 |
|---|---|---|
| exactKeys 正常检查后对 `path=v` 的实际对象改 kind | 守卫不可改写调用者数据 | 91/91 绿，MISSED |
| checkBattleChoreographyBody 完成验证后对 `path=body` 的实际数组 splice 掉一项 | body 输入保真 | 91/91 绿，MISSED |

G6 总体正控 `:295–298` 已有正确快照，不能替代 body 直入口比较错对象的断言。
不要求扩大矩阵或另加测试数量；修现有断言，并让以上反例由实际输入比较报 AssertionError。

## C2 — “合法 turn 仅改 op”仍未执行对应合法输入

- `enemy-ai-condition-guard.leaf.test.ts:186–196`：正控是 `not(aloneAlive)`，坏输入是 `not(turn(op='<',value=1))`。
  不是回执所称的合法 turn 仅改 op。
- `battle-choreography.leaf.test.ts:279–348`：`fullInput()` 的 when 是 chance；参数表 turn(op='<',value=1)
  行仍用该三 hook 输入作正控，没有执行同容器的合法 turn。

本席把所有 `.cond` / `.when` 下的 turn 一律抛同一 op 错误（合法 turn 也错拒），候选仍 **91/91 绿**。
这不是要求验证任意新政策，而是证明所称的“同型合法对照”确实缺席。
两处从具名合法 turn（如 op='>='、value=1）过真实相同入口，再复制并只改 op；
G6 参数表用各行明确的同形状 good/bad，不再用通用三 hook 对照代替单 hook 单轴。
顺带落实原 R2 中 G3 未知 kind 行的同入口合法正控（`:199` 仍缺），不扩新合同。
回执、标题和机账同步实际构造；已经修好的 wait/rows/playSound 等不再返工。

## 命令与停止线

```sh
env -u NODE_COMPILE_CACHE node docs/testing/guard-leaf-review-witnesses.mjs /Users/zhangxu/illegal/type-pal-glm-content-guards-wave2
# 正对照91绿；旧三针 detected；新增三针 MISSED（故工具 exit0 不等于候选通过）
# 在候选工作树：
env -u NODE_COMPILE_CACHE node docs/testing/glm-content-guards-wave2/guard-leaf-mutants.mjs
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/content check
node scripts/docs/check.mjs
git diff --check
```

日志 `/tmp/codex-guard-leaf-r2-{review-final,mutants,content,biome}.log`；原始 JSON 目录在机账。
本席工具新增支持抽取 r2 judge，保留 r1 复建；只在临时 loader 注入，不写候选或产品源码。
主线官方基线保持 **8248/701**、hash `25a9abb83e912d86a2272887ee84e9bbb6b39de89f9708e05d149f9eea579917`。
视觉 N/A；不占另一 Codex 的 A3 架构工作树；通过后再统一 check→ratchet→单次 strict-fast。
