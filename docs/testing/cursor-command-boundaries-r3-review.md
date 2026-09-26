# Cursor 八组命令残项：独立接收

**当前结论**：返工 `a732f7d2` 的 R1–R3 已由 Codex 独立复核闭合；见
[接收与集成](cursor-command-boundaries-r3-integration.md)。以下原候选反证保留为历史，不再阻断新候选。

2026-09-26，候选 `b6bcc9b4`，基点 `7d64de13`。结论 **counter / 窄返工**，候选未合 main、未计官方覆盖。
[任务卡](../ops/archive/tasks/done/TEST-CURSOR-COMMAND-BOUNDARIES-3-editor-residuals.md) / [独立见证](cursor-command-boundaries-r3-review-witnesses.mjs)
（使用 [隔离配置](cursor-command-boundaries-r3-review.config.mjs)，只改内存加载，不写候选源码）。

## 已核与不重开

- diff 限七测试、一fixture、专属证据及本卡作者回执；未动产品/旧测试/基线。
- Codex 自跑七文件 **29/29**、editor typecheck exit0；五针 runner exit0，目标候选 AssertionError 检出。
  日志 `/tmp/codex-cursor-r3-{directed,tc,mutants}.log`；五针原始目录
  `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/cursor-command-boundaries-r3-mutants-EaMBvC`。
- C1/C4/C7 的已核拒绝/局部字段合同、C8 existing-proof 接受，不要求扩任务补完所有缺口。
  C4 删定义引用守卫的针仍被后层资产引用守卫拒绝，仅错误文案变化，属于重叠保护，不是错误放行。
- 未跑全仓/覆盖，避免对需要返工的候选消耗统一门。

## R1：成功输入必须真的合法（C2 / C5）

`entity-commands.residual.test.ts:19-22,81-84` 用 `crate` / `vase`，但 fixture 的
seed/loader 只登记 `hero`。第一次 apply 后接正式 `assertProjectSaveValid` 即拒绝
`精灵 "crate" 不在 sprites`；原四测试绿不证明成功输入合法。

`battle-sprite-commands.residual.test.ts:36-41,89-99` 的敌人已经绑定 player-fighter
`starter-fighter`，再尝试设置同一个非法 profile，不能作为合法敌人→单轴非法目标的证明。
正式保存门拒绝其初态的 battleSprite profile。请从真实有效 enemy profile/定义/字节建立初态，
先证保存门通过，再拒绝 player-fighter；保留同型成功/撤销对照或精确引用已存在的同型证明。
其它故意畸形输入可保留为明确的防御测试，但不混称合法完整工程。

## R2：完整保真与共享资源哨兵（C3 / C6）

`map-asset-commands.residual.test.ts:39-61` 只比宽高、layer id、collision 长度与部分目录字段。
独立单点反控在 `CreateMapAssetCommand` 复制实际 map 后仅把 `layers[0].name` 改为
`CORRUPTED-LAYER-NAME`；加载命中、源码 hash 不变，候选仍 **2/2 green**。请在构造前取完整
map/def 深快照，以同一输入作 apply/undo/redo 完整预期（包括 manifest/索引/旁对象保真），
不要只补这一个 name 字段。

`tileset-commands.residual.test.ts:81-129` 的 catalog 预期与输入共享引用；assetBlobs 来自 loader，
共享路径尚无 pending blob，比较“缺席与缺席”不能证明删除守卫保住实际字节。
请给共享路径放非空真实合法字节并深快照；apply/undo/redo 后与独立预期比，不与可能同时被污染的
`state.assetCatalog` / `state.assetBlobs` 自比较。正常共享定义不应被改成新资源归属。

## R3：回执准确收窄，不新增实现范围

八行表“无法公开到达”混入 `UpdateActor` 缺目标、缺scene/entity、未apply invert 等公开可调用路径。
改成“本批未覆盖 / 已有证明 / 真不可达”分列或改列名并逐条注明；无证明不得宣称不可达。
C4 负控记重叠保护；最终标题/计数与新鲜JSON对齐。无需重做 C8、无需补全所有防御分支。

## 独立见证复跑

```sh
node docs/testing/cursor-command-boundaries-r3-review-witnesses.mjs /Users/zhangxu/illegal/type-pal-cursor-command-boundaries-r3
```

本轮输出 `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-cursor-boundaries-r3-ptT6hD`：
三个未注入对照分别4/4、4/4、2/2绿；两项正式保存门检查各1项AssertionError红；map错误实现仍2/2绿。
见证允许返工后标题/结构变化，由 Codex 适配；不要求 Cursor 改本席工具或产品。

## 给 Cursor 的提示词

```text
继续 TEST-CURSOR-COMMAND-BOUNDARIES-3 窄返工。保留独立 worktree/分支，先同步 origin/main 的
docs/testing/cursor-command-boundaries-r3-review.md 和任务卡，不 checkout 主工作树。
只闭 R1–R3：C2 crate/vase 先合法登记并过真实保存门；C5 从有效 enemy profile/字节初态出发，
先证合法再单轴拒绝玩家profile。C6 对实际构造 map/def 作独立完整深快照，apply/undo/redo 比完整
内容/manifest/索引，必须抓住图层名污染。C3 给共享资源加入非空合法 pending 字节，独立快照核三态，
消除别名自比较。回执将公开可达但未测项与真不可达分开，C4针记重叠保护；已核项不扩改。
产品/旧测试/配置/基线零改，原白名单不变，不改 Codex 见证。整批复跑定向/相邻/editor/TC/Biome/docs
及代表反控，按最终JSON报数，提交推送真实SHA。不要跑全仓check/ratchet/strict，不合main、不标done。
```
